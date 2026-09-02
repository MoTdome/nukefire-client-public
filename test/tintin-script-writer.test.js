'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const writer = require('../src/tintin-script-writer');
const loader = require('../src/tintin-script-loader');

function emptyDefinitions() {
  return {
    aliases: [], variables: [], functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    classes: { activeStack: [], definitions: [] }
  };
}

function richDefinitions() {
  return {
    aliases: [
      { name: 'k', body: 'kill %1; kick', priority: 5, scope: 'global' },
      { name: 'brace', body: 'say "Ready" {now}', priority: 5, scope: 'global', className: 'combat' }
    ],
    variables: [{ name: 'tank', value: 'Caul', scope: 'global' }],
    functions: [
      { name: 'twice', body: '#math {result} {%1 * 2}', scope: 'global' },
      { name: 'battle', body: '#return {%1!}', scope: 'global', className: 'combat' }
    ],
    actions: {
      enabled: false,
      definitions: [{ pattern: '^Danger {now}$', command: 'flee; recall', priority: 2, enabled: false, scope: 'global', className: 'combat' }]
    },
    gags: { enabled: true, definitions: [{ pattern: 'The wind howls.', enabled: true, scope: 'global' }] },
    highlights: { enabled: true, definitions: [{ pattern: 'WARNING', style: 'light red', priority: 1, enabled: false, scope: 'global' }] },
    substitutes: { enabled: false, definitions: [{ pattern: 'credits', replacement: 'shinies', priority: 3, enabled: true, scope: 'global' }] },
    macros: {
      enabled: true,
      definitions: [{ key: 'F4', label: 'F4', code: 'F4', modifiers: { ctrl: false, alt: false, shift: false, meta: false }, signature: 'F4', command: 'north; look', commands: ['north', 'look'], enabled: false, className: 'combat' }]
    },
    tabs: [],
    events: { enabled: true, definitions: [] },
    config: { logMode: 'plain', commandEcho: false, autoTab: 0, verbatim: false, repeatChar: '!', repeatEnter: false, verbatimChar: '\\', historySize: 2000, bufferSize: 5000 },
    speedwalk: { enabled: true },
    classes: {
      activeStack: ['combat'],
      definitions: [{
        name: 'combat',
        saved: {
          aliases: [{ name: 'saved', body: 'score', priority: 5, scope: 'global', className: 'combat' }],
          variables: [], functions: [{ name: 'savedfunc', body: '#return {saved}', scope: 'global', className: 'combat' }], actions: [], gags: [], highlights: [], substitutes: [], macros: [], tabs: [], events: []
        }
      }]
    }
  };
}

test('writes deterministic safe TinTin definitions with familiar commands', () => {
  const first = writer.prepareTinTinWrite(richDefinitions(), { commandPrefix: '#' });
  const second = writer.prepareTinTinWrite(richDefinitions(), { commandPrefix: '#' });
  assert.equal(first.ok, true);
  assert.equal(first.content, second.content);
  assert.match(first.content, /^\/\* NukeFire Client TinTin command file\./u);
  assert.match(first.content, /#variable \{tank\} \{Caul\}/u);
  assert.match(first.content, /#function \{twice\}/u);
  assert.match(first.content, /#actions \{off\}/u);
  assert.match(first.content, /#action \{disable\}/u);
  assert.match(first.content, /#class \{combat\} \{save\}/u);
  assert.match(first.content, /#class \{combat\} \{clear\}/u);
  assert.equal(first.content.endsWith('\n'), true);
});

test('write and read round-trip global state, disabled records, saved classes, and active stack', () => {
  const source = richDefinitions();
  const written = writer.prepareTinTinWrite(source, { commandPrefix: '~' });
  assert.equal(written.ok, true);
  assert.match(written.content, /~alias/u);
  const loaded = loader.prepareTinTinRead(written.content, emptyDefinitions());
  assert.equal(loaded.ok, true, loaded.errors?.join('\n'));
  assert.deepEqual(loaded.definitions, source);
});


test('writes import fragments without injecting unrelated default settings', () => {
  const source = emptyDefinitions();
  source.events = { enabled: true, definitions: [{ name: 'SESSION CONNECTED', command: 'look', enabled: false, scope: 'global' }] };
  source.config = { logMode: 'plain', commandEcho: false };
  source.speedwalk = { enabled: true };
  source.aliases.push({ name: 'k', body: 'kill %1', scope: 'global' });
  const fragment = writer.prepareTinTinFragment(source, [
    { id: 'alias:k', category: 'aliases' },
    { id: 'event:connected', category: 'events' },
    { id: 'setting:echo', category: 'settings', change: { kind: 'config', key: 'commandEcho', value: true } }
  ]);
  assert.equal(fragment.ok, true);
  assert.match(fragment.content, /#alias \{k\} \{kill %1\}/u);
  assert.match(fragment.content, /#event \{SESSION CONNECTED\} \{look\}/u);
  assert.match(fragment.content, /#event \{disable\} \{SESSION CONNECTED\}/u);
  assert.match(fragment.content, /#config \{COMMAND ECHO\} \{ON\}/u);
  assert.doesNotMatch(fragment.content, /#config \{SPEEDWALK\}/u);
  assert.doesNotMatch(fragment.content, /#config \{LOG MODE\}/u);

  const loaded = loader.prepareTinTinRead(fragment.content, emptyDefinitions());
  assert.equal(loaded.ok, true, loaded.errors?.join('\n'));
  assert.equal(loaded.definitions.events.definitions[0].enabled, false);
  assert.equal(loaded.definitions.config.commandEcho, true);
});

test('escapes structural braces, quotes, and backslashes without losing their values', () => {
  const source = emptyDefinitions();
  source.aliases.push({ name: 'odd', body: 'say "a {brace}"; say C:\\Temp', scope: 'global' });
  source.variables.push({ name: 'quote', value: "Mo's {file} \\ path", scope: 'global' });
  const written = writer.prepareTinTinWrite(source);
  const loaded = loader.prepareTinTinRead(written.content, emptyDefinitions());
  assert.equal(loaded.ok, true, loaded.errors?.join('\n'));
  assert.equal(loaded.definitions.aliases[0].body, source.aliases[0].body);
  assert.equal(loaded.definitions.variables[0].value, source.variables[0].value);
});

test('reports exact written totals and rejects oversized output atomically', () => {
  const source = emptyDefinitions();
  source.aliases.push({ name: 'k', body: 'kill %1', scope: 'global' });
  const written = writer.prepareTinTinWrite(source);
  assert.deepEqual(writer.formatTinTinWriteReport(written, 'Prime.tin').slice(0, 2), [
    '#OK: WROTE Prime.tin.',
    '#OK:   1 ALIAS WRITTEN.'
  ]);
  source.aliases[0].body = 'x'.repeat(2_000);
  const rejected = writer.prepareTinTinWrite(source, { maxOutputCharacters: 1_024 });
  assert.equal(rejected.ok, false);
  assert.match(rejected.errors[0], /exceed/u);
});

test('renderer writes only the requested session definition snapshot without changing live state', async () => {
  let JSDOM;
  try {
    ({ JSDOM } = require('jsdom'));
  } catch (_error) {
    return;
  }
  const ansi = require('../src/ansi-parser');
  const { installFakeXterm } = require('./fake-xterm');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://nukefire.test/' });
  const handlers = {};
  const writes = [];
  const mainDefinitions = richDefinitions();
  const gatorDefinitions = emptyDefinitions();
  gatorDefinitions.tabs = [];
  gatorDefinitions.events = { enabled: true, definitions: [] };
  gatorDefinitions.config = { logMode: 'plain', commandEcho: false, autoTab: 0, verbatim: false, repeatChar: '!', repeatEnter: false, verbatimChar: '\\', historySize: 2000, bufferSize: 5000 };
  gatorDefinitions.speedwalk = { enabled: true };
  gatorDefinitions.aliases = [{ name: 'gatoronly', body: 'say gator', priority: 5, scope: 'global' }];
  gatorDefinitions.variables = [{ name: 'owner', value: 'Gator', scope: 'global' }];
  const mainTinTin = { ...JSON.parse(JSON.stringify(mainDefinitions)), profile: { requested: 'Prime', filename: 'Prime.tin', loaded: true } };
  const gatorTinTin = { ...JSON.parse(JSON.stringify(gatorDefinitions)), profile: { requested: 'Gator', filename: 'Gator.tin', loaded: true } };
  const sessionSnapshot = {
    activeSessionId: 'main',
    sessions: [
      { id: 'main', name: 'Writer Seed', role: 'tank', host: 'mud.test', port: 4000, tintin: mainTinTin },
      { id: 'gator', name: 'Gator', role: 'member', host: 'mud.test', port: 4000, tintin: gatorTinTin }
    ],
    groups: {}, commandPrefix: '#', speedwalk: { enabled: true },
    ...JSON.parse(JSON.stringify(mainDefinitions))
  };

  dom.window.NukeFireAnsi = ansi;
  dom.window.NukeFireTinTinScriptLoader = loader;
  dom.window.NukeFireTinTinScriptWriter = writer;
  installFakeXterm(dom);
  dom.window.nukefire = {
    listSessions: async () => ({ ok: true, snapshot: sessionSnapshot }),
    restoreSessions: async (snapshot) => ({ snapshot }),
    replaceSessionDefinitions: async () => { throw new Error('write must not replace live definitions'); },
    readTinTinScript: async () => ({ ok: false }),
    writeTinTinScript: async (requested, content) => {
      writes.push({ requested, content });
      return { ok: true, filename: /\.tin$/iu.test(requested) ? requested : `${requested}.tin`, size: Buffer.byteLength(content), replaced: false };
    },
    getTinTinScriptsInfo: async () => ({ ok: true, files: [], info: { directory: '/Documents/NukeFire Client/Scripts' } }),
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null, loadSettings: async () => null, saveSettings: async () => ({ ok: true }),
    loadMap: async () => null,
    onText: () => {}, onStatus: () => {}, onEcho: () => {}, onGmcp: () => {},
    onPromptBoundary: () => {}, onError: () => {}, onMenuConnect: () => {},
    onMenuFind: () => {}, onMenuPreferences: () => {}, onMenuFocusCommand: () => {},
    onMenuFocusOutput: () => {}, onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onSessionEvent: (callback) => { handlers.session = callback; },
    onSessionsChanged: () => {}
  };

  dom.window.eval(rendererSource);
  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 500;
    const check = () => {
      if (/Writer Seed/u.test(dom.window.document.querySelector('#session-tabs')?.textContent || '')) {
        resolve();
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error('Renderer did not apply the initial session snapshot.'));
        return;
      }
      setTimeout(check, 5);
    };
    check();
  });

  handlers.session({ sessionId: 'gator', type: 'script-write-request', payload: { requested: 'Gator' } });
  await new Promise((resolve) => setTimeout(resolve, 30));
  handlers.session({ sessionId: 'main', type: 'script-write-request', payload: { requested: '' } });
  await new Promise((resolve) => setTimeout(resolve, 30));

  assert.equal(writes.length, 2);
  assert.equal(writes[0].requested, 'Gator');
  const gatorReread = loader.prepareTinTinRead(writes[0].content, emptyDefinitions());
  assert.equal(gatorReread.ok, true, gatorReread.errors?.join('\n'));
  assert.deepEqual(gatorReread.definitions, gatorDefinitions);
  assert.equal(gatorReread.definitions.aliases.some((entry) => entry.name === 'k'), false);

  assert.equal(writes[1].requested, 'Prime.tin');
  const mainReread = loader.prepareTinTinRead(writes[1].content, emptyDefinitions());
  assert.equal(mainReread.ok, true, mainReread.errors?.join('\n'));
  assert.deepEqual(mainReread.definitions, mainDefinitions);
  assert.equal(mainReread.definitions.aliases.some((entry) => entry.name === 'gatoronly'), false);
  assert.match(dom.window.document.querySelector('#output').textContent, /#OK: WROTE Prime\.tin\./u);
  dom.window.close();
});
test('writer preserves native dollar references and braced variable names verbatim', () => {
  const result = writer.prepareTinTinWrite({
    variables: [{ name: 'cool website', value: 'https://nukefire.org', scope: 'global' }],
    aliases: [{ name: 'visit', body: '#showme {Visit ${cool website}; $$target}', scope: 'global' }]
  });
  assert.equal(result.ok, true);
  assert.match(result.content, /#variable \{cool website\} \{https:\/\/nukefire\.org\}/u);
  assert.equal(result.content.includes('#alias {visit} {#showme \\{Visit $\\{cool website\\}; $$target\\}}'), true);
});
