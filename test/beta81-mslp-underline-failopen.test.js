'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mslp = require('../src/mslp-links');

test('Beta.81 regression: ordinary ANSI underline closed by reset cannot wedge the session', () => {
  const translator = new mslp.MslpTranslator();
  const reported = 'M 51. a \x1b[4mbad\x1b[0m mechanic - [27113] A hallway\r\n';

  assert.equal(translator.push(reported), reported);
  assert.equal(translator.push('NEXT LINE\r\n'), 'NEXT LINE\r\n');
});

test('Beta.81 regression: ordinary underline reset variants fail open unchanged', () => {
  for (const reset of ['\x1b[0m', '\x1b[m', '\x1b[0;37m', '\x1b[24;37m']) {
    const translator = new mslp.MslpTranslator();
    const source = `before \x1b[4mbad${reset} after\r\n`;
    assert.equal(translator.push(source), source, `reset ${JSON.stringify(reset)}`);
    assert.equal(translator.push('still flowing\r\n'), 'still flowing\r\n');
  }
});

test('Beta.81 regression: split ordinary ANSI reset cannot leave MSLP buffering active', () => {
  const translator = new mslp.MslpTranslator();

  assert.equal(translator.push('before \x1b[4mbad\x1b'), 'before ');
  assert.equal(translator.push('[0m after\r\n'), '\x1b[4mbad\x1b[0m after\r\n');
  assert.equal(translator.push('next\r\n'), 'next\r\n');
});

test('Beta.81 regression: malformed simple links fail open at newline and length ceiling', () => {
  const newline = new mslp.MslpTranslator();
  const line = 'before \x1b[4munclosed link\r\nnext';
  assert.equal(newline.push(line), line);
  assert.equal(newline.push(' again'), ' again');

  const bounded = new mslp.MslpTranslator();
  const oversized = 'x'.repeat(1025);
  const output = bounded.push(`before \x1b[4m${oversized} after`);
  assert.match(output, /^before \x1b\[4m/);
  assert.match(output, / after$/);
  assert.equal(bounded.push(' next'), ' next');
});

test('Beta.81 regression: exact MSLP simple-link delimiters still create protected links', () => {
  const translator = new mslp.MslpTranslator();
  const simple = translator.push('go \x1b[4mnorth\x1b[24m now');

  assert.match(simple, /nukefire-mslp-send:north/u);
  assert.match(simple, /\x1b\[4mnorth\x1b\[24m/u);
  assert.match(simple, / now$/u);
});

test('Beta.81 regression: split exact MSLP close remains valid', () => {
  const translator = new mslp.MslpTranslator();

  assert.equal(translator.push('go \x1b[4mnor'), 'go ');
  assert.equal(translator.push('th\x1b['), '');
  const final = translator.push('24m now');

  assert.match(final, /nukefire-mslp-send:north/u);
  assert.match(final, / now$/u);
});

test('Beta.81 regression: complex SEND still survives the fail-open hardening', () => {
  const translator = new mslp.MslpTranslator();
  const output = translator.push(
    '\x1b]68;1;SEND;look\x07\x1b[4mLook\x1b[24m'
  );

  assert.match(output, /nukefire-mslp-send:look/u);
  assert.match(output, /Look/u);
});
