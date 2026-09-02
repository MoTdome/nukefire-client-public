'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const keybindings = require('../src/keybinding-engine');
const { ReaderReviewBuffer } = require('../src/reader-review');
const { CommunicationReviewCursor } = require('../src/communications-review');

function message(id, channel, text, sender = '') {
  return { id, channel, text, sender, timestamp: id * 1000, source: 'test' };
}

function event(code, modifiers = {}) {
  return {
    code,
    ctrlKey: modifiers.ctrl === true,
    altKey: modifiers.alt === true,
    shiftKey: modifiers.shift === true,
    metaKey: modifiers.meta === true,
    defaultPrevented: false,
    isComposing: false,
    repeat: false
  };
}

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

test('reader rapid recall returns the nth newest completed line without moving the stable cursor', () => {
  const review = new ReaderReviewBuffer();
  for (const line of ['one', 'two', 'three', 'four', 'five']) review.appendLine(line);

  review.latest();
  assert.equal(review.previous().text, 'four');
  const parked = review.current();

  assert.equal(review.recall(1).text, 'five');
  assert.equal(review.recall(3).text, 'three');
  assert.equal(review.current().seq, parked.seq);
  assert.equal(review.current().text, 'four');
});

test('reader rapid recall is bounded to the CR LINES last ten and fails quietly when unavailable', () => {
  const review = new ReaderReviewBuffer();
  for (let index = 1; index <= 12; index += 1) review.appendLine(`line-${index}`);

  assert.equal(review.recall(1).text, 'line-12');
  assert.equal(review.recall(9).text, 'line-4');
  assert.equal(review.recall(10).text, 'line-3');
  assert.equal(review.recall(11), null);
  assert.equal(review.recall(0), null);

  const short = new ReaderReviewBuffer();
  short.appendLine('only');
  assert.equal(short.recall(2), null);
});

test('communications rapid recall reads the selected view without moving that view cursor', () => {
  const messages = [
    message(1, 'gossip', 'g1'),
    message(2, 'tell', 't1', 'Athos'),
    message(3, 'gossip', 'g2'),
    message(4, 'gossip', 'g3')
  ];
  const review = new CommunicationReviewCursor();

  review.latest(messages, 'gossip');
  const parked = review.previous(messages, 'gossip');
  assert.equal(parked.text, 'g2');

  assert.equal(review.recall(messages, 'gossip', 1).text, 'g3');
  assert.equal(review.recall(messages, 'gossip', 3).text, 'g1');
  assert.equal(review.current(messages, 'gossip').id, parked.id);
});

test('last tell and last communication can be recalled independently of the selected channel state', () => {
  const messages = [
    message(1, 'gossip', 'g-old'),
    message(2, 'tell', 't-old', 'Athos'),
    message(3, 'gossip', 'g-new'),
    message(4, 'tell', 't-new', 'Juki'),
    message(5, 'grats', 'congrats')
  ];
  const review = new CommunicationReviewCursor();

  review.latest(messages, 'gossip');
  const parked = review.previous(messages, 'gossip');
  assert.equal(review.recall(messages, 'tell', 1).text, 't-new');
  assert.equal(review.recall(messages, 'all', 1).text, 'congrats');
  assert.equal(review.current(messages, 'gossip').id, parked.id);
});

test('communications recall is limited to nine and preserves empty-channel behavior', () => {
  const messages = Array.from({ length: 12 }, (_value, index) => message(index + 1, 'tell', `tell-${index + 1}`));
  const review = new CommunicationReviewCursor();

  assert.equal(review.recall(messages, 'tell', 1).text, 'tell-12');
  assert.equal(review.recall(messages, 'tell', 9).text, 'tell-4');
  assert.equal(review.recall(messages, 'tell', 10), null);
  assert.equal(review.recall(messages, 'gossip', 1), null);
});

test('rapid recall semantic actions normalize commandlessly and still obey protected native shortcuts', () => {
  for (const semantic of [
    { type: 'reader-review', id: 'recall-1' },
    { type: 'reader-review', id: 'recall-9' },
    { type: 'communications-review', id: 'recall-4' },
    { type: 'communications-review', id: 'last-tell' },
    { type: 'communications-review', id: 'last-communication' }
  ]) {
    const binding = keybindings.normalizeBinding({ code: 'F8', semantic });
    assert.ok(binding);
    assert.equal(binding.command, '');
  }

  assert.equal(keybindings.normalizeBinding({ code: 'F8', semantic: { type: 'reader-review', id: 'recall-10' } }), null);

  const protectedBinding = keybindings.normalizeKeybindingSettings({
    bindings: [{
      code: 'ArrowRight',
      modifiers: { ctrl: true, alt: true },
      semantic: { type: 'reader-review', id: 'recall-1' }
    }]
  });
  assert.equal(
    keybindings.findBindingForEvent(protectedBinding, event('ArrowRight', { ctrl: true, alt: true }), { platform: 'MacIntel' }),
    null
  );
});

test('renderer exposes rapid recall, last tell, and last communication through existing configurable review action types', () => {
  assert.match(renderer, /const RAPID_RECALL_ACTIONS = Object\.freeze/u);
  assert.match(renderer, /id: `recall-\$\{n\}`/u);
  assert.match(renderer, /id: 'last-tell', label: 'Last Tell'/u);
  assert.match(renderer, /id: 'last-communication', label: 'Last Communication'/u);
  assert.match(renderer, /recallReaderLine\(Number\(recallMatch\[1\]\)\)/u);
  assert.match(renderer, /recallCommunication\(Number\(recallMatch\[1\]\)\)/u);
  assert.match(renderer, /recallLastTell\(\)/u);
  assert.match(renderer, /recallLastCommunication\(\)/u);
});

test('rapid recall announcements are one-shot reads and do not enter the server command path', () => {
  assert.match(renderer, /function recallReaderLine\(n = 1\)/u);
  assert.match(renderer, /readerReview\?\.recall\?\.\(n\)/u);
  assert.match(renderer, /function recallCommunication\(n = 1\)/u);
  assert.match(renderer, /function recallLastTell\(\)/u);
  assert.match(renderer, /function recallLastCommunication\(\)/u);
  assert.match(renderer, /if \(clientReview\) \{[\s\S]*?executeClientReviewAction\(semantic\);[\s\S]*?return true;\n  \}\n  void sendCommand/u);
});
