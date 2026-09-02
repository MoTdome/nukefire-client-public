'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const presets = require('../src/client-preset');

const ROOT = path.join(__dirname, '..');

test('ships seven bounded built-in presets with deliberate purposes', () => {
  assert.deepEqual(presets.BUILTIN_PRESETS.map((entry) => entry.id), [
    'nukefire-classic', 'large-print', 'compact-1440p', 'high-contrast',
    'native-screen-reader', 'nukefire-voice', 'reader-essential'
  ]);
  assert.ok(presets.BUILTIN_PRESETS.every((entry) => entry.kind === presets.PRESET_KIND && entry.schema === 1));
});

test('rejects executable, account, path, and unknown data instead of silently granting behavior', () => {
  const base = { kind: presets.PRESET_KIND, schema: 1, id: 'unsafe', name: 'Unsafe', settings: { display: { fontSize: 18 } } };
  for (const addition of [
    { command: 'kill all' }, { aliases: [{ name: 'x', body: 'quit' }] },
    { password: 'secret' }, { url: 'https://example.test/payload' }, { path: '/tmp/x' }
  ]) {
    assert.throws(() => presets.normalizeClientPreset({ ...base, settings: { ...base.settings, ...addition } }), /Unknown preset fields/u);
  }
  assert.throws(() => presets.normalizeClientPreset({ ...base, javascript: 'alert(1)' }), /Unknown preset fields/u);
});

test('sanitizes bounded display and accessibility values and keeps reader modes exclusive', () => {
  const preset = presets.normalizeClientPreset({
    kind: presets.PRESET_KIND, schema: 1, id: 'bounded', name: 'Bounded',
    settings: {
      display: { fontSize: 999, uiFont: 'unknown', terminalFont: 'unknown', theme: { foreground: '#ABCDEF', background: 'bad' } },
      accessibility: { screenReaderMode: true, selfVoiceEnabled: true, selfVoiceRate: 99, audioCuesVolume: -2 }
    }
  });
  assert.equal(preset.settings.display.fontSize, 28);
  assert.equal(preset.settings.display.uiFont, 'system');
  assert.equal(preset.settings.display.terminalFont, 'menlo');
  assert.deepEqual(preset.settings.display.theme, { foreground: '#abcdef', background: '#050607' });
  assert.equal(preset.settings.accessibility.selfVoiceEnabled, false);
  assert.equal(preset.settings.accessibility.selfVoiceRate, 10);
  assert.equal(preset.settings.accessibility.audioCuesVolume, 0);
});

test('applies only allowlisted preset fields while preserving unrelated player investment', () => {
  const before = {
    connection: { host: 'private.example', port: 4000 },
    aliases: [{ name: 'k', body: 'kill %1' }],
    input: { commandPrefix: '~' },
    display: { fontSize: 16, terminalFont: 'menlo', theme: { preset: 'nukefire', foreground: '#d3d7dc' } },
    accessibility: { screenReaderMode: false, selfVoiceEnabled: false }
  };
  const result = presets.applyPresetToSettings(before, presets.BUILTIN_PRESETS.find((entry) => entry.id === 'large-print'));
  assert.equal(result.settings.display.fontSize, 22);
  assert.equal(result.settings.display.terminalFont, 'ibm-plex');
  assert.deepEqual(result.settings.connection, before.connection);
  assert.deepEqual(result.settings.aliases, before.aliases);
  assert.deepEqual(result.settings.input, before.input);
});

test('builds a declarative personal preset and reports a structured preview', () => {
  const current = {
    display: { fontSize: 18, uiFont: 'verdana', terminalFont: 'ubuntu-mono', interfaceBrightness: 'brighter', compactOutput: false, followOutput: true, theme: { preset: 'custom', foreground: '#eeeeee', background: '#111111', monochrome: false } },
    accessibility: { screenReaderMode: false, selfVoiceEnabled: false, audioCuesEnabled: true }
  };
  const preset = presets.buildPersonalPreset('My setup', 'Shared safely', current, { layout: 'field-ops', soundpackId: 'builtin' });
  assert.equal(preset.source, 'personal');
  assert.equal(preset.settings.layout, 'field-ops');
  assert.equal(preset.settings.soundpackId, 'builtin');
  assert.equal(JSON.stringify(preset).includes('aliases'), false);
  const changes = presets.describePresetChanges({ display: { fontSize: 16 }, accessibility: {} }, preset);
  assert.ok(changes.some((entry) => entry.path === 'display.fontSize' && entry.after === 18));
  assert.ok(changes.some((entry) => entry.path === 'workspace.layout'));
});

test('exposes guarded main/preload file bridges for nfpreset import and export', () => {
  const main = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8');
  const preload = fs.readFileSync(path.join(ROOT, 'preload.js'), 'utf8');
  assert.match(main, /ipcMain\.handle\('client-presets:import'/u);
  assert.match(main, /extensions: \['nfpreset'\]/u);
  assert.match(main, /buffer\.length > clientPresets\.MAX_PRESET_BYTES/u);
  assert.match(main, /flag: 'wx'/u);
  assert.match(preload, /importClientPreset: \(\) => ipcRenderer\.invoke\('client-presets:import'\)/u);
  assert.match(preload, /exportClientPreset: \(preset\) => ipcRenderer\.invoke\('client-presets:export', preset\)/u);
});

test('wires an explicit preview, keep, revert, import, and export preference flow', () => {
  const html = fs.readFileSync(path.join(ROOT, 'renderer', 'index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(ROOT, 'renderer', 'renderer.js'), 'utf8');
  for (const id of ['client-preset-preview', 'client-preset-keep', 'client-preset-revert', 'client-preset-import', 'client-preset-export']) {
    assert.match(html, new RegExp(`id="${id}"`, 'u'));
  }
  assert.match(renderer, /previewSnapshot = structuredCloneSafe\(collectPersistentSettings\(\)\)/u);
  assert.match(renderer, /function keepClientPresetPreview\(\)/u);
  assert.match(renderer, /async function revertClientPresetPreview/u);
  assert.match(renderer, /if \(state\.clientPresets\.previewSnapshot\) revertClientPresetPreview/u);
  assert.match(renderer, /exported without commands, scripts, credentials, or history/u);
});
