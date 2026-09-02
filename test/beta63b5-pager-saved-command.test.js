'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

test('pager Enter treats the selected saved command as display-only and preserves it', () => {
  const block = renderer.match(/commandInput\.addEventListener\('keydown',[\s\S]*?\n\}\);/u)?.[0] || '';
  assert.match(block, /const selectedDisplayedCommand = Boolean\(/u);
  assert.match(block, /typedCommand === \(state\.history\.at\(-1\) \|\| ''\)/u);
  assert.match(block, /commandInput\.selectionStart === 0/u);
  assert.match(block, /commandInput\.selectionEnd === typedCommand\.length/u);
  assert.match(block, /state\.paginationPending && selectedDisplayedCommand[\s\S]*?sendCommand\('#cr', \{ recordHistory: false, preserveInput: true \}\)/u);
});

test('pager fix leaves explicit typed commands and ordinary repeat behavior intact', () => {
  const block = renderer.match(/commandInput\.addEventListener\('keydown',[\s\S]*?\n\}\);/u)?.[0] || '';
  assert.match(block, /if \(!typedCommand && !state\.remoteEcho && state\.paginationPending && !repeatLastOnEnter\)/u);
  assert.match(block, /const command = !typedCommand && repeatLastOnEnter && !state\.paginationPending/u);
  assert.match(block, /void sendCommand\(command\)/u);
});

test('NukeFire native paging prompt marks pagination pending', () => {
  const block = renderer.match(/function updatePaginationState\(text, options = \{\}\) \{[\s\S]*?\n\}/u)?.[0] || '';
  assert.ok(block.includes('valid\\s+commands\\s+while\\s+paging\\s+are\\s+return\\b'));
});
