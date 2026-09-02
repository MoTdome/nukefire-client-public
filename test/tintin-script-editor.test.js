'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('main process confines TinTin editing to ScriptStore resolution and regular native opens', () => {
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const store = fs.readFileSync(path.join(root, 'src', 'script-store.js'), 'utf8');
  assert.match(main, /scriptStore\.resolve\(requested\)/u);
  assert.match(main, /scriptStore\.resolveSelectedPath\(selection\.filePaths\[0\]\)/u);
  assert.match(main, /shell\.openPath\(resolved\.filepath\)/u);
  assert.match(store, /Only files directly inside the NukeFire Scripts folder/u);
  assert.match(store, /!stat\.isFile\(\) \|\| stat\.isSymbolicLink\(\)/u);
});

test('renderer opens scripts from command and menu events with visible accessible feedback', async () => {
  let JSDOM;
  try {
    ({ JSDOM } = require('jsdom'));
  } catch (_error) {
    return;
  }
  const ansi = require('../src/ansi-parser');
  const { installFakeXterm } = require('./fake-xterm');
  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const rendererSource = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://nukefire.test/' });
  const handlers = {};
  const edits = [];
  let folders = 0;

  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    listSessions: async () => ({ activeSessionId: 'main', sessions: [{ id: 'main', name: 'Main', role: 'tank', host: 'mud.test', port: 4000 }], groups: {}, commandPrefix: '#', speedwalk: { enabled: true } }),
    restoreSessions: async (snapshot) => ({ snapshot }),
    editTinTinScript: async (requested) => {
      edits.push(requested);
      return { ok: true, filename: requested ? 'Prime.tin' : 'Picked.tin', info: { directory: '/Documents/NukeFire Client/Scripts' } };
    },
    showTinTinScriptsFolder: async () => {
      folders += 1;
      return { ok: true, info: { directory: '/Documents/NukeFire Client/Scripts' } };
    },
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null, loadSettings: async () => null, saveSettings: async () => ({ ok: true }),
    loadMap: async () => null,
    onText: () => {}, onStatus: () => {}, onEcho: () => {}, onGmcp: () => {},
    onPromptBoundary: () => {}, onError: () => {}, onMenuConnect: () => {},
    onMenuFind: () => {}, onMenuPreferences: () => {}, onMenuFocusCommand: () => {},
    onMenuFocusOutput: () => {}, onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onMenuEditTinTinScript: (callback) => { handlers.menuEdit = callback; },
    onMenuShowTinTinScriptsFolder: (callback) => { handlers.menuFolder = callback; },
    onSessionEvent: (callback) => { handlers.session = callback; },
    onSessionsChanged: () => {}
  };

  dom.window.eval(rendererSource);
  await new Promise((resolve) => setTimeout(resolve, 20));
  handlers.session({ sessionId: 'main', type: 'script-edit-request', payload: { requested: 'Prime' } });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(edits, ['Prime']);
  assert.match(dom.window.document.querySelector('#output').textContent, /OPENED Prime\.tin/u);
  assert.match(dom.window.document.querySelector('#output').textContent, /USE #reload TO REPLACE THE ACTIVE PRIVATE PROFILE CLEANLY/u);

  handlers.menuEdit();
  handlers.menuFolder();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(edits, ['Prime', '']);
  assert.equal(folders, 1);
  assert.match(dom.window.document.querySelector('#output').textContent, /OPENED TINTIN SCRIPTS FOLDER/u);
});
