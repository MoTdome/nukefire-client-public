'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const html = read('renderer/index.html');
const renderer = read('renderer/renderer.js');
const css = read('renderer/styles.css');
const manager = read('src/session-manager.js');

test('Preferences keeps the scale and adds an exact bounded pixel control', () => {
  assert.match(html, /id="font-size-scale"[^>]+type="range"[^>]+min="12"[^>]+max="28"/u);
  assert.match(html, /id="font-size"[^>]+type="number"[^>]+min="12"[^>]+max="28"/u);
  assert.match(html, /id="font-size-reset"/u);
  assert.match(renderer, /function normalizeTerminalFontSize/u);
  assert.match(renderer, /setFontSize\?\.\(size, \{ fit: false \}\)/u);
});

test('font changes wait for browser font metrics before one coalesced fit', () => {
  assert.match(renderer, /document\.fonts\?\.load/u);
  assert.match(renderer, /document\.fonts\?\.ready/u);
  assert.match(renderer, /request === terminalFontMetricsRequest/u);
  assert.doesNotMatch(renderer, /state\.terminalSizeFrame = scheduleFrame\(\(\) => \{[\s\S]{0,220}xtermAdapter\?\.fit/u);
});

test('terminal host keeps a safety gap above the prompt and command rows', () => {
  assert.match(css, /\.xterm-output\s*\{[\s\S]*?inset:\s*0 0 2px;/u);
  assert.match(css, /\.terminal-shell\s*\{[\s\S]*?grid-template-rows:\s*38px auto minmax\(0, 1fr\) max-content max-content;/u);
});

test('#set fontsize provides query, bounded set, and reset without Action access', () => {
  assert.match(manager, /parsed\.directive === 'set'/u);
  assert.match(manager, /set fontsize \[12-28\|reset\]/u);
  assert.match(manager, /font-size-request/u);
});
