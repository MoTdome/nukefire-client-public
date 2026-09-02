'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const { installFakeXterm } = require('./fake-xterm');

async function flushScheduledTerminalPaint(dom) {
  await new Promise((resolve) => dom.window.setTimeout(resolve, 0));
}

test('renderer initializes and displays colored MUD output', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onError: (callback) => { handlers.error = callback; },
    onMenuConnect: (callback) => { handlers.menuConnect = callback; },
    onMenuFind: (callback) => { handlers.menuFind = callback; }
  };

  dom.window.eval(source);
  await flushScheduledTerminalPaint(dom);

  const output = dom.window.document.querySelector('#output');
  const app = dom.window.document.querySelector('#app');
  const connectionToggle = dom.window.document.querySelector('#connection-bar-toggle');
  const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');

  assert.match(output.textContent, /Ready\. Press Connect/);
  assert.ok(dom.window.document.querySelector('.connection-actions > #connect'));
  assert.equal(connectionToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(connectionToggle.textContent.trim(), 'Hide');
  assert.match(
    css,
    /\.connection-actions\s*\{[^}]*align-self:\s*stretch;[^}]*align-items:\s*flex-end;[^}]*padding-bottom:\s*7px;/su
  );
  assert.match(
    css,
    /#app\.connection-bar-collapsed\s*\{[^}]*--connection-bar-height:\s*36px;/su
  );

  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.text('\u001b[31mRed wasteland\u001b[0m\n');
  await flushScheduledTerminalPaint(dom);

  assert.match(output.textContent, /Red wasteland/);
  const colored = [...output.querySelectorAll('span')]
    .find((element) => element.textContent.includes('Red wasteland'));
  assert.ok(colored);
  assert.equal(colored.style.color, 'rgb(170, 0, 0)');
  assert.equal(dom.window.document.querySelector('#connect').disabled, true);
  assert.equal(dom.window.document.querySelector('#disconnect').disabled, false);
  assert.equal(app.classList.contains('connection-bar-collapsed'), true);
  assert.equal(connectionToggle.getAttribute('aria-expanded'), 'false');
  assert.equal(connectionToggle.textContent.trim(), 'Connection');

  connectionToggle.click();
  assert.equal(app.classList.contains('connection-bar-collapsed'), false);
  assert.equal(connectionToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(connectionToggle.textContent.trim(), 'Hide');

  handlers.status({ state: 'disconnected', message: 'Disconnected' });
  assert.equal(app.classList.contains('connection-bar-collapsed'), false);
});


test('live output follows at the live edge but preserves manual scrollback review', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://nukefire.test/' });
  const handlers = {};
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    onText: (callback) => { handlers.text = callback; },
    onStatus: () => {}, onEcho: () => {}, onGmcp: () => {}, onPromptBoundary: () => {},
    onError: () => {}, onMenuConnect: () => {}, onMenuFind: () => {}
  };
  dom.window.eval(source);
  await flushScheduledTerminalPaint(dom);

  const output = dom.window.document.querySelector('#output');
  const follow = dom.window.document.querySelector('#follow-output');
  Object.defineProperty(output, 'scrollHeight', { configurable: true, value: 1800 });
  Object.defineProperty(output, 'clientHeight', { configurable: true, value: 200 });
  assert.equal(follow.checked, true);

  output.scrollTop = 120;
  handlers.text('new line while reviewing\n');
  await flushScheduledTerminalPaint(dom);
  assert.equal(output.scrollTop, 120);

  output.scrollTop = 1650;
  handlers.text('new live line\n');
  await flushScheduledTerminalPaint(dom);
  assert.equal(output.scrollTop, 1800);

  follow.checked = false;
  output.scrollTop = 240;
  handlers.text('review-safe line\n');
  await flushScheduledTerminalPaint(dom);
  assert.equal(output.scrollTop, 240);
});


test('manual commands return disabled snapback to live flowing output', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://nukefire.test/' });
  const handlers = {};
  const sentCommands = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async (command) => { sentCommands.push(command); return { ok: true }; },
    sendGmcp: async () => ({ ok: true }),
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: () => {}, onGmcp: () => {}, onPromptBoundary: () => {},
    onError: () => {}, onMenuConnect: () => {}, onMenuFind: () => {}
  };
  dom.window.eval(source);
  await flushScheduledTerminalPaint(dom);

  const output = dom.window.document.querySelector('#output');
  const follow = dom.window.document.querySelector('#follow-output');
  const command = dom.window.document.querySelector('#command');
  let scrollTop = 200;
  Object.defineProperty(output, 'scrollHeight', {
    configurable: true,
    get: () => output.textContent.includes('new output while reviewing again')
      ? 1800
      : output.textContent.includes('room response after look')
        ? 1500
        : 1200
  });
  Object.defineProperty(output, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value) => { scrollTop = value; }
  });
  Object.defineProperty(output, 'clientHeight', { configurable: true, value: 200 });

  handlers.status({ state: 'connected', message: 'Connected' });
  follow.checked = false;

  handlers.text('output while reviewing scrollback\n');
  await flushScheduledTerminalPaint(dom);
  assert.equal(scrollTop, 200);

  command.value = 'look';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sentCommands, ['look']);
  assert.equal(scrollTop, 1200);

  handlers.text('room response after look\n');
  await flushScheduledTerminalPaint(dom);
  assert.equal(scrollTop, 1500);

  scrollTop = 900;
  handlers.text('new output while reviewing again\n');
  await flushScheduledTerminalPaint(dom);
  assert.equal(scrollTop, 900);
});


test('blank Enter advances pagination and snaps output to the live bottom', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  const sentCommands = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async (command) => {
      sentCommands.push(command);
      return { ok: true };
    },
    sendGmcp: async () => ({ ok: true }),
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onError: (callback) => { handlers.error = callback; },
    onMenuConnect: (callback) => { handlers.menuConnect = callback; },
    onMenuFind: (callback) => { handlers.menuFind = callback; }
  };

  dom.window.eval(source);

  const output = dom.window.document.querySelector('#output');
  const command = dom.window.document.querySelector('#command');
  Object.defineProperty(output, 'scrollHeight', { configurable: true, value: 1200 });
  output.scrollTop = 100;

  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.text('NukeFire prompt>');
  command.value = '';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true
  }));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(sentCommands, ['']);
  assert.equal(output.scrollTop, 1200);
  assert.match(output.textContent, /NukeFire prompt>\n$/);

  handlers.text('NukeFire prompt>');
  await flushScheduledTerminalPaint(dom);
  assert.doesNotMatch(output.textContent, /NukeFire prompt>NukeFire prompt>/);
  assert.match(output.textContent, /NukeFire prompt>\nNukeFire prompt>$/);

  command.value = 'look';
  output.scrollTop = 200;
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true
  }));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(sentCommands, ['', 'look']);
  assert.equal(output.scrollTop, 1200);

  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowUp',
    bubbles: true,
    cancelable: true
  }));
  assert.equal(command.value, 'look');
});


test('empty Enter repeats the last command only when the preference is enabled', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  const sentCommands = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async (command) => { sentCommands.push(command); return { ok: true }; },
    sendGmcp: async () => ({ ok: true }),
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: () => {},
    onPromptBoundary: () => {},
    onError: () => {},
    onMenuConnect: () => {},
    onMenuFind: () => {}
  };

  dom.window.eval(source);
  handlers.status({ state: 'connected', message: 'Connected' });

  const document = dom.window.document;
  const command = document.querySelector('#command');
  const repeat = document.querySelector('#repeat-last-command-on-enter');

  command.value = 'look';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await new Promise((resolve) => setImmediate(resolve));

  command.value = '';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await new Promise((resolve) => setImmediate(resolve));

  repeat.checked = true;
  command.value = '';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await new Promise((resolve) => setImmediate(resolve));

  handlers.echo(true);
  command.value = '';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await new Promise((resolve) => setImmediate(resolve));

  handlers.echo(false);
  handlers.text('[ Return to continue, (q)uit, (r)efresh, (b)ack, or page number (1/10) ]');
  repeat.checked = true;
  command.value = '';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(sentCommands, ['look', '', 'look', '', '']);
});


test('sent-command display can be disabled without losing command history', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  const sentCommands = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async (command) => { sentCommands.push(command); return { ok: true }; },
    sendGmcp: async () => ({ ok: true }),
    onText: () => {},
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: () => {},
    onGmcp: () => {},
    onPromptBoundary: () => {},
    onError: () => {},
    onMenuConnect: () => {},
    onMenuFind: () => {}
  };

  dom.window.eval(source);
  handlers.status({ state: 'connected', message: 'Connected' });

  const document = dom.window.document;
  const command = document.querySelector('#command');
  const showLast = document.querySelector('#show-last-command-in-input');
  assert.equal(showLast.checked, true);

  command.value = 'look';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(command.value, 'look');

  showLast.checked = false;
  showLast.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  command.value = 'score';
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true
  }));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(sentCommands, ['look', 'score']);
  assert.equal(command.value, '');
  assert.equal(dom.window.localStorage.getItem('nukefire.showLastCommandInInput'), 'false');

  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowUp', bubbles: true, cancelable: true
  }));
  assert.equal(command.value, 'score');
});



test('typed prefixes filter history while blank input keeps ordinary traversal', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  const sent = [];
  dom.window.NukeFireAnsi = ansi;
  dom.window.NukeFireHistoryNavigation = require('../src/history-navigation');
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async (command) => { sent.push(command); return { ok: true }; },
    sendGmcp: async () => ({ ok: true }),
    onText: () => {},
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: () => {},
    onGmcp: () => {},
    onPromptBoundary: () => {},
    onError: () => {},
    onMenuConnect: () => {},
    onMenuFind: () => {}
  };

  dom.window.eval(source);
  handlers.status({ state: 'connected', message: 'Connected' });

  const command = dom.window.document.querySelector('#command');
  dom.window.document.querySelector('#show-last-command-in-input').checked = false;
  for (const value of ['look', 'bash goblin', 'score', 'BASH orc', 'inventory']) {
    command.value = value;
    command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
      key: 'Enter', bubbles: true, cancelable: true
    }));
    await new Promise((resolve) => setImmediate(resolve));
  }
  assert.deepEqual(sent, ['look', 'bash goblin', 'score', 'BASH orc', 'inventory']);

  command.value = 'ba';
  command.setSelectionRange(2, 2);
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowUp', bubbles: true, cancelable: true
  }));
  assert.equal(command.value, 'BASH orc');

  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowUp', bubbles: true, cancelable: true
  }));
  assert.equal(command.value, 'bash goblin');

  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowUp', bubbles: true, cancelable: true
  }));
  assert.equal(command.value, 'bash goblin');

  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowDown', bubbles: true, cancelable: true
  }));
  assert.equal(command.value, 'BASH orc');

  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowDown', bubbles: true, cancelable: true
  }));
  assert.equal(command.value, 'ba');

  command.value = '';
  command.setSelectionRange(0, 0);
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowUp', bubbles: true, cancelable: true
  }));
  assert.equal(command.value, 'inventory');

  command.value = 'edited';
  command.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowDown', bubbles: true, cancelable: true
  }));
  assert.equal(command.value, 'edited');
  dom.window.close();
});

test('custom Quick Commands load, send through the normal command path, and save edits', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  const sent = [];
  const saved = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async (command) => { sent.push(command); return { ok: true }; },
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    loadSettings: async () => ({
      settings: {
        connection: { host: 'tdome.nukefire.org', port: 4000 },
        input: { repeatLastCommandOnEnter: false },
        display: {
          terminalEngine: 'custom', followOutput: true, compactOutput: false,
          fontSize: 16, uiFont: 'verdana', terminalFont: 'maple',
          interfaceBrightness: 'high-contrast',
          components: {
            groupVitals: false,
            mapperExits: false,
            gpsNavigator: true,
            mapperMap: false,
            mapperRoomInfo: true
          },
          theme: { preset: 'nukefire', foreground: '#d3d7dc', background: '#050607', monochrome: false, version: '2' }
        },
        accessibility: { screenReaderMode: false, announceImportant: true },
        quickKeys: [{ id: 'assist', label: 'Assist', command: 'groupassist', enabled: true }],
        hiddenDefaultQuickCommands: ['inventory']
      }
    }),
    saveSettings: async (settings) => { saved.push(settings); return { ok: true, settings }; },
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onGmcpState: () => {},
    onPromptBoundary: () => {},
    onProtocolWarning: () => {},
    onCharset: () => {},
    onTerminalType: () => {},
    onWindowSize: () => {},
    onError: () => {},
    onMenuConnect: () => {},
    onMenuFind: () => {},
    onMenuPreferences: () => {},
    onMenuFocusCommand: () => {},
    onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {},
    onMenuReadVitals: () => {}
  };

  dom.window.eval(source);
  await new Promise((resolve) => setImmediate(resolve));
  handlers.status({ state: 'connected', message: 'Connected' });

  const document = dom.window.document;
  const assist = document.querySelector('[data-custom-quick-key="assist"]');
  assert.ok(assist);
  assert.equal(document.querySelector('[data-default-quick-command="inventory"]').hidden, true);
  assert.equal(document.querySelector('[data-default-quick-command="look"]').hidden, false);
  assert.equal(document.querySelector('#ui-font').value, 'verdana');
  assert.equal(document.querySelector('#terminal-font').value, 'maple');
  assert.equal(document.querySelector('#interface-brightness').value, 'high-contrast');
  assert.equal(document.body.dataset.interfaceBrightness, 'high-contrast');
  assert.equal(document.querySelector('.group-vitals-section').hidden, true);
  assert.equal(document.querySelector('#mapper-exits').hidden, true);
  assert.equal(document.querySelector('#mapper-map-section').hidden, true);
  assert.equal(document.querySelector('#mapper-room-info').hidden, false);
  assist.click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['groupassist']);
  assert.equal(document.activeElement, document.querySelector('#command'));

  document.querySelector('#quick-command-customize').click();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(document.querySelector('#preference-tab-quick-commands').getAttribute('aria-selected'), 'true');
  assert.equal(document.querySelector('#quick-command-preferences').hidden, false);
  assert.equal(document.activeElement, document.querySelector('#quick-command-label'));
  const inventoryRow = document.querySelector('[data-default-quick-command-id="inventory"]');
  inventoryRow.querySelector('button').click();
  await new Promise((resolve) => setTimeout(resolve, 230));
  assert.equal(document.querySelector('[data-default-quick-command="inventory"]').hidden, false);
  assert.deepEqual(Array.from(saved.at(-1).hiddenDefaultQuickCommands), []);

  const lookRow = document.querySelector('[data-default-quick-command-id="look"]');
  lookRow.querySelector('button').click();
  await new Promise((resolve) => setTimeout(resolve, 230));
  assert.equal(document.querySelector('[data-default-quick-command="look"]').hidden, true);
  assert.deepEqual(Array.from(saved.at(-1).hiddenDefaultQuickCommands), ['look']);

  document.querySelector('#quick-command-restore-defaults').click();
  await new Promise((resolve) => setTimeout(resolve, 230));
  assert.equal(document.querySelector('[data-default-quick-command="look"]').hidden, false);
  assert.deepEqual(Array.from(saved.at(-1).hiddenDefaultQuickCommands), []);

  document.querySelector('#quick-command-label').value = 'Heal';
  document.querySelector('#quick-command-value').value = 'heal %tank';
  document.querySelector('#quick-command-form').dispatchEvent(new dom.window.Event('submit', {
    bubbles: true,
    cancelable: true
  }));
  await new Promise((resolve) => setTimeout(resolve, 230));

  assert.ok([...document.querySelectorAll('.custom-quick-command')]
    .some((button) => button.textContent === 'Heal'));
  assert.equal(saved.at(-1).quickKeys.at(-1).command, 'heal %tank');
});

test('renderer exposes the latest Telnet prompt boundary for live diagnosis', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onError: (callback) => { handlers.error = callback; },
    onMenuConnect: (callback) => { handlers.menuConnect = callback; },
    onMenuFind: (callback) => { handlers.menuFind = callback; }
  };

  dom.window.eval(source);

  const indicator = dom.window.document.querySelector('#prompt-boundary');
  assert.equal(indicator.textContent, 'Waiting');

  handlers.boundary({ type: 'ga' });
  assert.equal(indicator.dataset.type, 'ga');
  assert.equal(indicator.textContent, 'Waiting', 'secondary protocol counters are deliberately coalesced');
  await new Promise((resolve) => setTimeout(resolve, 550));
  assert.equal(indicator.textContent, 'GA (1)');

  handlers.boundary({ type: 'eor' });
  assert.equal(indicator.dataset.type, 'eor');
  await new Promise((resolve) => setTimeout(resolve, 550));
  assert.equal(indicator.textContent, 'EOR (2)');
});


test('accessibility foundation exposes review regions and numeric vital semantics', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const output = document.querySelector('#output');
  assert.equal(output.getAttribute('role'), 'region');
  assert.equal(output.hasAttribute('aria-live'), false);
  assert.equal(output.getAttribute('tabindex'), '0');
  assert.ok(document.querySelector('a[href="#command"]'));
  assert.ok(document.querySelector('a[href="#output"]'));

  for (const name of ['hp', 'mana', 'move']) {
    const meter = document.querySelector(`#${name}-meter`);
    assert.equal(meter.getAttribute('role'), 'progressbar');
    assert.ok(meter.getAttribute('aria-label'));
    assert.ok(meter.getAttribute('aria-valuetext'));
  }
});


test('screen reader controls read the last line and vitals without flooding incoming output', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onError: (callback) => { handlers.error = callback; },
    onMenuConnect: (callback) => { handlers.menuConnect = callback; },
    onMenuFind: (callback) => { handlers.menuFind = callback; },
    onMenuFocusCommand: (callback) => { handlers.menuFocusCommand = callback; },
    onMenuFocusOutput: (callback) => { handlers.menuFocusOutput = callback; },
    onMenuReadLastLine: (callback) => { handlers.menuReadLastLine = callback; },
    onMenuReadVitals: (callback) => { handlers.menuReadVitals = callback; }
  };

  dom.window.eval(source);

  const document = dom.window.document;
  const command = document.querySelector('#command');
  const output = document.querySelector('#output');
  const announcer = document.querySelector('#sr-announcer');

  handlers.status({ state: 'connected', message: 'Connected' });
  assert.equal(document.activeElement, command);

  handlers.text('\u001b[31mFirst line\u001b[0m\nSecond line\n');
  assert.equal(document.activeElement, command);
  assert.equal(announcer.textContent, '');

  document.querySelector('#read-last-line').click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(announcer.textContent, 'Last line: Second line');

  handlers.gmcp({
    body: {
      hp: 750,
      maxhp: 1000,
      mana: 400,
      maxmana: 500,
      move: 300,
      maxmove: 600
    }
  });
  document.querySelector('#read-vitals').click();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    announcer.textContent,
    'Health 750 of 1,000. Mana 400 of 500. Movement 300 of 600'
  );
  assert.equal(document.querySelector('#hp-meter').getAttribute('aria-valuenow'), '750');
  assert.equal(document.querySelector('#hp-meter').getAttribute('aria-valuemax'), '1000');
  assert.equal(document.querySelector('#hp-meter').getAttribute('aria-valuetext'), 'Health 750 of 1,000');

  handlers.menuFocusOutput();
  assert.equal(document.activeElement, output);
  handlers.menuFocusCommand();
  assert.equal(document.activeElement, command);
});


test('screen reader preferences persist and Command-L focuses input instead of clearing output', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onError: (callback) => { handlers.error = callback; },
    onMenuConnect: (callback) => { handlers.menuConnect = callback; },
    onMenuFind: (callback) => { handlers.menuFind = callback; }
  };

  dom.window.eval(source);

  const document = dom.window.document;
  const output = document.querySelector('#output');
  const command = document.querySelector('#command');
  const toggle = document.querySelector('#screen-reader-mode');

  toggle.checked = true;
  toggle.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(document.body.classList.contains('screen-reader-mode'), true);
  assert.equal(dom.window.localStorage.getItem('nukefire.screenReaderMode'), 'true');

  handlers.text('Output that must remain visible.\n');
  await flushScheduledTerminalPaint(dom);
  output.focus();
  document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'l',
    metaKey: true,
    bubbles: true,
    cancelable: true
  }));
  assert.equal(document.activeElement, command);
  assert.match(output.textContent, /Output that must remain visible/);
});


test('structured NukeFire GMCP renders real mhp/mmana/mmove, room, and group fields', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onGmcpState: (callback) => { handlers.gmcpState = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onError: (callback) => { handlers.error = callback; },
    onMenuConnect: (callback) => { handlers.menuConnect = callback; },
    onMenuFind: (callback) => { handlers.menuFind = callback; }
  };

  dom.window.eval(source);

  const snapshot = {
    char: {
      vitals: {
        hp: 750,
        mhp: 1000,
        mana: 400,
        mmana: 500,
        move: 300,
        mmove: 600,
        opponent: {
          name: 'a reactor brute',
          hp: 600,
          mhp: 1200,
          mn: 80,
          mmn: 100,
          mv: 50,
          mmv: 90,
          level: 88
        }
      },
      maxStats: null,
      status: {
        name: 'Mo',
        class: 'Cyborg',
        level: 100
      }
    },
    room: {
      info: {
        num: 15200,
        name: 'The NukeFire Nexus'
      }
    },
    group: {
      count: 2,
      leader: 'Mo',
      members: [
        { name: 'Mo', info: { hp: 750, mhp: 1000, mn: 400, mmn: 500, mv: 300, mmv: 600, lvl: 100, here: 1, opponent: 'a reactor brute' } },
        { name: 'Ally', info: { hp: 450, mhp: 700, mn: 200, mmn: 350, mv: 150, mmv: 300, lvl: 90, here: 1, opponent: 'a waste stalker' } }
      ],
      enemies: [
        { name: 'a reactor brute', info: { hp: 600, mhp: 1200, level: 88, here: 1 } },
        { name: 'a waste stalker', info: { hp: 300, mhp: 900, level: 82, here: 1 } }
      ]
    }
  };

  for (const [packageName, body] of [
    ['Char.Vitals', snapshot.char.vitals],
    ['Char.Status', snapshot.char.status],
    ['Room.Info', snapshot.room.info],
    ['Group', snapshot.group]
  ]) {
    handlers.gmcp({ packageName, body, state: snapshot });
  }

  const document = dom.window.document;
  assert.equal(document.querySelector('#hp-text').textContent, '750 / 1,000 · 75%');
  assert.equal(document.querySelector('#mana-text').textContent, '400 / 500 · 80%');
  assert.equal(document.querySelector('#move-text').textContent, '300 / 600 · 50%');
  assert.equal(document.querySelector('#character-state').textContent, 'Mo, Cyborg level 100');
  assert.equal(document.querySelector('#room-state').textContent, 'The NukeFire Nexus (#15200)');
  assert.equal(document.querySelector('#group-state').textContent, '2 members, led by Mo');
  assert.equal(document.querySelector('#opponent-vitals').hidden, false);
  assert.equal(document.querySelector('#opponent-name').textContent, 'a reactor brute');
  assert.equal(document.querySelector('#opponent-hp-text').textContent, 'H 600 / 1,200 · 50%');
  assert.equal(document.querySelectorAll('#group-vitals-list [role="listitem"]').length, 1);
  assert.doesNotMatch(document.querySelector('#group-vitals-list').textContent, /Mo/);
  assert.match(document.querySelector('#group-vitals-list').textContent, /Ally/);
  assert.match(document.querySelector('#group-vitals-list').textContent, /H 450 \/ 700 · 64%/);
  assert.equal(document.querySelectorAll('#group-targets-list [role="listitem"]').length, 2);
  assert.match(document.querySelector('#group-targets-list').textContent, /Targeted by Mo/);
  assert.equal(document.querySelector('#gmcp-state').textContent, 'Waiting', 'secondary protocol counters are deliberately coalesced');
  await new Promise((resolve) => setTimeout(resolve, 550));
  assert.equal(document.querySelector('#gmcp-state').textContent, 'Receiving (4)');
});


test('Char.Vitals clears the opponent card immediately when combat ends', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireCombatVitals = require('../src/combat-vitals');
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onGmcpState: (callback) => { handlers.gmcpState = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onError: () => {},
    onMenuConnect: () => {},
    onMenuFind: () => {}
  };

  dom.window.eval(source);
  const snapshot = {
    char: { vitals: { hp: 100, mhp: 100, opponent: { name: 'a brute', hp: 50, mhp: 100 } } },
    room: {}, group: null
  };
  handlers.gmcp({ packageName: 'Char.Vitals', body: snapshot.char.vitals, state: snapshot });
  assert.equal(dom.window.document.querySelector('#opponent-vitals').hidden, false);

  snapshot.char.vitals = { hp: 100, mhp: 100 };
  handlers.gmcp({ packageName: 'Char.Vitals', body: snapshot.char.vitals, state: snapshot });
  assert.equal(dom.window.document.querySelector('#opponent-vitals').hidden, true);
  assert.equal(dom.window.document.querySelector('#opponent-vitals-empty').hidden, false);
});


test('quick command buttons return focus to the command prompt for pager Enter', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  const sent = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async (command) => { sent.push(command); return { ok: true }; },
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onError: (callback) => { handlers.error = callback; },
    onMenuConnect: (callback) => { handlers.menuConnect = callback; },
    onMenuFind: (callback) => { handlers.menuFind = callback; }
  };

  dom.window.eval(source);
  handlers.status({ state: 'connected', message: 'Connected' });

  const document = dom.window.document;
  const command = document.querySelector('#command');
  document.querySelector('[data-command="help newbie"]').click();
  await new Promise((resolve) => dom.window.requestAnimationFrame(resolve));

  assert.equal(document.activeElement, command);
  assert.deepEqual(sent, ['help newbie']);

  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true
  }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(sent, ['help newbie', 'help newbie']);
});


test('renderer reports terminal dimensions and screen-reader preference before connect', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  const sizes = [];
  const preferences = [];
  const connects = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async (options) => { connects.push(options); return { ok: true }; },
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async (size) => { sizes.push(size); return { ok: true }; },
    setClientPreferences: async (value) => { preferences.push(value); return { ok: true }; },
    getGmcpState: async () => null,
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onError: (callback) => { handlers.error = callback; },
    onMenuConnect: (callback) => { handlers.menuConnect = callback; },
    onMenuFind: (callback) => { handlers.menuFind = callback; }
  };

  dom.window.eval(source);
  const output = dom.window.document.querySelector('#output');
  Object.defineProperty(output, 'clientWidth', { configurable: true, value: 800 });
  Object.defineProperty(output, 'clientHeight', { configurable: true, value: 480 });

  const toggle = dom.window.document.querySelector('#screen-reader-mode');
  toggle.checked = true;
  toggle.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  dom.window.document.querySelector('#connect').click();
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.equal(connects.length, 1);
  assert.equal(preferences.at(-1).screenReaderMode, true);
  assert.ok(sizes.at(-1).width >= 20);
  assert.ok(sizes.at(-1).height >= 5);
  assert.match(dom.window.document.querySelector('#naws-state').textContent, /^\d+ × \d+$/);
});


test('terminal theme controls apply the Amber CRT preset and persist it', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    onText: (callback) => { handlers.text = callback; },
    onStatus: (callback) => { handlers.status = callback; },
    onEcho: (callback) => { handlers.echo = callback; },
    onGmcp: (callback) => { handlers.gmcp = callback; },
    onGmcpState: (callback) => { handlers.gmcpState = callback; },
    onPromptBoundary: (callback) => { handlers.boundary = callback; },
    onError: (callback) => { handlers.error = callback; },
    onMenuConnect: (callback) => { handlers.menuConnect = callback; },
    onMenuFind: (callback) => { handlers.menuFind = callback; }
  };

  dom.window.eval(source);

  const document = dom.window.document;
  const select = document.querySelector('#terminal-theme');
  select.value = 'amber';
  select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    document.documentElement.style.getPropertyValue('--terminal-foreground'),
    '#ffb000'
  );
  assert.equal(
    document.documentElement.style.getPropertyValue('--terminal-background'),
    '#000000'
  );
  assert.equal(document.body.classList.contains('terminal-monochrome'), false);
  assert.equal(document.querySelector('#terminal-monochrome').checked, false);
  assert.equal(dom.window.localStorage.getItem('nukefire.terminalTheme'), 'amber');
  assert.equal(dom.window.localStorage.getItem('nukefire.terminalForeground'), '#ffb000');
  assert.match(document.querySelector('#terminal-theme-status').textContent, /Amber CRT/);
  assert.match(document.querySelector('#terminal-theme-status').textContent, /ANSI colors preserved/);
});

test('custom terminal colors preserve ANSI unless monochrome is selected', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    onText: () => {},
    onStatus: () => {},
    onEcho: () => {},
    onGmcp: () => {},
    onPromptBoundary: () => {},
    onError: () => {},
    onMenuConnect: () => {},
    onMenuFind: () => {}
  };

  dom.window.eval(source);

  const document = dom.window.document;
  const foreground = document.querySelector('#terminal-foreground');
  const background = document.querySelector('#terminal-background');

  foreground.value = '#ffcc55';
  foreground.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  background.value = '#101000';
  background.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  assert.equal(document.querySelector('#terminal-theme').value, 'custom');
  assert.equal(
    document.documentElement.style.getPropertyValue('--terminal-foreground'),
    '#ffcc55'
  );
  assert.equal(
    document.documentElement.style.getPropertyValue('--terminal-background'),
    '#101000'
  );
  assert.equal(document.body.classList.contains('terminal-monochrome'), false);

  document.querySelector('#terminal-monochrome').click();
  assert.equal(document.body.classList.contains('terminal-monochrome'), true);
  assert.equal(dom.window.localStorage.getItem('nukefire.terminalMonochrome'), 'true');
});

test('saved terminal theme is restored before connection', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  dom.window.localStorage.setItem('nukefire.terminalTheme', 'custom');
  dom.window.localStorage.setItem('nukefire.terminalForeground', '#ffaa22');
  dom.window.localStorage.setItem('nukefire.terminalBackground', '#020100');
  dom.window.localStorage.setItem('nukefire.terminalMonochrome', 'true');

  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    onText: () => {},
    onStatus: () => {},
    onEcho: () => {},
    onGmcp: () => {},
    onPromptBoundary: () => {},
    onError: () => {},
    onMenuConnect: () => {},
    onMenuFind: () => {}
  };

  dom.window.eval(source);

  const document = dom.window.document;
  assert.equal(document.querySelector('#terminal-theme').value, 'custom');
  assert.equal(document.querySelector('#terminal-foreground').value, '#ffaa22');
  assert.equal(document.querySelector('#terminal-background').value, '#020100');
  assert.equal(document.querySelector('#terminal-monochrome').checked, true);
  assert.equal(document.body.classList.contains('terminal-monochrome'), true);
});


test('versioned settings migrate local preferences without changing terminal layout behavior', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });

  dom.window.localStorage.setItem('nukefire.host', 'legacy.example.org');
  dom.window.localStorage.setItem('nukefire.port', '4555');
  dom.window.localStorage.setItem('nukefire.terminalTheme', 'amber');
  dom.window.localStorage.setItem('nukefire.terminalForeground', '#ffb000');
  dom.window.localStorage.setItem('nukefire.terminalBackground', '#000000');
  dom.window.localStorage.setItem('nukefire.terminalMonochrome', 'false');

  const loadedLegacy = [];
  const savedSettings = [];
  const handlers = {};

  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    loadSettings: async (legacy) => {
      loadedLegacy.push(legacy);
      return {
        ok: true,
        settings: {
          schemaVersion: 1,
          connection: {
            host: 'saved.example.org',
            port: 4666
          },
          input: {
            repeatLastCommandOnEnter: true,
            showLastCommandInInput: false
          },
          display: {
            followOutput: true,
            compactOutput: false,
            fontSize: 20,
            theme: {
              preset: 'amber',
              foreground: '#ffb000',
              background: '#000000',
              monochrome: false,
              version: '2'
            }
          },
          accessibility: {
            screenReaderMode: false,
            announceImportant: true
          }
        }
      };
    },
    saveSettings: async (settings) => {
      savedSettings.push(settings);
      return { ok: true, settings };
    },
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
    onMenuFocusCommand: () => {},
    onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {},
    onMenuReadVitals: () => {}
  };

  dom.window.eval(source);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(loadedLegacy.length, 1);
  assert.equal(loadedLegacy[0].host, 'legacy.example.org');
  assert.equal(loadedLegacy[0].terminalTheme, 'amber');

  const document = dom.window.document;
  assert.equal(document.querySelector('#host').value, 'saved.example.org');
  assert.equal(document.querySelector('#port').value, '4666');
  assert.equal(document.querySelector('#font-size').value, '20');
  assert.equal(document.querySelector('#repeat-last-command-on-enter').checked, true);
  assert.equal(document.querySelector('#show-last-command-in-input').checked, false);
  assert.equal(document.querySelector('#follow-output').checked, true);
  assert.equal(document.querySelector('#compact-output').checked, false);
  assert.equal(document.querySelector('#terminal-theme').value, 'amber');
  assert.equal(document.body.classList.contains('terminal-monochrome'), false);

  document.querySelector('#repeat-last-command-on-enter').checked = false;
  document.querySelector('#repeat-last-command-on-enter').dispatchEvent(
    new dom.window.Event('change', { bubbles: true })
  );
  document.querySelector('#show-last-command-in-input').checked = true;
  document.querySelector('#show-last-command-in-input').dispatchEvent(
    new dom.window.Event('change', { bubbles: true })
  );
  document.querySelector('#follow-output').checked = false;
  document.querySelector('#follow-output').dispatchEvent(
    new dom.window.Event('change', { bubbles: true })
  );
  document.querySelector('#font-size').value = '22';
  document.querySelector('#font-size').dispatchEvent(
    new dom.window.Event('input', { bubbles: true })
  );

  await new Promise((resolve) => setTimeout(resolve, 230));

  assert.equal(savedSettings.length, 1);
  assert.equal(savedSettings[0].input.repeatLastCommandOnEnter, false);
  assert.equal(savedSettings[0].input.showLastCommandInInput, true);
  assert.equal(savedSettings[0].display.followOutput, false);
  assert.equal(savedSettings[0].display.fontSize, 22);
  assert.equal(savedSettings[0].display.theme.preset, 'amber');
});

test('GMCP room updates skip unrelated GPS, Context, and Affects rebuilds', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/'
  });

  const handlers = {};
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
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
    onError: () => {},
    onMenuConnect: () => {},
    onMenuFind: () => {},
    onMenuPreferences: () => {},
    onMenuFocusCommand: () => {},
    onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {},
    onMenuReadVitals: () => {}
  };

  dom.window.eval(source);
  await new Promise((resolve) => setImmediate(resolve));

  const document = dom.window.document;
  const contextCards = document.querySelector('#context-deck-cards');
  const gpsSelect = document.querySelector('#mapper-gps-destination');
  const affectsList = document.querySelector('#affects-list');
  const counts = { context: 0, gps: 0, affects: 0 };
  const contextReplace = contextCards.replaceChildren.bind(contextCards);
  const gpsReplace = gpsSelect.replaceChildren.bind(gpsSelect);
  const affectsReplace = affectsList.replaceChildren.bind(affectsList);
  contextCards.replaceChildren = (...nodes) => { counts.context += 1; return contextReplace(...nodes); };
  gpsSelect.replaceChildren = (...nodes) => { counts.gps += 1; return gpsReplace(...nodes); };
  affectsList.replaceChildren = (...nodes) => { counts.affects += 1; return affectsReplace(...nodes); };

  handlers.gmcp({
    packageName: 'Room.Info',
    state: {
      char: { status: { name: 'Prime' }, vitals: null, maxStats: null },
      room: { info: { num: 15201, name: 'A Fast Room' } },
      map: { local: null },
      gps: { catalog: { items: [] } },
      context: { state: null },
      affects: { state: null },
      group: null
    }
  });

  assert.deepEqual(counts, { context: 0, gps: 0, affects: 0 });
  assert.equal(document.querySelector('#room-state').textContent, 'A Fast Room (#15201)');
});


test('interface brightness persists and Command-C copies xterm scrollback selection', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/'
  });
  const copied = [];
  const saved = [];
  const handlers = {};
  dom.window.NukeFireAnsi = ansi;
  const xterms = installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null, loadSettings: async () => null,
    saveSettings: async (settings) => { saved.push(settings); return { ok: true, settings }; },
    writeClipboardText: async (text) => { copied.push(text); return { ok: true }; },
    onText: () => {}, onStatus: () => {}, onEcho: () => {}, onGmcp: () => {},
    onGmcpState: () => {}, onPromptBoundary: () => {}, onProtocolWarning: () => {},
    onCharset: () => {}, onTerminalType: () => {}, onWindowSize: () => {}, onError: () => {},
    onMenuConnect: () => {}, onMenuFind: () => {}, onMenuCopy: (callback) => { handlers.copy = callback; },
    onMenuPreferences: () => {}, onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {},
    onMenuReadLastLine: () => {}, onMenuReadVitals: () => {}
  };

  dom.window.eval(source);
  await new Promise((resolve) => setImmediate(resolve));
  const document = dom.window.document;
  assert.equal(document.body.dataset.interfaceBrightness, 'brighter');

  const brightness = document.querySelector('#interface-brightness');
  brightness.value = 'dark';
  brightness.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 230));
  assert.equal(document.body.dataset.interfaceBrightness, 'dark');
  assert.equal(dom.window.localStorage.getItem('nukefire.interfaceBrightness'), 'dark');
  assert.equal(saved.at(-1).display.interfaceBrightness, 'dark');

  xterms[0].setSelection('selected terminal scrollback');
  document.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'c', metaKey: true, bubbles: true, cancelable: true
  }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(copied, ['selected terminal scrollback']);

  xterms[0].setSelection('copied from Edit menu');
  handlers.copy();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(copied, ['selected terminal scrollback', 'copied from Edit menu']);
});

test('disconnected ordinary input still reaches the local TinTin coordinator', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://nukefire.test/' });
  const routed = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }), sendGmcp: async () => ({ ok: true }),
    routeCommand: async (sessionId, command) => {
      routed.push({ sessionId, command });
      return { deliveries: [], messages: [] };
    },
    listSessions: async () => ({
      snapshot: {
        activeSessionId: 'main',
        sessions: [{ id: 'main', name: 'Prime', role: 'member', host: 'tdome.nukefire.org', port: 4000, connected: false, status: { state: 'disconnected', message: 'Disconnected' } }],
        groups: {}, aliases: [], variables: [], functions: [],
        actions: { enabled: true, definitions: [] }, gags: { enabled: true, definitions: [] },
        highlights: { enabled: true, definitions: [] }, substitutes: { enabled: true, definitions: [] },
        macros: { definitions: [] }, classes: { activeStack: [], definitions: [] },
        speedwalk: { enabled: true }, commandPrefix: '#'
      }
    }),
    loadSettings: async () => ({ settings: null }),
    onText: () => {}, onStatus: () => {}, onEcho: () => {}, onGmcp: () => {},
    onPromptBoundary: () => {}, onError: () => {}, onMenuConnect: () => {}, onMenuFind: () => {}
  };
  dom.window.eval(source);
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  const command = dom.window.document.querySelector('#command');
  assert.equal(dom.window.document.querySelector('#send'), null);
  assert.match(command.placeholder, /aliases.*Actions.*#showme/u);

  command.value = 'logprime';
  command.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  command.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(routed, [{ sessionId: 'main', command: 'logprime' }]);
  assert.doesNotMatch(dom.window.document.querySelector('#output').textContent, /Not connected\./u);
  dom.window.close();
});
