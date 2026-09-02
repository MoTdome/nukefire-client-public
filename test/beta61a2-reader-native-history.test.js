'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ReaderHistory, CORE_CATEGORIES } = require('../src/reader-history');
const sessionRuntime = require('../src/session-runtime');
const readerPresets = require('../src/reader-presets');
const keybindings = require('../src/keybinding-engine');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');

function legacyReaderPreset() {
  return keybindings.normalizeKeybindingSettings({
    enabled: true,
    bindings: [
      { id: 'reader-vitals', code: 'F5', command: '', preset: readerPresets.READER_HOTKEY_PRESET_ID, worksWhileTyping: true, semantic: { type: 'accessibility', id: 'read-vitals' } },
      { id: 'reader-mute', code: 'F6', command: '', preset: readerPresets.READER_HOTKEY_PRESET_ID, worksWhileTyping: true, semantic: { type: 'accessibility', id: 'toggle-self-voice-mute' } },
      { id: 'reader-stop-speech', code: 'F7', command: '', preset: readerPresets.READER_HOTKEY_PRESET_ID, worksWhileTyping: true, semantic: { type: 'accessibility', id: 'stop-self-voice' } },
      { id: 'reader-previous-line', code: 'F8', command: '', preset: readerPresets.READER_HOTKEY_PRESET_ID, worksWhileTyping: true, semantic: { type: 'reader-review', id: 'previous' } },
      { id: 'reader-next-line', code: 'F9', command: '', preset: readerPresets.READER_HOTKEY_PRESET_ID, worksWhileTyping: true, semantic: { type: 'reader-review', id: 'next' } },
      { id: 'reader-latest-line', code: 'F10', command: '', preset: readerPresets.READER_HOTKEY_PRESET_ID, worksWhileTyping: true, semantic: { type: 'reader-review', id: 'latest' } },
      { id: 'reader-last-tell', code: 'F10', command: '', preset: readerPresets.READER_HOTKEY_PRESET_ID, worksWhileTyping: true, modifiers: { shift: true }, semantic: { type: 'communications-review', id: 'last-tell' } }
    ]
  });
}

test('Reader History starts with semantic core categories and selects Main Output', () => {
  const history = new ReaderHistory();
  assert.deepEqual(CORE_CATEGORIES.map((entry) => entry.id), ['main', 'rooms', 'combat', 'damage', 'client-reader']);
  assert.equal(history.selectedCategory().id, 'main');
  assert.deepEqual(history.availableCategories().map((entry) => entry.id), ['main']);
});

test('Reader History remembers an independent parked cursor for every category', () => {
  const history = new ReaderHistory();
  history.append('main', 'main one');
  history.append('main', 'main two');
  history.append('comm:tell', 'tell one', { label: 'Tell', speechPolicy: 'interrupt' });
  history.append('comm:tell', 'tell two', { label: 'Tell', speechPolicy: 'interrupt' });

  assert.equal(history.previous('main').text, 'main one');
  history.select('comm:tell');
  assert.equal(history.previous().text, 'tell one');
  history.select('main');
  assert.equal(history.current().text, 'main one');
  history.select('comm:tell');
  assert.equal(history.current().text, 'tell one');
});

test('new traffic does not yank a parked category cursor to the live edge', () => {
  const history = new ReaderHistory();
  history.append('damage', 'damage one');
  history.append('damage', 'damage two');
  history.select('damage');
  assert.equal(history.previous().text, 'damage one');
  history.append('damage', 'damage three');
  const current = history.current();
  assert.equal(current.text, 'damage one');
  assert.equal(current.position, 1);
  assert.equal(current.count, 3);
  assert.equal(history.latest().text, 'damage three');
});

test('category navigation skips empty categories and wraps among categories with history', () => {
  const history = new ReaderHistory();
  history.append('rooms', 'The Reactor');
  history.append('comm:gossip', 'Someone gossips hello', { label: 'Gossip' });
  assert.equal(history.selectNext(1).id, 'rooms');
  assert.equal(history.selectNext(1).id, 'comm:gossip');
  assert.equal(history.selectNext(1).id, 'main');
  assert.equal(history.selectNext(-1).id, 'comm:gossip');
});

test('core category speech policies preserve room replace and damage interrupt intent', () => {
  const history = new ReaderHistory();
  history.append('rooms', 'Room', { source: 'gmcp:room' });
  history.append('damage', 'Incoming damage 100.', { source: 'gmcp:combat' });
  assert.equal(history.categoryStatus('rooms').speechPolicy, 'replace');
  assert.equal(history.categoryStatus('damage').speechPolicy, 'interrupt');
});

test('session runtime feeds completed terminal lines into Main Output Reader History', () => {
  const fakeAnsi = { AnsiParser: class { parse(text) { return [{ text, style: null }]; } } };
  const runtime = sessionRuntime.createSessionRuntime({ id: 'main' }, {
    ansiApi: fakeAnsi,
    readerReviewApi: { ReaderReviewBuffer: class { appendLine() {} } },
    readerHistoryApi: { ReaderHistory },
    maxCharacters: 5000
  });
  sessionRuntime.appendText(runtime, 'first line\nsecond line\n', { stripAnsi: (value) => value });
  assert.deepEqual(runtime.readerHistory.snapshot('main').map((entry) => entry.text), ['first line', 'second line']);
});

test('Reader preset promotes F8-F10 to selected-category history and adds category navigation', () => {
  const records = readerPresets.readerHotkeyRecords();
  assert.equal(records.length, 12);
  assert.deepEqual(records.find((entry) => entry.code === 'F8').semantic, { type: 'reader-history', id: 'previous' });
  assert.deepEqual(records.find((entry) => entry.code === 'F9').semantic, { type: 'reader-history', id: 'next' });
  assert.deepEqual(records.find((entry) => entry.code === 'F10' && !entry.modifiers?.shift).semantic, { type: 'reader-history', id: 'latest' });
  assert.deepEqual(records.find((entry) => entry.label === 'Alt+Up').semantic, { type: 'reader-history', id: 'category-previous' });
  assert.deepEqual(records.find((entry) => entry.label === 'Alt+Down').semantic, { type: 'reader-history', id: 'category-next' });
  assert.deepEqual(records.find((entry) => entry.label === 'Alt+Left').semantic, { type: 'reader-history', id: 'previous' });
  assert.deepEqual(records.find((entry) => entry.label === 'Alt+Right').semantic, { type: 'reader-history', id: 'next' });
  assert.deepEqual(records.find((entry) => entry.label === 'Alt+End').semantic, { type: 'reader-history', id: 'latest' });
  assert.ok(records.every((entry) => entry.worksWhileTyping === true));
});

test('untouched legacy F5-F10 Reader preset migrates without rewriting unrelated shortcuts', () => {
  const legacy = legacyReaderPreset();
  legacy.bindings.push(keybindings.normalizeBinding({ id: 'mine', code: 'KeyH', command: 'heal' }));
  const result = readerPresets.migrateLegacyReaderHotkeyPreset(legacy, keybindings);
  assert.equal(result.migrated, true);
  assert.equal(result.settings.bindings.find((entry) => entry.id === 'mine').command, 'heal');
  assert.equal(result.settings.bindings.filter((entry) => entry.preset === readerPresets.READER_HOTKEY_PRESET_ID).length, 12);
  assert.deepEqual(result.settings.bindings.find((entry) => entry.id === 'reader-previous-line').semantic, { type: 'reader-history', id: 'previous' });
});

test('customized legacy Reader preset is left alone instead of being silently replaced', () => {
  const legacy = legacyReaderPreset();
  const f8 = legacy.bindings.find((entry) => entry.id === 'reader-previous-line');
  f8.semantic = { type: 'reader-review', id: 'latest' };
  const result = readerPresets.migrateLegacyReaderHotkeyPreset(legacy, keybindings);
  assert.equal(result.migrated, false);
  assert.equal(result.reason, 'customized');
});

test('renderer wires semantic rooms, combat, damage and communications into category history', () => {
  assert.match(renderer, /appendReaderHistoryCommunication\(activeSessionRecord\(\), message\)/u);
  assert.match(renderer, /packageName === 'Room\.Info'[\s\S]*?history\.append\?\.\('rooms'/u);
  assert.match(renderer, /packageName === 'NukeFire\.Combat'[\s\S]*?history\.append\?\.\('combat'/u);
  assert.match(renderer, /history\.append\?\.\('damage'/u);
  assert.match(renderer, /appendReaderHistoryGmcp\(record, packageName, message\?\.body\)/u);
});

test('explicit history navigation uses an assertive native-reader announcement path', () => {
  assert.match(html, /id="sr-interrupt-announcer"[\s\S]*aria-live="assertive"/u);
  assert.match(renderer, /announceReaderHistoryResult[\s\S]*interrupt: true/u);
  assert.match(html, /Alt\+Up\/Down changes category/u);
  assert.match(html, /macOS keeps Option\+Left\/Right for native word navigation/u);
});


test('typed Reader review controls and clear actions use the same category history', () => {
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  const runtime = fs.readFileSync('src/session-runtime.js', 'utf8');
  assert.match(renderer, /'reader\.review\.latest': readerHistoryLatest/u);
  assert.match(renderer, /'reader\.review\.previous': readerHistoryPrevious/u);
  assert.match(renderer, /'reader\.review\.next': readerHistoryNext/u);
  assert.match(renderer, /startsWith\('comm:'\)[\s\S]*?readerHistory\.clear/u);
  assert.match(runtime, /runtime\.readerHistory\?\.clear\?\.\('main'\)/u);
});
