'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { LuaManagedStore } = require('../src/lua-managed-store');
const { LuaLabService } = require('../src/lua-lab-service');

class FakeRuntime {
  constructor() { this.worker = true; }
  async start() { this.worker = true; }
  async createSession(sessionId) { return { sessionId }; }
  async execute(sessionId, _script, _options, hostContext, onEvent) {
    assert.equal(hostContext.storageRecords[0].key, 'row_visibility/Cyrus');
    assert.equal(hostContext.moduleRecords[0].name, 'row_state');
    onEvent?.({ event: 'storage-set', sessionId, key: 'row_visibility/Cyrus', json: '{"level":false}' });
    onEvent?.({ event: 'module-set', sessionId, name: 'format', source: 'return { ok = true }' });
    return { ok: true, values: [] };
  }
  async closeSession() { return true; }
  async close() { this.worker = null; }
}

test('LuaManagedStore persists bounded per-session values and managed module source without exposing paths to Lua', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nukefire-lua-managed-'));
  const store = new LuaManagedStore({ baseDirectory: directory });
  assert.equal(store.setStorage('alpha', 'row_visibility/Cyrus', '{"level":true,"tnl":false}').stored, true);
  assert.equal(store.setSetting('alpha', 'manage_prompt', 'false').stored, true);
  assert.equal(store.setModule('alpha', 'row_state', 'return { hydrate = function(v) return v end }').stored, true);
  assert.equal(store.setModule('alpha', '../escape', 'return true').stored, false);
  await store.flush();

  const restored = new LuaManagedStore({ baseDirectory: directory });
  await restored.load();
  const context = restored.context('alpha');
  assert.equal(JSON.parse(context.storageRecords[0].json).level, true);
  assert.equal(JSON.parse(context.settingRecords[0].json), false);
  assert.equal(context.moduleRecords[0].name, 'row_state');
  assert.doesNotMatch(JSON.stringify(context), new RegExp(directory.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'));
});

test('LuaLabService routes managed storage/module mutations to NukeFire-owned adapters', async () => {
  const storage = [];
  const modules = [];
  const service = new LuaLabService({
    runtime: new FakeRuntime(),
    getHostContext: () => ({
      session: { id: 'alpha' }, variables: [], gmcpJson: '{}', gmcpMetaJson: '{}', msdpJson: '{}',
      storageRecords: [{ key: 'row_visibility/Cyrus', json: '{"level":true}' }],
      settingRecords: [],
      moduleRecords: [{ name: 'row_state', source: 'return {}' }]
    }),
    setStorage: (sessionId, key, json) => { const value = { sessionId, key, json, stored: true }; storage.push(value); return value; },
    setModule: (sessionId, name, source) => { const value = { sessionId, name, source, stored: true }; modules.push(value); return value; }
  });
  try {
    const result = await service.execute('alpha', 'managed');
    assert.equal(result.ok, true);
    assert.equal(storage[0].key, 'row_visibility/Cyrus');
    assert.equal(modules[0].name, 'format');
    assert.equal(result.storageChanges.length, 1);
    assert.equal(result.moduleChanges.length, 1);
  } finally { await service.close(); }
});

test('Worker exposes managed require/storage and Mallard-familiar wrappers but no gag surface or raw package/filesystem loader', () => {
  const worker = fs.readFileSync(path.join(__dirname, '..', 'src', 'lua-runtime-worker.js'), 'utf8');
  assert.match(worker, /function require\(name\)/u);
  assert.match(worker, /storage = \{/u);
  assert.match(worker, /gmcp\.on = function/u);
  assert.match(worker, /world = \{/u);
  assert.match(worker, /mud = \{/u);
  assert.match(worker, /trigger = function\(pattern, callback/u);
  assert.doesNotMatch(worker, /function\s+gag\s*\(/u);
  assert.doesNotMatch(worker, /m:gag/u);
  assert.match(worker, /io = nil/u);
  assert.match(worker, /os = nil/u);
  assert.match(worker, /package = nil/u);
});
