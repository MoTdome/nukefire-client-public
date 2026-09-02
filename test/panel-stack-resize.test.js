'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const resize = require('../src/panel-stack-resize');

test('panel heights are clamped to safe bounds', () => {
  assert.equal(resize.normalizeHeight(20), resize.MIN_PANEL_HEIGHT);
  assert.equal(resize.normalizeHeight(500), 500);
  assert.equal(resize.normalizeHeight(99999), resize.MAX_PANEL_HEIGHT);
  assert.equal(resize.normalizeHeight('nope'), null);
});

test('pane-height maps retain only valid panel and tab-group records', () => {
  assert.deepEqual(resize.normalizeHeightMap({
    'panel:affects': 245,
    'panel:communications': 99999,
    'group:contextDeck+mapper': 420,
    nonsense: 300,
    'panel:bad': 'nope'
  }), {
    'panel:affects': 245,
    'panel:communications': resize.MAX_PANEL_HEIGHT,
    'group:contextDeck+mapper': 420
  });
});

test('single-panel resize math grows and shrinks vertically', () => {
  assert.equal(resize.resizeHeight(300, 50), 350);
  assert.equal(resize.resizeHeight(300, -75), 225);
});

test('single-panel resize math refuses unsafe collapse', () => {
  assert.equal(resize.resizeHeight(300, -5000), resize.MIN_PANEL_HEIGHT);
});

test('single-panel resize math clamps excessive growth', () => {
  assert.equal(resize.resizeHeight(300, 5000), resize.MAX_PANEL_HEIGHT);
});

test('resize engine delegates persistence instead of owning localStorage', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'panel-stack-resize.js'), 'utf8');
  assert.doesNotMatch(source, /localStorage/u);
  assert.match(source, /getPanelHeights/u);
  assert.match(source, /savePanelHeight/u);
  assert.match(source, /resetPanelHeight/u);
  assert.match(source, /resetAllPanelHeights/u);
});


test('pane refresh no longer scans for abandoned Beta.55 stack-resize DOM', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'panel-stack-resize.js'), 'utf8');
  assert.doesNotMatch(source, /clearLegacyStackResize/u);
  assert.doesNotMatch(source, /querySelectorAll\('\.panel-stack-resizer'\)/u);
  assert.doesNotMatch(source, /querySelectorAll\('\.panel-stack-sized'\)/u);
});

test('per-panel handles remain durable when panels are regrouped', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'panel-stack-resize.js'), 'utf8');
  assert.match(source, /panel\.append\(handle\)/u);
  assert.match(source, /targetForPanel\(panel\)/u);
  assert.match(source, /\.closest\?\.\('\.dock-tab-group'\)/u);
  assert.match(source, /drag\?\.target !== target/u);
});

test('renderer loads the resize engine before renderer.js with dedicated styles', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const styles = fs.readFileSync(path.join(root, 'renderer', 'styles.css'), 'utf8');

  const modulePath = path.resolve(root, 'renderer', '../src/panel-stack-resize.js');
  const modulePosition = html.indexOf('../src/panel-stack-resize.js');
  const rendererPosition = html.indexOf('renderer.js');
  assert.equal(fs.existsSync(modulePath), true);
  assert.equal(
    html.includes('<script src="./src/panel-stack-resize.js"></script>'),
    false
  );
  assert.ok(modulePosition >= 0);
  assert.ok(rendererPosition > modulePosition);
  assert.match(renderer, /NukeFirePanelStackResize\?\.install\?\./u);
  assert.match(renderer, /NukeFirePanelHeightController/u);
  assert.match(styles, /\.panel-height-resizer\s*\{/u);
  assert.match(styles, /\.panel-height-sized\.communications-panel/u);
});

test('resize engine relies on structural observers instead of refreshing after every click or change', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'panel-stack-resize.js'), 'utf8');
  assert.match(source, /new MutationObserver/u);
  assert.match(source, /record\.type === 'childList'/u);
  assert.doesNotMatch(source, /document\.addEventListener\('click', \(\) => refresh\(\), true\)/u);
  assert.doesNotMatch(source, /document\.addEventListener\('change', \(\) => refresh\(\), true\)/u);
});
