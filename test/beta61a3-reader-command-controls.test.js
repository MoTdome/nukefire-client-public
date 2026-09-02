'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { CONTROL_REQUEST_ACTIONS, normalizeControlRequest } = require('../src/semantic-controls');
const { normalizeVoiceSettings } = require('../src/self-voice');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

test('reader voice controls remain a hardcoded semantic allowlist', () => {
  const expected = [
    'reader.workspace',
    'reader.voice.enabled',
    'reader.voice.muted',
    'reader.voice.stop',
    'reader.voice.test',
    'reader.voice.rate',
    'reader.voice.pitch',
    'reader.voice.volume',
    'reader.voice.foreground'
  ];
  for (const action of expected) {
    assert.equal(CONTROL_REQUEST_ACTIONS.has(action), true, action);
    assert.deepEqual(normalizeControlRequest({ schema: 1, id: 9, action, args: { value: 'toggle' } }), {
      schema: 1,
      id: 9,
      action,
      args: { value: 'toggle' }
    });
  }
  assert.equal(CONTROL_REQUEST_ACTIONS.has('reader.preference.arbitrary'), false);
  assert.equal(normalizeControlRequest({ schema: 1, id: 9, action: 'reader.preference.arbitrary', args: { value: 'x' } }), null);
});

test('renderer maps reader voice controls only to bounded existing Reader APIs', () => {
  assert.match(renderer, /request\.action === 'reader\.workspace'[\s\S]*?setReaderWorkspaceEnabled\(next, \{ focus: false \}\)/u);
  assert.match(renderer, /request\.action === 'reader\.voice\.enabled'[\s\S]*?setSelfVoiceEnabled\(next\)/u);
  assert.match(renderer, /request\.action === 'reader\.voice\.muted'[\s\S]*?setSelfVoiceMuted\(next\)/u);
  assert.match(renderer, /request\.action === 'reader\.voice\.stop'[\s\S]*?stopSelfVoiceNow\(\)/u);
  assert.match(renderer, /request\.action === 'reader\.voice\.test'[\s\S]*?testSelfVoice\(\)/u);
  assert.match(renderer, /request\.action === 'reader\.voice\.rate'[\s\S]*?controlNumberValue\(request\.args\?\.value, 0\.1, 10\)/u);
  assert.match(renderer, /request\.action === 'reader\.voice\.pitch'[\s\S]*?controlNumberValue\(request\.args\?\.value, 0, 2\)/u);
  assert.match(renderer, /request\.action === 'reader\.voice\.volume'[\s\S]*?controlNumberValue\(request\.args\?\.value, 0, 100\)/u);
  assert.match(renderer, /request\.action === 'reader\.voice\.foreground'[\s\S]*?setSelfVoiceForegroundOnly\(next\)/u);
});

test('Self-Voice numeric boundaries remain the native controller boundaries', () => {
  assert.deepEqual(normalizeVoiceSettings({ rate: 0.01, pitch: -1, volume: -1 }), {
    rate: 0.1,
    pitch: 0,
    volume: 0,
    voiceId: ''
  });
  assert.deepEqual(normalizeVoiceSettings({ rate: 99, pitch: 99, volume: 99 }), {
    rate: 10,
    pitch: 2,
    volume: 1,
    voiceId: ''
  });
});

test('reader status exposes live silence diagnostics', () => {
  assert.match(renderer, /available: selfVoiceAvailable\(\)/u);
  assert.match(renderer, /foregroundOnly: state\.accessibility\.selfVoiceForegroundOnly/u);
  assert.match(renderer, /appForeground: state\.accessibility\.selfVoiceAppForeground/u);
  assert.match(renderer, /volume \$\{Math\.round\(Number\(voice\.volume\) \* 100\)\} percent/u);
  assert.match(renderer, /backend \$\{voice\.available \? 'available' : 'unavailable'\}/u);
});
