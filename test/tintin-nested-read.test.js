'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const {
  prepareTinTinReadTree,
  parseReadDirective,
  formatTinTinReadReport
} = require('../src/tintin-script-loader');

function empty() {
  return {
    aliases: [],
    variables: [],
    functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    classes: { activeStack: [], definitions: [] },
    speedwalk: { enabled: true },
    profile: { requested: '', filename: '', loaded: false }
  };
}

function reader(files) {
  return async (requested) => {
    const key = String(requested || '').toLowerCase();
    const entry = files[key];
    return entry
      ? { ok: true, filename: entry.filename || requested, content: entry.content }
      : { ok: false, error: `No script named ${requested}` };
  };
}

test('recognizes exactly one nested #READ target', () => {
  assert.deepEqual(parseReadDirective('#READ dirs.txt', '#'), {
    matched: true,
    requested: 'dirs.txt',
    error: ''
  });
  assert.equal(parseReadDirective('#READ', '#').matched, true);
  assert.match(parseReadDirective('#READ', '#').error, /exactly one/u);
  assert.equal(parseReadDirective('#ALIAS {r} {rest}', '#').matched, false);
});

test('nested #READ is evaluated in file order so later parent definitions still win', async () => {
  const result = await prepareTinTinReadTree(
    '#VAR {target} {before}\n#READ child.tin\n#VAR {target} {after}',
    empty(),
    {
      filename: 'main.tin',
      readFile: reader({
        'child.tin': { content: '#VAR {target} {child}\n#ALIAS {c} {consider %1}' }
      })
    }
  );
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.equal(result.definitions.variables.find((item) => item.name === 'target').value, 'after');
  assert.equal(result.definitions.aliases.find((item) => item.name === 'c').body, 'consider %1');
  assert.equal(result.includes.length, 1);
  assert.equal(result.filesRead, 2);
});

test('nested files may recursively read safe .txt and .tin siblings', async () => {
  const result = await prepareTinTinReadTree('#READ dirs.txt', empty(), {
    filename: 'main.tin',
    readFile: reader({
      'dirs.txt': { content: '#ALIAS {nn} {north;north}\n#READ helper.tin' },
      'helper.tin': { content: '#VAR {route} {nn}' }
    })
  });
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.equal(result.definitions.aliases[0].name, 'nn');
  assert.equal(result.definitions.variables[0].value, 'nn');
  assert.deepEqual(result.includes.map((item) => item.filename), ['dirs.txt', 'helper.tin']);
  assert.equal(result.filesRead, 3);
});

test('class state carries across a nested read boundary', async () => {
  const result = await prepareTinTinReadTree(
    '#CLASS {combat} {open}\n#READ combat.tin\n#CLASS {combat} {close}',
    empty(),
    {
      filename: 'main.tin',
      readFile: reader({
        'combat.tin': { content: '#ALIAS {fb} {fireball %1}\n#ACTION {^%1 attacks} {bash %1}' }
      })
    }
  );
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.equal(result.definitions.aliases[0].className, 'combat');
  assert.equal(result.definitions.actions.definitions[0].className, 'combat');
});

test('a missing nested file rejects the whole tree without changing the original snapshot', async () => {
  const original = empty();
  original.variables.push({ name: 'safe', value: 'old', scope: 'global' });
  const before = JSON.stringify(original);
  const result = await prepareTinTinReadTree(
    '#VAR {safe} {new}\n#READ missing.tin\n#ALIAS {never} {score}',
    original,
    { filename: 'main.tin', readFile: reader({}) }
  );
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /missing\.tin/u);
  assert.equal(JSON.stringify(original), before);
  assert.equal(result.definitions.variables.find((item) => item.name === 'safe').value, 'old');
});

test('nested #READ cycles are rejected atomically with the include chain', async () => {
  const result = await prepareTinTinReadTree('#READ a.tin', empty(), {
    filename: 'main.tin',
    readFile: reader({
      'a.tin': { content: '#READ b.tin' },
      'b.tin': { content: '#READ a.tin' }
    })
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /cycle detected/u);
  assert.match(result.errors.join('\n'), /a\.tin.*b\.tin.*a\.tin/u);
});

test('nested #READ enforces a bounded recursion depth', async () => {
  const result = await prepareTinTinReadTree('#READ a.tin', empty(), {
    filename: 'main.tin',
    maxDepth: 2,
    readFile: reader({
      'a.tin': { content: '#READ b.tin' },
      'b.tin': { content: '#READ c.tin' },
      'c.tin': { content: '#ALIAS {too-deep} {look}' }
    })
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /maximum depth of 2/u);
});

test('nested reads are counted as successful reads rather than unsupported directives', async () => {
  const result = await prepareTinTinReadTree('#READ child.tin\n#CONFIG {VERBOSE} {OFF}', empty(), {
    filename: 'main.tin',
    readFile: reader({
      'child.tin': { content: '#ALIAS {l} {look}' }
    })
  });
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.equal(result.includes.length, 1);
  assert.equal(result.unsupportedCounts.read || 0, 0);
  assert.equal(result.unsupportedCounts.config || 0, 0);
  assert.equal(result.compatibilityNoops.some((entry) => entry.directive === 'config'), true);
  const report = formatTinTinReadReport(result, 'main.tin');
  assert.ok(report.some((line) => /1 NESTED SCRIPT READ IN FILE ORDER/u.test(line)));
});


test('startup and manual #read both route through the nested tree helper', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(renderer, /async function prepareTinTinScriptLoad/u);
  assert.match(renderer, /prepareTinTinReadTree/u);
  assert.match(renderer, /readFile:\s*async \(requested\) => window\.nukefire\.readTinTinScript\(requested\)/u);
  assert.ok((renderer.match(/await prepareTinTinScriptLoad\(/gu) || []).length >= 2);
});
