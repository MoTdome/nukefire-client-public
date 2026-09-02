'use strict';

(function exposeKeybindingEngine(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireKeybindings = api;
})(typeof window !== 'undefined' ? window : globalThis, function createKeybindingEngine() {
  const MAX_KEYBINDINGS = 256;
  const MAX_KEYBINDING_COMMAND = 1024;
  const MAX_KEYBINDING_LABEL = 64;
  const MAX_KEYBINDING_GROUP = 40;
  const DEFAULT_KEYBINDING_SETTINGS = Object.freeze({
    enabled: true,
    bindings: Object.freeze([])
  });

  const MODIFIER_ORDER = Object.freeze(['ctrl', 'alt', 'shift', 'meta']);
  const MODIFIER_ONLY_CODES = Object.freeze([
    'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
    'ShiftLeft', 'ShiftRight', 'MetaLeft', 'MetaRight'
  ]);
  const MODIFIER_LABELS = Object.freeze({
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    meta: 'Command'
  });
  const CODE_LABELS = Object.freeze({
    Numpad0: 'Numpad 0',
    Numpad1: 'Numpad 1',
    Numpad2: 'Numpad 2',
    Numpad3: 'Numpad 3',
    Numpad4: 'Numpad 4',
    Numpad5: 'Numpad 5',
    Numpad6: 'Numpad 6',
    Numpad7: 'Numpad 7',
    Numpad8: 'Numpad 8',
    Numpad9: 'Numpad 9',
    NumpadAdd: 'Numpad +',
    NumpadSubtract: 'Numpad −',
    NumpadMultiply: 'Numpad ×',
    NumpadDivide: 'Numpad ÷',
    NumpadDecimal: 'Numpad Decimal',
    NumpadEnter: 'Numpad Enter',
    ArrowUp: 'Up Arrow',
    ArrowDown: 'Down Arrow',
    ArrowLeft: 'Left Arrow',
    ArrowRight: 'Right Arrow',
    Space: 'Space',
    Enter: 'Enter',
    Escape: 'Escape',
    Tab: 'Tab',
    Backspace: 'Backspace',
    Delete: 'Delete',
    Home: 'Home',
    End: 'End',
    PageUp: 'Page Up',
    PageDown: 'Page Down'
  });

  const RECALL_SEMANTIC_IDS = Object.freeze(
    Array.from({ length: 9 }, (_value, index) => `recall-${index + 1}`)
  );
  const CLIENT_COMMANDLESS_SEMANTICS = Object.freeze({
    'reader-history': Object.freeze(new Set(['category-previous', 'category-next', 'current', 'previous', 'next', 'latest', ...RECALL_SEMANTIC_IDS])),
    'reader-review': Object.freeze(new Set(['current', 'previous', 'next', 'latest', ...RECALL_SEMANTIC_IDS])),
    'communications-review': Object.freeze(new Set([
      'current', 'older', 'newer', 'latest',
      ...RECALL_SEMANTIC_IDS,
      'last-tell',
      'last-communication'
    ])),
    accessibility: Object.freeze(new Set([
      'read-vitals',
      'toggle-sound-triggers',
      'toggle-audio-cues',
      'mute-audio-cues',
      'unmute-audio-cues',
      'toggle-audio-cue-mute',
      'test-audio-cue',
      'stop-audio-cues',
      'stop-self-voice',
      'mute-self-voice',
      'unmute-self-voice',
      'toggle-self-voice-mute',
      'copy-reviewed',
      'toggle-self-voice-follow',
      'toggle-self-voice-priority-alerts',
      'toggle-reader-workspace'
    ]))
  });

  const NUMPAD_MOVEMENT_PRESET_ID = 'numpad-movement';
  const NUMPAD_MOVEMENT_PRESET = Object.freeze([
    Object.freeze({ id: 'numpad-move-nw', code: 'Numpad7', label: 'Numpad 7', command: 'northwest' }),
    Object.freeze({ id: 'numpad-move-n', code: 'Numpad8', label: 'Numpad 8', command: 'north' }),
    Object.freeze({ id: 'numpad-move-ne', code: 'Numpad9', label: 'Numpad 9', command: 'northeast' }),
    Object.freeze({ id: 'numpad-move-w', code: 'Numpad4', label: 'Numpad 4', command: 'west' }),
    Object.freeze({ id: 'numpad-look', code: 'Numpad5', label: 'Numpad 5', command: 'look' }),
    Object.freeze({ id: 'numpad-move-e', code: 'Numpad6', label: 'Numpad 6', command: 'east' }),
    Object.freeze({ id: 'numpad-move-sw', code: 'Numpad1', label: 'Numpad 1', command: 'southwest' }),
    Object.freeze({ id: 'numpad-move-s', code: 'Numpad2', label: 'Numpad 2', command: 'south' }),
    Object.freeze({ id: 'numpad-move-se', code: 'Numpad3', label: 'Numpad 3', command: 'southeast' }),
    Object.freeze({ id: 'numpad-move-up', code: 'NumpadAdd', label: 'Numpad +', command: 'up' }),
    Object.freeze({ id: 'numpad-move-down', code: 'NumpadSubtract', label: 'Numpad −', command: 'down' })
  ]);

  function normalizeText(value, limit) {
    return String(value ?? '').normalize('NFKC')
      .replace(/[\r\n\t]+/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, limit);
  }

  function normalizeId(value, fallback = '') {
    const normalized = normalizeText(value, 96).toLowerCase()
      .replace(/[^a-z0-9_-]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .slice(0, 64);
    return normalized || fallback;
  }

  function normalizeCode(value) {
    const code = normalizeText(value, 48);
    return /^[A-Za-z][A-Za-z0-9]{0,47}$/u.test(code) ? code : '';
  }

  function normalizeModifiers(value = {}) {
    const source = value && typeof value === 'object' ? value : {};
    return Object.freeze({
      ctrl: source.ctrl === true || source.control === true,
      alt: source.alt === true,
      shift: source.shift === true,
      meta: source.meta === true || source.command === true
    });
  }

  function keySignature(codeValue, modifiersValue = {}) {
    const code = normalizeCode(codeValue);
    if (!code) return '';
    const modifiers = normalizeModifiers(modifiersValue);
    const prefixes = MODIFIER_ORDER.filter((name) => modifiers[name]);
    return [...prefixes, code].join('+');
  }

  function eventSignature(event = {}) {
    return keySignature(event.code, {
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey
    });
  }

  function platformFamily(value = '') {
    let source = String(value || '');
    if (!source && typeof navigator === 'object' && navigator) {
      source = String(navigator.userAgentData?.platform || navigator.platform || '');
    }
    source = source.normalize('NFKC').trim().toLowerCase();
    if (/mac|darwin|iphone|ipad|ipod/u.test(source)) return 'mac';
    if (/win/u.test(source)) return 'windows';
    if (/linux|x11|freebsd|openbsd|netbsd/u.test(source)) return 'linux';
    return 'unknown';
  }

  function shortcutParts(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const code = normalizeCode(source.code);
    const modifiers = source.modifiers && typeof source.modifiers === 'object'
      ? normalizeModifiers(source.modifiers)
      : normalizeModifiers({
        ctrl: source.ctrlKey,
        alt: source.altKey,
        shift: source.shiftKey,
        meta: source.metaKey
      });
    return { code, modifiers };
  }

  function isProtectedNativeShortcut(input = {}, platformValue = '') {
    const { code, modifiers } = shortcutParts(input);
    if (!code) return false;
    const platform = platformFamily(platformValue);

    if (platform === 'mac') {
      // VoiceOver's traditional VO chord is Control+Option. Never consume it.
      if (modifiers.ctrl && modifiers.alt) return true;

      if (modifiers.meta && !modifiers.ctrl && !modifiers.alt) {
        if (['KeyC', 'KeyV', 'KeyX', 'KeyA'].includes(code) && !modifiers.shift) return true;
        if (code === 'KeyZ') return true;
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(code)) return true;
      }

      // Option+Left/Right is native macOS word navigation, with Shift extending selection.
      if (modifiers.alt && !modifiers.ctrl && !modifiers.meta
          && ['ArrowLeft', 'ArrowRight'].includes(code)) return true;

      return false;
    }

    if (platform === 'windows' || platform === 'linux') {
      if (!modifiers.ctrl || modifiers.alt || modifiers.meta) return false;
      if (['KeyC', 'KeyV', 'KeyX', 'KeyA'].includes(code) && !modifiers.shift) return true;
      if (code === 'KeyZ') return true;
      if (code === 'KeyY' && !modifiers.shift) return true;
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(code)) return true;
    }

    return false;
  }

  function friendlyKeyLabel(codeValue, modifiersValue = {}) {
    const code = normalizeCode(codeValue);
    if (!code) return 'Unknown key';
    const modifiers = normalizeModifiers(modifiersValue);
    const parts = MODIFIER_ORDER
      .filter((name) => modifiers[name])
      .map((name) => MODIFIER_LABELS[name]);
    let keyLabel = CODE_LABELS[code];
    if (!keyLabel && /^Key[A-Z]$/u.test(code)) keyLabel = code.slice(3);
    if (!keyLabel && /^Digit[0-9]$/u.test(code)) keyLabel = code.slice(5);
    if (!keyLabel && /^F(?:[1-9]|1[0-9]|2[0-4])$/u.test(code)) keyLabel = code;
    if (!keyLabel) keyLabel = code.replace(/([a-z])([A-Z])/gu, '$1 $2');
    parts.push(keyLabel);
    return parts.join(' + ');
  }

  function normalizeBinding(input = {}, index = 0) {
    const source = input && typeof input === 'object' ? input : {};
    const code = normalizeCode(source.code);
    const command = normalizeText(source.command, MAX_KEYBINDING_COMMAND);
    const semanticSource = source.semantic && typeof source.semantic === 'object' ? source.semantic : {};
    const semanticType = normalizeText(semanticSource.type, 40).toLowerCase();
    const semanticId = normalizeText(semanticSource.id, 96);
    const semantic = semanticType && semanticType !== 'raw' && semanticId
      ? { type: semanticType, id: semanticId }
      : null;
    const commandlessSemantic = Boolean(semantic
      && CLIENT_COMMANDLESS_SEMANTICS[semantic.type]?.has(semantic.id.toLowerCase()));
    if (!code || (!command && !commandlessSemantic)) return null;
    const modifiers = normalizeModifiers(source.modifiers);
    const signature = keySignature(code, modifiers);
    const fallbackId = `binding-${signature.toLowerCase().replace(/[^a-z0-9]+/gu, '-') || index + 1}`;
    const id = normalizeId(source.id, fallbackId);
    const label = normalizeText(source.label, MAX_KEYBINDING_LABEL)
      || friendlyKeyLabel(code, modifiers);
    const group = normalizeText(source.group, MAX_KEYBINDING_GROUP) || 'General';
    const preset = normalizeId(source.preset);
    const location = Number.isInteger(source.location) && source.location >= 0 && source.location <= 3
      ? source.location
      : (code.startsWith('Numpad') ? 3 : 0);
    const record = {
      id,
      code,
      modifiers: { ...modifiers },
      signature,
      label,
      command,
      group,
      preset,
      scope: 'global',
      trigger: 'press',
      location,
      enabled: source.enabled !== false,
      allowRepeat: source.allowRepeat === true,
      worksWhileTyping: source.worksWhileTyping === true
    };
    if (semantic) record.semantic = semantic;
    return record;
  }

  function normalizeKeybindingSettings(input = {}) {
    const source = Array.isArray(input)
      ? { enabled: true, bindings: input }
      : (input && typeof input === 'object' ? input : {});
    const candidates = Array.isArray(source.bindings)
      ? source.bindings.slice(0, MAX_KEYBINDINGS * 4)
      : [];
    const bindings = [];
    const usedIds = new Set();
    const usedSignatures = new Set();
    for (let index = 0; index < candidates.length; index += 1) {
      const normalized = normalizeBinding(candidates[index], index);
      if (!normalized || usedSignatures.has(normalized.signature)) continue;
      let id = normalized.id;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${normalized.id.slice(0, 58)}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(id);
      usedSignatures.add(normalized.signature);
      bindings.push({ ...normalized, id });
      if (bindings.length >= MAX_KEYBINDINGS) break;
    }
    return {
      enabled: source.enabled !== false,
      bindings
    };
  }

  function presetBindings() {
    return NUMPAD_MOVEMENT_PRESET.map((record) => normalizeBinding({
      ...record,
      group: 'Movement',
      preset: NUMPAD_MOVEMENT_PRESET_ID,
      location: 3,
      enabled: true,
      allowRepeat: false,
      worksWhileTyping: false
    })).filter(Boolean);
  }

  function installNumpadMovementPreset(input = {}) {
    const settings = normalizeKeybindingSettings(input);
    const preset = presetBindings();
    const presetSignatures = new Set(preset.map((record) => record.signature));
    const preserved = settings.bindings.filter((record) => !presetSignatures.has(record.signature));
    return normalizeKeybindingSettings({
      enabled: true,
      bindings: [...preserved, ...preset]
    });
  }

  function removeNumpadMovementPreset(input = {}) {
    const settings = normalizeKeybindingSettings(input);
    return normalizeKeybindingSettings({
      enabled: settings.enabled,
      bindings: settings.bindings.filter((record) => record.preset !== NUMPAD_MOVEMENT_PRESET_ID)
    });
  }

  function captureKeyFromEvent(event = {}) {
    if (event.defaultPrevented || event.isComposing || event.repeat) return null;
    const code = normalizeCode(event.code);
    if (!code || MODIFIER_ONLY_CODES.includes(code)) return null;
    const modifiers = normalizeModifiers({
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey
    });
    const signature = keySignature(code, modifiers);
    if (!signature) return null;
    return {
      code,
      modifiers: { ...modifiers },
      signature,
      label: friendlyKeyLabel(code, modifiers),
      location: Number.isInteger(event.location) && event.location >= 0 && event.location <= 3
        ? event.location
        : (code.startsWith('Numpad') ? 3 : 0)
    };
  }

  function findBindingConflict(input, candidate = {}, excludeId = '') {
    const settings = normalizeKeybindingSettings(input);
    const signature = normalizeText(candidate.signature, 128)
      || keySignature(candidate.code, candidate.modifiers);
    if (!signature) return null;
    const excluded = normalizeId(excludeId);
    return settings.bindings.find((record) => record.signature === signature
      && (!excluded || record.id !== excluded)) || null;
  }

  function findBindingForEvent(input, event = {}, options = {}) {
    const settings = normalizeKeybindingSettings(input);
    if (!settings.enabled || event.defaultPrevented || event.isComposing) return null;
    if (isProtectedNativeShortcut(event, options.platform)) return null;
    const signature = eventSignature(event);
    if (!signature) return null;
    return settings.bindings.find((record) => record.enabled !== false
      && record.trigger === 'press'
      && record.signature === signature
      && (!event.repeat || record.allowRepeat)) || null;
  }

  return Object.freeze({
    MAX_KEYBINDINGS,
    MAX_KEYBINDING_COMMAND,
    DEFAULT_KEYBINDING_SETTINGS,
    NUMPAD_MOVEMENT_PRESET_ID,
    NUMPAD_MOVEMENT_PRESET,
    normalizeCode,
    normalizeModifiers,
    normalizeBinding,
    normalizeKeybindingSettings,
    keySignature,
    eventSignature,
    friendlyKeyLabel,
    platformFamily,
    isProtectedNativeShortcut,
    captureKeyFromEvent,
    findBindingConflict,
    installNumpadMovementPreset,
    removeNumpadMovementPreset,
    findBindingForEvent
  });
});
