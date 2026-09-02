'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const resize = require('../src/panel-stack-resize');

test('resize handles use fixed viewport geometry at the pane bottom without entering scroll flow', () => {
  assert.deepEqual(
    resize.handleViewportGeometry(
      { left: 10, right: 250, bottom: 500 },
      { top: 100, bottom: 800, left: 0, right: 300 }
    ),
    { visible: true, left: 15, top: 490, width: 230, height: 10 }
  );

  assert.equal(
    resize.handleViewportGeometry(
      { left: 10, right: 250, bottom: 900 },
      { top: 100, bottom: 800, left: 0, right: 300 }
    ).visible,
    false
  );

  const root = path.join(__dirname, '..');
  const source = fs.readFileSync(path.join(root, 'src', 'panel-stack-resize.js'), 'utf8');
  assert.match(source, /handle\.style\.position = 'fixed'/u);
  assert.match(source, /handle\.style\.visibility = geometry\.visible/u);
  assert.doesNotMatch(source, /handleBottomTranslation/u);
});

test('narrow detached panel size menu opens inward instead of off the left edge', () => {
  const root = path.join(__dirname, '..');
  const css = fs.readFileSync(path.join(root, 'renderer', 'popout.css'), 'utf8');
  const source = fs.readFileSync(path.join(root, 'src', 'panel-stack-resize.js'), 'utf8');

  assert.match(source, /function positionHandleAtTargetBottom/u);
  assert.match(source, /document\.addEventListener\('scroll', scheduleHandlePositionRefresh, true\)/u);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.popout-size-menu\s*\{[\s\S]*?left:\s*0;[\s\S]*?right:\s*auto;/u);
});
