'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionManager } = require('../src/session-manager');
const { AliasEngine } = require('../src/alias-engine');
const loader = require('../src/tintin-script-loader');
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
  const manager = new SessionManager({
    ...options,
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  const session = manager.createSession({ name: 'Veteran' });
  return { manager, session };
}

function emptyDefinitions() {
  return {
    aliases: [], variables: [], functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    events: { enabled: true, definitions: [] },
    classes: { activeStack: [], definitions: [] }
  };
}

test('anchored veteran aliases match exact input without broadening the safe pattern language', () => {
  const aliases = new AliasEngine();
  assert.ok(aliases.define('^fq$', 'say exact'));
  assert.equal(aliases.expandCommands('fq').commands[0], 'say exact');
  assert.equal(aliases.expandCommands('fq extra').matched, false);
  assert.equal(aliases.define('bad^anchor', 'look'), null);
  assert.equal(aliases.define('bad$anchor', 'look'), null);
});

test('anchored veteran alias captures preserve %1 word capture semantics', () => {
  const aliases = new AliasEngine();
  assert.ok(aliases.define('^phealdelay %1$', '#show {%1}'));
  const result = aliases.expandCommands('phealdelay reset');
  assert.equal(result.matched, true);
  assert.deepEqual(result.commands, ['#show {reset}']);
});

test('direct Alias definitions ignore trailing numeric priority metadata instead of appending it to the body', () => {
  const { manager, session } = makeManager();
  manager.dispatchInput(session.id, '#alias {foo} {look} {5}');
  assert.equal(manager.sessions.get(session.id).tintin.aliasEngine.get('foo')?.body, 'look');
});

test('READ accepts anchored aliases and strips trailing Alias priority metadata', () => {
  const result = loader.prepareTinTinRead('#alias {^foo %1$} {say %1} {5}', emptyDefinitions(), { filename: 'veteran.tin' });
  assert.equal(result.ok, true);
  assert.equal(result.definitions.aliases[0].name, '^foo %1$');
  assert.equal(result.definitions.aliases[0].body, 'say %1');
});

test('LIST CREATE FIND DELETE and CLEAR use bounded private table storage', () => {
  const { manager, session } = makeManager();
  manager.dispatchInput(session.id, '#variable {raw} {alpha;beta;gamma}');
  manager.dispatchInput(session.id, '#list {items} {create} {$raw}');
  manager.dispatchInput(session.id, '#list {items} {find} {beta} {found}');
  assert.equal(manager.sessions.get(session.id).tintin.variableEngine.get('found')?.value, '2');
  manager.dispatchInput(session.id, '#list {items} {delete} {1}');
  assert.deepEqual(manager.sessions.get(session.id).tintin.variableEngine.tableEntries('items').map((entry) => entry.record.value), ['beta', 'gamma']);
  manager.dispatchInput(session.id, '#list {items} {clear}');
  assert.deepEqual(manager.sessions.get(session.id).tintin.variableEngine.tableEntries('items'), []);
});

test('REPLACE performs bounded literal replacement in one private variable', () => {
  const { manager, session } = makeManager();
  manager.dispatchInput(session.id, '#variable {broken} {one two-two}');
  manager.dispatchInput(session.id, '#replace {broken} { } {;}');
  manager.dispatchInput(session.id, '#replace {broken} {-} {;}');
  assert.equal(manager.sessions.get(session.id).tintin.variableEngine.get('broken')?.value, 'one;two;two');
});

test('SEND bypasses Alias re-entry while retaining normal variable expansion and MUD delivery', async () => {
  const { manager, session } = makeManager();
  await manager.connectSession(session.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(session.id, '#alias {fq} {say alias-fired}');
  manager.dispatchInput(session.id, '#variable {cmd} {fq}');
  manager.dispatchInput(session.id, '#send {$cmd}');
  assert.deepEqual(manager.sessions.get(session.id).connection.sent, ['fq']);
});

test('PARSE iterates characters through the bounded command pipeline', async () => {
  const { manager, session } = makeManager();
  await manager.connectSession(session.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(session.id, '#parse {abc} {char} {#send $char}');
  assert.deepEqual(manager.sessions.get(session.id).connection.sent, ['a', 'b', 'c']);
});

test('named DELAY can be cancelled exactly with UNDELAY', () => {
  const timers = [];
  const cleared = [];
  const { manager, session } = makeManager({
    delaySetTimer: (callback, ms) => { const timer = { callback, ms }; timers.push(timer); return timer; },
    delayClearTimer: (timer) => cleared.push(timer)
  });
  manager.dispatchInput(session.id, '#delay {pheal_timeout_7} {#show {late}} {.5}');
  const record = [...manager.sessions.get(session.id).delays.values()][0];
  assert.equal(record.name, 'pheal_timeout_7');
  assert.equal(record.seconds, 0.5);
  manager.dispatchInput(session.id, '#undelay {pheal_timeout_7}');
  assert.equal(manager.sessions.get(session.id).delays.size, 0);
  assert.deepEqual(cleared, [timers[0]]);
});

test('LINE SUB VAR eagerly freezes veteran named-delay substitutions before scheduling', () => {
  const { manager, session } = makeManager({ delaySetTimer: (callback, ms) => ({ callback, ms }), delayClearTimer: () => {} });
  manager.dispatchInput(session.id, '#variable {serial} {9}');
  manager.dispatchInput(session.id, '#variable {target} {Moylen}');
  manager.dispatchInput(session.id, '#variable {secs} {.75}');
  manager.dispatchInput(session.id, '#line sub var #delay {job_$serial} {heal $target} {$secs}');
  const record = [...manager.sessions.get(session.id).delays.values()][0];
  assert.equal(record.name, 'job_9');
  assert.equal(record.seconds, 0.75);
  assert.deepEqual(record.commands, ['heal Moylen']);
});

test('SWITCH selects one CASE and falls back to DEFAULT through the bounded pipeline', () => {
  const { manager, session } = makeManager();
  manager.dispatchInput(session.id, '#switch {"on"} {#case {"off"} {#var {chosen} {bad}};#case {"on"} {#var {chosen} {good}};#default {#var {chosen} {default}}}');
  assert.equal(manager.sessions.get(session.id).tintin.variableEngine.get('chosen')?.value, 'good');
  manager.dispatchInput(session.id, '#switch {"other"} {#case {"on"} {#var {chosen} {bad}};#default {#var {chosen} {default}}}');
  assert.equal(manager.sessions.get(session.id).tintin.variableEngine.get('chosen')?.value, 'default');
});

test('audit recognizes the Heretic compatibility cluster as implemented while keeping unsafe host surfaces blocked', () => {
  const source = [
    '#alias {^fq$} {#send fq;#undelay {job_1}}',
    '#list {pending} {find} {fq} {index}',
    '#list {pending} {delete} {$index}',
    '#list {pending} {clear}',
    '#line sub var #delay {job_$index} {look} {.5}',
    '#switch {"on"} {#case {"on"} {#show {yes}};#default {#show {no}}}',
    '#2 look',
    '#system {echo nope}',
    '#chat {init} {5555}'
  ].join('\n');
  const result = audit.auditTinTinSource(source, { filename: 'heretic-sanitized.tin' });
  assert.equal(result.entries.filter((entry) => entry.classification === audit.CLASSIFICATIONS.NEEDS).length, 0);
  assert.equal(result.entries.filter((entry) => entry.classification === audit.CLASSIFICATIONS.BLOCKED).length, 2);
});

test('CR sends exactly one blank command and READ preserves top-level CR as safe runtime work', async () => {
  const { manager, session } = makeManager();
  await manager.connectSession(session.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(session.id, '#cr');
  assert.deepEqual(manager.sessions.get(session.id).connection.sent, ['']);

  const prepared = loader.prepareTinTinRead('#cr', emptyDefinitions(), { filename: 'return.tin' });
  assert.equal(prepared.ok, true);
  assert.deepEqual(prepared.runtimeCommands, [{ directive: 'cr', line: 1, command: '#cr' }]);
  assert.equal(prepared.unsupported.length, 0);
});

test('repeated CR commands inside a delayed veteran batch preserve every blank line in order', async () => {
  const timers = [];
  const { manager, session } = makeManager({
    delaySetTimer: (callback, ms) => { const timer = { callback, ms }; timers.push(timer); return timer; },
    delayClearTimer: () => {}
  });
  await manager.connectSession(session.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(session.id, '#delay {4} {#cr;#cr;wall}');
  assert.equal(timers.length, 1);
  timers[0].callback();
  assert.deepEqual(manager.sessions.get(session.id).connection.sent, ['', '', 'wall']);

  const audited = audit.auditTinTinSource('#delay {6} {#cr;#cr;#cr;eu;addmat;dep}', { filename: 'outlander-sanitized.tin' });
  const crEntries = audited.entries.filter((entry) => entry.directive === 'cr');
  assert.equal(crEntries.length, 3);
  assert.ok(crEntries.every((entry) => entry.classification === audit.CLASSIFICATIONS.TRANSLATED));
});
