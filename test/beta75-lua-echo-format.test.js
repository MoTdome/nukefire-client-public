'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sanitizeLuaEchoSource,
  formatCecho,
  formatDecho,
  formatHecho,
  plainLuaEcho
} = require('../src/lua-echo-format');

test('cecho converts familiar named foreground/background tags to bounded ANSI SGR', () => {
  const rendered = formatCecho('<red>Danger<reset> <blue:yellow>Warning');
  assert.match(rendered, /\x1b\[31mDanger\x1b\[0m/u);
  assert.match(rendered, /\x1b\[34m\x1b\[43mWarning/u);
  assert.ok(rendered.endsWith('\x1b[0m'));
  assert.doesNotMatch(rendered, /<red>|<blue:yellow>/u);
});

test('cecho supports ansi_NNN and leaves unknown tags visible rather than eating text', () => {
  const rendered = formatCecho('<ansi_196>hot<reset> <not_a_nukefire_color>tag');
  assert.match(rendered, /\x1b\[38;5;196mhot/u);
  assert.match(rendered, /<not_a_nukefire_color>tag/u);
});

test('decho renders decimal RGB foreground/background and style tags', () => {
  const rendered = formatDecho('<255,0,0:0,0,64><b>Danger</b><r>');
  assert.match(rendered, /\x1b\[38;2;255;0;0m/u);
  assert.match(rendered, /\x1b\[48;2;0;0;64m/u);
  assert.match(rendered, /\x1b\[1mDanger\x1b\[22m/u);
});

test('hecho renders hex foreground/background plus Mudlet-style formatting toggles', () => {
  const rendered = formatHecho('#00FF00,000040#bHealthy#/b#r');
  assert.match(rendered, /\x1b\[38;2;0;255;0m/u);
  assert.match(rendered, /\x1b\[48;2;0;0;64m/u);
  assert.match(rendered, /\x1b\[1mHealthy\x1b\[22m\x1b\[0m/u);
});


test('hecho treats six hex digits as color before one-letter style tokens', () => {
  const rendered = formatHecho('#BEEF00chart#r');
  assert.match(rendered, /\x1b\[38;2;190;239;0mchart/u);
  assert.doesNotMatch(rendered, /\x1b\[1mEEF00/u);
});

test('formatted output remains reset at the bounded output ceiling', () => {
  const rendered = formatCecho(`<red>${'x'.repeat(40000)}`);
  assert.ok(rendered.length <= 65536);
  assert.ok(rendered.endsWith('\x1b[0m'));
});
test('real NukeFire Mudlet package orange_red renders while plain projection keeps Beta.74 echo args', () => {
  const source = '[<orange_red>NF<reset>] hello\n';
  const formatted = formatCecho(source);
  assert.match(formatted, /\x1b\[38;2;255;69;0mNF/u);
  assert.equal(plainLuaEcho('cecho', source), '[NF] hello\n');
});

test('formatted echo source cannot inject raw terminal escape/control sequences', () => {
  const source = '\x1b]0;bad\x07Hello\x9dmore-bad\x1b[31mWorld\r\n';
  const clean = sanitizeLuaEchoSource(source);
  assert.equal(clean, ']0;badHellomore-bad[31mWorld\n');
  const rendered = formatCecho(`<red>${source}<reset>`);
  assert.doesNotMatch(rendered, /\x1b\]/u);
  assert.doesNotMatch(rendered, /\x07/u);
  assert.match(rendered, /\x1b\[31m/u);
});
