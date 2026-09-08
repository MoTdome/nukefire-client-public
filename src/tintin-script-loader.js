'use strict';

(function exposeTinTinScriptLoader(root, factory) {
  const parser = typeof module === 'object' && module.exports
    ? require('./client-command-parser')
    : root?.NukeFireClientCommands;
  const highlights = typeof module === 'object' && module.exports
    ? require('./highlight-engine')
    : root?.NukeFireHighlights;
  const substitutes = typeof module === 'object' && module.exports
    ? require('./substitute-engine')
    : root?.NukeFireSubstitutes;
  const macros = typeof module === 'object' && module.exports
    ? require('./macro-engine')
    : root?.NukeFireMacros;
  const api = factory(parser || {}, highlights || {}, substitutes || {}, macros || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireTinTinScriptLoader = api;
})(typeof window !== 'undefined' ? window : globalThis, function createTinTinScriptLoader(parserApi, highlightApi, substituteApi, macroApi) {
  const MAX_SOURCE_LENGTH = 2_000_000;
  const MAX_DEFINITIONS = 10_000;
  const SUPPORTED_EVENT_NAMES = new Set(['SESSION CONNECTED', 'SESSION ACTIVATED', 'SESSION DEACTIVATED', 'SESSION DISCONNECTED', 'SESSION TIMED OUT', 'RECEIVED INPUT', 'RECEIVED LINE', 'RECEIVED OUTPUT', 'RECEIVED PROMPT', 'SEND OUTPUT', 'SECOND', 'MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR', 'PROGRAM START', 'PROGRAM TERMINATION', 'SCREEN RESIZE', 'END OF PATH', 'MAP ENTER MAP', 'MAP ENTER ROOM', 'MAP EXIT MAP', 'MAP EXIT ROOM', 'IAC WILL GMCP']);
  const SUPPORTED_EVENT_PREFIXES = ['IAC ', 'VARIABLE UPDATE ', 'MAP ENTER ROOM ', 'MAP EXIT ROOM ', 'SECOND ', 'MINUTE ', 'HOUR ', 'DAY ', 'WEEK ', 'MONTH ', 'YEAR ', 'DATE ', 'TIME '];
  function isSupportedEventName(value) {
    const name = normalizeEventName(value);
    return Boolean(name) && (SUPPORTED_EVENT_NAMES.has(name) || SUPPORTED_EVENT_PREFIXES.some((prefix) => name.startsWith(prefix)));
  }
  const LIMITS = Object.freeze({
    aliases: 1024,
    variables: 2048,
    functions: 256,
    actions: 1024,
    gags: 256,
    highlights: 256,
    substitutes: 256,
    macros: 128,
    tabs: 1024,
    events: 64
  });
  const REQUIRED_ARGUMENTS = Object.freeze({
    alias: 2, al: 2,
    variable: 2, var: 2,
    function: 2, fun: 2,
    action: 2, act: 2, ac: 2,
    gag: 1,
    highlight: 2, high: 2,
    substitute: 2, sub: 2,
    macro: 2, mac: 2,
    tab: 1,
    event: 2,
    class: 2,
    actions: 1, gags: 1, highlights: 1, substitutes: 1, macros: 1
  });
  const CATEGORY_FOR_DIRECTIVE = Object.freeze({
    alias: 'aliases', al: 'aliases',
    variable: 'variables', var: 'variables',
    function: 'functions', fun: 'functions',
    action: 'actions', act: 'actions', ac: 'actions',
    gag: 'gags',
    highlight: 'highlights', high: 'highlights',
    substitute: 'substitutes', sub: 'substitutes',
    macro: 'macros', mac: 'macros',
    tab: 'tabs',
    event: 'events'
  });
  const TOGGLE_CATEGORY_FOR_DIRECTIVE = Object.freeze({
    actions: 'actions', gags: 'gags', highlights: 'highlights',
    substitutes: 'substitutes', macros: 'macros'
  });
  const DISPLAY_NAMES = Object.freeze({
    aliases: 'ALIASES', variables: 'VARIABLES', functions: 'FUNCTIONS', actions: 'ACTIONS', gags: 'GAGS',
    highlights: 'HIGHLIGHTS', substitutes: 'SUBSTITUTIONS', macros: 'MACROS', tabs: 'TABS', events: 'EVENTS'
  });
  const SUPPORTED_PREFIXES = new Set(['#', '~', '^', '/', '`', "'"]);
  const FORBIDDEN_NAMES = new Set(['__proto__', 'constructor', 'prototype']);
  const FORBIDDEN_ALIAS_NAME_CHARACTERS = '{}[]\\;#@"\'';
  const STRUCTURAL_REQUIRED_ARGUMENTS = Object.freeze({ event: 2, if: 2, elseif: 2, else: 1, foreach: 3, pathdir: 3 });
  const LIST_SUBCOMMANDS = Object.freeze([
    ['add','add'], ['clear','clear'], ['clr','clear'], ['create','create'], ['delete','delete'],
    ['find','find'], ['fnd','find'], ['get','get'], ['insert','insert'], ['length','size'],
    ['set','set'], ['size','size'], ['sort','sort'], ['srt','sort'], ['tokenize','tokenize']
  ]);
  const CLASS_SUBCOMMANDS = Object.freeze([
    ['open','open'], ['close','close'], ['read','read'], ['write','write'], ['kill','kill']
  ]);
  const CONFIG_KEYS = Object.freeze([
    ['auto tab','auto tab'], ['buffer size','buffer size'], ['charset','charset'], ['color patch','color patch'],
    ['connect retry','connect retry'], ['convert meta','convert meta'], ['debug telnet','debug telnet'],
    ['command color','command color'], ['command echo','command echo'], ['history size','history size'],
    ['log','log'], ['log level','log level'], ['mccp','mccp'], ['packet patch','packet patch'],
    ['repeat enter','repeat enter'], ['repeat char','repeat char'], ['scroll lock','scroll lock'],
    ['speedwalk','speedwalk'], ['tintin char','tintin char'], ['verbatim','verbatim'],
    ['verbatim char','verbatim char'], ['verbose','verbose'], ['wordwrap','wordwrap']
  ]);

  function orderedAbbreviation(value, entries, extensions = {}) {
    const token = String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/[_\s]+/gu, ' ');
    if (!token) return '';
    if (Object.prototype.hasOwnProperty.call(extensions, token)) return extensions[token];
    for (const [name, canonical] of entries) if (name.startsWith(token)) return canonical;
    return token;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeLineEndings(value) {
    return String(value ?? '').replace(/\r\n?/gu, '\n');
  }

  function detectCommandCharacter(sourceValue, fallbackValue = '#') {
    const source = normalizeLineEndings(sourceValue).replace(/^\uFEFF/u, '');
    let index = 0;
    while (index < source.length) {
      while (index < source.length && /\s/u.test(source[index])) index += 1;
      if (source.startsWith('/*', index)) {
        const close = source.indexOf('*/', index + 2);
        if (close === -1) break;
        index = close + 2;
        continue;
      }
      const character = source[index] || '';
      if (SUPPORTED_PREFIXES.has(character)) return character;
      break;
    }
    const fallback = String(fallbackValue || '');
    return SUPPORTED_PREFIXES.has(fallback) ? fallback : '#';
  }


  const REWRITABLE_SCRIPT_DIRECTIVES = new Set([
    'alias','al','unalias','unal','variable','var','unvariable','unvar','function','fun','unfunction','unfun',
    'action','act','ac','unaction','unact','gag','ungag','highlight','high','unhighlight','unhigh',
    'substitute','sub','unsubstitute','unsub','macro','mac','unmacro','unmac','event','unevent',
    'class','read','write','showme','show','sho','echo','if','elseif','else','foreach','forall','loop','while',
    'break','continue','math','replace','list','regex','delay','undelay','ticker','tick','unticker','untick',
    'config','log','snoop','session','all','group','line','send','cr','parse','switch','case','default',
    'path','pathdir','unpathdir','map','kill','killall','end','zap','commands','dirs','info','history','grep','nop','return','message','mess','ignore','buffer','cursor','split','unsplit','prompt','unprompt','tab','untab','advertise','test','local','unlocal','bell','regexp'
  ]);

  function rewriteLoadedCommandCharacter(value, sourceCharacter, targetCharacter) {
    const source = String(value ?? '');
    const from = SUPPORTED_PREFIXES.has(String(sourceCharacter || '')) ? String(sourceCharacter) : '#';
    const to = SUPPORTED_PREFIXES.has(String(targetCharacter || '')) ? String(targetCharacter) : from;
    if (!source || from === to) return source;
    let output = '';
    for (let index = 0; index < source.length;) {
      if (source[index] !== from) {
        output += source[index];
        index += 1;
        continue;
      }
      let previousIndex = index - 1;
      while (previousIndex >= 0 && /\s/u.test(source[previousIndex])) previousIndex -= 1;
      const boundary = previousIndex < 0 || source[previousIndex] === ';' || source[previousIndex] === '{' || source[previousIndex] === '}';
      if (!boundary || source[index + 1] === from) {
        output += source[index];
        index += 1;
        continue;
      }
      const rest = source.slice(index + 1);
      const token = rest.match(/^(?:[A-Za-z][A-Za-z0-9_-]*|[0-9]+|[%$][A-Za-z0-9_]+)/u)?.[0] || '';
      const normalized = token.toLowerCase();
      const resolved = typeof parserApi.resolveTinTinCommandDirective === 'function'
        ? parserApi.resolveTinTinCommandDirective(normalized)
        : normalized;
      const dynamicRepeat = /^[0-9]+$/u.test(token) || /^[%$][A-Za-z0-9_]+$/u.test(token);
      if (dynamicRepeat || REWRITABLE_SCRIPT_DIRECTIVES.has(normalized) || REWRITABLE_SCRIPT_DIRECTIVES.has(resolved)) output += to;
      else output += from;
      index += 1;
    }
    return output;
  }

  function canonicalRuntimeCommand(value, sourceCharacter, targetCharacter) {
    const rewritten = rewriteLoadedCommandCharacter(value, sourceCharacter, targetCharacter);
    const prefix = SUPPORTED_PREFIXES.has(String(targetCharacter || '')) ? String(targetCharacter) : String(sourceCharacter || '#');
    const parsed = typeof parserApi.firstDirective === 'function' ? parserApi.firstDirective(rewritten, prefix) : null;
    if (!parsed?.directive) return rewritten;
    if (parsed.directive === 'ticker' || parsed.directive === 'unticker') {
      return `${prefix}${parsed.directive}${parsed.body ? ` ${parsed.body}` : ''}`;
    }
    return rewritten;
  }

  function quoteCanOpen(source, index, character, commandCharacter = '') {
    if (character === '"') return true;
    if (character !== "'") return false;
    if (character === commandCharacter) {
      const lineStart = source.lastIndexOf('\n', Math.max(0, index - 1)) + 1;
      if (!source.slice(lineStart, index).trim()) return false;
    }
    const previous = source[index - 1] || '';
    return (!previous || /[\s({\[]/u.test(previous)) && source.indexOf("'", index + 1) !== -1;
  }

  function normalizeName(value, options = {}) {
    const source = String(value ?? '').normalize('NFKC').trim().toLowerCase();
    if (!source || source.length > 48 || FORBIDDEN_NAMES.has(source)) return '';
    const expression = options.mustStartLetter
      ? /^[a-z][a-z0-9_-]*$/u
      : /^[a-z0-9][a-z0-9_-]*$/u;
    return expression.test(source) ? source : '';
  }

  function normalizeAliasName(value) {
    const source = String(value ?? '')
      .normalize('NFKC')
      .trim()
      .replace(/\s+/gu, ' ');
    const folded = source.toLowerCase();
    if (!source || source.length > 48 || FORBIDDEN_NAMES.has(folded)) return '';
    if ((source.includes('^') && !source.startsWith('^'))
      || source.slice(1).includes('^')
      || source.slice(0, -1).includes('$')) return '';
    if ([...source].some((character) => {
      const code = character.codePointAt(0);
      return code < 32 || code === 127 || FORBIDDEN_ALIAS_NAME_CHARACTERS.includes(character);
    })) return '';
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

  function normalizeFunctionName(value) {
    const source = String(value ?? '').normalize('NFKC').trim().toLowerCase();
    if (!source || source.length > 48 || FORBIDDEN_NAMES.has(source)) return '';
    return /^[a-z][a-z0-9_]*$/u.test(source) ? source : '';
  }

  function normalizeVariableName(value) {
    const source = String(value ?? '').normalize('NFKC').trim().toLowerCase();
    if (!source || source.length > 96 || FORBIDDEN_NAMES.has(source)) return '';
    if (!source.includes('[') && !source.includes(']')) {
      return /[\u0000-\u001F\u007F{}\\;$%]/u.test(source) ? '' : source;
    }
    const baseMatch = source.match(/^([a-z_][a-z0-9_]*)/u);
    if (!baseMatch || FORBIDDEN_NAMES.has(baseMatch[1])) return '';
    let index = baseMatch[1].length;
    let depth = 0;
    while (index < source.length) {
      if (source[index] !== '[') return '';
      const closing = source.indexOf(']', index + 1);
      if (closing === -1) return '';
      const key = source.slice(index + 1, closing).trim();
      if (!key || /[\u0000-\u001F\u007F{}\[\]\\;$%]/u.test(key)) return '';
      depth += 1;
      if (depth > 4) return '';
      index = closing + 1;
    }
    return source;
  }

  function parseBraceChunks(value) {
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
        } else chunk += character;
        index += 1;
      }
      if (depth !== 0) return null;
      chunks.push(chunk);
    }
    return chunks;
  }

  function flattenTableEntries(baseValue, literalValue, depth = 0) {
    const base = normalizeVariableName(baseValue);
    if (!base || depth > 3) return null;
    const chunks = parseBraceChunks(literalValue);
    if (!chunks || chunks.length === 0 || chunks.length % 2 !== 0) return null;
    const records = [];
    for (let index = 0; index < chunks.length; index += 2) {
      const key = String(chunks[index] || '').normalize('NFKC').trim().toLowerCase();
      const name = normalizeVariableName(`${base}[${key}]`);
      if (!name) return null;
      const rawValue = chunks[index + 1];
      const nested = depth < 3 && String(rawValue || '').trim().startsWith('{')
        ? flattenTableEntries(name, rawValue, depth + 1)
        : null;
      if (nested?.length) records.push(...nested);
      else records.push({ name, value: flatten(rawValue, 4096) });
    }
    return records;
  }

  function normalizeClassName(value) {
    return normalizeName(value);
  }

  function flatten(value, maximum) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\r\n\t ]+/gu, ' ')
      .trim()
      .slice(0, maximum);
  }

  function nextTinTinCharacter(value, prefix) {
    const info = directiveInfo(value, prefix);
    if (info.directive !== 'config') return '';
    const parsed = tokenizeArguments(info.body);
    if (parsed.error) return '';
    const key = orderedAbbreviation(parsed.tokens[0], CONFIG_KEYS);
    if (key !== 'tintin char') return '';
    const character = [...String(parsed.tokens.slice(1).join(' ') || '')][0] || '';
    return SUPPORTED_PREFIXES.has(character) ? character : '';
  }

  function stripComments(sourceValue, commandCharacterValue = '') {
    const source = normalizeLineEndings(sourceValue);
    const commandCharacter = detectCommandCharacter(source, commandCharacterValue);
    let activeCommandCharacter = commandCharacter;
    let output = '';
    let current = '';
    let quote = '';
    let escaped = false;
    let comment = false;
    let comments = 0;
    let depth = 0;

    const commit = () => {
      const changed = nextTinTinCharacter(current.trim(), activeCommandCharacter);
      current = '';
      if (changed) activeCommandCharacter = changed;
    };

    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      const next = source[index + 1] || '';
      if (comment) {
        if (character === '*' && next === '/') {
          output += '  ';
          current += '  ';
          index += 1;
          comment = false;
          continue;
        }
        const replacement = character === '\n' ? '\n' : ' ';
        output += replacement;
        current += replacement;
        if (character === '\n' && depth === 0 && !quote) commit();
        continue;
      }
      if (escaped) {
        output += character;
        current += character;
        escaped = false;
        continue;
      }
      if (character === '\\') {
        output += character;
        current += character;
        escaped = true;
        continue;
      }
      if (quote) {
        output += character;
        current += character;
        if (character === quote) quote = '';
        continue;
      }
      if (depth === 0 && quoteCanOpen(source, index, character, activeCommandCharacter)) {
        output += character;
        current += character;
        quote = character;
        continue;
      }
      if (character === '/' && next === '*') {
        output += '  ';
        current += '  ';
        index += 1;
        comment = true;
        comments += 1;
        continue;
      }
      if (character === '{') depth += 1;
      else if (character === '}' && depth > 0) depth -= 1;
      output += character;
      if (depth === 0 && character === ';') {
        commit();
        continue;
      }
      if (depth === 0 && character === '\n') {
        commit();
        continue;
      }
      current += character;
    }
    if (current.trim()) commit();
    return comment
      ? { ok: false, value: output, comments, error: 'TinTin script has an unterminated /* comment */.' }
      : { ok: true, value: output, comments, error: '' };
  }

  function directiveInfo(segmentValue, commandCharacter) {
    const segment = String(segmentValue || '').trimStart();
    if (!segment.startsWith(commandCharacter)) return { raw: '', directive: '', body: '' };
    const afterPrefix = segment.slice(commandCharacter.length);
    const match = afterPrefix.match(/^([A-Za-z]+)/u);
    if (!match) return { raw: '', directive: '', body: '' };
    const raw = match[1].toLowerCase();
    const directive = typeof parserApi.resolveTinTinCommandDirective === 'function'
      ? parserApi.resolveTinTinCommandDirective(raw)
      : (typeof parserApi.canonicalClientDirective === 'function' ? parserApi.canonicalClientDirective(raw) : raw);
    return { raw, directive, body: afterPrefix.slice(match[0].length) };
  }

  function directiveName(segmentValue, commandCharacter) {
    return directiveInfo(segmentValue, commandCharacter).directive;
  }

  function directiveBody(segmentValue, commandCharacter) {
    return directiveInfo(segmentValue, commandCharacter).body;
  }

  function decodeBracedToken(value) {
    const source = String(value ?? '');
    let output = '';
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      const next = source[index + 1] || '';
      if (character === '\\' && ['\\', '{', '}', '"', "'"].includes(next)) {
        output += next;
        index += 1;
      } else {
        output += character;
      }
    }
    return output;
  }

  function tokenizeArguments(bodyValue) {
    const source = String(bodyValue ?? '');
    const tokens = [];
    let index = 0;
    while (index < source.length) {
      while (index < source.length && /\s/u.test(source[index])) index += 1;
      if (index >= source.length) break;
      if (source[index] !== '{') {
        let end = index;
        let bracketDepth = 0;
        let escaped = false;
        while (end < source.length) {
          const character = source[end];
          if (escaped) {
            escaped = false;
            end += 1;
            continue;
          }
          if (character === '\\') {
            escaped = true;
            end += 1;
            continue;
          }
          if (character === '[') bracketDepth += 1;
          else if (character === ']' && bracketDepth > 0) bracketDepth -= 1;
          else if (/\s/u.test(character) && bracketDepth === 0) break;
          end += 1;
        }
        if (bracketDepth !== 0) return { tokens: [], error: 'TinTin script has an unterminated bracketed variable path.' };
        tokens.push(source.slice(index, end));
        index = end;
        continue;
      }
      const start = index;
      let depth = 0;
      let quote = '';
      let escaped = false;
      for (; index < source.length; index += 1) {
        const character = source[index];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (character === '\\') {
          const literalBackslashToken = source[index + 1] === '}'
            && index === start + 1;
          if (!literalBackslashToken) escaped = true;
          continue;
        }
        if (quote) {
          if (character === quote) quote = '';
          continue;
        }
        if (depth === 0 && quoteCanOpen(source, index, character)) {
          quote = character;
          continue;
        }
        if (character === '{') depth += 1;
        else if (character === '}') {
          depth -= 1;
          if (depth === 0) {
            tokens.push(decodeBracedToken(source.slice(start + 1, index)));
            index += 1;
            break;
          }
        }
      }
      if (depth !== 0) return { tokens: [], error: 'TinTin script has an unterminated brace group.' };
    }
    return { tokens, error: '' };
  }

  function routedDirective(segmentValue, commandCharacter) {
    const segment = String(segmentValue || '').trimStart();
    if (!segment.startsWith(commandCharacter)) return null;
    const afterPrefix = segment.slice(commandCharacter.length);
    const targetMatch = afterPrefix.match(/^([A-Za-z0-9_-]+)\s+/u);
    if (!targetMatch) return null;
    const afterTarget = afterPrefix.slice(targetMatch[0].length);
    if (!afterTarget.startsWith(commandCharacter)) return null;
    const inner = afterTarget.slice(commandCharacter.length);
    const directiveMatch = inner.match(/^([A-Za-z]+)/u);
    if (!directiveMatch) return null;
    const rawDirective = directiveMatch[1].toLowerCase();
    const innerDirective = typeof parserApi.resolveTinTinCommandDirective === 'function'
      ? parserApi.resolveTinTinCommandDirective(rawDirective)
      : (typeof parserApi.canonicalClientDirective === 'function' ? parserApi.canonicalClientDirective(rawDirective) : rawDirective);
    return {
      target: targetMatch[1],
      directive: innerDirective,
      rawDirective,
      body: inner.slice(directiveMatch[0].length)
    };
  }

  function commandNeedsContinuation(segment, commandCharacter) {
    const outerDirective = directiveName(segment, commandCharacter);
    if (outerDirective === 'nop') return false;
    const routed = routedDirective(segment, commandCharacter);
    const directive = routed?.directive || outerDirective;
    const required = REQUIRED_ARGUMENTS[directive] || STRUCTURAL_REQUIRED_ARGUMENTS[directive];
    if (!required) return false;
    const body = routed
      ? routed.body
      : directiveBody(segment, commandCharacter);
    const parsed = tokenizeArguments(body);
    return !parsed.error && parsed.tokens.length < required;
  }

  function commandAcceptsTrailingPriority(segment, commandCharacter, remainingSource) {
    const outerDirective = directiveName(segment, commandCharacter);
    const routed = routedDirective(segment, commandCharacter);
    const directive = routed?.directive || outerDirective;
    if (!['alias', 'al', 'action', 'act', 'ac', 'highlight', 'high', 'substitute', 'sub'].includes(directive)) return false;
    const required = REQUIRED_ARGUMENTS[directive] || 2;
    const body = routed
      ? routed.body
      : directiveBody(segment, commandCharacter);
    const parsed = tokenizeArguments(body);
    if (parsed.error || parsed.tokens.length !== required) return false;
    return /^\{\s*[0-9]+(?:\.[0-9]+)?\s*\}/u.test(String(remainingSource || ''));
  }

  function splitScriptCommands(sourceValue, commandCharacter) {
    const source = String(sourceValue ?? '');
    const commands = [];
    let current = '';
    let depth = 0;
    let quote = '';
    let escaped = false;
    let line = 1;
    let startLine = 1;
    let activeCommandCharacter = String(commandCharacter || '#');


    const commit = () => {
      const value = current.trim();
      current = '';
      if (!value) return;
      const usedCommandCharacter = activeCommandCharacter;
      commands.push({ value, line: startLine, commandCharacter: usedCommandCharacter });
      const changed = nextTinTinCharacter(value, usedCommandCharacter);
      if (changed) activeCommandCharacter = changed;
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
      if (depth === 0 && quoteCanOpen(source, index, character, activeCommandCharacter)) {
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
        if (depth === 0) return { ok: false, commands: [], error: `Unmatched closing brace on line ${line}.` };
        depth -= 1;
        current += character;
        continue;
      }
      if (character === ';' && depth === 0) {
        commit();
        startLine = line;
        continue;
      }
      if (character === '\n' && depth === 0) {
        let nextIndex = index + 1;
        while (nextIndex < source.length && /[\t\r\n ]/u.test(source[nextIndex])) nextIndex += 1;
        const continuesWithBrace = source[nextIndex] === '{';
        const continuationRequired = continuesWithBrace && commandNeedsContinuation(current, activeCommandCharacter);
        const trailingPriority = continuesWithBrace
          && commandAcceptsTrailingPriority(current, activeCommandCharacter, source.slice(nextIndex));
        if (continuationRequired || trailingPriority) {
          current += ' ';
        } else {
          commit();
          startLine = line + 1;
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
    return { ok: true, commands, finalCommandCharacter: activeCommandCharacter, error: '' };
  }

  function safeCommandList(value, label, options = {}) {
    const maximum = Math.max(1, Math.min(128, Math.trunc(Number(options.maxCommands) || 10)));
    const source = flatten(value, 4096);
    if (!source) return { value: '', error: `${label} cannot be empty.` };
    if (typeof parserApi.splitTopLevelCommands === 'function') {
      const parsed = parserApi.splitTopLevelCommands(source, {
        maxCommands: maximum,
        commandPrefix: options.commandPrefix,
        preserveEscapedSemicolon: true,
        quoteAware: false
      });
      if (parsed.errorCode) return { value: '', error: `${label} has invalid or excessive command separators.` };
      const rewritten = parsed.commands.map((entry) => rewriteLoadedCommandCharacter(entry, options.commandPrefix, options.targetCommandPrefix || options.commandPrefix));
      return { value: rewritten.join('; '), error: '' };
    }
    const commands = source.split(';').map((entry) => entry.trim()).filter(Boolean);
    return commands.length > maximum
      ? { value: '', error: `${label} may contain at most ${maximum} commands.` }
      : { value: commands.join('; '), error: '' };
  }

  function safeFunctionBody(value, commandCharacter = '', targetCommandCharacter = commandCharacter) {
    const source = flatten(value, 16_384);
    if (!source) return { value: '', error: 'Function body cannot be empty.' };
    if (typeof parserApi.splitTopLevelCommands === 'function') {
      const parsed = parserApi.splitTopLevelCommands(source, { maxCommands: 64, preserveEscapedSemicolon: true, commandPrefix: commandCharacter, quoteAware: false });
      if (parsed.errorCode) return { value: '', error: 'Function body has invalid or excessive command separators.' };
      const rewritten = parsed.commands.map((entry) => rewriteLoadedCommandCharacter(entry, commandCharacter, targetCommandCharacter));
      return { value: rewritten.join('; '), error: '' };
    }
    const commands = source.split(';').map((entry) => entry.trim()).filter(Boolean);
    return commands.length > 64
      ? { value: '', error: 'Function body may contain at most 64 commands.' }
      : { value: commands.join('; '), error: '' };
  }

  function normalizeEventName(value) {
    const source = String(value ?? '').normalize('NFKC').trim().toUpperCase().replace(/\s+/gu, ' ');
    return source && source.length <= 160 && /^[A-Z0-9%][A-Z0-9% _.:\-]*$/u.test(source) ? source : '';
  }

  function safeEventCommand(value, commandCharacter = '', targetCommandCharacter = commandCharacter) {
    const parsed = safeFunctionBody(value, commandCharacter, targetCommandCharacter);
    return parsed;
  }

  function selectorNeedsRuntimeExpansion(value) {
    const source = String(value ?? '');
    return /(^|[^\\])(?:\$(?:\{|[A-Za-z_])|@(?:\{|[A-Za-z_]))/u.test(source);
  }

  function definitionNeedsRuntimeExpansion(category, args) {
    const minimum = category === 'gags' ? 1 : 2;
    if (!Array.isArray(args) || args.length < minimum) return false;
    if (selectorNeedsRuntimeExpansion(args[0])) return true;
    return category === 'highlights' && selectorNeedsRuntimeExpansion(args[1]);
  }

  function normalizePriority(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(1, Math.min(9, Math.trunc(numeric))) : 5;
  }

  function parseDefinition(command, commandCharacter, activeClass, targetCommandCharacter = commandCharacter) {
    const value = command.value.trim();
    if (!value.startsWith(commandCharacter)) {
      return { kind: 'plain-command', line: command.line, command: value };
    }
    const outerDirective = directiveName(value, commandCharacter);
    if (outerDirective === 'nop') return { kind: 'comment', line: command.line };
    const routed = routedDirective(value, commandCharacter);
    if (routed) {
      const innerValue = `${commandCharacter}${routed.directive}${routed.body}`;
      const innerParsed = parseDefinition({ value: innerValue, line: command.line }, commandCharacter, '');
      if (innerParsed.kind === 'error') {
        return {
          kind: 'error',
          line: command.line,
          error: `Routed ${routed.target} ${routed.directive}: ${innerParsed.error}`
        };
      }
      // A top-level one-argument #ACTION is a harmless TinTin query form, but
      // the routed-definition importer must not reinterpret an incomplete
      // routed Action as a successful no-op. Preserve the atomic route safety
      // contract: named-session definitions must be complete definitions.
      if (innerParsed.kind === 'compatibility-noop' && ['action-query', 'event-query'].includes(innerParsed.directive)) {
        return {
          kind: 'error',
          line: command.line,
          error: `Routed ${routed.target} ${routed.directive}: ${innerParsed.directive === 'event-query' ? 'event' : 'action'} needs 2 arguments.`
        };
      }
      if (['definition', 'class', 'category-toggle', 'definition-toggle'].includes(innerParsed.kind)) {
        return {
          kind: 'session-route',
          line: command.line,
          target: routed.target,
          routedDirective: routed.directive,
          command: innerValue,
          detail: value.slice(0, 240)
        };
      }
      return {
        kind: 'unsupported',
        directive: 'session-route',
        line: command.line,
        target: routed.target,
        routedDirective: routed.directive,
        detail: value.slice(0, 240)
      };
    }
    const directive = outerDirective;
    if (!directive) return { kind: 'unsupported', directive: 'unknown', line: command.line, detail: value.slice(0, 120) };
    const category = CATEGORY_FOR_DIRECTIVE[directive];
    const toggleCategory = TOGGLE_CATEGORY_FOR_DIRECTIVE[directive];
    if (directive === 'split' || directive === 'unsplit') {
      return { kind: 'compatibility-noop', directive, line: command.line, detail: 'NukeFire uses its native workspace instead of TinTin split-screen terminal regions.' };
    }
    if (directive === 'prompt' || directive === 'unprompt') {
      return { kind: 'compatibility-noop', directive, line: command.line, detail: 'NukeFire renders prompts and status surfaces natively; TinTin prompt-row decoration is not needed.' };
    }
    if (directive === 'advertise' || directive === 'test') {
      return { kind: 'compatibility-noop', directive, line: command.line, detail: directive === 'advertise' ? 'Historical TinTin startup advertisement output is intentionally omitted.' : 'TinTin internal benchmark/test output is not meaningful inside the NukeFire desktop runtime.' };
    }
    if (directive === 'mess' || directive === 'message' || directive === 'ignore') {
      return {
        kind: 'runtime-command', directive: directive === 'mess' ? 'message' : directive, line: command.line,
        command: rewriteLoadedCommandCharacter(value, commandCharacter, targetCommandCharacter),
        persistOnImport: true
      };
    }
    if (directive === 'pathdir' || directive === 'unpathdir') {
      return {
        kind: 'runtime-command', directive, line: command.line,
        command: rewriteLoadedCommandCharacter(value, commandCharacter, targetCommandCharacter),
        persistOnImport: true
      };
    }
    if (directive === 'read') {
      const body = directiveBody(value, commandCharacter);
      const parsed = tokenizeArguments(body);
      if (parsed.error) return { kind: 'error', line: command.line, error: parsed.error };
      if (parsed.tokens.length !== 1 || !String(parsed.tokens[0] || '').trim()) {
        return { kind: 'error', line: command.line, error: 'read in a script needs exactly one script filename.' };
      }
      return {
        kind: 'script-include',
        directive: 'read',
        line: command.line,
        requested: String(parsed.tokens[0]).trim()
      };
    }
    if (directive === 'cr') {
      return { kind: 'runtime-command', directive: 'cr', line: command.line, command: rewriteLoadedCommandCharacter(value, commandCharacter, targetCommandCharacter) };
    }
    if (['ticker', 'tick', 'unticker', 'untick'].includes(directive)) {
      const canonical = directive === 'tick' ? 'ticker' : directive === 'untick' ? 'unticker' : directive;
      return {
        kind: 'runtime-command', directive: canonical, line: command.line,
        command: canonicalRuntimeCommand(value, commandCharacter, targetCommandCharacter),
        persistOnImport: true
      };
    }
    if (['regex', 'regexp', 'switch', 'math', 'format', 'replace', 'parse', 'delay', 'undelay', 'loop', 'while', 'line', 'all', 'forall', 'path', 'commands', 'dirs', 'info', 'history', 'grep', 'buffer', 'cursor', 'untab', 'zap', 'kill', 'killall'].includes(directive)) {
      return {
        kind: 'runtime-command', directive: directive === 'regexp' ? 'regex' : directive === 'killall' ? 'kill' : directive, line: command.line,
        command: rewriteLoadedCommandCharacter(value, commandCharacter, targetCommandCharacter),
        persistOnImport: true
      };
    }
    if (directive === 'config') {
      const body = directiveBody(value, commandCharacter);
      const parsed = tokenizeArguments(body);
      if (parsed.error) return { kind: 'error', line: command.line, error: parsed.error };
      const key = orderedAbbreviation(parsed.tokens[0], CONFIG_KEYS);
      const setting = String(parsed.tokens.slice(1).join(' ') || '').trim().toLowerCase();
      if (!key || !setting) return { kind: 'compatibility-noop', directive: 'config-query', line: command.line, detail: value.slice(0, 120) };
      if (key === 'auto tab') {
        const size = Number(setting);
        if (/^\d+$/u.test(setting) && Number.isSafeInteger(size) && size >= 1 && size <= 999999) return { kind: 'config', key: 'autoTab', value: size, line: command.line };
        return { kind: 'compatibility-noop', directive: 'config-auto-tab', line: command.line, detail: value.slice(0, 120) };
      }
      if (key === 'command echo') return { kind: 'config', key: 'commandEcho', value: ['on','true','1'].includes(setting), line: command.line };
      if (key === 'verbatim' && ['on','off','true','false','1','0'].includes(setting)) return { kind: 'config', key: 'verbatim', value: ['on','true','1'].includes(setting), line: command.line };
      if (key === 'history size') {
        const size = Number(setting);
        if (/^\d+$/u.test(setting) && Number.isSafeInteger(size) && size >= 0 && size <= 9999) return { kind: 'config', key: 'historySize', value: size, line: command.line };
        return { kind: 'compatibility-noop', directive: 'config-history-size', line: command.line, detail: value.slice(0, 120) };
      }
      if (key === 'buffer size') {
        const size = Number(setting);
        if (/^\d+$/u.test(setting) && Number.isSafeInteger(size) && size >= 100 && size <= 100000) return { kind: 'config', key: 'bufferSize', value: size, line: command.line };
        return { kind: 'compatibility-noop', directive: 'config-buffer-size', line: command.line, detail: value.slice(0, 120) };
      }
      if (key === 'repeat enter') {
        if (['on','off','true','false','1','0'].includes(setting)) return { kind: 'config', key: 'repeatEnter', value: ['on','true','1'].includes(setting), line: command.line };
        return { kind: 'compatibility-noop', directive: 'config-repeat-enter', line: command.line, detail: value.slice(0, 120) };
      }
      if (key === 'repeat char') {
        const character = [...String(parsed.tokens.slice(1).join(' ') || '')][0] || '';
        if (character && !/\s/u.test(character)) return { kind: 'config', key: 'repeatChar', value: character, line: command.line };
        return { kind: 'compatibility-noop', directive: 'config-repeat-char', line: command.line, detail: value.slice(0, 120) };
      }
      if (key === 'verbatim char') {
        const character = [...String(parsed.tokens.slice(1).join(' ') || '')][0] || '';
        if (character && !/\s/u.test(character)) return { kind: 'config', key: 'verbatimChar', value: character, line: command.line };
        return { kind: 'compatibility-noop', directive: 'config-verbatim-char', line: command.line, detail: value.slice(0, 120) };
      }
      if (key === 'tintin char') {
        const character = [...String(parsed.tokens.slice(1).join(' ') || '')][0] || '';
        if (!SUPPORTED_PREFIXES.has(character)) {
          return { kind: 'compatibility-noop', directive: 'config-tintin-char', line: command.line, detail: `TINTIN CHAR ${character || '<blank>'} is outside NukeFire's protected command-prefix set.` };
        }
        return {
          kind: 'command-character', directive: 'config', line: command.line,
          command: rewriteLoadedCommandCharacter(value, commandCharacter, targetCommandCharacter),
          value: character, persistOnImport: true
        };
      }
      if (key === 'speedwalk') return { kind: 'config', key: 'speedwalk', value: ['on','true','1'].includes(setting), line: command.line };
      if (key === 'log' || key === 'log mode') {
        if (['plain','raw'].includes(setting)) return { kind: 'config', key: 'logMode', value: setting, line: command.line };
        return { kind: 'compatibility-noop', directive: 'config-log', line: command.line, detail: `LOG mode ${setting.toUpperCase()} is not mapped; NukeFire supports PLAIN/RAW.` };
      }
      return { kind: 'compatibility-noop', directive: 'config', line: command.line, detail: `${key} remains owned by NukeFire Preferences/protocol policy.` };
    }
    if (directive === 'log') {
      const body = directiveBody(value, commandCharacter);
      const parsed = tokenizeArguments(body);
      if (parsed.error) return { kind: 'error', line: command.line, error: parsed.error };
      const operation = String(parsed.tokens[0] || '').trim().toLowerCase();
      if ((!operation && parsed.tokens.length === 0) || operation === 'off' || (operation === 'append' && parsed.tokens.length === 2)) {
        return { kind: 'runtime-command', directive: 'log', line: command.line, command: rewriteLoadedCommandCharacter(value, commandCharacter, targetCommandCharacter) };
      }
      return { kind: 'compatibility-noop', directive: 'log', line: command.line, detail: 'Only safe append/off logging is imported.' };
    }
    if (['if', 'foreach', 'showme', 'show', 'sho'].includes(directive)) {
      return {
        kind: 'runtime-command',
        directive: directive === 'show' || directive === 'sho' ? 'showme' : directive,
        line: command.line,
        command: rewriteLoadedCommandCharacter(value, commandCharacter, targetCommandCharacter),
        persistOnImport: true
      };
    }
    if (!category && !toggleCategory && directive !== 'class' && directive !== 'list') {
      return { kind: 'unsupported', directive, line: command.line, detail: value.slice(0, 120) };
    }
    const body = directiveBody(value, commandCharacter);
    const parsed = tokenizeArguments(body);
    if (parsed.error) return { kind: 'error', line: command.line, error: parsed.error };
    const args = parsed.tokens;

    if (category && definitionNeedsRuntimeExpansion(category, args)) {
      return {
        kind: 'runtime-command',
        directive,
        line: command.line,
        command: rewriteLoadedCommandCharacter(value, commandCharacter, targetCommandCharacter),
        persistOnImport: true
      };
    }

    if (category && args.length === 0) {
      return {
        kind: 'compatibility-noop',
        directive: `${directive}-list`,
        line: command.line,
        detail: `Zero-argument #${directive.toUpperCase()} is a source list form and creates no definition during import.`
      };
    }

    if (directive === 'event') {
      if (['enable', 'disable'].includes(String(args[0] || '').trim().toLowerCase())) {
        const operation = String(args[0] || '').trim().toLowerCase();
        const key = normalizeEventName(args.slice(1).join(' '));
        if (!key) return { kind: 'error', line: command.line, error: `event ${operation} needs a valid event name.` };
        return { kind: 'definition-toggle', category: 'events', key, enabled: operation === 'enable', line: command.line };
      }
      if (args.length === 1) {
        return {
          kind: 'compatibility-noop',
          directive: 'event-query',
          line: command.line,
          detail: 'One-argument #EVENT is a query/list form and creates no Event during import.'
        };
      }
      if (args.length !== 2) return { kind: 'error', line: command.line, error: 'event needs 2 arguments.' };
      const name = normalizeEventName(args[0]);
      const commandBody = safeEventCommand(args[1], commandCharacter, targetCommandCharacter);
      if (!name) return { kind: 'error', line: command.line, error: 'Event name is invalid.' };
      if (!isSupportedEventName(name)) return { kind: 'unsupported', directive: 'event', line: command.line, detail: `Event ${name} is not emitted by this NukeFire compatibility layer.` };
      if (commandBody.error) return { kind: 'error', line: command.line, error: commandBody.error };
      return { kind: 'definition', category: 'events', line: command.line, record: { name, command: commandBody.value, enabled: true, scope: 'global', ...(normalizeClassName(activeClass) ? { className: normalizeClassName(activeClass) } : {}) } };
    }

    if (directive === 'list') {
      const base = normalizeVariableName(args[0]);
      const operation = orderedAbbreviation(args[1], LIST_SUBCOMMANDS, { ins: 'insert', order: 'order', reverse: 'reverse' });
      if (base && !base.includes('[') && operation === 'add' && args.length >= 3) {
        return {
          kind: 'load-list-add',
          line: command.line,
          base,
          values: args.slice(2).map((entry) => flatten(entry, 4096)),
          className: normalizeClassName(activeClass)
        };
      }
      if (base && ['create','tokenize','find','delete','clear','insert','ins','order','reverse','get','set','size','sort'].includes(operation)) {
        return {
          kind: 'runtime-command', directive: 'list', line: command.line,
          command: rewriteLoadedCommandCharacter(value, commandCharacter, targetCommandCharacter),
          persistOnImport: true
        };
      }
      return { kind: 'unsupported', directive: 'list', line: command.line, detail: value.slice(0, 120) };
    }

    if (directive === 'class') {
      const className = normalizeClassName(args[0]);
      const operation = orderedAbbreviation(args[1], CLASS_SUBCOMMANDS, { activate: 'activate', deactivate: 'deactivate', clear: 'clear', load: 'load', save: 'save' });
      if (!className) return { kind: 'unsupported', directive: 'class', line: command.line, detail: value.slice(0, 120) };
      if (['read', 'write'].includes(operation) && args.length === 3) {
        return {
          kind: 'runtime-command', directive: 'class', line: command.line,
          command: rewriteLoadedCommandCharacter(value, commandCharacter, targetCommandCharacter),
          persistOnImport: true
        };
      }
      if (!['open', 'close', 'save', 'clear', 'activate', 'deactivate', 'kill'].includes(operation)) {
        return { kind: 'unsupported', directive: 'class', line: command.line, detail: value.slice(0, 120) };
      }
      return { kind: 'class', line: command.line, className, operation };
    }
    if (toggleCategory) {
      const operation = String(args[0] || '').trim().toLowerCase();
      if (!['on', 'off', 'enable', 'disable'].includes(operation)) {
        return { kind: 'unsupported', directive, line: command.line, detail: value.slice(0, 120) };
      }
      return { kind: 'category-toggle', category: toggleCategory, enabled: ['on', 'enable'].includes(operation), line: command.line };
    }
    if (category && ['enable', 'disable'].includes(String(args[0] || '').trim().toLowerCase())) {
      const operation = String(args[0] || '').trim().toLowerCase();
      const target = args.slice(1).join(' ');
      let key = target;
      if (category === 'macros' && typeof macroApi.parseMacroKey === 'function') {
        const parsedKey = macroApi.parseMacroKey(target);
        if (parsedKey.error) return { kind: 'error', line: command.line, error: parsedKey.error };
        key = parsedKey.signature;
      }
      if (!String(key || '').trim()) return { kind: 'error', line: command.line, error: `${directive} ${operation} needs a target.` };
      return { kind: 'definition-toggle', category, key: String(key), enabled: operation === 'enable', line: command.line };
    }
    if (!category) {
      return { kind: 'unsupported', directive, line: command.line, detail: value.slice(0, 120) };
    }
    if (['variables', 'functions', 'highlights', 'substitutes', 'macros'].includes(category) && args.length === 1) {
      const singular = {
        variables: 'variable', functions: 'function', highlights: 'highlight', substitutes: 'substitute', macros: 'macro'
      }[category];
      return {
        kind: 'compatibility-noop',
        directive: `${singular}-query`,
        line: command.line,
        detail: `One-argument #${singular.toUpperCase()} is a query/list form and creates no definition during import.`
      };
    }
    if (category === 'actions' && args.length === 1) {
      return {
        kind: 'compatibility-noop',
        directive: 'action-query',
        line: command.line,
        detail: 'One-argument #ACTION is a query/list form and creates no trigger during import.'
      };
    }
    if (category === 'aliases' && args.length === 1) {
      return {
        kind: 'compatibility-noop',
        directive: 'alias-query',
        line: command.line,
        detail: 'One-argument #ALIAS is a query/list form and creates no Alias during import.'
      };
    }
    const required = REQUIRED_ARGUMENTS[directive] || 0;
    if (args.length < required) {
      return { kind: 'error', line: command.line, error: `${directive} needs ${required} argument${required === 1 ? '' : 's'}.` };
    }
    const className = normalizeClassName(activeClass);

    if (category === 'aliases') {
      const name = normalizeAliasName(args[0]);
      const trailingPriority = args.length >= 3 && /^\s*[0-9]+(?:\.[0-9]+)?\s*$/u.test(String(args.at(-1) || ''))
        ? args.at(-1)
        : '';
      const priority = normalizePriority(trailingPriority || 5);
      const bodyArgs = trailingPriority ? args.slice(1, -1) : args.slice(1);
      const commands = safeCommandList(bodyArgs.join(' '), 'Alias body', { maxCommands: 128, commandPrefix: commandCharacter, targetCommandPrefix: targetCommandCharacter });
      if (!name && String(args[0] || '').trim().startsWith(commandCharacter)) {
        return { kind: 'unsupported', directive: 'alias-command-name', line: command.line, detail: `Alias {${String(args[0] || '').trim()}} conflicts with the protected NukeFire command namespace.` };
      }
      if (!name || commands.error) return { kind: 'error', line: command.line, error: commands.error || 'Alias name is invalid.' };
      return { kind: 'definition', category, key: name, record: { name, body: commands.value, priority, scope: 'global', ...(className ? { className } : {}) } };
    }
    if (category === 'variables') {
      const name = normalizeVariableName(args[0]);
      const rawValue = args.slice(1).join(' ');
      const valueText = flatten(rawValue, 4096);
      if (!name) return { kind: 'error', line: command.line, error: 'Variable name is invalid.' };
      if (!name.includes('[')) {
        const tableRecords = flattenTableEntries(name, rawValue);
        if (tableRecords?.length) {
          return {
            kind: 'definition-batch',
            category,
            line: command.line,
            records: tableRecords.map((record) => ({ ...record, scope: 'global', ...(className ? { className } : {}) }))
          };
        }
      }
      return { kind: 'definition', category, key: name, record: { name, value: valueText, scope: 'global', ...(className ? { className } : {}) } };
    }
    if (category === 'functions') {
      const name = normalizeFunctionName(args[0]);
      const bodyValue = safeFunctionBody(args.slice(1).join(' '), commandCharacter, targetCommandCharacter);
      if (!name || bodyValue.error) return { kind: 'error', line: command.line, error: bodyValue.error || 'Function name is invalid.' };
      return { kind: 'definition', category, key: name, record: { name, body: bodyValue.value, scope: 'global', ...(className ? { className } : {}) } };
    }
    if (category === 'actions') {
      const priorityToken = args.length >= 3 && /^\s*[0-9]+(?:\.[0-9]+)?\s*$/u.test(args.at(-1)) ? args.pop() : '';
      const pattern = flatten(args[0], 512);
      const commands = safeCommandList(args.slice(1).join(' '), 'Action command', { maxCommands: 64, commandPrefix: commandCharacter, targetCommandPrefix: targetCommandCharacter });
      if (!pattern || commands.error) return { kind: 'error', line: command.line, error: commands.error || 'Action pattern is empty.' };
      return { kind: 'definition', category, key: pattern, record: { pattern, command: commands.value, priority: normalizePriority(priorityToken), enabled: true, scope: 'global', ...(className ? { className } : {}) } };
    }
    if (category === 'gags') {
      const pattern = flatten(args.join(' '), 512);
      if (!pattern) return { kind: 'error', line: command.line, error: 'Gag pattern is empty.' };
      return { kind: 'definition', category, key: pattern, record: { pattern, enabled: true, scope: 'global', ...(className ? { className } : {}) } };
    }
    if (category === 'highlights') {
      const priorityToken = args.length >= 3 && /^\s*[0-9]+(?:\.[0-9]+)?\s*$/u.test(args.at(-1)) ? args.pop() : '';
      const pattern = typeof highlightApi.normalizeHighlightPattern === 'function'
        ? highlightApi.normalizeHighlightPattern(args[0])
        : flatten(args[0], 512);
      const style = args.slice(1).join(' ');
      const parsedStyle = typeof highlightApi.parseHighlightStyle === 'function'
        ? highlightApi.parseHighlightStyle(style)
        : { style: Boolean(style) ? {} : null, error: style ? '' : 'Highlight style is empty.' };
      if (!pattern || parsedStyle?.error || !parsedStyle?.style) return { kind: 'error', line: command.line, error: parsedStyle?.error || 'Highlight is invalid.' };
      return { kind: 'definition', category, key: pattern, record: { pattern, style: flatten(style, 256), priority: normalizePriority(priorityToken), enabled: true, scope: 'global', ...(className ? { className } : {}) } };
    }
    if (category === 'substitutes') {
      const priorityToken = args.length >= 3 && /^\s*[0-9]+(?:\.[0-9]+)?\s*$/u.test(args.at(-1)) ? args.pop() : '';
      const pattern = typeof substituteApi.normalizeSubstitutePattern === 'function'
        ? substituteApi.normalizeSubstitutePattern(args[0])
        : flatten(args[0], 512);
      const replacement = typeof substituteApi.normalizeSubstituteReplacement === 'function'
        ? substituteApi.normalizeSubstituteReplacement(args.slice(1).join(' '))
        : flatten(args.slice(1).join(' '), 4096);
      const compiled = typeof substituteApi.compileSubstitutePattern === 'function'
        ? substituteApi.compileSubstitutePattern(pattern)
        : Boolean(pattern);
      if (!pattern || !compiled) return { kind: 'error', line: command.line, error: 'Substitute pattern is invalid.' };
      return { kind: 'definition', category, key: pattern, record: { pattern, replacement, priority: normalizePriority(priorityToken), enabled: true, scope: 'global', ...(className ? { className } : {}) } };
    }
    if (category === 'macros') {
      const keyText = args[0];
      const commands = safeCommandList(args.slice(1).join(' '), 'Macro command', { maxCommands: 32, commandPrefix: commandCharacter, targetCommandPrefix: targetCommandCharacter });
      const parsedKey = typeof macroApi.parseMacroKey === 'function' ? macroApi.parseMacroKey(keyText) : { key: keyText, signature: keyText.toLowerCase(), error: '' };
      if (parsedKey.error || commands.error) return { kind: 'error', line: command.line, error: parsedKey.error || commands.error };
      return {
        kind: 'definition', category, key: parsedKey.signature,
        record: {
          key: parsedKey.key || keyText,
          label: parsedKey.label || parsedKey.key || keyText,
          code: parsedKey.code,
          modifiers: parsedKey.modifiers,
          signature: parsedKey.signature,
          command: commands.value,
          commands: typeof parserApi.splitTopLevelCommands === 'function'
            ? parserApi.splitTopLevelCommands(commands.value, { maxCommands: 32, commandPrefix: targetCommandCharacter, quoteAware: false }).commands
            : commands.value.split(';').map((entry) => entry.trim()).filter(Boolean),
          enabled: true,
          ...(className ? { className } : {})
        }
      };
    }
    if (category === 'tabs') {
      const valueText = flatten(args.join(' '), 1024).trim();
      if (!valueText || /[\r\n\0]/u.test(valueText)) return { kind: 'error', line: command.line, error: 'Tab value is invalid.' };
      return { kind: 'definition', category, key: valueText.toLocaleLowerCase(), record: { value: valueText, ...(className ? { className } : {}) } };
    }
    return { kind: 'unsupported', directive, line: command.line, detail: value.slice(0, 120) };
  }

  function existingDefinitions(snapshot = {}) {
    const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
    return {
      aliases: Array.isArray(source.aliases) ? clone(source.aliases) : [],
      variables: Array.isArray(source.variables) ? clone(source.variables) : [],
      functions: Array.isArray(source.functions) ? clone(source.functions) : [],
      actions: clone(source.actions && typeof source.actions === 'object' ? source.actions : { enabled: true, definitions: [] }),
      gags: clone(source.gags && typeof source.gags === 'object' ? source.gags : { enabled: true, definitions: [] }),
      highlights: clone(source.highlights && typeof source.highlights === 'object' ? source.highlights : { enabled: true, definitions: [] }),
      substitutes: clone(source.substitutes && typeof source.substitutes === 'object' ? source.substitutes : { enabled: true, definitions: [] }),
      macros: clone(source.macros && typeof source.macros === 'object' ? source.macros : { enabled: true, definitions: [] }),
      tabs: Array.isArray(source.tabs) ? clone(source.tabs) : [],
      events: clone(source.events && typeof source.events === 'object' ? source.events : { enabled: true, definitions: [] }),
      config: {
        logMode: ['plain','raw'].includes(String(source.config?.logMode || '').toLowerCase()) ? String(source.config.logMode).toLowerCase() : 'plain',
        commandEcho: source.config?.commandEcho === true,
        autoTab: Number.isSafeInteger(Number(source.config?.autoTab)) && Number(source.config.autoTab) >= 1 && Number(source.config.autoTab) <= 999999 ? Number(source.config.autoTab) : 0,
        verbatim: source.config?.verbatim === true,
        repeatChar: [...String(source.config?.repeatChar || '!')][0] || '!',
        repeatEnter: source.config?.repeatEnter === true,
        verbatimChar: [...String(source.config?.verbatimChar || '\\')][0] || '\\',
        historySize: Number.isSafeInteger(Number(source.config?.historySize)) && Number(source.config.historySize) >= 0 && Number(source.config.historySize) <= 9999 ? Number(source.config.historySize) : 2000,
        bufferSize: Number.isSafeInteger(Number(source.config?.bufferSize)) && Number(source.config.bufferSize) >= 100 && Number(source.config.bufferSize) <= 100000 ? Number(source.config.bufferSize) : 5000
      },
      speedwalk: clone(source.speedwalk && typeof source.speedwalk === 'object' ? source.speedwalk : { enabled: true }),
      classes: clone(source.classes && typeof source.classes === 'object'
        ? source.classes
        : { activeStack: [], definitions: [] })
    };
  }

  function recordsFor(definitions, category) {
    return ['aliases', 'variables', 'functions', 'tabs'].includes(category)
      ? definitions[category]
      : definitions[category].definitions;
  }

  function recordKey(category, record) {
    if (category === 'aliases' || category === 'variables' || category === 'functions') return String(record.name || '').toLowerCase();
    if (category === 'tabs') return String(record.value || '').toLocaleLowerCase();
    if (category === 'macros') return String(record.signature || record.key || '').toLowerCase();
    if (category === 'events') return String(record.name || '').toUpperCase();
    return String(record.pattern || '');
  }

  function mergeParsedDefinitions(parsedByCategory, existingValue) {
    const definitions = existingDefinitions(existingValue);
    const replaced = { total: 0, existing: 0, withinFile: 0 };
    for (const category of Object.keys(DISPLAY_NAMES)) {
      const current = recordsFor(definitions, category);
      const existingKeys = new Set(current.map((record) => recordKey(category, record)));
      const map = new Map(current.map((record) => [recordKey(category, record), record]));
      const fileSeen = new Set();
      for (const record of parsedByCategory[category]) {
        const key = recordKey(category, record);
        if (map.has(key)) {
          replaced.total += 1;
          if (fileSeen.has(key)) replaced.withinFile += 1;
          else if (existingKeys.has(key)) replaced.existing += 1;
        }
        map.set(key, record);
        fileSeen.add(key);
      }
      const merged = [...map.values()];
      if (merged.length > LIMITS[category]) {
        return { ok: false, error: `${DISPLAY_NAMES[category]} would exceed the client limit of ${LIMITS[category]}.`, definitions: null, replaced };
      }
      if (category === 'aliases' || category === 'variables' || category === 'functions' || category === 'tabs') definitions[category] = merged;
      else definitions[category].definitions = merged;
    }
    return { ok: true, definitions, replaced, error: '' };
  }

  function ensureClassRecord(definitions, classNameValue) {
    const className = normalizeClassName(classNameValue);
    if (!className) return null;
    const classes = definitions.classes;
    if (!Array.isArray(classes.definitions)) classes.definitions = [];
    let record = classes.definitions.find((entry) => normalizeClassName(entry?.name) === className);
    if (!record) {
      record = {
        name: className,
        saved: { aliases: [], variables: [], functions: [], actions: [], gags: [], highlights: [], substitutes: [], macros: [], events: [] }
      };
      classes.definitions.push(record);
    }
    return record;
  }

  function classDefinitions(definitions, classNameValue) {
    const className = normalizeClassName(classNameValue);
    const result = Object.fromEntries(Object.keys(DISPLAY_NAMES).map((category) => [category, []]));
    if (!className) return result;
    for (const category of Object.keys(DISPLAY_NAMES)) {
      result[category] = recordsFor(definitions, category)
        .filter((record) => normalizeClassName(record.className) === className)
        .map((record) => clone(record));
    }
    return result;
  }

  function clearClassDefinitions(definitions, classNameValue) {
    const className = normalizeClassName(classNameValue);
    if (!className) return;
    for (const category of Object.keys(DISPLAY_NAMES)) {
      const remaining = recordsFor(definitions, category)
        .filter((record) => normalizeClassName(record.className) !== className);
      if (category === 'aliases' || category === 'variables' || category === 'functions' || category === 'tabs') definitions[category] = remaining;
      else definitions[category].definitions = remaining;
    }
  }

  function upsertDefinition(definitions, category, record, tracking) {
    const current = recordsFor(definitions, category);
    const key = recordKey(category, record);
    const index = current.findIndex((entry) => recordKey(category, entry) === key);
    if (index >= 0) {
      tracking.replaced.total += 1;
      if (tracking.fileSeen[category].has(key)) tracking.replaced.withinFile += 1;
      else tracking.replaced.existing += 1;
      current[index] = record;
    } else {
      current.push(record);
    }
    tracking.fileSeen[category].add(key);
    if (current.length > LIMITS[category]) {
      return `${DISPLAY_NAMES[category]} would exceed the client limit of ${LIMITS[category]}.`;
    }
    if (category === 'aliases' || category === 'variables' || category === 'functions' || category === 'tabs') definitions[category] = current;
    else definitions[category].definitions = current;
    return '';
  }

  function setDefinitionEnabled(definitions, category, keyValue, enabled) {
    const rawKey = String(keyValue || '');
    const key = category === 'macros' ? rawKey.toLowerCase() : rawKey;
    const current = recordsFor(definitions, category);
    const index = current.findIndex((record) => recordKey(category, record) === key);
    if (index < 0) return false;
    current[index] = { ...current[index], enabled: Boolean(enabled) };
    if (category === 'aliases' || category === 'variables' || category === 'functions' || category === 'tabs') definitions[category] = current;
    else definitions[category].definitions = current;
    return true;
  }

  function prepareTinTinRead(sourceValue, existingValue = {}, options = {}) {
    const original = normalizeLineEndings(sourceValue);
    if (!original.trim()) return { ok: false, errors: ['TinTin script is empty.'] };
    if (original.length > MAX_SOURCE_LENGTH) return { ok: false, errors: [`TinTin script exceeds ${MAX_SOURCE_LENGTH.toLocaleString()} characters.`] };
    const forcedSourceCommandCharacter = SUPPORTED_PREFIXES.has(String(options.sourceCommandPrefix || '')) ? String(options.sourceCommandPrefix) : '';
    const commandCharacter = forcedSourceCommandCharacter || detectCommandCharacter(original, options.commandPrefix || '#');
    const comments = stripComments(original, commandCharacter);
    if (!comments.ok) return { ok: false, errors: [comments.error] };
    const split = splitScriptCommands(comments.value, commandCharacter);
    if (!split.ok) return { ok: false, errors: [split.error] };
    if (split.commands.length > MAX_DEFINITIONS) return { ok: false, errors: [`TinTin script contains more than ${MAX_DEFINITIONS.toLocaleString()} commands.`] };

    const definitions = existingDefinitions(existingValue);
    if (!Array.isArray(definitions.classes.activeStack)) definitions.classes.activeStack = [];
    if (!Array.isArray(definitions.classes.definitions)) definitions.classes.definitions = [];
    const normalizedActiveNames = definitions.classes.activeStack
      .map(normalizeClassName)
      .filter((name) => name);
    const restoredActiveClass = normalizedActiveNames.length
      ? normalizedActiveNames[normalizedActiveNames.length - 1]
      : '';
    const activeStack = restoredActiveClass ? [restoredActiveClass] : [];
    for (const name of activeStack) ensureClassRecord(definitions, name);
    let activeClass = normalizeClassName(options.activeClass);
    const counts = Object.fromEntries(Object.keys(DISPLAY_NAMES).map((key) => [key, 0]));
    const unsupported = [];
    const compatibilityNoops = [];
    const routedCommands = [];
    const runtimeCommands = [];
    const plainCommands = [];
    const scriptIncludes = [];
    const loadedEntries = [];
    const settingChanges = [];
    const classChanges = [];
    const errors = [];
    const tracking = {
      replaced: { total: 0, existing: 0, withinFile: 0 },
      fileSeen: Object.fromEntries(Object.keys(DISPLAY_NAMES).map((key) => [key, new Set()]))
    };
    let runtimeCommandCharacter = detectCommandCharacter(options.commandPrefix || commandCharacter, commandCharacter);

    for (const command of split.commands) {
      const sourceCommandCharacter = String(command.commandCharacter || commandCharacter);
      const parsed = parseDefinition(command, sourceCommandCharacter, activeClass, runtimeCommandCharacter);
      if (parsed.kind === 'error') {
        errors.push(`Line ${parsed.line}: ${parsed.error}`);
        continue;
      }
      if (parsed.kind === 'class') {
        classChanges.push({
          line: parsed.line,
          className: parsed.className,
          operation: parsed.operation
        });
        if (parsed.operation === 'open') {
          activeClass = parsed.className;
        } else if (parsed.operation === 'close') {
          if (!activeClass || activeClass === parsed.className) activeClass = '';
        } else {
          const classRecord = ensureClassRecord(definitions, parsed.className);
          if (!classRecord) {
            errors.push(`Line ${parsed.line}: Class name is invalid.`);
            continue;
          }
          if (parsed.operation === 'save') {
            classRecord.saved = classDefinitions(definitions, parsed.className);
          } else if (parsed.operation === 'clear') {
            clearClassDefinitions(definitions, parsed.className);
          } else if (parsed.operation === 'kill') {
            clearClassDefinitions(definitions, parsed.className);
            const classIndex = definitions.classes.definitions.findIndex((entry) => normalizeClassName(entry?.name) === parsed.className);
            if (classIndex >= 0) definitions.classes.definitions.splice(classIndex, 1);
            for (let index = activeStack.length - 1; index >= 0; index -= 1) {
              if (activeStack[index] === parsed.className) activeStack.splice(index, 1);
            }
            if (activeClass === parsed.className) activeClass = '';
          } else if (parsed.operation === 'activate') {
            activeStack.splice(0, activeStack.length, parsed.className);
          } else if (parsed.operation === 'deactivate') {
            if (activeStack[0] === parsed.className) activeStack.length = 0;
          }
        }
        continue;
      }
      if (parsed.kind === 'category-toggle') {
        definitions[parsed.category].enabled = parsed.enabled;
        settingChanges.push({
          kind: 'category-toggle',
          line: parsed.line,
          category: parsed.category,
          enabled: parsed.enabled
        });
        continue;
      }
      if (parsed.kind === 'definition-toggle') {
        if (!setDefinitionEnabled(definitions, parsed.category, parsed.key, parsed.enabled)) {
          errors.push(`Line ${parsed.line}: ${parsed.category} target was not defined before it was ${parsed.enabled ? 'enabled' : 'disabled'}.`);
        }
        continue;
      }
      if (parsed.kind === 'load-list-add') {
        const prefix = `${parsed.base}[`;
        const existingItems = definitions.variables
          .filter((record) => String(record?.name || '').startsWith(prefix) && /^\d+\]$/u.test(String(record.name).slice(prefix.length)))
          .length;
        if (existingItems + parsed.values.length > 512) {
          errors.push(`Line ${parsed.line}: List ${parsed.base} exceeds 512 items.`);
          continue;
        }
        for (let offset = 0; offset < parsed.values.length; offset += 1) {
          const name = `${parsed.base}[${existingItems + offset + 1}]`;
          const record = { name, value: parsed.values[offset], scope: 'global', ...(parsed.className ? { className: parsed.className } : {}) };
          const error = upsertDefinition(definitions, 'variables', record, tracking);
          if (error) errors.push(`Line ${parsed.line}: ${error}`);
          else {
            counts.variables += 1;
            loadedEntries.push({ category: 'variables', key: name, line: parsed.line });
          }
        }
        continue;
      }
      if (parsed.kind === 'config') {
        if (parsed.key === 'speedwalk') definitions.speedwalk = { enabled: parsed.value === true };
        else if (parsed.key === 'autoTab') definitions.config = { ...(definitions.config || {}), autoTab: parsed.value };
        else if (parsed.key === 'logMode') definitions.config = { ...(definitions.config || {}), logMode: parsed.value };
        else if (parsed.key === 'commandEcho') definitions.config = { ...(definitions.config || {}), commandEcho: parsed.value === true };
        else if (parsed.key === 'verbatim') definitions.config = { ...(definitions.config || {}), verbatim: parsed.value === true };
        else if (parsed.key === 'repeatChar') definitions.config = { ...(definitions.config || {}), repeatChar: parsed.value };
        else if (parsed.key === 'repeatEnter') definitions.config = { ...(definitions.config || {}), repeatEnter: parsed.value === true };
        else if (parsed.key === 'verbatimChar') definitions.config = { ...(definitions.config || {}), verbatimChar: parsed.value };
        else if (parsed.key === 'historySize') definitions.config = { ...(definitions.config || {}), historySize: parsed.value };
        else if (parsed.key === 'bufferSize') definitions.config = { ...(definitions.config || {}), bufferSize: parsed.value };
        settingChanges.push({
          kind: 'config',
          line: parsed.line,
          key: parsed.key,
          value: parsed.value
        });
        continue;
      }
      if (parsed.kind === 'command-character') {
        if (parsed.value !== runtimeCommandCharacter) {
          runtimeCommands.push({
            directive: 'config', line: parsed.line, command: parsed.command,
            persistOnImport: true, commandPrefixChange: parsed.value
          });
        }
        runtimeCommandCharacter = parsed.value;
        continue;
      }
      if (parsed.kind === 'runtime-command') {
        runtimeCommands.push({
          directive: parsed.directive,
          line: parsed.line,
          command: parsed.command,
          ...(parsed.persistOnImport ? { persistOnImport: true } : {})
        });
        continue;
      }
      if (parsed.kind === 'plain-command') {
        plainCommands.push({ line: parsed.line, command: parsed.command });
        continue;
      }
      if (parsed.kind === 'script-include') {
        scriptIncludes.push({ directive: 'read', line: parsed.line, requested: parsed.requested });
        continue;
      }
      if (parsed.kind === 'compatibility-noop') {
        compatibilityNoops.push({ directive: parsed.directive, line: parsed.line, detail: parsed.detail });
        continue;
      }
      if (parsed.kind === 'session-route') {
        routedCommands.push({
          target: parsed.target,
          directive: parsed.routedDirective,
          command: parsed.command,
          line: parsed.line
        });
        continue;
      }
      if (parsed.kind === 'unsupported') {
        unsupported.push({
          directive: parsed.directive,
          line: parsed.line,
          detail: parsed.detail,
          ...(parsed.target ? { target: parsed.target } : {}),
          ...(parsed.routedDirective ? { routedDirective: parsed.routedDirective } : {})
        });
        continue;
      }
      if (parsed.kind === 'definition-batch') {
        for (const record of parsed.records || []) {
          const error = upsertDefinition(definitions, parsed.category, record, tracking);
          if (error) errors.push(`Line ${parsed.line}: ${error}`);
          else {
            counts[parsed.category] += 1;
            loadedEntries.push({
              category: parsed.category,
              key: recordKey(parsed.category, record),
              line: parsed.line
            });
          }
        }
        continue;
      }
      if (parsed.kind !== 'definition') continue;
      const error = upsertDefinition(definitions, parsed.category, parsed.record, tracking);
      if (error) errors.push(`Line ${parsed.line}: ${error}`);
      else {
        counts[parsed.category] += 1;
        loadedEntries.push({
          category: parsed.category,
          key: recordKey(parsed.category, parsed.record),
          line: parsed.line
        });
      }
    }

    const literalAliases = new Set(definitions.aliases
      .map((record) => String(record?.name || '').trim().toLowerCase())
      .filter((name) => name && !/[%*^$]/u.test(name)));
    for (const entry of plainCommands) {
      const firstWord = String(entry.command || '').trim().split(/\s+/u)[0]?.toLowerCase() || '';
      if (firstWord && literalAliases.has(firstWord)) {
        runtimeCommands.push({
          directive: 'alias-call', line: entry.line, command: entry.command, persistOnImport: true
        });
      } else {
        unsupported.push({
          directive: 'server-command', line: entry.line, detail: String(entry.command || '').slice(0, 120)
        });
      }
    }
    runtimeCommands.sort((left, right) => (Number(left?.line) || 0) - (Number(right?.line) || 0));

    definitions.classes.activeStack = [...activeStack];
    definitions.classes.definitions = definitions.classes.definitions
      .map((record) => ({
        name: normalizeClassName(record.name),
        saved: record.saved && typeof record.saved === 'object'
          ? clone(record.saved)
          : { aliases: [], variables: [], functions: [], actions: [], gags: [], highlights: [], substitutes: [], macros: [], events: [] }
      }))
      .filter((record, index, values) => record.name && values.findIndex((entry) => entry.name === record.name) === index)
      .sort((left, right) => left.name.localeCompare(right.name));

    if (errors.length) return {
      ok: false, errors, unsupported, compatibilityNoops, routedCommands, runtimeCommands, scriptIncludes,
      loadedEntries, settingChanges, classChanges,
      counts, comments: comments.comments, commandCharacter,
      definitions, activeClass, replaced: tracking.replaced,
      finalSourceCommandCharacter: split.finalCommandCharacter || commandCharacter,
      finalCommandCharacter: runtimeCommandCharacter
    };
    const unsupportedCounts = {};
    for (const item of unsupported) unsupportedCounts[item.directive] = (unsupportedCounts[item.directive] || 0) + 1;
    return {
      ok: true,
      filename: String(options.filename || ''),
      commandCharacter,
      comments: comments.comments,
      counts,
      unsupported,
      unsupportedCounts,
      compatibilityNoops,
      routedCommands,
      runtimeCommands,
      scriptIncludes,
      loadedEntries,
      settingChanges,
      classChanges,
      definitions,
      activeClass,
      replaced: tracking.replaced,
      finalSourceCommandCharacter: split.finalCommandCharacter || commandCharacter,
      finalCommandCharacter: runtimeCommandCharacter,
      totalLoaded: Object.values(counts).reduce((sum, value) => sum + value, 0),
      errors: []
    };
  }

  function migrateLegacyNukeFireTableKeySyntax(sourceValue) {
    const source = String(sourceValue ?? '');
    if (!/\/\*\s*NukeFire Client (?:TinTin command file|imported TinTin definitions)\./u.test(source)) return { source, migrated: 0 };
    let migrated = 0;
    const output = source.replace(/\$([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]\r\n]+\])*)\[\]/gu, (_match, path) => { migrated += 1; return `*${path}[]`; });
    return { source: output, migrated };
  }

  function parseReadDirective(commandValue, commandCharacter) {
    const value = String(commandValue || '').trim();
    const directive = directiveName(value, commandCharacter);
    if (directive !== 'read') return { matched: false, requested: '', error: '' };
    const body = directiveBody(value, commandCharacter);
    const parsed = tokenizeArguments(body);
    if (parsed.error) return { matched: true, requested: '', error: parsed.error };
    if (parsed.tokens.length !== 1 || !String(parsed.tokens[0] || '').trim()) {
      return { matched: true, requested: '', error: 'read in a script needs exactly one script filename.' };
    }
    return { matched: true, requested: String(parsed.tokens[0]).trim(), error: '' };
  }

  async function prepareTinTinReadTree(sourceValue, existingValue = {}, options = {}) {
    const readFile = typeof options.readFile === 'function' ? options.readFile : null;
    const maxDepth = Math.max(1, Math.min(16, Number(options.maxDepth) || 8));
    const maxFiles = Math.max(1, Math.min(128, Number(options.maxFiles) || 32));
    const counts = Object.fromEntries(Object.keys(DISPLAY_NAMES).map((key) => [key, 0]));
    const unsupported = [];
    const compatibilityNoops = [];
    const routedCommands = [];
    const runtimeCommands = [];
    const includes = [];
    const errors = [];
    const replaced = { total: 0, existing: 0, withinFile: 0 };
    const stack = [];
    const filesSeen = new Set();
    let definitions = existingDefinitions(existingValue);
    let filesRead = 0;
    let treeCommandCharacter = SUPPORTED_PREFIXES.has(String(options.commandPrefix || '')) ? String(options.commandPrefix) : '#';

    const normalizeFileKey = (value) => String(value || '').trim().normalize('NFKC').toLowerCase();

    const addResult = (result, filename) => {
      definitions = result.definitions;
      for (const category of Object.keys(DISPLAY_NAMES)) {
        counts[category] += Number(result.counts?.[category] || 0);
      }
      for (const entry of result.unsupported || []) unsupported.push({ ...entry, filename });
      for (const entry of result.compatibilityNoops || []) compatibilityNoops.push({ ...entry, filename });
      for (const entry of result.routedCommands || []) routedCommands.push({ ...entry, filename });
      for (const entry of result.runtimeCommands || []) runtimeCommands.push({ ...entry, filename });
      replaced.total += Number(result.replaced?.total || 0);
      replaced.existing += Number(result.replaced?.existing || 0);
      replaced.withinFile += Number(result.replaced?.withinFile || 0);
      return result.activeClass || '';
    };

    const processFile = async (contentValue, filenameValue, activeClassValue, depth) => {
      const filename = String(filenameValue || options.filename || 'script').trim() || 'script';
      const key = normalizeFileKey(filename);
      if (depth > maxDepth) {
        errors.push(`Nested #READ exceeded the maximum depth of ${maxDepth} while opening ${filename}.`);
        return activeClassValue;
      }
      if (stack.includes(key)) {
        const chain = [...stack, key].filter(Boolean).join(' -> ');
        errors.push(`Nested #READ cycle detected: ${chain}.`);
        return activeClassValue;
      }
      if (!filesSeen.has(key)) {
        if (filesSeen.size >= maxFiles) {
          errors.push(`Nested #READ exceeded the maximum of ${maxFiles} script files.`);
          return activeClassValue;
        }
        filesSeen.add(key);
        filesRead += 1;
      }

      const rawOriginal = normalizeLineEndings(contentValue);
      const migratedLegacy = migrateLegacyNukeFireTableKeySyntax(rawOriginal);
      const original = migratedLegacy.source;
      if (!original.trim()) {
        errors.push(`${filename}: TinTin script is empty.`);
        return activeClassValue;
      }
      if (original.length > MAX_SOURCE_LENGTH) {
        errors.push(`${filename}: TinTin script exceeds ${MAX_SOURCE_LENGTH.toLocaleString()} characters.`);
        return activeClassValue;
      }
      const commandCharacter = depth === 0
        ? detectCommandCharacter(original, treeCommandCharacter)
        : treeCommandCharacter;
      if (depth === 0) treeCommandCharacter = commandCharacter;
      const comments = stripComments(original, commandCharacter);
      if (!comments.ok) {
        errors.push(`${filename}: ${comments.error}`);
        return activeClassValue;
      }
      const split = splitScriptCommands(comments.value, commandCharacter);
      if (!split.ok) {
        errors.push(`${filename}: ${split.error}`);
        return activeClassValue;
      }
      if (split.commands.length > MAX_DEFINITIONS) {
        errors.push(`${filename}: TinTin script contains more than ${MAX_DEFINITIONS.toLocaleString()} commands.`);
        return activeClassValue;
      }

      stack.push(key);
      let activeClass = normalizeClassName(activeClassValue);
      let sourceCommandCharacter = commandCharacter;
      let pending = [];
      let pendingSourceCommandCharacter = commandCharacter;

      const flush = () => {
        if (pending.length === 0 || errors.length) return;
        const segment = pending.map((command) => command.value).join('\n');
        const line = pending[0]?.line || 1;
        const segmentSourceCommandCharacter = pendingSourceCommandCharacter;
        pending = [];
        const result = prepareTinTinRead(segment, definitions, {
          filename,
          commandPrefix: treeCommandCharacter,
          sourceCommandPrefix: segmentSourceCommandCharacter,
          activeClass
        });
        if (!result?.ok) {
          for (const message of result?.errors || ['TinTin script could not be parsed.']) {
            errors.push(`${filename}:${line}: ${String(message).replace(/^Line \d+:\s*/u, '')}`);
          }
          return;
        }
        activeClass = addResult(result, filename);
        sourceCommandCharacter = result.finalSourceCommandCharacter || sourceCommandCharacter;
        treeCommandCharacter = result.finalCommandCharacter || treeCommandCharacter;
        pendingSourceCommandCharacter = sourceCommandCharacter;
      };

      for (const command of split.commands) {
        if (errors.length) break;
        const include = parseReadDirective(command.value, sourceCommandCharacter);
        if (!include.matched) {
          if (pending.length === 0) pendingSourceCommandCharacter = sourceCommandCharacter;
          pending.push(command);
          const changed = nextTinTinCharacter(command.value, sourceCommandCharacter);
          if (changed) sourceCommandCharacter = changed;
          continue;
        }
        flush();
        if (errors.length) break;
        if (include.error) {
          errors.push(`${filename}:${command.line}: ${include.error}`);
          break;
        }
        if (!readFile) {
          errors.push(`${filename}:${command.line}: Nested #READ is unavailable because script storage is not connected.`);
          break;
        }
        let response;
        try {
          response = await readFile(include.requested, {
            parent: filename,
            line: command.line,
            depth: depth + 1
          });
        } catch (error) {
          response = { ok: false, error: error?.message || String(error) };
        }
        if (!response?.ok || response?.mode === 'info') {
          errors.push(`${filename}:${command.line}: #READ ${include.requested} failed: ${response?.error || 'script was not found'}.`);
          break;
        }
        const childName = String(response.filename || include.requested);
        includes.push({
          parent: filename,
          filename: childName,
          requested: include.requested,
          line: command.line,
          depth: depth + 1
        });
        activeClass = await processFile(response.content, childName, activeClass, depth + 1);
        sourceCommandCharacter = treeCommandCharacter;
        pendingSourceCommandCharacter = sourceCommandCharacter;
      }

      flush();
      stack.pop();
      return activeClass;
    };

    const rootFilename = String(options.filename || 'script').trim() || 'script';
    const activeClass = await processFile(sourceValue, rootFilename, options.activeClass || '', 0);

    if (errors.length) {
      return {
        ok: false,
        errors,
        unsupported,
        routedCommands,
        counts,
        includes,
        filesRead,
        activeClass,
        definitions: existingDefinitions(existingValue),
        replaced,
        finalCommandCharacter: treeCommandCharacter,
        totalLoaded: 0
      };
    }

    const unsupportedCounts = {};
    for (const item of unsupported) unsupportedCounts[item.directive] = (unsupportedCounts[item.directive] || 0) + 1;

    return {
      ok: true,
      filename: rootFilename,
      counts,
      unsupported,
      unsupportedCounts,
      compatibilityNoops,
      routedCommands,
      runtimeCommands,
      includes,
      filesRead,
      definitions,
      activeClass,
      replaced,
      finalCommandCharacter: treeCommandCharacter,
      totalLoaded: Object.values(counts).reduce((sum, value) => sum + value, 0),
      errors: []
    };
  }

  function pluralLabel(category, count) {
    const label = DISPLAY_NAMES[category] || String(category || '').toUpperCase();
    if (count !== 1) return label;
    return ({ ALIASES: 'ALIAS', VARIABLES: 'VARIABLE', FUNCTIONS: 'FUNCTION', ACTIONS: 'ACTION', GAGS: 'GAG', HIGHLIGHTS: 'HIGHLIGHT', SUBSTITUTIONS: 'SUBSTITUTION', MACROS: 'MACRO', TABS: 'TAB', EVENTS: 'EVENT' })[label] || label;
  }

  function formatTinTinReadReport(result = {}, filenameValue = '') {
    if (!result?.ok) return (result?.errors || ['TinTin script could not be loaded.']).map((message) => `#ERROR: ${message}`);
    const filename = String(filenameValue || result.filename || 'script').trim();
    const lines = [`#OK: READ ${filename}.`];
    for (const category of ['actions', 'aliases', 'functions', 'gags', 'highlights', 'substitutes', 'variables', 'macros', 'tabs', 'events']) {
      const count = Number(result.counts?.[category] || 0);
      if (count > 0) lines.push(`#OK: ${String(count).padStart(3, ' ')} ${pluralLabel(category, count)} LOADED.`);
    }
    if (result.replaced?.existing > 0) {
      lines.push(`#OK: ${result.replaced.existing} EXISTING DEFINITION${result.replaced.existing === 1 ? '' : 'S'} REPLACED.`);
    }
    const includeCount = Array.isArray(result.includes) ? result.includes.length : 0;
    if (includeCount > 0) {
      lines.push(`#OK: ${includeCount} NESTED SCRIPT${includeCount === 1 ? '' : 'S'} READ IN FILE ORDER.`);
    }
    const routedCount = Array.isArray(result.routedCommands) ? result.routedCommands.length : 0;
    if (routedCount > 0) {
      lines.push(`#OK: ${routedCount} SAFE NAMED-SESSION DEFINITION COMMAND${routedCount === 1 ? '' : 'S'} PARSED.`);
    }
    const splitNoops = (result.compatibilityNoops || []).filter((entry) => entry.directive === 'split').length;
    if (splitNoops > 0) {
      lines.push(`#OK: ${splitNoops} SPLIT COMMAND${splitNoops === 1 ? '' : 'S'} SAFELY IGNORED; NUKEFIRE USES THE COMMAND INPUT BAR.`);
    }
    const unsupportedEntries = Object.entries(result.unsupportedCounts || {}).sort((left, right) => left[0].localeCompare(right[0]));
    for (const [directive, count] of unsupportedEntries) {
      lines.push(`#WARN: ${count} ${String(directive || 'COMMAND').toUpperCase()} COMMAND${count === 1 ? '' : 'S'} SKIPPED.`);
    }
    if (result.totalLoaded === 0) lines.push('#WARN: NO SUPPORTED DEFINITIONS WERE FOUND.');
    return lines;
  }

  return Object.freeze({
    prepareTinTinRead,
    prepareTinTinReadTree,
    parseReadDirective,
    formatTinTinReadReport,
    migrateLegacyNukeFireTableKeySyntax,
    stripComments,
    detectCommandCharacter,
    rewriteLoadedCommandCharacter,
    splitScriptCommands,
    tokenizeArguments,
    decodeBracedToken,
    normalizeClassName,
    isSupportedEventName,
    SUPPORTED_EVENT_NAMES,
    SUPPORTED_EVENT_PREFIXES,
    LIMITS,
    MAX_SOURCE_LENGTH,
    MAX_DEFINITIONS
  });
});
