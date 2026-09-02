'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { GMCP_SUPPORTS } = require('../src/connection-manager');
const { GmcpStore } = require('../src/gmcp-store');
const { CONTROL_REQUEST_ACTIONS } = require('../src/semantic-controls');
const { semanticCueForEvent, SERVER_SOUND_EVENT_CUES } = require('../src/audio-cues');
const { SOUNDPACK_EVENTS } = require('../src/soundpack-store');

const root = path.resolve(__dirname, '..');

test('NukeFire.Sound is advertised and sound events remain ephemeral', () => {
  assert.ok(GMCP_SUPPORTS.includes('NukeFire.Sound 1'));
  const store = new GmcpStore();
  const event = store.apply({ packageName: 'nukefire.sound.event', body: { schema: 1, event: 'door.open' } });
  assert.equal(event.packageName, 'NukeFire.Sound.Event');
  assert.equal(event.ephemeral, true);
  assert.equal(event.path, null);
  assert.equal(store.snapshot().extras['NukeFire.Sound.Event'], undefined);
});

test('server sound events map through one explicit bounded cue allowlist', () => {
  const expected = {
    'door.open': 'door-open', 'door.close': 'door-close', 'door.lock': 'door-lock',
    'door.unlock': 'door-unlock', 'door.pick': 'door-pick', 'door.break': 'door-break',
    'container.open': 'container-open', 'container.close': 'container-close',
    'container.lock': 'container-lock', 'container.unlock': 'container-unlock',
    'container.pick': 'container-pick', 'container.break': 'container-break'
  };
  for (const [event, cue] of Object.entries(expected)) {
    assert.equal(SERVER_SOUND_EVENT_CUES[event], cue);
    assert.equal(SOUNDPACK_EVENTS[event], cue);
    assert.equal(semanticCueForEvent('NukeFire.Sound.Event', { schema: 1, event }), cue);
  }
  assert.equal(semanticCueForEvent('NukeFire.Sound.Event', { schema: 1, event: '../../attack' }), '');
  assert.equal(semanticCueForEvent('NukeFire.Sound.Event', { schema: 1, event: 'server.command' }), '');
});

test('loot events select item and credit cues without retaining packet bodies', () => {
  const store = new GmcpStore();
  const event = store.apply({ packageName: 'NukeFire.Loot.Event', body: { schema: 1, kind: 'item' } });
  assert.equal(event.ephemeral, true);
  assert.equal(semanticCueForEvent('NukeFire.Loot.Event', { schema: 1, kind: 'item' }), 'loot-item');
  assert.equal(semanticCueForEvent('NukeFire.Loot.Event', { schema: 1, kind: 'credits' }), 'loot-credits');
});

test('CR SOUNDPACK actions are explicitly allowlisted and renderer keeps command-input activation safe', () => {
  for (const action of ['status', 'list', 'import', 'use', 'builtin', 'test']) {
    assert.ok(CONTROL_REQUEST_ACTIONS.has(`reader.soundpack.${action}`));
  }
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  assert.match(renderer, /request\.action === 'reader\.soundpack\.status'/u);
  assert.match(renderer, /request\.action === 'reader\.soundpack\.import'/u);
  assert.match(renderer, /activateSoundpack\(id, \{ announceChange: false \}\)/u);
  assert.match(renderer, /commandInput\.setSelectionRange\(selectionStart, selectionEnd, selectionDirection \|\| 'none'\)/u);
  assert.match(renderer, /packageName === 'NukeFire\.Sound\.Event'/u);
  assert.match(renderer, /packageName === 'NukeFire\.Loot\.Event'/u);
});
