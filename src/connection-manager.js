'use strict';

const net = require('node:net');
const { createInflate, createZstdDecompress } = require('node:zlib');
const { StringDecoder } = require('node:string_decoder');
const { TelnetParser } = require('./telnet-parser');
const { GmcpStore } = require('./gmcp-store');

const COMPRESSION_OUTPUT_CHUNK_SIZE = 64 * 1024;
const { version: CLIENT_VERSION } = require('../package.json');

const CLIENT_NAME = 'NukeFire Client';

const GMCP_SUPPORTS = Object.freeze([
  'Core 1',
  'Char 1',
  'Char.Vitals 1',
  'Char.Status 1',
  'Char.StatusVars 1',
  'Char.MaxStats 1',
  'Char.TargetAffects 1',
  'Char.GPS 1',
  'Room 1',
  'Room.Info 1',
  'Comm 1',
  'Comm.Channel 1',
  'NukeFire.Comms 1',
  'NukeFire.GPS 1',
  'NukeFire.Context 1',
  'NukeFire.Controls 1',
  'NukeFire.Combat 1',
  'NukeFire.Speech 1',
  'NukeFire.Affects 1',
  'NukeFire.Mob 1',
  'NukeFire.Loot 1',
  'NukeFire.Sound 1',
  'NukeFire.Foundlist 1',
  'NukeFire.Map 1',
  'NukeFire.Knowledge 2',
  'Group 1'
]);

const INITIAL_GMCP_REQUESTS = Object.freeze([
  'Char.Vitals',
  'Char.Status',
  'Char.StatusVars',
  'Char.MaxStats',
  'Char.GPS',
  'NukeFire.GPS.Catalog',
  'NukeFire.Context',
  'NukeFire.Controls',
  'NukeFire.Affects',
  'Room.Info',
  'NukeFire.Map.Local',
  'Comm.Channel.List',
  'Group'
]);

class ConnectionManager {
  constructor(handlers = {}) {
    this.handlers = handlers;
    this.socket = null;
    this.parser = null;
    this.decoder = null;
    this.compressionInflater = null;
    this.compressionProtocol = '';
    this.compressionAlgorithm = '';
    this.compressionWireBytes = 0;
    this.compressionInflatedBytes = 0;
    this.compressionSubmittedBytes = 0;
    this.compressionInputQueue = [];
    this.compressionRetainedBytes = 0;
    this.compressionPeakRetainedBytes = 0;
    this.compressionBackpressured = false;
    this.compressionBackpressurePauses = 0;
    this.compressionReportTimer = null;
    this.connectionGeneration = 0;
    this.pendingCarriageReturn = false;
    this.status = 'disconnected';
    this.host = '';
    this.port = 0;
    this.terminalSize = { width: 120, height: 40 };
    this.preferences = { screenReaderMode: false, compressionEnabled: true };
    this.gmcpStore = new GmcpStore({ includeStateInEvents: false });
  }

  async connect(host, port) {
    this.disconnect();
    const generation = ++this.connectionGeneration;
    this.host = host;
    this.port = port;
    this.decoder = new StringDecoder('utf8');
    this.pendingCarriageReturn = false;
    this.gmcpStore.reset();
    this.resetCompressionSession();
    this.handlers.onGmcpState?.(this.gmcpStore.snapshot());

    this.parser = new TelnetParser({
      clientName: CLIENT_NAME,
      clientVersion: CLIENT_VERSION,
      screenReader: this.preferences.screenReaderMode,
      // Beta.68 plain-transport control: reproduce Beta.63's receive transport
      // while preserving the rest of the current client for a clean A/B test.
      compressionEnabled: this.preferences.compressionEnabled,
      getWindowSize: () => this.terminalSize,
      onData: (buffer) => this.handleTextBytes(buffer),
      onSend: (buffer) => this.writeRaw(buffer),
      onEcho: (enabled) => this.handlers.onEcho?.(enabled),
      onGmcp: (message) => this.handleGmcp(message),
      onPromptBoundary: (boundary) => this.handlers.onPromptBoundary?.(boundary),
      onProtocolWarning: (warning) => this.handlers.onProtocolWarning?.(warning),
      onOptionState: (optionState) => this.handlers.onOptionState?.(optionState),
      onCharset: (charset) => this.handlers.onCharset?.(charset),
      onTerminalType: (terminalType) => this.handlers.onTerminalType?.(terminalType),
      onWindowSize: (size) => this.handlers.onWindowSize?.(size),
      onNewEnvironment: (state) => this.handlers.onNewEnvironment?.(state),
      onCompressionStart: (state) => this.startCompression(state),
      onGmcpEnabled: () => this.initializeGmcp()
    });

    this.setStatus('connecting', `Connecting to ${host}:${port}…`);

    await new Promise((resolve, reject) => {
      let settled = false;
      const socket = net.createConnection({ host, port });
      this.socket = socket;
      const isCurrentSocket = () => (
        this.connectionGeneration === generation && this.socket === socket
      );
      socket.setKeepAlive(true, 30_000);
      socket.setNoDelay(true);
      socket.setTimeout(15_000);

      const fail = (error) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };

      socket.once('connect', () => {
        if (!isCurrentSocket()) {
          fail(new Error('Connection attempt replaced.'));
          return;
        }
        if (!settled) {
          settled = true;
          resolve();
        }
        socket.setTimeout(0);
        this.setStatus('connected', `Connected to ${host}:${port}`);
      });

      socket.on('data', (chunk) => {
        if (!isCurrentSocket()) return;
        this.handleSocketData(chunk);
      });

      socket.on('timeout', () => {
        if (!isCurrentSocket()) return;
        const error = new Error('The connection timed out.');
        this.handlers.onError?.(error.message);
        socket.destroy(error);
      });

      socket.on('error', (error) => {
        if (!isCurrentSocket()) {
          fail(new Error('Connection attempt replaced.'));
          return;
        }
        fail(error);
        this.handlers.onError?.(error.message);
        this.setStatus('error', error.message);
      });

      socket.on('close', () => {
        if (!isCurrentSocket()) {
          fail(new Error('Connection attempt replaced.'));
          return;
        }
        const tail = this.decoder?.end() ?? '';
        if (tail) this.emitNormalizedText(tail, true);
        this.resetCompressionTransport();
        this.socket = null;
        this.parser = null;
        this.decoder = null;
        this.handlers.onEcho?.(false);
        if (this.status !== 'error') {
          this.setStatus('disconnected', 'Disconnected');
        }
      });
    });
  }

  disconnect(message = '') {
    this.connectionGeneration += 1;
    const socket = this.socket;
    this.resetCompressionTransport();
    this.socket = null;
    this.parser = null;
    this.decoder = null;
    if (socket) {
      socket.end();
      socket.destroy();
    }
    this.pendingCarriageReturn = false;
    this.handlers.onEcho?.(false);
    this.setStatus('disconnected', message || 'Disconnected');
  }

  sendCommand(command) {
    if (!this.socket || this.socket.destroyed || this.status !== 'connected') {
      this.handlers.onError?.('Not connected.');
      return false;
    }

    const clean = String(command).replace(/[\r\n]+$/u, '');
    this.writeRaw(Buffer.from(`${clean}\r\n`, 'utf8'));
    return true;
  }

  sendGmcp(packageName, body) {
    return this.parser?.sendGmcp(packageName, body) ?? false;
  }

  initializeGmcp() {
    queueMicrotask(() => {
      if (!this.parser?.gmcpEnabled) return;

      this.parser.sendGmcp('Core.Hello', {
        client: CLIENT_NAME,
        version: CLIENT_VERSION
      });
      this.parser.sendGmcp('Core.Supports.Set', GMCP_SUPPORTS);

      for (const packageName of INITIAL_GMCP_REQUESTS) {
        this.parser.sendGmcp(packageName);
      }
    });
  }

  handleGmcp(message) {
    const event = this.gmcpStore.apply(message);
    // Each normalized GMCP event already carries the complete post-apply state.
    // Emitting a second full-state event for every packet made the renderer run
    // the same room/vitals/map work twice. onGmcpState remains reserved for
    // lifecycle snapshots such as the clean reset emitted at connect time.
    this.handlers.onGmcp?.(event);
  }

  getGmcpState() {
    return this.gmcpStore.snapshot();
  }

  setClientPreferences(preferences = {}) {
    if (Object.hasOwn(preferences, 'screenReaderMode')) {
      const nextScreenReaderMode = Boolean(preferences.screenReaderMode);
      if (nextScreenReaderMode !== this.preferences.screenReaderMode) {
        this.preferences.screenReaderMode = nextScreenReaderMode;
        this.parser?.setScreenReaderMode(nextScreenReaderMode);
      }
    }

    // Compression negotiation is deliberately connection-scoped. Remember a
    // changed preference now, but do not alter an active parser or abandon an
    // active decoder stream. The next connect() creates a fresh parser using
    // this value and negotiates MCCP2/MCCPX normally.
    if (Object.hasOwn(preferences, 'compressionEnabled')) {
      this.preferences.compressionEnabled = preferences.compressionEnabled !== false;
    }

    return { ...this.preferences };
  }

  setTerminalSize(width, height) {
    const nextWidth = Math.trunc(Math.max(1, Math.min(65535, Number(width) || 120)));
    const nextHeight = Math.trunc(Math.max(1, Math.min(65535, Number(height) || 40)));

    if (nextWidth === this.terminalSize.width && nextHeight === this.terminalSize.height) {
      return false;
    }

    this.terminalSize = { width: nextWidth, height: nextHeight };
    this.handlers.onWindowSize?.({ ...this.terminalSize, negotiated: false });

    return this.parser?.updateWindowSize(nextWidth, nextHeight) ?? false;
  }

  writeRaw(buffer) {
    if (this.socket && !this.socket.destroyed && this.socket.writable) {
      this.socket.write(buffer);
    }
  }

  handleSocketData(chunk) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    if (this.compressionInflater) {
      this.submitCompressionBytes(bytes);
      return;
    }
    this.parser?.feed(bytes);
  }

  createCompressionInflater(protocol, algorithm) {
    const normalizedProtocol = String(protocol || '').toUpperCase();
    const normalizedAlgorithm = String(algorithm || '').toLowerCase();

    if (normalizedProtocol === 'MCCP2' && normalizedAlgorithm === 'deflate') {
      return createInflate({ chunkSize: COMPRESSION_OUTPUT_CHUNK_SIZE });
    }
    if (normalizedProtocol === 'MCCPX' && normalizedAlgorithm === 'deflate') {
      return createInflate({ chunkSize: COMPRESSION_OUTPUT_CHUNK_SIZE });
    }
    if (normalizedProtocol === 'MCCPX' && normalizedAlgorithm === 'zstd') {
      if (typeof createZstdDecompress !== 'function') {
        throw new Error('This Electron/Node runtime does not provide Zstandard decompression.');
      }
      return createZstdDecompress({ chunkSize: COMPRESSION_OUTPUT_CHUNK_SIZE });
    }

    throw new Error(`Unsupported compression selection: ${normalizedProtocol || 'unknown'}/${normalizedAlgorithm || 'unknown'}.`);
  }

  compressionAlgorithmLabel(protocol = this.compressionProtocol, algorithm = this.compressionAlgorithm) {
    if (String(protocol).toUpperCase() === 'MCCPX' && String(algorithm).toLowerCase() === 'zstd') {
      return 'Zstandard';
    }
    if (String(algorithm).toLowerCase() === 'deflate') return 'zlib/DEFLATE';
    return String(algorithm || '');
  }

  submitCompressionBytes(buffer) {
    const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
    if (!this.compressionInflater || bytes.length === 0) return false;

    // Reclaim input already consumed by the native inflater before retaining
    // the next socket Buffer. Socket Buffers remain valid after the data
    // callback, so an extra Buffer.from() copy on every compressed packet is
    // unnecessary. The retained queue exists only for the rare copyover frame
    // boundary where raw Telnet bytes follow compressed data.
    this.pruneCompressionInput(this.compressionInflater.bytesWritten);
    const start = this.compressionSubmittedBytes;
    this.compressionSubmittedBytes += bytes.length;
    this.compressionWireBytes += bytes.length;
    this.compressionInputQueue.push({
      start,
      end: start + bytes.length,
      buffer: bytes
    });
    this.compressionRetainedBytes += bytes.length;
    this.compressionPeakRetainedBytes = Math.max(
      this.compressionPeakRetainedBytes,
      this.compressionRetainedBytes
    );

    const inflater = this.compressionInflater;
    const accepted = inflater.write(bytes);
    this.pruneCompressionInput(inflater.bytesWritten);

    /* A false write result is Node's instruction to stop supplying input
     * until drain.  Continuing to accept socket data here lets the native
     * codec backlog and our copyover-boundary queue grow for the lifetime of
     * a busy connection. */
    if (!accepted && !this.compressionBackpressured) {
      const generation = this.connectionGeneration;
      this.compressionBackpressured = true;
      this.compressionBackpressurePauses += 1;
      this.socket?.pause?.();
      inflater.once('drain', () => {
        if (this.compressionInflater !== inflater || this.connectionGeneration !== generation) return;
        this.pruneCompressionInput(inflater.bytesWritten);
        if (!this.compressionBackpressured) return;
        this.compressionBackpressured = false;
        this.socket?.resume?.();
      });
    }
    return true;
  }

  pruneCompressionInput(consumedBytes) {
    const consumed = Math.max(0, Number(consumedBytes) || 0);
    const queue = this.compressionInputQueue;
    if (!queue.length) return;

    let removeCount = 0;
    let removedBytes = 0;
    while (removeCount < queue.length && queue[removeCount].end <= consumed) {
      removedBytes += queue[removeCount].buffer.length;
      removeCount += 1;
    }
    if (removeCount > 0) queue.splice(0, removeCount);
    this.compressionRetainedBytes = Math.max(0, this.compressionRetainedBytes - removedBytes);

    const first = queue[0];
    if (first && first.start < consumed) {
      const offset = consumed - first.start;
      first.buffer = first.buffer.subarray(offset);
      first.start = consumed;
      this.compressionRetainedBytes = Math.max(0, this.compressionRetainedBytes - offset);
    }
  }

  collectCompressionRemainder(consumedBytes) {
    this.pruneCompressionInput(consumedBytes);
    if (this.compressionInputQueue.length === 0) return Buffer.alloc(0);
    return Buffer.concat(this.compressionInputQueue.map((entry) => entry.buffer));
  }

  startCompression({ protocol = 'MCCP2', algorithm = 'deflate', remainder = Buffer.alloc(0) } = {}) {
    if (this.compressionInflater) {
      this.handlers.onProtocolWarning?.({
        code: 'duplicate-compression-start',
        message: 'A second compression stream start was ignored while one is already active.'
      });
      return false;
    }

    const normalizedProtocol = String(protocol || '').toUpperCase();
    const normalizedAlgorithm = String(algorithm || '').toLowerCase();
    let inflater;
    try {
      inflater = this.createCompressionInflater(normalizedProtocol, normalizedAlgorithm);
    } catch (error) {
      this.handlers.onProtocolWarning?.({
        code: 'unsupported-compression',
        message: error.message,
        protocol: normalizedProtocol,
        algorithm: normalizedAlgorithm
      });
      this.handlers.onError?.(error.message);
      this.socket?.destroy(error);
      return false;
    }

    const generation = this.connectionGeneration;
    this.compressionInflater = inflater;
    this.compressionProtocol = normalizedProtocol;
    this.compressionAlgorithm = normalizedAlgorithm;
    this.compressionSubmittedBytes = 0;
    this.compressionInputQueue = [];
    this.compressionRetainedBytes = 0;
    this.compressionPeakRetainedBytes = 0;
    this.compressionBackpressured = false;

    inflater.on('data', (buffer) => {
      if (this.compressionInflater !== inflater || this.connectionGeneration !== generation) return;
      this.pruneCompressionInput(inflater.bytesWritten);
      this.compressionInflatedBytes += buffer.length;
      this.parser?.feed(buffer);
      this.reportCompressionState();
    });

    const finishCompressionBoundary = (consumedBytes) => {
      if (this.compressionInflater !== inflater || this.connectionGeneration !== generation) return false;

      const remainderBytes = this.collectCompressionRemainder(consumedBytes);
      this.compressionWireBytes = Math.max(0, this.compressionWireBytes - remainderBytes.length);
      this.compressionInflater = null;
      this.compressionInputQueue = [];
      this.compressionSubmittedBytes = 0;
      this.compressionRetainedBytes = 0;
      const resumeSocket = this.compressionBackpressured;
      this.compressionBackpressured = false;
      if (typeof this.parser?.endCompressionStream === 'function') {
        this.parser.endCompressionStream(normalizedProtocol);
      } else if (normalizedProtocol === 'MCCP2') {
        this.parser?.endMccp2Stream?.();
      }
      this.reportCompressionState({ force: true, active: false });

      // Destroy only after detaching it from the live connection.  Node's Zstd
      // transform does not emit `end` merely because one frame has completed
      // while the underlying TCP stream stays open.  On NukeFire copyover the
      // first raw post-frame Telnet byte therefore arrives as "garbage after
      // end" and is surfaced as Unknown frame descriptor.  bytesWritten still
      // stops exactly at the completed Zstd frame, so the queued remainder is
      // the raw Telnet continuation and must be returned to the parser.
      inflater.destroy();
      if (remainderBytes.length > 0) this.parser?.feed(remainderBytes);
      if (resumeSocket) this.socket?.resume?.();
      return true;
    };

    inflater.on('error', (error) => {
      if (this.compressionInflater !== inflater || this.connectionGeneration !== generation) return;

      const isZstdFrameBoundary =
        normalizedProtocol === 'MCCPX' &&
        normalizedAlgorithm === 'zstd' &&
        error?.message === 'Unknown frame descriptor' &&
        Number(inflater.bytesWritten) > 0 &&
        this.compressionInflatedBytes > 0 &&
        this.collectCompressionRemainder(inflater.bytesWritten).length > 0;

      if (isZstdFrameBoundary) {
        finishCompressionBoundary(inflater.bytesWritten);
        return;
      }

      this.handlers.onProtocolWarning?.({
        code: 'compression-decode-error',
        message: `${normalizedProtocol} ${normalizedAlgorithm} decompression failed.`,
        detail: error.message
      });
      this.handlers.onError?.(`${normalizedProtocol} decompression failed: ${error.message}`);
      this.socket?.destroy(error);
    });

    inflater.on('end', () => {
      finishCompressionBoundary(inflater.bytesWritten);
    });

    this.reportCompressionState({ force: true, active: true });

    const tail = Buffer.isBuffer(remainder) ? remainder : Buffer.from(remainder || []);
    if (tail.length > 0) this.submitCompressionBytes(tail);
    return true;
  }

  startMccp2({ remainder = Buffer.alloc(0) } = {}) {
    return this.startCompression({ protocol: 'MCCP2', algorithm: 'deflate', remainder });
  }

  resetCompressionTransport() {
    const inflater = this.compressionInflater;
    this.compressionInflater = null;
    this.compressionInputQueue = [];
    this.compressionSubmittedBytes = 0;
    this.compressionRetainedBytes = 0;
    const resumeSocket = this.compressionBackpressured;
    this.compressionBackpressured = false;
    if (inflater) inflater.destroy();
    if (resumeSocket) this.socket?.resume?.();
    this.reportCompressionState({ force: true, active: false });
  }

  resetMccp2() {
    this.resetCompressionTransport();
  }

  resetCompressionSession() {
    this.compressionProtocol = '';
    this.compressionAlgorithm = '';
    this.compressionWireBytes = 0;
    this.compressionInflatedBytes = 0;
    this.compressionPeakRetainedBytes = 0;
    this.compressionBackpressurePauses = 0;
    if (this.compressionReportTimer !== null) {
      clearTimeout(this.compressionReportTimer);
      this.compressionReportTimer = null;
    }
    this.reportCompressionState({ force: true, active: false });
  }

  reportCompressionState({ force = false, active = Boolean(this.compressionInflater) } = {}) {
    if (!force) {
      if (this.compressionReportTimer !== null || typeof this.handlers.onCompressionState !== 'function') return false;
      const generation = this.connectionGeneration;
      this.compressionReportTimer = setTimeout(() => {
        this.compressionReportTimer = null;
        if (this.connectionGeneration !== generation || !this.compressionInflater) return;
        this.handlers.onCompressionState(this.getCompressionState(true));
      }, 1000);
      return true;
    }

    if (this.compressionReportTimer !== null) {
      clearTimeout(this.compressionReportTimer);
      this.compressionReportTimer = null;
    }
    this.handlers.onCompressionState?.(this.getCompressionState(active));
    return true;
  }

  getCompressionState(active = Boolean(this.compressionInflater)) {
    return {
      protocol: this.compressionProtocol,
      algorithm: this.compressionAlgorithmLabel(),
      active: Boolean(active),
      wireBytes: this.compressionWireBytes,
      inflatedBytes: this.compressionInflatedBytes,
      retainedBytes: this.compressionRetainedBytes,
      peakRetainedBytes: this.compressionPeakRetainedBytes,
      backpressured: this.compressionBackpressured,
      backpressurePauses: this.compressionBackpressurePauses
    };
  }

  handleTextBytes(buffer) {
    if (!this.decoder) return;
    const text = this.decoder.write(buffer);
    if (text) this.emitNormalizedText(text, false);
  }

  emitNormalizedText(text, flush) {
    let source = text;
    let output = '';

    if (this.pendingCarriageReturn) {
      if (source.startsWith('\n')) source = source.slice(1);
      output += '\n';
      this.pendingCarriageReturn = false;
    }

    if (!flush && source.endsWith('\r')) {
      source = source.slice(0, -1);
      this.pendingCarriageReturn = true;
    }

    output += source.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (flush && this.pendingCarriageReturn) {
      output += '\n';
      this.pendingCarriageReturn = false;
    }

    if (output) this.handlers.onText?.(output);
  }

  setStatus(state, message) {
    this.status = state;
    this.handlers.onStatus?.({ state, message, host: this.host, port: this.port });
  }
}

module.exports = {
  ConnectionManager,
  GMCP_SUPPORTS,
  INITIAL_GMCP_REQUESTS,
  CLIENT_NAME,
  CLIENT_VERSION
};
