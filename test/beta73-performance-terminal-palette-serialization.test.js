const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runsToAnsi } = require('../renderer/xterm-adapter');

test('basic ANSI palette runs use compact SGR codes while preserving bold-bright semantics', () => {
  assert.equal(
    runsToAnsi([{ text: 'red', style: { fg: '#aa0000', fgBasicIndex: 1, bold: false } }]),
    '\x1b[0m\x1b[31mred\x1b[0m'
  );
  assert.equal(
    runsToAnsi([{ text: 'bright red', style: { fg: '#aa0000', fgBasicIndex: 1, bold: true } }]),
    '\x1b[0m\x1b[1;91mbright red\x1b[0m'
  );
  assert.equal(
    runsToAnsi([{ text: 'bright cyan', style: { fg: '#55ffff', fgBasicIndex: 14 } }]),
    '\x1b[0m\x1b[96mbright cyan\x1b[0m'
  );
  assert.equal(
    runsToAnsi([{ text: 'background', style: { bg: '#aa0000', bgBasicIndex: 1 } }]),
    '\x1b[0m\x1b[38;2;211;215;220;41mbackground\x1b[0m'
  );
});

test('truecolor, extended colors, and monochrome selected foreground remain explicit RGB', () => {
  assert.equal(
    runsToAnsi([{ text: 'rgb', style: { fg: 'rgb(1, 2, 3)', fgBasicIndex: null } }]),
    '\x1b[0m\x1b[38;2;1;2;3mrgb\x1b[0m'
  );
  assert.equal(
    runsToAnsi([{ text: 'mono', style: { fg: '#aa0000', fgBasicIndex: 1, bold: true } }], { monochrome: true, defaultForeground: '#c0ffee' }),
    '\x1b[0m\x1b[38;2;192;255;238mmono\x1b[0m'
  );
});

test('terminal serializer chooses the compact palette path before RGB expansion', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'xterm-adapter.js'), 'utf8');
  const start = source.indexOf('function styleCodes(');
  const end = source.indexOf('function normalizeTranscriptText(', start);
  const body = source.slice(start, end);
  assert.match(body, /fgBasic = basicForeground\(effectiveIndex\)/u);
  assert.match(body, /if \(fgBasic !== null\) codes\.push\(fgBasic\)/u);
  assert.match(body, /const bgBasic = Number\.isInteger\(style\.bgBasicIndex\) \? basicBackground\(style\.bgBasicIndex\) : null/u);
  assert.match(body, /legacyDefaultBackground = basicBackground\(style\.bgBasicIndex\)/u);
});
