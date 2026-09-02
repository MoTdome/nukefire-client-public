'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { SoundpackStore, normalizeManifest } = require('../src/soundpack-store');
const { AudioCueController, semanticCueForEvent } = require('../src/audio-cues');

const root = path.resolve(__dirname, '..');

test('schema 1 accepts legacy filenames and bounded richer event options', () => {
  const legacy = normalizeManifest({ schema: 1, id: 'legacy', name: 'Legacy', events: { 'door.open': 'open.ogg' } });
  assert.deepEqual(legacy.events['door.open'], { files: ['open.ogg'], selection: 'random', volume: 1, cooldown_ms: 0 });
  const rich = normalizeManifest({ schema: 1, id: 'rich', name: 'Rich', events: { 'door.open': { files: ['a.wav', 'b.wav'], selection: 'sequential', volume: 0.4, cooldown_ms: 250 } } });
  assert.equal(rich.events['door.open'].files.length, 2);
  assert.equal(rich.events['door.open'].selection, 'sequential');
  assert.equal(rich.events['door.open'].volume, 0.4);
  assert.equal(rich.events['door.open'].cooldown_ms, 250);
  assert.throws(() => normalizeManifest({ schema: 1, id: 'bad', name: 'Bad', events: { 'door.open': { files: Array(9).fill('a.wav') } } }), /1 through 8/u);
});

test('player authoring duplicates builtin, assigns, tunes, clears, and exports atomically', async (t) => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'nukefire-authoring-'));
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  const store = new SoundpackStore({ directory: path.join(directory, 'packs') });
  const created = await store.duplicate('builtin', 'player.test', { name: 'Player Test', author: 'Tester' });
  assert.equal(Object.keys(created.pack.events).length, 0);
  const audio = path.join(directory, 'door.wav');
  await fsp.writeFile(audio, Buffer.from('RIFF-bounded-test'));
  await store.assignEvent('player.test', 'door.open', audio, { volume: 0.75, cooldown_ms: 125 });
  let loaded = await store.readPack('player.test', true);
  assert.equal(loaded.pack.events['door.open'].volume, 0.75);
  assert.equal(loaded.pack.events['door.open'].cooldown_ms, 125);
  assert.match(loaded.assets['door-open'].sources[0], /^data:audio\/wav;base64,/u);
  await store.updateEventOptions('player.test', 'door.open', { volume: 0.5, cooldown_ms: 500 });
  loaded = await store.readPack('player.test', false);
  assert.equal(loaded.pack.events['door.open'].volume, 0.5);
  const destination = path.join(directory, 'export.nfsp');
  await store.exportPack('player.test', destination);
  assert.ok((await fsp.stat(destination)).size > 0);
  await store.clearEvent('player.test', 'door.open');
  assert.equal(Object.keys((await store.readPack('player.test', false)).pack.events).length, 0);
});

test('custom cue playback honors per-event volume, cooldown, and sequential variations', () => {
  const played = [];
  class FakeAudio {
    constructor(source) { this.source = source; this.volume = 1; }
    addEventListener() {}
    play() { played.push([this.source, this.volume]); return Promise.resolve(); }
    pause() {}
  }
  const previous = globalThis.Audio;
  globalThis.Audio = FakeAudio;
  try {
    const controller = new AudioCueController({ contextFactory: () => null, enabled: true, volume: 0.8 });
    controller.setSoundpack({ name: 'Rich' }, { 'door-open': { sources: ['data:audio/wav;base64,QQ==', 'data:audio/wav;base64,Qg=='], selection: 'sequential', volume: 0.5, cooldown_ms: 1000 } });
    assert.equal(controller.play('door-open'), true);
    assert.equal(controller.play('door-open'), false);
    assert.deepEqual(played, [['data:audio/wav;base64,QQ==', 0.4]]);
  } finally { globalThis.Audio = previous; }
});

test('Preferences and preload expose keyboard-accessible bounded authoring without command execution', () => {
  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  assert.match(html, /<summary>Soundpack Editor<\/summary>/u);
  assert.match(html, /id="soundpack-editor-assign"/u);
  assert.match(preload, /assignSoundpackEvent:/u);
  assert.match(main, /ipcMain\.handle\('soundpacks:assign-event'/u);
  assert.match(renderer, /withCommandDraftPreserved/u);
  const soundpackIpc = main.slice(main.indexOf("ipcMain.handle('soundpacks:events'"), main.indexOf("ipcMain.handle('map:load'"));
  assert.doesNotMatch(soundpackIpc, /mud:send|child_process|shell:/u);
});

test('renderer CSP permits only local and imported data audio for soundpacks', () => {
  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const policy = html.match(/Content-Security-Policy" content="([^"]+)"/u)?.[1] || '';
  assert.match(policy, /media-src 'self' data:/u);
  assert.doesNotMatch(policy, /media-src[^;]*(?:https?:|blob:|\*)/u);
});

test('initial gameplay catalog accepts and maps only bounded schema-1 semantic events', () => {
  const expected = {
    'object.get': 'object-get', 'object.retrieve': 'object-retrieve',
    'object.put': 'object-put', 'object.drop': 'object-drop', 'object.give': 'object-give',
    'equipment.equip': 'equipment-equip', 'equipment.remove': 'equipment-remove',
    'shop.buy': 'shop-buy', 'shop.sell': 'shop-sell',
    'shop.insufficient-funds': 'shop-insufficient-funds',
    'ammunition.reload': 'ammunition-reload', 'ammunition.empty': 'ammunition-empty',
    'quest.accepted': 'quest-accepted', 'quest.advanced': 'quest-advanced',
    'quest.completed': 'quest-completed'
  };
  for (const [event, cue] of Object.entries(expected)) {
    const manifest = normalizeManifest({ schema: 1, id: 'catalog', name: 'Catalog', events: { [event]: 'cue.wav' } });
    assert.ok(manifest.events[event]);
    assert.equal(semanticCueForEvent('NukeFire.Sound.Event', { schema: 1, event }), cue);
  }
  assert.equal(semanticCueForEvent('NukeFire.Sound.Event', { schema: 2, event: 'object.get' }), '');
  assert.equal(semanticCueForEvent('NukeFire.Sound.Event', { schema: 1, event: 'object.delete' }), '');
});

test('frequent built-in mutation cues debounce independently', () => {
  const parameter = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
  const context = {
    currentTime: 0, state: 'running', destination: {},
    createOscillator() { return { frequency: parameter, connect() {}, disconnect() {}, start() {}, stop() {}, onended: null }; },
    createGain() { return { gain: parameter, connect() {}, disconnect() {} }; }
  };
  const controller = new AudioCueController({ contextFactory: () => context, enabled: true });
  assert.equal(controller.play('object-get'), true);
  assert.equal(controller.play('object-get'), false);
  assert.equal(controller.play('object-put'), true);
});
