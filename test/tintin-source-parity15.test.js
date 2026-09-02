'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { SessionManager } = require('../src/session-manager');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.status = 'disconnected'; this.sent = []; }
  sendCommand(command) { this.sent.push(command); return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
  disconnect() { this.status = 'disconnected'; }
}

function harness() {
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    handlers: { onEvent: () => {}, onSessionsChanged: () => {} }
  });
  const session = manager.createSession({ id: 'line-sub', name: 'Line Substitute' });
  return { manager, session };
}

test('LINE SUBSTITUTE accepts source-order substitution abbreviations for variables and functions', () => {
  const { manager, session } = harness();
  manager.dispatchInput(session.id, '#variable {who} {gator}');
  manager.dispatchInput(session.id, '#function {up} {#return {HI}}');

  const result = manager.dispatchInput(session.id, '#line sub {var;fun} {say $who @up{}}');
  assert.deepEqual(result.deliveries.map((entry) => entry.command), ['say gator HI']);
});

test('LINE SUBSTITUTE COLORS converts TinTin numeric foreground and 256-color forms without splitting ANSI semicolons', () => {
  const { manager, session } = harness();
  const result = manager.dispatchInput(session.id, '#line substitute {colors} {say <178>A <faa>B <FAA>C}');
  assert.deepEqual(result.deliveries.map((entry) => entry.command), [
    'say \x1b[1;37mA \x1b[38;5;196mB \x1b[48;5;196mC'
  ]);
});

test('LINE SUBSTITUTE ESCAPES implements TinTin escape decoding while network delivery remains single-command safe', () => {
  const { manager, session } = harness();
  const result = manager.dispatchInput(session.id, '#line substitute {esc} {say one\\nsay two\\tend}');
  assert.deepEqual(result.deliveries.map((entry) => entry.command), ['say one say two\tend']);
});

test('LINE SUBSTITUTE SECURE protects braces and command separators from script re-parsing', () => {
  const { manager, session } = harness();
  const result = manager.dispatchInput(session.id, '#line substitute {secure} {say {x};y}');
  assert.deepEqual(result.deliveries.map((entry) => entry.command), ['say {x};y']);
});

test('LINE SUBSTITUTE SECURE restores protected syntax before generated local TinTin commands execute', () => {
  const events = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    handlers: { onEvent: (event) => events.push(event), onSessionsChanged: () => {} }
  });
  const session = manager.createSession({ id: 'secure-local', name: 'Secure Local' });
  manager.dispatchInput(session.id, '#line substitute {secure} {#showme {{x}}}');
  assert.equal(events.find((event) => event.type === 'local-text')?.payload, '{x}\n');
});

test('LINE SUBSTITUTE SECURE preserves an original literal backslash while protecting parser syntax', () => {
  const { manager, session } = harness();
  const result = manager.dispatchInput(session.id, '#line substitute {secure} {say a\\b;still-one}');
  assert.deepEqual(result.deliveries.map((entry) => entry.command), ['say a\\b;still-one']);
});

test('LINE SUBSTITUTE without SECURE feeds generated command separators back through the bounded script parser', () => {
  const { manager, session } = harness();
  const result = manager.dispatchInput(session.id, '#line substitute {variables} {say one;look}');
  assert.deepEqual(result.deliveries.map((entry) => entry.command), ['say one', 'look']);
});

test('LINE SUBSTITUTE EOL and LNF preserve TinTin trailing line endings', () => {
  const { manager, session } = harness();
  const eol = manager.dispatchInput(session.id, '#line substitute {eol;lnf} {say hi}');
  assert.deepEqual(eol.deliveries.map((entry) => entry.command), ['say hi\r\n\n']);
});
