'use strict';

(function exposeTinTinImporter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireTinTinImporter = api;
})(typeof window !== 'undefined' ? window : globalThis, function createTinTinImporter() {
  const MAX_SOURCE_LENGTH = 2_000_000;
  const MAX_DEFINITIONS = 2_000;
  const MAX_ALIAS_NAME = 48;
  const MAX_ALIAS_BODY = 4096;
  const MAX_ACTION_PATTERN = 512;
  const MAX_ACTION_COMMAND = 4096;
  const MAX_COMMANDS = 10;

  const ALIAS_DIRECTIVES = new Set(['alias', 'al']);
  const ACTION_DIRECTIVES = new Set(['action', 'act', 'ac']);
  const COMMENT_DIRECTIVES = new Set(['nop']);
  const FORBIDDEN_ALIAS_NAMES = new Set(['__proto__', 'constructor', 'prototype']);
  const FORBIDDEN_ALIAS_NAME_CHARACTERS = '{}[]\\;#@"\'';
  const SAFE_IMPORTED_DIRECTIVES = new Set(['all', 'echo', 'else', 'elseif', 'followers', 'format', 'if', 'math', 'show', 'showme', 'delay', 'undelay', 'line', 'list', 'parse', 'replace', 'send', 'switch', 'case', 'default']);
  const UNSUPPORTED_TINTIN_DIRECTIVES = new Set([
    'alias', 'al', 'unalias', 'unal', 'action', 'act', 'ac', 'unaction',
    'variable', 'var', 'unvariable', 'switch',
    'case', 'default', 'list', 'replace', 'read', 'system', 'sys',
    'delay', 'highlight', 'high', 'unhighlight',
    'unhigh', 'line', 'log', 'class', 'kill', 'parse', 'loop', 'foreach',
    'event', 'macro', 'ticker', 'path', 'write', 'chat', 'nop', 'function',
    'return', 'send', 'bell', 'config', 'ignore', 'debug', 'prompt', 'substitute',
    'sub', 'gag', 'ungag', 'button', 'cursor', 'daemon', 'draw', 'grep', 'info',
    'help', 'local', 'map', 'mapper', 'message', 'port', 'regex', 'script', 'session',
    'sessions', 'snoop', 'split', 'tab', 'textin', 'while', 'zap'
  ]);

  function normalizeLineEndings(value) {
    return String(value ?? '').replace(/\r\n?/gu, '\n');
  }

  function flattenDefinitionText(value) {
    return String(value ?? '')
      .replace(/[\t\n ]+/gu, ' ')
      .trim();
  }

  function normalizeAliasName(value) {
    const source = String(value ?? '')
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/\s+/gu, ' ');
    if (!source || source.length > MAX_ALIAS_NAME || FORBIDDEN_ALIAS_NAMES.has(source)) return '';
    if ((source.includes('^') && !source.startsWith('^'))
      || (source.includes('$') && !source.endsWith('$'))
      || source.slice(1).includes('^')
      || source.slice(0, -1).includes('$')) return '';
    if ([...source].some((character) => {
      const code = character.codePointAt(0);
      return code < 32 || code === 127 || FORBIDDEN_ALIAS_NAME_CHARACTERS.includes(character);
    })) return '';
    for (let index = 0; index < source.length; index += 1) {
      if (source[index] !== '%') continue;
      const next = source[index + 1] || '';
      if (next === '%' || next === '*') { index += 1; continue; }
      const numbered = source.slice(index + 1).match(/^(?:[1-9][0-9]?|0)/u);
      if (!numbered) return '';
      index += numbered[0].length;
    }
    return source;
  }

  function buildLineStarts(source) {
    const starts = [0];
    for (let index = 0; index < source.length; index += 1) {
      if (source[index] === '\n') starts.push(index + 1);
    }
    return starts;
  }

  function lineNumberAt(lineStarts, indexValue) {
    const index = Math.max(0, Number(indexValue) || 0);
    let low = 0;
    let high = lineStarts.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (lineStarts[middle] <= index) low = middle + 1;
      else high = middle;
    }
    return Math.max(1, low);
  }

  function skipWhitespace(source, indexValue) {
    let index = Math.max(0, Number(indexValue) || 0);
    while (index < source.length && /\s/u.test(source[index])) index += 1;
    return index;
  }

  function lineEnd(source, indexValue) {
    const index = source.indexOf('\n', Math.max(0, Number(indexValue) || 0));
    return index === -1 ? source.length : index;
  }

  function readDirectiveName(source, hashIndex) {
    let index = hashIndex + 1;
    while (index < source.length && /[A-Za-z]/u.test(source[index])) index += 1;
    return {
      name: source.slice(hashIndex + 1, index).toLowerCase(),
      end: index
    };
  }

  function readBalancedGroup(source, openIndex) {
    if (source[openIndex] !== '{') return null;
    let depth = 0;
    let escaped = false;
    for (let index = openIndex; index < source.length; index += 1) {
      const character = source[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (character === '{') {
        depth += 1;
        continue;
      }
      if (character === '}') {
        depth -= 1;
        if (depth === 0) {
          return {
            value: source.slice(openIndex + 1, index),
            start: openIndex,
            end: index + 1,
            error: ''
          };
        }
      }
    }
    return {
      value: source.slice(openIndex + 1),
      start: openIndex,
      end: source.length,
      error: 'Unterminated brace group.'
    };
  }

  function readArgument(source, indexValue, options = {}) {
    let index = skipWhitespace(source, indexValue);
    if (index >= source.length) return null;
    if (source[index] === '{') return readBalancedGroup(source, index);

    const endOfLine = lineEnd(source, index);
    if (options.restOfLine === true) {
      return {
        value: source.slice(index, endOfLine).trim(),
        start: index,
        end: endOfLine,
        error: ''
      };
    }

    let end = index;
    while (end < endOfLine && !/\s/u.test(source[end])) end += 1;
    return {
      value: source.slice(index, end),
      start: index,
      end,
      error: ''
    };
  }

  function consumeOptionalPriority(source, indexValue) {
    const index = skipWhitespace(source, indexValue);
    if (source[index] === '#') return { end: indexValue, value: '' };
    if (source[index] === '{') {
      const group = readBalancedGroup(source, index);
      if (group && !group.error && /^\s*[0-9]+(?:\.[0-9]+)?\s*$/u.test(group.value)) {
        return { end: group.end, value: group.value.trim() };
      }
      return { end: indexValue, value: '' };
    }
    const end = lineEnd(source, index);
    const token = source.slice(index, end).trim();
    if (/^[0-9]+(?:\.[0-9]+)?$/u.test(token)) return { end, value: token };
    return { end: indexValue, value: '' };
  }

  function skipUnknownDirective(source, indexValue) {
    let index = indexValue;
    const initialLineEnd = lineEnd(source, index);
    while (index < source.length) {
      const next = skipWhitespace(source, index);
      if (source[next] !== '{') break;
      const group = readBalancedGroup(source, next);
      if (!group) break;
      index = group.end;
      if (group.error) return group.end;
    }
    return Math.max(index, initialLineEnd);
  }

  function repairSimpleUnterminatedDoubleQuotes(value) {
    const lines = normalizeLineEndings(value).split('\n');
    const notes = [];
    let doubleQuoteOpen = false;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const original = lines[lineIndex];
      const startedOpen = doubleQuoteOpen;
      let escaped = false;

      for (let index = 0; index < original.length; index += 1) {
        const character = original[index];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (character === '\\') {
          escaped = true;
          continue;
        }
        if (character === '"') doubleQuoteOpen = !doubleQuoteOpen;
      }

      /*
       * Older TinTin files sometimes contain a spoken command such as:
       *   : says, "Here you go, %1…;
       * The semicolon clearly ends the physical command, but the closing quote
       * was omitted.  Repair only this narrow, line-local form.  We never guess
       * across lines and we never alter single quotes, which are commonly used
       * for spell names and contractions.
       */
      if (!startedOpen && doubleQuoteOpen && /;\s*$/u.test(original)) {
        lines[lineIndex] = original.replace(/;(\s*)$/u, '";$1');
        doubleQuoteOpen = false;
        notes.push(`Closed an unterminated double quote on TinTin command line ${lineIndex + 1}.`);
      }
    }

    return {
      value: lines.join('\n'),
      repaired: notes.length > 0,
      notes
    };
  }

  function inspectTopLevelCommands(value, maximum = Number.POSITIVE_INFINITY) {
    const source = flattenDefinitionText(value);
    const commands = [];
    let current = '';
    let depth = 0;
    let quote = '';
    let escaped = false;

    const commit = () => {
      const normalized = current.trim();
      current = '';
      if (!normalized) return true;
      commands.push(normalized);
      return commands.length <= maximum;
    };

    if (!source) return { commands: [], errorCode: 'empty' };

    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (escaped) {
        current += character === ';' ? ';' : `\\${character}`;
        escaped = false;
        continue;
      }
      if (character === '\\') {
        escaped = true;
        continue;
      }
      if (quote) {
        current += character;
        if (character === quote) quote = '';
        continue;
      }

      const previous = source[index - 1] || '';
      const singleQuoteCanOpen = character === "'"
        && (!previous || /[\s({\[]/u.test(previous))
        && source.indexOf("'", index + 1) !== -1;
      if (character === '"' || singleQuoteCanOpen) {
        current += character;
        quote = character;
        continue;
      }
      if (character === '{') {
        depth += 1;
        current += character;
        continue;
      }
      if (character === '}') {
        if (depth === 0) return { commands: [], errorCode: 'unmatched-closing-brace' };
        depth -= 1;
        current += character;
        continue;
      }
      if (character === ';' && depth === 0) {
        if (!commit()) return { commands: [], errorCode: 'too-many' };
        continue;
      }
      current += character;
    }

    if (escaped) return { commands: [], errorCode: 'unfinished-escape' };
    if (quote) return { commands: [], errorCode: 'unterminated-quote' };
    if (depth !== 0) return { commands: [], errorCode: 'unterminated-brace' };
    if (!commit()) return { commands: [], errorCode: 'too-many' };
    if (commands.length === 0) return { commands: [], errorCode: 'empty' };
    return { commands, errorCode: '' };
  }

  function splitTopLevelCommands(value, maximum = Number.POSITIVE_INFINITY) {
    return inspectTopLevelCommands(value, maximum).commands;
  }

  function directiveOccurrences(bodyValue) {
    const body = flattenDefinitionText(bodyValue);
    const occurrences = [];
    let escaped = false;
    let quote = '';

    for (let index = 0; index < body.length; index += 1) {
      const character = body[index];
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
      const previous = body[index - 1] || '';
      const boundary = index === 0 || /[\s;{]/u.test(previous);
      if (character === '#' && boundary) {
        let end = index + 1;
        while (end < body.length && /[A-Za-z0-9_-]/u.test(body[end])) end += 1;
        occurrences.push({
          name: body.slice(index + 1, end).toLowerCase(),
          start: index,
          end
        });
      }
    }
    return occurrences;
  }

  function rewriteRoutingPrefixes(bodyValue, commandPrefixValue) {
    const body = flattenDefinitionText(bodyValue);
    const commandPrefix = ['#', '~', '^', '/', '`', "'"].includes(String(commandPrefixValue || ''))
      ? String(commandPrefixValue)
      : '#';
    if (commandPrefix === '#') return body;

    let output = '';
    let escaped = false;
    let quote = '';

    for (let index = 0; index < body.length; index += 1) {
      const character = body[index];
      if (escaped) {
        output += character;
        escaped = false;
        continue;
      }
      if (character === '\\') {
        output += character;
        escaped = true;
        continue;
      }
      if (quote) {
        output += character;
        if (character === quote) quote = '';
        continue;
      }
      if (character === '"' || character === "'") {
        output += character;
        quote = character;
        continue;
      }
      const previous = body[index - 1] || '';
      const boundary = index === 0 || /[\s;{]/u.test(previous);
      if (character === '#' && boundary && /[A-Za-z0-9_-]/u.test(body[index + 1] || '')) {
        output += commandPrefix;
        continue;
      }
      output += character;
    }
    return output;
  }

  function variableReferences(value) {
    return [...String(value ?? '').matchAll(/\$\{?[A-Za-z][A-Za-z0-9_ ]*\}?/gu)]
      .map((match) => match[0]);
  }

  function unsupportedPatternFeatures(patternValue) {
    const pattern = String(patternValue ?? '');
    const reasons = [];
    if (pattern.startsWith('~')) reasons.push('Color-sensitive TinTin patterns are not supported.');
    if (/%(?:1[0-9]|[2-9][0-9])/u.test(pattern)) reasons.push('NukeFire Actions support captures %1 through %9 only.');
    if (/%0/u.test(pattern)) reasons.push('Legacy %0 in an Action pattern needs manual review; %0 is the full matched line in NukeFire.');
    if (/%(?:\*|\+|\?|\.|[aAcCdDiIsSwW])/u.test(pattern)) reasons.push('TinTin wildcard or character-class syntax needs manual conversion.');
    if (/%!?\{/u.test(pattern) || /\{[^{}]*\|[^{}]*\}/u.test(pattern)) reasons.push('Embedded TinTin PCRE needs manual conversion.');
    return reasons;
  }

  function analyzeBody(bodyValue, options = {}) {
    const repair = repairSimpleUnterminatedDoubleQuotes(bodyValue);
    const body = flattenDefinitionText(repair.value);
    const reasons = [];
    const warnings = [];
    const syntax = inspectTopLevelCommands(body, MAX_COMMANDS);
    const commands = syntax.commands;
    const syntaxReasons = {
      empty: 'Definition command is empty.',
      'too-many': `Definition expands to more than ${MAX_COMMANDS} commands.`,
      'unmatched-closing-brace': 'Definition command has an unmatched closing brace.',
      'unfinished-escape': 'Definition command ends with an unfinished escape.',
      'unterminated-quote': 'Definition command has an unterminated quote.',
      'unterminated-brace': 'Definition command has an unterminated brace group.'
    };
    if (syntax.errorCode) reasons.push(syntaxReasons[syntax.errorCode] || 'Definition command syntax is invalid.');
    if (body.length > Number(options.maximumLength || MAX_ALIAS_BODY)) {
      reasons.push(`Definition command exceeds ${Number(options.maximumLength || MAX_ALIAS_BODY)} characters.`);
    }

    const directives = directiveOccurrences(body);
    for (const occurrence of directives) {
      if (!occurrence.name) {
        reasons.push('Malformed TinTin client directive.');
        continue;
      }
      if (SAFE_IMPORTED_DIRECTIVES.has(occurrence.name)) continue;
      if (UNSUPPORTED_TINTIN_DIRECTIVES.has(occurrence.name)) {
        reasons.push(`Contains unsupported TinTin directive #${occurrence.name}.`);
      } else {
        warnings.push(`Preserves #${occurrence.name} as a possible NukeFire session or group route.`);
      }
    }


    return {
      body,
      commands,
      reasons: [...new Set(reasons)],
      warnings: [...new Set(warnings)],
      notes: [...new Set(repair.notes)],
      translated: repair.repaired,
      directives
    };
  }

  function statusFrom(reasons, warnings, translated) {
    if (reasons.length > 0) return 'unsupported';
    if (warnings.length > 0) return 'warning';
    return translated ? 'translated' : 'ready';
  }

  function analyzeAlias(raw, options = {}) {
    const nameText = flattenDefinitionText(raw.first.value);
    const nameParts = nameText.split(/\s+/u).filter(Boolean);
    const reasons = [];
    const warnings = [];
    const notes = [];
    let translated = false;
    let name = normalizeAliasName(nameParts[0]);

    if (!name) reasons.push('Alias name is not compatible with NukeFire.');
    if (nameParts.length > 1) {
      const tail = nameParts.slice(1);
      if (tail.every((part) => /^%[0-9]$/u.test(part))) {
        translated = true;
        notes.push('Removed TinTin argument placeholders from the alias name; NukeFire exposes typed arguments automatically.');
      } else {
        reasons.push('Multi-word or pattern aliases need manual conversion.');
      }
    }
    if (/%(?:1[0-9]|[2-9][0-9]|\*)/u.test(nameText)) {
      reasons.push('Alias patterns using %10 through %99 or %* are not supported.');
    }

    const bodyAnalysis = analyzeBody(raw.second.value, {
      maximumLength: MAX_ALIAS_BODY
    });
    reasons.push(...bodyAnalysis.reasons);
    warnings.push(...bodyAnalysis.warnings);
    notes.push(...bodyAnalysis.notes);
    if (bodyAnalysis.translated) translated = true;
    const body = rewriteRoutingPrefixes(bodyAnalysis.body, options.commandPrefix);
    if (body !== bodyAnalysis.body) translated = true;

    const status = statusFrom(reasons, warnings, translated);
    return {
      id: raw.id,
      type: 'alias',
      directive: raw.directive,
      source: raw.source,
      startLine: raw.startLine,
      endLine: raw.endLine,
      name,
      originalName: nameText,
      body,
      priority: raw.priority,
      status,
      reasons: [...new Set(reasons)],
      warnings: [...new Set(warnings)],
      notes: [...new Set(notes)],
      selected: status === 'ready' || status === 'translated'
    };
  }

  function analyzeAction(raw, options = {}) {
    const pattern = flattenDefinitionText(raw.first.value);
    const reasons = unsupportedPatternFeatures(pattern);
    const warnings = [];
    const notes = [];
    let translated = false;
    if (!pattern) reasons.push('Action pattern is empty.');
    if (pattern.length > MAX_ACTION_PATTERN) reasons.push(`Action pattern exceeds ${MAX_ACTION_PATTERN} characters.`);

    const bodyAnalysis = analyzeBody(raw.second.value, {
      maximumLength: MAX_ACTION_COMMAND
    });
    reasons.push(...bodyAnalysis.reasons);
    warnings.push(...bodyAnalysis.warnings);
    notes.push(...bodyAnalysis.notes);
    if (bodyAnalysis.translated) translated = true;
    const command = rewriteRoutingPrefixes(bodyAnalysis.body, options.commandPrefix);
    if (command !== bodyAnalysis.body) translated = true;

    let priority = 5;
    if (raw.priority) {
      const numeric = Number(raw.priority);
      if (Number.isFinite(numeric)) {
        priority = Math.max(1, Math.min(9, Math.trunc(numeric)));
        if (numeric !== priority) {
          translated = true;
          notes.push(`Converted TinTin priority ${raw.priority} to NukeFire priority ${priority}.`);
        }
      }
    }

    const status = statusFrom(reasons, warnings, translated);
    return {
      id: raw.id,
      type: 'action',
      directive: raw.directive,
      source: raw.source,
      startLine: raw.startLine,
      endLine: raw.endLine,
      pattern,
      command,
      priority,
      enabled: false,
      status,
      reasons: [...new Set(reasons)],
      warnings: [...new Set(warnings)],
      notes: [...new Set(notes)],
      selected: status === 'ready' || status === 'translated'
    };
  }

  function summarize(items, ignoredComments, malformed, sourceTruncated) {
    const summary = {
      total: items.length,
      aliases: 0,
      actions: 0,
      ready: 0,
      translated: 0,
      warning: 0,
      unsupported: 0,
      ignoredComments,
      malformed,
      sourceTruncated: Boolean(sourceTruncated)
    };
    for (const item of items) {
      summary[item.type === 'action' ? 'actions' : 'aliases'] += 1;
      if (Object.hasOwn(summary, item.status)) summary[item.status] += 1;
    }
    return summary;
  }

  function analyzeTinTinPaste(sourceValue, options = {}) {
    const rawSource = normalizeLineEndings(sourceValue);
    const sourceTruncated = rawSource.length > MAX_SOURCE_LENGTH;
    const source = rawSource.slice(0, MAX_SOURCE_LENGTH);
    const lineStarts = buildLineStarts(source);
    const rawDefinitions = [];
    let ignoredComments = 0;
    let malformed = 0;
    let index = 0;

    while (index < source.length && rawDefinitions.length < MAX_DEFINITIONS) {
      if (source[index] !== '#') {
        index += 1;
        continue;
      }
      const directiveToken = readDirectiveName(source, index);
      if (!directiveToken.name) {
        index += 1;
        continue;
      }

      if (COMMENT_DIRECTIVES.has(directiveToken.name)) {
        ignoredComments += 1;
        const next = skipWhitespace(source, directiveToken.end);
        if (source[next] === '{') {
          const group = readBalancedGroup(source, next);
          index = group?.end || lineEnd(source, next);
          if (group?.error) malformed += 1;
        } else {
          index = lineEnd(source, directiveToken.end);
        }
        continue;
      }

      const isAlias = ALIAS_DIRECTIVES.has(directiveToken.name);
      const isAction = ACTION_DIRECTIVES.has(directiveToken.name);
      if (!isAlias && !isAction) {
        index = skipUnknownDirective(source, directiveToken.end);
        continue;
      }

      const definitionStart = index;
      const first = readArgument(source, directiveToken.end);
      if (!first || first.error) {
        malformed += 1;
        index = first?.end || lineEnd(source, directiveToken.end);
        continue;
      }
      const secondStart = skipWhitespace(source, first.end);
      const second = readArgument(source, secondStart, {
        restOfLine: source[secondStart] !== '{'
      });
      if (!second || second.error || !String(second.value || '').trim()) {
        malformed += 1;
        index = second?.end || lineEnd(source, first.end);
        continue;
      }

      const priority = consumeOptionalPriority(source, second.end);
      const definitionEnd = Math.max(second.end, priority.end || second.end);
      const startLine = lineNumberAt(lineStarts, definitionStart);
      const endLine = lineNumberAt(lineStarts, Math.max(definitionStart, definitionEnd - 1));
      rawDefinitions.push({
        id: `tintin-${rawDefinitions.length + 1}`,
        type: isAlias ? 'alias' : 'action',
        directive: directiveToken.name,
        first,
        second,
        priority: priority.value,
        source: source.slice(definitionStart, definitionEnd).trim(),
        startLine,
        endLine
      });
      index = Math.max(definitionEnd, index + 1);
    }

    const items = rawDefinitions.map((raw) => raw.type === 'alias'
      ? analyzeAlias(raw, options)
      : analyzeAction(raw, options));

    return {
      sourceLength: rawSource.length,
      parsedLength: source.length,
      items,
      summary: summarize(items, ignoredComments, malformed, sourceTruncated),
      limitReached: rawDefinitions.length >= MAX_DEFINITIONS
    };
  }

  function mergeImportSelection(analysisValue, existingValue = {}, options = {}) {
    const analysis = analysisValue && typeof analysisValue === 'object' ? analysisValue : { items: [] };
    const selectedIds = new Set(Array.isArray(options.selectedIds) ? options.selectedIds.map(String) : []);
    const useItemSelection = selectedIds.size === 0;
    const duplicatePolicy = options.duplicatePolicy === 'replace' ? 'replace' : 'keep';
    const maxAliases = Math.max(1, Math.trunc(Number(options.maxAliases) || 1024));
    const maxActions = Math.max(1, Math.trunc(Number(options.maxActions) || 256));
    const aliases = new Map();
    const actions = new Map();

    for (const record of Array.isArray(existingValue.aliases) ? existingValue.aliases : []) {
      const name = normalizeAliasName(record?.name);
      if (name && !aliases.has(name) && aliases.size < maxAliases) {
        aliases.set(name, { name, body: flattenDefinitionText(record.body), priority: Math.max(1, Math.min(9, Math.trunc(Number(record.priority) || 5))), scope: 'global' });
      }
    }
    const existingActions = existingValue.actions && typeof existingValue.actions === 'object'
      ? existingValue.actions
      : { enabled: true, definitions: [] };
    for (const record of Array.isArray(existingActions.definitions) ? existingActions.definitions : []) {
      const pattern = flattenDefinitionText(record?.pattern);
      if (pattern && !actions.has(pattern) && actions.size < maxActions) {
        actions.set(pattern, {
          pattern,
          command: flattenDefinitionText(record.command),
          priority: Math.max(1, Math.min(9, Math.trunc(Number(record.priority) || 5))),
          enabled: record.enabled !== false,
          scope: 'global'
        });
      }
    }

    const result = {
      aliases: null,
      actions: null,
      importedAliases: 0,
      importedActions: 0,
      replacedAliases: 0,
      replacedActions: 0,
      skippedDuplicates: 0,
      skippedCapacity: 0,
      skippedUnsafe: 0
    };

    for (const item of Array.isArray(analysis.items) ? analysis.items : []) {
      const selected = useItemSelection ? item.selected === true : selectedIds.has(String(item.id));
      if (!selected) continue;
      if (!['ready', 'translated', 'warning'].includes(item.status)) {
        result.skippedUnsafe += 1;
        continue;
      }

      if (item.type === 'alias') {
        const existing = aliases.has(item.name);
        if (existing && duplicatePolicy === 'keep') {
          result.skippedDuplicates += 1;
          continue;
        }
        if (!existing && aliases.size >= maxAliases) {
          result.skippedCapacity += 1;
          continue;
        }
        aliases.set(item.name, { name: item.name, body: item.body, priority: Math.max(1, Math.min(9, Math.trunc(Number(item.priority) || 5))), scope: 'global' });
        if (existing) result.replacedAliases += 1;
        else result.importedAliases += 1;
      } else if (item.type === 'action') {
        const existing = actions.has(item.pattern);
        if (existing && duplicatePolicy === 'keep') {
          result.skippedDuplicates += 1;
          continue;
        }
        if (!existing && actions.size >= maxActions) {
          result.skippedCapacity += 1;
          continue;
        }
        actions.set(item.pattern, {
          pattern: item.pattern,
          command: item.command,
          priority: item.priority,
          enabled: false,
          scope: 'global'
        });
        if (existing) result.replacedActions += 1;
        else result.importedActions += 1;
      }
    }

    result.aliases = [...aliases.values()].sort((left, right) => left.name.localeCompare(right.name));
    result.actions = {
      enabled: existingActions.enabled !== false,
      definitions: [...actions.values()].sort((left, right) =>
        left.priority - right.priority || left.pattern.localeCompare(right.pattern)
      )
    };
    return result;
  }


  const FULL_IMPORT_CATEGORIES = Object.freeze([
    'aliases', 'variables', 'functions', 'actions', 'gags',
    'highlights', 'substitutes', 'macros', 'events'
  ]);
  const FULL_IMPORT_LIMITS = Object.freeze({
    aliases: 1024,
    variables: 256,
    functions: 256,
    actions: 256,
    gags: 256,
    highlights: 256,
    substitutes: 256,
    macros: 128,
    events: 64,
    classes: 128
  });
  const FULL_IMPORT_TYPE = Object.freeze({
    aliases: 'alias', variables: 'variable', functions: 'function', actions: 'action',
    gags: 'gag', highlights: 'highlight', substitutes: 'substitution', macros: 'macro', events: 'event'
  });

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function fullImportRecords(definitions, category) {
    if (['aliases', 'variables', 'functions'].includes(category)) {
      return Array.isArray(definitions?.[category]) ? definitions[category] : [];
    }
    return Array.isArray(definitions?.[category]?.definitions)
      ? definitions[category].definitions : [];
  }

  function fullImportRecordKey(category, record = {}) {
    if (['aliases', 'variables', 'functions'].includes(category)) {
      return String(record.name || '').normalize('NFKC').trim().toLowerCase();
    }
    if (category === 'macros') return String(record.signature || record.key || '').trim().toLowerCase();
    if (category === 'events') return String(record.name || '').normalize('NFKC').trim().toUpperCase();
    return String(record.pattern || '').trim();
  }

  function fullImportDefinitionLabel(category, record = {}) {
    if (['aliases', 'variables', 'functions'].includes(category)) return String(record.name || '').trim();
    if (category === 'macros') return String(record.label || record.key || record.signature || '').trim();
    if (category === 'events') return String(record.name || '').trim();
    return String(record.pattern || '').trim();
  }

  function fullImportPreview(category, record = {}) {
    const wrap = (value) => `{${String(value ?? '')}}`;
    if (category === 'aliases') return `#alias ${wrap(record.name)} ${wrap(record.body)} ${wrap(record.priority || 5)}`;
    if (category === 'variables') return `#variable ${wrap(record.name)} ${wrap(record.value)}`;
    if (category === 'functions') return `#function ${wrap(record.name)} ${wrap(record.body)}`;
    if (category === 'actions') return `#action ${wrap(record.pattern)} ${wrap(record.command)} ${wrap(record.priority || 5)}`;
    if (category === 'gags') return `#gag ${wrap(record.pattern)}`;
    if (category === 'highlights') return `#highlight ${wrap(record.pattern)} ${wrap(record.style)} ${wrap(record.priority || 5)}`;
    if (category === 'substitutes') return `#substitute ${wrap(record.pattern)} ${wrap(record.replacement)} ${wrap(record.priority || 5)}`;
    if (category === 'macros') return `#macro ${wrap(record.key || record.label || record.signature)} ${wrap(record.command)}`;
    if (category === 'events') return `#event ${wrap(record.name)} ${wrap(record.command)}`;
    return '';
  }

  function buildTinTinScriptImportAnalysis(preparedValue = {}) {
    const prepared = preparedValue && typeof preparedValue === 'object' ? preparedValue : {};
    const definitions = prepared.definitions && typeof prepared.definitions === 'object'
      ? prepared.definitions : {};
    const items = [];
    const lineByKey = new Map();
    for (const entry of Array.isArray(prepared.loadedEntries) ? prepared.loadedEntries : []) {
      const category = String(entry?.category || '');
      const key = String(entry?.key || '');
      if (category && key) lineByKey.set(`${category}\u0000${key}`, Number(entry.line) || 0);
    }

    let serial = 0;
    for (const category of FULL_IMPORT_CATEGORIES) {
      for (const recordValue of fullImportRecords(definitions, category)) {
        const record = cloneJson(recordValue);
        const key = fullImportRecordKey(category, record);
        if (!key) continue;
        const line = lineByKey.get(`${category}\u0000${key}`) || 0;
        const notes = [];
        let status = 'ready';
        if (record.className) notes.push(`Preserves TinTin class ${record.className}.`);
        if (category === 'actions' || category === 'events') {
          status = 'translated';
          notes.push(`Imported ${FULL_IMPORT_TYPE[category]} automation is disabled until you review and enable it.`);
        }
        serial += 1;
        items.push({
          id: `tintin-full-${serial}`,
          type: FULL_IMPORT_TYPE[category],
          category,
          key,
          label: fullImportDefinitionLabel(category, record),
          preview: fullImportPreview(category, record),
          record,
          startLine: line,
          endLine: line,
          status,
          reasons: [],
          warnings: [],
          notes,
          selected: true
        });
      }
    }

    const classRecords = Array.isArray(definitions?.classes?.definitions)
      ? definitions.classes.definitions : [];
    for (const recordValue of classRecords) {
      const record = cloneJson(recordValue);
      const name = String(record?.name || '').normalize('NFKC').trim().toLowerCase();
      if (!name) continue;
      serial += 1;
      items.push({
        id: `tintin-full-${serial}`,
        type: 'class',
        category: 'classes',
        key: name,
        label: name,
        preview: `#class {${name}} {saved metadata}`,
        record,
        startLine: 0,
        endLine: 0,
        status: 'ready',
        reasons: [],
        warnings: [],
        notes: ['Preserves class metadata used by supported imported definitions.'],
        selected: true
      });
    }

    const settingMap = new Map();
    for (const change of Array.isArray(prepared.settingChanges) ? prepared.settingChanges : []) {
      let key = '';
      let label = '';
      let preview = '';
      if (change.kind === 'category-toggle') {
        key = `category:${change.category}`;
        label = `${change.category} ${change.enabled ? 'enabled' : 'disabled'}`;
        preview = `#${change.category} {${change.enabled ? 'on' : 'off'}}`;
      } else if (change.kind === 'config') {
        key = `config:${change.key}`;
        label = change.key === 'speedwalk' ? 'Speedwalk setting' : `Config ${change.key}`;
        preview = change.key === 'speedwalk'
          ? `#config {speedwalk} {${change.value ? 'on' : 'off'}}`
          : `#config {${change.key}} {${String(change.value)}}`;
      }
      if (!key) continue;
      settingMap.set(key, { ...change, itemKey: key, label, preview });
    }
    for (const change of settingMap.values()) {
      serial += 1;
      items.push({
        id: `tintin-full-${serial}`,
        type: 'setting',
        category: 'settings',
        key: change.itemKey,
        label: change.label,
        preview: change.preview,
        change: cloneJson(change),
        startLine: Number(change.line) || 0,
        endLine: Number(change.line) || 0,
        status: 'ready', reasons: [], warnings: [],
        notes: ['Maps this TinTin setting to the equivalent NukeFire session setting.'],
        selected: true
      });
    }

    const activeChanges = (Array.isArray(prepared.classChanges) ? prepared.classChanges : [])
      .filter((entry) => ['activate', 'deactivate'].includes(String(entry?.operation || '')));
    if (activeChanges.length > 0) {
      serial += 1;
      items.push({
        id: `tintin-full-${serial}`,
        type: 'setting',
        category: 'settings',
        key: 'classes:activeStack',
        label: 'Active TinTin classes',
        preview: `Active classes: ${(definitions?.classes?.activeStack || []).join(', ') || 'none'}`,
        change: { kind: 'class-active-stack', value: cloneJson(definitions?.classes?.activeStack || []) },
        startLine: Number(activeChanges.at(-1)?.line) || 0,
        endLine: Number(activeChanges.at(-1)?.line) || 0,
        status: 'warning', reasons: [],
        warnings: ['This changes which imported TinTin classes are active immediately after import.'],
        notes: [], selected: false
      });
    }

    const includeKeys = new Set();
    for (const entry of Array.isArray(prepared.scriptIncludes) ? prepared.scriptIncludes : []) {
      const requested = String(entry?.requested || '').normalize('NFKC').trim();
      const key = requested.toLowerCase();
      if (!requested || includeKeys.has(key)) continue;
      includeKeys.add(key);
      serial += 1;
      items.push({
        id: `tintin-full-${serial}`,
        type: 'script include', category: 'includes', key,
        label: requested, preview: `#read {${requested}}`, requested,
        startLine: Number(entry?.line) || 0, endLine: Number(entry?.line) || 0,
        status: 'ready', reasons: [], warnings: [],
        notes: ['Preserved in the destination script. Paste review does not execute nested files; included files are checked separately after the destination itself is saved.'],
        selected: true
      });
    }

    for (const entry of Array.isArray(prepared.compatibilityNoops) ? prepared.compatibilityNoops : []) {
      serial += 1;
      items.push({
        id: `tintin-full-${serial}`,
        type: 'compatibility', category: 'skipped', key: `noop:${serial}`,
        label: `#${String(entry?.directive || 'command')}`,
        preview: String(entry?.detail || ''), startLine: Number(entry?.line) || 0, endLine: Number(entry?.line) || 0,
        status: 'skipped', reasons: [], warnings: [],
        notes: ['Recognized compatibility command; no persistent definition is needed in NukeFire.'], selected: false
      });
    }
    for (const entry of Array.isArray(prepared.runtimeCommands) ? prepared.runtimeCommands : []) {
      serial += 1;
      const preserve = entry?.persistOnImport === true;
      items.push({
        id: `tintin-full-${serial}`,
        type: preserve ? 'load command' : 'runtime',
        category: preserve ? 'loadCommands' : 'skipped',
        key: preserve ? `load:${String(entry?.command || '').trim().toLowerCase()}` : `runtime:${serial}`,
        label: entry?.directive === 'ticker' ? '#ticker' : `#${String(entry?.directive || 'command')}`,
        preview: String(entry?.command || ''),
        command: preserve ? String(entry?.command || '').trim() : undefined,
        startLine: Number(entry?.line) || 0, endLine: Number(entry?.line) || 0,
        status: preserve ? 'warning' : 'skipped', reasons: [],
        warnings: preserve ? ['Saved into the destination file but never executed merely because text was pasted. It runs only when that script is intentionally #READ.'] : [],
        notes: preserve
          ? ['Safe load-time compatibility command preserved for the resulting script.']
          : ['Paste import never executes top-level runtime commands. Use #READ when you intentionally want load-time runtime behavior.'],
        selected: preserve
      });
    }
    for (const entry of Array.isArray(prepared.routedCommands) ? prepared.routedCommands : []) {
      serial += 1;
      items.push({
        id: `tintin-full-${serial}`,
        type: 'session route', category: 'skipped', key: `route:${serial}`,
        label: `${entry?.target || 'session'}: #${String(entry?.directive || 'command')}`,
        preview: String(entry?.command || entry?.detail || ''), startLine: Number(entry?.line) || 0, endLine: Number(entry?.line) || 0,
        status: 'skipped', reasons: [], warnings: [],
        notes: ['Named-session routing is intentionally not executed by paste import. File-based #READ keeps its transactional multi-session behavior.'], selected: false
      });
    }
    for (const entry of Array.isArray(prepared.unsupported) ? prepared.unsupported : []) {
      serial += 1;
      items.push({
        id: `tintin-full-${serial}`,
        type: 'command', category: 'unsupported', key: `unsupported:${serial}`,
        label: `#${String(entry?.directive || 'unknown')}`,
        preview: String(entry?.detail || ''), startLine: Number(entry?.line) || 0, endLine: Number(entry?.line) || 0,
        status: 'unsupported',
        reasons: [`TinTin #${String(entry?.directive || 'unknown')} is not supported by the current NukeFire compatibility layer.`],
        warnings: [], notes: [], selected: false
      });
    }
    for (const message of Array.isArray(prepared.errors) ? prepared.errors : []) {
      serial += 1;
      items.push({
        id: `tintin-full-${serial}`,
        type: 'parse error', category: 'unsupported', key: `error:${serial}`,
        label: 'TinTin parse error', preview: String(message || ''), startLine: 0, endLine: 0,
        status: 'unsupported', reasons: [String(message || 'TinTin script could not be parsed.')], warnings: [], notes: [], selected: false
      });
    }

    const summary = {
      total: items.length,
      definitions: items.filter((item) => FULL_IMPORT_CATEGORIES.includes(item.category) || item.category === 'classes').length,
      aliases: items.filter((item) => item.category === 'aliases').length,
      variables: items.filter((item) => item.category === 'variables').length,
      functions: items.filter((item) => item.category === 'functions').length,
      actions: items.filter((item) => item.category === 'actions').length,
      gags: items.filter((item) => item.category === 'gags').length,
      highlights: items.filter((item) => item.category === 'highlights').length,
      substitutes: items.filter((item) => item.category === 'substitutes').length,
      macros: items.filter((item) => item.category === 'macros').length,
      events: items.filter((item) => item.category === 'events').length,
      classes: items.filter((item) => item.category === 'classes').length,
      settings: items.filter((item) => item.category === 'settings').length,
      includes: items.filter((item) => item.category === 'includes').length,
      loadCommands: items.filter((item) => item.category === 'loadCommands').length,
      ready: items.filter((item) => item.status === 'ready').length,
      translated: items.filter((item) => item.status === 'translated').length,
      warning: items.filter((item) => item.status === 'warning').length,
      skipped: items.filter((item) => item.status === 'skipped').length,
      unsupported: items.filter((item) => item.status === 'unsupported').length,
      ignoredComments: Number(prepared.comments) || 0,
      malformed: Array.isArray(prepared.errors) ? prepared.errors.length : 0,
      sourceTruncated: false
    };
    return {
      ok: prepared.ok !== false,
      items,
      summary,
      commandCharacter: prepared.commandCharacter || '#',
      replacedWithinPaste: Number(prepared.replaced?.withinFile) || 0
    };
  }

  function normalizeFullImportSnapshot(input = {}) {
    const source = input && typeof input === 'object' ? cloneJson(input) : {};
    return {
      aliases: Array.isArray(source.aliases) ? source.aliases : [],
      variables: Array.isArray(source.variables) ? source.variables : [],
      functions: Array.isArray(source.functions) ? source.functions : [],
      actions: source.actions && typeof source.actions === 'object' ? source.actions : { enabled: true, definitions: [] },
      gags: source.gags && typeof source.gags === 'object' ? source.gags : { enabled: true, definitions: [] },
      highlights: source.highlights && typeof source.highlights === 'object' ? source.highlights : { enabled: true, definitions: [] },
      substitutes: source.substitutes && typeof source.substitutes === 'object' ? source.substitutes : { enabled: true, definitions: [] },
      macros: source.macros && typeof source.macros === 'object' ? source.macros : { enabled: true, definitions: [] },
      events: source.events && typeof source.events === 'object' ? source.events : { enabled: true, definitions: [] },
      config: {
        logMode: ['plain', 'raw'].includes(String(source.config?.logMode || '').toLowerCase()) ? String(source.config.logMode).toLowerCase() : 'plain',
        commandEcho: source.config?.commandEcho === true,
        verbatim: source.config?.verbatim === true,
        repeatChar: [...String(source.config?.repeatChar || '!')][0] || '!',
        repeatEnter: source.config?.repeatEnter === true,
        verbatimChar: [...String(source.config?.verbatimChar || '\\')][0] || '\\',
        historySize: Number.isSafeInteger(Number(source.config?.historySize)) ? Number(source.config.historySize) : 2000,
        bufferSize: Number.isSafeInteger(Number(source.config?.bufferSize)) ? Number(source.config.bufferSize) : 5000
      },
      classes: source.classes && typeof source.classes === 'object' ? source.classes : { activeStack: [], definitions: [] },
      speedwalk: source.speedwalk && typeof source.speedwalk === 'object' ? source.speedwalk : { enabled: true },
      profile: source.profile && typeof source.profile === 'object' ? source.profile : { requested: '', filename: '', loaded: false }
    };
  }

  function mergeTinTinScriptImportSelection(analysisValue, existingValue = {}, options = {}) {
    const analysis = analysisValue && typeof analysisValue === 'object' ? analysisValue : { items: [] };
    const selectedIds = new Set(Array.isArray(options.selectedIds) ? options.selectedIds.map(String) : []);
    const useItemSelection = selectedIds.size === 0;
    const duplicatePolicy = options.duplicatePolicy === 'replace' ? 'replace' : 'keep';
    const snapshot = normalizeFullImportSnapshot(existingValue);
    const result = {
      definitions: snapshot,
      importedByCategory: Object.fromEntries([...FULL_IMPORT_CATEGORIES, 'classes', 'settings', 'includes', 'loadCommands'].map((key) => [key, 0])),
      replacedByCategory: Object.fromEntries([...FULL_IMPORT_CATEGORIES, 'classes', 'settings', 'includes', 'loadCommands'].map((key) => [key, 0])),
      importedTotal: 0,
      replacedTotal: 0,
      skippedDuplicates: 0,
      skippedCapacity: 0,
      skippedUnsafe: 0,
      selectedItems: []
    };

    const containers = {};
    for (const category of FULL_IMPORT_CATEGORIES) {
      const records = fullImportRecords(snapshot, category);
      containers[category] = new Map(records.map((record) => [fullImportRecordKey(category, record), cloneJson(record)]));
    }
    const classMap = new Map((Array.isArray(snapshot.classes?.definitions) ? snapshot.classes.definitions : [])
      .map((record) => [String(record?.name || '').normalize('NFKC').trim().toLowerCase(), cloneJson(record)])
      .filter(([key]) => key));
    const includeSet = new Set((Array.isArray(options.existingIncludes) ? options.existingIncludes : [])
      .map((value) => String(value || '').normalize('NFKC').trim().toLowerCase())
      .filter(Boolean));
    const loadCommandSet = new Set((Array.isArray(options.existingLoadCommands) ? options.existingLoadCommands : [])
      .map((value) => String(value || '').normalize('NFKC').trim().toLowerCase())
      .filter(Boolean));

    for (const item of Array.isArray(analysis.items) ? analysis.items : []) {
      const selected = useItemSelection ? item.selected === true : selectedIds.has(String(item.id));
      if (!selected) continue;
      if (!['ready', 'translated', 'warning'].includes(item.status)) {
        result.skippedUnsafe += 1;
        continue;
      }

      if (FULL_IMPORT_CATEGORIES.includes(item.category)) {
        const category = item.category;
        const key = String(item.key || fullImportRecordKey(category, item.record));
        if (!key || !item.record) {
          result.skippedUnsafe += 1;
          continue;
        }
        const map = containers[category];
        const existing = map.has(key);
        if (existing && duplicatePolicy === 'keep') {
          result.skippedDuplicates += 1;
          continue;
        }
        const limit = Math.max(1, Math.trunc(Number(options.limits?.[category]) || FULL_IMPORT_LIMITS[category]));
        if (!existing && map.size >= limit) {
          result.skippedCapacity += 1;
          continue;
        }
        const record = cloneJson(item.record);
        if (category === 'actions' || category === 'events') record.enabled = false;
        map.set(key, record);
        result.selectedItems.push({ ...item, record: cloneJson(record) });
        if (existing) {
          result.replacedByCategory[category] += 1;
          result.replacedTotal += 1;
        } else {
          result.importedByCategory[category] += 1;
          result.importedTotal += 1;
        }
        continue;
      }

      if (item.category === 'includes') {
        const requested = String(item.requested || item.label || '').normalize('NFKC').trim();
        const key = String(item.key || requested).toLowerCase();
        if (!requested || !key) {
          result.skippedUnsafe += 1;
          continue;
        }
        if (includeSet.has(key)) {
          result.skippedDuplicates += 1;
          continue;
        }
        includeSet.add(key);
        result.selectedItems.push({ ...cloneJson(item), requested });
        result.importedByCategory.includes += 1;
        result.importedTotal += 1;
        continue;
      }

      if (item.category === 'loadCommands') {
        const command = String(item.command || item.preview || '').normalize('NFKC').trim();
        const key = command.toLowerCase();
        if (!command || !key) {
          result.skippedUnsafe += 1;
          continue;
        }
        if (loadCommandSet.has(key)) {
          result.skippedDuplicates += 1;
          continue;
        }
        loadCommandSet.add(key);
        result.selectedItems.push({ ...cloneJson(item), command });
        result.importedByCategory.loadCommands += 1;
        result.importedTotal += 1;
        continue;
      }

      if (item.category === 'classes' && item.record) {
        const key = String(item.key || item.record?.name || '').normalize('NFKC').trim().toLowerCase();
        if (!key) {
          result.skippedUnsafe += 1;
          continue;
        }
        const existing = classMap.has(key);
        if (existing && duplicatePolicy === 'keep') {
          result.skippedDuplicates += 1;
          continue;
        }
        if (!existing && classMap.size >= FULL_IMPORT_LIMITS.classes) {
          result.skippedCapacity += 1;
          continue;
        }
        classMap.set(key, cloneJson(item.record));
        result.selectedItems.push(cloneJson(item));
        if (existing) { result.replacedByCategory.classes += 1; result.replacedTotal += 1; }
        else { result.importedByCategory.classes += 1; result.importedTotal += 1; }
        continue;
      }

      if (item.category === 'settings' && item.change) {
        const change = item.change;
        if (change.kind === 'category-toggle' && snapshot[change.category] && typeof snapshot[change.category] === 'object') {
          snapshot[change.category].enabled = change.enabled === true;
        } else if (change.kind === 'config') {
          if (change.key === 'speedwalk') snapshot.speedwalk = { enabled: change.value === true };
          else if (change.key === 'logMode') snapshot.config.logMode = ['plain', 'raw'].includes(String(change.value || '').toLowerCase()) ? String(change.value).toLowerCase() : snapshot.config.logMode;
          else if (change.key === 'commandEcho') snapshot.config.commandEcho = change.value === true;
          else if (change.key === 'verbatim') snapshot.config.verbatim = change.value === true;
          else if (change.key === 'repeatEnter') snapshot.config.repeatEnter = change.value === true;
          else if (change.key === 'repeatChar') snapshot.config.repeatChar = [...String(change.value || snapshot.config.repeatChar || '!')][0] || '!';
          else if (change.key === 'verbatimChar') snapshot.config.verbatimChar = [...String(change.value || snapshot.config.verbatimChar || '\\')][0] || '\\';
          else if (change.key === 'historySize' && Number.isSafeInteger(Number(change.value))) snapshot.config.historySize = Number(change.value);
          else if (change.key === 'bufferSize' && Number.isSafeInteger(Number(change.value))) snapshot.config.bufferSize = Number(change.value);
          else { result.skippedUnsafe += 1; continue; }
        } else if (change.kind === 'class-active-stack') {
          snapshot.classes.activeStack = Array.isArray(change.value) ? cloneJson(change.value) : [];
        } else {
          result.skippedUnsafe += 1;
          continue;
        }
        result.selectedItems.push(cloneJson(item));
        result.importedByCategory.settings += 1;
        result.importedTotal += 1;
      }
    }

    for (const category of FULL_IMPORT_CATEGORIES) {
      const records = [...containers[category].values()];
      if (['aliases', 'variables', 'functions'].includes(category)) snapshot[category] = records;
      else snapshot[category].definitions = records;
    }
    snapshot.classes.definitions = [...classMap.values()];
    result.definitions = snapshot;
    return result;
  }

  return {
    analyzeTinTinPaste,
    mergeImportSelection,
    buildTinTinScriptImportAnalysis,
    mergeTinTinScriptImportSelection,
    fullImportRecordKey,
    FULL_IMPORT_CATEGORIES,
    FULL_IMPORT_LIMITS,
    splitTopLevelCommands,
    inspectTopLevelCommands,
    repairSimpleUnterminatedDoubleQuotes,
    normalizeAliasName,
    MAX_SOURCE_LENGTH,
    MAX_DEFINITIONS,
    MAX_COMMANDS
  };
});
