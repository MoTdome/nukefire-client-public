'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'renderer', 'styles.css'), 'utf8');

test('ships an accessible Knowledge dialog and visible launcher', () => {
  assert.match(html, /id="knowledge-button"/u);
  assert.match(html, /id="knowledge-dialog"[^>]+role="dialog"/u);
  assert.match(html, /aria-modal="true"/u);
  assert.match(html, /id="knowledge-results"[^>]+role="listbox"/u);
  assert.match(html, /src="\.\.\/src\/knowledge-store\.js"/u);
  assert.match(html, /data-knowledge-domain="item"/u);
  assert.match(html, /data-knowledge-domain="command"/u);
  assert.match(html, /data-knowledge-domain="skill"/u);
  assert.match(html, /data-knowledge-domain="zone"/u);
  assert.match(html, /id="knowledge-load-more"/u);
});

test('wires Command-K, live GMCP queries, and stale-safe packet handling', () => {
  assert.match(renderer, /key === 'k'/u);
  assert.match(renderer, /NukeFire\.Knowledge\.Query/u);
  assert.match(renderer, /NukeFire\.Knowledge\.Get/u);
  assert.match(renderer, /processKnowledgePacket/u);
  assert.match(styles, /body\.knowledge-open #app/u);
  assert.match(renderer, /knowledgeDomainValues/u);
  assert.match(renderer, /entry\.terminalCommand/u);
  assert.match(styles, /knowledge-fields/u);
  assert.match(renderer, /requestKnowledgeMore/u);
  assert.match(renderer, /Showing .* of .* matching/u);
});
