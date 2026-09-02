'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

function block(start, end) {
  const from = renderer.indexOf(start);
  assert.notEqual(from, -1, `missing ${start}`);
  const to = renderer.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `missing ${end}`);
  return renderer.slice(from, to);
}

test('mapper owns a small session-scoped deferred BIGMAP queue', () => {
  assert.match(renderer, /deferredPackets:\s*\[\]/u);
  assert.match(renderer, /deferredPacketTimer:\s*null/u);
  assert.doesNotMatch(renderer, /deferredPacketFrame/u);
});

test('ordinary Room.Info and BIGMAP mapper updates remain synchronous', () => {
  const scheduler = block('function scheduleDeferredMapperPacket(', '\n\nfunction processMapperSnapshot');
  assert.match(scheduler, /if \(!shouldYieldMapperPacketForMovement\(packageName\)\) \{\s*processMapperPacket\(packageName, body\);\s*return;/su);
  const predicate = block('function shouldYieldMapperPacketForMovement(', '\n\nfunction scheduleDeferredMapperPacket');
  assert.match(predicate, /packageName !== 'NukeFire\.Map\.Local'/u);
  assert.match(predicate, /state\.mapper\.pendingMove \|\| ensureMapperMovementQueue\(state\.mapper\)\.length > 0 \|\| state\.mapper\.movementWatch/u);
});

test('Room.Info is never delayed by the movement-priority handoff', () => {
  const predicate = block('function shouldYieldMapperPacketForMovement(', '\n\nfunction scheduleDeferredMapperPacket');
  assert.match(predicate, /if \(packageName !== 'NukeFire\.Map\.Local'\) return false;/u);
  const gmcp = block('function applyGmcpState(', '\n\nfunction knowledgeController');
  assert.match(gmcp, /packageName === 'Room\.Info'[\s\S]*scheduleDeferredMapperPacket\('Room\.Info'/u);
  assert.match(gmcp, /packageName === 'NukeFire\.Map\.Local'[\s\S]*scheduleDeferredMapperPacket\('NukeFire\.Map\.Local'/u);
});

test('movement BIGMAP yields one task and gives pending terminal text first write', () => {
  const scheduler = block('function scheduleDeferredMapperPacket(', '\n\nfunction processMapperSnapshot');
  assert.match(scheduler, /state\.mapper\.deferredPackets\.push\(/u);
  assert.match(scheduler, /state\.mapper\.deferredPacketTimer = setTimeout\(\(\) => \{/u);
  assert.match(scheduler, /pendingRuns\.length > 0\) flushTerminalOutput\(\);/u);
  assert.match(scheduler, /flushTerminalOutput\(\);[\s\S]*flushDeferredMapperPackets\(\);/u);
  assert.match(scheduler, /\}, 0\);/u);
  assert.doesNotMatch(scheduler, /scheduleFrame|requestAnimationFrame/u);
});

test('deferred BIGMAP packets preserve arrival order and reject stale-session work', () => {
  const flush = block('function flushDeferredMapperPackets(', '\n\nfunction shouldYieldMapperPacketForMovement');
  assert.match(flush, /const packets = state\.mapper\.deferredPackets\.splice\(0\);/u);
  assert.match(flush, /for \(const packet of packets\)/u);
  assert.match(flush, /packet\.sessionId[\s\S]*activeSessionId/u);
  assert.match(flush, /processMapperPacket\(packet\.packageName, packet\.body\)/u);
  assert.doesNotMatch(flush, /Map\(|Set\(|at\(-1\)|pop\(\)/u);
});

test('session switch and mapper reset cannot leave movement BIGMAP work behind', () => {
  const activate = block('async function activateSession(', '\n\nfunction applySessionsSnapshot');
  const reset = block('function resetLiveMapperState(', '\n\nfunction renderMapperAvailability');
  assert.match(activate, /stopMapperRoute[\s\S]*flushDeferredMapperPackets\(\);[\s\S]*captureActiveSessionState\(\);/u);
  assert.match(reset, /clearDeferredMapperPackets\(\);/u);
  const clear = block('function clearDeferredMapperPackets(', '\n\nfunction processMapperPacket');
  assert.match(clear, /clearTimeout\(state\.mapper\.deferredPacketTimer\)/u);
  assert.match(clear, /state\.mapper\.deferredPackets\.length = 0/u);
});


test('rapid speedwalk keeps an ordered movement-intent queue while reusing the fallback watch', () => {
  const scheduler = block('function scheduleMovementRefreshWatch(', '\n\nfunction recentServerLinks');
  assert.match(scheduler, /const origin = String\(fromRoomId\);/u);
  assert.match(scheduler, /state\.mapper\.movementWatch\?\.fromRoomId === origin\) return;/u);

  const outgoing = block('function noteOutgoingCommand(', '\n\nasync function routeCommandThroughCoordinator');
  assert.match(outgoing, /const queue = ensureMapperMovementQueue\(record\.mapper\);/u);
  assert.match(outgoing, /queue\.push\(\{ direction: movementDirection, at \}\);/u);
  assert.match(outgoing, /hadPendingMovement/u);
  assert.match(outgoing, /activeSession && !hadPendingMovement/u);
  assert.match(outgoing, /if \(queue\.length >= 256\) queue\.shift\(\);/u);

  const resolver = block('function takeMapperMovementForRoom(', '\n\nfunction resolveMapperMovementPrompt');
  assert.match(resolver, /const queued = queue\[0\] \|\| null;/u);
  assert.match(resolver, /queue\.shift\(\);/u);
  assert.match(resolver, /movementRoomsSincePrompt/u);

  const prompt = block('function resolveMapperMovementPrompt(', '\n\nfunction processMapperRoom');
  assert.match(prompt, /roomResolutions > 0/u);
  assert.match(prompt, /else if \(queue\.length > 0\)/u);
  assert.match(prompt, /consumedFailedMove/u);
});

test('GPS movement refreshes reuse indexed destination lookups and stable option DOM', () => {
  const lookups = block('function ensureGpsDestinationLookups(', '\n\nfunction updateGpsSelectionGuidance');
  assert.match(lookups, /if \(gpsLookupItemsRef === items\) return;/u);
  assert.match(lookups, /gpsLookupByIndex = new Map\(\)/u);
  assert.match(lookups, /gpsLookupByRoom = new Map\(\)/u);
  assert.match(lookups, /gpsLookupByName = new Map\(\)/u);
  assert.match(lookups, /gpsLookupByIndex\.get\(index\)/u);
  assert.match(lookups, /gpsLookupByRoom\.get\(room\)/u);

  const render = block('function renderGpsNavigator(', '\n\nasync function setGpsFromNavigator');
  assert.match(render, /const rebuildOptions = gpsOptionsCatalogRef !== catalog \|\| gpsOptionsQuery !== query \|\| select\.options\.length === 0;/u);
  assert.match(render, /gpsOptionsFilteredIndexes = new Set/u);
  assert.match(render, /gpsLookupByIndex\.get\(Number\(select\.value\)\)/u);
});

test('non-communications GMCP bypasses communications parsing', () => {
  const active = block('function captureCommunicationGmcp(', '\n\nfunction clearCommunicationMessages');
  assert.match(active, /packageName !== 'comm\.channel' && packageName !== 'nukefire\.comms\.message'\) return;/u);
  assert.match(active, /communicationsApi\.messageFromGmcp\(message\)/u);
});


test('speedwalk send events do not recount the remaining queue on every step', () => {
  const sessionManager = fs.readFileSync(path.join(__dirname, '..', 'src', 'session-manager.js'), 'utf8');
  const from = sessionManager.indexOf("if (sent && entry.source === 'speedwalk')");
  assert.notEqual(from, -1);
  const snippet = sessionManager.slice(from, from + 220);
  assert.match(snippet, /this\.emit\(id, 'speedwalk-step', \{ command \}\)/u);
  assert.doesNotMatch(snippet, /countSource/u);
});
