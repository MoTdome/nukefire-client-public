'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer/renderer.js'), 'utf8');
const popout = fs.readFileSync(path.join(root, 'renderer/popout.js'), 'utf8');

test('Protocol mirror mutations coalesce behind a bounded quarter-second timer', () => {
  assert.match(renderer, /panel\.id !== 'protocol'/);
  assert.match(renderer, /if \(entry\.timer !== null\) return;/);
  assert.match(renderer, /}, 250\);/);
  assert.match(renderer, /if \(entry\.timer !== null\) clearTimeout\(entry\.timer\)/);
});

test('detached generic and Communications windows report their measured render work', () => {
  assert.equal((popout.match(/action: 'performance'/g) || []).length, 2);
  assert.match(popout, /renderMs: performance\.now\(\) - renderStartedAt/);
  assert.match(renderer, /payload\.action === 'performance'/);
});

