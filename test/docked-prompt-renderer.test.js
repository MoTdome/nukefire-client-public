'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const highlights = require('../src/highlight-engine');
const sessions = require('../src/session-runtime');
const promptDisplay = require('../src/prompt-display');
const { installFakeXterm } = require('./fake-xterm');

async function flush(dom) {
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
  await new Promise((resolve) => setImmediate(resolve));
}

function makeClient(dom, handlers) {
  dom.window.NukeFireAnsi = ansi;
  dom.window.NukeFireHighlights = highlights;
  dom.window.NukeFireSessions = sessions;
  dom.window.NukeFirePromptDisplay = promptDisplay;
  const xterms = installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onError: () => {},
    onMenuConnect: () => {},
    onMenuFind: () => {}
  };
  return xterms;
}

test('docked prompt keeps completed group lines in output and replaces only the GA tail', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://nukefire.test/' });
  const handlers = {};
  const xterms = makeClient(dom, handlers);
  dom.window.localStorage.setItem('nukefire.promptDisplayMode', 'docked');
  dom.window.eval(source);
  await flush(dom);

  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({
    packageName: 'Char.Status',
    body: { name: 'Caul' },
    state: { char: { status: { name: 'Caul' } }, room: {}, map: {}, gps: {}, context: {}, controls: {}, affects: {}, knowledge: {}, comm: {}, group: null, extras: {}, meta: {} }
  });
  handlers.text('  Shai H100% M100% V100%\n\u001b[31m925H\u001b[0m 411M 803V >');
  handlers.boundary({ type: 'ga' });
  await flush(dom);

  const output = dom.window.document.querySelector('#output');
  const row = dom.window.document.querySelector('#docked-prompt-row');
  const content = dom.window.document.querySelector('#docked-prompt-content');
  assert.match(output.textContent, /Shai H100% M100% V100%/u);
  assert.doesNotMatch(output.textContent, /925H 411M 803V >/u);
  assert.equal(row.hidden, false);
  assert.equal(content.textContent, '925H 411M 803V >');
  assert.match(row.getAttribute('aria-label'), /Current NukeFire prompt: 925H 411M 803V >/u);
  const firstWrites = xterms[0].calls.filter(([name]) => name === 'writeRuns');
  // The startup status line's withheld terminator is released immediately
  // before this first real MUD line. That advances xterm without leaving the
  // captured prompt's former row empty in scrollback.
  assert.equal(firstWrites.at(-1)[1].map((run) => run.text).join(''), '\n  Shai H100% M100% V100%');

  handlers.text('The room trembles.\n\u001b[32m900H\u001b[0m 400M 780V >');
  handlers.boundary({ type: 'eor' });
  await flush(dom);
  assert.equal(content.textContent, '900H 400M 780V >');
  assert.doesNotMatch(output.textContent, /900H 400M 780V >/u);
  const secondWrites = xterms[0].calls.filter(([name]) => name === 'writeRuns');
  assert.equal(secondWrites.at(-1)[1].map((run) => run.text).join(''), '\nThe room trembles.');
});

test('login prompts stay inline and hidden mode suppresses only established playing prompts', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://nukefire.test/' });
  const handlers = {};
  makeClient(dom, handlers);
  dom.window.localStorage.setItem('nukefire.promptDisplayMode', 'hidden');
  dom.window.eval(source);
  await flush(dom);

  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.text('Name: ');
  handlers.boundary({ type: 'ga' });
  await flush(dom);
  assert.match(dom.window.document.querySelector('#output').textContent, /Name: /u);

  handlers.gmcp({
    packageName: 'Char.Status',
    body: { name: 'Caul' },
    state: { char: { status: { name: 'Caul' } }, room: {}, map: {}, gps: {}, context: {}, controls: {}, affects: {}, knowledge: {}, comm: {}, group: null, extras: {}, meta: {} }
  });
  handlers.text('100H 50M 80V >');
  handlers.boundary({ type: 'ga' });
  await flush(dom);
  assert.doesNotMatch(dom.window.document.querySelector('#output').textContent, /100H 50M 80V >/u);
  assert.equal(dom.window.document.querySelector('#docked-prompt-row').hidden, true);
});

test('docked prompt does not require Char.Status identity once GA marks NukeFire final greater-than tail', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://nukefire.test/' });
  const handlers = {};
  makeClient(dom, handlers);
  dom.window.localStorage.setItem('nukefire.promptDisplayMode', 'docked');
  dom.window.eval(source);
  await flush(dom);

  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.text('Name: ');
  handlers.boundary({ type: 'ga' });
  await flush(dom);
  assert.match(dom.window.document.querySelector('#output').textContent, /Name: /u);

  handlers.text('\u001b[36m925H 411M 803V >\u001b[0m');
  handlers.boundary({ type: 'ga' });
  await flush(dom);

  assert.doesNotMatch(dom.window.document.querySelector('#output').textContent, /925H 411M 803V >/u);
  assert.equal(dom.window.document.querySelector('#docked-prompt-row').hidden, false);
  assert.equal(dom.window.document.querySelector('#docked-prompt-content').textContent, '925H 411M 803V >');
});

test('changing the real Prompt display preference from Inline to Docked takes effect immediately', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://nukefire.test/' });
  const handlers = {};
  makeClient(dom, handlers);
  dom.window.localStorage.setItem('nukefire.promptDisplayMode', 'inline');
  dom.window.eval(source);
  await flush(dom);

  handlers.status({ state: 'connected', message: 'Connected' });
  const control = dom.window.document.querySelector('#prompt-display-mode');
  assert.equal(control.value, 'inline');

  control.value = 'docked';
  control.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await flush(dom);
  assert.equal(dom.window.localStorage.getItem('nukefire.promptDisplayMode'), 'docked');

  handlers.text('\u001b[36m< 34473H 8757M 8253V AFK [Lvl 50, Ready to Remort!] >\u001b[0m');
  handlers.boundary({ type: 'ga' });
  await flush(dom);

  const output = dom.window.document.querySelector('#output');
  const row = dom.window.document.querySelector('#docked-prompt-row');
  const content = dom.window.document.querySelector('#docked-prompt-content');
  assert.doesNotMatch(output.textContent, /34473H 8757M 8253V/u);
  assert.equal(row.hidden, false);
  assert.equal(content.textContent, '< 34473H 8757M 8253V AFK [Lvl 50, Ready to Remort!] >');
});
