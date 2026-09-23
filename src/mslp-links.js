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

  function safeText(value, maximum) {
    const text = String(value ?? '').replace(/[\r\n\u0000\u007f]/gu, '').trim();
    return text.slice(0, maximum);
  }

  function encodeUri(kind, value) {
    return `nukefire-mslp-${kind}:${encodeURIComponent(value)}`;
  }

  function parseBracePairs(value) {
    const source = String(value || '');
    const parts = [];
    let index = 0;
    while (index < source.length && parts.length < MAX_MENU_ITEMS * 2) {
      while (/\s/u.test(source[index] || '')) index += 1;
      if (source[index] !== '{') break;
      index += 1;
      let depth = 1;
      let text = '';
      let escaped = false;
      while (index < source.length && depth > 0) {
        const char = source[index++];
        if (escaped) { text += char; escaped = false; continue; }
        if (char === '\\') { text += char; escaped = true; continue; }
        if (char === '{') { depth += 1; text += char; continue; }
        if (char === '}') { depth -= 1; if (depth > 0) text += char; continue; }
        text += char;
      }
      if (depth !== 0) break;
      parts.push(text);
    }
    const items = [];
    for (let i = 0; i + 1 < parts.length && items.length < MAX_MENU_ITEMS; i += 2) {
      const label = safeText(parts[i], MAX_LABEL);
      const command = safeText(parts[i + 1], MAX_COMMAND);
      if (label && command) items.push({ label, command });
    }
    return items;
  }

  function resolveMslpUri(value) {
    const source = String(value || '');
    const sendPrefix = 'nukefire-mslp-send:';
    const menuPrefix = 'nukefire-mslp-menu:';
    try {
      if (source.startsWith(sendPrefix)) {
        const command = safeText(decodeURIComponent(source.slice(sendPrefix.length)), MAX_COMMAND);
        return command ? { available: true, kind: 'send', value: command, items: [] } : { available: false, kind: 'unsupported', value: '', items: [] };
      }
      if (source.startsWith(menuPrefix)) {
        const raw = decodeURIComponent(source.slice(menuPrefix.length));
        const items = parseBracePairs(raw);
        return items.length ? { available: true, kind: 'menu', value: '', items } : { available: false, kind: 'unsupported', value: '', items: [] };
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
    }

    reset() {
      this.pending = '';
      this.active = null;
      this.underline = false;
      this.underlineOpen = '';
      this.underlineText = '';
    }

    linkUri() {
      if (this.active?.kind === 'send') return encodeUri('send', safeText(this.active.value, MAX_COMMAND));
      if (this.active?.kind === 'menu') return encodeUri('menu', String(this.active.value || '').slice(0, 4096));
      const fallback = safeText(this.underlineText, MAX_COMMAND);
      return fallback ? encodeUri('send', fallback) : '';
    }

    closeUnderline() {
      const uri = this.linkUri();
      const text = `${this.underlineOpen}${this.underlineText}${ESC}[24m`;
      const output = uri ? `${ESC}]8;;${uri}${ESC}\\${text}${ESC}]8;;${ESC}\\` : text;
      this.underline = false;
      this.underlineOpen = '';
      this.underlineText = '';
      this.active = null;
      return output;
    }

    push(value) {
      let source = this.pending + String(value ?? '');
      this.pending = '';
      let output = '';
      let index = 0;
      while (index < source.length) {
        if (this.underline && source.startsWith(`${ESC}[24m`, index)) {
          output += this.closeUnderline();
          index += 5;
          continue;
        }
        if (!this.underline && (source.startsWith(`${ESC}[4m`, index) || source.startsWith(`${ESC}[4;24m`, index))) {
          this.underline = true;
          this.underlineOpen = source.startsWith(`${ESC}[4;24m`, index) ? `${ESC}[4;24m` : `${ESC}[4m`;
          this.underlineText = '';
          index += this.underlineOpen.length;
          continue;
        }
        if (!this.underline && source.startsWith(`${ESC}]68;`, index)) {
          const bell = source.indexOf(BEL, index + 5);
          const st = source.indexOf(`${ESC}\\`, index + 5);
          let end = -1;
          let termLength = 0;
          if (bell !== -1 && (st === -1 || bell < st)) { end = bell; termLength = 1; }
          else if (st !== -1) { end = st; termLength = 2; }
          if (end === -1) { this.pending = source.slice(index); break; }
          const payload = source.slice(index + 5, end);
          const first = payload.indexOf(';');
          const second = first === -1 ? -1 : payload.indexOf(';', first + 1);
          const mode = first === -1 ? payload : payload.slice(0, first);
          const type = second === -1 ? '' : payload.slice(first + 1, second).trim().toUpperCase();
          const argument = second === -1 ? '' : payload.slice(second + 1);
          if (mode === '1') {
            if (type === 'SEND') this.active = { kind: 'send', value: safeText(argument, MAX_COMMAND) };
            else if (type === 'MENU') this.active = { kind: 'menu', value: argument.slice(0, 4096) };
            else this.active = null;
          } else {
            // Secure/server-script variants are intentionally never executable.
            this.active = null;
          }
          index = end + termLength;
          continue;
        }
        if (source.charCodeAt(index) === 0x1b && index + 1 >= source.length) {
          this.pending = source.slice(index);
          break;
        }
        if (this.underline) this.underlineText += source[index];
        else output += source[index];
        index += 1;
      }
      return output;
    }
  }

  return Object.freeze({ MslpTranslator, resolveMslpUri, parseBracePairs });
});
