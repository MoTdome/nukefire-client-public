'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'renderer', 'styles.css'), 'utf8');

test('beta.20 exposes authoritative refresh and scoped map clearing controls', () => {
  for (const id of ['mapper-refresh', 'mapper-clear-scope', 'mapper-clear', 'mapper-zoom-out', 'mapper-center', 'mapper-zoom-in']) {
    assert.match(html, new RegExp(`id="${id}"`, 'u'));
  }
  assert.match(renderer, /sendActiveGmcp\('Room\.Info'\)/u);
  assert.match(renderer, /sendActiveGmcp\('Char\.GPS'\)/u);
  assert.match(renderer, /sendActiveGmcp\('NukeFire\.Map\.Local'\)/u);
  assert.match(renderer, /sendMapperCommand\('map memory clear'\)/u);
});

test('beta.20 map presents BIGMAP glyphs, terrain state, and link safeguards', () => {
  assert.match(renderer, /const glyph = room\.id === current\?\.id \? '@' : liveRoom\?\.destination \? 'X' : liveRoom\?\.route \? '\*' : ''/u);
  assert.match(styles, /\.mapper-edge\.closed/u);
  assert.match(styles, /\.mapper-edge\.locked/u);
  assert.match(styles, /\.mapper-edge\.one-way/u);
  assert.doesNotMatch(html, /class="mapper-legend"/u);
  assert.match(html, /id="mapper-status" class="sr-only"/u);
});

test('beta.20 retains conservative route internals while the map UI is read-only', () => {
  assert.match(renderer, /!route\.roomConfirmed \|\| !route\.mapConfirmed/u);
  assert.match(renderer, /Room\.Info reported room/u);
  assert.match(renderer, /BIGMAP centered on room/u);
  assert.match(renderer, /did not confirm room.*within 10 seconds/u);
  assert.match(renderer, /manual command was entered/u);
  assert.match(renderer, /active session changed/u);
  assert.match(renderer, /connection closed/u);
});

test('beta.20 integrates named GPS destinations independently of room clicking', () => {
  assert.match(renderer, /mapperGpsDestinationForRoom/u);
  assert.match(renderer, /gps set \$\{destination\.index\}/u);
  assert.match(renderer, /not a named GPS catalog destination/u);
});
