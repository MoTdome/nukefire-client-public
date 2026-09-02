'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')
    .replace(/\r\n?/gu, '\n');
}

test('compact connection bar keeps everyday actions available', () => {
  const css = source('renderer/styles.css');

  assert.match(css, /#app\.connection-bar-collapsed #connect\s*\{[^}]*display:\s*none;/u);
  assert.doesNotMatch(
    css,
    /#app\.connection-bar-collapsed \.connection-actions\s*\{[^}]*display:\s*none;/u
  );
  assert.match(css, /#app\.connection-bar-collapsed \.connection-actions\s*\{[^}]*align-items:\s*center;[^}]*padding-bottom:\s*0;/u);
});

test('collapsed disclosure is named Connection while expanded mode stays explicit', () => {
  const html = source('renderer/index.html');
  const renderer = source('renderer/renderer.js');

  assert.match(html, /id="connection-bar-toggle"[\s\S]*aria-label="Hide connection settings"/u);
  assert.match(renderer, /const label = next \? 'Show connection settings' : 'Hide connection settings'/u);
  assert.match(renderer, /connectionBarToggle\.textContent = next \? 'Connection' : 'Hide'/u);
  assert.match(renderer, /setAttribute\('aria-expanded', String\(!next\)\)/u);
});

test('Return in Host or Port uses the existing connect path', () => {
  const renderer = source('renderer/renderer.js');

  assert.match(renderer, /function handleConnectionFieldKeydown\(event\)[\s\S]*event\.key !== 'Enter'[\s\S]*event\.preventDefault\(\)[\s\S]*void connect\(\)/u);
  assert.match(renderer, /hostInput\.addEventListener\('keydown', handleConnectionFieldKeydown\)/u);
  assert.match(renderer, /portInput\.addEventListener\('keydown', handleConnectionFieldKeydown\)/u);
});

test('connection validation keeps mistakes visible and focuses the field to fix', () => {
  const renderer = source('renderer/renderer.js');

  assert.match(renderer, /function focusInvalidConnectionField\(input, message\)[\s\S]*setConnectionBarCollapsed\(false\)[\s\S]*input\?\.focus[\s\S]*input\?\.select/u);
  assert.match(renderer, /if \(!host\)[\s\S]*focusInvalidConnectionField\(hostInput, 'Enter a host name before connecting\.'\)/u);
  assert.match(renderer, /\^\\d\{1,5\}\$[\s\S]*port < 1 \|\| port > 65535/u);
  assert.match(renderer, /focusInvalidConnectionField\(portInput, 'Enter a server port from 1 to 65535\.'\)/u);
});

test('failed or closed connections always reveal connection settings', () => {
  const renderer = source('renderer/renderer.js');

  assert.match(renderer, /current === 'disconnected' \|\| current === 'error'[\s\S]*setConnectionBarCollapsed\(false\)/u);
  assert.match(renderer, /catch \(error\) \{[\s\S]*setConnectionBarCollapsed\(false\);[\s\S]*appendSystemMessage/u);
});
