'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { SessionManager } = require('../src/session-manager');
const { evaluateMathExpression } = require('../src/math-engine');
const { evaluateTinTinCondition } = require('../src/tintin-condition');
const { formatTinTinEcho } = require('../src/echo-format');
const {
  compileTinTinRegexp,
  matchTinTinRegexp,
  matchTinTinWhole,
  substituteTinTinCommandCaptures
} = require('../src/tintin-regexp');

function managerHarness() {
  return new SessionManager({
    connectionFactory: (handlers) => ({
      handlers,
      status: 'disconnected',
      disconnect() {},
      sendCommand() { return false; },
      setTerminalSize() { return true; },
      setClientPreferences() { return {}; }
    }),
    queueOptions: { intervalMs: 0 },
    handlers: { onSessionsChanged: () => {} }
  });
}

function internal(manager, session) {
  return manager.sessions.get(session.id || session);
}

function variableValue(manager, session, name) {
  const source = internal(manager, session);
  return manager.withTinTinSession(source, () => manager.variableEngine.get(name)?.value ?? '');
}

test('shared TinTin REGEXP keeps ordinary regex metacharacters literal and honors TinTin wildcards/raw groups', () => {
  assert.equal(matchTinTinWhole('Athos', 'Ath.*').matched, false);
  assert.equal(matchTinTinWhole('Athos', 'Ath%*').matched, true);
  assert.equal(matchTinTinWhole('Damage 123', 'Damage %d').matched, true);
  assert.equal(matchTinTinWhole('Athos', '{Ath(?:os|ena)}').matched, true);
  assert.equal(matchTinTinWhole('Athena', '{Ath(?:os|ena)}').matched, true);
  assert.equal(matchTinTinWhole('ATHOS', '%iathos').matched, true);
});

test('shared TinTin REGEXP preserves numbered/automatic captures and command & substitutions', () => {
  const matched = matchTinTinRegexp('Athos says hello there', '^%3 says %*$');
  assert.equal(matched.matched, true);
  assert.equal(matched.captures[0], 'Athos says hello there');
  assert.equal(matched.captures[3], 'Athos');
  assert.equal(matched.captures[4], 'hello there');
  assert.equal(substituteTinTinCommandCaptures('say &3 / &4 && done', matched.captures), 'say Athos / hello there & done');
});

test('#REGEXP SessionManager wrappers use the shared source-style matcher and capture map', () => {
  const manager = managerHarness();
  const tested = manager.matchTinTinRegex('Damage 123', '^Damage %1$');
  assert.equal(tested.matched, true);
  assert.equal(tested.captures[1], '123');
  assert.equal(manager.substituteTinTinRegexCommand('#variable {captured} {&1}', tested.captures), '#variable {captured} {123}');
});

test('GREP and BUFFER FIND share TinTin search semantics instead of raw JavaScript regexp semantics', () => {
  const manager = managerHarness();
  const source = {
    id: 'search19',
    terminalSize: { width: 120, height: 40 },
    tintinOutputHistory: ['Damage .*', 'Damage 123', 'Damage 456'],
    tintin: { config: { bufferSize: 5000 } }
  };

  const wildcard = manager.handleGrepCommand(['^Damage %d$'], source, { variablesExpanded: true });
  assert.equal(wildcard.some((line) => line === 'Damage 123'), true);
  assert.equal(wildcard.some((line) => line === 'Damage 456'), true);
  assert.equal(wildcard.some((line) => line === 'Damage .*'), false);

  const literal = manager.handleGrepCommand(['Damage .*'], source, { variablesExpanded: true });
  assert.equal(literal.some((line) => line === 'Damage .*'), true);
  assert.equal(literal.some((line) => line === 'Damage 123'), false);

  const find = manager.handleBufferCommand(['find', '^Damage %d$'], source, { variablesExpanded: true });
  assert.match(find.join('\n'), /Damage 456/u);
});

test('MATH adds veteran ^^ xor, TinTin time notation, and quoted TinTin-pattern comparisons', () => {
  assert.equal(evaluateMathExpression('1 ^^ 0').value, 1);
  assert.equal(evaluateMathExpression('1 ^^ 1').value, 0);
  assert.equal(evaluateMathExpression('1:02').value, 62);
  assert.equal(evaluateMathExpression('1:02:03').value, 3723);
  assert.equal(evaluateMathExpression('1:02:03:04').value, 93784);
  assert.equal(evaluateMathExpression('"Athos" == "Ath%*"').value, 1);
  assert.equal(evaluateMathExpression('"Athos" == "Ath.*"').value, 0);
  assert.equal(evaluateMathExpression('"anne" < "bob"').value, 1);
});

test('TinTin conditional == uses the same matcher while exact === remains literal', () => {
  const numeric = (expression) => evaluateMathExpression(expression);
  assert.equal(evaluateTinTinCondition('{Athos} == {Ath%*}', { evaluateNumeric: numeric }).value, true);
  assert.equal(evaluateTinTinCondition('{Athos} == {Ath.*}', { evaluateNumeric: numeric }).value, false);
  assert.equal(evaluateTinTinCondition('{Athos} === {Athos}', { evaluateNumeric: numeric }).value, true);
});

test('FORMAT adds the source-era safe transformation family while retaining bounded NukeFire output', () => {
  const options = {
    columns: 12,
    rows: 40,
    utc: true,
    nowMilliseconds: () => 0,
    nowMicroseconds: () => 123456,
    evaluateMath: (expression) => evaluateMathExpression(expression)
  };
  assert.equal(formatTinTinEcho('%l|%u|%n|%p|%r', ['HELLO', 'hello', 'hello', '  hi  ', 'abc'], options).text, 'hello|HELLO|Hello|hi|cba');
  assert.equal(formatTinTinEcho('%A %L', ['A', '<fff>red<reset>'], options).text, '65 3');
  assert.equal(formatTinTinEcho('%C %R', [], options).text, '12 40');
  assert.equal(formatTinTinEcho('%D/%M/%Y', ['0', '0', '0'], options).text, '01/01/1970');
  assert.equal(formatTinTinEcho('%h', ['HEAD'], options).text, '####HEAD####');
});

test('shared TinTin REGEXP blocks unsafe raw regex constructions and oversized patterns', () => {
  const unsafe = compileTinTinRegexp('{(a+)+}');
  assert.match(unsafe.error, /unsafe|unbounded/iu);
  const oversized = compileTinTinRegexp('x'.repeat(513));
  assert.match(oversized.error, /at most 512/u);
});

test('client help documents Pass-19 TinTin expression and format semantics without claiming complex %w parity', () => {
  const help = fs.readFileSync(path.join(__dirname, '..', 'src', 'client-command-help.js'), 'utf8');
  assert.match(help, /logical xor \^\^/u);
  assert.match(help, /time values such as 1:02:03/u);
  assert.match(help, /metacharacters are literal outside raw \{\.\.\.\} regexp groups/u);
  assert.match(help, /%h\/%l\/%n\/%p\/%r\/%u/u);
  assert.match(help, /%w word-wrap table output remains deferred/u);
});


test('#REGEXP handler preserves true/false branches and TinTin command captures', () => {
  const manager = Object.create(SessionManager.prototype);
  manager.commandPrefix = '#';
  manager.expandFunctionAndVariables = (value) => ({ value: String(value ?? ''), error: '' });
  let executed = [];
  manager.dispatchCommandSequence = (_source, commands) => {
    executed = [...commands];
    return { deliveries: [], messages: [], activateSessionId: '', controlFlow: '' };
  };

  manager.handleRegexCommand(
    ['Damage 123', '^Damage %1$', '#showme {hit &1}', '#showme {miss}'],
    {},
    { variablesExpanded: true }
  );
  assert.deepEqual(executed, ['#showme {hit 123}']);

  manager.handleRegexCommand(
    ['Quiet', '^Damage %1$', '#showme {bad}', '#showme {false branch}'],
    {},
    { variablesExpanded: true }
  );
  assert.deepEqual(executed, ['#showme {false branch}']);
});
