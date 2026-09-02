'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_KEYBINDINGS,
  NUMPAD_MOVEMENT_PRESET_ID,
  normalizeBinding,
  normalizeKeybindingSettings,
  friendlyKeyLabel,
  captureKeyFromEvent,
  findBindingConflict,
  installNumpadMovementPreset,
  removeNumpadMovementPreset,
  findBindingForEvent
} = require('../src/keybinding-engine');

test('normalizes bounded physical-key bindings and rejects duplicate key signatures', () => {
  const settings = normalizeKeybindingSettings({
    enabled: true,
    bindings: [
      { id: ' Move North ', code: 'Numpad8', command: ' north ', group: ' Movement ' },
      { id: 'duplicate', code: 'Numpad8', command: 'say duplicate' },
      { id: '__proto__', code: 'KeyH', modifiers: { ctrl: true }, command: 'heal %tank\nscore', worksWhileTyping: true },
      { code: 'bad code!', command: 'look' },
      { code: 'F1', command: '' }
    ]
  });

  assert.equal(settings.enabled, true);
  assert.equal(settings.bindings.length, 2);
  assert.deepEqual(settings.bindings[0], {
    id: 'move-north',
    code: 'Numpad8',
    modifiers: { ctrl: false, alt: false, shift: false, meta: false },
    signature: 'Numpad8',
    label: 'Numpad 8',
    command: 'north',
    group: 'Movement',
    preset: '',
    scope: 'global',
    trigger: 'press',
    location: 3,
    enabled: true,
    allowRepeat: false,
    worksWhileTyping: false
  });
  assert.equal(settings.bindings[1].signature, 'ctrl+KeyH');
  assert.equal(settings.bindings[1].command, 'heal %tank score');
  assert.equal(settings.bindings[1].worksWhileTyping, true);

  const oversized = normalizeKeybindingSettings({
    bindings: Array.from({ length: MAX_KEYBINDINGS + 40 }, (_, index) => ({
      code: `Key${String.fromCharCode(65 + (index % 26))}${index}`,
      command: `say ${index}`
    }))
  });
  assert.ok(oversized.bindings.length <= MAX_KEYBINDINGS);
});

test('installs and removes the complete Numpad movement preset without duplicate conflicts', () => {
  const installed = installNumpadMovementPreset({
    enabled: false,
    bindings: [
      { id: 'old-eight', code: 'Numpad8', command: 'say old north' },
      { id: 'heal', code: 'KeyH', modifiers: { ctrl: true }, command: 'heal' }
    ]
  });

  assert.equal(installed.enabled, true);
  assert.equal(installed.bindings.find((record) => record.code === 'Numpad8').command, 'north');
  assert.equal(installed.bindings.find((record) => record.code === 'Numpad5').command, 'look');
  assert.equal(installed.bindings.find((record) => record.code === 'NumpadAdd').command, 'up');
  assert.equal(installed.bindings.find((record) => record.code === 'NumpadSubtract').command, 'down');
  assert.equal(installed.bindings.filter((record) => record.preset === NUMPAD_MOVEMENT_PRESET_ID).length, 11);
  assert.ok(installed.bindings.some((record) => record.id === 'heal'));

  const removed = removeNumpadMovementPreset(installed);
  assert.equal(removed.bindings.length, 1);
  assert.equal(removed.bindings[0].id, 'heal');
});

test('matches KeyboardEvent.code independently of Num Lock and blocks held-key repeats by default', () => {
  const settings = installNumpadMovementPreset();
  const numLockOn = findBindingForEvent(settings, {
    code: 'Numpad8', key: '8', location: 3,
    ctrlKey: false, altKey: false, shiftKey: false, metaKey: false,
    repeat: false, defaultPrevented: false, isComposing: false
  });
  const numLockOff = findBindingForEvent(settings, {
    code: 'Numpad8', key: 'ArrowUp', location: 3,
    ctrlKey: false, altKey: false, shiftKey: false, metaKey: false,
    repeat: false, defaultPrevented: false, isComposing: false
  });
  const held = findBindingForEvent(settings, {
    code: 'Numpad8', key: '8', location: 3,
    ctrlKey: false, altKey: false, shiftKey: false, metaKey: false,
    repeat: true, defaultPrevented: false, isComposing: false
  });

  assert.equal(numLockOn.command, 'north');
  assert.equal(numLockOff.command, 'north');
  assert.equal(held, null);
  assert.equal(findBindingForEvent({ ...settings, enabled: false }, { code: 'Numpad8' }), null);
});

test('produces friendly labels for modifiers and physical keys', () => {
  assert.equal(friendlyKeyLabel('Numpad8'), 'Numpad 8');
  assert.equal(friendlyKeyLabel('KeyH', { ctrl: true, shift: true }), 'Ctrl + Shift + H');
  assert.equal(friendlyKeyLabel('F12', { alt: true }), 'Alt + F12');
});

test('renderer wires the keybinding engine before the live renderer and dispatches in capture phase', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

  assert.match(html, /<script src="\.\.\/src\/semantic-controls\.js"><\/script>[\s\S]*<script src="\.\.\/src\/keybinding-engine\.js"><\/script>[\s\S]*<script src="renderer\.js"><\/script>/u);
  assert.match(html, /id="keybinding-install-numpad"/u);
  assert.match(source, /document\.addEventListener\('keydown', handleKeybindingKeydown, true\)/u);
  assert.match(source, /state\.remoteEcho/u);
  assert.match(source, /void sendCommand\(resolved\.command, \{[\s\S]*preserveInput: true,[\s\S]*recordHistory: false[\s\S]*\}\)\.then/u);
  assert.match(source, /resolveKeybindingForCurrentCharacter/u);
});


test('records physical keys safely and finds conflicts while excluding the edited binding', () => {
  assert.equal(captureKeyFromEvent({ code: 'ShiftLeft', shiftKey: true }), null);
  assert.equal(captureKeyFromEvent({ code: 'KeyH', ctrlKey: true, repeat: true }), null);

  const captured = captureKeyFromEvent({
    code: 'KeyH', key: 'H', location: 0,
    ctrlKey: true, altKey: false, shiftKey: true, metaKey: false,
    repeat: false, defaultPrevented: false, isComposing: false
  });
  assert.deepEqual(captured, {
    code: 'KeyH',
    modifiers: { ctrl: true, alt: false, shift: true, meta: false },
    signature: 'ctrl+shift+KeyH',
    label: 'Ctrl + Shift + H',
    location: 0
  });

  const settings = normalizeKeybindingSettings({
    bindings: [
      { id: 'heal', code: 'KeyH', modifiers: { ctrl: true, shift: true }, command: 'heal' },
      { id: 'flee', code: 'F8', command: 'flee' }
    ]
  });
  assert.equal(findBindingConflict(settings, captured)?.id, 'heal');
  assert.equal(findBindingConflict(settings, captured, 'heal'), null);
  assert.equal(findBindingConflict(settings, { code: 'F8' })?.id, 'flee');
});


test('normalizes and preserves semantic server-control references', () => {
  const binding = normalizeBinding({
    id: 'combo-breaker',
    code: 'F5',
    command: 'combo load breaker',
    semantic: { type: 'combo-profile', id: 'breaker' }
  });

  assert.deepEqual(binding.semantic, { type: 'combo-profile', id: 'breaker' });
  const restored = normalizeKeybindingSettings({ enabled: true, bindings: [binding] });
  assert.deepEqual(restored.bindings[0].semantic, { type: 'combo-profile', id: 'breaker' });
});
