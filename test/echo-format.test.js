'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  formatTinTinEcho,
  protectEchoFormatSpecifiers,
  MAX_ECHO_ARGUMENTS
} = require('../src/echo-format');
const { evaluateMathExpression } = require('../src/math-engine');

function plain(value) {
  return String(value || '').replace(/\x1b\[[0-9;]*m/gu, '');
}

test('formats common TinTin echo strings, numbers, grouping, widths, and percent signs', () => {
  assert.equal(formatTinTinEcho('HP: %d/%d', ['75', '100']).text, 'HP: 75/100');
  assert.equal(formatTinTinEcho('[%8s][%-8s]', ['Caul', 'Shai']).text, '[    Caul][Shai    ]');
  assert.equal(formatTinTinEcho('%+.2f | %.1g | %%', ['12.5', '12345.67']).text, '+12.50 | 12,345.7 | %');
  assert.equal(formatTinTinEcho('Letter: %a', ['9731']).text, 'Letter: ☃');
});

test('formats bounded math results when a safe evaluator is provided', () => {
  const result = formatTinTinEcho('Damage: %8m', ['2 + 3 * 4'], {
    evaluateMath: (expression) => evaluateMathExpression(expression)
  });
  assert.equal(result.text, 'Damage:       14');
  assert.match(formatTinTinEcho('%m', ['2 + 2']).error, /not available/u);
  assert.match(formatTinTinEcho('%m', ['1 / 0'], {
    commandLabel: 'Format',
    evaluateMath: (expression) => evaluateMathExpression(expression)
  }).error, /division by zero/u);
});

test('formats common time tokens with a deterministic clock', () => {
  const result = formatTinTinEcho('Now: %t', ['%Y-%m-%d %H:%M:%S'], {
    now: new Date('2026-08-02T06:07:08Z'),
    utc: true
  });
  assert.equal(result.text, 'Now: 2026-08-02 06:07:08');
});

test('produces only whitelisted ANSI from TinTin colors and color format arguments', () => {
  const direct = formatTinTinEcho('<faa>Danger<reset> safe', []);
  assert.equal(plain(direct.text), 'Danger safe');
  assert.match(direct.text, /\x1b\[38;2;255;85;85m/u);
  assert.match(direct.text, /\x1b\[0m/u);

  const formatted = formatTinTinEcho('%cWarning%c', ['light red', 'reset']);
  assert.equal(plain(formatted.text), 'Warning');
  assert.match(formatted.text, /\x1b\[1;38;2;170;0;0m/u);
});

test('rejects unsupported, unsafe, oversized, and incomplete formatting', () => {
  assert.match(formatTinTinEcho('%q', ['x']).error, /Unsupported echo format/u);
  assert.match(formatTinTinEcho('%d', []).error, /needs argument 1/u);
  assert.match(formatTinTinEcho('%999s', ['x']).error, /field width/u);
  assert.match(formatTinTinEcho('%f', ['not-a-number']).error, /numeric/u);
  assert.match(formatTinTinEcho('%s', Array(MAX_ECHO_ARGUMENTS + 1).fill('x')).error, /at most 30/u);
  assert.equal(formatTinTinEcho('safe\u001b]8;;https://bad.test\u0007', []).text.includes('\u001b'), false);
});

test('protects format directives while allowing explicit NukeFire variables', () => {
  const protectedFormat = protectEchoFormatSpecifiers('HP: %d %% %{target}');
  assert.doesNotMatch(protectedFormat.value, /%d/u);
  assert.match(protectedFormat.value, /%\{target\}/u);
  assert.equal(protectedFormat.restore(protectedFormat.value.replace('%{target}', 'Caul')), 'HP: %d %% Caul');
  const unsupported = protectEchoFormatSpecifiers('%q %{q}');
  assert.doesNotMatch(unsupported.value, /%q/u);
  assert.equal(unsupported.restore(unsupported.value.replace('%{q}', 'value')), '%q value');
});

test('TinTin %T exposes bounded epoch seconds without consuming an argument', () => {
  const result = formatTinTinEcho('Started: %T / %U', [], {
    nowMilliseconds: () => 1_700_000_123_999,
    nowMicroseconds: () => 1_700_000_123_999_000
  });
  assert.equal(result.error, '');
  assert.equal(result.text, 'Started: 1700000123 / 1700000123999000');
  assert.match(formatTinTinEcho('%10T', [], { nowMilliseconds: () => 1_700_000_123_999 }).error, /%T does not support/u);
});
