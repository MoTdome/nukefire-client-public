'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  VariableEngine,
  normalizeVariableName,
  normalizeSimpleVariableName,
  normalizeVariableValue,
  VARIABLE_VALUE_MAX
} = require('../src/variable-engine');

test('defines, replaces, lists, shows, and deletes global variables', () => {
  const engine = new VariableEngine();
  assert.deepEqual(engine.define('TARGET', 'old mutant'), {
    name: 'target', value: 'old mutant', scope: 'global'
  });
  assert.deepEqual(engine.get('target'), {
    name: 'target', value: 'old mutant', scope: 'global'
  });

  engine.define('zeta', 'last');
  engine.define('alpha', 'first');
  engine.define('target', 'nightmare');
  assert.deepEqual(engine.list().map((record) => record.name), ['alpha', 'target', 'zeta']);
  assert.equal(engine.get('TARGET').value, 'nightmare');
  assert.equal(engine.delete('target'), true);
  assert.equal(engine.get('target'), null);
  assert.equal(engine.delete('target'), false);
});

test('accepts safe names and table paths, rejects unsafe structural names, and bounds sanitized values', () => {
  const engine = new VariableEngine();
  for (const name of ['', 'bad{name', 'bad[name', 'bad[]', 'bad[name;drop]', 'bad\\name', 'bad;name', 'bad$name', 'bad%name', '__proto__', 'constructor', 'prototype']) {
    assert.equal(engine.define(name, 'value'), null);
  }
  assert.equal(normalizeVariableName('GOOD_name-2'), 'good_name-2');
  assert.equal(normalizeVariableName('session[name]'), 'session[name]');
  assert.equal(normalizeVariableName('_dig[-2]'), '_dig[-2]');
  assert.equal(normalizeVariableName('Cool Website'), 'cool website');
  assert.equal(normalizeVariableName(':)'), ':)');
  assert.equal(normalizeSimpleVariableName('GOOD_name-2'), 'good_name-2');
  assert.equal(normalizeSimpleVariableName('Cool Website'), '');
  assert.equal(normalizeVariableValue('line one\nline two\u0000'), 'line one line two');
  assert.equal(normalizeVariableValue('x'.repeat(VARIABLE_VALUE_MAX + 50)).length, VARIABLE_VALUE_MAX);
});

test('expands named and braced references while leaving unknown names intact', () => {
  const engine = new VariableEngine();
  engine.define('target', 'old mutant');
  engine.define('spell', 'radiant smite');

  assert.deepEqual(engine.expand('kill %target with %{spell}; keep %unknown'), {
    value: 'kill old mutant with radiant smite; keep %unknown',
    expanded: true,
    names: ['target', 'spell'],
    error: ''
  });
});



test('expands native TinTin dollar references and braced nonstandard names', () => {
  const engine = new VariableEngine();
  engine.define('target', 'old mutant');
  engine.define('cool website', 'https://nukefire.org');
  engine.define(':)', 'Happy Happy!');

  assert.deepEqual(engine.expand('kill $target; open ${cool website}; say ${:)}'), {
    value: 'kill old mutant; open https://nukefire.org; say Happy Happy!',
    expanded: true,
    names: ['target', 'cool website', ':)'],
    error: ''
  });
  assert.equal(engine.expand('keep $unknown and ${unknown name}').value, 'keep $unknown and ${unknown name}');
  assert.equal(engine.expand('keep $target[self] and ${target[self]}').value, 'keep  and '); // TinTin suppresses a missing nest when its base variable exists.
  assert.equal(engine.expand('keep $missing[self]').value, 'keep $missing[self]');
});

test('supports TinTin dollar escaping without changing ordinary money text', () => {
  const engine = new VariableEngine();
  engine.define('target', 'mutant');
  assert.equal(engine.expand('say $$target').value, 'say $target');
  assert.equal(engine.expand('say \\$target').value, 'say $target');
  assert.equal(engine.expand('pay $100 and keep $$').value, 'pay $100 and keep $');
});

test('uses modern TinTin star keys and dollar values for empty table selectors', () => {
  const engine = new VariableEngine();
  engine.define('targets[alpha]', 'A');
  engine.define('targets[amber]', 'B');
  engine.define('targets[beta]', 'C');
  engine.define('room', 'atrium');
  engine.define('signsinroom[atrium][north]', 'North stairs');
  engine.define('signsinroom[atrium][south]', 'South stairs');

  assert.equal(engine.expand('$targets[]').value, '{A}{B}{C}');
  assert.equal(engine.expand('*targets[]').value, '{alpha}{amber}{beta}');
  assert.equal(engine.expand('*targets[%*]').value, '{alpha}{amber}{beta}');
  assert.equal(engine.expand('*targets[a%*]').value, '{alpha}{amber}');
  assert.equal(engine.expand('*targets[+1]').value, 'alpha');
  assert.equal(engine.expand('*targets[-1]').value, 'beta');
  assert.equal(engine.expand('*targets[amber]').value, 'amber');
  assert.equal(engine.expand('*targets').value, 'targets');
  assert.equal(engine.expand('*signsinroom[$room][]').value, '{north}{south}');
  assert.equal(engine.expand('*missing[]').value, '*missing[]');
  assert.equal(engine.expand('say **targets and \\*targets').value, 'say *targets and *targets');
});

test('resolves mixed percent and dollar nesting with shared recursion guards', () => {
  const engine = new VariableEngine();
  engine.define('target', '$species guard');
  engine.define('species', '%kind');
  engine.define('kind', 'mutant');
  assert.equal(engine.expand('kill $target').value, 'kill mutant guard');

  engine.define('a', '$b');
  engine.define('b', '%a');
  assert.match(engine.expand('$a').error, /recursive loop a -> b -> a/u);
});

test('supports literal percent signs without expanding the escaped name', () => {
  const engine = new VariableEngine();
  engine.define('target', 'mutant');
  assert.equal(engine.expand('say %%target').value, 'say %target');
  assert.equal(engine.expand('say \\%target').value, 'say %target');
  assert.equal(engine.expand('HP 50%%').value, 'HP 50%');
});

test('resolves nested variables and blocks recursive loops', () => {
  const engine = new VariableEngine();
  engine.define('target', '%species guard');
  engine.define('species', 'mutant');
  assert.equal(engine.expand('kill %target').value, 'kill mutant guard');

  engine.define('a', '%b');
  engine.define('b', '%c');
  engine.define('c', '%a');
  const result = engine.expand('say %a');
  assert.equal(result.value, '');
  assert.match(result.error, /recursive loop a -> b -> c -> a/u);
});

test('enforces bounded recursion and expanded output length', () => {
  const depth = new VariableEngine({ maxExpansionDepth: 2 });
  depth.define('a', '%b');
  depth.define('b', '%c');
  depth.define('c', 'done');
  assert.match(depth.expand('%a').error, /maximum depth of 2 exceeded/u);

  const length = new VariableEngine({ maxExpandedLength: 4096 });
  length.define('large', 'x'.repeat(4096));
  assert.match(length.expand('%large%large').error, /output exceeded 4096 characters/u);
});

test('restores a bounded sanitized variable snapshot without expanding it', () => {
  const engine = new VariableEngine({ maxVariables: 2 });
  const restored = engine.replaceAll([
    { name: 'ZETA', value: '%alpha last\nline', scope: 'session' },
    { name: '__proto__', value: 'shutdown' },
    { name: 'alpha', value: 'first' },
    { name: 'third', value: 'ignored' },
    { name: 'alpha', value: 'replaced' }
  ]);

  assert.deepEqual(restored, [
    { name: 'alpha', value: 'replaced', scope: 'global' },
    { name: 'zeta', value: '%alpha last line', scope: 'global' }
  ]);
  assert.equal(engine.expand('%zeta').value, 'replaced last line');
});

test('local variable maps shadow globals without mutating persistent variables', () => {
  const engine = new VariableEngine();
  engine.define('target', 'global');
  engine.define('nested', '$target guard');
  const locals = new Map([['target', 'local']]);
  assert.equal(engine.expand('$target / $nested', { locals }).value, 'local / local guard');
  assert.equal(engine.get('target').value, 'global');
});
