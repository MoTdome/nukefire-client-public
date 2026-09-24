(function attachMslpLinks(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireMslpLinks = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createMslpLinksApi() {
  'use strict';

  const ESC = '\x1b';
  const BEL = '\x07';
  const MAX_COMMAND = 1024;
  const MAX_LABEL = 256;
  const MAX_MENU_ITEMS = 32;
  const MAX_MENU_PAYLOAD = 4096;

  function safeText(value, maximum) {
    const text = String(value ?? '').replace(/[\r\n\u0000\u007f]/gu, '').trim();
    return text.slice(0, maximum);
  }

  function encodeUri(kind, value) {
    return `nukefire-mslp-${kind}:${encodeURIComponent(value)}`;
  }

  /* MSLP MENU deliberately does not have an escape syntax. Curly braces inside
   * labels/commands are invalid, and backslash is ordinary literal data.
   * Reject malformed/trailing partial menus rather than accepting a safe-looking
   * prefix from a malformed server payload.
   */
  function parseBracePairs(value) {
    const source = String(value || '').slice(0, MAX_MENU_PAYLOAD);
    const parts = [];
    let index = 0;

    while (index < source.length) {
      while (/\s/u.test(source[index] || '')) index += 1;
      if (index >= source.length) break;
      if (source[index] !== '{') return [];

      const close = source.indexOf('}', index + 1);
      if (close === -1) return [];
      const body = source.slice(index + 1, close);
      if (body.includes('{')) return [];
      parts.push(body);
      if (parts.length > MAX_MENU_ITEMS * 2) return [];
      index = close + 1;
    }

    if (!parts.length || parts.length % 2 !== 0) return [];

    const items = [];
    for (let i = 0; i < parts.length; i += 2) {
      const label = safeText(parts[i], MAX_LABEL);
      const command = safeText(parts[i + 1], MAX_COMMAND);
      if (!label || !command) return [];
      items.push({ label, command });
    }
    return items;
  }

  function resolveMslpUri(value) {
    const source = String(value || '');
    const sendPrefix = 'nukefire-mslp-send:';
    const promptPrefix = 'nukefire-mslp-prompt:';
    const menuPrefix = 'nukefire-mslp-menu:';

    try {
      if (source.startsWith(sendPrefix)) {
        const command = safeText(decodeURIComponent(source.slice(sendPrefix.length)), MAX_COMMAND);
        return command
          ? { available: true, kind: 'send', value: command, items: [] }
          : { available: false, kind: 'unsupported', value: '', items: [] };
      }
      if (source.startsWith(promptPrefix)) {
        const command = safeText(decodeURIComponent(source.slice(promptPrefix.length)), MAX_COMMAND);
        return command
          ? { available: true, kind: 'prompt', value: command, items: [] }
          : { available: false, kind: 'unsupported', value: '', items: [] };
      }
      if (source.startsWith(menuPrefix)) {
        const raw = decodeURIComponent(source.slice(menuPrefix.length));
        const items = parseBracePairs(raw);
        return items.length
          ? { available: true, kind: 'menu', value: '', items }
          : { available: false, kind: 'unsupported', value: '', items: [] };
      }
    } catch (_error) {}

    return { available: false, kind: 'unsupported', value: '', items: [] };
  }

  class MslpTranslator {
    constructor() {
      this.pending = '';
      this.active = null;
      this.underline = false;
      this.underlineOpen = '';
      this.underlineText = '';
      this.suppressNextUnderlineLink = false;
      this.suppressCurrentUnderlineLink = false;
    }

    reset() {
      this.pending = '';
      this.active = null;
      this.underline = false;
      this.underlineOpen = '';
      this.underlineText = '';
      this.suppressNextUnderlineLink = false;
      this.suppressCurrentUnderlineLink = false;
    }

    linkUri() {
      if (this.suppressCurrentUnderlineLink) return '';
      if (this.active?.kind === 'send') return encodeUri('send', safeText(this.active.value, MAX_COMMAND));
      if (this.active?.kind === 'prompt') return encodeUri('prompt', safeText(this.active.value, MAX_COMMAND));
      if (this.active?.kind === 'menu') return encodeUri('menu', String(this.active.value || '').slice(0, MAX_MENU_PAYLOAD));
      const fallback = safeText(this.underlineText, MAX_COMMAND);
      return fallback ? encodeUri('send', fallback) : '';
    }

    clearUnderlineState() {
      this.underline = false;
      this.underlineOpen = '';
      this.underlineText = '';
      this.active = null;
      this.suppressCurrentUnderlineLink = false;
    }

    abortUnderline() {
      const text = `${this.underlineOpen}${this.underlineText}`;
      this.clearUnderlineState();
      return text;
    }

    closeUnderline() {
      const uri = this.linkUri();
      const text = `${this.underlineOpen}${this.underlineText}${ESC}[24m`;
      const output = uri ? `${ESC}]8;;${uri}${ESC}\\${text}${ESC}]8;;${ESC}\\` : text;
      this.clearUnderlineState();
      return output;
    }

    setComplexLink(mode, type, argument) {
      this.active = null;
      this.suppressNextUnderlineLink = false;

      if (mode !== '1') {
        this.suppressNextUnderlineLink = true;
        return;
      }

      if (type === 'SEND') {
        const command = safeText(argument, MAX_COMMAND);
        if (command) this.active = { kind: 'send', value: command };
        else this.suppressNextUnderlineLink = true;
        return;
      }

      if (type === 'PROMPT') {
        const command = safeText(argument, MAX_COMMAND);
        if (command) this.active = { kind: 'prompt', value: command };
        else this.suppressNextUnderlineLink = true;
        return;
      }

      if (type === 'MENU') {
        const menu = String(argument || '').slice(0, MAX_MENU_PAYLOAD);
        if (parseBracePairs(menu).length) this.active = { kind: 'menu', value: menu };
        else this.suppressNextUnderlineLink = true;
        return;
      }

      this.suppressNextUnderlineLink = true;
    }

    push(value) {
      const source = this.pending + String(value ?? '');
      this.pending = '';
      let output = '';
      let index = 0;

      while (index < source.length) {
        if (this.underline && source.startsWith(`${ESC}[24m`, index)) {
          output += this.closeUnderline();
          index += 5;
          continue;
        }

        if (this.underline && source.charCodeAt(index) === 0x1b) {
          const exactClose = `${ESC}[24m`;
          const remaining = source.slice(index);
          if (remaining.length < exactClose.length && exactClose.startsWith(remaining)) {
            this.pending = remaining;
            break;
          }

          /* MSLP simple links are delimited by the exact ESC[4m / ESC[24m
           * pair. Any other escape sequence means this was ordinary terminal
           * styling (or a malformed link), so fail open and let the normal ANSI
           * pipeline process the control sequence instead of buffering the
           * session forever.
           */
          output += this.abortUnderline();
          continue;
        }

        if (this.underline && (source[index] === '\r' || source[index] === '\n' || this.underlineText.length >= MAX_COMMAND)) {
          /* A simple link may not consume an unbounded line/session. Newline
           * and the command-length ceiling are fail-open boundaries.
           */
          output += this.abortUnderline();
          continue;
        }

        if (!this.underline && (source.startsWith(`${ESC}[4m`, index) || source.startsWith(`${ESC}[4;24m`, index))) {
          this.underline = true;
          this.underlineOpen = source.startsWith(`${ESC}[4;24m`, index) ? `${ESC}[4;24m` : `${ESC}[4m`;
          this.underlineText = '';
          this.suppressCurrentUnderlineLink = this.suppressNextUnderlineLink;
          this.suppressNextUnderlineLink = false;
          index += this.underlineOpen.length;
          continue;
        }

        if (!this.underline && source.startsWith(`${ESC}]68;`, index)) {
          const bell = source.indexOf(BEL, index + 5);
          const st = source.indexOf(`${ESC}\\`, index + 5);
          let end = -1;
          let termLength = 0;
          if (bell !== -1 && (st === -1 || bell < st)) {
            end = bell;
            termLength = 1;
          } else if (st !== -1) {
            end = st;
            termLength = 2;
          }
          if (end === -1) {
            this.pending = source.slice(index);
            break;
          }

          const payload = source.slice(index + 5, end);
          const first = payload.indexOf(';');
          const second = first === -1 ? -1 : payload.indexOf(';', first + 1);
          const mode = first === -1 ? payload : payload.slice(0, first);
          const type = second === -1 ? '' : payload.slice(first + 1, second).trim();
          const argument = second === -1 ? '' : payload.slice(second + 1);
          this.setComplexLink(mode, type, argument);
          index = end + termLength;
          continue;
        }

        if (source.charCodeAt(index) === 0x1b && index + 1 >= source.length) {
          this.pending = source.slice(index);
          break;
        }

        if (this.underline) {
          this.underlineText += source[index];
        } else {
          /* Complex MSLP prefixes apply to the immediately following link. If
           * ordinary visible data arrives first, discard the pending command so
           * a later unrelated underline can never inherit stale authority.
           */
          if (source.charCodeAt(index) !== 0x1b && (this.active || this.suppressNextUnderlineLink)) {
            this.active = null;
            this.suppressNextUnderlineLink = false;
          }
          output += source[index];
        }
        index += 1;
      }

      return output;
    }
  }

  return Object.freeze({ MslpTranslator, resolveMslpUri, parseBracePairs });
});
