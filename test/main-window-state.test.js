'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  normalizeMainWindowState,
  windowStateForSave
} = require('../src/main-window-state');

test('saved main-window geometry survives when it still fits the display', () => {
  assert.deepEqual(
    normalizeMainWindowState({
      bounds: { x: 20, y: 30, width: 1900, height: 980 },
      maximized: false
    }, {
      x: 0, y: 0, width: 2048, height: 1060
    }),
    {
      version: 1,
      bounds: { x: 20, y: 30, width: 1900, height: 980 },
      maximized: false
    }
  );
});

test('saved geometry is recovered safely when the old display is smaller', () => {
  assert.deepEqual(
    normalizeMainWindowState({
      bounds: { x: 1800, y: 900, width: 2400, height: 1400 },
      maximized: true
    }, {
      x: 0, y: 23, width: 1440, height: 877
    }),
    {
      version: 1,
      bounds: { x: 0, y: 23, width: 1440, height: 877 },
      maximized: true
    }
  );
});

test('main process writes geometry on close and renderer immediately commits workspace geometry', () => {
  const root = path.join(__dirname, '..');
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

  assert.match(main, /main-window-state\.json/u);
  assert.match(main, /function saveMainWindowState/u);
  assert.match(main, /mainWindow\.on\('close'/u);
  assert.match(main, /saveMainWindowState\(mainWindow\)/u);
  assert.match(main, /\['resize', 'move', 'maximize', 'unmaximize'\]/u);

  assert.match(renderer, /function flushWorkspaceGeometrySaveNow/u);
  assert.match(renderer, /function storeWorkspacePanelHeightOverrides/u);
  assert.match(renderer, /flushWorkspaceGeometrySaveNow\(\)/u);
});
