'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const combatVitals = require('../src/combat-vitals');
const gmcpStore = require('../src/gmcp-store');
const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

function sampleVitals(name = 'Crater Kaiju', hp = 812345) {
  return {
    hp: 733000,
    mhp: 900000,
    mana: 501000,
    mmana: 650000,
    move: 221000,
    mmove: 300000,
    opponent: {
      name,
      hp,
      mhp: 900000,
      level: 1888,
      vnum: 58123,
      instance_id: 987654321
    }
  };
}

test('compact GMCP patches replace opponent source only when Char.Vitals changes', () => {
  const snapshot = gmcpStore.initialState();
  const firstVitals = sampleVitals();
  gmcpStore.applyEventPatch(snapshot, {
    packageName: 'Char.Vitals',
    path: ['char', 'vitals'],
    body: firstVitals
  });
  const stableVitals = snapshot.char.vitals;
  const stableOpponent = snapshot.char.vitals.opponent;

  gmcpStore.applyEventPatch(snapshot, {
    packageName: 'Char.Status',
    path: ['char', 'status'],
    body: { name: 'Player0', level: 50 }
  });
  assert.equal(snapshot.char.vitals, stableVitals);
  assert.equal(snapshot.char.vitals.opponent, stableOpponent);

  const secondVitals = sampleVitals('Crater Kaiju', 700000);
  gmcpStore.applyEventPatch(snapshot, {
    packageName: 'Char.Vitals',
    path: ['char', 'vitals'],
    body: secondVitals
  });
  assert.equal(snapshot.char.vitals, secondVitals);
  assert.equal(snapshot.char.vitals.opponent, secondVitals.opponent);
  assert.notEqual(snapshot.char.vitals.opponent, stableOpponent);
});

test('renderer shares one canonical Char.Vitals model across scalar and opponent consumers', () => {
  const modelHelper = renderer.match(/function combatVitalsModelForGmcp\(gmcp = state\.gmcp\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.ok(modelHelper, 'combatVitalsModelForGmcp helper should exist');
  assert.match(modelHelper, /combatVitalsModelCache\.get\(rawVitals\)/u);
  assert.match(modelHelper, /cached && cached\.maxStats === maxStats/u);
  assert.match(modelHelper, /combatVitalsApi\.normalizeVitals\(rawVitals \|\| \{\}, maxStats \|\| \{\}\)/u);

  const opponentHelper = renderer.match(/function currentCombatOpponent\(\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(opponentHelper, /return currentCombatVitals\(\)\.opponent \|\| null/u);
  assert.doesNotMatch(opponentHelper, /normalizeOpponent/u);

  const applyVitals = renderer.match(/if \(fullRefresh \|\| gmcpPackageMatches\(packageName, \['Char\.Vitals', 'Char\.MaxStats'\]\)\) \{([\s\S]*?)\n  \}/u)?.[1] || '';
  assert.match(applyVitals, /const nextVitals = currentCombatVitals\(\);/u);
  assert.doesNotMatch(applyVitals, /numberFrom\(vitals/u);

  assert.match(renderer, /function mobInspectorCurrentOpponent\(\) \{\s*return currentCombatOpponent\(\);\s*\}/u);
});

test('production Char.Vitals model cache reuses normalization and invalidates on vitals or max-stat replacement', () => {
  const declaration = 'const combatVitalsModelCache = new WeakMap();';
  const helperSource = renderer.match(/function combatVitalsModelForGmcp\(gmcp = state\.gmcp\) \{[\s\S]*?\n\}/u)?.[0] || '';
  assert.ok(helperSource, 'production Char.Vitals model cache source should be extractable');

  const firstVitals = sampleVitals();
  const state = { gmcp: { char: { vitals: firstVitals, maxStats: { maxhp: 900000 } } } };
  let normalizeCalls = 0;
  const normalizeVitals = (raw, maxStats) => {
    normalizeCalls += 1;
    return Object.freeze({
      hp: Number(raw.hp),
      maxHp: Number(raw.mhp ?? maxStats.maxhp),
      mana: Number(raw.mana),
      maxMana: Number(raw.mmana),
      move: Number(raw.move),
      maxMove: Number(raw.mmove),
      opponent: raw.opponent ? Object.freeze({ name: raw.opponent.name, hp: Number(raw.opponent.hp), maxHp: Number(raw.opponent.mhp) }) : null
    });
  };
  const combatVitalsModelForGmcp = Function(
    'state', 'combatVitalsApi', 'numberFrom', 'combatEntity',
    `${declaration}
${helperSource}
return combatVitalsModelForGmcp;`
  )(state, { normalizeVitals }, () => null, () => null);

  const first = combatVitalsModelForGmcp();
  assert.equal(combatVitalsModelForGmcp(), first);
  assert.equal(normalizeCalls, 1);

  const noMaxStatsVitals = sampleVitals('No MaxStats Kaiju', 750000);
  const noMaxStatsState = { gmcp: { char: { vitals: noMaxStatsVitals } } };
  let noMaxStatsCalls = 0;
  const noMaxStatsLookup = Function(
    'state', 'combatVitalsApi', 'numberFrom', 'combatEntity',
    `${declaration}
${helperSource}
return combatVitalsModelForGmcp;`
  )(noMaxStatsState, { normalizeVitals: (raw, maxStats) => {
    noMaxStatsCalls += 1;
    return {
      hp: Number(raw.hp),
      maxHp: Number(raw.mhp ?? maxStats.maxhp),
      mana: Number(raw.mana),
      maxMana: Number(raw.mmana),
      move: Number(raw.move),
      maxMove: Number(raw.mmove),
      opponent: raw.opponent ? { name: raw.opponent.name } : null
    };
  } }, () => null, () => null);
  assert.equal(noMaxStatsLookup().opponent.name, 'No MaxStats Kaiju');
  assert.equal(noMaxStatsLookup().opponent.name, 'No MaxStats Kaiju');
  assert.equal(noMaxStatsCalls, 1, 'first lookup without Char.MaxStats must populate, then reuse, the cache safely');

  state.gmcp.char.maxStats = { maxhp: 950000 };
  const maxStatsRefresh = combatVitalsModelForGmcp();
  assert.notEqual(maxStatsRefresh, first);
  assert.equal(normalizeCalls, 2);

  state.gmcp.char.vitals = sampleVitals('Second Kaiju', 700000);
  const second = combatVitalsModelForGmcp();
  assert.notEqual(second, maxStatsRefresh);
  assert.equal(second.opponent.name, 'Second Kaiju');
  assert.equal(normalizeCalls, 3);
});

test('identity reuse makes repeated active-opponent consumers substantially cheaper', () => {
  const rawOpponent = {
    name: '\u001b[31m   Crater    Kaiju   \u0007',
    hp: 812345,
    mhp: 900000,
    level: 1888,
    vnum: 58123,
    instance_id: 987654321
  };
  const iterations = 30000;
  const consumersPerUpdate = 6;

  let baselineSink = 0;
  const baselineStart = performance.now();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let consumer = 0; consumer < consumersPerUpdate; consumer += 1) {
      baselineSink += combatVitals.normalizeOpponent(rawOpponent)?.hp || 0;
    }
  }
  const baselineMs = performance.now() - baselineStart;

  let source = Symbol('unset');
  let cached = null;
  let candidateSink = 0;
  const candidateStart = performance.now();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    for (let consumer = 0; consumer < consumersPerUpdate; consumer += 1) {
      if (source !== rawOpponent) {
        source = rawOpponent;
        cached = combatVitals.normalizeOpponent(rawOpponent);
      }
      candidateSink += cached?.hp || 0;
    }
  }
  const candidateMs = performance.now() - candidateStart;

  assert.equal(candidateSink, baselineSink);
  assert.ok(
    candidateMs * 8 < baselineMs,
    `expected >=8x cheaper repeated-consumer path; baseline=${baselineMs.toFixed(2)}ms candidate=${candidateMs.toFixed(2)}ms`
  );
});
