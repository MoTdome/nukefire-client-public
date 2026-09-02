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
  dom.window.confirm = () => true;
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

test('NukeFire Console is a dockable, keyboard-accessible, server-driven panel', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  const panel = document.querySelector('#panel-context-deck');
  assert.ok(panel);
  assert.equal(panel.dataset.workspacePanel, 'contextDeck');
  assert.equal(document.querySelector('#context-deck-heading').textContent, 'NukeFire Console');
  assert.equal(document.querySelector('#context-deck-cards').getAttribute('aria-live'), 'off');
  assert.equal(document.querySelector('#context-deck-summary').getAttribute('aria-live'), 'polite');
  assert.ok(document.querySelector('[data-panel-menu-button="contextDeck"]'));
  assert.ok(document.querySelector('[data-panel-toggle="contextDeck"]'));
  assert.ok(document.querySelector('script[src="../src/context-deck.js"]'));
});

test('renders NukeFire.Context actions and sends ordinary game commands', async () => {
  const { dom, handlers, sent, gmcpRequests } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({
    packageName: 'NukeFire.Context',
    body: {
      schema: 1,
      room: 3218,
      zone: 30,
      contexts: [
        {
          id: 'ink-master', kind: 'service', priority: 100,
          title: 'Chromatic Ink-Master',
          summary: 'Cybernetic tattoo and ink services.',
          status: [{ label: 'Position', value: 'Sit before modifications', tone: 'warning' }],
          actions: [
            { id: 'services', label: 'Show Services', command: 'buy list', style: 'primary' },
            {
              id: 'add-channel', label: 'Cut Ink Channel', command: 'buy addchannel',
              arguments: [
                { id: 'tattoo', label: 'Tattoo or location', type: 'text', required: true },
                { id: 'shape', label: 'Shape', type: 'select', required: true, options: ['round', 'star'] }
              ]
            },
            { id: 'laser', label: 'Destroy Installed Ink', command: 'buy laserink', style: 'danger', confirm: 'The ink will be destroyed.' }
          ]
        },
        {
          id: 'zone', kind: 'zone', title: 'Zone Intelligence', priority: 0,
          actions: [{ id: 'zinfo', label: 'Zone Information', command: 'zinfo' }]
        }
      ]
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const document = dom.window.document;
  assert.equal(document.querySelectorAll('.context-card').length, 0, 'inactive Console tab should defer its heavy render');
  const contextTab = document.querySelector('[data-panel-tab="contextDeck"]');
  assert.ok(contextTab, 'Console should remain available as a Mapper tab');
  contextTab.click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(document.querySelectorAll('.context-card').length, 2);
  assert.match(document.querySelector('#context-deck-cards').textContent, /Chromatic Ink-Master/u);
  const warningRow = document.querySelector('.context-status-row[data-tone="warning"]');
  assert.ok(warningRow);
  assert.match(warningRow.textContent, /Sit before modifications/u);

  [...document.querySelectorAll('button')].find((button) => button.textContent === 'Show Services').click();
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));
  assert.deepEqual(sent, ['buy list']);
  assert.equal(document.activeElement, document.querySelector('#command'));

  const form = [...document.querySelectorAll('.context-action-form')]
    .find((candidate) => candidate.textContent.includes('Cut Ink Channel'));
  form.elements.namedItem('tattoo').value = 'leftarm';
  form.elements.namedItem('shape').value = 'star';
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['buy list', 'buy addchannel leftarm star']);

  document.querySelector('#context-deck-refresh').click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(gmcpRequests, ['NukeFire.Context']);
});
