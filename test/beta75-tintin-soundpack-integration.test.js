'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { AudioCueController, normalizeCueId } = require('../src/audio-cues');

const root = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const renderer = source('renderer/renderer.js');
const html = source('renderer/index.html');
const sessionManager = source('src/session-manager.js');
const help = source('src/client-command-help.js');
const soundpackStore = source('src/soundpack-store.js');

test('TinTin SOUND is Action-safe and emits only a managed soundpack event request', () => {
  assert.match(sessionManager, /DEFERRED_ACTION_VARIABLE_DIRECTIVES = new Set\(\[[^\]]*'sound'/u);
  assert.match(sessionManager, /parsed\.directive === 'sound'/u);
  assert.match(sessionManager, /this\.emit\(source\.id, 'soundpack-event-request'/u);
  assert.match(sessionManager, /interactive,\s*reportSuccess: interactive && source\.tintin\?\.config\?\.commandEcho === true/u);
  assert.doesNotMatch(sessionManager, /soundpack-event-request[\s\S]{0,400}(?:filepath|filename|AudioContext|new Audio)/u);
  assert.match(sessionManager, /'SHOWME','SNOOP','SOUND','SPEEDWALK'/u);
});

test('SOUND help teaches the one-name Action workflow and keeps files inside soundpacks', () => {
  assert.match(help, /name: 'sound'/u);
  assert.match(help, /sound \{custom\.stairs\}/u);
  assert.match(help, /#ACTION \{a dungeon staircase\} \{#SOUND \{custom\.stairs\}\}/u);
  assert.match(help, /copied into the selected editable \.nfsp soundpack/u);
  assert.match(help, /never accepts a filename, filesystem path, URL/u);
});

test('soundpack manifests accept only bounded custom.* player events and map them to their own cue IDs', () => {
  assert.match(soundpackStore, /CUSTOM_EVENT_PATTERN = \/\^custom\\\./u);
  assert.match(soundpackStore, /MAX_CUSTOM_EVENTS = 2500/u);
  assert.match(soundpackStore, /isSupportedSoundpackEvent\(eventName\)/u);
  assert.match(soundpackStore, /Player-created events must use custom\.<name>/u);
  assert.match(soundpackStore, /SOUNDPACK_EVENTS\[event\] \|\| \(isCustomSoundpackEvent\(event\) \? event : ''\)/u);
  assert.match(soundpackStore, /assets\[cueId\] = \{/u);
});

test('AudioCueController accepts assigned custom cues but gives them no built-in fallback', () => {
  assert.equal(normalizeCueId('custom.stairs'), 'custom.stairs');
  assert.equal(normalizeCueId('CUSTOM.STAIRS'), 'custom.stairs');
  assert.equal(normalizeCueId('custom.bad path'), '');

  const controller = new AudioCueController({ enabled: true, foreground: true, volume: 1, contextFactory: () => ({}) });
  assert.match(controller.cuePlaybackBlockReason('custom.stairs'), /no audio assigned/u);
  const count = controller.setSoundpack({ name: 'Personal Sounds' }, {
    'custom.stairs': {
      sources: ['data:audio/wav;base64,AAAA'],
      selection: 'random',
      volume: 1,
      cooldown_ms: 0
    }
  });
  assert.equal(count, 1);
  assert.equal(controller.cuePlaybackBlockReason('custom.stairs'), '');
});

test('Soundpack Editor gives custom Action sounds an easy Personal Sounds workflow', () => {
  assert.match(html, /id="soundpack-editor-custom-event"[^>]*placeholder="custom\.stairs"/u);
  assert.match(html, /id="soundpack-editor-custom-use"[^>]*>Use Custom Event</u);
  assert.match(html, /prepares a Personal Sounds pack automatically/u);
  assert.match(renderer, /CUSTOM_SOUNDPACK_EVENT_PATTERN/u);
  assert.match(renderer, /ensureEditableSoundpackForCustomEvent/u);
  assert.match(renderer, /'personal-sounds'/u);
  assert.match(renderer, /duplicateSoundpack\(\{[\s\S]*sourceId: 'builtin'/u);
  assert.match(renderer, /Player-created sound event for TinTin Actions/u);
  assert.match(renderer, /describeSoundpack\(activePackId\)/u);
});

test('manual SOUND reports blocking reasons while automation-generated SOUND stays quiet', () => {
  assert.match(renderer, /function handleTinTinSoundpackEventRequest/u);
  assert.match(renderer, /case 'soundpack-event-request': handleTinTinSoundpackEventRequest\(record, payload, true\)/u);
  assert.match(renderer, /case 'soundpack-event-request': handleTinTinSoundpackEventRequest\(record, payload, false\)/u);
  assert.match(renderer, /payload\?\.interactive === true && active/u);
  assert.match(renderer, /reportInteractiveSoundMessage\(`Sound \$\{event\} blocked: \$\{result\.reason\}`/u);
  const start = renderer.indexOf('function handleTinTinSoundpackEventRequest');
  const end = renderer.indexOf('function handleSessionEvent', start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.match(renderer, /function reportInteractiveSoundMessage[\s\S]*announce\(text, \{ force: true/u);
});
