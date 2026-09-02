'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')
    .replace(/\r\n?/gu, '\n');
}

test('command line explains send and history behavior without changing the input value', () => {
  const html = source('renderer/index.html');
  assert.match(html, /id="command-help"[\s\S]*Press Return to send\.[\s\S]*Up and Down Arrow to browse command history/u);
  assert.match(html, /id="command"[^>]*title="Return sends\. Up and Down Arrow browse command history\. Escape restores your draft while browsing history\."/u);
  assert.match(html, /id="command"[^>]*placeholder="Enter a NukeFire command…"/u);
});

test('connection and session controls expose concise first-use hints', () => {
  const html = source('renderer/index.html');
  for (const phrase of [
    'Server host. Press Return to connect.',
    'Server port from 1 to 65535. Press Return to connect.',
    'Connect the active session to this host and port',
    'Disconnect the active session',
    'Label the active session for crew and workspace organization',
    'Create another independent character session',
    'Close the active session'
  ]) assert.match(html, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'));
});

test('communications, affects, and Console controls explain their effect before activation', () => {
  const html = source('renderer/index.html');
  for (const id of [
    'communications-order', 'communications-search', 'communications-clear',
    'affects-text-list', 'affects-refresh', 'context-deck-refresh'
  ]) {
    assert.match(html, new RegExp(`id="${id}"[^>]*title="[^"]+"`, 'u'));
  }
  assert.match(html, /Choose whether the newest messages appear at the top or bottom/u);
  assert.match(html, /Request fresh structured affect data from NukeFire/u);
  assert.match(html, /Request fresh NukeFire Console actions from the server/u);
});

test('every docked pane menu button keeps a visible tooltip and an accessible name', () => {
  const html = source('renderer/index.html');
  const buttons = [...html.matchAll(/<button class="panel-menu-button"[\s\S]*?<\/button>/gu)];
  assert.equal(buttons.length >= 8, true);
  for (const match of buttons) {
    assert.match(match[0], /aria-label="Open [^"]+ panel menu"/u);
    assert.match(match[0], /title="[^"]+ panel options"/u);
  }
});

test('pane resize handles expose keyboard instructions through shared accessible help', () => {
  const html = source('renderer/index.html');
  const resize = source('src/panel-stack-resize.js');
  assert.match(html, /id="panel-resize-help" class="sr-only"[\s\S]*Up and Down Arrow to resize[\s\S]*Shift for larger steps[\s\S]*double-click restores automatic height/u);
  assert.match(resize, /handle\.setAttribute\('aria-describedby', 'panel-resize-help'\)/u);
  assert.match(resize, /handle\.title = 'Drag up or down to resize this pane\.[\s\S]*Arrow keys resize; Shift uses larger steps; Home\/End use safe extremes; double-click restores\.'/u);
});
