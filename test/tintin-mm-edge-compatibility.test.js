'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { SessionManager } = require('../src/session-manager');
const { parseConditionalStatement } = require('../src/conditional-engine');
const { LogStore } = require('../src/log-store');
const { clientCommandHelp } = require('../src/client-command-help');
const audit = require('../src/tintin-compatibility-audit');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.sent = []; this.status = 'disconnected'; this.preferences = {}; }
  async connect(host, port) { this.status = 'connected'; this.handlers.onStatus?.({ state: 'connected', host, port, message: 'connected' }); }
  disconnect(message = 'Disconnected') { this.status = 'disconnected'; this.handlers.onStatus?.({ state: 'disconnected', message }); }
  sendCommand(command) { if (this.status !== 'connected') return false; this.sent.push(command); return true; }
  sendGmcp() { return true; }
  setTerminalSize() { return true; }
  setClientPreferences(preferences) { this.preferences = { ...this.preferences, ...preferences }; return { ...this.preferences }; }
}

function makeManager(options = {}) {
  const events = [];
  const handlers = {
    onEvent: (event) => events.push(event),
    ...(options.handlers || {})
  };
  const manager = new SessionManager({
    ...options,
    handlers,
    connectionFactory: (connectionHandlers) => new FakeConnection(connectionHandlers),
    queueOptions: { intervalMs: 0 }
  });
  const session = manager.createSession({ name: 'MM' });
  return { manager, session, events };
}

test('ELSE IF veteran chaining preserves the nested conditional as one bounded branch', () => {
  const parsed = parseConditionalStatement('#else #if {1} {#show {yes}}');
  assert.equal(parsed.matched, true);
  assert.equal(parsed.directive, 'else');
  assert.equal(parsed.commands, '#if {1} {#show {yes}}');
  assert.equal(parsed.error, '');
});

test('runtime ELSE IF chaining selects only the nested true branch', () => {
  const { manager, session } = makeManager();
  manager.dispatchInput(session.id, '#if {0} {#var {chosen} {bad}};#else #if {1} {#var {chosen} {good}}');
  assert.equal(manager.sessions.get(session.id).tintin.variableEngine.get('chosen')?.value, 'good');
});

test('dynamic directive expansion is limited to bounded numeric repeat shorthand', async () => {
  const { manager, session } = makeManager();
  await manager.connectSession(session.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(session.id, '#variable {cnt} {3}');
  manager.dispatchInput(session.id, '#$cnt #send {x}');
  assert.deepEqual(manager.sessions.get(session.id).connection.sent, ['x', 'x', 'x']);
});

test('nonnumeric dynamic client directives fail locally instead of becoming arbitrary commands', async () => {
  const { manager, session } = makeManager();
  await manager.connectSession(session.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(session.id, '#variable {cnt} {system}');
  const result = manager.dispatchInput(session.id, '#$cnt {echo nope}');
  assert.deepEqual(manager.sessions.get(session.id).connection.sent, []);
  assert.match(result.messages.join('\n'), /must resolve to a bounded numeric repeat count/u);
});

test('LINE GAG hides the next server line while Actions still process the original line', async () => {
  const { manager, session, events } = makeManager();
  await manager.connectSession(session.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(session.id, '#action {^Hidden$} {#variable {saw_hidden} {yes}}');
  manager.dispatchInput(session.id, '#line gag');
  manager.sessions.get(session.id).connection.handlers.onText('Hidden\n');
  assert.equal(manager.sessions.get(session.id).tintin.variableEngine.get('saw_hidden')?.value, 'yes');
  assert.equal(events.filter((entry) => entry.type === 'text' && String(entry.payload).includes('Hidden')).length, 0);
  assert.equal(events.some((entry) => entry.type === 'communication-text' && String(entry.payload).includes('Hidden')), true);
});

test('LINE GAG amount suppresses exactly the requested bounded number of complete server lines', async () => {
  const { manager, session, events } = makeManager();
  await manager.connectSession(session.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(session.id, '#line gag 2');
  const connection = manager.sessions.get(session.id).connection;
  connection.handlers.onText('one\n');
  connection.handlers.onText('two\n');
  connection.handlers.onText('three\n');
  const visible = events.filter((entry) => entry.type === 'text').map((entry) => String(entry.payload)).join('');
  assert.doesNotMatch(visible, /one|two/u);
  assert.match(visible, /three/u);
});

test('LOG OVERWRITE safely truncates one confined regular file and serializes later appends', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nukefire-log-overwrite-'));
  try {
    const store = new LogStore({ documentsDirectory: root });
    await store.ensureDirectory();
    const target = path.join(store.directory, 'bells.txt');
    await fs.writeFile(target, 'old-data\n', 'utf8');
    const overwrite = store.overwrite('bells.txt');
    const append = store.append('bells.txt', 'new-data\n');
    assert.equal((await overwrite).ok, true);
    assert.equal((await append).ok, true);
    assert.equal(await fs.readFile(target, 'utf8'), 'new-data\n');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('LOG OVERWRITE rejects traversal and symlink targets without touching their destinations', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nukefire-log-overwrite-safe-'));
  try {
    const store = new LogStore({ documentsDirectory: root });
    await store.ensureDirectory();
    assert.equal((await store.overwrite('../escape.log')).ok, false);
    const outside = path.join(root, 'outside.txt');
    await fs.writeFile(outside, 'keep', 'utf8');
    const link = path.join(store.directory, 'linked.log');
    await fs.symlink(outside, link);
    assert.equal((await store.overwrite('linked.log')).ok, false);
    assert.equal(await fs.readFile(outside, 'utf8'), 'keep');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('MM edge audit recognizes supported dynamic repeat, ELSE IF, LOG OVERWRITE, and LINE GAG while leaving unknowns visible', () => {
  const source = [
    '#variable {cnt} {2}',
    '#$cnt #send {x}',
    '#if {0} {#show {bad}};#else #if {1} {#show {good}}',
    '#log overwrite bells.txt',
    '#line gag',
    '#if $cantpick == 1',
    '#say boarding',
    '#tba'
  ].join('\n');
  const result = audit.auditTinTinSource(source, { filename: 'mm-sanitized.tin' });
  const needs = result.entries.filter((entry) => entry.classification === audit.CLASSIFICATIONS.NEEDS);
  assert.deepEqual(needs.map((entry) => entry.directive).sort(), ['say', 'tba']);
});

test('client help documents confined LOG OVERWRITE and LINE GAG compatibility', () => {
  assert.match(clientCommandHelp('log', '#').join('\n'), /#log overwrite \{filename\}/u);
  assert.ok(clientCommandHelp('log', '#').join('\n').includes('Documents/NukeFire Client/Logs'));
  assert.match(clientCommandHelp('line', '#').join('\n'), /#line gag \[amount\]/u);
});
