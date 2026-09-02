'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { VariableEngine } = require('../src/variable-engine');
const { SessionManager, SessionCommandQueue, DEFAULT_MAX_WHILE_ITERATIONS, DEFAULT_MAX_LIST_ITEMS, DEFAULT_MAX_PENDING_COMMANDS } = require('../src/session-manager');
const { prepareTinTinRead, formatTinTinReadReport } = require('../src/tintin-script-loader');
const { clientCommandHelp } = require('../src/client-command-help');
const { prepareTinTinWrite } = require('../src/tintin-script-writer');

class FakeConnection {
  constructor(handlers) {
    this.handlers = handlers;
    this.sent = [];
    this.status = 'disconnected';
  }
  async connect(host, port) {
    this.status = 'connected';
    this.handlers.onStatus?.({ state: 'connected', host, port, message: 'connected' });
  }
  disconnect() { this.status = 'disconnected'; }
  sendCommand(command) {
    if (this.status !== 'connected') return false;
    this.sent.push(command);
    return true;
  }
  sendGmcp() { return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
}

function managerWithImmediateQueue(options = {}) {
  return new SessionManager({
    ...options,
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0, maxPending: DEFAULT_MAX_PENDING_COMMANDS }
  });
}

test('TinTin table paths and positive/negative list indexes resolve from private variables', () => {
  const variables = new VariableEngine();
  variables.define('session[name]', 'noth');
  variables.define('_dig[1]', '1');
  variables.define('_dig[2]', '5');
  variables.define('_dig[3]', '5');
  assert.equal(variables.expand('$session[name]').value, 'noth');
  assert.equal(variables.expand('$_dig[+1]$_dig[-2]$_dig[-1]').value, '155');
  assert.equal(variables.get('_dig[-1]').name, '_dig[3]');
  assert.equal(variables.delete('_dig'), true);
  assert.equal(variables.expand('$_dig[-1]').value, '$_dig[-1]');
});

test('runtime #VARIABLE accepts brace-table declarations and direct nested assignments', () => {
  const manager = managerWithImmediateQueue();
  const main = manager.createSession({ name: 'Noth' });
  let result = manager.dispatchInput(main.id, '#variable {session} {{ScreenCols}{104}{ScreenRows}{58}{name}{noth}}');
  assert.match(result.messages.join('\n'), /Set table session: 3 nested variables/u);
  assert.equal(manager.dispatchInput(main.id, '#showme {$session[name]}').messages.length, 0);
  result = manager.dispatchInput(main.id, '#variable {session[name]} {leader}');
  assert.deepEqual(result.messages, ['Set variable session[name]: leader']);
  assert.equal(manager.sessions.get(main.id).tintin.variableEngine.get('session[name]').value, 'leader');
});

test('#LIST TOKENIZE creates a bounded numeric table compatible with negative indexes', () => {
  const manager = managerWithImmediateQueue();
  const main = manager.createSession({ name: 'Amon' });
  manager.dispatchInput(main.id, '#variable {num} {155}');
  const result = manager.dispatchInput(main.id, '#list {_dig} {tokenize} {$num}');
  assert.deepEqual(result.messages, ['List _dig tokenized into 3 characters.']);
  const variables = manager.sessions.get(main.id).tintin.variableEngine;
  assert.equal(variables.expand('$_dig[-2]$_dig[-1]').value, '55');
  assert.equal(DEFAULT_MAX_LIST_ITEMS, 512);
});

test('bounded #WHILE reevaluates TinTin conditions and #CONTINUE skips the rest of an iteration', async () => {
  const manager = managerWithImmediateQueue();
  const main = manager.createSession({ name: 'Amon' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(main.id, '#variable {n} {1}');
  const result = manager.dispatchInput(main.id, '#while {$n <= 6} {#math {n} {$n + 1};#if {$n == 3} {#continue};say $n}');
  assert.equal(result.messages.some((message) => /only valid inside/u.test(message)), false);
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, ['say 2', 'say 4', 'say 5', 'say 6', 'say 7']);
});

test('#CONTINUE outside a bounded loop is inert and explanatory', () => {
  const manager = managerWithImmediateQueue();
  const main = manager.createSession({ name: 'Main' });
  assert.deepEqual(manager.dispatchInput(main.id, '#continue').messages, ['#continue is only valid inside a bounded loop.']);
});

test('while safety limit stops a still-true condition instead of hanging the client', () => {
  const manager = managerWithImmediateQueue({ maxWhileIterations: 3 });
  const main = manager.createSession({ name: 'Main' });
  manager.dispatchInput(main.id, '#variable {n} {0}');
  const result = manager.dispatchInput(main.id, '#while {1} {#math {n} {$n + 1}}');
  assert.match(result.messages.join('\n'), /safety limit of 3 iterations/u);
  assert.equal(manager.sessions.get(main.id).tintin.variableEngine.get('n').value, '3');
  assert.equal(DEFAULT_MAX_WHILE_ITERATIONS, 256);
});

test('loader expands TinTin brace-table variables into deterministic nested records', () => {
  const result = prepareTinTinRead(`#variable {session}\n{\n  {ScreenCols} {104}\n  {ScreenRows} {58}\n  {name} {noth}\n}\n`, {});
  assert.equal(result.ok, true);
  assert.deepEqual(result.definitions.variables, [
    { name: 'session[screencols]', value: '104', scope: 'global' },
    { name: 'session[screenrows]', value: '58', scope: 'global' },
    { name: 'session[name]', value: 'noth', scope: 'global' }
  ]);
  assert.equal(result.counts.variables, 3);
});

test('#SPLIT is a recognized compatibility no-op in imported files', () => {
  const result = prepareTinTinRead('#split 3 1\n#alias {x} {look}\n', {});
  assert.equal(result.ok, true);
  assert.equal(result.counts.aliases, 1);
  assert.equal(result.unsupportedCounts.split, undefined);
  assert.equal(result.compatibilityNoops.filter((entry) => entry.directive === 'split').length, 1);
  assert.match(formatTinTinReadReport(result, 'main.tin').join('\n'), /SPLIT COMMAND SAFELY IGNORED; NUKEFIRE USES THE COMMAND INPUT BAR/u);
});

test('typed #SPLIT is harmless and never changes NukeFire input geometry', () => {
  const manager = managerWithImmediateQueue();
  const main = manager.createSession({ name: 'Main' });
  const result = manager.dispatchInput(main.id, '#split {0} {4}');
  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(result.messages, ['#split ignored: NukeFire already uses a dedicated command input bar.']);
});

test('writer round-trips flattened table variables as valid bracketed TinTin variables', () => {
  const written = prepareTinTinWrite({
    variables: [
      { name: 'session[name]', value: 'noth', scope: 'global' },
      { name: '_dig[1]', value: '1', scope: 'global' }
    ]
  });
  assert.equal(written.ok, true);
  const read = prepareTinTinRead(written.content, {});
  assert.equal(read.ok, true);
  assert.equal(read.definitions.variables.some((record) => record.name === 'session[name]' && record.value === 'noth'), true);
  assert.equal(read.definitions.variables.some((record) => record.name === '_dig[1]' && record.value === '1'), true);
});


test('client help documents bounded While/List compatibility and intentional Split no-op behavior', () => {
  assert.match(clientCommandHelp('while').join('\n'), /stops after 256 iterations/u);
  assert.match(clientCommandHelp('list').join('\n'), /\$name\[-1\]/u);
  assert.match(clientCommandHelp('split').join('\n'), /dedicated command input bar/u);
});


test('Amon/Noth-style show_color control flow works inside a normal imported Alias', async () => {
  assert.equal(DEFAULT_MAX_PENDING_COMMANDS, 256);
  const timers = [];
  const queued = new SessionCommandQueue(() => true, {
    intervalMs: 80,
    maxPending: DEFAULT_MAX_PENDING_COMMANDS,
    setTimer: (callback) => { timers.push(callback); return timers.length; },
    clearTimer: () => {}
  });
  assert.equal(queued.enqueueBatch(Array.from({ length: 215 }, (_, index) => `say ${index + 1}`)), true);
  assert.equal(queued.size, 214);
  assert.equal(queued.enqueueBatch(Array.from({ length: 43 }, () => 'overflow')), false);

  const manager = managerWithImmediateQueue();
  const main = manager.createSession({ name: 'Noth' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  const definition = manager.dispatchInput(main.id, '#alias {show_color} {#variable {n} {%1};#variable {max_n} {%2};#while {$n <= $max_n} {say $n;#list {_dig} {tokenize} {$n};#math {n} {$n + 1};#if {$_dig[-1] == 5} {#math {n} {$n + 4};#continue}}}');
  assert.equal(definition.messages.some((message) => /Defined alias show_color/u.test(message)), true);
  manager.dispatchInput(main.id, 'show_color 1 15');
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, [
    'say 1', 'say 2', 'say 3', 'say 4', 'say 5',
    'say 10', 'say 11', 'say 12', 'say 13', 'say 14', 'say 15'
  ]);
});

test('legacy prompt/tab/unsplit UI commands stay local and harmless', () => {
  const manager = managerWithImmediateQueue();
  const main = manager.createSession({ name: 'Main' });
  for (const command of ['#prompt {^Prompt$} {%0} {-2}', '#tab signAdd', '#unsplit']) {
    const result = manager.dispatchInput(main.id, command);
    assert.deepEqual(result.deliveries, []);
  }
});
