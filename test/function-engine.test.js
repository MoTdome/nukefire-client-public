'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  FunctionEngine,
  normalizeFunctionName,
  splitFunctionArguments,
  functionCallAt,
  substituteFunctionArguments
} = require('../src/function-engine');

test('function definitions normalize, replace, list, and preserve classes', () => {
  const engine = new FunctionEngine({ maxFunctions: 2 });
  assert.equal(normalizeFunctionName(' Percent '), 'percent');
  assert.equal(normalizeFunctionName('9bad'), '');
  assert.deepEqual(engine.define('Percent', '#return {%1}', 'Combat'), {
    name: 'percent', body: '#return {%1}', scope: 'global', className: 'combat'
  });
  assert.equal(engine.define('percent', '#return {%2}', '').body, '#return {%2}');
  assert.deepEqual(engine.define('other', '#return {ok}', ''), { name: 'other', body: '#return {ok}', scope: 'global' });
  assert.equal(engine.list().length, 2);
  assert.equal(engine.delete('percent'), true);
  assert.equal(engine.get('percent'), null);
});

test('function calls parse nested braces, quotes, and escaped separators', () => {
  const source = 'before @join{{one;two};"three;four";five\\;six} after';
  const call = functionCallAt(source, source.indexOf('@'));
  assert.equal(call.name, 'join');
  assert.deepEqual(call.arguments, ['one;two', 'three;four', 'five\\;six']);
  assert.equal(call.error, '');
  assert.equal(source.slice(call.start, call.end), call.raw);
  assert.match(functionCallAt('@join{one', 0).error, /unterminated/u);
});

test('function argument splitting retains empty positions and caps argument count', () => {
  assert.deepEqual(splitFunctionArguments('one;;three').arguments, ['one', '', 'three']);
  assert.match(splitFunctionArguments('a;b;c', { maxArguments: 2 }).error, /at most 2/u);
  assert.match(splitFunctionArguments('a;{b', {}).error, /unterminated/u);
});

test('positional substitution supports percent zero through ninety-nine and escaping', () => {
  const args = Array.from({ length: 12 }, (_, index) => `a${index + 1}`);
  assert.equal(
    substituteFunctionArguments('%0|%1|%12|%99|%%1|\\%2', args),
    `${args.join(';')}|a1|a12||%1|%2`
  );
});
