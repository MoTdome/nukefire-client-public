'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const communications = require('../src/communications');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

test('telepath channel aliases normalize to Tell for semantic GMCP variants', () => {
  assert.equal(communications.normalizeChannel('telepath'), 'tell');
  assert.equal(communications.normalizeChannel('telepaths'), 'tell');
  assert.equal(communications.messageFromGmcp({
    packageName: 'Comm.Channel',
    body: { chan: 'telepath', player: 'Prime', msg: "Prime telepaths to you, 'hello'" }
  })?.channel, 'tell');
});

test('timestamped NukeFire outgoing and incoming telepaths classify as Tell', () => {
  assert.equal(communications.classifyLine("21:23 You telepath Prime, 'hello'")?.channel, 'tell');
  assert.equal(communications.classifyLine("21:24 Cogline telepaths to you, 'hello back'")?.channel, 'tell');
});

test('Last Tell maintains a direct per-session cache and Reader History fallback', () => {
  assert.match(renderer, /function noteLastTell\(communications, message\)/u);
  assert.match(renderer, /state\.communications\.lastTell/u);
  assert.match(renderer, /activeSessionRecord\(\)\?\.communications\?\.lastTell/u);
  assert.match(renderer, /readerHistoryLastTell\(\)/u);
  assert.match(renderer, /snapshot\?\.\('comm:tell'\)/u);
  assert.match(renderer, /function recallLastTell\(\)[\s\S]*?readerHistoryLastTell\(\)[\s\S]*?state\.communications\.lastTell[\s\S]*?state\.communications\.review\?\.recall/u);
});

test('Reader doctor reports Tell capture health from both Communications and Reader History', () => {
  assert.match(renderer, /Tell capture \$\{tellMessages\} Communications messages/u);
  assert.match(renderer, /Reader History messages, Last Tell/u);
});
