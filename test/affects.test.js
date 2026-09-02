'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_EFFECTS,
  normalizeAffectsState,
  groupEffects,
  remainingSeconds,
  formatRemaining,
  sourceTypeLabel,
  groupDetailLines,
  snapshotSignature
} = require('../src/affects');

test('normalizes and bounds NukeFire affect packets', () => {
  const effects = Array.from({ length: MAX_EFFECTS + 10 }, (_, index) => ({
    id: String(index + 1),
    spell_id: index + 100,
    spell: `Effect\n${index}`,
    remaining: 90,
    expire_at: 2000,
    source_type: 'spell',
    apply: 'damroll',
    modifier: 5
  }));
  const snapshot = normalizeAffectsState({ schema: 1, revision: 7, server_time: 1000, effects });
  assert.equal(snapshot.effects.length, MAX_EFFECTS);
  assert.equal(snapshot.revision, 7);
  assert.doesNotMatch(snapshot.effects[0].spell, /[\r\n]/u);
});

test('groups multiple modifier rows from the same active spell', () => {
  const groups = groupEffects({ effects: [
    { id: '1', spell_id: 520, spell: 'Radiant Smite', expire_at: 1100, remaining: 100, source_type: 'spell', apply: 'damroll', modifier: 25 },
    { id: '2', spell_id: 520, spell: 'Radiant Smite', expire_at: 1100, remaining: 100, source_type: 'spell', apply: 'hitroll', modifier: 20 },
    { id: '3', spell_id: 521, spell: 'Censure', expire_at: 1050, remaining: 50, source_type: 'spell' }
  ] });
  assert.equal(groups.length, 2);
  assert.equal(groups[1].spell, 'Radiant Smite');
  assert.deepEqual(groups[1].modifiers.map((entry) => entry.apply), ['damroll', 'hitroll']);
});

test('counts down from server time locally without requiring GMCP every second', () => {
  const snapshot = normalizeAffectsState({ server_time: 1000, effects: [] });
  const effect = { permanent: false, expireAt: 1065, remaining: 65 };
  assert.equal(remainingSeconds(effect, snapshot, 5_000, 10_000), 60);
  assert.equal(formatRemaining(60), '1m 0s');
  assert.equal(formatRemaining(-1, true), 'Permanent');
});

test('uses revision as a stable no-rerender signature', () => {
  assert.equal(snapshotSignature({ revision: 42, effects: [{ spell: 'A' }] }), 'revision:42');
  assert.equal(snapshotSignature({ revision: 42, effects: [{ spell: 'B' }] }), 'revision:42');
});


test('labels affect sources for compact detail disclosure', () => {
  assert.equal(sourceTypeLabel('spell'), 'Spell');
  assert.equal(sourceTypeLabel('object'), 'Equipment');
  assert.equal(sourceTypeLabel('implant'), 'Implant');
  assert.equal(sourceTypeLabel('tattoo'), 'Tattoo');
  assert.equal(sourceTypeLabel('remort'), 'Remort');
});

test('formats grouped modifier and granted-skill details without duplicate UI logic', () => {
  assert.deepEqual(groupDetailLines({
    modifiers: [
      { apply: 'damroll', modifier: 25 },
      { apply: 'armor', modifier: -10 }
    ],
    grants: ['Radiant Smite']
  }), ['+25 damroll', '-10 armor', 'Grants Radiant Smite']);
});

test('canonical affects snapshots can skip repeated normalization in hot consumers', () => {
  const raw = {
    revision: 0,
    server_time: 1000,
    effects: [
      { id: '1', spell_id: 520, spell: 'Radiant Smite', expire_at: 1100, remaining: 100, source_type: 'spell', apply: 'damroll', modifier: 25 },
      { id: '2', spell_id: 520, spell: 'Radiant Smite', expire_at: 1100, remaining: 100, source_type: 'spell', apply: 'hitroll', modifier: 20 }
    ]
  };
  const normalized = normalizeAffectsState(raw);
  assert.deepEqual(groupEffects(normalized, { normalized: true }), groupEffects(raw));
  assert.equal(snapshotSignature(normalized, { normalized: true }), snapshotSignature(raw));
  assert.equal(remainingSeconds(normalized.effects[0], normalized, 5_000, 10_000), 95);
});
