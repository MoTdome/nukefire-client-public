'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const speech = require('../src/speech-markers');
const { GMCP_SUPPORTS } = require('../src/connection-manager');

function source(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function marker(payload) {
  return `${speech.PREFIX}${payload}${speech.TERMINATOR}`;
}

test('semantic speech markers preserve visible text while removing only suppressed text from voice', () => {
  const state = speech.createState();
  const input = `before\n${marker('0;0')}combat line\n${marker('1')}after\n`;
  const result = speech.consume(state, input);
  assert.equal(result.displayText, 'before\ncombat line\nafter\n');
  assert.equal(result.speechText, 'before\n\nafter\n');
  assert.equal(result.suppressed, false);
});

test('speech marker parsing is stable across arbitrary TCP chunk splits', () => {
  const state = speech.createState();
  const full = `${marker('0;3')}regen tick\r\n${marker('1')}ready\r\n`;
  const cuts = [4, 11, 19, 27, 35, full.length];
  let start = 0;
  let display = '';
  let spoken = '';
  for (const end of cuts) {
    const result = speech.consume(state, full.slice(start, end));
    display += result.displayText;
    spoken += result.speechText;
    start = end;
  }
  assert.equal(display, 'regen tick\r\nready\r\n');
  assert.equal(spoken, '\r\nready\r\n');
  assert.equal(state.pending, '');
  assert.equal(state.suppressed, false);
});

test('suppressed semantic text keeps line boundaries so later speech cannot concatenate across hidden lines', () => {
  const state = speech.createState();
  const result = speech.consume(state, `${marker('0;1')}one\r\ntwo\n${marker('1')}three\n`);
  assert.equal(result.displayText, 'one\r\ntwo\nthree\n');
  assert.equal(result.speechText, '\r\n\nthree\n');
});

test('malformed private markers are stripped without changing the current speech state', () => {
  const state = speech.createState();
  const result = speech.consume(state, `a${marker('bogus')}b`);
  assert.equal(result.displayText, 'ab');
  assert.equal(result.speechText, 'ab');
  assert.equal(result.suppressed, false);
});

test('reset clears partial and active suppression state between connections', () => {
  const state = speech.createState();
  speech.consume(state, `${marker('0;2')}quiet`);
  speech.consume(state, speech.PREFIX.slice(0, 8));
  assert.equal(state.suppressed, true);
  assert.ok(state.pending);
  speech.reset(state);
  assert.deepEqual(state, { pending: '', suppressed: false });
});

test('NukeFire Client advertises speech capability without adding a polling request', () => {
  assert.ok(GMCP_SUPPORTS.includes('NukeFire.Speech 1'));
  const connection = source('src/connection-manager.js');
  const initial = connection.match(/const INITIAL_GMCP_REQUESTS = Object\.freeze\(\[([\s\S]*?)\]\);/u)?.[1] || '';
  assert.doesNotMatch(initial, /NukeFire\.Speech/u);
  assert.match(source('package.json'), /node --check src\/speech-markers\.js/u);
});

test('renderer strips speech metadata before terminal review and keeps custom sound triggers on complete text', () => {
  const renderer = source('renderer/renderer.js');
  const html = source('renderer/index.html');
  assert.match(html, /src="\.\.\/src\/speech-markers\.js"/u);
  assert.match(renderer, /consumeSpeechMarkers\(record, text\)/u);
  assert.match(renderer, /routeSoundTriggerChunk\(displayPlain, record\)/u);
  assert.match(renderer, /routeSpeechTriggerChunk\(transformed, record\)/u);
  assert.match(renderer, /skipSpeechStream: true/u);
  assert.doesNotMatch(source('src/speech-markers.js'), /NukeFireAnsi|SelfVoice|soundTrigger/u);
});


test('semantic speech suppression does not prevent custom sound triggers from hearing visible text', () => {
  const { SoundTriggerEngine } = require('../src/sound-trigger-engine');
  const settings = {
    enabled: true,
    definitions: [{
      id: 'combat-cue', pattern: '%*combat line%*', cueId: 'hit', cooldownMs: 0,
      suppressSelfVoice: false, enabled: true
    }]
  };
  const audible = new SoundTriggerEngine();
  const spoken = new SoundTriggerEngine();
  audible.restore(settings);
  spoken.restore(settings);

  const semantic = speech.consume(speech.createState(), `${marker('0;0')}combat line\n${marker('1')}`);
  let played = 0;
  audible.processChunk('hero', semantic.displayText, { playCue: () => { played += 1; return true; } });
  const voice = spoken.processChunk('hero', semantic.speechText);

  assert.equal(played, 1);
  assert.equal(voice.speechText.trim(), '');
});

test('inactive sessions remove speech markers while retaining complete visible text for review', () => {
  const renderer = source('renderer/renderer.js');
  const inactive = renderer.match(/function appendTextToInactiveSession\(record, text, options = \{\}\) \{[\s\S]*?\n\}/u)?.[0] || '';
  assert.match(inactive, /consumeSpeechMarkers\(record, text\)/u);
  assert.match(inactive, /const raw = routed\.displayText;/u);
  assert.doesNotMatch(inactive, /selfVoice\?\./u);
});
