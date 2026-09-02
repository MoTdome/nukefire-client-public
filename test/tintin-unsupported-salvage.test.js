'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loader = require('../src/tintin-script-loader');
const importer = require('../src/tintin-importer');
const writer = require('../src/tintin-script-writer');
const { parseHighlightStyle } = require('../src/highlight-engine');

function emptyDefinitions() {
  return {
    aliases: [], variables: [], functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    events: { enabled: true, definitions: [] },
    config: { logMode: 'plain', commandEcho: false },
    classes: { activeStack: [], definitions: [] },
    speedwalk: { enabled: true },
    profile: { requested: '', filename: '', loaded: false }
  };
}

test('veteran multi-line PATHDIR triples become one preserved path-direction command each', () => {
  const source = Array.from({ length: 10 }, (_value, index) => [
    `/PATHDIR {dir${index}}`,
    `{back${index}}`,
    `{${index + 1}}`
  ].join('\n')).join('\n');
  const prepared = loader.prepareTinTinRead(source, emptyDefinitions(), { commandPrefix: '#' });
  assert.equal(prepared.ok, true);
  assert.equal(prepared.unsupported.length, 0);
  assert.equal(prepared.errors.length, 0);
  assert.equal(prepared.runtimeCommands.filter((entry) => entry.directive === 'pathdir').length, 10);
  assert.equal(prepared.runtimeCommands.filter((entry) => entry.directive === 'pathdir').every((entry) => entry.persistOnImport === true), true);
});

test('paste import preserves safe READ references as selectable destination includes', () => {
  const prepared = loader.prepareTinTinRead([
    '/read {modsupport.tin}',
    '/read gmcp.tin',
    '/read msdp.tin',
    '/read queues.tin',
    '/alias {go} {look}'
  ].join('\n'), emptyDefinitions(), { commandPrefix: '#' });
  assert.equal(prepared.ok, true);
  assert.equal(prepared.unsupported.length, 0);
  assert.deepEqual(prepared.scriptIncludes.map((entry) => entry.requested), [
    'modsupport.tin', 'gmcp.tin', 'msdp.tin', 'queues.tin'
  ]);

  const analysis = importer.buildTinTinScriptImportAnalysis(prepared);
  const includes = analysis.items.filter((item) => item.category === 'includes');
  assert.equal(analysis.summary.includes, 4);
  assert.equal(includes.every((item) => item.selected === true && item.status === 'ready'), true);

  const merged = importer.mergeTinTinScriptImportSelection(analysis, emptyDefinitions(), {
    selectedIds: includes.map((item) => item.id),
    duplicatePolicy: 'keep'
  });
  assert.equal(merged.importedByCategory.includes, 4);
  const fragment = writer.prepareTinTinFragment(merged.definitions, merged.selectedItems, { commandPrefix: '#' });
  assert.equal(fragment.ok, true);
  assert.equal(fragment.includeCount, 4);
  for (const filename of ['modsupport.tin', 'gmcp.tin', 'msdp.tin', 'queues.tin']) {
    assert.match(fragment.content, new RegExp(`#read \\{${filename.replace('.', '\\.') }\\}`, 'u'));
  }
});

test('destination include de-duplication preserves an existing READ instead of appending it twice', () => {
  const prepared = loader.prepareTinTinRead('/read queues.tin\n/alias {go} {look}', emptyDefinitions());
  const analysis = importer.buildTinTinScriptImportAnalysis(prepared);
  const include = analysis.items.find((item) => item.category === 'includes');
  const merged = importer.mergeTinTinScriptImportSelection(analysis, emptyDefinitions(), {
    selectedIds: [include.id],
    existingIncludes: ['QUEUES.TIN'],
    duplicatePolicy: 'replace'
  });
  assert.equal(merged.importedByCategory.includes, 0);
  assert.equal(merged.skippedDuplicates, 1);
  assert.equal(merged.selectedItems.length, 0);
});

test('the bounded alias ceiling accepts veteran controller files above 512 but stops at 1024', () => {
  const source525 = Array.from({ length: 525 }, (_value, index) => `#alias {a${index}} {look}`).join('\n');
  const prepared525 = loader.prepareTinTinRead(source525, emptyDefinitions());
  assert.equal(prepared525.ok, true);
  assert.equal(prepared525.counts.aliases, 525);
  assert.equal(prepared525.errors.length, 0);
  assert.equal(importer.FULL_IMPORT_LIMITS.aliases, 1024);

  const source1025 = Array.from({ length: 1025 }, (_value, index) => `#alias {b${index}} {look}`).join('\n');
  const prepared1025 = loader.prepareTinTinRead(source1025, emptyDefinitions());
  assert.equal(prepared1025.ok, false);
  assert.match(prepared1025.errors.join('\n'), /limit of 1,024|limit of 1024/u);
});

test('black is a veteran highlight color synonym without changing ebony compatibility', () => {
  const black = parseHighlightStyle('black underscore b Orange');
  assert.equal(black.error, '');
  assert.equal(black.style.fg, '#000000');
  assert.equal(black.style.underline, true);
  assert.equal(black.style.bg, '#ff9955');

  const brightBlack = parseHighlightStyle('Black');
  assert.equal(brightBlack.error, '');
  assert.equal(brightBlack.style.fg, '#555555');
  const ebony = parseHighlightStyle('ebony');
  assert.equal(ebony.error, '');
  assert.equal(ebony.style.fg, '#000000');
});
