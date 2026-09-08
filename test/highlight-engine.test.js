'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  HighlightEngine,
  HighlightLineBuffer,
  applyHighlightsToRuns,
  parseHighlightStyle
} = require('../src/highlight-engine');

test('highlight definitions normalize, sort by priority, toggle, persist, and preserve classes', () => {
  const engine = new HighlightEngine();
  assert.deepEqual(engine.define(' danger ', 'Red underline', 8, ' Combat '), {
    pattern: 'danger', style: 'Red underline', priority: 8, enabled: true,
    scope: 'global', className: 'combat'
  });
  engine.define('^Warning', '<ffa>', 2);
  assert.deepEqual(engine.list().map((record) => record.pattern), ['^Warning', 'danger']);
  assert.equal(engine.setHighlightEnabled('danger', false).enabled, false);

  const restored = new HighlightEngine();
  restored.restore(engine.snapshot());
  assert.deepEqual(restored.snapshot(), engine.snapshot());
  assert.equal(restored.delete('danger'), true);
  assert.equal(restored.get('danger'), null);
});

test('TinTin style names, attributes, backgrounds, and color codes compile safely', () => {
  const named = parseHighlightStyle('reverse underscore Jade b Green');
  assert.equal(named.error, '');
  assert.equal(named.style.inverse, true);
  assert.equal(named.style.underline, true);
  assert.equal(named.style.fg, '#55ffcc');
  assert.equal(named.style.bg, '#55ff55');

  const coded = parseHighlightStyle('<daa> b <acf>');
  assert.equal(coded.error, '');
  assert.equal(coded.style.fg, '#aa0000');
  assert.equal(coded.style.bg, '#55ddff');

  const truecolor12 = parseHighlightStyle('<F0F0><B500>');
  assert.equal(truecolor12.error, '');
  assert.equal(truecolor12.style.fg, '#00ff00');
  assert.equal(truecolor12.style.bg, '#550000');

  const truecolor24 = parseHighlightStyle('<F00FF00><B550000> underline');
  assert.equal(truecolor24.error, '');
  assert.equal(truecolor24.style.fg, '#00ff00');
  assert.equal(truecolor24.style.bg, '#550000');
  assert.equal(truecolor24.style.underline, true);

  const blink = parseHighlightStyle('blink Red');
  assert.equal(blink.error, '');
  assert.equal(blink.style.fg, '#ff5555');
  assert.match(parseHighlightStyle('Red b').error, /needs a color/u);
  assert.match(parseHighlightStyle('<F12>').error, /Unknown highlight style token/u);
  assert.match(parseHighlightStyle('<Bxyz>').error, /Unknown highlight style token/u);
  assert.match(parseHighlightStyle('not-a-color').error, /Unknown highlight style token/u);
});

test('adjacent TinTin truecolor highlights remain confined to the matched span', () => {
  const engine = new HighlightEngine();
  engine.define('CRITICAL', '<F0F0><B500>', 5);
  const output = applyHighlightsToRuns([
    { text: 'before CRITICAL after', style: { fg: '#abcdef', bg: '#123456', bold: true }, link: null }
  ], engine);
  assert.equal(output.map((run) => run.text).join(''), 'before CRITICAL after');
  const matched = output.find((run) => run.text === 'CRITICAL');
  assert.equal(matched.style.fg, '#00ff00');
  assert.equal(matched.style.bg, '#550000');
  assert.equal(output[0].style.fg, '#abcdef');
  assert.equal(output[0].style.bg, '#123456');
  assert.equal(output.at(-1).style.fg, '#abcdef');
  assert.equal(output.at(-1).style.bg, '#123456');
  assert.equal(output.at(-1).style.bold, true);
});

test('highlight matching supports literals, anchors, numbered wildcards, and percent-star', () => {
  const engine = new HighlightEngine();
  engine.define('danger', 'Red', 5);
  engine.define('^You %1 hard.$', 'Yellow', 3);
  engine.define('HP:%*%', 'Green', 7);

  const literal = engine.findMatches('danger and danger');
  assert.deepEqual(literal.filter((match) => match.pattern === 'danger').map(({ start, end }) => ({ start, end })), [
    { start: 0, end: 6 },
    { start: 11, end: 17 }
  ]);
  assert.equal(engine.findMatches('You hit hard.').some((match) => match.pattern === '^You %1 hard.$'), true);
  assert.equal(engine.findMatches('HP:93%').some((match) => match.pattern === 'HP:%*%'), true);
});

test('visual overlays split ANSI runs without changing text, links, or surrounding styles', () => {
  const engine = new HighlightEngine();
  engine.define('mutant', 'Yellow underline', 5);
  const runs = [
    { text: 'A ', style: { fg: '#ff5555', bold: true }, link: null },
    { text: 'mutant', style: { fg: '#55ff55' }, link: 'https://example.invalid' },
    { text: ' arrives.\n', style: { fg: '#ff5555', bold: true }, link: null }
  ];
  const output = applyHighlightsToRuns(runs, engine);
  assert.equal(output.map((run) => run.text).join(''), 'A mutant arrives.\n');
  const highlighted = output.find((run) => run.text === 'mutant');
  assert.equal(highlighted.style.fg, '#ffff55');
  assert.equal(highlighted.style.underline, true);
  assert.equal(highlighted.link, 'https://example.invalid');
  assert.equal(output[0].style.fg, '#ff5555');
  assert.equal(output.at(-1).style.bold, true);
});

test('lower numeric priority wins an overlapping visual range', () => {
  const engine = new HighlightEngine();
  engine.define('mutant', 'Red', 8);
  engine.define('old mutant', 'Cyan', 2);
  const output = applyHighlightsToRuns([{ text: 'old mutant', style: null }], engine);
  assert.equal(output.map((run) => run.text).join(''), 'old mutant');
  assert.equal(output.every((run) => run.style.fg === '#55ffff'), true);
});

test('highlight line buffering waits for complete lines and flushes prompts safely', () => {
  const buffer = new HighlightLineBuffer({ maxLineLength: 256 });
  assert.deepEqual(buffer.push('Warn', true), []);
  assert.deepEqual(buffer.push('ing\nNext', true), ['Warning\n']);
  assert.equal(buffer.flush(), 'Next');
  assert.deepEqual(buffer.push('plain', false), ['plain']);
});
