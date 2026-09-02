'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { XtermTerminalAdapter } = require('../renderer/xterm-adapter');

class FakeTerminal {
  constructor(options = {}) {
    this.options = { ...options };
    this.loaded = [];
    this._unicode = {
      activeVersion: '6',
      providers: new Map(),
      register: (provider) => {
        this._unicode.providers.set(provider.version, provider);
      }
    };
    this.buffer = { active: { viewportY: 0, baseY: 0 } };
    this.cols = 80;
    this.rows = 24;
  }
  get unicode() {
    if (!this.options.allowProposedApi) {
      throw new Error('You must set the allowProposedApi option to true to use proposed API');
    }
    return this._unicode;
  }
  loadAddon(addon) { this.loaded.push(addon); }
  open(container) { this.container = container; }
  onScroll() { return { dispose() {} }; }
  dispose() {}
}

function widthProperty(width, shouldJoin = false) {
  return ((Number(width) & 3) << 1) | (shouldJoin ? 1 : 0);
}

class FakeUnicode11Provider {
  constructor() { this.version = '11'; }
  wcwidth(codepoint) {
    if (codepoint === 0x1F525 || codepoint === 0x1F4D6) return 2;
    if (codepoint === 0x1FAA8) return 1;
    return codepoint < 32 ? 0 : 1;
  }
  charProperties(codepoint) { return widthProperty(this.wcwidth(codepoint)); }
}

class FakeUnicode11Addon {
  activate(terminal) { terminal.unicode.register(new FakeUnicode11Provider()); }
  dispose() {}
}

test('terminal activates Unicode 11 plus newer emoji width corrections', () => {
  const adapter = new XtermTerminalAdapter({
    container: {},
    TerminalCtor: FakeTerminal,
    Unicode11AddonCtor: FakeUnicode11Addon
  });
  assert.equal(adapter.initialize(), true);
  assert.equal(adapter.terminal.options.allowProposedApi, true);
  assert.equal(adapter.terminal.unicode.activeVersion, '11+nukefire-emoji');
  assert.equal(adapter.terminal.loaded.some((addon) => addon instanceof FakeUnicode11Addon), true);
  const provider = adapter.terminal.unicode.providers.get('11+nukefire-emoji');
  assert.ok(provider);
  assert.equal(provider.wcwidth('🔥'.codePointAt(0)), 2);
  assert.equal(provider.wcwidth('📖'.codePointAt(0)), 2);
  assert.equal(provider.wcwidth('🪨'.codePointAt(0)), 2);
  assert.equal(provider.wcwidth('A'.codePointAt(0)), 1);
  assert.equal((provider.charProperties('🪨'.codePointAt(0), 0) >> 1) & 3, 2);
});

test('renderer package ships the Unicode width addon before the NukeFire xterm adapter', () => {
  const root = path.join(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies['@xterm/addon-unicode11'], '0.9.0');
  assert.ok(pkg.build.files.includes('node_modules/@xterm/addon-unicode11/**/*'));

  const html = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const unicodeIndex = html.indexOf('@xterm/addon-unicode11/lib/addon-unicode11.js');
  const adapterIndex = html.indexOf('xterm-adapter.js');
  assert.ok(unicodeIndex >= 0 && adapterIndex > unicodeIndex);
});

test('Chromium DOM terminal disables contextual wide-character spacing compression', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
  assert.match(css, /\.xterm-output \.xterm\s*\{[^}]*text-spacing-trim:\s*space-all;/su);
});


test('Unicode addon failure never prevents terminal initialization', () => {
  class ThrowingUnicodeAddon {
    constructor() { throw new Error('synthetic addon failure'); }
  }
  const adapter = new XtermTerminalAdapter({
    container: {},
    TerminalCtor: FakeTerminal,
    Unicode11AddonCtor: ThrowingUnicodeAddon
  });
  assert.equal(adapter.initialize(), true);
  assert.equal(adapter.ready, true);
  assert.equal(adapter.unicode11Addon, null);
});
