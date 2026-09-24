(function attachTinTinFindPattern(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireTinTinFindPattern = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createTinTinFindPatternApi() {
  'use strict';

  const MAX_PATTERN_LENGTH = 512;
  const TOKEN_BODIES = Object.freeze({
    d: '[0-9]*',
    D: '[^0-9]*',
    s: '\\s*',
    S: '\\S*',
    w: '[A-Za-z]*',
    W: '[^A-Za-z]*',
    '?': '.?',
    '*': '.*',
    '+': '.+',
    '.': '.'
  });

  function escapeRegexChar(char) {
    return /[\\^$.*+?()[\]{}|]/u.test(char) ? `\\${char}` : char;
  }

  function compileTinTinFindPattern(value) {
    const source = String(value ?? '');
    if (!source || source.length > MAX_PATTERN_LENGTH) {
      return {
        ok: false,
        source,
        regex: '',
        caseSensitive: false,
        error: source ? 'Search pattern is too long.' : 'Search pattern is empty.'
      };
    }

    let regex = '';
    let caseSensitive = false;
    let hasTinTinToken = false;

    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (char !== '%') {
        if ((char === '^' && index === 0) || (char === '$' && index === source.length - 1)) regex += char;
        else regex += escapeRegexChar(char);
        continue;
      }

      const next = source[index + 1];
      if (next === undefined) {
        regex += '%';
        continue;
      }
      if (next === '%') {
        regex += '%';
        index += 1;
        continue;
      }
      if (next === 'i') {
        hasTinTinToken = true;
        caseSensitive = false;
        index += 1;
        continue;
      }
      if (next === 'I') {
        hasTinTinToken = true;
        caseSensitive = true;
        index += 1;
        continue;
      }

      if (Object.hasOwn(TOKEN_BODIES, next)) {
        regex += TOKEN_BODIES[next];
        hasTinTinToken = true;
        index += 1;
        continue;
      }

      const number = source.slice(index + 1).match(/^(?:[1-9][0-9]?|0)/u)?.[0] || '';
      if (number) {
        regex += '.*?';
        hasTinTinToken = true;
        index += number.length;
        continue;
      }

      regex += '%';
    }

    try {
      void new RegExp(regex, caseSensitive ? 'u' : 'iu');
    } catch (error) {
      return {
        ok: false,
        source,
        regex: '',
        caseSensitive,
        error: error.message || 'Invalid TinTin search pattern.'
      };
    }

    return { ok: true, source, regex, caseSensitive, hasTinTinToken, error: '' };
  }

  return Object.freeze({ MAX_PATTERN_LENGTH, compileTinTinFindPattern });
});
