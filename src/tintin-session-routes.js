'use strict';

(function exposeTinTinSessionRoutes(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireTinTinSessionRoutes = api;
})(typeof window !== 'undefined' ? window : globalThis, function createTinTinSessionRoutes() {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeTarget(value) {
    return String(value || '').normalize('NFKC').trim().toLowerCase();
  }

  function normalizeProfile(value = {}) {
    return {
      requested: String(value?.requested || '').trim().slice(0, 255),
      filename: String(value?.filename || '').trim().slice(0, 255),
      loaded: value?.loaded === true
    };
  }

  function sessionKeyMap(sessionsValue = []) {
    const map = new Map();
    for (const raw of Array.isArray(sessionsValue) ? sessionsValue : []) {
      if (!raw || typeof raw !== 'object') continue;
      const id = normalizeTarget(raw.id);
      const name = normalizeTarget(raw.name);
      if (id && !map.has(id)) map.set(id, raw);
      if (name && !map.has(name)) map.set(name, raw);
    }
    return map;
  }

  function activeClassFromSnapshot(snapshot = {}) {
    const stack = Array.isArray(snapshot?.classes?.activeStack)
      ? snapshot.classes.activeStack.map(normalizeTarget).filter(Boolean)
      : [];
    return stack.at(-1) || '';
  }

  function prepareRoutedDefinitionPlan(options = {}) {
    const loader = options.loader;
    if (!loader || typeof loader.prepareTinTinRead !== 'function') {
      return { ok: false, errors: ['TinTin routed-definition parser is unavailable.'], updates: [], skipped: [], appliedCommands: 0 };
    }
    const routes = Array.isArray(options.routes) ? options.routes : [];
    const sessions = Array.isArray(options.sessions) ? options.sessions : [];
    const sourceSessionId = normalizeTarget(options.sourceSessionId);
    const lookup = sessionKeyMap(sessions);
    const staged = new Map();
    const activeClasses = new Map();
    const skipped = [];
    const errors = [];
    let appliedCommands = 0;

    for (const route of routes) {
      const targetKey = normalizeTarget(route?.target);
      const target = lookup.get(targetKey);
      const label = String(route?.filename || options.filename || 'script');
      const line = Number(route?.line) || 1;
      if (!target) {
        skipped.push({ ...clone(route), reason: `Unknown session ${route?.target || ''}.` });
        continue;
      }
      const targetId = normalizeTarget(target.id);
      if (targetId && targetId === sourceSessionId) {
        skipped.push({ ...clone(route), reason: 'Self-routed definitions are deferred; read this multi-session file from Main/GTS.' });
        continue;
      }

      const current = staged.has(targetId)
        ? clone(staged.get(targetId).after)
        : clone(target.tintin || {});
      const profile = normalizeProfile(current.profile);
      const activeClass = activeClasses.has(targetId)
        ? activeClasses.get(targetId)
        : activeClassFromSnapshot(current);
      const parsed = loader.prepareTinTinRead(String(route?.command || ''), current, {
        filename: label,
        activeClass
      });
      if (!parsed?.ok) {
        const detail = (parsed?.errors || ['TinTin routed definition could not be parsed.']).join(' ');
        errors.push(`${label}:${line}: ${target.name || target.id}: ${detail}`);
        break;
      }

      const after = clone(parsed.definitions || {});
      after.profile = profile;
      const previous = staged.get(targetId);
      staged.set(targetId, {
        sessionId: String(target.id || ''),
        name: String(target.name || target.id || ''),
        before: previous ? previous.before : clone(target.tintin || {}),
        after,
        commands: (previous?.commands || 0) + 1
      });
      activeClasses.set(targetId, parsed.activeClass || '');
      appliedCommands += 1;
    }

    return {
      ok: errors.length === 0,
      errors,
      updates: errors.length ? [] : [...staged.values()],
      skipped,
      appliedCommands: errors.length ? 0 : appliedCommands
    };
  }

  return Object.freeze({
    prepareRoutedDefinitionPlan,
    activeClassFromSnapshot,
    normalizeTarget
  });
});
