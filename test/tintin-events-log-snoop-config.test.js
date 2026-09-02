'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { SessionManager } = require('../src/session-manager');
const { EventEngine } = require('../src/event-engine');
const { LogStore, normalizeLogFilename } = require('../src/log-store');
const { prepareTinTinRead } = require('../src/tintin-script-loader');
const { prepareTinTinWrite } = require('../src/tintin-script-writer');
const { clientCommandHelp } = require('../src/client-command-help');

class FakeConnection {
  constructor(handlers = {}) { this.handlers = handlers; this.sent = []; }
  connect(host, port) { this.handlers.onStatus?.({ state: 'connected', host, port }); return Promise.resolve(); }
  disconnect(message = 'Disconnected') { this.handlers.onStatus?.({ state: 'disconnected', message }); }
  sendCommand(command) { this.sent.push(command); return true; }
  setTerminalSize() {}
  setClientPreferences() {}
}

function managerHarness(options = {}) {
  const events = [];
  const logWrites = [];
  const timers = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    tickerSetTimer: options.tickerSetTimer || ((fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; }),
    tickerClearTimer: () => {},
    handlers: {
      onEvent: (event) => events.push(event),
      onSessionsChanged: () => {},
      onLogAppend: options.onLogAppend || ((request) => { logWrites.push(request); return Promise.resolve({ ok: true }); })
    }
  });
  return { manager, events, logWrites, timers };
}

test('EventEngine stores one bounded command per normalized TinTin event name', () => {
  const engine = new EventEngine();
  assert.equal(engine.define('session connected', '#showme hi').name, 'SESSION CONNECTED');
  assert.equal(engine.define('SESSION CONNECTED', '#showme newer').command, '#showme newer');
  assert.equal(engine.list().length, 1);
  assert.equal(engine.define('bad/event', 'x'), null);
  assert.equal(engine.define('SESSION DISCONNECTED', '#showme bye').name, 'SESSION DISCONNECTED');
});

test('loader imports Events, safe Config values, Pathdir metadata, and safe runtime Log commands', () => {
  const result = prepareTinTinRead([
    '#config {Speedwalk} {on}',
    '#config {LOG MODE} {RAW}',
    '#config {SCREEN READER} {OFF}',
    '#event {SESSION CONNECTED} {#var {session[name]} {%0}}',
    '#event {IAC WILL GMCP}',
    '#event {SESSION DISCONNECTED} {#showme bye}',
    '#pathdir {n} {s} {1}',
    '#log append hero.log'
  ].join('\n'), {});
  assert.equal(result.ok, true);
  assert.equal(result.counts.events, 2);
  assert.equal(result.definitions.speedwalk.enabled, true);
  assert.equal(result.definitions.config.logMode, 'raw');
  assert.equal(result.runtimeCommands.length, 2);
  assert.equal(result.runtimeCommands[0].command, '#pathdir {n} {s} {1}');
  assert.equal(result.runtimeCommands[1].command, '#log append hero.log');
  assert.equal(result.runtimeCommands[0].persistOnImport, true);
  assert.equal(result.compatibilityNoops.some((entry) => entry.directive === 'event-query'), true);
  assert.equal(result.unsupportedCounts.event || 0, 0);
  assert.equal(prepareTinTinRead('#juki #event {SECOND}', {}).ok, false);
  assert.equal(result.compatibilityNoops.some((entry) => entry.directive === 'config'), true);
});

test('SESSION ACTIVATED fires privately without switching or leaking another session variables', () => {
  const { manager } = managerHarness();
  const a = manager.createSession({ name: 'A' });
  const b = manager.createSession({ name: 'B' });
  manager.dispatchInput(a.id, '#event {SESSION ACTIVATED} {#var {activated} {%0}}');
  manager.setActiveSession(b.id);
  manager.setActiveSession(a.id);
  assert.equal(manager.withTinTinSession(a.id, () => manager.variableEngine.get('activated')?.value), 'A');
  assert.equal(manager.withTinTinSession(b.id, () => manager.variableEngine.get('activated')), null);
});

test('SESSION CONNECTED fires after connection and can assign/read/log with the veteran session-name context', async () => {
  const { manager, events } = managerHarness();
  const hero = manager.createSession({ name: 'Hero' });
  manager.dispatchInput(hero.id, '#alias {startlog} {#log append $session.log}');
  manager.dispatchInput(hero.id, '#event {SESSION CONNECTED} {#var {session[name]} {%0};#read {$session[name].tin};startlog}');
  await manager.connectSession(hero.id, { host: 'mud.test', port: 4000 });
  assert.equal(manager.withTinTinSession(hero.id, () => manager.variableEngine.get('session[name]')?.value), 'Hero');
  assert.equal(events.some((event) => event.sessionId === hero.id && event.type === 'script-read-request' && event.payload?.requested === 'Hero.tin'), true);
  assert.equal(manager.sessions.get(hero.id).logging.filename, 'Hero.log');
});

test('SECOND uses one bounded session timer and stops when the Event is removed', () => {
  const { manager, timers } = managerHarness();
  const hero = manager.createSession({ name: 'Hero' });
  manager.dispatchInput(hero.id, '#var {ticks} {0}');
  manager.dispatchInput(hero.id, '#event {SECOND} {#math {ticks} {$ticks + 1}}');
  assert.equal(timers.length >= 1, true);
  timers.at(-1).fn();
  assert.equal(manager.withTinTinSession(hero.id, () => manager.variableEngine.get('ticks')?.value), '1');
  manager.dispatchInput(hero.id, '#unevent {SECOND}');
  assert.equal(manager.withTinTinSession(hero.id, () => manager.eventEngine.get('SECOND')), null);
});

test('IAC WILL GMCP Event fires only for enabled telnet option 201', () => {
  const { manager } = managerHarness();
  const hero = manager.createSession({ name: 'Hero' });
  manager.dispatchInput(hero.id, '#event {IAC WILL GMCP} {#var {gmcp_ready} {%0}}');
  const connection = manager.sessions.get(hero.id).connection;
  connection.handlers.onOptionState({ option: 200, enabled: true });
  assert.equal(manager.withTinTinSession(hero.id, () => manager.variableEngine.get('gmcp_ready')), null);
  connection.handlers.onOptionState({ option: 201, enabled: true });
  assert.equal(manager.withTinTinSession(hero.id, () => manager.variableEngine.get('gmcp_ready')?.value), 'GMCP');
});

test('Snoop toggles and mirrors prefixed text without running watcher Actions', () => {
  const { manager, events } = managerHarness();
  const watcher = manager.createSession({ name: 'Watcher' });
  const target = manager.createSession({ name: 'Target' });
  manager.dispatchInput(watcher.id, '#action {danger} {say should-not-fire}');
  assert.match(manager.dispatchInput(watcher.id, '#snoop Target').messages[0], /enabled/u);
  manager.sessions.get(target.id).connection.handlers.onText('danger\n');
  assert.deepEqual(events.filter((event) => event.sessionId === watcher.id && event.type === 'local-text').map((event) => event.payload), ['[Target] danger\n']);
  assert.deepEqual(manager.sessions.get(watcher.id).connection.sent, []);
  assert.match(manager.dispatchInput(watcher.id, '#snoop Target').messages[0], /disabled/u);
});

test('Config maps Speedwalk and PLAIN/RAW logging while preserving other NukeFire-owned settings', () => {
  const { manager } = managerHarness();
  const hero = manager.createSession({ name: 'Hero' });
  manager.dispatchInput(hero.id, '#config {SPEEDWALK} {OFF}');
  assert.equal(manager.withTinTinSession(hero.id, () => manager.speedwalkEnabled), false);
  manager.dispatchInput(hero.id, '#config {LOG MODE} {RAW}');
  assert.equal(manager.sessions.get(hero.id).logging.mode, 'raw');
  assert.match(manager.dispatchInput(hero.id, '#config {SCREEN READER} {OFF}').messages[0], /compatibility no-op/u);
  assert.match(manager.dispatchInput(hero.id, '#pathdir {n} {s} {1}').messages[0], /PATHDIR n -> s/u);
});

test('session logging strips ANSI in PLAIN and preserves it in RAW', async () => {
  const { manager, logWrites } = managerHarness();
  const hero = manager.createSession({ name: 'Hero' });
  manager.dispatchInput(hero.id, '#log append Hero.log');
  manager.sessions.get(hero.id).connection.handlers.onText('\x1b[31mRED\x1b[0m\n');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(logWrites.at(-1).text, 'RED\n');
  manager.dispatchInput(hero.id, '#config {LOG MODE} {RAW}');
  manager.sessions.get(hero.id).connection.handlers.onText('\x1b[31mRAW\x1b[0m\n');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(logWrites.at(-1).text, '\x1b[31mRAW\x1b[0m\n');
});

test('Log command rejects traversal, stops on writer failure, and bare #log stops logging', async () => {
  const { manager } = managerHarness({ onLogAppend: () => Promise.resolve({ ok: false, error: 'disk full' }) });
  const hero = manager.createSession({ name: 'Hero' });
  assert.match(manager.dispatchInput(hero.id, '#log append ../bad.log').messages[0], /safe basename/u);
  manager.dispatchInput(hero.id, '#log append good.log');
  assert.equal(manager.sessions.get(hero.id).logging.active, true);
  manager.sessions.get(hero.id).connection.handlers.onText('line\n');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(manager.sessions.get(hero.id).logging.active, false);
  manager.dispatchInput(hero.id, '#log append good.log');
  manager.dispatchInput(hero.id, '#log');
  assert.equal(manager.sessions.get(hero.id).logging.active, false);
});

test('LogStore confines writes to Documents/NukeFire Client/Logs and rejects unsafe names', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nf-log-'));
  const store = new LogStore({ documentsDirectory: root });
  assert.equal(normalizeLogFilename('../bad.log'), '');
  const result = await store.append('hero.log', 'hello\n');
  assert.equal(result.ok, true);
  await Promise.all([store.append('hero.log', 'one\n'), store.append('hero.log', 'two\n'), store.append('hero.log', 'three\n')]);
  assert.equal(await fs.readFile(path.join(root, 'NukeFire Client', 'Logs', 'hero.log'), 'utf8'), 'hello\none\ntwo\nthree\n');
});

test('LogStore rejects a symlink log target', async (t) => {
  if (process.platform === 'win32') return t.skip('symlink semantics differ on Windows CI');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nf-log-link-'));
  const store = new LogStore({ documentsDirectory: root });
  await store.ensureDirectory();
  const outside = path.join(root, 'outside.log');
  await fs.writeFile(outside, 'outside');
  await fs.symlink(outside, path.join(store.directory, 'hero.log'));
  const result = await store.append('hero.log', 'bad');
  assert.equal(result.ok, false);
  assert.equal(await fs.readFile(outside, 'utf8'), 'outside');
});

test('Events and mapped Config survive deterministic writer/read round-trip', () => {
  const written = prepareTinTinWrite({
    events: { enabled: true, definitions: [{ name: 'SESSION CONNECTED', command: '#showme ready', enabled: true }] },
    config: { logMode: 'raw' },
    speedwalk: { enabled: false }
  });
  assert.equal(written.ok, true);
  assert.match(written.content, /#event \{SESSION CONNECTED\} \{#showme ready\}/u);
  assert.match(written.content, /#config \{LOG MODE\} \{RAW\}/u);
  const reread = prepareTinTinRead(written.content, {});
  assert.equal(reread.ok, true);
  assert.equal(reread.definitions.events.definitions[0].name, 'SESSION CONNECTED');
  assert.equal(reread.definitions.config.logMode, 'raw');
  assert.equal(reread.definitions.speedwalk.enabled, false);
});

test('startup template gives new sessions private Event and Config copies', () => {
  const { manager } = managerHarness();
  manager.createSession({ id: 'main', name: 'Main' });
  manager.setStartupTinTinTemplate({
    events: { enabled: true, definitions: [{ name: 'SESSION CONNECTED', command: '#var ready yes' }] },
    config: { logMode: 'raw' }
  });
  const a = manager.createSession({ name: 'A' });
  const b = manager.createSession({ name: 'B' });
  manager.withTinTinSession(a.id, () => manager.eventEngine.remove('SESSION CONNECTED'));
  assert.equal(manager.withTinTinSession(b.id, () => manager.eventEngine.get('SESSION CONNECTED')?.name), 'SESSION CONNECTED');
  assert.equal(manager.sessions.get(b.id).tintin.config.logMode, 'raw');
});

test('Actions cannot create Events, change logging/config, or start Snoop', () => {
  const { manager } = managerHarness();
  const a = manager.createSession({ name: 'A' });
  manager.createSession({ name: 'B' });
  for (const command of ['#event {SECOND} {look}', '#log append x.log', '#config {LOG MODE} {RAW}', '#snoop B']) {
    manager.dispatchInput(a.id, `#action {boom} {${command}}`);
    const events = [];
    manager.handlers.onEvent = (event) => { if (event.type === 'action-result') events.push(event); };
    manager.sessions.get(a.id).connection.handlers.onText('boom\n');
    assert.equal(events.some((event) => (event.payload?.messages || []).some((message) => /blocked/iu.test(message))), true);
    manager.dispatchInput(a.id, '#unaction {boom}');
  }
});

test('help documents Events, safe Logs, Snoop and Config ownership boundaries', () => {
  assert.match(clientCommandHelp('event').join('\n'), /SESSION CONNECTED/u);
  assert.match(clientCommandHelp('log').join('\n'), /NukeFire Client\/Logs/u);
  assert.match(clientCommandHelp('snoop').join('\n'), /does not run the watcher’s Actions/u);
  assert.match(clientCommandHelp('config').join('\n'), /never turns off NukeFire accessibility/u);
});
