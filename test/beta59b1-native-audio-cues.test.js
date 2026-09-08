'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  AUDIO_CUE_IDS,
  CUE_DEFINITIONS,
  DEFAULT_AUDIO_CUE_VOLUME,
  AudioCueController
} = require('../src/audio-cues');
const { normalizeBinding } = require('../src/keybinding-engine');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
}

function fakeContext() {
  const oscillators = [];
  const gains = [];
  function param() {
    return {
      calls: [],
      setValueAtTime(value, time) { this.calls.push(['set', value, time]); },
      exponentialRampToValueAtTime(value, time) { this.calls.push(['ramp', value, time]); }
    };
  }
  const context = {
    currentTime: 10,
    state: 'running',
    destination: {},
    createOscillator() {
      const oscillator = {
        frequency: param(), type: 'sine', starts: [], stops: [], connections: [], onended: null,
        connect(node) { this.connections.push(node); },
        disconnect() {},
        start(time) { this.starts.push(time); },
        stop(time) { this.stops.push(time); }
      };
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain() {
      const gain = { gain: param(), connections: [], connect(node) { this.connections.push(node); }, disconnect() {} };
      gains.push(gain);
      return gain;
    },
    resume() { this.state = 'running'; return Promise.resolve(); },
    close() { return Promise.resolve(); }
  };
  return { context, oscillators, gains };
}

test('built-in audio cue vocabulary is bounded, short, and intentionally distinct', () => {
  assert.deepEqual(AUDIO_CUE_IDS, [
    'hit', 'miss', 'incoming', 'critical', 'catastrophic', 'kill', 'danger',
    'health-75', 'health-50', 'health-10',
    'mana-20', 'mana-5', 'move-50', 'move-5',
    'combat-start', 'combat-end', 'group-critical', 'group-down',
    'tell', 'auction', 'gossip', 'group', 'grats', 'shout', 'holler', 'skynet', 'ssf', 'stairs'
  ]);
  assert.equal(DEFAULT_AUDIO_CUE_VOLUME, 0.65);
  const signatures = new Set();
  for (const cueId of AUDIO_CUE_IDS) {
    const tones = CUE_DEFINITIONS[cueId];
    assert.ok(Array.isArray(tones) && tones.length >= 1 && tones.length <= 3);
    assert.ok(tones.every((tone) => tone.duration > 0 && tone.duration <= 0.1));
    signatures.add(tones.map((tone) => `${tone.frequency}:${tone.endFrequency || ''}:${tone.offset}`).join('|'));
  }
  assert.equal(signatures.size, AUDIO_CUE_IDS.length);
});

test('audio controller lazily schedules a cue with Web Audio and no external process', () => {
  const fake = fakeContext();
  let creates = 0;
  const controller = new AudioCueController({ contextFactory: () => { creates += 1; return fake.context; }, enabled: true });
  assert.equal(creates, 0);
  assert.equal(controller.play('hit'), true);
  assert.equal(creates, 1);
  assert.equal(fake.oscillators.length, 1);
  assert.equal(fake.gains.length, 1);
  assert.equal(fake.oscillators[0].starts.length, 1);
  assert.equal(fake.oscillators[0].stops.length, 1);
});

test('muted and background cues are discarded rather than queued for later catch-up', () => {
  const fake = fakeContext();
  let creates = 0;
  const controller = new AudioCueController({ contextFactory: () => { creates += 1; return fake.context; }, enabled: true });
  controller.setForeground(false);
  assert.equal(controller.play('danger'), false);
  assert.equal(creates, 0);
  controller.setForeground(true);
  assert.equal(creates, 0, 'refocus alone must not replay a suppressed cue');
  controller.setMuted(true);
  assert.equal(controller.play('kill'), false);
  assert.equal(creates, 0);
  controller.setMuted(false);
  assert.equal(controller.play('kill'), true);
  assert.equal(creates, 1);
});

test('muting, disabling, or backgrounding immediately stops active earcons', () => {
  for (const operation of ['muted', 'disabled', 'background']) {
    const fake = fakeContext();
    const controller = new AudioCueController({ contextFactory: () => fake.context, enabled: true });
    assert.equal(controller.play('danger'), true);
    assert.equal(controller.activeCount, 3);
    if (operation === 'muted') controller.setMuted(true);
    if (operation === 'disabled') controller.setEnabled(false);
    if (operation === 'background') controller.setForeground(false);
    assert.equal(controller.activeCount, 0);
    assert.ok(fake.oscillators.every((oscillator) => oscillator.stops.length >= 2));
  }
});

test('audio cue volume is independently clamped without changing speech settings', () => {
  const controller = new AudioCueController({ contextFactory: () => fakeContext().context, volume: 5 });
  assert.equal(controller.volume, 1);
  assert.equal(controller.setVolume(-2), 0);
  assert.equal(controller.setVolume(0.4), 0.4);
});

test('settings schema 47 preserves conservative audio cue defaults and bounded volume', () => {
  const settings = source('src/settings-store.js');
  assert.match(settings, /const SETTINGS_SCHEMA_VERSION = 48;/u);
  assert.match(settings, /audioCuesEnabled: false/u);
  assert.match(settings, /audioCuesMuted: false/u);
  assert.match(settings, /audioCuesForegroundOnly: true/u);
  assert.match(settings, /audioCuesVolume: 0\.65/u);
  assert.match(settings, /boundedNumber\(\s*accessibility\.audioCuesVolume, 0, 1, DEFAULT_SETTINGS\.accessibility\.audioCuesVolume/u);
});

test('Accessibility UI exposes built-in cue tests and reuses whole-app foreground state', () => {
  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');
  assert.match(html, /id="audio-cues-enabled"/u);
  assert.match(html, /id="audio-cues-foreground-only"[^>]*checked/u);
  for (const cueId of AUDIO_CUE_IDS) assert.match(html, new RegExp(`data-audio-cue-test="${cueId}"`, 'u'));
  assert.match(html, /src="\.\.\/src\/audio-cues\.js"/u);
  assert.match(renderer, /function setSelfVoiceAppForeground\(foreground\)[\s\S]*syncAudioCueForegroundState\(\)/u);
  assert.match(html, /Cues play immediately and are never queued/u);
  assert.match(renderer, /setAudioCuesEnabled\(localStorage\.getItem\('nukefire\.audioCuesEnabled'\) === 'true'/u);
  assert.match(renderer, /setAudioCuesEnabled\(event\.target\.checked, \{ unlock: true \}\)/u);
  assert.match(renderer, /value === null \|\| value === undefined \|\| value === '' \? Number\.NaN/u);
  assert.match(renderer, /document\.addEventListener\('keydown', unlockAudioCuesFromUserGesture, true\)/u);
});

test('audio cue controls are commandless configurable accessibility actions', () => {
  const ids = ['toggle-audio-cues', 'mute-audio-cues', 'unmute-audio-cues', 'toggle-audio-cue-mute', 'test-audio-cue', 'stop-audio-cues'];
  for (let index = 0; index < ids.length; index += 1) {
    const binding = normalizeBinding({
      id: `audio-${index}`,
      code: `F${11 + index}`,
      command: '',
      semantic: { type: 'accessibility', id: ids[index] }
    });
    assert.ok(binding, ids[index]);
    assert.equal(binding.command, '');
    assert.deepEqual(binding.semantic, { type: 'accessibility', id: ids[index] });
  }
  const renderer = source('renderer/renderer.js');
  for (const id of ids) assert.match(renderer, new RegExp(`id === '${id}'`, 'u'));
});
