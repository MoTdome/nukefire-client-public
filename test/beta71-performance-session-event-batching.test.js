'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { createMicrotaskBatcher } = require('../src/session-event-batcher');

test('microtask event batcher preserves order and coalesces one synchronous turn', async () => {
  const delivered = [];
  const batcher = createMicrotaskBatcher((batch) => delivered.push(batch));
  batcher.enqueue({ type: 'communication-text', payload: 'gossip' });
  batcher.enqueue({ type: 'text', payload: 'visible' });
  batcher.enqueue({ type: 'boundary', payload: { type: 'ga' } });
  assert.equal(batcher.pendingCount(), 3);
  assert.equal(delivered.length, 0);
  await Promise.resolve();
  assert.equal(delivered.length, 1);
  assert.deepEqual(delivered[0].map((event) => event.type), ['communication-text', 'text', 'boundary']);
  assert.equal(batcher.pendingCount(), 0);
});


test('one mixed Telnet parser turn becomes one ordered stream-event batch', async () => {
  const { TelnetParser, TELNET } = require('../src/telnet-parser');
  const delivered = [];
  const batcher = createMicrotaskBatcher((batch) => delivered.push(batch));
  const parser = new TelnetParser({
    onData: (buffer) => batcher.enqueue({ type: 'text', payload: buffer.toString('utf8') }),
    onGmcp: (message) => batcher.enqueue({ type: 'gmcp', payload: message }),
    onPromptBoundary: (boundary) => batcher.enqueue({ type: 'boundary', payload: boundary }),
    onSend: () => {}
  });
  parser.gmcpEnabled = true;
  parser.feed(Buffer.concat([
    Buffer.from('hit\r\n', 'utf8'),
    Buffer.from([TELNET.IAC, TELNET.SB, TELNET.OPT.GMCP]),
    Buffer.from('Char.Vitals {"hp":5}', 'utf8'),
    Buffer.from([TELNET.IAC, TELNET.SE]),
    Buffer.from('prompt>', 'utf8'),
    Buffer.from([TELNET.IAC, TELNET.GA])
  ]));
  assert.equal(delivered.length, 0);
  await Promise.resolve();
  assert.equal(delivered.length, 1);
  assert.deepEqual(delivered[0].map((event) => event.type), ['text', 'gmcp', 'text', 'boundary']);
});

test('manual flush preserves channel ordering and makes stale microtask harmless', async () => {
  const delivered = [];
  const scheduled = [];
  const batcher = createMicrotaskBatcher((batch) => delivered.push(batch.map((event) => event.type)), (callback) => scheduled.push(callback));
  batcher.enqueue({ type: 'text' });
  batcher.enqueue({ type: 'gmcp' });
  assert.equal(batcher.flush(), true);
  assert.deepEqual(delivered, [['text', 'gmcp']]);
  scheduled.shift()();
  assert.deepEqual(delivered, [['text', 'gmcp']]);
  batcher.enqueue({ type: 'boundary' });
  scheduled.shift()();
  assert.deepEqual(delivered, [['text', 'gmcp'], ['boundary']]);
});

test('main batches only high-frequency stream events and flushes before immediate events or session lists', () => {
  const root = path.join(__dirname, '..');
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.match(main, /BATCHABLE_SESSION_EVENT_TYPES = new Set\(\[[\s\S]*?'text'[\s\S]*?'communication-text'[\s\S]*?'gmcp'[\s\S]*?'boundary'/u);
  assert.match(main, /sessionEventBatcher\.enqueue\(event\)/u);
  assert.match(main, /sessionEventBatcher\?\.flush\(\);[\s\S]*?sendToRenderer\('session:event', event\)/u);
  assert.match(main, /function publishSessionList\(snapshot\)[\s\S]*?sessionEventBatcher\?\.flush\(\);[\s\S]*?sendToRenderer\('session:list', snapshot\)/u);
  assert.match(main, /webContents\.send\('session:event-batch', events\)/u);
});

test('sandboxed preload expands event batches through the existing onSessionEvent callback in order', () => {
  const root = path.join(__dirname, '..');
  const preloadSource = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  const exposed = {};
  const listeners = new Map();
  const electron = {
    contextBridge: { exposeInMainWorld(name, value) { exposed[name] = value; } },
    ipcRenderer: {
      invoke: async () => ({ ok: true }),
      on(channel, listener) { listeners.set(channel, listener); },
      removeListener(channel, listener) { if (listeners.get(channel) === listener) listeners.delete(channel); }
    }
  };
  vm.runInNewContext(preloadSource, {
    require(specifier) {
      if (specifier === 'electron') return electron;
      throw new Error(`Sandboxed preload cannot require ${specifier}`);
    }
  }, { filename: 'preload.js' });

  const received = [];
  const unsubscribe = exposed.nukefire.onSessionEvent((event) => received.push(event.type));
  listeners.get('session:event-batch')({}, [
    { type: 'communication-text' },
    { type: 'text' },
    { type: 'boundary' }
  ]);
  assert.deepEqual(received, ['communication-text', 'text', 'boundary']);
  listeners.get('session:event')({}, { type: 'error' });
  assert.deepEqual(received, ['communication-text', 'text', 'boundary', 'error']);
  unsubscribe();
  assert.equal(listeners.has('session:event-batch'), false);
  assert.equal(listeners.has('session:event'), false);
});


test('sandboxed preload exposes native ordered session-event batches without breaking the legacy event bridge', () => {
  const root = path.join(__dirname, '..');
  const preloadSource = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  const exposed = {};
  const listeners = new Map();
  const electron = {
    contextBridge: { exposeInMainWorld(name, value) { exposed[name] = value; } },
    ipcRenderer: {
      invoke: async () => ({ ok: true }),
      on(channel, listener) { listeners.set(channel, listener); },
      removeListener(channel, listener) { if (listeners.get(channel) === listener) listeners.delete(channel); }
    }
  };
  vm.runInNewContext(preloadSource, {
    require(specifier) {
      if (specifier === 'electron') return electron;
      throw new Error(`Sandboxed preload cannot require ${specifier}`);
    }
  }, { filename: 'preload.js' });

  assert.equal(typeof exposed.nukefire.onSessionEventBatch, 'function');
  const received = [];
  const unsubscribe = exposed.nukefire.onSessionEventBatch((events) => received.push(events.map((event) => event.type)));
  listeners.get('session:event-batch')({}, [
    { type: 'text' },
    { type: 'gmcp' },
    { type: 'boundary' }
  ]);
  listeners.get('session:event')({}, { type: 'error' });
  assert.deepEqual(JSON.parse(JSON.stringify(received)), [['text', 'gmcp', 'boundary'], ['error']]);
  unsubscribe();
  assert.equal(listeners.has('session:event-batch'), false);
  assert.equal(listeners.has('session:event'), false);
});

test('renderer consumes native event batches and defers pure repeated UI refreshes until batch end', () => {
  const root = path.join(__dirname, '..');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  assert.match(renderer, /function handleSessionEventBatch\(events = \[\]\)[\s\S]*?runSessionEventRenderBatch/u);
  assert.match(renderer, /onSessionEventBatch\(handleSessionEventBatch\)/u);
  assert.match(renderer, /function renderVitals\(\) \{\s*if \(deferSessionEventRender\('main-vitals', renderVitals\)\) return;/u);
  assert.match(renderer, /function renderOpponentVitals\(\) \{\s*if \(deferSessionEventRender\('opponent-vitals', renderOpponentVitals\)\) return;/u);
  assert.match(renderer, /function renderGroupVitals\(\) \{\s*if \(deferSessionEventRender\('group-vitals', renderGroupVitals\)\) return;/u);
  assert.match(renderer, /function renderSessionVitals[\s\S]{0,160}?deferSessionEventRender\('session-vitals'/u);
  assert.match(renderer, /function renderGpsNavigator\(\) \{\s*if \(deferSessionEventRender\('gps-navigator', renderGpsNavigator\)\) return;/u);
  assert.match(renderer, /function renderNukeFireState\(\) \{\s*if \(deferSessionEventRender\('nukefire-state', renderNukeFireState\)\) return;/u);
});


test('renderer batch helper executes state work immediately and each pure render key once at batch end', () => {
  const root = path.join(__dirname, '..');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const start = renderer.indexOf('let sessionEventRenderBatchDepth = 0;');
  const end = renderer.indexOf('const cancelFrame =', start);
  assert.ok(start >= 0 && end > start, 'renderer batch helper block must be discoverable');
  const context = {};
  vm.runInNewContext(`${renderer.slice(start, end)}\nthis.batchApi = { deferSessionEventRender, runSessionEventRenderBatch };`, context);
  const order = [];
  context.batchApi.runSessionEventRenderBatch(() => {
    order.push('event-1');
    assert.equal(context.batchApi.deferSessionEventRender('vitals', () => order.push('vitals-old')), true);
    order.push('event-2');
    assert.equal(context.batchApi.deferSessionEventRender('vitals', () => order.push('vitals-final')), true);
    assert.equal(context.batchApi.deferSessionEventRender('gps', () => order.push('gps-final')), true);
    order.push('event-3');
  });
  assert.deepEqual(order, ['event-1', 'event-2', 'event-3', 'vitals-final', 'gps-final']);
  assert.equal(context.batchApi.deferSessionEventRender('outside', () => order.push('outside')), false);
});
