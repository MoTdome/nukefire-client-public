(function attachReaderSafety(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireReaderSafety = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createReaderSafetyApi() {
  'use strict';

  const DEFAULT_SELF_CRITICAL_RATIO = 0.25;
  const DEFAULT_GROUP_CRITICAL_RATIO = 0.20;
  const DEFAULT_HEAVY_DAMAGE_RATIO = 0.25;

  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  }

  function ratio(current, maximum) {
    const now = number(current);
    const max = number(maximum);
    if (now === null || max === null || max <= 0) return null;
    return Math.max(0, Math.min(1, now / max));
  }

  function cleanName(value, fallback = 'Unknown') {
    return String(value || fallback).replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, 100) || fallback;
  }

  function percentage(value) {
    return Math.max(0, Math.min(100, Math.round((Number(value) || 0) * 100)));
  }

  class ReaderSafetyLane {
    constructor(options = {}) {
      this.enabled = options.enabled !== false;
      this.selfCriticalRatio = number(options.selfCriticalRatio) ?? DEFAULT_SELF_CRITICAL_RATIO;
      this.groupCriticalRatio = number(options.groupCriticalRatio) ?? DEFAULT_GROUP_CRITICAL_RATIO;
      this.heavyDamageRatio = number(options.heavyDamageRatio) ?? DEFAULT_HEAVY_DAMAGE_RATIO;
      this.reset();
    }

    reset() {
      this.lastSelfRatio = null;
      this.lastOpponentName = '';
      this.groupRatios = new Map();
      return true;
    }

    setEnabled(value) {
      this.enabled = Boolean(value);
      return this.enabled;
    }

    status() {
      return Object.freeze({
        enabled: this.enabled,
        selfCriticalPercent: percentage(this.selfCriticalRatio),
        groupCriticalPercent: percentage(this.groupCriticalRatio),
        heavyDamagePercent: percentage(this.heavyDamageRatio)
      });
    }

    process(packageName, body, snapshot = {}) {
      if (!this.enabled) return [];
      const name = String(packageName || '');
      if (name === 'NukeFire.Combat') return this._combat(body, snapshot);
      if (name === 'Char.Vitals') return this._vitals(body || snapshot?.char?.vitals, snapshot);
      if (name === 'Group') return this._group(body || snapshot?.group, snapshot);
      return [];
    }

    _combat(body = {}, snapshot = {}) {
      const incoming = body?.in && typeof body.in === 'object' ? body.in : {};
      const deaths = Math.max(0, Number(incoming.deaths) || 0);
      if (deaths > 0) return [Object.freeze({ kind: 'death', priority: 100, text: 'Death alert. You died.' })];

      const damage = Math.max(0, Number(incoming.damage) || 0);
      if (!damage) return [];
      const vitals = snapshot?.char?.vitals || {};
      const maxHp = number(vitals.mhp ?? vitals.maxhp ?? vitals.maxHp);
      if (!maxHp || maxHp <= 0) return [];
      const fraction = damage / maxHp;
      if (fraction < this.heavyDamageRatio) return [];
      return [Object.freeze({
        kind: 'heavy-damage',
        priority: 80,
        text: `Danger alert. Incoming damage was ${percentage(fraction)} percent of maximum health.`
      })];
    }

    _vitals(body = {}, snapshot = {}) {
      const alerts = [];
      const hpRatio = ratio(body?.hp ?? body?.health, body?.mhp ?? body?.maxhp ?? body?.maxHp);
      if (hpRatio !== null) {
        if (this.lastSelfRatio !== null && this.lastSelfRatio > this.selfCriticalRatio && hpRatio <= this.selfCriticalRatio && hpRatio > 0) {
          alerts.push(Object.freeze({
            kind: 'critical-health',
            priority: 90,
            text: `Critical health. ${percentage(hpRatio)} percent remaining.`
          }));
        }
        if (this.lastSelfRatio !== null && this.lastSelfRatio > 0 && hpRatio <= 0) {
          alerts.push(Object.freeze({ kind: 'death', priority: 100, text: 'Death alert. Your health reached zero.' }));
        }
        this.lastSelfRatio = hpRatio;
      }

      const opponent = body?.opponent && typeof body.opponent === 'object' ? body.opponent : null;
      const opponentName = opponent ? cleanName(opponent.name, '') : '';
      if (opponentName && !this.lastOpponentName) {
        alerts.push(Object.freeze({
          kind: 'combat-start',
          priority: 70,
          text: `Combat alert. ${opponentName} is now your opponent.`
        }));
      }
      this.lastOpponentName = opponentName;
      return alerts;
    }

    _group(body = {}, snapshot = {}) {
      const members = Array.isArray(body?.members) ? body.members : [];
      const selfName = cleanName(snapshot?.char?.status?.name, '').toLocaleLowerCase();
      const next = new Map();
      const alerts = [];
      for (const member of members) {
        const name = cleanName(member?.name, 'Group member');
        if (name.toLocaleLowerCase() === selfName) continue;
        const info = member?.info && typeof member.info === 'object' ? member.info : {};
        const hpRatio = ratio(info.hp, info.mhp);
        if (hpRatio === null) continue;
        const key = name.toLocaleLowerCase();
        const previous = this.groupRatios.get(key);
        next.set(key, hpRatio);
        if (previous === undefined) continue;
        if (previous > 0 && hpRatio <= 0) {
          alerts.push(Object.freeze({ kind: 'group-death', priority: 95, text: `Group alert. ${name} has reached zero health.` }));
        } else if (previous > this.groupCriticalRatio && hpRatio <= this.groupCriticalRatio) {
          alerts.push(Object.freeze({
            kind: 'group-critical-health',
            priority: 85,
            text: `Group alert. ${name} is at ${percentage(hpRatio)} percent health.`
          }));
        }
      }
      this.groupRatios = next;
      return alerts;
    }
  }

  return Object.freeze({
    DEFAULT_SELF_CRITICAL_RATIO,
    DEFAULT_GROUP_CRITICAL_RATIO,
    DEFAULT_HEAVY_DAMAGE_RATIO,
    ReaderSafetyLane
  });
});
