'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LongSessionMonitor,
  DEFAULT_INTERVAL_MS,
  DEFAULT_MAX_SAMPLES,
  REPORT_SAMPLE_LIMIT
} = require('../src/long-session-monitor');

function harness(options = {}) {
  let now = 1_000_000;
  let clock = 5_000;
  let callback = null;
  const monitor = new LongSessionMonitor({
    ...options,
    now: () => now,
    clock: () => clock,
    setInterval: (fn) => { callback = fn; return 17; },
    clearInterval: () => { callback = null; }
  });
  return {
    monitor,
    advance(milliseconds) { now += milliseconds; clock += milliseconds; },
    delay(milliseconds) { clock += milliseconds; },
    tick() { callback?.(); }
  };
}

test('long-session monitor is opt-in and records interval work deltas', () => {
  const h = harness();
  let domNodes = 100;
  assert.equal(h.monitor.active, false);
  assert.equal(h.monitor.start(() => ({ domNodes, openPopouts: 'map,communications' })), true);
  assert.equal(h.monitor.samples.length, 1);

  h.monitor.noteIncoming(2400, 4.5);
  h.monitor.noteTerminalFlush(8.25);
  h.monitor.notePopoutPublish('communications', 9000, 2.5);
  h.monitor.notePopoutPublish('map', 800, 0.5);
  h.monitor.notePopoutRender('communications', 12.5);
  domNodes = 125;
  h.advance(DEFAULT_INTERVAL_MS);
  h.delay(37);
  h.tick();

  const sample = h.monitor.samples.at(-1);
  assert.equal(sample.domNodes, 125);
  assert.equal(sample.incomingCharacters, 2400);
  assert.equal(sample.terminalFlushes, 1);
  assert.equal(sample.popoutPublishes, 2);
  assert.equal(sample.popout_communications_publishes, 1);
  assert.equal(sample.popout_map_publishes, 1);
  assert.equal(sample.popoutBytes, 9800);
  assert.equal(sample.popoutRenders, 1);
  assert.equal(sample.popoutRenderMs, 12.5);
  assert.equal(sample.popout_communications_render_ms, 12.5);
  assert.equal(sample.eventLoopDelayMs, 37);
});

test('sample storage and copied report stay bounded', () => {
  const h = harness({ intervalMs: 1000, maxSamples: 10 });
  h.monitor.start(() => ({ heapUsedBytes: h.monitor.samples.length * 100 }));
  for (let index = 0; index < 250; index += 1) {
    h.advance(1000);
    h.tick();
  }
  assert.equal(h.monitor.samples.length, 10);
  const report = h.monitor.report({ version: '0.3.1-beta.68' });
  assert.equal(report.maximumSamples, 10);
  assert.equal(report.retainedSamples, 10);
  assert.ok(report.samples.length <= REPORT_SAMPLE_LIMIT);
  assert.equal(report.metadata.version, '0.3.1-beta.68');
});

test('default capacity is twelve hours and stopped monitoring ignores traffic', () => {
  const h = harness();
  assert.equal(DEFAULT_MAX_SAMPLES * DEFAULT_INTERVAL_MS, 12 * 60 * 60 * 1000);
  h.monitor.start(() => ({}));
  h.monitor.stop();
  const retained = h.monitor.samples.length;
  h.monitor.noteIncoming(9999, 99);
  h.monitor.noteTerminalFlush(99);
  h.monitor.notePopoutPublish('map', 9999, 99);
  assert.equal(h.monitor.samples.length, retained);
  assert.equal(h.monitor.active, false);
});
