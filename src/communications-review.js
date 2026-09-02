(function attachCommunicationsReview(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireCommunicationsReview = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createCommunicationsReviewApi() {
  'use strict';

  function normalizeView(value) {
    const view = String(value || 'all').trim().toLocaleLowerCase();
    return view || 'all';
  }

  function messageId(message) {
    const id = Number(message?.id);
    return Number.isFinite(id) ? id : null;
  }

  class CommunicationReviewCursor {
    constructor() {
      this.cursorByView = new Map();
      this.activeViews = new Set();
    }

    clear() {
      this.cursorByView.clear();
      this.activeViews.clear();
    }

    current(messages, view = 'all') {
      const key = normalizeView(view);
      const lines = this._lines(messages, key);
      if (!lines.length) return null;
      if (!this.activeViews.has(key)) return this.latest(messages, key);
      return this._result(lines, key, this._index(lines, key));
    }

    previous(messages, view = 'all') {
      const key = normalizeView(view);
      const lines = this._lines(messages, key);
      if (!lines.length) return null;
      const index = this.activeViews.has(key)
        ? Math.max(0, this._index(lines, key) - 1)
        : Math.max(0, lines.length - 2);
      return this._result(lines, key, index);
    }

    next(messages, view = 'all') {
      const key = normalizeView(view);
      const lines = this._lines(messages, key);
      if (!lines.length) return null;
      const index = this.activeViews.has(key)
        ? Math.min(lines.length - 1, this._index(lines, key) + 1)
        : lines.length - 1;
      return this._result(lines, key, index);
    }

    latest(messages, view = 'all') {
      const key = normalizeView(view);
      const lines = this._lines(messages, key);
      if (!lines.length) return null;
      return this._result(lines, key, lines.length - 1);
    }

    recall(messages, view = 'all', n = 1) {
      const key = normalizeView(view);
      const count = Number(n);
      if (!Number.isInteger(count) || count < 1 || count > 9) return null;
      const lines = this._lines(messages, key);
      if (lines.length < count) return null;
      return this._peekResult(lines, key, lines.length - count);
    }

    _lines(messages, view) {
      const source = Array.isArray(messages) ? messages : [];
      return source.filter((message) => {
        if (messageId(message) === null) return false;
        if (view === 'all') return true;
        return String(message?.channel || '').trim().toLocaleLowerCase() === view;
      });
    }

    _index(lines, view) {
      if (!lines.length) return 0;
      const cursorId = Number(this.cursorByView.get(view));
      if (!Number.isFinite(cursorId)) return lines.length - 1;

      const exact = lines.findIndex((message) => messageId(message) === cursorId);
      if (exact >= 0) return exact;

      const firstId = messageId(lines[0]);
      const lastId = messageId(lines.at(-1));
      if (cursorId <= firstId) return 0;
      if (cursorId >= lastId) return lines.length - 1;

      const nextSurviving = lines.findIndex((message) => messageId(message) >= cursorId);
      return nextSurviving >= 0 ? nextSurviving : lines.length - 1;
    }

    _result(lines, view, index) {
      const result = this._peekResult(lines, view, index);
      if (!result) return null;
      this.cursorByView.set(view, result.id);
      this.activeViews.add(view);
      return result;
    }

    _peekResult(lines, view, index) {
      if (!lines.length) return null;
      const bounded = Math.max(0, Math.min(Number(index) || 0, lines.length - 1));
      const message = lines[bounded];
      const id = messageId(message);
      return Object.freeze({
        id,
        view,
        channel: String(message.channel || ''),
        sender: String(message.sender || ''),
        text: String(message.text || ''),
        position: bounded + 1,
        count: lines.length,
        atOldest: bounded === 0,
        atLatest: bounded === lines.length - 1
      });
    }
  }

  return {
    CommunicationReviewCursor
  };
});
