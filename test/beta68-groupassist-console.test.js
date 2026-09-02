'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');

test('NukeFire Console exposes a labeled five-action GroupAssist editor', () => {
  const html = read('renderer/index.html');
  assert.match(html, /id="groupassist-editor"[^>]*aria-labelledby="groupassist-editor-heading"/u);
  assert.match(html, /id="groupassist-editor-target"[^>]*aria-describedby="groupassist-editor-target-help"/u);
  assert.match(html, /id="groupassist-editor-actions"/u);
  assert.match(html, /id="groupassist-editor-save"/u);
  assert.match(html, /id="groupassist-editor-clear"/u);
  assert.match(html, /id="groupassist-editor-status"[^>]*aria-live="off"/u);
});

test('GroupAssist editor uses only server-provided IDs and preserves command drafts', () => {
  const renderer = read('renderer/renderer.js');
  const start = renderer.indexOf('function renderGroupAssistEditor');
  const end = renderer.indexOf('\nasync function refreshNukeFireControls', start);
  const body = renderer.slice(start, end);
  assert.match(body, /snapshot\.groupassist\?\.available/u);
  assert.match(body, /for \(let index = 0; index < 5; index\+\+\)/u);
  assert.match(body, /groupassist set \$\{target\} \$\{actions\.join\(' '\)\}/u);
  assert.match(body, /groupassist clear \$\{target\}/u);
  assert.match(body, /\{ preserveInput: true \}/u);
  assert.match(body, /\^\(\?:self\|default\|\[A-Za-z\]/u);
});

test('GroupAssist GMCP refresh updates the editor without an automatic announcement', () => {
  const renderer = read('renderer/renderer.js');
  const start = renderer.indexOf('function renderGroupAssistEditor');
  const end = renderer.indexOf('\nfunction validGroupAssistTarget', start);
  const renderBody = renderer.slice(start, end);
  assert.match(renderer, /packageName === 'NukeFire\.Controls'[\s\S]*?renderGroupAssistEditor\(\)/u);
  assert.doesNotMatch(renderBody, /announce\(/u);
});
