'use strict';

const { normalizeText } = require('./communications');
const { normalizeClassName } = require('./class-manager');
const { splitTopLevelCommands, normalizeClientCommandPrefix, DEFAULT_CLIENT_COMMAND_PREFIX } = require('./client-command-parser');
const { LITERAL_PERCENT_SENTINEL } = require('./variable-engine');

const ACTION_PATTERN_MAX = 512;
const ACTION_COMMAND_MAX = 4096;
const DEFAULT_MAX_ACTIONS = 1024;
const DEFAULT_ACTION_PRIORITY = 5;
const MIN_ACTION_PRIORITY = 1;
const MAX_ACTION_PRIORITY = 9;
const DEFAULT_MAX_LINE_LENGTH = 16384;
const DEFAULT_RATE_LIMIT = 32;
const DEFAULT_RATE_WINDOW_MS = 1000;
const DEFAULT_DUPLICATE_COOLDOWN_MS = 250;
const DEFAULT_NOTICE_INTERVAL_MS = 2000;
const DEFAULT_MAX_ACTION_COMMANDS = 64;

function normalizeActionPattern(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\r\n]+/gu, ' ')
    .trim()
    .slice(0, ACTION_PATTERN_MAX);
}

function normalizeActionCommand(value) {
  return String(value ?? '')
    .replace(/[\r\n]+/gu, ' ')
    .trim()
    .slice(0, ACTION_COMMAND_MAX);
}

function normalizeActionPriority(value, fallback = DEFAULT_ACTION_PRIORITY) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(MIN_ACTION_PRIORITY, Math.min(MAX_ACTION_PRIORITY, Math.trunc(number)));
}


function splitActionCommands(commandValue, options = {}) {
  const maximum = Math.max(
    1,
    Math.trunc(Number(options.maxCommands) || DEFAULT_MAX_ACTION_COMMANDS)
  );
  const result = splitTopLevelCommands(normalizeActionCommand(commandValue), {
    maxCommands: maximum,
    commandPrefix: options.commandPrefix,
    quoteAware: false
  });
  const errors = {
    empty: 'Action command list cannot be empty.',
    'too-many': `Actions may generate at most ${maximum} commands.`,
    'unmatched-closing-brace': 'Action command list has an unmatched closing brace.',
    'unfinished-escape': 'Action command list cannot end with an unfinished escape.',
    'unterminated-quote': 'Action command list has an unterminated quote.',
    'unterminated-brace': 'Action command list has an unterminated brace group.'
  };
  return {
    commands: result.commands,
    error: result.errorCode ? errors[result.errorCode] || 'Action command list is invalid.' : ''
  };
}

function escapeRegexCharacter(character) {
  return /[\\^$.*+?()[\]{}|]/u.test(character) ? `\\${character}` : character;
}

function captureWildcardSource(token, hasTrailingPattern) {
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

function caseAwareLiteral(character, ignoreCase) {
  if (ignoreCase && /^[A-Za-z]$/u.test(character)) {
    const lower = character.toLowerCase();
    const upper = character.toUpperCase();
    return lower === upper ? escapeRegexCharacter(character) : `[${lower}${upper}]`;
  }
  return escapeRegexCharacter(character);
}

function compileActionPattern(patternValue) {
  const pattern = normalizeActionPattern(patternValue);
  if (!pattern) return null;

  const anchoredStart = pattern.startsWith('^');
  const anchoredEnd = pattern.endsWith('$');
  const firstIndex = anchoredStart ? 1 : 0;
  const lastIndex = anchoredEnd ? pattern.length - 1 : pattern.length;
  let source = anchoredStart ? '^' : '';
  const seen = new Set();
  const captureIndexes = [];
  let nextAutomaticCapture = 1;
  let ignoreCase = false;

  const registerCapture = (position, token, hasTrailingPattern) => {
    if (position < 0 || position > 99) return null;
    const name = `capture${position}`;
    if (seen.has(position)) return `\\k<${name}>`;
    seen.add(position);
    captureIndexes.push(position);
    if (position > 0) nextAutomaticCapture = Math.max(nextAutomaticCapture, position + 1);
    return `(?<${name}>${captureWildcardSource(token, hasTrailingPattern)})`;
  };
  const nextUnnumberedCapture = () => {
    while (seen.has(nextAutomaticCapture) && nextAutomaticCapture <= 99) nextAutomaticCapture += 1;
    return nextAutomaticCapture <= 99 ? nextAutomaticCapture : -1;
  };

  for (let index = firstIndex; index < lastIndex;) {
    const character = pattern[index];
    const next = pattern[index + 1] || '';

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
    if (character === '%' && (next === 'i' || next === 'I')) {
      ignoreCase = next === 'i';
      index += 2;
      continue;
    }
    if (character === '%' && 'dDsSwW?*+.'.includes(next)) {
      const position = nextUnnumberedCapture();
      if (position < 1) return null;
      const tokenEnd = index + 2;
      source += registerCapture(position, next, tokenEnd < lastIndex);
      index = tokenEnd;
      continue;
    }
    if (character === '%') {
      const numbered = pattern.slice(index + 1, lastIndex).match(/^(?:[1-9][0-9]?|0)/u);
      if (numbered) {
        const position = Number(numbered[0]);
        const tokenEnd = index + 1 + numbered[0].length;
        source += registerCapture(position, '*', tokenEnd < lastIndex);
        index = tokenEnd;
        continue;
      }
    }

    source += caseAwareLiteral(character, ignoreCase);
    index += 1;
  }
  if (anchoredEnd) source += '$';

  try {
    const matcher = new RegExp(source, 'u');
    Object.defineProperty(matcher, 'nukeFireCaptureIndexes', {
      value: Object.freeze([...captureIndexes]),
      enumerable: false,
      configurable: false,
      writable: false
    });
    return matcher;
  } catch (_error) {
    return null;
  }
}


function analyzeActionPrefilter(patternValue) {
  const pattern = normalizeActionPattern(patternValue);
  if (!pattern) return Object.freeze({ anchoredStart: false, prefix: '', literal: '', ignoreCase: false });
  const anchoredStart = pattern.startsWith('^');
  const anchoredEnd = pattern.endsWith('$');
  const firstIndex = anchoredStart ? 1 : 0;
  const lastIndex = anchoredEnd ? pattern.length - 1 : pattern.length;
  let ignoreCase = false;
  let current = '';
  let currentIgnoreCase = false;
  let best = '';
  let bestIgnoreCase = false;
  let prefix = '';
  let prefixOpen = anchoredStart;

  const finish = () => {
    if (current.length > best.length) {
      best = current;
      bestIgnoreCase = currentIgnoreCase;
    }
    current = '';
  };

  for (let index = firstIndex; index < lastIndex;) {
    const character = pattern[index];
    const next = pattern[index + 1] || '';
    if (character === '\\' && next === '%') {
      if (!current) currentIgnoreCase = ignoreCase;
      if (currentIgnoreCase !== ignoreCase) finish(), currentIgnoreCase = ignoreCase;
      current += '%';
      if (prefixOpen && prefix.length < 3) prefix += '%';
      index += 2;
      continue;
    }
    if (character === '%' && next === '%') {
      if (!current) currentIgnoreCase = ignoreCase;
      if (currentIgnoreCase !== ignoreCase) finish(), currentIgnoreCase = ignoreCase;
      current += '%';
      if (prefixOpen && prefix.length < 3) prefix += '%';
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
    if (prefixOpen && prefix.length < 3) prefix += ignoreCase ? character.toLowerCase() : character;
    index += 1;
  }
  finish();
  return Object.freeze({ anchoredStart, prefix, literal: best, ignoreCase: bestIgnoreCase });
}

function substituteActionCommand(commandValue, matchedTextValue, capturesValue = {}, options = {}) {
  const command = normalizeActionCommand(commandValue);
  const matchedText = String(matchedTextValue ?? '');
  const captures = capturesValue && typeof capturesValue === 'object' ? capturesValue : {};

  return command.replace(/%%|%((?:[1-9][0-9]?|0))/gu, (match, digits) => {
    if (match === '%%') return options.preserveLiteralPercent === true
      ? LITERAL_PERCENT_SENTINEL
      : '%';
    if (digits === '0' && !Object.prototype.hasOwnProperty.call(captures, '0')) {
      return matchedText;
    }
    return String(captures[digits] ?? '');
  }).trim();
}

function detachedRecord(record) {
  return {
    pattern: record.pattern,
    command: record.command,
    priority: record.priority,
    enabled: record.enabled,
    scope: 'global',
    ...(record.className ? { className: record.className } : {})
  };
}

class ActionEngine {
  constructor(options = {}) {
    this.maxActions = Math.max(1, Math.trunc(Number(options.maxActions) || DEFAULT_MAX_ACTIONS));
    this.enabled = options.enabled !== false;
    this.commandPrefix = normalizeClientCommandPrefix(options.commandPrefix, DEFAULT_CLIENT_COMMAND_PREFIX);
    this.actions = new Map();
    this.ordered = [];
    this.actionAnchoredBuckets = new Map();
    this.actionFallback = [];
    this.actionHasInsensitivePrefilters = false;
    this.actionOrderRank = new Map();
    this.revision = 0;
    if (Array.isArray(options.actions)) this.replaceAll(options.actions);
  }

  setCommandPrefix(value) {
    this.commandPrefix = normalizeClientCommandPrefix(value, this.commandPrefix);
    return this.commandPrefix;
  }

  refreshOrder() {
    this.revision += 1;
    this.ordered = [...this.actions.values()]
      .sort((left, right) => left.priority - right.priority || left.pattern.localeCompare(right.pattern));
    this.actionAnchoredBuckets = new Map();
    this.actionFallback = [];
    this.actionHasInsensitivePrefilters = false;
    this.actionOrderRank = new Map();
    for (let index = 0; index < this.ordered.length; index += 1) {
      const record = this.ordered[index];
      this.actionOrderRank.set(record.pattern, index);
      const info = record.prefilter || analyzeActionPrefilter(record.pattern);
      if (info.ignoreCase && info.literal) this.actionHasInsensitivePrefilters = true;
      if (info.anchoredStart && info.prefix) {
        const bucket = this.actionAnchoredBuckets.get(info.prefix) || [];
        bucket.push(record);
        this.actionAnchoredBuckets.set(info.prefix, bucket);
      } else {
        this.actionFallback.push(record);
      }
    }
  }

  candidateActions(lineValue) {
    const line = String(lineValue ?? '');
    const lists = [];
    if (this.actionFallback.length) lists.push(this.actionFallback);
    for (let length = 1; length <= 3 && length <= line.length; length += 1) {
      const direct = this.actionAnchoredBuckets.get(line.slice(0, length));
      if (direct?.length) lists.push(direct);
      const folded = this.actionAnchoredBuckets.get(line.slice(0, length).toLowerCase());
      if (folded?.length && folded !== direct) lists.push(folded);
    }
    if (lists.length <= 1) return lists[0] || [];

    const offsets = new Array(lists.length).fill(0);
    const merged = [];
    const seen = new Set();
    while (true) {
      let best = null;
      let bestList = -1;
      let bestRank = Number.MAX_SAFE_INTEGER;
      for (let index = 0; index < lists.length; index += 1) {
        const record = lists[index][offsets[index]];
        if (!record) continue;
        const rank = this.actionOrderRank.get(record.pattern) ?? Number.MAX_SAFE_INTEGER;
        if (rank < bestRank) { best = record; bestList = index; bestRank = rank; }
      }
      if (!best) break;
      offsets[bestList] += 1;
      if (seen.has(best.pattern)) continue;
      seen.add(best.pattern);
      merged.push(best);
    }
    return merged;
  }

  actionPrefilterMatches(record, lineValue, foldedLineValue = '') {
    const info = record.prefilter || analyzeActionPrefilter(record.pattern);
    if (!info.literal) return true;
    if (info.anchoredStart && info.prefix) {
      const head = String(lineValue ?? '').slice(0, info.prefix.length);
      if (info.ignoreCase ? head.toLowerCase() !== info.prefix.toLowerCase() : head !== info.prefix) return false;
    }
    if (info.ignoreCase) return String(foldedLineValue || String(lineValue ?? '').toLowerCase()).includes(info.literal.toLowerCase());
    return String(lineValue ?? '').includes(info.literal);
  }

  define(patternValue, commandValue, priorityValue = DEFAULT_ACTION_PRIORITY, classNameValue = '') {
    const pattern = normalizeActionPattern(patternValue);
    const command = normalizeActionCommand(commandValue);
    const className = normalizeClassName(classNameValue);
    const matcher = compileActionPattern(pattern);
    const commandList = splitActionCommands(command, { commandPrefix: this.commandPrefix });
    if (!pattern || !command || !matcher || commandList.error) return null;
    if (!this.actions.has(pattern) && this.actions.size >= this.maxActions) return null;

    const existing = this.actions.get(pattern);
    const record = Object.freeze({
      pattern,
      command,
      priority: normalizeActionPriority(priorityValue),
      enabled: existing?.enabled !== false,
      className,
      matcher,
      prefilter: analyzeActionPrefilter(pattern),
      commandTemplates: Object.freeze([...commandList.commands])
    });
    this.actions.set(pattern, record);
    this.refreshOrder();
    return detachedRecord(record);
  }

  get(patternValue) {
    const record = this.actions.get(normalizeActionPattern(patternValue));
    return record ? detachedRecord(record) : null;
  }

  list() {
    return this.ordered.map(detachedRecord);
  }

  delete(patternValue) {
    const deleted = this.actions.delete(normalizeActionPattern(patternValue));
    if (deleted) this.refreshOrder();
    return deleted;
  }

  setActionEnabled(patternValue, enabled) {
    const pattern = normalizeActionPattern(patternValue);
    const current = this.actions.get(pattern);
    if (!current) return null;
    const record = Object.freeze({ ...current, enabled: Boolean(enabled) });
    this.actions.set(pattern, record);
    this.refreshOrder();
    return detachedRecord(record);
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    return this.enabled;
  }

  hasEnabledDefinitions() {
    return this.enabled && this.ordered.some((record) => record.enabled);
  }

  clear() {
    this.actions.clear();
    this.refreshOrder();
  }

  replaceAll(records = []) {
    const source = Array.isArray(records) ? records.slice(0, this.maxActions * 4) : [];
    const next = new Map();

    for (const raw of source) {
      const record = raw && typeof raw === 'object' ? raw : {};
      const pattern = normalizeActionPattern(record.pattern);
      const command = normalizeActionCommand(record.command);
      const className = normalizeClassName(record.className);
      const matcher = compileActionPattern(pattern);
      const commandList = splitActionCommands(command, { commandPrefix: this.commandPrefix });
      if (!pattern || !command || !matcher || commandList.error) continue;
      if (!next.has(pattern) && next.size >= this.maxActions) continue;
      next.set(pattern, Object.freeze({
        pattern,
        command,
        priority: normalizeActionPriority(record.priority),
        enabled: record.enabled !== false,
        className,
        matcher,
        prefilter: analyzeActionPrefilter(pattern),
        commandTemplates: Object.freeze([...commandList.commands])
      }));
    }

    this.actions = next;
    this.refreshOrder();
    return this.list();
  }

  restore(snapshot = {}) {
    const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
    this.enabled = source.enabled !== false;
    this.replaceAll(source.definitions || source.actions || []);
    return this.snapshot();
  }

  snapshot() {
    return {
      enabled: this.enabled,
      definitions: this.list()
    };
  }

  match(lineValue, options = {}) {
    const line = normalizeText(lineValue);
    if (!this.enabled || !line) {
      return { matched: false, line, action: null, captures: {}, command: '', commands: [], error: '' };
    }

    const foldedLine = this.actionHasInsensitivePrefilters ? line.toLowerCase() : '';
    for (const record of this.candidateActions(line)) {
      if (!record.enabled) continue;
      if (!this.actionPrefilterMatches(record, line, foldedLine)) continue;
      const match = record.matcher.exec(line);
      if (!match) continue;
      const captures = {};
      const captureIndexes = Array.isArray(record.matcher.nukeFireCaptureIndexes)
        ? record.matcher.nukeFireCaptureIndexes
        : [];
      for (const position of captureIndexes) {
        captures[String(position)] = match.groups?.[`capture${position}`] ?? '';
      }
      const matchedText = match[0] || '';
      const commands = record.commandTemplates
        .map((template) => substituteActionCommand(template, matchedText, captures, {
          preserveLiteralPercent: options.preserveLiteralPercent === true
        }))
        .map((command) => command.trim())
        .filter(Boolean);
      const command = commands.join('; ');
      return {
        matched: true,
        line,
        action: detachedRecord(record),
        captures,
        command,
        commands,
        error: commands.length > 0 ? '' : 'Action expansion stopped: every generated command was empty.'
      };
    }

    return { matched: false, line, action: null, captures: {}, command: '', commands: [], error: '' };
  }
}

class ActionLineBuffer {
  constructor(options = {}) {
    this.maxLineLength = Math.max(256, Math.trunc(Number(options.maxLineLength) || DEFAULT_MAX_LINE_LENGTH));
    this.carry = '';
    this.discarding = false;
  }

  reset() {
    this.carry = '';
    this.discarding = false;
  }

  push(value) {
    const raw = String(value ?? '');
    const input = raw.includes('\r') ? raw.replaceAll('\r', '') : raw;
    const lines = [];
    let cursor = 0;

    while (cursor < input.length) {
      if (this.discarding) {
        const newline = input.indexOf('\n', cursor);
        if (newline === -1) break;
        this.carry = '';
        this.discarding = false;
        cursor = newline + 1;
        continue;
      }

      const newline = input.indexOf('\n', cursor);
      const end = newline === -1 ? input.length : newline;
      const segmentLength = end - cursor;
      if (this.carry.length + segmentLength > this.maxLineLength) {
        this.carry = '';
        if (newline === -1) {
          this.discarding = true;
          break;
        }
        cursor = newline + 1;
        continue;
      }

      if (segmentLength > 0) this.carry += input.slice(cursor, end);
      if (newline === -1) break;
      lines.push(this.carry);
      this.carry = '';
      cursor = newline + 1;
    }

    return lines;
  }
}

class ActionRateLimiter {
  constructor(options = {}) {
    this.maxTriggers = Math.max(1, Math.trunc(Number(options.maxTriggers) || DEFAULT_RATE_LIMIT));
    this.windowMs = Math.max(100, Math.trunc(Number(options.windowMs) || DEFAULT_RATE_WINDOW_MS));
    this.duplicateCooldownMs = Math.max(0, Math.trunc(Number(options.duplicateCooldownMs) || DEFAULT_DUPLICATE_COOLDOWN_MS));
    this.noticeIntervalMs = Math.max(250, Math.trunc(Number(options.noticeIntervalMs) || DEFAULT_NOTICE_INTERVAL_MS));
    this.timestamps = [];
    this.lastMatches = new Map();
    this.lastNoticeAt = 0;
  }

  reset() {
    this.timestamps = [];
    this.lastMatches.clear();
    this.lastNoticeAt = 0;
  }

  allow(actionValue, lineValue, nowValue = Date.now()) {
    return this.allowCommands(actionValue, lineValue, 1, nowValue);
  }

  allowCommands(actionValue, lineValue, commandCountValue = 1, nowValue = Date.now()) {
    const now = Number(nowValue) || Date.now();
    const commandCount = Math.max(1, Math.trunc(Number(commandCountValue) || 1));
    this.timestamps = this.timestamps.filter((timestamp) => now - timestamp < this.windowMs);

    const pattern = normalizeActionPattern(actionValue?.pattern);
    const key = `${pattern}\u0000${String(lineValue ?? '')}`;
    const previous = this.lastMatches.get(key);
    if (Number.isFinite(previous) && now - previous < this.duplicateCooldownMs) {
      return { allowed: false, reason: 'duplicate', notify: false };
    }

    if (commandCount > this.maxTriggers || this.timestamps.length + commandCount > this.maxTriggers) {
      const notify = now - this.lastNoticeAt >= this.noticeIntervalMs;
      if (notify) this.lastNoticeAt = now;
      return { allowed: false, reason: 'rate-limit', notify };
    }

    for (let index = 0; index < commandCount; index += 1) this.timestamps.push(now);
    this.lastMatches.set(key, now);
    if (this.lastMatches.size > this.maxTriggers * 8) {
      for (const [matchKey, timestamp] of this.lastMatches) {
        if (now - timestamp >= this.windowMs) this.lastMatches.delete(matchKey);
      }
    }
    return { allowed: true, reason: '', notify: false };
  }
}

module.exports = {
  ActionEngine,
  ActionLineBuffer,
  ActionRateLimiter,
  normalizeActionPattern,
  normalizeActionCommand,
  normalizeActionPriority,
  splitActionCommands,
  compileActionPattern,
  substituteActionCommand,
  ACTION_PATTERN_MAX,
  ACTION_COMMAND_MAX,
  DEFAULT_MAX_ACTIONS,
  DEFAULT_ACTION_PRIORITY,
  MIN_ACTION_PRIORITY,
  MAX_ACTION_PRIORITY,
  DEFAULT_MAX_LINE_LENGTH,
  DEFAULT_RATE_LIMIT,
  DEFAULT_RATE_WINDOW_MS,
  DEFAULT_DUPLICATE_COOLDOWN_MS,
  DEFAULT_MAX_ACTION_COMMANDS
};
