
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { SessionManager } = require('../src/session-manager');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.status = 'disconnected'; this.sent = []; }
  async connect(host, port) { this.status = 'connected'; this.handlers.onStatus?.({ state: 'connected', host, port }); }
  disconnect(message = 'Disconnected') { this.status = 'disconnected'; this.handlers.onStatus?.({ state: 'disconnected', message }); }
  sendCommand(command) { if (this.status !== 'connected') return false; this.sent.push(command); return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
}

function harness(options = {}) {
  const events = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    handlers: {
      onEvent: (event) => events.push(event),
      onSessionsChanged: () => {},
      ...(options.handlers || {})
    }
  });
  return { manager, events };
}

function internal(manager, session) { return manager.sessions.get(session.id || session); }
function value(manager, session, name) {
  const target = internal(manager, session);
  return manager.withTinTinSession(target, () => manager.variableEngine.get(name)?.value ?? '');
}
function messages(result) { return (result.messages || []).join('\n'); }

function loadThree(manager, session) {
  const conn = internal(manager, session).connection;
  conn.handlers.onText('oldest line\n');
  conn.handlers.onText('middle line\n');
  conn.handlers.onText('newest line\n');
}

test('BUFFER GET follows TinTin one-based live-edge line numbering', () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'get', name: 'Get' });
  loadThree(manager, s);

  manager.dispatchInput(s.id, '#buffer get {one} {1}');
  manager.dispatchInput(s.id, '#buffer get {two} {2}');
  manager.dispatchInput(s.id, '#buffer get {three} {3}');
  manager.dispatchInput(s.id, '#buffer get {zero} {0}');
  manager.dispatchInput(s.id, '#buffer get {past} {4}');

  assert.equal(value(manager, s, 'one'), 'newest line');
  assert.equal(value(manager, s, 'two'), 'middle line');
  assert.equal(value(manager, s, 'three'), 'oldest line');
  assert.equal(value(manager, s, 'zero'), '');
  assert.equal(value(manager, s, 'past'), '');
});

test('BUFFER GET ranges retain TinTin requested-index order in both directions', () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'ranges', name: 'Ranges' });
  loadThree(manager, s);

  manager.dispatchInput(s.id, '#buffer get {newToOld} {1} {3}');
  assert.equal(value(manager, s, 'newToOld[1]'), 'newest line');
  assert.equal(value(manager, s, 'newToOld[2]'), 'middle line');
  assert.equal(value(manager, s, 'newToOld[3]'), 'oldest line');

  manager.dispatchInput(s.id, '#buffer get {oldToNew} {3} {1}');
  assert.equal(value(manager, s, 'oldToNew[1]'), 'oldest line');
  assert.equal(value(manager, s, 'oldToNew[2]'), 'middle line');
  assert.equal(value(manager, s, 'oldToNew[3]'), 'newest line');
});

test('BUFFER GET rejects oversized ranges before changing the destination variable', () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'bounded-get', name: 'BoundedGet' });
  manager.dispatchInput(s.id, '#var {kept} {original}');
  const result = manager.dispatchInput(s.id, '#buffer get {kept} {1} {999999}');
  assert.match(messages(result), /at most/iu);
  assert.equal(value(manager, s, 'kept'), 'original');
});

test('GREP positive pages select from the live edge but display each page chronologically', () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'grep-positive', name: 'GrepPositive' });
  manager.setTerminalSize(s.id, 80, 4); // source-style page capacity: height - 2 = 2
  const conn = internal(manager, s).connection;
  conn.handlers.onText('hit oldest\n');
  conn.handlers.onText('miss\n');
  conn.handlers.onText('hit middle\n');
  conn.handlers.onText('hit newest\n');

  const first = messages(manager.dispatchInput(s.id, '#grep {hit}'));
  assert.doesNotMatch(first, /hit oldest/u);
  assert.ok(first.indexOf('hit middle') < first.indexOf('hit newest'), first);

  const second = messages(manager.dispatchInput(s.id, '#grep {2} {hit}'));
  assert.match(second, /hit oldest/u);
  assert.doesNotMatch(second, /hit newest/u);
});

test('GREP negative pages start at the oldest edge and preserve chronological display order', () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'grep-negative', name: 'GrepNegative' });
  manager.setTerminalSize(s.id, 80, 4);
  const conn = internal(manager, s).connection;
  conn.handlers.onText('hit oldest\n');
  conn.handlers.onText('hit middle\n');
  conn.handlers.onText('hit newest\n');

  const first = messages(manager.dispatchInput(s.id, '#grep {-1} {hit}'));
  assert.doesNotMatch(first, /hit newest/u);
  assert.ok(first.indexOf('hit oldest') < first.indexOf('hit middle'), first);
});

test('client help documents source-style BUFFER GET numbering and GREP page display order', () => {
  const help = fs.readFileSync(path.join(__dirname, '..', 'src', 'client-command-help.js'), 'utf8');
  assert.match(help, /GET uses 1 for the newest line, 2 for the next older line/u);
  assert.match(help, /Positive GREP pages select from the newest edge but display each selected page in original chronological order/u);
});
