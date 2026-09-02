'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const presets = require('../src/reader-presets');
const keybindings = require('../src/keybinding-engine');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

function byId(id) {
  const preset = presets.getReaderPreset(id);
  assert.ok(preset, `missing preset ${id}`);
  return preset;
}

test('Reader setup exposes four deliberate starting presets without hiding later customization', () => {
  assert.deepEqual(presets.READER_PRESETS.map((record) => record.id), [
    'native-reader', 'reader-live-voice', 'fast-reader', 'quiet-review'
  ]);
  assert.match(html, /id="reader-preset-select"/u);
  assert.match(html, /Presets never replace your selected system voice, pitch, or volume/u);
  assert.match(renderer, /Individual settings remain editable/u);
});

test('Native Reader uses Reader Workspace and the native screen-reader path with Self-Voice disabled', () => {
  const a = byId('native-reader').accessibility;
  assert.equal(a.readerWorkspaceEnabled, true);
  assert.equal(a.screenReaderMode, true);
  assert.equal(a.selfVoiceEnabled, false);
  assert.equal(a.selfVoiceForegroundOnly, true);
});

test('Reader plus Live Voice enables the guarded live-speech workflow without changing voice tuning', () => {
  const a = byId('reader-live-voice').accessibility;
  assert.equal(a.screenReaderMode, false);
  assert.equal(a.selfVoiceEnabled, true);
  assert.equal(a.selfVoiceMuted, false);
  assert.equal(a.selfVoiceForegroundOnly, true);
  assert.equal(a.selfVoiceFollowMode, true);
  assert.equal(a.selfVoiceGovernorEnabled, true);
  assert.equal(a.selfVoicePriorityAlertsEnabled, true);
  assert.equal(Object.hasOwn(a, 'selfVoiceRate'), false);
  assert.equal(Object.hasOwn(a, 'selfVoicePitch'), false);
  assert.equal(Object.hasOwn(a, 'selfVoiceVolume'), false);
  assert.equal(Object.hasOwn(a, 'selfVoiceVoiceId'), false);
});

test('Fast Reader deliberately selects 2x while leaving pitch volume and installed voice alone', () => {
  const a = byId('fast-reader').accessibility;
  assert.equal(a.selfVoiceRate, 2);
  assert.equal(a.selfVoiceEnabled, true);
  assert.equal(a.selfVoiceMuted, false);
  assert.equal(a.selfVoiceForegroundOnly, true);
  assert.equal(Object.hasOwn(a, 'selfVoicePitch'), false);
  assert.equal(Object.hasOwn(a, 'selfVoiceVolume'), false);
  assert.equal(Object.hasOwn(a, 'selfVoiceVoiceId'), false);
});

test('Quiet Review keeps the live reader workflow ready but starts Self-Voice muted', () => {
  const a = byId('quiet-review').accessibility;
  assert.equal(a.readerWorkspaceEnabled, true);
  assert.equal(a.selfVoiceEnabled, true);
  assert.equal(a.selfVoiceMuted, true);
  assert.equal(a.selfVoiceForegroundOnly, true);
});

test('Reader Hotkey preset maps F5-F10 plus category navigation to local reader actions and fires while typing', () => {
  const records = presets.readerHotkeyRecords();
  assert.deepEqual(records.map((record) => record.code), [
    'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F10',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'End'
  ]);
  assert.deepEqual(records.map((record) => record.semantic), [
    { type: 'accessibility', id: 'read-vitals' },
    { type: 'accessibility', id: 'toggle-self-voice-mute' },
    { type: 'accessibility', id: 'stop-self-voice' },
    { type: 'reader-history', id: 'previous' },
    { type: 'reader-history', id: 'next' },
    { type: 'reader-history', id: 'latest' },
    { type: 'communications-review', id: 'last-tell' },
    { type: 'reader-history', id: 'category-previous' },
    { type: 'reader-history', id: 'category-next' },
    { type: 'reader-history', id: 'previous' },
    { type: 'reader-history', id: 'next' },
    { type: 'reader-history', id: 'latest' }
  ]);
  assert.equal(records.find((record) => record.id === 'reader-last-tell').modifiers.shift, true);
  assert.ok(records.every((record) => record.worksWhileTyping === true && record.command === ''));
});

test('Reader Hotkey install preserves occupied keys instead of overwriting player shortcuts', () => {
  const original = keybindings.normalizeKeybindingSettings({
    bindings: [
      { id: 'my-f6', code: 'F6', command: 'score' },
      { id: 'my-h', code: 'KeyH', command: 'heal' }
    ]
  });
  const result = presets.installReaderHotkeyPreset(original, keybindings);
  assert.equal(result.installed.length, 11);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.settings.bindings.find((record) => record.code === 'F6').id, 'my-f6');
  assert.equal(result.settings.bindings.find((record) => record.code === 'KeyH').id, 'my-h');
  assert.equal(result.settings.bindings.filter((record) => record.preset === presets.READER_HOTKEY_PRESET_ID).length, 11);

  const removed = presets.removeReaderHotkeyPreset(result.settings, keybindings);
  assert.equal(removed.removed, 11);
  assert.deepEqual(removed.settings.bindings.map((record) => record.id), ['my-f6', 'my-h']);
});

test('Read Vitals joins commandless Accessibility actions and Reader preset controls reuse existing setters', () => {
  const vitals = keybindings.normalizeBinding({
    id: 'reader-vitals', code: 'F5', semantic: { type: 'accessibility', id: 'read-vitals' }
  });
  assert.ok(vitals);
  assert.equal(vitals.command, '');
  assert.match(renderer, /id: 'read-vitals', label: 'Read Vitals'/u);
  assert.match(renderer, /type === 'accessibility' && id === 'read-vitals'[\s\S]*?readVitals\(\)/u);
  assert.match(renderer, /setReaderWorkspaceEnabled\(next\.readerWorkspaceEnabled !== false/u);
  assert.match(renderer, /setSelfVoiceForegroundOnly\(next\.selfVoiceForegroundOnly !== false/u);
  assert.match(renderer, /setSelfVoiceVoiceSettings\(\{ rate: next\.selfVoiceRate \}/u);
  assert.match(html, /reader-presets\.js[\s\S]*renderer\.js/u);
});
