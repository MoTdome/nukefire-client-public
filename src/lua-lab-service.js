'use strict';

const { LuaRuntime } = require('./lua-runtime');

const MAX_LUA_SCRIPT_BYTES = 64 * 1024;

function normalizeSessionId(value) {
  const id = String(value || '').trim();
  if (!id || id.length > 96 || !/^[A-Za-z0-9_.:@-]+$/u.test(id)) {
    throw new Error('Invalid Lua session id.');
  }
  return id;
}

function luaChunkName(executionContext = {}) {
  const scriptName = String(executionContext?.scriptName || '').trim();
  if (/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*){0,15}$/u.test(scriptName) && scriptName.length <= 160) {
    return `script/${scriptName}`;
  }
  const source = String(executionContext?.source || 'command').trim().replace(/[^A-Za-z0-9_.:@-]/gu, '_').slice(0, 64) || 'command';
  return `source/${source}`;
}

class LuaLabService {
  constructor(options = {}) {
    this.hardTimeoutMs = Math.max(100, Number(options.hardTimeoutMs) || 900);
    this.getHostContext = typeof options.getHostContext === 'function'
      ? options.getHostContext
      : (sessionId) => ({ session: { id: sessionId }, variables: [] });
    this.sendCommand = typeof options.sendCommand === 'function'
      ? options.sendCommand
      : () => ({ queued: false, reason: 'unavailable' });
    this.setVariable = typeof options.setVariable === 'function'
      ? options.setVariable
      : () => null;
    this.setTable = typeof options.setTable === 'function'
      ? options.setTable
      : () => null;
    this.sendGmcp = typeof options.sendGmcp === 'function'
      ? options.sendGmcp
      : () => ({ sent: false, reason: 'unavailable' });
    this.executeCommand = typeof options.executeCommand === 'function'
      ? options.executeCommand
      : () => ({ handled: true, deliveries: [], messages: ['Lua execute() is unavailable.'] });
    this.registerAutomation = typeof options.registerAutomation === 'function'
      ? options.registerAutomation
      : () => ({ registered: false, reason: 'unavailable' });
    this.controlAutomation = typeof options.controlAutomation === 'function'
      ? options.controlAutomation
      : () => ({ changed: false, reason: 'unavailable' });
    this.raiseEvent = typeof options.raiseEvent === 'function'
      ? options.raiseEvent
      : () => ({ fired: 0 });
    this.raiseGlobalEvent = typeof options.raiseGlobalEvent === 'function'
      ? options.raiseGlobalEvent
      : () => ({ fired: 0 });
    this.reconnect = typeof options.reconnect === 'function'
      ? options.reconnect
      : () => ({ requested: false });
    this.paneCommand = typeof options.paneCommand === 'function'
      ? options.paneCommand
      : () => ({ ok: false, reason: 'unavailable' });
    this.speedwalk = typeof options.speedwalk === 'function'
      ? options.speedwalk
      : () => ({ queued: false, reason: 'unavailable' });
    this.setCommandLine = typeof options.setCommandLine === 'function'
      ? options.setCommandLine
      : () => ({ changed: false, reason: 'unavailable' });
    this.setStorage = typeof options.setStorage === 'function'
      ? options.setStorage
      : () => ({ stored: false, reason: 'unavailable' });
    this.deleteStorage = typeof options.deleteStorage === 'function'
      ? options.deleteStorage
      : () => ({ deleted: false, reason: 'unavailable' });
    this.setModule = typeof options.setModule === 'function'
      ? options.setModule
      : () => ({ stored: false, reason: 'unavailable' });
    this.deleteModule = typeof options.deleteModule === 'function'
      ? options.deleteModule
      : () => ({ deleted: false, reason: 'unavailable' });
    this.runtime = options.runtime || new LuaRuntime({ hardTimeoutMs: this.hardTimeoutMs });
    this.sessions = new Set();
    this.sessionChains = new Map();
  }

  async ensureRuntime() {
    if (this.runtime.worker) return;
    await this.runtime.start();
    this.sessions.clear();
  }

  async ensureSession(sessionId) {
    await this.ensureRuntime();
    if (this.sessions.has(sessionId)) return;
    await this.runtime.createSession(sessionId, {
      softTimeoutMs: 75,
      memoryAllowanceBytes: 2 * 1024 * 1024
    });
    this.sessions.add(sessionId);
  }

  handleHostEvent(sessionId, event, executionContext, collections = {}) {
    if (event?.sessionId !== sessionId) return;
    if (event.event === 'echo') collections.echoes?.push(event.args || []);
    else if (event.event === 'send') collections.sends?.push(this.sendCommand(sessionId, String(event.command || ''), { ...executionContext, showCommand: event.show !== false }));
    else if (event.event === 'set-variable') collections.variableSets?.push(this.setVariable(sessionId, String(event.name || ''), String(event.value ?? '')));
    else if (event.event === 'set-table') collections.tableSets?.push(this.setTable(sessionId, String(event.name || ''), Array.isArray(event.records) ? event.records : []));
    else if (event.event === 'send-gmcp') collections.gmcpSends?.push(this.sendGmcp(sessionId, String(event.command || '')));
    else if (event.event === 'execute-command') collections.executions?.push(this.executeCommand(sessionId, String(event.command || ''), executionContext));
    else if (event.event === 'register-automation') collections.automations?.push(this.registerAutomation(sessionId, event.automation || {}, executionContext));
    else if (event.event === 'control-automation') collections.automations?.push(this.controlAutomation(sessionId, event.automation || {}, executionContext));
    else if (event.event === 'raise-event') collections.automations?.push(this.raiseEvent(sessionId, String(event.eventName || ''), String(event.argsJson || '[]'), executionContext));
    else if (event.event === 'raise-global-event') collections.automations?.push(this.raiseGlobalEvent(sessionId, String(event.eventName || ''), String(event.argsJson || '[]'), executionContext));
    else if (event.event === 'reconnect') collections.automations?.push(this.reconnect(sessionId, executionContext));
    else if (event.event === 'pane-command') collections.paneUpdates?.push(this.paneCommand(sessionId, event.command || {}, executionContext));
    else if (event.event === 'speedwalk') this.speedwalk(sessionId, String(event.route || ''), event.options || {}, executionContext);
    else if (event.event === 'command-line-set') this.setCommandLine(sessionId, String(event.text || ''), executionContext);
    else if (event.event === 'storage-set') collections.storageChanges?.push(this.setStorage(sessionId, String(event.key || ''), String(event.json || 'null')));
    else if (event.event === 'storage-delete') collections.storageChanges?.push(this.deleteStorage(sessionId, String(event.key || '')));
    else if (event.event === 'module-set') collections.moduleChanges?.push(this.setModule(sessionId, String(event.name || ''), String(event.source || '')));
    else if (event.event === 'module-delete') collections.moduleChanges?.push(this.deleteModule(sessionId, String(event.name || '')));
  }

  execute(sessionIdValue, scriptValue, executionContext = {}) {
    const sessionId = normalizeSessionId(sessionIdValue);
    const task = async () => {
      const script = String(scriptValue ?? '');
      if (!script.trim()) {
        return { ok: false, error: { type: 'usage', message: 'Lua script is empty.' }, echoes: [], sends: [], variableSets: [], tableSets: [], gmcpSends: [], executions: [] };
      }
      if (Buffer.byteLength(script, 'utf8') > MAX_LUA_SCRIPT_BYTES) {
        return { ok: false, error: { type: 'limit', message: `Lua script exceeds ${MAX_LUA_SCRIPT_BYTES} bytes.` }, echoes: [], sends: [], variableSets: [], tableSets: [], gmcpSends: [], executions: [] };
      }

      await this.ensureSession(sessionId);
      const echoes = [];
      const sends = [];
      const variableSets = [];
      const tableSets = [];
      const gmcpSends = [];
      const executions = [];
      const automations = [];
      const paneUpdates = [];
      const storageChanges = [];
      const moduleChanges = [];
      const hostContext = this.getHostContext(sessionId) || { session: { id: sessionId }, variables: [] };
      const result = await this.runtime.execute(sessionId, script, {
        softTimeoutMs: 75,
        hardTimeoutMs: this.hardTimeoutMs,
        chunkName: luaChunkName(executionContext)
      }, hostContext, (event) => {
        this.handleHostEvent(sessionId, event, executionContext, { echoes, sends, variableSets, tableSets, gmcpSends, executions, automations, paneUpdates, storageChanges, moduleChanges });
      });
      if (!this.runtime.worker) this.sessions.clear();
      return { ...result, echoes, sends, variableSets, tableSets, gmcpSends, executions, automations, paneUpdates, storageChanges, moduleChanges };
    };

    const previous = this.sessionChains.get(sessionId) || Promise.resolve();
    const pending = previous.then(task, task);
    const tail = pending.then(() => undefined, () => undefined);
    this.sessionChains.set(sessionId, tail);
    tail.finally(() => {
      if (this.sessionChains.get(sessionId) === tail) this.sessionChains.delete(sessionId);
    });
    return pending;
  }

  invokeCallback(sessionIdValue, callbackIdValue, contextValue = {}, executionContext = {}) {
    const sessionId = normalizeSessionId(sessionIdValue);
    const callbackId = Math.max(1, Math.trunc(Number(callbackIdValue) || 0));
    if (!callbackId) return Promise.resolve({ ok: false, error: { type: 'usage', message: 'Invalid Lua callback id.' }, values: [] });
    const task = async () => {
      await this.ensureSession(sessionId);
      const echoes = [];
      const sends = [];
      const variableSets = [];
      const tableSets = [];
      const gmcpSends = [];
      const executions = [];
      const automations = [];
      const paneUpdates = [];
      const storageChanges = [];
      const moduleChanges = [];
      const hostContext = this.getHostContext(sessionId) || { session: { id: sessionId }, variables: [] };
      const result = await this.runtime.invokeCallback(sessionId, callbackId, contextValue || {}, {
        softTimeoutMs: 75,
        hardTimeoutMs: this.hardTimeoutMs
      }, hostContext, (event) => {
        this.handleHostEvent(sessionId, event, executionContext, { echoes, sends, variableSets, tableSets, gmcpSends, executions, automations, paneUpdates, storageChanges, moduleChanges });
      });
      if (!this.runtime.worker) this.sessions.clear();
      return { ...result, echoes, sends, variableSets, tableSets, gmcpSends, executions, automations, paneUpdates, storageChanges, moduleChanges };
    };
    const previous = this.sessionChains.get(sessionId) || Promise.resolve();
    const pending = previous.then(task, task);
    const tail = pending.then(() => undefined, () => undefined);
    this.sessionChains.set(sessionId, tail);
    tail.finally(() => { if (this.sessionChains.get(sessionId) === tail) this.sessionChains.delete(sessionId); });
    return pending;
  }

  async describeSession(sessionIdValue) {
    const sessionId = normalizeSessionId(sessionIdValue);
    if (!this.runtime.worker || !this.sessions.has(sessionId)) {
      return { sessionId, running: false, luaVersion: '', baselineBytes: 0, memoryAllowanceBytes: 0 };
    }
    try {
      const described = await this.runtime.describeSession(sessionId);
      return { ...(described || {}), sessionId, running: true };
    } catch (error) {
      return { sessionId, running: false, luaVersion: '', baselineBytes: 0, memoryAllowanceBytes: 0, error: String(error?.message || error || 'Lua status unavailable').slice(0, 512) };
    }
  }

  async forgetCallback(sessionIdValue, callbackIdValue) {
    const sessionId = normalizeSessionId(sessionIdValue);
    const callbackId = Math.max(1, Math.trunc(Number(callbackIdValue) || 0));
    if (!callbackId || !this.runtime.worker || !this.sessions.has(sessionId)) return false;
    try { return await this.runtime.dropCallback(sessionId, callbackId); }
    catch { return false; }
  }

  async closeSession(sessionIdValue) {
    const sessionId = normalizeSessionId(sessionIdValue);
    const chain = this.sessionChains.get(sessionId);
    if (chain) await chain.catch(() => {});
    this.sessionChains.delete(sessionId);
    this.sessions.delete(sessionId);
    if (!this.runtime.worker) return false;
    return this.runtime.closeSession(sessionId);
  }

  async close() {
    await Promise.allSettled([...this.sessionChains.values()]);
    this.sessionChains.clear();
    this.sessions.clear();
    await this.runtime.close();
  }
}

module.exports = { LuaLabService, MAX_LUA_SCRIPT_BYTES };
