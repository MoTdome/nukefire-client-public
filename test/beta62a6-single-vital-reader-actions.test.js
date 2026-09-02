'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(ROOT, 'renderer/renderer.js'), 'utf8');
const presets = fs.readFileSync(path.join(ROOT, 'src/reader-presets.js'), 'utf8');
const combatVitals = require('../src/combat-vitals');

test('quick vital speech follows Southpaw-style one-stat percentage review without extra machinery narration', () => {
  assert.equal(combatVitals.formatVitalSpeech('Health', 749, 1000), 'Health 74 percent.');
  assert.equal(combatVitals.formatVitalSpeech('Mana', 19, 100), 'Mana 19 percent.');
  assert.equal(combatVitals.formatVitalSpeech('Movement', 5, 100), 'Movement 5 percent.');
  assert.equal(combatVitals.formatVitalSpeech('Health', null, 1000), 'Health unknown.');
  assert.equal(combatVitals.formatVitalSpeech('Mana', 1234, null), 'Mana 1,234.');
});

test('keybinding picker exposes separate Read Health, Read Mana, and Read Movement semantic actions', () => {
  assert.match(renderer, /id: 'read-health', label: 'Read Health'/u);
  assert.match(renderer, /id: 'read-mana', label: 'Read Mana'/u);
  assert.match(renderer, /id: 'read-movement', label: 'Read Movement'/u);
});

test('single-vital semantic actions dispatch locally through the shared reader announcement path', () => {
  assert.match(renderer, /id === 'read-health'[\s\S]*?readSingleVital\('health'\)/u);
  assert.match(renderer, /id === 'read-mana'[\s\S]*?readSingleVital\('mana'\)/u);
  assert.match(renderer, /id === 'read-movement'[\s\S]*?readSingleVital\('movement'\)/u);
  assert.match(renderer, /function readSingleVital\(kind\) \{\s*announce\(singleVitalSummary\(kind\), \{ force: true \}\);\s*\}/u);
});

test('single-vital review remains local and does not synthesize commands or server output', () => {
  const start = renderer.indexOf("function singleVitalSummary(kindValue)");
  const end = renderer.indexOf("function audioCueAvailable()", start);
  assert.ok(start >= 0 && end > start);
  const block = renderer.slice(start, end);
  assert.doesNotMatch(block, /sendCommand|Simulate|appendMudText|NukeFire\.Controls/u);
});

test('single-vital keys remain choices while the explicit MUSH preset may use Alt-H for combined vitals', () => {
  assert.doesNotMatch(presets, /read-health/u);
  assert.doesNotMatch(presets, /read-mana/u);
  assert.doesNotMatch(presets, /read-movement/u);
  const defaultStart = presets.indexOf('const READER_HOTKEY_PRESET =');
  const defaultEnd = presets.indexOf('\n  function officialShortcutRecords', defaultStart);
  const defaultPreset = presets.slice(defaultStart, defaultEnd);
  assert.doesNotMatch(defaultPreset, /Alt\+H|Alt\+M|Alt\+V/u);
  assert.match(presets, /reader-mush-vitals[^\n]*label: 'Alt\+H'[^\n]*id: 'read-vitals'/u);
  assert.doesNotMatch(presets, /label: 'Alt\+M'|label: 'Alt\+V'/u);
});
