'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const ansi = require('../src/ansi-parser');
const { installFakeXterm } = require('./fake-xterm');
const communications = require('../src/communications');
const { DEFAULT_SETTINGS } = require('../src/settings-store');

function createRenderer(settingsOverride = {}) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://nukefire.test/'
  });
  const handlers = {};
  const saves = [];
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  Object.assign(settings.workspace, settingsOverride.workspace || {});

  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireCommunications = communications;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }),
    disconnect: async () => ({ ok: true }),
    send: async () => ({ ok: true }),
    sendGmcp: async () => ({ ok: true }),
    setTerminalSize: async () => ({ ok: true }),
    setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null,
    loadSettings: async () => ({ settings: JSON.parse(JSON.stringify(settings)) }),
    saveSettings: async (next) => {
      saves.push(JSON.parse(JSON.stringify(next)));
      return { ok: true, settings: next };
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

function wait(milliseconds = 30) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

test('Communications opens beneath Affects in the left dock with accessible filters', async () => {
  const { dom } = createRenderer();
  const document = dom.window.document;
  await wait();

  assert.equal(document.querySelector('#panel-affects').parentElement.id, 'dock-left');
  assert.equal(document.querySelector('#panel-communications').parentElement.id, 'dock-left');
  assert.equal(document.querySelector('#panel-affects').nextElementSibling.id, 'panel-communications');
  assert.equal(document.querySelector('#dock-left').hidden, false);
  assert.equal(document.querySelector('#dock-bottom').hidden, true);
  const mapperGroup = document.querySelector('#dock-right .dock-tab-group[data-tab-group="mapper"]');
  assert.ok(mapperGroup);
  assert.ok(mapperGroup.contains(document.querySelector('#panel-mapper')));
  assert.ok(mapperGroup.contains(document.querySelector('#panel-context-deck')));
  assert.equal(document.querySelector('#panel-mapper').dataset.tabActive, 'true');
  assert.equal(document.querySelector('#panel-context-deck').dataset.tabActive, 'false');
  assert.equal(document.querySelector('#panel-vitals').parentElement.id, 'dock-right');
  assert.equal(document.querySelector('#panel-quick-commands').hidden, true);
  assert.equal(document.querySelector('#panel-live-state').hidden, true);
  assert.equal(document.querySelector('#panel-protocol').hidden, true);
  assert.equal(document.querySelector('#panel-context-deck').hidden, false);
  assert.equal(document.querySelectorAll('#communications-tabs [role="tab"]').length, 10);
  assert.equal(document.querySelector('[data-communication-channel="shout"]').getAttribute('aria-label'), 'Shout');
  assert.equal(document.querySelector('[data-communication-channel="holler"]').getAttribute('aria-label'), 'Holler');
  assert.equal(document.querySelector('#communications-messages').getAttribute('aria-live'), 'off');
  assert.equal(document.querySelector('[data-communication-channel="grats"]').getAttribute('aria-label'), 'Grats');
  assert.equal(document.querySelector('[data-communication-channel="ssf"]'), null);
  assert.equal(document.querySelector('[data-communication-channel="bonejack"]'), null);
  assert.deepEqual(
    [...document.querySelectorAll('.communications-control-label')].map((node) => node.textContent.trim()),
    ['Channels', 'Display', 'Find']
  );
  assert.equal(document.querySelector('#communications-order').value, 'newest-top');
  assert.equal(
    document.querySelector('#communications-messages').getAttribute('aria-label'),
    'Communications messages, newest at top'
  );
  assert.ok(document.querySelector('[data-panel-menu-button="communications"]'));
  assert.ok(document.querySelector('[data-panel-toggle="communications"]'));
});

test('Communications content scrolls inside fixed dock and tab-group bounds', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
  assert.match(css, /\.communications-panel\s*\{[^}]*overflow:\s*hidden;/su);
  assert.match(css, /\.communications-control-row\s*\{[^}]*flex-wrap:\s*wrap;/su);
  assert.match(css, /\.communications-tabs\s*\{[^}]*flex-wrap:\s*wrap;[^}]*max-height:\s*72px;[^}]*overflow-y:\s*auto;/su);
  assert.match(css, /\.communications-messages\s*\{[^}]*min-height:\s*0;[^}]*max-height:\s*100%;[^}]*overflow:\s*auto;/su);
  assert.match(css, /\.dock-tab-group:has\(\.communications-panel\)[^{]*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\);/su);
  assert.match(css, /\.dock-bottom > \.communications-panel,[^{]*\.dock-bottom > \.dock-tab-group:has\(\.communications-panel\)[^{]*\{[^}]*height:\s*100%;[^}]*overflow:\s*hidden;/su);
  assert.match(
    css,
    /\.dock-left > \.communications-panel,[^{]*\.dock-outer-right > \.dock-tab-group:has\(\.communications-panel\[data-tab-active="true"\]\)\s*\{[^}]*height:\s*clamp\(300px,\s*48vh,\s*520px\);[^}]*max-height:\s*calc\(100% - 10px\);[^}]*overflow:\s*hidden;/su
  );
  assert.doesNotMatch(
    css,
    /\.dock-left > \.dock-tab-group:has\(\.communications-panel\),/u
  );
});

test('Grats is available while SSF and Bonejack appear only when supported or detected', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  assert.ok(document.querySelector('[data-communication-channel="grats"]'));
  assert.equal(document.querySelector('[data-communication-channel="ssf"]'), null);
  assert.equal(document.querySelector('[data-communication-channel="bonejack"]'), null);

  handlers.gmcp({
    packageName: 'Comm.Channel.List',
    body: [
      { name: 'gossip', caption: 'Gossip', command: 'gossip' },
      { name: 'grats', caption: 'Grats', command: 'grats' },
      { name: 'ssf', caption: 'SSF', command: 'ssf' }
    ]
  });
  await wait();
  assert.ok(document.querySelector('[data-communication-channel="ssf"]'));
  assert.equal(document.querySelector('[data-communication-channel="bonejack"]'), null);

  handlers.text(
    "You congrat, 'Nice kill.'\n" +
    "Mo bonejacks, 'Builder line.'\n"
  );
  await wait();

  assert.ok(document.querySelector('[data-communication-channel="bonejack"]'));
  assert.equal(
    document.querySelectorAll('[data-communication-message][data-channel="grats"]').length,
    1
  );
  assert.equal(
    document.querySelectorAll('[data-communication-message][data-channel="bonejack"]').length,
    1
  );
});

test('recognized text is copied to Communications while complete terminal output remains intact', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.text("\u001b[33mMo gossips, 'Hello wasteland.'\u001b[0m\nTechnology Square\n");
  await wait();

  const output = document.querySelector('#output');
  assert.match(output.textContent, /Mo gossips/);
  assert.match(output.textContent, /Technology Square/);
  const messages = document.querySelectorAll('[data-communication-message][data-channel="gossip"]');
  assert.equal(messages.length, 1);
  assert.match(messages[0].textContent, /Gossip/u);
  assert.match(messages[0].textContent, /Hello wasteland/u);
});


test('Communications defaults to newest at top and can switch to newest at bottom', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.text("Mo gossips, 'Older.'\nMo gossips, 'Newest.'\n");
  await wait();

  let messages = [...document.querySelectorAll('[data-communication-message][data-channel="gossip"]')];
  assert.equal(messages.length, 2);
  assert.match(messages[0].textContent, /Newest/u);
  assert.match(messages[1].textContent, /Older/u);
  const container = document.querySelector('#communications-messages');
  assert.equal(container.dataset.messageOrder, 'newest-top');
  assert.equal(container.scrollTop, 0);

  const order = document.querySelector('#communications-order');
  order.value = 'newest-bottom';
  order.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await wait();

  messages = [...document.querySelectorAll('[data-communication-message][data-channel="gossip"]')];
  assert.match(messages[0].textContent, /Older/u);
  assert.match(messages[1].textContent, /Newest/u);
  assert.equal(container.dataset.messageOrder, 'newest-bottom');
  assert.equal(container.getAttribute('aria-label'), 'Communications messages, newest at bottom');
  assert.equal(container.scrollTop, container.scrollHeight);
});


test('Communications follows only the selected live edge and preserves manual scrollback', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  const container = document.querySelector('#communications-messages');
  Object.defineProperty(container, 'clientHeight', {
    configurable: true,
    get: () => 100
  });
  Object.defineProperty(container, 'scrollHeight', {
    configurable: true,
    get: () => container.childElementCount * 100
  });

  handlers.text("Mo gossips, 'One.'\nMo gossips, 'Two.'\n");
  await wait();
  container.scrollTop = 100;
  container.dispatchEvent(new dom.window.Event('scroll'));
  handlers.text("Mo gossips, 'Three.'\n");
  await wait();
  assert.equal(container.scrollTop, 200);

  container.scrollTop = 0;
  handlers.text("Mo gossips, 'Four.'\n");
  await wait();
  assert.equal(container.scrollTop, 0);

  const order = document.querySelector('#communications-order');
  order.value = 'newest-bottom';
  order.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await wait();
  assert.equal(container.scrollTop, container.scrollHeight);

  container.scrollTop = 100;
  container.dispatchEvent(new dom.window.Event('scroll'));
  handlers.text("Mo gossips, 'Five.'\n");
  await wait();
  assert.equal(container.scrollTop, 100);

  container.scrollTop = container.scrollHeight - container.clientHeight;
  container.dispatchEvent(new dom.window.Event('scroll'));
  handlers.text("Mo gossips, 'Six.'\n");
  await wait();
  assert.equal(container.scrollTop, container.scrollHeight);
});

test('newest-bottom live edge survives dock-group rebuilds such as combat panel auto-open', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.text("Mo gossips, 'One.'\nMo gossips, 'Two.'\nMo gossips, 'Three.'\n");
  await wait();

  const container = document.querySelector('#communications-messages');
  Object.defineProperty(container, 'clientHeight', { configurable: true, get: () => 100 });
  Object.defineProperty(container, 'scrollHeight', {
    configurable: true,
    get: () => container.childElementCount * 100
  });

  const order = document.querySelector('#communications-order');
  order.value = 'newest-bottom';
  order.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await wait();
  container.scrollTop = container.scrollHeight - container.clientHeight;
  container.dispatchEvent(new dom.window.Event('scroll'));

  // Chromium may reset an overflow viewport when its panel is detached and
  // reparented during a dock-group rebuild. Model that explicitly so this
  // regression protects the real combat/Mob Inspector auto-open path.
  const leftDock = document.querySelector('#dock-left');
  const replaceChildren = leftDock.replaceChildren.bind(leftDock);
  leftDock.replaceChildren = (...nodes) => {
    replaceChildren(...nodes);
    container.scrollTop = 0;
  };

  const mobToggle = document.querySelector('[data-panel-toggle="mobInspector"]');
  mobToggle.checked = true;
  mobToggle.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await wait();

  assert.equal(container.dataset.messageOrder, 'newest-bottom');
  assert.equal(container.scrollTop, container.scrollHeight);
  dom.window.close();
});

test('GMCP channel packets provide sender and message without terminal scraping', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.gmcp({
    packageName: 'Comm.Channel',
    body: { chan: 'group', player: 'Prime', msg: 'Stack north.' },
    state: {
      char: {}, room: {}, comm: {}, group: null, meta: {}
    }
  });
  await wait();

  const message = document.querySelector('[data-communication-message][data-channel="group"]');
  assert.ok(message);
  assert.match(message.textContent, /Group/u);
  assert.match(message.textContent, /Prime/u);
  assert.match(message.textContent, /Stack north/u);
});

test('channel filters, search, unread counts, and keyboard navigation remain local to the panel', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  const visibility = document.querySelector('#show-panel-communications');
  visibility.checked = false;
  visibility.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  handlers.text("Mo gossips, 'One.'\n[Newbie] Caul: Two.\n");
  await wait();

  assert.equal(document.querySelector('[data-communication-unread="all"]').textContent, '2');
  visibility.checked = true;
  visibility.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

  const newbieTab = document.querySelector('[data-communication-channel="newbie"]');
  newbieTab.click();
  await wait();
  assert.equal(document.querySelectorAll('[data-communication-message]').length, 1);
  assert.match(document.querySelector('[data-communication-message]').textContent, /Two/u);

  newbieTab.dispatchEvent(new dom.window.KeyboardEvent('keydown', {
    key: 'ArrowRight', bubbles: true, cancelable: true
  }));
  await wait();
  assert.equal(document.activeElement.dataset.communicationChannel, 'group');

  document.querySelector('#communications-search').value = 'not present';
  document.querySelector('#communications-search').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(document.querySelectorAll('[data-communication-message]').length, 0);
  assert.equal(document.querySelector('#communications-empty').hidden, false);
});

test('selected communication channel saves per character', async () => {
  const settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.workspace));
  settings.characters.prime = {
    name: 'Prime',
    communications: { activeChannel: 'tell', messageOrder: 'newest-bottom' }
  };
  const { dom, handlers, saves } = createRenderer({ workspace: settings });
  const document = dom.window.document;
  await wait();

  handlers.gmcpState({
    char: { status: { name: 'Prime' } },
    room: {}, group: null
  });
  await wait();
  assert.equal(document.querySelector('[data-communication-channel="tell"]').getAttribute('aria-selected'), 'true');
  assert.equal(document.querySelector('#communications-order').value, 'newest-bottom');

  document.querySelector('[data-communication-channel="group"]').click();
  const order = document.querySelector('#communications-order');
  order.value = 'newest-top';
  order.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await wait(230);
  assert.deepEqual(saves.at(-1).workspace.characters.prime.communications, {
    activeChannel: 'group',
    messageOrder: 'newest-top'
  });
});


test('colored GMCP and matching terminal gossip produce one clean message', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  const colored = "\u001b[0m\u001b[38;2;255;0;102mYou\u001b[0m " +
    "\u001b[38;2;0;0;153mgossip,\u001b[0m " +
    "\u001b[38;2;255;0;102m'test'\u001b[0m";

  handlers.gmcp({
    packageName: 'NukeFire.Comms.Message',
    body: { channel: 'gossip', sender: 'Prime', text: colored },
    state: { char: {}, room: {}, comm: {}, group: null, meta: {} }
  });
  handlers.text(`${colored}\n`);
  await wait();

  const messages = document.querySelectorAll('[data-communication-message][data-channel="gossip"]');
  assert.equal(messages.length, 1);
  assert.match(messages[0].textContent, /You gossip, 'test'/u);
  assert.doesNotMatch(messages[0].textContent, /\[(?:0|38);/u);
  const styledSpans = messages[0].querySelectorAll('.communication-body span');
  assert.equal(styledSpans.length, 5);
  assert.equal(styledSpans[0].style.color, 'rgb(255, 0, 102)');
  assert.equal(styledSpans[2].style.color, 'rgb(0, 0, 153)');
  assert.equal(styledSpans[4].style.color, 'rgb(255, 0, 102)');
});

test('terminal-first and GMCP-second copies also deduplicate', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.text("Vit gossips, 'same line'\n");
  handlers.gmcp({
    packageName: 'Comm.Channel',
    body: { chan: 'gossip', player: 'Vit', msg: 'same line' },
    state: { char: {}, room: {}, comm: {}, group: null, meta: {} }
  });
  await wait();

  const messages = document.querySelectorAll('[data-communication-message][data-channel="gossip"]');
  assert.equal(messages.length, 1);
});


test('plain GMCP entry is upgraded when the matching colored terminal line arrives', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.gmcp({
    packageName: 'Comm.Channel',
    body: { chan: 'gossip', player: 'Vit', msg: 'same colored line' },
    state: { char: {}, room: {}, comm: {}, group: null, meta: {} }
  });
  handlers.text("\u001b[38;2;255;0;102mVit gossips, 'same colored line'\u001b[0m\n");
  await wait();

  const messages = document.querySelectorAll('[data-communication-message][data-channel="gossip"]');
  assert.equal(messages.length, 1);
  const colored = messages[0].querySelector('.communication-body span');
  assert.ok(colored);
  assert.equal(colored.style.color, 'rgb(255, 0, 102)');
  assert.match(messages[0].textContent, /same colored line/u);
});

test('monochrome terminal preference also applies to communication body spans', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  document.querySelector('#terminal-monochrome').checked = true;
  document.querySelector('#terminal-monochrome').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  handlers.text("\u001b[31mMo gossips, 'mono'\u001b[0m\n");
  await wait();

  assert.equal(document.body.classList.contains('terminal-monochrome'), true);
  assert.ok(document.querySelector('.communication-body span[style]'));
});


test('terminal gags do not suppress structured messages from Communications', async () => {
  const { dom, handlers } = createRenderer();
  const document = dom.window.document;
  await wait();

  handlers.gmcp({
    packageName: 'Comm.Channel',
    body: { chan: 'gossip', player: 'Prime', msg: 'Communications only.' },
    state: { char: {}, room: {}, comm: {}, group: null, meta: {} }
  });
  await wait();

  assert.equal(
    document.querySelectorAll('[data-communication-message][data-channel="gossip"]').length,
    1
  );
  assert.match(
    document.querySelector('#communications-messages').textContent,
    /Communications only\./u
  );
  dom.window.close();
});
