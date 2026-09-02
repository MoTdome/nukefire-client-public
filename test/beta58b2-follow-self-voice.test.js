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

test('follow interruption cuts current speech without discarding an unfinished next line', () => {
  const synth = fakeSynth();
  const voice = new SelfVoiceController({ synth, Utterance: FakeUtterance });
  voice.setEnabled(true);
  voice.write('old room line\nnew room');
  const before = synth.cancelCount;
  assert.equal(voice.interrupt(), true);
  assert.equal(synth.cancelCount, before + 1);
  assert.equal(voice.commitBoundary(), true);
  assert.deepEqual(synth.spoken, ['old room line', 'new room']);
});

test('panic stop still clears carry while follow interrupt preserves it', () => {
  const synth = fakeSynth();
  const voice = new SelfVoiceController({ synth, Utterance: FakeUtterance });
  voice.setEnabled(true);
  voice.write('unfinished');
  voice.interrupt();
  assert.equal(voice.commitBoundary(), true);
  voice.write('discard me');
  voice.stop();
  assert.equal(voice.commitBoundary(), false);
});

test('follow self-voice is opt-in and persists through settings normalization source', () => {
  const source = fs.readFileSync('src/settings-store.js', 'utf8');
  assert.match(source, /selfVoiceFollowMode: false/);
  assert.match(source, /accessibility\.selfVoiceFollowMode/);
  assert.match(source, /DEFAULT_SETTINGS\.accessibility\.selfVoiceFollowMode/);
  assert.match(source, /selfVoiceFollowMode: legacy\.selfVoiceFollowMode/);
});

test('renderer exposes an opt-in follow control and persists it independently of self-voice enablement', () => {
  const html = fs.readFileSync('renderer/index.html', 'utf8');
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  assert.match(html, /id="self-voice-follow-mode"[^>]*> Follow self-voice on room movement/);
  assert.match(renderer, /selfVoiceFollowMode: false/);
  assert.match(renderer, /localStorage\.setItem\('nukefire\.selfVoiceFollowMode'/);
  assert.match(renderer, /setSelfVoiceFollowMode\(accessibility\.selfVoiceFollowMode === true/);
});

test('recognized active-session movement interrupts stale self-voice once per queued movement burst', () => {
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  assert.match(renderer, /const activeSession = sessionId === state\.sessions\.activeId;/);
  assert.match(renderer, /const queue = ensureMapperMovementQueue\(record\.mapper\);/);
  assert.match(renderer, /const hadPendingMovement = queue\.length > 0 \|\| Boolean\(record\.mapper\.pendingMove\);/);
  assert.match(renderer, /if \(activeSession && !hadPendingMovement\) interruptSelfVoiceForMovement\(\);/);
  assert.match(renderer, /if \(!state\.accessibility\.selfVoiceEnabled \|\| !state\.accessibility\.selfVoiceFollowMode\) return false;/);
});

test('authoritative Room.Info changes provide a fallback interrupt only when no queued movement explains the room change', () => {
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  assert.match(renderer, /const previousRoomId = state\.mapper\.lastRoomId \|\| '';/);
  assert.match(renderer, /const roomChanged = Boolean\(previousRoomId && previousRoomId !== roomId\);/);
  assert.match(renderer, /const movement = takeMapperMovementForRoom\(state\.mapper, previousRoomId, roomChanged, now\);/);
  assert.match(renderer, /if \(roomChanged && !movement\.valid\) interruptSelfVoiceForMovement\(\);/);
  assert.match(renderer, /now - Number\(queue\[0\]\?\.at \|\| 0\) > 12000/u);
});

test('Toggle Follow Self-Voice is a commandless configurable accessibility action with no default key', () => {
  const binding = normalizeBinding({
    id: 'follow-voice',
    code: 'F10',
    label: 'Toggle Follow Self-Voice',
    command: '',
    semantic: { type: 'accessibility', id: 'toggle-self-voice-follow' }
  });
  assert.ok(binding);
  assert.equal(binding.command, '');
  assert.deepEqual(binding.semantic, { type: 'accessibility', id: 'toggle-self-voice-follow' });

  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  assert.match(renderer, /id: 'toggle-self-voice-follow'/);
  assert.match(renderer, /setSelfVoiceFollowMode\(!state\.accessibility\.selfVoiceFollowMode\)/);
});
