'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeSettings } = require('../src/settings-store');

const ROOT = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

test('soundpack event disable preferences are bounded, normalized, and persistent', () => {
  const settings = normalizeSettings({
    accessibility: {
      soundpackDisabledEvents: ['Door.Open', 'door.open', '../bad', 'communication.tell', '', 'client.connected']
    }
  });
  assert.deepEqual(settings.accessibility.soundpackDisabledEvents, [
    'door.open', 'communication.tell', 'client.connected'
  ]);

  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /soundpackDisabledEvents: \[\.\.\.state\.accessibility\.soundpackDisabledEvents\]/u);
  assert.match(renderer, /nukefire\.soundpackDisabledEvents/u);
  assert.match(renderer, /setSoundpackDisabledEvents\(accessibility\.soundpackDisabledEvents/u);
});

test('semantic and communication soundpack events honor per-event disable state without muting user Sound Triggers', () => {
  const renderer = source('renderer/renderer.js');
  const semantic = renderer.match(/function playSemanticAudioCue\(cueId\) \{[\s\S]*?\n\}/u)?.[0] || '';
  const communication = renderer.match(/function playCommunicationAudioCue\(record, message\) \{[\s\S]*?\n\}/u)?.[0] || '';
  const trigger = renderer.match(/function soundTriggerPlayCue\(cueId\) \{[\s\S]*?\n\}/u)?.[0] || '';
  assert.match(semantic, /soundpackCueEnabled\(cueId\)/u);
  assert.match(communication, /soundpackEventEnabled\(`communication\.\$\{channel\}`\)/u);
  assert.doesNotMatch(trigger, /soundpackCueEnabled|soundpackEventEnabled/u);
  assert.match(trigger, /audioCues\?\.play\?\.\(cueId\)/u);
});

test('soundpack catalog exposes source truth and marks advertised-but-unwired events as reserved', () => {
  const store = source('src/soundpack-store.js');
  const main = source('main.js');
  assert.match(store, /'door\.blocked'.*source: 'reserved'.*status: 'not-emitted'/u);
  assert.match(store, /'client\.copyover-recovered'.*source: 'reserved'.*status: 'not-emitted'/u);
  assert.match(store, /event\.startsWith\('combat\.'\).*event\.startsWith\('vitals\.'\).*event\.startsWith\('group\.'\).*event\.startsWith\('loot\.'/su);
  assert.match(main, /soundpackEventMetadata/u);
  assert.match(main, /\(\[event, cue\]\) => \(\{ event, cue, \.\.\.soundpackEventMetadata\(event\) \}\)/u);
});

test('invalid imported soundpacks are diagnosed instead of silently disappearing', () => {
  const store = source('src/soundpack-store.js');
  const renderer = source('renderer/renderer.js');
  assert.match(store, /const invalid = \[\];/u);
  assert.match(store, /invalid\.push\(\{/u);
  assert.match(store, /return \{ ok: true, packs, invalid \};/u);
  assert.match(renderer, /invalid soundpack file/u);
  assert.match(renderer, /snapshot\.audioCues\.invalidPacks/u);
});

test('soundpack command path is discoverable, grouped, toggleable, and every catalog event is testable by event name', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /Soundpack event groups:/u);
  assert.match(renderer, /CR SOUNDPACK <event> ON\|OFF/u);
  assert.match(renderer, /soundpackEventRecord\(requested\)\?\.cue/u);
  assert.match(renderer, /The soundpack archive was not modified/u);
  assert.match(renderer, /soundpackEventSourceLabel\(record\)/u);
});

test('soundpack event toggle has Preferences parity and explicit previews bypass event disable state', () => {
  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');
  assert.match(html, /id="soundpack-editor-enabled"/u);
  assert.match(renderer, /#soundpack-editor-enabled/u);
  const testCue = renderer.match(/function testAudioCue\(cueId = 'hit'\) \{[\s\S]*?\n\}/u)?.[0] || '';
  assert.doesNotMatch(testCue, /soundpackCueEnabled|soundpackEventEnabled/u);
  assert.match(testCue, /audioCues\?\.play\?\.\(cueId\)/u);
});

test('client connection lifecycle events now have live playback hooks while copyover remains honestly reserved', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /playClientSoundpackEvent\('client\.connected', 'client-connected'\)/u);
  assert.match(renderer, /playClientSoundpackEvent\('client\.disconnected', 'client-disconnected'\)/u);
  assert.match(renderer, /playClientSoundpackEvent\('client\.reconnecting', 'client-reconnecting'\)/u);
  assert.doesNotMatch(renderer, /playClientSoundpackEvent\('client\.copyover-recovered'/u);
});
