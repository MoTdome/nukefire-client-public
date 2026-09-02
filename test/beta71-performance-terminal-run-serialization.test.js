'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const current = require('../renderer/xterm-adapter');

const STYLE_KEYS = ['fg','bg','fgBasicIndex','bgBasicIndex','bold','dim','italic','underline','inverse'];

function legacyColorTriplet(value) {
  const text = String(value || '').trim();
  const hex = text.match(/^#([0-9a-f]{6})$/iu);
  if (hex) {
    return [
      Number.parseInt(hex[1].slice(0, 2), 16),
      Number.parseInt(hex[1].slice(2, 4), 16),
      Number.parseInt(hex[1].slice(4, 6), 16)
    ];
  }
  const rgb = text.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/iu);
  if (!rgb) return null;
  return rgb.slice(1).map((part) => Math.max(0, Math.min(255, Number(part) || 0)));
}

function legacyNormalizeTranscriptText(value) {
  return String(value ?? '')
    .replace(/\r\n|\r/gu, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, '');
}

// Fixed hashes were captured from the exact pre-pass serializer. This keeps the
// regression independent of implementation details while proving the optimized
// serializer produces the identical xterm byte stream for a fragmented batch.
const EXPECTED_COLOR_SHA256 = 'fafac4893096071538f27b8147f1e13131ecae2514d91ed3fc2324af155f5bf9';
const EXPECTED_MONO_SHA256 = '9e6cccf80111334036b34548112912eaa77b7b9b513456f4bc845dfdd11742b0';

function sha256(value) {
  return require('node:crypto').createHash('sha256').update(value).digest('hex');
}

function makeRuns(count) {
  const colors = ['#aa0000','#00aa00','#d6b94c','#0000aa','#aa00aa','#00aaaa','#aaaaaa','#ff5555','#55ff55','#ffff66','#5555ff','#ff55ff','#55ffff','#ffffff'];
  const output = [];
  for (let index = 0; index < count; index += 1) {
    output.push({
      text: index % 37 === 0 ? `r${index}\r\n` : `r${index % 100} `,
      kind: index % 211 === 0 ? 'error' : 'mud',
      link: null,
      style: {
        fg: colors[(index * 7) % colors.length],
        bg: index % 29 === 0 ? colors[(index * 3) % colors.length] : null,
        fgBasicIndex: null,
        bgBasicIndex: null,
        bold: index % 5 === 0,
        dim: index % 13 === 0,
        italic: index % 17 === 0,
        underline: index % 23 === 0,
        inverse: index % 31 === 0
      }
    });
  }
  return output;
}

test('fast color decoding preserves the established colorTriplet contract', () => {
  const cases = ['#12abEF', '#000000', '#ffffff', 'rgb(300, 4, 9)', 'rgb(1,2,3)', 'red', '#12abEz', '#12345'];
  for (const value of cases) assert.deepEqual(current.colorTriplet(value), legacyColorTriplet(value), value);
});

test('terminal run serializer remains byte-for-byte identical on a fragmented color-heavy transcript', () => {
  const runs = makeRuns(2400);
  assert.equal(sha256(current.runsToAnsi(runs)), EXPECTED_COLOR_SHA256);
  assert.equal(
    sha256(current.runsToAnsi(runs, { monochrome: true, defaultForeground: '#c0ffee' })),
    EXPECTED_MONO_SHA256
  );
});

test('terminal serializer has explicit printable fast path and per-flush color cache', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'xterm-adapter.js'), 'utf8');
  assert.match(source, /if \(!\/\[\\r\\u0000-\\u0008/u);
  assert.match(source, /const colorCache = source\.length >= 8 \? new Map\(\) : null;/u);
  assert.match(source, /cachedColorTriplet\(foreground, colorCache\)/u);
});
