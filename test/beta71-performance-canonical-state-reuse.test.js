'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('Affects countdown timing no longer normalizes the complete snapshot per effect', () => {
  const source = read('src/affects.js');
  const start = source.indexOf('function estimatedServerNowMs');
  const end = source.indexOf('\n  function remainingSeconds', start);
  assert.ok(start >= 0 && end > start);
  const body = source.slice(start, end);
  assert.match(body, /source\.server_time \?\? source\.serverTime/u);
  assert.doesNotMatch(body, /normalizeAffectsState/u);
});

test('renderer reuses canonical panel snapshots instead of normalizing them during render loops', () => {
  const renderer = read('renderer/renderer.js');
  assert.match(renderer, /const snapshot = state\.affects\.snapshot;[\s\S]*?groupEffects\(snapshot, \{ normalized: true \}\)/u);
  assert.match(renderer, /snapshotSignature\(normalized, \{ normalized: true \}\)/u);
  assert.match(renderer, /const snapshot = state\.mobInspector\.snapshot;/u);
  assert.match(renderer, /mobInspectorApi\.category\(snapshot, \{ normalized: true \}\)/u);
  assert.match(renderer, /mobInspectorApi\.descriptorLabels\(snapshot, \{ normalized: true \}\)/u);
  assert.match(renderer, /const snapshot = state\.contextDeck\.snapshot;/u);
  assert.match(renderer, /primaryContext\(state\.contextDeck\.snapshot, \{ normalized: true \}\)/u);
});
