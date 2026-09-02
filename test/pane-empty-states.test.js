'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function source(relative) {
  return fs.readFileSync(path.join(__dirname, '..', relative), 'utf8')
    .replace(/\r\n?/gu, '\n');
}

test('pane markup starts with useful disconnected or first-use guidance', () => {
  const html = source('renderer/index.html');

  assert.match(
    html,
    /id="communications-empty"[^>]*>No communications yet\. New channel traffic will appear here as it arrives\.<\/p>/u
  );
  assert.match(
    html,
    /id="affects-empty"[^>]*>Connect to see active affects\.<\/p>/u
  );
  assert.match(
    html,
    /id="context-deck-empty"[^>]*>[\s\n]*Connect to receive room and character actions\.[\s\n]*<\/p>/u
  );
});

test('Communications empty state distinguishes first use, filters, and search', () => {
  const renderer = source('renderer/renderer.js');

  assert.match(renderer, /function communicationEmptyStateText\(\)/u);
  assert.match(renderer, /if \(search\) return `No messages match “\$\{search\}” in \$\{channelLabel\}\.`/u);
  assert.match(renderer, /No communications yet\. New channel traffic will appear here as it arrives\./u);
  assert.match(renderer, /No \$\{communicationChannelLabel\(activeChannel\)\} messages in the current history\./u);
});

test('Communications renderer refreshes guidance whenever the current view changes', () => {
  const renderer = source('renderer/renderer.js');

  assert.match(
    renderer,
    /container\.replaceChildren\(fragment\);\s*empty\.textContent = communicationEmptyStateText\(\);\s*empty\.hidden = visible\.length > 0;/u
  );
  assert.match(
    renderer,
    /#communications-search'\)\.addEventListener\('input', \(\) => renderCommunicationMessages/u
  );
  assert.match(
    renderer,
    /setCommunicationChannel[\s\S]*renderCommunicationMessages\(\{ snapToLive: true \}\)/u
  );
});

test('Affects empty state distinguishes disconnected, waiting, and genuinely empty', () => {
  const renderer = source('renderer/renderer.js');

  assert.match(
    renderer,
    /empty\.textContent = !state\.connected\s*\? 'Connect to see active affects\.'\s*: !state\.affects\.receivedAtMs\s*\? 'Waiting for NukeFire to report active affects\.'\s*: classicMode\s*\? 'No active timed affects\.'\s*: 'No active timed or spell affects\.';/u
  );
  assert.match(
    renderer,
    /summary\.textContent = groups\.length[\s\S]*: empty\.textContent;/u
  );
});

test('NukeFire Console empty state explains whether to connect or refresh', () => {
  const renderer = source('renderer/renderer.js');

  assert.match(
    renderer,
    /empty\.textContent = state\.connected\s*\? 'Waiting for NukeFire action data\. Refresh Console can request it again\.'\s*: 'Connect to receive room and character actions\.';/u
  );
  assert.match(renderer, /refresh\.disabled = !state\.connected;/u);
});
