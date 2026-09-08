'use strict';

const DEFAULT_GMCP_MAX_BYTES = 256 * 1024;
const DEFAULT_GMCP_MAX_NODES = 4096;
const DEFAULT_GMCP_MAX_DEPTH = 8;
const DEFAULT_GMCP_MAX_ARRAY_ITEMS = 1024;
const DEFAULT_GMCP_MAX_OBJECT_KEYS = 512;
const DEFAULT_GMCP_MAX_STRING_BYTES = 8192;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const EPHEMERAL_PACKAGES = new Set(['NukeFire.Combat', 'NukeFire.Controls.Request', 'NukeFire.Loot.Event', 'NukeFire.Sound.Event']);

const DIRECT_STATE_PACKAGES = Object.freeze([
  Object.freeze({ packagePath: ['Char', 'Vitals'], statePath: ['char', 'vitals'] }),
  Object.freeze({ packagePath: ['Char', 'Status'], statePath: ['char', 'status'] }),
  Object.freeze({ packagePath: ['Char', 'StatusVars'], statePath: ['char', 'statusVars'] }),
  Object.freeze({ packagePath: ['Char', 'MaxStats'], statePath: ['char', 'maxStats'] }),
  Object.freeze({ packagePath: ['Char', 'GPS'], statePath: ['char', 'gps'] }),
  Object.freeze({ packagePath: ['Char', 'TargetAffects'], statePath: ['char', 'targetAffects'] }),
  Object.freeze({ packagePath: ['Room', 'Info'], statePath: ['room', 'info'] }),
  Object.freeze({ packagePath: ['Comm', 'Channel'], statePath: ['comm', 'channel'] }),
  Object.freeze({ packagePath: ['Comm', 'Channel', 'List'], statePath: ['comm', 'channels'] }),
  Object.freeze({ packagePath: ['Group'], statePath: ['group'] }),
  Object.freeze({ packagePath: ['NukeFire', 'Map', 'Local'], statePath: ['map', 'local'] }),
  Object.freeze({ packagePath: ['NukeFire', 'Context'], statePath: ['context', 'state'] }),
  Object.freeze({ packagePath: ['NukeFire', 'Controls'], statePath: ['controls', 'state'] }),
  Object.freeze({ packagePath: ['NukeFire', 'Affects'], statePath: ['affects', 'state'] }),
  Object.freeze({ packagePath: ['NukeFire', 'Mob', 'Info'], statePath: ['mob', 'info'] }),
  Object.freeze({ packagePath: ['NukeFire', 'Foundlist', 'Info'], statePath: ['foundlist', 'info'] }),
  Object.freeze({ packagePath: ['NukeFire', 'Knowledge', 'Results'], statePath: ['knowledge', 'results'] }),
  Object.freeze({ packagePath: ['NukeFire', 'Knowledge', 'Entry'], statePath: ['knowledge', 'entry'] }),
  Object.freeze({ packagePath: ['NukeFire', 'Knowledge', 'Error'], statePath: ['knowledge', 'error'] })
]);

function getPath(target, path) {
  let cursor = target;
  for (const key of path || []) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = cursor[key];
  }
  return cursor;
}

function setPath(target, path, value) {
  if (!target || !Array.isArray(path) || !path.length) return false;
  let cursor = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = String(path[index] || '');
    if (!key || FORBIDDEN_KEYS.has(key)) return false;
    if (!cursor[key] || typeof cursor[key] !== 'object' || Array.isArray(cursor[key])) cursor[key] = {};
    cursor = cursor[key];
  }
  const leaf = String(path.at(-1) || '');
  if (!leaf || FORBIDDEN_KEYS.has(leaf)) return false;
  cursor[leaf] = value;
  return true;
}

function packagePath(packageNameValue) {
  const packageName = String(packageNameValue || '').trim();
  if (!packageName || packageName.length > 255) return [];
  const parts = packageName.split('.').map((part) => part.trim()).filter(Boolean);
  if (!parts.length || parts.length > 12 || parts.some((part) => part.length > 96 || FORBIDDEN_KEYS.has(part))) return [];
  return parts;
}

function addProtocolState(rawTree, state) {
  for (const mapping of DIRECT_STATE_PACKAGES) {
    const value = getPath(state, mapping.statePath);
    if (value !== undefined && value !== null) setPath(rawTree, mapping.packagePath, value);
  }

  const catalog = state?.gps?.catalog;
  if (catalog && typeof catalog === 'object' && (catalog.complete || Number(catalog.received) > 0 || Number(catalog.count) > 0)) {
    setPath(rawTree, ['NukeFire', 'GPS', 'Catalog'], catalog);
  }

  for (const [rawName, value] of Object.entries(state?.core || {})) {
    const path = packagePath(`Core.${rawName}`);
    if (path.length && value !== undefined && value !== null) setPath(rawTree, path, value);
  }

  for (const [rawName, value] of Object.entries(state?.extras || {})) {
    if (EPHEMERAL_PACKAGES.has(String(rawName || ''))) continue;
    const path = packagePath(rawName);
    if (path.length && value !== undefined && value !== null) setPath(rawTree, path, value);
  }

  return rawTree;
}

function byteLength(value) {
  return Buffer.byteLength(String(value ?? ''), 'utf8');
}

function truncateUtf8(value, maximumBytes) {
  const source = String(value ?? '');
  const limit = Math.max(0, Math.trunc(Number(maximumBytes) || 0));
  if (byteLength(source) <= limit) return source;
  if (!limit) return '';
  let low = 0;
  let high = source.length;
  while (low < high) {
    const midpoint = Math.ceil((low + high) / 2);
    if (byteLength(source.slice(0, midpoint)) <= limit) low = midpoint;
    else high = midpoint - 1;
  }
  return source.slice(0, low);
}

function sanitizeValue(value, budget, depth = 0) {
  if (budget.nodes >= budget.maxNodes || budget.bytes <= 0) {
    budget.truncated = true;
    budget.dropped += 1;
    return undefined;
  }
  budget.nodes += 1;

  if (value === null) {
    budget.bytes -= 4;
    return null;
  }
  if (typeof value === 'boolean') {
    budget.bytes -= value ? 4 : 5;
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    budget.bytes -= Math.max(1, byteLength(String(value)));
    return value;
  }
  if (typeof value === 'string') {
    const allowed = Math.max(0, Math.min(budget.maxStringBytes, budget.bytes - 2));
    const text = truncateUtf8(value, allowed);
    if (text !== value) budget.truncated = true;
    budget.bytes -= Math.max(2, byteLength(text) + 2);
    return text;
  }
  if (!value || typeof value !== 'object') {
    budget.dropped += 1;
    return undefined;
  }
  if (depth >= budget.maxDepth) {
    budget.truncated = true;
    budget.dropped += 1;
    return undefined;
  }

  if (Array.isArray(value)) {
    const output = [];
    const count = Math.min(value.length, budget.maxArrayItems);
    if (value.length > count) budget.truncated = true;
    budget.bytes -= 2;
    for (let index = 0; index < count; index += 1) {
      if (budget.bytes <= 4 || budget.nodes >= budget.maxNodes) {
        budget.truncated = true;
        budget.dropped += count - index;
        break;
      }
      const child = sanitizeValue(value[index], budget, depth + 1);
      output.push(child === undefined ? null : child);
      budget.bytes -= 1;
    }
    return output;
  }

  const output = {};
  const entries = Object.entries(value);
  const count = Math.min(entries.length, budget.maxObjectKeys);
  if (entries.length > count) budget.truncated = true;
  budget.bytes -= 2;
  for (let index = 0; index < count; index += 1) {
    if (budget.bytes <= 8 || budget.nodes >= budget.maxNodes) {
      budget.truncated = true;
      budget.dropped += count - index;
      break;
    }
    const [rawKey, rawValue] = entries[index];
    const key = String(rawKey || '');
    if (!key || FORBIDDEN_KEYS.has(key)) {
      budget.dropped += 1;
      continue;
    }
    const keyBytes = byteLength(key) + 3;
    if (keyBytes >= budget.bytes) {
      budget.truncated = true;
      budget.dropped += 1;
      continue;
    }
    budget.bytes -= keyBytes;
    const child = sanitizeValue(rawValue, budget, depth + 1);
    if (child !== undefined) output[key] = child;
    else budget.dropped += 1;
  }
  return output;
}

function buildLuaGmcpSnapshot(stateValue, options = {}) {
  const state = stateValue && typeof stateValue === 'object' ? stateValue : {};
  const maxBytes = Math.max(16 * 1024, Number(options.maxBytes) || DEFAULT_GMCP_MAX_BYTES);
  const budget = {
    maxBytes,
    bytes: maxBytes - 4096,
    maxNodes: Math.max(64, Number(options.maxNodes) || DEFAULT_GMCP_MAX_NODES),
    maxDepth: Math.max(2, Number(options.maxDepth) || DEFAULT_GMCP_MAX_DEPTH),
    maxArrayItems: Math.max(8, Number(options.maxArrayItems) || DEFAULT_GMCP_MAX_ARRAY_ITEMS),
    maxObjectKeys: Math.max(8, Number(options.maxObjectKeys) || DEFAULT_GMCP_MAX_OBJECT_KEYS),
    maxStringBytes: Math.max(256, Number(options.maxStringBytes) || DEFAULT_GMCP_MAX_STRING_BYTES),
    nodes: 0,
    truncated: false,
    dropped: 0
  };
  const rawTree = addProtocolState({}, state);
  let snapshot = sanitizeValue(rawTree, budget, 0) || {};
  let json = JSON.stringify(snapshot);
  if (byteLength(json) > maxBytes) {
    const retryBudget = { ...budget, bytes: Math.floor(maxBytes * 0.6), nodes: 0, truncated: true, dropped: budget.dropped };
    snapshot = sanitizeValue(rawTree, retryBudget, 0) || {};
    json = JSON.stringify(snapshot);
    budget.truncated = true;
    budget.dropped = Math.max(budget.dropped, retryBudget.dropped);
    budget.nodes = retryBudget.nodes;
  }
  if (byteLength(json) > maxBytes) {
    snapshot = {};
    json = '{}';
    budget.truncated = true;
    budget.dropped += 1;
  }
  const meta = {
    truncated: budget.truncated,
    dropped: Math.max(0, Math.trunc(budget.dropped)),
    bytes: byteLength(json),
    nodes: Math.max(0, Math.trunc(budget.nodes)),
    messageCount: Math.max(0, Math.trunc(Number(state?.meta?.messageCount) || 0)),
    lastPackage: String(state?.meta?.lastPackage || '').slice(0, 255)
  };
  return { snapshot, meta, json, metaJson: JSON.stringify(meta) };
}


function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function buildMudletMsdpObject(stateValue) {
  const state = stateValue && typeof stateValue === 'object' ? stateValue : {};
  const vitals = state?.char?.vitals && typeof state.char.vitals === 'object' ? state.char.vitals : {};
  const status = state?.char?.status && typeof state.char.status === 'object' ? state.char.status : {};
  const maxStats = state?.char?.maxStats && typeof state.char.maxStats === 'object' ? state.char.maxStats : {};
  const room = state?.room?.info && typeof state.room.info === 'object' ? state.room.info : {};
  const opponent = vitals?.opponent && typeof vitals.opponent === 'object' ? vitals.opponent : null;
  const output = Object.create(null);
  const set = (name, value) => {
    if (value === undefined || value === null) return;
    output[name] = value;
  };

  set('HEALTH', firstDefined(vitals.hp, vitals.health));
  set('HEALTH_MAX', firstDefined(vitals.mhp, vitals.maxhp, vitals.maxHp));
  set('MANA', firstDefined(vitals.mana, vitals.mp));
  set('MANA_MAX', firstDefined(vitals.mmana, vitals.maxmana, vitals.maxMana));
  set('MOVEMENT', firstDefined(vitals.move, vitals.moves, vitals.mv));
  set('MOVEMENT_MAX', firstDefined(vitals.mmove, vitals.maxmove, vitals.maxMove));

  set('CHARACTER_NAME', firstDefined(status.name, status.characterName));
  set('LEVEL', status.level);
  set('CLASS', status.class);
  set('RACE', status.race);
  set('ALIGNMENT', status.alignment);
  set('EXPERIENCE', firstDefined(status.exp, status.experience));
  set('EXPERIENCE_MAX', firstDefined(status.expmax, status.expMax, status.maxexp, status.experienceMax));
  set('EXPERIENCE_TNL', firstDefined(status.tnl, status.expTnl, status.experienceTnl));
  set('MONEY', firstDefined(status.gold, status.money));
  set('WIMPY', status.wimpy);
  set('PRACTICE', firstDefined(status.practice, status.practices));
  set('HITROLL', firstDefined(status.hitroll, maxStats.hitroll));
  set('DAMROLL', firstDefined(status.damroll, maxStats.damroll));
  set('AC', firstDefined(status.ac, status.armor, maxStats.ac, maxStats.armor));

  const statAliases = [
    ['STR', ['str', 'strength']],
    ['INT', ['int', 'intelligence']],
    ['WIS', ['wis', 'wisdom']],
    ['DEX', ['dex', 'dexterity']],
    ['CON', ['con', 'constitution']]
  ];
  for (const [name, aliases] of statAliases) {
    let current;
    let permanent;
    for (const alias of aliases) {
      current = firstDefined(current, status[alias], maxStats[alias]);
      permanent = firstDefined(permanent, status[`${alias}_perm`], status[`${alias}Perm`], maxStats[`${alias}_perm`], maxStats[`${alias}Perm`], maxStats[`perm_${alias}`]);
    }
    set(name, current);
    set(`${name}_PERM`, firstDefined(permanent, current));
  }

  if (opponent) {
    set('OPPONENT_NAME', firstDefined(opponent.name, ''));
    set('OPPONENT_HEALTH', firstDefined(opponent.hp, opponent.health, 0));
    set('OPPONENT_HEALTH_MAX', firstDefined(opponent.mhp, opponent.maxhp, opponent.maxHp, 0));
    set('OPPONENT_LEVEL', firstDefined(opponent.level, 0));
  } else {
    output.OPPONENT_NAME = '';
    output.OPPONENT_HEALTH = 0;
    output.OPPONENT_HEALTH_MAX = 0;
    output.OPPONENT_LEVEL = 0;
  }

  set('ROOM_NAME', room.name);
  set('ROOM_VNUM', firstDefined(room.num, room.vnum, room.id, room.room));
  set('ROOM_EXITS', room.exits);
  set('AREA_NAME', firstDefined(room.area, room.areaName, room.area_name, room.zone, room.zoneName));
  if (state?.affects?.state !== undefined && state?.affects?.state !== null) set('AFFECTS', state.affects.state);
  return output;
}

function buildMudletMsdpSnapshot(stateValue, options = {}) {
  const maxBytes = Math.max(8 * 1024, Number(options.maxBytes) || 128 * 1024);
  const budget = {
    maxBytes,
    bytes: maxBytes - 2048,
    maxNodes: 2048,
    maxDepth: 6,
    maxArrayItems: 512,
    maxObjectKeys: 256,
    maxStringBytes: 8192,
    nodes: 0,
    truncated: false,
    dropped: 0
  };
  let snapshot = sanitizeValue(buildMudletMsdpObject(stateValue), budget, 0) || {};
  let json = JSON.stringify(snapshot);
  if (byteLength(json) > maxBytes) {
    snapshot = {};
    json = '{}';
  }
  return { snapshot, json, bytes: byteLength(json), truncated: budget.truncated };
}

function diffMudletMsdp(previousValue, nextValue) {
  const previous = previousValue && typeof previousValue === 'object' ? previousValue : {};
  const next = nextValue && typeof nextValue === 'object' ? nextValue : {};
  const changed = [];
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  for (const key of keys) {
    const before = previous[key];
    const after = next[key];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    changed.push({ field: key, value: after });
  }
  return changed;
}

function splitGmcpCommand(commandValue) {
  const source = String(commandValue ?? '').normalize('NFKC').trim();
  if (!source || /[\r\n\u0000]/u.test(source) || byteLength(source) > 64 * 1024) return null;
  const match = source.match(/^([A-Za-z][A-Za-z0-9_.-]{0,127})(?:\s+([\s\S]*))?$/u);
  if (!match) return null;
  const body = match[2] === undefined || match[2] === '' ? undefined : match[2];
  return { packageName: match[1], body, command: source };
}

module.exports = {
  buildLuaGmcpSnapshot,
  buildMudletMsdpSnapshot,
  diffMudletMsdp,
  splitGmcpCommand,
  DEFAULT_GMCP_MAX_BYTES,
  DEFAULT_GMCP_MAX_NODES,
  DEFAULT_GMCP_MAX_DEPTH,
  DEFAULT_GMCP_MAX_ARRAY_ITEMS,
  DEFAULT_GMCP_MAX_OBJECT_KEYS,
  DEFAULT_GMCP_MAX_STRING_BYTES
};
