'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CommunicationReviewCursor } = require('../src/communications-review');

function message(id, channel, text, sender = '') {
  return { id, channel, text, sender, timestamp: id * 1000, source: 'test' };
}

test('communications review stays parked on the same message id while new same-channel traffic arrives', () => {
  const messages = Array.from({ length: 10 }, (_, index) => message(index + 1, 'gossip', `m${index}`));
  const review = new CommunicationReviewCursor();

  assert.equal(review.latest(messages, 'gossip').text, 'm9');
  assert.equal(review.previous(messages, 'gossip').text, 'm8');
  assert.equal(review.previous(messages, 'gossip').text, 'm7');
  const parkedId = review.current(messages, 'gossip').id;

  messages.push(message(11, 'gossip', 'm10'));
  messages.push(message(12, 'gossip', 'm11'));

  const current = review.current(messages, 'gossip');
  assert.equal(current.id, parkedId);
  assert.equal(current.text, 'm7');
  assert.equal(review.previous(messages, 'gossip').text, 'm6');
});

test('selected channel review ignores other channels and all view follows global message ids', () => {
  const messages = [
    message(1, 'gossip', 'g1'),
    message(2, 'tell', 't1', 'Athos'),
    message(3, 'gossip', 'g2'),
    message(4, 'tell', 't2', 'Athos')
  ];
  const review = new CommunicationReviewCursor();

  assert.equal(review.latest(messages, 'gossip').text, 'g2');
  assert.equal(review.previous(messages, 'gossip').text, 'g1');
  assert.equal(review.latest(messages, 'tell').text, 't2');
  assert.equal(review.previous(messages, 'tell').text, 't1');
  assert.equal(review.latest(messages, 'all').text, 't2');
  assert.equal(review.previous(messages, 'all').text, 'g2');
});

test('each channel remembers its own parked message when the player switches tabs', () => {
  const messages = [
    message(1, 'gossip', 'g-old'),
    message(2, 'tell', 't-old'),
    message(3, 'gossip', 'g-new'),
    message(4, 'tell', 't-new')
  ];
  const review = new CommunicationReviewCursor();

  review.latest(messages, 'gossip');
  assert.equal(review.previous(messages, 'gossip').text, 'g-old');
  review.latest(messages, 'tell');
  assert.equal(review.previous(messages, 'tell').text, 't-old');

  assert.equal(review.current(messages, 'gossip').text, 'g-old');
  assert.equal(review.current(messages, 'tell').text, 't-old');
});

test('evicted communications clamp a parked cursor to the oldest surviving message', () => {
  const messages = [
    message(1, 'gossip', 'one'),
    message(2, 'gossip', 'two'),
    message(3, 'gossip', 'three')
  ];
  const review = new CommunicationReviewCursor();
  review.latest(messages, 'gossip');
  assert.equal(review.previous(messages, 'gossip').text, 'two');

  messages.splice(0, 2);
  messages.push(message(4, 'gossip', 'four'));
  const current = review.current(messages, 'gossip');
  assert.equal(current.id, 3);
  assert.equal(current.text, 'three');
  assert.equal(current.atOldest, true);
});

test('clear resets every communications review cursor', () => {
  const messages = [message(1, 'gossip', 'one'), message(2, 'tell', 'two')];
  const review = new CommunicationReviewCursor();
  review.latest(messages, 'gossip');
  review.latest(messages, 'tell');
  review.clear();

  messages.push(message(3, 'gossip', 'three'));
  assert.equal(review.current(messages, 'gossip').text, 'three');
  assert.equal(review.current(messages, 'tell').text, 'two');
});

test('renderer keeps Communications review for reader workflows without exposing it in ordinary Comms controls', () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

  assert.match(html, /src="\.\.\/src\/communications-review\.js"/u);
  assert.doesNotMatch(html, /id="communications-review-(?:current|older|newer|latest)"/u);
  assert.doesNotMatch(html, /Review selected Communications channel/u);
  assert.doesNotMatch(renderer, /\$\('#communications-review-(?:current|older|newer|latest)'\)\.addEventListener/u);

  for (const id of [
    'reader-workspace-comms-current',
    'reader-workspace-comms-older',
    'reader-workspace-comms-newer',
    'reader-workspace-comms-latest',
    'reader-workspace-last-tell',
    'reader-workspace-last-communication'
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }

  assert.match(renderer, /new communicationsReviewApi\.CommunicationReviewCursor\(\)/u);
  assert.match(renderer, /function reviewCurrentCommunication\(\)/u);
  assert.match(renderer, /function reviewOlderCommunication\(\)/u);
  assert.match(renderer, /function reviewNewerCommunication\(\)/u);
  assert.match(renderer, /function reviewLatestCommunication\(\)/u);
  assert.match(renderer, /'communications-review': Object\.freeze\(\[/u);
  assert.match(renderer, /reader-workspace-comms-older[^\n]*addEventListener\('click', reviewOlderCommunication\)/u);
  assert.match(renderer, /reader-workspace-last-tell[^\n]*addEventListener\('click', recallLastTell\)/u);
  assert.match(renderer, /reader-workspace-last-communication[^\n]*addEventListener\('click', recallLastCommunication\)/u);
  assert.match(renderer, /state\.communications\.review\?\.clear\?\.\(\)/u);
  assert.match(renderer, /MAX_COMMUNICATION_MESSAGES = 500/u);
});
