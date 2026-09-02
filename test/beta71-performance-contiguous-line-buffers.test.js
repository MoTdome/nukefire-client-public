'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ActionLineBuffer } = require('../src/action-engine');
const { GagLineFilter } = require('../src/gag-engine');
const { HighlightLineBuffer } = require('../src/highlight-engine');
const { SoundTriggerEngine } = require('../src/sound-trigger-engine');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
}

test('Beta.71 incoming line buffers scan contiguous spans instead of every JavaScript character', () => {
  for (const relative of [
    'src/action-engine.js',
    'src/gag-engine.js',
    'src/highlight-engine.js',
    'src/sound-trigger-engine.js'
  ]) {
    const text = source(relative);
    assert.doesNotMatch(text, /for\s*\(\s*const\s+character\s+of\s+input\s*\)/u, relative);
    assert.match(text, /input\.indexOf\('\\n', cursor\)/u, relative);
  }
});

test('contiguous Action and Highlight buffers preserve fragmentation and overlong-line semantics', () => {
  const actions = new ActionLineBuffer({ maxLineLength: 256 });
  assert.deepEqual(actions.push('alpha\r'), []);
  assert.deepEqual(actions.push('\nbeta\n'), ['alpha', 'beta']);
  assert.deepEqual(actions.push(`${'x'.repeat(257)}still ignored\nOK\n`), ['OK']);

  const highlights = new HighlightLineBuffer({ maxLineLength: 256 });
  assert.deepEqual(highlights.push('Warn', true), []);
  assert.deepEqual(highlights.push('ing\nNext', true), ['Warning\n']);
  assert.equal(highlights.flush(), 'Next');
  const oversized = highlights.push(`${'y'.repeat(300)}\nTail\n`, true);
  assert.equal(oversized.map((part) => part).join(''), `${'y'.repeat(300)}\nTail\n`);
  assert.equal(oversized[0].length, 257);
  assert.equal(highlights.passthrough, false);
});

test('contiguous Gag buffering remains fail-open for oversized lines and preserves matching raw bytes', () => {
  const filter = new GagLineFilter({ maxLineLength: 256 });
  const shouldGag = (line) => line === 'HIDE';
  let result = filter.push('KEEP\r\nHI', shouldGag);
  assert.deepEqual(result, { text: 'KEEP\r\n', gaggedText: '', gagged: 0 });
  result = filter.push(`DE\n${'z'.repeat(300)}\nSHOW\n`, shouldGag);
  assert.equal(result.gagged, 1);
  assert.equal(result.gaggedText, 'HIDE\n');
  assert.equal(result.text, `${'z'.repeat(300)}\nSHOW\n`);
});

test('contiguous Sound Trigger buffering preserves complete-line routing, suppression, and oversized discard', () => {
  const played = [];
  const engine = new SoundTriggerEngine({
    settings: {
      definitions: [
        { id: 'danger', pattern: '^DANGER$', cueId: 'danger', cooldownMs: 0, suppressSelfVoice: true }
      ]
    }
  });
  engine.maxLineLength = 256;

  assert.deepEqual(engine.processChunk('main', 'DAN', { now: 1000, playCue: (cue) => { played.push(cue); return true; } }).events, []);
  let result = engine.processChunk('main', 'GER\r\nquiet\n', { now: 1001, playCue: (cue) => { played.push(cue); return true; } });
  assert.deepEqual(played, ['danger']);
  assert.equal(result.speechText, 'quiet\n');
  assert.equal(result.events.length, 2);
  assert.equal(result.events[0].suppressSelfVoice, true);

  result = engine.processChunk('main', `${'q'.repeat(300)}\nDANGER\n`, { now: 1002, playCue: (cue) => { played.push(cue); return true; } });
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].line, 'DANGER');
  assert.deepEqual(played, ['danger', 'danger']);
});
