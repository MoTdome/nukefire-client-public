'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { SessionManager } = require('../src/session-manager');
const { prepareTinTinRead } = require('../src/tintin-script-loader');
const { buildTinTinScriptImportAnalysis, mergeTinTinScriptImportSelection } = require('../src/tintin-importer');
const { prepareTinTinFragment } = require('../src/tintin-script-writer');
const { formatTinTinEcho } = require('../src/echo-format');

class FakeConnection {
  constructor(handlers) {
    this.handlers = handlers;
    this.status = 'disconnected';
    this.sent = [];
  }
  disconnect() { this.status = 'disconnected'; }
  sendCommand(command) { this.sent.push(command); return true; }
  sendGmcp() { return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
}

function managerWithTimers() {
  const tickerTimers = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    tickerSetTimer: (callback, milliseconds) => {
      const timer = { callback, milliseconds };
      tickerTimers.push(timer);
      return timer;
    },
    tickerClearTimer: () => {}
  });
  return { manager, tickerTimers };
}

function expansion(manager, sessionId, text) {
  const session = manager.sessions.get(sessionId);
  return manager.withTinTinSession(session, () => manager.variableExpansion(text));
}

test('AutoHealX nested queue lists support empty creation, dynamic paths, counts, find, and negative delete', () => {
  const { manager } = managerWithTimers();
  const main = manager.createSession({ name: 'Cyrus' });
  const id = main.id;

  manager.dispatchInput(id, '#alias {queue_init} {#foreach {priority;heal;any;combat;nco;move} {_tmp} {#if {!&{_queue[$_tmp]}} {#list {_queue[$_tmp]} create}}}');
  let result = manager.dispatchInput(id, 'queue_init');
  assert.equal(result.messages.filter((message) => /created \(0 items\)/u.test(message)).length, 6);
  assert.equal(expansion(manager, id, '&{_queue[heal]}').value, '3'); // TinTin returns the 1-based ALPHA node index, not a boolean.
  assert.equal(expansion(manager, id, '&{_queue[heal][]}').value, '0');

  manager.dispatchInput(id, '#list {_queue[heal]} add {heal}');
  manager.dispatchInput(id, '#list {_queue[heal]} add {refresh Cyrus}');
  assert.equal(expansion(manager, id, '&{_queue[heal][]}').value, '2');
  assert.equal(expansion(manager, id, '$_queue[heal][-1]').value, 'refresh Cyrus');

  result = manager.dispatchInput(id, '#list {_queue[heal]} find {heal} {sindex}');
  assert.match(result.messages.join('\n'), /stored 1 in sindex/u);
  assert.equal(expansion(manager, id, '$sindex').value, '1');

  manager.dispatchInput(id, '#list {_queue[heal]} delete {-1}');
  assert.equal(expansion(manager, id, '&{_queue[heal][]}').value, '1');
  assert.equal(expansion(manager, id, '$_queue[heal][-1]').value, 'heal');

  manager.dispatchInput(id, 'queue_init');
  assert.equal(expansion(manager, id, '&{_queue[heal][]}').value, '1', 'queue_init must not erase an existing queue');
});

test('AutoHealX queue runner may use #RETURN to stop the current Alias body', () => {
  const { manager } = managerWithTimers();
  const main = manager.createSession({ name: 'Cyrus' });
  const id = main.id;
  manager.dispatchInput(id, '#alias {queueRunner} {#var {ran} {first};#return;#var {ran} {wrong}}');
  const result = manager.dispatchInput(id, 'queueRunner');
  assert.equal(result.controlFlow, 'return');
  assert.equal(expansion(manager, id, '$ran').value, 'first');
  assert.equal(manager.dispatchInput(id, '#return').messages.some((message) => /only valid inside/u.test(message)), true);
});

test('AutoHealX Functions may use bounded LIST FIND, REGEX, SWITCH, and micro-epoch FORMAT', () => {
  const { manager } = managerWithTimers();
  const main = manager.createSession({ name: 'Cyrus' });
  const id = main.id;

  manager.dispatchInput(id, '#list {spellValidPositions} create Flying Fighting Mounted Standing Swimming');
  manager.dispatchInput(id, '#function {spell_can_cast} {#var {result} {1};#list {spellValidPositions} find {$MSDP_POSITION} {check};#if {$check == 0} {#var {result} {0}};#regex {$PLAYER_FLAGS} {-Knees-} {#var {result} {0}}}');
  manager.dispatchInput(id, '#function {spellDelay} {#switch {"%1"} {#case {"heal"} {#var {result} {4000}};#case {"refresh"} {#var {result} {5500}};#default {#var {result} {2000}}}}');
  manager.dispatchInput(id, '#function {upoch} {#format {result} {%U}}');
  manager.dispatchInput(id, '#function {mpoch} {#math {result} {@upoch{} / 1000}}');

  const session = manager.sessions.get(id);
  session.connection.handlers.onGmcp({ packageName: 'Char.Status', body: { name: 'Cyrus', position: 5 } });
  let functionResult = manager.withTinTinSession(session, () => manager.expandFunctions('@spell_can_cast{}', session, {}));
  assert.equal(functionResult.error, '');
  assert.equal(functionResult.value, '1');

  session.connection.handlers.onGmcp({ packageName: 'Char.Status', body: { name: 'Cyrus', position: 2 } });
  functionResult = manager.withTinTinSession(session, () => manager.expandFunctions('@spell_can_cast{}', session, {}));
  assert.equal(functionResult.value, '0');

  assert.equal(manager.withTinTinSession(session, () => manager.expandFunctions('@spellDelay{heal}', session, {})).value, '4000');
  assert.equal(manager.withTinTinSession(session, () => manager.expandFunctions('@spellDelay{refresh}', session, {})).value, '5500');
  assert.equal(manager.withTinTinSession(session, () => manager.expandFunctions('@spellDelay{unknown}', session, {})).value, '2000');

  const before = Date.now();
  const times = manager.withTinTinSession(session, () => manager.expandFunctions('@upoch{} @mpoch{}', session, {}));
  const after = Date.now();
  const [micro, milli] = times.value.split(' ').map(Number);
  const microMilliseconds = Math.trunc(micro / 1000);
  assert.equal(Number.isSafeInteger(micro), true);
  assert.equal(Number.isSafeInteger(milli), true);
  assert.ok(microMilliseconds >= before && microMilliseconds <= after);
  assert.ok(milli >= before && milli <= after);

  assert.equal(formatTinTinEcho('%U', [], { nowMicroseconds: () => 1_234_567_890_123_000 }).text, '1234567890123000');
});

test('structured GMCP feeds legacy MSDP variable names without persisting protocol state', () => {
  const { manager } = managerWithTimers();
  const main = manager.createSession({ name: 'Cyrus' });
  const id = main.id;
  const session = manager.sessions.get(id);

  session.connection.handlers.onGmcp({
    packageName: 'Char.Vitals',
    body: { hp: 700, mhp: 1000, mana: 80, mmana: 100, move: 55, mmove: 90 }
  });
  session.connection.handlers.onGmcp({
    packageName: 'Char.Status',
    body: { name: 'Cyrus', position: 5, level: 54, class: 'Cyborg', exp: 123456, alignment: -50, gold: 99 }
  });

  const result = expansion(manager, id,
    '$MSDP_HEALTH/$MSDP_HEALTH_MAX $MSDP_MANA $MSDP_MOVEMENT/$MSDP_MOVEMENT_MAX $MSDP_POSITION $MSDP_CHARACTER_NAME | ' +
    '$GMCP_HEALTH/$GMCP_HEALTH_MAX $GMCP_POSITION $GMCP_CHARACTER_NAME');
  assert.equal(result.value, '700/1000 80 55/90 Fighting Cyrus | 700/1000 Fighting Cyrus');

  const snapshot = manager.snapshotTinTinContext(session.tintin);
  assert.equal(snapshot.variables.some((record) => /^(?:MSDP|GMCP)_/iu.test(record.name)), false);
  assert.equal(session.tintin.protocolVariables.has('player_flags'), false, 'PLAYER_FLAGS must not be guessed from unrelated GMCP state');
});

test('AutoHealX load-time setup is preserved in source order and #tick canonicalizes to #ticker', () => {
  const source = `
#class autohealx kill
#class autohealx open
#alias queue_init {#foreach {priority;heal;any;combat;nco;move} {_tmp} {#if {!&{_queue[$_tmp]}} {#list {_queue[$_tmp]} create}}}
#alias autoheal {#showme monitor}
#list spellValidPositions create Flying Fighting Mounted Standing Swimming
queue_init
#tick {autohealx queue runner} {queueRunner} {0.2}
#tick {autohealx monitor} {autoheal} {1}
#class autohealx close
`;
  const prepared = prepareTinTinRead(source, {}, { filename: 'autohealx.tin' });
  assert.equal(prepared.ok, true);
  assert.deepEqual(prepared.unsupported, []);
  assert.deepEqual(prepared.runtimeCommands.map((entry) => entry.command), [
    '#list spellValidPositions create Flying Fighting Mounted Standing Swimming',
    'queue_init',
    '#ticker {autohealx queue runner} {queueRunner} {0.2}',
    '#ticker {autohealx monitor} {autoheal} {1}'
  ]);
  assert.ok(prepared.runtimeCommands.every((entry) => entry.persistOnImport === true));

  const analysis = buildTinTinScriptImportAnalysis(prepared);
  assert.equal(analysis.summary.unsupported, 0);
  assert.equal(analysis.summary.loadCommands, 4);
  assert.ok(analysis.items.filter((item) => item.category === 'loadCommands').every((item) => item.selected === true));

  const merged = mergeTinTinScriptImportSelection(analysis, {}, { duplicatePolicy: 'replace' });
  const fragment = prepareTinTinFragment(merged.definitions, merged.selectedItems, { commandPrefix: '#' });
  assert.equal(fragment.ok, true);
  assert.equal(fragment.loadCommandCount, 4);
  const listAt = fragment.content.indexOf('#list spellValidPositions');
  const initAt = fragment.content.indexOf('\nqueue_init\n');
  const runnerAt = fragment.content.indexOf('#ticker {autohealx queue runner}');
  const monitorAt = fragment.content.indexOf('#ticker {autohealx monitor}');
  assert.ok(listAt >= 0 && listAt < initAt && initAt < runnerAt && runnerAt < monitorAt);
  assert.doesNotMatch(fragment.content, /#tick \{/u);
});
