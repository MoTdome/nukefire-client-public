'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const keybindings = require('../src/keybinding-engine');
const semanticControls = require('../src/semantic-controls');
const { installFakeXterm } = require('./fake-xterm');

function setupRenderer() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });
  const handlers = {};
  const sent = [];
  dom.window.NukeFireAnsi = ansi;
  dom.window.NukeFireKeybindings = keybindings;
  dom.window.NukeFireSemanticControls = semanticControls;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async (command) => { sent.push(command); return { ok: true }; },
    sendGmcp: async () => ({ ok: true }),
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
  return { dom, handlers, sent };
}

function press(dom, target, options) {
  const event = new dom.window.KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    location: 3,
    ...options
  });
  target.dispatchEvent(event);
  return event;
}

test('Numpad movement preset dispatches physical keys through the normal command path', async () => {
  const { dom, handlers, sent } = setupRenderer();
  const document = dom.window.document;
  handlers.status({ state: 'connected', message: 'Connected' });

  document.querySelector('#keybinding-install-numpad').click();
  assert.equal(document.querySelectorAll('[data-keybinding-id]').length, 11);
  assert.match(document.querySelector('#keybinding-status').textContent, /11 keyboard shortcuts/u);

  const command = document.querySelector('#command');
  command.focus();
  press(dom, command, { code: 'Numpad8', key: '8' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['north']);

  // KeyboardEvent.code remains Numpad6 even when Num Lock changes event.key.
  press(dom, command, { code: 'Numpad6', key: 'ArrowRight' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['north', 'east']);

  press(dom, command, { code: 'Numpad2', key: '2', repeat: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['north', 'east']);

  dom.window.close();
});

test('movement keybindings defer to active typing by default while secure input, Preferences, and the global disable switch still block them', async () => {
  const { dom, handlers, sent } = setupRenderer();
  const document = dom.window.document;
  handlers.status({ state: 'connected', message: 'Connected' });
  document.querySelector('#keybinding-install-numpad').click();

  const command = document.querySelector('#command');
  handlers.echo(true);
  press(dom, command, { code: 'Numpad8', key: '8' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, []);

  handlers.echo(false);
  command.value = 'say hello';
  command.setSelectionRange(command.value.length, command.value.length);
  const dirtyEvent = press(dom, command, { code: 'Numpad8', key: '8' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, []);
  assert.equal(dirtyEvent.defaultPrevented, false);
  assert.equal(command.value, 'say hello');
  assert.equal(command.selectionStart, 'say hello'.length);
  assert.equal(command.selectionEnd, 'say hello'.length);

  command.value = '';
  press(dom, command, { code: 'Numpad8', key: '8' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['north']);

  document.querySelector('#preferences-button').click();
  press(dom, document.querySelector('#keybinding-install-numpad'), { code: 'Numpad8', key: '8' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['north']);
  document.querySelector('#preferences-close').click();

  const enabled = document.querySelector('#keybindings-enabled');
  enabled.checked = false;
  enabled.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  command.focus();
  press(dom, command, { code: 'Numpad8', key: '8' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['north']);

  dom.window.close();
});


test('open terminal Find no longer globally disables hotkeys while its text field remains typing-safe', async () => {
  const { dom, handlers, sent } = setupRenderer();
  const document = dom.window.document;
  handlers.status({ state: 'connected', message: 'Connected' });
  document.querySelector('#keybinding-install-numpad').click();

  document.querySelector('#find-button').click();
  const findPanel = document.querySelector('#find-panel');
  const findInput = document.querySelector('#find-input');
  const command = document.querySelector('#command');
  assert.equal(findPanel.hidden, false);
  assert.equal(document.activeElement, findInput);

  command.focus();
  press(dom, command, { code: 'Numpad8', key: '8' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['north']);
  assert.equal(findPanel.hidden, false);

  findInput.focus();
  findInput.value = 'statue';
  const typingEvent = press(dom, findInput, { code: 'Numpad8', key: '8' });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['north']);
  assert.equal(typingEvent.defaultPrevented, false);
  assert.equal(findInput.value, 'statue');

  dom.window.close();
});

test('opt-in typing shortcuts preserve the draft and never become repeat-Enter history', async () => {
  const { dom, handlers, sent } = setupRenderer();
  const document = dom.window.document;
  handlers.status({ state: 'connected', message: 'Connected' });

  document.querySelector('#preferences-button').click();
  document.querySelector('#keybinding-add').click();
  document.querySelector('#keybinding-record').click();
  press(dom, document.querySelector('#keybinding-record'), {
    code: 'KeyW', key: 'W', location: 0, shiftKey: true
  });
  document.querySelector('#keybinding-command').value = 'north';
  document.querySelector('#keybinding-command').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  document.querySelector('#keybinding-form').dispatchEvent(new dom.window.Event('submit', {
    bubbles: true, cancelable: true
  }));
  assert.doesNotMatch(document.querySelector('#keybinding-list').textContent, /Fires while typing/u);
  document.querySelector('#preferences-close').click();

  const command = document.querySelector('#command');
  command.focus();
  command.value = 'gos Welcome';
  command.setSelectionRange(command.value.length, command.value.length);
  const defaultEvent = press(dom, command, {
    code: 'KeyW', key: 'W', location: 0, shiftKey: true
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, []);
  assert.equal(defaultEvent.defaultPrevented, false);
  assert.equal(command.value, 'gos Welcome');

  document.querySelector('#preferences-button').click();
  document.querySelector('[data-keybinding-id] button').click();
  document.querySelector('#keybinding-works-while-typing').checked = true;
  document.querySelector('#keybinding-form').dispatchEvent(new dom.window.Event('submit', {
    bubbles: true, cancelable: true
  }));
  assert.match(document.querySelector('#keybinding-list').textContent, /Shift \+ W[\s\S]*Fires while typing/u);
  document.querySelector('#preferences-close').click();

  document.querySelector('#repeat-last-command-on-enter').checked = true;
  command.focus();
  command.value = 'score';
  press(dom, command, { code: 'Enter', key: 'Enter', location: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['score']);

  command.value = 'gos Welcome Newbie!';
  command.setSelectionRange(command.value.length, command.value.length);
  const macroEvent = press(dom, command, {
    code: 'KeyW', key: 'W', location: 0, shiftKey: true
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['score', 'north']);
  assert.equal(macroEvent.defaultPrevented, true);
  assert.equal(command.value, 'gos Welcome Newbie!');

  command.value = '';
  press(dom, command, { code: 'Enter', key: 'Enter', location: 0 });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['score', 'north', 'score']);
  dom.window.close();
});



test('custom recorder adds, edits, and dispatches a physical-key shortcut', async () => {
  const { dom, handlers, sent } = setupRenderer();
  const document = dom.window.document;
  handlers.status({ state: 'connected', message: 'Connected' });
  document.querySelector('#preferences-button').click();
  document.querySelector('#keybinding-add').click();
  document.querySelector('#keybinding-record').click();
  press(dom, document.querySelector('#keybinding-record'), {
    code: 'KeyH', key: 'h', location: 0, ctrlKey: true
  });
  document.querySelector('#keybinding-command').value = 'heal';
  document.querySelector('#keybinding-command').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  document.querySelector('#keybinding-group').value = 'Combat';
  document.querySelector('#keybinding-form').dispatchEvent(new dom.window.Event('submit', {
    bubbles: true, cancelable: true
  }));

  assert.equal(document.querySelectorAll('[data-keybinding-id]').length, 1);
  assert.match(document.querySelector('#keybinding-list').textContent, /Ctrl \+ H — Combat — Custom/u);
  assert.match(document.querySelector('#keybinding-list').textContent, /heal/u);

  document.querySelector('[data-keybinding-id] button').click();
  document.querySelector('#keybinding-command').value = 'cast heal';
  document.querySelector('#keybinding-command').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  document.querySelector('#keybinding-form').dispatchEvent(new dom.window.Event('submit', {
    bubbles: true, cancelable: true
  }));
  document.querySelector('#preferences-close').click();

  const command = document.querySelector('#command');
  command.focus();
  press(dom, command, { code: 'KeyH', key: 'h', location: 0, ctrlKey: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['cast heal']);
  dom.window.close();
});

test('recorder requires explicit confirmation before replacing a conflicting shortcut', () => {
  const { dom } = setupRenderer();
  const document = dom.window.document;
  document.querySelector('#preferences-button').click();
  document.querySelector('#keybinding-install-numpad').click();
  document.querySelector('#keybinding-add').click();
  document.querySelector('#keybinding-record').click();
  press(dom, document.querySelector('#keybinding-record'), { code: 'Numpad8', key: '8' });
  document.querySelector('#keybinding-command').value = 'run north';
  document.querySelector('#keybinding-command').dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  assert.equal(document.querySelector('#keybinding-conflict').hidden, false);
  assert.equal(document.querySelector('#keybinding-save').disabled, true);
  document.querySelector('#keybinding-replace-conflict').checked = true;
  document.querySelector('#keybinding-replace-conflict').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(document.querySelector('#keybinding-save').disabled, false);
  document.querySelector('#keybinding-form').dispatchEvent(new dom.window.Event('submit', {
    bubbles: true, cancelable: true
  }));

  assert.equal(document.querySelectorAll('[data-keybinding-id]').length, 11);
  assert.match(document.querySelector('#keybinding-list').textContent, /Numpad 8 — General — Custom/u);
  assert.match(document.querySelector('#keybinding-list').textContent, /run north/u);
  dom.window.close();
});

test('Escape cancels recording and Tab remains available for Preferences navigation', () => {
  const { dom } = setupRenderer();
  const document = dom.window.document;
  document.querySelector('#preferences-button').click();
  document.querySelector('#keybinding-add').click();
  document.querySelector('#keybinding-record').click();
  press(dom, document.querySelector('#keybinding-record'), { code: 'Escape', key: 'Escape', location: 0 });
  assert.equal(document.querySelector('#keybinding-record').getAttribute('aria-pressed'), 'false');
  assert.equal(document.querySelector('#keybinding-recorded').textContent, 'No key recorded.');

  document.querySelector('#keybinding-record').click();
  press(dom, document.querySelector('#keybinding-record'), { code: 'Tab', key: 'Tab', location: 0 });
  assert.equal(document.querySelector('#keybinding-record').getAttribute('aria-pressed'), 'false');
  assert.match(document.querySelector('#keybinding-recorder-status').textContent, /Select Record Key/u);
  dom.window.close();
});


test('semantic hotkeys resolve combo, GroupAssist, and path controls from GMCP', async () => {
  const { dom, handlers, sent } = setupRenderer();
  const document = dom.window.document;
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({
    packageName: 'NukeFire.Controls',
    path: ['controls', 'state'],
    body: {
      schema: 1,
      combo: {
        activeProfile: 'breaker',
        active: [{ id: 1, name: 'bash' }],
        profiles: [{
          name: 'breaker',
          skills: [{ id: 1, name: 'bash' }, { id: 2, name: 'kick' }, { id: 3, name: 'tigerpunch' }]
        }],
        actions: []
      },
      groupassist: {
        summary: 'Configuration, not a combat attack.',
        targets: [{ target: 'Prime', nextIndex: 0, actions: ['bash', 'kick', 'tigerpunch'] }],
        actions: []
      },
      path: {
        actions: [{ id: 'path-step', label: 'Advance Active Path', command: 'path step', kind: 'execute' }]
      }
    }
  });

  document.querySelector('#preferences-button').click();
  assert.match(document.querySelector('#keybinding-server-controls').textContent, /1 combo profile/u);

  async function addSemantic({ code, key, type, id }) {
    document.querySelector('#keybinding-add').click();
    document.querySelector('#keybinding-record').click();
    press(dom, document.querySelector('#keybinding-record'), { code, key, location: 0 });
    const typeSelect = document.querySelector('#keybinding-type');
    typeSelect.value = type;
    typeSelect.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    const semantic = document.querySelector('#keybinding-semantic-id');
    semantic.value = id;
    semantic.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    document.querySelector('#keybinding-form').dispatchEvent(new dom.window.Event('submit', {
      bubbles: true, cancelable: true
    }));
  }

  await addSemantic({ code: 'F5', key: 'F5', type: 'combo-profile', id: 'breaker' });
  await addSemantic({ code: 'F6', key: 'F6', type: 'groupassist-rotation', id: 'Prime' });
  await addSemantic({ code: 'F7', key: 'F7', type: 'path-action', id: 'path-step' });

  assert.match(document.querySelector('#keybinding-list').textContent, /Combo profile/u);
  assert.match(document.querySelector('#keybinding-list').textContent, /GroupAssist rotation/u);
  assert.match(document.querySelector('#keybinding-list').textContent, /Path control/u);
  document.querySelector('#preferences-close').click();

  const command = document.querySelector('#command');
  command.focus();
  press(dom, command, { code: 'F5', key: 'F5', location: 0 });
  press(dom, command, { code: 'F6', key: 'F6', location: 0 });
  press(dom, command, { code: 'F7', key: 'F7', location: 0 });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(sent, [
    'combo load breaker',
    'groupassist Prime bash kick tigerpunch',
    'path step'
  ]);
  dom.window.close();
});
