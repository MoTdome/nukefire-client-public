'use strict';

const fs = require('node:fs');
const path = require('node:path');

const STORE_VERSION = 1;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_STORAGE_KEYS = 256;
const MAX_SETTINGS_KEYS = 128;
const MAX_STORAGE_BYTES = 256 * 1024;
const MAX_SETTINGS_BYTES = 128 * 1024;
const MAX_MODULES = 64;
const MAX_MODULE_BYTES = 64 * 1024;
const MAX_MODULE_TOTAL_BYTES = 512 * 1024;
const MAX_SCRIPTS = 32;
const MAX_VALUE_DEPTH = 8;
const MAX_VALUE_KEYS = 256;
const MAX_STRING_BYTES = 32 * 1024;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function byteLength(value) { return Buffer.byteLength(String(value ?? ''), 'utf8'); }

function normalizeSessionId(value) {
  const text = String(value || '').normalize('NFKC').trim();
  return text && text.length <= 96 && /^[A-Za-z0-9_.:@-]+$/u.test(text) ? text : '';
}

function normalizeKey(value) {
  const text = String(value || '').normalize('NFKC').trim();
  if (!text || text.length > 160 || /[\u0000-\u001F\u007F]/u.test(text) || FORBIDDEN_KEYS.has(text)) return '';
  return text;
}

function normalizeModuleName(value) {
  const source = String(value || '').normalize('NFKC').trim().replace(/\\/gu, '/');
  if (!source || source.length > 160 || source.startsWith('/') || source.endsWith('/') || source.includes('..')) return '';
  const parts = source.replace(/\//gu, '.').split('.').filter(Boolean);
  if (!parts.length || parts.length > 16) return '';
  if (parts.some((part) => !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(part))) return '';
  return parts.join('.');
}

function sanitizeJsonValue(value, depth = 0, counter = { keys: 0 }) {
  if (depth > MAX_VALUE_DEPTH) throw new Error('Lua managed value exceeds maximum depth.');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Lua managed values cannot contain non-finite numbers.');
    return value;
  }
  if (typeof value === 'string') {
    if (byteLength(value) > MAX_STRING_BYTES) throw new Error('Lua managed string exceeds size limit.');
    return value;
  }
  if (!value || typeof value !== 'object') throw new Error('Lua managed values must be JSON-compatible.');
  if (Array.isArray(value)) {
    if (value.length > MAX_VALUE_KEYS) throw new Error('Lua managed array exceeds item limit.');
    return value.map((entry) => sanitizeJsonValue(entry, depth + 1, counter));
  }
  const output = Object.create(null);
  const entries = Object.entries(value);
  if (entries.length > MAX_VALUE_KEYS) throw new Error('Lua managed object exceeds key limit.');
  for (const [rawKey, child] of entries) {
    const key = normalizeKey(rawKey);
    if (!key) continue;
    counter.keys += 1;
    if (counter.keys > MAX_VALUE_KEYS * 4) throw new Error('Lua managed value contains too many keys.');
    output[key] = sanitizeJsonValue(child, depth + 1, counter);
  }
  return output;
}

function parseManagedJson(jsonValue) {
  const json = String(jsonValue ?? '');
  if (!json || byteLength(json) > 64 * 1024) throw new Error('Lua managed value exceeds encoded size limit.');
  return sanitizeJsonValue(JSON.parse(json));
}

function emptySessionState() {
  return { storage: Object.create(null), settings: Object.create(null), modules: Object.create(null), scripts: Object.create(null) };
}

function normalizeRecord(value) {
  const output = emptySessionState();
  const source = value && typeof value === 'object' ? value : {};
  for (const [rawKey, rawValue] of Object.entries(source.storage || {}).slice(0, MAX_STORAGE_KEYS)) {
    const key = normalizeKey(rawKey);
    if (!key) continue;
    try { output.storage[key] = sanitizeJsonValue(rawValue); } catch {}
  }
  for (const [rawKey, rawValue] of Object.entries(source.settings || {}).slice(0, MAX_SETTINGS_KEYS)) {
    const key = normalizeKey(rawKey);
    if (!key) continue;
    try { output.settings[key] = sanitizeJsonValue(rawValue); } catch {}
  }
  let moduleBytes = 0;
  for (const [rawName, rawSource] of Object.entries(source.modules || {}).slice(0, MAX_MODULES)) {
    const name = normalizeModuleName(rawName);
    const code = String(rawSource ?? '');
    const size = byteLength(code);
    if (!name || !code || size > MAX_MODULE_BYTES || moduleBytes + size > MAX_MODULE_TOTAL_BYTES) continue;
    output.modules[name] = code;
    moduleBytes += size;
  }
  for (const [rawName, rawMeta] of Object.entries(source.scripts || {}).slice(0, MAX_SCRIPTS)) {
    const name = normalizeModuleName(rawName);
    if (!name || !Object.hasOwn(output.modules, name)) continue;
    output.scripts[name] = Object.freeze({ autoRun: rawMeta?.autoRun === true });
  }
  return output;
}

function objectBytes(value) { return byteLength(JSON.stringify(value)); }

class LuaManagedStore {
  constructor(options = {}) {
    this.baseDirectory = path.resolve(String(options.baseDirectory || '.'));
    this.filePath = path.join(this.baseDirectory, String(options.filename || 'lua-managed-state.json'));
    this.sessions = Object.create(null);
    this.saveTimer = null;
    this.saveChain = Promise.resolve();
    this.dirty = false;
  }

  async load() {
    let text = '';
    try { text = await fs.promises.readFile(this.filePath, 'utf8'); }
    catch (error) { if (error?.code !== 'ENOENT') throw error; }
    if (!text) return this;
    if (byteLength(text) > MAX_FILE_BYTES) throw new Error('Lua managed state file exceeds safety limit.');
    let parsed;
    try { parsed = JSON.parse(text); } catch { return this; }
    const sessions = parsed?.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {};
    const next = Object.create(null);
    for (const [rawId, record] of Object.entries(sessions).slice(0, 24)) {
      const id = normalizeSessionId(rawId);
      if (id) next[id] = normalizeRecord(record);
    }
    this.sessions = next;
    return this;
  }

  record(sessionIdValue) {
    const sessionId = normalizeSessionId(sessionIdValue);
    if (!sessionId) return null;
    this.sessions[sessionId] ||= emptySessionState();
    return this.sessions[sessionId];
  }

  context(sessionIdValue) {
    const record = this.record(sessionIdValue) || emptySessionState();
    return {
      storageRecords: Object.entries(record.storage).map(([key, value]) => ({ key, json: JSON.stringify(value) })),
      settingRecords: Object.entries(record.settings).map(([key, value]) => ({ key, json: JSON.stringify(value) })),
      moduleRecords: Object.entries(record.modules).map(([name, source]) => ({ name, source }))
    };
  }

  setStorage(sessionIdValue, keyValue, jsonValue) {
    const record = this.record(sessionIdValue);
    const key = normalizeKey(keyValue);
    if (!record || !key) return { stored: false, reason: 'invalid-key' };
    let value;
    try { value = parseManagedJson(jsonValue); } catch (error) { return { stored: false, reason: String(error?.message || 'invalid-value') }; }
    const next = { ...record.storage, [key]: value };
    if (!Object.hasOwn(record.storage, key) && Object.keys(next).length > MAX_STORAGE_KEYS) return { stored: false, reason: 'storage-key-limit' };
    if (objectBytes(next) > MAX_STORAGE_BYTES) return { stored: false, reason: 'storage-size-limit' };
    record.storage = Object.assign(Object.create(null), next);
    this.scheduleSave();
    return { stored: true, key };
  }

  deleteStorage(sessionIdValue, keyValue) {
    const record = this.record(sessionIdValue);
    const key = normalizeKey(keyValue);
    if (!record || !key || !Object.hasOwn(record.storage, key)) return { deleted: false, key };
    delete record.storage[key];
    this.scheduleSave();
    return { deleted: true, key };
  }

  setSetting(sessionIdValue, keyValue, jsonValue) {
    const record = this.record(sessionIdValue);
    const key = normalizeKey(keyValue);
    if (!record || !key) return { stored: false, reason: 'invalid-key' };
    let value;
    try { value = parseManagedJson(jsonValue); } catch (error) { return { stored: false, reason: String(error?.message || 'invalid-value') }; }
    const next = { ...record.settings, [key]: value };
    if (!Object.hasOwn(record.settings, key) && Object.keys(next).length > MAX_SETTINGS_KEYS) return { stored: false, reason: 'settings-key-limit' };
    if (objectBytes(next) > MAX_SETTINGS_BYTES) return { stored: false, reason: 'settings-size-limit' };
    record.settings = Object.assign(Object.create(null), next);
    this.scheduleSave();
    return { stored: true, key };
  }

  setModule(sessionIdValue, nameValue, sourceValue) {
    const record = this.record(sessionIdValue);
    const name = normalizeModuleName(nameValue);
    const source = String(sourceValue ?? '');
    const bytes = byteLength(source);
    if (!record || !name || !source) return { stored: false, reason: 'invalid-module' };
    if (bytes > MAX_MODULE_BYTES) return { stored: false, reason: 'module-size-limit' };
    const next = { ...record.modules, [name]: source };
    if (!Object.hasOwn(record.modules, name) && Object.keys(next).length > MAX_MODULES) return { stored: false, reason: 'module-count-limit' };
    const total = Object.values(next).reduce((sum, code) => sum + byteLength(code), 0);
    if (total > MAX_MODULE_TOTAL_BYTES) return { stored: false, reason: 'module-total-size-limit' };
    record.modules = Object.assign(Object.create(null), next);
    this.scheduleSave();
    return { stored: true, name, bytes };
  }

  deleteModule(sessionIdValue, nameValue) {
    const record = this.record(sessionIdValue);
    const name = normalizeModuleName(nameValue);
    if (!record || !name || !Object.hasOwn(record.modules, name)) return { deleted: false, name };
    delete record.modules[name];
    if (Object.hasOwn(record.scripts, name)) delete record.scripts[name];
    this.scheduleSave();
    return { deleted: true, name };
  }

  scriptCatalog(sessionIdValue) {
    const record = this.record(sessionIdValue) || emptySessionState();
    return Object.keys(record.scripts)
      .filter((name) => Object.hasOwn(record.modules, name))
      .sort((a, b) => (a === 'main' ? -1 : b === 'main' ? 1 : a.localeCompare(b)))
      .map((name) => Object.freeze({
        name,
        autoRun: record.scripts[name]?.autoRun === true,
        bytes: byteLength(record.modules[name])
      }));
  }

  getScript(sessionIdValue, nameValue) {
    const record = this.record(sessionIdValue);
    const name = normalizeModuleName(nameValue);
    if (!record || !name || !Object.hasOwn(record.scripts, name) || !Object.hasOwn(record.modules, name)) return null;
    return Object.freeze({
      name,
      source: String(record.modules[name] || ''),
      autoRun: record.scripts[name]?.autoRun === true,
      bytes: byteLength(record.modules[name])
    });
  }

  setScript(sessionIdValue, nameValue, sourceValue, options = {}) {
    const record = this.record(sessionIdValue);
    const name = normalizeModuleName(nameValue);
    const source = String(sourceValue ?? '');
    const bytes = byteLength(source);
    if (!record || !name || !source.trim()) return { stored: false, reason: 'invalid-script' };
    if (bytes > MAX_MODULE_BYTES) return { stored: false, reason: 'script-size-limit' };
    if (!Object.hasOwn(record.scripts, name) && Object.keys(record.scripts).length >= MAX_SCRIPTS) return { stored: false, reason: 'script-count-limit' };
    const nextModules = { ...record.modules, [name]: source };
    if (!Object.hasOwn(record.modules, name) && Object.keys(nextModules).length > MAX_MODULES) return { stored: false, reason: 'module-count-limit' };
    const total = Object.values(nextModules).reduce((sum, code) => sum + byteLength(code), 0);
    if (total > MAX_MODULE_TOTAL_BYTES) return { stored: false, reason: 'module-total-size-limit' };
    record.modules = Object.assign(Object.create(null), nextModules);
    record.scripts[name] = Object.freeze({ autoRun: options.autoRun === true });
    this.scheduleSave();
    return { stored: true, script: this.getScript(sessionIdValue, name) };
  }

  setScriptAutoRun(sessionIdValue, nameValue, enabledValue) {
    const record = this.record(sessionIdValue);
    const name = normalizeModuleName(nameValue);
    if (!record || !name || !Object.hasOwn(record.scripts, name) || !Object.hasOwn(record.modules, name)) return { stored: false, reason: 'unknown-script' };
    record.scripts[name] = Object.freeze({ autoRun: enabledValue === true });
    this.scheduleSave();
    return { stored: true, script: this.getScript(sessionIdValue, name) };
  }

  deleteScript(sessionIdValue, nameValue) {
    const record = this.record(sessionIdValue);
    const name = normalizeModuleName(nameValue);
    if (!record || !name || !Object.hasOwn(record.scripts, name)) return { deleted: false, name };
    delete record.scripts[name];
    delete record.modules[name];
    this.scheduleSave();
    return { deleted: true, name };
  }

  autoRunScripts(sessionIdValue) {
    return this.scriptCatalog(sessionIdValue)
      .filter((entry) => entry.autoRun)
      .map((entry) => this.getScript(sessionIdValue, entry.name))
      .filter(Boolean);
  }

  snapshot() { return { version: STORE_VERSION, sessions: this.sessions }; }

  scheduleSave() {
    this.dirty = true;
    if (this.saveTimer !== null) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.flush().catch(() => { this.dirty = true; });
    }, 25);
    this.saveTimer.unref?.();
  }

  async flush() {
    if (this.saveTimer !== null) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    if (!this.dirty) return true;
    this.dirty = false;
    const payload = `${JSON.stringify(this.snapshot(), null, 2)}\n`;
    if (byteLength(payload) > MAX_FILE_BYTES) { this.dirty = true; throw new Error('Lua managed state exceeds file size limit.'); }
    const operation = this.saveChain.catch(() => {}).then(async () => {
      await fs.promises.mkdir(this.baseDirectory, { recursive: true });
      const temporary = `${this.filePath}.tmp-${process.pid}`;
      await fs.promises.writeFile(temporary, payload, { encoding: 'utf8', mode: 0o600 });
      await fs.promises.rename(temporary, this.filePath);
    });
    this.saveChain = operation;
    try {
      await operation;
      return true;
    } catch (error) {
      this.dirty = true;
      throw error;
    }
  }
}

module.exports = {
  LuaManagedStore,
  normalizeModuleName,
  MAX_STORAGE_BYTES,
  MAX_MODULE_BYTES,
  MAX_MODULE_TOTAL_BYTES,
  MAX_SCRIPTS
};
