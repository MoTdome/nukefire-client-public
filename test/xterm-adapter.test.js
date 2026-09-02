'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  colorTriplet,
  sanitizeAnsiForXterm,
  normalizeTranscriptText,
  runsToAnsi,
  XtermTerminalAdapter
} = require('../renderer/xterm-adapter');

class FakeTerminal {
  constructor(options) {
    this.options = { ...options };
    this.cols = 100;
    this.rows = 40;
    this.writes = [];
    this.loaded = [];
    this.buffer = { active: { viewportY: 20, baseY: 20 } };
    this.scrolls = 0;
    this.focuses = 0;
    this.clears = 0;
    this.resets = 0;
    this.selection = '';
  }

  loadAddon(addon) { this.loaded.push(addon); }
  open(container) { this.container = container; }
  write(data, callback) { this.writes.push(data); callback?.(); }
  scrollToBottom() { this.scrolls += 1; }
  focus() { this.focuses += 1; }
  clear() { this.clears += 1; }
  reset() { this.resets += 1; }
  getSelection() { return this.selection; }
  hasSelection() { return Boolean(this.selection); }
  clearSelection() { this.selection = ''; }
  dispose() { this.disposed = true; }
}

class FakeFitAddon {
  fit() { this.fits = (this.fits || 0) + 1; }
}

class FakeSearchAddon {
  findNext(term) { this.next = term; return term === 'found'; }
  findPrevious(term) { this.previous = term; return term === 'found'; }
}

class FakeSerializeAddon {
  serialize() { return 'serialized terminal'; }
}

test('xterm adapter API no longer exposes a renderer-selection mode', () => {
  const api = require('../renderer/xterm-adapter');
  assert.equal(Object.hasOwn(api, 'normalizeEngine'), false);
});

test('parses custom terminal colors into bounded RGB triplets', () => {
  assert.deepEqual(colorTriplet('#12abEF'), [18, 171, 239]);
  assert.deepEqual(colorTriplet('rgb(300, 4, 9)'), [255, 4, 9]);
  assert.equal(colorTriplet('red'), null);
});

test('preserves only safe SGR controls for live xterm output', () => {
  const source = '\x1b[31mRed\x1b[2J\x1b]0;title\x07 text\u009b38;5;45mCyan\x1b[0m';
  const output = sanitizeAnsiForXterm(source);
  assert.match(output, /\x1b\[31mRed/u);
  assert.doesNotMatch(output, /2J|title/u);
  assert.match(output, /\x1b\[38;5;45mCyan/u);
  assert.equal(sanitizeAnsiForXterm(source, { monochrome: true }), 'Red textCyan');
});

test('normalizes transcript controls without losing tabs or line structure', () => {
  assert.equal(normalizeTranscriptText('A\r\nB\rC\tD\b!'), 'A\nB\nC\tD!');
});

test('converts stored NukeFire runs back into safe xterm SGR output', () => {
  const output = runsToAnsi([
    { text: 'Red', style: { fgBasicIndex: 1, bold: true }, kind: 'mud' },
    { text: ' true', style: { fg: 'rgb(1, 2, 3)' }, kind: 'mud' },
    { text: '\n[warning]\n', kind: 'error' }
  ]);
  assert.match(output, /\x1b\[0m\x1b\[1;91mRed/u);
  assert.match(output, /\x1b\[0m\x1b\[38;2;1;2;3m true/u);
  assert.match(output, /\x1b\[0m\x1b\[91;3m\n\[warning\]\n/u);
  assert.match(output, /\x1b\[0m$/u);
});

test('client Help uses bold bright cyan without changing its plain text', () => {
  const output = runsToAnsi([
    { text: '\n[NUKEFIRE CLIENT HELP\nUSAGE\n  #help {command}]\n', kind: 'help' }
  ]);
  assert.match(output, /\x1b\[0m\x1b\[96;1m\n\[NUKEFIRE CLIENT HELP/u);
  assert.match(output, /USAGE\n  #help \{command\}/u);
});

test('monochrome xterm output uses the selected foreground without losing text', () => {
  const output = runsToAnsi([
    { text: 'Visible', style: { fgBasicIndex: 1, bold: true }, kind: 'mud' }
  ], { monochrome: true, defaultForeground: '#c0ffee' });
  assert.equal(output, '\x1b[0m\x1b[38;2;192;255;238mVisible\x1b[0m');
});

test('plain xterm runs receive the selected foreground explicitly', () => {
  const output = runsToAnsi([
    { text: 'Base text', style: null, kind: 'mud' }
  ], { defaultForeground: '#d3d7dc' });
  assert.equal(output, '\x1b[0m\x1b[38;2;211;215;220mBase text\x1b[0m');
});

test('initializes xterm with fit, search, serialization, and accessibility options', () => {
  const container = {};
  const adapter = new XtermTerminalAdapter({
    container,
    TerminalCtor: FakeTerminal,
    FitAddonCtor: FakeFitAddon,
    SearchAddonCtor: FakeSearchAddon,
    SerializeAddonCtor: FakeSerializeAddon,
    screenReaderMode: true,
    compact: true,
    fontSize: 18,
    fontFamily: 'Consolas, monospace'
  });
  assert.equal(adapter.initialize(), true);
  assert.equal(adapter.terminal.container, container);
  assert.equal(adapter.terminal.options.disableStdin, true);
  assert.equal(adapter.terminal.options.cursorInactiveStyle, 'none');
  assert.equal(adapter.terminal.options.screenReaderMode, true);
  assert.equal(adapter.terminal.options.lineHeight, 1.12);
  assert.equal(adapter.terminal.options.drawBoldTextInBrightColors, false);
  assert.equal(adapter.terminal.options.customGlyphs, true);
  assert.equal(adapter.terminal.options.fontWeight, '400');
  assert.equal(adapter.terminal.options.fontWeightBold, '700');
  assert.equal(adapter.terminal.options.letterSpacing, 0);
  assert.equal(adapter.terminal.options.fontFamily, 'Consolas, monospace');
  adapter.setFontFamily('Monaco, monospace', 'monaco');
  assert.equal(adapter.terminal.options.fontFamily, 'Monaco, monospace');
  assert.equal(adapter.terminal.options.minimumContrastRatio, 1);
  assert.equal(adapter.terminal.options.tabStopWidth, 4);
  assert.equal(adapter.terminal.options.theme.red, '#aa0000');
  assert.equal(adapter.terminal.options.theme.brightRed, '#ff5555');
  assert.equal(adapter.terminal.options.theme.brightWhite, '#ffffff');
  assert.equal(adapter.terminal.loaded.length, 3);
  assert.equal(adapter.fitAddon.fits, 2);
});

test('writes live filtered ANSI directly so NukeFire colors reach xterm unchanged', () => {
  const adapter = new XtermTerminalAdapter({ container: {}, TerminalCtor: FakeTerminal });
  assert.equal(adapter.writeAnsi('\x1b[38;5;45mCyan\x1b[0m\n', { follow: true }), true);
  assert.equal(adapter.terminal.writes[0], '\x1b[38;5;45mCyan\x1b[0m\n');
  assert.equal(adapter.terminal.scrolls, 1);
});

test('writes ordered runs and follows the live edge only when requested', () => {
  const adapter = new XtermTerminalAdapter({ container: {}, TerminalCtor: FakeTerminal });
  assert.equal(adapter.writeRuns([{ text: 'room\n', style: null }], { follow: false }), true);
  assert.equal(adapter.terminal.scrolls, 0);
  assert.match(adapter.terminal.writes[0], /\x1b\[38;2;211;215;220mroom\n/u);
  adapter.writeRuns([{ text: 'prompt>', style: null }], { follow: true });
  assert.equal(adapter.terminal.scrolls, 1);
});

test('replaces, clears, focuses, sizes, searches, and serializes xterm state', () => {
  const adapter = new XtermTerminalAdapter({
    container: {}, TerminalCtor: FakeTerminal,
    SearchAddonCtor: FakeSearchAddon,
    SerializeAddonCtor: FakeSerializeAddon
  });
  adapter.replaceRuns([{ text: 'restored', style: null }], { follow: true });
  assert.equal(adapter.terminal.resets, 1);
  assert.equal(adapter.terminal.clears, 1);
  assert.deepEqual(adapter.size(), { width: 100, height: 40 });
  assert.equal(adapter.findNext('found'), true);
  assert.equal(adapter.findPrevious('missing'), false);
  assert.equal(adapter.serialize(), 'serialized terminal');
  adapter.focus();
  adapter.terminal.selection = 'copied scrollback';
  assert.equal(adapter.hasSelection(), true);
  assert.equal(adapter.getSelection(), 'copied scrollback');
  adapter.clearSelection();
  assert.equal(adapter.hasSelection(), false);
  adapter.clear();
  assert.equal(adapter.terminal.focuses, 1);
  assert.equal(adapter.terminal.clears, 2);
});

test('detects whether the xterm viewport is still at the live bottom', () => {
  const adapter = new XtermTerminalAdapter({ container: {}, TerminalCtor: FakeTerminal });
  adapter.initialize();
  assert.equal(adapter.isAtLiveBottom(), true);
  adapter.terminal.buffer.active.viewportY = 18;
  assert.equal(adapter.isAtLiveBottom(), false);
});

test('serializes live writes before a session replacement to avoid cross-session output', () => {
  class AsyncTerminal extends FakeTerminal {
    write(data, callback) {
      this.writes.push(data);
      this.pendingCallback = callback;
    }
  }

  const adapter = new XtermTerminalAdapter({ container: {}, TerminalCtor: AsyncTerminal });
  adapter.writeRuns([{ text: 'old session\n', style: null }]);
  adapter.replaceRuns([{ text: 'new session\n', style: null }]);

  assert.equal(adapter.terminal.resets, 0);
  assert.equal(adapter.terminal.writes.length, 1);
  adapter.terminal.pendingCallback();
  assert.equal(adapter.terminal.resets, 1);
  assert.equal(adapter.terminal.clears, 1);
  assert.equal(adapter.terminal.writes.length, 2);
  assert.match(adapter.terminal.writes[1], /new session/u);
});


test('re-emits safe OSC 8 runs and routes activation through the protected link handler', () => {
  const activated = [];
  const container = { title: 'Terminal output' };
  const adapter = new XtermTerminalAdapter({
    container,
    TerminalCtor: FakeTerminal,
    onLinkActivate: (payload) => activated.push(payload)
  });
  adapter.writeRuns([{ text: 'Look', style: null, link: 'send:look' }]);
  assert.match(adapter.terminal.writes[0], /\x1b\]8;;send:look\x1b\\/u);
  assert.match(adapter.terminal.writes[0], /Look\x1b\]8;;\x1b\\/u);
  assert.equal(adapter.terminal.options.linkHandler.allowNonHttpProtocols, true);
  adapter.terminal.options.linkHandler.hover({}, 'send:look', { start: { x: 1, y: 1 } });
  assert.equal(container.title, 'Send command: look');
  adapter.terminal.options.linkHandler.activate({ metaKey: true }, 'send:look', { start: { x: 1, y: 1 } });
  assert.equal(activated[0].uri, 'send:look');
  assert.equal(activated[0].modifiers.metaKey, true);
  adapter.terminal.options.linkHandler.leave({}, 'send:look', {});
  assert.equal(container.title, 'Terminal output');
});
