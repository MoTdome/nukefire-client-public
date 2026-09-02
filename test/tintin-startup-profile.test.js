'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  DEFAULT_TINTIN_STARTUP,
  normalizeStartupFilename,
  normalizeTinTinStartupSettings,
  startupTemplateDefinitions,
  startupProfileIdentity
} = require('../src/tintin-startup');

const ROOT = path.join(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

test('startup settings default to an opt-in main.tin profile', () => {
  assert.deepEqual(DEFAULT_TINTIN_STARTUP, { enabled: false, filename: 'main.tin' });
  assert.deepEqual(normalizeTinTinStartupSettings({}), { enabled: false, filename: 'main.tin' });
  assert.deepEqual(normalizeTinTinStartupSettings({ enabled: true, filename: 'momain' }), {
    enabled: true,
    filename: 'momain.tin'
  });
});

test('startup filenames stay inside the safe Scripts folder and accept tin or txt', () => {
  assert.equal(normalizeStartupFilename('main.txt'), 'main.txt');
  assert.equal(normalizeStartupFilename('Athos Main.tin'), 'Athos Main.tin');
  assert.equal(normalizeStartupFilename('../secret.tin'), 'main.tin');
  assert.equal(normalizeStartupFilename('/tmp/secret.tin'), 'main.tin');
  assert.equal(normalizeStartupFilename('secret.js'), 'main.tin');
});

test('startup template cloning strips profile identity and never shares nested definition state', () => {
  const sourceSnapshot = {
    aliases: [{ name: 'aa', body: '#all assist anne' }],
    actions: { enabled: true, definitions: [{ pattern: '^Ready$', command: 'score' }] },
    profile: { requested: 'main', filename: 'main.tin', loaded: true }
  };
  const template = startupTemplateDefinitions(sourceSnapshot);
  assert.equal(Object.hasOwn(template, 'profile'), false);
  template.aliases[0].body = 'changed';
  template.actions.definitions[0].command = 'look';
  assert.equal(sourceSnapshot.aliases[0].body, '#all assist anne');
  assert.equal(sourceSnapshot.actions.definitions[0].command, 'score');
});

test('startup profile identity belongs only to Main and not to inherited character copies', () => {
  assert.deepEqual(startupProfileIdentity({ enabled: true, filename: 'momain.tin' }, 'momain.tin'), {
    requested: 'momain', filename: 'momain.tin', loaded: true
  });
  const inherited = startupTemplateDefinitions({
    aliases: [{ name: 'nuke', body: '#session {%1} tdome.nukefire.org 4000' }],
    profile: startupProfileIdentity({ enabled: true, filename: 'momain.tin' }, 'momain.tin')
  });
  assert.equal(Object.hasOwn(inherited, 'profile'), false);
});

test('each character can overlay its private copy without mutating the startup template', () => {
  const startup = startupTemplateDefinitions({
    aliases: [{ name: 'aa', body: '#all assist anne' }],
    variables: [{ name: 'myname', value: 'Anne' }],
    actions: { enabled: true, definitions: [{ pattern: '^You are poisoned!$', command: 'cure' }] }
  });
  const athos = startupTemplateDefinitions(startup);
  athos.variables[0].value = 'Athos';
  athos.aliases.push({ name: 'charonly', body: 'score' });
  assert.equal(startup.variables[0].value, 'Anne');
  assert.equal(startup.aliases.some((entry) => entry.name === 'charonly'), false);
  assert.equal(athos.actions.definitions.length, 1);
});

test('SessionManager inherits startup definitions only into genuinely new sessions', () => {
  const sessionSource = source('src/session-manager.js');
  assert.match(sessionSource, /setStartupTinTinTemplate\(definitionsValue = null\)/u);
  assert.match(sessionSource, /if \(options\.inheritStartup !== false\) this\.applyStartupTinTinTemplate\(tintin\);/u);
  assert.match(sessionSource, /createSession\(\{ \.\.\.definition, inheritStartup: false \}\)/u);
  assert.match(sessionSource, /snapshot\.profile = \{ requested: '', filename: '', loaded: false \};/u);
});

test('private profile reload starts from the startup template while startup auto-load uses the safe read parser', () => {
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /await prepareTinTinScriptLoad\(response, emptySessionTinTinState\(\), \{/u);
  assert.match(renderer, /const cleanProfile = startupBaseTinTinState\(\);/u);
  assert.match(renderer, /setTinTinStartupTemplate\(definitions\)/u);
  assert.match(renderer, /EACH NEW CHARACTER RECEIVES A PRIVATE COPY BEFORE ITS OWN PROFILE LOADS/u);
});

test('startup inheritance is persisted, accessible in Preferences, and crosses IPC only as parsed definitions', () => {
  const settings = source('src/settings-store.js');
  const html = source('renderer/index.html');
  const main = source('main.js');
  const preload = source('preload.js');
  assert.match(settings, /const SETTINGS_SCHEMA_VERSION = 48;/u);
  assert.match(settings, /tintinStartup: normalizeTinTinStartupSettings\(input\.tintinStartup\)/u);
  assert.match(html, /id="tintin-startup-enabled"/u);
  assert.match(html, /id="tintin-startup-file"/u);
  assert.match(html, /id="tintin-startup-save-current"[^>]*>Save Current TinTin State to Startup File</u);
  assert.match(html, /id="tintin-import-destination-file"/u);
  assert.match(html, /id="tintin-import-write-mode"/u);
  assert.match(html, /id="tintin-import-load-current"/u);
  assert.match(html, /id="tintin-import-make-startup"/u);
  assert.match(html, /id="tintin-startup-status"[^>]*role="status"[^>]*aria-live="polite"/u);
  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /saveTinTinDefinitionsToStartupFile/u);
  assert.match(renderer, /writeTinTinScript\(filename, prepared\.content\)/u);
  assert.match(renderer, /Save Selected to \$\{destination\.filename\}/u);
  assert.match(renderer, /refreshTinTinImportDestinations/u);
  assert.match(renderer, /Make this destination the global startup profile|tintin-import-make-startup/u);
  assert.match(renderer, /Startup profile \$\{response\.filename \|\| normalized\.filename\} is empty\./u);
  assert.match(main, /sessions:set-startup-template/u);
  assert.match(preload, /setTinTinStartupTemplate: \(definitions\) => ipcRenderer\.invoke\('sessions:set-startup-template', definitions\)/u);
});
