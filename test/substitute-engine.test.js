'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SubstituteEngine,
  applySubstitutionsToRuns,
  compileReplacementTemplate
} = require('../src/substitute-engine');

test('substitute definitions normalize, sort, toggle, persist, and preserve classes', () => {
  const engine = new SubstituteEngine();
  assert.deepEqual(engine.define(' danger ', ' WARNING ', 8, ' Combat '), {
    pattern: 'danger', replacement: ' WARNING ', priority: 8, enabled: true,
    scope: 'global', className: 'combat'
  });
  engine.define('^HP:', 'Health:', 2);
  assert.deepEqual(engine.list().map((record) => record.pattern), ['^HP:', 'danger']);
  assert.equal(engine.setSubstituteEnabled('danger', false).enabled, false);

  const restored = new SubstituteEngine();
  restored.restore(engine.snapshot());
  assert.deepEqual(restored.snapshot(), engine.snapshot());
  assert.equal(restored.delete('danger'), true);
  assert.equal(restored.get('danger'), null);
});

test('replacement templates support captures, full matches, and literal percent signs', () => {
  assert.deepEqual(compileReplacementTemplate('PAYDAY: %1 %% %0'), [
    { type: 'literal', value: 'PAYDAY: ' },
    { type: 'capture', index: 1 },
    { type: 'literal', value: ' % ' },
    { type: 'capture', index: 0 }
  ]);
});

test('substitutions replace every non-overlapping match and reuse captures', () => {
  const engine = new SubstituteEngine();
  engine.define('Zoe', 'ZOE', 5);
  engine.define('You receive %1 credits.', 'PAYDAY: %1 credits', 2);

  let output = applySubstitutionsToRuns([{ text: 'Zoe sees Zoe.\n', style: null }], engine);
  assert.equal(output.map((run) => run.text).join(''), 'ZOE sees ZOE.\n');

  output = applySubstitutionsToRuns([{ text: 'You receive 1,250 credits.\n', style: null }], engine);
  assert.equal(output.map((run) => run.text).join(''), 'PAYDAY: 1,250 credits\n');

  engine.define('A mutant%*', 'A threat remains.', 1);
  output = applySubstitutionsToRuns([{ text: 'A mutant arrives from the north.\n', style: null }], engine);
  assert.equal(output.map((run) => run.text).join(''), 'A threat remains.\n');
});

test('capture text preserves source ANSI style and safe link metadata', () => {
  const engine = new SubstituteEngine();
  engine.define('You receive %1 credits.', 'PAYDAY: %1 credits', 5);
  const runs = [
    { text: 'You receive ', style: { fg: '#ff5555' }, link: null },
    { text: '500', style: { fg: '#55ff55', bold: true }, link: 'https://example.invalid' },
    { text: ' credits.\n', style: { fg: '#ff5555' }, link: null }
  ];
  const output = applySubstitutionsToRuns(runs, engine);
  assert.equal(output.map((run) => run.text).join(''), 'PAYDAY: 500 credits\n');
  const captured = output.find((run) => run.text === '500');
  assert.equal(captured.style.fg, '#55ff55');
  assert.equal(captured.style.bold, true);
  assert.equal(captured.link, 'https://example.invalid');
  assert.equal(output[0].style.fg, '#ff5555');
});

test('lower numeric priority wins overlaps and replacement text is not recursively substituted', () => {
  const engine = new SubstituteEngine();
  engine.define('old mutant', 'elder', 2);
  engine.define('mutant', 'beast', 8);
  engine.define('elder', 'ancient', 1);
  const output = applySubstitutionsToRuns([{ text: 'old mutant\n', style: null }], engine);
  assert.equal(output.map((run) => run.text).join(''), 'elder\n');
});

test('substitution output is bounded against pathological expansion', () => {
  const engine = new SubstituteEngine({ maxOutputCharacters: 1024 });
  engine.define('x', 'y'.repeat(4096), 5);
  const output = applySubstitutionsToRuns([{ text: 'xxxx\n', style: null }], engine);
  assert.equal(output.map((run) => run.text).join('').length, 1024);
});
