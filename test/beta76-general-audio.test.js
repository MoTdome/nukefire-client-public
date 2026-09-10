'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const html = source('renderer/index.html');
const renderer = source('renderer/renderer.js');
const sessionManager = source('src/session-manager.js');
const help = source('src/client-command-help.js');

test('general Audio has its own Preferences category and is not nested inside Accessibility', () => {
  assert.match(html, /id="preference-tab-audio"[\s\S]*?data-preference-category="audio"/u);
  assert.match(html, /id="preference-panel-audio"[\s\S]*?data-preference-category="audio"/u);
  const audioStart = html.indexOf('<section id="preference-panel-audio"');
  const accessibilityStart = html.indexOf('<section id="preference-panel-accessibility"');
  assert.ok(audioStart >= 0 && accessibilityStart > audioStart);
  const audioBlock = html.slice(audioStart, accessibilityStart);
  const accessibilityBlock = html.slice(accessibilityStart);
  for (const id of ['soundpack-select', 'soundpack-editor', 'audio-cues-enabled', 'communication-cue-tell', 'sound-trigger-preferences']) {
    assert.match(audioBlock, new RegExp(`id="${id}"`, 'u'));
    assert.doesNotMatch(accessibilityBlock, new RegExp(`id="${id}"`, 'u'));
  }
  assert.match(audioBlock, /Reader Mode is not required/iu);
});

test('SOUND is a general command with no Reader-mode gate and gains status/stop controls', () => {
  const start = sessionManager.indexOf("} else if (parsed.directive === 'sound')");
  const end = sessionManager.indexOf("} else if (parsed.directive === 'accessibility'", start);
  const block = start >= 0 && end > start ? sessionManager.slice(start, end) : '';
  assert.ok(block);
  assert.doesNotMatch(block, /readerWorkspace|screenReader|selfVoice/iu);
  assert.match(block, /operation: 'status'/u);
  assert.match(block, /operation === 'stop'/u);
  assert.match(block, /soundpack-control-request/u);
  assert.match(block, /\['all', 'music'\]/u);
  assert.match(block, /soundpack-event-request/u);
});

test('renderer handles general audio status and stop without any Reader-mode dependency', () => {
  const start = renderer.indexOf('function handleTinTinSoundpackControlRequest');
  const end = renderer.indexOf('function handleSessionEvent', start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.ok(block);
  assert.match(block, /audioCues\?\.stopMusic/u);
  assert.match(block, /audioCues\?\.stopAll/u);
  assert.match(block, /#SOUND is available independently of Reader Mode and Self-Voice/u);
  assert.doesNotMatch(block, /readerWorkspaceEnabled|screenReaderMode|selfVoiceEnabled/u);
  assert.match(renderer, /case 'soundpack-control-request': handleTinTinSoundpackControlRequest\(record, payload, true\)/u);
  assert.match(renderer, /case 'soundpack-control-request': handleTinTinSoundpackControlRequest\(record, payload, false\)/u);
});

test('SOUND help teaches general use and the bounded single-track music convention', () => {
  assert.match(help, /General client audio/u);
  assert.match(help, /works with Reader Workspace, native screen reader mode, and NukeFire Self-Voice all turned off/u);
  assert.match(help, /sound \{custom\.music\.boss\}/u);
  assert.match(help, /sound \{stop\} \{music\}/u);
  assert.match(help, /Only one custom\.music\.\* track plays at a time/u);
});

test('custom.music.* replaces only the previous music track', () => {
  const priorAudio = global.Audio;
  class FakeAudio {
    static instances = [];
    constructor(source) {
      this.source = source;
      this.currentTime = 0;
      this.volume = 1;
      this.paused = false;
      this.listeners = {};
      FakeAudio.instances.push(this);
    }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    play() { this.played = true; return Promise.resolve(); }
    pause() { this.paused = true; }
  }

  global.Audio = FakeAudio;
  const modulePath = require.resolve('../src/audio-cues');
  delete require.cache[modulePath];
  const { AudioCueController, isMusicCueId } = require('../src/audio-cues');
  try {
    assert.equal(isMusicCueId('custom.music.boss'), true);
    assert.equal(isMusicCueId('custom.hit'), false);
    const controller = new AudioCueController({ enabled: true, foreground: true, volume: 1, contextFactory: null });
    controller.setSoundpack({ name: 'Music Test' }, {
      'custom.music.zone': { sources: ['data:audio/wav;base64,AAAA'], selection: 'sequential', volume: 1, cooldown_ms: 0 },
      'custom.music.boss': { sources: ['data:audio/wav;base64,BBBB'], selection: 'sequential', volume: 1, cooldown_ms: 0 },
      'custom.effect': { sources: ['data:audio/wav;base64,CCCC'], selection: 'sequential', volume: 1, cooldown_ms: 0 }
    });

    assert.equal(controller.play('custom.music.zone'), true);
    const zone = FakeAudio.instances.at(-1);
    assert.equal(controller.play('custom.effect'), true);
    const effect = FakeAudio.instances.at(-1);
    assert.equal(zone.paused, false);
    assert.equal(effect.paused, false);

    assert.equal(controller.play('custom.music.boss'), true);
    const boss = FakeAudio.instances.at(-1);
    assert.equal(zone.paused, true);
    assert.equal(effect.paused, false);
    assert.equal(boss.paused, false);
    assert.equal(controller.activeMusicAudio, boss);

    assert.equal(controller.stopMusic(), true);
    assert.equal(boss.paused, true);
    assert.equal(effect.paused, false);
    assert.equal(controller.stopMusic(), false);
    assert.equal(controller.stopAll(), true);
    assert.equal(effect.paused, true);
  } finally {
    delete require.cache[modulePath];
    if (priorAudio === undefined) delete global.Audio;
    else global.Audio = priorAudio;
  }
});
