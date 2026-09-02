'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { installFakeXterm } = require('./fake-xterm');

test('mapper panel is dockable, keyboard reachable, and available in Preferences', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  const panel = document.querySelector('#panel-mapper');
  assert.ok(panel);
  assert.equal(panel.dataset.workspacePanel, 'mapper');
  const mapperCanvas = document.querySelector('#mapper-canvas');
  assert.equal(mapperCanvas.getAttribute('tabindex'), '0');
  assert.match(mapperCanvas.getAttribute('aria-label'), /Drag or use the arrow keys to pan/u);
  const repeatEnter = document.querySelector('#repeat-last-command-on-enter');
  assert.ok(repeatEnter);
  assert.equal(repeatEnter.disabled, false);
  assert.match(repeatEnter.closest('label').textContent, /Repeat last command with Enter/u);
  const mapResizer = document.querySelector('#resize-mapper-canvas');
  assert.ok(mapResizer);
  assert.equal(mapResizer.getAttribute('role'), 'separator');
  assert.equal(mapResizer.getAttribute('aria-orientation'), 'horizontal');
  assert.equal(mapResizer.getAttribute('tabindex'), '0');
  assert.ok(document.querySelector('[data-panel-menu-button="mapper"]'));
  assert.ok(document.querySelector('[data-panel-toggle="mapper"]'));
  assert.ok(document.querySelector('script[src="../src/mapper.js"]'));
});


test('mapper GPS, map, and room information sections toggle independently', async () => {
  const ansi = require('../src/ansi-parser');
  const mapper = require('../src/mapper');
  const communications = require('../src/communications');
  const panelWindows = require('../src/panel-window-state');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/' });
  const style = dom.window.document.createElement('style');
  style.textContent = styles;
  dom.window.document.head.append(style);
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireMapper = mapper;
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    loadSettings: async () => ({ settings: {
      display: { components: {
        groupVitals: true, mapperExits: true, gpsNavigator: false,
        mapperMap: true, mapperRoomInfo: false
      } }
    } }),
    saveSettings: async (settings) => ({ ok: true, settings }),
    loadMap: async () => ({ ok: true, map: mapper.normalizeMapData({}) }),
    saveMap: async (mapData) => ({ ok: true, map: mapData }),
    onText: () => {}, onStatus: () => {}, onEcho: () => {}, onGmcp: () => {},
    onGmcpState: () => {}, onPromptBoundary: () => {}, onProtocolWarning: () => {},
    onCharset: () => {}, onTerminalType: () => {}, onWindowSize: () => {},
    onError: () => {}, onMenuConnect: () => {}, onMenuFind: () => {},
    onMenuPreferences: () => {}, onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onPanelBoundsChanged: () => {}, onPanelClosed: () => {}, onPanelAction: () => {}
  };
  dom.window.eval(source);
  await new Promise((resolve) => setTimeout(resolve, 30));

  const document = dom.window.document;
  const gpsSection = document.querySelector('.mapper-gps-navigator');
  assert.equal(gpsSection.hidden, true);
  assert.equal(dom.window.getComputedStyle(gpsSection).display, 'none');
  assert.equal(document.querySelector('#mapper-map-section').hidden, false);
  assert.equal(document.querySelector('#mapper-room-info').hidden, true);
  assert.equal(document.querySelector('.mapper-legend'), null);
  assert.match(document.querySelector('#mapper-status').className, /\bsr-only\b/u);

  document.querySelector('#show-gps-navigator').click();
  document.querySelector('#show-mapper-map').click();
  document.querySelector('#show-mapper-room-info').click();
  assert.equal(gpsSection.hidden, false);
  assert.equal(dom.window.getComputedStyle(gpsSection).display, 'grid');
  assert.equal(document.querySelector('#mapper-map-section').hidden, true);
  assert.equal(document.querySelector('#mapper-room-info').hidden, false);

  const roomMenuItem = document.querySelector('[data-mapper-section-toggle="mapperRoomInfo"]');
  assert.equal(roomMenuItem.getAttribute('aria-checked'), 'true');
  roomMenuItem.click();
  assert.equal(document.querySelector('#mapper-room-info').hidden, true);
  assert.equal(roomMenuItem.getAttribute('aria-checked'), 'false');
  dom.window.close();
});

test('renderer positions a directional transition without inventing a map connection', async () => {
  const ansi = require('../src/ansi-parser');
  const mapper = require('../src/mapper');
  const communications = require('../src/communications');
  const panelWindows = require('../src/panel-window-state');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/' });
  const handlers = {};
  const saves = [];
  const sent = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireMapper = mapper;
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async (command) => { sent.push(command); return { ok: true }; },
    sendGmcp: async () => ({ ok: true }), setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }), getGmcpState: async () => null,
    loadSettings: async () => ({ settings: null }), saveSettings: async (settings) => ({ ok: true, settings }),
    loadMap: async () => ({ ok: true, map: mapper.normalizeMapData({}) }),
    saveMap: async (mapData) => { saves.push(JSON.parse(JSON.stringify(mapData))); return { ok: true, map: mapData }; },
    onText: () => {}, onStatus: (callback) => { handlers.status = callback; }, onEcho: () => {},
    onGmcp: () => {}, onGmcpState: (callback) => { handlers.gmcpState = callback; },
    onPromptBoundary: () => {}, onProtocolWarning: () => {}, onCharset: () => {},
    onTerminalType: () => {}, onWindowSize: () => {}, onError: () => {},
    onMenuConnect: () => {}, onMenuFind: () => {}, onMenuPreferences: () => {},
    onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {}, onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onPanelBoundsChanged: () => {}, onPanelClosed: () => {}, onPanelAction: () => {}
  };
  dom.window.eval(source);
  await new Promise((resolve) => setTimeout(resolve, 30));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcpState({
    char: { status: { name: 'Prime' }, vitals: {} },
    room: { info: { num: 3010, name: 'Technology Square' } }, group: null
  });
  const command = dom.window.document.querySelector('#command');
  command.value = 'n';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 10));
  handlers.gmcpState({
    char: { status: { name: 'Prime' }, vitals: {} },
    room: { info: { num: 3011, name: 'Transit Walkway' } }, group: null
  });
  await new Promise((resolve) => setTimeout(resolve, 430));

  assert.deepEqual(sent, ['n']);
  assert.match(dom.window.document.querySelector('#mapper-status').textContent, /2 known rooms.*2 visited/u);
  assert.equal(dom.window.document.querySelectorAll('[data-map-room-id]').length, 2);
  assert.equal(saves.at(-1).rooms['3010'].exits.north, undefined);
  assert.equal(saves.at(-1).rooms['3011'].y, -1);
  assert.equal(dom.window.document.querySelector('#output').textContent.includes('Technology Square'), false);
});

test('mapper renders truthful terrain tiles, consumes NukeFire.Map.Local, and supports panning', async () => {
  const ansi = require('../src/ansi-parser');
  const mapper = require('../src/mapper');
  const communications = require('../src/communications');
  const panelWindows = require('../src/panel-window-state');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/' });
  const handlers = {};
  const learnedMap = mapper.normalizeMapData({
    schemaVersion: mapper.MAP_SCHEMA_VERSION,
    rooms: {
      3010: { id: 3010, name: 'Technology Square', terrain: 'City', x: 0, y: 0, z: 0, exits: { west: 3998, east: 3999, north: 3011 } },
      3011: { id: 3011, name: 'Transit Walkway', terrain: 'Forest', x: 0, y: -1, z: 0, exits: { south: 3010 } },
      3998: { id: 3998, name: 'Old West', terrain: 'Inside', x: -1, y: 0, z: 0, exits: { east: 3010 } },
      3999: { id: 3999, name: 'Old East', terrain: 'Inside', x: 1, y: 0, z: 0, exits: { west: 3010 } }
    }
  });
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireMapper = mapper;
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null, loadSettings: async () => ({ settings: null }),
    saveSettings: async (settings) => ({ ok: true, settings }),
    loadMap: async () => ({ ok: true, map: learnedMap }),
    saveMap: async (mapData) => ({ ok: true, map: mapData }),
    onText: () => {}, onStatus: (callback) => { handlers.status = callback; }, onEcho: () => {},
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onGmcpState: () => {}, onPromptBoundary: () => {}, onProtocolWarning: () => {},
    onCharset: () => {}, onTerminalType: () => {}, onWindowSize: () => {},
    onError: () => {}, onMenuConnect: () => {}, onMenuFind: () => {},
    onMenuPreferences: () => {}, onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onPanelBoundsChanged: () => {}, onPanelClosed: () => {}, onPanelAction: () => {}
  };
  dom.window.eval(source);
  await new Promise((resolve) => setTimeout(resolve, 30));
  handlers.status({ state: 'connected', message: 'Connected' });

  handlers.gmcp({
    packageName: 'NukeFire.Map.Local',
    body: {
      center: 3010,
      source: 'bigmap+gps',
      rooms: [
        { vnum: 3010, name: 'Technology Square', terrain: 'City', x: 0, y: 0, z: 0, current: true },
        { vnum: 3011, name: 'Transit Walkway', terrain: 'Forest', x: 0, y: -1, z: 0 }
      ],
      links: [{ from: 3010, to: 3011, direction: 'north', bidirectional: true }]
    },
    state: {
      char: { status: { name: 'Prime' }, vitals: {} },
      room: { info: { num: 3010, name: 'Technology Square' } },
      map: { local: null },
      group: null
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 20));

  const nodes = [...dom.window.document.querySelectorAll('[data-map-room-id]')];
  const currentNode = dom.window.document.querySelector('[data-map-room-id="3010"]');
  const forestNode = dom.window.document.querySelector('[data-map-room-id="3011"]');
  assert.equal(nodes.length, 2);
  assert.ok(currentNode);
  assert.ok(forestNode);
  assert.equal(currentNode.querySelector('text').textContent, '@');
  assert.equal(currentNode.querySelector('rect').getAttribute('width'), '28');
  assert.equal(currentNode.dataset.terrainKey, 'city');
  assert.equal(forestNode.dataset.terrainKey, 'forest');
  assert.equal(forestNode.querySelector('text').textContent, '');
  assert.equal(currentNode.querySelector('rect').getAttribute('fill'), '#ffd7ff');
  assert.equal(currentNode.querySelector('rect').getAttribute('stroke'), '#e8edf2');
  assert.equal(currentNode.getAttribute('aria-hidden'), 'true');
  assert.equal(dom.window.document.querySelector('[data-map-room-id="3998"]'), null);
  assert.equal(dom.window.document.querySelector('[data-map-room-id="3999"]'), null);
  const edges = [...dom.window.document.querySelectorAll('.mapper-edge')];
  assert.equal(edges.length, 1);
  assert.equal(edges[0].dataset.mapLinkFrom, '3010');
  assert.equal(edges[0].dataset.mapLinkTo, '3011');
  assert.match(dom.window.document.querySelector('#mapper-svg-description').textContent, /City \/ smooth.*BIGMAP \[F545\].*Current room/u);
  assert.match(dom.window.document.querySelector('#mapper-status').textContent, /Live BIGMAP\/GPS/u);

  const canvas = dom.window.document.querySelector('#mapper-canvas');
  canvas.getBoundingClientRect = () => ({ width: 600, height: 420, left: 0, top: 0, right: 600, bottom: 420 });
  const pointerEvent = (type, x, y) => {
    const event = new dom.window.MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: x, clientY: y });
    Object.defineProperty(event, 'pointerId', { value: 7 });
    return event;
  };
  canvas.dispatchEvent(pointerEvent('pointerdown', 100, 100));
  canvas.dispatchEvent(pointerEvent('pointermove', 145, 130));
  assert.equal(dom.window.document.querySelector('#mapper-world').getAttribute('transform'), 'translate(45 30)');
  assert.equal(canvas.classList.contains('dragging'), true);
  canvas.dispatchEvent(pointerEvent('pointerup', 145, 130));
  assert.equal(canvas.classList.contains('dragging'), false);
  assert.equal(dom.window.document.querySelector('#mapper-world').getAttribute('transform'), 'translate(45 30)');
  dom.window.close();
});



test('compact panel labels and Mapper room text remain visual while accessible names stay complete', async () => {
  const ansi = require('../src/ansi-parser');
  const mapper = require('../src/mapper');
  const communications = require('../src/communications');
  const panelWindows = require('../src/panel-window-state');
  const displayText = require('../src/display-text');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/' });
  const handlers = {};
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireMapper = mapper;
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.NukeFireDisplayText = displayText;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    loadSettings: async () => ({ settings: { display: { text: { panelLabels: 'compact', mapperRoomLabels: 'number' } } } }),
    saveSettings: async (settings) => ({ ok: true, settings }),
    loadMap: async () => ({ ok: true, map: mapper.normalizeMapData({}) }),
    saveMap: async (mapData) => ({ ok: true, map: mapData }),
    onText: () => {}, onStatus: (callback) => { handlers.status = callback; }, onEcho: () => {},
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onGmcpState: () => {}, onPromptBoundary: () => {}, onProtocolWarning: () => {},
    onCharset: () => {}, onTerminalType: () => {}, onWindowSize: () => {},
    onError: () => {}, onMenuConnect: () => {}, onMenuFind: () => {},
    onMenuPreferences: () => {}, onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onPanelBoundsChanged: () => {}, onPanelClosed: () => {}, onPanelAction: () => {}
  };
  dom.window.eval(source);
  await new Promise((resolve) => setTimeout(resolve, 30));
  handlers.status({ state: 'connected', message: 'Connected' });

  const document = dom.window.document;
  assert.equal(document.querySelector('#mapper-heading').textContent, 'Map');
  assert.equal(document.querySelector('#mapper-heading').getAttribute('aria-label'), 'Mapper');
  const mapperTab = document.querySelector('[data-panel-tab="mapper"]');
  assert.equal(mapperTab.textContent, 'Map');
  assert.equal(mapperTab.getAttribute('aria-label'), 'Mapper');

  handlers.gmcp({
    packageName: 'NukeFire.Map.Local',
    body: {
      center: 3010,
      source: 'bigmap+gps',
      rooms: [
        { vnum: 3010, name: 'Technology Square', terrain: 'City', x: 0, y: 0, z: 0, current: true },
        { vnum: 3011, name: 'Transit Walkway', terrain: 'Forest', x: 0, y: -1, z: 0 }
      ],
      links: [{ from: 3010, to: 3011, direction: 'north', bidirectional: true }]
    },
    state: {
      char: { status: { name: 'Prime' }, vitals: {} },
      room: { info: { num: 3010, name: 'Technology Square' } },
      map: { local: null },
      group: null
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.deepEqual(
    [...document.querySelectorAll('.mapper-room-label')].map((node) => node.textContent).sort(),
    ['3010', '3011']
  );
  assert.equal(document.querySelector('[data-map-room-id="3010"] .mapper-room-glyph').textContent, '@');
  assert.match(document.querySelector('#mapper-svg-description').textContent, /Technology Square/u);

  const labelMode = document.querySelector('#mapper-room-label-mode');
  labelMode.value = 'name';
  labelMode.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.deepEqual(
    [...document.querySelectorAll('.mapper-room-label')].map((node) => node.textContent).sort(),
    ['Technology Sq…', 'Transit Walkw…']
  );
  dom.window.close();
});

test('mapper GPS navigator filters the server catalog and sends numeric GPS commands', async () => {
  const ansi = require('../src/ansi-parser');
  const mapper = require('../src/mapper');
  const communications = require('../src/communications');
  const gpsGuidance = require('../src/gps-guidance');
  const panelWindows = require('../src/panel-window-state');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/' });
  const handlers = {};
  const sent = [];
  const gmcpRequests = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireMapper = mapper;
  dom.window.NukeFireGpsGuidance = gpsGuidance;
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async (command) => { sent.push(command); return { ok: true }; },
    sendGmcp: async (packageName) => { gmcpRequests.push(packageName); return { ok: true }; },
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null, loadSettings: async () => ({ settings: null }),
    saveSettings: async (settings) => ({ ok: true, settings }),
    loadMap: async () => ({ ok: true, map: mapper.normalizeMapData({}) }),
    saveMap: async (mapData) => ({ ok: true, map: mapData }),
    onText: () => {}, onStatus: (callback) => { handlers.status = callback; }, onEcho: () => {},
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onGmcpState: () => {}, onPromptBoundary: () => {}, onProtocolWarning: () => {},
    onCharset: () => {}, onTerminalType: () => {}, onWindowSize: () => {},
    onError: () => {}, onMenuConnect: () => {}, onMenuFind: () => {},
    onMenuPreferences: () => {}, onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onPanelBoundsChanged: () => {}, onPanelClosed: () => {}, onPanelAction: () => {}
  };
  dom.window.eval(source);
  await new Promise((resolve) => setTimeout(resolve, 30));
  handlers.status({ state: 'connected', message: 'Connected' });

  const catalog = {
    version: 1, count: 3, pages: 1, received: 3, complete: true,
    items: [
      { index: 1, room: 3014, name: 'The Statue', category: 'Elite Remort Areas', difficulty: '(Elite Remort: 251-399R)', zone: 645, aliases: 'statue', tags: 'combat', available: true },
      { index: 107, room: 20333, name: 'The Tekforge', category: 'Crafting', difficulty: 'Crafting', zone: 203, aliases: 'tek forge', tags: 'equipment service', available: true },
      { index: 164, room: 3180, name: 'Remorter', category: 'City Services', difficulty: 'City Attraction', zone: 30, aliases: 'remort', tags: 'newbie service', available: true }
    ]
  };
  handlers.gmcp({
    packageName: 'NukeFire.GPS.Catalog.End', body: { version: 1, count: 3 },
    state: { char: { status: { name: 'Prime' }, vitals: {}, gps: null }, room: { info: null }, map: { local: null }, gps: { catalog }, group: null }
  });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const search = dom.window.document.querySelector('#mapper-gps-search');
  const select = dom.window.document.querySelector('#mapper-gps-destination');
  assert.equal(select.disabled, false);
  assert.equal(select.querySelectorAll('option').length, 4);
  assert.equal(select.querySelectorAll('optgroup').length, 3);
  assert.match(select.textContent, /The Statue · Zone 645 · 251–399R · GPS #1/u);

  select.value = '1';
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.match(dom.window.document.querySelector('#mapper-gps-guidance').textContent, /Suggested remorts: 251–399R/u);

  search.value = 'forge';
  search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(select.querySelectorAll('option').length, 2);
  assert.match(select.textContent, /The Tekforge/u);

  select.value = '107';
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  dom.window.document.querySelector('#mapper-gps-set').click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['gps set 107']);

  dom.window.document.querySelector('#mapper-gps-refresh').click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(gmcpRequests, ['NukeFire.GPS.Catalog']);
});


test('mapper height separator expands the canvas and saves the character view', async () => {
  const ansi = require('../src/ansi-parser');
  const mapper = require('../src/mapper');
  const communications = require('../src/communications');
  const panelWindows = require('../src/panel-window-state');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/' });
  const saves = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireMapper = mapper;
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null, loadSettings: async () => ({ settings: null }),
    saveSettings: async (settings) => ({ ok: true, settings }),
    loadMap: async () => ({ ok: true, map: mapper.normalizeMapData({}) }),
    saveMap: async (mapData) => { saves.push(JSON.parse(JSON.stringify(mapData))); return { ok: true, map: mapData }; },
    onText: () => {}, onStatus: () => {}, onEcho: () => {}, onGmcp: () => {},
    onGmcpState: () => {}, onPromptBoundary: () => {}, onProtocolWarning: () => {},
    onCharset: () => {}, onTerminalType: () => {}, onWindowSize: () => {},
    onError: () => {}, onMenuConnect: () => {}, onMenuFind: () => {},
    onMenuPreferences: () => {}, onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onPanelBoundsChanged: () => {}, onPanelClosed: () => {}, onPanelAction: () => {}
  };
  dom.window.eval(source);
  await new Promise((resolve) => setTimeout(resolve, 40));

  const canvas = dom.window.document.querySelector('#mapper-canvas');
  const resizer = dom.window.document.querySelector('#resize-mapper-canvas');
  assert.equal(canvas.style.getPropertyValue('--mapper-canvas-height'), '360px');

  resizer.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowDown', shiftKey: true, bubbles: true, cancelable: true
  }));
  await new Promise((resolve) => setTimeout(resolve, 430));

  assert.equal(canvas.style.getPropertyValue('--mapper-canvas-height'), '420px');
  assert.equal(resizer.getAttribute('aria-valuenow'), '420');
  assert.equal(saves.at(-1).characters.default.canvasHeight, 420);
});


test('a delayed mapper save cannot roll back live room updates after resizing', async () => {
  const ansi = require('../src/ansi-parser');
  const mapper = require('../src/mapper');
  const communications = require('../src/communications');
  const panelWindows = require('../src/panel-window-state');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/' });
  const handlers = {};
  let resolveFirstSave;
  let saveCalls = 0;

  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireMapper = mapper;
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null, loadSettings: async () => ({ settings: null }),
    saveSettings: async (settings) => ({ ok: true, settings }),
    loadMap: async () => ({ ok: true, map: mapper.normalizeMapData({}) }),
    saveMap: async (mapData) => {
      saveCalls += 1;
      const saved = JSON.parse(JSON.stringify(mapData));
      if (saveCalls === 1) {
        return new Promise((resolve) => {
          resolveFirstSave = () => resolve({ ok: true, map: saved });
        });
      }
      return { ok: true, map: saved };
    },
    onText: () => {}, onStatus: (callback) => { handlers.status = callback; }, onEcho: () => {},
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onGmcpState: (callback) => { handlers.gmcpState = callback; },
    onPromptBoundary: () => {}, onProtocolWarning: () => {},
    onCharset: () => {}, onTerminalType: () => {}, onWindowSize: () => {},
    onError: () => {}, onMenuConnect: () => {}, onMenuFind: () => {},
    onMenuPreferences: () => {}, onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onPanelBoundsChanged: () => {}, onPanelClosed: () => {}, onPanelAction: () => {}
  };
  dom.window.eval(source);
  await new Promise((resolve) => setTimeout(resolve, 40));
  handlers.status({ state: 'connected', message: 'Connected' });

  const roomState = (num, name) => ({
    char: { status: { name: 'Prime' }, vitals: {} },
    room: { info: { num, name } },
    map: { local: null },
    group: null
  });

  handlers.gmcpState(roomState(3010, 'Technology Square'));
  const resizer = dom.window.document.querySelector('#resize-mapper-canvas');
  resizer.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowDown', bubbles: true, cancelable: true
  }));

  await new Promise((resolve) => setTimeout(resolve, 380));
  assert.equal(typeof resolveFirstSave, 'function');

  const localMap = (center) => ({
    center,
    source: 'bigmap+gps',
    rooms: [
      { vnum: 3010, name: 'Technology Square', terrain: 'City', x: 0, y: 0, z: 0, current: center === 3010 },
      { vnum: 3011, name: 'Transit Walkway', terrain: 'Road', x: 0, y: -1, z: 0, current: center === 3011 },
      { vnum: 3012, name: 'Ocean Road', terrain: 'Road', x: 1, y: -1, z: 0, current: center === 3012 }
    ],
    links: [
      { from: 3010, to: 3011, direction: 'north', bidirectional: true },
      { from: 3011, to: 3012, direction: 'east', bidirectional: true }
    ]
  });
  const sendLocalMap = (center, name) => {
    const map = localMap(center);
    handlers.gmcp({
      packageName: 'NukeFire.Map.Local',
      body: map,
      state: { ...roomState(center, name), map: { local: map } }
    });
  };

  sendLocalMap(3011, 'Transit Walkway');
  resolveFirstSave();
  await new Promise((resolve) => setTimeout(resolve, 20));
  sendLocalMap(3012, 'Ocean Road');
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.match(dom.window.document.querySelector('#mapper-status').textContent, /3 known rooms.*3 visited/u);
  assert.equal(dom.window.document.querySelector('#mapper-room-name').textContent, 'Ocean Road');
  assert.ok(dom.window.document.querySelector('[data-map-room-id="3012"]').classList.contains('current'));
});

test('mapper offline placeholder is decorative and exposes a text status', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  const placeholder = document.querySelector('#mapper-offline');
  const image = placeholder?.querySelector('img');

  assert.ok(placeholder);
  assert.equal(placeholder.getAttribute('role'), 'status');
  assert.equal(placeholder.getAttribute('aria-live'), 'polite');
  assert.equal(image?.getAttribute('src'), 'assets/nukefire-offline-map.webp');
  assert.equal(image?.getAttribute('alt'), '');
  assert.equal(image?.getAttribute('aria-hidden'), 'true');
  assert.match(placeholder.textContent, /NukeFire Map Offline/u);
  assert.match(document.querySelector('#mapper-refresh').textContent, /Hard Reset.*Refresh/u);
});

test('disconnect and hard reset hide ghost rooms and accept an identical fresh BIGMAP snapshot', async () => {
  const ansi = require('../src/ansi-parser');
  const mapper = require('../src/mapper');
  const communications = require('../src/communications');
  const panelWindows = require('../src/panel-window-state');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/' });
  const handlers = {};
  const gmcpRequests = [];
  const saves = [];
  const learnedMap = mapper.normalizeMapData({
    rooms: {
      3010: { id: 3010, name: 'Technology Square', terrain: 'City', x: 0, y: 0, z: 0, exits: { north: 3011 } },
      3011: { id: 3011, name: 'Transit Walkway', terrain: 'Road', x: 0, y: -1, z: 0, exits: { south: 3010 } }
    },
    characters: {
      default: {
        name: 'Prime', visited: [3010, 3011], currentRoomId: 3010,
        selectedRoomId: 3010, zoom: 1, panX: 0, panY: 0, viewX: 0, viewY: 0, viewZ: 0
      }
    }
  });
  const localMap = {
    center: 3010,
    source: 'bigmap+gps',
    rooms: [
      { vnum: 3010, name: 'Technology Square', terrain: 'City', x: 0, y: 0, z: 0, current: true },
      { vnum: 3011, name: 'Transit Walkway', terrain: 'Road', x: 0, y: -1, z: 0 }
    ],
    links: [{ from: 3010, to: 3011, direction: 'north', bidirectional: true }]
  };

  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireMapper = mapper;
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async (packageName) => { gmcpRequests.push(packageName); return { ok: true }; },
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null, loadSettings: async () => ({ settings: null }),
    saveSettings: async (settings) => ({ ok: true, settings }),
    loadMap: async () => ({ ok: true, map: learnedMap }),
    saveMap: async (mapData) => { saves.push(JSON.parse(JSON.stringify(mapData))); return { ok: true, map: mapData }; },
    onText: () => {}, onStatus: (callback) => { handlers.status = callback; }, onEcho: () => {},
    onGmcp: (callback) => { handlers.gmcp = callback; }, onGmcpState: () => {},
    onPromptBoundary: () => {}, onProtocolWarning: () => {}, onCharset: () => {},
    onTerminalType: () => {}, onWindowSize: () => {}, onError: () => {},
    onMenuConnect: () => {}, onMenuFind: () => {}, onMenuPreferences: () => {},
    onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {}, onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onPanelBoundsChanged: () => {}, onPanelClosed: () => {}, onPanelAction: () => {}
  };

  dom.window.eval(source);
  await new Promise((resolve) => setTimeout(resolve, 40));

  const document = dom.window.document;
  const placeholder = document.querySelector('#mapper-offline');
  const svg = document.querySelector('#mapper-svg');
  assert.equal(placeholder.hidden, false);
  assert.equal(svg.hasAttribute('hidden'), true);
  assert.equal(document.querySelectorAll('[data-map-room-id]').length, 0);
  assert.match(document.querySelector('#mapper-accessible-summary').textContent, /Session disconnected/u);

  handlers.status({ state: 'connected', message: 'Connected' });
  assert.equal(placeholder.hidden, false);
  assert.match(document.querySelector('#mapper-offline-title').textContent, /Refreshing Live Map/u);

  const deliverMap = () => handlers.gmcp({
    packageName: 'NukeFire.Map.Local',
    body: localMap,
    state: {
      char: { status: { name: 'Prime' }, vitals: {}, gps: null },
      room: { info: { num: 3010, name: 'Technology Square' } },
      map: { local: localMap }, group: null
    }
  });
  deliverMap();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(placeholder.hidden, true);
  assert.equal(svg.hasAttribute('hidden'), false);
  assert.equal(document.querySelectorAll('[data-map-room-id]').length, 2);

  handlers.status({ state: 'disconnected', message: 'Disconnected' });
  assert.equal(placeholder.hidden, false);
  assert.equal(svg.hasAttribute('hidden'), true);
  assert.equal(document.querySelectorAll('[data-map-room-id]').length, 0);
  assert.equal(document.querySelector('#mapper-room-name').textContent, 'Map offline');

  handlers.status({ state: 'connected', message: 'Connected' });
  deliverMap();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(document.querySelectorAll('[data-map-room-id]').length, 2);

  gmcpRequests.length = 0;
  document.querySelector('#mapper-refresh').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(placeholder.hidden, false);
  assert.equal(svg.hasAttribute('hidden'), true);
  assert.equal(document.querySelectorAll('[data-map-room-id]').length, 0);
  assert.deepEqual(gmcpRequests, ['Room.Info', 'Char.GPS', 'NukeFire.Map.Local']);

  deliverMap();
  await new Promise((resolve) => setTimeout(resolve, 380));
  assert.equal(placeholder.hidden, true);
  assert.equal(document.querySelectorAll('[data-map-room-id]').length, 2);
  assert.ok(saves.length >= 1, 'fresh map data remains persistable after a transient reset');
  dom.window.close();
});

test('mapper offline state wins the actual CSS stacking order and hides the live SVG', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
  const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'https://nukefire.test/' });
  const style = dom.window.document.createElement('style');
  style.textContent = styles;
  dom.window.document.head.append(style);

  const placeholder = dom.window.document.querySelector('#mapper-offline');
  const svg = dom.window.document.querySelector('#mapper-svg');
  placeholder.removeAttribute('hidden');
  svg.setAttribute('hidden', '');

  assert.equal(dom.window.getComputedStyle(placeholder).display, 'grid');
  assert.equal(dom.window.getComputedStyle(placeholder).zIndex, '2');
  assert.equal(dom.window.getComputedStyle(svg).display, 'none');

  placeholder.setAttribute('hidden', '');
  svg.removeAttribute('hidden');
  assert.equal(dom.window.getComputedStyle(placeholder).display, 'none');
  assert.equal(dom.window.getComputedStyle(svg).display, 'block');
  assert.equal(dom.window.getComputedStyle(svg).zIndex, '1');
  dom.window.close();
});
