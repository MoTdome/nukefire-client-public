'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  SelfVoiceController,
  normalizeVoiceSettings
} = require('../src/self-voice');

class FakeUtterance {
  constructor(text) {
    this.text = text;
    this.rate = 1;
    this.pitch = 1;
    this.volume = 1;
    this.voice = null;
    this.onend = null;
    this.onerror = null;
  }
}

function makeSynth() {
  return {
    spoken: [],
    cancelled: 0,
    paused: false,
    speak(utterance) { this.spoken.push(utterance); },
    cancel() { this.cancelled += 1; }
  };
}

function makeController(options = {}) {
  const synth = makeSynth();
  const controller = new SelfVoiceController({ synth, Utterance: FakeUtterance, ...options });
  controller.setEnabled(true);
  return { controller, synth };
}

test('self-voice settings default safely and clamp to Web Speech ranges', () => {
  assert.deepEqual(normalizeVoiceSettings({}), { rate: 1, pitch: 1, volume: 1, voiceId: '' });
  assert.deepEqual(normalizeVoiceSettings({ rate: 99, pitch: -3, volume: 4, voiceId: '  voice-a  ' }), {
    rate: 10, pitch: 0, volume: 1, voiceId: 'voice-a'
  });
  assert.equal(normalizeVoiceSettings({ rate: 0 }).rate, 0.1);
});

test('ordinary self-voice utterances receive rate, pitch, and volume', () => {
  const { controller, synth } = makeController();
  controller.setVoiceSettings({ rate: 8, pitch: 1.35, volume: 0.55 });
  assert.equal(controller.speak('fast reader'), true);
  assert.equal(synth.spoken.length, 1);
  assert.equal(synth.spoken[0].rate, 8);
  assert.equal(synth.spoken[0].pitch, 1.35);
  assert.equal(synth.spoken[0].volume, 0.55);
});

test('governed live speech uses the same voice settings', () => {
  const { controller, synth } = makeController();
  controller.setVoiceSettings({ rate: 6.5, pitch: 0.8, volume: 0.9 });
  controller.setGovernorEnabled(true);
  controller.write('combat line\n');
  assert.equal(synth.spoken.length, 1);
  assert.equal(synth.spoken[0].rate, 6.5);
  assert.equal(synth.spoken[0].pitch, 0.8);
  assert.equal(synth.spoken[0].volume, 0.9);
});

test('a selected system voice is applied to new utterances', () => {
  const { controller, synth } = makeController();
  const voice = { voiceURI: 'voice://southpaw', name: 'Southpaw Fast', lang: 'en-US' };
  controller.setVoice(voice);
  controller.speak('voice selected');
  assert.equal(synth.spoken[0].voice, voice);
});

test('changing voice settings affects later speech without rebuilding the controller', () => {
  const { controller, synth } = makeController();
  controller.speak('first');
  controller.setVoiceSettings({ rate: 9 });
  controller.speak('second');
  assert.equal(synth.spoken[0].rate, 1);
  assert.equal(synth.spoken[1].rate, 9);
});

test('Accessibility preferences expose speed, pitch, volume, and system voice controls', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  for (const id of ['self-voice-rate', 'self-voice-pitch', 'self-voice-volume', 'self-voice-voice']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /max="10"[^>]*aria-label="Self-Voice speed"/);
});

test('renderer persists voice tuning and refreshes voices when the platform voice list changes', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(renderer, /nukefire\.selfVoiceRate/);
  assert.match(renderer, /nukefire\.selfVoicePitch/);
  assert.match(renderer, /nukefire\.selfVoiceVolume/);
  assert.match(renderer, /nukefire\.selfVoiceVoiceId/);
  assert.match(renderer, /voiceschanged/);
  assert.match(renderer, /getVoices/);
});

test('settings store normalizes and persists the new self-voice tuning fields', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'settings-store.js'), 'utf8');
  assert.match(source, /SETTINGS_SCHEMA_VERSION = 48/);
  assert.match(source, /selfVoiceRate: 1/);
  assert.match(source, /selfVoicePitch: 1/);
  assert.match(source, /selfVoiceVolume: 1/);
  assert.match(source, /selfVoiceVoiceId: ''/);
  assert.match(source, /boundedNumber\(accessibility\.selfVoiceRate, 0\.1, 10/);
});
