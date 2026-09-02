'use strict';

(function exposePromptDisplay(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFirePromptDisplay = api;
})(typeof window !== 'undefined' ? window : globalThis, function createPromptDisplayApi() {
  const PROMPT_DISPLAY_MODES = Object.freeze(['inline', 'docked', 'hidden']);
  const DEFAULT_PROMPT_DISPLAY_MODE = 'inline';
  const LOW_HEALTH_THRESHOLD = 0.25;

  function normalizePromptDisplayMode(value, fallback = DEFAULT_PROMPT_DISPLAY_MODE) {
    const normalized = String(value || '').trim().toLowerCase();
    if (PROMPT_DISPLAY_MODES.includes(normalized)) return normalized;
    return PROMPT_DISPLAY_MODES.includes(fallback) ? fallback : DEFAULT_PROMPT_DISPLAY_MODE;
  }

  function sessionHasCharacter(record) {
    return Boolean(String(
      record?.gmcp?.char?.status?.name || record?.characterName || ''
    ).trim());
  }

  function stripPromptControls(value) {
    return String(value || '')
      .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/gu, '')
      .replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, '')
      .replaceAll('\r', '');
  }

  function looksLikeNukeFirePlayingPrompt(textValue) {
    const plain = stripPromptControls(textValue).trimEnd();
    return plain.endsWith('>');
  }

  function shouldCapturePrompt(modeValue, record, textValue) {
    const mode = normalizePromptDisplayMode(modeValue);
    const text = String(textValue || '');
    if (mode === 'inline' || text.length === 0 || text.includes('\n')) return false;

    // GMCP character identity is the strongest playing-state signal, but do not
    // make Docked/Hidden mode depend on it. NukeFire's gameplay prompt is
    // authoritatively terminated by GA/EOR and make_prompt() always ends the
    // final unfinished line with '>'. Login, password, pager, and editor prompts
    // use different endings and therefore remain inline.
    return sessionHasCharacter(record) || looksLikeNukeFirePlayingPrompt(text);
  }

  function makePromptSnapshot(runsValue, rawText, boundary = {}) {
    const runs = Array.isArray(runsValue)
      ? runsValue.map((run) => ({
          text: String(run?.text || ''),
          style: run?.style ? { ...run.style } : null,
          link: String(run?.link || '') || null
        })).filter((run) => run.text)
      : [];
    return {
      rawText: String(rawText || ''),
      plainText: runs.map((run) => run.text).join('').replaceAll('\r', '').trimEnd(),
      runs,
      boundaryType: boundary?.type === 'eor' ? 'eor' : 'ga',
      updatedAt: Date.now()
    };
  }

  function emptyPromptSnapshot() {
    return { rawText: '', plainText: '', runs: [], boundaryType: 'ga', updatedAt: 0 };
  }

  function stagePromptAwareTerminalRuns(runsValue, deferredLineBreakValue, options = {}) {
    const runs = Array.isArray(runsValue)
      ? runsValue.map((run) => ({
          ...run,
          text: String(run?.text || ''),
          style: run?.style ? { ...run.style } : null,
          link: String(run?.link || '') || null
        })).filter((run) => run.text)
      : [];
    const deferred = deferredLineBreakValue?.text
      ? {
          ...deferredLineBreakValue,
          text: String(deferredLineBreakValue.text),
          style: deferredLineBreakValue.style ? { ...deferredLineBreakValue.style } : null,
          link: String(deferredLineBreakValue.link || '') || null
        }
      : null;

    if (deferred) runs.unshift(deferred);
    if (!options.deferTrailingLineBreak) {
      return { runs, deferredLineBreak: null };
    }

    for (let index = runs.length - 1; index >= 0; index -= 1) {
      const run = runs[index];
      if (!run.text) continue;
      const match = run.text.match(/(\r\n|\n|\r)$/u);
      if (!match) break;
      const lineBreak = match[1];
      const remaining = run.text.slice(0, -lineBreak.length);
      const deferredLineBreak = { ...run, text: lineBreak };
      if (remaining) run.text = remaining;
      else runs.splice(index, 1);
      return { runs, deferredLineBreak };
    }

    return { runs, deferredLineBreak: null };
  }

  function finiteVital(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.trunc(numeric)) : null;
  }

  function sessionIsConnected(record) {
    const state = String(record?.status?.state || '').trim().toLowerCase();
    if (state) return state === 'connected';
    return record?.connected === true;
  }

  function normalizedServerHost(value) {
    return String(value || '').trim().toLowerCase();
  }

  function companionPromptEntries(activeRecord, recordsValue = {}, orderValue = []) {
    if (!activeRecord) return [];
    const records = recordsValue && typeof recordsValue === 'object'
      ? recordsValue
      : {};
    const order = Array.isArray(orderValue) && orderValue.length > 0
      ? orderValue.map((id) => String(id || ''))
      : Object.keys(records);
    const activeHost = normalizedServerHost(activeRecord.host);
    const activePort = Number(activeRecord.port);

    return order.flatMap((id) => {
      const record = records[id];
      if (!record || record.id === activeRecord.id || !sessionIsConnected(record)) return [];
      if (normalizedServerHost(record.host) !== activeHost || Number(record.port) !== activePort) return [];

      const name = String(record.name || '').trim();
      const hp = finiteVital(record.vitals?.hp);
      const mana = finiteVital(record.vitals?.mana);
      const move = finiteVital(record.vitals?.move);
      if (!name || hp === null || mana === null || move === null) return [];

      const maxHp = finiteVital(record.vitals?.maxHp);
      const lowHealth = maxHp !== null && maxHp > 0 && hp / maxHp < LOW_HEALTH_THRESHOLD;
      return [{
        id: String(record.id || id),
        name,
        hp,
        mana,
        move,
        lowHealth,
        plainText: `< ${hp}H ${mana}M ${move}V ${name} >`,
        accessibleText: `Companion session ${name}${lowHealth ? ', low health' : ''}: ${hp} health, ${mana} mana, ${move} movement.`
      }];
    });
  }

  return {
    PROMPT_DISPLAY_MODES,
    DEFAULT_PROMPT_DISPLAY_MODE,
    LOW_HEALTH_THRESHOLD,
    normalizePromptDisplayMode,
    sessionHasCharacter,
    stripPromptControls,
    looksLikeNukeFirePlayingPrompt,
    shouldCapturePrompt,
    makePromptSnapshot,
    emptyPromptSnapshot,
    stagePromptAwareTerminalRuns,
    companionPromptEntries
  };
});
