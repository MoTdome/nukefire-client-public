(function attachCombatVitals(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireCombatVitals = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createCombatVitalsApi() {
  'use strict';

  const NAME_LIMIT = 240;
  const VITAL_DISPLAY_MODES = Object.freeze(['values', 'values-percent', 'percent', 'current']);
  const VITAL_NUMBER_SIZES = Object.freeze(['compact', 'standard', 'large']);
  const VITAL_SPEECH_MODES = Object.freeze(['percent-values', 'percent', 'values']);

  function finiteNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function cleanText(value, maximum = NAME_LIMIT) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f]/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, maximum);
  }

  function valueFrom(object, keys) {
    for (const key of keys) {
      const value = finiteNumber(object?.[key]);
      if (value !== null) return value;
    }
    return null;
  }

  const VITAL_KEYS = Object.freeze({
    hp: Object.freeze(['hp', 'health', 'currenthp', 'currentHp']),
    maxHp: Object.freeze(['mhp', 'maxhp', 'maxHp']),
    maxHpFallback: Object.freeze(['maxhp', 'maxHp']),
    mana: Object.freeze(['mana', 'mp', 'currentmana', 'currentMana']),
    maxMana: Object.freeze(['mmana', 'maxmana', 'maxMana', 'maxmp', 'maxMp']),
    maxManaFallback: Object.freeze(['maxmana', 'maxMana']),
    move: Object.freeze(['move', 'moves', 'mv', 'movement']),
    maxMove: Object.freeze(['mmove', 'maxmove', 'maxMove', 'maxmoves', 'maxMoves', 'maxmv']),
    maxMoveFallback: Object.freeze(['maxmoves', 'maxMoves', 'maxmove', 'maxMove'])
  });

  function normalizeName(value, fallback = '') {
    return cleanText(value, NAME_LIMIT) || fallback;
  }

  function normalizeOpponent(value) {
    if (value === null || value === undefined || value === false) return null;
    if (typeof value === 'string') {
      const name = normalizeName(value);
      return name ? { name } : null;
    }
    if (typeof value !== 'object' || Array.isArray(value)) return null;
    const normalized = normalizeEntity(value, { kind: 'opponent', includeOpponent: false });
    return normalized.name ? normalized : null;
  }

  function normalizeEntity(input = {}, options = {}) {
    const info = input?.info && typeof input.info === 'object' ? input.info : input;
    const name = normalizeName(input?.name ?? info?.name, options.fallbackName || '');
    const hereValue = info?.here;
    const here = hereValue === undefined || hereValue === null
      ? null
      : Boolean(Number(hereValue) || hereValue === true || String(hereValue).toLowerCase() === 'true');

    return {
      key: `${String(options.kind || 'entity')}:${name.toLocaleLowerCase()}`,
      kind: String(options.kind || 'entity'),
      name,
      hp: valueFrom(info, ['hp', 'health', 'currenthp', 'currentHp']),
      maxHp: valueFrom(info, ['mhp', 'maxhp', 'maxHp']),
      mana: valueFrom(info, ['mana', 'mn', 'mp', 'currentmana', 'currentMana']),
      maxMana: valueFrom(info, ['mmana', 'mmn', 'maxmana', 'maxMana', 'maxmp', 'maxMp']),
      move: valueFrom(info, ['move', 'mv', 'moves', 'movement']),
      maxMove: valueFrom(info, ['mmove', 'mmv', 'maxmove', 'maxMove', 'maxmoves', 'maxMoves']),
      level: valueFrom(info, ['level', 'lvl']),
      vnum: valueFrom(info, ['vnum', 'mob_vnum', 'mobVnum']),
      instanceId: valueFrom(info, ['instance_id', 'instanceId']),
      here,
      opponent: options.includeOpponent === false ? null : normalizeOpponent(info?.opponent),
      raw: input
    };
  }

  function normalizeVitals(vitalsInput = {}, maxStatsInput = {}) {
    const vitals = vitalsInput && typeof vitalsInput === 'object' && !Array.isArray(vitalsInput)
      ? vitalsInput
      : {};
    const maxStats = maxStatsInput && typeof maxStatsInput === 'object' && !Array.isArray(maxStatsInput)
      ? maxStatsInput
      : {};
    const hp = valueFrom(vitals, VITAL_KEYS.hp);
    const maxHp = valueFrom(vitals, VITAL_KEYS.maxHp) ?? valueFrom(maxStats, VITAL_KEYS.maxHpFallback);
    const mana = valueFrom(vitals, VITAL_KEYS.mana);
    const maxMana = valueFrom(vitals, VITAL_KEYS.maxMana) ?? valueFrom(maxStats, VITAL_KEYS.maxManaFallback);
    const move = valueFrom(vitals, VITAL_KEYS.move);
    const maxMove = valueFrom(vitals, VITAL_KEYS.maxMove) ?? valueFrom(maxStats, VITAL_KEYS.maxMoveFallback);

    return {
      hp,
      maxHp,
      mana,
      maxMana,
      move,
      maxMove,
      hpPercent: vitalPercent(hp, maxHp),
      manaPercent: vitalPercent(mana, maxMana),
      movePercent: vitalPercent(move, maxMove),
      opponent: normalizeOpponent(vitals.opponent)
    };
  }

  function normalizeGroup(group) {
    const input = group && typeof group === 'object' ? group : null;
    const leader = normalizeName(input?.leader);
    const members = Array.isArray(input?.members)
      ? input.members.slice(0, 40).map((member) => normalizeEntity(member, { kind: 'member' })).filter((member) => member.name)
      : [];
    const enemies = Array.isArray(input?.enemies)
      ? input.enemies.slice(0, 40).map((enemy) => normalizeEntity(enemy, { kind: 'enemy' })).filter((enemy) => enemy.name)
      : [];

    return {
      leader,
      count: Math.max(0, finiteNumber(input?.count) ?? members.length),
      members,
      enemies
    };
  }

  function vitalPercent(current, maximum) {
    const currentValue = finiteNumber(current);
    const maximumValue = finiteNumber(maximum);
    if (currentValue === null || maximumValue === null || maximumValue <= 0) return null;
    return Math.max(0, Math.min(100, currentValue / maximumValue * 100));
  }

  function healthPercent(entity) {
    return vitalPercent(entity?.hp, entity?.maxHp);
  }

  function normalizeVitalSpeechMode(value, fallback = 'percent-values') {
    const clean = String(value || '').trim().toLowerCase();
    return VITAL_SPEECH_MODES.includes(clean) ? clean : fallback;
  }

  function formatVitalSpeech(labelValue, current, maximum, options = {}) {
    const label = cleanText(labelValue, 40) || 'Vital';
    const mode = normalizeVitalSpeechMode(options.mode, 'percent');
    const currentValue = current === null || current === undefined || current === '' ? null : finiteNumber(current);
    const maximumValue = maximum === null || maximum === undefined || maximum === '' ? null : finiteNumber(maximum);
    if (currentValue === null) return `${label} unknown.`;
    const currentText = currentValue.toLocaleString();
    if (maximumValue !== null && maximumValue > 0) {
      const maximumText = maximumValue.toLocaleString();
      const percent = vitalPercent(currentValue, maximumValue);
      if (percent !== null) {
        const percentText = `${Math.floor(percent)} percent`;
        if (mode === 'values') return `${label} ${currentText} of ${maximumText}.`;
        if (mode === 'percent-values') return `${label} ${percentText}, ${currentText} of ${maximumText}.`;
        return `${label} ${percentText}.`;
      }
    }
    return `${label} ${currentText}.`;
  }

  function normalizeVitalDisplayMode(value, fallback = 'values-percent') {
    const clean = String(value || '').trim().toLowerCase();
    return VITAL_DISPLAY_MODES.includes(clean) ? clean : fallback;
  }

  function normalizeVitalNumberSize(value, fallback = 'standard') {
    const clean = String(value || '').trim().toLowerCase();
    return VITAL_NUMBER_SIZES.includes(clean) ? clean : fallback;
  }

  function formatVitalValue(current, maximum, options = {}) {
    const mode = normalizeVitalDisplayMode(options.mode, 'values-percent');
    const rawPrefix = String(options.prefix ?? '').slice(0, 12);
    const cleanPrefix = cleanText(rawPrefix, 12);
    const prefix = cleanPrefix && /\s$/u.test(rawPrefix) ? `${cleanPrefix} ` : cleanPrefix;
    const currentValue = finiteNumber(current);
    const maximumValue = finiteNumber(maximum);
    const currentText = currentValue === null ? '—' : currentValue.toLocaleString();
    const maximumText = maximumValue === null ? '?' : maximumValue.toLocaleString();
    const percent = vitalPercent(currentValue, maximumValue);
    const percentText = percent === null ? '—' : `${Math.round(percent).toLocaleString()}%`;

    let text;
    if (mode === 'current') text = currentText;
    else if (mode === 'percent') text = percentText;
    else if (mode === 'values') text = `${currentText} / ${maximumText}`;
    else {
      text = `${currentText} / ${maximumText}`;
      if (percent !== null) text += ` · ${percentText}`;
    }
    return prefix ? `${prefix}${text}` : text;
  }

  function visibleGroupMembers(members, currentName, hideSelf = true) {
    const source = Array.isArray(members) ? members : [];
    if (!hideSelf || source.length <= 1) return source;
    const currentKey = nameKey(currentName);
    if (!currentKey) return source;
    return source.filter((member) => nameKey(member?.name) !== currentKey);
  }

  function entitySignature(entity) {
    if (!entity) return '';
    return [
      entity.name,
      entity.hp,
      entity.maxHp,
      entity.mana,
      entity.maxMana,
      entity.move,
      entity.maxMove,
      entity.level,
      entity.instanceId,
      entity.here,
      entity.opponent?.name || '',
      entity.opponent?.hp ?? '',
      entity.opponent?.maxHp ?? ''
    ].join('|');
  }

  function nameKey(value) {
    return normalizeName(value).toLocaleLowerCase();
  }

  function enemyForMember(member, enemies = []) {
    const opponentName = nameKey(member?.opponent?.name);
    if (!opponentName) return member?.opponent || null;
    return enemies.find((enemy) => nameKey(enemy.name) === opponentName) || member.opponent;
  }

  return {
    cleanText,
    finiteNumber,
    normalizeEntity,
    normalizeGroup,
    normalizeOpponent,
    normalizeVitals,
    healthPercent,
    vitalPercent,
    formatVitalSpeech,
    normalizeVitalSpeechMode,
    normalizeVitalDisplayMode,
    normalizeVitalNumberSize,
    formatVitalValue,
    visibleGroupMembers,
    VITAL_DISPLAY_MODES,
    VITAL_NUMBER_SIZES,
    VITAL_SPEECH_MODES,
    entitySignature,
    enemyForMember
  };
});
