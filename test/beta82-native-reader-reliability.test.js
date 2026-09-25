'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nativeReader = require('../src/native-reader-output');
const sessionRuntime = require('../src/session-runtime');

const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');

class Review {
  constructor() { this.lines = []; this.seq = 1; }
  appendLine(text) {
    const line = { seq: this.seq++, text };
    this.lines.push(line);
    return line;
  }
  clear() { this.lines = []; }
}

function runtime() {
  return sessionRuntime.createSessionRuntime({ id: 'native-reader-test' }, {
    ansiApi: {
      AnsiParser: class {
        parse(text) { return [{ text, style: null }]; }
      }
    },
    readerReviewApi: { ReaderReviewBuffer: Review },
    maxCharacters: 5000
  });
}

test('Beta.82 native output prefers ariaNotify and preserves call order', () => {
  const calls = [];
  const documentRef = {
    ariaNotify(text, options) {
      calls.push({ text, options });
    }
  };
  const fallbackElement = {
    ariaNotify() {
      throw new Error('document target must be preferred');
    }
  };

  const first = nativeReader.notifyNativeReaderOutput('Room Name', { documentRef, elementRef: fallbackElement });
  const second = nativeReader.notifyNativeReaderOutput('Room description.', { documentRef, elementRef: fallbackElement });
  const third = nativeReader.notifyNativeReaderOutput('Obvious exits: north', { documentRef, elementRef: fallbackElement });

  assert.equal(first.method, 'ariaNotify:document');
  assert.equal(second.method, 'ariaNotify:document');
  assert.equal(third.method, 'ariaNotify:document');
  assert.deepEqual(calls, [
    { text: 'Room Name', options: { priority: 'normal' } },
    { text: 'Room description.', options: { priority: 'normal' } },
    { text: 'Obvious exits: north', options: { priority: 'normal' } }
  ]);
});

test('Beta.82 native output falls through document failure to Element ariaNotify', () => {
  const calls = [];
  const result = nativeReader.notifyNativeReaderOutput('fallback target', {
    documentRef: { ariaNotify() { throw new Error('document notification unavailable'); } },
    elementRef: { ariaNotify(text, options) { calls.push({ text, options }); } }
  });

  assert.equal(result.announced, true);
  assert.equal(result.method, 'ariaNotify:element');
  assert.deepEqual(calls, [{ text: 'fallback target', options: { priority: 'normal' } }]);
});

test('Beta.82 bare greater-than prompt is suppressed even when ANSI styled', () => {
  assert.equal(nativeReader.isBarePrompt('>'), true);
  assert.equal(nativeReader.isBarePrompt('  >  '), true);
  assert.equal(nativeReader.isBarePrompt('\x1b[36m>\x1b[0m'), true);
  assert.equal(nativeReader.isBarePrompt('\u009b36m>\u009b0m'), true);
  assert.equal(nativeReader.isBarePrompt('< 100H 100M >'), false);
  assert.equal(nativeReader.isBarePrompt('Ready >'), false);

  let calls = 0;
  const suppressed = nativeReader.notifyNativeReaderOutput('\x1b[32m>\x1b[0m', {
    documentRef: { ariaNotify() { calls += 1; } }
  });
  assert.equal(suppressed.announced, false);
  assert.equal(suppressed.method, 'suppressed');
  assert.equal(calls, 0);
});

test('Beta.82 session Reader filter drops a bare prompt without losing surrounding lines', () => {
  const record = runtime();
  const announced = [];
  const include = (line) => !nativeReader.isBarePrompt(line);

  sessionRuntime.appendText(record, 'The Rusted Atrium\n>\nA cracked sign hangs here.\n', {
    stripAnsi: (value) => value,
    onReaderLine: (line) => announced.push(line),
    shouldIncludeReaderLine: include
  });

  assert.deepEqual(announced, ['The Rusted Atrium', 'A cracked sign hangs here.']);
  assert.deepEqual(
    record.readerReview.lines.map((line) => line.text),
    ['The Rusted Atrium', 'A cracked sign hangs here.']
  );

  sessionRuntime.appendText(record, '>', {
    stripAnsi: (value) => value,
    onReaderLine: (line) => announced.push(line),
    shouldIncludeReaderLine: include
  });
  sessionRuntime.commitBoundary(record, {
    onReaderLine: (line) => announced.push(line),
    shouldIncludeReaderLine: include
  });

  assert.deepEqual(announced, ['The Rusted Atrium', 'A cracked sign hangs here.']);
  assert.equal(record.readerCarry, '');
  assert.equal(record.lastCompleteLine, 'A cracked sign hangs here.');
});

test('Beta.82 removes the noisy output-region accessible name but retains live fallback semantics', () => {
  const html = source('renderer/index.html');
  assert.match(html, /id="sr-output-announcer"[^>]*role="log"[^>]*aria-live="polite"/u);
  assert.doesNotMatch(html, /aria-label="New NukeFire output"/u);
  assert.match(html, /src="\.\.\/src\/native-reader-output\.js"/u);
});

test('Beta.82 renderer uses ariaNotify helper first and retains the legacy live-region fallback', () => {
  const renderer = source('renderer/renderer.js');
  const start = renderer.indexOf('function announceNativeReaderOutputLine(value)');
  const end = renderer.indexOf('\n\nfunction legacySettingsSnapshot()', start);
  assert.ok(start >= 0 && end > start);
  const block = renderer.slice(start, end);

  assert.match(block, /nativeReaderOutputApi\.notifyNativeReaderOutput/u);
  assert.match(block, /documentRef:\s*document/u);
  assert.match(block, /elementRef:\s*readerOutputAnnouncer/u);
  assert.match(block, /if \(result\?\.announced\) return true/u);
  assert.match(block, /document\.createElement\('div'\)/u);
  assert.match(block, /readerOutputAnnouncer\.append\(line\)/u);
});

test('Beta.82 wires the bare-prompt filter to newline and GA/EOR Reader commits', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /function shouldIncludeNativeReaderLine\(value\)/u);
  assert.match(
    renderer,
    /shouldIncludeReaderLine:\s*localDisplay \? undefined : \(line\) => shouldIncludeNativeReaderLine\(line\)/u
  );
  assert.match(
    renderer,
    /commitBoundary\?\.\(record,\s*\{[\s\S]*?shouldIncludeReaderLine:\s*\(line\) => shouldIncludeNativeReaderLine\(line\)[\s\S]*?onReaderLine:/u
  );
});

test('Beta.82 normal verification owns the new native Reader helper', () => {
  const pkg = JSON.parse(source('package.json'));
  assert.match(pkg.scripts.check, /node --check src\/native-reader-output\.js/u);
});
