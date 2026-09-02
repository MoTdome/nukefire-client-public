'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const osc8Links = require('../src/osc8-links');

function waitForBootstrap(dom) {
  return new Promise((resolve) => dom.window.setTimeout(resolve, 20));
}

function createXtermRenderer(options = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://nukefire.test/' });
  const handlers = {};
  const instances = [];
  const sent = [];
  const opened = [];

  class FakeXtermAdapter {
    constructor(config) {
      this.config = config;
      this.ready = false;
      this.calls = [];
      this.dimensions = { width: 100, height: 36 };
      instances.push(this);
    }

    initialize() { this.ready = options.initialize !== false; this.calls.push(['initialize']); return this.ready; }
    setTheme(theme, monochrome) { this.calls.push(['setTheme', theme, monochrome]); }
    setFontSize(value) { this.calls.push(['setFontSize', value]); }
    setCompact(value) { this.calls.push(['setCompact', value]); }
    setScreenReaderMode(value) { this.calls.push(['setScreenReaderMode', value]); }
    replaceRuns(runs, config) { this.calls.push(['replaceRuns', JSON.parse(JSON.stringify(runs)), config]); }
    writeRuns(runs, config) { this.calls.push(['writeRuns', JSON.parse(JSON.stringify(runs)), config]); }
    writeAnsi(text, config) { this.calls.push(['writeAnsi', String(text), config]); }
    fit() { this.calls.push(['fit']); }
    scrollToBottom() { this.calls.push(['scrollToBottom']); this.atLiveBottom = true; }
    scrollPages(amount) { this.calls.push(['scrollPages', amount]); this.atLiveBottom = Number(amount) > 0; }
    size() { return this.dimensions; }
    isAtLiveBottom() { return this.atLiveBottom !== false; }
    focus() { this.calls.push(['focus']); }
    clear() { this.calls.push(['clear']); }
    findNext(query, config) { this.calls.push(['findNext', query, config]); return query === 'reactor'; }
    findPrevious(query, config) { this.calls.push(['findPrevious', query, config]); return query === 'reactor'; }
  }

  dom.window.NukeFireAnsi = ansi;
  dom.window.NukeFireOsc8 = osc8Links;
  dom.window.NukeFireXterm = {
    XtermTerminalAdapter: FakeXtermAdapter
  };
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async (command) => { sent.push(String(command)); return { ok: true }; },
    sendGmcp: async () => ({ ok: true }),
    openExternalLink: async (url) => { opened.push(String(url)); return { ok: true }; },
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    loadSettings: async () => ({
      ok: true,
      settings: {
        schemaVersion: 20,
        connection: { host: 'tdome.nukefire.org', port: 4000 },
        input: { repeatLastCommandOnEnter: false },
        display: {
          followOutput: true,
          compactOutput: false,
          fontSize: 16,
          theme: {
            preset: 'nukefire', foreground: '#d3d7dc', background: '#050607',
            monochrome: false, version: '2'
          }
        },
        accessibility: { screenReaderMode: false, announceImportant: true }
      }
    }),
    saveSettings: async () => ({ ok: true }),
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onGmcpState: (callback) => { handlers.gmcpState = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onProtocolWarning: () => {},
    onCharset: () => {},
    onTerminalType: () => {},
    onWindowSize: () => {},
    onError: (callback) => { handlers.error = callback; },
    onMenuConnect: () => {},
    onMenuFind: () => {},
    onMenuPreferences: () => {},
    onMenuFocusCommand: () => {},
    onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {},
    onMenuReadVitals: () => {}
  };

  dom.window.eval(source);
  return { dom, handlers, instances, sent, opened };
}

test('xterm-only terminal restores the transcript and receives live output', async () => {
  const { dom, handlers, instances } = createXtermRenderer();
  await waitForBootstrap(dom);

  const document = dom.window.document;
  assert.equal(instances.length, 1);
  assert.equal(document.querySelector('#terminal-engine'), null);
  assert.equal(document.querySelector('#output').classList.contains('xterm-output'), true);
  assert.equal(document.querySelector('#terminal-recovery').hidden, true);

  const adapter = instances[0];
  const skipOutput = document.querySelector('a[href="#output"]');
  assert.ok(skipOutput);
  skipOutput.click();
  assert.ok(adapter.calls.some((call) => call[0] === 'focus'));

  const startupText = adapter.calls
    .filter((call) => call[0] === 'replaceRuns' || call[0] === 'writeRuns')
    .flatMap((call) => call[1])
    .map((run) => run.text)
    .join('');
  assert.match(startupText, /Ready\. Press Connect/u);

  handlers.text('\u001b[31mReactor warning\u001b[0m\r\n');
  await new Promise((resolve) => dom.window.setTimeout(resolve, 20));
  const liveWrite = adapter.calls.find((call) => call[0] === 'writeRuns'
    && call[1].some((run) => run.text.includes('Reactor warning')));
  assert.ok(liveWrite);
  const warningRun = liveWrite[1].find((run) => run.text.includes('Reactor warning'));
  assert.equal(warningRun.style.fgBasicIndex, 1);
  assert.equal(adapter.calls.some((call) => call[0] === 'writeAnsi'), false);

  document.querySelector('#find-input').value = 'reactor';
  document.querySelector('#find-next').click();
  assert.ok(adapter.calls.some((call) => call[0] === 'findNext' && call[1] === 'reactor'));

  document.querySelector('#clear-output').click();
  assert.ok(adapter.calls.some((call) => call[0] === 'clear'));
});


test('combat bursts coalesce promptly and never delay outgoing commands', async () => {
  const { dom, handlers, instances, sent } = createXtermRenderer();
  await waitForBootstrap(dom);
  const adapter = instances[0];
  const baselineWrites = adapter.calls.filter((call) => call[0] === 'writeRuns').length;

  handlers.status({ state: 'connected', message: 'Connected', host: 'mud.test', port: 4000 });
  handlers.text('combat one\n');
  handlers.text('combat two\n');
  handlers.text('combat three\n');

  const input = dom.window.document.querySelector('#command');
  input.value = 'kill mutant';
  input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

  assert.deepEqual(sent, ['kill mutant']);
  assert.equal(adapter.calls.filter((call) => call[0] === 'writeRuns').length, baselineWrites);

  await new Promise((resolve) => dom.window.setTimeout(resolve, 20));
  const writes = adapter.calls.filter((call) => call[0] === 'writeRuns').slice(baselineWrites);
  assert.equal(writes.length, 1);
  assert.match(writes[0][1].map((run) => run.text).join(''), /combat one\ncombat two\ncombat three\n/u);
});


test('Page Up and Page Down review terminal scrollback without stealing the command draft', async () => {
  const { dom, instances } = createXtermRenderer();
  await waitForBootstrap(dom);

  const document = dom.window.document;
  const adapter = instances[0];
  const command = document.querySelector('#command');
  command.value = 'cast heal';
  command.focus();

  const pageUp = new dom.window.KeyboardEvent('keydown', {
    key: 'PageUp', bubbles: true, cancelable: true
  });
  command.dispatchEvent(pageUp);
  assert.equal(pageUp.defaultPrevented, true);
  assert.deepEqual(adapter.calls.findLast((call) => call[0] === 'scrollPages'), ['scrollPages', -1]);
  assert.equal(command.value, 'cast heal');
  assert.equal(document.activeElement, command);

  const pageDown = new dom.window.KeyboardEvent('keydown', {
    key: 'PageDown', bubbles: true, cancelable: true
  });
  command.dispatchEvent(pageDown);
  assert.equal(pageDown.defaultPrevented, true);
  assert.deepEqual(adapter.calls.findLast((call) => call[0] === 'scrollPages'), ['scrollPages', 1]);
  assert.equal(command.value, 'cast heal');
  assert.equal(document.activeElement, command);

  const output = document.querySelector('#output');
  const reviewPageUp = new dom.window.KeyboardEvent('keydown', {
    key: 'PageUp', bubbles: true, cancelable: true
  });
  output.dispatchEvent(reviewPageUp);
  assert.equal(reviewPageUp.defaultPrevented, true);
  assert.deepEqual(adapter.calls.findLast((call) => call[0] === 'scrollPages'), ['scrollPages', -1]);

  const modified = new dom.window.KeyboardEvent('keydown', {
    key: 'PageUp', altKey: true, bubbles: true, cancelable: true
  });
  output.dispatchEvent(modified);
  assert.equal(modified.defaultPrevented, false);

  dom.window.close();
});

test('xterm refits after the terminal host or window changes size', async () => {
  const { dom, instances } = createXtermRenderer();
  await waitForBootstrap(dom);

  const adapter = instances[0];
  const before = adapter.calls.filter((call) => call[0] === 'fit').length;
  dom.window.dispatchEvent(new dom.window.Event('resize'));
  await new Promise((resolve) => dom.window.setTimeout(resolve, 20));
  const after = adapter.calls.filter((call) => call[0] === 'fit').length;
  assert.ok(after > before);
});

test('terminal grid pins output to the flexible row and input to the bottom row', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
  assert.match(css, /\.terminal-output-host\s*\{[^}]*grid-row:\s*3;/su);
  assert.match(css, /\.docked-prompt-row\s*\{[^}]*grid-row:\s*4;/su);
  assert.match(css, /\.input-bar\s*\{[^}]*grid-row:\s*5;/su);
  assert.match(css, /\.xterm-output\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*0 0 2px;/su);
});


test('renderer CSP permits xterm runtime styles while keeping inline scripts blocked', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const match = html.match(/Content-Security-Policy" content="([^"]+)/u);
  assert.ok(match);
  const policy = match[1];
  assert.match(policy, /style-src 'self' 'unsafe-inline'/u);
  assert.match(policy, /script-src 'self'(?:;|$)/u);
  assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/u);
});

test('xterm initialization failure preserves state and exposes Retry Terminal', async () => {
  const options = { initialize: false };
  const { dom, instances } = createXtermRenderer(options);
  await waitForBootstrap(dom);

  const document = dom.window.document;
  assert.equal(instances.length, 1);
  assert.equal(document.querySelector('#terminal-engine'), null);
  assert.equal(document.querySelector('#terminal-recovery').hidden, false);
  assert.equal(document.querySelector('#output').getAttribute('aria-hidden'), 'true');
  assert.match(document.querySelector('#terminal-recovery-message').textContent, /connection and reader text remain available/u);
  assert.equal(document.querySelector('#output').textContent, '');

  options.initialize = true;
  document.querySelector('#retry-terminal').click();
  await waitForBootstrap(dom);
  assert.equal(instances.length, 2);
  assert.equal(document.querySelector('#terminal-recovery').hidden, true);
  assert.equal(document.querySelector('#output').hasAttribute('aria-hidden'), false);
  const restore = instances[1].calls.find((call) => call[0] === 'replaceRuns');
  assert.ok(restore);
  assert.match(restore[1].map((run) => run.text).join(''), /Ready\. Press Connect/u);
});


test('OSC 8 links activate safely and remain available from the keyboard command line', async () => {
  const { dom, handlers, instances, sent, opened } = createXtermRenderer();
  await waitForBootstrap(dom);
  handlers.status({ state: 'connected', message: 'Connected' });

  const adapter = instances[0];
  handlers.text('\u001b]8;;send:look\u001b\\Look around\u001b]8;;\u001b\\\r\n');
  handlers.text('\u001b]8;;https://example.com/help\u001b\\Open help\u001b]8;;\u001b\\\r\n');
  await waitForBootstrap(dom);

  await adapter.config.onLinkActivate({ uri: 'prompt:cast%20heal' });
  assert.equal(dom.window.document.querySelector('#command').value, 'cast heal');

  await adapter.config.onLinkActivate({ uri: 'send:look' });
  assert.deepEqual(sent, ['look']);

  await adapter.config.onLinkActivate({ uri: 'https://example.com/help' });
  assert.deepEqual(opened, ['https://example.com/help']);

  const command = dom.window.document.querySelector('#command');
  command.value = '#links';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await waitForBootstrap(dom);
  const listedText = adapter.calls
    .filter((call) => call[0] === 'writeRuns')
    .flatMap((call) => call[1])
    .map((run) => run.text)
    .join('');
  assert.match(listedText, /Recent server hyperlinks/u);
  assert.match(listedText, /#link <number>/u);

  command.value = '#link 2';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await waitForBootstrap(dom);
  assert.deepEqual(sent, ['look', 'look']);

  dom.window.close();
});
