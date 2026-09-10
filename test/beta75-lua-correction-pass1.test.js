'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { SessionManager } = require('../src/session-manager');
const { LuaManagedStore } = require('../src/lua-managed-store');
const { LuaPaneRegistry } = require('../src/lua-pane-model');
const { LuaLabService } = require('../src/lua-lab-service');

const root = path.join(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

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
  const events = [];
  const timers = [];
  const cleared = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    maxLuaCallbacksPerSecond: 128,
    delaySetTimer: (fn, ms) => { const timer = { fn, ms, cleared: false }; timers.push(timer); return timer; },
    delayClearTimer: (timer) => { if (timer) timer.cleared = true; cleared.push(timer); },
    handlers: {
      onLuaCallback: options.onLuaCallback || ((request) => {
        callbacks.push(request);
        return Promise.resolve({ ok: true, values: [], echoes: [], sends: [], variableSets: [], tableSets: [], gmcpSends: [], executions: [], automations: [] });
      }),
      onLuaCallbackForgotten: () => Promise.resolve(true),
      onEvent: options.onEvent || ((event) => events.push(event)),
      onSessionsChanged: () => {}
    }
  });
  const session = manager.createSession({ id: 'main', name: 'Main' });
  return { manager, session, callbacks, events, timers, cleared, connection: manager.sessions.get(session.id).connection };
}

test('prompt carry is closed at TELNET prompt boundary so ^ sees the next actual mud line', async () => {
  const { manager, session, callbacks, connection } = managerHarness();
  const pattern = '^\\[Procs\\] (\\d+) effects?: (.*)$';
  assert.equal(manager.registerLuaAutomation(session.id, { id: 11, kind: 'regex-trigger', pattern }).registered, true);

  connection.handlers.onText('(MONSTER) >');
  connection.handlers.onPromptBoundary({ type: 'GA' });
  assert.equal(callbacks.length, 0, 'an unrelated prompt must not match the anchored trigger');
  connection.handlers.onText('[Procs] 1 effect: the chain of broken pilgrimage keys\n');
  await tick();

  assert.equal(callbacks.length, 1);
  assert.equal(callbacks[0].context.line, '[Procs] 1 effect: the chain of broken pilgrimage keys');
  assert.deepEqual(callbacks[0].context.matches, [
    '[Procs] 1 effect: the chain of broken pilgrimage keys',
    '1',
    'the chain of broken pilgrimage keys'
  ]);

  connection.handlers.onText('(MONSTER) >');
  connection.handlers.onPromptBoundary({ type: 'GA' });
  connection.handlers.onText('[Procs] 2 effects: alpha, beta\n');
  await tick();
  assert.equal(callbacks.length, 2);
  assert.deepEqual(callbacks[1].context.matches, ['[Procs] 2 effects: alpha, beta', '2', 'alpha, beta']);
});

test('TinTin Actions match a non-newline prompt exactly once at its TELNET boundary', async () => {
  const { manager, session, events, connection } = managerHarness();
  const mw1 = manager.createSession({ id: 'mw1', name: 'MW1' });
  const mw1Session = manager.sessions.get(mw1.id);
  const mw1Connection = mw1Session.connection;
  mw1Session.status = { ...mw1Session.status, state: 'connected' };
  assert.deepEqual(
    manager.dispatchInput(session.id, '#action {Ready to Remort!} {#mw1 gs **Remort is ready**}').messages,
    ['Defined action at priority 5: Ready to Remort!']
  );

  connection.handlers.onText('(MONSTER) Ready to ');
  connection.handlers.onText('Remort! >');
  assert.equal(events.some((event) => event.type === 'action-result'), false);
  assert.deepEqual(mw1Connection.sent, []);

  connection.handlers.onPromptBoundary({ type: 'GA' });
  await tick();
  const results = events.filter((event) => event.type === 'action-result');
  assert.equal(results.length, 1);
  assert.equal(results[0].payload.pattern, 'Ready to Remort!');
  assert.equal(results[0].payload.command, '#mw1 gs **Remort is ready**');
  // Existing TinTin variable escaping turns each ** pair into one literal *
  // before the routed server command is queued.
  assert.deepEqual(mw1Connection.sent, ['gs *Remort is ready*']);

  connection.handlers.onPromptBoundary({ type: 'EOR' });
  connection.handlers.onText('ordinary next line\n');
  await tick();
  assert.equal(events.filter((event) => event.type === 'action-result').length, 1);
  assert.deepEqual(mw1Connection.sent, ['gs *Remort is ready*']);
});

test('temporary Lua automation is enabled immediately and script ownership follows callback requests', async () => {
  const { manager, session, callbacks, connection } = managerHarness();
  const registered = manager.registerLuaAutomation(session.id, {
    id: 21,
    kind: 'exact-trigger',
    pattern: 'owned trigger'
  }, { source: 'saved-script', resourceOwner: 'script/procColorTest' });
  assert.equal(registered.registered, true);
  assert.equal(manager.sessions.get(session.id).luaAutomations.get(21).enabled, true);

  connection.handlers.onText('owned trigger\n');
  await tick();
  assert.equal(callbacks.length, 1);
  assert.equal(callbacks[0].resourceOwner, 'script/procColorTest');
});

test('owner sweep removes only one saved script temporary aliases/triggers/timers/events', () => {
  const { manager, session, timers } = managerHarness();
  const owner = 'script/procColorTest';
  assert.equal(manager.registerLuaAutomation(session.id, { id: 30, kind: 'alias', pattern: '^pc$' }, { resourceOwner: owner }).registered, true);
  assert.equal(manager.registerLuaAutomation(session.id, { id: 31, kind: 'regex-trigger', pattern: '^pc line$' }, { resourceOwner: owner }).registered, true);
  assert.equal(manager.registerLuaAutomation(session.id, { id: 32, kind: 'event', pattern: 'pc.event' }, { resourceOwner: owner }).registered, true);
  assert.equal(manager.registerLuaAutomation(session.id, { id: 33, kind: 'timer', seconds: 1 }, { resourceOwner: owner }).registered, true);
  assert.equal(manager.registerLuaAutomation(session.id, { id: 40, kind: 'exact-trigger', pattern: 'other' }, { resourceOwner: 'script/other' }).registered, true);

  assert.equal(timers.length, 1);
  assert.deepEqual(manager.removeLuaAutomationsByOwner(session.id, owner).sort((a, b) => a - b), [30, 31, 32, 33]);
  const remaining = manager.sessions.get(session.id).luaAutomations;
  assert.deepEqual([...remaining.keys()], [40]);
  assert.equal(timers[0].cleared, true);
});

test('Custom Panes can be swept by saved-script owner without exposing ownership in pane snapshots', () => {
  const panes = new LuaPaneRegistry();
  const spec = JSON.stringify({ title: 'Vitals', rows: [{ id: 'hp', type: 'bar', label: 'HP' }] });
  assert.equal(panes.apply('main', { action: 'create', paneId: 'proc', payloadJson: spec }, { owner: 'script/procColorTest' }).ok, true);
  assert.equal(panes.apply('main', { action: 'create', paneId: 'other', payloadJson: spec }, { owner: 'script/other' }).ok, true);
  assert.equal(Object.hasOwn(panes.snapshot('main')[0], 'owner'), false);
  assert.deepEqual(panes.clearOwner('main', 'script/procColorTest'), ['proc']);
  assert.deepEqual(panes.snapshot('main').map((pane) => pane.id), ['other']);
});

test('saved scripts preserve ordinary and block Lua comments exactly', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nukefire-beta75-comments-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new LuaManagedStore({ baseDirectory: directory });
  const lua = `-- ordinary comment\nlocal value = 41\n--[[ block comment\nwith another line ]]\nreturn value + 1\n`;
  const stored = store.setScript('main', 'comments', lua, { autoRun: false });
  assert.equal(stored.stored, true);
  assert.equal(store.getScript('main', 'comments').source, lua);
});

class FakeRuntime {
  constructor() { this.worker = {}; this.dropped = []; this.sessions = new Set(); }
  async start() { this.worker = {}; }
  async createSession(id) { this.sessions.add(id); return true; }
  async execute(sessionId, _script, _limits, _context, onEvent) {
    onEvent({ sessionId, event: 'echo', args: ['Danger'], format: 'cecho', formattedText: '\x1b[31mDanger\x1b[0m' });
    onEvent({ sessionId, event: 'echo', args: ['middle'] });
    onEvent({ sessionId, event: 'register-automation', automation: { id: 77, kind: 'exact-trigger', pattern: 'x' } });
    onEvent({ sessionId, event: 'pane-command', command: { action: 'show', paneId: 'p', payloadJson: '{}' } });
    return { ok: true, values: [] };
  }
  async invokeCallback(sessionId, _id, _context, _limits, _host, onEvent) {
    onEvent({ sessionId, event: 'register-automation', automation: { id: 78, kind: 'timer', seconds: 1 } });
    return { ok: true, values: [] };
  }
  async dropCallback(_sessionId, id) { this.dropped.push(id); return true; }
  async closeSession(id) { this.sessions.delete(id); return true; }
  async close() { this.worker = null; }
}

test('LuaLabService preserves formatted echoes and passes resource ownership through executions and callbacks', async () => {
  const runtime = new FakeRuntime();
  const automationContexts = [];
  const paneContexts = [];
  const service = new LuaLabService({
    runtime,
    getHostContext: (id) => ({ session: { id }, variables: [] }),
    registerAutomation: (_id, automation, context) => { automationContexts.push({ automation, context }); return { registered: true, id: automation.id }; },
    paneCommand: (_id, command, context) => { paneContexts.push({ command, context }); return { ok: true }; }
  });
  const execution = await service.execute('main', 'return true', { scriptName: 'procColorTest', resourceOwner: 'script/procColorTest' });
  assert.deepEqual(execution.echoes, [['Danger'], ['middle']]);
  assert.deepEqual(execution.outputEvents, [
    { kind: 'echo', args: ['Danger'], format: 'cecho', formattedText: '\x1b[31mDanger\x1b[0m' },
    { kind: 'echo', args: ['middle'] }
  ]);
  assert.equal(automationContexts[0].context.resourceOwner, 'script/procColorTest');
  assert.equal(paneContexts[0].context.resourceOwner, 'script/procColorTest');

  await service.invokeCallback('main', 77, {}, { source: 'trigger', resourceOwner: 'script/procColorTest' });
  assert.equal(automationContexts[1].context.resourceOwner, 'script/procColorTest');
  assert.equal(await service.forgetCallbacks('main', [77, 78, 77]), 2);
  assert.deepEqual(runtime.dropped, [77, 78]);
  await service.close();
});

test('Save & Run source contains two-pass script-owner cleanup without a whole-VM reset', () => {
  const main = source('main.js');
  assert.match(main, /function luaScriptResourceOwner/u);
  assert.match(main, /removeLuaAutomationsByOwner\(sessionId, owner\)/u);
  assert.match(main, /waitForSessionIdle\(sessionId\)/u);
  assert.match(main, /luaPaneRegistry\.clearOwner\(sessionId, owner\)/u);
  assert.match(main, /forgetCallbacks\(sessionId, \[\.\.\.callbackIds\]\)/u);
  assert.match(main, /execute\(sessionId, script\.source, \{ source, scriptName: name, resourceOwner \}\)/u);
  assert.doesNotMatch(main.slice(main.indexOf('async function runManagedLuaScript'), main.indexOf('function ensureLuaAutorunForSession')), /closeSession\(/u);
});

test('help documents immediate tempRegexTrigger enablement, matches indexing/ipairs, comments, and owned Save & Run', () => {
  const { clientCommandHelp } = require('../src/client-command-help');
  const lua = clientCommandHelp('lua').join('\n');
  const scripts = clientCommandHelp('luascript').join('\n');
  assert.match(lua, /Temporary triggers are enabled immediately/u);
  assert.match(lua, /matches\[1\].*matches\[2\].*matches\[3\]/u);
  assert.match(lua, /ipairs\(matches\)/u);
  assert.match(lua, /cecho\(\)\/decho\(\)\/hecho\(\).*safe local-output/u);
  assert.match(scripts, /SAVE & RUN replaces resources owned by that saved script/u);
  assert.match(scripts, /-- line comments and --\[\[ block comments \]\]/u);
});

test('renderer sends formatted Lua echo text through safe NukeFire output parsing instead of raw terminal access', () => {
  const renderer = source('renderer/renderer.js');
  const start = renderer.indexOf('function handleLuaResult');
  const end = renderer.indexOf('function parseLocalBufferCommand', start);
  const body = renderer.slice(start, end);
  assert.match(body, /payload\?\.outputEvents/u);
  assert.match(body, /payload\?\.outputEvents/u);
  assert.match(body, /formattedText/u);
  assert.match(body, /appendMudText\(text, \{ localDisplay: true \}\)/u);
  assert.match(body, /appendTextToInactiveSession\(record, text, \{ localDisplay: true, preserveLine: true \}\)/u);
  assert.doesNotMatch(body, /terminal\.write|xterm|\.innerHTML/u);
});
