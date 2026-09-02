'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ReaderHistory } = require('../src/reader-history');
const { CONTROL_REQUEST_ACTIONS, normalizeControlRequest } = require('../src/semantic-controls');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

const NEW_ACTIONS = [
  'reader.category.next',
  'reader.category.previous',
  'reader.category.status',
  'reader.review.repeat',
  'reader.review.first',
  'reader.review.back',
  'reader.review.forward'
];

test('Beta.62a1 keeps Reader command parity in the hardcoded client allowlist', () => {
  assert.ok(CONTROL_REQUEST_ACTIONS.size >= 32);
  for (const action of NEW_ACTIONS) {
    assert.equal(CONTROL_REQUEST_ACTIONS.has(action), true, action);
    assert.deepEqual(normalizeControlRequest({ schema: 1, id: 62, action, args: { value: '10' } }), {
      schema: 1,
      id: 62,
      action,
      args: { value: '10' }
    });
  }
});

test('Reader History exposes oldest and bounded relative movement without losing per-category cursor state', () => {
  const history = new ReaderHistory();
  for (let i = 1; i <= 25; i += 1) history.append('main', `line ${i}`);

  assert.equal(history.latest().position, 25);
  assert.equal(history.move(-10).position, 15);
  assert.equal(history.current().text, 'line 15');
  assert.equal(history.move(-10).position, 5);
  assert.equal(history.move(-10).position, 1);
  assert.equal(history.move(10).position, 11);
  assert.equal(history.oldest().position, 1);
  assert.equal(history.move(10).position, 11);
  assert.equal(history.latest().position, 25);
});

test('Reader History jump operations remain isolated per category', () => {
  const history = new ReaderHistory();
  for (let i = 1; i <= 20; i += 1) history.append('main', `main ${i}`);
  for (let i = 1; i <= 20; i += 1) history.append('comm:tell', `tell ${i}`, { label: 'Tell' });

  history.latest('main');
  history.move(-10, 'main');
  history.select('comm:tell');
  history.oldest();
  history.move(10);
  assert.equal(history.current().text, 'tell 11');
  history.select('main');
  assert.equal(history.current().text, 'main 10');
});

test('renderer routes CR category commands through the same Reader History category functions as native shortcuts', () => {
  assert.match(renderer, /'reader\.category\.next': readerHistoryNextCategory/u);
  assert.match(renderer, /'reader\.category\.previous': readerHistoryPreviousCategory/u);
  assert.match(renderer, /'reader\.category\.status': readerHistoryCategoryStatus/u);
});

test('renderer keeps expanded review controls on Reader History and bounds ten-message jumps', () => {
  assert.match(renderer, /'reader\.review\.repeat': readerHistoryRepeat/u);
  assert.match(renderer, /'reader\.review\.first': readerHistoryFirst/u);
  assert.match(renderer, /request\.action === 'reader\.review\.back'[\s\S]*?amount !== 10/u);
  assert.match(renderer, /readerHistoryMove\(request\.action === 'reader\.review\.back' \? -10 : 10\)/u);
});
