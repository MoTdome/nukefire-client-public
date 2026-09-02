'use strict';

const { normalizeText } = require('./communications');
const { normalizeClassName } = require('./class-manager');
const {
  normalizeActionPattern,
  compileActionPattern,
  DEFAULT_MAX_ACTIONS,
  DEFAULT_MAX_LINE_LENGTH
} = require('./action-engine');

const DEFAULT_MAX_GAGS = DEFAULT_MAX_ACTIONS;

const GAG_PREFILTER_MAX_GRAM = 4;

function analyzeGagPrefilter(patternValue) {
  const pattern = normalizeActionPattern(patternValue);
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
    if (character === '\\' && next === '%') {
      if (!current) currentIgnoreCase = ignoreCase;
      if (currentIgnoreCase !== ignoreCase) { finish(); currentIgnoreCase = ignoreCase; }
      current += '%';
      if (prefixOpen) prefix += '%';
      index += 2;
      continue;
    }
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

function gagPrefilterGramCandidates(prefilter) {
  const output = [];
  const seen = new Set();
  for (const segment of prefilter?.segments || []) {
    const literal = segment.needle;
    if (!literal) continue;
    const size = Math.min(GAG_PREFILTER_MAX_GRAM, literal.length);
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

function buildGagDispatch(recordsValue) {
  const records = Array.isArray(recordsValue) ? recordsValue.filter((record) => record?.enabled) : [];
  const frequencies = new Map();
  const metadata = new Map();
  const fallback = [];
  const rank = new Map(records.map((record, index) => [record, index]));

  for (const record of records) {
    const candidates = gagPrefilterGramCandidates(record.prefilter);
    if (candidates.length === 0) {
      fallback.push(record);
      continue;
    }
    metadata.set(record, candidates);
    for (const candidate of candidates) frequencies.set(candidate.id, (frequencies.get(candidate.id) || 0) + 1);
  }

  const sensitive = Array.from({ length: GAG_PREFILTER_MAX_GRAM + 1 }, () => new Map());
  const insensitive = Array.from({ length: GAG_PREFILTER_MAX_GRAM + 1 }, () => new Map());
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

function gagCandidateRecords(line, dispatch) {
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

function gagPrefilterMatches(line, prefilter) {
  return !prefilter?.prefix || line.startsWith(prefilter.prefix);
}

function detachedRecord(record) {
  return {
    pattern: record.pattern,
    enabled: record.enabled,
    scope: 'global',
    ...(record.className ? { className: record.className } : {})
  };
}

class GagEngine {
  constructor(options = {}) {
    this.maxGags = Math.max(1, Math.trunc(Number(options.maxGags) || DEFAULT_MAX_GAGS));
    this.enabled = options.enabled !== false;
    this.gags = new Map();
    this.ordered = [];
    this.dispatch = buildGagDispatch([]);
    this.revision = 0;
    if (Array.isArray(options.gags)) this.replaceAll(options.gags);
  }

  refreshOrder() {
    this.revision += 1;
    this.ordered = [...this.gags.values()]
      .sort((left, right) => left.pattern.localeCompare(right.pattern));
    this.dispatch = buildGagDispatch(this.ordered);
  }

  define(patternValue, classNameValue = '') {
    const pattern = normalizeActionPattern(patternValue);
    const matcher = compileActionPattern(pattern);
    const className = normalizeClassName(classNameValue);
    if (!pattern || !matcher) return null;
    if (!this.gags.has(pattern) && this.gags.size >= this.maxGags) return null;

    const existing = this.gags.get(pattern);
    const record = Object.freeze({
      pattern,
      enabled: existing?.enabled !== false,
      className,
      matcher,
      prefilter: analyzeGagPrefilter(pattern)
    });
    this.gags.set(pattern, record);
    this.refreshOrder();
    return detachedRecord(record);
  }

  get(patternValue) {
    const record = this.gags.get(normalizeActionPattern(patternValue));
    return record ? detachedRecord(record) : null;
  }

  list() {
    return this.ordered.map(detachedRecord);
  }

  delete(patternValue) {
    const deleted = this.gags.delete(normalizeActionPattern(patternValue));
    if (deleted) this.refreshOrder();
    return deleted;
  }

  setGagEnabled(patternValue, enabled) {
    const pattern = normalizeActionPattern(patternValue);
    const current = this.gags.get(pattern);
    if (!current) return null;
    const record = Object.freeze({ ...current, enabled: Boolean(enabled) });
    this.gags.set(pattern, record);
    this.refreshOrder();
    return detachedRecord(record);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    return this.enabled;
  }

  clear() {
    this.gags.clear();
    this.refreshOrder();
  }

  hasEnabledDefinitions() {
    return this.enabled && this.ordered.some((record) => record.enabled);
  }

  replaceAll(records = []) {
    const source = Array.isArray(records) ? records.slice(0, this.maxGags * 4) : [];
    const next = new Map();

    for (const raw of source) {
      const record = raw && typeof raw === 'object' ? raw : {};
      const pattern = normalizeActionPattern(record.pattern);
      const matcher = compileActionPattern(pattern);
      const className = normalizeClassName(record.className);
      if (!pattern || !matcher) continue;
      if (!next.has(pattern) && next.size >= this.maxGags) continue;
      next.set(pattern, Object.freeze({
        pattern,
        enabled: record.enabled !== false,
        className,
        matcher,
        prefilter: analyzeGagPrefilter(pattern)
      }));
    }

    this.gags = next;
    this.refreshOrder();
    return this.list();
  }

  restore(snapshot = {}) {
    const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
    this.enabled = source.enabled !== false;
    this.replaceAll(source.definitions || source.gags || []);
    return this.snapshot();
  }

  snapshot() {
    return {
      enabled: this.enabled,
      definitions: this.list()
    };
  }

  match(lineValue) {
    const line = normalizeText(lineValue);
    if (!this.enabled || !line) {
      return { matched: false, line, gag: null, captures: {} };
    }

    for (const record of gagCandidateRecords(line, this.dispatch)) {
      if (!record.enabled) continue;
      if (!gagPrefilterMatches(line, record.prefilter)) continue;
      const match = record.matcher.exec(line);
      if (!match) continue;
      const captures = {};
      for (let index = 1; index <= 9; index += 1) {
        captures[String(index)] = match.groups?.[`capture${index}`] || '';
      }
      return {
        matched: true,
        line,
        gag: detachedRecord(record),
        captures
      };
    }

    return { matched: false, line, gag: null, captures: {} };
  }
}

class GagLineFilter {
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

  push(value, shouldGag) {
    const input = String(value ?? '');
    const matches = typeof shouldGag === 'function' ? shouldGag : () => false;
    let text = '';
    let gaggedText = '';
    let gagged = 0;
    let cursor = 0;

    while (cursor < input.length) {
      if (this.passthrough) {
        const newline = input.indexOf('\n', cursor);
        if (newline === -1) {
          text += input.slice(cursor);
          break;
        }
        text += input.slice(cursor, newline + 1);
        this.passthrough = false;
        cursor = newline + 1;
        continue;
      }

      const newline = input.indexOf('\n', cursor);
      const end = newline === -1 ? input.length : newline + 1;
      const charactersBeforeNewline = newline === -1 ? end - cursor : newline - cursor;
      if (this.carry.length + charactersBeforeNewline > this.maxLineLength) {
        // Gags fail open on malformed or unbounded server lines. Never hide or
        // retain unlimited output merely because a line did not terminate.
        const needed = this.maxLineLength + 1 - this.carry.length;
        this.carry += input.slice(cursor, cursor + needed);
        text += this.carry;
        this.carry = '';
        this.passthrough = true;
        cursor += needed;
        continue;
      }

      this.carry += input.slice(cursor, end);
      cursor = end;
      if (newline === -1) continue;

      const rawLine = this.carry.slice(0, -1).replace(/\r$/u, '');
      if (matches(rawLine)) {
        gagged += 1;
        gaggedText += this.carry;
      } else {
        text += this.carry;
      }
      this.carry = '';
    }

    return { text, gaggedText, gagged };
  }

  flush(shouldGag) {
    const matches = typeof shouldGag === 'function' ? shouldGag : () => false;
    if (this.passthrough) {
      this.passthrough = false;
      return { text: '', gaggedText: '', gagged: 0 };
    }
    if (!this.carry) return { text: '', gaggedText: '', gagged: 0 };

    const rawLine = this.carry.replace(/\r$/u, '');
    const matched = matches(rawLine);
    const text = matched ? '' : this.carry;
    const gaggedText = matched ? this.carry : '';
    const gagged = matched ? 1 : 0;
    this.carry = '';
    return { text, gaggedText, gagged };
  }}

module.exports = {
  GagEngine,
  GagLineFilter,
  DEFAULT_MAX_GAGS
};
