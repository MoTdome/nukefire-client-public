(function attachAnsiParser(root, factory) {
  const osc8Api = typeof module === 'object' && module.exports
    ? require('./osc8-links')
    : (root?.NukeFireOsc8 || {});
  const exported = factory(osc8Api);
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireAnsi = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createAnsiParser(osc8Api) {
  'use strict';

  osc8Api = osc8Api || {};

  const BASIC = [
    '#000000', '#aa0000', '#00aa00', '#d6b94c',
    '#0000aa', '#aa00aa', '#00aaaa', '#aaaaaa',
    '#555555', '#ff5555', '#55ff55', '#ffff66',
    '#5555ff', '#ff55ff', '#55ffff', '#ffffff'
  ];

  function xtermColor(index) {
    const n = Math.max(0, Math.min(255, Number(index) || 0));
    if (n < 16) return BASIC[n];
    if (n < 232) {
      const value = n - 16;
      const r = Math.floor(value / 36);
      const g = Math.floor((value % 36) / 6);
      const b = value % 6;
      const component = (v) => (v === 0 ? 0 : 55 + v * 40);
      return `rgb(${component(r)}, ${component(g)}, ${component(b)})`;
    }
    const gray = 8 + (n - 232) * 10;
    return `rgb(${gray}, ${gray}, ${gray})`;
  }

  function defaultState() {
    return {
      fg: null,
      bg: null,
      fgBasicIndex: null,
      bgBasicIndex: null,
      bold: false,
      dim: false,
      italic: false,
      underline: false,
      inverse: false
    };
  }

  class AnsiParser {
    constructor() {
      this.state = defaultState();
      this.pending = '';
      this.link = null;
    }

    reset() {
      this.state = defaultState();
      this.pending = '';
      this.link = null;
    }

    parse(input) {
      return this.parseChunk(input, false);
    }

    parseDetailed(input) {
      return this.parseChunk(input, true);
    }

    parseChunk(input, includePlainText) {
      const text = this.pending + String(input ?? '');
      this.pending = '';
      const runs = [];
      const plainParts = includePlainText ? [] : null;

      const appendPlain = (plain) => {
        if (!plain) return;
        runs.push({
          text: plain,
          style: { ...this.state },
          link: this.link
        });
        if (plainParts) plainParts.push(plain);
      };

      for (let i = 0; i < text.length;) {
        const escape = text.indexOf('\x1b', i);
        if (escape === -1) {
          appendPlain(text.slice(i));
          break;
        }
        if (escape > i) appendPlain(text.slice(i, escape));
        i = escape;

        if (i + 1 >= text.length) {
          this.pending = text.slice(i);
          break;
        }

        const introducer = text[i + 1];
        if (introducer === '[') {
          let end = i + 2;
          while (end < text.length) {
            const code = text.charCodeAt(end);
            if (code >= 0x40 && code <= 0x7e) break;
            end += 1;
          }
          if (end >= text.length) {
            this.pending = text.slice(i);
            break;
          }
          const finalByte = text[end];
          if (finalByte === 'm') {
            this.applySgr(text.slice(i + 2, end));
          }
          i = end + 1;
          continue;
        }

        if (introducer === ']') {
          let end = i + 2;
          let contentEnd = -1;
          while (end < text.length) {
            if (text.charCodeAt(end) === 0x07) {
              contentEnd = end;
              end += 1;
              break;
            }
            if (text.charCodeAt(end) === 0x1b && text[end + 1] === '\\') {
              contentEnd = end;
              end += 2;
              break;
            }
            end += 1;
          }
          if (contentEnd === -1) {
            this.pending = text.slice(i);
            break;
          }
          const payload = text.slice(i + 2, contentEnd);
          const parsed = typeof osc8Api.parseOsc8Payload === 'function'
            ? osc8Api.parseOsc8Payload(payload)
            : null;
          if (parsed) {
            this.link = parsed.available && parsed.kind !== 'close'
              ? parsed.uri
              : null;
          }
          i = end;
          continue;
        }

        i += 2;
      }

      return plainParts
        ? { runs, plainText: plainParts.join('') }
        : runs;
    }

    applySgr(raw) {
      const codes = raw === '' ? [0] : raw.split(';').map((value) => {
        const parsed = Number.parseInt(value || '0', 10);
        return Number.isFinite(parsed) ? parsed : 0;
      });

      for (let i = 0; i < codes.length; i += 1) {
        const code = codes[i];
        if (code === 0) this.state = defaultState();
        else if (code === 1) this.state.bold = true;
        else if (code === 2) this.state.dim = true;
        else if (code === 3) this.state.italic = true;
        else if (code === 4) this.state.underline = true;
        else if (code === 7) this.state.inverse = true;
        else if (code === 22) { this.state.bold = false; this.state.dim = false; }
        else if (code === 23) this.state.italic = false;
        else if (code === 24) this.state.underline = false;
        else if (code === 27) this.state.inverse = false;
        else if (code >= 30 && code <= 37) {
          this.state.fgBasicIndex = code - 30;
          this.state.fg = BASIC[this.state.fgBasicIndex];
        } else if (code === 39) {
          this.state.fg = null;
          this.state.fgBasicIndex = null;
        } else if (code >= 40 && code <= 47) {
          this.state.bgBasicIndex = code - 40;
          this.state.bg = BASIC[this.state.bgBasicIndex];
        } else if (code === 49) {
          this.state.bg = null;
          this.state.bgBasicIndex = null;
        } else if (code >= 90 && code <= 97) {
          this.state.fgBasicIndex = 8 + code - 90;
          this.state.fg = BASIC[this.state.fgBasicIndex];
        } else if (code >= 100 && code <= 107) {
          this.state.bgBasicIndex = 8 + code - 100;
          this.state.bg = BASIC[this.state.bgBasicIndex];
        } else if ((code === 38 || code === 48) && codes[i + 1] === 5 && codes[i + 2] !== undefined) {
          const value = xtermColor(codes[i + 2]);
          if (code === 38) {
            this.state.fg = value;
            this.state.fgBasicIndex = null;
          } else {
            this.state.bg = value;
            this.state.bgBasicIndex = null;
          }
          i += 2;
        } else if ((code === 38 || code === 48) && codes[i + 1] === 2 && codes[i + 4] !== undefined) {
          const r = Math.max(0, Math.min(255, codes[i + 2]));
          const g = Math.max(0, Math.min(255, codes[i + 3]));
          const b = Math.max(0, Math.min(255, codes[i + 4]));
          const value = `rgb(${r}, ${g}, ${b})`;
          if (code === 38) {
            this.state.fg = value;
            this.state.fgBasicIndex = null;
          } else {
            this.state.bg = value;
            this.state.bgBasicIndex = null;
          }
          i += 4;
        }
      }
    }
  }

  function styleToCss(style) {
    let foreground = style.fg;
    let background = style.bg;

    // Match macOS Terminal and established MUD clients: bold standard ANSI
    // foreground colors use the corresponding bright color. Extended
    // 256-color and truecolor values remain exactly as NukeFire sent them.
    if (
      style.bold &&
      Number.isInteger(style.fgBasicIndex) &&
      style.fgBasicIndex >= 0 &&
      style.fgBasicIndex <= 7
    ) {
      foreground = BASIC[style.fgBasicIndex + 8];
    }

    if (style.inverse) [foreground, background] = [background, foreground];
    return {
      color: foreground || '',
      backgroundColor: background || '',
      fontWeight: style.bold ? '700' : '',
      fontStyle: style.italic ? 'italic' : '',
      textDecoration: style.underline ? 'underline' : '',
      opacity: style.dim ? '0.72' : ''
    };
  }

  function stripAnsi(text) {
    const source = String(text ?? '');
    if (!source.includes('\x1b')) return source;
    return source
      .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
      .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  }

  return { AnsiParser, styleToCss, stripAnsi, xtermColor };
});
