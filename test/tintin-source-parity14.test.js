'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const loader = require('../src/tintin-script-loader');

function emptyDefinitions() {
  return {
    aliases: [], variables: [], functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    events: { enabled: true, definitions: [] },
    config: { logMode: 'plain', commandEcho: false, verbatim: false, repeatChar: '!', repeatEnter: false, verbatimChar: '\\', historySize: 2000, bufferSize: 5000 },
    classes: { activeStack: [], definitions: [] }, speedwalk: { enabled: true }
  };
}

test('READ follows TINTIN CHAR changes through # to ~ to # in file order', () => {
  const source = [
    '#CONFIG {TINTIN CHAR} {~}',
    '~ALIAS {wave} {~showme {wave from tilde}}',
    '~VARIABLE {tank} {Caul}',
    '~CONFIG {TINTIN CHAR} {#}',
    '#ALIAS {looky} {#showme {back on hash}}'
  ].join('\n');
  const result = loader.prepareTinTinRead(source, emptyDefinitions(), { commandPrefix: '#' });
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.deepEqual(result.runtimeCommands.map((entry) => entry.command), [
    '#CONFIG {TINTIN CHAR} {~}',
    '~CONFIG {TINTIN CHAR} {#}'
  ]);
  assert.equal(result.definitions.variables.find((entry) => entry.name === 'tank')?.value, 'Caul');
  assert.equal(result.definitions.aliases.find((entry) => entry.name === 'wave')?.body, '~showme {wave from tilde}');
  assert.equal(result.definitions.aliases.find((entry) => entry.name === 'looky')?.body, '#showme {back on hash}');
});

test('mixed command-character transitions also work across top-level semicolons', () => {
  const result = loader.prepareTinTinRead(
    '#CONFIG {TINTIN CHAR} {~};~ALIAS {a} {~showme A};~CONFIG {TINTIN CHAR} {#};#ALIAS {b} {#showme B}',
    emptyDefinitions(),
    { commandPrefix: '#' }
  );
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.deepEqual(result.definitions.aliases.map((entry) => [entry.name, entry.body]), [
    ['a', '~showme A'],
    ['b', '#showme B']
  ]);
});

test('old command character becomes a plain command after a source transition', () => {
  const result = loader.prepareTinTinRead([
    '#CONFIG {TINTIN CHAR} {~}',
    '#showme {this is no longer a TinTin command}',
    '~ALIAS {ok} {look}'
  ].join('\n'), emptyDefinitions(), { commandPrefix: '#' });
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.deepEqual(result.unsupported.filter((entry) => entry.directive === 'server-command'), [
    { directive: 'server-command', line: 2, detail: '#showme {this is no longer a TinTin command}' }
  ]);
  assert.equal(result.definitions.aliases[0]?.name, 'ok');
});

test('malformed command-character transition fails the whole READ atomically', () => {
  const result = loader.prepareTinTinRead([
    '#ALIAS {before} {look}',
    '#CONFIG {TINTIN CHAR} {~',
    '~ALIAS {after} {score}'
  ].join('\n'), emptyDefinitions(), { commandPrefix: '#' });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /unterminated brace/u);
});

test('splitScriptCommands records the command character active for each command', () => {
  const split = loader.splitScriptCommands([
    '#config {TINTIN CHAR} {~}',
    '~alias {a} {look}',
    '~config {TINTIN CHAR} {#}',
    '#alias {b} {score}'
  ].join('\n'), '#');
  assert.equal(split.ok, true, split.error);
  assert.deepEqual(split.commands.map((entry) => entry.commandCharacter), ['#', '~', '~', '#']);
});


test('comment stripping follows a transition to apostrophe command character', () => {
  const source = [
    "#CONFIG {TINTIN CHAR} {'}",
    "'ALIAS {one} {look}",
    "'ALIAS {two} {score} /* trailing comment */"
  ].join('\n');
  const result = loader.prepareTinTinRead(source, emptyDefinitions(), { commandPrefix: '#' });
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.deepEqual(result.definitions.aliases.map((entry) => entry.name), ['one', 'two']);
  assert.equal(result.comments, 1);
});

test('nested READ inherits the active TinTin character and child changes affect the parent afterward', async () => {
  const files = {
    'child.tin': [
      '~ALIAS {child} {~showme {child under tilde}}',
      '~CONFIG {TINTIN CHAR} {#}'
    ].join('\n')
  };
  const result = await loader.prepareTinTinReadTree([
    '#CONFIG {TINTIN CHAR} {~}',
    '~READ {child.tin}',
    '#ALIAS {after} {#showme {parent back on hash}}'
  ].join('\n'), emptyDefinitions(), {
    filename: 'main.tin',
    commandPrefix: '#',
    readFile: async (requested) => files[requested]
      ? { ok: true, filename: requested, content: files[requested] }
      : { ok: false, error: 'missing' }
  });
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.equal(result.definitions.aliases.find((entry) => entry.name === 'child')?.body, '~showme {child under tilde}');
  assert.equal(result.definitions.aliases.find((entry) => entry.name === 'after')?.body, '#showme {parent back on hash}');
  assert.equal(result.finalCommandCharacter, '#');
});

test('nested READ does not auto-detect a different child prefix than the active global TinTin character', async () => {
  const result = await loader.prepareTinTinReadTree([
    '#CONFIG {TINTIN CHAR} {~}',
    '~READ {child.tin}',
    '~ALIAS {after} {look}'
  ].join('\n'), emptyDefinitions(), {
    filename: 'main.tin',
    commandPrefix: '#',
    readFile: async () => ({
      ok: true,
      filename: 'child.tin',
      content: '#ALIAS {wrong-prefix} {score}\n~ALIAS {right-prefix} {look}'
    })
  });
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.equal(result.definitions.aliases.some((entry) => entry.name === 'wrong-prefix'), false);
  assert.equal(result.definitions.aliases.some((entry) => entry.name === 'right-prefix'), true);
  assert.equal(result.unsupported.some((entry) => entry.directive === 'server-command' && /wrong-prefix/u.test(entry.detail)), true);
});
