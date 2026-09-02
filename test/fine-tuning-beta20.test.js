'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

test('beta.20 uses port 4000 without numeric spinner controls', () => {
  assert.match(html, /id="port" value="4000" type="text" inputmode="numeric"/u);
  assert.doesNotMatch(html, /id="port"[^>]+type="number"/u);
});

test('beta.20 names and expands the NukeFire Console', () => {
  assert.match(html, /id="context-deck-heading">NukeFire Console</u);
  assert.match(html, /Server-authoritative room, service, zone, character, map, and travel controls/u);
});

test('beta.20 locally terminates prompts and preserves repeatable commands', () => {
  assert.match(renderer, /if \(hasServerCommands\) \{\s*terminateCurrentOutputLine\(\)/u);
  assert.match(renderer, /const showSentCommand = !preserveInput && repeatableCommand && \$\('#show-last-command-in-input'\)\.checked/u);
  assert.match(renderer, /commandInput\.value = showSentCommand \? command : ''/u);
  assert.match(renderer, /if \(showSentCommand\) commandInput\.select\(\)/u);
});

test('beta.20 uses a branded disconnect dialog and reports disconnects in terminal output', () => {
  assert.match(html, /id="disconnect-dialog"[\s\S]+CONNECTION CONTROL/u);
  assert.match(renderer, /function openDisconnectDialog\(\)/u);
  const disconnectSection = renderer.slice(renderer.indexOf('function openDisconnectDialog'), renderer.indexOf("$('#send')"));
  assert.doesNotMatch(disconnectSection, /window\.confirm/u);
  assert.match(renderer, /Disconnected from \$\{host\}:\$\{port\}/u);
  assert.match(renderer, /Local workspace — aliases, Actions, \$\{prefix\}showme, and client commands still work/u);
});

test('beta.20 responsiveness hotfix recovers room state after special-procedure movement', () => {
  assert.match(renderer, /function scheduleMovementRefreshWatch\(fromRoomId\)/u);
  assert.match(renderer, /sendActiveGmcp\('Room\.Info'\)/u);
  assert.match(renderer, /sendActiveGmcp\('NukeFire\.Map\.Local'\)/u);
  assert.match(renderer, /sendActiveGmcp\('NukeFire\.Context'\)/u);
  assert.match(renderer, /\}, 300\);/u);
  assert.match(renderer, /confirmMovementWatchRoom\(roomId\)/u);
  assert.match(renderer, /confirmMovementWatchMap\(normalized\?\.centerId\)/u);
});

test('beta.20 responsiveness hotfix keeps terminal painting ahead of mapper work', () => {
  assert.match(renderer, /if \(state\.terminalRender\.idleFlushTimer === null\)/u);
  assert.doesNotMatch(renderer, /if \(!isXtermActive\(\) && state\.terminalRender\.idleFlushTimer === null\)/u);
  assert.match(renderer, /state\.terminalRender\.atLiveBottom/u);
  const details = renderer.slice(renderer.indexOf('function renderMapperDetails'), renderer.indexOf('function renderMapper()'));
  assert.doesNotMatch(details, /mapperRoutePlan\(/u);
  assert.match(renderer, /liveRoomIndex: new Map\(\)/u);
  assert.match(renderer, /function indexMapperSnapshot\(snapshot\)/u);
});
