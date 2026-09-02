
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { SessionManager } = require('../src/session-manager');

class FakeConnection {
  constructor(handlers) {
    this.handlers = handlers;
    this.status = 'disconnected';
    this.sent = [];
    this.allowSend = true;
    this.host = '';
    this.port = 0;
  }
  async connect(host, port) {
    this.host = host;
    this.port = port;
    this.status = 'connected';
    this.handlers.onStatus?.({ state: 'connected', message: 'Connected', host, port });
  }
  disconnect(message = 'Disconnected') {
    this.status = 'disconnected';
    this.handlers.onStatus?.({ state: 'disconnected', message, host: this.host, port: this.port });
  }
  sendCommand(command) {
    if (this.status !== 'connected' || !this.allowSend) return false;
    this.sent.push(command);
    return true;
  }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
}

function harness(options = {}) {
  const events = [];
  const timers = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    tickerSetTimer: (fn, ms) => { const timer = { fn, ms }; timers.push(timer); return timer; },
    tickerClearTimer: () => {},
    handlers: {
      onEvent: (event) => events.push(event),
      onSessionsChanged: () => {},
      ...(options.handlers || {})
    }
  });
  return { manager, events, timers };
}

function internal(manager, session) { return manager.sessions.get(session.id || session); }
function value(manager, session, name) {
  const target = internal(manager, session);
  return manager.withTinTinSession(target, () => manager.variableEngine.get(name)?.value ?? '');
}

function wrapEvents(manager, callback) {
  const original = manager.fireTinTinEvent.bind(manager);
  manager.fireTinTinEvent = (session, name, args = [], options = {}) => {
    callback(session, String(name || ''), Array.isArray(args) ? [...args] : [], options);
    return original(session, name, args, options);
  };
}

test('temporal Event timers prime the current clock instead of inventing first-tick calendar boundaries', () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'clock-prime', name: 'ClockPrime' });
  let parts = { year: '2026', month: '08', week: '33', day: '20', hour: '09', minute: '05', second: '10' };
  manager.tinTinClockParts = () => ({ ...parts });

  manager.dispatchInput(s.id, '#event {MINUTE} {#nop}');
  assert.deepEqual(internal(manager, s).tintinClockState, parts);

  const names = [];
  wrapEvents(manager, (_session, name) => names.push(name));
  parts = { ...parts, second: '11' };
  manager.fireTinTinClockEvents(internal(manager, s));
  assert.equal(names.includes('MINUTE'), false, names.join(', '));
  assert.equal(names.includes('HOUR'), false, names.join(', '));
  assert.equal(names.includes('DAY'), false, names.join(', '));
  assert.equal(names.includes('MONTH'), false, names.join(', '));
  assert.equal(names.includes('YEAR'), false, names.join(', '));

  names.length = 0;
  parts = { ...parts, minute: '06', second: '00' };
  manager.fireTinTinClockEvents(internal(manager, s));
  assert.equal(names.includes('MINUTE'), true, names.join(', '));
  assert.equal(names.includes('MINUTE 06'), true, names.join(', '));
});

test('VARIABLE UPDATE fires before the underlying variable write with the proposed new value', () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'variable-order', name: 'VariableOrder' });
  manager.dispatchInput(s.id, '#var {watched} {old}');

  const observations = [];
  wrapEvents(manager, (session, name, args) => {
    if (name.toUpperCase() !== 'VARIABLE UPDATE WATCHED') return;
    const oldValue = manager.withTinTinSession(session, () => manager.variableEngine.get('watched')?.value ?? '');
    observations.push({ oldValue, args });
  });

  manager.dispatchInput(s.id, '#var {watched} {new}');
  assert.deepEqual(observations, [{ oldValue: 'old', args: ['watched', 'new'] }]);
  assert.equal(value(manager, s, 'watched'), 'new');
});

test('RECEIVED OUTPUT precedes RECEIVED LINE and line Events receive raw plus terminal-stripped payloads', () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'line-payload', name: 'LinePayload' });
  const calls = [];
  wrapEvents(manager, (_session, name, args) => {
    if (name === 'RECEIVED OUTPUT' || name === 'RECEIVED LINE') calls.push({ name, args });
  });

  internal(manager, s).connection.handlers.onText('\x1b[31mDanger\x1b[0m\n');
  assert.equal(calls[0].name, 'RECEIVED OUTPUT');
  assert.equal(calls[1].name, 'RECEIVED LINE');
  assert.deepEqual(calls[1].args, ['\x1b[31mDanger\x1b[0m', 'Danger']);
});

test('SEND OUTPUT fires only after the transport has accepted the outgoing command', async () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'send-order', name: 'SendOrder' });
  await manager.connectSession(s.id, { host: 'mud.test', port: 4000 });
  const seen = [];
  wrapEvents(manager, (session, name, args) => {
    if (name === 'SEND OUTPUT') seen.push({ sent: [...session.connection.sent], args });
  });

  manager.dispatchInput(s.id, 'look');
  assert.deepEqual(seen, [{ sent: ['look'], args: ['look'] }]);
});

test('SEND OUTPUT is not emitted when the transport rejects the send', async () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'send-fail', name: 'SendFail' });
  await manager.connectSession(s.id, { host: 'mud.test', port: 4000 });
  internal(manager, s).connection.allowSend = false;
  let sendEvents = 0;
  wrapEvents(manager, (_session, name) => { if (name === 'SEND OUTPUT') sendEvents += 1; });

  const result = manager.dispatchInput(s.id, 'look');
  assert.equal(result.deliveries[0].queued, false);
  assert.equal(sendEvents, 0);
  assert.deepEqual(internal(manager, s).connection.sent, []);
});

test('session startup presents PROGRAM START followed by the initial SCREEN RESIZE event', () => {
  const { manager } = harness();
  const calls = [];
  wrapEvents(manager, (_session, name, args) => {
    if (name === 'PROGRAM START' || name === 'SCREEN RESIZE') calls.push({ name, args });
  });
  const s = manager.createSession({
    id: 'startup-order',
    name: 'StartupOrder',
    tintin: {
      events: {
        enabled: true,
        definitions: [
          { name: 'PROGRAM START', command: '#var {started} {yes}', enabled: true },
          { name: 'SCREEN RESIZE', command: '#var {initialscreen} {%0x%1}', enabled: true }
        ]
      }
    }
  });
  assert.deepEqual(calls.slice(-2).map((entry) => entry.name), ['PROGRAM START', 'SCREEN RESIZE']);
  assert.equal(value(manager, s, 'started'), 'yes');
  assert.equal(value(manager, s, 'initialscreen'), '120x40');
});

test('closing the active connected session preserves DISCONNECTED then DEACTIVATED then ACTIVATED lifecycle order', async () => {
  const { manager } = harness();
  const first = manager.createSession({ id: 'first-life', name: 'FirstLife' });
  const second = manager.createSession({ id: 'second-life', name: 'SecondLife' });
  await manager.connectSession(first.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(second.id, { host: 'mud.test', port: 4001 });
  assert.equal(manager.snapshot().activeSessionId, first.id);

  const calls = [];
  wrapEvents(manager, (session, name) => {
    if (['SESSION DISCONNECTED', 'SESSION DEACTIVATED', 'SESSION ACTIVATED'].includes(name)) {
      calls.push({ name, sessionId: session.id, activeSessionId: manager.activeSessionId });
    }
  });

  assert.equal(manager.removeSession(first.id), true);
  assert.deepEqual(calls.map((entry) => entry.name), ['SESSION DISCONNECTED', 'SESSION DEACTIVATED', 'SESSION ACTIVATED']);
  assert.equal(calls[0].activeSessionId, first.id);
  assert.equal(calls[1].activeSessionId, first.id);
  assert.equal(calls[2].activeSessionId, second.id);
  assert.equal(manager.snapshot().activeSessionId, second.id);
});

test('ordinary session switching still deactivates the old session before activating the new one', () => {
  const { manager } = harness();
  const first = manager.createSession({ id: 'first-switch', name: 'FirstSwitch' });
  const second = manager.createSession({ id: 'second-switch', name: 'SecondSwitch' });
  const calls = [];
  wrapEvents(manager, (session, name) => {
    if (name === 'SESSION DEACTIVATED' || name === 'SESSION ACTIVATED') {
      calls.push({ name, sessionId: session.id, activeSessionId: manager.activeSessionId });
    }
  });

  manager.setActiveSession(second.id);
  assert.deepEqual(calls.map((entry) => entry.name), ['SESSION DEACTIVATED', 'SESSION ACTIVATED']);
  assert.equal(calls[0].sessionId, first.id);
  assert.equal(calls[0].activeSessionId, first.id);
  assert.equal(calls[1].sessionId, second.id);
  assert.equal(calls[1].activeSessionId, second.id);
});

test('client help documents source-order Event timing and payload boundaries', () => {
  const help = fs.readFileSync(path.join(__dirname, '..', 'src', 'client-command-help.js'), 'utf8');
  assert.match(help, /VARIABLE UPDATE fires before the variable is written/u);
  assert.match(help, /RECEIVED LINE exposes the raw line and a terminal-stripped line/u);
  assert.match(help, /SEND OUTPUT fires only after the underlying send succeeds/u);
  assert.match(help, /first temporal tick does not invent minute, hour, day, month, or year boundaries/u);
});
