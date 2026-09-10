'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');
const {
  inspectArchiveBuffer,
  MAX_ARCHIVE_ENTRIES,
  MAX_MANIFEST_BYTES,
  MAX_CUSTOM_EVENTS
} = require('../src/soundpack-store');
const { normalizeSettings } = require('../src/settings-store');

const root = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

test('Personal Sounds supports 2,500 distinct custom audio allocations in one bounded .nfsp', () => {
  assert.equal(MAX_CUSTOM_EVENTS, 2500);
  assert.equal(MAX_ARCHIVE_ENTRIES, 4096);
  assert.equal(MAX_MANIFEST_BYTES, 1024 * 1024);

  const archive = new AdmZip();
  const events = {};
  for (let index = 0; index < MAX_CUSTOM_EVENTS; index += 1) {
    const filename = `sounds/custom-slot-${index}.wav`;
    events[`custom.slot-${index}`] = { files: [filename] };
    archive.addFile(filename, Buffer.from([index % 256]));
  }
  archive.addFile('manifest.json', Buffer.from(`${JSON.stringify({
    schema: 1,
    id: 'personal-sounds',
    name: 'Personal Sounds',
    author: 'Player',
    version: '1.0.0',
    events
  }, null, 2)}\n`, 'utf8'));

  const inspected = inspectArchiveBuffer(archive.toBuffer());
  assert.equal(Object.keys(inspected.manifest.events).length, 2500);
  assert.equal(inspected.byName.size, 2501);
});

test('per-event enable preferences retain 2,500 sound allocations across settings and profiles', () => {
  const disabled = Array.from({ length: 2501 }, (_value, index) => `custom.slot-${index}`);
  const settings = normalizeSettings({ accessibility: { soundpackDisabledEvents: disabled } });
  assert.equal(settings.accessibility.soundpackDisabledEvents.length, 2500);
  assert.equal(settings.accessibility.soundpackDisabledEvents.at(-1), 'custom.slot-2499');

  const renderer = source('renderer/renderer.js');
  assert.match(renderer, /const MAX_SOUNDPACK_EVENT_PREFERENCES = 2500;/u);
  assert.match(renderer, /result\.length >= MAX_SOUNDPACK_EVENT_PREFERENCES/u);
  assert.match(renderer, /soundpackDisabledEvents:[^\n]*slice\(0, MAX_SOUNDPACK_EVENT_PREFERENCES\)/u);
});

test('server client-control counts are not used as a sound-allocation ceiling', () => {
  const soundpack = source('src/soundpack-store.js');
  assert.doesNotMatch(soundpack, /MAX_CUSTOM_EVENTS = (?:65|75)/u);
});
