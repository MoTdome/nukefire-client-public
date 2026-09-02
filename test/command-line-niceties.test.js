'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')
    .replace(/\r\n?/gu, '\n');
}

test('command bar exposes a compact non-destructive history position indicator', () => {
  const html = source('renderer/index.html');
  const css = source('renderer/styles.css');
  assert.match(html, /id="command-history-status"[^>]*aria-live="off"[^>]*hidden/u);
  const command = html.match(/<input id="command"[\s\S]*?>/u)?.[0] || '';
  assert.doesNotMatch(command, /aria-describedby=/u);
  assert.match(css, /grid-template-columns: max-content minmax\(0, 1fr\) max-content/u);
  assert.match(css, /\.command-history-status[\s\S]*font-size: 10px/u);
});

test('command input visibly distinguishes local, connecting, connected, and secure modes', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /function renderCommandInputContext\(connectionState/u);
  assert.match(renderer, /mode\.textContent = 'LOCAL'/u);
  assert.match(renderer, /mode\.textContent = '…'/u);
  assert.match(renderer, /mode\.textContent = '›'/u);
  assert.match(renderer, /mode\.textContent = '🔒'/u);
  assert.ok(renderer.includes('Local TinTin workspace; no server connection required'));
});

test('disconnected command guidance is concise and keeps local client work explicit', () => {
  const renderer = source('renderer/renderer.js');
  assert.ok(renderer.includes('Local workspace — aliases, Actions, ${prefix}showme, and client commands still work'));
  assert.ok(renderer.includes('Disconnected command input; local TinTin commands remain available'));
  assert.ok(renderer.includes('Enter a NukeFire command…'));
});

test('history browsing reports position and whether prefix matching is active', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /function updateCommandHistoryStatus\(\)/u);
  assert.ok(renderer.includes("History ${position}/${state.history.length}${prefixMatch ? ' · prefix' : ''}"));
  assert.ok(renderer.includes('Browsing commands that begin with your typed prefix'));
  assert.match(renderer, /updateCommandHistoryStatus\(\);/u);
});

test('Escape restores the preserved draft while history browsing, TinTin search, or completion is active', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /event\.key === 'Escape' && \(state\.historyIndex !== null \|\| state\.tintinHistorySearch\.index !== null \|\| state\.tintinCompletion\.candidates\.length\)/u);
  assert.match(renderer, /const draft = state\.tintinHistorySearch\.index !== null \? state\.tintinHistorySearch\.draft : state\.draft;[\s\S]*resetTinTinCompletion\(\);[\s\S]*resetTinTinHistorySearch\(\);[\s\S]*resetHistoryNavigation\(\);[\s\S]*commandInput\.value = draft/u);
  assert.match(renderer, /event\.key === 'Enter'[\s\S]*void sendCommand\(command\)/u);
  assert.match(renderer, /event\.key === 'ArrowUp'[\s\S]*historyUp\(\)/u);
  assert.match(renderer, /event\.key === 'ArrowDown'[\s\S]*historyDown\(\)/u);
});
