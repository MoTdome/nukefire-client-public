'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  SelfVoiceController,
  backlogNotice
} = require('../src/self-voice');

class FakeUtterance {
  constructor(text) {
    this.text = text;
    this.onend = null;
    this.onerror = null;
  }
}

function managedSynth() {
  return {
    spoken: [],
    cancelCount: 0,
    paused: false,
    current: null,
    speak(utterance) {
      this.spoken.push(utterance.text);
      this.current = utterance;
    },
    cancel() {
      this.cancelCount += 1;
      this.current = null;
    },
    resume() { this.paused = false; },
    finish() {
      const utterance = this.current;
      this.current = null;
      utterance?.onend?.();
    }
  };
}

function governedVoice(options = {}) {
  const synth = managedSynth();
  let now = 0;
  const voice = new SelfVoiceController({
    synth,
    Utterance: FakeUtterance,
    clock: () => now,
    governorGraceMs: options.governorGraceMs ?? 1200,
    governorBurstLines: options.governorBurstLines ?? 200,
    governorTailLines: options.governorTailLines ?? 3
  });
  voice.setGovernorEnabled(true);
  voice.setEnabled(true);
  return {
    synth,
    voice,
    setNow(value) { now = value; }
  };
}

test('governor preserves an ordinary burst completely when no fresh output arrives behind it', () => {
  const { synth, voice } = governedVoice();
  assert.deepEqual(voice.write('room one\nroom two\nroom three\n'), ['room one', 'room two', 'room three']);
  assert.deepEqual(synth.spoken, ['room one']);
  synth.finish();
  synth.finish();
  synth.finish();
  assert.deepEqual(synth.spoken, ['room one', 'room two', 'room three']);
  assert.equal(voice.suppressedLines, 0);
  assert.equal(voice.floodMode, false);
});

test('sustained output condenses stale pending speech, announces the count, and keeps the newest tail', () => {
  const { synth, voice, setNow } = governedVoice({ governorTailLines: 3 });
  voice.write('old1\nold2\nold3\nold4\nold5\nold6\nold7\nold8\n');
  assert.deepEqual(synth.spoken, ['old1']);

  setNow(2000);
  voice.write('fresh1\nfresh2\nfresh3\nfresh4\n');
  assert.equal(voice.floodMode, true);
  assert.equal(voice.suppressedLines, 8);
  assert.deepEqual(voice.liveQueue, ['fresh2', 'fresh3', 'fresh4']);

  synth.finish();
  assert.equal(synth.spoken.at(-1), backlogNotice(8));
  synth.finish();
  synth.finish();
  synth.finish();
  synth.finish();
  assert.deepEqual(synth.spoken.slice(-4), [backlogNotice(8), 'fresh2', 'fresh3', 'fresh4']);
});

test('pathological one-arrival floods are bounded even inside the normal burst grace window', () => {
  const { synth, voice } = governedVoice({ governorBurstLines: 5, governorTailLines: 2 });
  voice.write('one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\n');
  assert.equal(voice.floodMode, true);
  assert.equal(voice.suppressedLines, 5);
  assert.deepEqual(voice.liveQueue, ['seven', 'eight']);
  synth.finish();
  assert.equal(synth.spoken.at(-1), backlogNotice(5));
});

test('panic stop drops governed pending speech and its condensation notice', () => {
  const { synth, voice, setNow } = governedVoice({ governorTailLines: 2 });
  voice.write('a\nb\nc\nd\n');
  setNow(2000);
  voice.write('e\nf\ng\n');
  assert.ok(voice.suppressedLines > 0);
  voice.write('partial');
  const before = synth.cancelCount;
  assert.equal(voice.stop(), true);
  assert.equal(synth.cancelCount, before + 1);
  assert.deepEqual(voice.liveQueue, []);
  assert.equal(voice.suppressedLines, 0);
  assert.equal(voice.carry, '');
  assert.equal(voice.commitBoundary(), false);
});

test('follow interruption clears stale pending lines but preserves an owed condensation count and partial next line', () => {
  const { synth, voice, setNow } = governedVoice({ governorTailLines: 2 });
  voice.write('old1\nold2\nold3\nold4\n');
  setNow(2000);
  voice.write('new1\nnew2\nnew3\npartial');
  const owed = voice.suppressedLines;
  assert.ok(owed > 0);
  assert.equal(voice.interrupt(), true);
  assert.deepEqual(voice.liveQueue, []);
  assert.equal(voice.suppressedLines, owed);
  assert.equal(voice.carry, 'partial');
  assert.equal(voice.commitBoundary(), true);
  assert.equal(synth.spoken.at(-1), backlogNotice(owed));
});

test('turning the governor off retains Beta.58b.1 immediate self-voice behavior', () => {
  const synth = managedSynth();
  const voice = new SelfVoiceController({ synth, Utterance: FakeUtterance });
  voice.setEnabled(true);
  voice.setGovernorEnabled(false);
  assert.deepEqual(voice.write('one\ntwo\nthree\n'), ['one', 'two', 'three']);
  assert.deepEqual(synth.spoken, ['one', 'two', 'three']);
});

test('governor persistence and renderer ordering preserve the complete game text outside the speech queue', () => {
  const settings = fs.readFileSync('src/settings-store.js', 'utf8');
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  const html = fs.readFileSync('renderer/index.html', 'utf8');

  assert.match(settings, /selfVoiceGovernorEnabled: true/);
  assert.match(settings, /DEFAULT_SETTINGS\.accessibility\.selfVoiceGovernorEnabled/);
  assert.match(html, /id="self-voice-governor-enabled"[^>]*checked> Condense sustained self-voice backlog/);
  assert.match(html, /every real line remains available in terminal history and Reader Review/);

  const runtimeAppend = renderer.indexOf('sessionRuntimeApi.appendText(record, raw');
  const routedSpeech = renderer.indexOf('routeSoundTriggerChunk(displayPlain, record)');
  const speechWrite = renderer.indexOf('selfVoice?.write?.(selfVoicePlain, selfVoiceLineOptions())');
  assert.ok(runtimeAppend >= 0 && routedSpeech > runtimeAppend && speechWrite > routedSpeech,
    'full session/Reader text must be recorded before sound routing or self-voice can condense it');
});
