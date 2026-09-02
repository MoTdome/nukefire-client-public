'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateMathExpression,
  tokenizeMathExpression,
  MAX_MATH_DICE,
  MAX_MATH_DIE_SIDES
} = require('../src/math-engine');

test('evaluates precedence, parentheses, powers, modulo, and roots', () => {
  assert.equal(evaluateMathExpression('2 + 3 * 4').text, '14');
  assert.equal(evaluateMathExpression('(2 + 3) * 4').text, '20');
  assert.equal(evaluateMathExpression('2 ** 8').text, '256');
  assert.equal(evaluateMathExpression('10 % 3').text, '1');
  assert.equal(evaluateMathExpression('81 // 2').text, '9');
  assert.equal(evaluateMathExpression('-8 // 3').text, '-2');
});

test('uses integer division unless a decimal operand makes the expression floating point', () => {
  assert.equal(evaluateMathExpression('5 / 2').text, '2');
  assert.equal(evaluateMathExpression('5.0 / 2').text, '2.5');
  assert.equal(evaluateMathExpression('1.5 + 2').text, '3.5');
});

test('evaluates comparisons, booleans, and lazy ternaries', () => {
  assert.equal(evaluateMathExpression('3 > 2 && 4 == 4').text, '1');
  assert.equal(evaluateMathExpression('0 || 0').text, '0');
  assert.equal(evaluateMathExpression('0 ? 1 / 0 : 7').text, '7');
  assert.equal(evaluateMathExpression('1 ? 9 : 1 / 0').text, '9');
  assert.equal(evaluateMathExpression('!0 + !5').text, '1');
});

test('supports bounded deterministic dice expressions', () => {
  const rolls = [0, 0.5, 0.999999];
  let index = 0;
  const result = evaluateMathExpression('3 d 6', { random: () => rolls[index++] });
  assert.equal(result.text, '11');
  assert.match(evaluateMathExpression(`${MAX_MATH_DICE + 1}d6`).error, /dice count/u);
  assert.match(evaluateMathExpression(`1d${MAX_MATH_DIE_SIDES + 1}`).error, /die sides/u);
});

test('supports bounded bitwise operators and shifts', () => {
  assert.equal(evaluateMathExpression('5 & 3').text, '1');
  assert.equal(evaluateMathExpression('5 | 2').text, '7');
  assert.equal(evaluateMathExpression('5 ^ 1').text, '4');
  assert.equal(evaluateMathExpression('1 << 4').text, '16');
  assert.equal(evaluateMathExpression('16 >> 2').text, '4');
  assert.equal(evaluateMathExpression('~0').text, '-1');
});

test('rejects unsafe, malformed, and nonnumeric expressions without partial results', () => {
  assert.match(evaluateMathExpression('1 / 0').error, /division by zero/u);
  assert.match(evaluateMathExpression('(-1) // 2').error, /even root/u);
  assert.match(evaluateMathExpression('2 +').error, /ended unexpectedly/u);
  assert.match(evaluateMathExpression('process.exit()').error, /unsupported text/u);
  assert.match(evaluateMathExpression('1 << 99').error, /shift count/u);
});

test('tokenizer accepts grouped numbers and rejects bad grouping', () => {
  assert.equal(evaluateMathExpression('1,000 + 2').text, '1002');
  assert.equal(tokenizeMathExpression('1,00 + 2').error.length > 0, true);
});
