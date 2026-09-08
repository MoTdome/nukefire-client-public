'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const communications = require('../src/communications');

const root = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('Beta.74 communication additions are reviewable and sonifiable without text-trigger sound hacks', () => {
  assert.equal(communications.classifyLine("Prime shouts, 'Anyone here?'")?.channel, 'shout');
  assert.equal(communications.classifyLine("Prime hollers, 'Down below!'")?.channel, 'holler');
  const soundpack = source('src/soundpack-store.js');
  for (const channel of ['group', 'grats', 'shout', 'holler']) {
    assert.match(soundpack, new RegExp(`'communication\\.${channel}': '${channel}'`, 'u'));
  }
  assert.match(soundpack, /event\.startsWith\('communication\.'\).*source: 'communications'/u);
});

test('stairs use authoritative Room.Info as a derived soundpack event with duplicate-room suppression', () => {
  const soundpack = source('src/soundpack-store.js');
  assert.match(soundpack, /'room\.stairs': 'stairs'/u);
  assert.match(soundpack, /event === 'room\.stairs'.*source: 'derived'.*Room\.Info/u);
  const renderer = source('renderer/renderer.js');
  const start = renderer.indexOf('function roomInfoExitDirections(body = {})');
  const end = renderer.indexOf('function formatReaderCombatHistory', start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.match(block, /body\?\.exits/u);
  assert.match(block, /body\?\.exit_details/u);
  assert.match(block, /\['up', 'u', 'down', 'd'\]/u);
  assert.match(block, /record\.lastStairsCueRoomKey/u);
  assert.match(block, /playClientSoundpackEvent\('room\.stairs', 'stairs'\)/u);
  assert.match(renderer, /if \(packageName === 'Room\.Info'\) playRoomStairsCue\(activeSessionRecord\(\), message\?\.body\);/u);
});

test('MUSH Reader setup enables the newly requested communication cues while ordinary defaults stay off', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /communicationCues: \{ tell: false, auction: false, gossip: false, group: false, grats: false, shout: false, holler: false, skynet: false, ssf: false, background: false \}/u);
  const start = renderer.indexOf('function applyMushSettingsPreset()');
  const end = renderer.indexOf('function applyFirstRunReaderChoice', start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.match(block, /group: true, grats: true, shout: true, holler: true/u);
});
