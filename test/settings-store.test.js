'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  SettingsStore,
  SETTINGS_SCHEMA_VERSION,
  normalizeSettings,
  normalizeAliases,
  normalizeVariables,
  normalizeFunctions,
  normalizeQuickKeys,
  normalizeHiddenDefaultQuickCommands,
  normalizeKeybindingSettings,
  normalizeActions,
  normalizeGags,
  normalizeHighlights,
  normalizeSubstitutes,
  normalizeMacrosSnapshot,
  normalizeSpeedwalk,
  normalizeSessions,
  normalizeSessionTinTin,
  settingsFromLegacy,
  DEFAULT_SESSIONS,
  DEFAULT_PANEL_VISIBILITY,
  DEFAULT_PANEL_LAYOUT,
  DEFAULT_TAB_GROUPS,
  DEFAULT_ACTIVE_TABS,
  normalizePanelLayout,
  normalizeTabGroups,
  normalizeActiveTabs,
  normalizeWorkspace,
  DEFAULT_DOCK_SIZES,
  COMMUNICATION_MESSAGE_ORDERS,
  DEFAULT_COMMUNICATIONS,
  normalizeCommunications,
  DEFAULT_POPOUTS,
  DOCK_SIZE_LIMITS,
  normalizeDockSizes,
  DEFAULT_DISPLAY_TEXT
} = require('../src/settings-store');

async function temporaryDirectory() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'nukefire-settings-'));
}

test('migrates existing local preferences into a versioned settings file', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load({
    legacy: {
      host: 'mud.example.org',
      port: '4999',
      compressionEnabled: 'false',
      terminalEngine: 'xterm',
      followOutput: null,
      compactOutput: 'true',
      fontSize: '19',
      terminalTheme: 'amber',
      terminalForeground: '#ffb000',
      terminalBackground: '#000000',
      terminalMonochrome: 'false',
      terminalThemeVersion: '2',
      screenReaderMode: 'true',
      announceImportant: null,
      repeatLastCommandOnEnter: 'true',
      showLastCommandInInput: 'false',
      commandPrefix: '~'
    }
  });

  assert.equal(settings.schemaVersion, SETTINGS_SCHEMA_VERSION);
  assert.deepEqual(settings.connection, {
    host: 'mud.example.org',
    port: 4999,
    compressionEnabled: false
  });
  assert.equal(settings.input.repeatLastCommandOnEnter, true);
  assert.equal(settings.input.showLastCommandInInput, false);
  assert.equal(settings.input.commandPrefix, '~');
  assert.equal(Object.hasOwn(settings.display, 'terminalEngine'), false);
  assert.equal(settings.display.followOutput, true);
  assert.equal(settings.display.compactOutput, true);
  assert.equal(settings.display.fontSize, 19);
  assert.equal(settings.display.theme.preset, 'amber');
  assert.equal(settings.accessibility.screenReaderMode, true);
  assert.equal(settings.accessibility.announceImportant, true);
  assert.equal(settings.workspace.sharedCrewWorkspace, false);
  assert.deepEqual(settings.workspace.defaultPanels, DEFAULT_PANEL_VISIBILITY);
  assert.deepEqual(settings.workspace.defaultLayout, DEFAULT_PANEL_LAYOUT);
  assert.deepEqual(settings.workspace.defaultDockSizes, DEFAULT_DOCK_SIZES);
  assert.deepEqual(settings.workspace.defaultTabGroups, DEFAULT_TAB_GROUPS);
  assert.deepEqual(settings.workspace.defaultActiveTabs, DEFAULT_ACTIVE_TABS);
  assert.deepEqual(settings.workspace.defaultCommunications, DEFAULT_COMMUNICATIONS);
  assert.deepEqual(settings.workspace.characters, {});
  assert.deepEqual(settings.aliases, []);
  assert.deepEqual(settings.variables, []);
  assert.deepEqual(settings.keybindings, { enabled: true, bindings: [] });
  assert.deepEqual(settings.soundTriggers, { enabled: true, definitions: [] });
  assert.deepEqual(settings.actions, { enabled: true, definitions: [] });
  assert.deepEqual(settings.gags, { enabled: true, definitions: [] });
  assert.deepEqual(settings.macros, { enabled: true, definitions: [] });
  assert.deepEqual(settings.speedwalk, { enabled: true });
  assert.deepEqual(settings.sessions, DEFAULT_SESSIONS);

  const disk = JSON.parse(
    await fs.readFile(path.join(directory, 'settings.json'), 'utf8')
  );
  assert.equal(disk.schemaVersion, SETTINGS_SCHEMA_VERSION);
  assert.equal(disk.display.theme.foreground, '#ffb000');
});



test('normalizes panel and Mapper text preferences without weakening accessible defaults', () => {
  const settings = normalizeSettings({
    display: {
      text: {
        panelLabels: 'compact',
        mapperRoomLabels: 'name'
      }
    }
  });
  assert.deepEqual(settings.display.text, {
    panelLabels: 'compact',
    mapperRoomLabels: 'name'
  });
  assert.deepEqual(normalizeSettings({ display: { text: { panelLabels: 'icons', mapperRoomLabels: 'html' } } }).display.text, DEFAULT_DISPLAY_TEXT);
});

test('normalizes and persists bounded per-session pipeline debug settings', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeSessions({
    activeSessionId: 'caul',
    sessions: [
      {
        id: 'caul', name: 'Caul', role: 'tank', host: 'tdome.nukefire.org', port: 4000,
        pipelineDebug: { enabled: true, maxEntries: 9999 }
      },
      {
        id: 'shai', name: 'Shai', role: 'healer', host: 'tdome.nukefire.org', port: 4000,
        pipelineDebug: { enabled: false, maxEntries: 25 }
      }
    ]
  });

  assert.deepEqual(normalized.sessions.map((session) => session.pipelineDebug), [
    { enabled: true, maxEntries: 500 },
    { enabled: false, maxEntries: 50 }
  ]);

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.sessions = normalized;
  await store.save(settings);
  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(restored.sessions, normalized);
});

test('normalizes and persists multi-session definitions and crew metadata', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeSessions({
    activeSessionId: 'Shai',
    sessions: [
      { id: 'Caul', name: 'Caul', role: 'Tank', host: 'tdome.nukefire.org', port: 4000 },
      { id: 'Shai', name: 'Shai', role: 'Healer', host: 'tdome.nukefire.org', port: 4000 },
      { id: '__proto__', name: 'Ignored' }
    ],
    groups: {
      crew: { members: ['Caul', 'Shai', 'missing'], leader: 'Caul' }
    }
  });

  assert.equal(normalized.activeSessionId, 'shai');
  assert.deepEqual(normalized.sessions.map((session) => session.id), ['caul', 'shai']);
  assert.deepEqual(normalized.groups.crew, {
    name: 'crew', members: ['caul', 'shai'], leader: 'caul'
  });

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.sessions = normalized;
  await store.save(settings);
  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(restored.sessions, normalized);
  assert.equal(restored.schemaVersion, SETTINGS_SCHEMA_VERSION);
});

test('normalizes and persists global aliases in the versioned settings file', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeAliases([
    { name: 'ZETA', body: 'say last\nscore', scope: 'session' },
    { name: '__proto__', body: 'shutdown' },
    { name: 'ga', body: '#followers assist %1' },
    { name: 'GA', body: '#followers kill %1' }
  ]);

  assert.deepEqual(normalized, [
    { name: 'ga', body: '#followers kill %1', priority: 5, scope: 'global' },
    { name: 'zeta', body: 'say last score', priority: 5, scope: 'global' }
  ]);

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.aliases = normalized;
  await store.save(settings);

  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(restored.aliases, normalized);
  assert.equal(restored.schemaVersion, SETTINGS_SCHEMA_VERSION);
});


test('normalizes and persists global variables in the versioned settings file', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeVariables([
    { name: 'TARGET', value: '%species guard', scope: 'session' },
    { name: 'species', value: 'mutant' },
    { name: '__proto__', value: 'shutdown' },
    { name: '2bad', value: 'ignored' }
  ]);
  assert.deepEqual(normalized, [
    { name: '2bad', value: 'ignored', scope: 'global' },
    { name: 'species', value: 'mutant', scope: 'global' },
    { name: 'target', value: '%species guard', scope: 'global' }
  ]);

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.variables = normalized;
  await store.save(settings);

  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(restored.variables, normalized);
});

test('keeps a backup and recovers when the primary settings file is damaged', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const store = new SettingsStore({ baseDirectory: directory });
  await store.load();

  const first = normalizeSettings({
    connection: { host: 'first.example.org', port: 4000 },
    display: { fontSize: 17 },
    accessibility: {}
  });
  await store.save(first);

  const second = normalizeSettings({
    connection: { host: 'second.example.org', port: 5000 },
    display: { fontSize: 21 },
    accessibility: {}
  });
  await store.save(second);

  const backup = JSON.parse(
    await fs.readFile(path.join(directory, 'settings.json.bak'), 'utf8')
  );
  assert.equal(backup.connection.host, 'first.example.org');

  await fs.writeFile(path.join(directory, 'settings.json'), '{broken', 'utf8');

  const recoveredStore = new SettingsStore({ baseDirectory: directory });
  const recovered = await recoveredStore.load();
  assert.equal(recovered.connection.host, 'first.example.org');
  assert.equal(recovered.display.fontSize, 17);

  const repaired = JSON.parse(
    await fs.readFile(path.join(directory, 'settings.json'), 'utf8')
  );
  assert.equal(repaired.connection.host, 'first.example.org');
});

test('sanitizes settings without allowing missing values to disable safe defaults', () => {
  const settings = settingsFromLegacy({
    followOutput: null,
    compactOutput: null,
    announceImportant: null,
    screenReaderMode: null,
    fontSize: '999',
    port: '0',
    terminalForeground: 'not-a-color'
  });

  assert.equal(settings.display.followOutput, true);
  assert.equal(settings.display.compactOutput, false);
  assert.equal(settings.accessibility.announceImportant, true);
  assert.equal(settings.workspace.sharedCrewWorkspace, false);
  assert.deepEqual(settings.workspace.defaultPanels, DEFAULT_PANEL_VISIBILITY);
  assert.deepEqual(settings.workspace.defaultLayout, DEFAULT_PANEL_LAYOUT);
  assert.deepEqual(settings.workspace.defaultDockSizes, DEFAULT_DOCK_SIZES);
  assert.deepEqual(settings.workspace.defaultTabGroups, DEFAULT_TAB_GROUPS);
  assert.deepEqual(settings.workspace.defaultActiveTabs, DEFAULT_ACTIVE_TABS);
  assert.deepEqual(settings.workspace.defaultCommunications, DEFAULT_COMMUNICATIONS);
  assert.deepEqual(settings.workspace.characters, {});
  assert.equal(settings.accessibility.screenReaderMode, false);
  assert.equal(settings.display.fontSize, 28);
  assert.equal(settings.connection.port, 4000);
  assert.equal(settings.display.theme.foreground, '#d3d7dc');
});



test('first-run legacy migration defaults a missing, blank, or invalid port to 4000', () => {
  assert.equal(settingsFromLegacy({ port: null }).connection.port, 4000);
  assert.equal(settingsFromLegacy({ port: '' }).connection.port, 4000);
  assert.equal(settingsFromLegacy({}).connection.port, 4000);
  assert.equal(settingsFromLegacy({ port: '0' }).connection.port, 4000);
  assert.equal(settingsFromLegacy({ port: '70000' }).connection.port, 4000);
  assert.equal(settingsFromLegacy({ port: '1' }).connection.port, 1);
  assert.equal(settingsFromLegacy({ port: '4001' }).connection.port, 4001);
});

test('first-run workspace matches the tester-approved panel and tab arrangement', () => {
  const settings = normalizeSettings({});

  assert.equal(settings.workspace.sharedCrewWorkspace, false);
  assert.deepEqual(settings.workspace.defaultPanels, {
    vitals: true,
    sessionVitals: true,
    affects: true,
    mobInspector: false,
    lootHistory: false,
    foundlist: false,
    quickCommands: false,
    liveState: false,
    protocol: false,
    communications: true,
    contextDeck: true,
    mapper: true
  });
  assert.deepEqual(settings.workspace.defaultLayout, {
    vitals: { region: 'right', order: 5 },
    sessionVitals: { region: 'right', order: 6 },
    affects: { region: 'left', order: 0 },
    quickCommands: { region: 'left', order: 2 },
    liveState: { region: 'left', order: 3 },
    protocol: { region: 'left', order: 4 },
    communications: { region: 'left', order: 1 },
    contextDeck: { region: 'right', order: 4 },
    mapper: { region: 'right', order: 0 },
    mobInspector: { region: 'right', order: 1 },
    lootHistory: { region: 'right', order: 2 },
    foundlist: { region: 'right', order: 3 }
  });
  assert.equal(settings.workspace.defaultTabGroups.mapper, 'mapper');
  assert.equal(settings.workspace.defaultTabGroups.contextDeck, 'mapper');
  assert.equal(settings.workspace.defaultActiveTabs.mapper, 'mapper');
  assert.equal(Object.hasOwn(settings.workspace.defaultActiveTabs, 'contextDeck'), false);
});

test('schema 45 adds server-aware Mob Inspector and Loot History panels without changing existing choices', () => {
  const migrated = normalizeSettings({
    schemaVersion: 45,
    workspace: {
      defaultPanels: {
        vitals: true, sessionVitals: true, affects: false, quickCommands: false,
        liveState: false, protocol: false, communications: true, contextDeck: true, mapper: true
      },
      characters: {
        prime: {
          name: 'Prime',
          panels: {
            vitals: false, sessionVitals: true, affects: true, quickCommands: false,
            liveState: false, protocol: true, communications: true, contextDeck: true, mapper: true
          }
        }
      }
    }
  });

  assert.equal(migrated.schemaVersion, SETTINGS_SCHEMA_VERSION);
  assert.equal(migrated.workspace.defaultPanels.affects, false);
  assert.equal(migrated.workspace.defaultPanels.mobInspector, false);
  assert.equal(migrated.workspace.defaultPanels.lootHistory, false);
  assert.equal(migrated.workspace.characters.prime.panels.vitals, false);
  assert.equal(migrated.workspace.characters.prime.panels.protocol, true);
  assert.equal(migrated.workspace.characters.prime.panels.mobInspector, false);
  assert.equal(migrated.workspace.characters.prime.panels.lootHistory, false);
  assert.ok(migrated.workspace.characters.prime.layout.mobInspector);
  assert.ok(migrated.workspace.characters.prime.layout.lootHistory);
  assert.equal(migrated.workspace.characters.prime.tabGroups.mobInspector, 'mobInspector');
  assert.equal(migrated.workspace.characters.prime.tabGroups.lootHistory, 'lootHistory');
});

test('schema 37 adds Session Vitals without disturbing custom panel choices', () => {
  const oldPanels = {
    vitals: true, affects: true, quickCommands: false, liveState: false,
    protocol: false, communications: true, contextDeck: true, mapper: true
  };
  const oldLayout = {
    affects: { region: 'left', order: 0 },
    communications: { region: 'left', order: 1 },
    quickCommands: { region: 'left', order: 2 },
    liveState: { region: 'left', order: 3 },
    protocol: { region: 'left', order: 4 },
    mapper: { region: 'right', order: 0 },
    contextDeck: { region: 'right', order: 1 },
    vitals: { region: 'right', order: 2 }
  };
  const oldTabGroups = {
    vitals: 'vitals', affects: 'affects', quickCommands: 'quickCommands',
    liveState: 'liveState', protocol: 'protocol', communications: 'communications',
    contextDeck: 'mapper', mapper: 'mapper'
  };
  const oldActiveTabs = {
    vitals: 'vitals', affects: 'affects', quickCommands: 'quickCommands',
    liveState: 'liveState', protocol: 'protocol', communications: 'communications',
    mapper: 'mapper'
  };

  const migrated = normalizeSettings({
    schemaVersion: 37,
    workspace: {
      defaultPanels: oldPanels,
      defaultLayout: oldLayout,
      defaultTabGroups: oldTabGroups,
      defaultActiveTabs: oldActiveTabs,
      characters: {
        untouched: {
          name: 'Untouched',
          panels: oldPanels,
          layout: oldLayout,
          tabGroups: oldTabGroups,
          activeTabs: oldActiveTabs
        },
        custom: {
          name: 'Custom',
          panels: { ...oldPanels, vitals: false },
          layout: { ...oldLayout, vitals: { region: 'left', order: 5 } },
          tabGroups: oldTabGroups,
          activeTabs: oldActiveTabs
        }
      }
    }
  });

  assert.equal(migrated.schemaVersion, SETTINGS_SCHEMA_VERSION);
  assert.deepEqual(migrated.workspace.defaultPanels, DEFAULT_PANEL_VISIBILITY);
  assert.deepEqual(migrated.workspace.defaultLayout, DEFAULT_PANEL_LAYOUT);
  assert.equal(migrated.workspace.characters.untouched.panels.sessionVitals, true);
  assert.deepEqual(migrated.workspace.characters.untouched.layout.sessionVitals, {
    region: 'right', order: 6
  });
  assert.equal(migrated.workspace.characters.untouched.panels.mobInspector, false);
  assert.equal(migrated.workspace.characters.untouched.panels.lootHistory, false);
  assert.equal(migrated.workspace.characters.custom.panels.vitals, false);
  assert.equal(migrated.workspace.characters.custom.panels.sessionVitals, true);
  assert.equal(migrated.workspace.characters.custom.layout.vitals.region, 'left');
  assert.deepEqual(migrated.workspace.characters.custom.layout.sessionVitals, {
    region: 'right', order: 5
  });
  assert.equal(migrated.workspace.characters.custom.panels.mobInspector, false);
  assert.equal(migrated.workspace.characters.custom.panels.lootHistory, false);
});

test('schema 15 migrates only untouched workspaces to the tester-approved defaults', () => {
  const oldPanels = {
    vitals: true, affects: true, quickCommands: false, liveState: false,
    protocol: false, communications: true, contextDeck: false, mapper: true
  };
  const oldLayout = {
    affects: { region: 'left', order: 0 },
    communications: { region: 'left', order: 1 },
    quickCommands: { region: 'left', order: 2 },
    liveState: { region: 'left', order: 3 },
    protocol: { region: 'left', order: 4 },
    mapper: { region: 'right', order: 0 },
    vitals: { region: 'right', order: 1 },
    contextDeck: { region: 'right', order: 2 }
  };
  const oldTabGroups = {
    vitals: 'vitals', affects: 'affects', quickCommands: 'quickCommands',
    liveState: 'liveState', protocol: 'protocol', communications: 'communications',
    contextDeck: 'contextDeck', mapper: 'mapper'
  };
  const oldActiveTabs = { ...oldTabGroups };

  const migrated = normalizeSettings({
    schemaVersion: 15,
    workspace: {
      defaultPanels: oldPanels,
      defaultLayout: oldLayout,
      defaultTabGroups: oldTabGroups,
      defaultActiveTabs: oldActiveTabs,
      characters: {
        untouched: {
          name: 'Untouched', panels: oldPanels, layout: oldLayout,
          tabGroups: oldTabGroups, activeTabs: oldActiveTabs
        },
        custom: {
          name: 'Custom', panels: { ...oldPanels, protocol: true }, layout: oldLayout,
          tabGroups: oldTabGroups, activeTabs: oldActiveTabs
        }
      }
    }
  });

  assert.deepEqual(migrated.workspace.defaultPanels, DEFAULT_PANEL_VISIBILITY);
  assert.deepEqual(migrated.workspace.defaultLayout, DEFAULT_PANEL_LAYOUT);
  assert.deepEqual(migrated.workspace.defaultTabGroups, DEFAULT_TAB_GROUPS);
  assert.deepEqual(migrated.workspace.defaultActiveTabs, DEFAULT_ACTIVE_TABS);
  assert.deepEqual(migrated.workspace.characters.untouched.panels, DEFAULT_PANEL_VISIBILITY);
  assert.deepEqual(migrated.workspace.characters.untouched.layout, DEFAULT_PANEL_LAYOUT);
  assert.deepEqual(migrated.workspace.characters.untouched.tabGroups, DEFAULT_TAB_GROUPS);
  assert.deepEqual(migrated.workspace.characters.untouched.activeTabs, DEFAULT_ACTIVE_TABS);
  assert.equal(migrated.workspace.characters.custom.panels.protocol, true);
  assert.equal(migrated.workspace.characters.custom.panels.contextDeck, false);
  assert.equal(migrated.workspace.characters.custom.tabGroups.contextDeck, 'contextDeck');
});

test('migrates untouched schema 13 workspace defaults while preserving custom records', () => {
  const legacyPanels = {
    vitals: true, affects: true, quickCommands: true, liveState: true,
    protocol: true, communications: true, contextDeck: true, mapper: true
  };
  const legacyLayout = {
    vitals: { region: 'left', order: 0 },
    affects: { region: 'left', order: 1 },
    quickCommands: { region: 'left', order: 2 },
    liveState: { region: 'left', order: 3 },
    protocol: { region: 'left', order: 4 },
    communications: { region: 'bottom', order: 0 },
    contextDeck: { region: 'right', order: 0 },
    mapper: { region: 'right', order: 1 }
  };
  const customLayout = {
    ...legacyLayout,
    communications: { region: 'right', order: 5 }
  };

  const migrated = normalizeSettings({
    schemaVersion: 13,
    workspace: {
      defaultPanels: legacyPanels,
      defaultLayout: legacyLayout,
      defaultDockSizes: { left: 240, right: 240, bottom: 190 },
      characters: {
        untouched: {
          name: 'Untouched', panels: legacyPanels, layout: legacyLayout,
          dockSizes: { left: 240, right: 240, bottom: 190 }
        },
        custom: {
          name: 'Custom', panels: { ...legacyPanels, protocol: false },
          layout: customLayout,
          dockSizes: { left: 275, right: 240, bottom: 190 }
        }
      }
    }
  });

  assert.deepEqual(migrated.workspace.defaultPanels, DEFAULT_PANEL_VISIBILITY);
  assert.deepEqual(migrated.workspace.defaultLayout, DEFAULT_PANEL_LAYOUT);
  assert.deepEqual(migrated.workspace.defaultDockSizes, DEFAULT_DOCK_SIZES);
  assert.deepEqual(migrated.workspace.characters.untouched.panels, DEFAULT_PANEL_VISIBILITY);
  assert.deepEqual(migrated.workspace.characters.untouched.layout, DEFAULT_PANEL_LAYOUT);
  assert.deepEqual(migrated.workspace.characters.untouched.dockSizes, DEFAULT_DOCK_SIZES);
  assert.equal(migrated.workspace.characters.custom.panels.protocol, false);
  assert.equal(migrated.workspace.characters.custom.layout.communications.region, 'right');
  assert.equal(migrated.workspace.characters.custom.dockSizes.left, 275);
});

test('normalizes character-specific sidebar panel metadata', () => {
  const workspace = normalizeWorkspace({
    defaultPanels: {
      vitals: true,
      quickCommands: false,
      liveState: true,
      protocol: false
    },
    characters: JSON.parse(JSON.stringify({
      Prime: {
        name: 'Prime',
        panels: { vitals: false, protocol: true }
      }
    }).replace(/}$/, ',"__proto__":{"name":"Ignored","panels":{"vitals":false}}}'))
  });

  assert.deepEqual(workspace.defaultPanels, {
    vitals: true,
    sessionVitals: true,
    affects: true,
    mobInspector: false,
    lootHistory: false,
    foundlist: false,
    quickCommands: false,
    liveState: true,
    protocol: false,
    communications: true,
    contextDeck: true,
    mapper: true
  });
  assert.deepEqual(workspace.characters.prime, {
    name: 'Prime',
    panels: {
      vitals: false,
      sessionVitals: true,
      affects: true,
      mobInspector: false,
      lootHistory: false,
      foundlist: false,
      quickCommands: false,
      liveState: true,
      protocol: true,
      communications: true,
      contextDeck: true,
      mapper: true
    },
    layout: DEFAULT_PANEL_LAYOUT,
    dockSizes: DEFAULT_DOCK_SIZES,
    panelHeights: {},
    tabGroups: DEFAULT_TAB_GROUPS,
    activeTabs: DEFAULT_ACTIVE_TABS,
    communications: DEFAULT_COMMUNICATIONS,
    popouts: DEFAULT_POPOUTS
  });
  assert.equal(Object.hasOwn(workspace.characters, '__proto__'), false);
});


test('normalizes panel dock regions and stable order', () => {
  const layout = normalizePanelLayout({
    vitals: { region: 'right', order: 9 },
    quickCommands: { region: 'bottom', order: 4 },
    liveState: { region: 'right', order: 1 },
    protocol: { region: 'floating', order: -50 }
  });

  assert.deepEqual(layout, {
    affects: { region: 'left', order: 0 },
    protocol: { region: 'left', order: 1 },
    communications: { region: 'left', order: 2 },
    mapper: { region: 'right', order: 0 },
    mobInspector: { region: 'right', order: 1 },
    liveState: { region: 'right', order: 2 },
    lootHistory: { region: 'right', order: 3 },
    foundlist: { region: 'right', order: 4 },
    contextDeck: { region: 'right', order: 5 },
    sessionVitals: { region: 'right', order: 6 },
    vitals: { region: 'right', order: 7 },
    quickCommands: { region: 'bottom', order: 0 }
  });
});

test('persists workspace metadata through save and reload', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const store = new SettingsStore({ baseDirectory: directory });
  const initial = await store.load();
  initial.workspace.characters.prime = {
    name: 'Prime',
    panels: {
      vitals: true,
      quickCommands: false,
      liveState: true,
      protocol: false
    },
    layout: {
      vitals: { region: 'right', order: 0 },
      quickCommands: { region: 'bottom', order: 0 },
      liveState: { region: 'left', order: 0 },
      protocol: { region: 'right', order: 1 }
    }
  };
  await store.save(initial);

  const reloaded = new SettingsStore({ baseDirectory: directory });
  const settings = await reloaded.load();
  assert.equal(settings.workspace.characters.prime.name, 'Prime');
  assert.equal(settings.workspace.characters.prime.panels.quickCommands, false);
  assert.equal(settings.workspace.characters.prime.panels.protocol, false);
  assert.equal(settings.workspace.characters.prime.layout.vitals.region, 'right');
  assert.equal(settings.workspace.characters.prime.layout.quickCommands.region, 'bottom');
  assert.equal(settings.workspace.characters.prime.layout.protocol.order, 3);
});

test('normalizes tab groups within dock regions and selects a valid active tab', () => {
  const layout = normalizePanelLayout({
    vitals: { region: 'right', order: 0 },
    quickCommands: { region: 'right', order: 1 },
    liveState: { region: 'left', order: 0 },
    protocol: { region: 'left', order: 1 }
  });
  const groups = normalizeTabGroups({
    vitals: 'combat',
    affects: 'affects',
    mobInspector: 'mobInspector',
    lootHistory: 'lootHistory',
    foundlist: 'foundlist',
    quickCommands: 'combat',
    liveState: 'combat',
    protocol: 'diagnostics'
  }, layout);

  assert.deepEqual(groups, {
    vitals: 'combat',
    sessionVitals: 'sessionVitals',
    affects: 'affects',
    mobInspector: 'mobInspector',
    lootHistory: 'lootHistory',
    foundlist: 'foundlist',
    quickCommands: 'combat',
    liveState: 'liveState',
    protocol: 'diagnostics',
    communications: 'communications',
    contextDeck: 'mapper',
    mapper: 'mapper'
  });
  assert.deepEqual(normalizeActiveTabs({ combat: 'quickCommands' }, groups, layout), {
    affects: 'affects',
    liveState: 'liveState',
    diagnostics: 'protocol',
    combat: 'quickCommands',
    communications: 'communications',
    mapper: 'mapper',
    mobInspector: 'mobInspector',
    lootHistory: 'lootHistory',
    foundlist: 'foundlist',
    sessionVitals: 'sessionVitals'
  });
});

test('persists tab groups and active tabs per character', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.workspace.characters.prime = {
    name: 'Prime',
    panels: DEFAULT_PANEL_VISIBILITY,
    layout: DEFAULT_PANEL_LAYOUT,
    dockSizes: DEFAULT_DOCK_SIZES,
    tabGroups: {
      vitals: 'status',
      mapper: 'status',
      quickCommands: 'quickCommands',
      liveState: 'liveState',
      protocol: 'protocol'
    },
    activeTabs: {
      status: 'vitals',
      quickCommands: 'quickCommands',
      liveState: 'liveState',
      protocol: 'protocol'
    }
  };
  await store.save(settings);

  const reloaded = new SettingsStore({ baseDirectory: directory });
  const restored = await reloaded.load();
  assert.equal(restored.schemaVersion, SETTINGS_SCHEMA_VERSION);
  assert.equal(restored.workspace.characters.prime.tabGroups.vitals, 'status');
  assert.equal(restored.workspace.characters.prime.tabGroups.mapper, 'status');
  assert.equal(restored.workspace.characters.prime.activeTabs.status, 'vitals');
});

test('normalizes dock sizes and clamps unsafe values', () => {
  assert.deepEqual(normalizeDockSizes({
    left: 9999,
    right: 12,
    'outer-right': 9999,
    bottom: '275'
  }), {
    left: DOCK_SIZE_LIMITS.left.maximum,
    right: DOCK_SIZE_LIMITS.right.minimum,
    'outer-right': DOCK_SIZE_LIMITS['outer-right'].maximum,
    bottom: 275
  });

  assert.deepEqual(normalizeDockSizes({
    left: 3200,
    right: 2800,
    'outer-right': 2400,
    bottom: 1600
  }), {
    left: 3200,
    right: 2800,
    'outer-right': 2400,
    bottom: 1600
  });

  assert.deepEqual(normalizeDockSizes({}), DEFAULT_DOCK_SIZES);
});


test('persists default and character-specific dock sizes', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.workspace.defaultDockSizes = {
    left: 275,
    right: 310,
    'outer-right': 280,
    bottom: 225
  };
  settings.workspace.characters.prime = {
    name: 'Prime',
    panels: DEFAULT_PANEL_VISIBILITY,
    layout: DEFAULT_PANEL_LAYOUT,
    dockSizes: {
      left: 210,
      right: 360,
      'outer-right': 290,
      bottom: 260
    }
  };
  await store.save(settings);

  const reloaded = new SettingsStore({ baseDirectory: directory });
  const restored = await reloaded.load();
  assert.deepEqual(restored.workspace.defaultDockSizes, {
    left: 275,
    right: 310,
    'outer-right': 280,
    bottom: 225
  });
  assert.deepEqual(restored.workspace.characters.prime.dockSizes, {
    left: 210,
    right: 360,
    'outer-right': 290,
    bottom: 260
  });
});



test('normalizes and persists the optional shared crew workspace', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeSettings({
    workspace: {
      sharedCrewWorkspace: 'true',
      defaultPopouts: {
        mapper: { open: true, bounds: { x: -700, y: 40, width: 980, height: 820 } }
      }
    }
  });
  assert.equal(normalized.workspace.sharedCrewWorkspace, true);
  assert.equal(normalized.workspace.defaultPopouts.mapper.open, true);
  assert.equal(normalized.workspace.defaultPopouts.vitals.open, false);

  const store = new SettingsStore({ baseDirectory: directory });
  await store.save(normalized);
  const reloaded = await new SettingsStore({ baseDirectory: directory }).load();
  assert.equal(reloaded.workspace.sharedCrewWorkspace, true);
  assert.deepEqual(reloaded.workspace.defaultPopouts.mapper, {
    open: true,
    bounds: { x: -700, y: 40, width: 980, height: 820 }
  });
});

test('normalizes and persists Communications message order per workspace scope', async (t) => {
  assert.deepEqual(COMMUNICATION_MESSAGE_ORDERS, ['newest-top', 'newest-bottom']);
  assert.deepEqual(normalizeCommunications({}), {
    activeChannel: 'all',
    messageOrder: 'newest-top'
  });
  assert.deepEqual(
    normalizeCommunications(
      { activeChannel: 'tell', messageOrder: 'newest-bottom' },
      DEFAULT_COMMUNICATIONS
    ),
    { activeChannel: 'tell', messageOrder: 'newest-bottom' }
  );
  assert.deepEqual(
    normalizeCommunications(
      { activeChannel: 'invalid', messageOrder: 'sideways' },
      { activeChannel: 'gossip', messageOrder: 'newest-bottom' }
    ),
    { activeChannel: 'gossip', messageOrder: 'newest-bottom' }
  );
  assert.deepEqual(
    normalizeCommunications({ activeChannel: 'bonejack', messageOrder: 'newest-top' }),
    { activeChannel: 'bonejack', messageOrder: 'newest-top' }
  );
  assert.deepEqual(
    normalizeCommunications({ activeChannel: 'ssf', messageOrder: 'newest-bottom' }),
    { activeChannel: 'ssf', messageOrder: 'newest-bottom' }
  );

  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const settings = normalizeSettings({
    workspace: {
      defaultCommunications: { activeChannel: 'all', messageOrder: 'newest-bottom' },
      characters: {
        prime: {
          name: 'Prime',
          communications: { activeChannel: 'tell', messageOrder: 'newest-top' }
        }
      }
    }
  });
  await new SettingsStore({ baseDirectory: directory }).save(settings);
  const reloaded = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(reloaded.workspace.defaultCommunications, {
    activeChannel: 'all',
    messageOrder: 'newest-bottom'
  });
  assert.deepEqual(reloaded.workspace.characters.prime.communications, {
    activeChannel: 'tell',
    messageOrder: 'newest-top'
  });
});

test('persists default and character-specific Communications pop-out state', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nukefire-settings-popout-'));
  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.workspace.defaultPopouts.communications = {
    open: true,
    bounds: { x: -1200, y: 80, width: 760, height: 640 }
  };
  settings.workspace.characters.prime = {
    name: 'Prime',
    popouts: { communications: { open: false, bounds: { x: 50, y: 60, width: 700, height: 500 } } }
  };
  await store.save(settings);
  const reloaded = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(reloaded.workspace.defaultPopouts.communications, {
    open: true, bounds: { x: -1200, y: 80, width: 760, height: 640 }
  });
  assert.deepEqual(reloaded.workspace.characters.prime.popouts.communications, {
    open: false, bounds: { x: 50, y: 60, width: 700, height: 500 }
  });
});

test('normalizes and persists global actions and their master switch', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeActions({
    enabled: false,
    definitions: [
      { pattern: 'Warning: %1', command: 'say %1\nscore', priority: 99, enabled: false },
      { pattern: 'The %1 attacks Shai!', command: '#Caul rescue Shai', priority: 1 },
      { pattern: 'Warning: %1', command: 'say replacement', priority: 4, enabled: true },
      { pattern: '', command: 'ignored' }
    ]
  });

  assert.deepEqual(normalized, {
    enabled: false,
    definitions: [
      {
        pattern: 'The %1 attacks Shai!', command: '#Caul rescue Shai',
        priority: 1, enabled: true, scope: 'global'
      },
      {
        pattern: 'Warning: %1', command: 'say replacement',
        priority: 4, enabled: true, scope: 'global'
      }
    ]
  });

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.actions = normalized;
  await store.save(settings);
  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(restored.actions, normalized);
  assert.equal(restored.schemaVersion, SETTINGS_SCHEMA_VERSION);
});


test('normalizes and persists global gag definitions and their master switch', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeGags({
    enabled: false,
    definitions: [
      { pattern: '  %1 gossips  ', enabled: true, scope: 'session' },
      { pattern: 'auction\nchannel', enabled: false },
      { pattern: '', enabled: true },
      { pattern: '%1 gossips', enabled: false }
    ]
  });

  assert.deepEqual(normalized, {
    enabled: false,
    definitions: [
      { pattern: '%1 gossips', enabled: false, scope: 'global' },
      { pattern: 'auction channel', enabled: false, scope: 'global' }
    ]
  });

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.gags = normalized;
  await store.save(settings);

  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(restored.gags, normalized);
  assert.equal(restored.schemaVersion, SETTINGS_SCHEMA_VERSION);
});


test('normalizes and persists global highlight definitions and their master switch', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeHighlights({
    enabled: false,
    definitions: [
      { pattern: ' mutant ', style: 'Yellow underline', priority: 99, enabled: true, scope: 'session' },
      { pattern: 'Warning: %1', style: '<faa> b <aaa>', priority: 1, enabled: false, className: 'Combat' },
      { pattern: 'mutant', style: 'Red', priority: 3, enabled: false },
      { pattern: '', style: 'blue' },
      { pattern: 'ignored', style: 'blink red' }
    ]
  });

  assert.deepEqual(normalized, {
    enabled: false,
    definitions: [
      {
        pattern: 'Warning: %1', style: '<faa> b <aaa>', priority: 1,
        enabled: false, scope: 'global', className: 'combat'
      },
      { pattern: 'mutant', style: 'Red', priority: 3, enabled: false, scope: 'global' },
      { pattern: 'ignored', style: 'blink red', priority: 5, enabled: true, scope: 'global' }
    ]
  });

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.highlights = normalized;
  await store.save(settings);
  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(restored.highlights, normalized);
  assert.equal(restored.schemaVersion, SETTINGS_SCHEMA_VERSION);
});


test('normalizes and persists global substitute definitions and their master switch', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeSubstitutes({
    enabled: false,
    definitions: [
      { pattern: ' Zoe ', replacement: 'ZOE', priority: 99, enabled: true, scope: 'session' },
      { pattern: 'You receive %1 credits.', replacement: 'PAYDAY: %1 credits', priority: 1, enabled: false, className: 'Combat' },
      { pattern: 'Zoe', replacement: 'Z.', priority: 3, enabled: false },
      { pattern: '', replacement: 'ignored' }
    ]
  });

  assert.deepEqual(normalized, {
    enabled: false,
    definitions: [
      {
        pattern: 'You receive %1 credits.', replacement: 'PAYDAY: %1 credits', priority: 1,
        enabled: false, scope: 'global', className: 'combat'
      },
      { pattern: 'Zoe', replacement: 'Z.', priority: 3, enabled: false, scope: 'global' }
    ]
  });

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.substitutes = normalized;
  await store.save(settings);
  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(restored.substitutes, normalized);
  assert.equal(restored.schemaVersion, SETTINGS_SCHEMA_VERSION);
});

test('normalizes speedwalk as enabled by default while preserving explicit off', () => {
  assert.deepEqual(normalizeSpeedwalk(), { enabled: true });
  assert.deepEqual(normalizeSpeedwalk({}), { enabled: true });
  assert.deepEqual(normalizeSpeedwalk({ enabled: true }), { enabled: true });
  assert.deepEqual(normalizeSpeedwalk({ enabled: false }), { enabled: false });
  assert.deepEqual(normalizeSpeedwalk({ enabled: 'true' }), { enabled: false });
  assert.deepEqual(normalizeSpeedwalk(true), { enabled: true });
  assert.deepEqual(normalizeSpeedwalk(false), { enabled: false });
});

test('persists the global speedwalk toggle through settings reload', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.speedwalk = { enabled: true };
  await store.save(settings);

  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(restored.speedwalk, { enabled: true });
  assert.equal(restored.schemaVersion, SETTINGS_SCHEMA_VERSION);
});



test('normalizes and persists physical-key bindings safely', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeKeybindingSettings({
    enabled: false,
    bindings: [
      { id: 'north', code: 'Numpad8', command: 'north', group: 'Movement' },
      { id: 'duplicate', code: 'Numpad8', command: 'say duplicate' },
      { id: 'heal', code: 'KeyH', modifiers: { ctrl: true }, command: 'heal %tank' },
      { id: 'breaker', code: 'F5', command: 'combo load breaker',
        semantic: { type: 'combo-profile', id: 'breaker' } },
      { id: '__proto__', code: 'bad code', command: 'look' }
    ]
  });

  assert.equal(normalized.enabled, false);
  assert.equal(normalized.bindings.length, 3);
  assert.equal(normalized.bindings[0].signature, 'Numpad8');
  assert.equal(normalized.bindings[1].signature, 'ctrl+KeyH');
  assert.deepEqual(normalized.bindings[2].semantic, { type: 'combo-profile', id: 'breaker' });

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.keybindings = normalized;
  await store.save(settings);

  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(restored.keybindings, normalized);
  assert.equal(restored.schemaVersion, SETTINGS_SCHEMA_VERSION);
});

test('normalizes and persists repeat-last-command input preference', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeSettings({
    input: { repeatLastCommandOnEnter: true, showLastCommandInInput: false }
  });
  assert.deepEqual(normalized.input, {
    repeatLastCommandOnEnter: true,
    showLastCommandInInput: false,
    brightCommandInputFocus: false,
    commandPrefix: '#'
  });

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  assert.equal(settings.input.repeatLastCommandOnEnter, false);
  assert.equal(settings.input.showLastCommandInInput, true);
  assert.equal(settings.input.commandPrefix, '#');
  settings.input.repeatLastCommandOnEnter = true;
  settings.input.showLastCommandInInput = false;
  await store.save(settings);

  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.equal(restored.input.repeatLastCommandOnEnter, true);
  assert.equal(restored.input.showLastCommandInInput, false);
});




test('normalizes and persists the client command prefix', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  for (const prefix of ['#', '~', '^', '/', '`', "'"]) {
    assert.equal(normalizeSettings({ input: { commandPrefix: prefix } }).input.commandPrefix, prefix);
  }
  assert.equal(normalizeSettings({ input: { commandPrefix: '!' } }).input.commandPrefix, '#');
  assert.equal(normalizeSettings({ input: { commandPrefix: '##' } }).input.commandPrefix, '#');

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.input.commandPrefix = '/';
  await store.save(settings);

  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.equal(restored.input.commandPrefix, '/');
  assert.equal(restored.schemaVersion, SETTINGS_SCHEMA_VERSION);
});

test('drops the retired terminal-engine preference while preserving display settings', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeSettings({ display: {
    terminalEngine: 'custom', followOutput: false, compactOutput: true
  } });
  assert.equal(Object.hasOwn(normalized.display, 'terminalEngine'), false);
  assert.equal(normalized.display.followOutput, false);
  assert.equal(normalized.display.compactOutput, true);

  const store = new SettingsStore({ baseDirectory: directory });
  await store.save(normalized);
  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.equal(Object.hasOwn(restored.display, 'terminalEngine'), false);
  assert.equal(restored.schemaVersion, SETTINGS_SCHEMA_VERSION);
});


test('normalizes custom Quick Commands, font choices, and panel detail visibility', () => {
  const settings = normalizeSettings({
    display: {
      uiFont: 'verdana',
      terminalFont: 'maple-nl',
      interfaceBrightness: 'high-contrast',
      components: {
        groupVitals: false,
        mapperExits: false,
        gpsNavigator: true,
        mapperMap: false,
        mapperRoomInfo: true
      }
    },
    quickKeys: [
      { id: 'Assist Key', label: ' Assist ', command: ' groupassist ', enabled: true },
      { id: 'Assist Key', label: 'Heal', command: 'heal %tank', enabled: false },
      { label: '', command: 'look' }
    ],
    hiddenDefaultQuickCommands: ['INVENTORY', 'newbie-help', 'inventory', 'unknown']
  });

  assert.equal(settings.display.uiFont, 'verdana');
  assert.equal(settings.display.terminalFont, 'maple-nl');
  assert.equal(settings.display.interfaceBrightness, 'high-contrast');
  assert.deepEqual(settings.display.components, {
    groupVitals: false,
    mapperExits: false,
    gpsNavigator: true,
    mapperMap: false,
    mapperRoomInfo: true
  });
  assert.deepEqual(settings.quickKeys, [
    { id: 'assist-key', label: 'Assist', command: 'groupassist', enabled: true },
    { id: 'quick-2', label: 'Heal', command: 'heal %tank', enabled: false }
  ]);
  assert.deepEqual(settings.hiddenDefaultQuickCommands, ['inventory', 'newbie-help']);
  assert.deepEqual(normalizeQuickKeys('not an array'), []);
  assert.deepEqual(normalizeHiddenDefaultQuickCommands(['look', 'LOOK', 'bogus']), ['look']);
  assert.equal(normalizeSettings({ display: { terminalFont: 'fixedsys' } }).display.terminalFont, 'fixedsys');
  assert.equal(normalizeSettings({ display: { terminalFont: 'cascadia' } }).display.terminalFont, 'cascadia');
  assert.equal(normalizeSettings({ display: { terminalFont: 'not-a-font' } }).display.terminalFont, 'menlo');
  assert.equal(normalizeSettings({ display: { interfaceBrightness: 'dark' } }).display.interfaceBrightness, 'dark');
  assert.equal(normalizeSettings({ display: { interfaceBrightness: 'neon' } }).display.interfaceBrightness, 'brighter');
});

test('normalizes and persists TinTin-style class metadata and saved definitions', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nukefire-settings-classes-'));
  const store = new SettingsStore({ baseDirectory: directory });

  const saved = await store.save({
    aliases: [{ name: 'atk', body: 'kill %1;kick', className: 'Combat' }],
    variables: [{ name: 'target', value: 'mutant', className: 'Combat' }],
    actions: {
      enabled: true,
      definitions: [{ pattern: 'You miss', command: 'bash', priority: 3, enabled: true, className: 'Combat' }]
    },
    gags: {
      enabled: true,
      definitions: [{ pattern: 'The reactor hums.', enabled: true, className: 'Combat' }]
    },
    highlights: {
      enabled: true,
      definitions: [{ pattern: 'mutant', style: 'Yellow underline', priority: 2, enabled: true, className: 'Combat' }]
    },
    substitutes: {
      enabled: true,
      definitions: [{ pattern: 'Zoe', replacement: 'ZOE', priority: 4, enabled: true, className: 'Combat' }]
    },
    classes: {
      activeStack: ['Combat'],
      definitions: [{
        name: 'Combat',
        saved: {
          aliases: [{ name: 'atk', body: 'kill %1;kick', className: 'combat' }],
          variables: [],
          actions: [],
          gags: [],
          highlights: [{ pattern: 'mutant', style: 'Yellow underline', priority: 2, enabled: true, className: 'combat' }],
          substitutes: [{ pattern: 'Zoe', replacement: 'ZOE', priority: 4, enabled: true, className: 'combat' }]
        }
      }]
    }
  });

  assert.equal(saved.schemaVersion, SETTINGS_SCHEMA_VERSION);
  assert.equal(saved.aliases[0].className, 'combat');
  assert.equal(saved.variables[0].className, 'combat');
  assert.equal(saved.actions.definitions[0].className, 'combat');
  assert.equal(saved.gags.definitions[0].className, 'combat');
  assert.equal(saved.highlights.definitions[0].className, 'combat');
  assert.equal(saved.substitutes.definitions[0].className, 'combat');
  assert.deepEqual(saved.classes.activeStack, ['combat']);
  assert.equal(saved.classes.definitions[0].saved.aliases[0].name, 'atk');
  assert.equal(saved.classes.definitions[0].saved.highlights[0].pattern, 'mutant');
  assert.equal(saved.classes.definitions[0].saved.substitutes[0].pattern, 'Zoe');

  const reloaded = new SettingsStore({ baseDirectory: directory });
  const loaded = await reloaded.load();
  assert.deepEqual(loaded.classes, saved.classes);
  await fs.rm(directory, { recursive: true, force: true });
});


test('normalizes and persists configurable main and group vitals presentation', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nukefire-vitals-display-'));
  const store = new SettingsStore({ baseDirectory: directory });
  const saved = await store.save({
    display: {
      vitals: {
        mainMode: 'percent',
        groupMode: 'current',
        numberSize: 'large',
        hideSelfInGroup: false
      }
    }
  });

  assert.deepEqual(saved.display.vitals, {
    mainMode: 'percent',
    groupMode: 'current',
    numberSize: 'large',
    hideSelfInGroup: false
  });

  const loaded = await store.load();
  assert.deepEqual(loaded.display.vitals, saved.display.vitals);
  await fs.rm(directory, { recursive: true, force: true });
});


test('normalizes and persists TinTin macro definitions and class membership', async (t) => {
  const directory = await temporaryDirectory();
  t.after(() => fs.rm(directory, { recursive: true, force: true }));

  const normalized = normalizeMacrosSnapshot({
    enabled: true,
    definitions: [
      { key: 'Command+K', command: '#showme {Target};kill %target', className: 'Prime' },
      { key: 'q', command: 'quit' },
      { key: 'Command+K', command: 'duplicate' }
    ]
  });
  assert.equal(normalized.definitions.length, 1);
  assert.equal(normalized.definitions[0].signature, 'meta+KeyK');
  assert.deepEqual(normalized.definitions[0].commands, ['#showme {Target}', 'kill %target']);
  assert.equal(normalized.definitions[0].className, 'prime');

  const store = new SettingsStore({ baseDirectory: directory });
  const settings = await store.load();
  settings.macros = normalized;
  await store.save(settings);
  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(restored.macros, normalized);
});


test('settings preserve safe nonstandard variable names and native references', () => {
  const settings = normalizeSettings({
    variables: [
      { name: 'Cool Website', value: 'https://nukefire.org' },
      { name: ':)', value: '$cool_target' },
      { name: 'session[name]', value: 'noth' },
      { name: 'bad[name;drop]', value: 'rejected' }
    ]
  });
  assert.deepEqual(settings.variables, [
    { name: ':)', value: '$cool_target', scope: 'global' },
    { name: 'cool website', value: 'https://nukefire.org', scope: 'global' },
    { name: 'session[name]', value: 'noth', scope: 'global' }
  ]);
});


test('normalizes and persists TinTin Function definitions and class membership', async () => {
  const normalized = normalizeFunctions([
    { name: 'Percent', body: '#math {result} {%1 * 100 / %2}', className: 'Tools' },
    { name: '9bad', body: '#return {bad}' },
    { name: 'empty', body: '' },
    { name: 'percent', body: '#return {%1%}', className: 'Combat' }
  ]);
  assert.deepEqual(normalized, [{
    name: 'percent', body: '#return {%1%}', scope: 'global', className: 'combat'
  }]);

  const directory = await temporaryDirectory();
  const store = new SettingsStore({ baseDirectory: directory });
  const loaded = await store.load();
  const saved = await store.save({
    ...loaded,
    functions: normalized
  });
  assert.deepEqual(saved.functions, normalized);
  const reloaded = await new SettingsStore({ baseDirectory: directory }).load();
  assert.deepEqual(reloaded.functions, normalized);
  assert.equal(reloaded.schemaVersion, SETTINGS_SCHEMA_VERSION);
});

test('normalizes and persists the prompt display mode with inline as the safe default', async () => {
  assert.equal(normalizeSettings({ display: { promptMode: 'DOCKED' } }).display.promptMode, 'docked');
  assert.equal(normalizeSettings({ display: { promptMode: 'unknown' } }).display.promptMode, 'inline');

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nukefire-prompt-display-'));
  const store = new SettingsStore({ baseDirectory: directory });
  await store.save({ display: { promptMode: 'hidden' } });
  const restored = await store.load();
  assert.equal(restored.display.promptMode, 'hidden');
});

test('schema 40 stores complete TinTin definitions inside each session without cross-session fallback', () => {
  const normalized = normalizeSettings({
    schemaVersion: 40,
    aliases: [{ name: 'sharedmustnotwin', body: 'say shared' }],
    sessions: {
      activeSessionId: 'gator',
      sessions: [
        {
          id: 'wind', name: 'Wind', host: 'mud.test', port: 4000,
          tintin: {
            aliases: [{ name: 'windonly', body: 'say wind' }],
            variables: [{ name: 'owner', value: 'Wind' }],
            profile: { requested: 'wind', filename: 'wind.tin', loaded: true }
          }
        },
        {
          id: 'gator', name: 'Gator', host: 'mud.test', port: 4000,
          tintin: {
            aliases: [{ name: 'gatoronly', body: 'say gator' }],
            variables: [{ name: 'owner', value: 'Gator' }],
            profile: { requested: 'gator', filename: 'gator.tin', loaded: true }
          }
        }
      ]
    }
  });

  assert.equal(normalized.schemaVersion, SETTINGS_SCHEMA_VERSION);
  const wind = normalized.sessions.sessions.find((entry) => entry.id === 'wind');
  const gator = normalized.sessions.sessions.find((entry) => entry.id === 'gator');
  assert.deepEqual(wind.tintin.aliases.map((entry) => entry.name), ['windonly']);
  assert.deepEqual(gator.tintin.aliases.map((entry) => entry.name), ['gatoronly']);
  assert.equal(normalized.sessions.sessions.some((entry) =>
    entry.tintin.aliases.some((alias) => alias.name === 'sharedmustnotwin')
  ), false);
  assert.deepEqual(wind.tintin.profile, { requested: 'wind', filename: 'wind.tin', loaded: true });
  assert.deepEqual(gator.tintin.profile, { requested: 'gator', filename: 'gator.tin', loaded: true });
});

test('schema 39 shared TinTin definitions migrate into only the saved active session', () => {
  const normalized = normalizeSettings({
    schemaVersion: 39,
    aliases: [{ name: 'legacy', body: 'say wind' }],
    variables: [{ name: 'owner', value: 'Wind' }],
    actions: { enabled: true, definitions: [{ pattern: '^Ping$', command: 'say wind', priority: 5 }] },
    sessions: {
      activeSessionId: 'wind',
      sessions: [
        { id: 'wind', name: 'Wind', host: 'mud.test', port: 4000 },
        { id: 'gator', name: 'Gator', host: 'mud.test', port: 4000 }
      ]
    }
  });

  const wind = normalized.sessions.sessions.find((entry) => entry.id === 'wind');
  const gator = normalized.sessions.sessions.find((entry) => entry.id === 'gator');
  assert.equal(wind.tintin.aliases[0].name, 'legacy');
  assert.equal(wind.tintin.variables[0].value, 'Wind');
  assert.equal(wind.tintin.actions.definitions[0].command, 'say wind');
  assert.deepEqual(gator.tintin, normalizeSessionTinTin());
});

test('a newly normalized session always receives a clean TinTin container', () => {
  const sessions = normalizeSessions({
    activeSessionId: 'wind',
    sessions: [
      { id: 'wind', name: 'Wind', host: 'mud.test', port: 4000 },
      { id: 'gator', name: 'Gator', host: 'mud.test', port: 4000 }
    ]
  }, { host: 'mud.test', port: 4000 });

  assert.notEqual(sessions.sessions[0].tintin, sessions.sessions[1].tintin);
  assert.deepEqual(sessions.sessions[0].tintin.aliases, []);
  assert.deepEqual(sessions.sessions[1].tintin.aliases, []);
});
