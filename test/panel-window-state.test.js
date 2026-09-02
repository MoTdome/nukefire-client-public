'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PANEL_WINDOW_DEFINITIONS,
  POPOUT_PANEL_IDS,
  DEFAULT_POPOUTS,
  POPOUT_SIZE_LIMITS,
  POPOUT_SIZE_PRESETS,
  panelWindowPresetBounds,
  normalizePopoutBounds,
  normalizePopouts
} = require('../src/panel-window-state');

const EXPECTED_PANEL_IDS = [
  'vitals',
  'sessionVitals',
  'affects',
  'mobInspector',
  'lootHistory',
  'foundlist',
  'quickCommands',
  'liveState',
  'protocol',
  'communications',
  'contextDeck',
  'mapper'
];

test('every sidebar panel has a docked accessible pop-out default', () => {
  assert.deepEqual(POPOUT_PANEL_IDS, EXPECTED_PANEL_IDS);
  assert.deepEqual(Object.keys(DEFAULT_POPOUTS), EXPECTED_PANEL_IDS);
  assert.deepEqual(DEFAULT_POPOUTS.communications, {
    open: false,
    bounds: { x: null, y: null, width: 680, height: 560 }
  });
  assert.deepEqual(DEFAULT_POPOUTS.mapper, {
    open: false,
    bounds: { x: null, y: null, width: 880, height: 760 }
  });
  for (const panelId of EXPECTED_PANEL_IDS) {
    assert.ok(PANEL_WINDOW_DEFINITIONS[panelId].label);
    assert.ok(PANEL_WINDOW_DEFINITIONS[panelId].subtitle);
    assert.equal(DEFAULT_POPOUTS[panelId].open, false);
    assert.ok(DEFAULT_POPOUTS[panelId].bounds.width >= 440);
    assert.ok(DEFAULT_POPOUTS[panelId].bounds.height >= 340);
  }
});

test('pop-out bounds retain monitor coordinates without an artificial desktop-size ceiling', () => {
  assert.deepEqual(normalizePopoutBounds({ x: -1400, y: 72, width: 20, height: 9000 }), {
    x: -1400, y: 72, width: 440, height: 9000
  });
  assert.deepEqual(normalizePopoutBounds({ width: 999999, height: 999999 }), {
    x: null, y: null, width: 16384, height: 16384
  });
  assert.ok(POPOUT_SIZE_LIMITS.width.maximum >= 16000);
  assert.ok(POPOUT_SIZE_LIMITS.height.maximum >= 16000);
});

test('pop-out size presets include exact compact, standard, large, and panel defaults', () => {
  assert.deepEqual(POPOUT_SIZE_PRESETS.compact, { width: 560, height: 480 });
  assert.deepEqual(POPOUT_SIZE_PRESETS.standard, { width: 960, height: 720 });
  assert.deepEqual(POPOUT_SIZE_PRESETS.large, { width: 1440, height: 1000 });
  assert.deepEqual(panelWindowPresetBounds('default', 'mapper'), { x: null, y: null, width: 880, height: 760 });
  assert.equal(panelWindowPresetBounds('unknown', 'mapper'), null);
});

test('pop-out records normalize every panel and survive incomplete input', () => {
  const normalized = normalizePopouts({
    communications: { open: true, bounds: { width: 900 } },
    mapper: { open: true, bounds: { x: -800, y: 40, height: 900 } }
  });
  assert.deepEqual(Object.keys(normalized), EXPECTED_PANEL_IDS);
  assert.deepEqual(normalized.communications, {
    open: true,
    bounds: { x: null, y: null, width: 900, height: 560 }
  });
  assert.deepEqual(normalized.mapper, {
    open: true,
    bounds: { x: -800, y: 40, width: 880, height: 900 }
  });
  assert.deepEqual(normalized.vitals, DEFAULT_POPOUTS.vitals);
});
