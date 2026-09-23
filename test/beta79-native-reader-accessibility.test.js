'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sessionRuntime = require('../src/session-runtime');
const readerPresets = require('../src/reader-presets');
const { TUTORIAL_STEPS, AUDIO_TUTORIAL_STEPS } = require('../src/reader-onboarding');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Beta.79 Native Reader help is platform-correct and output-first', () => {
  const html = source('renderer/index.html');
  assert.match(html, /Windows and Linux, Control Shift O/u);
  assert.match(html, /macOS, use Command instead of Control/u);
  assert.match(html, /id="sr-output-announcer"[^>]*role="log"/u);
  assert.match(html, /id="reader-workspace-output-heading">MUD Output/u);
});

test('Beta.79 essentials teach raw MUD output first', () => {
  assert.equal(TUTORIAL_STEPS.length, 5);
  assert.deepEqual(TUTORIAL_STEPS.map((step) => step.expectedAction), ['line-latest','line-previous','line-current','line-next','last-tell']);
  assert.match(TUTORIAL_STEPS.find((step) => step.id === 'line-previous').text, /Press F eight/u);
  assert.doesNotMatch(TUTORIAL_STEPS.find((step) => step.id === 'line-previous').text, /Press F8/u);
  const all = [...TUTORIAL_STEPS, ...AUDIO_TUTORIAL_STEPS].map((step) => step.text).join('\n');
  assert.doesNotMatch(all, /\bC R\b/u);
  assert.match(all, /CR TUTORIAL/u);
  assert.match(all, /CR LINES/u);
});

test('Beta.79 F8 family reviews exact terminal lines', () => {
  const byLabel = new Map(readerPresets.readerHotkeyRecords().map((record) => [record.label, record]));
  assert.deepEqual(byLabel.get('F8').semantic, { type: 'reader-review', id: 'previous' });
  assert.deepEqual(byLabel.get('Shift+F8').semantic, { type: 'reader-review', id: 'current' });
  assert.deepEqual(byLabel.get('F9').semantic, { type: 'reader-review', id: 'next' });
  assert.deepEqual(byLabel.get('F10').semantic, { type: 'reader-review', id: 'latest' });
  assert.deepEqual(byLabel.get('Alt+Down').semantic, { type: 'reader-history', id: 'category-next' });
});

test('Beta.79 session runtime emits only newly completed Reader lines', () => {
  class Review { constructor(){this.lines=[];this.seq=1;} appendLine(text){const line={seq:this.seq++,text};this.lines.push(line);return line;} clear(){this.lines=[];} }
  const runtime = sessionRuntime.createSessionRuntime({ id: 'main' }, {
    ansiApi: { AnsiParser: class { parse(text) { return [{ text, style: null }]; } } },
    readerReviewApi: { ReaderReviewBuffer: Review }, maxCharacters: 5000
  });
  const announced = [];
  sessionRuntime.appendText(runtime, 'alpha\nbeta\npartial', { stripAnsi: (value) => value, onReaderLine: (line) => announced.push(line) });
  assert.deepEqual(announced, ['alpha','beta']);
  sessionRuntime.commitBoundary(runtime, { onReaderLine: (line) => announced.push(line) });
  assert.deepEqual(announced, ['alpha','beta','partial']);
});

test('Beta.79 owns native live output while keeping xterm accessibility rows', () => {
  const renderer = source('renderer/renderer.js');
  const xterm = source('renderer/xterm-adapter.js');
  assert.match(renderer, /function announceNativeReaderOutputLine/u);
  assert.match(renderer, /onReaderLine: localDisplay \? undefined : \(line\) => announceNativeReaderOutputLine\(line\)/u);
  assert.match(xterm, /syncScreenReaderLiveRegion/u);
  assert.match(xterm, /setAttribute\('aria-live', 'off'\)/u);
  assert.match(xterm, /setAttribute\('aria-hidden', 'true'\)/u);
});

test('Beta.79 CR tutorial and line review are local while disconnected', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /function parseLocalReaderCommand/u);
  assert.match(renderer, /kind: 'tutorial'/u);
  assert.match(renderer, /kind: 'lines'/u);
  assert.match(renderer, /const localReaderCommand = parseLocalReaderCommand\(command\)/u);
  assert.match(renderer, /const hasServerCommands = !localReaderCommand/u);
});

test('Beta.79 Native Reader retained command is visible but not selected', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /state\.commandInputShowingLastSent = showSentCommand/u);
  assert.match(renderer, /state\.accessibility\.screenReaderMode[\s\S]*?setSelectionRange\(commandInput\.value\.length, commandInput\.value\.length\)/u);
  assert.match(renderer, /state\.paginationPending && displayedLastCommand/u);
});

test('Beta.79 repeated identical completed lines remain separate Reader events', () => {
  class Review {
    constructor(){ this.lines=[]; this.seq=1; }
    appendLine(text){ const line={seq:this.seq++,text}; this.lines.push(line); return line; }
    clear(){ this.lines=[]; }
  }
  const runtime = sessionRuntime.createSessionRuntime({ id: 'repeat-lines' }, {
    ansiApi: { AnsiParser: class { parse(text) { return [{ text, style: null }]; } } },
    readerReviewApi: { ReaderReviewBuffer: Review }, maxCharacters: 5000
  });
  const announced = [];
  sessionRuntime.appendText(runtime, 'same line\nsame line\nsame line\n', {
    stripAnsi: (value) => value,
    onReaderLine: (line) => announced.push(line)
  });
  assert.deepEqual(announced, ['same line', 'same line', 'same line']);
  assert.deepEqual(runtime.readerReview.lines.map((line) => line.text), ['same line', 'same line', 'same line']);
});
