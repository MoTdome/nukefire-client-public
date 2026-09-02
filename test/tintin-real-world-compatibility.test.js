'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { AliasEngine } = require('../src/alias-engine');
const importer = require('../src/tintin-importer');
const loader = require('../src/tintin-script-loader');
const { firstDirective } = require('../src/client-command-parser');
const { parseMacroKey } = require('../src/macro-engine');
const { ScriptStore, normalizeScriptRequest, candidateNames } = require('../src/script-store');

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

test('Athos-style punctuation aliases work in the live engine, importer, and #read loader', () => {
  const engine = new AliasEngine();
  assert.deepEqual(engine.define('/', '#ALL wake;#ALL st;#ALL recall'), {
    name: '/', body: '#ALL wake;#ALL st;#ALL recall', priority: 5, scope: 'global'
  });
  assert.equal(engine.expand('/').matched, true);

  const analysis = importer.analyzeTinTinPaste('#ALIAS {/} {#ALL wake;#ALL st}');
  assert.equal(analysis.summary.ready, 1);
  assert.equal(analysis.items[0].name, '/');

  const read = loader.prepareTinTinRead('#ALIAS {/} {#ALL wake;#ALL st}', emptyDefinitions());
  assert.equal(read.ok, true);
  assert.equal(read.definitions.aliases[0].name, '/');
});

test('common TinTin short directives canonicalize without stealing character routes', () => {
  assert.equal(firstDirective('#UNACT {trail}', '#').directive, 'unaction');
  assert.equal(firstDirective('#VAR {target} {mutant}', '#').directive, 'variable');
  assert.equal(firstDirective('#FUN {twice} {#return %1}', '#').directive, 'function');
  assert.equal(firstDirective('#MAC {F1} {look}', '#').directive, 'macro');
  assert.equal(firstDirective('#AL {k} {kill %1}', '#').directive, 'alias');
  assert.equal(firstDirective('#an score', '#').directive, 'an');
});

test('Athos F1 through F5 TinTin terminal sequences translate to physical function keys', () => {
  const expected = [
    ['\\eOP', 'F1'], ['\\eOQ', 'F2'], ['\\eOR', 'F3'], ['\\eOS', 'F4'], ['\\e[15~', 'F5']
  ];
  for (const [source, key] of expected) {
    const parsed = parseMacroKey(source);
    assert.equal(parsed.error, '');
    assert.equal(parsed.code, key);
    assert.equal(parsed.signature, key);
  }
});

test('momain-style syntax now stages atomically while unsupported startup commands remain inert', () => {
  const source = `
/* Athos compatibility excerpt */
#ACTION {^%0 has summoned you!} {#ALL #SHOWME %0 has got $myname}
#ALIAS {/} {#ALL wake;#ALL st;#ALL recall}
#ALIAS {ntrack} {#UNACT {The trail of %%0 leads %%1 from here.}}
#VARIABLE {zt_zone} {}
#MACRO {\\eOP} {nuke ar;aramis;fake-password;1;1;#DELAY {2} {ar #READ voi.txt}}
#CONFIG {SPEEDWALK} {ON}
#EVENT {IAC WILL GMCP}
#READ dirs.txt
#SPLIT 3 1
#FUNCTION {get_hp_color}
{
  #MATH {temp_pct} {100 * %1 / %2};
  #RETURN <118>;
}
#EVENT {SECOND}
{
  #SHOWME {$kai_disp | $her_disp | $voi_disp | $nin_disp} {1};
}
`;
  const result = loader.prepareTinTinRead(source, emptyDefinitions(), { filename: 'momain.tin' });
  assert.equal(result.ok, true);
  assert.equal(result.counts.aliases, 2);
  assert.equal(result.counts.actions, 1);
  assert.equal(result.counts.variables, 1);
  assert.equal(result.counts.functions, 1);
  assert.equal(result.counts.macros, 1);
  assert.equal(result.definitions.macros.definitions[0].key, 'F1');
  assert.deepEqual(result.unsupportedCounts, {});
  assert.deepEqual(result.scriptIncludes.map((entry) => entry.requested), ['dirs.txt']);
  assert.equal(result.counts.events, 1);
  assert.equal(result.definitions.speedwalk.enabled, true);
  assert.equal(result.compatibilityNoops.filter((item) => item.directive === 'event-query').length, 1);
  assert.equal(result.compatibilityNoops.filter((item) => item.directive === 'split').length, 1);
  assert.equal(result.unsupported.some((item) => item.directive === 'server-command'), false);
});

test('jukishowstats-style class kill and routed multiline commands remain structurally intact', () => {
  const source = `#class jukistats kill
#class jukistats open
#alias {updateGyatt} {#SHOWME {$vHPBarGyatt} {-6}}
#gyatt #ACTION {< %1H %2M %3V %0>}
{
  #juki #var {gyattHpCurrent} {%1};
  #juki updateGyatt;
}
#juki #var {gyattHpMax} {1}
#class jukistats close
`;
  const result = loader.prepareTinTinRead(source, emptyDefinitions(), { filename: 'jukishowstats.tin' });
  assert.equal(result.ok, true);
  assert.equal(result.counts.aliases, 1);
  assert.equal(result.routedCommands.length, 2);
  assert.equal(result.unsupportedCounts['session-route'], undefined);
  assert.equal(result.unsupportedCounts.class, undefined);
  assert.equal(result.unsupportedCounts['server-command'], undefined);
  const routedAction = result.routedCommands.find((item) => item.directive === 'action');
  assert.ok(routedAction);
  assert.match(routedAction.command, /#juki #var \{gyattHpCurrent\}/u);
});

test('safe .txt TinTin command files can be read, edited, and explicitly written', async () => {
  const documentsDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'nukefire-athos-scripts-'));
  const store = new ScriptStore({ documentsDirectory });
  await store.ensureDirectory();
  assert.equal(normalizeScriptRequest('voi.txt'), 'voi.txt');
  assert.deepEqual(candidateNames('voi.txt'), ['voi.txt']);
  await fs.writeFile(path.join(store.directory, 'voi.txt'), '#alias {k} {kill %1}\n', 'utf8');
  const read = await store.read('VOI.TXT');
  assert.equal(read.ok, true);
  assert.equal(read.filename, 'voi.txt');
  const selected = await store.resolveSelectedPath(path.join(store.directory, 'voi.txt'));
  assert.equal(selected.ok, true);
  const written = await store.write('nin.txt', '#alias {n} {north}\n');
  assert.equal(written.ok, true);
  assert.equal(written.filename, 'nin.txt');
  assert.equal((await store.getInfo()).extensions?.includes?.('.txt') ?? store.getInfo().extensions.includes('.txt'), true);
});

test('native picker and profile labels preserve explicit .txt script identity', async () => {
  const main = await fs.readFile(path.join(__dirname, '..', 'main.js'), 'utf8');
  const renderer = await fs.readFile(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const manager = await fs.readFile(path.join(__dirname, '..', 'src', 'session-manager.js'), 'utf8');
  assert.match(main, /TinTin Scripts', extensions: \['tin', 'txt'\]/u);
  assert.match(renderer, /\/\\\.\(\?:tin\|txt\)\$\/iu\.test\(requested\)/u);
  assert.match(manager, /\/\\\.\(\?:tin\|txt\)\$\/iu\.test\(requestedProfile\)/u);
});
