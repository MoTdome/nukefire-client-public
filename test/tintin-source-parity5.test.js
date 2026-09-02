'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { SessionManager } = require('../src/session-manager');
const { prepareTinTinRead } = require('../src/tintin-script-loader');
const { auditTinTinSource } = require('../src/tintin-compatibility-audit');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.status = 'disconnected'; this.sent = []; }
  async connect(host, port) { this.status = 'connected'; this.handlers.onStatus?.({ state: 'connected', host, port }); }
  disconnect(message = 'Disconnected') { this.status = 'disconnected'; this.handlers.onStatus?.({ state: 'disconnected', message }); }
  sendCommand(command) { if (this.status !== 'connected') return false; this.sent.push(command); return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
}

function harness(options = {}) {
  const local = [];
  const timers = [];
  const writes = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    tickerSetTimer: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; },
    tickerClearTimer: () => {},
    handlers: {
      onEvent: (event) => { if (event.type === 'local-text') local.push(String(event.payload || '')); },
      onSessionsChanged: () => {},
      onTinTinTextRead: async ({ requested }) => ({ ok: true, filename: requested, content: 'north\nsouth\n' }),
      onTinTinTextWrite: async (request) => { writes.push(request); return { ok: true, filename: request.requested }; },
      ...(options.handlers || {})
    }
  });
  return { manager, local, timers, writes };
}

function internal(manager, session) { return manager.sessions.get(session.id || session); }
function value(manager, session, name) {
  const target = internal(manager, session);
  return manager.withTinTinSession(target, () => manager.variableEngine.get(name)?.value ?? '');
}

test('HISTORY supports source LIST DELETE INSERT and protected READ/WRITE', async () => {
  const { manager, writes } = harness();
  const s = manager.createSession({ name: 'History' });
  manager.dispatchInput(s.id, 'look');
  manager.dispatchInput(s.id, 'score');
  assert.match(manager.dispatchInput(s.id, '#history list').messages.join('\n'), /look/iu);
  manager.dispatchInput(s.id, '#history insert {north}');
  assert.equal(internal(manager, s).tintinCommandHistory.at(-1), 'north');
  manager.dispatchInput(s.id, '#history delete');
  assert.equal(internal(manager, s).tintinCommandHistory.at(-1), 'north');
  assert.equal(internal(manager, s).tintinCommandHistory.includes('#history delete'), false);

  manager.dispatchInput(s.id, '#history write {commands.txt}');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(writes.length, 1);
  assert.equal(writes[0].requested, 'commands.txt');
  assert.match(writes[0].content, /look/iu);

  manager.dispatchInput(s.id, '#history read {commands.txt}');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(internal(manager, s).tintinCommandHistory, ['north', 'south']);
});

test('GREP searches the private incoming review buffer with source-style pages', () => {
  const { manager } = harness();
  const s = manager.createSession({ name: 'Grep' });
  const conn = internal(manager, s).connection;
  conn.handlers.onText('alpha one\n');
  conn.handlers.onText('beta\n');
  conn.handlers.onText('alpha two\n');
  const result = manager.dispatchInput(s.id, '#grep {alpha}');
  assert.match(result.messages.join('\n'), /alpha two/iu);
  assert.match(result.messages.join('\n'), /alpha one/iu);
  assert.doesNotMatch(result.messages.join('\n'), /beta/iu);
});

test('BUFFER INFO GET FIND CLEAR and WRITE use bounded session review history', async () => {
  const events = [];
  const { manager, writes } = harness({ handlers: { onEvent: (event) => events.push(event) } });
  const s = manager.createSession({ name: 'Buffer' });
  const conn = internal(manager, s).connection;
  conn.handlers.onText('oldest\n');
  conn.handlers.onText('middle danger\n');
  conn.handlers.onText('newest\n');
  assert.match(manager.dispatchInput(s.id, '#buffer info').messages.join('\n'), /3 lines/iu);
  manager.dispatchInput(s.id, '#buffer get {last} {1}');
  assert.equal(value(manager, s, 'last'), 'newest');
  manager.dispatchInput(s.id, '#buffer get {range} {3} {1}');
  assert.equal(value(manager, s, 'range[1]'), 'oldest');
  assert.equal(value(manager, s, 'range[3]'), 'newest');
  const found = manager.dispatchInput(s.id, '#buffer find {danger}');
  assert.match(found.messages.join('\n'), /middle danger/iu);
  assert.equal(events.some((event) => event.type === 'review-find-request'), true);
  manager.dispatchInput(s.id, '#buffer write {buffer.txt}');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(writes.at(-1).requested, 'buffer.txt');
  assert.match(writes.at(-1).content, /newest/iu);
  manager.dispatchInput(s.id, '#buffer clear');
  assert.equal(internal(manager, s).tintinOutputHistory.length, 0);
});

test('calendar Events expose TinTin seven-value clock variables and qualified DATE/TIME events', () => {
  const { manager } = harness();
  const s = manager.createSession({ name: 'Clock' });
  manager.dispatchInput(s.id, '#event {TIME 03:04:05} {#var {stamp} {%1-%2-%4 %5:%6:%7}}');
  manager.fireTinTinClockEvents(internal(manager, s), new Date(2026, 0, 2, 3, 4, 5));
  assert.equal(value(manager, s, 'stamp'), '2026-01-02 03:04:05');

  manager.dispatchInput(s.id, '#event {MINUTE 04} {#var {minutehit} {%6}}');
  manager.fireTinTinClockEvents(internal(manager, s), new Date(2026, 0, 2, 3, 5, 0));
  manager.fireTinTinClockEvents(internal(manager, s), new Date(2026, 0, 2, 3, 4, 0));
  assert.equal(value(manager, s, 'minutehit'), '04');
});

test('VARIABLE UPDATE, SCREEN RESIZE, END OF PATH, and PROGRAM START are live events', () => {
  const { manager } = harness();
  const s = manager.createSession({ name: 'Events' });
  manager.dispatchInput(s.id, '#event {VARIABLE UPDATE watched} {#var {seen} {%2}}');
  manager.dispatchInput(s.id, '#var {watched} {yes}');
  assert.equal(value(manager, s, 'seen'), 'yes');

  manager.dispatchInput(s.id, '#event {SCREEN RESIZE} {#var {screen} {%1x%2}}');
  manager.setTerminalSize(s.id, 132, 48);
  assert.equal(value(manager, s, 'screen'), '132x48');

  manager.dispatchInput(s.id, '#event {END OF PATH} {#var {pathdone} {yes}}');
  manager.dispatchInput(s.id, '#path load {n}');
  manager.dispatchInput(s.id, '#path walk');
  assert.equal(value(manager, s, 'pathdone'), 'yes');

  const start = manager.createSession({
    name: 'StartupEvent',
    tintin: {
      events: { enabled: true, definitions: [{ name: 'PROGRAM START', command: '#var {started} {yes}', enabled: true }] }
    }
  });
  assert.equal(value(manager, start, 'started'), 'yes');
});

test('loader and audit treat HISTORY GREP BUFFER and expanded clock Events as completed compatibility', () => {
  const source = `
#history {insert} {look}
#grep {dragon}
#buffer {info}
#event {TIME 12:30} {#showme noon}
#event {DATE 08-19} {#showme today}
#event {VARIABLE UPDATE hp} {#showme {%2}}
#event {SCREEN RESIZE} {#showme {%1x%2}}
#event {END OF PATH} {#showme done}
`;
  const prepared = prepareTinTinRead(source, {}, { filename: 'parity5.tin' });
  assert.equal(prepared.ok, true);
  assert.deepEqual(prepared.unsupported, []);
  assert.equal(prepared.counts.events, 5);
  assert.deepEqual(prepared.runtimeCommands.map((entry) => entry.directive), ['history', 'grep', 'buffer']);

  const audit = auditTinTinSource(source, { filename: 'parity5.tin' });
  assert.equal(audit.ok, true);
  assert.deepEqual(audit.entries.filter((entry) => entry.classification === 'needs-implementation'), []);
});
