'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { LuaRuntime } = require('../src/lua-runtime');

const hostContext = {
  session: { id: 'alpha', name: 'Alpha', characterName: 'Anne', role: 'tank', host: 'tdome.nukefire.org', port: 4000, connected: true, appFocused: false, epochMilliseconds: 1788834600123 },
  variables: [],
  gmcpJson: JSON.stringify({ Char: { Vitals: { hp: 1234 } } }),
  gmcpMetaJson: JSON.stringify({ truncated: false, messageCount: 1, lastPackage: 'Char.Vitals' }),
  msdpJson: JSON.stringify({ HEALTH: 1234, HEALTH_MAX: 2000, CLASS: 'Cyborg', ROOM_NAME: 'Tek Angeles', OPPONENT_LEVEL: 42 })
};

async function runtimeHarness() {
  const runtime = new LuaRuntime({ hardTimeoutMs: 900 });
  await runtime.start();
  await runtime.createSession('alpha');
  return runtime;
}

function registrations(events) { return events.filter((event) => event.event === 'register-automation').map((event) => event.automation); }
function controls(events) { return events.filter((event) => event.event === 'control-automation').map((event) => event.automation); }

test('Mudlet-familiar temp APIs register bounded host automations and return stable callback IDs', async () => {
  const runtime = await runtimeHarness();
  const events = [];
  try {
    const result = await runtime.execute('alpha', `
      local a=tempAlias('^kk\\\\s+(.+)$', function() end)
      local r=tempRegexTrigger('^Hit (.+) for (\\\\d+)$', function() end, 3)
      local s=tempTrigger('Danger', function() end, 2)
      local e=tempExactMatchTrigger('Ready.', function() end, 1)
      local t=tempTimer(0.25, function() end, true)
      local h=registerAnonymousEventHandler('gmcp.Char.Vitals', function() end, false)
      return a,r,s,e,t,h
    `, {}, hostContext, (event) => events.push(event));
    assert.equal(result.ok, true, result.error?.message || 'temp API setup failed');
    assert.equal(result.values.length, 6);
    assert.ok(result.values.every((id) => Number.isInteger(id) && id > 0));
    const regs = registrations(events);
    assert.deepEqual(regs.map((entry) => entry.kind), ['alias', 'regex-trigger', 'substring-trigger', 'exact-trigger', 'timer', 'event']);
    assert.equal(regs[1].expireAfter, 3);
    assert.equal(regs[4].seconds, 0.25);
    assert.equal(regs[4].repeating, true);
  } finally { await runtime.close(); }
});

test('bad or risky temp regexes are rejected before a callback ID or host registration escapes', async () => {
  const runtime = await runtimeHarness();
  const events = [];
  try {
    const result = await runtime.execute('alpha', `
      return tempRegexTrigger('(a+)+$', function() end), tempRegexTrigger('[broken', function() end)
    `, {}, hostContext, (event) => events.push(event));
    assert.deepEqual(result.values, [null, null]);
    assert.equal(registrations(events).length, 0);
  } finally { await runtime.close(); }
});

test('callback invocation exposes Mudlet-style line, command, numeric matches and named matches', async () => {
  const runtime = await runtimeHarness();
  const events = [];
  try {
    const setup = await runtime.execute('alpha', `
      return tempRegexTrigger('^Hit (?<target>.+) for (\\\\d+)$', function()
        return line, command, matches[1], matches[2], matches[3], matches.target
      end)
    `, {}, hostContext, (event) => events.push(event));
    const id = setup.values[0];
    const callback = await runtime.invokeCallback('alpha', id, {
      line: 'Hit mutant for 42',
      command: '',
      matches: ['Hit mutant for 42', 'mutant', '42'],
      namedMatches: { target: 'mutant' },
      args: []
    }, {}, hostContext);
    assert.equal(callback.ok, true, callback.error?.message || 'callback failed');
    assert.deepEqual(callback.values, ['Hit mutant for 42', '', 'Hit mutant for 42', 'mutant', '42', 'mutant']);
  } finally { await runtime.close(); }
});

test('anonymous event callbacks receive event name and raised arguments as ordinary Lua parameters', async () => {
  const runtime = await runtimeHarness();
  try {
    const setup = await runtime.execute('alpha', `
      return registerAnonymousEventHandler('custom.event', function(name, a, b) return name, a, b end)
    `, {}, hostContext);
    const id = setup.values[0];
    const callback = await runtime.invokeCallback('alpha', id, {
      line: '', command: '', matches: [], namedMatches: {}, args: ['custom.event', 'alpha', 2]
    }, {}, hostContext);
    assert.deepEqual(callback.values, ['custom.event', 'alpha', 2]);
  } finally { await runtime.close(); }
});

test('callback true return survives the Worker boundary for Mudlet expireAfter semantics', async () => {
  const runtime = await runtimeHarness();
  try {
    const setup = await runtime.execute('alpha', `return tempTrigger('skip', function() return true end, 1)`, {}, hostContext);
    const callback = await runtime.invokeCallback('alpha', setup.values[0], { line: 'skip', matches: ['skip'], namedMatches: {}, args: [] }, {}, hostContext);
    assert.deepEqual(callback.values, [true]);
  } finally { await runtime.close(); }
});

test('enable disable and kill APIs preserve familiar per-kind controls and retire killed callbacks locally', async () => {
  const runtime = await runtimeHarness();
  const events = [];
  try {
    const setup = await runtime.execute('alpha', `return tempTimer(1, function() return 9 end, false)`, {}, hostContext, (event) => events.push(event));
    const id = setup.values[0];
    const controlsResult = await runtime.execute('alpha', `
      local id=${id}
      return disableTimer(id), enableTimer(id), killTimer(id)
    `, {}, hostContext, (event) => events.push(event));
    assert.deepEqual(controlsResult.values, [true, true, true]);
    assert.deepEqual(controls(events).map((entry) => entry.action), ['disable', 'enable', 'kill']);
    const callback = await runtime.invokeCallback('alpha', id, { args: [] }, {}, hostContext);
    assert.deepEqual(callback.values, [null]);
  } finally { await runtime.close(); }
});

test('raiseEvent emits one bounded host event and nf exposes the callback creation surface', async () => {
  const runtime = await runtimeHarness();
  const events = [];
  try {
    const result = await runtime.execute('alpha', `
      local surface = type(nf.tempAlias)=='function' and type(nf.tempRegexTrigger)=='function'
        and type(nf.tempTimer)=='function' and type(nf.registerAnonymousEventHandler)=='function'
      local raised = raiseEvent('custom.event', 'alpha', 2, true)
      return surface, raised
    `, {}, hostContext, (event) => events.push(event));
    assert.deepEqual(result.values, [true, true]);
    const raised = events.find((event) => event.event === 'raise-event');
    assert.equal(raised.eventName, 'custom.event');
    assert.deepEqual(JSON.parse(raised.argsJson), ['alpha', 2, true]);
  } finally { await runtime.close(); }
});

test('string callbacks accept a named global function or bounded Lua code while load remains unavailable to user scripts', async () => {
  const runtime = await runtimeHarness();
  try {
    const setup = await runtime.execute('alpha', `
      function namedCallback() return 'named' end
      local a=tempTrigger('a', 'namedCallback')
      local b=tempTrigger('b', 'return "code"')
      return a,b,load==nil
    `, {}, hostContext);
    assert.equal(setup.values[2], true);
    assert.deepEqual((await runtime.invokeCallback('alpha', setup.values[0], { args: [] }, {}, hostContext)).values, ['named']);
    assert.deepEqual((await runtime.invokeCallback('alpha', setup.values[1], { args: [] }, {}, hostContext)).values, ['code']);
  } finally { await runtime.close(); }
});


test('NukeFire Mudlet package compatibility globals expose profile time focus MSDP and safe helper functions', async () => {
  const runtime = await runtimeHarness();
  const events = [];
  try {
    const result = await runtime.execute('alpha', `
      local union=table.union({a=1},{b=2})
      local contains=table.contains({'x','y'}, 'y')
      cecho('[<orange_red>NF<reset>] hello\\n')
      return getProfileName(), getEpoch(), hasFocus(), msdp.HEALTH, msdp.OPPONENT_LEVEL,
        contains, union.a, union.b
    `, {}, hostContext, (event) => events.push(event));
    assert.equal(result.ok, true, result.error?.message || 'compat globals failed');
    assert.deepEqual(result.values, ['Alpha', 1788834600.123, false, 1234, 42, true, 1, 2]);

    // Runtime results are intentionally bounded to eight return values. Verify the
    // remaining helpers in a second execution instead of weakening that safety cap.
    const helperResult = await runtime.execute('alpha', `
      local sorted=''
      for k in spairs({b=2,a=1}) do sorted=sorted..k end
      return sorted, sendMSDP('REPORT','HEALTH'), sendMSDP('XTERM_256_COLORS','1')
    `, {}, hostContext);
    assert.equal(helperResult.ok, true, helperResult.error?.message || 'compat helper globals failed');
    assert.deepEqual(helperResult.values, ['ab', true, true]);
    const echoed = events.find((event) => event.event === 'echo');
    assert.equal(echoed.args[0], '[NF] hello\n');
  } finally { await runtime.close(); }
});

test('named event handlers reuse the same callback engine and expose stop resume delete controls', async () => {
  const runtime = await runtimeHarness();
  const events = [];
  try {
    const setup = await runtime.execute('alpha', `
      local id=registerNamedEventHandler(getProfileName(), 'loadEvent', 'sysLoadEvent', function(name) return name end)
      local listed=getNamedEventHandlers(getProfileName())
      local stopped=stopNamedEventHandler(getProfileName(), 'loadEvent')
      local resumed=resumeNamedEventHandler(getProfileName(), 'loadEvent')
      return id, listed.loadEvent, stopped, resumed
    `, {}, hostContext, (event) => events.push(event));
    assert.equal(setup.ok, true, setup.error?.message || 'named handler setup failed');
    assert.equal(setup.values[1], 'sysLoadEvent');
    assert.deepEqual(setup.values.slice(2), [true, true]);
    const id = setup.values[0];
    const callback = await runtime.invokeCallback('alpha', id, { args: ['sysLoadEvent'] }, {}, hostContext);
    assert.deepEqual(callback.values, ['sysLoadEvent']);
    const removed = await runtime.execute('alpha', `return deleteNamedEventHandler(getProfileName(), 'loadEvent')`, {}, hostContext, (event) => events.push(event));
    assert.deepEqual(removed.values, [true]);
  } finally { await runtime.close(); }
});

test('raiseGlobalEvent and reconnect emit bounded host requests rather than exposing networking primitives', async () => {
  const runtime = await runtimeHarness();
  const events = [];
  try {
    const result = await runtime.execute('alpha', `return raiseGlobalEvent('crew.command','north',2), reconnect()`, {}, hostContext, (event) => events.push(event));
    assert.deepEqual(result.values, [true, true]);
    const globalEvent = events.find((event) => event.event === 'raise-global-event');
    assert.equal(globalEvent.eventName, 'crew.command');
    assert.deepEqual(JSON.parse(globalEvent.argsJson), ['north', 2]);
    assert.ok(events.some((event) => event.event === 'reconnect'));
  } finally { await runtime.close(); }
});

test('managed require storage settings and module writes stay inside the Lua sandbox', async () => {
  const runtime = await runtimeHarness();
  const events = [];
  const managedContext = {
    ...hostContext,
    storageRecords: [{ key: 'row_visibility/Cyrus', json: '{"level":true,"tnl":false}' }],
    settingRecords: [{ key: 'manage_prompt', json: 'false' }],
    moduleRecords: [{
      name: 'row_state',
      source: 'return { hydrate = function(v) return v, "hydrated" end }'
    }]
  };
  try {
    const result = await runtime.execute('alpha', `
      local row_state = require('row_state')
      local value, tag = row_state.hydrate(storage.get('row_visibility/Cyrus'))
      local moduleStored = nf.modules.set('format', 'return { label = "ok" }')
      local format = require('format')
      local storageStored = storage.set('row_visibility/Cyrus', { level = false, tnl = true })
      local traversalOk = pcall(require, '../escape')
      return value.level, value.tnl, tag, settings.get('manage_prompt', true), format.label, moduleStored, storageStored, traversalOk
    `, {}, managedContext, (event) => events.push(event));
    assert.equal(result.ok, true, result.error?.message || 'managed module execution failed');
    assert.deepEqual(result.values, [true, false, 'hydrated', false, 'ok', true, true, false]);
    assert.equal(events.some((event) => event.event === 'module-set' && event.name === 'format'), true);
    assert.equal(events.some((event) => event.event === 'storage-set' && event.key === 'row_visibility/Cyrus'), true);

    const sandbox = await runtime.execute('alpha', `
      return type(require), io == nil, os == nil, package == nil, load == nil, loadfile == nil, dofile == nil
    `, {}, managedContext);
    assert.deepEqual(sandbox.values, ['function', true, true, true, true, true, true]);
  } finally { await runtime.close(); }
});

test('Mallard-familiar gmcp world mud send and trigger wrappers reuse NukeFire host events without gagging', async () => {
  const runtime = await runtimeHarness();
  const events = [];
  const managedContext = {
    ...hostContext,
    storageRecords: [],
    settingRecords: [],
    moduleRecords: []
  };
  try {
    const setup = await runtime.execute('alpha', `
      local gmcpId = gmcp.on('char.vitals', function(pkg, data)
        return pkg, data and data.hp or -1
      end)
      local worldId = world.on('connect', function(eventName)
        return eventName
      end)
      local triggerId = mud.trigger([[^HP (\\d+)$]], function(m)
        return m.line, m.matches[2], m.gag == nil
      end)
      local sent = mud.send('score', { silent = true })
      return gmcpId, worldId, triggerId, sent
    `, {}, managedContext, (event) => events.push(event));
    assert.equal(setup.ok, true, setup.error?.message || 'Mallard compatibility setup failed');
    assert.equal(setup.values.length, 4);
    assert.ok(setup.values.slice(0, 3).every((id) => Number.isInteger(id) && id > 0));
    assert.equal(setup.values[3], true);
    assert.equal(events.some((event) => event.event === 'send' && event.command === 'score'), true);

    const regs = registrations(events);
    assert.equal(regs.some((entry) => entry.kind === 'event' && entry.pattern === 'gmcp.Char.Vitals'), true);
    assert.equal(regs.some((entry) => entry.kind === 'event' && entry.pattern === 'sysConnectionEvent'), true);
    assert.equal(regs.some((entry) => entry.kind === 'regex-trigger' && entry.pattern === '^HP (\\d+)$'), true);

    const gmcpCallback = await runtime.invokeCallback('alpha', setup.values[0], {
      args: ['gmcp.Char.Vitals']
    }, {}, {
      ...managedContext,
      gmcpJson: JSON.stringify({ Char: { Vitals: { hp: 2222 } } })
    });
    assert.equal(gmcpCallback.ok, true, gmcpCallback.error?.message || 'gmcp.on callback failed');
    assert.deepEqual(gmcpCallback.values, ['char.vitals', 2222]);

    const triggerCallback = await runtime.invokeCallback('alpha', setup.values[2], {
      line: 'HP 987',
      command: '',
      matches: ['HP 987', '987'],
      namedMatches: {},
      args: []
    }, {}, managedContext);
    assert.equal(triggerCallback.ok, true, triggerCallback.error?.message || 'mud.trigger callback failed');
    assert.deepEqual(triggerCallback.values, ['HP 987', '987', true]);
  } finally { await runtime.close(); }
});
