'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { firstDirective } = require('../src/client-command-parser');

const root = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const manager = source('src/session-manager.js');
const renderer = source('renderer/renderer.js');
const help = source('src/client-command-help.js');

test('TinTin SOUND command names remain case-insensitive through the shared directive parser', () => {
  assert.equal(firstDirective('#SOUND {LIST}')?.directive, 'sound');
  assert.equal(firstDirective('#Sound {SEARCH} {stairs}')?.directive, 'sound');
  assert.equal(firstDirective('#sound {SHOW} {CUSTOM.STAIRS}')?.directive, 'sound');
});

test('SOUND discovery subcommands normalize case and emit only bounded managed queries', () => {
  assert.match(manager, /const operation = String\(tokens\[0\] \|\| ''\)[\s\S]{0,120}toLowerCase\(\)/u);
  for (const operation of ['list', 'search', 'show']) {
    assert.match(manager, new RegExp(`operation === '${operation}'`, 'u'));
  }
  assert.match(manager, /this\.emit\(source\.id, 'soundpack-event-query', \{ operation: 'list', filter \}\)/u);
  assert.match(manager, /this\.emit\(source\.id, 'soundpack-event-query', \{ operation: 'search', query \}\)/u);
  assert.match(manager, /this\.emit\(source\.id, 'soundpack-event-query', \{ operation: 'show', event \}\)/u);
  assert.match(manager, /SOUND_QUERY_TEXT_MAX = 80/u);
  assert.match(manager, /!interactive && \['list', 'search', 'show'\]\.includes\(operation\)/u);
});

test('SOUND LIST SEARCH and SHOW are renderer-side catalog discovery and stay non-spammy', () => {
  assert.match(renderer, /TINTIN_SOUND_QUERY_MAX_RESULTS = 24/u);
  assert.match(renderer, /async function handleTinTinSoundpackQuery/u);
  assert.match(renderer, /item\.status !== 'not-emitted'/u);
  assert.match(renderer, /Sound groups:/u);
  assert.match(renderer, /Sound matches for/u);
  assert.match(renderer, /Unknown sound event/u);
  assert.match(renderer, /soundpackEventPlaybackDecision\(event/u);
  assert.match(renderer, /case 'soundpack-event-query': void handleTinTinSoundpackQuery\(record, payload, true\)/u);
  assert.match(renderer, /case 'soundpack-event-query': break/u);
});

test('SOUND help documents discovery and explicitly says command/event case does not matter', () => {
  assert.match(help, /sound \{list\}/u);
  assert.match(help, /sound \{list\} \{custom\}/u);
  assert.match(help, /sound \{search\} \{stairs\}/u);
  assert.match(help, /sound \{show\} \{custom\.stairs\}/u);
  assert.match(help, /case-insensitive/u);
  assert.match(help, /LIST\/SEARCH\/SHOW are interactive discovery commands/u);
});
