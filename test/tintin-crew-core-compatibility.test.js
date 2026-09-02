'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  AliasEngine,
  splitAliasCommands,
  DEFAULT_MAX_ALIAS_COMMANDS
} = require('../src/alias-engine');
const {
  MacroEngine,
  parseMacroKey,
  MAX_MACRO_COMMANDS
} = require('../src/macro-engine');
const {
  ActionRateLimiter,
  DEFAULT_RATE_LIMIT
} = require('../src/action-engine');
const loader = require('../src/tintin-script-loader');
const writer = require('../src/tintin-script-writer');

function emptyDefinitions() {
  return {
    aliases: [],
    variables: [],
    functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    classes: { activeStack: [], definitions: [] }
  };
}

test('crew files accept TinTin generated literal-backslash config without corrupting later definitions', () => {
  const source = [
    '#CONFIG {VERBATIM} {OFF}',
    '#CONFIG {VERBATIM CHAR} {\\}',
    '#ALIAS {after} {look}',
    '#VARIABLE {leader} {0}'
  ].join('\n');
  const result = loader.prepareTinTinRead(source, emptyDefinitions(), { filename: 'crew.tin' });
  assert.equal(result.ok, true);
  assert.equal(result.definitions.aliases[0].name, 'after');
  assert.equal(result.definitions.variables[0].name, 'leader');
  assert.deepEqual([...new Set(result.unsupported.map((entry) => entry.directive))], []);
  assert.equal(result.compatibilityNoops.filter((entry) => entry.directive === 'config').length, 0);
});

test('#NOP wins before named-session route detection and keeps disabled macros inert', () => {
  const source = [
    '#NOP #MACRO {\\eOy}',
    '{',
    '  kill mob;',
    '  pow',
    '}',
    '#MACRO {\\eOs} {kill mob}'
  ].join('\n');
  const result = loader.prepareTinTinRead(source, emptyDefinitions(), { filename: 'nop.tin' });
  assert.equal(result.ok, true);
  assert.equal(result.routedCommands.length, 0);
  assert.equal(result.definitions.macros.definitions.length, 1);
  assert.equal(result.definitions.macros.definitions[0].code, 'Numpad3');
});

test('TinTin pattern aliases preserve multi-word captures used by character files', () => {
  const engine = new AliasEngine();
  assert.ok(engine.define('insc %1', 'rem %1;buy inscribe %1 Thog;wear %1'));
  assert.deepEqual(engine.expandCommands('insc carbon fiber shoulder plate').commands, [
    'rem carbon fiber shoulder plate',
    'buy inscribe carbon fiber shoulder plate Thog',
    'wear carbon fiber shoulder plate'
  ]);

  assert.ok(engine.define('raid %1', '#all fol %1;groupassist default tail'));
  assert.deepEqual(engine.expandCommands('raid Noth').commands, [
    '#all fol Noth',
    'groupassist default tail'
  ]);
});

test('TinTin multi-word alias patterns capture around literal words and catch-all input', () => {
  const engine = new AliasEngine();
  assert.ok(engine.define('k %1 with %2', 'draw %2;attack %1'));
  assert.deepEqual(engine.expandCommands('k blue smurf with battle axe').commands, [
    'draw battle axe',
    'attack blue smurf'
  ]);
  assert.ok(engine.define('%*', '#show {You wrote: %0}'));
  assert.equal(engine.expand('some otherwise unknown command').command, '#show {You wrote: some otherwise unknown command}');
});

test('explicit aliases are bounded at 128 commands for veteran route/controller bodies', () => {
  assert.equal(DEFAULT_MAX_ALIAS_COMMANDS, 128);
  const fortyEight = Array.from({ length: 48 }, (_value, index) => `cmd${index}`).join(';');
  const oneTwentyEight = Array.from({ length: 128 }, (_value, index) => `cmd${index}`).join(';');
  const oneTwentyNine = `${oneTwentyEight};overflow`;
  assert.equal(splitAliasCommands(oneTwentyEight).commands.length, 128);
  assert.match(splitAliasCommands(oneTwentyNine).error, /at most 128/u);
  const engine = new AliasEngine();
  assert.ok(engine.define('gotoaa', fortyEight));
  assert.equal(engine.expandCommands('gotoaa').commands.length, 48);
});

test('real TinTin terminal sequences translate to Ctrl-Z and numeric keypad physical keys', () => {
  const expected = new Map([
    ['\\cz', ['ctrl+KeyZ', 'KeyZ']],
    ['\\eOy', ['Numpad9', 'Numpad9']],
    ['\\eOu', ['Numpad5', 'Numpad5']],
    ['\\eOs', ['Numpad3', 'Numpad3']],
    ['\\eOk', ['NumpadAdd', 'NumpadAdd']],
    ['\\eOn', ['NumpadDecimal', 'NumpadDecimal']]
  ]);
  for (const [sequence, [signature, code]] of expected) {
    const parsed = parseMacroKey(sequence);
    assert.equal(parsed.error, '');
    assert.equal(parsed.signature, signature);
    assert.equal(parsed.code, code);
  }
});

test('crew macros accept bounded 19-command coordination while retaining a 32-command ceiling', () => {
  assert.equal(MAX_MACRO_COMMANDS, 32);
  const macros = new MacroEngine();
  const nineteen = Array.from({ length: 19 }, (_value, index) => `cmd${index}`).join(';');
  const record = macros.define('\\eOy', nineteen);
  assert.ok(record);
  assert.equal(record.commands.length, 19);
  const tooMany = Array.from({ length: 33 }, (_value, index) => `cmd${index}`).join(';');
  assert.equal(macros.define('\\eOs', tooMany), null);
});

test('Action limiter admits a queued 21-command death recovery burst but still caps the one-second window', () => {
  assert.equal(DEFAULT_RATE_LIMIT, 32);
  const limiter = new ActionRateLimiter({ duplicateCooldownMs: 0, noticeIntervalMs: 500 });
  const action = { pattern: '^You are dead!  Sorry...' };
  assert.equal(limiter.allowCommands(action, 'death one', 21, 1000).allowed, true);
  assert.deepEqual(limiter.allowCommands(action, 'death two', 12, 1100), {
    allowed: false,
    reason: 'rate-limit',
    notify: true
  });
  assert.equal(limiter.allowCommands(action, 'death three', 21, 2100).allowed, true);
});

test('#ALL client commands are dispatched through each target session pipeline instead of sockets', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'session-manager.js'), 'utf8');
  assert.match(source, /if \(isClientCommand\(rawRoutedCommand, this\.commandPrefix\)\)/u);
  assert.match(source, /this\.dispatchCommand\(target, rawRoutedCommand,/u);
  assert.match(source, /maximum routing depth of 4/u);
  assert.match(source, /else \{\s+const variables = options\.variablesExpanded/u);
});

test('#BUFFER END is a native renderer command that returns the existing terminal to its live edge', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(source, /function parseLocalBufferCommand\(commandValue\)/u);
  assert.match(source, /\^buffer\\s\+\(\?:\\\{end\\\}\|end\)\$/u);
  assert.match(source, /function handleLocalBufferCommand\(commandValue\)[\s\S]*returnOutputToLive\(\)/u);
  assert.match(source, /containsLocalRendererCommand/u);
});

test('pattern aliases survive deterministic #write then atomic #read', () => {
  const snapshot = emptyDefinitions();
  snapshot.aliases = [
    { name: 'insc %1', body: 'rem %1; buy inscribe %1 Thog; wear %1', scope: 'global' }
  ];
  const written = writer.prepareTinTinWrite(snapshot);
  assert.equal(written.ok, true);
  assert.match(written.content, /#alias \{insc %1\}/u);
  const reread = loader.prepareTinTinRead(written.content, emptyDefinitions(), { filename: 'roundtrip.tin' });
  assert.equal(reread.ok, true);
  assert.equal(reread.definitions.aliases[0].name, 'insc %1');
});
