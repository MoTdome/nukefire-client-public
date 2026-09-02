'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const normalizeNewlines = (value) => value.replace(/\r\n?/gu, '\n');

const renderer = normalizeNewlines(
  fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8')
);
const html = normalizeNewlines(
  fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8')
);
const main = normalizeNewlines(
  fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8')
);
const xterm = normalizeNewlines(
  fs.readFileSync(path.join(__dirname, '..', 'renderer', 'xterm-adapter.js'), 'utf8')
);

test('live BIGMAP isolates authoritative rooms while offline history still uses viewport culling', () => {
  assert.match(renderer, /const liveRooms = Array\.isArray\(state\.mapper\.liveSnapshot\?\.rooms\)/u);
  assert.match(renderer, /new Set\(liveRooms\.map\(\(room\) => room\.id\)\)/u);
  assert.match(renderer, /new Set\(mapperVisitedSet\(character\)\)/u);
  assert.match(renderer, /graph\.roomsInViewport\(\{/u);
  assert.match(renderer, /maxRooms: 2500/u);
  assert.doesNotMatch(renderer, /graph\.nearby\(current\.id,\s*6\)/u);
  assert.match(html, /id="mapper-world"/u);
});

test('mouse-wheel zoom does not scroll the panel or discard deliberate pan', () => {
  assert.match(renderer, /addEventListener\('wheel',[\s\S]*event\.preventDefault\(\)/u);
  assert.match(renderer, /\{ passive: false \}/u);
  assert.match(renderer, /zoomMapper\(0, \{ zoom:/u);
  assert.match(renderer, /updateMapperView\(\{ zoom: newZoom \}, options\)/u);
  assert.match(html, /mouse wheel or plus and minus keys to zoom/u);
});

test('mapper supports bounded pointer and keyboard pan without enabling room-click travel', () => {
  assert.match(renderer, /addEventListener\('pointerdown', beginMapperPan\)/u);
  assert.match(renderer, /addEventListener\('pointermove', continueMapperPan\)/u);
  assert.match(renderer, /ArrowLeft'[\s\S]*panMapperBy/u);
  assert.match(renderer, /followPlayer: false/u);
  assert.match(html, /Drag or use the arrow keys to pan/u);
  assert.doesNotMatch(renderer, /\$\('#mapper-rooms'\)\?\.addEventListener\('click'/u);
  assert.doesNotMatch(html, /id="mapper-run-here"/u);
});

test('map persistence coalesces full snapshots and returns lightweight IPC acknowledgement', () => {
  assert.match(renderer, /saveInFlight/u);
  assert.match(renderer, /saveQueued/u);
  assert.match(renderer, /saveDirty/u);
  assert.match(renderer, /const snapshot = state\.mapper\.graph\.serialize\(\{ clone: false \}\)/u);
  assert.match(main, /await mapStore\.save\(mapData\);[\s\S]*return \{ ok: true, info: mapStore\.getInfo\(\) \}/u);
});

test('xterm-only rendering preserves immediate communications and avoids duplicate transcript reconstruction', () => {
  assert.doesNotMatch(renderer, /function scheduleCommunicationRender/u);
  assert.match(renderer, /renderCommunicationTabs\(\);\n  appendCommunicationMessage\(message, removedMessages\);/u);
  assert.match(renderer, /function appendCommunicationMessage/u);
  assert.match(renderer, /xtermAdapter\.writeRuns\(pending/u);
  assert.doesNotMatch(renderer, /appendOutputRunNode|trimRenderedOutput|textNode\.appendData/u);
  assert.match(xterm, /const output = \[\]/u);
  assert.match(xterm, /output\.join\(''\)/u);
});
