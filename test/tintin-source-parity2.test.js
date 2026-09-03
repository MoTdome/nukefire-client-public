'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { SessionManager } = require('../src/session-manager');
const { prepareTinTinRead } = require('../src/tintin-script-loader');
const { prepareTinTinClassWrite } = require('../src/tintin-script-writer');
const { auditTinTinSource } = require('../src/tintin-compatibility-audit');

class FakeConnection {
  constructor(handlers) {
    this.handlers = handlers;
    this.status = 'disconnected';
    this.sent = [];
  }
  async connect(host, port) {
    this.status = 'connected';
    this.handlers.onStatus?.({ state: 'connected', host, port, message: `Connected to ${host}:${port}` });
  }
  disconnect() { this.status = 'disconnected'; }
  sendCommand(command) { if (this.status !== 'connected') return false; this.sent.push(command); return true; }
  sendGmcp() { return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
}

function createManager(options = {}) {
  const events = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    handlers: { onEvent: (event) => events.push(event) },
    ...options
  });
  return { manager, events };
}

function expand(manager, sessionId, text) {
  const session = manager.sessions.get(sessionId);
  return manager.withTinTinSession(session, () => manager.variableExpansion(text));
}

test('TinTin nested table queries expose direct keys with [] and values with [%*]', () => {
  const { manager } = createManager();
  const session = manager.createSession({ name: 'Signs' });
  const id = session.id;

  manager.dispatchInput(id, '#var {curRoomSignKey} {room 42}');
  manager.dispatchInput(id, '#var {signsInRoom[room 42][north]} {North sign}');
  manager.dispatchInput(id, '#var {signsInRoom[room 42][south gate]} {South sign}');

  assert.equal(expand(manager, id, '$signsInRoom[$curRoomSignKey][]').value, '{north}{south gate}');
  assert.equal(expand(manager, id, '$signsInRoom[$curRoomSignKey][%*]').value, '{North sign}{South sign}');

  manager.dispatchInput(id, '#list {keyList} create $signsInRoom[$curRoomSignKey][]');
  assert.equal(expand(manager, id, '$keyList[+1]').value, 'north');
});

test('TinTin #FORALL iterates braced table values through &0', () => {
  const { manager } = createManager();
  const session = manager.createSession({ name: 'Signs' });
  const id = session.id;

  manager.dispatchInput(id, '#var {signsInRoom[r][a]} {First sign}');
  manager.dispatchInput(id, '#var {signsInRoom[r][b]} {Second sign}');
  const result = manager.dispatchInput(id, '#forall {$signsInRoom[r][%*]} {#list {seen} add {&0}}');
  assert.equal(result.messages.some((message) => /invalid|error|blocked/iu.test(message)), false);
  assert.equal(expand(manager, id, '$seen[1]').value, 'First sign');
  assert.equal(expand(manager, id, '$seen[2]').value, 'Second sign');
});

test('TinTin #ALL substitutes in the source session once and updates each private session', () => {
  const { manager } = createManager();
  const alpha = manager.createSession({ name: 'Alpha' });
  const beta = manager.createSession({ name: 'Beta' });

  manager.dispatchInput(alpha.id, '#var {newComm} {A message with spaces}');
  manager.dispatchInput(alpha.id, '#all {#list {commsLine} add {$newComm}}');

  assert.equal(expand(manager, alpha.id, '$commsLine[1]').value, 'A message with spaces');
  assert.equal(expand(manager, beta.id, '$commsLine[1]').value, 'A message with spaces');
});

test('Action-generated #ALL may update local lists but may not send server commands across sessions', async () => {
  const { manager } = createManager();
  const alpha = manager.createSession({ name: 'Alpha' });
  const beta = manager.createSession({ name: 'Beta' });
  await manager.connectSession(alpha.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(beta.id, { host: 'mud.test', port: 4000 });

  let result = manager.withTinTinSession(manager.sessions.get(alpha.id), () => manager.handleAllCommand(
    manager.sessions.get(alpha.id), '#list {safe} add {yes}', { actionGenerated: true }
  ));
  assert.equal(result.messages.some((message) => /blocked/iu.test(message)), false);
  assert.equal(expand(manager, beta.id, '$safe[1]').value, 'yes');

  result = manager.withTinTinSession(manager.sessions.get(alpha.id), () => manager.handleAllCommand(
    manager.sessions.get(alpha.id), 'say unsafe', { actionGenerated: true }
  ));
  assert.match(result.messages.join('\n'), /blocked/iu);
  assert.deepEqual(manager.sessions.get(alpha.id).connection.sent, []);
  assert.deepEqual(manager.sessions.get(beta.id).connection.sent, []);
});

test('TinTin PATH records inverse movement, saves routes, zips, loads, and runs privately', async () => {
  const { manager, events } = createManager();
  const main = manager.createSession({ name: 'Walker' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(main.id, '#path create');
  manager.dispatchInput(main.id, 'n');
  manager.dispatchInput(main.id, 'e');
  manager.dispatchInput(main.id, 's');
  manager.dispatchInput(main.id, '#path end');
  manager.dispatchInput(main.id, '#path save forward {forwardRoute}');
  manager.dispatchInput(main.id, '#path save backward {backRoute}');
  assert.equal(expand(manager, main.id, '$forwardRoute').value, 'n;e;s');
  assert.equal(expand(manager, main.id, '$backRoute').value, 'n;w;s');

  manager.dispatchInput(main.id, '#path zip');
  assert.match(manager.dispatchInput(main.id, '#path show').messages.join('\n'), /n;e;s/u);
  manager.dispatchInput(main.id, '#path load {$forwardRoute}');
  const before = manager.sessions.get(main.id).connection.sent.length;
  manager.dispatchInput(main.id, '#path run');
  assert.deepEqual(manager.sessions.get(main.id).connection.sent.slice(before), ['n', 'e', 's']);

  manager.dispatchInput(main.id, '#path stop');
  assert.equal(events.some((event) => event.type === 'mapper-route-stop-request'), true, 'STOP with no recording should retain native Mapper bridge');
});

test('TinTin PATH NEW preserves an in-progress recording and LOAD/UNZIP keep source semantics distinct', async () => {
  const { manager } = createManager();
  const main = manager.createSession({ name: 'Walker' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(main.id, '#path new');
  manager.dispatchInput(main.id, 'n');
  const repeated = manager.dispatchInput(main.id, '#path new');
  assert.match(repeated.messages.join('\n'), /already recording/u);
  manager.dispatchInput(main.id, '#path end');
  assert.match(manager.dispatchInput(main.id, '#path map').messages.join('\n'), /n/u);

  manager.dispatchInput(main.id, '#path load {3n}');
  assert.match(manager.dispatchInput(main.id, '#path show').messages.join('\n'), /3n/u, 'LOAD retains compact text as one path node like the source implementation');
  manager.dispatchInput(main.id, '#path unzip {3n}');
  const shown = manager.dispatchInput(main.id, '#path show').messages.join('\n');
  assert.match(shown, /n n n/u, 'UNZIP expands compact speedwalk text into path nodes');
});

test('TinTin PATHDIR custom inverse direction participates in path recording', async () => {
  const { manager } = createManager();
  const main = manager.createSession({ name: 'Walker' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(main.id, '#pathdir {portal} {returnportal} {63}');
  manager.dispatchInput(main.id, '#path new');
  manager.dispatchInput(main.id, 'portal');
  manager.dispatchInput(main.id, '#path end');
  manager.dispatchInput(main.id, '#path save backward {returnRoute}');
  assert.equal(expand(manager, main.id, '$returnRoute').value, 'returnportal');
});

test('legacy absolute READ/WRITE requests are redirected to safe Scripts-folder basenames', () => {
  const { manager, events } = createManager();
  const main = manager.createSession({ name: 'Legacy' });

  manager.dispatchInput(main.id, '#read {/home/example-old/dropbox/hashing.tin}');
  manager.dispatchInput(main.id, '#write {/home/example-old/dropbox/signpost.data}');
  const read = events.find((event) => event.type === 'script-read-request');
  const write = events.find((event) => event.type === 'script-write-request');
  assert.equal(read?.payload?.requested, 'hashing.tin');
  assert.equal(write?.payload?.requested, 'signpost.data.tin');
});

test('Class WRITE serializes only definitions in the requested class and class READ/WRITE redirect safely', () => {
  const { manager, events } = createManager();
  const main = manager.createSession({ name: 'Classes' });
  const id = main.id;

  manager.dispatchInput(id, '#alias {globalThing} {look}');
  manager.dispatchInput(id, '#class {signpostDatabase} {open}');
  manager.dispatchInput(id, '#alias {classThing} {say sign}');
  manager.dispatchInput(id, '#var {classVar} {yes}');
  manager.dispatchInput(id, '#class {signpostDatabase} {close}');

  const snapshot = manager.snapshotTinTinContext(manager.sessions.get(id).tintin);
  const written = prepareTinTinClassWrite(snapshot, 'signpostDatabase');
  assert.equal(written.ok, true);
  assert.match(written.content, /#class \{signpostdatabase\} \{open\}/u);
  assert.match(written.content, /classthing/u);
  assert.match(written.content, /classvar/u);
  assert.doesNotMatch(written.content, /globalthing/u);

  manager.dispatchInput(id, '#class {signpostDatabase} {write} {/home/example-user/signpost.data}');
  manager.dispatchInput(id, '#class {signpostDatabase} {read} {/home/example-user/signpost.data}');
  const write = events.find((event) => event.type === 'class-write-request');
  const read = events.find((event) => event.type === 'class-read-request');
  assert.equal(write?.payload?.requested, 'signpost.data.tin');
  assert.equal(read?.payload?.requested, 'signpost.data.tin');
});

test('loader preserves ALL, FORALL, PATH, PATHDIR, and Class READ/WRITE as intentional load-time commands', () => {
  const source = `
#all {#list {commsLine} add {hello}}
#forall {{one}{two}} {#showme {&0}}
#pathdir {n} {s} {1}
#path {new}
#class {signpostDatabase} {write} {/home/example-user/signpost.data}
#class {signpostDatabase} {read} {/home/example-user/signpost.data}
`;
  const prepared = prepareTinTinRead(source, {}, { filename: 'parity2.tin' });
  assert.equal(prepared.ok, true);
  assert.deepEqual(prepared.unsupported, []);
  assert.deepEqual(prepared.runtimeCommands.map((entry) => entry.directive), ['all', 'forall', 'pathdir', 'path', 'class', 'class']);
  assert.ok(prepared.runtimeCommands.every((entry) => entry.persistOnImport === true));
});

test('compatibility audit reports source-parity command families without false TODOs', () => {
  const audit = auditTinTinSource(`
#all {#showme hi}
#forall {{a}{b}} {#showme {&0}}
#path {create}
#path {zip}
#pathdir {n} {s} {1}
#class {signpostDatabase} {write} {signpost.data}
`, { filename: 'parity2.tin' });
  assert.equal(audit.ok, true);
  assert.equal(audit.entries.some((entry) => entry.classification === 'needs-implementation'), false);
});
