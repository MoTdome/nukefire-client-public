'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
const serverRef = fs.readFileSync(path.join(root, 'server-integration', 'accessibility', 'sr_cr_commands_reference.c'), 'utf8');

function functionBlock(startNeedle, endNeedle) {
  const start = renderer.indexOf(startNeedle);
  const end = renderer.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0 && end > start, `${startNeedle} block must remain inspectable`);
  return renderer.slice(start, end);
}

test('MUSH settings accepts no mode, native, client, and status without adding a BOTH mode', () => {
  const block = functionBlock('function normalizeMushSettingsSpeechPath', 'function applyFirstRunReaderChoice');
  assert.match(block, /return 'native'/u);
  assert.match(block, /return 'client'/u);
  assert.match(block, /return 'status'/u);
  assert.match(block, /expects NATIVE, CLIENT, STATUS, or no extra argument/u);
  assert.doesNotMatch(block, /return 'both'/u);
});

test('native and client MUSH modes deliberately select exactly one live speech owner', () => {
  const block = functionBlock('function applyMushSettingsPreset()', 'function applyFirstRunReaderChoice');
  assert.match(block, /pendingMushSettingsSpeechPath/u);
  assert.match(block, /applyReaderSetupPreset\('native-reader', \{ announceChange: false \}\)/u);
  assert.match(block, /applyReaderSetupPreset\('reader-live-voice', \{ announceChange: false \}\)/u);
  assert.match(block, /installMushSettingsPreset\(state\.keybindings, keybindingApi\)/u);
  assert.match(block, /Use CR LOAD MUSHSETTINGS STATUS to check this setup/u);
  assert.match(renderer, /request\.action === 'reader\.load\.mushsettings'[\s\S]*?pendingMushSettingsSpeechPath = String\(request\.args\?\.value \|\| ''\)[\s\S]*?applyMushSettingsPreset\(\)/u);
});

test('MUSH STATUS is read-only and reports both native and NukeFire Voice state', () => {
  const statusHelper = functionBlock('function mushSettingsSpeechPathStatus()', 'function applyMushSettingsPreset()');
  const block = functionBlock('function applyMushSettingsPreset()', 'function applyFirstRunReaderChoice');
  const statusAt = block.indexOf("if (mode === 'status')");
  const captureAt = block.indexOf('capturePreReaderSetup();');
  assert.ok(statusAt >= 0 && captureAt > statusAt);
  const statusBranch = block.slice(statusAt, captureAt);
  assert.match(statusBranch, /mushSettingsSpeechPathStatus\(\)/u);
  assert.match(statusBranch, /Official shortcuts active: \$\{mushSettingsShortcutCount\(\)\} of 29/u);
  assert.doesNotMatch(statusBranch, /applyReaderSetupPreset|installMushSettingsPreset|updateKeybindings|setScreenReaderMode|setSelfVoiceEnabled/u);
  assert.match(statusHelper, /Native screen reader output/u);
  assert.match(statusHelper, /NukeFire Voice/u);
  assert.match(statusHelper, /Live speech owner/u);
});

test('server reference keeps bare MUSH settings and adds NATIVE CLIENT STATUS values', () => {
  assert.match(serverRef, /CR LOAD MUSHSETTINGS \[NATIVE\|CLIENT\|STATUS\]/u);
  assert.match(serverRef, /same_word\(mode, "status"\)[\s\S]*?reader\.load\.mushsettings", "status"/u);
  assert.match(serverRef, /same_word\(mode, "native"\) \|\| same_word\(mode, "client"\)[\s\S]*?sr_apply_setup_profile\(ch, "balanced"\)/u);
  assert.match(serverRef, /reader\.load\.mushsettings", \*mode \? mode : NULL/u);
});

test('native live region appends a fresh child for every completed line instead of text-deduping', () => {
  const block = functionBlock('function announceNativeReaderOutputLine(value)', 'function markReaderOnboardingSeen');
  assert.match(block, /document\.createElement\('div'\)/u);
  assert.match(block, /readerOutputAnnouncer\.append\(line\)/u);
  assert.doesNotMatch(block, /lastAnnounced|previousAnnounced|=== text/u);
});
