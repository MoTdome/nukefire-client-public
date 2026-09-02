'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const { installFakeXterm } = require('./fake-xterm');

const EXPECTED_PANEL_IDS = Object.freeze([
  'vitals',
  'sessionVitals',
  'affects',
  'mobInspector',
  'lootHistory',
  'foundlist',
  'quickCommands',
  'liveState',
  'protocol',
  'communications',
  'contextDeck',
  'mapper'
]);

test('Communications pop-out is a keyboard-accessible independent panel view', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'popout.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'popout.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/popout.html?panel=communications' });
  const actions = [];
  let stateHandler = null;
  dom.window.NukeFireAnsi = ansi;
  dom.window.NukeFirePanelWindows = require('../src/panel-window-state');
  installFakeXterm(dom);
  dom.window.nukefirePanel = {
    ready: async () => ({ ok: true }),
    action: async (request) => { actions.push(request); return { ok: true }; },
    onState: (callback) => { stateHandler = callback; }
  };
  dom.window.eval(source);
  assert.equal(dom.window.document.querySelectorAll('[role="tab"]').length, 8);
  assert.equal(dom.window.document.querySelector('#communications-messages').getAttribute('aria-live'), 'off');
  assert.ok(dom.window.document.querySelector('#dock-panel'));
  stateHandler({
    channels: [
      { id: 'all', label: 'All' },
      { id: 'gossip', label: 'Gossip' },
      { id: 'newbie', label: 'Newbie' },
      { id: 'group', label: 'Group' },
      { id: 'tell', label: 'Tell' },
      { id: 'grats', label: 'Grats' },
      { id: 'auction', label: 'Auction' },
      { id: 'ssf', label: 'SSF' },
      { id: 'bonejack', label: 'Bonejack' },
      { id: 'system', label: 'System' }
    ],
    activeChannel: 'gossip', messageOrder: 'newest-top', unread: { gossip: 2 },
    messages: [
      { id: 1, channel: 'gossip', sender: 'Vit', text: "Vit gossips, 'older'", ansiText: "\x1b[33mVit gossips, 'older'\x1b[0m", timestamp: Date.now() - 1000 },
      { id: 2, channel: 'gossip', sender: 'Vit', text: "Vit gossips, 'newest'", ansiText: "\x1b[33mVit gossips, 'newest'\x1b[0m", timestamp: Date.now() }
    ],
    theme: { foreground: '#ffb000', background: '#000000', monochrome: false }
  });
  assert.equal(dom.window.document.querySelectorAll('[role="tab"]').length, 10);
  assert.ok(dom.window.document.querySelector('[data-channel="ssf"]'));
  assert.ok(dom.window.document.querySelector('[data-channel="bonejack"]'));
  assert.equal(dom.window.document.querySelector('[data-channel="gossip"]').getAttribute('aria-selected'), 'true');
  assert.equal(dom.window.document.querySelector('#communications-order').value, 'newest-top');
  assert.match(dom.window.document.querySelector('.communication-message').textContent, /newest/u);
  const communicationsMessages = dom.window.document.querySelector('#communications-messages');
  assert.equal(communicationsMessages.dataset.messageOrder, 'newest-top');
  assert.equal(communicationsMessages.scrollTop, 0);

  const order = dom.window.document.querySelector('#communications-order');
  order.value = 'newest-bottom';
  order.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.match(dom.window.document.querySelector('.communication-message').textContent, /older/u);
  assert.deepEqual({ ...actions.at(-1) }, {
    panelId: 'communications',
    action: 'set-order',
    messageOrder: 'newest-bottom'
  });

  dom.window.document.querySelector('#dock-panel').click();
  assert.equal(actions.at(-1).action, 'dock');
});

test('generic panel pop-out mirrors live content and relays accessible controls', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'popout.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'popout.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/popout.html?panel=vitals'
  });
  const actions = [];
  let stateHandler = null;
  dom.window.NukeFireAnsi = ansi;
  dom.window.NukeFirePanelWindows = require('../src/panel-window-state');
  dom.window.nukefirePanel = {
    ready: async () => ({ ok: true }),
    action: async (request) => { actions.push(request); return { ok: true }; },
    onState: (callback) => { stateHandler = callback; }
  };

  dom.window.eval(source);
  stateHandler({
    mode: 'mirror',
    panelId: 'vitals',
    label: 'Vitals',
    subtitle: 'Health, mana, movement, combat, and group status',
    revision: 1,
    html: [
      '<section class="panel vitals-panel" aria-label="Vitals panel">',
      '<button id="vitals-test-button" data-popout-control="vitals:id:vitals-test-button">Assist</button>',
      '<input id="vitals-test-input" data-popout-control="vitals:id:vitals-test-input" value="Prime">',
      '</section>'
    ].join(''),
    theme: { foreground: '#d3d7dc', background: '#050607', monochrome: false },
    ui: { fontSize: 18, interfaceBrightness: 'high-contrast' },
    screenReaderMode: true
  });

  assert.equal(dom.window.document.title, 'NukeFire Client — Vitals');
  assert.equal(dom.window.document.querySelector('#communications-view').hidden, true);
  assert.equal(dom.window.document.querySelector('#generic-panel-view').hidden, false);
  assert.equal(dom.window.document.body.classList.contains('screen-reader-mode'), true);
  assert.equal(dom.window.document.body.dataset.interfaceBrightness, 'high-contrast');

  dom.window.document.querySelector('#vitals-test-button').click();
  const relayedClick = JSON.parse(JSON.stringify(actions.at(-1)));
  assert.deepEqual(relayedClick, {
    panelId: 'vitals',
    action: 'control',
    control: {
      token: 'vitals:id:vitals-test-button',
      kind: 'click',
      value: '',
      checked: false,
      key: '',
      deltaX: 0,
      deltaY: 0,
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false
    }
  });

  const input = dom.window.document.querySelector('#vitals-test-input');
  input.value = 'Tank';
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(actions.at(-1).control.token, 'vitals:id:vitals-test-input');
  assert.equal(actions.at(-1).control.kind, 'input');
  assert.equal(actions.at(-1).control.value, 'Tank');

  dom.window.document.querySelector('#dock-panel').click();
  assert.equal(actions.at(-1).action, 'dock');
});

test('pop-out size controls request presets and exact custom dimensions', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'popout.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'popout.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/popout.html?panel=mapper'
  });
  const resizes = [];
  let boundsHandler = null;
  dom.window.NukeFireAnsi = ansi;
  dom.window.NukeFirePanelWindows = require('../src/panel-window-state');
  dom.window.nukefirePanel = {
    ready: async () => ({ ok: true, bounds: { x: 10, y: 20, width: 880, height: 760 } }),
    resize: async (request) => {
      resizes.push(JSON.parse(JSON.stringify(request)));
      const width = request.mode === 'custom' ? request.width : 1440;
      const height = request.mode === 'custom' ? request.height : 1000;
      return { ok: true, bounds: { x: 10, y: 20, width, height } };
    },
    action: async () => ({ ok: true }),
    onState: () => {},
    onBounds: (callback) => { boundsHandler = callback; }
  };

  dom.window.eval(source);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(dom.window.document.querySelector('#panel-current-size').textContent, 'Current: 880 × 760');

  dom.window.document.querySelector('#panel-size-toggle').click();
  assert.equal(dom.window.document.querySelector('#panel-size-menu').hidden, false);
  dom.window.document.querySelector('[data-window-size="large"]').click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(resizes.at(-1), { panelId: 'mapper', mode: 'large' });

  dom.window.document.querySelector('#panel-size-toggle').click();
  dom.window.document.querySelector('#custom-window-width').value = '2400';
  dom.window.document.querySelector('#custom-window-height').value = '1500';
  dom.window.document.querySelector('#custom-size-form')
    .dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(resizes.at(-1), {
    panelId: 'mapper', mode: 'custom', width: 2400, height: 1500
  });

  boundsHandler({ x: -2200, y: 0, width: 3000, height: 1700 });
  assert.equal(dom.window.document.querySelector('#panel-current-size').textContent, 'Current: 3000 × 1700');
});

test('every sidebar panel exposes one Pop Out Window command', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  const items = [...document.querySelectorAll('[data-panel-action="pop-out"]')];
  assert.equal(items.length, EXPECTED_PANEL_IDS.length);
  assert.deepEqual(items.map((item) => item.dataset.panelId), EXPECTED_PANEL_IDS);
  for (const item of items) assert.match(item.textContent, /Pop Out Window/u);
});

test('main renderer pops panels out, saves bounds, mirrors content, and docks them again', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const communications = require('../src/communications');
  const panelWindows = require('../src/panel-window-state');
  const { DEFAULT_SETTINGS } = require('../src/settings-store');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/'
  });
  const handlers = {};
  const opens = [];
  const closes = [];
  const publishes = [];
  const saves = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    loadSettings: async () => ({ settings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) }),
    saveSettings: async (settings) => { saves.push(JSON.parse(JSON.stringify(settings))); return { ok: true, settings }; },
    openPanelWindow: async (request) => { opens.push(request); return { ok: true, bounds: { x: 40, y: 50, width: 720, height: 600 } }; },
    closePanelWindow: async (panelId) => { closes.push(panelId); return { ok: true }; },
    publishPanelState: async (panelId, snapshot) => { publishes.push({ panelId, snapshot }); return { ok: true }; },
    onText: () => {}, onStatus: () => {}, onEcho: () => {}, onGmcp: () => {}, onGmcpState: () => {},
    onPromptBoundary: () => {}, onProtocolWarning: () => {}, onCharset: () => {}, onTerminalType: () => {},
    onWindowSize: () => {}, onError: () => {}, onMenuConnect: () => {}, onMenuFind: () => {},
    onMenuPreferences: () => {}, onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onPanelBoundsChanged: (callback) => { handlers.bounds = callback; },
    onPanelClosed: (callback) => { handlers.closed = callback; },
    onPanelAction: (callback) => { handlers.action = callback; }
  };
  dom.window.eval(source);
  await new Promise((resolve) => setTimeout(resolve, 60));

  dom.window.document.querySelector('[data-panel-action="pop-out"][data-panel-id="communications"]').click();
  await new Promise((resolve) => setTimeout(resolve, 260));
  assert.equal(opens.length, 1);
  assert.equal(opens[0].panelId, 'communications');
  assert.equal(dom.window.document.querySelector('#panel-communications').hidden, true);
  assert.equal(saves.at(-1).workspace.defaultPopouts.communications.open, true);
  assert.equal(publishes.some((entry) =>
    entry.panelId === 'communications' &&
    entry.snapshot.mode === 'communications' &&
    entry.snapshot.messageOrder === 'newest-top'
  ), true);

  handlers.bounds({ panelId: 'communications', bounds: { x: -900, y: 70, width: 800, height: 650 } });
  await new Promise((resolve) => setTimeout(resolve, 240));
  assert.deepEqual(saves.at(-1).workspace.defaultPopouts.communications.bounds, {
    x: -900, y: 70, width: 800, height: 650
  });

  handlers.closed({ panelId: 'communications', bounds: { x: -900, y: 70, width: 800, height: 650 } });
  await new Promise((resolve) => setTimeout(resolve, 240));
  assert.equal(dom.window.document.querySelector('#panel-communications').hidden, false);
  assert.equal(saves.at(-1).workspace.defaultPopouts.communications.open, false);

  dom.window.document.querySelector('[data-panel-action="pop-out"][data-panel-id="mapper"]').click();
  await new Promise((resolve) => setTimeout(resolve, 260));
  assert.equal(opens.at(-1).panelId, 'mapper');
  assert.equal(dom.window.document.querySelector('#panel-mapper').hidden, true);
  assert.equal(saves.at(-1).workspace.defaultPopouts.mapper.open, true);
  const mapperPublish = publishes.findLast((entry) => entry.panelId === 'mapper');
  assert.equal(mapperPublish?.snapshot.mode, 'mirror');
  assert.match(mapperPublish?.snapshot.html || '', /mapper-gps-refresh/u);
  assert.match(mapperPublish?.snapshot.html || '', /data-popout-control/u);

  handlers.action({ panelId: 'mapper', action: 'dock' });
  await new Promise((resolve) => setTimeout(resolve, 240));
  assert.equal(dom.window.document.querySelector('#panel-mapper').hidden, false);
  assert.equal(saves.at(-1).workspace.defaultPopouts.mapper.open, false);
  assert.ok(closes.includes('mapper') || closes.length >= EXPECTED_PANEL_IDS.length);
});
