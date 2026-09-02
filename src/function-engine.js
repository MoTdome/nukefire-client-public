'use strict';

const { normalizeClassName } = require('./class-manager');

const FUNCTION_NAME_MAX = 48;
const FUNCTION_BODY_MAX = 16_384;
const FUNCTION_OUTPUT_MAX = 16_384;
const DEFAULT_MAX_FUNCTIONS = 256;
const DEFAULT_MAX_FUNCTION_ARGUMENTS = 99;
const DEFAULT_MAX_FUNCTION_DEPTH = 12;
const DEFAULT_MAX_FUNCTION_CALLS = 128;
const FORBIDDEN_FUNCTION_NAMES = new Set(['__proto__', 'constructor', 'prototype']);
const LITERAL_AT_SENTINEL = '\uE010';
const LITERAL_PERCENT_SENTINEL = '\uE011';

function normalizeFunctionName(value) {
  const source = String(value ?? '').normalize('NFKC').trim().toLowerCase();
  if (!source || source.length > FUNCTION_NAME_MAX) return '';
  if (!/^[a-z][a-z0-9_]*$/u.test(source)) return '';
  return FORBIDDEN_FUNCTION_NAMES.has(source) ? '' : source;
}

function normalizeFunctionBody(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, '')
    .replace(/\r\n?/gu, '\n')
    .trim()
    .slice(0, FUNCTION_BODY_MAX);
}

function detachedRecord(record) {
  return {
    name: record.name,
    body: record.body,
    scope: 'global',
    ...(record.className ? { className: record.className } : {})
  };
}

function quoteCanOpen(source, index, character) {
  if (character === '"') return true;
  if (character !== "'") return false;
  const previous = source[index - 1] || '';
  return (!previous || /[\s({\[]/u.test(previous)) && source.indexOf("'", index + 1) !== -1;
}

function unwrapArgument(value) {
  const source = String(value ?? '').trim();
  if (source.length < 2) return source;
  const first = source[0];
  const last = source.at(-1);
  if ((first === '"' || first === "'") && last === first) return source.slice(1, -1);
  if (first !== '{' || last !== '}') return source;

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
    if (quoteCanOpen(source, index, character)) {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') depth -= 1;
    if (depth === 0 && index < source.length - 1) return source;
    if (depth < 0) return source;
  }
  return depth === 0 ? source.slice(1, -1) : source;
}

function splitFunctionArguments(value, options = {}) {
  const source = String(value ?? '');
  const maxArguments = Math.max(
    1,
    Math.trunc(Number(options.maxArguments) || DEFAULT_MAX_FUNCTION_ARGUMENTS)
  );
  if (!source.trim()) return { arguments: [], error: '' };

  const values = [];
  let current = '';
  let depth = 0;
  let quote = '';
  let escaped = false;

  const commit = () => {
    values.push(unwrapArgument(current));
    current = '';
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      current += character;
      escaped = true;
      continue;
    }
    if (quote) {
      current += character;
      if (character === quote) quote = '';
      continue;
    }
    if (quoteCanOpen(source, index, character)) {
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
      if (depth === 0) return { arguments: [], error: 'Function arguments contain an unmatched closing brace.' };
      depth -= 1;
      current += character;
      continue;
    }
    if (character === ';' && depth === 0) {
      commit();
      if (values.length > maxArguments) {
        return { arguments: [], error: `Functions accept at most ${maxArguments} arguments.` };
      }
      continue;
    }
    current += character;
  }

  if (escaped) return { arguments: [], error: 'Function arguments end with an unfinished escape.' };
  if (quote) return { arguments: [], error: 'Function arguments contain an unterminated quote.' };
  if (depth !== 0) return { arguments: [], error: 'Function arguments contain an unterminated brace group.' };
  commit();
  if (values.length > maxArguments) {
    return { arguments: [], error: `Functions accept at most ${maxArguments} arguments.` };
  }
  return { arguments: values, error: '' };
}

function functionCallAt(sourceValue, indexValue, options = {}) {
  const source = String(sourceValue ?? '');
  const index = Math.max(0, Math.trunc(Number(indexValue) || 0));
  if (source[index] !== '@') return null;
  const match = source.slice(index + 1).match(/^([A-Za-z][A-Za-z0-9_]*)/u);
  if (!match) return null;
  const name = normalizeFunctionName(match[1]);
  const openIndex = index + 1 + match[1].length;
  if (!name || source[openIndex] !== '{') return null;

  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let cursor = openIndex; cursor < source.length; cursor += 1) {
    const character = source[cursor];
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
    if (quoteCanOpen(source, cursor, character)) {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        const rawArguments = source.slice(openIndex + 1, cursor);
        const split = splitFunctionArguments(rawArguments, options);
        return split.error
          ? { name, raw: source.slice(index, cursor + 1), start: index, end: cursor + 1, arguments: [], error: split.error }
          : { name, raw: source.slice(index, cursor + 1), start: index, end: cursor + 1, arguments: split.arguments, error: '' };
      }
    }
  }
  return {
    name,
    raw: source.slice(index),
    start: index,
    end: source.length,
    arguments: [],
    error: `Function call @${name}{...} has an unterminated brace group.`
  };
}

function substituteFunctionArguments(value, argumentsValue = []) {
  const source = String(value ?? '');
  const args = Array.isArray(argumentsValue)
    ? argumentsValue.slice(0, DEFAULT_MAX_FUNCTION_ARGUMENTS).map((entry) => String(entry ?? ''))
    : [];
  let output = '';
  for (let index = 0; index < source.length;) {
    if (source[index] === '\\' && source[index + 1] === '%') {
      output += LITERAL_PERCENT_SENTINEL;
      index += 2;
      continue;
    }
    if (source[index] === '%' && source[index + 1] === '%') {
      output += LITERAL_PERCENT_SENTINEL;
      index += 2;
      continue;
    }
    if (source[index] === '%') {
      const match = source.slice(index + 1).match(/^(?:[1-9][0-9]?|0)/u);
      if (match) {
        const position = Number(match[0]);
        output += position === 0 ? args.join(';') : (args[position - 1] ?? '');
        index += 1 + match[0].length;
        continue;
      }
    }
    output += source[index];
    index += 1;
  }
  return output.replaceAll(LITERAL_PERCENT_SENTINEL, '%');
}

class FunctionEngine {
  constructor(options = {}) {
    this.maxFunctions = Math.max(1, Math.trunc(Number(options.maxFunctions) || DEFAULT_MAX_FUNCTIONS));
    this.functions = new Map();
    this.revision = 0;
    if (Array.isArray(options.functions)) this.replaceAll(options.functions);
  }

  define(nameValue, bodyValue, classNameValue = '') {
    const name = normalizeFunctionName(nameValue);
    const body = normalizeFunctionBody(bodyValue);
    const className = normalizeClassName(classNameValue);
    if (!name || !body) return null;
    if (!this.functions.has(name) && this.functions.size >= this.maxFunctions) return null;
    const record = Object.freeze({ name, body, scope: 'global', className });
    this.functions.set(name, record);
    this.revision += 1;
    return detachedRecord(record);
  }

  get(nameValue) {
    const record = this.functions.get(normalizeFunctionName(nameValue));
    return record ? detachedRecord(record) : null;
  }

  list() {
    return [...this.functions.values()]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(detachedRecord);
  }

  delete(nameValue) {
    const deleted = this.functions.delete(normalizeFunctionName(nameValue));
    if (deleted) this.revision += 1;
    return deleted;
  }

  clear() {
    if (this.functions.size > 0) {
      this.functions.clear();
      this.revision += 1;
    }
  }

  replaceAll(records = []) {
    const source = Array.isArray(records) ? records.slice(0, this.maxFunctions * 4) : [];
    const next = new Map();
    for (const raw of source) {
      const record = raw && typeof raw === 'object' ? raw : {};
      const name = normalizeFunctionName(record.name);
      const body = normalizeFunctionBody(record.body);
      const className = normalizeClassName(record.className);
      if (!name || !body) continue;
      if (!next.has(name) && next.size >= this.maxFunctions) continue;
      next.set(name, Object.freeze({ name, body, scope: 'global', className }));
    }
    this.functions = next;
    this.revision += 1;
    return this.list();
  }
}

module.exports = {
  FunctionEngine,
  normalizeFunctionName,
  normalizeFunctionBody,
  splitFunctionArguments,
  functionCallAt,
  substituteFunctionArguments,
  LITERAL_AT_SENTINEL,
  FUNCTION_NAME_MAX,
  FUNCTION_BODY_MAX,
  FUNCTION_OUTPUT_MAX,
  DEFAULT_MAX_FUNCTIONS,
  DEFAULT_MAX_FUNCTION_ARGUMENTS,
  DEFAULT_MAX_FUNCTION_DEPTH,
  DEFAULT_MAX_FUNCTION_CALLS
};
