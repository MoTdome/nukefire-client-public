'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const ansi = require('../src/ansi-parser');
const communications = require('../src/communications');
const affects = require('../src/affects');
const context = require('../src/context-deck');
const runtimeApi = require('../src/session-runtime');
const highlightApi = require('../src/highlight-engine');

function runtime(overrides = {}) {
  return runtimeApi.createSessionRuntime({
    id: 'tank', name: 'Tank', role: 'tank', ...overrides
  }, {
    ansiApi: ansi,
    communicationsApi: communications,
    affectsApi: affects,
    contextApi: context,
    highlightApi,
    channelIds: ['all', 'gossip', 'tell', 'system'],
    maxCharacters: 200
  });
}

test('session runtime keeps independent ANSI, output, reader, and vitals state', () => {
  const tank = runtime();
  const healer = runtime({ id: 'healer', name: 'Healer', role: 'healer' });

  runtimeApi.appendText(tank, '\u001b[31mTank line\u001b[0m\nHP: 90/100\n', { stripAnsi: ansi.stripAnsi });
  runtimeApi.appendText(tank, '\u001b[31mMore red', { stripAnsi: ansi.stripAnsi });
  runtimeApi.appendText(tank, ', still red\u001b[0m', { stripAnsi: ansi.stripAnsi });
  runtimeApi.appendText(healer, 'Healer line\nHP: 40/80\n', { stripAnsi: ansi.stripAnsi });
  runtimeApi.parseVitals(tank, 'HP: 90/100', ansi.stripAnsi);
  runtimeApi.parseVitals(healer, 'HP: 40/80', ansi.stripAnsi);

  assert.match(tank.plainText, /Tank line/u);
  assert.doesNotMatch(tank.plainText, /Healer/u);
  assert.equal(tank.lastCompleteLine, 'HP: 90/100');
  const mergedRed = tank.outputRuns.find((run) => run.text.includes('More red'));
  assert.ok(mergedRed);
  assert.match(mergedRed.text, /More red, still red/u);
  assert.equal(tank.vitals.hp, 90);
  assert.equal(healer.vitals.maxHp, 80);
  assert.notEqual(tank.ansi, healer.ansi);
  assert.equal(tank.historyPrefix, '');
});


test('session runtime parses full NukeFire prompt tails while preserving known maximums', () => {
  const session = runtime();
  runtimeApi.parseVitals(
    session,
    'HP: 100/400\nMANA: 200/500\nMOVE: 300/600',
    ansi.stripAnsi
  );
  runtimeApi.parseVitals(
    session,
    '< 99H 201M 301V AFK [Lvl 50, Ready to Remort!] >',
    ansi.stripAnsi
  );

  assert.deepEqual(session.vitals, {
    hp: 99, maxHp: 400,
    mana: 201, maxMana: 500,
    move: 301, maxMove: 600
  });
});

test('session runtime bounds stored output without rescanning history', () => {
  const session = runtime();
  runtimeApi.appendText(session, 'x'.repeat(350), { stripAnsi: ansi.stripAnsi });
  assert.equal(session.plainText.length, 200);
  assert.equal(session.outputCharacters, 200);
  assert.equal(session.outputRuns.reduce((sum, run) => sum + run.text.length, 0), 200);

  const runs = Array.from({ length: 100 }, (_, index) => ({
    text: String(index).padStart(4, '0'),
    style: { fgBasicIndex: index % 2 }
  }));
  runtimeApi.appendRuns(session, runs);
  const stored = session.outputRuns.map((run) => run.text).join('');
  assert.equal(session.outputCharacters, 200);
  assert.equal(stored.length, 200);
  assert.ok(stored.endsWith('0099'));
  assert.ok(session.outputRuns.length <= 50);
});

test('session runtime bounds highly fragmented styled output independently of character count', () => {
  const session = runtimeApi.createSessionRuntime({ id: 'fragmented' }, {
    ansiApi: ansi,
    highlightApi,
    maxCharacters: 1_000_000,
    maxOutputRuns: 1000
  });
  const runs = Array.from({ length: 1001 }, (_, index) => ({
    text: String(index % 10),
    style: { fgBasicIndex: index % 2 }
  }));
  runtimeApi.appendRuns(session, runs);
  assert.equal(session.outputRuns.length, 875);
  assert.equal(session.outputCharacters, 875);
  assert.equal(session.plainText.length, 0);
});

test('character and run limits retain aligned visible transcript text', () => {
  const session = runtimeApi.createSessionRuntime({ id: 'combined-limits' }, {
    ansiApi: ansi,
    highlightApi,
    maxCharacters: 100_000,
    maxOutputRuns: 1000
  });
  let source = '';
  for (let index = 0; index < 1200; index += 1) {
    source += `\u001b[${index % 2 ? 31 : 32}m${String(index).padStart(90, '0')}`;
  }
  runtimeApi.appendText(session, source, { stripAnsi: ansi.stripAnsi });
  assert.ok(session.outputRuns.length <= 1000);
  assert.ok(session.outputCharacters <= 100_000);
  assert.equal(session.outputRuns.map((run) => run.text).join(''), session.plainText);
});

test('session runtime preserves prompt boundaries and can clear one session only', () => {
  const tank = runtime();
  const healer = runtime({ id: 'healer' });
  runtimeApi.appendText(tank, 'Tank prompt>', { stripAnsi: ansi.stripAnsi });
  runtimeApi.appendText(healer, 'Healer prompt>', { stripAnsi: ansi.stripAnsi });
  runtimeApi.commitBoundary(tank);
  assert.equal(tank.lastCompleteLine, 'Tank prompt>');
  runtimeApi.clearOutput(tank);
  assert.equal(tank.plainText, '');
  assert.equal(healer.plainText, 'Healer prompt>');
});


test('session runtime preserves the dedicated Help presentation kind', () => {
  const session = runtime();
  const run = runtimeApi.appendSystem(session, 'NUKEFIRE CLIENT HELP\nUSAGE', 'help');
  assert.equal(run.kind, 'help');
  assert.equal(run.text, '\n[NUKEFIRE CLIENT HELP\nUSAGE]\n');
  assert.match(session.plainText, /NUKEFIRE CLIENT HELP/u);
});

test('session runtime stores highlighted visual runs without altering plain or reader text', () => {
  const session = runtime();
  const engine = new highlightApi.HighlightEngine({
    highlights: [
      { pattern: 'mutant', style: 'Yellow underline', priority: 5, enabled: true }
    ]
  });
  const source = '\u001b[31mA mutant arrives.\u001b[0m\n';
  const runs = runtimeApi.appendText(session, source, {
    stripAnsi: ansi.stripAnsi,
    transformRuns: (parsed) => highlightApi.applyHighlightsToRuns(parsed, engine)
  });

  assert.equal(session.plainText, 'A mutant arrives.\n');
  assert.equal(session.lastCompleteLine, 'A mutant arrives.');
  const mutant = runs.find((run) => run.text === 'mutant');
  assert.ok(mutant);
  assert.equal(mutant.style.underline, true);
  assert.ok(mutant.style.fg);
  assert.equal(session.outputRuns.map((run) => run.text).join(''), session.plainText);
});

test('session runtime clears a stored docked prompt with output', () => {
  const runtime = runtimeApi.createSessionRuntime({ id: 'prompt', characterName: 'Caul' }, {
    ansiApi: ansi,
    highlightApi
  });
  runtime.dockedPrompt = {
    rawText: '100H >', plainText: '100H >', runs: [{ text: '100H >', style: null }], boundaryType: 'ga', updatedAt: 1
  };
  runtimeApi.clearOutput(runtime);
  assert.equal(runtime.dockedPrompt.plainText, '');
  assert.deepEqual(runtime.dockedPrompt.runs, []);
});

test('session runtime keeps docked prompt snapshots independent per session', () => {
  const tank = runtimeApi.createSessionRuntime({ id: 'tank', characterName: 'Caul' }, { ansiApi: ansi, highlightApi });
  const healer = runtimeApi.createSessionRuntime({ id: 'healer', characterName: 'Shai' }, { ansiApi: ansi, highlightApi });
  tank.dockedPrompt = { rawText: '100H >', plainText: '100H >', runs: [], boundaryType: 'ga', updatedAt: 1 };
  healer.dockedPrompt = { rawText: '50H >', plainText: '50H >', runs: [], boundaryType: 'eor', updatedAt: 2 };
  assert.equal(tank.dockedPrompt.plainText, '100H >');
  assert.equal(healer.dockedPrompt.plainText, '50H >');
  assert.equal(tank.dockedPrompt.boundaryType, 'ga');
  assert.equal(healer.dockedPrompt.boundaryType, 'eor');
});
