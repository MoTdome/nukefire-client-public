'use strict';

(function exposeSubstituteEngine(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireSubstitutes = api;
})(typeof window !== 'undefined' ? window : globalThis, function createSubstituteEngine() {
  const SUBSTITUTE_PATTERN_MAX = 512;
  const SUBSTITUTE_REPLACEMENT_MAX = 4096;
  const DEFAULT_MAX_SUBSTITUTES = 256;
  const DEFAULT_SUBSTITUTE_PRIORITY = 5;
  const MIN_SUBSTITUTE_PRIORITY = 1;
  const MAX_SUBSTITUTE_PRIORITY = 9;
  const DEFAULT_MAX_REPLACEMENTS_PER_LINE = 256;
  const DEFAULT_MAX_OUTPUT_CHARACTERS = 65_536;

  function normalizeClassName(value) {
    const source = String(value || '').normalize('NFKC').trim().toLowerCase();
    if (!source || source.length > 48) return '';
    if (!/^[a-z0-9][a-z0-9_-]*$/u.test(source)) return '';
    return ['__proto__', 'constructor', 'prototype'].includes(source) ? '' : source;
  }

  function normalizeSubstitutePattern(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\r\n]+/gu, ' ')
      .trim()
      .slice(0, SUBSTITUTE_PATTERN_MAX);
  }

  function normalizeSubstituteReplacement(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\r\n]+/gu, ' ')
      .slice(0, SUBSTITUTE_REPLACEMENT_MAX);
  }

  function normalizeSubstitutePriority(value, fallback = DEFAULT_SUBSTITUTE_PRIORITY) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(MIN_SUBSTITUTE_PRIORITY, Math.min(MAX_SUBSTITUTE_PRIORITY, Math.trunc(numeric)));
  }

  function escapeRegexCharacter(character) {
    return /[\\^$.*+?()[\]{}|]/u.test(character) ? `\\${character}` : character;
  }

  function substituteWildcardSource(token, hasTrailingPattern) {
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

  function substituteCaseAwareLiteral(character, ignoreCase) {
    if (ignoreCase && /^[A-Za-z]$/u.test(character)) {
      const lower = character.toLowerCase();
      const upper = character.toUpperCase();
      return lower === upper ? escapeRegexCharacter(character) : `[${lower}${upper}]`;
    }
    return escapeRegexCharacter(character);
  }

  const SUBSTITUTE_PREFILTER_MAX_GRAM = 4;

  function analyzeSubstitutePrefilter(patternValue) {
    const pattern = normalizeSubstitutePattern(patternValue);
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

  function substitutePrefilterGramCandidates(prefilter) {
    const output = [];
    const seen = new Set();
    for (const segment of prefilter?.segments || []) {
      const literal = segment.needle;
      if (!literal) continue;
      const size = Math.min(SUBSTITUTE_PREFILTER_MAX_GRAM, literal.length);
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

  function buildSubstituteDispatch(recordsValue) {
    const records = Array.isArray(recordsValue) ? recordsValue.filter((record) => record?.enabled) : [];
    const frequencies = new Map();
    const metadata = new Map();
    const fallback = [];
    const rank = new Map(records.map((record, index) => [record, index]));

    for (const record of records) {
      const candidates = substitutePrefilterGramCandidates(record.prefilter);
      if (candidates.length === 0) {
        fallback.push(record);
        continue;
      }
      metadata.set(record, candidates);
      for (const candidate of candidates) frequencies.set(candidate.id, (frequencies.get(candidate.id) || 0) + 1);
    }

    const sensitive = Array.from({ length: SUBSTITUTE_PREFILTER_MAX_GRAM + 1 }, () => new Map());
    const insensitive = Array.from({ length: SUBSTITUTE_PREFILTER_MAX_GRAM + 1 }, () => new Map());
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

  function substituteCandidateRecords(line, dispatch) {
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

  function substitutePrefilterMatches(line, prefilter) {
    return !prefilter?.prefix || line.startsWith(prefilter.prefix);
  }

  function compileSubstitutePattern(patternValue) {
    const pattern = normalizeSubstitutePattern(patternValue);
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
      return `(?<${name}>${substituteWildcardSource(token, hasTrailingPattern)})`;
    };
    const nextUnnumberedCapture = () => {
      while (seen.has(nextAutomaticCapture) && nextAutomaticCapture <= 99) nextAutomaticCapture += 1;
      return nextAutomaticCapture <= 99 ? nextAutomaticCapture : -1;
    };

    for (let index = firstIndex; index < lastIndex;) {
      const character = pattern[index];
      const next = pattern[index + 1] || '';
      if (character === '%' && next === '%') { source += '%'; index += 2; continue; }
      if (character === '%' && (next === 'i' || next === 'I')) { ignoreCase = next === 'i'; index += 2; continue; }
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
      source += substituteCaseAwareLiteral(character, ignoreCase);
      index += 1;
    }
    if (anchoredEnd) source += '$';
    try { return new RegExp(source, 'dgu'); } catch (_error) { return null; }
  }

  function compileReplacementTemplate(value) {
    const source = normalizeSubstituteReplacement(value);
    const tokens = [];
    let literal = '';
    const commitLiteral = () => {
      if (!literal) return;
      tokens.push(Object.freeze({ type: 'literal', value: literal }));
      literal = '';
    };

    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      const next = source[index + 1];
      if (character !== '%') {
        literal += character;
        continue;
      }
      if (next === '%') {
        literal += '%';
        index += 1;
        continue;
      }
      if (/^[0-9]$/u.test(next || '')) {
        commitLiteral();
        tokens.push(Object.freeze({ type: 'capture', index: Number(next) }));
        index += 1;
        continue;
      }
      literal += character;
    }
    commitLiteral();
    return Object.freeze(tokens);
  }

  function detachedRecord(record) {
    return {
      pattern: record.pattern,
      replacement: record.replacement,
      priority: record.priority,
      enabled: record.enabled,
      scope: 'global',
      ...(record.className ? { className: record.className } : {})
    };
  }

  class SubstituteEngine {
    constructor(options = {}) {
      this.maxSubstitutes = Math.max(1, Math.trunc(Number(options.maxSubstitutes) || DEFAULT_MAX_SUBSTITUTES));
      this.maxReplacementsPerLine = Math.max(1, Math.trunc(Number(options.maxReplacementsPerLine) || DEFAULT_MAX_REPLACEMENTS_PER_LINE));
      this.maxOutputCharacters = Math.max(1024, Math.trunc(Number(options.maxOutputCharacters) || DEFAULT_MAX_OUTPUT_CHARACTERS));
      this.enabled = options.enabled !== false;
      this.substitutes = new Map();
      this.ordered = [];
      this.dispatch = buildSubstituteDispatch([]);
      this.revision = 0;
      if (Array.isArray(options.substitutes)) this.replaceAll(options.substitutes);
      else if (options && typeof options === 'object' && Array.isArray(options.definitions)) this.restore(options);
    }

    refreshOrder() {
      this.revision += 1;
      this.ordered = [...this.substitutes.values()]
        .sort((left, right) => left.priority - right.priority || left.pattern.localeCompare(right.pattern));
      this.dispatch = buildSubstituteDispatch(this.ordered);
    }

    define(patternValue, replacementValue, priorityValue = DEFAULT_SUBSTITUTE_PRIORITY, classNameValue = '') {
      const pattern = normalizeSubstitutePattern(patternValue);
      const replacement = normalizeSubstituteReplacement(replacementValue);
      const matcher = compileSubstitutePattern(pattern);
      const className = normalizeClassName(classNameValue);
      if (!pattern || !matcher) return null;
      if (!this.substitutes.has(pattern) && this.substitutes.size >= this.maxSubstitutes) return null;

      const existing = this.substitutes.get(pattern);
      const record = Object.freeze({
        pattern,
        replacement,
        priority: normalizeSubstitutePriority(priorityValue),
        enabled: existing?.enabled !== false,
        className,
        matcher,
        prefilter: analyzeSubstitutePrefilter(pattern),
        replacementTokens: compileReplacementTemplate(replacement)
      });
      this.substitutes.set(pattern, record);
      this.refreshOrder();
      return detachedRecord(record);
    }

    get(patternValue) {
      const record = this.substitutes.get(normalizeSubstitutePattern(patternValue));
      return record ? detachedRecord(record) : null;
    }

    list() {
      return this.ordered.map(detachedRecord);
    }

    delete(patternValue) {
      const deleted = this.substitutes.delete(normalizeSubstitutePattern(patternValue));
      if (deleted) this.refreshOrder();
      return deleted;
    }

    setSubstituteEnabled(patternValue, enabled) {
      const pattern = normalizeSubstitutePattern(patternValue);
      const current = this.substitutes.get(pattern);
      if (!current) return null;
      const record = Object.freeze({ ...current, enabled: Boolean(enabled) });
      this.substitutes.set(pattern, record);
      this.refreshOrder();
      return detachedRecord(record);
    }

    setEnabled(enabled) {
      this.enabled = Boolean(enabled);
      return this.enabled;
    }

    clear() {
      this.substitutes.clear();
      this.refreshOrder();
    }

    hasEnabledDefinitions() {
      return this.enabled && this.ordered.some((record) => record.enabled);
    }

    replaceAll(records = []) {
      const source = Array.isArray(records) ? records.slice(0, this.maxSubstitutes * 4) : [];
      const next = new Map();
      for (const raw of source) {
        const record = raw && typeof raw === 'object' ? raw : {};
        const pattern = normalizeSubstitutePattern(record.pattern);
        const replacement = normalizeSubstituteReplacement(record.replacement);
        const matcher = compileSubstitutePattern(pattern);
        const className = normalizeClassName(record.className);
        if (!pattern || !matcher) continue;
        if (!next.has(pattern) && next.size >= this.maxSubstitutes) continue;
        next.set(pattern, Object.freeze({
          pattern,
          replacement,
          priority: normalizeSubstitutePriority(record.priority),
          enabled: record.enabled !== false,
          className,
          matcher,
          prefilter: analyzeSubstitutePrefilter(pattern),
          replacementTokens: compileReplacementTemplate(replacement)
        }));
      }
      this.substitutes = next;
      this.refreshOrder();
      return this.list();
    }

    restore(snapshot = {}) {
      const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
      this.enabled = source.enabled !== false;
      this.replaceAll(source.definitions || source.substitutes || []);
      return this.snapshot();
    }

    snapshot() {
      return { enabled: this.enabled, definitions: this.list() };
    }

    findMatches(lineValue) {
      const line = String(lineValue ?? '').replaceAll('\r', '');
      if (!this.hasEnabledDefinitions() || !line) return [];
      const candidates = [];

      for (const record of substituteCandidateRecords(line, this.dispatch)) {
        if (!record.enabled) continue;
        if (!substitutePrefilterMatches(line, record.prefilter)) continue;
        record.matcher.lastIndex = 0;
        let match = record.matcher.exec(line);
        while (match && candidates.length < this.maxReplacementsPerLine * 4) {
          const text = String(match[0] || '');
          if (text.length > 0) {
            const captures = Object.create(null);
            captures[0] = Object.freeze({ start: match.index, end: match.index + text.length });
            for (let captureIndex = 1; captureIndex <= 9; captureIndex += 1) {
              const range = match.indices?.groups?.[`capture${captureIndex}`];
              captures[captureIndex] = Array.isArray(range)
                ? Object.freeze({ start: range[0], end: range[1] })
                : null;
            }
            candidates.push(Object.freeze({
              start: match.index,
              end: match.index + text.length,
              priority: record.priority,
              pattern: record.pattern,
              replacementTokens: record.replacementTokens,
              captures
            }));
          }
          if (record.matcher.lastIndex === match.index) record.matcher.lastIndex += 1;
          match = record.matcher.exec(line);
        }
      }

      const selected = [];
      const byPriority = candidates.sort((left, right) =>
        left.priority - right.priority || left.start - right.start || right.end - left.end || left.pattern.localeCompare(right.pattern)
      );
      for (const candidate of byPriority) {
        if (selected.length >= this.maxReplacementsPerLine) break;
        if (selected.some((match) => candidate.start < match.end && candidate.end > match.start)) continue;
        selected.push(candidate);
      }
      return selected.sort((left, right) => left.start - right.start || left.priority - right.priority);
    }
  }

  function styleKey(run = {}) {
    const style = run.style || {};
    return `${String(run.link || '')}|${['fg','bg','fgBasicIndex','bgBasicIndex','bold','dim','italic','underline','inverse']
      .map((key) => `${key}:${String(style[key] ?? '')}`).join('|')}`;
  }

  function appendRun(output, candidate, limit) {
    let text = String(candidate?.text || '');
    if (!text || limit.remaining <= 0) return;
    if (text.length > limit.remaining) text = text.slice(0, limit.remaining);
    limit.remaining -= text.length;
    const run = {
      ...candidate,
      text,
      style: candidate?.style ? { ...candidate.style } : null,
      link: String(candidate?.link || '') || null
    };
    const previous = output.at(-1);
    if (previous && styleKey(previous) === styleKey(run)) previous.text += run.text;
    else output.push(run);
  }

  function sourceSlices(runs, startValue, endValue) {
    const start = Math.max(0, Number(startValue) || 0);
    const end = Math.max(start, Number(endValue) || 0);
    const output = [];
    let offset = 0;
    for (const raw of runs) {
      const text = String(raw?.text || '');
      const runStart = offset;
      const runEnd = offset + text.length;
      offset = runEnd;
      if (end <= runStart) break;
      if (start >= runEnd) continue;
      const localStart = Math.max(0, start - runStart);
      const localEnd = Math.min(text.length, end - runStart);
      if (localEnd <= localStart) continue;
      output.push({
        ...raw,
        text: text.slice(localStart, localEnd),
        style: raw?.style ? { ...raw.style } : null,
        link: String(raw?.link || '') || null
      });
    }
    return output;
  }

  function metadataAt(runs, indexValue) {
    const index = Math.max(0, Number(indexValue) || 0);
    let offset = 0;
    for (const raw of runs) {
      const text = String(raw?.text || '');
      if (index < offset + text.length) {
        return {
          style: raw?.style ? { ...raw.style } : null,
          link: String(raw?.link || '') || null
        };
      }
      offset += text.length;
    }
    const last = runs.at(-1) || {};
    return {
      style: last?.style ? { ...last.style } : null,
      link: String(last?.link || '') || null
    };
  }

  function applySubstitutionsToRuns(runsValue, engineValue) {
    const runs = Array.isArray(runsValue) ? runsValue : [];
    const engine = engineValue instanceof SubstituteEngine
      ? engineValue
      : new SubstituteEngine(engineValue || {});
    if (!engine.hasEnabledDefinitions() || runs.length === 0) return runs;

    const text = runs.map((run) => String(run?.text || '')).join('');
    const matches = engine.findMatches(text);
    if (matches.length === 0) return runs;

    const output = [];
    const limit = { remaining: engine.maxOutputCharacters };
    let cursor = 0;
    for (const match of matches) {
      for (const slice of sourceSlices(runs, cursor, match.start)) appendRun(output, slice, limit);
      const inherited = metadataAt(runs, match.start);
      for (const token of match.replacementTokens) {
        if (token.type === 'literal') {
          appendRun(output, { text: token.value, ...inherited }, limit);
          continue;
        }
        const range = match.captures[token.index];
        if (!range) continue;
        for (const slice of sourceSlices(runs, range.start, range.end)) appendRun(output, slice, limit);
      }
      cursor = match.end;
      if (limit.remaining <= 0) break;
    }
    if (limit.remaining > 0) {
      for (const slice of sourceSlices(runs, cursor, text.length)) appendRun(output, slice, limit);
    }
    return output;
  }

  return {
    SubstituteEngine,
    applySubstitutionsToRuns,
    compileSubstitutePattern,
    compileReplacementTemplate,
    normalizeSubstitutePattern,
    normalizeSubstituteReplacement,
    normalizeSubstitutePriority,
    DEFAULT_MAX_SUBSTITUTES,
    DEFAULT_SUBSTITUTE_PRIORITY,
    MIN_SUBSTITUTE_PRIORITY,
    MAX_SUBSTITUTE_PRIORITY,
    DEFAULT_MAX_REPLACEMENTS_PER_LINE,
    DEFAULT_MAX_OUTPUT_CHARACTERS
  };
});
