'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  ReaderTutorial,
  AUDIO_TUTORIAL_STEPS,
  TUTORIAL_STEPS
} = require('../src/reader-onboarding');
const { CONTROL_REQUEST_ACTIONS, normalizeControlRequest } = require('../src/semantic-controls');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

function blockBetween(startNeedle, endNeedle) {
  const start = renderer.indexOf(startNeedle);
  const end = renderer.indexOf(endNeedle, start + startNeedle.length);
  return start >= 0 && end > start ? renderer.slice(start, end) : '';
}

test('essential Reader tutorial stays short while pointing to the optional audio guide', () => {
  assert.equal(TUTORIAL_STEPS.length, 4);
  assert.match(TUTORIAL_STEPS.at(-1).text, /C R tutorial audio/iu);
});

test('audio tutorial is a compact job-based MUSHclient and Mudlet migration guide', () => {
  assert.equal(AUDIO_TUTORIAL_STEPS.length, 7);
  const text = AUDIO_TUTORIAL_STEPS.map((step) => step.text).join('\n');
  for (const phrase of [
    'C R VOICE', 'C R AUDIO', 'C R SPEECH', 'C R OUTPUT',
    'C R SPEECH LAST OFF', 'C R OUTPUT LAST OFF',
    'C R LINES', 'C R UNREAD', 'C R ALERTS ON'
  ]) assert.match(text, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'iu'), phrase);
  assert.match(text, /If you only want less talking, use SPEECH, not OUTPUT/iu);
  assert.match(text, /text stays on screen and in Reader Review/iu);
});

test('audio tutorial uses manual next/back navigation and does not steal gameplay actions', () => {
  const tutorial = new ReaderTutorial();
  const first = tutorial.start({ mode: 'live', track: 'audio' });
  assert.equal(first.track, 'audio');
  assert.equal(first.id, 'audio-map');
  assert.equal(first.expectedAction, '');
  assert.equal(tutorial.accept('history-latest').matched, false);
  assert.equal(tutorial.next().id, 'voice-audio');
  assert.equal(tutorial.back().id, 'audio-map');
  while (tutorial.status().active) tutorial.next();
  assert.equal(tutorial.status().completed, true);
});

test('CR tutorial audio starts the audio track and leaves first-run essentials unchanged', () => {
  assert.match(renderer, /action === 'audio' \|\| action === 'filtering' \|\| action === 'mush'/u);
  assert.match(renderer, /startReaderTutorial\(\{ track: 'audio' \}\)/u);
  assert.match(renderer, /startReaderTutorial\(\{ track: 'essentials' \}\)/u);
});

test('Audio Cue controls are exposed only through the bounded semantic control allowlist', () => {
  const actions = [
    'reader.audio.status',
    'reader.audio.enabled',
    'reader.audio.muted',
    'reader.audio.stop',
    'reader.audio.test',
    'reader.audio.volume',
    'reader.audio.foreground'
  ];
  assert.equal(CONTROL_REQUEST_ACTIONS.size, 75);
  for (const action of actions) {
    assert.equal(CONTROL_REQUEST_ACTIONS.has(action), true, action);
    assert.equal(normalizeControlRequest({ schema: 1, id: 62, action, args: { value: 'on' } })?.action, action);
  }
  assert.equal(CONTROL_REQUEST_ACTIONS.has('reader.audio.javascript'), false);
});

test('server-requested Audio Cue controls reuse existing local audio functions without sending MUD commands', () => {
  const block = blockBetween("if (request.action === 'reader.audio.status')", "if (request.action === 'reader.doctor')");
  for (const functionName of [
    'setAudioCuesEnabled', 'setAudioCuesMuted', 'stopAudioCues',
    'testAudioCue', 'setAudioCuesVolume', 'setAudioCuesForegroundOnly'
  ]) assert.match(block, new RegExp(`${functionName}\\(`, 'u'), functionName);
  assert.doesNotMatch(block, /sendCommand\(|dispatchCommand|classifyLine|RegExp/u);
});

test('Audio Cue status is concise and distinct from Self-Voice status', () => {
  const start = renderer.indexOf('function audioCueStatusText()');
  const end = renderer.indexOf('function audioCueAvailable()', start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.match(block, /Audio Cues/u);
  assert.match(block, /volume/u);
  assert.match(block, /foreground/u);
  assert.doesNotMatch(block, /Self-Voice/u);
});

test('audio tutorial completion reduces the system to four practical recovery commands', () => {
  const tutorial = new ReaderTutorial();
  tutorial.start({ track: 'audio' });
  let result;
  for (let i = 0; i < AUDIO_TUTORIAL_STEPS.length; i += 1) result = tutorial.next();
  assert.equal(result.completed, true);
  assert.match(result.text, /C R SPEECH LAST OFF/iu);
  assert.match(result.text, /C R OUTPUT LAST OFF/iu);
  assert.match(result.text, /C R LINES/iu);
  assert.match(result.text, /C R UNREAD/iu);
});
