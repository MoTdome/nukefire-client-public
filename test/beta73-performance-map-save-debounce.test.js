'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

function persistenceSource() {
  const start = renderer.indexOf('const MAPPER_SAVE_DEBOUNCE_MS = 350;');
  const end = renderer.indexOf('\n\nfunction gpsCatalog()', start);
  assert.ok(start >= 0, 'Mapper save debounce constants must exist');
  assert.ok(end > start, 'Mapper persistence section must end before gpsCatalog');
  return renderer.slice(start, end);
}

function createHarness() {
  const source = persistenceSource();
  let now = 1000;
  let timerId = 0;
  const timers = new Map();
  let saveCalls = 0;
  let pendingSaveResolve = null;

  const state = {
    mapper: {
      ready: true,
      graph: {
        serialize(options) {
          // options is created inside the vm context, so compare the contract
          // rather than cross-realm object prototypes.
          assert.equal(options?.clone, false);
          return { schema: 1 };
        }
      },
      saveDirty: false,
      saveInFlight: false,
      saveQueued: false,
      saveTimer: null,
      saveDirtySinceMs: 0,
      saveDirtyLastMs: 0
    }
  };

  const context = {
    state,
    window: {
      nukefire: {
        saveMap() {
          saveCalls += 1;
          return new Promise((resolve) => {
            pendingSaveResolve = resolve;
          });
        }
      }
    },
    longSessionMonitor: null,
    performance: { now: () => now },
    Date: { now: () => now },
    clearTimeout(id) {
      timers.delete(id);
    },
    setTimeout(callback, delay) {
      const id = ++timerId;
      timers.set(id, { callback, delay, due: now + delay });
      return id;
    },
    appendSystemMessage() {},
    console
  };

  vm.createContext(context);
  vm.runInContext(
    `${source}\n;globalThis.__mapSave = { scheduleMapSave, schedulePendingMapSave, flushMapSave };`,
    context
  );

  return {
    context,
    state,
    timers,
    api: context.__mapSave,
    now: () => now,
    setNow(value) { now = value; },
    saveCalls: () => saveCalls,
    resolveSave() {
      assert.equal(typeof pendingSaveResolve, 'function', 'a save must be pending');
      const resolve = pendingSaveResolve;
      pendingSaveResolve = null;
      resolve();
    },
    onlyTimer() {
      assert.equal(timers.size, 1, `expected exactly one timer, found ${timers.size}`);
      return [...timers.values()][0];
    }
  };
}

test('Mapper persistence keeps a 350 ms quiet debounce bounded by a 2 second dirty deadline', () => {
  const h = createHarness();

  h.api.scheduleMapSave();
  assert.equal(h.onlyTimer().delay, 350);
  assert.equal(h.state.mapper.saveDirtySinceMs, 1000);
  assert.equal(h.state.mapper.saveDirtyLastMs, 1000);

  h.setNow(1200);
  h.api.scheduleMapSave();
  assert.equal(h.onlyTimer().delay, 350);
  assert.equal(h.state.mapper.saveDirtySinceMs, 1000);
  assert.equal(h.state.mapper.saveDirtyLastMs, 1200);

  h.setNow(2600);
  h.api.scheduleMapSave();
  assert.equal(h.onlyTimer().delay, 350);

  h.setNow(2900);
  h.api.scheduleMapSave();
  assert.equal(h.onlyTimer().delay, 100);

  h.setNow(3000);
  h.api.scheduleMapSave();
  assert.equal(h.onlyTimer().delay, 0);
  assert.equal(h.onlyTimer().due, 3000);
});

test('changes during an in-flight save schedule a normal quiet follow-up instead of a zero-delay save chain', async () => {
  const h = createHarness();

  h.api.scheduleMapSave();
  h.setNow(1350);
  const first = h.onlyTimer();
  h.timers.clear();
  first.callback();
  await Promise.resolve();

  assert.equal(h.saveCalls(), 1);
  assert.equal(h.state.mapper.saveInFlight, true);
  assert.equal(h.state.mapper.saveDirty, false);

  h.setNow(1375);
  h.api.scheduleMapSave();
  assert.equal(h.state.mapper.saveDirty, true);
  assert.equal(h.state.mapper.saveQueued, true);
  assert.equal(h.timers.size, 0, 'in-flight changes must not create competing timers');

  h.resolveSave();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(h.state.mapper.saveInFlight, false);
  assert.equal(h.state.mapper.saveQueued, false);
  assert.equal(h.onlyTimer().delay, 350);
  assert.equal(h.onlyTimer().due, 1725);
});

test('production source preserves no-clone serialization and Mapper instrumentation while removing the old zero-delay chain', () => {
  const source = persistenceSource();

  assert.match(source, /const MAPPER_SAVE_DEBOUNCE_MS = 350;/u);
  assert.match(source, /const MAPPER_SAVE_MAX_DIRTY_MS = 2000;/u);
  assert.match(source, /const dueMs = Math\.min\(quietDueMs, maximumDueMs\);/u);
  assert.match(source, /state\.mapper\.graph\.serialize\(\{ clone: false \}\)/u);
  assert.match(source, /longSessionMonitor\?\.noteMapSave\?\.\(\{/u);
  assert.match(source, /schedulePendingMapSave\(\);/u);
  assert.doesNotMatch(
    source,
    /saveQueued \|\| state\.mapper\.saveDirty[\s\S]*setTimeout\([\s\S]*,\s*0\);/u
  );
});
