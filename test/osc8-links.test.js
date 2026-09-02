'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MAX_OSC8_COMMAND_LENGTH,
  resolveOsc8Uri,
  parseOsc8Payload,
  sanitizeOsc8Sequences
} = require('../src/osc8-links');

test('accepts safe HTTP and HTTPS OSC 8 links while blocking dangerous schemes', () => {
  const secure = resolveOsc8Uri('https://example.com/help?q=1');
  assert.equal(secure.available, true);
  assert.equal(secure.kind, 'external');
  assert.equal(secure.value, 'https://example.com/help?q=1');

  assert.equal(resolveOsc8Uri('http://example.com/').available, true);
  assert.equal(resolveOsc8Uri('javascript:alert(1)').available, false);
  assert.equal(resolveOsc8Uri('file:///etc/passwd').available, false);
  assert.equal(resolveOsc8Uri('https://user:pass@example.com/').available, false);
});

test('decodes safe send and prompt links and rejects control or oversized commands', () => {
  assert.deepEqual(resolveOsc8Uri('send:cast%20fireball'), {
    available: true,
    kind: 'send',
    uri: 'send:cast%20fireball',
    value: 'cast fireball',
    source: 'send:cast%20fireball',
    reason: ''
  });
  assert.equal(resolveOsc8Uri('prompt:say%20hello').value, 'say hello');
  assert.equal(resolveOsc8Uri('send:look%0Awho').available, false);
  assert.equal(resolveOsc8Uri(`send:${'x'.repeat(MAX_OSC8_COMMAND_LENGTH + 1)}`).available, false);
});

test('parses Mudlet-compatible OSC 8 headers and closing sequences', () => {
  const opened = parseOsc8Payload('8;;prompt:cast%20heal');
  assert.equal(opened.available, true);
  assert.equal(opened.kind, 'prompt');
  assert.equal(opened.value, 'cast heal');
  assert.equal(opened.parameters, '');

  const closed = parseOsc8Payload('8;;');
  assert.equal(closed.available, true);
  assert.equal(closed.kind, 'close');
  assert.equal(parseOsc8Payload('0;window title'), null);
});

test('preserves only safe OSC 8 controls while removing titles and unsafe links', () => {
  const source = [
    'Before ',
    '\x1b]0;hostile title\x07',
    '\x1b]8;;send:look\x1b\\Look\x1b]8;;\x1b\\',
    ' ',
    '\x1b]8;;javascript:alert(1)\x1b\\Bad\x1b]8;;\x1b\\',
    ' After'
  ].join('');
  const output = sanitizeOsc8Sequences(source);
  assert.equal(output.includes('hostile title'), false);
  assert.match(output, /\x1b\]8;;send:look\x1b\\Look\x1b\]8;;\x1b\\/u);
  assert.equal(output.includes('javascript:'), false);
  assert.equal(output, `Before \x1b]8;;send:look\x1b\\Look\x1b]8;;\x1b\\ Bad\x1b]8;;\x1b\\ After`);
});
