'use strict';

(function exposeMacroEngine(root, factory) {
  const keybindings = typeof module === 'object' && module.exports
    ? require('./keybinding-engine')
    : root?.NukeFireKeybindings;
  const parser = typeof module === 'object' && module.exports
    ? require('./client-command-parser')
    : null;
  const api = factory(keybindings || {}, parser || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireMacros = api;
})(typeof window !== 'undefined' ? window : globalThis, function createMacroEngine(keybindingApi, parserApi) {
  const MAX_MACROS = 128;
  const MAX_MACRO_COMMANDS = 32;
  const MAX_MACRO_COMMAND_LENGTH = 4096;
  const DEFAULT_MACRO_SETTINGS = Object.freeze({
    enabled: true,
    definitions: Object.freeze([])
  });

  const MODIFIER_ALIASES = Object.freeze({
    ctrl: 'ctrl', control: 'ctrl', ctl: 'ctrl',
    alt: 'alt', option: 'alt', opt: 'alt',
    shift: 'shift',
    meta: 'meta', command: 'meta', cmd: 'meta', super: 'meta'
  });

  const NAMED_KEYS = Object.freeze({
    up: 'ArrowUp', arrowup: 'ArrowUp',
    down: 'ArrowDown', arrowdown: 'ArrowDown',
    left: 'ArrowLeft', arrowleft: 'ArrowLeft',
    right: 'ArrowRight', arrowright: 'ArrowRight',
    home: 'Home', end: 'End', pageup: 'PageUp', pgup: 'PageUp',
    pagedown: 'PageDown', pgdn: 'PageDown', insert: 'Insert', ins: 'Insert',
    delete: 'Delete', del: 'Delete', escape: 'Escape', esc: 'Escape',
    enter: 'Enter', return: 'Enter', tab: 'Tab', space: 'Space',
    backspace: 'Backspace',
    'numpad+': 'NumpadAdd', 'numpadadd': 'NumpadAdd',
    'numpad-': 'NumpadSubtract', 'numpadsubtract': 'NumpadSubtract',
    'numpad*': 'NumpadMultiply', 'numpadmultiply': 'NumpadMultiply',
    'numpad/': 'NumpadDivide', 'numpaddivide': 'NumpadDivide',
    'numpad.': 'NumpadDecimal', 'numpaddecimal': 'NumpadDecimal',
    'numpadenter': 'NumpadEnter'
  });

  const SAFE_UNMODIFIED_CODES = /^(?:F(?:[1-9]|1[0-9]|2[0-4])|Numpad(?:[0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter)|Arrow(?:Up|Down|Left|Right)|Home|End|PageUp|PageDown|Insert|Delete|Escape)$/u;
  const TINTIN_TERMINAL_KEY_ALIASES = Object.freeze({
    '\\eOP': 'F1',
    '\\eOQ': 'F2',
    '\\eOR': 'F3',
    '\\eOS': 'F4',
    '\\e[15~': 'F5',
    '\\e[17~': 'F6',
    '\\e[18~': 'F7',
    '\\e[19~': 'F8',
    '\\e[20~': 'F9',
    '\\e[21~': 'F10',
    '\\e[23~': 'F11',
    '\\e[24~': 'F12',
    '\\e[A': 'ArrowUp',
    '\\e[B': 'ArrowDown',
    '\\e[C': 'ArrowRight',
    '\\e[D': 'ArrowLeft',
    '\\e[H': 'Home',
    '\\e[F': 'End',
    '\\e[2~': 'Insert',
    '\\e[3~': 'Delete',
    '\\e[5~': 'PageUp',
    '\\e[6~': 'PageDown',
    '\\cz': 'Ctrl+Z',
    '\\eOp': 'Numpad0',
    '\\eOq': 'Numpad1',
    '\\eOr': 'Numpad2',
    '\\eOs': 'Numpad3',
    '\\eOt': 'Numpad4',
    '\\eOu': 'Numpad5',
    '\\eOv': 'Numpad6',
    '\\eOw': 'Numpad7',
    '\\eOx': 'Numpad8',
    '\\eOy': 'Numpad9',
    '\\eOk': 'NumpadAdd',
    '\\eOm': 'NumpadSubtract',
    '\\eOj': 'NumpadMultiply',
    '\\eOo': 'NumpadDivide',
    '\\eOn': 'NumpadDecimal',
    '\\eOM': 'NumpadEnter',
    '\\e[1;5q': 'Ctrl+Numpad1',
    '\\e[1;5s': 'Ctrl+Numpad3',
    '\\e[1;5u': 'Ctrl+Numpad5',
    '\\e[1;5n': 'Ctrl+NumpadDecimal',
    '\\eO5j': 'Ctrl+NumpadMultiply',
    '\\eO5o': 'Ctrl+NumpadDivide'
  });

  function normalizeClassName(value) {
    const source = String(value || '').normalize('NFKC').trim().toLowerCase();
    if (!source || source.length > 48) return '';
    if (!/^[a-z0-9][a-z0-9_-]*$/u.test(source)) return '';
    return ['__proto__', 'constructor', 'prototype'].includes(source) ? '' : source;
  }

  function normalizeMacroCommand(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\r\n]+/gu, ' ')
      .trim()
      .slice(0, MAX_MACRO_COMMAND_LENGTH);
  }

  function splitCommands(value, options = {}) {
    const command = normalizeMacroCommand(value);
    if (!command) return { commands: [], errorCode: 'empty' };
    if (typeof parserApi.splitTopLevelCommands === 'function') {
      return parserApi.splitTopLevelCommands(command, { maxCommands: MAX_MACRO_COMMANDS, commandPrefix: options.commandPrefix });
    }
    const commands = command.split(';').map((entry) => entry.trim()).filter(Boolean);
    return commands.length > MAX_MACRO_COMMANDS
      ? { commands: [], errorCode: 'too-many' }
      : { commands, errorCode: commands.length ? '' : 'empty' };
  }

  function normalizeKeyToken(value) {
    return String(value ?? '').normalize('NFKC').trim().replace(/\s+/gu, '').toLowerCase();
  }

  function keyCodeFromToken(value) {
    const token = normalizeKeyToken(value);
    if (!token) return '';
    if (NAMED_KEYS[token]) return NAMED_KEYS[token];
    if (/^f(?:[1-9]|1[0-9]|2[0-4])$/u.test(token)) return token.toUpperCase();
    if (/^numpad[0-9]$/u.test(token)) return `Numpad${token.at(-1)}`;
    if (/^[a-z]$/u.test(token)) return `Key${token.toUpperCase()}`;
    if (/^[0-9]$/u.test(token)) return `Digit${token}`;
    return '';
  }

  function parseMacroKey(value) {
    const original = String(value ?? '').normalize('NFKC').trim();
    if (!original || original.length > 96) return { error: 'Macro key is empty.' };
    const source = TINTIN_TERMINAL_KEY_ALIASES[original] || original;
    const parts = source.split('+').map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return { error: 'Macro key is empty.' };
    const keyToken = parts.pop();
    const modifiers = { ctrl: false, alt: false, shift: false, meta: false };
    for (const raw of parts) {
      const modifier = MODIFIER_ALIASES[normalizeKeyToken(raw)];
      if (!modifier) return { error: `Unknown macro modifier: ${raw}.` };
      if (modifiers[modifier]) return { error: `Duplicate macro modifier: ${raw}.` };
      modifiers[modifier] = true;
    }
    const code = keyCodeFromToken(keyToken);
    if (!code) return { error: `Unsupported macro key: ${keyToken}.` };
    const hasCommandModifier = modifiers.ctrl || modifiers.alt || modifiers.meta;
    if (!hasCommandModifier && !SAFE_UNMODIFIED_CODES.test(code)) {
      return { error: 'Plain typing keys are not supported yet. Use a function/navigation/numpad key or add Ctrl, Alt/Option, or Command.' };
    }
    const signature = typeof keybindingApi.keySignature === 'function'
      ? keybindingApi.keySignature(code, modifiers)
      : `${modifiers.ctrl ? 'ctrl+' : ''}${modifiers.alt ? 'alt+' : ''}${modifiers.shift ? 'shift+' : ''}${modifiers.meta ? 'meta+' : ''}${code}`;
    const label = typeof keybindingApi.friendlyKeyLabel === 'function'
      ? keybindingApi.friendlyKeyLabel(code, modifiers)
      : source;
    return { code, modifiers, signature, label, key: label, error: '' };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  class MacroEngine {
    constructor(options = {}) {
      this.maxMacros = Math.max(1, Math.trunc(Number(options.maxMacros) || MAX_MACROS));
      this.enabled = true;
      this.commandPrefix = typeof parserApi.normalizeClientCommandPrefix === 'function'
        ? parserApi.normalizeClientCommandPrefix(options.commandPrefix)
        : String(options.commandPrefix || '#');
      this.definitions = new Map();
      this.sequence = 1;
      this.revision = 0;
      this.restore(options.macros || options);
    }

    setCommandPrefix(value) {
      this.commandPrefix = typeof parserApi.normalizeClientCommandPrefix === 'function'
        ? parserApi.normalizeClientCommandPrefix(value, this.commandPrefix)
        : String(value || this.commandPrefix || '#');
      return this.commandPrefix;
    }

    define(keyValue, commandValue, classNameValue = '') {
      const key = parseMacroKey(keyValue);
      if (key.error) return null;
      const parsed = splitCommands(commandValue, { commandPrefix: this.commandPrefix });
      if (parsed.errorCode) return null;
      const className = normalizeClassName(classNameValue);
      const existing = this.definitions.get(key.signature);
      if (!existing && this.definitions.size >= this.maxMacros) return null;
      const record = {
        key: key.key,
        label: key.label,
        code: key.code,
        modifiers: { ...key.modifiers },
        signature: key.signature,
        command: parsed.commands.join('; '),
        commands: [...parsed.commands],
        enabled: existing?.enabled !== false,
        className,
        sequence: existing?.sequence || this.sequence++
      };
      this.definitions.set(record.signature, record);
      this.revision += 1;
      return clone(record);
    }

    get(keyValue) {
      const key = parseMacroKey(keyValue);
      return key.error ? null : clone(this.definitions.get(key.signature) || null);
    }

    delete(keyValue) {
      const key = parseMacroKey(keyValue);
      const deleted = !key.error && this.definitions.delete(key.signature);
      if (deleted) this.revision += 1;
      return deleted;
    }

    setMacroEnabled(keyValue, enabled) {
      const key = parseMacroKey(keyValue);
      if (key.error) return null;
      const record = this.definitions.get(key.signature);
      if (!record) return null;
      record.enabled = Boolean(enabled);
      this.revision += 1;
      return clone(record);
    }

    list() {
      return [...this.definitions.values()]
        .sort((left, right) => String(left.key || left.label || '').localeCompare(String(right.key || right.label || '')))
        .map(clone);
    }

    findForEvent(event = {}, options = {}) {
      if (!this.enabled || event.defaultPrevented || event.isComposing || event.repeat) return null;
      if (typeof keybindingApi.isProtectedNativeShortcut === 'function'
          && keybindingApi.isProtectedNativeShortcut(event, options.platform)) return null;
      const signature = typeof keybindingApi.eventSignature === 'function'
        ? keybindingApi.eventSignature(event)
        : '';
      const record = signature ? this.definitions.get(signature) : null;
      return record?.enabled === false ? null : clone(record || null);
    }

    snapshot() {
      return { enabled: this.enabled, definitions: this.list() };
    }

    restore(snapshot = {}) {
      const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
      this.enabled = source.enabled !== false;
      this.definitions = new Map();
      this.sequence = 1;
      const records = Array.isArray(source.definitions) ? source.definitions : [];
      for (const raw of records.slice(0, this.maxMacros * 4)) {
        const key = parseMacroKey(raw?.key || raw?.label || '');
        if (key.error || this.definitions.has(key.signature) || this.definitions.size >= this.maxMacros) continue;
        const commands = Array.isArray(raw?.commands)
          ? raw.commands.slice(0, MAX_MACRO_COMMANDS).map(normalizeMacroCommand).filter(Boolean)
          : splitCommands(raw?.command).commands;
        if (!commands.length) continue;
        const record = {
          key: key.key,
          label: key.label,
          code: key.code,
          modifiers: { ...key.modifiers },
          signature: key.signature,
          command: commands.join('; '),
          commands,
          enabled: raw?.enabled !== false,
          className: normalizeClassName(raw?.className),
          sequence: this.sequence++
        };
        this.definitions.set(record.signature, record);
      }
      this.revision += 1;
      return this.snapshot();
    }
  }

  function normalizeMacrosSnapshot(input = {}) {
    return new MacroEngine({ macros: input }).snapshot();
  }

  return Object.freeze({
    MacroEngine,
    normalizeMacrosSnapshot,
    normalizeMacroCommand,
    parseMacroKey,
    MAX_MACROS,
    MAX_MACRO_COMMANDS,
    MAX_MACRO_COMMAND_LENGTH,
    DEFAULT_MACRO_SETTINGS
  });
});
