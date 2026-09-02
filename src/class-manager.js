'use strict';

const CLASS_NAME_MAX = 48;
const DEFAULT_MAX_CLASSES = 128;
const FORBIDDEN_CLASS_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

function normalizeClassName(value) {
  const source = String(value || '').normalize('NFKC').trim().toLowerCase();
  if (!source || source.length > CLASS_NAME_MAX) return '';
  if (!/^[a-z0-9][a-z0-9_-]*$/u.test(source)) return '';
  return FORBIDDEN_CLASS_NAMES.has(source) ? '' : source;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeSavedDefinitions(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    aliases: Array.isArray(source.aliases) ? clone(source.aliases.slice(0, 2048)) : [],
    variables: Array.isArray(source.variables) ? clone(source.variables.slice(0, 1024)) : [],
    functions: Array.isArray(source.functions) ? clone(source.functions.slice(0, 1024)) : [],
    actions: Array.isArray(source.actions) ? clone(source.actions.slice(0, 1024)) : [],
    gags: Array.isArray(source.gags) ? clone(source.gags.slice(0, 1024)) : [],
    highlights: Array.isArray(source.highlights) ? clone(source.highlights.slice(0, 1024)) : [],
    substitutes: Array.isArray(source.substitutes) ? clone(source.substitutes.slice(0, 1024)) : [],
    macros: Array.isArray(source.macros) ? clone(source.macros.slice(0, 1024)) : [],
    tabs: Array.isArray(source.tabs) ? clone(source.tabs.slice(0, 1024)) : [],
    events: Array.isArray(source.events) ? clone(source.events.slice(0, 1024)) : []
  };
}

function savedDefinitionCount(saved = {}) {
  return ['aliases', 'variables', 'functions', 'actions', 'gags', 'highlights', 'substitutes', 'macros', 'tabs', 'events']
    .reduce((count, key) => count + (Array.isArray(saved?.[key]) ? saved[key].length : 0), 0);
}

class ClassManager {
  constructor(options = {}) {
    this.maxClasses = Math.max(1, Math.trunc(Number(options.maxClasses) || DEFAULT_MAX_CLASSES));
    this.classes = new Map();
    this.stack = [];
    this.revision = 0;
    this.restore(options.classes || options);
  }

  ensure(nameValue) {
    const name = normalizeClassName(nameValue);
    if (!name) return null;
    if (!this.classes.has(name)) {
      if (this.classes.size >= this.maxClasses) return null;
      this.classes.set(name, { name, saved: normalizeSavedDefinitions() });
      this.revision += 1;
    }
    return this.classes.get(name);
  }

  has(nameValue) {
    return this.classes.has(normalizeClassName(nameValue));
  }

  get activeName() {
    return this.stack.at(-1) || '';
  }

  open(nameValue) {
    const record = this.ensure(nameValue);
    if (!record) return null;
    // TinTin++ keeps one current class/group name. Opening a different class
    // replaces the current assignment target rather than pausing a stack that
    // will be resumed later when the new class closes.
    this.stack = [record.name];
    this.revision += 1;
    return record.name;
  }

  close(nameValue = '') {
    const requested = normalizeClassName(nameValue) || this.activeName;
    if (!requested || this.activeName !== requested) return '';
    this.stack = [];
    this.revision += 1;
    return requested;
  }

  save(nameValue, definitions = {}) {
    const record = this.ensure(nameValue);
    if (!record) return null;
    record.saved = normalizeSavedDefinitions(definitions);
    this.revision += 1;
    return clone(record.saved);
  }

  saved(nameValue) {
    const record = this.classes.get(normalizeClassName(nameValue));
    return record ? clone(record.saved) : null;
  }

  kill(nameValue) {
    const name = normalizeClassName(nameValue);
    if (!name || !this.classes.delete(name)) return false;
    this.stack = this.stack.filter((entry) => entry !== name);
    this.revision += 1;
    return true;
  }

  list() {
    return [...this.classes.values()]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((record) => ({
        name: record.name,
        open: record.name === this.activeName,
        active: record.name === this.activeName,
        savedCount: savedDefinitionCount(record.saved)
      }));
  }

  snapshot() {
    return {
      activeStack: [...this.stack],
      definitions: [...this.classes.values()]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((record) => ({ name: record.name, saved: clone(record.saved) }))
    };
  }

  restore(snapshot = {}) {
    const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
    const records = Array.isArray(source.definitions)
      ? source.definitions.slice(0, this.maxClasses * 4)
      : [];
    const next = new Map();
    for (const raw of records) {
      const record = raw && typeof raw === 'object' ? raw : {};
      const name = normalizeClassName(record.name);
      if (!name || next.has(name) || next.size >= this.maxClasses) continue;
      next.set(name, { name, saved: normalizeSavedDefinitions(record.saved) });
    }
    this.classes = next;
    const requestedStack = Array.isArray(source.activeStack) ? source.activeStack : [];
    // Older NukeFire snapshots may contain a stack. Preserve the last valid
    // entry because that was the effective active class, but normalize future
    // state to TinTin's single-current-class model.
    const requested = [...requestedStack].reverse()
      .map((raw) => normalizeClassName(raw))
      .find((name) => name && this.classes.has(name));
    this.stack = requested ? [requested] : [];
    this.revision += 1;
    return this.snapshot();
  }
}


function normalizeClassesSnapshot(input = {}) {
  return new ClassManager({ classes: input }).snapshot();
}

module.exports = {
  ClassManager,
  normalizeClassesSnapshot,
  normalizeClassName,
  normalizeSavedDefinitions,
  savedDefinitionCount,
  CLASS_NAME_MAX,
  DEFAULT_MAX_CLASSES
};
