(function attachOsc8Links(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireOsc8 = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createOsc8LinksApi() {
  'use strict';

  const MAX_OSC8_URI_LENGTH = 4096;
  const MAX_OSC8_COMMAND_LENGTH = 1024;
  const MAX_OSC8_PARAMETER_LENGTH = 256;
  const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:']);
  const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/u;

  function unavailable(reason, source = '') {
    return {
      available: false,
      kind: 'unsupported',
      uri: '',
      value: '',
      source: String(source || ''),
      reason: String(reason || 'Unsupported OSC 8 hyperlink.')
    };
  }

  function decodeCommandValue(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  function resolveOsc8Uri(value) {
    const source = String(value ?? '').trim();
    if (!source) {
      return {
        available: true,
        kind: 'close',
        uri: '',
        value: '',
        source: '',
        reason: ''
      };
    }
    if (source.length > MAX_OSC8_URI_LENGTH) {
      return unavailable('The hyperlink exceeds the safe URI length.', source);
    }
    if (CONTROL_PATTERN.test(source)) {
      return unavailable('The hyperlink contains control characters.', source);
    }

    const schemeMatch = source.match(/^([a-z][a-z0-9+.-]*):/iu);
    if (!schemeMatch) return unavailable('The hyperlink has no supported URI scheme.', source);
    const scheme = schemeMatch[1].toLowerCase();

    if (scheme === 'http' || scheme === 'https') {
      let parsed;
      try {
        parsed = new URL(source);
      } catch {
        return unavailable('The web address is malformed.', source);
      }
      if (!SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
        return unavailable('Only HTTP and HTTPS web links are allowed.', source);
      }
      if (parsed.username || parsed.password) {
        return unavailable('Web links containing embedded credentials are blocked.', source);
      }
      return {
        available: true,
        kind: 'external',
        uri: parsed.href,
        value: parsed.href,
        source,
        reason: ''
      };
    }

    if (scheme === 'send' || scheme === 'prompt') {
      const encoded = source.slice(schemeMatch[0].length);
      const decoded = decodeCommandValue(encoded);
      if (decoded === null) return unavailable('The command link contains invalid percent encoding.', source);
      if (CONTROL_PATTERN.test(decoded)) {
        return unavailable('The command link contains control characters.', source);
      }
      if (decoded.length > MAX_OSC8_COMMAND_LENGTH) {
        return unavailable('The command link exceeds the safe command length.', source);
      }
      if (scheme === 'send' && !decoded.trim()) {
        return unavailable('The command link does not contain a command.', source);
      }
      return {
        available: true,
        kind: scheme,
        uri: `${scheme}:${encoded}`,
        value: decoded,
        source,
        reason: ''
      };
    }

    return unavailable(`The ${scheme}: URI scheme is not supported.`, source);
  }

  function parseOsc8Payload(value) {
    const source = String(value ?? '');
    if (!source.startsWith('8;')) return null;
    const secondSeparator = source.indexOf(';', 2);
    if (secondSeparator === -1) {
      return unavailable('The OSC 8 hyperlink header is malformed.', source);
    }
    const parameters = source.slice(2, secondSeparator);
    if (parameters.length > MAX_OSC8_PARAMETER_LENGTH || CONTROL_PATTERN.test(parameters)) {
      return unavailable('The OSC 8 hyperlink parameters are unsafe.', source);
    }
    const resolved = resolveOsc8Uri(source.slice(secondSeparator + 1));
    return { ...resolved, parameters };
  }

  function osc8Open(uri) {
    const resolved = resolveOsc8Uri(uri);
    if (!resolved.available || resolved.kind === 'close') return '';
    return `\x1b]8;;${resolved.uri}\x1b\\`;
  }

  function osc8Close() {
    return '\x1b]8;;\x1b\\';
  }

  function findOscTerminator(source, start) {
    for (let index = start; index < source.length; index += 1) {
      const code = source.charCodeAt(index);
      if (code === 0x07 || code === 0x9c) {
        return { contentEnd: index, sequenceEnd: index + 1 };
      }
      if (code === 0x1b && source[index + 1] === '\\') {
        return { contentEnd: index, sequenceEnd: index + 2 };
      }
    }
    return null;
  }

  function sanitizeOsc8Sequences(value) {
    const source = String(value ?? '');
    let output = '';
    let index = 0;

    while (index < source.length) {
      const sevenBitOsc = source.charCodeAt(index) === 0x1b && source[index + 1] === ']';
      const eightBitOsc = source.charCodeAt(index) === 0x9d;
      if (!sevenBitOsc && !eightBitOsc) {
        output += source[index];
        index += 1;
        continue;
      }

      const contentStart = index + (sevenBitOsc ? 2 : 1);
      const terminator = findOscTerminator(source, contentStart);
      if (!terminator) break;
      const payload = source.slice(contentStart, terminator.contentEnd);
      const parsed = parseOsc8Payload(payload);
      if (parsed?.available) {
        output += parsed.kind === 'close' ? osc8Close() : `${osc8Open(parsed.uri)}`;
      }
      index = terminator.sequenceEnd;
    }

    return output;
  }

  function describeOsc8Uri(value) {
    const resolved = resolveOsc8Uri(value);
    if (!resolved.available) return resolved.reason;
    if (resolved.kind === 'external') return `Open ${resolved.value}`;
    if (resolved.kind === 'send') return `Send command: ${resolved.value}`;
    if (resolved.kind === 'prompt') return `Place in command input: ${resolved.value}`;
    return '';
  }

  return {
    MAX_OSC8_URI_LENGTH,
    MAX_OSC8_COMMAND_LENGTH,
    SAFE_EXTERNAL_PROTOCOLS,
    resolveOsc8Uri,
    parseOsc8Payload,
    sanitizeOsc8Sequences,
    osc8Open,
    osc8Close,
    describeOsc8Uri
  };
});
