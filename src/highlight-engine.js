'use strict';

(function exposeHighlightEngine(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireHighlights = api;
})(typeof window !== 'undefined' ? window : globalThis, function createHighlightEngine() {
  const HIGHLIGHT_PATTERN_MAX = 512;
  const HIGHLIGHT_STYLE_MAX = 256;
  const DEFAULT_MAX_HIGHLIGHTS = 256;
  const DEFAULT_HIGHLIGHT_PRIORITY = 5;
  const MIN_HIGHLIGHT_PRIORITY = 1;
  const MAX_HIGHLIGHT_PRIORITY = 9;
  const DEFAULT_MAX_LINE_LENGTH = 16384;

  const DARK_COLORS = Object.freeze({
    azure: '#0088aa',
    black: '#000000',
    blue: '#0000aa',
    cyan: '#00aaaa',
    ebony: '#000000',
    green: '#00aa00',
    jade: '#00aa88',
    lime: '#88aa00',
    magenta: '#aa00aa',
    orange: '#aa5500',
    pink: '#aa0088',
    red: '#aa0000',
    silver: '#aaaaaa',
    tan: '#aa8855',
    violet: '#5500aa',
    white: '#dddddd',
    yellow: '#aaaa00'
  });

  const BRIGHT_COLORS = Object.freeze({
    azure: '#55ddff',
    black: '#555555',
    blue: '#5555ff',
    cyan: '#55ffff',
    ebony: '#555555',
    green: '#55ff55',
    jade: '#55ffcc',
    lime: '#ccff55',
    magenta: '#ff55ff',
    orange: '#ff9955',
    pink: '#ff55cc',
    red: '#ff5555',
    silver: '#eeeeee',
    tan: '#eedd99',
    violet: '#aa55ff',
    white: '#ffffff',
    yellow: '#ffff55'
  });

  const TINTIN_COLOR_CODES = Object.freeze({
    '<abd>': ['azure', false], '<acf>': ['azure', true],
    '<aad>': ['blue', false], '<aaf>': ['blue', true],
    '<add>': ['cyan', false], '<aff>': ['cyan', true],
    '<aaa>': ['ebony', false], '<bbb>': ['ebony', true],
    '<ada>': ['green', false], '<afa>': ['green', true],
    '<adb>': ['jade', false], '<afc>': ['jade', true],
    '<bda>': ['lime', false], '<cfa>': ['lime', true],
    '<dad>': ['magenta', false], '<faf>': ['magenta', true],
    '<dba>': ['orange', false], '<fca>': ['orange', true],
    '<dab>': ['pink', false], '<fac>': ['pink', true],
    '<daa>': ['red', false], '<faa>': ['red', true],
    '<ccc>': ['silver', false], '<eee>': ['silver', true],
    '<cba>': ['tan', false], '<eda>': ['tan', true],
    '<bad>': ['violet', false], '<caf>': ['violet', true],
    '<ddd>': ['white', false], '<fff>': ['white', true],
    '<dda>': ['yellow', false], '<ffa>': ['yellow', true]
  });

  function normalizeClassName(value) {
    const source = String(value || '').normalize('NFKC').trim().toLowerCase();
    if (!source || source.length > 48) return '';
    if (!/^[a-z0-9][a-z0-9_-]*$/u.test(source)) return '';
    return ['__proto__', 'constructor', 'prototype'].includes(source) ? '' : source;
  }

  function normalizeHighlightPattern(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\r\n]+/gu, ' ')
      .trim()
      .slice(0, HIGHLIGHT_PATTERN_MAX);
  }

  function normalizeHighlightStyle(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\r\n]+/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, HIGHLIGHT_STYLE_MAX);
  }

  function normalizeHighlightPriority(value, fallback = DEFAULT_HIGHLIGHT_PRIORITY) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(MIN_HIGHLIGHT_PRIORITY, Math.min(MAX_HIGHLIGHT_PRIORITY, Math.trunc(numeric)));
  }

  function escapeRegexCharacter(character) {
    return /[\\^$.*+?()[\]{}|]/u.test(character) ? `\\${character}` : character;
  }

  function highlightWildcardSource(token, hasTrailingPattern) {
    const suffix = hasTrailingPattern ? '?' : '';
    return ({
      d: `[0-9]*${suffix}`,
      D: `[^0-9]*${suffix}`,
      s: `\\s*${suffix}`,
      S: `\\S*${suffix}`,
      w: `[A-Za-z]*${suffix}`,
      W: `[^A-Za-z]*${suffix}`,
      '?': hasTrailingPattern ? '.??' : '.?',
      '*': hasTrailingPattern ? '.*?' : '.*',
      '+': hasTrailingPattern ? '.+?' : '.+',
      '.': '.'
    })[token] || (hasTrailingPattern ? '.*?' : '.*');
  }

  function highlightCaseAwareLiteral(character, ignoreCase) {
    if (ignoreCase && /^[A-Za-z]$/u.test(character)) {
      const lower = character.toLowerCase();
      const upper = character.toUpperCase();
      return lower === upper ? escapeRegexCharacter(character) : `[${lower}${upper}]`;
    }
    return escapeRegexCharacter(character);
  }

  const HIGHLIGHT_PREFILTER_MAX_GRAM = 4;

  function analyzeHighlightPrefilter(patternValue) {
    const pattern = normalizeHighlightPattern(patternValue);
    if (!pattern) return Object.freeze({ prefix: '', segments: Object.freeze([]) });
    const anchoredStart = pattern.startsWith('^');
    const anchoredEnd = pattern.endsWith('$');
    const firstIndex = anchoredStart ? 1 : 0;
    const lastIndex = anchoredEnd ? pattern.length - 1 : pattern.length;
    let ignoreCase = false;
    let current = '';
    let currentIgnoreCase = false;
    let prefix = '';
    let prefixOpen = anchoredStart;
    const segments = [];

    const finish = () => {
      if (current) {
        segments.push(Object.freeze({
          value: current,
          needle: currentIgnoreCase ? current.toLowerCase() : current,
          ignoreCase: currentIgnoreCase
        }));
      }
      current = '';
    };

    for (let index = firstIndex; index < lastIndex;) {
      const character = pattern[index];
      const next = pattern[index + 1] || '';

      if (character === '%' && next === '%') {
        if (!current) currentIgnoreCase = ignoreCase;
        if (currentIgnoreCase !== ignoreCase) { finish(); currentIgnoreCase = ignoreCase; }
        current += '%';
        if (prefixOpen) prefix += '%';
        index += 2;
        continue;
      }
      if (character === '%' && (next === 'i' || next === 'I')) {
        finish();
        ignoreCase = next === 'i';
        prefixOpen = false;
        index += 2;
        continue;
      }
      if (character === '%' && ('dDsSwW?*+.'.includes(next) || /[0-9]/u.test(next))) {
        finish();
        prefixOpen = false;
        if (/[0-9]/u.test(next)) {
          const numbered = pattern.slice(index + 1, lastIndex).match(/^(?:[1-9][0-9]?|0)/u);
          index += numbered ? 1 + numbered[0].length : 1;
        } else index += 2;
        continue;
      }
      if (!current) currentIgnoreCase = ignoreCase;
      if (currentIgnoreCase !== ignoreCase) { finish(); currentIgnoreCase = ignoreCase; }
      current += character;
      if (prefixOpen) prefix += character;
      index += 1;
    }
    finish();
    return Object.freeze({ prefix, segments: Object.freeze(segments) });
  }

  function highlightPrefilterGramCandidates(prefilter) {
    const output = [];
    const seen = new Set();
    for (const segment of prefilter?.segments || []) {
      const literal = segment.needle;
      if (!literal) continue;
      const size = Math.min(HIGHLIGHT_PREFILTER_MAX_GRAM, literal.length);
      for (let index = 0; index + size <= literal.length; index += 1) {
        const gram = literal.slice(index, index + size);
        const caseKey = segment.ignoreCase ? 'i' : 's';
        const id = `${caseKey}:${size}:${gram}`;
        if (seen.has(id)) continue;
        seen.add(id);
        output.push(Object.freeze({ gram, size, caseKey, id }));
      }
    }
    return Object.freeze(output);
  }

  function buildHighlightDispatch(recordsValue) {
    const records = Array.isArray(recordsValue) ? recordsValue.filter((record) => record?.enabled) : [];
    const frequencies = new Map();
    const metadata = new Map();
    const fallback = [];
    const rank = new Map(records.map((record, index) => [record, index]));

    for (const record of records) {
      const candidates = highlightPrefilterGramCandidates(record.prefilter);
      if (candidates.length === 0) {
        fallback.push(record);
        continue;
      }
      metadata.set(record, candidates);
      for (const candidate of candidates) frequencies.set(candidate.id, (frequencies.get(candidate.id) || 0) + 1);
    }

    const sensitive = Array.from({ length: HIGHLIGHT_PREFILTER_MAX_GRAM + 1 }, () => new Map());
    const insensitive = Array.from({ length: HIGHLIGHT_PREFILTER_MAX_GRAM + 1 }, () => new Map());
    for (const [record, candidates] of metadata) {
      let selected = candidates[0];
      let selectedFrequency = Infinity;
      for (const candidate of candidates) {
        const frequency = frequencies.get(candidate.id) || Infinity;
        if (frequency < selectedFrequency || (frequency === selectedFrequency && candidate.id < selected.id)) {
          selected = candidate;
          selectedFrequency = frequency;
        }
      }
      const buckets = selected.caseKey === 'i' ? insensitive : sensitive;
      const bucket = buckets[selected.size].get(selected.gram) || [];
      bucket.push(record);
      buckets[selected.size].set(selected.gram, bucket);
    }
    return { sensitive, insensitive, fallback, rank };
  }

  function highlightCandidateRecords(line, dispatch) {
    const candidates = new Set(dispatch?.fallback || []);
    const addBuckets = (text, buckets) => {
      for (let size = 1; size < buckets.length; size += 1) {
        const map = buckets[size];
        if (!map || map.size === 0 || text.length < size) continue;
        const seen = new Set();
        for (let index = 0; index + size <= text.length; index += 1) {
          const gram = text.slice(index, index + size);
          if (seen.has(gram)) continue;
          seen.add(gram);
          const records = map.get(gram);
          if (records) for (const record of records) candidates.add(record);
        }
      }
    };
    addBuckets(line, dispatch?.sensitive || []);
    if ((dispatch?.insensitive || []).some((map) => map?.size)) addBuckets(line.toLowerCase(), dispatch.insensitive);
    return [...candidates].sort((left, right) => (dispatch.rank.get(left) ?? 0) - (dispatch.rank.get(right) ?? 0));
  }

  function highlightPrefilterMatches(line, prefilter) {
    return !prefilter?.prefix || line.startsWith(prefilter.prefix);
  }

  function compileHighlightPattern(patternValue) {
    const pattern = normalizeHighlightPattern(patternValue);
    if (!pattern) return null;

    const anchoredStart = pattern.startsWith('^');
    const anchoredEnd = pattern.endsWith('$');
    const firstIndex = anchoredStart ? 1 : 0;
    const lastIndex = anchoredEnd ? pattern.length - 1 : pattern.length;
    let source = anchoredStart ? '^' : '';
    const seen = new Set();
    let nextAutomaticCapture = 1;
    let ignoreCase = false;

    const registerCapture = (position, token, hasTrailingPattern) => {
      if (position < 0 || position > 99) return null;
      const name = `capture${position}`;
      if (seen.has(position)) return `\\k<${name}>`;
      seen.add(position);
      if (position > 0) nextAutomaticCapture = Math.max(nextAutomaticCapture, position + 1);
      return `(?<${name}>${highlightWildcardSource(token, hasTrailingPattern)})`;
    };
    const nextUnnumberedCapture = () => {
      while (seen.has(nextAutomaticCapture) && nextAutomaticCapture <= 99) nextAutomaticCapture += 1;
      return nextAutomaticCapture <= 99 ? nextAutomaticCapture : -1;
    };

    for (let index = firstIndex; index < lastIndex;) {
      const character = pattern[index];
      const next = pattern[index + 1] || '';
      if (character === '%' && next === '%') {
        source += '%'; index += 2; continue;
      }
      if (character === '%' && (next === 'i' || next === 'I')) {
        ignoreCase = next === 'i'; index += 2; continue;
      }
      if (character === '%' && 'dDsSwW?*+.'.includes(next)) {
        const position = nextUnnumberedCapture();
        if (position < 1) return null;
        const tokenEnd = index + 2;
        source += registerCapture(position, next, tokenEnd < lastIndex);
        index = tokenEnd; continue;
      }
      if (character === '%') {
        const numbered = pattern.slice(index + 1, lastIndex).match(/^(?:[1-9][0-9]?|0)/u);
        if (numbered) {
          const position = Number(numbered[0]);
          const tokenEnd = index + 1 + numbered[0].length;
          source += registerCapture(position, '*', tokenEnd < lastIndex);
          index = tokenEnd; continue;
        }
      }
      source += highlightCaseAwareLiteral(character, ignoreCase);
      index += 1;
    }
    if (anchoredEnd) source += '$';
    try { return new RegExp(source, 'gu'); } catch (_error) { return null; }
  }

  function colorToken(tokenValue) {
    const token = String(tokenValue || '');
    const code = TINTIN_COLOR_CODES[token.toLowerCase()];
    if (code) {
      const [name, bright] = code;
      return { name, bright, value: (bright ? BRIGHT_COLORS : DARK_COLORS)[name] };
    }

    // TinTin's <aaa>..<fff> foreground shorthand is a 6x6x6 xterm color
    // cube. Keep the named compatibility entries above, then accept every
    // remaining cube value instead of rejecting veteran highlight files.
    const cube = token.match(/^<([a-f])([a-f])([a-f])>$/iu);
    if (cube) {
      const levels = Object.freeze({ a: 0, b: 95, c: 135, d: 175, e: 215, f: 255 });
      const [r, g, b] = cube.slice(1).map((entry) => levels[entry.toLowerCase()]);
      const value = `#${[r, g, b].map((entry) => entry.toString(16).padStart(2, '0')).join('')}`;
      return { name: token.toLowerCase(), bright: Math.max(r, g, b) >= 215, value };
    }

    const lower = token.toLowerCase();
    // Historical NukeFire TinTin files used GREY even though the source color
    // table calls this slot SILVER. Preserve those files as a bounded synonym.
    const colorName = lower === 'grey' || lower === 'gray' ? 'silver' : lower;
    if (!Object.hasOwn(DARK_COLORS, colorName)) return null;
    const bright = token[0] === token[0]?.toUpperCase() && token !== lower;
    return { name: colorName, bright, value: (bright ? BRIGHT_COLORS : DARK_COLORS)[colorName] };
  }

  function parseHighlightStyle(styleValue) {
    const source = normalizeHighlightStyle(styleValue);
    if (!source) return { style: null, error: 'Highlight style cannot be empty.' };
    const tokens = source.split(/\s+/u).filter(Boolean);
    const overlay = {};
    let backgroundNext = false;
    let recognized = 0;

    for (const token of tokens) {
      const lower = token.toLowerCase();
      if (lower === 'b' || lower === 'background' || lower === 'bg') {
        if (backgroundNext) return { style: null, error: 'Highlight background marker needs a color after it.' };
        backgroundNext = true;
        continue;
      }
      if (lower === 'reset') {
        overlay.reset = true;
        recognized += 1;
        continue;
      }
      if (lower === 'light' || lower === 'bold') {
        overlay.bold = true;
        overlay.dim = false;
        recognized += 1;
        continue;
      }
      if (lower === 'dark' || lower === 'dim') {
        overlay.dim = true;
        overlay.bold = false;
        recognized += 1;
        continue;
      }
      if (lower === 'underscore' || lower === 'underline') {
        overlay.underline = true;
        recognized += 1;
        continue;
      }
      if (lower === 'reverse' || lower === 'inverse') {
        overlay.inverse = true;
        recognized += 1;
        continue;
      }
      if (lower === 'italic') {
        overlay.italic = true;
        recognized += 1;
        continue;
      }
      if (lower === 'blink') {
        // Veteran TinTin files commonly combine BLINK with a useful color.
        // NukeFire intentionally does not animate blinking text, but dropping
        // that one attribute is safer and more compatible than rejecting the
        // entire Highlight definition.
        recognized += 1;
        continue;
      }

      const color = colorToken(token);
      if (!color) return { style: null, error: `Unknown highlight style token: ${token}.` };
      if (backgroundNext) {
        overlay.bg = color.value;
        overlay.bgBasicIndex = null;
        backgroundNext = false;
      } else {
        overlay.fg = color.value;
        overlay.fgBasicIndex = null;
      }
      recognized += 1;
    }

    if (backgroundNext) return { style: null, error: 'Highlight background marker needs a color after it.' };
    if (recognized === 0) return { style: null, error: 'Highlight style cannot be empty.' };
    return { style: Object.freeze({ ...overlay }), error: '' };
  }

  function detachedRecord(record) {
    return {
      pattern: record.pattern,
      style: record.styleSource,
      priority: record.priority,
      enabled: record.enabled,
      scope: 'global',
      ...(record.className ? { className: record.className } : {})
    };
  }

  class HighlightEngine {
    constructor(options = {}) {
      this.maxHighlights = Math.max(1, Math.trunc(Number(options.maxHighlights) || DEFAULT_MAX_HIGHLIGHTS));
      this.enabled = options.enabled !== false;
      this.highlights = new Map();
      this.ordered = [];
      this.dispatch = buildHighlightDispatch([]);
      this.revision = 0;
      if (Array.isArray(options.highlights)) this.replaceAll(options.highlights);
      else if (options && typeof options === 'object' && Array.isArray(options.definitions)) this.restore(options);
    }

    refreshOrder() {
      this.revision += 1;
      this.ordered = [...this.highlights.values()]
        .sort((left, right) => left.priority - right.priority || left.pattern.localeCompare(right.pattern));
      this.dispatch = buildHighlightDispatch(this.ordered);
    }

    define(patternValue, styleValue, priorityValue = DEFAULT_HIGHLIGHT_PRIORITY, classNameValue = '') {
      const pattern = normalizeHighlightPattern(patternValue);
      const styleSource = normalizeHighlightStyle(styleValue);
      const matcher = compileHighlightPattern(pattern);
      const parsedStyle = parseHighlightStyle(styleSource);
      const className = normalizeClassName(classNameValue);
      if (!pattern || !styleSource || !matcher || parsedStyle.error) return null;
      if (!this.highlights.has(pattern) && this.highlights.size >= this.maxHighlights) return null;

      const existing = this.highlights.get(pattern);
      const record = Object.freeze({
        pattern,
        styleSource,
        style: parsedStyle.style,
        priority: normalizeHighlightPriority(priorityValue),
        enabled: existing?.enabled !== false,
        className,
        matcher,
        prefilter: analyzeHighlightPrefilter(pattern)
      });
      this.highlights.set(pattern, record);
      this.refreshOrder();
      return detachedRecord(record);
    }

    get(patternValue) {
      const record = this.highlights.get(normalizeHighlightPattern(patternValue));
      return record ? detachedRecord(record) : null;
    }

    list() {
      return this.ordered.map(detachedRecord);
    }

    delete(patternValue) {
      const deleted = this.highlights.delete(normalizeHighlightPattern(patternValue));
      if (deleted) this.refreshOrder();
      return deleted;
    }

    setHighlightEnabled(patternValue, enabled) {
      const pattern = normalizeHighlightPattern(patternValue);
      const current = this.highlights.get(pattern);
      if (!current) return null;
      const record = Object.freeze({ ...current, enabled: Boolean(enabled) });
      this.highlights.set(pattern, record);
      this.refreshOrder();
      return detachedRecord(record);
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      return this.enabled;
    }

    clear() {
      this.highlights.clear();
      this.refreshOrder();
    }

    hasEnabledDefinitions() {
      return this.enabled && this.ordered.some((record) => record.enabled);
    }

    replaceAll(records = []) {
      const source = Array.isArray(records) ? records.slice(0, this.maxHighlights * 4) : [];
      const next = new Map();
      for (const raw of source) {
        const record = raw && typeof raw === 'object' ? raw : {};
        const pattern = normalizeHighlightPattern(record.pattern);
        const styleSource = normalizeHighlightStyle(record.style);
        const matcher = compileHighlightPattern(pattern);
        const parsedStyle = parseHighlightStyle(styleSource);
        const className = normalizeClassName(record.className);
        if (!pattern || !styleSource || !matcher || parsedStyle.error) continue;
        if (!next.has(pattern) && next.size >= this.maxHighlights) continue;
        next.set(pattern, Object.freeze({
          pattern,
          styleSource,
          style: parsedStyle.style,
          priority: normalizeHighlightPriority(record.priority),
          enabled: record.enabled !== false,
          className,
          matcher,
          prefilter: analyzeHighlightPrefilter(pattern)
        }));
      }
      this.highlights = next;
      this.refreshOrder();
      return this.list();
    }

    restore(snapshot = {}) {
      const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
      this.enabled = source.enabled !== false;
      this.replaceAll(source.definitions || source.highlights || []);
      return this.snapshot();
    }

    snapshot() {
      return { enabled: this.enabled, definitions: this.list() };
    }

    findMatches(lineValue) {
      const line = String(lineValue ?? '').replaceAll('\r', '');
      if (!this.hasEnabledDefinitions() || !line) return [];
      const matches = [];
      for (const record of highlightCandidateRecords(line, this.dispatch)) {
        if (!record.enabled) continue;
        if (!highlightPrefilterMatches(line, record.prefilter)) continue;
        record.matcher.lastIndex = 0;
        let match = record.matcher.exec(line);
        while (match) {
          const text = String(match[0] || '');
          if (text.length > 0) {
            matches.push({
              start: match.index,
              end: match.index + text.length,
              priority: record.priority,
              pattern: record.pattern,
              style: record.style
            });
          }
          if (record.matcher.lastIndex === match.index) record.matcher.lastIndex += 1;
          match = record.matcher.exec(line);
        }
      }
      return matches.sort((left, right) =>
        left.priority - right.priority || left.start - right.start || right.end - left.end || left.pattern.localeCompare(right.pattern)
      );
    }
  }

  function applyOverlay(baseValue, overlayValue) {
    const overlay = overlayValue && typeof overlayValue === 'object' ? overlayValue : {};
    const base = overlay.reset ? {} : { ...(baseValue || {}) };
    for (const key of ['fg', 'bg', 'fgBasicIndex', 'bgBasicIndex', 'bold', 'dim', 'italic', 'underline', 'inverse']) {
      if (Object.hasOwn(overlay, key)) base[key] = overlay[key];
    }
    return base;
  }

  function applyHighlightsToRuns(runsValue, engineValue) {
    const runs = Array.isArray(runsValue) ? runsValue : [];
    const engine = engineValue instanceof HighlightEngine
      ? engineValue
      : new HighlightEngine(engineValue || {});
    if (!engine.hasEnabledDefinitions() || runs.length === 0) return runs;

    const text = runs.map((run) => String(run?.text || '')).join('');
    const matches = engine.findMatches(text);
    if (matches.length === 0) return runs;

    const boundaries = new Set([0, text.length]);
    let offset = 0;
    for (const run of runs) {
      offset += String(run?.text || '').length;
      boundaries.add(offset);
    }
    for (const match of matches) {
      boundaries.add(Math.max(0, Math.min(text.length, match.start)));
      boundaries.add(Math.max(0, Math.min(text.length, match.end)));
    }
    const points = [...boundaries].sort((left, right) => left - right);
    const output = [];
    let runIndex = 0;
    let runStart = 0;
    let runEnd = String(runs[0]?.text || '').length;

    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      if (end <= start) continue;
      while (runIndex < runs.length - 1 && start >= runEnd) {
        runStart = runEnd;
        runIndex += 1;
        runEnd += String(runs[runIndex]?.text || '').length;
      }
      const source = runs[runIndex] || {};
      const active = matches.find((match) => match.start <= start && match.end >= end);
      output.push({
        ...source,
        text: text.slice(start, end),
        style: active ? applyOverlay(source.style, active.style) : (source.style ? { ...source.style } : null)
      });
    }
    return output;
  }

  class HighlightLineBuffer {
    constructor(options = {}) {
      this.maxLineLength = Math.max(256, Math.trunc(Number(options.maxLineLength) || DEFAULT_MAX_LINE_LENGTH));
      this.carry = '';
      this.passthrough = false;
    }

    reset() {
      this.carry = '';
      this.passthrough = false;
    }

    release() {
      const text = this.carry;
      this.reset();
      return text;
    }

    push(value, enabled = true) {
      const input = String(value ?? '');
      if (!enabled) {
        const released = `${this.release()}${input}`;
        return released ? [released] : [];
      }

      const output = [];
      let cursor = 0;
      while (cursor < input.length) {
        if (this.passthrough) {
          const newline = input.indexOf('\n', cursor);
          if (newline === -1) {
            output.push(input.slice(cursor));
            break;
          }
          output.push(input.slice(cursor, newline + 1));
          this.passthrough = false;
          cursor = newline + 1;
          continue;
        }

        const newline = input.indexOf('\n', cursor);
        const end = newline === -1 ? input.length : newline + 1;
        const charactersBeforeNewline = newline === -1 ? end - cursor : newline - cursor;
        if (this.carry.length + charactersBeforeNewline > this.maxLineLength) {
          const needed = this.maxLineLength + 1 - this.carry.length;
          this.carry += input.slice(cursor, cursor + needed);
          output.push(this.carry);
          this.carry = '';
          this.passthrough = true;
          cursor += needed;
          continue;
        }

        this.carry += input.slice(cursor, end);
        cursor = end;
        if (newline !== -1) {
          output.push(this.carry);
          this.carry = '';
        }
      }
      return output;
    }

    flush() {
      return this.release();
    }
  }

  return {
    HighlightEngine,
    HighlightLineBuffer,
    applyHighlightsToRuns,
    parseHighlightStyle,
    normalizeHighlightPattern,
    normalizeHighlightStyle,
    normalizeHighlightPriority,
    compileHighlightPattern,
    DEFAULT_MAX_HIGHLIGHTS,
    DEFAULT_HIGHLIGHT_PRIORITY,
    MIN_HIGHLIGHT_PRIORITY,
    MAX_HIGHLIGHT_PRIORITY,
    DEFAULT_MAX_LINE_LENGTH,
    DARK_COLORS,
    BRIGHT_COLORS,
    TINTIN_COLOR_CODES
  };
});
