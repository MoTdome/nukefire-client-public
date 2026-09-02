'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { compileActionPattern, substituteActionCommand, ActionEngine } = require('../src/action-engine');
const { substituteAliasBody } = require('../src/alias-engine');
const { evaluateMathExpression } = require('../src/math-engine');
const { evaluateTinTinCondition } = require('../src/tintin-condition');

const numeric = (expression) => evaluateMathExpression(expression);

test('Action patterns capture numbered TinTin wildcards through %99', () => {
  const matcher = compileActionPattern('^%1 gives %12 to %99$');
  const match = matcher.exec('Athos gives credits to Anne');
  assert.ok(match);
  assert.equal(match.groups.capture1, 'Athos');
  assert.equal(match.groups.capture12, 'credits');
  assert.equal(match.groups.capture99, 'Anne');
});

test('unnumbered %* takes the next unused capture number', () => {
  const matcher = compileActionPattern('^%3 says %* to %*$');
  const match = matcher.exec('Athos says hello there to Anne');
  assert.ok(match);
  assert.equal(match.groups.capture3, 'Athos');
  assert.equal(match.groups.capture4, 'hello there');
  assert.equal(match.groups.capture5, 'Anne');
});

test('legacy %0 in a trigger pattern becomes capture zero for Athos-style Actions', () => {
  const engine = new ActionEngine();
  engine.define('^%0 has summoned you!$', '#showme {%0 summoned}');
  const result = engine.match('Athos has summoned you!');
  assert.equal(result.commands[0], '#showme {Athos summoned}');
});

test('body %0 remains complete matched text when the trigger does not define capture zero', () => {
  const matcher = compileActionPattern('^Danger %1$');
  const match = matcher.exec('Danger north');
  assert.ok(match);
  assert.equal(substituteActionCommand('say %0 / %1', match[0], { 1: match.groups.capture1 }), 'say Danger north / north');
});

test('repeated numbered trigger captures match the same text', () => {
  const matcher = compileActionPattern('^%1 versus %1$');
  assert.ok(matcher.exec('Athos versus Athos'));
  assert.equal(matcher.exec('Athos versus Anne'), null);
});

test('alias arguments use one word per %1-%99, all words for %0, and preserve %% literally', () => {
  assert.equal(
    substituteAliasBody('#ACTION {The trail of %%0 leads %%1};tell %1 %2;%0', ['Rambo', 'hello', 'there']),
    '#ACTION {The trail of %0 leads %1};tell Rambo hello;Rambo hello there'
  );
});

test('TinTin string conditions support regex == and != plus exact === and !==', () => {
  assert.deepEqual(evaluateTinTinCondition('{Athos} == {Ath%*}', { evaluateNumeric: numeric }), { ok: true, value: true, error: '' });
  assert.equal(evaluateTinTinCondition('{Athos} == {Ath.*}', { evaluateNumeric: numeric }).value, false);
  assert.equal(evaluateTinTinCondition('"athos" != "anne"', { evaluateNumeric: numeric }).value, true);
  assert.equal(evaluateTinTinCondition('{Athos} === {Athos}', { evaluateNumeric: numeric }).value, true);
  assert.equal(evaluateTinTinCondition('{Athos} !== {athos}', { evaluateNumeric: numeric }).value, true);
});

test('Athos opponent exclusion chain evaluates as a TinTin boolean string expression', () => {
  const allowed = '"dragon" != "athos" && "dragon" != "aramis" && "dragon" != "dartagnan" && "dragon" != "anne" && "dragon" != "milady"';
  const blocked = '"athos" != "athos" && "athos" != "aramis"';
  assert.equal(evaluateTinTinCondition(allowed, { evaluateNumeric: numeric }).value, true);
  assert.equal(evaluateTinTinCondition(blocked, { evaluateNumeric: numeric }).value, false);
});

test('existing bounded numeric conditions continue through the math evaluator', () => {
  assert.equal(evaluateTinTinCondition('45 >= 40 && 3 > 1', { evaluateNumeric: numeric }).value, true);
  const bad = evaluateTinTinCondition('1 / 0', { evaluateNumeric: numeric });
  assert.equal(bad.ok, false);
  assert.match(bad.error, /division by zero/u)
});
