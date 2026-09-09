'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { LuaRuntime } = require('../src/lua-runtime');

const hostContext = {
  session: { id: 'alpha', name: 'Alpha', characterName: 'Anne', role: '', host: 'nukefire.org', port: 4000, connected: true },
  variables: [],
  gmcpJson: '{}',
  gmcpMetaJson: '{}'
};

async function runtimeHarness() {
  const runtime = new LuaRuntime({ hardTimeoutMs: 900 });
  await runtime.start();
  await runtime.createSession('alpha');
  return runtime;
}

test('normal and block Lua comments execute naturally in saved-script-style source', async () => {
  const runtime = await runtimeHarness();
  try {
    const result = await runtime.execute('alpha', `
      -- normal comment
      local value = 41
      --[[ block comment
           across lines ]]
      return value + 1
    `, { chunkName: 'script/comments' }, hostContext);
    assert.equal(result.ok, true, result.error?.message || 'comment source failed');
    assert.deepEqual(result.values, [42]);
  } finally { await runtime.close(); }
});

test('real [Procs] captures populate matches[1..3] and ipairs(matches) in order', async () => {
  const runtime = await runtimeHarness();
  try {
    const setup = await runtime.execute('alpha', `
      return tempRegexTrigger('^\\\\[Procs\\\\] (\\\\d+) effects?: (.*)$', function()
        local walked = {}
        for index, value in ipairs(matches) do walked[#walked + 1] = tostring(index) .. '=' .. tostring(value) end
        return matches[1], matches[2], matches[3], table.concat(walked, '|')
      end)
    `, {}, hostContext);
    const id = setup.values[0];
    const line = '[Procs] 1 effect: the chain of broken pilgrimage keys';
    const callback = await runtime.invokeCallback('alpha', id, {
      line,
      command: '',
      matches: [line, '1', 'the chain of broken pilgrimage keys'],
      namedMatches: {},
      args: []
    }, {}, hostContext);
    assert.equal(callback.ok, true, callback.error?.message || 'callback failed');
    assert.deepEqual(callback.values, [
      line,
      '1',
      'the chain of broken pilgrimage keys',
      `1=${line}|2=1|3=the chain of broken pilgrimage keys`
    ]);
  } finally { await runtime.close(); }
});

test('cecho/decho/hecho preserve the Beta.74 echo event while adding safe render metadata', async () => {
  const runtime = await runtimeHarness();
  const events = [];
  try {
    const result = await runtime.execute('alpha', `
      local c=cecho('[<orange_red>NF<reset>] hello\\n')
      local d=decho('<0,255,0>Healthy<r>')
      local h=hecho('#0000FFBlue#r')
      cecho('<yellow>safe\\27]0;bad\\7 text<reset>')
      return c == nil, d == nil, h == nil
    `, {}, hostContext, (event) => events.push(event));
    assert.equal(result.ok, true, result.error?.message || 'formatted echo source failed');
    assert.deepEqual(result.values, [true, true, true]);
    const echoes = events.filter((event) => event.event === 'echo');
    assert.deepEqual(echoes.map((event) => event.format), ['cecho', 'decho', 'hecho', 'cecho']);
    assert.equal(echoes[0].args[0], '[NF] hello\n');
    assert.match(echoes[0].formattedText, /\x1b\[38;2;255;69;0mNF/u);
    assert.match(echoes[1].formattedText, /\x1b\[38;2;0;255;0mHealthy/u);
    assert.match(echoes[2].formattedText, /\x1b\[38;2;0;0;255mBlue/u);
    assert.doesNotMatch(echoes[3].formattedText, /\x1b\]/u);
    assert.doesNotMatch(echoes[3].formattedText, /\x07/u);
  } finally { await runtime.close(); }
});
