'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PipelineDebugBuffer,
  normalizePipelineDebugSettings,
  formatPipelineDebugEntry
} = require('../src/pipeline-debug');

test('pipeline debug is disabled by default and avoids recording work', () => {
  const buffer = new PipelineDebugBuffer();
  assert.deepEqual(buffer.status(), { enabled: false, maxEntries: 200, count: 0 });
  assert.equal(buffer.append('input', 'look'), null);
  assert.deepEqual(buffer.snapshot().entries, []);
});

test('pipeline debug keeps a bounded ordered log and normalizes controls', () => {
  const buffer = new PipelineDebugBuffer({ enabled: true, maxEntries: 50 });
  for (let index = 0; index < 55; index += 1) {
    buffer.append('send\u0000', `command ${index}\u0007`, { timestamp: index + 1 });
  }
  const snapshot = buffer.snapshot();
  assert.equal(snapshot.entries.length, 50);
  assert.equal(snapshot.entries[0].message, 'command 5');
  assert.equal(snapshot.entries.at(-1).message, 'command 54');
  assert.equal(snapshot.entries.at(-1).stage, 'send');
});

test('pipeline debug settings clamp retention and format copyable entries', () => {
  assert.deepEqual(normalizePipelineDebugSettings({ enabled: 1, maxEntries: 9999 }), {
    enabled: false,
    maxEntries: 500
  });
  assert.equal(formatPipelineDebugEntry({ stage: 'alias', message: 'k => kill goblin' }), '[alias] k => kill goblin');
});
