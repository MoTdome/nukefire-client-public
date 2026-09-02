'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const displayText = require('../src/display-text');

test('display text settings normalize to stable full and status defaults', () => {
  assert.deepEqual(displayText.normalizeDisplayText({}), {
    panelLabels: 'full',
    mapperRoomLabels: 'status'
  });
  assert.deepEqual(displayText.normalizeDisplayText({ panelLabels: 'LOUD', mapperRoomLabels: 'regex' }), {
    panelLabels: 'full',
    mapperRoomLabels: 'status'
  });
});

test('compact panel labels remain readable instead of becoming icon-only controls', () => {
  assert.equal(displayText.panelLabel('communications', 'compact'), 'Comms');
  assert.equal(displayText.panelLabel('contextDeck', 'compact'), 'Console');
  assert.equal(displayText.panelLabel('mapper', 'compact'), 'Map');
  assert.equal(displayText.panelLabel('mapper', 'full'), 'Mapper');
});

test('mapper room labels can show full room numbers without changing status markers', () => {
  assert.equal(displayText.mapperRoomLabel({ id: 57203, name: 'A dark crystal hall' }, 'status'), '');
  assert.equal(displayText.mapperRoomLabel({ id: 57203, name: 'A dark crystal hall' }, 'number'), '57203');
});

test('mapper room names are normalized, bounded, and safe for SVG text', () => {
  assert.equal(displayText.mapperRoomLabel({ id: 1, name: '  Grand\nCrystal\u0007 Gallery  ' }, 'name'), 'Grand Crystal…');
  assert.equal(displayText.mapperRoomLabel({ id: 1, name: 'Short Hall' }, 'name'), 'Short Hall');
});
