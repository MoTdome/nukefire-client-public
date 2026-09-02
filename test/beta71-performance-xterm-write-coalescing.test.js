'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { XtermTerminalAdapter } = require('../renderer/xterm-adapter');

const root = path.resolve(__dirname, '..');

class DeferredTerminal {
  constructor(options = {}) {
    this.options = { ...options };
    this.cols = 100;
    this.rows = 40;
    this.writes = [];
    this.callbacks = [];
    this.events = [];
    this.scrolls = 0;
    this.buffer = { active: { viewportY: 0, baseY: 0 } };
  }
  open() {}
  onScroll() { return { dispose() {} }; }
  write(data, callback) {
    this.writes.push(String(data));
    this.events.push(`write:${this.writes.length}`);
    this.callbacks.push(callback);
  }
  reset() { this.events.push('reset'); }
  clear() { this.events.push('clear'); }
  scrollToBottom() { this.scrolls += 1; }
}

function drain(terminal) {
  while (terminal.callbacks.length) {
    const callback = terminal.callbacks.shift();
    callback?.();
  }
}

test('busy xterm coalesces queued writes but preserves text, callbacks, and follow intent', () => {
  const callbacks = [];
  const adapter = new XtermTerminalAdapter({ container: {}, TerminalCtor: DeferredTerminal });

  adapter.writeAnsi('A', { onWritten: () => callbacks.push('A') });
  adapter.writeAnsi('B', { onWritten: () => callbacks.push('B') });
  adapter.writeAnsi('C', { follow: true, onWritten: () => callbacks.push('C') });

  assert.equal(adapter.terminal.writes.length, 1, 'only the active write reaches xterm immediately');
  const queued = adapter.writePerformanceSnapshot();
  assert.equal(queued.queuedOperations, 2);
  assert.equal(queued.coalescedOperations, 1);
  assert.ok(queued.pendingCharacters >= 3);

  drain(adapter.terminal);

  assert.equal(adapter.terminal.writes.length, 2, 'B and C share one queued xterm parse');
  assert.match(adapter.terminal.writes.join(''), /ABC/u);
  assert.deepEqual(callbacks, ['A', 'B', 'C']);
  assert.equal(adapter.terminal.scrolls, 1, 'follow intent survives the coalesced batch');
  const done = adapter.writePerformanceSnapshot();
  assert.equal(done.pendingCharacters, 0);
  assert.equal(done.queuedOperations, 0);
  assert.equal(done.completedOperations, 2);
  assert.ok(done.lastLatencyMs >= 0);
  assert.ok(done.maxLatencyMs >= done.lastLatencyMs || done.maxLatencyMs >= 0);
});

test('replaceRuns remains a hard ordering barrier between old and new session output', () => {
  const adapter = new XtermTerminalAdapter({ container: {}, TerminalCtor: DeferredTerminal });

  adapter.writeAnsi('old-live');
  adapter.writeAnsi('old-queued');
  adapter.replaceRuns([{ text: 'new-session', style: null }]);
  adapter.writeAnsi('new-live');

  assert.equal(adapter.terminal.writes.length, 1);
  adapter.terminal.callbacks.shift()();
  assert.equal(adapter.terminal.writes.length, 2);
  assert.match(adapter.terminal.writes[1], /old-queued/u);

  adapter.terminal.callbacks.shift()();
  assert.deepEqual(adapter.terminal.events.slice(0, 5), [
    'write:1', 'write:2', 'reset', 'clear', 'write:3'
  ]);
  assert.match(adapter.terminal.writes[2], /new-session/u);

  adapter.terminal.callbacks.shift()();
  assert.equal(adapter.terminal.writes.length, 4);
  assert.match(adapter.terminal.writes[3], /new-live/u);
  adapter.terminal.callbacks.shift()();
  assert.equal(adapter.writePerformanceSnapshot().queuedOperations, 0);
});

test('coalescing caps queued payload size instead of creating an unbounded giant write', () => {
  const adapter = new XtermTerminalAdapter({ container: {}, TerminalCtor: DeferredTerminal });
  const block = 'x'.repeat(70_000);

  adapter.writeAnsi('active');
  for (let index = 0; index < 8; index += 1) adapter.writeAnsi(block);

  const queued = adapter.writePerformanceSnapshot();
  assert.ok(queued.queuedOperations >= 3, '256 KiB cap should create more than one queued batch');
  drain(adapter.terminal);
  assert.ok(adapter.terminal.writes.length >= 3);
  assert.equal(adapter.writePerformanceSnapshot().pendingCharacters, 0);
});


test('Performance Pass 2 preserves Beta.71 no-refit font updates', () => {
  const adapter = new XtermTerminalAdapter({ container: {}, TerminalCtor: DeferredTerminal });
  let fits = 0;
  adapter.fit = () => { fits += 1; return true; };

  adapter.setFontSize(19, { fit: false });
  adapter.setFontFamily('NukeFire Test Mono', 'standard', { fit: false });
  assert.equal(fits, 0, 'fit:false must keep the Beta.71 geometry batching behavior');

  adapter.setFontSize(20);
  adapter.setFontFamily('NukeFire Test Mono 2', 'standard');
  assert.equal(fits, 2, 'ordinary typography updates still fit by default');
});
