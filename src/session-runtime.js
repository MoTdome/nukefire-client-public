(function attachSessionRuntime(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireSessions = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createSessionRuntimeApi() {
  'use strict';

  const DEFAULT_MAX_CHARACTERS = 2_000_000;
  const DEFAULT_MAX_OUTPUT_RUNS = 20_000;
  const MAX_OUTPUT_RUN_CHARACTERS = 32_768;
  const HISTORY_LOW_WATER_RATIO = 0.875;
  const OUTPUT_STYLE_KEYS = Object.freeze([
    'fg', 'bg', 'fgBasicIndex', 'bgBasicIndex',
    'bold', 'dim', 'italic', 'underline', 'inverse'
  ]);

  function emptyUnread(channelIds = []) {
    return Object.fromEntries(channelIds.filter((id) => id !== 'all').map((id) => [id, 0]));
  }

  function createSessionRuntime(meta = {}, options = {}) {
    const ansiApi = options.ansiApi;
    const communicationsApi = options.communicationsApi || {};
    const highlightApi = options.highlightApi || {};
    const contextApi = options.contextApi || {};
    const affectsApi = options.affectsApi || {};
    const mobInspectorApi = options.mobInspectorApi || {};
    const readerReviewApi = options.readerReviewApi || {};
    const readerHistoryApi = options.readerHistoryApi || {};
    const readerSafetyApi = options.readerSafetyApi || {};
    const channelIds = options.channelIds || [];
    const makeLineBuffer = typeof communicationsApi.CommunicationLineBuffer === 'function'
      ? () => new communicationsApi.CommunicationLineBuffer()
      : () => ({ push: () => [], flush: () => [], reset: () => {} });
    const makeReaderReview = typeof readerReviewApi.ReaderReviewBuffer === 'function'
      ? () => new readerReviewApi.ReaderReviewBuffer({
          maxCharacters: Number(options.maxCharacters) || DEFAULT_MAX_CHARACTERS
        })
      : () => null;
    const makeReaderHistory = typeof readerHistoryApi.ReaderHistory === 'function'
      ? () => new readerHistoryApi.ReaderHistory()
      : () => null;
    const makeReaderSafety = typeof readerSafetyApi.ReaderSafetyLane === 'function'
      ? () => new readerSafetyApi.ReaderSafetyLane()
      : () => null;

    return {
      id: String(meta.id || ''),
      name: String(meta.name || meta.id || 'Session'),
      role: String(meta.role || 'member'),
      characterName: String(meta.characterName || ''),
      host: String(meta.host || 'tdome.nukefire.org'),
      port: Number(meta.port) || 4000,
      status: meta.status && typeof meta.status === 'object'
        ? { ...meta.status }
        : { state: 'disconnected', message: 'Disconnected' },
      connected: Boolean(meta.connected || meta.status?.state === 'connected'),
      remoteEcho: false,
      history: [],
      historyIndex: null,
      historyPrefix: '',
      draft: '',
      commandDraft: '',
      lines: 0,
      plainText: '',
      readerCarry: '',
      lastCompleteLine: '',
      readerReview: makeReaderReview(),
      readerHistory: makeReaderHistory(),
      readerSafety: makeReaderSafety(),
      findIndex: -1,
      promptBoundaryCount: 0,
      promptBoundaryType: 'ga',
      dockedPrompt: { rawText: '', plainText: '', runs: [], boundaryType: 'ga', updatedAt: 0 },
      outputRuns: [],
      outputCharacters: 0,
      maxOutputRuns: Number(options.maxOutputRuns) || DEFAULT_MAX_OUTPUT_RUNS,
      ansi: typeof ansiApi?.AnsiParser === 'function' ? new ansiApi.AnsiParser() : null,
      highlightLines: typeof highlightApi?.HighlightLineBuffer === 'function'
        ? new highlightApi.HighlightLineBuffer()
        : { push: (value) => [String(value || '')], flush: () => '', reset: () => {} },
      gmcp: null,
      protocol: {
        gmcpMessages: 0,
        terminalType: '',
        charset: '',
        windowSize: null,
        newEnvironment: null
      },
      pipelineDebug: {
        enabled: meta.pipelineDebug?.enabled === true,
        maxEntries: Number(meta.pipelineDebug?.maxEntries) || 200,
        entries: []
      },
      communications: {
        messages: [],
        unread: emptyUnread(channelIds),
        nextId: 1,
        lineBuffer: makeLineBuffer()
      },
      mapper: {
        pendingMove: null,
        pendingMoves: [],
        movementRoomsSincePrompt: 0,
        lastRoomId: '',
        liveSnapshot: null,
        liveSignature: '',
        gpsCatalogAnnouncementVersion: 0,
        renderDirty: false
      },
      affects: {
        snapshot: typeof affectsApi.normalizeAffectsState === 'function'
          ? affectsApi.normalizeAffectsState({})
          : { schema: 1, revision: 0, serverTime: 0, effects: [] },
        receivedAtMs: 0,
        signature: '',
        renderSignature: '',
        renderDirty: false,
        timer: null,
        lastAnnouncedRevision: 0
      },
      lootHistory: { events: [], filter: 'all', nextId: 1 },
      mobInspector: {
        snapshot: typeof mobInspectorApi.normalizeMobInfo === 'function'
          ? mobInspectorApi.normalizeMobInfo({})
          : { schema: 1, trigger: 'request', mob: { vnum: 0, name: 'Unknown creature', flags: {} }, affects: { effects: [] } },
        receivedAtMs: 0,
        signature: '',
        renderDirty: false,
        summaryIdentityText: '',
        summaryConsiderText: '',
        effectGroupCount: 0
      },
      contextDeck: {
        snapshot: typeof contextApi.normalizeContextState === 'function'
          ? contextApi.normalizeContextState({})
          : { schema: 1, room: 0, zone: 0, contexts: [] },
        lastPrimaryId: '',
        signature: '',
        renderDirty: false,
        refreshTimer: null
      },
      vitals: {
        hp: null, maxHp: null,
        mana: null, maxMana: null,
        move: null, maxMove: null
      },
      unreadOutput: 0,
      maxCharacters: Number(options.maxCharacters) || DEFAULT_MAX_CHARACTERS
    };
  }

  function updateSessionMeta(runtime, meta = {}) {
    if (!runtime) return runtime;
    if (meta.name) runtime.name = String(meta.name);
    if (meta.role) runtime.role = String(meta.role);
    if (meta.characterName !== undefined) runtime.characterName = String(meta.characterName || '');
    if (meta.host) runtime.host = String(meta.host);
    if (Number(meta.port)) runtime.port = Number(meta.port);
    if (meta.status && typeof meta.status === 'object') runtime.status = { ...meta.status };
    if (meta.connected !== undefined) runtime.connected = Boolean(meta.connected);
    else runtime.connected = runtime.status?.state === 'connected';
    if (meta.pipelineDebug && typeof meta.pipelineDebug === 'object') {
      runtime.pipelineDebug.enabled = meta.pipelineDebug.enabled === true;
      runtime.pipelineDebug.maxEntries = Number(meta.pipelineDebug.maxEntries) || runtime.pipelineDebug.maxEntries || 200;
    }
    return runtime;
  }

  function trimRuns(runtime) {
    const limit = Math.max(1, Number(runtime.maxCharacters) || DEFAULT_MAX_CHARACTERS);
    const runLimit = Math.max(1000, Number(runtime.maxOutputRuns) || DEFAULT_MAX_OUTPUT_RUNS);
    if (runtime.outputCharacters <= limit && runtime.plainText.length <= limit && runtime.outputRuns.length <= runLimit) return;

    /* Once a long session reaches its cap, trimming only the newest overflow
     * copies a multi-megabyte string and shifts old runs on virtually every
     * packet. Reclaim a useful oldest block so the cost is amortized while the
     * established hard maximum remains unchanged. */
    const retain = limit >= 100_000
      ? Math.max(1, Math.floor(limit * HISTORY_LOW_WATER_RATIO))
      : limit;
    let overflow = Math.max(0, runtime.outputCharacters - retain);
    let removeCount = 0;

    while (overflow > 0 && removeCount < runtime.outputRuns.length) {
      const run = runtime.outputRuns[removeCount];
      if (run.text.length <= overflow) {
        runtime.outputCharacters -= run.text.length;
        overflow -= run.text.length;
        removeCount += 1;
        continue;
      }

      run.text = run.text.slice(overflow);
      runtime.outputCharacters -= overflow;
      overflow = 0;
    }

    if (removeCount > 0) runtime.outputRuns.splice(0, removeCount);
    if (runtime.outputRuns.length > runLimit) {
      const retainRuns = Math.max(1, Math.floor(runLimit * HISTORY_LOW_WATER_RATIO));
      const extraRuns = runtime.outputRuns.length - retainRuns;
      let removedCharacters = 0;
      for (let index = 0; index < extraRuns; index += 1) {
        removedCharacters += runtime.outputRuns[index].text.length;
      }
      runtime.outputRuns.splice(0, extraRuns);
      runtime.outputCharacters = Math.max(0, runtime.outputCharacters - removedCharacters);
    }
    if (runtime.plainText.length > runtime.outputCharacters) {
      runtime.plainText = runtime.outputCharacters > 0
        ? runtime.plainText.slice(-runtime.outputCharacters)
        : '';
    } else if (runtime.plainText.length > limit) {
      runtime.plainText = runtime.plainText.slice(-retain);
    }
  }

  function outputRunKey(run = {}) {
    const kind = run.kind || 'mud';
    if (kind === 'error' || kind === 'system') return kind;
    const style = run.style || {};
    const link = String(run.link || '');
    return `${kind}|link:${link}|${OUTPUT_STYLE_KEYS.map((key) => `${key}:${String(style[key] ?? '')}`).join('|')}`;
  }

  function appendRuns(runtime, runs) {
    for (const candidate of runs) {
      const kind = candidate?.kind || 'mud';
      const style = candidate?.style ? { ...candidate.style } : null;
      const link = String(candidate?.link || '') || null;
      const key = outputRunKey({ kind, style, link });
      let text = String(candidate?.text || '');
      if (!text) continue;

      while (text) {
        const previous = runtime.outputRuns.at(-1);
        if (previous?.key === key && previous.text.length < MAX_OUTPUT_RUN_CHARACTERS) {
          const available = MAX_OUTPUT_RUN_CHARACTERS - previous.text.length;
          const addition = text.slice(0, available);
          previous.text += addition;
          runtime.outputCharacters += addition.length;
          text = text.slice(addition.length);
          continue;
        }

        const piece = text.slice(0, MAX_OUTPUT_RUN_CHARACTERS);
        runtime.outputRuns.push({ text: piece, style, kind, link, key });
        runtime.outputCharacters += piece.length;
        text = text.slice(piece.length);
      }
    }
    trimRuns(runtime);
  }

  /* Retained as a compatibility utility for source-architecture checks and
   * callers that may need a standalone count. Live appendText folds this scan
   * into updateReader() so incoming output is not traversed twice. */
  function countNewlines(text) {
    let count = 0;
    for (let index = 0; index < text.length; index += 1) {
      if (text.charCodeAt(index) === 10) count += 1;
    }
    return count;
  }

  function updateReader(runtime, text) {
    const input = String(text || '');
    const normalized = input.includes('\r') ? input.replaceAll('\r', '') : input;
    const source = runtime.readerCarry ? `${runtime.readerCarry}${normalized}` : normalized;
    let lineCount = 0;
    let start = 0;
    let newline = source.indexOf('\n', start);
    while (newline !== -1) {
      lineCount += 1;
      const readable = source.slice(start, newline).trimEnd();
      if (readable.trim()) {
        runtime.lastCompleteLine = readable;
        runtime.readerReview?.appendLine?.(readable);
        runtime.readerHistory?.append?.('main', readable, { source: 'terminal', markRead: true });
      }
      start = newline + 1;
      newline = source.indexOf('\n', start);
    }
    runtime.readerCarry = source.slice(start);
    return lineCount;
  }

  function appendText(runtime, text, options = {}) {
    const raw = String(text || '');
    const parsed = typeof runtime.ansi?.parseDetailed === 'function'
      ? runtime.ansi.parseDetailed(raw)
      : null;
    const parsedRuns = parsed?.runs || runtime.ansi?.parse(raw) || [{ text: raw, style: null }];
    const runs = typeof options.transformRuns === 'function'
      ? options.transformRuns(parsedRuns)
      : parsedRuns;
    appendRuns(runtime, runs);
    const stripAnsi = options.stripAnsi || ((value) => String(value || ''));
    // parseDetailed() already derives the ANSI-free source text while it builds
    // styled runs.  Keep that result as the shared source representation so
    // callers do not need to scan the same incoming chunk again with stripAnsi.
    const sourcePlainText = parsed
      ? String(parsed.plainText || '')
      : (Object.prototype.hasOwnProperty.call(options, 'plainText')
          ? String(options.plainText || '')
          : stripAnsi(raw));
    const plain = options.useTransformedPlainText === true
      ? (runs === parsedRuns
          ? sourcePlainText
          : runs.map((run) => String(run?.text || '')).join(''))
      : sourcePlainText;
    runtime.plainText += plain;
    runtime.lines += updateReader(runtime, plain);
    trimRuns(runtime);
    if (options.returnDetails === true) return { runs, plainText: plain, sourcePlainText };
    return runs;
  }

  function appendSystem(runtime, message, kind = 'info') {
    const text = `\n[${String(message || '')}]\n`;
    const run = { text, style: null, kind: kind === 'error' ? 'error' : (kind === 'help' ? 'help' : 'system') };
    appendRuns(runtime, [run]);
    runtime.plainText += text;
    runtime.lines += 2;
    updateReader(runtime, text);
    trimRuns(runtime);
    return run;
  }

  function terminateCurrentLine(runtime) {
    if (!runtime.plainText || runtime.plainText.endsWith('\n')) return false;
    appendRuns(runtime, [{ text: '\n', style: null, kind: 'mud' }]);
    runtime.plainText += '\n';
    runtime.lines += 1;
    updateReader(runtime, '\n');
    return true;
  }

  function commitBoundary(runtime, options = {}) {
    const readable = runtime.readerCarry.trimEnd();
    if (readable.trim()) {
      runtime.lastCompleteLine = readable;
      runtime.readerReview?.appendLine?.(readable, {
        rapidRecall: options.rapidRecall !== false
      });
    }
    runtime.readerCarry = '';
  }

  function clearOutput(runtime) {
    runtime.outputRuns = [];
    runtime.outputCharacters = 0;
    runtime.lines = 0;
    runtime.plainText = '';
    runtime.readerCarry = '';
    runtime.lastCompleteLine = '';
    runtime.readerReview?.clear?.();
    runtime.readerHistory?.clear?.('main');
    runtime.dockedPrompt = { rawText: '', plainText: '', runs: [], boundaryType: 'ga', updatedAt: 0 };
    runtime.findIndex = -1;
    runtime.ansi?.reset?.();
    runtime.highlightLines?.reset?.();
  }

  function numeric(text) {
    return Number(String(text || '').replaceAll(',', ''));
  }

  function parseVitals(runtime, raw, stripAnsi, plainText) {
    const text = plainText !== undefined
      ? String(plainText || '')
      : (stripAnsi || ((value) => String(value || '')))(raw);
    const hpMatch = text.match(/(?:HP|H)\s*[:=]\s*([\d,]+)\s*\/\s*([\d,]+)/iu);
    if (hpMatch) {
      runtime.vitals.hp = numeric(hpMatch[1]);
      runtime.vitals.maxHp = numeric(hpMatch[2]);
    }
    const manaMatch = text.match(/(?:MANA|MP|M)\s*[:=]\s*([\d,]+)\s*\/\s*([\d,]+)/iu);
    if (manaMatch) {
      runtime.vitals.mana = numeric(manaMatch[1]);
      runtime.vitals.maxMana = numeric(manaMatch[2]);
    }
    const moveMatch = text.match(/(?:MOVE|MOVES|MV|V)\s*[:=]\s*([\d,]+)\s*\/\s*([\d,]+)/iu);
    if (moveMatch) {
      runtime.vitals.move = numeric(moveMatch[1]);
      runtime.vitals.maxMove = numeric(moveMatch[2]);
    }
    const compact = text.match(/<\s*([\d,]+)\s*[hH]\s+([\d,]+)\s*[mM]\s+([\d,]+)\s*[vV](?:\s+[^>\r\n]*)?\s*>/u);
    if (compact) {
      runtime.vitals.hp = numeric(compact[1]);
      runtime.vitals.mana = numeric(compact[2]);
      runtime.vitals.move = numeric(compact[3]);
    }
    return runtime.vitals;
  }

  return {
    DEFAULT_MAX_CHARACTERS,
    DEFAULT_MAX_OUTPUT_RUNS,
    MAX_OUTPUT_RUN_CHARACTERS,
    outputRunKey,
    createSessionRuntime,
    updateSessionMeta,
    appendText,
    appendSystem,
    appendRuns,
    terminateCurrentLine,
    commitBoundary,
    clearOutput,
    parseVitals,
    trimRuns
  };
});
