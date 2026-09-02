'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { SessionManager } = require('../src/session-manager');
const loader = require('../src/tintin-script-loader');
const writer = require('../src/tintin-script-writer');
const importer = require('../src/tintin-importer');

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
  const session = manager.createSession({ id: 'char', name: 'TinTin Char' });
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
    classes: { activeStack: [], definitions: [] }, speedwalk: { enabled: true },
    profile: { requested: '', filename: '', loaded: false }
  };
}

test('CONFIG TINTIN CHAR changes the global protected command prefix immediately', () => {
  const { manager, session } = harness();
  const changed = manager.dispatchInput(session.id, '#config {TINTIN CHAR} {~}');
  assert.match(changed.messages.join('\n'), /changed from # to ~/u);
  assert.equal(manager.commandPrefix, '~');
  assert.equal(changed.snapshot.commandPrefix, '~');

  const local = manager.dispatchInput(session.id, '~showme {new prefix}');
  assert.equal(local.deliveries.length, 0);
  assert.equal(local.handled, true);
  const old = manager.dispatchInput(session.id, '#showme {old prefix}');
  assert.equal(old.deliveries.at(-1)?.command, '#showme {old prefix}');
});

test('TINTIN CHAR changes parsing without rewriting existing alias bodies', () => {
  const { manager, session } = harness();
  manager.dispatchInput(session.id, '#alias {legacy} {#showme {stored old prefix}}');
  manager.dispatchInput(session.id, '#config {TINTIN CHAR} {~}');
  const result = manager.dispatchInput(session.id, 'legacy');
  assert.equal(result.deliveries.at(-1)?.command, '#showme {stored old prefix}');
});

test('historical same-character TINTIN CHAR config loads cleanly without a compatibility no-op', () => {
  const result = loader.prepareTinTinRead([
    '#CONFIG {TINTIN CHAR} {#}',
    '#ALIAS {l} {look}'
  ].join('\n'), emptyDefinitions(), { commandPrefix: '#' });
  assert.equal(result.ok, true);
  assert.equal(result.compatibilityNoops.some((entry) => /tintin-char/u.test(entry.directive)), false);
  assert.equal(result.runtimeCommands.length, 0);
  assert.equal(result.definitions.aliases[0].name, 'l');
});

test('safe TINTIN CHAR changes are preserved as explicit load-time commands', () => {
  const result = loader.prepareTinTinRead('#CONFIG {TINTIN CHAR} {~}', emptyDefinitions(), { commandPrefix: '#' });
  assert.equal(result.ok, true);
  assert.equal(result.runtimeCommands.length, 1);
  assert.equal(result.runtimeCommands[0].command, '#CONFIG {TINTIN CHAR} {~}');
  assert.equal(result.runtimeCommands[0].persistOnImport, true);
});

test('TinTin WRITE records the active command character using that character', () => {
  const written = writer.prepareTinTinWrite(emptyDefinitions(), { commandPrefix: '~' });
  assert.equal(written.ok, true);
  assert.match(written.content, /~config \{TINTIN CHAR\} \{~\}/u);
  const loaded = loader.prepareTinTinRead(written.content, emptyDefinitions(), { commandPrefix: '~' });
  assert.equal(loaded.ok, true);
  assert.equal(loaded.compatibilityNoops.some((entry) => /tintin-char/u.test(entry.directive)), false);
});

test('full selective import now preserves all implemented TinTin config settings', () => {
  const prepared = loader.prepareTinTinRead([
    '#config {COMMAND ECHO} {ON}',
    '#config {VERBATIM} {ON}',
    '#config {HISTORY SIZE} {777}',
    '#config {BUFFER SIZE} {4321}',
    '#config {REPEAT CHAR} {?}',
    '#config {REPEAT ENTER} {ON}',
    '#config {VERBATIM CHAR} {|}',
    '#config {LOG MODE} {RAW}',
    '#config {SPEEDWALK} {OFF}'
  ].join('\n'), emptyDefinitions());
  assert.equal(prepared.ok, true);
  const analysis = importer.buildTinTinScriptImportAnalysis(prepared);
  const selected = analysis.items.filter((item) => item.category === 'settings' && item.selected).map((item) => item.id);
  const merged = importer.mergeTinTinScriptImportSelection(analysis, emptyDefinitions(), { selectedIds: selected, duplicatePolicy: 'replace' });
  assert.deepEqual(merged.definitions.config, {
    logMode: 'raw', commandEcho: true, verbatim: true,
    repeatChar: '?', repeatEnter: true, verbatimChar: '|',
    historySize: 777, bufferSize: 4321
  });
  assert.equal(merged.definitions.speedwalk.enabled, false);
  assert.equal(merged.skippedUnsafe, 0);
});
