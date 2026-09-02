'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

function createRenderer() {
  const ansi = require('../src/ansi-parser');
  const { installFakeXterm } = require('./fake-xterm');
  const mapper = require('../src/mapper');
  const communications = require('../src/communications');
  const panelWindows = require('../src/panel-window-state');
  const contextDeck = require('../src/context-deck');
  const affects = require('../src/affects');
  const mobInspector = require('../src/mob-inspector');
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const source = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://nukefire.test/' });
  const handlers = {};
  const sent = [];
  const gmcpRequests = [];
  dom.window.NukeFireAnsi = ansi;
  installFakeXterm(dom);
  dom.window.NukeFireMapper = mapper;
  dom.window.NukeFireCommunications = communications;
  dom.window.NukeFirePanelWindows = panelWindows;
  dom.window.NukeFireContext = contextDeck;
  dom.window.NukeFireAffects = affects;
  dom.window.NukeFireMobInspector = mobInspector;
  dom.window.nukefire = {
    connect: async () => ({ ok: true }), disconnect: async () => ({ ok: true }),
    send: async (command) => { sent.push(command); return { ok: true }; },
    sendGmcp: async (packageName) => { gmcpRequests.push(packageName); return { ok: true }; },
    setTerminalSize: async () => ({ ok: true }), setClientPreferences: async () => ({ ok: true }),
    getGmcpState: async () => null, loadSettings: async () => ({ settings: null }),
    saveSettings: async (settings) => ({ ok: true, settings }),
    loadMap: async () => ({ ok: true, map: mapper.normalizeMapData({}) }),
    saveMap: async (mapData) => ({ ok: true, map: mapData }),
    onText: () => {}, onStatus: (callback) => { handlers.status = callback; }, onEcho: () => {},
    onGmcp: (callback) => { handlers.gmcp = callback; }, onGmcpState: (callback) => { handlers.gmcpState = callback; },
    onPromptBoundary: () => {}, onProtocolWarning: () => {}, onCharset: () => {},
    onTerminalType: () => {}, onWindowSize: () => {}, onError: () => {},
    onMenuConnect: () => {}, onMenuFind: () => {}, onMenuPreferences: () => {},
    onMenuFocusCommand: () => {}, onMenuFocusOutput: () => {}, onMenuReadLastLine: () => {}, onMenuReadVitals: () => {},
    onPanelBoundsChanged: () => {}, onPanelClosed: () => {}, onPanelAction: () => {}
  };
  dom.window.eval(source);
  return { dom, handlers, sent, gmcpRequests };
}

function mobPacket() {
  return {
    schema: 1,
    trigger: 'consider',
    server_time: 2000,
    context: { lookup_arg: 'statue', lookup_had_argument: true, resolved_from_current_target: false, room_vnum: 64501, is_current_target: false, in_combat_with_player: false },
    mob: {
      vnum: 30319, name: 'The Statue', keywords: 'statue ra', live: true,
      level: 50, remorts: 325, class: 'Occultist',
      flags: { boss: true, undead: true, aggressive: true }
    },
    health: { available: true, current: 680000, max: 1000000, percent: 68, fighting: 'Mo' },
    zone: { vnum: 645, name: 'The Road of Ra', suggested_remorts: '251-399R' },
    consider: { available: true, score: 8, label: 'Hard fight', advice: 'Magical damage and control likely.', group_size: 1, group_avg_remorts: 0, group_label: 'Solo' },
    history: { available: true, your_kills: 17, world_kills: 901, your_rank: 3, live_world: 1, live_zone: 1, exact_mob_deaths_available: false, last_kill_available: false },
    zone_mastery: { available: true, kills: 400, deaths: 2, boss_kills: 17, miniboss_kills: 9, toughest_kill: 'The Statue', scope: 'zone' },
    affects: {
      schema: 1, server_time: 2000, count: 7, total: 7,
      effects: [
        { id: '1', spell_id: 1, spell: 'Censure', remaining: 21, expire_at: 2021, source_type: 'spell' },
        { id: '2', spell_id: 2, spell: 'Stone Skin', permanent: true, apply: 'armor', modifier: 125, source_type: 'spell' },
        { id: '3', spell_id: 3, spell: 'Crippling Wound', remaining: 72, expire_at: 2072, source_type: 'spell' },
        { id: '4', spell_id: 4, spell: 'Berserk', remaining: 44, expire_at: 2044, source_type: 'spell' },
        { id: '5', spell_id: 5, spell: 'Blind', remaining: 10, expire_at: 2010, source_type: 'spell' },
        { id: '6', spell_id: 6, spell: 'Garrote', remaining: 30, expire_at: 2030, source_type: 'spell' },
        { id: '7', spell_id: 7, spell: 'Rend', remaining: 60, expire_at: 2060, source_type: 'spell' }
      ]
    }
  };
}

test('Mob Inspector is a hidden-by-default dockable panel with no guessed command buttons', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  const panel = document.querySelector('#panel-mob-inspector');
  assert.ok(panel);
  assert.equal(panel.dataset.workspacePanel, 'mobInspector');
  assert.equal(document.querySelector('#mob-inspector-affects').getAttribute('aria-live'), 'off');
  assert.equal(document.querySelector('#mob-inspector-summary').getAttribute('aria-live'), 'polite');
  assert.ok(document.querySelector('[data-panel-toggle="mobInspector"]'));
  assert.ok(document.querySelector('[data-panel-action="pop-out"][data-panel-id="mobInspector"]'));
  assert.ok(document.querySelector('script[src="../src/mob-inspector.js"]'));
  assert.ok(document.querySelector('svg#mob-inspector-art'));
  assert.equal(document.querySelector('#mob-inspector-consider'), null);
  assert.equal(document.querySelector('#mob-inspector-mobcount'), null);
  assert.equal(document.querySelector('#mob-inspector-diagnose'), null);
});

test('NukeFire.Mob.Info auto-opens expanded context and keeps refresh server-driven', async () => {
  const { dom, handlers, sent, gmcpRequests } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'Room.Info', body: { num: 64501, name: 'Statue Hall' } });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const document = dom.window.document;
  assert.equal(document.querySelector('#panel-mob-inspector').hidden, false);
  assert.equal(document.querySelector('#panel-mob-inspector').dataset.mobInspectorMode, 'expanded');
  assert.equal(document.querySelector('#mob-inspector-content').hidden, false);
  assert.match(document.querySelector('#mob-inspector-name').textContent, /The Statue/u);
  assert.match(document.querySelector('#mob-inspector-zone').textContent, /Zone 645/u);
  assert.match(document.querySelector('#mob-inspector-hp-text').textContent, /68%/u);
  assert.match(document.querySelector('#mob-inspector-history').textContent, /17/u);
  assert.match(document.querySelector('#mob-inspector-history-note').textContent, /deaths to this exact mob/u);
  assert.match(document.querySelector('#mob-inspector-mastery').textContent, /Zone deaths2/u);
  assert.equal(document.querySelectorAll('#mob-inspector-affects > .mob-affect-card').length, 6);
  assert.equal(document.querySelector('#mob-inspector-affects-more').hidden, false);
  assert.match(document.querySelector('#mob-inspector-affects-more summary').textContent, /1 more/u);
  assert.match(document.querySelector('#mob-inspector-affects-overflow').textContent, /Stone Skin/u);
  assert.equal(document.querySelector('#mob-inspector-art').dataset.category, 'undead');
  assert.ok(document.querySelectorAll('#mob-inspector-art path').length >= 2);
  assert.equal(document.querySelector('#mob-inspector-rank-badge').textContent, 'BOSS');

  document.querySelector('#mob-inspector-refresh').click();
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(sent, []);
  assert.deepEqual(gmcpRequests, ['NukeFire.Mob']);
  dom.window.close();
});

test('combat target turns the inspector into a compact live-health card and combat end hides it', async () => {
  const { dom, handlers, gmcpRequests } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'Room.Info', body: { num: 64501, name: 'Statue Hall' } });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  await new Promise((resolve) => setTimeout(resolve, 10));

  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: { name: 'The Statue', vnum: 30319, hp: 510000, maxhp: 1000000 } } });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const document = dom.window.document;
  assert.equal(document.querySelector('#panel-mob-inspector').dataset.mobInspectorMode, 'compact');
  assert.match(document.querySelector('#mob-inspector-hp-text').textContent, /51%/u);
  assert.equal(document.querySelectorAll('#mob-inspector-affects > .mob-affect-card').length, 4);
  assert.match(document.querySelector('#mob-inspector-affects-more summary').textContent, /3 more/u);
  assert.deepEqual(gmcpRequests, ['NukeFire.Mob', 'Char.TargetAffects']);

  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: null } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(document.querySelector('#panel-mob-inspector').hidden, true);
  dom.window.close();
});

test('leaving the inspected room collapses the transient panel instead of showing stale mob state', async () => {
  const { dom, handlers } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'Room.Info', body: { num: 64501, name: 'Statue Hall' } });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(dom.window.document.querySelector('#panel-mob-inspector').hidden, false);

  handlers.gmcp({ packageName: 'Room.Info', body: { num: 64502, name: 'Eastern Passage' } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(dom.window.document.querySelector('#panel-mob-inspector').hidden, true);
  dom.window.close();
});

test('auto-open can be disabled without suppressing incoming mob state', async () => {
  const { dom, handlers } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  const document = dom.window.document;
  document.querySelector('#mob-inspector-auto-open').checked = false;
  document.querySelector('#mob-inspector-auto-open').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(document.querySelector('#panel-mob-inspector').hidden, true);
  assert.doesNotMatch(document.querySelector('#mob-inspector-name').textContent, /The Statue/u, 'hidden Inspector should defer heavy DOM work');
  const visibilityToggle = document.querySelector('[data-panel-toggle="mobInspector"]');
  visibilityToggle.checked = true;
  visibilityToggle.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(document.querySelector('#panel-mob-inspector').hidden, false);
  assert.match(document.querySelector('#mob-inspector-name').textContent, /The Statue/u, 'stored incoming state must render when the Inspector becomes visible');
  dom.window.close();
});


test('combat TargetAffects refresh replaces stale Mob Inspector debuffs for the current target only', async () => {
  const { dom, handlers, gmcpRequests } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'Room.Info', body: { num: 64501, name: 'Statue Hall' } });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: { name: 'The Statue', vnum: 30319, hp: 510000, maxhp: 1000000 } } });
  await new Promise((resolve) => setTimeout(resolve, 10));

  handlers.gmcp({
    packageName: 'Char.TargetAffects',
    body: {
      server_time: 2005,
      target: { name: 'The Statue', type: 'npc', vnum: 30319 },
      count: 1, total: 1, truncated: false,
      effects: [{ id: 'fresh-blind', spell_id: 5, spell: 'Blind', remaining: 9, expire_at: 2014, source_type: 'spell' }]
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const document = dom.window.document;
  assert.equal(document.querySelector('#mob-inspector-affects-count').textContent, '1 active');
  assert.match(document.querySelector('#mob-inspector-affects').textContent, /Blind/u);
  assert.doesNotMatch(document.querySelector('#mob-inspector-affects').textContent, /Censure/u);
  assert.deepEqual(gmcpRequests, ['NukeFire.Mob', 'Char.TargetAffects']);
  dom.window.close();
});

test('combat ignores an explicitly inspected non-current mob even when it shares the same vnum', async () => {
  const { dom, handlers } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'Room.Info', body: { num: 64501, name: 'Statue Hall' } });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: { name: 'The Statue', vnum: 30319, hp: 510000, maxhp: 1000000 } } });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const decoy = mobPacket();
  decoy.trigger = 'consider';
  decoy.context = { lookup_arg: '2.statue', lookup_had_argument: true, resolved_from_current_target: false, room_vnum: 64501, is_current_target: false, in_combat_with_player: true };
  decoy.health = { available: true, current: 999999, max: 999999, percent: 100, fighting: 'Someone Else' };
  decoy.affects = { schema: 1, server_time: 2006, count: 1, total: 1, effects: [{ id: 'wrong', spell: 'Wrong Mob Mark', remaining: 30, expire_at: 2036, source_type: 'spell' }] };
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: decoy });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const document = dom.window.document;
  assert.match(document.querySelector('#mob-inspector-hp-text').textContent, /51%/u);
  assert.doesNotMatch(document.querySelector('#mob-inspector-affects').textContent, /Wrong Mob Mark/u);
  dom.window.close();
});

test('target handoff keeps one Inspector surface open and loads the new authoritative opponent', async () => {
  const { dom, handlers, gmcpRequests } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'Room.Info', body: { num: 64501, name: 'Statue Hall' } });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: { name: 'The Statue', vnum: 30319, hp: 510000, maxhp: 1000000 } } });
  await new Promise((resolve) => setTimeout(resolve, 10));

  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 880, maxhp: 1000, opponent: { name: 'A Second Mob', vnum: 30320, hp: 700000, maxhp: 800000 } } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const document = dom.window.document;
  assert.equal(document.querySelector('#panel-mob-inspector').hidden, false);
  assert.equal(document.querySelector('#panel-mob-inspector').dataset.mobInspectorMode, 'compact');
  assert.match(document.querySelector('#mob-inspector-empty').textContent, /Loading current combat target: A Second Mob/u);

  const next = mobPacket();
  next.trigger = 'auto';
  next.context = { lookup_arg: '', lookup_had_argument: false, resolved_from_current_target: true, room_vnum: 64501, is_current_target: true, in_combat_with_player: true };
  next.mob = { ...next.mob, vnum: 30320, name: 'A Second Mob', flags: { aggressive: true } };
  next.health = { available: true, current: 700000, max: 800000, percent: 88, fighting: 'Mo' };
  next.affects = { schema: 1, server_time: 2010, count: 1, total: 1, effects: [{ id: 'next', spell: 'Poison', remaining: 40, expire_at: 2050, source_type: 'spell' }] };
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: next });
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(document.querySelector('#mob-inspector-name').textContent, 'A Second Mob');
  assert.match(document.querySelector('#mob-inspector-affects').textContent, /Poison/u);
  assert.equal(document.querySelector('#mob-inspector-content').hidden, false);
  assert.deepEqual(gmcpRequests, ['NukeFire.Mob', 'Char.TargetAffects', 'NukeFire.Mob', 'Char.TargetAffects']);
  dom.window.close();
});

test('a combat kill forces current-target refresh even when the next mob has the same identity key', async () => {
  const { dom, handlers, gmcpRequests } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: { name: 'The Statue', vnum: 30319, hp: 1000, maxhp: 1000000 } } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  const before = gmcpRequests.filter((name) => name === 'NukeFire.Mob').length;

  handlers.gmcp({ packageName: 'NukeFire.Combat', body: { schema: 1, window_ms: 200, out: { hits: 1, misses: 0, damage: 1000, criticals: 0, kills: 1 }, in: { hits: 0, misses: 0, damage: 0, criticals: 0, deaths: 0 } } });
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(gmcpRequests.filter((name) => name === 'NukeFire.Mob').length, before + 1);
  assert.equal(gmcpRequests.at(-1), 'Char.TargetAffects');
  dom.window.close();
});

test('rapid kill target loss keeps target surfaces stable until the next opponent arrives', async () => {
  const { dom, handlers } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'Room.Info', body: { num: 64501, name: 'Statue Hall' } });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  handlers.gmcp({
    packageName: 'Char.Vitals',
    body: {
      hp: 900,
      maxhp: 1000,
      opponent: { name: 'The Statue', vnum: 30319, hp: 1000, maxhp: 1000000 }
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const document = dom.window.document;
  const inspector = document.querySelector('#panel-mob-inspector');
  const opponentSection = document.querySelector('.opponent-vitals-section');
  assert.equal(inspector.hidden, false);
  assert.equal(opponentSection.hidden, false);
  assert.equal(document.querySelector('#opponent-name').textContent, 'The Statue');

  handlers.gmcp({
    packageName: 'NukeFire.Combat',
    body: {
      schema: 1,
      window_ms: 200,
      out: { hits: 1, misses: 0, damage: 1000, criticals: 0, kills: 1 },
      in: { hits: 0, misses: 0, damage: 0, criticals: 0, deaths: 0 }
    }
  });
  handlers.gmcp({
    packageName: 'Char.Vitals',
    body: { hp: 900, maxhp: 1000, opponent: null }
  });

  // The authoritative state is targetless, but presentation should not
  // collapse during the short kill-to-next-target handoff.
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(inspector.hidden, false);
  assert.equal(opponentSection.hidden, false);
  assert.equal(document.querySelector('#opponent-name').textContent, 'The Statue');

  handlers.gmcp({
    packageName: 'Char.Vitals',
    body: {
      hp: 900,
      maxhp: 1000,
      opponent: { name: 'A Second Mob', vnum: 30320, hp: 700000, maxhp: 800000 }
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.equal(inspector.hidden, false);
  assert.equal(opponentSection.hidden, false);
  assert.equal(document.querySelector('#opponent-name').textContent, 'A Second Mob');

  // Let the 50 ms hold expire. The final authoritative opponent must remain
  // visible; the reconciliation must not replay the transient empty state.
  await new Promise((resolve) => setTimeout(resolve, 55));
  assert.equal(inspector.hidden, false);
  assert.equal(opponentSection.hidden, false);
  assert.equal(document.querySelector('#opponent-name').textContent, 'A Second Mob');
  dom.window.close();
});

test('synchronous multi-kill combat packets coalesce one current-target refresh pair', async () => {
  const { dom, handlers, gmcpRequests } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  handlers.gmcp({
    packageName: 'Char.Vitals',
    body: {
      hp: 900,
      maxhp: 1000,
      opponent: { name: 'The Statue', vnum: 30319, hp: 1000, maxhp: 1000000 }
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const beforeMob = gmcpRequests.filter((name) => name === 'NukeFire.Mob').length;
  const beforeAffects = gmcpRequests.filter((name) => name === 'Char.TargetAffects').length;
  const killPacket = {
    packageName: 'NukeFire.Combat',
    body: {
      schema: 1,
      window_ms: 200,
      out: { hits: 1, misses: 0, damage: 1000, criticals: 0, kills: 1 },
      in: { hits: 0, misses: 0, damage: 0, criticals: 0, deaths: 0 }
    }
  };

  handlers.gmcp(killPacket);
  handlers.gmcp(killPacket);
  handlers.gmcp(killPacket);

  // Requests are intentionally deferred until the current event turn settles.
  assert.equal(gmcpRequests.filter((name) => name === 'NukeFire.Mob').length, beforeMob);
  assert.equal(gmcpRequests.filter((name) => name === 'Char.TargetAffects').length, beforeAffects);

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    gmcpRequests.filter((name) => name === 'NukeFire.Mob').length,
    beforeMob + 1
  );
  assert.equal(
    gmcpRequests.filter((name) => name === 'Char.TargetAffects').length,
    beforeAffects + 1
  );
  dom.window.close();
});

test('kill refresh microtask skips a stale target after authoritative combat end', async () => {
  const { dom, handlers, gmcpRequests } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  handlers.gmcp({
    packageName: 'Char.Vitals',
    body: {
      hp: 900,
      maxhp: 1000,
      opponent: { name: 'The Statue', vnum: 30319, hp: 1000, maxhp: 1000000 }
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const beforeMob = gmcpRequests.filter((name) => name === 'NukeFire.Mob').length;
  const beforeAffects = gmcpRequests.filter((name) => name === 'Char.TargetAffects').length;

  handlers.gmcp({
    packageName: 'NukeFire.Combat',
    body: {
      schema: 1,
      window_ms: 200,
      out: { hits: 1, misses: 0, damage: 1000, criticals: 0, kills: 1 },
      in: { hits: 0, misses: 0, damage: 0, criticals: 0, deaths: 0 }
    }
  });
  handlers.gmcp({
    packageName: 'Char.Vitals',
    body: { hp: 900, maxhp: 1000, opponent: null }
  });

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(gmcpRequests.filter((name) => name === 'NukeFire.Mob').length, beforeMob);
  assert.equal(gmcpRequests.filter((name) => name === 'Char.TargetAffects').length, beforeAffects);
  dom.window.close();
});

test('Mob Inspector reports additional group enemies without rendering additional inspectors', async () => {
  const { dom, handlers } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: { name: 'The Statue', vnum: 30319, hp: 510000, maxhp: 1000000 } } });
  handlers.gmcp({ packageName: 'Group', body: {
    count: 1,
    members: [{ name: 'Mo', info: { hp: 900, mhp: 1000, opponent: 'The Statue' } }],
    enemies: [
      { name: 'The Statue', info: { vnum: 30319, hp: 510000, mhp: 1000000 } },
      { name: 'Ra Guard', info: { vnum: 30321, hp: 100000, mhp: 100000 } },
      { name: 'Ra Priest', info: { vnum: 30322, hp: 120000, mhp: 120000 } }
    ]
  } });
  await new Promise((resolve) => setTimeout(resolve, 10));

  assert.match(dom.window.document.querySelector('#mob-inspector-fighting').textContent, /\+2 other enemies engaged/u);
  assert.equal(dom.window.document.querySelectorAll('#panel-mob-inspector').length, 1);
  dom.window.close();
});


test('instant target loss closes an unresolved combat handoff instead of leaving Loading stuck', async () => {
  const { dom, handlers } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: { name: 'a rough-looking guy', vnum: 1201, instance_id: 7001, hp: 100, maxhp: 100 } } });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const document = dom.window.document;
  assert.equal(document.querySelector('#panel-mob-inspector').hidden, false);
  assert.match(document.querySelector('#mob-inspector-empty').textContent, /Loading current combat target: a rough-looking guy/u);

  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: null } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(document.querySelector('#panel-mob-inspector').hidden, true);
  const visibilityToggle = document.querySelector('[data-panel-toggle="mobInspector"]');
  visibilityToggle.checked = true;
  visibilityToggle.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(document.querySelector('#mob-inspector-content').hidden, true);
  assert.doesNotMatch(document.querySelector('#mob-inspector-empty').textContent, /rough-looking guy/u, 'reopening after target loss must not resurrect a stale handoff');
  dom.window.close();
});

test('late current-target Mob.Info cannot resurrect a target after Char.Vitals cleared it', async () => {
  const { dom, handlers } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: { name: 'a rough-looking guy', vnum: 1201, instance_id: 7001, hp: 100, maxhp: 100 } } });
  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: null } });

  const late = mobPacket();
  late.trigger = 'request';
  late.context = { lookup_arg: '', lookup_had_argument: false, resolved_from_current_target: true, room_vnum: 64501, is_current_target: true, in_combat_with_player: true };
  late.mob = { ...late.mob, vnum: 1201, instance_id: 7001, name: 'a rough-looking guy' };
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: late });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const document = dom.window.document;
  assert.equal(document.querySelector('#panel-mob-inspector').hidden, true);
  assert.equal(document.querySelector('#mob-inspector-content').hidden, true);
  dom.window.close();
});

test('server no-current-target Mob.Info clear packet resolves a pending Inspector request', async () => {
  const { dom, handlers } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: { name: 'a rough-looking guy', vnum: 1201, instance_id: 7001, hp: 100, maxhp: 100 } } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: { schema: 1, trigger: 'request', clear: true, context: { status: 'no_current_target', room_vnum: 64501, resolved_from_current_target: true }, mob: null } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(dom.window.document.querySelector('#panel-mob-inspector').hidden, true);
  dom.window.close();
});

test('same-vnum target handoff uses instance identity and rejects the dead instance packet', async () => {
  const { dom, handlers, gmcpRequests } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });

  const first = mobPacket();
  first.mob = { ...first.mob, vnum: 30319, instance_id: 8001, name: 'The Statue' };
  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: { name: 'The Statue', vnum: 30319, instance_id: 8001, hp: 1000, maxhp: 1000 } } });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: first });
  await new Promise((resolve) => setTimeout(resolve, 10));

  handlers.gmcp({ packageName: 'Char.Vitals', body: { hp: 900, maxhp: 1000, opponent: { name: 'The Statue', vnum: 30319, instance_id: 8002, hp: 1000, maxhp: 1000 } } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.match(dom.window.document.querySelector('#mob-inspector-empty').textContent, /Loading current combat target: The Statue/u);

  const late = mobPacket();
  late.trigger = 'request';
  late.context = { lookup_arg: '', lookup_had_argument: false, resolved_from_current_target: true, room_vnum: 64501, is_current_target: true, in_combat_with_player: true };
  late.mob = { ...late.mob, vnum: 30319, instance_id: 8001, name: 'The Statue' };
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: late });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(dom.window.document.querySelector('#mob-inspector-content').hidden, true);

  const second = mobPacket();
  second.trigger = 'request';
  second.context = { lookup_arg: '', lookup_had_argument: false, resolved_from_current_target: true, room_vnum: 64501, is_current_target: true, in_combat_with_player: true };
  second.mob = { ...second.mob, vnum: 30319, instance_id: 8002, name: 'The Statue' };
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: second });
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(dom.window.document.querySelector('#mob-inspector-content').hidden, false);
  assert.ok(gmcpRequests.filter((name) => name === 'NukeFire.Mob').length >= 2);
  dom.window.close();
});

test('no-current-target clear does not erase an explicit expanded inspection', async () => {
  const { dom, handlers } = createRenderer();
  await new Promise((resolve) => setTimeout(resolve, 35));
  handlers.status({ state: 'connected', message: 'Connected' });
  handlers.gmcp({ packageName: 'Room.Info', body: { num: 64501, name: 'Statue Hall' } });
  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: mobPacket() });
  await new Promise((resolve) => setTimeout(resolve, 10));

  handlers.gmcp({ packageName: 'NukeFire.Mob.Info', body: {
    schema: 1, trigger: 'request', clear: true,
    context: { status: 'no_current_target', room_vnum: 64501, resolved_from_current_target: true },
    mob: null
  } });
  await new Promise((resolve) => setTimeout(resolve, 10));

  const document = dom.window.document;
  assert.equal(document.querySelector('#panel-mob-inspector').hidden, false);
  assert.equal(document.querySelector('#panel-mob-inspector').dataset.mobInspectorMode, 'expanded');
  assert.equal(document.querySelector('#mob-inspector-content').hidden, false);
  assert.match(document.querySelector('#mob-inspector-name').textContent, /The Statue/u);
  dom.window.close();
});
