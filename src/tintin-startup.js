'use strict';

(function exposeTinTinStartup(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireTinTinStartup = api;
})(typeof window !== 'undefined' ? window : globalThis, function createTinTinStartupApi() {
  const DEFAULT_TINTIN_STARTUP = Object.freeze({
    enabled: false,
    filename: 'main.tin'
  });

  function clone(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeStartupFilename(value, fallbackValue = DEFAULT_TINTIN_STARTUP.filename) {
    const fallback = String(fallbackValue || DEFAULT_TINTIN_STARTUP.filename).normalize('NFKC').trim() || DEFAULT_TINTIN_STARTUP.filename;
    const source = String(value || '').normalize('NFKC').trim();
    if (!source) return fallback;
    if (source.length > 120 || source.includes('/') || source.includes('\\') || source.includes('..')) return fallback;
    if (/\.[^./\\]+$/u.test(source) && !/\.(?:tin|txt)$/iu.test(source)) return fallback;
    const withExtension = /\.(?:tin|txt)$/iu.test(source) ? source : `${source}.tin`;
    if (!/^[\p{L}\p{N} _().@+-]+\.(?:tin|txt)$/iu.test(withExtension)) return fallback;
    return withExtension.slice(0, 124);
  }

  function normalizeTinTinStartupSettings(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    return {
      enabled: source.enabled === true,
      filename: normalizeStartupFilename(source.filename)
    };
  }

  function startupTemplateDefinitions(input = {}) {
    const source = input && typeof input === 'object' ? clone(input) : {};
    delete source.profile;
    return source;
  }

  function startupProfileIdentity(settingsValue = {}, resolvedFilenameValue = '') {
    const settings = normalizeTinTinStartupSettings(settingsValue);
    const filename = normalizeStartupFilename(resolvedFilenameValue || settings.filename, settings.filename);
    return {
      requested: settings.filename.replace(/\.(?:tin|txt)$/iu, ''),
      filename,
      loaded: true
    };
  }

  return {
    DEFAULT_TINTIN_STARTUP,
    normalizeStartupFilename,
    normalizeTinTinStartupSettings,
    startupTemplateDefinitions,
    startupProfileIdentity
  };
});
