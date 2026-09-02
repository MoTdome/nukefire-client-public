'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const gmcpStore = require('../src/gmcp-store');
const combatVitals = require('../src/combat-vitals');
const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

function sampleGroup(size = 40) {
  const members = [];
  const enemies = [];
  for (let index = 0; index < size; index += 1) {
    members.push({
      name: `Player${index}`,
      info: {
        hp: 800000 - index * 101,
        mhp: 900000,
        mn: 500000 - index * 37,
        mmn: 600000,
        mv: 300000 - index * 19,
        mmv: 350000,
        lvl: 50,
        here: 1,
        opponent: { name: `Enemy${index}`, hp: 700000 - index * 73, mhp: 800000 }
      }
    });
    enemies.push({
      name: `Enemy${index}`,
      info: { hp: 700000 - index * 73, mhp: 800000, level: 55, here: 1 }
    });
  }
  return { leader: 'Player0', count: members.length, members, enemies };
}

test('compact GMCP patches preserve the group object across unrelated status updates', () => {
  const snapshot = gmcpStore.initialState();
  const group = sampleGroup(4);
  gmcpStore.applyEventPatch(snapshot, { packageName: 'Group', path: ['group'], body: group });
  const stableGroup = snapshot.group;

  gmcpStore.applyEventPatch(snapshot, {
    packageName: 'Char.Status',
    path: ['char', 'status'],
    body: { name: 'Player0', level: 50, exp: 123 }
  });
  assert.equal(snapshot.group, stableGroup);

  const replacement = sampleGroup(5);
  gmcpStore.applyEventPatch(snapshot, { packageName: 'Group', path: ['group'], body: replacement });
  assert.equal(snapshot.group, replacement);
  assert.notEqual(snapshot.group, stableGroup);
});

test('renderer caches canonical group state by GMCP group identity instead of serializing it', () => {
  assert.match(renderer, /groupCombatStateSource === source && groupCombatStateCache/u);
  assert.match(renderer, /groupVitalsRenderSource === groupSource && groupVitalsRenderSignature === renderSignature/u);
  assert.match(renderer, /gmcpPackageMatches\(packageName, \['Group', 'Group\.Remove'\]\)\) invalidateGroupCombatState\(\)/u);

  const renderBlock = renderer.match(/function renderGroupVitals\(\) \{([\s\S]*?)\n\}\n\nfunction parseVitalsFromText/u)?.[1] || '';
  assert.ok(renderBlock, 'renderGroupVitals block should be found');
  assert.doesNotMatch(renderBlock, /JSON\.stringify/u);
});

test('identity reuse makes unchanged large-group change detection substantially cheaper', () => {
  const group = sampleGroup(40);
  const iterations = 4000;
  let baselineSink = 0;
  const baselineStart = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    baselineSink += JSON.stringify(combatVitals.normalizeGroup(group)).length;
  }
  const baselineMs = performance.now() - baselineStart;

  let cachedSource = null;
  let cachedGroup = null;
  let candidateSink = 0;
  const candidateStart = performance.now();
  for (let index = 0; index < iterations; index += 1) {
    if (cachedSource !== group) {
      cachedSource = group;
      cachedGroup = combatVitals.normalizeGroup(group);
    }
    candidateSink += cachedGroup.members.length + cachedGroup.enemies.length;
  }
  const candidateMs = performance.now() - candidateStart;

  assert.ok(baselineSink > candidateSink);
  assert.ok(candidateMs * 5 < baselineMs, `expected >=5x cheaper unchanged path; baseline=${baselineMs.toFixed(2)}ms candidate=${candidateMs.toFixed(2)}ms`);
});
