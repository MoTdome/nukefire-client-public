'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { LuaRuntime } = require('../src/lua-runtime');
const { LuaLabService } = require('../src/lua-lab-service');

async function makeRuntime(options = {}) {
  const echoes = [];
  const diagnostics = [];
  const sends = [];
  const variableSets = [];
  const runtime = new LuaRuntime({
    hardTimeoutMs: 900,
    onEcho: (event) => echoes.push(event),
    onDiagnostic: (event) => diagnostics.push(event),
    onSend: (event) => sends.push(event),
    onVariableSet: (event) => variableSets.push(event),
    ...options
  });
  await runtime.start();
  return { runtime, echoes, diagnostics, sends, variableSets };
}

const hostContext = {
  session: {
    id: 'alpha', name: 'Alpha', characterName: 'Anne', role: 'tank',
    host: 'tdome.nukefire.org', port: 4000, connected: true
  },
  variables: [
    { name: 'target', value: 'mutant' },
    { name: 'cool website', value: 'https://nukefire.org' },
    { name: 'session[name]', value: 'Anne' }
  ]
};

test('Beta.60a.2 starts Wasmoon in a worker and reports Lua 5.4', async () => {
  const { runtime } = await makeRuntime();
  try {
    const created = await runtime.createSession('alpha');
    assert.equal(created.luaVersion, 'Lua 5.4');
    assert.ok(created.baselineBytes > 0);
  } finally { await runtime.close(); }
});

test('echo and ordinary Lua return values remain available', async () => {
  const { runtime, echoes } = await makeRuntime();
  try {
    await runtime.createSession('alpha');
    const result = await runtime.execute('alpha', 'echo("hello", 42); return 6 * 7', {}, hostContext);
    assert.equal(result.ok, true);
    assert.deepEqual(result.values, [42]);
    assert.deepEqual(echoes.map((event) => event.args), [['hello', 42]]);
  } finally { await runtime.close(); }
});

test('Lua globals remain isolated between NukeFire sessions', async () => {
  const { runtime } = await makeRuntime();
  try {
    await runtime.createSession('alpha');
    await runtime.createSession('beta');
    assert.equal((await runtime.execute('alpha', 'marker="alpha"; return marker', {}, hostContext)).values[0], 'alpha');
    assert.equal((await runtime.execute('beta', 'return marker == nil and "clean" or marker', {}, { session: { id: 'beta' }, variables: [] })).values[0], 'clean');
  } finally { await runtime.close(); }
});

test('sandbox still denies filesystem shell package debug coroutine and host globals', async () => {
  const { runtime } = await makeRuntime();
  try {
    await runtime.createSession('alpha');
    const result = await runtime.execute('alpha', `
      local names = { os, io, debug, package, coroutine, require, dofile, loadfile, load, loadstring,
        process, Buffer, global, globalThis, window, document }
      local sealed = true
      for i = 1, 16 do if names[i] ~= nil then sealed = false end end
      return sealed and type(send) == 'function' and type(getVariable) == 'function'
        and type(setVariable) == 'function' and type(getSession) == 'function'
    `, {}, hostContext);
    assert.deepEqual(result.values, [true]);
  } finally { await runtime.close(); }
});

test('send emits exactly one bounded host request for the owning session', async () => {
  const { runtime, sends } = await makeRuntime();
  try {
    await runtime.createSession('alpha');
    const result = await runtime.execute('alpha', 'return send("look")', {}, hostContext);
    assert.deepEqual(result.values, [true]);
    assert.deepEqual(sends.map(({ sessionId, command }) => ({ sessionId, command })), [{ sessionId: 'alpha', command: 'look' }]);
  } finally { await runtime.close(); }
});

test('send rejects multiline commands instead of smuggling a command batch', async () => {
  const { runtime, sends } = await makeRuntime();
  try {
    await runtime.createSession('alpha');
    const result = await runtime.execute('alpha', 'return send("look\\nnorth")', {}, hostContext);
    assert.deepEqual(result.values, [false]);
    assert.equal(sends.length, 0);
  } finally { await runtime.close(); }
});

test('getVariable reads the current NukeFire variable snapshot including extended names', async () => {
  const { runtime } = await makeRuntime();
  try {
    await runtime.createSession('alpha');
    const result = await runtime.execute('alpha', 'return getVariable("TARGET"), getVariable("cool website"), getVariable("session[name]"), getVariable("missing")', {}, hostContext);
    assert.equal(result.ok, true, result.error?.message || 'getVariable execution failed');
    assert.deepEqual(result.values, ['mutant', 'https://nukefire.org', 'Anne', null]);
  } finally { await runtime.close(); }
});

test('setVariable normalizes once, updates same-execution reads, and emits one host request', async () => {
  const { runtime, variableSets } = await makeRuntime();
  try {
    await runtime.createSession('alpha');
    const result = await runtime.execute('alpha', 'local ok=setVariable(" Next Target ", "  dragon  "); local tableok=setVariable("route[1]", "north"); return ok, getVariable("next target"), tableok, getVariable("route[1]")', {}, hostContext);
    assert.deepEqual(result.values, [true, 'dragon', true, 'north']);
    assert.deepEqual(variableSets.map(({ sessionId, name, value }) => ({ sessionId, name, value })), [{ sessionId: 'alpha', name: 'next target', value: 'dragon' }, { sessionId: 'alpha', name: 'route[1]', value: 'north' }]);
  } finally { await runtime.close(); }
});

test('setVariable rejects dangerous or malformed variable names', async () => {
  const { runtime, variableSets } = await makeRuntime();
  try {
    await runtime.createSession('alpha');
    const result = await runtime.execute('alpha', 'return setVariable("__proto__", "x"), setVariable("bad;name", "x")', {}, hostContext);
    assert.deepEqual(result.values, [false, false]);
    assert.equal(variableSets.length, 0);
  } finally { await runtime.close(); }
});

test('getSession returns only the bounded read-only session snapshot', async () => {
  const { runtime } = await makeRuntime();
  try {
    await runtime.createSession('alpha');
    const result = await runtime.execute('alpha', 'local s=getSession(); return s.id,s.name,s.characterName,s.role,s.host,s.port,s.connected,s.connection', {}, hostContext);
    assert.deepEqual(result.values, ['alpha', 'Alpha', 'Anne', 'tank', 'tdome.nukefire.org', 4000, true, null]);
  } finally { await runtime.close(); }
});

test('ordinary Lua errors and soft timeouts are contained without losing session globals', async () => {
  const { runtime } = await makeRuntime();
  try {
    await runtime.createSession('alpha', { softTimeoutMs: 30 });
    await runtime.execute('alpha', 'marker=77', {}, hostContext);
    const failed = await runtime.execute('alpha', 'error("expected")', {}, hostContext);
    assert.equal(failed.ok, false);
    const timed = await runtime.execute('alpha', 'while true do end', { softTimeoutMs: 30, hardTimeoutMs: 900 }, hostContext);
    assert.equal(timed.error.type, 'timeout');
    assert.deepEqual((await runtime.execute('alpha', 'return marker', {}, hostContext)).values, [77]);
  } finally { await runtime.close(); }
});

test('allocator cap still rejects runaway Lua memory', async () => {
  const { runtime } = await makeRuntime();
  try {
    await runtime.createSession('memory', { memoryAllowanceBytes: 192 * 1024, softTimeoutMs: 500 });
    const result = await runtime.execute('memory', 'local t={} for i=1,100000 do t[i]=string.rep("x",1024) end return #t', { softTimeoutMs: 500, hardTimeoutMs: 1200 }, { session: { id: 'memory' }, variables: [] });
    assert.equal(result.ok, false);
    assert.equal(result.error.type, 'memory');
  } finally { await runtime.close(); }
});

test('LuaLabService bridges send and variable writes through the supplied host adapter', async () => {
  const sent = [];
  const variables = new Map([['target', 'mutant']]);
  const service = new LuaLabService({
    getHostContext: (sessionId) => ({ session: { id: sessionId, name: 'Alpha', connected: true }, variables: [...variables].map(([name, value]) => ({ name, value })) }),
    sendCommand: (sessionId, command) => { sent.push([sessionId, command]); return { queued: true }; },
    setVariable: (_sessionId, name, value) => { variables.set(name, value); return { name, value }; }
  });
  try {
    const result = await service.execute('alpha', 'send("kill " .. getVariable("target")); setVariable("lasttarget", getVariable("target")); return getVariable("lasttarget")');
    assert.equal(result.ok, true);
    assert.deepEqual(result.values, ['mutant']);
    assert.deepEqual(sent, [['alpha', 'kill mutant']]);
    assert.equal(variables.get('lasttarget'), 'mutant');
  } finally { await service.close(); }
});

test('parent watchdog hard-kills an adversarial loop and service restarts cleanly', async () => {
  const service = new LuaLabService({ hardTimeoutMs: 350 });
  try {
    const killed = await service.execute('alpha', 'while true do pcall(function() while true do end end) end');
    assert.equal(killed.ok, false);
    assert.equal(killed.error.type, 'hard-timeout');
    const recovered = await service.execute('alpha', 'echo("fresh worker"); return 7');
    assert.equal(recovered.ok, true);
    assert.deepEqual(recovered.echoes, [['fresh worker']]);
  } finally { await service.close(); }
});

test('interactive a.2 wiring uses SessionManager for Lua send variables and session metadata', () => {
  const root = path.join(__dirname, '..');
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  assert.doesNotMatch(main, /NUKEFIRE_LUA_LAB_ROOT/u);
  assert.doesNotMatch(main, /Lua Lab is not enabled/u);
  assert.match(main, /ipcMain\.handle\('lua-lab:execute'/u);
  const worker = fs.readFileSync(path.join(root, 'src', 'lua-runtime-worker.js'), 'utf8');
  assert.match(worker, /require\('wasmoon'\)/u);
  assert.match(main, /source: 'lua'/u);
  assert.match(main, /assignVariable\(name, value\)/u);
  assert.match(main, /session\.tintin\?\.variableEngine\?\.list\(\)/u);
  assert.match(main, /characterName:/u);
  assert.match(preload, /executeLuaLab:/u);
  assert.match(renderer, /handleLocalLuaLabCommand/u);
});
