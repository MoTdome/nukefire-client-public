'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  GmcpStore,
  applyEventPatch,
  canonicalPackageName,
  initialState
} = require('../src/gmcp-store');

test('canonicalizes NukeFire package names case-insensitively', () => {
  assert.equal(canonicalPackageName('char.vitals'), 'Char.Vitals');
  assert.equal(canonicalPackageName('ROOM.INFO'), 'Room.Info');
  assert.equal(canonicalPackageName('group'), 'Group');
  assert.equal(canonicalPackageName('group.remove'), 'Group.Remove');
  assert.equal(canonicalPackageName('NUKEFIRE.COMMS.MESSAGE'), 'NukeFire.Comms.Message');
  assert.equal(canonicalPackageName('NUKEFIRE.MAP.LOCAL'), 'NukeFire.Map.Local');
  assert.equal(canonicalPackageName('NUKEFIRE.GPS.CATALOG.PAGE'), 'NukeFire.GPS.Catalog.Page');
  assert.equal(canonicalPackageName('NUKEFIRE.CONTEXT'), 'NukeFire.Context');
  assert.equal(canonicalPackageName('NUKEFIRE.CONTROLS'), 'NukeFire.Controls');
  assert.equal(canonicalPackageName('NUKEFIRE.COMBAT'), 'NukeFire.Combat');
  assert.equal(canonicalPackageName('NUKEFIRE.AFFECTS'), 'NukeFire.Affects');
  assert.equal(canonicalPackageName('NUKEFIRE.MOB.INFO'), 'NukeFire.Mob.Info');
  assert.equal(canonicalPackageName('NUKEFIRE.FOUNDLIST.INFO'), 'NukeFire.Foundlist.Info');
  assert.equal(canonicalPackageName('NUKEFIRE.KNOWLEDGE.RESULTS'), 'NukeFire.Knowledge.Results');
  assert.equal(canonicalPackageName('Custom.Widget'), 'Custom.Widget');
});

test('stores structured character, room, and group state', () => {
  const store = new GmcpStore();

  store.apply({
    packageName: 'Char.Vitals',
    body: {
      hp: 900,
      mhp: 1000,
      mana: 400,
      mmana: 500,
      move: 300,
      mmove: 600
    }
  });

  store.apply({
    packageName: 'Char.Status',
    body: {
      name: 'Mo',
      class: 'Cyborg',
      level: 100
    }
  });

  store.apply({
    packageName: 'Room.Info',
    body: {
      num: 15200,
      name: 'The NukeFire Nexus',
      exits: { north: 15201 }
    }
  });

  const event = store.apply({
    packageName: 'group',
    body: {
      leader: 'Mo',
      count: 2,
      members: [
        { name: 'Mo', info: { hp: 900, mhp: 1000 } },
        { name: 'Ally', info: { hp: 500, mhp: 700 } }
      ],
      enemies: []
    }
  });

  assert.equal(event.packageName, 'Group');
  assert.deepEqual(event.path, ['group']);
  assert.equal(event.state.char.vitals.mhp, 1000);
  assert.equal(event.state.char.status.name, 'Mo');
  assert.equal(event.state.room.info.num, 15200);
  assert.equal(event.state.group.count, 2);
  assert.equal(event.state.meta.messageCount, 4);
});


test('stores the latest server-authoritative Mob Inspector snapshot', () => {
  const store = new GmcpStore();
  const event = store.apply({
    packageName: 'nukefire.mob.info',
    body: { schema: 1, trigger: 'mobcount', mob: { vnum: 30319, name: 'The Statue' } }
  });

  assert.equal(event.packageName, 'NukeFire.Mob.Info');
  assert.deepEqual(event.path, ['mob', 'info']);
  assert.equal(event.state.mob.info.mob.vnum, 30319);
  assert.equal(store.snapshot().mob.info.trigger, 'mobcount');
});

test('stores the latest server-authoritative Foundlist snapshot', () => {
  const store = new GmcpStore();
  store.apply({ packageName: 'NukeFire.Foundlist.Info', body: {
    schema: 1, zone: { vnum: 300, name: 'The Road of Ra' },
    summary: { found: 1 }, items: [{ vnum: 30001, name: 'Sun Ring', verdict: 'upgrade' }]
  } });
  const snapshot = store.snapshot();
  assert.equal(snapshot.foundlist.info.zone.vnum, 300);
  assert.equal(snapshot.foundlist.info.items[0].verdict, 'upgrade');
});


test('applies NukeFire group.remove packets to the cached group', () => {
  const store = new GmcpStore();
  store.apply({
    packageName: 'group',
    body: {
      count: 3,
      members: [
        { name: 'Mo' },
        { name: 'Ally' },
        { name: 'Third' }
      ]
    }
  });

  const event = store.apply({
    packageName: 'GROUP.REMOVE',
    body: { name: 'ally' }
  });

  assert.equal(event.state.group.count, 2);
  assert.deepEqual(
    event.state.group.members.map((member) => member.name),
    ['Mo', 'Third']
  );
});

test('keeps a bounded channel history and the most recent channel event', () => {
  const store = new GmcpStore({ maxChannelHistory: 2 });

  store.apply({
    packageName: 'Comm.Channel',
    body: { chan: 'gossip', player: 'A', msg: 'one' }
  });
  store.apply({
    packageName: 'Comm.Channel',
    body: { chan: 'gossip', player: 'B', msg: 'two' }
  });
  const event = store.apply({
    packageName: 'Comm.Channel',
    body: { chan: 'ssf', player: 'C', msg: 'three' }
  });

  assert.equal(event.state.comm.channel.msg, 'three');
  assert.deepEqual(
    event.state.comm.history.map((entry) => entry.msg),
    ['two', 'three']
  );
});


test('stores structured NukeFire communications messages in channel history', () => {
  const store = new GmcpStore({ maxChannelHistory: 3 });
  const event = store.apply({
    packageName: 'nukefire.comms.message',
    body: { channel: 'tell', sender: 'Prime', text: 'Hello' }
  });

  assert.equal(event.packageName, 'NukeFire.Comms.Message');
  assert.deepEqual(event.path, ['comm', 'channel']);
  assert.equal(event.state.comm.channel.text, 'Hello');
  assert.equal(event.state.comm.history.length, 1);
});

test('snapshots are detached from caller and consumer mutations', () => {
  const store = new GmcpStore();
  const body = { hp: 100 };
  const event = store.apply({ packageName: 'Char.Vitals', body });

  body.hp = 1;
  event.state.char.vitals.hp = 2;

  assert.equal(store.snapshot().char.vitals.hp, 100);
});

test('stores live BIGMAP cartography packets', () => {
  const store = new GmcpStore();
  const event = store.apply({
    packageName: 'nukefire.map.local',
    body: { center: 3010, rooms: [{ vnum: 3010, x: 0, y: 0, z: 0 }], links: [] }
  });

  assert.equal(event.packageName, 'NukeFire.Map.Local');
  assert.deepEqual(event.path, ['map', 'local']);
  assert.equal(event.state.map.local.center, 3010);
});


test('assembles chunked NukeFire GPS destination catalogs', () => {
  const store = new GmcpStore();
  store.apply({
    packageName: 'NukeFire.GPS.Catalog.Begin',
    body: { version: 3, count: 3, pages: 2 }
  });
  store.apply({
    packageName: 'NukeFire.GPS.Catalog.Page',
    body: {
      version: 3,
      page: 1,
      pages: 2,
      destinations: [
        { index: 164, room: 3180, name: 'Remorter', category: 'City Services', zone: 30, aliases: 'remort', tags: 'service' },
        { index: 1, room: 3014, name: 'Tek Angeles', category: 'Main Cities', zone: 30 }
      ]
    }
  });
  store.apply({
    packageName: 'NukeFire.GPS.Catalog.Page',
    body: {
      version: 3,
      page: 2,
      pages: 2,
      destinations: [
        { index: 107, room: 20333, name: 'The Tekforge', category: 'Crafting', zone: 203, available: true }
      ]
    }
  });
  const event = store.apply({
    packageName: 'NukeFire.GPS.Catalog.End',
    body: { version: 3, count: 3, pages: 2 }
  });

  assert.deepEqual(event.path, ['gps', 'catalog']);
  assert.equal(event.state.gps.catalog.complete, true);
  assert.equal(event.state.gps.catalog.received, 3);
  assert.deepEqual(event.state.gps.catalog.items.map((item) => item.index), [1, 107, 164]);
  assert.equal(event.state.gps.catalog.items[2].aliases, 'remort');
});


test('stores the current server-authoritative NukeFire Context Deck snapshot', () => {
  const store = new GmcpStore();
  const event = store.apply({
    packageName: 'nukefire.context',
    body: {
      schema: 1,
      room: 3218,
      zone: 30,
      contexts: [{ id: 'ink-master', title: 'Chromatic Ink-Master', actions: [] }]
    }
  });

  assert.equal(event.packageName, 'NukeFire.Context');
  assert.deepEqual(event.path, ['context', 'state']);
  assert.equal(event.state.context.state.room, 3218);
  assert.equal(event.state.context.state.contexts[0].id, 'ink-master');
});


test('stores the current NukeFire player affect snapshot', () => {
  const store = new GmcpStore();
  const event = store.apply({
    packageName: 'nukefire.affects',
    body: { revision: 4, count: 1, effects: [{ id: '1', spell: 'Battle Roar', remaining: 30 }] }
  });
  assert.equal(event.packageName, 'NukeFire.Affects');
  assert.deepEqual(event.path, ['affects', 'state']);
  assert.equal(event.state.affects.state.revision, 4);
});


test('stores Knowledge search, entry, and error packets independently', () => {
  const store = new GmcpStore();
  let event = store.apply({
    packageName: 'nukefire.knowledge.results',
    body: { requestId: 'q1', query: 'true damage', results: [{ type: 'help', key: 'TRUE-DAMAGE' }] }
  });
  assert.deepEqual(event.path, ['knowledge', 'results']);
  assert.equal(event.state.knowledge.results.requestId, 'q1');

  event = store.apply({
    packageName: 'NukeFire.Knowledge.Entry',
    body: { requestId: 'e1', type: 'help', key: 'TRUE-DAMAGE', title: 'True Damage' }
  });
  assert.deepEqual(event.path, ['knowledge', 'entry']);
  assert.equal(event.state.knowledge.entry.title, 'True Damage');

  event = store.apply({
    packageName: 'NukeFire.Knowledge.Error',
    body: { requestId: 'e2', code: 'not-found', message: 'Missing' }
  });
  assert.deepEqual(event.path, ['knowledge', 'error']);
  assert.equal(event.state.knowledge.error.code, 'not-found');
});


test('compact GMCP events carry only the changed path and derived values when required', () => {
  const store = new GmcpStore({ includeStateInEvents: false });
  let event = store.apply({ packageName: 'Char.Vitals', body: { hp: 900, mhp: 1000 } });
  assert.equal(event.state, undefined);
  assert.deepEqual(event.path, ['char', 'vitals']);
  assert.equal(event.value, undefined);
  assert.deepEqual(event.body, { hp: 900, mhp: 1000 });

  store.apply({
    packageName: 'Group',
    body: { count: 2, members: [{ name: 'Mo' }, { name: 'Ally' }] }
  });
  event = store.apply({ packageName: 'Group.Remove', body: { name: 'Ally' } });
  assert.deepEqual(event.path, ['group']);
  assert.equal(event.value.count, 1);
  assert.deepEqual(event.value.members.map((member) => member.name), ['Mo']);
});

test('renderer-style GMCP event patches reconstruct the same current state', () => {
  const store = new GmcpStore({ includeStateInEvents: false });
  let snapshot = initialState();
  const events = [
    store.apply({ packageName: 'Char.Status', body: { name: 'Mo' } }),
    store.apply({ packageName: 'Char.Vitals', body: { hp: 900, mhp: 1000 } }),
    store.apply({ packageName: 'Room.Info', body: { num: 3014, name: 'Tek Angeles' } }),
    store.apply({ packageName: 'Group', body: { count: 2, members: [{ name: 'Mo' }, { name: 'Ally' }] } }),
    store.apply({ packageName: 'Group.Remove', body: { name: 'Ally' } })
  ];
  for (const event of events) snapshot = applyEventPatch(snapshot, event);
  assert.equal(snapshot.char.status.name, 'Mo');
  assert.equal(snapshot.char.vitals.hp, 900);
  assert.equal(snapshot.room.info.num, 3014);
  assert.equal(snapshot.group.count, 1);
  assert.equal(snapshot.meta.messageCount, 5);
});


test('stores server-authoritative semantic controls', () => {
  const store = new GmcpStore();
  const event = store.apply({
    packageName: 'nukefire.controls',
    body: {
      schema: 1,
      combo: { activeProfile: 'breaker', profiles: [] },
      groupassist: { targets: [] },
      path: { actions: [] }
    }
  });

  assert.equal(event.packageName, 'NukeFire.Controls');
  assert.deepEqual(event.path, ['controls', 'state']);
  assert.equal(event.state.controls.state.combo.activeProfile, 'breaker');
});
