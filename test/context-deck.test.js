'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_CONTEXTS,
  normalizeContextState,
  snapshotSignature,
  buildActionCommand,
  primaryContext
} = require('../src/context-deck');

test('normalizes bounded server context data without allowing control characters or prototype keys', () => {
  const contexts = Array.from({ length: MAX_CONTEXTS + 5 }, (_, index) => ({
    id: index === 0 ? '__proto__' : `Context ${index}`,
    kind: index === 0 ? 'service' : 'zone',
    title: `Title\n${index}`,
    priority: index,
    status: [{ label: 'State', value: 'Ready\r\nNow', tone: 'good' }],
    actions: [{
      id: `Action ${index}`,
      label: `Run ${index}`,
      command: `zinfo\r\nlook`,
      arguments: [{ id: 'target', label: 'Target', required: true }]
    }]
  }));

  const snapshot = normalizeContextState({ schema: 1, room: 3218, zone: 30, contexts });
  assert.equal(snapshot.contexts.length, MAX_CONTEXTS);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot.contexts[0], '__proto__'), false);
  assert.doesNotMatch(snapshot.contexts[0].title, /[\r\n]/u);
  assert.doesNotMatch(snapshot.contexts[0].status[0].value, /[\r\n]/u);
  assert.doesNotMatch(snapshot.contexts[0].actions[0].command, /[\r\n]/u);
  assert.equal(snapshot.contexts[0].priority > snapshot.contexts.at(-1).priority, true);
});

test('builds ordinary NukeFire commands from validated server-defined actions', () => {
  const action = {
    id: 'install-ink',
    label: 'Install Ink',
    command: 'buy ink',
    arguments: [
      { id: 'ink', label: 'Ink', type: 'text', required: true },
      { id: 'tattoo', label: 'Tattoo or location', type: 'text', required: true },
      { id: 'channel', label: 'Channel', type: 'number', min: 1, max: 6 }
    ]
  };

  assert.equal(
    buildActionCommand(action, { ink: 'scarlet', tattoo: 'left arm', channel: '2' }),
    'buy ink scarlet left arm 2'
  );
  assert.throws(() => buildActionCommand(action, { tattoo: 'left arm' }), /Ink is required/u);
  assert.throws(() => buildActionCommand(action, { ink: 'scarlet', tattoo: 'left arm', channel: '99' }), /no more than 6/u);

  const selection = {
    label: 'Cut Channel',
    command: 'buy addchannel',
    arguments: [{
      id: 'shape', label: 'Shape', type: 'select', required: true,
      options: [{ value: 'round', label: 'Round' }, { value: 'star', label: 'Star' }]
    }]
  };
  assert.equal(buildActionCommand(selection, { shape: 'star' }), 'buy addchannel star');
  assert.throws(() => buildActionCommand(selection, { shape: 'fang' }), /not a valid selection/u);
});


test('preserves open numeric bounds when normalized actions are validated again', () => {
  const remortAction = {
    id: 'complete-remort',
    label: 'Complete Remort',
    command: 'buy',
    arguments: [{
      id: 'code',
      label: 'Character code',
      type: 'number',
      required: true,
      min: 1
    }]
  };

  const normalized = require('../src/context-deck').normalizeAction(remortAction);
  assert.equal(normalized.arguments[0].max, null);
  assert.equal(buildActionCommand(normalized, { code: '1893' }), 'buy 1893');

  const retrieveAction = {
    label: 'Retrieve Item',
    command: 'packrat retrieve',
    arguments: [{ id: 'slot', label: 'Retrieval slot', type: 'number', required: true, min: 1 }]
  };
  assert.equal(buildActionCommand(retrieveAction, { slot: '2000' }), 'packrat retrieve 2000');
});

test('chooses a service context ahead of the generic zone section', () => {
  const primary = primaryContext({ contexts: [
    { id: 'zone', kind: 'zone', title: 'Zone Intelligence', priority: 500 },
    { id: 'ink', kind: 'service', title: 'Chromatic Ink-Master', priority: 10 }
  ] });
  assert.equal(primary.id, 'ink');
});


test('context snapshot signature is stable for equivalent normalized payloads', () => {
  const left = {
    schema: 1, room: 3218, zone: 30,
    contexts: [{ id: 'shop', kind: 'service', title: 'Shop', priority: 10, actions: [{ id: 'list', label: 'List', command: 'list' }] }]
  };
  const right = {
    schema: '1', room: '3218', zone: '30',
    contexts: [{ id: 'shop', kind: 'service', title: ' Shop ', priority: 10, actions: [{ id: 'list', label: 'List', command: 'list' }] }]
  };
  assert.equal(snapshotSignature(left), snapshotSignature(right));
  assert.notEqual(snapshotSignature(left), snapshotSignature({ ...left, room: 3219 }));
});

test('canonical Context Deck snapshots can be reused by signature and primary selection', () => {
  const normalized = normalizeContextState({
    schema: 1,
    room: 3218,
    zone: 30,
    contexts: [
      { id: 'zone', kind: 'zone', title: 'Zone Intelligence', priority: 500 },
      { id: 'shop', kind: 'service', title: 'Shop', priority: 10 }
    ]
  });
  assert.equal(snapshotSignature(normalized, { normalized: true }), snapshotSignature(normalized));
  assert.deepEqual(primaryContext(normalized, { normalized: true }), primaryContext(normalized));
});
