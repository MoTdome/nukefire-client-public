'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { GagEngine } = require('../src/gag-engine');
const { HighlightEngine } = require('../src/highlight-engine');
const { SubstituteEngine } = require('../src/substitute-engine');

function countMatcherExecs(engine, callback) {
  let calls = 0;
  const restorers = [];
  for (const record of engine.ordered) {
    const matcher = record.matcher;
    const original = matcher.exec;
    matcher.exec = function countedExec(...args) {
      calls += 1;
      return original.apply(this, args);
    };
    restorers.push(() => { matcher.exec = original; });
  }
  try {
    const value = callback();
    return { calls, value };
  } finally {
    for (const restore of restorers) restore();
  }
}

function definitions(count, kind) {
  return Array.from({ length: count }, (_, index) => {
    const id = String(index).padStart(4, '0');
    const pattern = `${kind}_${id} %1 reactor warning`;
    if (kind === 'GAG') return { pattern: `^${pattern}$`, enabled: true };
    if (kind === 'HIGHLIGHT') return { pattern, style: 'light red', priority: (index % 9) + 1, enabled: true };
    return { pattern, replacement: `safe-${id}-%1`, priority: (index % 9) + 1, enabled: true };
  });
}

test('adaptive Gag dispatch keeps veteran ordering while pruning impossible literal definitions', () => {
  const engine = new GagEngine({ maxGags: 1200, gags: definitions(1000, 'GAG') });
  const target = 'GAG_0999 target reactor warning';
  const { calls, value } = countMatcherExecs(engine, () => engine.match(target));
  assert.equal(value.matched, true);
  assert.equal(value.gag.pattern, '^GAG_0999 %1 reactor warning$');
  assert.ok(calls < 20, `expected adaptive Gag pruning, saw ${calls} regex exec calls`);
});

test('adaptive Highlight and Substitute dispatch choose discriminating required n-grams instead of a shared suffix', () => {
  const highlights = new HighlightEngine({ maxHighlights: 1200, highlights: definitions(1000, 'HIGHLIGHT') });
  const substitutes = new SubstituteEngine({ maxSubstitutes: 1200, substitutes: definitions(1000, 'SUBSTITUTE') });

  const highlightLine = 'noise HIGHLIGHT_0999 target reactor warning tail';
  const highlightResult = countMatcherExecs(highlights, () => highlights.findMatches(highlightLine));
  assert.ok(highlightResult.value.some((match) => match.pattern === 'HIGHLIGHT_0999 %1 reactor warning'));
  assert.ok(highlightResult.calls < 20, `expected adaptive Highlight pruning, saw ${highlightResult.calls} regex exec calls`);

  const substituteLine = 'noise SUBSTITUTE_0999 target reactor warning tail';
  const substituteResult = countMatcherExecs(substitutes, () => substitutes.findMatches(substituteLine));
  assert.ok(substituteResult.value.some((match) => match.pattern === 'SUBSTITUTE_0999 %1 reactor warning'));
  assert.ok(substituteResult.calls < 20, `expected adaptive Substitute pruning, saw ${substituteResult.calls} regex exec calls`);
});

test('generic and case-mode patterns remain on safe candidate paths', () => {
  const highlights = new HighlightEngine({ maxHighlights: 32, highlights: [
    { pattern: '%*', style: 'yellow', priority: 9 },
    { pattern: '%iWarning %1', style: 'light red', priority: 2 },
    { pattern: '%IExact %1', style: 'cyan', priority: 3 }
  ] });
  const substitutes = new SubstituteEngine({ maxSubstitutes: 32, substitutes: [
    { pattern: '%*', replacement: 'fallback', priority: 9 },
    { pattern: '%iWarning %1', replacement: 'warn-%1', priority: 2 },
    { pattern: '%IExact %1', replacement: 'exact-%1', priority: 3 }
  ] });
  const gags = new GagEngine({ maxGags: 32, gags: [
    { pattern: '%*' },
    { pattern: '%iWarning %1' },
    { pattern: '%IExact %1' }
  ] });

  assert.equal(gags.match('WARNING target').matched, true);
  assert.ok(highlights.findMatches('WARNING target').some((match) => match.pattern === '%iWarning %1'));
  assert.ok(highlights.findMatches('Exact target').some((match) => match.pattern === '%IExact %1'));
  assert.ok(substitutes.findMatches('WARNING target').some((match) => match.pattern === '%iWarning %1'));
  assert.ok(substitutes.findMatches('Exact target').some((match) => match.pattern === '%IExact %1'));
});
