'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Beta.85 exposes Native Reader status, test, stop, and reconnect without changing automatic output routing', () => {
  const main = source('main.js');
  const preload = source('preload.js');
  const renderer = source('renderer/renderer.js');

  assert.match(main, /native-reader:reconnect/u);
  assert.match(preload, /nativeReaderReconnect/u);

  assert.match(renderer, /function parseNativeReaderControlCommand/u);
  assert.match(renderer, /function handleNativeReaderControlCommand/u);
  assert.match(renderer, /reader\s+\{status\|test\|stop\|reconnect\}/u);
  assert.match(renderer, /nativeReaderReconnect/u);
  assert.match(renderer, /nativeReaderStop/u);
  assert.match(renderer, /nativeReaderSpeak/u);
  assert.match(renderer, /getNativeReaderStatus/u);

  const automaticStart = renderer.indexOf('function announceNativeReaderOutputLine(value)');
  const automaticEnd = renderer.indexOf('function legacySettingsSnapshot', automaticStart);
  const automatic = renderer.slice(automaticStart, automaticEnd);
  assert.match(automatic, /requestNativeReaderTransport\(text, \{ interrupt: false \}, fallback\)/u);
  assert.match(automatic, /nativeReaderOutputApi\.notifyNativeReaderOutput/u);
  assert.match(automatic, /readerOutputAnnouncer\.append\(line\)/u);

  const announceStart = renderer.indexOf('function announce(message, options = {})');
  const announceEnd = renderer.indexOf('function shouldIncludeNativeReaderLine', announceStart);
  const manual = renderer.slice(announceStart, announceEnd);
  assert.doesNotMatch(manual, /requestNativeReaderTransport/u);
  assert.match(manual, /queueMicrotask/u);
});

test('Beta.85 Native Reader help documents the local diagnostic controls', () => {
  const help = source('src/client-command-help.js');
  assert.match(help, /name: 'reader'/u);
  assert.match(help, /reader \{status\|test\|stop\|reconnect\}/u);
  assert.match(help, /ACCESSIBILITY[\s\S]*reader/u);
});

test('Beta.85 bridge hardening includes forced reconnect and stale-child protection', () => {
  const bridge = source('src/native-reader-bridge.js');

  assert.match(bridge, /async reconnect\(\)/u);
  assert.match(bridge, /sourceChild && sourceChild !== this\.child/u);
  assert.match(bridge, /this\._onChildFailure\(child,/u);
  assert.match(
    bridge,
    /\['backend-failed', 'helper-unavailable', 'timeout', 'write-failed'\]\.includes\(response\.code\)/u
  );
  assert.match(bridge, /lastFailure/u);
  assert.match(bridge, /lastConnectedAt/u);
  assert.match(bridge, /reconnects/u);
});
