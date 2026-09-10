'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ActionEngine,
  ActionLineBuffer,
  ActionRateLimiter,
  compileActionPattern,
  substituteActionCommand,
  splitActionCommands
} = require('../src/action-engine');

test('defines, replaces, prioritizes, enables, and deletes global actions', () => {
  const engine = new ActionEngine();
  assert.deepEqual(engine.list(), []);
  assert.deepEqual(engine.define('You are hungry.', 'eat bread'), {
    pattern: 'You are hungry.', command: 'eat bread', priority: 5, enabled: true, scope: 'global'
  });
  engine.define('The %1 attacks Shai!', '#Caul rescue Shai', 1);
  engine.define('You are hungry.', 'eat ration', 7);

  assert.deepEqual(engine.list().map((record) => [record.priority, record.pattern]), [
    [1, 'The %1 attacks Shai!'],
    [7, 'You are hungry.']
  ]);
  assert.equal(engine.setActionEnabled('You are hungry.', false).enabled, false);
  assert.equal(engine.delete('You are hungry.'), true);
  assert.equal(engine.get('You are hungry.'), null);
});

test('matches complete cleaned lines and substitutes %0 through %9', () => {
  const engine = new ActionEngine();
  engine.define("%1 tells you '%2'", 'tell %1 Heard: %2 | %0 | %9');
  const result = engine.match("\x1b[35mBob tells you 'hello there'\x1b[0m");
  assert.equal(result.matched, true);
  assert.equal(result.captures['1'], 'Bob');
  assert.equal(result.captures['2'], 'hello there');
  assert.equal(result.command, "tell Bob Heard: hello there | Bob tells you 'hello there' |");
});

test('removes legacy NukeFire color tokens before matching', () => {
  const engine = new ActionEngine();
  engine.define('Khelt Deepforger gossips, %1', 'say heard %1');
  const result = engine.match("\t+\tpaKhelt Deepforger\tn gossips, 'doom approaches'");
  assert.equal(result.matched, true);
  assert.equal(result.command, "say heard 'doom approaches'");
});

test('honors lower numeric priority first for overlapping matches', () => {
  const engine = new ActionEngine();
  engine.define('Warning: %1', 'say broad %1', 9);
  engine.define('Warning: fire', 'say exact', 1);
  assert.equal(engine.match('Warning: fire').command, 'say exact');
});

test('uses TinTin-style substring matching unless explicit anchors are present', () => {
  const engine = new ActionEngine();
  engine.define('gossips', 'smile');
  assert.equal(engine.match("Rambo gossips, 'Hello'").command, 'smile');

  engine.define('^Warning: fire$', 'say anchored', 1);
  assert.equal(engine.match('Warning: fire').command, 'say anchored');
  assert.equal(engine.match('prefix Warning: fire').matched, false);
  assert.equal(engine.match('Warning: fire suffix').matched, false);
});

test('supports literal percent signs and repeated capture references', () => {
  const matcher = compileActionPattern('HP %% %1 / %1');
  assert.ok(matcher.test('HP % 50 / 50'));
  assert.equal(substituteActionCommand('say %% %1 %0', 'line', { 1: 'value' }), 'say % value line');
});

test('restores a bounded sanitized action snapshot without executing it', () => {
  const engine = new ActionEngine({ maxActions: 2 });
  const snapshot = engine.restore({
    enabled: false,
    definitions: [
      { pattern: 'B', command: 'say b', priority: 9, enabled: false },
      { pattern: 'A\n', command: 'say a\nscore', priority: 0 },
      { pattern: '', command: 'ignored' }
    ]
  });
  assert.equal(snapshot.enabled, false);
  assert.deepEqual(snapshot.definitions, [
    { pattern: 'A', command: 'say a score', priority: 1, enabled: true, scope: 'global' },
    { pattern: 'B', command: 'say b', priority: 9, enabled: false, scope: 'global' }
  ]);
  assert.equal(engine.match('A').matched, false);
});

test('line buffer waits for complete lines and drops oversized input safely', () => {
  const buffer = new ActionLineBuffer({ maxLineLength: 256 });
  assert.deepEqual(buffer.push('You are'), []);
  assert.deepEqual(buffer.push(' hungry.\n'), ['You are hungry.']);
  assert.deepEqual(buffer.push(`${'x'.repeat(300)}\nOK\n`), ['OK']);
});

test('line buffer flush completes one bounded prompt tail and resets cleanly', () => {
  const buffer = new ActionLineBuffer({ maxLineLength: 256 });
  assert.deepEqual(buffer.push('Ready to Remort!'), []);
  assert.deepEqual(buffer.flush(), ['Ready to Remort!']);
  assert.deepEqual(buffer.flush(), []);
  assert.deepEqual(buffer.push('next line\n'), ['next line']);

  assert.deepEqual(buffer.push('x'.repeat(300)), []);
  assert.deepEqual(buffer.flush(), []);
  assert.deepEqual(buffer.push('recovered\n'), ['recovered']);
});

test('rate limiter blocks rapid duplicates and caps commands per window', () => {
  const limiter = new ActionRateLimiter({
    maxTriggers: 2, windowMs: 1000, duplicateCooldownMs: 250, noticeIntervalMs: 500
  });
  const action = { pattern: 'Hit %1' };
  assert.equal(limiter.allow(action, 'Hit one', 1000).allowed, true);
  assert.deepEqual(limiter.allow(action, 'Hit one', 1100), {
    allowed: false, reason: 'duplicate', notify: false
  });
  assert.equal(limiter.allow(action, 'Hit two', 1200).allowed, true);
  assert.deepEqual(limiter.allow(action, 'Hit three', 1300), {
    allowed: false, reason: 'rate-limit', notify: true
  });
  assert.equal(limiter.allow(action, 'Hit three', 2100).allowed, true);
});


test('splits source-style Action command lists with braces and escaped semicolons while quotes remain literal', () => {
  assert.deepEqual(splitActionCommands('smile;look;poke bob'), {
    commands: ['smile', 'look', 'poke bob'], error: ''
  });
  assert.deepEqual(splitActionCommands("say 'hello; there';emote {checks;a gauge};say hello\\; everyone"), {
    commands: ["say 'hello", "there'", 'emote {checks;a gauge}', 'say hello; everyone'], error: ''
  });
  assert.deepEqual(splitActionCommands("say don't panic;smile"), {
    commands: ["say don't panic", 'smile'], error: ''
  });
  assert.match(splitActionCommands('look\\').error, /unfinished escape/u);
  assert.match(splitActionCommands('say {broken').error, /unterminated brace/u);
  assert.equal(splitActionCommands(Array.from({ length: 64 }, (_value, index) => `cmd${index}`).join(';')).error, '');
  assert.match(splitActionCommands(Array.from({ length: 65 }, (_value, index) => `cmd${index}`).join(';')).error, /at most 64/u);
});

test('substituted captures cannot inject extra action commands', () => {
  const engine = new ActionEngine();
  engine.define('Message: %1', 'say %1;smile');
  const result = engine.match('Message: hello;quit');
  assert.deepEqual(result.commands, ['say hello;quit', 'smile']);
  assert.equal(result.command, 'say hello;quit; smile');
});

test('weighted action rate limiting counts every generated command', () => {
  const limiter = new ActionRateLimiter({
    maxTriggers: 10, windowMs: 1000, duplicateCooldownMs: 0, noticeIntervalMs: 500
  });
  const action = { pattern: 'Burst' };
  assert.equal(limiter.allowCommands(action, 'Burst one', 7, 1000).allowed, true);
  assert.deepEqual(limiter.allowCommands(action, 'Burst two', 4, 1100), {
    allowed: false, reason: 'rate-limit', notify: true
  });
  assert.equal(limiter.allowCommands(action, 'Burst three', 10, 2100).allowed, true);
});

test('can preserve escaped percent signs until variable expansion completes', () => {
  const preserved = substituteActionCommand('say %%target %1', 'line', { 1: 'wounded' }, {
    preserveLiteralPercent: true
  });
  assert.equal(preserved, `say \uE000target wounded`);
});
