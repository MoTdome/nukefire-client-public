'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const sessionManager = source('src/session-manager.js');
const renderer = source('renderer/renderer.js');
const help = source('src/client-command-help.js');
const soundpackStoreSource = source('src/soundpack-store.js');

function blockBetween(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  assert.ok(start >= 0, `missing start: ${startNeedle}`);
  assert.ok(end > start, `missing end: ${endNeedle}`);
  return text.slice(start, end);
}

test('#SOUND ADD/ASSIGN/CLEAR/DELETE are bounded direct-player soundpack operations', () => {
  assert.match(sessionManager, /\['add', 'assign', 'clear', 'delete'\]\.includes\(operation\)/u);
  assert.match(sessionManager, /this\.emit\(source\.id, 'soundpack-edit-request', \{ operation, event, interactive: true \}\)/u);
  assert.match(sessionManager, /\(operation === 'add' \|\| operation === 'delete'\) && !event\.startsWith\('custom\.'\)/u);
  assert.match(sessionManager, /SOUND \$\{operation\.toUpperCase\(\)\} is only for player-created custom\.\* event names/u);
  assert.doesNotMatch(sessionManager, /soundpack-edit-request[\s\S]{0,280}(?:filepath|filePath|filename|URL|AudioContext|new Audio)/u);
});

test('#SOUND TEST is a synonym for the existing managed playback route', () => {
  const block = blockBetween(sessionManager, "} else if (operation === 'test') {", "} else if (['add', 'assign', 'clear', 'delete'].includes(operation)) {");
  assert.match(block, /this\.emit\(source\.id, 'soundpack-event-request'/u);
  assert.match(block, /reportSuccess: interactive/u);
  assert.doesNotMatch(block, /assignSoundpackEvent|clearSoundpackEvent|filepath|AudioContext/u);
});

test('LIST/SEARCH/SHOW compatibility shapes remain layered beside the new edit commands', () => {
  assert.ok(sessionManager.includes("!interactive && ['list', 'search', 'show'].includes(operation)"));
  assert.match(sessionManager, /operation === 'list'[\s\S]*operation === 'search'[\s\S]*operation === 'show'/u);
  assert.match(help, /LIST\/SEARCH\/SHOW are interactive discovery commands and do not produce automation chatter/u);
  assert.match(help, /sound \{add\} \{custom\.name\}/u);
  assert.match(help, /sound \{assign\} \{custom\.name\}/u);
  assert.match(help, /sound \{clear\} \{custom\.name\}/u);
  assert.match(help, /sound \{delete\} \{custom\.name\}/u);
});

test('command-line assignment reuses the protected editor bridge and restores command focus', () => {
  const shared = blockBetween(renderer, 'async function assignSoundpackEventAudio', 'async function clearSoundpackEventAudio');
  assert.match(shared, /window\.nukefire\.assignSoundpackEvent\(\{[\s\S]*?id,[\s\S]*?event,[\s\S]*?volume:[\s\S]*?cooldown_ms:/u);
  assert.doesNotMatch(shared, /filepath|filePath|filename|dialog\.showOpenDialog|AudioContext|new Audio/u);
  assert.match(shared, /options\.focusCommand === true[\s\S]*focusCommand\(\{ preserveSelection: true \}\)/u);

  const editor = blockBetween(renderer, 'async function assignSelectedSoundpackEvent', 'async function updateSelectedSoundpackEvent');
  assert.match(editor, /assignSoundpackEventAudio\(/u);
  assert.doesNotMatch(editor, /assignSoundpackEvent\(/u);

  // The established Beta.70 soundpack-authoring regression suite remains in the
  // installer preflight and verifies this bridge terminates in Electron's protected
  // open-file dialog. This test ensures the new CLI never introduces a path surface.
  assert.doesNotMatch(sessionManager, /soundpack-edit-request[\s\S]{0,320}(?:path|filepath|filePath|filename)/u);
});

test('ADD reuses the existing Personal Sounds auto-create path and works without Reader state', () => {
  const editable = blockBetween(renderer, 'async function ensureEditableSoundpackForCustomEvent', 'function ensureCustomSoundpackCatalogRecord');
  assert.match(editable, /'personal-sounds'/u);
  assert.match(editable, /window\.nukefire\.duplicateSoundpack\(\{[\s\S]*sourceId: 'builtin'/u);
  assert.match(editable, /window\.nukefire\.listSoundpacks/u);
  const command = blockBetween(renderer, 'async function handleTinTinSoundpackEditRequest', 'function handleTinTinSoundpackControlRequest');
  assert.match(command, /ensureEditableSoundpackForCustomEvent\(\)/u);
  assert.match(command, /ensureCustomSoundpackCatalogRecord\(event\)/u);
  assert.match(command, /assignSoundpackEventAudio\(packId, event/u);
  assert.doesNotMatch(command, /screenReaderMode|readerWorkspace|selfVoiceEnabled|Self-Voice.*required/u);
});

test('picker cancellation leaves the event valid and reports whether an assignment already existed', () => {
  const command = blockBetween(renderer, 'async function handleTinTinSoundpackEditRequest', 'function handleTinTinSoundpackControlRequest');
  assert.match(command, /if \(result\.canceled\)/u);
  assert.match(command, /Audio selection cancelled\. \$\{event\} was not changed/u);
  assert.match(command, /Audio selection cancelled\. \$\{event\} remains unassigned/u);
  assert.match(renderer, /ensureCustomSoundpackCatalogRecord\(event\);[\s\S]*soundpackEventAssignmentSnapshot/u);
});

test('manual SOUND results use the forced Reader announcement path while Action playback stays quiet', () => {
  const reporter = blockBetween(renderer, 'function reportInteractiveSoundMessage', 'async function handleTinTinSoundpackEditRequest');
  assert.match(reporter, /appendSystemMessage\(text/u);
  assert.match(reporter, /announce\(text, \{ force: true/u);

  const playback = blockBetween(renderer, 'function handleTinTinSoundpackEventRequest', 'const TINTIN_SOUND_QUERY_MAX_RESULTS');
  assert.match(playback, /payload\?\.interactive === true && active/u);
  assert.match(playback, /reportInteractiveSoundMessage\(`Sound \$\{event\} blocked: \$\{result\.reason\}`/u);
  assert.match(playback, /interrupt: true/u);

  const edits = blockBetween(renderer, 'async function handleTinTinSoundpackEditRequest', 'function handleTinTinSoundpackControlRequest');
  assert.match(edits, /reportInteractiveSoundMessage\(before\.assigned/u);
  assert.match(edits, /reportInteractiveSoundMessage\(label\)/u);

  const query = blockBetween(renderer, 'async function handleTinTinSoundpackQuery', 'function handleSessionEvent');
  assert.match(query, /announce\(`\$\{statusMessage\} \$\{customMessage\}`, \{ force: true \}\)/u);
  assert.match(query, /reportInteractiveSoundMessage\(`Sound \$\{event\}:/u);
});

test('CLEAR and DELETE reuse the shared store operation while DELETE stays custom-only', () => {
  const command = blockBetween(renderer, 'async function handleTinTinSoundpackEditRequest', 'function handleTinTinSoundpackControlRequest');
  assert.match(command, /clearSoundpackEventAudio\(activePackId, event/u);
  assert.match(command, /operation === 'delete'/u);
  assert.match(sessionManager, /SOUND \$\{operation\.toUpperCase\(\)\} is only for player-created custom\.\* event names/u);
  assert.match(command, /soundpackDisabledEvents\.filter/u);
  assert.match(command, /soundpackEvents = state\.accessibility\.soundpackEvents\.filter/u);
  assert.doesNotMatch(command, /rmSync|unlinkSync|fs\.|shell\.|child_process/u);
});

test('SHOW reports assignment volume and cooldown without exposing paths', () => {
  const query = blockBetween(renderer, "if (operation === 'show') {", 'return false;\n}');
  assert.match(query, /volume \$\{Math\.round/u);
  assert.match(query, /cooldown \$\{Math\.max/u);
  assert.doesNotMatch(query, /filePaths|filepath|absolute path|archivePath/u);
});

test('Soundpack Store preserves assets still referenced by another event on CLEAR and ASSIGN', async (t) => {
  let storeApi;
  try {
    storeApi = require('../src/soundpack-store');
  } catch (error) {
    if (/adm-zip/u.test(String(error?.message || error))) {
      t.skip('adm-zip is unavailable in this assistant scratch environment; the real repository provides it.');
      return;
    }
    throw error;
  }
  const AdmZip = require('adm-zip');
  if (typeof AdmZip?.prototype?.addFile !== 'function') {
    t.skip('Archive I/O is unavailable in this environment.');
    return;
  }

  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'nf-command-sound-'));
  try {
    const store = new storeApi.SoundpackStore({ directory: path.join(tmp, 'Soundpacks') });
    const shared = 'sounds/shared.wav';
    const manifest = {
      schema: 1,
      id: 'personal-sounds',
      name: 'Personal Sounds',
      author: 'Player',
      version: '1.0.0',
      events: {
        'custom.one': { files: [shared], volume: 1, cooldown_ms: 0 },
        'custom.two': { files: [shared], volume: 0.5, cooldown_ms: 10 }
      }
    };
    await store.writePack(manifest, new Map([[shared, Buffer.from('RIFF-shared-original')]]));

    await store.clearEvent('personal-sounds', 'custom.one');
    let loaded = await store.readPack('personal-sounds', true);
    assert.equal(loaded.pack.events['custom.one'], undefined);
    assert.ok(loaded.pack.events['custom.two']);
    assert.match(loaded.assets['custom.two'].sources[0], /^data:audio\/wav;base64,/u);

    // Recreate a shared assignment, then replace only custom.one. custom.two must
    // keep the original shared bytes rather than being overwritten or orphaned.
    await store.writePack(manifest, new Map([[shared, Buffer.from('RIFF-shared-original')]]));
    const replacement = path.join(tmp, 'replacement.wav');
    await fsp.writeFile(replacement, Buffer.from('RIFF-replacement'));
    await store.assignEvent('personal-sounds', 'custom.one', replacement, { volume: 0.8, cooldown_ms: 20 });
    loaded = await store.readPack('personal-sounds', true);
    assert.ok(loaded.pack.events['custom.one']);
    assert.ok(loaded.pack.events['custom.two']);
    assert.notEqual(loaded.pack.events['custom.one'].files[0], loaded.pack.events['custom.two'].files[0]);
    const twoData = Buffer.from(loaded.assets['custom.two'].sources[0].split(',')[1], 'base64').toString('utf8');
    assert.equal(twoData, 'RIFF-shared-original');
  } finally {
    await fsp.rm(tmp, { recursive: true, force: true });
  }
});

test('store-level shared-file guards are used by both assign and clear operations', () => {
  assert.match(soundpackStoreSource, /function soundpackFilesReferencedByOtherEvents/u);
  assert.match(soundpackStoreSource, /function soundpackAssignedFilename/u);
  assert.match(soundpackStoreSource, /if \(!referencedElsewhere\.has\(oldFilename\)\) editable\.files\.delete\(oldFilename\)/u);
  assert.match(soundpackStoreSource, /if \(!referencedElsewhere\.has\(filename\)\) editable\.files\.delete\(filename\)/u);
});
