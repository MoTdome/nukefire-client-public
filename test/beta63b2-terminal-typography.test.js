const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  XtermTerminalAdapter,
  runsToAnsi,
  terminalTypography
} = require('../renderer/xterm-adapter');
class FakeTerminal {
  constructor(options = {}) {
    this.options = { ...options };
    this.cols = 80;
    this.rows = 24;
    this.buffer = { active: { viewportY: 0, baseY: 0 } };
    this.writes = [];
    this.loaded = [];
  }
  loadAddon(addon) { this.loaded.push(addon); }
  open(container) { this.container = container; }
  onScroll() { return { dispose() {} }; }
  write(data, callback) { this.writes.push(data); callback?.(); }
  scrollToBottom() { this.buffer.active.viewportY = this.buffer.active.baseY; }
}

class FakeFitAddon {
  constructor() { this.fits = 0; }
  fit() { this.fits += 1; }
}

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');

test('standard terminal typography keeps NukeFire color ownership in the adapter', () => {
  const typography = terminalTypography('menlo', false);
  assert.deepEqual(typography, {
    profile: 'standard',
    customGlyphs: true,
    drawBoldTextInBrightColors: false,
    fontWeight: '400',
    fontWeightBold: '700',
    letterSpacing: 0,
    lineHeight: 1.25,
    rescaleOverlappingGlyphs: false
  });
  assert.match(runsToAnsi([{ text: 'red', style: { fgBasicIndex: 1, bold: true } }]), /\x1b\[1;91m/u);
});

test('Fixedsys profile avoids synthetic bold width changes and lets the font draw its own symbols', () => {
  const typography = terminalTypography('fixedsys', false);
  assert.equal(typography.customGlyphs, false);
  assert.equal(typography.fontWeightBold, '400');
  assert.equal(typography.rescaleOverlappingGlyphs, true);
  assert.equal(typography.drawBoldTextInBrightColors, false);
});

test('Fixedsys profile reaches live xterm options and restores standard metrics when fonts change', () => {
  const adapter = new XtermTerminalAdapter({
    container: {},
    TerminalCtor: FakeTerminal,
    FitAddonCtor: FakeFitAddon,
    fontFamily: '"Fixedsys Excelsior", monospace',
    fontProfile: 'fixedsys'
  });
  assert.equal(adapter.initialize(), true);
  assert.equal(adapter.terminal.options.customGlyphs, false);
  assert.equal(adapter.terminal.options.fontWeightBold, '400');
  assert.equal(adapter.terminal.options.rescaleOverlappingGlyphs, true);

  adapter.setFontFamily('Menlo, monospace', 'menlo');
  assert.equal(adapter.terminal.options.customGlyphs, true);
  assert.equal(adapter.terminal.options.fontWeightBold, '700');
  assert.equal(adapter.terminal.options.rescaleOverlappingGlyphs, false);
});

test('normal line spacing is tighter while compact mode remains deliberately compact', () => {
  const adapter = new XtermTerminalAdapter({ container: {}, TerminalCtor: FakeTerminal });
  adapter.initialize();
  assert.equal(adapter.terminal.options.lineHeight, 1.25);
  adapter.setCompact(true);
  assert.equal(adapter.terminal.options.lineHeight, 1.12);
  adapter.setCompact(false);
  assert.equal(adapter.terminal.options.lineHeight, 1.25);
  assert.match(css, /--terminal-line-height:\s*1\.25;/u);
});

test('renderer passes the selected terminal font profile instead of only the fallback family string', () => {
  assert.match(renderer, /setFontFamily\?\.\(TERMINAL_FONT_FAMILIES\[state\.terminalFont\], state\.terminalFont, \{ fit: false \}\)/u);
  assert.match(renderer, /fontProfile:\s*state\.terminalFont/u);
  assert.match(renderer, /TERMINAL_IDLE_FLUSH_DELAY_MS\s*=\s*2;/u);
});
