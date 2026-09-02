'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'renderer', 'styles.css'), 'utf8');

test('beta.20 mapper is a centered read-only display', () => {
  assert.doesNotMatch(html, /id="mapper-run-here"/u);
  assert.doesNotMatch(html, /id="mapper-stop-route"/u);
  assert.doesNotMatch(html, /id="mapper-follow-player"/u);
  assert.match(html, /read-only room map/u);
  assert.match(styles, /\.mapper-room-node \{ cursor: default; pointer-events: none; \}/u);
  assert.doesNotMatch(renderer, /\$\('#mapper-rooms'\)\?\.addEventListener\('click'/u);
  assert.doesNotMatch(renderer, /\$\('#mapper-rooms'\)\?\.addEventListener\('dblclick'/u);
  assert.match(renderer, /centered on player/u);
});
