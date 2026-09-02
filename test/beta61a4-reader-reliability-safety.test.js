'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { ReaderHistory } = require('../src/reader-history');
const { ReaderSafetyLane } = require('../src/reader-safety');
const { CONTROL_REQUEST_ACTIONS, normalizeControlRequest } = require('../src/semantic-controls');

const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');

function snapshot(hp = 1000, maxHp = 1000, name = 'Tester') {
  return { char: { status: { name }, vitals: { hp, mhp: maxHp, opponent: null } }, group: null };
}

test('Reader History reports per-category unread counts without moving its cursor', () => {
  const history = new ReaderHistory();
  history.append('comm:tell', 'one', { label: 'Tell' });
  history.append('comm:tell', 'two', { label: 'Tell' });
  assert.equal(history.categoryStatus('comm:tell').unread, 2);
  const firstReview = history.previous('comm:tell');
  assert.equal(firstReview.text, 'one');
  assert.equal(history.categoryStatus('comm:tell').unread, 1);
  history.append('comm:tell', 'three', { label: 'Tell' });
  assert.equal(history.categoryStatus('comm:tell').unread, 2);
  assert.equal(history.current('comm:tell').text, 'one');
});

test('live Main Output can mark new lines read while review categories retain unread state', () => {
  const history = new ReaderHistory();
  history.append('main', 'live line', { markRead: true });
  history.append('damage', 'damage line');
  assert.equal(history.categoryStatus('main').unread, 0);
  assert.equal(history.categoryStatus('damage').unread, 1);
});

test('Reader Safety ignores initial low-health baselines and alerts on a real downward crossing', () => {
  const lane = new ReaderSafetyLane();
  assert.deepEqual(lane.process('Char.Vitals', { hp: 200, mhp: 1000 }, snapshot(200)), []);
  assert.deepEqual(lane.process('Char.Vitals', { hp: 500, mhp: 1000 }, snapshot(500)), []);
  const alerts = lane.process('Char.Vitals', { hp: 240, mhp: 1000 }, snapshot(240));
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].kind, 'critical-health');
  assert.match(alerts[0].text, /24 percent remaining/u);
});

test('Reader Safety treats a 25 percent max-HP combat window as critical realtime damage', () => {
  const lane = new ReaderSafetyLane();
  const low = lane.process('NukeFire.Combat', { schema: 1, in: { damage: 249 }, out: {} }, snapshot(751, 1000));
  assert.equal(low.length, 0);
  const high = lane.process('NukeFire.Combat', { schema: 1, in: { damage: 250 }, out: {} }, snapshot(750, 1000));
  assert.equal(high.length, 1);
  assert.equal(high[0].kind, 'heavy-damage');
});

test('Reader Safety death outranks ordinary damage', () => {
  const lane = new ReaderSafetyLane();
  const alerts = lane.process('NukeFire.Combat', { schema: 1, in: { damage: 900, deaths: 1 }, out: {} }, snapshot(0, 1000));
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].priority, 100);
  assert.equal(alerts[0].kind, 'death');
});

test('Reader Safety announces opponent acquisition without requiring server-text parsing', () => {
  const lane = new ReaderSafetyLane();
  lane.process('Char.Vitals', { hp: 1000, mhp: 1000, opponent: null }, snapshot());
  const alerts = lane.process('Char.Vitals', { hp: 1000, mhp: 1000, opponent: { name: 'Mutant Enforcer' } }, snapshot());
  assert.equal(alerts.some((entry) => entry.kind === 'combat-start'), true);
  assert.match(alerts.find((entry) => entry.kind === 'combat-start').text, /Mutant Enforcer/u);
});

test('Reader Safety group alerts require a threshold crossing, not merely an initially-low member', () => {
  const lane = new ReaderSafetyLane();
  const first = { members: [{ name: 'Cogline', info: { hp: 150, mhp: 1000 } }] };
  assert.deepEqual(lane.process('Group', first, snapshot()), []);
  lane.process('Group', { members: [{ name: 'Cogline', info: { hp: 500, mhp: 1000 } }] }, snapshot());
  const alerts = lane.process('Group', { members: [{ name: 'Cogline', info: { hp: 190, mhp: 1000 } }] }, snapshot());
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].kind, 'group-critical-health');
  assert.match(alerts[0].text, /Cogline.*19 percent/u);
});

test('Reader Safety can be disabled without losing deterministic state', () => {
  const lane = new ReaderSafetyLane({ enabled: false });
  assert.deepEqual(lane.process('NukeFire.Combat', { in: { damage: 1000, deaths: 1 } }, snapshot()), []);
  lane.setEnabled(true);
  assert.equal(lane.process('NukeFire.Combat', { in: { deaths: 1 } }, snapshot())[0].kind, 'death');
});

test('a4 recovery controls remain a hardcoded semantic allowlist', () => {
  for (const action of ['reader.voice.restart', 'reader.doctor', 'reader.recover', 'reader.alerts.enabled']) {
    assert.equal(CONTROL_REQUEST_ACTIONS.has(action), true, action);
    assert.deepEqual(normalizeControlRequest({ schema: 1, id: 77, action, args: { value: 'toggle' } }), {
      schema: 1, id: 77, action, args: { value: 'toggle' }
    });
  }
  assert.equal(CONTROL_REQUEST_ACTIONS.has('reader.recover.shell'), false);
});

test('renderer recovery re-requests authoritative reader state and can rebuild Self-Voice', () => {
  assert.match(renderer, /function restartSelfVoiceRuntime\(options = \{\}\)[\s\S]*?speechSynthesis\?\.cancel[\s\S]*?createSelfVoiceController\(\)/u);
  assert.match(renderer, /function recoverReaderRuntime[\s\S]*?sendActiveGmcp\('Char\.Status'\)[\s\S]*?sendActiveGmcp\('Char\.Vitals'\)[\s\S]*?sendActiveGmcp\('Group'\)[\s\S]*?sendActiveGmcp\('NukeFire\.Controls'\)/u);
  assert.match(renderer, /reader\.doctor[\s\S]*?readerDoctorText\(\)/u);
});

test('critical realtime alerts use interrupt speech and do not navigate Reader History', () => {
  assert.match(renderer, /function emitReaderSafetyAlerts[\s\S]*?lane\.process[\s\S]*?append\?\.\('combat'[\s\S]*?announce\(best\.text, \{ force: true, interrupt: true \}\)/u);
  const start = renderer.indexOf('function emitReaderSafetyAlerts');
  const end = renderer.indexOf('function readerControlStatusText', start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.doesNotMatch(block, /readerHistory(?:Latest|Previous|Next|Current)\(/u);
});

test('reader safety module loads before the renderer runtime consumes it', () => {
  const safety = index.indexOf('../src/reader-safety.js');
  const session = index.indexOf('../src/session-runtime.js');
  assert.ok(safety > 0 && session > safety);
});

test('Self-Voice enable proves the backend transition before disabling the native reader path', () => {
  const start = renderer.indexOf('function setSelfVoiceEnabled');
  const end = renderer.indexOf('function setReaderWorkspaceReviewStatus', start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  const applyIndex = block.indexOf('const applied = selfVoice?.setEnabled?.(requested)');
  const nativeOffIndex = block.indexOf('if (requested && state.accessibility.screenReaderMode)');
  assert.ok(applyIndex >= 0 && nativeOffIndex > applyIndex);
  assert.match(block, /requested && applied !== true[\s\S]*?native reader setting was preserved/u);
});

test('Live Reader presets fail visibly and preserve native speech when Self-Voice cannot start', () => {
  const start = renderer.indexOf('function applyReaderSetupPreset');
  const end = renderer.indexOf('function setImportantAnnouncements', start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.match(block, /speechPathReady = setSelfVoiceEnabled\(next\.selfVoiceEnabled === true, quiet\) === true/u);
  assert.match(block, /!speechPathReady && next\.selfVoiceEnabled === true[\s\S]*?setScreenReaderMode\(true, quiet\)/u);
  assert.match(block, /Reader preset could not start NukeFire Self-Voice\. Native reader mode was preserved instead/u);
  assert.match(block, /return speechPathReady;/u);
});
