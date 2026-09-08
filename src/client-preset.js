'use strict';

(function exposeClientPreset(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireClientPresets = api;
})(typeof window !== 'undefined' ? window : globalThis, function createClientPresetApi() {
  const PRESET_KIND = 'nukefire-client-preset';
  const PRESET_SCHEMA = 1;
  const MAX_PRESET_BYTES = 128 * 1024;
  const UI_FONTS = new Set(['system', 'arial', 'verdana', 'tahoma', 'trebuchet', 'atkinson', 'opendyslexic']);
  const TERMINAL_FONTS = new Set(['menlo', 'monaco', 'consolas', 'courier', 'system-mono', 'fixedsys', 'maple', 'maple-nl', 'jetbrains', 'fira-code', 'hack', 'source-code-pro', 'terminus', 'inconsolata', 'cascadia', 'ibm-plex', 'ubuntu-mono', 'lucida-console']);
  const BRIGHTNESS = new Set(['dark', 'brighter', 'high-contrast']);
  const LAYOUTS = new Set(['terminal-only', 'classic', 'mapper-focus', 'combat', 'communications', 'field-ops', 'field-ops-crew', 'compact-ops']);
  const ROOT_KEYS = new Set(['kind', 'schema', 'id', 'name', 'description', 'source', 'settings', 'warnings']);
  const SETTING_KEYS = new Set(['display', 'accessibility', 'layout', 'soundpackId']);
  const DISPLAY_KEYS = new Set(['fontSize', 'uiFont', 'terminalFont', 'interfaceBrightness', 'compactOutput', 'followOutput', 'theme']);
  const THEME_KEYS = new Set(['preset', 'foreground', 'background', 'monochrome']);
  const ACCESSIBILITY_KEYS = new Set([
    'screenReaderMode', 'readerWorkspaceEnabled', 'selfVoiceEnabled', 'selfVoiceMuted',
    'selfVoiceForegroundOnly', 'selfVoiceFollowMode', 'selfVoiceInterruptOnCommand',
    'selfVoiceGovernorEnabled', 'selfVoicePriorityAlertsEnabled', 'readerSafetyAlertsEnabled',
    'selfVoiceRate', 'selfVoicePitch', 'selfVoiceVolume', 'vitalSpeechMode',
    'audioCuesEnabled', 'audioCuesMuted', 'audioCuesForegroundOnly', 'audioCuesVolume',
    'communicationCues', 'announceImportant'
  ]);
  const COMMUNICATION_KEYS = new Set(['tell', 'auction', 'gossip', 'group', 'grats', 'shout', 'holler', 'skynet', 'ssf', 'background']);

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function text(value, maximum, fallback = '') {
    return String(value ?? fallback).normalize('NFKC').replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, maximum);
  }
  function id(value, fallback = '') {
    const result = text(value, 64, fallback).toLowerCase().replace(/[^a-z0-9_-]+/gu, '-').replace(/^-+|-+$/gu, '');
    return result || fallback;
  }
  function bounded(value, minimum, maximum, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
  }
  function color(value, fallback) {
    const candidate = String(value || '').trim().toLowerCase();
    return /^#[0-9a-f]{6}$/u.test(candidate) ? candidate : fallback;
  }
  function unknownKeys(value, allowed, path, output) {
    for (const key of Object.keys(object(value))) if (!allowed.has(key)) output.push(`${path}.${key}`);
  }

  function normalizeDisplay(input, unknown) {
    const source = object(input);
    unknownKeys(source, DISPLAY_KEYS, 'settings.display', unknown);
    const output = {};
    if ('fontSize' in source) output.fontSize = Math.trunc(bounded(source.fontSize, 12, 28, 16));
    if ('uiFont' in source) output.uiFont = UI_FONTS.has(source.uiFont) ? source.uiFont : 'system';
    if ('terminalFont' in source) output.terminalFont = TERMINAL_FONTS.has(source.terminalFont) ? source.terminalFont : 'menlo';
    if ('interfaceBrightness' in source) output.interfaceBrightness = BRIGHTNESS.has(source.interfaceBrightness) ? source.interfaceBrightness : 'brighter';
    for (const key of ['compactOutput', 'followOutput']) if (key in source) output[key] = source[key] === true;
    if ('theme' in source) {
      const theme = object(source.theme);
      unknownKeys(theme, THEME_KEYS, 'settings.display.theme', unknown);
      output.theme = {};
      if ('preset' in theme) output.theme.preset = id(theme.preset, 'custom').slice(0, 40);
      if ('foreground' in theme) output.theme.foreground = color(theme.foreground, '#d3d7dc');
      if ('background' in theme) output.theme.background = color(theme.background, '#050607');
      if ('monochrome' in theme) output.theme.monochrome = theme.monochrome === true;
    }
    return output;
  }

  function normalizeAccessibility(input, unknown) {
    const source = object(input);
    unknownKeys(source, ACCESSIBILITY_KEYS, 'settings.accessibility', unknown);
    const output = {};
    const booleans = [...ACCESSIBILITY_KEYS].filter((key) => !['selfVoiceRate', 'selfVoicePitch', 'selfVoiceVolume', 'vitalSpeechMode', 'audioCuesVolume', 'communicationCues'].includes(key));
    for (const key of booleans) if (key in source) output[key] = source[key] === true;
    if ('selfVoiceRate' in source) output.selfVoiceRate = bounded(source.selfVoiceRate, 0.1, 10, 1);
    if ('selfVoicePitch' in source) output.selfVoicePitch = bounded(source.selfVoicePitch, 0, 2, 1);
    if ('selfVoiceVolume' in source) output.selfVoiceVolume = bounded(source.selfVoiceVolume, 0, 1, 1);
    if ('audioCuesVolume' in source) output.audioCuesVolume = bounded(source.audioCuesVolume, 0, 1, 0.65);
    if ('vitalSpeechMode' in source) {
      const mode = String(source.vitalSpeechMode || 'percent-values');
      output.vitalSpeechMode = ['percent', 'values', 'percent-values', 'current'].includes(mode) ? mode : 'percent-values';
    }
    if ('communicationCues' in source) {
      const cues = object(source.communicationCues);
      unknownKeys(cues, COMMUNICATION_KEYS, 'settings.accessibility.communicationCues', unknown);
      output.communicationCues = {};
      for (const key of COMMUNICATION_KEYS) if (key in cues) output.communicationCues[key] = cues[key] === true;
    }
    if (output.screenReaderMode === true && output.selfVoiceEnabled === true) output.selfVoiceEnabled = false;
    return output;
  }

  function normalizeClientPreset(input, options = {}) {
    const source = object(input);
    const unknown = [];
    unknownKeys(source, ROOT_KEYS, 'preset', unknown);
    if (source.kind !== PRESET_KIND) throw new Error(`Preset kind must be ${PRESET_KIND}.`);
    if (Number(source.schema) !== PRESET_SCHEMA) throw new Error(`Preset schema must be ${PRESET_SCHEMA}.`);
    const settings = object(source.settings);
    unknownKeys(settings, SETTING_KEYS, 'settings', unknown);
    const normalizedSettings = {};
    if ('display' in settings) normalizedSettings.display = normalizeDisplay(settings.display, unknown);
    if ('accessibility' in settings) normalizedSettings.accessibility = normalizeAccessibility(settings.accessibility, unknown);
    if ('layout' in settings) {
      const layout = String(settings.layout || '').trim().toLowerCase();
      if (!LAYOUTS.has(layout)) throw new Error(`Unsupported layout preset: ${layout || '(empty)'}.`);
      normalizedSettings.layout = layout;
    }
    if ('soundpackId' in settings) {
      const soundpackId = text(settings.soundpackId, 96).toLowerCase();
      if (!/^(?:builtin|[a-z0-9][a-z0-9._-]{0,95})$/u.test(soundpackId)) throw new Error('Soundpack id is invalid.');
      normalizedSettings.soundpackId = soundpackId;
    }
    if (!Object.keys(normalizedSettings).length) throw new Error('Preset contains no supported settings.');
    if (unknown.length && options.allowUnknown !== true) throw new Error(`Unknown preset fields: ${unknown.join(', ')}.`);
    return {
      kind: PRESET_KIND,
      schema: PRESET_SCHEMA,
      id: id(source.id, 'imported-preset'),
      name: text(source.name, 80, 'Imported Preset'),
      description: text(source.description, 400),
      source: ['builtin', 'imported', 'personal'].includes(source.source) ? source.source : 'imported',
      settings: normalizedSettings,
      warnings: unknown
    };
  }

  function mergeObject(base, changes) {
    const output = clone(object(base));
    for (const [key, value] of Object.entries(object(changes))) {
      output[key] = value && typeof value === 'object' && !Array.isArray(value)
        ? mergeObject(output[key], value) : clone(value);
    }
    return output;
  }

  function applyPresetToSettings(baseSettings, presetValue) {
    const preset = normalizeClientPreset(presetValue);
    const next = clone(object(baseSettings));
    if (preset.settings.display) next.display = mergeObject(next.display, preset.settings.display);
    if (preset.settings.accessibility) next.accessibility = mergeObject(next.accessibility, preset.settings.accessibility);
    return { settings: next, layout: preset.settings.layout || '', soundpackId: preset.settings.soundpackId || '', preset };
  }

  function flatten(value, prefix = '', output = {}) {
    for (const [key, entry] of Object.entries(object(value))) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (entry && typeof entry === 'object' && !Array.isArray(entry)) flatten(entry, path, output);
      else output[path] = entry;
    }
    return output;
  }

  function describePresetChanges(baseSettings, presetValue) {
    const preset = normalizeClientPreset(presetValue);
    const before = flatten({ display: object(baseSettings).display, accessibility: object(baseSettings).accessibility });
    const requested = flatten({ display: preset.settings.display, accessibility: preset.settings.accessibility });
    const changes = Object.entries(requested).filter(([path, value]) => JSON.stringify(before[path]) !== JSON.stringify(value))
      .map(([path, value]) => ({ path, before: before[path], after: value }));
    if (preset.settings.layout) changes.push({ path: 'workspace.layout', before: 'My Layout', after: preset.settings.layout });
    if (preset.settings.soundpackId) changes.push({ path: 'accessibility.soundpack', before: 'current', after: preset.settings.soundpackId });
    return changes.slice(0, 80);
  }

  function buildPersonalPreset(nameValue, descriptionValue, settingsValue, extras = {}) {
    const source = object(settingsValue);
    return normalizeClientPreset({
      kind: PRESET_KIND, schema: PRESET_SCHEMA, id: id(nameValue, 'my-preset'),
      name: text(nameValue, 80, 'My Preset'), description: text(descriptionValue, 400), source: 'personal',
      settings: {
        display: {
          fontSize: source.display?.fontSize, uiFont: source.display?.uiFont,
          terminalFont: source.display?.terminalFont, interfaceBrightness: source.display?.interfaceBrightness,
          compactOutput: source.display?.compactOutput, followOutput: source.display?.followOutput,
          theme: source.display?.theme
        },
        accessibility: source.accessibility,
        ...(extras.layout ? { layout: extras.layout } : {}),
        ...(extras.soundpackId ? { soundpackId: extras.soundpackId } : {})
      }
    });
  }

  const BUILTIN_PRESETS = Object.freeze([
    { kind: PRESET_KIND, schema: 1, id: 'nukefire-classic', name: 'NukeFire Classic', description: 'Traditional NukeFire colors, fonts, and workspace.', source: 'builtin', settings: { display: { fontSize: 16, uiFont: 'system', terminalFont: 'menlo', interfaceBrightness: 'brighter', compactOutput: false, theme: { preset: 'nukefire', foreground: '#d3d7dc', background: '#050607', monochrome: false } }, layout: 'classic' } },
    { kind: PRESET_KIND, schema: 1, id: 'large-print', name: 'Large Print', description: 'Larger terminal text and high-contrast interface.', source: 'builtin', settings: { display: { fontSize: 22, uiFont: 'atkinson', terminalFont: 'ibm-plex', interfaceBrightness: 'high-contrast', compactOutput: false } } },
    { kind: PRESET_KIND, schema: 1, id: 'compact-1440p', name: 'Compact 1440p', description: 'Compact field layout with more terminal room.', source: 'builtin', settings: { display: { fontSize: 15, terminalFont: 'menlo', compactOutput: true }, layout: 'compact-ops' } },
    { kind: PRESET_KIND, schema: 1, id: 'high-contrast', name: 'High Contrast', description: 'High-contrast interface and monochrome terminal.', source: 'builtin', settings: { display: { interfaceBrightness: 'high-contrast', theme: { preset: 'custom', foreground: '#ffffff', background: '#000000', monochrome: true } } } },
    { kind: PRESET_KIND, schema: 1, id: 'native-screen-reader', name: 'Native Screen Reader', description: 'Native screen-reader mode and Reader Workspace without NukeFire Self-Voice.', source: 'builtin', settings: { accessibility: { screenReaderMode: true, readerWorkspaceEnabled: true, selfVoiceEnabled: false, readerSafetyAlertsEnabled: true, announceImportant: true } } },
    { kind: PRESET_KIND, schema: 1, id: 'nukefire-voice', name: 'NukeFire Voice', description: 'NukeFire Self-Voice with safe priority and backlog controls.', source: 'builtin', settings: { accessibility: { screenReaderMode: false, readerWorkspaceEnabled: true, selfVoiceEnabled: true, selfVoiceGovernorEnabled: true, selfVoicePriorityAlertsEnabled: true, readerSafetyAlertsEnabled: true } } },
    { kind: PRESET_KIND, schema: 1, id: 'reader-essential', name: 'Reader Essential', description: 'Quiet Reader Workspace with essential alerts and built-in soundpack selection.', source: 'builtin', settings: { accessibility: { screenReaderMode: true, readerWorkspaceEnabled: true, selfVoiceEnabled: false, readerSafetyAlertsEnabled: true, audioCuesEnabled: true, announceImportant: true }, soundpackId: 'builtin' } }
  ].map((preset) => Object.freeze(normalizeClientPreset(preset))));

  function parsePresetText(value) {
    const textValue = String(value || '');
    const size = typeof Buffer !== 'undefined' ? Buffer.byteLength(textValue, 'utf8') : new TextEncoder().encode(textValue).length;
    if (size > MAX_PRESET_BYTES) throw new Error('Preset file is too large.');
    let parsed;
    try { parsed = JSON.parse(textValue); } catch { throw new Error('Preset file is not valid JSON.'); }
    return normalizeClientPreset(parsed);
  }

  return Object.freeze({ PRESET_KIND, PRESET_SCHEMA, MAX_PRESET_BYTES, BUILTIN_PRESETS, normalizeClientPreset, parsePresetText, applyPresetToSettings, describePresetChanges, buildPersonalPreset });
});
