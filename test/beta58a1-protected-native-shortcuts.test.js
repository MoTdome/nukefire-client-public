'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  isProtectedNativeShortcut,
  normalizeKeybindingSettings,
  findBindingForEvent
} = require('../src/keybinding-engine');

function event(code, modifiers = {}) {
  return {
    code,
    key: '',
    ctrlKey: modifiers.ctrl === true,
    altKey: modifiers.alt === true,
    shiftKey: modifiers.shift === true,
    metaKey: modifiers.meta === true,
    repeat: false,
    defaultPrevented: false,
    isComposing: false
  };
}

test('macOS protects native editing/navigation and the VoiceOver Control+Option chord', () => {
  assert.equal(isProtectedNativeShortcut(event('KeyC', { meta: true }), 'MacIntel'), true);
  assert.equal(isProtectedNativeShortcut(event('KeyZ', { meta: true, shift: true }), 'MacIntel'), true);
  assert.equal(isProtectedNativeShortcut(event('ArrowLeft', { meta: true }), 'MacIntel'), true);
  assert.equal(isProtectedNativeShortcut(event('ArrowRight', { alt: true, shift: true }), 'MacIntel'), true);
  assert.equal(isProtectedNativeShortcut(event('KeyH', { ctrl: true, alt: true }), 'MacIntel'), true);

  assert.equal(isProtectedNativeShortcut(event('KeyK', { meta: true }), 'MacIntel'), false);
  assert.equal(isProtectedNativeShortcut(event('F5'), 'MacIntel'), false);
  assert.equal(isProtectedNativeShortcut(event('Numpad8'), 'MacIntel'), false);
});

test('Windows and Linux protect conventional Ctrl editing and navigation shortcuts', () => {
  for (const platform of ['Win32', 'Linux x86_64']) {
    assert.equal(isProtectedNativeShortcut(event('KeyC', { ctrl: true }), platform), true);
    assert.equal(isProtectedNativeShortcut(event('KeyV', { ctrl: true }), platform), true);
    assert.equal(isProtectedNativeShortcut(event('KeyX', { ctrl: true }), platform), true);
    assert.equal(isProtectedNativeShortcut(event('KeyA', { ctrl: true }), platform), true);
    assert.equal(isProtectedNativeShortcut(event('KeyZ', { ctrl: true }), platform), true);
    assert.equal(isProtectedNativeShortcut(event('KeyY', { ctrl: true }), platform), true);
    assert.equal(isProtectedNativeShortcut(event('ArrowLeft', { ctrl: true, shift: true }), platform), true);
    assert.equal(isProtectedNativeShortcut(event('Home', { ctrl: true }), platform), true);
    assert.equal(isProtectedNativeShortcut(event('End', { ctrl: true, shift: true }), platform), true);

    assert.equal(isProtectedNativeShortcut(event('KeyH', { ctrl: true }), platform), false);
    assert.equal(isProtectedNativeShortcut(event('F12', { ctrl: true }), platform), false);
    assert.equal(isProtectedNativeShortcut(event('Numpad8'), platform), false);
  }
});

test('persisted protected bindings are ignored at dispatch while ordinary bindings still fire', () => {
  const settings = normalizeKeybindingSettings({
    bindings: [
      { id: 'bad-copy', code: 'KeyC', modifiers: { meta: true }, command: 'kill all' },
      { id: 'knowledge', code: 'KeyK', modifiers: { meta: true }, command: 'score' },
      { id: 'heal', code: 'KeyH', modifiers: { ctrl: true }, command: 'heal' }
    ]
  });

  assert.equal(findBindingForEvent(settings, event('KeyC', { meta: true }), { platform: 'MacIntel' }), null);
  assert.equal(findBindingForEvent(settings, event('KeyK', { meta: true }), { platform: 'MacIntel' }).command, 'score');
  assert.equal(findBindingForEvent(settings, event('KeyH', { ctrl: true }), { platform: 'Win32' }).command, 'heal');
});

test('renderer guards protected keys before macro and custom-keybinding dispatch', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const macro = fs.readFileSync(path.join(__dirname, '..', 'src', 'macro-engine.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');

  assert.match(renderer, /if \(isProtectedNativeKey\(event\)\) return false;[\s\S]*macro\?\.findForEvent/u);
  assert.match(renderer, /captured && isProtectedNativeKey\(captured\)[\s\S]*will pass through to the system/u);
  assert.match(renderer, /macro\?\.findForEvent\?\.\(event\)/u);
  assert.match(renderer, /findBindingForEvent\(state\.keybindings, event\)/u);
  assert.match(macro, /isProtectedNativeShortcut\(event, options\.platform\)\) return null/u);
  assert.match(html, /Native clipboard, editing, navigation, and assistive-technology shortcuts remain[\s\S]*never intercepted by NukeFire shortcuts or macros/u);
});
