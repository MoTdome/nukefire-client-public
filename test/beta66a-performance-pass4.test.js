'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

test('Pass 4 defers heavy panel rendering when no live panel surface exists', () => {
  assert.match(renderer, /function panelHasLiveSurface\(panelId\)/u);
  assert.match(renderer, /state\.contextDeck\.renderDirty = true/u);
  assert.match(renderer, /state\.mapper\.renderDirty = true/u);
  assert.match(renderer, /refreshDeferredPanelRenders/u);
});

test('Pass 4 keeps dormant popout MutationObservers disconnected', () => {
  assert.match(renderer, /function syncPanelPopoutObservers\(\)/u);
  assert.match(renderer, /entry\.observer\.disconnect\(\)/u);
  assert.match(renderer, /if \(shouldObserve\) \{[\s\S]*entry\.observer\.observe/u);
});

test('Pass 4 uses live Mob Inspector combat updates instead of rebuilding the full card on each HP tick', () => {
  assert.match(renderer, /function updateMobInspectorLiveCombat\(\)/u);
  assert.match(renderer, /healthSignature !== state\.mobInspector\.liveHealthSignature[\s\S]*updateMobInspectorLiveCombat\(\)/u);
});

test('Pass 4 caches affect countdown nodes and avoids full-document scans each second', () => {
  const countdown = renderer.match(/function updateAffectsCountdowns\(\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(countdown, /for \(const entry of affectsCountdownEntries\)/u);
  assert.doesNotMatch(countdown, /document\.querySelectorAll/u);
});

test('Pass 4 skips redundant Communications tab and group-vitals paints', () => {
  assert.match(renderer, /tabList\.dataset\.renderSignature === renderSignature/u);
  assert.match(renderer, /groupVitalsRenderSignature === renderSignature/u);
});
