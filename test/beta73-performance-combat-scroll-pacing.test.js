'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  chunkRunsForPresentation,
  presentationChunkLimit,
  runsToAnsi,
  XtermTerminalAdapter
} = require('../renderer/xterm-adapter');

const root = path.resolve(__dirname, '..');

class ManualTerminal {
  constructor(options) {
    this.options = { ...options };
    this.cols = 100;
    this.rows = 40;
    this.writes = [];
    this.callbacks = [];
    this.scrolls = 0;
    this.resets = 0;
    this.clears = 0;
    this.buffer = { active: { viewportY: 20, baseY: 20 } };
  }
  open() {}
  write(data, callback) { this.writes.push(data); this.callbacks.push(callback); }
  scrollToBottom() { this.scrolls += 1; }
  reset() { this.resets += 1; }
  clear() { this.clears += 1; }
  dispose() {}
}

function pacingHarness(options = {}) {
  const frames = [];
  const adapter = new XtermTerminalAdapter({
    container: {},
    TerminalCtor: ManualTerminal,
    schedulePresentationFrame: (callback) => { frames.push(callback); return frames.length; },
    cancelPresentationFrame: () => {},
    ...options
  });
  return {
    adapter,
    frames,
    finishWrite() {
      const callback = adapter.terminal.callbacks.shift();
      assert.equal(typeof callback, 'function');
      callback();
    },
    runFrame() {
      const callback = frames.shift();
      assert.equal(typeof callback, 'function');
      callback();
    }
  };
}

test('presentation chunks preserve exact transcript text and never split a surrogate pair', () => {
  const text = `${'a'.repeat(16383)}🧨${'b'.repeat(20000)}`;
  const chunks = chunkRunsForPresentation([{ text, style: { fgBasicIndex: 1 }, kind: 'mud' }], 10240);
  assert.equal(chunks.length, 4);
  assert.equal(chunks.flat().map((run) => run.text).join(''), text);
  for (const chunk of chunks) {
    const joined = chunk.map((run) => run.text).join('');
    assert.ok(joined.length <= 10240);
    const last = joined.charCodeAt(joined.length - 1);
    assert.ok(!(last >= 0xD800 && last <= 0xDBFF));
  }
});

test('presentation chunk limit bounds one large handoff while preserving the 10K steady-state target', () => {
  assert.equal(presentationChunkLimit(20_000, 0), 10_240);
  assert.ok(presentationChunkLimit(500_000, 0) >= Math.ceil(500_000 / 6));
  assert.equal(presentationChunkLimit(20_000, 70_000), 20_480);
});


test('moderately heavy bursts stay entirely on the historical immediate path', () => {
  const h = pacingHarness();
  const text = 'x'.repeat(12_000);
  h.adapter.writeRuns([{ text, style: null, kind: 'mud' }], { follow: true });
  assert.equal(h.adapter.terminal.writes.length, 1);
  assert.equal(h.frames.length, 0);
  h.finishWrite();
  assert.equal(h.adapter.writePerformanceSnapshot().presentationChunks, 0);
});

test('high-volume runs present the first chunk immediately and pace later chunks through animation opportunities', () => {
  const h = pacingHarness();
  const text = 'combat line\n'.repeat(4000);
  assert.ok(text.length > 32768);

  assert.equal(h.adapter.writeRuns([{ text, style: { fgBasicIndex: 1 }, kind: 'mud' }], { follow: true }), true);
  assert.equal(h.adapter.terminal.writes.length, 1, 'leading edge must be immediate');
  assert.equal(h.frames.length, 0, 'no frame is required before first presentation');

  h.finishWrite();
  assert.equal(h.frames.length, 1, 'next chunk waits for a presentation frame');
  assert.equal(h.adapter.terminal.writes.length, 1);

  h.runFrame();
  assert.equal(h.adapter.terminal.writes.length, 2);
  h.finishWrite();

  while (h.frames.length) {
    h.runFrame();
    h.finishWrite();
  }

  const snapshot = h.adapter.writePerformanceSnapshot();
  assert.ok(snapshot.presentationChunks >= 3);
  assert.equal(snapshot.presentationFrames, snapshot.presentationChunks - 1);
  assert.equal(snapshot.pendingCharacters, 0);
  assert.equal(snapshot.queuedOperations, 0);
  assert.equal(h.adapter.terminal.scrolls, snapshot.presentationChunks);

  const visibleText = h.adapter.terminal.writes.join('').replace(/\x1b\[[0-9;]*m/gu, '');
  assert.equal(visibleText, text);
});

test('screen-reader mode retains the single immediate xterm write path', () => {
  const h = pacingHarness({ screenReaderMode: true });
  const text = 'reader combat\n'.repeat(5000);
  h.adapter.writeRuns([{ text, style: null, kind: 'mud' }], { follow: true });
  assert.equal(h.adapter.terminal.writes.length, 1);
  assert.equal(h.frames.length, 0);
  h.finishWrite();
  assert.equal(h.adapter.writePerformanceSnapshot().presentationChunks, 0);
});

test('session replacement remains ordered behind a paced combat write', () => {
  const h = pacingHarness();
  const oldText = 'old combat\n'.repeat(5000);
  h.adapter.writeRuns([{ text: oldText, style: null, kind: 'mud' }]);
  h.adapter.replaceRuns([{ text: 'new session\n', style: null, kind: 'mud' }], { follow: true });
  assert.equal(h.adapter.terminal.resets, 0);

  while (true) {
    h.finishWrite();
    if (h.frames.length) {
      h.runFrame();
      continue;
    }
    break;
  }

  assert.equal(h.adapter.terminal.resets, 1);
  assert.equal(h.adapter.terminal.clears, 1);
  assert.match(h.adapter.terminal.writes.at(-1), /new session/u);
  h.finishWrite();
  assert.equal(h.adapter.writePerformanceSnapshot().queuedOperations, 0);
});

test('palette serialization is unchanged inside each presentation chunk', () => {
  const chunks = chunkRunsForPresentation([
    { text: 'R'.repeat(20000), style: { fgBasicIndex: 1, bold: true }, kind: 'mud' }
  ], 10240);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    const ansi = runsToAnsi(chunk);
    assert.match(ansi, /\x1b\[1;91m/u);
    assert.doesNotMatch(ansi, /38;2;255;85;85/u);
  }
});



test('a hyperlink split across presentation chunks is closed and reopened safely', () => {
  const chunks = chunkRunsForPresentation([
    { text: 'linked '.repeat(4000), style: { fgBasicIndex: 6 }, kind: 'mud', link: 'send:look' }
  ], 10240);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    const ansi = runsToAnsi(chunk);
    assert.match(ansi, /\x1b\]8;;send:look\x1b\\/u);
    assert.match(ansi, /\x1b\]8;;\x1b\\\x1b\[0m$/u);
  }
});

test('renderer keeps the 2 ms leading-edge flush and reports scroll-cadence diagnostics', () => {
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  assert.match(renderer, /const TERMINAL_IDLE_FLUSH_DELAY_MS = 2;/u);
  assert.match(renderer, /function noteTerminalScrollFlush\(now, characters\)/u);
  assert.match(renderer, /terminalFlushGapAverageMs/u);
  assert.match(renderer, /terminalFlushCharactersAverage/u);
  assert.match(renderer, /xtermPresentationGapAverageMs/u);
  assert.match(renderer, /xtermAdapter\?\.resetWritePerformance\?\.\(\);/u);
  assert.match(renderer, /experiment: 'beta73-combat-scroll-pacing-v1'/u);
  assert.doesNotMatch(renderer, /TERMINAL_FRAME_BATCH_THRESHOLD|TERMINAL_FRAME_CHARACTER_THRESHOLD|if \(heavyBurst\) return/u);
});
