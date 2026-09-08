'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AliasEngine } = require('../src/alias-engine');
const { ActionEngine } = require('../src/action-engine');
const { HighlightEngine } = require('../src/highlight-engine');
const { SubstituteEngine } = require('../src/substitute-engine');
const { SessionManager } = require('../src/session-manager');
const parser = require('../src/client-command-parser');
const loader = require('../src/tintin-script-loader');
const writer = require('../src/tintin-script-writer');

function emptyDefinitions() {
  return {
    aliases: [], variables: [], functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    events: { enabled: true, definitions: [] },
    classes: { activeStack: [], definitions: [] }
  };
}

function inertManager() {
  let nextTimer = 0;
  return new SessionManager({
    queueOptions: { intervalMs: 0 },
    delaySetTimer: () => ({ id: ++nextTimer }),
    delayClearTimer: () => {},
    tickerSetTimer: () => ({ id: ++nextTimer }),
    tickerClearTimer: () => {}
  });
}

test('source command abbreviations follow TinTin table order while NukeFire exact commands stay protected', () => {
  assert.equal(parser.firstDirective('#hist').directive, 'history');
  assert.equal(parser.firstDirective('#buf').directive, 'buffer');
  assert.equal(parser.firstDirective('#pat').directive, 'path');
  assert.equal(parser.firstDirective('#cla').directive, 'class');
  assert.equal(parser.firstDirective('#una').directive, 'unaction');
  assert.equal(parser.firstDirective('#aliases').directive, 'aliases');
  assert.equal(parser.firstDirective('#groups').directive, 'groups');
  assert.equal(parser.firstDirective('#show').directive, 'show');

  const manager = inertManager();
  const session = manager.createSession({ id: 'abbr', name: 'Abbr' });
  assert.match(manager.dispatchInput(session.id, '#hist li').messages[0], /#hist li/u);
  assert.match(manager.dispatchInput(session.id, '#buf i').messages[0], /review buffer/iu);
  assert.match(manager.dispatchInput(session.id, '#cla {tools} {op}').messages[0], /opened/iu);
  assert.match(manager.dispatchInput(session.id, '#line g 1').messages[0], /Line gag armed/iu);
  assert.match(manager.dispatchInput(session.id, '#pat lo {north;south}').messages[0], /loaded with 2 nodes/iu);
  assert.deepEqual(manager.dispatchInput(session.id, '#conf {command e} {on}').messages, ['Command echo enabled.']);
});

test('abbreviated importer directives keep the original body boundary and Alias priority round-trips', () => {
  const result = loader.prepareTinTinRead(`
#al {foo} {say hello} {2}
#var table[key with spaces] value
`, emptyDefinitions(), { filename: 'abbr.tin' });
  assert.equal(result.ok, true, result.errors?.join('\n'));
  assert.deepEqual(result.definitions.aliases, [
    { name: 'foo', body: 'say hello', priority: 2, scope: 'global' }
  ]);
  assert.equal(result.definitions.variables.find((entry) => entry.name === 'table[key with spaces]')?.value, 'value');

  const written = writer.prepareTinTinWrite(result.definitions);
  assert.equal(written.ok, true);
  assert.match(written.content, /#alias \{foo\} \{say hello\} \{2\}/u);
});

test('Alias priority chooses the first match across literal and patterned Aliases', () => {
  const aliases = new AliasEngine();
  aliases.define('ga', 'say literal', 5);
  aliases.define('g%*', 'say pattern %1', 1);
  assert.equal(aliases.expand('ga hello').command, 'say pattern a hello');

  aliases.define('ga', 'say literal-first', 1);
  aliases.define('g%*', 'say pattern-later %1', 8);
  assert.equal(aliases.expand('ga hello').command, 'say literal-first hello');
  assert.equal(aliases.get('ga').priority, 1);
});

test('definition queries and UN commands accept source-style wildcard patterns', () => {
  const manager = inertManager();
  const session = manager.createSession({ id: 'main', name: 'Main' });

  manager.dispatchInput(session.id, '#alias {a1} {look}');
  manager.dispatchInput(session.id, '#alias {a2} {score}');
  manager.dispatchInput(session.id, '#action {Warn one} {look}');
  manager.dispatchInput(session.id, '#action {Warn two} {score}');
  manager.dispatchInput(session.id, '#highlight {Danger one} {Red}');
  manager.dispatchInput(session.id, '#highlight {Danger two} {Cyan}');
  manager.dispatchInput(session.id, '#substitute {coin one} {credit}');
  manager.dispatchInput(session.id, '#substitute {coin two} {credits}');
  manager.dispatchInput(session.id, '#variable {var-one} {1}');
  manager.dispatchInput(session.id, '#variable {var-two} {2}');
  manager.dispatchInput(session.id, '#function {fun_one} {#return {one}}');
  manager.dispatchInput(session.id, '#function {fun_two} {#return {two}}');
  manager.dispatchInput(session.id, '#gag {noise one}');
  manager.dispatchInput(session.id, '#gag {noise two}');
  manager.dispatchInput(session.id, '#macro {F1} {look}');
  manager.dispatchInput(session.id, '#macro {F2} {score}');
  manager.dispatchInput(session.id, '#event {TIME 00:00} {look}');
  manager.dispatchInput(session.id, '#event {TIME 12:00} {score}');
  manager.dispatchInput(session.id, '#ticker {pulse-one} {look} {60}');
  manager.dispatchInput(session.id, '#ticker {pulse-two} {score} {60}');
  manager.dispatchInput(session.id, '#delay {later-one} {look} {60}');
  manager.dispatchInput(session.id, '#delay {later-two} {score} {60}');

  assert.equal(manager.dispatchInput(session.id, '#alias {a%*}').messages.length, 2);
  assert.equal(manager.dispatchInput(session.id, '#action {Warn%*}').messages.length, 2);
  assert.equal(manager.dispatchInput(session.id, '#highlight {Danger%*}').messages.length, 2);
  assert.equal(manager.dispatchInput(session.id, '#substitute {coin%*}').messages.length, 2);
  assert.equal(manager.dispatchInput(session.id, '#variable {var-%*}').messages.length, 2);
  assert.equal(manager.dispatchInput(session.id, '#function {fun_%*}').messages.length, 2);
  assert.equal(manager.dispatchInput(session.id, '#macro {F%*}').messages.length, 2);
  assert.equal(manager.dispatchInput(session.id, '#event {TIME%*}').messages.length, 2);
  assert.equal(manager.dispatchInput(session.id, '#ticker {pulse-%*}').messages.length, 2);
  assert.equal(manager.dispatchInput(session.id, '#delay {later-%*}').messages.length, 2);

  assert.match(manager.dispatchInput(session.id, '#unalias {a%*}').messages[0], /Deleted 2 aliases/u);
  assert.match(manager.dispatchInput(session.id, '#unaction {Warn%*}').messages[0], /Deleted 2 actions/u);
  assert.match(manager.dispatchInput(session.id, '#unhighlight {Danger%*}').messages[0], /Deleted 2 highlights/u);
  assert.match(manager.dispatchInput(session.id, '#unsubstitute {coin%*}').messages[0], /Deleted 2 substitutes/u);
  assert.match(manager.dispatchInput(session.id, '#unvariable {var-%*}').messages[0], /Deleted 2 variables/u);
  assert.match(manager.dispatchInput(session.id, '#unfunction {fun_%*}').messages[0], /Deleted 2 functions/u);
  assert.match(manager.dispatchInput(session.id, '#ungag {noise%*}').messages[0], /Deleted 2 gags/u);
  assert.match(manager.dispatchInput(session.id, '#unmacro {F%*}').messages[0], /Deleted 2 macros/u);
  assert.match(manager.dispatchInput(session.id, '#unevent {TIME%*}').messages[0], /2 Events/u);
  assert.match(manager.dispatchInput(session.id, '#unticker {pulse-%*}').messages[0], /2 tickers/u);
  assert.match(manager.dispatchInput(session.id, '#undelay {later-%*}').messages[0], /2 delays/u);
});

test('LIST source abbreviations, pattern FIND, delete count, and packed ADD/SORT values work together', () => {
  const manager = inertManager();
  const session = manager.createSession({ id: 'main', name: 'Main' });
  manager.dispatchInput(session.id, '#list {items} {create} {alpha;beta;gamma;delta}');

  manager.dispatchInput(session.id, '#list {items} {fnd} {b%*} {found}');
  assert.equal(manager.snapshot().variables.find((entry) => entry.name === 'found')?.value, '2');

  assert.match(manager.dispatchInput(session.id, '#list {items} {delete} {2} {2}').messages[0], /deleted 2 items/u);
  assert.match(manager.dispatchInput(session.id, '#list {items} {add} {zeta;eta}').messages[0], /added 2 items/u);
  assert.match(manager.dispatchInput(session.id, '#list {items} {srt} {aardvark;omega}').messages[0], /added 2 items and sorted 6 total/u);
  manager.dispatchInput(session.id, '#list {items} {length} {length}');
  assert.equal(manager.snapshot().variables.find((entry) => entry.name === 'length')?.value, '6');

  manager.dispatchInput(session.id, '#list {empty} {create} {}');
  assert.ok(manager.snapshot().variables.find((entry) => entry.name === 'empty'));
  assert.equal(manager.snapshot().variables.some((entry) => entry.name.startsWith('empty[')), false);
});

test('richer TinTin pattern tokens work across Actions, Aliases, Highlights, and Substitutions', () => {
  const actions = new ActionEngine();
  actions.define('%iCOUNT %d', 'say number %1');
  assert.equal(actions.match('count 123').command, 'say number 123');
  actions.define('^%S %. %+%?$', 'say captured', 1);
  assert.equal(actions.match('word x rest!').matched, true);

  const aliases = new AliasEngine();
  aliases.define('^cast %S$', 'say %1', 2);
  assert.equal(aliases.expand('CAST fireball').command, 'say fireball');

  const highlights = new HighlightEngine();
  highlights.define('code:%w', 'Cyan', 5);
  assert.equal(highlights.findMatches('code:Alpha').some((entry) => entry.pattern === 'code:%w'), true);

  const substitutes = new SubstituteEngine();
  substitutes.define('room:%D', 'ROOM', 5);
  assert.equal(substitutes.findMatches('room:hallway').some((entry) => entry.pattern === 'room:%D'), true);
});
