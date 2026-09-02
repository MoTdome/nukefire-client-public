'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { LongSessionMonitor } = require('../src/long-session-monitor');

const ROOT = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(ROOT, 'renderer', 'renderer.js'), 'utf8');

test('Beta.73 Mapper instrumentation records render and save work in the existing monitor', () => {
  let now = 1000;
  let clock = 100;
  const monitor = new LongSessionMonitor({
    now: () => now,
    clock: () => clock,
    setInterval: () => 1,
    clearInterval: () => {}
  });

  assert.equal(monitor.start(() => ({})), true);

  monitor.noteMapperRender({
    durationMs: 12.5,
    visibleRooms: 120,
    visibleEdges: 175,
    roomNodesBuilt: 120,
    edgeNodesBuilt: 190,
    edgeSymbolsBuilt: 15,
    replaceChildrenCalls: 2
  });
  monitor.noteMapSave({ durationMs: 27.5, serializeMs: 4.25 });

  now += 10000;
  clock += 10000;
  const sample = monitor.sampleNow();

  assert.equal(sample.mapperRenderCount, 1);
  assert.equal(sample.mapperRenderMs, 12.5);
  assert.equal(sample.mapperRoomNodesBuilt, 120);
  assert.equal(sample.mapperEdgeNodesBuilt, 190);
  assert.equal(sample.mapperEdgeSymbolsBuilt, 15);
  assert.equal(sample.mapperReplaceChildrenCalls, 2);
  assert.equal(sample.mapperVisibleRooms, 120);
  assert.equal(sample.mapperVisibleEdges, 175);
  assert.equal(sample.mapperRenderLastMs, 12.5);
  assert.equal(sample.mapperRenderMaxMs, 12.5);

  assert.equal(sample.mapperSaveCount, 1);
  assert.equal(sample.mapperSaveMs, 27.5);
  assert.equal(sample.mapperSerializeCount, 1);
  assert.equal(sample.mapperSerializeMs, 4.25);
  assert.equal(sample.mapperSaveLastMs, 27.5);
  assert.equal(sample.mapperSaveMaxMs, 27.5);
  assert.equal(sample.mapperSerializeLastMs, 4.25);
  assert.equal(sample.mapperSerializeMaxMs, 4.25);
});

test('Beta.73 Mapper measurement keeps the current rebuild renderer intact', () => {
  assert.match(renderer, /edgeLayer\.replaceChildren\(edgeFragment\);/u);
  assert.match(renderer, /roomLayer\.replaceChildren\(roomFragment\);/u);
  assert.match(renderer, /noteMapperRender\?\.\(\{/u);
  assert.match(renderer, /noteMapSave\?\.\(\{/u);
  assert.match(renderer, /mapperEdgeSymbolsBuilt/u);
  assert.match(renderer, /state\.mapper\.graph\.serialize\(\{ clone: false \}\)/u);
});

test('Beta.73 Mapper timing is gated by the opt-in Long Session Monitor', () => {
  assert.match(renderer, /const mapperRenderMetricsActive = longSessionMonitor\?\.active === true;/u);
  assert.match(renderer, /const mapperSaveMetricsActive = longSessionMonitor\?\.active === true;/u);
  assert.match(renderer, /mapperRenderMetricsActive \? performance\.now\(\) : 0/u);
  assert.match(renderer, /mapperSaveMetricsActive \? performance\.now\(\) : 0/u);
  assert.match(renderer, /longSessionMonitor\?\.noteMapperRender\?\.\(\{/u);
  assert.match(renderer, /longSessionMonitor\?\.noteMapSave\?\.\(\{/u);
});
