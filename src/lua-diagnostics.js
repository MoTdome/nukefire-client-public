'use strict';

const DEFAULT_MAX_ERRORS = 64;
const DEFAULT_REPEAT_WINDOW_MS = 2000;

function boundedText(value, limit = 4096) {
  return String(value ?? '').replace(/[\u0000]/gu, '').slice(0, Math.max(0, Number(limit) || 0));
}

function normalizeSessionId(value) {
  const id = String(value || '').trim();
  if (!id || id.length > 96 || !/^[A-Za-z0-9_.:@-]+$/u.test(id)) return '';
  return id;
}

function scriptNameFromSource(sourceValue) {
  const source = String(sourceValue || '');
  const match = source.match(/(?:^|\/)script\/([A-Za-z_][A-Za-z0-9_.]{0,159})(?:$|[:/])/u);
  return match ? match[1] : '';
}

function cleanLuaErrorMessage(error = {}) {
  const raw = boundedText(error?.message || 'Lua execution failed.', 4096);
  const source = boundedText(error?.source || '', 256);
  const line = Math.max(0, Math.trunc(Number(error?.line) || 0));
  if (source && line > 0) {
    const escaped = source.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const pattern = new RegExp(`^${escaped}:${line}:\\s*`, 'u');
    return raw.replace(pattern, '') || raw;
  }
  const generic = raw.match(/^.*?:(\d+):\s*([\s\S]+)$/u);
  return generic ? generic[2] : raw;
}

function normalizeLuaDiagnostic(result = {}, context = {}) {
  const error = result?.error && typeof result.error === 'object' ? result.error : {};
  const source = boundedText(error.source || context.source || '', 256);
  const line = Math.max(0, Math.trunc(Number(error.line) || 0));
  const scriptName = boundedText(context.scriptName || scriptNameFromSource(source), 160);
  const callbackId = Math.max(0, Math.trunc(Number(context.callbackId) || 0));
  const type = boundedText(error.type || 'runtime', 64) || 'runtime';
  const name = boundedText(error.name || 'LuaError', 128) || 'LuaError';
  const message = cleanLuaErrorMessage({ ...error, source, line });
  const stack = boundedText(error.stack || '', 8192);
  const origin = boundedText(context.origin || context.source || 'lua', 96) || 'lua';
  const fingerprint = [scriptName, callbackId, type, source, line, message].join('|');
  return Object.freeze({ scriptName, callbackId, type, name, message, source, line, stack, origin, fingerprint });
}

class LuaDiagnosticsRegistry {
  constructor(options = {}) {
    this.maxErrors = Math.max(8, Math.min(256, Math.trunc(Number(options.maxErrors) || DEFAULT_MAX_ERRORS)));
    this.repeatWindowMs = Math.max(250, Math.min(10000, Math.trunc(Number(options.repeatWindowMs) || DEFAULT_REPEAT_WINDOW_MS)));
    this.sessions = new Map();
  }

  ensure(sessionIdValue) {
    const sessionId = normalizeSessionId(sessionIdValue);
    if (!sessionId) return null;
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        errors: [],
        scriptStatus: new Map(),
        successes: 0,
        failures: 0,
        lastActivityAt: 0
      });
    }
    return this.sessions.get(sessionId);
  }

  noteResult(sessionIdValue, result = {}, context = {}) {
    const state = this.ensure(sessionIdValue);
    if (!state) return null;
    const now = Date.now();
    state.lastActivityAt = now;
    const scriptName = boundedText(context.scriptName || '', 160);
    if (result?.ok === true) {
      state.successes += 1;
      if (scriptName) state.scriptStatus.set(scriptName, Object.freeze({ status: 'ok', at: now, line: 0, message: '' }));
      return null;
    }

    state.failures += 1;
    const normalized = normalizeLuaDiagnostic(result, context);
    const effectiveScriptName = normalized.scriptName || scriptName;
    const last = state.errors.at(-1);
    if (last && last.fingerprint === normalized.fingerprint && now - last.at <= this.repeatWindowMs) {
      const merged = Object.freeze({ ...last, at: now, count: Math.min(999999, Number(last.count || 1) + 1) });
      state.errors[state.errors.length - 1] = merged;
      if (effectiveScriptName) state.scriptStatus.set(effectiveScriptName, Object.freeze({ status: 'error', at: now, line: normalized.line, message: normalized.message }));
      return merged;
    }

    const entry = Object.freeze({ ...normalized, at: now, count: 1 });
    state.errors.push(entry);
    if (state.errors.length > this.maxErrors) state.errors.splice(0, state.errors.length - this.maxErrors);
    if (effectiveScriptName) state.scriptStatus.set(effectiveScriptName, Object.freeze({ status: 'error', at: now, line: normalized.line, message: normalized.message }));
    return entry;
  }

  list(sessionIdValue, limitValue = 10) {
    const state = this.ensure(sessionIdValue);
    if (!state) return [];
    const limit = Math.max(1, Math.min(this.maxErrors, Math.trunc(Number(limitValue) || 10)));
    return state.errors.slice(-limit).reverse().map((entry) => ({ ...entry }));
  }

  summary(sessionIdValue) {
    const state = this.ensure(sessionIdValue);
    if (!state) return { errorsRetained: 0, successes: 0, failures: 0, lastActivityAt: 0, lastError: null };
    return {
      errorsRetained: state.errors.length,
      successes: state.successes,
      failures: state.failures,
      lastActivityAt: state.lastActivityAt,
      lastError: state.errors.length ? { ...state.errors.at(-1) } : null
    };
  }

  scriptStatus(sessionIdValue, nameValue) {
    const state = this.ensure(sessionIdValue);
    const name = boundedText(nameValue || '', 160);
    const status = state?.scriptStatus.get(name);
    return status ? { ...status } : { status: 'never-run', at: 0, line: 0, message: '' };
  }

  clear(sessionIdValue) {
    const state = this.ensure(sessionIdValue);
    if (!state) return 0;
    const count = state.errors.length;
    state.errors = [];
    return count;
  }

  clearSession(sessionIdValue) {
    const sessionId = normalizeSessionId(sessionIdValue);
    return sessionId ? this.sessions.delete(sessionId) : false;
  }
}

module.exports = {
  LuaDiagnosticsRegistry,
  normalizeLuaDiagnostic,
  cleanLuaErrorMessage,
  scriptNameFromSource,
  DEFAULT_MAX_ERRORS
};
