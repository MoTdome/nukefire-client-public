'use strict';

const fs = require('node:fs/promises');
const fsConstants = require('node:fs').constants;
const path = require('node:path');
const { TextDecoder } = require('node:util');

const DEFAULT_MAX_SCRIPT_BYTES = 2_000_000;
const DEFAULT_MAX_SCRIPT_FILES = 200;
const DEFAULT_MAX_WRITE_BYTES = 2_000_000;
const SCRIPT_DIRECTORY_PARTS = Object.freeze(['NukeFire Client', 'Scripts']);

function normalizeScriptRequest(value) {
  const source = String(value ?? '').normalize('NFKC').trim();
  if (!source || source.length > 96) return '';
  if (/[/\\:\u0000-\u001F\u007F]/u.test(source)) return '';
  if (source === '.' || source === '..' || source.startsWith('.') || source.includes('..')) return '';
  if (!/^[A-Za-z0-9][A-Za-z0-9 _.-]*$/u.test(source)) return '';
  const extension = path.extname(source).toLowerCase();
  if (extension && !['.tin', '.txt'].includes(extension)) return '';
  return source;
}

function candidateNames(requested) {
  const source = normalizeScriptRequest(requested);
  if (!source) return [];
  return path.extname(source)
    ? [source]
    : [source, `${source}.tin`];
}

class ScriptStore {
  constructor(options = {}) {
    const documentsDirectory = path.resolve(String(options.documentsDirectory || '.'));
    this.directory = path.join(documentsDirectory, ...SCRIPT_DIRECTORY_PARTS);
    this.maxBytes = Math.max(1, Math.trunc(Number(options.maxBytes) || DEFAULT_MAX_SCRIPT_BYTES));
    this.maxFiles = Math.max(1, Math.trunc(Number(options.maxFiles) || DEFAULT_MAX_SCRIPT_FILES));
    this.maxWriteBytes = Math.max(1, Math.trunc(Number(options.maxWriteBytes) || DEFAULT_MAX_WRITE_BYTES));
  }

  async ensureDirectory() {
    await fs.mkdir(this.directory, { recursive: true });
    return this.directory;
  }

  getInfo(extra = {}) {
    return {
      directory: this.directory,
      extensions: ['.tin', '.txt', ''],
      maxBytes: this.maxBytes,
      maxWriteBytes: this.maxWriteBytes,
      ...extra
    };
  }

  async list() {
    await this.ensureDirectory();
    const entries = await fs.readdir(this.directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const normalized = normalizeScriptRequest(entry.name);
      if (!normalized) continue;
      files.push(entry.name);
      if (files.length >= this.maxFiles) break;
    }
    return files.sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
  }

  async resolve(requestedValue) {
    const requested = normalizeScriptRequest(requestedValue);
    if (!requested) {
      return { ok: false, error: 'Use a script name such as Prime, prime.tin, or prime.txt. Paths and other extensions are not accepted.' };
    }
    const files = await this.list();
    const byLower = new Map(files.map((name) => [name.toLocaleLowerCase(), name]));
    for (const candidate of candidateNames(requested)) {
      const exact = files.find((name) => name === candidate);
      const filename = exact || byLower.get(candidate.toLocaleLowerCase());
      if (!filename) continue;
      const filepath = path.join(this.directory, filename);
      const stat = await fs.lstat(filepath);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        return { ok: false, error: `${filename} is not a regular script file.` };
      }
      if (stat.size > this.maxBytes) {
        return { ok: false, error: `${filename} exceeds the ${this.maxBytes.toLocaleString()} byte script limit.` };
      }
      return { ok: true, requested, filename, filepath, size: stat.size, files };
    }
    return {
      ok: false,
      error: `No script named ${requested} was found in the NukeFire Scripts folder.`,
      requested,
      files
    };
  }

  async resolveSelectedPath(filepathValue) {
    await this.ensureDirectory();
    const source = String(filepathValue ?? '').trim();
    if (!source || source.includes('\u0000')) {
      return { ok: false, error: 'No TinTin script file was selected.', info: this.getInfo() };
    }
    const filepath = path.resolve(source);
    const relative = path.relative(this.directory, filepath);
    if (!relative || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative) || relative.includes(path.sep)) {
      return { ok: false, error: 'Only files directly inside the NukeFire Scripts folder can be edited.', info: this.getInfo() };
    }
    const filename = path.basename(filepath);
    if (!normalizeScriptRequest(filename)) {
      return { ok: false, error: 'Only safe extensionless, .tin, or .txt script files can be edited.', info: this.getInfo() };
    }
    try {
      const stat = await fs.lstat(filepath);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        return { ok: false, error: `${filename} is not a regular script file.`, info: this.getInfo() };
      }
      return { ok: true, requested: filename, filename, filepath, size: stat.size, info: this.getInfo() };
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return { ok: false, error: `${filename} no longer exists in the NukeFire Scripts folder.`, info: this.getInfo() };
      }
      if (['ELOOP', 'EMLINK'].includes(error?.code)) {
        return { ok: false, error: `${filename} is not a regular script file.`, info: this.getInfo() };
      }
      throw error;
    }
  }

  async read(requestedValue) {
    await this.ensureDirectory();
    const requested = String(requestedValue ?? '').trim();
    if (!requested) {
      const files = await this.list();
      return { ok: true, mode: 'info', files, info: this.getInfo() };
    }
    const resolved = await this.resolve(requested);
    if (!resolved.ok) return { ...resolved, info: this.getInfo() };
    let handle;
    let buffer;
    try {
      const flags = fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW || 0);
      handle = await fs.open(resolved.filepath, flags);
      const stat = await handle.stat();
      if (!stat.isFile()) {
        return { ok: false, error: `${resolved.filename} is not a regular script file.`, info: this.getInfo() };
      }
      if (stat.size > this.maxBytes) {
        return { ok: false, error: `${resolved.filename} exceeds the ${this.maxBytes.toLocaleString()} byte script limit.`, info: this.getInfo() };
      }
      buffer = await handle.readFile();
    } catch (error) {
      if (['ELOOP', 'EMLINK'].includes(error?.code)) {
        return { ok: false, error: `${resolved.filename} is not a regular script file.`, info: this.getInfo() };
      }
      throw error;
    } finally {
      await handle?.close();
    }
    if (buffer.length > this.maxBytes) {
      return { ok: false, error: `${resolved.filename} exceeds the ${this.maxBytes.toLocaleString()} byte script limit.`, info: this.getInfo() };
    }
    let content = '';
    try {
      content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      return { ok: false, error: `${resolved.filename} is not valid UTF-8 text.`, info: this.getInfo() };
    }
    return {
      ok: true,
      mode: 'read',
      requested: resolved.requested,
      filename: resolved.filename,
      size: buffer.length,
      content,
      files: resolved.files,
      info: this.getInfo()
    };
  }
  async write(requestedValue, contentValue) {
    await this.ensureDirectory();
    const requested = normalizeScriptRequest(requestedValue);
    if (!requested) {
      return { ok: false, error: 'Use a script name such as Prime, prime.tin, or prime.txt. Paths and other extensions are not accepted.', info: this.getInfo() };
    }
    const desired = path.extname(requested) ? requested : `${requested}.tin`;
    const files = await this.list();
    let existing = files.find((name) => name === desired)
      || files.find((name) => name.toLocaleLowerCase() === desired.toLocaleLowerCase())
      || '';
    let filename = existing || desired;
    let filepath = path.join(this.directory, filename);
    if (!existing) {
      try {
        const direct = await fs.lstat(filepath);
        if (!direct.isFile() || direct.isSymbolicLink()) {
          return { ok: false, error: `${filename} is not a regular script file and will not be replaced.`, info: this.getInfo() };
        }
        existing = filename;
      } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
      }
    }
    if (!existing && files.length >= this.maxFiles) {
      return { ok: false, error: `The NukeFire Scripts folder already contains the maximum ${this.maxFiles} script files.`, info: this.getInfo() };
    }

    const content = String(contentValue ?? '');
    if (!content.trim()) return { ok: false, error: 'TinTin script content cannot be empty.', info: this.getInfo() };
    if (content.includes('\u0000')) return { ok: false, error: 'TinTin script content contains an unsafe null character.', info: this.getInfo() };
    const buffer = Buffer.from(content, 'utf8');
    if (buffer.length > this.maxWriteBytes) {
      return { ok: false, error: `${filename} would exceed the ${this.maxWriteBytes.toLocaleString()} byte script limit.`, info: this.getInfo() };
    }

    if (existing) {
      const stat = await fs.lstat(filepath);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        return { ok: false, error: `${filename} is not a regular script file and will not be replaced.`, info: this.getInfo() };
      }
    }

    const nonce = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const temporary = path.join(this.directory, `.${filename}.${nonce}.tmp`);
    let handle;
    try {
      const flags = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | (fsConstants.O_NOFOLLOW || 0);
      handle = await fs.open(temporary, flags, 0o600);
      await handle.writeFile(buffer);
      await handle.sync();
      await handle.close();
      handle = null;
      await fs.rename(temporary, filepath);
    } catch (error) {
      await handle?.close().catch(() => {});
      await fs.unlink(temporary).catch(() => {});
      if (['ELOOP', 'EMLINK'].includes(error?.code)) {
        return { ok: false, error: `${filename} is not a regular script file and will not be replaced.`, info: this.getInfo() };
      }
      throw error;
    }

    return {
      ok: true,
      mode: 'write',
      requested,
      filename,
      size: buffer.length,
      replaced: Boolean(existing),
      files: await this.list(),
      info: this.getInfo()
    };
  }

}

module.exports = {
  ScriptStore,
  normalizeScriptRequest,
  candidateNames,
  DEFAULT_MAX_SCRIPT_BYTES,
  DEFAULT_MAX_SCRIPT_FILES,
  DEFAULT_MAX_WRITE_BYTES,
  SCRIPT_DIRECTORY_PARTS
};
