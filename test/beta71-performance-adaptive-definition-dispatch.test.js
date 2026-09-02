'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AliasEngine } = require('../src/alias-engine');
const { ActionEngine } = require('../src/action-engine');

function referenceAlias(engine, commandValue) {
  const command = String(commandValue ?? '').trim();
  const first = command.split(/\s+/u, 1)[0]?.toLowerCase() || '';
  for (const record of engine.orderedAliases) {
    if (!record.matcher) {
      if (record.name === first) return record.name;
      continue;
    }
    if (record.matcher.exec(command)) return record.name;
  }
  return '';
}

function referenceAction(engine, lineValue) {
  const line = String(lineValue ?? '');
  for (const record of engine.ordered) {
    if (!record.enabled) continue;
    if (record.matcher.exec(line)) return record.pattern;
  }
  return '';
}

test('adaptive Alias candidate buckets preserve global TinTin priority while pruning large no-match sets', () => {
  const aliases = [];
  for (let index = 0; index < 1000; index += 1) {
    const priority = (index % 9) + 1;
    if (index < 700) aliases.push({ name: `cmd${String(index).padStart(4, '0')}`, body: `say ${index}`, priority });
    else if (index < 900) aliases.push({ name: `raid${String(index).padStart(4, '0')} %1`, body: 'say %1', priority });
    else aliases.push({ name: `%1 generic${index}`, body: 'say %1', priority });
  }
  aliases.push({ name: 'raid0700', body: 'say literal', priority: 9 });
  aliases.push({ name: 'raid0700 %1', body: 'say pattern %1', priority: 1 });

  const engine = new AliasEngine({ aliases, maxAliases: 1200 });
  const noMatchCandidates = engine.candidateAliases('zzzz definitely-not-an-alias', 'zzzz');
  assert.ok(noMatchCandidates.length <= 110, `expected generic fallback only, got ${noMatchCandidates.length}`);

  for (const command of ['raid0700 dragon', 'cmd0004 tail', 'zzzz definitely-not-an-alias', 'anything generic999']) {
    const expected = referenceAlias(engine, command);
    const candidates = engine.candidateAliases(command, command.split(/\s+/u, 1)[0]?.toLowerCase() || '');
    const actual = candidates.find((record) => !record.matcher
      ? record.name === command.split(/\s+/u, 1)[0]?.toLowerCase()
      : record.matcher.exec(command))?.name || '';
    assert.equal(actual, expected, command);
  }
  assert.deepEqual(engine.expandCommands('raid0700 dragon').commands, ['say pattern dragon']);
});

test('adaptive Action dispatch prunes anchored candidates and required-literal prefilters reject impossible lines', () => {
  const actions = [];
  for (let index = 0; index < 1000; index += 1) {
    const priority = (index % 9) + 1;
    if (index < 700) actions.push({ pattern: `^Event${String(index).padStart(4, '0')} value %1$`, command: 'say %1', priority });
    else if (index < 900) actions.push({ pattern: `warning-${String(index).padStart(4, '0')} %1`, command: 'say %1', priority });
    else actions.push({ pattern: `%1 generic-action-${index}`, command: 'say %1', priority });
  }

  const engine = new ActionEngine({ actions, maxActions: 1200 });
  const candidates = engine.candidateActions('completely unrelated line');
  assert.ok(candidates.length <= 310, `expected unanchored fallback plus minimal buckets, got ${candidates.length}`);
  const filtered = candidates.filter((record) => engine.actionPrefilterMatches(record, 'completely unrelated line', 'completely unrelated line'));
  assert.ok(filtered.length < candidates.length / 2, `expected literal prefilter to remove most fallback actions, got ${filtered.length}/${candidates.length}`);

  for (const line of ['Event0004 value dragon', 'prefix warning-0701 dragon suffix', 'completely unrelated line', 'hello generic-action-999']) {
    const expected = referenceAction(engine, line);
    const result = engine.match(line);
    assert.equal(result.action?.pattern || '', expected, line);
  }
});

test('generic and case-switch definitions remain on safe fallback paths', () => {
  const aliases = new AliasEngine({ aliases: [
    { name: '%1 says %2', body: 'say caught %1 %2', priority: 1 },
    { name: '%iALERT %1', body: 'say alert %1', priority: 2 },
    { name: 'plain', body: 'look', priority: 9 }
  ] });
  assert.deepEqual(aliases.expandCommands('Bob says hello').commands, ['say caught Bob hello']);
  assert.deepEqual(aliases.expandCommands('ALERT now').commands, ['say alert now']);

  const actions = new ActionEngine({ actions: [
    { pattern: '%1 says %2', command: 'say caught %1 %2', priority: 1 },
    { pattern: '^%iALERT %1$', command: 'say alert %1', priority: 2 }
  ] });
  assert.equal(actions.match('Bob says hello').action?.pattern, '%1 says %2');
  assert.equal(actions.match('alert now').action?.pattern, '^%iALERT %1$');
});
