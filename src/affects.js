(function affectsModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireAffects = api;
}(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const MAX_EFFECTS = 64;
  const MAX_GROUPS = 48;

  const HARMFUL_SPELL_NAMES = new Set([
    'blindness',
    'chill touch',
    'curse',
    'doom',
    "doom bringer's curse",
    "doombringer's curse",
    'pestilence',
    'poison',
    'rotting blight',
    'sleep'
  ]);

  const NEGATIVE_IS_HARMFUL_APPLIES = new Set([
    'STR', 'DEX', 'INT', 'WIS', 'CON', 'CHA',
    'BULLET IMPACT DAMAGE', 'AMMO EFFICIENCY', 'CRIT CHANCE',
    'MAXMANA', 'MAXHIT', 'MAXMOVE', 'HITROLL', 'DAMROLL',
    'TRUE DAMAGE', 'MELEE POWER', 'ARCANE DAMPENING', 'SPIKE GUARD',
    'DAM REDUCTION', 'MANA REGEN', 'MOVE REGEN', 'HIT REGEN',
    'DODGEROLL', 'LEECH', 'SPELLPOWER', 'SHIELDBLOCK', 'ONE HIT'
  ]);

  function normalizeApplyName(value) {
    return cleanText(value, 120).replace(/[_-]+/gu, ' ').replace(/\s+/gu, ' ').trim().toLocaleUpperCase();
  }

  function isHarmfulModifier(applyValue, modifierValue) {
    const apply = normalizeApplyName(applyValue);
    const modifier = finiteInteger(modifierValue, 0);
    if (!apply || modifier === 0) return false;
    if (apply === 'ARMOR') return modifier > 0;
    if (apply === 'FIGHTSPEED') return modifier > 0;
    if (apply === 'MAJOR WOUND') return modifier > 0;
    return NEGATIVE_IS_HARMFUL_APPLIES.has(apply) && modifier < 0;
  }

  function isHarmfulSpell(value) {
    const name = cleanText(value, 160).toLocaleLowerCase().replace(/\s+/gu, ' ').trim();
    return HARMFUL_SPELL_NAMES.has(name);
  }

  function cleanText(value, maximum = 180) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f]/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, maximum);
  }

  function finiteInteger(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : fallback;
  }

  function normalizeEffect(input = {}, index = 0) {
    const spell = cleanText(input.spell || input.name, 160);
    if (!spell) return null;

    const rawId = cleanText(input.id, 48);
    const expireAt = Math.max(0, finiteInteger(input.expire_at ?? input.expireAt, 0));
    const hasExplicitPermanent = typeof input.permanent === 'boolean';
    const permanent = hasExplicitPermanent ? input.permanent : expireAt <= 0;
    const apply = cleanText(input.apply, 120);
    const modifier = finiteInteger(input.modifier, 0);
    const intrinsicHarmful = typeof input.harmful === 'boolean'
      ? input.harmful
      : isHarmfulSpell(spell);
    return {
      id: rawId || `effect-${index + 1}`,
      spellId: finiteInteger(input.spell_id ?? input.spellId, 0),
      spell,
      durationText: cleanText(input.duration_text ?? input.durationText, 80),
      remaining: finiteInteger(input.remaining, permanent ? -1 : 0),
      startTime: Math.max(0, finiteInteger(input.start_time ?? input.startTime, 0)),
      duration: Math.max(0, finiteInteger(input.duration, 0)),
      expireAt,
      permanent,
      location: finiteInteger(input.location, -1),
      apply,
      modifier,
      harmful: intrinsicHarmful,
      grants: cleanText(input.grants, 160),
      sourceType: cleanText(input.source_type ?? input.sourceType ?? input.source, 40).toLocaleLowerCase() || 'unknown'
    };
  }

  function normalizeAffectsState(input = {}) {
    const effects = (Array.isArray(input.effects) ? input.effects : [])
      .slice(0, MAX_EFFECTS)
      .map(normalizeEffect)
      .filter(Boolean);

    return {
      schema: Math.max(1, finiteInteger(input.schema, 1)),
      revision: Math.max(0, finiteInteger(input.revision, 0)),
      serverTime: Math.max(0, finiteInteger(input.server_time ?? input.serverTime, 0)),
      count: Math.max(effects.length, finiteInteger(input.count, effects.length)),
      total: Math.max(effects.length, finiteInteger(input.total, effects.length)),
      timedCount: Math.max(0, finiteInteger(input.timed_count ?? input.timedCount, effects.filter((effect) => !effect.permanent).length)),
      permanentCount: Math.max(0, finiteInteger(input.permanent_count ?? input.permanentCount, effects.filter((effect) => effect.permanent).length)),
      hiddenPermanent: Math.max(0, finiteInteger(input.hidden_permanent ?? input.hiddenPermanent, 0)),
      truncated: Boolean(input.truncated),
      effects
    };
  }

  function groupEffects(input = {}, options = {}) {
    const snapshot = options.normalized === true ? input : normalizeAffectsState(input);
    const groups = new Map();

    for (const effect of snapshot.effects) {
      const key = [
        effect.spellId,
        effect.spell.toLocaleLowerCase(),
        effect.permanent ? 'permanent' : effect.expireAt,
        effect.sourceType
      ].join('|');
      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          ids: [],
          spellId: effect.spellId,
          spell: effect.spell,
          permanent: effect.permanent,
          expireAt: effect.expireAt,
          remaining: effect.remaining,
          durationText: effect.durationText,
          sourceType: effect.sourceType,
          harmful: Boolean(effect.harmful),
          modifiers: [],
          grants: []
        };
        groups.set(key, group);
      }

      group.ids.push(effect.id);
      group.harmful = group.harmful || Boolean(effect.harmful);
      if (effect.apply || effect.modifier) {
        const signature = `${effect.apply}|${effect.modifier}`;
        if (!group.modifiers.some((entry) => entry.signature === signature)) {
          group.modifiers.push({
            signature,
            apply: effect.apply,
            modifier: effect.modifier,
            location: effect.location,
            harmful: isHarmfulModifier(effect.apply, effect.modifier)
          });
        }
      }
      if (effect.grants && !group.grants.includes(effect.grants)) group.grants.push(effect.grants);
    }

    for (const group of groups.values()) {
      if (!group.harmful && group.modifiers.length > 0 &&
          group.modifiers.every((entry) => entry.harmful === true)) {
        group.harmful = true;
      }
    }

    return [...groups.values()]
      .sort((left, right) => {
        if (left.permanent !== right.permanent) return left.permanent ? 1 : -1;
        if (!left.permanent && left.expireAt !== right.expireAt) return left.expireAt - right.expireAt;
        return left.spell.localeCompare(right.spell);
      })
      .slice(0, MAX_GROUPS);
  }

  function estimatedServerNowMs(snapshotInput, receivedAtMs, nowMs = Date.now()) {
    const source = snapshotInput && typeof snapshotInput === 'object' ? snapshotInput : {};
    const serverTime = Math.max(0, finiteInteger(source.server_time ?? source.serverTime, 0));
    if (serverTime <= 0) return nowMs;
    const received = Number(receivedAtMs);
    const elapsed = Number.isFinite(received) ? Math.max(0, nowMs - received) : 0;
    return serverTime * 1000 + elapsed;
  }

  function remainingSeconds(effect, snapshotInput, receivedAtMs, nowMs = Date.now()) {
    if (!effect || effect.permanent) return -1;
    if (effect.expireAt > 0) {
      return Math.max(0, Math.ceil((effect.expireAt * 1000 - estimatedServerNowMs(snapshotInput, receivedAtMs, nowMs)) / 1000));
    }
    return Math.max(0, finiteInteger(effect.remaining, 0));
  }

  function formatRemaining(seconds, permanent = false) {
    if (permanent || seconds < 0) return 'Permanent';
    const remaining = Math.max(0, finiteInteger(seconds, 0));
    if (remaining <= 0) return 'Expiring';
    if (remaining < 60) return `${remaining}s`;
    if (remaining < 3600) return `${Math.floor(remaining / 60)}m ${remaining % 60}s`;
    if (remaining < 86400) return `${Math.floor(remaining / 3600)}h ${Math.floor((remaining % 3600) / 60)}m`;
    return `${Math.floor(remaining / 86400)}d ${Math.floor((remaining % 86400) / 3600)}h`;
  }

  function sourceTypeLabel(value) {
    const source = cleanText(value, 40).toLocaleLowerCase();
    const labels = {
      spell: 'Spell',
      object: 'Equipment',
      implant: 'Implant',
      tattoo: 'Tattoo',
      remort: 'Remort',
      other: 'Other'
    };
    return labels[source] || (source ? source.charAt(0).toLocaleUpperCase() + source.slice(1) : 'Unknown');
  }

  function groupDetailEntries(group = {}) {
    const details = [];
    for (const modifier of Array.isArray(group.modifiers) ? group.modifiers : []) {
      if (!modifier?.apply && !modifier?.modifier) continue;
      const amount = finiteInteger(modifier.modifier, 0);
      const prefix = amount > 0 ? `+${amount}` : String(amount);
      details.push({
        text: `${prefix} ${cleanText(modifier.apply, 120) || 'modifier'}`.trim(),
        harmful: typeof modifier.harmful === 'boolean'
          ? modifier.harmful
          : isHarmfulModifier(modifier.apply, amount)
      });
    }
    for (const grant of Array.isArray(group.grants) ? group.grants : []) {
      const name = cleanText(grant, 160);
      if (name) details.push({ text: `Grants ${name}`, harmful: false });
    }
    return details;
  }

  function groupDetailLines(group = {}) {
    return groupDetailEntries(group).map((entry) => entry.text);
  }

  function snapshotSignature(input = {}, options = {}) {
    const revision = Math.max(0, finiteInteger(input?.revision, 0));
    if (revision > 0) return `revision:${revision}`;
    const snapshot = options.normalized === true ? input : normalizeAffectsState(input);
    return JSON.stringify({
      serverTime: snapshot.serverTime,
      hiddenPermanent: snapshot.hiddenPermanent,
      truncated: snapshot.truncated,
      effects: snapshot.effects.map((effect) => [
        effect.id, effect.spellId, effect.spell, effect.expireAt,
        effect.permanent, effect.location, effect.apply, effect.modifier,
        effect.harmful, effect.grants, effect.sourceType
      ])
    });
  }

  return {
    MAX_EFFECTS,
    MAX_GROUPS,
    normalizeEffect,
    normalizeAffectsState,
    groupEffects,
    estimatedServerNowMs,
    remainingSeconds,
    formatRemaining,
    sourceTypeLabel,
    isHarmfulModifier,
    isHarmfulSpell,
    groupDetailEntries,
    groupDetailLines,
    snapshotSignature
  };
}));
