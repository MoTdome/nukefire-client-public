'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { MAP_SCHEMA_VERSION, normalizeMapData } = require('./mapper');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

class MapStore {
  constructor(options = {}) {
    if (!options.baseDirectory) throw new TypeError('MapStore requires a baseDirectory.');
    this.baseDirectory = options.baseDirectory;
    this.filePath = path.join(this.baseDirectory, 'map.json');
    this.backupPath = `${this.filePath}.bak`;
    this.current = null;
    this.writeQueue = Promise.resolve();
  }

  async load() {
    if (this.current) return clone(this.current);
    const primary = await this.tryRead(this.filePath);
    if (primary) {
      this.current = normalizeMapData(primary);
      return clone(this.current);
    }
    const backup = await this.tryRead(this.backupPath);
    if (backup) {
      this.current = normalizeMapData(backup);
      await this.write(this.current, { backupCurrent: false });
      return clone(this.current);
    }
    this.current = normalizeMapData({});
    await this.write(this.current, { backupCurrent: false });
    return clone(this.current);
  }

  async save(data) {
    const next = normalizeMapData(data);
    this.current = next;
    this.writeQueue = this.writeQueue.then(() => this.write(next), () => this.write(next));
    await this.writeQueue;
    // The renderer already owns the authoritative live graph. Returning another
    // complete map through Electron IPC duplicates and serializes the whole world
    // a second time after every save, so acknowledge with lightweight metadata.
    return {
      schemaVersion: MAP_SCHEMA_VERSION,
      updatedAt: next.updatedAt,
      rooms: Object.keys(next.rooms).length,
      characters: Object.keys(next.characters).length
    };
  }

  getInfo() {
    return { schemaVersion: MAP_SCHEMA_VERSION, directory: this.baseDirectory, filePath: this.filePath, backupPath: this.backupPath };
  }

  async tryRead(filePath) {
    try { return await readJson(filePath); }
    catch (error) {
      if (error?.code === 'ENOENT' || error instanceof SyntaxError) return null;
      throw error;
    }
  }

  async write(data, options = {}) {
    await fs.mkdir(this.baseDirectory, { recursive: true });
    const temporaryPath = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    try {
      await fs.writeFile(temporaryPath, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      if (options.backupCurrent !== false) {
        try { await fs.copyFile(this.filePath, this.backupPath); }
        catch (error) { if (error?.code !== 'ENOENT') throw error; }
      }
      await fs.rename(temporaryPath, this.filePath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
  }
}

module.exports = { MapStore, MAP_SCHEMA_VERSION };
