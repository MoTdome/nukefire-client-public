'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const findPattern = require('../src/tintin-find-pattern');
const mslp = require('../src/mslp-links');
const { TelnetParser, TELNET } = require('../src/telnet-parser');

test('TinTin output search converts veteran percent wildcards into bounded regex', () => {
  const any = findPattern.compileTinTinFindPattern('You hit %* for %d damage');
  assert.equal(any.ok, true);
  assert.equal(any.hasTinTinToken, true);
  assert.equal(new RegExp(any.regex, 'iu').test('You hit a mutant rat for 123 damage'), true);
  const numbered = findPattern.compileTinTinFindPattern('^%1 tells you %*$');
  assert.equal(new RegExp(numbered.regex, 'iu').test("Bob tells you hello there"), true);
});

test('MSLP simple SEND and MENU links translate to protected local URIs', () => {
  const translator = new mslp.MslpTranslator();
  const send = translator.push('\x1b]68;1;SEND;look\x07\x1b[4mLook\x1b[24m');
  assert.match(send, /nukefire-mslp-send:look/u);
  assert.match(send, /Look/u);
  const menu = translator.push('\x1b]68;1;MENU;{Look}{look}{North}{north}\x07\x1b[4mActions\x1b[24m');
  const uri = menu.match(/nukefire-mslp-menu:[^\x1b]+/u)?.[0] || '';
  const resolved = mslp.resolveMslpUri(uri);
  assert.equal(resolved.available, true);
  assert.deepEqual(resolved.items, [{ label: 'Look', command: 'look' }, { label: 'North', command: 'north' }]);
});

test('MSLP secure OSC 68 mode is stripped instead of becoming executable', () => {
  const translator = new mslp.MslpTranslator();
  const text = translator.push('\x1b]68;2;SEND;quit\x07\x1b[4mQuit\x1b[24m');
  assert.doesNotMatch(text, /nukefire-mslp-send:quit/u);
});

test('MTTS advertises MSLP and Telnet accepts server MSDP negotiation', () => {
  const sent = [];
  const terminalTypes = [];
  const parser = new TelnetParser({
    onSend: (buffer) => sent.push(Buffer.from(buffer)),
    onTerminalType: (value) => terminalTypes.push(value)
  });
  parser.feed(Buffer.from([TELNET.IAC, TELNET.DO, TELNET.OPT.TERMINAL_TYPE]));
  const request = Buffer.from([TELNET.IAC, TELNET.SB, TELNET.OPT.TERMINAL_TYPE, TELNET.TTYPE_SEND, TELNET.IAC, TELNET.SE]);
  parser.feed(request);
  parser.feed(request);
  parser.feed(request);
  assert.equal(terminalTypes.at(-1)?.value, 'MTTS 1805');
  parser.setScreenReaderMode(true);
  parser.feed(request);
  assert.equal(terminalTypes.at(-1)?.value, 'MTTS 1869');
  parser.feed(Buffer.from([TELNET.IAC, TELNET.WILL, TELNET.OPT.MSDP]));
  assert.equal(parser.msdpEnabled, true);
  assert.deepEqual([...sent.at(-1)], [TELNET.IAC, TELNET.DO, TELNET.OPT.MSDP]);
});

test('Beta.79 veteran pass wires prompt showme, cursor defaults, line MSDP/multishot, map extras, and keyboard capture', () => {
  const manager = source('src/session-manager.js');
  const renderer = source('renderer/renderer.js');
  const main = source('main.js');
  const help = source('src/client-command-help.js');
  assert.match(manager, /local-prompt/u);
  assert.match(manager, /safeSgr/u);
  assert.match(manager, /applyTinTinLineSubstitutionTransforms/u);
  assert.match(manager, /DEFAULT KEYS/u);
  assert.match(manager, /line multishot/u);
  assert.match(manager, /buildTinTinMsdpPayload/u);
  assert.match(manager, /mapper-tintin-command/u);
  assert.match(manager, /roomsymbol/u);
  assert.match(renderer, /handleTinTinDefaultControlKey/u);
  assert.match(renderer, /interactiveTinTinHistorySearch/u);
  assert.match(renderer, /key !== 'r' && !state\.tintinDefaultKeys/u);
  assert.match(renderer, /compileTinTinFindPattern/u);
  assert.match(renderer, /handleTinTinMapperCompatRequest/u);
  assert.match(main, /tintin:control-key/u);
  assert.match(help, /%0.*%1|%1.*%0/su);
  assert.match(help, /9x9.*11x11.*11x7/su);
});
