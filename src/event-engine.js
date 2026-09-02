'use strict';

const { compileActionPattern } = require('./action-engine');

const DEFAULT_MAX_EVENTS = 128;
const MAX_EVENT_NAME = 160;
const MAX_EVENT_COMMAND = 8192;
const SUPPORTED_EVENT_NAMES = Object.freeze([
  'SESSION CONNECTED',
  'SESSION ACTIVATED',
  'SESSION DEACTIVATED',
  'SESSION DISCONNECTED',
  'SESSION TIMED OUT',
  'RECEIVED INPUT',
  'RECEIVED LINE',
  'RECEIVED OUTPUT',
  'RECEIVED PROMPT',
  'SEND OUTPUT',
  'SECOND',
  'MINUTE',
  'HOUR',
  'DAY',
  'WEEK',
  'MONTH',
  'YEAR',
  'PROGRAM START',
  'PROGRAM TERMINATION',
  'SCREEN RESIZE',
  'END OF PATH',
  'MAP ENTER MAP',
  'MAP ENTER ROOM',
  'MAP EXIT MAP',
  'MAP EXIT ROOM',
  'IAC WILL GMCP'
]);
const SUPPORTED_EVENT_SET = new Set(SUPPORTED_EVENT_NAMES);
const SUPPORTED_EVENT_PREFIXES = Object.freeze(['IAC ', 'VARIABLE UPDATE ', 'MAP ENTER ROOM ', 'MAP EXIT ROOM ', 'SECOND ', 'MINUTE ', 'HOUR ', 'DAY ', 'WEEK ', 'MONTH ', 'YEAR ', 'DATE ', 'TIME ']);

function normalizeEventName(value) {
  const source = String(value || '').normalize('NFKC').trim().toUpperCase().replace(/\s+/gu, ' ');
  if (!source || source.length > MAX_EVENT_NAME) return '';
  return /^[A-Z0-9%][A-Z0-9% _.:\-]*$/u.test(source) ? source : '';
}

function isSupportedEventName(value) {
  const name = normalizeEventName(value);
  if (!name) return false;
  return SUPPORTED_EVENT_SET.has(name) || SUPPORTED_EVENT_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function normalizeEventCommand(value) {
  const source = String(value || '').normalize('NFKC').replace(/[\u0000\u0008\u000B\u000C\u007F]/gu, '').trim();
  return source && source.length <= MAX_EVENT_COMMAND ? source : '';
}

function eventMatcher(name) {
  if (!/%(?:\*|(?:[0-9]{1,2}))/u.test(name)) return null;
  return compileActionPattern(`^${name}$`);
}

function detached(record) {
  return {
    name: record.name,
    command: record.command,
    enabled: record.enabled !== false,
    scope: 'global',
    ...(record.className ? { className: record.className } : {})
  };
}

class EventEngine {
  constructor(options = {}) {
    this.maximum = Math.max(1, Number(options.maximum) || DEFAULT_MAX_EVENTS);
    this.definitions = new Map();
    this.enabled = options.enabled !== false;
    this.revision = 0;
    if (options.events) this.restore(options.events);
  }
  define(nameValue, commandValue, classNameValue = '') {
    const name = normalizeEventName(nameValue);
    const command = normalizeEventCommand(commandValue);
    if (!name || !isSupportedEventName(name) || !command) return null;
    if (!this.definitions.has(name) && this.definitions.size >= this.maximum) return null;
    const className = String(classNameValue || '').normalize('NFKC').trim().toLowerCase();
    const record = {
      name,
      command,
      enabled: true,
      scope: 'global',
      matcher: eventMatcher(name),
      ...(className && /^[a-z0-9][a-z0-9_-]{0,47}$/u.test(className) ? { className } : {})
    };
    this.definitions.set(name, record);
    this.revision += 1;
    return detached(record);
  }
  get(nameValue) {
    const record = this.definitions.get(normalizeEventName(nameValue));
    return record ? detached(record) : null;
  }
  match(eventNameValue) {
    if (this.enabled === false) return null;
    const eventName = normalizeEventName(eventNameValue);
    if (!eventName) return null;
    for (const record of this.definitions.values()) {
      if (record.enabled === false) continue;
      if (!record.matcher) {
        if (record.name === eventName) return { record: detached(record), captures: {}, matchedText: eventName };
        continue;
      }
      const match = record.matcher.exec(eventName);
      if (!match) continue;
      const captures = {};
      for (const index of record.matcher.nukeFireCaptureIndexes || []) {
        captures[index] = String(match.groups?.[`capture${index}`] ?? '');
      }
      return { record: detached(record), captures, matchedText: eventName };
    }
    return null;
  }
  remove(nameValue) {
    const deleted = this.definitions.delete(normalizeEventName(nameValue));
    if (deleted) this.revision += 1;
    return deleted;
  }
  list() { return [...this.definitions.values()].map(detached).sort((a,b) => a.name.localeCompare(b.name)); }
  clear() {
    const count = this.definitions.size;
    this.definitions.clear();
    if (count > 0) this.revision += 1;
    return count;
  }
  snapshot() { return { enabled: this.enabled !== false, definitions: this.list() }; }
  restore(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    this.enabled = source.enabled !== false;
    this.definitions.clear();
    for (const raw of Array.isArray(source.definitions) ? source.definitions : []) {
      const record = this.define(raw?.name, raw?.command, raw?.className);
      if (record && raw?.enabled === false) this.definitions.get(record.name).enabled = false;
    }
    this.revision += 1;
    return this.snapshot();
  }
}

module.exports = {
  EventEngine,
  normalizeEventName,
  normalizeEventCommand,
  isSupportedEventName,
  SUPPORTED_EVENT_NAMES,
  SUPPORTED_EVENT_PREFIXES,
  DEFAULT_MAX_EVENTS
};
