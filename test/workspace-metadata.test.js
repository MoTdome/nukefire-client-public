
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const { installFakeXterm } = require('./fake-xterm');

const SETTINGS = {
  schemaVersion: 2,
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
  accessibility: {
    screenReaderMode: false,
    announceImportant: true
  },
  workspace: {
    defaultPanels: {
      vitals: true,
      quickCommands: true,
      liveState: true,
      protocol: true
    },
    characters: {
      prime: {
        name: 'Prime',
        panels: {
          vitals: true,
          quickCommands: false,
          liveState: true,
          protocol: false
        }
      }
    }
  }
};

function createRenderer() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });
  const handlers = {};
  const saves = [];

  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    loadSettings: async () => ({ settings: JSON.parse(JSON.stringify(SETTINGS)) }),
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
  return { dom, handlers, saves };
}

function wait(milliseconds = 15) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

test('Preferences exposes simple visibility controls for only the existing sidebar panels', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  assert.equal(document.querySelectorAll('[data-workspace-panel]').length, 12);
  assert.equal(document.querySelectorAll('[data-panel-toggle]').length, 12);
  assert.ok(document.querySelector('#reset-sidebar-panels'));
  assert.ok(document.querySelector('#shared-crew-workspace'));
  assert.equal(document.querySelectorAll('[data-panel-action="pop-out"]').length, 12);
  assert.ok(document.querySelector('#output').closest('.terminal-shell'));
  assert.ok(document.querySelector('#command').closest('.terminal-shell'));
});

test('character GMCP selects character-specific panel visibility without restructuring the terminal', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  assert.equal(document.querySelector('#panel-quick-commands').hidden, false);
  assert.equal(document.querySelector('#panel-protocol').hidden, false);

  handlers.gmcpState({
    char: { status: { name: 'Prime', class: 'Assassin', level: 50 } },
    room: {},
    group: null
  });

  assert.equal(document.querySelector('#panel-vitals').hidden, false);
  assert.equal(document.querySelector('#panel-quick-commands').hidden, true);
  assert.equal(document.querySelector('#panel-live-state').hidden, false);
  assert.equal(document.querySelector('#panel-protocol').hidden, true);
  assert.match(document.querySelector('#panel-scope-status').textContent, /Prime/u);
  assert.ok(document.querySelector('#output').closest('.terminal-shell'));
});

test('panel changes save to the active character and reset restores the focused first-run set', async () => {
  const { dom, handlers, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.gmcpState({
    char: { status: { name: 'Prime' } },
    room: {},
    group: null
  });

  const vitalsToggle = document.querySelector('#show-panel-vitals');
  vitalsToggle.checked = false;
  vitalsToggle.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await wait(230);

  assert.equal(document.querySelector('#panel-vitals').hidden, true);
  assert.equal(saves.at(-1).workspace.characters.prime.panels.vitals, false);
  assert.equal(saves.at(-1).display.followOutput, true);

  document.querySelector('#reset-sidebar-panels').click();
  await wait(230);

  assert.equal(document.querySelector('#panel-vitals').hidden, false);
  assert.equal(document.querySelector('#panel-session-vitals').hidden, false);
  assert.equal(document.querySelector('#panel-affects').hidden, false);
  assert.equal(document.querySelector('#panel-communications').hidden, false);
  assert.equal(document.querySelector('#panel-mapper').hidden, false);
  assert.equal(document.querySelector('#panel-quick-commands').hidden, true);
  assert.equal(document.querySelector('#panel-live-state').hidden, true);
  assert.equal(document.querySelector('#panel-protocol').hidden, true);
  assert.equal(document.querySelector('#panel-context-deck').hidden, false);
  assert.equal(document.querySelector('#panel-context-deck').dataset.tabActive, 'false');
  assert.deepEqual(saves.at(-1).workspace.characters.prime.panels, {
    vitals: true,
    sessionVitals: true,
    affects: true,
    mobInspector: false,
    lootHistory: false,
    foundlist: false,
    quickCommands: false,
    liveState: false,
    protocol: false,
    communications: true,
    contextDeck: true,
    luaPanes: false,
    mapper: true
  });
});

test('shared crew workspace keeps the configured arrangement while sessions change', async () => {
  const { dom, handlers, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.gmcpState({ char: { status: { name: 'Prime' } }, room: {}, group: null });
  assert.equal(document.querySelector('#panel-quick-commands').hidden, true);
  assert.equal(document.querySelector('#panel-protocol').hidden, true);

  const shared = document.querySelector('#shared-crew-workspace');
  shared.checked = true;
  shared.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await wait(230);

  handlers.gmcpState({ char: { status: { name: 'Caul' } }, room: {}, group: null });
  assert.equal(document.querySelector('#panel-quick-commands').hidden, true);
  assert.equal(document.querySelector('#panel-protocol').hidden, true);
  assert.match(document.querySelector('#panel-scope-status').textContent, /shared panel layout/u);
  assert.equal(saves.at(-1).workspace.sharedCrewWorkspace, true);
  assert.equal(saves.at(-1).workspace.defaultPanels.quickCommands, false);
  assert.equal(saves.at(-1).workspace.defaultPanels.protocol, false);
});

test('a different character without an override receives the saved default panel set', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.gmcpState({ char: { status: { name: 'Prime' } }, room: {}, group: null });
  assert.equal(document.querySelector('#panel-protocol').hidden, true);

  handlers.gmcpState({ char: { status: { name: 'Caul' } }, room: {}, group: null });
  assert.equal(document.querySelector('#panel-vitals').hidden, false);
  assert.equal(document.querySelector('#panel-session-vitals').hidden, false);
  assert.equal(document.querySelector('#panel-affects').hidden, false);
  assert.equal(document.querySelector('#panel-communications').hidden, false);
  assert.equal(document.querySelector('#panel-mapper').hidden, false);
  assert.equal(document.querySelector('#panel-quick-commands').hidden, false);
  assert.equal(document.querySelector('#panel-live-state').hidden, false);
  assert.equal(document.querySelector('#panel-protocol').hidden, false);
  assert.equal(document.querySelector('#panel-context-deck').hidden, false);
  assert.equal(document.querySelector('#panel-context-deck').dataset.tabActive, 'false');
  assert.match(document.querySelector('#panel-scope-status').textContent, /Caul/u);
});
