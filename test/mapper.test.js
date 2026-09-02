'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MapperGraph,
  normalizeDirection,
  normalizeRoomInfo,
  normalizeMapData,
  normalizeCanvasHeight,
  terrainPresentation,
  authoritativeRoute,
  authoritativeStep,
  learnedRoute
} = require('../src/mapper');

test('normalizes movement aliases without treating compound commands as movement', () => {
  assert.equal(normalizeDirection('n'), 'north');
  assert.equal(normalizeDirection('DOWN'), 'down');
  assert.equal(normalizeDirection('run north'), '');
  assert.equal(normalizeDirection('look'), '');
});

test('normalizes NukeFire room information and infers the zone from vnum', () => {
  assert.deepEqual(normalizeRoomInfo({ num: 3010, name: 'Technology Square' }), {
    id: '3010', vnum: 3010, name: 'Technology Square', zone: 30, terrain: '', exits: {}
  });
});


test('assigns stable terrain presentations for NukeFire sector names', () => {
  assert.deepEqual(terrainPresentation('Forest'), {
    key: 'forest', label: 'Forest', nukefireColor: '[F040]', fill: '#00d700', stroke: '#e8edf2'
  });
  assert.equal(terrainPresentation('City').nukefireColor, '[F545]');
  assert.equal(terrainPresentation('Desert Road').nukefireColor, '[F333]');
  assert.equal(terrainPresentation('Jungle').nukefireColor, '[F230]');
  assert.equal(terrainPresentation('Water (No Swim)').key, 'deep-water');
  assert.equal(terrainPresentation('Ocean Floor').key, 'ocean-floor');
  assert.equal(terrainPresentation('Enter Atmosphere').key, 'air');
  assert.equal(terrainPresentation('unclassified anomaly').key, 'unknown');
});

test('directional movement positions a room without inventing a connection', () => {
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'Technology Square' }, {
    characterKey: 'prime', characterName: 'Prime', now: 1000
  });
  const result = graph.observeRoom({ num: 3011, name: 'Transit Walkway' }, {
    previousRoomId: 3010, direction: 'north',
    characterKey: 'prime', characterName: 'Prime', now: 1100
  });

  assert.equal(result.linked, false);
  assert.deepEqual(graph.room(3010).exits, {});
  assert.deepEqual(graph.room(3011).exits, {});
  assert.deepEqual(
    { x: graph.room(3011).x, y: graph.room(3011).y, z: graph.room(3011).z },
    { x: 0, y: -1, z: 0 }
  );
});

test('schema 3 migration removes old inferred connections once', () => {
  const migrated = normalizeMapData({
    schemaVersion: 3,
    rooms: {
      3010: { id: 3010, name: 'Origin', x: 0, y: 0, z: 0, exits: { east: 3011 } },
      3011: { id: 3011, name: 'Adjacent', x: 1, y: 0, z: 0, exits: { west: 3010 } }
    },
    characters: {
      prime: { name: 'Prime', visited: [3010, 3011], currentRoomId: 3010 }
    }
  }, 1200);

  assert.equal(migrated.schemaVersion, 4);
  assert.deepEqual(migrated.rooms['3010'].exits, {});
  assert.deepEqual(migrated.rooms['3011'].exits, {});
  assert.deepEqual(migrated.characters.prime.visited, ['3010', '3011']);
});

test('schema 4 preserves server-confirmed stored connections', () => {
  const current = normalizeMapData({
    schemaVersion: 4,
    rooms: {
      3010: { id: 3010, name: 'Origin', x: 0, y: 0, z: 0, exits: { east: 3011 } },
      3011: { id: 3011, name: 'Adjacent', x: 1, y: 0, z: 0, exits: { west: 3010 } }
    }
  }, 1300);

  assert.equal(current.rooms['3010'].exits.east, '3011');
  assert.equal(current.rooms['3011'].exits.west, '3010');
});

test('authoritative Room.Info and BIGMAP snapshots remove stale learned exits', () => {
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'Technology Square', exits: { north: 3011 } }, {
    characterKey: 'prime', characterName: 'Prime', now: 1000
  });
  assert.equal(graph.room(3010).exits.north, '3011');

  graph.observeRoom({ num: 3010, name: 'Technology Square', exits: {} }, {
    characterKey: 'prime', characterName: 'Prime', now: 1100
  });
  assert.deepEqual(graph.room(3010).exits, {});

  graph.applyServerSnapshot({
    center: 3010,
    rooms: [
      { vnum: 3010, name: 'Technology Square', x: 0, y: 0, z: 0 },
      { vnum: 3011, name: 'Transit Walkway', x: 0, y: -1, z: 0 }
    ],
    links: []
  }, { characterKey: 'prime', characterName: 'Prime', now: 1200 });
  assert.deepEqual(graph.room(3010).exits, {});
  assert.deepEqual(graph.room(3011).exits, {});
});

test('does not invent an exit for a teleport-like room change', () => {
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'Technology Square' }, { characterKey: 'prime' });
  graph.observeRoom({ num: 9900, name: 'Remote Chamber' }, {
    previousRoomId: 3010, direction: '', characterKey: 'prime'
  });
  assert.deepEqual(graph.room(3010).exits, {});
  assert.equal(graph.room(9900).x, 4);
});

test('tracks visited rooms and view state separately for each character', () => {
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'Technology Square' }, {
    characterKey: 'prime', characterName: 'Prime'
  });
  graph.observeRoom({ num: 3011, name: 'Transit Walkway' }, {
    previousRoomId: 3010, direction: 'north', characterKey: 'prime', characterName: 'Prime'
  });
  graph.observeRoom({ num: 3010, name: 'Technology Square' }, {
    characterKey: 'caul', characterName: 'Caul'
  });
  graph.updateView('prime', { zoom: 1.7, panX: 42 });

  assert.deepEqual(graph.character('prime').visited, ['3010', '3011']);
  assert.deepEqual(graph.character('caul').visited, ['3010']);
  assert.equal(graph.character('prime').zoom, 1.7);
  assert.equal(graph.character('prime').panX, 42);
  assert.equal(graph.character('caul').zoom, 1);
});



test('persists and clamps mapper canvas height per character', () => {
  const graph = new MapperGraph();
  assert.equal(graph.character('prime').canvasHeight, 360);
  graph.updateView('prime', { canvasHeight: 740 });
  graph.updateView('caul', { canvasHeight: 190 });

  assert.equal(graph.character('prime').canvasHeight, 740);
  assert.equal(graph.character('caul').canvasHeight, 220);
  assert.equal(normalizeCanvasHeight(5000), 1600);

  const restored = normalizeMapData(graph.serialize());
  assert.equal(restored.schemaVersion, 4);
  assert.equal(restored.characters.prime.canvasHeight, 740);
  assert.equal(restored.characters.caul.canvasHeight, 220);
});

test('sanitizes persisted map data and rejects prototype keys', () => {
  const input = JSON.parse('{"rooms":{"3010":{"name":"Technology Square","x":0,"y":0,"z":0}},"characters":{"Prime":{"name":"Prime","visited":[3010,9999]},"__proto__":{"name":"Bad"}}}');
  const normalized = normalizeMapData(input, 1000);
  assert.ok(normalized.rooms['3010']);
  assert.deepEqual(normalized.characters.prime.visited, ['3010']);
  assert.equal(Object.hasOwn(normalized.characters, '__proto__'), false);
});

test('applies a BIGMAP snapshot as authoritative local coordinates and GPS links', () => {
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'Technology Square' }, {
    characterKey: 'prime', characterName: 'Prime', now: 1000
  });

  const result = graph.applyServerSnapshot({
    source: 'bigmap+gps',
    center: 3010,
    rooms: [
      { vnum: 3010, name: 'Technology Square', x: 0, y: 0, z: 0, current: true, route: true },
      { vnum: 3011, name: 'Transit Walkway', x: 0, y: -1, z: 0, route: true },
      { vnum: 3018, name: 'TekStreet Entrance', x: 1, y: 0, z: 0, destination: true }
    ],
    links: [
      { from: 3010, to: 3011, direction: 'north', bidirectional: true, route: true },
      { from: 3010, to: 3018, direction: 'east', bidirectional: true }
    ],
    gps: { active: true, target: 3018, route_raw: 'ne', steps: 2 }
  }, { characterKey: 'prime', characterName: 'Prime', now: 1100 });

  assert.equal(result.changed, true);
  assert.deepEqual(
    { x: graph.room(3011).x, y: graph.room(3011).y, z: graph.room(3011).z },
    { x: 0, y: -1, z: 0 }
  );
  assert.equal(graph.room(3010).exits.north, '3011');
  assert.equal(graph.room(3018).exits.west, '3010');
  assert.equal(graph.character('prime').currentRoomId, '3010');
});


test('builds an authoritative route without inventing reverse one-way travel', () => {
  const snapshot = {
    center: 3010,
    rooms: [
      { vnum: 3010, name: 'A', x: 0, y: 0, z: 0 },
      { vnum: 3011, name: 'B', x: 0, y: -1, z: 0 },
      { vnum: 3012, name: 'C', x: 1, y: -1, z: 0 }
    ],
    links: [
      { from: 3010, to: 3011, direction: 'north', bidirectional: true },
      { from: 3011, to: 3012, direction: 'east', bidirectional: false }
    ]
  };
  assert.deepEqual(authoritativeRoute(snapshot, 3010, 3012).steps.map((step) => step.direction), ['north', 'east']);
  assert.equal(authoritativeRoute(snapshot, 3012, 3011).ok, false);
});

test('authoritative routing refuses closed and locked links', () => {
  const base = {
    center: 3010,
    rooms: [
      { vnum: 3010, name: 'A', x: 0, y: 0, z: 0 },
      { vnum: 3011, name: 'B', x: 1, y: 0, z: 0 }
    ]
  };
  assert.equal(authoritativeRoute({ ...base, links: [
    { from: 3010, to: 3011, direction: 'east', bidirectional: true, closed: true }
  ] }, 3010, 3011).ok, false);
  assert.equal(authoritativeRoute({ ...base, links: [
    { from: 3010, to: 3011, direction: 'east', bidirectional: true, locked: true }
  ] }, 3010, 3011).ok, false);
});

test('map clearing removes only the requested scope', () => {
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'A', zone: 30 }, { characterKey: 'prime', characterName: 'Prime' });
  graph.observeRoom({ num: 3011, name: 'B', zone: 30 }, {
    previousRoomId: 3010, direction: 'north', characterKey: 'prime', characterName: 'Prime'
  });
  graph.observeRoom({ num: 4000, name: 'C', zone: 40 }, { characterKey: 'caul', characterName: 'Caul' });
  assert.equal(graph.clearCharacter('prime'), 2);
  assert.equal(graph.character('prime').visited.length, 0);
  assert.equal(graph.clearZone(30), 2);
  assert.equal(graph.room(3010), null);
  assert.ok(graph.room(4000));
  assert.equal(graph.clearAll(), 1);
  assert.equal(Object.keys(graph.data.rooms).length, 0);
});


test('plans through previously visited rooms outside the current BIGMAP snapshot', () => {
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'A', exits: { north: 3011 } }, {
    characterKey: 'prime', characterName: 'Prime'
  });
  graph.observeRoom({ num: 3011, name: 'B', exits: { east: 3012, south: 3010 } }, {
    previousRoomId: 3010, direction: 'north', characterKey: 'prime', characterName: 'Prime'
  });
  graph.observeRoom({ num: 3012, name: 'C', exits: { west: 3011 } }, {
    previousRoomId: 3011, direction: 'east', characterKey: 'prime', characterName: 'Prime'
  });
  graph.observeRoom({ num: 3010, name: 'A', exits: { north: 3011 } }, {
    characterKey: 'prime', characterName: 'Prime'
  });

  const character = graph.character('prime');
  assert.deepEqual(
    graph.route(3010, 3012, { allowedRoomIds: character.visited }).steps.map((step) => step.direction),
    ['north', 'east']
  );
  assert.deepEqual(
    learnedRoute(graph.serialize(), 3010, 3012, { allowedRoomIds: character.visited }).steps.map((step) => step.direction),
    ['north', 'east']
  );
});

test('learned travel still requires the exact next step in authoritative BIGMAP data', () => {
  const open = {
    center: 3010,
    rooms: [
      { vnum: 3010, name: 'A', x: 0, y: 0, z: 0 },
      { vnum: 3011, name: 'B', x: 0, y: -1, z: 0 }
    ],
    links: [
      { from: 3010, to: 3011, direction: 'north', bidirectional: true }
    ]
  };
  assert.equal(authoritativeStep(open, 3010, 3011, 'north').ok, true);
  assert.equal(authoritativeStep(open, 3011, 3010, 'south').ok, true);
  assert.equal(authoritativeStep({ ...open, links: [
    { from: 3010, to: 3011, direction: 'north', bidirectional: true, closed: true }
  ] }, 3010, 3011, 'north').ok, false);
  assert.equal(authoritativeStep(open, 3010, 3011, 'east').ok, false);
});


test('authoritative local refresh preserves learned exits beyond the packet boundary', () => {
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'A', exits: { north: 3011 } }, { characterKey: 'prime' });
  graph.observeRoom({ num: 3011, name: 'B', exits: { south: 3010, east: 3012 } }, {
    previousRoomId: 3010, direction: 'north', characterKey: 'prime'
  });
  graph.observeRoom({ num: 3012, name: 'C', exits: { west: 3011 } }, {
    previousRoomId: 3011, direction: 'east', characterKey: 'prime'
  });

  graph.applyServerSnapshot({
    center: 3010,
    rooms: [
      { vnum: 3010, name: 'A', x: 0, y: 0, z: 0 },
      { vnum: 3011, name: 'B', x: 0, y: -1, z: 0 }
    ],
    links: [{ from: 3010, to: 3011, direction: 'north', bidirectional: true }]
  }, { characterKey: 'prime' });

  assert.equal(graph.room(3011).exits.east, '3012');

  graph.applyServerSnapshot({
    center: 3011,
    rooms: [
      { vnum: 3011, name: 'B', x: 0, y: 0, z: 0 },
      { vnum: 3012, name: 'C', x: 1, y: 0, z: 0 }
    ],
    links: []
  }, { characterKey: 'prime' });

  assert.equal(graph.room(3011).exits.east, undefined);
});

test('follows and centers the current room by default during ordinary movement', () => {
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'Start' }, {
    characterKey: 'prime', characterName: 'Prime', now: 1000
  });
  const initial = graph.character('prime');
  assert.equal(initial.followPlayer, true);
  assert.deepEqual(
    { viewX: initial.viewX, viewY: initial.viewY, viewZ: initial.viewZ, panX: initial.panX, panY: initial.panY },
    { viewX: 0, viewY: 0, viewZ: 0, panX: 0, panY: 0 }
  );

  graph.observeRoom({ num: 3011, name: 'North' }, {
    previousRoomId: 3010, direction: 'north', characterKey: 'prime', characterName: 'Prime', now: 1100
  });
  const moved = graph.character('prime');
  assert.deepEqual(
    { viewX: moved.viewX, viewY: moved.viewY, viewZ: moved.viewZ, panX: moved.panX, panY: moved.panY },
    { viewX: 0, viewY: -1, viewZ: 0, panX: 0, panY: 0 }
  );
});

test('manual pan is retained until ordinary movement recenters the current room', () => {
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'Start' }, {
    characterKey: 'prime', characterName: 'Prime', now: 1000
  });
  graph.updateView('prime', { panX: 75, panY: -20, followPlayer: false });
  let character = graph.character('prime');
  assert.deepEqual(
    { panX: character.panX, panY: character.panY, followPlayer: character.followPlayer },
    { panX: 75, panY: -20, followPlayer: false }
  );

  graph.observeRoom({ num: 3011, name: 'North' }, {
    previousRoomId: 3010, direction: 'north', characterKey: 'prime', characterName: 'Prime', now: 1100
  });
  character = graph.character('prime');
  assert.deepEqual(
    { viewX: character.viewX, viewY: character.viewY, viewZ: character.viewZ, panX: character.panX, panY: character.panY, followPlayer: character.followPlayer },
    { viewX: 0, viewY: -1, viewZ: 0, panX: 0, panY: 0, followPlayer: true }
  );
});

test('returns persistent explored rooms by viewport and plane instead of a fixed current-room radius', () => {
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'Origin' }, { characterKey: 'prime' });
  let previous = 3010;
  for (let index = 1; index <= 14; index += 1) {
    const room = 3010 + index;
    graph.observeRoom({ num: room, name: `East ${index}` }, {
      previousRoomId: previous,
      direction: 'east',
      characterKey: 'prime'
    });
    previous = room;
  }
  graph.observeRoom({ num: 4000, name: 'Upper Plane' }, {
    previousRoomId: previous,
    direction: 'up',
    characterKey: 'prime'
  });

  const visited = graph.character('prime').visited;
  const distantGroundRooms = graph.roomsInViewport({
    minX: 10,
    maxX: 15,
    minY: -1,
    maxY: 1,
    z: 0,
    roomIds: visited,
    maxRooms: 100
  });
  assert.ok(distantGroundRooms.some((room) => room.id === '3024'));
  assert.equal(distantGroundRooms.some((room) => room.id === '3010'), false);
  assert.equal(distantGroundRooms.some((room) => room.id === '4000'), false);

  const upperRooms = graph.roomsInViewport({
    minX: 13,
    maxX: 15,
    minY: -1,
    maxY: 1,
    z: 1,
    roomIds: visited,
    maxRooms: 100
  });
  assert.deepEqual(upperRooms.map((room) => room.id), ['4000']);
});

test('maintains a constant-time known-room count across zone and full clearing', () => {
  const graph = new MapperGraph();
  graph.observeRoom({ num: 3010, name: 'A', zone: 30 }, { characterKey: 'prime' });
  graph.observeRoom({ num: 3011, name: 'B', zone: 30 }, {
    previousRoomId: 3010, direction: 'north', characterKey: 'prime'
  });
  graph.observeRoom({ num: 4000, name: 'C', zone: 40 }, { characterKey: 'prime' });
  assert.equal(graph.roomCount(), 3);
  assert.equal(graph.clearZone(30), 2);
  assert.equal(graph.roomCount(), 1);
  assert.equal(graph.clearAll(), 1);
  assert.equal(graph.roomCount(), 0);
});
