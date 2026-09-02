'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { MapperGraph } = require('../src/mapper');
const { SettingsStore, DEFAULT_SETTINGS } = require('../src/settings-store');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('map persistence can rely on IPC isolation without changing serialize default snapshot semantics', () => {
  const graph = new MapperGraph();
  graph.ensureRoom({ num: 3010, name: 'One' });

  const isolated = graph.serialize();
  assert.notStrictEqual(isolated, graph.data);
  isolated.rooms['3010'].name = 'Changed only in snapshot';
  assert.equal(graph.room(3010).name, 'One');

  const ipcSource = graph.serialize({ clone: false });
  assert.strictEqual(ipcSource, graph.data);
  assert.equal(ipcSource.rooms['3010'].name, 'One');
});

test('SettingsStore can suppress the unused post-save snapshot without changing persistence', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nukefire-settings-no-return-'));
  try {
    const store = new SettingsStore({ baseDirectory: directory });
    const ordinary = await store.save(DEFAULT_SETTINGS);
    assert.ok(ordinary && typeof ordinary === 'object');

    const noReturn = await store.save({
      ...DEFAULT_SETTINGS,
      connection: { ...DEFAULT_SETTINGS.connection, host: 'responsive.example' }
    }, { returnSnapshot: false });
    assert.equal(noReturn, null);

    const restored = await new SettingsStore({ baseDirectory: directory }).load();
    assert.equal(restored.connection.host, 'responsive.example');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('ordinary routed commands do not schedule persistence unless coordinator state mutated', () => {
  const renderer = read('renderer/renderer.js');
  const start = renderer.indexOf('async function sendCommand(rawCommand, options = {})');
  const end = renderer.indexOf('\nfunction setRemoteEcho(', start);
  assert.ok(start >= 0 && end > start);
  const body = renderer.slice(start, end);

  assert.match(body, /let persistentMutation = false;/u);
  assert.match(body, /if \(result\?\.snapshot\) persistentMutation = true;/u);
  assert.match(body, /persistentMutation = Boolean\(result\?\.snapshot\);/u);
  assert.match(body, /if \(persistentMutation\) schedulePersistentSettingsSave\(\);/u);
  const routedStart = body.indexOf('if (window.nukefire.routeCommand && state.sessions.activeId)');
  const routedEnd = body.indexOf('\n  noteOutgoingCommand(', routedStart);
  assert.ok(routedStart >= 0 && routedEnd > routedStart);
  const routed = body.slice(routedStart, routedEnd);
  assert.doesNotMatch(routed, /sourceRecord\.commandDraft = showSentCommand \? command : '';\n\s*schedulePersistentSettingsSave\(\);\n\s*return;/u);
});

test('settings persistence does not force terminal presentation and map autosave skips its redundant renderer clone', () => {
  const renderer = read('renderer/renderer.js');
  assert.match(
    renderer,
    /persistentSessionsSnapshot\(\{ reuseTinTinSnapshots: true, flushOutput: false \}\)/u
  );
  assert.match(
    renderer,
    /captureActiveSessionState\(\{ flushOutput: options\.flushOutput !== false \}\)/u
  );
  assert.match(
    renderer,
    /state\.mapper\.graph\.serialize\(\{ clone: false \}\)/u
  );
});

test('Electron settings handler suppresses the SettingsStore return clone that it does not consume', () => {
  const main = read('main.js');
  assert.match(
    main,
    /settingsStore\.save\(settings, \{ returnSnapshot: false \}\)/u
  );
});
