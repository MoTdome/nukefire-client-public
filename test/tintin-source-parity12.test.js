'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { SessionManager } = require('../src/session-manager');
const { normalizeSessionTinTin } = require('../src/settings-store');
const loader = require('../src/tintin-script-loader');
const writer = require('../src/tintin-script-writer');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.status = 'disconnected'; this.sent = []; }
  sendCommand(command) { this.sent.push(command); return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
  disconnect() { this.status = 'disconnected'; }
}

function harness() {
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    handlers: { onEvent: () => {}, onSessionsChanged: () => {} }
  });
  const session = manager.createSession({ id: 'verb', name: 'Verbatim' });
  return { manager, session };
}

function emptyDefinitions() {
  return {
    aliases: [], variables: [], functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    events: { enabled: true, definitions: [] },
    config: { logMode: 'plain', commandEcho: false, verbatim: false, repeatChar: '!', repeatEnter: false, verbatimChar: '\\', historySize: 2000, bufferSize: 5000 },
    classes: { activeStack: [], definitions: [] },
    speedwalk: { enabled: true }
  };
}

test('CONFIG VERBATIM sends ordinary top-level input raw without splitting or substitutions', () => {
  const { manager, session } = harness();
  manager.dispatchInput(session.id, '#variable {who} {gator}');
  assert.match(manager.dispatchInput(session.id, '#config {VERBATIM} {ON}').messages.join('\n'), /Verbatim mode enabled/u);

  const raw = manager.dispatchInput(session.id, 'say $who;look');
  assert.deepEqual(raw.deliveries.map((entry) => entry.command), ['say $who;look']);

  const clientCommand = manager.dispatchInput(session.id, '#showme {this must go to the MUD}');
  assert.equal(clientCommand.deliveries.at(-1)?.command, '#showme {this must go to the MUD}');
});

test('TinTin VERBATIM mode still evaluates aliases before raw MUD delivery', () => {
  const { manager, session } = harness();
  manager.dispatchInput(session.id, '#alias {go} {say alias-fired}');
  manager.dispatchInput(session.id, '#config {VERBATIM} {ON}');

  const result = manager.dispatchInput(session.id, 'go');
  assert.equal(result.deliveries.at(-1)?.command, 'say alias-fired');
});

test('VERBATIM mode wins before VERBATIM CHAR and therefore preserves the escape character', () => {
  const { manager, session } = harness();
  manager.dispatchInput(session.id, '#config {VERBATIM} {ON}');
  const result = manager.dispatchInput(session.id, '\\#showme raw');
  assert.equal(result.deliveries.at(-1)?.command, '\\#showme raw');
});

test('an alias can disable VERBATIM mode because alias bodies execute below top-level input', () => {
  const { manager, session } = harness();
  manager.dispatchInput(session.id, '#alias {normal} {#config {VERBATIM} {OFF}}');
  manager.dispatchInput(session.id, '#config {VERBATIM} {ON}');
  const off = manager.dispatchInput(session.id, 'normal');
  assert.match(off.messages.join('\n'), /Verbatim mode disabled/u);

  const local = manager.dispatchInput(session.id, '#showme {local again}');
  assert.equal(local.deliveries.length, 0);
  assert.equal(manager.sessions.get(session.id).tintin.config.verbatim, false);
});

test('VERBATIM config persists through settings normalization and TinTin WRITE then READ', () => {
  assert.equal(normalizeSessionTinTin({ config: { verbatim: true } }).config.verbatim, true);
  assert.equal(normalizeSessionTinTin().config.verbatim, false);

  const source = emptyDefinitions();
  source.config.verbatim = true;
  const written = writer.prepareTinTinWrite(source);
  assert.equal(written.ok, true);
  assert.match(written.content, /#config \{VERBATIM\} \{ON\}/u);
  const loaded = loader.prepareTinTinRead(written.content, emptyDefinitions());
  assert.equal(loaded.ok, true);
  assert.equal(loaded.definitions.config.verbatim, true);
});

test('legacy CONFIG VERBATIM and VERBATIM CHAR are both implemented instead of compatibility no-ops', () => {
  const result = loader.prepareTinTinRead([
    '#CONFIG {VERBATIM} {OFF}',
    '#CONFIG {VERBATIM CHAR} {\\}',
    '#ALIAS {after} {look}'
  ].join('\n'), emptyDefinitions(), { filename: 'legacy-verbatim.tin' });
  assert.equal(result.ok, true);
  assert.equal(result.definitions.config.verbatim, false);
  assert.equal(result.definitions.config.verbatimChar, '\\');
  assert.equal(result.compatibilityNoops.filter((entry) => entry.directive === 'config').length, 0);
  assert.equal(result.definitions.aliases[0].name, 'after');
});
