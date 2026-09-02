'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { TelnetParser, TELNET } = require('../src/telnet-parser');

test('large ordinary Telnet runs remain exact and use the incoming buffer backing store', () => {
  const data = [];
  const parser = new TelnetParser({ onData: (buffer) => data.push(buffer) });
  const payload = Buffer.from(('NukeFire ordinary output café Ω 한글\r\n').repeat(8192), 'utf8');

  parser.feed(payload);

  assert.equal(data.length, 1);
  assert.deepEqual(data[0], payload);
  assert.equal(data[0].buffer, payload.buffer, 'ordinary output should be handed onward as a zero-copy Buffer view');
});

test('contiguous data runs preserve ordering around split Telnet commands and escaped IAC', () => {
  const data = [];
  const boundaries = [];
  const parser = new TelnetParser({
    onData: (buffer) => data.push(buffer),
    onPromptBoundary: (boundary) => boundaries.push(boundary)
  });

  parser.feed(Buffer.from('alpha', 'ascii'));
  parser.feed(Buffer.from([TELNET.IAC]));
  parser.feed(Buffer.concat([
    Buffer.from([TELNET.IAC]),
    Buffer.from('beta', 'ascii'),
    Buffer.from([TELNET.IAC, TELNET.GA]),
    Buffer.from('gamma', 'ascii')
  ]));

  assert.deepEqual(Buffer.concat(data), Buffer.concat([
    Buffer.from('alpha', 'ascii'),
    Buffer.from([TELNET.IAC]),
    Buffer.from('betagamma', 'ascii')
  ]));
  assert.deepEqual(boundaries, [{ type: 'ga' }]);
});

test('ordinary feed hot path scans to IAC boundaries instead of iterating every text byte', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'telnet-parser.js'), 'utf8');
  const start = source.indexOf('  feed(chunk) {');
  const end = source.indexOf('\n  appendSubnegotiationByte(byte) {', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const feed = source.slice(start, end);

  assert.match(feed, /bytes\.indexOf\(IAC, index\)/);
  assert.match(feed, /bytes\.subarray\(index/);
  assert.doesNotMatch(feed, /for \(const byte of bytes\)/);
});
