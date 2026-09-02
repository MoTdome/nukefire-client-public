'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {
  CLIENT_COMMAND_PREFIXES,
  DEFAULT_CLIENT_COMMAND_PREFIX,
  normalizeClientCommandPrefix,
  isClientCommand,
  isEscapedClientCommand,
  analyzeCommandLine,
  firstDirective
} = require('../src/client-command-parser');
const { AliasEngine } = require('../src/alias-engine');

function loadRendererPrefixHelpers() {
  const rendererSource = fs.readFileSync(
    path.join(__dirname, '..', 'renderer', 'renderer.js'),
    'utf8'
  );
  const start = rendererSource.indexOf("const CLIENT_COMMAND_PREFIXES = Object.freeze");
  const end = rendererSource.indexOf("const OUTPUT_STYLE_KEYS = Object.freeze");
  assert.notEqual(start, -1, 'renderer prefix helper start should exist');
  assert.notEqual(end, -1, 'renderer prefix helper end should exist');

  const context = { state: { sessions: { commandPrefix: '#' } } };
  vm.runInNewContext(
    `${rendererSource.slice(start, end)}
this.helpers = { normalizeClientCommandPrefix, rewriteCommandListPrefix };`,
    context
  );
  return context.helpers;
}

const rendererPrefixHelpers = loadRendererPrefixHelpers();

test('normalizes the supported one-character client command prefixes', () => {
  assert.deepEqual(CLIENT_COMMAND_PREFIXES, ['#', '~', '^', '/', '`', "'"]);
  assert.equal(DEFAULT_CLIENT_COMMAND_PREFIX, '#');
  for (const prefix of CLIENT_COMMAND_PREFIXES) {
    assert.equal(normalizeClientCommandPrefix(prefix), prefix);
  }
  assert.equal(normalizeClientCommandPrefix('  ~  '), '~');
  assert.equal(normalizeClientCommandPrefix('!'), '#');
  assert.equal(normalizeClientCommandPrefix('##'), '#');
});

test('parses directives and literal-prefix escapes with the selected prefix', () => {
  assert.deepEqual(firstDirective('~alias {ga} {score}', '~'), {
    directive: 'alias',
    body: '{ga} {score}'
  });
  assert.equal(firstDirective('#alias {ga} {score}', '~'), null);
  assert.equal(isClientCommand('~all score', '~'), true);
  assert.equal(isClientCommand('~~help', '~'), false);
  assert.equal(isEscapedClientCommand('~~help', '~'), true);

  assert.equal(
    rendererPrefixHelpers.rewriteCommandListPrefix(
      "#all score; ##help; say don't panic; #Shai heal",
      '#',
      '~'
    ),
    "~all score; #help; say don't panic; ~Shai heal"
  );
  assert.equal(
    rendererPrefixHelpers.rewriteCommandListPrefix(
      'say {one;two}; #all score; say "three;four"; #followers rest',
      '#',
      '^'
    ),
    'say {one;two}; ^all score; say "three;four"; ^followers rest'
  );
});


test('analyzes top-level command batches with the selected prefix', () => {
  assert.deepEqual(
    analyzeCommandLine('e;bash goblin;flee', '#'),
    {
      commands: ['e', 'bash goblin', 'flee'],
      errorCode: '',
      hasClientCommands: false,
      hasServerCommands: true,
      clientOnly: false
    }
  );
  assert.deepEqual(
    analyzeCommandLine('#showme {Ready; now};#help', '#'),
    {
      commands: ['#showme {Ready; now}', '#help'],
      errorCode: '',
      hasClientCommands: true,
      hasServerCommands: false,
      clientOnly: true
    }
  );
  assert.deepEqual(
    analyzeCommandLine('~showme {Ready};look', '~'),
    {
      commands: ['~showme {Ready}', 'look'],
      errorCode: '',
      hasClientCommands: true,
      hasServerCommands: true,
      clientOnly: false
    }
  );
  assert.equal(analyzeCommandLine('say one\\;two;look', '#').commands[0], 'say one\\;two');
  assert.deepEqual(
    analyzeCommandLine('', '#'),
    {
      commands: [''],
      errorCode: '',
      hasClientCommands: false,
      hasServerCommands: true,
      clientOnly: false
    }
  );
  assert.equal(analyzeCommandLine('look;score;flee', '#', { maxCommands: 2 }).errorCode, 'too-many');
});

test('alias expansion protects directives that use the selected prefix', () => {
  const engine = new AliasEngine({ commandPrefix: '~' });
  engine.define('go', '~all north');
  assert.deepEqual(engine.expandCommands('go').commands, ['~all north']);

  engine.setCommandPrefix('^');
  engine.define('oldprefix', '~all south');
  assert.deepEqual(engine.expandCommands('oldprefix').commands, ['~all south']);
});
