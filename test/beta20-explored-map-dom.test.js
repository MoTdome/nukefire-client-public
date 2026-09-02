'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function createClient(mapper, learned) {
  const ansi = require('../src/ansi-parser');
const { installFakeXterm } = require('./fake-xterm');
  const communications = require('../src/communications');
  const panelWindows = require('../src/panel-window-state');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/'
  });
  const handlers = {};
  const saves = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireMapper = mapper;
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    loadSettings: async () => ({ settings: null }),
    saveSettings: async (settings) => ({ ok: true, settings }),
    loadMap: async () => ({ ok: true, map: learned }),
    saveMap: async (mapData) => {
      saves.push(JSON.parse(JSON.stringify(mapData)));
      return { ok: true, saved: { rooms: Object.keys(mapData.rooms || {}).length } };
    },
    onText: () => {},
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: () => {},
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onGmcpState: (callback) => { handlers.gmcpState = callback; },
    onPromptBoundary: () => {},
    onProtocolWarning: () => {},
    onCharset: () => {},
    onTerminalType: () => {},
    onWindowSize: () => {},
    onError: () => {},
    onMenuConnect: () => {},
    onMenuFind: () => {},
    onMenuPreferences: () => {},
    onMenuFocusCommand: () => {},
    onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {},
    onMenuReadVitals: () => {},
    onPanelBoundsChanged: () => {},
    onPanelClosed: () => {},
    onPanelAction: () => {}
  };
  dom.window.eval(source);
  return { dom, handlers, saves };
}

test('live BIGMAP keeps explored rooms hidden while zoom and pan remain usable', async () => {
  const mapper = require('../src/mapper');
  const learned = mapper.normalizeMapData({
    rooms: {
      3010: { id: 3010, name: 'Origin', terrain: 'City', x: 0, y: 0, z: 0, exits: { east: 3011 } },
      3011: { id: 3011, name: 'East One', terrain: 'Road', x: 1, y: 0, z: 0, exits: { west: 3010 } },
      3099: { id: 3099, name: 'Distant Explored Room', terrain: 'Forest', x: 10, y: 0, z: 0, exits: {} }
    },
    characters: {
      prime: {
        name: 'Prime', visited: [3010, 3011, 3099], currentRoomId: 3010,
        selectedRoomId: 3010, zoom: 1, panX: 0, panY: 0, viewX: 0, viewY: 0, viewZ: 0
      }
    }
  });
  const { dom, handlers } = createClient(mapper, learned);
  await new Promise((resolve) => setTimeout(resolve, 40));
  handlers.status({ state: 'connected', message: 'Connected' });

  const snapshot = (center) => ({
    source: 'bigmap+gps', center,
    rooms: [
      { vnum: 3010, name: 'Origin', terrain: 'City', x: 0, y: 0, z: 0, current: center === 3010 },
      { vnum: 3011, name: 'East One', terrain: 'Road', x: 1, y: 0, z: 0, current: center === 3011 }
    ],
    links: [{ from: 3010, to: 3011, direction: 'east', bidirectional: true }]
  });
  const stateAt = (room) => ({
    char: { status: { name: 'Prime' }, vitals: {}, gps: null },
    room: { info: { num: room, name: room === 3010 ? 'Origin' : 'East One' } },
    map: { local: snapshot(room) },
    gps: { catalog: { items: [], complete: true } },
    group: null
  });

  handlers.gmcpState(stateAt(3010));
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(dom.window.document.querySelector('[data-map-room-id="3099"]'), null);

  const canvas = dom.window.document.querySelector('#mapper-canvas');
  canvas.dispatchEvent(new dom.window.WheelEvent('wheel', {
    deltaY: 240,
    deltaMode: 0,
    clientX: 300,
    clientY: 210,
    bubbles: true,
    cancelable: true
  }));
  await new Promise((resolve) => setTimeout(resolve, 35));
  assert.equal(dom.window.document.querySelector('[data-map-room-id="3099"]'), null);

  handlers.gmcpState(stateAt(3011));
  await new Promise((resolve) => setTimeout(resolve, 35));
  const current = dom.window.document.querySelector('[data-map-room-id="3011"]');
  assert.ok(current);
  assert.equal(current.getAttribute('transform'), 'translate(300 210)');
  assert.equal(dom.window.document.querySelector('#mapper-follow-player'), null);
  assert.equal(dom.window.document.querySelector('#mapper-run-here'), null);
  assert.match(dom.window.document.querySelector('#mapper-status').textContent, /3 known rooms.*3 visited.*centered on player/u);

  canvas.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowLeft', bubbles: true, cancelable: true
  }));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(dom.window.document.querySelector('[data-map-room-id="3011"]').getAttribute('transform'), 'translate(300 210)');
  assert.equal(dom.window.document.querySelector('#mapper-world').getAttribute('transform'), 'translate(-36 0)');
  assert.match(dom.window.document.querySelector('#mapper-status').textContent, /manually panned/u);
  assert.equal(dom.window.document.querySelector('[data-map-room-id="3099"]'), null);
  dom.window.close();
});
