'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { normalizeControlRequest, normalizeServerScreenReaderFlag } = require('../src/semantic-controls');
const { GmcpStore } = require('../src/gmcp-store');
const { SelfVoiceController, cleanSpeechText, decorativeSpeechLine } = require('../src/self-voice');
const communications = require('../src/communications');

class FakeUtterance {
  constructor(text) {
    this.text = text;
    this.onend = null;
    this.onerror = null;
  }
}

function fakeSynth() {
  return {
    spoken: [],
    cancelCount: 0,
    paused: false,
    speak(utterance) { this.spoken.push(utterance); },
    cancel() { this.cancelCount += 1; },
    resume() { this.paused = false; }
  };
}

test('server-originated NukeFire Controls requests use a strict schema-1 allowlist', () => {
  assert.deepEqual(normalizeControlRequest({
    schema: 1,
    id: 42,
    action: 'reader.preset',
    args: { value: 'fast' }
  }), {
    schema: 1,
    id: 42,
    action: 'reader.preset',
    args: { value: 'fast' }
  });
  assert.equal(normalizeControlRequest({ schema: 2, id: 42, action: 'reader.preset' }), null);
  assert.equal(normalizeControlRequest({ schema: 1, id: 0, action: 'reader.preset' }), null);
  assert.equal(normalizeControlRequest({ schema: 1, id: 42, action: 'run.javascript', args: { value: 'nope' } }), null);
});

test('NukeFire.Controls.Request is canonicalized and ephemeral rather than retained in GMCP state', () => {
  const store = new GmcpStore({ includeStateInEvents: false });
  const event = store.apply({
    packageName: 'nukefire.controls.request',
    body: { schema: 1, id: 7, action: 'reader.status', args: {} }
  });
  assert.equal(event.packageName, 'NukeFire.Controls.Request');
  assert.equal(event.ephemeral, true);
  assert.equal(event.path, null);
  assert.equal(store.snapshot().extras['NukeFire.Controls.Request'], undefined);
});

test('client control bridge handles status, presets, review actions, and returns bounded state', () => {
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  assert.match(renderer, /packageName === 'NukeFire\.Controls\.Request'/u);
  assert.match(renderer, /sendActiveGmcp\('NukeFire\.Controls\.Result'/u);
  assert.match(renderer, /request\.action === 'client\.status'/u);
  assert.match(renderer, /request\.action === 'reader\.status'/u);
  assert.match(renderer, /request\.action === 'reader\.preset'/u);
  for (const action of ['reader.review.latest', 'reader.review.previous', 'reader.review.next', 'reader.review.tell', 'reader.review.communication']) {
    assert.match(renderer, new RegExp(action.replaceAll('.', '\\.'), 'u'));
  }
  assert.match(renderer, /applyReaderSetupPreset\(presetId, \{ announceChange: false \}\)/u);
});

test('Reader review speaks content before cursor position and the default preset exposes Latest on F10', () => {
  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  const presets = fs.readFileSync('src/reader-presets.js', 'utf8');
  const html = fs.readFileSync('renderer/index.html', 'utf8');
  assert.match(renderer, /`\$\{result\.text\}\. Reader line \$\{result\.position\} of \$\{result\.count\}\.`/u);
  assert.match(renderer, /Reader hotkeys installed: \$\{installed\} of 12/u);
  assert.match(presets, /id: 'reader-latest-line', code: 'F10'[\s\S]*?type: 'reader-history', id: 'latest'/u);
  assert.match(presets, /id: 'reader-last-tell', code: 'F10', label: 'Shift\+F10'[\s\S]*?shift: true/u);
  assert.match(html, /Default shortcut: F10 or Alt\+End\./u);
  assert.match(html, /Default shortcut: Shift\+F10\./u);
});

test('Self-Voice silently discards punctuation-only separators but preserves meaningful short symbols and text', () => {
  assert.equal(decorativeSpeechLine('//////////////'), true);
  assert.equal(decorativeSpeechLine('--------------------'), true);
  assert.equal(cleanSpeechText('//////////////'), '');
  assert.equal(cleanSpeechText('--------------------'), '');
  assert.equal(cleanSpeechText('HP -- 50'), 'HP -- 50');
  assert.equal(cleanSpeechText('>'), '>');
});

test('Self-Voice can announce mute once while immediately blocking later live output', () => {
  const synth = fakeSynth();
  const voice = new SelfVoiceController({ synth, Utterance: FakeUtterance });
  voice.setEnabled(true);
  assert.equal(voice.muteWithAnnouncement('NukeFire self-voice muted.'), true);
  assert.equal(voice.muted, true);
  assert.equal(synth.spoken.at(-1).text, 'NukeFire self-voice muted.');
  assert.deepEqual(voice.write('this should not speak\n'), []);
  assert.equal(synth.spoken.length, 1);
});

test('NukeFire telepath wording is recognized as Tell text even when semantic GMCP is unavailable', () => {
  const incoming = communications.classifyLine("Southpaw telepaths to you, 'hello'");
  const outgoing = communications.classifyLine("You telepath Southpaw, 'hello back'");
  assert.equal(incoming?.channel, 'tell');
  assert.equal(outgoing?.channel, 'tell');
});


test('server screen-reader flag normalization is strict and client sync is one-way-on', () => {
  assert.equal(normalizeServerScreenReaderFlag(true), true);
  assert.equal(normalizeServerScreenReaderFlag(1), true);
  assert.equal(normalizeServerScreenReaderFlag('on'), true);
  assert.equal(normalizeServerScreenReaderFlag(false), false);
  assert.equal(normalizeServerScreenReaderFlag(0), false);
  assert.equal(normalizeServerScreenReaderFlag('off'), false);
  assert.equal(normalizeServerScreenReaderFlag('maybe'), null);

  const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
  assert.match(renderer, /status\.screen_reader/u);
  assert.match(renderer, /setReaderWorkspaceEnabled\(true, \{ announceChange: false, focus: false \}\)/u);
  assert.match(renderer, /!state\.accessibility\.screenReaderMode && !state\.accessibility\.selfVoiceEnabled/u);
  assert.match(renderer, /setScreenReaderMode\(true, \{ announceChange: false \}\)/u);
  assert.match(renderer, /if \(!enabled \|\| \(previous === true && options\.force !== true\)\) return false;/u);
  assert.match(renderer, /syncServerScreenReaderPreference\(record\.gmcp\.char\.status, \{ force: true \}\)/u);
});
