'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function createRenderer() {
  const ansi = require('../src/ansi-parser');
  const { installFakeXterm } = require('./fake-xterm');
  const mapper = require('../src/mapper');
  const communications = require('../src/communications');
  const panelWindows = require('../src/panel-window-state');
  const contextDeck = require('../src/context-deck');
  const affects = require('../src/affects');
  const html = read('renderer/index.html');
  const source = read('renderer/renderer.js');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/' });
  const handlers = {};
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireMapper = mapper;
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.NukeFireContext = contextDeck;
  dom.window.NukeFireAffects = affects;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }), send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }), setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }), getGmcpState: async () => null,
    loadSettings: async () => ({ settings: null }), saveSettings: async (settings) => ({ ok: true, settings }),
    loadMap: async () => ({ ok: true, map: mapper.normalizeMapData({}) }), saveMap: async (mapData) => ({ ok: true, map: mapData }),
    onText: () => {}, onStatus: (callback) => { handlers.status = callback; }, onEcho: () => {},
    onGmcp: (callback) => { handlers.gmcp = callback; }, onGmcpState: (callback) => { handlers.gmcpState = callback; },
    onPromptBoundary: () => {}, onProtocolWarning: () => {}, onCharset: () => {}, onTerminalType: () => {}, onWindowSize: () => {},
    onError: () => {}, onMenuConnect: () => {}, onMenuFind: () => {}, onMenuPreferences: () => {},
    onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {}, onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onPanelBoundsChanged: () => {}, onPanelClosed: () => {}, onPanelAction: () => {}
  };
  dom.window.eval(source);
  return { dom, handlers };
}

async function feedAffects(renderer) {
  const { handlers } = renderer;
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({
    packageName: 'NukeFire.Affects',
    body: {
      schema: 1, revision: 77, server_time: 1000, hidden_permanent: 4,
      effects: [
        { id: '1', spell_id: 520, spell: 'Radiant Smite', expire_at: 1120, remaining: 120, source_type: 'spell', apply: 'damroll', modifier: 25 },
        { id: '2', spell_id: 520, spell: 'Radiant Smite', expire_at: 1120, remaining: 120, source_type: 'spell', apply: 'hitroll', modifier: 20 },
        { id: '3', spell_id: 600, spell: 'Stone Skin', permanent: true, expire_at: 0, remaining: -1, source_type: 'other', apply: 'armor', modifier: -50 }
      ]
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
}

test('Complete Affects view stays compact while Classic cards remain mode-gated', () => {
  const css = read('renderer/styles.css');
  const renderer = read('renderer/renderer.js');
  assert.match(css, /\.affect-row-toggle\s*\{/u);
  assert.match(css, /\.affect-card\s*\{/u);
  assert.match(css, /max-height:\s*none/u);
  assert.match(renderer, /const classicMode = state\.affectsDisplayMode === 'classic';/u);
  assert.match(renderer, /if \(classicMode\) \{[\s\S]*card\.className = 'affect-card'[\s\S]*continue;[\s\S]*row\.className = 'affect-row'/u);
  assert.match(renderer, /aria-controls/u);
  assert.match(renderer, /aria-expanded/u);
});

test('renders timed and permanent affects as dense one-line disclosure controls', async () => {
  const renderer = createRenderer();
  await feedAffects(renderer);
  const document = renderer.dom.window.document;
  const rows = [...document.querySelectorAll('.affect-row')];
  assert.equal(rows.length, 2);
  assert.equal(rows[0].querySelector('.affect-row-toggle').getAttribute('aria-expanded'), 'false');
  assert.match(rows[0].textContent, /Radiant Smite/u);
  assert.match(rows[0].textContent, /2m 0s|1m 5\d+s|1m/u);
  assert.match(rows[1].textContent, /Stone Skin/u);
  assert.match(rows[1].textContent, /Permanent/u);
  renderer.dom.window.close();
});

test('clicking an affect reveals its modifiers and source and clicking again collapses it', async () => {
  const renderer = createRenderer();
  await feedAffects(renderer);
  const document = renderer.dom.window.document;
  const toggle = document.querySelector('.affect-row-toggle');
  const details = document.getElementById(toggle.getAttribute('aria-controls'));
  assert.equal(details.hidden, true);
  toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(details.hidden, false);
  assert.match(details.textContent, /\+25 damroll/u);
  assert.match(details.textContent, /\+20 hitroll/u);
  assert.match(details.textContent, /Source: Spell/u);
  toggle.click();
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(details.hidden, true);
  renderer.dom.window.close();
});

test('expanded affect remains open when the same server group is rerendered', async () => {
  const renderer = createRenderer();
  await feedAffects(renderer);
  const { document } = renderer.dom.window;
  const toggle = document.querySelector('.affect-row-toggle');
  toggle.click();
  renderer.handlers.gmcp({
    packageName: 'NukeFire.Affects',
    body: {
      schema: 1, revision: 78, server_time: 1001,
      effects: [
        { id: '1', spell_id: 520, spell: 'Radiant Smite', expire_at: 1120, remaining: 119, source_type: 'spell', apply: 'damroll', modifier: 25 },
        { id: '2', spell_id: 520, spell: 'Radiant Smite', expire_at: 1120, remaining: 119, source_type: 'spell', apply: 'hitroll', modifier: 20 }
      ]
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 5));
  const rerendered = document.querySelector('.affect-row-toggle');
  assert.equal(rerendered.getAttribute('aria-expanded'), 'true');
  assert.equal(document.getElementById(rerendered.getAttribute('aria-controls')).hidden, false);
  renderer.dom.window.close();
});

test('omitted permanent sources are stated as a server-feed limitation rather than invented client data', async (t) => {
  const renderer = createRenderer();
  t.after(() => renderer.dom.window.close());
  await feedAffects(renderer);
  const note = renderer.dom.window.document.querySelector('#affects-note');
  assert.match(note.textContent, /4 permanent equipment, implant, tattoo, or remort modifiers were omitted from this live packet so timed affects remain visible\./u);
});
