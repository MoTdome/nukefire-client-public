'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loader = require('../src/tintin-script-loader');
const importer = require('../src/tintin-importer');

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

test('paste import analysis reuses the full READ parser and exposes every persistent family', () => {
  const prepared = loader.prepareTinTinRead(`
#class {combat} {open}
#alias {k} {kill %1;kick}
#variable {tank} {Caul}
#function {twice} {#math {result} {%1 * 2}}
#action {%1 attacks you} {bash %1} {2}
#gag {The wind howls.}
#highlight {WARNING} {light red} {1}
#substitute {credits} {shinies} {3}
#macro {F4} {north;look}
#event {SESSION CONNECTED} {look}
#class {combat} {close}
#config {speedwalk} {off}
#actions {off}
#showme {load-time note}
#system {rm -rf /}
`, emptyDefinitions(), { commandPrefix: '#' });

  const analysis = importer.buildTinTinScriptImportAnalysis(prepared);
  assert.equal(analysis.summary.aliases, 1);
  assert.equal(analysis.summary.variables, 1);
  assert.equal(analysis.summary.functions, 1);
  assert.equal(analysis.summary.actions, 1);
  assert.equal(analysis.summary.gags, 1);
  assert.equal(analysis.summary.highlights, 1);
  assert.equal(analysis.summary.substitutes, 1);
  assert.equal(analysis.summary.macros, 1);
  assert.equal(analysis.summary.events, 1);
  assert.ok(analysis.summary.settings >= 2);
  assert.equal(analysis.summary.skipped, 0);
  assert.equal(analysis.summary.unsupported, 1);
  assert.equal(analysis.items.filter((item) => item.type === 'load command').length, 1);
  assert.equal(analysis.items.find((item) => item.category === 'aliases').record.className, 'combat');
  assert.equal(analysis.items.find((item) => item.category === 'actions').status, 'translated');
  assert.equal(analysis.items.find((item) => item.category === 'events').status, 'translated');
  assert.match(analysis.items.find((item) => item.type === 'load command').warnings.join(' '), /never executed merely because text was pasted/u);
});

test('full paste merge keeps unrelated state, honors duplicate policy, and disables autonomous automation', () => {
  const prepared = loader.prepareTinTinRead(`
#alias {k} {kill %1;kick}
#variable {tank} {Caul}
#function {twice} {#math {result} {%1 * 2}}
#action {%1 attacks you} {bash %1} {2}
#gag {The wind howls.}
#highlight {WARNING} {light red} {1}
#substitute {credits} {shinies} {3}
#macro {F4} {north;look}
#event {SESSION CONNECTED} {look}
#config {speedwalk} {off}
`, emptyDefinitions());
  const analysis = importer.buildTinTinScriptImportAnalysis(prepared);
  const existing = emptyDefinitions();
  existing.aliases.push({ name: 'k', body: 'kill %1', scope: 'global' });
  existing.aliases.push({ name: 'old', body: 'score', scope: 'global' });
  existing.variables.push({ name: 'keepme', value: 'yes', scope: 'global' });

  const kept = importer.mergeTinTinScriptImportSelection(analysis, existing, {
    duplicatePolicy: 'keep', selectedIds: analysis.items.filter((item) => item.selected).map((item) => item.id)
  });
  assert.equal(kept.definitions.aliases.find((record) => record.name === 'k').body, 'kill %1');
  assert.ok(kept.definitions.aliases.some((record) => record.name === 'old'));
  assert.ok(kept.definitions.variables.some((record) => record.name === 'keepme'));
  assert.equal(kept.definitions.speedwalk.enabled, false);
  assert.equal(kept.definitions.actions.definitions[0].enabled, false);
  assert.equal(kept.definitions.events.definitions[0].enabled, false);

  const replaced = importer.mergeTinTinScriptImportSelection(analysis, existing, {
    duplicatePolicy: 'replace', selectedIds: analysis.items.filter((item) => item.selected).map((item) => item.id)
  });
  assert.equal(replaced.definitions.aliases.find((record) => record.name === 'k').body, 'kill %1; kick');
  assert.ok(replaced.replacedByCategory.aliases >= 1);
  assert.ok(replaced.importedByCategory.functions >= 1);
});

test('a bad TinTin line does not hide safely parsed definitions from paste review', () => {
  const prepared = loader.prepareTinTinRead(`
#alias {good} {look}
#event {SESSION CONNECTED} {look} {extra}
#variable {also_good} {42}
`, emptyDefinitions());
  assert.equal(prepared.ok, false);
  const analysis = importer.buildTinTinScriptImportAnalysis(prepared);
  assert.equal(analysis.summary.aliases, 1);
  assert.equal(analysis.summary.variables, 1);
  assert.ok(analysis.summary.unsupported >= 1);
  assert.ok(analysis.items.some((item) => item.category === 'aliases' && item.selected));
  assert.ok(analysis.items.some((item) => item.category === 'variables' && item.selected));
});
