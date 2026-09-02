'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { semanticCueForEvent } = require('../src/audio-cues');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
}

function combat(overrides = {}) {
  return {
    schema: 1,
    window_ms: 200,
    out: { hits: 0, misses: 0, damage: 0, kills: 0 },
    in: { hits: 0, misses: 0, damage: 0, deaths: 0 },
    ...overrides
  };
}

test('semantic combat audio chooses one highest-value cue per bounded combat packet', () => {
  const vitals = { hp: 800, mhp: 1000 };

  assert.equal(semanticCueForEvent('NukeFire.Combat', combat({
    out: { hits: 8, misses: 2, damage: 500, kills: 1 },
    in: { hits: 5, misses: 0, damage: 900, deaths: 1 }
  }), vitals, vitals), 'danger');

  assert.equal(semanticCueForEvent('NukeFire.Combat', combat({
    out: { hits: 8, misses: 0, damage: 500, kills: 1 },
    in: { hits: 5, misses: 0, damage: 250, deaths: 0 }
  }), vitals, vitals), 'critical');

  assert.equal(semanticCueForEvent('NukeFire.Combat', combat({
    out: { hits: 3, misses: 0, damage: 200, kills: 1 },
    in: { hits: 2, misses: 0, damage: 100, deaths: 0 }
  }), vitals, vitals), 'kill');

  assert.equal(semanticCueForEvent('NukeFire.Combat', combat({
    out: { hits: 4, misses: 0, damage: 200, kills: 0 },
    in: { hits: 2, misses: 0, damage: 100, deaths: 0 }
  }), vitals, vitals), 'incoming');

  assert.equal(semanticCueForEvent('NukeFire.Combat', combat({
    out: { hits: 4, misses: 0, damage: 200, kills: 0 }
  }), vitals, vitals), 'hit');

  assert.equal(semanticCueForEvent('NukeFire.Combat', combat({
    out: { hits: 0, misses: 3, damage: 0, kills: 0 }
  }), vitals, vitals), 'miss');

  assert.equal(semanticCueForEvent('NukeFire.Combat', combat(), vitals, vitals), '');
});

test('heavy incoming damage uses maximum health instead of arbitrary damage numbers', () => {
  const vitals = { hp: 900000000, mhp: 1000000000 };
  const under = combat({ in: { hits: 1, misses: 0, damage: 249999999, deaths: 0 } });
  const edge = combat({ in: { hits: 1, misses: 0, damage: 250000000, deaths: 0 } });

  assert.equal(semanticCueForEvent('NukeFire.Combat', under, vitals, vitals), 'incoming');
  assert.equal(semanticCueForEvent('NukeFire.Combat', edge, vitals, vitals), 'critical');
});

test('danger cue fires on a real low-health crossing but not on an initial low baseline', () => {
  assert.equal(semanticCueForEvent(
    'Char.Vitals',
    { hp: 200, mhp: 1000 },
    {},
    { hp: 200, mhp: 1000 }
  ), '');

  assert.equal(semanticCueForEvent(
    'Char.Vitals',
    { hp: 250, mhp: 1000 },
    { hp: 600, mhp: 1000 },
    { hp: 250, mhp: 1000 }
  ), 'danger');

  assert.equal(semanticCueForEvent(
    'Char.Vitals',
    { hp: 0, mhp: 1000 },
    { hp: 100, mhp: 1000 },
    { hp: 0, mhp: 1000 }
  ), 'danger');
});

test('renderer routes semantic GMCP to Audio Cues without adding speech or text parsing', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /function playSemanticAudioCue\(cueId\)/u);
  assert.match(renderer, /audioCueApi\.semanticCueForEvent\(/u);
  assert.match(renderer, /const calculateSemanticAudio = semanticAudioActive && semanticAudioPackage/u);
  assert.match(renderer, /const previousAudioVitals = calculateSemanticAudio && packageName !== 'Group'[\s\S]*?\? \{ \.\.\.\(state\.gmcp\?\.char\?\.vitals \|\| \{\}\) \}/u);
  assert.match(renderer, /if \(semanticCue\) playSemanticAudioCue\(semanticCue\);/u);

  const helper = renderer.match(/function playSemanticAudioCue\(cueId\) \{[\s\S]*?\n\}/u)?.[0] || '';
  assert.doesNotMatch(helper, /announce\(/u, 'live semantic cues must not create another speech stream');
  assert.doesNotMatch(helper, /match\(|RegExp|includes\(/u, 'semantic audio must not parse combat text');
});
