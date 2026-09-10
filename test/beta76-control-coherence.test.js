'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CONTROL_REQUEST_ACTIONS, normalizeControlRequest } = require('../src/semantic-controls');
const root = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const renderer = source('renderer/renderer.js');

test('bounded CR catalog covers every advanced Reader setting and the existing A11Y operations', () => {
  const expected = [
    'reader.session.begin', 'reader.exit.restore', 'reader.native.enabled',
    'reader.voice.governor', 'reader.voice.priority', 'reader.voice.follow', 'reader.voice.interrupt',
    'reader.voice.voices', 'reader.voice.use', 'reader.vitals.format', 'reader.announcements.enabled',
    'reader.accessibility.command'
  ];
  assert.equal(CONTROL_REQUEST_ACTIONS.size, 75);
  for (const action of expected) {
    assert.equal(CONTROL_REQUEST_ACTIONS.has(action), true, action);
    assert.equal(normalizeControlRequest({ schema: 1, id: 7, action, args: { value: 'on' } })?.action, action);
  }
});

test('CR accessibility uses one bounded bridge action and reuses the local A11Y executor', () => {
  assert.match(renderer, /request\.action === 'reader\.accessibility\.command'/u);
  assert.doesNotMatch(renderer, /request\.action\.startsWith\('reader\.accessibility\.'\)/u);
  assert.match(renderer, /executeAccessibilityOperation\(operation, value, \{ copy \}\)/u);
  assert.equal((renderer.match(/async function executeAccessibilityOperation\(/gu) || []).length, 1);
  for (const action of [
    'reader.accessibility.last', 'reader.accessibility.why', 'reader.accessibility.report',
    'reader.accessibility.capabilities', 'reader.accessibility.test', 'reader.accessibility.doctor',
    'reader.accessibility.clear', 'reader.accessibility.profile'
  ]) assert.equal(CONTROL_REQUEST_ACTIONS.has(action), false, action);
});

test('communication sounds have one enable authority for all nine supported channels', () => {
  assert.match(renderer, /COMMUNICATION_CUE_CHANNELS = Object\.freeze\(\['tell', 'auction', 'gossip', 'group', 'grats', 'shout', 'holler', 'skynet', 'ssf'\]\)/u);
  assert.match(renderer, /function soundpackCommunicationChannel/u);
  assert.match(renderer, /event\.startsWith\('communication\.'\)\) continue;/u);
  assert.match(renderer, /if \(communicationChannel\) return state\.accessibility\.communicationCues\?\.\[communicationChannel\] === true;/u);
  assert.match(renderer, /setCommunicationCueChannel\(communicationChannel, Boolean\(enabled\)/u);
  const start = renderer.indexOf('function soundpackEventPlaybackDecision');
  const end = renderer.indexOf('function playSoundpackEventWithStatus', start);
  const block = renderer.slice(start, end);
  assert.match(block, /state\.accessibility\.communicationCues\?\.\[channel\] !== true/u);
  assert.doesNotMatch(block, /soundpackDisabledEvents/u);
});

test('Reader status reports advanced settings that game commands can change', () => {
  assert.match(renderer, /backlog governor/u);
  assert.match(renderer, /Tell\/System priority/u);
  assert.match(renderer, /interrupt-on-command/u);
  assert.match(renderer, /important announcements/u);
  assert.match(renderer, /vitalSpeechMode/u);
});

test('CR KEYS reaches the existing Reader Hotkeys preset while preserving the legacy remove parser contract', () => {
  assert.match(renderer, /text === 'hotkeys' \|\| text === 'controls'/u);
  assert.match(renderer, /\^remove\\s\+\(lines\?\|movement\|move\|mush\)\$/u);
  assert.match(renderer, /\^remove\\s\+\(hotkeys\|controls\)\$/u);
  assert.match(renderer, /readerPresetsApi\.installReaderHotkeyPreset/u);
  assert.match(renderer, /readerPresetsApi\.removeReaderHotkeyPreset/u);
});
