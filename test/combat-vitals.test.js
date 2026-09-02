'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeEntity,
  normalizeGroup,
  normalizeOpponent,
  normalizeVitals,
  healthPercent,
  formatVitalValue,
  normalizeVitalDisplayMode,
  normalizeVitalNumberSize,
  visibleGroupMembers,
  enemyForMember
} = require('../src/combat-vitals');

test('normalizes NukeFire opponent and group vital aliases without losing real values', () => {
  const opponent = normalizeOpponent({
    name: 'a reactor brute', vnum: 44001, instance_id: 998877, hp: 750, mhp: 1000,
    mn: 40, mmn: 80, mv: 12, mmv: 20, level: 88
  });

  assert.deepEqual(
    {
      name: opponent.name,
      hp: opponent.hp,
      maxHp: opponent.maxHp,
      mana: opponent.mana,
      maxMana: opponent.maxMana,
      move: opponent.move,
      maxMove: opponent.maxMove,
      level: opponent.level,
      vnum: opponent.vnum,
      instanceId: opponent.instanceId
    },
    {
      name: 'a reactor brute', hp: 750, maxHp: 1000,
      mana: 40, maxMana: 80, move: 12, maxMove: 20, level: 88, vnum: 44001, instanceId: 998877
    }
  );
  assert.equal(healthPercent(opponent), 75);

  const member = normalizeEntity({
    name: 'Prime',
    info: { hp: 900, mhp: 1200, mn: 300, mmn: 500, mv: 250, mmv: 400, lvl: 100, here: 1, opponent: 'a reactor brute' }
  }, { kind: 'member' });
  assert.equal(member.name, 'Prime');
  assert.equal(member.opponent.name, 'a reactor brute');
  assert.equal(member.here, true);
});


test('normalizes one canonical Char.Vitals model with max-stat fallbacks and opponent state', () => {
  const model = normalizeVitals({
    hp: '750', mana: 400, move: 120,
    opponent: { name: 'a reactor brute', hp: 375, mhp: 500, vnum: 44001 }
  }, {
    maxhp: 1000, maxmana: 800, maxmoves: 240
  });

  assert.deepEqual(
    {
      hp: model.hp,
      maxHp: model.maxHp,
      mana: model.mana,
      maxMana: model.maxMana,
      move: model.move,
      maxMove: model.maxMove,
      hpPercent: model.hpPercent,
      manaPercent: model.manaPercent,
      movePercent: model.movePercent,
      opponent: model.opponent && {
        name: model.opponent.name,
        hp: model.opponent.hp,
        maxHp: model.opponent.maxHp,
        vnum: model.opponent.vnum
      }
    },
    {
      hp: 750, maxHp: 1000,
      mana: 400, maxMana: 800,
      move: 120, maxMove: 240,
      hpPercent: 75, manaPercent: 50, movePercent: 50,
      opponent: { name: 'a reactor brute', hp: 375, maxHp: 500, vnum: 44001 }
    }
  );
});

test('maps each group member to the matching deduplicated enemy snapshot', () => {
  const group = normalizeGroup({
    leader: 'Prime',
    count: 2,
    members: [
      { name: 'Prime', info: { hp: 900, mhp: 1200, opponent: 'a reactor brute' } },
      { name: 'Rambo', info: { hp: 700, mhp: 1000, opponent: 'a waste stalker' } }
    ],
    enemies: [
      { name: 'a reactor brute', info: { hp: 750, mhp: 1000 } },
      { name: 'a waste stalker', info: { hp: 300, mhp: 900 } }
    ]
  });

  assert.equal(group.members.length, 2);
  assert.equal(group.enemies.length, 2);
  assert.equal(enemyForMember(group.members[0], group.enemies).hp, 750);
  assert.equal(enemyForMember(group.members[1], group.enemies).maxHp, 900);
});


test('formats HMV values as totals, percentages, combined values, or current-only text', () => {
  assert.equal(formatVitalValue(750, 1000, { mode: 'values', prefix: 'H ' }), 'H 750 / 1,000');
  assert.equal(formatVitalValue(750, 1000, { mode: 'values-percent', prefix: 'H ' }), 'H 750 / 1,000 · 75%');
  assert.equal(formatVitalValue(750, 1000, { mode: 'percent', prefix: 'H ' }), 'H 75%');
  assert.equal(formatVitalValue(750, 1000, { mode: 'current', prefix: 'H ' }), 'H 750');
  assert.equal(formatVitalValue(750, null, { mode: 'percent' }), '—');
  assert.equal(normalizeVitalDisplayMode('nonsense'), 'values-percent');
  assert.equal(normalizeVitalNumberSize('LARGE'), 'large');
});

test('hides only the current character duplicate from a real multi-member group', () => {
  const members = [{ name: 'Prime' }, { name: 'Rambo' }, { name: 'Medic' }];
  assert.deepEqual(visibleGroupMembers(members, 'prime', true).map((member) => member.name), ['Rambo', 'Medic']);
  assert.equal(visibleGroupMembers([{ name: 'Prime' }], 'Prime', true).length, 1);
  assert.equal(visibleGroupMembers(members, 'Prime', false).length, 3);
});
