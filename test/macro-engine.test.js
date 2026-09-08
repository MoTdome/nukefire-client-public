'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MacroEngine,
  parseMacroKey,
  normalizeMacrosSnapshot,
  MAX_MACRO_COMMANDS
} = require('../src/macro-engine');

test('normalizes TinTin-friendly function, modifier, navigation, and numpad key names', () => {
  assert.deepEqual(parseMacroKey('Ctrl+F1'), {
    code: 'F1',
    modifiers: { ctrl: true, alt: false, shift: false, meta: false },
    signature: 'ctrl+F1',
    label: 'Ctrl + F1',
    key: 'Ctrl + F1',
    error: ''
  });
  assert.equal(parseMacroKey('Option + PageUp').signature, 'alt+PageUp');
  assert.equal(parseMacroKey('Command+K').signature, 'meta+KeyK');
  assert.equal(parseMacroKey('Numpad8').signature, 'Numpad8');
  assert.equal(parseMacroKey('Esc').signature, 'Escape');
});

test('rejects plain typing keys and malformed modifier sequences', () => {
  assert.match(parseMacroKey('n').error, /Plain typing keys/u);
  assert.match(parseMacroKey('Shift+n').error, /Plain typing keys/u);
  assert.match(parseMacroKey('Ctrl+Ctrl+F1').error, /Duplicate/u);
  assert.match(parseMacroKey('Hyper+F1').error, /Unknown macro modifier/u);
  assert.match(parseMacroKey('Ctrl+Banana').error, /Unsupported macro key/u);
});

test('defines bounded semicolon-aware macro command lists and replaces matching keys', () => {
  const macros = new MacroEngine();
  const first = macros.define('F1', '#showme {Boss; incoming};assist tank', 'raid');
  assert.equal(first.key, 'F1');
  assert.deepEqual(first.commands, ['#showme {Boss; incoming}', 'assist tank']);
  assert.equal(first.className, 'raid');

  const replacement = macros.define('F1', 'flee');
  assert.equal(replacement.sequence, first.sequence);
  assert.deepEqual(macros.list().map((record) => record.command), ['flee']);

  const tooMany = Array.from({ length: MAX_MACRO_COMMANDS + 1 }, (_, index) => `say ${index}`).join(';');
  assert.equal(macros.define('F2', tooMany), null);
});

test('matches physical KeyboardEvent codes, blocks repeats, and honors enable state', () => {
  const macros = new MacroEngine();
  macros.define('Command+K', 'kill mutant');
  const event = {
    code: 'KeyK', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false,
    repeat: false, defaultPrevented: false, isComposing: false
  };
  assert.equal(macros.findForEvent(event).command, 'kill mutant');
  assert.equal(macros.findForEvent({ ...event, repeat: true }), null);
  macros.setMacroEnabled('Command+K', false);
  assert.equal(macros.findForEvent(event), null);
});

test('normalizes snapshots with classes while discarding duplicates and invalid records', () => {
  const snapshot = normalizeMacrosSnapshot({
    enabled: true,
    definitions: [
      { key: 'F2', command: 'score', className: 'Prime', enabled: false },
      { key: 'F2', command: 'inventory' },
      { key: 'q', command: 'quit' }
    ]
  });
  assert.equal(snapshot.definitions.length, 1);
  assert.equal(snapshot.definitions[0].className, 'prime');
  assert.equal(snapshot.definitions[0].enabled, false);
});

test('renderer loads the macro engine after physical-key support and before live dispatch', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(html, /keybinding-engine\.js"><\/script>[\s\S]*macro-engine\.js"><\/script>[\s\S]*renderer\.js"><\/script>/u);
  assert.match(source, /sessionDisplayEngines\(activeSessionRecord\(\)\)\.macro\?\.findForEvent\?\.\(event\)/u);
  assert.match(source, /await sendCommand\(commands\.join\(';'\), \{ preserveInput: true, recordHistory: false \}\)/u);
});


test('common WinTin and xterm F6-F12 and navigation escape sequences import as physical keys', () => {
  const expected = new Map([
    ['\\e[17~', 'F6'], ['\\e[19~', 'F8'], ['\\e[24~', 'F12'],
    ['\\e[A', 'ArrowUp'], ['\\e[B', 'ArrowDown'], ['\\e[C', 'ArrowRight'], ['\\e[D', 'ArrowLeft'],
    ['\\e[H', 'Home'], ['\\e[F', 'End'], ['\\e[5~', 'PageUp'], ['\\e[6~', 'PageDown']
  ]);
  for (const [sequence, code] of expected) {
    const parsed = parseMacroKey(sequence);
    assert.equal(parsed.error, '', sequence);
    assert.equal(parsed.code, code, sequence);
  }
});
