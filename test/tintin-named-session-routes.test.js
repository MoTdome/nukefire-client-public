'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const loader = require('../src/tintin-script-loader');
const routes = require('../src/tintin-session-routes');

function session(id, name = id) {
  return {
    id,
    name,
    tintin: {
      aliases: [], variables: [], functions: [],
      actions: { enabled: true, definitions: [] },
      gags: { enabled: true, definitions: [] },
      highlights: { enabled: true, definitions: [] },
      substitutes: { enabled: true, definitions: [] },
      macros: { enabled: true, definitions: [] },
      classes: { activeStack: [], definitions: [] },
      speedwalk: { enabled: true },
      profile: { requested: id, filename: `${id}.tin`, loaded: true }
    }
  };
}

test('loader promotes only safe named-session definition commands out of unsupported routes', () => {
  const source = [
    '#juki #VAR {hp} {10}',
    '#gyatt #ACTION {^HP %1} {#juki #VAR {hp} {%1}}',
    '#juki #SPLIT {0} {4}',
    '#juki look'
  ].join('\n');
  const result = loader.prepareTinTinRead(source, {});
  assert.equal(result.ok, true);
  assert.equal(result.routedCommands.length, 2);
  assert.deepEqual(result.routedCommands.map((entry) => entry.directive), ['variable', 'action']);
  assert.equal(result.unsupportedCounts['session-route'], 1);
  assert.equal(result.unsupportedCounts.juki, 1);
});

test('safe routed definitions stage privately into their named sessions without changing profiles', () => {
  const parsed = loader.prepareTinTinRead([
    '#juki #VAR {hp} {10}',
    '#gyatt #ACTION {^HP %1} {#juki #VAR {hp} {%1}}'
  ].join('\n'), {});
  const plan = routes.prepareRoutedDefinitionPlan({
    loader,
    routes: parsed.routedCommands,
    sessions: [session('main', 'Main'), session('juki', 'Juki'), session('gyatt', 'Gyatt')],
    sourceSessionId: 'main'
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.appliedCommands, 2);
  assert.equal(plan.updates.length, 2);
  const juki = plan.updates.find((entry) => entry.sessionId === 'juki');
  const gyatt = plan.updates.find((entry) => entry.sessionId === 'gyatt');
  assert.equal(juki.after.variables[0].name, 'hp');
  assert.equal(juki.after.profile.filename, 'juki.tin');
  assert.equal(gyatt.after.actions.definitions[0].pattern, '^HP %1');
  assert.equal(gyatt.after.profile.filename, 'gyatt.tin');
});

test('routed class context belongs to the receiving session and carries across routed definitions', () => {
  const parsed = loader.prepareTinTinRead([
    '#juki #CLASS {hud} {open}',
    '#juki #VAR {hp} {10}',
    '#juki #ACTION {^HP %1} {score}',
    '#juki #CLASS {hud} {close}'
  ].join('\n'), {});
  const plan = routes.prepareRoutedDefinitionPlan({
    loader,
    routes: parsed.routedCommands,
    sessions: [session('main', 'Main'), session('juki', 'Juki')],
    sourceSessionId: 'main'
  });
  const juki = plan.updates[0].after;
  assert.equal(juki.variables[0].className, 'hud');
  assert.equal(juki.actions.definitions[0].className, 'hud');
});

test('unknown and self-routed targets are skipped instead of mutating the source session', () => {
  const parsed = loader.prepareTinTinRead([
    '#missing #VAR {x} {1}',
    '#main #VAR {y} {2}'
  ].join('\n'), {});
  const plan = routes.prepareRoutedDefinitionPlan({
    loader,
    routes: parsed.routedCommands,
    sessions: [session('main', 'Main')],
    sourceSessionId: 'main'
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.appliedCommands, 0);
  assert.equal(plan.updates.length, 0);
  assert.equal(plan.skipped.length, 2);
  assert.match(plan.skipped[0].reason, /Unknown session/u);
  assert.match(plan.skipped[1].reason, /Self-routed definitions are deferred/u);
});

test('malformed routed definitions reject the file before any route plan exists', () => {
  const result = loader.prepareTinTinRead('#juki #ACTION {broken}', {});
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /Routed juki action/u);
});

test('real jukishowstats routes its supported definitions to the expected character sessions', () => {
  const fixture = path.join(__dirname, 'fixtures', 'jukishowstats-athos.tin');
  assert.equal(fs.existsSync(fixture), true);
  const source = fs.readFileSync(fixture, 'utf8');
  const parsed = loader.prepareTinTinRead(source, {});
  assert.equal(parsed.ok, true);
  assert.ok(parsed.routedCommands.length >= 30);
  const plan = routes.prepareRoutedDefinitionPlan({
    loader,
    routes: parsed.routedCommands,
    sessions: [
      session('main', 'Main'), session('juki', 'Juki'), session('gyatt', 'Gyatt'),
      session('doggo', 'Doggo'), session('sus', 'Sus'), session('oh', 'OH')
    ],
    sourceSessionId: 'main'
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.skipped.length, 0);
  assert.ok(plan.appliedCommands >= 30);
  const juki = plan.updates.find((entry) => entry.sessionId === 'juki');
  const gyatt = plan.updates.find((entry) => entry.sessionId === 'gyatt');
  assert.ok(juki.after.variables.length >= 20);
  assert.ok(juki.after.actions.definitions.length >= 5);
  assert.ok(gyatt.after.actions.definitions.length >= 1);
});


test('Athos-sized Action bodies use the expanded 64-command ceiling while local state updates keep socket weighting bounded', () => {
  const actionSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'action-engine.js'), 'utf8');
  const managerSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'session-manager.js'), 'utf8');
  const loaderSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'tintin-script-loader.js'), 'utf8');
  assert.match(actionSource, /const DEFAULT_MAX_ACTION_COMMANDS = 64;/u);
  assert.match(loaderSource, /'Action command', \{ maxCommands: 64, commandPrefix: commandCharacter, targetCommandPrefix: targetCommandCharacter \}/u);
  assert.match(managerSource, /actionRateWeight\(commandsValue = \[\]\)/u);
  assert.match(managerSource, /\['variable', 'var', 'math', 'format', 'local', 'unlocal'\]/u);
});

test('renderer commits source and routed targets as one rollback-capable settings transaction', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(source, /prepareNamedSessionRouteUpdates\(prepared, sessionId\)/u);
  assert.match(source, /const backups = \[\{ sessionId, definitions: previous \}\]/u);
  assert.match(source, /for \(const update of routePlan\.updates \|\| \[\]\)/u);
  assert.match(source, /await restoreTinTinDefinitionUpdates\(backups\)/u);
  assert.match(source, /await window\.nukefire\.saveSettings\(collectPersistentSettings\(\)\)/u);
});

test('renderer loads the routed-definition helper before renderer.js', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const routeIndex = html.indexOf('../src/tintin-session-routes.js');
  const rendererIndex = html.indexOf('renderer.js');
  assert.ok(routeIndex >= 0);
  assert.ok(rendererIndex > routeIndex);
});
