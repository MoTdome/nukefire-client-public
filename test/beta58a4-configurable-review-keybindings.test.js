'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const keybindings = require('../src/keybinding-engine');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

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

test('semantic client review bindings normalize without a server command while raw empty bindings stay invalid', () => {
  const reader = keybindings.normalizeBinding({
    id: 'reader-prev',
    code: 'F8',
    command: '',
    semantic: { type: 'reader-review', id: 'previous' }
  });
  assert.ok(reader);
  assert.equal(reader.command, '');
  assert.deepEqual(reader.semantic, { type: 'reader-review', id: 'previous' });

  const communications = keybindings.normalizeBinding({
    id: 'communications-older',
    code: 'F9',
    semantic: { type: 'communications-review', id: 'older' }
  });
  assert.ok(communications);
  assert.deepEqual(communications.semantic, { type: 'communications-review', id: 'older' });
  assert.equal(keybindings.normalizeBinding({ code: 'F10', command: '' }), null);
  assert.equal(keybindings.normalizeBinding({
    code: 'F11',
    semantic: { type: 'unknown-client-action', id: 'anything' }
  }), null);
});

test('review bindings remain ordinary configurable physical-key records with no default assignments', () => {
  assert.deepEqual(keybindings.DEFAULT_KEYBINDING_SETTINGS.bindings, []);
  const settings = keybindings.normalizeKeybindingSettings({
    bindings: [{
      id: 'reader-current',
      code: 'F8',
      semantic: { type: 'reader-review', id: 'current' },
      group: 'Reader'
    }]
  });
  assert.equal(settings.bindings.length, 1);
  assert.equal(settings.bindings[0].signature, 'F8');
  assert.equal(keybindings.findBindingForEvent(settings, event('F8')).semantic.id, 'current');
});

test('protected native and assistive-technology shortcuts still win over review bindings', () => {
  const macVoiceOver = keybindings.normalizeKeybindingSettings({
    bindings: [{
      id: 'bad-vo',
      code: 'ArrowRight',
      modifiers: { ctrl: true, alt: true },
      semantic: { type: 'reader-review', id: 'next' }
    }]
  });
  assert.equal(
    keybindings.findBindingForEvent(
      macVoiceOver,
      event('ArrowRight', { ctrl: true, alt: true }),
      { platform: 'MacIntel' }
    ),
    null
  );

  const macWordNav = keybindings.normalizeKeybindingSettings({
    bindings: [{
      id: 'bad-option',
      code: 'ArrowLeft',
      modifiers: { alt: true },
      semantic: { type: 'reader-review', id: 'previous' }
    }]
  });
  assert.equal(
    keybindings.findBindingForEvent(macWordNav, event('ArrowLeft', { alt: true }), { platform: 'MacIntel' }),
    null
  );
});

test('Keyboard Preferences exposes reader and Communications review as semantic action types', () => {
  assert.match(html, /<option value="reader-review">Reader review<\/option>/u);
  assert.match(html, /<option value="communications-review">Communications review<\/option>/u);
  assert.match(html, /review actions are always available locally and never send a server command/u);

  for (const id of ['current', 'previous', 'next', 'latest']) {
    assert.match(renderer, new RegExp(`id: '${id}'`, 'u'));
  }
  for (const id of ['current', 'older', 'newer', 'latest']) {
    assert.match(renderer, new RegExp(`id: '${id}'`, 'u'));
  }
});

test('client review keybindings execute the existing stable review functions instead of the command pipeline', () => {
  assert.match(renderer, /function executeClientReviewAction\(semantic = \{\}\)/u);
  assert.match(renderer, /id === 'current'\) reviewCurrentLine\(\)/u);
  assert.match(renderer, /id === 'previous'\) reviewPreviousLine\(\)/u);
  assert.match(renderer, /id === 'next'\) reviewNextLine\(\)/u);
  assert.match(renderer, /id === 'latest'\) reviewLatestLine\(\)/u);
  assert.match(renderer, /id === 'current'\) reviewCurrentCommunication\(\)/u);
  assert.match(renderer, /id === 'older'\) reviewOlderCommunication\(\)/u);
  assert.match(renderer, /id === 'newer'\) reviewNewerCommunication\(\)/u);
  assert.match(renderer, /id === 'latest'\) reviewLatestCommunication\(\)/u);

  const localBranch = renderer.match(/if \(clientReview\) \{[\s\S]*?return true;\n  \}\n  void sendCommand/u);
  assert.ok(localBranch, 'client review must return before the server sendCommand path');
});

test('review shortcuts retain normal typing opt-in and never bypass the protected-key gate', () => {
  assert.match(renderer, /if \(isProtectedNativeKey\(event\)\) return false;[\s\S]*?findBindingForEvent/u);
  assert.match(renderer, /editableTargetBlocksKeybinding\(event\.target\) && binding\.worksWhileTyping !== true/u);
  assert.match(renderer, /'reader-history': \['Reader history action'/u);
  assert.match(renderer, /'reader-review': 'Reader'/u);
  assert.match(renderer, /'communications-review': 'Communications'/u);
  assert.match(renderer, /Reader history and review actions run entirely inside NukeFire\. They do not send a command to the MUD\./u);
});
