'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ReaderReviewBuffer } = require('../src/reader-review');
const sessionRuntime = require('../src/session-runtime');
const presets = require('../src/reader-presets');
const keybindings = require('../src/keybinding-engine');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

function runtime(id = 'hero') {
  return sessionRuntime.createSessionRuntime({ id, name: id }, {
    readerReviewApi: require('../src/reader-review')
  });
}

test('rapid CR LINES recall skips prompt-only boundaries while full Reader Review retains them', () => {
  const review = new ReaderReviewBuffer({ maxCharacters: 10_000, maxLines: 100 });
  review.appendLine("Alpha gossips, 'one'");
  review.appendLine('<100h 100m 100v >', { rapidRecall: false });
  review.appendLine("Beta gossips, 'two'");
  review.appendLine('<100h 100m 100v >', { rapidRecall: false });
  review.appendLine('The door is closed.');
  review.appendLine('<100h 100m 100v >', { rapidRecall: false });

  assert.deepEqual(review.snapshot().map((line) => line.text), [
    "Alpha gossips, 'one'", '<100h 100m 100v >',
    "Beta gossips, 'two'", '<100h 100m 100v >',
    'The door is closed.', '<100h 100m 100v >'
  ]);
  assert.equal(review.recall(1).text, 'The door is closed.');
  assert.equal(review.recall(2).text, "Beta gossips, 'two'");
  assert.equal(review.recall(3).text, "Alpha gossips, 'one'");
});

test('rapid CR LINES recall supports the documented tenth meaningful line', () => {
  const review = new ReaderReviewBuffer({ maxCharacters: 10_000, maxLines: 100 });
  for (let n = 1; n <= 10; n += 1) {
    review.appendLine(`line ${n}`);
    review.appendLine(`prompt ${n} >`, { rapidRecall: false });
  }
  assert.equal(review.recall(1).text, 'line 10');
  assert.equal(review.recall(10).text, 'line 1');
  assert.equal(review.recall(11), null);
});

test('session prompt-boundary metadata preserves prompt text but excludes it from rapid recall', () => {
  const record = runtime();
  sessionRuntime.appendText(record, "Southpaw gossips, 'testing'\n");
  sessionRuntime.appendText(record, '<100h 100m 100v >');
  sessionRuntime.commitBoundary(record, { rapidRecall: false });
  sessionRuntime.appendText(record, 'The door is closed.\n');

  assert.deepEqual(record.readerReview.snapshot().map((line) => line.text), [
    "Southpaw gossips, 'testing'", '<100h 100m 100v >', 'The door is closed.'
  ]);
  assert.equal(record.readerReview.recall(1).text, 'The door is closed.');
  assert.equal(record.readerReview.recall(2).text, "Southpaw gossips, 'testing'");
});

test('official Reader line preset maps Alt 1 through 9 to local commandless rapid recall', () => {
  const records = presets.readerLineRecallRecords();
  assert.deepEqual(records.map((record) => record.code), [
    'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'
  ]);
  assert.deepEqual(records.map((record) => record.semantic?.id), [
    'recall-1', 'recall-2', 'recall-3', 'recall-4', 'recall-5',
    'recall-6', 'recall-7', 'recall-8', 'recall-9'
  ]);
  assert.ok(records.every((record) => record.modifiers.alt === true));
  assert.ok(records.every((record) => record.semantic?.type === 'reader-review'));
  assert.ok(records.every((record) => record.command === '' && record.worksWhileTyping === true));

  const normalized = records.map((record) => keybindings.normalizeBinding(record));
  assert.ok(normalized.every(Boolean));
  assert.ok(normalized.every((record) => record.command === ''));
});

test('official MUSH movement preset installs the requested Alt I J K L U N layout', () => {
  const records = presets.mushMovementRecords();
  assert.deepEqual(records.map((record) => [record.code, record.command]), [
    ['KeyI', 'north'], ['KeyJ', 'west'], ['KeyK', 'south'],
    ['KeyL', 'east'], ['KeyU', 'up'], ['KeyN', 'down']
  ]);
  assert.ok(records.every((record) => record.modifiers.alt === true));
  assert.ok(records.every((record) => record.worksWhileTyping === true));
});

test('MUSH settings install familiar review controls without overwriting custom conflicts', () => {
  const original = keybindings.normalizeKeybindingSettings({
    enabled: true,
    bindings: [
      { id: 'custom-alt-c', code: 'KeyC', modifiers: { alt: true }, command: 'consider', worksWhileTyping: true }
    ]
  });
  const result = presets.installMushSettingsPreset(original, keybindings);
  const byId = new Map(result.settings.bindings.map((record) => [record.id, record]));
  assert.equal(result.lines.installed.length, 9);
  assert.equal(result.movement.installed.length, 6);
  assert.equal(result.controls.installed.length, 12);
  assert.equal(result.controls.skipped.length, 1);
  assert.ok(byId.has('custom-alt-c'));
  assert.deepEqual(byId.get('reader-mush-mute').semantic, { type: 'accessibility', id: 'toggle-self-voice-mute' });
  assert.deepEqual(byId.get('reader-mush-last-tell').semantic, { type: 'communications-review', id: 'last-tell' });
  assert.deepEqual(byId.get('reader-mush-vitals').semantic, { type: 'accessibility', id: 'read-vitals' });
  assert.deepEqual(byId.get('reader-mush-category-previous').semantic, { type: 'reader-history', id: 'category-previous' });
  assert.deepEqual(byId.get('reader-mush-category-next').semantic, { type: 'reader-history', id: 'category-next' });
  assert.deepEqual(byId.get('reader-mush-message-previous').semantic, { type: 'reader-history', id: 'previous' });
  assert.deepEqual(byId.get('reader-mush-message-next').semantic, { type: 'reader-history', id: 'next' });
  assert.deepEqual(byId.get('reader-mush-message-latest').semantic, { type: 'reader-history', id: 'latest' });
});

test('official key preset install protects occupied shortcuts and removal touches only preset-owned bindings', () => {
  const original = keybindings.normalizeKeybindingSettings({
    enabled: true,
    bindings: [
      { id: 'southpaw-alt-1', code: 'Digit1', modifiers: { alt: true }, command: 'score', worksWhileTyping: true },
      { id: 'southpaw-alt-i', code: 'KeyI', modifiers: { alt: true }, command: 'scan', worksWhileTyping: true },
      { id: 'custom-heal', code: 'KeyH', modifiers: { alt: true }, command: 'heal', worksWhileTyping: true }
    ]
  });

  const installed = presets.installMushAccessibilityPreset(original, keybindings);
  assert.equal(installed.lines.installed.length, 8);
  assert.equal(installed.lines.skipped.length, 1);
  assert.equal(installed.movement.installed.length, 5);
  assert.equal(installed.movement.skipped.length, 1);
  assert.equal(installed.settings.bindings.find((record) => record.signature === 'alt+Digit1').id, 'southpaw-alt-1');
  assert.equal(installed.settings.bindings.find((record) => record.signature === 'alt+KeyI').id, 'southpaw-alt-i');
  assert.ok(installed.settings.bindings.some((record) => record.id === 'custom-heal'));

  const status = presets.officialShortcutPresetStatus(installed.settings, keybindings);
  assert.deepEqual(status, { lines: 8, movement: 5 });

  const removed = presets.removeMushAccessibilityPreset(installed.settings, keybindings);
  assert.equal(removed.removed, 13);
  assert.deepEqual(removed.settings.bindings.map((record) => record.id), [
    'southpaw-alt-1', 'southpaw-alt-i', 'custom-heal'
  ]);
});

test('renderer keeps CR KEYS bounded and marks gameplay prompt boundaries non-rapid without deleting Reader Review', () => {
  assert.match(renderer, /function applyReaderKeysCommand\(value\)/u);
  assert.match(renderer, /text === 'lines' \|\| text === 'line'/u);
  assert.match(renderer, /text === 'movement' \|\| text === 'move'/u);
  assert.match(renderer, /text === 'mush'/u);
  assert.match(renderer, /\^remove\\s\+\(lines\?\|movement\|move\|mush\)\$/u);
  assert.match(renderer, /request\.action === 'reader\.keys'[\s\S]*?applyReaderKeysCommand\(request\.args\?\.value \|\| 'status'\)/u);
  assert.match(renderer, /looksLikeNukeFirePlayingPrompt\(boundaryText\)[\s\S]*?commitBoundary\?\.\(record, \{ rapidRecall: !playingPrompt \}\)/u);
  assert.match(renderer, /type === 'reader-review'[\s\S]*?recallReaderLine\(Number\(recallMatch\[1\]\)\)/u);
  assert.match(renderer, /request\.action === 'reader\.load\.mushsettings'[\s\S]*?applyMushSettingsPreset\(\)/u);
  assert.match(renderer, /Official shortcuts active: \$\{installed\} of 28/u);
  assert.match(renderer, /Alt\+C': 'Copy Reviewed'/u);
  assert.match(renderer, /applyMushSettingsPreset\(\);[\s\S]*?announce\(result\.message, \{ force: true, interrupt: true \}\)/u);
});
