'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const keybindings = require('../src/keybinding-engine');
const macros = require('../src/macro-engine');
const semanticControls = require('../src/semantic-controls');
const { installFakeXterm } = require('./fake-xterm');

function setupRenderer(macroSnapshot) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });
  const handlers = {};
  const sent = [];
  const routed = [];
  dom.window.NukeFireAnsi = ansi;
  dom.window.NukeFireKeybindings = keybindings;
  dom.window.NukeFireMacros = macros;
  dom.window.NukeFireSemanticControls = semanticControls;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async (command) => { sent.push(command); return { ok: true }; },
    routeCommand: async (_sessionId, command) => {
      routed.push(command);
      const commands = command === '#if {0} {north};#else {south}'
        ? ['south']
        : String(command).split(';').map((entry) => entry.trim()).filter(Boolean);
      sent.push(...commands);
      return {
        deliveries: commands.map((entry) => ({ queued: true, sessionId: 'main', command: entry })),
        messages: []
      };
    },
    listSessions: async () => ({
      snapshot: {
        activeSessionId: 'main',
        sessions: [{ id: 'main', name: 'Main', role: 'tank', host: 'mud.test', port: 4000 }],
        groups: {}, aliases: [], variables: [], functions: [],
        actions: { enabled: true, definitions: [] },
        gags: { enabled: true, definitions: [] },
        highlights: { enabled: true, definitions: [] },
        substitutes: { enabled: true, definitions: [] },
        macros: macroSnapshot,
        classes: { activeStack: [], definitions: [] },
        speedwalk: { enabled: true }, commandPrefix: '#'
      }
    }),
    sendGmcp: async () => ({ ok: true }),
    loadSettings: async () => ({
      settings: {
        macros: macroSnapshot,
        input: {
          repeatLastCommandOnEnter: true,
          showLastCommandInInput: false,
          commandPrefix: '#'
        }
      }
    }),
    onText: () => {},
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onPromptBoundary: () => {},
    onError: () => {},
    onMenuConnect: () => {},
    onMenuFind: () => {}
  };
  dom.window.eval(source);
  return { dom, handlers, sent, routed };
}

function press(dom, target, options) {
  const event = new dom.window.KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    location: 0,
    ...options
  });
  target.dispatchEvent(event);
  return event;
}

function nextTurn() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('TinTin macros use the normal command pipeline without disturbing draft text or manual history', async () => {
  const macroEngine = new macros.MacroEngine();
  assert.ok(macroEngine.define('F4', 'north; look'));
  const { dom, handlers, sent } = setupRenderer(macroEngine.snapshot());
  const document = dom.window.document;
  await nextTurn();
  await nextTurn();
  handlers.status({ state: 'connected', message: 'Connected' });

  const host = document.querySelector('#host');
  host.focus();
  press(dom, host, { code: 'F4', key: 'F4' });
  await nextTurn();
  assert.deepEqual(sent, []);

  const command = document.querySelector('#command');
  command.focus();
  command.value = 'score';
  press(dom, command, { code: 'Enter', key: 'Enter' });
  await nextTurn();
  assert.deepEqual(sent, ['score']);

  command.value = 'kill mutant';
  command.setSelectionRange(command.value.length, command.value.length);
  const dirtyEvent = press(dom, command, { code: 'F4', key: 'F4' });
  await nextTurn();
  await nextTurn();
  assert.deepEqual(sent, ['score']);
  assert.equal(dirtyEvent.defaultPrevented, false);
  assert.equal(command.value, 'kill mutant');
  assert.equal(command.selectionStart, 'kill mutant'.length);
  assert.equal(command.selectionEnd, 'kill mutant'.length);

  command.value = '';
  press(dom, command, { code: 'F4', key: 'F4' });
  await nextTurn();
  await nextTurn();
  assert.deepEqual(sent, ['score', 'north', 'look']);

  press(dom, command, { code: 'Enter', key: 'Enter' });
  await nextTurn();
  assert.deepEqual(sent, ['score', 'north', 'look', 'score']);

  handlers.echo(true);
  press(dom, command, { code: 'F4', key: 'F4' });
  await nextTurn();
  assert.deepEqual(sent, ['score', 'north', 'look', 'score']);

  dom.window.close();
});

test('TinTin macro conditional chains enter the coordinator as one adjacent batch', async () => {
  const macroEngine = new macros.MacroEngine();
  assert.ok(macroEngine.define('F5', '#if {0} {north};#else {south}'));
  const { dom, handlers, sent, routed } = setupRenderer(macroEngine.snapshot());
  await nextTurn();
  await nextTurn();
  handlers.status({ state: 'connected', message: 'Connected' });

  const command = dom.window.document.querySelector('#command');
  command.focus();
  command.value = '';
  press(dom, command, { code: 'F5', key: 'F5' });
  await nextTurn();
  await nextTurn();

  assert.equal(routed.at(-1), '#if {0} {north};#else {south}');
  assert.equal(sent.at(-1), 'south');
  assert.equal(command.value, '');
  dom.window.close();
});

