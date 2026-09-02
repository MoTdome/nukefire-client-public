'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

test('Beta.73 coalesces kill-triggered target refreshes at the microtask boundary', () => {
  assert.match(renderer, /let combatKillTargetRefreshQueued = false;/u);
  assert.match(renderer, /function scheduleCombatKillTargetRefresh\(\)/u);
  assert.match(renderer, /queueMicrotask\(\(\) => \{/u);
  assert.match(renderer, /if \(!mobInspectorCurrentOpponent\(\)\?\.name\) return;/u);
});

test('Beta.73 kill packet path no longer sends duplicate target refreshes synchronously', () => {
  const apply = renderer.match(/function applyGmcp\(message\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(
    apply,
    /pendingCombatKillRefresh = true;[\s\S]*scheduleCombatKillTargetRefresh\(\);/u
  );
  assert.doesNotMatch(
    apply,
    /pendingCombatKillRefresh = true;[\s\S]{0,300}void requestMobInspector\(/u
  );
});

test('Beta.73 preserves the existing delayed kill recovery path', () => {
  assert.match(renderer, /MOB_INSPECTOR_KILL_FOLLOWUP_REFRESH_MS = 500;/u);
  assert.match(
    renderer,
    /now - lastKillRefresh >= MOB_INSPECTOR_KILL_FOLLOWUP_REFRESH_MS[\s\S]*requestMobInspector\(\{ announceRequest: false \}\)[\s\S]*requestMobInspectorTargetAffects\(\{ force: true \}\)/u
  );
});
