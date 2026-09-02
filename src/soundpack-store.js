'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const AdmZip = require('adm-zip');

const SOUNDPACK_SCHEMA = 1;
const MAX_ARCHIVE_BYTES = 25 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 50 * 1024 * 1024;
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MAX_ENTRIES = 64;
const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_EVENT_VARIATIONS = 8;
const MAX_EVENT_COOLDOWN_MS = 60_000;
const PACK_ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u;
const AUDIO_MIME_TYPES = Object.freeze({
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4'
});

const SOUNDPACK_EVENTS = Object.freeze({
  'combat.outgoing.hit': 'hit',
  'combat.outgoing.miss': 'miss',
  'combat.incoming.hit': 'incoming',
  'combat.incoming.critical': 'critical',
  'combat.incoming.catastrophic': 'catastrophic',
  'combat.outgoing.kill': 'kill',
  'vitals.health.25': 'danger',
  'vitals.health.75': 'health-75',
  'vitals.health.50': 'health-50',
  'vitals.health.10': 'health-10',
  'vitals.mana.20': 'mana-20',
  'vitals.mana.5': 'mana-5',
  'vitals.movement.50': 'move-50',
  'vitals.movement.5': 'move-5',
  'combat.start': 'combat-start',
  'combat.end': 'combat-end',
  'group.critical': 'group-critical',
  'group.down': 'group-down',
  'communication.tell': 'tell',
  'communication.auction': 'auction',
  'communication.gossip': 'gossip',
  'communication.skynet': 'skynet',
  'communication.ssf': 'ssf',
  'door.open': 'door-open',
  'door.close': 'door-close',
  'door.lock': 'door-lock',
  'door.unlock': 'door-unlock',
  'door.pick': 'door-pick',
  'door.break': 'door-break',
  'door.blocked': 'door-blocked',
  'container.open': 'container-open',
  'container.close': 'container-close',
  'container.lock': 'container-lock',
  'container.unlock': 'container-unlock',
  'container.pick': 'container-pick',
  'container.break': 'container-break',
  'object.get': 'object-get',
  'object.retrieve': 'object-retrieve',
  'object.put': 'object-put',
  'object.drop': 'object-drop',
  'object.give': 'object-give',
  'equipment.equip': 'equipment-equip',
  'equipment.remove': 'equipment-remove',
  'shop.buy': 'shop-buy',
  'shop.sell': 'shop-sell',
  'shop.insufficient-funds': 'shop-insufficient-funds',
  'ammunition.reload': 'ammunition-reload',
  'ammunition.empty': 'ammunition-empty',
  'quest.accepted': 'quest-accepted',
  'quest.advanced': 'quest-advanced',
  'quest.completed': 'quest-completed',
  'loot.item': 'loot-item',
  'loot.credits': 'loot-credits',
  'client.connected': 'client-connected',
  'client.disconnected': 'client-disconnected',
  'client.reconnecting': 'client-reconnecting',
  'client.copyover-recovered': 'copyover-recovered'
});
const EVENT_SET = new Set(Object.keys(SOUNDPACK_EVENTS));

const SOUNDPACK_EVENT_OVERRIDES = Object.freeze({
  'door.blocked': Object.freeze({ source: 'reserved', status: 'not-emitted', note: 'Reserved for a future authoritative blocked-door event.' }),
  'client.copyover-recovered': Object.freeze({ source: 'reserved', status: 'not-emitted', note: 'Reserved until copyover recovery exposes one authoritative renderer event.' })
});

function soundpackEventMetadata(eventNameValue) {
  const event = String(eventNameValue || '').trim().toLowerCase();
  if (SOUNDPACK_EVENT_OVERRIDES[event]) return { ...SOUNDPACK_EVENT_OVERRIDES[event] };
  if (event.startsWith('communication.')) return { source: 'communications', status: 'active', note: 'Generated from the Communications stream.' };
  if (event.startsWith('client.')) return { source: 'client', status: 'active', note: 'Generated from client connection state.' };
  if (event.startsWith('combat.') || event.startsWith('vitals.') || event.startsWith('group.') || event.startsWith('loot.')) {
    return { source: 'derived', status: 'active', note: 'Derived from authoritative GMCP game state.' };
  }
  return { source: 'server', status: 'active', note: 'Sent as an allowlisted NukeFire.Sound semantic event.' };
}

function cleanText(value, maximum) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, maximum);
}

function normalizeEntryName(value) {
  const name = String(value || '').replace(/\\/gu, '/');
  if (!name || name.startsWith('/') || /^[A-Za-z]:/u.test(name)) return '';
  const segments = name.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return '';
  return segments.join('/');
}

function normalizeManifest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Soundpack manifest must be an object.');
  if (Number(input.schema) !== SOUNDPACK_SCHEMA) throw new Error('Soundpack manifest schema must be 1.');
  const id = cleanText(input.id, 80).toLowerCase();
  if (!PACK_ID_PATTERN.test(id)) throw new Error('Soundpack id must use lowercase letters, numbers, dots, dashes, or underscores.');
  const name = cleanText(input.name, 80);
  if (!name) throw new Error('Soundpack name is required.');
  const author = cleanText(input.author, 80) || 'Unknown';
  const version = cleanText(input.version, 32) || '1.0.0';
  const sourceEvents = input.events && typeof input.events === 'object' && !Array.isArray(input.events) ? input.events : {};
  const events = {};
  for (const [eventNameValue, fileValue] of Object.entries(sourceEvents)) {
    const eventName = String(eventNameValue || '').trim().toLowerCase();
    if (!EVENT_SET.has(eventName)) throw new Error(`Unsupported soundpack event: ${eventName || 'empty event'}.`);
    const source = typeof fileValue === 'string' ? { files: [fileValue] } : fileValue;
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      throw new Error(`Soundpack event ${eventName} must be a filename or bounded event options.`);
    }
    const sourceFiles = Array.isArray(source.files) ? source.files : [];
    if (!sourceFiles.length || sourceFiles.length > MAX_EVENT_VARIATIONS) {
      throw new Error(`Soundpack event ${eventName} must provide 1 through ${MAX_EVENT_VARIATIONS} audio files.`);
    }
    const files = sourceFiles.map((fileValue) => {
      const filename = normalizeEntryName(fileValue);
      const extension = path.posix.extname(filename).toLowerCase();
      if (!filename || !Object.hasOwn(AUDIO_MIME_TYPES, extension)) {
        throw new Error(`Soundpack event ${eventName} must reference WAV, MP3, OGG, or M4A audio.`);
      }
      return filename;
    });
    if (new Set(files).size !== files.length) throw new Error(`Soundpack event ${eventName} contains duplicate audio files.`);
    const selection = String(source.selection || 'random').trim().toLowerCase();
    if (selection !== 'random' && selection !== 'sequential') throw new Error(`Soundpack event ${eventName} selection must be random or sequential.`);
    const volumeValue = Number(source.volume);
    const volume = Number.isFinite(volumeValue) ? Math.max(0, Math.min(1, volumeValue)) : 1;
    const cooldownValue = Number(source.cooldown_ms);
    const cooldown_ms = Number.isFinite(cooldownValue) ? Math.max(0, Math.min(MAX_EVENT_COOLDOWN_MS, Math.trunc(cooldownValue))) : 0;
    events[eventName] = Object.freeze({ files: Object.freeze(files), selection, volume, cooldown_ms });
  }
  return Object.freeze({ schema: SOUNDPACK_SCHEMA, id, name, author, version, events: Object.freeze(events) });
}

function eventFiles(eventOptions) {
  return Array.isArray(eventOptions?.files) ? eventOptions.files : [];
}

function inspectArchiveBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_ARCHIVE_BYTES) {
    throw new Error(`Soundpack archive must be no larger than ${MAX_ARCHIVE_BYTES / 1024 / 1024} MB.`);
  }
  const archive = new AdmZip(buffer);
  const entries = archive.getEntries();
  if (!entries.length || entries.length > MAX_ENTRIES) throw new Error(`Soundpack archive must contain 1 through ${MAX_ENTRIES} entries.`);
  const byName = new Map();
  let expandedBytes = 0;
  for (const entry of entries) {
    const rawName = entry.entryName.replace(/\\/gu, '/');
    const comparableName = entry.isDirectory && rawName.endsWith('/') ? rawName.slice(0, -1) : rawName;
    const name = normalizeEntryName(comparableName);
    if (!name || name !== comparableName) throw new Error('Soundpack contains an unsafe archive path.');
    if (entry.isDirectory) continue;
    const size = Number(entry.header?.size) || 0;
    expandedBytes += size;
    if (expandedBytes > MAX_EXPANDED_BYTES) throw new Error('Soundpack expands beyond the 50 MB safety limit.');
    if (byName.has(name)) throw new Error(`Soundpack contains a duplicate entry: ${name}.`);
    byName.set(name, entry);
  }
  const manifestEntry = byName.get('manifest.json');
  if (!manifestEntry || Number(manifestEntry.header?.size) > MAX_MANIFEST_BYTES) throw new Error('Soundpack requires a bounded root manifest.json.');
  let manifestInput;
  try {
    manifestInput = JSON.parse(manifestEntry.getData().toString('utf8'));
  } catch (_error) {
    throw new Error('Soundpack manifest.json is not valid UTF-8 JSON.');
  }
  const manifest = normalizeManifest(manifestInput);
  const referencedFiles = new Set(Object.values(manifest.events).flatMap(eventFiles));
  for (const name of byName.keys()) {
    if (name !== 'manifest.json' && !referencedFiles.has(name)) {
      throw new Error(`Soundpack contains an unreferenced file: ${name}.`);
    }
  }
  for (const [eventName, options] of Object.entries(manifest.events)) {
    for (const filename of eventFiles(options)) {
      const entry = byName.get(filename);
      if (!entry || entry.isDirectory) throw new Error(`Soundpack event ${eventName} references a missing file.`);
      const size = Number(entry.header?.size) || 0;
      if (size <= 0 || size > MAX_AUDIO_BYTES) throw new Error(`Soundpack audio ${filename} must be between 1 byte and 8 MB.`);
    }
  }
  return { archive, manifest, byName };
}

class SoundpackStore {
  constructor(options = {}) {
    this.directory = path.resolve(String(options.directory || '.'));
  }

  async ensureDirectory() {
    await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
    return this.directory;
  }

  archivePath(id) {
    const normalized = String(id || '').trim().toLowerCase();
    if (!PACK_ID_PATTERN.test(normalized)) return '';
    return path.join(this.directory, `${normalized}.nfsp`);
  }

  async importArchive(filepath) {
    const selected = path.resolve(String(filepath || ''));
    const stat = await fs.stat(selected);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_ARCHIVE_BYTES) throw new Error('Selected soundpack is not a valid bounded file.');
    const buffer = await fs.readFile(selected);
    const { manifest } = inspectArchiveBuffer(buffer);
    await this.ensureDirectory();
    const destination = this.archivePath(manifest.id);
    const temporary = `${destination}.tmp-${process.pid}-${Date.now()}`;
    const backup = `${destination}.bak-${process.pid}-${Date.now()}`;
    await fs.writeFile(temporary, buffer, { mode: 0o600 });
    let previousMoved = false;
    try {
      try {
        await fs.rename(destination, backup);
        previousMoved = true;
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      await fs.rename(temporary, destination);
      if (previousMoved) await fs.unlink(backup);
    } catch (error) {
      try { await fs.unlink(temporary); } catch (_cleanupError) {}
      if (previousMoved) {
        try { await fs.rename(backup, destination); } catch (_restoreError) {}
      }
      throw error;
    }
    return { ok: true, pack: manifest };
  }

  async writePack(manifestInput, files = new Map()) {
    const manifest = normalizeManifest(manifestInput);
    const archive = new AdmZip();
    archive.addFile('manifest.json', Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'));
    for (const filename of new Set(Object.values(manifest.events).flatMap(eventFiles))) {
      const data = files.get(filename);
      if (!Buffer.isBuffer(data) || !data.length || data.length > MAX_AUDIO_BYTES) throw new Error(`Missing bounded audio data for ${filename}.`);
      archive.addFile(filename, data);
    }
    const buffer = archive.toBuffer();
    inspectArchiveBuffer(buffer);
    await this.ensureDirectory();
    const destination = this.archivePath(manifest.id);
    const temporary = `${destination}.tmp-${process.pid}-${Date.now()}`;
    const backup = `${destination}.bak-${process.pid}-${Date.now()}`;
    await fs.writeFile(temporary, buffer, { mode: 0o600 });
    let previousMoved = false;
    try {
      try { await fs.rename(destination, backup); previousMoved = true; } catch (error) { if (error?.code !== 'ENOENT') throw error; }
      await fs.rename(temporary, destination);
      if (previousMoved) await fs.unlink(backup);
    } catch (error) {
      try { await fs.unlink(temporary); } catch (_cleanupError) {}
      if (previousMoved) try { await fs.rename(backup, destination); } catch (_restoreError) {}
      throw error;
    }
    return { ok: true, pack: manifest };
  }

  async editablePack(id) {
    const result = await this.readPack(id, false);
    const buffer = await fs.readFile(this.archivePath(id));
    const { byName } = inspectArchiveBuffer(buffer);
    const files = new Map();
    for (const options of Object.values(result.pack.events)) {
      for (const filename of eventFiles(options)) files.set(filename, byName.get(filename).getData());
    }
    return { pack: result.pack, files };
  }

  async duplicate(sourceId, newId, metadata = {}) {
    const requested = String(sourceId || 'builtin').trim().toLowerCase();
    const id = cleanText(newId, 80).toLowerCase();
    if (!PACK_ID_PATTERN.test(id) || id === 'builtin') throw new Error('New soundpack ID is invalid or reserved.');
    if (await fs.stat(this.archivePath(id)).then(() => true, () => false)) throw new Error(`Soundpack ${id} already exists.`);
    const source = requested === 'builtin'
      ? { pack: { events: {} }, files: new Map() }
      : await this.editablePack(requested);
    return this.writePack({
      schema: 1, id,
      name: cleanText(metadata.name, 80) || id,
      author: cleanText(metadata.author, 80) || 'Player',
      version: cleanText(metadata.version, 32) || '1.0.0',
      events: source.pack.events
    }, source.files);
  }

  async assignEvent(id, eventNameValue, filepath, options = {}) {
    const eventName = String(eventNameValue || '').trim().toLowerCase();
    if (!EVENT_SET.has(eventName)) throw new Error('Unsupported soundpack event.');
    const selected = path.resolve(String(filepath || ''));
    const stat = await fs.stat(selected);
    const extension = path.extname(selected).toLowerCase();
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_AUDIO_BYTES || !Object.hasOwn(AUDIO_MIME_TYPES, extension)) {
      throw new Error('Selected audio must be a bounded WAV, MP3, OGG, or M4A file.');
    }
    const editable = await this.editablePack(id);
    const filename = `sounds/${eventName.replace(/\./gu, '-')}${extension}`;
    for (const oldFilename of eventFiles(editable.pack.events[eventName])) editable.files.delete(oldFilename);
    editable.files.set(filename, await fs.readFile(selected));
    const events = { ...editable.pack.events, [eventName]: {
      files: [filename], selection: 'random', volume: options.volume, cooldown_ms: options.cooldown_ms
    } };
    return this.writePack({ ...editable.pack, events }, editable.files);
  }

  async clearEvent(id, eventNameValue) {
    const eventName = String(eventNameValue || '').trim().toLowerCase();
    if (!EVENT_SET.has(eventName)) throw new Error('Unsupported soundpack event.');
    const editable = await this.editablePack(id);
    for (const filename of eventFiles(editable.pack.events[eventName])) editable.files.delete(filename);
    const events = { ...editable.pack.events };
    delete events[eventName];
    return this.writePack({ ...editable.pack, events }, editable.files);
  }

  async updateEventOptions(id, eventNameValue, options = {}) {
    const eventName = String(eventNameValue || '').trim().toLowerCase();
    const editable = await this.editablePack(id);
    const current = editable.pack.events[eventName];
    if (!current) throw new Error(`Soundpack event ${eventName} has no custom sound.`);
    const events = { ...editable.pack.events, [eventName]: { ...current, ...options } };
    return this.writePack({ ...editable.pack, events }, editable.files);
  }

  async exportPack(id, destination) {
    const source = this.archivePath(id);
    if (!source) throw new Error('Invalid soundpack ID.');
    await fs.copyFile(source, path.resolve(String(destination || '')));
    return { ok: true, id };
  }

  async readPack(id, includeAssets = false) {
    const filepath = this.archivePath(id);
    if (!filepath) throw new Error('Invalid soundpack id.');
    const buffer = await fs.readFile(filepath);
    const { manifest, byName } = inspectArchiveBuffer(buffer);
    if (!includeAssets) return { ok: true, pack: manifest };
    const assets = {};
    for (const [eventName, options] of Object.entries(manifest.events)) {
      assets[SOUNDPACK_EVENTS[eventName]] = {
        sources: eventFiles(options).map((filename) => {
          const data = byName.get(filename).getData();
          const mime = AUDIO_MIME_TYPES[path.posix.extname(filename).toLowerCase()];
          return `data:${mime};base64,${data.toString('base64')}`;
        }),
        selection: options.selection,
        volume: options.volume,
        cooldown_ms: options.cooldown_ms
      };
    }
    return { ok: true, pack: manifest, assets };
  }

  async list() {
    await this.ensureDirectory();
    const names = (await fs.readdir(this.directory)).filter((name) => name.endsWith('.nfsp')).sort();
    const packs = [];
    const invalid = [];
    for (const name of names.slice(0, 100)) {
      try {
        const result = await this.readPack(name.slice(0, -5), false);
        packs.push(result.pack);
      } catch (error) {
        invalid.push({
          id: name.slice(0, -5),
          filename: name,
          error: cleanText(error?.message || error || 'Invalid soundpack archive.', 180)
        });
      }
    }
    return { ok: true, packs, invalid };
  }
}

module.exports = {
  SOUNDPACK_SCHEMA,
  SOUNDPACK_EVENTS,
  soundpackEventMetadata,
  MAX_ARCHIVE_BYTES,
  MAX_EXPANDED_BYTES,
  MAX_EVENT_VARIATIONS,
  MAX_EVENT_COOLDOWN_MS,
  normalizeEntryName,
  normalizeManifest,
  inspectArchiveBuffer,
  SoundpackStore
};
