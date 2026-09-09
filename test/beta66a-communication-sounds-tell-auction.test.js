'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const communications = require('../src/communications');
const { AUDIO_CUE_IDS, CUE_DEFINITIONS } = require('../src/audio-cues');

const root = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('Tell and Auction are first-class communication sounds with distinct native earcons', () => {
  for (const channel of ['tell', 'auction']) {
    assert.equal(AUDIO_CUE_IDS.includes(channel), true, channel);
    assert.ok(Array.isArray(CUE_DEFINITIONS[channel]) && CUE_DEFINITIONS[channel].length > 0, channel);
  }
  assert.notDeepEqual(CUE_DEFINITIONS.tell, CUE_DEFINITIONS.auction);
  assert.notDeepEqual(CUE_DEFINITIONS.tell, CUE_DEFINITIONS.gossip);
  assert.notDeepEqual(CUE_DEFINITIONS.auction, CUE_DEFINITIONS.gossip);
});

test('existing Communications classification already supplies Tell and Auction cue channels', () => {
  assert.equal(communications.classifyLine("Rianna tells you, 'hello'")?.channel, 'tell');
  assert.equal(communications.classifyLine("Mo auctions, 'widget for sale'")?.channel, 'auction');
});

test('Preferences and persisted accessibility settings expose Tell and Auction independently', () => {
  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');
  const settings = source('src/settings-store.js');
  for (const id of ['communication-cue-tell', 'communication-cue-auction']) {
    assert.match(html, new RegExp(`id="${id}"`, 'u'), id);
  }
  assert.match(renderer, /COMMUNICATION_CUE_CHANNELS = Object\.freeze\(\['tell', 'auction', 'gossip', 'group', 'grats', 'shout', 'holler', 'skynet', 'ssf'\]\)/u);
  assert.match(renderer, /communicationCueTell/u);
  assert.match(renderer, /communicationCueAuction/u);
  assert.match(settings, /tell: false,[\s\S]*auction: false,[\s\S]*gossip: false/u);
});

test('bounded CR SOUND client control accepts Tell and Auction without opening a generic setting surface', () => {
  const renderer = source('renderer/renderer.js');
  const start = renderer.indexOf("if (request.action === 'reader.sound.status')");
  const end = renderer.indexOf("if (request.action === 'reader.doctor')", start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.match(block, /tell, auction, gossip, group, grats, shout, holler, skynet, or ssf/u);
  assert.match(block, /normalizeCommunicationCueChannel/u);
  assert.doesNotMatch(block, /localStorage\.setItem\(request|eval\(|Function\(/u);
});
