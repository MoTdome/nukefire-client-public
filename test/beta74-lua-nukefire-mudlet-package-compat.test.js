'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { clientCommandHelp } = require('../src/client-command-help');
const { SessionManager } = require('../src/session-manager');
const { GmcpStore } = require('../src/gmcp-store');
const { buildMudletMsdpSnapshot, diffMudletMsdp } = require('../src/lua-data-bridge');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.status = 'disconnected'; this.sent = []; this.store = new GmcpStore({ includeStateInEvents: false }); }
  async connect() { this.status = 'connected'; this.handlers.onStatus?.({ state: 'connected', host: 'tdome.nukefire.org', port: 4000 }); }
  disconnect(message = '') { const was = this.status; this.status = 'disconnected'; if (was !== 'disconnected') this.handlers.onStatus?.({ state: 'disconnected', message, host: 'tdome.nukefire.org', port: 4000 }); }
  sendCommand(command) { if (this.status !== 'connected') return false; this.sent.push(command); return true; }
  sendGmcp() { return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
  getGmcpState() { return this.store.snapshot(); }
  gmcp(packageName, body) { const event = this.store.apply({ packageName, body }); this.handlers.onGmcp?.(event); }
}

function tick() { return new Promise((resolve) => setImmediate(resolve)); }

function harness() {
  const callbacks = [];
  const connections = new Map();
  const manager = new SessionManager({
    connectionFactory: (handlers, session) => {
      const connection = new FakeConnection(handlers);
      if (session?.id) connections.set(session.id, connection);
      return connection;
    },
    queueOptions: { intervalMs: 0 },
    handlers: {
      onLuaCallback: (request) => { callbacks.push(request); return Promise.resolve({ ok: true, values: [] }); },
      onLuaCallbackForgotten: () => true,
      onSessionsChanged: () => {},
      onEvent: () => {}
    }
  });
  return { manager, callbacks, connections };
}

test('Mudlet MSDP compatibility snapshot projects real NukeFire GMCP fields without a second protocol store', () => {
  const state = {
    char: {
      vitals: { hp: 700, mhp: 1000, mana: 80, mmana: 100, move: 55, mmove: 90, opponent: { name: 'mutant', hp: 400, mhp: 500, level: 42 } },
      status: { name: 'Cyrus', level: 54, class: 'Cyborg', race: 'Human', exp: 1234, alignment: -50, gold: 99 },
      maxStats: { hitroll: 12, damroll: 34, ac: -20 }
    },
    room: { info: { num: 3014, name: 'Tek Angeles', exits: { north: 3015 }, area: 'Tek' } },
    affects: { state: [{ name: 'armor' }] }
  };
  const result = buildMudletMsdpSnapshot(state);
  assert.equal(result.snapshot.HEALTH, 700);
  assert.equal(result.snapshot.HEALTH_MAX, 1000);
  assert.equal(result.snapshot.CLASS, 'Cyborg');
  assert.equal(result.snapshot.OPPONENT_LEVEL, 42);
  assert.equal(result.snapshot.ROOM_VNUM, 3014);
  assert.deepEqual(result.snapshot.ROOM_EXITS, { north: 3015 });
  assert.equal(result.snapshot.AREA_NAME, 'Tek');
  assert.deepEqual(JSON.parse(result.json), result.snapshot);
});

test('Mudlet MSDP opponent projection clears combat values when Char.Vitals opponent becomes null', () => {
  const before = buildMudletMsdpSnapshot({ char: { vitals: { opponent: { name: 'mutant', hp: 5, mhp: 10, level: 42 } } } }).snapshot;
  const after = buildMudletMsdpSnapshot({ char: { vitals: { opponent: null } } }).snapshot;
  assert.equal(after.OPPONENT_NAME, '');
  assert.equal(after.OPPONENT_LEVEL, 0);
  const changed = new Map(diffMudletMsdp(before, after).map((entry) => [entry.field, entry.value]));
  assert.equal(changed.get('OPPONENT_LEVEL'), 0);
  assert.equal(changed.get('OPPONENT_NAME'), '');
});

test('GMCP changes raise Mudlet-compatible msdp.FIELD Lua events with fresh canonical state', async () => {
  const { manager, callbacks } = harness();
  const session = manager.createSession({ id: 'main', name: 'Main' });
  manager.registerLuaAutomation(session.id, { id: 201, kind: 'event', pattern: 'msdp.HEALTH' });
  manager.registerLuaAutomation(session.id, { id: 202, kind: 'event', pattern: 'msdp.OPPONENT_LEVEL' });
  const connection = manager.sessions.get(session.id).connection;
  connection.gmcp('Char.Vitals', { hp: 700, mhp: 1000, opponent: { name: 'mutant', hp: 5, mhp: 10, level: 42 } });
  connection.gmcp('Char.Vitals', { hp: 650, mhp: 1000, opponent: null });
  await tick();
  const health = callbacks.filter((entry) => entry.callbackId === 201);
  const opponent = callbacks.filter((entry) => entry.callbackId === 202);
  assert.equal(health.length, 2);
  assert.equal(health.at(-1).context.args[0], 'msdp.HEALTH');
  assert.equal(health.at(-1).context.args[1], 650);
  assert.equal(opponent.at(-1).context.args[1], 0);
});

test('raiseLuaGlobalEvent broadcasts to other NukeFire sessions and appends the source profile name', async () => {
  const { manager, callbacks } = harness();
  const alpha = manager.createSession({ id: 'alpha', name: 'Alpha' });
  const beta = manager.createSession({ id: 'beta', name: 'Beta' });
  manager.registerLuaAutomation(alpha.id, { id: 210, kind: 'event', pattern: 'crew.command' });
  manager.registerLuaAutomation(beta.id, { id: 211, kind: 'event', pattern: 'crew.command' });
  const result = manager.raiseLuaGlobalEvent(alpha.id, 'crew.command', JSON.stringify(['north']));
  assert.equal(result.sessions, 1);
  await tick();
  assert.equal(callbacks.some((entry) => entry.callbackId === 210), false, 'global event must not echo back into the sending profile');
  const delivered = callbacks.find((entry) => entry.callbackId === 211);
  assert.deepEqual(delivered.context.args, ['crew.command', 'north', 'Alpha']);
});

test('Mudlet sysConnection/sysProtocol/sysDisconnection compatibility events ride the existing session lifecycle', async () => {
  const { manager, callbacks } = harness();
  const session = manager.createSession({ id: 'main', name: 'Main' });
  manager.registerLuaAutomation(session.id, { id: 220, kind: 'event', pattern: 'sysConnectionEvent' });
  manager.registerLuaAutomation(session.id, { id: 221, kind: 'event', pattern: 'sysProtocolEnabled' });
  manager.registerLuaAutomation(session.id, { id: 222, kind: 'event', pattern: 'sysDisconnectionEvent' });
  await manager.connectSession(session.id, { host: 'tdome.nukefire.org', port: 4000 });
  manager.disconnectSession(session.id, 'test');
  await tick();
  assert.equal(callbacks.filter((entry) => entry.callbackId === 220).length, 1);
  assert.deepEqual(callbacks.filter((entry) => entry.callbackId === 221).map((entry) => entry.context.args[1]), ['GMCP', 'MSDP']);
  assert.equal(callbacks.filter((entry) => entry.callbackId === 222).length, 1);
});


test('Lua help documents the real NukeFire Mudlet-package bridge and preserves the host boundary', () => {
  const help = clientCommandHelp('lua').join('\n');
  assert.match(help, /msdp is a read-only compatibility projection/u);
  assert.match(help, /registerNamedEventHandler/u);
  assert.match(help, /raiseGlobalEvent/u);
  assert.match(help, /getProfileName\(\)/u);
  assert.match(help, /Geyser\/EMCO/u);
  assert.match(help, /arbitrary filesystem persistence/u);
  const worker = fs.readFileSync(path.join(__dirname, '..', 'src', 'lua-runtime-worker.js'), 'utf8');
  assert.match(worker, /io = nil/u);
  assert.match(worker, /os = nil/u);
  assert.doesNotMatch(worker, /installPackage\s*=\s*function/u);
});
