'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { LuaManagedStore, MAX_SCRIPTS } = require('../src/lua-managed-store');

const root = path.join(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function tempDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nukefire-lua-scripts-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('saved Lua scripts persist inside managed module state with bounded autorun metadata', async (t) => {
  const directory = tempDirectory(t);
  const store = new LuaManagedStore({ baseDirectory: directory });
  await store.load();

  const saved = store.setScript('alpha', 'main', 'pane = nf.pane.create("v", {title="Vitals", rows={{id="hp",type="bar",label="HP"}}})', { autoRun: true });
  assert.equal(saved.stored, true);
  assert.equal(saved.script.name, 'main');
  assert.equal(saved.script.autoRun, true);
  assert.ok(saved.script.bytes > 20);
  assert.deepEqual(store.scriptCatalog('alpha').map(({ name, autoRun }) => ({ name, autoRun })), [{ name: 'main', autoRun: true }]);
  assert.match(store.context('alpha').moduleRecords.find((entry) => entry.name === 'main').source, /nf\.pane\.create/u);
  assert.equal(store.autoRunScripts('alpha')[0].name, 'main');

  await store.flush();
  const restored = new LuaManagedStore({ baseDirectory: directory });
  await restored.load();
  assert.equal(restored.getScript('alpha', 'main').autoRun, true);
  assert.match(restored.getScript('alpha', 'main').source, /Vitals/u);

  const changed = restored.setScriptAutoRun('alpha', 'main', false);
  assert.equal(changed.stored, true);
  assert.equal(restored.autoRunScripts('alpha').length, 0);
  assert.equal(restored.context('alpha').moduleRecords.some((entry) => entry.name === 'main'), true);

  assert.equal(restored.deleteScript('alpha', 'main').deleted, true);
  assert.equal(restored.getScript('alpha', 'main'), null);
  assert.equal(restored.context('alpha').moduleRecords.some((entry) => entry.name === 'main'), false);
});

test('saved Lua scripts reject traversal, empty source, oversize source, and excessive script counts', (t) => {
  const directory = tempDirectory(t);
  const store = new LuaManagedStore({ baseDirectory: directory });
  assert.equal(store.setScript('alpha', '../escape', 'return true', { autoRun: true }).stored, false);
  assert.equal(store.setScript('alpha', 'main', '   ', { autoRun: true }).stored, false);
  assert.equal(store.setScript('alpha', 'main', 'x'.repeat(64 * 1024 + 1), { autoRun: true }).stored, false);

  for (let index = 0; index < MAX_SCRIPTS; index += 1) {
    const result = store.setScript('alpha', `script_${index}`, `return ${index}`, { autoRun: false });
    assert.equal(result.stored, true);
  }
  assert.equal(store.setScript('alpha', 'one_too_many', 'return true', { autoRun: false }).stored, false);
});

test('main-process coordinator owns script persistence and autorun while renderer only edits bounded source', () => {
  const main = source('main.js');
  const renderer = source('renderer/renderer.js');
  const help = source('src/client-command-help.js');

  assert.match(main, /handleLuaScriptCoordinatorCommand/u);
  assert.match(main, /await ensureLuaAutorunForSession\(id, 'connect'\)/u);
  assert.match(main, /reloadLuaAutorunForSession/u);
  assert.match(main, /luaLabService\.closeSession\(sessionId\)/u);
  assert.match(main, /luaPaneRegistry\.clearSession\(sessionId\)/u);
  assert.match(main, /label: 'Lua Scripts…'/u);
  assert.match(main, /luaManagedStore\?\.setScript\(sessionId, name, source, \{ autoRun \}\)/u);

  assert.match(renderer, /source\.id = 'lua-script-editor-source'/u);
  assert.match(renderer, /source\.rows = 24/u);
  assert.match(renderer, /source\.wrap = 'off'/u);
  assert.match(renderer, /encodeLuaScriptToken/u);
  assert.match(renderer, /__save/u);
  assert.match(renderer, /Save & Run/u);
  assert.match(renderer, /Reload Autorun/u);
  assert.match(renderer, /64 \* 1024/u);
  assert.doesNotMatch(renderer.slice(renderer.indexOf('function installLuaScriptEditorSurface'), renderer.indexOf('function sessionLuaPanes')), /\.innerHTML\s*=/u);

  assert.match(help, /name: 'luascript'/u);
  assert.match(help, /no filesystem path, file handle, shell, or package loader is exposed/u);
  assert.match(help, /fresh Lua VM/u);
});
