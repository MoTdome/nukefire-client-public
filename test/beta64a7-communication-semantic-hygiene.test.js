'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const communications = require('../src/communications');

test('canonical Skynet world broadcasts classify while local Skynet UI does not', () => {
  assert.equal(communications.classifyLine('(Skynet) Freejack Blackpaw has Remorted!')?.channel, 'skynet');
  assert.equal(communications.classifyLine('[ SKYNET RARE-FIND ALERT ]')?.channel, 'skynet');
  assert.equal(communications.classifyLine('Skynet: emergency broadcast')?.channel, 'skynet');

  assert.equal(communications.classifyLine('Skynet(TM) linked destinations are:'), null);
  assert.equal(communications.classifyLine('Skynet(TM) destinations matching wasteland:'), null);
  assert.equal(communications.classifyLine('Skynet GPS Status'), null);
});
