'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  AUDIO_CUE_IDS,
  DEFAULT_COOLDOWN_MS,
  MAX_COOLDOWN_MS,
  compileSoundTriggerPattern,
  normalizeSoundTriggerSettings,
  SoundTriggerEngine
} = require('../src/sound-trigger-engine');
const { normalizeBinding } = require('../src/keybinding-engine');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
}

test('Sound Trigger settings are bounded, deterministic, and limited to built-in cue IDs', () => {
  const settings = normalizeSoundTriggerSettings({
    enabled: false,
    definitions: [
      { id: 'hit-one', pattern: 'You hit %1', cueId: 'hit', cooldownMs: -50, suppressSelfVoice: true },
      { id: 'duplicate-pattern', pattern: 'You hit %1', cueId: 'kill' },
      { id: 'danger', pattern: '^WARNING: %1$', cueId: 'danger', cooldownMs: 999999 },
      { id: 'bad-cue', pattern: 'bad', cueId: 'airhorn' }
    ]
  });
  assert.equal(settings.enabled, false);
  assert.equal(settings.definitions.length, 2);
  assert.equal(settings.definitions[0].cueId, 'hit');
  assert.equal(settings.definitions[0].cooldownMs, 0);
  assert.equal(settings.definitions[0].suppressSelfVoice, true);
  assert.equal(settings.definitions[1].cooldownMs, MAX_COOLDOWN_MS);
  assert.deepEqual(AUDIO_CUE_IDS, ['hit', 'miss', 'incoming', 'critical', 'kill', 'danger']);
  assert.equal(DEFAULT_COOLDOWN_MS, 100);
});

test('Sound Trigger patterns use familiar Action-style wildcards and optional anchors', () => {
  const hit = compileSoundTriggerPattern('^You hit %1 for %2 damage.$');
  assert.ok(hit);
  assert.equal(hit.test('You hit mutant for 48,221 damage.'), true);
  assert.equal(hit.test('Prefix You hit mutant for 48,221 damage.'), false);
  const repeated = compileSoundTriggerPattern('^%1 attacks %1$');
  assert.equal(repeated.test('mutant attacks mutant'), true);
  assert.equal(repeated.test('mutant attacks guard'), false);
  const literalPercent = compileSoundTriggerPattern('Health: %%');
  assert.equal(literalPercent.test('Health: %'), true);
});

test('fragmented chunks trigger only after a completed line and preserve unmatched speech text', () => {
  const played = [];
  const engine = new SoundTriggerEngine({
    settings: { definitions: [{ id: 'hit', pattern: '^You hit %1$', cueId: 'hit' }] }
  });
  const first = engine.processChunk('main', 'You hit mu', { playCue: (cue) => { played.push(cue); return true; } });
  assert.equal(first.speechText, '');
  assert.deepEqual(played, []);
  const second = engine.processChunk('main', 'tant\nA quiet room.\n', { playCue: (cue) => { played.push(cue); return true; } });
  assert.deepEqual(played, ['hit']);
  assert.equal(second.speechText, 'You hit mutant\nA quiet room.\n');
  assert.equal(second.events.length, 2);
});

test('Self-Voice suppression removes only the routed speech copy while retaining the complete matched line in event data', () => {
  const engine = new SoundTriggerEngine({
    settings: { definitions: [{ id: 'incoming', pattern: '^%1 hits you.$', cueId: 'incoming', suppressSelfVoice: true }] }
  });
  const result = engine.processChunk('main', 'The mutant hits you.\nSouthpaw tells you, hello.\n', { playCue: () => true });
  assert.equal(result.speechText, 'Southpaw tells you, hello.\n');
  assert.equal(result.events[0].line, 'The mutant hits you.');
  assert.equal(result.events[0].suppressSelfVoice, true);
  assert.equal(result.events[1].matched, false);
});

test('per-trigger cooldown limits repeated earcons independently per session without changing suppression intent', () => {
  let now = 1000;
  const played = [];
  const engine = new SoundTriggerEngine({
    clock: () => now,
    settings: { definitions: [{ id: 'spam', pattern: '^Hit$', cueId: 'hit', cooldownMs: 200, suppressSelfVoice: true }] }
  });
  const playCue = (cue) => { played.push(cue); return true; };
  let result = engine.processChunk('main', 'Hit\nHit\n', { playCue });
  assert.deepEqual(played, ['hit']);
  assert.equal(result.events[1].cooldownBlocked, true);
  assert.equal(result.speechText, '');
  engine.processChunk('alt', 'Hit\n', { playCue });
  assert.deepEqual(played, ['hit', 'hit']);
  now += 201;
  engine.processChunk('main', 'Hit\n', { playCue });
  assert.deepEqual(played, ['hit', 'hit', 'hit']);
});

test('prompt boundaries classify an unterminated line exactly once', () => {
  const played = [];
  const engine = new SoundTriggerEngine({
    settings: { definitions: [{ id: 'danger', pattern: '^DANGER$', cueId: 'danger', suppressSelfVoice: true }] }
  });
  engine.processChunk('main', 'DANGER', { playCue: (cue) => { played.push(cue); return true; } });
  const committed = engine.commitBoundary('main', { playCue: (cue) => { played.push(cue); return true; } });
  assert.deepEqual(played, ['danger']);
  assert.equal(committed.speechText, '');
  assert.equal(committed.events.length, 1);
  assert.deepEqual(engine.commitBoundary('main', { playCue: () => true }).events, []);
});

test('schema 47 persists Sound Triggers and Accessibility UI routes completed display text before Self-Voice', () => {
  const settings = source('src/settings-store.js');
  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');
  assert.match(settings, /const SETTINGS_SCHEMA_VERSION = 48;/u);
  assert.match(settings, /soundTriggers: DEFAULT_SOUND_TRIGGER_SETTINGS/u);
  assert.match(settings, /soundTriggers: normalizeSoundTriggerSettings\(input\.soundTriggers\)/u);
  assert.match(html, /id="sound-trigger-add"/u);
  assert.match(html, /id="sound-trigger-suppress-self-voice"/u);
  assert.match(html, /id="sound-trigger-cooldown"[^>]*max="10000"/u);
  assert.match(html, /src="\.\.\/src\/sound-trigger-engine\.js"/u);
  assert.match(renderer, /if \(!localDisplay\) routeSoundTriggerChunk\(displayPlain, record\)/u);
  assert.match(renderer, /const selfVoicePlain = localDisplay \|\| options\.skipSpeechStream[\s\S]*routeSpeechTriggerChunk\(displayPlain, record\)/u);
  assert.match(renderer, /queueTerminalRuns\(runs, \{ follow: shouldFollow \}\)/u);
  assert.match(html, /Matching text always remains in the terminal and Reader Review\. Suppression affects only NukeFire Self-Voice\./u);
});

test('Sound Trigger master toggle is a commandless configurable accessibility action', () => {
  const binding = normalizeBinding({
    id: 'toggle-sounds', code: 'F11', command: '',
    semantic: { type: 'accessibility', id: 'toggle-sound-triggers' }
  });
  assert.ok(binding);
  assert.equal(binding.command, '');
  assert.deepEqual(binding.semantic, { type: 'accessibility', id: 'toggle-sound-triggers' });
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /id: 'toggle-sound-triggers', label: 'Toggle Sound Triggers'/u);
  assert.match(renderer, /type === 'accessibility' && id === 'toggle-sound-triggers'[\s\S]*setSoundTriggersEnabled/u);
});
