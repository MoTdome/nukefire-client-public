(function exposePanelWindowState(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFirePanelWindows = api;
})(typeof window !== 'undefined' ? window : globalThis, function createPanelWindowState() {
  'use strict';

  const PANEL_WINDOW_DEFINITIONS = Object.freeze({
    vitals: Object.freeze({
      label: 'Vitals',
      subtitle: 'Health, mana, movement, combat, and group status',
      bounds: Object.freeze({ x: null, y: null, width: 500, height: 720 })
    }),
    sessionVitals: Object.freeze({
      label: 'Session Vitals',
      subtitle: 'Health, mana, and movement for connected companion sessions',
      bounds: Object.freeze({ x: null, y: null, width: 560, height: 620 })
    }),
    affects: Object.freeze({
      label: 'Affects',
      subtitle: 'Live timed and permanent character effects',
      bounds: Object.freeze({ x: null, y: null, width: 540, height: 680 })
    }),
    mobInspector: Object.freeze({
      label: 'Mob Inspector',
      subtitle: 'Live server-authoritative target intelligence',
      bounds: Object.freeze({ x: null, y: null, width: 600, height: 760 })
    }),
    lootHistory: Object.freeze({
      label: 'Loot History',
      subtitle: 'Session loot received from NukeFire',
      bounds: Object.freeze({ x: null, y: null, width: 620, height: 700 })
    }),
    foundlist: Object.freeze({
      label: 'Foundlist / Upgrades',
      subtitle: 'Server-authoritative known zone drops and upgrade verdicts',
      bounds: Object.freeze({ x: null, y: null, width: 700, height: 760 })
    }),
    quickCommands: Object.freeze({
      label: 'Quick Commands',
      subtitle: 'One-click commands, aliases, and custom buttons',
      bounds: Object.freeze({ x: null, y: null, width: 520, height: 560 })
    }),
    liveState: Object.freeze({
      label: 'NukeFire State',
      subtitle: 'Live character and session data from NukeFire',
      bounds: Object.freeze({ x: null, y: null, width: 540, height: 620 })
    }),
    protocol: Object.freeze({
      label: 'Protocol',
      subtitle: 'Connection and protocol diagnostics',
      bounds: Object.freeze({ x: null, y: null, width: 560, height: 620 })
    }),
    communications: Object.freeze({
      label: 'Communications',
      subtitle: 'Live NukeFire channels',
      bounds: Object.freeze({ x: null, y: null, width: 680, height: 560 })
    }),
    contextDeck: Object.freeze({
      label: 'NukeFire Console',
      subtitle: 'Server-authoritative contextual actions',
      bounds: Object.freeze({ x: null, y: null, width: 640, height: 720 })
    }),
    mapper: Object.freeze({
      label: 'Mapper',
      subtitle: 'Live room map, GPS, exits, and route controls',
      bounds: Object.freeze({ x: null, y: null, width: 880, height: 760 })
    })
  });

  const POPOUT_PANEL_IDS = Object.freeze(Object.keys(PANEL_WINDOW_DEFINITIONS));
  const DEFAULT_POPOUT_BOUNDS = PANEL_WINDOW_DEFINITIONS.communications.bounds;
  const POPOUT_SIZE_LIMITS = Object.freeze({
    width: Object.freeze({ minimum: 440, maximum: 16384 }),
    height: Object.freeze({ minimum: 340, maximum: 16384 })
  });
  const POPOUT_SIZE_PRESETS = Object.freeze({
    compact: Object.freeze({ width: 560, height: 480 }),
    standard: Object.freeze({ width: 960, height: 720 }),
    large: Object.freeze({ width: 1440, height: 1000 })
  });
  const DEFAULT_POPOUTS = Object.freeze(Object.fromEntries(
    POPOUT_PANEL_IDS.map((panelId) => [
      panelId,
      Object.freeze({
        open: false,
        bounds: PANEL_WINDOW_DEFINITIONS[panelId].bounds
      })
    ])
  ));

  function booleanValue(value, fallback) {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return fallback;
  }

  function boundedInteger(value, minimum, maximum, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(minimum, Math.min(maximum, Math.trunc(number)));
  }

  function coordinate(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    const number = Number(value);
    return Number.isFinite(number)
      ? Math.max(-100000, Math.min(100000, Math.trunc(number)))
      : fallback;
  }

  function panelWindowDefinition(panelIdValue) {
    const panelId = String(panelIdValue || '');
    return PANEL_WINDOW_DEFINITIONS[panelId] || null;
  }

  function panelWindowPresetBounds(presetValue, panelIdValue) {
    const preset = String(presetValue || '').trim().toLowerCase();
    if (preset === 'default') {
      return panelWindowDefinition(panelIdValue)?.bounds || DEFAULT_POPOUT_BOUNDS;
    }
    return POPOUT_SIZE_PRESETS[preset] || null;
  }

  function normalizePopoutBounds(input = {}, fallback = DEFAULT_POPOUT_BOUNDS) {
    const inherited = fallback && typeof fallback === 'object'
      ? fallback
      : DEFAULT_POPOUT_BOUNDS;
    return {
      x: coordinate(input?.x, coordinate(inherited.x)),
      y: coordinate(input?.y, coordinate(inherited.y)),
      width: boundedInteger(
        input?.width,
        POPOUT_SIZE_LIMITS.width.minimum,
        POPOUT_SIZE_LIMITS.width.maximum,
        boundedInteger(
          inherited.width,
          POPOUT_SIZE_LIMITS.width.minimum,
          POPOUT_SIZE_LIMITS.width.maximum,
          DEFAULT_POPOUT_BOUNDS.width
        )
      ),
      height: boundedInteger(
        input?.height,
        POPOUT_SIZE_LIMITS.height.minimum,
        POPOUT_SIZE_LIMITS.height.maximum,
        boundedInteger(
          inherited.height,
          POPOUT_SIZE_LIMITS.height.minimum,
          POPOUT_SIZE_LIMITS.height.maximum,
          DEFAULT_POPOUT_BOUNDS.height
        )
      )
    };
  }

  function normalizePopouts(input = {}, fallback = DEFAULT_POPOUTS) {
    const normalized = {};
    for (const panelId of POPOUT_PANEL_IDS) {
      const definition = PANEL_WINDOW_DEFINITIONS[panelId];
      const inherited = fallback?.[panelId] || DEFAULT_POPOUTS[panelId];
      const candidate = input?.[panelId] || {};
      normalized[panelId] = {
        open: booleanValue(candidate.open, Boolean(inherited.open)),
        bounds: normalizePopoutBounds(
          candidate.bounds,
          inherited.bounds || definition.bounds
        )
      };
    }
    return normalized;
  }

  return {
    PANEL_WINDOW_DEFINITIONS,
    POPOUT_PANEL_IDS,
    DEFAULT_POPOUT_BOUNDS,
    POPOUT_SIZE_LIMITS,
    POPOUT_SIZE_PRESETS,
    DEFAULT_POPOUTS,
    panelWindowDefinition,
    panelWindowPresetBounds,
    normalizePopoutBounds,
    normalizePopouts
  };
});
