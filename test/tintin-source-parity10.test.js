'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { SessionManager } = require('../src/session-manager');
const { ClassManager } = require('../src/class-manager');
const tinTinScriptLoader = require('../src/tintin-script-loader');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.status = 'disconnected'; this.sent = []; }
  async connect(host, port) { this.status = 'connected'; this.handlers.onStatus?.({ state: 'connected', host, port }); }
  disconnect(message = 'Disconnected') { this.status = 'disconnected'; this.handlers.onStatus?.({ state: 'disconnected', message }); }
  sendCommand(command) { if (this.status !== 'connected') return false; this.sent.push(command); return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
}

function harness(options = {}) {
  const events = [];
  const logs = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    delaySetTimer: () => ({ id: 1 }), delayClearTimer: () => {},
    tickerSetTimer: () => ({ id: 1 }), tickerClearTimer: () => {},
    handlers: {
      onEvent: (event) => events.push(event),
      onSessionsChanged: () => {},
      onLogAppend: async (request) => { logs.push(request); return { ok: true, filename: request.filename }; },
      ...(options.handlers || {})
    }
  });
  return { manager, events, logs };
}

function session(manager, id) { return manager.sessions.get(id); }
function variable(manager, id, name) {
  const target = session(manager, id);
  return manager.withTinTinSession(target, () => manager.variableEngine.get(name)?.value ?? '');
}

test('CLASS uses TinTin single-current-group semantics and expands class names and operations', () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'classy', name: 'Classy' });
  manager.dispatchInput(s.id, '#var {first} {alpha}');
  manager.dispatchInput(s.id, '#var {second} {beta}');
  manager.dispatchInput(s.id, '#var {openop} {open}');
  manager.dispatchInput(s.id, '#class {$first} {$openop}');
  manager.dispatchInput(s.id, '#alias {aonly} {look}');
  manager.dispatchInput(s.id, '#class {$second} {open}');
  manager.dispatchInput(s.id, '#alias {bonly} {score}');
  assert.deepEqual(manager.snapshot().classes.activeStack, ['beta']);
  assert.equal(manager.snapshot().aliases.find((r) => r.name === 'aonly')?.className, 'alpha');
  assert.equal(manager.snapshot().aliases.find((r) => r.name === 'bonly')?.className, 'beta');
  manager.dispatchInput(s.id, '#class {$second} {close}');
  assert.deepEqual(manager.snapshot().classes.activeStack, [], 'closing beta must not silently reactivate alpha');
});

test('older stacked class snapshots normalize to the one class that was actually active', () => {
  const classes = new ClassManager({ classes: {
    activeStack: ['alpha', 'beta'],
    definitions: [
      { name: 'alpha', saved: {} },
      { name: 'beta', saved: {} }
    ]
  } });
  assert.equal(classes.activeName, 'beta');
  assert.deepEqual(classes.snapshot().activeStack, ['beta']);
  classes.close('beta');
  assert.equal(classes.activeName, '');
});

test('PATH LOAD and UNZIP prefer a bare TinTin variable name before literal route text', () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'walker', name: 'Walker' });
  manager.dispatchInput(s.id, '#var {route} {n;e;s}');
  manager.dispatchInput(s.id, '#path load {route}');
  assert.match(manager.dispatchInput(s.id, '#path show').messages.join('\n'), /n e s/u);
  manager.dispatchInput(s.id, '#var {ziproute} {3n2e}');
  manager.dispatchInput(s.id, '#path unzip {ziproute}');
  assert.match(manager.dispatchInput(s.id, '#path show').messages.join('\n'), /n n n e e/u);
});

test('PATHDIR supports source query/code semantics and ZIP recognizes configured one-character directions', () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'pathdir', name: 'PathDir' });
  assert.match(manager.dispatchInput(s.id, '#pathdir {ne}').messages.join('\n'), /\{ne\} \{sw\} \{3\}/u);
  assert.match(manager.dispatchInput(s.id, '#pathdir {x} {y} {63}').messages.join('\n'), /@ 63/u);
  assert.match(manager.dispatchInput(s.id, '#pathdir {x}').messages.join('\n'), /\{x\} \{y\} \{63\}/u);
  assert.match(manager.dispatchInput(s.id, '#pathdir {bad} {back} {64}').messages.join('\n'), /0 and 63/u);
  manager.dispatchInput(s.id, '#path new');
  manager.dispatchInput(s.id, 'x'); manager.dispatchInput(s.id, 'x'); manager.dispatchInput(s.id, 'x');
  manager.dispatchInput(s.id, '#path end');
  manager.dispatchInput(s.id, '#path zip');
  assert.match(manager.dispatchInput(s.id, '#path show').messages.join('\n'), /3x/u);
  manager.dispatchInput(s.id, '#unpathdir {x}');
  assert.match(manager.dispatchInput(s.id, '#pathdir {x}').messages.join('\n'), /No PATHDIR matches/u);
});

test('PATH INSERT accepts a reverse-only node like the source implementation', () => {
  const { manager } = harness();
  const s = manager.createSession({ id: 'reverseonly', name: 'ReverseOnly' });
  const result = manager.dispatchInput(s.id, '#path insert {} {retreat}');
  assert.match(result.messages.join('\n'), /inserted/u);
  manager.dispatchInput(s.id, '#path save backward {back}');
  assert.equal(variable(manager, s.id, 'back'), 'retreat');
});

test('BUFFER FIND positive occurrences search newest-first and negative occurrences oldest-first', () => {
  const { manager, events } = harness();
  const s = manager.createSession({ id: 'buffer', name: 'Buffer' });
  const conn = session(manager, s.id).connection;
  conn.handlers.onText('danger oldest\n');
  conn.handlers.onText('middle\n');
  conn.handlers.onText('danger newest\n');
  let result = manager.dispatchInput(s.id, '#buffer find {danger}');
  assert.match(result.messages.join('\n'), /danger newest/u);
  assert.equal(events.filter((e) => e.type === 'review-find-request').at(-1)?.payload?.lineIndex, 2);
  result = manager.dispatchInput(s.id, '#buffer find {-1} {danger}');
  assert.match(result.messages.join('\n'), /danger oldest/u);
  assert.equal(events.filter((e) => e.type === 'review-find-request').at(-1)?.payload?.lineIndex, 0);
});

test('LINE LOG with only a filename arms exactly the next completed incoming line', async () => {
  const { manager, logs } = harness();
  const s = manager.createSession({ id: 'linelog', name: 'LineLog' });
  const armed = manager.dispatchInput(s.id, '#line log {varslog.txt}');
  assert.match(armed.messages.join('\n'), /armed.*next incoming line/iu);
  const conn = session(manager, s.id).connection;
  conn.handlers.onText('first captured\nsecond not captured\n');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(logs.length, 1);
  assert.equal(logs[0].filename, 'varslog.txt');
  assert.equal(logs[0].text, 'first captured\n');
});

test('BUFFER navigation and FIND events are wired to native xterm review controls', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const adapter = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'xterm-adapter.js'), 'utf8');
  assert.match(renderer, /case 'review-navigation-request': handleTinTinReviewNavigationRequest\(payload\)/u);
  assert.match(renderer, /case 'review-find-request': handleTinTinReviewFindRequest\(payload\)/u);
  assert.match(adapter, /scrollPages\(amount\)/u);
  assert.match(adapter, /scrollToTop\(\)/u);
});

test('script-loader normalizes legacy stacked class activation to TinTin single-current state', () => {
  const loader = tinTinScriptLoader;
  const result = loader.prepareTinTinRead('#nop {keep current class state}', {
    classes: {
      activeStack: ['alpha', 'beta', 'gamma'],
      definitions: [
        { name: 'alpha', saved: {} },
        { name: 'beta', saved: {} },
        { name: 'gamma', saved: {} }
      ]
    }
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.definitions.classes.activeStack, ['gamma']);

  const switched = loader.prepareTinTinRead('#class {delta} {activate};#class {delta} {deactivate}', result.definitions);
  assert.equal(switched.ok, true);
  assert.deepEqual(switched.definitions.classes.activeStack, []);
});

test('PATH SAVE/WALK and HISTORY file arguments use source-style variable expansion', () => {
  const reads = [];
  const { manager } = harness({
    handlers: {
      onTinTinTextRead: async (request) => { reads.push(request); return { ok: true, filename: request.requested, content: 'look\n' }; }
    }
  });
  const s = manager.createSession({ id: 'expanded-path', name: 'ExpandedPath' });
  session(manager, s.id).connection.status = 'connected';
  manager.dispatchInput(s.id, '#var {whichway} {backward}');
  manager.dispatchInput(s.id, '#var {savevar} {savedroute}');
  manager.dispatchInput(s.id, '#path load {n;e}');
  manager.dispatchInput(s.id, '#path save {$whichway} {$savevar}');
  assert.equal(variable(manager, s.id, 'savedroute'), 'w;s');

  manager.dispatchInput(s.id, '#path load {n;e}');
  const walked = manager.dispatchInput(s.id, '#path walk {$whichway}');
  assert.equal(walked.deliveries.at(-1)?.command, 'w');

  manager.dispatchInput(s.id, '#var {histfile} {history.txt}');
  manager.dispatchInput(s.id, '#history read {$histfile}');
  assert.equal(reads.at(-1)?.requested, 'history.txt');
});

test('CLASS READ renderer path clears active class state after source-style temporary grouping', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const start = renderer.indexOf('async function handleTinTinClassReadRequest');
  const end = renderer.indexOf('async function handleTinTinEditRequest', start);
  const body = renderer.slice(start, end);
  assert.match(body, /prepared\.definitions\.classes\.activeStack = \[\]/u);
});
