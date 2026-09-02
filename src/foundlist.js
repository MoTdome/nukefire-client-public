(function attachFoundlist(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireFoundlist = api;
})(typeof window !== 'undefined' ? window : globalThis, function createFoundlistApi() {
  'use strict';

  const VERDICTS = new Set([
    'upgrade', 'tossup', 'downgrade', 'cannot-wear',
    'needs-remorts', 'not-comparable', 'neutral'
  ]);
  const FILTERS = new Set(['all', 'upgrade', 'tossup', 'downgrade', 'unusable']);
  const PRIORITY = Object.freeze({
    upgrade: 0,
    tossup: 1,
    neutral: 2,
    downgrade: 3,
    'needs-remorts': 4,
    'cannot-wear': 5,
    'not-comparable': 6
  });

  function integer(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : fallback;
  }

  function text(value, maximum = 220) {
    return String(value ?? '').normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f]/gu, ' ')
      .replace(/\s+/gu, ' ').trim().slice(0, maximum);
  }

  function normalizeItem(input = {}) {
    const vnum = integer(input.vnum);
    const name = text(input.name, 180);
    if (vnum <= 0 || !name) return null;
    const verdictRaw = text(input.verdict, 32).toLowerCase();
    return {
      vnum,
      name,
      verdict: VERDICTS.has(verdictRaw) ? verdictRaw : 'neutral',
      minRemorts: Math.max(0, integer(input.minRemorts)),
      objectType: Math.max(0, integer(input.objectType))
    };
  }

  function normalizeInfo(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || integer(input.schema) !== 1) return null;
    const zoneInput = input.zone && typeof input.zone === 'object' ? input.zone : {};
    const zone = { vnum: integer(zoneInput.vnum), name: text(zoneInput.name, 180) };
    if (zone.vnum <= 0) return null;
    const rawSummary = input.summary && typeof input.summary === 'object' ? input.summary : {};
    const summary = {};
    for (const key of ['loadable', 'found', 'missing', 'upgrades', 'tossups', 'downgrades', 'unusable', 'neutral', 'displayed']) {
      summary[key] = Math.max(0, integer(rawSummary[key]));
    }
    summary.truncated = rawSummary.truncated === true;
    const items = (Array.isArray(input.items) ? input.items : [])
      .slice(0, 64).map(normalizeItem).filter(Boolean)
      .sort((left, right) => (PRIORITY[left.verdict] ?? 99) - (PRIORITY[right.verdict] ?? 99)
        || left.name.localeCompare(right.name) || left.vnum - right.vnum);
    return {
      schema: 1,
      trigger: text(input.trigger, 32) || 'foundlist',
      timestamp: Math.max(0, integer(input.timestamp)),
      zone,
      summary,
      items
    };
  }

  function isUnusable(verdict) {
    return verdict === 'cannot-wear' || verdict === 'needs-remorts' || verdict === 'not-comparable';
  }

  function filterItems(snapshot, filter = 'all') {
    const normalizedFilter = FILTERS.has(filter) ? filter : 'all';
    const items = Array.isArray(snapshot?.items) ? snapshot.items : [];
    if (normalizedFilter === 'all') return items;
    if (normalizedFilter === 'unusable') return items.filter((item) => isUnusable(item.verdict));
    return items.filter((item) => item.verdict === normalizedFilter);
  }

  return { FILTERS, normalizeInfo, filterItems, isUnusable };
});
