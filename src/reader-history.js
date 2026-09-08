(function attachReaderHistory(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireReaderHistory = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createReaderHistoryApi() {
  'use strict';

  const DEFAULT_MAX_ENTRIES_PER_CATEGORY = 5000;
  const DEFAULT_MAX_CHARACTERS_PER_CATEGORY = 1_000_000;
  const HISTORY_LOW_WATER_RATIO = 0.875;

  const CORE_CATEGORIES = Object.freeze([
    Object.freeze({ id: 'main', label: 'Main Output', speechPolicy: 'queue', always: true }),
    Object.freeze({ id: 'rooms', label: 'Rooms', speechPolicy: 'replace', always: false }),
    Object.freeze({ id: 'combat', label: 'Combat', speechPolicy: 'queue', always: false }),
    Object.freeze({ id: 'damage', label: 'Damage', speechPolicy: 'interrupt', always: false }),
    Object.freeze({ id: 'client-reader', label: 'Client Reader', speechPolicy: 'quiet', always: false })
  ]);
  const NAVIGATION_PRIORITY = Object.freeze(['main', 'comm:gossip', 'comm:ssf', 'comm:tell']);
  const NAVIGATION_PRIORITY_INDEX = new Map(NAVIGATION_PRIORITY.map((id, index) => [id, index]));

  function positiveInteger(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
  }

  function cleanId(value) {
    return String(value || '').trim().toLocaleLowerCase().replace(/[^a-z0-9:_-]+/gu, '-').replace(/^-+|-+$/gu, '');
  }

  function cleanLabel(value, fallback = 'History') {
    return String(value || fallback).replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, 80) || fallback;
  }

  function cleanText(value) {
    return String(value ?? '').replaceAll('\r', '').replace(/[\u0000\u0008\u000b\u000c\u007f]/gu, '').trim();
  }

  function normalizePolicy(value) {
    const policy = String(value || '').trim().toLocaleLowerCase();
    return ['queue', 'interrupt', 'replace', 'quiet'].includes(policy) ? policy : 'queue';
  }

  class ReaderHistory {
    constructor(options = {}) {
      this.maxEntriesPerCategory = positiveInteger(options.maxEntriesPerCategory, DEFAULT_MAX_ENTRIES_PER_CATEGORY);
      this.maxCharactersPerCategory = positiveInteger(options.maxCharactersPerCategory, DEFAULT_MAX_CHARACTERS_PER_CATEGORY);
      this.categories = new Map();
      this.order = [];
      this.entries = new Map();
      this.characters = new Map();
      this.cursorSeq = new Map();
      this.readSeq = new Map();
      this.activeCursors = new Set();
      this.nextSeq = 1;
      this.selectedId = 'main';
      for (const category of CORE_CATEGORIES) this.ensureCategory(category.id, category);
    }

    ensureCategory(idValue, options = {}) {
      const id = cleanId(idValue);
      if (!id) return null;
      const existing = this.categories.get(id);
      const category = Object.freeze({
        id,
        label: cleanLabel(options.label, existing?.label || id),
        speechPolicy: normalizePolicy(options.speechPolicy || existing?.speechPolicy),
        always: options.always === true || existing?.always === true
      });
      this.categories.set(id, category);
      if (!this.order.includes(id)) this.order.push(id);
      if (!this.entries.has(id)) this.entries.set(id, []);
      if (!this.characters.has(id)) this.characters.set(id, 0);
      return category;
    }

    append(categoryId, value, options = {}) {
      const text = cleanText(value);
      if (!text) return null;
      const category = this.ensureCategory(categoryId, options);
      if (!category) return null;
      const entries = this.entries.get(category.id);
      const entry = Object.freeze({
        seq: this.nextSeq++,
        text,
        timestamp: Math.max(0, Number(options.timestamp) || Date.now()),
        source: String(options.source || '').slice(0, 80)
      });
      entries.push(entry);
      this.characters.set(category.id, (this.characters.get(category.id) || 0) + text.length);
      if (options.markRead === true) this.readSeq.set(category.id, entry.seq);
      this._trim(category.id);
      return entry;
    }

    clear(categoryId = '') {
      const id = cleanId(categoryId);
      if (id) {
        if (!this.categories.has(id)) return false;
        this.entries.set(id, []);
        this.characters.set(id, 0);
        this.cursorSeq.delete(id);
        this.readSeq.delete(id);
        this.activeCursors.delete(id);
        return true;
      }
      for (const key of this.order) {
        this.entries.set(key, []);
        this.characters.set(key, 0);
      }
      this.cursorSeq.clear();
      this.readSeq.clear();
      this.activeCursors.clear();
      this.selectedId = 'main';
      return true;
    }

    selectedCategory() {
      return this.categories.get(this.selectedId) || this.categories.get('main') || null;
    }

    availableCategories(options = {}) {
      const includeEmpty = options.includeEmpty === true;
      return this.order
        .map((id, index) => ({ category: this.categories.get(id), index }))
        .filter((entry) => Boolean(entry.category))
        .filter((entry) => includeEmpty || entry.category.always || (this.entries.get(entry.category.id)?.length || 0) > 0)
        .sort((left, right) => {
          const leftPriority = NAVIGATION_PRIORITY_INDEX.get(left.category.id);
          const rightPriority = NAVIGATION_PRIORITY_INDEX.get(right.category.id);
          if (leftPriority !== undefined || rightPriority !== undefined) {
            if (leftPriority === undefined) return 1;
            if (rightPriority === undefined) return -1;
            return leftPriority - rightPriority;
          }
          return left.index - right.index;
        })
        .map((entry) => entry.category);
    }

    select(categoryId, options = {}) {
      const id = cleanId(categoryId);
      const category = this.categories.get(id);
      if (!category) return null;
      if (options.requireAvailable !== false) {
        const available = this.availableCategories({ includeEmpty: options.includeEmpty === true });
        if (!available.some((entry) => entry.id === id)) return null;
      }
      this.selectedId = id;
      return this.categoryStatus(id);
    }

    selectNext(direction = 1, options = {}) {
      const categories = this.availableCategories({ includeEmpty: options.includeEmpty === true });
      if (!categories.length) return null;
      let index = categories.findIndex((category) => category.id === this.selectedId);
      const step = Number(direction) < 0 ? -1 : 1;
      if (index < 0) {
        index = step < 0 ? categories.length - 1 : 0;
      } else {
        index = (index + step + categories.length) % categories.length;
      }
      this.selectedId = categories[index].id;
      return this.categoryStatus(this.selectedId);
    }

    categoryStatus(categoryId = this.selectedId) {
      const id = cleanId(categoryId) || this.selectedId;
      const category = this.categories.get(id);
      if (!category) return null;
      const entries = this.entries.get(id) || [];
      const count = entries.length;
      const readThrough = Number(this.readSeq.get(id)) || 0;
      const unread = entries.reduce((total, entry) => total + (entry.seq > readThrough ? 1 : 0), 0);
      return Object.freeze({
        id,
        label: category.label,
        count,
        unread,
        speechPolicy: category.speechPolicy,
        selected: id === this.selectedId
      });
    }

    current(categoryId = this.selectedId) {
      return this._navigate(categoryId, 'current');
    }

    previous(categoryId = this.selectedId) {
      return this._navigate(categoryId, 'previous');
    }

    next(categoryId = this.selectedId) {
      return this._navigate(categoryId, 'next');
    }

    latest(categoryId = this.selectedId) {
      return this._navigate(categoryId, 'latest');
    }

    oldest(categoryId = this.selectedId) {
      return this._navigate(categoryId, 'oldest');
    }

    move(offset = 0, categoryId = this.selectedId) {
      const id = cleanId(categoryId) || this.selectedId;
      const entries = this.entries.get(id) || [];
      if (!entries.length) return null;
      const step = Number(offset);
      if (!Number.isInteger(step) || step === 0) return this.current(id);
      const start = this.activeCursors.has(id) ? this._index(id, entries) : entries.length - 1;
      return this._result(id, start + step, true);
    }

    recall(n = 1, categoryId = this.selectedId) {
      const id = cleanId(categoryId) || this.selectedId;
      const count = Number(n);
      const entries = this.entries.get(id) || [];
      if (!Number.isInteger(count) || count < 1 || count > 9 || entries.length < count) return null;
      return this._result(id, entries.length - count, false);
    }

    snapshot(categoryId = this.selectedId) {
      const id = cleanId(categoryId) || this.selectedId;
      return (this.entries.get(id) || []).map((entry) => ({ ...entry }));
    }

    _navigate(categoryId, action) {
      const id = cleanId(categoryId) || this.selectedId;
      const entries = this.entries.get(id) || [];
      if (!entries.length) return null;
      let index = entries.length - 1;
      if (action === 'latest') {
        index = entries.length - 1;
      } else if (action === 'oldest') {
        index = 0;
      } else if (this.activeCursors.has(id)) {
        index = this._index(id, entries);
        if (action === 'previous') index = Math.max(0, index - 1);
        else if (action === 'next') index = Math.min(entries.length - 1, index + 1);
      } else if (action === 'previous') {
        index = Math.max(0, entries.length - 2);
      }
      return this._result(id, index, true);
    }

    _index(id, entries) {
      const cursor = Number(this.cursorSeq.get(id));
      if (!Number.isFinite(cursor)) return entries.length - 1;
      const exact = entries.findIndex((entry) => entry.seq === cursor);
      if (exact >= 0) return exact;
      const next = entries.findIndex((entry) => entry.seq >= cursor);
      return next >= 0 ? next : entries.length - 1;
    }

    _result(id, index, moveCursor) {
      const entries = this.entries.get(id) || [];
      if (!entries.length) return null;
      const bounded = Math.max(0, Math.min(Number(index) || 0, entries.length - 1));
      const entry = entries[bounded];
      const category = this.categories.get(id);
      if (moveCursor) {
        this.cursorSeq.set(id, entry.seq);
        this.readSeq.set(id, Math.max(Number(this.readSeq.get(id)) || 0, entry.seq));
        this.activeCursors.add(id);
      }
      return Object.freeze({
        categoryId: id,
        categoryLabel: category?.label || id,
        speechPolicy: category?.speechPolicy || 'queue',
        seq: entry.seq,
        text: entry.text,
        timestamp: entry.timestamp,
        source: entry.source,
        position: bounded + 1,
        count: entries.length,
        atOldest: bounded === 0,
        atLatest: bounded === entries.length - 1
      });
    }

    _trim(id) {
      const entries = this.entries.get(id) || [];
      let characters = this.characters.get(id) || 0;
      if (entries.length <= this.maxEntriesPerCategory && characters <= this.maxCharactersPerCategory) return;
      const retainEntries = this.maxEntriesPerCategory >= 1000
        ? Math.max(1, Math.floor(this.maxEntriesPerCategory * HISTORY_LOW_WATER_RATIO))
        : this.maxEntriesPerCategory;
      const retainCharacters = this.maxCharactersPerCategory >= 100_000
        ? Math.max(1, Math.floor(this.maxCharactersPerCategory * HISTORY_LOW_WATER_RATIO))
        : this.maxCharactersPerCategory;
      let remove = 0;
      while (remove < entries.length && (
        entries.length - remove > retainEntries ||
        characters > retainCharacters
      )) {
        characters -= entries[remove].text.length;
        remove += 1;
      }
      if (remove) entries.splice(0, remove);
      this.characters.set(id, Math.max(0, characters));
    }
  }

  return Object.freeze({
    DEFAULT_MAX_ENTRIES_PER_CATEGORY,
    DEFAULT_MAX_CHARACTERS_PER_CATEGORY,
    CORE_CATEGORIES,
    NAVIGATION_PRIORITY,
    ReaderHistory
  });
});
