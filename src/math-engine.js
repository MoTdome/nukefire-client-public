'use strict';

const { matchTinTinWhole } = require('./tintin-regexp');

const MAX_MATH_EXPRESSION_LENGTH = 4096;
const MAX_MATH_TOKENS = 512;
const MAX_MATH_OPERATIONS = 1000;
const MAX_MATH_DICE = 1000;
const MAX_MATH_DIE_SIDES = 1_000_000;
const MAX_MATH_ROOT_DEGREE = 16;
const MAX_MATH_SHIFT = 53;
const MAX_MATH_ABSOLUTE = 1e100;
const MAX_MATH_RESULT_LENGTH = 128;

const BINARY_BINDING = Object.freeze({
  '||': [20, 21],
  '^^': [25, 26],
  '&&': [30, 31],
  '|': [40, 41],
  '^': [50, 51],
  '&': [60, 61],
  '==': [70, 71],
  '!=': [70, 71],
  '<': [80, 81],
  '<=': [80, 81],
  '>': [80, 81],
  '>=': [80, 81],
  '<<': [90, 91],
  '>>': [90, 91],
  '+': [100, 101],
  '-': [100, 101],
  '*': [110, 111],
  '/': [110, 111],
  '//': [110, 111],
  '%': [110, 111],
  d: [115, 116],
  '**': [120, 120]
});

function mathError(message) {
  return new Error(`Math error: ${message}`);
}

function tokenizeMathExpression(value, options = {}) {
  const source = String(value ?? '').normalize('NFKC').trim();
  const maximumLength = Math.max(1, Math.trunc(Number(options.maxLength) || MAX_MATH_EXPRESSION_LENGTH));
  const maximumTokens = Math.max(1, Math.trunc(Number(options.maxTokens) || MAX_MATH_TOKENS));
  if (!source) return { tokens: [], error: 'Math expression is empty.' };
  if (source.length > maximumLength) return { tokens: [], error: `Math expression may contain at most ${maximumLength} characters.` };
  if (/[^\P{Cc}\t]/u.test(source)) return { tokens: [], error: 'Math expression contains unsupported control characters.' };

  const tokens = [];
  let index = 0;
  const push = (token) => {
    tokens.push(token);
    if (tokens.length > maximumTokens) throw mathError(`expression may contain at most ${maximumTokens} tokens.`);
  };

  try {
    while (index < source.length) {
      if (/\s/u.test(source[index])) {
        index += 1;
        continue;
      }

      if (source[index] === '"') {
        let cursor = index + 1;
        let text = '';
        let escaped = false;
        for (; cursor < source.length; cursor += 1) {
          const character = source[cursor];
          if (escaped) { text += character; escaped = false; continue; }
          if (character === '\\') { escaped = true; continue; }
          if (character === '"') break;
          text += character;
        }
        if (cursor >= source.length) return { tokens: [], error: 'Math string is missing a closing double quote.' };
        push({ type: 'string', raw: source.slice(index, cursor + 1), value: text });
        index = cursor + 1;
        continue;
      }

      const timeMatch = source.slice(index).match(/^\d+(?::\d+){1,3}(?:\.\d+)?/u);
      if (timeMatch) {
        const raw = timeMatch[0];
        const parts = raw.split(':').map(Number);
        if (parts.some((part) => !Number.isFinite(part))) return { tokens: [], error: `Math time value is invalid: ${raw}.` };
        const number = parts.length === 4
          ? parts[0] * 86400 + parts[1] * 3600 + parts[2] * 60 + parts[3]
          : parts.reduce((total, part) => total * 60 + part, 0);
        push({ type: 'number', raw, value: number, floating: raw.includes('.') });
        index += raw.length;
        continue;
      }

      const numberMatch = source.slice(index).match(/^(?:(?:\d[\d,]*)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/u);
      if (numberMatch) {
        const raw = numberMatch[0];
        if (/,,|^,|,$/u.test(raw) || !/^\d{1,3}(?:,\d{3})*(?:\.\d*)?(?:[eE][+-]?\d+)?$|^\d+(?:\.\d*)?(?:[eE][+-]?\d+)?$|^\.\d+(?:[eE][+-]?\d+)?$/u.test(raw)) {
          return { tokens: [], error: `Math expression has an invalid number near "${raw}".` };
        }
        const number = Number(raw.replaceAll(',', ''));
        if (!Number.isFinite(number)) return { tokens: [], error: `Math number is not finite: ${raw}.` };
        push({ type: 'number', raw, value: number, floating: /[.eE]/u.test(raw) });
        index += raw.length;
        continue;
      }

      const wordMatch = source.slice(index).match(/^(true|false)/iu);
      if (wordMatch) {
        const word = wordMatch[0].toLowerCase();
        push({ type: 'number', raw: wordMatch[0], value: word === 'true' ? 1 : 0, floating: false });
        index += wordMatch[0].length;
        continue;
      }

      const pair = source.slice(index, index + 2);
      if (['**', '//', '<<', '>>', '<=', '>=', '==', '!=', '&&', '^^', '||'].includes(pair)) {
        push({ type: 'operator', value: pair });
        index += 2;
        continue;
      }

      const character = source[index];
      if ('()+-*/%!~<>&^|?:'.includes(character)) {
        if (character === '(' || character === ')') push({ type: 'paren', value: character });
        else push({ type: 'operator', value: character });
        index += 1;
        continue;
      }
      if (character === 'd' || character === 'D') {
        push({ type: 'operator', value: 'd' });
        index += 1;
        continue;
      }

      return { tokens: [], error: `Math expression contains unsupported text near "${source.slice(index, index + 16)}".` };
    }
  } catch (error) {
    return { tokens: [], error: error?.message || String(error) };
  }

  return { tokens, error: '' };
}

class MathParser {
  constructor(tokens, options = {}) {
    this.tokens = Array.isArray(tokens) ? tokens : [];
    this.index = 0;
    this.nodes = 0;
    this.maxNodes = Math.max(1, Math.trunc(Number(options.maxNodes) || MAX_MATH_OPERATIONS));
  }

  peek() {
    return this.tokens[this.index] || null;
  }

  consume() {
    const token = this.peek();
    if (token) this.index += 1;
    return token;
  }

  node(value) {
    this.nodes += 1;
    if (this.nodes > this.maxNodes) throw mathError(`expression may contain at most ${this.maxNodes} operations.`);
    return value;
  }

  parse() {
    const expression = this.parseExpression(0);
    const trailing = this.peek();
    if (trailing) throw mathError(`unexpected token "${trailing.raw || trailing.value}".`);
    return expression;
  }

  parseExpression(minimumBinding) {
    let left = this.parsePrefix();

    while (true) {
      const token = this.peek();
      if (!token || token.type !== 'operator') break;

      if (token.value === '?') {
        const binding = 10;
        if (binding < minimumBinding) break;
        this.consume();
        const consequent = this.parseExpression(0);
        const colon = this.consume();
        if (!colon || colon.type !== 'operator' || colon.value !== ':') throw mathError('ternary expression is missing a colon.');
        const alternate = this.parseExpression(binding);
        left = this.node({ type: 'ternary', condition: left, consequent, alternate });
        continue;
      }

      const binding = BINARY_BINDING[token.value];
      if (!binding || binding[0] < minimumBinding) break;
      this.consume();
      const right = this.parseExpression(binding[1]);
      left = this.node({ type: 'binary', operator: token.value, left, right });
    }

    return left;
  }

  parsePrefix() {
    const token = this.consume();
    if (!token) throw mathError('expression ended unexpectedly.');
    if (token.type === 'number') {
      return this.node({ type: 'number', value: token.value, floating: token.floating });
    }
    if (token.type === 'string') {
      return this.node({ type: 'string', value: token.value });
    }
    if (token.type === 'paren' && token.value === '(') {
      const expression = this.parseExpression(0);
      const closing = this.consume();
      if (!closing || closing.type !== 'paren' || closing.value !== ')') throw mathError('missing closing parenthesis.');
      return expression;
    }
    if (token.type === 'operator' && ['+', '-', '!', '~'].includes(token.value)) {
      return this.node({ type: 'unary', operator: token.value, argument: this.parseExpression(130) });
    }
    throw mathError(`unexpected token "${token.raw || token.value}".`);
  }
}

function ensureNumber(value, label = 'result') {
  if (!Number.isFinite(value)) throw mathError(`${label} is not finite.`);
  if (Math.abs(value) > MAX_MATH_ABSOLUTE) throw mathError(`${label} exceeds the supported magnitude of ${MAX_MATH_ABSOLUTE}.`);
  if (Number.isInteger(value) && !Number.isSafeInteger(value)) throw mathError(`${label} exceeds safe integer precision.`);
  return Object.is(value, -0) ? 0 : value;
}

function integerOperand(value, label) {
  const number = ensureNumber(value, label);
  if (!Number.isSafeInteger(number)) throw mathError(`${label} must be a safe integer.`);
  return number;
}

function finiteResult(value, floating, label = 'result') {
  return { value: ensureNumber(value, label), floating: Boolean(floating || !Number.isInteger(value)) };
}

function evaluateMathAst(ast, options = {}) {
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const maximumOperations = Math.max(1, Math.trunc(Number(options.maxOperations) || MAX_MATH_OPERATIONS));
  let operations = 0;

  const evaluate = (node) => {
    operations += 1;
    if (operations > maximumOperations) throw mathError(`evaluation may perform at most ${maximumOperations} operations.`);
    if (!node) throw mathError('expression is incomplete.');

    if (node.type === 'number') return finiteResult(node.value, node.floating, 'number');
    if (node.type === 'string') return { value: String(node.value ?? ''), floating: false, string: true };

    if (node.type === 'unary') {
      const argument = evaluate(node.argument);
      if (argument.string) throw mathError(`unary ${node.operator} requires a numeric operand.`);
      if (node.operator === '+') return argument;
      if (node.operator === '-') return finiteResult(-argument.value, argument.floating, 'unary result');
      if (node.operator === '!') return { value: argument.value === 0 ? 1 : 0, floating: false };
      if (node.operator === '~') {
        const integer = integerOperand(argument.value, 'bitwise operand');
        return finiteResult(Number(~BigInt(integer)), false, 'bitwise result');
      }
    }

    if (node.type === 'ternary') {
      const condition = evaluate(node.condition);
      const truth = condition.string ? false : condition.value !== 0;
      return truth ? evaluate(node.consequent) : evaluate(node.alternate);
    }

    if (node.type !== 'binary') throw mathError('unknown expression node.');
    if (node.operator === '&&') {
      const left = evaluate(node.left);
      const leftTrue = !left.string && left.value !== 0;
      if (!leftTrue) return { value: 0, floating: false };
      const right = evaluate(node.right);
      return { value: !right.string && right.value !== 0 ? 1 : 0, floating: false };
    }
    if (node.operator === '||') {
      const left = evaluate(node.left);
      const leftTrue = !left.string && left.value !== 0;
      if (leftTrue) return { value: 1, floating: false };
      const right = evaluate(node.right);
      return { value: !right.string && right.value !== 0 ? 1 : 0, floating: false };
    }
    if (node.operator === '^^') {
      const left = evaluate(node.left);
      const right = evaluate(node.right);
      const leftTrue = !left.string && left.value !== 0;
      const rightTrue = !right.string && right.value !== 0;
      return { value: leftTrue !== rightTrue ? 1 : 0, floating: false };
    }

    const left = evaluate(node.left);
    const right = evaluate(node.right);

    if (['<', '<=', '>', '>=', '==', '!='].includes(node.operator) && left.string) {
      const leftText = String(left.value ?? '');
      const rightText = String(right.value ?? '');
      let result;
      if (node.operator === '==' || node.operator === '!=') {
        const matched = matchTinTinWhole(leftText, rightText);
        if (matched.error) throw mathError(matched.error.replace(/^TinTin REGEXP\s*/u, 'regexp '));
        result = matched.matched;
        if (node.operator === '!=') result = !result;
      } else {
        const comparison = leftText < rightText ? -1 : leftText > rightText ? 1 : 0;
        result = node.operator === '<' ? comparison < 0
          : node.operator === '<=' ? comparison <= 0
            : node.operator === '>' ? comparison > 0
              : comparison >= 0;
      }
      return { value: result ? 1 : 0, floating: false };
    }

    if (left.string || right.string) throw mathError(`operator ${node.operator} requires numeric operands unless the left operand is a quoted string comparison.`);
    const floating = left.floating || right.floating;

    if (node.operator === '+') return finiteResult(left.value + right.value, floating, 'addition result');
    if (node.operator === '-') return finiteResult(left.value - right.value, floating, 'subtraction result');
    if (node.operator === '*') return finiteResult(left.value * right.value, floating, 'multiplication result');
    if (node.operator === '/') {
      if (right.value === 0) throw mathError('division by zero.');
      const quotient = left.value / right.value;
      return floating
        ? finiteResult(quotient, true, 'division result')
        : finiteResult(Math.trunc(quotient), false, 'division result');
    }
    if (node.operator === '%') {
      if (right.value === 0) throw mathError('modulo by zero.');
      return finiteResult(left.value % right.value, floating, 'modulo result');
    }
    if (node.operator === '**') {
      if (left.value === 0 && right.value < 0) throw mathError('zero cannot be raised to a negative power.');
      return finiteResult(left.value ** right.value, floating, 'power result');
    }
    if (node.operator === '//') {
      const degree = integerOperand(right.value, 'root degree');
      if (degree < 2 || degree > MAX_MATH_ROOT_DEGREE) throw mathError(`root degree must be between 2 and ${MAX_MATH_ROOT_DEGREE}.`);
      if (left.value < 0 && degree % 2 === 0) throw mathError('an even root of a negative number is not real.');
      const root = left.value < 0 ? -((-left.value) ** (1 / degree)) : left.value ** (1 / degree);
      return finiteResult(root, true, 'root result');
    }
    if (node.operator === 'd') {
      const count = integerOperand(left.value, 'dice count');
      const sides = integerOperand(right.value, 'die sides');
      if (count < 0 || count > MAX_MATH_DICE) throw mathError(`dice count must be between 0 and ${MAX_MATH_DICE}.`);
      if (sides < 1 || sides > MAX_MATH_DIE_SIDES) throw mathError(`die sides must be between 1 and ${MAX_MATH_DIE_SIDES}.`);
      let total = 0;
      for (let index = 0; index < count; index += 1) {
        const roll = Number(random());
        if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw mathError('random source returned a value outside [0, 1).');
        total += Math.floor(roll * sides) + 1;
      }
      return finiteResult(total, false, 'dice result');
    }

    if (['<', '<=', '>', '>=', '==', '!='].includes(node.operator)) {
      const result = {
        '<': left.value < right.value,
        '<=': left.value <= right.value,
        '>': left.value > right.value,
        '>=': left.value >= right.value,
        '==': left.value === right.value,
        '!=': left.value !== right.value
      }[node.operator];
      return { value: result ? 1 : 0, floating: false };
    }

    if (['&', '|', '^', '<<', '>>'].includes(node.operator)) {
      const leftInteger = integerOperand(left.value, 'left bitwise operand');
      const rightInteger = integerOperand(right.value, 'right bitwise operand');
      let result;
      if (node.operator === '&') result = BigInt(leftInteger) & BigInt(rightInteger);
      else if (node.operator === '|') result = BigInt(leftInteger) | BigInt(rightInteger);
      else if (node.operator === '^') result = BigInt(leftInteger) ^ BigInt(rightInteger);
      else {
        if (rightInteger < 0 || rightInteger > MAX_MATH_SHIFT) throw mathError(`shift count must be between 0 and ${MAX_MATH_SHIFT}.`);
        result = node.operator === '<<'
          ? BigInt(leftInteger) << BigInt(rightInteger)
          : BigInt(leftInteger) >> BigInt(rightInteger);
      }
      return finiteResult(Number(result), false, 'bitwise result');
    }

    throw mathError(`unsupported operator ${node.operator}.`);
  };

  const result = evaluate(ast);
  return { ...result, operations };
}

function formatMathResult(value) {
  const number = ensureNumber(value);
  if (Number.isInteger(number)) return String(number);
  const text = Number.parseFloat(number.toPrecision(15)).toString();
  if (text.length > MAX_MATH_RESULT_LENGTH) throw mathError(`result exceeds ${MAX_MATH_RESULT_LENGTH} characters.`);
  return text;
}

function evaluateMathExpression(expressionValue, options = {}) {
  const tokenized = tokenizeMathExpression(expressionValue, options);
  if (tokenized.error) return { ok: false, value: 0, text: '', error: tokenized.error, tokens: 0, operations: 0 };
  try {
    const parser = new MathParser(tokenized.tokens, options);
    const ast = parser.parse();
    const evaluated = evaluateMathAst(ast, options);
    return {
      ok: true,
      value: evaluated.value,
      text: formatMathResult(evaluated.value),
      error: '',
      tokens: tokenized.tokens.length,
      operations: evaluated.operations
    };
  } catch (error) {
    return {
      ok: false,
      value: 0,
      text: '',
      error: error?.message || String(error),
      tokens: tokenized.tokens.length,
      operations: 0
    };
  }
}

module.exports = {
  evaluateMathExpression,
  tokenizeMathExpression,
  formatMathResult,
  MAX_MATH_EXPRESSION_LENGTH,
  MAX_MATH_TOKENS,
  MAX_MATH_OPERATIONS,
  MAX_MATH_DICE,
  MAX_MATH_DIE_SIDES,
  MAX_MATH_ROOT_DEGREE,
  MAX_MATH_SHIFT,
  MAX_MATH_ABSOLUTE,
  MAX_MATH_RESULT_LENGTH
};
