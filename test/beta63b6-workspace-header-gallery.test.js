'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n?/gu, '\n');

test('workspace header uses the dead center for a compact accessible layout gallery', () => {
  const html = source('renderer/index.html');
  const css = source('renderer/styles.css');
  assert.match(html, /id="layout-gallery" class="layout-gallery" aria-label="Workspace layout gallery"/u);
  assert.match(html, /id="layout-gallery-previous"[^>]*aria-label="Previous layout preview"/u);
  assert.match(html, /id="layout-gallery-next"[^>]*aria-label="Next layout preview"/u);
  assert.match(css, /#app \{\n  --connection-bar-height: 64px;/u);
  assert.match(css, /\.connection-actions \{[\s\S]*?align-items: center;[\s\S]*?padding-bottom: 0;/u);
  assert.match(css, /\.layout-gallery \{[\s\S]*?flex: 1 1 330px;[\s\S]*?height: 52px;/u);
});

test('layout gallery includes Terminal Only and preserves My Layout as a safe return point', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /id: 'my-layout',[\s\S]*?label: 'My Layout'/u);
  assert.match(renderer, /id: 'terminal-only',[\s\S]*?label: 'Terminal Only',[\s\S]*?No panes\. Maximum room for the terminal\./u);
  assert.match(renderer, /Object\.fromEntries\(SIDEBAR_PANELS\.map\(\(panel\) => \[panel\.id, false\]\)\)/u);
  assert.match(renderer, /gallery\.returnSnapshot = captureLayoutGallerySnapshot\(\)/u);
  assert.match(renderer, /applyPanelLayout\(item\.layout, \{ persist: false/u);
  assert.match(renderer, /applyPanelVisibility\(item\.panels, \{ persist: false/u);
  assert.match(renderer, /applyDockSizes\(item\.dockSizes, \{ persist: false/u);
  assert.match(renderer, /Returned to My Layout\./u);
});

test('gallery rotation is passive, pauses for interaction, and respects reduced motion', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /const LAYOUT_GALLERY_ROTATION_MS = 7000;/u);
  assert.match(renderer, /matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)\?\.matches/u);
  assert.match(renderer, /layoutGallery: \{ index: 0, timer: null, paused: false, appForeground: false/u);
  assert.match(renderer, /if \(!state\.workspace\.layoutGallery\.appForeground\) return;/u);
  assert.match(renderer, /onAppFocusChanged\?\.\(\(focused\) => setLayoutGalleryAppForeground\(focused !== false\)\)/u);
  assert.match(renderer, /isAppFocused\?\.\(\)[\s\S]*setLayoutGalleryAppForeground\(focused !== false\)/u);
  assert.doesNotMatch(renderer, /window\.addEventListener\('blur'/u);
  assert.match(renderer, /layoutGallery\?\.addEventListener\('pointerenter',[\s\S]*?paused = true/u);
  assert.match(renderer, /layoutGallery\?\.addEventListener\('focusin',[\s\S]*?paused = true/u);
  assert.doesNotMatch(renderer, /setInterval\([^)]*applyLayoutGalleryPreset/u);
});

test('Close Session now explains removal before the session manager is mutated', () => {
  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');
  assert.match(html, /id="session-close"[^>]*>Close Session…<\/button>/u);
  assert.match(html, /id="close-session-overlay" class="disconnect-overlay" hidden/u);
  assert.match(html, /Use Disconnect instead if you only want to end the live connection/u);
  assert.match(renderer, /\$\('#session-close'\)\?\.addEventListener\('click', openCloseSessionDialog\)/u);
  assert.match(renderer, /async function confirmCloseSessionDialog\(\)[\s\S]*?window\.nukefire\.removeSession\?\.\(sessionId\)/u);
  assert.doesNotMatch(renderer, /\$\('#session-close'\)\?\.addEventListener\('click', async/u);
});

test('gallery offers field layouts with Affects left, Map and Vitals together, and Communications far right', () => {
  const html = source('renderer/index.html');
  const css = source('renderer/styles.css');
  const renderer = source('renderer/renderer.js');
  assert.match(html, /class="layout-preview-outer-right"/u);
  assert.match(renderer, /id: 'field-ops',[\s\S]*?label: 'Field Ops'/u);
  assert.match(renderer, /id: 'field-ops-crew',[\s\S]*?label: 'Field Ops \+ Crew'/u);
  assert.match(renderer, /id: 'compact-ops',[\s\S]*?label: 'Compact Ops'/u);
  assert.match(renderer, /affects: Object\.freeze\(\{ region: 'left', order: 0 \}\)[\s\S]*?mapper: Object\.freeze\(\{ region: 'right', order: 0 \}\)[\s\S]*?vitals: Object\.freeze\(\{ region: 'right', order: 1 \}\)[\s\S]*?communications: Object\.freeze\(\{ region: 'outer-right', order: 0 \}\)/u);
  assert.match(renderer, /displayComponents: Object\.freeze\(\{ \.\.\.DEFAULT_DISPLAY_COMPONENTS, gpsNavigator: true, mapperMap: true, mapperRoomInfo: true \}\)/u);
  assert.match(renderer, /displayComponents: \{ \.\.\.state\.displayComponents \}/u);
  assert.match(renderer, /applyDisplayComponents\(snapshot\.displayComponents \|\| state\.displayComponents, \{ persist: false/u);
  assert.match(css, /data-layout-preview="field-ops"[\s\S]*?layout-preview-outer-right/u);
});
