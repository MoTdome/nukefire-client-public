'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { CONTROL_REQUEST_ACTIONS, normalizeControlRequest } = require('../src/semantic-controls');
const { backlogNotice } = require('../src/self-voice');
const { TUTORIAL_STEPS } = require('../src/reader-onboarding');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
const selfVoiceSource = fs.readFileSync(path.join(root, 'src', 'self-voice.js'), 'utf8');

test('exact terminal line review remains exposed as the semantic allowlist grows', () => {
  assert.ok(CONTROL_REQUEST_ACTIONS.size >= 37);
  const expected = [
    'reader.lines.current',
    'reader.lines.previous',
    'reader.lines.next',
    'reader.lines.latest',
    'reader.lines.recall'
  ];
  for (const action of expected) {
    assert.equal(CONTROL_REQUEST_ACTIONS.has(action), true, action);
    assert.equal(normalizeControlRequest({ schema: 1, id: 7, action, args: { value: '3' } })?.action, action);
  }
  assert.equal(CONTROL_REQUEST_ACTIONS.has('reader.lines.arbitrary'), false);
});

test('renderer routes CR LINES actions into the existing stable raw Reader Review buffer', () => {
  assert.match(renderer, /'reader\.lines\.current': reviewCurrentLine/u);
  assert.match(renderer, /'reader\.lines\.previous': reviewPreviousLine/u);
  assert.match(renderer, /'reader\.lines\.next': reviewNextLine/u);
  assert.match(renderer, /'reader\.lines\.latest': reviewLatestLine/u);
  assert.match(renderer, /request\.action === 'reader\.lines\.recall'[\s\S]*?amount < 1 \|\| amount > 10[\s\S]*?recallReaderLine\(amount\)/u);
});

test('raw line and category review speak requested text without cursor bookkeeping', () => {
  assert.match(renderer, /setReaderWorkspaceReviewStatus\(status\);\s*announce\(result\.text, \{ force: true \}\)/u);
  assert.match(renderer, /setReaderWorkspaceReviewStatus\(status\);\s*announce\(result\.text, \{ force: true, interrupt: true \}\)/u);
  assert.doesNotMatch(renderer, /announce\(`\$\{result\.text\}\. Reader line \$\{result\.position\} of \$\{result\.count\}/u);
  assert.doesNotMatch(renderer, /announce\(`\$\{result\.text\}\. \$\{result\.categoryLabel\}, message/u);
});

test('rapid raw-line recall speaks the exact line and leaves recall metadata in status only', () => {
  assert.match(renderer, /setReaderWorkspaceReviewStatus\(`Reader recall \$\{n\}: \$\{result\.text\}`\);\s*announce\(result\.text, \{ force: true \}\)/u);
});

test('pager assistance preserves the existing repeat-last pagination contract', () => {
  assert.match(renderer, /const repeatLastOnEnter = !state\.remoteEcho && \$\('#repeat-last-command-on-enter'\)\.checked/u);
  assert.match(renderer, /!typedCommand && !state\.remoteEcho && state\.paginationPending && !repeatLastOnEnter[\s\S]*?stopSelfVoiceNow\(\)[\s\S]*?sendCommand\('#cr', \{ recordHistory: false \}\)/u);
  assert.match(renderer, /const command = !typedCommand && repeatLastOnEnter && !state\.paginationPending[\s\S]*?state\.history\.at\(-1\)/u);
});

test('tutorial says F eight explicitly so speech does not pronounce F8 as fate', () => {
  const older = TUTORIAL_STEPS.find((step) => step.id === 'older');
  assert.ok(older);
  assert.match(older.text, /Press F eight/u);
  assert.doesNotMatch(older.text, /Press F8/u);
});

test('Self-Voice condensation notice is short and source limits it to one per sustained burst', () => {
  assert.equal(backlogNotice(1), '1 line condensed.');
  assert.equal(backlogNotice(12), '12 lines condensed.');
  assert.match(selfVoiceSource, /this\.suppressedLines > 0 && !this\.summaryWasLast/u);
  assert.match(selfVoiceSource, /this\.suppressedLines > 0 && this\.summaryWasLast && this\.liveQueue\.length === 0/u);
  assert.doesNotMatch(backlogNotice(12), /Full text remains in Reader Review\./u);
  assert.doesNotMatch(selfVoiceSource, /this\.summaryWasLast = false;\s*return this\._speakManaged\(text\);/u);
});
