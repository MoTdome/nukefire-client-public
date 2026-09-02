'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AnsiParser, stripAnsi, xtermColor } = require('../src/ansi-parser');

test('parses standard colors and reset across chunks', () => {
  const parser = new AnsiParser();
  const first = parser.parse('plain \u001b[31mred');
  const second = parser.parse(' still\u001b[0m normal');
  assert.equal(first[0].text, 'plain ');
  assert.equal(first[1].style.fg, '#aa0000');
  assert.equal(second[0].style.fg, '#aa0000');
  assert.equal(second[1].style.fg, null);
});

test('holds incomplete escape sequences until the next chunk', () => {
  const parser = new AnsiParser();
  const first = parser.parse('A\u001b[38;5;');
  const second = parser.parse('196mB');
  assert.equal(first.map((run) => run.text).join(''), 'A');
  assert.equal(second[0].text, 'B');
  assert.equal(second[0].style.fg, xtermColor(196));
});

test('supports true color', () => {
  const parser = new AnsiParser();
  const runs = parser.parse('\u001b[38;2;12;34;56mX');
  assert.equal(runs[0].style.fg, 'rgb(12, 34, 56)');
});

test('strips CSI and OSC sequences', () => {
  const text = '\u001b[31mRed\u001b[0m \u001b]0;title\u0007Done';
  assert.equal(stripAnsi(text), 'Red Done');
});


test('preserves safe OSC 8 link metadata across chunks and closes unsafe links', () => {
  const parser = new AnsiParser();
  const first = parser.parse('A\u001b]8;;send:look\u001b\\Lo');
  const second = parser.parse('ok\u001b]8;;\u001b\\ plain \u001b]8;;javascript:bad\u001b\\Bad');
  assert.equal(first[0].link, null);
  assert.equal(first[1].text, 'Lo');
  assert.equal(first[1].link, 'send:look');
  assert.equal(second[0].text, 'ok');
  assert.equal(second[0].link, 'send:look');
  assert.equal(second[1].text, ' plain ');
  assert.equal(second[1].link, null);
  assert.equal(second[2].text, 'Bad');
  assert.equal(second[2].link, null);
});
