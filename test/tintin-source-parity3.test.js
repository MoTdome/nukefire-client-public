'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { SessionManager } = require('../src/session-manager');
const { prepareTinTinRead } = require('../src/tintin-script-loader');
const { auditTinTinSource } = require('../src/tintin-compatibility-audit');
const { canonicalClientDirective } = require('../src/client-command-parser');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.status = 'disconnected'; this.sent = []; }
  async connect(host, port) { this.status = 'connected'; this.handlers.onStatus?.({ state: 'connected', host, port, message: `Connected to ${host}:${port}` }); }
  disconnect() { this.status = 'disconnected'; }
  sendCommand(command) { if (this.status !== 'connected') return false; this.sent.push(command); return true; }
  sendGmcp() { return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
}

function createManager() {
  let timerId = 1;
  const fakeSetTimer = () => ({ fakeTimer: timerId++ });
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    delaySetTimer: fakeSetTimer,
    delayClearTimer: () => {},
    tickerSetTimer: fakeSetTimer,
    tickerClearTimer: () => {}
  });
  return manager;
}

function expand(manager, id, text) {
  const session = manager.sessions.get(id);
  return manager.withTinTinSession(session, () => manager.variableExpansion(text));
}

test('TinTin LIST supports source GET SET SIZE and SORT semantics', () => {
  const manager = createManager();
  const session = manager.createSession({ name: 'Lists' });
  const id = session.id;

  manager.dispatchInput(id, '#list {q} create {beta}{delta}');
  manager.dispatchInput(id, '#list {q} size {qsize}');
  assert.equal(expand(manager, id, '$qsize').value, '2');

  manager.dispatchInput(id, '#list {q} get {-1} {last}');
  assert.equal(expand(manager, id, '$last').value, 'delta');

  manager.dispatchInput(id, '#list {q} set {1} {gamma}');
  assert.equal(expand(manager, id, '$q[1]').value, 'gamma');

  manager.dispatchInput(id, '#list {q} sort {alpha}');
  assert.deepEqual([1,2,3].map((n) => expand(manager, id, `$q[${n}]`).value), ['alpha', 'gamma', 'delta']);
});

test('TinTin TICKER and DELAY support list/query forms and ticker defaults to 60 seconds', () => {
  const manager = createManager();
  const session = manager.createSession({ name: 'Timers' });
  const id = session.id;

  let result = manager.dispatchInput(id, '#ticker {heartbeat} {#showme beat}');
  assert.match(result.messages.join('\n'), /60 second/iu);
  result = manager.dispatchInput(id, '#ticker {heartbeat}');
  assert.match(result.messages.join('\n'), /heartbeat/iu);
  assert.match(result.messages.join('\n'), /60/iu);
  assert.match(manager.dispatchInput(id, '#ticker').messages.join('\n'), /heartbeat/iu);

  manager.dispatchInput(id, '#delay {later} {#showme later} {5}');
  assert.match(manager.dispatchInput(id, '#delay {later}').messages.join('\n'), /later/iu);
  assert.match(manager.dispatchInput(id, '#delay').messages.join('\n'), /later/iu);
});

test('original one-argument definition query forms remain available beside NukeFire show forms', () => {
  const manager = createManager();
  const session = manager.createSession({ name: 'Queries' });
  const id = session.id;

  manager.dispatchInput(id, '#alias {aa} {look}');
  manager.dispatchInput(id, '#action {hello} {#showme hi}');
  manager.dispatchInput(id, '#function {ff} {#return ok}');
  manager.dispatchInput(id, '#highlight {danger} {red}');
  manager.dispatchInput(id, '#substitute {old} {new}');
  manager.dispatchInput(id, '#macro {F5} {look}');

  assert.match(manager.dispatchInput(id, '#alias {aa}').messages.join('\n'), /aa/iu);
  assert.match(manager.dispatchInput(id, '#action {hello}').messages.join('\n'), /hello/iu);
  assert.match(manager.dispatchInput(id, '#function {ff}').messages.join('\n'), /ff/iu);
  assert.match(manager.dispatchInput(id, '#highlight {danger}').messages.join('\n'), /danger/iu);
  assert.match(manager.dispatchInput(id, '#substitute {old}').messages.join('\n'), /old/iu);
  assert.match(manager.dispatchInput(id, '#macro {F5}').messages.join('\n'), /F5/iu);
});

test('source command aliases REGEXP and KILLALL canonicalize to the safe runtime paths', () => {
  assert.equal(canonicalClientDirective('regexp'), 'regex');
  assert.equal(canonicalClientDirective('killall'), 'kill');

  const manager = createManager();
  const session = manager.createSession({ name: 'Aliases' });
  const id = session.id;
  manager.dispatchInput(id, '#var {matched} {no}');
  manager.dispatchInput(id, '#regexp {hello} {^hello$} {#var {matched} {yes}}');
  assert.equal(expand(manager, id, '$matched').value, 'yes');

  manager.dispatchInput(id, '#alias {x} {look}');
  manager.dispatchInput(id, '#killall {aliases}');
  assert.match(manager.dispatchInput(id, '#alias').messages.join('\n'), /No aliases/iu);
});

test('KILL can clear an individual TinTin list family without destroying unrelated definitions', () => {
  const manager = createManager();
  const session = manager.createSession({ name: 'Kill' });
  const id = session.id;
  manager.dispatchInput(id, '#alias {x} {look}');
  manager.dispatchInput(id, '#var {keep} {yes}');
  const result = manager.dispatchInput(id, '#kill {aliases}');
  assert.match(result.messages.join('\n'), /Cleared 1 alias/iu);
  assert.match(manager.dispatchInput(id, '#alias').messages.join('\n'), /No aliases/iu);
  assert.equal(expand(manager, id, '$keep').value, 'yes');
});

test('COMMANDS DIRS INFO and ZAP have useful safe NukeFire equivalents', () => {
  const manager = createManager();
  const one = manager.createSession({ name: 'One' });
  const two = manager.createSession({ name: 'Two' });

  assert.match(manager.dispatchInput(one.id, '#commands').messages.join('\n'), /TinTin-compatible commands/iu);
  assert.match(manager.dispatchInput(one.id, '#dirs').messages.join('\n'), /PATHDIR \{n\} \{s\} \{1\}/iu);
  assert.match(manager.dispatchInput(one.id, '#info').messages.join('\n'), /TinTin state for One/iu);

  const result = manager.dispatchInput(one.id, '#zap {Two}');
  assert.match(result.messages.join('\n'), /Zapped session Two/iu);
  assert.equal(manager.findSession('Two'), null);
});

test('loader preserves newly completed source-parity commands instead of reporting unsupported', () => {
  const prepared = prepareTinTinRead(`
#list {q} {size} {n}
#list {q} {get} {1} {x}
#list {q} {set} {1} {new}
#list {q} {sort} {alpha}
#regexp {hello} {^hello$} {#showme yes}
#commands
#dirs
#info
#zap {oldsession}
#killall {aliases}
`, {}, { filename: 'parity3.tin' });
  assert.equal(prepared.ok, true);
  assert.deepEqual(prepared.unsupported, []);
  assert.deepEqual(prepared.runtimeCommands.map((entry) => entry.directive), ['list','list','list','list','regex','commands','dirs','info','zap','kill']);
});

test('compatibility audit no longer labels completed source query/list forms as TODO', () => {
  const audit = auditTinTinSource(`
#alias {foo}
#action {hello}
#function {bar}
#list {q} {size} {n}
#ticker
#path
#commands
#dirs
#info
#zap {other}
`, { filename: 'parity3.tin' });
  assert.equal(audit.ok, true);
  const needs = audit.entries.filter((entry) => entry.classification === 'needs-implementation');
  assert.deepEqual(needs, []);
});
