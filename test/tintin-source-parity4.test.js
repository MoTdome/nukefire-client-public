'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { SessionManager } = require('../src/session-manager');
const { prepareTinTinRead } = require('../src/tintin-script-loader');
const { auditTinTinSource } = require('../src/tintin-compatibility-audit');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.sent = []; this.status = 'disconnected'; }
  async connect(host, port) { this.status = 'connected'; this.handlers.onStatus?.({ state: 'connected', host, port }); }
  disconnect(message = 'Disconnected') { this.status = 'disconnected'; this.handlers.onStatus?.({ state: 'disconnected', message }); }
  sendCommand(command) { if (this.status !== 'connected') return false; this.sent.push(command); return true; }
  setTerminalSize() {}
  setClientPreferences() {}
}

function harness(options = {}) {
  const local = [];
  const logs = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    tickerSetTimer: (fn, ms) => ({ fn, ms }),
    tickerClearTimer: () => {},
    handlers: {
      onEvent: (event) => { if (event.type === 'local-text') local.push(event.payload); },
      onSessionsChanged: () => {},
      onLogAppend: (request) => { logs.push(request); return Promise.resolve({ ok: true }); },
      ...(options.handlers || {})
    }
  });
  return { manager, local, logs };
}

function internal(manager, session) { return manager.sessions.get(session.id || session); }
function value(manager, session, name) {
  const target = internal(manager, session);
  return manager.withTinTinSession(target, () => manager.variableEngine.get(name)?.value ?? '');
}

test('BREAK exits bounded LOOP and remains invalid at the command line', () => {
  const { manager } = harness();
  const s = manager.createSession({ name: 'Break' });
  manager.dispatchInput(s.id, '#var {hits} {0}');
  manager.dispatchInput(s.id, '#loop {1} {5} {i} {#math {hits} {$hits + 1};#break;#math {hits} {$hits + 100}}');
  assert.equal(value(manager, s, 'hits'), '1');
  assert.match(manager.dispatchInput(s.id, '#break').messages.join('\n'), /only valid inside/iu);
});

test('RECEIVED LINE event uses the complete incoming line as %0/%1', () => {
  const { manager } = harness();
  const s = manager.createSession({ name: 'Lines' });
  manager.dispatchInput(s.id, '#event {RECEIVED LINE} {#var {lastline} {%1}}');
  internal(manager, s).connection.handlers.onText('hello veteran world\n');
  assert.equal(value(manager, s, 'lastline'), 'hello veteran world');
});

test('GMCP vitals synthesize legacy MSDP data events without requiring MSDP negotiation', () => {
  const { manager } = harness();
  const s = manager.createSession({ name: 'GMCP' });
  manager.dispatchInput(s.id, '#event {IAC SB MSDP VAR %1 VAL %2 IAC SE} {#var {MSDP[%1]} {%2}}');
  internal(manager, s).connection.handlers.onGmcp({ packageName: 'Char.Vitals', body: { hp: 1234, mhp: 5000, mana: 77, mmana: 100, move: 88, mmove: 100 } });
  assert.equal(value(manager, s, 'MSDP[HEALTH]'), '1234');
  assert.equal(manager.withTinTinSession(internal(manager, s), () => manager.variableExpansion('$MSDP_HEALTH').value), '1234');
  assert.equal(manager.withTinTinSession(internal(manager, s), () => manager.variableExpansion('$GMCP_HEALTH').value), '1234');
});

test('session lifecycle/input/output Events fire privately', async () => {
  const { manager } = harness();
  const a = manager.createSession({ name: 'A' });
  const b = manager.createSession({ name: 'B' });
  manager.dispatchInput(a.id, '#event {SESSION DEACTIVATED} {#var {deactivated} {%1}}');
  manager.dispatchInput(a.id, '#event {SESSION DISCONNECTED} {#var {disconnected} {%1}}');
  manager.dispatchInput(b.id, '#event {RECEIVED INPUT} {#var {input_seen} {%1}}');
  manager.setActiveSession(a.id);
  manager.setActiveSession(b.id);
  assert.equal(value(manager, a, 'deactivated'), 'A');
  manager.dispatchInput(b.id, 'look');
  assert.equal(value(manager, b, 'input_seen'), 'look');
  await manager.connectSession(a.id, { host: 'mud.test', port: 4000 });
  internal(manager, a).connection.disconnect('bye');
  assert.equal(value(manager, a, 'disconnected'), 'A');
});

test('LINE IGNORE suppresses Action processing for local nested output and LINE LOCAL blocks server sends', async () => {
  const { manager } = harness();
  const s = manager.createSession({ name: 'Line' });
  manager.dispatchInput(s.id, '#var {hit} {no}');
  manager.dispatchInput(s.id, '#action {secret} {#var {hit} {yes}}');
  manager.dispatchInput(s.id, '#line ignore {#showme secret}');
  assert.equal(value(manager, s, 'hit'), 'no');
  await manager.connectSession(s.id, { host: 'mud.test', port: 4000 });
  const result = manager.dispatchInput(s.id, '#line local {look}');
  assert.deepEqual(internal(manager, s).connection.sent, []);
  assert.match(result.messages.join('\n'), /skipped server-bound/iu);
});

test('LINE LOG redirects legacy absolute paths to a safe Logs basename', async () => {
  const { manager, logs } = harness();
  const s = manager.createSession({ name: 'Log' });
  const result = manager.dispatchInput(s.id, '#line log {/Users/example/dropbox/tintin/src/nf_bigmap.txt} {room line}');
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(result.messages.join('\n'), /nf_bigmap\.txt/iu);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].filename, 'nf_bigmap.txt');
  assert.equal(logs[0].text, 'room line\n');
});

test('IGNORE toggles runtime list processing and MESSAGE suppresses definition chatter only', () => {
  const { manager } = harness();
  const s = manager.createSession({ name: 'Flags' });
  manager.dispatchInput(s.id, '#var {hit} {no}');
  manager.dispatchInput(s.id, '#action {boom} {#var {hit} {yes}}');
  manager.dispatchInput(s.id, '#ignore {actions} {on}');
  internal(manager, s).connection.handlers.onText('boom\n');
  assert.equal(value(manager, s, 'hit'), 'no');
  manager.dispatchInput(s.id, '#ignore {actions} {off}');
  internal(manager, s).connection.handlers.onText('boom\n');
  assert.equal(value(manager, s, 'hit'), 'yes');

  manager.dispatchInput(s.id, '#message {aliases} {off}');
  const define = manager.dispatchInput(s.id, '#alias {quietalias} {look}');
  assert.deepEqual(define.messages, []);
  assert.equal(manager.withTinTinSession(internal(manager, s), () => manager.aliasEngine.get('quietalias')?.body), 'look');
  assert.match(manager.dispatchInput(s.id, '#message {aliases} {on}').messages.join('\n'), /ALIAS MESSAGE ON/iu);
});

test('loader preserves expanded LINE/IGNORE/MESSAGE and wildcard legacy MSDP Events', () => {
  const prepared = prepareTinTinRead(`
#event {RECEIVED LINE} {#showme {%1}}
#event {SESSION DISCONNECTED} {#showme bye}
#event {IAC SB MSDP VAR %1 VAL %2 IAC SE} {#var {MSDP[%1]} {%2}}
#line ignore {#showme local}
#line local {look}
#line log {/old/path/nf_bigmap.txt} {line}
#ignore {actions} {on}
#message {aliases} {off}
`, {}, { filename: 'parity4.tin' });
  assert.equal(prepared.ok, true);
  assert.equal(prepared.counts.events, 3);
  assert.deepEqual(prepared.unsupported, []);
  assert.deepEqual(prepared.runtimeCommands.map((entry) => entry.directive), ['line','line','line','ignore','message']);
});

test('compatibility audit marks expanded Events and LINE forms as completed', () => {
  const audit = auditTinTinSource(`
#event {RECEIVED LINE} {#showme {%1}}
#event {IAC SB MSDP VAR %1 VAL %2 IAC SE} {#showme {%1:%2}}
#line ignore {#showme local}
#line local {look}
#line log {/old/path/log.txt} {line}
#ignore {actions} {on}
#message {aliases} {off}
`, { filename: 'parity4.tin' });
  assert.equal(audit.ok, true);
  assert.deepEqual(audit.entries.filter((entry) => entry.classification === 'needs-implementation'), []);
});
