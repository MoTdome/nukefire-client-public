'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  ScriptStore,
  normalizeScriptRequest,
  candidateNames
} = require('../src/script-store');

async function fixture(options = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nukefire-scripts-'));
  const store = new ScriptStore({ documentsDirectory: directory, ...options });
  await store.ensureDirectory();
  return { directory, store, scripts: store.directory };
}

test('normalizes safe extensionless and .tin script names while rejecting paths', () => {
  assert.equal(normalizeScriptRequest(' Prime '), 'Prime');
  assert.equal(normalizeScriptRequest('prime.tin'), 'prime.tin');
  assert.deepEqual(candidateNames('Prime'), ['Prime', 'Prime.tin']);
  assert.deepEqual(candidateNames('prime.tin'), ['prime.tin']);
  assert.equal(normalizeScriptRequest('../Prime.tin'), '');
  assert.equal(normalizeScriptRequest('folder/Prime.tin'), '');
  assert.equal(normalizeScriptRequest('Prime.js'), '');
});

test('creates a visible Scripts folder and resolves extensionless names case-insensitively', async () => {
  const { store, scripts } = await fixture();
  await fs.writeFile(path.join(scripts, 'Prime.tin'), '#alias {k} {kill %1}\n', 'utf8');
  const result = await store.read('prime');
  assert.equal(result.ok, true);
  assert.equal(result.filename, 'Prime.tin');
  assert.match(result.content, /#alias/u);
  assert.match(result.info.directory, /NukeFire Client[\\/]Scripts$/u);
});

test('a blank read request reports folder information and available files', async () => {
  const { store, scripts } = await fixture();
  await fs.writeFile(path.join(scripts, 'Prime.tin'), '#nop hello', 'utf8');
  const result = await store.read('');
  assert.equal(result.ok, true);
  assert.equal(result.mode, 'info');
  assert.deepEqual(result.files, ['Prime.tin']);
});

test('rejects symlinks, invalid UTF-8, and oversized scripts', async () => {
  const { store, scripts } = await fixture({ maxBytes: 16 });
  await fs.writeFile(path.join(scripts, 'large.tin'), 'x'.repeat(17), 'utf8');
  assert.equal((await store.read('large')).ok, false);

  await fs.writeFile(path.join(scripts, 'bad.tin'), Buffer.from([0xff, 0xfe]));
  const bad = await store.read('bad');
  assert.equal(bad.ok, false);
  assert.match(bad.error, /UTF-8/u);

  await fs.writeFile(path.join(scripts, 'real.tin'), '#nop ok', 'utf8');
  try {
    await fs.symlink(path.join(scripts, 'real.tin'), path.join(scripts, 'link.tin'));
    const linked = await store.read('link');
    assert.equal(linked.ok, false);
  } catch (error) {
    if (!['EPERM', 'EACCES'].includes(error?.code)) throw error;
  }
});

test('writes extensionless names as .tin and replaces regular files atomically', async () => {
  const { store, scripts } = await fixture();
  let result = await store.write('Prime', '#alias {k} {kill %1}\n');
  assert.equal(result.ok, true);
  assert.equal(result.filename, 'Prime.tin');
  assert.equal(result.replaced, false);
  assert.equal(await fs.readFile(path.join(scripts, 'Prime.tin'), 'utf8'), '#alias {k} {kill %1}\n');

  result = await store.write('prime', '#alias {k} {bash %1}\n');
  assert.equal(result.ok, true);
  assert.equal(result.filename, 'Prime.tin');
  assert.equal(result.replaced, true);
  assert.equal(await fs.readFile(path.join(scripts, 'Prime.tin'), 'utf8'), '#alias {k} {bash %1}\n');
  assert.deepEqual((await fs.readdir(scripts)).filter((name) => name.endsWith('.tmp')), []);
});

test('write refuses unsafe names, oversized content, and nonregular targets', async () => {
  const { store, scripts } = await fixture({ maxWriteBytes: 16 });
  assert.equal((await store.write('../Prime', '#nop no')).ok, false);
  assert.equal((await store.write('Prime.js', '#nop no')).ok, false);
  assert.equal((await store.write('large', 'x'.repeat(17))).ok, false);
  assert.equal((await store.write('empty', '')).ok, false);

  await fs.mkdir(path.join(scripts, 'Folder.tin'));
  const folder = await store.write('Folder.tin', '#nop no');
  assert.equal(folder.ok, false);
  assert.match(folder.error, /regular script file/u);

  await fs.writeFile(path.join(scripts, 'real.tin'), '#nop ok', 'utf8');
  try {
    await fs.symlink(path.join(scripts, 'real.tin'), path.join(scripts, 'link.tin'));
    const linked = await store.write('link.tin', '#nop replaced');
    assert.equal(linked.ok, false);
  } catch (error) {
    if (!['EPERM', 'EACCES'].includes(error?.code)) throw error;
  }
});


test('validates native editor selections as direct regular files inside Scripts', async () => {
  const { store, scripts, directory } = await fixture();
  const prime = path.join(scripts, 'Prime.tin');
  await fs.writeFile(prime, '#alias {k} {kill %1}\n', 'utf8');

  const accepted = await store.resolveSelectedPath(prime);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.filename, 'Prime.tin');

  const outside = path.join(directory, 'Outside.tin');
  await fs.writeFile(outside, '#nop no', 'utf8');
  const escaped = await store.resolveSelectedPath(outside);
  assert.equal(escaped.ok, false);
  assert.match(escaped.error, /directly inside/u);

  const nested = path.join(scripts, 'Nested');
  await fs.mkdir(nested);
  const nestedFile = path.join(nested, 'Nested.tin');
  await fs.writeFile(nestedFile, '#nop no', 'utf8');
  assert.equal((await store.resolveSelectedPath(nestedFile)).ok, false);

  try {
    const link = path.join(scripts, 'Link.tin');
    await fs.symlink(prime, link);
    const linked = await store.resolveSelectedPath(link);
    assert.equal(linked.ok, false);
    assert.match(linked.error, /regular script file/u);
  } catch (error) {
    if (!['EPERM', 'EACCES'].includes(error?.code)) throw error;
  }
});
