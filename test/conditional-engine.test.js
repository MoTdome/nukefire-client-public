'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseConditionalStatement,
  collectConditionalChain
} = require('../src/conditional-engine');

test('parses inline true and false branches with protected semicolons', () => {
  assert.deepEqual(parseConditionalStatement('#if {$hp > 25} {bash; kick} {flee; recall}', '#'), {
    matched: true,
    directive: 'if',
    condition: '$hp > 25',
    commands: 'bash; kick',
    fallback: 'flee; recall',
    error: ''
  });
});

test('collects adjacent elseif and else statements as one bounded chain', () => {
  const chain = collectConditionalChain([
    '#if {0} {say one}',
    '#elseif {1} {say two}',
    '#else {say three}',
    'look'
  ], 0, '#');
  assert.equal(chain.error, '');
  assert.equal(chain.nextIndex, 3);
  assert.deepEqual(chain.branches.map((branch) => branch.condition), ['0', '1']);
  assert.equal(chain.fallback, 'say three');
});

test('rejects malformed and overlong conditional chains', () => {
  assert.match(parseConditionalStatement('#if {1}', '#').error, /Usage/u);
  assert.match(parseConditionalStatement('#else {one} {two}', '#').error, /Usage/u);
  assert.match(collectConditionalChain([
    '#if {0} {one} {inline}',
    '#elseif {1} {two}'
  ], 0, '#').error, /cannot continue/u);
  assert.match(collectConditionalChain([
    '#if {0} {one}',
    '#elseif {0} {two}',
    '#elseif {1} {three}'
  ], 0, '#', { maxBranches: 2 }).error, /at most 2/u);
});

test('respects a custom client prefix', () => {
  assert.equal(parseConditionalStatement('~if {1} {look}', '~').matched, true);
  assert.equal(parseConditionalStatement('#if {1} {look}', '~').matched, false);
});
