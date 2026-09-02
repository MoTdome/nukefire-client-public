'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const resize = require('../src/panel-stack-resize');

test('every workspace pane has a protected resize minimum', () => {
  assert.deepEqual(resize.PANEL_SAFE_MIN_HEIGHTS, {
    vitals: 150,
    sessionVitals: 120,
    affects: 170,
    quickCommands: 180,
    liveState: 120,
    protocol: 190,
    communications: 245,
    contextDeck: 240,
    mapper: 300
  });
  assert.equal(resize.panelSafeMinimum('communications'), 245);
  assert.equal(resize.panelSafeMinimum('unknown'), resize.MIN_PANEL_HEIGHT);
  assert.equal(resize.targetSafeMinimum('communications', 31), 276);
});

test('resize math honors pane-specific minimums for pointer and keyboard paths', () => {
  assert.equal(resize.normalizeHeight(100, 245), 245);
  assert.equal(resize.resizeHeight(300, -500, 245), 245);
  assert.equal(resize.resizeHeight(300, 50, 245), 350);
  assert.equal(resize.normalizeHeight(5000, 245), resize.MAX_PANEL_HEIGHT);
});

test('pane CSS protects controls and makes data bodies absorb vertical pressure', () => {
  const root = path.join(__dirname, '..');
  const css = fs.readFileSync(path.join(root, 'renderer', 'styles.css'), 'utf8');
  const popout = fs.readFileSync(path.join(root, 'renderer', 'popout.css'), 'utf8');

  assert.match(css, /\.communications-panel \{ --panel-safe-min-height: 245px; \}/u);
  assert.match(css, /\[data-workspace-panel\] \{[\s\S]*?min-height: var\(--panel-safe-min-height\);/u);
  assert.match(css, /\.mapper-panel \{ --panel-safe-min-height: 300px; \}/u);
  assert.match(css, /\.panel-height-handle-owner \{[\s\S]*?padding-bottom: 20px;/u);
  assert.match(css, /\.communications-control-row \{[\s\S]*?min-height: max-content;[\s\S]*?flex: 0 0 auto;/u);
  assert.match(css, /\.panel-height-sized\.communications-panel[\s\S]*?\.communications-messages \{[\s\S]*?flex: 1 1 0;[\s\S]*?min-height: 24px;/u);
  assert.match(css, /\.affects-list \{[\s\S]*?flex: 1 1 auto;[\s\S]*?min-height: 0;[\s\S]*?grid-auto-rows: max-content;[\s\S]*?align-content: start;/u);
  assert.match(css, /\.context-deck-cards \{[\s\S]*?flex: 1 1 auto;[\s\S]*?min-height: 0;/u);
  assert.match(popout, /\.communications-view \{[\s\S]*?overflow: auto;/u);
  assert.match(popout, /\.communications-control-row \{[^}]*min-height: max-content;/u);
});

test('tab groups add their tab strip to the active pane safe minimum', () => {
  assert.equal(resize.targetSafeMinimum('affects', 30), 200);
  assert.equal(resize.targetSafeMinimum('mapper', 34), 334);
});
