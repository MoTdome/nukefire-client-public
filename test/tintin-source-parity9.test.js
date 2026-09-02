'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const parser = require('../src/client-command-parser');
const { AliasEngine, DEFAULT_MAX_ALIAS_COMMANDS } = require('../src/alias-engine');
const { ActionEngine, DEFAULT_MAX_ACTIONS } = require('../src/action-engine');
const { VariableEngine, DEFAULT_MAX_VARIABLES } = require('../src/variable-engine');
const { SessionManager } = require('../src/session-manager');
const loader = require('../src/tintin-script-loader');

function inertManager() {
  let nextTimer = 0;
  return new SessionManager({
    queueOptions: { intervalMs: 0 },
    delaySetTimer: () => ({ id: ++nextTimer }), delayClearTimer: () => {},
    tickerSetTimer: () => ({ id: ++nextTimer }), tickerClearTimer: () => {}
  });
}

function emptyDefinitions() {
  return { aliases: [], variables: [], functions: [], actions: { enabled: true, definitions: [] }, gags: { enabled: true, definitions: [] }, highlights: { enabled: true, definitions: [] }, substitutes: { enabled: true, definitions: [] }, macros: { enabled: true, definitions: [] }, events: { enabled: true, definitions: [] }, classes: { activeStack: [], definitions: [] } };
}

test('TinTin script-body command splitting treats quotes as literal text while interactive splitting remains quote-aware', () => {
  assert.deepEqual(parser.splitTopLevelCommands("say 'hello; there';look", { maxCommands: 4 }).commands, ["say 'hello; there'", 'look']);
  assert.deepEqual(parser.splitTopLevelCommands("say 'hello; there';look", { maxCommands: 4, quoteAware: false }).commands, ["say 'hello", "there'", 'look']);
});

test('Alias and Action bodies follow source semicolon rules even when veteran prose contains unmatched quotes', () => {
  const aliases = new AliasEngine();
  const actions = new ActionEngine();
  assert.ok(aliases.define('prose', "say don't worry;look"));
  assert.deepEqual(aliases.expandCommands('prose').commands, ["say don't worry", 'look']);
  assert.ok(actions.define('Ready', "say 'unfinished;look"));
  assert.deepEqual(actions.match('Ready').commands, ["say 'unfinished", 'look']);
});

test('source-style variable/function expansion applies to definition selectors and UN selectors across definition families', () => {
  const manager = inertManager();
  const session = manager.createSession({ id: 'selectors', name: 'Selectors' });
  const run = (command) => manager.dispatchInput(session.id, command);
  run('#var {apat} {Alarm}'); run('#var {aname} {quick}'); run('#var {gpat} {Secret}');
  run('#var {hpat} {Danger}'); run('#var {hstyle} {red}'); run('#var {spat} {HP:}'); run('#var {mkey} {f5}'); run('#var {fname} {finder}');
  run('#action {$apat} {look}'); run('#alias {$aname} {look}'); run('#gag {$gpat}'); run('#highlight {$hpat} {$hstyle}');
  run('#substitute {$spat} {Health:}'); run('#macro {$mkey} {look}'); run('#function {$fname} {#return {ok}}');
  let snap = manager.snapshot();
  assert.ok(snap.actions.definitions.some((r) => r.pattern === 'Alarm'));
  assert.ok(snap.aliases.some((r) => r.name === 'quick'));
  assert.ok(snap.gags.definitions.some((r) => r.pattern === 'Secret'));
  assert.ok(snap.highlights.definitions.some((r) => r.pattern === 'Danger'));
  assert.ok(snap.substitutes.definitions.some((r) => r.pattern === 'HP:'));
  assert.ok(snap.macros.definitions.some((r) => r.label === 'F5' || r.key === 'F5'));
  assert.ok(snap.functions.some((r) => r.name === 'finder'));
  run('#unaction {$apat}'); run('#unalias {$aname}'); run('#ungag {$gpat}'); run('#unhighlight {$hpat}'); run('#unsubstitute {$spat}'); run('#unmacro {$mkey}'); run('#unfunction {$fname}');
  snap = manager.snapshot();
  assert.equal(snap.actions.definitions.length, 0); assert.equal(snap.aliases.length, 0); assert.equal(snap.gags.definitions.length, 0);
  assert.equal(snap.highlights.definitions.length, 0); assert.equal(snap.substitutes.definitions.length, 0); assert.equal(snap.macros.definitions.length, 0); assert.equal(snap.functions.length, 0);
});

test('itgrab-style dynamic Alias definitions import atomically and preserve escaped generated command separators', () => {
  const result = loader.prepareTinTinRead(`#alias {additem $iteml $itemk} {#alias {$iteml} {get all.$itemk\\;\\put all.$itemk orb}}\n#action {Item: %1} {additem %1 key}\n`, emptyDefinitions(), { filename: 'itgrab.tin' });
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.equal(result.counts.aliases, 0);
  assert.equal(result.counts.actions, 1);
  const generated = result.runtimeCommands.find((entry) => entry.directive === 'alias');
  assert.ok(generated);
  assert.equal(generated.persistOnImport, true);
  assert.match(generated.command, /additem \$iteml \$itemk/u);
  assert.match(generated.command, /all\.\$itemk\\;\\put all\.\$itemk orb/u);
});

test('dynamic load-time definition selectors stay executable at READ time while protected command-name Aliases are salvaged', () => {
  const dynamic = loader.prepareTinTinRead(`#var {itemx[$getfromlist][$kwlist][$getfromlist]} {itemy}\n#highlight {$pattern} {$style}\n`, emptyDefinitions(), { filename: 'dynamic-load.tin' });
  assert.equal(dynamic.ok, true, dynamic.errors?.join('\n'));
  assert.deepEqual(dynamic.runtimeCommands.map((entry) => entry.directive), ['variable', 'highlight']);
  assert.ok(dynamic.runtimeCommands.every((entry) => entry.persistOnImport === true));
  const protectedAlias = loader.prepareTinTinRead('#alias {#al} {cc} {5}\n#alias {safe} {look}', emptyDefinitions(), { filename: 'protected.tin' });
  assert.equal(protectedAlias.ok, true, protectedAlias.errors?.join('\n'));
  assert.equal(protectedAlias.counts.aliases, 1);
  assert.equal(protectedAlias.definitions.aliases[0]?.name, 'safe');
  assert.equal(protectedAlias.unsupported[0]?.directive, 'alias-command-name');
});

test('one-argument source query forms import as harmless queries and historical GREY maps to source SILVER', () => {
  for (const [directive, expected] of [['var','variable-query'], ['function','function-query'], ['highlight','highlight-query'], ['substitute','substitute-query'], ['macro','macro-query']]) {
    const result = loader.prepareTinTinRead(`#${directive} {thing}`, emptyDefinitions());
    assert.equal(result.ok, true, result.errors?.join('\n'));
    assert.equal(result.compatibilityNoops[0]?.directive, expected);
  }
  const zero = loader.prepareTinTinRead('#var', emptyDefinitions());
  assert.equal(zero.ok, true, zero.errors?.join('\n'));
  assert.equal(zero.compatibilityNoops[0]?.directive, 'variable-list');
  const grey = loader.prepareTinTinRead('#highlight {Danger} {grey}', emptyDefinitions());
  assert.equal(grey.ok, true, grey.errors?.join('\n'));
  assert.equal(grey.definitions.highlights.definitions[0]?.style, 'grey');
});

test('measured veteran Alias route ceiling accepts 88-command historical bodies while retaining a 128-command bound', () => {
  assert.equal(DEFAULT_MAX_ALIAS_COMMANDS, 128);
  const aliases = new AliasEngine();
  assert.ok(aliases.define('route88', Array.from({ length: 88 }, (_, i) => `s${i}`).join(';')));
  assert.ok(aliases.define('route128', Array.from({ length: 128 }, (_, i) => `s${i}`).join(';')));
  assert.equal(aliases.define('route129', Array.from({ length: 129 }, (_, i) => `s${i}`).join(';')), null);
});

test('historical 908-Action files fit the bounded 1024-Action source-parity ceiling', () => {
  assert.equal(DEFAULT_MAX_ACTIONS, 1024); assert.equal(loader.LIMITS.actions, 1024);
  const source = Array.from({ length: 908 }, (_, i) => `#action {mob${i}} {look}`).join('\n');
  const result = loader.prepareTinTinRead(source, emptyDefinitions()); assert.equal(result.ok, true, result.errors?.join('\n')); assert.equal(result.counts.actions, 908);
  const overflow = Array.from({ length: 1025 }, (_, i) => `#action {mob${i}} {look}`).join('\n');
  const failed = loader.prepareTinTinRead(overflow, emptyDefinitions()); assert.equal(failed.ok, false); assert.match(failed.errors.join('\n'), /limit of 1,024|limit of 1024/u);
});

test('historical 1179-record nested variable snapshots fit the bounded 2048-variable ceiling', () => {
  assert.equal(DEFAULT_MAX_VARIABLES, 2048); assert.equal(loader.LIMITS.variables, 2048);
  const source = Array.from({ length: 1179 }, (_, i) => `#var {loot[item${i}]} {${i}}`).join('\n');
  const result = loader.prepareTinTinRead(source, emptyDefinitions()); assert.equal(result.ok, true, result.errors?.join('\n')); assert.equal(result.counts.variables, 1179);
  const maximum = Array.from({ length: 2048 }, (_, i) => `#var {v${i}} {${i}}`).join('\n'); assert.equal(loader.prepareTinTinRead(maximum, emptyDefinitions()).ok, true);
  const overflow = `${maximum}\n#var {overflow} {1}`; const failed=loader.prepareTinTinRead(overflow, emptyDefinitions()); assert.equal(failed.ok,false); assert.match(failed.errors.join('\n'), /limit of 2,048|limit of 2048/u);
});

test('large real scripts may contain up to 10000 top-level commands but the whole-file parser remains bounded', () => {
  assert.equal(loader.MAX_DEFINITIONS, 10_000);
  const tenThousand = Array.from({ length: 10_000 }, (_, i) => `#nop {${i}}`).join('\n');
  assert.equal(loader.prepareTinTinRead(tenThousand, emptyDefinitions()).ok, true);
  const tooMany = `${tenThousand}\n#nop {overflow}`;
  const failed = loader.prepareTinTinRead(tooMany, emptyDefinitions()); assert.equal(failed.ok, false); assert.match(failed.errors.join('\n'), /more than 10,000 commands/u);
});
