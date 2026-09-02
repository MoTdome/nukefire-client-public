'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'renderer/index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'renderer/renderer.js'), 'utf8');
const monitor = fs.readFileSync(path.join(root, 'src/long-session-monitor.js'), 'utf8');

test('Protocol pane exposes an opt-in Long-Session Monitor and report controls', () => {
  for (const id of ['long-session-start', 'long-session-stop', 'long-session-reset', 'long-session-copy']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(html, /id="long-session-start"[^>]*disabled/);
  assert.match(renderer, /addEventListener\('click', startLongSessionMonitor\)/);
  assert.match(renderer, /writeClipboardText\?\.\(text\)/);
  assert.match(renderer, /renderLongSessionMonitor\(\);\n\s*publishAllPanelPopoutStates/);
});

test('monitor measures the incoming, terminal and pop-out rendering paths', () => {
  assert.match(renderer, /noteIncoming\(String\(text \|\| ''\)\.length, performance\.now\(\) - monitorStartedAt\)/);
  assert.match(renderer, /noteTerminalFlush\(performance\.now\(\) - monitorStartedAt\)/);
  assert.match(renderer, /notePopoutPublish\(panelId, approximateBytes, performance\.now\(\) - monitorStartedAt\)/);
  assert.match(renderer, /terminalPendingCharacters/);
  assert.match(renderer, /xtermPendingOperations/);
  assert.match(renderer, /communicationDomArticles/);
  assert.match(renderer, /notePopoutRender\?\.\(panelId, payload\.renderMs\)/);
  assert.match(monitor, /notePopoutRender\(panelId, durationMs = 0\)/);
});

test('monitor has fixed twelve-hour retention and bounded copied reports', () => {
  assert.match(monitor, /DEFAULT_INTERVAL_MS = 10_000/);
  assert.match(monitor, /DEFAULT_MAX_SAMPLES = 4320/);
  assert.match(monitor, /REPORT_SAMPLE_LIMIT = 120/);
  assert.match(monitor, /noteIncoming\([^)]*\) \{\n\s*if \(!this\.active\) return;/);
  assert.doesNotMatch(renderer, /localStorage[^\n]*long.session/iu);
});
