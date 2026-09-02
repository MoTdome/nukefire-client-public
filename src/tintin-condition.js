'use strict';

const { matchTinTinWhole, MAX_TINTIN_REGEXP_PATTERN } = require('./tintin-regexp');

const MAX_TINTIN_CONDITION_LENGTH = 4096;
const MAX_TINTIN_CONDITION_DEPTH = 32;
const MAX_TINTIN_REGEX_LENGTH = MAX_TINTIN_REGEXP_PATTERN;

function conditionError(message) {
  return { ok: false, value: false, error: `Conditional error: ${message}` };
}

function normalizeCondition(value) {
  return String(value ?? '').normalize('NFKC').trim();
}

function scanTopLevel(source, visitor) {
  let quote = '';
  let escaped = false;
  let braceDepth = 0;
  let parenDepth = 0;

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
    if (character === '{') {
      braceDepth += 1;
      continue;
    }
    if (character === '}') {
      if (braceDepth > 0) braceDepth -= 1;
      continue;
    }
    if (braceDepth > 0) continue;
    if (character === '(') {
      parenDepth += 1;
      continue;
    }
    if (character === ')') {
      if (parenDepth > 0) parenDepth -= 1;
      continue;
    }
    if (parenDepth === 0) {
      const result = visitor(index);
      if (result !== undefined) return result;
    }
  }
  return undefined;
}

function hasWholeOuterParens(source) {
  if (!source.startsWith('(') || !source.endsWith(')')) return false;
  let depth = 0;
  let quote = '';
  let escaped = false;
  let braceDepth = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) { escaped = false; continue; }
    if (character === '\\') { escaped = true; continue; }
    if (quote) { if (character === quote) quote = ''; continue; }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character === '{') { braceDepth += 1; continue; }
    if (character === '}') { if (braceDepth > 0) braceDepth -= 1; continue; }
    if (braceDepth > 0) continue;
    if (character === '(') depth += 1;
    else if (character === ')') {
      depth -= 1;
      if (depth === 0 && index !== source.length - 1) return false;
    }
  }
  return depth === 0;
}

function unwrapCondition(sourceValue) {
  let source = normalizeCondition(sourceValue);
  while (hasWholeOuterParens(source)) source = source.slice(1, -1).trim();
  return source;
}

function splitTopLevelOperator(source, operator) {
  return scanTopLevel(source, (index) => {
    if (!source.startsWith(operator, index)) return undefined;
    return [source.slice(0, index), source.slice(index + operator.length)];
  });
}

function findTopLevelComparison(source) {
  const operators = ['!==', '===', '!=', '==', '<=', '>=', '<', '>'];
  return scanTopLevel(source, (index) => {
    for (const operator of operators) {
      if (source.startsWith(operator, index)) {
        return { operator, index };
      }
    }
    return undefined;
  });
}

function isWholeWrapper(source, open, close) {
  if (!source.startsWith(open) || !source.endsWith(close)) return false;
  if (open === '(') return hasWholeOuterParens(source);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) { escaped = false; continue; }
    if (character === '\\') { escaped = true; continue; }
    if (quote) { if (character === quote) quote = ''; continue; }
    if (character === '"' || character === "'") { quote = character; continue; }
    if (character === open) depth += 1;
    else if (character === close) {
      depth -= 1;
      if (depth === 0 && index !== source.length - 1) return false;
    }
  }
  return depth === 0;
}

function decodeStringOperand(value) {
  let source = normalizeCondition(value);
  if (source.length >= 2) {
    const first = source[0];
    const last = source[source.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      source = source.slice(1, -1);
    } else if (first === '{' && last === '}' && isWholeWrapper(source, '{', '}')) {
      source = source.slice(1, -1);
    }
  }
  return source.replace(/\\([\\"'{}])/gu, '$1');
}


function regexEquals(left, patternValue) {
  const matched = matchTinTinWhole(left, patternValue);
  if (matched.error) {
    return {
      ok: false,
      value: false,
      error: matched.error.replace(/^TinTin REGEXP expression/u, 'Conditional regex').replace(/^TinTin REGEXP/u, 'Conditional regex')
    };
  }
  return { ok: true, value: matched.matched, error: '' };
}

function evaluateNode(sourceValue, options, depth) {
  if (depth > MAX_TINTIN_CONDITION_DEPTH) return conditionError('expression nesting is too deep.');
  const source = unwrapCondition(sourceValue);
  if (!source) return conditionError('expression is empty.');

  const orParts = splitTopLevelOperator(source, '||');
  if (orParts) {
    const left = evaluateNode(orParts[0], options, depth + 1);
    if (!left.ok || left.value) return left;
    return evaluateNode(orParts[1], options, depth + 1);
  }

  const andParts = splitTopLevelOperator(source, '&&');
  if (andParts) {
    const left = evaluateNode(andParts[0], options, depth + 1);
    if (!left.ok || !left.value) return left;
    return evaluateNode(andParts[1], options, depth + 1);
  }

  if (source.startsWith('!') && !source.startsWith('!=')) {
    const nested = evaluateNode(source.slice(1), options, depth + 1);
    return nested.ok ? { ok: true, value: !nested.value, error: '' } : nested;
  }

  const comparison = findTopLevelComparison(source);
  if (comparison) {
    const leftRaw = source.slice(0, comparison.index).trim();
    const rightRaw = source.slice(comparison.index + comparison.operator.length).trim();
    if (!leftRaw || !rightRaw) return conditionError('comparison is missing an operand.');

    const left = decodeStringOperand(leftRaw);
    const right = decodeStringOperand(rightRaw);

    if (comparison.operator === '===' || comparison.operator === '!==') {
      const equal = left === right;
      return { ok: true, value: comparison.operator === '===' ? equal : !equal, error: '' };
    }
    if (comparison.operator === '==' || comparison.operator === '!=') {
      const matched = regexEquals(left, right);
      if (!matched.ok) return matched;
      return { ok: true, value: comparison.operator === '==' ? matched.value : !matched.value, error: '' };
    }

    const numeric = options.evaluateNumeric?.(source);
    if (numeric?.ok === true) return { ok: true, value: Number(numeric.value) !== 0, error: '' };
    return conditionError(numeric?.error || 'relational comparisons require numeric operands.');
  }

  if (typeof options.evaluateNumeric === 'function') {
    const numeric = options.evaluateNumeric(source);
    if (numeric?.ok === true) {
      return { ok: true, value: Number(numeric.value) !== 0, error: '' };
    }
    const wrappedString = (source.startsWith('\"') && source.endsWith('\"'))
      || (source.startsWith("'") && source.endsWith("'"))
      || (source.startsWith('{') && source.endsWith('}'));
    if (!wrappedString) return conditionError(numeric?.error || 'expression is invalid.');
  }

  const stringValue = decodeStringOperand(source);
  return { ok: true, value: stringValue.length > 0 && stringValue !== '0', error: '' };
}

function evaluateTinTinCondition(value, options = {}) {
  const source = normalizeCondition(value);
  if (!source) return conditionError('expression is empty.');
  if (source.length > MAX_TINTIN_CONDITION_LENGTH) {
    return conditionError(`expression may contain at most ${MAX_TINTIN_CONDITION_LENGTH} characters.`);
  }
  if (/[^\P{Cc}\t]/u.test(source)) return conditionError('expression contains unsupported control characters.');
  return evaluateNode(source, options, 0);
}

module.exports = {
  evaluateTinTinCondition,
  decodeStringOperand,
  MAX_TINTIN_CONDITION_LENGTH,
  MAX_TINTIN_CONDITION_DEPTH,
  MAX_TINTIN_REGEX_LENGTH
};
