'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');

function functionBlock(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0 && end > start, `${startNeedle} block must remain inspectable`);
  return text.slice(start, end);
}

test('Beta.85 foreground-only speech applies to Native Reader as well as Self-Voice', () => {
  const renderer = source('renderer/renderer.js');
  const html = source('renderer/index.html');

  assert.match(renderer, /function readerSpeechAllowedInCurrentFocus/u);

  const transport = functionBlock(
    renderer,
    'function requestNativeReaderTransport(text, options = {}, fallback = null)',
    'function announce(message, options = {})'
  );
  assert.match(transport, /!readerSpeechAllowedInCurrentFocus\(\)/u);

  const automatic = functionBlock(
    renderer,
    'function announceNativeReaderOutputLine(value)',
    'function legacySettingsSnapshot()'
  );
  assert.match(automatic, /if \(!readerSpeechAllowedInCurrentFocus\(\)\) return false/u);

  assert.match(
    html,
    /Speak only while NukeFire is in the foreground/u
  );
  assert.match(
    html,
    /Foreground-only speech is shared by Native Reader and NukeFire Self-Voice/u
  );
  assert.match(
    html,
    /returning to NukeFire resumes only new live speech/u
  );
});

test('Beta.85 background transition cancels NukeFire-owned native speech and clears live announcers', () => {
  const renderer = source('renderer/renderer.js');
  const block = functionBlock(
    renderer,
    'function setSelfVoiceAppForeground(foreground)',
    'function setSelfVoiceForegroundOnly'
  );

  assert.match(block, /state\.accessibility\.screenReaderMode/u);
  assert.match(block, /window\.nukefire\?\.nativeReaderStop/u);
  assert.match(block, /readerOutputAnnouncer\?\.replaceChildren/u);
  assert.match(block, /announcer\.textContent = ''/u);
  assert.match(block, /interruptAnnouncer\.textContent = ''/u);
});

test('Beta.85 gives exactly one NukeFire speech path ownership at a time', () => {
  const renderer = source('renderer/renderer.js');
  const settings = source('src/settings-store.js');

  const announce = functionBlock(
    renderer,
    'function announce(message, options = {})',
    'function shouldIncludeNativeReaderLine'
  );
  assert.match(announce, /if \(state\.accessibility\.selfVoiceEnabled\)/u);
  assert.match(announce, /selfVoice\?\.speak\?\.\(text, \{ interrupt: interrupt \|\| force \}\)/u);
  assert.match(announce, /return;/u);
  assert.match(announce, /if \(!readerSpeechAllowedInCurrentFocus\(\)\) return/u);
  assert.match(announce, /queueMicrotask/u);

  const selfVoice = functionBlock(
    renderer,
    'function setSelfVoiceEnabled(enabled, options = {})',
    'function markReaderOnboardingSeen'
  );
  assert.match(selfVoice, /window\.nukefire\?\.nativeReaderStop/u);
  assert.match(selfVoice, /state\.accessibility\.screenReaderMode = false/u);

  const native = functionBlock(
    renderer,
    'function setScreenReaderMode(enabled, options = {})',
    'function applyReaderSetupPreset'
  );
  assert.match(native, /selfVoice\?\.stop/u);
  assert.match(native, /selfVoice\?\.setEnabled\?\.\(false\)/u);
  assert.match(native, /state\.accessibility\.selfVoiceEnabled = false/u);

  assert.match(settings, /selfVoiceEnabled: requestedSelfVoice && !screenReaderMode/u);
});

test('Beta.85 keeps automatic Reader review capture separate from foreground speech suppression', () => {
  const renderer = source('renderer/renderer.js');
  const automatic = functionBlock(
    renderer,
    'function announceNativeReaderOutputLine(value)',
    'function legacySettingsSnapshot()'
  );

  assert.match(automatic, /if \(!readerSpeechAllowedInCurrentFocus\(\)\) return false/u);
  assert.match(automatic, /requestNativeReaderTransport\(text, \{ interrupt: false \}, fallback\)/u);
  assert.match(automatic, /nativeReaderOutputApi\.notifyNativeReaderOutput/u);

  // The established session-runtime callback remains the completed-line entry
  // point; Reader Review storage itself is independent of whether live speech
  // is currently foreground-suppressed.
  assert.match(renderer, /onReaderLine: localDisplay \? undefined : \(line\) => announceNativeReaderOutputLine\(line\)/u);
});
