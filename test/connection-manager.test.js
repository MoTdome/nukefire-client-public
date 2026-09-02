'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { deflateSync, zstdCompressSync } = require('node:zlib');
const { TelnetParser, TELNET } = require('../src/telnet-parser');
const {
  ConnectionManager,
  GMCP_SUPPORTS,
  INITIAL_GMCP_REQUESTS
} = require('../src/connection-manager');

test('forwards terminal size and screen-reader preference to the live parser', () => {
  const sizes = [];
  const readerModes = [];
  const manager = new ConnectionManager();

  manager.parser = {
    updateWindowSize: (width, height) => {
      sizes.push({ width, height });
      return true;
    },
    setScreenReaderMode: (enabled) => {
      readerModes.push(enabled);
    }
  };

  assert.equal(manager.setTerminalSize(132, 44), true);
  assert.deepEqual(manager.terminalSize, { width: 132, height: 44 });
  assert.deepEqual(sizes, [{ width: 132, height: 44 }]);
  assert.equal(manager.setTerminalSize(132, 44), false, 'duplicate terminal sizes must not renegotiate NAWS');
  assert.deepEqual(sizes, [{ width: 132, height: 44 }]);

  assert.deepEqual(
    manager.setClientPreferences({ screenReaderMode: true }),
    { screenReaderMode: true, compressionEnabled: true }
  );
  assert.deepEqual(readerModes, [true]);
  manager.setClientPreferences({ screenReaderMode: true });
  assert.deepEqual(readerModes, [true], 'duplicate accessibility preferences must not reconfigure the parser');

  assert.deepEqual(
    manager.setClientPreferences({ compressionEnabled: false }),
    { screenReaderMode: true, compressionEnabled: false }
  );
  assert.equal(
    Object.hasOwn(manager.parser, 'compressionEnabled'),
    false,
    'compression changes must wait for a fresh parser on reconnect'
  );
});

test('normalizes NukeFire GMCP through the structured store', () => {
  const events = [];
  const states = [];
  const manager = new ConnectionManager({
    onGmcp: (event) => events.push(event),
    onGmcpState: (state) => states.push(state)
  });

  manager.handleGmcp({
    packageName: 'group',
    body: { leader: 'Mo', count: 1, members: [{ name: 'Mo' }] },
    rawBody: '{"leader":"Mo"}'
  });

  assert.equal(events[0].packageName, 'Group');
  assert.deepEqual(events[0].path, ['group']);
  assert.equal(events[0].body.leader, 'Mo');
  assert.equal(events[0].state, undefined, 'hot-path GMCP events must not clone the complete cached state');
  assert.equal(states.length, 0, 'per-packet state must not emit a companion full-state event');
  assert.equal(manager.getGmcpState().meta.messageCount, 1);
});

test('GMCP initialization advertises and requests the NukeFire packages', async () => {
  const messages = [];
  const manager = new ConnectionManager();
  manager.parser = {
    gmcpEnabled: true,
    sendGmcp: (packageName, body) => {
      messages.push({ packageName, body });
      return true;
    }
  };

  manager.initializeGmcp();
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(messages[0], {
    packageName: 'Core.Hello',
    body: { client: 'NukeFire Client', version: '0.3.1-beta.73' }
  });
  assert.deepEqual(messages[1], {
    packageName: 'Core.Supports.Set',
    body: GMCP_SUPPORTS
  });
  assert.deepEqual(
    messages.slice(2).map((message) => message.packageName),
    INITIAL_GMCP_REQUESTS
  );
});

test('advertises live BIGMAP, GPS catalog, and the NukeFire Context Deck', () => {
  assert.ok(GMCP_SUPPORTS.includes('NukeFire.Map 1'));
  assert.ok(GMCP_SUPPORTS.includes('NukeFire.GPS 1'));
  assert.ok(GMCP_SUPPORTS.includes('NukeFire.Context 1'));
  assert.ok(GMCP_SUPPORTS.includes('NukeFire.Controls 1'));
  assert.ok(GMCP_SUPPORTS.includes('NukeFire.Combat 1'));
  assert.ok(GMCP_SUPPORTS.includes('NukeFire.Affects 1'));
  assert.ok(GMCP_SUPPORTS.includes('NukeFire.Mob 1'));
  assert.ok(GMCP_SUPPORTS.includes('NukeFire.Foundlist 1'));
  assert.ok(GMCP_SUPPORTS.includes('NukeFire.Knowledge 2'));
  assert.ok(INITIAL_GMCP_REQUESTS.includes('NukeFire.Map.Local'));
  assert.ok(INITIAL_GMCP_REQUESTS.includes('NukeFire.GPS.Catalog'));
  assert.ok(INITIAL_GMCP_REQUESTS.includes('NukeFire.Context'));
  assert.ok(INITIAL_GMCP_REQUESTS.includes('NukeFire.Controls'));
  assert.ok(INITIAL_GMCP_REQUESTS.includes('NukeFire.Affects'));
  assert.equal(INITIAL_GMCP_REQUESTS.includes('NukeFire.Combat'), false,
    'event-only combat must be advertised but never polled as snapshot state');
  assert.equal(INITIAL_GMCP_REQUESTS.includes('NukeFire.Mob'), false,
    'Mob Inspector is command/target-driven and must not poll at login');
});


test('MCCP2 inflates the compressed wire stream before feeding Telnet bytes', async () => {
  const fed = [];
  const states = [];
  let resolveFed;
  const fedPromise = new Promise((resolve) => { resolveFed = resolve; });
  const manager = new ConnectionManager({
    onCompressionState: (state) => states.push(state)
  });
  manager.parser = {
    feed: (buffer) => {
      fed.push(Buffer.from(buffer));
      resolveFed();
    },
    endMccp2Stream: () => {}
  };

  const plain = Buffer.from('NukeFire MCCP2 test\r\n', 'utf8');
  const compressed = deflateSync(plain);
  assert.equal(manager.startMccp2({ remainder: compressed }), true);
  await fedPromise;

  assert.deepEqual(Buffer.concat(fed), plain);
  assert.equal(states[0].protocol, 'MCCP2');
  assert.equal(states[0].active, true);
  assert.equal(manager.getCompressionState().wireBytes, compressed.length);
  assert.equal(manager.getCompressionState().inflatedBytes, plain.length);
  manager.resetMccp2();
});



test('MCCPX Zstandard inflates the wire stream and reports the negotiated transport', async () => {
  const fed = [];
  const states = [];
  let resolveFed;
  const fedPromise = new Promise((resolve) => { resolveFed = resolve; });
  const manager = new ConnectionManager({
    onCompressionState: (state) => states.push({ ...state })
  });
  manager.parser = {
    feed: (buffer) => {
      fed.push(Buffer.from(buffer));
      resolveFed();
    },
    endCompressionStream: () => {}
  };

  const plain = Buffer.from('NukeFire MCCPX Zstandard test\r\n'.repeat(8), 'utf8');
  const compressed = zstdCompressSync(plain);
  assert.equal(manager.startCompression({
    protocol: 'MCCPX',
    algorithm: 'zstd',
    remainder: compressed
  }), true);
  await fedPromise;

  assert.deepEqual(Buffer.concat(fed), plain);
  assert.equal(states[0].protocol, 'MCCPX');
  assert.equal(states[0].algorithm, 'Zstandard');
  assert.equal(manager.getCompressionState().wireBytes, compressed.length);
  assert.equal(manager.getCompressionState().inflatedBytes, plain.length);
  manager.resetCompressionTransport();
});

test('MCCPX Zstandard preserves raw copyover bytes after a completed frame', async () => {
  const calls = [];
  let endedProtocol = '';
  let resolveTail;
  const tailPromise = new Promise((resolve) => { resolveTail = resolve; });
  const manager = new ConnectionManager();
  manager.parser = {
    feed: (buffer) => {
      calls.push(Buffer.from(buffer));
      if (calls.length >= 2) resolveTail();
    },
    endCompressionStream: (protocol) => { endedProtocol = protocol; }
  };

  const plain = Buffer.from('zstd copyover payload\r\n', 'utf8');
  const rawTail = Buffer.from([255, 251, 88, 65, 66, 67]);
  const wire = Buffer.concat([zstdCompressSync(plain), rawTail]);
  assert.equal(manager.startCompression({ protocol: 'MCCPX', algorithm: 'zstd', remainder: wire }), true);
  await tailPromise;

  assert.deepEqual(calls[0], plain);
  assert.deepEqual(calls[1], rawTail);
  assert.equal(endedProtocol, 'MCCPX');
  assert.equal(manager.getCompressionState().active, false);
});

test('MCCPX Zstandard recovers when copyover raw bytes arrive in a later TCP chunk', async () => {
  const calls = [];
  const warnings = [];
  const errors = [];
  let endedProtocol = '';
  const manager = new ConnectionManager({
    onProtocolWarning: (warning) => warnings.push(warning),
    onError: (message) => errors.push(message)
  });
  manager.connectionGeneration = 1;
  manager.parser = {
    feed: (buffer) => calls.push(Buffer.from(buffer)),
    endCompressionStream: (protocol) => { endedProtocol = protocol; }
  };
  manager.socket = { destroyed: false, writable: true, destroy: () => { throw new Error('socket must stay connected'); } };

  const plain = Buffer.from('live zstd frame before copyover\r\n'.repeat(4), 'utf8');
  const frame = zstdCompressSync(plain);
  const rawTail = Buffer.from([TELNET.IAC, TELNET.WONT, TELNET.OPT.MCCPX, 13, 10, 67, 111, 112, 121]);

  assert.equal(manager.startCompression({ protocol: 'MCCPX', algorithm: 'zstd' }), true);
  manager.handleSocketData(frame);

  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 1000;
    const poll = () => {
      if (calls.length >= 1) return resolve();
      if (Date.now() > deadline) return reject(new Error('zstd payload did not inflate'));
      setImmediate(poll);
    };
    poll();
  });

  // This is the real copyover shape that Node's Zstd transform handles
  // differently from zlib: the completed frame and raw Telnet tail arrive in
  // separate socket reads while the transform's writable side is still open.
  manager.handleSocketData(rawTail);

  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 1000;
    const poll = () => {
      if (!manager.compressionInflater && calls.length >= 2) return resolve();
      if (Date.now() > deadline) return reject(new Error('zstd copyover boundary was not recovered'));
      setImmediate(poll);
    };
    poll();
  });

  assert.deepEqual(calls[0], plain);
  assert.deepEqual(calls[1], rawTail);
  assert.equal(endedProtocol, 'MCCPX');
  assert.equal(warnings.length, 0);
  assert.equal(errors.length, 0);
  assert.equal(manager.getCompressionState().active, false);
});



test('MCCPX Zstandard survives a copyover BEGIN marker through the real Telnet parser', async () => {
  const text = [];
  const manager = new ConnectionManager();
  manager.connectionGeneration = 1;
  manager.parser = new TelnetParser({
    onData: (buffer) => text.push(Buffer.from(buffer)),
    onSend: () => {},
    onCompressionStart: (state) => manager.startCompression(state)
  });

  const subneg = (option, payload) => Buffer.from([
    TELNET.IAC, TELNET.SB, option, ...payload, TELNET.IAC, TELNET.SE
  ]);
  const beginZstd = subneg(
    TELNET.OPT.MCCPX,
    [TELNET.MCCPX.BEGIN_ENCODING, ...Buffer.from('zstd', 'ascii')]
  );

  manager.parser.feed(Buffer.from([TELNET.IAC, TELNET.WILL, TELNET.OPT.MCCPX]));

  const first = Buffer.from('before zstd copyover\r\n', 'utf8');
  const second = Buffer.from('after zstd copyover\r\n', 'utf8');
  const finalRaw = Buffer.from('raw-after-second-frame');
  const wire = Buffer.concat([
    beginZstd,
    zstdCompressSync(first),
    beginZstd,
    zstdCompressSync(second),
    finalRaw
  ]);

  manager.parser.feed(wire);

  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 1000;
    const poll = () => {
      const joined = Buffer.concat(text);
      if (joined.includes(first) && joined.includes(second) && joined.includes(finalRaw)) return resolve();
      if (Date.now() > deadline) return reject(new Error('copyover pipeline did not complete'));
      setImmediate(poll);
    };
    poll();
  });

  assert.deepEqual(Buffer.concat(text), Buffer.concat([first, second, finalRaw]));
  assert.equal(manager.getCompressionState().protocol, 'MCCPX');
  assert.equal(manager.getCompressionState().algorithm, 'Zstandard');
  assert.equal(manager.getCompressionState().active, false);
});
test('MCCP2 preserves post-stream Telnet bytes delivered in the same TCP chunk', async () => {
  const calls = [];
  let ended = 0;
  let resolveTail;
  const tailPromise = new Promise((resolve) => { resolveTail = resolve; });
  const manager = new ConnectionManager();
  manager.parser = {
    feed: (buffer) => {
      calls.push(Buffer.from(buffer));
      if (calls.length >= 2) resolveTail();
    },
    endMccp2Stream: () => { ended += 1; }
  };

  const plain = Buffer.from('compressed payload\r\n', 'utf8');
  const rawTail = Buffer.from([255, 250, 86, 255, 240]);
  const wire = Buffer.concat([deflateSync(plain), rawTail]);
  assert.equal(manager.startMccp2({ remainder: wire }), true);
  await tailPromise;

  assert.deepEqual(calls[0], plain);
  assert.deepEqual(calls[1], rawTail);
  assert.equal(ended, 1);
  assert.equal(manager.getCompressionState().active, false);
});


test('MCCP2 reports live compression counters and keeps totals across stream restarts', async () => {
  const states = [];
  const manager = new ConnectionManager({
    onCompressionState: (state) => states.push({ ...state })
  });
  manager.parser = { feed: () => {}, endMccp2Stream: () => {} };

  const waitForEndedStream = () => new Promise((resolve) => {
    const poll = () => {
      if (!manager.compressionInflater) resolve();
      else setImmediate(poll);
    };
    poll();
  });

  const first = Buffer.from('first compressed stream\r\n', 'utf8');
  const second = Buffer.from('second compressed stream\r\n', 'utf8');
  const firstWire = deflateSync(first);
  const secondWire = deflateSync(second);

  assert.equal(manager.startMccp2({ remainder: Buffer.concat([firstWire, Buffer.from('copyover-one')]) }), true);
  await waitForEndedStream();
  const afterFirst = manager.getCompressionState();
  assert.equal(afterFirst.active, false);
  assert.equal(afterFirst.wireBytes, firstWire.length);
  assert.equal(afterFirst.inflatedBytes, first.length);

  assert.equal(manager.startMccp2({ remainder: Buffer.concat([secondWire, Buffer.from('copyover-two')]) }), true);
  await waitForEndedStream();
  const current = manager.getCompressionState();
  assert.equal(current.algorithm, 'zlib/DEFLATE');
  assert.equal(current.active, false);
  assert.equal(current.wireBytes, firstWire.length + secondWire.length);
  assert.equal(current.inflatedBytes, first.length + second.length);
  assert.ok(states.some((state) => state.active && state.inflatedBytes > 0), 'live counters should be reported while active');
});

test('compression backpressure pauses socket input and bounds retained buffers during sustained traffic', () => {
  class BackpressureInflater extends EventEmitter {
    constructor() {
      super();
      this.bytesWritten = 0;
      this.destroyed = false;
    }

    write(buffer) {
      this.pending = Buffer.from(buffer);
      return false;
    }

    consume() {
      this.bytesWritten += this.pending?.length || 0;
      this.pending = null;
      this.emit('drain');
    }

    destroy() {
      this.destroyed = true;
    }
  }

  const manager = new ConnectionManager();
  const inflater = new BackpressureInflater();
  let pauses = 0;
  let resumes = 0;
  manager.socket = {
    pause: () => { pauses += 1; },
    resume: () => { resumes += 1; }
  };
  manager.parser = { feed: () => {}, endCompressionStream: () => {} };
  manager.createCompressionInflater = () => inflater;

  assert.equal(manager.startCompression({ protocol: 'MCCPX', algorithm: 'zstd' }), true);
  const chunk = Buffer.alloc(64 * 1024, 1);
  for (let index = 0; index < 10_000; index += 1) {
    manager.handleSocketData(chunk);
    assert.equal(manager.compressionBackpressured, true);
    assert.ok(manager.compressionRetainedBytes <= chunk.length);
    inflater.consume();
    assert.equal(manager.compressionBackpressured, false);
    assert.equal(manager.compressionRetainedBytes, 0);
  }

  assert.equal(pauses, 10_000);
  assert.equal(resumes, 10_000);
  assert.equal(manager.compressionBackpressurePauses, 10_000);
  assert.equal(manager.compressionPeakRetainedBytes, chunk.length);
  manager.resetCompressionTransport();
});

test('compression reset releases a socket paused for decoder backpressure', () => {
  class BackpressureInflater extends EventEmitter {
    constructor() {
      super();
      this.bytesWritten = 0;
    }
    write() { return false; }
    destroy() {}
  }

  const manager = new ConnectionManager();
  const inflater = new BackpressureInflater();
  let resumes = 0;
  manager.socket = { pause: () => {}, resume: () => { resumes += 1; } };
  manager.parser = { feed: () => {}, endCompressionStream: () => {} };
  manager.createCompressionInflater = () => inflater;

  manager.startCompression({ protocol: 'MCCP2', algorithm: 'deflate' });
  manager.handleSocketData(Buffer.alloc(1024));
  assert.equal(manager.compressionBackpressured, true);
  manager.resetCompressionTransport();
  assert.equal(manager.compressionBackpressured, false);
  assert.equal(resumes, 1);
});
