'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8').replace(/\r\n?/gu, '\n');
}

const html = source('renderer/index.html');
const renderer = source('renderer/renderer.js');
const main = source('main.js');
const popoutHtml = source('renderer/popout.html');
const popout = source('renderer/popout.js');
const panelWindows = source('src/panel-window-state.js');
const settings = source('src/settings-store.js');
const sessionManager = source('src/session-manager.js');

const PANEL_IDS = [
  'vitals', 'sessionVitals', 'affects', 'quickCommands', 'liveState',
  'protocol', 'communications', 'contextDeck', 'mapper'
];

test('shared crew workspace is optional and persists one active arrangement', () => {
  assert.match(html, /id="shared-crew-workspace"/u);
  assert.match(renderer, /sharedCrewWorkspace: false/u);
  assert.match(renderer, /function setSharedCrewWorkspace/u);
  assert.match(renderer, /captureActiveWorkspaceAsSharedDefaults/u);
  assert.match(renderer, /return state\.workspace\.sharedCrewWorkspace \? '' : state\.workspace\.currentCharacterKey/u);
  assert.match(renderer, /sharedCrewWorkspace: state\.workspace\.sharedCrewWorkspace/u);
  assert.match(settings, /const SETTINGS_SCHEMA_VERSION = 48/u);
  assert.match(settings, /sharedCrewWorkspace: booleanValue\(input\.sharedCrewWorkspace, false\)/u);
});

test('every sidebar pane exposes a universal panel window command', () => {
  for (const panelId of PANEL_IDS) {
    assert.match(html, new RegExp(`data-panel-action="pop-out" data-panel-id="${panelId}"`, 'u'));
    assert.match(panelWindows, new RegExp(`\\n    ${panelId}: Object\\.freeze`, 'u'));
  }
  assert.match(main, /const SUPPORTED_POPOUT_PANELS = new Set\(POPOUT_PANEL_IDS\)/u);
  assert.match(renderer, /for \(const panelId of POPOUT_PANEL_IDS\)/u);
  assert.match(renderer, /function genericPanelPopoutSnapshot/u);
  assert.match(renderer, /function applyMirroredPanelControl/u);
  assert.match(renderer, /const observer = new MutationObserver\(\(\) => \{/u);
  assert.match(renderer, /panel\.id !== 'protocol'/u);
  assert.match(renderer, /\}, 250\);/u);
});

test('generic panel windows mirror live content and relay controls safely', () => {
  assert.match(popoutHtml, /id="generic-panel-view"/u);
  assert.match(popoutHtml, /id="panel-mirror"/u);
  assert.match(popout, /data-popout-control/u);
  assert.match(popout, /action: 'control'/u);
  assert.match(popout, /relayControl\(control, 'wheel'/u);
  assert.match(popout, /addEventListener\('submit'/u);
  assert.match(popoutHtml, /id="panel-size-toggle"/u);
  assert.match(popoutHtml, /data-window-size="fill-display"/u);
  assert.match(popout, /requestWindowResize/u);
  assert.match(popout, /snapshot\.accessibleLabel/u);
  assert.match(renderer, /accessibleLabel: definition\.accessibleLabel/u);
  assert.match(popout, /mode: 'custom'/u);
  assert.match(main, /ipcMain\.handle\('panel:resize'/u);
  assert.match(main, /bounds = \{ \.\.\.display\.workArea \}/u);
  assert.match(main, /panelWindowPresetBounds/u);
  assert.doesNotMatch(main, /Math\.min\(1800/u);
  assert.doesNotMatch(main, /Math\.min\(1400/u);
  assert.doesNotMatch(renderer, /Math\.min\(1800/u);
  assert.doesNotMatch(renderer, /Math\.min\(1400/u);
  assert.match(renderer, /Math\.min\(16384/u);
  assert.match(renderer, /panelPopoutControlMaps/u);
  assert.match(renderer, /element\.dispatchEvent\(new KeyboardEvent/u);
  assert.match(renderer, /element\.dispatchEvent\(new WheelEvent/u);
});

test('terminal dimensions still synchronize to every connected session', () => {
  assert.match(renderer, /setSessionTerminalSize\('\*', size\)/u);
  assert.match(sessionManager, /setTerminalSizeAll\(width, height\)/u);
});
