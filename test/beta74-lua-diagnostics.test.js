'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { LuaDiagnosticsRegistry, normalizeLuaDiagnostic } = require('../src/lua-diagnostics');

const repo = path.join(__dirname, '..');

function read(relative) {
  return fs.readFileSync(path.join(repo, relative), 'utf8');
}

test('Lua diagnostics are bounded, session-isolated, and coalesce repeated failures', () => {
  const diagnostics = new LuaDiagnosticsRegistry({ maxErrors: 8, repeatWindowMs: 5000 });
  const failure = {
    ok: false,
    error: {
      type: 'runtime',
      name: 'Error',
      message: 'NukeFire/alpha/script/main:37: attempt to compare number with nil',
      source: 'NukeFire/alpha/script/main',
      line: 37,
      stack: 'stack one\nstack two'
    }
  };
  diagnostics.noteResult('alpha', failure, { scriptName: 'main', source: 'autorun:restore' });
  diagnostics.noteResult('alpha', failure, { scriptName: 'main', source: 'autorun:restore' });
  assert.equal(diagnostics.list('alpha').length, 1);
  assert.equal(diagnostics.list('alpha')[0].count, 2);
  assert.equal(diagnostics.list('beta').length, 0);
  assert.deepEqual(diagnostics.scriptStatus('alpha', 'main'), {
    status: 'error',
    at: diagnostics.scriptStatus('alpha', 'main').at,
    line: 37,
    message: 'attempt to compare number with nil'
  });

  diagnostics.noteResult('alpha', { ok: true }, { scriptName: 'main', source: 'manual' });
  assert.equal(diagnostics.scriptStatus('alpha', 'main').status, 'ok');
  assert.equal(diagnostics.summary('alpha').failures, 2);
  assert.equal(diagnostics.summary('alpha').successes, 1);
  assert.equal(diagnostics.clear('alpha'), 1);
  assert.equal(diagnostics.summary('alpha').errorsRetained, 0);
  assert.equal(diagnostics.scriptStatus('alpha', 'main').status, 'ok');
});

test('Lua diagnostic normalization preserves managed source and line while cleaning the message', () => {
  const normalized = normalizeLuaDiagnostic({
    ok: false,
    error: {
      type: 'syntax',
      message: 'NukeFire/alpha/script/combat:12: unexpected symbol near end',
      source: 'NukeFire/alpha/script/combat',
      line: 12,
      stack: 'trace'
    }
  }, { source: 'autorun:restore' });
  assert.equal(normalized.scriptName, 'combat');
  assert.equal(normalized.line, 12);
  assert.equal(normalized.message, 'unexpected symbol near end');
});

test('diagnostics commands and saved-script source labels stay on the protected Lua path', () => {
  const main = read('main.js');
  const worker = read('src/lua-runtime-worker.js');
  const service = read('src/lua-lab-service.js');
  const renderer = read('renderer/renderer.js');
  const help = read('src/client-command-help.js');

  assert.match(main, /handleLuaDiagnosticsCoordinatorCommand/u);
  assert.match(main, /\['status', 'errors', 'reload'\]/u);
  assert.match(main, /luaDiagnostics\.noteResult/u);
  assert.match(main, /luaDiagnostics\.clearSession/u);
  assert.match(main, /ensureLuaLabService\(\)\.describeSession/u);
  assert.match(worker, /normalizeChunkName\(options\.chunkName, sessionId, 'command'\)/u);
  assert.match(worker, /source: location\.source/u);
  assert.match(service, /chunkName: luaChunkName\(executionContext\)/u);
  assert.match(service, /async describeSession\(sessionIdValue\)/u);
  assert.match(renderer, /Lua Error — \$\{location\}/u);
  assert.match(renderer, /ERROR\$\{Number\(entry\.errorLine\)/u);
  assert.match(help, /LUA ERRORS \[count\]/u);
  assert.match(help, /LUA RELOAD/u);

  assert.doesNotMatch(main, /io\.open|os\.execute|setHTML|innerHTML\s*=.*lua/iu);
  assert.doesNotMatch(worker, /function\s+gag\s*\(/u);
});
