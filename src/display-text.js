'use strict';

(function attachDisplayText(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireDisplayText = api;
})(typeof window !== 'undefined' ? window : globalThis, function createDisplayTextApi() {
  const PANEL_LABEL_MODES = Object.freeze(['full', 'compact']);
  const MAPPER_ROOM_LABEL_MODES = Object.freeze(['status', 'number', 'name']);

  const PANEL_LABELS = Object.freeze({
    vitals: Object.freeze({ full: 'Vitals', compact: 'Stats' }),
    affects: Object.freeze({ full: 'Affects', compact: 'Buffs' }),
    quickCommands: Object.freeze({ full: 'Quick Commands', compact: 'Commands' }),
    liveState: Object.freeze({ full: 'NukeFire State', compact: 'State' }),
    protocol: Object.freeze({ full: 'Protocol', compact: 'Proto' }),
    communications: Object.freeze({ full: 'Communications', compact: 'Comms' }),
    contextDeck: Object.freeze({ full: 'NukeFire Console', compact: 'Console' }),
    mapper: Object.freeze({ full: 'Mapper', compact: 'Map' })
  });

  const DEFAULT_DISPLAY_TEXT = Object.freeze({
    panelLabels: 'full',
    mapperRoomLabels: 'status'
  });

  function normalizeMode(value, allowed, fallback) {
    const normalized = String(value || '').normalize('NFKC').trim().toLowerCase();
    return allowed.includes(normalized) ? normalized : fallback;
  }

  function normalizePanelLabelMode(value) {
    return normalizeMode(value, PANEL_LABEL_MODES, DEFAULT_DISPLAY_TEXT.panelLabels);
  }

  function normalizeMapperRoomLabelMode(value) {
    return normalizeMode(value, MAPPER_ROOM_LABEL_MODES, DEFAULT_DISPLAY_TEXT.mapperRoomLabels);
  }

  function normalizeDisplayText(input = {}) {
    return {
      panelLabels: normalizePanelLabelMode(input?.panelLabels),
      mapperRoomLabels: normalizeMapperRoomLabelMode(input?.mapperRoomLabels)
    };
  }

  function panelLabel(panelIdValue, modeValue = DEFAULT_DISPLAY_TEXT.panelLabels) {
    const panelId = String(panelIdValue || '');
    const definition = PANEL_LABELS[panelId];
    if (!definition) return panelId || 'Panel';
    return definition[normalizePanelLabelMode(modeValue)] || definition.full;
  }

  function normalizeRoomName(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f-\u009f]+/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim();
  }

  function truncateRoomName(value, maximum = 14) {
    const text = normalizeRoomName(value);
    const limit = Math.max(4, Math.min(32, Math.trunc(Number(maximum) || 14)));
    if (text.length <= limit) return text;
    return `${text.slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
  }

  function mapperRoomLabel(room = {}, modeValue = DEFAULT_DISPLAY_TEXT.mapperRoomLabels) {
    const mode = normalizeMapperRoomLabelMode(modeValue);
    if (mode === 'number') return String(room?.id ?? '').trim();
    if (mode === 'name') return truncateRoomName(room?.name || `Room ${room?.id || ''}`);
    return '';
  }

  return Object.freeze({
    PANEL_LABEL_MODES,
    MAPPER_ROOM_LABEL_MODES,
    PANEL_LABELS,
    DEFAULT_DISPLAY_TEXT,
    normalizePanelLabelMode,
    normalizeMapperRoomLabelMode,
    normalizeDisplayText,
    panelLabel,
    mapperRoomLabel,
    truncateRoomName
  });
});
