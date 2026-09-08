'use strict';

const { normalizeClassName } = require('./class-manager');
const { compileLuaAutomationRegex, luaRegexMatchContext } = require('./lua-automation-pattern');
const {
  tokenizeBraced,
  splitTopLevelCommands,
  normalizeClientCommandPrefix,
  DEFAULT_CLIENT_COMMAND_PREFIX
} = require('./client-command-parser');

const ALIAS_NAME_MAX = 48;
const ALIAS_BODY_MAX = 4096;
const DEFAULT_MAX_ALIASES = 1024;
const DEFAULT_MAX_EXPANSION_DEPTH = 16;
const DEFAULT_MAX_ALIAS_COMMANDS = 128;
const DEFAULT_ALIAS_PRIORITY = 5;
const MIN_ALIAS_PRIORITY = 1;
const MAX_ALIAS_PRIORITY = 9;
const DEFAULT_MAX_LUA_TRANSIENT_ALIASES = 256;
const FORBIDDEN_ALIAS_NAMES = new Set(['__proto__', 'constructor', 'prototype']);
const FORBIDDEN_ALIAS_NAME_CHARACTERS = '{}[]\\;#@"\'';

function normalizeAliasName(value) {
  const source = String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/gu, ' ');
  const folded = source.toLowerCase();
  if (!source || source.length > ALIAS_NAME_MAX || FORBIDDEN_ALIAS_NAMES.has(folded)) return '';
  // Veteran TinTin aliases frequently use explicit ^...$ anchors around an
  // otherwise safe literal/%capture pattern. Treat those two characters as
  // boundary markers only; never accept them in the middle of an Alias name.
  if ((source.includes('^') && !source.startsWith('^'))
    || source.slice(1).includes('^')
    || source.slice(0, -1).includes('$')) return '';
  if ([...source].some((character) => {
    const code = character.codePointAt(0);
    return code < 32 || code === 127 || FORBIDDEN_ALIAS_NAME_CHARACTERS.includes(character);
  })) return '';

  // Literal Alias text remains case-folded for NukeFire's established
  // case-insensitive shorthand behavior, but TinTin pattern operators are
  // case-sensitive syntax: %s != %S, %d != %D, %w != %W, and %i != %I.
  let normalized = '';
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character !== '%') {
      normalized += character.toLowerCase();
      continue;
    }
    const next = source[index + 1] || '';
    if (next === '%' || 'dDsSwW?*+.iI'.includes(next)) {
      normalized += `%${next}`;
      index += 1;
      continue;
    }
    const numbered = source.slice(index + 1).match(/^(?:[1-9][0-9]?|0)/u);
    if (!numbered) return '';
    normalized += `%${numbered[0]}`;
    index += numbered[0].length;
  }
  return normalized;
}

function normalizeAliasBody(value) {
  return String(value ?? '')
    .replace(/[\r\n]+/gu, ' ')
    .trim()
    .slice(0, ALIAS_BODY_MAX);
}

function normalizeAliasPriority(value, fallback = DEFAULT_ALIAS_PRIORITY) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(MIN_ALIAS_PRIORITY, Math.min(MAX_ALIAS_PRIORITY, Math.trunc(number)));
}

function splitAliasCommands(bodyValue, options = {}) {
  const maximum = Math.max(
    1,
    Math.trunc(Number(options.maxCommands) || DEFAULT_MAX_ALIAS_COMMANDS)
  );
  const result = splitTopLevelCommands(normalizeAliasBody(bodyValue), {
    maxCommands: maximum,
    commandPrefix: options.commandPrefix,
    quoteAware: false
  });
  const errors = {
    empty: 'Alias command list cannot be empty.',
    'too-many': `Aliases may expand to at most ${maximum} commands.`,
    'unmatched-closing-brace': 'Alias command list has an unmatched closing brace.',
    'unfinished-escape': 'Alias command list cannot end with an unfinished escape.',
    'unterminated-quote': 'Alias command list has an unterminated quote.',
    'unterminated-brace': 'Alias command list has an unterminated brace group.'
  };
  return {
    commands: result.commands,
    error: result.errorCode ? errors[result.errorCode] || 'Alias command list is invalid.' : ''
  };
}

function substituteAliasBody(body, argumentsList) {
  const source = String(body ?? '');
  const args = Array.isArray(argumentsList)
    ? argumentsList.slice(0, 99).map((value) => String(value ?? ''))
    : [];
  const all = args.join(' ');
  return substituteAliasCaptures(source, Object.fromEntries(
    args.map((value, index) => [String(index + 1), value])
  ), all);
}

function substituteAliasCaptures(bodyValue, capturesValue = {}, allValue = '') {
  const source = String(bodyValue ?? '');
  const captures = capturesValue && typeof capturesValue === 'object' ? capturesValue : {};
  const all = String(allValue ?? '');
  const literalPercent = '\uE020';
  let output = '';

  for (let index = 0; index < source.length;) {
    if (source[index] === '%' && source[index + 1] === '%') {
      output += literalPercent;
      index += 2;
      continue;
    }
    if (source[index] === '%') {
      const match = source.slice(index + 1).match(/^(?:[1-9][0-9]?|0)/u);
      if (match) {
        const position = match[0];
        output += position === '0' && !Object.prototype.hasOwnProperty.call(captures, '0')
          ? all
          : String(captures[position] ?? '');
        index += 1 + position.length;
        continue;
      }
    }
    output += source[index];
    index += 1;
  }

  return output.replaceAll(literalPercent, '%').trim();
}

function aliasUsesPattern(nameValue) {
  const name = normalizeAliasName(nameValue);
  return Boolean(name && (
    name.startsWith('^')
    || name.endsWith('$')
    || /\s/u.test(name)
    || /%(?:[dDsSwW?*+.iI]|(?:[1-9][0-9]?|0))/u.test(name)
  ));
}

function escapeRegexCharacter(character) {
  return /[\\^$.*+?()[\]{}|]/u.test(character) ? `\\${character}` : character;
}

function aliasWildcardSource(token, hasTrailingPattern) {
  const suffix = hasTrailingPattern ? '?' : '';
  return ({
    d: `[0-9]*${suffix}`,
    D: `[^0-9]*${suffix}`,
    s: `\\s*${suffix}`,
    S: `\\S*${suffix}`,
    w: `[A-Za-z]*${suffix}`,
    W: `[^A-Za-z]*${suffix}`,
    '?': hasTrailingPattern ? '.??' : '.?',
    '*': hasTrailingPattern ? '.*?' : '.*',
    '+': hasTrailingPattern ? '.+?' : '.+',
    '.': '.'
  })[token] || (hasTrailingPattern ? '.*?' : '.*');
}

function aliasCaseAwareLiteral(character, ignoreCase) {
  if (ignoreCase && /^[A-Za-z]$/u.test(character)) {
    const lower = character.toLowerCase();
    const upper = character.toUpperCase();
    return lower === upper ? escapeRegexCharacter(character) : `[${lower}${upper}]`;
  }
  return escapeRegexCharacter(character);
}

function compileAliasPattern(nameValue) {
  const normalized = normalizeAliasName(nameValue);
  if (!normalized || !aliasUsesPattern(normalized)) return null;
  const pattern = normalized.replace(/^\^/u, '').replace(/\$$/u, '');
  if (!pattern) return null;

  let source = '^';
  const captureIndexes = [];
  const seen = new Set();
  let nextAutomaticCapture = 1;
  // NukeFire aliases have historically been case-insensitive; preserve that
  // default while honoring TinTin's %I / %i switches for following literals.
  let ignoreCase = true;

  const registerCapture = (position, token, hasTrailingPattern) => {
    if (position < 0 || position > 99) return null;
    const name = `capture${position}`;
    if (seen.has(position)) return `\\k<${name}>`;
    seen.add(position);
    captureIndexes.push(position);
    if (position > 0) nextAutomaticCapture = Math.max(nextAutomaticCapture, position + 1);
    return `(?<${name}>${aliasWildcardSource(token, hasTrailingPattern)})`;
  };
  const nextUnnumberedCapture = () => {
    while (seen.has(nextAutomaticCapture) && nextAutomaticCapture <= 99) nextAutomaticCapture += 1;
    return nextAutomaticCapture <= 99 ? nextAutomaticCapture : -1;
  };

  for (let index = 0; index < pattern.length;) {
    const character = pattern[index];
    const next = pattern[index + 1] || '';
    if (character === '%' && next === '%') {
      source += '%';
      index += 2;
      continue;
    }
    if (character === '%' && (next === 'i' || next === 'I')) {
      ignoreCase = next === 'i';
      index += 2;
      continue;
    }
    if (character === '%' && 'dDsSwW?*+.'.includes(next)) {
      const position = nextUnnumberedCapture();
      if (position < 1) return null;
      const tokenEnd = index + 2;
      source += registerCapture(position, next, tokenEnd < pattern.length);
      index = tokenEnd;
      continue;
    }
    if (character === '%') {
      const numbered = pattern.slice(index + 1).match(/^(?:[1-9][0-9]?|0)/u);
      if (numbered) {
        const position = Number(numbered[0]);
        const tokenEnd = index + 1 + numbered[0].length;
        source += registerCapture(position, '*', tokenEnd < pattern.length);
        index = tokenEnd;
        continue;
      }
    }
    if (/\s/u.test(character)) {
      while (index < pattern.length && /\s/u.test(pattern[index])) index += 1;
      source += '\\s+';
      continue;
    }
    source += aliasCaseAwareLiteral(character, ignoreCase);
    index += 1;
  }

  source += '$';
  try {
    const matcher = new RegExp(source, 'u');
    Object.defineProperty(matcher, 'nukeFireAliasCaptureIndexes', {
      value: Object.freeze([...captureIndexes]),
      enumerable: false,
      configurable: false,
      writable: false
    });
    return matcher;
  } catch (_error) {
    return null;
  }
}


function aliasLiteralPrefix(nameValue, maximum = 3) {
  const normalized = normalizeAliasName(nameValue);
  if (!normalized || !aliasUsesPattern(normalized)) return '';
  const pattern = normalized.replace(/^\^/u, '').replace(/\$$/u, '');
  let prefix = '';
  for (let index = 0; index < pattern.length && prefix.length < maximum; index += 1) {
    const character = pattern[index];
    if (character === '%' || /\s/u.test(character)) break;
    prefix += character.toLowerCase();
  }
  return prefix;
}

function detachedRecord(record) {
  return {
    name: record.name,
    body: record.body,
    priority: record.priority,
    scope: 'global',
    ...(record.className ? { className: record.className } : {})
  };
}

class AliasEngine {
  constructor(options = {}) {
    this.maxExpansionDepth = Math.max(
      1,
      Math.trunc(Number(options.maxExpansionDepth) || DEFAULT_MAX_EXPANSION_DEPTH)
    );
    this.maxAliases = Math.max(
      1,
      Math.trunc(Number(options.maxAliases) || DEFAULT_MAX_ALIASES)
    );
    this.maxCommands = Math.max(
      1,
      Math.trunc(Number(options.maxCommands) || DEFAULT_MAX_ALIAS_COMMANDS)
    );
    this.commandPrefix = normalizeClientCommandPrefix(
      options.commandPrefix,
      DEFAULT_CLIENT_COMMAND_PREFIX
    );
    this.aliases = new Map();
    this.patternAliases = [];
    this.luaTransientAliases = new Map();
    this.maxLuaTransientAliases = Math.max(1, Math.trunc(Number(options.maxLuaTransientAliases) || DEFAULT_MAX_LUA_TRANSIENT_ALIASES));
    this.orderedAliases = [];
    this.aliasPatternBuckets = new Map();
    this.aliasGenericPatterns = [];
    this.aliasOrderRank = new Map();
    this.revision = 0;
    if (Array.isArray(options.aliases)) this.replaceAll(options.aliases);
  }

  setCommandPrefix(value) {
    this.commandPrefix = normalizeClientCommandPrefix(value, this.commandPrefix);
    return this.commandPrefix;
  }

  refreshPatternOrder() {
    this.revision += 1;
    this.orderedAliases = [...this.aliases.values()]
      .sort((left, right) => left.priority - right.priority || left.name.localeCompare(right.name));
    this.patternAliases = this.orderedAliases.filter((record) => record.matcher);
    this.aliasPatternBuckets = new Map();
    this.aliasGenericPatterns = [];
    this.aliasOrderRank = new Map();
    for (let index = 0; index < this.orderedAliases.length; index += 1) {
      const record = this.orderedAliases[index];
      this.aliasOrderRank.set(record.name, index);
      if (!record.matcher) continue;
      const prefix = aliasLiteralPrefix(record.name);
      if (!prefix) {
        this.aliasGenericPatterns.push(record);
        continue;
      }
      const bucket = this.aliasPatternBuckets.get(prefix) || [];
      bucket.push(record);
      this.aliasPatternBuckets.set(prefix, bucket);
    }
  }

  candidateAliases(commandValue, simpleNameValue = '') {
    const command = String(commandValue ?? '').trim();
    const folded = command.toLowerCase();
    const lists = [];
    const literal = simpleNameValue ? this.aliases.get(simpleNameValue) : null;
    if (literal && !literal.matcher) lists.push([literal]);
    for (let length = 1; length <= 3 && length <= folded.length; length += 1) {
      const bucket = this.aliasPatternBuckets.get(folded.slice(0, length));
      if (bucket?.length) lists.push(bucket);
    }
    if (this.aliasGenericPatterns.length) lists.push(this.aliasGenericPatterns);
    if (lists.length <= 1) return lists[0] || [];

    const offsets = new Array(lists.length).fill(0);
    const merged = [];
    const seen = new Set();
    while (true) {
      let best = null;
      let bestList = -1;
      let bestRank = Number.MAX_SAFE_INTEGER;
      for (let index = 0; index < lists.length; index += 1) {
        const record = lists[index][offsets[index]];
        if (!record) continue;
        const rank = this.aliasOrderRank.get(record.name) ?? Number.MAX_SAFE_INTEGER;
        if (rank < bestRank) { best = record; bestList = index; bestRank = rank; }
      }
      if (!best) break;
      offsets[bestList] += 1;
      if (seen.has(best.name)) continue;
      seen.add(best.name);
      merged.push(best);
    }
    return merged;
  }

  define(nameValue, bodyValue, priorityValue = DEFAULT_ALIAS_PRIORITY, classNameValue = '') {
    // Keep source compatibility with the older internal three-argument call
    // shape define(name, body, className) while making priority a real field.
    let priorityInput = priorityValue;
    let classInput = classNameValue;
    if (!classNameValue && typeof priorityValue === 'string' && priorityValue.trim() && !/^[-+]?\d+(?:\.\d+)?$/u.test(priorityValue.trim())) {
      classInput = priorityValue;
      priorityInput = DEFAULT_ALIAS_PRIORITY;
    }
    const name = normalizeAliasName(nameValue);
    const body = normalizeAliasBody(bodyValue);
    const priority = normalizeAliasPriority(priorityInput);
    const className = normalizeClassName(classInput);
    const commandList = splitAliasCommands(body, { maxCommands: this.maxCommands, commandPrefix: this.commandPrefix });
    const matcher = aliasUsesPattern(name) ? compileAliasPattern(name) : null;
    if (!name || !body || commandList.error || (aliasUsesPattern(name) && !matcher)) return null;
    if (!this.aliases.has(name) && this.aliases.size >= this.maxAliases) return null;
    const record = Object.freeze({
      name,
      body,
      priority,
      scope: 'global',
      className,
      matcher,
      commandTemplates: Object.freeze([...commandList.commands])
    });
    this.aliases.set(name, record);
    this.refreshPatternOrder();
    return detachedRecord(record);
  }

  get(nameValue) {
    const record = this.aliases.get(normalizeAliasName(nameValue));
    return record ? detachedRecord(record) : null;
  }

  list() {
    return [...this.aliases.values()]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(detachedRecord);
  }

  delete(nameValue) {
    const deleted = this.aliases.delete(normalizeAliasName(nameValue));
    if (deleted) this.refreshPatternOrder();
    return deleted;
  }

  clear() {
    this.aliases.clear();
    this.refreshPatternOrder();
  }

  replaceAll(records = []) {
    const next = new Map();
    const source = Array.isArray(records)
      ? records.slice(0, this.maxAliases * 4)
      : [];

    for (const raw of source) {
      const record = raw && typeof raw === 'object' ? raw : {};
      const name = normalizeAliasName(record.name);
      const body = normalizeAliasBody(record.body);
      const priority = normalizeAliasPriority(record.priority);
      const className = normalizeClassName(record.className);
      const commandList = splitAliasCommands(body, { maxCommands: this.maxCommands, commandPrefix: this.commandPrefix });
      const matcher = aliasUsesPattern(name) ? compileAliasPattern(name) : null;
      if (!name || !body || commandList.error || (aliasUsesPattern(name) && !matcher)) continue;
      if (!next.has(name) && next.size >= this.maxAliases) continue;
      next.set(name, Object.freeze({
        name,
        body,
        priority,
        scope: 'global',
        className,
        matcher,
        commandTemplates: Object.freeze([...commandList.commands])
      }));
    }

    this.aliases = next;
    this.refreshPatternOrder();
    return this.list();
  }

  matchPatternAlias(commandValue) {
    const command = String(commandValue ?? '').trim();
    for (const record of this.patternAliases) {
      const match = record.matcher.exec(command);
      if (!match) continue;
      const captures = {};
      const indexes = Array.isArray(record.matcher.nukeFireAliasCaptureIndexes)
        ? record.matcher.nukeFireAliasCaptureIndexes
        : [];
      for (const position of indexes) {
        captures[String(position)] = match.groups?.[`capture${position}`] ?? '';
      }
      return { record, captures, matchedText: match[0] || command };
    }
    return null;
  }


  defineLuaTransient(idValue, regexValue) {
    const id = Math.max(1, Math.trunc(Number(idValue) || 0));
    const matcher = compileLuaAutomationRegex(regexValue);
    if (!id || !matcher) return null;
    if (!this.luaTransientAliases.has(id) && this.luaTransientAliases.size >= this.maxLuaTransientAliases) return null;
    const record = Object.freeze({ id, pattern: String(regexValue), matcher, enabled: true });
    this.luaTransientAliases.set(id, record);
    return { id, pattern: record.pattern, enabled: true };
  }

  setLuaTransientEnabled(idValue, enabled) {
    const id = Math.max(1, Math.trunc(Number(idValue) || 0));
    const current = this.luaTransientAliases.get(id);
    if (!current) return false;
    this.luaTransientAliases.set(id, Object.freeze({ ...current, enabled: Boolean(enabled) }));
    return true;
  }

  removeLuaTransient(idValue) {
    const id = Math.max(1, Math.trunc(Number(idValue) || 0));
    return id > 0 && this.luaTransientAliases.delete(id);
  }

  clearLuaTransients() {
    const count = this.luaTransientAliases.size;
    this.luaTransientAliases.clear();
    return count;
  }

  matchLuaTransients(commandValue, maximum = 16) {
    const command = String(commandValue ?? '').replace(/[\r\n]+$/u, '');
    if (!command || this.luaTransientAliases.size === 0) return [];
    const results = [];
    const limit = Math.max(1, Math.min(32, Math.trunc(Number(maximum) || 16)));
    for (const record of this.luaTransientAliases.values()) {
      if (!record.enabled) continue;
      record.matcher.lastIndex = 0;
      const match = record.matcher.exec(command);
      if (!match) continue;
      const context = luaRegexMatchContext(match);
      results.push({ id: record.id, command, ...context });
      if (results.length >= limit) break;
    }
    return results;
  }

  expandCommands(inputValue) {
    const original = String(inputValue ?? '').replace(/[\r\n]+$/u, '');
    const trace = [];
    let matched = false;
    let error = '';

    const expandOne = (commandValue, stack) => {
      const command = String(commandValue ?? '').trim();
      if (command.startsWith(this.commandPrefix)) return [command];

      const tokens = tokenizeBraced(command);
      const simpleName = normalizeAliasName(tokens[0]);
      let record = null;
      let args = tokens.slice(1);
      let patternCaptures = null;
      let patternAll = '';

      // TinTin resolves the first matching Alias from its priority-ordered
      // Alias list. Candidate indexing only removes definitions that cannot
      // possibly match this command; the remaining records keep that exact
      // global priority/name competition.
      for (const candidate of this.candidateAliases(command, simpleName)) {
        if (!candidate.matcher) {
          if (simpleName !== candidate.name) continue;
          record = candidate;
          break;
        }
        const match = candidate.matcher.exec(command);
        if (!match) continue;
        record = candidate;
        patternCaptures = {};
        const indexes = Array.isArray(candidate.matcher.nukeFireAliasCaptureIndexes)
          ? candidate.matcher.nukeFireAliasCaptureIndexes
          : [];
        for (const position of indexes) {
          patternCaptures[String(position)] = match.groups?.[`capture${position}`] ?? '';
        }
        patternAll = match[0] || command;
        break;
      }
      if (!record) return [command];

      matched = true;
      const aliasKey = record.name;
      if (stack.includes(aliasKey)) {
        const loop = [...stack.slice(stack.indexOf(aliasKey)), aliasKey];
        error = `Alias expansion stopped: recursive loop ${loop.join(' -> ')}.`;
        return [];
      }
      if (stack.length >= this.maxExpansionDepth) {
        error = `Alias expansion stopped: maximum depth of ${this.maxExpansionDepth} exceeded.`;
        return [];
      }

      trace.push(aliasKey);
      const nextStack = [...stack, aliasKey];
      let substituted = record.commandTemplates
        .map((template) => patternCaptures
          ? substituteAliasCaptures(template, patternCaptures, patternAll)
          : substituteAliasBody(template, args))
        .map((value) => value.trim())
        .filter(Boolean);

      // TinTin's long-standing simple-alias behavior appends typed arguments
      // when the alias body does not reference %0-%99. Veteran controller
      // files rely on this for shorthands such as `jj -> #Jags`, allowing
      // `jj pounce` to become `#Jags pounce` without spelling `%0` explicitly.
      if (!record.matcher && args.length > 0 && !/%(?:[0-9]{1,2}|\*)/u.test(record.body) && substituted.length > 0) {
        const trailing = args.join(' ');
        substituted = substituted.map((value, index) => index === substituted.length - 1
          ? `${value} ${trailing}`.trim()
          : value);
      }
      if (substituted.length === 0) {
        error = 'Alias expansion stopped: every generated command was empty.';
        return [];
      }

      const expanded = [];
      for (const generated of substituted) {
        expanded.push(...expandOne(generated, nextStack));
        if (error) return [];
        if (expanded.length > this.maxCommands) {
          error = `Alias expansion stopped: at most ${this.maxCommands} commands may be generated.`;
          return [];
        }
      }
      return expanded;
    };

    const commands = expandOne(original, []);
    return {
      matched,
      commands: error ? [] : commands,
      stack: trace,
      error
    };
  }

  expand(inputValue) {
    const result = this.expandCommands(inputValue);
    return {
      matched: result.matched,
      command: result.error ? '' : result.commands.join('; '),
      stack: result.stack,
      error: result.error
    };
  }
}

module.exports = {
  AliasEngine,
  normalizeAliasName,
  normalizeAliasBody,
  normalizeAliasPriority,
  splitAliasCommands,
  substituteAliasBody,
  substituteAliasCaptures,
  aliasUsesPattern,
  compileAliasPattern,
  ALIAS_NAME_MAX,
  ALIAS_BODY_MAX,
  DEFAULT_MAX_ALIASES,
  DEFAULT_MAX_EXPANSION_DEPTH,
  DEFAULT_MAX_ALIAS_COMMANDS,
  DEFAULT_ALIAS_PRIORITY,
  MIN_ALIAS_PRIORITY,
  MAX_ALIAS_PRIORITY,
  DEFAULT_MAX_LUA_TRANSIENT_ALIASES
};
