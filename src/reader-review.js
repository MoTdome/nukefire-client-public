(function attachReaderReview(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireReaderReview = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createReaderReviewApi() {
  'use strict';

  const DEFAULT_MAX_CHARACTERS = 2_000_000;
  const DEFAULT_MAX_LINES = 50_000;
  const HISTORY_LOW_WATER_RATIO = 0.875;

  function positiveInteger(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
  }

  class ReaderReviewBuffer {
    constructor(options = {}) {
      this.maxCharacters = positiveInteger(options.maxCharacters, DEFAULT_MAX_CHARACTERS);
      this.maxLines = positiveInteger(options.maxLines, DEFAULT_MAX_LINES);
      this.lines = [];
      this.characters = 0;
      this.nextSeq = 1;
      this.cursorSeq = null;
      this.active = false;
    }

    appendLine(value, options = {}) {
      const text = String(value ?? '').replaceAll('\r', '').trimEnd();
      if (!text.trim()) return null;
      const line = Object.freeze({
        seq: this.nextSeq,
        text,
        rapidRecall: options.rapidRecall !== false
      });
      this.nextSeq += 1;
      this.lines.push(line);
      this.characters += text.length;
      this._trim();
      return line;
    }

    clear() {
      this.lines = [];
      this.characters = 0;
      this.nextSeq = 1;
      this.cursorSeq = null;
      this.active = false;
    }

    latest() {
      if (!this.lines.length) return null;
      this.active = true;
      this.cursorSeq = this.lines.at(-1).seq;
      return this.current();
    }

    recall(n = 1) {
      const count = Number(n);
      if (!Number.isInteger(count) || count < 1 || count > 10) return null;
      let remaining = count;
      for (let index = this.lines.length - 1; index >= 0; index -= 1) {
        if (this.lines[index].rapidRecall === false) continue;
        remaining -= 1;
        if (remaining === 0) return this._result(index);
      }
      return null;
    }

    previous() {
      if (!this.lines.length) return null;
      if (!this.active || this.cursorSeq === null) {
        this.latest();
      }
      const index = Math.max(0, this._index() - 1);
      this.cursorSeq = this.lines[index].seq;
      this.active = true;
      return this.current();
    }

    next() {
      if (!this.lines.length) return null;
      if (!this.active || this.cursorSeq === null) return this.latest();
      const index = Math.min(this.lines.length - 1, this._index() + 1);
      this.cursorSeq = this.lines[index].seq;
      this.active = true;
      return this.current();
    }

    current() {
      if (!this.lines.length) return null;
      if (!this.active || this.cursorSeq === null) return this.latest();
      const index = this._index();
      const line = this.lines[index];
      this.cursorSeq = line.seq;
      return this._result(index);
    }

    snapshot() {
      return this.lines.map((line) => ({ ...line }));
    }

    _index() {
      if (!this.lines.length) return 0;
      const firstSeq = this.lines[0].seq;
      const lastSeq = this.lines.at(-1).seq;
      const seq = Math.max(firstSeq, Math.min(Number(this.cursorSeq) || firstSeq, lastSeq));
      return Math.max(0, Math.min(seq - firstSeq, this.lines.length - 1));
    }

    _result(index) {
      if (!this.lines.length) return null;
      const bounded = Math.max(0, Math.min(Number(index) || 0, this.lines.length - 1));
      const line = this.lines[bounded];
      return Object.freeze({
        seq: line.seq,
        text: line.text,
        position: bounded + 1,
        count: this.lines.length,
        atOldest: bounded === 0,
        atLatest: bounded === this.lines.length - 1
      });
    }

    _trim() {
      if (this.lines.length <= this.maxLines && this.characters <= this.maxCharacters) return;
      const retainLines = this.maxLines >= 1000
        ? Math.max(1, Math.floor(this.maxLines * HISTORY_LOW_WATER_RATIO))
        : this.maxLines;
      const retainCharacters = this.maxCharacters >= 100_000
        ? Math.max(1, Math.floor(this.maxCharacters * HISTORY_LOW_WATER_RATIO))
        : this.maxCharacters;
      let removeCount = 0;
      let removedCharacters = 0;
      while (removeCount < this.lines.length && (
        this.lines.length - removeCount > retainLines
        || this.characters - removedCharacters > retainCharacters
      )) {
        removedCharacters += this.lines[removeCount].text.length;
        removeCount += 1;
      }
      if (!removeCount) return;
      this.lines.splice(0, removeCount);
      this.characters = Math.max(0, this.characters - removedCharacters);
    }
  }

  return {
    DEFAULT_MAX_CHARACTERS,
    DEFAULT_MAX_LINES,
    ReaderReviewBuffer
  };
});
