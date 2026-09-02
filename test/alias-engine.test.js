'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  AliasEngine,
  normalizeAliasName,
  normalizeAliasBody,
  splitAliasCommands,
  substituteAliasBody,
  ALIAS_BODY_MAX
} = require('../src/alias-engine');
const { tokenizeBraced } = require('../src/client-command-parser');

test('brace-aware parser preserves grouped and nested alias arguments', () => {
  assert.deepEqual(
    tokenizeBraced('report {old mutant} {north {west gate}} plain'),
    ['report', 'old mutant', 'north {west gate}', 'plain']
  );
  assert.deepEqual(
    tokenizeBraced('report "old mutant" escaped\\ value'),
    ['report', 'old mutant', 'escaped value']
  );
});

test('defines, replaces, lists, shows, and deletes global aliases', () => {
  const engine = new AliasEngine();
  assert.deepEqual(engine.define('GA', '#followers assist %1'), {
    name: 'ga', body: '#followers assist %1', priority: 5, scope: 'global'
  });
  assert.deepEqual(engine.get('ga'), {
    name: 'ga', body: '#followers assist %1', priority: 5, scope: 'global'
  });

  engine.define('zeta', 'say last');
  engine.define('alpha', 'say first');
  engine.define('ga', '#followers kill %1');
  assert.deepEqual(engine.list().map((record) => record.name), ['alpha', 'ga', 'zeta']);
  assert.equal(engine.get('GA').body, '#followers kill %1');
  assert.equal(engine.delete('ga'), true);
  assert.equal(engine.get('ga'), null);
  assert.equal(engine.delete('ga'), false);
});

test('rejects unsafe or malformed alias names and empty commands', () => {
  const engine = new AliasEngine();
  for (const name of ['', '#bad', '$bad', '__proto__', 'constructor', 'prototype']) {
    assert.equal(engine.define(name, 'look'), null);
  }
  assert.equal(engine.define('good_name-2', ''), null);
  assert.equal(engine.define('broken', 'say {unterminated'), null);
  assert.equal(engine.define('too_many', Array.from({ length: 129 }, (_value, index) => `cmd${index}`).join(';')), null);
  assert.equal(normalizeAliasName('GOOD_name-2'), 'good_name-2');
  assert.equal(normalizeAliasName('good$'), 'good$');
});

test('substitutes %0 and positional %1 through %99 with native TinTin word semantics', () => {
  const args = ['old mutant', 'Caul', 'north'];
  assert.equal(
    substituteAliasBody('say %1 / %2 / %3 / %4 / %0 / %9 / %12', args),
    'say old mutant / Caul / north /  / old mutant Caul north /  /'
  );

  const engine = new AliasEngine();
  engine.define('report', 'say target=%1 all=%0 ninth=%9');
  assert.deepEqual(engine.expand('report {old mutant} badly wounded'), {
    matched: true,
    command: 'say target=old mutant all=old mutant badly wounded ninth=',
    stack: ['report'],
    error: ''
  });
});


test('positional alias placeholders select one TinTin argument while %0 keeps all arguments', () => {
  assert.equal(
    substituteAliasBody('telepath wolves %1', ['hi', 'whats', 'up']),
    'telepath wolves hi'
  );
  assert.equal(
    substituteAliasBody('tell %1 %2', ['Rambo', 'hi', 'whats', 'up']),
    'tell Rambo hi'
  );
  assert.equal(
    substituteAliasBody('compare %1 with %1 and say %2 / %0', ['blade', 'looks', 'good']),
    'compare blade with blade and say looks / blade looks good'
  );
});


test('TinTin pattern aliases capture multi-word arguments and catch-all input', () => {
  const engine = new AliasEngine();
  assert.ok(engine.define('insc %1', 'rem %1;buy inscribe %1 Thog;wear %1'));
  assert.deepEqual(engine.expandCommands('insc battered shoulder plate'), {
    matched: true,
    commands: [
      'rem battered shoulder plate',
      'buy inscribe battered shoulder plate Thog',
      'wear battered shoulder plate'
    ],
    stack: ['insc %1'],
    error: ''
  });

  assert.ok(engine.define('k %1 with %2', 'draw %2;attack %1'));
  assert.deepEqual(engine.expandCommands('k blue smurf with battle axe').commands, [
    'draw battle axe',
    'attack blue smurf'
  ]);

  assert.ok(engine.define('%*', '#show {saw=%0}'));
  assert.equal(engine.expand('unmatched free form input').command, '#show {saw=unmatched free form input}');
});

test('leaves unknown commands unchanged and expands one final command', () => {
  const engine = new AliasEngine();
  assert.deepEqual(splitAliasCommands("smile;look;say Reactor stable\\; for now"), {
    commands: ['smile', 'look', 'say Reactor stable; for now'], error: ''
  });
  assert.deepEqual(engine.expand('look north'), {
    matched: false, command: 'look north', stack: [], error: ''
  });

  engine.define('ga', '#followers assist %1');
  assert.deepEqual(engine.expand('GA mutant'), {
    matched: true,
    command: '#followers assist mutant',
    stack: ['ga'],
    error: ''
  });

  engine.define('kk', 'smile;look;score');
  assert.deepEqual(engine.expandCommands('kk'), {
    matched: true,
    commands: ['smile', 'look', 'score'],
    stack: ['kk'],
    error: ''
  });
  assert.equal(engine.expand('kk').command, 'smile; look; score');

  engine.define('safe', 'say %0;look');
  assert.deepEqual(engine.expandCommands('safe {steady;quit}'), {
    matched: true,
    commands: ['say steady;quit', 'look'],
    stack: ['safe'],
    error: ''
  });
});

test('resolves alias chains and blocks direct and indirect recursion', () => {
  const engine = new AliasEngine();
  engine.define('assist', 'ga %1');
  engine.define('ga', '#followers assist %1');
  engine.define('battlecheck', 'assist %1;score');
  assert.deepEqual(engine.expand('assist mutant'), {
    matched: true,
    command: '#followers assist mutant',
    stack: ['assist', 'ga'],
    error: ''
  });

  assert.deepEqual(engine.expandCommands('battlecheck mutant'), {
    matched: true,
    commands: ['#followers assist mutant', 'score'],
    stack: ['battlecheck', 'assist', 'ga'],
    error: ''
  });

  engine.define('self', 'self');
  assert.match(engine.expand('self').error, /recursive loop self -> self/u);

  engine.define('a', 'b');
  engine.define('b', 'c');
  engine.define('c', 'a');
  assert.match(engine.expand('a').error, /recursive loop a -> b -> c -> a/u);
});

test('enforces a bounded expansion depth', () => {
  const engine = new AliasEngine({ maxExpansionDepth: 3 });
  engine.define('a', 'b');
  engine.define('b', 'c');
  engine.define('c', 'd');
  engine.define('d', 'look');
  const result = engine.expand('a');
  assert.equal(result.command, '');
  assert.match(result.error, /maximum depth of 3 exceeded/u);
});


test('restores a bounded sanitized alias snapshot without executing it', () => {
  const engine = new AliasEngine({ maxAliases: 2 });
  const restored = engine.replaceAll([
    { name: 'ZETA', body: 'say last\nscore', scope: 'session' },
    { name: '__proto__', body: 'shutdown' },
    { name: 'alpha', body: 'say first' },
    { name: 'third', body: 'say ignored' },
    { name: 'alpha', body: 'say replaced' }
  ]);

  assert.deepEqual(restored, [
    { name: 'alpha', body: 'say replaced', priority: 5, scope: 'global' },
    { name: 'zeta', body: 'say last score', priority: 5, scope: 'global' }
  ]);
  assert.deepEqual(engine.expand('alpha'), {
    matched: true,
    command: 'say replaced',
    stack: ['alpha'],
    error: ''
  });
  assert.equal(normalizeAliasBody(`look${'x'.repeat(ALIAS_BODY_MAX + 50)}`).length, ALIAS_BODY_MAX);
});
