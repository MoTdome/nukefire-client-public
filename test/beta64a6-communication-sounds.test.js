'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { AudioCueController, AUDIO_CUE_IDS } = require('../src/audio-cues');
const communications = require('../src/communications');
const { CONTROL_REQUEST_ACTIONS, normalizeControlRequest } = require('../src/semantic-controls');

const root = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function fakeContext() {
  function param() { return { setValueAtTime() {}, exponentialRampToValueAtTime() {} }; }
  return {
    currentTime: 1, state: 'running', destination: {},
    createOscillator() { return { frequency: param(), connect() {}, disconnect() {}, start() {}, stop() {}, onended: null }; },
    createGain() { return { gain: param(), connect() {}, disconnect() {} }; },
    resume() { return Promise.resolve(); }
  };
}

test('Reader communication channels and stairs have distinct bounded native cue IDs', () => {
  for (const cue of ['tell', 'auction', 'gossip', 'group', 'grats', 'shout', 'holler', 'skynet', 'ssf', 'stairs']) {
    assert.equal(AUDIO_CUE_IDS.includes(cue), true, cue);
  }
});

test('communication cue playback may explicitly bypass only the foreground gate', () => {
  const controller = new AudioCueController({ contextFactory: fakeContext, enabled: true });
  controller.setForeground(false);
  assert.equal(controller.play('gossip'), false);
  assert.equal(controller.play('gossip', { allowBackground: true }), true);
  controller.setMuted(true);
  assert.equal(controller.play('gossip', { allowBackground: true }), false, 'background override never bypasses mute');
  controller.setMuted(false);
  controller.setEnabled(false);
  assert.equal(controller.play('gossip', { allowBackground: true }), false, 'background override never bypasses master disable');
});

test('canonical Skynet broadcasts become a detected reviewable communications channel', () => {
  const parsed = communications.classifyLine("(Skynet) Blackpaw has pillaged the legendary widget!");
  assert.equal(parsed?.channel, 'skynet');
  assert.equal(communications.normalizeChannel('skynet'), 'skynet');
  const ids = communications.visibleChannels({ messages: [{ channel: 'skynet' }] }).map((record) => record.id);
  assert.equal(ids.includes('skynet'), true);
});

test('schema 47 stores conservative per-channel communication sound defaults', () => {
  const settings = source('src/settings-store.js');
  assert.match(settings, /const SETTINGS_SCHEMA_VERSION = 48;/u);
  assert.match(settings, /communicationCues: Object\.freeze\(\{[\s\S]*gossip: false,[\s\S]*group: false,[\s\S]*grats: false,[\s\S]*shout: false,[\s\S]*holler: false,[\s\S]*skynet: false,[\s\S]*ssf: false,[\s\S]*background: false/u);
  assert.match(settings, /accessibility\.communicationCues/u);
});

test('Preferences exposes independent high-value communication and background controls', () => {
  const html = source('renderer/index.html');
  for (const id of ['communication-cue-tell', 'communication-cue-auction', 'communication-cue-gossip', 'communication-cue-group', 'communication-cue-grats', 'communication-cue-shout', 'communication-cue-holler', 'communication-cue-skynet', 'communication-cue-ssf', 'communication-cues-background']) {
    assert.match(html, new RegExp(`id="${id}"`, 'u'), id);
  }
  assert.match(html, /independent from Self-Voice/iu);
});

test('communication notifications are semantic, speech-independent, and globally deduped across sessions', () => {
  const renderer = source('renderer/renderer.js');
  const start = renderer.indexOf('function playCommunicationAudioCue(record, message)');
  const end = renderer.indexOf('function soundTriggerSnapshot()', start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.match(block, /COMMUNICATION_CUE_DEDUPE_WINDOW_MS/u);
  assert.match(block, /recentCommunicationCueAt/u);
  assert.match(block, /soundpackEventPlaybackDecision\(`communication\.\$\{channel\}`/u);
  assert.match(block, /audioCues\?\.play\?\.\(decision\.cueId, \{ allowBackground: decision\.allowBackground \}\)/u);
  assert.doesNotMatch(block, /announce\(|selfVoice\?\.|sendCommand|dispatchCommand/u);
  assert.match(renderer, /appendReaderHistoryCommunication\(record, storedMessage\);\s*playCommunicationAudioCue\(record, storedMessage\);/u);
});

test('CR SOUND semantic control surface is bounded and commandless', () => {
  const actions = ['reader.sound.status', 'reader.sound.channel', 'reader.sound.background', 'reader.sound.test', 'reader.sound.reset'];
  assert.equal(CONTROL_REQUEST_ACTIONS.size, 65);
  for (const action of actions) {
    assert.equal(CONTROL_REQUEST_ACTIONS.has(action), true, action);
    assert.equal(normalizeControlRequest({ schema: 1, id: 1, action, args: { value: 'gossip on' } })?.action, action);
  }
  const renderer = source('renderer/renderer.js');
  const start = renderer.indexOf("if (request.action === 'reader.sound.status')");
  const end = renderer.indexOf("if (request.action === 'reader.doctor')", start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.match(block, /reader\.sound\.channel/u);
  assert.match(block, /reader\.sound\.background/u);
  assert.doesNotMatch(block, /sendCommand\(|dispatchCommand/u);
});
