'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

test('terminal right-click reclaims command focus without cancelling the native context menu', () => {
  const handler = renderer.match(/function refocusCommandAfterTerminalContextMenu\(event\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(handler, /terminalOutputHost\.contains\(event\.target\)/u);
  assert.match(handler, /focusCommand\(\{ preserveSelection: true \}\)/u);
  assert.match(handler, /queueMicrotask\(reclaimCommandFocus\)/u);
  assert.match(handler, /scheduleFrame\(reclaimCommandFocus\)/u);
  assert.doesNotMatch(handler, /preventDefault|clearSelection|removeAllRanges/u);
  assert.match(renderer, /document\.addEventListener\('contextmenu', refocusCommandAfterTerminalContextMenu, true\)/u);
});

test('protected Ctrl+C copy interception runs in capture phase before xterm', () => {
  assert.match(renderer, /document\.addEventListener\('keydown', \(event\) => \{[\s\S]*?if \(key === 'c'[\s\S]*?void copyCurrentSelection\(\);[\s\S]*?\n\}, true\);/u);
});

test('copy selection keeps input, browser, and xterm fallbacks', () => {
  const selectedCopy = renderer.match(/function selectedCopyText\(\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(selectedCopy, /active\.selectionEnd > active\.selectionStart/u);
  assert.match(selectedCopy, /document\.getSelection/u);
  assert.match(selectedCopy, /xtermAdapter\?\.getSelection/u);
});
