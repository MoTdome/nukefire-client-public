'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseSpeedwalk,
  DEFAULT_MAX_SPEEDWALK_STEPS
} = require('../src/speedwalk-engine');

test('parses repeated compact direction letters', () => {
  const result = parseSpeedwalk('eeennnee');
  assert.equal(result.matched, true);
  assert.deepEqual(result.steps, ['e', 'e', 'e', 'n', 'n', 'n', 'e', 'e']);
});

test('parses TinTin-style numeric direction counts', () => {
  const result = parseSpeedwalk('4e3s19e');
  assert.equal(result.matched, true);
  assert.equal(result.steps.length, 26);
  assert.deepEqual(result.steps.slice(0, 7), ['e', 'e', 'e', 'e', 's', 's', 's']);
  assert.ok(result.steps.slice(7).every((step) => step === 'e'));
});

test('accepts lowercase routes with spaces but leaves capitalized input literal', () => {
  assert.deepEqual(parseSpeedwalk('2n ww 3d ue').steps, [
    'n', 'n', 'w', 'w', 'd', 'd', 'd', 'u', 'e'
  ]);
  for (const command of ['News', 'NEWS', 'NeSw', '2Nww']) {
    const result = parseSpeedwalk(command);
    assert.equal(result.matched, false);
    assert.deepEqual(result.steps, []);
  }
});

test('leaves ordinary commands outside the compact grammar unmatched', () => {
  assert.equal(parseSpeedwalk('look').matched, false);
  assert.equal(parseSpeedwalk('news').matched, false);
  assert.equal(parseSpeedwalk('n e w s').matched, true);
  assert.deepEqual(parseSpeedwalk('n e w s').steps, ['n', 'e', 'w', 's']);
  assert.equal(parseSpeedwalk('4e3x').matched, false);
  assert.equal(parseSpeedwalk('tell bob hello').matched, false);
  assert.equal(parseSpeedwalk('0').matched, false);
  assert.equal(parseSpeedwalk('1').matched, false);
  assert.equal(parseSpeedwalk('12').matched, false);
  assert.equal(parseSpeedwalk('e').matched, false);
  assert.equal(parseSpeedwalk('n').matched, false);
  assert.equal(parseSpeedwalk('1e').matched, false);
});

test('rejects zero repeat counts without partial output', () => {
  for (const route of ['e0n', '00e']) {
    const result = parseSpeedwalk(route);
    assert.equal(result.matched, true);
    assert.deepEqual(result.steps, []);
    assert.match(result.error, /Speedwalk error|repeat counts/u);
  }
});

test('enforces the bounded expanded step limit atomically', () => {
  assert.equal(parseSpeedwalk(`${DEFAULT_MAX_SPEEDWALK_STEPS}e`).steps.length, DEFAULT_MAX_SPEEDWALK_STEPS);
  const tooLong = parseSpeedwalk(`${DEFAULT_MAX_SPEEDWALK_STEPS + 1}e`);
  assert.equal(tooLong.matched, true);
  assert.deepEqual(tooLong.steps, []);
  assert.match(tooLong.error, /safety limit/u);
});

test('rejects repeated-letter routes beyond the safety limit', () => {
  const result = parseSpeedwalk('e'.repeat(DEFAULT_MAX_SPEEDWALK_STEPS + 1));
  assert.equal(result.matched, true);
  assert.deepEqual(result.steps, []);
  assert.match(result.error, /Nothing was sent/u);
});
