'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')
    .replace(/\r\n?/gu, '\n');
}

test('command bar sends with Enter and no longer exposes a Send button', () => {
  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');

  assert.doesNotMatch(html, /id="send"/u);
  assert.doesNotMatch(renderer, /sendButton|\$\('#send'\)/u);
  assert.match(renderer, /commandInput\.addEventListener\('keydown',[\s\S]*event\.key === 'Enter'/u);
  assert.match(renderer, /void sendCommand\(command\)/u);
});

test('bright yellow command focus is an explicit unchecked preference', () => {
  const html = source('renderer/index.html');
  const css = source('renderer/styles.css');

  assert.match(html, /id="bright-command-input-focus" type="checkbox"/u);
  assert.doesNotMatch(html, /id="bright-command-input-focus"[^>]*checked/u);
  assert.match(html, /Use bright yellow focus outline on command line/u);
  assert.match(css, /#command:focus-visible[\s\S]*var\(--accent-bright\)/u);
  assert.match(css, /body\[data-bright-command-input-focus="true"\] #command:focus-visible[\s\S]*#ffd166/u);
});

test('command focus preference is normalized with a safe off default', () => {
  const settings = source('src/settings-store.js');

  assert.match(settings, /brightCommandInputFocus: false/u);
  assert.match(settings, /brightCommandInputFocus: booleanValue\([\s\S]*inputPreferences\.brightCommandInputFocus[\s\S]*DEFAULT_SETTINGS\.input\.brightCommandInputFocus/u);
  assert.match(settings, /brightCommandInputFocus: legacy\.brightCommandInputFocus/u);
});

test('renderer persists and reapplies the command focus preference', () => {
  const renderer = source('renderer/renderer.js');

  assert.match(renderer, /brightCommandInputFocus: \$\('#bright-command-input-focus'\)\.checked/u);
  assert.match(renderer, /nukefire\.brightCommandInputFocus/u);
  assert.match(renderer, /document\.body\.dataset\.brightCommandInputFocus/u);
  assert.match(renderer, /schedulePersistentSettingsSave\(\)/u);
});
