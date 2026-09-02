'use strict';

const DEFAULT_MAX_TABS = 1024;
const TAB_VALUE_MAX = 1024;

function normalizeTabValue(value) {
  const text = String(value ?? '').normalize('NFKC').trim();
  if (!text || text.length > TAB_VALUE_MAX || /[\r\n\0]/u.test(text)) return '';
  return text;
}

function normalizeTabClass(value) {
  const name = String(value || '').normalize('NFKC').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,47}$/u.test(name) && !['__proto__', 'constructor', 'prototype'].includes(name)
    ? name
    : '';
}

function wildcardRegex(patternValue) {
  const pattern = String(patternValue ?? '').normalize('NFKC').trim();
  if (!pattern) return null;
  let source = '^';
  for (let index = 0; index < pattern.length;) {
    const character = pattern[index];
    const next = pattern[index + 1] || '';
    if (character === '%' && next === '%') { source += '%'; index += 2; continue; }
    if (character === '%' && next === '*') { source += '.*'; index += 2; continue; }
    if (character === '%' && next === '?') { source += '.'; index += 2; continue; }
    source += /[\\^$.*+?()[\]{}|]/u.test(character) ? `\\${character}` : character;
    index += 1;
  }
  try { return new RegExp(`${source}$`, 'iu'); } catch (_error) { return null; }
}

function tabMatches(value, patternValue) {
  const pattern = String(patternValue ?? '').normalize('NFKC').trim();
  if (!pattern) return false;
  if (!/%[?*]/u.test(pattern)) return String(value ?? '').normalize('NFKC').trim().toLowerCase() === pattern.toLowerCase();
  return Boolean(wildcardRegex(pattern)?.test(String(value ?? '').normalize('NFKC').trim()));
}

class TabEngine {
  constructor(options = {}) {
    this.maxTabs = Math.max(1, Math.trunc(Number(options.maxTabs) || DEFAULT_MAX_TABS));
    this.tabs = new Map();
    this.revision = 0;
    this.replaceAll(options.tabs || options.definitions || []);
  }

  define(value, classNameValue = '') {
    const text = normalizeTabValue(value);
    if (!text) return null;
    const key = text.toLocaleLowerCase();
    const className = normalizeTabClass(classNameValue);
    if (!this.tabs.has(key) && this.tabs.size >= this.maxTabs) return null;
    const record = { value: text, ...(className ? { className } : {}) };
    this.tabs.set(key, record);
    this.revision += 1;
    return { ...record };
  }

  delete(patternValue) {
    const matches = this.list().filter((record) => tabMatches(record.value, patternValue));
    for (const record of matches) this.tabs.delete(record.value.toLocaleLowerCase());
    if (matches.length > 0) this.revision += 1;
    return matches;
  }

  list() {
    return [...this.tabs.values()]
      .sort((left, right) => left.value.localeCompare(right.value, undefined, { sensitivity: 'base' }))
      .map((record) => ({ ...record }));
  }

  replaceAll(recordsValue = []) {
    this.revision += 1;
    this.tabs.clear();
    for (const raw of Array.isArray(recordsValue) ? recordsValue.slice(0, this.maxTabs * 4) : []) {
      const record = raw && typeof raw === 'object' ? raw : { value: raw };
      this.define(record.value ?? record.name ?? record.left, record.className);
      if (this.tabs.size >= this.maxTabs) break;
    }
    return this.list();
  }
}

module.exports = {
  TabEngine,
  normalizeTabValue,
  tabMatches,
  DEFAULT_MAX_TABS,
  TAB_VALUE_MAX
};
