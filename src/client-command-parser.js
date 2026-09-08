(function exposeClientCommandParser(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireClientCommands = api;
})(typeof window !== 'undefined' ? window : globalThis, function createClientCommandParser() {
  'use strict';

const CLIENT_COMMAND_PREFIXES = Object.freeze(['#', '~', '^', '/', '`', "'"]);
const DEFAULT_CLIENT_COMMAND_PREFIX = '#';
const CLIENT_DIRECTIVE_ALIASES = Object.freeze({
  al: 'alias',
  unal: 'unalias',
  var: 'variable',
  unvar: 'unvariable',
  fun: 'function',
  unfun: 'unfunction',
  act: 'action',
  ac: 'action',
  unact: 'unaction',
  high: 'highlight',
  unhigh: 'unhighlight',
  sub: 'substitute',
  unsub: 'unsubstitute',
  mac: 'macro',
  unmac: 'unmacro',
  mess: 'message',
  sho: 'showme',
  tick: 'ticker',
  untick: 'unticker',
  regexp: 'regex',
  killall: 'kill'
});

// Keep this in the same order as TinTin++'s command_table.  TinTin resolves
// abbreviations by taking the first table entry for which is_abbrev() is true,
// so ambiguity is intentionally order-sensitive (for example #una is
// #UNACTION, while #unal is #UNALIAS).
const TINTIN_COMMAND_TABLE = Object.freeze([
  'action', 'advertise', 'alias', 'all', 'bell', 'break', 'buffer', 'case', 'cat',
  'chat', 'class', 'commands', 'config', 'continue', 'cr', 'cursor', 'debug',
  'default', 'delay', 'dirs', 'echo', 'else', 'elseif', 'end', 'event',
  'forall', 'foreach', 'format', 'function', 'gag', 'grep', 'help', 'highlight',
  'history', 'if', 'ignore', 'info', 'killall', 'line', 'list', 'log', 'loop',
  'macro', 'map', 'math', 'message', 'nop', 'parse', 'path', 'pathdir', 'prompt',
  'read', 'regexp', 'replace', 'return', 'run', 'scan', 'script', 'send',
  'session', 'showme', 'snoop', 'split', 'substitute', 'switch', 'system', 'tab',
  'test', 'textin', 'ticker', 'unaction', 'unalias', 'undelay', 'unevent',
  'unfunction', 'ungag', 'unhighlight', 'unmacro', 'unpathdir', 'unprompt',
  'unsplit', 'unsubstitute', 'untab', 'unticker', 'unvariable', 'variable',
  'while', 'write', 'zap'
]);

// Exact NukeFire-native names must win before TinTin abbreviation expansion.
// Without this guard, names such as #profile would be mistaken for #prompt.
const NUKEFIRE_EXACT_DIRECTIVES = new Set([
  'actions', 'aliases', 'audit', 'edit', 'events', 'functions', 'gags',
  'groups', 'group', 'leader', 'local', 'profile', 'regex', 'reload', 'role',
  'sessions', 'show', 'speedwalk', 'variables', 'unlocal'
]);

const TINTIN_INTERNAL_CANONICAL = Object.freeze({ regexp: 'regex', killall: 'kill' });

function resolveTinTinCommandDirective(value) {
  const directive = normalizeDirectiveToken(value);
  if (!directive) return '';
  if (NUKEFIRE_EXACT_DIRECTIVES.has(directive)) return directive;
  if (Object.prototype.hasOwnProperty.call(CLIENT_DIRECTIVE_ALIASES, directive)) {
    // Explicit legacy short forms are all unambiguous at their full spelling.
    return CLIENT_DIRECTIVE_ALIASES[directive];
  }
  const match = TINTIN_COMMAND_TABLE.find((candidate) => candidate.startsWith(directive));
  if (!match) return directive;
  return TINTIN_INTERNAL_CANONICAL[match] || match;
}

function normalizeClientCommandPrefix(value, fallback = DEFAULT_CLIENT_COMMAND_PREFIX) {
  const normalizedFallback = CLIENT_COMMAND_PREFIXES.includes(String(fallback || ''))
    ? String(fallback)
    : DEFAULT_CLIENT_COMMAND_PREFIX;
  const source = String(value ?? '').normalize('NFKC').trim();
  return CLIENT_COMMAND_PREFIXES.includes(source) ? source : normalizedFallback;
}

function isClientCommand(input, prefixValue = DEFAULT_CLIENT_COMMAND_PREFIX) {
  const source = String(input || '');
  const prefix = normalizeClientCommandPrefix(prefixValue);
  return source.startsWith(prefix) && !source.startsWith(prefix.repeat(2));
}

function isEscapedClientCommand(input, prefixValue = DEFAULT_CLIENT_COMMAND_PREFIX) {
  const source = String(input || '');
  const prefix = normalizeClientCommandPrefix(prefixValue);
  return source.startsWith(prefix.repeat(2));
}

function normalizeDirectiveToken(value, maximum = 48) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, maximum);
}

function canonicalClientDirective(value) {
  return resolveTinTinCommandDirective(value);
}

function tokenizeBraced(input, options = {}) {
  const source = String(input || '');
  const preserveEscapedSemicolon = options?.preserveEscapedSemicolon === true;
  const tokens = [];
  let token = '';
  let depth = 0;
  let escaped = false;
  let quoted = false;
  let bracedToken = false;

  const commit = () => {
    if (token.length > 0 || bracedToken) tokens.push(token);
    token = '';
    bracedToken = false;
  };

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (escaped) {
      token += preserveEscapedSemicolon && char === ';' ? '\\;' : char;
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"' && depth === 0) {
      quoted = !quoted;
      continue;
    }

    if (!quoted && char === '{') {
      if (depth === 0 && token.length === 0) bracedToken = true;
      if (depth > 0 || !bracedToken) token += char;
      depth += 1;
      continue;
    }

    if (!quoted && char === '}' && depth > 0) {
      depth -= 1;
      if (depth > 0) token += char;
      else if (bracedToken) commit();
      else token += char;
      continue;
    }

    if (!quoted && depth === 0 && /\s/u.test(char)) {
      commit();
      continue;
    }

    token += char;
  }

  if (escaped) token += '\\';
  commit();
  return tokens;
}


function splitTopLevelCommands(inputValue, options = {}) {
  const source = String(inputValue ?? '').trim();
  const maximum = Math.max(1, Math.trunc(Number(options.maxCommands) || 10));
  const preserveEscapedSemicolon = options.preserveEscapedSemicolon === true;
  const quoteAware = options.quoteAware !== false;
  const commandPrefix = CLIENT_COMMAND_PREFIXES.includes(String(options.commandPrefix || ''))
    ? String(options.commandPrefix)
    : '';
  if (!source) return { commands: [], errorCode: 'empty' };

  const commands = [];
  let command = '';
  let depth = 0;
  let quote = '';
  let escaped = false;

  const commit = () => {
    const normalized = command.trim();
    command = '';
    if (!normalized) return true;
    commands.push(normalized);
    return commands.length <= maximum;
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      command += character === ';'
        ? (preserveEscapedSemicolon ? '\\;' : ';')
        : `\\${character}`;
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (quoteAware && quote) {
      command += character;
      if (character === quote) quote = '';
      continue;
    }

    const previous = source[index - 1] || '';
    const prefixAtCommandStart = Boolean(commandPrefix)
      && character === commandPrefix
      && !command.trim();
    const singleQuoteCanOpen = character === "'"
      && !prefixAtCommandStart
      && (!previous || /[\s({\[]/u.test(previous))
      && source.indexOf("'", index + 1) !== -1;
    if (quoteAware && depth === 0 && (character === '"' || singleQuoteCanOpen)) {
      quote = character;
      command += character;
      continue;
    }

    if (character === '{') {
      depth += 1;
      command += character;
      continue;
    }

    if (character === '}') {
      if (depth === 0) return { commands: [], errorCode: 'unmatched-closing-brace' };
      depth -= 1;
      command += character;
      continue;
    }

    if (character === ';' && depth === 0) {
      if (!commit()) return { commands: [], errorCode: 'too-many' };
      continue;
    }

    command += character;
  }

  if (escaped) return { commands: [], errorCode: 'unfinished-escape' };
  if (quoteAware && quote) return { commands: [], errorCode: 'unterminated-quote' };
  if (depth !== 0) return { commands: [], errorCode: 'unterminated-brace' };
  if (!commit()) return { commands: [], errorCode: 'too-many' };
  if (commands.length === 0) return { commands: [], errorCode: 'empty' };
  return { commands, errorCode: '' };
}

function analyzeCommandLine(inputValue, prefixValue = DEFAULT_CLIENT_COMMAND_PREFIX, options = {}) {
  const source = String(inputValue ?? '').replace(/[\r\n]+$/u, '');
  const maximum = Math.max(1, Math.trunc(Number(options.maxCommands) || 20));
  const prefix = normalizeClientCommandPrefix(prefixValue);
  const parsed = source.includes(';')
    ? splitTopLevelCommands(source, { maxCommands: maximum, preserveEscapedSemicolon: true, commandPrefix: prefix })
    : { commands: [source], errorCode: '' };
  const commands = parsed.errorCode ? [] : parsed.commands;
  const hasClientCommands = commands.some((command) => isClientCommand(command, prefix));
  const hasServerCommands = commands.some((command) => !isClientCommand(command, prefix));
  return {
    commands,
    errorCode: parsed.errorCode,
    hasClientCommands,
    hasServerCommands,
    clientOnly: commands.length > 0 && hasClientCommands && !hasServerCommands
  };
}

function firstDirective(input, prefixValue = DEFAULT_CLIENT_COMMAND_PREFIX) {
  const source = String(input || '');
  const prefix = normalizeClientCommandPrefix(prefixValue);
  if (!source.startsWith(prefix)) return null;
  const remainder = source.slice(prefix.length);
  const match = remainder.match(/^([^\s]+)(?:\s+([\s\S]*))?$/u);
  if (!match) return null;
  return {
    directive: canonicalClientDirective(match[1]),
    body: String(match[2] || '').replace(/[\r\n]+$/u, '')
  };
}

return {
  CLIENT_COMMAND_PREFIXES,
  DEFAULT_CLIENT_COMMAND_PREFIX,
  CLIENT_DIRECTIVE_ALIASES,
  TINTIN_COMMAND_TABLE,
  resolveTinTinCommandDirective,
  normalizeClientCommandPrefix,
  isClientCommand,
  isEscapedClientCommand,
  canonicalClientDirective,
  tokenizeBraced,
  splitTopLevelCommands,
  analyzeCommandLine,
  firstDirective
};

});
