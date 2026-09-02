
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const presets = require('../src/reader-presets');
const keybindings = require('../src/keybinding-engine');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

test('exact manual Alt+1 through Alt+9 CR LINES bindings migrate to local draft-safe recall', () => {
  const manual = keybindings.normalizeKeybindingSettings({
    enabled: true,
    bindings: Array.from({ length: 9 }, (_value, index) => {
      const n = index + 1;
      return {
        id: `manual-${n}`,
        code: `Digit${n}`,
        modifiers: { alt: true },
        command: `cr lines ${n}`,
        worksWhileTyping: false
      };
    })
  });
  const migrated = presets.migrateEquivalentReaderLineRecallBindings(manual, keybindings);
  assert.equal(migrated.migrated, 9);
  assert.equal(migrated.settings.bindings.length, 9);
  for (let index = 0; index < 9; index += 1) {
    const n = index + 1;
    const record = migrated.settings.bindings[index];
    assert.equal(record.signature, `alt+Digit${n}`);
    assert.equal(record.command, '');
    assert.equal(record.semantic?.type, 'reader-review');
    assert.equal(record.semantic?.id, `recall-${n}`);
    assert.equal(record.worksWhileTyping, true);
  }
});

test('non-equivalent Alt+number shortcuts remain protected from automatic adoption', () => {
  const custom = keybindings.normalizeKeybindingSettings({
    enabled: true,
    bindings: [
      { id: 'alt-one-score', code: 'Digit1', modifiers: { alt: true }, command: 'score', worksWhileTyping: false },
      { id: 'alt-two-other', code: 'Digit2', modifiers: { alt: true }, command: 'cr lines 8', worksWhileTyping: false }
    ]
  });
  const migrated = presets.migrateEquivalentReaderLineRecallBindings(custom, keybindings);
  assert.equal(migrated.migrated, 0);
  assert.deepEqual(migrated.settings.bindings.map((record) => record.command), ['score', 'cr lines 8']);
});

test('Reader setup quietly includes Alt+1 through Alt+9 local recall and load migrates old equivalents', () => {
  assert.match(renderer, /installReaderLineRecallPreset\(next, keybindingApi\)/u);
  assert.match(renderer, /migrateEquivalentReaderLineRecallBindings\(state\.keybindings, keybindingApi\)/u);
  assert.match(renderer, /if \(editableTargetBlocksKeybinding\(event\.target\) && binding\.worksWhileTyping !== true\) return false;/u);
  assert.match(renderer, /if \(clientReview\) \{[\s\S]*?executeClientReviewAction\(semantic\);[\s\S]*?return true;/u);
  assert.match(renderer, /else if \(recallMatch\) recallReaderLine\(Number\(recallMatch\[1\]\)\)/u);
});
