'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const history = require('../src/history-navigation');

const entries = ['look', 'bash goblin', 'score', 'BASH orc', '#showme {ready}'];

test('history prefix matching is case-insensitive and anchored at the start', () => {
  assert.equal(history.matchesPrefix('bash goblin', 'ba'), true);
  assert.equal(history.matchesPrefix('BASH orc', 'bash'), true);
  assert.equal(history.matchesPrefix('say bash', 'bash'), false);
});

test('history navigation finds previous and next prefix matches without wrapping', () => {
  assert.equal(history.findPreviousHistoryIndex(entries, entries.length, 'ba'), 3);
  assert.equal(history.findPreviousHistoryIndex(entries, 3, 'ba'), 1);
  assert.equal(history.findPreviousHistoryIndex(entries, 1, 'ba'), -1);
  assert.equal(history.findNextHistoryIndex(entries, 1, 'ba'), 3);
  assert.equal(history.findNextHistoryIndex(entries, 3, 'ba'), -1);
});

test('blank prefixes preserve ordinary full-history traversal', () => {
  assert.equal(history.findPreviousHistoryIndex(entries, entries.length, ''), 4);
  assert.equal(history.findPreviousHistoryIndex(entries, 4, ''), 3);
  assert.equal(history.findNextHistoryIndex(entries, 3, ''), 4);
});

test('prefix search begins only with an unselected caret at the end', () => {
  assert.equal(history.shouldUsePrefixSearch('ba', 2, 2), true);
  assert.equal(history.shouldUsePrefixSearch('ba', 0, 2), false);
  assert.equal(history.shouldUsePrefixSearch('ba', 1, 1), false);
  assert.equal(history.shouldUsePrefixSearch('', 0, 0), false);
});
