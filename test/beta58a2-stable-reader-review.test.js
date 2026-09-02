'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const readerReviewApi = require('../src/reader-review');
const sessionRuntimeApi = require('../src/session-runtime');

const { ReaderReviewBuffer } = readerReviewApi;

function plainAnsiApi() {
  return {
    AnsiParser: class {
      parse(text) { return [{ text: String(text || ''), style: null }]; }
      reset() {}
    }
  };
}

function runtime(name, options = {}) {
  return sessionRuntimeApi.createSessionRuntime({ id: name, name }, {
    ansiApi: plainAnsiApi(),
    readerReviewApi,
    maxCharacters: options.maxCharacters || 2_000_000
  });
}

function append(record, text) {
  return sessionRuntimeApi.appendText(record, text, {
    stripAnsi: (value) => String(value || ''),
    useTransformedPlainText: true
  });
}

test('reader review remains anchored to the same sequence while new lines arrive', () => {
  const review = new ReaderReviewBuffer();
  for (const line of ['alpha', 'beta', 'gamma']) review.appendLine(line);

  assert.equal(review.latest().text, 'gamma');
  const parked = review.previous();
  assert.equal(parked.text, 'beta');
  assert.equal(parked.seq, 2);

  review.appendLine('delta');
  review.appendLine('epsilon');

  const current = review.current();
  assert.equal(current.text, 'beta');
  assert.equal(current.seq, 2);
  assert.equal(current.position, 2);
  assert.equal(current.count, 5);
});

test('reader review clamps an evicted cursor to the oldest surviving logical line', () => {
  const review = new ReaderReviewBuffer({ maxLines: 3, maxCharacters: 1000 });
  review.appendLine('one');
  review.appendLine('two');
  review.appendLine('three');
  review.latest();
  review.previous();
  assert.equal(review.current().text, 'two');

  review.appendLine('four');
  assert.equal(review.current().text, 'two');
  review.appendLine('five');

  const current = review.current();
  assert.equal(current.text, 'three');
  assert.equal(current.atOldest, true);
  assert.equal(current.seq, 3);
});

test('reader review is bounded by the session character budget as well as line count', () => {
  const review = new ReaderReviewBuffer({ maxCharacters: 8, maxLines: 50_000 });
  review.appendLine('1234');
  review.appendLine('5678');
  review.appendLine('90');
  assert.deepEqual(review.snapshot().map((line) => line.text), ['5678', '90']);
});

test('session runtime creates completed reader lines across fragmented network chunks', () => {
  const record = runtime('hero');
  append(record, 'First line\nPartial');
  append(record, ' line\nThird line\n');

  assert.deepEqual(
    record.readerReview.snapshot().map((line) => line.text),
    ['First line', 'Partial line', 'Third line']
  );
  assert.equal(record.lastCompleteLine, 'Third line');
});

test('reader review remains private to each NukeFire session', () => {
  const alpha = runtime('alpha');
  const beta = runtime('beta');
  append(alpha, 'Alpha one\nAlpha two\n');
  append(beta, 'Beta one\n');

  assert.equal(alpha.readerReview.latest().text, 'Alpha two');
  assert.equal(alpha.readerReview.previous().text, 'Alpha one');
  assert.equal(beta.readerReview.latest().text, 'Beta one');
  append(beta, 'Beta two\n');
  assert.equal(alpha.readerReview.current().text, 'Alpha one');
});

test('clear output clears reader review without affecting future sequence behavior', () => {
  const record = runtime('hero');
  append(record, 'Old one\nOld two\n');
  record.readerReview.latest();
  sessionRuntimeApi.clearOutput(record);
  assert.deepEqual(record.readerReview.snapshot(), []);
  assert.equal(record.readerReview.current(), null);

  append(record, 'New one\n');
  const latest = record.readerReview.latest();
  assert.equal(latest.text, 'New one');
  assert.equal(latest.seq, 1);
});

test('renderer exposes Previous, Next, and Latest reader review controls without replacing native output review', () => {
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

  assert.match(html, /id="focus-output"[^>]*>Review Output</u);
  assert.match(html, /id="reader-review-current"[^>]*>Current Reader Line</u);
  assert.match(html, /id="reader-review-previous"[^>]*>Previous Reader Line</u);
  assert.match(html, /id="reader-review-next"[^>]*>Next Reader Line</u);
  assert.match(html, /id="reader-review-latest"[^>]*>Latest Reader Line</u);
  assert.match(html, /src="\.\.\/src\/reader-review\.js"/u);
  assert.match(renderer, /function reviewCurrentLine\(\)/u);
  assert.match(renderer, /function reviewPreviousLine\(\)/u);
  assert.match(renderer, /function reviewNextLine\(\)/u);
  assert.match(renderer, /function reviewLatestLine\(\)/u);
  assert.match(renderer, /Reader line \$\{result\.position\} of \$\{result\.count\}/u);
});
