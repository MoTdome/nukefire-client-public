'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const MAX_LOG_BYTES_PER_WRITE = 2_000_000;
const MAX_LOG_FILENAME = 128;

function normalizeLogFilename(value) {
  const source = String(value || '').normalize('NFKC').trim();
  if (!source || source.length > MAX_LOG_FILENAME || source.includes('/') || source.includes('\\') || source.includes('..')) return '';
  if (!/^[\p{L}\p{N} _().@+-]+$/u.test(source)) return '';
  return source;
}

class LogStore {
  constructor(options = {}) {
    if (!options.documentsDirectory) throw new TypeError('LogStore requires a documentsDirectory.');
    this.directory = path.join(options.documentsDirectory, 'NukeFire Client', 'Logs');
    this.queues = new Map();
  }
  async ensureDirectory() {
    await fs.mkdir(this.directory, { recursive: true });
    const stat = await fs.lstat(this.directory);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('NukeFire Logs path is not a safe directory.');
    return this.directory;
  }
  getInfo() { return { directory: this.directory }; }
  async overwrite(filenameValue) {
    const filename = normalizeLogFilename(filenameValue);
    if (!filename) return { ok: false, error: 'Log filename must be a safe basename inside the NukeFire Logs folder.', info: this.getInfo() };
    const filepath = path.join(this.directory, filename);
    const previous = this.queues.get(filepath) || Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
      await this.ensureDirectory();
      try {
        const stat = await fs.lstat(filepath);
        if (stat.isSymbolicLink() || !stat.isFile()) return { ok: false, error: 'Log target must be a regular file, not a link or directory.', info: this.getInfo() };
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      await fs.writeFile(filepath, '', { encoding: 'utf8', mode: 0o600 });
      return { ok: true, filename, filepath, info: this.getInfo() };
    });
    this.queues.set(filepath, task);
    try {
      return await task;
    } finally {
      if (this.queues.get(filepath) === task) this.queues.delete(filepath);
    }
  }

  async append(filenameValue, textValue) {
    const filename = normalizeLogFilename(filenameValue);
    if (!filename) return { ok: false, error: 'Log filename must be a safe basename inside the NukeFire Logs folder.', info: this.getInfo() };
    const text = String(textValue ?? '');
    if (!text || Buffer.byteLength(text, 'utf8') > MAX_LOG_BYTES_PER_WRITE) return { ok: false, error: 'Log write was empty or too large.', info: this.getInfo() };
    const filepath = path.join(this.directory, filename);
    const previous = this.queues.get(filepath) || Promise.resolve();
    const task = previous.catch(() => {}).then(async () => {
      await this.ensureDirectory();
      try {
        const stat = await fs.lstat(filepath);
        if (stat.isSymbolicLink() || !stat.isFile()) return { ok: false, error: 'Log target must be a regular file, not a link or directory.', info: this.getInfo() };
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
      await fs.appendFile(filepath, text, { encoding: 'utf8', mode: 0o600 });
      return { ok: true, filename, filepath, info: this.getInfo() };
    });
    this.queues.set(filepath, task);
    try {
      return await task;
    } finally {
      if (this.queues.get(filepath) === task) this.queues.delete(filepath);
    }
  }
}

module.exports = { LogStore, normalizeLogFilename, MAX_LOG_BYTES_PER_WRITE };
