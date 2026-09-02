'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
const controls = fs.readFileSync(path.join(__dirname, '..', 'src', 'semantic-controls.js'), 'utf8');

test('Reader entry captures one reversible client setup and exposes a bounded exit action', () => {
  assert.match(controls, /'reader\.session\.begin'/u);
  assert.match(controls, /'reader\.exit\.restore'/u);
  assert.match(renderer, /const PRE_READER_SETUP_KEY = 'nukefire\.preReaderSetup\.v1'/u);
  assert.match(renderer, /if \(readPreReaderSetup\(\)\) return false;/u);
  assert.match(renderer, /function restorePreReaderSetup\(\)/u);
  assert.match(renderer, /localStorage\.removeItem\(PRE_READER_SETUP_KEY\)/u);
});

test('Reader presets and MUSH settings capture before mutation and advertise the exit', () => {
  const mushCapture = renderer.indexOf('capturePreReaderSetup();', renderer.indexOf('function applyMushSettingsPreset'));
  const mushMutation = renderer.indexOf('installMushSettingsPreset', mushCapture);
  const presetCapture = renderer.indexOf('capturePreReaderSetup();', renderer.indexOf('function applyReaderSetupPreset'));
  const presetMutation = renderer.indexOf('setReaderWorkspaceEnabled', presetCapture);
  assert.ok(mushCapture >= 0 && mushCapture < mushMutation);
  assert.ok(presetCapture >= 0 && presetCapture < presetMutation);
  assert.match(renderer, /Use CR OFF or SR OFF to restore your previous client setup\./u);
});
