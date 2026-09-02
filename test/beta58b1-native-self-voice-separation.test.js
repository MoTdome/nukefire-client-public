'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { SelfVoiceController } = require('../src/self-voice');
const { normalizeBinding } = require('../src/keybinding-engine');

class FakeUtterance {
  constructor(text) {
    this.text = text;
  }
}

function fakeSynth() {
  return {
    spoken: [],
    cancelCount: 0,
    paused: false,
    speak(utterance) { this.spoken.push(utterance.text); },
    cancel() { this.cancelCount += 1; },
    resume() { this.paused = false; }
  };
}

test('self-voice is opt-in, line-oriented, and preserves partial lines until completion', () => {
  const synth = fakeSynth();
  const voice = new SelfVoiceController({ synth, Utterance: FakeUtterance });
  assert.equal(voice.enabled, false);
  assert.deepEqual(voice.write('silent\n'), []);

  assert.equal(voice.setEnabled(true), true);
  assert.deepEqual(voice.write('room one\nroom'), ['room one']);
  assert.deepEqual(synth.spoken, ['room one']);
  assert.equal(voice.commitBoundary(), true);
  assert.deepEqual(synth.spoken, ['room one', 'room']);
});

test('self-voice stop and session changes cancel queued speech and clear carry', () => {
  const synth = fakeSynth();
  const voice = new SelfVoiceController({ synth, Utterance: FakeUtterance });
  voice.setEnabled(true);
  voice.setSession('alpha');
  voice.write('unfinished');
  voice.setSession('beta');
  assert.ok(synth.cancelCount >= 1);
  assert.equal(voice.commitBoundary(), false);

  voice.speak('beta line');
  voice.stop();
  assert.equal(synth.spoken.at(-1), 'beta line');
  assert.ok(synth.cancelCount >= 2);
});

test('self-voice backend failures are contained and never throw into the client loop', () => {
  const synth = {
    speak() { throw new Error('backend vanished'); },
    cancel() { throw new Error('cancel failed'); }
  };
  const voice = new SelfVoiceController({ synth, Utterance: FakeUtterance });
  assert.equal(voice.setEnabled(true), true);
  assert.doesNotThrow(() => voice.speak('hello'));
  assert.equal(voice.speak('hello'), false);
  assert.match(voice.lastError, /backend vanished/);
  assert.doesNotThrow(() => voice.stop());
});

test('settings source persists self-voice and keeps malformed native+self input mutually exclusive', () => {
  const source = fs.readFileSync('src/settings-store.js', 'utf8');
  assert.match(source, /selfVoiceEnabled: false/);
  assert.match(source, /selfVoiceEnabled: requestedSelfVoice && !screenReaderMode/);
  assert.match(source, /selfVoiceEnabled: legacy\.selfVoiceEnabled/);
});

test('Stop Self-Voice Now is a commandless local semantic keybinding', () => {
  const binding = normalizeBinding({
    id: 'stop-voice',
    code: 'F11',
    label: 'Stop Self-Voice Now',
    command: '',
    semantic: { type: 'accessibility', id: 'stop-self-voice' }
  });
  assert.ok(binding);
  assert.equal(binding.command, '');
  assert.deepEqual(binding.semantic, { type: 'accessibility', id: 'stop-self-voice' });
});

test('renderer exposes separate native/self-voice controls and routes active transformed output to self-voice', () => {
  const html = fs.readFileSync('renderer/index.html', 'utf8');
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  assert.match(html, /id="screen-reader-mode"[^>]*> Native screen reader mode/);
  assert.match(html, /id="self-voice-enabled"[^>]*> NukeFire self-voice/);
  assert.match(html, /id="self-voice-stop"[^>]*>Stop Self-Voice Now/);
  assert.match(html, /src="\.\.\/src\/self-voice\.js"/);
  assert.match(renderer, /state\.accessibility\.selfVoiceEnabled && selfVoice\?\.speak/);
  assert.match(renderer, /if \(!localDisplay\) routeSoundTriggerChunk\(displayPlain, record\)/);
  assert.match(renderer, /routeSpeechTriggerChunk\(displayPlain, record\)/);
  assert.match(renderer, /selfVoice\?\.write\?\.\(selfVoicePlain, selfVoiceLineOptions\(\)\)/);
  assert.match(renderer, /selfVoice\?\.setSession\?\.\(sessionId\)/);

  const inactiveStart = renderer.indexOf('function appendTextToInactiveSession');
  const inactiveEnd = renderer.indexOf('function flushInactiveHighlightText', inactiveStart);
  assert.ok(inactiveStart >= 0 && inactiveEnd > inactiveStart);
  assert.doesNotMatch(renderer.slice(inactiveStart, inactiveEnd), /selfVoice/u);
  assert.match(renderer, /case 'text': appendTextToInactiveSession\(record, payload\);/u);
});
