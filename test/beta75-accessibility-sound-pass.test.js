'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const audioCueApi = require('../src/audio-cues');
const communications = require('../src/communications');

const root = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('AudioCueController explains the same master playback gates used by play()', () => {
  const controller = new audioCueApi.AudioCueController({ contextFactory: () => ({}) });
  assert.equal(controller.cuePlaybackBlockReason('hit'), 'Audio Cues are off.');
  controller.setEnabled(true);
  controller.setMuted(true);
  assert.equal(controller.cuePlaybackBlockReason('hit'), 'Audio Cues are muted.');
  controller.setMuted(false);
  controller.setForeground(false);
  assert.match(controller.cuePlaybackBlockReason('hit'), /background/u);
  assert.equal(controller.cuePlaybackBlockReason('hit', { allowBackground: true }), '');
  controller.setForeground(true);
  controller.setVolume(0);
  assert.match(controller.cuePlaybackBlockReason('hit'), /0 percent/u);
  assert.match(controller.cuePlaybackBlockReason('not-a-cue'), /not available/u);
});

test('group grats shout and holler remain first-class communication sound events', () => {
  for (const channel of ['group', 'grats', 'shout', 'holler']) {
    const soundpack = source('src/soundpack-store.js');
    assert.ok(soundpack.includes(`'communication.${channel}': '${channel}'`));
  }
  assert.equal(communications.classifyLine("Prime shouts, 'Anyone here?'")?.channel, 'shout');
  assert.equal(communications.classifyLine("Prime hollers, 'Down below!'")?.channel, 'holler');
});

test('soundpack preview and CR tests use event/channel gates and report blocking reasons', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /function soundpackEventPlaybackDecision/u);
  assert.ok(renderer.includes('state.accessibility.communicationCues?.[channel] !== true'));
  assert.match(renderer, /cuePlaybackBlockReason/u);
  assert.ok(renderer.includes('preview blocked: ${result.reason}'));
  assert.ok(renderer.includes('sound test blocked: ${result.reason}'));
  assert.match(renderer, /group, grats, shout, holler, skynet/u);
  assert.doesNotMatch(renderer, /preview could not play\\. Check Audio Cues and mute settings/u);
});

test('ordinary Room.Info up/down exits do not emit the reserved DCC stairs cue', () => {
  const soundpack = source('src/soundpack-store.js');
  assert.match(soundpack, /'room\.stairs': Object\.freeze\(\{ source: 'reserved', status: 'not-emitted'/u);
  assert.ok(soundpack.includes('authoritative DCC/Breach staircase signal'));
  const renderer = source('renderer/renderer.js');
  assert.doesNotMatch(renderer, /roomInfoHasStairs/u);
  assert.doesNotMatch(renderer, /playRoomStairsCue/u);
});
