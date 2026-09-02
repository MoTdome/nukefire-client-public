'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { TabEngine } = require('../src/tab-engine');
const inputEditor = require('../src/tintin-input-editor');
const { SessionManager } = require('../src/session-manager');
const loader = require('../src/tintin-script-loader');
const writer = require('../src/tintin-script-writer');
const { normalizeSettings } = require('../src/settings-store');

class FakeConnection {
  constructor(handlers) { this.handlers = handlers; this.status = 'disconnected'; this.sent = []; }
  sendCommand(command) { this.sent.push(command); return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
  disconnect() { this.status = 'disconnected'; }
}

function harness() {
  const events = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    handlers: { onEvent: (event) => events.push(event), onSessionsChanged: () => {} }
  });
  const session = manager.createSession({ id: 'tabs', name: 'Tabs' });
  return { manager, session, events };
}

function emptyDefinitions() {
  return {
    aliases: [], variables: [], functions: [], tabs: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    events: { enabled: true, definitions: [] },
    config: { logMode: 'plain', commandEcho: false, autoTab: 0, verbatim: false, repeatChar: '!', repeatEnter: false, verbatimChar: '\\', historySize: 2000, bufferSize: 5000 },
    classes: { activeStack: [], definitions: [] }, speedwalk: { enabled: true }
  };
}

test('TAB definitions are alphabetic, replace duplicates, and UNTAB supports TinTin wildcards', () => {
  const engine = new TabEngine();
  engine.define('zebra');
  engine.define('alpha');
  engine.define('alpha');
  engine.define('aardvark');
  assert.deepEqual(engine.list().map((record) => record.value), ['aardvark', 'alpha', 'zebra']);
  assert.deepEqual(engine.delete('a%*').map((record) => record.value), ['aardvark', 'alpha']);
  assert.deepEqual(engine.list().map((record) => record.value), ['zebra']);
  engine.define('a');
  engine.define('ab');
  assert.deepEqual(engine.delete('a%?').map((record) => record.value), ['ab']);
  assert.deepEqual(engine.list().map((record) => record.value), ['a', 'zebra']);
});

test('#TAB expands variables at definition time and stores the active Class owner', () => {
  const { manager, session } = harness();
  manager.dispatchInput(session.id, '#variable {mob} {mutant}');
  manager.dispatchInput(session.id, '#class {combat} {open}');
  manager.dispatchInput(session.id, '#tab {$mob boss}');
  const snapshot = manager.snapshotTinTinContext(manager.sessions.get(session.id).tintin);
  assert.deepEqual(snapshot.tabs, [{ value: 'mutant boss', className: 'combat' }]);
});

test('CURSOR mixed-tab requests carry function/variable-expanded explicit tabs and AUTO TAB depth', () => {
  const { manager, session, events } = harness();
  manager.dispatchInput(session.id, '#variable {mob} {mutant}');
  manager.dispatchInput(session.id, '#tab {$mob}');
  manager.dispatchInput(session.id, '#config {AUTO TAB} {75}');
  manager.dispatchInput(session.id, '#cursor {mixed tab forward}');
  const event = events.findLast((entry) => entry.type === 'input-cursor-request');
  assert.equal(event?.payload.operation, 'mixed tab forward');
  assert.equal(event?.payload.autoTab, 75);
  assert.deepEqual(event?.payload.tabs, ['mutant']);
});

test('last-word completion requires a collapsed caret at the end and preserves explicit-before-auto order', () => {
  const range = inputEditor.lastWordRange('kill mut', 8, 8);
  assert.deepEqual(range, { start: 5, end: 8, prefix: 'mut' });
  assert.equal(inputEditor.lastWordRange('kill mut ', 9, 9), null);
  assert.equal(inputEditor.lastWordRange('kill mut', 5, 8), null);
  assert.deepEqual(inputEditor.completionCandidates({
    explicit: ['mutant', 'mutant king'],
    scrollback: 'A mutant brute.\nmutagen mutant,',
    autoTab: 2,
    prefix: 'mut',
    mode: 'mixed'
  }), ['mutant', 'mutant king', 'mutagen']);
});

test('AUTO TAB scans newest scrollback first, strips terminal punctuation, and de-duplicates words', () => {
  assert.deepEqual(inputEditor.scrollbackWords('old alpha\nnew beta, alpha; gamma.\n', 1), ['new', 'beta', 'alpha', 'gamma']);
});

test('CURSOR edit operations use native input-value/caret semantics for words and clearing', () => {
  assert.deepEqual(inputEditor.editInput('say alpha beta', 14, 14, 'delete word left'), { value: 'say alpha ', selectionStart: 10, selectionEnd: 10 });
  assert.deepEqual(inputEditor.editInput('say alpha beta', 4, 4, 'delete word right'), { value: 'say beta', selectionStart: 4, selectionEnd: 4 });
  assert.deepEqual(inputEditor.editInput('say alpha', 4, 4, 'clear left'), { value: 'alpha', selectionStart: 0, selectionEnd: 0 });
  assert.deepEqual(inputEditor.editInput('say alpha', 4, 4, 'set', 'big '), { value: 'say big alpha', selectionStart: 8, selectionEnd: 8 });
});

test('HISTORY SEARCH helper cycles newest-to-oldest by contained search text', () => {
  const history = ['look', 'kill mutant', 'score', 'kill boss'];
  assert.equal(inputEditor.historySearch(history, 'kill', history.length), 3);
  assert.equal(inputEditor.historySearch(history, 'kill', 3), 1);
});

test('READ and WRITE preserve TAB definitions, class ownership, and AUTO TAB', () => {
  const source = [
    '#config {AUTO TAB} {42}',
    '#tab {north}',
    '#class {combat} {open}',
    '#tab {mutant}',
    '#class {combat} {close}'
  ].join('\n');
  const loaded = loader.prepareTinTinRead(source, emptyDefinitions(), { commandPrefix: '#' });
  assert.equal(loaded.ok, true, loaded.errors?.join('\n'));
  assert.equal(loaded.definitions.config.autoTab, 42);
  assert.deepEqual(loaded.definitions.tabs, [{ value: 'north' }, { value: 'mutant', className: 'combat' }]);
  const written = writer.prepareTinTinWrite(loaded.definitions, { commandPrefix: '#' });
  assert.equal(written.ok, true, written.errors?.join('\n'));
  assert.match(written.content, /#tab \{north\}/u);
  assert.match(written.content, /#config \{AUTO TAB\} \{42\}/u);
  assert.match(written.content, /#class \{combat\} \{open\}[\s\S]*#tab \{mutant\}/u);
});

test('settings normalization persists tabs and AUTO TAB while rejecting unsafe tab text', () => {
  const normalized = normalizeSettings({
    sessions: { activeSessionId: 'main', sessions: [{ id: 'main', tintin: {
      tabs: [{ value: 'mutant' }, { value: 'bad\nline' }], config: { autoTab: 123 }
    } }] }
  });
  const tintin = normalized.sessions.sessions[0].tintin;
  assert.deepEqual(tintin.tabs, [{ value: 'mutant' }]);
  assert.equal(tintin.config.autoTab, 123);
});

test('renderer loads the input editor before renderer and only steals Tab when completion candidates exist', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.ok(html.indexOf('../src/tintin-input-editor.js') < html.indexOf('renderer.js'));
  assert.match(renderer, /if \(continuing \|\| preview\?\.candidates\?\.length\) \{[\s\S]*event\.preventDefault\(\)/u);
  assert.match(renderer, /requestTinTinCursorOperation\(event\.shiftKey \? 'mixed tab backward' : 'mixed tab forward'\)/u);
  assert.match(renderer, /event\.ctrlKey[\s\S]*tinTinHistorySearch\(\)/u);
});

test('renderer session normalization retains all Pass-11/12 config fields plus Pass-16 AUTO TAB and Tabs', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  for (const token of ['autoTab:', 'verbatim:', 'repeatChar:', 'repeatEnter:', 'verbatimChar:', 'historySize:', 'bufferSize:', 'tabs: Array.isArray(source.tabs)']) {
    assert.match(renderer, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u'));
  }
});
