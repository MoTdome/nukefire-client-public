'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const settingsStore = require('../src/settings-store');

const root = path.resolve(__dirname, '..');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Beta.77 detached panels are frameless but retain a draggable reveal header', () => {
  const main = source('main.js');
  const css = source('renderer/popout.css');
  const html = source('renderer/popout.html');

  assert.ok(main.includes('frame: false,'));
  assert.ok(main.includes('hasShadow: true,'));
  assert.ok(css.includes('-webkit-app-region: drag;'));
  assert.ok(css.includes('-webkit-app-region: no-drag;'));
  assert.ok(css.includes('cursor: move;'));
  assert.ok(html.includes('Drag this revealed header to move the frameless panel window.'));
});

test('Beta.77 terminal-only play mode is default-on and persisted', () => {
  const defaults = settingsStore.normalizeSettings({});
  assert.equal(defaults.display.playChromeAutoHide, true);

  const disabled = settingsStore.normalizeSettings({ display: { playChromeAutoHide: false } });
  assert.equal(disabled.display.playChromeAutoHide, false);

  const renderer = source('renderer/renderer.js');
  assert.ok(renderer.includes('function applyPlayChromeAutoHide'));
  assert.ok(renderer.includes('nukefire.playChromeAutoHide'));
  assert.ok(renderer.includes("playChromeAutoHide: document.body.dataset.playChromeAutoHide !== 'false'"));
});

test('Beta.77 connected play mode gives the workspace full vertical layout', () => {
  const html = source('renderer/index.html');
  const css = source('renderer/styles.css');

  assert.ok(html.includes('id="play-chrome-reveal"'));
  assert.ok(html.includes('id="play-chrome-auto-hide" type="checkbox" checked'));
  assert.ok(css.includes('Beta.77 terminal tiles: connection/session chrome becomes an overlay in play.'));
  assert.ok(css.includes('grid-template-rows: minmax(0, 1fr);'));
  assert.ok(css.includes('#workspace {'));
  assert.ok(css.includes('grid-row: 1;'));
  assert.ok(css.includes('transform: translateY(-140px);'));
  assert.ok(css.includes('position: absolute;'));
  assert.ok(css.includes('.play-chrome-reveal:hover'));
  assert.ok(css.includes('transform: translateY(0);'));
});

test('Beta.77 play-mode hiding explicitly excludes Reader Mode', () => {
  const css = source('renderer/styles.css');
  const selector = 'body[data-play-chrome-auto-hide="true"][data-connection-state="connected"]:not(.screen-reader-mode)';
  assert.ok(css.split(selector).length - 1 >= 4);
});

test('Beta.77 terminal-wall polish removes decorative HUD hardware and hides docked pane titlebars in play', () => {
  const css = source('renderer/styles.css');
  assert.ok(css.includes('Beta.77 terminal-wall polish: content first, decorative HUD hardware removed.'));
  assert.ok(css.includes('#app::before,'));
  assert.ok(css.includes('#app::after,'));
  assert.ok(css.includes('.panel::before {'));
  assert.ok(css.includes('display: none !important;'));
  assert.ok(css.includes('.panel > .panel-titlebar {'));
  assert.ok(css.includes('transform: translateY(calc(-100% + 4px));'));
  assert.ok(css.includes('.panel:hover > .panel-titlebar'));
  assert.ok(css.includes('.panel:focus-within > .panel-titlebar'));
});

test('Beta.77 terminal-wall polish deliberately leaves pane tab navigation visible', () => {
  const css = source('renderer/styles.css');
  const polish = css.slice(css.indexOf('Beta.77 terminal-wall polish'));
  assert.ok(polish.includes('Actual tab strips remain'));
  assert.equal(polish.includes('.panel-tablist { display: none'), false);
});
