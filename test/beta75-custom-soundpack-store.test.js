'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  normalizeManifest,
  isCustomSoundpackEvent,
  isSupportedSoundpackEvent,
  soundpackCueId,
  soundpackEventMetadata,
  MAX_CUSTOM_EVENTS,
  SoundpackStore
} = require('../src/soundpack-store');

function customManifest(events) {
  return { schema: 1, id: 'personal-sounds', name: 'Personal Sounds', author: 'Player', version: '1.0.0', events };
}

test('custom.* events are first-class bounded soundpack manifest entries', () => {
  const manifest = normalizeManifest(customManifest({
    'custom.stairs': { files: ['sounds/custom-stairs.wav'], selection: 'random', volume: 0.8, cooldown_ms: 250 }
  }));
  assert.deepEqual(manifest.events['custom.stairs'], {
    files: ['sounds/custom-stairs.wav'], selection: 'random', volume: 0.8, cooldown_ms: 250
  });
  assert.equal(isCustomSoundpackEvent('custom.stairs'), true);
  assert.equal(isSupportedSoundpackEvent('custom.stairs'), true);
  assert.equal(soundpackCueId('custom.stairs'), 'custom.stairs');
  assert.equal(soundpackEventMetadata('custom.stairs').source, 'player');
});
test('player event namespace is explicit and custom event count stays bounded', () => {
  assert.equal(isCustomSoundpackEvent('stairs'), false);
  assert.equal(isCustomSoundpackEvent('custom.Bad Name'), false);
  assert.throws(() => normalizeManifest(customManifest({
    'player.stairs': { files: ['sounds/stairs.wav'] }
  })), /custom\.<name>/u);

  const events = {};
  for (let index = 0; index < MAX_CUSTOM_EVENTS + 1; index += 1) {
    events[`custom.slot-${index}`] = { files: [`sounds/slot-${index}.wav`] };
  }
  assert.throws(() => normalizeManifest(customManifest(events)), /at most 2500 custom\.\* events/u);
});


test('assigned custom audio is copied into the .nfsp and survives source-file removal', async (t) => {
  const AdmZip = require('adm-zip');
  if (typeof AdmZip?.prototype?.addFile !== 'function') {
    t.skip('Local assistant stub does not implement archive I/O; the real repository runs this with adm-zip.');
    return;
  }
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nf-custom-sound-'));
  try {
    const source = path.join(root, 'stairs.wav');
    await fs.writeFile(source, Buffer.from('RIFF-nukefire-test-audio'));
    const store = new SoundpackStore({ directory: path.join(root, 'Soundpacks') });
    await store.duplicate('builtin', 'personal-sounds', { name: 'Personal Sounds', author: 'Player' });
    await store.assignEvent('personal-sounds', 'custom.stairs', source, { volume: 0.7, cooldown_ms: 250 });
    await fs.unlink(source);

    const loaded = await store.readPack('personal-sounds', true);
    assert.equal(loaded.pack.events['custom.stairs'].volume, 0.7);
    assert.equal(loaded.pack.events['custom.stairs'].cooldown_ms, 250);
    assert.match(loaded.assets['custom.stairs'].sources[0], /^data:audio\/wav;base64,/u);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
