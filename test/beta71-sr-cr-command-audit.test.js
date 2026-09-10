'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CONTROL_REQUEST_ACTIONS, normalizeControlRequest } = require('../src/semantic-controls');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8').replace(/\r\n?/gu, '\n');

function branch(action, nextAction) {
  const start = renderer.indexOf(`if (request.action === '${action}')`);
  assert.ok(start >= 0, `${action} handler must exist`);
  const end = nextAction
    ? renderer.indexOf(`if (request.action === '${nextAction}')`, start + 1)
    : renderer.length;
  assert.ok(end > start, `${action} handler must be bounded`);
  return renderer.slice(start, end);
}

function functionBlock(name, nextName) {
  const start = renderer.indexOf(`function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = nextName ? renderer.indexOf(`function ${nextName}`, start + 1) : renderer.length;
  assert.ok(end > start, `${name} must be bounded`);
  return renderer.slice(start, end);
}

test('SR/CR semantic requests remain a strict commandless allowlist', () => {
  assert.equal(CONTROL_REQUEST_ACTIONS.size, 75);
  for (const action of [
    'client.status', 'reader.status', 'reader.session.begin', 'reader.exit.restore',
    'reader.preset', 'reader.load.mushsettings', 'reader.workspace',
    'reader.voice.enabled', 'reader.audio.status', 'reader.sound.status',
    'reader.soundpack.status', 'reader.doctor', 'reader.keys',
    'reader.review.latest', 'reader.lines.recall'
  ]) {
    assert.equal(CONTROL_REQUEST_ACTIONS.has(action), true, action);
    assert.equal(normalizeControlRequest({ schema: 1, id: 71, action, args: { value: 'status' } })?.action, action);
  }
  assert.equal(normalizeControlRequest({ schema: 1, id: 71, action: 'reader.javascript', args: { value: 'x' } }), null);
  assert.equal(normalizeControlRequest({ schema: 2, id: 71, action: 'reader.status', args: {} }), null);
});

test('server-echoed SR/CR status results stay quiet locally to avoid double announcements', () => {
  for (const [action, next] of [
    ['client.status', 'reader.status'],
    ['reader.status', 'reader.audio.status'],
    ['reader.audio.status', 'reader.audio.enabled'],
    ['reader.sound.status', 'reader.sound.channel']
  ]) {
    const block = branch(action, next);
    assert.match(block, /sendNukeFireControlResult\(/u, action);
    assert.doesNotMatch(block, /\bannounce\(/u, action);
  }
  const preset = branch('reader.preset', 'reader.load.mushsettings');
  assert.match(preset, /applyReaderSetupPreset\(presetId, \{ announceChange: false \}\)/u);
  assert.doesNotMatch(preset, /\bannounce\(/u);
});

test('CR WORKSPACE changes state without stealing focus from the current control', () => {
  const block = branch('reader.workspace', 'reader.voice.enabled');
  assert.match(block, /setReaderWorkspaceEnabled\(next, \{ focus: false \}\)/u);
  assert.doesNotMatch(block, /focusCommand\(|\.focus\s*\(/u);
});

test('the local Reader Workspace setter still persists and announces when appropriate', () => {
  const block = functionBlock('setReaderWorkspaceEnabled(enabled, options = {})', 'setScreenReaderMode(enabled, options = {})');
  assert.match(block, /if \(options\.persist !== false\)[\s\S]*nukefire\.readerWorkspaceEnabled/u);
  assert.match(block, /if \(options\.focus !== false\)[\s\S]*focusCommand\(\{ preserveSelection: true \}\)/u);
  assert.match(block, /if \(options\.announceChange !== false\)[\s\S]*Reader workspace enabled/u);
});

test('Reader setup presets capture once, suppress focus movement, and use one result announcement path', () => {
  const block = functionBlock('applyReaderSetupPreset(requestedPresetId = \'\', options = {})', 'readPreReaderSetup()');
  assert.match(block, /capturePreReaderSetup\(\)/u);
  assert.match(block, /setReaderWorkspaceEnabled\(next\.readerWorkspaceEnabled !== false, \{ \.\.\.quiet, focus: false \}\)/u);
  assert.match(block, /if \(options\.announceChange !== false\) announce\(message/u);
  assert.doesNotMatch(block, /focusCommand\(|\.focus\s*\(/u);
  assert.match(branch('reader.preset', 'reader.load.mushsettings'), /announceChange: false/u);
});

test('CR LOAD MUSHSETTINGS preserves an in-progress command draft and selection', () => {
  const block = functionBlock('applyMushSettingsPreset()', 'applyFirstRunReaderChoice(presetId)');
  assert.match(block, /capturePreReaderSetup\(\)/u);
  assert.match(block, /const commandDraft = commandInput\.value/u);
  assert.match(block, /const selectionStart = commandInput\.selectionStart/u);
  assert.match(block, /const selectionEnd = commandInput\.selectionEnd/u);
  assert.match(block, /commandInput\.value = commandDraft/u);
  assert.match(block, /commandInput\.setSelectionRange\(selectionStart, selectionEnd, selectionDirection \|\| 'none'\)/u);
  assert.doesNotMatch(block, /\.focus\s*\(/u);
});

test('CR OFF and SR OFF restoration remains bounded to Reader-owned settings and never moves focus', () => {
  const block = functionBlock('restorePreReaderSetup()', 'setImportantAnnouncements(enabled, options = {})');
  assert.match(block, /const quiet = \{ announceChange: false, persist: false, focus: false \}/u);
  assert.match(block, /updateKeybindings\(snapshot\.keybindings \|\| \{\}, \{ persist: false \}\)/u);
  assert.match(block, /repeatLast\.checked = snapshot\.input\?\.repeatLastCommandOnEnter === true/u);
  assert.match(block, /showLast\.checked = snapshot\.input\?\.showLastCommandInInput !== false/u);
  assert.match(block, /localStorage\.removeItem\(PRE_READER_SETUP_KEY\)/u);
  assert.doesNotMatch(block, /soundpackId|aliases|actions|functions|sessions\.records|\.focus\s*\(/u);
});

test('non-echoed Reader command results keep deliberate local confirmation', () => {
  for (const [action, next] of [
    ['reader.load.mushsettings', 'reader.workspace'],
    ['reader.doctor', 'reader.session.begin'],
    ['reader.recover', 'reader.unread'],
    ['reader.unread', 'reader.context'],
    ['reader.context', 'reader.keys'],
    ['reader.keys', 'reader.tutorial']
  ]) {
    assert.match(branch(action, next), /\bannounce\(/u, action);
  }
  assert.match(branch('reader.workspace', 'reader.voice.enabled'), /setReaderWorkspaceEnabled\(next, \{ focus: false \}\)/u);
  assert.match(branch('reader.voice.enabled', 'reader.voice.muted'), /setSelfVoiceEnabled\(next\)/u);
});

test('control-result history retains status and mutations but avoids review echo loops', () => {
  const block = functionBlock('sendNukeFireControlResult(request, ok, message)', 'controlToggleValue(value, current)');
  assert.match(block, /action === 'reader\.tutorial'/u);
  assert.match(block, /action\.startsWith\('reader\.review\.'\)/u);
  assert.match(block, /action\.startsWith\('reader\.lines\.'\)/u);
  assert.match(block, /action\.startsWith\('reader\.category\.'\)/u);
  assert.match(block, /if \(!skipHistory\) appendClientReaderHistory\(message/u);
});

test('Self-Voice startup failure cannot silently disable the native reader path', () => {
  const block = functionBlock('setSelfVoiceEnabled(enabled, options = {})', 'markReaderOnboardingSeen()');
  const failed = block.indexOf('if (requested && applied !== true)');
  const nativeDisable = block.indexOf('if (requested && state.accessibility.screenReaderMode)');
  assert.ok(failed >= 0 && nativeDisable > failed, 'native reader must only be disabled after Self-Voice succeeds');
  assert.match(block, /The native reader setting was preserved/u);
});
