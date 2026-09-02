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

function managerHarness() {
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    handlers: { onEvent: () => {}, onSessionsChanged: () => {} }
  });
  const session = manager.createSession({ id: 'hist', name: 'History' });
  return { manager, session };
}

function getVariable(manager, sessionId, name) {
  const session = manager.sessions.get(sessionId);
  return manager.withTinTinSession(session, () => manager.variableEngine.get(name)?.value ?? '');
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
    config: { logMode: 'plain', commandEcho: false, autoTab: 0, verbatim: false, repeatChar: '!', repeatEnter: false, verbatimChar: '\\', historySize: 2000, bufferSize: 5000 },
    classes: { activeStack: [], definitions: [] },
    speedwalk: { enabled: true }
  };
}

test('default ! history repeat resolves newest command and prefix before RECEIVED INPUT', () => {
  const { manager, session } = managerHarness();
  manager.dispatchInput(session.id, '#event {RECEIVED INPUT} {#var {seen} {%1}}');
  manager.dispatchInput(session.id, 'look');
  manager.dispatchInput(session.id, 'score');

  const prefix = manager.dispatchInput(session.id, '!lo');
  assert.equal(prefix.deliveries.at(-1)?.command, 'look');
  assert.equal(getVariable(manager, session.id, 'seen'), 'look');

  const latest = manager.dispatchInput(session.id, '!');
  assert.equal(latest.deliveries.at(-1)?.command, 'look');
  assert.equal(getVariable(manager, session.id, 'seen'), 'look');
});

test('history prefix searches newest-to-oldest and unmatched repeat text remains literal', () => {
  const { manager, session } = managerHarness();
  manager.dispatchInput(session.id, 'kill rat');
  manager.dispatchInput(session.id, 'north');
  manager.dispatchInput(session.id, 'kill dragon');
  const newest = manager.dispatchInput(session.id, '!kil');
  assert.equal(newest.deliveries.at(-1)?.command, 'kill dragon');
  const missing = manager.dispatchInput(session.id, '!xyzzy');
  assert.equal(missing.deliveries.at(-1)?.command, '!xyzzy');
});

test('CONFIG REPEAT CHAR changes history syntax without stealing the client command prefix', () => {
  const { manager, session } = managerHarness();
  manager.dispatchInput(session.id, 'score');
  assert.match(manager.dispatchInput(session.id, '#config {REPEAT CHAR} {?}').messages.join('\n'), /Repeat character set to \?/u);
  assert.equal(manager.dispatchInput(session.id, '?sc').deliveries.at(-1)?.command, 'score');
  assert.equal(manager.dispatchInput(session.id, '!sc').deliveries.at(-1)?.command, '!sc');
  assert.match(manager.dispatchInput(session.id, '#config {REPEAT CHAR} {#}').messages.join('\n'), /Usage:/u);
});

test('CONFIG REPEAT ENTER repeats the newest history entry only when enabled', () => {
  const { manager, session } = managerHarness();
  manager.dispatchInput(session.id, '#config {REPEAT ENTER} {ON}');
  manager.dispatchInput(session.id, 'look');
  assert.equal(manager.dispatchInput(session.id, '').deliveries.at(-1)?.command, 'look');
  manager.dispatchInput(session.id, '#config {REPEAT ENTER} {OFF}');
  const blank = manager.dispatchInput(session.id, '');
  assert.equal(blank.deliveries.at(-1)?.command, '');
});

test('repeat config persists through settings normalization', () => {
  const normalized = normalizeSessionTinTin({ config: { logMode: 'raw', commandEcho: true, autoTab: 0, verbatim: false, repeatChar: '?', repeatEnter: true, verbatimChar: '~', historySize: 1234, bufferSize: 20000 } });
  assert.deepEqual(normalized.config, { logMode: 'raw', commandEcho: true, autoTab: 0, verbatim: false, repeatChar: '?', repeatEnter: true, verbatimChar: '~', historySize: 1234, bufferSize: 20000 });
  assert.deepEqual(normalizeSessionTinTin().config, { logMode: 'plain', commandEcho: false, autoTab: 0, verbatim: false, repeatChar: '!', repeatEnter: false, verbatimChar: '\\', historySize: 2000, bufferSize: 5000 });
});

test('READ and WRITE round-trip REPEAT CHAR and REPEAT ENTER', () => {
  const source = emptyDefinitions();
  source.config.repeatChar = '?';
  source.config.repeatEnter = true;
  const written = writer.prepareTinTinWrite(source);
  assert.equal(written.ok, true);
  assert.match(written.content, /#config \{REPEAT CHAR\} \{\?\}/u);
  assert.match(written.content, /#config \{REPEAT ENTER\} \{ON\}/u);
  const loaded = loader.prepareTinTinRead(written.content, emptyDefinitions());
  assert.equal(loaded.ok, true);
  assert.equal(loaded.definitions.config.repeatChar, '?');
  assert.equal(loaded.definitions.config.repeatEnter, true);
});

test('VERBATIM CHAR bypasses local commands, aliases, expansion, speedwalk, and semicolon splitting', () => {
  const { manager, session } = managerHarness();
  manager.dispatchInput(session.id, '#variable {who} {gator}');
  manager.dispatchInput(session.id, '#alias {news} {say aliased}');
  manager.dispatchInput(session.id, '#config {SPEEDWALK} {OFF}');

  const local = manager.dispatchInput(session.id, '\\#showme hidden');
  assert.equal(local.deliveries.at(-1)?.command, '#showme hidden');

  const raw = manager.dispatchInput(session.id, '\\say $who;look');
  assert.deepEqual(raw.deliveries.map((delivery) => delivery.command), ['say $who;look']);

  const alias = manager.dispatchInput(session.id, '\\news');
  assert.equal(alias.deliveries.at(-1)?.command, 'news');
});

test('VERBATIM CHAR is configurable and RECEIVED INPUT sees the prefixed input before stripping', () => {
  const { manager, session } = managerHarness();
  manager.dispatchInput(session.id, '#event {RECEIVED INPUT} {#var {seenverbatim} {%1}}');
  assert.match(manager.dispatchInput(session.id, '#config {VERBATIM CHAR} {~}').messages.join('\n'), /Verbatim character set to ~/u);

  const result = manager.dispatchInput(session.id, '~#showme raw');
  assert.equal(result.deliveries.at(-1)?.command, '#showme raw');
  assert.equal(getVariable(manager, session.id, 'seenverbatim'), '~#showme raw');

  assert.match(manager.dispatchInput(session.id, '#config {VERBATIM CHAR} {#}').messages.join('\n'), /Usage:/u);
  assert.match(manager.dispatchInput(session.id, '#config {VERBATIM CHAR} {!}').messages.join('\n'), /Usage:/u);
});

test('READ and WRITE round-trip VERBATIM CHAR with TinTin escaping', () => {
  const source = emptyDefinitions();
  source.config.verbatimChar = '~';
  const written = writer.prepareTinTinWrite(source);
  assert.equal(written.ok, true);
  assert.match(written.content, /#config \{VERBATIM CHAR\} \{~\}/u);
  const loaded = loader.prepareTinTinRead(written.content, emptyDefinitions());
  assert.equal(loaded.ok, true);
  assert.equal(loaded.definitions.config.verbatimChar, '~');

  source.config.verbatimChar = '\\';
  const defaultWritten = writer.prepareTinTinWrite(source);
  assert.match(defaultWritten.content, /#config \{VERBATIM CHAR\} \{\\\\\}/u);
  const defaultLoaded = loader.prepareTinTinRead(defaultWritten.content, emptyDefinitions());
  assert.equal(defaultLoaded.ok, true);
  assert.equal(defaultLoaded.definitions.config.verbatimChar, '\\');
});

test('CONFIG HISTORY SIZE bounds TinTin command history and zero disables retention', () => {
  const { manager, session } = managerHarness();
  assert.match(manager.dispatchInput(session.id, '#config {HISTORY SIZE} {2}').messages.join('\n'), /History size set to 2/u);
  manager.dispatchInput(session.id, 'look');
  manager.dispatchInput(session.id, 'score');
  assert.deepEqual(manager.sessions.get(session.id).tintinCommandHistory, ['look', 'score']);
  assert.equal(manager.dispatchInput(session.id, '!lo').deliveries.at(-1)?.command, 'look');

  assert.match(manager.dispatchInput(session.id, '#config {HISTORY SIZE} {0}').messages.join('\n'), /History size set to 0/u);
  assert.deepEqual(manager.sessions.get(session.id).tintinCommandHistory, []);
  manager.dispatchInput(session.id, 'north');
  assert.deepEqual(manager.sessions.get(session.id).tintinCommandHistory, []);
  assert.equal(manager.dispatchInput(session.id, '!').deliveries.at(-1)?.command, '!');
});

test('CONFIG BUFFER SIZE bounds the private TinTin review history without changing UI scrollback', () => {
  const { manager, session } = managerHarness();
  const live = manager.sessions.get(session.id);
  live.tintinOutputHistory = Array.from({ length: 105 }, (_, index) => `line-${index + 1}`);
  assert.match(manager.dispatchInput(session.id, '#config {BUFFER SIZE} {100}').messages.join('\n'), /Buffer size set to 100/u);
  assert.equal(live.tintinOutputHistory.length, 100);
  assert.equal(live.tintinOutputHistory[0], 'line-6');
  assert.match(manager.dispatchInput(session.id, '#buffer info').messages.join('\n'), /retained of 100/u);
  assert.match(manager.dispatchInput(session.id, '#config {BUFFER SIZE} {99}').messages.join('\n'), /Usage:/u);
});

test('READ and WRITE round-trip HISTORY SIZE and BUFFER SIZE', () => {
  const source = emptyDefinitions();
  source.config.historySize = 1000;
  source.config.bufferSize = 20000;
  const written = writer.prepareTinTinWrite(source);
  assert.equal(written.ok, true);
  assert.match(written.content, /#config \{HISTORY SIZE\} \{1000\}/u);
  assert.match(written.content, /#config \{BUFFER SIZE\} \{20000\}/u);
  const loaded = loader.prepareTinTinRead(written.content, emptyDefinitions());
  assert.equal(loaded.ok, true);
  assert.equal(loaded.definitions.config.historySize, 1000);
  assert.equal(loaded.definitions.config.bufferSize, 20000);
});

test('TinTin history APPEND mode deduplicates repeated commands by moving them to the newest edge', () => {
  const { manager, session } = managerHarness();
  manager.dispatchInput(session.id, 'look');
  manager.dispatchInput(session.id, 'score');
  manager.dispatchInput(session.id, 'look');
  assert.deepEqual(manager.sessions.get(session.id).tintinCommandHistory, ['score', 'look']);

  const repeated = manager.dispatchInput(session.id, '!sc');
  assert.equal(repeated.deliveries.at(-1)?.command, 'score');
  assert.deepEqual(manager.sessions.get(session.id).tintinCommandHistory, ['look', 'score']);
});

test('unmatched history repeat reports the TinTin repeat miss while preserving the literal command', () => {
  const { manager, session } = managerHarness();
  manager.dispatchInput(session.id, 'look');
  const missing = manager.dispatchInput(session.id, '!xyzzy');
  assert.equal(missing.deliveries.at(-1)?.command, '!xyzzy');
  assert.match(missing.messages.join('\n'), /#REPEAT: NO MATCH FOUND FOR '!xyzzy'/u);
});

test('HISTORY INSERT uses repeat-prefix lookup and APPEND dedupe without running the recalled command', () => {
  const { manager, session } = managerHarness();
  manager.dispatchInput(session.id, 'kill rat');
  manager.dispatchInput(session.id, 'north');
  const before = manager.sessions.get(session.id).connection.sent.length;
  const result = manager.dispatchInput(session.id, '#history insert {!kil}');
  assert.equal(manager.sessions.get(session.id).connection.sent.length, before);
  assert.match(result.messages.join('\n'), /Inserted history entry: kill rat/u);
  assert.deepEqual(manager.sessions.get(session.id).tintinCommandHistory, ['north', '#history insert {!kil}', 'kill rat']);
});
