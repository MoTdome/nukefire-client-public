'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const { installFakeXterm } = require('./fake-xterm');
const communicationsApi = require('../src/communications');
const sessionRuntime = require('../src/session-runtime');

const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

async function createHarness(options = {}) {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/'
  });
  const handlers = {};
  const frames = new Map();
  let nextFrameId = 1;

  dom.window.requestAnimationFrame = (callback) => {
    const id = nextFrameId++;
    frames.set(id, callback);
    return id;
  };
  dom.window.cancelAnimationFrame = (id) => frames.delete(id);
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireCommunications = communicationsApi;
  dom.window.NukeFireSessions = sessionRuntime;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    loadSettings: async () => null,
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

  const source = typeof options.transformSource === 'function'
    ? options.transformSource(rendererSource)
    : rendererSource;
  dom.window.eval(source);

  const flushFrames = () => {
    let passes = 0;
    while (frames.size > 0 && passes < 30) {
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(dom.window.performance.now());
      passes += 1;
    }
    assert.ok(passes < 30, 'animation-frame work should settle');
  };

  await new Promise((resolve) => setImmediate(resolve));
  flushFrames();
  await new Promise((resolve) => setImmediate(resolve));
  flushFrames();

  return { dom, handlers, frames, flushFrames };
}

test('ordinary rapid terminal chunks use the short flow flush instead of waiting a full frame', async () => {
  const { dom, handlers, frames } = await createHarness();
  const output = dom.window.document.querySelector('#output');
  const originalAppend = output.append.bind(output);
  let appendCalls = 0;
  let scrollWrites = 0;
  let scrollTop = 0;

  output.append = (...nodes) => {
    appendCalls += 1;
    return originalAppend(...nodes);
  };
  Object.defineProperty(output, 'scrollHeight', { configurable: true, get: () => 2400 });
  Object.defineProperty(output, 'clientHeight', { configurable: true, get: () => 200 });
  scrollTop = 2200;
  Object.defineProperty(output, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value) => { scrollTop = value; scrollWrites += 1; }
  });

  handlers.text('fast one\n');
  handlers.text('fast two\n');
  handlers.text('fast three\n');

  assert.doesNotMatch(output.textContent, /fast one/u);
  assert.equal(frames.size, 1);
  assert.equal(appendCalls, 0);

  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.match(output.textContent, /fast one\nfast two\nfast three\n/u);
  assert.equal(appendCalls, 1);
  assert.equal(scrollWrites, 1);
  assert.equal(scrollTop, 2400);
  assert.equal(frames.size, 0, 'short flow flush should cancel the redundant frame');
});

test('very heavy terminal bursts keep the short latency ceiling when the animation frame is delayed', async () => {
  const { dom, handlers, frames } = await createHarness();
  const output = dom.window.document.querySelector('#output');

  // Twelve ~900-character packets cross both retired Beta.63 burst thresholds:
  // more than eight batches and more than 8192 pending characters.
  for (let index = 0; index < 12; index += 1) {
    handlers.text(`combat burst ${index} ${'x'.repeat(900)}\n`);
  }

  assert.equal(frames.size, 1);
  assert.doesNotMatch(output.textContent, /combat burst 0/u);

  // Deliberately do not service requestAnimationFrame. The short timer must
  // still deliver combat output rather than allowing a pause/catch-up burst.
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.match(output.textContent, /combat burst 0/u);
  assert.match(output.textContent, /combat burst 11/u);
  assert.equal(frames.size, 0, 'heavy traffic should cancel the stale frame after the short flush');
});

test('adjacent ANSI runs with identical formatting are merged before the xterm write', async () => {
  const { dom, handlers, flushFrames } = await createHarness();
  const output = dom.window.document.querySelector('#output');

  handlers.text('\u001b[31mred one');
  handlers.text(' red two');
  handlers.text(' red three\u001b[0m\n');
  flushFrames();

  const redSpans = [...output.querySelectorAll('span')]
    .filter((node) => node.textContent.includes('red'));
  assert.equal(redSpans.length, 1);
  assert.equal(redSpans[0].textContent, 'red one red two red three');
  assert.match(output.textContent, /red one red two red three\n/u);
});

test('communications parsing remains immediate while terminal paint waits for its frame', async () => {
  const { dom, handlers, frames, flushFrames } = await createHarness();
  const output = dom.window.document.querySelector('#output');
  const communications = dom.window.document.querySelector('#communications-messages');

  handlers.text("Mo gossips, 'fast channel line'\n");

  assert.ok(frames.size >= 1, 'terminal paint should be waiting on a frame');
  assert.doesNotMatch(output.textContent, /fast channel line/u);
  assert.match(communications.textContent, /fast channel line/u);

  flushFrames();
  assert.match(output.textContent, /fast channel line/u);
});

test('xterm-only renderer contains no legacy DOM transcript mutation path', () => {
  assert.doesNotMatch(rendererSource, /function appendOutputRunNode/u);
  assert.doesNotMatch(rendererSource, /function trimRenderedOutput/u);
  assert.doesNotMatch(rendererSource, /output\.replaceChildren/u);
  assert.doesNotMatch(rendererSource, /createTreeWalker\(output/u);
  assert.match(rendererSource, /xtermAdapter\.writeRuns\(pending/u);

  const document = new JSDOM(html).window.document;
  const terminal = document.querySelector('#output');
  assert.ok(terminal);
  assert.equal(terminal.classList.contains('xterm-output'), true);
  assert.equal(document.querySelector('#xterm-output'), null);
});
