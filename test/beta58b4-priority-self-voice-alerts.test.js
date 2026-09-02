'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  SelfVoiceController,
  priorityBacklogNotice
} = require('../src/self-voice');
const communications = require('../src/communications');

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

function priorityClassifier(text) {
  const classified = communications.classifyLine(text);
  return classified?.channel === 'tell' || classified?.channel === 'system';
}

function governedVoice() {
  const synth = managedSynth();
  let now = 0;
  const voice = new SelfVoiceController({
    synth,
    Utterance: FakeUtterance,
    clock: () => now,
    governorGraceMs: 1200,
    governorBurstLines: 200,
    governorTailLines: 3
  });
  voice.setGovernorEnabled(true);
  voice.setEnabled(true);
  return { synth, voice, setNow(value) { now = value; } };
}

test('recognized Tell lines barge in over stale governed live speech', () => {
  const { synth, voice } = governedVoice();
  voice.write('combat one\ncombat two\ncombat three\n');
  assert.deepEqual(synth.spoken, ['combat one']);
  const before = synth.cancelCount;

  voice.write('Bob tells you, "Incoming!"\n', { isPriorityLine: priorityClassifier });

  assert.equal(synth.cancelCount, before + 1);
  assert.equal(synth.spoken.at(-1), 'Bob tells you, "Incoming!"');
  assert.deepEqual(voice.liveQueue, [priorityBacklogNotice(3)]);
});

test('priority notice follows the Tell and preserves the interrupted-line count', () => {
  const { synth, voice } = governedVoice();
  voice.write('one\ntwo\nthree\n');
  voice.write('Alice tells you, "hello"\n', { isPriorityLine: priorityClassifier });
  assert.equal(synth.spoken.at(-1), 'Alice tells you, "hello"');
  synth.finish();
  assert.equal(synth.spoken.at(-1), priorityBacklogNotice(3));
});

test('recognized System lines also receive priority while ordinary channels do not', () => {
  const { synth, voice } = governedVoice();
  voice.write('baseline\nwaiting\n');
  const before = synth.cancelCount;
  voice.write('[Gossip] Bob: hello\n', { isPriorityLine: priorityClassifier });
  assert.equal(synth.cancelCount, before);
  voice.write('[System] Reactor warning\n', { isPriorityLine: priorityClassifier });
  assert.equal(synth.cancelCount, before + 1);
  assert.equal(synth.spoken.at(-1), '[System] Reactor warning');
});

test('renderer priority toggle can leave the same Tell on the normal governed path', () => {
  const { synth, voice } = governedVoice();
  voice.write('combat\nwaiting\n');
  const before = synth.cancelCount;
  voice.write('Bob tells you, "quiet path"\n', { isPriorityLine: () => false });
  assert.equal(synth.cancelCount, before);
  assert.deepEqual(synth.spoken, ['combat']);
  assert.deepEqual(voice.liveQueue, ['waiting', 'Bob tells you, "quiet path"']);
});

test('priority alerts still barge in when backlog condensation is disabled', () => {
  const synth = managedSynth();
  const voice = new SelfVoiceController({ synth, Utterance: FakeUtterance });
  voice.setEnabled(true);
  voice.setGovernorEnabled(false);
  voice.write('one\ntwo\n');
  const before = synth.cancelCount;
  voice.write('Bob tells you, "priority"\n', { isPriorityLine: priorityClassifier });
  assert.equal(synth.cancelCount, before + 1);
  assert.equal(synth.spoken.at(-1), 'Bob tells you, "priority"');
});

test('priority setting is persisted, defaults on, and is exposed in Accessibility preferences', () => {
  const settings = fs.readFileSync('src/settings-store.js', 'utf8');
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  const html = fs.readFileSync('renderer/index.html', 'utf8');

  assert.match(settings, /selfVoicePriorityAlertsEnabled: true/);
  assert.match(settings, /DEFAULT_SETTINGS\.accessibility\.selfVoicePriorityAlertsEnabled/);
  assert.match(renderer, /nukefire\.selfVoicePriorityAlertsEnabled/);
  assert.match(html, /id="self-voice-priority-alerts-enabled"[^>]*checked> Prioritize Tell and System self-voice/);
});

test('priority classification happens before self-voice queueing and has a commandless configurable toggle', () => {
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  const write = renderer.indexOf('selfVoice?.write?.(selfVoicePlain, selfVoiceLineOptions())');
  const capture = renderer.indexOf('captureCommunicationText(raw, sourcePlain)', write);
  const helper = renderer.indexOf('function selfVoiceLineOptions()');
  const classify = renderer.indexOf('communicationsApi.classifyLine(line)', helper);

  assert.ok(write >= 0 && capture > write && helper >= 0 && classify > helper,
    'priority must be classified synchronously during self-voice routing before Communications creates its duplicate/history representation');
  assert.match(renderer, /id: 'toggle-self-voice-priority-alerts'/);
  assert.match(renderer, /setSelfVoicePriorityAlertsEnabled\(!state\.accessibility\.selfVoicePriorityAlertsEnabled\)/);
});
