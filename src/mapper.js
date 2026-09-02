(function attachMapper(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireMapper = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createMapper() {
  'use strict';

  const MAP_SCHEMA_VERSION = 4;
  const MAPPER_CANVAS_HEIGHT_MIN = 220;
  const MAPPER_CANVAS_HEIGHT_MAX = 1600;
  const MAPPER_CANVAS_HEIGHT_DEFAULT = 360;
  const DIRECTIONS = Object.freeze(['north', 'east', 'south', 'west', 'up', 'down']);
  const DIRECTION_ALIASES = new Map([
    ['n', 'north'], ['north', 'north'],
    ['e', 'east'], ['east', 'east'],
    ['s', 'south'], ['south', 'south'],
    ['w', 'west'], ['west', 'west'],
    ['u', 'up'], ['up', 'up'],
    ['d', 'down'], ['down', 'down']
  ]);
  const OPPOSITE_DIRECTION = Object.freeze({
    north: 'south', east: 'west', south: 'north', west: 'east', up: 'down', down: 'up'
  });
  const DIRECTION_VECTOR = Object.freeze({
    north: Object.freeze({ x: 0, y: -1, z: 0 }),
    east: Object.freeze({ x: 1, y: 0, z: 0 }),
    south: Object.freeze({ x: 0, y: 1, z: 0 }),
    west: Object.freeze({ x: -1, y: 0, z: 0 }),
    up: Object.freeze({ x: 0, y: 0, z: 1 }),
    down: Object.freeze({ x: 0, y: 0, z: -1 })
  });

  const SPATIAL_BUCKET_SIZE = 16;

  function spatialBucketKey(x, y, z) {
    if (![x, y, z].every(Number.isFinite)) return '';
    return `${Math.floor(x / SPATIAL_BUCKET_SIZE)}:${Math.floor(y / SPATIAL_BUCKET_SIZE)}:${Math.trunc(z)}`;
  }

  function xtermCubeHex(code) {
    const digits = String(code || '').replace(/[^0-5]/gu, '').slice(0, 3);
    if (digits.length !== 3) return '#182029';
    const component = (digit) => {
      const value = Number(digit);
      return value === 0 ? 0 : 55 + value * 40;
    };
    return `#${[...digits].map((digit) => component(digit).toString(16).padStart(2, '0')).join('')}`;
  }

  function terrainRecord(key, label, code) {
    return Object.freeze({
      key,
      label,
      nukefireColor: `[F${code}]`,
      fill: xtermCubeHex(code),
      stroke: '#e8edf2'
    });
  }

  // These are the exact BIGMAP sector colors emitted by asciimap.c. Keeping
  // the client on the same [Fxyz] cube makes a room look like the room the
  // player already knows from the terminal map instead of a second palette.
  const TERRAIN_PRESENTATIONS = Object.freeze({
    unknown: terrainRecord('unknown', 'Unknown', '333'),
    inside: terrainRecord('inside', 'Indoors / stone', '222'),
    city: terrainRecord('city', 'City / smooth', '545'),
    field: terrainRecord('field', 'Field', '252'),
    forest: terrainRecord('forest', 'Forest', '040'),
    jungle: terrainRecord('jungle', 'Jungle', '230'),
    hills: terrainRecord('hills', 'Hills', '420'),
    mountain: terrainRecord('mountain', 'Mountains', '120'),
    water: terrainRecord('water', 'Water', '134'),
    'swim-water': terrainRecord('swim-water', 'Swim water', '124'),
    'deep-water': terrainRecord('deep-water', 'Underwater / deep water', '114'),
    air: terrainRecord('air', 'Flying / air', '245'),
    underwater: terrainRecord('underwater', 'Underwater', '114'),
    'ocean-floor': terrainRecord('ocean-floor', 'Ocean floor', '114'),
    space: terrainRecord('space', 'Space / air', '245'),
    desert: terrainRecord('desert', 'Desert', '542'),
    wasteland: terrainRecord('wasteland', 'Wasteland / desert', '542'),
    road: terrainRecord('road', 'Desert road', '333'),
    swamp: terrainRecord('swamp', 'Swamp', '231'),
    ice: terrainRecord('ice', 'Tundra / ice', '122'),
    lava: terrainRecord('lava', 'Lava / anomaly', '542')
  });

  function terrainPresentation(value) {
    const terrain = String(value || '').normalize('NFKC').toLocaleLowerCase()
      .replace(/[_-]+/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim();

    let key = 'unknown';
    if (/(?:ocean|sea)\s*floor|seafloor/u.test(terrain)) key = 'ocean-floor';
    else if (/underwater|submerged/u.test(terrain)) key = 'underwater';
    else if (/no\s*swim|noswim|deep\s*water/u.test(terrain)) key = 'deep-water';
    else if (/water\s*swim|swim\s*water/u.test(terrain)) key = 'swim-water';
    else if (/water|river|lake|ocean|sea/u.test(terrain)) key = 'water';
    else if (/space|vacuum|orbit/u.test(terrain)) key = 'space';
    else if (/flying|air|sky|atmosphere/u.test(terrain)) key = 'air';
    else if (/jungle/u.test(terrain)) key = 'jungle';
    else if (/forest|woods?/u.test(terrain)) key = 'forest';
    else if (/swamp|marsh|bog/u.test(terrain)) key = 'swamp';
    else if (/hills?/u.test(terrain)) key = 'hills';
    else if (/mountain|cliff|rocky/u.test(terrain)) key = 'mountain';
    else if (/desert\s*road/u.test(terrain)) key = 'road';
    else if (/desert|sand|dune/u.test(terrain)) key = 'desert';
    else if (/wasteland|waste|radiation|radzone/u.test(terrain)) key = 'wasteland';
    else if (/tundra|ice|snow|glacier|arctic/u.test(terrain)) key = 'ice';
    else if (/lava|volcan|fire/u.test(terrain)) key = 'lava';
    else if (/road|path|highway|street/u.test(terrain)) key = 'road';
    else if (/field|plain|grass|meadow/u.test(terrain)) key = 'field';
    else if (/smooth|city|urban/u.test(terrain)) key = 'city';
    else if (/inside|indoors?|interior|building|cave|cavern|tunnel|stone/u.test(terrain)) key = 'inside';

    return TERRAIN_PRESENTATIONS[key];
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeDirection(value) {
    const command = String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
    if (!command || /\s/u.test(command)) return '';
    return DIRECTION_ALIASES.get(command) || '';
  }

  function finiteInteger(value, fallback = null) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
  }

  function normalizeCanvasHeight(value, fallback = MAPPER_CANVAS_HEIGHT_DEFAULT) {
    const inherited = Number(fallback);
    const safeFallback = Number.isFinite(inherited)
      ? Math.max(MAPPER_CANVAS_HEIGHT_MIN, Math.min(MAPPER_CANVAS_HEIGHT_MAX, Math.round(inherited)))
      : MAPPER_CANVAS_HEIGHT_DEFAULT;
    const numeric = Number(value);
    return Number.isFinite(numeric)
      ? Math.max(MAPPER_CANVAS_HEIGHT_MIN, Math.min(MAPPER_CANVAS_HEIGHT_MAX, Math.round(numeric)))
      : safeFallback;
  }

  const ROOM_ID_SENTINELS = new Set(['closed', 'locked', 'unknown', 'none', 'nowhere', 'null', 'undefined']);

  function roomIdFrom(value) {
    const candidate = typeof value === 'object' && value
      ? value.num ?? value.vnum ?? value.id ?? value.roomnum ?? value.roomNum
      : value;
    const numeric = finiteInteger(candidate, null);
    if (numeric !== null && numeric >= 0) return String(numeric);
    const text = String(candidate || '').normalize('NFKC').trim();
    if (ROOM_ID_SENTINELS.has(text.toLowerCase())) return '';
    return /^[a-z0-9_.:-]{1,80}$/iu.test(text) ? text : '';
  }

  function normalizeZone(value, vnum = null) {
    const numeric = finiteInteger(value, null);
    if (numeric !== null) return numeric;
    if (Number.isFinite(vnum) && vnum >= 100) return Math.trunc(vnum / 100);
    return null;
  }

  function normalizeRoomInfo(input = {}) {
    const id = roomIdFrom(input);
    if (!id) return null;
    const vnum = /^\d+$/u.test(id) ? Number(id) : null;
    const name = String(input.name ?? input.title ?? input.room ?? `Room ${id}`)
      .normalize('NFKC').trim().slice(0, 160) || `Room ${id}`;
    const terrain = String(input.terrain ?? input.environment ?? input.type ?? '')
      .normalize('NFKC').trim().slice(0, 60);
    const zone = normalizeZone(input.zone ?? input.zoneNum ?? input.zone_id ?? input.zoneId, vnum);
    const exits = {};
    const exitDetails = {};
    const sourceExits = input.exit_details && typeof input.exit_details === 'object'
      ? input.exit_details
      : (input.exits && typeof input.exits === 'object' ? input.exits : {});
    for (const [rawDirection, rawDestination] of Object.entries(sourceExits)) {
      const direction = normalizeDirection(rawDirection);
      const detail = rawDestination && typeof rawDestination === 'object' ? rawDestination : { to: rawDestination };
      const destination = roomIdFrom(detail.destination ?? detail.to ?? detail.room ?? detail.vnum ?? detail.num);
      if (!direction || !destination) continue;
      exits[direction] = destination;
      exitDetails[direction] = {
        to: destination,
        closed: Boolean(detail.closed),
        locked: Boolean(detail.locked),
        bidirectional: detail.bidirectional !== false
      };
    }
    const normalized = { id, vnum, name, zone, terrain, exits };
    if (Object.keys(exitDetails).length > 0) normalized.exitDetails = exitDetails;
    return normalized;
  }

  function normalizeCoordinate(value, fallback = null) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(-100000, Math.min(100000, Math.trunc(numeric))) : fallback;
  }

  function normalizeRoomRecord(input = {}, fallbackId = '') {
    const normalized = normalizeRoomInfo({ ...input, id: input.id ?? fallbackId });
    if (!normalized) return null;
    return {
      ...normalized,
      x: normalizeCoordinate(input.x),
      y: normalizeCoordinate(input.y),
      z: normalizeCoordinate(input.z),
      exits: { ...normalized.exits },
      discoveredAt: Number.isFinite(Number(input.discoveredAt)) ? Number(input.discoveredAt) : Date.now(),
      updatedAt: Number.isFinite(Number(input.updatedAt)) ? Number(input.updatedAt) : Date.now()
    };
  }


  function normalizeServerSnapshot(input = {}) {
    const sourceRooms = Array.isArray(input.rooms) ? input.rooms : [];
    const rooms = [];
    for (const rawRoom of sourceRooms.slice(0, 256)) {
      const normalized = normalizeRoomInfo(rawRoom);
      if (!normalized) continue;
      rooms.push({
        ...normalized,
        x: normalizeCoordinate(rawRoom.x, 0),
        y: normalizeCoordinate(rawRoom.y, 0),
        z: normalizeCoordinate(rawRoom.z, 0),
        current: Boolean(rawRoom.current),
        route: Boolean(rawRoom.route),
        destination: Boolean(rawRoom.destination)
      });
    }

    let centerId = roomIdFrom(input.center);
    if (!centerId) centerId = rooms.find((room) => room.current)?.id || '';
    const roomIds = new Set(rooms.map((room) => room.id));
    const links = [];

    for (const rawLink of (Array.isArray(input.links) ? input.links : []).slice(0, 768)) {
      const from = roomIdFrom(rawLink?.from);
      const to = roomIdFrom(rawLink?.to);
      const direction = normalizeDirection(rawLink?.direction ?? rawLink?.dir);
      if (!from || !to || !direction || from === to || !roomIds.has(from) || !roomIds.has(to)) continue;
      links.push({
        from,
        to,
        direction,
        bidirectional: rawLink?.bidirectional !== false,
        closed: Boolean(rawLink?.closed),
        locked: Boolean(rawLink?.locked),
        route: Boolean(rawLink?.route)
      });
    }

    const gpsInput = input.gps && typeof input.gps === 'object' ? input.gps : {};
    return {
      version: Math.max(1, finiteInteger(input.version, 1)),
      source: String(input.source || 'bigmap+gps').normalize('NFKC').trim().slice(0, 40),
      centerId,
      zone: normalizeZone(input.zone),
      plane: finiteInteger(input.plane, 0),
      rooms,
      links,
      gps: {
        active: Boolean(gpsInput.active),
        type: String(gpsInput.type || 'none').normalize('NFKC').trim().slice(0, 32),
        targetId: roomIdFrom(gpsInput.target),
        description: String(gpsInput.description || '').normalize('NFKC').trim().slice(0, 160),
        steps: Math.max(0, finiteInteger(gpsInput.steps, 0)),
        routeRaw: String(gpsInput.route_raw ?? gpsInput.routeRaw ?? '').replace(/[^neswud]/giu, '').toLowerCase().slice(0, 4096)
      },
      truncated: Boolean(input.truncated)
    };
  }


  function authoritativeRoute(input, fromValue, toValue, options = {}) {
    const snapshot = options.normalized === true ? input : normalizeServerSnapshot(input);
    const fromId = roomIdFrom(fromValue);
    const targetId = roomIdFrom(toValue);
    const maximum = Math.max(1, Math.min(128, finiteInteger(options.maxSteps, 64)));
    if (!fromId || !targetId) return { ok: false, steps: [], reason: 'A valid start and destination are required.' };
    if (fromId === targetId) return { ok: true, steps: [], reason: 'Already there.' };
    const roomIds = new Set(snapshot.rooms.map((room) => room.id));
    if (!roomIds.has(fromId) || !roomIds.has(targetId)) {
      return { ok: false, steps: [], reason: 'Both rooms must be present in the current authoritative BIGMAP snapshot.' };
    }

    const adjacency = new Map(snapshot.rooms.map((room) => [room.id, []]));
    for (const link of snapshot.links) {
      if ((link.closed && options.allowClosed !== true) || (link.locked && options.allowLocked !== true)) continue;
      adjacency.get(link.from)?.push({
        from: link.from, to: link.to, direction: link.direction,
        bidirectional: link.bidirectional, closed: link.closed, locked: link.locked
      });
      if (link.bidirectional) {
        adjacency.get(link.to)?.push({
          from: link.to, to: link.from, direction: OPPOSITE_DIRECTION[link.direction] || '',
          bidirectional: true, closed: link.closed, locked: link.locked
        });
      }
    }

    const queue = [fromId];
    const parent = new Map([[fromId, null]]);
    const incoming = new Map();
    for (let head = 0; head < queue.length && !parent.has(targetId); head += 1) {
      const roomId = queue[head];
      for (const edge of adjacency.get(roomId) || []) {
        if (!edge.direction || parent.has(edge.to)) continue;
        parent.set(edge.to, roomId);
        incoming.set(edge.to, edge);
        queue.push(edge.to);
      }
    }

    if (!parent.has(targetId)) {
      return { ok: false, steps: [], reason: 'No open authoritative route is visible. Closed, locked, one-way, or out-of-view links may block it.' };
    }

    const steps = [];
    for (let cursor = targetId; cursor !== fromId;) {
      const edge = incoming.get(cursor);
      if (!edge) return { ok: false, steps: [], reason: 'The authoritative route could not be reconstructed safely.' };
      steps.push({ ...edge });
      cursor = edge.from;
      if (steps.length > maximum) {
        return { ok: false, steps: [], reason: `The route is longer than the ${maximum}-step safety limit.` };
      }
    }
    steps.reverse();
    return { ok: true, steps, reason: 'Route found.', snapshot };
  }


  function routeThroughRooms(roomsInput, fromValue, toValue, options = {}) {
    const rooms = roomsInput && typeof roomsInput === 'object' ? roomsInput : {};
    const fromId = roomIdFrom(fromValue);
    const targetId = roomIdFrom(toValue);
    const maximum = Math.max(1, Math.min(512, finiteInteger(options.maxSteps, 128)));
    if (!fromId || !targetId) return { ok: false, steps: [], reason: 'A valid start and destination are required.' };
    if (fromId === targetId) return { ok: true, steps: [], reason: 'Already there.' };
    if (!Object.hasOwn(rooms, fromId) || !Object.hasOwn(rooms, targetId)) {
      return { ok: false, steps: [], reason: 'Both rooms must be known to the learned map.' };
    }

    const allowedSource = Array.isArray(options.allowedRoomIds) ? options.allowedRoomIds : null;
    const allowed = allowedSource ? new Set(allowedSource.map(roomIdFrom).filter(Boolean)) : null;
    if (allowed) {
      allowed.add(fromId);
      if (!allowed.has(targetId)) {
        return { ok: false, steps: [], reason: 'The selected room has not been visited by this character.' };
      }
    }

    const queue = [fromId];
    const parent = new Map([[fromId, null]]);
    const incoming = new Map();
    for (let head = 0; head < queue.length && !parent.has(targetId); head += 1) {
      const roomId = queue[head];
      const room = rooms[roomId];
      for (const [rawDirection, rawTarget] of Object.entries(room?.exits || {})) {
        const direction = normalizeDirection(rawDirection);
        const to = roomIdFrom(rawTarget);
        if (!direction || !to || !Object.hasOwn(rooms, to) || parent.has(to)) continue;
        if (allowed && !allowed.has(to)) continue;
        const edge = { from: roomId, to, direction, learned: true };
        parent.set(to, roomId);
        incoming.set(to, edge);
        queue.push(to);
      }
    }

    if (!parent.has(targetId)) {
      return { ok: false, steps: [], reason: 'No learned route connects the current room to that visited room.' };
    }

    const steps = [];
    for (let cursor = targetId; cursor !== fromId;) {
      const edge = incoming.get(cursor);
      if (!edge) return { ok: false, steps: [], reason: 'The learned route could not be reconstructed safely.' };
      steps.push({ ...edge });
      cursor = edge.from;
      if (steps.length > maximum) {
        return { ok: false, steps: [], reason: `The route is longer than the ${maximum}-step safety limit.` };
      }
    }
    steps.reverse();
    return { ok: true, steps, reason: 'Learned route found.' };
  }

  function learnedRoute(input, fromValue, toValue, options = {}) {
    const data = normalizeMapData(input);
    return routeThroughRooms(data.rooms, fromValue, toValue, options);
  }

  function authoritativeStep(input, fromValue, toValue, directionValue, options = {}) {
    const snapshot = options.normalized === true ? input : normalizeServerSnapshot(input);
    const fromId = roomIdFrom(fromValue);
    const targetId = roomIdFrom(toValue);
    const direction = normalizeDirection(directionValue);
    if (!fromId || !targetId || !direction) {
      return { ok: false, step: null, reason: 'A valid authoritative movement step is required.' };
    }
    const roomIds = new Set(snapshot.rooms.map((room) => room.id));
    if (!roomIds.has(fromId) || !roomIds.has(targetId)) {
      return { ok: false, step: null, reason: 'The next room is not present in the current authoritative BIGMAP snapshot.' };
    }

    for (const link of snapshot.links) {
      if ((link.closed && options.allowClosed !== true) || (link.locked && options.allowLocked !== true)) continue;
      if (link.from === fromId && link.to === targetId && link.direction === direction) {
        return { ok: true, step: { ...link, from: fromId, to: targetId, direction }, reason: 'Authoritative step confirmed.' };
      }
      if (link.bidirectional && link.from === targetId && link.to === fromId &&
          OPPOSITE_DIRECTION[link.direction] === direction) {
        return {
          ok: true,
          step: { ...link, from: fromId, to: targetId, direction, bidirectional: true },
          reason: 'Authoritative reverse step confirmed.'
        };
      }
    }

    return {
      ok: false,
      step: null,
      reason: 'The learned next step is not an open, unlocked exit in the current authoritative BIGMAP snapshot.'
    };
  }

  function normalizeCharacterKey(value) {
    const key = String(value || '').normalize('NFKC').trim().toLocaleLowerCase()
      .replace(/[^a-z0-9_-]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .slice(0, 64);
    return ['__proto__', 'constructor', 'prototype'].includes(key) ? '' : key;
  }

  function normalizeMapData(input = {}, now = Date.now()) {
    const sourceSchemaVersion = finiteInteger(input?.schemaVersion, null);
    const clearLegacyConnections = sourceSchemaVersion !== null && sourceSchemaVersion < MAP_SCHEMA_VERSION;
    const rooms = {};
    const sourceRooms = input.rooms && typeof input.rooms === 'object' ? Object.entries(input.rooms) : [];
    for (const [rawId, value] of sourceRooms.slice(0, 50000)) {
      const room = normalizeRoomRecord(value, rawId);
      if (!room || Object.hasOwn(rooms, room.id)) continue;
      // Schema 3 could contain edges inferred only from a recently typed
      // direction. They cannot be distinguished from server-confirmed exits,
      // so clear them once and let Room.Info / NukeFire.Map.Local rebuild only
      // relationships the server actually reports.
      if (clearLegacyConnections) room.exits = {};
      rooms[room.id] = room;
    }
    const characters = {};
    const sourceCharacters = input.characters && typeof input.characters === 'object'
      ? Object.entries(input.characters) : [];
    for (const [rawKey, value] of sourceCharacters.slice(0, 100)) {
      const record = value && typeof value === 'object' ? value : {};
      const key = normalizeCharacterKey(rawKey || record.name);
      if (!key || Object.hasOwn(characters, key)) continue;
      const visited = [...new Set((Array.isArray(record.visited) ? record.visited : [])
        .map(roomIdFrom).filter((id) => id && Object.hasOwn(rooms, id)))].slice(0, 50000);
      const currentRoomId = roomIdFrom(record.currentRoomId);
      characters[key] = {
        name: String(record.name || key).normalize('NFKC').trim().slice(0, 80) || key,
        visited,
        currentRoomId: Object.hasOwn(rooms, currentRoomId) ? currentRoomId : '',
        selectedRoomId: Object.hasOwn(rooms, roomIdFrom(record.selectedRoomId)) ? roomIdFrom(record.selectedRoomId) : '',
        zoom: Math.max(0.45, Math.min(2.5, Number(record.zoom) || 1)),
        panX: 0,
        panY: 0,
        viewX: Object.hasOwn(rooms, currentRoomId) ? rooms[currentRoomId].x : normalizeCoordinate(record.viewX),
        viewY: Object.hasOwn(rooms, currentRoomId) ? rooms[currentRoomId].y : normalizeCoordinate(record.viewY),
        viewZ: Object.hasOwn(rooms, currentRoomId) ? rooms[currentRoomId].z : normalizeCoordinate(record.viewZ),
        followPlayer: true,
        canvasHeight: normalizeCanvasHeight(record.canvasHeight)
      };
    }
    return {
      schemaVersion: MAP_SCHEMA_VERSION,
      updatedAt: new Date(Number(now) || Date.now()).toISOString(),
      rooms,
      characters
    };
  }

  class MapperGraph {
    constructor(input = {}) {
      this.data = normalizeMapData(input);
      this._roomCount = Object.keys(this.data.rooms).length;
      this._spatialBuckets = new Map();
      this._visitedSets = new Map();
      this._rightmostX = 0;
      this._rebuildIndexes();
    }

    _rebuildIndexes() {
      this._spatialBuckets.clear();
      this._visitedSets.clear();
      this._rightmostX = 0;
      for (const room of Object.values(this.data.rooms)) this._indexRoom(room);
      for (const [key, character] of Object.entries(this.data.characters)) {
        this._visitedSets.set(key, new Set(character.visited || []));
      }
    }

    _indexRoom(room) {
      if (!room) return;
      const key = spatialBucketKey(room.x, room.y, room.z);
      if (key) {
        let bucket = this._spatialBuckets.get(key);
        if (!bucket) {
          bucket = new Set();
          this._spatialBuckets.set(key, bucket);
        }
        bucket.add(room.id);
      }
      if (Number.isFinite(room.x)) this._rightmostX = Math.max(this._rightmostX, room.x);
    }

    _unindexRoom(room) {
      if (!room) return;
      const key = spatialBucketKey(room.x, room.y, room.z);
      const bucket = key ? this._spatialBuckets.get(key) : null;
      if (!bucket) return;
      bucket.delete(room.id);
      if (bucket.size === 0) this._spatialBuckets.delete(key);
    }

    _setRoomCoordinates(room, x, y, z) {
      if (!room) return;
      this._unindexRoom(room);
      room.x = normalizeCoordinate(x, 0);
      room.y = normalizeCoordinate(y, 0);
      room.z = normalizeCoordinate(z, 0);
      this._indexRoom(room);
    }

    _markVisited(characterKey, character, roomId) {
      const key = normalizeCharacterKey(characterKey || character?.name) || 'default';
      let visited = this._visitedSets.get(key);
      if (!visited) {
        visited = new Set(character?.visited || []);
        this._visitedSets.set(key, visited);
      }
      if (visited.has(roomId)) return false;
      visited.add(roomId);
      character.visited.push(roomId);
      return true;
    }

    serialize(options = {}) {
      // Every mutation path keeps this.data normalized. Most callers still get
      // an isolated snapshot. The renderer's map:save IPC path may opt out of
      // this first clone because Electron structured-clones invoke arguments
      // before returning control, providing the required process-boundary copy.
      return options.clone === false ? this.data : clone(this.data);
    }

    roomCount() {
      return this._roomCount;
    }

    room(id) {
      return this.data.rooms[roomIdFrom(id)] || null;
    }

    character(key, name = '') {
      const normalizedKey = normalizeCharacterKey(key || name) || 'default';
      if (!this.data.characters[normalizedKey]) {
        this.data.characters[normalizedKey] = {
          name: String(name || normalizedKey).normalize('NFKC').trim().slice(0, 80) || normalizedKey,
          visited: [], currentRoomId: '', selectedRoomId: '', zoom: 1, panX: 0, panY: 0,
          viewX: null, viewY: null, viewZ: null, followPlayer: true,
          canvasHeight: MAPPER_CANVAS_HEIGHT_DEFAULT
        };
        this._visitedSets.set(normalizedKey, new Set());
      } else if (!this._visitedSets.has(normalizedKey)) {
        this._visitedSets.set(normalizedKey, new Set(this.data.characters[normalizedKey].visited || []));
      }
      return this.data.characters[normalizedKey];
    }

    ensureRoom(input, options = {}) {
      const incoming = normalizeRoomInfo(input);
      if (!incoming) return null;
      const existing = this.data.rooms[incoming.id];
      const now = Number(options.now) || Date.now();
      if (!existing) {
        this.data.rooms[incoming.id] = {
          ...incoming,
          x: normalizeCoordinate(options.x),
          y: normalizeCoordinate(options.y),
          z: normalizeCoordinate(options.z),
          discoveredAt: now,
          updatedAt: now
        };
        this._roomCount += 1;
        this._indexRoom(this.data.rooms[incoming.id]);
      } else {
        existing.name = incoming.name || existing.name;
        existing.zone = incoming.zone ?? existing.zone;
        existing.terrain = incoming.terrain || existing.terrain;
        existing.vnum = incoming.vnum ?? existing.vnum;
        existing.exits = options.authoritativeExits
          ? { ...incoming.exits }
          : { ...existing.exits, ...incoming.exits };
        if (incoming.exitDetails) {
          existing.exitDetails = options.authoritativeExits
            ? { ...incoming.exitDetails }
            : { ...(existing.exitDetails || {}), ...incoming.exitDetails };
        } else if (options.authoritativeExits) {
          delete existing.exitDetails;
        }
        existing.updatedAt = now;
      }
      return this.data.rooms[incoming.id];
    }

    connect(fromId, directionValue, toId, options = {}) {
      const direction = normalizeDirection(directionValue);
      const from = this.room(fromId);
      const to = this.room(toId);
      if (!direction || !from || !to || from.id === to.id) return false;
      from.exits[direction] = to.id;
      if (options.bidirectional !== false) {
        const opposite = OPPOSITE_DIRECTION[direction];
        if (opposite && !to.exits[opposite]) to.exits[opposite] = from.id;
      }
      const vector = DIRECTION_VECTOR[direction];
      if (vector && Number.isFinite(from.x) && Number.isFinite(from.y) && Number.isFinite(from.z) &&
          (!Number.isFinite(to.x) || !Number.isFinite(to.y) || !Number.isFinite(to.z))) {
        this._setRoomCoordinates(to, from.x + vector.x, from.y + vector.y, from.z + vector.z);
      }
      const now = Number(options.now) || Date.now();
      from.updatedAt = now;
      to.updatedAt = now;
      return true;
    }

    observeRoom(roomInput, context = {}) {
      const previousId = roomIdFrom(context.previousRoomId);
      const direction = normalizeDirection(context.direction);
      let coordinates = {};
      const previous = this.room(previousId);
      if (this._roomCount === 0) coordinates = { x: 0, y: 0, z: 0 };
      else if (previous && direction && Number.isFinite(previous.x) && Number.isFinite(previous.y) && Number.isFinite(previous.z)) {
        const vector = DIRECTION_VECTOR[direction];
        coordinates = { x: previous.x + vector.x, y: previous.y + vector.y, z: previous.z + vector.z };
      } else {
        // A teleport, recall, portal, or other unconfirmed transition starts a
        // separate component instead of being drawn on top of the old room.
        coordinates = { x: this._rightmostX + 4, y: 0, z: 0 };
      }
      const room = this.ensureRoom(roomInput, {
        ...coordinates,
        now: context.now,
        authoritativeExits: Object.hasOwn(roomInput || {}, 'exits')
      });
      if (!room) return { changed: false, linked: false, room: null };
      if (!Number.isFinite(room.x) || !Number.isFinite(room.y) || !Number.isFinite(room.z)) {
        this._setRoomCoordinates(room, coordinates.x, coordinates.y, coordinates.z);
      }
      // A room change after a directional command is useful for placement, but
      // it is not proof that a normal map exit connects the two rooms. Special
      // procedures, portals, scripts, forced movement, and delayed GMCP can all
      // change rooms after an ordinary direction was typed. Only server-provided
      // Room.Info exits and NukeFire.Map.Local links may create connections.
      const linked = Boolean(previous && direction && previous.exits?.[direction] === room.id);
      for (const [exitDirection, destinationId] of Object.entries(room.exits)) {
        if (!this.room(destinationId)) {
          this.ensureRoom({ id: destinationId, name: `Room ${destinationId}` }, { now: context.now });
        }
        this.connect(room.id, exitDirection, destinationId, { bidirectional: false, now: context.now });
      }
      const character = this.character(context.characterKey, context.characterName);
      this._markVisited(context.characterKey, character, room.id);
      character.currentRoomId = room.id;
      character.selectedRoomId = room.id;
      // The simple mapper is always centered on the authoritative current room.
      character.viewX = room.x;
      character.viewY = room.y;
      character.viewZ = room.z;
      character.panX = 0;
      character.panY = 0;
      character.followPlayer = true;
      this.data.updatedAt = new Date(Number(context.now) || Date.now()).toISOString();
      return { changed: true, linked, room: clone(room), previousRoomId: previousId };
    }


    applyServerSnapshot(input, context = {}) {
      const snapshot = context.normalized === true ? input : normalizeServerSnapshot(input);
      if (!snapshot.centerId || !snapshot.rooms.length) {
        return { changed: false, snapshot, centerRoom: null };
      }

      const serverCenter = snapshot.rooms.find((room) => room.id === snapshot.centerId) ||
        snapshot.rooms.find((room) => room.current) || snapshot.rooms[0];
      let centerRoom = this.room(snapshot.centerId);

      if (!centerRoom) {
        centerRoom = this.ensureRoom(serverCenter, {
          x: this._roomCount ? this._rightmostX + 4 : 0,
          y: 0,
          z: 0,
          now: context.now
        });
      }

      const anchorX = Number.isFinite(centerRoom?.x) ? centerRoom.x : 0;
      const anchorY = Number.isFinite(centerRoom?.y) ? centerRoom.y : 0;
      const anchorZ = Number.isFinite(centerRoom?.z) ? centerRoom.z : 0;
      const offsetX = anchorX - (Number(serverCenter.x) || 0);
      const offsetY = anchorY - (Number(serverCenter.y) || 0);
      const offsetZ = anchorZ - (Number(serverCenter.z) || 0);
      const now = Number(context.now) || Date.now();

      const snapshotRoomIds = new Set(snapshot.rooms.map((room) => room.id));
      for (const incoming of snapshot.rooms) {
        // BIGMAP is authoritative for relationships wholly inside this local
        // snapshot. Preserve learned exits that cross beyond the packet edge;
        // the server intentionally omits links whose destination is outside
        // its current radius, and deleting those would sever visited history.
        const room = this.ensureRoom(incoming, { now, authoritativeExits: false });
        if (!room) continue;
        for (const [direction, destination] of Object.entries(room.exits || {})) {
          if (snapshotRoomIds.has(destination)) delete room.exits[direction];
        }
        this._setRoomCoordinates(room, incoming.x + offsetX, incoming.y + offsetY, incoming.z + offsetZ);
        room.updatedAt = now;
      }

      for (const link of snapshot.links) {
        this.connect(link.from, link.direction, link.to, {
          bidirectional: link.bidirectional,
          now
        });
      }

      centerRoom = this.room(snapshot.centerId);
      const character = this.character(context.characterKey, context.characterName);
      if (centerRoom) {
        this._markVisited(context.characterKey, character, centerRoom.id);
        character.currentRoomId = centerRoom.id;
        character.viewX = centerRoom.x;
        character.viewY = centerRoom.y;
        character.viewZ = centerRoom.z;
        character.panX = 0;
        character.panY = 0;
        character.followPlayer = true;
        if (!character.selectedRoomId || context.selectCurrent !== false) {
          character.selectedRoomId = centerRoom.id;
        }
      }

      this.data.updatedAt = new Date(now).toISOString();
      return { changed: true, snapshot, centerRoom: clone(centerRoom) };
    }

    clearCharacter(characterKey) {
      const key = normalizeCharacterKey(characterKey);
      if (!key || !Object.hasOwn(this.data.characters, key)) return 0;
      const visited = this.data.characters[key].visited.length;
      delete this.data.characters[key];
      this._visitedSets.delete(key);
      this.data.updatedAt = new Date().toISOString();
      return visited;
    }

    clearZone(zoneValue) {
      const zone = normalizeZone(zoneValue);
      if (zone === null) return 0;
      const removed = new Set(Object.values(this.data.rooms)
        .filter((room) => Number(room.zone) === Number(zone))
        .map((room) => room.id));
      if (!removed.size) return 0;
      for (const id of removed) delete this.data.rooms[id];
      this._roomCount = Math.max(0, this._roomCount - removed.size);
      for (const room of Object.values(this.data.rooms)) {
        for (const [direction, destination] of Object.entries(room.exits || {})) {
          if (removed.has(destination)) delete room.exits[direction];
        }
      }
      for (const character of Object.values(this.data.characters)) {
        character.visited = character.visited.filter((id) => !removed.has(id));
        if (removed.has(character.currentRoomId)) character.currentRoomId = '';
        if (removed.has(character.selectedRoomId)) character.selectedRoomId = character.currentRoomId || '';
      }
      this._rebuildIndexes();
      this.data.updatedAt = new Date().toISOString();
      return removed.size;
    }

    clearAll() {
      const count = this._roomCount;
      this.data = normalizeMapData({});
      this._roomCount = 0;
      this._rebuildIndexes();
      return count;
    }

    updateView(characterKey, patch = {}) {
      const character = this.character(characterKey);
      if (patch.selectedRoomId !== undefined) {
        const id = roomIdFrom(patch.selectedRoomId);
        if (this.room(id)) character.selectedRoomId = id;
      }
      if (patch.zoom !== undefined) character.zoom = Math.max(0.45, Math.min(2.5, Number(patch.zoom) || 1));
      if (patch.panX !== undefined) {
        const panX = Number(patch.panX);
        if (Number.isFinite(panX)) character.panX = Math.max(-100000, Math.min(100000, panX));
      }
      if (patch.panY !== undefined) {
        const panY = Number(patch.panY);
        if (Number.isFinite(panY)) character.panY = Math.max(-100000, Math.min(100000, panY));
      }
      if (patch.viewX !== undefined) character.viewX = normalizeCoordinate(patch.viewX, character.viewX);
      if (patch.viewY !== undefined) character.viewY = normalizeCoordinate(patch.viewY, character.viewY);
      if (patch.viewZ !== undefined) character.viewZ = normalizeCoordinate(patch.viewZ, character.viewZ);
      if (patch.followPlayer !== undefined) character.followPlayer = Boolean(patch.followPlayer);
      if (patch.canvasHeight !== undefined) character.canvasHeight = normalizeCanvasHeight(patch.canvasHeight, character.canvasHeight);
      return clone(character);
    }

    route(fromValue, toValue, options = {}) {
      return routeThroughRooms(this.data.rooms, fromValue, toValue, options);
    }

    roomsInViewport(options = {}) {
      const minimumX = Number(options.minX);
      const maximumX = Number(options.maxX);
      const minimumY = Number(options.minY);
      const maximumY = Number(options.maxY);
      const plane = Number(options.z);
      if (![minimumX, maximumX, minimumY, maximumY, plane].every(Number.isFinite)) return [];
      const allowedIds = options.roomIds instanceof Set
        ? options.roomIds
        : (options.roomIds && typeof options.roomIds[Symbol.iterator] === 'function'
          ? new Set(options.roomIds)
          : null);
      const maximumRooms = Math.max(32, Math.min(5000, finiteInteger(options.maxRooms, 2000)));
      const minimumBucketX = Math.floor(minimumX / SPATIAL_BUCKET_SIZE);
      const maximumBucketX = Math.floor(maximumX / SPATIAL_BUCKET_SIZE);
      const minimumBucketY = Math.floor(minimumY / SPATIAL_BUCKET_SIZE);
      const maximumBucketY = Math.floor(maximumY / SPATIAL_BUCKET_SIZE);
      const rooms = [];

      for (let bucketY = minimumBucketY; bucketY <= maximumBucketY; bucketY += 1) {
        for (let bucketX = minimumBucketX; bucketX <= maximumBucketX; bucketX += 1) {
          const bucket = this._spatialBuckets.get(`${bucketX}:${bucketY}:${Math.trunc(plane)}`);
          if (!bucket) continue;
          for (const id of bucket) {
            if (allowedIds && !allowedIds.has(id)) continue;
            const room = this.data.rooms[id];
            if (!room || room.z !== plane) continue;
            if (room.x < minimumX || room.x > maximumX || room.y < minimumY || room.y > maximumY) continue;
            rooms.push(room);
            if (rooms.length >= maximumRooms) return rooms;
          }
        }
      }
      return rooms;
    }

    nearby(roomId, radius = 4) {
      const origin = this.room(roomId);
      if (!origin || !Number.isFinite(origin.x)) return [];
      const boundedRadius = Math.max(1, Math.min(12, Number(radius) || 4));
      return Object.values(this.data.rooms).filter((room) =>
        Number.isFinite(room.x) && Number.isFinite(room.y) && Number.isFinite(room.z) &&
        room.z === origin.z &&
        Math.abs(room.x - origin.x) + Math.abs(room.y - origin.y) <= boundedRadius
      );
    }
  }

  return {
    MAP_SCHEMA_VERSION,
    MAPPER_CANVAS_HEIGHT_MIN,
    MAPPER_CANVAS_HEIGHT_MAX,
    MAPPER_CANVAS_HEIGHT_DEFAULT,
    DIRECTIONS,
    OPPOSITE_DIRECTION,
    DIRECTION_VECTOR,
    MapperGraph,
    normalizeDirection,
    normalizeRoomInfo,
    normalizeServerSnapshot,
    normalizeMapData,
    normalizeCharacterKey,
    normalizeCanvasHeight,
    terrainPresentation,
    authoritativeRoute,
    authoritativeStep,
    learnedRoute,
    xtermCubeHex,
    roomIdFrom
  };
});
