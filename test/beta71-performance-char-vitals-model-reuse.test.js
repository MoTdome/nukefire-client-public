'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const combatVitals = require('../src/combat-vitals');
const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

function rawVitals(index = 0) {
  return {
    hp: 734000000 + (index % 100),
    mhp: 900000000,
    mana: 18765432,
    mmana: 25000000,
    move: 98765,
    mmove: 120000,
    opponent: {
      name: 'Crater Kaiju',
      hp: 488000000 - (index % 1000),
      mhp: 720000000,
      level: 1888,
      vnum: 58123,
      instance_id: 987654321
    }
  };
}

const maxStats = Object.freeze({ maxhp: 900000000, maxmana: 25000000, maxmoves: 120000 });

test('canonical Char.Vitals model includes scalar percentages and normalized opponent state', () => {
  const model = combatVitals.normalizeVitals(rawVitals(), maxStats);
  assert.equal(model.hp, 734000000);
  assert.equal(model.maxHp, 900000000);
  assert.equal(model.mana, 18765432);
  assert.equal(model.maxMana, 25000000);
  assert.equal(model.move, 98765);
  assert.equal(model.maxMove, 120000);
  assert.ok(model.hpPercent > 81 && model.hpPercent < 82);
  assert.ok(model.manaPercent > 75 && model.manaPercent < 76);
  assert.ok(model.movePercent > 82 && model.movePercent < 83);
  assert.equal(model.opponent.name, 'Crater Kaiju');
  assert.equal(model.opponent.instanceId, 987654321);
});

test('renderer reuses one canonical Char.Vitals model for active, background, and opponent consumers', () => {
  assert.match(renderer, /const combatVitalsModelCache = new WeakMap\(\);/u);
  assert.match(renderer, /function currentCombatVitals\(\) \{\s*return combatVitalsModelForGmcp\(state\.gmcp\);\s*\}/u);
  assert.match(renderer, /function currentCombatOpponent\(\) \{\s*return currentCombatVitals\(\)\.opponent \|\| null;\s*\}/u);

  const sessionVitals = renderer.match(/function updateSessionVitalsFromGmcp\(record\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(sessionVitals, /const next = combatVitalsModelForGmcp\(record\.gmcp\);/u);
  assert.doesNotMatch(sessionVitals, /numberFrom\(vitals/u);

  const inactive = renderer.match(/function storeInactiveGmcp\(record, message\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(inactive, /const opponent = combatVitalsModelForGmcp\(record\.gmcp\)\.opponent;/u);
});

test('Mob Inspector derives one combat context and caches engaged-enemy scan by target identity plus Group source', () => {
  const context = renderer.match(/function mobInspectorCombatContext\(snapshot = state\.mobInspector\.snapshot\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(context, /const matches = Boolean\(opponent\?\.name && mobInspectorMatchesOpponent\(snapshot, opponent\)\);/u);
  assert.match(context, /otherEngaged: matches \? mobInspectorOtherEngagedCountForOpponent\(opponent, groupSource\) : 0/u);

  const engaged = renderer.match(/function mobInspectorOtherEngagedCountForOpponent\(opponent, groupSource = state\.gmcp\?\.group \?\? null\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(engaged, /mobInspectorEngagedGroupSource === groupSource/u);
  assert.match(engaged, /mobInspectorEngagedOpponentKey === opponentKey/u);

  const update = renderer.match(/function updateMobInspectorLiveCombat\(\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(update, /const combat = mobInspectorCombatContext\(snapshot\);/u);
  assert.match(update, /const opponentName = combat\.opponentName;/u);
  assert.doesNotMatch(update, /mobInspectorMatchesOpponent\(snapshot/u);
});

test('shared Char.Vitals model substantially reduces repeated same-packet derivation work', () => {
  const updates = 20000;
  const consumersPerUpdate = 5;

  const measureBaseline = () => {
    let sink = 0;
    const started = performance.now();
    for (let index = 0; index < updates; index += 1) {
      const raw = rawVitals(index);
      for (let consumer = 0; consumer < consumersPerUpdate; consumer += 1) {
        const model = combatVitals.normalizeVitals(raw, maxStats);
        sink += model.hp + (model.opponent?.hp || 0);
      }
    }
    return { ms: performance.now() - started, sink };
  };

  const measureCandidate = () => {
    const cache = new WeakMap();
    let sink = 0;
    const started = performance.now();
    for (let index = 0; index < updates; index += 1) {
      const raw = rawVitals(index);
      for (let consumer = 0; consumer < consumersPerUpdate; consumer += 1) {
        let model = cache.get(raw);
        if (!model) {
          model = combatVitals.normalizeVitals(raw, maxStats);
          cache.set(raw, model);
        }
        sink += model.hp + (model.opponent?.hp || 0);
      }
    }
    return { ms: performance.now() - started, sink };
  };

  const median = (values) => {
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.floor(sorted.length / 2)];
  };

  for (let warmup = 0; warmup < 2; warmup += 1) {
    measureBaseline();
    measureCandidate();
  }

  const baselineSamples = [];
  const candidateSamples = [];
  let baselineSink = 0;
  let candidateSink = 0;
  for (let round = 0; round < 7; round += 1) {
    if (round % 2 === 0) {
      const baseline = measureBaseline();
      const candidate = measureCandidate();
      baselineSamples.push(baseline.ms);
      candidateSamples.push(candidate.ms);
      baselineSink = baseline.sink;
      candidateSink = candidate.sink;
    } else {
      const candidate = measureCandidate();
      const baseline = measureBaseline();
      candidateSamples.push(candidate.ms);
      baselineSamples.push(baseline.ms);
      baselineSink = baseline.sink;
      candidateSink = candidate.sink;
    }
  }

  const baselineMs = median(baselineSamples);
  const candidateMs = median(candidateSamples);
  assert.equal(candidateSink, baselineSink);
  assert.ok(
    candidateMs * 1.5 < baselineMs,
    `expected >=1.5x cheaper repeated derivation; median baseline=${baselineMs.toFixed(2)}ms candidate=${candidateMs.toFixed(2)}ms`
  );
});

test('production engaged-enemy cache skips Group rescans across HP-only target updates', () => {
  const helperSource = renderer.match(/function mobInspectorOtherEngagedCountForOpponent\(opponent, groupSource = state\.gmcp\?\.group \?\? null\) \{[\s\S]*?\n\}/u)?.[0] || '';
  assert.ok(helperSource, 'production engaged-enemy cache helper should be extractable');

  const state = { gmcp: { group: {} } };
  let groupCalls = 0;
  const groupCombatState = () => {
    groupCalls += 1;
    return {
      enemies: [
        { name: 'Enemy 1', vnum: 58001 },
        { name: 'Crater Kaiju', vnum: 58123 },
        { name: 'Enemy 2', vnum: 58002 }
      ]
    };
  };
  const build = Function(
    'state', 'groupCombatState', 'mobInspectorOpponentKey', 'mobInspectorNameMatches',
    `let mobInspectorEngagedGroupSource = Symbol('unset');\nlet mobInspectorEngagedOpponentKey = '';\nlet mobInspectorEngagedCountCache = 0;\n${helperSource}\nreturn mobInspectorOtherEngagedCountForOpponent;`
  );
  const countEngaged = build(
    state,
    groupCombatState,
    (opponent) => `vnum:${Number(opponent?.vnum) || 0}`,
    (left, right) => String(left || '').toLowerCase() === String(right || '').toLowerCase()
  );

  const firstOpponent = { name: 'Crater Kaiju', vnum: 58123, hp: 500000 };
  assert.equal(countEngaged(firstOpponent, state.gmcp.group), 2);
  assert.equal(groupCalls, 1);

  const hpOnlyUpdate = { name: 'Crater Kaiju', vnum: 58123, hp: 400000 };
  assert.equal(countEngaged(hpOnlyUpdate, state.gmcp.group), 2);
  assert.equal(groupCalls, 1, 'same Group source and target identity should reuse engaged count');

  state.gmcp.group = {};
  assert.equal(countEngaged(hpOnlyUpdate, state.gmcp.group), 2);
  assert.equal(groupCalls, 2, 'new Group source should invalidate engaged count');
});

