'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
const ledger = fs.readFileSync(path.join(__dirname, '..', 'docs', 'PROJECT_LEDGER.md'), 'utf8');
const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');

test('ordinary output retains the two millisecond low-latency flow window', () => {
  assert.match(renderer, /TERMINAL_IDLE_FLUSH_DELAY_MS\s*=\s*2/u);
});

test('rapid output keeps the same two millisecond latency ceiling at every burst size', () => {
  assert.match(renderer, /Every terminal burst gets the same short latency ceiling/u);
  assert.match(renderer, /if \(state\.terminalRender\.frame === null\) return;\s*flushTerminalOutput\(\);/su);
  assert.doesNotMatch(renderer, /TERMINAL_FRAME_BATCH_THRESHOLD/u);
  assert.doesNotMatch(renderer, /TERMINAL_FRAME_CHARACTER_THRESHOLD/u);
  assert.doesNotMatch(renderer, /const heavyBurst/u);
});

test('terminal flow accounting resets with every completed or abandoned paint', () => {
  const resets = renderer.match(/state\.terminalRender\.pendingCharacters\s*=\s*0;/gu) || [];
  assert.ok(resets.length >= 2);
  assert.match(renderer, /state\.terminalRender\.pendingCharacters \+= addedCharacters;/u);
});

test('historical Beta.63b3 documentation remains intact while its burst gate is superseded', () => {
  assert.match(ledger, /Beta\.63b3 Terminal Flow and Adaptive Paint/u);
  assert.match(changelog, /Beta\.63b3 — Terminal Flow and Adaptive Paint/u);
  assert.match(ledger, /No network, Telnet, GMCP\/MSDP, ANSI parsing, Reader, TinTin, mapper, session, or server behavior changes/u);
});
