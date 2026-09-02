'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

function mushSettingsBlock() {
  const start = renderer.indexOf('function applyMushSettingsPreset()');
  const end = renderer.indexOf('\n\nfunction applyFirstRunReaderChoice', start);
  assert.ok(start >= 0 && end > start, 'MUSH settings preset function must remain bounded and inspectable');
  return renderer.slice(start, end);
}

test('Beta.70 MUSH settings persist the requested command-input preferences', () => {
  const block = mushSettingsBlock();
  assert.match(block, /repeatLastCommand\.checked = true/u);
  assert.match(block, /showLastCommand\.checked = false/u);
  assert.match(block, /localStorage\.setItem\('nukefire\.repeatLastCommandOnEnter', 'true'\)/u);
  assert.match(block, /localStorage\.setItem\('nukefire\.showLastCommandInInput', 'false'\)/u);
  assert.match(block, /schedulePersistentSettingsSave\(\)/u);
});

test('Beta.70 MUSH settings preserve the command draft and selection without moving focus', () => {
  const block = mushSettingsBlock();
  assert.match(block, /const commandDraft = commandInput\.value/u);
  assert.match(block, /const selectionStart = commandInput\.selectionStart/u);
  assert.match(block, /const selectionEnd = commandInput\.selectionEnd/u);
  assert.match(block, /const selectionDirection = commandInput\.selectionDirection/u);
  assert.match(block, /commandInput\.value = commandDraft/u);
  assert.match(block, /commandInput\.setSelectionRange\(selectionStart, selectionEnd, selectionDirection \|\| 'none'\)/u);
  assert.doesNotMatch(block, /\.focus\s*\(/u);
});

test('Beta.70 MUSH settings confirmation reports both command-input changes', () => {
  const block = mushSettingsBlock();
  assert.match(block, /Repeat Last Command with Enter is on\./u);
  assert.match(block, /Show Last Sent Command in Command Line is off\./u);
});

test('empty-only repeat behavior remains bounded and typed commands remain authoritative', () => {
  assert.match(renderer, /const command = !typedCommand && repeatLastOnEnter && !state\.paginationPending[\s\S]*?\? \(state\.history\.at\(-1\) \|\| ''\)[\s\S]*?: typedCommand;/u);
});
