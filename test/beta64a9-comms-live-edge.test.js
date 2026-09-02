'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
const popout = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'popout.js'), 'utf8');

test('Communications keeps explicit live-edge intent across unrelated GMCP refreshes and layout re-renders', () => {
  assert.match(renderer, /followLiveEdge: true/u);
  assert.match(renderer, /function setCommunicationFollowLiveEdge/u);
  assert.match(renderer, /#communications-messages[\s\S]{0,180}addEventListener\('scroll'/u);
  assert.match(renderer, /snapshot\.followLiveEdge \|\| snapshot\.atLiveEdge/u);
  assert.match(renderer, /previousCommunicationChannels !== nextCommunicationChannels/u);
  assert.doesNotMatch(renderer, /if \(fullRefresh \|\| packageName === 'Comm\.Channel\.List'\)/u);
});

test('dedocked Communications mirrors the same sticky newest-bottom live-edge behavior', () => {
  assert.match(popout, /followLiveEdge: true/u);
  assert.match(popout, /state\.followLiveEdge = communicationsAtLiveEdge/u);
  assert.match(popout, /snapshot\.followLiveEdge/u);
});
