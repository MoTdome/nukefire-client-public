'use strict';

const { ConnectionManager } = require('./connection-manager');
const { AliasEngine } = require('./alias-engine');
const { VariableEngine, normalizeVariableName, normalizeSimpleVariableName, normalizeVariableValue, parseVariablePath, LITERAL_PERCENT_SENTINEL } = require('./variable-engine');
const {
  FunctionEngine,
  normalizeFunctionName,
  functionCallAt,
  substituteFunctionArguments,
  LITERAL_AT_SENTINEL,
  FUNCTION_OUTPUT_MAX,
  DEFAULT_MAX_FUNCTION_ARGUMENTS,
  DEFAULT_MAX_FUNCTION_DEPTH,
  DEFAULT_MAX_FUNCTION_CALLS
} = require('./function-engine');
const { ActionEngine, ActionLineBuffer, ActionRateLimiter, compileActionPattern, substituteActionCommand, DEFAULT_MAX_ACTION_COMMANDS, DEFAULT_RATE_LIMIT } = require('./action-engine');
const { EventEngine, normalizeEventName } = require('./event-engine');
const { GagEngine, GagLineFilter } = require('./gag-engine');
const {
  HighlightEngine,
  parseHighlightStyle,
  normalizeHighlightPattern,
  normalizeHighlightPriority
} = require('./highlight-engine');
const {
  SubstituteEngine,
  normalizeSubstitutePattern,
  normalizeSubstitutePriority
} = require('./substitute-engine');
const { MacroEngine, parseMacroKey } = require('./macro-engine');
const { TabEngine } = require('./tab-engine');
const { ClassManager, normalizeClassName } = require('./class-manager');
const { startupTemplateDefinitions } = require('./tintin-startup');
const { parseSpeedwalk, DEFAULT_MAX_SPEEDWALK_STEPS } = require('./speedwalk-engine');
const {
  tokenizeBraced,
  splitTopLevelCommands,
  firstDirective,
  normalizeClientCommandPrefix,
  isClientCommand,
  isEscapedClientCommand,
  DEFAULT_CLIENT_COMMAND_PREFIX,
  CLIENT_COMMAND_PREFIXES
} = require('./client-command-parser');
const { clientCommandHelp } = require('./client-command-help');
const { buildMudletMsdpSnapshot, diffMudletMsdp } = require('./lua-data-bridge');
const {
  formatTinTinEcho,
  protectEchoFormatSpecifiers,
  protectEchoTimeSpecifiers,
  echoFormatArgumentTypes,
  styleToAnsi
} = require('./echo-format');
const { evaluateMathExpression } = require('./math-engine');
const { evaluateTinTinCondition } = require('./tintin-condition');
const {
  compileTinTinRegexp,
  matchTinTinRegexp,
  matchTinTinWhole,
  substituteTinTinCommandCaptures
} = require('./tintin-regexp');
const {
  parseConditionalStatement,
  collectConditionalChain,
  DEFAULT_MAX_CONDITIONAL_BRANCHES
} = require('./conditional-engine');
const {
  PipelineDebugBuffer,
  normalizePipelineDebugSettings,
  formatPipelineDebugEntry
} = require('./pipeline-debug');

const SESSION_ID_MAX = 48;
const SESSION_NAME_MAX = 80;
const SESSION_ROLE_MAX = 32;
const GROUP_NAME_MAX = 48;
const DEFAULT_SEND_INTERVAL_MS = 0;
const DEFAULT_MAX_PENDING_COMMANDS = 256;
const DEFAULT_MAX_REPEAT_COMMANDS = 100;
const DEFAULT_MAX_DELAY_SECONDS = 86_400;
const DEFAULT_MAX_PENDING_DELAYS = 100;
const DEFAULT_MAX_DELAY_COMMANDS = 10;
const DEFAULT_MAX_LOOP_ITERATIONS = 100;
const DEFAULT_MAX_LOOP_COMMANDS = 10;
const LUA_COMMAND_LINE_MAX = 8192;
const LUA_OUTPUT_HISTORY_MAX = 256;
const LUA_OUTPUT_LINE_MAX = 8192;
const LUA_OUTPUT_SNAPSHOT_BYTES = 64 * 1024;
const DEFAULT_MAX_WHILE_ITERATIONS = 256;
const DEFAULT_MAX_WHILE_COMMANDS = 32;
const DEFAULT_MAX_WHILE_DEPTH = 4;
const DEFAULT_MAX_LIST_ITEMS = 512;
const DEFAULT_MAX_FOREACH_ITEMS = 512;
const DEFAULT_MAX_FOREACH_COMMANDS = 32;
const DEFAULT_MAX_FOREACH_DEPTH = 4;
const DEFAULT_MAX_FORALL_ITEMS = 512;
const DEFAULT_MAX_FORALL_COMMANDS = 32;
const DEFAULT_MAX_FORALL_DEPTH = 4;
const DEFAULT_MAX_PATH_NODES = 2048;
const DEFAULT_MAX_PARSE_ITEMS = 512;
const DEFAULT_MAX_SWITCH_DEPTH = 8;
const DEFAULT_MAX_TICKERS = 64;
const DEFAULT_MIN_TICKER_SECONDS = 0.05;
const DEFAULT_MAX_TICKER_SECONDS = 86_400;
const DEFAULT_MAX_COMMAND_LINE_COMMANDS = 32;
const DEFAULT_MAX_LOCAL_DISPLAY_CHARACTERS = 4096;
const DEFAULT_MAX_TINTIN_OUTPUT_LINES = 5000;
const DEFAULT_MAX_TINTIN_HISTORY = 2000;
const DEFAULT_TINTIN_AUTO_TAB = 0;
const DEFAULT_TINTIN_PATH_DIRECTIONS = Object.freeze({
  n: 's', s: 'n', e: 'w', w: 'e', u: 'd', d: 'u',
  ne: 'sw', sw: 'ne', nw: 'se', se: 'nw'
});
const DEFAULT_TINTIN_PATH_CODES = Object.freeze({
  n: 1, e: 2, s: 4, w: 8, u: 16, d: 32,
  ne: 3, se: 6, nw: 9, sw: 12
});
const DEFAULT_MAX_FUNCTION_COMMANDS = 64;
const DEFAULT_MAX_CONDITIONAL_COMMANDS = 64;
const DEFAULT_MAX_CONDITIONAL_DEPTH = 16;
const DEFAULT_MAX_LUA_EXECUTION_DEPTH = 4;
const DEFAULT_MAX_LUA_AUTOMATIONS = 256;
const DEFAULT_MAX_LUA_CALLBACKS_PER_SECOND = 128;
const SOUND_EVENT_NAME_MAX = 80;
const SOUND_EVENT_NAME_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u;
const SOUND_QUERY_TEXT_MAX = 80;
const SOUND_LIST_FILTER_PATTERN = /^[a-z0-9_-]+$/u;
const DEFERRED_ACTION_VARIABLE_DIRECTIVES = new Set(['echo', 'format', 'math', 'show', 'showme', 'lua', 'sound']);
const ACTION_MANAGEMENT_DIRECTIVES = new Set([
  'alias', 'aliases', 'unalias',
  'action', 'actions', 'unaction', 'gag', 'gags', 'ungag',
  'highlight', 'high', 'unhighlight', 'unhigh',
  'substitute', 'sub', 'unsubstitute', 'unsub',
  'macro', 'mac', 'unmacro', 'unmac',
  'function', 'functions', 'unfunction', 'local', 'unlocal', 'return',
  'class', 'classes', 'help', 'audit', 'read', 'write', 'edit', 'profile', 'reload', 'end', 'kill', 'speedwalk', 'session', 'sessions',
  'group', 'groups', 'role', 'leader', 'loop', 'while', 'continue', 'debug', 'event', 'events', 'unevent', 'config', 'log', 'snoop', 'ignore', 'message', 'mess', 'set'

]);

const TINTIN_LIST_SUBCOMMANDS = Object.freeze([
  ['add', 'add'], ['clear', 'clear'], ['clr', 'clear'], ['create', 'create'],
  ['collapse', 'collapse'], ['copy', 'copy'], ['delete', 'delete'], ['explode', 'explode'],
  ['filter', 'filter'], ['find', 'find'], ['fnd', 'find'], ['get', 'get'], ['indexate', 'indexate'],
  ['insert', 'insert'], ['length', 'size'], ['numerate', 'numerate'], ['order', 'order'],
  ['refine', 'refine'], ['reverse', 'reverse'], ['set', 'set'], ['shuffle', 'shuffle'],
  ['simplify', 'simplify'], ['size', 'size'], ['sort', 'sort'], ['srt', 'sort'], ['swap', 'swap'], ['tabulate', 'tabulate'], ['tokenize', 'tokenize']
]);
const TINTIN_HISTORY_SUBCOMMANDS = Object.freeze([
  ['delete', 'delete'], ['insert', 'insert'], ['list', 'list'], ['read', 'read'], ['write', 'write']
]);
const TINTIN_BUFFER_SUBCOMMANDS = Object.freeze([
  ['clear', 'clear'], ['down', 'down'], ['end', 'end'], ['find', 'find'], ['get', 'get'],
  ['home', 'home'], ['info', 'info'], ['lock', 'lock'], ['up', 'up'], ['write', 'write']
]);
const TINTIN_CLASS_SUBCOMMANDS = Object.freeze([
  ['open', 'open'], ['close', 'close'], ['read', 'read'], ['write', 'write'], ['kill', 'kill']
]);
const TINTIN_LINE_SUBCOMMANDS = Object.freeze([
  ['gag', 'gag'], ['ignore', 'ignore'], ['json', 'json'], ['local', 'local'], ['log', 'log'], ['logverbatim', 'logverbatim'],
  ['quiet', 'quiet'], ['strip', 'strip'], ['substitute', 'substitute'], ['verbatim', 'verbatim'], ['verbose', 'verbose']
]);
const TINTIN_LINE_SUBSTITUTIONS = Object.freeze([
  ['variables', 'variables'], ['functions', 'functions'], ['colors', 'colors'],
  ['escapes', 'escapes'], ['secure', 'secure'], ['eol', 'eol'], ['lnf', 'lnf']
]);
const TINTIN_VISIBLE_LIST_FAMILIES = Object.freeze([
  ['actions', 'action'], ['aliases', 'alias'], ['classes', 'class'], ['configurations', 'config'],
  ['delays', 'delay'], ['events', 'event'], ['functions', 'function'], ['gags', 'gag'],
  ['highlights', 'highlight'], ['histories', 'history'], ['macros', 'macro'], ['paths', 'path'],
  ['pathdirs', 'pathdir'], ['prompts', 'prompt'], ['substitutions', 'substitute'], ['tabs', 'tab'],
  ['tickers', 'ticker'], ['variables', 'variable']
]);

const TINTIN_PATH_SUBCOMMANDS = Object.freeze([
  ['delete', 'delete'], ['end', 'end'], ['insert', 'insert'], ['load', 'load'], ['map', 'map'],
  ['new', 'new'], ['run', 'run'], ['save', 'save'], ['show', 'show'], ['unzip', 'unzip'],
  ['walk', 'walk'], ['zip', 'zip']
]);
const TINTIN_CURSOR_OPERATIONS = Object.freeze([
  ['auto tab backward', 'auto tab backward'], ['auto tab forward', 'auto tab forward'],
  ['backspace', 'backspace'], ['backward', 'backward'], ['clear left', 'clear left'],
  ['clear line', 'clear line'], ['clear right', 'clear right'], ['convert meta', 'convert meta'],
  ['ctrl delete', 'ctrl delete'], ['delete', 'delete'], ['delete word left', 'delete word left'],
  ['delete word right', 'delete word right'], ['echo on', 'echo on'], ['echo off', 'echo off'],
  ['end', 'end'], ['enter', 'enter'], ['exit', 'exit'], ['forward', 'forward'], ['get', 'get'],
  ['history next', 'history next'], ['history prev', 'history prev'], ['history search', 'history search'],
  ['home', 'home'], ['insert', 'insert'], ['mixed tab backward', 'mixed tab backward'],
  ['mixed tab forward', 'mixed tab forward'], ['next word', 'next word'], ['paste buffer', 'paste buffer'],
  ['prev word', 'prev word'], ['redraw input', 'redraw input'], ['set', 'set'], ['suspend', 'suspend'],
  ['test', 'test'], ['tab backward', 'tab backward'], ['tab forward', 'tab forward']
]);
const TINTIN_CONFIG_KEYS = Object.freeze([
  ['auto tab', 'auto tab'], ['buffer size', 'buffer size'], ['charset', 'charset'],
  ['color patch', 'color patch'], ['connect retry', 'connect retry'], ['convert meta', 'convert meta'],
  ['debug telnet', 'debug telnet'], ['command color', 'command color'], ['command echo', 'command echo'],
  ['history size', 'history size'], ['log', 'log'], ['log level', 'log level'], ['mccp', 'mccp'],
  ['packet patch', 'packet patch'], ['repeat enter', 'repeat enter'], ['repeat char', 'repeat char'],
  ['scroll lock', 'scroll lock'], ['speedwalk', 'speedwalk'], ['tintin char', 'tintin char'],
  ['verbatim', 'verbatim'], ['verbatim char', 'verbatim char'], ['verbose', 'verbose'], ['wordwrap', 'wordwrap']
]);

function resolveTinTinOrderedAbbreviation(value, entries, exactExtensions = {}) {
  const token = String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/[_\s]+/gu, ' ');
  if (!token) return '';
  if (Object.prototype.hasOwnProperty.call(exactExtensions, token)) return exactExtensions[token];
  for (const [sourceName, canonical] of entries) {
    if (sourceName.startsWith(token)) return canonical;
  }
  return token;
}

function tinTinDefinitionMatches(value, patternValue) {
  const pattern = String(patternValue ?? '').trim();
  if (!pattern) return false;
  const matched = matchTinTinWhole(String(value ?? '').trim(), pattern);
  return !matched.error && matched.matched;
}

function normalizeToken(value, maximum = SESSION_ID_MAX) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, maximum);
}


function unescapeActionSemicolons(value) {
  return String(value || '').replaceAll('\\;', ';');
}

function normalizeLegacyTinTinScriptRequest(value) {
  const source = String(value ?? '').normalize('NFKC').trim().replaceAll('\\', '/');
  if (!source) return '';
  const basename = source.split('/').filter(Boolean).at(-1) || source;
  if (!basename || basename.length > 80 || basename === '.' || basename === '..' || basename.startsWith('.') || basename.includes('..')) return '';
  if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]*$/u.test(basename)) return '';
  if (/\.(?:tin|txt)$/iu.test(basename)) return basename;
  if (/\.[A-Za-z0-9]{1,12}$/u.test(basename)) return `${basename}.tin`;
  return basename;
}

function normalizeLegacyTinTinLogRequest(value) {
  const source = String(value ?? '').normalize('NFKC').trim().replaceAll('\\', '/');
  if (!source) return '';
  const basename = source.split('/').filter(Boolean).at(-1) || source;
  if (!basename || basename.length > 128 || basename === '.' || basename === '..' || basename.startsWith('.') || basename.includes('..')) return '';
  return /^[A-Za-z0-9][A-Za-z0-9 _().@+-]*(?:\.[A-Za-z0-9]{1,12})?$/u.test(basename) ? basename : '';
}

function stripTerminalSequences(value) {
  return String(value ?? '')
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/gu, '')
    .replace(/\x1b\[[0-?]*[ -\/]*[@-~]/gu, '');
}

function normalizeLocalDisplayText(value, maximum = DEFAULT_MAX_LOCAL_DISPLAY_CHARACTERS) {
  const limit = Math.max(1, Math.trunc(Number(maximum) || DEFAULT_MAX_LOCAL_DISPLAY_CHARACTERS));
  return String(value ?? '')
    .replace(/[\r\n\t]+/gu, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/gu, '')
    .slice(0, limit);
}

function freezeSnapshotTree(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freezeSnapshotTree(child, seen);
  return Object.freeze(value);
}


function tinTinColorEscape(tokenValue) {
  const token = String(tokenValue || '');
  if (/^<[a-f]{3}>$/u.test(token)) {
    const letters = token.slice(1, 4);
    const index = 16 + (letters.charCodeAt(0) - 97) * 36 + (letters.charCodeAt(1) - 97) * 6 + (letters.charCodeAt(2) - 97);
    return `\x1b[38;5;${index}m`;
  }
  if (/^<[A-F]{3}>$/u.test(token)) {
    const letters = token.slice(1, 4);
    const index = 16 + (letters.charCodeAt(0) - 65) * 36 + (letters.charCodeAt(1) - 65) * 6 + (letters.charCodeAt(2) - 65);
    return `\x1b[48;5;${index}m`;
  }
  if (/^<\d{3}>$/u.test(token)) {
    const digits = token.slice(1, 4);
    if (digits === '888') return '';
    const codes = [];
    if (digits[0] === '2') codes.push('22');
    else if (digits[0] !== '8') codes.push(digits[0]);
    if (digits[1] !== '8') codes.push(`3${digits[1]}`);
    if (digits[2] !== '8') codes.push(`4${digits[2]}`);
    return codes.length ? `\x1b[${codes.join(';')}m` : '';
  }
  if (/^<reset>$/iu.test(token)) return '\x1b[0m';
  const fallback = styleToAnsi(token.slice(1, -1));
  return fallback.error ? token : fallback.text;
}

function applyTinTinLineSubstitutionTransforms(value, modesValue) {
  const modes = modesValue instanceof Set ? modesValue : new Set(modesValue || []);
  const colors = modes.has('colors');
  const escapes = modes.has('escapes');
  const secure = modes.has('secure');
  let source = String(value ?? '');
  let output = '';
  let suppressLineEnding = false;

  for (let index = 0; index < source.length;) {
    if (colors && source[index] === '<') {
      const candidate = source.slice(index).match(/^<(?:[a-f]{3}|[A-F]{3}|\d{3}|reset)>/u)?.[0];
      if (candidate) {
        output += tinTinColorEscape(candidate);
        index += candidate.length;
        continue;
      }
    }

    if (escapes && source[index] === '\\') {
      if (index + 1 >= source.length) {
        suppressLineEnding = true;
        index += 1;
        continue;
      }
      const code = source[index + 1];
      if (code === 'a') output += '\x07';
      else if (code === 'b') output += '\x08';
      else if (code === 'e') output += '\x1b';
      else if (code === 'n') output += '\n';
      else if (code === 'r') output += '\r';
      else if (code === 't') output += '\t';
      else if (code === 'c' && index + 2 < source.length) {
        output += String.fromCharCode(source.charCodeAt(index + 2) % 32);
        index += 1;
      } else if (code === 'x' && /^[0-9a-fA-F]{2}/u.test(source.slice(index + 2, index + 4))) {
        output += String.fromCharCode(Number.parseInt(source.slice(index + 2, index + 4), 16));
        index += 2;
      } else if (code === '0' && /^[0-7]{2}/u.test(source.slice(index + 2, index + 4))) {
        output += String.fromCharCode(Number.parseInt(source.slice(index + 2, index + 4), 8));
        index += 2;
      } else output += code;
      index += 2;
      continue;
    }

    const character = source[index];
    if (secure) {
      if (character === '{') output += '\\x7B';
      else if (character === '}') output += '\\x7D';
      else if (character === ';') output += '\\;';
      else output += character;
    } else output += character;
    index += 1;
  }

  if (!suppressLineEnding) {
    if (modes.has('eol')) output += '\r\n';
    if (modes.has('lnf')) output += '\n';
  }
  return output;
}


function protectTinTinAnsiSemicolons(value) {
  const sentinel = '\uE10F';
  const source = String(value ?? '');
  const protectedValue = source.replace(/\x1b\[[0-9;]*m/gu, (sequence) => sequence.replaceAll(';', sentinel));
  return {
    value: protectedValue,
    restore: (textValue) => String(textValue ?? '').replaceAll(sentinel, ';')
  };
}

function restoreTinTinSecureScriptEscapes(value) {
  const source = String(value ?? '');
  let output = '';
  for (let index = 0; index < source.length;) {
    if (source[index] !== '\\') {
      output += source[index];
      index += 1;
      continue;
    }
    if (source[index + 1] === '\\') {
      output += '\\';
      index += 2;
      continue;
    }
    if (source[index + 1] === ';') {
      output += ';';
      index += 2;
      continue;
    }
    const hex = source.slice(index + 1, index + 4).toLowerCase();
    if (hex === 'x7b') {
      output += '{';
      index += 4;
      continue;
    }
    if (hex === 'x7d') {
      output += '}';
      index += 4;
      continue;
    }
    output += '\\';
    index += 1;
  }
  return output;
}

function sanitizeTinTinLineSubstituteNetworkText(value) {
  const source = String(value ?? '');
  const trailing = source.match(/(?:\r\n|\r|\n)+$/u)?.[0] || '';
  const body = trailing ? source.slice(0, -trailing.length) : source;
  return `${body.replace(/[\r\n]+/gu, ' ')}${trailing}`;
}

function expandLoopVariableReferences(inputValue, variableNameValue, loopValue) {
  const source = String(inputValue ?? '');
  const variableName = normalizeSimpleVariableName(variableNameValue);
  if (!source || !variableName) return source;

  const replacement = String(loopValue);
  const escapedName = variableName.replace(/[\^$.*+?()[\]{}|]/gu, '\\$&');
  const referencePattern = new RegExp(
    String.raw`(?:\$\{${escapedName}\}|\$${escapedName}(?![A-Za-z0-9_])|%\{${escapedName}\}|%${escapedName}(?![A-Za-z0-9_-]))`,
    'giu'
  );
  return source.replace(referencePattern, replacement);
}

function splitTinTinLeadingArgument(value) {
  const source = String(value ?? '').trimStart();
  if (!source) return { value: '', remainder: '' };
  if (source[0] !== '{') {
    const match = source.match(/^([^\s]+)(?:\s+([\s\S]*))?$/u);
    return { value: match?.[1] || source, remainder: match?.[2] || '' };
  }

  let depth = 1;
  let escaped = false;
  let output = '';
  for (let index = 1; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      output += `\\${character}`;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '{') {
      depth += 1;
      output += character;
      continue;
    }
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return { value: output, remainder: source.slice(index + 1).trimStart() };
      output += character;
      continue;
    }
    output += character;
  }
  return { value: source, remainder: '' };
}

function unwrapTinTinSingleBracedArgument(value) {
  const source = String(value ?? '').trim();
  if (!source.startsWith('{')) return source;
  const parsed = splitTinTinLeadingArgument(source);
  return parsed.remainder ? source : parsed.value;
}

function unwrapLuaScriptArgument(value) {
  const source = String(value ?? '').trim();
  if (!source.startsWith('{')) return source;
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        if (source.slice(index + 1).trim()) return source;
        return source.slice(1, index);
      }
      if (depth < 0) return source;
    }
  }
  return source;
}

function parseTinTinBraceChunks(value) {
  const source = String(value ?? '').trim();
  if (!source || source[0] !== '{') return null;
  const chunks = [];
  let index = 0;
  while (index < source.length) {
    while (index < source.length && /\s/u.test(source[index])) index += 1;
    if (index >= source.length) break;
    if (source[index] !== '{') return null;
    index += 1;
    let depth = 1;
    let chunk = '';
    while (index < source.length && depth > 0) {
      const character = source[index];
      if (character === '{') {
        depth += 1;
        if (depth > 1) chunk += character;
      } else if (character === '}') {
        depth -= 1;
        if (depth > 0) chunk += character;
      } else {
        chunk += character;
      }
      index += 1;
    }
    if (depth !== 0) return null;
    chunks.push(chunk);
  }
  return chunks;
}

function flattenTinTinTableEntries(baseValue, literalValue, depth = 0) {
  const base = normalizeVariableName(baseValue);
  if (!base || depth > 3) return null;
  const chunks = parseTinTinBraceChunks(literalValue);
  if (!chunks || chunks.length === 0 || chunks.length % 2 !== 0) return null;
  const entries = [];
  for (let index = 0; index < chunks.length; index += 2) {
    const rawKey = String(chunks[index] || '').normalize('NFKC').trim().toLowerCase();
    if (!rawKey || /[\u0000-\u001F\u007F{}\[\]\\;$%]/u.test(rawKey)) return null;
    const name = normalizeVariableName(`${base}[${rawKey}]`);
    if (!name) return null;
    const rawValue = chunks[index + 1];
    const nested = depth < 3 && String(rawValue || '').trim().startsWith('{')
      ? flattenTinTinTableEntries(name, rawValue, depth + 1)
      : null;
    if (nested?.length) entries.push(...nested);
    else entries.push({ key: rawKey, name, value: rawValue });
  }
  return entries;
}

function normalizeSessionId(value) {
  const token = normalizeToken(value, SESSION_ID_MAX);
  return ['__proto__', 'constructor', 'prototype'].includes(token) ? '' : token;
}

function normalizeGroupName(value) {
  const token = normalizeToken(value, GROUP_NAME_MAX);
  return ['all', 'followers', 'session', 'group', 'role', 'leader'].includes(token)
    ? ''
    : token;
}

function normalizeDisplayName(value, fallback = 'Session') {
  const text = String(value || '').normalize('NFKC').trim();
  return (text || fallback).slice(0, SESSION_NAME_MAX);
}

function normalizeRole(value, fallback = 'member') {
  const text = String(value || '').normalize('NFKC').trim().toLowerCase();
  return (text || fallback).replace(/[^a-z0-9 _-]+/gu, '').slice(0, SESSION_ROLE_MAX) || fallback;
}

function normalizeHost(value, fallback = 'tdome.nukefire.org') {
  const text = String(value || '').trim();
  return text && text.length <= 255 ? text : fallback;
}

function normalizePort(value, fallback = 4000) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 65535 ? number : fallback;
}

function parseDisconnectedConnectionTarget(value) {
  const source = String(value || '').normalize('NFKC').trim();
  const match = source.match(/^(\S+)\s+(\d{1,5})$/u);
  if (!match) return null;
  const host = String(match[1] || '').trim();
  const port = Number(match[2]);
  const likelyHost = host === 'localhost'
    || host.includes('.')
    || host.includes(':')
    || /^\[[0-9a-f:]+\]$/iu.test(host);
  if (!likelyHost || host.length > 255 || !Number.isInteger(port) || port < 1 || port > 65535) return null;
  return { host, port };
}

class SessionCommandQueue {
  constructor(send, options = {}) {
    this.send = typeof send === 'function' ? send : () => false;
    this.intervalMs = Math.max(0, Number.isFinite(Number(options.intervalMs)) ? Number(options.intervalMs) : DEFAULT_SEND_INTERVAL_MS);
    this.maxPending = Math.max(1, Number(options.maxPending) || DEFAULT_MAX_PENDING_COMMANDS);
    this.setTimer = options.setTimer || setTimeout;
    this.clearTimer = options.clearTimer || clearTimeout;
    this.pending = [];
    this.timer = null;
    this.closed = false;
  }

  enqueue(command, options = {}) {
    return this.enqueueBatch([command], options);
  }

  enqueueBatch(commands, options = {}) {
    const list = Array.isArray(commands) ? commands : [];
    if (this.closed || list.length === 0 || this.pending.length + list.length > this.maxPending) return false;
    const source = String(options.source || 'command');
    for (const command of list) {
      this.pending.push({ command: String(command ?? ''), source });
    }
    this.drain();
    return true;
  }

  drain() {
    if (this.closed || this.timer !== null || this.pending.length === 0) return;

    // TinTin-style Speedwalk should not manufacture latency between movement
    // commands. The default zero-delay path drains the bounded batch in one
    // iterative pass: no timer churn, no recursive stack, and commands remain
    // separate ordered MUD lines. Tests and special callers can still request
    // a non-zero interval when deliberately exercising paced/cancellable work.
    if (this.intervalMs <= 0) {
      while (!this.closed && this.pending.length > 0) {
        const batch = this.pending.splice(0);
        for (const entry of batch) {
          if (this.closed) break;
          this.send(entry.command, entry);
        }
      }
      return;
    }

    const entry = this.pending.shift();
    this.send(entry.command, entry);
    this.timer = this.setTimer(() => {
      this.timer = null;
      this.drain();
    }, this.intervalMs);
  }

  clear() {
    this.pending = [];
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
  }

  clearSource(sourceValue) {
    const source = String(sourceValue || '');
    const before = this.pending.length;
    this.pending = this.pending.filter((entry) => entry.source !== source);
    return before - this.pending.length;
  }

  countSource(sourceValue) {
    const source = String(sourceValue || '');
    return this.pending.reduce((count, entry) => count + (entry.source === source ? 1 : 0), 0);
  }

  close() {
    this.closed = true;
    this.clear();
  }

  get size() {
    return this.pending.length;
  }
}

class SessionManager {
  constructor(options = {}) {
    this.handlers = options.handlers || {};
    this.connectionFactory = options.connectionFactory || ((handlers) => new ConnectionManager(handlers));
    this.queueOptions = options.queueOptions || {};
    this.sessions = new Map();
    this.groups = new Map();
    this.activeSessionId = '';
    this.nextSequence = 1;
    this.commandPrefix = normalizeClientCommandPrefix(
      options.commandPrefix,
      DEFAULT_CLIENT_COMMAND_PREFIX
    );
    this._tinTinContextStack = [];
    this._seedTinTinContextClaimed = false;
    this._startupTinTinTemplate = null;
    this._tinTinSnapshotCache = new WeakMap();
    this._sessionListRevision = 0;
    this._seedTinTinContext = this.createTinTinContext({
      aliasEngine: options.aliasEngine,
      aliasOptions: options.aliasOptions,
      variableEngine: options.variableEngine,
      variableOptions: options.variableOptions,
      functionEngine: options.functionEngine,
      functionOptions: options.functionOptions,
      actionEngine: options.actionEngine,
      actionOptions: options.actionOptions,
      gagEngine: options.gagEngine,
      gagOptions: options.gagOptions,
      highlightEngine: options.highlightEngine,
      highlightOptions: options.highlightOptions,
      substituteEngine: options.substituteEngine,
      substituteOptions: options.substituteOptions,
      macroEngine: options.macroEngine,
      macros: options.macros,
      macroOptions: options.macroOptions,
      tabEngine: options.tabEngine,
      tabs: options.tabs,
      tabOptions: options.tabOptions,
      classManager: options.classManager,
      classes: options.classes,
      speedwalkEnabled: options.speedwalkEnabled
    });
    this.maxFunctionDepth = Math.max(1, Number(options.maxFunctionDepth) || DEFAULT_MAX_FUNCTION_DEPTH);
    this.maxFunctionCalls = Math.max(1, Number(options.maxFunctionCalls) || DEFAULT_MAX_FUNCTION_CALLS);
    this.maxSpeedwalkSteps = Math.max(1, Number(options.maxSpeedwalkSteps) || DEFAULT_MAX_SPEEDWALK_STEPS);
    this.maxRepeatCommands = Math.max(1, Number(options.maxRepeatCommands) || DEFAULT_MAX_REPEAT_COMMANDS);
    this.maxDelaySeconds = Math.max(0.01, Number(options.maxDelaySeconds) || DEFAULT_MAX_DELAY_SECONDS);
    this.maxPendingDelays = Math.max(1, Number(options.maxPendingDelays) || DEFAULT_MAX_PENDING_DELAYS);
    this.maxLoopIterations = Math.max(1, Number(options.maxLoopIterations) || DEFAULT_MAX_LOOP_ITERATIONS);
    this.maxWhileIterations = Math.max(1, Number(options.maxWhileIterations) || DEFAULT_MAX_WHILE_ITERATIONS);
    this.maxLuaExecutionDepth = Math.max(1, Number(options.maxLuaExecutionDepth) || DEFAULT_MAX_LUA_EXECUTION_DEPTH);
    this.maxLuaAutomations = Math.max(1, Number(options.maxLuaAutomations) || DEFAULT_MAX_LUA_AUTOMATIONS);
    this.maxLuaCallbacksPerSecond = Math.max(8, Number(options.maxLuaCallbacksPerSecond) || DEFAULT_MAX_LUA_CALLBACKS_PER_SECOND);
    this.maxCommandLineCommands = Math.max(
      1,
      Number(options.maxCommandLineCommands) || DEFAULT_MAX_COMMAND_LINE_COMMANDS
    );
    this.delaySetTimer = options.delaySetTimer || setTimeout;
    this.delayClearTimer = options.delayClearTimer || clearTimeout;
    this.tickerSetTimer = options.tickerSetTimer || this.delaySetTimer;
    this.tickerClearTimer = options.tickerClearTimer || this.delayClearTimer;
    this.maxTickers = Math.max(1, Number(options.maxTickers) || DEFAULT_MAX_TICKERS);
    this.actionLineOptions = options.actionLineOptions || {};
    this.actionRateOptions = options.actionRateOptions || {};
    this.gagLineOptions = options.gagLineOptions || {};
  }

  createTinTinContext(options = {}) {
    const context = {
      aliasEngine: options.aliasEngine || new AliasEngine({
        ...(options.aliasOptions || {}),
        commandPrefix: this.commandPrefix
      }),
      variableEngine: options.variableEngine || new VariableEngine(options.variableOptions),
      functionEngine: options.functionEngine || new FunctionEngine(options.functionOptions),
      actionEngine: options.actionEngine || new ActionEngine({ ...(options.actionOptions || {}), commandPrefix: this.commandPrefix }),
      gagEngine: options.gagEngine || new GagEngine(options.gagOptions),
      highlightEngine: options.highlightEngine || new HighlightEngine(options.highlightOptions),
      substituteEngine: options.substituteEngine || new SubstituteEngine(options.substituteOptions),
      macroEngine: options.macroEngine || new MacroEngine({
        macros: options.macros,
        ...(options.macroOptions || {}),
        commandPrefix: this.commandPrefix
      }),
      tabEngine: options.tabEngine || new TabEngine({ tabs: options.tabs, ...(options.tabOptions || {}) }),
      classManager: options.classManager || new ClassManager({ classes: options.classes }),
      eventEngine: options.eventEngine || new EventEngine({ events: options.events }),
      config: {
        logMode: ['plain', 'raw'].includes(String(options.config?.logMode || '').toLowerCase()) ? String(options.config.logMode).toLowerCase() : 'plain',
        commandEcho: options.config?.commandEcho === true,
        autoTab: Number.isSafeInteger(Number(options.config?.autoTab)) && Number(options.config.autoTab) >= 1 && Number(options.config.autoTab) <= 999999 ? Number(options.config.autoTab) : DEFAULT_TINTIN_AUTO_TAB,
        verbatim: options.config?.verbatim === true,
        repeatChar: [...String(options.config?.repeatChar || '!')][0] || '!',
        repeatEnter: options.config?.repeatEnter === true,
        verbatimChar: [...String(options.config?.verbatimChar || '\\')][0] || '\\',
        historySize: Number.isSafeInteger(Number(options.config?.historySize)) && Number(options.config.historySize) >= 0 && Number(options.config.historySize) <= 9999 ? Number(options.config.historySize) : DEFAULT_MAX_TINTIN_HISTORY,
        bufferSize: Number.isSafeInteger(Number(options.config?.bufferSize)) && Number(options.config.bufferSize) >= 100 && Number(options.config.bufferSize) <= 100000 ? Number(options.config.bufferSize) : DEFAULT_MAX_TINTIN_OUTPUT_LINES
      },
      listControls: new Map(),
      // Read-only protocol values are intentionally not part of the persistent
      // TinTin definition snapshot. They are refreshed from structured GMCP.
      protocolVariables: new Map(),
      speedwalkEnabled: options.speedwalkEnabled === undefined
        ? true
        : Boolean(options.speedwalkEnabled),
      profile: {
        requested: String(options.profile?.requested || '').trim().slice(0, 255),
        filename: String(options.profile?.filename || '').trim().slice(0, 255),
        loaded: options.profile?.loaded === true
      }
    };
    context.aliasEngine.setCommandPrefix?.(this.commandPrefix);
    context.actionEngine.setCommandPrefix?.(this.commandPrefix);
    context.macroEngine.setCommandPrefix?.(this.commandPrefix);
    return context;
  }

  activeTinTinContext() {
    const stacked = this._tinTinContextStack.at(-1);
    if (stacked) return stacked;
    const active = this.sessions.get(this.activeSessionId);
    return active?.tintin || this._seedTinTinContext;
  }

  get aliasEngine() { return this.activeTinTinContext().aliasEngine; }
  get variableEngine() { return this.activeTinTinContext().variableEngine; }
  get functionEngine() { return this.activeTinTinContext().functionEngine; }
  get actionEngine() { return this.activeTinTinContext().actionEngine; }
  get gagEngine() { return this.activeTinTinContext().gagEngine; }
  get highlightEngine() { return this.activeTinTinContext().highlightEngine; }
  get substituteEngine() { return this.activeTinTinContext().substituteEngine; }
  get macroEngine() { return this.activeTinTinContext().macroEngine; }
  get tabEngine() { return this.activeTinTinContext().tabEngine; }
  get classManager() { return this.activeTinTinContext().classManager; }
  get eventEngine() { return this.activeTinTinContext().eventEngine; }
  get tintinConfig() { return this.activeTinTinContext().config; }
  get speedwalkEnabled() { return this.activeTinTinContext().speedwalkEnabled; }
  set speedwalkEnabled(value) { this.activeTinTinContext().speedwalkEnabled = Boolean(value); }

  withTinTinContext(context, callback) {
    if (!context || typeof callback !== 'function') return callback?.();
    this._tinTinContextStack.push(context);
    try {
      return callback();
    } finally {
      this._tinTinContextStack.pop();
    }
  }

  withTinTinSession(reference, callback) {
    const session = reference && typeof reference === 'object'
      ? reference
      : this.findSession(reference);
    if (!session?.tintin) return callback?.();
    return this.withTinTinContext(session.tintin, callback);
  }

  sessionForActiveTinTinContext() {
    const context = this.activeTinTinContext();
    for (const session of this.sessions.values()) {
      if (session.tintin === context) return session;
    }
    return null;
  }

  tinTinSnapshotToken(contextValue) {
    const context = contextValue || this.activeTinTinContext();
    const config = context?.config || {};
    const profile = context?.profile || {};
    return [
      Number(context?.aliasEngine?.revision) || 0,
      Number(context?.variableEngine?.revision) || 0,
      Number(context?.functionEngine?.revision) || 0,
      Number(context?.actionEngine?.revision) || 0, context?.actionEngine?.enabled !== false,
      Number(context?.gagEngine?.revision) || 0, context?.gagEngine?.enabled !== false,
      Number(context?.highlightEngine?.revision) || 0, context?.highlightEngine?.enabled !== false,
      Number(context?.substituteEngine?.revision) || 0, context?.substituteEngine?.enabled !== false,
      Number(context?.macroEngine?.revision) || 0, context?.macroEngine?.enabled !== false,
      Number(context?.tabEngine?.revision) || 0,
      Number(context?.classManager?.revision) || 0, String(context?.classManager?.activeName || ''),
      Number(context?.eventEngine?.revision) || 0, context?.eventEngine?.enabled !== false,
      String(config.logMode || ''), config.commandEcho === true, Number(config.autoTab) || 0,
      config.verbatim === true, String(config.repeatChar || ''), config.repeatEnter === true,
      String(config.verbatimChar || ''), Number(config.historySize) || 0, Number(config.bufferSize) || 0,
      context?.speedwalkEnabled === true,
      String(profile.requested || ''), String(profile.filename || ''), profile.loaded === true
    ];
  }

  tinTinSnapshotTokenMatches(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (let index = 0; index < left.length; index += 1) {
      if (left[index] !== right[index]) return false;
    }
    return true;
  }

  rendererSyncToken() {
    const token = [this.commandPrefix, this.activeSessionId, this._sessionListRevision];
    for (const session of this.sessions.values()) {
      token.push(session.id, ...this.tinTinSnapshotToken(session.tintin));
    }
    return token;
  }

  rendererSyncTokenMatches(left, right) {
    return this.tinTinSnapshotTokenMatches(left, right);
  }

  dispatchInputForRenderer(sourceReference, rawCommand) {
    const before = this.rendererSyncToken();
    const result = this.dispatchInput(sourceReference, rawCommand);
    if (result?.snapshot && this.rendererSyncTokenMatches(before, this.rendererSyncToken())) {
      result.snapshot = null;
    }
    return result;
  }

  snapshotTinTinContext(contextValue) {
    const context = contextValue || this.activeTinTinContext();
    const token = this.tinTinSnapshotToken(context);
    const cached = this._tinTinSnapshotCache.get(context);
    if (cached && this.tinTinSnapshotTokenMatches(cached.token, token)) return cached.snapshot;

    const snapshot = this.withTinTinContext(context, () => ({
      aliases: this.aliasEngine.list(),
      variables: this.variableEngine.list(),
      functions: this.functionEngine.list(),
      actions: this.actionEngine.snapshot(),
      gags: this.gagEngine.snapshot(),
      highlights: this.highlightEngine.snapshot(),
      substitutes: this.substituteEngine.snapshot(),
      macros: this.macroEngine.snapshot(),
      tabs: this.tabEngine.list(),
      classes: this.classManager.snapshot(),
      events: this.eventEngine.snapshot(),
      config: { ...context.config },
      speedwalk: { enabled: this.speedwalkEnabled },
      profile: { ...context.profile }
    }));
    const immutableSnapshot = freezeSnapshotTree(snapshot);
    this._tinTinSnapshotCache.set(context, { token, snapshot: immutableSnapshot });
    return immutableSnapshot;
  }

  replaceTinTinContext(context, definitions = {}) {
    return this.withTinTinContext(context, () => {
      if (Object.hasOwn(definitions, 'classes')) this.classManager.restore(definitions.classes);
      if (Object.hasOwn(definitions, 'aliases')) this.aliasEngine.replaceAll(definitions.aliases);
      if (Object.hasOwn(definitions, 'variables')) this.variableEngine.replaceAll(definitions.variables);
      if (Object.hasOwn(definitions, 'functions')) this.functionEngine.replaceAll(definitions.functions);
      if (Object.hasOwn(definitions, 'actions')) this.actionEngine.restore(definitions.actions);
      if (Object.hasOwn(definitions, 'gags')) this.gagEngine.restore(definitions.gags);
      if (Object.hasOwn(definitions, 'highlights')) this.highlightEngine.restore(definitions.highlights);
      if (Object.hasOwn(definitions, 'substitutes')) this.substituteEngine.restore(definitions.substitutes);
      if (Object.hasOwn(definitions, 'macros')) this.macroEngine.restore(definitions.macros);
      if (Object.hasOwn(definitions, 'tabs')) this.tabEngine.replaceAll(definitions.tabs);
      if (Object.hasOwn(definitions, 'events')) this.eventEngine.restore(definitions.events);
      if (Object.hasOwn(definitions, 'config')) {
        const mode = String(definitions.config?.logMode || '').toLowerCase();
        context.config = {
          logMode: ['plain', 'raw'].includes(mode) ? mode : 'plain',
          commandEcho: definitions.config?.commandEcho === true,
          autoTab: Number.isSafeInteger(Number(definitions.config?.autoTab)) && Number(definitions.config.autoTab) >= 1 && Number(definitions.config.autoTab) <= 999999 ? Number(definitions.config.autoTab) : DEFAULT_TINTIN_AUTO_TAB,
          verbatim: definitions.config?.verbatim === true,
          repeatChar: [...String(definitions.config?.repeatChar || '!')][0] || '!',
          repeatEnter: definitions.config?.repeatEnter === true,
          verbatimChar: [...String(definitions.config?.verbatimChar || '\\')][0] || '\\',
          historySize: Number.isSafeInteger(Number(definitions.config?.historySize)) && Number(definitions.config.historySize) >= 0 && Number(definitions.config.historySize) <= 9999 ? Number(definitions.config.historySize) : DEFAULT_MAX_TINTIN_HISTORY,
          bufferSize: Number.isSafeInteger(Number(definitions.config?.bufferSize)) && Number(definitions.config.bufferSize) >= 100 && Number(definitions.config.bufferSize) <= 100000 ? Number(definitions.config.bufferSize) : DEFAULT_MAX_TINTIN_OUTPUT_LINES
        };
      }
      if (Object.hasOwn(definitions, 'speedwalk')) {
        const speedwalk = definitions.speedwalk;
        this.speedwalkEnabled = typeof speedwalk === 'object'
          ? speedwalk?.enabled === true
          : speedwalk === true;
      }
      if (Object.hasOwn(definitions, 'profile')) {
        context.profile = {
          requested: String(definitions.profile?.requested || '').trim().slice(0, 255),
          filename: String(definitions.profile?.filename || '').trim().slice(0, 255),
          loaded: definitions.profile?.loaded === true
        };
      }
      for (const record of [
        ...this.aliasEngine.list(),
        ...this.variableEngine.list(),
        ...this.functionEngine.list(),
        ...this.actionEngine.list(),
        ...this.gagEngine.list(),
        ...this.highlightEngine.list(),
        ...this.substituteEngine.list(),
        ...this.macroEngine.list(),
        ...this.tabEngine.list(),
        ...this.eventEngine.list()
      ]) {
        if (record.className) this.classManager.ensure(record.className);
      }
      return this.snapshotTinTinContext(context);
    });
  }

  setStartupTinTinTemplate(definitionsValue = null) {
    if (!definitionsValue || typeof definitionsValue !== 'object') {
      this._startupTinTinTemplate = null;
      return null;
    }
    const isolated = this.createTinTinContext();
    this.replaceTinTinContext(isolated, startupTemplateDefinitions(definitionsValue));
    const snapshot = { ...this.snapshotTinTinContext(isolated) };
    snapshot.profile = { requested: '', filename: '', loaded: false };
    this._startupTinTinTemplate = snapshot;
    return startupTemplateDefinitions(snapshot);
  }

  startupTinTinTemplate() {
    return this._startupTinTinTemplate
      ? startupTemplateDefinitions(this._startupTinTinTemplate)
      : null;
  }

  applyStartupTinTinTemplate(context) {
    if (!context || !this._startupTinTinTemplate) return false;
    this.replaceTinTinContext(context, this._startupTinTinTemplate);
    context.profile = { requested: '', filename: '', loaded: false };
    return true;
  }

  setCommandPrefix(value) {
    this.commandPrefix = normalizeClientCommandPrefix(value, this.commandPrefix);
    const contexts = new Set([this._seedTinTinContext]);
    for (const session of this.sessions.values()) contexts.add(session.tintin);
    for (const context of contexts) {
      context?.aliasEngine?.setCommandPrefix?.(this.commandPrefix);
      context?.actionEngine?.setCommandPrefix?.(this.commandPrefix);
      context?.macroEngine?.setCommandPrefix?.(this.commandPrefix);
    }
    return this.commandPrefix;
  }

  clientCommand(body = '') {
    return `${this.commandPrefix}${String(body || '')}`;
  }

  usage(body) {
    return `Usage: ${this.clientCommand(body)}`;
  }

  emit(sessionId, type, payload) {
    this.handlers.onEvent?.({ sessionId, type, payload });
  }

  tracePipeline(session, stage, messageValue, options = {}) {
    if (!session?.pipelineDebug?.enabled && options.force !== true) return null;
    const message = session?.secureInput
      ? 'Secure input active; command and server details redacted.'
      : (typeof messageValue === 'function' ? messageValue() : messageValue);
    const entry = session?.pipelineDebug?.append(stage, message, options);
    if (!entry) return null;
    this.emit(session.id, 'pipeline-debug', {
      type: 'entry',
      entry,
      status: session.pipelineDebug.status()
    });
    return entry;
  }

  pipelineDebugSnapshot(reference) {
    const session = this.findSession(reference);
    return session?.pipelineDebug?.snapshot() || null;
  }

  setPipelineDebug(reference, settings = {}) {
    const session = this.findSession(reference);
    if (!session) return null;
    const previousEnabled = session.pipelineDebug.enabled;
    const status = session.pipelineDebug.configure(settings);
    if (status.enabled && !previousEnabled) {
      this.tracePipeline(session, 'state', 'Pipeline debug enabled for this session.', { force: true });
    } else if (!status.enabled && previousEnabled) {
      const entry = session.pipelineDebug.append('state', 'Pipeline debug disabled for this session.', { force: true });
      if (entry) this.emit(session.id, 'pipeline-debug', { type: 'entry', entry, status: session.pipelineDebug.status() });
    }
    this.emit(session.id, 'pipeline-debug', {
      type: 'state',
      status: session.pipelineDebug.status()
    });
    this.emitSessionList();
    return session.pipelineDebug.snapshot();
  }

  clearPipelineDebug(reference) {
    const session = this.findSession(reference);
    if (!session) return null;
    const cleared = session.pipelineDebug.clear();
    this.emit(session.id, 'pipeline-debug', {
      type: 'clear',
      cleared,
      status: session.pipelineDebug.status()
    });
    this.emitSessionList();
    return session.pipelineDebug.snapshot();
  }

  sanitizeLogText(value, mode = 'plain') {
    const text = String(value ?? '');
    return String(mode || 'plain').toLowerCase() === 'raw'
      ? text
      : text.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/gu, '').replace(/\x1b\[[0-?]*[ -\/]*[@-~]/gu, '');
  }

  writeSessionLog(session, value) {
    if (!session?.logging?.active || !session.logging.filename) return false;
    const text = this.sanitizeLogText(value, session.logging.mode);
    if (!text) return false;
    const writer = this.handlers.onLogAppend;
    if (typeof writer !== 'function') return false;
    Promise.resolve(writer({ sessionId: session.id, filename: session.logging.filename, text }))
      .then((result) => {
        if (result?.ok === false) {
          session.logging.active = false;
          this.emit(session.id, 'error', `Logging stopped: ${result.error || 'log write failed'}`);
        }
      })
      .catch((error) => {
        session.logging.active = false;
        this.emit(session.id, 'error', `Logging stopped: ${error?.message || error}`);
      });
    return true;
  }

  emitSnoopText(target, value) {
    const text = String(value ?? '');
    if (!target || !text) return 0;
    let count = 0;
    for (const watcher of this.sessions.values()) {
      if (!watcher.snoops?.has(target.id)) continue;
      const prefixed = text.split(/(?<=\n)/u).map((line) => line ? `[${target.name}] ${line}` : '').join('');
      if (prefixed) {
        this.emit(watcher.id, 'local-text', prefixed);
        count += 1;
      }
    }
    return count;
  }

  clearSecondEventTimer(session) {
    if (!session?.secondEventTimer) return false;
    this.tickerClearTimer(session.secondEventTimer);
    session.secondEventTimer = null;
    return true;
  }

  tinTinClockParts(nowValue = new Date()) {
    const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
    const pad = (value, size = 2) => String(value).padStart(size, '0');
    const year = now.getFullYear();
    const start = new Date(year, 0, 1);
    const dayIndex = Math.floor((new Date(year, now.getMonth(), now.getDate()) - start) / 86_400_000);
    const firstMondayOffset = (8 - start.getDay()) % 7;
    const week = dayIndex < firstMondayOffset ? 0 : 1 + Math.floor((dayIndex - firstMondayOffset) / 7);
    return {
      year: pad(year, 4), month: pad(now.getMonth() + 1), week: pad(week), day: pad(now.getDate()),
      hour: pad(now.getHours()), minute: pad(now.getMinutes()), second: pad(now.getSeconds())
    };
  }

  fireTinTinClockEvents(session, nowValue = new Date()) {
    if (!session) return 0;
    const now = this.tinTinClockParts(nowValue);
    const previous = session.tintinClockState || null;
    session.tintinClockState = { ...now };
    const args = [now.year, now.month, now.week, now.day, now.hour, now.minute, now.second];
    const events = [];
    const push = (name) => { if (name) events.push(name); };
    if (!previous || previous.year !== now.year) { push('YEAR'); push(`YEAR ${now.year}`); }
    if (!previous || previous.month !== now.month) { push('MONTH'); push(`MONTH ${now.month}`); }
    if (!previous || previous.week !== now.week) { push('WEEK'); push(`WEEK ${now.week}`); }
    if (!previous || previous.day !== now.day) {
      push(`DATE ${now.month}-${now.day}`); push('DAY'); push(`DAY ${now.day}`);
    }
    if (!previous || previous.hour !== now.hour) { push('HOUR'); push(`HOUR ${now.hour}`); }
    if (!previous || previous.minute !== now.minute) {
      push(`DATE ${now.month}-${now.day} ${now.hour}:${now.minute}`);
      push(`TIME ${now.hour}:${now.minute}`); push('MINUTE'); push(`MINUTE ${now.minute}`);
    }
    push(`TIME ${now.hour}:${now.minute}:${now.second}`); push('SECOND'); push(`SECOND ${now.second}`);
    let fired = 0;
    for (const eventName of events) {
      if (this.fireTinTinEvent(session, eventName, args).fired) fired += 1;
    }
    return fired;
  }

  syncSecondEventTimer(session) {
    if (!session) return;
    const hadTemporalTimer = Boolean(session.secondEventTimer);
    this.clearSecondEventTimer(session);
    const temporal = /^(?:SECOND|MINUTE|HOUR|DAY|WEEK|MONTH|YEAR|DATE|TIME)(?: |$)/u;
    const hasTemporalEvent = this.withTinTinSession(session, () => this.eventEngine.list().some((record) => record.enabled !== false && temporal.test(record.name)));
    if (!hasTemporalEvent) {
      session.tintinClockState = null;
      return;
    }
    // TinTin keeps its clock baseline current independently of Event definitions.
    // Prime when a temporal timer first becomes active (including reconnect), but
    // preserve the baseline when an already-running temporal Event set is edited.
    if (!hadTemporalTimer || !session.tintinClockState) {
      session.tintinClockState = this.tinTinClockParts(new Date());
    }
    const arm = () => {
      session.secondEventTimer = this.tickerSetTimer(() => {
        session.secondEventTimer = null;
        if (this.sessions.get(session.id) !== session) return;
        this.fireTinTinClockEvents(session, new Date());
        const keep = this.withTinTinSession(session, () => this.eventEngine.list().some((record) => record.enabled !== false && temporal.test(record.name)));
        if (keep) arm();
      }, 1000);
    };
    arm();
  }

  fireTinTinEvent(session, eventNameValue, argumentsValue = [], options = {}) {
    if (!session || Number(options.eventDepth || 0) >= 8) return { fired: false, deliveries: [], messages: [] };
    const luaFired = options.skipLua === true ? 0 : this.fireLuaEventHandlers(session, String(eventNameValue || ''), argumentsValue);
    const matched = this.withTinTinSession(session, () => this.eventEngine.match(eventNameValue));
    const record = matched?.record;
    if (!record?.enabled) return { fired: luaFired > 0, deliveries: [], messages: [] };
    const args = Array.isArray(argumentsValue) ? argumentsValue.map((value) => String(value ?? '')) : [];
    const captures = { ...(matched?.captures || {}) };
    // TinTin's native Event variables are zero-based (%0, %1, ...), but a
    // large body of veteran NukeFire scripts was authored with %1 as the
    // first value. Preserve both conventions without duplicating %0/%1 when
    // a source-style Event genuinely uses them together: the presence of %0
    // opts that Event body into authentic zero-based argument numbering.
    const sourceStyleZeroBased = /(^|[^%])%0(?![0-9])/u.test(String(record.command || '').replace(/%%/gu, ''));
    if (sourceStyleZeroBased) {
      for (let index = 0; index < Math.min(100, args.length); index += 1) {
        if (!Object.prototype.hasOwnProperty.call(captures, index)) captures[index] = args[index];
      }
    } else {
      if (args.length > 0 && !Object.prototype.hasOwnProperty.call(captures, 0)) captures[0] = args[0];
      for (let index = 0; index < Math.min(99, args.length); index += 1) {
        const oneBased = index + 1;
        if (!Object.prototype.hasOwnProperty.call(captures, oneBased)) captures[oneBased] = args[index];
      }
    }
    const matchedText = String(matched?.matchedText || eventNameValue || '');
    const commands = substituteActionCommand(record.command, args[0] || matchedText, captures).replace(/%\*/gu, args.join(' '));
    const parsedCommands = splitTopLevelCommands(commands, { maxCommands: 64, preserveEscapedSemicolon: true, commandPrefix: this.commandPrefix });
    if (parsedCommands.error) {
      return {
        fired: false,
        deliveries: [],
        messages: [{ kind: 'error', text: `${this.clientCommand(`event {${record.name}}`)}: ${parsedCommands.error}` }]
      };
    }
    const eventLocals = new Map();
    const existingSessionVariable = this.withTinTinSession(session, () => this.variableEngine.get('session'));
    if (!existingSessionVariable) eventLocals.set('session', session.name);
    const result = this.dispatchCommandSequence(session, parsedCommands.commands, {
      eventGenerated: true,
      eventDepth: Number(options.eventDepth || 0) + 1,
      eventLocals
    });
    this.emitActionResult(session, { pattern: this.clientCommand(`event {${record.name}}`), command: commands, deliveries: result.deliveries, messages: result.messages });
    return { fired: true, ...result };
  }

  appendTinTinOutputHistory(session, lineValue) {
    if (!session) return;
    const line = String(lineValue ?? '').replace(/\r?\n$/u, '');
    session.tintinOutputHistory ||= [];
    session.tintinOutputHistory.push(line);
    const limit = Number.isSafeInteger(Number(session.tintin?.config?.bufferSize)) ? Number(session.tintin.config.bufferSize) : DEFAULT_MAX_TINTIN_OUTPUT_LINES;
    if (session.tintinOutputHistory.length > limit) {
      session.tintinOutputHistory.splice(0, session.tintinOutputHistory.length - limit);
    }
  }

  appendTinTinCommandHistory(session, commandValue) {
    if (!session) return;
    const command = String(commandValue ?? '').replace(/[\r\n]+$/u, '');
    if (!command) return;
    session.tintinCommandHistory ||= [];
    const limit = Number.isSafeInteger(Number(session.tintin?.config?.historySize)) ? Number(session.tintin.config.historySize) : DEFAULT_MAX_TINTIN_HISTORY;
    if (limit <= 0) {
      session.tintinCommandHistory.length = 0;
      return;
    }
    // TinTin's LIST_HISTORY uses APPEND mode. update_node_list() therefore
    // removes an existing identical command before appending it again, keeping
    // one copy at the newest edge instead of accumulating duplicates.
    const duplicate = session.tintinCommandHistory.indexOf(command);
    if (duplicate !== -1) session.tintinCommandHistory.splice(duplicate, 1);
    session.tintinCommandHistory.push(command);
    if (session.tintinCommandHistory.length > limit) {
      session.tintinCommandHistory.splice(0, session.tintinCommandHistory.length - limit);
    }
  }

  consumePendingTinTinLineLog(session, lineValue) {
    const pending = session?.pendingTinTinLineLog;
    if (!pending?.filename) return false;
    // TinTin consumes #LINE LOG's armed file on exactly one completed incoming
    // line. Clear first so a writer failure cannot accidentally log later
    // output as well.
    session.pendingTinTinLineLog = null;
    const writer = this.handlers.onLogAppend;
    if (typeof writer !== 'function') {
      this.emit(session.id, 'error', 'Line Log storage is not available.');
      return false;
    }
    const text = `${String(lineValue ?? '').replace(/\r?\n$/u, '')}\n`;
    Promise.resolve(writer({ sessionId: session.id, filename: pending.filename, text }))
      .catch((error) => this.emit(session.id, 'error', `Line Log failed: ${error?.message || error}`));
    return true;
  }

  handleHistoryCommand(tokens, source, options = {}) {
    const operation = resolveTinTinOrderedAbbreviation(tokens[0], TINTIN_HISTORY_SUBCOMMANDS);
    const history = source.tintinCommandHistory ||= [];
    if (!operation) {
      return ['TinTin HISTORY commands: DELETE, INSERT, LIST, READ, WRITE.'];
    }
    if (operation === 'list') {
      return history.length
        ? history.map((command, index) => `${String(index + 1).padStart(6, ' ')} - ${command}`)
        : ['TinTin command history is empty.'];
    }
    if (operation === 'delete') {
      const removed = history.pop();
      return [removed !== undefined ? `Deleted history entry: ${removed}` : 'TinTin command history is empty.'];
    }
    if (operation === 'insert') {
      if (tokens.length < 2) return [this.usage('history insert {command}')];
      const expanded = this.expandFunctionAndVariables(tokens.slice(1).join(' '), source, options);
      if (expanded.error) return [expanded.error];
      const repeatChar = [...String(source.tintin?.config?.repeatChar || '!')][0] || '!';
      let command = String(expanded.value || '');
      const messages = [];
      if (command.startsWith(repeatChar)) {
        const prefix = command.slice(repeatChar.length);
        const match = [...history].reverse().find((entry) => String(entry || '').startsWith(prefix));
        if (match !== undefined) command = String(match);
        else messages.push(`#REPEAT: NO MATCH FOUND FOR '${command}'`);
      }
      this.appendTinTinCommandHistory(source, command);
      messages.push(`Inserted history entry: ${command}`);
      return messages;
    }
    if (operation === 'read' || operation === 'write') {
      if (tokens.length !== 2) return [this.usage(`history ${operation} {filename}`)];
      const expanded = options.variablesExpanded
        ? { value: tokens[1], error: '' }
        : this.expandFunctionAndVariables(tokens[1], source, options);
      if (expanded.error) return [expanded.error];
      const requested = normalizeLegacyTinTinScriptRequest(expanded.value);
      if (!requested) return ['History files must use a safe basename inside the NukeFire Scripts folder.'];
      if (operation === 'read') {
        const reader = this.handlers.onTinTinTextRead;
        if (typeof reader !== 'function') return ['History READ is unavailable because protected TinTin text storage is not ready.'];
        Promise.resolve(reader({ sessionId: source.id, requested })).then((response) => {
          if (!response?.ok) {
            this.emitLocalEcho(source, `#HISTORY: ${response?.error || `could not read ${requested}.`}`);
            return;
          }
          const lines = String(response.content || '').replace(/\r\n?/gu, '\n').split('\n').filter((line) => line.length > 0).slice(-Math.max(0, Number(source.tintin?.config?.historySize ?? DEFAULT_MAX_TINTIN_HISTORY)));
          source.tintinCommandHistory = lines;
          this.emitLocalEcho(source, `#HISTORY: READ ${lines.length} entr${lines.length === 1 ? 'y' : 'ies'} from ${response.filename || requested}.`);
        }).catch((error) => this.emitLocalEcho(source, `#HISTORY: ${error?.message || error}`));
        return [`History read requested from ${requested} in the protected NukeFire Scripts folder.`];
      }
      if (!history.length) return ['TinTin command history is empty; nothing was written.'];
      const writer = this.handlers.onTinTinTextWrite;
      if (typeof writer !== 'function') return ['History WRITE is unavailable because protected TinTin text storage is not ready.'];
      const content = `${history.join('\n')}\n`;
      Promise.resolve(writer({ sessionId: source.id, requested, content })).then((response) => {
        this.emitLocalEcho(source, response?.ok
          ? `#HISTORY: WROTE ${history.length} entr${history.length === 1 ? 'y' : 'ies'} to ${response.filename || requested}.`
          : `#HISTORY: ${response?.error || `could not write ${requested}.`}`);
      }).catch((error) => this.emitLocalEcho(source, `#HISTORY: ${error?.message || error}`));
      return [`History write requested to ${requested} in the protected NukeFire Scripts folder.`];
    }
    return ['TinTin HISTORY commands: DELETE, INSERT, LIST, READ, WRITE.'];
  }

  compileTinTinSearchPattern(patternValue, source, options = {}) {
    const expanded = options.variablesExpanded
      ? { value: String(patternValue || ''), error: '' }
      : this.expandFunctionAndVariables(patternValue, source, options);
    if (expanded.error) return { regex: null, pattern: '', error: expanded.error };
    const pattern = String(expanded.value || '').trim();
    const compiled = compileTinTinRegexp(pattern);
    if (compiled.error) return { regex: null, pattern, error: compiled.error.replace(/^TinTin REGEXP/u, 'TinTin search') };
    return { regex: compiled.regex, pattern, error: '' };
  }

  handleGrepCommand(tokens, source, options = {}) {
    if (!tokens.length) return [this.usage('grep [page] {expression}')];
    let page = 1;
    let patternTokens = tokens;
    if (/^-?\d+$/u.test(String(tokens[0] || '').trim()) && tokens.length > 1) {
      page = Number(tokens[0]);
      patternTokens = tokens.slice(1);
    }
    if (!Number.isSafeInteger(page) || page === 0 || Math.abs(page) > 1000) return [this.usage('grep [page] {expression}')];
    const compiled = this.compileTinTinSearchPattern(patternTokens.join(' '), source, options);
    if (compiled.error) return [compiled.error];
    const history = source.tintinOutputHistory || [];
    const matches = history.filter((line) => compiled.regex.test(stripTerminalSequences(line)));
    if (!matches.length) return [`#GREP: no matches for ${compiled.pattern}.`];
    const pageSize = Math.max(1, Math.min(200, Number(source.terminalSize?.height || 40) - 2));
    const ordered = page > 0 ? [...matches].reverse() : [...matches];
    const offset = (Math.abs(page) - 1) * pageSize;
    // TinTin selects positive pages from the live/newest edge, then prints the
    // selected page back in normal chronological order. Negative pages already
    // walk from the oldest edge and therefore need no reversal for display.
    const selected = page > 0
      ? ordered.slice(offset, offset + pageSize).reverse()
      : ordered.slice(offset, offset + pageSize);
    if (!selected.length) return [`#GREP: page ${page} has no matches for ${compiled.pattern}.`];
    return [`#GREP page ${page} for ${compiled.pattern}:`, ...selected];
  }

  bufferLineAt(source, offsetValue) {
    const lines = source.tintinOutputHistory || [];
    const offset = Number(offsetValue);
    // TinTin's scroll_row points immediately before the newest retained line,
    // so BUFFER GET {var} {1} addresses the newest line, {2} the next older,
    // and so on. Offset zero/future/out-of-range slots read as an empty value.
    if (!Number.isSafeInteger(offset) || offset < 1 || offset > lines.length) return '';
    return String(lines[lines.length - offset] || '');
  }

  handleBufferCommand(tokens, source, options = {}) {
    const operation = resolveTinTinOrderedAbbreviation(tokens[0], TINTIN_BUFFER_SUBCOMMANDS);
    const lines = source.tintinOutputHistory ||= [];
    if (!operation) return ['TinTin BUFFER commands: CLEAR, FIND, GET, INFO, WRITE. UP/DOWN/HOME/END are owned by NukeFire terminal scrollback.'];
    if (operation === 'info') return [`TinTin review buffer: ${lines.length} line${lines.length === 1 ? '' : 's'} retained of ${Number(source.tintin?.config?.bufferSize ?? DEFAULT_MAX_TINTIN_OUTPUT_LINES)}.`];
    if (operation === 'clear') {
      const count = lines.length;
      lines.length = 0;
      return [`Cleared ${count} TinTin review-buffer line${count === 1 ? '' : 's'}; NukeFire's visible terminal history remains under native review controls.`];
    }
    if (operation === 'find') {
      if (tokens.length < 2) return [this.usage('buffer find [occurrence] {expression}')];
      let occurrence = 1;
      let patternTokens = tokens.slice(1);
      if (/^-?\d+$/u.test(String(tokens[1] || '').trim()) && tokens.length > 2) {
        occurrence = Number(tokens[1]);
        patternTokens = tokens.slice(2);
      }
      const compiled = this.compileTinTinSearchPattern(patternTokens.join(' '), source, options);
      if (compiled.error) return [compiled.error];
      const matches = lines.map((line, index) => ({ line, index })).filter((entry) => compiled.regex.test(stripTerminalSequences(entry.line)));
      if (!matches.length) return ['#BUFFER FIND: no matches found.'];
      // TinTin's circular buffer searches positive occurrences from the live
      // edge (newest -> oldest) and negative occurrences from the far edge
      // (oldest -> newest).
      const chosen = occurrence < 0
        ? matches.at(Math.max(0, Math.abs(occurrence) - 1))
        : [...matches].reverse().at(Math.max(0, occurrence - 1));
      if (!chosen) return [`#BUFFER FIND: occurrence ${occurrence} was not found.`];
      this.emit(source.id, 'review-find-request', { lineIndex: chosen.index, text: chosen.line, pattern: compiled.pattern });
      return [`#BUFFER FIND ${occurrence}: ${chosen.line}`];
    }
    if (operation === 'get') {
      if (tokens.length < 3 || tokens.length > 4) return [this.usage('buffer get {variable} {lower bound} [upper bound]')];
      const variable = normalizeVariableName(tokens[1]);
      const lower = Number(tokens[2]);
      const upper = tokens[3] === undefined ? null : Number(tokens[3]);
      if (!variable || !Number.isSafeInteger(lower) || (upper !== null && !Number.isSafeInteger(upper))) return [this.usage('buffer get {variable} {lower bound} [upper bound]')];
      if (upper !== null) {
        const span = Math.abs(upper - lower) + 1;
        if (!Number.isSafeInteger(span) || span > DEFAULT_MAX_LIST_ITEMS) {
          return [`BUFFER GET ranges may contain at most ${DEFAULT_MAX_LIST_ITEMS} lines.`];
        }
      }
      if (upper === null) {
        const record = this.assignVariable(variable, this.bufferLineAt(source, lower), options);
        return [record ? `BUFFER GET stored ${record.name}.` : 'BUFFER GET could not store the requested line.'];
      }
      const snapshot = this.variableEngine.list();
      this.variableEngine.delete(variable);
      const step = lower <= upper ? 1 : -1;
      let count = 0;
      for (let cursor = lower; ; cursor += step) {
        count += 1;
        if (!this.variableEngine.define(`${variable}[${count}]`, this.bufferLineAt(source, cursor), this.variableAssignmentClass(variable))) {
          this.variableEngine.replaceAll(snapshot);
          return ['BUFFER GET could not store the requested range because the variable limit was reached.'];
        }
        if (cursor === upper) break;
      }
      return [`BUFFER GET stored ${count} line${count === 1 ? '' : 's'} in ${variable}.`];
    }
    if (operation === 'write') {
      if (tokens.length !== 2) return [this.usage('buffer write {filename}')];
      if (!lines.length) return ['TinTin review buffer is empty; nothing was written.'];
      const requested = normalizeLegacyTinTinScriptRequest(tokens[1]);
      if (!requested) return ['Buffer files must use a safe basename inside the NukeFire Scripts folder.'];
      const writer = this.handlers.onTinTinTextWrite;
      if (typeof writer !== 'function') return ['BUFFER WRITE is unavailable because protected TinTin text storage is not ready.'];
      const content = `${lines.join('\n')}\n`;
      Promise.resolve(writer({ sessionId: source.id, requested, content })).then((response) => {
        this.emitLocalEcho(source, response?.ok
          ? `#BUFFER: WROTE ${lines.length} line${lines.length === 1 ? '' : 's'} to ${response.filename || requested}.`
          : `#BUFFER: ${response?.error || `could not write ${requested}.`}`);
      }).catch((error) => this.emitLocalEcho(source, `#BUFFER: ${error?.message || error}`));
      return [`Buffer write requested to ${requested} in the protected NukeFire Scripts folder.`];
    }
    if (['up','down','home','end','lock'].includes(operation)) {
      this.emit(source.id, 'review-navigation-request', { operation });
      return [`BUFFER ${operation.toUpperCase()} translated to NukeFire's native terminal review controls.`];
    }
    return ['TinTin BUFFER commands: CLEAR, FIND, GET, INFO, WRITE. UP/DOWN/HOME/END are owned by NukeFire terminal scrollback.'];
  }

  setTinTinProtocolVariable(session, nameValue, valueValue) {
    if (!session?.tintin) return false;
    const name = normalizeVariableName(nameValue);
    if (!name) return false;
    const value = normalizeVariableValue(valueValue);
    const variables = session.tintin.protocolVariables instanceof Map
      ? session.tintin.protocolVariables
      : (session.tintin.protocolVariables = new Map());
    variables.set(name, value);
    return true;
  }

  syncTinTinProtocolVariables(session, message = {}) {
    if (!session?.tintin) return;
    const packageName = String(message?.packageName || '');
    const snapshot = message?.state && typeof message.state === 'object' ? message.state : null;
    const body = message?.body && typeof message.body === 'object' && !Array.isArray(message.body)
      ? message.body
      : null;
    const vitals = packageName === 'Char.Vitals' && body ? body : snapshot?.char?.vitals;
    const status = packageName === 'Char.Status' && body ? body : snapshot?.char?.status;

    const setPair = (legacyName, gmcpName, value) => {
      if (value === undefined || value === null) return;
      const legacyKey = normalizeVariableName(legacyName);
      const previous = session.tintin.protocolVariables instanceof Map
        ? session.tintin.protocolVariables.get(legacyKey)
        : undefined;
      this.setTinTinProtocolVariable(session, legacyName, value);
      this.setTinTinProtocolVariable(session, gmcpName, value);
      const next = normalizeVariableValue(value);
      if (previous !== next && legacyKey.startsWith('msdp_')) {
        const field = legacyKey.slice(5).toUpperCase();
        this.fireTinTinEvent(session, `IAC SB MSDP VAR ${field} VAL ${next} IAC SE`, [field, next], { protocolBridge: true });
      }
    };

    if (vitals && typeof vitals === 'object') {
      setPair('MSDP_HEALTH', 'GMCP_HEALTH', vitals.hp ?? vitals.health);
      setPair('MSDP_HEALTH_MAX', 'GMCP_HEALTH_MAX', vitals.mhp ?? vitals.maxhp ?? vitals.maxHp);
      setPair('MSDP_MANA', 'GMCP_MANA', vitals.mana ?? vitals.mp);
      setPair('MSDP_MANA_MAX', 'GMCP_MANA_MAX', vitals.mmana ?? vitals.maxmana ?? vitals.maxMana);
      setPair('MSDP_MOVEMENT', 'GMCP_MOVEMENT', vitals.move ?? vitals.moves ?? vitals.mv);
      setPair('MSDP_MOVEMENT_MAX', 'GMCP_MOVEMENT_MAX', vitals.mmove ?? vitals.maxmove ?? vitals.maxMove);
      const opponent = vitals.opponent && typeof vitals.opponent === 'object' ? vitals.opponent : null;
      if (opponent) {
        setPair('MSDP_OPPONENT_NAME', 'GMCP_OPPONENT_NAME', opponent.name);
        setPair('MSDP_OPPONENT_HEALTH', 'GMCP_OPPONENT_HEALTH', opponent.hp);
        setPair('MSDP_OPPONENT_HEALTH_MAX', 'GMCP_OPPONENT_HEALTH_MAX', opponent.mhp);
        setPair('MSDP_OPPONENT_LEVEL', 'GMCP_OPPONENT_LEVEL', opponent.level);
      }
    }

    if (status && typeof status === 'object') {
      setPair('MSDP_CHARACTER_NAME', 'GMCP_CHARACTER_NAME', status.name);
      setPair('MSDP_LEVEL', 'GMCP_LEVEL', status.level);
      setPair('MSDP_CLASS', 'GMCP_CLASS', status.class);
      setPair('MSDP_EXPERIENCE', 'GMCP_EXPERIENCE', status.exp);
      setPair('MSDP_ALIGNMENT', 'GMCP_ALIGNMENT', status.alignment);
      setPair('MSDP_MONEY', 'GMCP_MONEY', status.gold);
      const positionNumber = Number(status.position);
      if (Number.isFinite(positionNumber)) {
        const names = ['Dead', 'Stunned', 'Sleeping', 'Resting', 'Sitting', 'Fighting', 'Standing', 'Flying', 'Standing', 'Flying'];
        const position = names[Math.trunc(positionNumber)] || String(Math.trunc(positionNumber));
        setPair('MSDP_POSITION', 'GMCP_POSITION', position);
      }
    }
  }

  syncLuaMudletMsdp(session, packageNameValue = '') {
    if (!session) return 0;
    const packageName = String(packageNameValue || '');
    if (packageName && !['Char.Vitals', 'Char.Status', 'Char.MaxStats', 'Room.Info', 'NukeFire.Affects'].includes(packageName)) return 0;
    const snapshot = buildMudletMsdpSnapshot(this.getGmcpState(session.id)).snapshot;
    const previous = session.luaMudletMsdp && typeof session.luaMudletMsdp === 'object' ? session.luaMudletMsdp : {};
    session.luaMudletMsdp = snapshot;
    let fired = 0;
    for (const change of diffMudletMsdp(previous, snapshot)) {
      if (this.fireLuaEventHandlers(session, `msdp.${change.field}`, [change.value])) fired += 1;
    }
    return fired;
  }

  appendLuaVisibleOutput(session, textValue) {
    if (!session) return;
    const text = String(textValue ?? '').replace(/\r\n?/gu, '\n');
    if (!text) return;
    let combined = `${String(session.luaVisibleOutputCarry || '')}${text}`;
    const parts = combined.split('\n');
    const trailing = parts.pop() ?? '';
    session.luaVisibleOutputHistory ||= [];
    for (const rawLine of parts) {
      const line = stripTerminalSequences(String(rawLine || '')).slice(0, LUA_OUTPUT_LINE_MAX);
      const number = Math.max(1, Number(session.luaVisibleLineNumber) || 1);
      session.luaVisibleOutputHistory.push({ number, text: line });
      session.luaVisibleLineNumber = number + 1;
    }
    if (session.luaVisibleOutputHistory.length > LUA_OUTPUT_HISTORY_MAX) {
      session.luaVisibleOutputHistory.splice(0, session.luaVisibleOutputHistory.length - LUA_OUTPUT_HISTORY_MAX);
    }
    session.luaVisibleOutputCarry = stripTerminalSequences(trailing).slice(-LUA_OUTPUT_LINE_MAX);
  }

  luaOutputSnapshot(reference) {
    const session = typeof reference === 'object' && reference ? reference : this.findSession(reference);
    if (!session) return { currentLine: '', currentLineNumber: 1, firstLineNumber: 1, lines: [] };
    const retained = Array.isArray(session.luaVisibleOutputHistory) ? session.luaVisibleOutputHistory.slice(-LUA_OUTPUT_HISTORY_MAX) : [];
    const lines = [];
    let bytes = 0;
    for (let index = retained.length - 1; index >= 0; index -= 1) {
      const record = retained[index] || {};
      const text = String(record.text || '').slice(0, LUA_OUTPUT_LINE_MAX);
      const cost = Buffer.byteLength(text, 'utf8') + 16;
      if (bytes + cost > LUA_OUTPUT_SNAPSHOT_BYTES) break;
      lines.push({ number: Math.max(1, Math.trunc(Number(record.number) || 1)), text });
      bytes += cost;
    }
    lines.reverse();
    const currentLineNumber = Math.max(1, Math.trunc(Number(session.luaVisibleLineNumber) || 1));
    const currentLine = String(session.luaVisibleOutputCarry || '').slice(0, LUA_OUTPUT_LINE_MAX);
    return {
      currentLine,
      currentLineNumber,
      firstLineNumber: lines.length ? lines[0].number : currentLineNumber,
      lines
    };
  }

  setLuaCommandDraft(reference, value, options = {}) {
    const session = typeof reference === 'object' && reference ? reference : this.findSession(reference);
    if (!session) return { changed: false, text: '', reason: 'unknown-session' };
    const text = String(value ?? '').normalize('NFKC').replace(/[\r\n\u0000]/gu, '').slice(0, LUA_COMMAND_LINE_MAX);
    const changed = session.luaCommandDraft !== text;
    session.luaCommandDraft = text;
    if (options.emit === true && changed) this.emit(session.id, 'lua-command-line', { text });
    return { changed, text };
  }

  queueLuaSpeedwalk(reference, routeValue, options = {}) {
    const session = this.findSession(reference);
    if (!session) return { queued: false, steps: 0, reason: 'unknown-session' };
    if (session.status?.state !== 'connected') return { queued: false, steps: 0, reason: 'disconnected' };
    let route = String(routeValue ?? '').normalize('NFKC').trim();
    if (!route || route.length > 4096 || /[\r\n\u0000]/u.test(route)) return { queued: false, steps: 0, reason: 'invalid-route' };
    if (route.includes(';')) {
      const tokens = route.split(';').map((entry) => entry.trim().toLowerCase()).filter(Boolean);
      if (!tokens.length || tokens.some((entry) => !/^[neswud]$/u.test(entry))) return { queued: false, steps: 0, reason: 'unsupported-route' };
      route = tokens.join('');
    }
    const parsed = parseSpeedwalk(route, { maxSteps: this.maxSpeedwalkSteps });
    if (!parsed.matched || parsed.error || !parsed.steps.length) {
      return { queued: false, steps: 0, reason: parsed.error || 'unsupported-route' };
    }
    let steps = [...parsed.steps];
    if (options.backwards === true) {
      const reverse = { n: 's', s: 'n', e: 'w', w: 'e', u: 'd', d: 'u' };
      steps = steps.reverse().map((step) => reverse[step] || '');
      if (steps.some((step) => !step)) return { queued: false, steps: 0, reason: 'unsupported-reverse' };
    }
    const delay = Number(options.delay) || 0;
    if (delay <= 0) {
      const deliveries = this.queueSpeedwalk(session.id, steps, { show: options.show !== false });
      return { queued: deliveries.length === steps.length && deliveries.every((entry) => entry.queued), steps: steps.length, deliveries };
    }
    if (!Number.isFinite(delay) || delay < 0.01 || delay * steps.length > this.maxDelaySeconds) {
      return { queued: false, steps: 0, reason: 'delay-out-of-range' };
    }
    if (session.delays.size + steps.length > this.maxPendingDelays) {
      return { queued: false, steps: 0, reason: 'delay-limit' };
    }
    steps.forEach((command, index) => {
      const seconds = delay * (index + 1);
      let timer = null;
      timer = this.delaySetTimer(() => {
        session.delays.delete(timer);
        if (this.sessions.get(session.id) !== session) return;
        const delivery = this.queueCommand(session.id, command, { source: 'speedwalk' });
        if (delivery.queued && options.show !== false) this.emit(session.id, 'speedwalk-step', { command });
      }, Math.max(10, Math.round(seconds * 1000)));
      session.delays.set(timer, { name: '', seconds, commands: [command], luaSpeedwalk: true });
    });
    return { queued: true, steps: steps.length, delayed: true };
  }

  emitLocalDisplay(session, value) {
    const text = normalizeLocalDisplayText(value);
    if (!session || !text) return false;
    const line = `${text}\n`;
    this.appendLuaVisibleOutput(session, line);
    this.emit(session.id, 'local-text', line);
    if (!Number(session.lineIgnoreDepth || 0)) this.processActionsForText(session, line);
    return true;
  }

  emitLocalEcho(session, value) {
    if (!session) return false;
    const text = String(value ?? '');
    const line = `${text}\n`;
    this.appendLuaVisibleOutput(session, line);
    this.emit(session.id, 'local-text', line);
    return true;
  }

  uniqueId(seed = '') {
    const preferred = normalizeSessionId(seed);
    if (preferred && !this.sessions.has(preferred)) return preferred;
    while (this.sessions.has(`session-${this.nextSequence}`)) this.nextSequence += 1;
    return `session-${this.nextSequence++}`;
  }

  tinTinRoomNumber(messageValue) {
    const message = messageValue && typeof messageValue === 'object' ? messageValue : {};
    const body = message.packageName === 'Room.Info'
      ? message.body
      : message.state?.room?.info;
    if (!body || typeof body !== 'object') return '';
    for (const key of ['num', 'vnum', 'id', 'room']) {
      const value = Number(body[key]);
      if (Number.isSafeInteger(value) && value >= 0) return String(value);
    }
    return '';
  }

  syncTinTinMapEvents(session, messageValue) {
    if (!session) return 0;
    const room = this.tinTinRoomNumber(messageValue);
    if (!room) return 0;
    const previous = String(session.tintinMapRoomId || '');
    let fired = 0;
    if (!session.tintinMapActive) {
      session.tintinMapActive = true;
      if (this.fireTinTinEvent(session, 'MAP ENTER MAP', [room]).fired) fired += 1;
    }
    if (previous && previous !== room) {
      if (this.fireTinTinEvent(session, 'MAP EXIT ROOM', [previous, room]).fired) fired += 1;
      if (this.fireTinTinEvent(session, `MAP EXIT ROOM ${previous}`, [previous, room]).fired) fired += 1;
    }
    if (!previous || previous !== room) {
      if (this.fireTinTinEvent(session, 'MAP ENTER ROOM', [room, previous || '0']).fired) fired += 1;
      if (this.fireTinTinEvent(session, `MAP ENTER ROOM ${room}`, [room, previous || '0']).fired) fired += 1;
      session.tintinMapRoomId = room;
    }
    return fired;
  }

  leaveTinTinMap(session) {
    if (!session?.tintinMapActive) return false;
    const room = String(session.tintinMapRoomId || '0');
    session.tintinMapActive = false;
    session.tintinMapRoomId = '';
    this.fireTinTinEvent(session, 'MAP EXIT MAP', [room]);
    return true;
  }

  createSession(options = {}) {
    const id = this.uniqueId(options.id || options.name);
    const name = normalizeDisplayName(options.name, id);
    const role = normalizeRole(options.role);
    const host = normalizeHost(options.host);
    const port = normalizePort(options.port);
    let tintin;
    if (!this._seedTinTinContextClaimed && this.sessions.size === 0) {
      tintin = this._seedTinTinContext;
      this._seedTinTinContextClaimed = true;
    } else {
      tintin = this.createTinTinContext();
    }
    if (options.inheritStartup !== false) this.applyStartupTinTinTemplate(tintin);
    if (options.tintin && typeof options.tintin === 'object') {
      this.replaceTinTinContext(tintin, options.tintin);
    }
    const session = {
      id,
      name,
      role,
      host,
      port,
      characterName: '',
      status: { state: 'disconnected', message: 'Disconnected', host, port },
      terminalSize: { width: 120, height: 40 },
      preferences: { screenReaderMode: false, compressionEnabled: true },
      secureInput: false,
      pipelineDebug: new PipelineDebugBuffer(normalizePipelineDebugSettings(options.pipelineDebug)),
      actionLines: new ActionLineBuffer(this.actionLineOptions),
      actionLimiter: new ActionRateLimiter(this.actionRateOptions),
      gagLines: new GagLineFilter(this.gagLineOptions),
      eventLines: new ActionLineBuffer(this.actionLineOptions),
      lineGagRemaining: 0,
      lineIgnoreDepth: 0,
      pendingTinTinLineLog: null,
      tintinOutputHistory: [],
      tintinCommandHistory: [],
      luaCommandDraft: '',
      luaVisibleOutputHistory: [],
      luaVisibleOutputCarry: '',
      luaVisibleLineNumber: 1,
      tintinListIndexes: new Map(),
      tintin,
      delays: new Map(),
      tickers: new Map(),
      luaAutomations: new Map(),
      luaCallbackTimestamps: [],
      secondEventTimer: null,
      tintinClockState: null,
      tintinMapActive: false,
      tintinMapRoomId: '',
      snoops: new Set(),
      logging: { active: false, filename: '', mode: String(tintin.config?.logMode || 'plain') },
      mapperRouteTargetId: '',
      tintinPath: {
        recording: false,
        nodes: [],
        directions: new Map(Object.entries(DEFAULT_TINTIN_PATH_DIRECTIONS)),
        directionCodes: new Map(Object.entries(DEFAULT_TINTIN_PATH_CODES))
      },
      connection: null,
      queue: null
    };

    session.connection = this.connectionFactory({
      onText: (text) => {
        this.writeSessionLog(session, text);
        this.emitSnoopText(session, text);
        this.fireTinTinEvent(session, 'RECEIVED OUTPUT', [String(text ?? '')]);
        const eventLines = session.eventLines.push(text);
        for (const line of eventLines) {
          this.appendTinTinOutputHistory(session, line);
          this.fireTinTinEvent(session, 'RECEIVED LINE', [line, stripTerminalSequences(line)]);
          this.consumePendingTinTinLineLog(session, line);
        }
        const filtered = this.filterGagsForText(session, text);
        if (filtered.communicationText) this.emit(id, 'communication-text', filtered.communicationText);
        if (filtered.visibleText) {
          this.appendLuaVisibleOutput(session, filtered.visibleText);
          this.emit(id, 'text', filtered.visibleText);
        }
        this.processActionsForText(session, text);
      },
      onStatus: (status) => {
        const wasConnected = session.status?.state === 'connected';
        session.status = { ...status };
        session.host = normalizeHost(status?.host, session.host);
        session.port = normalizePort(status?.port, session.port);
        if (session.status.state !== 'connected') {
          const trailing = this.flushGagText(session);
          if (trailing.communicationText) this.emit(id, 'communication-text', trailing.communicationText);
          if (trailing.visibleText) this.emit(id, 'text', trailing.visibleText);
          session.secureInput = false;
          session.mapperRouteTargetId = '';
          if (session.tintinPath) session.tintinPath.recording = false;
          session.lineGagRemaining = 0;
          session.pendingTinTinLineLog = null;
          session.actionLines.reset();
          session.actionLimiter.reset();
          session.gagLines.reset();
          session.eventLines.reset();
        }
        this.emit(id, 'status', session.status);
        if (!wasConnected && session.status.state === 'connected') {
          this.syncSecondEventTimer(session);
          this.fireTinTinEvent(session, 'SESSION CONNECTED', [session.name, session.host, '', String(session.port)]);
          this.fireLuaEventHandlers(session, 'sysConnectionEvent', []);
          this.fireLuaEventHandlers(session, 'sysProtocolEnabled', ['GMCP']);
          this.fireLuaEventHandlers(session, 'sysProtocolEnabled', ['MSDP']);
        } else if (wasConnected && session.status.state !== 'connected') {
          this.clearSecondEventTimer(session);
          this.leaveTinTinMap(session);
          this.fireTinTinEvent(session, 'SESSION DISCONNECTED', [session.name, session.host, '', String(session.port), String(session.status?.message || '')]);
          this.fireLuaEventHandlers(session, 'sysDisconnectionEvent', []);
        }
        this.emitSessionList();
      },
      onEcho: (enabled) => {
        session.secureInput = Boolean(enabled);
        session.actionLines.reset();
        session.actionLimiter.reset();
        this.emit(id, 'echo', session.secureInput);
      },
      onGmcp: (message) => {
        this.syncTinTinProtocolVariables(session, message);
        this.syncTinTinMapEvents(session, message);
        this.syncLuaMudletMsdp(session, message?.packageName);
        const characterName = message?.packageName === 'Char.Status'
          ? message?.body?.name
          : message?.state?.char?.status?.name;
        const previousCharacterName = session.characterName;
        if (characterName) session.characterName = normalizeDisplayName(characterName, session.characterName || name);
        if (message?.packageName === 'NukeFire.Combat' && message?.ephemeral === true && !message?.ignored) {
          this.tracePipeline(session, 'gmcp-combat', () => {
            const body = message.body || {};
            const outgoing = body.out || {};
            const incoming = body.in || {};
            return `Semantic combat ${Number(body.window_ms) || 0}ms | ` +
              `out h${Number(outgoing.hits) || 0} m${Number(outgoing.misses) || 0} ` +
              `dmg${Number(outgoing.damage) || 0} c${Number(outgoing.criticals) || 0} ` +
              `k${Number(outgoing.kills) || 0} | ` +
              `in h${Number(incoming.hits) || 0} m${Number(incoming.misses) || 0} ` +
              `dmg${Number(incoming.damage) || 0} c${Number(incoming.criticals) || 0} ` +
              `d${Number(incoming.deaths) || 0}`;
          });
        }
        this.emit(id, 'gmcp', message);
        const luaGmcpEvent = message?.packageName ? `gmcp.${String(message.packageName)}` : '';
        if (luaGmcpEvent) {
          this.fireLuaEventHandlers(session, luaGmcpEvent, []);
          this.fireLuaEventHandlers(session, 'gmcp', [luaGmcpEvent]);
        }
        // Compact GMCP events publish only the changed packet. Republish the
        // session list only when Char.Status actually changes the tab label.
        if (session.characterName !== previousCharacterName) this.emitSessionList();
      },
      onGmcpState: (state) => this.emit(id, 'gmcp-state', state),
      onPromptBoundary: (boundary) => {
        // GA/EOR is the authoritative completion boundary for a prompt that
        // has no trailing newline. Match that accumulated prompt exactly once,
        // then leave the buffer empty so the next real line starts at column
        // zero for normal ^ semantics.
        const promptActionLines = session.actionLines?.flush?.() || [];
        for (const promptLine of promptActionLines) {
          this.processActionsForText(session, `${promptLine}\n`);
        }
        const prompt = this.flushGagText(session);
        if (prompt.communicationText) this.emit(id, 'communication-text', prompt.communicationText);
        if (prompt.visibleText) this.emit(id, 'text', prompt.visibleText);
        this.fireTinTinEvent(session, 'RECEIVED PROMPT', [String(prompt.visibleText || prompt.communicationText || '')]);
        this.emit(id, 'boundary', boundary);
      },
      onProtocolWarning: (warning) => this.emit(id, 'protocol-warning', warning),
      onCompressionState: (state) => this.emit(id, 'compression-state', state),
      onOptionState: (optionState) => {
        this.emit(id, 'option-state', optionState);
        const option = Number(optionState?.option ?? optionState?.code ?? optionState?.id);
        const enabled = optionState?.enabled === true || optionState?.remote === true || optionState?.state === 'enabled' || optionState?.verb === 'WILL';
        if (option === 201 && enabled) this.fireTinTinEvent(session, 'IAC WILL GMCP', ['GMCP']);
      },
      onCharset: (charset) => this.emit(id, 'charset', charset),
      onTerminalType: (terminalType) => this.emit(id, 'terminal-type', terminalType),
      onWindowSize: (size) => this.emit(id, 'window-size', size),
      onNewEnvironment: (state) => this.emit(id, 'new-environ', state),
      onError: (message) => this.emit(id, 'error', message)
    });

    session.queue = new SessionCommandQueue(
      (command, entry = {}) => {
        const sent = session.connection.sendCommand(command);
        if (sent && entry.source === 'speedwalk') {
          this.emit(id, 'speedwalk-step', { command });
        }
        return sent;
      },
      this.queueOptions
    );
    session.connection.setTerminalSize(session.terminalSize.width, session.terminalSize.height);
    session.connection.setClientPreferences(session.preferences);

    this.sessions.set(id, session);
    this.syncSecondEventTimer(session);
    this.fireTinTinEvent(session, 'PROGRAM START', ['NukeFire Client', '0.3.1']);
    this.fireTinTinEvent(session, 'SCREEN RESIZE', [String(session.terminalSize.width), String(session.terminalSize.height)]);
    if (!this.activeSessionId) this.activeSessionId = id;
    this.emitSessionList();
    return this.publicSession(session);
  }

  publicSession(session, options = {}) {
    if (!session) return null;
    const snapshot = {
      id: session.id,
      name: session.name,
      role: session.role,
      host: session.host,
      port: session.port,
      characterName: session.characterName,
      status: { ...session.status },
      connected: session.status?.state === 'connected',
      queueSize: session.queue?.size || 0,
      pipelineDebug: session.pipelineDebug.status()
    };
    if (options.includeTinTin !== false) snapshot.tintin = this.snapshotTinTinContext(session.tintin);
    return snapshot;
  }

  sessionListSnapshot() {
    const groups = {};
    for (const [name, group] of this.groups) {
      groups[name] = { name, members: [...group.members], leader: group.leader || '' };
    }
    return {
      commandPrefix: this.commandPrefix,
      activeSessionId: this.activeSessionId,
      sessions: [...this.sessions.values()].map((session) => this.publicSession(session, { includeTinTin: false })),
      groups
    };
  }

  snapshot() {
    const groups = {};
    for (const [name, group] of this.groups) {
      groups[name] = {
        name,
        members: [...group.members],
        leader: group.leader || ''
      };
    }
    const activeSession = this.sessions.get(this.activeSessionId) || this.sessions.values().next().value;
    const activeDefinitions = this.snapshotTinTinContext(activeSession?.tintin);
    return {
      commandPrefix: this.commandPrefix,
      activeSessionId: this.activeSessionId,
      sessions: [...this.sessions.values()].map((session) => this.publicSession(session)),
      groups,
      ...activeDefinitions
    };
  }

  emitSessionList() {
    this._sessionListRevision += 1;
    this.handlers.onSessionsChanged?.(this.sessionListSnapshot());
  }

  findSession(reference) {
    const token = normalizeSessionId(reference);
    if (!token) return null;
    if (this.sessions.has(token)) return this.sessions.get(token);
    for (const session of this.sessions.values()) {
      const candidates = [session.name, session.characterName]
        .map((value) => normalizeSessionId(value))
        .filter(Boolean);
      if (candidates.includes(token)) return session;
    }
    return null;
  }

  setActiveSession(reference) {
    const session = this.findSession(reference);
    if (!session) return null;
    const previous = this.sessions.get(this.activeSessionId) || null;
    const changed = this.activeSessionId !== session.id;
    if (changed && previous) this.fireTinTinEvent(previous, 'SESSION DEACTIVATED', [previous.name, session.name]);
    this.activeSessionId = session.id;
    if (changed) this.fireTinTinEvent(session, 'SESSION ACTIVATED', [session.name, previous?.name || '']);
    this.emitSessionList();
    return this.publicSession(session);
  }

  updateSession(reference, changes = {}) {
    const session = this.findSession(reference);
    if (!session) return null;
    if (Object.hasOwn(changes, 'name')) session.name = normalizeDisplayName(changes.name, session.name);
    if (Object.hasOwn(changes, 'role')) session.role = normalizeRole(changes.role, session.role);
    if (Object.hasOwn(changes, 'host')) session.host = normalizeHost(changes.host, session.host);
    if (Object.hasOwn(changes, 'port')) session.port = normalizePort(changes.port, session.port);
    if (Object.hasOwn(changes, 'pipelineDebug')) {
      session.pipelineDebug.configure(normalizePipelineDebugSettings(changes.pipelineDebug));
      this.emit(session.id, 'pipeline-debug', { type: 'state', status: session.pipelineDebug.status() });
    }
    this.emitSessionList();
    return this.publicSession(session);
  }

  async connectSession(reference, options = {}) {
    const session = this.findSession(reference);
    if (!session) throw new Error('Unknown session.');
    session.host = normalizeHost(options.host, session.host);
    session.port = normalizePort(options.port, session.port);
    try {
      await session.connection.connect(session.host, session.port);
    } catch (error) {
      if (/tim(?:e|ed)\s*out/iu.test(String(error?.message || error || ''))) {
        this.fireTinTinEvent(session, 'SESSION TIMED OUT', [session.name, session.host, '', String(session.port)]);
      }
      throw error;
    }
    return this.publicSession(session);
  }

  clearSessionDelays(session) {
    if (!session?.delays) return 0;
    const count = session.delays.size;
    for (const timer of session.delays.keys()) this.delayClearTimer(timer);
    session.delays.clear();
    return count;
  }

  clearSessionTickers(session) {
    if (!session?.tickers) return 0;
    const count = session.tickers.size;
    for (const record of session.tickers.values()) {
      if (record?.timer) this.tickerClearTimer(record.timer);
    }
    session.tickers.clear();
    return count;
  }

  disconnectSession(reference, message = 'Disconnected by user.') {
    const session = this.findSession(reference);
    if (!session) return false;
    session.queue.clear();
    this.clearSessionDelays(session);
    this.clearSessionTickers(session);
    this.clearSecondEventTimer(session);
    session.logging.active = false;
    session.connection.disconnect(message);
    return true;
  }


  clearTinTinState(source) {
    return this.withTinTinSession(source, () => this.clearTinTinStateScoped(source));
  }

  clearTinTinStateScoped(source) {
    const counts = {
      aliases: this.aliasEngine.list().length,
      variables: this.variableEngine.list().length,
      functions: this.functionEngine.list().length,
      actions: this.actionEngine.list().length,
      gags: this.gagEngine.list().length,
      highlights: this.highlightEngine.list().length,
      substitutes: this.substituteEngine.list().length,
      macros: this.macroEngine.list().length,
      events: this.eventEngine.list().length,
      classes: this.classManager.list().length
    };

    this.aliasEngine.clear();
    this.variableEngine.clear();
    this.functionEngine.clear();
    this.actionEngine.clear();
    this.gagEngine.clear();
    this.highlightEngine.clear();
    this.substituteEngine.clear();
    this.macroEngine.restore({ enabled: this.macroEngine.enabled !== false, definitions: [] });
    this.eventEngine.clear();
    this.classManager.restore({ activeStack: [], definitions: [] });
    const context = this.activeTinTinContext();
    context.profile = { requested: '', filename: '', loaded: false };

    const cancelledDelays = this.clearSessionDelays(source);
    const cancelledTickers = this.clearSessionTickers(source);
    const cancelledSpeedwalk = source?.queue?.clearSource('speedwalk') || 0;
    source?.actionLines?.reset();
    source?.actionLimiter?.reset();
    source?.gagLines?.reset();
    if (source) source.lineGagRemaining = 0;

    return {
      counts,
      totalDefinitions: Object.values(counts).reduce((total, count) => total + count, 0),
      cancelledDelays,
      cancelledTickers,
      cancelledSpeedwalk
    };
  }

  removeSession(reference) {
    const session = this.findSession(reference);
    if (!session || this.sessions.size <= 1) return false;
    const wasActive = this.activeSessionId === session.id;
    session.queue.close();
    this.clearLuaAutomations(session);
    this.clearSessionDelays(session);
    this.clearSessionTickers(session);
    this.clearSecondEventTimer(session);
    for (const watcher of this.sessions.values()) watcher.snoops?.delete(session.id);
    session.connection.disconnect('Session closed.');
    this.sessions.delete(session.id);
    try {
      const cleanup = this.handlers.onSessionRemoved?.(session.id);
      if (cleanup && typeof cleanup.catch === 'function') cleanup.catch(() => {});
    } catch {
      // Session removal remains authoritative even if an optional subsystem cleanup fails.
    }
    for (const [name, group] of this.groups) {
      group.members = group.members.filter((id) => id !== session.id);
      if (group.leader === session.id) group.leader = group.members[0] || '';
      if (group.members.length === 0) this.groups.delete(name);
    }
    if (wasActive) {
      const next = this.sessions.values().next().value || null;
      // Source cleanup unlinks the dying session, reports DISCONNECTED, then
      // deactivates it before making the replacement session active.
      this.fireTinTinEvent(session, 'SESSION DEACTIVATED', [session.name, next?.name || '']);
      this.activeSessionId = next?.id || '';
      if (next) this.fireTinTinEvent(next, 'SESSION ACTIVATED', [next.name, session.name]);
    }
    this.emitSessionList();
    return true;
  }

  disconnectAll(message = 'Disconnected by user.') {
    for (const session of this.sessions.values()) this.disconnectSession(session.id, message);
  }

  setTerminalSize(reference, width, height) {
    const session = this.findSession(reference);
    if (!session) return false;
    session.terminalSize = {
      width: Math.max(1, Math.min(65535, Math.trunc(Number(width) || 120))),
      height: Math.max(1, Math.min(65535, Math.trunc(Number(height) || 40)))
    };
    const sent = session.connection.setTerminalSize(session.terminalSize.width, session.terminalSize.height);
    this.fireTinTinEvent(session, 'SCREEN RESIZE', [String(session.terminalSize.width), String(session.terminalSize.height)]);
    return sent;
  }

  setTerminalSizeAll(width, height) {
    let sent = false;
    for (const session of this.sessions.values()) {
      sent = this.setTerminalSize(session.id, width, height) || sent;
    }
    return sent;
  }

  setClientPreferences(reference, preferences = {}) {
    const session = this.findSession(reference);
    if (!session) return {};
    session.preferences = {
      ...session.preferences,
      ...session.connection.setClientPreferences(preferences)
    };
    return { ...session.preferences };
  }

  setClientPreferencesAll(preferences = {}) {
    let result = {};
    for (const session of this.sessions.values()) {
      result = this.setClientPreferences(session.id, preferences);
    }
    return result;
  }

  sendGmcp(reference, packageName, body) {
    const session = this.findSession(reference);
    return session?.connection.sendGmcp(packageName, body) || false;
  }

  getGmcpState(reference) {
    const session = this.findSession(reference);
    return session?.connection.getGmcpState?.() ?? null;
  }

  queueCommand(reference, command, options = {}) {
    const session = this.findSession(reference);
    const source = String(options.source || 'command');
    const outgoing = String(command ?? '');
    if (!session) return { sessionId: '', command: outgoing, source, queued: false, reason: 'unknown' };
    if (session.status?.state !== 'connected') {
      this.tracePipeline(session, 'send', () => `Blocked while disconnected: ${outgoing || '<blank line>'}`);
      return { sessionId: session.id, command: outgoing, source, queued: false, reason: 'disconnected' };
    }

    // Ordinary commands, Alias bursts, Actions, and named-session routing must
    // never wait behind visual output or a movement timer. Speedwalk is the only
    // feature that intentionally uses the paced per-session queue.
    const sent = session.connection.sendCommand(outgoing);

    // TinTin emits SEND OUTPUT after the socket write. Treat a successful
    // ConnectionManager handoff as that boundary, while retaining the recursion
    // guard so an Event body cannot create an unbounded send-event loop.
    if (sent && !session.sendEventDepth) {
      session.sendEventDepth = 1;
      try { this.fireTinTinEvent(session, 'SEND OUTPUT', [outgoing]); }
      finally { session.sendEventDepth = 0; }
    }
    this.tracePipeline(session, 'send', () => `${sent ? 'Sent' : 'Send failed'} to ${session.name}: ${outgoing || '<blank line>'}`);
    return {
      sessionId: session.id,
      command: outgoing,
      source,
      queued: sent,
      reason: sent ? '' : 'send-failed'
    };
  }

  queueSpeedwalk(reference, steps, options = {}) {
    const session = this.findSession(reference);
    const commands = Array.isArray(steps) ? steps.map((step) => String(step || '')) : [];
    if (!session) {
      return commands.map((command) => ({ sessionId: '', command, source: 'speedwalk', queued: false, reason: 'unknown' }));
    }
    if (session.status?.state !== 'connected') {
      return commands.map((command) => ({ sessionId: session.id, command, source: 'speedwalk', queued: false, reason: 'disconnected' }));
    }
    const queued = session.queue.enqueueBatch(commands, { source: options.show === false ? 'lua-speedwalk-hidden' : 'speedwalk' });
    return commands.map((command) => ({
      sessionId: session.id,
      command,
      source: 'speedwalk',
      queued,
      reason: queued ? '' : 'queue-full'
    }));
  }

  recipientsForTarget(target, sourceId) {
    const token = normalizeSessionId(target);
    if (token === 'all') return [...this.sessions.keys()];
    if (token === 'followers') {
      const recipients = new Set();
      for (const group of this.groups.values()) {
        if (group.leader !== sourceId) continue;
        for (const member of group.members) if (member !== sourceId) recipients.add(member);
      }
      return [...recipients];
    }
    const session = this.findSession(token);
    if (session) return [session.id];
    const group = this.groups.get(normalizeGroupName(token));
    return group ? [...group.members] : [];
  }

  sendToRecipients(recipients, command) {
    return [...new Set(recipients)].map((sessionId) => this.queueCommand(sessionId, command));
  }

  defineGroup(nameValue, memberReferences) {
    const name = normalizeGroupName(nameValue);
    if (!name) return null;
    const members = [];
    for (const reference of memberReferences) {
      const session = this.findSession(reference);
      if (session && !members.includes(session.id)) members.push(session.id);
    }
    if (members.length === 0) return null;
    const current = this.groups.get(name);
    const leader = current && members.includes(current.leader) ? current.leader : members[0];
    const group = { name, members, leader };
    this.groups.set(name, group);
    this.emitSessionList();
    return { ...group, members: [...group.members] };
  }

  setGroupLeader(groupValue, sessionReference) {
    const name = normalizeGroupName(groupValue);
    const group = this.groups.get(name);
    const session = this.findSession(sessionReference);
    if (!group || !session || !group.members.includes(session.id)) return false;
    group.leader = session.id;
    this.emitSessionList();
    return true;
  }

  deleteGroup(groupValue) {
    const deleted = this.groups.delete(normalizeGroupName(groupValue));
    if (deleted) this.emitSessionList();
    return deleted;
  }

  restore(snapshot = {}) {
    if (Object.hasOwn(snapshot, 'commandPrefix')) {
      this.setCommandPrefix(snapshot.commandPrefix);
    }

    const definitions = Array.isArray(snapshot.sessions) ? snapshot.sessions.slice(0, 24) : [];
    const existing = new Set();
    for (const definition of definitions) {
      const requested = normalizeSessionId(definition?.id || definition?.name);
      let session = requested ? this.findSession(requested) : null;
      if (!session) session = this.findSession(this.createSession({ ...definition, inheritStartup: false })?.id);
      this.updateSession(session.id, definition);
      if (definition?.tintin && typeof definition.tintin === 'object') {
        this.replaceTinTinContext(session.tintin, definition.tintin);
      }
      existing.add(session.id);
    }

    if (definitions.length > 0) {
      for (const session of [...this.sessions.values()]) {
        if (!existing.has(session.id) && this.sessions.size > 1 && session.status.state === 'disconnected') {
          this.removeSession(session.id);
        }
      }
    }

    this.groups.clear();
    const groups = snapshot.groups && typeof snapshot.groups === 'object'
      ? Object.values(snapshot.groups).slice(0, 32)
      : [];
    for (const group of groups) {
      const defined = this.defineGroup(group?.name, Array.isArray(group?.members) ? group.members : []);
      if (defined && group?.leader) this.setGroupLeader(defined.name, group.leader);
    }

    const requestedActive = snapshot.activeSessionId || definitions[0]?.id || this.activeSessionId;
    if (requestedActive) this.setActiveSession(requestedActive);

    const hasPerSessionDefinitions = definitions.some((definition) =>
      definition?.tintin && typeof definition.tintin === 'object'
    );
    if (!hasPerSessionDefinitions) {
      const legacyDefinitions = {};
      for (const key of [
        'aliases', 'variables', 'functions', 'actions', 'gags', 'highlights',
        'substitutes', 'macros', 'events', 'config', 'classes', 'speedwalk'
      ]) {
        if (Object.hasOwn(snapshot, key)) legacyDefinitions[key] = snapshot[key];
      }
      if (Object.keys(legacyDefinitions).length > 0) {
        const target = this.findSession(this.activeSessionId) || this.sessions.values().next().value;
        if (target) this.replaceTinTinContext(target.tintin, legacyDefinitions);
      }
    }

    this.emitSessionList();
    return this.snapshot();
  }

  replaceDefinitions(reference, definitions) {
    let targetReference = reference;
    let nextDefinitions = definitions;
    if (definitions === undefined && reference && typeof reference === 'object') {
      targetReference = this.activeSessionId;
      nextDefinitions = reference;
    }
    const session = this.findSession(targetReference || this.activeSessionId);
    if (!session) return this.snapshot();
    this.clearSessionTickers(session);
    this.replaceTinTinContext(session.tintin, nextDefinitions || {});
    session.lineGagRemaining = 0;
    session.logging.mode = String(session.tintin.config?.logMode || 'plain');
    this.syncSecondEventTimer(session);
    this.emitSessionList();
    return this.snapshot();
  }

  profileFileLabel(session) {
    const profile = session?.tintin?.profile || {};
    const filename = String(profile.filename || '').trim();
    if (filename) return filename;
    const requested = String(profile.requested || '').trim();
    if (requested) return /\.(?:tin|txt)$/iu.test(requested) ? requested : `${requested}.tin`;
    return '';
  }

  profileCounts(session) {
    const snapshot = this.snapshotTinTinContext(session?.tintin);
    return {
      aliases: snapshot.aliases.length,
      actions: snapshot.actions.definitions.length,
      variables: snapshot.variables.length,
      functions: snapshot.functions.length,
      classes: snapshot.classes.definitions.length
    };
  }

  profileStatusMessages(session) {
    if (!session) return ['No active session.'];
    const profile = session.tintin?.profile || {};
    const filename = this.profileFileLabel(session);
    const counts = this.profileCounts(session);
    const state = profile.loaded
      ? 'loaded privately'
      : (profile.requested ? 'requested but not loaded' : 'no profile bound');
    return [
      `Session: ${session.name}`,
      `Profile: ${filename || 'none'} — ${state}`,
      `Definitions: ${counts.aliases} aliases, ${counts.actions} actions, ${counts.variables} variables, ${counts.functions} functions, ${counts.classes} classes`,
      `Connection: ${session.status.state} — ${session.host}:${session.port}`
    ];
  }

  requestProfileReload(session) {
    if (!session) return { messages: ['Unknown session.'], activateSessionId: '' };
    const requested = String(
      session.tintin?.profile?.filename
      || session.tintin?.profile?.requested
      || session.name
    ).trim();
    this.emit(session.id, 'session-profile-load-request', { requested });
    const label = /\.(?:tin|txt)$/iu.test(requested) ? requested : `${requested}.tin`;
    return {
      messages: [`Reloading ${session.name} cleanly from ${label}.`],
      activateSessionId: session.id
    };
  }

  formatAlias(record) {
    const classLabel = record.className ? ` [class:${record.className}]` : '';
    return `[${record.scope}] ${record.name} = ${record.body} [priority ${record.priority || 5}]${classLabel}`;
  }

  formatVariable(record) {
    const classLabel = record.className ? ` [class:${record.className}]` : '';
    return `[${record.scope}] ${record.name} = ${record.value}${classLabel}`;
  }

  formatFunction(record) {
    const classLabel = record.className ? ` [class:${record.className}]` : '';
    return `[${record.scope}] @${record.name} = {${record.body}}${classLabel}`;
  }

  formatAction(record) {
    const state = record.enabled ? 'ON' : 'OFF';
    const classLabel = record.className ? ` [class:${record.className}]` : '';
    return `[${record.priority}] ${state} {${record.pattern}} => {${record.command}}${classLabel}`;
  }

  formatGag(record) {
    const classLabel = record.className ? ` [class:${record.className}]` : '';
    return `${record.enabled ? 'ON' : 'OFF'} {${record.pattern}}${classLabel}`;
  }

  formatHighlight(record) {
    const classLabel = record.className ? ` [class:${record.className}]` : '';
    return `[${record.priority}] ${record.enabled ? 'ON' : 'OFF'} {${record.pattern}} => {${record.style}}${classLabel}`;
  }

  formatSubstitute(record) {
    const classLabel = record.className ? ` [class:${record.className}]` : '';
    return `[${record.priority}] ${record.enabled ? 'ON' : 'OFF'} {${record.pattern}} => {${record.replacement}}${classLabel}`;
  }

  formatMacro(record) {
    const classLabel = record.className ? ` [class:${record.className}]` : '';
    return `${record.enabled ? 'ON' : 'OFF'} {${record.key}} => {${record.command}}${classLabel}`;
  }

  classLiveDefinitions(nameValue) {
    const name = normalizeClassName(nameValue);
    if (!name) return { aliases: [], variables: [], functions: [], actions: [], gags: [], highlights: [], substitutes: [], macros: [], tabs: [], events: [] };
    return {
      aliases: this.aliasEngine.list().filter((record) => record.className === name),
      variables: this.variableEngine.list().filter((record) => record.className === name),
      functions: this.functionEngine.list().filter((record) => record.className === name),
      actions: this.actionEngine.list().filter((record) => record.className === name),
      gags: this.gagEngine.list().filter((record) => record.className === name),
      highlights: this.highlightEngine.list().filter((record) => record.className === name),
      substitutes: this.substituteEngine.list().filter((record) => record.className === name),
      macros: this.macroEngine.list().filter((record) => record.className === name),
      tabs: this.tabEngine.list().filter((record) => record.className === name),
      events: this.eventEngine.list().filter((record) => record.className === name)
    };
  }

  classDefinitionCount(definitions = {}) {
    return ['aliases', 'variables', 'functions', 'actions', 'gags', 'highlights', 'substitutes', 'macros', 'tabs', 'events']
      .reduce((count, key) => count + (Array.isArray(definitions[key]) ? definitions[key].length : 0), 0);
  }

  clearClassDefinitions(nameValue) {
    const name = normalizeClassName(nameValue);
    const definitions = this.classLiveDefinitions(name);
    for (const record of definitions.aliases) this.aliasEngine.delete(record.name);
    for (const record of definitions.variables) this.variableEngine.delete(record.name);
    for (const record of definitions.functions) this.functionEngine.delete(record.name);
    for (const record of definitions.actions) this.actionEngine.delete(record.pattern);
    for (const record of definitions.gags) this.gagEngine.delete(record.pattern);
    for (const record of definitions.highlights) this.highlightEngine.delete(record.pattern);
    for (const record of definitions.substitutes) this.substituteEngine.delete(record.pattern);
    for (const record of definitions.macros) this.macroEngine.delete(record.key);
    for (const record of definitions.tabs) this.tabEngine.delete(record.value);
    for (const record of definitions.events) this.eventEngine.remove(record.name);
    return this.classDefinitionCount(definitions);
  }

  restoreClassDefinitions(nameValue, savedValue) {
    const name = normalizeClassName(nameValue);
    const saved = savedValue && typeof savedValue === 'object' ? savedValue : null;
    if (!name || !saved) return 0;
    this.clearClassDefinitions(name);
    let restored = 0;
    for (const record of saved.aliases || []) {
      if (this.aliasEngine.define(record.name, record.body, record.priority, name)) restored += 1;
    }
    for (const record of saved.variables || []) {
      if (this.variableEngine.define(record.name, record.value, name)) restored += 1;
    }
    for (const record of saved.functions || []) {
      if (this.functionEngine.define(record.name, record.body, name)) restored += 1;
    }
    for (const record of saved.actions || []) {
      const defined = this.actionEngine.define(record.pattern, record.command, record.priority, name);
      if (!defined) continue;
      if (record.enabled === false) this.actionEngine.setActionEnabled(record.pattern, false);
      restored += 1;
    }
    for (const record of saved.gags || []) {
      const defined = this.gagEngine.define(record.pattern, name);
      if (!defined) continue;
      if (record.enabled === false) this.gagEngine.setGagEnabled(record.pattern, false);
      restored += 1;
    }
    for (const record of saved.highlights || []) {
      const defined = this.highlightEngine.define(record.pattern, record.style, record.priority, name);
      if (!defined) continue;
      if (record.enabled === false) this.highlightEngine.setHighlightEnabled(record.pattern, false);
      restored += 1;
    }
    for (const record of saved.substitutes || []) {
      const defined = this.substituteEngine.define(record.pattern, record.replacement, record.priority, name);
      if (!defined) continue;
      if (record.enabled === false) this.substituteEngine.setSubstituteEnabled(record.pattern, false);
      restored += 1;
    }
    for (const record of saved.macros || []) {
      const defined = this.macroEngine.define(record.key, record.command, name);
      if (!defined) continue;
      if (record.enabled === false) this.macroEngine.setMacroEnabled(record.key, false);
      restored += 1;
    }
    for (const record of saved.tabs || []) {
      if (this.tabEngine.define(record.value, name)) restored += 1;
    }
    for (const record of saved.events || []) {
      const defined = this.eventEngine.define(record.name, record.command, name);
      if (!defined) continue;
      restored += 1;
    }
    return restored;
  }

  classSummary(nameValue) {
    const name = normalizeClassName(nameValue);
    const live = this.classLiveDefinitions(name);
    const liveCount = this.classDefinitionCount(live);
    const saved = this.classManager.saved(name);
    const savedCount = saved ? this.classDefinitionCount(saved) : 0;
    const state = this.classManager.activeName === name ? 'OPEN' : 'CLOSED';
    return `${name}: ${state}; ${liveCount} live definition${liveCount === 1 ? '' : 's'}; ${savedCount} saved.`;
  }

  handleClassCommand(tokens, source, options = {}) {
    if (tokens.length === 0 || normalizeToken(tokens[0]) === 'list') {
      const classes = this.classManager.list();
      return {
        deliveries: [],
        activateSessionId: '',
        messages: classes.length > 0
          ? classes.map((record) => this.classSummary(record.name))
          : ['No classes are defined.']
      };
    }

    const expandClassArgument = (value) => options.variablesExpanded
      ? { value: String(value ?? ''), error: '' }
      : this.expandFunctionAndVariables(value, source, options);
    const expandedName = expandClassArgument(tokens[0]);
    if (expandedName.error) return { deliveries: [], activateSessionId: '', messages: [expandedName.error] };
    const name = normalizeClassName(expandedName.value);
    if (!name) {
      return { deliveries: [], activateSessionId: '', messages: ['Class names may use letters, numbers, underscores, or hyphens.'] };
    }
    const expandedOperation = tokens[1] === undefined ? { value: '', error: '' } : expandClassArgument(tokens[1]);
    if (expandedOperation.error) return { deliveries: [], activateSessionId: '', messages: [expandedOperation.error] };
    const operation = resolveTinTinOrderedAbbreviation(expandedOperation.value, TINTIN_CLASS_SUBCOMMANDS, { activate: 'activate', deactivate: 'deactivate', assign: 'assign', clear: 'clear', debug: 'debug', list: 'list', load: 'load', off: 'off', on: 'on', save: 'save', show: 'show', size: 'size' }) || 'show';

    if (operation === 'open') {
      const opened = this.classManager.open(name);
      return { deliveries: [], activateSessionId: '', messages: opened ? [`Class ${opened} opened. New aliases, variables, functions, actions, gags, highlights, substitutes, and macros will join it.`] : ['Class limit reached.'] };
    }
    if (operation === 'close') {
      if (!this.classManager.ensure(name)) return { deliveries: [], activateSessionId: '', messages: ['Class limit reached.'] };
      const closed = this.classManager.close(name);
      return { deliveries: [], activateSessionId: '', messages: [closed ? `Class ${closed} closed.` : `Class ${name} is already closed.`] };
    }
    if (operation === 'show' || operation === 'list') {
      if (!this.classManager.has(name)) return { deliveries: [], activateSessionId: '', messages: [`Unknown class: ${name}.`] };
      const live = this.classLiveDefinitions(name);
      const messages = [this.classSummary(name)];
      for (const record of live.aliases) messages.push(`ALIAS ${this.formatAlias(record)}`);
      for (const record of live.variables) messages.push(`VARIABLE ${this.formatVariable(record)}`);
      for (const record of live.functions) messages.push(`FUNCTION ${this.formatFunction(record)}`);
      for (const record of live.actions) messages.push(`ACTION ${this.formatAction(record)}`);
      for (const record of live.gags) messages.push(`GAG ${this.formatGag(record)}`);
      for (const record of live.highlights) messages.push(`HIGHLIGHT ${this.formatHighlight(record)}`);
      for (const record of live.substitutes) messages.push(`SUBSTITUTE ${this.formatSubstitute(record)}`);
      for (const record of live.macros) messages.push(`MACRO ${this.formatMacro(record)}`);
      return { deliveries: [], activateSessionId: '', messages };
    }
    if (operation === 'save') {
      const live = this.classLiveDefinitions(name);
      this.classManager.save(name, live);
      const count = this.classDefinitionCount(live);
      return { deliveries: [], activateSessionId: '', messages: [`Saved ${count} definition${count === 1 ? '' : 's'} for class ${name}.`] };
    }
    if (operation === 'clear') {
      if (!this.classManager.has(name)) return { deliveries: [], activateSessionId: '', messages: [`Unknown class: ${name}.`] };
      const count = this.clearClassDefinitions(name);
      return { deliveries: [], activateSessionId: '', messages: [`Cleared ${count} live definition${count === 1 ? '' : 's'} from class ${name}. Saved copy retained.`] };
    }
    if (operation === 'load' || operation === 'on' || operation === 'enable') {
      const saved = this.classManager.saved(name);
      if (!saved) return { deliveries: [], activateSessionId: '', messages: [`Class ${name} has no saved copy. Use ${this.clientCommand(`class {${name}} save`)} first.`] };
      const count = this.restoreClassDefinitions(name, saved);
      return { deliveries: [], activateSessionId: '', messages: [`Loaded ${count} definition${count === 1 ? '' : 's'} for class ${name}.`] };
    }
    if (operation === 'off' || operation === 'disable') {
      const live = this.classLiveDefinitions(name);
      const count = this.classDefinitionCount(live);
      if (count > 0) this.classManager.save(name, live);
      else if (!this.classManager.has(name)) this.classManager.ensure(name);
      const cleared = this.clearClassDefinitions(name);
      return { deliveries: [], activateSessionId: '', messages: [`Class ${name} disabled; ${cleared} live definition${cleared === 1 ? '' : 's'} stored for later loading.`] };
    }
    if (operation === 'kill') {
      if (!this.classManager.ensure(name)) return { deliveries: [], activateSessionId: '', messages: ['Class limit reached.'] };
      const cleared = this.clearClassDefinitions(name);
      const killed = this.classManager.kill(name);
      return { deliveries: [], activateSessionId: '', messages: [`Killed class ${name} and removed ${cleared} live definition${cleared === 1 ? '' : 's'}.`] };
    }
    if (operation === 'size') {
      const count = this.classDefinitionCount(this.classLiveDefinitions(name));
      const variableName = tokens[2];
      if (variableName) {
        const stored = this.variableEngine.define(variableName, String(count), this.classManager.activeName);
        if (!stored) return { deliveries: [], activateSessionId: '', messages: ['Class size variable could not be stored.'] };
        return { deliveries: [], activateSessionId: '', messages: [`Class ${name} contains ${count} live definitions; stored in %${stored.name}.`] };
      }
      return { deliveries: [], activateSessionId: '', messages: [`Class ${name} contains ${count} live definition${count === 1 ? '' : 's'}.`] };
    }
    if (operation === 'assign') {
      const commandText = tokens.slice(2).join(' ').trim();
      const parsedCommands = splitTopLevelCommands(commandText, { maxCommands: 32, commandPrefix: this.commandPrefix });
      if (!commandText || parsedCommands.errorCode) {
        return { deliveries: [], activateSessionId: '', messages: [this.usage('class {name} assign {client command; client command; ...}')] };
      }
      const previousStack = [...this.classManager.stack];
      this.classManager.open(name);
      let result;
      try {
        result = this.dispatchCommandSequence(source, parsedCommands.commands, { ...options, classAssigned: true });
      } finally {
        this.classManager.stack = previousStack.filter((entry) => this.classManager.has(entry));
      }
      const messages = [...result.messages];
      messages.unshift(`Assigned ${parsedCommands.commands.length} command${parsedCommands.commands.length === 1 ? '' : 's'} through class ${name}.`);
      return { deliveries: result.deliveries, activateSessionId: result.activateSessionId, messages };
    }
    if (operation === 'read' || operation === 'write') {
      if (!this.classManager.ensure(name)) return { deliveries: [], activateSessionId: '', messages: ['Class limit reached.'] };
      if (tokens.length !== 3) {
        return { deliveries: [], activateSessionId: '', messages: [this.usage(`class {name} {${operation}} {script name}`)] };
      }
      const expanded = options.variablesExpanded
        ? { value: tokens[2], error: '' }
        : this.expandFunctionAndVariables(tokens[2], source, options);
      if (expanded.error) return { deliveries: [], activateSessionId: '', messages: [expanded.error] };
      const rawRequested = String(expanded.value || '').trim();
      const requested = normalizeLegacyTinTinScriptRequest(rawRequested) || rawRequested;
      if (!requested) return { deliveries: [], activateSessionId: '', messages: [this.usage(`class {name} {${operation}} {script name}`)] };
      this.emit(source.id, operation === 'read' ? 'class-read-request' : 'class-write-request', {
        className: name,
        requested,
        ...(requested !== rawRequested ? { legacyRequested: rawRequested } : {})
      });
      return { deliveries: [], activateSessionId: '', messages: [] };
    }
    if (operation === 'debug') {
      return { deliveries: [], activateSessionId: '', messages: ['Class DEBUG is intentionally not duplicated; use NukeFire pipeline diagnostics instead.'] };
    }
    return { deliveries: [], activateSessionId: '', messages: [this.usage('class {name} {open|close|assign|list|save|clear|load|on|off|size|kill|read|write}')] };
  }

  handleUnactionCommand(tokens, source = null, options = {}) {
    if (!tokens[0]) return [this.usage('unaction {pattern}')];
    const rawPattern = unescapeActionSemicolons(tokens.join(' '));
    const expanded = (!source || options.variablesExpanded)
      ? { value: rawPattern, error: '' }
      : this.expandFunctionAndVariables(rawPattern, source, options);
    if (expanded.error) return [expanded.error];
    const pattern = String(expanded.value || '').trim();
    const matches = this.actionEngine.list().filter((record) => tinTinDefinitionMatches(record.pattern, pattern));
    if (!matches.length) return [`Unknown action: ${pattern}.`];
    for (const record of matches) this.actionEngine.delete(record.pattern);
    return matches.length === 1
      ? [`Deleted action: ${matches[0].pattern}`]
      : [`Deleted ${matches.length} actions matching ${pattern}.`];
  }

  handleUngagCommand(tokens, source = null, options = {}) {
    const rawPattern = tokens.join(' ').trim();
    if (!rawPattern) return [this.usage('ungag {pattern}')];
    const expanded = (!source || options.variablesExpanded)
      ? { value: rawPattern, error: '' }
      : this.expandFunctionAndVariables(rawPattern, source, options);
    if (expanded.error) return [expanded.error];
    const pattern = String(expanded.value || '').trim();
    const matches = this.gagEngine.list().filter((record) => tinTinDefinitionMatches(record.pattern, pattern));
    if (!matches.length) return [`Unknown gag: ${pattern}.`];
    for (const record of matches) this.gagEngine.delete(record.pattern);
    return matches.length === 1
      ? [`Deleted gag: ${matches[0].pattern}`]
      : [`Deleted ${matches.length} gags matching ${pattern}.`];
  }

  handleUnaliasCommand(tokens, source = null, options = {}) {
    const rawPattern = tokens.join(' ').trim();
    if (!rawPattern) return [this.usage('unalias {name}')];
    const expanded = (!source || options.variablesExpanded)
      ? { value: rawPattern, error: '' }
      : this.expandFunctionAndVariables(rawPattern, source, options);
    if (expanded.error) return [expanded.error];
    const pattern = String(expanded.value || '').trim();
    const matches = this.aliasEngine.list().filter((record) => tinTinDefinitionMatches(record.name, pattern));
    if (!matches.length) return [`Unknown alias: ${pattern}.`];
    for (const record of matches) this.aliasEngine.delete(record.name);
    return matches.length === 1
      ? [`Deleted alias ${matches[0].name}.`]
      : [`Deleted ${matches.length} aliases matching ${pattern}.`];
  }

  handleActionCommand(tokens, source = null, options = {}) {
    const operation = normalizeToken(tokens[0]);
    const expandSelector = (value) => (!source || options.variablesExpanded)
      ? { value: String(value ?? ''), error: '' }
      : this.expandFunctionAndVariables(value, source, options);

    if (!operation || (!options.firstArgumentBraced && operation === 'list')) {
      const actions = this.actionEngine.list();
      return actions.length > 0
        ? actions.map((record) => this.formatAction(record))
        : ['No actions are defined.'];
    }

    if (!options.firstArgumentBraced && operation === 'show') {
      const expanded = expandSelector(unescapeActionSemicolons(tokens[1]));
      if (expanded.error) return [expanded.error];
      const pattern = expanded.value;
      const record = this.actionEngine.get(pattern);
      return record
        ? [this.formatAction(record)]
        : [tokens[1] ? `Unknown action: ${tokens[1]}.` : this.usage('action show {pattern}')];
    }

    if (!options.firstArgumentBraced && (operation === 'delete' || operation === 'remove')) {
      if (!tokens[1]) return [this.usage('action delete {pattern}')];
      const expanded = expandSelector(unescapeActionSemicolons(tokens[1]));
      if (expanded.error) return [expanded.error];
      return [this.actionEngine.delete(expanded.value)
        ? `Deleted action: ${tokens[1]}`
        : `Unknown action: ${tokens[1]}.`];
    }

    if (!options.firstArgumentBraced && (operation === 'enable' || operation === 'disable')) {
      if (!tokens[1]) return [this.usage(`action ${operation} {pattern}`)];
      const expanded = expandSelector(unescapeActionSemicolons(tokens[1]));
      if (expanded.error) return [expanded.error];
      const record = this.actionEngine.setActionEnabled(expanded.value, operation === 'enable');
      return record
        ? [`Action ${operation === 'enable' ? 'enabled' : 'disabled'}: ${record.pattern}`]
        : [`Unknown action: ${tokens[1]}.`];
    }

    if (tokens.length === 1) {
      const expanded = expandSelector(unescapeActionSemicolons(tokens[0]));
      if (expanded.error) return [expanded.error];
      const pattern = expanded.value;
      const records = this.actionEngine.list().filter((record) => tinTinDefinitionMatches(record.pattern, pattern));
      return records.length ? records.map((record) => this.formatAction(record)) : [`Unknown action: ${tokens[0]}.`];
    }

    if (tokens.length < 2) {
      return [this.usage(`action {pattern} {command; command; ... up to ${DEFAULT_MAX_ACTION_COMMANDS}} {priority 1-9}`)];
    }

    const last = tokens.at(-1);
    const hasPriority = tokens.length >= 3 && /^[1-9]$/u.test(String(last || '').trim());
    const priority = hasPriority ? Number(last) : undefined;
    const commandTokens = hasPriority ? tokens.slice(1, -1) : tokens.slice(1);
    const expanded = expandSelector(unescapeActionSemicolons(tokens[0]));
    if (expanded.error) return [expanded.error];
    const record = this.actionEngine.define(expanded.value, commandTokens.join(' '), priority, this.classManager.activeName);
    return record
      ? [`Defined action at priority ${record.priority}: ${record.pattern}`]
      : [`Actions need a valid pattern and 1 through ${DEFAULT_MAX_ACTION_COMMANDS} semicolon-separated commands; priorities range from 1 through 9.`];
  }

  handleActionsCommand(tokens) {
    const operation = normalizeToken(tokens[0]);
    if (!operation || operation === 'status') {
      const count = this.actionEngine.list().length;
      return [`Actions are ${this.actionEngine.enabled ? 'ON' : 'OFF'}. ${count} action${count === 1 ? '' : 's'} defined.`];
    }
    if (operation === 'on' || operation === 'enable') {
      this.actionEngine.setEnabled(true);
      return ['Actions enabled.'];
    }
    if (operation === 'off' || operation === 'disable') {
      this.actionEngine.setEnabled(false);
      return ['Actions disabled.'];
    }
    if (operation === 'list') return this.handleActionCommand(['list']);
    return [this.usage('actions {on|off|status|list}')];
  }

  handleGagCommand(tokens, source = null, options = {}) {
    const operation = normalizeToken(tokens[0]);
    const expandSelector = (value) => (!source || options.variablesExpanded)
      ? { value: String(value ?? ''), error: '' }
      : this.expandFunctionAndVariables(value, source, options);

    if (!operation || (!options.firstArgumentBraced && operation === 'list')) {
      const gags = this.gagEngine.list();
      return gags.length > 0 ? gags.map((record) => this.formatGag(record)) : ['No gags are defined.'];
    }
    if (!options.firstArgumentBraced && operation === 'show') {
      const raw = tokens.slice(1).join(' '); const expanded = expandSelector(raw); if (expanded.error) return [expanded.error];
      const record = this.gagEngine.get(expanded.value);
      return record ? [this.formatGag(record)] : [raw ? `Unknown gag: ${expanded.value}.` : this.usage('gag show {pattern}')];
    }
    if (!options.firstArgumentBraced && (operation === 'delete' || operation === 'remove')) {
      const raw = tokens.slice(1).join(' '); if (!raw) return [this.usage('gag delete {pattern}')];
      const expanded = expandSelector(raw); if (expanded.error) return [expanded.error];
      return [this.gagEngine.delete(expanded.value) ? `Deleted gag: ${expanded.value}` : `Unknown gag: ${expanded.value}.`];
    }
    if (!options.firstArgumentBraced && (operation === 'enable' || operation === 'disable')) {
      const raw = tokens.slice(1).join(' '); if (!raw) return [this.usage(`gag ${operation} {pattern}`)];
      const expanded = expandSelector(raw); if (expanded.error) return [expanded.error];
      const record = this.gagEngine.setGagEnabled(expanded.value, operation === 'enable');
      return record ? [`Gag ${operation === 'enable' ? 'enabled' : 'disabled'}: ${record.pattern}`] : [`Unknown gag: ${expanded.value}.`];
    }
    const rawPattern = (!options.firstArgumentBraced && (operation === 'add' || operation === 'define')) ? tokens.slice(1).join(' ') : tokens.join(' ');
    const expanded = expandSelector(rawPattern); if (expanded.error) return [expanded.error];
    const record = this.gagEngine.define(expanded.value, this.classManager.activeName);
    return record ? [`Defined gag: ${record.pattern}`] : [`Gags need a valid non-empty pattern. Use ${this.clientCommand('gag add {pattern}')} for patterns named list, show, delete, enable, or disable.`];
  }

  handleGagsCommand(tokens) {
    const operation = normalizeToken(tokens[0]);
    if (!operation || operation === 'status') {
      const count = this.gagEngine.list().length;
      return [`Gags are ${this.gagEngine.enabled ? 'ON' : 'OFF'}. ${count} gag${count === 1 ? '' : 's'} defined.`];
    }
    if (operation === 'on' || operation === 'enable') {
      this.gagEngine.setEnabled(true);
      return ['Gags enabled.'];
    }
    if (operation === 'off' || operation === 'disable') {
      this.gagEngine.setEnabled(false);
      return ['Gags disabled.'];
    }
    if (operation === 'list') return this.handleGagCommand(['list']);
    return [this.usage('gags {on|off|status|list}')];
  }

  handleUnhighlightCommand(tokens, source = null, options = {}) {
    const rawPattern = tokens.join(' ');
    if (!rawPattern) return [this.usage('unhighlight {pattern}')];
    const expanded = (!source || options.variablesExpanded)
      ? { value: rawPattern, error: '' }
      : this.expandFunctionAndVariables(rawPattern, source, options);
    if (expanded.error) return [expanded.error];
    const pattern = String(expanded.value || '').trim();
    const matches = this.highlightEngine.list().filter((record) => tinTinDefinitionMatches(record.pattern, pattern));
    if (!matches.length) return [`Unknown highlight: ${pattern}.`];
    for (const record of matches) this.highlightEngine.delete(record.pattern);
    return matches.length === 1
      ? [`Deleted highlight: ${normalizeHighlightPattern(matches[0].pattern)}`]
      : [`Deleted ${matches.length} highlights matching ${pattern}.`];
  }

  handleHighlightCommand(tokens, source = null, options = {}) {
    const operation = normalizeToken(tokens[0]);
    const expandSelector = (value) => (!source || options.variablesExpanded) ? { value: String(value ?? ''), error: '' } : this.expandFunctionAndVariables(value, source, options);
    if (!operation || (!options.firstArgumentBraced && operation === 'list')) { const records=this.highlightEngine.list(); return records.length ? records.map((record)=>this.formatHighlight(record)) : ['No highlights are defined.']; }
    if (!options.firstArgumentBraced && operation === 'show') { const raw=tokens.slice(1).join(' '); const e=expandSelector(raw); if(e.error)return[e.error]; const r=this.highlightEngine.get(e.value); return r?[this.formatHighlight(r)]:[raw?`Unknown highlight: ${e.value}.`:this.usage('highlight show {pattern}')]; }
    if (!options.firstArgumentBraced && (operation === 'delete' || operation === 'remove')) { const raw=tokens.slice(1).join(' '); if(!raw)return[this.usage('highlight delete {pattern}')]; const e=expandSelector(raw); if(e.error)return[e.error]; return [this.highlightEngine.delete(e.value)?`Deleted highlight: ${normalizeHighlightPattern(e.value)}`:`Unknown highlight: ${e.value}.`]; }
    if (!options.firstArgumentBraced && (operation === 'enable' || operation === 'disable')) { const raw=tokens.slice(1).join(' '); if(!raw)return[this.usage(`highlight ${operation} {pattern}`)]; const e=expandSelector(raw); if(e.error)return[e.error]; const r=this.highlightEngine.setHighlightEnabled(e.value,operation==='enable'); return r?[`Highlight ${operation==='enable'?'enabled':'disabled'}: ${r.pattern}`]:[`Unknown highlight: ${e.value}.`]; }
    if (tokens.length === 1) { const e=expandSelector(tokens[0]); if(e.error)return[e.error]; const records=this.highlightEngine.list().filter((record)=>tinTinDefinitionMatches(record.pattern,e.value)); return records.length?records.map((record)=>this.formatHighlight(record)):[`Unknown highlight: ${e.value}.`]; }
    const definitionTokens = !options.firstArgumentBraced && (operation === 'add' || operation === 'define') ? tokens.slice(1) : tokens;
    const patternExpanded=expandSelector(definitionTokens[0]); if(patternExpanded.error)return[patternExpanded.error];
    const styleExpanded=expandSelector(definitionTokens[1]); if(styleExpanded.error)return[styleExpanded.error];
    const pattern=patternExpanded.value, style=styleExpanded.value, priority=definitionTokens[2];
    if(!pattern||!style||definitionTokens.length>3)return[this.usage('highlight {pattern} {style} {priority 1-9}')];
    const parsedStyle=parseHighlightStyle(style); if(parsedStyle.error)return[parsedStyle.error];
    const record=this.highlightEngine.define(pattern,style,normalizeHighlightPriority(priority),this.classManager.activeName);
    return record?[`Defined highlight: {${record.pattern}} => {${record.style}} [priority ${record.priority}]`]:[`Highlights need a valid pattern and style, and the definition limit may not be exceeded. Use ${this.clientCommand('highlight add {pattern} {style}')} for patterns named list, show, delete, enable, or disable.`];
  }

  handleUnsubstituteCommand(tokens, source = null, options = {}) {
    const rawPattern = tokens.join(' ');
    if (!rawPattern) return [this.usage('unsubstitute {pattern}')];
    const expanded = (!source || options.variablesExpanded)
      ? { value: rawPattern, error: '' }
      : this.expandFunctionAndVariables(rawPattern, source, options);
    if (expanded.error) return [expanded.error];
    const pattern = String(expanded.value || '').trim();
    const matches = this.substituteEngine.list().filter((record) => tinTinDefinitionMatches(record.pattern, pattern));
    if (!matches.length) return [`Unknown substitute: ${pattern}.`];
    for (const record of matches) this.substituteEngine.delete(record.pattern);
    return matches.length === 1
      ? [`Deleted substitute: ${normalizeSubstitutePattern(matches[0].pattern)}`]
      : [`Deleted ${matches.length} substitutes matching ${pattern}.`];
  }

  handleSubstituteCommand(tokens, source = null, options = {}) {
    const operation=normalizeToken(tokens[0]);
    const expandSelector=(value)=>(!source||options.variablesExpanded)?{value:String(value??''),error:''}:this.expandFunctionAndVariables(value,source,options);
    if(!operation||(!options.firstArgumentBraced&&operation==='list')){const records=this.substituteEngine.list();return records.length?records.map((record)=>this.formatSubstitute(record)):['No substitutes are defined.'];}
    if(!options.firstArgumentBraced&&operation==='show'){const raw=tokens.slice(1).join(' ');const e=expandSelector(raw);if(e.error)return[e.error];const r=this.substituteEngine.get(e.value);return r?[this.formatSubstitute(r)]:[raw?`Unknown substitute: ${e.value}.`:this.usage('substitute show {pattern}')];}
    if(!options.firstArgumentBraced&&(operation==='delete'||operation==='remove')){const raw=tokens.slice(1).join(' ');if(!raw)return[this.usage('substitute delete {pattern}')];const e=expandSelector(raw);if(e.error)return[e.error];return[this.substituteEngine.delete(e.value)?`Deleted substitute: ${normalizeSubstitutePattern(e.value)}`:`Unknown substitute: ${e.value}.`];}
    if(!options.firstArgumentBraced&&(operation==='enable'||operation==='disable')){const raw=tokens.slice(1).join(' ');if(!raw)return[this.usage(`substitute ${operation} {pattern}`)];const e=expandSelector(raw);if(e.error)return[e.error];const r=this.substituteEngine.setSubstituteEnabled(e.value,operation==='enable');return r?[`Substitute ${operation==='enable'?'enabled':'disabled'}: ${r.pattern}`]:[`Unknown substitute: ${e.value}.`];}
    if(tokens.length===1){const e=expandSelector(tokens[0]);if(e.error)return[e.error];const records=this.substituteEngine.list().filter((record)=>tinTinDefinitionMatches(record.pattern,e.value));return records.length?records.map((record)=>this.formatSubstitute(record)):[`Unknown substitute: ${e.value}.`];}
    const definitionTokens=!options.firstArgumentBraced&&(operation==='add'||operation==='define')?tokens.slice(1):tokens;
    const e=expandSelector(definitionTokens[0]);if(e.error)return[e.error];const pattern=e.value,replacement=definitionTokens[1],priority=definitionTokens[2];
    if(!pattern||replacement===undefined||definitionTokens.length>3)return[this.usage('substitute {pattern} {replacement} {priority 1-9}')];
    const record=this.substituteEngine.define(pattern,replacement,normalizeSubstitutePriority(priority),this.classManager.activeName);
    return record?[`Defined substitute: {${record.pattern}} => {${record.replacement}} [priority ${record.priority}]`]:[`Substitutes need a valid non-empty pattern, and the definition limit may not be exceeded. Use ${this.clientCommand('substitute add {pattern} {replacement}')} for patterns named list, show, delete, enable, or disable.`];
  }

  handleUnmacroCommand(tokens, source = null, options = {}) {
    const rawKey=tokens.join(' ');if(!rawKey)return[this.usage('unmacro {key}')];
    const expanded=(!source||options.variablesExpanded)?{value:rawKey,error:''}:this.expandFunctionAndVariables(rawKey,source,options);if(expanded.error)return[expanded.error];
    const key=String(expanded.value||'').trim();const hasWildcard=/%(?:[*?]|%)/u.test(key);
    if(!hasWildcard){const parsed=parseMacroKey(key);if(parsed.error)return[parsed.error];return[this.macroEngine.delete(key)?`Deleted macro: ${parsed.key}`:`Unknown macro: ${parsed.key}.`];}
    const matches=this.macroEngine.list().filter((record)=>tinTinDefinitionMatches(record.key,key)||tinTinDefinitionMatches(record.label,key));if(!matches.length)return[`Unknown macro: ${key}.`];for(const record of matches)this.macroEngine.delete(record.key);return matches.length===1?[`Deleted macro: ${matches[0].key}`]:[`Deleted ${matches.length} macros matching ${key}.`];
  }

  handleMacroCommand(tokens, source = null, options = {}) {
    const operation = normalizeToken(tokens[0]);
    const expandSelector = (value) => (!source || options.variablesExpanded)
      ? { value: String(value ?? ''), error: '' }
      : this.expandFunctionAndVariables(value, source, options);
    if (!operation || (!options.firstArgumentBraced && operation === 'list')) {
      const macros = this.macroEngine.list();
      return macros.length > 0
        ? macros.map((record) => this.formatMacro(record))
        : ['No macros are defined.'];
    }

    if (!options.firstArgumentBraced && operation === 'show') {
      const rawKey = tokens.slice(1).join(' ');
      if (!rawKey) return [this.usage('macro show {key}')];
      const expanded = expandSelector(rawKey);
      if (expanded.error) return [expanded.error];
      const key = expanded.value;
      const parsed = parseMacroKey(key);
      if (parsed.error) return [parsed.error];
      const record = this.macroEngine.get(key);
      return record ? [this.formatMacro(record)] : [`Unknown macro: ${parsed.key}.`];
    }

    if (!options.firstArgumentBraced && (operation === 'delete' || operation === 'remove')) {
      return this.handleUnmacroCommand(tokens.slice(1), source, options);
    }

    if (!options.firstArgumentBraced && (operation === 'enable' || operation === 'disable')) {
      const rawKey = tokens.slice(1).join(' ');
      if (!rawKey) return [this.usage(`macro ${operation} {key}`)];
      const expanded = expandSelector(rawKey);
      if (expanded.error) return [expanded.error];
      const key = expanded.value;
      const parsed = parseMacroKey(key);
      if (parsed.error) return [parsed.error];
      const record = this.macroEngine.setMacroEnabled(key, operation === 'enable');
      return record
        ? [`Macro ${operation === 'enable' ? 'enabled' : 'disabled'}: ${record.key}`]
        : [`Unknown macro: ${parsed.key}.`];
    }

    if (tokens.length === 1) {
      const expanded = expandSelector(tokens[0]);
      if (expanded.error) return [expanded.error];
      const records = this.macroEngine.list().filter((record) => tinTinDefinitionMatches(record.key, expanded.value));
      if (records.length) return records.map((record) => this.formatMacro(record));
      const parsedKey = parseMacroKey(expanded.value);
      return [parsedKey.error || `Unknown macro: ${parsedKey.key}.`];
    }

    const definitionTokens = operation === 'add' || operation === 'define'
      ? tokens.slice(1)
      : tokens;
    const expanded = expandSelector(definitionTokens[0]);
    if (expanded.error) return [expanded.error];
    const key = expanded.value;
    const command = definitionTokens.slice(1).join(' ');
    if (!key || !command) return [this.usage('macro {key} {command; command; ...}')];
    const parsed = parseMacroKey(key);
    if (parsed.error) return [parsed.error];
    const record = this.macroEngine.define(key, command, this.classManager.activeName);
    return record
      ? [`Defined macro: {${record.key}} => {${record.command}}`]
      : [`Macros need a supported key and 1 through 32 valid semicolon-separated commands. Use ${this.clientCommand('macro add {key} {commands}')} for a key named list, show, delete, enable, or disable.`];
  }

  handleDebugCommand(tokens, source) {
    const primary = normalizeToken(tokens[0]);
    const operation = primary === 'pipeline' ? normalizeToken(tokens[1]) : primary;
    const status = source.pipelineDebug.status();

    if (!operation || operation === 'status') {
      return [`Pipeline debug is ${status.enabled ? 'ON' : 'OFF'} for ${source.name}; ${status.count}/${status.maxEntries} entries retained. Use ${this.clientCommand('debug pipeline {on|off|show|clear}')}.`];
    }
    if (operation === 'on' || operation === 'enable') {
      this.setPipelineDebug(source.id, { enabled: true });
      return [`Pipeline debug enabled for ${source.name}. Review it in the Protocol panel.`];
    }
    if (operation === 'off' || operation === 'disable') {
      this.setPipelineDebug(source.id, { enabled: false });
      return [`Pipeline debug disabled for ${source.name}.`];
    }
    if (operation === 'clear') {
      const cleared = status.count;
      this.clearPipelineDebug(source.id);
      return [`Cleared ${cleared} pipeline debug entr${cleared === 1 ? 'y' : 'ies'} for ${source.name}.`];
    }
    if (operation === 'show' || operation === 'list') {
      const entries = source.pipelineDebug.snapshot().entries.slice(-20);
      return entries.length > 0
        ? entries.map(formatPipelineDebugEntry)
        : [`No pipeline debug entries are stored for ${source.name}.`];
    }
    return [this.usage('debug pipeline {on|off|status|show|clear}')];
  }

  pendingSpeedwalkSteps(session) {
    return session?.queue?.countSource('speedwalk') || 0;
  }

  handleSpeedwalkCommand(tokens, source) {
    const operation = normalizeToken(tokens[0]);
    if (!operation || operation === 'status') {
      const pending = this.pendingSpeedwalkSteps(source);
      return [`Speedwalk is ${this.speedwalkEnabled ? 'ON' : 'OFF'}. ${pending} pending step${pending === 1 ? '' : 's'} for ${source.name}.`];
    }
    if (operation === 'on' || operation === 'enable') {
      this.speedwalkEnabled = true;
      return ['Speedwalk enabled. Compact routes such as eeennnee and 4e3s19e will be sent one room at a time.'];
    }
    if (operation === 'off' || operation === 'disable') {
      this.speedwalkEnabled = false;
      const cancelled = source.queue.clearSource('speedwalk');
      return [`Speedwalk disabled for ${source.name}.${cancelled ? ` ${cancelled} pending step${cancelled === 1 ? '' : 's'} cancelled.` : ''}`];
    }
    if (operation === 'stop' || operation === 'cancel') {
      const cancelled = source.queue.clearSource('speedwalk');
      return [cancelled
        ? `Speedwalk stopped for ${source.name}; ${cancelled} pending step${cancelled === 1 ? '' : 's'} cancelled.`
        : `No speedwalk steps are pending for ${source.name}.`];
    }
    return [this.usage('speedwalk {on|off|status|stop}')];
  }

  normalizeTinTinListFamily(value) {
    const token = normalizeToken(value);
    if (!token) return '';
    const singularAliases = {
      substitution: 'substitute', highlight: 'highlight', ticker: 'ticker', delay: 'delay',
      event: 'event', action: 'action', alias: 'alias', gag: 'gag', macro: 'macro', prompt: 'prompt',
      tab: 'tab', variable: 'variable', function: 'function', path: 'path', pathdir: 'pathdir',
      class: 'class', config: 'config', configuration: 'config', history: 'history'
    };
    if (singularAliases[token]) return singularAliases[token];
    const exact = TINTIN_VISIBLE_LIST_FAMILIES.find(([plural, family]) => token === plural || token === family);
    if (exact) return exact[1];
    const matches = new Set(TINTIN_VISIBLE_LIST_FAMILIES
      .filter(([plural]) => plural.startsWith(token))
      .map(([, family]) => family));
    return matches.size === 1 ? [...matches][0] : '';
  }

  resolveTinTinListFamilies(value) {
    const token = normalizeToken(value);
    if (!token) return [];
    if (token === 'all') return TINTIN_VISIBLE_LIST_FAMILIES.map(([, family]) => family);
    return TINTIN_VISIBLE_LIST_FAMILIES
      .filter(([plural]) => plural.startsWith(token))
      .map(([, family]) => family);
  }

  tintinListControl(familyValue) {
    const family = this.normalizeTinTinListFamily(familyValue);
    if (!family) return null;
    const controls = this.activeTinTinContext().listControls instanceof Map
      ? this.activeTinTinContext().listControls
      : (this.activeTinTinContext().listControls = new Map());
    if (!controls.has(family)) controls.set(family, { ignore: false, message: true });
    return controls.get(family);
  }

  tintinListIgnored(familyValue) {
    return this.tintinListControl(familyValue)?.ignore === true;
  }

  tintinListMessagesEnabled(familyValue) {
    return this.tintinListControl(familyValue)?.message !== false;
  }

  setTinTinListIgnore(familyValue, enabled) {
    const family = this.normalizeTinTinListFamily(familyValue);
    const control = this.tintinListControl(family);
    if (!control) return false;
    control.ignore = Boolean(enabled);
    const engine = ({
      action: this.actionEngine, gag: this.gagEngine, highlight: this.highlightEngine,
      substitute: this.substituteEngine, macro: this.macroEngine, event: this.eventEngine
    })[family];
    if (engine && Object.prototype.hasOwnProperty.call(engine, 'enabled')) engine.enabled = !control.ignore;
    return true;
  }

  handleTinTinListFlagCommand(tokens, flagName) {
    if (!tokens.length) {
      return TINTIN_VISIBLE_LIST_FAMILIES.map(([plural, family]) => {
        const control = this.tintinListControl(family);
        return `${plural.toUpperCase()} ${flagName.toUpperCase()} ${control?.[flagName] ? 'ON' : 'OFF'}`;
      });
    }
    const targets = this.resolveTinTinListFamilies(tokens[0]);
    if (!targets.length) return [`Unknown TinTin list family: ${tokens[0]}.`];
    const rawMode = normalizeToken(tokens[1]);
    let mode = '';
    if (rawMode) {
      if ('on'.startsWith(rawMode)) mode = 'on';
      else if ('off'.startsWith(rawMode)) mode = 'off';
      else return [this.usage(`${flagName} {list|all} [on|off]`)];
    }
    if (tokens.length > 2) return [this.usage(`${flagName} {list|all} [on|off]`)];
    const lines = [];
    for (const family of targets) {
      const control = this.tintinListControl(family);
      const next = !mode ? !control[flagName] : mode === 'on';
      if (flagName === 'ignore') this.setTinTinListIgnore(family, next);
      else control.message = next;
      lines.push(`${family.toUpperCase()} ${flagName.toUpperCase()} ${next ? 'ON' : 'OFF'}.`);
    }
    return lines;
  }

  variableExpansion(value, options = {}) {
    const locals = new Map();
    const protocolVariables = this.activeTinTinContext()?.protocolVariables;
    if (protocolVariables instanceof Map) {
      for (const [name, localValue] of protocolVariables) locals.set(name, localValue);
    }
    if (options.eventLocals instanceof Map) {
      for (const [name, localValue] of options.eventLocals) locals.set(name, localValue);
    }
    if (options.functionFrame?.locals instanceof Map) {
      for (const [name, localValue] of options.functionFrame.locals) locals.set(name, localValue);
    }
    return this.variableEngine.expand(value, { locals });
  }

  tinTinVariableEventTarget(nameValue) {
    const name = normalizeVariableName(nameValue);
    const path = parseVariablePath(name);
    return path?.base || name;
  }

  tinTinTableEventValue(nameValue) {
    const target = this.tinTinVariableEventTarget(nameValue);
    if (!target) return '';
    const entries = this.variableEngine.tableEntries(target);
    if (entries.length) {
      return entries.map((entry) => `{${entry.key}}{${entry.record.value}}`).join('');
    }
    return String(this.variableEngine.get(target)?.value || '');
  }

  fireTinTinVariableUpdate(session, nameValue, valueValue, options = {}) {
    if (!session || options.suppressVariableUpdateEvent === true) return { fired: false, deliveries: [], messages: [] };
    const target = this.tinTinVariableEventTarget(nameValue);
    if (!target) return { fired: false, deliveries: [], messages: [] };
    const value = valueValue === undefined ? this.tinTinTableEventValue(target) : String(valueValue ?? '');
    return this.fireTinTinEvent(session, `VARIABLE UPDATE ${target}`, [target, value], { eventDepth: Number(options.eventDepth || 0) });
  }

  replaceLuaTable(reference, nameValue, recordsValue, options = {}) {
    const session = this.findSession(reference);
    if (!session) return null;
    return this.withTinTinSession(session, () => {
      const name = normalizeVariableName(nameValue);
      if (!name) return null;
      const records = Array.isArray(recordsValue) ? recordsValue : [];
      const probe = new VariableEngine({
        maxVariables: this.variableEngine.maxVariables,
        maxExpansionDepth: this.variableEngine.maxExpansionDepth,
        maxExpandedLength: this.variableEngine.maxExpandedLength,
        variables: this.variableEngine.list()
      });
      const preview = probe.replaceTableTree(name, records, this.variableAssignmentClass(name));
      if (!preview) return null;
      if (options.suppressVariableUpdateEvent !== true) {
        this.fireTinTinVariableUpdate(session, name, String(probe.get(name)?.value || ''), options);
      }
      return this.variableEngine.replaceTableTree(name, records, this.variableAssignmentClass(name));
    });
  }

  assignVariable(nameValue, valueValue, options = {}) {
    const name = normalizeVariableName(nameValue);
    if (!name) return null;
    const frame = options.functionFrame;
    if (frame && (frame.locals.has(name) || name === 'result')) {
      const value = normalizeVariableValue(valueValue);
      frame.locals.set(name, value);
      if (name === 'result') frame.resultSet = true;
      return { name, value, scope: 'local' };
    }
    const nextValue = normalizeVariableValue(valueValue);
    // TinTin's VARIABLE UPDATE hook runs before set_nest_node commits the new
    // value. This lets veteran Event bodies inspect the old value while %0/%1
    // carry the variable name and proposed value.
    if (options.suppressVariableUpdateEvent !== true) {
      const session = this.sessionForActiveTinTinContext();
      if (session) this.fireTinTinVariableUpdate(session, name, nextValue, options);
    }
    return this.variableEngine.define(name, nextValue, this.variableAssignmentClass(name));
  }

  expandFunctions(inputValue, source, options = {}) {
    const sourceText = String(inputValue ?? '');
    const context = options.functionContext || { stack: [], calls: 0 };
    let output = '';

    for (let index = 0; index < sourceText.length;) {
      if (sourceText[index] === '\\' && sourceText[index + 1] === '@') {
        output += LITERAL_AT_SENTINEL;
        index += 2;
        continue;
      }
      if (sourceText[index] === '@' && sourceText[index + 1] === '@') {
        output += LITERAL_AT_SENTINEL;
        index += 2;
        continue;
      }
      if (sourceText[index] !== '@') {
        output += sourceText[index];
        index += 1;
        continue;
      }

      const call = functionCallAt(sourceText, index, { maxArguments: DEFAULT_MAX_FUNCTION_ARGUMENTS });
      if (!call) {
        output += '@';
        index += 1;
        continue;
      }
      if (call.error) return { value: '', expanded: false, error: call.error };
      const record = this.functionEngine.get(call.name);
      if (!record) return { value: '', expanded: false, error: `Unknown function: @${call.name}.` };
      if (context.stack.includes(record.name)) {
        const loop = [...context.stack.slice(context.stack.indexOf(record.name)), record.name];
        return { value: '', expanded: false, error: `Function expansion stopped: recursive loop ${loop.join(' -> ')}.` };
      }
      if (context.stack.length >= this.maxFunctionDepth) {
        return { value: '', expanded: false, error: `Function expansion stopped: maximum depth of ${this.maxFunctionDepth} exceeded.` };
      }
      context.calls += 1;
      if (context.calls > this.maxFunctionCalls) {
        return { value: '', expanded: false, error: `Function expansion stopped: maximum of ${this.maxFunctionCalls} calls exceeded.` };
      }

      const args = [];
      for (const rawArgument of call.arguments) {
        const nested = this.expandFunctions(rawArgument, source, {
          ...options,
          functionContext: context
        });
        if (nested.error) return nested;
        const variables = this.variableExpansion(nested.value, options);
        if (variables.error) return { value: '', expanded: false, error: variables.error };
        args.push(variables.value);
      }

      context.stack.push(record.name);
      const executed = this.executeFunction(record, args, source, {
        ...options,
        functionContext: context
      });
      context.stack.pop();
      if (executed.error) return { value: '', expanded: false, error: executed.error };
      output += executed.value;
      index = call.end;
      if (output.length > FUNCTION_OUTPUT_MAX) {
        return { value: '', expanded: false, error: `Function expansion stopped: output exceeded ${FUNCTION_OUTPUT_MAX} characters.` };
      }
    }

    return {
      value: output.replaceAll(LITERAL_AT_SENTINEL, '@'),
      expanded: output !== sourceText,
      error: ''
    };
  }

  expandFunctionAndVariables(inputValue, source, options = {}) {
    const functions = this.expandFunctions(inputValue, source, options);
    if (functions.error) return functions;
    const variables = this.variableExpansion(functions.value, options);
    if (variables.error) return { value: '', expanded: false, error: variables.error };
    return {
      value: variables.value,
      expanded: functions.expanded || variables.expanded,
      error: ''
    };
  }

  splitConditionalBranchCommands(commandValue, label = 'Conditional branch') {
    const parsed = splitTopLevelCommands(commandValue, {
      maxCommands: DEFAULT_MAX_CONDITIONAL_COMMANDS,
      preserveEscapedSemicolon: true,
      commandPrefix: this.commandPrefix
    });
    if (!parsed.errorCode) return { commands: parsed.commands, error: '' };
    const messages = {
      empty: `${label} cannot be empty.`,
      'too-many': `${label} may contain at most ${DEFAULT_MAX_CONDITIONAL_COMMANDS} commands.`,
      'unfinished-escape': `${label} ends with an unfinished escape.`,
      'unterminated-quote': `${label} has an unterminated quote.`,
      'unterminated-brace': `${label} has an unterminated brace.`,
      'unmatched-closing-brace': `${label} has an unmatched closing brace.`
    };
    return { commands: [], error: messages[parsed.errorCode] || `${label} is invalid.` };
  }

  evaluateConditionalExpression(conditionValue, source, options = {}) {
    const expanded = this.expandFunctionAndVariables(conditionValue, source, {
      ...options,
      variablesExpanded: false
    });
    if (expanded.error) return { matched: false, expression: '', error: expanded.error };
    const result = evaluateTinTinCondition(expanded.value, {
      evaluateNumeric: (expression) => evaluateMathExpression(expression)
    });
    if (!result.ok) return { matched: false, expression: expanded.value, error: result.error };
    const matched = Boolean(result.value);
    this.tracePipeline(source, 'conditional', () => `${expanded.value} => ${matched ? 'TRUE' : 'FALSE'}`);
    return { matched, expression: expanded.value, error: '' };
  }

  selectConditionalBranch(chain, source, options = {}) {
    for (const branch of chain.branches || []) {
      const evaluated = this.evaluateConditionalExpression(branch.condition, source, options);
      if (evaluated.error) return { commands: '', directive: branch.directive, error: evaluated.error };
      if (evaluated.matched) {
        return { commands: branch.commands, directive: branch.directive, error: '' };
      }
    }
    return { commands: chain.fallback || '', directive: chain.fallback ? 'else' : '', error: '' };
  }

  dispatchCommandSequence(sourceReference, commandValues, options = {}) {
    let source = this.findSession(sourceReference) || sourceReference;
    if (!source) return { handled: true, deliveries: [], messages: ['No active session.'], activateSessionId: '', snapshot: this.snapshot() };
    const commands = Array.isArray(commandValues) ? commandValues : [];
    const depth = Math.max(0, Math.trunc(Number(options.conditionalDepth) || 0));
    if (depth > DEFAULT_MAX_CONDITIONAL_DEPTH) {
      return {
        handled: true,
        deliveries: [],
        messages: [`Conditional nesting may not exceed ${DEFAULT_MAX_CONDITIONAL_DEPTH} levels.`],
        activateSessionId: '',
        snapshot: this.snapshot()
      };
    }

    const deliveries = [];
    const messages = [];
    let handled = true;
    let activateSessionId = '';
    let controlFlow = '';

    for (let index = 0; index < commands.length;) {
      const statement = parseConditionalStatement(commands[index], this.commandPrefix);
      if (statement.matched && statement.directive === 'if') {
        const chain = collectConditionalChain(commands, index, this.commandPrefix, {
          maxBranches: DEFAULT_MAX_CONDITIONAL_BRANCHES
        });
        index = chain.nextIndex;
        if (chain.error) {
          messages.push(chain.error);
          continue;
        }
        const selected = this.selectConditionalBranch(chain, source, options);
        if (selected.error) {
          messages.push(selected.error);
          continue;
        }
        this.tracePipeline(source, 'conditional-branch', () => selected.directive
          ? `${selected.directive.toUpperCase()} selected: ${selected.commands}`
          : 'No conditional branch selected.');
        if (!selected.commands) continue;
        const branch = this.splitConditionalBranchCommands(selected.commands);
        if (branch.error) {
          messages.push(branch.error);
          continue;
        }
        const result = this.dispatchCommandSequence(source, branch.commands, {
          ...options,
          conditionalDepth: depth + 1
        });
        deliveries.push(...result.deliveries);
        messages.push(...result.messages);
        handled = handled && result.handled;
        if (result.activateSessionId) {
          activateSessionId = result.activateSessionId;
          source = this.findSession(result.activateSessionId) || source;
        }
        if (result.controlFlow) {
          controlFlow = result.controlFlow;
          break;
        }
        continue;
      }
      if (statement.matched) {
        messages.push(`${this.clientCommand(statement.directive)} must immediately follow a false ${this.clientCommand('if')} or ${this.clientCommand('elseif')} in the same command list.`);
        index += 1;
        continue;
      }

      const result = this.dispatchCommand(source, commands[index], options);
      deliveries.push(...result.deliveries);
      messages.push(...result.messages);
      handled = handled && result.handled;
      if (result.activateSessionId) {
        activateSessionId = result.activateSessionId;
        source = this.findSession(result.activateSessionId) || source;
      }
      if (result.controlFlow) {
        controlFlow = result.controlFlow;
        break;
      }
      index += 1;
    }

    return { handled, deliveries, messages, activateSessionId, controlFlow, snapshot: this.snapshot() };
  }

  prepareActionSequence(commandValues, source, options = {}) {
    const commands = Array.isArray(commandValues) ? commandValues : [];
    const depth = Math.max(0, Math.trunc(Number(options.conditionalDepth) || 0));
    if (depth > DEFAULT_MAX_CONDITIONAL_DEPTH) {
      return { commands: [], error: `Action blocked: conditional nesting exceeds ${DEFAULT_MAX_CONDITIONAL_DEPTH} levels.` };
    }
    const prepared = [];
    for (let index = 0; index < commands.length;) {
      const statement = parseConditionalStatement(commands[index], this.commandPrefix);
      if (statement.matched && statement.directive === 'if') {
        const chain = collectConditionalChain(commands, index, this.commandPrefix, {
          maxBranches: DEFAULT_MAX_CONDITIONAL_BRANCHES
        });
        index = chain.nextIndex;
        if (chain.error) return { commands: [], error: `Action blocked: ${chain.error}` };
        const selected = this.selectConditionalBranch(chain, source, options);
        if (selected.error) return { commands: [], error: `Action blocked: ${selected.error}` };
        if (!selected.commands) continue;
        const branch = this.splitConditionalBranchCommands(selected.commands, 'Action conditional branch');
        if (branch.error) return { commands: [], error: `Action blocked: ${branch.error}` };
        const nested = this.prepareActionSequence(branch.commands, source, {
          ...options,
          conditionalDepth: depth + 1
        });
        if (nested.error) return nested;
        prepared.push(...nested.commands);
      } else if (statement.matched) {
        return { commands: [], error: `Action blocked: standalone ${this.clientCommand(statement.directive)} has no preceding false conditional.` };
      } else {
        const next = this.prepareActionCommands(commands[index], source, options);
        if (next.error) return next;
        prepared.push(...next.commands);
        index += 1;
      }
      if (prepared.length > DEFAULT_MAX_ACTION_COMMANDS) {
        return { commands: [], error: `Action blocked: the selected branch expands beyond ${DEFAULT_MAX_ACTION_COMMANDS} commands.` };
      }
    }
    return { commands: prepared, error: '' };
  }

  executeFunctionCommandSequence(record, commandsValue, frame, source, options = {}, depth = 0) {
    const commands = Array.isArray(commandsValue) ? commandsValue : [];
    if (depth > DEFAULT_MAX_CONDITIONAL_DEPTH) {
      return { error: `Function @${record.name}: conditional nesting exceeds ${DEFAULT_MAX_CONDITIONAL_DEPTH} levels.` };
    }

    for (let index = 0; index < commands.length;) {
      const statement = parseConditionalStatement(commands[index], this.commandPrefix);
      if (statement.matched && statement.directive === 'if') {
        const chain = collectConditionalChain(commands, index, this.commandPrefix, {
          maxBranches: DEFAULT_MAX_CONDITIONAL_BRANCHES
        });
        index = chain.nextIndex;
        if (chain.error) return { error: `Function @${record.name}: ${chain.error}` };
        const selected = this.selectConditionalBranch(chain, source, {
          ...options,
          functionFrame: frame
        });
        if (selected.error) return { error: selected.error };
        if (!selected.commands) continue;
        const branch = this.splitConditionalBranchCommands(selected.commands, `Function @${record.name} conditional branch`);
        if (branch.error) return { error: branch.error };
        const nested = this.executeFunctionCommandSequence(record, branch.commands, frame, source, options, depth + 1);
        if (nested.error || frame.returned) return nested;
        continue;
      }
      if (statement.matched) {
        return { error: `Function @${record.name}: standalone #${statement.directive} has no preceding false conditional.` };
      }

      frame.commandsExecuted += 1;
      if (frame.commandsExecuted > DEFAULT_MAX_FUNCTION_COMMANDS) {
        return { error: `Function @${record.name} may execute at most ${DEFAULT_MAX_FUNCTION_COMMANDS} commands.` };
      }
      const positionalCommand = String(commands[index] || '').trim();
      index += 1;
      const prefix = ['#', '~', '^', '/', '`', "'"].find((candidate) => positionalCommand.startsWith(candidate)) || '';
      if (!prefix) {
        return { error: `Function @${record.name} blocked: only local variables, bounded math/format/list-find/regex/switch/foreach/conditionals, and #return are allowed.` };
      }
      const parsed = firstDirective(positionalCommand, prefix);
      const directive = parsed?.directive || '';
      if (!['local', 'unlocal', 'variable', 'unvariable', 'math', 'format', 'foreach', 'list', 'regex', 'switch', 'return'].includes(directive)) {
        return { error: `Function @${record.name} blocked: #${directive || 'unknown'} is not allowed inside Functions.` };
      }
      const tokens = tokenizeBraced(parsed.body, { preserveEscapedSemicolon: true });
      const childOptions = {
        ...options,
        functionFrame: frame,
        variablesExpanded: false
      };

      if (directive === 'switch') {
        if (tokens.length !== 2) return { error: `Function @${record.name}: ${this.usage('switch {value} {#case {value} {commands}; #default {commands}}')}` };
        const selected = this.switchComparable(tokens[0], source, childOptions);
        if (selected.error) return { error: selected.error };
        const branches = splitTopLevelCommands(tokens[1], { maxCommands: 64, preserveEscapedSemicolon: true, commandPrefix: this.commandPrefix });
        if (branches.errorCode) return { error: `Function @${record.name}: Switch branch list is invalid.` };
        let fallback = '';
        let chosen = '';
        for (const branchValue of branches.commands) {
          const branchParsed = firstDirective(branchValue, this.commandPrefix);
          const branchTokens = tokenizeBraced(branchParsed?.body || '', { preserveEscapedSemicolon: true });
          if (branchParsed?.directive === 'case') {
            if (branchTokens.length !== 2) return { error: `Function @${record.name}: Switch CASE needs a value and command body.` };
            const candidate = this.switchComparable(branchTokens[0], source, childOptions);
            if (candidate.error) return { error: candidate.error };
            if (!chosen && candidate.value === selected.value) chosen = branchTokens[1];
          } else if (branchParsed?.directive === 'default') {
            if (branchTokens.length !== 1) return { error: `Function @${record.name}: Switch DEFAULT needs one command body.` };
            fallback = branchTokens[0];
          } else {
            return { error: `Function @${record.name}: Switch bodies may contain only #CASE and #DEFAULT.` };
          }
        }
        const selectedBody = chosen || fallback;
        if (!selectedBody) continue;
        const selectedCommands = splitTopLevelCommands(selectedBody, { maxCommands: DEFAULT_MAX_FUNCTION_COMMANDS, preserveEscapedSemicolon: true, commandPrefix: this.commandPrefix });
        if (selectedCommands.errorCode) return { error: `Function @${record.name}: selected Switch branch is invalid.` };
        const nested = this.executeFunctionCommandSequence(record, selectedCommands.commands, frame, source, options, depth + 1);
        if (nested.error || frame.returned) return nested;
        continue;
      }

      if (directive === 'list') {
        if (tokens.length !== 4 || !['find'].includes(normalizeToken(tokens[1]))) {
          return { error: `Function @${record.name}: only read-only #LIST FIND is allowed inside Functions.` };
        }
        const baseExpanded = this.expandFunctionAndVariables(tokens[0], source, childOptions);
        if (baseExpanded.error) return { error: baseExpanded.error };
        const base = normalizeVariableName(baseExpanded.value);
        if (!base) return { error: `Function @${record.name}: invalid List path.` };
        const searched = this.expandFunctionAndVariables(tokens[2], source, childOptions);
        if (searched.error) return { error: searched.error };
        const resultName = normalizeSimpleVariableName(tokens[3]);
        if (!resultName) return { error: `Function @${record.name}: List FIND result must be a simple variable.` };
        const entries = this.variableEngine.tableEntries(base);
        const found = entries.findIndex((entry) => String(entry.record.value) === String(searched.value));
        frame.locals.set(resultName, String(found >= 0 ? found + 1 : 0));
        continue;
      }

      if (directive === 'regex') {
        if (tokens.length !== 3) return { error: `Function @${record.name}: ${this.usage('regex {text} {pattern} {commands}')}` };
        const text = this.expandFunctionAndVariables(tokens[0], source, childOptions);
        if (text.error) return { error: text.error };
        const pattern = this.expandFunctionAndVariables(tokens[1], source, childOptions);
        if (pattern.error) return { error: pattern.error };
        const tested = this.matchTinTinRegex(text.value, pattern.value);
        if (tested.error) return { error: `Function @${record.name}: ${tested.error}` };
        if (!tested.matched) continue;
        const captures = {};
        for (let captureIndex = 0; captureIndex < Math.min(100, tested.match?.length || 0); captureIndex += 1) captures[captureIndex] = tested.match[captureIndex] ?? '';
        const body = substituteActionCommand(tokens[2], tested.match?.[0] || '', captures);
        const regexCommands = splitTopLevelCommands(body, { maxCommands: DEFAULT_MAX_FUNCTION_COMMANDS, preserveEscapedSemicolon: true, commandPrefix: this.commandPrefix });
        if (regexCommands.errorCode) return { error: `Function @${record.name}: Regex command body is invalid.` };
        const nested = this.executeFunctionCommandSequence(record, regexCommands.commands, frame, source, options, depth + 1);
        if (nested.error || frame.returned) return nested;
        continue;
      }

      if (directive === 'local' || directive === 'variable') {
        if (!tokens[0]) return { error: `Function @${record.name}: ${this.usage('variable {name} {value}')}` };
        const name = normalizeVariableName(tokens[0]);
        if (!name || parseVariablePath(name)?.keys.length) return { error: `Function @${record.name}: invalid local variable name.` };
        const expanded = this.expandFunctionAndVariables(tokens.slice(1).join(' '), source, childOptions);
        if (expanded.error) return { error: expanded.error };
        frame.locals.set(name, normalizeVariableValue(expanded.value));
        if (name === 'result') frame.resultSet = true;
        this.tracePipeline(source, 'function-local', () => `@${record.name}: ${name} = ${frame.locals.get(name)}`);
      } else if (directive === 'unlocal' || directive === 'unvariable') {
        if (!tokens[0]) return { error: `Function @${record.name}: ${this.usage('unlocal {name}')}` };
        const name = normalizeVariableName(tokens[0]);
        if (!name) return { error: `Function @${record.name}: invalid local variable name.` };
        frame.locals.delete(name);
        if (name === 'result') frame.resultSet = false;
      } else if (directive === 'math') {
        if (tokens.length < 2) return { error: `Function @${record.name}: ${this.usage('math {variable} {expression}')}` };
        const name = normalizeVariableName(tokens[0]);
        if (!name) return { error: `Function @${record.name}: invalid Math variable name.` };
        const expanded = this.expandFunctionAndVariables(tokens.slice(1).join(' '), source, childOptions);
        if (expanded.error) return { error: expanded.error };
        const result = evaluateMathExpression(expanded.value);
        if (result.error) return { error: result.error };
        if (!this.assignVariable(name, result.text, childOptions)) {
          return { error: `Function @${record.name}: Math could not store ${name}.` };
        }
      } else if (directive === 'format') {
        if (tokens.length < 2) return { error: `Function @${record.name}: ${this.usage('format {variable} {format} {arguments...}')}` };
        const name = normalizeVariableName(tokens[0]);
        if (!name) return { error: `Function @${record.name}: invalid Format variable name.` };
        const formatted = this.formatTinTinValue(tokens[1], tokens.slice(2), childOptions, 'Format');
        if (formatted.error) return { error: formatted.error };
        if (/\x1b\[[0-9;]*m/u.test(formatted.text)) {
          return { error: `Function @${record.name}: Format cannot store terminal color codes.` };
        }
        if (!this.assignVariable(name, formatted.text, childOptions)) {
          return { error: `Function @${record.name}: Format could not store ${name}.` };
        }
      } else if (directive === 'foreach') {
        if (tokens.length < 3) return { error: `Function @${record.name}: ${this.usage('foreach {list} {variable} {commands}')}` };
        const foreachVariable = normalizeVariableName(tokens[1]);
        if (!foreachVariable || parseVariablePath(foreachVariable)?.keys.length) {
          return { error: `Function @${record.name}: invalid Foreach variable name.` };
        }
        const list = this.foreachValues(tokens[0], source, childOptions);
        if (list.error) return { error: list.error };
        const foreachCommands = splitTopLevelCommands(tokens.slice(2).join(' '), {
          maxCommands: DEFAULT_MAX_FOREACH_COMMANDS,
          preserveEscapedSemicolon: true,
          commandPrefix: this.commandPrefix
        });
        if (foreachCommands.errorCode) return { error: `Function @${record.name}: invalid Foreach command body.` };
        for (const value of list.values) {
          frame.locals.set(foreachVariable, normalizeVariableValue(value));
          const nested = this.executeFunctionCommandSequence(record, foreachCommands.commands, frame, source, options, depth + 1);
          if (nested.error || frame.returned) return nested;
        }
      } else if (directive === 'return') {
        const expanded = this.expandFunctionAndVariables(tokens.join(' '), source, childOptions);
        if (expanded.error) return { error: expanded.error };
        frame.returned = true;
        frame.value = expanded.value;
        return { error: '' };
      }
    }
    return { error: '' };
  }

  executeFunction(record, argumentsValue, source, options = {}) {
    const variableSnapshot = this.variableEngine.list();
    const abort = (error) => {
      this.variableEngine.replaceAll(variableSnapshot);
      return { value: '', error: String(error || 'Function execution failed.') };
    };
    const body = substituteFunctionArguments(record.body, argumentsValue);
    const parsedBody = splitTopLevelCommands(body, {
      maxCommands: DEFAULT_MAX_FUNCTION_COMMANDS,
      preserveEscapedSemicolon: true,
      commandPrefix: this.commandPrefix
    });
    if (parsedBody.errorCode) {
      return abort(`Function @${record.name} has an invalid command body: ${parsedBody.errorCode}.`);
    }

    const frame = {
      name: record.name,
      locals: new Map([['result', '']]),
      resultSet: false,
      returned: false,
      value: ''
    };
    this.tracePipeline(source, 'function', () => `@${record.name}{${argumentsValue.join(';')}}`);

    frame.commandsExecuted = 0;
    const executedBody = this.executeFunctionCommandSequence(record, parsedBody.commands, frame, source, options);
    if (executedBody.error) return abort(executedBody.error);

    const value = frame.returned
      ? frame.value
      : (frame.resultSet ? String(frame.locals.get('result') ?? '') : '');
    if (value.length > FUNCTION_OUTPUT_MAX) {
      return abort(`Function @${record.name} returned more than ${FUNCTION_OUTPUT_MAX} characters.`);
    }
    this.tracePipeline(source, 'function-return', () => `@${record.name} => ${value}`);
    return { value, error: '' };
  }

  actionCommandIsSafe(command, options = {}) {
    if (!isClientCommand(command, this.commandPrefix)) return true;
    const parsed = firstDirective(command, this.commandPrefix);
    const repeatDirective = /^\d+$/u.test(String(parsed?.directive || ''));
    if (!parsed?.directive) return false;
    if (repeatDirective) {
      const repeatCount = Number(parsed.directive);
      return !options.repeatGenerated
        && Number.isSafeInteger(repeatCount)
        && repeatCount >= 1
        && repeatCount <= this.maxRepeatCommands
        && Boolean(String(parsed.body || '').trim());
    }
    if (parsed.directive === 'unaction' && options.actionPattern) {
      const tokens = tokenizeBraced(parsed.body, { preserveEscapedSemicolon: true });
      return tokens.length === 1 && String(tokens[0] || '').trim() === String(options.actionPattern || '').trim();
    }
    return !ACTION_MANAGEMENT_DIRECTIVES.has(parsed.directive);
  }


  prepareActionCommands(commandValue, source = null, options = {}) {
    const command = String(commandValue || '').trim();
    if (!command) return { commands: [], error: 'Action blocked: a generated command was empty.' };
    if (!this.actionCommandIsSafe(command, options)) {
      return { commands: [], error: 'Action blocked: client-management commands cannot be generated by actions.' };
    }

    const expansion = options.aliasExpanded || command.startsWith(this.commandPrefix)
      ? { matched: false, commands: [command], error: '' }
      : this.aliasEngine.expandCommands(command);
    if (expansion.error) return { commands: [], error: expansion.error };
    const aliasCommands = expansion.matched ? expansion.commands : [command];
    if (aliasCommands.length === 0 || aliasCommands.some((entry) => !String(entry || '').trim())) {
      return { commands: [], error: 'Action blocked: alias expansion produced an empty command.' };
    }
    if (expansion.matched) {
      return this.prepareActionSequence(aliasCommands, source, { ...options, aliasExpanded: true });
    }

    const commands = [];
    for (const aliasCommand of aliasCommands) {
      const parsed = isClientCommand(aliasCommand, this.commandPrefix)
        ? firstDirective(aliasCommand, this.commandPrefix)
        : null;
      const deferVariables = Boolean(parsed?.directive && DEFERRED_ACTION_VARIABLE_DIRECTIVES.has(parsed.directive));
      const variables = deferVariables
        ? { value: aliasCommand, error: '' }
        : this.expandFunctionAndVariables(aliasCommand, source, {});
      if (variables.error) return { commands: [], error: variables.error };
      const finalCommand = variables.value;
      if (!String(finalCommand || '').trim()) {
        return { commands: [], error: 'Action blocked: variable expansion produced an empty command.' };
      }
      if (!this.actionCommandIsSafe(finalCommand, options)) {
        return { commands: [], error: 'Action blocked: client-management commands cannot be generated by actions.' };
      }
      if (this.speedwalkEnabled && parseSpeedwalk(finalCommand, { maxSteps: this.maxSpeedwalkSteps }).matched) {
        return { commands: [], error: 'Action blocked: compact speedwalk routes cannot be generated by actions.' };
      }
      commands.push({ command: finalCommand, variablesExpanded: !deferVariables });
    }
    return { commands, error: '' };
  }

  actionCommandRateWeight(commandValue, depth = 0) {
    const command = String(commandValue || '').trim();
    if (!command) return 0;
    const parsed = isClientCommand(command, this.commandPrefix)
      ? firstDirective(command, this.commandPrefix)
      : null;
    if (parsed?.directive && ['variable', 'var', 'math', 'format', 'local', 'unlocal'].includes(parsed.directive)) {
      return 0;
    }
    if (parsed?.directive && /^\d+$/u.test(parsed.directive) && depth === 0) {
      const repeatCount = Number(parsed.directive);
      if (!Number.isSafeInteger(repeatCount) || repeatCount < 1 || repeatCount > this.maxRepeatCommands) {
        return DEFAULT_RATE_LIMIT + 1;
      }
      const repeatedCommand = String(parsed.body || '').trim();
      if (!repeatedCommand) return DEFAULT_RATE_LIMIT + 1;
      const sequence = splitTopLevelCommands(repeatedCommand, {
        maxCommands: DEFAULT_MAX_CONDITIONAL_COMMANDS,
        preserveEscapedSemicolon: true,
        commandPrefix: this.commandPrefix
      });
      if (sequence.errorCode || sequence.commands.length === 0) return DEFAULT_RATE_LIMIT + 1;
      let onePass = 0;
      for (const nestedCommand of sequence.commands) {
        onePass += this.actionCommandRateWeight(nestedCommand, depth + 1);
        if (onePass > DEFAULT_RATE_LIMIT) return DEFAULT_RATE_LIMIT + 1;
      }
      return Math.min(DEFAULT_RATE_LIMIT + 1, repeatCount * onePass);
    }
    return 1;
  }

  actionRateWeight(commandsValue = []) {
    const commands = Array.isArray(commandsValue) ? commandsValue : [];
    let outbound = 0;
    for (const entry of commands) {
      outbound += this.actionCommandRateWeight(entry?.command);
      if (outbound > DEFAULT_RATE_LIMIT) return DEFAULT_RATE_LIMIT + 1;
    }
    // Pure client-state updates cannot flood the MUD socket. Count an
    // all-local Action as one trigger for loop protection, while preserving
    // the existing weighted socket-command limit for everything else.
    return Math.max(1, outbound);
  }

  generatedCommandMessageIsImportant(value) {
    const text = String(value?.text ?? value ?? '').trim();
    return /(?:\bblocked\b|\bsuppressed\b|\berror\b|\bfailed\b|\binvalid\b|\blimit\b|\bunsafe\b|\bunknown\b|\busage:|\brejected\b|\brefused\b|\bnot connected\b|\bdisconnected\b)/iu.test(text);
  }

  emitActionResult(session, payload = {}) {
    const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];
    const commandEcho = this.withTinTinSession(session, () => this.tintinConfig.commandEcho === true);
    const messages = commandEcho
      ? rawMessages
      : rawMessages.filter((message) => this.generatedCommandMessageIsImportant(message));
    this.emit(session.id, 'action-result', {
      pattern: String(payload.pattern || ''),
      line: String(payload.line || ''),
      command: String(payload.command || ''),
      deliveries: Array.isArray(payload.deliveries) ? payload.deliveries : [],
      messages
    });
  }

  filterGagsForText(session, text) {
    return this.withTinTinSession(session, () => this.filterGagsForTextScoped(session, text));
  }

  filterGagsForTextScoped(session, text) {
    const hasLineGag = Number(session?.lineGagRemaining || 0) > 0;
    if (!this.gagEngine.hasEnabledDefinitions() && !hasLineGag) {
      return {
        visibleText: `${session.gagLines.release()}${String(text ?? '')}`,
        communicationText: ''
      };
    }
    const debugEnabled = session?.pipelineDebug?.enabled === true;
    const filtered = session.gagLines.push(
      text,
      (line) => {
        if (Number(session.lineGagRemaining || 0) > 0) {
          session.lineGagRemaining = Math.max(0, Number(session.lineGagRemaining || 0) - 1);
          if (debugEnabled) this.tracePipeline(session, 'line-gag', () => `Suppressed next server line: ${String(line || '').trimEnd()}`);
          return true;
        }
        const match = this.gagEngine.match(line);
        if (debugEnabled) {
          this.tracePipeline(session, 'gag', () => match.matched
            ? `Matched ${match.gag?.pattern || '<pattern>'}: ${match.line || line}`
            : `No match: ${String(line || '').trimEnd()}`);
        }
        return match.matched;
      }
    );
    return {
      visibleText: filtered.text,
      communicationText: filtered.gaggedText
    };
  }

  flushGagText(session) {
    return this.withTinTinSession(session, () => this.flushGagTextScoped(session));
  }

  flushGagTextScoped(session) {
    const hasLineGag = Number(session?.lineGagRemaining || 0) > 0;
    if (!this.gagEngine.hasEnabledDefinitions() && !hasLineGag) {
      return { visibleText: session.gagLines.release(), communicationText: '' };
    }
    const filtered = session.gagLines.flush((line) => {
      if (Number(session.lineGagRemaining || 0) > 0) {
        session.lineGagRemaining = Math.max(0, Number(session.lineGagRemaining || 0) - 1);
        return true;
      }
      return this.gagEngine.match(line).matched;
    });
    return {
      visibleText: filtered.text,
      communicationText: filtered.gaggedText
    };
  }

  processActionsForText(session, text) {
    return this.withTinTinSession(session, () => this.processActionsForTextScoped(session, text));
  }

  processActionsForTextScoped(session, text) {
    // The line buffer is character-by-character work. Avoid touching it on
    // ordinary output when this session has no enabled Actions. Pipeline debug
    // keeps the old no-match visibility when explicitly enabled.
    if (!this.actionEngine.enabled || session.secureInput) return;
    const hasActions = typeof this.actionEngine.hasEnabledDefinitions === 'function'
      ? this.actionEngine.hasEnabledDefinitions()
      : true;
    if (!hasActions && !session?.pipelineDebug?.enabled) return;

    const lines = session.actionLines.push(text);
    // Local text such as #showme remains a valid Action test surface while
    // disconnected. Any generated server-bound command is still stopped by
    // queueCommand at the final socket boundary.
    if (!hasActions) {
      for (const rawLine of lines) {
        this.tracePipeline(session, 'action', () => `No match: ${String(rawLine || '').trimEnd()}`);
      }
      return;
    }

    for (const rawLine of lines) {
      const luaMatches = this.actionEngine.matchLuaTransients?.(rawLine) || [];
      for (const luaMatch of luaMatches) {
        this.invokeLuaAutomation(session, luaMatch.id, {
          line: luaMatch.line || String(rawLine || ''),
          matches: luaMatch.matches || [],
          namedMatches: luaMatch.namedMatches || {},
          args: []
        }, { source: 'trigger' });
      }
      const match = this.actionEngine.match(rawLine, { preserveLiteralPercent: true });
      this.tracePipeline(session, 'action', () => match.matched
        ? `Matched ${match.action?.pattern || '<pattern>'}: ${match.line || rawLine}`
        : `No match: ${String(rawLine || '').trimEnd()}`);
      if (!match.matched) continue;
      if (match.error) {
        this.emitActionResult(session, { pattern: match.action?.pattern, line: match.line, messages: [match.error] });
        continue;
      }

      const preparedSequence = this.prepareActionSequence(match.commands, session, { actionPattern: match.action.pattern });
      const generatedCommands = preparedSequence.commands;
      const validationError = preparedSequence.error;
      if (validationError) {
        this.emitActionResult(session, {
          pattern: match.action.pattern,
          line: match.line,
          command: match.command.replaceAll(LITERAL_PERCENT_SENTINEL, '%'),
          messages: [validationError]
        });
        continue;
      }

      const allowance = session.actionLimiter.allowCommands(
        match.action,
        match.line,
        this.actionRateWeight(generatedCommands)
      );
      if (!allowance.allowed) {
        if (allowance.notify) {
          this.emitActionResult(session, {
            pattern: match.action.pattern,
            line: match.line,
            command: match.command.replaceAll(LITERAL_PERCENT_SENTINEL, '%'),
            messages: [`Action command burst suppressed: per-session limit of ${DEFAULT_RATE_LIMIT} weighted commands per second reached.`]
          });
        }
        continue;
      }

      this.tracePipeline(session, 'action-command', () => `${match.action.pattern} => ${generatedCommands.map((entry) => entry.command).join(' ; ')}`);
      const deliveries = [];
      const messages = [];
      for (const entry of generatedCommands) {
        const result = this.dispatchCommand(session, entry.command, {
          actionGenerated: true,
          actionPattern: match.action.pattern,
          aliasExpanded: true,
          variablesExpanded: entry.variablesExpanded
        });
        deliveries.push(...result.deliveries);
        messages.push(...result.messages);
      }
      this.emitActionResult(session, {
        pattern: match.action.pattern,
        line: match.line,
        command: match.command.replaceAll(LITERAL_PERCENT_SENTINEL, '%'),
        deliveries,
        messages
      });
    }
  }

  delayName(value) {
    const name = String(value ?? '').normalize('NFKC').trim().slice(0, 128);
    if (!name || /[\u0000-\u001F\u007F]/u.test(name)) return '';
    return name;
  }

  cancelNamedDelay(session, nameValue) {
    const name = this.delayName(nameValue);
    if (!name || !session?.delays) return false;
    let cancelled = false;
    for (const [timer, record] of [...session.delays.entries()]) {
      if (record?.name !== name) continue;
      this.delayClearTimer(timer);
      session.delays.delete(timer);
      cancelled = true;
    }
    return cancelled;
  }

  scheduleDelay(session, secondsValue, commandValue, options = {}) {
    const seconds = Number(secondsValue);
    if (!Number.isFinite(seconds) || seconds < 0.01 || seconds > this.maxDelaySeconds) {
      return {
        scheduled: false,
        message: `Delay must be between 0.01 and ${this.maxDelaySeconds} seconds.`
      };
    }
    const delayName = this.delayName(options.delayName);
    if (options.delayName && !delayName) {
      return { scheduled: false, message: 'Named delay name is invalid.' };
    }
    // TinTin named delays replace an older pending delay with the same name.
    if (delayName) this.cancelNamedDelay(session, delayName);
    if (session.delays.size >= this.maxPendingDelays) {
      return {
        scheduled: false,
        message: `Delay limit reached: at most ${this.maxPendingDelays} pending delays per session.`
      };
    }

    const parsedCommands = splitTopLevelCommands(commandValue, { maxCommands: DEFAULT_MAX_DELAY_COMMANDS, commandPrefix: this.commandPrefix });
    if (parsedCommands.errorCode) {
      this.tracePipeline(session, 'delay', () => `Rejected delayed command list: ${parsedCommands.errorCode}.`);
      const messages = {
        empty: 'Delay command list cannot be empty.',
        'too-many': `Delay may contain at most ${DEFAULT_MAX_DELAY_COMMANDS} commands.`,
        'unfinished-escape': 'Delay command list ends with an unfinished escape.',
        'unterminated-quote': 'Delay command list has an unterminated quote.',
        'unterminated-brace': 'Delay command list has an unterminated brace.',
        'unmatched-closing-brace': 'Delay command list has an unmatched closing brace.'
      };
      return { scheduled: false, message: messages[parsedCommands.errorCode] || 'Delay command list is invalid.' };
    }

    const delayMs = Math.max(10, Math.round(seconds * 1000));
    let timer = null;
    timer = this.delaySetTimer(() => {
      session.delays.delete(timer);
      if (this.sessions.get(session.id) !== session) return;

      const result = this.dispatchCommandSequence(session, parsedCommands.commands, {
        actionGenerated: options.actionGenerated === true,
        actionPattern: String(options.actionPattern || ''),
        repeatGenerated: options.repeatGenerated === true,
        pathGenerated: options.pathGenerated === true,
        delayGenerated: true
      });
      this.emitActionResult(session, {
        pattern: this.clientCommand('delay'),
        command: parsedCommands.commands.join('; '),
        deliveries: result.deliveries,
        messages: result.messages
      });
      if (options.completionEvent) {
        this.fireTinTinEvent(session, String(options.completionEvent), [], { eventDepth: Number(options.eventDepth || 0) });
      }
    }, delayMs);
    session.delays.set(timer, {
      name: delayName,
      seconds,
      commands: [...parsedCommands.commands],
      actionGenerated: options.actionGenerated === true,
      actionPattern: String(options.actionPattern || ''),
      repeatGenerated: options.repeatGenerated === true,
      pathGenerated: options.pathGenerated === true,
      completionEvent: String(options.completionEvent || '')
    });
    return {
      scheduled: true,
      message: `${delayName ? `Delay ${delayName}` : 'Delay'} scheduled in ${seconds} second${seconds === 1 ? '' : 's'}: ${parsedCommands.commands.join('; ')}`
    };
  }

  tickerName(value) {
    return normalizeToken(value, 64);
  }

  cancelTicker(session, nameValue) {
    const name = this.tickerName(nameValue);
    const record = name ? session?.tickers?.get(name) : null;
    if (!record) return false;
    if (record.timer) this.tickerClearTimer(record.timer);
    session.tickers.delete(name);
    return true;
  }

  scheduleTicker(session, nameValue, commandValue, secondsValue, options = {}) {
    const name = this.tickerName(nameValue);
    if (!name) return { scheduled: false, message: 'Ticker names must use letters, numbers, underscores, or hyphens.' };
    const secondsResult = evaluateMathExpression(String(secondsValue ?? ''));
    if (secondsResult.error || !Number.isFinite(secondsResult.value)
      || secondsResult.value < DEFAULT_MIN_TICKER_SECONDS || secondsResult.value > DEFAULT_MAX_TICKER_SECONDS) {
      return { scheduled: false, message: `Ticker interval must be between ${DEFAULT_MIN_TICKER_SECONDS} and ${DEFAULT_MAX_TICKER_SECONDS} seconds.` };
    }
    const parsedCommands = splitTopLevelCommands(commandValue, {
      maxCommands: DEFAULT_MAX_DELAY_COMMANDS,
      preserveEscapedSemicolon: true,
      commandPrefix: this.commandPrefix
    });
    if (parsedCommands.errorCode) return { scheduled: false, message: 'Ticker command list is invalid or too large.' };
    if (!session.tickers.has(name) && session.tickers.size >= this.maxTickers) {
      return { scheduled: false, message: `Ticker limit reached: at most ${this.maxTickers} per session.` };
    }
    this.cancelTicker(session, name);
    const record = {
      name,
      seconds: secondsResult.value,
      commands: [...parsedCommands.commands],
      oneshot: options.oneshot === true,
      actionGenerated: options.actionGenerated === true,
      actionPattern: String(options.actionPattern || ''),
      timer: null
    };
    const arm = () => {
      record.timer = this.tickerSetTimer(() => {
        if (this.sessions.get(session.id) !== session || session.tickers.get(name) !== record) return;
        if (this.withTinTinSession(session, () => this.tintinListIgnored('ticker'))) {
          if (session.tickers.get(name) === record) arm();
          return;
        }
        if (record.oneshot) session.tickers.delete(name);
        const result = this.dispatchCommandSequence(session, record.commands, {
          actionGenerated: record.actionGenerated,
          actionPattern: record.actionPattern,
          tickerGenerated: true
        });
        this.emitActionResult(session, {
          pattern: this.clientCommand(`ticker ${name}`),
          command: record.commands.join('; '),
          deliveries: result.deliveries,
          messages: result.messages
        });
        if (!record.oneshot && session.tickers.get(name) === record) arm();
      }, Math.max(10, Math.round(record.seconds * 1000)));
    };
    session.tickers.set(name, record);
    arm();
    return {
      scheduled: true,
      message: `${record.oneshot ? 'One-shot ticker' : 'Ticker'} ${name} scheduled every ${record.seconds} second${record.seconds === 1 ? '' : 's'}.`
    };
  }

  handleTickerCommand(tokens, source, options = {}) {
    if (tokens.length === 0) {
      const records = [...source.tickers.values()].sort((a, b) => String(a.name).localeCompare(String(b.name)));
      return records.length
        ? records.map((record) => `TICKER {${record.name}} {${record.commands.join('; ')}} {${record.seconds}}${record.oneshot ? ' ONESHOT' : ''}`)
        : ['No tickers are defined.'];
    }
    if (tokens.length === 1) {
      const records = [...source.tickers.values()]
        .filter((record) => tinTinDefinitionMatches(record.name, tokens[0]))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
      return records.length
        ? records.map((record) => `TICKER {${record.name}} {${record.commands.join('; ')}} {${record.seconds}}${record.oneshot ? ' ONESHOT' : ''}`)
        : [`Unknown ticker: ${tokens[0]}.`];
    }
    const secondsToken = tokens.length >= 3 ? tokens.at(-1) : '60';
    const expandedSeconds = options.variablesExpanded
      ? { value: secondsToken, error: '' }
      : this.expandFunctionAndVariables(secondsToken, source, options);
    if (expandedSeconds.error) return [expandedSeconds.error];
    const command = (tokens.length >= 3 ? tokens.slice(1, -1) : tokens.slice(1)).join(' ').trim();
    const result = this.scheduleTicker(source, tokens[0], command, expandedSeconds.value, {
      ...options,
      oneshot: options.lineOneshot === true
    });
    return [result.message];
  }

  handleUntickerCommand(tokens, source) {
    if (tokens.length !== 1) return [this.usage('unticker {name}')];
    const matches = [...source.tickers.values()].filter((record) => tinTinDefinitionMatches(record.name, tokens[0]));
    if (!matches.length) return [`Unknown ticker: ${tokens[0]}.`];
    for (const record of matches) this.cancelTicker(source, record.name);
    return matches.length === 1
      ? [`Ticker ${matches[0].name} cancelled.`]
      : [`${matches.length} tickers matching ${tokens[0]} cancelled.`];
  }

  handleLineCommand(tokens, source, options = {}, rawBodyValue = '') {
    const operation = resolveTinTinOrderedAbbreviation(tokens[0], TINTIN_LINE_SUBCOMMANDS, { local: 'local', oneshot: 'oneshot' });
    const nestedFromRaw = () => {
      const raw = String(rawBodyValue || '').trim();
      const firstSpace = raw.search(/\s/u);
      if (firstSpace < 0) return '';
      const remainder = raw.slice(firstSpace).trim();
      const chunks = parseTinTinBraceChunks(remainder);
      return chunks?.length === 1 ? chunks[0] : remainder;
    };

    if (operation === 'oneshot' && tokens.length >= 2) {
      const command = nestedFromRaw() || tokens.slice(1).join(' ').trim();
      const result = this.dispatchCommand(source, command, { ...options, lineOneshot: true });
      return { deliveries: result.deliveries, messages: result.messages, activateSessionId: result.activateSessionId || '' };
    }

    if (operation === 'gag') {
      if (tokens.length > 2) return { deliveries: [], messages: [this.usage('line gag [amount]')], activateSessionId: '' };
      const rawAmount = String(tokens[1] || '').trim();
      let next = 1;
      if (rawAmount) {
        if (!/^[+-]?\d+$/u.test(rawAmount)) return { deliveries: [], messages: [this.usage('line gag [amount]')], activateSessionId: '' };
        const value = Number(rawAmount);
        if (!Number.isSafeInteger(value)) return { deliveries: [], messages: [this.usage('line gag [amount]')], activateSessionId: '' };
        next = /^[+-]/u.test(rawAmount) ? Number(source.lineGagRemaining || 0) + value : value;
      }
      source.lineGagRemaining = Math.max(0, Math.min(100, next));
      return { deliveries: [], messages: [`Line gag armed for ${source.lineGagRemaining} server line${source.lineGagRemaining === 1 ? '' : 's'}.`], activateSessionId: '' };
    }

    if (operation === 'json') {
      if (tokens.length < 3) return { deliveries: [], messages: [this.usage('line json {variable} {command}')], activateSessionId: '' };
      const nameExpanded = options.variablesExpanded ? { value: tokens[1], error: '' } : this.expandFunctionAndVariables(tokens[1], source, options);
      if (nameExpanded.error) return { deliveries: [], messages: [nameExpanded.error], activateSessionId: '' };
      const name = normalizeVariableName(nameExpanded.value);
      if (!name) return { deliveries: [], messages: ['Line JSON variable name is invalid.'], activateSessionId: '' };
      const record = this.variableEngine.get(name);
      if (!record) return { deliveries: [], messages: [`Unknown variable: ${name}.`], activateSessionId: '' };
      const toJsonValue = (variableName, depth = 0) => {
        if (depth > 8) return String(this.variableEngine.get(variableName)?.value ?? '');
        const entries = this.variableEngine.tableEntries(variableName);
        if (!entries.length) return String(this.variableEngine.get(variableName)?.value ?? '');
        const object = {};
        for (const entry of entries.slice(0, DEFAULT_MAX_LIST_ITEMS)) {
          const child = `${variableName}[${entry.key}]`;
          object[entry.key] = this.variableEngine.tableEntries(child).length
            ? toJsonValue(child, depth + 1)
            : String(this.variableEngine.get(child)?.value ?? entry.record.value ?? '');
        }
        return object;
      };
      const command = tokens.slice(2).join(' ').trim();
      const json = JSON.stringify(toJsonValue(name));
      if (json.length > DEFAULT_MAX_LOCAL_DISPLAY_CHARACTERS) return { deliveries: [], messages: [`Line JSON output is limited to ${DEFAULT_MAX_LOCAL_DISPLAY_CHARACTERS} characters.`], activateSessionId: '' };
      const result = this.dispatchCommand(source, substituteTinTinCommandCaptures(command, { 0: json }), { ...options, variablesExpanded: true });
      return { deliveries: result.deliveries, messages: result.messages, activateSessionId: result.activateSessionId || '' };
    }

    if (operation === 'quiet' || operation === 'verbatim') {
      const command = nestedFromRaw() || tokens.slice(1).join(' ').trim();
      if (!command) return { deliveries: [], messages: [this.usage(`line ${operation} {command}`)], activateSessionId: '' };
      const result = this.dispatchCommand(source, command, { ...options, variablesExpanded: operation === 'verbatim' ? true : options.variablesExpanded });
      return { deliveries: result.deliveries, messages: operation === 'quiet' ? [] : result.messages, activateSessionId: result.activateSessionId || '' };
    }

    if (operation === 'ignore' || operation === 'verbose' || operation === 'local' || operation === 'strip') {
      const command = nestedFromRaw() || tokens.slice(1).join(' ').trim();
      if (!command) return { deliveries: [], messages: [this.usage(`line ${operation} {command}`)], activateSessionId: '' };
      const prepared = operation === 'strip' ? stripTerminalSequences(command) : command;
      if (operation === 'ignore') source.lineIgnoreDepth = Math.max(0, Number(source.lineIgnoreDepth || 0)) + 1;
      try {
        const result = this.dispatchCommand(source, prepared, {
          ...options,
          lineIgnoreProcessing: operation === 'ignore',
          lineVerbose: operation === 'verbose',
          localOnly: operation === 'local' || options.localOnly === true
        });
        return { deliveries: result.deliveries, messages: result.messages, activateSessionId: result.activateSessionId || '' };
      } finally {
        if (operation === 'ignore') source.lineIgnoreDepth = Math.max(0, Number(source.lineIgnoreDepth || 0) - 1);
      }
    }

    if (operation === 'log' || operation === 'logverbatim') {
      if (tokens.length < 2 || tokens.length > 3) return { deliveries: [], messages: [this.usage(`line ${operation} {filename} [text]`)], activateSessionId: '' };
      const fileExpanded = this.expandFunctionAndVariables(tokens[1], source, options);
      if (fileExpanded.error) return { deliveries: [], messages: [fileExpanded.error], activateSessionId: '' };
      const filename = normalizeLegacyTinTinLogRequest(fileExpanded.value);
      if (!filename) return { deliveries: [], messages: ['Line Log filename must resolve to a safe basename in the NukeFire Logs folder.'], activateSessionId: '' };
      let text = tokens.length >= 3 ? String(tokens[2] ?? '') : '';
      if (operation === 'log' && text) {
        const expanded = this.expandFunctionAndVariables(text, source, options);
        if (expanded.error) return { deliveries: [], messages: [expanded.error], activateSessionId: '' };
        text = expanded.value;
      }
      if (!text && operation === 'log') {
        source.pendingTinTinLineLog = { filename };
        return { deliveries: [], messages: [`Line Log armed for the next incoming line -> ${filename}.`], activateSessionId: '' };
      }
      const writer = this.handlers.onLogAppend;
      if (typeof writer !== 'function') return { deliveries: [], messages: ['Log storage is not available.'], activateSessionId: '' };
      Promise.resolve(writer({ sessionId: source.id, filename, text: `${text}\n` })).catch((error) => this.emit(source.id, 'error', `Line Log failed: ${error?.message || error}`));
      return { deliveries: [], messages: [`Logged one line to ${filename}.`], activateSessionId: '' };
    }

    if (operation === 'sub' || operation === 'substitute') {
      if (tokens.length < 3) return { deliveries: [], messages: [this.usage('line substitute {variables|functions|colors|escapes|secure|eol|lnf} {command}')], activateSessionId: '' };

      // The normal command tokenizer intentionally consumes most backslash
      // escapes. #LINE SUBSTITUTE ESCAPES must see the original bytes, so
      // recover its two braced arguments directly from the raw LINE body.
      const raw = String(rawBodyValue || '').trim();
      const firstSpace = raw.search(/\s/u);
      const rawArguments = firstSpace >= 0 ? raw.slice(firstSpace).trim() : '';
      const modeArgument = splitTinTinLeadingArgument(rawArguments);
      const rawModes = modeArgument.value || String(tokens[1] || '');
      let command = modeArgument.remainder
        ? unwrapTinTinSingleBracedArgument(modeArgument.remainder)
        : tokens.slice(2).join(' ').trim();

      const modes = new Set();
      for (const requested of String(rawModes || '').split(/[\s;,]+/u).filter(Boolean)) {
        const resolved = resolveTinTinOrderedAbbreviation(requested, TINTIN_LINE_SUBSTITUTIONS);
        if (TINTIN_LINE_SUBSTITUTIONS.some(([, canonical]) => canonical === resolved)) modes.add(resolved);
      }

      if (modes.has('functions')) {
        const expanded = this.expandFunctions(command, source, options);
        if (expanded.error) return { deliveries: [], messages: [expanded.error], activateSessionId: '' };
        command = expanded.value;
      }
      if (modes.has('variables')) {
        const expanded = this.variableExpansion(command, options);
        if (expanded.error) return { deliveries: [], messages: [expanded.error], activateSessionId: '' };
        command = expanded.value;
      }
      command = applyTinTinLineSubstitutionTransforms(command, modes);

      // TinTin feeds the transformed text back to script_driver. Re-run it
      // through NukeFire's bounded top-level parser so generated semicolons
      // behave as commands, while SECURE's escaped separators stay literal.
      const trailingLineEnding = command.match(/(?:\r\n|\r|\n)+$/u)?.[0] || '';
      const protectedAnsi = protectTinTinAnsiSemicolons(command);
      const parsedCommands = splitTopLevelCommands(protectedAnsi.value, {
        maxCommands: this.maxCommandLineCommands,
        preserveEscapedSemicolon: true,
        commandPrefix: this.commandPrefix
      });
      if (!parsedCommands.errorCode) {
        parsedCommands.commands = parsedCommands.commands.map((entry) => {
          const restoredAnsi = protectedAnsi.restore(entry);
          return modes.has('secure') ? restoreTinTinSecureScriptEscapes(restoredAnsi) : restoredAnsi;
        });
      }
      if (!parsedCommands.errorCode && trailingLineEnding && parsedCommands.commands.length) {
        parsedCommands.commands[parsedCommands.commands.length - 1] += trailingLineEnding;
      }
      if (parsedCommands.errorCode) {
        return { deliveries: [], messages: [`Line Substitute produced an invalid command list (${parsedCommands.errorCode}).`], activateSessionId: '' };
      }
      const result = this.dispatchCommandSequence(source, parsedCommands.commands, {
        ...options,
        commandLineBatch: true,
        lineSubstituteGenerated: true,
        variablesExpanded: modes.has('variables')
      });
      return { deliveries: result.deliveries, messages: result.messages, activateSessionId: result.activateSessionId || '' };
    }

    return {
      deliveries: [],
      messages: ['NukeFire supports TinTin #LINE GAG, IGNORE, LOCAL, LOG, LOGVERBATIM, ONESHOT, STRIP, SUBSTITUTE, and VERBOSE compatibility forms.'],
      activateSessionId: ''
    };
  }

  handleDelayCommand(tokens, source, options = {}) {
    if (tokens.length === 0) {
      const records = [...source.delays.values()].map((record) => ({ ...record })).sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      return records.length
        ? records.map((record) => `DELAY {${record.name || '(anonymous)'}} {${Array.isArray(record.commands) ? record.commands.join('; ') : record.command || ''}} {${record.seconds}}`)
        : ['No pending delays are defined.'];
    }
    if (tokens.length === 1) {
      const expanded = options.variablesExpanded
        ? { value: tokens[0], error: '' }
        : this.expandFunctionAndVariables(tokens[0], source, options);
      if (expanded.error) return [expanded.error];
      const pattern = String(expanded.value || '');
      const records = [...source.delays.values()]
        .filter((record) => record?.name && tinTinDefinitionMatches(record.name, pattern))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
      return records.length
        ? records.map((record) => `DELAY {${record.name}} {${Array.isArray(record.commands) ? record.commands.join('; ') : record.command || ''}} {${record.seconds}}`)
        : [`Unknown delay: ${pattern || tokens[0]}.`];
    }

    // Preserve the established two-or-more-token seconds-first form whenever
    // its first argument is a valid duration.  Otherwise the exact three-token
    // TinTin named-delay form is name, command, seconds.
    const firstExpanded = options.variablesExpanded
      ? { value: tokens[0], error: '' }
      : this.expandFunctionAndVariables(tokens[0], source, options);
    if (firstExpanded.error) return [firstExpanded.error];
    const firstMath = evaluateMathExpression(firstExpanded.value);
    const firstIsDuration = !firstMath.error
      && Number(firstMath.value) >= 0.01
      && Number(firstMath.value) <= this.maxDelaySeconds;

    if (!firstIsDuration && tokens.length === 3) {
      const nameExpanded = options.variablesExpanded
        ? { value: tokens[0], error: '' }
        : this.expandFunctionAndVariables(tokens[0], source, options);
      if (nameExpanded.error) return [nameExpanded.error];
      const secondsExpanded = options.variablesExpanded
        ? { value: tokens[2], error: '' }
        : this.expandFunctionAndVariables(tokens[2], source, options);
      if (secondsExpanded.error) return [secondsExpanded.error];
      const evaluated = evaluateMathExpression(secondsExpanded.value);
      if (evaluated.error) return [`Delay duration is invalid: ${evaluated.error}`];
      const command = tokens[1].trim();
      const result = this.scheduleDelay(source, evaluated.value, command, { ...options, delayName: nameExpanded.value });
      return [result.message];
    }

    if (firstMath.error) return [`Delay duration is invalid: ${firstMath.error}`];
    const command = tokens.slice(1).join(' ').trim();
    const result = this.scheduleDelay(source, firstMath.value, command, options);
    return [result.message];
  }

  handleUndelayCommand(tokens, source, options = {}) {
    if (tokens.length !== 1) return [this.usage('undelay {name}')];
    const expanded = options.variablesExpanded
      ? { value: tokens[0], error: '' }
      : this.expandFunctionAndVariables(tokens[0], source, options);
    if (expanded.error) return [expanded.error];
    const pattern = String(expanded.value || '');
    const names = [...new Set([...source.delays.values()].map((record) => record?.name).filter((name) => name && tinTinDefinitionMatches(name, pattern)))];
    if (!names.length) return [`Unknown delay: ${pattern}.`];
    for (const name of names) this.cancelNamedDelay(source, name);
    return names.length === 1 ? [`Delay ${names[0]} cancelled.`] : [`${names.length} delays matching ${pattern} cancelled.`];
  }

  handleLoopCommand(tokens, source, options = {}) {
    if (tokens.length < 4) {
      return {
        deliveries: [],
        messages: [this.usage('loop {start} {finish} {variable} {commands}')],
        activateSessionId: ''
      };
    }

    if (options.loopGenerated || options.repeatGenerated) {
      return {
        deliveries: [],
        messages: ['Nested loop and repeat directives are not allowed.'],
        activateSessionId: ''
      };
    }

    const start = Number(tokens[0]);
    const finish = Number(tokens[1]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(finish)) {
      return {
        deliveries: [],
        messages: ['Loop start and finish must be whole numbers.'],
        activateSessionId: ''
      };
    }

    const iterationCount = Math.abs(finish - start) + 1;
    if (!Number.isSafeInteger(iterationCount) || iterationCount < 1 || iterationCount > this.maxLoopIterations) {
      return {
        deliveries: [],
        messages: [`Loop may contain at most ${this.maxLoopIterations} iterations.`],
        activateSessionId: ''
      };
    }

    const variableName = normalizeSimpleVariableName(tokens[2]);
    if (!variableName) {
      return {
        deliveries: [],
        messages: ['Loop variable names must begin with a letter and may use letters, numbers, underscores, or hyphens.'],
        activateSessionId: ''
      };
    }

    const parsedCommands = splitTopLevelCommands(tokens.slice(3).join(' '), {
      maxCommands: DEFAULT_MAX_LOOP_COMMANDS,
      commandPrefix: this.commandPrefix
    });
    if (parsedCommands.errorCode) {
      const messages = {
        empty: 'Loop command list cannot be empty.',
        'too-many': `Loop may contain at most ${DEFAULT_MAX_LOOP_COMMANDS} commands per iteration.`,
        'unfinished-escape': 'Loop command list ends with an unfinished escape.',
        'unterminated-quote': 'Loop command list has an unterminated quote.',
        'unterminated-brace': 'Loop command list has an unterminated brace.',
        'unmatched-closing-brace': 'Loop command list has an unmatched closing brace.'
      };
      return {
        deliveries: [],
        messages: [messages[parsedCommands.errorCode] || 'Loop command list is invalid.'],
        activateSessionId: ''
      };
    }

    if (!this.variableEngine.define(variableName, String(start))) {
      return {
        deliveries: [],
        messages: ['Loop variable could not be stored because the variable limit has been reached.'],
        activateSessionId: ''
      };
    }

    const deliveries = [];
    const messages = [];
    let activateSessionId = '';
    const step = start <= finish ? 1 : -1;

    for (let value = start;; value += step) {
      this.variableEngine.define(variableName, String(value));
      const loopVariable = { name: variableName, value };
      const result = this.dispatchCommandSequence(source, parsedCommands.commands, {
        ...options,
        loopGenerated: true,
        repeatGenerated: true,
        iterationControlAllowed: true,
        loopVariable
      });
      deliveries.push(...result.deliveries);
      messages.push(...result.messages);
      if (result.activateSessionId) activateSessionId = result.activateSessionId;
      if (result.controlFlow === 'break') break;
      if (value === finish) break;
      if (result.controlFlow === 'continue') continue;
    }

    return { deliveries, messages, activateSessionId };
  }

  handleWhileCommand(tokens, source, options = {}) {
    if (tokens.length < 2) {
      return {
        deliveries: [],
        messages: [this.usage('while {condition} {commands}')],
        activateSessionId: '',
        controlFlow: ''
      };
    }

    const depth = Math.max(0, Math.trunc(Number(options.whileDepth) || 0));
    if (depth >= DEFAULT_MAX_WHILE_DEPTH) {
      return {
        deliveries: [],
        messages: [`While nesting may not exceed ${DEFAULT_MAX_WHILE_DEPTH} levels.`],
        activateSessionId: '',
        controlFlow: ''
      };
    }

    const condition = String(tokens[0] || '').trim();
    const parsedCommands = splitTopLevelCommands(tokens.slice(1).join(' '), {
      maxCommands: DEFAULT_MAX_WHILE_COMMANDS,
      preserveEscapedSemicolon: true,
      commandPrefix: this.commandPrefix
    });
    if (!condition || parsedCommands.errorCode) {
      const errorMessages = {
        empty: 'While command list cannot be empty.',
        'too-many': `While may contain at most ${DEFAULT_MAX_WHILE_COMMANDS} commands per iteration.`,
        'unfinished-escape': 'While command list ends with an unfinished escape.',
        'unterminated-quote': 'While command list has an unterminated quote.',
        'unterminated-brace': 'While command list has an unterminated brace.',
        'unmatched-closing-brace': 'While command list has an unmatched closing brace.'
      };
      return {
        deliveries: [],
        messages: [condition ? (errorMessages[parsedCommands.errorCode] || 'While command list is invalid.') : this.usage('while {condition} {commands}')],
        activateSessionId: '',
        controlFlow: ''
      };
    }

    const deliveries = [];
    const messages = [];
    let activateSessionId = '';
    let iterations = 0;
    for (; iterations < this.maxWhileIterations; iterations += 1) {
      const evaluated = this.evaluateConditionalExpression(condition, source, options);
      if (evaluated.error) {
        messages.push(evaluated.error);
        break;
      }
      if (!evaluated.matched) break;
      const result = this.dispatchCommandSequence(source, parsedCommands.commands, {
        ...options,
        whileGenerated: true,
        whileDepth: depth + 1,
        iterationControlAllowed: true
      });
      deliveries.push(...result.deliveries);
      messages.push(...result.messages);
      if (result.activateSessionId) activateSessionId = result.activateSessionId;
      if (result.controlFlow === 'break') break;
      if (result.controlFlow === 'continue') continue;
    }

    if (iterations >= this.maxWhileIterations) {
      const evaluated = this.evaluateConditionalExpression(condition, source, options);
      if (!evaluated.error && evaluated.matched) {
        messages.push(`While stopped after the safety limit of ${this.maxWhileIterations} iterations.`);
      }
    }
    return { deliveries, messages, activateSessionId, controlFlow: '' };
  }

  handleListCommand(tokens, source, options = {}) {
    if (tokens.length < 2) return [this.usage('list {variable} {option} {arguments...}')];
    const baseExpanded = options.variablesExpanded ? { value: tokens[0], error: '' } : this.expandFunctionAndVariables(tokens[0], source, options);
    if (baseExpanded.error) return [baseExpanded.error];
    const base = normalizeVariableName(baseExpanded.value);
    if (!base) return ['List variable must be a valid TinTin variable or nested table path.'];
    const operation = resolveTinTinOrderedAbbreviation(tokens[1], TINTIN_LIST_SUBCOMMANDS, { ins: 'insert', order: 'order', reverse: 'reverse' });
    const entriesNow = () => this.variableEngine.tableEntries(base).map((entry) => ({ key: entry.key, value: entry.record.value }));
    let existing = entriesNow();
    const indexMap = source.tintinListIndexes ||= new Map();
    const indexKey = () => String(indexMap.get(base) || '');
    const comparable = (entry) => {
      const key = indexKey();
      if (!key) return String(entry?.value ?? '');
      return String(this.variableEngine.get(`${base}[${entry.key}][${key}]`)?.value ?? '');
    };
    const expand = (raw) => options.variablesExpanded ? { value: raw, error: '' } : this.expandFunctionAndVariables(raw, source, options);
    const notify = () => { if (options.suppressVariableUpdateEvent !== true) this.fireTinTinVariableUpdate(source, base, undefined, options); };
    const collectNodeRecords = (directKey) => {
      const root = `${base}[${directKey}]`;
      return this.variableEngine.list().filter((r) => r.name === root || r.name.startsWith(`${root}[`));
    };
    const rewriteOrder = (orderedEntries) => {
      const snapshot = orderedEntries.map((entry) => ({ entry, records: collectNodeRecords(entry.key) }));
      this.variableEngine.delete(base);
      if (!snapshot.length) {
        return Boolean(this.variableEngine.define(base, '', this.variableAssignmentClass(base)));
      }
      for (let i = 0; i < snapshot.length; i += 1) {
        const nextRoot = `${base}[${i + 1}]`;
        const oldRoot = `${base}[${snapshot[i].entry.key}]`;
        const records = snapshot[i].records;
        if (!records.length) {
          if (!defineListItem(nextRoot, snapshot[i].entry.value)) return false;
          continue;
        }
        for (const record of records) {
          const nextName = `${nextRoot}${record.name.slice(oldRoot.length)}`;
          if (!this.variableEngine.define(nextName, record.value, record.className || this.variableAssignmentClass(base))) return false;
        }
      }
      return true;
    };
    const scalarListValues = (raw) => {
      const text = String(raw ?? '');
      if (!text.trim()) return [];
      const parsed = splitTopLevelCommands(text, { maxCommands: DEFAULT_MAX_LIST_ITEMS, preserveEscapedSemicolon: true, commandPrefix: this.commandPrefix });
      if (parsed.errorCode) return null;
      if (text.includes(';')) return parsed.commands;
      const braced = parseTinTinBraceChunks(text);
      if (braced?.length) return braced;
      const tokenized = tokenizeBraced(text, { preserveEscapedSemicolon: true });
      return tokenized.length > 1 ? tokenized : [text];
    };
    const defineListItem = (name, value) => {
      const text = String(value ?? '');
      let entries = flattenTinTinTableEntries(name, text);
      if (!entries?.length) {
        const chunks = parseTinTinBraceChunks(text);
        if (chunks?.length === 1 && String(chunks[0] || '').trim().startsWith('{')) {
          entries = flattenTinTinTableEntries(name, chunks[0]);
        }
      }
      if (entries?.length) {
        for (const entry of entries) {
          if (!this.variableEngine.define(entry.name, entry.value, this.variableAssignmentClass(base))) return false;
        }
        return true;
      }
      return Boolean(this.variableEngine.define(name, text, this.variableAssignmentClass(base)));
    };
    const defineSimpleList = (values) => {
      if (values.length > DEFAULT_MAX_LIST_ITEMS) return false;
      this.variableEngine.delete(base);
      if (!values.length) {
        return Boolean(this.variableEngine.define(base, '', this.variableAssignmentClass(base)));
      }
      for (let i = 0; i < values.length; i += 1) {
        if (!defineListItem(`${base}[${i + 1}]`, values[i])) return false;
      }
      return true;
    };

    if (operation === 'size') {
      if (tokens.length !== 3) return [this.usage('list {variable} size {result variable}')];
      const resultName = normalizeSimpleVariableName(tokens[2]);
      if (!resultName) return ['List SIZE result variable must be a simple TinTin variable name.'];
      if (!this.assignVariable(resultName, String(existing.length), options)) return [`List SIZE could not store ${resultName}.`];
      return [`List ${base} SIZE stored ${existing.length} in ${resultName}.`];
    }
    if (operation === 'clear') { const removed = this.variableEngine.clearTable(base); indexMap.delete(base); notify(); return [`List ${base} cleared (${removed} item${removed === 1 ? '' : 's'} removed).`]; }
    if (operation === 'indexate') {
      if (tokens.length > 3) return [this.usage('list {variable} indexate [key]')];
      const key = String(tokens[2] || '').trim();
      if (key && existing.some((entry) => !this.variableEngine.get(`${base}[${entry.key}][${key}]`))) return [`List ${base} INDEXATE requires every item to contain key ${key}.`];
      if (key) indexMap.set(base, key); else indexMap.delete(base);
      return [`List ${base} indexation ${key ? `set to ${key}` : 'cleared'}.`];
    }
    if (operation === 'get') {
      if (tokens.length !== 4) return [this.usage('list {variable} get {index} {result variable}')];
      const idx = expand(tokens[2]); if (idx.error) return [idx.error];
      const resultName = normalizeSimpleVariableName(tokens[3]); if (!resultName) return ['List GET result variable must be a simple TinTin variable name.'];
      const n = Number(idx.value); const pos = Number.isSafeInteger(n) && n !== 0 ? (n > 0 ? n - 1 : existing.length + n) : -1;
      const value = pos >= 0 && pos < existing.length ? (indexKey() ? comparable(existing[pos]) : existing[pos].value) : '0';
      if (!this.assignVariable(resultName, value, options)) return [`List GET could not store ${resultName}.`];
      return [`List ${base} GET stored item ${idx.value} in ${resultName}.`];
    }
    if (operation === 'find') {
      if (tokens.length !== 4) return [this.usage('list {variable} find {regex} {result variable}')];
      const pat = expand(tokens[2]); if (pat.error) return [pat.error];
      const resultName = normalizeSimpleVariableName(tokens[3]); if (!resultName) return ['List FIND result variable must be a simple TinTin variable name.'];
      const found = existing.findIndex((entry) => matchTinTinRegexp(comparable(entry), pat.value).matched);
      if (!this.assignVariable(resultName, String(found >= 0 ? found + 1 : 0), options)) return [`List FIND could not store ${resultName}.`];
      return [`List ${base} FIND stored ${found >= 0 ? found + 1 : 0} in ${resultName}.`];
    }
    if (operation === 'collapse' || operation === 'simplify') {
      const separator = operation === 'collapse' ? String(expand(tokens[2] ?? '').value ?? '') : ';';
      let values = existing.map((entry) => String(entry.value ?? ''));
      if (operation === 'simplify' && tokens.length > 2) {
        for (const raw of tokens.slice(2)) { const x=expand(raw); if (x.error) return [x.error]; values.push(String(x.value ?? '')); }
      }
      const record = this.variableEngine.define(base, values.join(separator), this.variableAssignmentClass(base));
      indexMap.delete(base); notify();
      return [record ? `List ${base} ${operation === 'collapse' ? 'collapsed' : 'simplified'} to a scalar variable.` : `List ${base} could not be ${operation}d.`];
    }
    if (operation === 'explode') {
      if (tokens.length !== 3) return [this.usage('list {variable} explode {separator}')];
      const sep=expand(tokens[2]); if (sep.error) return [sep.error]; if (!String(sep.value).length) return ['List EXPLODE separator cannot be empty.'];
      const scalar=this.variableEngine.get(base)?.value ?? ''; const values=String(scalar).split(String(sep.value));
      if (!defineSimpleList(values)) return [`List ${base} EXPLODE could not store the result.`]; indexMap.delete(base); notify(); return [`List ${base} exploded into ${values.length} items.`];
    }
    if (operation === 'copy') {
      if (tokens.length !== 3) return [this.usage('list {variable} copy {variable}')];
      const srcExpanded = expand(tokens[2]); if (srcExpanded.error) return [srcExpanded.error];
      const src=normalizeVariableName(srcExpanded.value); if (!src) return ['List COPY source variable is invalid.'];
      const srcEntries=this.variableEngine.tableEntries(src);
      if (srcEntries.length) {
        const records=this.variableEngine.list().filter((r)=>r.name.startsWith(`${src}[`)); this.variableEngine.delete(base);
        for (const record of records) if (!this.variableEngine.define(`${base}${record.name.slice(src.length)}`, record.value, record.className || this.variableAssignmentClass(base))) return [`List ${base} COPY could not store the result.`];
      } else {
        const values=scalarListValues(this.variableEngine.get(src)?.value ?? ''); if (values===null || !defineSimpleList(values)) return [`List ${base} COPY could not store the result.`];
      }
      indexMap.delete(base); notify(); return [`List ${base} copied from ${src}.`];
    }
    if (operation === 'create' || operation === 'tokenize') {
      const raw=tokens.slice(2).join(' '); const x=expand(raw); if (x.error) return [x.error];
      const values=operation==='tokenize' ? [...String(x.value ?? '')] : scalarListValues(x.value);
      if (values===null || values.length>DEFAULT_MAX_LIST_ITEMS || !defineSimpleList(values)) return [`List ${base} could not be created.`];
      indexMap.delete(base); notify(); return operation === 'tokenize'
        ? [`List ${base} tokenized into ${values.length} character${values.length === 1 ? '' : 's'}.`]
        : [`List ${base} created (${values.length} item${values.length === 1 ? '' : 's'}).`];
    }
    if (operation === 'add' || operation === 'insert' || operation === 'sort') {
      const unpackItems = (rawItems, label) => {
        const values = [];
        for (const raw of rawItems) {
          const x = expand(raw);
          if (x.error) return { values: [], error: x.error };
          const text = String(x.value ?? '');
          const packed = splitTopLevelCommands(text, {
            maxCommands: DEFAULT_MAX_LIST_ITEMS,
            preserveEscapedSemicolon: true,
            commandPrefix: this.commandPrefix
          });
          if (packed.errorCode) return { values: [], error: `List ${base} ${label} has invalid or excessive separators.` };
          values.push(...(text.includes(';') ? packed.commands : [text]));
        }
        return { values, error: '' };
      };
      const makeNewEntries = (values) => values.map((value, index) => ({ key: `__new_${index}`, value: String(value ?? ''), __new: true }));

      if (operation === 'insert') {
        if (tokens.length !== 4) return [this.usage('list {variable} insert {index} {item}')];
        const idx = expand(tokens[2]);
        if (idx.error) return [idx.error];
        const unpacked = unpackItems(tokens.slice(3), 'INSERT');
        if (unpacked.error) return [unpacked.error];
        const n = Number(idx.value);
        if (!Number.isSafeInteger(n) || n === 0) return [`List ${base} INSERT index must be non-zero.`];
        let pos = 0;
        if (existing.length === 0) {
          if (![1, -1].includes(n)) return [`List ${base} INSERT index must be +1 or -1 for an empty list.`];
        } else if (n > 0) {
          if (n > existing.length) return [`List ${base} INSERT positive index must be between 1 and ${existing.length}.`];
          pos = n - 1;
        } else {
          if (Math.abs(n) > existing.length) return [`List ${base} INSERT negative index must be between -1 and -${existing.length}.`];
          pos = existing.length + n + 1;
        }
        const work=[...existing]; work.splice(pos,0,...makeNewEntries(unpacked.values));
        if (work.length > DEFAULT_MAX_LIST_ITEMS || !rewriteOrder(work)) return [`List ${base} INSERT could not store the result.`];
        indexMap.delete(base); notify();
        return [`List ${base}: inserted item at ${n} (${work.length} total).`];
      }

      const unpacked = unpackItems(tokens.slice(2), operation.toUpperCase());
      if (unpacked.error) return [unpacked.error];
      if (!unpacked.values.length && operation === 'add') return [this.usage(`list {variable} ${operation} {item} ...`)];
      let work=[...existing,...makeNewEntries(unpacked.values)];
      if (work.length > DEFAULT_MAX_LIST_ITEMS) return [`List ${base} may contain at most ${DEFAULT_MAX_LIST_ITEMS} items.`];
      if (operation === 'add') {
        if (!rewriteOrder(work)) return [`List ${base} ADD could not store the result.`];
        indexMap.delete(base); notify();
        return [`List ${base}: added ${unpacked.values.length} item${unpacked.values.length === 1 ? '' : 's'} (${work.length} total).`];
      }
      work=work.map((entry,position)=>({entry,position,value:entry.__new?String(entry.value??''):comparable(entry)}))
        .sort((a,b)=>String(a.value).localeCompare(String(b.value))||a.position-b.position)
        .map((item)=>item.entry);
      if (!rewriteOrder(work)) return [`List ${base} SORT could not store the result.`];
      notify();
      return [`List ${base} SORT added ${unpacked.values.length} item${unpacked.values.length === 1 ? '' : 's'} and sorted ${work.length} total.`];
    }
    if (operation === 'set') {
      if(tokens.length!==4) return [this.usage('list {variable} set {index} {item}')]; const idx=expand(tokens[2]); const val=expand(tokens[3]); if(idx.error)return[idx.error]; if(val.error)return[val.error];
      const n=Number(idx.value); const pos=Number.isSafeInteger(n)&&n!==0?(n>0?n-1:existing.length+n):-1; if(pos<0||pos>=existing.length)return [`List ${base} SET index must address an existing item.`];
      this.variableEngine.delete(`${base}[${existing[pos].key}]`); if(!defineListItem(`${base}[${existing[pos].key}]`,val.value))return [`List ${base} SET could not store the item.`]; notify(); return [`List ${base} SET updated item ${n}.`];
    }
    if (operation === 'delete') {
      if(tokens.length<3||tokens.length>4)return[this.usage('list {variable} delete {index} [amount]')]; const idx=expand(tokens[2]); const cnt=tokens[3]===undefined?{value:'1',error:''}:expand(tokens[3]); if(idx.error)return[idx.error]; if(cnt.error)return[cnt.error];
      const n=Number(idx.value), amount=Number(cnt.value); if(!Number.isSafeInteger(n)||n===0||!Number.isSafeInteger(amount)||amount<1)return [`List ${base} DELETE arguments are invalid.`];
      const work=[...existing]; let removed=0; for(let k=0;k<amount&&work.length;k++){const pos=n>0?n-1:work.length+n;if(pos<0||pos>=work.length)break;work.splice(pos,1);removed++;} if(!rewriteOrder(work))return[`List ${base} DELETE could not store the result.`]; notify(); return[`List ${base}: deleted ${removed} item${removed===1?'':'s'}.`];
    }
    if (operation === 'numerate') { if(!rewriteOrder(existing))return[`List ${base} NUMERATE could not store the result.`]; notify(); return[`List ${base} numerated (${existing.length} items).`]; }
    if (operation === 'reverse' || operation === 'shuffle' || operation === 'swap' || operation === 'order') {
      let work=[...existing];
      const appendItems = (rawItems) => {
        if (!rawItems.length) return { error: '' };
        const values = [];
        for (const raw of rawItems) {
          const x = expand(raw); if (x.error) return { error: x.error };
          const packed = scalarListValues(x.value);
          if (packed === null) return { error: `List ${base} has invalid item separators.` };
          values.push(...packed);
        }
        if (work.length + values.length > DEFAULT_MAX_LIST_ITEMS) return { error: `List ${base} may contain at most ${DEFAULT_MAX_LIST_ITEMS} items.` };
        for (let i = 0; i < values.length; i += 1) work.push({ key: `__new_${i}`, value: String(values[i] ?? ''), __new: true });
        return { error: '' };
      };
      if(operation==='reverse' || operation==='shuffle' || operation==='order') {
        const added = appendItems(tokens.slice(2)); if (added.error) return [added.error];
      }
      if(operation==='reverse') work.reverse();
      else if(operation==='shuffle'){ for(let i=work.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[work[i],work[j]]=[work[j],work[i]];} }
      else if(operation==='swap'){
        if(tokens.length!==4)return[this.usage('list {variable} swap {index} {index}')];
        const ax=expand(tokens[2]), bx=expand(tokens[3]); if(ax.error)return[ax.error]; if(bx.error)return[bx.error];
        const a=Number(ax.value),b=Number(bx.value); const pos=(n)=>Number.isSafeInteger(n)&&n!==0?(n>0?n-1:work.length+n):-1; const ai=pos(a),bi=pos(b);
        if(ai<0||bi<0||ai>=work.length||bi>=work.length)return[`List ${base} SWAP index is outside the list.`]; [work[ai],work[bi]]=[work[bi],work[ai]];
      }
      else {
        const numeric = (value) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
        work=work.map((e,i)=>({e,i,c:e.__new ? e.value : comparable(e)})).sort((a,b)=>numeric(a.c)-numeric(b.c)||a.i-b.i).map(x=>x.e);
      }
      if(!rewriteOrder(work))return[`List ${base} ${operation.toUpperCase()} could not store the result.`]; notify(); return[`List ${base} ${operation.toUpperCase()} complete.`];
    }
    if (operation === 'tabulate') {
      if (tokens.length > 3) return [this.usage('list {variable} tabulate [key]')];
      if (!existing.length) return [`List ${base} TABULATE requires a non-empty list.`];
      const requested = tokens[2] === undefined ? { value: '', error: '' } : expand(tokens[2]);
      if (requested.error) return [requested.error];
      const requestedKey = String(requested.value || '').trim();
      const nested = existing.every((entry) => this.variableEngine.tableEntries(`${base}[${entry.key}]`).length > 0);
      let work = [...existing];
      const numeric = (value) => { const n = Number(value); return Number.isFinite(n) ? n : 0; };
      const renamed = [];
      if (nested) {
        const key = requestedKey || indexKey();
        if (!key) return [`List ${base} TABULATE requires an index key for list tables.`];
        for (const entry of work) {
          const value = this.variableEngine.get(`${base}[${entry.key}][${key}]`)?.value;
          if (value === undefined) return [`List ${base} TABULATE could not find key ${key} in item ${entry.key}.`];
          renamed.push({ entry, key: String(value) });
        }
        renamed.sort((a,b)=>numeric(a.key)-numeric(b.key));
      } else {
        renamed.push(...work.map((entry)=>({entry,key:String(entry.value ?? '')})).sort((a,b)=>numeric(a.key)-numeric(b.key)));
      }
      const seen = new Set();
      for (const item of renamed) { if (!item.key || seen.has(item.key)) return [`List ${base} TABULATE produced a duplicate or empty key: ${item.key || '(empty)'}.`]; seen.add(item.key); }
      const snapshots = renamed.map(({entry,key})=>({entry,key,records:collectNodeRecords(entry.key)}));
      this.variableEngine.delete(base);
      for (const item of snapshots) {
        const nextRoot=`${base}[${item.key}]`, oldRoot=`${base}[${item.entry.key}]`;
        if (!item.records.length) { if (!this.variableEngine.define(nextRoot,item.entry.value,this.variableAssignmentClass(base))) return [`List ${base} TABULATE could not store the result.`]; continue; }
        for (const record of item.records) { if (!this.variableEngine.define(`${nextRoot}${record.name.slice(oldRoot.length)}`,record.value,record.className||this.variableAssignmentClass(base))) return [`List ${base} TABULATE could not store the result.`]; }
      }
      indexMap.delete(base); notify(); return [`List ${base} TABULATE complete.`];
    }
    if (operation === 'filter') {
      if(tokens.length<3||tokens.length>4)return[this.usage('list {variable} filter {keep regex} [remove regex]')]; const keepX=expand(tokens[2]||''), removeX=tokens[3]===undefined?{value:'',error:''}:expand(tokens[3]); if(keepX.error)return[keepX.error]; if(removeX.error)return[removeX.error]; const keep=String(keepX.value||''),remove=String(removeX.value||'');
      const work=existing.filter((e)=>{const v=comparable(e); const keepOk=!keep||matchTinTinRegexp(v,keep).matched; const removeHit=remove&&matchTinTinRegexp(v,remove).matched; return keepOk&&!removeHit;}); if(!rewriteOrder(work))return[`List ${base} FILTER could not store the result.`]; notify(); return[`List ${base} FILTER kept ${work.length} items.`];
    }
    if (operation === 'refine') {
      if(tokens.length<3||tokens.length>4)return[this.usage('list {variable} refine {keep math} [remove math]')]; const keepX=expand(tokens[2]||''), removeX=tokens[3]===undefined?{value:'',error:''}:expand(tokens[3]); if(keepX.error)return[keepX.error]; if(removeX.error)return[removeX.error]; const keep=String(keepX.value||''),remove=String(removeX.value||'');
      const truth=(expr,value)=>{if(!expr)return false; const result=evaluateMathExpression(expr.replace(/&0/gu,String(value))); return !result.error&&Number(result.text)!==0;};
      const work=existing.filter((e)=>{const v=comparable(e); return (!keep||truth(keep,v))&&!(remove&&truth(remove,v));}); if(!rewriteOrder(work))return[`List ${base} REFINE could not store the result.`]; notify(); return[`List ${base} REFINE kept ${work.length} items.`];
    }
    return ['NukeFire supports modern bounded TinTin #LIST operations including ADD, CLEAR, COLLAPSE, COPY, CREATE, DELETE, EXPLODE, FILTER, FIND, GET, INDEXATE, INSERT, NUMERATE, ORDER, REFINE, REVERSE, SET, SHUFFLE, SIMPLIFY, SIZE, SORT, SWAP, TABULATE, and TOKENIZE.'];
  }

  handleReplaceCommand(tokens, source, options = {}) {
    if (tokens.length !== 3) return [this.usage('replace {variable} {regular expression} {new text}')];
    const name = normalizeVariableName(tokens[0]);
    if (!name) return ['Replace variable name is invalid.'];
    const record = this.variableEngine.get(name);
    if (!record) return [`Unknown variable: ${tokens[0]}.`];
    const patternExpanded = options.variablesExpanded ? { value: tokens[1], error: '' } : this.expandFunctionAndVariables(tokens[1], source, options);
    if (patternExpanded.error) return [patternExpanded.error];
    const compiled = compileTinTinRegexp(String(patternExpanded.value ?? ''));
    if (compiled.error) return [compiled.error.replace('TinTin REGEXP', 'Replace')];
    let regex;
    try { regex = new RegExp(compiled.source, `${compiled.regex.ignoreCase ? 'i' : ''}gu`); }
    catch (error) { return [`Replace regular expression is invalid: ${error?.message || error}`]; }
    const replacementTemplate = String(tokens[2] ?? '');
    const input = String(record.value ?? '');
    let replacements = 0;
    const value = input.replace(regex, (...args) => {
      replacements += 1;
      const groups = args.at(-1) && typeof args.at(-1) === 'object' ? args.at(-1) : {};
      const captures = { 0: args[0] || '' };
      for (const entry of compiled.captures) captures[entry.target] = groups?.[entry.group] ?? '';
      const withCaptures = substituteTinTinCommandCaptures(replacementTemplate, captures);
      const expanded = options.variablesExpanded ? { value: withCaptures, error: '' } : this.expandFunctionAndVariables(withCaptures, source, options);
      return expanded.error ? withCaptures : String(expanded.value ?? '');
    });
    const stored = this.variableEngine.define(name, value, record.className || '');
    return [stored ? `Variable ${name} updated by REPLACE (${replacements} match${replacements === 1 ? '' : 'es'}).` : `Variable ${name} could not be updated.`];
  }

  handleParseCommand(tokens, source, options = {}) {
    if (tokens.length < 3) {
      return { deliveries: [], messages: [this.usage('parse {text} {variable} {commands}')], activateSessionId: '' };
    }
    const expanded = options.variablesExpanded
      ? { value: tokens[0], error: '' }
      : this.expandFunctionAndVariables(tokens[0], source, options);
    if (expanded.error) return { deliveries: [], messages: [expanded.error], activateSessionId: '' };
    const variableName = normalizeSimpleVariableName(tokens[1]);
    if (!variableName) return { deliveries: [], messages: ['Parse variable must be a simple TinTin variable name.'], activateSessionId: '' };
    const values = [...String(expanded.value ?? '')];
    if (values.length > DEFAULT_MAX_PARSE_ITEMS) {
      return { deliveries: [], messages: [`Parse is limited to ${DEFAULT_MAX_PARSE_ITEMS} characters.`], activateSessionId: '' };
    }
    const parsedCommands = splitTopLevelCommands(tokens.slice(2).join(' '), {
      maxCommands: DEFAULT_MAX_FOREACH_COMMANDS,
      preserveEscapedSemicolon: true,
      commandPrefix: this.commandPrefix
    });
    if (parsedCommands.errorCode) return { deliveries: [], messages: ['Parse command list is invalid.'], activateSessionId: '' };
    const deliveries = [];
    const messages = [];
    let activateSessionId = '';
    for (const value of values) {
      if (!this.assignVariable(variableName, value, options)) {
        messages.push(`Parse could not store ${variableName}.`);
        break;
      }
      const result = this.dispatchCommandSequence(source, parsedCommands.commands, { ...options, parseGenerated: true });
      deliveries.push(...result.deliveries);
      messages.push(...result.messages);
      if (result.activateSessionId) activateSessionId = result.activateSessionId;
    }
    return { deliveries, messages, activateSessionId };
  }

  switchComparable(value, source, options = {}) {
    const expanded = options.variablesExpanded
      ? { value: String(value ?? ''), error: '' }
      : this.expandFunctionAndVariables(value, source, options);
    if (expanded.error) return { value: '', error: expanded.error };
    let text = String(expanded.value ?? '').trim();
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      text = text.slice(1, -1);
    }
    const math = evaluateMathExpression(text);
    return { value: math.error ? text : String(math.value), error: '' };
  }

  handleSwitchCommand(tokens, source, options = {}) {
    if (tokens.length !== 2) {
      return { deliveries: [], messages: [this.usage('switch {value} {#case {value} {commands}; #default {commands}}')], activateSessionId: '' };
    }
    const depth = Math.max(0, Math.trunc(Number(options.switchDepth) || 0));
    if (depth >= DEFAULT_MAX_SWITCH_DEPTH) {
      return { deliveries: [], messages: [`Switch nesting may not exceed ${DEFAULT_MAX_SWITCH_DEPTH} levels.`], activateSessionId: '' };
    }
    const selected = this.switchComparable(tokens[0], source, options);
    if (selected.error) return { deliveries: [], messages: [selected.error], activateSessionId: '' };
    const branches = splitTopLevelCommands(tokens[1], { maxCommands: 64, preserveEscapedSemicolon: true, commandPrefix: this.commandPrefix });
    if (branches.errorCode) return { deliveries: [], messages: ['Switch branch list is invalid.'], activateSessionId: '' };
    let fallback = '';
    let chosen = '';
    for (const branch of branches.commands) {
      const parsed = firstDirective(branch, this.commandPrefix);
      if (!parsed?.directive) continue;
      const branchTokens = tokenizeBraced(parsed.body, { preserveEscapedSemicolon: true });
      if (parsed.directive === 'case') {
        if (branchTokens.length !== 2) return { deliveries: [], messages: ['Switch CASE needs a value and command body.'], activateSessionId: '' };
        const candidate = this.switchComparable(branchTokens[0], source, options);
        if (candidate.error) return { deliveries: [], messages: [candidate.error], activateSessionId: '' };
        if (!chosen && candidate.value === selected.value) chosen = branchTokens[1];
      } else if (parsed.directive === 'default') {
        if (branchTokens.length !== 1) return { deliveries: [], messages: ['Switch DEFAULT needs one command body.'], activateSessionId: '' };
        fallback = branchTokens[0];
      } else {
        return { deliveries: [], messages: ['Switch bodies may contain only #CASE and #DEFAULT branches.'], activateSessionId: '' };
      }
    }
    const body = chosen || fallback;
    if (!body) return { deliveries: [], messages: [], activateSessionId: '' };
    const commands = splitTopLevelCommands(body, { maxCommands: DEFAULT_MAX_CONDITIONAL_COMMANDS, preserveEscapedSemicolon: true, commandPrefix: this.commandPrefix });
    if (commands.errorCode) return { deliveries: [], messages: ['Selected Switch branch is invalid.'], activateSessionId: '' };
    const result = this.dispatchCommandSequence(source, commands.commands, { ...options, switchDepth: depth + 1 });
    return { deliveries: result.deliveries, messages: result.messages, activateSessionId: result.activateSessionId || '' };
  }

  compileTinTinRegex(patternValue) {
    return compileTinTinRegexp(patternValue);
  }

  matchTinTinRegex(textValue, patternValue) {
    const tested = matchTinTinRegexp(textValue, patternValue);
    return {
      matched: tested.matched,
      match: tested.matched ? tested.match : null,
      captures: tested.captures,
      error: tested.error
    };
  }

  substituteTinTinRegexCommand(commandValue, capturesValue = {}) {
    return substituteTinTinCommandCaptures(commandValue, capturesValue).trim();
  }

  handleRegexCommand(tokens, source, options = {}) {
    if (tokens.length < 3 || tokens.length > 4) {
      return { deliveries: [], messages: [this.usage('regexp {string} {expression} {true} {false}')], activateSessionId: '', controlFlow: '' };
    }
    const text = options.variablesExpanded
      ? { value: tokens[0], error: '' }
      : this.expandFunctionAndVariables(tokens[0], source, options);
    if (text.error) return { deliveries: [], messages: [text.error], activateSessionId: '', controlFlow: '' };
    const pattern = options.variablesExpanded
      ? { value: tokens[1], error: '' }
      : this.expandFunctionAndVariables(tokens[1], source, options);
    if (pattern.error) return { deliveries: [], messages: [pattern.error], activateSessionId: '', controlFlow: '' };
    const tested = this.matchTinTinRegex(text.value, pattern.value);
    if (tested.error) return { deliveries: [], messages: [tested.error], activateSessionId: '', controlFlow: '' };
    const selected = tested.matched ? tokens[2] : tokens[3];
    if (!selected) return { deliveries: [], messages: [], activateSessionId: '', controlFlow: '' };
    const body = tested.matched
      ? this.substituteTinTinRegexCommand(selected, tested.captures)
      : String(selected);
    const commands = splitTopLevelCommands(body, {
      maxCommands: DEFAULT_MAX_CONDITIONAL_COMMANDS,
      preserveEscapedSemicolon: true,
      commandPrefix: this.commandPrefix
    });
    if (commands.errorCode) return { deliveries: [], messages: ['REGEXP command body is invalid.'], activateSessionId: '', controlFlow: '' };
    const result = this.dispatchCommandSequence(source, commands.commands, options);
    return { deliveries: result.deliveries, messages: result.messages, activateSessionId: result.activateSessionId || '', controlFlow: result.controlFlow || '', returnValue: result.returnValue };
  }

  handleSendCommand(tokens, source, options = {}) {
    if (tokens.length < 1) return { deliveries: [], messages: [this.usage('send {command}')], activateSessionId: '' };
    const raw = tokens.join(' ');
    const expanded = options.variablesExpanded
      ? { value: raw, error: '' }
      : this.expandFunctionAndVariables(raw, source, options);
    if (expanded.error) return { deliveries: [], messages: [expanded.error], activateSessionId: '' };
    const command = String(expanded.value ?? '').trim();
    if (!command) return { deliveries: [], messages: [this.usage('send {command}')], activateSessionId: '' };
    if (options.localOnly) return { deliveries: [], messages: [`${this.clientCommand('line local')} skipped server-bound SEND output.`], activateSessionId: '' };
    this.tracePipeline(source, 'send-direct', () => command);
    return { deliveries: [this.queueCommand(source.id, command, { source: 'tintin-send' })], messages: [], activateSessionId: '' };
  }

  foreachValues(listValue, source, options = {}) {
    const raw = String(listValue ?? '').trim();
    const tableMatch = raw.match(/^\*([A-Za-z_][A-Za-z0-9_]*)\[%\*\]$/u);
    if (tableMatch) {
      const base = normalizeVariableName(tableMatch[1]);
      return {
        values: this.variableEngine.tableEntries(base).map((entry) => entry.key).slice(0, DEFAULT_MAX_FOREACH_ITEMS),
        error: ''
      };
    }
    const expanded = options.variablesExpanded
      ? { value: raw, error: '' }
      : this.expandFunctionAndVariables(raw, source, options);
    if (expanded.error) return { values: [], error: expanded.error };
    const expandedText = String(expanded.value || '');
    const semicolonList = splitTopLevelCommands(expandedText, {
      maxCommands: DEFAULT_MAX_FOREACH_ITEMS,
      preserveEscapedSemicolon: true,
      commandPrefix: this.commandPrefix
    });
    const braced = parseTinTinBraceChunks(expandedText);
    const parsed = tokenizeBraced(expandedText, { preserveEscapedSemicolon: true });
    const values = !semicolonList.errorCode && semicolonList.commands.length > 1
      ? semicolonList.commands.map((value) => String(value || '').trim()).filter(Boolean)
      : (braced?.length
          ? braced
          : (parsed.length > 1 || /\{[^{}]*\}/u.test(expandedText)
              ? parsed
              : expandedText.split(/\s+/u).filter(Boolean)));
    if (values.length > DEFAULT_MAX_FOREACH_ITEMS) {
      return { values: [], error: `Foreach may contain at most ${DEFAULT_MAX_FOREACH_ITEMS} items.` };
    }
    return { values, error: '' };
  }

  handleForeachCommand(tokens, source, options = {}) {
    if (tokens.length < 3) {
      return { deliveries: [], messages: [this.usage('foreach {list} {variable} {commands}')], activateSessionId: '', controlFlow: '' };
    }
    const depth = Math.max(0, Math.trunc(Number(options.foreachDepth) || 0));
    if (depth >= DEFAULT_MAX_FOREACH_DEPTH) {
      return { deliveries: [], messages: [`Foreach nesting may not exceed ${DEFAULT_MAX_FOREACH_DEPTH} levels.`], activateSessionId: '', controlFlow: '' };
    }
    const variableName = normalizeVariableName(tokens[1]);
    if (!variableName || parseVariablePath(variableName)?.keys.length) {
      return { deliveries: [], messages: ['Foreach variable must be a simple TinTin variable name.'], activateSessionId: '', controlFlow: '' };
    }
    const list = this.foreachValues(tokens[0], source, options);
    if (list.error) return { deliveries: [], messages: [list.error], activateSessionId: '', controlFlow: '' };
    const parsedCommands = splitTopLevelCommands(tokens.slice(2).join(' '), {
      maxCommands: DEFAULT_MAX_FOREACH_COMMANDS,
      preserveEscapedSemicolon: true,
      commandPrefix: this.commandPrefix
    });
    if (parsedCommands.errorCode) {
      return { deliveries: [], messages: [`Foreach command list is invalid or exceeds ${DEFAULT_MAX_FOREACH_COMMANDS} commands.`], activateSessionId: '', controlFlow: '' };
    }
    const deliveries = [];
    const messages = [];
    let activateSessionId = '';
    for (const value of list.values) {
      if (!this.assignVariable(variableName, value, options)) {
        messages.push(`Foreach could not store ${variableName}.`);
        break;
      }
      const result = this.dispatchCommandSequence(source, parsedCommands.commands, {
        ...options,
        foreachGenerated: true,
        foreachDepth: depth + 1,
        iterationControlAllowed: true
      });
      deliveries.push(...result.deliveries);
      messages.push(...result.messages);
      if (result.activateSessionId) activateSessionId = result.activateSessionId;
      if (result.controlFlow === 'return') return { deliveries, messages, activateSessionId, controlFlow: 'return', returnValue: result.returnValue };
      if (result.controlFlow === 'break') break;
      if (result.controlFlow === 'continue') continue;
    }
    return { deliveries, messages, activateSessionId, controlFlow: '' };
  }

  handleForallCommand(tokens, source, options = {}) {
    if (tokens.length !== 2) {
      return { deliveries: [], messages: [this.usage('forall {list} {commands}')], activateSessionId: '', controlFlow: '' };
    }
    const depth = Math.max(0, Math.trunc(Number(options.forallDepth) || 0));
    if (depth >= DEFAULT_MAX_FORALL_DEPTH) {
      return { deliveries: [], messages: [`Forall nesting may not exceed ${DEFAULT_MAX_FORALL_DEPTH} levels.`], activateSessionId: '', controlFlow: '' };
    }
    const list = this.foreachValues(tokens[0], source, options);
    if (list.error) return { deliveries: [], messages: [list.error], activateSessionId: '', controlFlow: '' };
    if (list.values.length > DEFAULT_MAX_FORALL_ITEMS) {
      return { deliveries: [], messages: [`Forall may contain at most ${DEFAULT_MAX_FORALL_ITEMS} items.`], activateSessionId: '', controlFlow: '' };
    }
    const parsedCommands = splitTopLevelCommands(tokens[1], {
      maxCommands: DEFAULT_MAX_FORALL_COMMANDS,
      preserveEscapedSemicolon: true,
      commandPrefix: this.commandPrefix
    });
    if (parsedCommands.errorCode) {
      return { deliveries: [], messages: [`Forall command list is invalid or exceeds ${DEFAULT_MAX_FORALL_COMMANDS} commands.`], activateSessionId: '', controlFlow: '' };
    }
    const deliveries = [];
    const messages = [];
    let activateSessionId = '';
    for (const value of list.values) {
      const commands = parsedCommands.commands.map((command) => String(command || '').replace(/&0(?![0-9])/gu, String(value ?? '')));
      const result = this.dispatchCommandSequence(source, commands, {
        ...options,
        forallGenerated: true,
        forallDepth: depth + 1,
        iterationControlAllowed: true
      });
      deliveries.push(...result.deliveries);
      messages.push(...result.messages);
      if (result.activateSessionId) activateSessionId = result.activateSessionId;
      if (result.controlFlow === 'return') return { deliveries, messages, activateSessionId, controlFlow: 'return', returnValue: result.returnValue };
      if (result.controlFlow === 'break') break;
      if (result.controlFlow === 'continue') continue;
    }
    return { deliveries, messages, activateSessionId, controlFlow: '' };
  }

  handleAllCommand(source, rawBodyValue, options = {}) {
    const rawInput = String(rawBodyValue || '').trim();
    const wrapped = parseTinTinBraceChunks(rawInput);
    const raw = wrapped?.length === 1 ? wrapped[0] : rawInput;
    if (!raw) return { deliveries: [], messages: [this.usage('all {command}')], activateSessionId: '' };
    if (options.allGenerated) return { deliveries: [], messages: ['Nested #ALL commands are not allowed.'], activateSessionId: '' };
    const expanded = options.variablesExpanded
      ? { value: raw, error: '' }
      : this.expandFunctionAndVariables(raw, source, options);
    if (expanded.error) return { deliveries: [], messages: [expanded.error], activateSessionId: '' };
    const command = String(expanded.value || '').trim();
    if (!command) return { deliveries: [], messages: [this.usage('all {command}')], activateSessionId: '' };

    if (options.actionGenerated) {
      if (!isClientCommand(command, this.commandPrefix)) {
        return { deliveries: [], messages: ['Action blocked: #ALL generated by an Action may only run local TinTin state commands.'], activateSessionId: '' };
      }
      const nested = firstDirective(command, this.commandPrefix);
      if (!nested?.directive || !['list', 'variable', 'unvariable', 'showme', 'show', 'echo'].includes(nested.directive)) {
        return { deliveries: [], messages: ['Action blocked: #ALL generated by an Action may only update local lists/variables or local display output.'], activateSessionId: '' };
      }
    }

    const deliveries = [];
    const messages = [];
    const sessions = [...this.sessions.values()];
    for (const target of sessions) {
      const result = this.dispatchCommandSequence(target, [command], {
        ...options,
        allGenerated: true,
        variablesExpanded: true
      });
      deliveries.push(...result.deliveries);
      for (const message of result.messages || []) {
        if (/\b(?:error|blocked|invalid|cannot|could not|unknown|limit|unavailable|not connected)\b/iu.test(String(message || ''))) {
          messages.push(`${target.name}: ${message}`);
        }
      }
    }
    return { deliveries, messages, activateSessionId: '' };
  }

  tintinPathState(source) {
    if (!source?.tintinPath) {
      source.tintinPath = {
        recording: false,
        nodes: [],
        directions: new Map(Object.entries(DEFAULT_TINTIN_PATH_DIRECTIONS)),
        directionCodes: new Map(Object.entries(DEFAULT_TINTIN_PATH_CODES))
      };
    }
    if (!(source.tintinPath.directions instanceof Map)) {
      source.tintinPath.directions = new Map(Object.entries(DEFAULT_TINTIN_PATH_DIRECTIONS));
    }
    if (!(source.tintinPath.directionCodes instanceof Map)) {
      source.tintinPath.directionCodes = new Map(Object.entries(DEFAULT_TINTIN_PATH_CODES));
    }
    if (!Array.isArray(source.tintinPath.nodes)) source.tintinPath.nodes = [];
    return source.tintinPath;
  }

  recordTinTinPathStep(source, commandValue, options = {}) {
    if (options.pathGenerated) return false;
    const state = this.tintinPathState(source);
    if (!state.recording) return false;
    const command = String(commandValue || '').trim().toLowerCase();
    const reverse = state.directions.get(command);
    if (!command || !reverse) return false;
    if (state.nodes.length >= DEFAULT_MAX_PATH_NODES) {
      state.recording = false;
      this.emit(source.id, 'error', `TinTin path recording stopped at the safety limit of ${DEFAULT_MAX_PATH_NODES} nodes.`);
      return false;
    }
    state.nodes.push({ forward: command, backward: reverse });
    return true;
  }

  splitTinTinPathCommands(value, options = {}) {
    const source = String(value || '').trim();
    if (!source) return [];
    const separated = splitTopLevelCommands(source, {
      maxCommands: DEFAULT_MAX_PATH_NODES,
      preserveEscapedSemicolon: true,
      commandPrefix: this.commandPrefix
    });
    if (!separated.errorCode && separated.commands.length > 1) {
      return separated.commands.map((command) => String(command || '').trim()).filter(Boolean);
    }
    if (options.expandSpeedwalk === true) {
      const speedwalk = parseSpeedwalk(source, { maxSteps: DEFAULT_MAX_PATH_NODES });
      if (speedwalk.matched && !speedwalk.error) return speedwalk.steps;
    }
    return [source];
  }

  compressTinTinPathCommands(commandsValue, directionsValue = null) {
    const commands = Array.isArray(commandsValue)
      ? commandsValue.map((value) => String(value || '').trim()).filter(Boolean)
      : [];
    const directions = directionsValue instanceof Map
      ? directionsValue
      : new Map(Object.entries(DEFAULT_TINTIN_PATH_DIRECTIONS));
    const parts = [];
    let pendingDirection = '';
    let count = 0;
    const flush = () => {
      if (!pendingDirection) return;
      parts.push(`${count > 1 ? count : ''}${pendingDirection}`);
      pendingDirection = '';
      count = 0;
    };
    for (const command of commands) {
      if (command.length === 1 && directions.has(command)) {
        if (pendingDirection === command) count += 1;
        else {
          flush();
          pendingDirection = command;
          count = 1;
        }
      } else {
        flush();
        parts.push(command);
      }
    }
    flush();
    return parts.join(';');
  }

  handlePathDirCommand(tokens, source, options = {}) {
    const state = this.tintinPathState(source);
    if (tokens.length === 0) {
      return [...state.directions.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([forward, backward]) => `PATHDIR {${forward}} {${backward}} {${state.directionCodes.get(forward) ?? 0}}`);
    }
    const forwardExpanded = options.variablesExpanded ? { value: tokens[0], error: '' } : this.expandFunctionAndVariables(tokens[0], source, options);
    if (forwardExpanded.error) return [forwardExpanded.error];
    const forward = String(forwardExpanded.value || '').trim().toLowerCase();
    if (!forward || /[;{}\r\n]/u.test(forward)) return [this.usage('pathdir {forward} {backward} [direction code]')];
    if (tokens.length === 1) {
      const matches = [...state.directions.entries()]
        .filter(([name]) => tinTinDefinitionMatches(name, forward))
        .sort(([left], [right]) => left.localeCompare(right));
      return matches.length
        ? matches.map(([name, backward]) => `PATHDIR {${name}} {${backward}} {${state.directionCodes.get(name) ?? 0}}`)
        : [`No PATHDIR matches found for ${forward}.`];
    }
    if (tokens.length > 3) return [this.usage('pathdir {forward} {backward} [direction code]')];
    const backwardExpanded = options.variablesExpanded ? { value: tokens[1], error: '' } : this.expandFunctionAndVariables(tokens[1], source, options);
    if (backwardExpanded.error) return [backwardExpanded.error];
    const backward = String(backwardExpanded.value || '').trim().toLowerCase();
    if (!forward || !backward || /[;{}\r\n]/u.test(forward + backward)) {
      return [this.usage('pathdir {forward} {backward} [direction code]')];
    }
    let code = state.directionCodes.get(forward) ?? 0;
    if (tokens[2] !== undefined) {
      const codeExpanded = options.variablesExpanded ? { value: tokens[2], error: '' } : this.expandFunctionAndVariables(tokens[2], source, options);
      if (codeExpanded.error) return [codeExpanded.error];
      const rawCode = String(codeExpanded.value || '').trim();
      if (!/^\d+$/u.test(rawCode) || Number(rawCode) < 0 || Number(rawCode) >= 64) {
        return ['PATHDIR direction code must be a number between 0 and 63.'];
      }
      code = Number(rawCode);
    }
    state.directions.set(forward, backward);
    state.directionCodes.set(forward, code);
    return [`PATHDIR ${forward} -> ${backward} @ ${code}.`];
  }

  handleUnPathDirCommand(tokens, source, options = {}) {
    if (tokens.length !== 1) return [this.usage('unpathdir {direction or wildcard}')];
    const expanded = options.variablesExpanded
      ? { value: tokens[0], error: '' }
      : this.expandFunctionAndVariables(tokens[0], source, options);
    if (expanded.error) return [expanded.error];
    const pattern = String(expanded.value || '').trim().toLowerCase();
    if (!pattern || /[;{}\r\n]/u.test(pattern)) return [this.usage('unpathdir {direction or wildcard}')];
    const state = this.tintinPathState(source);
    let removed = 0;
    for (const key of [...state.directions.keys()]) {
      if (!tinTinDefinitionMatches(key, pattern)) continue;
      state.directions.delete(key);
      state.directionCodes.delete(key);
      removed += 1;
    }
    return [removed
      ? `UNPATHDIR removed ${removed} direction${removed === 1 ? '' : 's'} matching ${pattern}.`
      : `UNPATHDIR found no direction matching ${pattern}.`];
  }

  handlePathCommand(tokens, source, options = {}) {
    const state = this.tintinPathState(source);
    const operation = resolveTinTinOrderedAbbreviation(tokens[0], TINTIN_PATH_SUBCOMMANDS, { create: 'new', del: 'delete', ins: 'insert', stop: 'stop' });
    const messages = [];
    const deliveries = [];
    if (!operation || operation === 'show' || operation === 'map') {
      if (!state.nodes.length) messages.push('TinTin path is empty.');
      else messages.push(`TinTin path (${state.nodes.length}): ${state.nodes.map((node) => node.forward).join(' ')}`);
      messages.push(`Path recording is ${state.recording ? 'ON' : 'OFF'}.`);
      return { deliveries, messages, activateSessionId: '' };
    }
    if (operation === 'new' || operation === 'create') {
      if (state.recording) {
        return { deliveries, messages: ['TinTin path is already recording; the current recorded path was kept.'], activateSessionId: '' };
      }
      state.nodes = [];
      state.recording = true;
      return { deliveries, messages: ['TinTin path cleared; path recording started.'], activateSessionId: '' };
    }
    if (operation === 'end') {
      const wasRecording = state.recording;
      state.recording = false;
      return { deliveries, messages: [wasRecording ? 'TinTin path recording stopped.' : 'TinTin path recording was already stopped.'], activateSessionId: '' };
    }
    if (operation === 'stop') {
      if (state.recording) {
        state.recording = false;
        return { deliveries, messages: ['TinTin path recording stopped.'], activateSessionId: '' };
      }
      this.tracePipeline(source, 'path', 'Native Mapper route stop requested.');
      this.emit(source.id, 'mapper-route-stop-request', {});
      return { deliveries, messages, activateSessionId: '' };
    }
    if (operation === 'del' || operation === 'delete') {
      const removed = state.nodes.pop();
      return { deliveries, messages: [removed ? `TinTin path deleted ${removed.forward}.` : 'TinTin path is empty.'], activateSessionId: '' };
    }
    if (operation === 'ins' || operation === 'insert') {
      if (tokens.length < 2 || tokens.length > 3) return { deliveries, messages: [this.usage('path ins {forward} [backward]')], activateSessionId: '' };
      const forwardValue = this.expandFunctionAndVariables(tokens[1], source, options);
      if (forwardValue.error) return { deliveries, messages: [forwardValue.error], activateSessionId: '' };
      const forward = String(forwardValue.value || '').trim();
      let backward = '';
      if (tokens[2] !== undefined) {
        const backwardValue = this.expandFunctionAndVariables(tokens[2], source, options);
        if (backwardValue.error) return { deliveries, messages: [backwardValue.error], activateSessionId: '' };
        backward = String(backwardValue.value || '').trim();
      }
      if ((!forward && !backward) || state.nodes.length >= DEFAULT_MAX_PATH_NODES) {
        return { deliveries, messages: [state.nodes.length >= DEFAULT_MAX_PATH_NODES ? `TinTin path may contain at most ${DEFAULT_MAX_PATH_NODES} nodes.` : this.usage('path ins {forward} [backward]')], activateSessionId: '' };
      }
      state.nodes.push({ forward, backward });
      return { deliveries, messages: [`TinTin path inserted ${forward} / ${backward}.`], activateSessionId: '' };
    }
    if (operation === 'save') {
      if (tokens.length !== 3) return { deliveries, messages: [this.usage('path save {forward|backward} {variable}')], activateSessionId: '' };
      const directionExpanded = options.variablesExpanded
        ? { value: tokens[1], error: '' }
        : this.expandFunctionAndVariables(tokens[1], source, options);
      if (directionExpanded.error) return { deliveries, messages: [directionExpanded.error], activateSessionId: '' };
      const variableExpanded = options.variablesExpanded
        ? { value: tokens[2], error: '' }
        : this.expandFunctionAndVariables(tokens[2], source, options);
      if (variableExpanded.error) return { deliveries, messages: [variableExpanded.error], activateSessionId: '' };
      const direction = normalizeToken(directionExpanded.value);
      const variable = normalizeVariableName(variableExpanded.value);
      const forwardDirection = 'forwards'.startsWith(direction) && direction.length > 0;
      const backwardDirection = 'backwards'.startsWith(direction) && direction.length > 0;
      if ((!forwardDirection && !backwardDirection) || !variable) {
        return { deliveries, messages: [this.usage('path save {forward|backward} {variable}')], activateSessionId: '' };
      }
      if (!state.nodes.length) return { deliveries, messages: ['TinTin path is empty; nothing was saved.'], activateSessionId: '' };
      const commands = backwardDirection
        ? [...state.nodes].reverse().map((node) => node.backward)
        : state.nodes.map((node) => node.forward);
      const record = this.assignVariable(variable, commands.join(';'), options);
      return { deliveries, messages: [record ? `TinTin path saved to ${record.name}.` : 'TinTin path variable could not be stored.'], activateSessionId: '' };
    }
    if (operation === 'load' || operation === 'unzip') {
      if (tokens.length < 2) return { deliveries, messages: [this.usage(`path ${operation} {route or variable}`)], activateSessionId: '' };
      const raw = tokens.slice(1).join(' ');
      const expanded = this.expandFunctionAndVariables(raw, source, options);
      if (expanded.error) return { deliveries, messages: [expanded.error], activateSessionId: '' };
      const expandedText = String(expanded.value || '').trim();
      const namedVariable = this.variableEngine.get(expandedText);
      const routeText = namedVariable ? String(namedVariable.value ?? '') : expandedText;
      const commands = this.splitTinTinPathCommands(routeText, { expandSpeedwalk: operation === 'unzip' });
      if (commands.length > DEFAULT_MAX_PATH_NODES) return { deliveries, messages: [`TinTin path may contain at most ${DEFAULT_MAX_PATH_NODES} nodes.`], activateSessionId: '' };
      state.nodes = commands.map((command) => ({
        forward: command,
        backward: state.directions.get(String(command).toLowerCase()) || command
      }));
      state.recording = false;
      return { deliveries, messages: [`TinTin path loaded with ${state.nodes.length} node${state.nodes.length === 1 ? '' : 's'}.`], activateSessionId: '' };
    }
    if (operation === 'zip') {
      if (!state.nodes.length) return { deliveries, messages: ['TinTin path is empty.'], activateSessionId: '' };
      const forward = this.compressTinTinPathCommands(state.nodes.map((node) => node.forward), state.directions);
      const backward = this.compressTinTinPathCommands([...state.nodes].reverse().map((node) => node.backward), state.directions);
      state.nodes = [{ forward, backward }];
      return { deliveries, messages: [`TinTin path zipped to ${forward}${backward && backward !== forward ? ` / ${backward}` : ''}.`], activateSessionId: '' };
    }
    if (operation === 'walk') {
      if (!state.nodes.length) return { deliveries, messages: ['End of TinTin path.'], activateSessionId: '' };
      const walkExpanded = tokens[1] === undefined || options.variablesExpanded
        ? { value: tokens[1] || '', error: '' }
        : this.expandFunctionAndVariables(tokens[1], source, options);
      if (walkExpanded.error) return { deliveries, messages: [walkExpanded.error], activateSessionId: '' };
      const walkDirection = normalizeToken(walkExpanded.value);
      if (tokens.length > 2 || (walkDirection && !'forward'.startsWith(walkDirection) && !'backward'.startsWith(walkDirection))) {
        return { deliveries, messages: [this.usage('path walk [forward|backward]')], activateSessionId: '' };
      }
      const backward = Boolean(walkDirection && 'backward'.startsWith(walkDirection));
      const node = backward ? state.nodes.pop() : state.nodes.shift();
      const command = backward ? node.backward : node.forward;
      if (!command) return { deliveries, messages: ['TinTin path node has no command in that direction.'], activateSessionId: '' };
      const result = this.dispatchCommandSequence(source, [command], { ...options, pathGenerated: true });
      if (!state.nodes.length) this.fireTinTinEvent(source, 'END OF PATH', []);
      return { deliveries: result.deliveries, messages: result.messages, activateSessionId: result.activateSessionId || '' };
    }
    if (operation === 'run' && state.nodes.length) {
      if (tokens.length > 2) return { deliveries, messages: [this.usage('path run [delay]')], activateSessionId: '' };
      const delayToken = String(tokens[1] || '').trim();
      let delay = 0;
      if (delayToken) {
        const expanded = this.expandFunctionAndVariables(delayToken, source, options);
        if (expanded.error) return { deliveries, messages: [expanded.error], activateSessionId: '' };
        const evaluated = evaluateMathExpression(expanded.value);
        if (evaluated.error || !Number.isFinite(evaluated.value) || evaluated.value < 0 || evaluated.value > this.maxDelaySeconds) {
          return { deliveries, messages: [this.usage('path run [delay]')], activateSessionId: '' };
        }
        delay = evaluated.value;
      }
      const commands = state.nodes.map((node) => node.forward);
      state.nodes = [];
      state.recording = false;
      if (!delay) {
        const result = this.dispatchCommandSequence(source, commands, { ...options, pathGenerated: true });
        this.fireTinTinEvent(source, 'END OF PATH', []);
        return { deliveries: result.deliveries, messages: result.messages, activateSessionId: result.activateSessionId || '' };
      }
      for (let index = 0; index < commands.length; index += 1) {
        if (index === 0) {
          const result = this.dispatchCommandSequence(source, [commands[index]], { ...options, pathGenerated: true });
          deliveries.push(...result.deliveries);
          messages.push(...result.messages);
          continue;
        }
        const scheduled = this.scheduleDelay(source, delay * index, commands[index], {
          ...options,
          pathGenerated: true,
          delayName: `PATH ${index}`,
          completionEvent: index === commands.length - 1 ? 'END OF PATH' : ''
        });
        if (!scheduled.scheduled) messages.push(scheduled.message);
      }
      if (commands.length === 1) this.fireTinTinEvent(source, 'END OF PATH', []);
      return { deliveries, messages, activateSessionId: '' };
    }
    if (operation === 'run') {
      if (tokens.length > 2) return { deliveries, messages: [this.usage('path run [delay]')], activateSessionId: '' };
      if (!source.mapperRouteTargetId) return { deliveries, messages: [`No TinTin path is loaded and no Mapper target is ready. Use ${this.clientCommand('map find {room vnum}')} first.`], activateSessionId: '' };
      const argumentToken = String(tokens[1] || '').trim();
      const expanded = argumentToken && !options.variablesExpanded ? this.expandFunctionAndVariables(argumentToken, source, options) : { value: argumentToken, error: '' };
      if (expanded.error) return { deliveries, messages: [expanded.error], activateSessionId: '' };
      const argument = String(expanded.value || '').trim();
      if (argument && !/^(?:\d+(?:\.\d+)?|\.\d+)$/u.test(argument)) return { deliveries, messages: [this.usage('path run [delay]')], activateSessionId: '' };
      this.emit(source.id, 'mapper-route-run-request', { target: source.mapperRouteTargetId, argument });
      return { deliveries, messages, activateSessionId: '' };
    }
    return { deliveries, messages: [this.usage('path {new|end|show|map|ins|del|load|save|zip|unzip|walk|run|stop}')], activateSessionId: '' };
  }

  assignTinTinVariable(nameValue, valueValue, options = {}) {
    const name = normalizeVariableName(nameValue);
    if (!name) return { records: [], error: 'Variable name is invalid.' };
    const path = parseVariablePath(name);
    if (!path?.keys.length) {
      const entries = flattenTinTinTableEntries(name, valueValue);
      if (entries?.length) {
        const className = this.variableAssignmentClass(name);
        const snapshot = this.variableEngine.list();
        this.variableEngine.delete(name);
        const stored = [];
        for (const entry of entries) {
          const record = this.variableEngine.define(entry.name, entry.value, className);
          if (!record) {
            this.variableEngine.replaceAll(snapshot);
            return { records: [], error: 'Variable table could not be stored because the variable limit was reached.' };
          }
          stored.push(record);
        }
        return { records: stored, error: '' };
      }
    }
    const record = this.assignVariable(name, valueValue, options);
    return record ? { records: [record], error: '' } : { records: [], error: 'Variable could not be stored because the variable limit was reached.' };
  }

  handleAliasCommand(tokens, source = null, options = {}) {
    const operation = normalizeToken(tokens[0]);
    const expandName = (value) => (!source || options.variablesExpanded)
      ? { value: String(value ?? ''), error: '' }
      : this.expandFunctionAndVariables(value, source, options);

    if (!operation || (!options.firstArgumentBraced && operation === 'list')) {
      const aliases = this.aliasEngine.list();
      return aliases.length > 0
        ? aliases.map((record) => this.formatAlias(record))
        : ['No aliases are defined.'];
    }

    if (!options.firstArgumentBraced && operation === 'show') {
      const record = this.aliasEngine.get(tokens[1]);
      return record
        ? [this.formatAlias(record)]
        : [tokens[1] ? `Unknown alias: ${tokens[1]}.` : this.usage('alias show {name}')];
    }

    if (!options.firstArgumentBraced && (operation === 'delete' || operation === 'remove')) {
      if (!tokens[1]) return [this.usage('alias delete {name}')];
      return [this.aliasEngine.delete(tokens[1])
        ? `Deleted alias ${tokens[1]}.`
        : `Unknown alias: ${tokens[1]}.`];
    }

    if (tokens.length === 1) {
      const expanded = expandName(tokens[0]);
      if (expanded.error) return [expanded.error];
      const records = this.aliasEngine.list().filter((record) => tinTinDefinitionMatches(record.name, expanded.value));
      return records.length ? records.map((record) => this.formatAlias(record)) : [`Unknown alias: ${expanded.value}.`];
    }

    if (tokens.length < 2) {
      return [this.usage('alias {name} {command;command;...}')];
    }

    const trailingPriority = tokens.length >= 3 && /^\s*[0-9]+(?:\.[0-9]+)?\s*$/u.test(String(tokens.at(-1) || ''))
      ? tokens.at(-1)
      : '';
    const bodyTokens = trailingPriority ? tokens.slice(1, -1) : tokens.slice(1);
    const priority = trailingPriority ? Number(trailingPriority) : 5;
    const expanded = expandName(tokens[0]);
    if (expanded.error) return [expanded.error];
    const record = this.aliasEngine.define(expanded.value, bodyTokens.join(' '), priority, this.classManager.activeName);
    return record
      ? [`Defined alias ${record.name}: ${record.body}`]
      : ['Alias names may use safe TinTin text and %1-%99/%* patterns; bodies may contain up to 32 valid semicolon-separated commands and priorities range from 1 through 9.'];
  }

  handleVariableCommand(tokens, source, options = {}) {
    const operation = normalizeToken(tokens[0]);
    const expandName = (value) => (!source || options.variablesExpanded)
      ? { value: String(value ?? ''), error: '' }
      : this.expandFunctionAndVariables(value, source, options);

    if (!operation || (!options.firstArgumentBraced && operation === 'list')) {
      const variables = this.variableEngine.list();
      return variables.length > 0
        ? variables.map((record) => this.formatVariable(record))
        : ['No variables are defined.'];
    }

    if (!options.firstArgumentBraced && operation === 'show') {
      const expandedName = expandName(tokens[1]);
      if (expandedName.error) return [expandedName.error];
      const record = this.variableEngine.get(expandedName.value);
      return record
        ? [this.formatVariable(record)]
        : [tokens[1] ? `Unknown variable: ${expandedName.value}.` : this.usage('variable show {name}')];
    }

    if (!options.firstArgumentBraced && (operation === 'delete' || operation === 'remove')) {
      if (!tokens[1]) return [this.usage('variable delete {name}')];
      const expandedName = expandName(tokens[1]);
      if (expandedName.error) return [expandedName.error];
      return [this.variableEngine.delete(expandedName.value)
        ? `Deleted variable ${normalizeVariableName(expandedName.value)}.`
        : `Unknown variable: ${expandedName.value}.`];
    }

    if (!options.firstArgumentBraced && (operation === 'set' || operation === 'define')) {
      if (tokens.length < 2) return [this.usage('variable set {name} {value}')];
      const expandedName = expandName(tokens[1]);
      if (expandedName.error) return [expandedName.error];
      const assigned = this.assignTinTinVariable(expandedName.value, tokens.slice(2).join(' '), options);
      if (assigned.error) return [assigned.error];
      return assigned.records.length === 1
        ? [`Set variable ${assigned.records[0].name}: ${assigned.records[0].value}`]
        : [`Set table ${normalizeVariableName(expandedName.value)}: ${assigned.records.length} nested variable${assigned.records.length === 1 ? '' : 's'}.`];
    }

    if (tokens.length === 1) {
      const expandedPattern = expandName(tokens[0]);
      if (expandedPattern.error) return [expandedPattern.error];
      const records = this.variableEngine.list().filter((record) => tinTinDefinitionMatches(record.name, expandedPattern.value));
      return records.length
        ? records.map((record) => this.formatVariable(record))
        : [`Unknown variable: ${expandedPattern.value}.`];
    }

    const expandedName = expandName(tokens[0]);
    if (expandedName.error) return [expandedName.error];
    const assigned = this.assignTinTinVariable(expandedName.value, tokens.slice(1).join(' '), options);
    if (assigned.error) return [assigned.error];
    return assigned.records.length === 1
      ? [`Set variable ${assigned.records[0].name}: ${assigned.records[0].value}`]
      : [`Set table ${normalizeVariableName(expandedName.value)}: ${assigned.records.length} nested variable${assigned.records.length === 1 ? '' : 's'}.`];
  }

  handleUnvariableCommand(tokens, source, options = {}) {
    const rawPattern = tokens.join(' ').trim();
    if (!rawPattern) return [this.usage('unvariable {name}')];
    const expanded = (!source || options.variablesExpanded)
      ? { value: rawPattern, error: '' }
      : this.expandFunctionAndVariables(rawPattern, source, options);
    if (expanded.error) return [expanded.error];
    const pattern = String(expanded.value || '').trim();
    const normalizedExact = normalizeVariableName(pattern);
    if (normalizedExact && !pattern.includes('%')) {
      if (!this.variableEngine.delete(normalizedExact)) return [`Unknown variable: ${pattern}.`];
      return [`Deleted variable ${normalizedExact}.`];
    }
    const matches = this.variableEngine.list().filter((record) => tinTinDefinitionMatches(record.name, pattern));
    if (!matches.length) return [`Unknown variable: ${pattern}.`];
    for (const record of matches) this.variableEngine.delete(record.name);
    return matches.length === 1
      ? [`Deleted variable ${matches[0].name}.`]
      : [`Deleted ${matches.length} variables matching ${pattern}.`];
  }

  handleFunctionCommand(tokens, source = null, options = {}) {
    const operation = normalizeToken(tokens[0]);
    const expandName = (value) => (!source || options.variablesExpanded)
      ? { value: String(value ?? ''), error: '' }
      : this.expandFunctionAndVariables(value, source, options);
    if (!operation || (!options.firstArgumentBraced && operation === 'list')) {
      const functions = this.functionEngine.list();
      return functions.length > 0
        ? functions.map((record) => this.formatFunction(record))
        : ['No functions are defined.'];
    }
    if (!options.firstArgumentBraced && operation === 'show') {
      const record = this.functionEngine.get(tokens[1]);
      return record
        ? [this.formatFunction(record)]
        : [tokens[1] ? `Unknown function: ${tokens[1]}.` : this.usage('function show {name}')];
    }
    if (!options.firstArgumentBraced && (operation === 'delete' || operation === 'remove')) {
      if (!tokens[1]) return [this.usage('function delete {name}')];
      return [this.functionEngine.delete(tokens[1])
        ? `Deleted function ${normalizeFunctionName(tokens[1])}.`
        : `Unknown function: ${tokens[1]}.`];
    }
    if (tokens.length === 1) {
      const expanded = expandName(tokens[0]);
      if (expanded.error) return [expanded.error];
      const records = this.functionEngine.list().filter((record) => tinTinDefinitionMatches(record.name, expanded.value));
      return records.length ? records.map((record) => this.formatFunction(record)) : [`Unknown function: ${expanded.value}.`];
    }
    if (tokens.length < 2) return [this.usage('function {name} {commands}')];
    const expanded = expandName(tokens[0]);
    if (expanded.error) return [expanded.error];
    const record = this.functionEngine.define(
      expanded.value,
      tokens.slice(1).join(' '),
      this.classManager.activeName
    );
    return record
      ? [`Defined function @${record.name}.`]
      : ['Function names must start with a letter and use only letters, numbers, or underscores; bodies cannot be empty.'];
  }

  handleUnfunctionCommand(tokens, source = null, options = {}) {
    const rawPattern = tokens.join(' ').trim();
    if (!rawPattern) return [this.usage('unfunction {name}')];
    const expanded = (!source || options.variablesExpanded) ? { value: rawPattern, error: '' } : this.expandFunctionAndVariables(rawPattern, source, options);
    if (expanded.error) return [expanded.error];
    const pattern = String(expanded.value || '').trim();
    const matches = this.functionEngine.list().filter((record) => tinTinDefinitionMatches(record.name, pattern));
    if (!matches.length) return [`Unknown function: ${pattern}.`];
    for (const record of matches) this.functionEngine.delete(record.name);
    return matches.length === 1 ? [`Deleted function ${matches[0].name}.`] : [`Deleted ${matches.length} functions matching ${pattern}.`];
  }

  formatTinTinValue(formatValue, argumentValues, options = {}, commandLabel = 'Echo') {
    let format = String(formatValue ?? '');
    let argumentsList = Array.isArray(argumentValues) ? [...argumentValues] : [];
    if (!options.variablesExpanded) {
      const functionFormat = this.expandFunctions(format, options.source || null, options);
      if (functionFormat.error) return { text: '', error: functionFormat.error, usedArguments: 0 };
      const protectedFormat = protectEchoFormatSpecifiers(functionFormat.value);
      const expandedFormat = this.variableExpansion(protectedFormat.value, options);
      if (expandedFormat.error) return { text: '', error: expandedFormat.error, usedArguments: 0 };
      format = protectedFormat.restore(expandedFormat.value);
      const argumentTypes = echoFormatArgumentTypes(format);
      const expandedArguments = [];
      for (let argumentIndex = 0; argumentIndex < argumentsList.length; argumentIndex += 1) {
        const functionArgument = this.expandFunctions(argumentsList[argumentIndex], options.source || null, options);
        if (functionArgument.error) return { text: '', error: functionArgument.error, usedArguments: argumentIndex };
        const protectedArgument = argumentTypes[argumentIndex] === 't'
          ? protectEchoTimeSpecifiers(functionArgument.value)
          : { value: functionArgument.value, restore: (value) => value };
        const expanded = this.variableExpansion(protectedArgument.value, options);
        if (expanded.error) return { text: '', error: expanded.error, usedArguments: argumentIndex };
        expandedArguments.push(protectedArgument.restore(expanded.value));
      }
      argumentsList = expandedArguments;
    }
    return formatTinTinEcho(format, argumentsList, {
      commandLabel,
      evaluateMath: (expression) => evaluateMathExpression(expression)
    });
  }

  variableAssignmentClass(nameValue) {
    return this.variableEngine.get(nameValue)?.className || this.classManager.activeName;
  }

  handleCatCommand(tokens, source, options = {}) {
    if (tokens.length < 2) return [this.usage('cat {variable} {argument}')];
    const destination = options.variablesExpanded ? { value: tokens[0], error: '' } : this.expandFunctionAndVariables(tokens[0], source, options);
    if (destination.error) return [destination.error];
    const name = normalizeVariableName(destination.value);
    if (!name) return ['Cat variable name is invalid.'];
    const raw = tokens.slice(1).join(' ');
    const expanded = options.variablesExpanded ? { value: raw, error: '' } : this.expandFunctionAndVariables(raw, source, options);
    if (expanded.error) return [expanded.error];
    const current = this.variableEngine.get(name);
    const combined = `${current?.value ?? ''}${expanded.value ?? ''}`;
    const assigned = this.assignTinTinVariable(name, combined, options);
    if (assigned.error) return [assigned.error];
    return [`Variable ${name} concatenated.`];
  }

  handleMathCommand(tokens, source, options = {}) {
    if (tokens.length < 2) return [this.usage('math {variable} {expression}')];
    const destination = (!source || options.variablesExpanded)
      ? { value: tokens[0], error: '' }
      : this.expandFunctionAndVariables(tokens[0], source, options);
    if (destination.error) return [destination.error];
    const name = normalizeVariableName(destination.value);
    if (!name) return ['Math variable names must be valid NukeFire/TinTin variable names.'];
    const expressionValue = tokens.slice(1).join(' ');
    const expanded = (!source || options.variablesExpanded)
      ? { value: expressionValue, error: '' }
      : this.expandFunctionAndVariables(expressionValue, source, options);
    if (expanded.error) return [expanded.error];
    const result = evaluateMathExpression(expanded.value);
    if (result.error) return [result.error];
    const record = this.assignVariable(name, result.text, options);
    if (!record) return ['Math could not store the result because the variable limit was reached.'];
    this.tracePipeline(source, 'math', () => `${expanded.value} => ${record.name} = ${record.value}`);
    return [`Math stored ${record.name}: ${record.value}`];
  }

  handleFormatCommand(tokens, source, options = {}) {
    if (tokens.length < 2) return [this.usage('format {variable} {format} {argument1} {argument2} ...')];
    const destination = (!source || options.variablesExpanded)
      ? { value: tokens[0], error: '' }
      : this.expandFunctionAndVariables(tokens[0], source, options);
    if (destination.error) return [destination.error];
    const name = normalizeVariableName(destination.value);
    if (!name) return ['Format variable names must be valid NukeFire/TinTin variable names.'];
    const formatted = this.formatTinTinValue(tokens[1], tokens.slice(2), { ...options, source }, 'Format');
    if (formatted.error) return [formatted.error];
    if (/\x1b\[[0-9;]*m/u.test(formatted.text)) {
      return ['Format stores plain variable text and cannot store terminal color codes. Use #echo for colored output.'];
    }
    const record = this.assignVariable(name, formatted.text, options);
    if (!record) return ['Format could not store the result because the variable limit was reached.'];
    this.tracePipeline(source, 'format', () => `${tokens[1]} => ${record.name} = ${record.value}`);
    return [`Format stored ${record.name}: ${record.value}`];
  }

  actionManagementAllowed(parsed, source, options = {}) {
    if (!options.actionGenerated || !parsed?.directive) return false;
    if (/^\d+$/u.test(parsed.directive)) {
      const repeatCount = Number(parsed.directive);
      return !options.repeatGenerated
        && Number.isSafeInteger(repeatCount)
        && repeatCount >= 1
        && repeatCount <= this.maxRepeatCommands
        && Boolean(String(parsed.body || '').trim());
    }
    const tokens = tokenizeBraced(parsed.body, { preserveEscapedSemicolon: true });
    if (parsed.directive === 'unaction' && options.actionPattern) {
      return tokens.length === 1
        && String(tokens[0] || '').trim() === String(options.actionPattern || '').trim();
    }
    if (parsed.directive === 'read' && options.delayGenerated && options.actionPattern) {
      if (tokens.length !== 1) return false;
      const requested = String(tokens[0] || '').trim().normalize('NFKC').toLowerCase();
      const profile = String(this.profileFileLabel(source) || '').trim().normalize('NFKC').toLowerCase();
      return Boolean(requested && profile && requested === profile);
    }
    return false;
  }

  luaAutomationId(value) {
    const id = Math.max(1, Math.trunc(Number(value) || 0));
    return Number.isSafeInteger(id) ? id : 0;
  }

  luaAutomationEngineKind(kindValue) {
    const kind = String(kindValue || '').trim().toLowerCase();
    if (kind === 'alias') return 'alias';
    if (['substring-trigger', 'regex-trigger', 'exact-trigger'].includes(kind)) return 'trigger';
    if (kind === 'event') return 'event';
    if (kind === 'timer') return 'timer';
    return '';
  }

  luaAutomationOwner(value) {
    const owner = String(value || '')
      .normalize('NFKC')
      .trim()
      .replace(/[\u0000-\u001F\u007F]/gu, '')
      .slice(0, 192);
    return owner && /^[A-Za-z0-9_.:@/-]+$/u.test(owner) ? owner : '';
  }

  removeLuaAutomation(session, idValue, options = {}) {
    const id = this.luaAutomationId(idValue);
    const record = session?.luaAutomations?.get(id);
    if (!id || !record) return false;
    if (record.timer) {
      this.delayClearTimer(record.timer);
      record.timer = null;
    }
    this.withTinTinSession(session, () => {
      if (record.engineKind === 'alias') this.aliasEngine.removeLuaTransient?.(id);
      else if (record.engineKind === 'trigger') this.actionEngine.removeLuaTransient?.(id);
      else if (record.engineKind === 'event') this.eventEngine.removeLuaTransient?.(id);
    });
    session.luaAutomations.delete(id);
    if (options.forgetCallback === true) {
      try {
        const forgotten = this.handlers.onLuaCallbackForgotten?.(session.id, id);
        if (forgotten && typeof forgotten.catch === 'function') forgotten.catch(() => {});
      } catch {
        // Host-side retirement remains authoritative even if Worker cleanup fails.
      }
    }
    return true;
  }

  clearLuaAutomations(session) {
    if (!session?.luaAutomations) return 0;
    const ids = [...session.luaAutomations.keys()];
    for (const id of ids) this.removeLuaAutomation(session, id, { forgetCallback: false });
    session.luaCallbackTimestamps = [];
    this.withTinTinSession(session, () => {
      this.aliasEngine.clearLuaTransients?.();
      this.actionEngine.clearLuaTransients?.();
      this.eventEngine.clearLuaTransients?.();
    });
    return ids.length;
  }

  removeLuaAutomationsByOwner(reference, ownerValue) {
    const session = this.findSession(reference);
    const owner = this.luaAutomationOwner(ownerValue);
    if (!session?.luaAutomations || !owner) return [];
    const ids = [...session.luaAutomations.values()]
      .filter((record) => record?.owner === owner)
      .map((record) => record.id);
    for (const id of ids) this.removeLuaAutomation(session, id, { forgetCallback: false });
    return ids;
  }

  setLuaAutomationEnabled(session, record, enabledValue) {
    if (!session || !record) return false;
    const enabled = Boolean(enabledValue);
    record.enabled = enabled;
    if (record.engineKind === 'timer') {
      if (!enabled && record.timer) {
        this.delayClearTimer(record.timer);
        record.timer = null;
      } else if (enabled && !record.timer) this.armLuaTimer(session, record);
      return true;
    }
    return this.withTinTinSession(session, () => {
      if (record.engineKind === 'alias') return this.aliasEngine.setLuaTransientEnabled?.(record.id, enabled) === true;
      if (record.engineKind === 'trigger') return this.actionEngine.setLuaTransientEnabled?.(record.id, enabled) === true;
      if (record.engineKind === 'event') return this.eventEngine.setLuaTransientEnabled?.(record.id, enabled) === true;
      return false;
    });
  }

  armLuaTimer(session, record) {
    if (!session || !record || record.engineKind !== 'timer' || record.enabled === false || record.timer) return false;
    const seconds = Number(record.seconds);
    if (!Number.isFinite(seconds) || seconds < 0.01 || seconds > this.maxDelaySeconds) return false;
    record.timer = this.delaySetTimer(() => {
      record.timer = null;
      if (this.sessions.get(session.id) !== session || session.luaAutomations?.get(record.id) !== record || record.enabled === false) return;
      this.invokeLuaAutomation(session, record.id, { matches: [], namedMatches: {}, args: [] }, { source: 'timer' });
    }, Math.max(10, Math.round(seconds * 1000)));
    return true;
  }

  registerLuaAutomation(reference, automationValue = {}, options = {}) {
    const session = this.findSession(reference);
    if (!session) return { registered: false, reason: 'unknown-session' };
    session.luaAutomations ||= new Map();
    const spec = automationValue && typeof automationValue === 'object' ? automationValue : {};
    const id = this.luaAutomationId(spec.id);
    const kind = String(spec.kind || '').trim().toLowerCase();
    const engineKind = this.luaAutomationEngineKind(kind);
    if (!id || !engineKind) return { registered: false, reason: 'invalid-automation' };
    if (!session.luaAutomations.has(id) && session.luaAutomations.size >= this.maxLuaAutomations) {
      return { registered: false, reason: 'limit' };
    }
    if (session.luaAutomations.has(id)) this.removeLuaAutomation(session, id, { forgetCallback: false });

    const pattern = String(spec.pattern || '').normalize('NFKC');
    const expireAfter = Math.max(0, Math.trunc(Number(spec.expireAfter) || 0));
    const record = {
      id,
      kind,
      engineKind,
      pattern,
      enabled: true,
      expireAfter,
      remaining: expireAfter,
      pendingMatches: 0,
      oneShot: spec.oneShot === true,
      seconds: Number(spec.seconds) || 0,
      repeating: spec.repeating === true,
      timer: null,
      source: String(options.source || 'lua').slice(0, 32),
      owner: this.luaAutomationOwner(options.resourceOwner)
    };

    let installed = false;
    if (engineKind === 'timer') {
      if (!Number.isFinite(record.seconds) || record.seconds < 0.01 || record.seconds > this.maxDelaySeconds) {
        return { registered: false, reason: 'invalid-timer' };
      }
      installed = true;
    } else {
      installed = this.withTinTinSession(session, () => {
        if (engineKind === 'alias') return Boolean(this.aliasEngine.defineLuaTransient?.(id, pattern));
        if (engineKind === 'trigger') {
          const triggerKind = kind === 'regex-trigger' ? 'regex' : kind === 'exact-trigger' ? 'exact' : 'substring';
          return Boolean(this.actionEngine.defineLuaTransient?.(id, triggerKind, pattern));
        }
        if (engineKind === 'event') return Boolean(this.eventEngine.defineLuaTransient?.(id, pattern, record.oneShot));
        return false;
      });
    }
    if (!installed) return { registered: false, reason: 'invalid-pattern' };
    session.luaAutomations.set(id, record);
    if (engineKind === 'timer' && !this.armLuaTimer(session, record)) {
      session.luaAutomations.delete(id);
      return { registered: false, reason: 'timer-failed' };
    }
    return { registered: true, id, kind };
  }

  controlLuaAutomation(reference, automationValue = {}) {
    const session = this.findSession(reference);
    if (!session) return { changed: false, reason: 'unknown-session' };
    const spec = automationValue && typeof automationValue === 'object' ? automationValue : {};
    const id = this.luaAutomationId(spec.id);
    const record = session.luaAutomations?.get(id);
    if (!id || !record) return { changed: false, reason: 'unknown-id' };
    const requestedKind = this.luaAutomationEngineKind(spec.kind);
    if (requestedKind && requestedKind !== record.engineKind) return { changed: false, reason: 'wrong-kind' };
    const action = String(spec.action || '').trim().toLowerCase();
    if (action === 'kill') return { changed: this.removeLuaAutomation(session, id, { forgetCallback: false }), id, action };
    if (action === 'enable') return { changed: this.setLuaAutomationEnabled(session, record, true), id, action };
    if (action === 'disable') return { changed: this.setLuaAutomationEnabled(session, record, false), id, action };
    return { changed: false, reason: 'invalid-action' };
  }

  allowLuaCallback(session) {
    if (!session) return false;
    const now = Date.now();
    session.luaCallbackTimestamps ||= [];
    session.luaCallbackTimestamps = session.luaCallbackTimestamps.filter((timestamp) => now - timestamp < 1000);
    if (session.luaCallbackTimestamps.length >= this.maxLuaCallbacksPerSecond) return false;
    session.luaCallbackTimestamps.push(now);
    return true;
  }

  invokeLuaAutomation(session, idValue, contextValue = {}, options = {}) {
    const id = this.luaAutomationId(idValue);
    const record = session?.luaAutomations?.get(id);
    if (!id || !record || record.enabled === false) return false;
    if (record.expireAfter > 0 && record.remaining - record.pendingMatches <= 0) return false;
    if (!this.allowLuaCallback(session)) return false;
    const runner = this.handlers.onLuaCallback;
    if (typeof runner !== 'function') return false;

    if (record.oneShot) this.setLuaAutomationEnabled(session, record, false);
    record.pendingMatches += 1;
    const context = contextValue && typeof contextValue === 'object' ? contextValue : {};
    const request = {
      sessionId: session.id,
      callbackId: id,
      context: {
        line: String(context.line || '').slice(0, 16384),
        command: String(context.command || '').slice(0, 4096),
        matches: Array.isArray(context.matches) ? context.matches.slice(0, 100).map((value) => String(value ?? '').slice(0, 4096)) : [],
        namedMatches: context.namedMatches && typeof context.namedMatches === 'object' ? context.namedMatches : {},
        args: Array.isArray(context.args) ? context.args.slice(0, 32) : []
      },
      source: String(options.source || record.engineKind || 'callback').slice(0, 32),
      resourceOwner: record.owner || ''
    };

    Promise.resolve(runner(request))
      .then((result) => {
        if (this.sessions.get(session.id) !== session) return;
        const current = session.luaAutomations?.get(id);
        if (current) current.pendingMatches = Math.max(0, current.pendingMatches - 1);
        this.emit(session.id, 'lua-result', { ...result, source: request.source, callbackId: id });
        if (!current) return;
        const skipExpiration = result?.values?.[0] === true;
        if (current.oneShot || (current.engineKind === 'timer' && !current.repeating)) {
          this.removeLuaAutomation(session, id, { forgetCallback: true });
          return;
        }
        if (current.expireAfter > 0 && !skipExpiration) {
          current.remaining = Math.max(0, current.remaining - 1);
          if (current.remaining <= 0) {
            this.removeLuaAutomation(session, id, { forgetCallback: true });
            return;
          }
        }
        if (current.engineKind === 'timer' && current.repeating && current.enabled !== false) this.armLuaTimer(session, current);
      })
      .catch((error) => {
        if (this.sessions.get(session.id) !== session) return;
        const current = session.luaAutomations?.get(id);
        if (current) current.pendingMatches = Math.max(0, current.pendingMatches - 1);
        this.emit(session.id, 'lua-result', {
          ok: false,
          error: { type: 'host', message: String(error?.message || error || 'Lua callback host error').slice(0, 4096) },
          echoes: [], sends: [], variableSets: [], tableSets: [], gmcpSends: [], executions: [], automations: [],
          source: request.source,
          callbackId: id
        });
        if (!current) return;
        if (current.oneShot || (current.engineKind === 'timer' && !current.repeating)) {
          this.removeLuaAutomation(session, id, { forgetCallback: true });
          return;
        }
        if (current.expireAfter > 0) {
          current.remaining = Math.max(0, current.remaining - 1);
          if (current.remaining <= 0) {
            this.removeLuaAutomation(session, id, { forgetCallback: true });
            return;
          }
        }
        if (current.engineKind === 'timer' && current.repeating && current.enabled !== false) this.armLuaTimer(session, current);
      });
    return true;
  }

  fireLuaEventHandlers(session, eventNameValue, argumentsValue = []) {
    if (!session) return 0;
    const eventName = String(eventNameValue || '').normalize('NFKC').trim().slice(0, 160);
    if (!eventName) return 0;
    const handlers = this.withTinTinSession(session, () => this.eventEngine.matchLuaTransients?.(eventName) || []);
    let fired = 0;
    for (const handler of handlers) {
      if (this.invokeLuaAutomation(session, handler.id, {
        matches: [],
        namedMatches: {},
        args: [eventName, ...(Array.isArray(argumentsValue) ? argumentsValue.slice(0, 31) : [])]
      }, { source: eventName.startsWith('gmcp.') || eventName === 'gmcp' ? 'gmcp-event' : 'event' })) fired += 1;
    }
    return fired;
  }

  raiseLuaEvent(reference, eventNameValue, argsJsonValue = '[]') {
    const session = this.findSession(reference);
    if (!session) return { fired: 0, reason: 'unknown-session' };
    const eventName = String(eventNameValue || '').normalize('NFKC').trim().slice(0, 160);
    const json = String(argsJsonValue || '[]');
    if (!eventName || /[\r\n\u0000]/u.test(eventName) || Buffer.byteLength(json, 'utf8') > 64 * 1024) return { fired: 0, reason: 'invalid-event' };
    let args;
    try { args = JSON.parse(json); } catch { return { fired: 0, reason: 'invalid-arguments' }; }
    if (!Array.isArray(args)) return { fired: 0, reason: 'invalid-arguments' };
    const boundedArgs = args.slice(0, 31);
    const luaFired = this.fireLuaEventHandlers(session, eventName, boundedArgs);
    const tintinResult = this.fireTinTinEvent(session, eventName, boundedArgs, { skipLua: true });
    return { fired: luaFired + (tintinResult.fired ? 1 : 0), eventName };
  }

  raiseLuaGlobalEvent(reference, eventNameValue, argsJsonValue = '[]') {
    const source = this.findSession(reference);
    if (!source) return { fired: 0, reason: 'unknown-session' };
    const eventName = String(eventNameValue || '').normalize('NFKC').trim().slice(0, 160);
    const json = String(argsJsonValue || '[]');
    if (!eventName || /[\r\n\u0000]/u.test(eventName) || Buffer.byteLength(json, 'utf8') > 64 * 1024) return { fired: 0, reason: 'invalid-event' };
    let args;
    try { args = JSON.parse(json); } catch { return { fired: 0, reason: 'invalid-arguments' }; }
    if (!Array.isArray(args)) return { fired: 0, reason: 'invalid-arguments' };
    const boundedArgs = args.slice(0, 30);
    const originName = String(source.name || source.characterName || source.id).slice(0, 128);
    let fired = 0;
    let sessions = 0;
    for (const target of this.sessions.values()) {
      if (target.id === source.id) continue;
      sessions += 1;
      const deliveredArgs = [...boundedArgs, originName];
      fired += this.fireLuaEventHandlers(target, eventName, deliveredArgs);
      const tintinResult = this.fireTinTinEvent(target, eventName, deliveredArgs, { skipLua: true });
      if (tintinResult.fired) fired += 1;
    }
    return { fired, sessions, eventName };
  }

  requestLuaReconnect(reference) {
    const session = this.findSession(reference);
    if (!session) return { requested: false, reason: 'unknown-session' };
    if (session.status?.state === 'connected' || session.status?.state === 'connecting') {
      this.disconnectSession(session.id, 'Reconnecting by Lua request.');
    }
    Promise.resolve(this.connectSession(session.id, { host: session.host, port: session.port })).catch((error) => {
      if (this.sessions.has(session.id)) this.emit(session.id, 'error', `Lua reconnect failed: ${String(error?.message || error || 'unknown error').slice(0, 1024)}`);
    });
    return { requested: true, sessionId: session.id };
  }

  dispatchLuaInput(sourceReference, rawCommand, options = {}) {
    const source = this.findSession(sourceReference);
    if (!source) return { handled: true, deliveries: [], messages: ['No active session.'], snapshot: this.snapshot() };
    const command = String(rawCommand ?? '').replace(/[\r\n]+$/u, '');
    if (!command.includes(';')) {
      return this.dispatchCommand(source, command, {
        ...options,
        luaGenerated: true
      });
    }
    const parsedCommands = splitTopLevelCommands(command, {
      maxCommands: this.maxCommandLineCommands,
      preserveEscapedSemicolon: true,
      commandPrefix: this.commandPrefix
    });
    if (parsedCommands.errorCode) {
      return {
        handled: true,
        deliveries: [],
        messages: [`Lua execute() produced an invalid command list (${parsedCommands.errorCode}).`],
        snapshot: this.snapshot()
      };
    }
    return this.dispatchCommandSequence(source, parsedCommands.commands, {
      ...options,
      luaGenerated: true,
      commandLineBatch: true
    });
  }

  normalizeSoundEventName(value) {
    const event = String(value || '').normalize('NFKC').trim().toLowerCase();
    if (!event || event.length > SOUND_EVENT_NAME_MAX || !SOUND_EVENT_NAME_PATTERN.test(event)) return '';
    return event;
  }

  soundRequestInteractive(options = {}) {
    return !(
      options.actionGenerated === true
      || options.aliasExpanded === true
      || Boolean(options.functionContext)
      || options.loopGenerated === true
      || options.eventGenerated === true
      || options.tickerGenerated === true
      || options.delayGenerated === true
      || options.repeatGenerated === true
      || options.foreachGenerated === true
      || options.forallGenerated === true
      || options.whileGenerated === true
      || options.parseGenerated === true
      || options.luaGenerated === true
    );
  }

  handleLuaCommand(parsed, source, options = {}) {
    const script = unwrapLuaScriptArgument(parsed?.body || '');
    if (!script.trim()) {
      return { deliveries: [], messages: [`Lua usage: ${this.clientCommand('lua {echo("hello")}')}`] };
    }
    const depth = Math.max(0, Math.trunc(Number(options.luaDepth) || 0));
    if (depth >= this.maxLuaExecutionDepth) {
      return {
        deliveries: [],
        messages: [`Lua execution nesting may not exceed ${this.maxLuaExecutionDepth} levels.`]
      };
    }
    const runner = this.handlers.onLuaExecute;
    if (typeof runner !== 'function') {
      return { deliveries: [], messages: ['Lua is unavailable in this build.'] };
    }
    const request = {
      sessionId: source.id,
      script,
      depth: depth + 1,
      source: options.luaGenerated ? 'lua'
        : options.actionGenerated ? 'action'
          : options.delayGenerated ? 'delay'
            : options.aliasExpanded ? 'alias'
              : 'command'
    };
    const beforeSync = this.rendererSyncToken();
    Promise.resolve(runner(request))
      .then((result) => {
        if (!this.sessions.has(source.id)) return;
        const snapshot = this.rendererSyncTokenMatches(beforeSync, this.rendererSyncToken()) ? null : this.snapshot();
        this.emit(source.id, 'lua-result', {
          ...result,
          snapshot,
          depth: request.depth,
          source: request.source
        });
      })
      .catch((error) => {
        if (!this.sessions.has(source.id)) return;
        this.emit(source.id, 'lua-result', {
          ok: false,
          error: { type: 'host', message: String(error?.message || error || 'Lua host error').slice(0, 4096) },
          echoes: [], sends: [], variableSets: [], executions: [],
          depth: request.depth,
          source: request.source
        });
      });
    return {
      deliveries: [],
      messages: source.tintin?.config?.commandEcho === true ? ['[Lua] running...'] : []
    };
  }

  dispatchInput(sourceReference, rawCommand) {
    let source = this.findSession(sourceReference);
    if (!source) return { handled: true, deliveries: [], messages: ['No active session.'], snapshot: this.snapshot() };
    const typedCommand = String(rawCommand ?? '').replace(/[\r\n]+$/u, '');
    const history = source.tintinCommandHistory ||= [];
    const config = source.tintin?.config || {};
    const repeatChar = [...String(config.repeatChar || '!')][0] || '!';
    let command = typedCommand;
    let historyRepeat = false;
    const historyMessages = [];
    if (!command && config.repeatEnter === true && history.length) {
      command = history.at(-1) || '';
      historyRepeat = Boolean(command);
    } else if (command.startsWith(repeatChar)) {
      const prefix = command.slice(repeatChar.length);
      const match = [...history].reverse().find((entry) => String(entry || '').startsWith(prefix));
      if (match !== undefined) {
        command = String(match);
        historyRepeat = true;
      } else {
        historyMessages.push(`#REPEAT: NO MATCH FOUND FOR '${command}'`);
      }
    }
    this.appendTinTinCommandHistory(source, command);
    this.fireTinTinEvent(source, 'RECEIVED INPUT', [command]);
    this.tracePipeline(source, 'input', () => `${historyRepeat ? `History repeat ${typedCommand || '<enter>'} -> ` : 'Typed: '}${command || '<blank line>'}`);

    // TinTin VERBATIM mode is intentionally not the same as VERBATIM CHAR.
    // At top-level input it still checks aliases, but otherwise bypasses local
    // #commands, speedwalk, substitutions, and semicolon command splitting.
    if (config.verbatim === true && command) {
      const aliasExpansion = this.withTinTinSession(source, () => this.tintinListIgnored('alias')
        ? { matched: false, commands: [] }
        : this.aliasEngine.expandCommands(command));
      if (aliasExpansion.error) {
        return { handled: true, deliveries: [], messages: [...historyMessages, aliasExpansion.error], snapshot: this.snapshot() };
      }
      if (aliasExpansion.matched) {
        this.tracePipeline(source, 'verbatim-alias', () => `${command} => ${aliasExpansion.commands.join(' ; ')}`);
        const result = this.dispatchCommandSequence(source, aliasExpansion.commands, { aliasExpanded: true, variablesExpanded: false });
        if (historyMessages.length) result.messages = [...historyMessages, ...(result.messages || [])];
        return result;
      }
      const cancelled = source.queue.clearSource('speedwalk');
      const delivery = this.queueCommand(source.id, command);
      const messages = [...historyMessages];
      if (cancelled) messages.push(`Speedwalk interrupted; ${cancelled} pending step${cancelled === 1 ? '' : 's'} cancelled.`);
      if (!delivery.queued && delivery.reason === 'disconnected') messages.push('Not connected.');
      this.tracePipeline(source, 'verbatim-mode', () => `${command} => raw MUD input`);
      return { handled: false, deliveries: [delivery], messages, snapshot: this.snapshot() };
    }

    // TinTin's VERBATIM CHAR is an input escape, not an ordinary command
    // escape. It is handled after history/events but before command splitting,
    // aliases, speedwalk, variables/functions, or local #command parsing.
    const verbatimChar = [...String(config.verbatimChar || '\\')][0] || '\\';
    if (command.startsWith(verbatimChar)) {
      const literal = command.slice(verbatimChar.length);
      const cancelled = source.queue.clearSource('speedwalk');
      this.tracePipeline(source, 'verbatim', () => `${command} => ${literal || '<blank line>'}`);
      const delivery = this.queueCommand(source.id, literal);
      const messages = [...historyMessages];
      if (cancelled) messages.push(`Speedwalk interrupted; ${cancelled} pending step${cancelled === 1 ? '' : 's'} cancelled.`);
      if (!delivery.queued && delivery.reason === 'disconnected') messages.push('Not connected.');
      return { handled: true, deliveries: [delivery], messages, snapshot: this.snapshot() };
    }

    if (!command.includes(';')) {
      const result = this.dispatchCommand(source, command);
      if (historyMessages.length) result.messages = [...historyMessages, ...(result.messages || [])];
      return result;
    }

    const parsedCommands = splitTopLevelCommands(command, {
      maxCommands: this.maxCommandLineCommands,
      preserveEscapedSemicolon: true,
      commandPrefix: this.commandPrefix
    });
    if (parsedCommands.errorCode) {
      this.tracePipeline(source, 'batch', () => `Rejected command batch: ${parsedCommands.errorCode}.`);
      const messages = {
        'too-many': `Command line may contain at most ${this.maxCommandLineCommands} commands.`,
        'unfinished-escape': 'Command line ends with an unfinished escape.',
        'unterminated-quote': 'Command line has an unterminated quote.',
        'unterminated-brace': 'Command line has an unterminated brace.',
        'unmatched-closing-brace': 'Command line has an unmatched closing brace.'
      };
      return {
        handled: true,
        deliveries: [],
        messages: [...historyMessages, messages[parsedCommands.errorCode] || 'Invalid command line.'],
        snapshot: this.snapshot()
      };
    }

    this.tracePipeline(source, 'batch', () => `${parsedCommands.commands.length} top-level commands: ${parsedCommands.commands.join(' ; ')}`);
    const result = this.dispatchCommandSequence(source, parsedCommands.commands, { commandLineBatch: true });
    if (historyMessages.length) result.messages = [...historyMessages, ...(result.messages || [])];
    return result;
  }

  dispatchCommand(source, commandValue, options = {}) {
    return this.withTinTinSession(source, () => this.dispatchCommandScoped(source, commandValue, options));
  }

  dispatchCommandScoped(source, commandValue, options = {}) {
    this.tracePipeline(source, 'dispatch', () => {
      const origins = [
        options.commandLineBatch ? 'batch' : '',
        options.actionGenerated ? 'action' : '',
        options.delayGenerated ? 'delay' : '',
        options.repeatGenerated ? 'repeat' : '',
        options.loopVariable ? 'loop' : ''
      ].filter(Boolean);
      return `${origins.length ? `${origins.join('+')} -> ` : ''}${String(commandValue ?? '') || '<blank line>'}`;
    });
    const expandedCommand = options.loopVariable
      ? expandLoopVariableReferences(commandValue, options.loopVariable.name, options.loopVariable.value)
      : String(commandValue ?? '');
    const command = options.commandLineBatch && !isClientCommand(expandedCommand, this.commandPrefix)
      ? unescapeActionSemicolons(expandedCommand)
      : expandedCommand;
    if (!command.startsWith(this.commandPrefix)) {
      if (!options.aliasExpanded && !this.tintinListIgnored('alias')) {
        const luaAliases = this.aliasEngine.matchLuaTransients?.(command) || [];
        if (luaAliases.length > 0) {
          for (const luaAlias of luaAliases) {
            this.invokeLuaAutomation(source, luaAlias.id, {
              command,
              matches: luaAlias.matches || [],
              namedMatches: luaAlias.namedMatches || {},
              args: []
            }, { source: 'alias' });
          }
          return { handled: true, deliveries: [], messages: [], snapshot: this.snapshot() };
        }
        const expansion = this.aliasEngine.expandCommands(command);
        if (expansion.error) {
          return {
            handled: true,
            deliveries: [],
            messages: [expansion.error],
            snapshot: this.snapshot()
          };
        }
        if (expansion.matched) {
          this.tracePipeline(source, 'alias', () => `${command} => ${expansion.commands.join(' ; ')}`);
          return this.dispatchCommandSequence(source, expansion.commands, {
            ...options,
            aliasExpanded: true,
            variablesExpanded: false
          });
        }
      }

      const variables = options.variablesExpanded
        ? { value: command, error: '' }
        : this.expandFunctionAndVariables(command, source, options);
      if (variables.error) {
        return {
          handled: true,
          deliveries: [],
          messages: [variables.error],
          snapshot: this.snapshot()
        };
      }
      const expandedFinalCommand = variables.value;
      const finalCommand = options.lineSubstituteGenerated
        ? sanitizeTinTinLineSubstituteNetworkText(expandedFinalCommand)
        : expandedFinalCommand;
      if (finalCommand !== command) {
        this.tracePipeline(source, 'variables', () => `${command} => ${finalCommand}`);
      }
      if (options.localOnly) {
        return { handled: true, deliveries: [], messages: [`${this.clientCommand('line local')} skipped server-bound command: ${finalCommand || '<blank line>'}.`], snapshot: this.snapshot() };
      }

      // TinTin command files commonly define a login alias whose body is a
      // bare host and port. Resolve that shorthand only after aliases,
      // functions, and variables have run, and only for a player-entered
      // command on a disconnected session. Actions may never open sockets.
      const playerAliasConnection = options.aliasExpanded
        && !options.actionGenerated
        && !options.delayGenerated
        && !options.repeatGenerated
        && !options.loopVariable;
      const connectionTarget = source.status?.state === 'disconnected' && playerAliasConnection
        ? parseDisconnectedConnectionTarget(finalCommand)
        : null;
      if (connectionTarget) {
        this.tracePipeline(source, 'connect', () => `Login shorthand: ${connectionTarget.host}:${connectionTarget.port}`);
        void this.connectSession(source.id, connectionTarget).catch((error) => {
          this.emit(source.id, 'error', error?.message || String(error));
        });
        return {
          handled: true,
          deliveries: [],
          messages: [`Connecting ${source.name} to ${connectionTarget.host}:${connectionTarget.port}.`],
          snapshot: this.snapshot()
        };
      }

      if (this.speedwalkEnabled && !options.actionGenerated) {
        const route = parseSpeedwalk(finalCommand, { maxSteps: this.maxSpeedwalkSteps });
        if (route.matched) {
          this.tracePipeline(source, 'speedwalk', () => route.error
            ? `Rejected ${finalCommand}: ${route.error}`
            : `${finalCommand} => ${route.steps.join(' ')}`);
          if (route.error) {
            return { handled: true, deliveries: [], messages: [route.error], snapshot: this.snapshot() };
          }
          for (const step of route.steps) this.recordTinTinPathStep(source, step, options);
          const deliveries = this.queueSpeedwalk(source.id, route.steps);
          if (deliveries.some((delivery) => !delivery.queued)) {
            return {
              handled: true,
              deliveries: [],
              messages: [`Speedwalk needs ${route.steps.length} free queue slots. Nothing was sent.`],
              snapshot: this.snapshot()
            };
          }
          return {
            handled: true,
            deliveries,
            messages: [`Speedwalk queued: ${route.steps.length} step${route.steps.length === 1 ? '' : 's'}.`],
            // A pure server-bound Speedwalk does not mutate session/TinTin
            // definitions. Avoid serializing every session and definition list
            // back across IPC before the main process can return to socket work.
            snapshot: null
          };
        }
      }

      const cancelled = !options.actionGenerated ? source.queue.clearSource('speedwalk') : 0;
      this.recordTinTinPathStep(source, finalCommand, options);
      const delivery = this.queueCommand(source.id, finalCommand);
      const messages = cancelled
        ? [`Speedwalk interrupted; ${cancelled} pending step${cancelled === 1 ? '' : 's'} cancelled.`]
        : [];
      if (!delivery.queued && delivery.reason === 'disconnected') messages.push('Not connected.');
      return {
        handled: false,
        deliveries: [delivery],
        messages,
        snapshot: this.snapshot()
      };
    }

    if (isEscapedClientCommand(command, this.commandPrefix)) {
      const serverCommand = command.slice(this.commandPrefix.length);
      this.tracePipeline(source, 'literal-prefix', () => `${command} => ${serverCommand}`);
      const variables = options.variablesExpanded
        ? { value: serverCommand, error: '' }
        : this.expandFunctionAndVariables(serverCommand, source, options);
      if (variables.error) {
        return { handled: true, deliveries: [], messages: [variables.error], snapshot: this.snapshot() };
      }
      if (options.localOnly) {
        return { handled: true, deliveries: [], messages: [`${this.clientCommand('line local')} skipped literal server command.`], snapshot: this.snapshot() };
      }
      const literalValue = options.lineSubstituteGenerated
        ? sanitizeTinTinLineSubstituteNetworkText(variables.value)
        : variables.value;
      const delivery = this.queueCommand(source.id, literalValue);
      return {
        handled: false,
        deliveries: [delivery],
        messages: !delivery.queued && delivery.reason === 'disconnected' ? ['Not connected.'] : [],
        snapshot: this.snapshot()
      };
    }

    let parsed = firstDirective(command, this.commandPrefix);
    if (!parsed?.directive) {
      return { handled: true, deliveries: [], messages: ['Incomplete client command.'], snapshot: this.snapshot() };
    }
    let repeatDirective = /^\d+$/u.test(parsed.directive);
    const rawDirectiveToken = String(command.slice(this.commandPrefix.length).match(/^([^\s]+)/u)?.[1] || '');
    if (!repeatDirective && /[$@%]/u.test(rawDirectiveToken)) {
      const dynamicDirective = this.expandFunctionAndVariables(rawDirectiveToken, source, options);
      if (dynamicDirective.error) {
        return { handled: true, deliveries: [], messages: [dynamicDirective.error], snapshot: this.snapshot() };
      }
      const candidate = String(dynamicDirective.value || '').trim();
      if (/^\d+$/u.test(candidate)) {
        parsed = { ...parsed, directive: candidate };
        repeatDirective = true;
      } else if (dynamicDirective.expanded) {
        return { handled: true, deliveries: [], messages: ['Dynamic client directive must resolve to a bounded numeric repeat count.'], snapshot: this.snapshot() };
      }
    }
    this.tracePipeline(source, 'client', () => `${this.commandPrefix}${parsed.directive}${parsed.body ? ` ${parsed.body}` : ''}`);
    if (options.actionGenerated
      && (repeatDirective || ACTION_MANAGEMENT_DIRECTIVES.has(parsed.directive))
      && !this.actionManagementAllowed(parsed, source, options)) {
      return {
        handled: true,
        deliveries: [],
        messages: ['Action blocked: client-management commands cannot be generated by actions.'],
        snapshot: this.snapshot()
      };
    }

    if (repeatDirective) {
      const repeatCount = Number(parsed.directive);
      if (!Number.isSafeInteger(repeatCount) || repeatCount < 1 || repeatCount > this.maxRepeatCommands) {
        return {
          handled: true,
          deliveries: [],
          messages: [`Repeat count must be between 1 and ${this.maxRepeatCommands}.`],
          snapshot: this.snapshot()
        };
      }

      const repeatedCommand = String(parsed.body || '').trim();
      if (!repeatedCommand) {
        return {
          handled: true,
          deliveries: [],
          messages: [this.usage(`${repeatCount} <command>`)],
          snapshot: this.snapshot()
        };
      }
      if (options.repeatGenerated) {
        return {
          handled: true,
          deliveries: [],
          messages: ['Nested repeat directives are not allowed.'],
          snapshot: this.snapshot()
        };
      }

      const repeatedSequence = repeatedCommand.includes(';')
        ? splitTopLevelCommands(repeatedCommand, {
          maxCommands: DEFAULT_MAX_CONDITIONAL_COMMANDS,
          preserveEscapedSemicolon: true,
          commandPrefix: this.commandPrefix
        })
        : { commands: [repeatedCommand], errorCode: '' };
      if (repeatedSequence.errorCode) {
        return {
          handled: true,
          deliveries: [],
          messages: ['Repeated command list is invalid.'],
          snapshot: this.snapshot()
        };
      }
      this.tracePipeline(source, 'repeat', () => `${repeatCount} × ${repeatedCommand}`);
      const deliveries = [];
      const messages = [];
      let activateSessionId = '';
      for (let index = 0; index < repeatCount; index += 1) {
        const repeated = this.dispatchCommandSequence(source, repeatedSequence.commands, {
          ...options,
          repeatGenerated: true
        });
        deliveries.push(...repeated.deliveries);
        messages.push(...repeated.messages);
        if (repeated.activateSessionId) activateSessionId = repeated.activateSessionId;
      }
      return {
        handled: true,
        deliveries,
        messages,
        activateSessionId,
        snapshot: this.snapshot()
      };
    }

    if (['if', 'elseif', 'else'].includes(parsed.directive)) {
      return this.dispatchCommandSequence(source, [command], {
        ...options,
        conditionalDepth: Math.max(0, Math.trunc(Number(options.conditionalDepth) || 0))
      });
    }

    const tokens = tokenizeBraced(
      parsed.body,
      ['action', 'unaction', 'alias', 'aliases', 'class', 'classes', 'delay', 'loop', 'while', 'function', 'functions', 'forall'].includes(parsed.directive)
        ? { preserveEscapedSemicolon: true }
        : undefined
    );
    options = { ...options, firstArgumentBraced: /^\s*\{/u.test(String(parsed.body || '')) };
    const messages = [];
    let activateSessionId = '';
    let deliveries = [];

    if (parsed.directive === 'help') {
      messages.push(...clientCommandHelp(tokens.join(' '), this.commandPrefix));
    } else if (parsed.directive === 'profile') {
      if (tokens.length > 1) messages.push(this.usage('profile [session]'));
      else {
        const target = this.findSession(tokens[0] || source.id);
        if (!target) messages.push(`Unknown session: ${tokens[0]}.`);
        else messages.push(...this.profileStatusMessages(target));
      }
    } else if (parsed.directive === 'reload') {
      if (tokens.length > 1) messages.push(this.usage('reload [session]'));
      else {
        const target = this.findSession(tokens[0] || source.id);
        if (!target) messages.push(`Unknown session: ${tokens[0]}.`);
        else {
          const reload = this.requestProfileReload(target);
          messages.push(...reload.messages);
          activateSessionId = reload.activateSessionId;
          this.setActiveSession(target.id);
        }
      }
    } else if (parsed.directive === 'audit') {
      if (tokens.length > 1) {
        messages.push(this.usage('audit {script name}'));
      } else {
        const requestedToken = String(tokens[0] || '').trim();
        const expanded = requestedToken && !options.variablesExpanded
          ? this.expandFunctionAndVariables(requestedToken, source, options)
          : { value: requestedToken, error: '' };
        if (expanded.error) messages.push(expanded.error);
        else {
          const requested = String(expanded.value || '').trim();
          this.tracePipeline(source, 'audit', () => requested ? `TinTin compatibility audit requested: ${requested}` : 'TinTin Scripts folder requested for compatibility audit.');
          this.emit(source.id, 'script-audit-request', { requested });
        }
      }
    } else if (parsed.directive === 'read') {
      if (tokens.length > 1) {
        messages.push(this.usage('read {script name}'));
      } else {
        const requestedToken = String(tokens[0] || '').trim();
        const expanded = requestedToken && !options.variablesExpanded
          ? this.expandFunctionAndVariables(requestedToken, source, options)
          : { value: requestedToken, error: '' };
        if (expanded.error) messages.push(expanded.error);
        else {
          const rawRequested = String(expanded.value || '').trim();
          const requested = rawRequested ? (normalizeLegacyTinTinScriptRequest(rawRequested) || rawRequested) : '';
          this.tracePipeline(source, 'read', () => requested ? `TinTin script requested: ${rawRequested}${requested !== rawRequested ? ` -> ${requested} (safe Scripts-folder compatibility name)` : ''}` : 'TinTin Scripts folder requested.');
          this.emit(source.id, 'script-read-request', { requested, ...(requested !== rawRequested ? { legacyRequested: rawRequested } : {}) });
        }
      }
    } else if (parsed.directive === 'write') {
      if (tokens.length > 1) {
        messages.push(this.usage('write {script name}'));
      } else {
        const requestedToken = String(tokens[0] || '').trim();
        const expanded = requestedToken && !options.variablesExpanded
          ? this.expandFunctionAndVariables(requestedToken, source, options)
          : { value: requestedToken, error: '' };
        if (expanded.error) messages.push(expanded.error);
        else {
          const rawRequested = String(expanded.value || '').trim();
          const requested = rawRequested ? (normalizeLegacyTinTinScriptRequest(rawRequested) || rawRequested) : '';
          this.tracePipeline(source, 'write', () => requested ? `TinTin script write requested: ${rawRequested}${requested !== rawRequested ? ` -> ${requested} (safe Scripts-folder compatibility name)` : ''}` : 'TinTin Scripts folder requested for writing.');
          this.emit(source.id, 'script-write-request', { requested, ...(requested !== rawRequested ? { legacyRequested: rawRequested } : {}) });
        }
      }
    } else if (parsed.directive === 'edit') {
      const operation = String(tokens[0] || '').trim().toLowerCase();
      let requested = '';
      if (operation === 'read') {
        if (tokens.length !== 2) messages.push(this.usage('edit read {script name}'));
        else requested = String(tokens[1] || '').trim();
      } else if (tokens.length <= 1) {
        requested = String(tokens[0] || '').trim();
      } else {
        messages.push(this.usage('edit {script name}'));
      }
      if (!messages.length) {
        const expanded = requested && !options.variablesExpanded
          ? this.expandFunctionAndVariables(requested, source, options)
          : { value: requested, error: '' };
        if (expanded.error) messages.push(expanded.error);
        else {
          requested = String(expanded.value || '').trim();
          this.tracePipeline(source, 'edit', () => requested ? `TinTin script edit requested: ${requested}` : 'TinTin script picker requested.');
          this.emit(source.id, 'script-edit-request', { requested });
        }
      }
    } else if (parsed.directive === 'map') {
      const operation = normalizeToken(tokens[0]);
      if (operation !== 'find' || tokens.length !== 2) {
        messages.push(this.usage('map find {room vnum}'));
      } else {
        const rawMapBody = String(parsed.body || '').trim();
        const rawTargetOffset = rawMapBody.search(/\s/u);
        let requestedToken = rawTargetOffset === -1
          ? ''
          : rawMapBody.slice(rawTargetOffset).trim();
        if (requestedToken.startsWith('{') && requestedToken.endsWith('}')) {
          requestedToken = requestedToken.slice(1, -1).trim();
        }
        const expanded = requestedToken && !options.variablesExpanded
          ? this.expandFunctionAndVariables(requestedToken, source, options)
          : { value: requestedToken, error: '' };
        if (expanded.error) messages.push(expanded.error);
        else {
          const requested = String(expanded.value || '').trim();
          if (!/^\d{1,9}$/u.test(requested) || Number(requested) < 1) {
            messages.push(`${this.clientCommand('map find')} needs a positive numeric NukeFire room vnum.`);
          } else {
            const target = String(Number(requested));
            source.mapperRouteTargetId = target;
            this.tracePipeline(source, 'map', () => `Native Mapper target requested: room #${target}.`);
            this.emit(source.id, 'mapper-route-find-request', { target });
          }
        }
      }
    } else if (parsed.directive === 'path') {
      const path = this.handlePathCommand(tokens, source, options);
      deliveries = path.deliveries;
      messages.push(...path.messages);
      activateSessionId = path.activateSessionId;
    } else if (parsed.directive === 'all') {
      const all = this.handleAllCommand(source, parsed.body, options);
      deliveries = all.deliveries;
      messages.push(...all.messages);
      activateSessionId = all.activateSessionId;
    } else if (parsed.directive === 'forall') {
      const forall = this.handleForallCommand(tokens, source, options);
      deliveries = forall.deliveries;
      messages.push(...forall.messages);
      activateSessionId = forall.activateSessionId;
      if (forall.controlFlow) {
        return { handled: true, deliveries, messages, activateSessionId, controlFlow: forall.controlFlow, snapshot: this.snapshot() };
      }
    } else if (parsed.directive === 'end') {
      if (tokens.length > 0) {
        messages.push(this.usage('end'));
      } else if (source.status?.state === 'disconnected') {
        messages.push(`${source.name} is already disconnected.`);
      } else {
        this.tracePipeline(source, 'end', () => `Immediate disconnect requested for ${source.name}.`);
        this.disconnectSession(source.id, `Disconnected by ${this.clientCommand('end')}.`);
        messages.push(`Disconnected ${source.name}.`);
      }
    } else if (parsed.directive === 'kill') {
      const category = normalizeToken(tokens[0] || 'all');
      const pattern = String(tokens.slice(1).join(' ') || '').trim();
      if (!tokens.length || category === 'all') {
        const cleared = this.clearTinTinState(source);
        this.tracePipeline(source, 'kill', () => `Cleared ${cleared.totalDefinitions} live TinTin definitions.`);
        const cancelled = cleared.cancelledDelays + cleared.cancelledTickers + cleared.cancelledSpeedwalk;
        messages.push(cleared.totalDefinitions > 0
          ? `Cleared ${cleared.totalDefinitions} live TinTin definition${cleared.totalDefinitions === 1 ? '' : 's'}.`
          : 'TinTin definitions were already clear.');
        if (cancelled > 0) messages.push(`Cancelled ${cleared.cancelledDelays} pending delay${cleared.cancelledDelays === 1 ? '' : 's'}, ${cleared.cancelledTickers} ticker${cleared.cancelledTickers === 1 ? '' : 's'}, and ${cleared.cancelledSpeedwalk} queued Speedwalk step${cleared.cancelledSpeedwalk === 1 ? '' : 's'}.`);
      } else {
        const family = this.normalizeTinTinListFamily(category);
        const descriptors = {
          alias: [() => this.aliasEngine.list(), (r) => r.name, (r) => this.aliasEngine.delete(r.name)],
          variable: [() => this.variableEngine.list(), (r) => r.name, (r) => this.variableEngine.delete(r.name)],
          function: [() => this.functionEngine.list(), (r) => r.name, (r) => this.functionEngine.delete(r.name)],
          action: [() => this.actionEngine.list(), (r) => r.pattern, (r) => this.actionEngine.delete(r.pattern)],
          gag: [() => this.gagEngine.list(), (r) => r.pattern, (r) => this.gagEngine.delete(r.pattern)],
          highlight: [() => this.highlightEngine.list(), (r) => r.pattern, (r) => this.highlightEngine.delete(r.pattern)],
          substitute: [() => this.substituteEngine.list(), (r) => r.pattern, (r) => this.substituteEngine.delete(r.pattern)],
          macro: [() => this.macroEngine.list(), (r) => r.key || r.label, (r) => this.macroEngine.delete(r.key || r.label)],
          event: [() => this.eventEngine.list(), (r) => r.name, (r) => this.eventEngine.remove(r.name)],
          ticker: [() => [...source.tickers.values()], (r) => r.name, (r) => this.cancelTicker(source, r.name)],
          delay: [() => [...source.delays.entries()].map(([name, timer]) => ({ name, timer })), (r) => r.name, (r) => this.cancelNamedDelay(source, r.name)]
        };
        const descriptor = descriptors[family];
        if (!descriptor) messages.push(this.usage('kill {aliases|variables|functions|actions|gags|highlights|substitutes|macros|events|tickers|delays} [pattern]'));
        else {
          const records = descriptor[0]();
          const matches = pattern ? records.filter((record) => tinTinDefinitionMatches(descriptor[1](record), pattern)) : records;
          let removed = 0;
          for (const record of matches) if (descriptor[2](record)) removed += 1;
          messages.push(pattern
            ? (removed ? `Removed ${removed} ${family}${removed === 1 ? '' : 's'} matching ${pattern}.` : `No ${family}s matched ${pattern}.`)
            : `Cleared ${removed} ${family}${removed === 1 ? '' : 's'}.`);
        }
      }
    } else if (parsed.directive === 'commands') {
      const supported = ['ACTION','ALIAS','ALL','BREAK','CAT','BUFFER','CLASS','COMMANDS','CONFIG','CR','DELAY','DIRS','ECHO','END','EVENT','FORALL','FOREACH','FORMAT','FUNCTION','GAG','GREP','HELP','HIGHLIGHT','HISTORY','IF','IGNORE','INFO','KILL','LINE','LIST','LOCAL','LOG','LOOP','MACRO','MAP','MATH','MESSAGE','NOP','PARSE','PATH','PATHDIR','READ','REGEX','REPLACE','RETURN','SEND','SESSION','SHOWME','SNOOP','SOUND','SPEEDWALK','SUBSTITUTE','SWITCH','TICKER','UNDELAY','VARIABLE','WHILE','WRITE','ZAP'];
      messages.push(`TinTin-compatible commands: ${supported.join(', ')}.`);
      messages.push('Terminal-only or unsafe host/network commands are translated, ignored, or blocked explicitly rather than sent to the MUD.');
    } else if (parsed.directive === 'dirs') {
      messages.push(...this.handlePathDirCommand([], source, options));
    } else if (parsed.directive === 'info') {
      const snapshot = this.snapshotTinTinContext(source.tintin);
      const counts = {
        aliases: snapshot.aliases.length,
        variables: snapshot.variables.length,
        functions: snapshot.functions.length,
        actions: snapshot.actions.definitions.length,
        gags: snapshot.gags.definitions.length,
        highlights: snapshot.highlights.definitions.length,
        substitutes: snapshot.substitutes.definitions.length,
        macros: snapshot.macros.definitions.length,
        events: snapshot.events.definitions.length,
        classes: snapshot.classes.definitions.length,
        tickers: source.tickers.size,
        delays: source.delays.size,
        history: source.tintinCommandHistory?.length || 0,
        buffer: source.tintinOutputHistory?.length || 0
      };
      const detail = normalizeToken(tokens[0]);
      if (!detail) {
        messages.push(`TinTin state for ${source.name}: ${Object.entries(counts).map(([key, value]) => `${key} ${value}`).join(', ')}.`);
        messages.push(`Path: ${this.tintinPathState(source).nodes.length} node${this.tintinPathState(source).nodes.length === 1 ? '' : 's'}; recording ${this.tintinPathState(source).recording ? 'ON' : 'OFF'}; Speedwalk ${this.speedwalkEnabled ? 'ON' : 'OFF'}.`);
      } else if (detail === 'cpu') {
        messages.push('INFO CPU is translated to NukeFire pipeline/performance diagnostics; use DEBUG PIPELINE for per-session command processing.');
      } else if (detail === 'stack') {
        messages.push(`TinTin bounded execution stack: functions ${options.functionContext?.stack?.length || 0}, conditional depth ${Number(options.conditionalDepth || 0)}, event depth ${Number(options.eventDepth || 0)}.`);
      } else {
        const family = this.normalizeTinTinListFamily(detail);
        const infoKey = ({ alias: 'aliases', variable: 'variables', function: 'functions', action: 'actions', gag: 'gags', highlight: 'highlights', substitute: 'substitutes', macro: 'macros', event: 'events', class: 'classes', ticker: 'tickers', delay: 'delays', history: 'history' })[family] || `${family}s`;
        if (!family || !Object.prototype.hasOwnProperty.call(counts, infoKey)) {
          messages.push(this.usage('info [cpu|stack|list family]'));
        } else {
          const key = ({ alias: 'aliases', variable: 'variables', function: 'functions', action: 'actions', gag: 'gags', highlight: 'highlights', substitute: 'substitutes', macro: 'macros', event: 'events', class: 'classes', ticker: 'tickers', delay: 'delays', history: 'history' })[family] || `${family}s`;
          const control = this.tintinListControl(family);
          messages.push(`${key.toUpperCase()}: ${counts[key] || 0} | IGNORE ${control?.ignore ? 'ON' : 'OFF'} | MESSAGE ${control?.message !== false ? 'ON' : 'OFF'}.`);
        }
      }
    } else if (parsed.directive === 'history') {
      messages.push(...this.handleHistoryCommand(tokens, source, options));
    } else if (parsed.directive === 'grep') {
      messages.push(...this.handleGrepCommand(tokens, source, options));
    } else if (parsed.directive === 'buffer') {
      messages.push(...this.handleBufferCommand(tokens, source, options));
    } else if (parsed.directive === 'zap') {
      const target = this.findSession(tokens[0] || source.id);
      if (!target) messages.push(`Unknown session: ${tokens[0] || source.name}.`);
      else if (this.sessions.size <= 1) {
        if (target.status?.state !== 'disconnected') this.disconnectSession(target.id, `Disconnected by ${this.clientCommand('zap')}.`);
        messages.push(`Zapped ${target.name}; the final NukeFire workspace session was retained.`);
      } else if (this.removeSession(target.id)) {
        messages.push(`Zapped session ${target.name}.`);
        activateSessionId = this.activeSessionId;
      } else messages.push(`Session ${target.name} could not be zapped.`);
    } else if (parsed.directive === 'debug') {
      messages.push(...this.handleDebugCommand(tokens, source));
    } else if (parsed.directive === 'lua') {
      const lua = this.handleLuaCommand(parsed, source, options);
      deliveries = lua.deliveries;
      messages.push(...lua.messages);
    } else if (parsed.directive === 'sound') {
      const operation = String(tokens[0] || '').normalize('NFKC').trim().toLowerCase();
      const interactive = this.soundRequestInteractive(options);
      if (!tokens.length) {
        if (interactive) this.emit(source.id, 'soundpack-event-query', { operation: 'status' });
      } else if (!interactive && ['list', 'search', 'show'].includes(operation)) {
        // Discovery is intentionally interactive-only. Automation may play or
        // stop managed audio, but it cannot dump catalog/search/status chatter.
      } else if (!interactive && operation === 'status') {
        // General audio STATUS is also interactive-only so automation cannot
        // turn a harmless audio check into recurring terminal chatter.
      } else if (!interactive && ['add', 'assign', 'clear', 'delete'].includes(operation)) {
        // File pickers and soundpack mutation are direct-player operations only.
        // Actions, aliases, timers, functions, and Lua may play/test sounds, but
        // they cannot open a chooser or silently edit the player's soundpack.
      } else if (operation === 'status') {
        if (tokens.length !== 1) messages.push(this.usage('sound {status}'));
        else if (interactive) this.emit(source.id, 'soundpack-event-query', { operation: 'status' });
      } else if (operation === 'stop') {
        const scope = String(tokens[1] || 'all').normalize('NFKC').trim().toLowerCase();
        if (tokens.length > 2 || !['all', 'music'].includes(scope)) {
          messages.push(this.usage('sound {stop} [music]'));
        } else {
          this.tracePipeline(source, 'sound', () => `Managed audio stop requested: ${scope}${interactive ? ' (interactive)' : ' (automation)'}.`);
          this.emit(source.id, 'soundpack-control-request', { operation: 'stop', scope, interactive });
        }
      } else if (operation === 'list') {
        if (tokens.length > 2) {
          messages.push(this.usage('sound {list} [group]'));
        } else if (interactive) {
          const filter = String(tokens[1] || '').normalize('NFKC').trim().toLowerCase();
          if (filter && (filter.length > 32 || !SOUND_LIST_FILTER_PATTERN.test(filter))) {
            messages.push('Sound list groups use letters, numbers, underscores, or hyphens.');
          } else {
            this.emit(source.id, 'soundpack-event-query', { operation: 'list', filter });
          }
        }
      } else if (operation === 'search') {
        if (tokens.length < 2) {
          messages.push(this.usage('sound {search} {text}'));
        } else if (interactive) {
          const raw = tokens.slice(1).join(' ');
          const expanded = options.variablesExpanded
            ? { value: raw, error: '' }
            : this.expandFunctionAndVariables(raw, source, options);
          if (expanded.error) messages.push(expanded.error);
          else {
            const query = String(expanded.value || '').normalize('NFKC').trim().toLowerCase().replace(/[\u0000-\u001F\u007F]/gu, '').slice(0, SOUND_QUERY_TEXT_MAX);
            if (!query) messages.push(this.usage('sound {search} {text}'));
            else this.emit(source.id, 'soundpack-event-query', { operation: 'search', query });
          }
        }
      } else if (operation === 'show') {
        if (tokens.length !== 2) {
          messages.push(this.usage('sound {show} {event}'));
        } else if (interactive) {
          const expanded = options.variablesExpanded
            ? { value: tokens[1], error: '' }
            : this.expandFunctionAndVariables(tokens[1], source, options);
          if (expanded.error) messages.push(expanded.error);
          else {
            const event = this.normalizeSoundEventName(expanded.value);
            if (!event) messages.push('Sound event names use letters, numbers, dots, underscores, or hyphens.');
            else this.emit(source.id, 'soundpack-event-query', { operation: 'show', event });
          }
        }
      } else if (operation === 'test') {
        if (tokens.length !== 2) {
          messages.push(this.usage('sound {test} {event}'));
        } else {
          const expanded = options.variablesExpanded
            ? { value: tokens[1], error: '' }
            : this.expandFunctionAndVariables(tokens[1], source, options);
          if (expanded.error) messages.push(expanded.error);
          else {
            const event = this.normalizeSoundEventName(expanded.value);
            if (!event) messages.push('Sound event names use letters, numbers, dots, underscores, or hyphens.');
            else {
              this.tracePipeline(source, 'sound', () => `Managed soundpack test requested: ${event}${interactive ? ' (interactive)' : ' (automation)'}.`);
              this.emit(source.id, 'soundpack-event-request', { event, interactive, reportSuccess: interactive });
            }
          }
        }
      } else if (['add', 'assign', 'clear', 'delete'].includes(operation)) {
        if (tokens.length !== 2) {
          messages.push(this.usage(`sound {${operation}} {event}`));
        } else if (interactive) {
          const expanded = options.variablesExpanded
            ? { value: tokens[1], error: '' }
            : this.expandFunctionAndVariables(tokens[1], source, options);
          if (expanded.error) messages.push(expanded.error);
          else {
            const event = this.normalizeSoundEventName(expanded.value);
            if (!event) {
              messages.push('Sound event names use letters, numbers, dots, underscores, or hyphens. Player-created names must use custom.<name>.');
            } else if ((operation === 'add' || operation === 'delete') && !event.startsWith('custom.')) {
              messages.push(`SOUND ${operation.toUpperCase()} is only for player-created custom.* event names.`);
            } else {
              this.emit(source.id, 'soundpack-edit-request', { operation, event, interactive: true });
            }
          }
        }
      } else if (tokens.length !== 1) {
        messages.push(this.usage('sound {event}'));
      } else {
        const expanded = options.variablesExpanded
          ? { value: tokens[0], error: '' }
          : this.expandFunctionAndVariables(tokens[0], source, options);
        if (expanded.error) messages.push(expanded.error);
        else {
          const event = this.normalizeSoundEventName(expanded.value);
          if (!event) {
            messages.push('Sound event names use letters, numbers, dots, underscores, or hyphens. Player-created names should use custom.<name>.');
          } else {
            this.tracePipeline(source, 'sound', () => `Managed soundpack event requested: ${event}${interactive ? ' (interactive)' : ' (automation)'}.`);
            this.emit(source.id, 'soundpack-event-request', {
              event,
              interactive,
              reportSuccess: interactive && source.tintin?.config?.commandEcho === true
            });
          }
        }
      }
    } else if (parsed.directive === 'accessibility' || parsed.directive === 'access' || parsed.directive === 'a11y') {
      const interactive = this.soundRequestInteractive(options);
      if (!interactive) {
        // Accessibility diagnostics/profile management are interactive-only so
        // an Action, Alias, Function, timer, or Lua callback cannot flood or
        // silently mutate the player's accessibility setup.
      } else {
        const operation = String(tokens[0] || 'status').normalize('NFKC').trim().toLowerCase();
        let payload = { operation };
        if (operation === 'status') payload = { operation: 'capabilities' };
        else if (['last', 'why', 'doctor', 'test', 'capabilities', 'clear'].includes(operation)) payload = { operation };
        else if (operation === 'report') payload = { operation: 'report', copy: String(tokens[1] || '').trim().toLowerCase() === 'copy' };
        else if (operation === 'profile') {
          const sub = String(tokens[1] || 'list').normalize('NFKC').trim().toLowerCase();
          const value = tokens.slice(2).join(' ').normalize('NFKC').trim().slice(0, 80);
          if (sub === 'list') payload = { operation: 'profile-list' };
          else if (['save', 'use', 'delete'].includes(sub) && value) payload = { operation: `profile-${sub}`, value };
          else if (sub === 'export') payload = { operation: 'profile-export' };
          else if (sub === 'import') payload = { operation: 'profile-import' };
          else {
            messages.push(this.usage('accessibility {profile} {list|save|use|delete|export|import} [name]'));
            payload = null;
          }
        } else {
          messages.push(this.usage('accessibility {last|why|report|capabilities|test|doctor|clear|profile}'));
          payload = null;
        }
        if (payload) this.emit(source.id, 'accessibility-command', payload);
      }
    } else if (parsed.directive === 'showme' || parsed.directive === 'show') {
      if (tokens.length < 1) {
        messages.push(this.usage('showme {text}'));
      } else {
        const bracedText = String(parsed.body || '').trimStart().startsWith('{');
        const positional = bracedText && tokens.length > 1
          && tokens.slice(1).every((entry) => /^-?\d+$/u.test(String(entry || '').trim()));
        const text = positional ? tokens[0] : tokens.join(' ');
        const variables = options.variablesExpanded
          ? { value: text, error: '' }
          : this.expandFunctionAndVariables(text, source, options);
        if (variables.error) messages.push(variables.error);
        else if (!this.emitLocalDisplay(source, variables.value)) messages.push(this.usage('showme {text}'));
      }
    } else if (parsed.directive === 'echo') {
      if (tokens.length < 1) {
        messages.push(this.usage('echo {format} {argument1} {argument2} ...'));
      } else {
        const nestedFormat = tokens[0].startsWith('{') ? tokenizeBraced(tokens[0]) : [];
        if (nestedFormat.length === 2 && /^-?\d+$/u.test(String(nestedFormat[1] || '').trim())) {
          messages.push(`${this.clientCommand('echo')} row positioning is not available yet. Use ${this.clientCommand('echo {format} {arguments...}')}.`);
        } else {
          const formatted = this.formatTinTinValue(tokens[0], tokens.slice(1), { ...options, source }, 'Echo');
          if (formatted.error) messages.push(formatted.error);
          else {
            this.tracePipeline(source, 'echo', () => `Local formatted output: ${formatted.text.replace(/\x1b\[[0-9;]*m/gu, '').trimEnd()}`);
            this.emitLocalEcho(source, formatted.text);
          }
        }
      }
    } else if (parsed.directive === 'cat') {
      messages.push(...this.handleCatCommand(tokens, source, options));
    } else if (parsed.directive === 'math') {
      messages.push(...this.handleMathCommand(tokens, source, options));
    } else if (parsed.directive === 'format') {
      messages.push(...this.handleFormatCommand(tokens, source, options));
    } else if (parsed.directive === 'list') {
      messages.push(...this.handleListCommand(tokens, source, options));
    } else if (parsed.directive === 'replace') {
      messages.push(...this.handleReplaceCommand(tokens, source, options));
    } else if (parsed.directive === 'parse') {
      const parsedLoop = this.handleParseCommand(tokens, source, options);
      deliveries = parsedLoop.deliveries;
      messages.push(...parsedLoop.messages);
      activateSessionId = parsedLoop.activateSessionId;
    } else if (parsed.directive === 'switch') {
      const switched = this.handleSwitchCommand(tokens, source, options);
      deliveries = switched.deliveries;
      messages.push(...switched.messages);
      activateSessionId = switched.activateSessionId;
    } else if (parsed.directive === 'regex') {
      const matched = this.handleRegexCommand(tokens, source, options);
      deliveries = matched.deliveries;
      messages.push(...matched.messages);
      activateSessionId = matched.activateSessionId;
      if (matched.controlFlow) return { handled: true, deliveries, messages, activateSessionId, controlFlow: matched.controlFlow, returnValue: matched.returnValue, snapshot: this.snapshot() };
    } else if (parsed.directive === 'cr') {
      // TinTin #CR is a real session write, not terminal decoration: send one
      // empty command exactly as if the player pressed Return on a blank line.
      // Keep it on NukeFire's normal per-session connection path and bypass
      // Alias expansion, matching veteran #SEND-style delivery semantics.
      deliveries = [this.queueCommand(source.id, '', { source: 'tintin-cr' })];
    } else if (parsed.directive === 'send') {
      const sent = this.handleSendCommand(tokens, source, options);
      deliveries = sent.deliveries;
      messages.push(...sent.messages);
      activateSessionId = sent.activateSessionId;
    } else if (parsed.directive === 'foreach') {
      const loop = this.handleForeachCommand(tokens, source, options);
      deliveries = loop.deliveries;
      messages.push(...loop.messages);
      activateSessionId = loop.activateSessionId;
      if (loop.controlFlow) return { handled: true, deliveries, messages, activateSessionId, controlFlow: loop.controlFlow, returnValue: loop.returnValue, snapshot: this.snapshot() };
    } else if (parsed.directive === 'ignore') {
      messages.push(...this.handleTinTinListFlagCommand(tokens, 'ignore'));
    } else if (parsed.directive === 'message' || parsed.directive === 'mess') {
      messages.push(...this.handleTinTinListFlagCommand(tokens, 'message'));
    } else if (parsed.directive === 'bell') {
      // Compatibility no-op: keep TinTin BELL local so screen-reader scripts
      // never send it to the MUD or mistake it for a session route.
    } else if (parsed.directive === 'line') {
      const line = this.handleLineCommand(tokens, source, options, parsed.body);
      deliveries = line.deliveries;
      messages.push(...line.messages);
      activateSessionId = line.activateSessionId;
    } else if (parsed.directive === 'ticker') {
      messages.push(...this.handleTickerCommand(tokens, source, options));
    } else if (parsed.directive === 'unticker') {
      messages.push(...this.handleUntickerCommand(tokens, source));
    } else if (parsed.directive === 'split') {
      messages.push(`${this.clientCommand('split')} ignored: NukeFire already uses a dedicated command input bar.`);
    } else if (parsed.directive === 'unsplit') {
      messages.push(`${this.clientCommand('unsplit')} ignored: NukeFire uses its native workspace instead of TinTin split-screen terminal regions.`);
    } else if (parsed.directive === 'prompt' || parsed.directive === 'unprompt') {
      messages.push(`${this.clientCommand(parsed.directive)} ignored: NukeFire owns prompt/status rendering natively.`);
    } else if (parsed.directive === 'tab') {
      if (tokens.length === 0) {
        const records = this.tabEngine.list();
        messages.push(...(records.length ? records.map((record) => `{${record.value}}${record.className ? ` [class:${record.className}]` : ''}`) : ['No TinTin Tabs are defined.']));
      } else if (tokens.length === 1) {
        const expanded = this.expandFunctionAndVariables(tokens[0], source, options);
        if (expanded.error) messages.push(expanded.error);
        else {
          const record = this.tabEngine.define(expanded.value, this.classManager.activeName);
          if (!record) messages.push('Tab value is invalid, or the Tab limit was reached.');
          else messages.push(`{${record.value}} is now a Tab.`);
        }
      } else messages.push(this.usage('tab {completion text}'));
    } else if (parsed.directive === 'untab') {
      if (tokens.length !== 1) messages.push(this.usage('untab {completion pattern}'));
      else {
        const expanded = this.expandFunctionAndVariables(tokens[0], source, options);
        if (expanded.error) messages.push(expanded.error);
        else {
          const removed = this.tabEngine.delete(expanded.value);
          messages.push(removed.length ? `${removed.length} Tab${removed.length === 1 ? '' : 's'} removed.` : `No Tabs matched ${expanded.value}.`);
        }
      }
    } else if (parsed.directive === 'cursor') {
      const operation = resolveTinTinOrderedAbbreviation(tokens[0], TINTIN_CURSOR_OPERATIONS);
      if (!operation) {
        messages.push(`Cursor operations: ${TINTIN_CURSOR_OPERATIONS.map(([name]) => name.toUpperCase()).join(', ')}.`);
      } else if (['echo on','echo off','convert meta','ctrl delete','insert','paste buffer','redraw input','exit','suspend','test'].includes(operation)) {
        messages.push(`${this.clientCommand(`cursor {${tokens[0]}}`)} accepted as a compatibility translation; NukeFire keeps browser input mode, clipboard, process, and accessibility policy native.`);
      } else {
        let argument = tokens.slice(1).join(' ');
        if (operation === 'set' || operation === 'get') {
          const expanded = this.expandFunctionAndVariables(argument, source, options);
          if (expanded.error) { messages.push(expanded.error); argument = ''; }
          else argument = expanded.value;
        }
        if ((operation === 'set' || operation === 'get') && !argument) messages.push(this.usage(`cursor {${operation.toUpperCase()}} {${operation === 'get' ? 'variable' : 'text'}}`));
        else {
          const payload = { operation, argument };
          if (operation.includes('tab')) {
            payload.tabs = this.tabEngine.list().map((record) => {
              const expanded = this.expandFunctionAndVariables(record.value, source, options);
              return expanded.error ? record.value : expanded.value;
            });
            payload.autoTab = Number(this.tintinConfig.autoTab || 0);
          }
          this.emit(source.id, 'input-cursor-request', payload);
        }
      }
    } else if (parsed.directive === 'advertise') {
      messages.push(`${this.clientCommand('advertise')} ignored: the historical TinTin startup advertisement banner is omitted.`);
    } else if (parsed.directive === 'test') {
      messages.push(`${this.clientCommand('test')} ignored: the legacy TinTin internal benchmark is not meaningful inside NukeFire.`);
    } else if (parsed.directive === 'pathdir') {
      messages.push(...this.handlePathDirCommand(tokens, source, options));
    } else if (parsed.directive === 'unpathdir') {
      messages.push(...this.handleUnPathDirCommand(tokens, source, options));
    } else if (parsed.directive === 'event' || parsed.directive === 'events') {
      if (parsed.directive === 'events' || tokens.length === 0) {
        const records = this.eventEngine.list();
        messages.push(...(records.length ? records.map((record) => `${record.name}: ${record.command}`) : ['No TinTin Events are defined.']));
      } else if (tokens.length === 1) {
        const records = this.eventEngine.list().filter((record) => tinTinDefinitionMatches(record.name, tokens[0]));
        messages.push(...(records.length
          ? records.map((record) => `${record.name}: ${record.command}`)
          : [`No Event is defined for ${normalizeEventName(tokens[0]) || tokens[0]}.`]));
      } else if (tokens.length !== 2) {
        messages.push(this.usage('event {EVENT NAME} {commands}'));
      } else {
        const record = this.eventEngine.define(tokens[0], tokens[1], this.classManager.activeName);
        if (!record) messages.push('Event name or command is invalid, or the Event limit was reached.');
        else {
          messages.push(`Event ${record.name} defined.`);
          this.syncSecondEventTimer(source);
        }
      }
    } else if (parsed.directive === 'unevent') {
      if (tokens.length !== 1) messages.push(this.usage('unevent {EVENT NAME}'));
      else {
        const records = this.eventEngine.list().filter((record) => tinTinDefinitionMatches(record.name, tokens[0]));
        if (!records.length) messages.push(`Unknown Event: ${tokens[0]}.`);
        else {
          for (const record of records) this.eventEngine.remove(record.name);
          messages.push(records.length === 1 ? `Event ${records[0].name} removed.` : `${records.length} Events matching ${tokens[0]} removed.`);
        }
        this.syncSecondEventTimer(source);
      }
    } else if (parsed.directive === 'config') {
      const key = resolveTinTinOrderedAbbreviation(tokens[0], TINTIN_CONFIG_KEYS);
      const value = String(tokens.slice(1).join(' ') || '').trim().toLowerCase();
      if (!key) {
        messages.push(`TinTin compatibility: COMMAND ECHO ${this.tintinConfig.commandEcho === true ? 'ON' : 'OFF'}; AUTO TAB ${this.tintinConfig.autoTab || 0}; VERBATIM ${this.tintinConfig.verbatim === true ? 'ON' : 'OFF'}; HISTORY SIZE ${this.tintinConfig.historySize ?? DEFAULT_MAX_TINTIN_HISTORY}; BUFFER SIZE ${this.tintinConfig.bufferSize ?? DEFAULT_MAX_TINTIN_OUTPUT_LINES}; REPEAT CHAR ${this.tintinConfig.repeatChar || '!'}; REPEAT ENTER ${this.tintinConfig.repeatEnter === true ? 'ON' : 'OFF'}; VERBATIM CHAR ${this.tintinConfig.verbatimChar || '\\'}; TINTIN CHAR ${this.commandPrefix}; SPEEDWALK ${this.speedwalkEnabled ? 'ON' : 'OFF'}; LOG MODE ${this.tintinConfig.logMode.toUpperCase()}. Accessibility/display Config values remain owned by NukeFire Preferences.`);
      } else if (key === 'auto tab') {
        const size = Number(value);
        if (!/^\d+$/u.test(value) || !Number.isSafeInteger(size) || size < 1 || size > 999999) messages.push(this.usage('config {AUTO TAB} {1-999999}'));
        else { this.tintinConfig.autoTab = size; messages.push(`Auto Tab scrollback depth set to ${size}.`); }
      } else if (key === 'command echo') {
        if (!['on','off','true','false','1','0'].includes(value)) messages.push(this.usage('config {COMMAND ECHO} {ON|OFF}'));
        else { this.tintinConfig.commandEcho = ['on','true','1'].includes(value); messages.push(`Command echo ${this.tintinConfig.commandEcho ? 'enabled' : 'disabled'}.`); }
      } else if (key === 'verbatim') {
        if (!['on','off','true','false','1','0'].includes(value)) messages.push(this.usage('config {VERBATIM} {ON|OFF}'));
        else { this.tintinConfig.verbatim = ['on','true','1'].includes(value); messages.push(`Verbatim mode ${this.tintinConfig.verbatim ? 'enabled' : 'disabled'}.`); }
      } else if (key === 'history size') {
        const size = Number(value);
        if (!/^\d+$/u.test(value) || !Number.isSafeInteger(size) || size < 0 || size > 9999) messages.push(this.usage('config {HISTORY SIZE} {0-9999}'));
        else {
          this.tintinConfig.historySize = size;
          const history = source.tintinCommandHistory ||= [];
          if (history.length > size) history.splice(0, history.length - size);
          messages.push(`History size set to ${size}.`);
        }
      } else if (key === 'buffer size') {
        const size = Number(value);
        if (!/^\d+$/u.test(value) || !Number.isSafeInteger(size) || size < 100 || size > 100000) messages.push(this.usage('config {BUFFER SIZE} {100-100000}'));
        else {
          this.tintinConfig.bufferSize = size;
          const lines = source.tintinOutputHistory ||= [];
          if (lines.length > size) lines.splice(0, lines.length - size);
          messages.push(`Buffer size set to ${size}.`);
        }
      } else if (key === 'repeat enter') {
        if (!['on','off','true','false','1','0'].includes(value)) messages.push(this.usage('config {REPEAT ENTER} {ON|OFF}'));
        else { this.tintinConfig.repeatEnter = ['on','true','1'].includes(value); messages.push(`Repeat Enter ${this.tintinConfig.repeatEnter ? 'enabled' : 'disabled'}.`); }
      } else if (key === 'repeat char') {
        const character = [...String(tokens.slice(1).join(' ') || '')][0] || '';
        if (!character || /\s/u.test(character) || character === this.commandPrefix || character === (this.tintinConfig.verbatimChar || '\\')) messages.push(this.usage(`config {REPEAT CHAR} {!}`));
        else { this.tintinConfig.repeatChar = character; messages.push(`Repeat character set to ${character}.`); }
      } else if (key === 'tintin char') {
        const character = [...String(tokens.slice(1).join(' ') || '')][0] || '';
        const nextPrefix = normalizeClientCommandPrefix(character, '');
        if (!character || nextPrefix !== character) {
          messages.push(this.usage(`config {TINTIN CHAR} {${CLIENT_COMMAND_PREFIXES.join('|')}}`));
        } else {
          const previousPrefix = this.commandPrefix;
          this.setCommandPrefix(character);
          messages.push(previousPrefix === character
            ? `TinTin command character remains ${character}.`
            : `TinTin command character changed from ${previousPrefix} to ${character}.`);
        }
      } else if (key === 'verbatim char') {
        const character = [...String(tokens.slice(1).join(' ') || '')][0] || '';
        if (!character || /\s/u.test(character) || character === this.commandPrefix || character === (this.tintinConfig.repeatChar || '!')) messages.push(this.usage(`config {VERBATIM CHAR} {\\}`));
        else { this.tintinConfig.verbatimChar = character; messages.push(`Verbatim character set to ${character}.`); }
      } else if (key === 'speedwalk') {
        if (!['on','off','true','false','1','0'].includes(value)) messages.push(this.usage('config {SPEEDWALK} {ON|OFF}'));
        else { this.speedwalkEnabled = ['on','true','1'].includes(value); messages.push(`Speedwalk ${this.speedwalkEnabled ? 'enabled' : 'disabled'}.`); }
      } else if (key === 'log' || key === 'log mode') {
        const mode = value === 'raw' ? 'raw' : value === 'plain' ? 'plain' : '';
        if (!mode) messages.push('NukeFire logging supports TinTin PLAIN and RAW modes.');
        else { this.tintinConfig.logMode = mode; source.logging.mode = mode; messages.push(`Log mode set to ${mode.toUpperCase()}.`); }
      } else {
        messages.push(`${this.clientCommand('config')} {${tokens[0]}} accepted as a compatibility no-op; NukeFire keeps terminal, accessibility, buffer, and UI policy in Preferences.`);
      }
    } else if (parsed.directive === 'log') {
      const operation = String(tokens[0] || '').trim().toLowerCase();
      if (!operation || operation === 'off') {
        source.logging.active = false;
        messages.push('Logging stopped.');
      } else if (['append', 'overwrite'].includes(operation) && tokens.length === 2) {
        const expanded = this.expandFunctionAndVariables(tokens[1], source, options);
        if (expanded.error) messages.push(expanded.error);
        else if (!expanded.value || expanded.value.length > 128 || expanded.value.includes('/') || expanded.value.includes('\\') || expanded.value.includes('..') || !/^[\p{L}\p{N} _().@+-]+$/u.test(expanded.value)) messages.push('Log filename must be a safe basename inside the NukeFire Logs folder.');
        else {
          source.logging = { active: true, filename: expanded.value.slice(0, 128), mode: this.tintinConfig.logMode || 'plain' };
          if (operation === 'overwrite') {
            const overwrite = this.handlers.onLogOverwrite;
            if (typeof overwrite !== 'function') {
              source.logging.active = false;
              messages.push('Logging stopped: log overwrite storage is not available.');
            } else {
              Promise.resolve(overwrite({ sessionId: source.id, filename: source.logging.filename }))
                .then((result) => {
                  if (result?.ok === false) {
                    source.logging.active = false;
                    this.emit(source.id, 'error', `Logging stopped: ${result.error || 'log overwrite failed'}`);
                  }
                })
                .catch((error) => {
                  source.logging.active = false;
                  this.emit(source.id, 'error', `Logging stopped: ${error?.message || error}`);
                });
              messages.push(`Logging ${source.name} to ${source.logging.filename} in ${source.logging.mode.toUpperCase()} mode; existing file content will be overwritten.`);
            }
          } else {
            messages.push(`Logging ${source.name} to ${source.logging.filename} in ${source.logging.mode.toUpperCase()} mode.`);
          }
        }
      } else messages.push(this.usage('log {append|overwrite} {filename} | log {off}'));
    } else if (parsed.directive === 'snoop') {
      const target = this.findSession(tokens[0]);
      const mode = String(tokens[1] || '').trim().toLowerCase();
      if (!target || target.id === source.id) messages.push(this.usage('snoop {session} {on|off}'));
      else if (mode && !['on','off'].includes(mode)) messages.push('Snoop scroll-region mode is not needed in NukeFire; use ON/OFF or repeat #snoop to toggle.');
      else {
        const enable = mode === 'on' || (!mode && !source.snoops.has(target.id));
        if (enable) source.snoops.add(target.id); else source.snoops.delete(target.id);
        messages.push(`Snoop ${enable ? 'enabled' : 'disabled'} for ${target.name}.`);
      }
    } else if (['alias', 'aliases', 'variable', 'variables', 'function', 'functions', 'action', 'gag', 'highlight', 'high', 'substitute', 'sub', 'macro', 'mac', 'class', 'classes'].includes(parsed.directive)
      && !options.firstArgumentBraced && normalizeToken(tokens[0]) === 'manage' && tokens.length === 1) {
      const definitionCategory = {
        alias: 'aliases', aliases: 'aliases', variable: 'variables', variables: 'variables',
        function: 'functions', functions: 'functions', action: 'actions', gag: 'gags',
        highlight: 'highlights', high: 'highlights', substitute: 'substitutes', sub: 'substitutes',
        macro: 'macros', mac: 'macros', class: 'classes', classes: 'classes'
      }[parsed.directive];
      this.emit(source.id, 'definition-manager-request', { category: definitionCategory });
      messages.push(`Opening ${definitionCategory} in the Definition Manager.`);
    } else if (parsed.directive === 'set') {
      const setting = normalizeToken(tokens[0]);
      const value = String(tokens[1] || '').trim().toLowerCase();
      const numericValue = /^\d{1,2}$/u.test(value) ? Number(value) : NaN;
      if (setting !== 'fontsize' || tokens.length > 2 || (value && value !== 'reset' && (!Number.isInteger(numericValue) || numericValue < 12 || numericValue > 28))) {
        messages.push(this.usage('set fontsize [12-28|reset]'));
      } else {
        this.emit(source.id, 'font-size-request', { value });
      }
    } else if (parsed.directive === 'alias' || parsed.directive === 'aliases') {
      messages.push(...this.handleAliasCommand(tokens, source, options));
    } else if (parsed.directive === 'unalias') {
      messages.push(...this.handleUnaliasCommand(tokens, source, options));
    } else if (parsed.directive === 'variable' || parsed.directive === 'variables') {
      messages.push(...this.handleVariableCommand(tokens, source, options));
    } else if (parsed.directive === 'unvariable') {
      messages.push(...this.handleUnvariableCommand(tokens, source, options));
    } else if (parsed.directive === 'function' || parsed.directive === 'functions') {
      messages.push(...this.handleFunctionCommand(tokens, source, options));
    } else if (parsed.directive === 'unfunction') {
      messages.push(...this.handleUnfunctionCommand(tokens, source, options));
    } else if (parsed.directive === 'local' || parsed.directive === 'unlocal') {
      messages.push(`${this.clientCommand(parsed.directive)} is only valid inside a Function.`);
    } else if (parsed.directive === 'return') {
      const scriptGenerated = options.aliasExpanded === true
        || options.actionGenerated === true
        || options.eventGenerated === true
        || options.tickerGenerated === true
        || options.delayGenerated === true
        || options.repeatGenerated === true
        || options.foreachGenerated === true
        || options.forallGenerated === true
        || options.whileGenerated === true
        || options.parseGenerated === true
        || Number(options.switchDepth || 0) > 0;
      if (scriptGenerated) {
        return { handled: true, deliveries, messages, activateSessionId, controlFlow: 'return', snapshot: this.snapshot() };
      }
      messages.push(`${this.clientCommand('return')} is only valid inside a Function or a running TinTin script body.`);
    } else if (parsed.directive === 'action') {
      messages.push(...this.handleActionCommand(tokens, source, options));
    } else if (parsed.directive === 'unaction') {
      messages.push(...this.handleUnactionCommand(tokens, source, options));
    } else if (parsed.directive === 'actions') {
      messages.push(...this.handleActionsCommand(tokens));
    } else if (parsed.directive === 'gag') {
      messages.push(...this.handleGagCommand(tokens, source, options));
    } else if (parsed.directive === 'ungag') {
      messages.push(...this.handleUngagCommand(tokens, source, options));
    } else if (parsed.directive === 'gags') {
      messages.push(...this.handleGagsCommand(tokens));
    } else if (parsed.directive === 'highlight' || parsed.directive === 'high') {
      messages.push(...this.handleHighlightCommand(tokens, source, options));
    } else if (parsed.directive === 'unhighlight' || parsed.directive === 'unhigh') {
      messages.push(...this.handleUnhighlightCommand(tokens, source, options));
    } else if (parsed.directive === 'substitute' || parsed.directive === 'sub') {
      messages.push(...this.handleSubstituteCommand(tokens, source, options));
    } else if (parsed.directive === 'unsubstitute' || parsed.directive === 'unsub') {
      messages.push(...this.handleUnsubstituteCommand(tokens, source, options));
    } else if (parsed.directive === 'macro' || parsed.directive === 'mac') {
      messages.push(...this.handleMacroCommand(tokens, source, options));
    } else if (parsed.directive === 'unmacro' || parsed.directive === 'unmac') {
      messages.push(...this.handleUnmacroCommand(tokens, source, options));
    } else if (parsed.directive === 'class' || parsed.directive === 'classes') {
      const classResult = this.handleClassCommand(tokens, source, options);
      deliveries = classResult.deliveries;
      messages.push(...classResult.messages);
      activateSessionId = classResult.activateSessionId;
    } else if (parsed.directive === 'delay') {
      messages.push(...this.handleDelayCommand(tokens, source, options));
    } else if (parsed.directive === 'undelay') {
      messages.push(...this.handleUndelayCommand(tokens, source, options));
    } else if (parsed.directive === 'loop') {
      const loop = this.handleLoopCommand(tokens, source, options);
      deliveries = loop.deliveries;
      messages.push(...loop.messages);
      activateSessionId = loop.activateSessionId;
    } else if (parsed.directive === 'while') {
      const loop = this.handleWhileCommand(tokens, source, options);
      deliveries = loop.deliveries;
      messages.push(...loop.messages);
      activateSessionId = loop.activateSessionId;
    } else if (parsed.directive === 'break') {
      if (tokens.length > 0) messages.push(this.usage('break'));
      else if (!options.iterationControlAllowed) messages.push(`${this.clientCommand('break')} is only valid inside a bounded loop.`);
      else {
        return { handled: true, deliveries: [], messages: [], controlFlow: 'break', snapshot: this.snapshot() };
      }
    } else if (parsed.directive === 'continue') {
      if (tokens.length > 0) messages.push(this.usage('continue'));
      else if (!options.iterationControlAllowed) messages.push(`${this.clientCommand('continue')} is only valid inside a bounded loop.`);
      else {
        return { handled: true, deliveries: [], messages: [], controlFlow: 'continue', snapshot: this.snapshot() };
      }
    } else if (parsed.directive === 'speedwalk') {
      messages.push(...this.handleSpeedwalkCommand(tokens, source));
    } else if (parsed.directive === 'session' || parsed.directive === 'sessions') {
      const rawOperation = String(tokens[0] || '').trim();
      const operation = normalizeToken(rawOperation);
      if (!rawOperation || operation === 'list') {
        messages.push(...[...this.sessions.values()].map((session) => {
          const marker = session.id === this.activeSessionId ? '*' : ' ';
          const profile = this.profileFileLabel(session) || 'no profile';
          const counts = this.profileCounts(session);
          return `${marker} ${session.name} [${session.role}] — ${session.status.state} — ${profile} — ${counts.aliases} aliases / ${counts.actions} actions — ${session.host}:${session.port}`;
        }));
      } else if (operation === 'add' || operation === 'new') {
        const created = this.createSession({
          name: tokens[1] || `Session ${this.sessions.size + 1}`,
          role: tokens[2] || 'member',
          host: source.host,
          port: source.port
        });
        activateSessionId = created.id;
        this.setActiveSession(created.id);
        messages.push(`Created disconnected session ${created.name}.`);
      } else if (operation === 'close' || operation === 'remove') {
        const target = this.findSession(tokens[1] || source.id);
        if (!target || !this.removeSession(target.id)) messages.push('The last session cannot be closed.');
        else messages.push(`Closed session ${target.name}.`);
      } else if (tokens.length === 2 && normalizeToken(tokens[1]) === 'reload') {
        const target = this.findSession(tokens[0]);
        if (!target) messages.push(`Unknown session: ${tokens[0]}.`);
        else {
          const reload = this.requestProfileReload(target);
          messages.push(...reload.messages);
          activateSessionId = reload.activateSessionId;
          this.setActiveSession(target.id);
        }
      } else if (rawOperation === '+' || rawOperation === '-') {
        const ordered = [...this.sessions.values()];
        const currentIndex = Math.max(0, ordered.findIndex((session) => session.id === this.activeSessionId));
        const delta = rawOperation === '+' ? 1 : -1;
        const target = ordered[(currentIndex + delta + ordered.length) % ordered.length];
        activateSessionId = target.id;
        this.setActiveSession(target.id);
        messages.push(`Active session: ${target.name}.`);
      } else if (tokens.length >= 3) {
        const name = tokens[0];
        const host = String(tokens[1] || '').trim();
        const port = Number(tokens[2]);
        if (!normalizeSessionId(name) || !host || !Number.isInteger(port) || port < 1 || port > 65535) {
          messages.push(this.usage('session name host port [script]'));
        } else {
          let target = this.findSession(name);
          const created = !target;
          if (!target) {
            const publicSession = this.createSession({ name, role: 'member', host, port });
            target = this.findSession(publicSession.id);
            if (target) {
              target.terminalSize = { ...source.terminalSize };
              target.preferences = { ...source.preferences };
              target.connection.setTerminalSize(target.terminalSize.width, target.terminalSize.height);
              target.connection.setClientPreferences(target.preferences);
            }
          }

          if (!target) {
            messages.push(`Unable to create or find session ${name}.`);
          } else {
            activateSessionId = target.id;
            this.setActiveSession(target.id);
            if (created) {
              const requestedProfile = String(tokens[3] || name).trim();
              this.emit(target.id, 'session-profile-load-request', {
                requested: requestedProfile,
                connectAfter: { host, port }
              });
              const profileLabel = /\.(?:tin|txt)$/iu.test(requestedProfile) ? requestedProfile : `${requestedProfile}.tin`;
              messages.push(`Created session ${target.name}; loading ${profileLabel} before connecting to ${host}:${port}.`);
            } else {
              void this.connectSession(target.id, { host, port }).catch((error) => {
                this.emit(target.id, 'error', `Unable to connect ${target.name}: ${error?.message || error}`);
              });
              messages.push(`Connecting session ${target.name} to ${host}:${port}.`);
            }
          }
        }
      } else {
        const target = this.findSession(tokens[0]);
        if (!target) messages.push(`Unknown session: ${tokens[0]}. Use ${this.clientCommand('session name host port')} to create or connect it.`);
        else {
          activateSessionId = target.id;
          this.setActiveSession(target.id);
          messages.push(`Active session: ${target.name}.`);
        }
      }
    } else if (parsed.directive === 'group' || parsed.directive === 'groups') {
      const operation = normalizeToken(tokens[0]);
      if (!operation || operation === 'list') {
        if (this.groups.size === 0) messages.push('No session groups are defined.');
        for (const group of this.groups.values()) {
          const names = group.members.map((id) => this.sessions.get(id)?.name || id);
          const leader = this.sessions.get(group.leader)?.name || group.leader || 'none';
          messages.push(`${group.name}: ${names.join(', ')}; leader ${leader}`);
        }
      } else if (operation === 'delete' || operation === 'remove') {
        messages.push(this.deleteGroup(tokens[1]) ? `Deleted group ${tokens[1]}.` : `Unknown group: ${tokens[1]}.`);
      } else {
        const members = tokens.slice(1).flatMap((value) => value.split(/[\s,]+/u)).filter(Boolean);
        const group = this.defineGroup(tokens[0], members);
        messages.push(group
          ? `Group ${group.name} now contains ${group.members.map((id) => this.sessions.get(id)?.name || id).join(', ')}.`
          : 'A group needs a valid name and at least one known session.');
      }
    } else if (parsed.directive === 'role') {
      const target = this.findSession(tokens[0] || source.id);
      const role = tokens.slice(1).join(' ') || (tokens.length === 1 ? tokens[0] : '');
      if (!target || !role) messages.push(this.usage('role {session} {role}'));
      else {
        this.updateSession(target.id, { role });
        messages.push(`${target.name} role set to ${normalizeRole(role)}.`);
      }
    } else if (parsed.directive === 'leader') {
      if (!this.setGroupLeader(tokens[0], tokens[1])) messages.push(this.usage('leader {group} {member session}'));
      else messages.push(`${tokens[1]} is now leader of ${tokens[0]}.`);
    } else {
      const targetSession = this.findSession(parsed.directive);
      if (targetSession) {
        if (!parsed.body) {
          activateSessionId = targetSession.id;
          this.setActiveSession(targetSession.id);
          messages.push(`Active session: ${targetSession.name}.`);
        } else {
          // A named character is a real command-pipeline target, not merely a
          // socket shortcut. Aliases, Variables, doubled-prefix literal commands, and
          // lowercase Speedwalk routes therefore behave exactly as if typed on
          // that character's tab.
          this.tracePipeline(source, 'route', () => `${source.name} -> ${targetSession.name}: ${parsed.body}`);
          const routed = this.dispatchCommand(targetSession, parsed.body, options);
          deliveries = routed.deliveries;
          messages.push(...routed.messages);
          activateSessionId = routed.activateSessionId || '';
        }
      } else {
        const recipients = this.recipientsForTarget(parsed.directive, source.id);
        if (recipients.length === 0) {
          messages.push(`Unknown session or group: ${parsed.directive}.`);
        } else if (!parsed.body) {
          messages.push(this.usage(`${parsed.directive} <command>`));
        } else {
          const rawRoutedCommand = options.commandLineBatch
            ? unescapeActionSemicolons(parsed.body)
            : parsed.body;
          if (isClientCommand(rawRoutedCommand, this.commandPrefix)) {
            const fanoutDepth = Math.max(0, Math.trunc(Number(options.fanoutDepth) || 0));
            if (fanoutDepth >= 4) {
              messages.push('Client-command fanout stopped: maximum routing depth of 4 exceeded.');
            } else {
              this.tracePipeline(source, 'route', () => `${source.name} -> ${recipients.map((id) => this.sessions.get(id)?.name || id).join(', ')} pipeline: ${rawRoutedCommand}`);
              for (const sessionId of recipients) {
                const target = this.findSession(sessionId);
                if (!target) continue;
                const routed = this.dispatchCommand(target, rawRoutedCommand, {
                  ...options,
                  fanoutDepth: fanoutDepth + 1
                });
                deliveries.push(...routed.deliveries);
                messages.push(...routed.messages);
              }
            }
          } else {
            const variables = options.variablesExpanded
              ? { value: rawRoutedCommand, error: '' }
              : this.expandFunctionAndVariables(rawRoutedCommand, source, options);
            if (variables.error) {
              messages.push(variables.error);
            } else {
              const routedCommand = variables.value;
              this.tracePipeline(source, 'route', () => `${source.name} -> ${recipients.map((id) => this.sessions.get(id)?.name || id).join(', ')}: ${routedCommand}`);
              deliveries = this.sendToRecipients(recipients, routedCommand);
              const failed = deliveries.filter((delivery) => !delivery.queued);
              if (failed.length > 0) {
                messages.push(`${failed.length} target${failed.length === 1 ? '' : 's'} could not receive the command.`);
              }
            }
          }
        }
      }
    }

    const messageFamily = ({
      alias: 'alias', aliases: 'alias', unalias: 'alias',
      action: 'action', actions: 'action', unaction: 'action',
      variable: 'variable', variables: 'variable', unvariable: 'variable',
      function: 'function', functions: 'function', unfunction: 'function',
      gag: 'gag', gags: 'gag', ungag: 'gag',
      highlight: 'highlight', high: 'highlight', unhighlight: 'highlight', unhigh: 'highlight',
      substitute: 'substitute', sub: 'substitute', unsubstitute: 'substitute', unsub: 'substitute',
      macro: 'macro', mac: 'macro', unmacro: 'macro', unmac: 'macro',
      event: 'event', events: 'event', unevent: 'event',
      ticker: 'ticker', tick: 'ticker', unticker: 'ticker', untick: 'ticker',
      delay: 'delay', undelay: 'delay', class: 'class', classes: 'class', config: 'config',
      path: 'path', pathdir: 'pathdir', prompt: 'prompt', tab: 'tab'
    })[parsed.directive] || '';
    const definitionDisplayRequest = messageFamily && (
      tokens.length === 0
      || (!options.firstArgumentBraced && normalizeToken(tokens[0]) === 'list')
      || (tokens.length === 1 && messageFamily !== 'gag')
    );
    const definitionDisplaySucceeded = definitionDisplayRequest && messages.some((message) => {
      const text = String(message || '');
      return !/^(?:Unknown |No .*matches found)/u.test(text);
    });
    const visibleMessages = messageFamily && !['message','mess','ignore'].includes(parsed.directive)
      && !this.tintinListMessagesEnabled(messageFamily)
      && !definitionDisplaySucceeded
      ? []
      : messages;

    return {
      handled: true,
      deliveries,
      messages: visibleMessages,
      activateSessionId,
      controlFlow: '',
      snapshot: this.snapshot()
    };
  }

}

module.exports = {
  SessionManager,
  SessionCommandQueue,
  tokenizeBraced,
  firstDirective,
  normalizeSessionId,
  normalizeGroupName,
  normalizeDisplayName,
  normalizeRole,
  normalizeHost,
  normalizePort,
  DEFAULT_SEND_INTERVAL_MS,
  DEFAULT_MAX_PENDING_COMMANDS,
  DEFAULT_MAX_REPEAT_COMMANDS,
  DEFAULT_MAX_DELAY_SECONDS,
  DEFAULT_MAX_PENDING_DELAYS,
  DEFAULT_MAX_DELAY_COMMANDS,
  DEFAULT_MAX_LOOP_ITERATIONS,
  DEFAULT_MAX_LOOP_COMMANDS,
  DEFAULT_MAX_WHILE_ITERATIONS,
  DEFAULT_MAX_WHILE_COMMANDS,
  DEFAULT_MAX_LIST_ITEMS,
  DEFAULT_MAX_COMMAND_LINE_COMMANDS,
  DEFAULT_MAX_LOCAL_DISPLAY_CHARACTERS,
  normalizeLocalDisplayText,
  expandLoopVariableReferences
};
