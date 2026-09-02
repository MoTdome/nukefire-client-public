'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const controls = require('../src/semantic-controls');

const snapshot = {
  schema: 1,
  combo: {
    activeProfile: 'breaker',
    active: [{ id: 10, name: 'bash' }, { id: 11, name: 'kick' }],
    profiles: [
      { name: 'breaker', skills: [{ id: 10, name: 'bash' }, { id: 11, name: 'kick' }, { id: 12, name: 'tigerpunch' }] }
    ],
    actions: []
  },
  groupassist: {
    summary: 'Configuration, not a combat action.',
    targets: [{ target: 'Prime', nextIndex: 1, actions: ['bash', 'kick', 'tigerpunch'] }],
    available: [
      { id: 'BASH', label: 'Bash', command: 'bash', skillId: 132, skill: 'bash', leaderTarget: false },
      { id: 'HEAL', label: 'Heal Leader', command: "sling 'heal'", skillId: 28, skill: 'heal', leaderTarget: true }
    ],
    actions: []
  },
  path: {
    actions: [{ id: 'path-step', label: 'Advance Active Path', command: 'path step', kind: 'execute' }]
  }
};

test('normalizes semantic server controls and caps combo skills at three', () => {
  const normalized = controls.normalizeControlsSnapshot(snapshot);
  assert.equal(normalized.combo.activeProfile, 'breaker');
  assert.deepEqual(normalized.combo.profiles[0].skills.map((skill) => skill.name), ['bash', 'kick', 'tigerpunch']);
  assert.equal(normalized.groupassist.targets[0].nextIndex, 1);
  assert.deepEqual(normalized.groupassist.available[0], {
    id: 'bash', label: 'Bash', command: 'bash', skillId: 132, skill: 'bash', leaderTarget: false
  });
  assert.equal(normalized.groupassist.available[1].leaderTarget, true);
  assert.equal(normalized.path.actions[0].id, 'path-step');
});

test('resolves combo profiles without manually firing their skills', () => {
  const resolved = controls.resolveSemanticReference({ type: 'combo-profile', id: 'BREAKER' }, snapshot);
  assert.equal(resolved.available, true);
  assert.equal(resolved.command, 'combo load breaker');
  assert.equal(resolved.detail, 'bash > kick > tigerpunch');
});

test('resolves GroupAssist rotations as configuration commands', () => {
  const resolved = controls.resolveSemanticReference({ type: 'groupassist-rotation', id: 'prime' }, snapshot);
  assert.equal(resolved.available, true);
  assert.equal(resolved.command, 'groupassist Prime bash kick tigerpunch');
  assert.match(resolved.label, /GroupAssist rotation/u);
});

test('resolves server path controls and reports unavailable references safely', () => {
  assert.equal(
    controls.resolveSemanticReference({ type: 'path-action', id: 'path-step' }, snapshot).command,
    'path step'
  );
  const missing = controls.resolveSemanticReference({ type: 'combo-profile', id: 'missing' }, snapshot);
  assert.equal(missing.available, false);
  assert.equal(missing.command, '');
  assert.match(missing.reason, /not available/u);
});

test('accepts the server-requested MUSH settings Reader action', () => {
  const normalized = controls.normalizeControlRequest({
    schema: 1,
    id: 69,
    action: 'reader.load.mushsettings',
    args: {}
  });
  assert.equal(normalized.action, 'reader.load.mushsettings');
  assert.equal(normalized.id, 69);
});
