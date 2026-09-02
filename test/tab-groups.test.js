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

const DEFAULT_LAYOUT = {
  vitals: { region: 'left', order: 0 },
  quickCommands: { region: 'left', order: 1 },
  liveState: { region: 'left', order: 2 },
  protocol: { region: 'left', order: 3 }
};

const DEFAULT_TAB_GROUPS = {
  vitals: 'vitals',
  quickCommands: 'quickCommands',
  liveState: 'liveState',
  protocol: 'protocol'
};

const DEFAULT_ACTIVE_TABS = { ...DEFAULT_TAB_GROUPS };

const SETTINGS = {
  schemaVersion: 5,
  connection: { host: 'tdome.nukefire.org', port: 4000 },
  display: {
    followOutput: true,
    compactOutput: false,
    fontSize: 16,
    theme: {
      preset: 'nukefire',
      foreground: '#d3d7dc',
      background: '#050607',
      monochrome: false,
      version: '2'
    }
  },
  accessibility: { screenReaderMode: false, announceImportant: true },
  workspace: {
    defaultPanels: {
      vitals: true,
      quickCommands: true,
      liveState: true,
      protocol: true
    },
    defaultLayout: DEFAULT_LAYOUT,
    defaultDockSizes: { left: 240, right: 240, 'outer-right': 260, bottom: 190 },
    defaultTabGroups: DEFAULT_TAB_GROUPS,
    defaultActiveTabs: DEFAULT_ACTIVE_TABS,
    characters: {
      prime: {
        name: 'Prime',
        panels: {
          vitals: true,
          quickCommands: true,
          liveState: true,
          protocol: true
        },
        layout: {
          vitals: { region: 'right', order: 0 },
          quickCommands: { region: 'bottom', order: 0 },
          liveState: { region: 'left', order: 0 },
          protocol: { region: 'left', order: 1 }
        },
        dockSizes: { left: 220, right: 300, 'outer-right': 280, bottom: 210 },
        tabGroups: {
          vitals: 'vitals',
          quickCommands: 'quickCommands',
          liveState: 'diagnostics',
          protocol: 'diagnostics'
        },
        activeTabs: {
          vitals: 'vitals',
          quickCommands: 'quickCommands',
          diagnostics: 'protocol'
        }
      }
    }
  }
};

function createRenderer(settings = SETTINGS) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });
  const saves = [];
  const handlers = {};

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
    saveSettings: async (settings) => {
      saves.push(JSON.parse(JSON.stringify(settings)));
      return { ok: true, settings };
    },
    onText: () => {},
    onStatus: () => {},
    onEcho: () => {},
    onGmcp: () => {},
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
    onMenuReadVitals: () => {}
  };

  dom.window.eval(source);
  return { dom, saves, handlers };
}

function wait(milliseconds = 25) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}


test('fresh workspace opens Mapper with NukeFire Console beside it and Vitals below', async () => {
  const { dom } = createRenderer(DEFAULT_SETTINGS);
  const document = dom.window.document;
  await wait();

  const mapperGroup = document.querySelector('.dock-tab-group[data-tab-group="mapper"]');
  assert.ok(mapperGroup);
  assert.deepEqual(
    [...mapperGroup.querySelectorAll('[role="tab"]')].map((tab) => tab.textContent.trim()),
    ['Mapper', 'NukeFire Console']
  );
  assert.equal(document.querySelector('#panel-mapper').dataset.tabActive, 'true');
  assert.equal(document.querySelector('#panel-context-deck').dataset.tabActive, 'false');
  assert.equal(document.querySelector('#panel-vitals').parentElement.id, 'dock-right');
  assert.equal(document.querySelector('#panel-quick-commands').hidden, true);
  assert.equal(document.querySelector('#panel-live-state').hidden, true);
  assert.equal(document.querySelector('#panel-protocol').hidden, true);
});

test('panel menus expose join and separate tab actions', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  assert.equal(document.querySelectorAll('[data-panel-action="tab-previous"]').length, 12);
  assert.equal(document.querySelectorAll('[data-panel-action="tab-next"]').length, 12);
  assert.equal(document.querySelectorAll('[data-panel-action="separate-tab"]').length, 12);
});

test('joining adjacent panels creates an accessible tab group without replacing the terminal', async () => {
  const { dom, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  const terminal = document.querySelector('.terminal-shell');
  const output = document.querySelector('#output');
  output.scrollTop = 377;

  document.querySelector('[data-panel-menu-button="vitals"]').click();
  document.querySelector('[data-panel-action="tab-next"][data-panel-id="vitals"]').click();
  await wait(230);

  const group = document.querySelector('.dock-tab-group[data-tab-group="affects"]');
  assert.ok(group);
  assert.equal(group.querySelector('[role="tablist"]').hidden, false);
  assert.equal(group.querySelectorAll('[role="tab"]').length, 2);
  assert.equal(document.querySelector('#panel-vitals').parentElement.className, 'panel-tab-content');
  assert.equal(document.querySelector('#panel-affects').parentElement.className, 'panel-tab-content');
  assert.equal(document.querySelector('#panel-vitals').dataset.tabActive, 'true');
  assert.equal(document.querySelector('#panel-affects').dataset.tabActive, 'false');
  assert.equal(document.querySelector('.terminal-shell'), terminal);
  assert.equal(document.querySelector('#output'), output);
  assert.equal(output.scrollTop, 377);
  assert.equal(saves.at(-1).workspace.defaultTabGroups.vitals, 'affects');
});

test('tab selection supports click and arrow keys and persists the active tab', async () => {
  const { dom, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  document.querySelector('[data-panel-menu-button="vitals"]').click();
  document.querySelector('[data-panel-action="tab-next"][data-panel-id="vitals"]').click();
  await wait(230);

  const leftDock = document.querySelector('#dock-left');
  leftDock.scrollTop = 143;
  let affectsTab = document.querySelector('[data-panel-tab="affects"]');
  affectsTab.click();
  await wait(230);
  assert.equal(leftDock.scrollTop, 143);
  assert.equal(document.querySelector('#panel-affects').dataset.tabActive, 'true');
  assert.equal(saves.at(-1).workspace.defaultActiveTabs.affects, 'affects');

  document.querySelector('[data-panel-menu-button="affects"]').click();
  assert.equal(
    document.querySelector('[data-panel-action="move-earlier"][data-panel-id="affects"]').textContent,
    'Move Tab Left'
  );
  assert.equal(
    document.querySelector('[data-panel-action="move-later"][data-panel-id="affects"]').textContent,
    'Move Tab Right'
  );
  document.body.click();

  affectsTab = document.querySelector('[data-panel-tab="affects"]');
  affectsTab.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowRight',
    bubbles: true,
    cancelable: true
  }));
  await wait(230);
  assert.equal(document.querySelector('#panel-vitals').dataset.tabActive, 'true');
  assert.equal(saves.at(-1).workspace.defaultActiveTabs.affects, 'vitals');
});

test('separating the active tab restores independent panels', async () => {
  const { dom, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  document.querySelector('[data-panel-menu-button="vitals"]').click();
  document.querySelector('[data-panel-action="tab-next"][data-panel-id="vitals"]').click();
  await wait(230);

  document.querySelector('[data-panel-menu-button="vitals"]').click();
  document.querySelector('[data-panel-action="separate-tab"][data-panel-id="vitals"]').click();
  await wait(230);

  assert.equal(document.querySelectorAll('.dock-tab-group').length, 1);
  assert.ok(document.querySelector('.dock-tab-group[data-tab-group="mapper"]'));
  assert.equal(document.querySelector('#panel-vitals').parentElement.id, 'dock-left');
  assert.equal(document.querySelector('#panel-affects').parentElement.id, 'dock-left');
  assert.equal(saves.at(-1).workspace.defaultTabGroups.vitals, 'vitals');
});

test('character GMCP restores character tab groups and selected tab', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.gmcpState({
    char: { status: { name: 'Prime', class: 'Assassin', level: 50 } },
    room: {},
    group: null
  });

  const group = document.querySelector('#dock-left .dock-tab-group[data-tab-group="diagnostics"]');
  assert.ok(group);
  assert.equal(group.querySelectorAll('[role="tab"]').length, 2);
  assert.equal(document.querySelector('#panel-protocol').dataset.tabActive, 'true');
  assert.equal(document.querySelector('#panel-live-state').dataset.tabActive, 'false');
  assert.equal(group.querySelector('[data-panel-tab="protocol"]').getAttribute('aria-selected'), 'true');
});
