'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const { installFakeXterm } = require('./fake-xterm');
const mapper = require('../src/mapper');
const communications = require('../src/communications');
const panelWindows = require('../src/panel-window-state');
const context = require('../src/context-deck');
const affects = require('../src/affects');
const sessionsRuntime = require('../src/session-runtime');
const highlights = require('../src/highlight-engine');
const substitutes = require('../src/substitute-engine');
const clientCommands = require('../src/client-command-parser');
const pipelineDebug = require('../src/pipeline-debug');
const macros = require('../src/macro-engine');
const promptDisplay = require('../src/prompt-display');

function wait(ms = 35) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setup(options = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/'
  });
  const handlers = {};
  const routed = [];
  const restoredSnapshots = [];
  const savedSettings = [];
  const pipelineDebugChanges = [];
  const pipelineDebugClears = [];
  const clipboardWrites = [];
  let snapshot = options.snapshot || {
    activeSessionId: 'tank',
    sessions: [
      { id: 'tank', name: 'Caul', role: 'tank', host: 'tdome.nukefire.org', port: 4000, connected: true, status: { state: 'connected', message: 'Connected' } },
      { id: 'healer', name: 'Shai', role: 'healer', host: 'tdome.nukefire.org', port: 4000, connected: true, status: { state: 'connected', message: 'Connected' } }
    ],
    groups: { crew: { name: 'crew', members: ['tank', 'healer'], leader: 'tank' } },
    aliases: [],
    variables: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    speedwalk: { enabled: false }
  };

  Object.assign(dom.window, {
    NukeFireAnsi: ansi,
    NukeFireMapper: mapper,
    NukeFireCommunications: communications,
    NukeFirePanelWindows: panelWindows,
    NukeFireContext: context,
    NukeFireAffects: affects,
    NukeFireSessions: sessionsRuntime,
    NukeFireHighlights: highlights,
    NukeFireSubstitutes: substitutes,
    NukeFirePipelineDebug: pipelineDebug,
    NukeFireMacros: macros,
    NukeFirePromptDisplay: promptDisplay
  });
  const xterms = installFakeXterm(dom);
  dom.window.nukefire = {
    listSessions: async () => ({ ok: true, snapshot }),
    createSession: async (options = {}) => {
      const id = String(options.name || 'session').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '') || 'session';
      const session = {
        id, name: options.name || 'Session', role: options.role || 'member',
        host: options.host || 'tdome.nukefire.org', port: options.port || 4000,
        connected: false, status: { state: 'disconnected', message: 'Disconnected' }
      };
      snapshot = { ...snapshot, sessions: [...snapshot.sessions, session] };
      return { ok: true, session, snapshot };
    },
    updateSession: async (id, changes) => {
      snapshot.sessions = snapshot.sessions.map((item) => item.id === id ? { ...item, ...changes } : item);
      return { ok: true, snapshot };
    },
    removeSession: async (id) => {
      snapshot = {
        ...snapshot,
        activeSessionId: snapshot.activeSessionId === id ? snapshot.sessions.find((item) => item.id !== id)?.id || '' : snapshot.activeSessionId,
        sessions: snapshot.sessions.filter((item) => item.id !== id)
      };
      return { ok: true, snapshot };
    },
    setActiveSession: async (id) => {
      snapshot = { ...snapshot, activeSessionId: id };
      return { ok: true, snapshot };
    },
    restoreSessions: async (saved) => {
      restoredSnapshots.push(JSON.parse(JSON.stringify(saved)));
      snapshot = { ...snapshot, ...saved };
      return { ok: true, snapshot };
    },
    connectSession: async () => ({ ok: true, snapshot }),
    disconnectSession: async () => ({ ok: true, snapshot }),
    routeCommand: async (sourceId, command) => {
      routed.push({ sourceId, command });
      if (typeof options.routeCommand === 'function') {
        return options.routeCommand({ sourceId, command, snapshot });
      }
      return { ok: true, deliveries: [], messages: [], snapshot };
    },
    analyzeCommandLine: (command, prefix, parserOptions) => clientCommands.analyzeCommandLine(command, prefix, parserOptions),
    getPipelineDebug: async (id) => {
      const session = snapshot.sessions.find((item) => item.id === id);
      return { ok: true, snapshot: { ...(session?.pipelineDebug || {}), entries: [] } };
    },
    setPipelineDebug: async (id, changes) => {
      pipelineDebugChanges.push({ id, changes: { ...changes } });
      snapshot.sessions = snapshot.sessions.map((item) => item.id === id
        ? { ...item, pipelineDebug: { ...(item.pipelineDebug || {}), ...changes } }
        : item);
      const session = snapshot.sessions.find((item) => item.id === id);
      return { ok: true, snapshot: { ...(session?.pipelineDebug || {}), entries: [] } };
    },
    clearPipelineDebug: async (id) => {
      pipelineDebugClears.push(id);
      return { ok: true, snapshot: { enabled: true, maxEntries: 100, entries: [] } };
    },
    writeClipboardText: async (text) => {
      clipboardWrites.push(String(text));
      return { ok: true };
    },
    sendSessionGmcp: async () => ({ ok: true }),
    setSessionTerminalSize: async () => ({ ok: true }),
    setSessionClientPreferences: async () => ({ ok: true }),
    getSessionGmcpState: async () => null,
    loadSettings: async () => ({ settings: options.settings || null }),
    saveSettings: async (settings) => {
      savedSettings.push(JSON.parse(JSON.stringify(settings)));
      return { ok: true, settings };
    },
    loadMap: async () => ({ ok: true, map: mapper.normalizeMapData({}) }),
    saveMap: async (map) => ({ ok: true, map }),
    onSessionEvent: (callback) => { handlers.event = callback; },
    onSessionsChanged: (callback) => { handlers.sessions = callback; },
    onMenuConnect: () => {}, onMenuFind: () => {}, onMenuPreferences: () => {},
    onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {},
    onMenuReadLastLine: (callback) => { handlers.menuReadLastLine = callback; },
    onMenuReadVitals: (callback) => { handlers.menuReadVitals = callback; },
    onPanelBoundsChanged: () => {}, onPanelClosed: () => {}, onPanelAction: () => {}
  };
  if (options.nativeEventBatches) {
    delete dom.window.nukefire.onSessionEvent;
    dom.window.nukefire.onSessionEventBatch = (callback) => { handlers.eventBatch = callback; };
  }
  if (options.promptDisplayMode) {
    dom.window.localStorage.setItem(
      'nukefire.promptDisplayMode',
      options.promptDisplayMode
    );
  }
  dom.window.eval(source);
  return {
    dom,
    handlers,
    routed,
    restoredSnapshots,
    savedSettings,
    pipelineDebugChanges,
    pipelineDebugClears,
    clipboardWrites,
    xterms,
    getSnapshot: () => snapshot
  };
}

test('inactive session output is retained with unread state and restored on tab switch', async () => {
  const { dom, handlers } = setup();
  await wait(60);
  const document = dom.window.document;

  handlers.event({ sessionId: 'tank', type: 'text', payload: 'Tank output\n' });
  handlers.event({ sessionId: 'healer', type: 'text', payload: 'Healer output\nHP: 75/100\n' });
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));

  assert.match(document.querySelector('#output').textContent, /Tank output/u);
  assert.doesNotMatch(document.querySelector('#output').textContent, /Healer output/u);
  const healerTab = document.querySelector('[data-session-id="healer"]');
  assert.equal(healerTab.querySelector('.session-tab-unread').hidden, false);

  healerTab.click();
  await wait(20);
  assert.match(document.querySelector('#output').textContent, /Healer output/u);
  assert.doesNotMatch(document.querySelector('#output').textContent, /Tank output/u);
  assert.equal(document.querySelector('#hp-text').textContent, '75 / 100 · 75%');
  const activeHealerTab = document.querySelector('[data-session-id="healer"]');
  assert.equal(activeHealerTab.getAttribute('aria-selected'), 'true');
  assert.equal(activeHealerTab.querySelector('.session-tab-unread').hidden, true);
  dom.window.close();
});


test('Session Vitals panel shows same-server companions while the docked prompt stays one line', async () => {
  const snapshot = {
    activeSessionId: 'tank',
    sessions: [
      {
        id: 'tank', name: 'Caul', role: 'tank',
        host: 'tdome.nukefire.org', port: 4000,
        connected: true, status: { state: 'connected', message: 'Connected' }
      },
      {
        id: 'healer', name: 'Shai', role: 'healer',
        host: 'tdome.nukefire.org', port: 4000,
        connected: true, status: { state: 'connected', message: 'Connected' }
      },
      {
        id: 'other', name: 'Other', role: 'damage',
        host: 'other.example.org', port: 4000,
        connected: true, status: { state: 'connected', message: 'Connected' }
      },
      {
        id: 'sleeping', name: 'Sleeping', role: 'member',
        host: 'tdome.nukefire.org', port: 4000,
        connected: false, status: { state: 'disconnected', message: 'Disconnected' }
      }
    ],
    groups: {},
    aliases: [],
    variables: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    speedwalk: { enabled: false }
  };

  const { dom, handlers } = setup({
    snapshot,
    promptDisplayMode: 'docked'
  });
  await wait(60);
  const document = dom.window.document;

  handlers.event({
    sessionId: 'tank',
    type: 'text',
    payload: '\u001b[36m< 900H 500M 800V AFK [Lvl 50] >\u001b[0m'
  });
  handlers.event({
    sessionId: 'tank',
    type: 'boundary',
    payload: { type: 'ga' }
  });

  handlers.event({
    sessionId: 'healer',
    type: 'gmcp-state',
    payload: {
      char: {
        status: { name: 'Shai' },
        vitals: { hp: 24, maxHp: 100, mana: 400, maxMana: 500, move: 780, maxMove: 900 }
      },
      room: {}, map: {}, gps: {}, context: {}, controls: {}, affects: {},
      knowledge: {}, comm: {}, group: null, extras: {}, meta: {}
    }
  });
  handlers.event({
    sessionId: 'healer',
    type: 'text',
    payload: '\u001b[35m< 24H 400M 780V AFK [Lvl 50] >\u001b[0m'
  });
  handlers.event({
    sessionId: 'healer',
    type: 'boundary',
    payload: { type: 'ga' }
  });

  handlers.event({
    sessionId: 'other',
    type: 'text',
    payload: '< 10H 20M 30V >'
  });
  handlers.event({
    sessionId: 'other',
    type: 'boundary',
    payload: { type: 'ga' }
  });

  await wait(30);

  const promptRow = document.querySelector('#docked-prompt-row');
  const panel = document.querySelector('#panel-session-vitals');
  const companions = [...document.querySelectorAll('.session-vital-row')];
  const firstCompanionRow = companions[0];

  assert.equal(promptRow.hidden, false);
  assert.equal(promptRow.textContent.trim(), '< 900H 500M 800V AFK [Lvl 50] >');
  assert.equal(document.querySelectorAll('.docked-prompt-companion').length, 0);
  assert.equal(panel.hidden, false);
  assert.equal(companions.length, 1);
  assert.equal(companions[0].dataset.sessionId, 'healer');
  assert.equal(companions[0].querySelector('.session-vital-name').textContent, 'Shai');
  assert.equal(companions[0].querySelector('.session-vital-health').textContent, '24H');
  assert.equal(companions[0].querySelector('.session-vital-mana').textContent, '400M');
  assert.equal(companions[0].querySelector('.session-vital-move').textContent, '780V');
  assert.equal(
    companions[0].querySelector('.session-vital-health').classList.contains(
      'session-vital-health-low'
    ),
    true
  );
  assert.match(companions[0].getAttribute('aria-label'), /Companion session Shai, low health/u);
  assert.doesNotMatch(document.querySelector('#session-vitals-list').textContent, /Other|Sleeping/u);
  assert.equal(document.querySelector('#session-vitals-empty').hidden, true);

  handlers.event({
    sessionId: 'healer',
    type: 'gmcp-state',
    payload: {
      char: {
        status: { name: 'Shai' },
        vitals: { hp: 25, maxHp: 100, mana: 401, maxMana: 500, move: 781, maxMove: 900 }
      },
      room: {}, map: {}, gps: {}, context: {}, controls: {}, affects: {},
      knowledge: {}, comm: {}, group: null, extras: {}, meta: {}
    }
  });
  handlers.event({
    sessionId: 'healer',
    type: 'text',
    payload: '< 25H 401M 781V >'
  });
  handlers.event({
    sessionId: 'healer',
    type: 'boundary',
    payload: { type: 'ga' }
  });
  await wait(20);

  const exactThreshold = document.querySelector(
    '.session-vital-row[data-session-id="healer"]'
  );
  assert.equal(exactThreshold, firstCompanionRow);
  assert.equal(exactThreshold.querySelector('.session-vital-health').textContent, '25H');
  assert.equal(
    exactThreshold.querySelector('.session-vital-health').classList.contains(
      'session-vital-health-low'
    ),
    false
  );
  assert.doesNotMatch(exactThreshold.getAttribute('aria-label'), /low health/u);

  handlers.event({
    sessionId: 'healer',
    type: 'status',
    payload: { state: 'disconnected', message: 'Disconnected' }
  });
  await wait(20);
  assert.equal(document.querySelectorAll('.session-vital-row').length, 0);
  assert.equal(document.querySelector('#session-vitals-empty').hidden, false);
  assert.equal(
    document.querySelector('#docked-prompt-row').textContent.trim(),
    '< 900H 500M 800V AFK [Lvl 50] >'
  );

  dom.window.close();
});

test('native session-event batches update companion-vitals rows in place while preserving the final state', async () => {
  const { dom, handlers } = setup({ nativeEventBatches: true });
  await wait(60);
  const document = dom.window.document;
  const list = document.querySelector('#session-vitals-list');

  handlers.eventBatch([{
    sessionId: 'healer',
    type: 'gmcp',
    payload: { packageName: 'Char.Vitals', body: { hp: 75, maxHp: 100, mana: 400, maxMana: 500, move: 700, maxMove: 900 } }
  }]);
  const firstRow = document.querySelector('.session-vital-row[data-session-id="healer"]');
  assert.ok(firstRow);

  const originalReplaceChildren = list.replaceChildren.bind(list);
  let fullRebuilds = 0;
  list.replaceChildren = (...args) => {
    fullRebuilds += 1;
    return originalReplaceChildren(...args);
  };

  handlers.eventBatch([
    {
      sessionId: 'healer',
      type: 'gmcp',
      payload: { packageName: 'Char.Vitals', body: { hp: 50, maxHp: 100, mana: 400, maxMana: 500, move: 700, maxMove: 900 } }
    },
    {
      sessionId: 'healer',
      type: 'gmcp',
      payload: { packageName: 'Char.Vitals', body: { hp: 24, maxHp: 100, mana: 401, maxMana: 500, move: 701, maxMove: 900 } }
    }
  ]);

  assert.equal(fullRebuilds, 0);
  const healer = document.querySelector('.session-vital-row[data-session-id="healer"]');
  assert.equal(healer, firstRow);
  assert.equal(healer.querySelector('.session-vital-health').textContent, '24H');
  assert.equal(healer.querySelector('.session-vital-mana').textContent, '401M');
  assert.equal(healer.querySelector('.session-vital-move').textContent, '701V');
  assert.equal(healer.querySelector('.session-vital-health').classList.contains('session-vital-health-low'), true);
  dom.window.close();
});

test('Communications-only text events bypass the terminal for gagged channel lines', async () => {
  const { dom, handlers } = setup();
  await wait(60);
  const document = dom.window.document;

  handlers.event({
    sessionId: 'tank',
    type: 'communication-text',
    payload: "Mo gossips, 'Comms only.'\n"
  });
  await wait(20);

  assert.doesNotMatch(document.querySelector('#output').textContent, /Comms only\./u);
  const messages = document.querySelectorAll('[data-communication-message][data-channel="gossip"]');
  assert.equal(messages.length, 1);
  assert.match(messages[0].textContent, /Comms only\./u);
  dom.window.close();
});

test('command line sends TinTin-style routing syntax to the session coordinator', async () => {
  const { dom, routed } = setup();
  await wait(60);
  const command = dom.window.document.querySelector('#command');
  command.value = '#healer heal Caul';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  command.value = '#all score';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await wait(20);
  assert.deepEqual(routed, [
    { sourceId: 'tank', command: '#healer heal Caul' },
    { sourceId: 'tank', command: '#all score' }
  ]);
  dom.window.close();
});



test('command line batches keep one history entry and classify mixed client and server input correctly', async () => {
  const { dom, routed } = setup();
  await wait(60);
  const document = dom.window.document;
  const command = document.querySelector('#command');

  command.value = '#showme {Ready};look';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await wait(20);
  assert.deepEqual(routed.at(-1), { sourceId: 'tank', command: '#showme {Ready};look' });

  command.value = '#links;score';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await wait(20);
  assert.deepEqual(routed.at(-1), { sourceId: 'tank', command: 'score' });
  assert.match(dom.window.document.querySelector('#output').textContent, /No recent server hyperlinks/u);

  command.value = '';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowUp', bubbles: true, cancelable: true
  }));
  assert.equal(command.value, '#links;score');

  command.value = '#sh';
  command.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  command.setSelectionRange(command.value.length, command.value.length);
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowUp', bubbles: true, cancelable: true
  }));
  assert.equal(command.value, '#showme {Ready};look');
  dom.window.close();
});

test('New Session opens the real creation form directly and creates a named session', async () => {
  const { dom } = setup();
  await wait(60);
  const document = dom.window.document;
  const drawer = document.querySelector('#session-create-drawer');
  const form = document.querySelector('#session-create-form');
  const name = document.querySelector('#session-new-name');
  const submit = document.querySelector('#session-create-submit');

  document.querySelector('#session-add').click();
  assert.equal(drawer.hidden, false);
  assert.equal(document.querySelector('#session-create-tab'), null);
  assert.equal(document.activeElement, name);
  assert.equal(submit.disabled, true);

  name.value = 'Vect';
  name.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(submit.disabled, false);
  document.querySelector('#session-new-role').value = 'damage';
  form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(35);
  const vect = document.querySelector('[data-session-id="vect"]');
  assert.ok(vect);
  assert.equal(vect.getAttribute('aria-selected'), 'true');
  assert.match(vect.textContent, /damage/iu);
  assert.equal(drawer.hidden, true);
  dom.window.close();
});

test('new-session creation requires a name and rejects an existing display name', async () => {
  const { dom } = setup();
  await wait(60);
  const document = dom.window.document;
  const name = document.querySelector('#session-new-name');
  const submit = document.querySelector('#session-create-submit');
  document.querySelector('#session-add').click();

  assert.equal(name.required, true);
  assert.equal(submit.disabled, true);
  name.value = '  caul  ';
  name.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(submit.disabled, false);
  assert.equal(name.getAttribute('aria-invalid'), 'true');
  assert.equal(name.validationMessage, 'That session name is already in use.');

  document.querySelector('#session-create-form').dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(20);
  assert.equal(document.querySelectorAll('[data-session-id="tank"]').length, 1);
  assert.equal(document.querySelector('[data-session-id="caul"]'), null);
  dom.window.close();
});

test('session bar exposes one keyboard-operable creation surface in normal layout flow', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
  const document = new JSDOM(html).window.document;
  assert.equal(document.querySelector('#session-tabs').getAttribute('role'), 'tablist');
  assert.equal(document.querySelector('#session-add').getAttribute('aria-controls'), 'session-create-drawer');
  assert.equal(document.querySelector('#session-create-tab'), null);
  assert.equal(document.querySelector('#session-new-name').getAttribute('maxlength'), '80');
  assert.equal(document.querySelector('#session-new-name').required, true);
  assert.equal(document.querySelector('#session-create-submit').disabled, true);
  assert.equal(document.querySelector('#session-create-drawer').hidden, true);
  assert.match(css, /#app\s*\{[^}]*grid-template-rows:\s*var\(--connection-bar-height\) auto minmax\(0, 1fr\);/su);
  assert.match(css, /\.session-create-drawer\s*\{[^}]*display:\s*flex;/su);
  assert.match(css, /\.session-create-form\s*\{[^}]*width:\s*100%;/su);
  assert.doesNotMatch(css, /\.session-create-form\s*\{[^}]*position:\s*absolute;/su);
});


test('persistent settings restore aliases and retain them on the next save', async () => {
  const aliases = [
    { name: 'ga', body: '#followers assist %1', scope: 'global' },
    { name: 'scoreme', body: 'score', scope: 'global' }
  ];
  const settings = {
    connection: { host: 'tdome.nukefire.org', port: 4000 },
    display: {
      followOutput: true,
      compactOutput: false,
      fontSize: 16,
      theme: {
        preset: 'nukefire',
        foreground: '#d3d7dc',
        background: '#050607',
        monochrome: false,
        version: '2'
      }
    },
    accessibility: { screenReaderMode: false, announceImportant: true },
    aliases,
    sessions: {
      activeSessionId: 'tank',
      sessions: [
        { id: 'tank', name: 'Caul', role: 'tank', host: 'tdome.nukefire.org', port: 4000 },
        { id: 'healer', name: 'Shai', role: 'healer', host: 'tdome.nukefire.org', port: 4000 }
      ],
      groups: { crew: { name: 'crew', members: ['tank', 'healer'], leader: 'tank' } }
    },
    workspace: {}
  };

  const { dom, restoredSnapshots, savedSettings } = setup({ settings });
  for (let attempt = 0; attempt < 50 && restoredSnapshots.length === 0; attempt += 1) {
    await wait(20);
  }

  assert.deepEqual(restoredSnapshots.at(-1).aliases, aliases);
  assert.deepEqual(restoredSnapshots.at(-1).sessions.find((entry) => entry.id === 'tank').tintin.aliases, aliases);
  assert.deepEqual(restoredSnapshots.at(-1).sessions.find((entry) => entry.id === 'healer').tintin.aliases, []);

  const command = dom.window.document.querySelector('#command');
  command.value = 'look';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  for (let attempt = 0; attempt < 50 && savedSettings.length === 0; attempt += 1) {
    await wait(20);
  }

  assert.deepEqual(savedSettings.at(-1).aliases, aliases);
  assert.deepEqual(savedSettings.at(-1).sessions.sessions.find((entry) => entry.id === 'tank').tintin.aliases, aliases);
  assert.deepEqual(savedSettings.at(-1).sessions.sessions.find((entry) => entry.id === 'healer').tintin.aliases, []);
  dom.window.close();
});

test('persistent settings restore variables and functions and retain them on the next save', async () => {
  const variables = [
    { name: 'species', value: 'mutant', scope: 'global' },
    { name: 'target', value: '%species guard', scope: 'global' }
  ];
  const functions = [
    { name: 'targetname', body: '#return {$target}', scope: 'global' }
  ];
  const settings = {
    connection: { host: 'tdome.nukefire.org', port: 4000 },
    display: {
      followOutput: true,
      compactOutput: false,
      fontSize: 16,
      theme: {
        preset: 'nukefire', foreground: '#d3d7dc', background: '#050607',
        monochrome: false, version: '2'
      }
    },
    accessibility: { screenReaderMode: false, announceImportant: true },
    aliases: [],
    variables,
    functions,
    sessions: {
      activeSessionId: 'tank',
      sessions: [
        { id: 'tank', name: 'Caul', role: 'tank', host: 'tdome.nukefire.org', port: 4000 }
      ],
      groups: {}
    },
    workspace: {}
  };

  const { dom, restoredSnapshots, savedSettings } = setup({ settings });
  for (let attempt = 0; attempt < 50 && restoredSnapshots.length === 0; attempt += 1) {
    await wait(20);
  }
  assert.deepEqual(restoredSnapshots.at(-1).variables, variables);
  assert.deepEqual(restoredSnapshots.at(-1).functions, functions);
  assert.deepEqual(restoredSnapshots.at(-1).sessions.find((entry) => entry.id === 'tank').tintin.variables, variables);
  assert.deepEqual(restoredSnapshots.at(-1).sessions.find((entry) => entry.id === 'tank').tintin.functions, functions);

  const command = dom.window.document.querySelector('#command');
  command.value = 'look';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  for (let attempt = 0; attempt < 50 && savedSettings.length === 0; attempt += 1) {
    await wait(20);
  }
  assert.deepEqual(savedSettings.at(-1).variables, variables);
  assert.deepEqual(savedSettings.at(-1).functions, functions);
  assert.deepEqual(savedSettings.at(-1).sessions.sessions.find((entry) => entry.id === 'tank').tintin.variables, variables);
  assert.deepEqual(savedSettings.at(-1).sessions.sessions.find((entry) => entry.id === 'tank').tintin.functions, functions);
  dom.window.close();
});

test('persistent settings restore actions and retain them on the next save', async () => {
  const actions = {
    enabled: true,
    definitions: [
      {
        pattern: 'The %1 attacks Shai!', command: '#Caul rescue Shai',
        priority: 1, enabled: true, scope: 'global'
      }
    ]
  };
  const settings = {
    connection: { host: 'tdome.nukefire.org', port: 4000 },
    display: {
      followOutput: true, compactOutput: false, fontSize: 16,
      theme: {
        preset: 'nukefire', foreground: '#d3d7dc', background: '#050607',
        monochrome: false, version: '2'
      }
    },
    accessibility: { screenReaderMode: false, announceImportant: true },
    aliases: [],
    actions,
    sessions: {
      activeSessionId: 'tank',
      sessions: [
        { id: 'tank', name: 'Caul', role: 'tank', host: 'tdome.nukefire.org', port: 4000 },
        { id: 'healer', name: 'Shai', role: 'healer', host: 'tdome.nukefire.org', port: 4000 }
      ],
      groups: {}
    },
    workspace: {}
  };

  const { dom, handlers, restoredSnapshots, savedSettings } = setup({ settings });
  for (let attempt = 0; attempt < 50 && restoredSnapshots.length === 0; attempt += 1) await wait(20);
  assert.deepEqual(restoredSnapshots.at(-1).actions, actions);
  assert.deepEqual(restoredSnapshots.at(-1).sessions.find((entry) => entry.id === 'tank').tintin.actions, actions);

  handlers.event({
    sessionId: 'tank',
    type: 'action-result',
    payload: {
      deliveries: [{ sessionId: 'healer', command: 'rescue Shai', queued: true }],
      messages: []
    }
  });

  const command = dom.window.document.querySelector('#command');
  command.value = 'look';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  for (let attempt = 0; attempt < 50 && savedSettings.length === 0; attempt += 1) await wait(20);
  assert.deepEqual(savedSettings.at(-1).actions, actions);
  assert.deepEqual(savedSettings.at(-1).sessions.sessions.find((entry) => entry.id === 'tank').tintin.actions, actions);
  dom.window.close();
});


test('persistent settings restore gags and retain them on the next save', async () => {
  const gags = {
    enabled: true,
    definitions: [
      { pattern: '%1 gossips', enabled: true, scope: 'global' }
    ]
  };
  const settings = {
    connection: { host: 'tdome.nukefire.org', port: 4000 },
    display: {
      followOutput: true, compactOutput: false, fontSize: 16,
      theme: {
        preset: 'nukefire', foreground: '#d3d7dc', background: '#050607',
        monochrome: false, version: '2'
      }
    },
    accessibility: { screenReaderMode: false, announceImportant: true },
    aliases: [],
    variables: [],
    actions: { enabled: true, definitions: [] },
    gags,
    sessions: {
      activeSessionId: 'tank',
      sessions: [
        { id: 'tank', name: 'Caul', role: 'tank', host: 'tdome.nukefire.org', port: 4000 },
        { id: 'healer', name: 'Shai', role: 'healer', host: 'tdome.nukefire.org', port: 4000 }
      ],
      groups: {}
    },
    workspace: {}
  };

  const { dom, restoredSnapshots, savedSettings } = setup({ settings });
  for (let attempt = 0; attempt < 50 && restoredSnapshots.length === 0; attempt += 1) await wait(20);
  assert.deepEqual(restoredSnapshots.at(-1).gags, gags);
  assert.deepEqual(restoredSnapshots.at(-1).sessions.find((entry) => entry.id === 'tank').tintin.gags, gags);

  const command = dom.window.document.querySelector('#command');
  command.value = 'look';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  for (let attempt = 0; attempt < 50 && savedSettings.length === 0; attempt += 1) await wait(20);
  assert.deepEqual(savedSettings.at(-1).gags, gags);
  assert.deepEqual(savedSettings.at(-1).sessions.sessions.find((entry) => entry.id === 'tank').tintin.gags, gags);
  dom.window.close();
});

test('persistent settings restore the speedwalk toggle and retain it on save', async () => {
  const settings = {
    connection: { host: 'tdome.nukefire.org', port: 4000 },
    display: {
      followOutput: true, compactOutput: false, fontSize: 16,
      theme: {
        preset: 'nukefire', foreground: '#d3d7dc', background: '#050607',
        monochrome: false, version: '2'
      }
    },
    accessibility: { screenReaderMode: false, announceImportant: true },
    aliases: [],
    variables: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    speedwalk: { enabled: true },
    sessions: {
      activeSessionId: 'tank',
      sessions: [
        { id: 'tank', name: 'Caul', role: 'tank', host: 'tdome.nukefire.org', port: 4000 }
      ],
      groups: {}
    },
    workspace: {}
  };

  const { dom, restoredSnapshots, savedSettings } = setup({ settings });
  for (let attempt = 0; attempt < 50 && restoredSnapshots.length === 0; attempt += 1) await wait(20);
  assert.deepEqual(restoredSnapshots.at(-1).speedwalk, { enabled: true });
  assert.deepEqual(restoredSnapshots.at(-1).sessions.find((entry) => entry.id === 'tank').tintin.speedwalk, { enabled: true });

  const command = dom.window.document.querySelector('#command');
  command.value = '#speedwalk status';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  for (let attempt = 0; attempt < 50 && savedSettings.length === 0; attempt += 1) await wait(20);
  assert.deepEqual(savedSettings.at(-1).speedwalk, { enabled: true });
  assert.deepEqual(savedSettings.at(-1).sessions.sessions.find((entry) => entry.id === 'tank').tintin.speedwalk, { enabled: true });
  dom.window.close();
});

test('Preferences changes the persisted client-command prefix and routes with it immediately', async () => {
  const settings = {
    connection: { host: 'tdome.nukefire.org', port: 4000 },
    input: { repeatLastCommandOnEnter: false, commandPrefix: '~' },
    display: {
      followOutput: true,
      compactOutput: false,
      fontSize: 16,
      theme: {
        preset: 'nukefire', foreground: '#d3d7dc', background: '#050607',
        monochrome: false, version: '2'
      }
    },
    accessibility: { screenReaderMode: false, announceImportant: true },
    aliases: [{ name: 'crewscore', body: '~all score', scope: 'global' }],
    variables: [],
    quickKeys: [{ id: 'crew-score', label: 'Crew Score', command: '~all score', enabled: true }],
    actions: {
      enabled: true,
      definitions: [{
        pattern: 'READY', command: '~all score;~~help', priority: 5, enabled: true, scope: 'global'
      }]
    },
    gags: { enabled: true, definitions: [] },
    speedwalk: { enabled: false },
    sessions: {
      activeSessionId: 'tank',
      sessions: [
        { id: 'tank', name: 'Caul', role: 'tank', host: 'tdome.nukefire.org', port: 4000 },
        { id: 'healer', name: 'Shai', role: 'healer', host: 'tdome.nukefire.org', port: 4000 }
      ],
      groups: { crew: { name: 'crew', members: ['tank', 'healer'], leader: 'tank' } }
    },
    workspace: {}
  };

  const { dom, routed, restoredSnapshots, savedSettings } = setup({ settings });
  for (let attempt = 0; attempt < 50 && restoredSnapshots.length === 0; attempt += 1) await wait(20);
  const document = dom.window.document;
  const prefix = document.querySelector('#client-command-prefix');
  assert.equal(prefix.value, '~');
  assert.equal(restoredSnapshots.at(-1).commandPrefix, '~');
  assert.equal(document.querySelector('#client-command-prefix-alias-example').textContent, '~alias');

  prefix.value = '^';
  prefix.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  for (let attempt = 0; attempt < 50 && restoredSnapshots.at(-1)?.commandPrefix !== '^'; attempt += 1) await wait(20);
  assert.equal(restoredSnapshots.at(-1).commandPrefix, '^');
  assert.equal(document.querySelector('#client-command-prefix-all-example').textContent, '^all');
  assert.equal(restoredSnapshots.at(-1).aliases[0].body, '^all score');
  assert.equal(restoredSnapshots.at(-1).actions.definitions[0].command, '^all score;~help');
  const migratedTinTin = restoredSnapshots.at(-1).sessions.find((entry) => entry.id === 'tank').tintin;
  assert.equal(migratedTinTin.aliases[0].body, '^all score');
  assert.equal(migratedTinTin.actions.definitions[0].command, '^all score;~help');

  const command = document.querySelector('#command');
  command.value = '^all score';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  for (let attempt = 0; attempt < 50 && routed.length === 0; attempt += 1) await wait(20);
  assert.deepEqual(routed.at(-1), { sourceId: 'tank', command: '^all score' });

  for (let attempt = 0; attempt < 50 && savedSettings.at(-1)?.input?.commandPrefix !== '^'; attempt += 1) await wait(20);
  assert.equal(savedSettings.at(-1).input.commandPrefix, '^');
  assert.equal(savedSettings.at(-1).quickKeys[0].command, '^all score');
  dom.window.close();
});



test('highlighted text changes only terminal runs while parsers and reader text keep the original line', async () => {
  const snapshot = {
    activeSessionId: 'tank',
    sessions: [
      { id: 'tank', name: 'Caul', role: 'tank', host: 'tdome.nukefire.org', port: 4000, connected: true, status: { state: 'connected', message: 'Connected' } },
      { id: 'healer', name: 'Shai', role: 'healer', host: 'tdome.nukefire.org', port: 4000, connected: true, status: { state: 'connected', message: 'Connected' } }
    ],
    groups: {}, aliases: [], variables: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: {
      enabled: true,
      definitions: [
        { pattern: 'mutant', style: 'Yellow underline', priority: 5, enabled: true, scope: 'global' }
      ]
    },
    speedwalk: { enabled: false }
  };
  const { dom, handlers, xterms } = setup({ snapshot });
  await wait(60);
  const document = dom.window.document;

  handlers.event({ sessionId: 'tank', type: 'text', payload: "Mo gossips, 'A mu" });
  handlers.event({ sessionId: 'tank', type: 'text', payload: "tant arrives.'\nHP: 75/100\n" });
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));

  assert.match(document.querySelector('#output').textContent, /A mutant arrives\./u);
  const highlighted = [...document.querySelectorAll('#output span')].find((span) => span.textContent === 'mutant');
  assert.ok(highlighted);
  assert.equal(highlighted.style.textDecoration, 'underline');
  assert.ok(highlighted.style.color);
  assert.equal(document.querySelector('#hp-text').textContent, '75 / 100 · 75%');
  const communications = document.querySelectorAll('[data-communication-message][data-channel="gossip"]');
  assert.equal(communications.length, 1);
  assert.match(communications[0].textContent, /A mutant arrives\./u);
  assert.equal(xterms[0].calls.some((call) => call[0] === 'writeRuns' && call[1].some((run) => run.text === 'mutant' && run.style?.underline === true)), true);

  handlers.menuReadLastLine();
  await Promise.resolve();
  assert.match(document.querySelector('#sr-announcer').textContent, /HP: 75\/100/u);
  dom.window.close();
});

test('local display reaches terminal output without entering Communications or vitals parsing', async () => {
  const { dom, handlers } = setup();
  await wait(60);
  const document = dom.window.document;

  handlers.event({
    sessionId: 'tank',
    type: 'local-text',
    payload: "Mo gossips, 'Local warning.'\nHP: 1/100\n"
  });
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));

  assert.match(document.querySelector('#output').textContent, /Local warning\./u);
  assert.equal(document.querySelectorAll('[data-communication-message][data-channel="gossip"]').length, 0);
  assert.doesNotMatch(document.querySelector('#hp-text').textContent, /1 \/ 100/u);

  handlers.event({
    sessionId: 'healer',
    type: 'local-text',
    payload: "Shai gossips, 'Stored local warning.'\nHP: 2/100\n"
  });
  document.querySelector('[data-session-id="healer"]').click();
  await wait(20);
  assert.match(document.querySelector('#output').textContent, /Stored local warning\./u);
  assert.equal(document.querySelectorAll('[data-communication-message][data-channel="gossip"]').length, 0);
  assert.doesNotMatch(document.querySelector('#hp-text').textContent, /2 \/ 100/u);
  dom.window.close();
});


test('formatted echo ANSI stays visual while reader text remains plain and protected parsers stay untouched', async () => {
  const { dom, handlers, xterms } = setup();
  await wait(60);
  const document = dom.window.document;

  handlers.event({
    sessionId: 'tank',
    type: 'local-text',
    payload: '\x1b[1;38;2;170;0;0mHP: 9/100 Warning\x1b[0m\n'
  });
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));

  assert.match(document.querySelector('#output').textContent, /HP: 9\/100 Warning/u);
  assert.doesNotMatch(document.querySelector('#hp-text').textContent, /9 \/ 100/u);
  assert.equal(document.querySelectorAll('[data-communication-message]').length, 0);
  assert.equal(xterms[0].calls.some((call) => call[0] === 'writeRuns' && call[1].some((run) => run.text.includes('Warning') && run.style?.bold === true)), true);

  handlers.menuReadLastLine();
  await Promise.resolve();
  assert.match(document.querySelector('#sr-announcer').textContent, /HP: 9\/100 Warning/u);
  assert.doesNotMatch(document.querySelector('#sr-announcer').textContent, /\\x1b/u);
  dom.window.close();
});


test('substituted display text precedes highlights while protected parsers keep original server text', async () => {
  const snapshot = {
    activeSessionId: 'tank',
    sessions: [
      { id: 'tank', name: 'Caul', role: 'tank', host: 'tdome.nukefire.org', port: 4000, connected: true, status: { state: 'connected', message: 'Connected' } },
      { id: 'healer', name: 'Shai', role: 'healer', host: 'tdome.nukefire.org', port: 4000, connected: true, status: { state: 'connected', message: 'Connected' } }
    ],
    groups: {}, aliases: [], variables: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    substitutes: {
      enabled: true,
      definitions: [
        { pattern: 'mutant', replacement: 'abomination', priority: 2, enabled: true, scope: 'global' },
        { pattern: 'HP:', replacement: 'Health:', priority: 3, enabled: true, scope: 'global' }
      ]
    },
    highlights: {
      enabled: true,
      definitions: [
        { pattern: 'abomination', style: 'Yellow underline', priority: 5, enabled: true, scope: 'global' }
      ]
    },
    classes: { activeStack: [], definitions: [] },
    speedwalk: { enabled: false }
  };
  const { dom, handlers, xterms } = setup({ snapshot });
  await wait(60);
  const document = dom.window.document;

  handlers.event({ sessionId: 'tank', type: 'text', payload: "Mo gossips, 'A mu" });
  handlers.event({ sessionId: 'tank', type: 'text', payload: "tant arrives.'\nHP: 75/100\n" });
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));

  assert.match(document.querySelector('#output').textContent, /A abomination arrives\./u);
  assert.match(document.querySelector('#output').textContent, /Health: 75\/100/u);
  assert.doesNotMatch(document.querySelector('#output').textContent, /A mutant arrives\./u);
  const highlighted = [...document.querySelectorAll('#output span')].find((span) => span.textContent === 'abomination');
  assert.ok(highlighted);
  assert.equal(highlighted.style.textDecoration, 'underline');
  assert.equal(document.querySelector('#hp-text').textContent, '75 / 100 · 75%');

  const communications = document.querySelectorAll('[data-communication-message][data-channel="gossip"]');
  assert.equal(communications.length, 1);
  assert.match(communications[0].textContent, /A mutant arrives\./u);
  assert.doesNotMatch(communications[0].textContent, /abomination/u);
  assert.equal(xterms[0].calls.some((call) => call[0] === 'writeRuns' && call[1].some((run) => run.text === 'abomination' && run.style?.underline === true)), true);

  handlers.menuReadLastLine();
  await Promise.resolve();
  assert.match(document.querySelector('#sr-announcer').textContent, /Health: 75\/100/u);

  handlers.event({ sessionId: 'tank', type: 'local-text', payload: 'A mutant waits.\n' });
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));
  assert.match(document.querySelector('#output').textContent, /A abomination waits\./u);
  assert.equal(document.querySelectorAll('[data-communication-message][data-channel="gossip"]').length, 1);
  dom.window.close();
});


test('pipeline debug renders bounded manager and display decisions with copy, clear, and secure redaction', async () => {
  const macroEngine = new macros.MacroEngine();
  macroEngine.define('F4', 'look');
  const snapshot = {
    activeSessionId: 'tank',
    sessions: [{
      id: 'tank', name: 'Caul', role: 'tank', host: 'tdome.nukefire.org', port: 4000,
      connected: true, status: { state: 'connected', message: 'Connected' },
      pipelineDebug: { enabled: true, maxEntries: 100 }
    }],
    groups: {}, aliases: [], variables: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    substitutes: {
      enabled: true,
      definitions: [{ pattern: 'mutant', replacement: 'abomination', priority: 2, enabled: true, scope: 'global' }]
    },
    highlights: {
      enabled: true,
      definitions: [{ pattern: 'abomination', style: 'Yellow underline', priority: 5, enabled: true, scope: 'global' }]
    },
    classes: { activeStack: [], definitions: [] },
    macros: macroEngine.snapshot(),
    speedwalk: { enabled: false }
  };
  const { dom, handlers, clipboardWrites, pipelineDebugClears } = setup({ snapshot });
  await wait(60);
  const document = dom.window.document;

  handlers.event({
    sessionId: 'tank',
    type: 'pipeline-debug',
    payload: {
      type: 'entry',
      status: { enabled: true, maxEntries: 100 },
      entry: { id: 1, timestamp: 1, stage: 'typed', message: 'look' }
    }
  });
  handlers.event({ sessionId: 'tank', type: 'text', payload: 'A mutant arrives.\n' });
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));

  assert.equal(document.querySelector('#pipeline-debug-section').hidden, false);
  assert.equal(document.querySelector('#pipeline-debug-enabled').checked, true);
  const logText = document.querySelector('#pipeline-debug-log').textContent;
  assert.match(logText, /\[typed\]look/u);
  assert.match(logText, /\[substitute\].*mutant/u);
  assert.match(logText, /\[highlight\].*abomination/u);
  assert.match(document.querySelector('#output').textContent, /abomination/u);

  const command = document.querySelector('#command');
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'F4', code: 'F4', bubbles: true, cancelable: true
  }));
  await wait(10);
  assert.match(document.querySelector('#pipeline-debug-log').textContent, /\[macro\].*F4.*look/u);

  document.querySelector('#pipeline-debug-copy').click();
  await wait(10);
  assert.equal(clipboardWrites.length, 1);
  assert.match(clipboardWrites[0], /\[typed\] look/u);
  assert.match(clipboardWrites[0], /\[substitute\]/u);

  handlers.event({ sessionId: 'tank', type: 'echo', payload: true });
  handlers.event({ sessionId: 'tank', type: 'local-text', payload: 'A mutant waits.\n' });
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));
  assert.match(document.querySelector('#pipeline-debug-log').textContent, /Secure input active; command and server details redacted\./u);
  assert.doesNotMatch(document.querySelector('#pipeline-debug-log').textContent, /mutant waits/u);

  document.querySelector('#pipeline-debug-clear').click();
  await wait(10);
  assert.deepEqual(pipelineDebugClears, ['tank']);
  assert.equal(document.querySelector('#pipeline-debug-log').textContent, '');
  dom.window.close();
});


test('direct client Help renders as one dedicated readable Help block', async () => {
  const { dom, routed, xterms } = setup({
    routeCommand: ({ snapshot }) => ({
      ok: true,
      deliveries: [],
      messages: [
        '#alias — Define, list, inspect, or remove aliases.',
        '',
        'SUMMARY',
        '  Define, list, inspect, or remove aliases.',
        '',
        'USAGE',
        '  #alias {name} {command}'
      ],
      snapshot
    })
  });
  await wait(60);
  const command = dom.window.document.querySelector('#command');
  command.value = '#help alias';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await wait(20);
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));

  assert.deepEqual(routed.map((entry) => entry.command), ['#help alias']);
  const helpWrite = xterms[0].calls.find((call) =>
    call[0] === 'writeRuns' && call[1].some((run) => run.kind === 'help')
  );
  assert.ok(helpWrite);
  assert.equal(helpWrite[1].length, 1);
  assert.equal(helpWrite[1][0].kind, 'help');
  assert.match(helpWrite[1][0].text, /#alias —/u);
  assert.match(helpWrite[1][0].text, /SUMMARY\n  Define/u);
  assert.match(helpWrite[1][0].text, /USAGE\n  #alias/u);
  dom.window.close();
});

test('each session keeps private Substitute and Highlight display engines across inactive output and tab switches', async () => {
  const tintin = (replacement, style) => ({
    aliases: [], variables: [], functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: {
      enabled: true,
      definitions: [
        { pattern: replacement, style, priority: 5, enabled: true, scope: 'global' }
      ]
    },
    substitutes: {
      enabled: true,
      definitions: [
        { pattern: 'mutant', replacement, priority: 2, enabled: true, scope: 'global' }
      ]
    },
    macros: { enabled: true, definitions: [] },
    classes: { activeStack: [], definitions: [] },
    speedwalk: { enabled: true },
    profile: { requested: replacement, filename: `${replacement}.tin`, loaded: true }
  });

  const windTinTin = tintin('windling', 'Yellow underline');
  const gatorTinTin = tintin('gatorling', 'Light green underline');
  const snapshot = {
    activeSessionId: 'wind',
    sessions: [
      {
        id: 'wind', name: 'Wind', role: 'tank', host: 'tdome.nukefire.org', port: 4000,
        connected: true, status: { state: 'connected', message: 'Connected' }, tintin: windTinTin
      },
      {
        id: 'gator', name: 'Gator', role: 'member', host: 'tdome.nukefire.org', port: 4000,
        connected: true, status: { state: 'connected', message: 'Connected' }, tintin: gatorTinTin
      }
    ],
    groups: {}, aliases: [], variables: [], functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    substitutes: {
      enabled: true,
      definitions: [{ pattern: 'mutant', replacement: 'shared-leak', priority: 1, enabled: true, scope: 'global' }]
    },
    highlights: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    classes: { activeStack: [], definitions: [] },
    speedwalk: { enabled: true }
  };

  const { dom, handlers } = setup({ snapshot });
  await wait(60);
  const document = dom.window.document;
  const windTab = document.querySelector('[data-session-id="wind"]');
  const gatorTab = document.querySelector('[data-session-id="gator"]');
  assert.equal(windTab.dataset.profile, 'windling.tin');
  assert.match(windTab.querySelector('.session-tab-role').textContent, /tank · windling\.tin/u);
  assert.match(gatorTab.getAttribute('aria-label'), /profile gatorling\.tin/u);

  handlers.event({ sessionId: 'wind', type: 'text', payload: 'A mutant arrives in Wind.\n' });
  handlers.event({ sessionId: 'gator', type: 'text', payload: 'A mutant waits in Gator.\n' });
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));

  assert.match(document.querySelector('#output').textContent, /A windling arrives in Wind\./u);
  assert.doesNotMatch(document.querySelector('#output').textContent, /gatorling|shared-leak/u);

  document.querySelector('[data-session-id="gator"]').click();
  await wait(30);
  assert.match(document.querySelector('#output').textContent, /A gatorling waits in Gator\./u);
  assert.doesNotMatch(document.querySelector('#output').textContent, /windling|shared-leak/u);
  const gatorHighlight = [...document.querySelectorAll('#output span')]
    .find((span) => span.textContent === 'gatorling');
  assert.ok(gatorHighlight);
  assert.equal(gatorHighlight.style.textDecoration, 'underline');

  handlers.event({ sessionId: 'gator', type: 'text', payload: 'Another mutant appears.\n' });
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));
  assert.match(document.querySelector('#output').textContent, /Another gatorling appears\./u);

  document.querySelector('[data-session-id="wind"]').click();
  await wait(30);
  handlers.event({ sessionId: 'wind', type: 'text', payload: 'Another mutant appears.\n' });
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));
  assert.match(document.querySelector('#output').textContent, /Another windling appears\./u);
  assert.doesNotMatch(document.querySelector('#output').textContent, /gatorling|shared-leak/u);
  dom.window.close();
});
