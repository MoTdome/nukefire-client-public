'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const { installFakeXterm } = require('./fake-xterm');
const { DEFAULT_SETTINGS } = require('../src/settings-store');
const panelDragLayout = require('../src/panel-drag-layout');

const PANEL_IDS = [
  'affects',
  'communications',
  'quickCommands',
  'liveState',
  'protocol',
  'mapper',
  'contextDeck',
  'vitals',
  'sessionVitals'
];

function settingsWithIndependentPanels() {
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  settings.workspace.defaultPanels = Object.fromEntries(PANEL_IDS.map((id) => [id, true]));
  settings.workspace.defaultLayout = {
    affects: { region: 'left', order: 0 },
    communications: { region: 'left', order: 1 },
    quickCommands: { region: 'left', order: 2 },
    liveState: { region: 'left', order: 3 },
    protocol: { region: 'left', order: 4 },
    mapper: { region: 'right', order: 0 },
    contextDeck: { region: 'right', order: 1 },
    vitals: { region: 'right', order: 2 },
    sessionVitals: { region: 'right', order: 3 }
  };
  settings.workspace.defaultTabGroups = Object.fromEntries(PANEL_IDS.map((id) => [id, id]));
  settings.workspace.defaultActiveTabs = Object.fromEntries(PANEL_IDS.map((id) => [id, id]));
  settings.workspace.characters = {};
  return settings;
}

function createRenderer(settings = settingsWithIndependentPanels()) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/'
  });
  const saves = [];

  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFirePanelDragLayout = panelDragLayout;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    loadSettings: async () => ({ settings: JSON.parse(JSON.stringify(settings)) }),
    saveSettings: async (nextSettings) => {
      saves.push(JSON.parse(JSON.stringify(nextSettings)));
      return { ok: true, settings: nextSettings };
    },
    onText: () => {},
    onStatus: () => {},
    onEcho: () => {},
    onGmcp: () => {},
    onGmcpState: () => {},
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
    onMenuReadVitals: () => {}
  };

  dom.window.eval(source);
  return { dom, saves };
}

function wait(milliseconds = 25) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function dataTransferStub() {
  const values = new Map();
  return {
    effectAllowed: '',
    dropEffect: '',
    setData(type, value) { values.set(type, String(value)); },
    getData(type) { return values.get(type) || ''; }
  };
}

function dragEvent(dom, type, dataTransfer, coordinates = {}) {
  const event = new dom.window.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { configurable: true, value: dataTransfer });
  Object.defineProperty(event, 'clientX', { configurable: true, value: coordinates.clientX || 0 });
  Object.defineProperty(event, 'clientY', { configurable: true, value: coordinates.clientY || 0 });
  return event;
}

function setRect(element, { left = 0, top = 0, width = 200, height = 100 } = {}) {
  element.getBoundingClientRect = () => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({})
  });
}

function dragPanel(dom, source, target, coordinates = {}) {
  const transfer = dataTransferStub();
  source.dispatchEvent(dragEvent(dom, 'dragstart', transfer, coordinates));
  target.dispatchEvent(dragEvent(dom, 'dragover', transfer, coordinates));
  target.dispatchEvent(dragEvent(dom, 'drop', transfer, coordinates));
  source.dispatchEvent(dragEvent(dom, 'dragend', transfer, coordinates));
}

test('panel titles drag between docks without replacing the terminal', async () => {
  const { dom, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  const terminal = document.querySelector('.terminal-shell');
  const output = document.querySelector('#output');
  output.scrollTop = 246;

  const titlebar = document.querySelector('#panel-quick-commands .panel-titlebar');
  const rightDock = document.querySelector('#dock-right');
  assert.equal(titlebar.draggable, true);

  dragPanel(dom, titlebar, rightDock);
  await wait(230);

  assert.equal(document.querySelector('#panel-quick-commands').parentElement.id, 'dock-right');
  assert.equal(document.querySelector('.terminal-shell'), terminal);
  assert.equal(document.querySelector('#output'), output);
  assert.equal(output.scrollTop, 246);
  assert.equal(saves.at(-1).workspace.defaultLayout.quickCommands.region, 'right');
});

test('dropping a panel in the center of another panel creates draggable tabs', async () => {
  const { dom, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  const source = document.querySelector('#panel-vitals .panel-titlebar');
  const targetPanel = document.querySelector('#panel-affects');
  setRect(targetPanel, { left: 0, top: 0, width: 220, height: 120 });

  dragPanel(dom, source, targetPanel, { clientX: 110, clientY: 60 });
  await wait(230);

  const group = document.querySelector('.dock-tab-group[data-tab-group="affects"]');
  assert.ok(group);
  assert.deepEqual(
    [...group.querySelectorAll('[data-panel-tab]')].map((tab) => tab.dataset.panelTab),
    ['affects', 'vitals']
  );
  assert.equal(group.querySelector('[data-panel-tab="vitals"]').draggable, true);
  assert.equal(document.querySelector('#panel-vitals').dataset.tabActive, 'true');
  assert.equal(saves.at(-1).workspace.defaultTabGroups.vitals, 'affects');
});

test('dragging a tab reorders it inside the same group', async () => {
  const settings = settingsWithIndependentPanels();
  settings.workspace.defaultTabGroups.affects = 'affects';
  settings.workspace.defaultTabGroups.communications = 'affects';
  settings.workspace.defaultActiveTabs = {
    ...settings.workspace.defaultActiveTabs,
    affects: 'communications'
  };

  const { dom, saves } = createRenderer(settings);
  const document = dom.window.document;
  await wait();

  const source = document.querySelector('[data-panel-tab="communications"]');
  const target = document.querySelector('[data-panel-tab="affects"]');
  setRect(target, { left: 0, top: 0, width: 100, height: 32 });

  dragPanel(dom, source, target, { clientX: 10, clientY: 16 });
  await wait(230);

  const group = document.querySelector('.dock-tab-group[data-tab-group="affects"]');
  assert.deepEqual(
    [...group.querySelectorAll('[data-panel-tab]')].map((tab) => tab.dataset.panelTab),
    ['communications', 'affects']
  );
  assert.equal(saves.at(-1).workspace.defaultTabGroups.communications, 'affects');
  assert.ok(
    saves.at(-1).workspace.defaultLayout.communications.order <
    saves.at(-1).workspace.defaultLayout.affects.order
  );
});

test('dragging the group-id panel out leaves the remaining tab group valid', async () => {
  const settings = settingsWithIndependentPanels();
  settings.workspace.defaultTabGroups.affects = 'affects';
  settings.workspace.defaultTabGroups.communications = 'affects';
  settings.workspace.defaultActiveTabs = {
    ...settings.workspace.defaultActiveTabs,
    affects: 'affects'
  };

  const { dom, saves } = createRenderer(settings);
  const document = dom.window.document;
  await wait();

  const source = document.querySelector('#panel-affects .panel-titlebar');
  const rightDock = document.querySelector('#dock-right');
  dragPanel(dom, source, rightDock);
  await wait(230);

  assert.equal(document.querySelector('#panel-affects').parentElement.id, 'dock-right');
  assert.equal(document.querySelector('#panel-communications').parentElement.id, 'dock-left');
  assert.equal(saves.at(-1).workspace.defaultTabGroups.affects, 'affects');
  assert.equal(saves.at(-1).workspace.defaultTabGroups.communications, 'communications');
  assert.equal(saves.at(-1).workspace.defaultActiveTabs.communications, 'communications');
});


test('dragging onto the far-right target creates a second right-side column', async () => {
  const { dom, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  const source = document.querySelector('#panel-affects .panel-titlebar');
  const outerRightDock = document.querySelector('#dock-outer-right');
  dragPanel(dom, source, outerRightDock);
  await wait(230);

  assert.equal(document.querySelector('#panel-affects').parentElement.id, 'dock-outer-right');
  assert.equal(document.querySelector('#dock-right').hidden, false);
  assert.equal(document.querySelector('#dock-outer-right').hidden, false);
  assert.equal(saves.at(-1).workspace.defaultLayout.affects.region, 'outer-right');
});
