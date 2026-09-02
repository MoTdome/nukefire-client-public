'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function createRenderer() {
  const ansi = require('../src/ansi-parser');
const { installFakeXterm } = require('./fake-xterm');
  const mapper = require('../src/mapper');
  const communications = require('../src/communications');
  const panelWindows = require('../src/panel-window-state');
  const contextDeck = require('../src/context-deck');
  const affects = require('../src/affects');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/' });
  const handlers = {};
  const sent = [];
  const gmcpRequests = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireMapper = mapper;
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.NukeFireContext = contextDeck;
  dom.window.NukeFireAffects = affects;
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
    onGmcp: (callback) => { handlers.gmcp = callback; }, onGmcpState: (callback) => { handlers.gmcpState = callback; },
    onPromptBoundary: () => {}, onProtocolWarning: () => {}, onCharset: () => {},
    onTerminalType: () => {}, onWindowSize: () => {}, onError: () => {},
    onMenuConnect: () => {}, onMenuFind: () => {}, onMenuPreferences: () => {},
    onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {}, onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onPanelBoundsChanged: () => {}, onPanelClosed: () => {}, onPanelAction: () => {}
  };
  dom.window.eval(source);
  return { dom, handlers, sent, gmcpRequests };
}

test('Affects is a dockable review panel with quiet live regions', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  const panel = document.querySelector('#panel-affects');
  assert.ok(panel);
  assert.equal(panel.dataset.workspacePanel, 'affects');
  assert.equal(document.querySelector('#affects-list').getAttribute('aria-live'), 'off');
  assert.equal(document.querySelector('#affects-summary').getAttribute('aria-live'), 'polite');
  assert.ok(document.querySelector('[data-panel-toggle="affects"]'));
  assert.ok(document.querySelector('script[src="../src/affects.js"]'));
  const mode = document.querySelector('#affects-display-mode');
  assert.ok(mode);
  assert.deepEqual([...mode.options].map((option) => option.value), ['complete', 'classic']);
});

test('renders grouped effects, refreshes GMCP, and preserves the text command', async (t) => {
  const { dom, handlers, sent, gmcpRequests } = createRenderer();
  t.after(() => dom.window.close());
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({
    packageName: 'NukeFire.Affects',
    body: {
      schema: 1, revision: 9, server_time: 1000, timed_count: 2, hidden_permanent: 12,
      effects: [
        { id: '1', spell_id: 520, spell: 'Radiant Smite', expire_at: 1120, remaining: 120, source_type: 'spell', apply: 'damroll', modifier: 25 },
        { id: '2', spell_id: 520, spell: 'Radiant Smite', expire_at: 1120, remaining: 120, source_type: 'spell', apply: 'hitroll', modifier: 20 },
        { id: '3', spell_id: 521, spell: 'Censure', expire_at: 1030, remaining: 30, source_type: 'spell' }
      ]
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const document = dom.window.document;
  assert.equal(document.querySelectorAll('.affect-row').length, 2);
  assert.match(document.querySelector('#affects-list').textContent, /Radiant Smite/u);
  const radiantToggle = [...document.querySelectorAll('.affect-row-toggle')]
    .find((button) => /Radiant Smite/u.test(button.textContent));
  assert.ok(radiantToggle);
  const radiantRow = radiantToggle.closest('.affect-row');
  const radiantDetails = radiantRow.querySelector('.affect-row-details');
  assert.equal(radiantDetails.hidden, true);
  radiantToggle.click();
  assert.equal(radiantDetails.hidden, false);
  assert.match(radiantDetails.textContent, /\+25 damroll/u);
  assert.match(document.querySelector('#affects-note').textContent, /12 permanent/u);

  document.querySelector('#affects-refresh').click();
  document.querySelector('#affects-text-list').click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(gmcpRequests, ['NukeFire.Affects']);
  assert.deepEqual(sent, ['afx']);
});

test('Classic Affects view hides permanent rows and restores always-open timed stats', async (t) => {
  const { dom, handlers } = createRenderer();
  t.after(() => dom.window.close());
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({
    packageName: 'NukeFire.Affects',
    body: {
      schema: 1, revision: 18, server_time: 1000, timed_count: 2, permanent_count: 1,
      effects: [
        { id: '1', spell_id: 520, spell: 'Radiant Smite', expire_at: 1120, remaining: 120, source_type: 'spell', apply: 'damroll', modifier: 25 },
        { id: '2', spell_id: 520, spell: 'Radiant Smite', expire_at: 1120, remaining: 120, source_type: 'spell', apply: 'hitroll', modifier: 20 },
        { id: '3', spell_id: 600, spell: 'Stone Skin', permanent: true, expire_at: 0, remaining: -1, source_type: 'object', apply: 'armor', modifier: -50 }
      ]
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const { document, Event } = dom.window;
  assert.equal(document.querySelector('#affects-display-mode').value, 'complete');
  assert.equal(document.querySelectorAll('.affect-row').length, 2);
  assert.match(document.querySelector('#affects-list').textContent, /Stone Skin/u);

  const mode = document.querySelector('#affects-display-mode');
  mode.value = 'classic';
  mode.dispatchEvent(new Event('change', { bubbles: true }));

  assert.equal(document.querySelectorAll('.affect-row').length, 0);
  assert.equal(document.querySelectorAll('.affect-card').length, 1);
  assert.match(document.querySelector('#affects-list').textContent, /Radiant Smite/u);
  assert.doesNotMatch(document.querySelector('#affects-list').textContent, /Stone Skin/u);
  assert.match(document.querySelector('.affect-card .affect-details').textContent, /\+25 damroll/u);
  assert.match(document.querySelector('.affect-card .affect-details').textContent, /\+20 hitroll/u);
  assert.equal(document.querySelector('#affects-note').hidden, true);

  mode.value = 'complete';
  mode.dispatchEvent(new Event('change', { bubbles: true }));
  assert.equal(document.querySelectorAll('.affect-card').length, 0);
  assert.equal(document.querySelectorAll('.affect-row').length, 2);
  assert.match(document.querySelector('#affects-list').textContent, /Stone Skin/u);
});
