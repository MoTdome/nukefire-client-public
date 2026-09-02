'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { GagEngine, GagLineFilter } = require('../src/gag-engine');

test('defines, replaces, lists, enables, disables, and deletes global gags', () => {
  const engine = new GagEngine();
  assert.deepEqual(engine.list(), []);
  assert.deepEqual(engine.define('gossips'), {
    pattern: 'gossips', enabled: true, scope: 'global'
  });
  engine.define('auction');
  assert.deepEqual(engine.list().map((record) => record.pattern), ['auction', 'gossips']);
  assert.equal(engine.get('gossips').enabled, true);
  assert.equal(engine.setGagEnabled('gossips', false).enabled, false);
  assert.equal(engine.match("Rambo gossips, 'hello'").matched, false);
  engine.setGagEnabled('gossips', true);
  engine.setEnabled(false);
  assert.equal(engine.match("Rambo gossips, 'hello'").matched, false);
  engine.setEnabled(true);
  assert.equal(engine.delete('auction'), true);
  assert.equal(engine.get('auction'), null);
});

test('uses action-style substring wildcards and explicit anchors', () => {
  const engine = new GagEngine();
  engine.define('%1 gossips');
  engine.define('^The wind howls$');

  const gossip = engine.match("Rambo gossips, 'Hello'");
  assert.equal(gossip.matched, true);
  assert.equal(gossip.gag.pattern, '%1 gossips');
  assert.equal(gossip.captures['1'], 'Rambo');
  assert.equal(engine.match('Before The wind howls after').matched, false);
  assert.equal(engine.match('The wind howls').matched, true);
});

test('matches cleaned lines without changing stored patterns', () => {
  const engine = new GagEngine();
  engine.define('%1 gossips');
  const result = engine.match("\x1b[31m\tpaRambo\tn gossips, 'Hello'\x1b[0m");
  assert.equal(result.matched, true);
  assert.equal(result.line, "Rambo gossips, 'Hello'");
  assert.equal(result.captures['1'], 'Rambo');
});

test('filters only complete matching lines and preserves visible raw output', () => {
  const engine = new GagEngine();
  engine.define('gossips');
  const filter = new GagLineFilter();
  const shouldGag = (line) => engine.match(line).matched;

  assert.deepEqual(filter.push("\x1b[32mRambo gos", shouldGag), { text: '', gaggedText: '', gagged: 0 });
  assert.deepEqual(
    filter.push("sips, 'Hello'\x1b[0m\r\n\x1b[33mVisible\x1b[0m\r\nPrompt> ", shouldGag),
    { text: '\x1b[33mVisible\x1b[0m\r\n', gaggedText: "\x1b[32mRambo gossips, 'Hello'\x1b[0m\r\n", gagged: 1 }
  );
  assert.deepEqual(filter.flush(shouldGag), { text: 'Prompt> ', gaggedText: '', gagged: 0 });
});

test('line filtering fails open for oversized unterminated server output', () => {
  const engine = new GagEngine();
  engine.define('hidden');
  const filter = new GagLineFilter({ maxLineLength: 256 });
  const shouldGag = (line) => engine.match(line).matched;
  const oversized = 'x'.repeat(257);

  assert.deepEqual(filter.push(oversized, shouldGag), { text: oversized, gaggedText: '', gagged: 0 });
  assert.deepEqual(filter.push('still visible\n', shouldGag), { text: 'still visible\n', gaggedText: '', gagged: 0 });
  assert.deepEqual(filter.flush(shouldGag), { text: '', gaggedText: '', gagged: 0 });
});
