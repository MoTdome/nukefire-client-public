'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const keybindings = require('../src/keybinding-engine');

const read = (file) => fs.readFileSync(file, 'utf8');

function commandlessAccessibilityBinding(id, code) {
  return keybindings.normalizeBinding({
    id: `test-${id}`,
    code,
    semantic: { type: 'accessibility', id },
    command: ''
  });
}

test('Reader Workspace is an explicit presentation-only Accessibility preference', () => {
  const html = read('renderer/index.html');
  const renderer = read('renderer/renderer.js');
  const settings = read('src/settings-store.js');

  assert.match(html, /id="reader-workspace-enabled"[^>]*> Reader workspace — terminal and Reader Review only/);
  assert.match(html, /Reader workspace is presentation-only:/);
  assert.match(settings, /readerWorkspaceEnabled: false/);
  assert.match(settings, /DEFAULT_SETTINGS\.accessibility\.readerWorkspaceEnabled/);
  assert.match(renderer, /nukefire\.readerWorkspaceEnabled/);
  assert.match(renderer, /document\.body\.classList\.toggle\('reader-workspace-mode', requested\)/);
});

test('Reader Workspace hides ordinary dock presentation without mutating saved panel layout', () => {
  const html = read('renderer/index.html');
  const renderer = read('renderer/renderer.js');
  const start = renderer.indexOf('function setReaderWorkspaceEnabled');
  const end = renderer.indexOf('\nfunction setScreenReaderMode', start);
  const body = renderer.slice(start, end);

  assert.match(html, /body\.reader-workspace-mode #workspace > \.dock-region/);
  assert.match(html, /body\.reader-workspace-mode #workspace > \.dock-resizer/);
  assert.match(html, /body\.reader-workspace-mode #workspace > \.terminal-shell/);
  assert.doesNotMatch(body, /applyPanelVisibility\(/);
  assert.doesNotMatch(body, /applyPanelLayout\(/);
  assert.doesNotMatch(body, /state\.workspace\.activePanels\s*=/);
  assert.doesNotMatch(body, /state\.workspace\.activeLayout\s*=/);
});

test('Reader Review workspace exposes proven terminal, Communications, and panic controls', () => {
  const html = read('renderer/index.html');
  for (const id of [
    'reader-workspace-reader-current',
    'reader-workspace-reader-previous',
    'reader-workspace-reader-next',
    'reader-workspace-reader-latest',
    'reader-workspace-comms-current',
    'reader-workspace-comms-older',
    'reader-workspace-comms-newer',
    'reader-workspace-comms-latest',
    'reader-workspace-last-tell',
    'reader-workspace-last-communication',
    'reader-workspace-copy-reviewed',
    'reader-workspace-focus-command',
    'reader-workspace-stop-self-voice'
  ]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="reader-workspace-review-status"[^>]*aria-live="off"/);
  assert.doesNotMatch(html, /id="reader-workspace-exit"/);
});

test('Reader Workspace uses Reader History for game categories while retaining stable Communications review', () => {
  const renderer = read('renderer/renderer.js');
  assert.match(renderer, /reader-workspace-reader-current[^\n]*addEventListener\('click', readerHistoryCurrent\)/);
  assert.match(renderer, /reader-workspace-comms-older[^\n]*addEventListener\('click', reviewOlderCommunication\)/);
  assert.match(renderer, /reader-workspace-last-tell[^\n]*addEventListener\('click', recallLastTell\)/);
  assert.match(renderer, /reader-workspace-stop-self-voice[^\n]*addEventListener\('click', stopSelfVoiceNow\)/);
  assert.match(renderer, /reader-workspace-copy-reviewed[^\n]*addEventListener\('click'/);
});

test('copy reviewed is a commandless local action backed by the last deliberate review', () => {
  const copy = commandlessAccessibilityBinding('copy-reviewed', 'F12');
  const renderer = read('renderer/renderer.js');
  assert.ok(copy);
  assert.deepEqual(copy.semantic, { type: 'accessibility', id: 'copy-reviewed' });
  assert.match(renderer, /state\.lastReviewedText = String\(result\.text \|\| ''\)\.trim\(\)/);
  assert.match(renderer, /function copyReviewedText\(\)[\s\S]*?writeClipboardText/);
});

test('Reader Workspace temporarily suppresses pop-out panes and preserves their open state', () => {
  const renderer = read('renderer/renderer.js');
  assert.match(renderer, /readerWorkspaceSuppressedPopouts: new Set\(\)/);
  assert.match(renderer, /if \(!isPanelPoppedOut\(panelId\)\) continue;\s+suppressed\.add\(panelId\);\s+void window\.nukefire\.closePanelWindow/);
  assert.match(renderer, /if \(state\.workspace\.activePopouts\?\.\[panelId\]\?\.open\) \{\s+await openPanelPopout\(panelId, \{ focus: false, announceChange: false \}\)/);
  assert.match(renderer, /readerWorkspaceSuppressedPopouts\?\.has\(panelId\)/);
});

test('Reader Workspace is a configurable commandless accessibility action', () => {
  const reader = commandlessAccessibilityBinding('toggle-reader-workspace', 'F10');
  assert.ok(reader);
  assert.equal(reader.command, '');
  assert.deepEqual(reader.semantic, { type: 'accessibility', id: 'toggle-reader-workspace' });
});

test('b.4 Priority Self-Voice toggle remains commandless after Reader Workspace changes', () => {
  const priority = commandlessAccessibilityBinding('toggle-self-voice-priority-alerts', 'F11');
  assert.ok(priority);
  assert.equal(priority.command, '');
  assert.deepEqual(priority.semantic, { type: 'accessibility', id: 'toggle-self-voice-priority-alerts' });
});

test('review results are mirrored into the non-live Reader Workspace status without duplicating speech', () => {
  const renderer = read('renderer/renderer.js');
  assert.match(renderer, /function setReaderWorkspaceReviewStatus\(message\)/);
  assert.match(renderer, /setReaderWorkspaceReviewStatus\(message\);\s+announce\(message, \{ force: true \}\);/);
  assert.match(renderer, /setReaderWorkspaceReviewStatus\(text\);\s+announce\(text, \{ force: true \}\);/);
});

test('connection completion restores command focus only from the command and connection workflow', () => {
  const renderer = read('renderer/renderer.js');
  const policyStart = renderer.indexOf('function shouldRestoreCommandFocusAfterStatus');
  const statusStart = renderer.indexOf('function setStatus');
  const policy = renderer.slice(policyStart, statusStart);
  const statusEnd = renderer.indexOf('\nfunction appendSystemMessage', statusStart);
  const status = renderer.slice(statusStart, statusEnd);

  assert.notEqual(policyStart, -1);
  assert.match(policy, /document\.activeElement/);
  assert.match(policy, /active === commandInput/);
  assert.match(policy, /active === connectButton/);
  assert.match(policy, /active === reconnectButton/);
  assert.match(policy, /active === hostInput/);
  assert.match(policy, /active === portInput/);
  assert.doesNotMatch(policy, /xtermOutput|preferencesDialog|reader-workspace/);
  assert.match(status, /shouldRestoreCommandFocusAfterStatus\(\)/);
  assert.match(status, /focusCommand\(\{ preserveSelection: true \}\)/);
  assert.doesNotMatch(status, /commandInput\.focus\(/);
});

test('connection and announcement live regions reject redundant or empty updates', () => {
  const renderer = read('renderer/renderer.js');
  const statusStart = renderer.indexOf('function setStatus');
  const statusEnd = renderer.indexOf('\nfunction appendSystemMessage', statusStart);
  const status = renderer.slice(statusStart, statusEnd);
  const announceStart = renderer.indexOf('function announce');
  const announceEnd = renderer.indexOf('\nfunction legacySettingsSnapshot', announceStart);
  const announce = renderer.slice(announceStart, announceEnd);

  assert.match(status, /setTextIfChanged\(statusText, status\?\.message \|\| current\)/);
  assert.doesNotMatch(status, /statusText\.textContent\s*=/);
  assert.ok(announce.indexOf('if (!text ||') < announce.indexOf("announcer.textContent = ''"));
});
