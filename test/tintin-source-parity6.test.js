'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { SessionManager } = require('../src/session-manager');
const { prepareTinTinRead } = require('../src/tintin-script-loader');
const { auditTinTinSource, commandCompatibilityMatrix } = require('../src/tintin-compatibility-audit');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.status = 'disconnected'; this.sent = []; }
  async connect(host, port) { this.status = 'connected'; this.handlers.onStatus?.({ state: 'connected', host, port }); }
  disconnect(message = 'Disconnected') { this.status = 'disconnected'; this.handlers.onStatus?.({ state: 'disconnected', message }); }
  sendCommand(command) { if (this.status !== 'connected') return false; this.sent.push(command); return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
}

function harness(options = {}) {
  const delays = [];
  const local = [];
  const manager = new SessionManager({
    connectionFactory: options.connectionFactory || ((handlers) => new FakeConnection(handlers)),
    queueOptions: { intervalMs: 0 },
    delaySetTimer: (fn, ms) => { const timer = { fn, ms }; delays.push(timer); return timer; },
    delayClearTimer: () => {},
    tickerSetTimer: () => ({ ticker: true }),
    tickerClearTimer: () => {},
    handlers: {
      onEvent: (event) => { if (event.type === 'local-text') local.push(String(event.payload || '')); },
      onSessionsChanged: () => {},
      ...(options.handlers || {})
    }
  });
  return { manager, delays, local };
}

function internal(manager, session) { return manager.sessions.get(session.id || session); }
function value(manager, session, name) {
  const target = internal(manager, session);
  return manager.withTinTinSession(target, () => manager.variableEngine.get(name)?.value ?? '');
}

test('Event arguments adapt between authentic %0 TinTin numbering and veteran %1-first compatibility', async () => {
  const { manager } = harness();
  const s = manager.createSession({ name: 'Args', host: 'mud.example', port: 4000 });
  manager.dispatchInput(s.id, '#event {SESSION CONNECTED} {#var {sourceargs} {%0|%1|%3}}');
  await manager.connectSession(s.id, { host: 'mud.example', port: 4000 });
  assert.equal(value(manager, s, 'sourceargs'), 'Args|mud.example|4000');

  manager.dispatchInput(s.id, '#event {SCREEN RESIZE} {#var {veteranargs} {%1x%2}}');
  manager.setTerminalSize(s.id, 132, 48);
  assert.equal(value(manager, s, 'veteranargs'), '132x48');
});

test('nested LIST mutations fire VARIABLE UPDATE on the owning table', () => {
  const { manager } = harness();
  const s = manager.createSession({ name: 'Tables' });
  manager.dispatchInput(s.id, '#var {tablehits} {0}');
  manager.dispatchInput(s.id, '#event {VARIABLE UPDATE queue} {#math {tablehits} {$tablehits + 1};#var {tableevent} {%2}}');
  manager.dispatchInput(s.id, '#list {queue} create {heal}{priority}');
  assert.equal(value(manager, s, 'tableevent[1]'), 'heal');
  assert.equal(value(manager, s, 'tablehits'), '1');
  manager.dispatchInput(s.id, '#list {queue} add {move}');
  assert.equal(value(manager, s, 'tableevent[3]'), 'move');
  assert.equal(value(manager, s, 'tablehits'), '2');
  manager.dispatchInput(s.id, '#list {queue} set {-1} {movement}');
  assert.equal(value(manager, s, 'tableevent[3]'), 'movement');
  assert.equal(value(manager, s, 'tablehits'), '3');
  manager.dispatchInput(s.id, '#list {queue} clear');
  assert.equal(value(manager, s, 'tablehits'), '4');
});

test('delayed PATH RUN fires END OF PATH only after its final delayed command', () => {
  const { manager, delays } = harness();
  const s = manager.createSession({ name: 'Path' });
  internal(manager, s).connection.status = 'connected';
  manager.dispatchInput(s.id, '#event {END OF PATH} {#var {pathdone} {yes}}');
  manager.dispatchInput(s.id, '#path load {north;south}');
  manager.dispatchInput(s.id, '#path run {1}');
  assert.equal(value(manager, s, 'pathdone'), '');
  assert.equal(delays.length, 1);
  assert.equal(delays[0].ms, 1000);
  delays[0].fn();
  assert.equal(value(manager, s, 'pathdone'), 'yes');
});

test('Room.Info drives TinTin MAP ENTER/EXIT events while the native Mapper stays authoritative', () => {
  const { manager } = harness();
  const s = manager.createSession({ name: 'Map' });
  const conn = internal(manager, s).connection;
  manager.dispatchInput(s.id, '#event {MAP ENTER MAP} {#var {mapentered} {%0}}');
  manager.dispatchInput(s.id, '#event {MAP ENTER ROOM} {#var {maproom} {%0:%1}}');
  manager.dispatchInput(s.id, '#event {MAP EXIT ROOM} {#var {mapexit} {%0:%1}}');
  manager.dispatchInput(s.id, '#event {MAP ENTER ROOM 302} {#var {qualified} {%0}}');
  manager.dispatchInput(s.id, '#event {MAP EXIT MAP} {#var {mapleft} {%0}}');

  conn.handlers.onGmcp({ packageName: 'Room.Info', body: { num: 301, name: 'One' } });
  assert.equal(value(manager, s, 'mapentered'), '301');
  assert.equal(value(manager, s, 'maproom'), '301:0');

  conn.handlers.onGmcp({ packageName: 'Room.Info', body: { num: 302, name: 'Two' } });
  assert.equal(value(manager, s, 'mapexit'), '301:302');
  assert.equal(value(manager, s, 'maproom'), '302:301');
  assert.equal(value(manager, s, 'qualified'), '302');

  conn.status = 'connected';
  internal(manager, s).status = { state: 'connected', message: 'Connected', host: '', port: 0 };
  conn.disconnect('bye');
  assert.equal(value(manager, s, 'mapleft'), '302');
});

test('SESSION TIMED OUT exposes source-style zero-based connection fields', async () => {
  class TimeoutConnection extends FakeConnection {
    async connect() { throw new Error('The connection timed out.'); }
  }
  const { manager } = harness({ connectionFactory: (handlers) => new TimeoutConnection(handlers) });
  const s = manager.createSession({ name: 'Timeout', host: 'slow.example', port: 7777 });
  manager.dispatchInput(s.id, '#event {SESSION TIMED OUT} {#var {timeoutargs} {%0|%1|%3}}');
  await assert.rejects(() => manager.connectSession(s.id, { host: 'slow.example', port: 7777 }), /timed out/iu);
  assert.equal(value(manager, s, 'timeoutargs'), 'Timeout|slow.example|7777');
});

test('loader and audit accept source MAP events alongside VARIABLE UPDATE and END OF PATH', () => {
  const source = `
#event {MAP ENTER MAP} {#showme {%0}}
#event {MAP ENTER ROOM} {#showme {%0:%1}}
#event {MAP ENTER ROOM 302} {#showme {%0}}
#event {MAP EXIT ROOM} {#showme {%0:%1}}
#event {MAP EXIT MAP} {#showme {%0}}
#event {VARIABLE UPDATE queue} {#showme {%2}}
#event {END OF PATH} {#showme done}
`;
  const prepared = prepareTinTinRead(source, {}, { filename: 'parity6.tin' });
  assert.equal(prepared.ok, true);
  assert.deepEqual(prepared.unsupported, []);
  assert.equal(prepared.counts.events, 7);
  const audit = auditTinTinSource(source, { filename: 'parity6.tin' });
  assert.equal(audit.ok, true);
  assert.deepEqual(audit.entries.filter((entry) => entry.classification === 'needs-implementation'), []);
});

test('remaining harmless commands from the uploaded TinTin command table are translated or explicit no-ops', () => {
  const { manager } = harness();
  const s = manager.createSession({ name: 'ShellParity' });
  manager.dispatchInput(s.id, '#pathdir {portal} {returnportal} {0}');
  assert.match(manager.dispatchInput(s.id, '#dirs').messages.join('\n'), /portal.*returnportal/iu);
  assert.match(manager.dispatchInput(s.id, '#unpathdir {portal}').messages.join('\n'), /removed 1 direction/iu);
  assert.doesNotMatch(manager.dispatchInput(s.id, '#dirs').messages.join('\n'), /portal.*returnportal/iu);
  assert.match(manager.dispatchInput(s.id, '#advertise').messages.join('\n'), /ignored/iu);
  assert.match(manager.dispatchInput(s.id, '#test').messages.join('\n'), /ignored/iu);
  assert.match(manager.dispatchInput(s.id, '#unprompt {foo}').messages.join('\n'), /ignored/iu);
  assert.match(manager.dispatchInput(s.id, '#untab {foo}').messages.join('\n'), /No Tabs matched foo/iu);

  const source = `
#pathdir {portal} {returnportal} {0}
#unpathdir {portal}
#advertise
#test
#unprompt {foo}
#untab {foo}
`;
  const prepared = prepareTinTinRead(source, {}, { filename: 'safe-shell.tin' });
  assert.equal(prepared.ok, true);
  assert.deepEqual(prepared.unsupported, []);
  const audit = auditTinTinSource(source, { filename: 'safe-shell.tin' });
  assert.deepEqual(audit.entries.filter((entry) => entry.classification === 'needs-implementation'), []);
});


test('all 88 commands in the uploaded TinTin source command table have an explicit compatibility policy', () => {
  const sourceCommands = [
    'action','advertise','alias','all','bell','break','buffer','case','chat','class','commands','config','continue','cr','cursor','debug','default','delay','dirs','echo','else','elseif','end','event','forall','foreach','format','function','gag','grep','help','highlight','history','if','ignore','info','killall','line','list','log','loop','macro','map','math','message','nop','parse','path','pathdir','prompt','read','regexp','replace','return','run','scan','script','send','session','showme','snoop','split','substitute','switch','system','tab','test','textin','ticker','unaction','unalias','undelay','unevent','unfunction','ungag','unhighlight','unmacro','unpathdir','unprompt','unsplit','unsubstitute','untab','unticker','unvariable','variable','while','write','zap'
  ];
  assert.equal(sourceCommands.length, 88);
  const matrix = commandCompatibilityMatrix(sourceCommands);
  assert.equal(matrix.entries.length, 88);
  assert.deepEqual(matrix.entries.filter((entry) => entry.classification === 'needs-implementation'), []);
  assert.ok((matrix.summary.native || 0) > 0);
  assert.ok((matrix.summary.translated || 0) > 0);
  assert.ok((matrix.summary['compatibility-noop'] || 0) > 0);
  assert.ok((matrix.summary['blocked-for-safety'] || 0) > 0);
});
