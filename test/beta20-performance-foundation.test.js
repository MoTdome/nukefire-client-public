'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function normalizeNewlines(value) {
  return value.replace(/\r\n?/gu, '\n');
}

function source(file) {
  return normalizeNewlines(
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
  );
}

const connection = source('src/connection-manager.js');
const gmcpStore = source('src/gmcp-store.js');
const runtime = source('src/session-runtime.js');
const mapper = source('src/mapper.js');
const renderer = source('renderer/renderer.js');
const main = source('main.js');

 test('live GMCP uses compact path events while preserving reconstructable state', () => {
  assert.match(connection, /new GmcpStore\(\{ includeStateInEvents: false \}\)/u);
  assert.match(gmcpStore, /function applyEventPatch/u);
  assert.match(renderer, /gmcpSnapshotFromEvent/u);
  assert.match(renderer, /gmcpStoreApi\.applyEventPatch/u);
  assert.match(renderer, /packageName === 'Room\.Info'/u);
  assert.match(renderer, /direct Char\.Vitals compatibility path/u);
  assert.match(renderer, /applyGmcpState\(directSnapshot, \{ packageName: 'Char\.Vitals'/u);
});

test('terminal processing reuses plain text and suppresses duplicate protocol work', () => {
  assert.match(runtime, /options\.plainText/u);
  assert.match(runtime, /function countNewlines/u);
  assert.match(renderer, /useTransformedPlainText: true/u);
  assert.match(renderer, /xtermAdapter\.size\(\)/u);
  assert.match(renderer, /return state\.protocol\.windowSize \|\| \{ width: 80, height: 24 \}/u);
  assert.doesNotMatch(renderer, /terminalCellMetrics/u);
  assert.match(connection, /nextWidth === this\.terminalSize\.width/u);
  assert.match(connection, /nextScreenReaderMode !== this\.preferences\.screenReaderMode/u);
});

test('communications arrivals remain immediate but avoid full panel reconstruction', () => {
  assert.doesNotMatch(renderer, /function scheduleCommunicationRender/u);
  assert.match(renderer, /renderCommunicationTabs\(\);\n  appendCommunicationMessage\(message, removedMessages\);/u);
  assert.match(renderer, /communicationStyledRunsCache/u);
});

test('mapper viewport and persistence work use maintained indexes and light acknowledgements', () => {
  assert.match(mapper, /_spatialBuckets/u);
  assert.match(mapper, /_visitedSets/u);
  assert.match(mapper, /SPATIAL_BUCKET_SIZE/u);
  assert.match(renderer, /settingsSaveInFlight/u);
  assert.match(renderer, /saveInFlight/u);
  assert.match(main, /await mapStore\.save\(mapData\);[\s\S]*return \{ ok: true, info:/u);
  assert.match(main, /await settingsStore\.save\(settings, \{ returnSnapshot: false \}\);[\s\S]*return \{[\s\S]*ok: true,[\s\S]*info:/u);
});
