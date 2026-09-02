'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8').replace(/\r\n?/gu, '\n');
}

const main = source('main.js');
const popout = source('renderer/popout.js');
const renderer = source('renderer/renderer.js');

test('dedocked Communications message order crosses the IPC whitelist intact', () => {
  assert.match(popout, /action: 'set-order',[\s\S]{0,100}messageOrder/u);
  assert.match(main, /const requestedMessageOrder = String\(request\.messageOrder \|\| ''\);/u);
  assert.match(main, /requestedMessageOrder === 'newest-top' \|\| requestedMessageOrder === 'newest-bottom'/u);
  assert.match(main, /channel: String\(request\.channel \|\| ''\)\.slice\(0, 40\),\s*messageOrder,\s*control/u);
  assert.match(renderer, /payload\.action === 'set-order'[\s\S]{0,160}setCommunicationMessageOrder\(payload\.messageOrder/u);
});

test('every current dedicated popout customization field has an authoritative round trip', () => {
  assert.match(popout, /action: 'set-channel', channel: channelId/u);
  assert.match(main, /channel: String\(request\.channel \|\| ''\)\.slice\(0, 40\)/u);
  assert.match(renderer, /payload\.action === 'set-channel'[\s\S]{0,160}setCommunicationChannel\(payload\.channel/u);

  assert.match(popout, /action: 'set-order',[\s\S]{0,100}messageOrder/u);
  assert.match(main, /messageOrder,/u);
  assert.match(renderer, /payload\.action === 'set-order'[\s\S]{0,160}payload\.messageOrder/u);

  assert.match(popout, /action: 'control',[\s\S]{0,100}control: controlPayload/u);
  assert.match(main, /control\s*\n\s*\}\);/u);
  assert.match(renderer, /payload\.action === 'control'[\s\S]{0,120}applyMirroredPanelControl/u);
});

test('generic dedocked panes keep the main renderer authoritative instead of creating parallel settings state', () => {
  assert.match(popout, /function relayControl\(element, kind, event = \{\}\)/u);
  assert.match(popout, /\$\('#panel-mirror'\)\.addEventListener\('change'/u);
  assert.match(renderer, /function applyMirroredPanelControl\(panelId, request = \{\}\)/u);
  assert.match(renderer, /element\.dispatchEvent\(new Event\(kind, \{ bubbles: true \}\)\)/u);
  assert.match(renderer, /schedulePanelPopoutPublish\(panelId\);/u);
});
