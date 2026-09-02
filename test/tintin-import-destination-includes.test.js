'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loader = require('../src/tintin-script-loader');

function emptyDefinitions() {
  return {
    aliases: [], variables: [], functions: [], actions: [], gags: [], highlights: [],
    substitutes: [], macros: [], events: [],
    classes: { definitions: [], activeStack: [] }, settings: {}
  };
}

test('root-only TinTin validation accepts a valid destination even when an include is unavailable', async () => {
  const source = '#read {missing-module.tin}\n#alias {x} {look}\n';
  const root = loader.prepareTinTinRead(source, emptyDefinitions(), {
    filename: 'testmain.tin', commandPrefix: '#'
  });
  assert.equal(root.ok, true);
  assert.equal(root.counts.aliases, 1);
  assert.deepEqual(root.scriptIncludes.map((entry) => entry.requested), ['missing-module.tin']);

  const tree = await loader.prepareTinTinReadTree(source, emptyDefinitions(), {
    filename: 'testmain.tin', commandPrefix: '#',
    readFile: async () => ({ ok: false, error: 'No script named missing-module.tin was found.' })
  });
  assert.equal(tree.ok, false);
  assert.match(tree.errors.join(' '), /missing-module\.tin/u);
});

test('destination save validates the root before writing and treats include-tree failure as a post-save warning', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  assert.match(renderer, /function prepareTinTinRootScript\(/u);
  assert.match(renderer, /const preflight = prepareTinTinRootScript\([\s\S]*?writeTinTinScript\(actualFilename, finalContent\)/u);
  assert.match(renderer, /const verifiedRoot = prepareTinTinRootScript\(/u);
  assert.match(renderer, /const verifiedTree = await prepareTinTinScriptLoad\(/u);
  assert.match(renderer, /Included script tree is not ready yet:/u);
  assert.match(renderer, /The destination file itself was saved and kept\./u);
  assert.match(renderer, /current character was not changed because the included script tree is not ready/u);
  assert.match(renderer, /Startup selection was not changed because the included script tree is not ready/u);
});
