'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SessionManager } = require('../src/session-manager');
const { LuaLabService } = require('../src/lua-lab-service');

class FakeConnection {
  constructor(handlers) {
    this.handlers = handlers;
    this.sent = [];
    this.status = 'disconnected';
  }
  async connect(host, port) {
    this.status = 'connected';
    this.handlers.onStatus?.({ state: 'connected', host, port });
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
  setClientPreferences(value) { return value || {}; }
}

function makeManager(extraHandlers = {}, options = {}) {
  const events = [];
  const luaRequests = [];
  const removed = [];
  const manager = new SessionManager({
    ...options,
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    handlers: {
      onEvent: (event) => events.push(event),
      onLuaExecute: (request) => {
        luaRequests.push(request);
        return Promise.resolve({ ok: true, values: [7], echoes: [['hello']], sends: [], variableSets: [], executions: [] });
      },
      onSessionRemoved: (sessionId) => { removed.push(sessionId); return true; },
      ...extraHandlers
    }
  });
  return { manager, events, luaRequests, removed };
}

function nextTurn() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('Lua is a first-class SessionManager command instead of a renderer-only command', async () => {
  const { manager, events, luaRequests } = makeManager();
  const main = manager.createSession({ id: 'main', name: 'Main' });
  const result = manager.dispatchInput(main.id, '#lua {echo("hello"); return 7}');
  assert.equal(result.handled, true);
  assert.equal(result.deliveries.length, 0);
  await nextTurn();
  assert.equal(luaRequests.length, 1);
  assert.equal(luaRequests[0].sessionId, main.id);
  assert.equal(luaRequests[0].script, 'echo("hello"); return 7');
  assert.equal(luaRequests[0].depth, 1);
  assert.equal(luaRequests[0].source, 'command');
  const luaEvent = events.find((event) => event.type === 'lua-result');
  assert.ok(luaEvent);
  assert.equal(luaEvent.sessionId, main.id);
  assert.deepEqual(luaEvent.payload.echoes, [['hello']]);
});

test('TinTin aliases can invoke Lua through the same command core', async () => {
  const { manager, luaRequests } = makeManager();
  const main = manager.createSession({ id: 'main', name: 'Main' });
  manager.dispatchInput(main.id, '#alias {dolua} {#lua {return 11}}');
  const result = manager.dispatchInput(main.id, 'dolua');
  assert.equal(result.deliveries.length, 0);
  await nextTurn();
  assert.equal(luaRequests.length, 1);
  assert.equal(luaRequests[0].script, 'return 11');
  assert.equal(luaRequests[0].source, 'alias');
});

test('TinTin Actions can invoke Lua without pre-expanding Lua source as TinTin variables', async () => {
  const { manager, luaRequests } = makeManager();
  const main = manager.createSession({ id: 'main', name: 'Main' });
  manager.dispatchInput(main.id, '#action {^PING$} {#lua {local marker="$keep"; return marker}}');
  manager.sessions.get(main.id).connection.handlers.onText('PING\n');
  await nextTurn();
  assert.equal(luaRequests.length, 1);
  assert.equal(luaRequests[0].source, 'action');
  assert.match(luaRequests[0].script, /marker="\$keep"/u);
});

test('Lua scheduling is asynchronous and later TinTin batch commands may continue before Lua completes', async () => {
  let finishLua;
  const { manager } = makeManager({
    onLuaExecute: () => new Promise((resolve) => { finishLua = resolve; })
  });
  const main = manager.createSession({ id: 'main', name: 'Main' });
  const result = manager.dispatchInput(main.id, '#lua {return 1};#variable {after} {yes}');
  assert.equal(result.handled, true);
  assert.equal(manager.sessions.get(main.id).tintin.variableEngine.get('after')?.value, 'yes');
  assert.equal(typeof finishLua, 'function');
  finishLua({ ok: true, values: [1], echoes: [], sends: [], variableSets: [], executions: [] });
  await nextTurn();
});

test('Lua help documents the asynchronous sequencing contract', () => {
  const { clientCommandHelp } = require('../src/client-command-help');
  const help = clientCommandHelp('lua').join('\n');
  assert.match(help, /asynchronously in the Worker/u);
  assert.match(help, /same TinTin command batch may continue before Lua finishes/u);
});

test('Lua execute() command routing is bounded against Lua recursion', () => {
  let calls = 0;
  const { manager } = makeManager({
    onLuaExecute: () => { calls += 1; return Promise.resolve({ ok: true }); }
  }, { maxLuaExecutionDepth: 4 });
  const main = manager.createSession({ id: 'main', name: 'Main' });
  const blocked = manager.dispatchLuaInput(main.id, '#lua {return 1}', { luaDepth: 4 });
  assert.equal(calls, 0);
  assert.match(blocked.messages.join('\n'), /nesting may not exceed 4 levels/u);
});

test('removing a NukeFire session asks the Lua subsystem to close that session', () => {
  const { manager, removed } = makeManager();
  manager.createSession({ id: 'main', name: 'Main' });
  const second = manager.createSession({ id: 'second', name: 'Second' });
  assert.equal(manager.removeSession(second.id), true);
  assert.deepEqual(removed, [second.id]);
});

class FakeRuntime {
  constructor() {
    this.worker = true;
    this.created = [];
    this.closed = [];
    this.executions = [];
  }
  async start() { this.worker = true; return { ok: true }; }
  async createSession(sessionId) { this.created.push(sessionId); return { sessionId }; }
  async execute(sessionId, script, _options, _hostContext, onEvent) {
    this.executions.push([sessionId, script]);
    if (script === 'bridge') {
      onEvent?.({ type: 'event', event: 'send', sessionId, command: 'look', requestId: 1 });
      onEvent?.({ type: 'event', event: 'set-variable', sessionId, name: 'target', value: 'mutant', requestId: 1 });
      onEvent?.({ type: 'event', event: 'execute-command', sessionId, command: 'kk mutant', requestId: 1 });
      onEvent?.({ type: 'event', event: 'echo', sessionId, args: ['done'], requestId: 1 });
    }
    if (script.startsWith('sleep:')) {
      const delay = Number(script.slice(6)) || 1;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return { ok: true, values: [script] };
  }
  async closeSession(sessionId) { this.closed.push(sessionId); return true; }
  async close() { this.worker = null; }
}

test('LuaLabService routes request-scoped send/set/execute/echo events without swapping global callbacks', async () => {
  const runtime = new FakeRuntime();
  const sent = [];
  const sets = [];
  const executed = [];
  const service = new LuaLabService({
    runtime,
    getHostContext: (sessionId) => ({ session: { id: sessionId }, variables: [] }),
    sendCommand: (sessionId, command) => { const result = { sessionId, command, queued: true }; sent.push(result); return result; },
    setVariable: (sessionId, name, value) => { const result = { sessionId, name, value }; sets.push(result); return result; },
    executeCommand: (sessionId, command, context) => { const result = { sessionId, command, context, messages: ['expanded'] }; executed.push(result); return result; }
  });
  try {
    const result = await service.execute('alpha', 'bridge', { luaDepth: 2 });
    assert.equal(result.ok, true);
    assert.deepEqual(result.echoes, [['done']]);
    assert.deepEqual(sent.map((entry) => entry.command), ['look']);
    assert.deepEqual(sets.map((entry) => [entry.name, entry.value]), [['target', 'mutant']]);
    assert.equal(executed[0].command, 'kk mutant');
    assert.equal(executed[0].context.luaDepth, 2);
    assert.equal(result.executions[0].messages[0], 'expanded');
  } finally {
    await service.close();
  }
});

test('LuaLabService serializes one Lua VM per session without globally serializing different sessions', async () => {
  const runtime = new FakeRuntime();
  const starts = [];
  const finishes = [];
  runtime.execute = async (sessionId, script) => {
    starts.push(`${sessionId}:${script}`);
    await new Promise((resolve) => setTimeout(resolve, script === 'one' ? 20 : 2));
    finishes.push(`${sessionId}:${script}`);
    return { ok: true, values: [] };
  };
  const service = new LuaLabService({ runtime });
  try {
    await Promise.all([
      service.execute('alpha', 'one'),
      service.execute('alpha', 'two'),
      service.execute('beta', 'other')
    ]);
    assert.ok(starts.indexOf('beta:other') < starts.indexOf('alpha:two'));
    assert.ok(finishes.indexOf('alpha:one') < starts.indexOf('alpha:two'));
  } finally {
    await service.close();
  }
});

test('Lua worker snapshot cap matches the real VariableEngine capacity and exposes execute/expandAlias host calls', () => {
  const worker = fs.readFileSync(path.join(__dirname, '..', 'src', 'lua-runtime-worker.js'), 'utf8');
  assert.match(worker, /MAX_HOST_VARIABLE_RECORDS = 2048/u);
  assert.match(worker, /hostContext\.variables\.slice\(0, MAX_HOST_VARIABLE_RECORDS\)/u);
  assert.match(worker, /engine\.global\.set\('execute', hostExecute\)/u);
  assert.match(worker, /engine\.global\.set\('expandAlias', hostExecute\)/u);
  assert.match(worker, /requestId: hostState\.requestId/u);
});

test('renderer no longer owns #lua interception and consumes session lua-result events instead', () => {
  const root = path.join(__dirname, '..');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.doesNotMatch(renderer, /handleLocalLuaLabCommand/u);
  assert.doesNotMatch(renderer, /parseLocalLuaLabCommand/u);
  assert.match(renderer, /case 'lua-result': handleLuaResult/u);
  assert.match(main, /onLuaExecute:/u);
  assert.match(main, /dispatchLuaInput\(sessionId, command/u);
  assert.match(main, /onSessionRemoved:/u);
});
