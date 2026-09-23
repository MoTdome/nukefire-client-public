'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeSettings } = require('../src/settings-store');

const root = path.resolve(__dirname, '..');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Beta.78 chrome settings expose terminal-wall and persistent choices independently', () => {
  const migrated = normalizeSettings({
    display: {
      playChromeAutoHide: true,
      panelChromeAutoHide: false
    }
  });
  assert.equal(migrated.display.playChromeAutoHide, true);
  assert.equal(migrated.display.panelChromeAutoHide, true);
  assert.equal(migrated.display.popoutChromeAutoHide, true);
  assert.equal(migrated.display.framelessPopouts, true);
  assert.equal(migrated.display.decorativeHud, false);

  const custom = normalizeSettings({
    display: {
      playChromeAutoHide: false,
      panelChromeAutoHide: true,
      popoutChromeAutoHide: false,
      framelessPopouts: false,
      decorativeHud: true
    }
  });
  assert.equal(custom.display.playChromeAutoHide, false);
  assert.equal(custom.display.panelChromeAutoHide, true);
  assert.equal(custom.display.popoutChromeAutoHide, false);
  assert.equal(custom.display.framelessPopouts, false);
  assert.equal(custom.display.decorativeHud, true);

  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');
  assert.ok(html.includes('id="chrome-preset-terminal-wall"'));
  assert.ok(html.includes('id="chrome-preset-classic"'));
  assert.ok(html.includes('id="popout-chrome-auto-hide"'));
  assert.ok(html.includes('id="frameless-popouts"'));
  assert.ok(html.includes('id="decorative-hud"'));
  assert.ok(renderer.includes("applyChromePreset('terminal-wall')"));
  assert.ok(renderer.includes("applyChromePreset('classic')"));
});

test('Beta.78 docked pane headers are no longer coupled to main play-mode hiding', () => {
  const css = source('renderer/styles.css');
  assert.ok(css.includes('body[data-panel-chrome-auto-hide="true"]:not(.screen-reader-mode) .panel > .panel-titlebar'));
  assert.equal(
    css.includes('body[data-play-chrome-auto-hide="true"][data-connection-state="connected"]:not(.screen-reader-mode) .panel > .panel-titlebar'),
    false
  );
  assert.ok(css.includes('body[data-decorative-hud="false"] #app::before'));
});

test('Beta.78 detached windows can recreate between frameless and native frame modes', () => {
  const main = source('main.js');
  const renderer = source('renderer/renderer.js');
  const popout = source('renderer/popout.js');
  const css = source('renderer/popout.css');

  assert.ok(main.includes('const frameless = options.frameless !== false;'));
  assert.ok(main.includes('frame: !frameless,'));
  assert.ok(main.includes('existing.__frameless !== frameless'));
  assert.ok(main.includes('panelWindow.__suppressClosedNotification'));
  assert.ok(renderer.includes("frameless: document.body.dataset.framelessPopouts !== 'false'"));
  assert.ok(popout.includes('ui.popoutChromeAutoHide !== false'));
  assert.ok(popout.includes('ui.framelessPopouts !== false'));
  assert.ok(css.includes('body[data-popout-chrome-auto-hide="false"]:not(.screen-reader-mode) .popout-shell'));
  assert.ok(css.includes('body[data-frameless-popouts="true"] .popout-header'));
});

test('Beta.78 explicitly covers the reported Cascadia Mono 17px metric case', () => {
  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');

  assert.ok(html.includes('<option value="cascadia">Cascadia Mono or Code, if installed</option>'));
  assert.ok(html.includes('id="font-size" type="number" min="12" max="28"'));
  assert.ok(renderer.includes('Math.ceil(size * lineHeight) + 4'));
  assert.ok(renderer.includes('document.fonts?.load'));
  assert.ok(renderer.includes('document.fonts?.ready'));
  assert.ok(renderer.includes('terminalFontMetricsSettleTimer'));
});

test('Beta.78 terminal output has a structural bottom safety boundary', () => {
  const css = source('renderer/styles.css');
  const renderer = source('renderer/renderer.js');

  assert.ok(css.includes('contain: paint;'));
  assert.ok(css.includes('inset: 0 0 var(--terminal-bottom-guard, 24px);'));
  assert.ok(renderer.includes('function terminalBottomGuardPixels'));
  assert.ok(renderer.includes('xtermApi.terminalTypography(state.terminalFont, compact)'));
  assert.ok(renderer.includes('return Math.ceil(size * lineHeight) + 4;'));
  assert.ok(renderer.includes('terminalFontMetricsSettleTimer'));
  assert.ok(renderer.includes('}, 240);'));
  assert.ok(renderer.includes("applyTerminalBottomGuard($('#font-size')?.value)"));
  assert.ok(css.includes('position: relative;'));
  assert.ok(css.includes('z-index: 5;'));
  assert.ok(renderer.includes('if (visibilityChanged) scheduleTerminalSizeUpdate();'));
  assert.ok(renderer.includes('else if (visible) scheduleTerminalSizeUpdate();'));
  assert.ok(renderer.includes('terminalSettledFitTimer'));
  assert.ok(renderer.includes("document.querySelector('.input-bar')"));
});
