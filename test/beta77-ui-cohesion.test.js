'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const communications = require('../src/communications');
const promptDisplay = require('../src/prompt-display');
const settingsStore = require('../src/settings-store');

const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');

test('Beta.78 group movement never becomes Group Say communication in horizontal or vertical exits', () => {
  assert.equal(communications.classifyLine('[Group] Lucifer and Morningstar arrive behind Satan from The West.'), null);
  assert.equal(communications.classifyLine('[Group] Lucifer and Morningstar follow Satan west.'), null);

  // Cover vertical labels without assuming that every server path spells them
  // with the literal words "up" and "down".
  assert.equal(communications.classifyLine('[Group] Lucifer and Morningstar arrive behind Satan from Above.'), null);
  assert.equal(communications.classifyLine('[Group] Lucifer and Morningstar arrive behind Satan from Below.'), null);
  assert.equal(communications.classifyLine('[Group] Lucifer and Morningstar follow Satan up.'), null);
  assert.equal(communications.classifyLine('[Group] Lucifer and Morningstar follow Satan down.'), null);

  // Normal Group Say must remain classified, even when its text mentions the
  // same movement words.
  assert.equal(communications.classifyLine("Rance tells the group, 'We arrive behind Satan from Below.'")?.channel, 'group');
  assert.equal(communications.classifyLine('[Group] Rance: We arrive behind Satan from Below.')?.channel, 'group');
  assert.equal(communications.classifyLine('[Group] Rance: North.')?.channel, 'group');
});

test('Beta.77 Session Vitals includes authoritative remort data without inventing it', () => {
  const active = { id: 'main', host: 'tdome.nukefire.org', port: 4000 };
  const base = {
    id: 'alt', name: 'Lucifer', host: 'tdome.nukefire.org', port: 4000,
    status: { state: 'connected' },
    vitals: { hp: 100, maxHp: 200, mana: 90, move: 80 }
  };
  let rows = promptDisplay.companionPromptEntries(active, {
    alt: { ...base, gmcp: { char: { status: { remorts: 1425 } } } }
  }, ['alt']);
  assert.equal(rows[0].remorts, 1425);
  assert.match(rows[0].plainText, /R1425/);

  rows = promptDisplay.companionPromptEntries(active, {
    alt: { ...base, gmcp: { char: { status: {} } } }
  }, ['alt']);
  assert.equal(rows[0].remorts, null);
  assert.match(rows[0].plainText, /R—/);
});

test('Beta.77 settings bound and persist UI cohesion controls', () => {
  const defaults = settingsStore.normalizeSettings({});
  assert.equal(defaults.input.echoSentCommands, false);
  assert.equal(defaults.display.communicationsFontSize, 12);
  // Beta.78 preserves the Beta.77 Terminal Wall experience for existing/default
  // users while allowing Classic/Persistent or fully custom chrome afterward.
  assert.equal(defaults.display.panelChromeAutoHide, true);
  assert.equal(defaults.display.popoutChromeAutoHide, true);
  assert.equal(defaults.display.framelessPopouts, true);
  assert.equal(defaults.display.decorativeHud, false);

  const changed = settingsStore.normalizeSettings({
    input: { echoSentCommands: true },
    display: { communicationsFontSize: 99, panelChromeAutoHide: true }
  });
  assert.equal(changed.input.echoSentCommands, true);
  assert.equal(changed.display.communicationsFontSize, 24);
  assert.equal(changed.display.panelChromeAutoHide, true);
});

test('Beta.77 popouts hold native selects and expose chrome on demand', () => {
  const popout = source('renderer/popout.js');
  const css = source('renderer/popout.css');
  assert.match(popout, /mirrorSelectOpen/u);
  assert.match(popout, /pendingGenericSnapshot/u);
  assert.match(popout, /select\[data-popout-control\]/u);
  assert.match(popout, /releaseMirrorSelectHold/u);
  assert.match(css, /\.popout-header:hover/u);
  assert.match(css, /translateY\(calc\(-100% \+ 6px\)\)/u);
});

test('Beta.77 renderer centralizes sent-command echo and final terminal geometry fitting', () => {
  const renderer = source('renderer/renderer.js');
  const html = source('renderer/index.html');
  const css = source('renderer/styles.css');

  assert.match(html, /id="echo-sent-commands"/u);
  assert.match(html, /id="communications-font-size"/u);
  assert.match(html, /id="panel-chrome-auto-hide"/u);
  assert.match(renderer, /function echoSentCommandToOutput/u);
  assert.match(renderer, /echoSentCommandToOutput\(record, command\)/u);
  assert.match(renderer, /terminalSettledFitTimer/u);
  assert.match(renderer, /document\.querySelector\('\.input-bar'\)/u);
  assert.match(renderer, /document\.querySelector\('main\.workspace-grid'\)/u);
  assert.match(css, /--communications-font-size:\s*12px/u);
  assert.match(css, /\.loot-history-toolbar button\s*\{[^}]*padding:5px 8px;[^}]*font-size:11px;/u);
  assert.match(css, /data-panel-chrome-auto-hide="true"/u);
  assert.match(css, /\.xterm-output\s*\{[^}]*overflow:\s*hidden;/su);
});
