'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

test('NukeFire visual identity uses a local accessible wordmark and keeps decoration outside terminal output', () => {
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'renderer', 'styles.css'), 'utf8');
  const logoPath = path.join(root, 'renderer', 'assets', 'nukefire-wordmark.webp');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const brand = document.querySelector('.brand[aria-label="NukeFire Client"]');
  const logo = document.querySelector('.brand-logo');
  const heading = brand?.querySelector('h1.sr-only');

  assert.ok(brand);
  assert.equal(logo?.getAttribute('src'), 'assets/nukefire-wordmark.webp');
  assert.equal(logo?.getAttribute('alt'), '');
  assert.equal(heading?.textContent.trim(), 'NukeFire Client');
  assert.ok(fs.statSync(logoPath).size > 0);
  assert.ok(fs.statSync(logoPath).size < 100_000);

  assert.match(css, /#app::before/u);
  assert.match(css, /body\.screen-reader-mode #app::before/u);
  assert.match(css, /\.panel::before/u);
  assert.match(css, /\.xterm-output\s*\{[^}]*background:\s*var\(--terminal-background\)/su);
  assert.doesNotMatch(css, /\.xterm-output\s*\{[^}]*url\(/su);
  assert.equal(document.querySelectorAll('#terminal-output-host > #output').length, 1);
  assert.equal(document.querySelector('#output').classList.contains('xterm-output'), true);
});
