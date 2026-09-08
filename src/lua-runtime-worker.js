
'use strict';

const { parentPort } = require('node:worker_threads');
const wasmoonPath = String(process.env.NUKEFIRE_LUA_WASMOON_PATH || '').trim();
const { LuaFactory, LuaLibraries } = wasmoonPath ? require(wasmoonPath) : require('wasmoon');
const { compileLuaAutomationRegex, normalizeLuaAutomationPattern } = require('./lua-automation-pattern');

const DEFAULT_SOFT_TIMEOUT_MS = 50;
const DEFAULT_MEMORY_ALLOWANCE = 2 * 1024 * 1024;
const MAX_SCRIPT_BYTES = 64 * 1024;
const MAX_SESSION_ID = 96;
const MAX_ECHO_ARGS = 16;
const MAX_TEXT = 4096;
const MAX_SESSIONS = 16;
const MAX_COMMAND_BYTES = 4096;
const MAX_HOST_VARIABLE_RECORDS = 2048;
const VARIABLE_NAME_MAX = 96;
const VARIABLE_VALUE_MAX = 4096;
const FORBIDDEN_VARIABLE_NAMES = new Set(['__proto__', 'constructor', 'prototype']);
const FORBIDDEN_EXTENDED_NAME_CHARACTERS = /[\u0000-\u001F\u007F{}\\;$%]/u;
const TABLE_KEY_FORBIDDEN_CHARACTERS = /[\u0000-\u001F\u007F{}\[\]\\;$%]/u;
const MAX_TABLE_DEPTH = 4;
const MAX_TABLE_JSON_BYTES = 256 * 1024;
const MAX_GMCP_COMMAND_BYTES = 64 * 1024;
const MAX_LUA_AUTOMATIONS = 256;
const MAX_LUA_PANE_COMMAND_BYTES = 16 * 1024;
const LUA_PANE_ID = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/u;
const MAX_MANAGED_RECORDS = 512;
const MAX_MANAGED_JSON_BYTES = 64 * 1024;
const MAX_MANAGED_MODULE_BYTES = 64 * 1024;
const MAX_COMMAND_LINE_BYTES = 8192;
const MAX_LUA_OUTPUT_LINES = 256;
const MAX_LUA_OUTPUT_LINE_CHARS = 8192;

function parseVariablePath(value) {
  const source = String(value || '').normalize('NFKC').trim().toLowerCase();
  if (!source || source.length > VARIABLE_NAME_MAX) return null;
  const baseMatch = source.match(/^([a-z_][a-z0-9_]*)/u);
  if (!baseMatch) return null;
  const base = baseMatch[1];
  const keys = [];
  let index = base.length;
  while (index < source.length) {
    if (source[index] !== '[') return null;
    const closing = source.indexOf(']', index + 1);
    if (closing === -1) return null;
    const key = source.slice(index + 1, closing).trim();
    if (!key || TABLE_KEY_FORBIDDEN_CHARACTERS.test(key)) return null;
    keys.push(key);
    if (keys.length > MAX_TABLE_DEPTH) return null;
    index = closing + 1;
  }
  return { base, keys, name: `${base}${keys.map((key) => `[${key}]`).join('')}` };
}

function normalizeVariableName(value) {
  const source = String(value || '').normalize('NFKC').trim().toLowerCase();
  if (!source || source.length > VARIABLE_NAME_MAX) return '';
  if (FORBIDDEN_VARIABLE_NAMES.has(source)) return '';
  if (source.includes('[') || source.includes(']')) {
    const path = parseVariablePath(source);
    if (!path || FORBIDDEN_VARIABLE_NAMES.has(path.base)) return '';
    return path.name;
  }
  if (FORBIDDEN_EXTENDED_NAME_CHARACTERS.test(source)) return '';
  return source;
}

function normalizeVariableValue(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, '')
    .replace(/[\r\n]+/gu, ' ')
    .trim()
    .slice(0, VARIABLE_VALUE_MAX);
}

function normalizeCommand(value) {
  const command = String(value ?? '').normalize('NFKC');
  if (!command || /[\r\n\u0000]/u.test(command)) return '';
  if (Buffer.byteLength(command, 'utf8') > MAX_COMMAND_BYTES) return '';
  return command;
}

function normalizeCommandLine(value) {
  const text = String(value ?? '').normalize('NFKC').replace(/[\r\n\u0000]/gu, '');
  if (Buffer.byteLength(text, 'utf8') > MAX_COMMAND_LINE_BYTES) return '';
  return text;
}

function normalizeGmcpCommand(value) {
  const command = String(value ?? '').normalize('NFKC').trim();
  if (!command || /[\r\n\u0000]/u.test(command)) return '';
  if (Buffer.byteLength(command, 'utf8') > MAX_GMCP_COMMAND_BYTES) return '';
  if (!/^[A-Za-z][A-Za-z0-9_.-]{0,127}(?:\s+[\s\S]*)?$/u.test(command)) return '';
  return command;
}


function normalizeManagedKey(value) {
  const text = String(value || '').normalize('NFKC').trim();
  if (!text || text.length > 160 || /[\u0000-\u001F\u007F]/u.test(text) || FORBIDDEN_VARIABLE_NAMES.has(text)) return '';
  return text;
}

function normalizeManagedModuleName(value) {
  const source = String(value || '').normalize('NFKC').trim().replace(/\\/gu, '/');
  if (!source || source.length > 160 || source.startsWith('/') || source.endsWith('/') || source.includes('..')) return '';
  const parts = source.replace(/\//gu, '.').split('.').filter(Boolean);
  if (!parts.length || parts.length > 16 || parts.some((part) => !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(part))) return '';
  return parts.join('.');
}

function managedJsonRecordMap(recordsValue) {
  const records = Array.isArray(recordsValue) ? recordsValue.slice(0, MAX_MANAGED_RECORDS) : [];
  const output = new Map();
  for (const record of records) {
    const key = normalizeManagedKey(record?.key);
    const json = String(record?.json ?? '');
    if (!key || !json || Buffer.byteLength(json, 'utf8') > MAX_MANAGED_JSON_BYTES) continue;
    try { JSON.parse(json); } catch { continue; }
    output.set(key, json);
  }
  return output;
}

function managedModuleMap(recordsValue) {
  const records = Array.isArray(recordsValue) ? recordsValue.slice(0, 64) : [];
  const output = new Map();
  for (const record of records) {
    const name = normalizeManagedModuleName(record?.name);
    const source = String(record?.source ?? '');
    if (!name || !source || Buffer.byteLength(source, 'utf8') > MAX_MANAGED_MODULE_BYTES) continue;
    output.set(name, source);
  }
  return output;
}

function canonicalArrayKey(keyValue) {
  const key = String(keyValue ?? '');
  if (!/^[1-9]\d*$/u.test(key)) return 0;
  const numeric = Number(key);
  return Number.isSafeInteger(numeric) && numeric > 0 && String(numeric) === key ? numeric : 0;
}

function structuredNodeFromRecords(records, depth = 0) {
  if (!Array.isArray(records) || !records.length || depth > MAX_TABLE_DEPTH) return null;
  const children = new Map();
  for (const record of records) {
    const keys = Array.isArray(record?.keys) ? record.keys : [];
    if (!keys.length) continue;
    const key = String(keys[0] || '');
    if (!key) continue;
    const list = children.get(key) || [];
    list.push({ keys: keys.slice(1), value: record.value });
    children.set(key, list);
  }
  if (!children.size) return null;
  const keys = [...children.keys()];
  const numeric = keys.map(canonicalArrayKey);
  const isArray = numeric.every((value) => value > 0)
    && Math.max(...numeric) === keys.length
    && new Set(numeric).size === keys.length;
  const output = isArray ? [] : Object.create(null);
  for (const key of keys) {
    const group = children.get(key) || [];
    const leaf = group.find((entry) => entry.keys.length === 0);
    const descendants = group.filter((entry) => entry.keys.length > 0);
    const value = descendants.length ? structuredNodeFromRecords(descendants, depth + 1) : String(leaf?.value ?? '');
    if (isArray) output[canonicalArrayKey(key) - 1] = value;
    else output[key] = value;
  }
  return output;
}

function hostTableJson(variables, nameValue) {
  const baseName = normalizeVariableName(nameValue);
  const basePath = parseVariablePath(baseName);
  if (!baseName || !basePath) return false;
  const records = [];
  for (const [name, value] of variables || []) {
    const path = parseVariablePath(name);
    if (!path || path.base !== basePath.base || path.keys.length <= basePath.keys.length) continue;
    let same = true;
    for (let index = 0; index < basePath.keys.length; index += 1) {
      if (path.keys[index] !== basePath.keys[index]) { same = false; break; }
    }
    if (!same) continue;
    records.push({ keys: path.keys.slice(basePath.keys.length), value });
  }
  if (!records.length) return false;
  const tree = structuredNodeFromRecords(records);
  if (tree === null) return false;
  const json = JSON.stringify(tree);
  if (Buffer.byteLength(json, 'utf8') > MAX_TABLE_JSON_BYTES) return false;
  return json;
}

function flattenStructuredTable(baseNameValue, jsonValue) {
  const baseName = normalizeVariableName(baseNameValue);
  const basePath = parseVariablePath(baseName);
  const json = String(jsonValue ?? '');
  if (!baseName || !basePath || !json || Buffer.byteLength(json, 'utf8') > MAX_TABLE_JSON_BYTES) return null;
  let root;
  try { root = JSON.parse(json); } catch { return null; }
  if (!root || typeof root !== 'object' || Array.isArray(root) && root.length === 0) {
    if (root && typeof root === 'object') return [];
    return null;
  }
  const records = [];
  const walk = (value, keys, depth) => {
    if (records.length > MAX_HOST_VARIABLE_RECORDS || depth > MAX_TABLE_DEPTH) return false;
    if (value && typeof value === 'object') {
      const entries = Array.isArray(value)
        ? value.map((entry, index) => [String(index + 1), entry])
        : Object.entries(value);
      for (const [rawKey, child] of entries) {
        const key = String(rawKey ?? '').normalize('NFKC').trim().toLowerCase();
        if (!key || TABLE_KEY_FORBIDDEN_CHARACTERS.test(key)) return false;
        if (!walk(child, [...keys, key], depth + 1)) return false;
      }
      return true;
    }
    if (!keys.length || value === null || value === undefined) return false;
    const name = normalizeVariableName(`${baseName}${keys.map((key) => `[${key}]`).join('')}`);
    if (!name) return false;
    records.push({ name, value: normalizeVariableValue(value) });
    return records.length <= MAX_HOST_VARIABLE_RECORDS;
  };
  return walk(root, [], 0) ? records : null;
}

const sessions = new Map();
let factory = null;

function boundedText(value, limit = MAX_TEXT) {
  const text = String(value ?? '');
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
}

function boundedJsonObjectText(value, maximumBytes, fallback = '{}') {
  const text = String(value ?? '');
  if (!text || Buffer.byteLength(text, 'utf8') > Math.max(2, Number(maximumBytes) || 0)) return fallback;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
    return text;
  } catch {
    return fallback;
  }
}

function safePrimitive(value, textLimit = MAX_TEXT) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return boundedText(value, textLimit);
  return `[${Array.isArray(value) ? 'table' : typeof value}]`;
}

function normalizeSessionId(value) {
  const id = String(value || '').trim();
  if (!id || id.length > MAX_SESSION_ID || !/^[A-Za-z0-9_.:@-]+$/u.test(id)) {
    throw new Error('invalid Lua session id');
  }
  return id;
}

function parseLuaErrorLocation(messageValue) {
  const message = String(messageValue || '');
  const firstLine = message.split(/\r?\n/u, 1)[0] || '';
  const match = firstLine.match(/^(.+?):(\d+):\s*/u);
  if (!match) return { source: '', line: 0 };
  return {
    source: boundedText(match[1], 256),
    line: Math.max(0, Math.min(1000000, Math.trunc(Number(match[2]) || 0)))
  };
}

function normalizeChunkName(value, sessionId, fallback = 'command') {
  const raw = String(value || fallback).trim().replace(/[^A-Za-z0-9_.:@/\-]/gu, '_').slice(0, 180) || fallback;
  return `@NukeFire/${sessionId}/${raw}`;
}

function normalizeError(error) {
  const message = boundedText(error?.message || error || 'Lua execution failed');
  const lower = message.toLowerCase();
  let type = 'runtime';
  if (lower.includes('timeout')) type = 'timeout';
  else if (lower.includes('memory')) type = 'memory';
  else if (lower.includes('syntax')) type = 'syntax';
  const location = parseLuaErrorLocation(message);
  return {
    type,
    name: boundedText(error?.name || 'Error', 128),
    message,
    source: location.source,
    line: location.line,
    stack: boundedText(error?.stack || '', 8192)
  };
}

function postResponse(requestId, payload) {
  parentPort.postMessage({ type: 'response', requestId, ...payload });
}

function postEvent(event, payload = {}) {
  parentPort.postMessage({ type: 'event', event, ...payload });
}

function getFactory() {
  if (!factory) factory = new LuaFactory();
  return factory;
}

async function closeSession(sessionId) {
  const state = sessions.get(sessionId);
  if (!state) return false;
  sessions.delete(sessionId);
  try {
    state.engine.global.close();
  } catch {
    // Closing is best-effort in the throwaway spike worker.
  }
  return true;
}

async function createSession(rawSessionId, options = {}) {
  const sessionId = normalizeSessionId(rawSessionId);
  if (!sessions.has(sessionId) && sessions.size >= MAX_SESSIONS) {
    throw new Error(`Lua session limit exceeded (${MAX_SESSIONS})`);
  }
  await closeSession(sessionId);

  const engine = await getFactory().createEngine({
    openStandardLibs: false,
    injectObjects: false,
    enableProxy: false,
    traceAllocations: true
  });

  // Deny-by-default. Only the language foundation needed by ordinary scripts
  // is opened for the spike. In particular: no coroutine, io, os, debug or package.
  engine.global.loadLibrary(LuaLibraries.Base);
  engine.global.loadLibrary(LuaLibraries.Table);
  engine.global.loadLibrary(LuaLibraries.String);
  engine.global.loadLibrary(LuaLibraries.Math);
  engine.global.loadLibrary(LuaLibraries.UTF8);

  const hostState = {
    variables: new Map(),
    session: { id: sessionId, name: '', characterName: '', role: '', host: '', port: 0, connected: false },
    gmcpJson: '{}',
    gmcpMetaJson: '{}',
    msdpJson: '{}',
    storage: new Map(),
    settings: new Map(),
    modules: new Map(),
    commandLine: '',
    outputLines: [],
    currentLine: '',
    currentLineNumber: 1,
    requestId: 0
  };
  const postHostEvent = (event, payload = {}) => {
    postEvent(event, { requestId: hostState.requestId, sessionId, ...payload });
  };
  const hostEcho = (...args) => {
    postHostEvent('echo', {
      args: args.slice(0, MAX_ECHO_ARGS).map((value) => safePrimitive(value, 2048))
    });
    return undefined;
  };
  const hostSend = (value, showValue) => {
    const command = normalizeCommand(value);
    if (!command) return false;
    postHostEvent('send', { command, show: showValue !== false });
    return true;
  };
  const hostExecute = (value) => {
    const command = normalizeCommand(value);
    if (!command) return false;
    postHostEvent('execute-command', { command });
    return true;
  };
  const hostGetVariable = (nameValue) => {
    const name = normalizeVariableName(nameValue);
    if (!name || !hostState.variables.has(name)) return false;
    return hostState.variables.get(name);
  };
  const hostSetVariable = (nameValue, valueValue) => {
    const name = normalizeVariableName(nameValue);
    if (!name) return false;
    const value = normalizeVariableValue(valueValue);
    hostState.variables.set(name, value);
    postHostEvent('set-variable', { name, value });
    return true;
  };
  const hostGetTableJson = (nameValue) => hostTableJson(hostState.variables, nameValue);
  const hostSetTableJson = (nameValue, jsonValue) => {
    const name = normalizeVariableName(nameValue);
    const basePath = parseVariablePath(name);
    const records = flattenStructuredTable(name, jsonValue);
    if (!name || !basePath || records === null) return false;
    const next = new Map(hostState.variables);
    const prefix = `${name}[`;
    next.delete(name);
    for (const storedName of [...next.keys()]) {
      if (storedName.startsWith(prefix)) next.delete(storedName);
    }
    if (basePath.keys.length) {
      let ancestor = basePath.base;
      next.delete(ancestor);
      for (const key of basePath.keys.slice(0, -1)) {
        ancestor += `[${key}]`;
        next.delete(ancestor);
      }
    }
    if (next.size + records.length > MAX_HOST_VARIABLE_RECORDS) return false;
    for (const record of records) next.set(record.name, record.value);
    hostState.variables = next;
    postHostEvent('set-table', { name, records });
    return true;
  };
  const hostSendGmcp = (commandValue) => {
    const command = normalizeGmcpCommand(commandValue);
    if (!command) return false;
    postHostEvent('send-gmcp', { command });
    return true;
  };
  const hostSessionField = (fieldValue) => {
    const field = String(fieldValue || '');
    if (!Object.hasOwn(hostState.session, field)) return null;
    return safePrimitive(hostState.session[field], 1024);
  };
  const hostRegisterAutomation = (kindValue, idValue, patternValue, expireAfterValue, secondsValue, repeatingValue, oneShotValue) => {
    const kind = String(kindValue || '').trim().toLowerCase();
    const id = Math.max(1, Math.trunc(Number(idValue) || 0));
    if (!id || !['alias', 'substring-trigger', 'regex-trigger', 'exact-trigger', 'timer', 'event'].includes(kind)) return false;
    const seconds = Number(secondsValue);
    let pattern = '';
    if (kind === 'timer') {
      if (!Number.isFinite(seconds) || seconds < 0.01 || seconds > 86_400) return false;
    } else if (kind === 'event') {
      pattern = boundedText(patternValue || '', 160).trim();
      if (!pattern || /[\r\n\u0000]/u.test(pattern)) return false;
    } else if (kind === 'regex-trigger' || kind === 'alias') {
      pattern = normalizeLuaAutomationPattern(patternValue);
      if (!pattern || !compileLuaAutomationRegex(pattern)) return false;
    } else {
      pattern = normalizeLuaAutomationPattern(patternValue);
      if (!pattern) return false;
    }
    postHostEvent('register-automation', {
      automation: {
        id,
        kind,
        pattern,
        expireAfter: Math.max(0, Math.trunc(Number(expireAfterValue) || 0)),
        seconds: kind === 'timer' ? seconds : 0,
        repeating: repeatingValue === true,
        oneShot: oneShotValue === true
      }
    });
    return true;
  };
  const hostControlAutomation = (kindValue, idValue, actionValue) => {
    const kind = String(kindValue || '').trim().toLowerCase();
    const action = String(actionValue || '').trim().toLowerCase();
    const id = Math.max(1, Math.trunc(Number(idValue) || 0));
    if (!id || !kind || !['enable', 'disable', 'kill'].includes(action)) return false;
    postHostEvent('control-automation', { automation: { id, kind, action } });
    return true;
  };
  const hostRaiseEvent = (eventNameValue, argsJsonValue) => {
    const eventName = boundedText(eventNameValue || '', 160).trim();
    const argsJson = String(argsJsonValue || '[]');
    if (!eventName || /[\r\n\u0000]/u.test(eventName) || Buffer.byteLength(argsJson, 'utf8') > 64 * 1024) return false;
    postHostEvent('raise-event', { eventName, argsJson });
    return true;
  };
  const hostRaiseGlobalEvent = (eventNameValue, argsJsonValue) => {
    const eventName = boundedText(eventNameValue || '', 160).trim();
    const argsJson = String(argsJsonValue || '[]');
    if (!eventName || /[\r\n\u0000]/u.test(eventName) || Buffer.byteLength(argsJson, 'utf8') > 64 * 1024) return false;
    postHostEvent('raise-global-event', { eventName, argsJson });
    return true;
  };
  const hostGetStorageJson = (keyValue) => {
    const key = normalizeManagedKey(keyValue);
    return key && hostState.storage.has(key) ? hostState.storage.get(key) : false;
  };
  const hostSetStorageJson = (keyValue, jsonValue) => {
    const key = normalizeManagedKey(keyValue);
    const json = String(jsonValue ?? '');
    if (!key || !json || Buffer.byteLength(json, 'utf8') > MAX_MANAGED_JSON_BYTES) return false;
    try { JSON.parse(json); } catch { return false; }
    hostState.storage.set(key, json);
    postHostEvent('storage-set', { key, json });
    return true;
  };
  const hostDeleteStorage = (keyValue) => {
    const key = normalizeManagedKey(keyValue);
    if (!key) return false;
    hostState.storage.delete(key);
    postHostEvent('storage-delete', { key });
    return true;
  };
  const hostGetSettingJson = (keyValue) => {
    const key = normalizeManagedKey(keyValue);
    return key && hostState.settings.has(key) ? hostState.settings.get(key) : false;
  };
  const hostGetModuleSource = (nameValue) => {
    const name = normalizeManagedModuleName(nameValue);
    return name && hostState.modules.has(name) ? hostState.modules.get(name) : false;
  };
  const hostSetModuleSource = (nameValue, sourceValue) => {
    const name = normalizeManagedModuleName(nameValue);
    const source = String(sourceValue ?? '');
    if (!name || !source || Buffer.byteLength(source, 'utf8') > MAX_MANAGED_MODULE_BYTES) return false;
    hostState.modules.set(name, source);
    postHostEvent('module-set', { name, source });
    return true;
  };
  const hostDeleteModule = (nameValue) => {
    const name = normalizeManagedModuleName(nameValue);
    if (!name) return false;
    hostState.modules.delete(name);
    postHostEvent('module-delete', { name });
    return true;
  };
  const hostReconnect = () => { postHostEvent('reconnect'); return true; };
  const hostSpeedwalk = (routeValue, backwardsValue, delayValue, showValue) => {
    const route = String(routeValue ?? '').normalize('NFKC').trim();
    const delay = Number(delayValue) || 0;
    if (!route || route.length > MAX_COMMAND_BYTES || /[\r\n\u0000]/u.test(route)) return false;
    if (!Number.isFinite(delay) || delay < 0 || delay > 86_400) return false;
    postHostEvent('speedwalk', { route, options: { backwards: backwardsValue === true, delay, show: showValue !== false } });
    return true;
  };
  const hostGetCommandLine = () => hostState.commandLine;
  const hostSetCommandLine = (value) => {
    const text = normalizeCommandLine(value);
    if (String(value ?? '') && !text && String(value ?? '').length) return false;
    hostState.commandLine = text;
    postHostEvent('command-line-set', { text });
    return true;
  };
  const hostGetCurrentLine = () => hostState.currentLine;
  const hostGetLineNumber = () => hostState.currentLineNumber;
  const hostGetLinesJson = (fromValue, toValue) => {
    let from = Math.trunc(Number(fromValue));
    let to = Math.trunc(Number(toValue));
    if (Number.isSafeInteger(from) && from < 0) from = hostState.currentLineNumber + from;
    if (Number.isSafeInteger(to) && to < 0) to = hostState.currentLineNumber + to;
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 1 || to < from || to - from + 1 > MAX_LUA_OUTPUT_LINES) return false;
    const result = [];
    const lineMap = new Map(hostState.outputLines.map((record) => [record.number, record.text]));
    for (let number = from; number <= to; number += 1) {
      if (number === hostState.currentLineNumber) result.push(hostState.currentLine);
      else if (lineMap.has(number)) result.push(lineMap.get(number));
      else result.push('');
    }
    return JSON.stringify(result);
  };
  const hostPaneCommand = (actionValue, paneIdValue, payloadJsonValue) => {
    const action = String(actionValue || '').trim().toLowerCase();
    const paneId = String(paneIdValue || '').normalize('NFKC').trim();
    const payloadJson = String(payloadJsonValue || '{}');
    if (!['create', 'set', 'show', 'hide', 'clear', 'destroy'].includes(action) || !LUA_PANE_ID.test(paneId)) return false;
    if (Buffer.byteLength(payloadJson, 'utf8') > MAX_LUA_PANE_COMMAND_BYTES) return false;
    try {
      const parsed = JSON.parse(payloadJson);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
    } catch { return false; }
    postHostEvent('pane-command', { command: { action, paneId, payloadJson } });
    return true;
  };

  const installHostApi = () => {
    engine.global.set('echo', hostEcho);
    engine.global.set('print', hostEcho);
    engine.global.set('send', hostSend);
    engine.global.set('execute', hostExecute);
    engine.global.set('expandAlias', hostExecute);
    engine.global.set('__nukefireGetVariable', hostGetVariable);
    engine.global.set('setVariable', hostSetVariable);
    engine.global.set('__nukefireGetTableJson', hostGetTableJson);
    engine.global.set('__nukefireSetTableJson', hostSetTableJson);
    engine.global.set('__nukefireSendGmcp', hostSendGmcp);
    engine.global.set('__nukefireGmcpJson', hostState.gmcpJson);
    engine.global.set('__nukefireGmcpMetaJson', hostState.gmcpMetaJson);
    engine.global.set('__nukefireMsdpJson', hostState.msdpJson);
    engine.global.set('__nukefireSessionField', hostSessionField);
    engine.global.set('__nukefireRegisterAutomation', hostRegisterAutomation);
    engine.global.set('__nukefireControlAutomation', hostControlAutomation);
    engine.global.set('__nukefireRaiseEvent', hostRaiseEvent);
    engine.global.set('__nukefireRaiseGlobalEvent', hostRaiseGlobalEvent);
    engine.global.set('__nukefireReconnect', hostReconnect);
    engine.global.set('__nukefireSpeedwalk', hostSpeedwalk);
    engine.global.set('__nukefireGetCommandLine', hostGetCommandLine);
    engine.global.set('__nukefireSetCommandLine', hostSetCommandLine);
    engine.global.set('__nukefireGetCurrentLine', hostGetCurrentLine);
    engine.global.set('__nukefireGetLineNumber', hostGetLineNumber);
    engine.global.set('__nukefireGetLinesJson', hostGetLinesJson);
    engine.global.set('__nukefirePaneCommand', hostPaneCommand);
    engine.global.set('__nukefireGetStorageJson', hostGetStorageJson);
    engine.global.set('__nukefireSetStorageJson', hostSetStorageJson);
    engine.global.set('__nukefireDeleteStorage', hostDeleteStorage);
    engine.global.set('__nukefireGetSettingJson', hostGetSettingJson);
    engine.global.set('__nukefireGetModuleSource', hostGetModuleSource);
    engine.global.set('__nukefireSetModuleSource', hostSetModuleSource);
    engine.global.set('__nukefireDeleteModule', hostDeleteModule);
    engine.doStringSync(String.raw`
      do
        local variableValue = __nukefireGetVariable
        local tableJson = __nukefireGetTableJson
        local tableSetJson = __nukefireSetTableJson
        local sendGmcpHost = __nukefireSendGmcp
        local sessionField = __nukefireSessionField
        local registerAutomationHost = __nukefireRegisterAutomation
        local controlAutomationHost = __nukefireControlAutomation
        local raiseEventHost = __nukefireRaiseEvent
        local raiseGlobalEventHost = __nukefireRaiseGlobalEvent
        local reconnectHost = __nukefireReconnect
        local speedwalkHost = __nukefireSpeedwalk
        local getCommandLineHost = __nukefireGetCommandLine
        local setCommandLineHost = __nukefireSetCommandLine
        local getCurrentLineHost = __nukefireGetCurrentLine
        local getLineNumberHost = __nukefireGetLineNumber
        local getLinesJsonHost = __nukefireGetLinesJson
        local paneCommandHost = __nukefirePaneCommand
        local storageValueJson = __nukefireGetStorageJson
        local storageSetJson = __nukefireSetStorageJson
        local storageDeleteHost = __nukefireDeleteStorage
        local settingValueJson = __nukefireGetSettingJson
        local moduleSource = __nukefireGetModuleSource
        local moduleSetSource = __nukefireSetModuleSource
        local moduleDeleteHost = __nukefireDeleteModule
        local safeLoad = load

        local function jsonDecode(text)
          if type(text) ~= 'string' or text == '' then return nil end
          local index = 1
          local length = #text
          local function skipSpace()
            while index <= length do
              local byte = string.byte(text, index)
              if byte == 32 or byte == 9 or byte == 10 or byte == 13 then index = index + 1 else break end
            end
          end
          local parseValue
          local function parseString()
            if string.sub(text, index, index) ~= '"' then return nil, false end
            index = index + 1
            local out = {}
            while index <= length do
              local ch = string.sub(text, index, index)
              if ch == '"' then index = index + 1; return table.concat(out), true end
              if ch ~= '\\' then out[#out + 1] = ch; index = index + 1
              else
                index = index + 1
                local esc = string.sub(text, index, index)
                if esc == '"' or esc == '\\' or esc == '/' then out[#out + 1] = esc
                elseif esc == 'b' then out[#out + 1] = '\b'
                elseif esc == 'f' then out[#out + 1] = '\f'
                elseif esc == 'n' then out[#out + 1] = '\n'
                elseif esc == 'r' then out[#out + 1] = '\r'
                elseif esc == 't' then out[#out + 1] = '\t'
                elseif esc == 'u' then
                  local hex = string.sub(text, index + 1, index + 4)
                  local code = tonumber(hex, 16)
                  if not code or #hex ~= 4 then return nil, false end
                  index = index + 4
                  if code >= 0xD800 and code <= 0xDBFF then
                    if string.sub(text, index + 1, index + 2) == '\\u' then
                      local lowHex = string.sub(text, index + 3, index + 6)
                      local low = tonumber(lowHex, 16)
                      if low and low >= 0xDC00 and low <= 0xDFFF then
                        code = 0x10000 + (code - 0xD800) * 0x400 + (low - 0xDC00)
                        index = index + 6
                      else code = 0xFFFD end
                    else code = 0xFFFD end
                  elseif code >= 0xDC00 and code <= 0xDFFF then
                    code = 0xFFFD
                  end
                  out[#out + 1] = utf8.char(code)
                else return nil, false end
                index = index + 1
              end
            end
            return nil, false
          end
          local function parseNumber()
            local start = index
            while index <= length and string.find(string.sub(text, index, index), '[0-9eE+%-%.]') do index = index + 1 end
            local number = tonumber(string.sub(text, start, index - 1))
            return number, number ~= nil
          end
          local function parseArray()
            index = index + 1
            local out = {}
            skipSpace()
            if string.sub(text, index, index) == ']' then index = index + 1; return out, true end
            while index <= length do
              local value, ok = parseValue()
              if not ok then return nil, false end
              out[#out + 1] = value
              skipSpace()
              local ch = string.sub(text, index, index)
              if ch == ']' then index = index + 1; return out, true end
              if ch ~= ',' then return nil, false end
              index = index + 1
              skipSpace()
            end
            return nil, false
          end
          local function parseObject()
            index = index + 1
            local out = {}
            skipSpace()
            if string.sub(text, index, index) == '}' then index = index + 1; return out, true end
            while index <= length do
              local key, keyOk = parseString()
              if not keyOk then return nil, false end
              skipSpace()
              if string.sub(text, index, index) ~= ':' then return nil, false end
              index = index + 1
              local value, valueOk = parseValue()
              if not valueOk then return nil, false end
              if value ~= nil then out[key] = value end
              skipSpace()
              local ch = string.sub(text, index, index)
              if ch == '}' then index = index + 1; return out, true end
              if ch ~= ',' then return nil, false end
              index = index + 1
              skipSpace()
            end
            return nil, false
          end
          parseValue = function()
            skipSpace()
            local ch = string.sub(text, index, index)
            if ch == '"' then return parseString() end
            if ch == '{' then return parseObject() end
            if ch == '[' then return parseArray() end
            if ch == '-' or string.match(ch, '%d') then return parseNumber() end
            if string.sub(text, index, index + 3) == 'true' then index = index + 4; return true, true end
            if string.sub(text, index, index + 4) == 'false' then index = index + 5; return false, true end
            if string.sub(text, index, index + 3) == 'null' then index = index + 4; return nil, true end
            return nil, false
          end
          local value, ok = parseValue()
          skipSpace()
          if not ok or index <= length then return nil end
          return value
        end

        local function jsonQuote(value)
          local source = tostring(value or '')
          source = string.gsub(source, '[%z\\1-\\31\\\\"]', function(ch)
            if ch == '"' then return '\\"' end
            if ch == '\\' then return '\\\\' end
            if ch == '\b' then return '\\b' end
            if ch == '\f' then return '\\f' end
            if ch == '\n' then return '\\n' end
            if ch == '\r' then return '\\r' end
            if ch == '\t' then return '\\t' end
            return string.format('\\u%04x', string.byte(ch))
          end)
          return '"' .. source .. '"'
        end

        local function jsonEncode(value, maxDepth)
          local seen = {}
          local function encode(current, depth)
            local kind = type(current)
            if kind == 'nil' then return 'null' end
            if kind == 'boolean' then return current and 'true' or 'false' end
            if kind == 'number' then
              if current ~= current or current == math.huge or current == -math.huge then return nil end
              return tostring(current)
            end
            if kind == 'string' then return jsonQuote(current) end
            if kind ~= 'table' or depth > maxDepth or seen[current] then return nil end
            seen[current] = true
            local count, maxIndex, isArray = 0, 0, true
            for key in pairs(current) do
              count = count + 1
              if type(key) ~= 'number' or key < 1 or key % 1 ~= 0 then isArray = false
              else if key > maxIndex then maxIndex = key end end
            end
            if isArray and maxIndex ~= count then isArray = false end
            local parts = {}
            if isArray then
              for i = 1, maxIndex do
                local encoded = encode(current[i], depth + 1)
                if not encoded then seen[current] = nil; return nil end
                parts[#parts + 1] = encoded
              end
              seen[current] = nil
              return '[' .. table.concat(parts, ',') .. ']'
            end
            local keys = {}
            for key in pairs(current) do
              if type(key) ~= 'string' and type(key) ~= 'number' then seen[current] = nil; return nil end
              keys[#keys + 1] = { raw = key, text = tostring(key) }
            end
            table.sort(keys, function(a, b) return a.text < b.text end)
            for _, entry in ipairs(keys) do
              local encoded = encode(current[entry.raw], depth + 1)
              if not encoded then seen[current] = nil; return nil end
              parts[#parts + 1] = jsonQuote(entry.text) .. ':' .. encoded
            end
            seen[current] = nil
            return '{' .. table.concat(parts, ',') .. '}'
          end
          return encode(value, 0)
        end

        if type(__nukefireStoreCallback) ~= 'function' then
          local callbackStore = {}
          local callbackKinds = {}
          local callbackEnabled = {}
          local nextCallbackId = 0

          function __nukefireStoreCallback(kind, callback)
            if type(callback) == 'string' then
              local named = _G[callback]
              if type(named) == 'function' then callback = named
              elseif type(safeLoad) == 'function' then
                local compiled = safeLoad(callback, '@NukeFire/temp-callback', 't', _ENV)
                callback = compiled
              end
            end
            if type(callback) ~= 'function' then return nil end
            local count = 0
            for _ in pairs(callbackStore) do count = count + 1 end
            if count >= 256 then return nil end
            nextCallbackId = nextCallbackId + 1
            if nextCallbackId > 2147483646 then nextCallbackId = 1 end
            while callbackStore[nextCallbackId] ~= nil do nextCallbackId = nextCallbackId + 1 end
            callbackStore[nextCallbackId] = callback
            callbackKinds[nextCallbackId] = tostring(kind or '')
            callbackEnabled[nextCallbackId] = true
            return nextCallbackId
          end

          function __nukefireDropCallback(id)
            id = tonumber(id)
            if not id or callbackStore[id] == nil then return false end
            callbackStore[id] = nil
            callbackKinds[id] = nil
            callbackEnabled[id] = nil
            return true
          end

          function __nukefireSetCallbackEnabled(id, enabled)
            id = tonumber(id)
            if not id or callbackStore[id] == nil then return false end
            callbackEnabled[id] = enabled == true
            return true
          end

          function __nukefireCallbackKind(id)
            return callbackKinds[tonumber(id)]
          end

          function __nukefireInvokeStoredCallback(id, contextJson)
            id = tonumber(id)
            local callback = id and callbackStore[id] or nil
            if type(callback) ~= 'function' or callbackEnabled[id] ~= true then return nil end
            local context = jsonDecode(contextJson) or {}
            line = type(context.line) == 'string' and context.line or ''
            command = type(context.command) == 'string' and context.command or ''
            matches = {}
            if type(context.matches) == 'table' then
              for index, value in ipairs(context.matches) do matches[index] = value end
            end
            if type(context.namedMatches) == 'table' then
              for key, value in pairs(context.namedMatches) do matches[key] = value end
            end
            local args = type(context.args) == 'table' and context.args or {}
            return callback(table.unpack(args, 1, math.min(#args, 32)))
          end
        end

        local controlCallback
        local function registerCallback(kind, callback, pattern, expireAfter, seconds, repeating, oneShot)
          local id = __nukefireStoreCallback(kind, callback)
          if not id then return nil end
          if registerAutomationHost(kind, id, pattern or '', expireAfter or 0, seconds or 0, repeating == true, oneShot == true) ~= true then
            __nukefireDropCallback(id)
            return nil
          end
          return id
        end

        function tempAlias(regex, callback)
          return registerCallback('alias', callback, tostring(regex or ''), 0, 0, false, false)
        end
        function tempTrigger(substring, callback, expireAfter)
          return registerCallback('substring-trigger', callback, tostring(substring or ''), expireAfter, 0, false, false)
        end
        function tempRegexTrigger(regex, callback, expireAfter)
          return registerCallback('regex-trigger', callback, tostring(regex or ''), expireAfter, 0, false, false)
        end
        function tempExactMatchTrigger(exactLine, callback, expireAfter)
          return registerCallback('exact-trigger', callback, tostring(exactLine or ''), expireAfter, 0, false, false)
        end
        function tempTimer(seconds, callback, repeating)
          return registerCallback('timer', callback, '', 0, tonumber(seconds) or 0, repeating == true, false)
        end
        function registerAnonymousEventHandler(eventName, callback, oneShot)
          return registerCallback('event', callback, tostring(eventName or ''), 0, 0, false, oneShot == true)
        end

        __nukefireNamedEventHandlers = __nukefireNamedEventHandlers or {}
        local namedEventHandlers = __nukefireNamedEventHandlers
        local function namedEventKey(userName, handlerName)
          return tostring(userName or '') .. '\0' .. tostring(handlerName or '')
        end
        function registerNamedEventHandler(userName, handlerName, eventName, callback, oneShot)
          local user = tostring(userName or '')
          local handler = tostring(handlerName or '')
          if user == '' or handler == '' then return nil end
          local key = namedEventKey(user, handler)
          local existing = namedEventHandlers[key]
          if existing then controlCallback('event', existing.id, 'kill') end
          local id = registerCallback('event', callback, tostring(eventName or ''), 0, 0, false, oneShot == true)
          if not id then return nil end
          namedEventHandlers[key] = { id = id, userName = user, handlerName = handler, eventName = tostring(eventName or '') }
          return id
        end
        function stopNamedEventHandler(userName, handlerName)
          local record = namedEventHandlers[namedEventKey(userName, handlerName)]
          return record and controlCallback('event', record.id, 'disable') or false
        end
        function resumeNamedEventHandler(userName, handlerName)
          local record = namedEventHandlers[namedEventKey(userName, handlerName)]
          return record and controlCallback('event', record.id, 'enable') or false
        end
        function deleteNamedEventHandler(userName, handlerName)
          local key = namedEventKey(userName, handlerName)
          local record = namedEventHandlers[key]
          if not record then return false end
          namedEventHandlers[key] = nil
          return controlCallback('event', record.id, 'kill')
        end
        function getNamedEventHandlers(userName)
          local user = tostring(userName or '')
          local result = {}
          for _, record in pairs(namedEventHandlers) do
            if record.userName == user then result[record.handlerName] = record.eventName end
          end
          return result
        end

        controlCallback = function(expectedKind, id, action)
          id = tonumber(id)
          if not id then return false end
          local kind = __nukefireCallbackKind(id)
          if not kind then return false end
          local valid = expectedKind == 'trigger'
            and (kind == 'substring-trigger' or kind == 'regex-trigger' or kind == 'exact-trigger')
            or kind == expectedKind
          if not valid then return false end
          if action == 'kill' then __nukefireDropCallback(id)
          elseif action == 'enable' then __nukefireSetCallbackEnabled(id, true)
          elseif action == 'disable' then __nukefireSetCallbackEnabled(id, false)
          else return false end
          return controlAutomationHost(kind, id, action) == true
        end

        function killAlias(id) return controlCallback('alias', id, 'kill') end
        function enableAlias(id) return controlCallback('alias', id, 'enable') end
        function disableAlias(id) return controlCallback('alias', id, 'disable') end
        function killTrigger(id) return controlCallback('trigger', id, 'kill') end
        function enableTrigger(id) return controlCallback('trigger', id, 'enable') end
        function disableTrigger(id) return controlCallback('trigger', id, 'disable') end
        function killTimer(id) return controlCallback('timer', id, 'kill') end
        function enableTimer(id) return controlCallback('timer', id, 'enable') end
        function disableTimer(id) return controlCallback('timer', id, 'disable') end
        function killAnonymousEventHandler(id) return controlCallback('event', id, 'kill') end

        function raiseEvent(eventName, ...)
          local args = {...}
          local payload = jsonEncode(args, 4)
          if not payload or #payload > 65536 then return false end
          return raiseEventHost(tostring(eventName or ''), payload) == true
        end

        function raiseGlobalEvent(eventName, ...)
          local args = {...}
          local payload = jsonEncode(args, 4)
          if not payload or #payload > 65536 then return false end
          return raiseGlobalEventHost(tostring(eventName or ''), payload) == true
        end
        function reconnect() return reconnectHost() == true end
        function getProfileName()
          local name = sessionField('name')
          if name == nil or name == '' then name = sessionField('characterName') end
          return tostring(name or '')
        end
        function getEpoch()
          local millis = tonumber(sessionField('epochMilliseconds')) or 0
          return millis / 1000
        end
        function hasFocus() return sessionField('appFocused') == true end
        local function stripMudletColorTags(text)
          local source = tostring(text or '')
          source = string.gsub(source, '<[%w_:#,%-]+>', '')
          return source
        end
        local function stripMudletHexTags(text)
          local source = tostring(text or '')
          source = string.gsub(source, '#[%x][%x][%x][%x][%x][%x]', '')
          source = string.gsub(source, '|[%x][%x][%x][%x][%x][%x]', '')
          source = string.gsub(source, '#/?[biruos]', '')
          source = string.gsub(source, '|/?[biruos]', '')
          source = string.gsub(source, '#r', '')
          source = string.gsub(source, '|r', '')
          return source
        end
        function cecho(text) echo(stripMudletColorTags(text)) end
        function decho(text) echo(stripMudletColorTags(text)) end
        function hecho(text) echo(stripMudletHexTags(text)) end
        function sendAll(...)
          local args = {...}
          local count = select('#', ...)
          local first = 1
          local delay = 0
          if type(args[1]) == 'number' then delay = tonumber(args[1]) or 0; first = 2 end
          local show = true
          if count >= first and type(args[count]) == 'boolean' then show = args[count] ~= false; count = count - 1 end
          if delay < 0 or count < first or count - first + 1 > 64 then return false end
          local ok = true
          for index = first, count do
            local commandText = tostring(args[index] or '')
            if commandText == '' then ok = false
            elseif delay > 0 then
              local id = tempTimer(delay * (index - first + 1), function() send(commandText, show) end, false)
              if not id then ok = false end
            elseif send(commandText, show) ~= true then ok = false end
          end
          return ok
        end
        function speedwalk(route, backwards, delay, show)
          return speedwalkHost(tostring(route or ''), backwards == true, tonumber(delay) or 0, show ~= false) == true
        end
        function getCmdLine() return tostring(getCommandLineHost() or '') end
        function printCmdLine(text) return setCommandLineHost(tostring(text or '')) == true end
        function setCmdLine(text) return printCmdLine(text) end
        function appendCmdLine(text) return setCommandLineHost(getCmdLine() .. tostring(text or '')) == true end
        function clearCmdLine() return setCommandLineHost('') == true end
        function getCurrentLine() return tostring(getCurrentLineHost() or '') end
        function getLineNumber() return tonumber(getLineNumberHost()) or 1 end
        function getLastLineNumber() return getLineNumber() end
        function getLineCount() return getLineNumber() end
        function getLines(fromLine, toLine)
          local payload = getLinesJsonHost(tonumber(fromLine), tonumber(toLine))
          if type(payload) ~= 'string' then return {} end
          local decoded = jsonDecode(payload)
          return type(decoded) == 'table' and decoded or {}
        end
        function sendMSDP(command, ...)
          local op = string.upper(tostring(command or ''))
          if op == 'REPORT' or op == 'UNREPORT' or op == 'RESET' or op == 'XTERM_256_COLORS' then return true end
          return false
        end
        if type(table.contains) ~= 'function' then
          function table.contains(container, value)
            if type(container) ~= 'table' then return false end
            for _, item in pairs(container) do if item == value then return true end end
            return false
          end
        end
        if type(table.union) ~= 'function' then
          function table.union(...)
            local out = {}
            for index = 1, select('#', ...) do
              local source = select(index, ...)
              if type(source) == 'table' then for key, value in pairs(source) do out[key] = value end end
            end
            return out
          end
        end
        if type(spairs) ~= 'function' then
          function spairs(source, order)
            local keys = {}
            if type(source) == 'table' then for key in pairs(source) do keys[#keys + 1] = key end end
            table.sort(keys, order and function(a, b) return order(source, a, b) end or function(a, b) return tostring(a) < tostring(b) end)
            local index = 0
            return function()
              index = index + 1
              local key = keys[index]
              if key ~= nil then return key, source[key] end
            end
          end
        end

        local function normalizeManagedModuleName(name)
          local source = tostring(name or '')
          source = string.gsub(source, '\\', '/')
          if source == '' or #source > 160 or string.sub(source, 1, 1) == '/' or string.sub(source, -1) == '/' or string.find(source, '..', 1, true) then return nil end
          source = string.gsub(source, '/', '.')
          local count = 0
          for part in string.gmatch(source, '[^.]+') do
            count = count + 1
            if count > 16 or not string.match(part, '^[A-Za-z_][A-Za-z0-9_]*$') then return nil end
          end
          return count > 0 and source or nil
        end

        if type(require) ~= 'function' then
          local loadedModules = {}
          local loadingModules = {}
          function require(name)
            local canonical = normalizeManagedModuleName(name)
            if not canonical then error('invalid managed Lua module name', 2) end
            if loadedModules[canonical] ~= nil then return loadedModules[canonical] end
            if loadingModules[canonical] then error('circular managed Lua require: ' .. canonical, 2) end
            local source = moduleSource(canonical)
            if type(source) ~= 'string' or source == '' then error("managed Lua module '" .. canonical .. "' was not found", 2) end
            local chunk, loadError = safeLoad(source, '@NukeFire/module/' .. canonical, 't', _ENV)
            if not chunk then error(loadError or ('unable to load module ' .. canonical), 2) end
            loadingModules[canonical] = true
            local ok, result = pcall(chunk)
            loadingModules[canonical] = nil
            if not ok then error(result, 2) end
            if result == nil then result = true end
            loadedModules[canonical] = result
            return result
          end
        end

        storage = {
          get = function(key, defaultValue)
            local payload = storageValueJson(tostring(key or ''))
            if type(payload) ~= 'string' then return defaultValue end
            local decoded = jsonDecode(payload)
            if decoded == nil and payload ~= 'null' then return defaultValue end
            return decoded
          end,
          set = function(key, value)
            local payload = jsonEncode(value, 8)
            if not payload or #payload > 65536 then return false end
            return storageSetJson(tostring(key or ''), payload) == true
          end,
          delete = function(key) return storageDeleteHost(tostring(key or '')) == true end
        }

        settings = {
          get = function(key, defaultValue)
            local payload = settingValueJson(tostring(key or ''))
            if type(payload) ~= 'string' then return defaultValue end
            local decoded = jsonDecode(payload)
            if decoded == nil and payload ~= 'null' then return defaultValue end
            return decoded
          end
        }

        local modulesApi = {
          set = function(name, source)
            local canonical = normalizeManagedModuleName(name)
            if not canonical or type(source) ~= 'string' then return false end
            return moduleSetSource(canonical, source) == true
          end,
          get = function(name)
            local canonical = normalizeManagedModuleName(name)
            if not canonical then return nil end
            local source = moduleSource(canonical)
            return type(source) == 'string' and source or nil
          end,
          delete = function(name)
            local canonical = normalizeManagedModuleName(name)
            return canonical and moduleDeleteHost(canonical) == true or false
          end
        }

        function getVariable(name)
          local value = variableValue(name)
          if value == false then return nil end
          return value
        end
        function getTable(name)
          local payload = tableJson(name)
          if payload == false or type(payload) ~= 'string' then return nil end
          return jsonDecode(payload)
        end
        function setTable(name, value)
          if type(value) ~= 'table' then return false end
          local payload = jsonEncode(value, 4)
          if not payload or #payload > 262144 then return false end
          return tableSetJson(name, payload) == true
        end
        function sendGMCP(command, body)
          local text = tostring(command or '')
          if body ~= nil then
            if type(body) ~= 'table' then return false end
            local payload = jsonEncode(body, 8)
            if not payload or #payload > 65536 then return false end
            text = text .. ' ' .. payload
          end
          return sendGmcpHost(text) == true
        end
        function getSession()
          return {
            id = sessionField('id'),
            name = sessionField('name'),
            characterName = sessionField('characterName'),
            role = sessionField('role'),
            host = sessionField('host'),
            port = sessionField('port'),
            connected = sessionField('connected')
          }
        end

        gmcp = jsonDecode(__nukefireGmcpJson) or {}
        msdp = jsonDecode(__nukefireMsdpJson) or {}

        local function gmcpLookup(packageName)
          local current = gmcp
          for part in string.gmatch(tostring(packageName or ''), '[^.]+') do
            if type(current) ~= 'table' then return nil end
            local found = nil
            for key, value in pairs(current) do
              if type(key) == 'string' and string.lower(key) == string.lower(part) then found = value; break end
            end
            if found == nil then return nil end
            current = found
          end
          return current
        end
        local knownGmcpSegments = { char='Char', vitals='Vitals', status='Status', maxstats='MaxStats', room='Room', info='Info', core='Core', comm='Comm', nukefire='NukeFire', gps='GPS', catalog='Catalog' }
        local function canonicalGmcpPackage(packageName)
          local parts = {}
          for part in string.gmatch(tostring(packageName or ''), '[^.]+') do
            local lower = string.lower(part)
            parts[#parts + 1] = knownGmcpSegments[lower] or (string.upper(string.sub(part, 1, 1)) .. string.sub(part, 2))
          end
          return table.concat(parts, '.')
        end
        gmcp.on = function(packageName, callback, oneShot)
          if type(callback) ~= 'function' then return nil end
          local requested = tostring(packageName or '')
          if string.sub(string.lower(requested), 1, 5) == 'gmcp.' then requested = string.sub(requested, 6) end
          if requested == '' then return nil end
          local canonical = canonicalGmcpPackage(requested)
          return registerAnonymousEventHandler('gmcp.' .. canonical, function()
            return callback(requested, gmcpLookup(requested))
          end, oneShot == true)
        end

        world = {
          on = function(eventName, callback, oneShot)
            if type(callback) ~= 'function' then return nil end
            local key = string.lower(tostring(eventName or ''))
            local mapped = key == 'connect' and 'sysConnectionEvent' or key == 'disconnect' and 'sysDisconnectionEvent' or nil
            if not mapped then return nil end
            return registerAnonymousEventHandler(mapped, function(...) return callback(...) end, oneShot == true)
          end
        }

        mud = {
          send = function(command, options) return send(command) end,
          trigger = function(pattern, callback, expireAfter)
            if type(callback) ~= 'function' then return nil end
            return tempRegexTrigger(pattern, function()
              local match = { line = line, matches = matches, captures = matches }
              return callback(match)
            end, expireAfter)
          end
        }

        local gmcpMeta = jsonDecode(__nukefireGmcpMetaJson) or {}

        local paneApi = {}
        function paneApi.create(idValue, spec)
          local id = tostring(idValue or '')
          if type(spec) ~= 'table' then return nil end
          local encoded = jsonEncode(spec, 5)
          if not encoded or paneCommandHost('create', id, encoded) ~= true then return nil end
          local pane = { id = id }
          function pane:set(rowId, value)
            local payload = jsonEncode({ rowId = tostring(rowId or ''), value = value }, 4)
            return payload ~= nil and paneCommandHost('set', id, payload) == true
          end
          function pane:show() return paneCommandHost('show', id, '{}') == true end
          function pane:hide() return paneCommandHost('hide', id, '{}') == true end
          function pane:clear() return paneCommandHost('clear', id, '{}') == true end
          function pane:destroy() return paneCommandHost('destroy', id, '{}') == true end
          return pane
        end

        nf = {
          send = send,
          execute = execute,
          expandAlias = expandAlias,
          echo = echo,
          getVariable = getVariable,
          setVariable = setVariable,
          getTable = getTable,
          setTable = setTable,
          sendGMCP = sendGMCP,
          getSession = getSession,
          gmcp = gmcp,
          gmcpMeta = gmcpMeta,
          tempAlias = tempAlias,
          tempTrigger = tempTrigger,
          tempRegexTrigger = tempRegexTrigger,
          tempExactMatchTrigger = tempExactMatchTrigger,
          tempTimer = tempTimer,
          registerAnonymousEventHandler = registerAnonymousEventHandler,
          registerNamedEventHandler = registerNamedEventHandler,
          stopNamedEventHandler = stopNamedEventHandler,
          resumeNamedEventHandler = resumeNamedEventHandler,
          deleteNamedEventHandler = deleteNamedEventHandler,
          getNamedEventHandlers = getNamedEventHandlers,
          raiseGlobalEvent = raiseGlobalEvent,
          killAnonymousEventHandler = killAnonymousEventHandler,
          raiseEvent = raiseEvent,
          getProfileName = getProfileName,
          getEpoch = getEpoch,
          hasFocus = hasFocus,
          reconnect = reconnect,
          cecho = cecho,
          decho = decho,
          hecho = hecho,
          sendAll = sendAll,
          speedwalk = speedwalk,
          getCmdLine = getCmdLine,
          printCmdLine = printCmdLine,
          setCmdLine = setCmdLine,
          appendCmdLine = appendCmdLine,
          clearCmdLine = clearCmdLine,
          getCurrentLine = getCurrentLine,
          getLineNumber = getLineNumber,
          getLastLineNumber = getLastLineNumber,
          getLineCount = getLineCount,
          getLines = getLines,
          sendMSDP = sendMSDP,
          msdp = msdp,
          storage = storage,
          settings = settings,
          modules = modulesApi,
          world = world,
          mud = mud,
          pane = paneApi,
          killAlias = killAlias,
          enableAlias = enableAlias,
          disableAlias = disableAlias,
          killTrigger = killTrigger,
          enableTrigger = enableTrigger,
          disableTrigger = disableTrigger,
          killTimer = killTimer,
          enableTimer = enableTimer,
          disableTimer = disableTimer,
          variables = { get = getVariable, set = setVariable, getTable = getTable, setTable = setTable }
        }

        __nukefireGetVariable = nil
        __nukefireGetTableJson = nil
        __nukefireSetTableJson = nil
        __nukefireSendGmcp = nil
        __nukefireGmcpJson = nil
        __nukefireGmcpMetaJson = nil
        __nukefireMsdpJson = nil
        __nukefireSessionField = nil
        __nukefireRegisterAutomation = nil
        __nukefireControlAutomation = nil
        __nukefireRaiseEvent = nil
        __nukefireRaiseGlobalEvent = nil
        __nukefireReconnect = nil
        __nukefireSpeedwalk = nil
        __nukefireGetCommandLine = nil
        __nukefireSetCommandLine = nil
        __nukefireGetCurrentLine = nil
        __nukefireGetLineNumber = nil
        __nukefireGetLinesJson = nil
        __nukefirePaneCommand = nil
        __nukefireGetStorageJson = nil
        __nukefireSetStorageJson = nil
        __nukefireDeleteStorage = nil
        __nukefireGetSettingJson = nil
        __nukefireGetModuleSource = nil
        __nukefireSetModuleSource = nil
        __nukefireDeleteModule = nil
      end
    `);
  };
  installHostApi();

  // Base library is useful, but raw code/file-loading surfaces remain denied.
  // require() below is NukeFire's managed in-memory module loader only; it never sees a filesystem path.
  engine.doStringSync(`
    dofile = nil
    loadfile = nil
    load = nil
    loadstring = nil
    warn = nil
    io = nil
    os = nil
    debug = nil
    package = nil
    coroutine = nil
    process = nil
    Buffer = nil
    global = nil
    globalThis = nil
    window = nil
    document = nil
  `);

  const baselineBytes = engine.global.getMemoryUsed();
  const requestedMemory = Number(options.memoryAllowanceBytes);
  const memoryAllowanceBytes = Number.isFinite(requestedMemory)
    ? Math.max(64 * 1024, Math.min(32 * 1024 * 1024, Math.trunc(requestedMemory)))
    : DEFAULT_MEMORY_ALLOWANCE;
  engine.global.setMemoryMax(baselineBytes + memoryAllowanceBytes);

  const requestedTimeout = Number(options.softTimeoutMs);
  const softTimeoutMs = Number.isFinite(requestedTimeout)
    ? Math.max(5, Math.min(2000, Math.trunc(requestedTimeout)))
    : DEFAULT_SOFT_TIMEOUT_MS;

  const luaVersion = safePrimitive(engine.global.get('_VERSION'), 128);
  sessions.set(sessionId, {
    engine,
    softTimeoutMs,
    baselineBytes,
    memoryAllowanceBytes,
    luaVersion,
    hostState,
    installHostApi
  });
  return {
    sessionId,
    luaVersion,
    baselineBytes,
    memoryAllowanceBytes,
    softTimeoutMs
  };
}

function prepareHostState(state, sessionId, hostContext = {}, requestIdValue = 0) {
  const variableRecords = Array.isArray(hostContext?.variables) ? hostContext.variables.slice(0, MAX_HOST_VARIABLE_RECORDS) : [];
  state.hostState.variables = new Map();
  for (const record of variableRecords) {
    const name = normalizeVariableName(record?.name);
    if (!name) continue;
    state.hostState.variables.set(name, normalizeVariableValue(record?.value));
  }
  const sessionSource = hostContext?.session && typeof hostContext.session === 'object' ? hostContext.session : {};
  state.hostState.session = {
    id: sessionId,
    name: boundedText(sessionSource.name || '', 128),
    characterName: boundedText(sessionSource.characterName || '', 128),
    role: boundedText(sessionSource.role || '', 64),
    host: boundedText(sessionSource.host || '', 255),
    port: Number.isFinite(Number(sessionSource.port)) ? Math.max(0, Math.min(65535, Math.trunc(Number(sessionSource.port)))) : 0,
    connected: sessionSource.connected === true,
    appFocused: sessionSource.appFocused === true,
    epochMilliseconds: Number.isFinite(Number(sessionSource.epochMilliseconds)) ? Math.max(0, Math.trunc(Number(sessionSource.epochMilliseconds))) : Date.now()
  };
  state.hostState.gmcpJson = boundedJsonObjectText(hostContext?.gmcpJson, MAX_TABLE_JSON_BYTES, '{}');
  state.hostState.gmcpMetaJson = boundedJsonObjectText(hostContext?.gmcpMetaJson, 16 * 1024, '{}');
  state.hostState.msdpJson = boundedJsonObjectText(hostContext?.msdpJson, 128 * 1024, '{}');
  state.hostState.storage = managedJsonRecordMap(hostContext?.storageRecords);
  state.hostState.settings = managedJsonRecordMap(hostContext?.settingRecords);
  state.hostState.modules = managedModuleMap(hostContext?.moduleRecords);
  state.hostState.commandLine = normalizeCommandLine(hostContext?.commandLine || '');
  const output = hostContext?.outputHistory && typeof hostContext.outputHistory === 'object' ? hostContext.outputHistory : {};
  state.hostState.currentLine = boundedText(output.currentLine || '', MAX_LUA_OUTPUT_LINE_CHARS);
  state.hostState.currentLineNumber = Math.max(1, Math.trunc(Number(output.currentLineNumber) || 1));
  state.hostState.outputLines = (Array.isArray(output.lines) ? output.lines : []).slice(-MAX_LUA_OUTPUT_LINES).map((record) => ({
    number: Math.max(1, Math.trunc(Number(record?.number) || 1)),
    text: boundedText(record?.text || '', MAX_LUA_OUTPUT_LINE_CHARS)
  }));
  state.hostState.requestId = Number(requestIdValue) || 0;
  state.installHostApi();
}

async function execute(rawSessionId, script, options = {}, hostContext = {}, requestIdValue = 0) {
  const sessionId = normalizeSessionId(rawSessionId);
  const state = sessions.get(sessionId);
  if (!state) throw new Error(`Lua session not found: ${sessionId}`);

  const source = String(script ?? '');
  prepareHostState(state, sessionId, hostContext, requestIdValue);

  if (Buffer.byteLength(source, 'utf8') > MAX_SCRIPT_BYTES) {
    return {
      ok: false,
      error: { type: 'limit', name: 'LuaScriptLimitError', message: `script exceeds ${MAX_SCRIPT_BYTES} bytes`, stack: '' }
    };
  }

  const requestedTimeout = Number(options.softTimeoutMs);
  const softTimeoutMs = Number.isFinite(requestedTimeout)
    ? Math.max(5, Math.min(2000, Math.trunc(requestedTimeout)))
    : state.softTimeoutMs;

  const thread = state.engine.global.newThread();
  const threadIndex = state.engine.global.getTop();
  try {
    thread.loadString(source, normalizeChunkName(options.chunkName, sessionId, 'command'));
    const result = await thread.run(0, { timeout: softTimeoutMs });
    return {
      ok: true,
      values: Array.from(result).slice(0, 8).map((value) => safePrimitive(value))
    };
  } catch (error) {
    const normalized = normalizeError(error);
    postEvent('diagnostic', { requestId: state.hostState.requestId, sessionId, diagnostic: normalized });
    return { ok: false, error: normalized };
  } finally {
    state.hostState.requestId = 0;
    try {
      state.engine.global.remove(threadIndex);
    } catch {
      // A hard memory failure can make stack cleanup impossible. The parent-side
      // watchdog remains the final containment boundary for the lab runtime.
    }
  }
}

async function invokeCallback(rawSessionId, callbackIdValue, contextValue = {}, options = {}, hostContext = {}, requestIdValue = 0) {
  const sessionId = normalizeSessionId(rawSessionId);
  const state = sessions.get(sessionId);
  if (!state) throw new Error(`Lua session not found: ${sessionId}`);
  const callbackId = Math.max(1, Math.trunc(Number(callbackIdValue) || 0));
  if (!callbackId) throw new Error('invalid Lua callback id');
  prepareHostState(state, sessionId, hostContext, requestIdValue);
  const context = contextValue && typeof contextValue === 'object' ? contextValue : {};
  const json = JSON.stringify(context);
  if (Buffer.byteLength(json, 'utf8') > MAX_TABLE_JSON_BYTES) {
    return { ok: false, error: { type: 'limit', name: 'LuaCallbackContextLimitError', message: 'callback context exceeds limit', stack: '' } };
  }
  state.engine.global.set('__nukefireCallbackContextJson', json);
  const requestedTimeout = Number(options.softTimeoutMs);
  const softTimeoutMs = Number.isFinite(requestedTimeout)
    ? Math.max(5, Math.min(2000, Math.trunc(requestedTimeout)))
    : state.softTimeoutMs;
  const thread = state.engine.global.newThread();
  const threadIndex = state.engine.global.getTop();
  try {
    thread.loadString(`return __nukefireInvokeStoredCallback(${callbackId}, __nukefireCallbackContextJson)`, `@NukeFire/${sessionId}/callback/${callbackId}`);
    const result = await thread.run(0, { timeout: softTimeoutMs });
    return { ok: true, values: Array.from(result).slice(0, 8).map((value) => safePrimitive(value)) };
  } catch (error) {
    const normalized = normalizeError(error);
    postEvent('diagnostic', { requestId: state.hostState.requestId, sessionId, diagnostic: normalized });
    return { ok: false, error: normalized };
  } finally {
    state.hostState.requestId = 0;
    try { state.engine.doStringSync('__nukefireCallbackContextJson = nil'); } catch {}
    try { state.engine.global.remove(threadIndex); } catch {}
  }
}

async function dropCallback(rawSessionId, callbackIdValue) {
  const sessionId = normalizeSessionId(rawSessionId);
  const state = sessions.get(sessionId);
  if (!state) return false;
  const callbackId = Math.max(1, Math.trunc(Number(callbackIdValue) || 0));
  if (!callbackId) return false;
  const thread = state.engine.global.newThread();
  const threadIndex = state.engine.global.getTop();
  try {
    thread.loadString(`return __nukefireDropCallback(${callbackId})`, `@NukeFire/${sessionId}/drop-callback/${callbackId}`);
    const result = await thread.run(0, { timeout: state.softTimeoutMs });
    return Array.from(result)[0] === true;
  } catch {
    return false;
  } finally {
    try { state.engine.global.remove(threadIndex); } catch {}
  }
}

async function describeSession(rawSessionId) {
  const sessionId = normalizeSessionId(rawSessionId);
  const state = sessions.get(sessionId);
  if (!state) return null;
  return {
    sessionId,
    luaVersion: state.luaVersion,
    baselineBytes: state.baselineBytes,
    memoryAllowanceBytes: state.memoryAllowanceBytes,
    memoryUsedBytes: state.engine.global.getMemoryUsed(),
    memoryMaxBytes: state.engine.global.getMemoryMax(),
    softTimeoutMs: state.softTimeoutMs
  };
}

async function shutdown() {
  for (const sessionId of Array.from(sessions.keys())) await closeSession(sessionId);
}

parentPort.on('message', async (message = {}) => {
  const requestId = Number(message.requestId);
  try {
    let result;
    switch (message.op) {
      case 'ping':
        result = { ok: true, runtime: 'wasmoon', wasmoonVersion: '1.16.0' };
        break;
      case 'create':
        result = await createSession(message.sessionId, message.options);
        break;
      case 'execute':
        result = await execute(message.sessionId, message.script, message.options, message.hostContext, requestId);
        break;
      case 'callback':
        result = await invokeCallback(message.sessionId, message.callbackId, message.context, message.options, message.hostContext, requestId);
        break;
      case 'drop-callback':
        result = await dropCallback(message.sessionId, message.callbackId);
        break;
      case 'describe':
        result = await describeSession(message.sessionId);
        break;
      case 'close-session':
        result = await closeSession(normalizeSessionId(message.sessionId));
        break;
      case 'shutdown':
        await shutdown();
        result = true;
        break;
      default:
        throw new Error(`unknown Lua worker operation: ${String(message.op || '')}`);
    }
    postResponse(requestId, { ok: true, result });
  } catch (error) {
    postResponse(requestId, { ok: false, error: normalizeError(error) });
  }
});
