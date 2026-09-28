'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');

function functionBlock(sourceText, startNeedle, endNeedle) {
  const start = sourceText.indexOf(startNeedle);
  const end = sourceText.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0 && end > start, `${startNeedle} block must remain inspectable`);
  return sourceText.slice(start, end);
}

test('Beta.83 wires supervised Native Reader bridge through main and preload', () => {
  const main = source('main.js');
  const preload = source('preload.js');

  assert.match(main, /NativeReaderBridge/u);
  assert.match(main, /native-reader:status/u);
  assert.match(main, /native-reader:output/u);
  assert.match(main, /native-reader:speak/u);
  assert.match(main, /native-reader:stop/u);
  assert.match(main, /nativeReaderBridge\?\.close\?\.\(\)/u);

  assert.match(preload, /getNativeReaderStatus/u);
  assert.match(preload, /nativeReaderOutput/u);
  assert.match(preload, /nativeReaderSpeak/u);
  assert.match(preload, /nativeReaderStop/u);
});

test('Beta.83 transport helper owns the Electron call and asynchronous fallback contract', () => {
  const renderer = source('renderer/renderer.js');
  const block = functionBlock(
    renderer,
    'function requestNativeReaderTransport(text, options = {}, fallback = null)',
    'function announce(message, options = {})'
  );

  assert.match(block, /window\.nukefire\?\.nativeReaderOutput/u);
  assert.match(block, /window\.nukefire\.nativeReaderOutput/u);
  assert.match(block, /interrupt:\s*options\.interrupt === true/u);
  assert.match(block, /fallback\?\.\(result\)/u);
  assert.match(block, /catch\(\(\) => fallback\?\.\(\)\)/u);
});

test('Beta.83 automatic completed MUD output prefers native transport and keeps Beta.82 fallback inline', () => {
  const renderer = source('renderer/renderer.js');
  const block = functionBlock(
    renderer,
    'function announceNativeReaderOutputLine(value)',
    'function legacySettingsSnapshot()'
  );

  assert.match(block, /requestNativeReaderTransport\(text, \{ interrupt: false \}, fallback\)/u);
  assert.match(block, /nativeReaderOutputApi\.notifyNativeReaderOutput/u);
  assert.match(block, /document\.createElement\('div'\)/u);
  assert.match(block, /readerOutputAnnouncer\.append\(line\)/u);
});

test('Beta.83 leaves manual Reader/UI announcements on the established Beta.82 announcer path', () => {
  const renderer = source('renderer/renderer.js');
  const block = functionBlock(
    renderer,
    'function announce(message, options = {})',
    'function shouldIncludeNativeReaderLine'
  );

  assert.doesNotMatch(block, /requestNativeReaderTransport|nativeReaderOutput/u);
  assert.match(block, /const target = interrupt && interruptAnnouncer \? interruptAnnouncer : announcer/u);
  assert.match(block, /queueMicrotask/u);
  assert.match(block, /target\.textContent = text/u);
});

test('Beta.83 Windows build pins PRISM and only enables direct NVDA and JAWS', () => {
  const cmake = source('native/reader-bridge/CMakeLists.txt');
  const cpp = source('native/reader-bridge/main.cpp');

  assert.match(cmake, /GIT_TAG v0\.18\.2/u);
  assert.match(cmake, /PRISM_BACKEND_DEFAULT OFF/u);
  assert.match(cmake, /PRISM_ENABLE_NVDA_BACKEND ON/u);
  assert.match(cmake, /PRISM_ENABLE_JAWS_BACKEND ON/u);
  assert.match(cmake, /BUILD_SHARED_LIBS OFF/u);

  assert.match(cpp, /PRISM_BACKEND_NVDA/u);
  assert.match(cpp, /PRISM_BACKEND_JAWS/u);
  assert.match(cpp, /prism_backend_output/u);
  assert.match(cpp, /prism_backend_speak/u);
  assert.match(cpp, /prism_backend_stop/u);
  assert.doesNotMatch(cpp, /PRISM_BACKEND_SAPI|PRISM_BACKEND_ONE_CORE/u);
});

test('Beta.83 Windows dist builds and packages isolated helper', () => {
  const pkg = JSON.parse(source('package.json'));
  assert.match(pkg.scripts['native-reader:win'], /build-native-reader-bridge/u);
  assert.match(pkg.scripts['dist:win'], /npm run native-reader:win/u);
  assert.match(pkg.scripts.check, /src\/native-reader-bridge\.js/u);
  assert.match(pkg.scripts.check, /scripts\/build-native-reader-bridge\.js/u);

  const extras = pkg.build?.win?.extraResources || [];
  assert.ok(extras.some((entry) => String(entry.from).includes('nukefire-reader-bridge.exe')));
  assert.ok(extras.some((entry) => String(entry.from).includes('licenses')));
});
