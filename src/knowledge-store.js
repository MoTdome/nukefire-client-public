(function knowledgeStoreModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireKnowledge = api;
}(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const MAX_RESULTS = 90;
  const MAX_BODY = 16000;
  const KNOWLEDGE_DOMAINS = Object.freeze(['help', 'item', 'command', 'skill', 'zone']);

  function cleanText(value, maximum = 240) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, ' ')
      .replace(/[ \t]+/gu, ' ')
      .trim()
      .slice(0, maximum);
  }

  function cleanBody(value, maximum = MAX_BODY) {
    return String(value ?? '')
      .normalize('NFKC')
      .replaceAll('\r', '')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, '')
      .slice(0, maximum)
      .trim();
  }

  function cleanIdentifier(value, maximum = 128) {
    return cleanText(value, maximum)
      .replace(/[^a-z0-9_+\-. ]/giu, '')
      .trim();
  }

  function normalizeDomains(input) {
    const source = Array.isArray(input) ? input : KNOWLEDGE_DOMAINS;
    const normalized = [...new Set(source
      .map((value) => cleanIdentifier(value, 32).toLocaleLowerCase())
      .map((value) => value === 'items' ? 'item' : value)
      .map((value) => value === 'commands' ? 'command' : value)
      .map((value) => ['skills', 'spell', 'spells'].includes(value) ? 'skill' : value)
      .map((value) => ['zones', 'area', 'areas'].includes(value) ? 'zone' : value)
      .filter((value) => KNOWLEDGE_DOMAINS.includes(value)))];
    return normalized.length ? normalized : [...KNOWLEDGE_DOMAINS];
  }

  function normalizeResult(input = {}, index = 0) {
    const type = cleanIdentifier(input.type, 32).toLocaleLowerCase() || 'help';
    const key = cleanIdentifier(input.key, 128);
    const title = cleanText(input.title || key, 180);
    if (!key || !title) return null;
    return {
      id: `${type}:${key.toLocaleLowerCase()}:${index}`,
      type,
      key,
      title,
      summary: cleanText(input.summary, 360),
      meta: cleanText(input.meta, 200),
      score: Number.isFinite(Number(input.score)) ? Math.trunc(Number(input.score)) : 0
    };
  }

  function normalizeResults(input = {}) {
    const source = Array.isArray(input.results) ? input.results : [];
    return {
      requestId: cleanIdentifier(input.requestId, 80),
      query: cleanText(input.query, 160),
      count: Math.max(0, Math.trunc(Number(input.count) || 0)),
      matched: Math.max(0, Math.trunc(Number(input.matched) || 0)),
      offset: Math.max(0, Math.trunc(Number(input.offset) || 0)),
      hasMore: input.hasMore === true,
      nextOffset: Math.max(0, Math.trunc(Number(input.nextOffset) || 0)),
      domains: normalizeDomains(input.domains),
      results: source.slice(0, MAX_RESULTS)
        .map(normalizeResult)
        .filter(Boolean)
    };
  }

  function normalizeField(input = {}) {
    const label = cleanText(input.label, 80);
    const value = cleanText(input.value, 1200);
    if (!label || !value) return null;
    return { label, value };
  }

  function normalizeEntry(input = {}) {
    const type = cleanIdentifier(input.type, 32).toLocaleLowerCase() || 'help';
    const key = cleanIdentifier(input.key, 128);
    if (!key) return null;
    const legacyCommand = cleanIdentifier(input.command, 80);
    const terminalCommand = cleanText(
      input.terminalCommand || (legacyCommand ? `${legacyCommand} ${key}` : ''),
      1024
    );
    return {
      requestId: cleanIdentifier(input.requestId, 80),
      type,
      key,
      title: cleanText(input.title || key, 180),
      summary: cleanText(input.summary, 420),
      body: cleanBody(input.body),
      minLevel: Math.max(0, Math.trunc(Number(input.minLevel) || 0)),
      truncated: input.truncated === true,
      command: legacyCommand,
      terminalCommand,
      terminalLabel: cleanText(input.terminalLabel, 120),
      aliases: [...new Set((Array.isArray(input.aliases) ? input.aliases : [])
        .map((value) => cleanIdentifier(value, 256))
        .filter(Boolean))].slice(0, 64),
      tags: [...new Set((Array.isArray(input.tags) ? input.tags : [])
        .map((value) => cleanText(value, 80))
        .filter(Boolean))].slice(0, 24),
      fields: (Array.isArray(input.fields) ? input.fields : [])
        .slice(0, 32)
        .map(normalizeField)
        .filter(Boolean)
    };
  }

  function normalizeError(input = {}) {
    return {
      requestId: cleanIdentifier(input.requestId, 80),
      code: cleanIdentifier(input.code, 80).toLocaleLowerCase() || 'error',
      message: cleanText(input.message, 360) || 'Knowledge request failed.'
    };
  }

  class KnowledgeController {
    constructor(options = {}) {
      this.now = typeof options.now === 'function' ? options.now : Date.now;
      this.sequence = 0;
      this.reset();
    }

    reset() {
      this.activeQueryRequestId = '';
      this.activeEntryRequestId = '';
      this.pendingAppend = false;
      this.query = '';
      this.domains = [...KNOWLEDGE_DOMAINS];
      this.results = normalizeResults({ domains: this.domains });
      this.entry = null;
      this.error = null;
      return this.snapshot();
    }

    nextRequestId(kind = 'request') {
      this.sequence += 1;
      return `knowledge-${kind}-${Math.trunc(this.now())}-${this.sequence}`;
    }

    beginQuery(queryValue, domainValues = KNOWLEDGE_DOMAINS) {
      const query = cleanText(queryValue, 160);
      const domains = normalizeDomains(domainValues);
      const requestId = this.nextRequestId('query');
      this.activeQueryRequestId = requestId;
      this.activeEntryRequestId = '';
      this.pendingAppend = false;
      this.query = query;
      this.domains = domains;
      this.results = normalizeResults({ requestId, query, domains, offset: 0, results: [] });
      this.entry = null;
      this.error = null;
      return { requestId, query, domains, limit: 18, offset: 0 };
    }

    beginNextPage() {
      if (!this.query || !this.results?.hasMore) return null;
      const requestId = this.nextRequestId('more');
      this.activeQueryRequestId = requestId;
      this.pendingAppend = true;
      this.error = null;
      return {
        requestId,
        query: this.query,
        domains: [...this.domains],
        limit: 18,
        offset: Math.max(this.results.results.length, this.results.nextOffset || 0)
      };
    }

    beginEntry(typeValue, keyValue) {
      const type = cleanIdentifier(typeValue, 32).toLocaleLowerCase() || 'help';
      const key = cleanIdentifier(keyValue, 128);
      const requestId = this.nextRequestId('entry');
      this.activeEntryRequestId = requestId;
      this.entry = null;
      this.error = null;
      return { requestId, type, key };
    }

    acceptResults(input) {
      const normalized = normalizeResults(input);
      if (!normalized.requestId || normalized.requestId !== this.activeQueryRequestId) return false;
      if (this.pendingAppend) {
        const seen = new Set();
        const combined = [];
        for (const result of [...(this.results?.results || []), ...normalized.results]) {
          const identity = `${result.type}:${result.key.toLocaleLowerCase()}`;
          if (seen.has(identity)) continue;
          seen.add(identity);
          combined.push(result);
        }
        normalized.results = combined.slice(0, MAX_RESULTS);
        normalized.count = normalized.results.length;
      }
      this.pendingAppend = false;
      this.results = normalized;
      this.error = null;
      return true;
    }

    acceptEntry(input) {
      const normalized = normalizeEntry(input);
      if (!normalized || !normalized.requestId || normalized.requestId !== this.activeEntryRequestId) return false;
      this.entry = normalized;
      this.error = null;
      return true;
    }

    acceptError(input) {
      const normalized = normalizeError(input);
      if (!normalized.requestId || (
        normalized.requestId !== this.activeQueryRequestId &&
        normalized.requestId !== this.activeEntryRequestId
      )) return false;
      this.pendingAppend = false;
      this.error = normalized;
      return true;
    }

    snapshot() {
      return {
        activeQueryRequestId: this.activeQueryRequestId,
        activeEntryRequestId: this.activeEntryRequestId,
        query: this.query,
        domains: [...this.domains],
        results: structuredCloneSafe(this.results),
        entry: structuredCloneSafe(this.entry),
        error: structuredCloneSafe(this.error)
      };
    }
  }

  function structuredCloneSafe(value) {
    if (value === null || value === undefined) return value;
    return JSON.parse(JSON.stringify(value));
  }

  return {
    MAX_RESULTS,
    KNOWLEDGE_DOMAINS,
    cleanText,
    cleanBody,
    normalizeDomains,
    normalizeResult,
    normalizeResults,
    normalizeField,
    normalizeEntry,
    normalizeError,
    KnowledgeController
  };
}));
