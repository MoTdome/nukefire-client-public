'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ReaderTutorial, TUTORIAL_STEPS } = require('../src/reader-onboarding');
const { CONTROL_REQUEST_ACTIONS, normalizeControlRequest } = require('../src/semantic-controls');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');

test('Reader tutorial is short, deterministic, and action driven', () => {
  assert.equal(TUTORIAL_STEPS.length, 4);
  const tutorial = new ReaderTutorial();
  assert.equal(tutorial.start({ mode: 'live' }).expectedAction, 'history-latest');
  assert.equal(tutorial.accept('history-previous').matched, false);
  assert.equal(tutorial.accept('history-latest').step.expectedAction, 'category-next');
  assert.equal(tutorial.accept('category-next').step.expectedAction, 'history-previous');
  assert.equal(tutorial.accept('history-previous').step.expectedAction, 'last-tell');
  const result = tutorial.accept('last-tell');
  assert.equal(result.completed, true);
  assert.equal(tutorial.status().active, false);
  assert.equal(tutorial.status().completed, true);
});

test('Reader tutorial supports replay, manual navigation, and safe stop', () => {
  const tutorial = new ReaderTutorial();
  tutorial.start();
  assert.equal(tutorial.next().id, 'category');
  assert.equal(tutorial.back().id, 'latest');
  assert.equal(tutorial.repeat().id, 'latest');
  assert.match(tutorial.stop().text, /tutorial stopped/iu);
  assert.equal(tutorial.status().active, false);
});

test('first launch exposes Reader Setup before connection without forcing it', () => {
  assert.match(index, /id="reader-setup-button"[^>]*>Reader Setup</u);
  assert.match(index, /id="reader-setup-dialog"[^>]*role="dialog"[^>]*aria-modal="true"/u);
  assert.match(index, /id="reader-setup-native"[^>]*>Use My Screen Reader</u);
  assert.match(index, /id="reader-setup-live"[^>]*>Use NukeFire Voice</u);
  assert.match(index, /id="reader-setup-tutorial"[^>]*checked/u);
  assert.ok(index.indexOf('../src/reader-onboarding.js') > 0);
});

test('Reader Setup preserves existing customized Reader preset bindings', () => {
  const start = renderer.indexOf('function ensureReaderAccessibilityBindingsQuietly');
  const end = renderer.indexOf('function readerTutorialSpeak', start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.match(block, /some\(\(record\) => record\.preset === hotkeyPresetId\)/u);
  assert.match(block, /installReaderHotkeyPreset/u);
  assert.match(block, /installReaderLineRecallPreset/u);
});

test('first-run Reader choices use existing safe Reader presets and keep safety alerts enabled', () => {
  assert.match(renderer, /applyFirstRunReaderChoice\(presetId\)[\s\S]*?ensureReaderAccessibilityBindingsQuietly\(\)[\s\S]*?setReaderSafetyAlertsEnabled\(true/u);
  assert.match(renderer, /readerSetupNativeButton\?\.addEventListener[\s\S]*?native-reader/u);
  assert.match(renderer, /readerSetupLiveButton\?\.addEventListener[\s\S]*?reader-live-voice/u);
});

test('tutorial learns from real Reader actions while leaving the command line workflow intact', () => {
  assert.match(renderer, /function readerHistoryLatest\(\)[\s\S]*?advanceReaderTutorialFor\('history-latest'\)/u);
  assert.match(renderer, /function readerHistoryNextCategory\(\)[\s\S]*?advanceReaderTutorialFor\('category-next'\)/u);
  assert.match(renderer, /function readerHistoryPrevious\(\)[\s\S]*?advanceReaderTutorialFor\('history-previous'\)/u);
  assert.match(renderer, /function recallLastTell\(\)[\s\S]*?advanceReaderTutorialFor\('last-tell'\)/u);
  assert.match(renderer, /setReaderWorkspaceEnabled\(true, \{ announceChange: false, focus: true \}\)/u);
});

test('reader discoverability controls remain a hardcoded GMCP allowlist', () => {
  for (const action of ['reader.unread', 'reader.context', 'reader.keys', 'reader.tutorial']) {
    assert.equal(CONTROL_REQUEST_ACTIONS.has(action), true, action);
    assert.deepEqual(normalizeControlRequest({ schema: 1, id: 61, action, args: { value: 'start' } }), {
      schema: 1,
      id: 61,
      action,
      args: { value: 'start' }
    });
  }
  assert.equal(CONTROL_REQUEST_ACTIONS.has('reader.tutorial.javascript'), false);
});

test('CR unread/context/keys are derived from Reader state rather than parsing server text', () => {
  assert.match(renderer, /function readerUnreadText\(\)[\s\S]*?availableCategories\?\.\(\{ includeEmpty: false \}\)/u);
  assert.match(renderer, /function readerContextText\(\)[\s\S]*?categoryStatus\?\.\(\)/u);
  assert.match(renderer, /function readerKeysText\(\)[\s\S]*?bindingLabelForSemantic/u);
  assert.doesNotMatch(renderer.slice(renderer.indexOf('function readerUnreadText'), renderer.indexOf('function openReaderSetup')), /classifyLine|match\(|RegExp/u);
});

test('Reader Workspace exposes tutorial, unread, and context controls directly', () => {
  assert.match(index, /id="reader-workspace-tutorial"[^>]*>Reader Tutorial</u);
  assert.match(index, /id="reader-workspace-unread"[^>]*>Unread Summary</u);
  assert.match(index, /id="reader-workspace-context"[^>]*>Reader Context</u);
});

test('Reader doctor exposes first-run tutorial state for recovery and support', () => {
  const snapshotStart = renderer.indexOf('function readerControlStateSnapshot');
  const doctorStart = renderer.indexOf('function readerDoctorText');
  const snapshotBlock = snapshotStart >= 0 && doctorStart > snapshotStart ? renderer.slice(snapshotStart, doctorStart) : '';
  const doctorEnd = renderer.indexOf('function restartSelfVoiceRuntime', doctorStart);
  const doctorBlock = doctorStart >= 0 && doctorEnd > doctorStart ? renderer.slice(doctorStart, doctorEnd) : '';
  assert.match(snapshotBlock, /onboarding:\s*\{[\s\S]*?tutorialCompleted:[\s\S]*?readerTutorial\?\.status/u);
  assert.match(doctorBlock, /Reader tutorial/u);
});

test('explicit CR information and recovery commands speak locally instead of succeeding silently', () => {
  const start = renderer.indexOf("if (request.action === 'reader.doctor')");
  const end = renderer.indexOf("if (request.action === 'reader.tutorial')", start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  for (const action of ['reader.doctor', 'reader.recover', 'reader.unread', 'reader.context', 'reader.keys']) {
    const actionStart = block.indexOf(`if (request.action === '${action}')`);
    assert.ok(actionStart >= 0, action);
  }
  assert.ok((block.match(/announce\(message, \{ force: true, interrupt: true \}\)/gu) || []).length >= 5);
});
