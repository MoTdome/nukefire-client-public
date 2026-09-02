'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8').replace(/\r\n?/gu, '\n');

test('TinTin startup checkbox keeps normal compact checkbox layout', () => {
  const css = source('renderer/styles.css');
  assert.match(css, /\.checkbox \{[^}]*display: flex;[^}]*align-items: center;/u);
  assert.match(css, /\.tintin-import-preferences > label:not\(\.checkbox\),\n\.tintin-import-options > label,\n\.tintin-import-destination label \{/u);
  assert.doesNotMatch(css, /\.tintin-import-preferences > label,\n\.tintin-import-options > label \{/u);
});

test('Affects stay packed at the top when the pane is stretched', () => {
  const css = source('renderer/styles.css');
  assert.match(css, /\.affects-list \{[\s\S]*?grid-auto-rows: max-content;[\s\S]*?align-content: start;[\s\S]*?gap: 0\.35rem;/u);
});

test('panel options yield pane space and reveal themselves on hover or focus', () => {
  const css = source('renderer/styles.css');
  assert.match(css, /\.panel \{[\s\S]*?padding: 9px 10px;[\s\S]*?margin-bottom: 8px;/u);
  assert.match(css, /\.panel-titlebar \{[\s\S]*?min-height: 20px;[\s\S]*?margin: -1px 0 7px;/u);
  assert.match(css, /\.panel-menu-button \{[\s\S]*?position: absolute;[\s\S]*?opacity: 0\.16;/u);
  assert.match(css, /\.panel-titlebar:hover \.panel-menu-button,[\s\S]*?\.panel-titlebar:focus-within \.panel-menu-button,[\s\S]*?opacity: 1;/u);
  assert.match(css, /@media \(hover: none\) \{\n  \.panel-menu-button \{ opacity: 1; \}\n\}/u);
});

test('New Session has one direct form with a required name and guarded duplicate check', () => {
  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');
  assert.match(html, /id="session-add"[^>]*aria-controls="session-create-drawer"/u);
  assert.doesNotMatch(html, /id="session-create-tab"/u);
  assert.match(html, /id="session-new-name"[^>]*required/u);
  assert.match(html, /id="session-create-submit"[^>]*disabled>Create Session<\/button>/u);
  assert.match(renderer, /function sessionDisplayNameInUse\(value\)/u);
  assert.match(renderer, /normalize\('NFKC'\)\.trim\(\)\.toLocaleLowerCase\(\)/u);
  assert.match(renderer, /setCustomValidity\(duplicate \? 'That session name is already in use\.' : ''\)/u);
  assert.match(renderer, /if \(!updateSessionCreateValidity\(\)\) \{/u);
});
