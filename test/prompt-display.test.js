'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  normalizePromptDisplayMode,
  shouldCapturePrompt,
  looksLikeNukeFirePlayingPrompt,
  makePromptSnapshot,
  stagePromptAwareTerminalRuns,
  companionPromptEntries
} = require('../src/prompt-display');

test('normalizes prompt display modes and keeps inline as the safe default', () => {
  assert.equal(normalizePromptDisplayMode('DOCKED'), 'docked');
  assert.equal(normalizePromptDisplayMode('hidden'), 'hidden');
  assert.equal(normalizePromptDisplayMode('unknown'), 'inline');
});

test('captures only playing-session prompt tails in docked or hidden modes', () => {
  const playing = { characterName: 'Caul' };
  assert.equal(shouldCapturePrompt('docked', playing, '100H 50M >'), true);
  assert.equal(shouldCapturePrompt('hidden', playing, '100H 50M >'), true);
  assert.equal(shouldCapturePrompt('inline', playing, '100H 50M >'), false);
  assert.equal(shouldCapturePrompt('docked', {}, '100H 50M 80V >'), true);
  assert.equal(shouldCapturePrompt('docked', {}, '\u001b[36m>\u001b[0m'), true);
  assert.equal(shouldCapturePrompt('docked', {}, 'Name: '), false);
  assert.equal(shouldCapturePrompt('docked', {}, 'Password: '), false);
  assert.equal(shouldCapturePrompt('docked', playing, 'group line\nprompt>'), false);
});

test('recognizes the authoritative NukeFire final prompt marker without GMCP identity', () => {
  assert.equal(looksLikeNukeFirePlayingPrompt('925H 411M 803V >'), true);
  assert.equal(looksLikeNukeFirePlayingPrompt('\u001b[31m925H\u001b[0m >'), true);
  assert.equal(looksLikeNukeFirePlayingPrompt('Name: '), false);
  assert.equal(looksLikeNukeFirePlayingPrompt('[ Return to continue ] '), false);
});


test('builds ordered same-server companion prompt lines with accessible low-health state', () => {
  const active = {
    id: 'tank', name: 'Caul', host: 'tdome.nukefire.org', port: 4000,
    connected: true, status: { state: 'connected' }
  };
  const records = {
    tank: active,
    healer: {
      id: 'healer', name: 'Shai', host: 'TDOME.NUKEFIRE.ORG', port: 4000,
      connected: true, status: { state: 'connected' },
      vitals: { hp: 24, maxHp: 100, mana: 500, move: 700 }
    },
    exact: {
      id: 'exact', name: 'Rambo', host: 'tdome.nukefire.org', port: 4000,
      connected: true, status: { state: 'connected' },
      vitals: { hp: 25, maxHp: 100, mana: 10157, move: 9667 }
    },
    other: {
      id: 'other', name: 'Other', host: 'example.org', port: 4000,
      connected: true, status: { state: 'connected' },
      vitals: { hp: 1, maxHp: 100, mana: 2, move: 3 }
    },
    sleeping: {
      id: 'sleeping', name: 'Sleeping', host: 'tdome.nukefire.org', port: 4000,
      connected: false, status: { state: 'disconnected' },
      vitals: { hp: 1, maxHp: 100, mana: 2, move: 3 }
    },
    incomplete: {
      id: 'incomplete', name: 'Incomplete', host: 'tdome.nukefire.org', port: 4000,
      connected: true, status: { state: 'connected' },
      vitals: { hp: 80, maxHp: 100, mana: null, move: 3 }
    }
  };

  const entries = companionPromptEntries(
    active,
    records,
    ['tank', 'healer', 'other', 'exact', 'sleeping', 'incomplete']
  );

  assert.deepEqual(entries.map((entry) => entry.id), ['healer', 'exact']);
  assert.equal(entries[0].plainText, '< 24H 500M 700V Shai >');
  assert.equal(entries[0].lowHealth, true);
  assert.match(entries[0].accessibleText, /Shai, low health/u);
  assert.equal(entries[1].plainText, '< 25H 10157M 9667V Rambo >');
  assert.equal(entries[1].lowHealth, false, 'exactly 25 percent is not low health');
  assert.doesNotMatch(entries[1].accessibleText, /low health/u);
});

test('creates a detached prompt snapshot with plain accessible text', () => {
  const snapshot = makePromptSnapshot([
    { text: '100H ', style: { fg: '#fff' } },
    { text: '>', style: null }
  ], '\u001b[37m100H \u001b[0m>', { type: 'eor' });
  assert.equal(snapshot.plainText, '100H >');
  assert.equal(snapshot.boundaryType, 'eor');
  assert.deepEqual(snapshot.runs[0].style, { fg: '#fff' });

  const first = stagePromptAwareTerminalRuns([
    { text: 'A completed room line\r\n', style: { fg: '#fff' }, kind: 'mud' }
  ], null, { deferTrailingLineBreak: true });
  assert.equal(first.runs.map((run) => run.text).join(''), 'A completed room line');
  assert.equal(first.deferredLineBreak.text, '\r\n');

  const second = stagePromptAwareTerminalRuns([
    { text: 'Combat begins\n', style: null, kind: 'mud' }
  ], first.deferredLineBreak, { deferTrailingLineBreak: true });
  assert.equal(second.runs.map((run) => run.text).join(''), '\r\nCombat begins');
  assert.equal(second.deferredLineBreak.text, '\n');

  const inline = stagePromptAwareTerminalRuns([
    { text: 'Name: ', style: null, kind: 'mud' }
  ], second.deferredLineBreak, { deferTrailingLineBreak: false });
  assert.equal(inline.runs.map((run) => run.text).join(''), '\nName: ');
  assert.equal(inline.deferredLineBreak, null);
});

test('renderer wires the Prompt display selector to live mode changes', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(source, /#prompt-display-mode'\)\?\.addEventListener\('change'/u);
  assert.match(source, /applyPromptDisplayMode\(event\.target\.value, \{[\s\S]*persist: true,[\s\S]*announceChange: true/u);
  assert.match(source, /deferredLineBreak:\s*null/u);
  assert.match(source, /stagePromptAwareTerminalRuns\(runs, deferredLineBreak/u);
  assert.match(source, /const parsedDetailed = typeof record\.ansi\?\.parseDetailed === 'function'[\s\S]*?const sourcePlain = parsedDetailed/u);
  assert.match(source, /parseVitalsFromText\(raw, sourcePlain\)/u);
  const captureBlock = source.slice(source.indexOf('function captureDockedPrompt('), source.indexOf('function clearDockedPrompt('));
  assert.doesNotMatch(captureBlock, /const plain = window\.NukeFireAnsi\.stripAnsi\(raw\)/u);
  assert.match(source, /renderSessionOutput\(activeSessionRecord\(\)\)/u);
});

test('docked prompt chrome returns to one non-focusable anchored line above command input', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
  const rowTag = html.match(/<div id="docked-prompt-row"[\s\S]*?>/u)?.[0] || '';

  assert.doesNotMatch(rowTag, /tabindex=/u);
  assert.match(css, /grid-template-rows:\s*38px auto minmax\(0, 1fr\) max-content max-content;/u);
  assert.match(css, /\.docked-prompt-row\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*center;[^}]*min-block-size:\s*calc\(var\(--terminal-font-size\) \+ 6px\);[^}]*max-block-size:\s*calc\(var\(--terminal-font-size\) \+ 6px\);[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;[^}]*padding:\s*0 10px 4px;[^}]*border:\s*0;[^}]*line-height:\s*1;/su);
  assert.match(css, /\.docked-prompt-row::-webkit-scrollbar\s*\{\s*display:\s*none;\s*\}/u);
  assert.match(css, /#docked-prompt-content\s*\{[^}]*min-width:\s*max-content;[^}]*line-height:\s*1;/su);
  assert.doesNotMatch(css, /\.docked-prompt-companion|\.docked-prompt-health-low/u);
  assert.match(css, /\.session-vitals-list\s*\{[^}]*overflow-y:\s*auto;[^}]*overflow-x:\s*hidden;/su);
  assert.match(css, /\.session-vital-row\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/su);
  assert.match(css, /\.session-vital-health\s*\{\s*color:\s*#4bd8e6;\s*\}/u);
  assert.match(css, /\.session-vital-mana\s*\{\s*color:\s*#e0b84f;\s*\}/u);
  assert.match(css, /\.session-vital-move\s*\{\s*color:\s*#4bd35f;\s*\}/u);
  assert.match(css, /\.session-vital-health-low\s*\{[^}]*color:\s*#ff6b6b;[^}]*font-weight:\s*800;/su);
  assert.match(css, /body\[data-prompt-display-mode="docked"\] \.input-bar\s*\{[^}]*padding:\s*5px 10px 6px;[^}]*border-top:\s*0;/su);
  assert.match(css, /\.xterm-output \.xterm-cursor-layer\s*\{\s*display:\s*none;\s*\}/u);
});

test('TinTin read visibility stays local to read feedback rather than global resize handling', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const readHandler = source.match(/function appendTinTinReadLines\([\s\S]*?\n\}\n\nasync function handleTinTinReadRequest/u)?.[0] || '';
  const resizeHandler = source.match(/function scheduleTerminalSizeUpdate\([\s\S]*?\n\}\n\nasync function syncClientPreferences/u)?.[0] || '';

  assert.match(readHandler, /appendLocalText\(text\);[\s\S]*flushTerminalOutput\(\);[\s\S]*snapOutputToBottom\(\);/u);
  assert.doesNotMatch(resizeHandler, /snapOutputToBottom|scrollToBottom/u);
});
