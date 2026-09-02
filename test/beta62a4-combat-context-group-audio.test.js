'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  AUDIO_CUE_IDS,
  semanticCueForEvent,
  groupSafetyCue
} = require('../src/audio-cues');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
}

function member(name, hp, mhp = 1000) {
  return { name, info: { hp, mhp, mn: 100, mmn: 100, mv: 100, mmv: 100, here: 1 } };
}

test('combat start and end have distinct semantic earcons without target-switch chatter', () => {
  assert.equal(semanticCueForEvent(
    'Char.Vitals',
    { hp: 900, mhp: 1000, opponent: { name: 'Crater Kaiju', hp: 1000, mhp: 1000 } },
    { hp: 900, mhp: 1000 },
    { hp: 900, mhp: 1000, opponent: { name: 'Crater Kaiju', hp: 1000, mhp: 1000 } }
  ), 'combat-start');

  assert.equal(semanticCueForEvent(
    'Char.Vitals',
    { hp: 850, mhp: 1000 },
    { hp: 850, mhp: 1000, opponent: { name: 'Crater Kaiju', hp: 0, mhp: 1000 } },
    { hp: 850, mhp: 1000 }
  ), 'combat-end');

  assert.equal(semanticCueForEvent(
    'Char.Vitals',
    { hp: 850, mhp: 1000, opponent: { name: 'Second Kaiju', hp: 900, mhp: 1000 } },
    { hp: 850, mhp: 1000, opponent: { name: 'First Kaiju', hp: 0, mhp: 1000 } },
    { hp: 850, mhp: 1000, opponent: { name: 'Second Kaiju', hp: 900, mhp: 1000 } }
  ), '');
});

test('self danger keeps priority over combat context sounds', () => {
  assert.equal(semanticCueForEvent(
    'Char.Vitals',
    { hp: 200, mhp: 1000, opponent: { name: 'Crater Kaiju' } },
    { hp: 600, mhp: 1000 },
    { hp: 200, mhp: 1000, opponent: { name: 'Crater Kaiju' } }
  ), 'danger');
});

test('group safety is transition based and rearms after recovery', () => {
  const initialLow = { members: [member('Mo', 900), member('Hiro', 150)] };
  assert.equal(groupSafetyCue({}, initialLow, 'Mo'), '');

  const healthy = { members: [member('Mo', 900), member('Hiro', 700)] };
  const critical = { members: [member('Mo', 900), member('Hiro', 200)] };
  const recovered = { members: [member('Mo', 900), member('Hiro', 500)] };
  assert.equal(groupSafetyCue(healthy, critical, 'Mo'), 'group-critical');
  assert.equal(groupSafetyCue(critical, recovered, 'Mo'), '');
  assert.equal(groupSafetyCue(recovered, critical, 'Mo'), 'group-critical');
});

test('group down outranks group critical and excludes the active character', () => {
  const previous = { members: [member('Mo', 900), member('Hiro', 700), member('Prime', 700)] };
  const next = { members: [member('Mo', 0), member('Hiro', 0), member('Prime', 150)] };
  assert.equal(groupSafetyCue(previous, next, 'Mo'), 'group-down');

  const onlySelfDrops = { members: [member('Mo', 0), member('Hiro', 700)] };
  assert.equal(groupSafetyCue(
    { members: [member('Mo', 900), member('Hiro', 700)] },
    onlySelfDrops,
    'Mo'
  ), '');
});

test('new context cues are testable and renderer passes authoritative snapshots without speech parsing', () => {
  for (const cueId of ['combat-start', 'combat-end', 'group-critical', 'group-down']) {
    assert.ok(AUDIO_CUE_IDS.includes(cueId), cueId);
  }

  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');
  for (const cueId of ['combat-start', 'combat-end', 'group-critical', 'group-down']) {
    assert.match(html, new RegExp(`data-audio-cue-test="${cueId}"`, 'u'));
  }
  assert.match(renderer, /const previousAudioGroup = calculateSemanticAudio && packageName === 'Group' &&/u);
  assert.match(renderer, /state\.gmcp\?\.group && typeof state\.gmcp\.group === 'object'/u);
  assert.match(renderer, /previousGroup: previousAudioGroup/u);
  assert.match(renderer, /nextGroup: snapshot\?\.group \|\| \{\}/u);
  assert.match(renderer, /selfName: snapshot\?\.char\?\.status\?\.name \|\| ''/u);

  const apply = renderer.match(/function applyGmcp\(message\) \{[\s\S]*?\n\}/u)?.[0] || '';
  assert.doesNotMatch(apply, /RegExp|\.match\(/u, 'semantic audio must stay independent of combat text');
});
