
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

test('Custom Panes P2 registers player panes as dynamic workspace panels', () => {
  assert.match(renderer, /const activeCustomPaneWorkspacePanels = new Map\(\)/u);
  assert.match(renderer, /function workspacePanelDefinitions\(\)/u);
  assert.match(renderer, /function customPaneWorkspacePanelId/u);
  assert.match(renderer, /section\.dataset\.workspacePanel = panelId/u);
  assert.match(renderer, /titlebar\.draggable = true/u);
  assert.match(renderer, /customPaneMenuItem\(panelId, 'move-left'/u);
  assert.match(renderer, /customPaneMenuItem\(panelId, 'tab-next'/u);
  assert.match(renderer, /customPaneMenuItem\(panelId, 'separate-tab'/u);
  assert.match(renderer, /customPaneMenuItem\(panelId, 'hide'/u);
  assert.match(renderer, /activateCustomPaneWorkspace\(record\)/u);
});

test('Custom Pane workspace uses the existing dock and tab engine without enabling popouts', () => {
  assert.match(renderer, /workspacePanelDefinitions\(\)\.map\(\(candidate\) => candidate\.id\)/u);
  assert.match(renderer, /function panelDragDefinition\(panelId\) \{\s*return workspacePanelDefinition\(panelId\);/u);
  assert.match(renderer, /persist: !isCustomPaneWorkspacePanel\(panelId\)/u);
  const menuBlock = renderer.slice(
    renderer.indexOf('function ensureCustomPaneWorkspacePanel'),
    renderer.indexOf('function renderCustomPaneWorkspacePanel')
  );
  assert.doesNotMatch(menuBlock, /customPaneMenuItem\(panelId, 'pop-out'/u);
});

test('Custom Pane value updates remain semantic and markup-free', () => {
  const renderBlock = renderer.slice(
    renderer.indexOf('function renderCustomPaneWorkspacePanel'),
    renderer.indexOf('function removeCustomPaneWorkspacePanel')
  );
  assert.match(renderBlock, /document\.createElement\('progress'\)/u);
  assert.match(renderBlock, /output\.textContent = String\(value/u);
  assert.match(renderBlock, /body\.dataset\.structureSignature/u);
  assert.doesNotMatch(renderBlock, /\.innerHTML\s*=/u);
  assert.doesNotMatch(renderBlock, /pane\.html|pane\.css|pane\.javascript/u);
});


test('Custom Pane runtime ids are filtered out of persistent built-in workspace snapshots', () => {
  assert.match(renderer, /function persistentPanelVisibilitySnapshot/u);
  assert.match(renderer, /function persistentPanelLayoutSnapshot/u);
  assert.match(renderer, /function persistentTabGroupsSnapshot/u);
  assert.match(renderer, /function persistentActiveTabsSnapshot/u);
  assert.match(renderer, /state\.workspace\.defaultLayout = persistentPanelLayoutSnapshot/u);
  assert.match(renderer, /panels: persistentPanelVisibilitySnapshot/u);
});

test('help describes first-class Custom Panes and keeps the sandbox boundary', () => {
  const help = fs.readFileSync(path.join(__dirname, '..', 'src', 'client-command-help.js'), 'utf8');
  assert.match(help, /Each active custom pane is its own NukeFire workspace panel/u);
  assert.match(help, /dragged, moved between docks, or joined\/separated as a tab/u);
  assert.match(help, /never HTML, CSS, JavaScript, DOM access/u);
  assert.match(help, /gag\/render-veto/u);
});
