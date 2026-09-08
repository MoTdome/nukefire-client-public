'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionManager } = require('../src/session-manager');
const { VariableEngine } = require('../src/variable-engine');

function inertManager() {
  let nextTimer = 0;
  return new SessionManager({
    queueOptions: { intervalMs: 0 },
    delaySetTimer: () => ({ id: ++nextTimer }),
    delayClearTimer: () => {},
    tickerSetTimer: () => ({ id: ++nextTimer }),
    tickerClearTimer: () => {}
  });
}

function variable(manager, name) {
  return manager.snapshot().variables.find((entry) => entry.name === name);
}

test('nested TinTin tables reconstruct virtual parent nodes for key, value, size, and index queries', () => {
  const engine = new VariableEngine();
  engine.define('gains[gator][exp]', '100');
  engine.define('gains[gator][cnt]', '2');
  engine.define('gains[rat][exp]', '50');

  assert.equal(engine.expand('*gains[]').value, '{gator}{rat}');
  assert.equal(engine.expand('*gains[+1]').value, 'gator');
  assert.equal(engine.expand('*gains[-1]').value, 'rat');
  assert.equal(engine.expand('$gains[gator][%*]').value, '{2}{100}');
  assert.equal(engine.expand('&gains[]').value, '2');
  assert.equal(engine.expand('&gains[gator]').value, '1');
  assert.equal(engine.expand('&gains[rat]').value, '2');
  assert.equal(engine.expand('$gains[-1]').value, '{exp}{50}');
});

test('nested selectors inside selectors resolve for veteran unbraced dollar and ampersand forms', () => {
  const engine = new VariableEngine();
  engine.define('room', 'atrium');
  engine.define('keylist[1]', '2');
  engine.define('signsinroom[atrium][1]', 'north wall');
  engine.define('signsinroom[atrium][2]', 'south wall');

  assert.equal(engine.expand('&signsInRoom[$room][]').value, '2');
  assert.equal(engine.expand('&signsInRoom[$room][$keylist[+1]]').value, '2');
  assert.equal(engine.expand('$signsInRoom[$room][$keylist[+1]]').value, 'south wall');
});

test('TinTin nested key patterns return matching values and matching-node counts', () => {
  const engine = new VariableEngine();
  engine.define('targets[alpha]', 'A');
  engine.define('targets[amber]', 'B');
  engine.define('targets[beta]', 'C');

  engine.define('codes[123]', 'digits');
  engine.define('codes[abc]', 'letters');

  assert.equal(engine.expand('$targets[A%*]').value, '{A}{B}');
  assert.equal(engine.expand('&targets[A%*]').value, '2');
  assert.equal(engine.expand('$targets[B%*]').value, '{C}');
  assert.equal(engine.expand('$codes[%d]').value, '{digits}');
  assert.equal(engine.expand('$codes[%D]').value, '{letters}');
});

test('dynamic VARIABLE, MATH, FORMAT, and UNVARIABLE destinations expand nested selectors before mutation', () => {
  const manager = inertManager();
  const session = manager.createSession({ id: 'dynamic', name: 'Dynamic' });

  manager.dispatchInput(session.id, '#var {mob} {gator}');
  manager.dispatchInput(session.id, '#var {room} {atrium}');
  manager.dispatchInput(session.id, '#var {slot} {2}');
  manager.dispatchInput(session.id, '#var {gains[$mob][exp]} {10}');
  manager.dispatchInput(session.id, '#math {gains[$mob][exp]} {$gains[$mob][exp] + 5}');
  manager.dispatchInput(session.id, '#format {labels[$mob]} {%s} {danger}');
  manager.dispatchInput(session.id, '#var {signsInRoom[$room][$slot]} {south wall}');

  assert.equal(variable(manager, 'gains[gator][exp]')?.value, '15');
  assert.equal(variable(manager, 'labels[gator]')?.value, 'danger');
  assert.equal(variable(manager, 'signsinroom[atrium][2]')?.value, 'south wall');

  assert.match(manager.dispatchInput(session.id, '#unvar {signsInRoom[$room][$slot]}').messages[0], /Deleted variable signsinroom\[atrium\]\[2\]/u);
  assert.equal(variable(manager, 'signsinroom[atrium][2]'), undefined);
});

test('mo-style nested gains can be iterated through the virtual parent key list', () => {
  const manager = inertManager();
  const session = manager.createSession({ id: 'gains', name: 'Gains' });

  manager.dispatchInput(session.id, '#var {mob} {gator}');
  manager.dispatchInput(session.id, '#math {gains[$mob][exp]} {100}');
  manager.dispatchInput(session.id, '#math {gains[$mob][cnt]} {2}');
  manager.dispatchInput(session.id, '#var {mob} {rat}');
  manager.dispatchInput(session.id, '#math {gains[$mob][exp]} {50}');
  manager.dispatchInput(session.id, '#math {gains[$mob][cnt]} {1}');
  manager.dispatchInput(session.id, '#foreach {*gains[]} {tempMob} {#math {seenstar[$tempMob]} {1}}');

  assert.equal(variable(manager, 'seenstar[gator]')?.value, '1');
  assert.equal(variable(manager, 'seenstar[rat]')?.value, '1');
});

test('signpost-style key lists can address and remove nested table entries by positive relative index', () => {
  const manager = inertManager();
  const session = manager.createSession({ id: 'signs', name: 'Signs' });

  manager.dispatchInput(session.id, '#var {room} {atrium}');
  manager.dispatchInput(session.id, '#var {signsInRoom[$room][1]} {first}');
  manager.dispatchInput(session.id, '#var {signsInRoom[$room][2]} {second}');
  manager.dispatchInput(session.id, '#list {keyList} {create} {*signsInRoom[$room][] }');

  assert.equal(manager.variableEngine.expand('$keyList[+1]').value, '1');
  assert.equal(manager.variableEngine.expand('&signsInRoom[$room][$keyList[+1]]').value, '1');
  manager.dispatchInput(session.id, '#unvar {signsInRoom[$room][$keyList[+1]]}');
  assert.equal(variable(manager, 'signsinroom[atrium][1]'), undefined);
  assert.equal(variable(manager, 'signsinroom[atrium][2]')?.value, 'second');
});

test('scalar assignments replace nested tables and deleting a nested parent removes its descendants', () => {
  const engine = new VariableEngine();
  engine.define('stats', 'old scalar');
  engine.define('stats[combat][hit]', '10');
  engine.define('stats[combat][miss]', '2');
  assert.equal(engine.list().some((entry) => entry.name === 'stats'), false);
  assert.equal(engine.expand('&stats[combat][]').value, '2');

  assert.equal(engine.delete('stats[combat]'), true);
  assert.equal(engine.expand('&stats[]').value, '&stats[]');
  assert.equal(engine.expand('&{stats[]}').value, '0');

  engine.define('stats[hit]', '1');
  engine.define('stats', 'reset');
  assert.deepEqual(engine.get('stats'), { name: 'stats', value: 'reset', scope: 'global' });
  assert.equal(engine.list().some((entry) => entry.name.startsWith('stats[')), false);
});
