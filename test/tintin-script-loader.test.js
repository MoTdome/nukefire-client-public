'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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

test('loads all currently supported TinTin definition families and familiar counts', () => {
  const result = loader.prepareTinTinRead(`
/* Prime definitions */
#alias {k} {kill %1;kick}
#variable {tank} {Caul}
#function {twice} {#math {result} {%1 * 2}}
#action {%1 attacks you} {bash %1} {2}
#gag {The wind howls.}
#highlight {WARNING} {light red} {1}
#substitute {credits} {shinies} {3}
#macro {F4} {north;look}
`, emptyDefinitions(), { filename: 'Prime.tin' });

  assert.equal(result.ok, true);
  assert.equal(result.comments, 1);
  assert.deepEqual(result.counts, {
    aliases: 1, variables: 1, functions: 1, actions: 1, gags: 1,
    highlights: 1, substitutes: 1, macros: 1, tabs: 0, events: 0
  });
  assert.equal(result.definitions.aliases[0].body, 'kill %1; kick');
  assert.equal(result.definitions.variables[0].value, 'Caul');
  assert.equal(result.definitions.functions[0].body, '#math {result} {%1 * 2}');
  assert.equal(result.definitions.actions.definitions[0].priority, 2);
  assert.equal(result.definitions.macros.definitions[0].key, 'F4');
  assert.deepEqual(loader.formatTinTinReadReport(result, 'Prime.tin').slice(0, 9), [
    '#OK: READ Prime.tin.',
    '#OK:   1 ACTION LOADED.',
    '#OK:   1 ALIAS LOADED.',
    '#OK:   1 FUNCTION LOADED.',
    '#OK:   1 GAG LOADED.',
    '#OK:   1 HIGHLIGHT LOADED.',
    '#OK:   1 SUBSTITUTION LOADED.',
    '#OK:   1 VARIABLE LOADED.',
    '#OK:   1 MACRO LOADED.'
  ]);
});

test('preserves the exact existing class snapshot while definitions are staged', () => {
  const existing = emptyDefinitions();
  existing.classes = {
    activeStack: ['combat'],
    definitions: [{ name: 'combat', saved: { aliases: [], variables: [], functions: [], actions: [], gags: [], highlights: [], substitutes: [], macros: [] } }]
  };
  const result = loader.prepareTinTinRead(`#class {prime} {open}
#alias {k} {kill %1}`, existing);
  assert.equal(result.ok, true);
  assert.deepEqual(result.definitions.classes, existing.classes);
  assert.equal(result.definitions.aliases[0].className, 'prime');
});

test('supports multiline balanced definitions and class open/close membership', () => {
  const result = loader.prepareTinTinRead(`#class {prime} {open}
#ALIAS {birdle}
{
  : says, "Here, %1";
  smile
}
#ACTION {^Danger$}
{
  flee;
  recall
}
#class {prime} {close}
#alias {global} {look}
`, emptyDefinitions());
  assert.equal(result.ok, true);
  assert.equal(result.definitions.aliases[0].className, 'prime');
  assert.equal(result.definitions.actions.definitions[0].className, 'prime');
  assert.equal(result.definitions.aliases.find((entry) => entry.name === 'global').className, undefined);
});

test('later definitions replace file and existing duplicates atomically', () => {
  const existing = emptyDefinitions();
  existing.aliases.push({ name: 'k', body: 'kill %1', scope: 'global' });
  const result = loader.prepareTinTinRead(`
#alias {k} {kick %1}
#alias {k} {bash %1}
`, existing);
  assert.equal(result.ok, true);
  assert.equal(result.definitions.aliases.length, 1);
  assert.equal(result.definitions.aliases[0].body, 'bash %1');
  assert.equal(result.replaced.existing, 1);
  assert.equal(result.replaced.withinFile, 1);
});

test('reports unsupported commands while preserving script includes for higher-level workflows', () => {
  const result = loader.prepareTinTinRead(`
#alias {k} {kill %1}
#function {heal} {#return {1}}
#ticker {pulse} {score} {60}
#read {other.tin}
myname
`, emptyDefinitions());
  assert.equal(result.ok, true);
  assert.equal(result.counts.aliases, 1);
  assert.equal(result.counts.functions, 1);
  assert.equal(result.unsupportedCounts.ticker, undefined);
  assert.equal(result.unsupportedCounts.read, undefined);
  assert.deepEqual(result.scriptIncludes.map((entry) => entry.requested), ['other.tin']);
  assert.deepEqual(result.runtimeCommands, [{
    directive: 'ticker', line: 4, command: '#ticker {pulse} {score} {60}', persistOnImport: true
  }]);
  assert.equal(result.unsupportedCounts['server-command'], 1);
  const report = loader.formatTinTinReadReport(result, 'Prime.tin').join('\n');
  assert.match(report, /1 FUNCTION LOADED/u);
  assert.doesNotMatch(report, /TICKER COMMAND SKIPPED/u);
  assert.doesNotMatch(report, /READ COMMAND SKIPPED/u);
});

test('malformed braces or comments abort the entire read', () => {
  const brace = loader.prepareTinTinRead('#alias {good} {look}\n#alias {bad} {say hi', emptyDefinitions());
  assert.equal(brace.ok, false);
  assert.match(brace.errors.join(' '), /unterminated brace/u);

  const comment = loader.prepareTinTinRead('#alias {good} {look}\n/* never closes', emptyDefinitions());
  assert.equal(comment.ok, false);
  assert.match(comment.errors.join(' '), /unterminated/u);
});

test('recognizes a non-default TinTin command character from the file', () => {
  const result = loader.prepareTinTinRead(`~alias {k} {kill %1}
~variable {tank} {Shai}
`, emptyDefinitions());
  assert.equal(result.ok, true);
  assert.equal(result.commandCharacter, '~');
  assert.equal(result.counts.aliases, 1);
  assert.equal(result.counts.variables, 1);
});

test('apostrophes in TinTin patterns and commands are not mistaken for open quotes', () => {
  const result = loader.prepareTinTinRead(`
#action {%1 can't move} {say I can't help %1;cast 'heal' %1}
#alias {cant} {say I can't stop}
`, emptyDefinitions());
  assert.equal(result.ok, true);
  assert.equal(result.counts.actions, 1);
  assert.equal(result.counts.aliases, 1);
});


test('renderer loads scripts atomically into only the target session, restores on save failure, and connects clean auto-profiles after the load attempt', async () => {
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
  const replacements = [];
  const saves = [];
  const connections = [];
  let failSave = false;
  let activeSessionId = 'main';

  const initialDefinitions = emptyDefinitions();
  initialDefinitions.aliases = [{ name: 'old', body: 'look', scope: 'global' }];
  initialDefinitions.classes = {
    activeStack: ['combat'],
    definitions: [{ name: 'combat', saved: { aliases: [], variables: [], functions: [], actions: [], gags: [], highlights: [], substitutes: [], macros: [] } }]
  };

  function normalizedDefinitions(definitions) {
    const cloned = JSON.parse(JSON.stringify(definitions || emptyDefinitions()));
    const classNames = new Set((cloned.classes?.definitions || []).map((entry) => entry.name));
    for (const category of ['aliases', 'variables']) {
      for (const record of cloned[category] || []) if (record.className) classNames.add(record.className);
    }
    for (const category of ['actions', 'gags', 'highlights', 'substitutes', 'macros']) {
      for (const record of cloned[category]?.definitions || []) if (record.className) classNames.add(record.className);
    }
    const saved = { aliases: [], variables: [], actions: [], gags: [], highlights: [], substitutes: [], macros: [] };
    cloned.classes = {
      activeStack: [...(cloned.classes?.activeStack || [])].filter((name) => classNames.has(name)),
      definitions: [...classNames].sort().map((name) => ({ name, saved }))
    };
    cloned.speedwalk = cloned.speedwalk && typeof cloned.speedwalk === 'object'
      ? { enabled: cloned.speedwalk.enabled === true }
      : { enabled: true };
    const tintinConfig = cloned.config && typeof cloned.config === 'object' ? cloned.config : {};
    const repeatChar = [...String(tintinConfig.repeatChar || '!')][0] || '!';
    const verbatimChar = [...String(tintinConfig.verbatimChar || '\\')][0] || '\\';
    cloned.config = {
      logMode: ['plain', 'raw'].includes(String(tintinConfig.logMode || '').trim().toLowerCase())
        ? String(tintinConfig.logMode).trim().toLowerCase()
        : 'plain',
      commandEcho: tintinConfig.commandEcho === true,
      verbatim: tintinConfig.verbatim === true,
      repeatChar: /\s/u.test(repeatChar) ? '!' : repeatChar,
      repeatEnter: tintinConfig.repeatEnter === true,
      verbatimChar: /\s/u.test(verbatimChar) ? '\\' : verbatimChar,
      historySize: Number.isSafeInteger(Number(tintinConfig.historySize))
        && Number(tintinConfig.historySize) >= 0
        && Number(tintinConfig.historySize) <= 9999
        ? Number(tintinConfig.historySize)
        : 2000,
      bufferSize: Number.isSafeInteger(Number(tintinConfig.bufferSize))
        && Number(tintinConfig.bufferSize) >= 100
        && Number(tintinConfig.bufferSize) <= 100000
        ? Number(tintinConfig.bufferSize)
        : 5000
    };
    cloned.profile = {
      requested: String(cloned.profile?.requested || ''),
      filename: String(cloned.profile?.filename || ''),
      loaded: cloned.profile?.loaded === true
    };
    return cloned;
  }

  const leakedWindDefinitions = emptyDefinitions();
  leakedWindDefinitions.aliases = [{ name: 'windonly', body: 'say wind', scope: 'global' }];
  leakedWindDefinitions.variables = [{ name: 'owner', value: 'Wind', scope: 'global' }];

  const sessionDefinitions = {
    main: normalizedDefinitions(initialDefinitions),
    gator: normalizedDefinitions(leakedWindDefinitions),
    missing: normalizedDefinitions(emptyDefinitions())
  };

  function snapshotFor(active = activeSessionId) {
    activeSessionId = active;
    const activeDefinitions = sessionDefinitions[activeSessionId] || normalizedDefinitions(emptyDefinitions());
    return {
      activeSessionId,
      sessions: [
        { id: 'main', name: 'Main', role: 'tank', host: 'mud.test', port: 4000, tintin: JSON.parse(JSON.stringify(sessionDefinitions.main)) },
        { id: 'gator', name: 'Gator', role: 'member', host: 'mud.test', port: 4000, tintin: JSON.parse(JSON.stringify(sessionDefinitions.gator)) },
        { id: 'missing', name: 'Missing', role: 'member', host: 'mud.test', port: 4000, tintin: JSON.parse(JSON.stringify(sessionDefinitions.missing)) }
      ],
      groups: {},
      commandPrefix: '#',
      ...JSON.parse(JSON.stringify(activeDefinitions))
    };
  }

  dom.window.NukeFireAnsi = ansi;
  const xterms = installFakeXterm(dom, { atLiveBottom: false });
  dom.window.NukeFireTinTinScriptLoader = loader;
  dom.window.nukefire = {
    listSessions: async () => ({ ok: true, snapshot: snapshotFor() }),
    restoreSessions: async (snapshot) => ({ snapshot }),
    replaceSessionDefinitions: async (sessionId, definitions) => {
      const target = String(sessionId || '');
      const normalized = normalizedDefinitions(definitions);
      replacements.push({ sessionId: target, definitions: JSON.parse(JSON.stringify(normalized)) });
      sessionDefinitions[target] = normalized;
      return { snapshot: snapshotFor(activeSessionId) };
    },
    readTinTinScript: async (requested) => {
      const name = String(requested || '').toLowerCase();
      if (name === 'prime') {
        return { ok: true, filename: 'Prime.tin', content: '#class {prime} {open}\n#alias {k} {kill %1}\n#variable {tank} {Caul}' };
      }
      if (name === 'brokensave') {
        return { ok: true, filename: 'BrokenSave.tin', content: '#class {temporary} {open}\n#alias {temp} {score}' };
      }
      if (name === 'gator') {
        return { ok: true, filename: 'gator.tin', content: '#alias {whoami} {say gator}\n#variable {owner} {Gator}' };
      }
      return { ok: false, error: `Script ${requested}.tin was not found.`, info: { directory: '/Scripts' } };
    },
    getTinTinScriptsInfo: async () => ({ ok: true, files: [], info: {} }),
    connectSession: async (sessionId, options) => {
      connections.push({ sessionId, options: { ...options }, replacementCount: replacements.length });
      return { ok: true, snapshot: snapshotFor(sessionId) };
    },
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null, loadSettings: async () => null,
    saveSettings: async (settings) => {
      saves.push(JSON.parse(JSON.stringify(settings)));
      if (failSave) throw new Error('disk full');
      return { ok: true };
    },
    loadMap: async () => null,
    onText: () => {}, onStatus: () => {}, onEcho: () => {}, onGmcp: () => {},
    onPromptBoundary: () => {}, onError: () => {}, onMenuConnect: () => {},
    onMenuFind: () => {}, onMenuPreferences: () => {}, onMenuFocusCommand: () => {},
    onMenuFocusOutput: () => {}, onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onSessionEvent: (callback) => { handlers.session = callback; },
    onSessionsChanged: (callback) => { handlers.sessions = callback; }
  };

  dom.window.eval(rendererSource);
  await new Promise((resolve) => setTimeout(resolve, 20));
  dom.window.document.querySelector('#follow-output').checked = false;
  handlers.session({ sessionId: 'main', type: 'script-read-request', payload: { requested: 'Prime' } });
  await new Promise((resolve) => setTimeout(resolve, 30));

  assert.equal(replacements.length, 1);
  assert.equal(replacements[0].sessionId, 'main');
  assert.deepEqual(replacements[0].definitions.aliases.map((entry) => entry.name).sort(), ['k', 'old']);
  assert.deepEqual(replacements[0].definitions.profile, { requested: 'Prime', filename: 'Prime.tin', loaded: true });
  assert.equal(sessionDefinitions.gator.aliases.length, 1);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].sessions.sessions.find((entry) => entry.id === 'main').tintin.aliases.some((entry) => entry.name === 'k'), true);
  assert.equal(saves[0].sessions.sessions.find((entry) => entry.id === 'gator').tintin.aliases.length, 1);
  assert.match(dom.window.document.querySelector('#output').textContent, /#OK: MERGED Prime\.tin INTO Main ONLY\./u);
  assert.match(dom.window.document.querySelector('#output').textContent, /#OK: READ Prime\.tin\./u);
  const readFeedbackWriteIndex = xterms[0].calls.findIndex(([name, runs]) =>
    name === 'writeRuns' && runs.some((run) => /#OK: READ Prime\.tin\./u.test(run.text))
  );
  const readFeedbackScrollIndex = xterms[0].calls.findIndex(
    ([name], index) => index > readFeedbackWriteIndex && name === 'scrollToBottom'
  );
  assert.ok(readFeedbackWriteIndex >= 0);
  assert.ok(readFeedbackScrollIndex > readFeedbackWriteIndex);

  const accepted = JSON.parse(JSON.stringify(sessionDefinitions.main));
  failSave = true;
  handlers.session({ sessionId: 'main', type: 'script-read-request', payload: { requested: 'BrokenSave' } });
  await new Promise((resolve) => setTimeout(resolve, 30));

  assert.equal(replacements.length, 3);
  assert.equal(replacements[1].sessionId, 'main');
  assert.equal(replacements[1].definitions.aliases.some((entry) => entry.name === 'temp'), true);
  assert.deepEqual(replacements[1].definitions.profile, { requested: 'Prime', filename: 'Prime.tin', loaded: true });
  assert.equal(replacements[2].sessionId, 'main');
  assert.deepEqual(replacements[2].definitions, accepted);
  assert.equal(replacements[2].definitions.classes.definitions.some((entry) => entry.name === 'temporary'), false);
  assert.match(dom.window.document.querySelector('#output').textContent, /Definitions were restored because settings could not be saved/u);

  failSave = false;
  handlers.sessions(snapshotFor('gator'));
  await new Promise((resolve) => setTimeout(resolve, 10));
  handlers.session({
    sessionId: 'gator',
    type: 'session-profile-load-request',
    payload: { requested: 'gator', connectAfter: { host: 'tdome.nukefire.org', port: 4000 } }
  });
  await new Promise((resolve) => setTimeout(resolve, 40));

  assert.equal(replacements.length, 5);
  assert.equal(replacements[3].sessionId, 'gator');
  assert.deepEqual(replacements[3].definitions.aliases, []);
  assert.deepEqual(replacements[3].definitions.variables, []);
  assert.deepEqual(replacements[3].definitions.profile, { requested: 'gator', filename: '', loaded: false });
  assert.equal(replacements[4].sessionId, 'gator');
  assert.deepEqual(replacements[4].definitions.aliases.map((entry) => entry.name), ['whoami']);
  assert.deepEqual(replacements[4].definitions.variables.map((entry) => [entry.name, entry.value]), [['owner', 'Gator']]);
  assert.deepEqual(replacements[4].definitions.profile, { requested: 'gator', filename: 'gator.tin', loaded: true });
  assert.match(dom.window.document.querySelector('#output').textContent, /PRIVATE PROFILE gator\.tin LOADED INTO Gator ONLY/u);
  assert.equal(replacements[4].definitions.aliases.some((entry) => entry.name === 'windonly'), false);
  assert.deepEqual(sessionDefinitions.main.aliases.map((entry) => entry.name).sort(), ['k', 'old']);
  assert.equal(connections.length, 1);
  assert.deepEqual(connections[0], {
    sessionId: 'gator',
    options: { host: 'tdome.nukefire.org', port: 4000 },
    replacementCount: 5
  });
  const gatorSave = saves.at(-1).sessions.sessions.find((entry) => entry.id === 'gator');
  const mainSave = saves.at(-1).sessions.sessions.find((entry) => entry.id === 'main');
  assert.deepEqual(gatorSave.tintin.aliases.map((entry) => entry.name), ['whoami']);
  assert.deepEqual(mainSave.tintin.aliases.map((entry) => entry.name).sort(), ['k', 'old']);

  handlers.sessions(snapshotFor('missing'));
  await new Promise((resolve) => setTimeout(resolve, 10));
  const replacementsBeforeMissing = replacements.length;
  handlers.session({
    sessionId: 'missing',
    type: 'session-profile-load-request',
    payload: { requested: 'missing', connectAfter: { host: 'tdome.nukefire.org', port: 4000 } }
  });
  await new Promise((resolve) => setTimeout(resolve, 40));

  assert.equal(replacements.length, replacementsBeforeMissing + 1);
  assert.equal(replacements.at(-1).sessionId, 'missing');
  assert.deepEqual(replacements.at(-1).definitions.aliases, []);
  assert.deepEqual(replacements.at(-1).definitions.profile, { requested: 'missing', filename: '', loaded: false });
  assert.equal(sessionDefinitions.missing.aliases.length, 0);
  assert.equal(connections.length, 2);
  assert.equal(connections[1].sessionId, 'missing');
  assert.equal(connections[1].replacementCount, replacementsBeforeMissing + 1);
  assert.match(dom.window.document.querySelector('#output').textContent, /Script missing\.tin was not found/u);
  dom.window.close();
});
test('loads writer management commands for disabled records, global states, and saved classes', () => {
  const result = loader.prepareTinTinRead(`#actions {off}
#action {Danger} {flee} {2}
#action {disable} {Danger}
#class {combat} {open}
#alias {saved} {score}
#class {combat} {close}
#class {combat} {save}
#class {combat} {clear}
#class {combat} {open}
#macro {F4} {north}
#macro {disable} {F4}
#class {combat} {activate}
`, emptyDefinitions());
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.equal(result.definitions.actions.enabled, false);
  assert.equal(result.definitions.actions.definitions[0].enabled, false);
  assert.equal(result.definitions.aliases.some((entry) => entry.name === 'saved'), false);
  const combat = result.definitions.classes.definitions.find((entry) => entry.name === 'combat');
  assert.equal(combat.saved.aliases[0].name, 'saved');
  assert.deepEqual(result.definitions.classes.activeStack, ['combat']);
  assert.equal(result.definitions.macros.definitions[0].enabled, false);
});

test('decodes writer structural escapes without removing unrelated backslashes', () => {
  const parsed = loader.tokenizeArguments('{say \\"ready\\" \\{now\\} C:\\\\Temp \\d+}');
  assert.equal(parsed.error, '');
  assert.deepEqual(parsed.tokens, ['say "ready" {now} C:\\Temp \\d+']);
});


test('safe reads accept braced variable names and preserve native dollar references', () => {
  const result = loader.prepareTinTinRead(`
#variable {cool website} {https://nukefire.org}
#variable {target} {old mutant}
#alias {visit} {#showme {Visit \${cool website}; kill $target; $$target}}
`, emptyDefinitions());
  assert.equal(result.ok, true);
  assert.deepEqual(result.definitions.variables, [
    { name: 'cool website', value: 'https://nukefire.org', scope: 'global' },
    { name: 'target', value: 'old mutant', scope: 'global' }
  ]);
  assert.equal(result.definitions.aliases[0].body, '#showme {Visit ${cool website}; kill $target; $$target}');
});

test('veteran load-time scripting commands are preserved for intentional READ without executing on paste', () => {
  const result = loader.prepareTinTinRead(`#format {starttime} {%T}
#delay 1 {#showme {ready}}
#math {counter} {1 + 2}
#replace {name} {a} {b}
#parse {abc} {letter} {#showme {$letter}}
#loop {1} {3} {i} {#showme {$i}}
#while {0} {#showme {never}}
#line {ignore} {#showme {quiet}}
#if {1} {#showme {yes}}
#foreach {a;b} {item} {#showme {$item}}
#regex {abc} {^a} {#showme {match}}
#switch {1} {#case {1} {#showme {one}}}
`, emptyDefinitions());
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.deepEqual(result.unsupported, []);
  assert.deepEqual(result.runtimeCommands.map((entry) => entry.directive), [
    'format', 'delay', 'math', 'replace', 'parse', 'loop', 'while', 'line',
    'if', 'foreach', 'regex', 'switch'
  ]);
  assert.equal(result.runtimeCommands.every((entry) => entry.persistOnImport === true), true);
});

test('unbraced nested variable names may contain spaces inside TinTin table keys', () => {
  const result = loader.prepareTinTinRead(`#var commsIgnore[Thundarr the Barbarian] 1
#var commsIgnore[Ice T] 1
#var commsIgnore[Lag Man] 1
`, emptyDefinitions());
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.deepEqual(result.definitions.variables.map((entry) => [entry.name, entry.value]), [
    ['commsignore[thundarr the barbarian]', '1'],
    ['commsignore[ice t]', '1'],
    ['commsignore[lag man]', '1']
  ]);
});

test('one-argument Alias remains a query no-op instead of becoming an import error', () => {
  const result = loader.prepareTinTinRead(`#al {ii disemb %1}
`, emptyDefinitions());
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.equal(result.definitions.aliases.length, 0);
  assert.equal(result.compatibilityNoops.some((entry) => entry.directive === 'alias-query'), true);
});

test('TinTin terminal-layout helpers remain no-ops while TAB is a real completion definition', () => {
  const result = loader.prepareTinTinRead(`#split {24}
#unsplit
#prompt {^Prompt$} {%0} {-2}
#tab signAdd
`, emptyDefinitions());
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.deepEqual(result.unsupported, []);
  assert.deepEqual(result.compatibilityNoops.map((entry) => entry.directive), ['split', 'unsplit', 'prompt']);
  assert.deepEqual(result.definitions.tabs, [{ value: 'signAdd' }]);
});
