'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildLuaGmcpSnapshot, splitGmcpCommand } = require('../src/lua-data-bridge');
const { VariableEngine } = require('../src/variable-engine');
const { SessionManager } = require('../src/session-manager');
const { LuaLabService } = require('../src/lua-lab-service');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.status = 'disconnected'; }
  async connect(host, port) { this.status = 'connected'; this.handlers.onStatus?.({ state: 'connected', host, port }); }
  disconnect(message = 'Disconnected') { this.status = 'disconnected'; this.handlers.onStatus?.({ state: 'disconnected', message }); }
  sendCommand() { return this.status === 'connected'; }
  sendGmcp() { return true; }
  setTerminalSize() { return true; }
  setClientPreferences(value) { return value || {}; }
  getGmcpState() { return null; }
}

function managerWithEvents() {
  const events = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    handlers: { onEvent: (event) => events.push(event) }
  });
  return { manager, events };
}

test('Lua GMCP snapshot mirrors canonical retained state into Mudlet-style package tables', () => {
  const state = {
    char: { vitals: { hp: 123, maxhp: 456 }, status: { name: 'Anne' }, statusVars: null, maxStats: null, gps: null, targetAffects: null },
    room: { info: { num: 3014, name: 'The Yard', exits: { n: 3015 } } },
    map: { local: { rooms: [{ vnum: 3014 }] } },
    gps: { catalog: { complete: true, count: 1, received: 1, items: [{ index: 1, room: 3014, name: 'Yard' }] } },
    context: { state: { mode: 'normal' } }, controls: { state: { reader: true } }, affects: { state: [] },
    mob: { info: { name: 'mutant' } }, foundlist: { info: { count: 2 } },
    knowledge: { results: { count: 1 }, entry: null, error: null },
    comm: { channel: { channel: 'gossip', text: 'hi' }, channels: [{ name: 'gossip' }], history: [{ secret: 'not copied' }] },
    group: { leader: 'Anne' },
    core: { Hello: { client: 'NukeFire' }, Ping: 42 },
    extras: { 'IRE.Rift.List': { items: 3 }, 'NukeFire.Combat': { damage: 999 } },
    meta: { messageCount: 77, lastPackage: 'Room.Info' }
  };
  const result = buildLuaGmcpSnapshot(state);
  assert.equal(result.snapshot.Char.Vitals.hp, 123);
  assert.equal(result.snapshot.Room.Info.name, 'The Yard');
  assert.equal(result.snapshot.NukeFire.Map.Local.rooms[0].vnum, 3014);
  assert.equal(result.snapshot.NukeFire.GPS.Catalog.items[0].room, 3014);
  assert.equal(result.snapshot.Comm.Channel.channel, 'gossip');
  assert.deepEqual(result.snapshot.Comm.Channel.List, [{ name: 'gossip' }]);
  assert.equal(result.snapshot.Core.Hello.client, 'NukeFire');
  assert.equal(result.snapshot.IRE.Rift.List.items, 3);
  assert.equal(result.snapshot.NukeFire.Combat, undefined);
  assert.equal(result.snapshot.comm, undefined);
  assert.equal(result.meta.messageCount, 77);
  assert.equal(result.meta.lastPackage, 'Room.Info');
  assert.deepEqual(JSON.parse(result.json), result.snapshot);
});

test('Lua GMCP snapshot is bounded and reports truncation instead of growing without limit', () => {
  const huge = { extras: {}, meta: { messageCount: 1, lastPackage: 'Big.Payload' } };
  huge.extras['Big.Payload'] = {
    giant: 'x'.repeat(100_000),
    rows: Array.from({ length: 2000 }, (_, index) => ({ index, text: 'y'.repeat(100) }))
  };
  const result = buildLuaGmcpSnapshot(huge, { maxBytes: 20 * 1024, maxNodes: 300, maxStringBytes: 1024 });
  assert.ok(Buffer.byteLength(result.json, 'utf8') <= 20 * 1024);
  assert.equal(result.meta.truncated, true);
  assert.ok(result.meta.dropped > 0 || result.snapshot.Big?.Payload?.giant?.length <= 1024);
});

test('sendGMCP command parser preserves one Mudlet-style package plus optional raw body and rejects injection', () => {
  assert.deepEqual(splitGmcpCommand('Core.KeepAlive'), { packageName: 'Core.KeepAlive', body: undefined, command: 'Core.KeepAlive' });
  assert.deepEqual(splitGmcpCommand('Char.Skills.Get {"group":"magic"}'), {
    packageName: 'Char.Skills.Get', body: '{"group":"magic"}', command: 'Char.Skills.Get {"group":"magic"}'
  });
  assert.equal(splitGmcpCommand('Core.KeepAlive\nnorth'), null);
  assert.equal(splitGmcpCommand('1Bad.Name {}'), null);
});

test('VariableEngine atomically replaces a nested Lua table without flattening unrelated variables', () => {
  const engine = new VariableEngine({ variables: [
    { name: 'route[1]', value: 'north' },
    { name: 'route[2]', value: 'east' },
    { name: 'other', value: 'keep' }
  ] });
  const stored = engine.replaceTableTree('route', [
    { name: 'route[1]', value: 'south' },
    { name: 'route[2][door]', value: 'red' },
    { name: 'route[2][steps]', value: '3' }
  ], 'lua');
  assert.ok(stored);
  assert.equal(engine.get('route[1]').value, 'south');
  assert.equal(engine.get('route[2][door]').value, 'red');
  assert.equal(engine.get('route[2][steps]').value, '3');
  assert.equal(engine.get('other').value, 'keep');
  assert.equal(engine.get('route').value, '{1}{south}{2}{{door}{red}{steps}{3}}');
});

test('VariableEngine rejects an invalid Lua table replacement without altering the old tree', () => {
  const engine = new VariableEngine({ maxVariables: 3, variables: [
    { name: 'route[1]', value: 'north' }, { name: 'other', value: 'keep' }
  ] });
  const before = engine.list();
  assert.equal(engine.replaceTableTree('route', [
    { name: 'route[1]', value: 'a' }, { name: 'route[2]', value: 'b' }, { name: 'route[3]', value: 'c' }
  ]), null);
  assert.deepEqual(engine.list(), before);
});

test('SessionManager Lua table replacement shares the TinTin VariableEngine and fires one root VARIABLE UPDATE', () => {
  const { manager } = managerWithEvents();
  const session = manager.createSession({ id: 'main', name: 'Main' });
  manager.dispatchInput(session.id, '#variable {route[1]} {north}');
  manager.dispatchInput(session.id, '#event {VARIABLE UPDATE route} {#variable {lua_table_event} {%2}}');
  const stored = manager.replaceLuaTable(session.id, 'route', [
    { name: 'route[1]', value: 'south' }, { name: 'route[2]', value: 'west' }
  ]);
  assert.ok(stored);
  const variables = manager.sessions.get(session.id).tintin.variableEngine;
  assert.equal(variables.get('route[1]').value, 'south');
  assert.equal(variables.get('route[2]').value, 'west');
  assert.equal(variables.get('lua_table_event').value, '{1}{south}{2}{west}');
});

class FakeRuntime {
  constructor() { this.worker = true; }
  async start() { this.worker = true; return { ok: true }; }
  async createSession(sessionId) { return { sessionId }; }
  async execute(sessionId, _script, _options, _hostContext, onEvent) {
    onEvent?.({ event: 'set-table', sessionId, name: 'route', records: [{ name: 'route[1]', value: 'north' }] });
    onEvent?.({ event: 'send-gmcp', sessionId, command: 'Core.KeepAlive' });
    return { ok: true, values: [] };
  }
  async closeSession() { return true; }
  async close() { this.worker = null; }
}

test('LuaLabService routes structured table writes and GMCP sends through supplied authoritative adapters', async () => {
  const tableSets = [];
  const gmcpSends = [];
  const service = new LuaLabService({
    runtime: new FakeRuntime(),
    setTable: (sessionId, name, records) => { const result = { sessionId, name, records }; tableSets.push(result); return result; },
    sendGmcp: (sessionId, command) => { const result = { sessionId, command, sent: true }; gmcpSends.push(result); return result; }
  });
  try {
    const result = await service.execute('alpha', 'bridge');
    assert.equal(result.ok, true);
    assert.equal(tableSets[0].name, 'route');
    assert.deepEqual(tableSets[0].records, [{ name: 'route[1]', value: 'north' }]);
    assert.equal(gmcpSends[0].command, 'Core.KeepAlive');
    assert.equal(result.tableSets.length, 1);
    assert.equal(result.gmcpSends.length, 1);
  } finally { await service.close(); }
});


test('Lua help explains shared TinTin tables and the Mudlet-familiar GMCP surface', () => {
  const { clientCommandHelp } = require('../src/client-command-help');
  const help = clientCommandHelp('lua').join('\n');
  assert.match(help, /getTable\(name\).*setTable\(name, table\)/u);
  assert.match(help, /gmcp\.Char\.Vitals/u);
  assert.match(help, /sendGMCP\("Core\.KeepAlive"\)/u);
  assert.match(help, /nf\.variables/u);
  assert.match(help, /transient combat\/sound\/loot event packets/u);
});

test('main process builds Lua GMCP context from the canonical SessionManager store and routes sendGMCP back through SessionManager', () => {
  const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  assert.match(main, /const gmcpState = sessionManager\.getGmcpState\(session\.id\)/u);
  assert.match(main, /buildLuaGmcpSnapshot\(gmcpState\)/u);
  assert.match(main, /buildMudletMsdpSnapshot\(gmcpState\)/u);
  assert.match(main, /gmcpJson: gmcp\.json/u);
  assert.match(main, /gmcpMetaJson: gmcp\.metaJson/u);
  assert.match(main, /msdpJson: msdp\.json/u);
  assert.match(main, /splitGmcpCommand\(command\)/u);
  assert.match(main, /sessionManager\.sendGmcp\(sessionId, parsed\.packageName, parsed\.body\)/u);
});

test('Lua Worker source exposes shared tables, Mudlet-style gmcp/sendGMCP, and the nf namespace without new host access', () => {
  const worker = fs.readFileSync(path.join(__dirname, '..', 'src', 'lua-runtime-worker.js'), 'utf8');
  assert.match(worker, /function getTable\(name\)/u);
  assert.match(worker, /function setTable\(name, value\)/u);
  assert.match(worker, /function sendGMCP\(command, body\)/u);
  assert.match(worker, /gmcp = jsonDecode\(__nukefireGmcpJson\) or \{\}/u);
  assert.match(worker, /nf = \{/u);
  assert.match(worker, /gmcp = gmcp/u);
  assert.match(worker, /MAX_TABLE_JSON_BYTES = 256 \* 1024/u);
});
