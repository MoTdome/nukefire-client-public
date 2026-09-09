'use strict';

const MAX_LUA_ECHO_SOURCE_CHARS = 32768;
const MAX_LUA_ECHO_OUTPUT_CHARS = 65536;
const ESC = '\x1b[';

const ANSI_NAMED = Object.freeze({
  black: [30, 40],
  red: [31, 41],
  green: [32, 42],
  yellow: [33, 43],
  blue: [34, 44],
  magenta: [35, 45],
  cyan: [36, 46],
  white: [37, 47],
  grey: [90, 100],
  gray: [90, 100],
  light_black: [90, 100],
  light_red: [91, 101],
  light_green: [92, 102],
  light_yellow: [93, 103],
  light_blue: [94, 104],
  light_magenta: [95, 105],
  light_cyan: [96, 106],
  light_white: [97, 107]
});

const RGB_NAMED = Object.freeze({
  orange: [255, 165, 0],
  orange_red: [255, 69, 0],
  purple: [128, 0, 128],
  pink: [255, 192, 203],
  brown: [165, 42, 42],
  maroon: [128, 0, 0],
  olive: [128, 128, 0],
  navy: [0, 0, 128],
  teal: [0, 128, 128],
  silver: [192, 192, 192],
  lime: [0, 255, 0],
  aqua: [0, 255, 255],
  fuchsia: [255, 0, 255]
});

const STYLE_CODES = Object.freeze({
  b: 1,
  '/b': 22,
  i: 3,
  '/i': 23,
  u: 4,
  '/u': 24,
  o: 53,
  '/o': 55,
  s: 9,
  '/s': 29
});

function sanitizeLuaEchoSource(value) {
  return String(value ?? '')
    .slice(0, MAX_LUA_ECHO_SOURCE_CHARS)
    .replace(/[\u001B]/gu, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu, '')
    .replace(/\r/gu, '');
}

function sgr(code) {
  return `${ESC}${code}m`;
}

function normalizeColorToken(value) {
  return String(value || '').trim().toLowerCase().replace(/[ -]+/gu, '_');
}

function parseAnsiIndex(value) {
  const token = normalizeColorToken(value);
  const matched = token.match(/^ansi_?(\d{1,3})$/u);
  if (!matched) return null;
  const index = Number(matched[1]);
  return Number.isInteger(index) && index >= 0 && index <= 255 ? index : null;
}

function parseRgbTriplet(value) {
  const parts = String(value || '').split(',').map((item) => item.trim());
  if (parts.length !== 3 || parts.some((item) => !/^\d{1,3}$/u.test(item))) return null;
  const rgb = parts.map(Number);
  return rgb.every((item) => item >= 0 && item <= 255) ? rgb : null;
}

function colorSgr(tokenValue, background = false) {
  const token = normalizeColorToken(tokenValue);
  if (!token) return '';
  const pair = ANSI_NAMED[token];
  if (pair) return sgr(pair[background ? 1 : 0]);
  const ansiIndex = parseAnsiIndex(token);
  if (ansiIndex !== null) return sgr(`${background ? 48 : 38};5;${ansiIndex}`);
  const rgb = RGB_NAMED[token];
  if (rgb) return sgr(`${background ? 48 : 38};2;${rgb[0]};${rgb[1]};${rgb[2]}`);
  return '';
}

function rgbSgr(rgb, background = false) {
  return Array.isArray(rgb) && rgb.length === 3
    ? sgr(`${background ? 48 : 38};2;${rgb[0]};${rgb[1]};${rgb[2]}`)
    : '';
}

function styleTagSgr(tagValue) {
  const tag = String(tagValue || '').trim().toLowerCase();
  if (tag === 'reset' || tag === 'r') return sgr(0);
  return Object.prototype.hasOwnProperty.call(STYLE_CODES, tag) ? sgr(STYLE_CODES[tag]) : '';
}

function pushBounded(parts, value, state) {
  if (!value || state.length >= MAX_LUA_ECHO_OUTPUT_CHARS) return;
  const remaining = MAX_LUA_ECHO_OUTPUT_CHARS - state.length;
  const text = String(value).slice(0, remaining);
  if (!text) return;
  parts.push(text);
  state.length += text.length;
}

function finalizeFormatted(parts, state) {
  let output = parts.join('');
  const reset = sgr(0);
  if (state.formatted && !output.endsWith(reset)) {
    output = `${output.slice(0, Math.max(0, MAX_LUA_ECHO_OUTPUT_CHARS - reset.length))}${reset}`;
  }
  return output.slice(0, MAX_LUA_ECHO_OUTPUT_CHARS);
}

function formatCecho(sourceValue) {
  const source = sanitizeLuaEchoSource(sourceValue);
  const parts = [];
  const state = { length: 0, formatted: false };
  let cursor = 0;
  const matcher = /<([^<>]{1,96})>/gu;
  let match;
  while ((match = matcher.exec(source)) !== null) {
    pushBounded(parts, source.slice(cursor, match.index), state);
    const rawTag = String(match[1] || '');
    const style = styleTagSgr(rawTag);
    if (style) {
      pushBounded(parts, style, state);
      state.formatted = true;
    } else {
      const colon = rawTag.indexOf(':');
      let replacement = '';
      if (colon >= 0) {
        const fg = rawTag.slice(0, colon);
        const bg = rawTag.slice(colon + 1);
        const fgCode = fg.trim() ? colorSgr(fg, false) : '';
        const bgCode = bg.trim() ? colorSgr(bg, true) : '';
        if ((fg.trim() && !fgCode) || (bg.trim() && !bgCode)) replacement = '';
        else replacement = `${fgCode}${bgCode}`;
      } else {
        replacement = colorSgr(rawTag, false);
      }
      if (replacement) {
        pushBounded(parts, replacement, state);
        state.formatted = true;
      } else {
        pushBounded(parts, match[0], state);
      }
    }
    cursor = matcher.lastIndex;
  }
  pushBounded(parts, source.slice(cursor), state);
  if (state.formatted) pushBounded(parts, sgr(0), state);
  return finalizeFormatted(parts, state);
}

function formatDecho(sourceValue) {
  const source = sanitizeLuaEchoSource(sourceValue);
  const parts = [];
  const state = { length: 0, formatted: false };
  let cursor = 0;
  const matcher = /<([^<>]{1,96})>/gu;
  let match;
  while ((match = matcher.exec(source)) !== null) {
    pushBounded(parts, source.slice(cursor, match.index), state);
    const rawTag = String(match[1] || '').trim();
    const style = styleTagSgr(rawTag);
    let replacement = style;
    if (!replacement) {
      const colon = rawTag.indexOf(':');
      if (colon >= 0) {
        const fgRaw = rawTag.slice(0, colon).trim();
        const bgRaw = rawTag.slice(colon + 1).trim();
        const fg = fgRaw ? parseRgbTriplet(fgRaw) : null;
        const bg = bgRaw ? parseRgbTriplet(bgRaw) : null;
        if ((!fgRaw || fg) && (!bgRaw || bg) && (fg || bg)) replacement = `${rgbSgr(fg, false)}${rgbSgr(bg, true)}`;
      } else {
        const fg = parseRgbTriplet(rawTag);
        if (fg) replacement = rgbSgr(fg, false);
      }
    }
    if (replacement) {
      pushBounded(parts, replacement, state);
      state.formatted = true;
    } else {
      pushBounded(parts, match[0], state);
    }
    cursor = matcher.lastIndex;
  }
  pushBounded(parts, source.slice(cursor), state);
  if (state.formatted) pushBounded(parts, sgr(0), state);
  return finalizeFormatted(parts, state);
}

function formatHecho(sourceValue) {
  const source = sanitizeLuaEchoSource(sourceValue);
  const parts = [];
  const state = { length: 0, formatted: false };
  let index = 0;
  while (index < source.length && state.length < MAX_LUA_ECHO_OUTPUT_CHARS) {
    const marker = source[index];
    if (marker !== '#' && marker !== '|') {
      pushBounded(parts, marker, state);
      index += 1;
      continue;
    }

    const rest = source.slice(index + 1);
    const closeStyle = rest.match(/^\/([biuos])/iu);
    if (closeStyle) {
      pushBounded(parts, styleTagSgr(`/${closeStyle[1].toLowerCase()}`), state);
      state.formatted = true;
      index += 3;
      continue;
    }
    // Six hex digits win over one-letter style tags so #BEEF00 is a color,
    // while #b remains the familiar bold toggle.
    const hex = rest.match(/^([0-9a-fA-F]{6})(?:,([0-9a-fA-F]{6}))?/u);
    if (hex) {
      const fg = [0, 2, 4].map((offset) => Number.parseInt(hex[1].slice(offset, offset + 2), 16));
      pushBounded(parts, rgbSgr(fg, false), state);
      if (hex[2]) {
        const bg = [0, 2, 4].map((offset) => Number.parseInt(hex[2].slice(offset, offset + 2), 16));
        pushBounded(parts, rgbSgr(bg, true), state);
      }
      state.formatted = true;
      index += 1 + hex[0].length;
      continue;
    }
    const style = rest.match(/^([biuosr])/iu);
    if (style) {
      pushBounded(parts, styleTagSgr(style[1].toLowerCase()), state);
      state.formatted = true;
      index += 2;
      continue;
    }
    pushBounded(parts, marker, state);
    index += 1;
  }
  if (state.formatted) pushBounded(parts, sgr(0), state);
  return finalizeFormatted(parts, state);
}


function plainLuaEcho(formatValue, textValue) {
  const format = String(formatValue || '').trim().toLowerCase();
  const source = sanitizeLuaEchoSource(textValue);
  if (format === 'cecho' || format === 'decho') {
    // Preserve the Beta.74 host-event projection used by existing package code
    // and tests while the host separately carries the safe formatted variant.
    return source.replace(/<[\w_:#,\-]+>/gu, '');
  }
  if (format === 'hecho') {
    return source
      .replace(/#[0-9a-fA-F]{6}/gu, '')
      .replace(/\|[0-9a-fA-F]{6}/gu, '')
      .replace(/#[/]?[biruos]/giu, '')
      .replace(/\|[/]?[biruos]/giu, '')
      .replace(/#r/giu, '')
      .replace(/\|r/giu, '');
  }
  return source;
}

function formatLuaEcho(formatValue, textValue) {
  const format = String(formatValue || '').trim().toLowerCase();
  if (format === 'cecho') return formatCecho(textValue);
  if (format === 'decho') return formatDecho(textValue);
  if (format === 'hecho') return formatHecho(textValue);
  return sanitizeLuaEchoSource(textValue);
}

module.exports = {
  MAX_LUA_ECHO_SOURCE_CHARS,
  MAX_LUA_ECHO_OUTPUT_CHARS,
  sanitizeLuaEchoSource,
  formatCecho,
  formatDecho,
  formatHecho,
  plainLuaEcho,
  formatLuaEcho
};
