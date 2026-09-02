'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const settingsStore = require('../src/settings-store');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8').replace(/\r\n?/gu, '\n');
}

test('command history does not permanently attach the full command help description', () => {
  const html = source('renderer/index.html');
  const command = html.match(/<input id="command"[\s\S]*?>/u)?.[0] || '';
  assert.ok(command);
  assert.doesNotMatch(command, /aria-describedby=/u);
  assert.match(html, /id="command-help" class="sr-only"/u);
  assert.match(html, /id="command-history-status"[^>]*aria-live="off"[^>]*hidden/u);
});

test('command-send Self-Voice interruption is opt-in and persisted', () => {
  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');
  assert.match(html, /id="self-voice-interrupt-on-command"[^>]*> Interrupt Self-Voice when a command is sent/u);
  assert.match(renderer, /selfVoiceInterruptOnCommand: false/u);
  assert.match(renderer, /function setSelfVoiceInterruptOnCommand\(enabled, options = \{\}\)/u);
  assert.match(renderer, /if \(command\.trim\(\) && state\.accessibility\.selfVoiceInterruptOnCommand\) selfVoice\?\.interrupt\?\.\(\);/u);
  assert.match(renderer, /nukefire\.selfVoiceInterruptOnCommand/u);
});

test('settings schema 47 preserves the new accessibility preference', () => {
  assert.equal(settingsStore.SETTINGS_SCHEMA_VERSION, 48);
  const defaults = settingsStore.normalizeSettings({});
  assert.equal(defaults.accessibility.selfVoiceInterruptOnCommand, false);
  const enabled = settingsStore.normalizeSettings({ accessibility: { selfVoiceInterruptOnCommand: true } });
  assert.equal(enabled.accessibility.selfVoiceInterruptOnCommand, true);
});
