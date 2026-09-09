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

test('room.stairs remains allowlisted but generic up/down Room.Info exits no longer masquerade as DCC stairs', () => {
  const soundpack = source('src/soundpack-store.js');
  assert.match(soundpack, /'room\.stairs': 'stairs'/u);
  assert.match(soundpack, /'room\.stairs'.*source: 'reserved'.*status: 'not-emitted'/u);
  assert.match(soundpack, /ordinary up\/down exits are not enough/iu);
  const renderer = source('renderer/renderer.js');
  assert.doesNotMatch(renderer, /function playRoomStairsCue/u);
  assert.doesNotMatch(renderer, /playRoomStairsCue\(activeSessionRecord\(\), message\?\.body\)/u);
});

test('MUSH Reader setup enables the newly requested communication cues while ordinary defaults stay off', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /communicationCues: \{ tell: false, auction: false, gossip: false, group: false, grats: false, shout: false, holler: false, skynet: false, ssf: false, background: false \}/u);
  const start = renderer.indexOf('function applyMushSettingsPreset()');
  const end = renderer.indexOf('function applyFirstRunReaderChoice', start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.match(block, /group: true, grats: true, shout: true, holler: true/u);
});
