'use strict';

(function exposePipelineDebug(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFirePipelineDebug = api;
})(typeof window !== 'undefined' ? window : globalThis, function createPipelineDebugApi() {
  const DEFAULT_PIPELINE_DEBUG_MAX_ENTRIES = 200;
  const MIN_PIPELINE_DEBUG_MAX_ENTRIES = 50;
  const MAX_PIPELINE_DEBUG_MAX_ENTRIES = 500;
  const MAX_PIPELINE_DEBUG_MESSAGE = 1200;
  const MAX_PIPELINE_DEBUG_STAGE = 40;

  function normalizeMaxEntries(value, fallback = DEFAULT_PIPELINE_DEBUG_MAX_ENTRIES) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(
      MIN_PIPELINE_DEBUG_MAX_ENTRIES,
      Math.min(MAX_PIPELINE_DEBUG_MAX_ENTRIES, Math.trunc(numeric))
    );
  }

  function normalizePipelineDebugSettings(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    return {
      enabled: source.enabled === true,
      maxEntries: normalizeMaxEntries(source.maxEntries)
    };
  }

  function cleanPipelineDebugText(value, maximum = MAX_PIPELINE_DEBUG_MESSAGE) {
    return String(value ?? '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu, '')
      .replace(/\r\n?/gu, '\n')
      .slice(0, Math.max(1, Number(maximum) || MAX_PIPELINE_DEBUG_MESSAGE));
  }

  function detachedEntry(entry = {}) {
    return {
      id: Number(entry.id) || 0,
      timestamp: Number(entry.timestamp) || 0,
      stage: cleanPipelineDebugText(entry.stage, MAX_PIPELINE_DEBUG_STAGE),
      message: cleanPipelineDebugText(entry.message)
    };
  }

  class PipelineDebugBuffer {
    constructor(options = {}) {
      const normalized = normalizePipelineDebugSettings(options);
      this.enabled = normalized.enabled;
      this.maxEntries = normalized.maxEntries;
      this.entries = [];
      this.nextId = 1;
    }

    status() {
      return {
        enabled: this.enabled,
        maxEntries: this.maxEntries,
        count: this.entries.length
      };
    }

    snapshot() {
      return {
        ...this.status(),
        entries: this.entries.map(detachedEntry)
      };
    }

    restore(snapshot = {}) {
      const normalized = normalizePipelineDebugSettings(snapshot);
      this.enabled = normalized.enabled;
      this.maxEntries = normalized.maxEntries;
      const source = Array.isArray(snapshot.entries) ? snapshot.entries : [];
      this.entries = source
        .map(detachedEntry)
        .filter((entry) => entry.id > 0 && entry.message)
        .slice(-this.maxEntries);
      this.nextId = this.entries.reduce((highest, entry) => Math.max(highest, entry.id), 0) + 1;
      return this.snapshot();
    }

    configure(settings = {}) {
      const source = settings && typeof settings === 'object' ? settings : {};
      if (Object.hasOwn(source, 'maxEntries')) {
        this.maxEntries = normalizeMaxEntries(source.maxEntries, this.maxEntries);
        if (this.entries.length > this.maxEntries) {
          this.entries.splice(0, this.entries.length - this.maxEntries);
        }
      }
      if (Object.hasOwn(source, 'enabled')) this.enabled = source.enabled === true;
      return this.status();
    }

    append(stageValue, messageValue, options = {}) {
      if (!this.enabled && options.force !== true) return null;
      const stage = cleanPipelineDebugText(stageValue, MAX_PIPELINE_DEBUG_STAGE).trim() || 'pipeline';
      const message = cleanPipelineDebugText(messageValue).trim();
      if (!message) return null;
      const entry = Object.freeze({
        id: this.nextId++,
        timestamp: Number(options.timestamp) || Date.now(),
        stage,
        message
      });
      this.entries.push(entry);
      if (this.entries.length > this.maxEntries) {
        this.entries.splice(0, this.entries.length - this.maxEntries);
      }
      return detachedEntry(entry);
    }

    clear() {
      const count = this.entries.length;
      this.entries = [];
      return count;
    }
  }

  function formatPipelineDebugEntry(entry = {}) {
    const stage = cleanPipelineDebugText(entry.stage, MAX_PIPELINE_DEBUG_STAGE).trim() || 'pipeline';
    const message = cleanPipelineDebugText(entry.message).trim();
    return `[${stage}] ${message}`;
  }

  return {
    PipelineDebugBuffer,
    normalizePipelineDebugSettings,
    normalizePipelineDebugMaxEntries: normalizeMaxEntries,
    cleanPipelineDebugText,
    formatPipelineDebugEntry,
    DEFAULT_PIPELINE_DEBUG_MAX_ENTRIES,
    MIN_PIPELINE_DEBUG_MAX_ENTRIES,
    MAX_PIPELINE_DEBUG_MAX_ENTRIES,
    MAX_PIPELINE_DEBUG_MESSAGE
  };
});
