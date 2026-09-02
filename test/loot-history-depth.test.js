'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');

test('Loot History retains 2500 bounded events while windowing rendered history in 250-row steps', () => {
  assert.match(renderer, /const MAX_LOOT_HISTORY_EVENTS = 2500;/u);
  assert.match(renderer, /const DEFAULT_LOOT_HISTORY_VISIBLE = 250;/u);
  assert.match(renderer, /const LOOT_HISTORY_VISIBLE_STEP = 250;/u);
  assert.match(renderer, /history\.events\.splice\(0, history\.events\.length - MAX_LOOT_HISTORY_EVENTS\)/u);
  assert.match(renderer, /const events = filtered\.slice\(0, history\.visibleLimit\);/u);
  assert.match(renderer, /function showOlderLootHistory\(\)/u);
  assert.match(html, /id="loot-history-more"[^>]*>Show older<\/button>/u);
});

test('Loot History status explains when only the newest window is currently rendered', () => {
  assert.match(renderer, /showing newest \$\{shown\.toLocaleString\(\)\} of \$\{filteredCount\.toLocaleString\(\)\}/u);
  assert.match(renderer, /Show \$\{Math\.min\(LOOT_HISTORY_VISIBLE_STEP, remaining\)\.toLocaleString\(\)\} older/u);
});
