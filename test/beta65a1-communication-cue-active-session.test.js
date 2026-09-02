'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(ROOT, 'renderer', 'renderer.js'), 'utf8');
const communications = require(path.join(ROOT, 'src', 'communications.js'));

function functionBody(source, name, nextName) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `missing ${name}`);
  const end = nextName ? source.indexOf(`\nfunction ${nextName}`, start + 1) : -1;
  assert.notEqual(end, -1, `unable to bound ${name}`);
  return source.slice(start, end);
}

test('active-session communication storage plays the configured channel cue', () => {
  const body = functionBody(renderer, 'addCommunicationMessage', 'captureCommunicationText');

  assert.match(body, /state\.communications\.messages\.push\(message\);\s*appendReaderHistoryCommunication\(activeSessionRecord\(\), message\);\s*playCommunicationAudioCue\(activeSessionRecord\(\), message\);/u);

  const duplicateReturn = body.indexOf('if (duplicate)');
  const cueCall = body.indexOf('playCommunicationAudioCue(activeSessionRecord(), message);');
  assert.ok(duplicateReturn >= 0 && cueCall > duplicateReturn,
    'cue must remain after terminal/GMCP duplicate coalescing so one event only sounds once');
});

test('background-session communication storage keeps the same cue path', () => {
  const body = functionBody(renderer, 'addCommunicationToSession', 'storeInactiveGmcp');
  assert.match(body, /record\.communications\.messages\.push\(storedMessage\);\s*appendReaderHistoryCommunication\(record, storedMessage\);\s*playCommunicationAudioCue\(record, storedMessage\);/u);
});

test('Gossip, Skynet, and SSF live text still classify to their cue channels', () => {
  assert.equal(communications.classifyLine('[Gossip] Southpaw: hello')?.channel, 'gossip');
  assert.equal(communications.classifyLine('(Skynet) Southpaw has pillaged a legendary weapon!')?.channel, 'skynet');
  assert.equal(communications.classifyLine('[SSF] Southpaw: hello')?.channel, 'ssf');

  // A7 semantic hygiene must remain intact: local Skynet UI/status text is not a channel event.
  assert.equal(communications.classifyLine('Skynet(TM) GPS/status text'), null);
});
