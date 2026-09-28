'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const MAX_TEXT_BYTES = 32 * 1024;
const DEFAULT_TIMEOUT_MS = 2500;
const RETRY_DELAY_MS = 1500;

function encodeBase64(value) {
  return Buffer.from(String(value ?? ''), 'utf8').toString('base64');
}
function decodeBase64(value) {
  try { return Buffer.from(String(value || ''), 'base64').toString('utf8'); } catch { return ''; }
}
function normalizeText(value) {
  const text = String(value ?? '').replace(/\u0000/gu, '');
  if (!text.trim()) return '';
  return Buffer.byteLength(text, 'utf8') <= MAX_TEXT_BYTES
    ? text
    : Buffer.from(text, 'utf8').subarray(0, MAX_TEXT_BYTES).toString('utf8');
}
function encodeCommand(opValue, idValue, options = {}) {
  const op = String(opValue || '').toUpperCase();
  const id = Math.max(1, Number(idValue) || 1);
  if (op === 'HELLO' || op === 'STATUS' || op === 'STOP') return `${op}\t${id}\n`;
  if (op === 'SPEAK' || op === 'OUTPUT') {
    const text = normalizeText(options.text);
    if (!text) throw new Error('Native Reader text is empty.');
    return `${op}\t${id}\t${options.interrupt === true ? '1' : '0'}\t${encodeBase64(text)}\n`;
  }
  throw new Error(`Unsupported Native Reader bridge operation: ${op}`);
}
function parseResponse(lineValue) {
  const line = String(lineValue || '').replace(/\r?\n$/u, '');
  const parts = line.split('\t');
  const kind = parts[0];
  const id = Number(parts[1]);
  if (!Number.isInteger(id) || id <= 0) return null;
  if (kind === 'OK') {
    return { ok: true, id, operation: String(parts[2] || ''), backend: decodeBase64(parts[3] || ''), features: String(parts[4] || '') };
  }
  if (kind === 'ERR') {
    return { ok: false, id, code: String(parts[2] || 'bridge_error'), error: decodeBase64(parts[3] || '') || 'Native Reader bridge operation failed.' };
  }
  return null;
}
function resolveBridgeExecutable(options = {}) {
  const platform = options.platform || process.platform;
  if (platform !== 'win32') return '';
  const explicit = String(options.executablePath || options.env?.NUKEFIRE_READER_BRIDGE || '').trim();
  if (explicit) return explicit;
  const appRoot = options.appRoot || path.resolve(__dirname, '..');
  if (options.isPackaged) {
    const resourcesPath = options.resourcesPath || process.resourcesPath;
    return path.join(resourcesPath, 'native-reader', 'nukefire-reader-bridge.exe');
  }
  return path.join(appRoot, 'native', 'reader-bridge', 'dist', 'win32-x64', 'nukefire-reader-bridge.exe');
}

class NativeReaderBridge {
  constructor(options = {}) {
    this.platform = options.platform || process.platform;
    this.appRoot = options.appRoot || path.resolve(__dirname, '..');
    this.resourcesPath = options.resourcesPath || process.resourcesPath;
    this.isPackaged = options.isPackaged === true;
    this.env = options.env || process.env;
    this.executablePath = resolveBridgeExecutable({
      platform: this.platform, appRoot: this.appRoot, resourcesPath: this.resourcesPath,
      isPackaged: this.isPackaged, executablePath: options.executablePath, env: this.env
    });
    this.spawnImpl = options.spawnImpl || spawn;
    this.fileExists = options.fileExists || fs.existsSync;
    this.requestTimeoutMs = Math.max(250, Number(options.requestTimeoutMs) || DEFAULT_TIMEOUT_MS);
    this.child = null;
    this.starting = null;
    this.stdoutCarry = '';
    this.pending = new Map();
    this.nextId = 1;
    this.retryAfter = 0;
    this.state = {
      available: false, backend: '', features: '', transport: 'prism-helper',
      reason: this.platform === 'win32' ? 'not-started' : 'unsupported-platform',
      pid: 0, restarts: 0, reconnects: 0,
      lastFailure: '', lastConnectedAt: 0
    };
  }

  snapshot() {
    return { ...this.state, executablePresent: Boolean(this.executablePath && this.fileExists(this.executablePath)) };
  }
  async start() {
    if (this.platform !== 'win32') return this.snapshot();
    if (this.child && this.state.available) return this.snapshot();
    if (this.starting) return this.starting;
    if (Date.now() < this.retryAfter) return this.snapshot();
    if (!this.executablePath || !this.fileExists(this.executablePath)) {
      this.state = { ...this.state, available: false, reason: 'helper-missing', pid: 0 };
      this.retryAfter = Date.now() + RETRY_DELAY_MS;
      return this.snapshot();
    }
    this.starting = this._startNow().finally(() => { this.starting = null; });
    return this.starting;
  }
  async _startNow() {
    this._disposeChild();
    let child;
    try {
      child = this.spawnImpl(this.executablePath, [], { windowsHide: true, stdio: ['pipe','pipe','pipe'], env: this.env });
    } catch (error) {
      this.state = { ...this.state, available: false, reason: error?.message || 'spawn-failed', pid: 0 };
      this.retryAfter = Date.now() + RETRY_DELAY_MS;
      return this.snapshot();
    }
    this.child = child;
    this.stdoutCarry = '';
    this.state = { ...this.state, available: false, reason: 'starting', pid: Number(child.pid) || 0 };
    child.stdout?.on?.('data', (chunk) => this._onStdout(chunk));
    child.stderr?.on?.('data', () => {});
    child.on?.('error', (error) => this._onChildFailure(child, error?.message || 'helper-error'));
    child.on?.('exit', (code, signal) => this._onChildFailure(child, `helper-exit:${code ?? 'null'}:${signal || ''}`));
    const response = await this._requestRaw('HELLO');
    if (!response.ok) {
      this._onChildFailure(child, response.error || response.code || 'backend-unavailable');
      return this.snapshot();
    }
    this.state = {
      ...this.state,
      available: true,
      backend: response.backend || 'Unknown',
      features: response.features || '',
      reason: '',
      lastFailure: '',
      lastConnectedAt: Date.now(),
      pid: Number(child.pid) || 0
    };
    return this.snapshot();
  }
  _onStdout(chunk) {
    this.stdoutCarry += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk || '');
    for (;;) {
      const newline = this.stdoutCarry.indexOf('\n');
      if (newline < 0) break;
      const line = this.stdoutCarry.slice(0, newline + 1);
      this.stdoutCarry = this.stdoutCarry.slice(newline + 1);
      const response = parseResponse(line);
      if (!response) continue;
      const pending = this.pending.get(response.id);
      if (!pending) continue;
      this.pending.delete(response.id);
      clearTimeout(pending.timer);
      pending.resolve(response);
    }
  }
  _failPending(code, error) {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.resolve({ ok: false, id, code, error });
    }
    this.pending.clear();
  }
  _onChildFailure(sourceChild, reason) {
    if (sourceChild && sourceChild !== this.child) return;
    const hadChild = Boolean(this.child);
    this._disposeChild(sourceChild || this.child);
    if (hadChild) this.state.restarts = Number(this.state.restarts || 0) + 1;
    const failure = String(reason || 'helper-unavailable');
    this.state = {
      ...this.state,
      available: false,
      backend: '',
      features: '',
      reason: failure,
      lastFailure: failure,
      pid: 0
    };
    this.retryAfter = Date.now() + RETRY_DELAY_MS;
    this._failPending('helper-unavailable', failure);
  }
  _disposeChild(sourceChild = this.child) {
    const child = sourceChild;
    if (!child) return;
    if (child === this.child) this.child = null;
    try { child.stdin?.end?.(); } catch {}
    try { child.kill?.(); } catch {}
  }
  _requestRaw(op, options = {}) {
    const child = this.child;
    if (!child?.stdin || child.stdin.destroyed) {
      return Promise.resolve({ ok: false, id: 0, code: 'helper-unavailable', error: 'Native Reader helper is not running.' });
    }
    const id = this.nextId++;
    let command;
    try { command = encodeCommand(op, id, options); }
    catch (error) { return Promise.resolve({ ok: false, id, code: 'invalid-request', error: error?.message || String(error) }); }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ ok: false, id, code: 'timeout', error: `Native Reader ${op} timed out.` });
      }, this.requestTimeoutMs);
      this.pending.set(id, { resolve, timer });
      try { child.stdin.write(command, 'utf8'); }
      catch (error) {
        clearTimeout(timer); this.pending.delete(id);
        resolve({ ok: false, id, code: 'write-failed', error: error?.message || String(error) });
      }
    });
  }
  async request(op, options = {}) {
    const status = await this.start();
    if (!status.available) return { ok: false, available: false, backend: '', error: status.reason, status };
    const response = await this._requestRaw(op, options);
    if (!response.ok) {
      if (['backend-failed', 'helper-unavailable', 'timeout', 'write-failed'].includes(response.code)) {
        this._onChildFailure(this.child, response.error || response.code);
      }
      return { ...response, available: false, backend: this.state.backend, status: this.snapshot() };
    }
    if (response.backend) {
      this.state.backend = response.backend;
      this.state.features = response.features || this.state.features;
    }
    return { ...response, available: true, backend: this.state.backend, status: this.snapshot() };
  }
  output(text, options = {}) { return this.request('OUTPUT', { text, interrupt: options.interrupt === true }); }
  speak(text, options = {}) { return this.request('SPEAK', { text, interrupt: options.interrupt === true }); }
  stop() { return this.request('STOP'); }
  async getStatus(options = {}) {
    const started = await this.start();
    if (!started.available || options.probe === false) return started;
    const response = await this._requestRaw('STATUS');
    if (response.ok) {
      this.state.backend = response.backend || this.state.backend;
      this.state.features = response.features || this.state.features;
      this.state.reason = '';
      this.state.lastFailure = '';
      return this.snapshot();
    }
    if (['backend-failed', 'helper-unavailable', 'timeout', 'write-failed'].includes(response.code)) {
      this._onChildFailure(this.child, response.error || response.code);
    }
    return this.snapshot();
  }
  async reconnect() {
    if (this.platform !== 'win32') return this.snapshot();
    if (this.starting) {
      try { await this.starting; } catch {}
    }
    const oldChild = this.child;
    if (oldChild) this._disposeChild(oldChild);
    this._failPending('reconnecting', 'Native Reader bridge is reconnecting.');
    this.retryAfter = 0;
    this.state = {
      ...this.state,
      available: false,
      backend: '',
      features: '',
      reason: 'reconnecting',
      pid: 0,
      reconnects: Number(this.state.reconnects || 0) + 1
    };
    return this.start();
  }
  close() {
    this._disposeChild();
    this._failPending('closed', 'Native Reader bridge closed.');
    this.state = { ...this.state, available: false, backend: '', features: '', reason: 'closed', pid: 0 };
  }
}
module.exports = { MAX_TEXT_BYTES, NativeReaderBridge, encodeCommand, parseResponse, resolveBridgeExecutable };
