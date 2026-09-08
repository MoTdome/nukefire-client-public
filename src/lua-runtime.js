
'use strict';

const path = require('node:path');
const { Worker } = require('node:worker_threads');

const DEFAULT_HARD_TIMEOUT_MS = 750;

class LuaRuntime {
  constructor(options = {}) {
    this.workerPath = options.workerPath || path.join(__dirname, 'lua-runtime-worker.js');
    this.hardTimeoutMs = Number(options.hardTimeoutMs) || DEFAULT_HARD_TIMEOUT_MS;
    this.onEcho = typeof options.onEcho === 'function' ? options.onEcho : () => {};
    this.onDiagnostic = typeof options.onDiagnostic === 'function' ? options.onDiagnostic : () => {};
    this.onSend = typeof options.onSend === 'function' ? options.onSend : () => {};
    this.onVariableSet = typeof options.onVariableSet === 'function' ? options.onVariableSet : () => {};
    this.onTableSet = typeof options.onTableSet === 'function' ? options.onTableSet : () => {};
    this.onSendGmcp = typeof options.onSendGmcp === 'function' ? options.onSendGmcp : () => {};
    this.worker = null;
    this.nextRequestId = 1;
    this.pending = new Map();
    this.closed = false;
    this.hardStopped = false;
  }

  async start() {
    if (this.closed) throw new Error('Lua runtime is closed');
    if (this.worker) return this.request('ping');
    const worker = new Worker(this.workerPath);
    this.worker = worker;
    this.hardStopped = false;
    worker.on('message', (message) => this.handleMessage(message));
    worker.on('error', (error) => this.handleWorkerFailure(error));
    worker.on('exit', (code) => {
      if (!this.closed && this.worker === worker) {
        this.handleWorkerFailure(new Error(`Lua worker exited with code ${code}`));
      }
    });
    return this.request('ping');
  }

  handleMessage(message = {}) {
    if (message.type === 'event') {
      const pending = this.pending.get(Number(message.requestId));
      if (pending?.onEvent) {
        try { pending.onEvent(message); }
        catch (error) { this.onDiagnostic({ sessionId: message.sessionId, diagnostic: { type: 'host-event', message: error?.message || String(error) } }); }
      }
      if (message.event === 'echo') this.onEcho(message);
      else if (message.event === 'diagnostic') this.onDiagnostic(message);
      else if (message.event === 'send') this.onSend(message);
      else if (message.event === 'set-variable') this.onVariableSet(message);
      else if (message.event === 'set-table') this.onTableSet(message);
      else if (message.event === 'send-gmcp') this.onSendGmcp(message);
      return;
    }
    if (message.type !== 'response') return;
    const pending = this.pending.get(Number(message.requestId));
    if (!pending) return;
    this.pending.delete(Number(message.requestId));
    clearTimeout(pending.timer);
    if (message.ok) pending.resolve(message.result);
    else pending.reject(Object.assign(new Error(message.error?.message || 'Lua worker request failed'), {
      luaError: message.error || null
    }));
  }

  handleWorkerFailure(error) {
    const worker = this.worker;
    this.worker = null;
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
    if (worker) worker.removeAllListeners();
  }

  async hardStop(reason) {
    const worker = this.worker;
    this.hardStopped = true;
    this.worker = null;
    if (worker) {
      worker.removeAllListeners('exit');
      worker.removeAllListeners('error');
      worker.removeAllListeners('message');
      await worker.terminate().catch(() => {});
    }
    const error = Object.assign(new Error(reason || 'Lua worker hard-stopped'), {
      code: 'NUKEFIRE_LUA_HARD_TIMEOUT'
    });
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  request(op, payload = {}, options = {}) {
    if (this.closed) return Promise.reject(new Error('Lua runtime is closed'));
    if (!this.worker) return Promise.reject(new Error('Lua worker is not running'));
    const requestId = this.nextRequestId++;
    const hardTimeoutMs = Math.max(50, Number(options.hardTimeoutMs) || this.hardTimeoutMs);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!this.pending.has(requestId)) return;
        this.hardStop(`Lua worker exceeded hard watchdog (${hardTimeoutMs}ms)`).catch(() => {});
      }, hardTimeoutMs);
      this.pending.set(requestId, {
        resolve,
        reject,
        timer,
        onEvent: typeof options.onEvent === 'function' ? options.onEvent : null
      });
      this.worker.postMessage({ requestId, op, ...payload });
    });
  }

  createSession(sessionId, options = {}) {
    return this.request('create', { sessionId, options });
  }

  execute(sessionId, script, options = {}, hostContext = {}, onEvent = null) {
    const hardTimeoutMs = Number(options.hardTimeoutMs) || this.hardTimeoutMs;
    return this.request('execute', { sessionId, script, options, hostContext }, { hardTimeoutMs, onEvent })
      .catch((error) => {
        if (error?.code === 'NUKEFIRE_LUA_HARD_TIMEOUT' || this.hardStopped) {
          return {
            ok: false,
            error: {
              type: 'hard-timeout',
              name: 'NukeFireLuaHardTimeout',
              message: error?.message || 'Lua worker hard-stopped',
              stack: ''
            }
          };
        }
        throw error;
      });
  }

  invokeCallback(sessionId, callbackId, context = {}, options = {}, hostContext = {}, onEvent = null) {
    const hardTimeoutMs = Number(options.hardTimeoutMs) || this.hardTimeoutMs;
    return this.request('callback', { sessionId, callbackId, context, options, hostContext }, { hardTimeoutMs, onEvent })
      .catch((error) => {
        if (error?.code === 'NUKEFIRE_LUA_HARD_TIMEOUT' || this.hardStopped) {
          return { ok: false, error: { type: 'hard-timeout', name: 'NukeFireLuaHardTimeout', message: error?.message || 'Lua worker hard-stopped', stack: '' } };
        }
        throw error;
      });
  }

  dropCallback(sessionId, callbackId) {
    return this.request('drop-callback', { sessionId, callbackId });
  }

  describeSession(sessionId) {
    return this.request('describe', { sessionId });
  }

  closeSession(sessionId) {
    return this.request('close-session', { sessionId });
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    const worker = this.worker;
    this.worker = null;
    if (!worker) return;
    try {
      const requestId = this.nextRequestId++;
      worker.postMessage({ requestId, op: 'shutdown' });
    } catch {
      // Ignore: termination below is authoritative.
    }
    await worker.terminate().catch(() => {});
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Lua runtime closed'));
    }
    this.pending.clear();
  }
}

module.exports = { LuaRuntime };
