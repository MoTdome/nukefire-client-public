'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');

const root = path.resolve(__dirname, '..');

test('communications updates publish only Communications instead of every open pane', () => {
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  assert.match(renderer, /function publishCommunicationsPopoutState\(\) \{\s+schedulePanelPopoutPublish\('communications'\);\s+\}/u);
  assert.doesNotMatch(renderer, /function publishCommunicationsPopoutState\(\) \{\s+publishAllPanelPopoutStates\(\);/u);
});

test('communications pop-out appends ordinary snapshots without rebuilding existing messages', () => {
  const html = fs.readFileSync(path.join(root, 'renderer', 'popout.html'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'renderer', 'popout.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/popout.html?panel=communications'
  });
  let stateHandler = null;
  dom.window.NukeFireAnsi = ansi;
  dom.window.NukeFirePanelWindows = require('../src/panel-window-state');
  dom.window.nukefirePanel = {
    ready: async () => ({ ok: true }),
    action: async () => ({ ok: true }),
    onState: (callback) => { stateHandler = callback; }
  };
  dom.window.eval(source);
  const channels = [{ id: 'all', label: 'All' }, { id: 'gossip', label: 'Gossip' }];
  const first = { id: 1, channel: 'gossip', sender: 'Vit', text: 'first', ansiText: 'first', timestamp: 1 };
  const second = { id: 2, channel: 'gossip', sender: 'Vit', text: 'second', ansiText: 'second', timestamp: 2 };
  stateHandler({ channels, activeChannel: 'all', messageOrder: 'newest-bottom', messages: [first] });
  const originalArticle = dom.window.document.querySelector('[data-message-id="1"]');
  stateHandler({ channels, activeChannel: 'all', messageOrder: 'newest-bottom', messages: [first, second] });
  assert.equal(dom.window.document.querySelector('[data-message-id="1"]'), originalArticle);
  assert.equal(dom.window.document.querySelectorAll('.communication-message').length, 2);
  assert.equal(dom.window.document.querySelector('.communication-message:last-child').dataset.messageId, '2');
});

test('communications pop-out incrementally removes the oldest capped message', () => {
  const popout = fs.readFileSync(path.join(root, 'renderer', 'popout.js'), 'utf8');
  assert.match(popout, /removed: previousMessages\.slice\(0, previousStart\), added/u);
  assert.match(popout, /data-message-id/u);
  assert.match(popout, /container\.querySelector\(`\[data-message-id=/u);
});
