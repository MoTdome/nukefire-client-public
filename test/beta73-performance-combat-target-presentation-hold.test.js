'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

test('Beta.73 kill bursts hold only transient target presentation clears', () => {
  assert.match(renderer, /const COMBAT_TARGET_PRESENTATION_HOLD_MS = 50;/u);
  assert.match(renderer, /function beginCombatTargetPresentationHold\(\)/u);
  assert.match(renderer, /function deferCombatTargetPresentationClear\(\)/u);
  assert.match(
    renderer,
    /packageName === 'NukeFire\.Combat' && Number\(message\?\.body\?\.out\?\.kills\) > 0[\s\S]*beginCombatTargetPresentationHold\(\)/u
  );
});

test('Beta.73 protects opponent, group-target, and Mob Inspector empty transitions during a kill handoff', () => {
  assert.match(renderer, /!opponent\?\.name && deferCombatTargetPresentationClear\(\)/u);
  assert.match(renderer, /group\.enemies\.length === 0 && deferCombatTargetPresentationClear\(\)/u);
  assert.match(
    renderer,
    /pendingCombatKillRefresh === true && deferCombatTargetPresentationClear\(\)/u
  );
  assert.match(renderer, /opponentVitalsRenderSignature = '';/u);
  assert.match(renderer, /groupVitalsRenderSignature = '';/u);
  assert.match(renderer, /syncMobInspectorCombatLifecycle\(\);/u);
});

test('Beta.73 keeps authoritative combat state immediate and delays only presentation clearing', () => {
  const apply = renderer.match(/function applyGmcpState\(snapshot, options = \{\}\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(apply, /renderOpponentVitals\(\);[\s\S]*syncMobInspectorCombatLifecycle\(\);/u);
  assert.doesNotMatch(apply, /setTimeout|COMBAT_TARGET_PRESENTATION_HOLD_MS/u);
});
