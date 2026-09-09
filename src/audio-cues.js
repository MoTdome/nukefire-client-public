(function attachAudioCues(root, factory) {
  const exported = factory(root || globalThis);
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireAudioCues = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createAudioCueApi(root) {
  'use strict';

  const DEFAULT_AUDIO_CUE_VOLUME = 0.65;
  const CUSTOM_CUE_PATTERN = /^custom\.[a-z0-9]+(?:[._-][a-z0-9]+)*$/u;
  const MAX_CUSTOM_CUE_ID = 80;
  const AUDIO_CUE_IDS = Object.freeze([
    'hit', 'miss', 'incoming', 'critical', 'catastrophic', 'kill', 'danger',
    'health-75', 'health-50', 'health-10',
    'mana-20', 'mana-5', 'move-50', 'move-5',
    'combat-start', 'combat-end', 'group-critical', 'group-down',
    'tell', 'auction', 'gossip', 'group', 'grats', 'shout', 'holler', 'skynet', 'ssf', 'stairs'
  ]);

  const CUE_DEFINITIONS = Object.freeze({
    hit: Object.freeze([
      Object.freeze({ offset: 0, frequency: 880, duration: 0.045, gain: 0.72, type: 'square' })
    ]),
    miss: Object.freeze([
      Object.freeze({ offset: 0, frequency: 180, duration: 0.07, gain: 0.55, type: 'triangle' })
    ]),
    incoming: Object.freeze([
      Object.freeze({ offset: 0, frequency: 520, endFrequency: 260, duration: 0.09, gain: 0.64, type: 'sawtooth' })
    ]),
    critical: Object.freeze([
      Object.freeze({ offset: 0, frequency: 1040, duration: 0.04, gain: 0.72, type: 'square' }),
      Object.freeze({ offset: 0.065, frequency: 1320, duration: 0.045, gain: 0.72, type: 'square' })
    ]),
    catastrophic: Object.freeze([
      Object.freeze({ offset: 0, frequency: 1480, endFrequency: 740, duration: 0.075, gain: 0.76, type: 'sawtooth' }),
      Object.freeze({ offset: 0.09, frequency: 1180, endFrequency: 420, duration: 0.09, gain: 0.78, type: 'sawtooth' }),
      Object.freeze({ offset: 0.195, frequency: 720, endFrequency: 180, duration: 0.1, gain: 0.8, type: 'square' })
    ]),
    kill: Object.freeze([
      Object.freeze({ offset: 0, frequency: 520, duration: 0.065, gain: 0.65, type: 'sine' }),
      Object.freeze({ offset: 0.075, frequency: 780, duration: 0.08, gain: 0.68, type: 'sine' })
    ]),
    danger: Object.freeze([
      Object.freeze({ offset: 0, frequency: 760, endFrequency: 430, duration: 0.085, gain: 0.72, type: 'square' }),
      Object.freeze({ offset: 0.105, frequency: 760, endFrequency: 430, duration: 0.085, gain: 0.72, type: 'square' }),
      Object.freeze({ offset: 0.21, frequency: 760, endFrequency: 430, duration: 0.1, gain: 0.74, type: 'square' })
    ]),
    'health-75': Object.freeze([
      Object.freeze({ offset: 0, frequency: 610, endFrequency: 500, duration: 0.07, gain: 0.52, type: 'sine' })
    ]),
    'health-50': Object.freeze([
      Object.freeze({ offset: 0, frequency: 600, endFrequency: 460, duration: 0.065, gain: 0.58, type: 'sine' }),
      Object.freeze({ offset: 0.08, frequency: 520, endFrequency: 390, duration: 0.07, gain: 0.6, type: 'sine' })
    ]),
    'health-10': Object.freeze([
      Object.freeze({ offset: 0, frequency: 930, endFrequency: 520, duration: 0.06, gain: 0.76, type: 'square' }),
      Object.freeze({ offset: 0.075, frequency: 930, endFrequency: 520, duration: 0.06, gain: 0.76, type: 'square' }),
      Object.freeze({ offset: 0.15, frequency: 930, endFrequency: 360, duration: 0.085, gain: 0.8, type: 'square' })
    ]),
    'mana-20': Object.freeze([
      Object.freeze({ offset: 0, frequency: 980, endFrequency: 820, duration: 0.075, gain: 0.5, type: 'sine' })
    ]),
    'mana-5': Object.freeze([
      Object.freeze({ offset: 0, frequency: 1120, endFrequency: 760, duration: 0.07, gain: 0.6, type: 'sine' }),
      Object.freeze({ offset: 0.085, frequency: 1120, endFrequency: 650, duration: 0.08, gain: 0.64, type: 'sine' })
    ]),
    'move-50': Object.freeze([
      Object.freeze({ offset: 0, frequency: 330, endFrequency: 270, duration: 0.08, gain: 0.5, type: 'triangle' })
    ]),
    'move-5': Object.freeze([
      Object.freeze({ offset: 0, frequency: 300, endFrequency: 210, duration: 0.08, gain: 0.6, type: 'triangle' }),
      Object.freeze({ offset: 0.095, frequency: 260, endFrequency: 170, duration: 0.09, gain: 0.64, type: 'triangle' })
    ]),
    'combat-start': Object.freeze([
      Object.freeze({ offset: 0, frequency: 360, duration: 0.055, gain: 0.58, type: 'sine' }),
      Object.freeze({ offset: 0.065, frequency: 620, duration: 0.065, gain: 0.62, type: 'sine' })
    ]),
    'combat-end': Object.freeze([
      Object.freeze({ offset: 0, frequency: 620, duration: 0.055, gain: 0.52, type: 'sine' }),
      Object.freeze({ offset: 0.065, frequency: 360, duration: 0.07, gain: 0.48, type: 'sine' })
    ]),
    'group-critical': Object.freeze([
      Object.freeze({ offset: 0, frequency: 430, duration: 0.055, gain: 0.62, type: 'triangle' }),
      Object.freeze({ offset: 0.07, frequency: 860, duration: 0.06, gain: 0.66, type: 'triangle' })
    ]),
    'group-down': Object.freeze([
      Object.freeze({ offset: 0, frequency: 540, duration: 0.055, gain: 0.66, type: 'triangle' }),
      Object.freeze({ offset: 0.065, frequency: 340, duration: 0.06, gain: 0.68, type: 'triangle' }),
      Object.freeze({ offset: 0.135, frequency: 190, duration: 0.075, gain: 0.7, type: 'triangle' })
    ]),
    tell: Object.freeze([
      Object.freeze({ offset: 0, frequency: 1220, duration: 0.045, gain: 0.52, type: 'sine' }),
      Object.freeze({ offset: 0.06, frequency: 1540, duration: 0.055, gain: 0.54, type: 'sine' })
    ]),
    auction: Object.freeze([
      Object.freeze({ offset: 0, frequency: 330, duration: 0.055, gain: 0.5, type: 'triangle' }),
      Object.freeze({ offset: 0.07, frequency: 495, duration: 0.055, gain: 0.52, type: 'triangle' }),
      Object.freeze({ offset: 0.14, frequency: 660, duration: 0.06, gain: 0.54, type: 'triangle' })
    ]),
    gossip: Object.freeze([
      Object.freeze({ offset: 0, frequency: 740, duration: 0.045, gain: 0.48, type: 'sine' }),
      Object.freeze({ offset: 0.065, frequency: 930, duration: 0.055, gain: 0.5, type: 'sine' })
    ]),
    group: Object.freeze([
      Object.freeze({ offset: 0, frequency: 640, duration: 0.045, gain: 0.48, type: 'sine' }),
      Object.freeze({ offset: 0.06, frequency: 820, duration: 0.055, gain: 0.5, type: 'sine' })
    ]),
    grats: Object.freeze([
      Object.freeze({ offset: 0, frequency: 660, duration: 0.04, gain: 0.46, type: 'triangle' }),
      Object.freeze({ offset: 0.05, frequency: 880, duration: 0.045, gain: 0.48, type: 'triangle' }),
      Object.freeze({ offset: 0.105, frequency: 1100, duration: 0.05, gain: 0.5, type: 'triangle' })
    ]),
    shout: Object.freeze([
      Object.freeze({ offset: 0, frequency: 520, duration: 0.055, gain: 0.5, type: 'triangle' }),
      Object.freeze({ offset: 0.07, frequency: 760, duration: 0.06, gain: 0.52, type: 'triangle' })
    ]),
    holler: Object.freeze([
      Object.freeze({ offset: 0, frequency: 460, duration: 0.055, gain: 0.5, type: 'triangle' }),
      Object.freeze({ offset: 0.07, frequency: 700, duration: 0.06, gain: 0.52, type: 'triangle' })
    ]),
    stairs: Object.freeze([
      Object.freeze({ offset: 0, frequency: 420, duration: 0.05, gain: 0.46, type: 'sine' }),
      Object.freeze({ offset: 0.065, frequency: 620, duration: 0.055, gain: 0.48, type: 'sine' }),
      Object.freeze({ offset: 0.135, frequency: 840, duration: 0.065, gain: 0.5, type: 'sine' })
    ]),
    skynet: Object.freeze([
      Object.freeze({ offset: 0, frequency: 1180, endFrequency: 590, duration: 0.06, gain: 0.52, type: 'square' }),
      Object.freeze({ offset: 0.075, frequency: 420, duration: 0.05, gain: 0.5, type: 'sawtooth' })
    ]),
    ssf: Object.freeze([
      Object.freeze({ offset: 0, frequency: 410, duration: 0.05, gain: 0.48, type: 'triangle' }),
      Object.freeze({ offset: 0.06, frequency: 550, duration: 0.05, gain: 0.5, type: 'triangle' }),
      Object.freeze({ offset: 0.12, frequency: 690, duration: 0.06, gain: 0.52, type: 'triangle' })
    ]),
    'door-open': Object.freeze([{ offset: 0, frequency: 240, endFrequency: 520, duration: 0.16, gain: 0.52, type: 'triangle' }]),
    'door-close': Object.freeze([{ offset: 0, frequency: 480, endFrequency: 180, duration: 0.14, gain: 0.56, type: 'triangle' }]),
    'door-lock': Object.freeze([{ offset: 0, frequency: 260, duration: 0.04, gain: 0.58, type: 'square' }, { offset: 0.065, frequency: 190, duration: 0.055, gain: 0.62, type: 'square' }]),
    'door-unlock': Object.freeze([{ offset: 0, frequency: 190, duration: 0.04, gain: 0.55, type: 'square' }, { offset: 0.065, frequency: 330, duration: 0.055, gain: 0.58, type: 'square' }]),
    'door-pick': Object.freeze([{ offset: 0, frequency: 720, duration: 0.025, gain: 0.46, type: 'square' }, { offset: 0.05, frequency: 920, duration: 0.03, gain: 0.5, type: 'square' }]),
    'door-break': Object.freeze([{ offset: 0, frequency: 180, endFrequency: 70, duration: 0.18, gain: 0.72, type: 'sawtooth' }]),
    'door-blocked': Object.freeze([{ offset: 0, frequency: 150, duration: 0.09, gain: 0.62, type: 'square' }]),
    'container-open': Object.freeze([{ offset: 0, frequency: 300, endFrequency: 470, duration: 0.11, gain: 0.46, type: 'triangle' }]),
    'container-close': Object.freeze([{ offset: 0, frequency: 420, endFrequency: 250, duration: 0.1, gain: 0.48, type: 'triangle' }]),
    'container-lock': Object.freeze([{ offset: 0, frequency: 310, duration: 0.035, gain: 0.5, type: 'square' }, { offset: 0.05, frequency: 220, duration: 0.04, gain: 0.52, type: 'square' }]),
    'container-unlock': Object.freeze([{ offset: 0, frequency: 220, duration: 0.035, gain: 0.48, type: 'square' }, { offset: 0.05, frequency: 390, duration: 0.04, gain: 0.5, type: 'square' }]),
    'container-pick': Object.freeze([{ offset: 0, frequency: 620, duration: 0.025, gain: 0.43, type: 'square' }, { offset: 0.045, frequency: 810, duration: 0.025, gain: 0.46, type: 'square' }]),
    'container-break': Object.freeze([{ offset: 0, frequency: 240, endFrequency: 90, duration: 0.14, gain: 0.66, type: 'sawtooth' }]),
    'object-get': Object.freeze([{ offset: 0, frequency: 430, duration: 0.035, gain: 0.42, type: 'triangle' }, { offset: 0.045, frequency: 610, duration: 0.045, gain: 0.44, type: 'triangle' }]),
    'object-retrieve': Object.freeze([{ offset: 0, frequency: 380, duration: 0.035, gain: 0.4, type: 'triangle' }, { offset: 0.045, frequency: 560, duration: 0.045, gain: 0.43, type: 'triangle' }]),
    'object-put': Object.freeze([{ offset: 0, frequency: 570, duration: 0.035, gain: 0.42, type: 'triangle' }, { offset: 0.045, frequency: 360, duration: 0.05, gain: 0.44, type: 'triangle' }]),
    'object-drop': Object.freeze([{ offset: 0, frequency: 300, endFrequency: 120, duration: 0.1, gain: 0.5, type: 'triangle' }]),
    'object-give': Object.freeze([{ offset: 0, frequency: 470, duration: 0.04, gain: 0.4, type: 'sine' }, { offset: 0.05, frequency: 720, duration: 0.05, gain: 0.43, type: 'sine' }]),
    'equipment-equip': Object.freeze([{ offset: 0, frequency: 260, duration: 0.035, gain: 0.48, type: 'square' }, { offset: 0.05, frequency: 460, duration: 0.05, gain: 0.5, type: 'triangle' }]),
    'equipment-remove': Object.freeze([{ offset: 0, frequency: 450, duration: 0.035, gain: 0.45, type: 'triangle' }, { offset: 0.05, frequency: 240, duration: 0.05, gain: 0.47, type: 'triangle' }]),
    'shop-buy': Object.freeze([{ offset: 0, frequency: 780, duration: 0.03, gain: 0.42, type: 'sine' }, { offset: 0.045, frequency: 1040, duration: 0.04, gain: 0.44, type: 'sine' }]),
    'shop-sell': Object.freeze([{ offset: 0, frequency: 1040, duration: 0.03, gain: 0.42, type: 'sine' }, { offset: 0.045, frequency: 780, duration: 0.04, gain: 0.44, type: 'sine' }]),
    'shop-insufficient-funds': Object.freeze([{ offset: 0, frequency: 220, duration: 0.07, gain: 0.58, type: 'square' }, { offset: 0.09, frequency: 180, duration: 0.08, gain: 0.6, type: 'square' }]),
    'ammunition-reload': Object.freeze([{ offset: 0, frequency: 180, duration: 0.035, gain: 0.55, type: 'square' }, { offset: 0.055, frequency: 420, duration: 0.04, gain: 0.58, type: 'square' }]),
    'ammunition-empty': Object.freeze([{ offset: 0, frequency: 150, duration: 0.045, gain: 0.58, type: 'square' }, { offset: 0.08, frequency: 150, duration: 0.045, gain: 0.58, type: 'square' }]),
    'quest-accepted': Object.freeze([{ offset: 0, frequency: 420, duration: 0.05, gain: 0.46, type: 'sine' }, { offset: 0.065, frequency: 630, duration: 0.055, gain: 0.48, type: 'sine' }]),
    'quest-advanced': Object.freeze([{ offset: 0, frequency: 520, duration: 0.045, gain: 0.46, type: 'sine' }, { offset: 0.06, frequency: 700, duration: 0.05, gain: 0.48, type: 'sine' }]),
    'quest-completed': Object.freeze([{ offset: 0, frequency: 520, duration: 0.05, gain: 0.48, type: 'sine' }, { offset: 0.065, frequency: 780, duration: 0.055, gain: 0.5, type: 'sine' }, { offset: 0.135, frequency: 1040, duration: 0.075, gain: 0.54, type: 'sine' }]),
    'loot-item': Object.freeze([{ offset: 0, frequency: 560, duration: 0.045, gain: 0.42, type: 'sine' }, { offset: 0.055, frequency: 760, duration: 0.05, gain: 0.45, type: 'sine' }]),
    'loot-credits': Object.freeze([{ offset: 0, frequency: 900, duration: 0.03, gain: 0.4, type: 'sine' }, { offset: 0.045, frequency: 1100, duration: 0.035, gain: 0.42, type: 'sine' }]),
    'client-connected': Object.freeze([{ offset: 0, frequency: 330, duration: 0.05, gain: 0.42, type: 'sine' }, { offset: 0.06, frequency: 660, duration: 0.07, gain: 0.48, type: 'sine' }]),
    'client-disconnected': Object.freeze([{ offset: 0, frequency: 520, duration: 0.05, gain: 0.46, type: 'sine' }, { offset: 0.06, frequency: 220, duration: 0.08, gain: 0.48, type: 'sine' }]),
    'client-reconnecting': Object.freeze([{ offset: 0, frequency: 300, endFrequency: 500, duration: 0.09, gain: 0.4, type: 'triangle' }]),
    'copyover-recovered': Object.freeze([{ offset: 0, frequency: 440, duration: 0.04, gain: 0.42, type: 'sine' }, { offset: 0.05, frequency: 660, duration: 0.04, gain: 0.45, type: 'sine' }, { offset: 0.1, frequency: 880, duration: 0.06, gain: 0.48, type: 'sine' }])
  });

  const SERVER_SOUND_EVENT_CUES = Object.freeze({
    'door.open': 'door-open', 'door.close': 'door-close', 'door.lock': 'door-lock',
    'door.unlock': 'door-unlock', 'door.pick': 'door-pick', 'door.break': 'door-break', 'door.blocked': 'door-blocked',
    'container.open': 'container-open', 'container.close': 'container-close',
    'container.lock': 'container-lock', 'container.unlock': 'container-unlock',
    'container.pick': 'container-pick', 'container.break': 'container-break',
    'object.get': 'object-get', 'object.retrieve': 'object-retrieve',
    'object.put': 'object-put', 'object.drop': 'object-drop', 'object.give': 'object-give',
    'equipment.equip': 'equipment-equip', 'equipment.remove': 'equipment-remove',
    'shop.buy': 'shop-buy', 'shop.sell': 'shop-sell', 'shop.insufficient-funds': 'shop-insufficient-funds',
    'ammunition.reload': 'ammunition-reload', 'ammunition.empty': 'ammunition-empty',
    'quest.accepted': 'quest-accepted', 'quest.advanced': 'quest-advanced', 'quest.completed': 'quest-completed'
  });

  const BUILTIN_CUE_COOLDOWNS = Object.freeze({
    'object-get': 120, 'object-retrieve': 120, 'object-put': 120,
    'object-drop': 120, 'object-give': 120, 'equipment-equip': 120,
    'equipment-remove': 120, 'shop-buy': 120, 'shop-sell': 120
  });

  function boundedNumber(value, minimum, maximum, fallback) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(maximum, Math.max(minimum, numeric));
  }

  function normalizeCueId(value) {
    const cueId = String(value || '').trim().toLowerCase();
    if (Object.hasOwn(CUE_DEFINITIONS, cueId)) return cueId;
    return cueId.length <= MAX_CUSTOM_CUE_ID && CUSTOM_CUE_PATTERN.test(cueId) ? cueId : '';
  }

  function defaultContextFactory() {
    const Context = root?.AudioContext || root?.webkitAudioContext;
    return typeof Context === 'function' ? () => new Context() : null;
  }

  function finiteNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function nonNegativeNumber(value) {
    const numeric = finiteNumber(value);
    return numeric === null ? 0 : Math.max(0, numeric);
  }

  function maxHealthFromVitals(vitals = {}) {
    const candidates = [
      vitals.mhp,
      vitals.maxhp,
      vitals.maxHp,
      vitals.maxhealth,
      vitals.maxHealth
    ];
    for (const candidate of candidates) {
      const numeric = finiteNumber(candidate);
      if (numeric !== null && numeric > 0) return numeric;
    }
    return null;
  }

  function ratioFromVitals(vitals = {}, currentKeys = [], maximumKeys = []) {
    let current = null;
    let maximum = null;
    for (const key of currentKeys) {
      const numeric = finiteNumber(vitals?.[key]);
      if (numeric !== null) { current = numeric; break; }
    }
    for (const key of maximumKeys) {
      const numeric = finiteNumber(vitals?.[key]);
      if (numeric !== null && numeric > 0) { maximum = numeric; break; }
    }
    if (current === null || maximum === null) return null;
    return Math.max(0, Math.min(1, current / maximum));
  }

  function healthRatioFromVitals(vitals = {}) {
    return ratioFromVitals(
      vitals,
      ['hp', 'health'],
      ['mhp', 'maxhp', 'maxHp', 'maxhealth', 'maxHealth']
    );
  }

  function manaRatioFromVitals(vitals = {}) {
    return ratioFromVitals(vitals, ['mana', 'mn'], ['mmana', 'mmn', 'maxMana']);
  }

  function moveRatioFromVitals(vitals = {}) {
    return ratioFromVitals(vitals, ['move', 'mv'], ['mmove', 'mmv', 'maxMove']);
  }

  function crossedDown(previousRatio, nextRatio, threshold) {
    return previousRatio !== null && nextRatio !== null &&
      previousRatio > threshold && nextRatio <= threshold;
  }

  function vitalsThresholdCue(previousVitals = {}, nextVitals = {}) {
    const previousHealth = healthRatioFromVitals(previousVitals);
    const nextHealth = healthRatioFromVitals(nextVitals);
    if (previousHealth !== null && nextHealth !== null) {
      if (previousHealth > 0 && nextHealth <= 0) return 'danger';
      if (crossedDown(previousHealth, nextHealth, 0.10) && nextHealth > 0) return 'health-10';
      // The established Danger cue remains NukeFire's 25 percent self-health warning.
      if (crossedDown(previousHealth, nextHealth, 0.25) && nextHealth > 0) return 'danger';
      if (crossedDown(previousHealth, nextHealth, 0.50) && nextHealth > 0) return 'health-50';
      if (crossedDown(previousHealth, nextHealth, 0.75) && nextHealth > 0) return 'health-75';
    }

    const previousMana = manaRatioFromVitals(previousVitals);
    const nextMana = manaRatioFromVitals(nextVitals);
    const previousMove = moveRatioFromVitals(previousVitals);
    const nextMove = moveRatioFromVitals(nextVitals);

    // Only one resource cue may win a Char.Vitals update. Prefer the most
    // urgent exhaustion state, then the broader early warnings.
    if (crossedDown(previousMana, nextMana, 0.05)) return 'mana-5';
    if (crossedDown(previousMove, nextMove, 0.05)) return 'move-5';
    if (crossedDown(previousMana, nextMana, 0.20)) return 'mana-20';
    if (crossedDown(previousMove, nextMove, 0.50)) return 'move-50';
    return '';
  }

  function opponentNameFromVitals(vitals = {}) {
    const opponent = vitals?.opponent && typeof vitals.opponent === 'object' ? vitals.opponent : null;
    return String(opponent?.name || '').replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, 100);
  }

  function groupRatios(group = {}, selfNameValue = '') {
    const members = Array.isArray(group?.members) ? group.members : [];
    const selfName = String(selfNameValue || '').trim().toLocaleLowerCase();
    const ratios = new Map();
    for (const member of members) {
      const name = String(member?.name || '').replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim();
      if (!name || (selfName && name.toLocaleLowerCase() === selfName)) continue;
      const info = member?.info && typeof member.info === 'object' ? member.info : {};
      const current = finiteNumber(info.hp);
      const maximum = finiteNumber(info.mhp);
      if (current === null || maximum === null || maximum <= 0) continue;
      ratios.set(name.toLocaleLowerCase(), Math.max(0, Math.min(1, current / maximum)));
    }
    return ratios;
  }

  function groupSafetyCue(previousGroup = {}, nextGroup = {}, selfName = '') {
    const previous = groupRatios(previousGroup, selfName);
    const next = groupRatios(nextGroup, selfName);
    let critical = false;
    for (const [name, nextRatio] of next.entries()) {
      if (!previous.has(name)) continue;
      const previousRatio = previous.get(name);
      if (previousRatio > 0 && nextRatio <= 0) return 'group-down';
      if (previousRatio > 0.20 && nextRatio > 0 && nextRatio <= 0.20) critical = true;
    }
    return critical ? 'group-critical' : '';
  }

  /**
   * Select one bounded semantic cue for a live NukeFire event.
   *
   * Combat summaries arrive at most once per server window. Returning a
   * single highest-value cue prevents a busy combat round from becoming a
   * second form of spam while still letting sound carry information that
   * speech cannot keep up with.
   */
  function semanticCueForEvent(packageName, body = {}, previousVitals = {}, nextVitals = {}, context = {}) {
    const name = String(packageName || '');

    if (name === 'NukeFire.Sound.Event') {
      if (Number(body?.schema) !== 1) return '';
      const eventName = String(body?.event || '').trim().toLowerCase();
      return SERVER_SOUND_EVENT_CUES[eventName] || '';
    }

    if (name === 'NukeFire.Loot.Event') {
      if (Number(body?.schema) !== 1) return '';
      const kind = String(body?.kind || '').trim().toLowerCase();
      return kind === 'credits' ? 'loot-credits' : (kind === 'item' ? 'loot-item' : '');
    }

    if (name === 'NukeFire.Combat') {
      const outgoing = body?.out && typeof body.out === 'object' ? body.out : {};
      const incoming = body?.in && typeof body.in === 'object' ? body.in : {};

      if (nonNegativeNumber(incoming.deaths) > 0) return 'danger';

      const incomingDamage = nonNegativeNumber(incoming.damage);
      const maxHealth = maxHealthFromVitals(nextVitals) || maxHealthFromVitals(previousVitals);
      // Southpaw's GMCP vitals plugin uses a strict greater-than 50 percent
      // massive-hit warning. Preserve that boundary, with the existing 25
      // percent Critical cue remaining the earlier heavy-hit warning.
      if (maxHealth && incomingDamage / maxHealth > 0.50) return 'catastrophic';
      if (maxHealth && incomingDamage / maxHealth >= 0.25) return 'critical';

      if (nonNegativeNumber(outgoing.kills) > 0) return 'kill';
      if (nonNegativeNumber(incoming.hits) > 0) return 'incoming';
      if (nonNegativeNumber(outgoing.hits) > 0) return 'hit';
      if (nonNegativeNumber(outgoing.misses) > 0) return 'miss';
      return '';
    }

    if (name === 'Char.Vitals') {
      const currentVitals = nextVitals && typeof nextVitals === 'object' && Object.keys(nextVitals).length
        ? nextVitals
        : (body && typeof body === 'object' ? body : {});
      const vitalsCue = vitalsThresholdCue(previousVitals, currentVitals);
      if (vitalsCue) return vitalsCue;

      const previousOpponent = opponentNameFromVitals(previousVitals);
      const nextOpponent = opponentNameFromVitals(currentVitals);
      if (!previousOpponent && nextOpponent) return 'combat-start';
      if (previousOpponent && !nextOpponent) return 'combat-end';
      return '';
    }

    if (name === 'Group') {
      return groupSafetyCue(
        context?.previousGroup || {},
        context?.nextGroup || body || {},
        context?.selfName || ''
      );
    }

    return '';
  }

  class AudioCueController {
    constructor(options = {}) {
      this.contextFactory = typeof options.contextFactory === 'function'
        ? options.contextFactory
        : defaultContextFactory();
      this.context = null;
      this.enabled = options.enabled === true;
      this.muted = options.muted === true;
      this.foreground = options.foreground !== false;
      this.volume = boundedNumber(options.volume, 0, 1, DEFAULT_AUDIO_CUE_VOLUME);
      this.activeOscillators = new Set();
      this.activeAudio = new Set();
      this.soundpackAssets = Object.freeze({});
      this.soundpackName = 'Built-in NukeFire';
      this.soundpackSequence = new Map();
      this.soundpackLastPlayed = new Map();
      this.builtinLastPlayed = new Map();
      this.disposed = false;
    }

    get available() {
      return typeof this.contextFactory === 'function' || typeof root?.Audio === 'function';
    }

    get activeCount() {
      return this.activeOscillators.size;
    }

    ensureContext() {
      if (this.disposed || !this.available) return null;
      if (this.context) return this.context;
      try {
        this.context = this.contextFactory();
      } catch (_error) {
        this.context = null;
      }
      return this.context;
    }

    setEnabled(value) {
      this.enabled = value === true;
      if (!this.enabled) this.stopAll();
      return this.enabled;
    }

    setMuted(value) {
      this.muted = value === true;
      if (this.muted) this.stopAll();
      return this.muted;
    }

    setForeground(value) {
      this.foreground = value !== false;
      if (!this.foreground) this.stopAll();
      return this.foreground;
    }

    setVolume(value) {
      this.volume = boundedNumber(value, 0, 1, DEFAULT_AUDIO_CUE_VOLUME);
      for (const audio of this.activeAudio) audio.volume = this.volume;
      return this.volume;
    }

    setSoundpack(pack = null, assets = {}) {
      this.stopAll();
      const next = {};
      const candidateCueIds = new Set([...Object.keys(CUE_DEFINITIONS), ...Object.keys(assets || {})]);
      for (const rawCueId of candidateCueIds) {
        const cueId = normalizeCueId(rawCueId);
        if (!cueId) continue;
        const input = assets?.[cueId];
        const legacySource = typeof input === 'string' ? input : '';
        const sourceList = legacySource ? [legacySource] : (Array.isArray(input?.sources) ? input.sources : []);
        const sources = sourceList.map((source) => String(source || '')).filter((source) => /^data:audio\/(?:wav|mpeg|ogg|mp4);base64,[A-Za-z0-9+/=]+$/u.test(source)).slice(0, 8);
        if (!sources.length) continue;
        next[cueId] = Object.freeze({
          sources: Object.freeze(sources),
          selection: input?.selection === 'sequential' ? 'sequential' : 'random',
          volume: boundedNumber(input?.volume, 0, 1, 1),
          cooldownMs: Math.max(0, Math.min(60_000, Math.trunc(Number(input?.cooldown_ms) || 0)))
        });
      }
      this.soundpackAssets = Object.freeze(next);
      this.soundpackSequence.clear();
      this.soundpackLastPlayed.clear();
      this.builtinLastPlayed.clear();
      this.soundpackName = String(pack?.name || '').trim().slice(0, 80) || 'Built-in NukeFire';
      return Object.keys(next).length;
    }

    playbackBlockReason(options = {}) {
      if (this.disposed) return 'Audio Cues are unavailable because the audio controller is closed.';
      if (!this.enabled) return 'Audio Cues are off.';
      if (this.muted) return 'Audio Cues are muted.';
      if (!(this.foreground || options.allowBackground === true)) return 'Audio Cues are blocked while NukeFire is in the background.';
      if (!this.available) return 'Audio playback is unavailable on this system.';
      if (!(this.volume > 0)) return 'Audio Cue volume is 0 percent.';
      return '';
    }

    cuePlaybackBlockReason(value, options = {}) {
      const cueId = normalizeCueId(value);
      if (!cueId) return 'That Audio Cue is not available.';
      const baseReason = this.playbackBlockReason(options);
      if (baseReason) return baseReason;
      const now = Date.now();
      const custom = this.soundpackAssets[cueId];
      if (!custom && !Object.hasOwn(CUE_DEFINITIONS, cueId)) return 'That custom sound has no audio assigned in the active soundpack.';
      if (custom?.cooldownMs > 0) {
        const previous = this.soundpackLastPlayed.get(cueId) || 0;
        if (now - previous < custom.cooldownMs) return 'That sound is waiting for its configured cooldown.';
      } else {
        const builtinCooldown = BUILTIN_CUE_COOLDOWNS[cueId] || 0;
        const previous = this.builtinLastPlayed.get(cueId) || 0;
        if (builtinCooldown > 0 && now - previous < builtinCooldown) return 'That sound is waiting for its built-in cooldown.';
      }
      return '';
    }

    canPlay(options = {}) {
      return this.playbackBlockReason(options) === '';
    }

    unlock() {
      const context = this.ensureContext();
      if (!context) return false;
      if (context.state === 'suspended' && typeof context.resume === 'function') {
        try {
          const resumed = context.resume();
          if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
        } catch (_error) {
          return false;
        }
      }
      return true;
    }

    scheduleCue(context, cueId, options = {}) {
      const definition = CUE_DEFINITIONS[cueId];
      if (!definition || !context || this.disposed || !this.canPlay(options)) return false;
      const baseTime = Number(context.currentTime) || 0;

      for (const tone of definition) {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const start = baseTime + Math.max(0, Number(tone.offset) || 0);
        const duration = Math.max(0.01, Number(tone.duration) || 0.05);
        const stop = start + duration;
        const peak = Math.max(0.0001, Math.min(1, (Number(tone.gain) || 0.6) * this.volume));

        oscillator.type = tone.type || 'sine';
        oscillator.frequency.setValueAtTime(Number(tone.frequency) || 440, start);
        if (Number.isFinite(Number(tone.endFrequency)) && typeof oscillator.frequency.exponentialRampToValueAtTime === 'function') {
          oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, Number(tone.endFrequency)), stop);
        }

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.008, duration / 3));
        gain.gain.exponentialRampToValueAtTime(0.0001, stop);
        oscillator.connect(gain);
        gain.connect(context.destination);

        this.activeOscillators.add(oscillator);
        oscillator.onended = () => {
          this.activeOscillators.delete(oscillator);
          try { oscillator.disconnect(); } catch (_error) {}
          try { gain.disconnect(); } catch (_error) {}
        };
        oscillator.start(start);
        oscillator.stop(stop + 0.005);
      }
      return true;
    }

    play(value, options = {}) {
      const cueId = normalizeCueId(value);
      if (!cueId || !this.canPlay(options)) return false;
      const custom = this.soundpackAssets[cueId];
      if (custom && typeof root?.Audio === 'function') {
        try {
          const now = Date.now();
          const previous = this.soundpackLastPlayed.get(cueId) || 0;
          if (custom.cooldownMs > 0 && now - previous < custom.cooldownMs) return false;
          const priorIndex = this.soundpackSequence.get(cueId) || 0;
          const index = custom.selection === 'sequential'
            ? priorIndex % custom.sources.length
            : Math.floor(Math.random() * custom.sources.length);
          this.soundpackSequence.set(cueId, index + 1);
          this.soundpackLastPlayed.set(cueId, now);
          const customSource = custom.sources[index];
          const audio = new root.Audio(customSource);
          audio.preload = 'auto';
          audio.volume = Math.max(0, Math.min(1, this.volume * custom.volume));
          const release = () => this.activeAudio.delete(audio);
          audio.addEventListener?.('ended', release, { once: true });
          audio.addEventListener?.('error', release, { once: true });
          this.activeAudio.add(audio);
          const started = audio.play();
          if (started && typeof started.catch === 'function') started.catch(release);
          return true;
        } catch (_error) {
          this.activeAudio.clear();
        }
      }
      const context = this.ensureContext();
      if (!context) return false;

      const builtinCooldown = BUILTIN_CUE_COOLDOWNS[cueId] || 0;
      if (builtinCooldown > 0) {
        const now = Date.now();
        const previous = this.builtinLastPlayed.get(cueId) || 0;
        if (now - previous < builtinCooldown) return false;
        this.builtinLastPlayed.set(cueId, now);
      }

      if (context.state === 'suspended' && typeof context.resume === 'function') {
        try {
          const resumed = context.resume();
          if (resumed && typeof resumed.then === 'function') {
            resumed.then(() => {
              if (this.canPlay(options)) this.scheduleCue(context, cueId, options);
            }).catch(() => {});
            return true;
          }
        } catch (_error) {
          return false;
        }
      }
      return this.scheduleCue(context, cueId, options);
    }

    stopAll() {
      for (const audio of [...this.activeAudio]) {
        try { audio.pause(); } catch (_error) {}
        try { audio.currentTime = 0; } catch (_error) {}
      }
      this.activeAudio.clear();
      for (const oscillator of [...this.activeOscillators]) {
        try { oscillator.stop(); } catch (_error) {}
      }
      this.activeOscillators.clear();
      return true;
    }

    dispose() {
      if (this.disposed) return;
      this.stopAll();
      this.disposed = true;
      if (this.context && typeof this.context.close === 'function') {
        try { this.context.close(); } catch (_error) {}
      }
      this.context = null;
    }
  }

  function createAudioCueController(options = {}) {
    return new AudioCueController(options);
  }

  return Object.freeze({
    DEFAULT_AUDIO_CUE_VOLUME,
    AUDIO_CUE_IDS,
    CUSTOM_CUE_PATTERN,
    CUE_DEFINITIONS,
    SERVER_SOUND_EVENT_CUES,
    normalizeCueId,
    vitalsThresholdCue,
    groupSafetyCue,
    semanticCueForEvent,
    AudioCueController,
    createAudioCueController
  });
});
