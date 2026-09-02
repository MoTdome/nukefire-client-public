(function attachReaderPresets(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireReaderPresets = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createReaderPresetsApi() {
  'use strict';

  const READER_HOTKEY_PRESET_ID = 'reader-accessibility';
  const READER_LINE_RECALL_PRESET_ID = 'reader-line-recall';
  const READER_MUSH_MOVEMENT_PRESET_ID = 'reader-mush-movement';
  const READER_MUSH_SETTINGS_PRESET_ID = 'reader-mush-settings';

  const READER_LINE_RECALL_PRESET = Object.freeze(
    Array.from({ length: 9 }, (_value, index) => {
      const n = index + 1;
      return Object.freeze({
        id: `reader-line-recall-${n}`,
        code: `Digit${n}`,
        label: `Alt+${n}`,
        modifiers: Object.freeze({ alt: true }),
        semantic: Object.freeze({ type: 'reader-review', id: `recall-${n}` })
      });
    })
  );

  const READER_MUSH_MOVEMENT_PRESET = Object.freeze([
    Object.freeze({ id: 'reader-mush-move-north', code: 'KeyI', label: 'Alt+I', modifiers: Object.freeze({ alt: true }), command: 'north' }),
    Object.freeze({ id: 'reader-mush-move-west', code: 'KeyJ', label: 'Alt+J', modifiers: Object.freeze({ alt: true }), command: 'west' }),
    Object.freeze({ id: 'reader-mush-move-south', code: 'KeyK', label: 'Alt+K', modifiers: Object.freeze({ alt: true }), command: 'south' }),
    Object.freeze({ id: 'reader-mush-move-east', code: 'KeyL', label: 'Alt+L', modifiers: Object.freeze({ alt: true }), command: 'east' }),
    Object.freeze({ id: 'reader-mush-move-up', code: 'KeyU', label: 'Alt+U', modifiers: Object.freeze({ alt: true }), command: 'up' }),
    Object.freeze({ id: 'reader-mush-move-down', code: 'KeyN', label: 'Alt+N', modifiers: Object.freeze({ alt: true }), command: 'down' })
  ]);

  const READER_MUSH_SETTINGS_PRESET = Object.freeze([
    Object.freeze({ id: 'reader-mush-mute', code: 'F5', label: 'F5', semantic: Object.freeze({ type: 'accessibility', id: 'toggle-self-voice-mute' }) }),
    Object.freeze({ id: 'reader-mush-stop-speech', code: 'F7', label: 'F7', semantic: Object.freeze({ type: 'accessibility', id: 'stop-self-voice' }) }),
    Object.freeze({ id: 'reader-mush-previous', code: 'F8', label: 'F8', semantic: Object.freeze({ type: 'reader-history', id: 'previous' }) }),
    Object.freeze({ id: 'reader-mush-next', code: 'F9', label: 'F9', semantic: Object.freeze({ type: 'reader-history', id: 'next' }) }),
    Object.freeze({ id: 'reader-mush-latest', code: 'F10', label: 'F10', semantic: Object.freeze({ type: 'reader-history', id: 'latest' }) }),
    Object.freeze({ id: 'reader-mush-last-tell', code: 'KeyT', label: 'Alt+T', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'communications-review', id: 'last-tell' }) }),
    Object.freeze({ id: 'reader-mush-vitals', code: 'KeyH', label: 'Alt+H', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'accessibility', id: 'read-vitals' }) }),
    Object.freeze({ id: 'reader-mush-copy-reviewed', code: 'KeyC', label: 'Alt+C', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'accessibility', id: 'copy-reviewed' }) }),
    Object.freeze({ id: 'reader-mush-category-previous', code: 'ArrowUp', label: 'Alt+Up', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'reader-history', id: 'category-previous' }) }),
    Object.freeze({ id: 'reader-mush-category-next', code: 'ArrowDown', label: 'Alt+Down', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'reader-history', id: 'category-next' }) }),
    Object.freeze({ id: 'reader-mush-message-previous', code: 'ArrowLeft', label: 'Alt+Left', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'reader-history', id: 'previous' }) }),
    Object.freeze({ id: 'reader-mush-message-next', code: 'ArrowRight', label: 'Alt+Right', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'reader-history', id: 'next' }) }),
    Object.freeze({ id: 'reader-mush-message-latest', code: 'End', label: 'Alt+End', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'reader-history', id: 'latest' }) })
  ]);

  const READER_PRESETS = Object.freeze([
    Object.freeze({
      id: 'native-reader',
      label: 'Native Reader',
      detail: 'Reader Workspace with VoiceOver, NVDA, JAWS, or Orca handling speech.',
      accessibility: Object.freeze({
        readerWorkspaceEnabled: true,
        screenReaderMode: true,
        selfVoiceEnabled: false,
        selfVoiceMuted: false,
        selfVoiceForegroundOnly: true,
        selfVoiceFollowMode: false,
        selfVoiceGovernorEnabled: true,
        selfVoicePriorityAlertsEnabled: true
      })
    }),
    Object.freeze({
      id: 'reader-live-voice',
      label: 'Reader + Live Voice',
      detail: 'Reader Workspace with NukeFire Self-Voice following live play.',
      accessibility: Object.freeze({
        readerWorkspaceEnabled: true,
        screenReaderMode: false,
        selfVoiceEnabled: true,
        selfVoiceMuted: false,
        selfVoiceForegroundOnly: true,
        selfVoiceFollowMode: true,
        selfVoiceGovernorEnabled: true,
        selfVoicePriorityAlertsEnabled: true
      })
    }),
    Object.freeze({
      id: 'fast-reader',
      label: 'Fast Reader — 2×',
      detail: 'Live Voice preset tuned for experienced high-speed screen-reader users.',
      accessibility: Object.freeze({
        readerWorkspaceEnabled: true,
        screenReaderMode: false,
        selfVoiceEnabled: true,
        selfVoiceMuted: false,
        selfVoiceForegroundOnly: true,
        selfVoiceFollowMode: true,
        selfVoiceGovernorEnabled: true,
        selfVoicePriorityAlertsEnabled: true,
        selfVoiceRate: 2
      })
    }),
    Object.freeze({
      id: 'quiet-review',
      label: 'Quiet / Review',
      detail: 'Keep Reader Workspace ready while Self-Voice stays muted until needed.',
      accessibility: Object.freeze({
        readerWorkspaceEnabled: true,
        screenReaderMode: false,
        selfVoiceEnabled: true,
        selfVoiceMuted: true,
        selfVoiceForegroundOnly: true,
        selfVoiceFollowMode: true,
        selfVoiceGovernorEnabled: true,
        selfVoicePriorityAlertsEnabled: true
      })
    })
  ]);

  const LEGACY_READER_HOTKEY_IDS = Object.freeze(new Set([
    'reader-vitals', 'reader-mute', 'reader-stop-speech',
    'reader-previous-line', 'reader-next-line', 'reader-latest-line', 'reader-last-tell'
  ]));

  const READER_HOTKEY_PRESET = Object.freeze([
    Object.freeze({ id: 'reader-vitals', code: 'F5', label: 'F5', semantic: Object.freeze({ type: 'accessibility', id: 'read-vitals' }) }),
    Object.freeze({ id: 'reader-mute', code: 'F6', label: 'F6', semantic: Object.freeze({ type: 'accessibility', id: 'toggle-self-voice-mute' }) }),
    Object.freeze({ id: 'reader-stop-speech', code: 'F7', label: 'F7', semantic: Object.freeze({ type: 'accessibility', id: 'stop-self-voice' }) }),
    Object.freeze({ id: 'reader-previous-line', code: 'F8', label: 'F8', semantic: Object.freeze({ type: 'reader-history', id: 'previous' }) }),
    Object.freeze({ id: 'reader-next-line', code: 'F9', label: 'F9', semantic: Object.freeze({ type: 'reader-history', id: 'next' }) }),
    Object.freeze({ id: 'reader-latest-line', code: 'F10', label: 'F10', semantic: Object.freeze({ type: 'reader-history', id: 'latest' }) }),
    Object.freeze({ id: 'reader-last-tell', code: 'F10', label: 'Shift+F10', modifiers: Object.freeze({ shift: true }), semantic: Object.freeze({ type: 'communications-review', id: 'last-tell' }) }),
    Object.freeze({ id: 'reader-history-category-previous', code: 'ArrowUp', label: 'Alt+Up', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'reader-history', id: 'category-previous' }) }),
    Object.freeze({ id: 'reader-history-category-next', code: 'ArrowDown', label: 'Alt+Down', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'reader-history', id: 'category-next' }) }),
    Object.freeze({ id: 'reader-history-message-previous', code: 'ArrowLeft', label: 'Alt+Left', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'reader-history', id: 'previous' }) }),
    Object.freeze({ id: 'reader-history-message-next', code: 'ArrowRight', label: 'Alt+Right', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'reader-history', id: 'next' }) }),
    Object.freeze({ id: 'reader-history-latest', code: 'End', label: 'Alt+End', modifiers: Object.freeze({ alt: true }), semantic: Object.freeze({ type: 'reader-history', id: 'latest' }) })
  ]);

  function officialShortcutRecords(records, presetId, group) {
    return records.map((record) => ({
      ...record,
      modifiers: { ...(record.modifiers || {}) },
      semantic: record.semantic ? { ...record.semantic } : undefined,
      command: String(record.command || ''),
      group,
      preset: presetId,
      enabled: true,
      allowRepeat: false,
      worksWhileTyping: true,
      location: 0
    }));
  }

  function installOfficialShortcutPreset(input = {}, keybindingApi = {}, records = [], presetIds = []) {
    if (typeof keybindingApi.normalizeKeybindingSettings !== 'function' ||
        typeof keybindingApi.normalizeBinding !== 'function') {
      return Object.freeze({ settings: input, installed: Object.freeze([]), skipped: Object.freeze([]) });
    }
    const current = keybindingApi.normalizeKeybindingSettings(input);
    const owned = new Set((Array.isArray(presetIds) ? presetIds : [presetIds]).filter(Boolean));
    const preserved = current.bindings.filter((record) => !owned.has(record.preset));
    const used = new Set(preserved.map((record) => record.signature));
    const installed = [];
    const skipped = [];

    for (const candidate of records) {
      const normalized = keybindingApi.normalizeBinding(candidate);
      if (!normalized) {
        skipped.push(Object.freeze({ code: candidate.code, label: candidate.label, reason: 'unavailable' }));
        continue;
      }
      if (used.has(normalized.signature)) {
        skipped.push(Object.freeze({ code: candidate.code, label: normalized.label, reason: 'already assigned' }));
        continue;
      }
      used.add(normalized.signature);
      installed.push(normalized);
    }

    return Object.freeze({
      settings: keybindingApi.normalizeKeybindingSettings({
        enabled: true,
        bindings: [...preserved, ...installed]
      }),
      installed: Object.freeze(installed.map((record) => record.id)),
      skipped: Object.freeze(skipped)
    });
  }

  function removeOfficialShortcutPresets(input = {}, keybindingApi = {}, presetIds = []) {
    if (typeof keybindingApi.normalizeKeybindingSettings !== 'function') {
      return Object.freeze({ settings: input, removed: 0 });
    }
    const current = keybindingApi.normalizeKeybindingSettings(input);
    const owned = new Set((Array.isArray(presetIds) ? presetIds : [presetIds]).filter(Boolean));
    const preserved = current.bindings.filter((record) => !owned.has(record.preset));
    return Object.freeze({
      settings: keybindingApi.normalizeKeybindingSettings({ enabled: current.enabled, bindings: preserved }),
      removed: current.bindings.length - preserved.length
    });
  }

  function readerLineRecallRecords() {
    return officialShortcutRecords(READER_LINE_RECALL_PRESET, READER_LINE_RECALL_PRESET_ID, 'Reader Lines');
  }

  function mushMovementRecords() {
    return officialShortcutRecords(READER_MUSH_MOVEMENT_PRESET, READER_MUSH_MOVEMENT_PRESET_ID, 'Movement');
  }

  function equivalentReaderLineRecallNumber(record = {}) {
    const signature = String(record.signature || '');
    const signatureMatch = signature.match(/^alt\+Digit([1-9])$/u);
    if (!signatureMatch) return 0;
    const number = Number(signatureMatch[1]);
    const command = String(record.command || '').trim().replace(/\s+/gu, ' ').toLowerCase();
    const patterns = [
      `cr line ${number}`,
      `cr lines ${number}`,
      `client reader line ${number}`,
      `client reader lines ${number}`
    ];
    return patterns.includes(command) ? number : 0;
  }

  function migrateEquivalentReaderLineRecallBindings(input = {}, keybindingApi = {}) {
    if (typeof keybindingApi.normalizeKeybindingSettings !== 'function' ||
        typeof keybindingApi.normalizeBinding !== 'function') {
      return Object.freeze({ settings: input, migrated: 0 });
    }
    const current = keybindingApi.normalizeKeybindingSettings(input);
    let migrated = 0;
    const bindings = current.bindings.map((record) => {
      const number = equivalentReaderLineRecallNumber(record);
      if (!number) return record;
      const official = readerLineRecallRecords().find((candidate) =>
        candidate.code === `Digit${number}` && candidate.modifiers?.alt === true);
      if (!official) return record;
      const normalized = keybindingApi.normalizeBinding({
        ...official,
        id: record.id || official.id,
        label: record.label || official.label
      });
      if (!normalized) return record;
      migrated += 1;
      return normalized;
    });
    return Object.freeze({
      settings: keybindingApi.normalizeKeybindingSettings({
        enabled: current.enabled,
        bindings
      }),
      migrated
    });
  }

  function installReaderLineRecallPreset(input = {}, keybindingApi = {}) {
    const adopted = migrateEquivalentReaderLineRecallBindings(input, keybindingApi);
    return installOfficialShortcutPreset(
      adopted.settings, keybindingApi, readerLineRecallRecords(), [READER_LINE_RECALL_PRESET_ID]
    );
  }

  function removeReaderLineRecallPreset(input = {}, keybindingApi = {}) {
    return removeOfficialShortcutPresets(input, keybindingApi, [READER_LINE_RECALL_PRESET_ID]);
  }

  function installMushMovementPreset(input = {}, keybindingApi = {}) {
    return installOfficialShortcutPreset(
      input, keybindingApi, mushMovementRecords(), [READER_MUSH_MOVEMENT_PRESET_ID]
    );
  }

  function removeMushMovementPreset(input = {}, keybindingApi = {}) {
    return removeOfficialShortcutPresets(input, keybindingApi, [READER_MUSH_MOVEMENT_PRESET_ID]);
  }

  function installMushAccessibilityPreset(input = {}, keybindingApi = {}) {
    const lines = installReaderLineRecallPreset(input, keybindingApi);
    const movement = installMushMovementPreset(lines.settings, keybindingApi);
    return Object.freeze({ lines, movement, settings: movement.settings });
  }

  function installMushSettingsPreset(input = {}, keybindingApi = {}) {
    const current = keybindingApi.normalizeKeybindingSettings(input);
    const withoutOldReaderKeys = keybindingApi.normalizeKeybindingSettings({
      enabled: true,
      bindings: current.bindings.filter((record) =>
        record.preset !== READER_HOTKEY_PRESET_ID && record.preset !== READER_MUSH_SETTINGS_PRESET_ID)
    });
    const lines = installReaderLineRecallPreset(withoutOldReaderKeys, keybindingApi);
    const movement = installMushMovementPreset(lines.settings, keybindingApi);
    const controls = installOfficialShortcutPreset(
      movement.settings,
      keybindingApi,
      officialShortcutRecords(READER_MUSH_SETTINGS_PRESET, READER_MUSH_SETTINGS_PRESET_ID, 'Reader MUSH Settings'),
      [READER_MUSH_SETTINGS_PRESET_ID]
    );
    return Object.freeze({ lines, movement, controls, settings: controls.settings });
  }

  function removeMushAccessibilityPreset(input = {}, keybindingApi = {}) {
    return removeOfficialShortcutPresets(
      input, keybindingApi, [READER_LINE_RECALL_PRESET_ID, READER_MUSH_MOVEMENT_PRESET_ID]
    );
  }

  function officialShortcutPresetStatus(input = {}, keybindingApi = {}) {
    if (typeof keybindingApi.normalizeKeybindingSettings !== 'function') {
      return Object.freeze({ lines: 0, movement: 0 });
    }
    const current = keybindingApi.normalizeKeybindingSettings(input);
    return Object.freeze({
      lines: current.bindings.filter((record) => record.preset === READER_LINE_RECALL_PRESET_ID).length,
      movement: current.bindings.filter((record) => record.preset === READER_MUSH_MOVEMENT_PRESET_ID).length
    });
  }

  function getReaderPreset(id) {
    const key = String(id || '').trim().toLowerCase();
    return READER_PRESETS.find((record) => record.id === key) || null;
  }

  function readerHotkeyRecords() {
    return READER_HOTKEY_PRESET.map((record) => ({
      ...record,
      semantic: { ...record.semantic },
      command: '',
      group: 'Reader',
      preset: READER_HOTKEY_PRESET_ID,
      enabled: true,
      allowRepeat: false,
      worksWhileTyping: true,
      location: 0
    }));
  }

  function installReaderHotkeyPreset(input = {}, keybindingApi = {}) {
    if (typeof keybindingApi.normalizeKeybindingSettings !== 'function' ||
        typeof keybindingApi.normalizeBinding !== 'function') {
      return Object.freeze({ settings: input, installed: Object.freeze([]), skipped: Object.freeze([]) });
    }
    const current = keybindingApi.normalizeKeybindingSettings(input);
    const preserved = current.bindings.filter((record) => record.preset !== READER_HOTKEY_PRESET_ID);
    const used = new Set(preserved.map((record) => record.signature));
    const installed = [];
    const skipped = [];

    for (const candidate of readerHotkeyRecords()) {
      const normalized = keybindingApi.normalizeBinding(candidate);
      if (!normalized) {
        skipped.push(Object.freeze({ code: candidate.code, label: candidate.label, reason: 'unavailable' }));
        continue;
      }
      if (used.has(normalized.signature)) {
        skipped.push(Object.freeze({ code: candidate.code, label: normalized.label, reason: 'already assigned' }));
        continue;
      }
      used.add(normalized.signature);
      installed.push(normalized);
    }

    const settings = keybindingApi.normalizeKeybindingSettings({
      enabled: true,
      bindings: [...preserved, ...installed]
    });
    return Object.freeze({
      settings,
      installed: Object.freeze(installed.map((record) => record.id)),
      skipped: Object.freeze(skipped)
    });
  }

  function migrateLegacyReaderHotkeyPreset(input = {}, keybindingApi = {}) {
    if (typeof keybindingApi.normalizeKeybindingSettings !== 'function') {
      return Object.freeze({ settings: input, migrated: false, reason: 'unavailable' });
    }
    const current = keybindingApi.normalizeKeybindingSettings(input);
    const presetRecords = current.bindings.filter((record) => record.preset === READER_HOTKEY_PRESET_ID);
    if (!presetRecords.length) return Object.freeze({ settings: current, migrated: false, reason: 'not-installed' });
    if (presetRecords.some((record) => !LEGACY_READER_HOTKEY_IDS.has(record.id))) {
      return Object.freeze({ settings: current, migrated: false, reason: 'already-current-or-customized' });
    }
    const expectedLegacy = {
      'reader-vitals': ['F5', 'accessibility', 'read-vitals'],
      'reader-mute': ['F6', 'accessibility', 'toggle-self-voice-mute'],
      'reader-stop-speech': ['F7', 'accessibility', 'stop-self-voice'],
      'reader-previous-line': ['F8', 'reader-review', 'previous'],
      'reader-next-line': ['F9', 'reader-review', 'next'],
      'reader-latest-line': ['F10', 'reader-review', 'latest'],
      'reader-last-tell': ['F10', 'communications-review', 'last-tell']
    };
    const untouchedLegacy = presetRecords.every((record) => {
      const expected = expectedLegacy[record.id];
      return expected && record.code === expected[0] && String(record.semantic?.type || '') === expected[1] && String(record.semantic?.id || '') === expected[2];
    });
    if (!untouchedLegacy) return Object.freeze({ settings: current, migrated: false, reason: 'customized' });
    const result = installReaderHotkeyPreset(current, keybindingApi);
    return Object.freeze({ ...result, migrated: true, reason: 'legacy-defaults' });
  }

  function removeReaderHotkeyPreset(input = {}, keybindingApi = {}) {
    if (typeof keybindingApi.normalizeKeybindingSettings !== 'function') {
      return Object.freeze({ settings: input, removed: 0 });
    }
    const current = keybindingApi.normalizeKeybindingSettings(input);
    const preserved = current.bindings.filter((record) => record.preset !== READER_HOTKEY_PRESET_ID);
    return Object.freeze({
      settings: keybindingApi.normalizeKeybindingSettings({ enabled: current.enabled, bindings: preserved }),
      removed: current.bindings.length - preserved.length
    });
  }

  return Object.freeze({
    READER_PRESETS,
    READER_HOTKEY_PRESET_ID,
    READER_HOTKEY_PRESET,
    READER_LINE_RECALL_PRESET_ID,
    READER_LINE_RECALL_PRESET,
    READER_MUSH_MOVEMENT_PRESET_ID,
    READER_MUSH_MOVEMENT_PRESET,
    READER_MUSH_SETTINGS_PRESET_ID,
    READER_MUSH_SETTINGS_PRESET,
    getReaderPreset,
    readerHotkeyRecords,
    installReaderHotkeyPreset,
    migrateLegacyReaderHotkeyPreset,
    removeReaderHotkeyPreset,
    readerLineRecallRecords,
    mushMovementRecords,
    migrateEquivalentReaderLineRecallBindings,
    installReaderLineRecallPreset,
    removeReaderLineRecallPreset,
    installMushMovementPreset,
    removeMushMovementPreset,
    installMushAccessibilityPreset,
    installMushSettingsPreset,
    removeMushAccessibilityPreset,
    officialShortcutPresetStatus
  });
});
