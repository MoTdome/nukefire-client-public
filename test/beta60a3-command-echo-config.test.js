'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SessionManager } = require('../src/session-manager');
const { prepareTinTinRead } = require('../src/tintin-script-loader');
const { prepareTinTinWrite } = require('../src/tintin-script-writer');

class FakeConnection {
  constructor(handlers = {}) { this.handlers = handlers; }
  connect(host, port) { this.handlers.onStatus?.({ state: 'connected', host, port }); return Promise.resolve(); }
  disconnect(message = 'Disconnected') { this.handlers.onStatus?.({ state: 'disconnected', message }); }
  sendCommand() { return true; }
  setTerminalSize() {}
  setClientPreferences() {}
}

function harness() {
  const events = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    handlers: {
      onEvent: (event) => events.push(event),
      onSessionsChanged: () => {}
    }
  });
  return { manager, events };
}

test('COMMAND ECHO defaults OFF, toggles per session, and is reported by #config', () => {
  const { manager } = harness();
  const alpha = manager.createSession({ name: 'Alpha' });
  const beta = manager.createSession({ name: 'Beta' });
  const alphaSession = manager.findSession(alpha.id);
  const betaSession = manager.findSession(beta.id);
  assert.equal(alphaSession.tintin.config.commandEcho, false);
  assert.equal(betaSession.tintin.config.commandEcho, false);
  const status = manager.dispatchInput(alpha.id, '#config').messages.join('\n');
  assert.match(status, /COMMAND ECHO OFF/u);
  assert.match(manager.dispatchInput(alpha.id, '#config {COMMAND ECHO} {ON}').messages.join('\n'), /Command echo enabled/u);
  assert.equal(alphaSession.tintin.config.commandEcho, true);
  assert.equal(betaSession.tintin.config.commandEcho, false);
});

test('COMMAND ECHO OFF hides routine generated acknowledgements but preserves important failures', () => {
  const { manager, events } = harness();
  const alpha = manager.createSession({ name: 'Alpha' });
  const alphaSession = manager.findSession(alpha.id);
  manager.emitActionResult(alphaSession, {
    command: '#variable {target} {mutant}',
    messages: ['Set variable target: mutant', 'Unknown variable: missing', 'Action blocked: unsafe command.']
  });
  const quiet = events.filter((event) => event.type === 'action-result').at(-1).payload.messages;
  assert.deepEqual(quiet, ['Unknown variable: missing', 'Action blocked: unsafe command.']);

  manager.dispatchInput(alpha.id, '#config {COMMAND ECHO} {ON}');
  manager.emitActionResult(alphaSession, {
    command: '#variable {target} {dragon}',
    messages: ['Set variable target: dragon']
  });
  const loud = events.filter((event) => event.type === 'action-result').at(-1).payload.messages;
  assert.deepEqual(loud, ['Set variable target: dragon']);
});

test('COMMAND ECHO round-trips through TinTin #read/#write config state', () => {
  const loaded = prepareTinTinRead('#config {COMMAND ECHO} {ON}\n#config {LOG MODE} {RAW}', {});
  assert.equal(loaded.ok, true);
  assert.equal(loaded.definitions.config.commandEcho, true);
  assert.equal(loaded.definitions.config.logMode, 'raw');

  const written = prepareTinTinWrite({
    aliases: [], variables: [], functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    events: { enabled: true, definitions: [] },
    config: { logMode: 'plain', commandEcho: false },
    classes: { activeStack: [], definitions: [] },
    speedwalk: { enabled: true },
    profile: { requested: '', filename: '', loaded: false }
  });
  assert.equal(written.ok, true);
  assert.match(written.content, /#config \{COMMAND ECHO\} \{OFF\}/u);
});

test('Lua command echo is quiet by default while explicit echo() and errors remain visible', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(renderer, /function commandEchoEnabledForSession/u);
  assert.match(renderer, /if \(commandEcho\) appendSystemMessage\('\[Lua\] running\.\.\.'\)/u);
  assert.match(renderer, /for \(const args of result\?\.echoes \|\| \[\]\) \{\s*appendSystemMessage\(`\[Lua\]/u);
  assert.match(renderer, /if \(commandEcho && \(result\.values \|\| \[\]\)\.length\)/u);
  assert.match(renderer, /appendSystemMessage\(`\[Lua \$\{kind\}\] \$\{message\}`\)/u);
});
