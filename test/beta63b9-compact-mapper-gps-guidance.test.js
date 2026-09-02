'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const gpsGuidance = require('../src/gps-guidance');

const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

test('GPS remort guidance extracts authored ranges without inventing advice for services', () => {
  assert.equal(gpsGuidance.remortSuggestion('(Elite Remort: 251-399R)'), '251–399R');
  assert.equal(gpsGuidance.remortSuggestion('(Near-Endgame Remort: 600-999R phases)'), '600–999R phases');
  assert.equal(gpsGuidance.remortSuggestion('(Apex Remort: 1200R+)'), '1200R+');
  assert.equal(gpsGuidance.remortSuggestion('(Newbie: 0 Remorts)'), '0R');
  assert.equal(gpsGuidance.remortSuggestion('Crafting'), '');
});

test('GPS option labels show zone and compact remort suggestion when available', () => {
  assert.equal(
    gpsGuidance.optionLabel({ index: 42, name: 'The Statue', zone: 645, difficulty: '(Elite Remort: 251-399R)' }),
    'The Statue · Zone 645 · 251–399R · GPS #42'
  );
  assert.equal(
    gpsGuidance.optionLabel({ index: 107, name: 'The Tekforge', zone: 203, difficulty: 'Crafting' }),
    'The Tekforge · Zone 203 · GPS #107'
  );
});

test('selected GPS guidance uses explicit remort wording and preserves noncombat categories', () => {
  assert.equal(
    gpsGuidance.selectedGuidance({ zone: 645, difficulty: '(Elite Remort: 251-399R)', category: 'Elite Remort Areas' }),
    'Zone 645 · Suggested remorts: 251–399R.'
  );
  assert.equal(
    gpsGuidance.selectedGuidance({ zone: 203, difficulty: 'Crafting', category: 'Crafting' }),
    'Zone 203 · Crafting.'
  );
});

test('Mapper keeps routine controls exposed and folds rare maintenance behind a native disclosure', () => {
  assert.match(html, /<details class="mapper-maintenance">[\s\S]*?<summary>Map tools<\/summary>/u);
  assert.match(html, /id="mapper-refresh"[\s\S]*?>Hard Reset &amp; Refresh<\/button>/u);
  assert.match(html, /id="mapper-clear-scope"/u);
  assert.match(css, /\.mapper-maintenance \{[\s\S]*?\.mapper-maintenance summary \{/u);
});

test('renderer delegates GPS labels and selected guidance to the bounded helper', () => {
  assert.match(renderer, /const gpsGuidanceApi = window\.NukeFireGpsGuidance \|\| \{\};/u);
  assert.match(renderer, /gpsGuidanceApi\.optionLabel\(destination\)/u);
  assert.match(renderer, /gpsGuidanceApi\.selectedGuidance\(destination\)/u);
  assert.match(renderer, /updateGpsSelectionGuidance\(destination\);/u);
});
