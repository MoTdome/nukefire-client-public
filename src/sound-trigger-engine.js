(function attachSoundTriggerEngine(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireSoundTriggers = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createSoundTriggerApi() {
  'use strict';

  const MAX_SOUND_TRIGGERS = 256;
  const MAX_PATTERN_LENGTH = 512;
  const MAX_TRIGGER_ID_LENGTH = 80;
  const MIN_COOLDOWN_MS = 0;
  const MAX_COOLDOWN_MS = 10000;
  const DEFAULT_COOLDOWN_MS = 100;
  const DEFAULT_MAX_LINE_LENGTH = 16384;
  const AUDIO_CUE_IDS = Object.freeze(['hit', 'miss', 'incoming', 'critical', 'kill', 'danger']);
  const AUDIO_CUE_ID_SET = new Set(AUDIO_CUE_IDS);
  const DEFAULT_SOUND_TRIGGER_SETTINGS = Object.freeze({
    enabled: true,
    definitions: Object.freeze([])
  });

  function normalizeText(value, maximum = MAX_PATTERN_LENGTH) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\r\n]+/gu, ' ')
      .trim()
      .slice(0, maximum);
  }

  function normalizeLine(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .replaceAll('\r', '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, '')
      .trim();
  }

  function normalizeTriggerId(value, fallback = '') {
    const normalized = String(value || '')
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .slice(0, MAX_TRIGGER_ID_LENGTH);
    return normalized || fallback;
  }

  function normalizeCueId(value) {
    const cueId = String(value || '').trim().toLowerCase();
    return AUDIO_CUE_ID_SET.has(cueId) ? cueId : '';
  }

  function normalizeCooldownMs(value, fallback = DEFAULT_COOLDOWN_MS) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(MAX_COOLDOWN_MS, Math.max(MIN_COOLDOWN_MS, Math.trunc(numeric)));
  }

  function escapeRegexCharacter(character) {
    return /[\\^$.*+?()[\]{}|]/u.test(character) ? `\\${character}` : character;
  }

  function captureWildcardSource(hasTrailingPattern) {
    return hasTrailingPattern ? '.*?' : '.*';
  }

  // Match the familiar TinTin/NukeFire Action pattern shape without executing anything.
  // ^ and $ anchor; %1..%99 and %* are wildcards; %% and \% are literal percent signs.
  function compileSoundTriggerPattern(patternValue) {
    const pattern = normalizeText(patternValue);
    if (!pattern) return null;

    const anchoredStart = pattern.startsWith('^');
    const anchoredEnd = pattern.endsWith('$');
    const firstIndex = anchoredStart ? 1 : 0;
    const lastIndex = anchoredEnd ? pattern.length - 1 : pattern.length;
    let source = anchoredStart ? '^' : '';
    const seen = new Set();
    let nextAutomaticCapture = 1;

    const registerCapture = (position, hasTrailingPattern) => {
      if (position < 0 || position > 99) return null;
      const name = `capture${position}`;
      if (seen.has(position)) return `\\k<${name}>`;
      seen.add(position);
      if (position > 0) nextAutomaticCapture = Math.max(nextAutomaticCapture, position + 1);
      return `(?<${name}>${captureWildcardSource(hasTrailingPattern)})`;
    };

    const nextUnnumberedCapture = () => {
      while (seen.has(nextAutomaticCapture) && nextAutomaticCapture <= 99) nextAutomaticCapture += 1;
      return nextAutomaticCapture <= 99 ? nextAutomaticCapture : -1;
    };

    for (let index = firstIndex; index < lastIndex;) {
      const character = pattern[index];
      const next = pattern[index + 1];
      if (character === '\\' && next === '%') {
        source += '%';
        index += 2;
        continue;
      }
      if (character === '%' && next === '%') {
        source += '%';
        index += 2;
        continue;
      }
      if (character === '%' && next === '*') {
        const position = nextUnnumberedCapture();
        if (position < 1) return null;
        const tokenEnd = index + 2;
        source += registerCapture(position, tokenEnd < lastIndex);
        index = tokenEnd;
        continue;
      }
      if (character === '%') {
        const numbered = pattern.slice(index + 1, lastIndex).match(/^(?:[1-9][0-9]?|0)/u);
        if (numbered) {
          const position = Number(numbered[0]);
          const tokenEnd = index + 1 + numbered[0].length;
          source += registerCapture(position, tokenEnd < lastIndex);
          index = tokenEnd;
          continue;
        }
      }
      source += escapeRegexCharacter(character);
      index += 1;
    }
    if (anchoredEnd) source += '$';
    try {
      return new RegExp(source, 'u');
    } catch (_error) {
      return null;
    }
  }

  function normalizeSoundTrigger(recordValue = {}, index = 0) {
    const source = recordValue && typeof recordValue === 'object' ? recordValue : {};
    const pattern = normalizeText(source.pattern);
    const cueId = normalizeCueId(source.cueId || source.cue);
    const matcher = compileSoundTriggerPattern(pattern);
    if (!pattern || !cueId || !matcher) return null;
    const fallback = `sound-trigger-${Math.max(1, Number(index) + 1)}`;
    return {
      id: normalizeTriggerId(source.id, fallback),
      pattern,
      cueId,
      enabled: source.enabled !== false,
      suppressSelfVoice: source.suppressSelfVoice === true,
      cooldownMs: normalizeCooldownMs(source.cooldownMs)
    };
  }

  function normalizeSoundTriggerSettings(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const candidates = Array.isArray(source.definitions)
      ? source.definitions.slice(0, MAX_SOUND_TRIGGERS * 4)
      : [];
    const definitions = [];
    const usedIds = new Set();
    const usedPatterns = new Set();
    for (let index = 0; index < candidates.length; index += 1) {
      const record = normalizeSoundTrigger(candidates[index], index);
      if (!record || usedPatterns.has(record.pattern)) continue;
      let id = record.id;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${record.id.slice(0, Math.max(1, MAX_TRIGGER_ID_LENGTH - 4))}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(id);
      usedPatterns.add(record.pattern);
      definitions.push({ ...record, id });
      if (definitions.length >= MAX_SOUND_TRIGGERS) break;
    }
    return { enabled: source.enabled !== false, definitions };
  }

  function detached(record) {
    return {
      id: record.id,
      pattern: record.pattern,
      cueId: record.cueId,
      enabled: record.enabled,
      suppressSelfVoice: record.suppressSelfVoice,
      cooldownMs: record.cooldownMs
    };
  }

  class SoundTriggerEngine {
    constructor(options = {}) {
      this.clock = typeof options.clock === 'function' ? options.clock : () => Date.now();
      this.enabled = true;
      this.records = [];
      this.carryBySession = new Map();
      this.discardingBySession = new Set();
      this.lastCueAt = new Map();
      this.maxLineLength = Math.max(256, Math.trunc(Number(options.maxLineLength) || DEFAULT_MAX_LINE_LENGTH));
      this.restore(options.settings || options);
    }

    restore(input = {}) {
      const normalized = normalizeSoundTriggerSettings(input);
      this.enabled = normalized.enabled;
      this.records = normalized.definitions.map((record) => Object.freeze({
        ...record,
        matcher: compileSoundTriggerPattern(record.pattern)
      }));
      this.clearRuntime();
      return this.snapshot();
    }

    snapshot() {
      return { enabled: this.enabled, definitions: this.records.map(detached) };
    }

    list() {
      return this.records.map(detached);
    }

    setEnabled(value) {
      this.enabled = value !== false;
      return this.enabled;
    }

    hasEnabledDefinitions() {
      return this.enabled && this.records.some((record) => record.enabled !== false && record.matcher);
    }

    clearRuntime() {
      this.carryBySession.clear();
      this.discardingBySession.clear();
      this.lastCueAt.clear();
    }

    resetSession(sessionIdValue) {
      const sessionId = String(sessionIdValue || 'main');
      this.carryBySession.delete(sessionId);
      this.discardingBySession.delete(sessionId);
      for (const key of [...this.lastCueAt.keys()]) {
        if (key.startsWith(`${sessionId}\u0000`)) this.lastCueAt.delete(key);
      }
    }

    matchLine(lineValue) {
      const line = normalizeLine(lineValue);
      if (!this.enabled || !line) return { matched: false, line, trigger: null };
      for (const record of this.records) {
        if (record.enabled === false || !record.matcher) continue;
        record.matcher.lastIndex = 0;
        if (record.matcher.test(line)) return { matched: true, line, trigger: detached(record) };
      }
      return { matched: false, line, trigger: null };
    }

    routeLine(sessionIdValue, lineValue, options = {}) {
      const sessionId = String(sessionIdValue || 'main');
      const match = this.matchLine(lineValue);
      if (!match.matched) return { ...match, played: false, cooldownBlocked: false, suppressSelfVoice: false };
      const trigger = match.trigger;
      const now = Number(options.now ?? this.clock()) || 0;
      const key = `${sessionId}\u0000${trigger.id}`;
      const last = this.lastCueAt.get(key);
      const cooldownBlocked = Number.isFinite(last) && now - last < trigger.cooldownMs;
      let played = false;
      if (!cooldownBlocked && typeof options.playCue === 'function') {
        played = options.playCue(trigger.cueId, trigger, match.line) === true;
        this.lastCueAt.set(key, now);
      } else if (!cooldownBlocked) {
        this.lastCueAt.set(key, now);
      }
      return {
        ...match,
        played,
        cooldownBlocked,
        suppressSelfVoice: trigger.suppressSelfVoice === true
      };
    }

    processChunk(sessionIdValue, value, options = {}) {
      const sessionId = String(sessionIdValue || 'main');
      const raw = String(value ?? '');
      const input = raw.includes('\r') ? raw.replaceAll('\r', '') : raw;
      let carry = this.carryBySession.get(sessionId) || '';
      let discarding = this.discardingBySession.has(sessionId);
      let speechText = '';
      const events = [];
      let cursor = 0;

      const commit = () => {
        const routed = this.routeLine(sessionId, carry, options);
        events.push(routed);
        if (!routed.suppressSelfVoice) speechText += `${carry}\n`;
        carry = '';
      };

      while (cursor < input.length) {
        if (discarding) {
          const newline = input.indexOf('\n', cursor);
          if (newline === -1) break;
          carry = '';
          discarding = false;
          cursor = newline + 1;
          continue;
        }

        const newline = input.indexOf('\n', cursor);
        const end = newline === -1 ? input.length : newline;
        const segmentLength = end - cursor;
        if (carry.length + segmentLength > this.maxLineLength) {
          carry = '';
          if (newline === -1) {
            discarding = true;
            break;
          }
          cursor = newline + 1;
          continue;
        }

        if (segmentLength > 0) carry += input.slice(cursor, end);
        if (newline === -1) break;
        commit();
        cursor = newline + 1;
      }

      this.carryBySession.set(sessionId, carry);
      if (discarding) this.discardingBySession.add(sessionId);
      else this.discardingBySession.delete(sessionId);
      return { speechText, events };
    }

    commitBoundary(sessionIdValue, options = {}) {
      const sessionId = String(sessionIdValue || 'main');
      const carry = this.carryBySession.get(sessionId) || '';
      const discarding = this.discardingBySession.has(sessionId);
      this.carryBySession.delete(sessionId);
      this.discardingBySession.delete(sessionId);
      if (discarding || !carry) return { speechText: '', events: [] };
      const routed = this.routeLine(sessionId, carry, options);
      return {
        speechText: routed.suppressSelfVoice ? '' : `${carry}\n`,
        events: [routed]
      };
    }
  }

  return Object.freeze({
    MAX_SOUND_TRIGGERS,
    MAX_PATTERN_LENGTH,
    MIN_COOLDOWN_MS,
    MAX_COOLDOWN_MS,
    DEFAULT_COOLDOWN_MS,
    DEFAULT_MAX_LINE_LENGTH,
    AUDIO_CUE_IDS,
    DEFAULT_SOUND_TRIGGER_SETTINGS,
    normalizeTriggerId,
    normalizeCueId,
    normalizeCooldownMs,
    compileSoundTriggerPattern,
    normalizeSoundTrigger,
    normalizeSoundTriggerSettings,
    SoundTriggerEngine
  });
});
