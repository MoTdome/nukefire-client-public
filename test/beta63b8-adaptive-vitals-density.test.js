'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');

// This pass is intentionally presentation-first: GMCP normalization and values
// stay in the existing combat-vitals module while the pane spends less space on
// inactive sections and repetitive chrome.

test('core HMV rows share one compact line with their meter and value', () => {
  assert.match(css, /\.vital \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: auto minmax\(48px, 1fr\) minmax\(7\.5ch, auto\);/u);
  assert.match(css, /\.vital > div:first-child \{ display: contents; \}/u);
  assert.match(css, /\.vital > \.meter \{[\s\S]*?grid-column: 2;[\s\S]*?grid-row: 1;/u);
  assert.match(css, /\.meter \{ height: 6px;/u);
});

test('inactive opponent space disappears and returns automatically with a target', () => {
  assert.match(renderer, /const section = \$\('\.opponent-vitals-section'\);/u);
  assert.match(renderer, /if \(!opponent\?\.name\) \{[\s\S]*?if \(section && section\.hidden !== true\) section\.hidden = true;/u);
  assert.match(renderer, /if \(section && section\.hidden !== false\) section\.hidden = false;[\s\S]*?if \(empty\.hidden !== true\) empty\.hidden = true;[\s\S]*?if \(card\.hidden !== false\) card\.hidden = false;/u);
  assert.match(renderer, /if \(opponentVitalsRenderSignature === signature\) return;/u);
});

test('solo or self-only group state consumes no dedicated group block', () => {
  assert.match(renderer, /const visibleMembers = groupMembersForVitalsDisplay\(group\);[\s\S]*?groupSection\.hidden = visibleMembers\.length === 0;/u);
  assert.match(renderer, /if \(!state\.displayComponents\.groupVitals\) \{[\s\S]*?groupSection\) groupSection\.hidden = true;[\s\S]*?targetsSection\.hidden = true;/u);
});

test('active combat and companion rows stay dense rather than card-spaced', () => {
  assert.match(css, /\.combat-vitals-list \{ display: grid; gap: 4px; \}/u);
  assert.match(css, /\.combat-vital-card,[\s\S]*?\.combat-vital-row \{[\s\S]*?padding: 4px 6px;/u);
  assert.match(css, /\.session-vitals-list \{[\s\S]*?gap: 4px;[\s\S]*?max-block-size: min\(46vh, 520px\);/u);
  assert.match(css, /\.session-vital-row \{[\s\S]*?gap: 3px 9px;[\s\S]*?padding: 4px 6px;/u);
});
