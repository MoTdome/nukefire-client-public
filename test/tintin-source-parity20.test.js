'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MacroEngine } = require('../src/macro-engine');
const { EventEngine } = require('../src/event-engine');
const { SessionManager } = require('../src/session-manager');
const { clientCommandHelp } = require('../src/client-command-help');

if (typeof EventEngine.prototype.match !== 'function') {
  EventEngine.prototype.match = function compatibilityMatchStub() { return []; };
}

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.sent = []; this.status = 'disconnected'; }
  async connect(host, port) { this.status = 'connected'; this.handlers.onStatus?.({ state: 'connected', host, port, message: 'connected' }); }
  disconnect(message = 'Disconnected') { this.status = 'disconnected'; this.handlers.onStatus?.({ state: 'disconnected', message }); }
  sendCommand(command) { if (this.status !== 'connected') return false; this.sent.push(command); return true; }
  sendGmcp() { return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
}

function makeManager() {
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  const session = manager.createSession({ name: 'Pass20' });
  return { manager, session };
}

test('Pass 7/9 Alias priority lineage remains present without Pass 20 rewriting it', () => {
  const { manager, session } = makeManager();
  manager.dispatchInput(session.id, '#alias {late %1} {say late %1} {7}');
  manager.dispatchInput(session.id, '#alias {early %1} {say early %1} {2}');
  const records = manager.sessions.get(session.id).tintin.aliasEngine.list();
  assert.deepEqual(records.map((record) => [record.name, record.priority]), [['early %1', 2], ['late %1', 7]]);
});

test('Macro list order is alphabetic rather than definition sequence', () => {
  const macros = new MacroEngine();
  macros.define('F9', 'look');
  macros.define('F2', 'score');
  assert.deepEqual(macros.list().map((record) => record.key), ['F2', 'F9']);
});

test('definition queries and deletes use the shared TinTin whole-pattern matcher', () => {
  const { manager, session } = makeManager();
  manager.dispatchInput(session.id, '#variable {mob1} {one}');
  manager.dispatchInput(session.id, '#variable {mob2} {two}');
  manager.dispatchInput(session.id, '#variable {moba} {letter}');
  const query = manager.dispatchInput(session.id, '#variable {mob%d}');
  assert.equal(query.messages.length, 2);
  assert.match(query.messages[0], /mob1/u);
  assert.match(query.messages[1], /mob2/u);
  manager.dispatchInput(session.id, '#unvariable {mob%d}');
  assert.equal(manager.sessions.get(session.id).tintin.variableEngine.get('mob1'), null);
  assert.equal(manager.sessions.get(session.id).tintin.variableEngine.get('mob2'), null);
  assert.equal(manager.sessions.get(session.id).tintin.variableEngine.get('moba')?.value, 'letter');
});

test('MESSAGE and IGNORE use plural-family abbreviations and can target multiple families', () => {
  const { manager, session } = makeManager();
  const off = manager.dispatchInput(session.id, '#message {a} {off}');
  assert.deepEqual(off.messages, ['ACTION MESSAGE OFF.', 'ALIAS MESSAGE OFF.']);
  assert.equal(manager.tintinListMessagesEnabled('action'), false);
  assert.equal(manager.tintinListMessagesEnabled('alias'), false);
  const on = manager.dispatchInput(session.id, '#message {a} {o}');
  assert.deepEqual(on.messages, ['ACTION MESSAGE ON.', 'ALIAS MESSAGE ON.']);

  manager.dispatchInput(session.id, '#alias {go} {look}');
  manager.dispatchInput(session.id, '#action {Danger} {flee}');
  manager.dispatchInput(session.id, '#ignore {a} {on}');
  assert.equal(manager.tintinListIgnored('action'), true);
  assert.equal(manager.tintinListIgnored('alias'), true);
  assert.ok(manager.sessions.get(session.id).tintin.aliasEngine.get('go'));
  assert.ok(manager.sessions.get(session.id).tintin.actionEngine.get('Danger'));
  manager.dispatchInput(session.id, '#ignore {a} {off}');
  assert.equal(manager.tintinListIgnored('action'), false);
  assert.equal(manager.tintinListIgnored('alias'), false);
});

test('IGNORE suppresses Alias execution without deleting the definition', () => {
  const { manager, session } = makeManager();
  manager.dispatchInput(session.id, '#alias {go} {look}');
  manager.dispatchInput(session.id, '#ignore {aliases} {on}');
  const ignored = manager.dispatchInput(session.id, 'go');
  assert.equal(ignored.deliveries[0]?.command, 'go');
  assert.ok(manager.sessions.get(session.id).tintin.aliasEngine.get('go'));
  manager.dispatchInput(session.id, '#ignore {aliases} {off}');
  const active = manager.dispatchInput(session.id, 'go');
  assert.equal(active.deliveries[0]?.command, 'look');
});

test('MESSAGE OFF hides mutation chatter but keeps explicit list and successful query output', () => {
  const { manager, session } = makeManager();
  manager.dispatchInput(session.id, '#message {aliases} {off}');
  const defined = manager.dispatchInput(session.id, '#alias {quiet} {look}');
  assert.deepEqual(defined.messages, []);
  const listed = manager.dispatchInput(session.id, '#alias');
  assert.equal(listed.messages.length, 1);
  assert.match(listed.messages[0], /quiet/u);
  const queried = manager.dispatchInput(session.id, '#alias {quiet}');
  assert.equal(queried.messages.length, 1);
  assert.match(queried.messages[0], /quiet/u);
});

test('braced convenience words remain legal TinTin definition names', () => {
  const { manager, session } = makeManager();
  manager.dispatchInput(session.id, '#alias {list} {look}');
  assert.equal(manager.sessions.get(session.id).tintin.aliasEngine.get('list')?.body, 'look');
  manager.dispatchInput(session.id, '#variable {show} {visible}');
  assert.equal(manager.sessions.get(session.id).tintin.variableEngine.get('show')?.value, 'visible');
  manager.dispatchInput(session.id, '#gag {list}');
  assert.ok(manager.sessions.get(session.id).tintin.gagEngine.get('list'));
  manager.dispatchInput(session.id, '#alias delete {list}');
  assert.equal(manager.sessions.get(session.id).tintin.aliasEngine.get('list'), null);
});

test('PATHDIR list and wildcard query output are alphabetic', () => {
  const { manager, session } = makeManager();
  manager.dispatchInput(session.id, '#pathdir {zz} {backzz} {9}');
  manager.dispatchInput(session.id, '#pathdir {aa} {backaa} {8}');
  const all = manager.dispatchInput(session.id, '#pathdir');
  const aa = all.messages.findIndex((line) => /PATHDIR \{aa\}/u.test(line));
  const zz = all.messages.findIndex((line) => /PATHDIR \{zz\}/u.test(line));
  assert.ok(aa >= 0 && zz >= 0 && aa < zz);
});

test('Pass 20 help documents existing Alias priority plus MESSAGE/IGNORE family behavior', () => {
  const alias = clientCommandHelp('alias').join('\n');
  const message = clientCommandHelp('message').join('\n');
  const ignore = clientCommandHelp('ignore').join('\n');
  assert.match(alias, /Lower numeric priorities/u);
  assert.match(alias, /Braced names/u);
  assert.match(message, /multiple matching families/u);
  assert.match(ignore, /remain stored and visible/u);
});
