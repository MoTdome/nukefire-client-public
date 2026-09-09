 'use strict';

 const test = require('node:test');
 const assert = require('node:assert/strict');
 const fs = require('node:fs');
 const path = require('node:path');
 const { LuaRuntime } = require('../src/lua-runtime');
 const { SessionManager } = require('../src/session-manager');

 const repo = path.join(__dirname, '..');
 const read = (relative) => fs.readFileSync(path.join(repo, relative), 'utf8');

 const hostContext = {
   session: { id: 'alpha', name: 'Alpha', connected: true },
   variables: [],
   commandLine: 'tell Bob ',
   outputHistory: {
     currentLine: 'partial prompt',
     currentLineNumber: 5,
     firstLineNumber: 1,
     lines: [
       { number: 1, text: 'one' },
       { number: 2, text: 'two' },
       { number: 3, text: 'three' },
       { number: 4, text: 'four' }
     ]
   }
 };

 test('Mudlet convenience globals use bounded host bridges without exposing renderer internals', async () => {
   const sends = [];
   const echoes = [];
   const events = [];
   const runtime = new LuaRuntime({
     hardTimeoutMs: 900,
     onSend: (event) => sends.push(event),
     onEcho: (event) => echoes.push(event)
   });
   await runtime.start();
   try {
     await runtime.createSession('alpha');
     const result = await runtime.execute('alpha', `
       local before = getCmdLine()
       local appended = appendCmdLine("hello")
       local after = getCmdLine()
       local recent = table.concat(getLines(-3, -1), "|")
       local walked = speedwalk("2n3e", false, 0, false)
       local sent = sendAll("look", "score", false)
       decho("<255,0,0>red")
       hecho("#00FF00green")
       return before, appended, after, getCurrentLine(), getLineNumber(), recent, walked, sent
     `, {}, hostContext, (event) => events.push(event));
     assert.equal(result.ok, true);
     assert.deepEqual(result.values, ['tell Bob ', true, 'tell Bob hello', 'partial prompt', 5, 'two|three|four', true, true]);
     assert.deepEqual(sends.map((event) => ({ command: event.command, show: event.show })), [{ command: 'look', show: false }, { command: 'score', show: false }]);
     assert.equal(events.filter((event) => event.event === 'command-line-set').at(-1)?.text, 'tell Bob hello');
     assert.deepEqual(events.filter((event) => event.event === 'speedwalk').map((event) => event.route), ['2n3e']);
     assert.deepEqual(echoes.map((event) => event.args), [['red'], ['green']]);
     const formatted = events.filter((event) => event.event === 'echo' && event.formattedText);
     assert.deepEqual(formatted.map((event) => event.format), ['decho', 'hecho']);
     assert.match(formatted[0].formattedText, /\x1b\[38;2;255;0;0mred/u);
     assert.match(formatted[1].formattedText, /\x1b\[38;2;0;255;0mgreen/u);
   } finally {
     await runtime.close();
   }
 });

 test('native history and speedwalk helpers stay bounded and session-owned', () => {
   const manager = Object.create(SessionManager.prototype);
   const emitted = [];
   const session = {
     id: 'alpha',
     status: { state: 'connected' },
     luaCommandDraft: '', luaVisibleOutputHistory: [], luaVisibleOutputCarry: '', luaVisibleLineNumber: 1,
     delays: new Map()
   };
   manager.sessions = new Map([['alpha', session]]);
   manager.findSession = (reference) => reference === 'alpha' || reference === session ? session : null;
   manager.emit = (id, type, payload) => emitted.push({ id, type, payload });
   manager.maxSpeedwalkSteps = 200;
   manager.maxDelaySeconds = 86400;
   manager.maxPendingDelays = 100;
   manager.queueSpeedwalk = (_reference, steps) => steps.map((command) => ({ queued: true, command }));

   manager.appendLuaVisibleOutput(session, 'one\ntwo\npartial');
   assert.deepEqual(manager.luaOutputSnapshot(session), {
     currentLine: 'partial', currentLineNumber: 3, firstLineNumber: 1,
     lines: [{ number: 1, text: 'one' }, { number: 2, text: 'two' }]
   });
   assert.deepEqual(manager.setLuaCommandDraft('alpha', 'tell Bob hi', { emit: true }), { changed: true, text: 'tell Bob hi' });
   assert.equal(emitted.at(-1).type, 'lua-command-line');
   const walk = manager.queueLuaSpeedwalk('alpha', '2n3e', { backwards: true });
   assert.equal(walk.queued, true);
   assert.deepEqual(walk.deliveries.map((entry) => entry.command), ['w', 'w', 'w', 's', 's']);
 });

 test('C1 routes helpers through NukeFire-owned state and preserves the Lua containment boundary', () => {
   const worker = read('src/lua-runtime-worker.js');
   const manager = read('src/session-manager.js');
   const main = read('main.js');
   const renderer = read('renderer/renderer.js');
   const help = read('src/client-command-help.js');

   for (const name of ['sendAll', 'speedwalk', 'getCmdLine', 'printCmdLine', 'appendCmdLine', 'clearCmdLine', 'getCurrentLine', 'getLines', 'decho', 'hecho']) {
     assert.match(worker, new RegExp(`function\\s+${name}\\b`, 'u'));
   }
   assert.match(manager, /queueLuaSpeedwalk/u);
   assert.match(manager, /appendLuaVisibleOutput/u);
   assert.match(manager, /LUA_OUTPUT_HISTORY_MAX = 256/u);
   assert.match(main, /outputHistory: sessionManager\.luaOutputSnapshot/u);
   assert.match(renderer, /case 'lua-command-line': applyLuaCommandLine/u);
   assert.match(help, /getLines\(-10, -1\)/u);

   assert.doesNotMatch(worker, /function\s+gag\s*\(/u);
   assert.doesNotMatch(manager, /innerHTML\s*=.*lua/iu);
 });

 test('C1 containment is enforced by the live Lua environment rather than source-word grepping', async () => {
   const runtime = new LuaRuntime({ hardTimeoutMs: 900 });
   await runtime.start();
   try {
     await runtime.createSession('alpha');
     const result = await runtime.execute('alpha', `
       return type(window), type(document), type(io), type(os),
              type(debug), type(gag), type(package), type(require)
     `, {}, hostContext);
     assert.equal(result.ok, true);
     assert.deepEqual(result.values, [
       'nil', 'nil', 'nil', 'nil', 'nil', 'nil', 'nil', 'function'
     ]);
   } finally {
     await runtime.close();
   }
 });
