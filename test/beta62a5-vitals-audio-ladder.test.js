'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  AUDIO_CUE_IDS,
  semanticCueForEvent,
  vitalsThresholdCue
} = require('../src/audio-cues');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
}

function vitals(hp, mana = 100, move = 100, maxima = {}) {
  return {
    hp,
    mhp: maxima.hp || 100,
    mana,
    mmana: maxima.mana || 100,
    move,
    mmove: maxima.move || 100
  };
}

function combat(incomingDamage) {
  return {
    schema: 1,
    window_ms: 200,
    out: { hits: 0, misses: 0, damage: 0, kills: 0 },
    in: { hits: incomingDamage > 0 ? 1 : 0, misses: 0, damage: incomingDamage, deaths: 0 }
  };
}

test('health ladder follows 75 50 25 10 downward crossings without initial-low spam', () => {
  assert.equal(vitalsThresholdCue({}, vitals(9)), '');
  assert.equal(vitalsThresholdCue(vitals(90), vitals(75)), 'health-75');
  assert.equal(vitalsThresholdCue(vitals(60), vitals(50)), 'health-50');
  assert.equal(vitalsThresholdCue(vitals(40), vitals(25)), 'danger');
  assert.equal(vitalsThresholdCue(vitals(20), vitals(10)), 'health-10');
});

test('health ladder chooses only the most urgent threshold crossed by one vitals update', () => {
  assert.equal(vitalsThresholdCue(vitals(90), vitals(8)), 'health-10');
  assert.equal(vitalsThresholdCue(vitals(90), vitals(20)), 'danger');
  assert.equal(vitalsThresholdCue(vitals(90), vitals(45)), 'health-50');
});

test('health thresholds rearm naturally after recovery and do not repeat while parked low', () => {
  assert.equal(vitalsThresholdCue(vitals(80), vitals(70)), 'health-75');
  assert.equal(vitalsThresholdCue(vitals(70), vitals(65)), '');
  assert.equal(vitalsThresholdCue(vitals(65), vitals(85)), '');
  assert.equal(vitalsThresholdCue(vitals(85), vitals(70)), 'health-75');
});

test('mana and movement follow the current Southpaw GMCP plugin thresholds', () => {
  assert.equal(vitalsThresholdCue(vitals(100, 30, 100), vitals(100, 20, 100)), 'mana-20');
  assert.equal(vitalsThresholdCue(vitals(100, 10, 100), vitals(100, 5, 100)), 'mana-5');
  assert.equal(vitalsThresholdCue(vitals(100, 100, 70), vitals(100, 100, 50)), 'move-50');
  assert.equal(vitalsThresholdCue(vitals(100, 100, 10), vitals(100, 100, 5)), 'move-5');
});

test('one Char.Vitals packet produces one prioritized resource cue with health first', () => {
  assert.equal(
    vitalsThresholdCue(vitals(80, 30, 70), vitals(20, 3, 3)),
    'danger'
  );
  assert.equal(
    vitalsThresholdCue(vitals(100, 30, 70), vitals(100, 3, 3)),
    'mana-5'
  );
});

test('catastrophic hit preserves Southpaw strict greater-than-half-health boundary', () => {
  const current = vitals(100, 100, 100, { hp: 1000 });
  assert.equal(semanticCueForEvent('NukeFire.Combat', combat(500), current, current), 'critical');
  assert.equal(semanticCueForEvent('NukeFire.Combat', combat(501), current, current), 'catastrophic');
});

test('vitals ladder is a semantic audio path only and every new earcon is testable', () => {
  const expected = [
    'catastrophic', 'health-75', 'health-50', 'health-10',
    'mana-20', 'mana-5', 'move-50', 'move-5'
  ];
  for (const cueId of expected) assert.ok(AUDIO_CUE_IDS.includes(cueId), cueId);

  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');
  for (const cueId of expected) {
    assert.match(html, new RegExp(`data-audio-cue-test="${cueId}"`, 'u'));
  }
  assert.match(html, /health 75\/50\/25\/10, mana 20\/5, and movement 50\/5/u);

  const apply = renderer.match(/function applyGmcp\(message\) \{[\s\S]*?\n\}/u)?.[0] || '';
  assert.match(apply, /audioCueApi\.semanticCueForEvent\(/u);
  assert.doesNotMatch(apply, /Simulate|RegExp|\.match\(/u);
  const liveAudio = renderer.match(/function playSemanticAudioCue\(cueId\) \{[\s\S]*?\n\}/u)?.[0] || '';
  assert.doesNotMatch(liveAudio, /announce\(/u, 'vitals audio must not create NukeFire Voice chatter');
});
