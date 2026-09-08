'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const panelHeightApi = require('./panel-stack-resize');
const { DEFAULT_POPOUTS, normalizePopouts } = require('./panel-window-state');
const { normalizeVitalDisplayMode, normalizeVitalNumberSize, normalizeVitalSpeechMode } = require('./combat-vitals');
const {
  normalizeAliasName,
  normalizeAliasBody,
  normalizeAliasPriority,
  DEFAULT_MAX_ALIASES
} = require('./alias-engine');
const {
  normalizeVariableName,
  normalizeVariableValue,
  DEFAULT_MAX_VARIABLES
} = require('./variable-engine');
const {
  normalizeFunctionName,
  normalizeFunctionBody,
  DEFAULT_MAX_FUNCTIONS
} = require('./function-engine');
const {
  normalizeActionPattern,
  normalizeActionCommand,
  normalizeActionPriority,
  DEFAULT_MAX_ACTIONS
} = require('./action-engine');
const { DEFAULT_MAX_GAGS } = require('./gag-engine');
const {
  normalizeHighlightPattern,
  normalizeHighlightStyle,
  normalizeHighlightPriority,
  parseHighlightStyle,
  DEFAULT_MAX_HIGHLIGHTS
} = require('./highlight-engine');
const {
  normalizeSubstitutePattern,
  normalizeSubstituteReplacement,
  normalizeSubstitutePriority,
  compileSubstitutePattern,
  DEFAULT_MAX_SUBSTITUTES
} = require('./substitute-engine');
const { normalizeClassName, normalizeClassesSnapshot } = require('./class-manager');
const { normalizeMacrosSnapshot, DEFAULT_MACRO_SETTINGS } = require('./macro-engine');
const { normalizeEventName, normalizeEventCommand, DEFAULT_MAX_EVENTS } = require('./event-engine');
const { DEFAULT_DISPLAY_TEXT, normalizeDisplayText } = require('./display-text');
const { DEFAULT_PROMPT_DISPLAY_MODE, normalizePromptDisplayMode } = require('./prompt-display');
const { normalizePipelineDebugSettings } = require('./pipeline-debug');
const {
  normalizeClientCommandPrefix,
  DEFAULT_CLIENT_COMMAND_PREFIX
} = require('./client-command-parser');
const {
  DEFAULT_KEYBINDING_SETTINGS,
  normalizeKeybindingSettings
} = require('./keybinding-engine');
const {
  DEFAULT_TINTIN_STARTUP,
  normalizeTinTinStartupSettings
} = require('./tintin-startup');
const {
  DEFAULT_SOUND_TRIGGER_SETTINGS,
  normalizeSoundTriggerSettings
} = require('./sound-trigger-engine');

const MAX_QUICK_KEYS = 24;
const MAX_QUICK_KEY_LABEL = 32;
const MAX_QUICK_KEY_COMMAND = 1024;
const UI_FONT_IDS = Object.freeze(['system', 'arial', 'verdana', 'tahoma', 'trebuchet', 'atkinson', 'opendyslexic']);
const INTERFACE_BRIGHTNESS_IDS = Object.freeze(['dark', 'brighter', 'high-contrast']);
const TERMINAL_FONT_IDS = Object.freeze([
  'menlo', 'monaco', 'consolas', 'courier', 'system-mono',
  'fixedsys', 'maple', 'maple-nl', 'jetbrains', 'fira-code',
  'hack', 'source-code-pro', 'terminus', 'inconsolata', 'cascadia',
  'ibm-plex', 'ubuntu-mono', 'lucida-console'
]);
const DEFAULT_QUICK_COMMAND_IDS = Object.freeze(['look', 'score', 'inventory', 'equipment', 'who', 'newbie-help']);
const AFFECT_DISPLAY_MODES = Object.freeze(['classic', 'complete']);
const SOUNDPACK_EVENT_TOKEN_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u;
const MAX_SOUNDPACK_EVENT_PREFERENCES = 64;

const SETTINGS_SCHEMA_VERSION = 48;

const PANEL_IDS = Object.freeze([
  'vitals',
  'sessionVitals',
  'affects',
  'mobInspector',
  'lootHistory',
  'foundlist',
  'quickCommands',
  'liveState',
  'protocol',
  'communications',
  'contextDeck',
  'mapper'
]);

const LEGACY_DEFAULT_PANEL_VISIBILITY_V13 = Object.freeze({
  vitals: true,
  affects: true,
  quickCommands: true,
  liveState: true,
  protocol: true,
  communications: true,
  contextDeck: true,
  mapper: true
});

const LEGACY_DEFAULT_PANEL_VISIBILITY_V15 = Object.freeze({
  vitals: true,
  affects: true,
  quickCommands: false,
  liveState: false,
  protocol: false,
  communications: true,
  contextDeck: false,
  mapper: true
});

const LEGACY_DEFAULT_PANEL_VISIBILITY_V37 = Object.freeze({
  vitals: true,
  affects: true,
  quickCommands: false,
  liveState: false,
  protocol: false,
  communications: true,
  contextDeck: true,
  mapper: true
});

const DEFAULT_PANEL_VISIBILITY = Object.freeze({
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

const DOCK_REGIONS = Object.freeze(['left', 'right', 'outer-right', 'bottom']);

const LEGACY_DEFAULT_PANEL_LAYOUT_V13 = Object.freeze({
  vitals: Object.freeze({ region: 'left', order: 0 }),
  affects: Object.freeze({ region: 'left', order: 1 }),
  quickCommands: Object.freeze({ region: 'left', order: 2 }),
  liveState: Object.freeze({ region: 'left', order: 3 }),
  protocol: Object.freeze({ region: 'left', order: 4 }),
  communications: Object.freeze({ region: 'bottom', order: 0 }),
  contextDeck: Object.freeze({ region: 'right', order: 0 }),
  mapper: Object.freeze({ region: 'right', order: 1 })
});

const LEGACY_DEFAULT_PANEL_LAYOUT_V15 = Object.freeze({
  affects: Object.freeze({ region: 'left', order: 0 }),
  communications: Object.freeze({ region: 'left', order: 1 }),
  quickCommands: Object.freeze({ region: 'left', order: 2 }),
  liveState: Object.freeze({ region: 'left', order: 3 }),
  protocol: Object.freeze({ region: 'left', order: 4 }),
  mapper: Object.freeze({ region: 'right', order: 0 }),
  vitals: Object.freeze({ region: 'right', order: 1 }),
  contextDeck: Object.freeze({ region: 'right', order: 2 })
});

const LEGACY_DEFAULT_PANEL_LAYOUT_V37 = Object.freeze({
  affects: Object.freeze({ region: 'left', order: 0 }),
  communications: Object.freeze({ region: 'left', order: 1 }),
  quickCommands: Object.freeze({ region: 'left', order: 2 }),
  liveState: Object.freeze({ region: 'left', order: 3 }),
  protocol: Object.freeze({ region: 'left', order: 4 }),
  mapper: Object.freeze({ region: 'right', order: 0 }),
  contextDeck: Object.freeze({ region: 'right', order: 1 }),
  vitals: Object.freeze({ region: 'right', order: 2 })
});

const DEFAULT_PANEL_LAYOUT = Object.freeze({
  affects: Object.freeze({ region: 'left', order: 0 }),
  communications: Object.freeze({ region: 'left', order: 1 }),
  quickCommands: Object.freeze({ region: 'left', order: 2 }),
  liveState: Object.freeze({ region: 'left', order: 3 }),
  protocol: Object.freeze({ region: 'left', order: 4 }),
  mapper: Object.freeze({ region: 'right', order: 0 }),
  mobInspector: Object.freeze({ region: 'right', order: 1 }),
  lootHistory: Object.freeze({ region: 'right', order: 2 }),
  foundlist: Object.freeze({ region: 'right', order: 3 }),
  contextDeck: Object.freeze({ region: 'right', order: 4 }),
  vitals: Object.freeze({ region: 'right', order: 5 }),
  sessionVitals: Object.freeze({ region: 'right', order: 6 })
});

const LEGACY_DEFAULT_TAB_GROUPS_V15 = Object.freeze({
  vitals: 'vitals',
  affects: 'affects',
  quickCommands: 'quickCommands',
  liveState: 'liveState',
  protocol: 'protocol',
  communications: 'communications',
  contextDeck: 'contextDeck',
  mapper: 'mapper'
});

const LEGACY_DEFAULT_TAB_GROUPS_V37 = Object.freeze({
  vitals: 'vitals',
  affects: 'affects',
  quickCommands: 'quickCommands',
  liveState: 'liveState',
  protocol: 'protocol',
  communications: 'communications',
  contextDeck: 'mapper',
  mapper: 'mapper'
});

const DEFAULT_TAB_GROUPS = Object.freeze({
  vitals: 'vitals',
  sessionVitals: 'sessionVitals',
  affects: 'affects',
  mobInspector: 'mobInspector',
  lootHistory: 'lootHistory',
  foundlist: 'foundlist',
  quickCommands: 'quickCommands',
  liveState: 'liveState',
  protocol: 'protocol',
  communications: 'communications',
  contextDeck: 'mapper',
  mapper: 'mapper'
});

const LEGACY_DEFAULT_ACTIVE_TABS_V15 = Object.freeze({
  vitals: 'vitals',
  affects: 'affects',
  quickCommands: 'quickCommands',
  liveState: 'liveState',
  protocol: 'protocol',
  communications: 'communications',
  contextDeck: 'contextDeck',
  mapper: 'mapper'
});

const LEGACY_DEFAULT_ACTIVE_TABS_V37 = Object.freeze({
  vitals: 'vitals',
  affects: 'affects',
  quickCommands: 'quickCommands',
  liveState: 'liveState',
  protocol: 'protocol',
  communications: 'communications',
  mapper: 'mapper'
});

const DEFAULT_ACTIVE_TABS = Object.freeze({
  vitals: 'vitals',
  sessionVitals: 'sessionVitals',
  affects: 'affects',
  mobInspector: 'mobInspector',
  lootHistory: 'lootHistory',
  foundlist: 'foundlist',
  quickCommands: 'quickCommands',
  liveState: 'liveState',
  protocol: 'protocol',
  communications: 'communications',
  mapper: 'mapper'
});


const COMMUNICATION_CHANNELS = Object.freeze([
  'all', 'gossip', 'newbie', 'group', 'tell',
  'grats', 'auction', 'ssf', 'bonejack', 'skynet', 'system'
]);

const COMMUNICATION_MESSAGE_ORDERS = Object.freeze(['newest-top', 'newest-bottom']);

const DEFAULT_COMMUNICATIONS = Object.freeze({
  activeChannel: 'all',
  messageOrder: 'newest-top'
});

// Store large-screen preferences without forcing the main terminal below its
// live minimum. renderer.js applies the current-window limit at display time.
const DOCK_SIZE_LIMITS = Object.freeze({
  left: Object.freeze({ minimum: 170, maximum: 4096 }),
  right: Object.freeze({ minimum: 170, maximum: 4096 }),
  'outer-right': Object.freeze({ minimum: 170, maximum: 4096 }),
  bottom: Object.freeze({ minimum: 130, maximum: 2160 })
});

const LEGACY_DEFAULT_DOCK_SIZES_V13 = Object.freeze({ left: 240, right: 240, bottom: 190 });

const DEFAULT_DOCK_SIZES = Object.freeze({
  left: 220,
  right: 300,
  'outer-right': 260,
  bottom: 170
});


const DEFAULT_TINTIN_STATE = Object.freeze({
  aliases: Object.freeze([]),
  variables: Object.freeze([]),
  functions: Object.freeze([]),
  actions: Object.freeze({ enabled: true, definitions: Object.freeze([]) }),
  gags: Object.freeze({ enabled: true, definitions: Object.freeze([]) }),
  highlights: Object.freeze({ enabled: true, definitions: Object.freeze([]) }),
  substitutes: Object.freeze({ enabled: true, definitions: Object.freeze([]) }),
  macros: DEFAULT_MACRO_SETTINGS,
  tabs: Object.freeze([]),
  events: Object.freeze({ enabled: true, definitions: Object.freeze([]) }),
  config: Object.freeze({ logMode: 'plain', commandEcho: false, autoTab: 0, verbatim: false, repeatChar: '!', repeatEnter: false, verbatimChar: '\\', historySize: 2000, bufferSize: 5000 }),
  classes: Object.freeze({ activeStack: Object.freeze([]), definitions: Object.freeze([]) }),
  speedwalk: Object.freeze({ enabled: true }),
  profile: Object.freeze({ requested: '', filename: '', loaded: false })
});

const DEFAULT_SESSIONS = Object.freeze({
  activeSessionId: 'main',
  sessions: Object.freeze([
    Object.freeze({
      id: 'main',
      name: 'Main',
      role: 'tank',
      host: 'tdome.nukefire.org',
      port: 4000,
      pipelineDebug: Object.freeze({ enabled: false, maxEntries: 200 }),
      tintin: DEFAULT_TINTIN_STATE
    })
  ]),
  groups: Object.freeze({})
});

const DEFAULT_SETTINGS = Object.freeze({
  schemaVersion: SETTINGS_SCHEMA_VERSION,
  updatedAt: '',
  connection: Object.freeze({
    host: 'tdome.nukefire.org',
    port: 4000,
    compressionEnabled: true
  }),
  input: Object.freeze({
    repeatLastCommandOnEnter: false,
    showLastCommandInInput: true,
    brightCommandInputFocus: false,
    commandPrefix: DEFAULT_CLIENT_COMMAND_PREFIX
  }),
  display: Object.freeze({
    followOutput: true,
    compactOutput: false,
    fontSize: 16,
    uiFont: 'system',
    terminalFont: 'menlo',
    interfaceBrightness: 'brighter',
    affectsMode: 'complete',
    text: DEFAULT_DISPLAY_TEXT,
    promptMode: DEFAULT_PROMPT_DISPLAY_MODE,
    components: Object.freeze({
      groupVitals: true,
      mapperExits: true,
      gpsNavigator: true,
      mapperMap: true,
      mapperRoomInfo: true
    }),
    vitals: Object.freeze({
      mainMode: 'values-percent',
      groupMode: 'values-percent',
      numberSize: 'standard',
      hideSelfInGroup: true
    }),
    theme: Object.freeze({
      preset: 'nukefire',
      foreground: '#d3d7dc',
      background: '#050607',
      monochrome: false,
      version: '2'
    })
  }),
  accessibility: Object.freeze({
    screenReaderMode: false,
    readerWorkspaceEnabled: false,
    selfVoiceEnabled: false,
    selfVoiceMuted: false,
    selfVoiceForegroundOnly: true,
    selfVoiceFollowMode: false,
    selfVoiceInterruptOnCommand: false,
    selfVoiceGovernorEnabled: true,
    selfVoicePriorityAlertsEnabled: true,
    selfVoiceRate: 1,
    selfVoicePitch: 1,
    selfVoiceVolume: 1,
    selfVoiceVoiceId: '',
    vitalSpeechMode: 'percent-values',
    audioCuesEnabled: false,
    audioCuesMuted: false,
    audioCuesForegroundOnly: true,
    audioCuesVolume: 0.65,
    soundpackDisabledEvents: Object.freeze([]),
    communicationCues: Object.freeze({
      tell: false,
      auction: false,
      gossip: false,
      group: false,
      grats: false,
      shout: false,
      holler: false,
      skynet: false,
      ssf: false,
      background: false
    }),
    announceImportant: true
  }),
  tintinStartup: DEFAULT_TINTIN_STARTUP,
  aliases: Object.freeze([]),
  variables: Object.freeze([]),
  functions: Object.freeze([]),
  quickKeys: Object.freeze([]),
  hiddenDefaultQuickCommands: Object.freeze([]),
  keybindings: DEFAULT_KEYBINDING_SETTINGS,
  soundTriggers: DEFAULT_SOUND_TRIGGER_SETTINGS,
  actions: Object.freeze({
    enabled: true,
    definitions: Object.freeze([])
  }),
  gags: Object.freeze({
    enabled: true,
    definitions: Object.freeze([])
  }),
  highlights: Object.freeze({
    enabled: true,
    definitions: Object.freeze([])
  }),
  substitutes: Object.freeze({
    enabled: true,
    definitions: Object.freeze([])
  }),
  macros: DEFAULT_MACRO_SETTINGS,
  tabs: Object.freeze([]),
  events: Object.freeze({ enabled: true, definitions: Object.freeze([]) }),
  config: Object.freeze({ logMode: 'plain', commandEcho: false, autoTab: 0, verbatim: false, repeatChar: '!', repeatEnter: false, verbatimChar: '\\', historySize: 2000, bufferSize: 5000 }),
  classes: Object.freeze({
    activeStack: Object.freeze([]),
    definitions: Object.freeze([])
  }),
  speedwalk: Object.freeze({
    enabled: true
  }),
  sessions: DEFAULT_SESSIONS,
  workspace: Object.freeze({
    sharedCrewWorkspace: false,
    defaultPanels: DEFAULT_PANEL_VISIBILITY,
    defaultLayout: DEFAULT_PANEL_LAYOUT,
    defaultDockSizes: DEFAULT_DOCK_SIZES,
    defaultPanelHeights: Object.freeze({}),
    lastCharacterKey: '',
    lastCharacterName: '',
    defaultTabGroups: DEFAULT_TAB_GROUPS,
    defaultActiveTabs: DEFAULT_ACTIVE_TABS,
    defaultCommunications: DEFAULT_COMMUNICATIONS,
    defaultPopouts: DEFAULT_POPOUTS,
    characters: Object.freeze({})
  })
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])])
  );
}

function sameJson(left, right) {
  return JSON.stringify(canonicalValue(left)) === JSON.stringify(canonicalValue(right));
}

function migrateWorkspaceInput(input = {}, sourceSchemaVersion = 0) {
  const workspace = input && typeof input === 'object' ? clone(input) : {};

  if (sourceSchemaVersion < 14) {
    if (!workspace.defaultPanels || sameJson(workspace.defaultPanels, LEGACY_DEFAULT_PANEL_VISIBILITY_V13)) {
      workspace.defaultPanels = clone(LEGACY_DEFAULT_PANEL_VISIBILITY_V15);
    }
    if (!workspace.defaultLayout || sameJson(workspace.defaultLayout, LEGACY_DEFAULT_PANEL_LAYOUT_V13)) {
      workspace.defaultLayout = clone(LEGACY_DEFAULT_PANEL_LAYOUT_V15);
    }
    if (!workspace.defaultDockSizes || sameJson(workspace.defaultDockSizes, LEGACY_DEFAULT_DOCK_SIZES_V13)) {
      workspace.defaultDockSizes = clone(DEFAULT_DOCK_SIZES);
    }

    if (workspace.characters && typeof workspace.characters === 'object') {
      for (const record of Object.values(workspace.characters)) {
        if (!record || typeof record !== 'object') continue;
        if (sameJson(record.panels, LEGACY_DEFAULT_PANEL_VISIBILITY_V13)) {
          record.panels = clone(LEGACY_DEFAULT_PANEL_VISIBILITY_V15);
        }
        if (sameJson(record.layout, LEGACY_DEFAULT_PANEL_LAYOUT_V13)) {
          record.layout = clone(LEGACY_DEFAULT_PANEL_LAYOUT_V15);
        }
        if (sameJson(record.dockSizes, LEGACY_DEFAULT_DOCK_SIZES_V13)) {
          record.dockSizes = clone(DEFAULT_DOCK_SIZES);
        }
      }
    }
  }

  if (sourceSchemaVersion < 16) {
    const untouchedDefaults =
      (!workspace.defaultPanels || sameJson(workspace.defaultPanels, LEGACY_DEFAULT_PANEL_VISIBILITY_V15)) &&
      (!workspace.defaultLayout || sameJson(workspace.defaultLayout, LEGACY_DEFAULT_PANEL_LAYOUT_V15)) &&
      (!workspace.defaultTabGroups || sameJson(workspace.defaultTabGroups, LEGACY_DEFAULT_TAB_GROUPS_V15)) &&
      (!workspace.defaultActiveTabs || sameJson(workspace.defaultActiveTabs, LEGACY_DEFAULT_ACTIVE_TABS_V15));

    if (untouchedDefaults) {
      workspace.defaultPanels = clone(DEFAULT_PANEL_VISIBILITY);
      workspace.defaultLayout = clone(DEFAULT_PANEL_LAYOUT);
      workspace.defaultTabGroups = clone(DEFAULT_TAB_GROUPS);
      workspace.defaultActiveTabs = clone(DEFAULT_ACTIVE_TABS);
    }

    if (workspace.characters && typeof workspace.characters === 'object') {
      for (const record of Object.values(workspace.characters)) {
        if (!record || typeof record !== 'object') continue;
        const untouchedRecord =
          (!record.panels || sameJson(record.panels, LEGACY_DEFAULT_PANEL_VISIBILITY_V15)) &&
          (!record.layout || sameJson(record.layout, LEGACY_DEFAULT_PANEL_LAYOUT_V15)) &&
          (!record.tabGroups || sameJson(record.tabGroups, LEGACY_DEFAULT_TAB_GROUPS_V15)) &&
          (!record.activeTabs || sameJson(record.activeTabs, LEGACY_DEFAULT_ACTIVE_TABS_V15));
        if (!untouchedRecord) continue;
        record.panels = clone(DEFAULT_PANEL_VISIBILITY);
        record.layout = clone(DEFAULT_PANEL_LAYOUT);
        record.tabGroups = clone(DEFAULT_TAB_GROUPS);
        record.activeTabs = clone(DEFAULT_ACTIVE_TABS);
      }
    }
  }

  if (sourceSchemaVersion < 38) {
    const untouchedDefaults =
      (!workspace.defaultPanels || sameJson(workspace.defaultPanels, LEGACY_DEFAULT_PANEL_VISIBILITY_V37)) &&
      (!workspace.defaultLayout || sameJson(workspace.defaultLayout, LEGACY_DEFAULT_PANEL_LAYOUT_V37)) &&
      (!workspace.defaultTabGroups || sameJson(workspace.defaultTabGroups, LEGACY_DEFAULT_TAB_GROUPS_V37)) &&
      (!workspace.defaultActiveTabs || sameJson(workspace.defaultActiveTabs, LEGACY_DEFAULT_ACTIVE_TABS_V37));

    if (untouchedDefaults) {
      workspace.defaultPanels = clone(DEFAULT_PANEL_VISIBILITY);
      workspace.defaultLayout = clone(DEFAULT_PANEL_LAYOUT);
      workspace.defaultTabGroups = clone(DEFAULT_TAB_GROUPS);
      workspace.defaultActiveTabs = clone(DEFAULT_ACTIVE_TABS);
    }

    if (workspace.characters && typeof workspace.characters === 'object') {
      for (const record of Object.values(workspace.characters)) {
        if (!record || typeof record !== 'object') continue;
        const untouchedRecord =
          (!record.panels || sameJson(record.panels, LEGACY_DEFAULT_PANEL_VISIBILITY_V37)) &&
          (!record.layout || sameJson(record.layout, LEGACY_DEFAULT_PANEL_LAYOUT_V37)) &&
          (!record.tabGroups || sameJson(record.tabGroups, LEGACY_DEFAULT_TAB_GROUPS_V37)) &&
          (!record.activeTabs || sameJson(record.activeTabs, LEGACY_DEFAULT_ACTIVE_TABS_V37));
        if (!untouchedRecord) continue;
        record.panels = clone(DEFAULT_PANEL_VISIBILITY);
        record.layout = clone(DEFAULT_PANEL_LAYOUT);
        record.tabGroups = clone(DEFAULT_TAB_GROUPS);
        record.activeTabs = clone(DEFAULT_ACTIVE_TABS);
      }
    }
  }

  return workspace;
}

function booleanValue(value, fallback) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function normalizeSoundpackDisabledEvents(value) {
  let source = value;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch (_error) { source = []; }
  }
  if (!Array.isArray(source)) return [];
  const seen = new Set();
  const result = [];
  for (const raw of source) {
    const event = String(raw || '').trim().toLowerCase();
    if (!event || event.length > 80 || !SOUNDPACK_EVENT_TOKEN_PATTERN.test(event) || seen.has(event)) continue;
    seen.add(event);
    result.push(event);
    if (result.length >= MAX_SOUNDPACK_EVENT_PREFERENCES) break;
  }
  return result;
}

function boundedNumber(value, minimum, maximum, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function boundedInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.trunc(number)));
}

function normalizePort(value, fallback = DEFAULT_SETTINGS.connection.port) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return fallback;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  const port = Math.trunc(number);
  return port >= 1 && port <= 65535 ? port : fallback;
}

function normalizeHexColor(value, fallback) {
  const text = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/u.test(text) ? text : fallback;
}

function normalizeHost(value, fallback) {
  const text = String(value || '').trim();
  return text && text.length <= 255 ? text : fallback;
}


function normalizePanelVisibility(input = {}, fallback = DEFAULT_PANEL_VISIBILITY) {
  const normalized = {};
  for (const panelId of PANEL_IDS) {
    normalized[panelId] = booleanValue(input?.[panelId], fallback[panelId]);
  }
  return normalized;
}

function normalizePanelLayout(input = {}, fallback = DEFAULT_PANEL_LAYOUT) {
  const provisional = {};

  for (const panelId of PANEL_IDS) {
    const builtIn = DEFAULT_PANEL_LAYOUT[panelId];
    const inherited = fallback?.[panelId] || builtIn;
    const candidate = input?.[panelId] || {};
    const region = DOCK_REGIONS.includes(candidate.region)
      ? candidate.region
      : (DOCK_REGIONS.includes(inherited.region) ? inherited.region : builtIn.region);
    const candidateOrder = Number(candidate.order);
    const inheritedOrder = Number(inherited.order);

    provisional[panelId] = {
      region,
      order: Number.isFinite(candidateOrder)
        ? Math.max(0, Math.min(100, Math.trunc(candidateOrder)))
        : (Number.isFinite(inheritedOrder) ? Math.trunc(inheritedOrder) : builtIn.order)
    };
  }

  const normalized = {};
  for (const region of DOCK_REGIONS) {
    const ids = PANEL_IDS
      .filter((panelId) => provisional[panelId].region === region)
      .sort((left, right) => {
        const orderDifference = provisional[left].order - provisional[right].order;
        return orderDifference || PANEL_IDS.indexOf(left) - PANEL_IDS.indexOf(right);
      });

    ids.forEach((panelId, index) => {
      normalized[panelId] = { region, order: index };
    });
  }

  return normalized;
}

function normalizeTabGroupId(value, fallback) {
  const text = String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 64);
  return text || fallback;
}

function normalizeTabGroups(
  input = {},
  layout = DEFAULT_PANEL_LAYOUT,
  fallback = DEFAULT_TAB_GROUPS
) {
  const normalized = {};
  const groupRegions = new Map();

  for (const panelId of PANEL_IDS) {
    const region = layout?.[panelId]?.region || DEFAULT_PANEL_LAYOUT[panelId].region;
    const inherited = normalizeTabGroupId(fallback?.[panelId], panelId);
    let groupId = normalizeTabGroupId(input?.[panelId], inherited);

    if (groupRegions.has(groupId) && groupRegions.get(groupId) !== region) {
      groupId = panelId;
    }

    groupRegions.set(groupId, region);
    normalized[panelId] = groupId;
  }

  return normalized;
}

function tabGroupsInOrder(tabGroups, layout) {
  const groups = new Map();
  const orderedPanels = [...PANEL_IDS].sort((left, right) => {
    const leftEntry = layout?.[left] || DEFAULT_PANEL_LAYOUT[left];
    const rightEntry = layout?.[right] || DEFAULT_PANEL_LAYOUT[right];
    const regionDifference = DOCK_REGIONS.indexOf(leftEntry.region) - DOCK_REGIONS.indexOf(rightEntry.region);
    return regionDifference || leftEntry.order - rightEntry.order || PANEL_IDS.indexOf(left) - PANEL_IDS.indexOf(right);
  });

  for (const panelId of orderedPanels) {
    const groupId = tabGroups[panelId] || panelId;
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId).push(panelId);
  }

  return groups;
}

function normalizeActiveTabs(
  input = {},
  tabGroups = DEFAULT_TAB_GROUPS,
  layout = DEFAULT_PANEL_LAYOUT,
  fallback = DEFAULT_ACTIVE_TABS
) {
  const normalized = {};
  for (const [groupId, panelIds] of tabGroupsInOrder(tabGroups, layout)) {
    const candidate = String(input?.[groupId] || '');
    const inherited = String(fallback?.[groupId] || '');
    normalized[groupId] = panelIds.includes(candidate)
      ? candidate
      : (panelIds.includes(inherited) ? inherited : panelIds[0]);
  }
  return normalized;
}

function normalizeDockSizes(input = {}, fallback = DEFAULT_DOCK_SIZES) {
  const normalized = {};

  for (const region of DOCK_REGIONS) {
    const limits = DOCK_SIZE_LIMITS[region];
    const fallbackValue = boundedInteger(
      fallback?.[region],
      limits.minimum,
      limits.maximum,
      DEFAULT_DOCK_SIZES[region]
    );
    normalized[region] = boundedInteger(
      input?.[region],
      limits.minimum,
      limits.maximum,
      fallbackValue
    );
  }

  return normalized;
}

function normalizeCommunications(input = {}, fallback = DEFAULT_COMMUNICATIONS) {
  const inheritedChannel = COMMUNICATION_CHANNELS.includes(fallback?.activeChannel)
    ? fallback.activeChannel
    : DEFAULT_COMMUNICATIONS.activeChannel;
  const candidateChannel = String(input?.activeChannel || '').trim().toLocaleLowerCase();
  const inheritedOrder = COMMUNICATION_MESSAGE_ORDERS.includes(fallback?.messageOrder)
    ? fallback.messageOrder
    : DEFAULT_COMMUNICATIONS.messageOrder;
  const candidateOrder = String(input?.messageOrder || '').trim().toLocaleLowerCase();
  return {
    activeChannel: COMMUNICATION_CHANNELS.includes(candidateChannel)
      ? candidateChannel
      : inheritedChannel,
    messageOrder: COMMUNICATION_MESSAGE_ORDERS.includes(candidateOrder)
      ? candidateOrder
      : inheritedOrder
  };
}

function normalizeCharacterKey(value) {
  const key = String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 64);
  return ['__proto__', 'constructor', 'prototype'].includes(key) ? '' : key;
}

function normalizeCharacterName(value, fallback) {
  const text = String(value || '').normalize('NFKC').trim();
  return (text || fallback).slice(0, 80);
}

function normalizePanelHeights(input = {}) {
  return panelHeightApi.normalizeHeightMap(input);
}

function normalizeWorkspace(input = {}) {
  const defaultPanels = normalizePanelVisibility(input.defaultPanels);
  const defaultLayout = normalizePanelLayout(input.defaultLayout);
  const defaultDockSizes = normalizeDockSizes(input.defaultDockSizes);
  const defaultPanelHeights = normalizePanelHeights(input.defaultPanelHeights);
  const defaultTabGroups = normalizeTabGroups(input.defaultTabGroups, defaultLayout);
  const defaultActiveTabs = normalizeActiveTabs(
    input.defaultActiveTabs,
    defaultTabGroups,
    defaultLayout
  );
  const defaultCommunications = normalizeCommunications(input.defaultCommunications);
  const defaultPopouts = normalizePopouts(input.defaultPopouts);
  const characters = {};
  const entries = input.characters && typeof input.characters === 'object'
    ? Object.entries(input.characters)
    : [];

  for (const [rawKey, rawRecord] of entries.slice(0, 100)) {
    const record = rawRecord && typeof rawRecord === 'object' ? rawRecord : {};
    const key = normalizeCharacterKey(rawKey || record.name);
    if (!key || Object.hasOwn(characters, key)) continue;

    const layout = normalizePanelLayout(record.layout, defaultLayout);
    const tabGroups = normalizeTabGroups(record.tabGroups, layout, defaultTabGroups);
    characters[key] = {
      name: normalizeCharacterName(record.name, key),
      panels: normalizePanelVisibility(record.panels, defaultPanels),
      layout,
      dockSizes: normalizeDockSizes(record.dockSizes, defaultDockSizes),
      panelHeights: normalizePanelHeights(record.panelHeights),
      tabGroups,
      activeTabs: normalizeActiveTabs(
        record.activeTabs,
        tabGroups,
        layout,
        defaultActiveTabs
      ),
      communications: normalizeCommunications(record.communications, defaultCommunications),
      popouts: normalizePopouts(record.popouts, defaultPopouts)
    };
  }

  const requestedLastCharacterKey = normalizeCharacterKey(
    input.lastCharacterKey || input.lastCharacterName
  );
  const lastCharacterKey = requestedLastCharacterKey && characters[requestedLastCharacterKey]
    ? requestedLastCharacterKey
    : '';
  const lastCharacterName = lastCharacterKey
    ? normalizeCharacterName(
        input.lastCharacterName || characters[lastCharacterKey]?.name,
        characters[lastCharacterKey]?.name || lastCharacterKey
      )
    : '';

  return {
    sharedCrewWorkspace: booleanValue(input.sharedCrewWorkspace, false),
    lastCharacterKey,
    lastCharacterName,
    defaultPanels,
    defaultLayout,
    defaultDockSizes,
    defaultPanelHeights,
    defaultTabGroups,
    defaultActiveTabs,
    defaultCommunications,
    defaultPopouts,
    characters
  };
}


function normalizeSessionId(value) {
  const key = String(value || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48);
  return ['__proto__', 'constructor', 'prototype'].includes(key) ? '' : key;
}

function normalizeSessionName(value, fallback) {
  const text = String(value || '').normalize('NFKC').trim();
  return (text || fallback).slice(0, 80);
}

function normalizeSessionRole(value, fallback = 'member') {
  const text = String(value || '').normalize('NFKC').trim().toLowerCase();
  return (text || fallback).replace(/[^a-z0-9 _-]+/gu, '').slice(0, 32) || fallback;
}

function normalizeSessionGroupName(value) {
  const key = normalizeSessionId(value).slice(0, 48);
  return ['all', 'followers', 'session', 'group', 'role', 'leader'].includes(key) ? '' : key;
}

function normalizeAliases(input = []) {
  const records = Array.isArray(input) ? input.slice(0, DEFAULT_MAX_ALIASES * 4) : [];
  const aliases = new Map();

  for (const raw of records) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const name = normalizeAliasName(record.name);
    const body = normalizeAliasBody(record.body);
    if (!name || !body) continue;
    if (!aliases.has(name) && aliases.size >= DEFAULT_MAX_ALIASES) continue;
    const priority = normalizeAliasPriority(record.priority);
    const className = normalizeClassName(record.className);
    aliases.set(name, { name, body, priority, scope: 'global', ...(className ? { className } : {}) });
  }

  return [...aliases.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeVariables(input = []) {
  const records = Array.isArray(input) ? input.slice(0, DEFAULT_MAX_VARIABLES * 4) : [];
  const variables = new Map();

  for (const raw of records) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const name = normalizeVariableName(record.name);
    const value = normalizeVariableValue(record.value);
    if (!name) continue;
    if (!variables.has(name) && variables.size >= DEFAULT_MAX_VARIABLES) continue;
    const className = normalizeClassName(record.className);
    variables.set(name, { name, value, scope: 'global', ...(className ? { className } : {}) });
  }

  return [...variables.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeFunctions(input = []) {
  const records = Array.isArray(input) ? input.slice(0, DEFAULT_MAX_FUNCTIONS * 4) : [];
  const functions = new Map();

  for (const raw of records) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const name = normalizeFunctionName(record.name);
    const body = normalizeFunctionBody(record.body);
    if (!name || !body) continue;
    if (!functions.has(name) && functions.size >= DEFAULT_MAX_FUNCTIONS) continue;
    const className = normalizeClassName(record.className);
    functions.set(name, { name, body, scope: 'global', ...(className ? { className } : {}) });
  }

  return [...functions.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeActions(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const records = Array.isArray(source.definitions)
    ? source.definitions.slice(0, DEFAULT_MAX_ACTIONS * 4)
    : [];
  const actions = new Map();

  for (const raw of records) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const pattern = normalizeActionPattern(record.pattern);
    const command = normalizeActionCommand(record.command);
    if (!pattern || !command) continue;
    if (!actions.has(pattern) && actions.size >= DEFAULT_MAX_ACTIONS) continue;
    actions.set(pattern, {
      pattern,
      command,
      priority: normalizeActionPriority(record.priority),
      enabled: record.enabled !== false,
      scope: 'global',
      ...(normalizeClassName(record.className) ? { className: normalizeClassName(record.className) } : {})
    });
  }

  return {
    enabled: source.enabled !== false,
    definitions: [...actions.values()].sort((left, right) =>
      left.priority - right.priority || left.pattern.localeCompare(right.pattern)
    )
  };
}

function normalizeGags(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const records = Array.isArray(source.definitions)
    ? source.definitions.slice(0, DEFAULT_MAX_GAGS * 4)
    : [];
  const gags = new Map();

  for (const raw of records) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const pattern = normalizeActionPattern(record.pattern);
    if (!pattern) continue;
    if (!gags.has(pattern) && gags.size >= DEFAULT_MAX_GAGS) continue;
    gags.set(pattern, {
      pattern,
      enabled: record.enabled !== false,
      scope: 'global',
      ...(normalizeClassName(record.className) ? { className: normalizeClassName(record.className) } : {})
    });
  }

  return {
    enabled: source.enabled !== false,
    definitions: [...gags.values()].sort((left, right) =>
      left.pattern.localeCompare(right.pattern)
    )
  };
}

function normalizeHighlights(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const records = Array.isArray(source.definitions)
    ? source.definitions.slice(0, DEFAULT_MAX_HIGHLIGHTS * 4)
    : [];
  const highlights = new Map();

  for (const raw of records) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const pattern = normalizeHighlightPattern(record.pattern);
    const style = normalizeHighlightStyle(record.style);
    if (!pattern || !style || parseHighlightStyle(style).error) continue;
    if (!highlights.has(pattern) && highlights.size >= DEFAULT_MAX_HIGHLIGHTS) continue;
    const className = normalizeClassName(record.className);
    highlights.set(pattern, {
      pattern,
      style,
      priority: normalizeHighlightPriority(record.priority),
      enabled: record.enabled !== false,
      scope: 'global',
      ...(className ? { className } : {})
    });
  }

  return {
    enabled: source.enabled !== false,
    definitions: [...highlights.values()].sort((left, right) =>
      left.priority - right.priority || left.pattern.localeCompare(right.pattern)
    )
  };
}

function normalizeSubstitutes(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const records = Array.isArray(source.definitions)
    ? source.definitions.slice(0, DEFAULT_MAX_SUBSTITUTES * 4)
    : [];
  const substitutes = new Map();

  for (const raw of records) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const pattern = normalizeSubstitutePattern(record.pattern);
    const replacement = normalizeSubstituteReplacement(record.replacement);
    if (!pattern || !compileSubstitutePattern(pattern)) continue;
    if (!substitutes.has(pattern) && substitutes.size >= DEFAULT_MAX_SUBSTITUTES) continue;
    const className = normalizeClassName(record.className);
    substitutes.set(pattern, {
      pattern,
      replacement,
      priority: normalizeSubstitutePriority(record.priority),
      enabled: record.enabled !== false,
      scope: 'global',
      ...(className ? { className } : {})
    });
  }

  return {
    enabled: source.enabled !== false,
    definitions: [...substitutes.values()].sort((left, right) =>
      left.priority - right.priority || left.pattern.localeCompare(right.pattern)
    )
  };
}

function normalizeSpeedwalk(input) {
  if (typeof input === 'boolean') return { enabled: input };
  if (input && typeof input === 'object' && Object.hasOwn(input, 'enabled')) {
    return { enabled: input.enabled === true };
  }
  return { enabled: true };
}

function normalizeTinTinProfile(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    requested: String(source.requested || '').normalize('NFKC').trim().slice(0, 255),
    filename: String(source.filename || '').normalize('NFKC').trim().slice(0, 255),
    loaded: source.loaded === true
  };
}

function normalizeEvents(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const records = Array.isArray(source.definitions) ? source.definitions.slice(0, DEFAULT_MAX_EVENTS * 4) : [];
  const events = new Map();
  for (const raw of records) {
    const name = normalizeEventName(raw?.name);
    const command = normalizeEventCommand(raw?.command);
    if (!name || !command) continue;
    if (!events.has(name) && events.size >= DEFAULT_MAX_EVENTS) continue;
    const className = normalizeClassName(raw?.className);
    events.set(name, { name, command, enabled: raw?.enabled !== false, scope: 'global', ...(className ? { className } : {}) });
  }
  return { enabled: source.enabled !== false, definitions: [...events.values()].sort((a,b) => a.name.localeCompare(b.name)) };
}

function normalizeTinTinConfig(input = {}) {
  const mode = String(input?.logMode || '').trim().toLowerCase();
  const repeatChar = [...String(input?.repeatChar || '!')][0] || '!';
  const verbatimChar = [...String(input?.verbatimChar || '\\')][0] || '\\';
  return {
    logMode: ['plain','raw'].includes(mode) ? mode : 'plain',
    commandEcho: input?.commandEcho === true,
    autoTab: Number.isSafeInteger(Number(input?.autoTab)) && Number(input.autoTab) >= 1 && Number(input.autoTab) <= 999999 ? Number(input.autoTab) : 0,
    verbatim: input?.verbatim === true,
    repeatChar: /\s/u.test(repeatChar) ? '!' : repeatChar,
    repeatEnter: input?.repeatEnter === true,
    verbatimChar: /\s/u.test(verbatimChar) ? '\\' : verbatimChar,
    historySize: Number.isSafeInteger(Number(input?.historySize)) && Number(input.historySize) >= 0 && Number(input.historySize) <= 9999 ? Number(input.historySize) : 2000,
    bufferSize: Number.isSafeInteger(Number(input?.bufferSize)) && Number(input.bufferSize) >= 100 && Number(input.bufferSize) <= 100000 ? Number(input.bufferSize) : 5000
  };
}

function normalizeSessionTinTin(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    aliases: normalizeAliases(source.aliases),
    variables: normalizeVariables(source.variables),
    functions: normalizeFunctions(source.functions),
    actions: normalizeActions(source.actions),
    gags: normalizeGags(source.gags),
    highlights: normalizeHighlights(source.highlights),
    substitutes: normalizeSubstitutes(source.substitutes),
    macros: normalizeMacrosSnapshot(source.macros),
    tabs: Array.isArray(source.tabs) ? source.tabs.slice(0, 1024).map((record) => ({
      value: String(record?.value ?? record ?? '').normalize('NFKC').trim().slice(0, 1024),
      ...(record?.className ? { className: String(record.className).normalize('NFKC').trim().toLowerCase().slice(0, 48) } : {})
    })).filter((record) => record.value && !/[\r\n\0]/u.test(record.value)) : [],
    events: normalizeEvents(source.events),
    config: normalizeTinTinConfig(source.config),
    classes: normalizeClassesSnapshot(source.classes),
    speedwalk: normalizeSpeedwalk(source.speedwalk),
    profile: normalizeTinTinProfile(source.profile)
  };
}

function legacyTinTinSnapshot(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return normalizeSessionTinTin({
    aliases: source.aliases,
    variables: source.variables,
    functions: source.functions,
    actions: source.actions,
    gags: source.gags,
    highlights: source.highlights,
    substitutes: source.substitutes,
    macros: source.macros,
    tabs: source.tabs,
    events: source.events,
    config: source.config,
    classes: source.classes,
    speedwalk: source.speedwalk
  });
}

function normalizeSessions(input = {}, connection = DEFAULT_SETTINGS.connection, legacyDefinitions = null) {
  const suppliedDefinitions = Array.isArray(input.sessions);
  const definitions = suppliedDefinitions ? input.sessions : DEFAULT_SESSIONS.sessions;
  const sessions = [];
  const seen = new Set();

  for (const raw of definitions.slice(0, 24)) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const id = normalizeSessionId(record.id || record.name);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    sessions.push({
      id,
      name: normalizeSessionName(record.name, id),
      role: normalizeSessionRole(record.role),
      host: normalizeHost(record.host, connection.host),
      port: normalizePort(record.port, connection.port),
      pipelineDebug: normalizePipelineDebugSettings(record.pipelineDebug),
      tintin: normalizeSessionTinTin(record.tintin)
    });
  }

  if (sessions.length === 0) {
    sessions.push({
      id: 'main',
      name: 'Main',
      role: 'tank',
      host: connection.host,
      port: connection.port,
      pipelineDebug: normalizePipelineDebugSettings(),
      tintin: normalizeSessionTinTin()
    });
  }

  const sessionIds = new Set(sessions.map((session) => session.id));
  const groups = {};
  const rawGroups = input.groups && typeof input.groups === 'object'
    ? Object.entries(input.groups).slice(0, 32)
    : [];
  for (const [rawName, rawGroup] of rawGroups) {
    const group = rawGroup && typeof rawGroup === 'object' ? rawGroup : {};
    const name = normalizeSessionGroupName(group.name || rawName);
    if (!name || Object.hasOwn(groups, name)) continue;
    const members = Array.isArray(group.members)
      ? [...new Set(group.members.map(normalizeSessionId).filter((id) => sessionIds.has(id)))].slice(0, 24)
      : [];
    if (members.length === 0) continue;
    const leader = normalizeSessionId(group.leader);
    groups[name] = {
      name,
      members,
      leader: members.includes(leader) ? leader : members[0]
    };
  }

  const requestedActive = normalizeSessionId(input.activeSessionId);
  const activeSessionId = sessionIds.has(requestedActive) ? requestedActive : sessions[0].id;
  const hasPerSessionTinTin = suppliedDefinitions && definitions.some((raw) =>
    raw && typeof raw === 'object' && raw.tintin && typeof raw.tintin === 'object'
  );
  if (!hasPerSessionTinTin && legacyDefinitions && typeof legacyDefinitions === 'object') {
    const target = sessions.find((session) => session.id === activeSessionId) || sessions[0];
    if (target) target.tintin = legacyTinTinSnapshot(legacyDefinitions);
  }
  return {
    activeSessionId,
    sessions,
    groups
  };
}

function normalizeFontId(value, allowed, fallback) {
  const clean = String(value || '').trim().toLowerCase();
  return allowed.includes(clean) ? clean : fallback;
}

function normalizeHiddenDefaultQuickCommands(input) {
  const source = Array.isArray(input) ? input : [];
  const allowed = new Set(DEFAULT_QUICK_COMMAND_IDS);
  return [...new Set(source
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((id) => allowed.has(id)))];
}

function normalizeQuickKeys(input) {
  const source = Array.isArray(input) ? input.slice(0, MAX_QUICK_KEYS * 4) : [];
  const output = [];
  const usedIds = new Set();

  for (const raw of source) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const label = String(record.label || '').normalize('NFKC')
      .replace(/[\r\n\t]+/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, MAX_QUICK_KEY_LABEL);
    const command = String(record.command || '').normalize('NFKC')
      .replace(/[\r\n]+/gu, ' ').trim().slice(0, MAX_QUICK_KEY_COMMAND);
    if (!label || !command) continue;

    let id = String(record.id || '').normalize('NFKC').trim().toLowerCase()
      .replace(/[^a-z0-9_-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 48);
    if (!id || usedIds.has(id)) {
      let sequence = output.length + 1;
      do {
        id = `quick-${sequence}`;
        sequence += 1;
      } while (usedIds.has(id));
    }
    usedIds.add(id);
    output.push({ id, label, command, enabled: record.enabled !== false });
    if (output.length >= MAX_QUICK_KEYS) break;
  }
  return output;
}

function normalizeDisplayComponents(input = {}) {
  const defaults = DEFAULT_SETTINGS.display.components;
  return {
    groupVitals: booleanValue(input.groupVitals, defaults.groupVitals),
    mapperExits: booleanValue(input.mapperExits, defaults.mapperExits),
    gpsNavigator: booleanValue(input.gpsNavigator, defaults.gpsNavigator),
    mapperMap: booleanValue(input.mapperMap, defaults.mapperMap),
    mapperRoomInfo: booleanValue(input.mapperRoomInfo, defaults.mapperRoomInfo)
  };
}


function normalizeVitalDisplayPreferences(input = {}) {
  const defaults = DEFAULT_SETTINGS.display.vitals;
  return {
    mainMode: normalizeVitalDisplayMode(input.mainMode, defaults.mainMode),
    groupMode: normalizeVitalDisplayMode(input.groupMode, defaults.groupMode),
    numberSize: normalizeVitalNumberSize(input.numberSize, defaults.numberSize),
    hideSelfInGroup: booleanValue(input.hideSelfInGroup, defaults.hideSelfInGroup)
  };
}


function normalizeTheme(input = {}) {
  const defaults = DEFAULT_SETTINGS.display.theme;
  const preset = String(input.preset || defaults.preset).trim().toLowerCase();

  return {
    preset: /^[a-z0-9_-]{1,40}$/u.test(preset) ? preset : defaults.preset,
    foreground: normalizeHexColor(input.foreground, defaults.foreground),
    background: normalizeHexColor(input.background, defaults.background),
    monochrome: booleanValue(input.monochrome, defaults.monochrome),
    version: String(input.version || defaults.version).slice(0, 20)
  };
}

function normalizeSettings(input = {}, now = new Date().toISOString()) {
  const connectionInput = input.connection || {};
  const inputPreferences = input.input || {};
  const display = input.display || {};
  const accessibility = input.accessibility || {};
  const sourceSchemaVersion = boundedInteger(input.schemaVersion, 0, SETTINGS_SCHEMA_VERSION, 0);
  const workspace = migrateWorkspaceInput(input.workspace || {}, sourceSchemaVersion);
  const connection = {
    host: normalizeHost(connectionInput.host, DEFAULT_SETTINGS.connection.host),
    port: normalizePort(connectionInput.port, DEFAULT_SETTINGS.connection.port),
    compressionEnabled: booleanValue(
      connectionInput.compressionEnabled,
      DEFAULT_SETTINGS.connection.compressionEnabled
    )
  };

  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    updatedAt: now,
    connection,
    input: {
      repeatLastCommandOnEnter: booleanValue(
        inputPreferences.repeatLastCommandOnEnter,
        DEFAULT_SETTINGS.input.repeatLastCommandOnEnter
      ),
      showLastCommandInInput: booleanValue(
        inputPreferences.showLastCommandInInput,
        DEFAULT_SETTINGS.input.showLastCommandInInput
      ),
      brightCommandInputFocus: booleanValue(
        inputPreferences.brightCommandInputFocus,
        DEFAULT_SETTINGS.input.brightCommandInputFocus
      ),
      commandPrefix: normalizeClientCommandPrefix(
        inputPreferences.commandPrefix,
        DEFAULT_SETTINGS.input.commandPrefix
      )
    },
    display: {
      followOutput: booleanValue(
        display.followOutput,
        DEFAULT_SETTINGS.display.followOutput
      ),
      compactOutput: booleanValue(
        display.compactOutput,
        DEFAULT_SETTINGS.display.compactOutput
      ),
      fontSize: boundedInteger(
        display.fontSize,
        12,
        28,
        DEFAULT_SETTINGS.display.fontSize
      ),
      uiFont: normalizeFontId(display.uiFont, UI_FONT_IDS, DEFAULT_SETTINGS.display.uiFont),
      terminalFont: normalizeFontId(display.terminalFont, TERMINAL_FONT_IDS, DEFAULT_SETTINGS.display.terminalFont),
      interfaceBrightness: normalizeFontId(
        display.interfaceBrightness,
        INTERFACE_BRIGHTNESS_IDS,
        DEFAULT_SETTINGS.display.interfaceBrightness
      ),
      affectsMode: normalizeFontId(
        display.affectsMode,
        AFFECT_DISPLAY_MODES,
        DEFAULT_SETTINGS.display.affectsMode
      ),
      text: normalizeDisplayText(display.text),
      promptMode: normalizePromptDisplayMode(display.promptMode),
      components: normalizeDisplayComponents(display.components),
      vitals: normalizeVitalDisplayPreferences(display.vitals),
      theme: normalizeTheme(display.theme)
    },
    accessibility: (() => {
      const screenReaderMode = booleanValue(
        accessibility.screenReaderMode,
        DEFAULT_SETTINGS.accessibility.screenReaderMode
      );
      const requestedSelfVoice = booleanValue(
        accessibility.selfVoiceEnabled,
        DEFAULT_SETTINGS.accessibility.selfVoiceEnabled
      );
      return {
        screenReaderMode,
        readerWorkspaceEnabled: booleanValue(
          accessibility.readerWorkspaceEnabled,
          DEFAULT_SETTINGS.accessibility.readerWorkspaceEnabled
        ),
        selfVoiceEnabled: requestedSelfVoice && !screenReaderMode,
        selfVoiceMuted: booleanValue(
          accessibility.selfVoiceMuted,
          DEFAULT_SETTINGS.accessibility.selfVoiceMuted
        ),
        selfVoiceForegroundOnly: booleanValue(
          accessibility.selfVoiceForegroundOnly,
          DEFAULT_SETTINGS.accessibility.selfVoiceForegroundOnly
        ),
        selfVoiceFollowMode: booleanValue(
          accessibility.selfVoiceFollowMode,
          DEFAULT_SETTINGS.accessibility.selfVoiceFollowMode
        ),
        selfVoiceInterruptOnCommand: booleanValue(
          accessibility.selfVoiceInterruptOnCommand,
          DEFAULT_SETTINGS.accessibility.selfVoiceInterruptOnCommand
        ),
        selfVoiceGovernorEnabled: booleanValue(
          accessibility.selfVoiceGovernorEnabled,
          DEFAULT_SETTINGS.accessibility.selfVoiceGovernorEnabled
        ),
        selfVoicePriorityAlertsEnabled: booleanValue(
          accessibility.selfVoicePriorityAlertsEnabled,
          DEFAULT_SETTINGS.accessibility.selfVoicePriorityAlertsEnabled
        ),
        selfVoiceRate: boundedNumber(accessibility.selfVoiceRate, 0.1, 10, DEFAULT_SETTINGS.accessibility.selfVoiceRate),
        selfVoicePitch: boundedNumber(accessibility.selfVoicePitch, 0, 2, DEFAULT_SETTINGS.accessibility.selfVoicePitch),
        selfVoiceVolume: boundedNumber(accessibility.selfVoiceVolume, 0, 1, DEFAULT_SETTINGS.accessibility.selfVoiceVolume),
        selfVoiceVoiceId: String(accessibility.selfVoiceVoiceId || '').trim().slice(0, 512),
        vitalSpeechMode: normalizeVitalSpeechMode(
          accessibility.vitalSpeechMode,
          DEFAULT_SETTINGS.accessibility.vitalSpeechMode
        ),
        audioCuesEnabled: booleanValue(
          accessibility.audioCuesEnabled,
          DEFAULT_SETTINGS.accessibility.audioCuesEnabled
        ),
        audioCuesMuted: booleanValue(
          accessibility.audioCuesMuted,
          DEFAULT_SETTINGS.accessibility.audioCuesMuted
        ),
        audioCuesForegroundOnly: booleanValue(
          accessibility.audioCuesForegroundOnly,
          DEFAULT_SETTINGS.accessibility.audioCuesForegroundOnly
        ),
        audioCuesVolume: boundedNumber(
          accessibility.audioCuesVolume, 0, 1, DEFAULT_SETTINGS.accessibility.audioCuesVolume
        ),
        soundpackDisabledEvents: normalizeSoundpackDisabledEvents(accessibility.soundpackDisabledEvents),
        communicationCues: (() => {
          const cues = accessibility.communicationCues && typeof accessibility.communicationCues === 'object'
            ? accessibility.communicationCues
            : {};
          return {
            tell: booleanValue(cues.tell, DEFAULT_SETTINGS.accessibility.communicationCues.tell),
            auction: booleanValue(cues.auction, DEFAULT_SETTINGS.accessibility.communicationCues.auction),
            gossip: booleanValue(cues.gossip, DEFAULT_SETTINGS.accessibility.communicationCues.gossip),
            group: booleanValue(cues.group, DEFAULT_SETTINGS.accessibility.communicationCues.group),
            grats: booleanValue(cues.grats, DEFAULT_SETTINGS.accessibility.communicationCues.grats),
            shout: booleanValue(cues.shout, DEFAULT_SETTINGS.accessibility.communicationCues.shout),
            holler: booleanValue(cues.holler, DEFAULT_SETTINGS.accessibility.communicationCues.holler),
            skynet: booleanValue(cues.skynet, DEFAULT_SETTINGS.accessibility.communicationCues.skynet),
            ssf: booleanValue(cues.ssf, DEFAULT_SETTINGS.accessibility.communicationCues.ssf),
            background: booleanValue(cues.background, DEFAULT_SETTINGS.accessibility.communicationCues.background)
          };
        })(),
        announceImportant: booleanValue(
          accessibility.announceImportant,
          DEFAULT_SETTINGS.accessibility.announceImportant
        )
      };
    })(),
    tintinStartup: normalizeTinTinStartupSettings(input.tintinStartup),
    aliases: normalizeAliases(input.aliases),
    variables: normalizeVariables(input.variables),
    functions: normalizeFunctions(input.functions),
    quickKeys: normalizeQuickKeys(input.quickKeys),
    hiddenDefaultQuickCommands: normalizeHiddenDefaultQuickCommands(input.hiddenDefaultQuickCommands),
    keybindings: normalizeKeybindingSettings(input.keybindings),
    soundTriggers: normalizeSoundTriggerSettings(input.soundTriggers),
    actions: normalizeActions(input.actions),
    gags: normalizeGags(input.gags),
    highlights: normalizeHighlights(input.highlights),
    substitutes: normalizeSubstitutes(input.substitutes),
    macros: normalizeMacrosSnapshot(input.macros),
    classes: normalizeClassesSnapshot(input.classes),
    speedwalk: normalizeSpeedwalk(input.speedwalk),
    sessions: normalizeSessions(input.sessions || {}, connection, {
      aliases: input.aliases,
      variables: input.variables,
      functions: input.functions,
      actions: input.actions,
      gags: input.gags,
      highlights: input.highlights,
      substitutes: input.substitutes,
      macros: input.macros,
      classes: input.classes,
      speedwalk: input.speedwalk
    }),
    workspace: normalizeWorkspace(workspace)
  };
}

function settingsFromLegacy(legacy = {}) {
  return normalizeSettings({
    connection: {
      host: legacy.host,
      port: legacy.port,
      compressionEnabled: legacy.compressionEnabled
    },
    input: {
      repeatLastCommandOnEnter: legacy.repeatLastCommandOnEnter,
      showLastCommandInInput: legacy.showLastCommandInInput,
      brightCommandInputFocus: legacy.brightCommandInputFocus,
      commandPrefix: legacy.commandPrefix
    },
    keybindings: legacy.keybindings,
    display: {
      followOutput: legacy.followOutput,
      compactOutput: legacy.compactOutput,
      fontSize: legacy.fontSize,
      uiFont: legacy.uiFont,
      terminalFont: legacy.terminalFont,
      interfaceBrightness: legacy.interfaceBrightness,
      affectsMode: legacy.affectsDisplayMode,
      text: {
        panelLabels: legacy.panelLabels,
        mapperRoomLabels: legacy.mapperRoomLabels
      },
      components: {
        groupVitals: legacy.showGroupVitals,
        mapperExits: legacy.showMapperExits,
        gpsNavigator: legacy.showGpsNavigator,
        mapperMap: legacy.showMapperMap,
        mapperRoomInfo: legacy.showMapperRoomInfo
      },
      vitals: {
        mainMode: legacy.mainVitalsMode,
        groupMode: legacy.groupVitalsMode,
        numberSize: legacy.vitalsNumberSize,
        hideSelfInGroup: legacy.hideSelfInGroupVitals
      },
      theme: {
        preset: legacy.terminalTheme,
        foreground: legacy.terminalForeground,
        background: legacy.terminalBackground,
        monochrome: legacy.terminalMonochrome,
        version: legacy.terminalThemeVersion
      }
    },
    accessibility: {
      screenReaderMode: legacy.screenReaderMode,
      readerWorkspaceEnabled: legacy.readerWorkspaceEnabled,
      selfVoiceEnabled: legacy.selfVoiceEnabled,
      selfVoiceMuted: legacy.selfVoiceMuted,
      selfVoiceForegroundOnly: legacy.selfVoiceForegroundOnly,
      selfVoiceFollowMode: legacy.selfVoiceFollowMode,
      selfVoiceInterruptOnCommand: legacy.selfVoiceInterruptOnCommand,
      selfVoiceGovernorEnabled: legacy.selfVoiceGovernorEnabled,
      selfVoicePriorityAlertsEnabled: legacy.selfVoicePriorityAlertsEnabled,
      selfVoiceRate: legacy.selfVoiceRate,
      selfVoicePitch: legacy.selfVoicePitch,
      selfVoiceVolume: legacy.selfVoiceVolume,
      selfVoiceVoiceId: legacy.selfVoiceVoiceId,
      vitalSpeechMode: legacy.vitalSpeechMode,
      audioCuesEnabled: legacy.audioCuesEnabled,
      audioCuesMuted: legacy.audioCuesMuted,
      audioCuesForegroundOnly: legacy.audioCuesForegroundOnly,
      audioCuesVolume: legacy.audioCuesVolume,
      soundpackDisabledEvents: legacy.soundpackDisabledEvents,
      communicationCues: {
        tell: legacy.communicationCueTell,
        auction: legacy.communicationCueAuction,
        gossip: legacy.communicationCueGossip,
        group: legacy.communicationCueGroup,
        grats: legacy.communicationCueGrats,
        shout: legacy.communicationCueShout,
        holler: legacy.communicationCueHoller,
        skynet: legacy.communicationCueSkynet,
        ssf: legacy.communicationCueSsf,
        background: legacy.communicationCuesBackground
      },
      announceImportant: legacy.announceImportant
    }
  });
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

class SettingsStore {
  constructor(options = {}) {
    if (!options.baseDirectory) {
      throw new TypeError('SettingsStore requires a baseDirectory.');
    }

    this.baseDirectory = options.baseDirectory;
    this.filePath = path.join(this.baseDirectory, 'settings.json');
    this.backupPath = `${this.filePath}.bak`;
    this.current = null;
    this.writeQueue = Promise.resolve();
  }

  async load(options = {}) {
    if (this.current) return clone(this.current);

    const primary = await this.tryRead(this.filePath);
    if (primary) {
      this.current = normalizeSettings(primary);
      return clone(this.current);
    }

    const backup = await this.tryRead(this.backupPath);
    if (backup) {
      this.current = normalizeSettings(backup);
      await this.write(this.current, { backupCurrent: false });
      return clone(this.current);
    }

    this.current = options.legacy
      ? settingsFromLegacy(options.legacy)
      : normalizeSettings(DEFAULT_SETTINGS);

    await this.write(this.current, { backupCurrent: false });
    return clone(this.current);
  }

  async save(settings, options = {}) {
    const next = normalizeSettings(settings);
    this.current = next;

    this.writeQueue = this.writeQueue.then(
      () => this.write(next),
      () => this.write(next)
    );

    await this.writeQueue;
    return options.returnSnapshot === false ? null : clone(this.current);
  }

  getSnapshot() {
    return clone(this.current || normalizeSettings(DEFAULT_SETTINGS));
  }

  getInfo() {
    return {
      schemaVersion: SETTINGS_SCHEMA_VERSION,
      directory: this.baseDirectory,
      filePath: this.filePath,
      backupPath: this.backupPath
    };
  }

  async tryRead(filePath) {
    try {
      return await readJson(filePath);
    } catch (error) {
      if (error?.code === 'ENOENT' || error instanceof SyntaxError) return null;
      throw error;
    }
  }

  async write(settings, options = {}) {
    await fs.mkdir(this.baseDirectory, { recursive: true });

    const temporaryPath = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    const payload = `${JSON.stringify(settings, null, 2)}\n`;

    try {
      await fs.writeFile(temporaryPath, payload, {
        encoding: 'utf8',
        mode: 0o600
      });

      if (options.backupCurrent !== false) {
        try {
          await fs.copyFile(this.filePath, this.backupPath);
        } catch (error) {
          if (error?.code !== 'ENOENT') throw error;
        }
      }

      await fs.rename(temporaryPath, this.filePath);
    } catch (error) {
      await fs.rm(temporaryPath, { force: true }).catch(() => {});
      throw error;
    }
  }
}

module.exports = {
  SettingsStore,
  SETTINGS_SCHEMA_VERSION,
  DEFAULT_SETTINGS,
  DEFAULT_SESSIONS,
  DEFAULT_TINTIN_STARTUP,
  normalizeTinTinStartupSettings,
  DEFAULT_SOUND_TRIGGER_SETTINGS,
  normalizeSettings,
  normalizeSessionTinTin,
  normalizeTinTinProfile,
  normalizeAliases,
  normalizeVariables,
  normalizeFunctions,
  normalizeQuickKeys,
  normalizeHiddenDefaultQuickCommands,
  normalizeKeybindingSettings,
  normalizeSoundTriggerSettings,
  normalizeDisplayComponents,
  normalizeDisplayText,
  normalizeVitalDisplayPreferences,
  normalizeActions,
  normalizeGags,
  normalizeHighlights,
  normalizeSubstitutes,
  normalizeMacrosSnapshot,
  normalizeClassesSnapshot,
  normalizeSpeedwalk,
  normalizeSessions,
  settingsFromLegacy,
  PANEL_IDS,
  DEFAULT_PANEL_VISIBILITY,
  normalizePanelVisibility,
  normalizePanelLayout,
  normalizePanelHeights,
  normalizeCharacterKey,
  normalizeWorkspace,
  DOCK_REGIONS,
  DEFAULT_PANEL_LAYOUT,
  DEFAULT_TAB_GROUPS,
  DEFAULT_ACTIVE_TABS,
  normalizeTabGroups,
  normalizeActiveTabs,
  DOCK_SIZE_LIMITS,
  DEFAULT_DOCK_SIZES,
  normalizeDockSizes,
  COMMUNICATION_CHANNELS,
  COMMUNICATION_MESSAGE_ORDERS,
  DEFAULT_COMMUNICATIONS,
  normalizeCommunications,
  DEFAULT_POPOUTS,
  normalizePopouts,
  MAX_QUICK_KEYS,
  DEFAULT_QUICK_COMMAND_IDS,
  UI_FONT_IDS,
  TERMINAL_FONT_IDS,
  AFFECT_DISPLAY_MODES,
  DEFAULT_DISPLAY_TEXT,
  normalizePipelineDebugSettings
};
