'use strict';

const {
  firstDirective,
  isClientCommand,
  tokenizeBraced,
  normalizeClientCommandPrefix
} = require('./client-command-parser');

const CONDITIONAL_DIRECTIVES = new Set(['if', 'elseif', 'else']);
const DEFAULT_MAX_CONDITIONAL_BRANCHES = 16;

function conditionalUsage(directive) {
  if (directive === 'if') return 'if {condition} {commands if true} {commands if false}';
  if (directive === 'elseif') return 'elseif {condition} {commands if true}';
  return 'else {commands}';
}

function leadingBracedArgument(value) {
  const source = String(value ?? '');
  let index = 0;
  while (index < source.length && /\s/u.test(source[index])) index += 1;
  if (source[index] !== '{') return null;
  const start = index;
  index += 1;
  let depth = 1;
  let quote = '';
  let escaped = false;
  let body = '';
  for (; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      body += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      body += character;
      escaped = true;
      continue;
    }
    if (quote) {
      body += character;
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      body += character;
      quote = character;
      continue;
    }
    if (character === '{') {
      depth += 1;
      body += character;
      continue;
    }
    if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return {
          value: body,
          rest: source.slice(index + 1).trim(),
          raw: source.slice(start, index + 1)
        };
      }
      body += character;
      continue;
    }
    body += character;
  }
  return null;
}

function splitInlineConditionalChain(commandValue, prefixValue = '#') {
  const source = String(commandValue ?? '').trim();
  const prefix = normalizeClientCommandPrefix(prefixValue);
  const first = firstDirective(source, prefix);
  if (!first || first.directive !== 'if') return [source].filter(Boolean);

  const segments = [];
  let start = 0;
  let depth = 0;
  let quote = '';
  let escaped = false;

  const markerAt = (index) => {
    if (!source.startsWith(prefix, index)) return '';
    const remainder = source.slice(index + prefix.length);
    const match = remainder.match(/^(elseif|else)(?=\s|$)/iu);
    return match ? match[1].toLowerCase() : '';
  };

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
    if (character === '{') {
      depth += 1;
      continue;
    }
    if (character === '}') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0 && index > 0) {
      const marker = markerAt(index);
      const previous = source[index - 1] || '';
      if (marker && /\s/u.test(previous)) {
        const prior = source.slice(start, index).trim();
        if (prior) segments.push(prior);
        start = index;
        index += prefix.length + marker.length - 1;
        continue;
      }
    }
    if (character === '"' || character === "'") quote = character;
  }

  const tail = source.slice(start).trim();
  if (tail) segments.push(tail);
  return segments.length > 1 ? segments : [source];
}

function parseConditionalStatement(commandValue, prefixValue = '#') {
  const command = String(commandValue ?? '').trim();
  const prefix = normalizeClientCommandPrefix(prefixValue);
  if (!isClientCommand(command, prefix)) return { matched: false, directive: '', error: '' };
  const parsed = firstDirective(command, prefix);
  const directive = String(parsed?.directive || '');
  if (!CONDITIONAL_DIRECTIVES.has(directive)) return { matched: false, directive: '', error: '' };

  const tokens = tokenizeBraced(parsed.body, { preserveEscapedSemicolon: true });
  if (directive === 'if' || directive === 'elseif') {
    const leading = leadingBracedArgument(parsed.body);
    if (leading && leading.rest && !leading.rest.startsWith('{')) {
      return {
        matched: true,
        directive,
        condition: leading.value,
        commands: leading.rest,
        fallback: '',
        error: ''
      };
    }
    const minimum = 2;
    const maximum = directive === 'if' ? 3 : 2;
    if (tokens.length < minimum || tokens.length > maximum) {
      return { matched: true, directive, error: `Usage: ${prefix}${conditionalUsage(directive)}` };
    }
    return {
      matched: true,
      directive,
      condition: tokens[0],
      commands: tokens[1],
      fallback: directive === 'if' ? (tokens[2] || '') : '',
      error: ''
    };
  }
  const rawElseBody = String(parsed.body || '').trim();
  if (rawElseBody.startsWith(prefix)) {
    const nested = firstDirective(rawElseBody, prefix);
    if (nested && ['if', 'elseif'].includes(String(nested.directive || ''))) {
      return {
        matched: true,
        directive,
        condition: '',
        commands: rawElseBody,
        fallback: '',
        error: ''
      };
    }
  }
  if (rawElseBody && !rawElseBody.startsWith('{')) {
    return {
      matched: true,
      directive,
      condition: '',
      commands: rawElseBody,
      fallback: '',
      error: ''
    };
  }
  if (tokens.length !== 1) {
    return { matched: true, directive, error: `Usage: ${prefix}${conditionalUsage(directive)}` };
  }
  return {
    matched: true,
    directive,
    condition: '',
    commands: tokens[0],
    fallback: '',
    error: ''
  };
}

function collectConditionalChain(commandsValue, startIndexValue, prefixValue = '#', options = {}) {
  const commands = Array.isArray(commandsValue) ? commandsValue : [];
  const startIndex = Math.max(0, Math.trunc(Number(startIndexValue) || 0));
  const maximumBranches = Math.max(
    1,
    Math.trunc(Number(options.maxBranches) || DEFAULT_MAX_CONDITIONAL_BRANCHES)
  );
  const inlineCommands = splitInlineConditionalChain(commands[startIndex], prefixValue);
  if (inlineCommands.length > 1) {
    const inline = collectConditionalChain(inlineCommands, 0, prefixValue, options);
    return {
      ...inline,
      nextIndex: startIndex + 1
    };
  }

  const first = parseConditionalStatement(commands[startIndex], prefixValue);
  if (!first.matched || first.directive !== 'if') {
    return { matched: false, branches: [], fallback: '', nextIndex: startIndex + 1, error: '' };
  }
  if (first.error) {
    return { matched: true, branches: [], fallback: '', nextIndex: startIndex + 1, error: first.error };
  }

  const branches = [{ condition: first.condition, commands: first.commands, directive: 'if' }];
  let fallback = first.fallback;
  let nextIndex = startIndex + 1;
  let sawElse = Boolean(fallback);

  while (nextIndex < commands.length) {
    const statement = parseConditionalStatement(commands[nextIndex], prefixValue);
    if (!statement.matched || !['elseif', 'else'].includes(statement.directive)) break;
    if (statement.error) {
      return { matched: true, branches: [], fallback: '', nextIndex: nextIndex + 1, error: statement.error };
    }
    if (sawElse) {
      return {
        matched: true,
        branches: [],
        fallback: '',
        nextIndex: nextIndex + 1,
        error: 'Conditional chain cannot continue after an else branch.'
      };
    }
    if (statement.directive === 'elseif') {
      branches.push({ condition: statement.condition, commands: statement.commands, directive: 'elseif' });
      if (branches.length > maximumBranches) {
        return {
          matched: true,
          branches: [],
          fallback: '',
          nextIndex: nextIndex + 1,
          error: `Conditional chains may contain at most ${maximumBranches} tested branches.`
        };
      }
    } else {
      fallback = statement.commands;
      sawElse = true;
    }
    nextIndex += 1;
  }

  return { matched: true, branches, fallback, nextIndex, error: '' };
}

module.exports = {
  CONDITIONAL_DIRECTIVES,
  DEFAULT_MAX_CONDITIONAL_BRANCHES,
  parseConditionalStatement,
  collectConditionalChain,
  splitInlineConditionalChain,
  leadingBracedArgument
};
