'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const { installFakeXterm } = require('./fake-xterm');

const DEFAULT_LAYOUT = {
  vitals: { region: 'left', order: 0 },
  quickCommands: { region: 'left', order: 1 },
  liveState: { region: 'left', order: 2 },
  protocol: { region: 'left', order: 3 }
};

const SETTINGS = {
  schemaVersion: 4,
  connection: { host: 'tdome.nukefire.org', port: 4000 },
  display: {
    followOutput: true,
    compactOutput: false,
    fontSize: 16,
    theme: {
      preset: 'nukefire',
      foreground: '#d3d7dc',
      background: '#050607',
      monochrome: false,
      version: '2'
    }
  },
  accessibility: {
    screenReaderMode: false,
    announceImportant: true
  },
  workspace: {
    defaultPanels: {
      vitals: true,
      quickCommands: true,
      liveState: true,
      protocol: true
    },
    defaultLayout: DEFAULT_LAYOUT,
    defaultDockSizes: {
      left: 240,
      right: 240,
      'outer-right': 260,
      bottom: 190
    },
    characters: {
      prime: {
        name: 'Prime',
        panels: {
          vitals: true,
          quickCommands: true,
          liveState: true,
          protocol: true
        },
        layout: {
          vitals: { region: 'right', order: 0 },
          quickCommands: { region: 'bottom', order: 0 },
          liveState: { region: 'left', order: 0 },
          protocol: { region: 'left', order: 1 }
        },
        dockSizes: {
          left: 220,
          right: 300,
          'outer-right': 280,
          bottom: 210
        }
      }
    }
  }
};

function createRenderer(options = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://nukefire.test/'
  });
  const handlers = {};
  const saves = [];
  const workspace = dom.window.document.querySelector('#workspace');
  const workspaceWidth = Number(options.workspaceWidth);
  const workspaceHeight = Number(options.workspaceHeight);

  if (workspace && Number.isFinite(workspaceWidth) && Number.isFinite(workspaceHeight)) {
    Object.defineProperty(workspace, 'clientWidth', {
      configurable: true,
      value: Math.trunc(workspaceWidth)
    });
    Object.defineProperty(workspace, 'clientHeight', {
      configurable: true,
      value: Math.trunc(workspaceHeight)
    });
    workspace.getBoundingClientRect = () => ({
      width: Math.trunc(workspaceWidth),
      height: Math.trunc(workspaceHeight),
      top: 0,
      left: 0,
      right: Math.trunc(workspaceWidth),
      bottom: Math.trunc(workspaceHeight),
      x: 0,
      y: 0,
      toJSON: () => ({})
    });
  }

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
    loadSettings: async () => ({ settings: JSON.parse(JSON.stringify(SETTINGS)) }),
    saveSettings: async (settings) => {
      saves.push(JSON.parse(JSON.stringify(settings)));
      return { ok: true, settings };
    },
    onText: () => {},
    onStatus: () => {},
    onEcho: () => {},
    onGmcp: () => {},
    onGmcpState: (callback) => { handlers.gmcpState = callback; },
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
  return { dom, handlers, saves };
}

function wait(milliseconds = 25) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

test('docking foundation exposes four regions and keyboard-accessible panel menus', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  assert.ok(document.querySelector('#dock-left[data-dock-region="left"]'));
  assert.ok(document.querySelector('#dock-right[data-dock-region="right"]'));
  assert.ok(document.querySelector('#dock-outer-right[data-dock-region="outer-right"]'));
  assert.ok(document.querySelector('#dock-bottom[data-dock-region="bottom"]'));
  assert.equal(document.querySelectorAll('[data-panel-menu-button]').length, 12);
  assert.equal(document.querySelectorAll('[data-panel-menu]').length, 12);
  assert.equal(document.querySelectorAll('[data-panel-action="move-left"]').length, 12);
  assert.equal(document.querySelectorAll('[data-panel-action="move-right"]').length, 12);
  assert.equal(document.querySelectorAll('[data-panel-action="move-outer-right"]').length, 12);
  assert.equal(document.querySelectorAll('[data-panel-action="move-bottom"]').length, 12);
  assert.ok(document.querySelector('#reset-panel-layout'));

  const terminal = document.querySelector('.terminal-shell');
  assert.ok(terminal.querySelector('#output'));
  assert.ok(terminal.querySelector('#command'));
});


test('panel menus are promoted to the top-level overlay instead of panel content', async () => {
  const { dom } = createRenderer();
  const document = dom.window.document;
  await wait();

  const layer = document.querySelector('#panel-menu-layer');
  const menu = document.querySelector('[data-panel-menu="affects"]');
  const button = document.querySelector('[data-panel-menu-button="affects"]');
  assert.ok(layer);
  assert.equal(menu.parentElement, layer);

  button.click();
  assert.equal(menu.hidden, false);
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  assert.match(menu.style.left, /px$/u);
  assert.match(menu.style.top, /px$/u);

  menu.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Escape', bubbles: true, cancelable: true
  }));
  assert.equal(menu.hidden, true);
  assert.equal(document.activeElement, button);
});

test('moving a panel preserves the terminal and saves default dock metadata', async () => {
  const { dom, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  const output = document.querySelector('#output');
  const terminal = document.querySelector('.terminal-shell');
  output.scrollTop = 333;

  document.querySelector('[data-panel-menu-button="vitals"]').click();
  const moveRight = document.querySelector(
    '[data-panel-action="move-right"][data-panel-id="vitals"]'
  );
  assert.equal(moveRight.disabled, false);
  moveRight.click();
  await wait(230);

  assert.equal(document.querySelector('#panel-vitals').parentElement.id, 'dock-right');
  assert.equal(document.querySelector('#dock-right').hidden, false);
  assert.equal(document.querySelector('#workspace').classList.contains('has-right-dock'), true);
  assert.equal(document.querySelector('.terminal-shell'), terminal);
  assert.equal(document.querySelector('#output'), output);
  assert.equal(output.scrollTop, 333);
  assert.equal(saves.at(-1).workspace.defaultLayout.vitals.region, 'right');
});

test('character GMCP applies and saves a character-specific dock layout', async () => {
  const { dom, handlers, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.gmcpState({
    char: { status: { name: 'Prime', class: 'Assassin', level: 50 } },
    room: {},
    group: null
  });

  assert.equal(document.querySelector('#panel-vitals').parentElement.id, 'dock-right');
  assert.equal(document.querySelector('#panel-quick-commands').parentElement.id, 'dock-bottom');
  assert.equal(document.querySelector('#panel-live-state').parentElement.id, 'dock-left');
  assert.match(document.querySelector('#layout-scope-status').textContent, /Prime/u);

  document.querySelector('[data-panel-menu-button="protocol"]').click();
  document.querySelector(
    '[data-panel-action="move-bottom"][data-panel-id="protocol"]'
  ).click();
  await wait(230);

  assert.equal(document.querySelector('#panel-protocol').parentElement.id, 'dock-bottom');
  assert.equal(saves.at(-1).workspace.characters.prime.layout.protocol.region, 'bottom');
  assert.equal(saves.at(-1).workspace.characters.prime.name, 'Prime');
});

test('panel menus support arrow navigation and Escape returns focus', async () => {
  const { dom } = createRenderer();
  const document = dom.window.document;
  await wait();

  const button = document.querySelector('[data-panel-menu-button="vitals"]');
  button.click();

  const menu = document.querySelector('[data-panel-menu="vitals"]');
  const moveRight = document.querySelector(
    '[data-panel-action="move-right"][data-panel-id="vitals"]'
  );
  const moveOuterRight = document.querySelector(
    '[data-panel-action="move-outer-right"][data-panel-id="vitals"]'
  );
  const moveBottom = document.querySelector(
    '[data-panel-action="move-bottom"][data-panel-id="vitals"]'
  );

  assert.equal(document.activeElement, moveRight);
  moveRight.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowDown',
    bubbles: true,
    cancelable: true
  }));
  assert.equal(document.activeElement, moveOuterRight);
  moveOuterRight.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowDown',
    bubbles: true,
    cancelable: true
  }));
  assert.equal(document.activeElement, moveBottom);

  menu.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true
  }));
  assert.equal(menu.hidden, true);
  assert.equal(document.activeElement, button);
});

test('dock regions expose accessible resize separators without replacing the terminal', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const separators = [...document.querySelectorAll('[data-dock-resizer]')];
  assert.equal(separators.length, 4);
  assert.deepEqual(
    separators.map((separator) => separator.dataset.dockResizer),
    ['left', 'right', 'outer-right', 'bottom']
  );
  assert.equal(document.querySelector('#resize-left-dock').getAttribute('role'), 'separator');
  assert.equal(document.querySelector('#resize-left-dock').getAttribute('aria-orientation'), 'vertical');
  assert.equal(document.querySelector('#resize-bottom-dock').getAttribute('aria-orientation'), 'horizontal');

  const terminal = document.querySelector('.terminal-shell');
  assert.ok(terminal.querySelector('#output'));
  assert.ok(terminal.querySelector('#command'));
});

test('keyboard dock resizing preserves output position and saves the default size', async () => {
  const { dom, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  const workspace = document.querySelector('#workspace');
  const output = document.querySelector('#output');
  const terminal = document.querySelector('.terminal-shell');
  const resizer = document.querySelector('#resize-left-dock');
  output.scrollTop = 417;

  resizer.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowRight',
    bubbles: true,
    cancelable: true
  }));
  await wait(230);

  assert.equal(workspace.style.getPropertyValue('--preferred-left-dock-width'), '250px');
  assert.equal(resizer.getAttribute('aria-valuenow'), '250');
  assert.equal(document.querySelector('.terminal-shell'), terminal);
  assert.equal(document.querySelector('#output'), output);
  assert.equal(output.scrollTop, 417);
  assert.equal(saves.at(-1).workspace.defaultDockSizes.left, 250);

  resizer.dispatchEvent(new dom.window.MouseEvent('dblclick', {
    bubbles: true,
    cancelable: true
  }));
  await wait(230);
  assert.equal(workspace.style.getPropertyValue('--preferred-left-dock-width'), '220px');
  assert.equal(saves.at(-1).workspace.defaultDockSizes.left, 220);
});

test('large displays allow side docks to grow far beyond the old 480-pixel ceiling', async () => {
  const { dom, saves } = createRenderer({ workspaceWidth: 3840, workspaceHeight: 2160 });
  const document = dom.window.document;
  await wait();

  const workspace = document.querySelector('#workspace');
  const terminal = document.querySelector('.terminal-shell');
  const resizer = document.querySelector('#resize-right-dock');

  assert.equal(resizer.hidden, false);
  resizer.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'End',
    bubbles: true,
    cancelable: true
  }));
  await wait(230);

  const renderedSize = Number.parseInt(
    workspace.style.getPropertyValue('--preferred-right-dock-width'),
    10
  );
  assert.ok(renderedSize > 2000);
  assert.equal(Number(resizer.getAttribute('aria-valuemax')), renderedSize);
  assert.equal(saves.at(-1).workspace.defaultDockSizes.right, renderedSize);
  assert.equal(document.querySelector('.terminal-shell'), terminal);
});

test('pointer resizing saves once at release and keeps the command pipeline intact', async () => {
  const { dom, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  const output = document.querySelector('#output');
  const command = document.querySelector('#command');
  const resizer = document.querySelector('#resize-left-dock');
  output.scrollTop = 212;
  command.focus();

  resizer.dispatchEvent(new dom.window.MouseEvent('pointerdown', {
    clientX: 240,
    button: 0,
    bubbles: true,
    cancelable: true
  }));
  document.dispatchEvent(new dom.window.MouseEvent('pointermove', {
    clientX: 285,
    bubbles: true,
    cancelable: true
  }));

  assert.equal(document.querySelector('#workspace').style.getPropertyValue('--preferred-left-dock-width'), '285px');
  assert.equal(saves.length, 0);

  document.dispatchEvent(new dom.window.MouseEvent('pointerup', {
    clientX: 285,
    bubbles: true,
    cancelable: true
  }));
  await wait(230);

  assert.equal(saves.at(-1).workspace.defaultDockSizes.left, 285);
  assert.equal(output.scrollTop, 212);
  assert.equal(document.querySelector('#command'), command);
  assert.equal(document.activeElement, command);
});

test('character GMCP restores and persists character-specific dock sizes', async () => {
  const { dom, handlers, saves } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.gmcpState({
    char: { status: { name: 'Prime', class: 'Assassin', level: 50 } },
    room: {},
    group: null
  });

  const workspace = document.querySelector('#workspace');
  assert.equal(workspace.style.getPropertyValue('--preferred-left-dock-width'), '220px');
  assert.equal(workspace.style.getPropertyValue('--preferred-right-dock-width'), '300px');
  assert.equal(workspace.style.getPropertyValue('--preferred-outer-right-dock-width'), '280px');
  assert.equal(workspace.style.getPropertyValue('--preferred-bottom-dock-height'), '210px');
  assert.equal(document.querySelector('#resize-right-dock').hidden, false);
  assert.equal(document.querySelector('#resize-bottom-dock').hidden, false);

  document.querySelector('#resize-right-dock').dispatchEvent(
    new dom.window.KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true
    })
  );
  await wait(230);

  assert.equal(saves.at(-1).workspace.characters.prime.dockSizes.right, 310);
  assert.equal(saves.at(-1).workspace.defaultDockSizes.right, 240);
});


test('a panel can occupy a second independent column to the right of the right dock', async () => {
  const { dom, saves } = createRenderer({ workspaceWidth: 1920, workspaceHeight: 1000 });
  const document = dom.window.document;
  await wait();

  document.querySelector('[data-panel-menu-button="affects"]').click();
  document.querySelector(
    '[data-panel-action="move-outer-right"][data-panel-id="affects"]'
  ).click();
  await wait(230);

  assert.equal(document.querySelector('#panel-affects').parentElement.id, 'dock-outer-right');
  assert.equal(document.querySelector('#dock-right').hidden, false);
  assert.equal(document.querySelector('#dock-outer-right').hidden, false);
  assert.equal(document.querySelector('#workspace').classList.contains('has-right-dock'), true);
  assert.equal(document.querySelector('#workspace').classList.contains('has-outer-right-dock'), true);
  assert.equal(saves.at(-1).workspace.defaultLayout.affects.region, 'outer-right');
});

test('the far-right dock resizes independently without changing the inner right dock', async () => {
  const { dom, saves } = createRenderer({ workspaceWidth: 1920, workspaceHeight: 1000 });
  const document = dom.window.document;
  await wait();

  document.querySelector('[data-panel-menu-button="affects"]').click();
  document.querySelector(
    '[data-panel-action="move-outer-right"][data-panel-id="affects"]'
  ).click();
  await wait(230);

  const workspace = document.querySelector('#workspace');
  const rightBefore = workspace.style.getPropertyValue('--preferred-right-dock-width');
  const resizer = document.querySelector('#resize-outer-right-dock');
  resizer.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowLeft',
    bubbles: true,
    cancelable: true
  }));
  await wait(230);

  assert.equal(workspace.style.getPropertyValue('--preferred-outer-right-dock-width'), '270px');
  assert.equal(workspace.style.getPropertyValue('--preferred-right-dock-width'), rightBefore);
  assert.equal(saves.at(-1).workspace.defaultDockSizes['outer-right'], 270);
});
