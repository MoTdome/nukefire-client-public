'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CONTROL_REQUEST_ACTIONS } = require('../src/semantic-controls');
const minimal = require('../server-integration/accessibility/minimal_client_controls_reference');

const root = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function referenceActions(text) {
  const match = text.match(/bool accessibility_control_action_allowed[\s\S]*?static const char \*allowed\[\] = \{([\s\S]*?)NULL/u);
  assert.ok(match, 'portable server allowlist is present');
  return new Set([...match[1].matchAll(/"((?:client|reader)\.[a-z0-9_.-]+)"/gu)].map((entry) => entry[1]));
}

test('Beta.76 client and public server references share one exact 75-action catalog', () => {
  const server = referenceActions(source('server-integration/accessibility/nukefire_controls_reference.c'));
  assert.equal(CONTROL_REQUEST_ACTIONS.size, 75);
  assert.deepEqual([...server].sort(), [...CONTROL_REQUEST_ACTIONS].sort());
  assert.deepEqual([...minimal.CONTROL_ACTIONS].sort(), [...CONTROL_REQUEST_ACTIONS].sort());
});

test('Beta.76 server protocol documents the consolidated accessibility command', () => {
  const protocol = source('server-integration/accessibility/CLIENT-CONTROLS-PROTOCOL.md');
  assert.match(protocol, /Exact Beta\.76 control action allowlist \(75\)/u);
  assert.match(protocol, /`reader\.accessibility\.command`/u);
  assert.doesNotMatch(protocol, /Exact Beta\.73 control action allowlist/u);
});
