(function mobInspectorModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireMobInspector = api;
}(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const MAX_EFFECTS = 64;
  const ICON_VIEWBOX = '0 0 48 48';
  const ICON_PATHS = Object.freeze({
    creature: Object.freeze([
      'M12 18 8 10l9 5c2-2 5-3 7-3s5 1 7 3l9-5-4 8c3 3 5 7 5 12 0 8-7 14-17 14S7 38 7 30c0-5 2-9 5-12Z',
      'M17 28c2 0 3-1 3-3s-1-3-3-3-3 1-3 3 1 3 3 3Zm14 0c2 0 3-1 3-3s-1-3-3-3-3 1-3 3 1 3 3 3ZM18 36c4 3 8 3 12 0'
    ]),
    undead: Object.freeze([
      'M24 5C14 5 8 12 8 22c0 7 4 12 9 15v6h5v-6h4v6h5v-6c5-3 9-8 9-15C40 12 34 5 24 5Z',
      'M17 27c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4Zm14 0c2 0 4-2 4-4s-2-4-4-4-4 2-4 4 2 4 4 4ZM24 28l-4 6h8l-4-6Z'
    ]),
    machine: Object.freeze([
      'M14 10h20l4 7v20H10V17l4-7Zm-6 11H4v10h4m32-10h4v10h-4M17 6V2m14 4V2',
      'M18 27a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm12 0a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 33h14'
    ]),
    caster: Object.freeze([
      'M24 4 11 20l5 3-5 16h26l-5-16 5-3L24 4Z',
      'M18 28c2-4 10-4 12 0M24 17v7m-4-3h8'
    ]),
    fighter: Object.freeze([
      'M24 5 10 12v11c0 10 6 17 14 21 8-4 14-11 14-21V12L24 5Z',
      'M16 19h16M24 13v20M18 28l6 5 6-5'
    ])
  });

  function cleanText(value, maximum = 240) {
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

  function nonNegativeInteger(value, fallback = 0) {
    return Math.max(0, finiteInteger(value, fallback));
  }

  function booleanValue(value) {
    return value === true;
  }

  function normalizeEffect(input = {}, index = 0) {
    const spell = cleanText(input.spell || input.name, 160);
    if (!spell) return null;
    const expireAt = nonNegativeInteger(input.expire_at ?? input.expireAt, 0);
    const permanent = typeof input.permanent === 'boolean' ? input.permanent : expireAt <= 0;
    return {
      id: cleanText(input.id, 64) || `mob-effect-${index + 1}`,
      spellId: finiteInteger(input.spell_id ?? input.spellId, 0),
      spell,
      durationText: cleanText(input.duration_text ?? input.durationText, 80),
      remaining: finiteInteger(input.remaining, permanent ? -1 : 0),
      startTime: nonNegativeInteger(input.start_time ?? input.startTime, 0),
      duration: nonNegativeInteger(input.duration, 0),
      expireAt,
      permanent,
      location: finiteInteger(input.location, -1),
      apply: cleanText(input.apply, 120),
      modifier: finiteInteger(input.modifier, 0),
      grants: cleanText(input.grants, 160),
      sourceType: cleanText(input.source_type ?? input.sourceType, 40).toLocaleLowerCase() || 'unknown'
    };
  }

  function normalizeAffects(input = {}) {
    const effects = (Array.isArray(input.effects) ? input.effects : [])
      .slice(0, MAX_EFFECTS)
      .map(normalizeEffect)
      .filter(Boolean);
    return {
      schema: Math.max(1, finiteInteger(input.schema, 1)),
      serverTime: nonNegativeInteger(input.server_time ?? input.serverTime, 0),
      count: Math.max(effects.length, nonNegativeInteger(input.count, effects.length)),
      total: Math.max(effects.length, nonNegativeInteger(input.total, effects.length)),
      omittedCount: nonNegativeInteger(input.omitted_count ?? input.omittedCount, 0),
      truncated: Boolean(input.truncated),
      target: input.target && typeof input.target === 'object'
        ? {
            name: cleanText(input.target.name, 180),
            type: cleanText(input.target.type, 40).toLocaleLowerCase(),
            vnum: finiteInteger(input.target.vnum, 0),
            instanceId: finiteInteger(input.target.instance_id ?? input.target.instanceId, 0)
          }
        : null,
      effects
    };
  }

  function normalizeMobInfo(input = {}) {
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const context = source.context && typeof source.context === 'object' ? source.context : {};
    const mob = source.mob && typeof source.mob === 'object' ? source.mob : {};
    const flags = mob.flags && typeof mob.flags === 'object' ? mob.flags : {};
    const health = source.health && typeof source.health === 'object' ? source.health : {};
    const zone = source.zone && typeof source.zone === 'object' ? source.zone : {};
    const consider = source.consider && typeof source.consider === 'object' ? source.consider : {};
    const history = source.history && typeof source.history === 'object' ? source.history : {};
    const mastery = source.zone_mastery && typeof source.zone_mastery === 'object'
      ? source.zone_mastery
      : (source.zoneMastery && typeof source.zoneMastery === 'object' ? source.zoneMastery : {});

    return {
      schema: Math.max(1, finiteInteger(source.schema, 1)),
      trigger: cleanText(source.trigger, 40).toLocaleLowerCase() || 'request',
      serverTime: nonNegativeInteger(source.server_time ?? source.serverTime, 0),
      affectsOmittedForSize: Boolean(source.affects_omitted_for_size ?? source.affectsOmittedForSize),
      context: {
        lookupArg: cleanText(context.lookup_arg ?? context.lookupArg, 320),
        lookupHadArgument: Boolean(context.lookup_had_argument ?? context.lookupHadArgument),
        resolvedFromCurrentTarget: Boolean(context.resolved_from_current_target ?? context.resolvedFromCurrentTarget),
        roomVnum: nonNegativeInteger(context.room_vnum ?? context.roomVnum, 0),
        isCurrentTarget: Boolean(context.is_current_target ?? context.isCurrentTarget),
        inCombatWithPlayer: Boolean(context.in_combat_with_player ?? context.inCombatWithPlayer),
        status: cleanText(context.status, 80).toLocaleLowerCase()
      },
      mob: {
        vnum: finiteInteger(mob.vnum, 0),
        instanceId: finiteInteger(mob.instance_id ?? mob.instanceId, 0),
        name: cleanText(mob.name, 220) || 'Unknown creature',
        keywords: cleanText(mob.keywords, 320),
        live: mob.live !== false,
        level: nonNegativeInteger(mob.level, 0),
        remorts: nonNegativeInteger(mob.remorts, 0),
        className: cleanText(mob.class ?? mob.className, 100),
        flags: {
          boss: booleanValue(flags.boss),
          miniboss: booleanValue(flags.miniboss),
          aggressive: booleanValue(flags.aggressive),
          machine: booleanValue(flags.machine),
          undead: booleanValue(flags.undead),
          prestige: booleanValue(flags.prestige),
          noKill: booleanValue(flags.no_kill ?? flags.noKill)
        }
      },
      health: {
        available: health.available === true,
        current: finiteInteger(health.current, 0),
        max: Math.max(0, finiteInteger(health.max, 0)),
        percent: Math.max(0, Math.min(100, finiteInteger(health.percent, 0))),
        fighting: cleanText(health.fighting, 180)
      },
      zone: {
        vnum: finiteInteger(zone.vnum, 0),
        name: cleanText(zone.name, 220) || 'Unknown',
        suggestedRemorts: cleanText(zone.suggested_remorts ?? zone.suggestedRemorts, 120) || 'Unknown'
      },
      consider: {
        available: consider.available === true,
        score: finiteInteger(consider.score, 0),
        label: cleanText(consider.label, 160),
        advice: cleanText(consider.advice, 360),
        groupSize: Math.max(1, finiteInteger(consider.group_size ?? consider.groupSize, 1)),
        groupAvgRemorts: nonNegativeInteger(consider.group_avg_remorts ?? consider.groupAvgRemorts, 0),
        groupLabel: cleanText(consider.group_label ?? consider.groupLabel, 80) || 'Solo'
      },
      history: {
        available: history.available === true,
        yourKills: nonNegativeInteger(history.your_kills ?? history.yourKills, 0),
        worldKills: nonNegativeInteger(history.world_kills ?? history.worldKills, 0),
        yourRank: nonNegativeInteger(history.your_rank ?? history.yourRank, 0),
        liveWorld: nonNegativeInteger(history.live_world ?? history.liveWorld, 0),
        liveZone: nonNegativeInteger(history.live_zone ?? history.liveZone, 0),
        exactMobDeathsAvailable: Boolean(history.exact_mob_deaths_available ?? history.exactMobDeathsAvailable),
        lastKillAvailable: Boolean(history.last_kill_available ?? history.lastKillAvailable)
      },
      zoneMastery: {
        available: mastery.available === true,
        kills: nonNegativeInteger(mastery.kills, 0),
        deaths: nonNegativeInteger(mastery.deaths, 0),
        bossKills: nonNegativeInteger(mastery.boss_kills ?? mastery.bossKills, 0),
        minibossKills: nonNegativeInteger(mastery.miniboss_kills ?? mastery.minibossKills, 0),
        toughestKill: cleanText(mastery.toughest_kill ?? mastery.toughestKill, 220),
        scope: cleanText(mastery.scope, 40).toLocaleLowerCase() || 'zone'
      },
      affects: normalizeAffects(source.affects || {})
    };
  }

  function snapshotSignature(input = {}, options = {}) {
    const snapshot = options.normalized === true ? input : normalizeMobInfo(input);
    return JSON.stringify(snapshot);
  }

  function classCategory(classNameValue) {
    const className = cleanText(classNameValue, 100).toLocaleLowerCase();
    if (!className) return '';
    if (/(mage|wizard|sorcer|occult|cleric|priest|psion|warlock|necrom|druid|shaman|witch|mystic|caster)/u.test(className)) return 'caster';
    if (/(warrior|fighter|barbar|berserk|soldier|knight|merc|brute|tank|brawler|samurai|paladin)/u.test(className)) return 'fighter';
    return '';
  }

  function category(snapshotInput = {}, options = {}) {
    const snapshot = options.normalized === true ? snapshotInput : normalizeMobInfo(snapshotInput);
    const flags = snapshot.mob.flags;
    if (flags.machine) return { id: 'machine', label: 'Machine' };
    if (flags.undead) return { id: 'undead', label: 'Undead' };
    const fromClass = classCategory(snapshot.mob.className);
    if (fromClass === 'caster') return { id: 'caster', label: 'Caster' };
    if (fromClass === 'fighter') return { id: 'fighter', label: 'Fighter' };
    return { id: 'creature', label: 'Creature' };
  }

  function iconDefinition(categoryIdValue) {
    const categoryId = Object.hasOwn(ICON_PATHS, categoryIdValue) ? categoryIdValue : 'creature';
    return {
      viewBox: ICON_VIEWBOX,
      paths: ICON_PATHS[categoryId]
    };
  }

  function descriptorLabels(snapshotInput = {}, options = {}) {
    const snapshot = options.normalized === true ? snapshotInput : normalizeMobInfo(snapshotInput);
    const labels = [];
    const flags = snapshot.mob.flags;
    if (flags.boss) labels.push('Boss');
    else if (flags.miniboss) labels.push('Miniboss');
    if (flags.undead) labels.push('Undead');
    if (flags.machine) labels.push('Machine');
    if (flags.prestige) labels.push('Prestige');
    if (flags.aggressive) labels.push('Aggressive');
    if (flags.noKill) labels.push('No-kill');
    if (snapshot.mob.className) labels.push(snapshot.mob.className);
    return labels;
  }

  function nameKey(value) {
    return cleanText(value, 220).toLocaleLowerCase();
  }

  function namesMatch(left, right) {
    const a = nameKey(left);
    const b = nameKey(right);
    return Boolean(a && b && a === b);
  }

  function matchesOpponent(snapshotInput = {}, opponent = {}, options = {}) {
    const snapshot = options.normalized === true ? snapshotInput : normalizeMobInfo(snapshotInput);
    const opponentInstance = nonNegativeInteger(opponent?.instanceId ?? opponent?.instance_id, 0);
    if (snapshot.mob.instanceId > 0 && opponentInstance > 0) return snapshot.mob.instanceId === opponentInstance;
    const opponentVnum = nonNegativeInteger(opponent?.vnum ?? opponent?.mob_vnum ?? opponent?.mobVnum, 0);
    if (snapshot.mob.vnum > 0 && opponentVnum > 0) return snapshot.mob.vnum === opponentVnum;
    return namesMatch(snapshot.mob.name, opponent?.name);
  }

  function isClearPacket(input = {}) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return false;
    const context = input.context && typeof input.context === 'object' ? input.context : {};
    const status = cleanText(context.status, 80).toLocaleLowerCase();
    return input.clear === true || (input.mob === null && ['no_current_target', 'target_lost', 'clear'].includes(status));
  }

  return {
    MAX_EFFECTS,
    normalizeEffect,
    normalizeAffects,
    normalizeMobInfo,
    snapshotSignature,
    category,
    iconDefinition,
    descriptorLabels,
    namesMatch,
    matchesOpponent,
    isClearPacket
  };
}));
