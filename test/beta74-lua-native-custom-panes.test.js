
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { LuaRuntime } = require('../src/lua-runtime');
const { LuaPaneRegistry, MAX_LUA_PANES_PER_SESSION } = require('../src/lua-pane-model');
const { clientCommandHelp } = require('../src/client-command-help');

const hostContext = {
  session: { id: 'alpha', name: 'Alpha', connected: true },
  variables: [], gmcpJson: '{}', gmcpMetaJson: '{}', msdpJson: '{}'
};

function command(action, paneId, payload = {}) {
  return { action, paneId, payloadJson: JSON.stringify(payload) };
}

test('native Lua pane registry accepts only bounded declarative text value and bar rows', () => {
  const registry = new LuaPaneRegistry();
  const created = registry.apply('alpha', command('create', 'combat', {
    title: 'Combat',
    rows: [
      { id: 'hp', type: 'bar', label: 'HP' },
      { id: 'target', type: 'text', label: 'Opponent' },
      { id: 'tnl', type: 'value', label: 'TNL' }
    ],
    html: '<script>nope()</script>', css: 'body{}', javascript: 'nope()'
  }));
  assert.equal(created.ok, true);
  assert.deepEqual(created.event.pane.rows.map((row) => row.type), ['bar', 'text', 'value']);
  assert.equal(Object.hasOwn(created.event.pane, 'html'), false);
  assert.equal(Object.hasOwn(created.event.pane, 'css'), false);
  assert.equal(Object.hasOwn(created.event.pane, 'javascript'), false);

  const hp = registry.apply('alpha', command('set', 'combat', { rowId: 'hp', value: { value: 700, max: 1000 } }));
  assert.deepEqual(hp.event.pane.values.hp, { value: 700, max: 1000 });
  const target = registry.apply('alpha', command('set', 'combat', { rowId: 'target', value: '<img src=x onerror=x>' }));
  assert.equal(target.event.pane.values.target, '<img src=x onerror=x>');
  assert.equal(registry.apply('alpha', command('set', 'combat', { rowId: 'missing', value: 1 })).ok, false);
  assert.equal(registry.apply('alpha', command('create', 'badpane', { title: 'Bad', rows: [{ id: 'x', type: 'html', label: 'X' }] })).ok, false);
});

test('native Lua pane registry bounds pane count and supports show hide clear destroy', () => {
  const registry = new LuaPaneRegistry();
  for (let index = 0; index < MAX_LUA_PANES_PER_SESSION; index += 1) {
    assert.equal(registry.apply('alpha', command('create', `p${index}`, { rows: [{ id: 'v', type: 'value', label: 'Value' }] })).ok, true);
  }
  assert.equal(registry.apply('alpha', command('create', 'overflow', { rows: [{ id: 'v', type: 'value', label: 'Value' }] })).reason, 'pane-limit');
  assert.equal(registry.apply('alpha', command('hide', 'p0')).event.pane.visible, false);
  assert.equal(registry.apply('alpha', command('show', 'p0')).event.pane.visible, true);
  registry.apply('alpha', command('set', 'p0', { rowId: 'v', value: 99 }));
  assert.equal(registry.apply('alpha', command('clear', 'p0')).event.pane.values.v, '');
  assert.deepEqual(registry.apply('alpha', command('destroy', 'p0')).event, { action: 'destroy', paneId: 'p0' });
});

test('nf.pane Lua API emits host pane commands but exposes no HTML DOM or gag surface', async () => {
  const runtime = new LuaRuntime({ hardTimeoutMs: 900 });
  await runtime.start();
  await runtime.createSession('alpha');
  const events = [];
  try {
    const result = await runtime.execute('alpha', `
      local pane = nf.pane.create('combat', {
        title='Combat',
        rows={
          {id='hp', type='bar', label='HP'},
          {id='opp', type='text', label='Opponent'}
        }
      })
      local a = pane:set('hp', {value=700, max=1000})
      local b = pane:set('opp', 'mutant')
      local c = pane:hide()
      local d = pane:show()
      local e = pane:clear()
      local f = pane:destroy()
      return pane ~= nil, a, b, c, d, e, f, type(nf.pane), type(nf.pane.create), type(mud and mud.trigger)
    `, {}, hostContext, (event) => events.push(event));
    assert.equal(result.ok, true, result.error?.message || 'pane API failed');
    assert.deepEqual(result.values, [true, true, true, true, true, true, true, 'table']);
    const paneEvents = events.filter((event) => event.event === 'pane-command');
    assert.deepEqual(paneEvents.map((event) => event.command.action), ['create', 'set', 'set', 'hide', 'show', 'clear', 'destroy']);
    assert.equal(JSON.parse(paneEvents[0].command.payloadJson).rows[0].type, 'bar');
  } finally { await runtime.close(); }
});

test('renderer uses NukeFire-owned semantic nodes for Custom Panes and never injects player markup', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(renderer, /id: 'luaPanes', label: 'Custom Panes'/u);
  assert.match(renderer, /case 'lua-pane-state'/u);
  assert.match(renderer, /document\.createElement\('progress'\)/u);
  assert.match(renderer, /output\.textContent = String\(value/u);
  assert.doesNotMatch(renderer, /pane\.html|pane\.css|pane\.javascript/u);
  const help = clientCommandHelp('lua').join('\n');
  assert.match(help, /nf\.pane\.create/u);
  assert.match(help, /never HTML, CSS, JavaScript, DOM access/u);
});
