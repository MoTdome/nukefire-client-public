'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ansi = require('../src/ansi-parser');
const runtimeApi = require('../src/session-runtime');

test('ANSI parser batches ordinary text runs while preserving split control state', () => {
  const detailed = new ansi.AnsiParser();
  const legacy = new ansi.AnsiParser();
  const chunks = [
    'plain '.repeat(2048) + '\u001b[38;5;',
    '196mred text\u001b[0m and ',
    '\u001b]8;;send:look\u001b\\linked',
    ' text\u001b]8;;\u001b\\ done\r\n'
  ];

  for (const chunk of chunks) {
    const result = detailed.parseDetailed(chunk);
    const runs = legacy.parse(chunk);
    assert.deepEqual(result.runs, runs);
    assert.equal(result.plainText, runs.map((run) => run.text).join(''));
    assert.deepEqual(detailed.state, legacy.state);
    assert.equal(detailed.pending, legacy.pending);
    assert.equal(detailed.link, legacy.link);
  }
});

test('ordinary ANSI parsing uses contiguous text search instead of character accumulation', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'ansi-parser.js'), 'utf8');
  assert.match(source, /text\.indexOf\('\\x1b', i\)/);
  assert.doesNotMatch(source, /plain \+= text\[i\]/);
});

test('SessionRuntime reuses parser plain text when display transforms are identity', () => {
  class DetailedAnsi {
    parseDetailed(raw) {
      assert.equal(raw, '\u001b[31mfast\u001b[0m\n');
      return {
        runs: [{ text: 'fast\n', style: null }],
        plainText: 'fast\n'
      };
    }
    parse() {
      throw new Error('legacy parse path should not run');
    }
  }

  const runtime = runtimeApi.createSessionRuntime(
    { id: 'fast-path' },
    { ansiApi: { AnsiParser: DetailedAnsi } }
  );

  const result = runtimeApi.appendText(runtime, '\u001b[31mfast\u001b[0m\n', {
    stripAnsi: () => { throw new Error('stripAnsi should not run for transformed plain identity'); },
    useTransformedPlainText: true,
    returnDetails: true,
    transformRuns: (runs) => runs
  });

  assert.equal(result.plainText, 'fast\n');
  assert.equal(result.sourcePlainText, 'fast\n');
  assert.equal(runtime.plainText, 'fast\n');
  assert.equal(runtime.lines, 1);
  assert.equal(runtime.readerCarry, '');
});

test('SessionRuntime still derives plain text from changed transformed runs', () => {
  const runtime = runtimeApi.createSessionRuntime(
    { id: 'transformed' },
    { ansiApi: ansi }
  );

  const result = runtimeApi.appendText(runtime, '\u001b[31mfoo\u001b[0m\r\n', {
    stripAnsi: ansi.stripAnsi,
    useTransformedPlainText: true,
    returnDetails: true,
    transformRuns: (runs) => runs.map((run) => ({ ...run, text: run.text.replaceAll('foo', 'bar') }))
  });

  assert.equal(result.plainText, 'bar\r\n');
  assert.equal(result.sourcePlainText, 'foo\r\n');
  assert.equal(runtime.plainText, 'bar\r\n');
  assert.equal(runtime.lines, 1);
  assert.equal(runtime.lastCompleteLine, 'bar');
});

test('renderer reuses SessionRuntime source plain text instead of stripping ANSI twice', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const start = renderer.indexOf('function appendMudTextChunk(text, options = {})');
  const end = renderer.indexOf('\nfunction highlightChunksForRecord', start);
  assert.ok(start >= 0 && end > start);
  const body = renderer.slice(start, end);

  assert.match(body, /runtimeResult\.sourcePlainText/u);
  assert.match(body, /updatePaginationState\(sourcePlain, \{ plainText: true \}\)/u);
  assert.match(body, /parseVitalsFromText\(raw, sourcePlain\)/u);
  assert.doesNotMatch(body, /const plain = window\.NukeFireAnsi\.stripAnsi\(raw\)/u);
});


test('renderer shares ANSI-parser source text with Communications on active and inactive sessions', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const activeStart = renderer.indexOf('function appendMudTextChunk(text, options = {})');
  const activeEnd = renderer.indexOf('\nfunction highlightChunksForRecord', activeStart);
  const active = renderer.slice(activeStart, activeEnd);
  assert.match(active, /captureCommunicationText\(raw, sourcePlain\)/u);

  const inactiveStart = renderer.indexOf('function appendTextToInactiveSession(record, text, options = {})');
  const inactiveEnd = renderer.indexOf('\nfunction flushInactiveHighlightText', inactiveStart);
  const inactive = renderer.slice(inactiveStart, inactiveEnd);
  assert.match(inactive, /returnDetails:\s*true/u);
  assert.match(inactive, /runtimeResult\.sourcePlainText/u);
  assert.match(inactive, /captureCommunicationTextForSession\(record, chunk, sourcePlain\)/u);
  assert.doesNotMatch(inactive, /const plain = window\.NukeFireAnsi\.stripAnsi\(chunk\)/u);
});
