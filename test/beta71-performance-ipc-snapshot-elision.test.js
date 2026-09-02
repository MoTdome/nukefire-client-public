'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { SessionManager } = require('../src/session-manager');

function makeManager() {
  return new SessionManager({ queueOptions: { intervalMs: 0 } });
}

test('routine session-list broadcasts carry roster metadata without TinTin definition payloads', () => {
  const broadcasts = [];
  const manager = new SessionManager({
    handlers: { onSessionsChanged: (snapshot) => broadcasts.push(snapshot) },
    queueOptions: { intervalMs: 0 }
  });
  const session = manager.createSession({ id: 'main', name: 'Main' });
  manager.replaceDefinitions(session.id, {
    aliases: [{ name: 'k', body: 'kill %1', scope: 'global' }],
    variables: [{ name: 'target', value: 'mutant', scope: 'global' }]
  });

  const full = manager.snapshot();
  assert.equal(full.sessions[0].tintin.aliases[0].name, 'k');
  assert.ok(Object.hasOwn(full, 'aliases'));

  manager.updateSession(session.id, { role: 'scout' });
  const roster = broadcasts.at(-1);
  assert.equal(roster.sessions[0].role, 'scout');
  assert.equal(Object.hasOwn(roster.sessions[0], 'tintin'), false);
  assert.equal(Object.hasOwn(roster, 'aliases'), false);
  assert.equal(Object.hasOwn(roster, 'actions'), false);
});

test('ordinary server-bound commands omit the full renderer snapshot when authoritative state is unchanged', () => {
  const manager = makeManager();
  const session = manager.createSession({ id: 'main', name: 'Main' });
  const result = manager.dispatchInputForRenderer(session.id, 'look');
  assert.equal(result.snapshot, null);
  assert.equal(result.deliveries.length, 1);
  assert.equal(result.deliveries[0].command, 'look');
});

test('real TinTin mutations still return a full renderer synchronization snapshot', () => {
  const manager = makeManager();
  const session = manager.createSession({ id: 'main', name: 'Main' });

  const alias = manager.dispatchInputForRenderer(session.id, '#alias {k} {kill %1}');
  assert.ok(alias.snapshot);
  assert.equal(alias.snapshot.sessions[0].tintin.aliases[0].name, 'k');

  const eventDefinition = manager.dispatchInputForRenderer(
    session.id,
    '#event {RECEIVED INPUT} {#variable {seen} {%1}}'
  );
  assert.ok(eventDefinition.snapshot);

  const ordinaryButMutating = manager.dispatchInputForRenderer(session.id, 'score');
  assert.ok(ordinaryButMutating.snapshot);
  assert.equal(
    ordinaryButMutating.snapshot.sessions[0].tintin.variables.find((entry) => entry.name === 'seen')?.value,
    'score'
  );
});

test('IPC bridge uses snapshot-eliding dispatch and renderer preserves definitions on metadata-only rosters', () => {
  const root = path.join(__dirname, '..');
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

  assert.match(main, /sessionManager\.dispatchInputForRenderer\(/u);
  assert.match(renderer, /const hasLegacyTinTin = \[/u);
  assert.match(renderer, /if \(!hasPerSessionTinTin && hasLegacyTinTin\)/u);
  assert.doesNotMatch(
    renderer,
    /if \(!hasPerSessionTinTin\) \{\s*const legacyTarget = state\.sessions\.records\[nextActive\]/u
  );
});
