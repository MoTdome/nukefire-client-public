'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const ROOT = path.join(__dirname, '..');

function largeTinTinState(count = 300) {
  const records = (prefix, valueKey) => Array.from({ length: count }, (_, index) => ({
    [prefix]: `${prefix}-${index}`,
    [valueKey]: `${valueKey}-${index}-${'x'.repeat(32)}`,
    priority: (index % 9) + 1,
    enabled: index % 7 !== 0
  }));
  return {
    aliases: records('name', 'body'),
    variables: records('name', 'value'),
    functions: records('name', 'body'),
    actions: { enabled: true, definitions: records('pattern', 'command') },
    gags: { enabled: true, definitions: records('pattern', 'unused') },
    highlights: { enabled: true, definitions: records('pattern', 'style') },
    substitutes: { enabled: true, definitions: records('pattern', 'replacement') },
    macros: { enabled: true, definitions: records('key', 'command') },
    tabs: records('name', 'command'),
    events: { enabled: true, definitions: records('name', 'command') },
    config: { logMode: 'plain', commandEcho: false, historySize: 2000, bufferSize: 5000 },
    classes: { activeStack: ['combat'], definitions: records('name', 'saved') },
    speedwalk: { enabled: true },
    profile: { requested: 'main', filename: 'main.tin', loaded: true }
  };
}

function legacySettingsCopy(tintin, sessionCount = 4) {
  const sessions = Array.from({ length: sessionCount }, (_, index) => ({
    id: `s${index}`,
    tintin: structuredClone(tintin)
  }));
  return {
    aliases: structuredClone(tintin.aliases),
    variables: structuredClone(tintin.variables),
    functions: structuredClone(tintin.functions),
    actions: structuredClone(tintin.actions),
    gags: structuredClone(tintin.gags),
    highlights: structuredClone(tintin.highlights),
    substitutes: structuredClone(tintin.substitutes),
    macros: structuredClone(tintin.macros),
    classes: structuredClone(tintin.classes),
    speedwalk: structuredClone(tintin.speedwalk),
    sessions
  };
}

function reusedSettingsCopy(tintin, sessionCount = 4, cache = new WeakMap()) {
  const sessionSources = Array.from({ length: sessionCount }, () => tintin);
  const sessions = sessionSources.map((source, index) => {
    let cached = cache.get(source);
    if (!cached) {
      cached = structuredClone(source);
      cache.set(source, cached);
    }
    return { id: `s${index}`, tintin: cached };
  });
  const cached = sessions[0].tintin;
  return {
    aliases: cached.aliases,
    variables: cached.variables,
    functions: cached.functions,
    actions: cached.actions,
    gags: cached.gags,
    highlights: cached.highlights,
    substitutes: cached.substitutes,
    macros: cached.macros,
    classes: cached.classes,
    speedwalk: cached.speedwalk,
    sessions
  };
}

test('renderer reuses canonical TinTin references across unchanged session capture and settings collection', () => {
  const source = fs.readFileSync(path.join(ROOT, 'renderer', 'renderer.js'), 'utf8');
  assert.match(source, /const persistentTinTinSnapshotCache = new WeakMap\(\)/u);
  assert.match(source, /function activeTinTinReferencesMatch\(record\)/u);
  assert.match(source, /if \(!activeTinTinReferencesMatch\(record\)\) \{[\s\S]*?currentDefinitionSnapshot\(record\.id\)/u);
  assert.match(source, /persistentTinTinSnapshotCache\.get\(source\)/u);
  assert.match(source, /persistentSessionsSnapshot\(\{ reuseTinTinSnapshots: true, flushOutput: false \}\)/u);
  assert.match(source, /aliases: activeSessionTinTin\.aliases/u);
  assert.match(source, /sessions,/u);
});

test('shared active-session persistence branches serialize identically to independently cloned legacy branches', () => {
  const tintin = largeTinTinState(12);
  const legacy = legacySettingsCopy(tintin, 2);
  const reused = reusedSettingsCopy(tintin, 2, new WeakMap());
  assert.deepEqual(JSON.parse(JSON.stringify(reused)), JSON.parse(JSON.stringify(legacy)));
  assert.equal(reused.aliases, reused.sessions[0].tintin.aliases);
  assert.notEqual(legacy.aliases, legacy.sessions[0].tintin.aliases);
});

test('reusing the active persistence snapshot avoids the duplicate active-definition clone slice', () => {
  const tintin = largeTinTinState(220);
  const iterations = 80;
  const cache = new WeakMap();
  // Warm both clone implementations and populate the persistence cache once.
  legacySettingsCopy(tintin, 3);
  reusedSettingsCopy(tintin, 3, cache);

  let start = performance.now();
  for (let index = 0; index < iterations; index += 1) legacySettingsCopy(tintin, 3);
  const legacyMs = performance.now() - start;

  start = performance.now();
  for (let index = 0; index < iterations; index += 1) reusedSettingsCopy(tintin, 3, cache);
  const reusedMs = performance.now() - start;

  assert.ok(reusedMs < legacyMs * 0.08, `expected cached unchanged-save path <8% of legacy; legacy=${legacyMs.toFixed(2)}ms reused=${reusedMs.toFixed(2)}ms`);
});
