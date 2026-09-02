'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { MapStore, MAP_SCHEMA_VERSION } = require('../src/map-store');
const { MapperGraph } = require('../src/mapper');

async function temporaryDirectory() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'nukefire-map-'));
}

test('persists server-confirmed graph connections and character visitation atomically', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'Technology Square', exits: { north: 3011 } }, { characterKey: 'prime' });
  graph.observeRoom({ num: 3011, name: 'Transit Walkway', exits: { south: 3010 } }, {
    previousRoomId: 3010, direction: 'north', characterKey: 'prime'
  });

  const store = new MapStore({ baseDirectory: directory });
  await store.load();
  const acknowledgement = await store.save(graph.serialize());
  assert.deepEqual(acknowledgement, {
    schemaVersion: MAP_SCHEMA_VERSION,
    updatedAt: acknowledgement.updatedAt,
    rooms: 2,
    characters: 1
  });
  assert.equal(typeof acknowledgement.updatedAt, 'string');
  assert.equal(Object.hasOwn(acknowledgement, 'map'), false);

  const restored = await new MapStore({ baseDirectory: directory }).load();
  assert.equal(restored.schemaVersion, MAP_SCHEMA_VERSION);
  assert.equal(restored.rooms['3010'].exits.north, '3011');
  assert.deepEqual(restored.characters.prime.visited, ['3010', '3011']);
});

test('recovers from the backup when map.json is damaged', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const store = new MapStore({ baseDirectory: directory });
  const first = await store.load();
  first.rooms['3010'] = {
    id: '3010', vnum: 3010, name: 'Technology Square', zone: 30, terrain: '',
    x: 0, y: 0, z: 0, exits: {}, discoveredAt: 1, updatedAt: 1
  };
  await store.save(first);
  const second = JSON.parse(JSON.stringify(first));
  second.rooms['3011'] = {
    id: '3011', vnum: 3011, name: 'Transit Walkway', zone: 30, terrain: '',
    x: 0, y: -1, z: 0, exits: {}, discoveredAt: 2, updatedAt: 2
  };
  await store.save(second);
  await fs.writeFile(path.join(directory, 'map.json'), '{broken', 'utf8');

  const restored = await new MapStore({ baseDirectory: directory }).load();
  assert.ok(restored.rooms['3010']);
  assert.equal(restored.rooms['3011'], undefined);
});
