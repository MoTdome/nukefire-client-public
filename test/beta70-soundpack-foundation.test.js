'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const AdmZip = require('adm-zip');
const soundpacks = require('../src/soundpack-store');
const audioCues = require('../src/audio-cues');

const root = path.resolve(__dirname, '..');

function archive(manifest, files = {}) {
  const zip = new AdmZip();
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)));
  for (const [name, data] of Object.entries(files)) zip.addFile(name, Buffer.from(data));
  return zip.toBuffer();
}

const validManifest = {
  schema: 1,
  id: 'nukefire.test-pack',
  name: 'Test Pack',
  author: 'NukeFire',
  version: '1.0.0',
  events: {
    'combat.outgoing.hit': 'sounds/hit.ogg',
    'communication.tell': 'sounds/tell.mp3'
  }
};

test('soundpack manifest exposes only the stable bounded semantic event vocabulary', () => {
  const manifest = soundpacks.normalizeManifest(validManifest);
  assert.equal(manifest.id, 'nukefire.test-pack');
  assert.equal(soundpacks.SOUNDPACK_EVENTS['combat.outgoing.hit'], 'hit');
  assert.equal(soundpacks.SOUNDPACK_EVENTS['communication.tell'], 'tell');
  assert.throws(() => soundpacks.normalizeManifest({ ...validManifest, events: { 'server.command': 'hack.mp3' } }), /Unsupported soundpack event/u);
  assert.throws(() => soundpacks.normalizeManifest({ ...validManifest, events: { 'combat.outgoing.hit': '../hit.mp3' } }), /must reference/u);
});

test('soundpack archive rejects traversal, missing audio, unsupported files, and oversized assets', () => {
  assert.throws(() => soundpacks.inspectArchiveBuffer(archive(validManifest)), /missing file/u);
  const badType = { ...validManifest, events: { 'combat.outgoing.hit': 'sounds/hit.exe' } };
  assert.throws(() => soundpacks.inspectArchiveBuffer(archive(badType, { 'sounds/hit.exe': 'x' })), /WAV, MP3, OGG, or M4A/u);
  const huge = Buffer.alloc(8 * 1024 * 1024 + 1, 1);
  assert.throws(() => soundpacks.inspectArchiveBuffer(archive({ ...validManifest, events: { 'combat.outgoing.hit': 'hit.wav' } }, { 'hit.wav': huge })), /between 1 byte and 8 MB/u);
});

test('soundpack store installs atomically and returns only validated audio data URLs', async (t) => {
  const directory = await fsp.mkdtemp(path.join(os.tmpdir(), 'nukefire-soundpacks-'));
  t.after(() => fsp.rm(directory, { recursive: true, force: true }));
  const selected = path.join(directory, 'selected.zip');
  await fsp.writeFile(selected, archive(validManifest, {
    'sounds/hit.ogg': 'OggS-test',
    'sounds/tell.mp3': 'ID3-test'
  }));
  const store = new soundpacks.SoundpackStore({ directory: path.join(directory, 'installed') });
  const imported = await store.importArchive(selected);
  assert.equal(imported.pack.name, 'Test Pack');
  await store.importArchive(selected);
  assert.equal((await store.list()).packs.length, 1);
  const loaded = await store.readPack('nukefire.test-pack', true);
  assert.match(loaded.assets.hit.sources[0], /^data:audio\/ogg;base64,/u);
  assert.match(loaded.assets.tell.sources[0], /^data:audio\/mpeg;base64,/u);
  assert.deepEqual(Object.keys(loaded.assets).sort(), ['hit', 'tell']);
});

test('custom pack audio replaces a cue while missing cues retain built-in synthesis', () => {
  const played = [];
  class FakeAudio {
    constructor(source) { this.source = source; this.volume = 1; }
    addEventListener() {}
    play() { played.push(this.source); return Promise.resolve(); }
    pause() {}
  }
  const controller = new audioCues.AudioCueController({
    contextFactory: () => null,
    enabled: true
  });
  const previousAudio = globalThis.Audio;
  globalThis.Audio = FakeAudio;
  try {
    controller.setSoundpack({ name: 'Test Pack' }, { hit: 'data:audio/ogg;base64,T2dnUw==' });
    assert.equal(controller.soundpackName, 'Test Pack');
    assert.equal(controller.play('hit'), true);
    assert.equal(played.length, 1);
    assert.equal(controller.play('miss'), false);
    controller.stopAll();
  } finally {
    globalThis.Audio = previousAudio;
  }
});

test('Electron and Preferences expose a bounded local soundpack workflow', () => {
  const main = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  const preload = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  assert.match(main, /ipcMain\.handle\('soundpacks:import'/u);
  assert.match(main, /extensions: \['nfsp', 'zip'\]/u);
  assert.match(preload, /importSoundpack: \(\) => ipcRenderer\.invoke\('soundpacks:import'\)/u);
  assert.match(renderer, /async function activateSoundpack\(id, options = \{\}\)/u);
  assert.match(renderer, /commandInput\.setSelectionRange\(selectionStart, selectionEnd, selectionDirection \|\| 'none'\)/u);
  assert.match(html, /Packs replace sounds only; they cannot run commands, scripts, or triggers\./u);
  assert.match(html, /Missing sounds always use the built-in NukeFire cue\./u);
});
