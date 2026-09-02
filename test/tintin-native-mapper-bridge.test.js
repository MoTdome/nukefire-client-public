'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { SessionManager } = require('../src/session-manager');
const { prepareTinTinRead } = require('../src/tintin-script-loader');
const { clientCommandHelp, listClientCommandHelp } = require('../src/client-command-help');

class FakeConnection {
  constructor(handlers) {
    this.handlers = handlers;
    this.sent = [];
    this.status = 'disconnected';
  }
  async connect(host, port) {
    this.status = 'connected';
    this.handlers.onStatus?.({ state: 'connected', host, port, message: 'connected' });
  }
  disconnect(message = 'Disconnected') {
    this.status = 'disconnected';
    this.handlers.onStatus?.({ state: 'disconnected', message });
  }
  sendCommand(command) {
    if (this.status !== 'connected') return false;
    this.sent.push(command);
    return true;
  }
  sendGmcp() { return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
}

function managerHarness(options = {}) {
  const events = [];
  const timers = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    delaySetTimer: (callback, milliseconds) => {
      const timer = { callback, milliseconds };
      timers.push(timer);
      return timer;
    },
    delayClearTimer: () => {},
    tickerSetTimer: () => ({ secondTimer: true }),
    tickerClearTimer: () => {},
    ...options
  });
  return { manager, events, timers };
}

function mapperEvents(events) {
  return events.filter((event) => String(event.type || '').startsWith('mapper-route-'));
}

test('#MAP FIND emits one private native Mapper target request without sending to the MUD', () => {
  const { manager, events } = managerHarness();
  const hero = manager.createSession({ name: 'Hero' });
  const result = manager.dispatchInput(hero.id, '#map find 15457');
  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(mapperEvents(events).map((event) => ({ sessionId: event.sessionId, type: event.type, payload: event.payload })), [
    { sessionId: hero.id, type: 'mapper-route-find-request', payload: { target: '15457' } }
  ]);
});

test('#MAP FIND expands TinTin variables and Functions before validating the room vnum', () => {
  const { manager, events } = managerHarness();
  const hero = manager.createSession({ name: 'Hero' });
  manager.dispatchInput(hero.id, '#variable {going_room} {23000}');
  manager.dispatchInput(hero.id, '#function {dest} {#return {15457}}');
  manager.dispatchInput(hero.id, '#map find $going_room');
  manager.dispatchInput(hero.id, '#map find @dest{}');
  assert.deepEqual(mapperEvents(events).map((event) => event.payload.target), ['23000', '15457']);
});

test('veteran dash alias keeps positional MAP FIND and redundant PATH RUN target in order', () => {
  const { manager, events } = managerHarness();
  const hero = manager.createSession({ name: 'Hero' });
  manager.dispatchInput(hero.id, '#alias {dash %1} {#map find %1;#path run %1}');
  const result = manager.dispatchInput(hero.id, 'dash 32449');
  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(mapperEvents(events).map((event) => [event.type, event.payload]), [
    ['mapper-route-find-request', { target: '32449' }],
    ['mapper-route-run-request', { target: '32449', argument: '32449' }]
  ]);
});

test('delayed veteran MAP FIND resolves $going_room when the delay fires', () => {
  const { manager, events, timers } = managerHarness();
  const hero = manager.createSession({ name: 'Hero' });
  manager.dispatchInput(hero.id, '#variable {going_room} {11111}');
  manager.dispatchInput(hero.id, '#alias {goto} {#delay 1 #map find $going_room}');
  manager.dispatchInput(hero.id, 'goto');
  assert.equal(timers.length, 1);
  manager.dispatchInput(hero.id, '#variable {going_room} {22222}');
  timers[0].callback();
  assert.deepEqual(mapperEvents(events).map((event) => event.payload.target), ['22222']);
});

test('named-session MAP targets stay isolated between veteran crew sessions', () => {
  const { manager, events } = managerHarness();
  const main = manager.createSession({ name: 'Main' });
  const jags = manager.createSession({ name: 'Jags' });
  const jugs = manager.createSession({ name: 'Jugs' });
  manager.dispatchInput(main.id, '#Jags #map find 15457');
  manager.dispatchInput(main.id, '#Jugs #map find 23000');
  manager.dispatchInput(main.id, '#Jags #path run');
  manager.dispatchInput(main.id, '#Jugs #path run');
  assert.deepEqual(mapperEvents(events).map((event) => [event.sessionId, event.type, event.payload.target || '']), [
    [jags.id, 'mapper-route-find-request', '15457'],
    [jugs.id, 'mapper-route-find-request', '23000'],
    [jags.id, 'mapper-route-run-request', '15457'],
    [jugs.id, 'mapper-route-run-request', '23000']
  ]);
});

test('#PATH STOP requests only the issuing session native route stop', () => {
  const { manager, events } = managerHarness();
  const hero = manager.createSession({ name: 'Hero' });
  manager.dispatchInput(hero.id, '#path stop');
  assert.deepEqual(mapperEvents(events).map((event) => ({ sessionId: event.sessionId, type: event.type })), [
    { sessionId: hero.id, type: 'mapper-route-stop-request' }
  ]);
});

test('invalid Mapper targets and PATH RUN without MAP FIND fail locally and atomically', () => {
  const { manager, events } = managerHarness();
  const hero = manager.createSession({ name: 'Hero' });
  let result = manager.dispatchInput(hero.id, '#map find nowhere');
  assert.match(result.messages.join('\n'), /positive numeric NukeFire room vnum/u);
  result = manager.dispatchInput(hero.id, '#path run');
  assert.match(result.messages.join('\n'), /Use #map find/u);
  assert.deepEqual(mapperEvents(events), []);
});

test('#READ accepts the real veteran MAP FIND / PATH RUN alias shapes as normal Alias bodies', () => {
  const source = [
    '#alias {dash %1} {#map find %1;#path run %1}',
    '#alias {goto %1} {tell %1 room number;#delay 1 #map find $going_room;#delay 1.5 #path run;#delay 2.5 groupup}',
    '#alias {GDK} {#map find 32449;#path run}'
  ].join('\n');
  const result = prepareTinTinRead(source, {});
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.equal(result.counts.aliases, 3);
  assert.equal(result.unsupportedCounts.map, undefined);
  assert.equal(result.unsupportedCounts.path, undefined);
  assert.equal(result.definitions.aliases.some((entry) => entry.name === 'dash %1' && /#map find %1;\s*#path run %1/u.test(entry.body)), true);
});

test('client Help documents the native Mapper bridge and its ownership boundary', () => {
  const mapHelp = clientCommandHelp('map', '^').join('\n');
  const pathHelp = clientCommandHelp('path', '^').join('\n');
  assert.match(mapHelp, /\^map find \{room vnum\}/u);
  assert.match(mapHelp, /does not import TinTin map files/u);
  assert.match(pathHelp, /\^path run/u);
  assert.match(pathHelp, /Room\.Info and BIGMAP confirmation/u);
  assert.match(pathHelp, /PATH RUN %1/u);
  assert.match(listClientCommandHelp('^').join('\n'), /\^map find <vnum>\s+\^path run\s+\^path stop/u);
});

test('renderer bridge enters the existing verified route runner without weakening native safety stops', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(source, /case 'mapper-route-find-request': handleTinTinMapperFindRequest/u);
  assert.match(source, /case 'mapper-route-run-request': void handleTinTinPathRunRequest/u);
  assert.match(source, /case 'mapper-route-stop-request': handleTinTinPathStopRequest/u);
  assert.match(source, /await startMapperRoute\(targetId\)/u);
  assert.match(source, /mapperApi\.authoritativeStep/u);
  assert.match(source, /route\.roomConfirmed = true/u);
  assert.match(source, /route\.mapConfirmed = true/u);
  assert.match(source, /within 10 seconds/u);
  assert.match(source, /Client route stopped because a manual command was entered/u);
  assert.match(source, /Client route stopped because the active session changed/u);
  assert.match(source, /Client route stopped because map state was cleared/u);
});
