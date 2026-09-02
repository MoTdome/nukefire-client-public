'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const readerHistoryApi = require('../src/reader-history');
const root = path.resolve(__dirname, '..');
const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');

test('Reader History reserves a quiet Client Reader category for local CR material', () => {
  const category = readerHistoryApi.CORE_CATEGORIES.find((entry) => entry.id === 'client-reader');
  assert.deepEqual(category, {
    id: 'client-reader',
    label: 'Client Reader',
    speechPolicy: 'quiet',
    always: false
  });

  const history = new readerHistoryApi.ReaderHistory({
    maxEntriesPerCategory: 20,
    maxCharactersPerCategory: 2000
  });
  history.append('client-reader', 'Audio tutorial step three.', {
    label: 'Client Reader', speechPolicy: 'quiet', source: 'client-reader:tutorial', markRead: true
  });
  assert.equal(history.categoryStatus('client-reader').count, 1);
  assert.equal(history.categoryStatus('client-reader').unread, 0);
  assert.equal(history.latest('client-reader').text, 'Audio tutorial step three.');
});

test('CR tutorial speech is retained in Client Reader history without adding another speech path', () => {
  assert.match(renderer, /function appendClientReaderHistory\(message, options = \{\}\)/u);
  assert.match(renderer, /history\.append\('client-reader', text, \{[\s\S]*?speechPolicy: 'quiet'[\s\S]*?markRead: options\.markRead !== false/u);
  assert.match(renderer, /function readerTutorialSpeak\(text, options = \{\}\) \{[\s\S]*?appendClientReaderHistory\(message, \{ source: 'client-reader:tutorial' \}\)/u);
});

test('meaningful CR control results are retained while review-navigation bookkeeping is not', () => {
  assert.match(renderer, /const action = String\(request\.action \|\| ''\)\.trim\(\)\.toLowerCase\(\);/u);
  assert.match(renderer, /const skipHistory = action === 'reader\.tutorial'[\s\S]*?action\.startsWith\('reader\.review\.'\)[\s\S]*?action\.startsWith\('reader\.lines\.'\)[\s\S]*?action\.startsWith\('reader\.category\.'\)/u);
  assert.match(renderer, /if \(!skipHistory\) appendClientReaderHistory\(message, \{ source: `client-control:\$\{action\}` \}\);/u);
});

test('existing local health and vitals reads remain immediate Self-Voice announcements', () => {
  assert.match(renderer, /function readVitals\(\) \{\s*announce\(vitalsSummary\(\), \{ force: true \}\);\s*\}/u);
  assert.match(renderer, /function readSingleVital\(kind\) \{\s*announce\(singleVitalSummary\(kind\), \{ force: true \}\);\s*\}/u);
  assert.match(renderer, /selfVoice\?\.speak\?\.\(text, \{ interrupt: interrupt \|\| force \}\)/u);
});
