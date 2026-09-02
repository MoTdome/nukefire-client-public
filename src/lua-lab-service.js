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
    this.runtime = new LuaRuntime({ hardTimeoutMs: this.hardTimeoutMs });
    this.sessions = new Set();
    this.executionChain = Promise.resolve();
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

  execute(sessionIdValue, scriptValue) {
    const task = async () => {
      const sessionId = normalizeSessionId(sessionIdValue);
      const script = String(scriptValue ?? '');
      if (!script.trim()) {
        return { ok: false, error: { type: 'usage', message: 'Lua script is empty.' }, echoes: [], sends: [], variableSets: [] };
      }
      if (Buffer.byteLength(script, 'utf8') > MAX_LUA_SCRIPT_BYTES) {
        return { ok: false, error: { type: 'limit', message: `Lua script exceeds ${MAX_LUA_SCRIPT_BYTES} bytes.` }, echoes: [], sends: [], variableSets: [] };
      }

      await this.ensureSession(sessionId);
      const echoes = [];
      const sends = [];
      const variableSets = [];
      const previousEcho = this.runtime.onEcho;
      const previousDiagnostic = this.runtime.onDiagnostic;
      const previousSend = this.runtime.onSend;
      const previousVariableSet = this.runtime.onVariableSet;
      this.runtime.onEcho = (event) => {
        if (event?.sessionId === sessionId) echoes.push(event.args || []);
      };
      this.runtime.onDiagnostic = () => {};
      this.runtime.onSend = (event) => {
        if (event?.sessionId !== sessionId) return;
        sends.push(this.sendCommand(sessionId, String(event.command || '')));
      };
      this.runtime.onVariableSet = (event) => {
        if (event?.sessionId !== sessionId) return;
        variableSets.push(this.setVariable(sessionId, String(event.name || ''), String(event.value ?? '')));
      };
      try {
        const hostContext = this.getHostContext(sessionId) || { session: { id: sessionId }, variables: [] };
        const result = await this.runtime.execute(sessionId, script, {
          softTimeoutMs: 75,
          hardTimeoutMs: this.hardTimeoutMs
        }, hostContext);
        if (!this.runtime.worker) this.sessions.clear();
        return { ...result, echoes, sends, variableSets };
      } finally {
        this.runtime.onEcho = previousEcho;
        this.runtime.onDiagnostic = previousDiagnostic;
        this.runtime.onSend = previousSend;
        this.runtime.onVariableSet = previousVariableSet;
      }
    };
    const pending = this.executionChain.then(task, task);
    this.executionChain = pending.then(() => undefined, () => undefined);
    return pending;
  }

  async closeSession(sessionIdValue) {
    const sessionId = normalizeSessionId(sessionIdValue);
    this.sessions.delete(sessionId);
    if (!this.runtime.worker) return false;
    return this.runtime.closeSession(sessionId);
  }

  async close() {
    this.sessions.clear();
    await this.runtime.close();
  }
}

module.exports = { LuaLabService, MAX_LUA_SCRIPT_BYTES };
