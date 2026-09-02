'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SessionManager } = require('../src/session-manager');
const help = require('../src/client-command-help');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'renderer', 'styles.css'), 'utf8');

function managerWithEvents(events) {
  return new SessionManager({
    queueOptions: { intervalMs: 0 },
    handlers: { onEvent: (event) => events.push(event), onSessionsChanged: () => {} },
    delaySetTimer: () => ({ id: 1 }), delayClearTimer: () => {},
    tickerSetTimer: () => ({ id: 1 }), tickerClearTimer: () => {}
  });
}

test('explicit manage forms open the requested category without changing traditional bare listings', () => {
  const events = [];
  const manager = managerWithEvents(events);
  const session = manager.createSession({ id: 'definitions', name: 'Definitions' });
  manager.dispatchInput(session.id, '#alias {scan} {look}');
  assert.match(manager.dispatchInput(session.id, '#alias').messages[0], /scan/u);

  const commands = {
    '#alias manage': 'aliases', '#action manage': 'actions', '#variable manage': 'variables',
    '#function manage': 'functions', '#macro manage': 'macros', '#highlight manage': 'highlights',
    '#substitute manage': 'substitutes', '#gag manage': 'gags', '#class manage': 'classes'
  };
  for (const [command, category] of Object.entries(commands)) {
    const result = manager.dispatchInput(session.id, command);
    assert.match(result.messages[0], new RegExp(category, 'iu'));
    const event = events.findLast((entry) => entry.type === 'definition-manager-request');
    assert.equal(event.sessionId, session.id);
    assert.deepEqual(event.payload, { category });
  }
});

test('braced veteran definitions named manage remain definitions rather than UI commands', () => {
  const events = [];
  const manager = managerWithEvents(events);
  const session = manager.createSession({ id: 'veteran', name: 'Veteran' });
  const result = manager.dispatchInput(session.id, '#alias {manage} {score}');
  assert.match(result.messages[0], /Defined alias manage/u);
  assert.equal(events.some((entry) => entry.type === 'definition-manager-request'), false);
});

test('client help documents explicit manager entry without replacing bare text behavior', () => {
  for (const topic of ['alias', 'action', 'variable', 'function', 'macro', 'highlight', 'substitute', 'gag', 'class']) {
    const lines = help.clientCommandHelp(topic, '#').join('\n');
    assert.match(lines, new RegExp(`#${topic} manage`, 'iu'));
    assert.match(lines, /traditional text listing/iu);
  }
});

test('ships one accessible, searchable manager for every established definition family', () => {
  assert.match(html, /id="definition-manager-dialog"[^>]+role="dialog"/u);
  assert.match(html, /aria-modal="true"/u);
  assert.match(html, /id="definition-manager-list"[^>]+role="listbox"/u);
  for (const category of ['aliases', 'actions', 'variables', 'functions', 'macros', 'highlights', 'substitutes', 'gags', 'classes']) {
    assert.match(html, new RegExp(`<option value="${category}">`, 'u'));
  }
  assert.match(html, /id="definition-manager-status"[^>]+aria-live="polite"/u);
  assert.match(styles, /\.definition-manager-workspace/u);
  assert.match(styles, /@media \(max-width: 760px\)/u);
});

test('manager reuses live session definitions and preserves command draft, selection, focus, and history', () => {
  const recordsBlock = renderer.match(/function definitionManagerRecords\(\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(recordsBlock, /const source = state\.sessions\[category\]/u);
  assert.doesNotMatch(recordsBlock, /currentDefinitionSnapshot/u);
  assert.match(renderer, /const allRecords = definitionManagerRecords\(\);[\s\S]*definitionManagerFilteredRecords\(allRecords\)/u);
  assert.match(renderer, /sendCommand\(command, \{ preserveInput: true, recordHistory: false \}\)/u);
  assert.match(renderer, /value: commandInput\.value,[\s\S]*start: commandInput\.selectionStart,[\s\S]*end: commandInput\.selectionEnd/u);
  assert.match(renderer, /commandInput\.setSelectionRange\(draft\.start/u);
  assert.match(renderer, /schedulePersistentSettingsSave\(\)/u);
  assert.match(renderer, /window\.confirm\(`Delete/u);
});

test('manager provides keyboard navigation, trapped Tab, Escape closure, and concise announcements', () => {
  assert.match(renderer, /\['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'\]/u);
  assert.match(renderer, /if \(event\.key === 'Escape'\)[\s\S]*closeDefinitionManager\(\)/u);
  assert.match(renderer, /if \(event\.key !== 'Tab'\) return/u);
  assert.match(renderer, /announce\(`\$\{definitionManagerConfig\(\)\.label\} Definition Manager opened\./u);
  assert.match(renderer, /The identity stays fixed while editing\. Use Duplicate/u);
});
