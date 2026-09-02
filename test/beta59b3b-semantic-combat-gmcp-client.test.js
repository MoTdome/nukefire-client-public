'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ConnectionManager,
  GMCP_SUPPORTS,
  INITIAL_GMCP_REQUESTS
} = require('../src/connection-manager');
const {
  GmcpStore,
  applyEventPatch,
  initialState,
  normalizeCombatSummary
} = require('../src/gmcp-store');
const { SessionManager } = require('../src/session-manager');

class FakeConnection {
  constructor(handlers) {
    this.handlers = handlers;
    this.status = 'disconnected';
    this.terminalSize = { width: 120, height: 40 };
    this.preferences = {};
  }
  async connect(host, port) {
    this.status = 'connected';
    this.handlers.onStatus?.({ state: 'connected', message: `Connected to ${host}:${port}`, host, port });
  }
  disconnect() { this.status = 'disconnected'; }
  sendCommand() { return this.status === 'connected'; }
  sendGmcp() { return true; }
  setTerminalSize(width, height) { this.terminalSize = { width, height }; return true; }
  setClientPreferences(preferences) { this.preferences = { ...this.preferences, ...preferences }; return { ...this.preferences }; }
}

function makeManager(events = []) {
  return new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
}

function sampleBody(overrides = {}) {
  return {
    schema: 1,
    window_ms: 200,
    out: { hits: 5, misses: 1, damage: 299783, criticals: 1, kills: 1 },
    in: { hits: 3, misses: 2, damage: 182441, criticals: 0, deaths: 0 },
    ...overrides
  };
}

test('NukeFire.Combat is advertised as event-only and is never snapshot-polled', () => {
  assert.equal(GMCP_SUPPORTS.includes('NukeFire.Combat 1'), true);
  assert.equal(INITIAL_GMCP_REQUESTS.includes('NukeFire.Combat'), false);
});

test('semantic combat normalization accepts schema 1 and bounds numeric fields', () => {
  const normalized = normalizeCombatSummary(sampleBody({
    window_ms: 999999,
    out: { hits: -2, misses: 3.9, damage: Number.MAX_SAFE_INTEGER + 1000, criticals: 2, kills: 1 },
    in: { hits: 4, misses: 1, damage: 100, deaths: 2 }
  }));
  assert.equal(normalized.schema, 1);
  assert.equal(normalized.window_ms, 5000);
  assert.equal(normalized.out.hits, 0);
  assert.equal(normalized.out.misses, 3);
  assert.equal(normalized.out.damage, Number.MAX_SAFE_INTEGER);
  assert.equal(normalized.in.deaths, 2);
  assert.equal(normalizeCombatSummary({ schema: 2 }), null);
});

test('GmcpStore emits semantic combat as ephemeral without retaining packet bodies', () => {
  const store = new GmcpStore({ includeStateInEvents: false });
  const event = store.apply({ packageName: 'nukefire.combat', body: sampleBody() });
  const snapshot = store.snapshot();
  assert.equal(event.packageName, 'NukeFire.Combat');
  assert.equal(event.ephemeral, true);
  assert.equal(event.ignored, undefined);
  assert.equal(event.path, null);
  assert.equal(event.body.out.damage, 299783);
  assert.equal(snapshot.extras['NukeFire.Combat'], undefined);
  assert.equal(snapshot.meta.messageCount, 1);
  assert.equal(snapshot.meta.lastPackage, 'NukeFire.Combat');
});

test('renderer-style event patch advances metadata but never stores ephemeral combat body', () => {
  const state = initialState();
  const patched = applyEventPatch(state, {
    packageName: 'NukeFire.Combat',
    originalPackageName: 'NukeFire.Combat',
    path: null,
    messageCount: 7,
    ephemeral: true,
    body: sampleBody()
  });
  assert.equal(patched.meta.messageCount, 7);
  assert.equal(patched.meta.lastPackage, 'NukeFire.Combat');
  assert.equal(patched.extras['NukeFire.Combat'], undefined);
});

test('ConnectionManager forwards one normalized transient combat event without full-state cloning', () => {
  const events = [];
  const manager = new ConnectionManager({ onGmcp: (event) => events.push(event) });
  manager.handleGmcp({ packageName: 'NukeFire.Combat', body: sampleBody() });
  assert.equal(events.length, 1);
  assert.equal(events[0].ephemeral, true);
  assert.equal(events[0].state, undefined);
  assert.equal(manager.getGmcpState().extras['NukeFire.Combat'], undefined);
});

test('Pipeline Debug receives a bounded semantic-combat diagnostic only when enabled', async () => {
  const events = [];
  const manager = makeManager(events);
  const main = manager.createSession({ name: 'Main', pipelineDebug: { enabled: true, maxEntries: 50 } });
  const quiet = manager.createSession({ name: 'Quiet' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(quiet.id, { host: 'mud.test', port: 4000 });

  const mainSession = manager.sessions.get(main.id);
  const quietSession = manager.sessions.get(quiet.id);
  const message = {
    packageName: 'NukeFire.Combat',
    body: sampleBody(),
    path: null,
    ephemeral: true,
    messageCount: 1
  };
  mainSession.connection.handlers.onGmcp(message);
  quietSession.connection.handlers.onGmcp(message);

  const debug = manager.pipelineDebugSnapshot(main.id);
  const combatEntry = debug.entries.find((entry) => entry.stage === 'gmcp-combat');
  assert.ok(combatEntry);
  assert.match(combatEntry.message, /out h5 m1 dmg299783 c1 k1/u);
  assert.match(combatEntry.message, /in h3 m2 dmg182441 c0 d0/u);
  assert.equal(manager.pipelineDebugSnapshot(quiet.id).entries.length, 0);
  assert.equal(events.some((event) => event.type === 'pipeline-debug' && event.payload?.entry?.stage === 'gmcp-combat'), true);
});
