'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')
    .replace(/\r\n?/gu, '\n');
}

const PANEL_IDS = Object.freeze([
  'vitals',
  'sessionVitals',
  'affects',
  'mobInspector',
  'lootHistory',
  'foundlist',
  'quickCommands',
  'liveState',
  'protocol',
  'communications',
  'contextDeck',
  'mapper'
]);

const COMMON_ACTIONS = Object.freeze([
  'move-left',
  'move-right',
  'move-outer-right',
  'move-bottom',
  'tab-previous',
  'tab-next',
  'separate-tab',
  'move-earlier',
  'move-later',
  'reset-size',
  'pop-out',
  'hide'
]);

function menuBlock(html, panelId) {
  const marker = `data-panel-menu="${panelId}"`;
  const markerIndex = html.indexOf(marker);
  assert.notEqual(markerIndex, -1, `missing ${panelId} panel menu`);
  const start = html.lastIndexOf('<div', markerIndex);
  const end = html.indexOf('</div>', markerIndex);
  assert.ok(start >= 0 && end > start, `could not isolate ${panelId} panel menu`);
  return html.slice(start, end + '</div>'.length);
}

test('every docked pane exposes the same common panel actions in the same order', () => {
  const html = source('renderer/index.html');
  for (const panelId of PANEL_IDS) {
    const block = menuBlock(html, panelId);
    const actions = [...block.matchAll(/data-panel-action="([^"]+)"/gu)]
      .map((match) => match[1]);
    assert.deepEqual(actions, COMMON_ACTIONS, `${panelId} common action order`);
  }
});

test('every pane menu includes one Reset Panel Size command before Pop Out and Hide', () => {
  const html = source('renderer/index.html');
  assert.equal((html.match(/>Reset Panel Size<\/button>/gu) || []).length, PANEL_IDS.length);
  for (const panelId of PANEL_IDS) {
    const block = menuBlock(html, panelId);
    assert.match(
      block,
      /data-panel-action="reset-size"[\s\S]*>Reset Panel Size<\/button>[\s\S]*data-panel-action="pop-out"[\s\S]*data-panel-action="hide"/u
    );
  }
});

test('panel resize controller exposes a safe one-pane restore operation', () => {
  const resize = source('src/panel-stack-resize.js');
  assert.match(resize, /function resetPanel\(panelIdValue\)/u);
  assert.match(resize, /const target = targetForPanel\(panel\);[\s\S]*clearTargetHeight\(target, true\);/u);
  assert.match(resize, /announce\(`\$\{targetLabel\(target\)\} height restored\.`\)/u);
  assert.match(resize, /return \{[\s\S]*resetPanel,[\s\S]*resetAllForCurrentWorkspace/u);
});

test('every common panel action closes its menu before mutating the workspace', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(
    renderer,
    /for \(const item of document\.querySelectorAll\('\[data-panel-action\]'\)\)[\s\S]*const action = item\.dataset\.panelAction;[\s\S]*closePanelMenu\(panelId\);[\s\S]*if \(action === 'reset-size'\)/u
  );
  assert.match(renderer, /NukeFirePanelHeightController\?\.resetPanel\?\.\(panelId\)/u);
  assert.match(renderer, /if \(action === 'pop-out'\)[\s\S]*openPanelPopout\(panelId, \{ focus: true \}\)/u);
  assert.match(renderer, /if \(destination\) movePanel\(panelId, destination\);/u);
});

test('panel menus share one keyboard contract and explicit pop-out wording', () => {
  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');

  for (const key of ['Escape', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab']) {
    assert.match(renderer, new RegExp(`event\\.key === '${key}'`, 'u'));
  }
  assert.match(renderer, /closePanelMenu\(menu\.dataset\.panelMenu, \{ returnFocus: true \}\)/u);
  assert.equal((html.match(/>Pop Out Window<\/button>/gu) || []).length, PANEL_IDS.length);
  assert.equal((html.match(/aria-haspopup="menu"/gu) || []).length >= PANEL_IDS.length, true);
});
