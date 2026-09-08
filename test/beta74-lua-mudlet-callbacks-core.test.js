'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AliasEngine } = require('../src/alias-engine');
const { ActionEngine } = require('../src/action-engine');
const { EventEngine } = require('../src/event-engine');
const { compileLuaAutomationRegex } = require('../src/lua-automation-pattern');
const { SessionManager } = require('../src/session-manager');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.status = 'connected'; this.sent = []; }
  async connect() { this.status = 'connected'; }
  disconnect() { this.status = 'disconnected'; }
  sendCommand(command) { if (this.status !== 'connected') return false; this.sent.push(command); return true; }
  sendGmcp() { return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
  getGmcpState() { return null; }
}

function tick() { return new Promise((resolve) => setImmediate(resolve)); }

function managerHarness(options = {}) {
  const callbacks = [];
  const forgotten = [];
  const timers = [];
  const cleared = [];
  const handler = options.onLuaCallback || ((request) => {
    callbacks.push(request);
    return Promise.resolve({ ok: true, values: [], echoes: [], sends: [], variableSets: [], tableSets: [], gmcpSends: [], executions: [], automations: [] });
  });
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    maxLuaCallbacksPerSecond: options.maxLuaCallbacksPerSecond || 128,
    delaySetTimer: (fn, ms) => { const timer = { fn, ms, cleared: false }; timers.push(timer); return timer; },
    delayClearTimer: (timer) => { if (timer) timer.cleared = true; cleared.push(timer); },
    handlers: {
      onLuaCallback: handler,
      onLuaCallbackForgotten: (_sessionId, id) => { forgotten.push(id); return Promise.resolve(true); },
      onEvent: () => {},
      onSessionsChanged: () => {}
    }
  });
  const session = manager.createSession({ id: 'main', name: 'Main' });
  return { manager, session, callbacks, forgotten, timers, cleared };
}

test('Lua transient AliasEngine entries use regex captures, can toggle, and never enter persistent snapshots', () => {
  const engine = new AliasEngine();
  assert.ok(engine.defineLuaTransient(7, '^kk\\s+(.+)$'));
  assert.deepEqual(engine.matchLuaTransients('kk mutant')[0].matches, ['kk mutant', 'mutant']);
  assert.equal(engine.list().some((record) => record.id === 7), false);
  assert.equal(engine.setLuaTransientEnabled(7, false), true);
  assert.deepEqual(engine.matchLuaTransients('kk mutant'), []);
  assert.equal(engine.setLuaTransientEnabled(7, true), true);
  assert.equal(engine.removeLuaTransient(7), true);
  assert.deepEqual(engine.matchLuaTransients('kk mutant'), []);
});

test('Lua transient ActionEngine entries support substring, exact and regex/named captures without persistence', () => {
  const engine = new ActionEngine();
  assert.ok(engine.defineLuaTransient(1, 'substring', 'Danger'));
  assert.ok(engine.defineLuaTransient(2, 'exact', 'Ready.'));
  assert.ok(engine.defineLuaTransient(3, 'regex', '^Hit (?<target>.+) for (\\d+)$'));
  assert.deepEqual(engine.matchLuaTransients('Danger nearby').map((item) => item.id), [1]);
  assert.deepEqual(engine.matchLuaTransients('Ready.').map((item) => item.id), [2]);
  const regex = engine.matchLuaTransients('Hit mutant for 42')[0];
  assert.equal(regex.id, 3);
  assert.deepEqual(regex.matches, ['Hit mutant for 42', 'mutant', '42']);
  assert.equal(regex.namedMatches.target, 'mutant');
  assert.equal(engine.list().some((record) => record.id === 3), false);
  engine.setLuaTransientEnabled(3, false);
  assert.deepEqual(engine.matchLuaTransients('Hit mutant for 42'), []);
  engine.removeLuaTransient(1); engine.removeLuaTransient(2); engine.removeLuaTransient(3);
});

test('Lua automation regex guard rejects malformed and obvious nested-quantifier patterns', () => {
  assert.equal(compileLuaAutomationRegex('(a+)+$'), null);
  assert.equal(compileLuaAutomationRegex('([ab]*)+$'), null);
  assert.equal(compileLuaAutomationRegex('[unterminated'), null);
  assert.ok(compileLuaAutomationRegex('^You hit (.+) for (\\d+)$'));
});

test('Lua transient EventEngine entries support multiple handlers, toggle/kill, and do not persist', () => {
  const engine = new EventEngine();
  assert.ok(engine.defineLuaTransient(4, 'gmcp.Char.Vitals'));
  assert.ok(engine.defineLuaTransient(5, 'gmcp.Char.Vitals', true));
  assert.deepEqual(engine.matchLuaTransients('gmcp.Char.Vitals').map((item) => item.id), [4, 5]);
  assert.equal(engine.list().some((record) => record.id === 4), false);
  engine.setLuaTransientEnabled(4, false);
  assert.deepEqual(engine.matchLuaTransients('gmcp.Char.Vitals').map((item) => item.id), [5]);
  engine.removeLuaTransient(5);
  assert.deepEqual(engine.matchLuaTransients('gmcp.Char.Vitals'), []);
});

test('SessionManager temp alias consumes input and invokes Lua with Mudlet-style command/matches context', async () => {
  const { manager, session, callbacks } = managerHarness();
  assert.equal(manager.registerLuaAutomation(session.id, { id: 10, kind: 'alias', pattern: '^kk\\s+(.+)$' }).registered, true);
  const result = manager.dispatchInput(session.id, 'kk mutant');
  assert.equal(result.handled, true);
  assert.deepEqual(result.deliveries, []);
  await tick();
  assert.equal(callbacks.length, 1);
  assert.equal(callbacks[0].callbackId, 10);
  assert.equal(callbacks[0].context.command, 'kk mutant');
  assert.deepEqual(callbacks[0].context.matches, ['kk mutant', 'mutant']);
  assert.deepEqual(manager.sessions.get(session.id).connection.sent, []);
});

test('SessionManager temp trigger uses existing incoming Action path and supplies line/matches/named captures', async () => {
  const { manager, session, callbacks } = managerHarness();
  assert.equal(manager.registerLuaAutomation(session.id, { id: 11, kind: 'regex-trigger', pattern: '^Hit (?<target>.+) for (\\d+)$' }).registered, true);
  manager.sessions.get(session.id).connection.handlers.onText('Hit mutant for 42\n');
  await tick();
  assert.equal(callbacks.length, 1);
  assert.equal(callbacks[0].context.line, 'Hit mutant for 42');
  assert.deepEqual(callbacks[0].context.matches, ['Hit mutant for 42', 'mutant', '42']);
  assert.equal(callbacks[0].context.namedMatches.target, 'mutant');
});

test('Lua anonymous event handlers receive ordinary TinTin events plus GMCP-specific and generic event names', async () => {
  const { manager, session, callbacks } = managerHarness();
  manager.registerLuaAutomation(session.id, { id: 20, kind: 'event', pattern: 'VARIABLE UPDATE target' });
  manager.registerLuaAutomation(session.id, { id: 21, kind: 'event', pattern: 'gmcp.Char.Vitals' });
  manager.registerLuaAutomation(session.id, { id: 22, kind: 'event', pattern: 'gmcp' });
  manager.fireTinTinEvent(manager.sessions.get(session.id), 'VARIABLE UPDATE target', ['old', 'new']);
  manager.sessions.get(session.id).connection.handlers.onGmcp?.({ packageName: 'Char.Vitals', body: { hp: 99 }, state: {} });
  await tick();
  const byId = new Map(callbacks.map((entry) => [entry.callbackId, entry]));
  assert.deepEqual(byId.get(20).context.args, ['VARIABLE UPDATE target', 'old', 'new']);
  assert.deepEqual(byId.get(21).context.args, ['gmcp.Char.Vitals']);
  assert.deepEqual(byId.get(22).context.args, ['gmcp', 'gmcp.Char.Vitals']);
});

test('raiseLuaEvent passes bounded event arguments through the same transient EventEngine', async () => {
  const { manager, session, callbacks } = managerHarness();
  manager.registerLuaAutomation(session.id, { id: 30, kind: 'event', pattern: 'my.package.event' });
  const raised = manager.raiseLuaEvent(session.id, 'my.package.event', JSON.stringify(['alpha', 2, true]));
  assert.equal(raised.fired, 1);
  await tick();
  assert.deepEqual(callbacks[0].context.args, ['my.package.event', 'alpha', 2, true]);
});

test('expireAfter honors a true first Lua return value as Mudlet-style do-not-count', async () => {
  let invocations = 0;
  const { manager, session } = managerHarness({ onLuaCallback: () => {
    invocations += 1;
    return Promise.resolve({ ok: true, values: [invocations === 1], echoes: [], sends: [], variableSets: [], tableSets: [], gmcpSends: [], executions: [], automations: [] });
  }});
  manager.registerLuaAutomation(session.id, { id: 40, kind: 'exact-trigger', pattern: 'tick', expireAfter: 1 });
  const conn = manager.sessions.get(session.id).connection;
  conn.handlers.onText('tick\n');
  await tick();
  assert.ok(manager.sessions.get(session.id).luaAutomations.has(40), 'true callback return must preserve expireAfter count');
  conn.handlers.onText('tick\n');
  await tick();
  assert.equal(manager.sessions.get(session.id).luaAutomations.has(40), false, 'next counted match must expire the trigger');
  assert.equal(invocations, 2);
});

test('one-shot anonymous event handler retires after its first callback', async () => {
  const { manager, session, callbacks, forgotten } = managerHarness();
  manager.registerLuaAutomation(session.id, { id: 41, kind: 'event', pattern: 'once', oneShot: true });
  assert.equal(manager.raiseLuaEvent(session.id, 'once', '[]').fired, 1);
  assert.equal(manager.raiseLuaEvent(session.id, 'once', '[]').fired, 0, 'one-shot handler disables immediately before async callback completes');
  await tick();
  assert.equal(callbacks.length, 1);
  assert.equal(manager.sessions.get(session.id).luaAutomations.has(41), false);
  assert.deepEqual(forgotten, [41]);
});

test('temporary timers use bounded timer host, re-arm only after repeating callback completion, and support disable/enable/kill', async () => {
  let resolveCallback;
  const { manager, session, timers } = managerHarness({ onLuaCallback: () => new Promise((resolve) => { resolveCallback = resolve; }) });
  assert.equal(manager.registerLuaAutomation(session.id, { id: 50, kind: 'timer', seconds: 0.1, repeating: true }).registered, true);
  assert.equal(timers.length, 1);
  timers[0].fn();
  assert.equal(timers.length, 1, 'repeating timer must not re-arm while Lua callback is still pending');
  resolveCallback({ ok: true, values: [], echoes: [], sends: [], variableSets: [], tableSets: [], gmcpSends: [], executions: [], automations: [] });
  await tick();
  assert.equal(timers.length, 2, 'repeating timer re-arms after callback completion');
  assert.equal(manager.controlLuaAutomation(session.id, { id: 50, kind: 'timer', action: 'disable' }).changed, true);
  assert.equal(timers[1].cleared, true);
  assert.equal(manager.controlLuaAutomation(session.id, { id: 50, kind: 'timer', action: 'enable' }).changed, true);
  assert.equal(timers.length, 3);
  assert.equal(manager.controlLuaAutomation(session.id, { id: 50, kind: 'timer', action: 'kill' }).changed, true);
  assert.equal(timers[2].cleared, true);
  assert.equal(manager.sessions.get(session.id).luaAutomations.has(50), false);
});

test('Lua callback rate limiter bounds callback dispatch per session', () => {
  const { manager, session, callbacks } = managerHarness({ maxLuaCallbacksPerSecond: 8 });
  manager.registerLuaAutomation(session.id, { id: 60, kind: 'event', pattern: 'spam' });
  let fired = 0;
  for (let index = 0; index < 20; index += 1) fired += manager.raiseLuaEvent(session.id, 'spam', '[]').fired;
  assert.equal(fired, 8);
  assert.equal(callbacks.length, 8);
});

test('removing a session clears its Lua transient engine objects and timer records', () => {
  const { manager, session, timers } = managerHarness();
  const other = manager.createSession({ id: 'other', name: 'Other' });
  manager.registerLuaAutomation(session.id, { id: 70, kind: 'alias', pattern: '^x$' });
  manager.registerLuaAutomation(session.id, { id: 71, kind: 'regex-trigger', pattern: '^y$' });
  manager.registerLuaAutomation(session.id, { id: 72, kind: 'event', pattern: 'z' });
  manager.registerLuaAutomation(session.id, { id: 73, kind: 'timer', seconds: 1 });
  const internal = manager.sessions.get(session.id);
  assert.equal(internal.luaAutomations.size, 4);
  assert.equal(manager.removeSession(session.id), true);
  assert.equal(manager.sessions.has(session.id), false);
  assert.ok(timers.some((timer) => timer.cleared));
  assert.ok(manager.sessions.has(other.id));
});

test('raiseEvent shares supported NukeFire/TinTin Events instead of creating a Lua-only event universe', async () => {
  const { manager, session, callbacks } = managerHarness();
  manager.dispatchInput(session.id, '#event {VARIABLE UPDATE target} {#variable {raised_seen} {%2}}');
  manager.registerLuaAutomation(session.id, { id: 80, kind: 'event', pattern: 'VARIABLE UPDATE target' });
  const result = manager.raiseLuaEvent(session.id, 'VARIABLE UPDATE target', JSON.stringify(['old', 'new']));
  assert.equal(result.fired, 2, 'one Lua handler and one TinTin Event should both fire');
  await tick();
  const internal = manager.sessions.get(session.id);
  const value = manager.withTinTinSession(internal, () => manager.variableEngine.get('raised_seen')?.value || '');
  assert.equal(value, 'new');
  assert.equal(callbacks.some((entry) => entry.callbackId === 80), true);
});

test('Lua help and docs explain the Mudlet-familiar callback surface and shared-engine model', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { clientCommandHelp } = require('../src/client-command-help');
  const help = clientCommandHelp('lua').join('\n');
  assert.match(help, /tempAlias.*tempTrigger.*tempRegexTrigger/u);
  assert.match(help, /line, command, and matches/u);
  assert.match(help, /gmcp\.Package\.Name/u);
  const docs = fs.readFileSync(path.join(__dirname, '..', 'docs', 'CLIENT-COMMANDS.md'), 'utf8');
  assert.match(docs, /Mudlet-familiar temporary automation/u);
  assert.match(docs, /matches\[1\].*complete regular-expression match/u);
  assert.match(docs, /existing Alias, Action, and Event engines/u);
});

test('renderer surfaces host-side Lua automation registration failures instead of silently leaving inert IDs', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(renderer, /payload\?\.automations/u);
  assert.match(renderer, /\[Lua automation\]/u);
});
