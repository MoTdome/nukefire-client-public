'use strict';

(function attachHistoryNavigation(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireHistoryNavigation = api;
})(typeof window !== 'undefined' ? window : globalThis, function createHistoryNavigationApi() {
  function normalize(value) {
    return String(value ?? '').toLowerCase();
  }

  function matchesPrefix(command, prefix) {
    const normalizedPrefix = normalize(prefix);
    return !normalizedPrefix || normalize(command).startsWith(normalizedPrefix);
  }

  function findPreviousHistoryIndex(history, startExclusive, prefix = '') {
    const entries = Array.isArray(history) ? history : [];
    const start = Number.isInteger(startExclusive) ? startExclusive : entries.length;
    for (let index = Math.min(start, entries.length) - 1; index >= 0; index -= 1) {
      if (matchesPrefix(entries[index], prefix)) return index;
    }
    return -1;
  }

  function findNextHistoryIndex(history, startExclusive, prefix = '') {
    const entries = Array.isArray(history) ? history : [];
    const start = Number.isInteger(startExclusive) ? startExclusive + 1 : 0;
    for (let index = Math.max(start, 0); index < entries.length; index += 1) {
      if (matchesPrefix(entries[index], prefix)) return index;
    }
    return -1;
  }

  function shouldUsePrefixSearch(value, selectionStart, selectionEnd) {
    const text = String(value ?? '');
    return Boolean(
      text
      && Number(selectionStart) === text.length
      && Number(selectionEnd) === text.length
    );
  }

  return Object.freeze({
    matchesPrefix,
    findPreviousHistoryIndex,
    findNextHistoryIndex,
    shouldUsePrefixSearch
  });
});
