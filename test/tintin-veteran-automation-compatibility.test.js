'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { AliasEngine, DEFAULT_MAX_ALIAS_COMMANDS } = require('../src/alias-engine');
const { parseMacroKey } = require('../src/macro-engine');
const { parseHighlightStyle } = require('../src/highlight-engine');
const { canonicalClientDirective, splitTopLevelCommands } = require('../src/client-command-parser');
const { VariableEngine } = require('../src/variable-engine');
const { SessionManager } = require('../src/session-manager');
const { prepareTinTinRead } = require('../src/tintin-script-loader');
const { clientCommandHelp } = require('../src/client-command-help');

class FakeConnection {
  constructor(handlers) {
    this.handlers = handlers;
    this.sent = [];
    this.status = 'disconnected';
  }
  async connect(host, port) {
    this.status = 'connected';
    this.handlers.onStatus?.({ state: 'connected', host, port, message: 'connected' });
  }
  disconnect() { this.status = 'disconnected'; }
  sendCommand(command) {
    if (this.status !== 'connected') return false;
    this.sent.push(command);
    return true;
  }
  sendGmcp() { return true; }
  setTerminalSize() { return true; }
  setClientPreferences() { return {}; }
}

function managerWithTimers(options = {}) {
  const delayTimers = [];
  const tickerTimers = [];
  const clearedTickers = [];
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    delaySetTimer: (callback, milliseconds) => {
      const timer = { callback, milliseconds, type: 'delay' };
      delayTimers.push(timer);
      return timer;
    },
    delayClearTimer: () => {},
    tickerSetTimer: (callback, milliseconds) => {
      const timer = { callback, milliseconds, type: 'ticker' };
      tickerTimers.push(timer);
      return timer;
    },
    tickerClearTimer: (timer) => clearedTickers.push(timer),
    ...options
  });
  return { manager, delayTimers, tickerTimers, clearedTickers, events };
}

test('braced veteran prose quotes never corrupt whole-file TinTin parsing', () => {
  const source = [
    '#mess var',
    '#list socialsGunsList {add} {lifts the gun and asks, "You want me to do *what*?}',
    '#list socialsGunsList {add} {kisses the barrel like an old lover. "Mmm. Smells like chaos."}',
    '#alias {socialsGuns} {#math dice {1d&socialsGunsList[]};emote $socialsGunsList[$dice]}',
    '#action {ready} {look}'
  ].join('\n');
  const result = prepareTinTinRead(source, {});
  assert.equal(result.ok, true);
  assert.equal(result.counts.variables, 2);
  assert.equal(result.counts.aliases, 1);
  assert.equal(result.counts.actions, 1);
  assert.equal(result.unsupportedCounts.message, undefined);
  assert.equal(result.runtimeCommands.some((entry) => entry.directive === 'message'), true);
});

test('brace-aware command splitting ignores unmatched prose quotes inside braced data', () => {
  const parsed = splitTopLevelCommands('#list {socials} {add} {She says "what?};say next', { maxCommands: 8 });
  assert.equal(parsed.errorCode, '');
  assert.deepEqual(parsed.commands, ['#list {socials} {add} {She says "what?}', 'say next']);
});

test('simple TinTin controller aliases append trailing input when their body has no percent arguments', () => {
  assert.equal(DEFAULT_MAX_ALIAS_COMMANDS, 128);
  const aliases = new AliasEngine();
  assert.ok(aliases.define('jj', '#Jags'));
  assert.ok(aliases.define('ju', '#Jugs'));
  assert.deepEqual(aliases.expandCommands('jj pounce mob').commands, ['#Jags pounce mob']);
  assert.deepEqual(aliases.expandCommands('ju sling dark blessing Jags').commands, ['#Jugs sling dark blessing Jags']);
  assert.ok(aliases.define('k', 'kill %1;kick'));
  assert.deepEqual(aliases.expandCommands('k orc').commands, ['kill orc', 'kick']);
});

test('128-command Alias ceiling accepts real long route/controller aliases but remains bounded', () => {
  const aliases = new AliasEngine();
  const route = Array.from({ length: 88 }, (_entry, index) => `step${index + 1}`).join(';');
  assert.ok(aliases.define('gotoaa', route));
  assert.equal(aliases.expandCommands('gotoaa').commands.length, 88);
  const maximum = Array.from({ length: 128 }, (_entry, index) => `step${index + 1}`).join(';');
  assert.ok(aliases.define('maximum', maximum));
  const overflow = Array.from({ length: 129 }, (_entry, index) => `step${index + 1}`).join(';');
  assert.equal(aliases.define('overflow', overflow), null);
});

test('full veteran VT keypad family and observed control variants import as physical keys', () => {
  const expected = new Map([
    ['\\eOp', 'Numpad0'], ['\\eOq', 'Numpad1'], ['\\eOr', 'Numpad2'],
    ['\\eOs', 'Numpad3'], ['\\eOt', 'Numpad4'], ['\\eOu', 'Numpad5'],
    ['\\eOv', 'Numpad6'], ['\\eOw', 'Numpad7'], ['\\eOx', 'Numpad8'],
    ['\\eOy', 'Numpad9'], ['\\eOk', 'NumpadAdd'], ['\\eOm', 'NumpadSubtract'],
    ['\\eOj', 'NumpadMultiply'], ['\\eOo', 'NumpadDivide'], ['\\eOn', 'NumpadDecimal'],
    ['\\eOM', 'NumpadEnter'], ['\\e[1;5q', 'ctrl+Numpad1'], ['\\e[1;5s', 'ctrl+Numpad3'],
    ['\\e[1;5u', 'ctrl+Numpad5'], ['\\e[1;5n', 'ctrl+NumpadDecimal'],
    ['\\eO5j', 'ctrl+NumpadMultiply'], ['\\eO5o', 'ctrl+NumpadDivide']
  ]);
  for (const [sequence, signature] of expected) {
    const parsed = parseMacroKey(sequence);
    assert.equal(parsed.error, '', sequence);
    assert.equal(parsed.signature, signature, sequence);
  }
});

test('generic TinTin <aaa> through <fff> cube highlights map to bounded xterm colors', () => {
  assert.equal(parseHighlightStyle('<aaa>').style.fg, '#000000');
  assert.equal(parseHighlightStyle('<cff>').style.fg, '#87ffff');
  assert.equal(parseHighlightStyle('<fdd>').style.fg, '#ffafaf');
  assert.equal(parseHighlightStyle('<fff>').style.fg, '#ffffff');
});

test('list size and dynamic indexed references support veteran random-list idioms', () => {
  const variables = new VariableEngine();
  variables.define('socials[1]', 'alpha');
  variables.define('socials[2]', 'beta');
  variables.define('socials[3]', 'gamma');
  variables.define('dice', '2');
  assert.equal(variables.expand('&socials[]').value, '3');
  assert.equal(variables.expand('$socials[$dice]').value, 'beta');
});

test('#LIST ADD ORDER REVERSE and #FOREACH table-key iteration stay private and bounded', () => {
  const { manager, events } = managerWithTimers();
  const main = manager.createSession({ name: 'Main' });
  manager.dispatchInput(main.id, '#list {rolls} {add} {10} {2} {30}');
  assert.equal(manager.sessions.get(main.id).tintin.variableEngine.expand('&rolls[]').value, '3');
  manager.dispatchInput(main.id, '#list {rolls} {order}');
  assert.equal(manager.sessions.get(main.id).tintin.variableEngine.expand('$rolls[+1],$rolls[+2],$rolls[+3]').value, '2,10,30');
  manager.dispatchInput(main.id, '#list {rolls} {reverse}');
  manager.dispatchInput(main.id, '#foreach {*rolls[%*]} {_i} {#showme {$rolls[$_i]}}');
  const shown = events.filter((event) => event.type === 'local-text').map((event) => event.payload.trim());
  assert.deepEqual(shown, ['30', '10', '2']);
});

test('Functions can use local #VAR plus bounded #FOREACH/#RETURN for table lookup', () => {
  const { manager } = managerWithTimers();
  const main = manager.createSession({ name: 'Main' });
  manager.dispatchInput(main.id, '#var {last_roll[alice]} {17}');
  manager.dispatchInput(main.id, '#var {last_roll[bob]} {42}');
  const defined = manager.dispatchInput(main.id, '#function {getRoller} {#var {_roll} {%1};#foreach {*last_roll[%*]} {_lr} {#if {$last_roll[$_lr] == %1} {#return $_lr}}}');
  assert.match(defined.messages.join('\n'), /Defined function/u);
  const shown = manager.dispatchInput(main.id, '#showme {@getRoller{42}}');
  assert.deepEqual(shown.messages, []);
  const local = managerWithTimers();
  const next = local.manager.createSession({ name: 'Next' });
  assert.equal(local.manager.sessions.get(next.id).tintin.variableEngine.get('_roll'), null);
});

test('#DELAY accepts bounded math-style parenthesized durations used by veteran files', () => {
  const { manager, delayTimers } = managerWithTimers();
  const main = manager.createSession({ name: 'Main' });
  const result = manager.dispatchInput(main.id, '#delay (.3) #showme delayed');
  assert.match(result.messages.join('\n'), /0\.3 seconds/u);
  assert.equal(delayTimers.length, 1);
  assert.equal(delayTimers[0].milliseconds, 300);
});

test('#TICKER recurs by name, #LINE ONESHOT fires once, and #UNTICK cancels cleanly', () => {
  const { manager, tickerTimers, clearedTickers } = managerWithTimers();
  const main = manager.createSession({ name: 'Main' });
  let result = manager.dispatchInput(main.id, '#ticker {pulse} {#var {pulse} {1}} {2}');
  assert.match(result.messages.join('\n'), /Ticker pulse scheduled/u);
  assert.equal(tickerTimers.length, 1);
  assert.equal(tickerTimers[0].milliseconds, 2000);
  tickerTimers[0].callback();
  assert.equal(manager.sessions.get(main.id).tintin.variableEngine.get('pulse').value, '1');
  assert.equal(tickerTimers.length, 2);
  result = manager.dispatchInput(main.id, '#untick pulse');
  assert.deepEqual(result.messages, ['Ticker pulse cancelled.']);
  assert.equal(clearedTickers.length >= 1, true);

  result = manager.dispatchInput(main.id, '#line oneshot #ticker {once} {#var {once} {yes}} {1}');
  assert.match(result.messages.join('\n'), /One-shot ticker once scheduled/u);
  const oneshot = tickerTimers.at(-1);
  oneshot.callback();
  assert.equal(manager.sessions.get(main.id).tintin.variableEngine.get('once').value, 'yes');
  assert.equal(manager.sessions.get(main.id).tickers.has('once'), false);
});

test('unbraced #SHOWME text, positioned legacy Showme, and #MESS remain harmless and local', () => {
  const { manager, events } = managerWithTimers();
  const main = manager.createSession({ name: 'Main' });
  let result = manager.dispatchInput(main.id, '#showme Jigs ready for remort');
  assert.deepEqual(result.messages, []);
  assert.equal(events.some((event) => event.type === 'local-text' && event.payload === 'Jigs ready for remort\n'), true);
  result = manager.dispatchInput(main.id, '#showme {legacy status row} {-6}');
  assert.deepEqual(result.messages, []);
  assert.equal(events.some((event) => event.type === 'local-text' && event.payload === 'legacy status row\n'), true);
  result = manager.dispatchInput(main.id, '#mess var');
  assert.match(result.messages.join('\n'), /VARIABLE MESSAGE (ON|OFF)/u);
});

test('an Action may remove only itself, preserving the management safety boundary', () => {
  const { manager } = managerWithTimers();
  const main = manager.createSession({ name: 'Jigs' });
  manager.dispatchInput(main.id, '#action {gives you} {#unaction {gives you};#var {gear} {ready}}');
  manager.sessions.get(main.id).connection.handlers.onText('gives you\n');
  assert.equal(manager.sessions.get(main.id).tintin.actionEngine.get('gives you'), null);
  assert.equal(manager.sessions.get(main.id).tintin.variableEngine.get('gear').value, 'ready');

  manager.dispatchInput(main.id, '#action {other} {look}');
  manager.dispatchInput(main.id, '#action {unsafe} {#unaction {other}}');
  manager.sessions.get(main.id).connection.handlers.onText('unsafe\n');
  assert.notEqual(manager.sessions.get(main.id).tintin.actionEngine.get('other'), null);
});

test('Action-delayed #READ may reload only its own bound profile and blocks unrelated files', () => {
  const { manager, delayTimers, events } = managerWithTimers();
  const main = manager.createSession({ name: 'Jigs' });
  manager.sessions.get(main.id).tintin.profile = { requested: 'Jigs.tin', filename: 'Jigs.tin', loaded: true };

  manager.dispatchInput(main.id, '#action {gives you} {#delay 1 #read Jigs.tin}');
  manager.sessions.get(main.id).connection.handlers.onText('gives you\n');
  assert.equal(delayTimers.length, 1);
  delayTimers[0].callback();
  assert.equal(events.some((event) => event.type === 'script-read-request' && event.payload?.requested === 'Jigs.tin'), true);

  manager.dispatchInput(main.id, '#action {bad read} {#delay 1 #read Other.tin}');
  manager.sessions.get(main.id).connection.handlers.onText('bad read\n');
  assert.equal(delayTimers.length, 2);
  delayTimers[1].callback();
  assert.equal(events.some((event) => event.type === 'script-read-request' && event.payload?.requested === 'Other.tin'), false);
});

test('observed #ticket typo stays unsupported instead of silently becoming #ticker', () => {
  assert.equal(canonicalClientDirective('ticket'), 'ticket');
  assert.equal(canonicalClientDirective('tick'), 'ticker');
});

test('main-style import accepts message/list/query compatibility while leaving runtime families explicit', () => {
  const source = [
    '#config {Speedwalk} {on}',
    '#event {SESSION ACTIVATED} {#showme %0 activated.}',
    '#mess var',
    '#action {query only}',
    '#list {current_rolls} {add} {17}',
    '#alias {jj} {#Jags}',
    '#highlight {gear} {<cff>}',
    '#split 3 1'
  ].join('\n');
  const result = prepareTinTinRead(source, {});
  assert.equal(result.ok, true);
  assert.equal(result.counts.aliases, 1);
  assert.equal(result.counts.variables, 1);
  assert.equal(result.counts.highlights, 1);
  assert.equal(result.counts.events, 1);
  assert.equal(result.definitions.speedwalk.enabled, true);
  assert.equal(result.unsupportedCounts.config, undefined);
  assert.equal(result.unsupportedCounts.event, undefined);
  assert.equal(result.runtimeCommands.some((entry) => entry.directive === 'message'), true);
  assert.equal(result.compatibilityNoops.some((entry) => entry.directive === 'action-query'), true);
  assert.equal(result.compatibilityNoops.some((entry) => entry.directive === 'split'), true);
});

test('help documents the veteran automation compatibility boundaries without promising unsafe behavior', () => {
  assert.match(clientCommandHelp('alias').join('\n'), /jj pounce.*#Jags pounce/u);
  assert.match(clientCommandHelp('list').join('\n'), /&name\[\]/u);
  assert.match(clientCommandHelp('foreach').join('\n'), /\*table\[%\*\]/u);
  assert.match(clientCommandHelp('ticker').join('\n'), /64 named tickers/u);
  assert.match(clientCommandHelp('delay').join('\n'), /\(\.3\)/u);
  assert.match(clientCommandHelp('message').join('\n'), /multiple matching families/u);
  assert.match(clientCommandHelp('message').join('\n'), /explicit list\/query output remains available/u);
  assert.match(clientCommandHelp('split').join('\n'), /dedicated command input bar/u);
});
