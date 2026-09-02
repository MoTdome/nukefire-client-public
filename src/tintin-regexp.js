'use strict';

const MAX_TINTIN_REGEXP_PATTERN = 512;
const MAX_TINTIN_REGEXP_INPUT = 16384;
const MAX_TINTIN_REGEXP_CAPTURES = 99;

function escapeRegexCharacter(character) {
  return /[\\^$.*+?()[\]{}|]/u.test(character) ? `\\${character}` : character;
}

function wholeBraceAt(source, start) {
  if (source[start] !== '{') return null;
  let depth = 0;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) { escaped = false; continue; }
    if (character === '\\') { escaped = true; continue; }
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return { body: source.slice(start + 1, index), end: index + 1 };
    }
  }
  return null;
}

function unsafeRawRegexp(sourceValue) {
  const source = String(sourceValue || '');
  if (source.length > MAX_TINTIN_REGEXP_PATTERN) return true;
  // Keep raw-regexp compatibility useful without admitting the common nested-
  // quantifier shapes that can monopolize Electron's single JS thread.
  if (/\\[1-9]/u.test(source)) return true;
  if (/\((?:\?:)?[^)]*[+*][^)]*\)\s*(?:[+*]|\{\d)/u.test(source)) return true;
  return false;
}

function compileTinTinRegexp(patternValue, options = {}) {
  const pattern = String(patternValue ?? '').normalize('NFKC');
  const maximum = Math.max(1, Math.trunc(Number(options.maxPatternLength) || MAX_TINTIN_REGEXP_PATTERN));
  if (!pattern) return { regex: null, captures: [], source: '', error: 'TinTin REGEXP expression cannot be empty.' };
  if (pattern.length > maximum) return { regex: null, captures: [], source: '', error: `TinTin REGEXP expression may contain at most ${maximum} characters.` };
  if (/[^\P{Cc}\t]/u.test(pattern)) return { regex: null, captures: [], source: '', error: 'TinTin REGEXP expression contains unsupported control characters.' };

  let source = '';
  let index = 0;
  let captureSerial = 0;
  let nextCapture = 1;
  let ignoreCase = false;
  let sawMatcher = false;
  const captures = [];

  const addCapture = (body, target, lazyCapable = false, trailing = true) => {
    if (target < 0 || target > MAX_TINTIN_REGEXP_CAPTURES) throw new Error('capture index is outside 0-99.');
    captureSerial += 1;
    const group = `tt${captureSerial}`;
    let finalBody = body;
    if (lazyCapable && trailing && body.endsWith('*')) finalBody = `${body.slice(0, -1)}*?`;
    if (lazyCapable && trailing && body.endsWith('+')) finalBody = `${body.slice(0, -1)}+?`;
    if (lazyCapable && trailing && body.endsWith('?')) finalBody = `${body.slice(0, -1)}??`;
    source += `(?<${group}>${finalBody})`;
    captures.push({ group, target });
    nextCapture = Math.max(nextCapture, target + 1);
    sawMatcher = true;
  };

  try {
    while (index < pattern.length) {
      const character = pattern[index];
      const next = pattern[index + 1] || '';

      if (character === '%' && (next === 'i' || next === 'I')) {
        if (sawMatcher) return { regex: null, captures: [], source: '', error: 'TinTin REGEXP %i/%I case mode must appear before the matching expression in NukeFire.' };
        ignoreCase = next === 'i';
        index += 2;
        continue;
      }

      if (character === '\\') {
        if (index + 1 >= pattern.length) return { regex: null, captures: [], source: '', error: 'TinTin REGEXP cannot end with an unfinished escape.' };
        source += `\\${pattern[index + 1]}`;
        sawMatcher = true;
        index += 2;
        continue;
      }

      if (character === '{') {
        const raw = wholeBraceAt(pattern, index);
        if (!raw) return { regex: null, captures: [], source: '', error: 'TinTin REGEXP raw expression has an unmatched brace.' };
        if (unsafeRawRegexp(raw.body)) return { regex: null, captures: [], source: '', error: 'TinTin REGEXP raw expression was blocked because it contains an unsafe or unbounded regex construct.' };
        if (nextCapture > MAX_TINTIN_REGEXP_CAPTURES) return { regex: null, captures: [], source: '', error: 'TinTin REGEXP may expose at most 99 captures.' };
        captureSerial += 1;
        const group = `tt${captureSerial}`;
        source += `(?<${group}>${raw.body})`;
        captures.push({ group, target: nextCapture });
        nextCapture += 1;
        sawMatcher = true;
        index = raw.end;
        continue;
      }

      if (character === '%' && next === '%') {
        source += '%';
        sawMatcher = true;
        index += 2;
        continue;
      }

      if (character === '%') {
        const numbered = pattern.slice(index + 1).match(/^(?:[1-9][0-9]?|0)/u);
        if (numbered) {
          const target = Number(numbered[0]);
          const end = index + 1 + numbered[0].length;
          addCapture('.*', target, true, end < pattern.length);
          index = end;
          continue;
        }
        const token = next;
        const bodies = {
          d: '[0-9]*', D: '[^0-9]*', s: '\\s*', S: '\\S*',
          w: '[A-Za-z]*', W: '[^A-Za-z]*', '?': '.?', '*': '.*', '+': '.+', '.': '.'
        };
        if (Object.hasOwn(bodies, token)) {
          if (nextCapture > MAX_TINTIN_REGEXP_CAPTURES) return { regex: null, captures: [], source: '', error: 'TinTin REGEXP may expose at most 99 captures.' };
          const end = index + 2;
          addCapture(bodies[token], nextCapture, ['d','D','s','S','w','W','?','*','+'].includes(token), end < pattern.length);
          index = end;
          continue;
        }
      }

      if (character === '^' && /^\^*$/u.test(source)) {
        source += '^';
        index += 1;
        continue;
      }
      if (character === '$' && index === pattern.length - 1) source += '$';
      else source += escapeRegexCharacter(character);
      sawMatcher = true;
      index += 1;
    }

    const regex = new RegExp(source, ignoreCase ? 'iu' : 'u');
    return { regex, captures, source, error: '' };
  } catch (error) {
    return { regex: null, captures: [], source: '', error: `TinTin REGEXP expression is invalid: ${error?.message || error}` };
  }
}

function matchTinTinRegexp(stringValue, patternValue, options = {}) {
  const input = String(stringValue ?? '');
  const maximum = Math.max(1, Math.trunc(Number(options.maxInputLength) || MAX_TINTIN_REGEXP_INPUT));
  if (input.length > maximum) return { matched: false, captures: {}, match: '', error: `TinTin REGEXP input may contain at most ${maximum} characters.` };
  const compiled = compileTinTinRegexp(patternValue, options);
  if (compiled.error) return { matched: false, captures: {}, match: '', error: compiled.error };
  const match = compiled.regex.exec(input);
  if (!match) return { matched: false, captures: {}, match: '', error: '' };
  const captures = { 0: match[0] || '' };
  for (const entry of compiled.captures) captures[entry.target] = match.groups?.[entry.group] ?? '';
  return { matched: true, captures, match: match[0] || '', error: '' };
}

function matchTinTinWhole(stringValue, patternValue, options = {}) {
  const pattern = String(patternValue ?? '');
  return matchTinTinRegexp(stringValue, `^${pattern}$`, options);
}

function substituteTinTinCommandCaptures(commandValue, capturesValue = {}) {
  const captures = capturesValue && typeof capturesValue === 'object' ? capturesValue : {};
  const literalAmpersand = '\uE12F';
  return String(commandValue ?? '')
    .replace(/&&/gu, literalAmpersand)
    .replace(/&((?:[1-9][0-9]?|0))(?!\d)/gu, (_match, digits) => String(captures[Number(digits)] ?? ''))
    .replaceAll(literalAmpersand, '&');
}

module.exports = {
  compileTinTinRegexp,
  matchTinTinRegexp,
  matchTinTinWhole,
  substituteTinTinCommandCaptures,
  MAX_TINTIN_REGEXP_PATTERN,
  MAX_TINTIN_REGEXP_INPUT,
  MAX_TINTIN_REGEXP_CAPTURES
};
