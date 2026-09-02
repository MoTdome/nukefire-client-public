'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionManager } = require('../src/session-manager');

function createManager() {
  const manager = new SessionManager();
  const session = manager.createSession({ id: 'main', name: 'Main' });
  return { manager, session, context: manager.sessions.get(session.id).tintin };
}

test('TinTin engine mutations expose monotonic revisions at the owning engine boundary', () => {
  const { context } = createManager();
  const checks = [
    [context.aliasEngine, () => context.aliasEngine.define('a', 'say a')],
    [context.variableEngine, () => context.variableEngine.define('v', '1')],
    [context.functionEngine, () => context.functionEngine.define('f', '#return {1}')],
    [context.actionEngine, () => context.actionEngine.define('^A$', 'say a')],
    [context.gagEngine, () => context.gagEngine.define('gag me')],
    [context.highlightEngine, () => context.highlightEngine.define('highlight me', 'bold')],
    [context.substituteEngine, () => context.substituteEngine.define('sub me', 'replacement')],
    [context.macroEngine, () => context.macroEngine.define('F1', 'say macro')],
    [context.tabEngine, () => context.tabEngine.define('completion')],
    [context.classManager, () => context.classManager.open('combat')],
    [context.eventEngine, () => context.eventEngine.define('RECEIVED LINE', 'say event')]
  ];

  for (const [engine, mutate] of checks) {
    const before = Number(engine.revision) || 0;
    const result = mutate();
    assert.ok(result !== null && result !== false, `${engine.constructor.name} mutation should succeed`);
    assert.ok(Number(engine.revision) > before, `${engine.constructor.name} revision should advance`);
  }
});

test('SessionManager reuses an immutable TinTin snapshot until authoritative state changes', () => {
  const { manager, context } = createManager();
  let aliasListCalls = 0;
  const originalAliasList = context.aliasEngine.list.bind(context.aliasEngine);
  context.aliasEngine.list = (...args) => {
    aliasListCalls += 1;
    return originalAliasList(...args);
  };
  manager._tinTinSnapshotCache.delete(context);

  const first = manager.snapshotTinTinContext(context);
  const second = manager.snapshotTinTinContext(context);
  assert.strictEqual(second, first);
  assert.equal(aliasListCalls, 1);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.aliases), true);

  context.aliasEngine.define('newalias', 'say new');
  const third = manager.snapshotTinTinContext(context);
  assert.notStrictEqual(third, first);
  assert.equal(aliasListCalls, 2);
  assert.equal(third.aliases.some((record) => record.name === 'newalias'), true);
  assert.strictEqual(manager.snapshotTinTinContext(context), third);
  assert.equal(aliasListCalls, 2);
});

test('snapshot cache invalidates for non-definition TinTin state without rebuilding when unchanged', () => {
  const { manager, context } = createManager();
  let current = manager.snapshotTinTinContext(context);

  const expectChange = (mutate, verify) => {
    mutate();
    const next = manager.snapshotTinTinContext(context);
    assert.notStrictEqual(next, current);
    verify(next);
    assert.strictEqual(manager.snapshotTinTinContext(context), next);
    current = next;
  };

  expectChange(() => { context.actionEngine.enabled = false; }, (snapshot) => assert.equal(snapshot.actions.enabled, false));
  expectChange(() => { context.config.repeatEnter = true; }, (snapshot) => assert.equal(snapshot.config.repeatEnter, true));
  expectChange(() => { context.speedwalkEnabled = false; }, (snapshot) => assert.equal(snapshot.speedwalk.enabled, false));
  expectChange(() => { context.profile = { requested: 'main', filename: 'main.tin', loaded: true }; }, (snapshot) => assert.equal(snapshot.profile.filename, 'main.tin'));

  context.classManager.open('travel');
  current = manager.snapshotTinTinContext(context);
  assert.deepEqual(current.classes.activeStack, ['travel']);
  context.classManager.stack = [];
  const closed = manager.snapshotTinTinContext(context);
  assert.notStrictEqual(closed, current);
  assert.deepEqual(closed.classes.activeStack, []);
});

test('whole SessionManager snapshots share cached session definitions until a real definition mutation', () => {
  const { manager, session } = createManager();
  manager.replaceDefinitions(session.id, {
    aliases: [{ name: 'a', body: 'say a', scope: 'global' }],
    variables: [{ name: 'v', value: '1', scope: 'global' }]
  });

  const first = manager.snapshot();
  const second = manager.snapshot();
  const firstTinTin = first.sessions.find((entry) => entry.id === session.id).tintin;
  const secondTinTin = second.sessions.find((entry) => entry.id === session.id).tintin;
  assert.strictEqual(secondTinTin, firstTinTin);

  manager.withTinTinSession(session.id, () => manager.aliasEngine.define('b', 'say b'));
  const thirdTinTin = manager.snapshot().sessions.find((entry) => entry.id === session.id).tintin;
  assert.notStrictEqual(thirdTinTin, firstTinTin);
  assert.equal(thirdTinTin.aliases.some((record) => record.name === 'b'), true);
});
