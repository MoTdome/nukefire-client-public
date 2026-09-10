'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const { installFakeXterm } = require('./fake-xterm');

function createRenderer() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });
  const handlers = {};

  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    loadSettings: async () => null,
    saveSettings: async () => ({ ok: true }),
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onGmcpState: (callback) => { handlers.gmcpState = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onProtocolWarning: () => {},
    onCharset: () => {},
    onTerminalType: () => {},
    onWindowSize: () => {},
    onError: (callback) => { handlers.error = callback; },
    onMenuConnect: () => {},
    onMenuFind: () => {},
    onMenuPreferences: (callback) => { handlers.menuPreferences = callback; },
    onMenuFocusCommand: () => {},
    onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {},
    onMenuReadVitals: () => {}
  };

  dom.window.eval(source);
  return { dom, handlers };
}

function nextFrame() {
  return new Promise((resolve) => setTimeout(resolve, 10));
}

test('display and accessibility controls live in a hidden Preferences dialog, not the sidebar', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const sidebar = document.querySelector('.sidebar');
  const brightness = document.querySelector('#interface-brightness');
  assert.ok(brightness);
  assert.deepEqual([...brightness.options].map((option) => option.value), ['dark', 'brighter', 'high-contrast']);
  const dialog = document.querySelector('#preferences-dialog');

  assert.ok(document.querySelector('#preferences-button'));
  assert.equal(document.querySelector('#preferences-overlay').hidden, true);
  assert.equal(sidebar.querySelector('#terminal-theme'), null);
  assert.equal(sidebar.querySelector('#terminal-engine'), null);
  assert.equal(sidebar.querySelector('#font-size'), null);
  assert.equal(sidebar.querySelector('#screen-reader-mode'), null);
  assert.equal(sidebar.querySelector('#repeat-last-command-on-enter'), null);
  assert.ok(dialog.querySelector('#terminal-theme'));
  assert.equal(dialog.querySelector('#terminal-engine'), null);
  assert.match(dialog.textContent, /Terminal engine: xterm\.js/u);
  assert.ok(dialog.querySelector('#font-size'));
  assert.ok(dialog.querySelector('#ui-font'));
  const terminalFont = dialog.querySelector('#terminal-font');
  assert.ok(terminalFont);
  const terminalFontValues = [...terminalFont.options].map((option) => option.value);
  assert.ok(terminalFontValues.includes('fixedsys'));
  assert.ok(terminalFontValues.includes('maple'));
  assert.ok(terminalFontValues.includes('maple-nl'));
  assert.ok(terminalFontValues.includes('jetbrains'));
  assert.ok(terminalFontValues.includes('fira-code'));
  assert.ok(dialog.querySelector('#terminal-font-help'));
  const panelLabels = dialog.querySelector('#panel-label-mode');
  assert.ok(panelLabels);
  assert.deepEqual([...panelLabels.options].map((option) => option.value), ['full', 'compact']);
  const mapperLabels = dialog.querySelector('#mapper-room-label-mode');
  assert.ok(mapperLabels);
  assert.deepEqual([...mapperLabels.options].map((option) => option.value), ['status', 'number', 'name']);
  assert.ok(dialog.querySelector('#show-panel-session-vitals'));
  assert.ok(dialog.querySelector('#show-group-vitals'));
  assert.ok(dialog.querySelector('#main-vitals-mode'));
  assert.ok(dialog.querySelector('#group-vitals-mode'));
  assert.ok(dialog.querySelector('#vitals-number-size'));
  assert.ok(dialog.querySelector('#hide-self-in-group-vitals'));
  assert.ok(dialog.querySelector('#show-mapper-exits'));
  assert.ok(dialog.querySelector('#show-gps-navigator'));
  assert.ok(dialog.querySelector('#quick-command-form'));
  assert.ok(dialog.querySelector('#screen-reader-mode'));
  assert.ok(dialog.querySelector('#repeat-last-command-on-enter'));
  assert.ok(dialog.querySelector('#pipeline-debug-enabled'));
  const pipelineLimit = dialog.querySelector('#pipeline-debug-limit');
  assert.ok(pipelineLimit);
  assert.deepEqual([...pipelineLimit.options].map((option) => option.value), ['100', '200', '500']);
  assert.ok(document.querySelector('#pipeline-debug-section'));
  assert.ok(document.querySelector('#pipeline-debug-copy'));
  assert.ok(document.querySelector('#pipeline-debug-clear'));
  const commandPrefix = dialog.querySelector('#client-command-prefix');
  assert.ok(commandPrefix);
  assert.deepEqual([...commandPrefix.options].map((option) => option.value), ['#', '~', '^', '/', '`', "'"]);
  assert.equal(dialog.querySelector('#command-input-heading').textContent, 'Command Input');

  const output = document.querySelector('#output');
  const command = document.querySelector('#command');
  assert.ok(output.closest('.terminal-shell'));
  assert.ok(command.closest('.terminal-shell'));
});

test('Preferences categories expose one wide tab panel at a time', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const tablist = document.querySelector('.preferences-tablist');
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('#preferences-content > [role="tabpanel"]')];

  assert.equal(tablist.getAttribute('aria-orientation'), 'vertical');
  assert.deepEqual(tabs.map((tab) => tab.dataset.preferenceCategory), [
    'display', 'presets', 'command-input', 'keyboard', 'tintin',
    'workspace', 'quick-commands', 'pipeline-debug', 'audio', 'accessibility'
  ]);
  assert.equal(panels.length, 10);
  assert.deepEqual(panels.filter((panel) => !panel.hidden).map((panel) => panel.dataset.preferenceCategory), ['display']);
  for (const tab of tabs) {
    const panel = document.querySelector(`#${tab.getAttribute('aria-controls')}`);
    assert.ok(panel);
    assert.equal(panel.dataset.preferenceCategory, tab.dataset.preferenceCategory);
  }
});

test('category buttons and arrow keys switch panels with a single roving tab stop', async () => {
  const { dom } = createRenderer();
  const document = dom.window.document;
  document.querySelector('#preferences-button').click();
  await nextFrame();

  const workspaceTab = document.querySelector('#preference-tab-workspace');
  workspaceTab.click();
  assert.equal(workspaceTab.getAttribute('aria-selected'), 'true');
  assert.equal(workspaceTab.tabIndex, 0);
  assert.equal(document.activeElement, workspaceTab);
  assert.equal(document.querySelector('#preference-panel-workspace').hidden, false);
  assert.equal(document.querySelector('#preference-panel-display').hidden, true);

  workspaceTab.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowDown', bubbles: true, cancelable: true
  }));
  const quickTab = document.querySelector('#preference-tab-quick-commands');
  assert.equal(quickTab.getAttribute('aria-selected'), 'true');
  assert.equal(document.activeElement, quickTab);
  assert.equal(document.querySelector('#quick-command-preferences').hidden, false);
  assert.equal([...document.querySelectorAll('.preferences-tablist [role="tab"][tabindex="0"]')].length, 1);
});

test('the Preferences focus trap skips controls inside hidden categories', async () => {
  const { dom } = createRenderer();
  const document = dom.window.document;
  const overlay = document.querySelector('#preferences-overlay');
  document.querySelector('#preferences-button').click();
  await nextFrame();

  const lastDisplayControl = document.querySelector('#terminal-monochrome');
  lastDisplayControl.focus();
  overlay.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Tab', bubbles: true, cancelable: true
  }));
  assert.equal(document.activeElement, document.querySelector('#preferences-close'));
  assert.equal(document.querySelector('#client-command-prefix').closest('[hidden]')?.hidden, true);
});

test('Preferences CSS keeps descriptions readable and adapts to a single-column workspace', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(css, /width: min\(1080px, calc\(100vw - 32px\)\)/u);
  assert.match(css, /grid-template-columns: 232px minmax\(0, 1fr\)/u);
  assert.match(css, /\.preferences-content \{[\s\S]*?overflow: auto;/u);
  assert.match(css, /\.preference-help \{[\s\S]*?white-space: normal;[\s\S]*?overflow-wrap: anywhere;/u);
  assert.match(css, /@media \(max-width: 780px\)[\s\S]*?\.preferences-workspace \{ grid-template-columns: 1fr;/u);
  assert.match(css, /\.preference-section\[hidden\] \{ display: none !important; \}/u);
  assert.match(renderer, /matchMedia\('\(max-width: 780px\)'\)/u);
  assert.match(renderer, /aria-orientation', horizontal \? 'horizontal' : 'vertical'/u);
});

test('gear and Command-comma open Preferences, while Done and Escape restore focus', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  const button = document.querySelector('#preferences-button');
  const overlay = document.querySelector('#preferences-overlay');
  const displayTab = document.querySelector('#preference-tab-display');

  button.focus();
  button.click();
  await nextFrame();
  assert.equal(overlay.hidden, false);
  assert.equal(document.body.classList.contains('preferences-open'), true);
  assert.equal(document.querySelector('#app').inert, true);
  assert.equal(document.activeElement, displayTab);

  document.querySelector('#preferences-close').click();
  await nextFrame();
  assert.equal(overlay.hidden, true);
  assert.equal(document.querySelector('#app').inert, false);
  assert.equal(document.activeElement, button);

  document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: ',',
    metaKey: true,
    bubbles: true,
    cancelable: true
  }));
  await nextFrame();
  assert.equal(overlay.hidden, false);

  overlay.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true
  }));
  await nextFrame();
  assert.equal(overlay.hidden, true);

  handlers.menuPreferences();
  await nextFrame();
  assert.equal(overlay.hidden, false);

  document.querySelector('#preference-tab-accessibility').click();
  document.querySelector('#focus-command').click();
  await nextFrame();
  assert.equal(overlay.hidden, true);
  assert.equal(document.activeElement, document.querySelector('#command'));
});

test('Preferences wiring is available from the Electron menu without weakening isolation', () => {
  const mainSource = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  const preloadSource = fs.readFileSync(path.join(__dirname, '..', 'preload.js'), 'utf8');

  assert.match(mainSource, /label: 'Preferences…'/u);
  assert.match(mainSource, /accelerator: 'CmdOrCtrl\+,'/u);
  assert.match(mainSource, /menu:preferences/u);
  assert.match(mainSource, /menu:copy/u);
  assert.match(mainSource, /clipboard:write-text/u);
  assert.match(preloadSource, /writeClipboardText/u);
  assert.match(preloadSource, /onMenuCopy/u);
  assert.match(mainSource, /before-input-event/u);
  assert.match(mainSource, /NumpadAdd/u);
  assert.match(mainSource, /NumpadSubtract/u);
  assert.match(preloadSource, /onMenuPreferences/u);
  assert.match(preloadSource, /subscribe\('menu:preferences'/u);
  assert.match(preloadSource, /subscribe\('menu:copy'/u);
  assert.match(mainSource, /contextIsolation: true/u);
  assert.match(mainSource, /nodeIntegration: false/u);
  assert.match(mainSource, /sandbox: true/u);
});
