
'use strict';

const MAX_LUA_PANES_PER_SESSION = 8;
const MAX_LUA_PANE_ROWS = 16;
const MAX_LUA_PANE_COMMAND_BYTES = 16 * 1024;
const MAX_LUA_PANE_TITLE = 64;
const MAX_LUA_PANE_LABEL = 48;
const MAX_LUA_PANE_TEXT = 256;
const LUA_PANE_RATE_WINDOW_MS = 1000;
const LUA_PANE_RATE_LIMIT = 180;
const LUA_PANE_TYPES = Object.freeze(new Set(['text', 'value', 'bar']));
const LUA_PANE_ID = /^[A-Za-z][A-Za-z0-9_-]{0,31}$/u;

function boundedText(value, limit) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, '')
    .replace(/[\r\n]+/gu, ' ')
    .trim()
    .slice(0, limit);
}

function normalizeId(value) {
  const id = boundedText(value, 32);
  return LUA_PANE_ID.test(id) ? id : '';
}

function normalizeOwner(value) {
  const owner = String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/[\u0000-\u001F\u007F]/gu, '')
    .slice(0, 192);
  return owner && /^[A-Za-z0-9_.:@/-]+$/u.test(owner) ? owner : '';
}

function parsePayloadJson(value) {
  const source = String(value ?? '{}');
  if (Buffer.byteLength(source, 'utf8') > MAX_LUA_PANE_COMMAND_BYTES) return null;
  try {
    const parsed = JSON.parse(source);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeRows(rowsValue) {
  if (!Array.isArray(rowsValue) || rowsValue.length < 1 || rowsValue.length > MAX_LUA_PANE_ROWS) return null;
  const seen = new Set();
  const rows = [];
  for (const input of rowsValue) {
    const id = normalizeId(input?.id);
    const type = boundedText(input?.type, 16).toLowerCase();
    const label = boundedText(input?.label || id, MAX_LUA_PANE_LABEL);
    if (!id || seen.has(id) || !LUA_PANE_TYPES.has(type) || !label) return null;
    seen.add(id);
    rows.push(Object.freeze({ id, type, label }));
  }
  return rows;
}

function defaultRowValue(row) {
  return row.type === 'bar' ? Object.freeze({ value: 0, max: 1 }) : '';
}

function normalizeRowValue(row, value) {
  if (row.type === 'bar') {
    const source = value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    if (!source) return null;
    const numericValue = Number(source.value);
    const numericMax = Number(source.max);
    if (!Number.isFinite(numericValue) || !Number.isFinite(numericMax) || numericMax <= 0) return null;
    return Object.freeze({ value: Math.max(0, numericValue), max: Math.max(1, numericMax) });
  }
  if (value && typeof value === 'object') return null;
  return boundedText(value, MAX_LUA_PANE_TEXT);
}

function clonePane(pane) {
  return Object.freeze({
    id: pane.id,
    title: pane.title,
    visible: pane.visible === true,
    rows: pane.rows.map((row) => Object.freeze({ ...row })),
    values: Object.freeze(Object.fromEntries(pane.rows.map((row) => [row.id, pane.values[row.id]])))
  });
}

class LuaPaneRegistry {
  constructor(options = {}) {
    this.maxPanes = Math.max(1, Math.min(MAX_LUA_PANES_PER_SESSION, Number(options.maxPanes) || MAX_LUA_PANES_PER_SESSION));
    this.sessions = new Map();
    this.rate = new Map();
  }

  sessionPanes(sessionId) {
    const key = String(sessionId || '');
    let panes = this.sessions.get(key);
    if (!panes) { panes = new Map(); this.sessions.set(key, panes); }
    return panes;
  }

  withinRate(sessionId) {
    const key = String(sessionId || '');
    const now = Date.now();
    const current = this.rate.get(key);
    if (!current || now - current.startedAt >= LUA_PANE_RATE_WINDOW_MS) {
      this.rate.set(key, { startedAt: now, count: 1 });
      return true;
    }
    current.count += 1;
    return current.count <= LUA_PANE_RATE_LIMIT;
  }

  apply(sessionIdValue, rawCommand = {}, options = {}) {
    const sessionId = String(sessionIdValue || '').trim();
    const action = boundedText(rawCommand?.action, 16).toLowerCase();
    const paneId = normalizeId(rawCommand?.paneId);
    if (!sessionId || !paneId || !['create', 'set', 'show', 'hide', 'clear', 'destroy'].includes(action)) {
      return { ok: false, reason: 'invalid-command' };
    }
    if (!this.withinRate(sessionId)) return { ok: false, reason: 'rate-limit' };
    const payload = parsePayloadJson(rawCommand?.payloadJson);
    if (!payload) return { ok: false, reason: 'invalid-payload' };
    const panes = this.sessionPanes(sessionId);

    if (action === 'create') {
      const rows = normalizeRows(payload.rows);
      const title = boundedText(payload.title || paneId, MAX_LUA_PANE_TITLE);
      if (!rows || !title) return { ok: false, reason: 'invalid-definition' };
      if (!panes.has(paneId) && panes.size >= this.maxPanes) return { ok: false, reason: 'pane-limit' };
      const pane = { id: paneId, title, visible: payload.visible !== false, rows, values: Object.create(null), owner: normalizeOwner(options.owner) };
      for (const row of rows) pane.values[row.id] = defaultRowValue(row);
      panes.set(paneId, pane);
      return { ok: true, event: { action: 'upsert', pane: clonePane(pane) } };
    }

    const pane = panes.get(paneId);
    if (!pane) return { ok: false, reason: 'unknown-pane' };

    if (action === 'destroy') {
      panes.delete(paneId);
      if (!panes.size) this.sessions.delete(sessionId);
      return { ok: true, event: { action: 'destroy', paneId } };
    }
    if (action === 'show' || action === 'hide') pane.visible = action === 'show';
    else if (action === 'clear') {
      for (const row of pane.rows) pane.values[row.id] = defaultRowValue(row);
    } else if (action === 'set') {
      const rowId = normalizeId(payload.rowId);
      const row = pane.rows.find((candidate) => candidate.id === rowId);
      if (!row) return { ok: false, reason: 'unknown-row' };
      const value = normalizeRowValue(row, payload.value);
      if (value === null) return { ok: false, reason: 'invalid-value' };
      pane.values[row.id] = value;
    }
    return { ok: true, event: { action: 'upsert', pane: clonePane(pane) } };
  }

  snapshot(sessionIdValue) {
    const panes = this.sessions.get(String(sessionIdValue || '').trim());
    return panes ? [...panes.values()].map(clonePane) : [];
  }

  clearOwner(sessionIdValue, ownerValue) {
    const sessionId = String(sessionIdValue || '').trim();
    const owner = normalizeOwner(ownerValue);
    const panes = this.sessions.get(sessionId);
    if (!sessionId || !owner || !panes) return [];
    const paneIds = [...panes.values()].filter((pane) => pane.owner === owner).map((pane) => pane.id);
    for (const paneId of paneIds) panes.delete(paneId);
    if (!panes.size) this.sessions.delete(sessionId);
    return paneIds;
  }

  clearSession(sessionIdValue) {
    const sessionId = String(sessionIdValue || '').trim();
    this.rate.delete(sessionId);
    return this.sessions.delete(sessionId);
  }
}

module.exports = {
  LuaPaneRegistry,
  LUA_PANE_TYPES,
  MAX_LUA_PANES_PER_SESSION,
  MAX_LUA_PANE_ROWS,
  MAX_LUA_PANE_COMMAND_BYTES,
  normalizeId,
  normalizeOwner,
  normalizeRows
};
