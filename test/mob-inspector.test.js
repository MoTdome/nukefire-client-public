'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeMobInfo,
  snapshotSignature,
  category,
  iconDefinition,
  descriptorLabels,
  namesMatch,
  matchesOpponent,
  isClearPacket
} = require('../src/mob-inspector');

test('normalizes the schema-1 NukeFire.Mob.Info server contract and lookup provenance', () => {
  const snapshot = normalizeMobInfo({
    schema: 1,
    trigger: 'CONSIDER',
    server_time: 1234,
    context: {
      lookup_arg: '2.statue',
      lookup_had_argument: true,
      resolved_from_current_target: false,
      room_vnum: 64501,
      is_current_target: false,
      in_combat_with_player: false
    },
    mob: {
      vnum: 30319,
      instance_id: 445566,
      name: 'The Statue',
      keywords: 'statue ra',
      level: 50,
      remorts: 325,
      class: 'Occultist',
      flags: { boss: true, undead: true, aggressive: true }
    },
    health: { available: true, current: 680, max: 1000, percent: 68, fighting: 'Mo' },
    zone: { vnum: 645, name: 'The Road of Ra', suggested_remorts: '251-399R' },
    consider: { available: true, score: 8, label: 'Hard fight', advice: 'Bring help.', group_size: 2, group_avg_remorts: 300, group_label: 'Group' },
    history: { available: true, your_kills: 17, world_kills: 900, your_rank: 4, live_world: 1, live_zone: 1, exact_mob_deaths_available: false, last_kill_available: false },
    zone_mastery: { available: true, kills: 44, deaths: 2, boss_kills: 8, miniboss_kills: 3, toughest_kill: 'The Statue', scope: 'zone' },
    affects: {
      schema: 1,
      server_time: 1234,
      count: 1,
      total: 1,
      effects: [{ id: '77', spell_id: 900, spell: 'Stone Skin', permanent: true, apply: 'armor', modifier: 125, source_type: 'spell' }]
    }
  });

  assert.equal(snapshot.trigger, 'consider');
  assert.equal(snapshot.context.lookupArg, '2.statue');
  assert.equal(snapshot.context.lookupHadArgument, true);
  assert.equal(snapshot.context.resolvedFromCurrentTarget, false);
  assert.equal(snapshot.context.roomVnum, 64501);
  assert.equal(snapshot.mob.vnum, 30319);
  assert.equal(snapshot.mob.instanceId, 445566);
  assert.equal(snapshot.mob.className, 'Occultist');
  assert.equal(snapshot.mob.flags.boss, true);
  assert.equal(snapshot.health.percent, 68);
  assert.equal(snapshot.zone.suggestedRemorts, '251-399R');
  assert.equal(snapshot.history.yourKills, 17);
  assert.equal(snapshot.history.exactMobDeathsAvailable, false);
  assert.equal(snapshot.zoneMastery.deaths, 2);
  assert.equal(snapshot.affects.effects[0].sourceType, 'spell');
  assert.equal(category(snapshot).id, 'undead');
  assert.ok(iconDefinition('undead').paths.length >= 2);
  assert.deepEqual(descriptorLabels(snapshot), ['Boss', 'Undead', 'Aggressive', 'Occultist']);
  assert.match(snapshotSignature(snapshot), /30319/u);
});

test('bounds malformed mob data and never invents unsupported history', () => {
  const snapshot = normalizeMobInfo({
    mob: { vnum: '12', name: '\u0000Thing', flags: { machine: 1 } },
    health: { percent: 800 },
    history: { exact_mob_deaths_available: 1, last_kill_available: 1 },
    affects: { effects: [{ spell: 'Blind', expire_at: 20 }] }
  });

  assert.equal(snapshot.mob.name, 'Thing');
  assert.equal(snapshot.mob.flags.machine, false, 'protocol booleans stay strict');
  assert.equal(snapshot.health.percent, 100);
  assert.equal(snapshot.history.exactMobDeathsAvailable, true);
  assert.equal(snapshot.history.lastKillAvailable, true);
  assert.equal(snapshot.affects.effects[0].spell, 'Blind');
});

test('generic monster art is chosen from server facts instead of mob-name guessing', () => {
  assert.equal(category({ mob: { flags: { machine: true } } }).id, 'machine');
  assert.equal(category({ mob: { flags: { undead: true }, class: 'Occultist' } }).id, 'undead');
  assert.equal(category({ mob: { flags: {}, class: 'Occultist' } }).id, 'caster');
  assert.equal(category({ mob: { flags: {}, class: 'Warrior' } }).id, 'fighter');
  assert.equal(category({ mob: { name: 'Dragon Demon Spider', flags: {} } }).id, 'creature');
  assert.ok(iconDefinition('not-a-category').paths.length >= 2, 'unknown categories fall back to the generic creature emblem');
});

test('mob display names can be matched without manufacturing command arguments', () => {
  assert.equal(namesMatch('The Statue', '  the statue  '), true);
  assert.equal(namesMatch('The Statue', 'Statue'), false);
  assert.equal(namesMatch('', 'Statue'), false);
  assert.equal(matchesOpponent({ mob: { vnum: 30319, name: 'The Statue' } }, { vnum: 30319, name: 'Something Else' }), true);
  assert.equal(matchesOpponent({ mob: { vnum: 30319, name: 'The Statue' } }, { vnum: 30320, name: 'The Statue' }), false);
});


test('mob instance identity outranks shared vnum/name and clear packets are explicit', () => {
  const first = { mob: { vnum: 30319, instance_id: 1001, name: 'The Statue' } };
  assert.equal(matchesOpponent(first, { vnum: 30319, instanceId: 1001, name: 'The Statue' }), true);
  assert.equal(matchesOpponent(first, { vnum: 30319, instanceId: 1002, name: 'The Statue' }), false);
  assert.equal(isClearPacket({ clear: true, context: { status: 'no_current_target' }, mob: null }), true);
  assert.equal(isClearPacket({ context: { status: 'no_current_target' }, mob: null }), true);
  assert.equal(isClearPacket({ mob: { vnum: 30319 } }), false);
});

test('canonical Mob Inspector snapshots can be reused without changing helper semantics', () => {
  const normalized = normalizeMobInfo({
    mob: { vnum: 30319, instance_id: 77, name: 'The Statue', class: 'Occultist', flags: { undead: true, aggressive: true } },
    context: { room_vnum: 64501 }
  });
  assert.equal(snapshotSignature(normalized, { normalized: true }), snapshotSignature(normalized));
  assert.deepEqual(category(normalized, { normalized: true }), category(normalized));
  assert.deepEqual(descriptorLabels(normalized, { normalized: true }), descriptorLabels(normalized));
  assert.equal(
    matchesOpponent(normalized, { vnum: 30319, instanceId: 77, name: 'The Statue' }, { normalized: true }),
    true
  );
});
