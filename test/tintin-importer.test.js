'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const importer = require('../src/tintin-importer');
const loader = require('../src/tintin-script-loader');


test('parses mixed TinTin alias/action abbreviations, multiline braces, priorities, and comments', () => {
  const result = importer.analyzeTinTinPaste(`
#alias {k} {kill %1;kick}
#AL {heal %1} {
  cast 'heal' %1;
  score
} {4}
#ACTION {%1 tells you '%2'}
{
  tell %1 I heard you.
}
{2}
#nop #alias {disabled} {quit}
#nop {
  #action {hidden} {shutdown}
}
`);

  assert.deepEqual(result.summary, {
    total: 3,
    aliases: 2,
    actions: 1,
    ready: 2,
    translated: 1,
    warning: 0,
    unsupported: 0,
    ignoredComments: 2,
    malformed: 0,
    sourceTruncated: false
  });
  const [kill, heal, tell] = result.items;
  assert.equal(kill.type, 'alias');
  assert.equal(kill.name, 'k');
  assert.equal(kill.body, 'kill %1;kick');
  assert.equal(kill.status, 'ready');
  assert.equal(kill.selected, true);
  assert.equal(heal.type, 'alias');
  assert.equal(heal.name, 'heal');
  assert.equal(heal.body, "cast 'heal' %1; score");
  assert.equal(heal.status, 'translated');
  assert.equal(heal.selected, true);
  assert.match(heal.notes[0], /argument placeholders/u);
  assert.equal(tell.type, 'action');
  assert.equal(tell.pattern, "%1 tells you '%2'");
  assert.equal(tell.command, 'tell %1 I heard you.');
  assert.equal(tell.priority, 2);
  assert.equal(tell.enabled, false);
  assert.equal(tell.status, 'ready');
  assert.equal(tell.selected, true);
});


test('preserves compatible TinTin captures and translates safe routing prefixes', () => {
  const result = importer.analyzeTinTinPaste(`
#alias {crew %1} {#all kill %1}
#action {^%1 cracks and falls off of you$} {say %1 broke;echo %0} {5}
`, { commandPrefix: '~' });

  assert.equal(result.summary.translated, 1);
  assert.equal(result.summary.ready, 1);
  assert.equal(result.items[0].name, 'crew');
  assert.equal(result.items[0].body, '~all kill %1');
  assert.equal(result.items[1].pattern, '^%1 cracks and falls off of you$');
  assert.equal(result.items[1].command, 'say %1 broke;echo %0');
});


test('flags TinTin scripting, advanced patterns, legacy pattern %0, and oversized command bursts', () => {
  const result = importer.analyzeTinTinPaste(`
#action {< %1H %2M %3V >} {#variable hp %1;#math diff {$hp - 1}}
#action {%1 {hits|misses} you} {say combat}
#action {Value: %0} {say %0}
#alias {long} {n;s;e;w;n;s;e;w;n;s;e}
`);

  assert.equal(result.summary.unsupported, 4);
  assert.match(result.items[0].reasons.join(' '), /#variable/u);
  assert.match(result.items[1].reasons.join(' '), /PCRE/u);
  assert.match(result.items[2].reasons.join(' '), /Legacy %0/u);
  assert.match(result.items[3].reasons.join(' '), /more than 10 commands/u);
  assert.ok(result.items.every((item) => item.selected === false));
});


test('unknown hash routes are reviewable but nested TinTin directives remain blocked', () => {
  const result = importer.analyzeTinTinPaste(`
#alias {healshai} {#Shai heal %1}
#alias {badroute} {#Shai #variable target %1}
#alias {clienthelp} {#help alias}
`);

  assert.equal(result.items[0].status, 'warning');
  assert.match(result.items[0].warnings[0], /possible NukeFire session/u);
  assert.equal(result.items[1].status, 'unsupported');
  assert.match(result.items[1].reasons.join(' '), /#variable/u);
  assert.equal(result.items[2].status, 'unsupported');
  assert.match(result.items[2].reasons.join(' '), /#help/u);
});


test('merge keeps or replaces duplicates, disables imported actions, and honors capacities', () => {
  const analysis = importer.analyzeTinTinPaste(`
#alias {k} {kill %1;kick}
#alias {heal} {cast heal %1}
#action {You are hungry} {eat bread} {3}
`);
  const existing = {
    aliases: [{ name: 'k', body: 'kill %1', scope: 'global' }],
    actions: {
      enabled: true,
      definitions: [{ pattern: 'Existing', command: 'look', priority: 5, enabled: true }]
    }
  };

  const kept = importer.mergeImportSelection(analysis, existing, {
    duplicatePolicy: 'keep', maxAliases: 2, maxActions: 2
  });
  assert.equal(kept.skippedDuplicates, 1);
  assert.equal(kept.importedAliases, 1);
  assert.equal(kept.importedActions, 1);
  assert.equal(kept.aliases.find((record) => record.name === 'k').body, 'kill %1');
  assert.equal(kept.actions.definitions.find((record) => record.pattern === 'You are hungry').enabled, false);

  const replaced = importer.mergeImportSelection(analysis, existing, {
    duplicatePolicy: 'replace', maxAliases: 1, maxActions: 1
  });
  assert.equal(replaced.replacedAliases, 1);
  assert.equal(replaced.skippedCapacity, 2);
  assert.equal(replaced.aliases[0].body, 'kill %1;kick');
});


test('the supplied legacy stress sample parses without malformed top-level definitions', () => {
  const samplePath = '/mnt/data/Pasted text(162).txt';
  if (!fs.existsSync(samplePath)) return;
  const result = importer.analyzeTinTinPaste(fs.readFileSync(samplePath, 'utf8'));
  assert.equal(result.summary.aliases, 330);
  assert.equal(result.summary.actions, 130);
  assert.equal(result.summary.malformed, 0);
  assert.equal(result.summary.ignoredComments, 12);
  assert.equal(result.limitReached, false);
  assert.ok(result.summary.ready + result.summary.translated >= 250);
  assert.ok(result.summary.unsupported >= 170);
});



test('repairs the common old TinTin missing closing double quote before a semicolon', () => {
  const result = importer.analyzeTinTinPaste(`#ALIAS {birdle}
{
  : says, "Here, I brought you something, %1…;
  : reaches down into his pocket.;
  : gives %1 the BIRD! Hahahaha!!
}`);

  assert.equal(result.summary.aliases, 1);
  assert.equal(result.summary.translated, 1);
  assert.equal(result.summary.unsupported, 0);
  const item = result.items[0];
  assert.equal(item.status, 'translated');
  assert.equal(item.selected, true);
  assert.equal(item.body,
    ': says, "Here, I brought you something, %1…"; : reaches down into his pocket.; : gives %1 the BIRD! Hahahaha!!');
  assert.match(item.notes.join(' '), /Closed an unterminated double quote/u);

  const { AliasEngine } = require('../src/alias-engine');
  const engine = new AliasEngine({ aliases: [{ name: item.name, body: item.body }] });
  assert.equal(engine.list().length, 1);
  assert.deepEqual(engine.expandCommands('birdle Shai').commands, [
    ': says, "Here, I brought you something, Shai…"',
    ': reaches down into his pocket.',
    ': gives Shai the BIRD! Hahahaha!!'
  ]);
});


test('blocks genuinely ambiguous unterminated quotes instead of reporting a false success', () => {
  const result = importer.analyzeTinTinPaste(`#alias {broken} {say "This never closes}`);
  const item = result.items[0];
  assert.equal(item.status, 'unsupported');
  assert.equal(item.selected, false);
  assert.match(item.reasons.join(' '), /unterminated quote/u);
});


test('quote repair leaves apostrophes and valid quoted spell names alone', () => {
  const result = importer.analyzeTinTinPaste(`
#alias {cant} {say I can't stop;cast 'heal' %1}
#alias {quoted} {say "Everything is fine";smile}
`);
  assert.equal(result.summary.ready, 2);
  assert.equal(result.summary.translated, 0);
  assert.equal(result.summary.unsupported, 0);
  assert.equal(result.items[0].body, "say I can't stop;cast 'heal' %1");
  assert.equal(result.items[1].body, 'say "Everything is fine";smile');
});

test('renderer lists destination scripts, preserves merge text, and can load the saved result into the current character', async () => {
  let JSDOM;
  try {
    ({ JSDOM } = require('jsdom'));
  } catch (_error) {
    return;
  }
  const ansi = require('../src/ansi-parser');
  const writer = require('../src/tintin-script-writer');
  const startup = require('../src/tintin-startup');
  const { installFakeXterm } = require('./fake-xterm');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://nukefire.test/' });
  const handlers = {};
  const definitionReplacements = [];
  const saves = [];
  const scriptWrites = [];
  const scriptContents = new Map([
    ['combat.tin', '/* KEEP THIS COMMENT */\n#alias {old} {look}\n#showme {legacy runtime line}\n'],
    ['main.tin', '#alias {mainonly} {score}\n']
  ]);
  let releaseRestore;
  const restoreGate = new Promise((resolve) => { releaseRestore = resolve; });

  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireTinTinImporter = importer;
  dom.window.NukeFireTinTinScriptLoader = loader;
  dom.window.NukeFireTinTinScriptWriter = writer;
  dom.window.NukeFireTinTinStartup = startup;
  dom.window.nukefire = {
    listSessions: async () => null,
    restoreSessions: async (snapshot) => ({ snapshot }),
    replaceSessionDefinitions: async (sessionId, definitions) => {
      definitionReplacements.push({ sessionId, definitions });
      await restoreGate;
      return {
        snapshot: {
          activeSessionId: 'main',
          sessions: [{ id: 'main', name: 'Main', role: 'tank', host: 'mud.test', port: 4000, tintin: definitions }],
          groups: {},
          ...definitions,
          commandPrefix: '#'
        }
      };
    },
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null, loadSettings: async () => null,
    saveSettings: async (settings) => { saves.push(settings); return { ok: true }; }, loadMap: async () => null,
    getTinTinScriptsInfo: async () => ({ ok: true, files: [...scriptContents.keys()], info: { directory: '/Documents/NukeFire Client/Scripts' } }),
    readTinTinScript: async (requested) => {
      const filename = [...scriptContents.keys()].find((name) => name.toLowerCase() === String(requested || '').toLowerCase());
      if (!filename) return { ok: false, error: `No script named ${requested} was found.` };
      const content = scriptContents.get(filename);
      return { ok: true, mode: 'read', filename, requested, content, size: Buffer.byteLength(content) };
    },
    writeTinTinScript: async (requested, content) => {
      const filename = /\.(?:tin|txt)$/iu.test(requested) ? requested : `${requested}.tin`;
      scriptWrites.push({ requested, content });
      scriptContents.set(filename, content);
      return { ok: true, filename, replaced: true };
    },
    setTinTinStartupTemplate: async () => ({ ok: true }),
    onText: () => {}, onStatus: () => {}, onEcho: () => {}, onGmcp: () => {},
    onPromptBoundary: () => {}, onError: () => {}, onMenuConnect: () => {},
    onMenuFind: () => {}, onMenuPreferences: () => {}, onMenuFocusCommand: () => {},
    onMenuFocusOutput: () => {}, onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onSessionEvent: (callback) => { handlers.session = callback; },
    onSessionsChanged: () => {}
  };

  dom.window.eval(source);
  const document = dom.window.document;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (document.querySelector('#tintin-import-destination-file').options.length >= 3) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.deepEqual(
    [...document.querySelector('#tintin-import-destination-file').options].map((option) => option.value),
    ['__choose__', 'combat.tin', 'main.tin', '__new__']
  );
  assert.equal(document.querySelector('#tintin-import-destination-file').value, '__choose__');
  assert.equal(document.querySelector('#tintin-import-commit').disabled, true);
  assert.equal(document.querySelector('#tintin-import-write-mode').value, 'merge');
  assert.equal(document.querySelector('#tintin-import-load-current').checked, true);

  document.querySelector('#tintin-import-destination-file').value = 'combat.tin';
  document.querySelector('#tintin-import-destination-file').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (document.querySelector('#tintin-import-destination-status').textContent.includes('combat.tin exists')) break;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.equal(document.querySelector('#tintin-import-destination-file').value, 'combat.tin');

  document.querySelector('#tintin-import-source').value = `
#alias {k} {kill %1;kick}
#alias {old} {north}
#action {%1 tells you '%2'} {tell %1 hello} {3}
`;
  document.querySelector('#tintin-import-analyze').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(document.querySelector('#tintin-import-review-panel').hidden, false);
  assert.equal(document.querySelectorAll('.tintin-import-item').length, 3);
  assert.equal(document.querySelectorAll('input[data-tintin-import-id]:checked').length, 3);
  assert.match(document.querySelector('#tintin-import-review').textContent, /In destination/u);
  document.querySelector('#tintin-import-duplicates').value = 'replace';
  document.querySelector('#tintin-import-duplicates').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(document.querySelector('#tintin-import-commit').textContent, 'Save Selected to combat.tin');

  document.querySelector('#tintin-import-commit').click();
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(document.querySelector('#tintin-import-commit').textContent, 'Saving TinTin Script…');
  assert.equal(document.querySelector('#tintin-import-commit').getAttribute('aria-busy'), 'true');
  assert.equal(scriptWrites.length, 1);
  assert.equal(scriptWrites[0].requested, 'combat.tin');
  assert.match(scriptWrites[0].content, /\/\* KEEP THIS COMMENT \*\//u);
  assert.match(scriptWrites[0].content, /#showme \{legacy runtime line\}/u);
  assert.match(scriptWrites[0].content, /#alias \{old\} \{look\}/u);
  assert.match(scriptWrites[0].content, /#alias \{old\} \{north\}/u);
  assert.match(scriptWrites[0].content, /#action \{disable\}/u);
  assert.equal(definitionReplacements.length, 1);
  assert.equal(definitionReplacements[0].definitions.aliases.find((record) => record.name === 'old').body, 'north');

  releaseRestore();
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.match(document.querySelector('#tintin-import-result').textContent, /Updated combat\.tin/u);
  assert.match(document.querySelector('#tintin-import-result').textContent, /load-time commands were not executed/u);
  assert.equal(document.querySelector('#tintin-import-result').dataset.tone, 'success');
  assert.equal(document.querySelector('#tintin-import-commit').textContent, 'Save Selected to combat.tin');
  assert.equal(document.querySelector('#tintin-import-commit').getAttribute('aria-busy'), 'false');
  assert.equal(document.querySelector('#tintin-import-undo').disabled, false);
  assert.ok(saves.length >= 1);
  dom.window.close();
});

test('imports show, showme, and echo as supported local display commands', () => {
  const result = importer.analyzeTinTinPaste(`
#alias {localwarn} {#showme {Danger: %1}}
#action {^Warning$} {#show {Act now}}
#alias {formatted} {#echo {HP: %d} {42}}
`, { commandPrefix: '^' });

  assert.equal(result.items[0].status, 'translated');
  assert.equal(result.items[0].body, '^showme {Danger: %1}');
  assert.equal(result.items[1].status, 'translated');
  assert.equal(result.items[1].command, '^show {Act now}');
  assert.equal(result.items[2].status, 'translated');
  assert.equal(result.items[2].body, '^echo {HP: %d} {42}');
});


test('imports math and format as supported scripting commands inside definitions', () => {
  const result = importer.analyzeTinTinPaste(`
#alias {calc} {#math {total} {$base * 2};#format {line} {Total: %d} {$total}}
#action {^Gain %1$} {#math {xp} {$xp + %1};#format {notice} {XP: %g} {$xp}}
`);
  assert.equal(result.summary.ready, 2);
  assert.equal(result.summary.unsupported, 0);
  assert.deepEqual(result.items.flatMap((item) => item.warnings), []);
});

test('native TinTin dollar variables remain ready without compatibility warnings', () => {
  const result = importer.analyzeTinTinPaste('#alias {strike} {bash $target;#showme {${cool website};$$target}}');
  assert.equal(result.summary.ready, 1);
  assert.equal(result.summary.warning, 0);
  assert.deepEqual(result.items[0].warnings, []);
});

test('imports numeric if elseif and else statements inside aliases and actions', () => {
  const result = importer.analyzeTinTinPaste(`
#alias {stance} {#if {$hp > 50} {bash};#elseif {$hp > 25} {kick};#else {flee}}
#action {^Danger$} {#if {$hp < 20} {flee;recall} {say steady}}
`);
  assert.equal(result.summary.ready, 2);
  assert.equal(result.summary.unsupported, 0);
  assert.deepEqual(result.items.flatMap((item) => item.reasons), []);
});
