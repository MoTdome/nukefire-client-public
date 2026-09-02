'use strict';

(function exposeTinTinInputEditor(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireTinTinInputEditor = api;
})(typeof window !== 'undefined' ? window : globalThis, function createTinTinInputEditor() {
const AUTO_TAB_TRAILING_PUNCTUATION = /[.,;]$/u;

function clampPosition(value, position) {
  const length = String(value ?? '').length;
  const numeric = Number(position);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(length, Math.trunc(numeric))) : length;
}

function lastWordRange(value, selectionStart, selectionEnd) {
  const text = String(value ?? '');
  const start = clampPosition(text, selectionStart);
  const end = clampPosition(text, selectionEnd);
  if (!text || start !== end || end !== text.length || text.endsWith(' ')) return null;
  const wordStart = text.lastIndexOf(' ', end - 1) + 1;
  return { start: wordStart, end, prefix: text.slice(wordStart, end) };
}

function uniquePrefixMatches(valuesValue, prefixValue) {
  const prefix = String(prefixValue ?? '');
  const seen = new Set();
  const matches = [];
  for (const raw of Array.isArray(valuesValue) ? valuesValue : []) {
    const value = String(raw ?? '').trim();
    if (!value || !value.startsWith(prefix) || seen.has(value)) continue;
    seen.add(value);
    matches.push(value);
  }
  return matches;
}

function scrollbackWords(textValue, lineLimitValue) {
  const lineLimit = Math.max(0, Math.min(999999, Math.trunc(Number(lineLimitValue) || 0)));
  if (!lineLimit) return [];
  const lines = String(textValue ?? '').replace(/\r/gu, '').split('\n').filter((line) => line.length > 0).slice(-lineLimit).reverse();
  const seen = new Set();
  const words = [];
  for (const line of lines) {
    for (const raw of line.trim().split(/\s+/u)) {
      const value = raw.replace(AUTO_TAB_TRAILING_PUNCTUATION, '');
      if (!value || seen.has(value)) continue;
      seen.add(value);
      words.push(value);
    }
  }
  return words;
}

function completionCandidates({ explicit = [], scrollback = '', autoTab = 0, prefix = '', mode = 'mixed' } = {}) {
  const explicitMatches = uniquePrefixMatches(explicit, prefix);
  const automaticMatches = uniquePrefixMatches(scrollbackWords(scrollback, autoTab), prefix);
  if (mode === 'tab') return explicitMatches;
  if (mode === 'auto') return automaticMatches;
  const seen = new Set();
  return [...explicitMatches, ...automaticMatches].filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function replaceRange(value, startValue, endValue, replacementValue) {
  const text = String(value ?? '');
  const start = clampPosition(text, startValue);
  const end = Math.max(start, clampPosition(text, endValue));
  const replacement = String(replacementValue ?? '');
  const next = `${text.slice(0, start)}${replacement}${text.slice(end)}`;
  const cursor = start + replacement.length;
  return { value: next, selectionStart: cursor, selectionEnd: cursor };
}

function previousWordStart(value, positionValue) {
  const text = String(value ?? '');
  let position = clampPosition(text, positionValue);
  while (position > 0 && text[position - 1] === ' ') position -= 1;
  while (position > 0 && text[position - 1] !== ' ') position -= 1;
  return position;
}

function nextWordEnd(value, positionValue) {
  const text = String(value ?? '');
  let position = clampPosition(text, positionValue);
  while (position < text.length && text[position] !== ' ') position += 1;
  while (position < text.length && text[position] === ' ') position += 1;
  return position;
}

function editInput(value, selectionStartValue, selectionEndValue, operationValue, argumentValue = '') {
  const text = String(value ?? '');
  let start = clampPosition(text, selectionStartValue);
  let end = clampPosition(text, selectionEndValue);
  if (start > end) [start, end] = [end, start];
  const operation = String(operationValue || '').trim().toLowerCase();
  if (operation === 'home') return { value: text, selectionStart: 0, selectionEnd: 0 };
  if (operation === 'end') return { value: text, selectionStart: text.length, selectionEnd: text.length };
  if (operation === 'backward') {
    const at = start !== end ? start : Math.max(0, start - 1);
    return { value: text, selectionStart: at, selectionEnd: at };
  }
  if (operation === 'forward') {
    const at = start !== end ? end : Math.min(text.length, end + 1);
    return { value: text, selectionStart: at, selectionEnd: at };
  }
  if (operation === 'prev word') {
    const at = previousWordStart(text, start);
    return { value: text, selectionStart: at, selectionEnd: at };
  }
  if (operation === 'next word') {
    const at = nextWordEnd(text, end);
    return { value: text, selectionStart: at, selectionEnd: at };
  }
  if (operation === 'clear line') return { value: '', selectionStart: 0, selectionEnd: 0 };
  if (operation === 'clear left') return replaceRange(text, 0, start, '');
  if (operation === 'clear right') return replaceRange(text, end, text.length, '');
  if (operation === 'set') return replaceRange(text, start, end, argumentValue);
  if (operation === 'backspace') {
    if (start !== end) return replaceRange(text, start, end, '');
    return start > 0 ? replaceRange(text, start - 1, start, '') : { value: text, selectionStart: start, selectionEnd: end };
  }
  if (operation === 'delete') {
    if (start !== end) return replaceRange(text, start, end, '');
    return end < text.length ? replaceRange(text, end, end + 1, '') : { value: text, selectionStart: start, selectionEnd: end };
  }
  if (operation === 'delete word left') return replaceRange(text, previousWordStart(text, start), end, '');
  if (operation === 'delete word right') return replaceRange(text, start, nextWordEnd(text, end), '');
  return { value: text, selectionStart: start, selectionEnd: end };
}

function historySearch(historyValue, queryValue, startExclusiveValue) {
  const history = Array.isArray(historyValue) ? historyValue : [];
  const query = String(queryValue ?? '').toLocaleLowerCase();
  const startExclusive = Number.isInteger(startExclusiveValue) ? startExclusiveValue : history.length;
  for (let index = Math.min(startExclusive, history.length) - 1; index >= 0; index -= 1) {
    if (!query || String(history[index] ?? '').toLocaleLowerCase().includes(query)) return index;
  }
  return -1;
}

return Object.freeze({
  lastWordRange,
  scrollbackWords,
  completionCandidates,
  editInput,
  historySearch,
  previousWordStart,
  nextWordEnd
});
});
