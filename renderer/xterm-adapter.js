(function attachXtermAdapter(root, factory) {
  const osc8Api = typeof module === 'object' && module.exports
    ? require('../src/osc8-links')
    : (root?.NukeFireOsc8 || {});
  const exported = factory(osc8Api);
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireXterm = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createXtermAdapterApi(osc8Api) {
  'use strict';

  osc8Api = osc8Api || {};

  const DEFAULT_SCROLLBACK_LINES = 100_000;
  const DEFAULT_FONT_FAMILY = 'Menlo, Monaco, "Courier New", monospace';
  const NORMAL_LINE_HEIGHT = 1.25;
  const COMPACT_LINE_HEIGHT = 1.12;
  const NUKEFIRE_UNICODE_VERSION = '11+nukefire-emoji';
  const EMOJI_SCAN_START = 0x1F000;
  const EMOJI_SCAN_END = 0x1FAFF;
  const REGIONAL_INDICATOR_START = 0x1F1E6;
  const REGIONAL_INDICATOR_END = 0x1F1FF;
  const WIDTH_BITS_MASK = 0x6;
  const WIDTH_TWO_BITS = 0x4;
  // High-volume combat is already cheap to parse, but handing ~20-30K visible
  // characters to xterm in one shot can make scrolling look like a burst. Keep
  // the first presentation immediate, then spread only the remainder across
  // animation opportunities. Backlog and very large handoffs automatically use
  // larger chunks so smoothing can never become an unbounded throttle.
  const PRESENTATION_PACING_MIN_CHARACTERS = 16_384;
  const PRESENTATION_CHUNK_CHARACTERS = 10_240;
  const PRESENTATION_MAX_CHUNKS = 6;
  const PRESENTATION_CATCHUP_PENDING_CHARACTERS = 65_536;
  const PRESENTATION_CATCHUP_CHUNK_CHARACTERS = 20_480;

  let emojiPresentationPattern = null;
  try {
    emojiPresentationPattern = new RegExp('\\p{Emoji_Presentation}', 'u');
  } catch {
    emojiPresentationPattern = null;
  }

  function isDefaultEmojiPresentation(codepoint) {
    const value = Number(codepoint);
    if (!Number.isInteger(value) || value < EMOJI_SCAN_START || value > EMOJI_SCAN_END) return false;
    // Regional indicators are clustered into flags by grapheme-aware terminals;
    // widening each scalar independently would make a flag four cells wide.
    if (value >= REGIONAL_INDICATOR_START && value <= REGIONAL_INDICATOR_END) return false;
    if (emojiPresentationPattern) return emojiPresentationPattern.test(String.fromCodePoint(value));
    // Conservative fallback for engines without Unicode property escapes. This
    // block contains the newer Symbols and Pictographs Extended-A emoji where
    // Unicode 11 has the important coverage gaps (for example U+1FAA8 ROCK).
    return value >= 0x1FA70;
  }

  function createNukeFireUnicodeProvider(baseProvider) {
    if (!baseProvider || typeof baseProvider.wcwidth !== 'function' || typeof baseProvider.charProperties !== 'function') return null;
    const widened = new Set();
    for (let codepoint = EMOJI_SCAN_START; codepoint <= EMOJI_SCAN_END; codepoint += 1) {
      if (baseProvider.wcwidth(codepoint) === 1 && isDefaultEmojiPresentation(codepoint)) widened.add(codepoint);
    }
    return {
      version: NUKEFIRE_UNICODE_VERSION,
      wcwidth(codepoint) {
        return widened.has(codepoint) ? 2 : baseProvider.wcwidth(codepoint);
      },
      charProperties(codepoint, preceding) {
        const properties = baseProvider.charProperties(codepoint, preceding);
        if (!widened.has(codepoint)) return properties;
        return (properties & ~WIDTH_BITS_MASK) | WIDTH_TWO_BITS;
      }
    };
  }

  function captureUnicodeProvider(AddonCtor) {
    if (typeof AddonCtor !== 'function') return null;
    let provider = null;
    const probe = new AddonCtor();
    if (typeof probe.activate !== 'function') return null;
    probe.activate({
      unicode: {
        register(value) { provider = value || null; }
      }
    });
    try { probe.dispose?.(); } catch {}
    return provider;
  }

  function normalizeFontProfile(value) {
    return String(value || '').trim().toLowerCase() === 'fixedsys' ? 'fixedsys' : 'standard';
  }

  function terminalTypography(profileValue, compact = false) {
    const profile = normalizeFontProfile(profileValue);
    const fixedsys = profile === 'fixedsys';
    return {
      profile,
      customGlyphs: !fixedsys,
      drawBoldTextInBrightColors: false,
      fontWeight: '400',
      fontWeightBold: fixedsys ? '400' : '700',
      letterSpacing: 0,
      lineHeight: compact ? COMPACT_LINE_HEIGHT : NORMAL_LINE_HEIGHT,
      rescaleOverlappingGlyphs: fixedsys
    };
  }
  const DEFAULT_THEME = Object.freeze({
    foreground: '#d3d7dc',
    background: '#050607',
    cursor: '#d3d7dc',
    cursorAccent: '#050607',
    selectionBackground: '#36546f99',
    black: '#000000',
    red: '#aa0000',
    green: '#00aa00',
    yellow: '#d6b94c',
    blue: '#0000aa',
    magenta: '#aa00aa',
    cyan: '#00aaaa',
    white: '#aaaaaa',
    brightBlack: '#555555',
    brightRed: '#ff5555',
    brightGreen: '#55ff55',
    brightYellow: '#ffff66',
    brightBlue: '#5555ff',
    brightMagenta: '#ff55ff',
    brightCyan: '#55ffff',
    brightWhite: '#ffffff'
  });

  function clamp(value, minimum, maximum, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(minimum, Math.min(maximum, number));
  }


  function sanitizeAnsiForXterm(value, options = {}) {
    const monochrome = Boolean(options.monochrome);
    const source = typeof osc8Api.sanitizeOsc8Sequences === 'function'
      ? osc8Api.sanitizeOsc8Sequences(value)
      : String(value ?? '').replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/gu, '');
    return source
      // Normalize 8-bit CSI, preserving only SGR color/style sequences.
      .replace(/\u009b([0-?]*[ -/]*)([@-~])/gu, (_match, parameters, finalByte) =>
        !monochrome && finalByte === 'm' ? `\x1b[${parameters}${finalByte}` : ''
      )
      // xterm is the visual engine, not a remote shell. Keep SGR and sanitized
      // OSC 8 hyperlinks; remove cursor movement, erasing, device reports, and
      // every other remote terminal control.
      .replace(/\x1b\[([0-?]*[ -/]*)([@-~])/gu, (sequence, _parameters, finalByte) =>
        !monochrome && finalByte === 'm' ? sequence : ''
      )
      .replace(/\x1b(?![\[\]\\])/gu, '')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001a\u001c-\u001f\u007f]/gu, '');
  }

  function colorTriplet(value) {
    const text = String(value || '').trim();
    if (text.length === 7 && text.charCodeAt(0) === 35) {
      const packed = Number(`0x${text.slice(1)}`);
      if (Number.isInteger(packed)) {
        return [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255];
      }
    }
    if (text.length >= 10 && (text.charCodeAt(0) === 114 || text.charCodeAt(0) === 82)) {
      const rgb = text.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/iu);
      if (rgb) return [clamp(rgb[1], 0, 255, 0), clamp(rgb[2], 0, 255, 0), clamp(rgb[3], 0, 255, 0)];
    }
    return null;
  }

  function cachedColorTriplet(value, cache = null) {
    if (!cache) return colorTriplet(value);
    const key = String(value || '');
    if (cache.has(key)) return cache.get(key);
    const resolved = colorTriplet(value);
    cache.set(key, resolved);
    return resolved;
  }

  function basicForeground(index) {
    const value = Number(index);
    if (!Number.isInteger(value) || value < 0 || value > 15) return null;
    return value < 8 ? 30 + value : 90 + value - 8;
  }

  function basicBackground(index) {
    const value = Number(index);
    if (!Number.isInteger(value) || value < 0 || value > 15) return null;
    return value < 8 ? 40 + value : 100 + value - 8;
  }

  function styleCodes(run = {}, monochrome = false, defaultForeground = DEFAULT_THEME.foreground, colorCache = null) {
    const style = run.style || {};
    const codes = [];

    if (!monochrome) {
      if (run.kind === 'error') return [91, 3];
      if (run.kind === 'help') return [96, 1];
      if (run.kind === 'system') return [90, 3];
      if (style.bold) codes.push(1);
      if (style.dim) codes.push(2);
      if (style.italic) codes.push(3);
      if (style.underline) codes.push(4);
      if (style.inverse) codes.push(7);
    }

    // Never rely on xterm's implicit default foreground. Some renderer/theme
    // combinations can resolve it to black even when the selected NukeFire
    // foreground is light. Emit the selected foreground explicitly for every
    // unstyled or monochrome transcript run.
    let foreground = defaultForeground || DEFAULT_THEME.foreground;
    let fgBasic = null;
    if (!monochrome) {
      foreground = style.fg || foreground;
      if (Number.isInteger(style.fgBasicIndex) && style.fgBasicIndex >= 0 && style.fgBasicIndex <= 15) {
        // Preserve NukeFire's established bold-basic-color behavior without
        // expanding a palette color into a 24-bit RGB SGR sequence. xterm has
        // drawBoldTextInBrightColors disabled, so bold 30-37 is serialized as
        // the matching 90-97 color explicitly while keeping the bold flag.
        const effectiveIndex = style.bold && style.fgBasicIndex <= 7
          ? style.fgBasicIndex + 8
          : style.fgBasicIndex;
        fgBasic = basicForeground(effectiveIndex);
      }
    }
    if (fgBasic !== null) codes.push(fgBasic);
    else {
      const fgRgb = cachedColorTriplet(foreground, colorCache) || cachedColorTriplet(DEFAULT_THEME.foreground, colorCache);
      if (fgRgb) codes.push(38, 2, ...fgRgb);
    }

    if (!monochrome) {
      const bgRgb = cachedColorTriplet(style.bg, colorCache);
      const bgBasic = Number.isInteger(style.bgBasicIndex) ? basicBackground(style.bgBasicIndex) : null;
      if (bgBasic !== null) codes.push(bgBasic);
      else if (bgRgb) codes.push(48, 2, ...bgRgb);
      else {
        // Preserve the established explicit-null behavior from the Beta.72
        // serializer: a parsed default style carries bgBasicIndex: null, whose
        // legacy fallback emits ANSI black (40). Undefined style fields from
        // client-created plain runs still leave the background untouched.
        const legacyDefaultBackground = basicBackground(style.bgBasicIndex);
        if (legacyDefaultBackground !== null) codes.push(legacyDefaultBackground);
      }
    }
    return codes;
  }

  function normalizeTranscriptText(value) {
    const text = String(value ?? '');
    // Ordinary MUD runs contain printable text/newlines. Avoid two regex passes
    // for the overwhelmingly common case while preserving transcript cleanup
    // whenever carriage returns or editing controls are actually present.
    if (!/[\r\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)) return text;
    return text
      .replace(/\r\n|\r/gu, '\n')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, '');
  }

  function presentationSliceEnd(text, start, maximum) {
    let end = Math.min(text.length, start + Math.max(1, maximum));
    if (end < text.length) {
      const before = text.charCodeAt(end - 1);
      const after = text.charCodeAt(end);
      if (before >= 0xD800 && before <= 0xDBFF && after >= 0xDC00 && after <= 0xDFFF) end -= 1;
    }
    return Math.max(start + 1, end);
  }

  function presentationChunkLimit(totalCharacters, pendingCharacters = 0) {
    const total = Math.max(0, Number(totalCharacters) || 0);
    const pending = Math.max(0, Number(pendingCharacters) || 0);
    const boundedFrames = total > 0 ? Math.ceil(total / PRESENTATION_MAX_CHUNKS) : PRESENTATION_CHUNK_CHARACTERS;
    const catchup = pending >= PRESENTATION_CATCHUP_PENDING_CHARACTERS
      ? PRESENTATION_CATCHUP_CHUNK_CHARACTERS
      : PRESENTATION_CHUNK_CHARACTERS;
    return Math.max(PRESENTATION_CHUNK_CHARACTERS, catchup, boundedFrames);
  }

  function chunkRunsForPresentation(runs = [], maximumCharacters = PRESENTATION_CHUNK_CHARACTERS) {
    const source = Array.isArray(runs) ? runs : [];
    const limit = Math.max(1, Math.trunc(Number(maximumCharacters) || PRESENTATION_CHUNK_CHARACTERS));
    const chunks = [];
    let current = [];
    let characters = 0;
    const flush = () => {
      if (!current.length) return;
      chunks.push(current);
      current = [];
      characters = 0;
    };

    for (const run of source) {
      const text = normalizeTranscriptText(run?.text);
      if (!text) continue;
      let offset = 0;
      while (offset < text.length) {
        if (characters >= limit) flush();
        const available = Math.max(1, limit - characters);
        const first = text.charCodeAt(offset);
        const second = text.charCodeAt(offset + 1);
        if (available === 1 && characters > 0 && first >= 0xD800 && first <= 0xDBFF && second >= 0xDC00 && second <= 0xDFFF) {
          flush();
          continue;
        }
        const end = presentationSliceEnd(text, offset, available);
        const piece = text.slice(offset, end);
        current.push({ ...run, text: piece });
        characters += piece.length;
        offset = end;
        if (characters >= limit) flush();
      }
    }
    flush();
    return chunks;
  }

  function runsTextCharacters(runs = []) {
    let total = 0;
    for (const run of Array.isArray(runs) ? runs : []) total += normalizeTranscriptText(run?.text).length;
    return total;
  }

  function runsToAnsi(runs = [], options = {}) {
    const source = Array.isArray(runs) ? runs : [];
    const monochrome = Boolean(options.monochrome);
    const defaultForeground = options.defaultForeground || DEFAULT_THEME.foreground;
    const output = [];
    const colorCache = source.length >= 8 ? new Map() : null;
    const linkCache = source.length >= 8 ? new Map() : null;
    for (const run of source) {
      const text = normalizeTranscriptText(run?.text);
      if (!text) continue;
      const codes = styleCodes(run, monochrome, defaultForeground, colorCache);
      const linkKey = String(run?.link || '');
      let resolvedLink = null;
      if (linkKey && typeof osc8Api.resolveOsc8Uri === 'function') {
        if (linkCache?.has(linkKey)) resolvedLink = linkCache.get(linkKey);
        else {
          resolvedLink = osc8Api.resolveOsc8Uri(linkKey);
          linkCache?.set(linkKey, resolvedLink);
        }
      }
      const openLink = resolvedLink?.available && resolvedLink.kind !== 'close'
        ? (osc8Api.osc8Open?.(resolvedLink.uri) || '')
        : '';
      const closeLink = openLink ? (osc8Api.osc8Close?.() || '') : '';
      output.push(`${openLink}\x1b[0m${codes.length ? `\x1b[${codes.join(';')}m` : ''}${text}${closeLink}`);
    }
    return output.length ? `${output.join('')}\x1b[0m` : '';
  }

  class XtermTerminalAdapter {
    constructor(options = {}) {
      this.container = options.container || null;
      this.TerminalCtor = options.TerminalCtor || globalThis.Terminal || null;
      this.FitAddonCtor = options.FitAddonCtor || globalThis.FitAddon?.FitAddon || null;
      this.SearchAddonCtor = options.SearchAddonCtor || globalThis.SearchAddon?.SearchAddon || null;
      this.SerializeAddonCtor = options.SerializeAddonCtor || globalThis.SerializeAddon?.SerializeAddon || null;
      this.Unicode11AddonCtor = options.Unicode11AddonCtor || globalThis.Unicode11Addon?.Unicode11Addon || null;
      this.terminal = null;
      this.fitAddon = null;
      this.searchAddon = null;
      this.serializeAddon = null;
      this.unicode11Addon = null;
      this.unicodeWidthProvider = null;
      this.ready = false;
      this.monochrome = Boolean(options.monochrome);
      this.theme = { ...DEFAULT_THEME, ...(options.theme || {}) };
      this.fontSize = clamp(options.fontSize, 9, 36, 16);
      this.fontFamily = String(options.fontFamily || DEFAULT_FONT_FAMILY);
      this.fontProfile = normalizeFontProfile(options.fontProfile);
      this.compact = Boolean(options.compact);
      this.screenReaderMode = Boolean(options.screenReaderMode);
      this.scrollback = clamp(options.scrollback, 1000, 500000, DEFAULT_SCROLLBACK_LINES);
      this.operationQueue = [];
      this.operationHead = 0;
      this.operationActive = false;
      this.pendingWriteCharacters = 0;
      this.maxPendingWriteCharacters = 0;
      this.coalescedWriteOperations = 0;
      this.completedWriteOperations = 0;
      this.lastWriteLatencyMs = 0;
      this.maxWriteLatencyMs = 0;
      this.totalWriteLatencyMs = 0;
      this.presentationChunks = 0;
      this.presentationFrames = 0;
      this.presentationBatches = 0;
      this.presentationCatchups = 0;
      this.presentationGapSamples = 0;
      this.presentationGapLastMs = 0;
      this.presentationGapMaxMs = 0;
      this.presentationGapTotalMs = 0;
      this.presentationFrame = null;
      this.schedulePresentationFrame = typeof options.schedulePresentationFrame === 'function'
        ? options.schedulePresentationFrame
        : (callback) => (typeof globalThis.requestAnimationFrame === 'function'
          ? globalThis.requestAnimationFrame(callback)
          : globalThis.setTimeout(callback, 16));
      this.cancelPresentationFrame = typeof options.cancelPresentationFrame === 'function'
        ? options.cancelPresentationFrame
        : (handle) => (typeof globalThis.cancelAnimationFrame === 'function'
          ? globalThis.cancelAnimationFrame(handle)
          : globalThis.clearTimeout(handle));
      this.onScroll = typeof options.onScroll === 'function' ? options.onScroll : null;
      this.onLinkActivate = typeof options.onLinkActivate === 'function' ? options.onLinkActivate : null;
      this.onLinkHover = typeof options.onLinkHover === 'function' ? options.onLinkHover : null;
      this.onLinkLeave = typeof options.onLinkLeave === 'function' ? options.onLinkLeave : null;
      this.originalContainerTitle = String(this.container?.title || '');
      this.scrollDisposable = null;
    }

    initialize() {
      if (this.ready) return true;
      if (!this.container || typeof this.TerminalCtor !== 'function') return false;
      const typography = terminalTypography(this.fontProfile, this.compact);
      this.terminal = new this.TerminalCtor({
        // xterm's Unicode provider API is still marked proposed in 6.0.0.
        // The official Unicode 11 addon requires it; keep addon failure non-fatal
        // below so Unicode support can never take the terminal down.
        allowProposedApi: true,
        convertEol: true,
        cursorBlink: false,
        cursorInactiveStyle: 'none',
        disableStdin: true,
        customGlyphs: typography.customGlyphs,
        drawBoldTextInBrightColors: typography.drawBoldTextInBrightColors,
        fontFamily: this.fontFamily,
        fontSize: this.fontSize,
        fontWeight: typography.fontWeight,
        fontWeightBold: typography.fontWeightBold,
        letterSpacing: typography.letterSpacing,
        lineHeight: typography.lineHeight,
        rescaleOverlappingGlyphs: typography.rescaleOverlappingGlyphs,
        // Preserve the MUD's explicit ANSI palette. Accessibility information
        // remains available through NukeFire's non-color reader text and labels.
        minimumContrastRatio: 1,
        screenReaderMode: this.screenReaderMode,
        scrollback: this.scrollback,
        scrollOnUserInput: false,
        tabStopWidth: 4,
        theme: this.theme,
        linkHandler: {
          allowNonHttpProtocols: true,
          activate: (event, uri, range) => {
            this.onLinkActivate?.({
              uri: String(uri || ''),
              range,
              modifiers: {
                altKey: Boolean(event?.altKey),
                ctrlKey: Boolean(event?.ctrlKey),
                metaKey: Boolean(event?.metaKey),
                shiftKey: Boolean(event?.shiftKey)
              }
            });
          },
          hover: (_event, uri, range) => {
            const description = typeof osc8Api.describeOsc8Uri === 'function'
              ? osc8Api.describeOsc8Uri(uri)
              : String(uri || '');
            if (this.container && description) this.container.title = description;
            this.onLinkHover?.({ uri: String(uri || ''), range, description });
          },
          leave: (_event, uri, range) => {
            if (this.container) this.container.title = this.originalContainerTitle;
            this.onLinkLeave?.({ uri: String(uri || ''), range });
          }
        }
      });
      if (typeof this.FitAddonCtor === 'function') {
        this.fitAddon = new this.FitAddonCtor();
        this.terminal.loadAddon?.(this.fitAddon);
      }
      if (typeof this.SearchAddonCtor === 'function') {
        this.searchAddon = new this.SearchAddonCtor();
        this.terminal.loadAddon?.(this.searchAddon);
      }
      if (typeof this.SerializeAddonCtor === 'function') {
        this.serializeAddon = new this.SerializeAddonCtor();
        this.terminal.loadAddon?.(this.serializeAddon);
      }
      if (typeof this.Unicode11AddonCtor === 'function') {
        try {
          const baseProvider = captureUnicodeProvider(this.Unicode11AddonCtor);
          this.unicode11Addon = new this.Unicode11AddonCtor();
          this.terminal.loadAddon?.(this.unicode11Addon);
          const unicode = this.terminal.unicode;
          const provider = createNukeFireUnicodeProvider(baseProvider);
          if (provider && typeof unicode?.register === 'function') {
            unicode.register(provider);
            unicode.activeVersion = provider.version;
            this.unicodeWidthProvider = provider;
          } else if (unicode) {
            unicode.activeVersion = '11';
          }
        } catch {
          // Unicode width enhancement is optional. Never make terminal startup
          // depend on an addon or proposed-API activation succeeding.
          this.unicode11Addon = null;
          this.unicodeWidthProvider = null;
        }
      }
      this.terminal.open?.(this.container);
      this.scrollDisposable = this.terminal.onScroll?.(() => {
        this.onScroll?.(this.isAtLiveBottom());
      }) || null;
      this.ready = true;
      this.fit();
      return true;
    }

    setTheme(theme = {}, monochrome = this.monochrome) {
      this.theme = { ...DEFAULT_THEME, ...theme };
      this.monochrome = Boolean(monochrome);
      if (this.terminal) this.terminal.options.theme = this.theme;
    }

    setFontSize(value, options = {}) {
      this.fontSize = clamp(value, 9, 36, this.fontSize || 16);
      if (this.terminal) this.terminal.options.fontSize = this.fontSize;
      if (options.fit !== false) this.fit();
    }

    applyTypography() {
      if (!this.terminal) return;
      const typography = terminalTypography(this.fontProfile, this.compact);
      this.terminal.options.customGlyphs = typography.customGlyphs;
      this.terminal.options.drawBoldTextInBrightColors = typography.drawBoldTextInBrightColors;
      this.terminal.options.fontWeight = typography.fontWeight;
      this.terminal.options.fontWeightBold = typography.fontWeightBold;
      this.terminal.options.letterSpacing = typography.letterSpacing;
      this.terminal.options.lineHeight = typography.lineHeight;
      this.terminal.options.rescaleOverlappingGlyphs = typography.rescaleOverlappingGlyphs;
    }

    setFontFamily(value, profileValue = this.fontProfile, options = {}) {
      const family = String(value || '').trim() || DEFAULT_FONT_FAMILY;
      this.fontFamily = family;
      this.fontProfile = normalizeFontProfile(profileValue);
      if (this.terminal) {
        this.terminal.options.fontFamily = family;
        this.applyTypography();
      }
      if (options.fit !== false) this.fit();
    }

    setCompact(enabled) {
      this.compact = Boolean(enabled);
      this.applyTypography();
      this.fit();
    }

    setScreenReaderMode(enabled) {
      this.screenReaderMode = Boolean(enabled);
      if (this.terminal) this.terminal.options.screenReaderMode = this.screenReaderMode;
    }

    fit() {
      if (!this.ready) return false;
      try {
        this.fitAddon?.fit?.();
        return true;
      } catch {
        return false;
      }
    }

    size() {
      return {
        width: Math.max(20, Number(this.terminal?.cols) || 80),
        height: Math.max(5, Number(this.terminal?.rows) || 24)
      };
    }

    enqueueOperation(operation) {
      if (typeof operation !== 'function') return;
      this.operationQueue.push(operation);
      this.drainOperations();
    }

    notePendingWriteCharacters() {
      this.maxPendingWriteCharacters = Math.max(this.maxPendingWriteCharacters, this.pendingWriteCharacters);
    }

    noteWriteCompletion(startedAt, characters) {
      const finishedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
      const latency = Math.max(0, finishedAt - startedAt);
      this.pendingWriteCharacters = Math.max(0, this.pendingWriteCharacters - Math.max(0, Number(characters) || 0));
      this.completedWriteOperations += 1;
      this.lastWriteLatencyMs = latency;
      this.maxWriteLatencyMs = Math.max(this.maxWriteLatencyMs, latency);
      this.totalWriteLatencyMs += latency;
      return finishedAt;
    }

    notePresentationGap(previousAt, finishedAt) {
      if (!(previousAt > 0) || !(finishedAt >= previousAt)) return;
      const gap = finishedAt - previousAt;
      this.presentationGapSamples += 1;
      this.presentationGapLastMs = gap;
      this.presentationGapMaxMs = Math.max(this.presentationGapMaxMs, gap);
      this.presentationGapTotalMs += gap;
    }

    resetWritePerformance() {
      this.maxPendingWriteCharacters = this.pendingWriteCharacters;
      this.coalescedWriteOperations = 0;
      this.completedWriteOperations = 0;
      this.lastWriteLatencyMs = 0;
      this.maxWriteLatencyMs = 0;
      this.totalWriteLatencyMs = 0;
      this.presentationChunks = 0;
      this.presentationFrames = 0;
      this.presentationBatches = 0;
      this.presentationCatchups = 0;
      this.presentationGapSamples = 0;
      this.presentationGapLastMs = 0;
      this.presentationGapMaxMs = 0;
      this.presentationGapTotalMs = 0;
    }

    enqueuePresentationChunks(chunks = [], options = {}) {
      const source = (Array.isArray(chunks) ? chunks : []).filter((chunk) => typeof chunk === 'string' && chunk.length > 0);
      if (!source.length) return true;
      if (source.length === 1) return this.enqueueWrite(source[0], options);

      const totalCharacters = source.reduce((total, chunk) => total + chunk.length, 0);
      this.pendingWriteCharacters += totalCharacters;
      this.notePendingWriteCharacters();
      this.presentationBatches += 1;

      const operation = (done) => {
        let index = 0;
        let priorCompletionAt = 0;
        const writeNext = () => {
          this.presentationFrame = null;
          const payload = source[index];
          const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
            ? performance.now()
            : Date.now();
          this.presentationChunks += 1;
          this.terminal.write?.(payload, () => {
            const finishedAt = this.noteWriteCompletion(startedAt, payload.length);
            if (priorCompletionAt > 0) this.notePresentationGap(priorCompletionAt, finishedAt);
            priorCompletionAt = finishedAt;
            if (options.follow) this.scrollToBottom();
            index += 1;
            if (index >= source.length) {
              if (typeof options.onWritten === 'function') {
                try { options.onWritten(); } catch {}
              }
              done();
              return;
            }
            this.presentationFrame = this.schedulePresentationFrame(() => {
              this.presentationFrames += 1;
              writeNext();
            });
          });
        };
        writeNext();
      };
      operation.nukefirePresentationBatch = true;
      this.enqueueOperation(operation);
      return true;
    }

    enqueueWrite(data, options = {}) {
      const payload = String(data || '');
      if (!payload) return true;

      /* Renderer frames can arrive faster than xterm finishes parsing a prior
       * write, especially during heavy output. Merge only still-queued writes;
       * the active write and ordering barriers such as replace/clear remain
       * untouched. This reduces repeated xterm parser/callback overhead without
       * delaying the normal no-backlog path. */
      const queuedCount = this.operationQueue.length - this.operationHead;
      const tail = queuedCount > 0 ? this.operationQueue.at(-1) : null;
      const batch = tail?.nukefireWriteBatch;
      if (batch && batch.characters < 262144) {
        batch.parts.push(payload);
        batch.characters += payload.length;
        batch.follow = batch.follow || Boolean(options.follow);
        if (typeof options.onWritten === 'function') batch.callbacks.push(options.onWritten);
        this.pendingWriteCharacters += payload.length;
        this.notePendingWriteCharacters();
        this.coalescedWriteOperations += 1;
        return true;
      }

      const next = {
        parts: [payload],
        characters: payload.length,
        follow: Boolean(options.follow),
        callbacks: typeof options.onWritten === 'function' ? [options.onWritten] : []
      };
      const operation = (done) => {
        const combined = next.parts.length === 1 ? next.parts[0] : next.parts.join('');
        const startedAt = typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
        this.terminal.write?.(combined, () => {
          this.noteWriteCompletion(startedAt, next.characters);
          if (next.follow) this.scrollToBottom();
          for (const callback of next.callbacks) {
            try { callback(); } catch {}
          }
          done();
        });
      };
      operation.nukefireWriteBatch = next;
      this.pendingWriteCharacters += payload.length;
      this.notePendingWriteCharacters();
      this.enqueueOperation(operation);
      return true;
    }

    writePerformanceSnapshot() {
      const queuedOperations = Math.max(0, this.operationQueue.length - this.operationHead) + (this.operationActive ? 1 : 0);
      return {
        queuedOperations,
        pendingCharacters: this.pendingWriteCharacters,
        maxPendingCharacters: this.maxPendingWriteCharacters,
        coalescedOperations: this.coalescedWriteOperations,
        completedOperations: this.completedWriteOperations,
        lastLatencyMs: this.lastWriteLatencyMs,
        maxLatencyMs: this.maxWriteLatencyMs,
        averageLatencyMs: this.completedWriteOperations > 0
          ? this.totalWriteLatencyMs / this.completedWriteOperations
          : 0,
        presentationChunks: this.presentationChunks,
        presentationFrames: this.presentationFrames,
        presentationBatches: this.presentationBatches,
        presentationCatchups: this.presentationCatchups,
        presentationGapSamples: this.presentationGapSamples,
        presentationGapLastMs: this.presentationGapLastMs,
        presentationGapMaxMs: this.presentationGapMaxMs,
        presentationGapAverageMs: this.presentationGapSamples > 0
          ? this.presentationGapTotalMs / this.presentationGapSamples
          : 0
      };
    }

    drainOperations() {
      if (this.operationActive || this.operationHead >= this.operationQueue.length) return;
      this.operationActive = true;
      const operation = this.operationQueue[this.operationHead++];
      let completed = false;
      const done = () => {
        if (completed) return;
        completed = true;
        this.operationActive = false;
        /* Array.shift() moves every queued xterm closure for every completed
         * write. Heavy output can therefore turn a temporary render backlog
         * into quadratic work. Advance a cursor and compact occasionally. */
        if (this.operationHead >= 64 && this.operationHead * 2 >= this.operationQueue.length) {
          this.operationQueue = this.operationQueue.slice(this.operationHead);
          this.operationHead = 0;
        } else if (this.operationHead >= this.operationQueue.length) {
          this.operationQueue = [];
          this.operationHead = 0;
        }
        this.drainOperations();
      };
      try {
        operation(done);
      } catch {
        done();
      }
    }

    writeAnsi(value, options = {}) {
      if (!this.initialize()) return false;
      const monochrome = options.monochrome ?? this.monochrome;
      const data = sanitizeAnsiForXterm(value, { monochrome });
      if (!data) return true;
      // Reset once when monochrome is active so a color selected by the prior
      // write cannot leak into plain text after SGR sequences are stripped.
      const payload = monochrome ? `\x1b[0m${data}` : data;
      return this.enqueueWrite(payload, options);
    }

    writeRuns(runs = [], options = {}) {
      if (!this.initialize()) return false;
      const serializerOptions = {
        monochrome: options.monochrome ?? this.monochrome,
        defaultForeground: options.defaultForeground || this.theme.foreground || DEFAULT_THEME.foreground
      };
      const textCharacters = runsTextCharacters(runs);
      // Reader mode keeps the historical single-write timing. Visual pacing is
      // solely a presentation optimization and must not alter accessibility
      // announcement/order timing.
      const pacingEnabled = options.presentationPacing !== false && !this.screenReaderMode
        && textCharacters > PRESENTATION_PACING_MIN_CHARACTERS;
      if (pacingEnabled) {
        const limit = presentationChunkLimit(textCharacters, this.pendingWriteCharacters);
        if (limit > PRESENTATION_CHUNK_CHARACTERS) this.presentationCatchups += 1;
        const chunks = chunkRunsForPresentation(runs, limit)
          .map((chunk) => runsToAnsi(chunk, serializerOptions))
          .filter(Boolean);
        if (chunks.length > 1) return this.enqueuePresentationChunks(chunks, options);
      }
      const data = runsToAnsi(runs, serializerOptions);
      if (!data) return true;
      return this.enqueueWrite(data, options);
    }

    replaceRuns(runs = [], options = {}) {
      if (!this.initialize()) return false;
      const data = runsToAnsi(runs, {
        monochrome: options.monochrome ?? this.monochrome,
        defaultForeground: options.defaultForeground || this.theme.foreground || DEFAULT_THEME.foreground
      });
      this.enqueueOperation((done) => {
        this.terminal.reset?.();
        this.terminal.clear?.();
        if (!data) {
          if (options.follow) this.scrollToBottom();
          options.onWritten?.();
          done();
          return;
        }
        this.terminal.write?.(data, () => {
          if (options.follow) this.scrollToBottom();
          options.onWritten?.();
          done();
        });
      });
      return true;
    }

    clear() {
      if (!this.initialize()) return false;
      this.enqueueOperation((done) => {
        this.terminal.reset?.();
        this.terminal.clear?.();
        done();
      });
      return true;
    }

    focus() {
      this.terminal?.focus?.();
    }

    getSelection() {
      return String(this.terminal?.getSelection?.() || '');
    }

    hasSelection() {
      if (typeof this.terminal?.hasSelection === 'function') {
        return Boolean(this.terminal.hasSelection());
      }
      return Boolean(this.getSelection());
    }

    clearSelection() {
      this.terminal?.clearSelection?.();
    }

    scrollToBottom() {
      this.terminal?.scrollToBottom?.();
    }

    scrollToTop() {
      this.terminal?.scrollToTop?.();
    }

    scrollLines(amount) {
      this.terminal?.scrollLines?.(Number(amount) || 0);
    }

    scrollPages(amount) {
      this.terminal?.scrollPages?.(Number(amount) || 0);
    }

    isAtLiveBottom() {
      const active = this.terminal?.buffer?.active;
      if (!active) return true;
      return Number(active.viewportY) >= Number(active.baseY);
    }

    findNext(term, options = {}) {
      return Boolean(this.searchAddon?.findNext?.(String(term || ''), options));
    }

    findPrevious(term, options = {}) {
      return Boolean(this.searchAddon?.findPrevious?.(String(term || ''), options));
    }

    serialize() {
      return String(this.serializeAddon?.serialize?.() || '');
    }

    dispose() {
      if (this.presentationFrame !== null) {
        try { this.cancelPresentationFrame(this.presentationFrame); } catch {}
        this.presentationFrame = null;
      }
      this.operationQueue = [];
      this.operationHead = 0;
      this.operationActive = false;
      this.pendingWriteCharacters = 0;
      this.scrollDisposable?.dispose?.();
      this.scrollDisposable = null;
      this.terminal?.dispose?.();
      this.terminal = null;
      this.ready = false;
    }
  }

  return {
    DEFAULT_SCROLLBACK_LINES,
    colorTriplet,
    sanitizeAnsiForXterm,
    normalizeTranscriptText,
    presentationChunkLimit,
    chunkRunsForPresentation,
    styleCodes,
    runsToAnsi,
    terminalTypography,
    XtermTerminalAdapter
  };
});
