'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const fsp = require('node:fs/promises');
const {
  SettingsStore,
  DEFAULT_SETTINGS,
  normalizeSettings,
  settingsFromLegacy,
  AFFECT_DISPLAY_MODES
} = require('../src/settings-store');

const ROOT = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

test('Affects display mode defaults to Complete and accepts Classic', () => {
  assert.deepEqual(AFFECT_DISPLAY_MODES, ['classic', 'complete']);
  assert.equal(DEFAULT_SETTINGS.display.affectsMode, 'complete');
  assert.equal(normalizeSettings({}).display.affectsMode, 'complete');
  assert.equal(normalizeSettings({ display: { affectsMode: 'classic' } }).display.affectsMode, 'classic');
  assert.equal(normalizeSettings({ display: { affectsMode: 'unexpected' } }).display.affectsMode, 'complete');
});

test('legacy local preference can migrate the Affects display choice', () => {
  assert.equal(settingsFromLegacy({ affectsDisplayMode: 'classic' }).display.affectsMode, 'classic');
});

test('Affects display choice persists through the settings store', async (t) => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'nukefire-affects-mode-'));
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  const store = new SettingsStore({ baseDirectory: directory });
  const initial = await store.load();
  await store.save({ ...initial, display: { ...initial.display, affectsMode: 'classic' } });
  const reloaded = new SettingsStore({ baseDirectory: directory });
  assert.equal((await reloaded.load()).display.affectsMode, 'classic');
});

test('Affects pane exposes Complete and Classic presentation choices', () => {
  const html = read('renderer/index.html');
  assert.match(html, /id="affects-display-mode"/u);
  assert.match(html, /<option value="complete">Complete<\/option>/u);
  assert.match(html, /<option value="classic">Classic<\/option>/u);
});

test('Classic view keeps timed modifiers visible while filtering permanent groups', () => {
  const renderer = read('renderer/renderer.js');
  const css = read('renderer/styles.css');
  assert.match(renderer, /allGroups\.filter\(\(group\) => !group\.permanent\)/u);
  assert.match(renderer, /card\.className = 'affect-card'/u);
  assert.match(renderer, /details\.className = 'affect-details'/u);
  assert.match(css, /\.affect-card\s*\{/u);
  assert.match(css, /\.affect-card \.affect-details\s*\{/u);
});
