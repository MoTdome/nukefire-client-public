'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const vitals = require(path.join(ROOT, 'src', 'combat-vitals.js'));
const renderer = fs.readFileSync(path.join(ROOT, 'renderer', 'renderer.js'), 'utf8');
const index = fs.readFileSync(path.join(ROOT, 'renderer', 'index.html'), 'utf8');
const settings = fs.readFileSync(path.join(ROOT, 'src', 'settings-store.js'), 'utf8');

test('spoken vital modes preserve legacy percent default and add explicit detailed/raw forms', () => {
  assert.equal(vitals.formatVitalSpeech('Health', 421155, 584220), 'Health 72 percent.');
  assert.equal(
    vitals.formatVitalSpeech('Health', 421155, 584220, { mode: 'percent-values' }),
    'Health 72 percent, 421,155 of 584,220.'
  );
  assert.equal(
    vitals.formatVitalSpeech('Health', 421155, 584220, { mode: 'values' }),
    'Health 421,155 of 584,220.'
  );
  assert.equal(
    vitals.formatVitalSpeech('Health', 421155, 584220, { mode: 'percent' }),
    'Health 72 percent.'
  );
  assert.equal(vitals.normalizeVitalSpeechMode('VALUES'), 'values');
  assert.equal(vitals.normalizeVitalSpeechMode('bogus'), 'percent-values');
});

test('F5/local vital actions use the selected GMCP speech format rather than a server command', () => {
  assert.match(renderer, /function vitalSpeechText\(label, current, maximum\)/u);
  assert.match(renderer, /mode: state\.accessibility\.vitalSpeechMode/u);
  assert.match(renderer, /function readVitals\(\) \{\s*announce\(vitalsSummary\(\), \{ force: true \}\);/u);
  assert.match(renderer, /id: 'read-health'.*chosen vital speech format/u);
  assert.match(renderer, /id: 'read-mana'.*chosen vital speech format/u);
  assert.match(renderer, /id: 'read-movement'.*chosen vital speech format/u);
});

test('instant vital speech preference is discoverable, persistent, and defaults to percent plus values', () => {
  assert.match(index, /id="instant-vitals-heading">Instant vital speech</u);
  assert.match(index, /id="vital-speech-mode"/u);
  assert.match(index, /live GMCP cache locally/u);
  assert.match(index, /do not enter the server command queue/u);
  assert.match(settings, /vitalSpeechMode: 'percent-values'/u);
  assert.match(settings, /vitalSpeechMode: normalizeVitalSpeechMode/u);
  assert.match(renderer, /localStorage\.setItem\('nukefire\.vitalSpeechMode'/u);
});

test('active-session communication cue hotfix remains intact beneath the vitals pass', () => {
  assert.match(renderer, /state\.communications\.messages\.push\(message\);\s*appendReaderHistoryCommunication\(activeSessionRecord\(\), message\);\s*playCommunicationAudioCue\(activeSessionRecord\(\), message\);/u);
});
