'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TelnetParser, TELNET } = require('../src/telnet-parser');

function makeHarness(configuration = {}) {
  const data = [];
  const sent = [];
  const gmcp = [];
  const echo = [];
  const boundaries = [];
  const warnings = [];
  const charsets = [];
  const terminalTypes = [];
  const windowSizes = [];
  const mccp2Starts = [];
  const compressionStarts = [];
  let gmcpEnabled = 0;

  const parser = new TelnetParser({
    ...configuration,
    onData: (buffer) => data.push(buffer),
    onSend: (buffer) => sent.push(buffer),
    onGmcp: (message) => gmcp.push(message),
    onEcho: (value) => echo.push(value),
    onPromptBoundary: (boundary) => boundaries.push(boundary),
    onProtocolWarning: (warning) => warnings.push(warning),
    onCharset: (charset) => charsets.push(charset),
    onTerminalType: (value) => terminalTypes.push(value),
    onWindowSize: (size) => windowSizes.push(size),
    onMccp2Start: (state) => mccp2Starts.push(state),
    onCompressionStart: (state) => compressionStarts.push(state),
    onGmcpEnabled: () => { gmcpEnabled += 1; }
  });

  return {
    parser,
    data,
    sent,
    gmcp,
    echo,
    boundaries,
    warnings,
    charsets,
    terminalTypes,
    windowSizes,
    mccp2Starts,
    compressionStarts,
    get gmcpEnabled() { return gmcpEnabled; }
  };
}

function negotiation(command, option) {
  return Buffer.from([TELNET.IAC, command, option]);
}

function subnegotiation(option, payload) {
  const escaped = [];
  for (const byte of payload) {
    escaped.push(byte);
    if (byte === TELNET.IAC) escaped.push(TELNET.IAC);
  }
  return Buffer.from([
    TELNET.IAC,
    TELNET.SB,
    option,
    ...escaped,
    TELNET.IAC,
    TELNET.SE
  ]);
}

function extractSubnegotiationPayload(frame) {
  return frame.subarray(3, frame.length - 2);
}

function parseEnvironmentPayload(frame, expectedCommand = TELNET.ENVIRON.IS) {
  const payload = extractSubnegotiationPayload(frame);
  assert.equal(payload[0], expectedCommand);
  const records = [];
  let kind = null;
  let name = [];
  let value = [];
  let readingValue = false;

  const flush = () => {
    if (kind === null) return;
    records.push({
      kind,
      name: Buffer.from(name).toString('ascii'),
      value: Buffer.from(value).toString('ascii')
    });
    name = [];
    value = [];
    readingValue = false;
  };

  for (let index = 1; index < payload.length; index += 1) {
    const byte = payload[index];
    if (byte === TELNET.ENVIRON.VAR || byte === TELNET.ENVIRON.USERVAR) {
      flush();
      kind = byte;
      continue;
    }
    if (byte === TELNET.ENVIRON.VAL) {
      readingValue = true;
      continue;
    }
    if (byte === TELNET.ENVIRON.ESC) {
      index += 1;
      (readingValue ? value : name).push(payload[index]);
      continue;
    }
    (readingValue ? value : name).push(byte);
  }
  flush();
  return records;
}

test('passes ordinary bytes through and preserves escaped IAC', () => {
  const h = makeHarness();
  h.parser.feed(Buffer.from([65, TELNET.IAC]));
  h.parser.feed(Buffer.from([TELNET.IAC, 66]));
  assert.deepEqual(Buffer.concat(h.data), Buffer.from([65, TELNET.IAC, 66]));
});

test('accepts remote echo once and reports secure input mode', () => {
  const h = makeHarness();
  const willEcho = negotiation(TELNET.WILL, TELNET.OPT.ECHO);
  h.parser.feed(willEcho);
  h.parser.feed(willEcho);
  assert.equal(h.sent.length, 1);
  assert.deepEqual(h.sent[0], negotiation(TELNET.DO, TELNET.OPT.ECHO));
  assert.deepEqual(h.echo, [true]);

  h.parser.feed(negotiation(TELNET.WONT, TELNET.OPT.ECHO));
  assert.deepEqual(h.echo, [true, false]);
});

test('accepts MCCP2 once and hands off bytes after the compression boundary', () => {
  const h = makeHarness();
  const willMccp = negotiation(TELNET.WILL, TELNET.OPT.MCCP2);
  h.parser.feed(willMccp);
  h.parser.feed(willMccp);
  assert.equal(h.sent.length, 1);
  assert.deepEqual(h.sent[0], negotiation(TELNET.DO, TELNET.OPT.MCCP2));

  const compressedTail = Buffer.from([0x78, 0x9c, 0x01, 0x02, 0x03]);
  h.parser.feed(Buffer.concat([subnegotiation(TELNET.OPT.MCCP2, Buffer.alloc(0)), compressedTail]));
  assert.equal(h.mccp2Starts.length, 1);
  assert.deepEqual(h.mccp2Starts[0].remainder, compressedTail);
  assert.equal(Buffer.concat(h.data).length, 0, 'compressed bytes must never enter the Telnet text parser');

  h.parser.endMccp2Stream();
  const nextTail = Buffer.from([0x78, 0x9c, 0x04]);
  h.parser.feed(Buffer.concat([subnegotiation(TELNET.OPT.MCCP2, Buffer.alloc(0)), nextTail]));
  assert.equal(h.mccp2Starts.length, 2, 'copyover may start a replacement MCCP2 stream without renegotiating');
  assert.deepEqual(h.mccp2Starts[1].remainder, nextTail);
});



test('plain-transport control refuses MCCP2 and MCCPX without affecting other Telnet options', () => {
  const sent = [];
  const parser = new TelnetParser({
    compressionEnabled: false,
    onSend: (buffer) => sent.push(Buffer.from(buffer))
  });

  parser.feed(Buffer.from([TELNET.IAC, TELNET.WILL, TELNET.OPT.MCCP2]));
  parser.feed(Buffer.from([TELNET.IAC, TELNET.WILL, TELNET.OPT.MCCPX]));
  parser.feed(Buffer.from([TELNET.IAC, TELNET.WILL, TELNET.OPT.GMCP]));

  assert.deepEqual(sent[0], Buffer.from([TELNET.IAC, TELNET.DONT, TELNET.OPT.MCCP2]));
  assert.deepEqual(sent[1], Buffer.from([TELNET.IAC, TELNET.DONT, TELNET.OPT.MCCPX]));
  assert.deepEqual(sent[2], Buffer.from([TELNET.IAC, TELNET.DO, TELNET.OPT.GMCP]));
  assert.equal(parser.mccp2Negotiated, false);
  assert.equal(parser.mccpxNegotiated, false);
  assert.equal(parser.gmcpEnabled, true);
});

test('MCCP2 orderly WONT then WILL re-negotiates after copyover', () => {
  const h = makeHarness();
  h.parser.feed(negotiation(TELNET.WILL, TELNET.OPT.MCCP2));
  assert.equal(h.sent.length, 1);
  assert.deepEqual(h.sent[0], negotiation(TELNET.DO, TELNET.OPT.MCCP2));

  h.parser.feed(subnegotiation(TELNET.OPT.MCCP2, Buffer.alloc(0)));
  assert.equal(h.mccp2Starts.length, 1);
  h.parser.endMccp2Stream();

  h.parser.feed(negotiation(TELNET.WONT, TELNET.OPT.MCCP2));
  h.parser.feed(negotiation(TELNET.WILL, TELNET.OPT.MCCP2));
  assert.equal(h.sent.length, 2);
  assert.deepEqual(h.sent[1], negotiation(TELNET.DO, TELNET.OPT.MCCP2));

  const nextTail = Buffer.from([0x78, 0x9c, 0x04]);
  h.parser.feed(Buffer.concat([subnegotiation(TELNET.OPT.MCCP2, Buffer.alloc(0)), nextTail]));
  assert.equal(h.mccp2Starts.length, 2);
  assert.deepEqual(h.mccp2Starts[1].remainder, nextTail);
});



test('negotiates MCCPX, advertises zstd first, and hands off bytes after BEGIN_ENCODING', () => {
  const h = makeHarness();
  h.parser.feed(negotiation(TELNET.WILL, TELNET.OPT.MCCPX));

  assert.deepEqual(h.sent[0], negotiation(TELNET.DO, TELNET.OPT.MCCPX));
  const accept = h.sent[1];
  const acceptPayload = extractSubnegotiationPayload(accept);
  assert.equal(accept[2], TELNET.OPT.MCCPX);
  assert.equal(acceptPayload[0], TELNET.MCCPX.ACCEPT_ENCODING);
  assert.equal(acceptPayload.subarray(1).toString('ascii'), 'zstd,deflate');

  const compressedTail = Buffer.from([0x28, 0xb5, 0x2f, 0xfd, 0x00, 0x01]);
  const begin = subnegotiation(
    TELNET.OPT.MCCPX,
    Buffer.concat([
      Buffer.from([TELNET.MCCPX.BEGIN_ENCODING]),
      Buffer.from('zstd', 'ascii')
    ])
  );
  h.parser.feed(Buffer.concat([begin, compressedTail]));

  assert.equal(h.compressionStarts.length, 1);
  assert.equal(h.compressionStarts[0].protocol, 'MCCPX');
  assert.equal(h.compressionStarts[0].algorithm, 'zstd');
  assert.deepEqual(h.compressionStarts[0].remainder, compressedTail);
  assert.equal(Buffer.concat(h.data).length, 0, 'compressed bytes must never enter the Telnet text parser');

  h.parser.endCompressionStream('MCCPX');
  const nextTail = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
  h.parser.feed(Buffer.concat([begin, nextTail]));
  assert.equal(h.compressionStarts.length, 2, 'copyover may start a replacement MCCPX frame without renegotiating');
  assert.deepEqual(h.compressionStarts[1].remainder, nextTail);
});

test('MCCPX orderly WONT then WILL re-negotiates after copyover', () => {
  const h = makeHarness();
  h.parser.feed(negotiation(TELNET.WILL, TELNET.OPT.MCCPX));
  assert.equal(h.sent.length, 2);
  assert.deepEqual(h.sent[0], negotiation(TELNET.DO, TELNET.OPT.MCCPX));

  h.parser.endCompressionStream('MCCPX');
  h.parser.feed(negotiation(TELNET.WONT, TELNET.OPT.MCCPX));
  h.parser.feed(negotiation(TELNET.WILL, TELNET.OPT.MCCPX));

  assert.equal(h.sent.length, 4);
  assert.deepEqual(h.sent[2], negotiation(TELNET.DO, TELNET.OPT.MCCPX));
  const acceptPayload = extractSubnegotiationPayload(h.sent[3]);
  assert.equal(acceptPayload[0], TELNET.MCCPX.ACCEPT_ENCODING);
  assert.equal(acceptPayload.subarray(1).toString('ascii'), 'zstd,deflate');
});

test('cycles client name, terminal type, and MTTS', () => {
  const h = makeHarness();
  h.parser.feed(negotiation(TELNET.DO, TELNET.OPT.TERMINAL_TYPE));
  const request = subnegotiation(
    TELNET.OPT.TERMINAL_TYPE,
    Buffer.from([TELNET.TTYPE_SEND])
  );

  h.parser.feed(request);
  h.parser.feed(request);
  h.parser.feed(request);
  h.parser.feed(request);

  const responses = h.sent.slice(1).map((frame) => {
    const payload = extractSubnegotiationPayload(frame);
    assert.equal(payload[0], TELNET.TTYPE_IS);
    return payload.subarray(1).toString('ascii');
  });

  assert.deepEqual(responses, [
    'NUKEFIRE-MAC',
    'XTERM-TRUECOLOR',
    'MTTS 781',
    'MTTS 781'
  ]);
});

test('screen-reader preference changes the MTTS response', () => {
  const h = makeHarness();
  h.parser.setScreenReaderMode(true);
  h.parser.feed(negotiation(TELNET.DO, TELNET.OPT.TERMINAL_TYPE));
  const request = subnegotiation(
    TELNET.OPT.TERMINAL_TYPE,
    Buffer.from([TELNET.TTYPE_SEND])
  );

  h.parser.feed(request);
  h.parser.feed(request);
  h.parser.feed(request);

  const finalPayload = extractSubnegotiationPayload(h.sent[3]);
  assert.equal(finalPayload.subarray(1).toString('ascii'), 'MTTS 845');
  assert.equal(h.terminalTypes.at(-1).value, 'MTTS 845');
});

test('negotiates MNES and answers named standard and OSC hyperlink variables', () => {
  const h = makeHarness({ clientVersion: '0.3.1-beta.24' });
  h.parser.feed(negotiation(TELNET.DO, TELNET.OPT.NEW_ENVIRON));
  assert.deepEqual(h.sent[0], negotiation(TELNET.WILL, TELNET.OPT.NEW_ENVIRON));

  const request = Buffer.concat([
    Buffer.from([TELNET.ENVIRON.SEND, TELNET.ENVIRON.VAR]),
    Buffer.from('CLIENT_NAME', 'ascii'),
    Buffer.from([TELNET.ENVIRON.VAR]),
    Buffer.from('MTTS', 'ascii'),
    Buffer.from([TELNET.ENVIRON.USERVAR]),
    Buffer.from('OSC_HYPERLINKS', 'ascii'),
    Buffer.from([TELNET.ENVIRON.USERVAR]),
    Buffer.from('OSC_HYPERLINKS_SEND', 'ascii'),
    Buffer.from([TELNET.ENVIRON.USERVAR]),
    Buffer.from('OSC_HYPERLINKS_PROMPT', 'ascii')
  ]);
  h.parser.feed(subnegotiation(TELNET.OPT.NEW_ENVIRON, request));

  assert.deepEqual(parseEnvironmentPayload(h.sent[1]), [
    { kind: TELNET.ENVIRON.VAR, name: 'CLIENT_NAME', value: 'NukeFire Client' },
    { kind: TELNET.ENVIRON.VAR, name: 'MTTS', value: '781' },
    { kind: TELNET.ENVIRON.USERVAR, name: 'OSC_HYPERLINKS', value: '1' },
    { kind: TELNET.ENVIRON.USERVAR, name: 'OSC_HYPERLINKS_SEND', value: '1' },
    { kind: TELNET.ENVIRON.USERVAR, name: 'OSC_HYPERLINKS_PROMPT', value: '1' }
  ]);
});

test('updates the MNES MTTS variable when screen-reader capability changes', () => {
  const h = makeHarness();
  h.parser.feed(negotiation(TELNET.DO, TELNET.OPT.NEW_ENVIRON));
  h.parser.setScreenReaderMode(true);

  assert.deepEqual(parseEnvironmentPayload(h.sent[1], TELNET.ENVIRON.INFO), [
    { kind: TELNET.ENVIRON.VAR, name: 'MTTS', value: '845' }
  ]);

  h.parser.setScreenReaderMode(true);
  assert.equal(h.sent.length, 2, 'unchanged capability must not send duplicate INFO updates');
});

test('answers all MNES variables and resets NEW-ENVIRON after DONT', () => {
  const h = makeHarness({ clientVersion: '0.3.1-beta.24' });
  h.parser.feed(negotiation(TELNET.DO, TELNET.OPT.NEW_ENVIRON));
  h.parser.feed(subnegotiation(
    TELNET.OPT.NEW_ENVIRON,
    Buffer.from([TELNET.ENVIRON.SEND])
  ));
  const records = parseEnvironmentPayload(h.sent[1]);
  assert.deepEqual(records.map((record) => record.name), [
    'CHARSET', 'CLIENT_NAME', 'CLIENT_VERSION', 'MTTS', 'TERMINAL_TYPE',
    'OSC_HYPERLINKS', 'OSC_HYPERLINKS_SEND', 'OSC_HYPERLINKS_PROMPT'
  ]);
  assert.equal(records.find((record) => record.name === 'CLIENT_VERSION').value, '0.3.1-beta.24');

  h.parser.feed(negotiation(TELNET.DONT, TELNET.OPT.NEW_ENVIRON));
  assert.equal(h.parser.newEnvironmentEnabled, false);
  assert.deepEqual(h.sent[2], negotiation(TELNET.WONT, TELNET.OPT.NEW_ENVIRON));
  h.parser.feed(subnegotiation(
    TELNET.OPT.NEW_ENVIRON,
    Buffer.from([TELNET.ENVIRON.SEND])
  ));
  assert.equal(h.sent.length, 3, 'disabled NEW-ENVIRON must not answer stale requests');
});

test('accepts NukeFire UTF-8 CHARSET negotiation', () => {
  const h = makeHarness();
  h.parser.feed(negotiation(TELNET.DO, TELNET.OPT.CHARSET));

  const requestPayload = Buffer.concat([
    Buffer.from([TELNET.CHARSET.REQUEST, 32]),
    Buffer.from('UTF-8', 'ascii')
  ]);
  h.parser.feed(subnegotiation(TELNET.OPT.CHARSET, requestPayload));

  assert.deepEqual(h.sent[0], negotiation(TELNET.WILL, TELNET.OPT.CHARSET));
  const response = extractSubnegotiationPayload(h.sent[1]);
  assert.equal(response[0], TELNET.CHARSET.ACCEPTED);
  assert.equal(response.subarray(1).toString('ascii'), 'UTF-8');
  assert.equal(h.charsets[0].accepted, true);
  assert.equal(h.charsets[0].charset, 'UTF-8');
});

test('sends actual NAWS dimensions and suppresses duplicates', () => {
  const h = makeHarness({
    getWindowSize: () => ({ width: 132, height: 44 })
  });

  h.parser.feed(negotiation(TELNET.DO, TELNET.OPT.NAWS));
  assert.deepEqual(h.sent[0], negotiation(TELNET.WILL, TELNET.OPT.NAWS));
  assert.deepEqual(
    h.sent[1],
    subnegotiation(TELNET.OPT.NAWS, Buffer.from([0, 132, 0, 44]))
  );

  assert.equal(h.parser.updateWindowSize(100, 30), true);
  assert.equal(h.parser.updateWindowSize(100, 30), false);
  assert.deepEqual(
    h.sent[2],
    subnegotiation(TELNET.OPT.NAWS, Buffer.from([0, 100, 0, 30]))
  );
  assert.deepEqual(h.windowSizes.at(-1), { width: 100, height: 30 });
});

test('extracts GMCP at every possible packet split', () => {
  const payload = Buffer.from('Char.Vitals {"hp":120,"mhp":200}', 'utf8');
  const frame = subnegotiation(TELNET.OPT.GMCP, payload);

  for (let split = 0; split <= frame.length; split += 1) {
    const h = makeHarness();
    h.parser.feed(negotiation(TELNET.WILL, TELNET.OPT.GMCP));
    h.parser.feed(frame.subarray(0, split));
    h.parser.feed(frame.subarray(split));
    assert.equal(h.gmcp.length, 1, `split ${split}`);
    assert.equal(h.gmcp[0].packageName, 'Char.Vitals');
    assert.deepEqual(h.gmcp[0].body, { hp: 120, mhp: 200 });
  }
});

test('extracts lower-case group GMCP one byte at a time', () => {
  const h = makeHarness();
  h.parser.feed(negotiation(TELNET.WILL, TELNET.OPT.GMCP));
  const frame = subnegotiation(
    TELNET.OPT.GMCP,
    Buffer.from('group {"count":2}', 'utf8')
  );
  for (const byte of frame) h.parser.feed(Buffer.from([byte]));
  assert.equal(h.gmcp[0].packageName, 'group');
  assert.deepEqual(h.gmcp[0].body, { count: 2 });
});

test('enables GMCP only once after duplicate WILL packets', () => {
  const h = makeHarness();
  const willGmcp = negotiation(TELNET.WILL, TELNET.OPT.GMCP);
  h.parser.feed(willGmcp);
  h.parser.feed(willGmcp);
  assert.equal(h.gmcpEnabled, 1);
  assert.equal(h.sent.length, 1);
  assert.equal(h.parser.sendGmcp('Core.Ping', ''), true);
});

test('drops oversized subnegotiation and recovers', () => {
  const h = makeHarness({ maxSubnegotiationBytes: 8 });
  const oversized = subnegotiation(
    TELNET.OPT.GMCP,
    Buffer.from('12345678901234567890', 'ascii')
  );
  h.parser.feed(Buffer.concat([oversized, Buffer.from('OK', 'ascii')]));
  assert.equal(h.gmcp.length, 0);
  assert.equal(
    h.warnings.some((warning) => warning.code === 'subnegotiation-too-large'),
    true
  );
  assert.equal(Buffer.concat(h.data).toString('ascii'), 'OK');
});

test('reports GA and EOR as prompt boundaries', () => {
  const h = makeHarness();
  h.parser.feed(Buffer.from([65, TELNET.IAC]));
  h.parser.feed(Buffer.from([TELNET.GA, 66, TELNET.IAC, TELNET.EOR, 67]));
  assert.deepEqual(Buffer.concat(h.data), Buffer.from('ABC'));
  assert.deepEqual(h.boundaries, [{ type: 'ga' }, { type: 'eor' }]);
});

test('accepts server EOR but declines client EOR transmission', () => {
  const h = makeHarness();
  h.parser.feed(negotiation(TELNET.WILL, TELNET.OPT.END_OF_RECORD));
  assert.deepEqual(
    h.sent[0],
    negotiation(TELNET.DO, TELNET.OPT.END_OF_RECORD)
  );
  assert.equal(h.parser.endOfRecordEnabled, true);

  h.parser.feed(negotiation(TELNET.DO, TELNET.OPT.END_OF_RECORD));
  assert.deepEqual(
    h.sent[1],
    negotiation(TELNET.WONT, TELNET.OPT.END_OF_RECORD)
  );
});
