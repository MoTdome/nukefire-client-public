
'use strict';

const { parentPort } = require('node:worker_threads');
const wasmoonPath = String(process.env.NUKEFIRE_LUA_WASMOON_PATH || '').trim();
const { LuaFactory, LuaLibraries } = wasmoonPath ? require(wasmoonPath) : require('wasmoon');

const DEFAULT_SOFT_TIMEOUT_MS = 50;
const DEFAULT_MEMORY_ALLOWANCE = 2 * 1024 * 1024;
const MAX_SCRIPT_BYTES = 64 * 1024;
const MAX_SESSION_ID = 96;
const MAX_ECHO_ARGS = 16;
const MAX_TEXT = 4096;
const MAX_SESSIONS = 16;
const MAX_COMMAND_BYTES = 4096;
const VARIABLE_NAME_MAX = 96;
const VARIABLE_VALUE_MAX = 4096;
const FORBIDDEN_VARIABLE_NAMES = new Set(['__proto__', 'constructor', 'prototype']);
const FORBIDDEN_EXTENDED_NAME_CHARACTERS = /[\u0000-\u001F\u007F{}\\;$%]/u;
const TABLE_KEY_FORBIDDEN_CHARACTERS = /[\u0000-\u001F\u007F{}\[\]\\;$%]/u;
const MAX_TABLE_DEPTH = 4;

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
  return { base, name: `${base}${keys.map((key) => `[${key}]`).join('')}` };
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

const sessions = new Map();
let factory = null;

function boundedText(value, limit = MAX_TEXT) {
  const text = String(value ?? '');
  return text.length <= limit ? text : `${text.slice(0, limit)}…`;
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

function normalizeError(error) {
  const message = boundedText(error?.message || error || 'Lua execution failed');
  const lower = message.toLowerCase();
  let type = 'runtime';
  if (lower.includes('timeout')) type = 'timeout';
  else if (lower.includes('memory')) type = 'memory';
  else if (lower.includes('syntax')) type = 'syntax';
  return {
    type,
    name: boundedText(error?.name || 'Error', 128),
    message,
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

  const hostState = {
    variables: new Map(),
    session: { id: sessionId, name: '', characterName: '', role: '', host: '', port: 0, connected: false }
  };
  const hostEcho = (...args) => {
    postEvent('echo', {
      sessionId,
      args: args.slice(0, MAX_ECHO_ARGS).map((value) => safePrimitive(value, 2048))
    });
    return undefined;
  };
  const hostSend = (value) => {
    const command = normalizeCommand(value);
    if (!command) return false;
    postEvent('send', { sessionId, command });
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
    postEvent('set-variable', { sessionId, name, value });
    return true;
  };
  const hostSessionField = (fieldValue) => {
    const field = String(fieldValue || '');
    if (!Object.hasOwn(hostState.session, field)) return null;
    return safePrimitive(hostState.session[field], 1024);
  };

  const installHostApi = () => {
    engine.global.set('echo', hostEcho);
    engine.global.set('print', hostEcho);
    engine.global.set('send', hostSend);
    engine.global.set('__nukefireGetVariable', hostGetVariable);
    engine.global.set('setVariable', hostSetVariable);
    engine.global.set('__nukefireSessionField', hostSessionField);
    engine.doStringSync(`
      do
        local variableValue = __nukefireGetVariable
        local sessionField = __nukefireSessionField
        function getVariable(name)
          local value = variableValue(name)
          if value == false then return nil end
          return value
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
        __nukefireGetVariable = nil
        __nukefireSessionField = nil
      end
    `);
  };
  installHostApi();

  // Base library is useful, but these code/file-loading surfaces are not part of
  // the Beta.60a.0 contract. Remove them before any user script executes.
  engine.doStringSync(`
    dofile = nil
    loadfile = nil
    load = nil
    loadstring = nil
    require = nil
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

async function execute(rawSessionId, script, options = {}, hostContext = {}) {
  const sessionId = normalizeSessionId(rawSessionId);
  const state = sessions.get(sessionId);
  if (!state) throw new Error(`Lua session not found: ${sessionId}`);

  const source = String(script ?? '');
  const variableRecords = Array.isArray(hostContext?.variables) ? hostContext.variables.slice(0, 256) : [];
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
    connected: sessionSource.connected === true
  };
  // Restore the host API before each execution so a script cannot permanently
  // replace send/getVariable/setVariable/getSession for subsequent commands.
  state.installHostApi();

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
    thread.loadString(source, `@NukeFire/${sessionId}`);
    const result = await thread.run(0, { timeout: softTimeoutMs });
    return {
      ok: true,
      values: Array.from(result).slice(0, 8).map((value) => safePrimitive(value))
    };
  } catch (error) {
    const normalized = normalizeError(error);
    postEvent('diagnostic', { sessionId, diagnostic: normalized });
    return { ok: false, error: normalized };
  } finally {
    try {
      state.engine.global.remove(threadIndex);
    } catch {
      // A hard memory failure can make stack cleanup impossible. The parent-side
      // watchdog remains the final containment boundary for the lab runtime.
    }
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
        result = await execute(message.sessionId, message.script, message.options, message.hostContext);
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
