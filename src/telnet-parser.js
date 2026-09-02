'use strict';

const IAC = 255;
const DONT = 254;
const DO = 253;
const WONT = 252;
const WILL = 251;
const SB = 250;
const GA = 249;
const EOR = 239;
const SE = 240;

const OPT = Object.freeze({
  ECHO: 1,
  SUPPRESS_GO_AHEAD: 3,
  TERMINAL_TYPE: 24,
  END_OF_RECORD: 25,
  NAWS: 31,
  NEW_ENVIRON: 39,
  CHARSET: 42,
  MCCP1: 85,
  MCCP2: 86,
  MCCPX: 88,
  GMCP: 201
});

const TTYPE_IS = 0;
const TTYPE_SEND = 1;

const MCCPX = Object.freeze({
  ACCEPT_ENCODING: 1,
  BEGIN_ENCODING: 2,
  WONT: 252,
  SUPPORTED_ENCODINGS: Object.freeze(['zstd', 'deflate'])
});

const CHARSET = Object.freeze({
  REQUEST: 1,
  ACCEPTED: 2,
  REJECTED: 3
});

const ENVIRON = Object.freeze({
  IS: 0,
  SEND: 1,
  INFO: 2,
  VAR: 0,
  VAL: 1,
  ESC: 2,
  USERVAR: 3
});

const OPTION_STATE = Object.freeze({
  NO: 'no',
  YES: 'yes'
});

const DEFAULT_MAX_SUBNEGOTIATION_BYTES = 1024 * 1024;

function clampDimension(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.min(65535, Math.trunc(numeric)));
}

function makeMttsBitvector(screenReader) {
  // MTTS: ANSI (1), UTF-8 (4), 256 colors (8), truecolor (256), MNES (512).
  // Screen-reader mode additionally advertises bit 64.
  return 781 + (screenReader ? 64 : 0);
}

function makeTerminalTypes(screenReader) {
  return ['NUKEFIRE-MAC', 'XTERM-TRUECOLOR', `MTTS ${makeMttsBitvector(screenReader)}`];
}

class TelnetParser {
  constructor(handlers = {}) {
    this.handlers = handlers;

    this.state = 'data';
    this.pendingCommand = null;
    this.subOption = null;
    this.subData = [];
    this.subOverflow = false;
    this.data = [];
    this.dataBytes = 0;

    this.maxSubnegotiationBytes = Math.max(
      8,
      Number(handlers.maxSubnegotiationBytes) || DEFAULT_MAX_SUBNEGOTIATION_BYTES
    );

    this.remoteOptions = new Map();
    this.localOptions = new Map();
    this.remoteRefused = new Set();
    this.localRefused = new Set();

    this.remoteEcho = false;
    this.gmcpEnabled = false;
    this.endOfRecordEnabled = false;
    this.nawsEnabled = false;
    this.charsetEnabled = false;
    this.terminalTypeEnabled = false;
    this.newEnvironmentEnabled = false;
    this.mccp2Negotiated = false;
    this.mccp2Active = false;
    this.mccpxNegotiated = false;
    this.mccpxActive = false;
    this.compressionBoundary = null;
    this.compressionRemainder = [];

    this.clientName = String(handlers.clientName || 'NukeFire Client').trim() || 'NukeFire Client';
    this.clientVersion = String(handlers.clientVersion || '0.0.0').trim() || '0.0.0';
    this.charset = 'UTF-8';
    this.terminalType = 'XTERM-TRUECOLOR';
    this.screenReader = Boolean(handlers.screenReader);
    this.compressionEnabled = handlers.compressionEnabled !== false;
    this.customTerminalTypes = Array.isArray(handlers.terminalTypes) &&
      handlers.terminalTypes.length > 0;
    this.terminalTypes = this.customTerminalTypes
      ? handlers.terminalTypes.map((value) => String(value).trim()).filter(Boolean)
      : makeTerminalTypes(this.screenReader);
    this.terminalTypeIndex = 0;

    this.windowSize = this.readWindowSize();
    this.lastNaws = null;
  }

  feed(chunk) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    let index = 0;

    while (index < bytes.length) {
      if (this.compressionBoundary) {
        this.compressionRemainder.push(bytes.subarray(index));
        index = bytes.length;
        break;
      }

      if (this.state === 'data') {
        /* Ordinary MUD output is overwhelmingly plain text. Scan to the next
         * Telnet IAC boundary and pass that byte run onward as one Buffer view
         * instead of pushing every text byte through a JavaScript array. */
        const iacIndex = bytes.indexOf(IAC, index);

        if (iacIndex < 0) {
          this.appendData(bytes.subarray(index));
          index = bytes.length;
          break;
        }

        if (iacIndex > index) {
          this.appendData(bytes.subarray(index, iacIndex));
        }

        this.flushData();
        this.state = 'iac';
        index = iacIndex + 1;
        continue;
      }

      const byte = bytes[index++];

      switch (this.state) {
        case 'iac':
          if (byte === IAC) {
            this.appendDataByte(IAC);
            this.state = 'data';
          } else if ([DO, DONT, WILL, WONT].includes(byte)) {
            this.pendingCommand = byte;
            this.state = 'negotiation';
          } else if (byte === SB) {
            this.state = 'sb-option';
          } else if (byte === GA || byte === EOR) {
            this.handlers.onPromptBoundary?.({ type: byte === GA ? 'ga' : 'eor' });
            this.state = 'data';
          } else {
            this.handlers.onTelnetCommand?.({ command: byte });
            this.state = 'data';
          }
          break;

        case 'negotiation':
          this.handleNegotiation(this.pendingCommand, byte);
          this.pendingCommand = null;
          this.state = 'data';
          break;

        case 'sb-option':
          this.subOption = byte;
          this.subData = [];
          this.subOverflow = false;
          this.state = 'sb-data';
          break;

        case 'sb-data':
          if (byte === IAC) {
            this.state = 'sb-iac';
          } else {
            this.appendSubnegotiationByte(byte);
          }
          break;

        case 'sb-iac':
          if (byte === IAC) {
            this.appendSubnegotiationByte(IAC);
            this.state = 'sb-data';
          } else if (byte === SE) {
            const option = this.subOption;
            const payload = Buffer.from(this.subData);
            const overflow = this.subOverflow;

            this.subOption = null;
            this.subData = [];
            this.subOverflow = false;
            this.state = 'data';

            if (!overflow) this.handleSubnegotiation(option, payload);
          } else {
            this.warn(
              'malformed-subnegotiation',
              'Unexpected Telnet command inside subnegotiation.',
              { option: this.subOption, command: byte }
            );
            this.state = 'sb-data';
          }
          break;

        default:
          this.warn(
            'unknown-parser-state',
            'The Telnet parser recovered from an unknown state.',
            { state: this.state }
          );
          this.state = 'data';
      }
    }

    this.flushData();

    if (this.compressionBoundary) {
      const start = this.compressionBoundary;
      const remainder = this.compressionRemainder.length === 0
        ? Buffer.alloc(0)
        : this.compressionRemainder.length === 1
          ? this.compressionRemainder[0]
          : Buffer.concat(this.compressionRemainder);
      this.compressionBoundary = null;
      this.compressionRemainder = [];
      this.handlers.onCompressionStart?.({ ...start, remainder });
      if (start.protocol === 'MCCP2') this.handlers.onMccp2Start?.({ remainder });
    }
  }

  appendSubnegotiationByte(byte) {
    if (this.subOverflow) return;

    if (this.subData.length >= this.maxSubnegotiationBytes) {
      this.subData = [];
      this.subOverflow = true;
      this.warn(
        'subnegotiation-too-large',
        'A Telnet subnegotiation exceeded the configured safety limit.',
        { option: this.subOption, limit: this.maxSubnegotiationBytes }
      );
      return;
    }

    this.subData.push(byte);
  }

  appendData(buffer) {
    if (!buffer || buffer.length === 0) return;
    this.data.push(buffer);
    this.dataBytes += buffer.length;
  }

  appendDataByte(byte) {
    this.appendData(Buffer.from([byte]));
  }

  flushData() {
    if (this.dataBytes === 0) return;
    const payload = this.data.length === 1
      ? this.data[0]
      : Buffer.concat(this.data, this.dataBytes);
    this.data = [];
    this.dataBytes = 0;
    this.handlers.onData?.(payload);
  }

  warn(code, message, details = {}) {
    this.handlers.onProtocolWarning?.({ code, message, ...details });
  }

  send(...bytes) {
    this.handlers.onSend?.(Buffer.from(bytes));
  }

  sendSubnegotiation(option, payload) {
    const source = Buffer.isBuffer(payload) ? payload : Buffer.from(payload || []);
    const escaped = [];

    for (const byte of source) {
      escaped.push(byte);
      if (byte === IAC) escaped.push(IAC);
    }

    this.handlers.onSend?.(Buffer.from([IAC, SB, option, ...escaped, IAC, SE]));
  }

  getOptionState(direction, option) {
    const states = direction === 'local' ? this.localOptions : this.remoteOptions;
    return states.get(option) || OPTION_STATE.NO;
  }

  setOptionState(direction, option, state) {
    const states = direction === 'local' ? this.localOptions : this.remoteOptions;
    const previous = states.get(option) || OPTION_STATE.NO;
    if (previous === state) return false;

    states.set(option, state);
    this.handlers.onOptionState?.({
      direction,
      option,
      enabled: state === OPTION_STATE.YES
    });
    return true;
  }

  handleNegotiation(command, option) {
    if (command === WILL) return this.receiveWill(option);
    if (command === WONT) return this.receiveWont(option);
    if (command === DO) return this.receiveDo(option);
    if (command === DONT) return this.receiveDont(option);

    this.warn(
      'unknown-negotiation-command',
      'Unknown Telnet negotiation command.',
      { command, option }
    );
  }

  receiveWill(option) {
    if (!this.isRemoteOptionAllowed(option)) {
      if (!this.remoteRefused.has(option)) {
        this.send(IAC, DONT, option);
        this.remoteRefused.add(option);
      }
      if (this.setOptionState('remote', option, OPTION_STATE.NO)) {
        this.onRemoteOptionChanged(option, false);
      }
      return;
    }

    this.remoteRefused.delete(option);
    if (this.getOptionState('remote', option) === OPTION_STATE.YES) return;

    this.send(IAC, DO, option);
    this.setOptionState('remote', option, OPTION_STATE.YES);
    this.onRemoteOptionChanged(option, true);
  }

  receiveWont(option) {
    this.remoteRefused.delete(option);
    if (this.getOptionState('remote', option) === OPTION_STATE.NO) return;

    this.setOptionState('remote', option, OPTION_STATE.NO);
    this.onRemoteOptionChanged(option, false);
  }

  receiveDo(option) {
    if (!this.isLocalOptionAllowed(option)) {
      if (!this.localRefused.has(option)) {
        this.send(IAC, WONT, option);
        this.localRefused.add(option);
      }
      if (this.setOptionState('local', option, OPTION_STATE.NO)) {
        this.onLocalOptionChanged(option, false);
      }
      return;
    }

    this.localRefused.delete(option);
    if (this.getOptionState('local', option) === OPTION_STATE.YES) return;

    this.send(IAC, WILL, option);
    this.setOptionState('local', option, OPTION_STATE.YES);
    this.onLocalOptionChanged(option, true);
  }

  receiveDont(option) {
    this.localRefused.delete(option);
    if (this.getOptionState('local', option) === OPTION_STATE.NO) return;

    this.send(IAC, WONT, option);
    this.setOptionState('local', option, OPTION_STATE.NO);
    this.onLocalOptionChanged(option, false);
  }

  isRemoteOptionAllowed(option) {
    if (!this.compressionEnabled && (option === OPT.MCCP2 || option === OPT.MCCPX)) return false;
    if (option === OPT.MCCP2 && (this.mccpxNegotiated || this.mccpxActive)) return false;
    if (option === OPT.MCCPX && (this.mccp2Negotiated || this.mccp2Active)) return false;

    return [
      OPT.ECHO,
      OPT.SUPPRESS_GO_AHEAD,
      OPT.END_OF_RECORD,
      OPT.MCCP2,
      OPT.MCCPX,
      OPT.GMCP
    ].includes(option);
  }

  isLocalOptionAllowed(option) {
    return [
      OPT.SUPPRESS_GO_AHEAD,
      OPT.TERMINAL_TYPE,
      OPT.NAWS,
      OPT.NEW_ENVIRON,
      OPT.CHARSET,
      OPT.GMCP
    ].includes(option);
  }

  onRemoteOptionChanged(option, enabled) {
    if (option === OPT.ECHO) this.setRemoteEcho(enabled);
    if (option === OPT.END_OF_RECORD) this.endOfRecordEnabled = enabled;
    if (option === OPT.MCCP2) this.mccp2Negotiated = enabled;
    if (option === OPT.MCCPX) {
      this.mccpxNegotiated = enabled;
      if (enabled) {
        this.sendSubnegotiation(
          OPT.MCCPX,
          Buffer.concat([
            Buffer.from([MCCPX.ACCEPT_ENCODING]),
            Buffer.from(MCCPX.SUPPORTED_ENCODINGS.join(','), 'ascii')
          ])
        );
      }
    }
    if (option === OPT.GMCP) this.updateGmcpEnabled();
  }

  onLocalOptionChanged(option, enabled) {
    if (option === OPT.TERMINAL_TYPE) {
      this.terminalTypeEnabled = enabled;
      if (!enabled) this.terminalTypeIndex = 0;
    }

    if (option === OPT.NAWS) {
      this.nawsEnabled = enabled;
      if (enabled) {
        const current = this.readWindowSize();
        this.windowSize = current;
        this.sendNaws(current.width, current.height, true);
      } else {
        this.lastNaws = null;
      }
    }

    if (option === OPT.NEW_ENVIRON) {
      this.newEnvironmentEnabled = enabled;
      if (!enabled) this.handlers.onNewEnvironment?.({ enabled: false, variables: {} });
      else this.handlers.onNewEnvironment?.({ enabled: true, variables: this.environmentSnapshot() });
    }
    if (option === OPT.CHARSET) this.charsetEnabled = enabled;
    if (option === OPT.GMCP) this.updateGmcpEnabled();
  }

  updateGmcpEnabled() {
    const enabled =
      this.getOptionState('remote', OPT.GMCP) === OPTION_STATE.YES ||
      this.getOptionState('local', OPT.GMCP) === OPTION_STATE.YES;

    if (this.gmcpEnabled === enabled) return;
    this.gmcpEnabled = enabled;

    if (enabled) this.handlers.onGmcpEnabled?.();
    else this.handlers.onGmcpDisabled?.();
  }

  handleSubnegotiation(option, payload) {
    if (option === OPT.TERMINAL_TYPE) return this.handleTerminalType(payload);
    if (option === OPT.NEW_ENVIRON) return this.handleNewEnvironment(payload);
    if (option === OPT.CHARSET) return this.handleCharset(payload);
    if (option === OPT.MCCP2) return this.handleMccp2(payload);
    if (option === OPT.MCCPX) return this.handleMccpx(payload);
    if (option === OPT.GMCP) return this.handleGmcp(payload);

    this.handlers.onSubnegotiation?.({ option, payload });
  }

  endCompressionStream(protocol) {
    // Compression can end without closing the Telnet connection (notably
    // across NukeFire copyover). Preserve negotiated option state so the new
    // server process can start a replacement stream on the same socket.
    if (protocol === 'MCCPX') this.mccpxActive = false;
    if (protocol === 'MCCP2') this.mccp2Active = false;
    this.compressionBoundary = null;
    this.compressionRemainder = [];
  }

  endMccp2Stream() {
    this.endCompressionStream('MCCP2');
  }

  handleMccp2(payload) {
    if (!this.mccp2Negotiated) {
      this.warn('mccp2-without-negotiation', 'MCCP2 start arrived before successful negotiation.');
      return;
    }

    if (payload.length !== 0) {
      this.warn('malformed-mccp2-start', 'MCCP2 start subnegotiation must have an empty payload.');
      return;
    }

    if (this.mccp2Active) {
      this.warn('duplicate-mccp2-start', 'Duplicate MCCP2 start marker ignored.');
      return;
    }

    this.mccp2Active = true;
    this.compressionBoundary = { protocol: 'MCCP2', algorithm: 'deflate' };
  }

  handleMccpx(payload) {
    if (!this.mccpxNegotiated) {
      this.warn('mccpx-without-negotiation', 'MCCPX activation arrived before successful negotiation.');
      return;
    }

    if (payload.length < 2 || payload[0] !== MCCPX.BEGIN_ENCODING) {
      this.warn('malformed-mccpx-begin', 'MCCPX BEGIN_ENCODING was malformed.');
      return;
    }

    const encoding = payload.subarray(1).toString('ascii').toLowerCase();
    if (!MCCPX.SUPPORTED_ENCODINGS.includes(encoding)) {
      this.warn('unsupported-mccpx-encoding', `MCCPX requested unsupported encoding: ${encoding || '(empty)'}.`);
      return;
    }

    if (this.mccpxActive || this.compressionBoundary) {
      this.warn('duplicate-mccpx-start', 'Duplicate MCCPX compression start ignored.');
      return;
    }

    this.mccpxActive = true;
    this.compressionBoundary = { protocol: 'MCCPX', algorithm: encoding };
  }

  handleTerminalType(payload) {
    if (!this.terminalTypeEnabled || payload[0] !== TTYPE_SEND) return;

    const index = Math.min(this.terminalTypeIndex, this.terminalTypes.length - 1);
    const response = this.terminalTypes[index];
    if (this.terminalTypeIndex < this.terminalTypes.length - 1) {
      this.terminalTypeIndex += 1;
    }

    this.sendSubnegotiation(
      OPT.TERMINAL_TYPE,
      Buffer.concat([Buffer.from([TTYPE_IS]), Buffer.from(response, 'ascii')])
    );

    this.handlers.onTerminalType?.({ value: response, index });
  }

  handleCharset(payload) {
    if (!this.charsetEnabled || payload[0] !== CHARSET.REQUEST) return;

    if (payload.length < 3) {
      this.sendSubnegotiation(OPT.CHARSET, Buffer.from([CHARSET.REJECTED]));
      return;
    }

    const separator = String.fromCharCode(payload[1]);
    const offered = payload
      .subarray(2)
      .toString('ascii')
      .split(separator)
      .map((value) => value.trim())
      .filter(Boolean);

    const supportsUtf8 = offered.some((value) =>
      value.replace(/[-_]/gu, '').toUpperCase() === 'UTF8'
    );

    if (!supportsUtf8) {
      this.sendSubnegotiation(OPT.CHARSET, Buffer.from([CHARSET.REJECTED]));
      this.handlers.onCharset?.({ accepted: false, offered });
      return;
    }

    this.sendSubnegotiation(
      OPT.CHARSET,
      Buffer.concat([Buffer.from([CHARSET.ACCEPTED]), Buffer.from('UTF-8', 'ascii')])
    );
    this.handlers.onCharset?.({ accepted: true, charset: 'UTF-8', offered });
  }

  environmentSnapshot() {
    return {
      standard: {
        CHARSET: this.charset,
        CLIENT_NAME: this.clientName,
        CLIENT_VERSION: this.clientVersion,
        MTTS: String(makeMttsBitvector(this.screenReader)),
        TERMINAL_TYPE: this.terminalType
      },
      user: {
        OSC_HYPERLINKS: '1',
        OSC_HYPERLINKS_SEND: '1',
        OSC_HYPERLINKS_PROMPT: '1'
      }
    };
  }

  parseEnvironmentRequest(payload) {
    if (!payload.length || payload[0] !== ENVIRON.SEND) return null;
    const requests = [];
    let kind = null;
    let bytes = [];

    const flush = () => {
      if (kind === null) return;
      requests.push({ kind, name: Buffer.from(bytes).toString('ascii').trim().toUpperCase() });
      bytes = [];
    };

    for (let index = 1; index < payload.length; index += 1) {
      const byte = payload[index];
      if (byte === ENVIRON.VAR || byte === ENVIRON.USERVAR) {
        flush();
        kind = byte;
        continue;
      }
      if (byte === ENVIRON.ESC) {
        if (index + 1 >= payload.length) {
          this.warn('malformed-new-environ', 'NEW-ENVIRON ended with an incomplete escape.');
          return null;
        }
        bytes.push(payload[index + 1]);
        index += 1;
        continue;
      }
      bytes.push(byte);
    }
    flush();
    return requests;
  }

  appendEnvironmentText(output, value) {
    for (const byte of Buffer.from(String(value || ''), 'ascii')) {
      if ([ENVIRON.VAR, ENVIRON.VAL, ENVIRON.ESC, ENVIRON.USERVAR, IAC].includes(byte)) {
        output.push(ENVIRON.ESC);
      }
      output.push(byte);
    }
  }

  appendEnvironmentPair(output, kind, name, value) {
    output.push(kind);
    this.appendEnvironmentText(output, name);
    output.push(ENVIRON.VAL);
    this.appendEnvironmentText(output, value);
  }

  sendEnvironmentRecords(records, command = ENVIRON.IS) {
    if (!this.newEnvironmentEnabled) return false;
    const response = [command];
    for (const record of records || []) {
      this.appendEnvironmentPair(response, record.kind, record.name, record.value);
    }
    this.sendSubnegotiation(OPT.NEW_ENVIRON, Buffer.from(response));
    return true;
  }

  handleNewEnvironment(payload) {
    if (!this.newEnvironmentEnabled) return;
    const requests = this.parseEnvironmentRequest(payload);
    if (requests === null) return;

    const snapshot = this.environmentSnapshot();
    const selected = [];
    const addAll = (kind, source) => {
      for (const [name, value] of Object.entries(source)) selected.push({ kind, name, value });
    };

    if (requests.length === 0) {
      addAll(ENVIRON.VAR, snapshot.standard);
      addAll(ENVIRON.USERVAR, snapshot.user);
    } else {
      for (const request of requests) {
        const source = request.kind === ENVIRON.USERVAR ? snapshot.user : snapshot.standard;
        if (!request.name) {
          addAll(request.kind, source);
          continue;
        }
        if (Object.hasOwn(source, request.name)) {
          selected.push({ kind: request.kind, name: request.name, value: source[request.name] });
        }
      }
    }

    this.sendEnvironmentRecords(selected, ENVIRON.IS);
    this.handlers.onNewEnvironment?.({
      enabled: true,
      requested: requests,
      sent: selected.map((record) => ({ ...record }))
    });
  }

  handleGmcp(payload) {
    const message = payload.toString('utf8').replace(/\0+$/u, '');
    const separator = message.search(/\s/u);
    const packageName = (separator === -1 ? message : message.slice(0, separator)).trim();
    const rawBody = separator === -1 ? '' : message.slice(separator + 1).trimStart();

    if (!packageName) {
      this.warn('empty-gmcp-package', 'Received a GMCP message without a package name.');
      return;
    }

    let body = rawBody;
    if (rawBody) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        // Some GMCP packages legitimately use non-JSON bodies.
      }
    }

    this.handlers.onGmcp?.({ packageName, body, rawBody });
  }

  readWindowSize() {
    const supplied = this.handlers.getWindowSize?.();

    if (Array.isArray(supplied)) {
      return {
        width: clampDimension(supplied[0], 120),
        height: clampDimension(supplied[1], 40)
      };
    }

    if (supplied && typeof supplied === 'object') {
      return {
        width: clampDimension(supplied.width, 120),
        height: clampDimension(supplied.height, 40)
      };
    }

    return { width: 120, height: 40 };
  }

  updateWindowSize(width, height) {
    return this.sendNaws(width, height, false);
  }

  sendNaws(width, height, force = false) {
    const next = {
      width: clampDimension(width, 120),
      height: clampDimension(height, 40)
    };
    this.windowSize = next;

    if (!this.nawsEnabled) return false;
    if (
      !force &&
      this.lastNaws &&
      this.lastNaws.width === next.width &&
      this.lastNaws.height === next.height
    ) {
      return false;
    }

    this.sendSubnegotiation(
      OPT.NAWS,
      Buffer.from([
        (next.width >> 8) & 0xff,
        next.width & 0xff,
        (next.height >> 8) & 0xff,
        next.height & 0xff
      ])
    );

    this.lastNaws = { ...next };
    this.handlers.onWindowSize?.({ ...next });
    return true;
  }

  setScreenReaderMode(enabled) {
    const previousMtts = makeMttsBitvector(this.screenReader);
    this.screenReader = Boolean(enabled);
    if (!this.customTerminalTypes) {
      this.terminalTypes = makeTerminalTypes(this.screenReader);
    }
    const nextMtts = makeMttsBitvector(this.screenReader);
    if (nextMtts !== previousMtts && this.newEnvironmentEnabled) {
      const sent = [{ kind: ENVIRON.VAR, name: 'MTTS', value: String(nextMtts) }];
      this.sendEnvironmentRecords(sent, ENVIRON.INFO);
      this.handlers.onNewEnvironment?.({ enabled: true, updated: sent.map((record) => ({ ...record })) });
    }
    return this.screenReader;
  }

  sendGmcp(packageName, body) {
    const cleanPackage = String(packageName || '').trim();
    if (!this.gmcpEnabled || !cleanPackage) return false;

    const suffix = body === undefined || body === null || body === ''
      ? ''
      : ` ${typeof body === 'string' ? body : JSON.stringify(body)}`;

    this.sendSubnegotiation(
      OPT.GMCP,
      Buffer.from(`${cleanPackage}${suffix}`, 'utf8')
    );
    return true;
  }

  setRemoteEcho(enabled) {
    if (this.remoteEcho === enabled) return;
    this.remoteEcho = enabled;
    this.handlers.onEcho?.(enabled);
  }
}

module.exports = {
  TelnetParser,
  TELNET: {
    IAC,
    DONT,
    DO,
    WONT,
    WILL,
    SB,
    GA,
    EOR,
    SE,
    OPT,
    TTYPE_IS,
    TTYPE_SEND,
    CHARSET,
    ENVIRON,
    MCCPX,
    OPTION_STATE
  }
};
