'use strict';

(function exposeTinTinCompatibilityAudit(root, factory) {
  const parser = typeof module === 'object' && module.exports
    ? require('./client-command-parser')
    : root?.NukeFireClientCommands;
  let loader = root?.NukeFireTinTinScriptLoader;
  if (typeof module === 'object' && module.exports) {
    try { loader = require('./tintin-script-loader'); } catch (_error) { loader = {}; }
  }
  const api = factory(parser || {}, loader || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireTinTinCompatibilityAudit = api;
})(typeof window !== 'undefined' ? window : globalThis, function createTinTinCompatibilityAudit(parserApi, loaderApi) {
  const CLASSIFICATIONS = Object.freeze({
    NATIVE: 'native',
    TRANSLATED: 'translated',
    NOOP: 'compatibility-noop',
    BLOCKED: 'blocked-for-safety',
    NEEDS: 'needs-implementation'
  });

  // Current TinTin++ command inventory used only for compatibility accounting.
  // A known TinTin directive that NukeFire does not yet implement is still
  // surfaced as NEEDS IMPLEMENTATION rather than disappearing as "unknown".
  const OFFICIAL_COMMANDS = Object.freeze([
    'action', 'advertise', 'alias', 'all', 'bell', 'break', 'buffer', 'button', 'case', 'cat', 'commands',
    'chat', 'class', 'config', 'continue', 'cr', 'cursor', 'daemon', 'debug', 'default',
    'delay', 'dirs', 'draw', 'echo', 'edit', 'else', 'elseif', 'end', 'event', 'foreach',
    'format', 'function', 'gag', 'grep', 'help', 'highlight', 'history', 'if', 'forall',
    'ignore', 'info', 'keypad', 'kill', 'killall', 'line', 'list', 'local', 'log', 'loop',
    'macro', 'map', 'math', 'message', 'mouse', 'nop', 'parse', 'path', 'pathdir',
    'port', 'prompt', 'read', 'regexp', 'repeat', 'replace', 'return', 'run',
    'scan', 'screen', 'script', 'send', 'session', 'showme', 'snoop', 'speedwalk',
    'split', 'ssl', 'substitute', 'suspend', 'switch', 'system', 'tab', 'test', 'textin',
    'ticker', 'time', 'unaction', 'unalias', 'undelay', 'unevent', 'unfunction', 'ungag',
    'unhighlight', 'unmacro', 'unpathdir', 'unprompt', 'unsplit', 'unsubstitute', 'untab',
    'unticker', 'unvariable', 'variable', 'while', 'write', 'zap'
  ]);
  const OFFICIAL_SET = new Set(OFFICIAL_COMMANDS);

  const DIRECT_NATIVE = new Set([
    'alias', 'unalias', 'variable', 'unvariable', 'function', 'unfunction',
    'action', 'unaction', 'gag', 'ungag', 'highlight', 'unhighlight',
    'substitute', 'unsubstitute', 'macro', 'unmacro', 'class', 'delay', 'undelay', 'loop',
    'while', 'break', 'continue', 'foreach', 'forall', 'if', 'elseif', 'else', 'case', 'default', 'math', 'format', 'parse', 'replace', 'switch', 'send',
    'echo', 'showme', 'return', 'local', 'unlocal', 'speedwalk', 'snoop', 'read',
    'write', 'kill', 'help', 'profile', 'ignore', 'message', 'reload', 'edit', 'debug', 'nop', 'unevent', 'unticker', 'commands', 'dirs', 'info', 'history', 'grep', 'zap', 'regex'
  ]);
  const TRANSLATED = new Set(['all', 'cr', 'followers', 'session', 'sessions', 'end', 'map', 'path', 'pathdir', 'unpathdir', 'buffer', 'cursor', 'tab', 'untab']);
  const COMPATIBILITY_NOOPS = new Set([
    'advertise', 'bell', 'button', 'draw', 'keypad', 'mouse',
    'prompt', 'unprompt', 'screen', 'split', 'unsplit', 'suspend', 'test'
  ]);
  const BLOCKED = new Set(['chat', 'daemon', 'port', 'run', 'scan', 'script', 'ssl', 'system', 'textin']);
  const SUPPORTED_EVENTS = new Set(['SESSION CONNECTED', 'SESSION ACTIVATED', 'SESSION DEACTIVATED', 'SESSION DISCONNECTED', 'SESSION TIMED OUT', 'RECEIVED INPUT', 'RECEIVED LINE', 'RECEIVED OUTPUT', 'RECEIVED PROMPT', 'SEND OUTPUT', 'SECOND', 'MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR', 'PROGRAM START', 'PROGRAM TERMINATION', 'SCREEN RESIZE', 'END OF PATH', 'MAP ENTER MAP', 'MAP ENTER ROOM', 'MAP EXIT MAP', 'MAP EXIT ROOM', 'IAC WILL GMCP']);
  const SUPPORTED_EVENT_PREFIXES = ['IAC ', 'VARIABLE UPDATE ', 'MAP ENTER ROOM ', 'MAP EXIT ROOM ', 'SECOND ', 'MINUTE ', 'HOUR ', 'DAY ', 'WEEK ', 'MONTH ', 'YEAR ', 'DATE ', 'TIME '];
  function supportedEventName(value) {
    if (typeof loaderApi.isSupportedEventName === 'function') return loaderApi.isSupportedEventName(value);
    const name = normalizeEventName(value);
    return Boolean(name) && (SUPPORTED_EVENTS.has(name) || SUPPORTED_EVENT_PREFIXES.some((prefix) => name.startsWith(prefix)));
  }
  const SUPPORTED_LIST_OPERATIONS = new Set(['add', 'clear', 'create', 'delete', 'find', 'get', 'insert', 'ins', 'order', 'reverse', 'set', 'size', 'sort', 'tokenize']);
  const NUKefireOwnedConfig = new Set([
    'buffer size', 'charset', 'command color', 'mouse', 'packet patch', 'screen reader',
    'telnet', 'wordwrap'
  ]);
  const DANGEROUS_DETAIL = Object.freeze({
    chat: 'TinTin peer-to-peer chat and file-transfer networking is intentionally unavailable; NukeFire does not own or expose that network surface.',
    daemon: 'Host/background process execution is intentionally unavailable to TinTin scripts.',
    port: 'Opening a local listener from a script is intentionally blocked.',
    run: 'External process execution is intentionally blocked.',
    scan: 'Arbitrary host-file scanning is intentionally blocked.',
    script: 'Shell/script execution and host command capture are intentionally blocked.',
    ssl: 'TinTin scripts cannot create arbitrary external network sessions; NukeFire owns connections.',
    system: 'Shell/system command execution is intentionally blocked.',
    textin: 'Arbitrary host-file input is intentionally blocked.'
  });

  function classifyCommandFamily(directiveValue) {
    const raw = String(directiveValue || '').normalize('NFKC').trim().toLowerCase();
    const directive = canonicalDirective(raw);
    const candidate = directive || raw;
    if (BLOCKED.has(candidate)) {
      return { directive: raw || candidate, canonical: candidate, classification: CLASSIFICATIONS.BLOCKED, detail: DANGEROUS_DETAIL[candidate] || 'This command crosses the bounded NukeFire client sandbox.' };
    }
    if (COMPATIBILITY_NOOPS.has(raw) || COMPATIBILITY_NOOPS.has(candidate)) {
      return { directive: raw || candidate, canonical: candidate, classification: CLASSIFICATIONS.NOOP, detail: 'The legacy terminal/client-side effect is intentionally owned by NukeFire native UI behavior.' };
    }
    if (TRANSLATED.has(raw) || TRANSLATED.has(candidate)) {
      return { directive: raw || candidate, canonical: candidate, classification: CLASSIFICATIONS.TRANSLATED, detail: 'The TinTin command maps onto bounded NukeFire-native state or behavior.' };
    }
    const completeFamilies = new Set(['class', 'config', 'event', 'line', 'list', 'log', 'map', 'path', 'session', 'ticker']);
    if (DIRECT_NATIVE.has(raw) || DIRECT_NATIVE.has(candidate) || completeFamilies.has(candidate)) {
      return { directive: raw || candidate, canonical: candidate, classification: CLASSIFICATIONS.NATIVE, detail: 'The command family is implemented by the bounded NukeFire TinTin runtime.' };
    }
    if (OFFICIAL_SET.has(raw) || OFFICIAL_SET.has(candidate)) {
      return { directive: raw || candidate, canonical: candidate, classification: CLASSIFICATIONS.NEEDS, detail: 'Known TinTin command family still needs implementation or an explicit compatibility policy.' };
    }
    return { directive: raw || candidate, canonical: candidate, classification: CLASSIFICATIONS.NEEDS, detail: 'Unknown TinTin command family.' };
  }

  function commandCompatibilityMatrix(commandsValue = OFFICIAL_COMMANDS) {
    const commands = Array.isArray(commandsValue) ? commandsValue : OFFICIAL_COMMANDS;
    const entries = commands.map((command) => classifyCommandFamily(command));
    const summary = emptySummary();
    for (const entry of entries) summary[entry.classification] = (summary[entry.classification] || 0) + 1;
    return { entries, summary };
  }

  function classificationLabel(value) {
    return ({
      [CLASSIFICATIONS.NATIVE]: 'NATIVE',
      [CLASSIFICATIONS.TRANSLATED]: 'TRANSLATED',
      [CLASSIFICATIONS.NOOP]: 'COMPATIBILITY NO-OP',
      [CLASSIFICATIONS.BLOCKED]: 'BLOCKED FOR SAFETY',
      [CLASSIFICATIONS.NEEDS]: 'UNKNOWN / NEEDS IMPLEMENTATION'
    })[value] || 'UNKNOWN / NEEDS IMPLEMENTATION';
  }

  function normalizePrefix(value) {
    return typeof parserApi.normalizeClientCommandPrefix === 'function'
      ? parserApi.normalizeClientCommandPrefix(value)
      : (['#', '~', '^', '/', '`', "'"].includes(String(value || '')) ? String(value) : '#');
  }

  function detectScriptPrefix(sourceValue, fallbackValue = '#') {
    if (typeof loaderApi.detectCommandCharacter === 'function') {
      return loaderApi.detectCommandCharacter(sourceValue, normalizePrefix(fallbackValue));
    }
    const first = String(sourceValue || '').trimStart()[0] || '';
    return ['#', '~', '^', '/', '`', "'"].includes(first) ? first : normalizePrefix(fallbackValue);
  }

  function canonicalDirective(value) {
    return typeof parserApi.canonicalClientDirective === 'function'
      ? parserApi.canonicalClientDirective(value)
      : String(value || '').trim().toLowerCase();
  }

  function tokenize(body) {
    if (typeof loaderApi.tokenizeArguments === 'function') {
      const parsed = loaderApi.tokenizeArguments(body);
      return parsed?.error ? [] : parsed.tokens;
    }
    if (typeof parserApi.tokenizeBraced === 'function') return parserApi.tokenizeBraced(body);
    return String(body || '').split(/\s+/u).filter(Boolean);
  }

  function firstDirective(value, prefix) {
    if (typeof parserApi.firstDirective === 'function') return parserApi.firstDirective(value, prefix);
    const source = String(value || '').trim();
    if (!source.startsWith(prefix)) return null;
    const match = source.slice(prefix.length).match(/^([^\s]+)(?:\s+([\s\S]*))?$/u);
    return match ? { directive: canonicalDirective(match[1]), body: String(match[2] || '') } : null;
  }

  function normalizeEventName(value) {
    return String(value || '').normalize('NFKC').trim().toUpperCase().replace(/\s+/gu, ' ');
  }

  function normalizeOperation(value) {
    return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ');
  }

  function officialAbbreviation(value) {
    const source = String(value || '').normalize('NFKC').trim().toLowerCase();
    if (!source) return '';
    const sourceTable = Array.isArray(parserApi.TINTIN_COMMAND_TABLE)
      ? parserApi.TINTIN_COMMAND_TABLE
      : OFFICIAL_COMMANDS;
    if (sourceTable.includes(source)) return '';
    // TinTin uses the first command_table entry accepted by is_abbrev(); it
    // does not require the abbreviation to be unique.  Keep the auditor on
    // the same source-order rule as the live parser.
    const match = sourceTable.find((command) => String(command).startsWith(source));
    if (!match) return '';
    return match === 'regexp' ? 'regex' : match === 'killall' ? 'kill' : match;
  }

  function safeSessionName(value) {
    const source = String(value || '').normalize('NFKC').trim().toLowerCase();
    return /^[a-z][a-z0-9_-]{0,47}$/u.test(source) ? source : '';
  }

  function validAliasName(value) {
    const source = String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/gu, ' ');
    if (!source || source.length > 48 || ['__proto__', 'constructor', 'prototype'].includes(source)) return false;
    if ((source.includes('^') && !source.startsWith('^'))
      || (source.includes('$') && !source.endsWith('$'))
      || source.slice(1).includes('^')
      || source.slice(0, -1).includes('$')) return false;
    if ([...source].some((character) => {
      const code = character.codePointAt(0);
      return code < 32 || code === 127 || '{}[]\\;#@"\''.includes(character);
    })) return false;
    for (let index = 0; index < source.length; index += 1) {
      if (source[index] !== '%') continue;
      const next = source[index + 1] || '';
      if (next === '%' || 'dDsSwW?*+.iI'.includes(next)) { index += 1; continue; }
      const numbered = source.slice(index + 1).match(/^(?:[1-9][0-9]?|0)/u);
      if (!numbered) return false;
      index += numbered[0].length;
    }
    return true;
  }

  function staticVariableName(value) {
    const source = String(value || '').normalize('NFKC').trim().toLowerCase();
    return /^[a-z_][a-z0-9_-]*$/u.test(source) ? source : '';
  }

  function staticValue(value) {
    return String(value ?? '').trim();
  }

  function resolveStaticVariables(value, variables) {
    let output = String(value || '').trim();
    let changed = true;
    for (let pass = 0; pass < 8 && changed; pass += 1) {
      changed = false;
      output = output.replace(/\$\{([a-z_][a-z0-9_-]*)\}|\$([a-z_][a-z0-9_-]*)/giu, (match, braced, plain) => {
        const name = String(braced || plain || '').toLowerCase();
        if (!variables.has(name)) return match;
        changed = true;
        return variables.get(name);
      });
    }
    return output;
  }

  function argumentMeta(bodyValue) {
    const source = String(bodyValue || '');
    const args = [];
    let index = 0;
    while (index < source.length) {
      while (index < source.length && /\s/u.test(source[index])) index += 1;
      if (index >= source.length) break;
      if (source[index] !== '{') {
        let end = index;
        while (end < source.length && !/\s/u.test(source[end])) end += 1;
        args.push({ value: source.slice(index, end), braced: false });
        index = end;
        continue;
      }
      const start = index + 1;
      index += 1;
      let depth = 1;
      let escaped = false;
      while (index < source.length && depth > 0) {
        const ch = source[index];
        if (escaped) { escaped = false; index += 1; continue; }
        if (ch === '\\') {
          const literalBackslashToken = source[index + 1] === '}' && index === start;
          if (!literalBackslashToken) escaped = true;
          index += 1;
          continue;
        }
        if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
        index += 1;
      }
      if (depth !== 0) break;
      args.push({ value: source.slice(start, index - 1), braced: true });
    }
    return args;
  }

  function classifyDirective(directiveValue, tokens = [], context = {}) {
    const directive = canonicalDirective(directiveValue);
    const knownSessions = context.knownSessions instanceof Set ? context.knownSessions : new Set();
    const inferredSessions = context.inferredSessions instanceof Set ? context.inferredSessions : new Set();
    const abbreviatedFrom = String(context.abbreviatedFrom || '').trim().toLowerCase();

    if (knownSessions.has(directive)) {
      return {
        classification: CLASSIFICATIONS.TRANSLATED,
        detail: inferredSessions.has(directive)
          ? 'Probable named-session route inferred from repeated veteran session-route syntax; NukeFire uses its private session router when that session exists.'
          : 'Named-session route uses NukeFire private session routing.'
      };
    }

    if (abbreviatedFrom) {
      if (BLOCKED.has(directive)) {
        return { classification: CLASSIFICATIONS.BLOCKED, detail: `TinTin #${abbreviatedFrom.toUpperCase()} abbreviates blocked #${directive.toUpperCase()}: ${DANGEROUS_DETAIL[directive] || 'the command can reach outside the safe MUD-client sandbox.'}` };
      }
      if (directive === 'showme') {
        return { classification: CLASSIFICATIONS.NATIVE, detail: `TinTin #${abbreviatedFrom.toUpperCase()} is accepted by the existing local #SHOWME display path.` };
      }
      // General command abbreviations are resolved by the live parser using
      // TinTin command_table order.  Continue into the ordinary family and
      // subcommand checks so an abbreviation receives exactly the same policy
      // as its canonical command rather than being reported as a TODO.
    }

    if (['alias', 'action', 'variable', 'function', 'highlight', 'substitute', 'macro'].includes(directive) && tokens.length <= 1) {
      return { classification: CLASSIFICATIONS.NATIVE, detail: `TinTin #${directive.toUpperCase()} list/query forms are supported.` };
    }

    if (directive === 'list') {
      const rawOperation = normalizeOperation(tokens[1]);
      const operation = ({ clr: 'clear', fnd: 'find', length: 'size', srt: 'sort' })[rawOperation] || rawOperation;
      if (SUPPORTED_LIST_OPERATIONS.has(operation)) {
        return { classification: CLASSIFICATIONS.NATIVE, detail: `TinTin #LIST ${operation.toUpperCase()} is supported natively.` };
      }
      return {
        classification: CLASSIFICATIONS.NEEDS,
        detail: operation
          ? `TinTin #LIST ${operation.toUpperCase()} is not implemented yet; current native operations are ADD, CREATE, TOKENIZE, FIND, DELETE, CLEAR, INSERT/INS, ORDER, and REVERSE.`
          : 'TinTin #LIST query/operation form is not fully implemented yet.'
      };
    }

    if (directive === 'if' || directive === 'elseif' || directive === 'else') {
      const meta = Array.isArray(context.argumentMeta) ? context.argumentMeta : [];
      const rawBody = String(context.rawBody || '').trim();
      const commandPrefix = normalizePrefix(context.commandPrefix || '#');
      const nestedConditional = rawBody.startsWith(commandPrefix)
        ? firstDirective(rawBody, commandPrefix)
        : null;
      if (directive === 'else' && nestedConditional && ['if', 'elseif'].includes(String(nestedConditional.directive || ''))) {
        return { classification: CLASSIFICATIONS.NATIVE, detail: 'Veteran ELSE IF / ELSEIF chaining maps to a bounded nested conditional branch.' };
      }
      return {
        classification: CLASSIFICATIONS.NATIVE,
        detail: meta.some((entry) => entry && entry.braced === false)
          ? 'Veteran unbraced conditional command bodies are preserved as one bounded branch.'
          : 'Bounded TinTin conditional syntax is supported.'
      };
    }

    if (directive === 'foreach') {
      const listExpression = String(tokens[0] || '').trim();
      if (/^\*[A-Za-z_][A-Za-z0-9_]*\[\]$/u.test(listExpression)) {
        return { classification: CLASSIFICATIONS.NEEDS, detail: 'Legacy star-prefixed *table[] FOREACH syntax is still not implemented; modern $table[] key queries and bounded #FORALL are supported.' };
      }
      return { classification: CLASSIFICATIONS.NATIVE, detail: 'Bounded TinTin #FOREACH is supported.' };
    }

    if (directive === 'forall') {
      return { classification: CLASSIFICATIONS.NATIVE, detail: 'Bounded TinTin #FORALL is supported, including per-item &0 substitution.' };
    }

    if (directive === 'class') {
      const rawOperation = normalizeOperation(tokens[1]);
      const operation = ({ clr: 'clear', fnd: 'find', length: 'size', srt: 'sort' })[rawOperation] || rawOperation;
      if (['read', 'write'].includes(operation)) {
        return { classification: CLASSIFICATIONS.TRANSLATED, detail: `TinTin CLASS ${operation.toUpperCase()} is supported inside NukeFire's protected Scripts folder; legacy absolute paths are redirected by safe basename.` };
      }
      return { classification: CLASSIFICATIONS.NATIVE, detail: 'TinTin Class definition grouping and lifecycle operations are supported.' };
    }

    if (directive === 'pathdir' || directive === 'unpathdir') {
      return { classification: CLASSIFICATIONS.TRANSLATED, detail: directive === 'pathdir' ? 'TinTin PATHDIR is retained as private per-session path direction metadata while the native Mapper remains authoritative for world mapping.' : 'TinTin UNPATHDIR removes private per-session direction metadata without altering the native world Mapper.' };
    }

    if (directive === 'session' || directive === 'sessions') {
      const second = String(tokens[1] || '').trim();
      if (tokens.length === 2 && /[$@%]/u.test(second) && normalizeOperation(second) !== 'reload') {
        return { classification: CLASSIFICATIONS.NEEDS, detail: 'This veteran #SESSION form relies on one expanded variable producing separate host and port arguments; current tokenization happens before that split.' };
      }
      return { classification: CLASSIFICATIONS.TRANSLATED, detail: 'TinTin session management maps to NukeFire private saved sessions.' };
    }

    if (directive === 'send') {
      return { classification: CLASSIFICATIONS.TRANSLATED, detail: 'TinTin #SEND maps directly to NukeFire’s normal MUD send pipeline without re-entering Alias expansion.' };
    }

    if (directive === 'cr') {
      return { classification: CLASSIFICATIONS.TRANSLATED, detail: 'TinTin #CR sends one empty command through the issuing NukeFire session, equivalent to pressing Return on a blank line.' };
    }

    if (directive === 'ticker') {
      return { classification: CLASSIFICATIONS.NATIVE, detail: tokens.length <= 1 ? 'TinTin #TICKER list/query forms are supported.' : 'Named recurring TinTin ticker is supported; omitted interval defaults to 60 seconds.' };
    }

    if (directive === 'line') {
      const operation = normalizeOperation(tokens[0]);
      if (operation === 'oneshot' && tokens.length >= 2) return { classification: CLASSIFICATIONS.NATIVE, detail: 'TinTin #LINE ONESHOT is supported.' };
      if (operation === 'gag' && tokens.length <= 2) return { classification: CLASSIFICATIONS.TRANSLATED, detail: 'TinTin #LINE GAG suppresses the next bounded number of incoming server lines without disabling Actions.' };
      if (['ignore', 'local', 'strip', 'verbose'].includes(operation) && tokens.length >= 2) {
        return { classification: CLASSIFICATIONS.TRANSLATED, detail: `TinTin #LINE ${operation.toUpperCase()} maps to bounded NukeFire-local command execution semantics.` };
      }
      if (['log', 'logverbatim'].includes(operation) && tokens.length >= 2) {
        return { classification: CLASSIFICATIONS.TRANSLATED, detail: `TinTin #LINE ${operation.toUpperCase()} writes only to a validated basename in NukeFire's confined Logs folder.` };
      }
      if (['sub', 'substitute'].includes(operation) && tokens.length >= 3) {
        return { classification: CLASSIFICATIONS.TRANSLATED, detail: 'TinTin #LINE SUBSTITUTE supports bounded variable/function substitution before command dispatch.' };
      }
      return { classification: CLASSIFICATIONS.NEEDS, detail: 'This TinTin #LINE operation is not implemented yet.' };
    }

    if (directive === 'event') {
      if (tokens.length <= 1) return { classification: CLASSIFICATIONS.NATIVE, detail: 'TinTin #EVENT list/query syntax is supported.' };
      const name = normalizeEventName(tokens[0]);
      return supportedEventName(name)
        ? { classification: CLASSIFICATIONS.NATIVE, detail: `TinTin event ${name} is supported privately per session.` }
        : { classification: CLASSIFICATIONS.NEEDS, detail: `TinTin event ${name || '(unnamed)'} is not implemented yet.` };
    }

    if (directive === 'unevent') {
      return { classification: CLASSIFICATIONS.NATIVE, detail: 'Supported TinTin Events can be removed privately per session.' };
    }

    if (directive === 'config') {
      const key = normalizeOperation(tokens[0]);
      if (key === 'speedwalk' || key === 'log' || key === 'log mode') {
        return { classification: CLASSIFICATIONS.TRANSLATED, detail: `TinTin Config ${key.toUpperCase()} maps to NukeFire-owned state.` };
      }
      if (NUKefireOwnedConfig.has(key) || key) {
        return { classification: CLASSIFICATIONS.NOOP, detail: `TinTin Config ${key ? key.toUpperCase() : 'SETTING'} remains NukeFire-owned and is accepted without taking over the client.` };
      }
      return { classification: CLASSIFICATIONS.NOOP, detail: 'TinTin Config query syntax is accepted without giving scripts ownership of NukeFire UI/protocol settings.' };
    }

    if (directive === 'log') {
      const operation = normalizeOperation(tokens[0]);
      if (!operation || operation === 'off' || operation === 'append' || operation === 'overwrite') {
        return { classification: CLASSIFICATIONS.TRANSLATED, detail: operation === 'overwrite'
          ? 'TinTin #LOG OVERWRITE maps to NukeFire’s confined Logs folder and safely truncates only a validated basename.'
          : 'TinTin logging maps to NukeFire’s confined per-session Logs folder.' };
      }
      return { classification: CLASSIFICATIONS.NEEDS, detail: `TinTin #LOG ${operation.toUpperCase()} is not implemented by the confined logger.` };
    }

    if (directive === 'map') {
      return normalizeOperation(tokens[0]) === 'find' && tokens.length === 2
        ? { classification: CLASSIFICATIONS.TRANSLATED, detail: 'MAP FIND bridges to the authoritative native NukeFire Mapper.' }
        : { classification: CLASSIFICATIONS.NOOP, detail: 'TinTin terminal map ownership is intentionally not duplicated; NukeFire’s native Mapper remains authoritative.' };
    }

    if (directive === 'path') {
      const operation = normalizeOperation(tokens[0]);
      const nativePathOps = new Set(['', 'new', 'create', 'end', 'show', 'map', 'save', 'load', 'del', 'delete', 'ins', 'insert', 'run', 'walk', 'zip', 'unzip', 'stop']);
      if (nativePathOps.has(operation)) {
        const bridge = ['run', 'stop'].includes(operation)
          ? ' When no private TinTin path is active, RUN/STOP retain the native Mapper route bridge.'
          : '';
        return { classification: CLASSIFICATIONS.TRANSLATED, detail: `TinTin PATH ${operation.toUpperCase()} is supported as bounded private per-session path state.${bridge}` };
      }
      return { classification: CLASSIFICATIONS.NEEDS, detail: 'This TinTin #PATH operation is not mapped yet.' };
    }

    if (directive === 'alias') {
      if (!validAliasName(tokens[0])) {
        return { classification: CLASSIFICATIONS.NEEDS, detail: 'This veteran Alias name is rejected by the current NukeFire safe-name rules.' };
      }
      const meta = Array.isArray(context.argumentMeta) ? context.argumentMeta : [];
      if (meta.length > 2 && meta[1]?.braced && /^\s*[0-9]+(?:\.[0-9]+)?\s*$/u.test(String(tokens.at(-1) || ''))) {
        return { classification: CLASSIFICATIONS.TRANSLATED, detail: 'Veteran trailing Alias priority is accepted as compatibility metadata and is never appended to the Alias body.' };
      }
      return { classification: CLASSIFICATIONS.NATIVE, detail: 'TinTin Alias definition is supported.' };
    }

    if (BLOCKED.has(directive)) {
      return { classification: CLASSIFICATIONS.BLOCKED, detail: DANGEROUS_DETAIL[directive] || 'This command can reach outside the safe MUD-client sandbox and is intentionally blocked.' };
    }
    if (COMPATIBILITY_NOOPS.has(directive)) {
      return { classification: CLASSIFICATIONS.NOOP, detail: 'Recognized for compatibility; NukeFire owns the corresponding terminal/UI behavior.' };
    }
    if (DIRECT_NATIVE.has(directive)) {
      return { classification: CLASSIFICATIONS.NATIVE, detail: 'Supported by the current bounded NukeFire TinTin runtime.' };
    }
    if (TRANSLATED.has(directive)) {
      return { classification: CLASSIFICATIONS.TRANSLATED, detail: 'Mapped onto the corresponding NukeFire-native behavior.' };
    }
    if (OFFICIAL_SET.has(directive)) {
      return { classification: CLASSIFICATIONS.NEEDS, detail: `Known TinTin command #${directive.toUpperCase()} is not implemented yet.` };
    }
    return { classification: CLASSIFICATIONS.NEEDS, detail: `Unknown TinTin directive #${String(directive || directiveValue || '').toUpperCase()}; it is reported rather than silently ignored.` };
  }

  function nestedBodies(directive, tokens, body, prefix, meta = []) {
    const bodies = [];
    const add = (value, context) => {
      const source = String(value || '').trim();
      if (source) bodies.push({ source, context });
    };
    if (['alias', 'action', 'function', 'macro', 'event'].includes(directive)) add(tokens[1], directive);
    else if (directive === 'delay') {
      const first = String(tokens[0] || '').trim();
      const named = tokens.length === 3 && !/^(?:\d+(?:\.\d+)?|\.\d+)$/u.test(first);
      add(named ? tokens[1] : tokens.slice(1).join(' '), named ? 'named delay' : 'delay');
    }
    else if (directive === 'ticker' && tokens.length >= 3) add(tokens.slice(1, -1).join(' '), 'ticker');
    else if (directive === 'line' && normalizeOperation(tokens[0]) === 'oneshot') add(tokens.slice(1).join(' '), 'line oneshot');
    else if (directive === 'line' && ['sub', 'substitute'].includes(normalizeOperation(tokens[0]))) add(tokens.slice(2).join(' '), 'line substitute');
    else if (directive === 'if') {
      if (meta[1] && !meta[1].braced && meta.length > 2) add(tokens.slice(1).join(' '), 'if unbraced body');
      else { add(tokens[1], 'if true'); add(tokens[2], 'if false'); }
    }
    else if (directive === 'elseif') {
      if (meta[1] && !meta[1].braced && meta.length > 2) add(tokens.slice(1).join(' '), 'elseif unbraced body');
      else add(tokens[1], 'elseif');
    }
    else if (directive === 'else') {
      const rawElse = String(body || '').trim();
      const nested = rawElse.startsWith(prefix) ? firstDirective(rawElse, prefix) : null;
      if (nested && ['if', 'elseif'].includes(String(nested.directive || ''))) add(rawElse, 'else nested conditional');
      else if (meta[0] && !meta[0].braced && meta.length > 1) add(tokens.join(' '), 'else unbraced body');
      else add(tokens[0], 'else');
    }
    else if (directive === 'foreach') add(tokens.slice(2).join(' '), 'foreach');
    else if (directive === 'parse') add(tokens.slice(2).join(' '), 'parse');
    else if (directive === 'switch') add(tokens[1], 'switch');
    else if (directive === 'loop') add(tokens.slice(3).join(' '), 'loop');
    else if (directive === 'while') add(tokens.slice(1).join(' '), 'while');
    else if (directive === 'class' && normalizeOperation(tokens[1]) === 'assign') add(tokens.slice(2).join(' '), 'class assign');
    else if ((directive === 'all' || directive === 'followers') && String(body || '').trim().startsWith(prefix)) add(body, `${directive} route`);
    return bodies;
  }

  function splitNestedCommands(source, prefix) {
    if (typeof parserApi.splitTopLevelCommands === 'function') {
      const parsed = parserApi.splitTopLevelCommands(source, { maxCommands: 256, preserveEscapedSemicolon: true });
      if (!parsed.errorCode) return parsed.commands;
    }
    if (typeof loaderApi.splitScriptCommands === 'function') {
      const parsed = loaderApi.splitScriptCommands(source, prefix);
      if (parsed?.ok) return parsed.commands.map((entry) => entry.value);
    }
    return [String(source || '').trim()].filter(Boolean);
  }

  function quoteCanOpen(source, index, character, commandPrefix = '') {
    if (character === '"') return true;
    if (character !== "'") return false;
    if (character === commandPrefix) {
      const lineStart = source.lastIndexOf('\n', Math.max(0, index - 1)) + 1;
      if (!source.slice(lineStart, index).trim()) return false;
    }
    const previous = source[index - 1] || '';
    return (!previous || /[\s({\[]/u.test(previous)) && source.indexOf("'", index + 1) !== -1;
  }

  // The normal #READ loader intentionally recognizes only the definition forms
  // it can commit. The compatibility audit must be broader: veteran files often
  // put the remaining braced arguments for commands such as #TICKER on following
  // lines. Join any leading-brace continuation after a client directive so the
  // audit sees the whole TinTin statement even when the current runtime does not.
  function splitAuditScriptCommands(sourceValue, prefix) {
    const source = String(sourceValue || '');
    const commands = [];
    let current = '';
    let depth = 0;
    let quote = '';
    let escaped = false;
    let line = 1;
    let startLine = 1;
    const commit = () => {
      const value = current.trim();
      current = '';
      if (value) commands.push({ value, line: startLine });
    };
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (escaped) {
        current += character;
        escaped = false;
        if (character === '\n') line += 1;
        continue;
      }
      if (character === '\\') {
        const lastOpen = current.lastIndexOf('{');
        const literalBackslashToken = source[index + 1] === '}'
          && lastOpen >= 0
          && current.slice(lastOpen + 1) === '';
        current += character;
        if (!literalBackslashToken) escaped = true;
        continue;
      }
      if (quote) {
        current += character;
        if (character === quote) quote = '';
        if (character === '\n') line += 1;
        continue;
      }
      if (depth === 0 && quoteCanOpen(source, index, character, prefix)) { quote = character; current += character; continue; }
      if (character === '{') { depth += 1; current += character; continue; }
      if (character === '}') {
        if (depth === 0) return { ok: false, commands: [], error: `Unmatched closing brace on line ${line}.` };
        depth -= 1; current += character; continue;
      }
      if (character === ';' && depth === 0) { commit(); startLine = line; continue; }
      if (character === '\n') {
        if (depth === 0) {
          let nextIndex = index + 1;
          while (nextIndex < source.length && /[\t\r\n ]/u.test(source[nextIndex])) nextIndex += 1;
          const currentTrimmed = current.trimStart();
          const braceContinuation = source[nextIndex] === '{' && currentTrimmed.startsWith(prefix) && !currentTrimmed.startsWith(prefix.repeat(2));
          if (braceContinuation) current += ' ';
          else { commit(); startLine = line + 1; }
        } else {
          current += character;
        }
        line += 1;
        continue;
      }
      if (!current && !/\s/u.test(character)) startLine = line;
      current += character;
    }
    if (escaped) return { ok: false, commands: [], error: `TinTin script ends with an unfinished escape on line ${line}.` };
    if (quote) return { ok: false, commands: [], error: `TinTin script has an unterminated quote near line ${line}.` };
    if (depth !== 0) return { ok: false, commands: [], error: `TinTin script has an unterminated brace group near line ${line}.` };
    commit();
    return { ok: true, commands, error: '' };
  }

  function sourceCommands(source, prefix) {
    let value = String(source || '');
    if (typeof loaderApi.stripComments === 'function') {
      const stripped = loaderApi.stripComments(value, prefix);
      if (!stripped?.ok) return { ok: false, commands: [], error: stripped?.error || 'TinTin comments could not be parsed.' };
      value = stripped.value;
    }
    return splitAuditScriptCommands(value, prefix);
  }

  function emptySummary() {
    return {
      [CLASSIFICATIONS.NATIVE]: 0,
      [CLASSIFICATIONS.TRANSLATED]: 0,
      [CLASSIFICATIONS.NOOP]: 0,
      [CLASSIFICATIONS.BLOCKED]: 0,
      [CLASSIFICATIONS.NEEDS]: 0
    };
  }

  function discoverSessionHints(sourceValue, prefix, knownSessions) {
    const source = String(sourceValue || '');
    const inferredSessions = new Set();
    const routeCounts = new Map();
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

    // TinTin session routes are syntactically indistinguishable from unknown
    // client directives unless a session is active/declared. Pre-scan static
    // declarations and strong veteran hints before classifying the tree.
    const declarationPattern = new RegExp(`${escapedPrefix}(?:session|ses)\\s+(?:\\{([^}]+)\\}|([A-Za-z][A-Za-z0-9_-]{0,47}))`, 'giu');
    for (const match of source.matchAll(declarationPattern)) {
      const name = safeSessionName(match[1] || match[2]);
      if (name) knownSessions.add(name);
    }

    const snoopPattern = new RegExp(`${escapedPrefix}snoop\\s+(?:\\{([^}]+)\\}|([A-Za-z][A-Za-z0-9_-]{0,47}))(?:\\s+(?:on|off))?`, 'giu');
    for (const match of source.matchAll(snoopPattern)) {
      const name = safeSessionName(match[1] || match[2]);
      if (name) knownSessions.add(name);
    }

    const directivePattern = new RegExp(`${escapedPrefix}([A-Za-z][A-Za-z0-9_-]{0,47})(?=\\s|;|\\}|$)`, 'giu');
    for (const match of source.matchAll(directivePattern)) {
      const raw = String(match[1] || '').toLowerCase();
      const canonical = canonicalDirective(raw);
      if (!canonical || OFFICIAL_SET.has(canonical) || officialAbbreviation(canonical)) continue;
      if (DIRECT_NATIVE.has(canonical) || TRANSLATED.has(canonical) || COMPATIBILITY_NOOPS.has(canonical) || BLOCKED.has(canonical)) continue;
      routeCounts.set(canonical, (routeCounts.get(canonical) || 0) + 1);
    }
    for (const [name, count] of routeCounts) {
      if (count < 3 || knownSessions.has(name)) continue;
      knownSessions.add(name);
      inferredSessions.add(name);
    }
    return inferredSessions;
  }

  function auditTinTinSource(sourceValue, options = {}) {
    const prefix = detectScriptPrefix(sourceValue, options.commandPrefix || '#');
    const filename = String(options.filename || 'script.tin').trim() || 'script.tin';
    const variables = options.variables instanceof Map ? options.variables : new Map();
    const knownSessions = options.knownSessions instanceof Set
      ? options.knownSessions
      : new Set((options.sessionNames || []).map((name) => String(name || '').trim().toLowerCase()).filter(Boolean));
    const inferredSessions = discoverSessionHints(sourceValue, prefix, knownSessions);
    const entries = [];
    const reads = [];
    const parseErrors = [];
    const split = sourceCommands(sourceValue, prefix);
    if (!split.ok) {
      return { ok: false, filename, entries, reads, variables, knownSessions, errors: [split.error], summary: emptySummary() };
    }

    const addEntry = ({ line, directive, classification, detail, context = '' }) => {
      entries.push({ filename, line: Math.max(1, Number(line) || 1), directive, classification, detail, context });
    };

    const inspectCommand = (commandValue, line, nestedContext = '', staticAssignmentAllowed = true, depth = 0) => {
      if (depth > 16) {
        addEntry({ line, directive: 'nesting', classification: CLASSIFICATIONS.NEEDS, detail: 'Audit nesting exceeded 16 levels.', context: nestedContext });
        return;
      }
      const command = String(commandValue || '').trim();
      if (!command) return;
      if (!command.startsWith(prefix)) {
        addEntry({ line, directive: 'server-command', classification: CLASSIFICATIONS.NATIVE, detail: 'Raw MUD command is preserved for the normal NukeFire send pipeline.', context: nestedContext });
        return;
      }
      if (command.startsWith(prefix.repeat(2))) {
        addEntry({ line, directive: 'literal-client-prefix', classification: CLASSIFICATIONS.NATIVE, detail: 'Doubled client prefix sends one literal prefix to the MUD.', context: nestedContext });
        return;
      }
      const parsed = firstDirective(command, prefix);
      if (!parsed?.directive) {
        addEntry({ line, directive: 'unknown', classification: CLASSIFICATIONS.NEEDS, detail: 'Client-prefixed command could not be parsed and will not be silently ignored.', context: nestedContext });
        return;
      }
      const rawDirective = String(command.slice(prefix.length).match(/^([^\s]+)/u)?.[1] || parsed.directive || '').trim();
      const dynamicRepeat = /^\$(?:\{[a-z_][a-z0-9_-]*\}|[a-z_][a-z0-9_-]*)$/iu.test(rawDirective);
      const capturedRepeat = /^%(?:[1-9][0-9]?|0)$/u.test(rawDirective);
      const numericRepeat = /^[1-9][0-9]{0,8}$/u.test(rawDirective);
      const canonicalRaw = canonicalDirective(rawDirective);
      const rawDirectiveToken = String(rawDirective || '').normalize('NFKC').trim().toLowerCase();
      const abbreviatedDirective = (numericRepeat || capturedRepeat) ? '' : officialAbbreviation(rawDirectiveToken);
      const directive = (numericRepeat || capturedRepeat) ? 'repeat' : (abbreviatedDirective || canonicalRaw);
      const tokens = tokenize(parsed.body);
      const meta = argumentMeta(parsed.body);

      if ((directive === 'variable') && staticAssignmentAllowed && tokens.length >= 2) {
        const name = staticVariableName(tokens[0]);
        if (name) variables.set(name, staticValue(tokens.slice(1).join(' ')));
      }
      if (directive === 'unvariable' && staticAssignmentAllowed && tokens.length === 1) {
        const name = staticVariableName(tokens[0]);
        if (name) variables.delete(name);
      }
      if (directive === 'session' && tokens[0]) {
        const name = safeSessionName(tokens[0]);
        if (name) knownSessions.add(name);
      }

      const classified = dynamicRepeat
        ? {
          classification: CLASSIFICATIONS.TRANSLATED,
          detail: 'Dynamic TinTin repeat directive resolves one private variable first and may execute only when it becomes a bounded numeric repeat count.'
        }
        : capturedRepeat
          ? {
            classification: CLASSIFICATIONS.TRANSLATED,
            detail: 'Action/alias capture repeat shorthand is substituted first and may execute only when the capture becomes a bounded numeric repeat count.'
          }
          : numericRepeat
            ? {
              classification: CLASSIFICATIONS.NATIVE,
              detail: `TinTin ${prefix}${rawDirective} repeat shorthand uses the existing bounded numeric-repeat executor.`
            }
            : classifyDirective(directive, tokens, {
          knownSessions,
          inferredSessions,
          abbreviatedFrom: abbreviatedDirective ? rawDirectiveToken : '',
          argumentMeta: meta,
          rawBody: parsed.body,
          commandPrefix: prefix
        });
      addEntry({ line, directive, classification: classified.classification, detail: classified.detail, context: nestedContext });

      if (directive === 'read') {
        const raw = String(tokens[0] || '').trim();
        const resolved = resolveStaticVariables(raw, variables).trim();
        const dynamic = /[$@%]/u.test(resolved) || !resolved;
        reads.push({ filename, line, requested: dynamic ? '' : resolved, expression: raw ? '[dynamic-or-safe-name]' : '', dynamic, context: nestedContext });
      }

      const routeBody = String(parsed.body || '').trim();
      if ((numericRepeat || dynamicRepeat || capturedRepeat) && routeBody) {
        for (const nested of splitNestedCommands(routeBody, prefix)) {
          inspectCommand(nested, line, nestedContext ? `${nestedContext} > repeat` : 'repeat', false, depth + 1);
        }
      }
      if (knownSessions.has(directive) && routeBody) {
        for (const nested of splitNestedCommands(routeBody, prefix)) {
          inspectCommand(nested, line, nestedContext ? `${nestedContext} > session route` : 'session route', false, depth + 1);
        }
      }
      for (const nested of nestedBodies(directive, tokens, parsed.body, prefix, meta)) {
        for (const nestedCommand of splitNestedCommands(nested.source, prefix)) {
          inspectCommand(nestedCommand, line, nestedContext ? `${nestedContext} > ${nested.context}` : nested.context, false, depth + 1);
        }
      }
    };

    for (const command of split.commands) {
      try {
        inspectCommand(command.value, command.line, '', true, 0);
      } catch (error) {
        parseErrors.push(`Line ${command.line}: ${error?.message || error}`);
      }
    }

    const summary = emptySummary();
    for (const entry of entries) summary[entry.classification] = (summary[entry.classification] || 0) + 1;
    return { ok: parseErrors.length === 0, filename, entries, reads, variables, knownSessions, errors: parseErrors, summary };
  }

  async function auditTinTinTree(rootSourceValue, options = {}) {
    const prefix = normalizePrefix(options.commandPrefix || '#');
    const rootFilename = String(options.filename || 'script.tin').trim() || 'script.tin';
    const maxDepth = Math.max(1, Math.min(16, Number(options.maxDepth) || 8));
    const maxFiles = Math.max(1, Math.min(128, Number(options.maxFiles) || 32));
    const readFile = typeof options.readFile === 'function' ? options.readFile : null;
    const variables = new Map();
    const knownSessions = new Set((options.sessionNames || []).map((name) => String(name || '').trim().toLowerCase()).filter(Boolean));
    const entries = [];
    const includes = [];
    const errors = [];
    const visited = new Set();
    let filesRead = 0;

    const keyFor = (value) => String(value || '').trim().normalize('NFKC').toLowerCase();

    const visit = async (source, filename, depth, stack) => {
      if (depth > maxDepth) {
        errors.push(`${filename}: nested #READ depth exceeds ${maxDepth}.`);
        return;
      }
      const key = keyFor(filename);
      if (stack.includes(key)) {
        includes.push({ from: stack.at(-1) || rootFilename, filename, status: 'cycle' });
        return;
      }
      if (visited.has(key)) {
        includes.push({ from: stack.at(-1) || rootFilename, filename, status: 'already-audited' });
        return;
      }
      if (filesRead >= maxFiles) {
        errors.push(`TinTin audit stopped after the safety limit of ${maxFiles} files.`);
        return;
      }
      visited.add(key);
      filesRead += 1;
      const result = auditTinTinSource(source, { filename, commandPrefix: prefix, variables, knownSessions });
      entries.push(...result.entries);
      errors.push(...result.errors.map((error) => `${filename}: ${error}`));

      for (const read of result.reads) {
        if (read.dynamic || !read.requested) {
          includes.push({ from: filename, line: read.line, filename: '', status: 'dynamic-unresolved' });
          continue;
        }
        if (!readFile) {
          includes.push({ from: filename, line: read.line, filename: read.requested, status: 'not-read-no-provider' });
          continue;
        }
        let response;
        try { response = await readFile(read.requested); }
        catch (error) { response = { ok: false, error: error?.message || String(error) }; }
        if (!response?.ok || response.mode === 'info') {
          includes.push({ from: filename, line: read.line, filename: read.requested, status: 'missing', error: String(response?.error || 'script was not found') });
          continue;
        }
        const childFilename = String(response.filename || read.requested).trim() || read.requested;
        includes.push({ from: filename, line: read.line, filename: childFilename, status: 'resolved' });
        await visit(response.content || '', childFilename, depth + 1, [...stack, key]);
      }
    };

    await visit(rootSourceValue, rootFilename, 0, []);
    const summary = emptySummary();
    for (const entry of entries) summary[entry.classification] = (summary[entry.classification] || 0) + 1;
    return {
      ok: errors.length === 0,
      filename: rootFilename,
      filesRead,
      entries,
      includes,
      summary,
      errors,
      unresolvedReads: includes.filter((entry) => ['dynamic-unresolved', 'missing', 'not-read-no-provider'].includes(entry.status)).length
    };
  }

  function formatTinTinCompatibilityAudit(result = {}, options = {}) {
    const prefix = normalizePrefix(options.commandPrefix || '#');
    if (!result || !Array.isArray(result.entries)) return ['#ERROR: TINTIN COMPATIBILITY AUDIT DID NOT RETURN A RESULT.'];
    const summary = result.summary || emptySummary();
    const total = result.entries.length;
    const lines = [
      `#OK: TINTIN COMPATIBILITY AUDIT ${String(result.filename || 'script.tin').toUpperCase()}.`,
      `#OK: ${result.filesRead || 1} SCRIPT FILE${(result.filesRead || 1) === 1 ? '' : 'S'} AUDITED; ${total} REACHABLE COMMAND${total === 1 ? '' : 'S'} CLASSIFIED; NOTHING EXECUTED.`,
      `#OK: NATIVE ${summary[CLASSIFICATIONS.NATIVE] || 0}; TRANSLATED ${summary[CLASSIFICATIONS.TRANSLATED] || 0}; COMPATIBILITY NO-OP ${summary[CLASSIFICATIONS.NOOP] || 0}; BLOCKED ${summary[CLASSIFICATIONS.BLOCKED] || 0}; NEEDS IMPLEMENTATION ${summary[CLASSIFICATIONS.NEEDS] || 0}.`
    ];
    const resolved = (result.includes || []).filter((entry) => entry.status === 'resolved').length;
    const dynamic = (result.includes || []).filter((entry) => entry.status === 'dynamic-unresolved').length;
    const missing = (result.includes || []).filter((entry) => entry.status === 'missing').length;
    if (resolved || dynamic || missing) {
      lines.push(`#OK: NESTED READS: ${resolved} RESOLVED; ${dynamic} DYNAMIC/SESSION-DEPENDENT; ${missing} MISSING.`);
    }

    const actionable = result.entries.filter((entry) => [CLASSIFICATIONS.BLOCKED, CLASSIFICATIONS.NEEDS].includes(entry.classification));
    const noops = result.entries.filter((entry) => entry.classification === CLASSIFICATIONS.NOOP);
    const maximum = Math.max(1, Math.min(100, Number(options.maxFindings) || 40));
    const findings = [...actionable, ...noops].slice(0, maximum);
    for (const entry of findings) {
      lines.push(`#${entry.classification === CLASSIFICATIONS.BLOCKED ? 'BLOCKED' : entry.classification === CLASSIFICATIONS.NEEDS ? 'TODO' : 'NOOP'}: ${entry.filename}:${entry.line} ${prefix}${String(entry.directive || '').toUpperCase()} — ${entry.detail}`);
    }
    if (actionable.length + noops.length > findings.length) {
      lines.push(`#INFO: ${actionable.length + noops.length - findings.length} ADDITIONAL NON-NATIVE FINDING${actionable.length + noops.length - findings.length === 1 ? '' : 'S'} OMITTED FROM THIS TERMINAL SUMMARY.`);
    }
    for (const include of (result.includes || []).filter((entry) => entry.status === 'dynamic-unresolved').slice(0, 20)) {
      lines.push(`#INFO: ${include.from}:${include.line || 1} HAS A DYNAMIC #READ; AUDIT WILL RECHECK THE RESOLVED CHARACTER FILE WHEN IT IS AVAILABLE.`);
    }
    for (const include of (result.includes || []).filter((entry) => entry.status === 'missing').slice(0, 20)) {
      lines.push(`#WARN: ${include.from}:${include.line || 1} REFERENCES ${include.filename || 'A SCRIPT'} THAT WAS NOT AVAILABLE TO THE AUDIT.`);
    }
    for (const error of result.errors || []) lines.push(`#ERROR: ${error}`);
    if (!actionable.length) lines.push('#OK: NO BLOCKED OR NEEDS-IMPLEMENTATION DIRECTIVES WERE FOUND IN THE REACHABLE TREE.');
    lines.push('#INFO: AUDIT OUTPUT NEVER PRINTS VARIABLE VALUES, LOGIN SECRETS, OR RAW SCRIPT COMMANDS.');
    return lines;
  }

  return Object.freeze({
    CLASSIFICATIONS,
    OFFICIAL_COMMANDS,
    classifyDirective,
    auditTinTinSource,
    auditTinTinTree,
    formatTinTinCompatibilityAudit,
    classifyCommandFamily,
    commandCompatibilityMatrix,
    classificationLabel
  });
});
