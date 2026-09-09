'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const router = require('../src/accessibility-router');
const semantic = require('../src/semantic-controls');

const root = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('semantic accessibility journal collapses rapid repeats without losing priority or presentation decisions', () => {
  const journal = new router.AccessibilityPresentationJournal({ collapseWindowMs: 1000 });
  const first = journal.record({ event: 'communication.tell', category: 'communication', text: 'Blair tells you hello', source: 'communication:tell', priority: 'high', timestamp: 1000 });
  const second = journal.record({ event: 'communication.tell', category: 'communication', text: 'Blair tells you hello', source: 'communication:tell', priority: 'critical', timestamp: 1400 });
  assert.equal(first.id, second.id);
  assert.equal(second.count, 2);
  assert.equal(second.priorityLabel, 'critical');
  journal.decision(second.id, 'sound', 'blocked', 'Tell sound is off.');
  const why = journal.lastSuppressed();
  assert.equal(why.event.event, 'communication.tell');
  assert.equal(why.decision.presentation, 'sound');
  assert.equal(why.decision.reason, 'Tell sound is off.');
  assert.match(router.describeEvent(journal.last()), /repeated 2 times/u);
  assert.match(router.describeWhy(why), /Tell sound is off/u);
});

test('semantic GMCP classification covers navigation loot combat and managed sound events with bounded categories', () => {
  assert.deepEqual(router.eventFromGmcp('Room.Info', { name: 'Saint Mercy Chapel' }), {
    event: 'room.enter', category: 'navigation', text: 'Saint Mercy Chapel', source: 'gmcp:Room.Info', priority: 'normal'
  });
  assert.equal(router.eventFromGmcp('NukeFire.Loot.Event', { kind: 'item', item: { name: 'an embercore' } }).category, 'loot');
  assert.equal(router.eventFromGmcp('NukeFire.Combat', { out: { kills: 1, damage: 99 }, in: { damage: 3 } }).event, 'combat.kill');
  assert.equal(router.eventFromGmcp('NukeFire.Sound.Event', { event: 'quest.completed' }).category, 'quest');
  assert.equal(router.categoryForEvent('craft.recipe.completed'), 'crafting');
  assert.equal(router.categoryForEvent('danger.health-low'), 'safety');
});

test('capability report exposes the routing tools while the deferred braille layer remains disabled', () => {
  const caps = router.capabilitySnapshot({ soundpackEvents: true, nativeReader: true, selfVoice: true });
  for (const key of ['semanticJournal', 'lastEvent', 'why', 'reports', 'profiles', 'selfTest', 'doctor', 'universalReview', 'priorityCollapse']) {
    assert.equal(caps[key], true, key);
  }
  assert.equal(caps.braille, false);
});

test('client-only accessibility commands stay local while the server control bridge is deliberately deferred', () => {
  const deferred = [
    'reader.accessibility.last', 'reader.accessibility.why', 'reader.accessibility.report',
    'reader.accessibility.capabilities', 'reader.accessibility.test', 'reader.accessibility.doctor',
    'reader.accessibility.clear', 'reader.accessibility.profile'
  ];
  for (const action of deferred) assert.equal(semantic.CONTROL_REQUEST_ACTIONS.has(action), false, action);

  const session = source('src/session-manager.js');
  assert.match(session, /parsed\.directive === 'accessibility' \|\| parsed\.directive === 'access' \|\| parsed\.directive === 'a11y'/u);
  assert.match(session, /interactive-only/u);
  assert.match(session, /profile-import/u);

  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /executeAccessibilityOperation/u);
  assert.match(renderer, /accessibilityLastEventText/u);
  assert.match(renderer, /accessibilityWhyText/u);
  assert.match(renderer, /accessibilitySetupReportText/u);
  assert.match(renderer, /ACCESSIBILITY_PROFILE_STORAGE_KEY/u);
  assert.doesNotMatch(renderer, /request\.action\.startsWith\('reader\.accessibility\.'\)/u);
});

test('universal review extends the existing Reader History instead of introducing a second review engine', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /const map = \{ navigation: 'navigation', loot: 'loot', crafting: 'crafting', quest: 'quests', safety: 'safety', vitals: 'vitals', system: 'system', client: 'system' \}/u);
  assert.match(renderer, /record\.readerHistory\.append/u);
  assert.doesNotMatch(renderer, /new AccessibilityReviewHistory/u);
  assert.match(renderer, /Duplicate communication cue suppressed/u);
  assert.match(renderer, /lastSuppressed/u);
});

test('setup reporting and portable profiles remain sanitized and reuse protected client preset plumbing', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /NukeFire accessibility setup report/u);
  assert.match(renderer, /exportCurrentClientPreset/u);
  assert.match(renderer, /importClientPreset/u);
  assert.match(renderer, /without commands, scripts, credentials, or history/u);
  assert.doesNotMatch(renderer, /accessibilitySetupReportText[\s\S]{0,1600}state\.history/u);
  const docs = source('docs/BETA75-ACCESSIBILITY-ROUTING-PASS4.md');
  assert.match(docs, /does not include commands, command history, credentials, or private mud text/iu);
});

test('self-test and doctor use real Reader History and audio gates and preserve full live text', () => {
  const renderer = source('renderer/renderer.js');
  const start = renderer.indexOf('function accessibilitySelfTestText()');
  const end = renderer.indexOf('async function executeAccessibilityOperation', start);
  const block = start >= 0 && end > start ? renderer.slice(start, end) : '';
  assert.match(block, /appendReaderHistoryCommunication/u);
  assert.match(block, /appendUniversalAccessibilityHistory/u);
  assert.match(block, /testAudioCueResult\('hit'\)/u);
  assert.match(block, /readerDoctorText\(\)/u);
  assert.doesNotMatch(source('src/accessibility-router.js'), /gag|hide terminal|remove terminal/iu);
});

test('help documents a11y aliases and profile portability without adding automation authority', () => {
  const help = source('src/client-command-help.js');
  assert.match(help, /name: 'accessibility'/u);
  assert.match(help, /aliases: Object\.freeze\(\['access', 'a11y'\]\)/u);
  assert.match(help, /PROFILE EXPORT\/IMPORT reuse the protected NukeFire Client Preset format/u);
  assert.match(help, /interactive-only/u);
});

test('routing instrumentation preserves established safety semantic-audio and communication call shapes', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /function emitReaderSafetyAlerts[\s\S]*?lane\.process[\s\S]*?append\?\.\('combat'[\s\S]*?announce\(best\.text, \{ force: true, interrupt: true \}\)/u);
  assert.match(renderer, /if \(semanticCue\) playSemanticAudioCue\(semanticCue\);/u);
  assert.match(renderer, /record\.communications\.messages\.push\(storedMessage\);\s*appendReaderHistoryCommunication\(record, storedMessage\);\s*playCommunicationAudioCue\(record, storedMessage\);/u);
});
