'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const readerReviewApi = require('../src/reader-review');
const readerHistoryApi = require('../src/reader-history');
const sessionRuntimeApi = require('../src/session-runtime');
const { XtermTerminalAdapter } = require('../renderer/xterm-adapter');

const root = path.resolve(__dirname, '..');

test('large session transcript reclaims a block instead of copying its full cap per packet', () => {
  const runtime = sessionRuntimeApi.createSessionRuntime({ id: 'long' }, {
    ansiApi: { AnsiParser: class { parse(text) { return [{ text, style: null }]; } } },
    maxCharacters: 100_000
  });
  sessionRuntimeApi.appendText(runtime, 'x'.repeat(100_001), { stripAnsi: String });
  assert.equal(runtime.plainText.length, 87_500);
  assert.equal(runtime.outputCharacters, 87_500);
  sessionRuntimeApi.appendText(runtime, 'y'.repeat(1000), { stripAnsi: String });
  assert.equal(runtime.plainText.length, 88_500);
});

test('large Reader Review and categorized Reader History trim to a low-water mark', () => {
  const review = new readerReviewApi.ReaderReviewBuffer({ maxLines: 1000, maxCharacters: 1_000_000 });
  for (let index = 0; index <= 1000; index += 1) review.appendLine(`line ${index}`);
  assert.equal(review.snapshot().length, 875);

  const history = new readerHistoryApi.ReaderHistory({ maxEntriesPerCategory: 1000, maxCharactersPerCategory: 1_000_000 });
  for (let index = 0; index <= 1000; index += 1) history.append('main', `line ${index}`);
  assert.equal(history.categoryStatus('main').count, 875);
});

test('xterm backlog drains by cursor and coalesces queued writes without crossing the active write', () => {
  class DeferredTerminal {
    constructor() {
      this.options = {};
      this.callbacks = [];
      this.writes = [];
      this.buffer = { active: { viewportY: 0, baseY: 0 } };
    }
    open() {}
    write(data, callback) { this.writes.push(data); this.callbacks.push(callback); }
    onScroll() { return { dispose() {} }; }
  }
  const adapter = new XtermTerminalAdapter({ container: {}, TerminalCtor: DeferredTerminal });
  for (let index = 0; index < 200; index += 1) adapter.writeAnsi(`${index}\n`);

  const queued = adapter.writePerformanceSnapshot();
  assert.equal(adapter.terminal.writes.length, 1);
  assert.equal(queued.queuedOperations, 2);
  assert.equal(queued.coalescedOperations, 198);
  assert.ok(queued.pendingCharacters > 0);

  while (adapter.terminal.callbacks.length) adapter.terminal.callbacks.shift()();
  assert.equal(adapter.terminal.writes.length, 2);
  assert.match(adapter.terminal.writes.join(''), /0\n/u);
  assert.match(adapter.terminal.writes.join(''), /199\n/u);
  assert.equal(adapter.writePerformanceSnapshot().pendingCharacters, 0);
  assert.equal(adapter.operationQueue.length, 0);
  assert.equal(adapter.operationHead, 0);
});

test('active renderer transcript uses the same amortized high-water policy', () => {
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  assert.match(renderer, /const HISTORY_LOW_WATER_RATIO = 0\.875/u);
  assert.match(renderer, /state\.plainText = state\.plainText\.slice\(-retain\)/u);
});
