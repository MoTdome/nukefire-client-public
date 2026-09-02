'use strict';

const elementByIdCache = new Map();
const SIMPLE_ID_SELECTOR = /^#[A-Za-z][\w:.-]*$/u;
const $ = (selector) => {
  const key = String(selector || '');
  if (SIMPLE_ID_SELECTOR.test(key)) {
    const id = key.slice(1);
    const cached = elementByIdCache.get(id);
    if (cached?.isConnected) return cached;
    const element = document.getElementById(id);
    if (element) elementByIdCache.set(id, element);
    else elementByIdCache.delete(id);
    return element;
  }
  return document.querySelector(key);
};

function setTextIfChanged(element, value) {
  if (!element) return false;
  const text = String(value ?? '');
  if (element.textContent === text) return false;
  element.textContent = text;
  return true;
}

function setAttributeIfChanged(element, name, value) {
  if (!element) return false;
  const text = String(value ?? '');
  if (element.getAttribute(name) === text) return false;
  element.setAttribute(name, text);
  return true;
}

function removeAttributeIfPresent(element, name) {
  if (!element?.hasAttribute(name)) return false;
  element.removeAttribute(name);
  return true;
}
const terminalOutputHost = $('#terminal-output-host');
const xtermOutput = $('#output');
const terminalRecovery = $('#terminal-recovery');
const terminalRecoveryMessage = $('#terminal-recovery-message');
const retryTerminalButton = $('#retry-terminal');
const commandInput = $('#command');
const connectButton = $('#connect');
const reconnectButton = $('#reconnect');
const disconnectButton = $('#disconnect');
const disconnectOverlay = $('#disconnect-overlay');
const disconnectDialog = $('#disconnect-dialog');
const disconnectTitle = $('#disconnect-title');
const disconnectMessage = $('#disconnect-message');
const disconnectCancelButton = $('#disconnect-cancel');
const disconnectConfirmButton = $('#disconnect-confirm');
const closeSessionOverlay = $('#close-session-overlay');
const closeSessionDialog = $('#close-session-dialog');
const closeSessionTitle = $('#close-session-title');
const closeSessionMessage = $('#close-session-message');
const closeSessionCancelButton = $('#close-session-cancel');
const closeSessionConfirmButton = $('#close-session-confirm');
const readerSetupButton = $('#reader-setup-button');
const readerSetupOverlay = $('#reader-setup-overlay');
const readerSetupDialog = $('#reader-setup-dialog');
const readerSetupNativeButton = $('#reader-setup-native');
const readerSetupLiveButton = $('#reader-setup-live');
const readerSetupLaterButton = $('#reader-setup-later');
const hostInput = $('#host');
const portInput = $('#port');
const statusBox = $('#status');
const statusText = $('#status-text');
const connectionBarToggle = $('#connection-bar-toggle');
const lineCount = $('#line-count');
const dockedPromptRow = $('#docked-prompt-row');
const dockedPromptContent = $('#docked-prompt-content');
const announcer = $('#sr-announcer');
const interruptAnnouncer = $('#sr-interrupt-announcer');
const appRoot = $('#app');
const knowledgeOverlay = $('#knowledge-overlay');
const knowledgeDialog = $('#knowledge-dialog');
const knowledgeButton = $('#knowledge-button');
const knowledgeSearch = $('#knowledge-search');
const knowledgeResults = $('#knowledge-results');
const knowledgeEntry = $('#knowledge-entry');
const knowledgeStatus = $('#knowledge-status');
const knowledgeLoadMore = $('#knowledge-load-more');
const preferencesOverlay = $('#preferences-overlay');
const preferencesDialog = $('#preferences-dialog');
const preferencesButton = $('#preferences-button');
const preferencesContent = $('#preferences-content');
const preferencesTablist = $('.preferences-tablist');
const preferenceTabs = [...document.querySelectorAll('[role="tab"][data-preference-category]')];
const preferencePanels = [...document.querySelectorAll('[role="tabpanel"][data-preference-category]')];
const panelMenuLayer = $('#panel-menu-layer');
const sessionTabs = $('#session-tabs');
const sessionRole = $('#session-role');
const sessionCreateDrawer = $('#session-create-drawer');
const sessionCreateForm = $('#session-create-form');
const layoutGallery = $('#layout-gallery');
const layoutGalleryName = $('#layout-gallery-name');
const layoutGalleryDescription = $('#layout-gallery-description');
const layoutGalleryPreview = $('#layout-gallery-preview');
const layoutGalleryPrevious = $('#layout-gallery-previous');
const layoutGalleryNext = $('#layout-gallery-next');
const layoutGalleryApply = $('#layout-gallery-apply');
let ansi = new window.NukeFireAnsi.AnsiParser();
const sessionRuntimeApi = window.NukeFireSessions || {};
const communicationsApi = window.NukeFireCommunications || {};
const communicationsReviewApi = window.NukeFireCommunicationsReview || {};
const gmcpStoreApi = window.NukeFireGmcpStore || {};
const panelWindowsApi = window.NukeFirePanelWindows || {};
const panelDragLayoutApi = window.NukeFirePanelDragLayout || {};
const mapperApi = window.NukeFireMapper || {};
const gpsGuidanceApi = window.NukeFireGpsGuidance || {};
const contextApi = window.NukeFireContext || {};
const affectsApi = window.NukeFireAffects || {};
const mobInspectorApi = window.NukeFireMobInspector || {};
const foundlistApi = window.NukeFireFoundlist || {};
const knowledgeApi = window.NukeFireKnowledge || {};
const readerReviewApi = window.NukeFireReaderReview || {};
const readerHistoryApi = window.NukeFireReaderHistory || {};
const readerSafetyApi = window.NukeFireReaderSafety || {};
const readerOnboardingApi = window.NukeFireReaderOnboarding || {};
const speechMarkersApi = window.NukeFireSpeechMarkers || {};
const selfVoiceApi = window.NukeFireSelfVoice || {};
const xtermApi = window.NukeFireXterm || {};
const osc8LinksApi = window.NukeFireOsc8 || {};
const highlightApi = window.NukeFireHighlights || {};
const substituteApi = window.NukeFireSubstitutes || {};
const combatVitalsApi = window.NukeFireCombatVitals || {};
const tintinImporterApi = window.NukeFireTinTinImporter || {};
const tintinScriptLoaderApi = window.NukeFireTinTinScriptLoader || {};
const tintinCompatibilityAuditApi = window.NukeFireTinTinCompatibilityAudit || {};
const tintinSessionRoutesApi = window.NukeFireTinTinSessionRoutes || {};
const tintinScriptWriterApi = window.NukeFireTinTinScriptWriter || {};
const tintinStartupApi = window.NukeFireTinTinStartup || {};
const keybindingApi = window.NukeFireKeybindings || {};
const readerPresetsApi = window.NukeFireReaderPresets || {};
const clientPresetApi = window.NukeFireClientPresets || {};
const audioCueApi = window.NukeFireAudioCues || {};
const soundTriggerApi = window.NukeFireSoundTriggers || {};
const macroApi = window.NukeFireMacros || {};
const clientCommandApi = window.NukeFireClientCommands || {};
const historyNavigationApi = window.NukeFireHistoryNavigation || {};
const tintinInputEditorApi = window.NukeFireTinTinInputEditor || {};
const displayTextApi = window.NukeFireDisplayText || {};
const promptDisplayApi = window.NukeFirePromptDisplay || {};
const pipelineDebugApi = window.NukeFirePipelineDebug || {};
const longSessionMonitorApi = window.NukeFireLongSessionMonitor || {};
const DEFAULT_PIPELINE_DEBUG = typeof pipelineDebugApi.normalizePipelineDebugSettings === 'function'
  ? pipelineDebugApi.normalizePipelineDebugSettings()
  : Object.freeze({ enabled: false, maxEntries: 200 });
const semanticControlsApi = window.NukeFireSemanticControls || {};
const highlightEngine = typeof highlightApi.HighlightEngine === 'function'
  ? new highlightApi.HighlightEngine()
  : null;
const substituteEngine = typeof substituteApi.SubstituteEngine === 'function'
  ? new substituteApi.SubstituteEngine()
  : null;
const macroEngine = typeof macroApi.MacroEngine === 'function'
  ? new macroApi.MacroEngine()
  : null;
function createSelfVoiceController() {
  return typeof selfVoiceApi.SelfVoiceController === 'function'
    ? new selfVoiceApi.SelfVoiceController({
        synth: window.speechSynthesis || null,
        Utterance: window.SpeechSynthesisUtterance || null
      })
    : null;
}
let selfVoice = createSelfVoiceController();
const readerTutorial = typeof readerOnboardingApi.ReaderTutorial === 'function'
  ? new readerOnboardingApi.ReaderTutorial()
  : null;
const audioCues = typeof audioCueApi.AudioCueController === 'function'
  ? new audioCueApi.AudioCueController()
  : null;
const soundTriggers = typeof soundTriggerApi.SoundTriggerEngine === 'function'
  ? new soundTriggerApi.SoundTriggerEngine()
  : null;
/* Keep sound playback and speech filtering independent.  The primary engine
 * always sees complete visible text so custom sound triggers still fire even
 * when SPEECH silences NukeFire Voice.  The shadow engine sees only the text
 * eligible for voice and applies the same per-trigger Self-Voice suppression. */
const speechSoundTriggers = typeof soundTriggerApi.SoundTriggerEngine === 'function'
  ? new soundTriggerApi.SoundTriggerEngine()
  : null;
let xtermAdapter = null;
let xtermInitializationBlocked = false;
let terminalFontMetricsRequest = 0;
const communicationChannels = communicationsApi.CHANNELS || Object.freeze([
  { id: 'all', label: 'All', availability: 'always' },
  { id: 'gossip', label: 'Gossip', availability: 'always' },
  { id: 'newbie', label: 'Newbie', availability: 'always' },
  { id: 'group', label: 'Group', availability: 'always' },
  { id: 'tell', label: 'Tell', availability: 'always' },
  { id: 'grats', label: 'Grats', availability: 'always' },
  { id: 'auction', label: 'Auction', availability: 'always' },
  { id: 'ssf', label: 'SSF', availability: 'advertised' },
  { id: 'bonejack', label: 'Bonejack', availability: 'detected' },
  { id: 'skynet', label: 'Skynet', availability: 'detected' },
  { id: 'system', label: 'System', availability: 'always' }
]);
const scheduleFrame = window.requestAnimationFrame?.bind(window) || ((callback) => setTimeout(callback, 0));

let sessionEventRenderBatchDepth = 0;
const sessionEventDeferredRenders = new Map();

function deferSessionEventRender(key, render) {
  if (sessionEventRenderBatchDepth <= 0) return false;
  sessionEventDeferredRenders.set(key, render);
  return true;
}

function flushSessionEventDeferredRenders() {
  if (sessionEventRenderBatchDepth > 0 || sessionEventDeferredRenders.size === 0) return;
  const renders = [...sessionEventDeferredRenders.values()];
  sessionEventDeferredRenders.clear();
  for (const render of renders) render();
}

function runSessionEventRenderBatch(callback) {
  sessionEventRenderBatchDepth += 1;
  try {
    return callback();
  } finally {
    sessionEventRenderBatchDepth -= 1;
    if (sessionEventRenderBatchDepth === 0) flushSessionEventDeferredRenders();
  }
}
const cancelFrame = window.cancelAnimationFrame?.bind(window) || clearTimeout;
const TERMINAL_IDLE_FLUSH_DELAY_MS = 2;
const HISTORY_LOW_WATER_RATIO = 0.875;
const CLIENT_COMMAND_PREFIXES = Object.freeze(['#', '~', '^', '/', '`', "'"]);
const DEFAULT_CLIENT_COMMAND_PREFIX = '#';


function normalizeClientCommandPrefix(value) {
  const source = String(value ?? '').normalize('NFKC').trim();
  return CLIENT_COMMAND_PREFIXES.includes(source) ? source : DEFAULT_CLIENT_COMMAND_PREFIX;
}

function isClientCommandText(commandValue) {
  const command = String(commandValue || '');
  const prefix = normalizeClientCommandPrefix(state.sessions.commandPrefix);
  return command.startsWith(prefix) && !command.startsWith(prefix.repeat(2));
}

function isHelpClientCommand(commandValue) {
  const command = String(commandValue || '').trimStart();
  const prefix = normalizeClientCommandPrefix(state.sessions.commandPrefix);
  if (!command.startsWith(prefix) || command.startsWith(prefix.repeat(2))) return false;
  const body = command.slice(prefix.length).trimStart();
  return /^help(?:\s|$)/iu.test(body);
}

function analyzeCommandLineText(commandValue) {
  const command = String(commandValue ?? '');
  const prefix = normalizeClientCommandPrefix(state.sessions.commandPrefix);
  const analyzeCommandLine = typeof clientCommandApi.analyzeCommandLine === 'function'
    ? clientCommandApi.analyzeCommandLine
    : window.nukefire?.analyzeCommandLine;
  if (typeof analyzeCommandLine === 'function') {
    try {
      const analysis = analyzeCommandLine(command, prefix, { maxCommands: 32 });
      if (analysis && typeof analysis === 'object') return analysis;
    } catch {
      // Fall through to the single-command compatibility path.
    }
  }
  const clientCommand = Boolean(command) && isClientCommandText(command);
  return {
    commands: [command],
    errorCode: '',
    hasClientCommands: clientCommand,
    hasServerCommands: !clientCommand,
    clientOnly: clientCommand
  };
}

function rewriteCommandListPrefix(value, previousPrefixValue, nextPrefixValue) {
  const source = String(value ?? '');
  const previousPrefix = normalizeClientCommandPrefix(previousPrefixValue);
  const nextPrefix = normalizeClientCommandPrefix(nextPrefixValue);
  if (!source || previousPrefix === nextPrefix) return source;

  let outputText = '';
  let depth = 0;
  let quote = '';
  let escaped = false;
  let commandStart = true;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (commandStart) {
      if (/\s/u.test(character)) {
        outputText += character;
        continue;
      }
      if (source.startsWith(previousPrefix.repeat(2), index)) {
        outputText += previousPrefix;
        index += previousPrefix.length * 2 - 1;
        commandStart = false;
        continue;
      }
      if (source.startsWith(previousPrefix, index)) {
        outputText += nextPrefix;
        index += previousPrefix.length - 1;
        commandStart = false;
        continue;
      }
      commandStart = false;
    }

    outputText += character;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    const previousCharacter = source[index - 1] || '';
    const singleQuoteCanOpen = character === "'"
      && (!previousCharacter || /[\s({\[]/u.test(previousCharacter))
      && source.indexOf("'", index + 1) !== -1;
    if (character === '"' || singleQuoteCanOpen) {
      quote = character;
      continue;
    }
    if (character === '{') {
      depth += 1;
      continue;
    }
    if (character === '}' && depth > 0) {
      depth -= 1;
      continue;
    }
    if (character === ';' && depth === 0) commandStart = true;
  }

  return outputText;
}

const OUTPUT_STYLE_KEYS = Object.freeze([
  'fg', 'bg', 'fgBasicIndex', 'bgBasicIndex',
  'bold', 'dim', 'italic', 'underline', 'inverse'
]);
const MAX_TERMINAL_RUN_CHARACTERS = Number(sessionRuntimeApi.MAX_OUTPUT_RUN_CHARACTERS) || 32_768;


const TERMINAL_THEMES = Object.freeze({
  nukefire: Object.freeze({
    label: 'NukeFire',
    foreground: '#d3d7dc',
    background: '#050607',
    monochrome: false
  }),
  amber: Object.freeze({
    label: 'Amber CRT',
    foreground: '#ffb000',
    background: '#000000',
    monochrome: false
  }),
  green: Object.freeze({
    label: 'Green CRT',
    foreground: '#33ff66',
    background: '#000000',
    monochrome: false
  }),
  ice: Object.freeze({
    label: 'Ice Blue',
    foreground: '#8ad8ff',
    background: '#00070b',
    monochrome: false
  })
});

const DEFAULT_TERMINAL_THEME = TERMINAL_THEMES.nukefire;
const TERMINAL_THEME_STORAGE_VERSION = '2';
const INTERFACE_BRIGHTNESS_MODES = Object.freeze(['dark', 'brighter', 'high-contrast']);
const DEFAULT_INTERFACE_BRIGHTNESS = 'brighter';

const UI_FONT_FAMILIES = Object.freeze({
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  arial: 'Arial, Helvetica, sans-serif',
  verdana: 'Verdana, Geneva, sans-serif',
  tahoma: 'Tahoma, Verdana, sans-serif',
  trebuchet: '"Trebuchet MS", Arial, sans-serif',
  atkinson: '"Atkinson Hyperlegible", Arial, sans-serif',
  opendyslexic: 'OpenDyslexic, Arial, sans-serif'
});
const TERMINAL_FONT_FAMILIES = Object.freeze({
  menlo: 'Menlo, Monaco, "Courier New", monospace',
  monaco: 'Monaco, Menlo, "Courier New", monospace',
  consolas: 'Consolas, "Courier New", monospace',
  courier: '"Courier New", Courier, monospace',
  'system-mono': 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fixedsys: '"Fixedsys Excelsior", "Fixedsys Excelsior 3.01", "Courier New", monospace',
  maple: '"Maple Mono", "Maple Mono NF", "JetBrains Mono", monospace',
  'maple-nl': '"Maple Mono NL", "Maple Mono Normal NL", "Maple Mono", monospace',
  jetbrains: '"JetBrains Mono", "JetBrainsMono Nerd Font", Consolas, monospace',
  'fira-code': '"Fira Code", "FiraCode Nerd Font", Consolas, monospace',
  hack: 'Hack, "Hack Nerd Font", Consolas, monospace',
  'source-code-pro': '"Source Code Pro", "SauceCodePro Nerd Font", Consolas, monospace',
  terminus: 'Terminus, "Terminus (TTF)", "Courier New", monospace',
  inconsolata: 'Inconsolata, "Inconsolata Nerd Font", monospace',
  cascadia: '"Cascadia Mono", "Cascadia Code", Consolas, monospace',
  'ibm-plex': '"IBM Plex Mono", "Source Code Pro", Consolas, monospace',
  'ubuntu-mono': '"Ubuntu Mono", "DejaVu Sans Mono", Consolas, monospace',
  'lucida-console': '"Lucida Console", Consolas, "Courier New", monospace'
});
const TERMINAL_FONT_SIZE_MIN = 12;
const TERMINAL_FONT_SIZE_MAX = 28;
const TERMINAL_FONT_SIZE_DEFAULT = 16;
const DEFAULT_DISPLAY_COMPONENTS = Object.freeze({
  groupVitals: true,
  mapperExits: true,
  gpsNavigator: true,
  mapperMap: true,
  mapperRoomInfo: true
});
const DEFAULT_DISPLAY_TEXT = Object.freeze(
  displayTextApi.DEFAULT_DISPLAY_TEXT || { panelLabels: 'full', mapperRoomLabels: 'status' }
);
const DEFAULT_PROMPT_DISPLAY_MODE = promptDisplayApi.DEFAULT_PROMPT_DISPLAY_MODE || 'inline';
const DEFAULT_VITAL_DISPLAY = Object.freeze({
  mainMode: 'values-percent',
  groupMode: 'values-percent',
  numberSize: 'standard',
  hideSelfInGroup: true
});
const MAX_CUSTOM_QUICK_KEYS = 24;
const DEFAULT_QUICK_COMMANDS = Object.freeze([
  Object.freeze({ id: 'look', label: 'Look', command: 'look' }),
  Object.freeze({ id: 'score', label: 'Score', command: 'score' }),
  Object.freeze({ id: 'inventory', label: 'Inventory', command: 'inventory' }),
  Object.freeze({ id: 'equipment', label: 'Equipment', command: 'equipment' }),
  Object.freeze({ id: 'who', label: 'Who', command: 'who' }),
  Object.freeze({ id: 'newbie-help', label: 'Newbie Help', command: 'help newbie' })
]);
const DEFAULT_QUICK_COMMAND_IDS = new Set(DEFAULT_QUICK_COMMANDS.map((record) => record.id));

const SIDE_DOCK_REGIONS = Object.freeze(['left', 'right', 'outer-right']);
const DOCK_REGIONS = Object.freeze([...SIDE_DOCK_REGIONS, 'bottom']);

const SIDEBAR_PANELS = Object.freeze([
  Object.freeze({ id: 'vitals', label: 'Vitals', selector: '#panel-vitals' }),
  Object.freeze({ id: 'sessionVitals', label: 'Session Vitals', selector: '#panel-session-vitals' }),
  Object.freeze({ id: 'affects', label: 'Affects', selector: '#panel-affects' }),
  Object.freeze({ id: 'mobInspector', label: 'Mob Inspector', selector: '#panel-mob-inspector' }),
  Object.freeze({ id: 'lootHistory', label: 'Loot History', selector: '#panel-loot-history' }),
  Object.freeze({ id: 'foundlist', label: 'Foundlist / Upgrades', selector: '#panel-foundlist' }),
  Object.freeze({ id: 'quickCommands', label: 'Quick Commands', selector: '#panel-quick-commands' }),
  Object.freeze({ id: 'liveState', label: 'NukeFire State', selector: '#panel-live-state' }),
  Object.freeze({ id: 'protocol', label: 'Protocol', selector: '#panel-protocol' }),
  Object.freeze({ id: 'communications', label: 'Communications', selector: '#panel-communications' }),
  Object.freeze({ id: 'contextDeck', label: 'NukeFire Console', selector: '#panel-context-deck' }),
  Object.freeze({ id: 'mapper', label: 'Mapper', selector: '#panel-mapper' })
]);

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


const COMMUNICATION_CHANNEL_IDS = Object.freeze(communicationChannels.map((channel) => channel.id));
const COMMUNICATION_MESSAGE_ORDERS = Object.freeze(['newest-top', 'newest-bottom']);
const DEFAULT_COMMUNICATION_PREFERENCES = Object.freeze({
  activeChannel: 'all',
  messageOrder: 'newest-top'
});
const POPOUT_PANEL_IDS = Object.freeze(
  Array.isArray(panelWindowsApi.POPOUT_PANEL_IDS)
    ? [...panelWindowsApi.POPOUT_PANEL_IDS]
    : SIDEBAR_PANELS.map((panel) => panel.id)
);
const PANEL_WINDOW_DEFINITIONS = panelWindowsApi.PANEL_WINDOW_DEFINITIONS || Object.freeze(
  Object.fromEntries(SIDEBAR_PANELS.map((panel) => [panel.id, Object.freeze({
    label: panel.label,
    subtitle: `Live ${panel.label} panel`,
    bounds: Object.freeze({ x: null, y: null, width: 680, height: 560 })
  })]))
);
const DEFAULT_POPOUTS = panelWindowsApi.DEFAULT_POPOUTS || Object.freeze(
  Object.fromEntries(POPOUT_PANEL_IDS.map((panelId) => [panelId, Object.freeze({
    open: false,
    bounds: PANEL_WINDOW_DEFINITIONS[panelId]?.bounds || Object.freeze({ x: null, y: null, width: 680, height: 560 })
  })]))
);
const MAX_COMMUNICATION_MESSAGES = 500;
const COMMUNICATION_DEDUPE_WINDOW_MS = 2000;

// Persisted dock sizes use generous safety ceilings. The live maximum is still
// calculated from the actual workspace so the terminal always retains its
// minimum review area when the client moves between small and very large screens.
const DOCK_SIZE_LIMITS = Object.freeze({
  left: Object.freeze({ minimum: 170, maximum: 4096 }),
  right: Object.freeze({ minimum: 170, maximum: 4096 }),
  'outer-right': Object.freeze({ minimum: 170, maximum: 4096 }),
  bottom: Object.freeze({ minimum: 130, maximum: 2160 })
});

const DEFAULT_DOCK_SIZES = Object.freeze({
  left: 220,
  right: 300,
  'outer-right': 260,
  bottom: 170
});

const LAYOUT_GALLERY_ITEMS = Object.freeze([
  Object.freeze({
    id: 'my-layout',
    label: 'My Layout',
    description: 'Your own workspace; always the safe way back.'
  }),
  Object.freeze({
    id: 'terminal-only',
    label: 'Terminal Only',
    description: 'No panes. Maximum room for the terminal.',
    panels: Object.freeze(Object.fromEntries(SIDEBAR_PANELS.map((panel) => [panel.id, false]))),
    layout: DEFAULT_PANEL_LAYOUT,
    dockSizes: DEFAULT_DOCK_SIZES
  }),
  Object.freeze({
    id: 'classic',
    label: 'Classic',
    description: 'Traditional terminal with the standard side panes.',
    panels: DEFAULT_PANEL_VISIBILITY,
    layout: DEFAULT_PANEL_LAYOUT,
    dockSizes: DEFAULT_DOCK_SIZES
  }),
  Object.freeze({
    id: 'mapper-focus',
    label: 'Mapper Focus',
    description: 'Wide terminal with Mapper and Console on the right.',
    panels: Object.freeze({
      vitals: false, sessionVitals: false, affects: false, quickCommands: false,
      liveState: false, protocol: false, communications: false, contextDeck: true, mapper: true
    }),
    layout: DEFAULT_PANEL_LAYOUT,
    dockSizes: Object.freeze({ ...DEFAULT_DOCK_SIZES, right: 360 })
  }),
  Object.freeze({
    id: 'combat',
    label: 'Combat',
    description: 'Affects left; Vitals and crew health on the right.',
    panels: Object.freeze({
      vitals: true, sessionVitals: true, affects: true, quickCommands: false,
      liveState: false, protocol: false, communications: false, contextDeck: false, mapper: false
    }),
    layout: DEFAULT_PANEL_LAYOUT,
    dockSizes: Object.freeze({ ...DEFAULT_DOCK_SIZES, left: 190, right: 250 })
  }),
  Object.freeze({
    id: 'communications',
    label: 'Communications',
    description: 'Terminal above a dedicated communications strip.',
    panels: Object.freeze({
      vitals: false, sessionVitals: false, affects: false, quickCommands: false,
      liveState: false, protocol: false, communications: true, contextDeck: false, mapper: false
    }),
    layout: Object.freeze({ ...DEFAULT_PANEL_LAYOUT, communications: Object.freeze({ region: 'bottom', order: 0 }) }),
    dockSizes: Object.freeze({ ...DEFAULT_DOCK_SIZES, bottom: 190 })
  }),
  Object.freeze({
    id: 'field-ops',
    label: 'Field Ops',
    description: 'Affects left; Map/GPS and Vitals together; Communications far right.',
    panels: Object.freeze({
      vitals: true, sessionVitals: false, affects: true, quickCommands: false,
      liveState: false, protocol: false, communications: true, contextDeck: false, mapper: true
    }),
    layout: Object.freeze({
      ...DEFAULT_PANEL_LAYOUT,
      affects: Object.freeze({ region: 'left', order: 0 }),
      mapper: Object.freeze({ region: 'right', order: 0 }),
      vitals: Object.freeze({ region: 'right', order: 1 }),
      communications: Object.freeze({ region: 'outer-right', order: 0 })
    }),
    dockSizes: Object.freeze({ ...DEFAULT_DOCK_SIZES, left: 180, right: 330, 'outer-right': 260 }),
    displayComponents: Object.freeze({ ...DEFAULT_DISPLAY_COMPONENTS, gpsNavigator: true, mapperMap: true, mapperRoomInfo: true })
  }),
  Object.freeze({
    id: 'field-ops-crew',
    label: 'Field Ops + Crew',
    description: 'Field Ops with crew vitals stacked beneath your own.',
    panels: Object.freeze({
      vitals: true, sessionVitals: true, affects: true, quickCommands: false,
      liveState: false, protocol: false, communications: true, contextDeck: false, mapper: true
    }),
    layout: Object.freeze({
      ...DEFAULT_PANEL_LAYOUT,
      affects: Object.freeze({ region: 'left', order: 0 }),
      mapper: Object.freeze({ region: 'right', order: 0 }),
      vitals: Object.freeze({ region: 'right', order: 1 }),
      sessionVitals: Object.freeze({ region: 'right', order: 2 }),
      communications: Object.freeze({ region: 'outer-right', order: 0 })
    }),
    dockSizes: Object.freeze({ ...DEFAULT_DOCK_SIZES, left: 180, right: 340, 'outer-right': 280 }),
    displayComponents: Object.freeze({ ...DEFAULT_DISPLAY_COMPONENTS, gpsNavigator: true, mapperMap: true, mapperRoomInfo: true })
  }),
  Object.freeze({
    id: 'compact-ops',
    label: 'Compact Ops',
    description: 'The same field layout with slimmer side docks for more terminal.',
    panels: Object.freeze({
      vitals: true, sessionVitals: false, affects: true, quickCommands: false,
      liveState: false, protocol: false, communications: true, contextDeck: false, mapper: true
    }),
    layout: Object.freeze({
      ...DEFAULT_PANEL_LAYOUT,
      affects: Object.freeze({ region: 'left', order: 0 }),
      mapper: Object.freeze({ region: 'right', order: 0 }),
      vitals: Object.freeze({ region: 'right', order: 1 }),
      communications: Object.freeze({ region: 'outer-right', order: 0 })
    }),
    dockSizes: Object.freeze({ ...DEFAULT_DOCK_SIZES, left: 170, right: 285, 'outer-right': 220 }),
    displayComponents: Object.freeze({ ...DEFAULT_DISPLAY_COMPONENTS, gpsNavigator: true, mapperMap: true, mapperRoomInfo: true })
  })
]);
const LAYOUT_GALLERY_ROTATION_MS = 7000;

const MINIMUM_TERMINAL_WIDTH = 560;
const MINIMUM_TERMINAL_HEIGHT = 220;
const DOCK_RESIZER_SIZE = 7;
const MAPPER_CANVAS_HEIGHT_MIN = Number(mapperApi.MAPPER_CANVAS_HEIGHT_MIN) || 220;
const MAPPER_CANVAS_HEIGHT_MAX = Number(mapperApi.MAPPER_CANVAS_HEIGHT_MAX) || 1600;
const MAPPER_CANVAS_HEIGHT_DEFAULT = Number(mapperApi.MAPPER_CANVAS_HEIGHT_DEFAULT) || 360;
const MAPPER_VIEWBOX_WIDTH = 600;
const MAPPER_VIEWBOX_HEIGHT = 420;
const MAPPER_VIEWBOX_CENTER_X = MAPPER_VIEWBOX_WIDTH / 2;
const MAPPER_VIEWBOX_CENTER_Y = MAPPER_VIEWBOX_HEIGHT / 2;
const MAPPER_VIEWPORT_MARGIN = 42;

const workspaceRoot = $('#workspace');
const dockElements = Object.freeze({
  left: $('#dock-left'),
  right: $('#dock-right'),
  'outer-right': $('#dock-outer-right'),
  bottom: $('#dock-bottom')
});
const dockResizerElements = Object.freeze({
  left: $('#resize-left-dock'),
  right: $('#resize-right-dock'),
  'outer-right': $('#resize-outer-right-dock'),
  bottom: $('#resize-bottom-dock')
});

function emptySessionTinTinState() {
  return {
    aliases: [],
    variables: [],
    functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    tabs: [],
    events: { enabled: true, definitions: [] },
    config: { logMode: 'plain', commandEcho: false, autoTab: 0, verbatim: false, repeatChar: '!', repeatEnter: false, verbatimChar: '\\', historySize: 2000, bufferSize: 5000 },
    classes: { activeStack: [], definitions: [] },
    speedwalk: { enabled: true },
    profile: { requested: '', filename: '', loaded: false }
  };
}

function normalizeSessionTinTinState(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const empty = emptySessionTinTinState();
  return {
    aliases: Array.isArray(source.aliases) ? structuredCloneSafe(source.aliases) : empty.aliases,
    variables: Array.isArray(source.variables) ? structuredCloneSafe(source.variables) : empty.variables,
    functions: Array.isArray(source.functions) ? structuredCloneSafe(source.functions) : empty.functions,
    actions: source.actions && typeof source.actions === 'object'
      ? structuredCloneSafe(source.actions) : empty.actions,
    gags: source.gags && typeof source.gags === 'object'
      ? structuredCloneSafe(source.gags) : empty.gags,
    highlights: source.highlights && typeof source.highlights === 'object'
      ? structuredCloneSafe(source.highlights) : empty.highlights,
    substitutes: source.substitutes && typeof source.substitutes === 'object'
      ? structuredCloneSafe(source.substitutes) : empty.substitutes,
    macros: source.macros && typeof source.macros === 'object'
      ? structuredCloneSafe(source.macros) : empty.macros,
    tabs: Array.isArray(source.tabs) ? structuredCloneSafe(source.tabs) : empty.tabs,
    events: source.events && typeof source.events === 'object'
      ? structuredCloneSafe(source.events) : empty.events,
    config: {
      logMode: ['plain','raw'].includes(String(source.config?.logMode || '').toLowerCase()) ? String(source.config.logMode).toLowerCase() : 'plain',
      commandEcho: source.config?.commandEcho === true,
      autoTab: Number.isSafeInteger(Number(source.config?.autoTab)) && Number(source.config.autoTab) >= 1 && Number(source.config.autoTab) <= 999999 ? Number(source.config.autoTab) : 0,
      verbatim: source.config?.verbatim === true,
      repeatChar: [...String(source.config?.repeatChar || '!')][0] || '!',
      repeatEnter: source.config?.repeatEnter === true,
      verbatimChar: [...String(source.config?.verbatimChar || '\\')][0] || '\\',
      historySize: Number.isSafeInteger(Number(source.config?.historySize)) && Number(source.config.historySize) >= 0 && Number(source.config.historySize) <= 9999 ? Number(source.config.historySize) : 2000,
      bufferSize: Number.isSafeInteger(Number(source.config?.bufferSize)) && Number(source.config.bufferSize) >= 100 && Number(source.config.bufferSize) <= 100000 ? Number(source.config.bufferSize) : 5000
    },
    classes: source.classes && typeof source.classes === 'object'
      ? structuredCloneSafe(source.classes) : empty.classes,
    speedwalk: source.speedwalk && typeof source.speedwalk === 'object'
      ? { enabled: source.speedwalk.enabled === true }
      : empty.speedwalk,
    profile: {
      requested: String(source.profile?.requested || '').trim().slice(0, 255),
      filename: String(source.profile?.filename || '').trim().slice(0, 255),
      loaded: source.profile?.loaded === true
    }
  };
}

const persistentTinTinSnapshotCache = new WeakMap();

function activeTinTinReferenceState() {
  return {
    aliases: state.sessions.aliases,
    variables: state.sessions.variables,
    functions: state.sessions.functions,
    actions: state.sessions.actions,
    gags: state.sessions.gags,
    highlights: state.sessions.highlights,
    substitutes: state.sessions.substitutes,
    macros: state.sessions.macros,
    tabs: state.sessions.tabs,
    events: state.sessions.events,
    config: state.sessions.config,
    classes: state.sessions.classes,
    speedwalk: state.sessions.speedwalk
  };
}

function activeTinTinReferencesMatch(record) {
  const refs = record?.activeTinTinRefs;
  if (!refs) return false;
  const active = activeTinTinReferenceState();
  return Object.keys(active).every((key) => refs[key] === active[key]);
}

function rememberActiveTinTinReferences(record) {
  if (!record) return;
  record.activeTinTinRefs = activeTinTinReferenceState();
}

function persistenceTinTinSnapshot(record, options = {}) {
  const source = record?.tintin || emptySessionTinTinState();
  if (options.reuse !== true || !source || typeof source !== 'object') {
    return structuredCloneSafe(source);
  }
  const cached = persistentTinTinSnapshotCache.get(source);
  if (cached) return cached;
  const snapshot = structuredCloneSafe(source);
  persistentTinTinSnapshotCache.set(source, snapshot);
  return snapshot;
}

function createSessionTinTinEngines(tintin = emptySessionTinTinState()) {
  const engines = {
    highlight: typeof highlightApi.HighlightEngine === 'function'
      ? new highlightApi.HighlightEngine() : null,
    substitute: typeof substituteApi.SubstituteEngine === 'function'
      ? new substituteApi.SubstituteEngine() : null,
    macro: typeof macroApi.MacroEngine === 'function'
      ? new macroApi.MacroEngine() : null
  };
  engines.highlight?.restore?.(tintin.highlights);
  engines.substitute?.restore?.(tintin.substitutes);
  engines.macro?.restore?.(tintin.macros);
  return engines;
}

function applyTinTinStateToRecord(record, input = {}, options = {}) {
  if (!record) return emptySessionTinTinState();
  record.tintin = options.normalized === true ? input : normalizeSessionTinTinState(input);
  if (!record.tintinEngines) record.tintinEngines = createSessionTinTinEngines(record.tintin);
  record.tintinEngines.highlight?.restore?.(record.tintin.highlights);
  record.tintinEngines.substitute?.restore?.(record.tintin.substitutes);
  record.tintinEngines.macro?.restore?.(record.tintin.macros);
  return record.tintin;
}

function applyActiveTinTinState(record) {
  const tintin = applyTinTinStateToRecord(record, record?.tintin || {}, { normalized: Boolean(record?.tintin) });
  state.sessions.aliases = structuredCloneSafe(tintin.aliases);
  state.sessions.variables = structuredCloneSafe(tintin.variables);
  state.sessions.functions = structuredCloneSafe(tintin.functions);
  state.sessions.actions = structuredCloneSafe(tintin.actions);
  state.sessions.gags = structuredCloneSafe(tintin.gags);
  state.sessions.highlights = structuredCloneSafe(tintin.highlights);
  state.sessions.substitutes = structuredCloneSafe(tintin.substitutes);
  state.sessions.macros = structuredCloneSafe(tintin.macros);
  state.sessions.tabs = structuredCloneSafe(tintin.tabs);
  state.sessions.events = structuredCloneSafe(tintin.events);
  state.sessions.config = structuredCloneSafe(tintin.config);
  state.sessions.classes = structuredCloneSafe(tintin.classes);
  state.sessions.speedwalk = structuredCloneSafe(tintin.speedwalk);
  highlightEngine?.restore?.(state.sessions.highlights);
  substituteEngine?.restore?.(state.sessions.substitutes);
  macroEngine?.restore?.(state.sessions.macros);
  rememberActiveTinTinReferences(record);
  return tintin;
}

function sessionDisplayEngines(record = activeSessionRecord()) {
  if (!record) return { highlight: highlightEngine, substitute: substituteEngine, macro: macroEngine };
  if (!record.tintinEngines) record.tintinEngines = createSessionTinTinEngines(record.tintin);
  return record.id === state.sessions.activeId
    ? { highlight: highlightEngine, substitute: substituteEngine, macro: macroEngine }
    : record.tintinEngines;
}

const state = {
  connected: false,
  connectionBarCollapsed: false,
  remoteEcho: false,
  history: [],
  historyIndex: null,
  historyPrefix: '',
  draft: '',
  tintinCompletion: { key: '', prefix: '', original: '', candidates: [], index: -1 },
  tintinHistorySearch: { query: '', index: null, draft: '' },
  lines: 0,
  plainText: '',
  readerCarry: '',
  lastCompleteLine: '',
  promptBoundaryCount: 0,
  announcementSerial: 0,
  lastReviewedText: '',
  terminalSizeFrame: null,
  uiFont: 'system',
  terminalFont: 'menlo',
  interfaceBrightness: DEFAULT_INTERFACE_BRIGHTNESS,
  settingsSaveTimer: null,
  settingsSaveInFlight: false,
  settingsSaveQueued: false,
  settingsSaveDirty: false,
  sessionTabsFrame: null,
  protocolCountersTimer: null,
  settingsReady: false,
  preferencesReturnFocus: null,
  preferencesCategory: 'display',
  disconnectModal: { open: false, returnFocus: null },
  closeSessionModal: { open: false, returnFocus: null, sessionId: '' },
  quickKeys: [],
  quickKeyEditId: '',
  tintinImport: { analysis: null, undoSnapshot: null, scriptFiles: [], scriptsDirectory: '', destinationReady: false, destinationDefinitions: null, destinationIncludes: [], destinationFileContent: '', destinationAnalysisError: '' },
  definitionManager: { open: false, category: 'aliases', selectedKey: '', mode: '', returnFocus: null, draft: null },
  clientPresets: { imported: [], previewSnapshot: null, previewSoundpackId: '', previewPresetId: '' },
  tintinStartup: { enabled: false, filename: 'main.tin', loaded: false, loadedFilename: '', totalLoaded: 0, unsupported: 0, definitions: null },
  hiddenDefaultQuickCommands: [],
  keybindings: typeof keybindingApi.normalizeKeybindingSettings === 'function'
    ? keybindingApi.normalizeKeybindingSettings()
    : { enabled: true, bindings: [] },
  keybindingEditor: { open: false, editId: '', recording: false, captured: null, conflictId: '', semanticType: 'raw', semanticId: '' },
  soundTriggerEditor: { open: false, editId: '' },
  displayComponents: { ...DEFAULT_DISPLAY_COMPONENTS },
  displayText: { ...DEFAULT_DISPLAY_TEXT },
  promptDisplayMode: DEFAULT_PROMPT_DISPLAY_MODE,
  affectsDisplayMode: 'complete',
  paginationPending: false,
  maxCharacters: 2_000_000,
  terminalRender: {
    pendingRuns: [],
    frame: null,
    idleFlushTimer: null,
    pendingBatches: 0,
    pendingCharacters: 0,
    followRequested: false,
    atLiveBottom: true,
    flushCount: 0,
    lastLineCount: null,
    deferredLineBreak: null,
    diagnostics: {
      lastFlushAt: 0,
      continuousGapSamples: 0,
      continuousGapLastMs: 0,
      continuousGapMaxMs: 0,
      continuousGapTotalMs: 0,
      flushCharactersLast: 0,
      flushCharactersMax: 0,
      flushCharactersTotal: 0,
      measuredFlushes: 0
    }
  },
  gmcp: null,
  protocol: {
    gmcpMessages: 0,
    terminalType: '',
    charset: '',
    windowSize: null,
    newEnvironment: null
  },
  transport: {
    compressionEnabled: true
  },
  accessibility: {
    screenReaderMode: false,
    readerWorkspaceEnabled: false,
    readerWorkspaceSuppressedPopouts: new Set(),
    selfVoiceEnabled: false,
    selfVoiceMuted: false,
    selfVoiceForegroundOnly: true,
    selfVoiceAppForeground: true,
    selfVoiceFollowMode: false,
    selfVoiceInterruptOnCommand: false,
    selfVoiceGovernorEnabled: true,
    selfVoicePriorityAlertsEnabled: true,
    readerSafetyAlertsEnabled: true,
    selfVoiceRate: 1,
    selfVoicePitch: 1,
    selfVoiceVolume: 1,
    selfVoiceVoiceId: '',
    vitalSpeechMode: 'percent-values',
    audioCuesEnabled: false,
    audioCuesMuted: false,
    audioCuesForegroundOnly: true,
    audioCuesVolume: 0.65,
    soundpackId: 'builtin',
    soundpacks: [],
    soundpackInvalid: [],
    soundpackEvents: [],
    soundpackDisabledEvents: [],
    communicationCues: { tell: false, auction: false, gossip: false, skynet: false, ssf: false, background: false },
    announceImportant: true
  },
  readerOnboarding: {
    seen: false,
    tutorialCompleted: false
  },
  sessions: {
    commandPrefix: DEFAULT_CLIENT_COMMAND_PREFIX,
    activeId: '',
    order: [],
    records: {},
    groups: {},
    aliases: [],
    variables: [],
    functions: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    tabs: [],
    events: { enabled: true, definitions: [] },
    config: { logMode: 'plain', commandEcho: false, autoTab: 0, verbatim: false, repeatChar: '!', repeatEnter: false, verbatimChar: '\\', historySize: 2000, bufferSize: 5000 },
    classes: { activeStack: [], definitions: [] },
    speedwalk: { enabled: false },
    ready: false
  },
  workspace: {
    sharedCrewWorkspace: false,
    defaultPanels: { ...DEFAULT_PANEL_VISIBILITY },
    defaultLayout: structuredCloneSafe(DEFAULT_PANEL_LAYOUT),
    defaultDockSizes: { ...DEFAULT_DOCK_SIZES },
    defaultPanelHeights: {},
    lastCharacterKey: '',
    lastCharacterName: '',
    defaultTabGroups: { ...DEFAULT_TAB_GROUPS },
    defaultActiveTabs: { ...DEFAULT_ACTIVE_TABS },
    defaultCommunications: { ...DEFAULT_COMMUNICATION_PREFERENCES },
    defaultPopouts: structuredCloneSafe(DEFAULT_POPOUTS),
    characters: {},
    currentCharacterKey: '',
    currentCharacterName: '',
    activePanels: { ...DEFAULT_PANEL_VISIBILITY },
    activeLayout: structuredCloneSafe(DEFAULT_PANEL_LAYOUT),
    activeDockSizes: { ...DEFAULT_DOCK_SIZES },
    activeTabGroups: { ...DEFAULT_TAB_GROUPS },
    activeTabs: { ...DEFAULT_ACTIVE_TABS },
    activeCommunications: { ...DEFAULT_COMMUNICATION_PREFERENCES },
    activePopouts: structuredCloneSafe(DEFAULT_POPOUTS),
    effectiveDockSizes: { ...DEFAULT_DOCK_SIZES },
    openMenuPanelId: '',
    resizeSession: null,
    panelDragSession: null,
    layoutGallery: { index: 0, timer: null, paused: false, appForeground: false, returnSnapshot: null, appliedPresetId: '' }
  },
  communications: {
    messages: [],
    unread: Object.fromEntries(COMMUNICATION_CHANNEL_IDS.filter((id) => id !== 'all').map((id) => [id, 0])),
    nextId: 1,
    review: typeof communicationsReviewApi.CommunicationReviewCursor === 'function'
      ? new communicationsReviewApi.CommunicationReviewCursor()
      : null,
    lineBuffer: typeof communicationsApi.CommunicationLineBuffer === 'function'
      ? new communicationsApi.CommunicationLineBuffer()
      : { push: () => [], flush: () => [], reset: () => {} },
    lastTell: null,
    followLiveEdge: true
  },
  mapper: {
    ready: false,
    graph: typeof mapperApi.MapperGraph === 'function' ? new mapperApi.MapperGraph() : null,
    saveTimer: null,
    saveInFlight: false,
    saveQueued: false,
    saveDirty: false,
    pendingMove: null,
    pendingMoves: [],
    movementRoomsSincePrompt: 0,
    lastRoomId: '',
    liveSnapshot: null,
    liveSignature: '',
    liveStateReady: false,
    liveRoomIndex: new Map(),
    liveLinksByRoom: new Map(),
    liveDirectedLinkIndex: new Map(),
    visitedCache: null,
    gpsCatalogAnnouncementVersion: 0,
    movementWatch: null,
    deferredPackets: [],
    deferredPacketTimer: null,
    renderFrame: null,
    wheelFrame: null,
    wheelFactor: 1,
    wheelAnchor: null,
    drag: null,
    resizeSession: null,
    hoverRoomId: '',
    statusMessage: '',
    renderDirty: false,
    route: {
      active: false,
      targetId: '',
      currentRoomId: '',
      expectedRoomId: '',
      awaiting: false,
      roomConfirmed: false,
      mapConfirmed: false,
      stepsCompleted: 0,
      totalSteps: 0,
      timer: null,
      status: 'No client route is active.',
      kind: 'idle'
    }
  },
  affects: {
    snapshot: typeof affectsApi.normalizeAffectsState === 'function'
      ? affectsApi.normalizeAffectsState({})
      : { schema: 1, revision: 0, serverTime: 0, effects: [] },
    receivedAtMs: 0,
    signature: '',
    renderSignature: '',
    renderDirty: false,
    timer: null,
    expandedKeys: [],
    lastAnnouncedRevision: 0
  },
  lootHistory: { events: [], filter: 'all', nextId: 1, visibleLimit: 250 },
  foundlist: { filter: 'all' },
  mobInspector: {
    snapshot: typeof mobInspectorApi.normalizeMobInfo === 'function'
      ? mobInspectorApi.normalizeMobInfo({})
      : { schema: 1, trigger: 'request', mob: { vnum: 0, name: 'Unknown creature', flags: {} }, affects: { effects: [] } },
    receivedAtMs: 0,
    signature: '',
    roomId: '',
    mode: 'expanded',
    lastOpponentKey: '',
    combatRefreshKey: '',
    liveHealthSignature: '',
    lastTargetAffectsRequestMs: 0,
    pendingCombatKillRefresh: false,
    lastCombatKillRefreshMs: 0,
    renderDirty: false,
    summaryIdentityText: '',
    summaryConsiderText: '',
    effectGroupCount: 0,
    autoOpen: localStorage.getItem('nukefire.mobInspectorAutoOpen') !== 'false'
  },
  contextDeck: {
    snapshot: typeof contextApi.normalizeContextState === 'function'
      ? contextApi.normalizeContextState({})
      : { schema: 1, room: 0, zone: 0, contexts: [] },
    lastPrimaryId: '',
    signature: '',
    renderDirty: false,
    refreshTimer: null
  },
  knowledge: {
    controller: typeof knowledgeApi.KnowledgeController === 'function'
      ? new knowledgeApi.KnowledgeController()
      : null,
    open: false,
    returnFocus: null,
    debounceTimer: null,
    selectedIndex: -1,
    loading: false,
    loadingMore: false,
    activeDomain: 'all'
  },
  terminalTheme: {
    preset: 'nukefire',
    foreground: DEFAULT_TERMINAL_THEME.foreground,
    background: DEFAULT_TERMINAL_THEME.background,
    monochrome: DEFAULT_TERMINAL_THEME.monochrome
  },
  vitals: {
    hp: null, maxHp: null,
    mana: null, maxMana: null,
    move: null, maxMove: null
  },
  vitalDisplay: { ...DEFAULT_VITAL_DISPLAY }
};

const longSessionMonitor = typeof longSessionMonitorApi.LongSessionMonitor === 'function'
  ? new longSessionMonitorApi.LongSessionMonitor({ onSample: () => renderLongSessionMonitor() })
  : null;

const panelPopoutControlMaps = new Map();
const panelPopoutPublishFrames = new Map();
const panelPopoutObservers = new Map();
let panelPopoutRevision = 0;
let opponentVitalsRenderSignature = '';
const combatVitalsModelCache = new WeakMap();
const COMBAT_VITAL_SCALAR_KEYS = Object.freeze(['hp', 'maxHp', 'mana', 'maxMana', 'move', 'maxMove']);
let groupVitalsRenderSignature = '';
const UNSET_GROUP_SOURCE = Symbol('unset-group-source');
let groupVitalsRenderSource = UNSET_GROUP_SOURCE;
let groupCombatStateSource = UNSET_GROUP_SOURCE;
let groupCombatStateCache = null;
let mobInspectorCombatContextSnapshot = null;
let mobInspectorCombatContextOpponent = null;
let mobInspectorCombatContextGroupSource = UNSET_GROUP_SOURCE;
let mobInspectorCombatContextCache = null;
let mobInspectorEngagedGroupSource = UNSET_GROUP_SOURCE;
let mobInspectorEngagedOpponentKey = '';
let mobInspectorEngagedCountCache = 0;
let affectsCountdownEntries = [];
let gpsOptionsCatalogRef = null;
let gpsOptionsQuery = '';
let gpsOptionsFilteredItems = [];
let gpsOptionsFilteredIndexes = new Set();
let gpsLookupItemsRef = null;
let gpsLookupByIndex = new Map();
let gpsLookupByRoom = new Map();
let gpsLookupByName = new Map();

function isXtermActive() {
  return Boolean(xtermAdapter?.ready);
}

function normalizeFontChoice(value, choices, fallback) {
  const clean = String(value || '').trim().toLowerCase();
  return Object.hasOwn(choices, clean) ? clean : fallback;
}

function normalizeTerminalFontSize(value, fallback = TERMINAL_FONT_SIZE_DEFAULT) {
  const numeric = Math.round(Number(value));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(TERMINAL_FONT_SIZE_MIN, Math.min(TERMINAL_FONT_SIZE_MAX, numeric));
}

function scheduleFontMetricsFit() {
  const request = ++terminalFontMetricsRequest;
  const size = normalizeTerminalFontSize($('#font-size')?.value);
  const family = TERMINAL_FONT_FAMILIES[state.terminalFont] || TERMINAL_FONT_FAMILIES.menlo;
  void (async () => {
    try {
      if (document.fonts?.load) await document.fonts.load(`${size}px ${family}`);
      if (document.fonts?.ready) await document.fonts.ready;
    } catch (_error) {
      // Missing optional fonts safely use the declared monospace fallback.
    }
    if (request === terminalFontMetricsRequest) scheduleTerminalSizeUpdate();
  })();
}

function applyTerminalFontSize(value, options = {}) {
  const size = normalizeTerminalFontSize(value);
  if ($('#font-size')) $('#font-size').value = String(size);
  if ($('#font-size-scale')) $('#font-size-scale').value = String(size);
  setTextIfChanged($('#font-size-status'), `${size} pixels`);
  document.documentElement.style.setProperty('--terminal-font-size', `${size}px`);
  xtermAdapter?.setFontSize?.(size, { fit: false });
  if (options.persist !== false) {
    localStorage.setItem('nukefire.fontSize', String(size));
    schedulePersistentSettingsSave();
  }
  if (options.refit !== false) scheduleFontMetricsFit();
  if (options.announceChange) announce(`Terminal text size set to ${size} pixels.`, { force: true });
  return size;
}

function normalizeInterfaceBrightness(value) {
  const clean = String(value || '').trim().toLowerCase();
  return INTERFACE_BRIGHTNESS_MODES.includes(clean) ? clean : DEFAULT_INTERFACE_BRIGHTNESS;
}

function applyInterfaceBrightness(value, options = {}) {
  const mode = normalizeInterfaceBrightness(value);
  state.interfaceBrightness = mode;
  document.body.dataset.interfaceBrightness = mode;
  if ($('#interface-brightness')) $('#interface-brightness').value = mode;
  if (options.persist !== false) {
    localStorage.setItem('nukefire.interfaceBrightness', mode);
    schedulePersistentSettingsSave();
  }
  publishAllPanelPopoutStates();
  if (options.announceChange) {
    const label = mode === 'dark' ? 'Original Dark' : mode === 'high-contrast' ? 'High Contrast' : 'Brighter';
    announce(`Interface brightness changed to ${label}.`, { force: true });
  }
  return mode;
}

function applyFontPreferences(uiFontValue, terminalFontValue, options = {}) {
  state.uiFont = normalizeFontChoice(uiFontValue, UI_FONT_FAMILIES, 'system');
  state.terminalFont = normalizeFontChoice(terminalFontValue, TERMINAL_FONT_FAMILIES, 'menlo');
  document.documentElement.style.setProperty('--ui-font-family', UI_FONT_FAMILIES[state.uiFont]);
  document.documentElement.style.setProperty('--terminal-font-family', TERMINAL_FONT_FAMILIES[state.terminalFont]);
  if ($('#ui-font')) $('#ui-font').value = state.uiFont;
  if ($('#terminal-font')) $('#terminal-font').value = state.terminalFont;
  xtermAdapter?.setFontFamily?.(TERMINAL_FONT_FAMILIES[state.terminalFont], state.terminalFont, { fit: false });
  if (options.persist !== false) {
    localStorage.setItem('nukefire.uiFont', state.uiFont);
    localStorage.setItem('nukefire.terminalFont', state.terminalFont);
    schedulePersistentSettingsSave();
    scheduleFontMetricsFit();
  }
  if (options.announceChange) {
    announce('Font preferences updated.', { force: true });
  }
}

function normalizeDisplayTextPreferences(input = {}) {
  if (typeof displayTextApi.normalizeDisplayText === 'function') {
    return displayTextApi.normalizeDisplayText(input);
  }
  return {
    panelLabels: String(input?.panelLabels || '').trim().toLowerCase() === 'compact' ? 'compact' : 'full',
    mapperRoomLabels: ['number', 'name'].includes(String(input?.mapperRoomLabels || '').trim().toLowerCase())
      ? String(input.mapperRoomLabels).trim().toLowerCase()
      : 'status'
  };
}

function panelVisualLabel(panelId) {
  if (typeof displayTextApi.panelLabel === 'function') {
    return displayTextApi.panelLabel(panelId, state.displayText.panelLabels);
  }
  const panel = SIDEBAR_PANELS.find((candidate) => candidate.id === panelId);
  return panel?.label || 'Panel';
}

function applyDisplayTextPreferences(input = {}, options = {}) {
  state.displayText = normalizeDisplayTextPreferences(input);
  document.body.dataset.panelLabelMode = state.displayText.panelLabels;
  document.body.dataset.mapperRoomLabelMode = state.displayText.mapperRoomLabels;
  if ($('#panel-label-mode')) $('#panel-label-mode').value = state.displayText.panelLabels;
  if ($('#mapper-room-label-mode')) $('#mapper-room-label-mode').value = state.displayText.mapperRoomLabels;

  for (const panel of SIDEBAR_PANELS) {
    const heading = $(`${panel.selector} .panel-titlebar h2`);
    if (heading) {
      heading.textContent = panelVisualLabel(panel.id);
      if (state.displayText.panelLabels === 'compact') heading.setAttribute('aria-label', panel.label);
      else heading.removeAttribute('aria-label');
    }
  }

  renderPanelGroups();
  renderMapper();
  publishAllPanelPopoutStates();

  if (options.persist !== false) {
    localStorage.setItem('nukefire.panelLabelMode', state.displayText.panelLabels);
    localStorage.setItem('nukefire.mapperRoomLabelMode', state.displayText.mapperRoomLabels);
    schedulePersistentSettingsSave();
  }
  if (options.announceChange) {
    const panelText = state.displayText.panelLabels === 'compact' ? 'compact panel labels' : 'full panel labels';
    const mapperText = state.displayText.mapperRoomLabels === 'number'
      ? 'room numbers on the map'
      : state.displayText.mapperRoomLabels === 'name'
        ? 'room names on the map'
        : 'status marks only on the map';
    announce(`Display text updated: ${panelText}, ${mapperText}.`, { force: true });
  }
  return { ...state.displayText };
}


function normalizePromptDisplayMode(value) {
  if (typeof promptDisplayApi.normalizePromptDisplayMode === 'function') {
    return promptDisplayApi.normalizePromptDisplayMode(value);
  }
  const normalized = String(value || '').toLowerCase();
  return ['inline', 'docked', 'hidden'].includes(normalized)
    ? normalized
    : DEFAULT_PROMPT_DISPLAY_MODE;
}

function updateSessionVitalsFromGmcp(record) {
  if (!record) return false;
  if (!record.vitals || typeof record.vitals !== 'object') {
    record.vitals = {
      hp: null, maxHp: null,
      mana: null, maxMana: null,
      move: null, maxMove: null
    };
  }
  const next = combatVitalsModelForGmcp(record.gmcp);

  let changed = false;
  for (const key of COMBAT_VITAL_SCALAR_KEYS) {
    const value = next[key];
    if (value !== null && record.vitals?.[key] !== value) {
      record.vitals[key] = value;
      changed = true;
    }
  }
  return changed;
}

function renderDockedPrompt(record = activeSessionRecord()) {
  if (!dockedPromptRow || !dockedPromptContent) return;
  const prompt = record?.dockedPrompt || {};
  const visible = state.promptDisplayMode === 'docked' && Boolean(prompt.plainText);
  const visibilityChanged = dockedPromptRow.hidden === visible;
  dockedPromptRow.hidden = !visible;
  dockedPromptRow.setAttribute('aria-label', visible
    ? `Current NukeFire prompt: ${prompt.plainText}`
    : 'Current NukeFire prompt');
  const fragment = document.createDocumentFragment();
  if (visible) {
    for (const run of prompt.runs || []) {
      const span = document.createElement('span');
      span.textContent = String(run?.text || '');
      Object.assign(span.style, window.NukeFireAnsi.styleToCss(run?.style));
      fragment.append(span);
    }
  }
  dockedPromptContent.replaceChildren(fragment);
  if (visibilityChanged) scheduleTerminalSizeUpdate();
}


function sessionVitalRowParts(row) {
  if (!row) return null;
  if (row._nukeFireSessionVitalParts) return row._nukeFireSessionVitalParts;
  const parts = {
    name: row.querySelector('.session-vital-name'),
    hp: row.querySelector('.session-vital-health'),
    mana: row.querySelector('.session-vital-mana'),
    move: row.querySelector('.session-vital-move')
  };
  row._nukeFireSessionVitalParts = parts;
  return parts;
}

function createSessionVitalRow() {
  const row = document.createElement('div');
  row.className = 'session-vital-row';
  row.setAttribute('role', 'listitem');

  const name = document.createElement('strong');
  name.className = 'session-vital-name';
  name.setAttribute('aria-hidden', 'true');

  const values = document.createElement('span');
  values.className = 'session-vital-values';
  values.setAttribute('aria-hidden', 'true');

  const hp = document.createElement('span');
  hp.className = 'session-vital-value session-vital-health';

  const mana = document.createElement('span');
  mana.className = 'session-vital-value session-vital-mana';

  const move = document.createElement('span');
  move.className = 'session-vital-value session-vital-move';

  values.append(hp, mana, move);
  row.append(name, values);
  row._nukeFireSessionVitalParts = { name, hp, mana, move };
  return row;
}

function updateSessionVitalRow(row, entry) {
  if (!row || !entry) return false;
  const parts = sessionVitalRowParts(row);
  let changed = false;
  const sessionId = String(entry.id || '');
  const lowHealth = String(Boolean(entry.lowHealth));
  if (row.dataset.sessionId !== sessionId) {
    row.dataset.sessionId = sessionId;
    changed = true;
  }
  if (row.dataset.lowHealth !== lowHealth) {
    row.dataset.lowHealth = lowHealth;
    changed = true;
  }
  changed = setAttributeIfChanged(row, 'aria-label', entry.accessibleText) || changed;
  changed = setTextIfChanged(parts?.name, entry.name) || changed;
  changed = setTextIfChanged(parts?.hp, `${entry.hp}H`) || changed;
  changed = setTextIfChanged(parts?.mana, `${entry.mana}M`) || changed;
  changed = setTextIfChanged(parts?.move, `${entry.move}V`) || changed;
  const hpClassName = entry.lowHealth
    ? 'session-vital-value session-vital-health session-vital-health-low'
    : 'session-vital-value session-vital-health';
  if (parts?.hp && parts.hp.className !== hpClassName) {
    parts.hp.className = hpClassName;
    changed = true;
  }
  return changed;
}

function reconcileSessionVitalRows(list, entries) {
  if (!list) return false;
  const existing = new Map();
  for (const child of list.children) {
    const sessionId = String(child?.dataset?.sessionId || '');
    if (sessionId) existing.set(sessionId, child);
  }

  let changed = false;
  let cursor = list.firstElementChild;
  for (const entry of entries) {
    const sessionId = String(entry?.id || '');
    let row = existing.get(sessionId);
    if (row) existing.delete(sessionId);
    else {
      row = createSessionVitalRow();
      changed = true;
    }
    changed = updateSessionVitalRow(row, entry) || changed;
    if (row !== cursor) {
      list.insertBefore(row, cursor);
      changed = true;
    }
    cursor = row.nextElementSibling;
  }

  for (const row of existing.values()) {
    row.remove();
    changed = true;
  }
  return changed;
}

function renderSessionVitals(record = activeSessionRecord()) {
  if (deferSessionEventRender('session-vitals', () => renderSessionVitals())) return;
  const list = $('#session-vitals-list');
  const empty = $('#session-vitals-empty');
  const panel = $('#panel-session-vitals');
  if (!list || !empty || !panel) return;

  const entries = typeof promptDisplayApi.companionPromptEntries === 'function'
    ? promptDisplayApi.companionPromptEntries(
        record,
        state.sessions.records,
        state.sessions.order
      )
    : [];

  let changed = reconcileSessionVitalRows(list, entries);
  const emptyHidden = entries.length > 0;
  if (empty.hidden !== emptyHidden) {
    empty.hidden = emptyHidden;
    changed = true;
  }
  const sessionCount = String(entries.length);
  if (panel.dataset.sessionCount !== sessionCount) {
    panel.dataset.sessionCount = sessionCount;
    changed = true;
  }
  if (changed) schedulePanelPopoutPublish('sessionVitals');
}

function normalizeAffectsDisplayMode(value) {
  return String(value || '').trim().toLocaleLowerCase() === 'classic' ? 'classic' : 'complete';
}

function setAffectsDisplayMode(value, options = {}) {
  const previousMode = state.affectsDisplayMode;
  state.affectsDisplayMode = normalizeAffectsDisplayMode(value);
  document.body.dataset.affectsDisplayMode = state.affectsDisplayMode;
  const control = $('#affects-display-mode');
  if (control) control.value = state.affectsDisplayMode;
  if (options.rerender !== false && previousMode !== state.affectsDisplayMode) renderAffects();
  if (options.persist !== false) {
    localStorage.setItem('nukefire.affectsDisplayMode', state.affectsDisplayMode);
    schedulePersistentSettingsSave();
  }
  return state.affectsDisplayMode;
}

function applyPromptDisplayMode(value, options = {}) {
  const previousMode = state.promptDisplayMode;
  state.promptDisplayMode = normalizePromptDisplayMode(value);
  document.body.dataset.promptDisplayMode = state.promptDisplayMode;
  const control = $('#prompt-display-mode');
  if (control) control.value = state.promptDisplayMode;
  renderDockedPrompt();
  if (options.rerender !== false && previousMode !== state.promptDisplayMode) {
    renderSessionOutput(activeSessionRecord());
  }
  if (options.persist !== false) {
    localStorage.setItem('nukefire.promptDisplayMode', state.promptDisplayMode);
    schedulePersistentSettingsSave();
  }
  if (options.announceChange) {
    const label = state.promptDisplayMode === 'docked'
      ? 'docked above command input'
      : state.promptDisplayMode === 'hidden'
        ? 'hidden from visual output'
        : 'printed inline in terminal history';
    announce(`Prompt display is ${label}.`, { force: true });
  }
  return state.promptDisplayMode;
}

function promptShouldBeCaptured(record, text) {
  if (typeof promptDisplayApi.shouldCapturePrompt === 'function') {
    return promptDisplayApi.shouldCapturePrompt(state.promptDisplayMode, record, text);
  }
  return state.promptDisplayMode !== 'inline' && Boolean(record?.characterName) && Boolean(String(text || ''));
}

function captureDockedPrompt(record, rawText, boundary = {}, options = {}) {
  if (!record) return false;
  const raw = String(rawText || '');
  const parsedDetailed = typeof record.ansi?.parseDetailed === 'function'
    ? record.ansi.parseDetailed(raw)
    : (typeof ansi.parseDetailed === 'function' ? ansi.parseDetailed(raw) : null);
  const parsedRuns = parsedDetailed?.runs || record.ansi?.parse?.(raw) || ansi.parse(raw);
  const sourcePlain = parsedDetailed
    ? String(parsedDetailed.plainText || '')
    : parsedRuns.map((run) => String(run?.text || '')).join('');
  const runs = transformDisplayRuns(parsedRuns);
  const snapshot = typeof promptDisplayApi.makePromptSnapshot === 'function'
    ? promptDisplayApi.makePromptSnapshot(runs, raw, boundary)
    : {
        rawText: raw,
        plainText: runs.map((run) => String(run?.text || '')).join('').replaceAll('\r', '').trimEnd(),
        runs,
        boundaryType: boundary?.type === 'eor' ? 'eor' : 'ga',
        updatedAt: Date.now()
      };
  record.dockedPrompt = snapshot;
  if (options.active) parseVitalsFromText(raw, sourcePlain);
  else sessionRuntimeApi.parseVitals?.(record, raw, window.NukeFireAnsi.stripAnsi, sourcePlain);
  renderDockedPrompt(activeSessionRecord());
  renderSessionVitals();
  return true;
}

function clearDockedPrompt(record = activeSessionRecord(), options = {}) {
  if (!record) return;
  record.dockedPrompt = typeof promptDisplayApi.emptyPromptSnapshot === 'function'
    ? promptDisplayApi.emptyPromptSnapshot()
    : { rawText: '', plainText: '', runs: [], boundaryType: 'ga', updatedAt: 0 };
  if (options.render !== false && record.id === state.sessions.activeId) renderDockedPrompt(record);
}

function normalizeDisplayComponents(input = {}) {
  return {
    groupVitals: typeof input.groupVitals === 'boolean'
      ? input.groupVitals
      : DEFAULT_DISPLAY_COMPONENTS.groupVitals,
    mapperExits: typeof input.mapperExits === 'boolean'
      ? input.mapperExits
      : DEFAULT_DISPLAY_COMPONENTS.mapperExits,
    gpsNavigator: typeof input.gpsNavigator === 'boolean'
      ? input.gpsNavigator
      : DEFAULT_DISPLAY_COMPONENTS.gpsNavigator,
    mapperMap: typeof input.mapperMap === 'boolean'
      ? input.mapperMap
      : DEFAULT_DISPLAY_COMPONENTS.mapperMap,
    mapperRoomInfo: typeof input.mapperRoomInfo === 'boolean'
      ? input.mapperRoomInfo
      : DEFAULT_DISPLAY_COMPONENTS.mapperRoomInfo
  };
}

function applyDisplayComponents(input = {}, options = {}) {
  state.displayComponents = normalizeDisplayComponents(input);
  const groupSection = $('.group-vitals-section');
  const targetSection = $('#group-targets-section');
  const exits = $('#mapper-exits');
  const gps = $('.mapper-gps-navigator');
  const mapSection = $('#mapper-map-section');
  const roomInfo = $('#mapper-room-info');
  if (groupSection) groupSection.hidden = !state.displayComponents.groupVitals;
  if (targetSection && !state.displayComponents.groupVitals) targetSection.hidden = true;
  if (exits) exits.hidden = !state.displayComponents.mapperRoomInfo || !state.displayComponents.mapperExits;
  if (gps) gps.hidden = !state.displayComponents.gpsNavigator;
  if (mapSection) mapSection.hidden = !state.displayComponents.mapperMap;
  if (roomInfo) roomInfo.hidden = !state.displayComponents.mapperRoomInfo;
  if ($('#show-group-vitals')) $('#show-group-vitals').checked = state.displayComponents.groupVitals;
  if ($('#show-mapper-exits')) $('#show-mapper-exits').checked = state.displayComponents.mapperExits;
  if ($('#show-gps-navigator')) $('#show-gps-navigator').checked = state.displayComponents.gpsNavigator;
  if ($('#show-mapper-map')) $('#show-mapper-map').checked = state.displayComponents.mapperMap;
  if ($('#show-mapper-room-info')) $('#show-mapper-room-info').checked = state.displayComponents.mapperRoomInfo;
  for (const item of document.querySelectorAll('[data-mapper-section-toggle]')) {
    item.setAttribute('aria-checked', String(Boolean(state.displayComponents[item.dataset.mapperSectionToggle])));
  }
  if (options.persist !== false) {
    localStorage.setItem('nukefire.showGroupVitals', String(state.displayComponents.groupVitals));
    localStorage.setItem('nukefire.showMapperExits', String(state.displayComponents.mapperExits));
    localStorage.setItem('nukefire.showGpsNavigator', String(state.displayComponents.gpsNavigator));
    localStorage.setItem('nukefire.showMapperMap', String(state.displayComponents.mapperMap));
    localStorage.setItem('nukefire.showMapperRoomInfo', String(state.displayComponents.mapperRoomInfo));
    schedulePersistentSettingsSave();
    scheduleTerminalSizeUpdate();
  }
  if (options.announceChange) announce('Panel detail visibility updated.', { force: true });
}

function normalizeVitalDisplayPreferences(input = {}) {
  const normalizeMode = typeof combatVitalsApi.normalizeVitalDisplayMode === 'function'
    ? combatVitalsApi.normalizeVitalDisplayMode
    : (value, fallback) => ['values', 'values-percent', 'percent', 'current'].includes(String(value || '').trim().toLowerCase())
      ? String(value).trim().toLowerCase()
      : fallback;
  const normalizeSize = typeof combatVitalsApi.normalizeVitalNumberSize === 'function'
    ? combatVitalsApi.normalizeVitalNumberSize
    : (value, fallback) => ['compact', 'standard', 'large'].includes(String(value || '').trim().toLowerCase())
      ? String(value).trim().toLowerCase()
      : fallback;
  return {
    mainMode: normalizeMode(input.mainMode, DEFAULT_VITAL_DISPLAY.mainMode),
    groupMode: normalizeMode(input.groupMode, DEFAULT_VITAL_DISPLAY.groupMode),
    numberSize: normalizeSize(input.numberSize, DEFAULT_VITAL_DISPLAY.numberSize),
    hideSelfInGroup: typeof input.hideSelfInGroup === 'boolean'
      ? input.hideSelfInGroup
      : DEFAULT_VITAL_DISPLAY.hideSelfInGroup
  };
}

function applyVitalDisplayPreferences(input = {}, options = {}) {
  state.vitalDisplay = normalizeVitalDisplayPreferences(input);
  const panel = $('#panel-vitals');
  if (panel) {
    panel.dataset.vitalsNumberSize = state.vitalDisplay.numberSize;
    panel.dataset.mainVitalsMode = state.vitalDisplay.mainMode;
    panel.dataset.groupVitalsMode = state.vitalDisplay.groupMode;
  }
  if ($('#main-vitals-mode')) $('#main-vitals-mode').value = state.vitalDisplay.mainMode;
  if ($('#group-vitals-mode')) $('#group-vitals-mode').value = state.vitalDisplay.groupMode;
  if ($('#vitals-number-size')) $('#vitals-number-size').value = state.vitalDisplay.numberSize;
  if ($('#hide-self-in-group-vitals')) {
    $('#hide-self-in-group-vitals').checked = state.vitalDisplay.hideSelfInGroup;
  }
  if (options.persist !== false) {
    localStorage.setItem('nukefire.mainVitalsMode', state.vitalDisplay.mainMode);
    localStorage.setItem('nukefire.groupVitalsMode', state.vitalDisplay.groupMode);
    localStorage.setItem('nukefire.vitalsNumberSize', state.vitalDisplay.numberSize);
    localStorage.setItem('nukefire.hideSelfInGroupVitals', String(state.vitalDisplay.hideSelfInGroup));
    schedulePersistentSettingsSave();
  }
  renderVitals();
  renderOpponentVitals();
  renderGroupVitals();
  if (options.announceChange) announce('Vitals display updated.', { force: true });
}

function normalizeHiddenDefaultQuickCommands(input) {
  const source = Array.isArray(input) ? input : [];
  return [...new Set(source
    .map((value) => String(value || '').trim().toLowerCase())
    .filter((id) => DEFAULT_QUICK_COMMAND_IDS.has(id)))];
}

function normalizeQuickKeyRecords(input) {
  const source = Array.isArray(input) ? input.slice(0, MAX_CUSTOM_QUICK_KEYS * 4) : [];
  const output = [];
  const used = new Set();
  for (const raw of source) {
    const record = raw && typeof raw === 'object' ? raw : {};
    const label = String(record.label || '').normalize('NFKC')
      .replace(/[\r\n\t]+/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, 32);
    const command = String(record.command || '').normalize('NFKC')
      .replace(/[\r\n]+/gu, ' ').trim().slice(0, 1024);
    if (!label || !command) continue;
    let id = String(record.id || '').normalize('NFKC').trim().toLowerCase()
      .replace(/[^a-z0-9_-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 48);
    if (!id || used.has(id)) {
      let sequence = output.length + 1;
      do {
        id = `quick-${sequence}`;
        sequence += 1;
      } while (used.has(id));
    }
    used.add(id);
    output.push({ id, label, command, enabled: record.enabled !== false });
    if (output.length >= MAX_CUSTOM_QUICK_KEYS) break;
  }
  return output;
}

function newQuickKeyId() {
  const base = `quick-${Date.now().toString(36)}`;
  let id = base;
  let sequence = 2;
  const used = new Set(state.quickKeys.map((record) => record.id));
  while (used.has(id)) {
    id = `${base}-${sequence}`;
    sequence += 1;
  }
  return id;
}

function renderQuickCommandButtons() {
  const container = $('#quick-command-buttons');
  if (!container) return;
  const hiddenDefaults = new Set(state.hiddenDefaultQuickCommands);
  for (const record of DEFAULT_QUICK_COMMANDS) {
    const button = container.querySelector(`[data-default-quick-command="${record.id}"]`);
    if (button) button.hidden = hiddenDefaults.has(record.id);
  }
  for (const button of [...container.querySelectorAll('[data-custom-quick-key]')]) button.remove();
  for (const record of state.quickKeys) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'custom-quick-command';
    button.dataset.customQuickKey = record.id;
    button.textContent = record.label;
    button.title = record.command;
    button.disabled = record.enabled === false;
    button.setAttribute('aria-label', `Quick Command: ${record.label}`);
    button.addEventListener('click', () => void sendCommandAndRefocus(record.command));
    container.append(button);
  }
}

function resetQuickCommandEditor() {
  state.quickKeyEditId = '';
  if ($('#quick-command-edit-id')) $('#quick-command-edit-id').value = '';
  if ($('#quick-command-label')) $('#quick-command-label').value = '';
  if ($('#quick-command-value')) $('#quick-command-value').value = '';
  if ($('#quick-command-save')) $('#quick-command-save').textContent = 'Add Button';
  if ($('#quick-command-cancel')) $('#quick-command-cancel').hidden = true;
}

function editQuickCommand(id) {
  const record = state.quickKeys.find((candidate) => candidate.id === id);
  if (!record) return;
  state.quickKeyEditId = record.id;
  $('#quick-command-edit-id').value = record.id;
  $('#quick-command-label').value = record.label;
  $('#quick-command-value').value = record.command;
  $('#quick-command-save').textContent = 'Save Changes';
  $('#quick-command-cancel').hidden = false;
  $('#quick-command-label').focus({ preventScroll: true });
  $('#quick-command-label').select();
}

function moveQuickCommand(id, delta) {
  const index = state.quickKeys.findIndex((record) => record.id === id);
  const nextIndex = index + delta;
  if (index < 0 || nextIndex < 0 || nextIndex >= state.quickKeys.length) return;
  [state.quickKeys[index], state.quickKeys[nextIndex]] = [state.quickKeys[nextIndex], state.quickKeys[index]];
  renderQuickCommands();
  schedulePersistentSettingsSave();
}

function deleteQuickCommand(id) {
  const index = state.quickKeys.findIndex((record) => record.id === id);
  if (index < 0) return;
  const [removed] = state.quickKeys.splice(index, 1);
  if (state.quickKeyEditId === id) resetQuickCommandEditor();
  renderQuickCommands();
  schedulePersistentSettingsSave();
  announce(`${removed.label} Quick Command deleted.`, { force: true });
}

function toggleQuickCommand(id) {
  const record = state.quickKeys.find((candidate) => candidate.id === id);
  if (!record) return;
  record.enabled = record.enabled === false;
  renderQuickCommands();
  schedulePersistentSettingsSave();
}

function toggleDefaultQuickCommand(id) {
  if (!DEFAULT_QUICK_COMMAND_IDS.has(id)) return;
  const hidden = new Set(state.hiddenDefaultQuickCommands);
  const record = DEFAULT_QUICK_COMMANDS.find((candidate) => candidate.id === id);
  if (hidden.has(id)) hidden.delete(id);
  else hidden.add(id);
  state.hiddenDefaultQuickCommands = [...hidden];
  renderQuickCommands();
  schedulePersistentSettingsSave();
  announce(`${record?.label || 'Built-in'} Quick Command ${hidden.has(id) ? 'removed' : 'restored'}.`, { force: true });
}

function restoreDefaultQuickCommands() {
  if (state.hiddenDefaultQuickCommands.length === 0) return;
  state.hiddenDefaultQuickCommands = [];
  renderQuickCommands();
  schedulePersistentSettingsSave();
  announce('All built-in Quick Commands restored.', { force: true });
}

function renderDefaultQuickCommandList() {
  const list = $('#quick-command-default-list');
  const restoreAll = $('#quick-command-restore-defaults');
  if (!list) return;
  const hidden = new Set(state.hiddenDefaultQuickCommands);
  list.replaceChildren();

  for (const record of DEFAULT_QUICK_COMMANDS) {
    const removed = hidden.has(record.id);
    const row = document.createElement('div');
    row.className = `quick-command-list-item${removed ? ' quick-command-default-removed' : ''}`;
    row.dataset.defaultQuickCommandId = record.id;
    row.setAttribute('role', 'listitem');

    const copy = document.createElement('div');
    copy.className = 'quick-command-list-copy';
    const label = document.createElement('strong');
    label.textContent = record.label;
    const command = document.createElement('code');
    command.textContent = record.command;
    copy.append(label, command);

    const actions = document.createElement('div');
    actions.className = 'quick-command-list-actions';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = removed ? 'Restore' : 'Remove';
    toggle.setAttribute('aria-label', `${removed ? 'Restore' : 'Remove'} built-in Quick Command: ${record.label}`);
    toggle.addEventListener('click', () => toggleDefaultQuickCommand(record.id));
    actions.append(toggle);
    row.append(copy, actions);
    list.append(row);
  }

  if (restoreAll) restoreAll.disabled = hidden.size === 0;
}

function renderQuickCommandList() {
  const list = $('#quick-command-list');
  const empty = $('#quick-command-empty');
  if (!list || !empty) return;
  list.replaceChildren();
  empty.hidden = state.quickKeys.length > 0;

  state.quickKeys.forEach((record, index) => {
    const row = document.createElement('div');
    row.className = 'quick-command-list-item';
    row.dataset.quickKeyId = record.id;
    row.setAttribute('role', 'listitem');
    row.setAttribute('aria-disabled', String(record.enabled === false));

    const copy = document.createElement('div');
    copy.className = 'quick-command-list-copy';
    const label = document.createElement('strong');
    label.textContent = record.label;
    const command = document.createElement('code');
    command.textContent = record.command;
    copy.append(label, command);

    const actions = document.createElement('div');
    actions.className = 'quick-command-list-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => editQuickCommand(record.id));
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.textContent = record.enabled === false ? 'Enable' : 'Disable';
    toggle.addEventListener('click', () => toggleQuickCommand(record.id));
    const up = document.createElement('button');
    up.type = 'button';
    up.textContent = 'Up';
    up.disabled = index === 0;
    up.addEventListener('click', () => moveQuickCommand(record.id, -1));
    const down = document.createElement('button');
    down.type = 'button';
    down.textContent = 'Down';
    down.disabled = index === state.quickKeys.length - 1;
    down.addEventListener('click', () => moveQuickCommand(record.id, 1));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.addEventListener('click', () => deleteQuickCommand(record.id));
    actions.append(edit, toggle, up, down, remove);
    row.append(copy, actions);
    list.append(row);
  });
}

function renderQuickCommands() {
  renderQuickCommandButtons();
  renderDefaultQuickCommandList();
  renderQuickCommandList();
}

function currentKeyboardPlatform() {
  return String(navigator.userAgentData?.platform || navigator.platform || '');
}

function isProtectedNativeKey(input = {}) {
  return typeof keybindingApi.isProtectedNativeShortcut === 'function'
    && keybindingApi.isProtectedNativeShortcut(input, currentKeyboardPlatform());
}

function normalizeKeybindingState(input = {}) {
  if (typeof keybindingApi.normalizeKeybindingSettings === 'function') {
    return keybindingApi.normalizeKeybindingSettings(input);
  }
  const source = input && typeof input === 'object' ? input : {};
  return {
    enabled: source.enabled !== false,
    bindings: Array.isArray(source.bindings) ? structuredCloneSafe(source.bindings) : []
  };
}

function newKeybindingId() {
  const base = `binding-${Date.now().toString(36)}`;
  let id = base;
  let sequence = 2;
  const used = new Set(state.keybindings.bindings.map((record) => record.id));
  while (used.has(id)) {
    id = `${base}-${sequence}`;
    sequence += 1;
  }
  return id;
}

function currentControlsSnapshot() {
  const raw = state.gmcp?.controls?.state || {};
  if (typeof semanticControlsApi.normalizeControlsSnapshot === 'function') {
    return semanticControlsApi.normalizeControlsSnapshot(raw);
  }
  return raw && typeof raw === 'object' ? raw : {};
}

const RAPID_RECALL_ACTIONS = Object.freeze(
  Array.from({ length: 9 }, (_value, index) => {
    const n = index + 1;
    const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
    return Object.freeze({
      id: `recall-${n}`,
      label: `Recall ${n}${suffix} Most Recent`,
      detail: `Read the ${n}${suffix} most recent item without moving the parked review cursor.`
    });
  })
);

const CLIENT_REVIEW_ACTIONS = Object.freeze({
  'reader-history': Object.freeze([
    Object.freeze({ id: 'category-previous', label: 'Previous History Category', detail: 'Move to the previous Reader History category without leaving the command line.' }),
    Object.freeze({ id: 'category-next', label: 'Next History Category', detail: 'Move to the next Reader History category without leaving the command line.' }),
    Object.freeze({ id: 'current', label: 'Current History Message', detail: 'Read the currently parked message in the selected Reader History category.' }),
    Object.freeze({ id: 'previous', label: 'Previous History Message', detail: 'Move one message older in the selected Reader History category.' }),
    Object.freeze({ id: 'next', label: 'Next History Message', detail: 'Move one message newer in the selected Reader History category.' }),
    Object.freeze({ id: 'latest', label: 'Latest History Message', detail: 'Jump to the newest message in the selected Reader History category.' }),
    ...RAPID_RECALL_ACTIONS
  ]),
  'reader-review': Object.freeze([
    Object.freeze({ id: 'current', label: 'Current Reader Line', detail: 'Read the currently parked terminal review line.' }),
    Object.freeze({ id: 'previous', label: 'Previous Reader Line', detail: 'Move one completed terminal line older.' }),
    Object.freeze({ id: 'next', label: 'Next Reader Line', detail: 'Move one completed terminal line newer.' }),
    Object.freeze({ id: 'latest', label: 'Latest Reader Line', detail: 'Jump to the newest completed terminal line.' }),
    ...RAPID_RECALL_ACTIONS
  ]),
  'communications-review': Object.freeze([
    Object.freeze({ id: 'current', label: 'Current Communication', detail: 'Read the currently parked message in the selected Communications view.' }),
    Object.freeze({ id: 'older', label: 'Older Communication', detail: 'Move one message older in the selected Communications view.' }),
    Object.freeze({ id: 'newer', label: 'Newer Communication', detail: 'Move one message newer in the selected Communications view.' }),
    Object.freeze({ id: 'latest', label: 'Latest Communication', detail: 'Jump to the newest message in the selected Communications view.' }),
    ...RAPID_RECALL_ACTIONS,
    Object.freeze({ id: 'last-tell', label: 'Last Tell', detail: 'Read the newest Tell message without changing the selected Communications channel or review cursor.' }),
    Object.freeze({ id: 'last-communication', label: 'Last Communication', detail: 'Read the newest message from any Communications channel without moving review state.' })
  ]),
  accessibility: Object.freeze([
    Object.freeze({ id: 'read-vitals', label: 'Read Vitals', detail: 'Read current health, mana, and movement locally without sending anything to the MUD.' }),
    Object.freeze({ id: 'copy-reviewed', label: 'Copy Reviewed Line', detail: 'Copy the last line or message read by Reader Review or Communications Review.' }),
    Object.freeze({ id: 'read-health', label: 'Read Health', detail: 'Read current health locally in your chosen vital speech format without sending anything to the MUD.' }),
    Object.freeze({ id: 'read-mana', label: 'Read Mana', detail: 'Read current mana locally in your chosen vital speech format without sending anything to the MUD.' }),
    Object.freeze({ id: 'read-movement', label: 'Read Movement', detail: 'Read current movement locally in your chosen vital speech format without sending anything to the MUD.' }),
    Object.freeze({ id: 'toggle-sound-triggers', label: 'Toggle Sound Triggers', detail: 'Enable or disable configured Sound Triggers without sending anything to the MUD.' }),
    Object.freeze({ id: 'toggle-audio-cues', label: 'Toggle Audio Cues', detail: 'Enable or disable NukeFire Audio Cues without sending anything to the MUD.' }),
    Object.freeze({ id: 'mute-audio-cues', label: 'Mute Audio Cues', detail: 'Keep Audio Cues enabled but silent until unmuted.' }),
    Object.freeze({ id: 'unmute-audio-cues', label: 'Unmute Audio Cues', detail: 'Resume Audio Cues for new events.' }),
    Object.freeze({ id: 'toggle-audio-cue-mute', label: 'Toggle Audio Cue Mute', detail: 'Mute or unmute Audio Cues without sending anything to the MUD.' }),
    Object.freeze({ id: 'test-audio-cue', label: 'Test Audio Cue', detail: 'Play the built-in Hit earcon locally without sending anything to the MUD.' }),
    Object.freeze({ id: 'stop-audio-cues', label: 'Stop Audio Cues', detail: 'Immediately stop any currently sounding NukeFire earcons.' }),
    Object.freeze({ id: 'stop-self-voice', label: 'Stop Self-Voice Now', detail: 'Immediately cancel NukeFire self-voice without sending anything to the MUD.' }),
    Object.freeze({ id: 'mute-self-voice', label: 'Mute Self-Voice', detail: 'Keep Self-Voice enabled but silent until it is unmuted.' }),
    Object.freeze({ id: 'unmute-self-voice', label: 'Unmute Self-Voice', detail: 'Resume NukeFire Self-Voice for new live output.' }),
    Object.freeze({ id: 'toggle-self-voice-mute', label: 'Toggle Self-Voice Mute', detail: 'Mute or unmute NukeFire Self-Voice without sending anything to the MUD.' }),
    Object.freeze({ id: 'toggle-self-voice-follow', label: 'Toggle Follow Self-Voice', detail: 'Toggle navigation follow-speech without sending anything to the MUD.' }),
    Object.freeze({ id: 'toggle-self-voice-priority-alerts', label: 'Toggle Priority Self-Voice Alerts', detail: 'Toggle Tell/System self-voice barge-in without sending anything to the MUD.' }),
    Object.freeze({ id: 'toggle-reader-workspace', label: 'Toggle Reader Workspace', detail: 'Switch between the normal panel workspace and the terminal-focused Reader Review workspace.' })
  ])
});

function clientReviewOptionsForType(type) {
  const key = String(type || '').trim().toLowerCase();
  return Array.isArray(CLIENT_REVIEW_ACTIONS[key]) ? CLIENT_REVIEW_ACTIONS[key] : [];
}

function isClientReviewSemantic(semantic = {}) {
  const type = String(semantic?.type || '').trim().toLowerCase();
  const id = String(semantic?.id || '').trim().toLowerCase();
  return clientReviewOptionsForType(type).some((record) => record.id === id);
}

function resolveClientReviewSemantic(semantic = {}) {
  const type = String(semantic?.type || '').trim().toLowerCase();
  const id = String(semantic?.id || '').trim().toLowerCase();
  const option = clientReviewOptionsForType(type).find((record) => record.id === id);
  if (!option) return null;
  return {
    available: true,
    command: '',
    id: option.id,
    label: option.label,
    detail: option.detail,
    kind: type === 'reader-history' ? 'Reader history' : (type === 'reader-review' ? 'Reader review' : (type === 'communications-review' ? 'Communications review' : 'Accessibility')),
    clientAction: { type, id: option.id }
  };
}

function semanticReferenceForBinding(record = {}) {
  const source = record.semantic && typeof record.semantic === 'object' ? record.semantic : {};
  const type = String(source.type || '').trim().toLowerCase();
  const id = String(source.id || '').trim();
  if (type && id && clientReviewOptionsForType(type).some((entry) =>
    entry.id === id.toLowerCase())) {
    return { type, id: id.toLowerCase() };
  }
  if (typeof semanticControlsApi.normalizeSemanticReference === 'function') {
    return semanticControlsApi.normalizeSemanticReference(record.semantic);
  }
  return type && id ? { type, id } : null;
}

function resolveSemanticReferenceForCurrentCharacter(semantic = {}) {
  const local = resolveClientReviewSemantic(semantic);
  if (local) return local;
  return typeof semanticControlsApi.resolveSemanticReference === 'function'
    ? semanticControlsApi.resolveSemanticReference(semantic, currentControlsSnapshot())
    : null;
}

function resolveKeybindingForCurrentCharacter(record = {}) {
  const semantic = semanticReferenceForBinding(record);
  if (!semantic) {
    return {
      available: Boolean(String(record.command || '').trim()),
      command: String(record.command || '').trim(),
      label: String(record.command || '').trim(),
      detail: '',
      kind: record.preset ? 'Numpad movement preset' : 'Custom'
    };
  }

  const resolved = resolveSemanticReferenceForCurrentCharacter(semantic);
  if (!resolved) {
    return {
      available: false,
      command: '',
      label: semantic.id,
      detail: '',
      kind: 'Server control',
      reason: 'This server control cannot be resolved by the current client.'
    };
  }
  if (resolved.clientAction) return resolved;
  return {
    ...resolved,
    kind: typeof semanticControlsApi.bindingKindLabel === 'function'
      ? semanticControlsApi.bindingKindLabel(semantic)
      : 'Server control'
  };
}

function semanticOptionsForType(type) {
  const local = clientReviewOptionsForType(type);
  if (local.length) return local;
  if (typeof semanticControlsApi.optionsForType !== 'function') return [];
  return semanticControlsApi.optionsForType(type, currentControlsSnapshot());
}

function renderServerControlsSummary() {
  const output = $('#keybinding-server-controls');
  if (!output) return;
  const snapshot = currentControlsSnapshot();
  const profiles = Array.isArray(snapshot.combo?.profiles) ? snapshot.combo.profiles : [];
  const targets = Array.isArray(snapshot.groupassist?.targets) ? snapshot.groupassist.targets : [];
  const pathActions = Array.isArray(snapshot.path?.actions) ? snapshot.path.actions : [];
  const received = Boolean(state.gmcp?.controls?.state);

  if (!received) {
    output.textContent = state.connected
      ? 'NukeFire Controls have not arrived yet. Use Refresh NukeFire Controls.'
      : 'Connect to NukeFire to load combo profiles, GroupAssist rotations, and path controls.';
    return;
  }

  const activeCombo = snapshot.combo?.activeProfile
    || (Array.isArray(snapshot.combo?.active) && snapshot.combo.active.length
      ? snapshot.combo.active.map((skill) => skill.name).join(' > ')
      : 'none');
  output.textContent = `Server controls ready. Active combo: ${activeCombo}. ` +
    `${profiles.length} combo profile${profiles.length === 1 ? '' : 's'}, ` +
    `${targets.length} GroupAssist rotation${targets.length === 1 ? '' : 's'}, and ` +
    `${pathActions.length} path control${pathActions.length === 1 ? '' : 's'} available.`;
}

function groupAssistEditorTarget() {
  return String($('#groupassist-editor-target')?.value || 'self').trim();
}

function groupAssistSavedTarget(snapshot, target) {
  const needle = String(target || '').toLocaleLowerCase();
  return (Array.isArray(snapshot.groupassist?.targets) ? snapshot.groupassist.targets : [])
    .find((record) => String(record?.target || '').toLocaleLowerCase() === needle) || null;
}

function renderGroupAssistEditor(options = {}) {
  const form = $('#groupassist-editor-form');
  const targetInput = $('#groupassist-editor-target');
  const actionHost = $('#groupassist-editor-actions');
  const summary = $('#groupassist-editor-summary');
  const status = $('#groupassist-editor-status');
  const save = $('#groupassist-editor-save');
  const clear = $('#groupassist-editor-clear');
  const refresh = $('#groupassist-editor-refresh');
  if (!form || !targetInput || !actionHost || !summary || !status || !save || !clear || !refresh) return;

  const snapshot = currentControlsSnapshot();
  const available = Array.isArray(snapshot.groupassist?.available) ? snapshot.groupassist.available : [];
  const received = Boolean(state.gmcp?.controls?.state);
  const target = groupAssistEditorTarget() || 'self';
  const saved = groupAssistSavedTarget(snapshot, target);
  const prior = options.loadSaved === false
    ? [...actionHost.querySelectorAll('select')].map((select) => select.value)
    : (saved?.actions || []);

  actionHost.replaceChildren();
  for (let index = 0; index < 5; index++) {
    const row = document.createElement('div');
    row.className = 'groupassist-editor-action';
    const label = document.createElement('label');
    const select = document.createElement('select');
    select.id = `groupassist-editor-action-${index + 1}`;
    select.name = `action-${index + 1}`;
    label.htmlFor = select.id;
    label.textContent = `Action ${index + 1}`;
    const none = document.createElement('option');
    none.value = '';
    none.textContent = index === 0 ? 'Choose an action' : 'None';
    select.append(none);
    for (const action of available) {
      const option = document.createElement('option');
      option.value = action.id;
      option.textContent = `${action.label}${action.leaderTarget ? ' — targets leader' : ''}`;
      select.append(option);
    }
    const wanted = String(prior[index] || '').toLocaleLowerCase();
    if (wanted && [...select.options].some((option) => option.value === wanted)) select.value = wanted;
    select.disabled = !state.connected || !received || available.length === 0;
    row.append(label, select);
    actionHost.append(row);
  }

  targetInput.disabled = !state.connected || !received;
  save.disabled = !state.connected || !received || available.length === 0;
  clear.disabled = !state.connected || !received;
  refresh.disabled = !state.connected;
  summary.textContent = !received
    ? (state.connected ? 'Waiting for the server-owned GroupAssist catalog.' : 'Connect to load this character’s learned GroupAssist actions.')
    : `${available.length} learned action${available.length === 1 ? '' : 's'} available. The server executes one action per eligible combat cycle.`;
  status.textContent = saved
    ? `${saved.target}: ${saved.actions.join(', ')}. Next action ${saved.nextIndex + 1}.`
    : `No saved rotation for ${target}.`;
}

function validGroupAssistTarget(value) {
  const target = String(value || '').trim();
  return /^(?:self|default|[A-Za-z][A-Za-z'-]{0,31})$/u.test(target) ? target : '';
}

async function saveGroupAssistEditor() {
  const target = validGroupAssistTarget(groupAssistEditorTarget());
  const actions = [...$('#groupassist-editor-actions').querySelectorAll('select')]
    .map((select) => String(select.value || '').trim()).filter(Boolean);
  if (!target) {
    announce('Use self, default, or one player name for the GroupAssist target.', { force: true });
    return false;
  }
  if (!actions.length) {
    announce('Choose at least one GroupAssist action before saving.', { force: true });
    return false;
  }
  await sendCommand(`groupassist set ${target} ${actions.join(' ')}`, { preserveInput: true });
  announce(`GroupAssist rotation sent for ${target}.`, { force: true });
  setTimeout(() => void refreshNukeFireControls({ announce: false }), 250);
  return true;
}

async function clearGroupAssistEditor() {
  const target = validGroupAssistTarget(groupAssistEditorTarget());
  if (!target) {
    announce('Use self, default, or one player name for the GroupAssist target.', { force: true });
    return false;
  }
  await sendCommand(`groupassist clear ${target}`, { preserveInput: true });
  announce(`GroupAssist clear sent for ${target}.`, { force: true });
  setTimeout(() => void refreshNukeFireControls({ announce: false }), 250);
  return true;
}

async function refreshNukeFireControls(options = {}) {
  if (!state.connected) {
    announce('Connect to NukeFire before refreshing server controls.', { force: true });
    renderServerControlsSummary();
    return false;
  }
  const sent = await sendActiveGmcp('NukeFire.Controls');
  if (options.announce !== false) {
    announce(sent ? 'Requested current NukeFire controls.' : 'Could not request NukeFire controls.', { force: true });
  }
  return sent;
}

function currentKeybindingConflict() {
  const editor = state.keybindingEditor;
  if (!editor.open || !editor.captured) return null;
  if (typeof keybindingApi.findBindingConflict === 'function') {
    return keybindingApi.findBindingConflict(state.keybindings, editor.captured, editor.editId);
  }
  return state.keybindings.bindings.find((record) => record.signature === editor.captured.signature
    && record.id !== editor.editId) || null;
}

function renderKeybindingEditor() {
  const editor = state.keybindingEditor;
  const form = $('#keybinding-form');
  const heading = $('#keybinding-editor-heading');
  const recordButton = $('#keybinding-record');
  const recorded = $('#keybinding-recorded');
  const status = $('#keybinding-recorder-status');
  const typeSelect = $('#keybinding-type');
  const semanticField = $('#keybinding-semantic-field');
  const semanticLabel = $('#keybinding-semantic-label');
  const semanticSelect = $('#keybinding-semantic-id');
  const semanticHelp = $('#keybinding-semantic-help');
  const command = $('#keybinding-command');
  const commandLabel = $('#keybinding-command-label');
  const commandHelp = $('#keybinding-command-help');
  const conflictBox = $('#keybinding-conflict');
  const conflictMessage = $('#keybinding-conflict-message');
  const replaceConflict = $('#keybinding-replace-conflict');
  const save = $('#keybinding-save');
  if (!form || !heading || !recordButton || !recorded || !status || !typeSelect ||
      !semanticField || !semanticLabel || !semanticSelect || !semanticHelp || !command ||
      !commandLabel || !commandHelp || !conflictBox || !conflictMessage ||
      !replaceConflict || !save) return;

  form.hidden = !editor.open;
  for (const control of form.querySelectorAll('button, input, select')) control.disabled = !editor.open;
  if (!editor.open) return;

  const editing = state.keybindings.bindings.find((record) => record.id === editor.editId) || null;
  heading.textContent = editing ? 'Edit Keyboard Shortcut' : 'Add Keyboard Shortcut';
  save.textContent = editing ? 'Save Shortcut' : 'Add Shortcut';
  recordButton.textContent = editor.recording
    ? 'Press a Key…'
    : (editor.captured ? 'Change Recorded Key' : 'Record Key');
  recordButton.setAttribute('aria-pressed', String(editor.recording));
  recorded.textContent = editor.captured
    ? `Recorded: ${editor.captured.label}`
    : 'No key recorded.';

  const semanticType = String(editor.semanticType || 'raw');
  typeSelect.value = semanticType;
  const semanticMode = semanticType !== 'raw';
  const clientReviewMode = clientReviewOptionsForType(semanticType).length > 0;
  semanticField.hidden = !semanticMode;
  semanticSelect.disabled = !semanticMode;
  command.readOnly = semanticMode;
  command.required = !semanticMode;
  command.setAttribute('aria-readonly', String(semanticMode));
  commandLabel.textContent = clientReviewMode
    ? (semanticType === 'accessibility' ? 'Accessibility action' : 'Client review action')
    : (semanticMode ? 'Resolved server command' : 'Command or alias');
  commandHelp.textContent = clientReviewMode
    ? (semanticType === 'accessibility'
      ? 'Accessibility actions run entirely inside NukeFire. They do not send a command to the MUD.'
      : 'Reader history and review actions run entirely inside NukeFire. They do not send a command to the MUD.')
    : (semanticMode
      ? 'The client resolves this from the current character’s server-provided NukeFire Controls. It never fires every combo skill itself.'
      : 'Raw shortcuts are sent through aliases, variables, routing, loops, delays, and speedwalks.');

  let semanticResolved = null;
  if (semanticMode) {
    const typeCopy = {
      'combo-profile': ['Combo profile', 'Loading a profile arms the MUD’s existing autofire combo.'],
      'groupassist-rotation': ['GroupAssist rotation', 'This restores server-side rotation configuration; it is not a combat attack.'],
      'path-action': ['Path control', 'Path controls execute one deliberate server path command per keypress.'],
      'reader-history': ['Reader history action', 'This navigates the selected per-session Reader History category locally without moving focus.'],
      'reader-review': ['Reader review action', 'This operates the stable per-session terminal review cursor locally.'],
      'communications-review': ['Communications review action', 'This operates the stable selected-channel message cursor locally.'],
      accessibility: ['Accessibility action', 'These controls operate NukeFire accessibility locally and never send a MUD command.']
    }[semanticType] || ['Server control', 'Choose a server-provided control.'];
    semanticLabel.textContent = typeCopy[0];

    const options = semanticOptionsForType(semanticType);
    const currentId = String(editor.semanticId || '');
    semanticSelect.replaceChildren();
    for (const optionRecord of options) {
      const option = document.createElement('option');
      option.value = optionRecord.id;
      option.textContent = optionRecord.detail
        ? `${optionRecord.label} — ${optionRecord.detail}`
        : optionRecord.label;
      semanticSelect.append(option);
    }
    if (currentId && !options.some((record) => record.id.toLocaleLowerCase() === currentId.toLocaleLowerCase())) {
      const unavailable = document.createElement('option');
      unavailable.value = currentId;
      unavailable.textContent = `${currentId} — currently unavailable`;
      semanticSelect.append(unavailable);
    }
    if (!semanticSelect.options.length) {
      const unavailable = document.createElement('option');
      unavailable.value = '';
      unavailable.textContent = clientReviewMode
        ? 'No review actions available'
        : 'No controls available — connect or refresh';
      semanticSelect.append(unavailable);
    }
    const canonicalOption = options.find((record) =>
      record.id.toLocaleLowerCase() === String(editor.semanticId || '').toLocaleLowerCase()
    );
    if (canonicalOption) editor.semanticId = canonicalOption.id;
    if (!editor.semanticId && options.length) editor.semanticId = options[0].id;
    semanticSelect.value = editor.semanticId || '';

    semanticResolved = editor.semanticId
      ? resolveSemanticReferenceForCurrentCharacter({ type: semanticType, id: editor.semanticId })
      : null;
    if (semanticResolved?.available && !semanticResolved.clientAction) command.value = semanticResolved.command;
    else if (clientReviewMode || !editing || !editing.semantic || editor.semanticId !== editing.semantic.id) command.value = '';

    semanticHelp.textContent = semanticResolved?.available
      ? (semanticResolved.clientAction
        ? `${typeCopy[1]} ${semanticResolved.detail} No server command is sent.`
        : `${typeCopy[1]} Resolved command: ${semanticResolved.command}`)
      : `${typeCopy[1]} ${semanticResolved?.reason || (clientReviewMode
        ? 'Choose a review action.'
        : 'Connect to NukeFire or refresh the server control catalog.')}`;
  } else {
    semanticSelect.replaceChildren();
    semanticHelp.textContent = '';
  }

  if (editor.recording) {
    status.textContent = 'Recording now. Press a key or combination. Escape cancels; Tab stops recording and moves focus.';
  } else if (editor.captured && semanticMode && semanticResolved?.available) {
    status.textContent = `${editor.captured.label} will use ${semanticResolved.label}.`;
  } else if (editor.captured) {
    status.textContent = `${editor.captured.label} is ready. Complete the shortcut details and save.`;
  } else {
    status.textContent = 'Select Record Key, then press the key or key combination. Escape cancels recording; Tab remains available for navigation.';
  }

  const protectedNative = Boolean(editor.captured && isProtectedNativeKey(editor.captured));
  const conflict = protectedNative ? null : currentKeybindingConflict();
  const nextConflictId = conflict?.id || '';
  if (editor.conflictId !== nextConflictId) {
    editor.conflictId = nextConflictId;
    replaceConflict.checked = false;
  }
  conflictBox.hidden = !conflict;
  replaceConflict.disabled = !conflict;
  conflictMessage.textContent = conflict
    ? `${editor.captured.label} is already assigned to “${resolveKeybindingForCurrentCharacter(conflict).label || conflict.command}”. Confirm replacement to save this shortcut.`
    : '';

  if (protectedNative) {
    status.textContent = `${editor.captured.label} is reserved for native editing, navigation, or assistive technology and cannot be assigned.`;
  }

  const commandReady = clientReviewMode || Boolean(String(command.value || '').trim());
  const semanticReady = !semanticMode || Boolean(editor.semanticId && semanticResolved?.available);
  save.disabled = !editor.captured || protectedNative || !commandReady || !semanticReady
    || Boolean(conflict && !replaceConflict.checked);
}

function renderKeybindings() {
  const enabled = $('#keybindings-enabled');
  const list = $('#keybinding-list');
  const empty = $('#keybinding-empty');
  const status = $('#keybinding-status');
  const removePreset = $('#keybinding-remove-numpad');
  const removeReaderPreset = $('#reader-hotkeys-remove');
  if (!enabled || !list || !empty || !status) return;

  state.keybindings = normalizeKeybindingState(state.keybindings);
  enabled.checked = state.keybindings.enabled !== false;
  list.replaceChildren();
  empty.hidden = state.keybindings.bindings.length > 0;

  const presetId = String(keybindingApi.NUMPAD_MOVEMENT_PRESET_ID || 'numpad-movement');
  const presetInstalled = state.keybindings.bindings.some((record) => record.preset === presetId);
  if (removePreset) removePreset.disabled = !presetInstalled;
  const readerPresetId = String(readerPresetsApi.READER_HOTKEY_PRESET_ID || 'reader-accessibility');
  const readerPresetInstalled = state.keybindings.bindings.some((record) => record.preset === readerPresetId);
  if (removeReaderPreset) removeReaderPreset.disabled = !readerPresetInstalled;

  const count = state.keybindings.bindings.length;
  status.textContent = count === 0
    ? 'No keyboard shortcuts configured.'
    : `${count.toLocaleString()} keyboard shortcut${count === 1 ? '' : 's'} configured${state.keybindings.enabled ? '.' : ', currently disabled.'}`;

  for (const record of state.keybindings.bindings) {
    const row = document.createElement('div');
    row.className = 'quick-command-list-item';
    row.dataset.keybindingId = record.id;
    row.setAttribute('role', 'listitem');
    const resolution = resolveKeybindingForCurrentCharacter(record);
    row.setAttribute('aria-disabled', String(record.enabled === false || resolution.available === false));

    const copy = document.createElement('div');
    copy.className = 'quick-command-list-copy';
    const label = document.createElement('strong');
    const kind = record.preset === presetId
      ? 'Numpad movement preset'
      : (record.preset === readerPresetId ? 'Reader hotkey preset' : resolution.kind);
    const unavailable = resolution.available === false ? ' — Unavailable' : '';
    label.textContent = `${record.label} — ${record.group || 'General'} — ${kind}${record.worksWhileTyping ? ' — Fires while typing' : ''}${record.enabled === false ? ' — Disabled' : ''}${unavailable}`;
    const command = document.createElement('code');
    command.textContent = resolution.available === false
      ? (resolution.reason || record.command)
      : (resolution.clientAction
        ? resolution.detail
        : `${resolution.command}${resolution.detail ? ` — ${resolution.detail}` : ''}`);
    copy.append(label, command);

    const actions = document.createElement('div');
    actions.className = 'quick-command-list-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.textContent = (record.preset === presetId || record.preset === readerPresetId) ? 'Customize' : 'Edit';
    edit.setAttribute('aria-label', `${edit.textContent} keyboard shortcut ${record.label}`);
    edit.addEventListener('click', () => editKeybinding(record.id));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete keyboard shortcut ${record.label}`);
    remove.addEventListener('click', () => deleteKeybinding(record.id));
    actions.append(edit, remove);
    row.append(copy, actions);
    list.append(row);
  }
  renderKeybindingEditor();
  renderServerControlsSummary();
}

function updateKeybindings(next, options = {}) {
  state.keybindings = normalizeKeybindingState(next);
  renderKeybindings();
  if (options.persist !== false) schedulePersistentSettingsSave();
  if (options.announcement) announce(options.announcement, { force: true });
}

function installNumpadMovementBindings() {
  if (typeof keybindingApi.installNumpadMovementPreset !== 'function') return;
  updateKeybindings(keybindingApi.installNumpadMovementPreset(state.keybindings), {
    announcement: 'Numpad movement keyboard shortcuts installed.'
  });
}

function removeNumpadMovementBindings() {
  if (typeof keybindingApi.removeNumpadMovementPreset !== 'function') return;
  updateKeybindings(keybindingApi.removeNumpadMovementPreset(state.keybindings), {
    announcement: 'Numpad movement keyboard shortcuts removed.'
  });
}

function setReaderPresetStatus(message) {
  const status = $('#reader-preset-status');
  if (status && message) status.textContent = String(message);
}

function installReaderAccessibilityBindings() {
  if (typeof readerPresetsApi.installReaderHotkeyPreset !== 'function') return false;
  const result = readerPresetsApi.installReaderHotkeyPreset(state.keybindings, keybindingApi);
  const installed = Array.isArray(result?.installed) ? result.installed.length : 0;
  const skipped = Array.isArray(result?.skipped) ? result.skipped.length : 0;
  const conflictText = skipped
    ? ` ${skipped} proposed key${skipped === 1 ? '' : 's'} already had a shortcut and were left unchanged.`
    : '';
  updateKeybindings(result.settings, {
    announcement: `Reader hotkeys installed: ${installed} of 12.${conflictText}`
  });
  setReaderPresetStatus(`Reader hotkeys: ${installed} installed, ${skipped} existing assignment${skipped === 1 ? '' : 's'} preserved. F5 Vitals, F6 Mute, F7 Stop speech, F8/F9 Previous/Next history message, F10 Latest, Shift+F10 Last Tell, Alt+Up/Down categories, Alt+Left/Right messages, Alt+End Latest. macOS keeps Option+Left/Right for native word navigation; F8/F9 remain available there.`);
  return true;
}

function removeReaderAccessibilityBindings() {
  if (typeof readerPresetsApi.removeReaderHotkeyPreset !== 'function') return false;
  const result = readerPresetsApi.removeReaderHotkeyPreset(state.keybindings, keybindingApi);
  updateKeybindings(result.settings, {
    announcement: `Reader hotkeys removed: ${Number(result.removed) || 0}.`
  });
  setReaderPresetStatus('Reader Hotkey preset removed. Your other keyboard shortcuts were not changed.');
  return true;
}

function resetKeybindingEditor(options = {}) {
  state.keybindingEditor = { open: false, editId: '', recording: false, captured: null, conflictId: '', semanticType: 'raw', semanticId: '' };
  const form = $('#keybinding-form');
  if (form) form.reset();
  const enabled = $('#keybinding-editor-enabled');
  const worksWhileTyping = $('#keybinding-works-while-typing');
  if (enabled) enabled.checked = true;
  if (worksWhileTyping) worksWhileTyping.checked = false;
  renderKeybindingEditor();
  if (options.focusAdd) scheduleFrame(() => $('#keybinding-add')?.focus({ preventScroll: true }));
}

function openKeybindingEditor(record = null) {
  const captured = record ? {
    code: record.code,
    modifiers: { ...record.modifiers },
    signature: record.signature,
    label: record.label,
    location: record.location
  } : null;
  const semantic = semanticReferenceForBinding(record || {});
  state.keybindingEditor = {
    open: true,
    editId: record?.id || '',
    recording: false,
    captured,
    conflictId: '',
    semanticType: semantic?.type || 'raw',
    semanticId: semantic?.id || ''
  };
  const command = $('#keybinding-command');
  const group = $('#keybinding-group');
  const enabled = $('#keybinding-editor-enabled');
  const worksWhileTyping = $('#keybinding-works-while-typing');
  const replace = $('#keybinding-replace-conflict');
  if (command) command.value = record?.command || '';
  if (group) group.value = record?.group || 'General';
  if (enabled) enabled.checked = record?.enabled !== false;
  if (worksWhileTyping) worksWhileTyping.checked = record?.worksWhileTyping === true;
  if (replace) replace.checked = false;
  renderKeybindingEditor();
  $('#keybinding-form')?.scrollIntoView?.({ block: 'nearest' });
  scheduleFrame(() => {
    const target = record
      ? (semantic ? $('#keybinding-semantic-id') : command)
      : $('#keybinding-record');
    target?.focus({ preventScroll: true });
  });
}

function addKeybinding() {
  openKeybindingEditor();
}

function editKeybinding(id) {
  const record = state.keybindings.bindings.find((candidate) => candidate.id === id);
  if (record) openKeybindingEditor(record);
}

function beginKeybindingRecording() {
  if (!state.keybindingEditor.open) openKeybindingEditor();
  state.keybindingEditor.recording = true;
  state.keybindingEditor.conflictId = '';
  const replace = $('#keybinding-replace-conflict');
  if (replace) replace.checked = false;
  renderKeybindingEditor();
  announce('Keyboard shortcut recording started. Press a key or key combination.', { force: true });
}

function stopKeybindingRecording(message = 'Keyboard shortcut recording cancelled.') {
  if (!state.keybindingEditor.recording) return;
  state.keybindingEditor.recording = false;
  renderKeybindingEditor();
  announce(message, { force: true });
}

function captureKeybindingEditorKeydown(event) {
  if (!state.keybindingEditor.open || !state.keybindingEditor.recording) return false;
  if (event.code === 'Escape' || event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    stopKeybindingRecording();
    return true;
  }
  if (event.code === 'Tab' || event.key === 'Tab') {
    stopKeybindingRecording('Recording stopped. Tab remains available for Preferences navigation.');
    return false;
  }
  const captured = typeof keybindingApi.captureKeyFromEvent === 'function'
    ? keybindingApi.captureKeyFromEvent(event)
    : null;
  if (captured && isProtectedNativeKey(captured)) {
    state.keybindingEditor.recording = false;
    state.keybindingEditor.captured = captured;
    state.keybindingEditor.conflictId = '';
    renderKeybindingEditor();
    announce(`${captured.label} is reserved for native editing, navigation, or assistive technology and will pass through to the system.`, { force: true });
    return false;
  }
  if (!captured) {
    if (/^(?:Control|Alt|Shift|Meta)(?:Left|Right)$/u.test(String(event.code || ''))) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    return false;
  }
  event.preventDefault();
  event.stopPropagation();
  state.keybindingEditor.recording = false;
  state.keybindingEditor.captured = captured;
  state.keybindingEditor.conflictId = '';
  const replace = $('#keybinding-replace-conflict');
  if (replace) replace.checked = false;
  renderKeybindingEditor();
  scheduleFrame(() => {
    const target = state.keybindingEditor.semanticType === 'raw'
      ? $('#keybinding-command')
      : $('#keybinding-semantic-id');
    target?.focus({ preventScroll: true });
  });
  announce(`${captured.label} recorded.`, { force: true });
  return true;
}

function saveKeybindingEditor() {
  const editor = state.keybindingEditor;
  const semanticType = String(editor.semanticType || 'raw');
  const semanticMode = semanticType !== 'raw';
  const semanticResolved = semanticMode && editor.semanticId
    ? resolveSemanticReferenceForCurrentCharacter({ type: semanticType, id: editor.semanticId })
    : null;
  const clientReviewMode = Boolean(semanticResolved?.clientAction);
  const commandValue = semanticMode
    ? String(semanticResolved?.command || '')
    : String($('#keybinding-command')?.value || '');
  const groupValue = String($('#keybinding-group')?.value || 'General');
  const enabledValue = $('#keybinding-editor-enabled')?.checked !== false;
  const worksWhileTypingValue = $('#keybinding-works-while-typing')?.checked === true;
  const conflict = currentKeybindingConflict();
  if (!editor.open || !editor.captured || (!clientReviewMode && !commandValue.trim())) {
    const message = semanticMode
      ? (semanticResolved?.reason || 'Choose an available shortcut action before saving.')
      : 'Record a key and enter a command before saving the shortcut.';
    announce(message, { force: true });
    return;
  }
  if (isProtectedNativeKey(editor.captured)) {
    announce(`${editor.captured.label} is reserved for native editing, navigation, or assistive technology and cannot be assigned.`, { force: true });
    renderKeybindingEditor();
    return;
  }
  if (semanticMode && semanticResolved?.available !== true) {
    announce(semanticResolved?.reason || 'That server control is not currently available.', { force: true });
    renderKeybindingEditor();
    return;
  }
  if (conflict && !$('#keybinding-replace-conflict')?.checked) {
    announce('Confirm replacement of the existing shortcut before saving.', { force: true });
    renderKeybindingEditor();
    return;
  }
  const existing = state.keybindings.bindings.find((record) => record.id === editor.editId) || null;
  const maxBindings = Number(keybindingApi.MAX_KEYBINDINGS) || 256;
  if (!existing && !conflict && state.keybindings.bindings.length >= maxBindings) {
    announce(`The maximum of ${maxBindings} keyboard shortcuts has been reached.`, { force: true });
    return;
  }
  const candidate = typeof keybindingApi.normalizeBinding === 'function'
    ? keybindingApi.normalizeBinding({
      id: existing?.id || newKeybindingId(),
      code: editor.captured.code,
      modifiers: editor.captured.modifiers,
      location: editor.captured.location,
      label: editor.captured.label,
      command: commandValue,
      group: groupValue,
      preset: '',
      semantic: semanticMode ? { type: semanticType, id: semanticResolved.id } : null,
      enabled: enabledValue,
      allowRepeat: existing?.allowRepeat === true,
      worksWhileTyping: worksWhileTypingValue
    })
    : null;
  if (!candidate) {
    announce('That keyboard shortcut could not be saved.', { force: true });
    return;
  }

  const current = state.keybindings.bindings;
  const insertionIndex = existing ? current.findIndex((record) => record.id === existing.id) : current.length;
  const next = current.filter((record) => record.id !== editor.editId && record.id !== conflict?.id);
  next.splice(Math.min(Math.max(0, insertionIndex), next.length), 0, candidate);
  const action = existing ? 'saved' : 'added';
  const resolvedLabel = semanticMode ? semanticResolved.label : candidate.label;
  resetKeybindingEditor();
  updateKeybindings({ enabled: state.keybindings.enabled, bindings: next }, {
    announcement: `${resolvedLabel} keyboard shortcut ${action}.`
  });
}

function deleteKeybinding(id) {
  const record = state.keybindings.bindings.find((candidate) => candidate.id === id);
  if (!record) return;
  if (state.keybindingEditor.editId === id) resetKeybindingEditor();
  updateKeybindings({
    enabled: state.keybindings.enabled,
    bindings: state.keybindings.bindings.filter((candidate) => candidate.id !== id)
  }, { announcement: `${record.label} keyboard shortcut deleted.` });
}

function editableTargetBlocksKeybinding(target) {
  if (!(target instanceof window.HTMLElement)) return false;
  if (target === commandInput) {
    if (!commandInput.value) return false;
    return commandInput.selectionStart !== 0 || commandInput.selectionEnd !== commandInput.value.length;
  }
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function keybindingUiIsBlocking() {
  return state.remoteEcho
    || state.disconnectModal.open
    || state.closeSessionModal.open
    || (preferencesOverlay && !preferencesOverlay.hidden)
    || (knowledgeOverlay && !knowledgeOverlay.hidden);
}

function editableTargetBlocksMacro(target) {
  if (!(target instanceof window.HTMLElement)) return false;
  if (target === commandInput) return editableTargetBlocksKeybinding(target);
  if (terminalOutputHost?.contains(target)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

async function executeMacro(record) {
  const commands = Array.isArray(record?.commands) && record.commands.length
    ? record.commands
    : String(record?.command || '').split(';').map((entry) => entry.trim()).filter(Boolean);
  if (commands.length) {
    await sendCommand(commands.join(';'), { preserveInput: true, recordHistory: false });
  }
  returnOutputToLive();
}

function executeClientReviewAction(semantic = {}) {
  const type = String(semantic?.type || '').trim().toLowerCase();
  const id = String(semantic?.id || '').trim().toLowerCase();
  const recallMatch = id.match(/^recall-([1-9])$/u);
  if (type === 'reader-history') {
    if (id === 'category-previous') readerHistoryPreviousCategory();
    else if (id === 'category-next') readerHistoryNextCategory();
    else if (id === 'current') readerHistoryCurrent();
    else if (id === 'previous') readerHistoryPrevious();
    else if (id === 'next') readerHistoryNext();
    else if (id === 'latest') readerHistoryLatest();
    else if (recallMatch) readerHistoryRecall(Number(recallMatch[1]));
    else return false;
    return true;
  }
  if (type === 'reader-review') {
    if (id === 'current') reviewCurrentLine();
    else if (id === 'previous') reviewPreviousLine();
    else if (id === 'next') reviewNextLine();
    else if (id === 'latest') reviewLatestLine();
    else if (recallMatch) recallReaderLine(Number(recallMatch[1]));
    else return false;
    return true;
  }
  if (type === 'communications-review') {
    if (id === 'current') reviewCurrentCommunication();
    else if (id === 'older') reviewOlderCommunication();
    else if (id === 'newer') reviewNewerCommunication();
    else if (id === 'latest') reviewLatestCommunication();
    else if (recallMatch) recallCommunication(Number(recallMatch[1]));
    else if (id === 'last-tell') recallLastTell();
    else if (id === 'last-communication') recallLastCommunication();
    else return false;
    return true;
  }
  if (type === 'accessibility' && id === 'read-vitals') {
    readVitals();
    return true;
  }
  if (type === 'accessibility' && id === 'copy-reviewed') {
    void copyReviewedText();
    return true;
  }
  if (type === 'accessibility' && id === 'read-health') {
    readSingleVital('health');
    return true;
  }
  if (type === 'accessibility' && id === 'read-mana') {
    readSingleVital('mana');
    return true;
  }
  if (type === 'accessibility' && id === 'read-movement') {
    readSingleVital('movement');
    return true;
  }
  if (type === 'accessibility' && id === 'toggle-sound-triggers') {
    setSoundTriggersEnabled(soundTriggerSnapshot().enabled === false);
    return true;
  }
  if (type === 'accessibility' && id === 'toggle-audio-cues') {
    setAudioCuesEnabled(!state.accessibility.audioCuesEnabled);
    return true;
  }
  if (type === 'accessibility' && id === 'mute-audio-cues') {
    setAudioCuesMuted(true);
    return true;
  }
  if (type === 'accessibility' && id === 'unmute-audio-cues') {
    setAudioCuesMuted(false);
    return true;
  }
  if (type === 'accessibility' && id === 'toggle-audio-cue-mute') {
    setAudioCuesMuted(!state.accessibility.audioCuesMuted);
    return true;
  }
  if (type === 'accessibility' && id === 'test-audio-cue') {
    testAudioCue('hit');
    return true;
  }
  if (type === 'accessibility' && id === 'stop-audio-cues') {
    stopAudioCues();
    return true;
  }
  if (type === 'accessibility' && id === 'stop-self-voice') {
    stopSelfVoiceNow();
    return true;
  }
  if (type === 'accessibility' && id === 'mute-self-voice') {
    setSelfVoiceMuted(true);
    return true;
  }
  if (type === 'accessibility' && id === 'unmute-self-voice') {
    setSelfVoiceMuted(false);
    return true;
  }
  if (type === 'accessibility' && id === 'toggle-self-voice-mute') {
    setSelfVoiceMuted(!state.accessibility.selfVoiceMuted);
    return true;
  }
  if (type === 'accessibility' && id === 'toggle-self-voice-follow') {
    setSelfVoiceFollowMode(!state.accessibility.selfVoiceFollowMode);
    return true;
  }
  if (type === 'accessibility' && id === 'toggle-self-voice-priority-alerts') {
    setSelfVoicePriorityAlertsEnabled(!state.accessibility.selfVoicePriorityAlertsEnabled);
    return true;
  }
  if (type === 'accessibility' && id === 'toggle-reader-workspace') {
    setReaderWorkspaceEnabled(!state.accessibility.readerWorkspaceEnabled);
    return true;
  }
  return false;
}

function handleKeybindingKeydown(event) {
  if (captureKeybindingEditorKeydown(event)) return true;
  if (keybindingUiIsBlocking()) return false;
  if (isProtectedNativeKey(event)) return false;
  const macro = editableTargetBlocksMacro(event.target)
    ? null
    : (sessionDisplayEngines(activeSessionRecord()).macro?.findForEvent?.(event) || null);
  if (macro) {
    event.preventDefault();
    event.stopPropagation();
    traceDisplayPipeline('macro', () => `${macro.key || macro.label || 'key'} => ${macro.command || (macro.commands || []).join('; ')}`);
    void executeMacro(macro).catch((error) => {
      appendSystemMessage(`Macro failed: ${error?.message || error}`, 'error');
    });
    return true;
  }
  const binding = typeof keybindingApi.findBindingForEvent === 'function'
    ? keybindingApi.findBindingForEvent(state.keybindings, event)
    : null;
  if (!binding) return false;
  const resolved = resolveKeybindingForCurrentCharacter(binding);
  const semantic = semanticReferenceForBinding(binding);
  const clientReview = isClientReviewSemantic(semantic);
  if (editableTargetBlocksKeybinding(event.target) && binding.worksWhileTyping !== true) return false;
  event.preventDefault();
  event.stopPropagation();
  if (resolved.available === false || (!resolved.command && !clientReview)) {
    announce(resolved.reason || 'That keyboard shortcut is not available for the current character.', { force: true });
    if (!clientReview) void refreshNukeFireControls({ announce: false });
    return true;
  }
  if (clientReview) {
    traceDisplayPipeline('keybinding-review', () => `${binding.label || binding.code} => ${resolved.label}`);
    executeClientReviewAction(semantic);
    return true;
  }
  void sendCommand(resolved.command, {
    preserveInput: true,
    recordHistory: false
  }).then(() => {
    if (binding.semantic) {
      setTimeout(() => void refreshNukeFireControls({ announce: false }), 150);
    }
  });
  returnOutputToLive();
  return true;
}

function openQuickCommandPreferences() {
  openPreferences({
    category: 'quick-commands',
    focusTarget: '#quick-command-label'
  });
}

function showTerminalRecovery(message = 'xterm.js could not initialize. The connection and reader text remain available.') {
  if (terminalRecoveryMessage) terminalRecoveryMessage.textContent = message;
  if (terminalRecovery) terminalRecovery.hidden = false;
  xtermOutput?.setAttribute('aria-hidden', 'true');
}

function hideTerminalRecovery() {
  if (terminalRecovery) terminalRecovery.hidden = true;
  xtermOutput?.removeAttribute('aria-hidden');
}

function resolveTerminalLink(uri) {
  if (typeof osc8LinksApi.resolveOsc8Uri !== 'function') {
    return { available: false, reason: 'OSC 8 links are unavailable in this client build.' };
  }
  return osc8LinksApi.resolveOsc8Uri(uri);
}

async function activateTerminalLink(payload = {}) {
  const resolved = resolveTerminalLink(payload.uri);
  if (!resolved.available || resolved.kind === 'close') {
    announce(resolved.reason || 'That terminal link is unavailable.', { force: true });
    return false;
  }

  if (resolved.kind === 'external') {
    if (typeof window.nukefire.openExternalLink !== 'function') {
      announce('Opening external links is unavailable in this client build.', { force: true });
      return false;
    }
    const result = await window.nukefire.openExternalLink(resolved.value);
    if (result?.ok === false) {
      appendSystemMessage(result.error || 'The web link could not be opened.', 'error');
      return false;
    }
    announce('Web link opened in your default browser.', { force: true });
    return true;
  }

  if (resolved.kind === 'prompt') {
    if (state.remoteEcho) {
      announce('A command link cannot replace hidden password input.', { force: true });
      return false;
    }
    commandInput.value = resolved.value;
    const record = activeSessionRecord();
    if (record) record.commandDraft = resolved.value;
    focusCommand({ preserveSelection: true });
    commandInput.setSelectionRange(resolved.value.length, resolved.value.length);
    announce(`Command placed in input: ${resolved.value}`, { force: true });
    return true;
  }

  if (resolved.kind === 'send') {
    const command = resolved.value.trim();
    if (isClientCommandText(command)) {
      announce('Server links cannot execute NukeFire Client management commands.', { force: true });
      return false;
    }
    await sendCommandAndRefocus(command);
    announce(`Link command sent: ${command}`, { force: true });
    return true;
  }

  announce('That terminal link type is not supported.', { force: true });
  return false;
}

function configureXtermAdapter() {
  if (!xtermAdapter?.ready) return false;
  xtermAdapter.setTheme({
    foreground: state.terminalTheme.foreground,
    background: state.terminalTheme.background
  }, state.terminalTheme.monochrome);
  xtermAdapter.setFontSize(Number($('#font-size')?.value) || 16, { fit: false });
  xtermAdapter.setFontFamily?.(TERMINAL_FONT_FAMILIES[state.terminalFont] || TERMINAL_FONT_FAMILIES.menlo, state.terminalFont, { fit: false });
  xtermAdapter.setCompact(Boolean($('#compact-output')?.checked));
  xtermAdapter.setScreenReaderMode(state.accessibility.screenReaderMode);
  return true;
}

function ensureXtermAdapter(options = {}) {
  if (xtermAdapter?.ready) {
    hideTerminalRecovery();
    return true;
  }
  if (xtermInitializationBlocked && !options.forceRetry) {
    showTerminalRecovery();
    return false;
  }
  if (typeof xtermApi.XtermTerminalAdapter !== 'function' || !xtermOutput) {
    showTerminalRecovery('xterm.js is unavailable in this build. The connection and reader text remain available.');
    return false;
  }
  try {
    xtermAdapter = new xtermApi.XtermTerminalAdapter({
      container: xtermOutput,
      theme: {
        foreground: state.terminalTheme.foreground,
        background: state.terminalTheme.background
      },
      monochrome: state.terminalTheme.monochrome,
      fontSize: Number($('#font-size')?.value) || 16,
      fontFamily: TERMINAL_FONT_FAMILIES[state.terminalFont] || TERMINAL_FONT_FAMILIES.menlo,
      fontProfile: state.terminalFont,
      compact: Boolean($('#compact-output')?.checked),
      screenReaderMode: state.accessibility.screenReaderMode,
      scrollback: 100_000,
      onScroll: (atLiveBottom) => {
        state.terminalRender.atLiveBottom = Boolean(atLiveBottom);
      },
      onLinkActivate: (payload) => { void activateTerminalLink(payload); },
      onLinkHover: ({ description }) => {
        if (terminalOutputHost && description) terminalOutputHost.dataset.linkDescription = description;
      },
      onLinkLeave: () => {
        if (terminalOutputHost) delete terminalOutputHost.dataset.linkDescription;
      }
    });
    if (!xtermAdapter.initialize()) {
      xtermAdapter = null;
      xtermInitializationBlocked = true;
      showTerminalRecovery();
      return false;
    }
  } catch (error) {
    console.error('xterm.js initialization failed:', error);
    xtermAdapter = null;
    xtermInitializationBlocked = true;
    showTerminalRecovery();
    return false;
  }
  xtermInitializationBlocked = false;
  hideTerminalRecovery();
  configureXtermAdapter();
  return true;
}

function initializeTerminal(options = {}) {
  const ready = ensureXtermAdapter({ forceRetry: Boolean(options.forceRetry) });
  updateRenderedLineCount(activeSessionRecord()?.lines || state.lines);
  if (!ready) {
    if (options.announceChange !== false) {
      announce('xterm.js could not initialize. The live connection and reader text remain available. Use Retry Terminal.', { force: true });
    }
    return false;
  }
  xtermAdapter.replaceRuns(activeSessionRecord()?.outputRuns || [], {
    monochrome: state.terminalTheme.monochrome,
    follow: true
  });
  scheduleFrame(() => {
    xtermAdapter.fit();
    xtermAdapter.scrollToBottom();
    scheduleTerminalSizeUpdate();
  });
  if (options.announceChange) announce('xterm.js terminal ready.', { force: true });
  return true;
}

function createSessionRecord(meta = {}) {
  if (typeof sessionRuntimeApi.createSessionRuntime === 'function') {
    return sessionRuntimeApi.createSessionRuntime(meta, {
      ansiApi: window.NukeFireAnsi,
      highlightApi,
      communicationsApi,
      contextApi,
      affectsApi,
      mobInspectorApi,
      readerReviewApi,
      readerHistoryApi,
      readerSafetyApi,
      channelIds: COMMUNICATION_CHANNEL_IDS,
      maxCharacters: state.maxCharacters
    });
  }

  return {
    id: String(meta.id || 'main'),
    name: String(meta.name || meta.id || 'Main'),
    role: String(meta.role || 'member'),
    characterName: String(meta.characterName || ''),
    host: String(meta.host || 'tdome.nukefire.org'),
    port: Number(meta.port) || 4000,
    status: meta.status || { state: 'disconnected', message: 'Disconnected' },
    connected: Boolean(meta.connected),
    remoteEcho: false,
    history: [], historyIndex: null, historyPrefix: '', draft: '', commandDraft: '',
    lines: 0, plainText: '', readerCarry: '', lastCompleteLine: '',
    readerReview: typeof readerReviewApi.ReaderReviewBuffer === 'function'
      ? new readerReviewApi.ReaderReviewBuffer({ maxCharacters: state.maxCharacters })
      : null,
    readerHistory: typeof readerHistoryApi.ReaderHistory === 'function'
      ? new readerHistoryApi.ReaderHistory()
      : null,
    readerSafety: typeof readerSafetyApi.ReaderSafetyLane === 'function'
      ? new readerSafetyApi.ReaderSafetyLane({ enabled: state.accessibility.readerSafetyAlertsEnabled })
      : null,
    promptBoundaryCount: 0, promptBoundaryType: 'ga', dockedPrompt: { rawText: '', plainText: '', runs: [], boundaryType: 'ga', updatedAt: 0 }, outputRuns: [], outputCharacters: 0,
    ansi: new window.NukeFireAnsi.AnsiParser(), gmcp: null,
    highlightLines: typeof highlightApi.HighlightLineBuffer === 'function'
      ? new highlightApi.HighlightLineBuffer()
      : { push: (value) => [String(value || '')], flush: () => '', reset: () => {} },
    protocol: {
      gmcpMessages: 0, terminalType: '', charset: '', windowSize: null, newEnvironment: null,
      compression: { protocol: '', algorithm: '', active: false, wireBytes: 0, inflatedBytes: 0 }
    },
    pipelineDebug: {
      enabled: meta.pipelineDebug?.enabled === true,
      maxEntries: Number(meta.pipelineDebug?.maxEntries) || DEFAULT_PIPELINE_DEBUG.maxEntries,
      entries: []
    },
    communications: {
      messages: [],
      unread: Object.fromEntries(COMMUNICATION_CHANNEL_IDS.filter((id) => id !== 'all').map((id) => [id, 0])),
      nextId: 1,
      review: typeof communicationsReviewApi.CommunicationReviewCursor === 'function'
        ? new communicationsReviewApi.CommunicationReviewCursor()
        : null,
      lineBuffer: typeof communicationsApi.CommunicationLineBuffer === 'function'
        ? new communicationsApi.CommunicationLineBuffer()
        : { push: () => [], flush: () => [], reset: () => {} },
      lastTell: null,
      followLiveEdge: true
    },
    mapper: { pendingMove: null, pendingMoves: [], movementRoomsSincePrompt: 0, lastRoomId: '', liveSnapshot: null, liveSignature: '', liveStateReady: false, gpsCatalogAnnouncementVersion: 0 },
    affects: {
      snapshot: normalizeAffectsSnapshot({}), receivedAtMs: 0, signature: '', renderSignature: '', renderDirty: false,
      timer: null, expandedKeys: [], lastAnnouncedRevision: 0
    },
    lootHistory: { events: [], filter: 'all', nextId: 1, visibleLimit: 250 },
    mobInspector: {
      snapshot: normalizeMobInspectorSnapshot({}), receivedAtMs: 0, signature: '',
      roomId: '', mode: 'expanded', lastOpponentKey: '', combatRefreshKey: '', liveHealthSignature: '',
      lastTargetAffectsRequestMs: 0, pendingCombatKillRefresh: false, lastCombatKillRefreshMs: 0,
      renderDirty: false, summaryIdentityText: '', summaryConsiderText: '', effectGroupCount: 0
    },
    contextDeck: { snapshot: normalizeContextSnapshot({}), lastPrimaryId: '', signature: '', renderDirty: false, refreshTimer: null },
    vitals: { hp: null, maxHp: null, mana: null, maxMana: null, move: null, maxMove: null },
    unreadOutput: 0,
    maxCharacters: state.maxCharacters
  };
}

function ensureSessionRecord(meta = {}) {
  const id = String(meta.id || '');
  if (!id) return null;
  let record = state.sessions.records[id];
  if (!record) {
    record = createSessionRecord(meta);
    state.sessions.records[id] = record;
  } else if (typeof sessionRuntimeApi.updateSessionMeta === 'function') {
    sessionRuntimeApi.updateSessionMeta(record, meta);
  } else {
    Object.assign(record, meta);
  }
  if (!record.pipelineDebug || typeof record.pipelineDebug !== 'object') {
    record.pipelineDebug = { ...DEFAULT_PIPELINE_DEBUG, entries: [] };
  }
  if (!record.dockedPrompt || typeof record.dockedPrompt !== 'object') {
    record.dockedPrompt = { rawText: '', plainText: '', runs: [], boundaryType: 'ga', updatedAt: 0 };
  }
  if (meta.pipelineDebug && typeof meta.pipelineDebug === 'object') {
    record.pipelineDebug.enabled = meta.pipelineDebug.enabled === true;
    record.pipelineDebug.maxEntries = Number(meta.pipelineDebug.maxEntries) || DEFAULT_PIPELINE_DEBUG.maxEntries;
    if (!Array.isArray(record.pipelineDebug.entries)) record.pipelineDebug.entries = [];
    if (record.pipelineDebug.entries.length > record.pipelineDebug.maxEntries) {
      record.pipelineDebug.entries.splice(0, record.pipelineDebug.entries.length - record.pipelineDebug.maxEntries);
    }
  }
  if (!record.tintin) applyTinTinStateToRecord(record, meta.tintin || {});
  else if (meta.tintin && typeof meta.tintin === 'object') applyTinTinStateToRecord(record, meta.tintin);
  else if (!record.tintinEngines) record.tintinEngines = createSessionTinTinEngines(record.tintin);
  return record;
}

function activeSessionRecord() {
  return state.sessions.records[state.sessions.activeId] || null;
}

function outputRunKey(run = {}) {
  if (typeof sessionRuntimeApi.outputRunKey === 'function') return sessionRuntimeApi.outputRunKey(run);
  const kind = run.kind || 'mud';
  if (kind === 'error' || kind === 'system') return kind;
  const style = run.style || {};
  const link = String(run.link || '');
  return `${kind}|link:${link}|${OUTPUT_STYLE_KEYS.map((key) => `${key}:${String(style[key] ?? '')}`).join('|')}`;
}

function normalizeOutputRun(run = {}) {
  return {
    text: String(run.text || ''),
    style: run.style ? { ...run.style } : null,
    kind: run.kind || 'mud',
    link: String(run.link || '') || null,
    key: run.key || outputRunKey(run)
  };
}

function cancelPendingTerminalFrame() {
  if (state.terminalRender.frame === null) return;
  cancelFrame(state.terminalRender.frame);
  state.terminalRender.frame = null;
}

function cancelPendingIdleFlush() {
  if (state.terminalRender.idleFlushTimer === null) return;
  clearTimeout(state.terminalRender.idleFlushTimer);
  state.terminalRender.idleFlushTimer = null;
}

function resetPendingTerminalRender() {
  cancelPendingTerminalFrame();
  cancelPendingIdleFlush();
  state.terminalRender.pendingRuns = [];
  state.terminalRender.pendingBatches = 0;
  state.terminalRender.pendingCharacters = 0;
  state.terminalRender.followRequested = false;
  state.terminalRender.deferredLineBreak = null;
}

function updateRenderedLineCount(value = state.lines) {
  const numeric = Math.max(0, Number(value) || 0);
  if (state.terminalRender.lastLineCount === numeric) return;
  state.terminalRender.lastLineCount = numeric;
  lineCount.textContent = `${numeric.toLocaleString()} lines`;
}

function resetTerminalScrollDiagnostics() {
  state.terminalRender.diagnostics = {
    lastFlushAt: 0,
    continuousGapSamples: 0,
    continuousGapLastMs: 0,
    continuousGapMaxMs: 0,
    continuousGapTotalMs: 0,
    flushCharactersLast: 0,
    flushCharactersMax: 0,
    flushCharactersTotal: 0,
    measuredFlushes: 0
  };
}

function noteTerminalScrollFlush(now, characters) {
  const diagnostics = state.terminalRender.diagnostics;
  const current = Math.max(0, Number(now) || 0);
  const count = Math.max(0, Number(characters) || 0);
  if (diagnostics.lastFlushAt > 0 && current >= diagnostics.lastFlushAt) {
    const gap = current - diagnostics.lastFlushAt;
    // Only characterize a continuous-output cadence. Idle gameplay gaps are not
    // scroll jitter and would make the diagnostic meaningless.
    if (gap <= 100) {
      diagnostics.continuousGapSamples += 1;
      diagnostics.continuousGapLastMs = gap;
      diagnostics.continuousGapMaxMs = Math.max(diagnostics.continuousGapMaxMs, gap);
      diagnostics.continuousGapTotalMs += gap;
    }
  }
  diagnostics.lastFlushAt = current;
  diagnostics.flushCharactersLast = count;
  diagnostics.flushCharactersMax = Math.max(diagnostics.flushCharactersMax, count);
  diagnostics.flushCharactersTotal += count;
  diagnostics.measuredFlushes += 1;
}

function flushTerminalOutput() {
  const monitorStartedAt = longSessionMonitor?.active ? performance.now() : 0;
  cancelPendingTerminalFrame();
  cancelPendingIdleFlush();
  const wasAtLiveBottom = isNearBottom();
  const pending = state.terminalRender.pendingRuns;
  const pendingCharacters = state.terminalRender.pendingCharacters;
  const shouldFollow = state.terminalRender.followRequested;
  state.terminalRender.pendingRuns = [];
  state.terminalRender.pendingBatches = 0;
  state.terminalRender.pendingCharacters = 0;
  state.terminalRender.followRequested = false;

  if (pending.length > 0 && isXtermActive()) {
    xtermAdapter.writeRuns(pending, {
      monochrome: state.terminalTheme.monochrome,
      follow: shouldFollow && wasAtLiveBottom
    });
  }
  updateRenderedLineCount(state.lines);
  state.terminalRender.flushCount += 1;
  noteTerminalScrollFlush(performance.now(), pendingCharacters);
  if (monitorStartedAt) longSessionMonitor.noteTerminalFlush(performance.now() - monitorStartedAt);
}

function scheduleTerminalFlush() {
  if (state.terminalRender.frame === null) {
    state.terminalRender.frame = scheduleFrame(() => {
      state.terminalRender.frame = null;
      flushTerminalOutput();
    });
  }

  // Every terminal burst gets the same short latency ceiling. The animation
  // frame remains a coalescing/fallback opportunity, while the xterm adapter
  // owns real write backpressure and bounded adjacent-write coalescing.
  if (state.terminalRender.idleFlushTimer === null) {
    state.terminalRender.idleFlushTimer = setTimeout(() => {
      state.terminalRender.idleFlushTimer = null;
      if (state.terminalRender.frame === null) return;
      flushTerminalOutput();
    }, TERMINAL_IDLE_FLUSH_DELAY_MS);
  }
}

function appendPendingTerminalRun(candidate) {
  const run = normalizeOutputRun(candidate);
  let text = run.text;
  if (!text) return 0;
  let addedCharacters = 0;

  while (text) {
    const previous = state.terminalRender.pendingRuns.at(-1);
    if (previous?.key === run.key && previous.text.length < MAX_TERMINAL_RUN_CHARACTERS) {
      const available = MAX_TERMINAL_RUN_CHARACTERS - previous.text.length;
      const addition = text.slice(0, available);
      previous.text += addition;
      addedCharacters += addition.length;
      text = text.slice(addition.length);
      continue;
    }
    const piece = text.slice(0, MAX_TERMINAL_RUN_CHARACTERS);
    state.terminalRender.pendingRuns.push({ ...run, text: piece });
    addedCharacters += piece.length;
    text = text.slice(piece.length);
  }
  return addedCharacters;
}

function stageTerminalRuns(runs, deferredLineBreak = state.terminalRender.deferredLineBreak) {
  const deferTrailingLineBreak = state.promptDisplayMode !== 'inline';
  if (typeof promptDisplayApi.stagePromptAwareTerminalRuns === 'function') {
    return promptDisplayApi.stagePromptAwareTerminalRuns(runs, deferredLineBreak, {
      deferTrailingLineBreak
    });
  }
  const staged = [];
  if (deferredLineBreak?.text) staged.push(deferredLineBreak);
  staged.push(...(runs || []));
  return { runs: staged, deferredLineBreak: null };
}

function queueTerminalRuns(runs, options = {}) {
  const staged = stageTerminalRuns(runs);
  state.terminalRender.deferredLineBreak = staged.deferredLineBreak;
  let addedCharacters = 0;
  for (const candidate of staged.runs) {
    addedCharacters += appendPendingTerminalRun(candidate);
  }
  if (!addedCharacters) return;
  state.terminalRender.pendingBatches += 1;
  state.terminalRender.pendingCharacters += addedCharacters;
  if (options.follow) state.terminalRender.followRequested = true;
  scheduleTerminalFlush();
}

function renderSessionOutput(record) {
  resetPendingTerminalRender();
  updateRenderedLineCount(record?.lines || 0);
  if (!ensureXtermAdapter()) return;
  configureXtermAdapter();
  const staged = stageTerminalRuns(record?.outputRuns || [], null);
  state.terminalRender.deferredLineBreak = staged.deferredLineBreak;
  xtermAdapter.replaceRuns(staged.runs, {
    monochrome: state.terminalTheme.monochrome,
    follow: true
  });
  scheduleFrame(() => {
    xtermAdapter.fit();
    xtermAdapter.scrollToBottom();
  });
}

function captureActiveSessionState(options = {}) {
  if (options.flushOutput !== false) flushTerminalOutput();
  const record = activeSessionRecord();
  if (!record) return;
  record.connected = state.connected;
  record.remoteEcho = state.remoteEcho;
  record.history = state.history;
  record.historyIndex = state.historyIndex;
  record.historyPrefix = state.historyPrefix;
  record.draft = state.draft;
  record.commandDraft = commandInput.value;
  record.lines = state.lines;
  record.plainText = state.plainText;
  record.readerCarry = state.readerCarry;
  record.lastCompleteLine = state.lastCompleteLine;
  record.promptBoundaryCount = state.promptBoundaryCount;
  record.promptBoundaryType = $('#prompt-boundary')?.dataset.type || record.promptBoundaryType || 'ga';
  record.gmcp = state.gmcp;
  record.protocol = state.protocol;
  record.communications = state.communications;
  record.mapper.pendingMove = state.mapper.pendingMove;
  record.mapper.pendingMoves = state.mapper.pendingMoves;
  record.mapper.movementRoomsSincePrompt = state.mapper.movementRoomsSincePrompt;
  record.mapper.lastRoomId = state.mapper.lastRoomId;
  record.mapper.liveSnapshot = state.mapper.liveSnapshot;
  record.mapper.liveSignature = state.mapper.liveSignature;
  record.mapper.liveStateReady = state.mapper.liveStateReady;
  record.mapper.gpsCatalogAnnouncementVersion = state.mapper.gpsCatalogAnnouncementVersion;
  record.affects = state.affects;
  record.mobInspector = state.mobInspector;
  record.lootHistory = state.lootHistory;
  record.contextDeck = state.contextDeck;
  record.vitals = state.vitals;
  if (!activeTinTinReferencesMatch(record)) {
    const tintin = currentDefinitionSnapshot(record.id);
    applyTinTinStateToRecord(record, tintin, { normalized: true });
    rememberActiveTinTinReferences(record);
  }
  record.host = hostInput.value.trim() || record.host;
  record.port = Number(portInput.value) || record.port;
  record.ansi = ansi;
}

function pipelineDebugEntryText(entry = {}) {
  if (typeof pipelineDebugApi.formatPipelineDebugEntry === 'function') {
    return pipelineDebugApi.formatPipelineDebugEntry(entry);
  }
  return `[${String(entry.stage || 'pipeline')}] ${String(entry.message || '')}`;
}

function appendPipelineDebugEntry(record, entry = {}) {
  if (!record?.pipelineDebug?.enabled) return false;
  const normalized = {
    id: Number(entry.id) || Date.now(),
    timestamp: Number(entry.timestamp) || Date.now(),
    stage: String(entry.stage || 'pipeline').slice(0, 40),
    message: String(entry.message || '').slice(0, 1200)
  };
  if (!normalized.message) return false;
  record.pipelineDebug.entries.push(normalized);
  const maximum = Number(record.pipelineDebug.maxEntries) || DEFAULT_PIPELINE_DEBUG.maxEntries;
  if (record.pipelineDebug.entries.length > maximum) {
    record.pipelineDebug.entries.splice(0, record.pipelineDebug.entries.length - maximum);
  }
  if (record.id === state.sessions.activeId) renderPipelineDebug();
  return true;
}

function renderPipelineDebug() {
  const record = activeSessionRecord();
  const section = $('#pipeline-debug-section');
  const log = $('#pipeline-debug-log');
  const empty = $('#pipeline-debug-empty');
  const status = $('#pipeline-debug-status');
  const enabled = record?.pipelineDebug?.enabled === true;
  if (section) section.hidden = !enabled;
  if (status) status.textContent = enabled
    ? `On · ${(record.pipelineDebug.entries || []).length}/${record.pipelineDebug.maxEntries}`
    : 'Off';
  const enabledControl = $('#pipeline-debug-enabled');
  if (enabledControl) enabledControl.checked = enabled;
  const limitControl = $('#pipeline-debug-limit');
  if (limitControl) limitControl.value = String(record?.pipelineDebug?.maxEntries || DEFAULT_PIPELINE_DEBUG.maxEntries);
  if (!log || !empty) return;
  const entries = Array.isArray(record?.pipelineDebug?.entries) ? record.pipelineDebug.entries : [];
  const fragment = document.createDocumentFragment();
  for (const entry of entries) {
    const item = document.createElement('li');
    const stage = document.createElement('span');
    stage.className = 'pipeline-debug-stage';
    stage.textContent = `[${entry.stage}]`;
    const message = document.createElement('span');
    message.textContent = entry.message;
    item.append(stage, message);
    fragment.append(item);
  }
  log.replaceChildren(fragment);
  empty.hidden = entries.length > 0;
  if (entries.length > 0) log.scrollTop = log.scrollHeight;
  publishPanelPopoutState('protocol');
}

function handlePipelineDebugEvent(record, payload = {}) {
  if (!record) return;
  if (!record.pipelineDebug) record.pipelineDebug = { ...DEFAULT_PIPELINE_DEBUG, entries: [] };
  if (payload.status && typeof payload.status === 'object') {
    record.pipelineDebug.enabled = payload.status.enabled === true;
    record.pipelineDebug.maxEntries = Number(payload.status.maxEntries) || DEFAULT_PIPELINE_DEBUG.maxEntries;
  }
  if (payload.type === 'clear') record.pipelineDebug.entries = [];
  if (payload.type === 'entry' && payload.entry) appendPipelineDebugEntry(record, payload.entry);
  if (record.id === state.sessions.activeId) renderPipelineDebug();
}

function traceDisplayPipeline(stage, messageFactory) {
  const record = activeSessionRecord();
  if (!record?.pipelineDebug?.enabled) return;
  if (state.remoteEcho) {
    appendPipelineDebugEntry(record, {
      stage,
      message: 'Secure input active; command and server details redacted.'
    });
    return;
  }
  appendPipelineDebugEntry(record, { stage, message: messageFactory() });
}

async function setActivePipelineDebug(changes = {}) {
  const record = activeSessionRecord();
  if (!record || typeof window.nukefire.setPipelineDebug !== 'function') return;
  const result = await window.nukefire.setPipelineDebug(record.id, changes);
  const snapshot = result?.snapshot;
  if (snapshot) {
    record.pipelineDebug.enabled = snapshot.enabled === true;
    record.pipelineDebug.maxEntries = Number(snapshot.maxEntries) || DEFAULT_PIPELINE_DEBUG.maxEntries;
    if (Array.isArray(snapshot.entries)) record.pipelineDebug.entries = snapshot.entries;
  }
  renderPipelineDebug();
  schedulePersistentSettingsSave();
}

function formatProtocolBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024) return `${Math.round(bytes).toLocaleString()} B`;
  const units = ['KB', 'MB', 'GB'];
  let scaled = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && scaled >= 1024; index += 1) {
    scaled /= 1024;
    unit = units[index];
  }
  const digits = scaled >= 100 ? 0 : (scaled >= 10 ? 1 : 2);
  return `${scaled.toFixed(digits)} ${unit}`;
}

function longSessionMetricSnapshot() {
  const record = activeSessionRecord();
  const readerHistoryEntries = record?.readerHistory?.entries instanceof Map
    ? [...record.readerHistory.entries.values()].reduce((total, entries) => total + (Array.isArray(entries) ? entries.length : 0), 0)
    : 0;
  const openPopouts = POPOUT_PANEL_IDS.filter((panelId) => isPanelPoppedOut(panelId));
  const xtermPerformance = xtermAdapter?.writePerformanceSnapshot?.() || {};
  const xtermQueueLength = Math.max(
    0,
    Number(xtermAdapter?.operationQueue?.length || 0) - Number(xtermAdapter?.operationHead || 0)
  ) + (xtermAdapter?.operationActive ? 1 : 0);
  const scrollDiagnostics = state.terminalRender.diagnostics || {};
  const heap = typeof performance !== 'undefined' ? performance.memory : null;
  return {
    heapUsedBytes: Number(heap?.usedJSHeapSize) || 0,
    heapTotalBytes: Number(heap?.totalJSHeapSize) || 0,
    domNodes: document.getElementsByTagName('*').length,
    xtermBufferLines: Number(xtermAdapter?.terminal?.buffer?.active?.length) || 0,
    xtermPendingOperations: xtermQueueLength,
    xtermPendingCharacters: Number(xtermPerformance.pendingCharacters) || 0,
    xtermMaxPendingCharacters: Number(xtermPerformance.maxPendingCharacters) || 0,
    xtermWritesCompleted: Number(xtermPerformance.completedOperations) || 0,
    xtermWritesCoalesced: Number(xtermPerformance.coalescedOperations) || 0,
    xtermWriteLastMs: Number(xtermPerformance.lastLatencyMs) || 0,
    xtermWriteMaxMs: Number(xtermPerformance.maxLatencyMs) || 0,
    xtermWriteAverageMs: Number(xtermPerformance.averageLatencyMs) || 0,
    xtermPresentationChunks: Number(xtermPerformance.presentationChunks) || 0,
    xtermPresentationFrames: Number(xtermPerformance.presentationFrames) || 0,
    xtermPresentationBatches: Number(xtermPerformance.presentationBatches) || 0,
    xtermPresentationCatchups: Number(xtermPerformance.presentationCatchups) || 0,
    xtermPresentationGapLastMs: Number(xtermPerformance.presentationGapLastMs) || 0,
    xtermPresentationGapMaxMs: Number(xtermPerformance.presentationGapMaxMs) || 0,
    xtermPresentationGapAverageMs: Number(xtermPerformance.presentationGapAverageMs) || 0,
    terminalFlushGapLastMs: Number(scrollDiagnostics.continuousGapLastMs) || 0,
    terminalFlushGapMaxMs: Number(scrollDiagnostics.continuousGapMaxMs) || 0,
    terminalFlushGapAverageMs: Number(scrollDiagnostics.continuousGapSamples) > 0
      ? Number(scrollDiagnostics.continuousGapTotalMs) / Number(scrollDiagnostics.continuousGapSamples)
      : 0,
    terminalFlushCharactersLast: Number(scrollDiagnostics.flushCharactersLast) || 0,
    terminalFlushCharactersMax: Number(scrollDiagnostics.flushCharactersMax) || 0,
    terminalFlushCharactersAverage: Number(scrollDiagnostics.measuredFlushes) > 0
      ? Number(scrollDiagnostics.flushCharactersTotal) / Number(scrollDiagnostics.measuredFlushes)
      : 0,
    terminalPendingRuns: state.terminalRender.pendingRuns.length,
    terminalPendingCharacters: state.terminalRender.pendingCharacters,
    terminalFlushCount: state.terminalRender.flushCount,
    plainTextCharacters: state.plainText.length,
    outputRuns: Array.isArray(record?.outputRuns) ? record.outputRuns.length : 0,
    readerReviewLines: Array.isArray(record?.readerReview?.lines) ? record.readerReview.lines.length : 0,
    readerHistoryEntries,
    communicationMessages: state.communications.messages.length,
    communicationDomArticles: $('#communications-messages')?.querySelectorAll('.communication-message').length || 0,
    openPopoutCount: openPopouts.length,
    openPopouts: openPopouts.join(','),
    gmcpMessages: state.protocol.gmcpMessages,
    promptBoundaries: state.promptBoundaryCount
  };
}

function formatLongSessionElapsed(milliseconds) {
  const seconds = Math.max(0, Math.floor((Number(milliseconds) || 0) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(remainder).padStart(2, '0')}s`;
}

function renderLongSessionMonitor() {
  if (!longSessionMonitor) return;
  const latest = longSessionMonitor.samples.at(-1) || null;
  setTextIfChanged($('#long-session-monitor-status'), longSessionMonitor.active ? 'Recording' : 'Off');
  setTextIfChanged($('#long-session-elapsed'), latest ? formatLongSessionElapsed(latest.elapsedMs) : '—');
  setTextIfChanged($('#long-session-heap'), latest?.heapUsedBytes ? formatProtocolBytes(latest.heapUsedBytes) : 'Unavailable');
  setTextIfChanged($('#long-session-dom'), latest ? Number(latest.domNodes || 0).toLocaleString() : '—');
  setTextIfChanged($('#long-session-delay'), latest ? `${Number(latest.eventLoopDelayMs || 0).toFixed(1)} ms` : '—');
  setTextIfChanged(
    $('#long-session-terminal-backlog'),
    latest ? `${Number(latest.terminalPendingCharacters || 0).toLocaleString()} chars · ${Number(latest.xtermPendingOperations || 0).toLocaleString()} writes` : '—'
  );
  setTextIfChanged(
    $('#long-session-popouts'),
    latest ? `${Number(latest.openPopoutCount || 0)} open · ${Number(latest.popoutPublishes || 0).toLocaleString()} updates/sample` : '—'
  );
  setTextIfChanged($('#long-session-samples'), longSessionMonitor.samples.length.toLocaleString());
  $('#long-session-start').disabled = longSessionMonitor.active;
  $('#long-session-stop').disabled = !longSessionMonitor.active;
}

function startLongSessionMonitor() {
  if (!longSessionMonitor || longSessionMonitor.active) return false;
  resetTerminalScrollDiagnostics();
  xtermAdapter?.resetWritePerformance?.();
  const started = longSessionMonitor.start(longSessionMetricSnapshot);
  renderLongSessionMonitor();
  if (started) announce('Long-Session Monitor started.', { force: true });
  return started;
}

function stopLongSessionMonitor() {
  if (!longSessionMonitor) return false;
  const stopped = longSessionMonitor.stop();
  renderLongSessionMonitor();
  if (stopped) announce('Long-Session Monitor stopped. Copy Report is ready.', { force: true });
  return stopped;
}

function resetLongSessionMonitor() {
  if (!longSessionMonitor) return;
  longSessionMonitor.reset();
  resetTerminalScrollDiagnostics();
  xtermAdapter?.resetWritePerformance?.();
  renderLongSessionMonitor();
  announce('Long-Session Monitor samples cleared.', { force: true });
}

async function copyLongSessionReport() {
  if (!longSessionMonitor) return false;
  const report = longSessionMonitor.report({
    client: 'NukeFire Client',
    version: '0.3.1-beta.73',
    platform: navigator.platform || '',
    userAgent: navigator.userAgent || '',
    experiment: 'beta73-combat-scroll-pacing-v1'
  });
  const text = `NUKEFIRE LONG-SESSION PERFORMANCE REPORT\n${JSON.stringify(report, null, 2)}`;
  try {
    const result = await window.nukefire.writeClipboardText?.(text);
    if (result?.ok === false) throw new Error(result.error || 'Clipboard write failed.');
    announce(`Long-Session report copied with ${report.retainedSamples} samples.`, { force: true });
    return true;
  } catch (error) {
    appendSystemMessage(`Unable to copy Long-Session report: ${error.message || error}`, 'error');
    return false;
  }
}

function normalizeCompressionState(value = {}) {
  return {
    protocol: String(value.protocol || ''),
    algorithm: String(value.algorithm || ''),
    active: value.active === true,
    wireBytes: Math.max(0, Number(value.wireBytes) || 0),
    inflatedBytes: Math.max(0, Number(value.inflatedBytes) || 0)
  };
}

function applyCompressionDisplay() {
  const compression = normalizeCompressionState(state.protocol.compression);
  $('#mccp-protocol').textContent = compression.protocol || 'None';
  $('#mccp-state').textContent = compression.active
    ? 'Active'
    : (compression.wireBytes > 0 || compression.inflatedBytes > 0 ? 'Ended' : 'Not active');
  $('#mccp-algorithm').textContent = compression.algorithm || '—';
  $('#mccp-wire-bytes').textContent = formatProtocolBytes(compression.wireBytes);
  $('#mccp-expanded-bytes').textContent = formatProtocolBytes(compression.inflatedBytes);
  if (compression.inflatedBytes > 0 && compression.wireBytes > 0) {
    const savedPercent = (1 - (compression.wireBytes / compression.inflatedBytes)) * 100;
    const ratio = compression.inflatedBytes / compression.wireBytes;
    $('#mccp-savings').textContent = `${savedPercent.toFixed(1)}% (${ratio.toFixed(2)}:1)`;
  } else {
    $('#mccp-savings').textContent = '—';
  }
}

function updateProtocolCountersDisplay() {
  $('#gmcp-state').textContent = state.protocol.gmcpMessages > 0
    ? `Receiving (${state.protocol.gmcpMessages.toLocaleString()})`
    : 'Waiting';
  const indicator = $('#prompt-boundary');
  indicator.textContent = state.promptBoundaryCount > 0
    ? `${indicator.dataset.type === 'eor' ? 'EOR' : 'GA'} (${state.promptBoundaryCount.toLocaleString()})`
    : 'Waiting';
}

function scheduleProtocolCountersDisplay() {
  if (state.protocolCountersTimer !== null) return;
  state.protocolCountersTimer = setTimeout(() => {
    state.protocolCountersTimer = null;
    updateProtocolCountersDisplay();
  }, 500);
}

function applyCompressionState(payload, record = activeSessionRecord()) {
  if (!record) return;
  record.protocol.compression = normalizeCompressionState(payload);
  if (record.id === state.sessions.activeId) {
    state.protocol.compression = { ...record.protocol.compression };
    applyCompressionDisplay();
  }
}

function applyProtocolDisplay() {
  updateProtocolCountersDisplay();
  $('#terminal-type-state').textContent = state.protocol.terminalType || 'Waiting';
  $('#charset-state').textContent = state.protocol.charset || 'Waiting';
  $('#naws-state').textContent = state.protocol.windowSize
    ? `${state.protocol.windowSize.width} × ${state.protocol.windowSize.height}`
    : 'Waiting';
  const newEnvironment = state.protocol.newEnvironment;
  $('#mnes-state').textContent = newEnvironment?.enabled
    ? 'MNES + OSC 8 links'
    : (newEnvironment?.enabled === false ? 'Disabled' : 'Waiting');

  applyCompressionDisplay();
}

function restoreSessionState(record) {
  if (!record) return;
  applyActiveTinTinState(record);
  state.connected = Boolean(record.connected);
  state.remoteEcho = Boolean(record.remoteEcho);
  state.history = record.history;
  state.historyIndex = record.historyIndex;
  state.historyPrefix = String(record.historyPrefix || '');
  state.draft = record.draft;
  state.lines = record.lines;
  state.plainText = record.plainText;
  state.readerCarry = record.readerCarry;
  state.lastCompleteLine = record.lastCompleteLine;
  state.promptBoundaryCount = record.promptBoundaryCount;
  $('#prompt-boundary').dataset.type = record.promptBoundaryType || 'ga';
  state.gmcp = record.gmcp;
  if (record.gmcp?.char?.status) syncServerScreenReaderPreference(record.gmcp.char.status, { force: true });
  state.protocol = record.protocol;
  state.communications = record.communications;
  state.mapper.pendingMove = record.mapper.pendingMove;
  state.mapper.pendingMoves = Array.isArray(record.mapper.pendingMoves) ? record.mapper.pendingMoves : [];
  state.mapper.movementRoomsSincePrompt = Math.max(0, Number(record.mapper.movementRoomsSincePrompt) || 0);
  state.mapper.lastRoomId = record.mapper.lastRoomId;
  state.mapper.liveSnapshot = record.mapper.liveSnapshot;
  state.mapper.liveSignature = record.mapper.liveSignature;
  state.mapper.liveStateReady = record.mapper.liveStateReady === true;
  state.mapper.gpsCatalogAnnouncementVersion = record.mapper.gpsCatalogAnnouncementVersion;
  gpsOptionsCatalogRef = null;
  gpsOptionsQuery = '';
  gpsOptionsFilteredItems = [];
  gpsOptionsFilteredIndexes = new Set();
  gpsLookupItemsRef = null;
  gpsLookupByIndex = new Map();
  gpsLookupByRoom = new Map();
  gpsLookupByName = new Map();
  state.affects = record.affects;
  state.lootHistory = record.lootHistory || { events: [], filter: 'all', nextId: 1, visibleLimit: 250 };
  state.mobInspector = record.mobInspector || {
    snapshot: normalizeMobInspectorSnapshot({}), receivedAtMs: 0, signature: '', roomId: '',
    mode: 'expanded', lastOpponentKey: '', combatRefreshKey: '',
    liveHealthSignature: '', lastTargetAffectsRequestMs: 0, pendingCombatKillRefresh: false, lastCombatKillRefreshMs: 0,
    renderDirty: false, summaryIdentityText: '', summaryConsiderText: '', effectGroupCount: 0,
    autoOpen: localStorage.getItem('nukefire.mobInspectorAutoOpen') !== 'false'
  };
  state.mobInspector.autoOpen = localStorage.getItem('nukefire.mobInspectorAutoOpen') !== 'false';
  state.contextDeck = record.contextDeck;
  state.vitals = record.vitals;
  ansi = record.ansi || new window.NukeFireAnsi.AnsiParser();

  hostInput.value = record.host || 'tdome.nukefire.org';
  portInput.value = String(record.port || 4000);
  commandInput.value = record.commandDraft || '';
  renderSessionOutput(record);
  renderDockedPrompt(record);
  renderSessionVitals(record);
  setStatus(record.status || { state: 'disconnected', message: 'Disconnected' }, { updateRecord: false, focus: false, outputTransition: false });
  setRemoteEcho(record.remoteEcho, { announceChange: false, clearInput: false, focus: false });

  const characterName = record.gmcp?.char?.status?.name || record.characterName;
  if (characterName) setWorkspaceCharacter(characterName);
  renderCommunicationTabs();
  renderCommunicationOrderControl();
  renderCommunicationMessages({ snapToLive: true });
  renderAffects();
  renderMobInspector();
  renderLootHistory();
  renderContextDeck();
  renderGpsNavigator();
  renderVitals();
  renderOpponentVitals();
  syncMobInspectorRoomLifecycle(record.gmcp?.room?.info);
  syncMobInspectorCombatLifecycle();
  renderGroupVitals();
  renderNukeFireState();
  renderMapper();
  applyProtocolDisplay();
  renderPipelineDebug();
  renderLongSessionMonitor();
  publishAllPanelPopoutStates();
}

function sessionLabel(record) {
  return record.characterName || record.name || record.id;
}

function sessionProfileLabel(record) {
  const profile = record?.tintin?.profile || {};
  const filename = String(profile.filename || '').trim();
  if (filename) return filename;
  const requested = String(profile.requested || '').trim();
  if (!requested) return '';
  return /\.(?:tin|txt)$/iu.test(requested) ? requested : `${requested}.tin`;
}

function sessionTabSignature(record) {
  if (!record) return '';
  return [
    sessionLabel(record),
    record.role || 'member',
    record.status?.state || 'disconnected',
    sessionProfileLabel(record),
    Number(record.unreadOutput || 0)
  ].join('|');
}

function renderSessionTabs() {
  if (!sessionTabs) return;
  const fragment = document.createDocumentFragment();
  for (const id of state.sessions.order) {
    const record = state.sessions.records[id];
    if (!record) continue;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'session-tab';
    button.dataset.sessionId = id;
    button.dataset.status = record.status?.state || 'disconnected';
    button.id = `session-tab-${id}`;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', String(id === state.sessions.activeId));
    button.tabIndex = id === state.sessions.activeId ? 0 : -1;
    const profileLabel = sessionProfileLabel(record);
    button.dataset.profile = profileLabel;
    button.setAttribute('aria-label', `${sessionLabel(record)}, ${record.role}, ${record.status?.state || 'disconnected'}${profileLabel ? `, profile ${profileLabel}` : ', no profile loaded'}${record.unreadOutput ? `, ${record.unreadOutput} unread updates` : ''}`);

    const light = document.createElement('span');
    light.className = 'session-tab-light';
    light.setAttribute('aria-hidden', 'true');
    const name = document.createElement('span');
    name.className = 'session-tab-name';
    name.textContent = sessionLabel(record);
    const role = document.createElement('span');
    role.className = 'session-tab-role';
    role.textContent = profileLabel ? `${record.role} · ${profileLabel}` : record.role;
    const unread = document.createElement('span');
    unread.className = 'session-tab-unread';
    unread.hidden = !record.unreadOutput;
    unread.textContent = record.unreadOutput > 99 ? '99+' : String(record.unreadOutput || '');
    button.append(light, name, role, unread);
    button.addEventListener('click', () => void activateSession(id));
    button.addEventListener('keydown', handleSessionTabKeydown);
    fragment.append(button);
  }
  sessionTabs.replaceChildren(fragment);
  const active = activeSessionRecord();
  if (active && sessionRole) sessionRole.value = ['tank', 'healer', 'damage', 'support', 'scout', 'member'].includes(active.role) ? active.role : 'member';
  $('#session-close').disabled = state.sessions.order.length <= 1;
  $('#terminal-title').textContent = active ? `${sessionLabel(active)} output` : 'NukeFire output';
  renderReaderWorkspaceStatus();
}

function scheduleSessionTabsRender() {
  if (state.sessionTabsFrame !== null) return;
  state.sessionTabsFrame = scheduleFrame(() => {
    state.sessionTabsFrame = null;
    renderSessionTabs();
  });
}

function handleSessionTabKeydown(event) {
  const tabs = [...sessionTabs.querySelectorAll('[role="tab"]')];
  const index = tabs.indexOf(event.currentTarget);
  let next = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = tabs.length - 1;
  if (next === null) return;
  event.preventDefault();
  const target = tabs[next];
  void activateSession(target.dataset.sessionId).then(() => target.focus({ preventScroll: true }));
}

async function activateSession(sessionId, options = {}) {
  const record = state.sessions.records[sessionId];
  if (!record || sessionId === state.sessions.activeId) return;
  if (state.mapper.route.active) {
    stopMapperRoute('Client route stopped because the active session changed.', { kind: 'error', output: true });
  }
  flushDeferredMapperPackets();
  captureActiveSessionState();
  if (state.accessibility.selfVoiceEnabled) selfVoice?.setSession?.(sessionId);
  state.sessions.activeId = sessionId;
  record.unreadOutput = 0;
  restoreSessionState(record);
  renderSessionTabs();
  if (options.notifyMain !== false) {
    await window.nukefire.setActiveSession?.(sessionId).catch((error) => {
      appendSystemMessage(`Unable to activate session: ${error.message || error}`, 'error');
    });
  }
  schedulePersistentSettingsSave();
  if (options.announceChange !== false) announce(`Active session: ${sessionLabel(record)}.`, { force: true });
  scheduleFrame(() => focusCommand({ preserveSelection: true }));
}

function applySessionsSnapshot(snapshot = {}, options = {}) {
  const incoming = Array.isArray(snapshot.sessions) ? snapshot.sessions : [];
  const order = [];
  for (const meta of incoming) {
    const record = ensureSessionRecord(meta);
    if (record) order.push(record.id);
  }
  if (order.length === 0) {
    const fallback = ensureSessionRecord({
      id: 'main', name: 'Main', role: 'tank',
      host: hostInput.value || 'tdome.nukefire.org',
      port: Number(portInput.value) || 4000
    });
    order.push(fallback.id);
  }

  for (const id of Object.keys(state.sessions.records)) {
    if (!order.includes(id)) delete state.sessions.records[id];
  }

  const previousActive = state.sessions.activeId;
  state.sessions.order = order;
  state.sessions.groups = snapshot.groups && typeof snapshot.groups === 'object'
    ? structuredCloneSafe(snapshot.groups)
    : state.sessions.groups;
  const hasPerSessionTinTin = incoming.some((meta) =>
    meta?.tintin && typeof meta.tintin === 'object'
  );
  const hasLegacyTinTin = [
    'aliases', 'variables', 'functions', 'actions', 'gags', 'highlights',
    'substitutes', 'macros', 'classes', 'speedwalk'
  ].some((key) => Object.hasOwn(snapshot, key));
  const legacyTinTin = hasLegacyTinTin
    ? normalizeSessionTinTinState({
        aliases: snapshot.aliases,
        variables: snapshot.variables,
        functions: snapshot.functions,
        actions: snapshot.actions,
        gags: snapshot.gags,
        highlights: snapshot.highlights,
        substitutes: snapshot.substitutes,
        macros: snapshot.macros,
        classes: snapshot.classes,
        speedwalk: snapshot.speedwalk
      })
    : null;
  if (Object.hasOwn(snapshot, 'commandPrefix')) {
    setClientCommandPrefix(snapshot.commandPrefix, {
      persist: false,
      sync: false,
      announceChange: false,
      migrateDefinitions: false
    });
  }
  const requested = String(snapshot.activeSessionId || previousActive || order[0]);
  const nextActive = order.includes(requested)
    ? requested
    : (order.includes(previousActive) ? previousActive : order[0]);
  if (!hasPerSessionTinTin && hasLegacyTinTin) {
    const legacyTarget = state.sessions.records[nextActive] || state.sessions.records[order[0]];
    if (legacyTarget) applyTinTinStateToRecord(legacyTarget, legacyTinTin);
  }

  if (!previousActive || !order.includes(previousActive)) {
    state.sessions.activeId = nextActive;
    const record = activeSessionRecord();
    if (record) {
      record.unreadOutput = 0;
      restoreSessionState(record);
    }
  } else if (options.followActive !== false && nextActive !== previousActive) {
    void activateSession(nextActive, { notifyMain: false, announceChange: false });
  } else {
    applyActiveTinTinState(state.sessions.records[previousActive] || state.sessions.records[nextActive]);
  }
  state.sessions.ready = true;
  renderSessionTabs();
  renderDockedPrompt(activeSessionRecord());
  renderSessionVitals();
}

function persistentSessionsSnapshot(options = {}) {
  captureActiveSessionState({ flushOutput: options.flushOutput !== false });
  return {
    activeSessionId: state.sessions.activeId,
    sessions: state.sessions.order.map((id) => {
      const record = state.sessions.records[id];
      return {
        id: record.id,
        name: record.name,
        role: record.role,
        host: record.host,
        port: record.port,
        pipelineDebug: {
          enabled: record.pipelineDebug?.enabled === true,
          maxEntries: Number(record.pipelineDebug?.maxEntries) || DEFAULT_PIPELINE_DEBUG.maxEntries
        },
        tintin: persistenceTinTinSnapshot(record, { reuse: options.reuseTinTinSnapshots === true })
      };
    }),
    groups: structuredCloneSafe(state.sessions.groups || {})
  };
}

function announce(message, options = {}) {
  const text = String(message || '').trim();
  const force = Boolean(options.force);
  const interrupt = options.interrupt === true;
  if (!text || (!force && !state.accessibility.announceImportant)) return;

  if (state.accessibility.selfVoiceEnabled && selfVoice?.speak?.(text, { interrupt: interrupt || force })) {
    state.announcementSerial += 1;
    announcer.textContent = '';
    if (interruptAnnouncer) interruptAnnouncer.textContent = '';
    return;
  }

  state.announcementSerial += 1;
  const serial = state.announcementSerial;
  const target = interrupt && interruptAnnouncer ? interruptAnnouncer : announcer;
  announcer.textContent = '';
  if (interruptAnnouncer) interruptAnnouncer.textContent = '';
  queueMicrotask(() => {
    if (serial === state.announcementSerial) target.textContent = text;
  });
}


function legacySettingsSnapshot() {
  return {
    host: localStorage.getItem('nukefire.host'),
    port: localStorage.getItem('nukefire.port'),
    compressionEnabled: localStorage.getItem('nukefire.compressionEnabled'),
    followOutput: localStorage.getItem('nukefire.followOutput'),
    compactOutput: localStorage.getItem('nukefire.compactOutput'),
    fontSize: localStorage.getItem('nukefire.fontSize'),
    uiFont: localStorage.getItem('nukefire.uiFont'),
    terminalFont: localStorage.getItem('nukefire.terminalFont'),
    interfaceBrightness: localStorage.getItem('nukefire.interfaceBrightness'),
    affectsDisplayMode: localStorage.getItem('nukefire.affectsDisplayMode'),
    panelLabels: localStorage.getItem('nukefire.panelLabelMode'),
    mapperRoomLabels: localStorage.getItem('nukefire.mapperRoomLabelMode'),
    showGroupVitals: localStorage.getItem('nukefire.showGroupVitals'),
    showMapperExits: localStorage.getItem('nukefire.showMapperExits'),
    showGpsNavigator: localStorage.getItem('nukefire.showGpsNavigator'),
    showMapperMap: localStorage.getItem('nukefire.showMapperMap'),
    showMapperRoomInfo: localStorage.getItem('nukefire.showMapperRoomInfo'),
    mainVitalsMode: localStorage.getItem('nukefire.mainVitalsMode'),
    groupVitalsMode: localStorage.getItem('nukefire.groupVitalsMode'),
    vitalsNumberSize: localStorage.getItem('nukefire.vitalsNumberSize'),
    hideSelfInGroupVitals: localStorage.getItem('nukefire.hideSelfInGroupVitals'),
    terminalTheme: localStorage.getItem('nukefire.terminalTheme'),
    terminalForeground: localStorage.getItem('nukefire.terminalForeground'),
    terminalBackground: localStorage.getItem('nukefire.terminalBackground'),
    terminalMonochrome: localStorage.getItem('nukefire.terminalMonochrome'),
    terminalThemeVersion: localStorage.getItem('nukefire.terminalThemeVersion'),
    screenReaderMode: localStorage.getItem('nukefire.screenReaderMode'),
    readerWorkspaceEnabled: localStorage.getItem('nukefire.readerWorkspaceEnabled'),
    selfVoiceEnabled: localStorage.getItem('nukefire.selfVoiceEnabled'),
    selfVoiceMuted: localStorage.getItem('nukefire.selfVoiceMuted'),
    selfVoiceForegroundOnly: localStorage.getItem('nukefire.selfVoiceForegroundOnly'),
    selfVoiceFollowMode: localStorage.getItem('nukefire.selfVoiceFollowMode'),
    selfVoiceInterruptOnCommand: localStorage.getItem('nukefire.selfVoiceInterruptOnCommand'),
    selfVoiceGovernorEnabled: localStorage.getItem('nukefire.selfVoiceGovernorEnabled'),
    selfVoicePriorityAlertsEnabled: localStorage.getItem('nukefire.selfVoicePriorityAlertsEnabled'),
    readerSafetyAlertsEnabled: localStorage.getItem('nukefire.readerSafetyAlertsEnabled'),
    selfVoiceRate: localStorage.getItem('nukefire.selfVoiceRate'),
    selfVoicePitch: localStorage.getItem('nukefire.selfVoicePitch'),
    selfVoiceVolume: localStorage.getItem('nukefire.selfVoiceVolume'),
    selfVoiceVoiceId: localStorage.getItem('nukefire.selfVoiceVoiceId'),
    vitalSpeechMode: localStorage.getItem('nukefire.vitalSpeechMode'),
    audioCuesEnabled: localStorage.getItem('nukefire.audioCuesEnabled'),
    audioCuesMuted: localStorage.getItem('nukefire.audioCuesMuted'),
    audioCuesForegroundOnly: localStorage.getItem('nukefire.audioCuesForegroundOnly'),
    audioCuesVolume: localStorage.getItem('nukefire.audioCuesVolume'),
    soundpackDisabledEvents: localStorage.getItem('nukefire.soundpackDisabledEvents'),
    communicationCueTell: localStorage.getItem('nukefire.communicationCueTell'),
    communicationCueAuction: localStorage.getItem('nukefire.communicationCueAuction'),
    communicationCueGossip: localStorage.getItem('nukefire.communicationCueGossip'),
    communicationCueSkynet: localStorage.getItem('nukefire.communicationCueSkynet'),
    communicationCueSsf: localStorage.getItem('nukefire.communicationCueSsf'),
    communicationCuesBackground: localStorage.getItem('nukefire.communicationCuesBackground'),
    announceImportant: localStorage.getItem('nukefire.announceImportant'),
    repeatLastCommandOnEnter: localStorage.getItem('nukefire.repeatLastCommandOnEnter'),
    showLastCommandInInput: localStorage.getItem('nukefire.showLastCommandInInput'),
    brightCommandInputFocus: localStorage.getItem('nukefire.brightCommandInputFocus')
  };
}


function structuredCloneSafe(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizePanelVisibility(input = {}, fallback = DEFAULT_PANEL_VISIBILITY) {
  const normalized = {};
  for (const panel of SIDEBAR_PANELS) {
    normalized[panel.id] = typeof input?.[panel.id] === 'boolean'
      ? input[panel.id]
      : fallback[panel.id];
  }
  return normalized;
}

function normalizePanelLayout(input = {}, fallback = DEFAULT_PANEL_LAYOUT) {
  const provisional = {};
  const defaultIndex = new Map(SIDEBAR_PANELS.map((panel, index) => [panel.id, index]));

  for (const panel of SIDEBAR_PANELS) {
    const builtIn = DEFAULT_PANEL_LAYOUT[panel.id];
    const inherited = fallback?.[panel.id] || builtIn;
    const candidate = input?.[panel.id] || {};
    const region = DOCK_REGIONS.includes(candidate.region)
      ? candidate.region
      : (DOCK_REGIONS.includes(inherited.region) ? inherited.region : builtIn.region);
    const numericOrder = Number(candidate.order);
    const inheritedOrder = Number(inherited.order);

    provisional[panel.id] = {
      region,
      order: Number.isFinite(numericOrder)
        ? Math.max(0, Math.min(100, Math.trunc(numericOrder)))
        : (Number.isFinite(inheritedOrder) ? Math.trunc(inheritedOrder) : builtIn.order)
    };
  }

  const normalized = {};
  for (const region of DOCK_REGIONS) {
    const panels = SIDEBAR_PANELS
      .filter((panel) => provisional[panel.id].region === region)
      .sort((left, right) => {
        const orderDifference = provisional[left.id].order - provisional[right.id].order;
        return orderDifference || defaultIndex.get(left.id) - defaultIndex.get(right.id);
      });

    panels.forEach((panel, index) => {
      normalized[panel.id] = { region, order: index };
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

  for (const panel of SIDEBAR_PANELS) {
    const region = layout?.[panel.id]?.region || DEFAULT_PANEL_LAYOUT[panel.id].region;
    const inherited = normalizeTabGroupId(fallback?.[panel.id], panel.id);
    let groupId = normalizeTabGroupId(input?.[panel.id], inherited);

    if (groupRegions.has(groupId) && groupRegions.get(groupId) !== region) {
      groupId = panel.id;
    }

    groupRegions.set(groupId, region);
    normalized[panel.id] = groupId;
  }

  return normalized;
}

function panelGroupsInRegion(layout, tabGroups, region) {
  const groups = [];
  const byId = new Map();

  for (const panel of panelsInRegion(layout, region)) {
    const groupId = tabGroups?.[panel.id] || panel.id;
    if (!byId.has(groupId)) {
      const group = { id: groupId, panels: [] };
      byId.set(groupId, group);
      groups.push(group);
    }
    byId.get(groupId).panels.push(panel);
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
  for (const region of DOCK_REGIONS) {
    for (const group of panelGroupsInRegion(layout, tabGroups, region)) {
      const panelIds = group.panels.map((panel) => panel.id);
      const candidate = String(input?.[group.id] || '');
      const inherited = String(fallback?.[group.id] || '');
      normalized[group.id] = panelIds.includes(candidate)
        ? candidate
        : (panelIds.includes(inherited) ? inherited : panelIds[0]);
    }
  }
  return normalized;
}

function normalizeDockSizes(input = {}, fallback = DEFAULT_DOCK_SIZES) {
  const normalized = {};

  for (const region of DOCK_REGIONS) {
    const limits = DOCK_SIZE_LIMITS[region];
    const fallbackNumber = Number(fallback?.[region]);
    const fallbackValue = Number.isFinite(fallbackNumber)
      ? Math.max(limits.minimum, Math.min(limits.maximum, Math.round(fallbackNumber)))
      : DEFAULT_DOCK_SIZES[region];
    const candidate = Number(input?.[region]);
    normalized[region] = Number.isFinite(candidate)
      ? Math.max(limits.minimum, Math.min(limits.maximum, Math.round(candidate)))
      : fallbackValue;
  }

  return normalized;
}

function normalizeCommunicationPreferences(input = {}, fallback = DEFAULT_COMMUNICATION_PREFERENCES) {
  const inheritedChannel = COMMUNICATION_CHANNEL_IDS.includes(fallback?.activeChannel)
    ? fallback.activeChannel
    : DEFAULT_COMMUNICATION_PREFERENCES.activeChannel;
  const candidateChannel = String(input?.activeChannel || '').trim().toLocaleLowerCase();
  const inheritedOrder = COMMUNICATION_MESSAGE_ORDERS.includes(fallback?.messageOrder)
    ? fallback.messageOrder
    : DEFAULT_COMMUNICATION_PREFERENCES.messageOrder;
  const candidateOrder = String(input?.messageOrder || '').trim().toLocaleLowerCase();
  return {
    activeChannel: COMMUNICATION_CHANNEL_IDS.includes(candidateChannel)
      ? candidateChannel
      : inheritedChannel,
    messageOrder: COMMUNICATION_MESSAGE_ORDERS.includes(candidateOrder)
      ? candidateOrder
      : inheritedOrder
  };
}

function characterWorkspaceKey(name) {
  const key = String(name || '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 64);
  return ['__proto__', 'constructor', 'prototype'].includes(key) ? '' : key;
}


function workspacePersistenceCharacterKey() {
  return state.workspace.sharedCrewWorkspace ? '' : state.workspace.currentCharacterKey;
}

function normalizePanelPopouts(input = {}, fallback = DEFAULT_POPOUTS) {
  if (typeof panelWindowsApi.normalizePopouts === 'function') {
    return panelWindowsApi.normalizePopouts(input, fallback);
  }
  const normalized = {};
  for (const panelId of POPOUT_PANEL_IDS) {
    const inherited = fallback?.[panelId] || DEFAULT_POPOUTS[panelId] || {};
    const candidate = input?.[panelId] || {};
    const bounds = candidate.bounds || {};
    const fallbackBounds = inherited.bounds || PANEL_WINDOW_DEFINITIONS[panelId]?.bounds || {};
    normalized[panelId] = {
      open: typeof candidate.open === 'boolean' ? candidate.open : Boolean(inherited.open),
      bounds: {
        x: Number.isFinite(Number(bounds.x)) ? Math.trunc(Number(bounds.x)) : (fallbackBounds.x ?? null),
        y: Number.isFinite(Number(bounds.y)) ? Math.trunc(Number(bounds.y)) : (fallbackBounds.y ?? null),
        width: Math.max(440, Math.min(16384, Math.trunc(Number(bounds.width) || fallbackBounds.width || 680))),
        height: Math.max(340, Math.min(16384, Math.trunc(Number(bounds.height) || fallbackBounds.height || 560)))
      }
    };
  }
  return normalized;
}

function normalizeWorkspacePanelHeights(input = {}) {
  return window.NukeFirePanelStackResize?.normalizeHeightMap?.(input) || {};
}

function normalizeWorkspaceSettings(workspace = {}) {
  const defaultPanels = normalizePanelVisibility(workspace.defaultPanels);
  const defaultLayout = normalizePanelLayout(workspace.defaultLayout);
  const defaultDockSizes = normalizeDockSizes(workspace.defaultDockSizes);
  const defaultPanelHeights = normalizeWorkspacePanelHeights(workspace.defaultPanelHeights);
  const defaultTabGroups = normalizeTabGroups(workspace.defaultTabGroups, defaultLayout);
  const defaultActiveTabs = normalizeActiveTabs(
    workspace.defaultActiveTabs,
    defaultTabGroups,
    defaultLayout
  );
  const defaultCommunications = normalizeCommunicationPreferences(workspace.defaultCommunications);
  const defaultPopouts = normalizePanelPopouts(workspace.defaultPopouts);
  const characters = {};
  const entries = workspace.characters && typeof workspace.characters === 'object'
    ? Object.entries(workspace.characters)
    : [];

  for (const [rawKey, rawRecord] of entries.slice(0, 100)) {
    const record = rawRecord && typeof rawRecord === 'object' ? rawRecord : {};
    const key = characterWorkspaceKey(rawKey || record.name);
    if (!key || Object.hasOwn(characters, key)) continue;
    const layout = normalizePanelLayout(record.layout, defaultLayout);
    const tabGroups = normalizeTabGroups(record.tabGroups, layout, defaultTabGroups);
    characters[key] = {
      name: String(record.name || key).normalize('NFKC').trim().slice(0, 80) || key,
      panels: normalizePanelVisibility(record.panels, defaultPanels),
      layout,
      dockSizes: normalizeDockSizes(record.dockSizes, defaultDockSizes),
      panelHeights: normalizeWorkspacePanelHeights(record.panelHeights),
      tabGroups,
      activeTabs: normalizeActiveTabs(
        record.activeTabs,
        tabGroups,
        layout,
        defaultActiveTabs
      ),
      communications: normalizeCommunicationPreferences(record.communications, defaultCommunications),
      popouts: normalizePanelPopouts(record.popouts, defaultPopouts)
    };
  }

  const requestedLastCharacterKey = characterWorkspaceKey(
    workspace.lastCharacterKey || workspace.lastCharacterName
  );
  const lastCharacterKey = requestedLastCharacterKey && characters[requestedLastCharacterKey]
    ? requestedLastCharacterKey
    : '';
  const lastCharacterName = lastCharacterKey
    ? String(
        workspace.lastCharacterName
        || characters[lastCharacterKey]?.name
        || lastCharacterKey
      ).normalize('NFKC').trim().slice(0, 80)
    : '';

  return {
    sharedCrewWorkspace: workspace.sharedCrewWorkspace === true,
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

function activePanelVisibility() {
  const key = workspacePersistenceCharacterKey();
  const character = key ? state.workspace.characters[key] : null;
  return normalizePanelVisibility(
    character?.panels || state.workspace.defaultPanels,
    state.workspace.defaultPanels
  );
}

function activePanelLayout() {
  const key = workspacePersistenceCharacterKey();
  const character = key ? state.workspace.characters[key] : null;
  return normalizePanelLayout(
    character?.layout || state.workspace.defaultLayout,
    state.workspace.defaultLayout
  );
}

function activeDockSizes() {
  const key = workspacePersistenceCharacterKey();
  const character = key ? state.workspace.characters[key] : null;
  return normalizeDockSizes(
    character?.dockSizes || state.workspace.defaultDockSizes,
    state.workspace.defaultDockSizes
  );
}

function activePanelHeights() {
  const defaults = normalizeWorkspacePanelHeights(state.workspace.defaultPanelHeights);
  const key = workspacePersistenceCharacterKey();
  if (!key) return defaults;
  const character = state.workspace.characters[key];
  return {
    ...defaults,
    ...normalizeWorkspacePanelHeights(character?.panelHeights)
  };
}

function activePanelTabGroups(layout = activePanelLayout()) {
  const key = workspacePersistenceCharacterKey();
  const character = key ? state.workspace.characters[key] : null;
  return normalizeTabGroups(
    character?.tabGroups || state.workspace.defaultTabGroups,
    layout,
    state.workspace.defaultTabGroups
  );
}

function activePanelTabs(tabGroups, layout = activePanelLayout()) {
  const key = workspacePersistenceCharacterKey();
  const character = key ? state.workspace.characters[key] : null;
  return normalizeActiveTabs(
    character?.activeTabs || state.workspace.defaultActiveTabs,
    tabGroups,
    layout,
    state.workspace.defaultActiveTabs
  );
}

function activeCommunicationPreferences() {
  const key = workspacePersistenceCharacterKey();
  const character = key ? state.workspace.characters[key] : null;
  return normalizeCommunicationPreferences(
    character?.communications || state.workspace.defaultCommunications,
    state.workspace.defaultCommunications
  );
}

function activePanelPopouts() {
  const key = workspacePersistenceCharacterKey();
  const character = key ? state.workspace.characters[key] : null;
  return normalizePanelPopouts(
    character?.popouts || state.workspace.defaultPopouts,
    state.workspace.defaultPopouts
  );
}

function layoutGalleryScopeKey() {
  if (state.workspace.sharedCrewWorkspace) return '__shared_crew_workspace__';
  if (state.workspace.currentCharacterKey) return `character:${state.workspace.currentCharacterKey}`;
  return `session:${state.sessions.activeId || 'main'}`;
}

function captureLayoutGallerySnapshot() {
  return {
    scopeKey: layoutGalleryScopeKey(),
    panels: { ...state.workspace.activePanels },
    layout: structuredCloneSafe(state.workspace.activeLayout),
    dockSizes: { ...state.workspace.activeDockSizes },
    tabGroups: { ...state.workspace.activeTabGroups },
    activeTabs: { ...state.workspace.activeTabs },
    popouts: structuredCloneSafe(state.workspace.activePopouts),
    displayComponents: { ...state.displayComponents }
  };
}

function clearLayoutGalleryTrial(options = {}) {
  state.workspace.layoutGallery.returnSnapshot = null;
  state.workspace.layoutGallery.appliedPresetId = '';
  if (options.render !== false) renderLayoutGallery();
}

function restoreLayoutGallerySnapshot() {
  const snapshot = state.workspace.layoutGallery.returnSnapshot;
  if (!snapshot || snapshot.scopeKey !== layoutGalleryScopeKey()) {
    clearLayoutGalleryTrial();
    return false;
  }

  state.workspace.activeTabGroups = { ...snapshot.tabGroups };
  state.workspace.activeTabs = { ...snapshot.activeTabs };
  state.workspace.activePopouts = structuredCloneSafe(snapshot.popouts);
  applyPanelLayout(snapshot.layout, { persist: false, announceChange: false });
  applyPanelVisibility(snapshot.panels, { persist: false, announceChange: false });
  applyDockSizes(snapshot.dockSizes, { persist: false, announceChange: false });
  applyDisplayComponents(snapshot.displayComponents || state.displayComponents, { persist: false, announceChange: false });
  syncPanelPopoutWindows({ focus: false });
  clearLayoutGalleryTrial({ render: false });
  renderLayoutGallery();
  announce('Returned to My Layout.', { force: true });
  return true;
}

function applyLayoutGalleryPreset(item) {
  if (!item || item.id === 'my-layout') return restoreLayoutGallerySnapshot();
  if (!item.panels || !item.layout || !item.dockSizes) return false;

  const gallery = state.workspace.layoutGallery;
  if (!gallery.returnSnapshot || gallery.returnSnapshot.scopeKey !== layoutGalleryScopeKey()) {
    gallery.returnSnapshot = captureLayoutGallerySnapshot();
  }

  state.workspace.activeTabGroups = { ...DEFAULT_TAB_GROUPS };
  state.workspace.activeTabs = { ...DEFAULT_ACTIVE_TABS };
  state.workspace.activePopouts = structuredCloneSafe(DEFAULT_POPOUTS);
  applyPanelLayout(item.layout, { persist: false, announceChange: false });
  applyPanelVisibility(item.panels, { persist: false, announceChange: false });
  applyDockSizes(item.dockSizes, { persist: false, announceChange: false });
  applyDisplayComponents(item.displayComponents || gallery.returnSnapshot?.displayComponents || state.displayComponents, {
    persist: false, announceChange: false
  });
  syncPanelPopoutWindows({ focus: false });
  gallery.appliedPresetId = item.id;
  renderLayoutGallery();
  announce(`Trying ${item.label}. My Layout remains available as the safe return point.`, { force: true });
  return true;
}

function currentLayoutGalleryItem() {
  const count = LAYOUT_GALLERY_ITEMS.length;
  const index = ((Number(state.workspace.layoutGallery.index) || 0) % count + count) % count;
  state.workspace.layoutGallery.index = index;
  return LAYOUT_GALLERY_ITEMS[index];
}

function renderLayoutGallery() {
  if (!layoutGallery) return;
  const gallery = state.workspace.layoutGallery;
  if (gallery.returnSnapshot && gallery.returnSnapshot.scopeKey !== layoutGalleryScopeKey()) {
    gallery.returnSnapshot = null;
    gallery.appliedPresetId = '';
  }
  const item = currentLayoutGalleryItem();
  if (!item) return;
  if (layoutGalleryName) layoutGalleryName.textContent = item.label;
  if (layoutGalleryDescription) {
    layoutGalleryDescription.textContent = item.id === 'my-layout' && gallery.returnSnapshot
      ? 'Return to the workspace you had before trying a preset.'
      : item.description;
  }
  if (layoutGalleryPreview) layoutGalleryPreview.dataset.layoutPreview = item.id;
  if (layoutGalleryApply) {
    if (item.id === 'my-layout') {
      layoutGalleryApply.textContent = gallery.returnSnapshot ? 'Return' : 'Current';
      layoutGalleryApply.disabled = !gallery.returnSnapshot;
    } else if (gallery.appliedPresetId === item.id) {
      layoutGalleryApply.textContent = 'Applied';
      layoutGalleryApply.disabled = true;
    } else {
      layoutGalleryApply.textContent = 'Try';
      layoutGalleryApply.disabled = false;
    }
    layoutGalleryApply.title = item.id === 'my-layout'
      ? 'Return to your own workspace layout'
      : `Temporarily try the ${item.label} layout without overwriting My Layout`;
  }
}

function stopLayoutGalleryRotation() {
  if (state.workspace.layoutGallery.timer === null) return;
  clearInterval(state.workspace.layoutGallery.timer);
  state.workspace.layoutGallery.timer = null;
}

function startLayoutGalleryRotation() {
  stopLayoutGalleryRotation();
  if (!layoutGallery || state.workspace.layoutGallery.paused || document.hidden) return;
  if (!state.workspace.layoutGallery.appForeground) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return;
  state.workspace.layoutGallery.timer = setInterval(() => {
    stepLayoutGallery(1, { restart: false });
  }, LAYOUT_GALLERY_ROTATION_MS);
}

function setLayoutGalleryAppForeground(foreground) {
  state.workspace.layoutGallery.appForeground = Boolean(foreground);
  if (state.workspace.layoutGallery.appForeground) startLayoutGalleryRotation();
  else stopLayoutGalleryRotation();
}

function stepLayoutGallery(delta, options = {}) {
  const count = LAYOUT_GALLERY_ITEMS.length;
  state.workspace.layoutGallery.index = (state.workspace.layoutGallery.index + Number(delta || 0) + count) % count;
  renderLayoutGallery();
  if (options.restart !== false) startLayoutGalleryRotation();
}

function isPanelPoppedOut(panelId) {
  return Boolean(state.workspace.activePopouts?.[panelId]?.open);
}

function panelHasLiveSurface(panelId) {
  if (isPanelPoppedOut(panelId)) return true;
  if (document.hidden || state.workspace.activePanels?.[panelId] === false) return false;
  const definition = SIDEBAR_PANELS.find((panel) => panel.id === panelId);
  const section = definition ? $(definition.selector) : null;
  return Boolean(section && !section.hidden && section.dataset.tabActive !== 'false');
}

function refreshDeferredPanelRenders() {
  if (state.affects?.renderDirty && panelHasLiveSurface('affects')) renderAffects();
  if (state.mobInspector?.renderDirty && panelHasLiveSurface('mobInspector')) renderMobInspector();
  if (state.contextDeck?.renderDirty && panelHasLiveSurface('contextDeck')) renderContextDeck();
  if (state.mapper?.renderDirty && panelHasLiveSurface('mapper')) scheduleMapperRender();
}

function workspaceExtent() {
  const bounds = workspaceRoot?.getBoundingClientRect?.() || {};
  const measuredWidth = Math.max(
    0,
    Number(workspaceRoot?.clientWidth) || 0,
    Number(bounds.width) || 0
  );
  const measuredHeight = Math.max(
    0,
    Number(workspaceRoot?.clientHeight) || 0,
    Number(bounds.height) || 0
  );

  return {
    width: measuredWidth || window.innerWidth || 1180,
    height: measuredHeight || Math.max(488, (window.innerHeight || 780) - 72),
    hasMeasuredWidth: measuredWidth > 0,
    hasMeasuredHeight: measuredHeight > 0
  };
}

function fitDockSizesToWorkspace(sizes) {
  const normalized = normalizeDockSizes(sizes, state.workspace.defaultDockSizes);
  const extent = workspaceExtent();
  const visibleSideRegions = SIDE_DOCK_REGIONS.filter((region) =>
    workspaceRoot?.classList.contains(`has-${region}-dock`)
  );
  const fitted = { ...normalized };
  const bottomVisible = workspaceRoot?.classList.contains('has-bottom-dock');

  const sideSplitterSpace = visibleSideRegions.length * DOCK_RESIZER_SIZE;
  const availableSideSpace = Math.max(
    0,
    extent.width - MINIMUM_TERMINAL_WIDTH - sideSplitterSpace
  );

  // JSDOM and other non-layout environments report no real workspace box.
  // Preserve requested values there. Electron supplies a measured workspace,
  // where all visible side docks share the available space while retaining
  // the terminal's minimum review width.
  if (extent.hasMeasuredWidth && visibleSideRegions.length) {
    const minimumTotal = visibleSideRegions.reduce(
      (total, region) => total + DOCK_SIZE_LIMITS[region].minimum,
      0
    );
    const available = Math.max(minimumTotal, availableSideSpace);
    const desiredTotal = visibleSideRegions.reduce(
      (total, region) => total + normalized[region],
      0
    );

    if (desiredTotal > available) {
      const extras = Object.fromEntries(visibleSideRegions.map((region) => [
        region,
        Math.max(0, normalized[region] - DOCK_SIZE_LIMITS[region].minimum)
      ]));
      let remainingExtra = Math.max(0, available - minimumTotal);
      let remainingWeight = Object.values(extras).reduce((total, value) => total + value, 0);

      visibleSideRegions.forEach((region, index) => {
        const minimum = DOCK_SIZE_LIMITS[region].minimum;
        const remainingCount = visibleSideRegions.length - index;
        let allocation;
        if (remainingCount === 1) {
          allocation = remainingExtra;
        } else if (remainingWeight > 0) {
          allocation = Math.round(remainingExtra * (extras[region] / remainingWeight));
        } else {
          allocation = Math.floor(remainingExtra / remainingCount);
        }
        allocation = Math.max(0, Math.min(remainingExtra, allocation));
        fitted[region] = minimum + allocation;
        remainingExtra -= allocation;
        remainingWeight -= extras[region];
      });
    }
  }

  if (bottomVisible && extent.hasMeasuredHeight) {
    const availableBottomSpace = Math.max(
      DOCK_SIZE_LIMITS.bottom.minimum,
      extent.height - MINIMUM_TERMINAL_HEIGHT - DOCK_RESIZER_SIZE
    );
    fitted.bottom = Math.min(normalized.bottom, availableBottomSpace);
  }

  return Object.fromEntries(
    DOCK_REGIONS.map((region) => [region, Math.round(fitted[region])])
  );
}

function dynamicDockMaximum(region) {
  const extent = workspaceExtent();
  const effective = state.workspace.effectiveDockSizes;
  if (region === 'bottom') {
    if (!extent.hasMeasuredHeight) return DOCK_SIZE_LIMITS.bottom.maximum;
    return Math.max(
      DOCK_SIZE_LIMITS.bottom.minimum,
      Math.min(
        DOCK_SIZE_LIMITS.bottom.maximum,
        extent.height - MINIMUM_TERMINAL_HEIGHT - DOCK_RESIZER_SIZE
      )
    );
  }

  if (!SIDE_DOCK_REGIONS.includes(region)) return 0;
  if (!extent.hasMeasuredWidth) return DOCK_SIZE_LIMITS[region].maximum;

  const visibleSideRegions = SIDE_DOCK_REGIONS.filter((candidate) =>
    workspaceRoot?.classList.contains(`has-${candidate}-dock`)
  );
  if (!visibleSideRegions.includes(region)) visibleSideRegions.push(region);
  const splitterSpace = visibleSideRegions.length * DOCK_RESIZER_SIZE;
  const otherSize = visibleSideRegions
    .filter((candidate) => candidate !== region)
    .reduce((total, candidate) => total + effective[candidate], 0);

  return Math.max(
    DOCK_SIZE_LIMITS[region].minimum,
    Math.min(
      DOCK_SIZE_LIMITS[region].maximum,
      extent.width - MINIMUM_TERMINAL_WIDTH - splitterSpace - otherSize
    )
  );
}

function panelsInRegion(layout, region) {
  return SIDEBAR_PANELS
    .filter((panel) => layout[panel.id]?.region === region)
    .sort((left, right) => layout[left.id].order - layout[right.id].order);
}

function dockLabel(region) {
  if (region === 'right') return 'right';
  if (region === 'outer-right') return 'far-right';
  if (region === 'bottom') return 'lower';
  return 'left';
}

function tabButtonId(groupId, panelId) {
  return `panel-tab-${groupId}-${panelId}`;
}

function visiblePanelsInGroup(group) {
  return group.panels.filter((panel) =>
    state.workspace.activePanels[panel.id] !== false && !isPanelPoppedOut(panel.id)
  );
}

function renderPanelGroups() {
  const dockScrollPositions = Object.fromEntries(
    DOCK_REGIONS.map((region) => [region, Number(dockElements[region]?.scrollTop) || 0])
  );
  const communicationsContainer = $('#communications-messages');
  const communicationsOrder = communicationMessageOrder();
  const communicationsScrollSnapshot = communicationsContainer
    && state.workspace.activePanels.communications !== false
    && !isPanelPoppedOut('communications')
    ? {
        scrollTop: communicationsContainer.scrollTop,
        scrollHeight: communicationsContainer.scrollHeight,
        atLiveEdge: communicationsAtLiveEdge(communicationsContainer, communicationsOrder),
        followLiveEdge: communicationFollowsLiveEdge(),
        snapToLive: false
      }
    : null;
  const panelSections = new Map();
  for (const panel of SIDEBAR_PANELS) {
    const section = $(panel.selector);
    if (!section) continue;
    panelSections.set(panel.id, section);
    section.removeAttribute('role');
    const heading = section.querySelector('h2[id]');
    if (heading) section.setAttribute('aria-labelledby', heading.id);
    section.removeAttribute('data-tab-group');
    section.removeAttribute('data-tab-active');
    section.hidden = state.workspace.activePanels[panel.id] === false || isPanelPoppedOut(panel.id);
  }

  for (const region of DOCK_REGIONS) {
    const dock = dockElements[region];
    if (!dock) continue;
    const fragment = document.createDocumentFragment();

    for (const group of panelGroupsInRegion(
      state.workspace.activeLayout,
      state.workspace.activeTabGroups,
      region
    )) {
      const visiblePanels = visiblePanelsInGroup(group);
      const selected = visiblePanels.some((panel) => panel.id === state.workspace.activeTabs[group.id])
        ? state.workspace.activeTabs[group.id]
        : visiblePanels[0]?.id || group.panels[0]?.id;

      if (group.panels.length === 1) {
        const section = panelSections.get(group.panels[0].id);
        if (section) {
          section.dataset.tabActive = 'true';
          fragment.append(section);
        }
        continue;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'dock-tab-group';
      wrapper.dataset.tabGroup = group.id;
      wrapper.hidden = visiblePanels.length === 0;

      const tabList = document.createElement('div');
      tabList.className = 'panel-tablist';
      tabList.setAttribute('role', 'tablist');
      tabList.setAttribute('aria-label', `${dockLabel(region)} dock panel tabs`);
      tabList.hidden = visiblePanels.length <= 1;

      for (const panel of visiblePanels) {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'panel-tab';
        tab.id = tabButtonId(group.id, panel.id);
        tab.dataset.panelTab = panel.id;
        tab.dataset.tabGroup = group.id;
        tab.draggable = true;
        tab.title = `Drag ${panel.label} to reorder or move this tab.`;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', panelSections.get(panel.id)?.id || '');
        tab.setAttribute('aria-selected', String(panel.id === selected));
        tab.setAttribute('aria-label', panel.label);
        tab.tabIndex = panel.id === selected ? 0 : -1;
        tab.textContent = panelVisualLabel(panel.id);
        tabList.append(tab);
      }

      const content = document.createElement('div');
      content.className = 'panel-tab-content';

      for (const panel of group.panels) {
        const section = panelSections.get(panel.id);
        if (!section) continue;
        const active = panel.id === selected;
        section.dataset.tabGroup = group.id;
        section.dataset.tabActive = String(active);
        section.setAttribute('role', 'tabpanel');
        section.setAttribute('aria-labelledby', tabButtonId(group.id, panel.id));
        content.append(section);
      }

      wrapper.append(tabList, content);
      fragment.append(wrapper);
    }

    dock.replaceChildren(fragment);
    dock.scrollTop = dockScrollPositions[region];
  }

  for (const tab of document.querySelectorAll('[data-panel-tab]')) {
    tab.addEventListener('click', () => {
      activatePanelTab(tab.dataset.tabGroup, tab.dataset.panelTab, {
        persist: true,
        announceChange: true,
        focusTab: true
      });
    });
    tab.addEventListener('keydown', handlePanelTabKeydown);
  }
  syncPanelPopoutObservers();
  refreshDeferredPanelRenders();
  if (communicationsScrollSnapshot) {
    scheduleFrame(() => restoreCommunicationsScroll(
      communicationsContainer,
      communicationsScrollSnapshot,
      communicationsOrder
    ));
  }
}

function persistTabState() {
  const key = workspacePersistenceCharacterKey();
  if (key) {
    const current = state.workspace.characters[key] || {};
    state.workspace.characters[key] = {
      ...current,
      name: state.workspace.currentCharacterName || current.name || key,
      panels: normalizePanelVisibility(current.panels, state.workspace.activePanels),
      layout: normalizePanelLayout(current.layout, state.workspace.activeLayout),
      dockSizes: normalizeDockSizes(current.dockSizes, state.workspace.activeDockSizes),
      tabGroups: { ...state.workspace.activeTabGroups },
      activeTabs: { ...state.workspace.activeTabs }
    };
  } else {
    state.workspace.defaultTabGroups = { ...state.workspace.activeTabGroups };
    state.workspace.defaultActiveTabs = { ...state.workspace.activeTabs };
  }
  schedulePersistentSettingsSave();
}

function activatePanelTab(groupId, panelId, options = {}) {
  const group = DOCK_REGIONS
    .flatMap((region) => panelGroupsInRegion(
      state.workspace.activeLayout,
      state.workspace.activeTabGroups,
      region
    ))
    .find((candidate) => candidate.id === groupId);
  if (!group || !group.panels.some((panel) => panel.id === panelId)) return;

  state.workspace.activeTabs = normalizeActiveTabs(
    { ...state.workspace.activeTabs, [groupId]: panelId },
    state.workspace.activeTabGroups,
    state.workspace.activeLayout,
    state.workspace.defaultActiveTabs
  );
  renderPanelGroups();
  updateDockVisibility();
  if (options.persist) persistTabState();
  if (panelId === 'communications') {
    setCommunicationChannel(state.workspace.activeCommunications.activeChannel, { persist: false });
  }

  if (options.focusTab) {
    scheduleFrame(() => document.getElementById(tabButtonId(groupId, panelId))?.focus({ preventScroll: true }));
  }
  if (options.announceChange) {
    const panel = SIDEBAR_PANELS.find((candidate) => candidate.id === panelId);
    announce(`${panel?.label || 'Panel'} tab selected.`, { force: true });
  }
}

function handlePanelTabKeydown(event) {
  const tab = event.currentTarget;
  const tabList = tab.closest('[role="tablist"]');
  if (!tabList) return;
  const tabs = [...tabList.querySelectorAll('[role="tab"]')];
  const index = tabs.indexOf(tab);
  let nextIndex = null;

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = tabs.length - 1;

  if (nextIndex === null) return;
  event.preventDefault();
  const next = tabs[nextIndex];
  activatePanelTab(next.dataset.tabGroup, next.dataset.panelTab, {
    persist: true,
    announceChange: false,
    focusTab: true
  });
}

function updatePanelScopeStatus() {
  const panelStatus = $('#panel-scope-status');
  const layoutStatus = $('#layout-scope-status');
  const sharedToggle = $('#shared-crew-workspace');
  const owner = state.workspace.sharedCrewWorkspace
    ? 'the shared crew workspace'
    : (state.workspace.currentCharacterName || 'the default workspace');

  if (sharedToggle) sharedToggle.checked = state.workspace.sharedCrewWorkspace;

  if (panelStatus) {
    if (state.workspace.sharedCrewWorkspace) {
      panelStatus.textContent = 'Saving one shared panel layout for every session. The active session changes the panel data, not the window arrangement.';
    } else {
      panelStatus.textContent = state.workspace.currentCharacterName
        ? `Saving panel choices for ${state.workspace.currentCharacterName}.`
        : 'Saving panel choices as the default workspace until a character is identified.';
    }
  }

  if (layoutStatus) {
    const summaries = DOCK_REGIONS
      .map((region) => {
        const count = panelsInRegion(state.workspace.activeLayout, region).length;
        return count ? `${count} ${dockLabel(region)}` : '';
      })
      .filter(Boolean);
    const tabbedGroups = DOCK_REGIONS
      .flatMap((region) => panelGroupsInRegion(
        state.workspace.activeLayout,
        state.workspace.activeTabGroups,
        region
      ))
      .filter((group) => group.panels.length > 1).length;
    const tabSummary = tabbedGroups
      ? ` ${tabbedGroups} tab group${tabbedGroups === 1 ? '' : 's'}.`
      : ' No tab groups.';
    const openWindows = POPOUT_PANEL_IDS
      .filter((panelId) => isPanelPoppedOut(panelId))
      .map((panelId) => panelWindowDefinition(panelId).label);
    const popoutSummary = openWindows.length
      ? ` Separate windows: ${openWindows.join(', ')}.`
      : '';
    layoutStatus.textContent = `Layout for ${owner}: ${summaries.join(', ')}.${tabSummary}${popoutSummary}`;
  }

  const sizeStatus = $('#dock-size-status');
  if (sizeStatus) {
    const sizes = state.workspace.effectiveDockSizes;
    sizeStatus.textContent = `Dock sizes for ${owner}: left ${sizes.left} pixels, right ${sizes.right} pixels, far-right ${sizes['outer-right']} pixels, lower ${sizes.bottom} pixels.`;
  }
}

function updateDockVisibility() {
  for (const region of DOCK_REGIONS) {
    const dock = dockElements[region];
    if (!dock) continue;
    const hasVisiblePanels = [...dock.querySelectorAll('[data-workspace-panel]')].some(
      (panel) => !panel.hidden && panel.dataset.tabActive !== 'false'
    );
    dock.hidden = !hasVisiblePanels;
    workspaceRoot?.classList.toggle(`has-${region}-dock`, hasVisiblePanels);
    if (dockResizerElements[region]) {
      dockResizerElements[region].hidden = !hasVisiblePanels;
    }
  }

  applyDockSizes(state.workspace.activeDockSizes, { persist: false });
  updatePanelScopeStatus();
  scheduleTerminalSizeUpdate();
}

function applyDockSizes(sizes, options = {}) {
  const normalized = normalizeDockSizes(sizes, state.workspace.defaultDockSizes);
  const effective = fitDockSizesToWorkspace(normalized);
  state.workspace.activeDockSizes = normalized;
  state.workspace.effectiveDockSizes = effective;

  workspaceRoot?.style.setProperty('--preferred-left-dock-width', `${effective.left}px`);
  workspaceRoot?.style.setProperty('--preferred-right-dock-width', `${effective.right}px`);
  workspaceRoot?.style.setProperty('--preferred-outer-right-dock-width', `${effective['outer-right']}px`);
  workspaceRoot?.style.setProperty('--preferred-bottom-dock-height', `${effective.bottom}px`);

  for (const region of DOCK_REGIONS) {
    const resizer = dockResizerElements[region];
    if (!resizer) continue;
    const limits = DOCK_SIZE_LIMITS[region];
    const maximum = Math.max(limits.minimum, Math.round(dynamicDockMaximum(region)));
    resizer.setAttribute('aria-valuemin', String(limits.minimum));
    resizer.setAttribute('aria-valuemax', String(maximum));
    resizer.setAttribute('aria-valuenow', String(effective[region]));
    resizer.setAttribute('aria-valuetext', `${dockLabel(region)} dock ${effective[region]} pixels`);
  }

  if (options.persist) {
    const key = workspacePersistenceCharacterKey();
    if (key) {
      const current = state.workspace.characters[key] || {};
      state.workspace.characters[key] = {
        ...current,
        name: state.workspace.currentCharacterName || current.name || key,
        panels: normalizePanelVisibility(current.panels, state.workspace.activePanels),
        layout: normalizePanelLayout(current.layout, state.workspace.activeLayout),
        dockSizes: { ...normalized },
        tabGroups: normalizeTabGroups(current.tabGroups, state.workspace.activeLayout, state.workspace.activeTabGroups),
        activeTabs: normalizeActiveTabs(current.activeTabs, state.workspace.activeTabGroups, state.workspace.activeLayout, state.workspace.activeTabs)
      };
    } else {
      state.workspace.defaultDockSizes = { ...normalized };
    }
    flushWorkspaceGeometrySaveNow();
  }

  updatePanelScopeStatus();
  scheduleTerminalSizeUpdate();

  if (options.announceChange) {
    const region = options.region;
    const message = region
      ? `${dockLabel(region)} dock resized to ${effective[region]} pixels.`
      : 'Dock sizes updated.';
    announce(options.announcement || message, { force: true });
  }
}

function setDockSize(region, size, options = {}) {
  if (!DOCK_REGIONS.includes(region)) return;
  const limits = DOCK_SIZE_LIMITS[region];
  const maximum = dynamicDockMaximum(region);
  const bounded = Math.max(
    limits.minimum,
    Math.min(maximum, Math.round(Number(size) || DEFAULT_DOCK_SIZES[region]))
  );
  applyDockSizes({
    ...state.workspace.activeDockSizes,
    [region]: bounded
  }, {
    ...options,
    region
  });
}

function resetDockSize(region, options = {}) {
  if (!DOCK_REGIONS.includes(region)) return;
  setDockSize(region, DEFAULT_DOCK_SIZES[region], {
    persist: true,
    announceChange: options.announceChange !== false,
    announcement: `${dockLabel(region)} dock size restored.`
  });
}

function beginDockResize(event, region) {
  if (!DOCK_REGIONS.includes(region) || event.button > 0) return;
  event.preventDefault();
  closeAllPanelMenus();
  const resizer = dockResizerElements[region];
  const coordinate = region === 'bottom' ? event.clientY : event.clientX;
  state.workspace.resizeSession = {
    region,
    startCoordinate: Number(coordinate) || 0,
    startSize: state.workspace.effectiveDockSizes[region],
    pointerId: event.pointerId,
    returnFocus: document.activeElement
  };
  resizer?.setAttribute('data-resizing', 'true');
  resizer?.setPointerCapture?.(event.pointerId);
  document.body.classList.add(
    'resizing-dock',
    region === 'bottom' ? 'resizing-dock-horizontal' : 'resizing-dock-vertical'
  );
}

function continueDockResize(event) {
  const session = state.workspace.resizeSession;
  if (!session) return;
  const coordinate = session.region === 'bottom' ? event.clientY : event.clientX;
  const movement = (Number(coordinate) || 0) - session.startCoordinate;
  const delta = session.region === 'right' || session.region === 'outer-right' || session.region === 'bottom'
    ? -movement
    : movement;
  setDockSize(session.region, session.startSize + delta, { persist: false });
}

function finishDockResize(event) {
  const session = state.workspace.resizeSession;
  if (!session) return;
  const resizer = dockResizerElements[session.region];
  resizer?.releasePointerCapture?.(session.pointerId ?? event?.pointerId);
  resizer?.removeAttribute('data-resizing');
  document.body.classList.remove(
    'resizing-dock',
    'resizing-dock-horizontal',
    'resizing-dock-vertical'
  );
  state.workspace.resizeSession = null;
  applyDockSizes(state.workspace.activeDockSizes, {
    persist: true,
    announceChange: true,
    region: session.region
  });
  const focusTarget = session.returnFocus;
  if (focusTarget?.isConnected && typeof focusTarget.focus === 'function') {
    focusTarget.focus({ preventScroll: true });
  }
}

function resizeDockWithKeyboard(event, region) {
  if (!DOCK_REGIONS.includes(region)) return;
  const current = state.workspace.effectiveDockSizes[region];
  const step = event.shiftKey ? 30 : 10;
  let next = null;

  if (event.key === 'Home') next = DOCK_SIZE_LIMITS[region].minimum;
  else if (event.key === 'End') next = dynamicDockMaximum(region);
  else if (region === 'left' && event.key === 'ArrowLeft') next = current - step;
  else if (region === 'left' && event.key === 'ArrowRight') next = current + step;
  else if ((region === 'right' || region === 'outer-right') && event.key === 'ArrowLeft') next = current + step;
  else if ((region === 'right' || region === 'outer-right') && event.key === 'ArrowRight') next = current - step;
  else if (region === 'bottom' && event.key === 'ArrowUp') next = current + step;
  else if (region === 'bottom' && event.key === 'ArrowDown') next = current - step;

  if (next === null) return;
  event.preventDefault();
  setDockSize(region, next, {
    persist: true,
    announceChange: true
  });
}

function closePanelMenu(panelId, options = {}) {
  const menu = $(`[data-panel-menu="${panelId}"]`);
  const button = $(`[data-panel-menu-button="${panelId}"]`);
  if (menu) {
    menu.hidden = true;
    menu.style.removeProperty('top');
    menu.style.removeProperty('left');
  }
  if (button) button.setAttribute('aria-expanded', 'false');
  if (state.workspace.openMenuPanelId === panelId) {
    state.workspace.openMenuPanelId = '';
  }
  if (options.returnFocus && button && !button.closest('[data-workspace-panel]')?.hidden) {
    button.focus({ preventScroll: true });
  }
}

function positionPanelMenu(panelId) {
  const menu = $(`[data-panel-menu="${panelId}"]`);
  const button = $(`[data-panel-menu-button="${panelId}"]`);
  if (!menu || !button || menu.hidden) return;

  const rect = button.getBoundingClientRect();
  const margin = 8;
  const gap = 4;
  const width = menu.offsetWidth || 196;
  const height = menu.offsetHeight || 320;
  const viewportWidth = Math.max(width + margin * 2, Number(window.innerWidth) || document.documentElement.clientWidth || 1024);
  const viewportHeight = Math.max(height + margin * 2, Number(window.innerHeight) || document.documentElement.clientHeight || 768);

  let left = rect.right - width;
  let top = rect.bottom + gap;
  if (top + height > viewportHeight - margin) top = rect.top - height - gap;
  left = Math.min(Math.max(margin, left), viewportWidth - width - margin);
  top = Math.min(Math.max(margin, top), viewportHeight - height - margin);

  menu.style.left = `${Math.round(left)}px`;
  menu.style.top = `${Math.round(top)}px`;
}

function positionOpenPanelMenu() {
  if (state.workspace.openMenuPanelId) positionPanelMenu(state.workspace.openMenuPanelId);
}

function initializePanelMenuLayer() {
  if (!panelMenuLayer) return;
  for (const menu of document.querySelectorAll('[data-panel-menu]')) {
    if (menu.parentElement !== panelMenuLayer) panelMenuLayer.append(menu);
  }
}

function closeAllPanelMenus(options = {}) {
  for (const panel of SIDEBAR_PANELS) {
    closePanelMenu(panel.id, {
      returnFocus: options.returnFocus && panel.id === state.workspace.openMenuPanelId
    });
  }
}

function updatePanelMenuState(panelId) {
  const entry = state.workspace.activeLayout[panelId];
  if (!entry) return;

  const groups = panelGroupsInRegion(
    state.workspace.activeLayout,
    state.workspace.activeTabGroups,
    entry.region
  );
  const groupId = state.workspace.activeTabGroups[panelId] || panelId;
  const groupIndex = groups.findIndex((group) => group.id === groupId);
  const group = groups[groupIndex];
  const tabIndex = group?.panels.findIndex((panel) => panel.id === panelId) ?? -1;
  const grouped = Boolean(group && group.panels.length > 1);
  const earlierItem = $(`[data-panel-action="move-earlier"][data-panel-id="${panelId}"]`);
  const laterItem = $(`[data-panel-action="move-later"][data-panel-id="${panelId}"]`);
  if (grouped) {
    if (earlierItem) earlierItem.textContent = 'Move Tab Left';
    if (laterItem) laterItem.textContent = 'Move Tab Right';
  } else if (entry.region === 'bottom') {
    if (earlierItem) earlierItem.textContent = 'Move Panel Left';
    if (laterItem) laterItem.textContent = 'Move Panel Right';
  } else {
    if (earlierItem) earlierItem.textContent = 'Move Panel Up';
    if (laterItem) laterItem.textContent = 'Move Panel Down';
  }
  const rules = {
    'move-left': entry.region === 'left',
    'move-right': entry.region === 'right',
    'move-outer-right': entry.region === 'outer-right',
    'move-bottom': entry.region === 'bottom',
    'tab-previous': groupIndex <= 0,
    'tab-next': groupIndex < 0 || groupIndex >= groups.length - 1,
    'separate-tab': !grouped,
    'move-earlier': grouped ? tabIndex <= 0 : groupIndex <= 0,
    'move-later': grouped
      ? tabIndex < 0 || tabIndex >= group.panels.length - 1
      : groupIndex < 0 || groupIndex >= groups.length - 1
  };

  for (const [action, disabled] of Object.entries(rules)) {
    const item = $(`[data-panel-action="${action}"][data-panel-id="${panelId}"]`);
    if (item) item.disabled = disabled;
  }
}

function openPanelMenu(panelId) {
  const menu = $(`[data-panel-menu="${panelId}"]`);
  const button = $(`[data-panel-menu-button="${panelId}"]`);
  if (!menu || !button) return;

  if (!menu.hidden) {
    closePanelMenu(panelId, { returnFocus: true });
    return;
  }

  closeAllPanelMenus();
  updatePanelMenuState(panelId);
  menu.hidden = false;
  button.setAttribute('aria-expanded', 'true');
  state.workspace.openMenuPanelId = panelId;
  positionPanelMenu(panelId);

  const firstItem = [...menu.querySelectorAll('[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])')][0];
  firstItem?.focus({ preventScroll: true });
}

function applyPanelLayout(layout, options = {}) {
  const normalized = normalizePanelLayout(layout, state.workspace.defaultLayout);
  state.workspace.activeLayout = normalized;
  state.workspace.activeTabGroups = normalizeTabGroups(
    state.workspace.activeTabGroups,
    normalized,
    state.workspace.defaultTabGroups
  );
  state.workspace.activeTabs = normalizeActiveTabs(
    state.workspace.activeTabs,
    state.workspace.activeTabGroups,
    normalized,
    state.workspace.defaultActiveTabs
  );
  closeAllPanelMenus();
  renderPanelGroups();

  if (options.persist) {
    const key = workspacePersistenceCharacterKey();
    if (key) {
      const current = state.workspace.characters[key] || {};
      state.workspace.characters[key] = {
        ...current,
        name: state.workspace.currentCharacterName || current.name || key,
        panels: normalizePanelVisibility(current.panels, state.workspace.activePanels),
        layout: structuredCloneSafe(normalized),
        dockSizes: normalizeDockSizes(current.dockSizes, state.workspace.activeDockSizes),
        tabGroups: { ...state.workspace.activeTabGroups },
        activeTabs: { ...state.workspace.activeTabs }
      };
    } else {
      state.workspace.defaultLayout = structuredCloneSafe(normalized);
      state.workspace.defaultTabGroups = { ...state.workspace.activeTabGroups };
      state.workspace.defaultActiveTabs = { ...state.workspace.activeTabs };
    }
    schedulePersistentSettingsSave();
  }

  updateDockVisibility();

  if (options.announceChange) {
    announce(options.announcement || 'Panel layout updated.', { force: true });
  }
}

function applyPanelVisibility(panels, options = {}) {
  const normalized = normalizePanelVisibility(panels, state.workspace.defaultPanels);
  state.workspace.activePanels = normalized;

  for (const panel of SIDEBAR_PANELS) {
    const visible = normalized[panel.id];
    const section = $(panel.selector);
    const toggle = $(`[data-panel-toggle="${panel.id}"]`);
    if (section) section.hidden = !visible;
    if (toggle) toggle.checked = visible;
  }

  renderPanelGroups();

  if (options.persist) {
    const key = workspacePersistenceCharacterKey();
    if (key) {
      const current = state.workspace.characters[key] || {};
      state.workspace.characters[key] = {
        ...current,
        name: state.workspace.currentCharacterName || current.name || key,
        panels: { ...normalized },
        layout: normalizePanelLayout(current.layout, state.workspace.activeLayout),
        dockSizes: normalizeDockSizes(current.dockSizes, state.workspace.activeDockSizes),
        tabGroups: normalizeTabGroups(current.tabGroups, state.workspace.activeLayout, state.workspace.activeTabGroups),
        activeTabs: normalizeActiveTabs(current.activeTabs, state.workspace.activeTabGroups, state.workspace.activeLayout, state.workspace.activeTabs)
      };
    } else {
      state.workspace.defaultPanels = { ...normalized };
    }
    schedulePersistentSettingsSave();
  }

  updateDockVisibility();

  if (options.announceChange) {
    const visibleCount = Object.values(normalized).filter(Boolean).length;
    announce(`${visibleCount} panel${visibleCount === 1 ? '' : 's'} visible.`, { force: true });
  }
}

function reorderRegionPanels(layout, region, orderedPanelIds) {
  const next = structuredCloneSafe(layout);
  orderedPanelIds.forEach((panelId, order) => {
    next[panelId] = { ...next[panelId], region, order };
  });
  return next;
}

function movePanel(panelId, destination) {
  if (!SIDEBAR_PANELS.some((panel) => panel.id === panelId)) return;
  let next = structuredCloneSafe(state.workspace.activeLayout);
  const nextTabGroups = { ...state.workspace.activeTabGroups };
  const nextActiveTabs = { ...state.workspace.activeTabs };
  const current = next[panelId];
  if (!current) return;

  const currentGroupId = nextTabGroups[panelId] || panelId;
  const groups = panelGroupsInRegion(next, nextTabGroups, current.region);
  const currentGroupIndex = groups.findIndex((group) => group.id === currentGroupId);
  const currentGroup = groups[currentGroupIndex];

  if (DOCK_REGIONS.includes(destination)) {
    const destinationPanels = panelsInRegion(next, destination)
      .filter((panel) => panel.id !== panelId)
      .map((panel) => panel.id);
    next[panelId] = { region: destination, order: destinationPanels.length };
    next = reorderRegionPanels(next, destination, [...destinationPanels, panelId]);
    nextTabGroups[panelId] = panelId;
    nextActiveTabs[panelId] = panelId;
  } else if (destination === 'earlier' || destination === 'later') {
    if (!currentGroup) return;
    if (currentGroup.panels.length > 1) {
      const panelIds = currentGroup.panels.map((panel) => panel.id);
      const index = panelIds.indexOf(panelId);
      const otherIndex = destination === 'earlier' ? index - 1 : index + 1;
      if (index < 0 || otherIndex < 0 || otherIndex >= panelIds.length) return;
      [panelIds[index], panelIds[otherIndex]] = [panelIds[otherIndex], panelIds[index]];
      const regionIds = groups.flatMap((group) =>
        group.id === currentGroup.id ? panelIds : group.panels.map((panel) => panel.id)
      );
      next = reorderRegionPanels(next, current.region, regionIds);
    } else {
      const otherIndex = destination === 'earlier' ? currentGroupIndex - 1 : currentGroupIndex + 1;
      if (currentGroupIndex < 0 || otherIndex < 0 || otherIndex >= groups.length) return;
      [groups[currentGroupIndex], groups[otherIndex]] = [groups[otherIndex], groups[currentGroupIndex]];
      next = reorderRegionPanels(
        next,
        current.region,
        groups.flatMap((group) => group.panels.map((panel) => panel.id))
      );
    }
  } else {
    return;
  }

  state.workspace.activeTabGroups = normalizeTabGroups(
    nextTabGroups,
    next,
    state.workspace.defaultTabGroups
  );
  state.workspace.activeTabs = normalizeActiveTabs(
    nextActiveTabs,
    state.workspace.activeTabGroups,
    next,
    state.workspace.defaultActiveTabs
  );

  const panel = SIDEBAR_PANELS.find((item) => item.id === panelId);
  const destinationLabel = DOCK_REGIONS.includes(destination)
    ? `${dockLabel(destination)} dock`
    : (destination === 'earlier' ? 'earlier' : 'later');

  applyPanelLayout(next, {
    persist: true,
    announceChange: true,
    announcement: `${panel?.label || 'Panel'} moved ${destinationLabel}.`
  });

  $(`[data-panel-menu-button="${panelId}"]`)?.focus({ preventScroll: true });
}


function panelDragDefinition(panelId) {
  return SIDEBAR_PANELS.find((panel) => panel.id === panelId) || null;
}

function clearPanelDropIndicators() {
  for (const element of document.querySelectorAll(
    '.panel-drag-source, .panel-drop-target-before, .panel-drop-target-after, ' +
    '.panel-drop-target-tab, .panel-drop-target-dock, .panel-drop-horizontal, ' +
    '.panel-tab-drop-before, .panel-tab-drop-after'
  )) {
    element.classList.remove(
      'panel-drag-source',
      'panel-drop-target-before',
      'panel-drop-target-after',
      'panel-drop-target-tab',
      'panel-drop-target-dock',
      'panel-drop-horizontal',
      'panel-tab-drop-before',
      'panel-tab-drop-after'
    );
  }
}

function endPanelDrag() {
  clearPanelDropIndicators();
  document.body.classList.remove('panel-dragging');
  state.workspace.panelDragSession = null;
}

function panelDragSourceFromEvent(event) {
  const target = event.target?.closest?.('[data-panel-tab], .panel-titlebar');
  if (!target) return null;

  if (target.matches('.panel-titlebar')) {
    const interactive = event.target?.closest?.(
      'button, input, select, textarea, a, [contenteditable="true"]'
    );
    if (interactive) return null;
    return target.closest('[data-workspace-panel]')?.dataset.workspacePanel || null;
  }

  return target.dataset.panelTab || null;
}

function beginPanelDrag(event) {
  const dragSurface = event.target?.closest?.('[data-panel-tab], .panel-titlebar');
  if (!dragSurface) return;

  const panelId = panelDragSourceFromEvent(event);
  if (!panelId || !panelDragDefinition(panelId) ||
      state.workspace.activePanels[panelId] === false || isPanelPoppedOut(panelId)) {
    event.preventDefault();
    return;
  }

  closeAllPanelMenus();
  state.workspace.panelDragSession = { panelId, intent: null };
  document.body.classList.add('panel-dragging');
  dragSurface.classList.add('panel-drag-source');
  $(panelDragDefinition(panelId).selector)?.classList.add('panel-drag-source');

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `nukefire-panel:${panelId}`);
  }
}

function panelDropRatio(event, element, region) {
  const rect = element?.getBoundingClientRect?.();
  if (!rect) return 0.5;

  if (region === 'bottom') {
    const width = Number(rect.width) || Math.max(1, Number(rect.right) - Number(rect.left));
    if (!Number.isFinite(width) || width <= 1) return 0.5;
    return Math.max(0, Math.min(1, (Number(event.clientX) - Number(rect.left)) / width));
  }

  const height = Number(rect.height) || Math.max(1, Number(rect.bottom) - Number(rect.top));
  if (!Number.isFinite(height) || height <= 1) return 0.5;
  return Math.max(0, Math.min(1, (Number(event.clientY) - Number(rect.top)) / height));
}

function resolvePanelDropIntent(event, sourcePanelId) {
  const target = event.target?.closest?.(
    '[data-panel-drag-dock-target], [data-panel-tab], [data-workspace-panel], ' +
    '.dock-tab-group, [data-dock-region]'
  );
  if (!target) return null;

  const overlayTarget = target.closest('[data-panel-drag-dock-target]');
  if (overlayTarget) {
    const region = overlayTarget.dataset.panelDragDockTarget;
    if (!DOCK_REGIONS.includes(region)) return null;
    return {
      kind: 'dock',
      region,
      element: overlayTarget
    };
  }

  const dock = target.closest('[data-dock-region]');
  const region = dock?.dataset.dockRegion;
  if (!dock || !DOCK_REGIONS.includes(region)) return null;

  const targetTab = target.closest('[data-panel-tab]');
  if (targetTab) {
    const targetPanelId = targetTab.dataset.panelTab;
    if (!targetPanelId || targetPanelId === sourcePanelId) return null;
    const rect = targetTab.getBoundingClientRect();
    const width = Number(rect.width) || Math.max(1, Number(rect.right) - Number(rect.left));
    const ratio = width > 1
      ? Math.max(0, Math.min(1, (Number(event.clientX) - Number(rect.left)) / width))
      : 0.5;
    return {
      kind: 'tab',
      region,
      targetPanelId,
      position: ratio < 0.5 ? 'before' : 'after',
      element: targetTab
    };
  }

  const targetPanel = target.closest('[data-workspace-panel]');
  if (targetPanel) {
    const targetPanelId = targetPanel.dataset.workspacePanel;
    if (!targetPanelId || targetPanelId === sourcePanelId) return null;
    const topLevel = targetPanel.closest('.dock-tab-group') || targetPanel;
    const ratio = panelDropRatio(event, topLevel, region);
    if (ratio < 0.25) {
      return {
        kind: 'position',
        region,
        targetPanelId,
        position: 'before',
        element: topLevel
      };
    }
    if (ratio > 0.75) {
      return {
        kind: 'position',
        region,
        targetPanelId,
        position: 'after',
        element: topLevel
      };
    }
    return {
      kind: 'tab',
      region,
      targetPanelId,
      position: 'after',
      center: true,
      element: topLevel
    };
  }

  const targetGroup = target.closest('.dock-tab-group');
  if (targetGroup) {
    const groupId = targetGroup.dataset.tabGroup;
    const targetPanelId = state.workspace.activeTabs[groupId] ||
      targetGroup.querySelector('[data-panel-tab]')?.dataset.panelTab;
    if (targetPanelId && targetPanelId !== sourcePanelId) {
      return {
        kind: 'tab',
        region,
        targetPanelId,
        position: 'after',
        center: true,
        element: targetGroup
      };
    }
  }

  return {
    kind: 'dock',
    region,
    element: dock
  };
}

function showPanelDropIntent(intent) {
  clearPanelDropIndicators();
  const sourcePanelId = state.workspace.panelDragSession?.panelId;
  if (sourcePanelId) {
    const sourcePanel = panelDragDefinition(sourcePanelId);
    if (sourcePanel) $(sourcePanel.selector)?.classList.add('panel-drag-source');
  }
  if (!intent?.element) return;

  if (intent.kind === 'dock') {
    intent.element.classList.add('panel-drop-target-dock');
  } else if (intent.kind === 'tab') {
    if (intent.element.matches?.('[data-panel-tab]')) {
      intent.element.classList.add(
        intent.position === 'before' ? 'panel-tab-drop-before' : 'panel-tab-drop-after'
      );
    } else {
      intent.element.classList.add('panel-drop-target-tab');
    }
  } else if (intent.kind === 'position') {
    intent.element.classList.add(
      intent.position === 'before'
        ? 'panel-drop-target-before'
        : 'panel-drop-target-after'
    );
    if (intent.region === 'bottom') intent.element.classList.add('panel-drop-horizontal');
  }
}

function performPanelDrop(panelId, intent) {
  const panel = panelDragDefinition(panelId);
  if (!panel || !intent || !DOCK_REGIONS.includes(intent.region)) return false;
  if (intent.targetPanelId === panelId) return false;

  const originalSourceGroupId = state.workspace.activeTabGroups[panelId] || panelId;
  const originalTargetGroupId = intent.targetPanelId
    ? (state.workspace.activeTabGroups[intent.targetPanelId] || intent.targetPanelId)
    : '';
  const oldRegion = state.workspace.activeLayout[panelId]?.region;
  const result = panelDragLayoutApi.applyPanelDropLayout?.({
    panelIds: SIDEBAR_PANELS.map((candidate) => candidate.id),
    dockRegions: DOCK_REGIONS,
    layout: state.workspace.activeLayout,
    tabGroups: state.workspace.activeTabGroups,
    activeTabs: state.workspace.activeTabs,
    panelId,
    intent
  });
  if (!result) return false;

  const layout = result.layout;
  state.workspace.activeTabGroups = normalizeTabGroups(
    result.tabGroups,
    layout,
    state.workspace.defaultTabGroups
  );
  state.workspace.activeTabs = normalizeActiveTabs(
    result.activeTabs,
    state.workspace.activeTabGroups,
    layout,
    state.workspace.defaultActiveTabs
  );

  const targetPanel = panelDragDefinition(intent.targetPanelId);
  let announcement;
  if (intent.kind === 'dock') {
    announcement = `${panel.label} moved to the ${dockLabel(intent.region)} dock.`;
  } else if (intent.kind === 'position') {
    announcement = `${panel.label} moved ${intent.position} ${targetPanel?.label || 'the target panel'}.`;
  } else if (originalSourceGroupId === originalTargetGroupId && oldRegion === intent.region) {
    announcement = `${panel.label} tab moved ${intent.position} ${targetPanel?.label || 'the target tab'}.`;
  } else {
    announcement = `${panel.label} joined ${targetPanel?.label || 'the target panel'} as a tab.`;
  }

  applyPanelLayout(layout, {
    persist: true,
    announceChange: true,
    announcement
  });
  return true;
}

function handlePanelDragOver(event) {
  const session = state.workspace.panelDragSession;
  if (!session) return;

  const intent = resolvePanelDropIntent(event, session.panelId);
  session.intent = intent;
  if (!intent) {
    clearPanelDropIndicators();
    const sourcePanel = panelDragDefinition(session.panelId);
    if (sourcePanel) $(sourcePanel.selector)?.classList.add('panel-drag-source');
    return;
  }

  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  showPanelDropIntent(intent);
}

function handlePanelDrop(event) {
  const session = state.workspace.panelDragSession;
  if (!session) return;

  const intent = resolvePanelDropIntent(event, session.panelId) || session.intent;
  if (!intent) {
    endPanelDrag();
    return;
  }

  event.preventDefault();
  performPanelDrop(session.panelId, intent);
  endPanelDrag();
}

function initializePanelDragAndDrop() {
  if (workspaceRoot && !$('#panel-drag-dock-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'panel-drag-dock-overlay';
    overlay.className = 'panel-drag-dock-overlay';
    overlay.setAttribute('aria-hidden', 'true');

    for (const region of DOCK_REGIONS) {
      const target = document.createElement('div');
      target.className = `panel-drag-dock-target panel-drag-dock-target-${region}`;
      target.dataset.panelDragDockTarget = region;
      target.textContent = `${dockLabel(region)} dock`;
      overlay.append(target);
    }
    workspaceRoot.append(overlay);
  }

  for (const panel of SIDEBAR_PANELS) {
    const titlebar = $(`${panel.selector} .panel-titlebar`);
    if (!titlebar) continue;
    titlebar.draggable = true;
    titlebar.dataset.panelDragHandle = panel.id;
    titlebar.title = `Drag ${panel.label} to move, reorder, or combine it as a tab.`;
  }

  document.addEventListener('dragstart', beginPanelDrag);
  document.addEventListener('dragover', handlePanelDragOver);
  document.addEventListener('drop', handlePanelDrop);
  document.addEventListener('dragend', endPanelDrag);
}

function tabPanelWithAdjacent(panelId, direction) {
  const layout = structuredCloneSafe(state.workspace.activeLayout);
  const tabGroups = { ...state.workspace.activeTabGroups };
  const activeTabs = { ...state.workspace.activeTabs };
  const entry = layout[panelId];
  if (!entry) return;

  const groups = panelGroupsInRegion(layout, tabGroups, entry.region);
  const currentGroupId = tabGroups[panelId] || panelId;
  const currentGroupIndex = groups.findIndex((group) => group.id === currentGroupId);
  const targetIndex = direction === 'previous' ? currentGroupIndex - 1 : currentGroupIndex + 1;
  if (currentGroupIndex < 0 || targetIndex < 0 || targetIndex >= groups.length) return;

  const targetGroup = groups[targetIndex];
  tabGroups[panelId] = targetGroup.id;
  activeTabs[targetGroup.id] = panelId;

  const ordered = panelsInRegion(layout, entry.region).map((panel) => panel.id);
  const withoutPanel = ordered.filter((id) => id !== panelId);
  const targetMemberIds = targetGroup.panels.map((panel) => panel.id);
  const insertionIndex = Math.max(...targetMemberIds.map((id) => withoutPanel.indexOf(id))) + 1;
  withoutPanel.splice(insertionIndex, 0, panelId);
  const nextLayout = reorderRegionPanels(layout, entry.region, withoutPanel);

  state.workspace.activeTabGroups = normalizeTabGroups(
    tabGroups,
    nextLayout,
    state.workspace.defaultTabGroups
  );
  state.workspace.activeTabs = normalizeActiveTabs(
    activeTabs,
    state.workspace.activeTabGroups,
    nextLayout,
    state.workspace.defaultActiveTabs
  );
  applyPanelLayout(nextLayout, {
    persist: true,
    announceChange: true,
    announcement: `${SIDEBAR_PANELS.find((panel) => panel.id === panelId)?.label || 'Panel'} joined a tab group.`
  });
}

function separatePanelTab(panelId) {
  const layout = structuredCloneSafe(state.workspace.activeLayout);
  const tabGroups = { ...state.workspace.activeTabGroups };
  const activeTabs = { ...state.workspace.activeTabs };
  const oldGroupId = tabGroups[panelId] || panelId;
  const members = SIDEBAR_PANELS.filter((panel) => tabGroups[panel.id] === oldGroupId);
  if (members.length <= 1) return;

  const result = panelDragLayoutApi.detachPanelForDrop?.({
    panelIds: SIDEBAR_PANELS.map((panel) => panel.id),
    panelId,
    tabGroups,
    activeTabs
  });
  if (!result) return;

  state.workspace.activeTabGroups = normalizeTabGroups(
    result.tabGroups,
    layout,
    state.workspace.defaultTabGroups
  );
  state.workspace.activeTabs = normalizeActiveTabs(
    result.activeTabs,
    state.workspace.activeTabGroups,
    layout,
    state.workspace.defaultActiveTabs
  );
  applyPanelLayout(layout, {
    persist: true,
    announceChange: true,
    announcement: `${SIDEBAR_PANELS.find((panel) => panel.id === panelId)?.label || 'Panel'} separated from its tab group.`
  });
}


function panelWindowDefinition(panelId) {
  const fallback = SIDEBAR_PANELS.find((panel) => panel.id === panelId);
  return panelWindowsApi.panelWindowDefinition?.(panelId)
    || PANEL_WINDOW_DEFINITIONS[panelId]
    || { label: fallback?.label || 'Panel', subtitle: `Live ${fallback?.label || 'NukeFire'} panel` };
}

function panelWindowPresentation(panelId) {
  const definition = panelWindowDefinition(panelId);
  return {
    ...definition,
    label: panelVisualLabel(panelId),
    accessibleLabel: definition.label
  };
}

function persistPanelPopouts() {
  const popouts = normalizePanelPopouts(state.workspace.activePopouts, state.workspace.defaultPopouts);
  const key = workspacePersistenceCharacterKey();
  if (key) {
    const current = state.workspace.characters[key] || {};
    state.workspace.characters[key] = {
      ...current,
      name: state.workspace.currentCharacterName || current.name || key,
      popouts
    };
  } else {
    state.workspace.defaultPopouts = popouts;
  }
  schedulePersistentSettingsSave();
}

function panelPopoutUiSnapshot() {
  return {
    interfaceBrightness: state.interfaceBrightness,
    uiFontFamily: UI_FONT_FAMILIES[state.uiFont] || UI_FONT_FAMILIES.system,
    terminalFontFamily: TERMINAL_FONT_FAMILIES[state.terminalFont] || TERMINAL_FONT_FAMILIES.menlo,
    fontSize: Number($('#font-size')?.value) || 16
  };
}

function communicationPopoutSnapshot() {
  const definition = panelWindowPresentation('communications');
  return {
    mode: 'communications',
    panelId: 'communications',
    label: definition.label,
    accessibleLabel: definition.accessibleLabel,
    subtitle: definition.subtitle,
    channels: communicationVisibleChannels().map((channel) => ({ id: channel.id, label: channel.label })),
    messages: state.communications.messages.map((message) => ({ ...message })),
    unread: { ...state.communications.unread },
    activeChannel: effectiveCommunicationChannel(),
    messageOrder: state.workspace.activeCommunications.messageOrder,
    theme: { ...state.terminalTheme },
    ui: panelPopoutUiSnapshot(),
    screenReaderMode: state.accessibility.screenReaderMode,
    monitorActive: Boolean(longSessionMonitor?.active)
  };
}

function mirroredPanelControls(root) {
  if (!root) return [];
  return [...root.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
    .filter((element) => !element.closest('.panel-titlebar') && !element.closest('.mapper-canvas-resizer'));
}

function synchronizeMirroredControlState(source, clone) {
  if (!source || !clone) return;
  if ('disabled' in source) clone.disabled = Boolean(source.disabled);
  if ('value' in source) {
    clone.value = String(source.value ?? '');
    if (clone.tagName === 'INPUT') clone.setAttribute('value', clone.value);
  }
  if ('checked' in source) {
    clone.checked = Boolean(source.checked);
    clone.toggleAttribute('checked', clone.checked);
  }
  if (source.tagName === 'TEXTAREA') clone.textContent = String(source.value ?? '');
  if (source.tagName === 'SELECT') {
    [...clone.options].forEach((option, index) => {
      const selected = Boolean(source.options[index]?.selected);
      option.selected = selected;
      option.toggleAttribute('selected', selected);
    });
  }
  clone.scrollTop = Number(source.scrollTop) || 0;
  clone.scrollLeft = Number(source.scrollLeft) || 0;
}

function genericPanelPopoutSnapshot(panelId) {
  const panel = SIDEBAR_PANELS.find((candidate) => candidate.id === panelId);
  const source = panel ? $(panel.selector) : null;
  const definition = panelWindowPresentation(panelId);
  panelPopoutRevision += 1;

  if (!source) {
    panelPopoutControlMaps.delete(panelId);
    return {
      mode: 'mirror',
      panelId,
      label: definition.label,
      accessibleLabel: definition.accessibleLabel,
      subtitle: definition.subtitle,
      revision: panelPopoutRevision,
      html: '<p class="panel-window-empty">This panel is not available in the main client.</p>',
      theme: { ...state.terminalTheme },
      ui: panelPopoutUiSnapshot(),
      screenReaderMode: state.accessibility.screenReaderMode,
      monitorActive: Boolean(longSessionMonitor?.active)
    };
  }

  const clone = source.cloneNode(true);
  clone.hidden = false;
  clone.classList.add('popout-mirrored-panel');
  clone.removeAttribute('data-workspace-panel');
  clone.removeAttribute('data-tab-active');
  clone.removeAttribute('role');
  clone.removeAttribute('aria-labelledby');
  clone.setAttribute('aria-label', `${definition.accessibleLabel} panel`);
  clone.querySelector('.panel-titlebar')?.remove();
  clone.querySelectorAll('.panel-menu, .panel-menu-button, .mapper-canvas-resizer, script, style')
    .forEach((element) => element.remove());
  clone.querySelectorAll('[draggable]').forEach((element) => element.removeAttribute('draggable'));
  clone.querySelectorAll('[aria-live]').forEach((element) => element.setAttribute('aria-live', 'off'));

  const sourceControls = mirroredPanelControls(source);
  const cloneControls = mirroredPanelControls(clone);
  const controlMap = new Map();
  const usedTokens = new Set();
  for (let index = 0; index < Math.min(sourceControls.length, cloneControls.length); index += 1) {
    const sourceControl = sourceControls[index];
    const cloneControl = cloneControls[index];
    let token = sourceControl.id
      ? `${panelId}:id:${sourceControl.id}`
      : `${panelId}:control:${index}`;
    let suffix = 2;
    while (usedTokens.has(token)) {
      token = `${token}:${suffix}`;
      suffix += 1;
    }
    usedTokens.add(token);
    cloneControl.dataset.popoutControl = token;
    synchronizeMirroredControlState(sourceControl, cloneControl);
    controlMap.set(token, sourceControl);
  }
  panelPopoutControlMaps.set(panelId, controlMap);

  return {
    mode: 'mirror',
    panelId,
    label: definition.label,
    accessibleLabel: definition.accessibleLabel,
    subtitle: definition.subtitle,
    revision: panelPopoutRevision,
    html: clone.outerHTML,
    theme: { ...state.terminalTheme },
    ui: panelPopoutUiSnapshot(),
    screenReaderMode: state.accessibility.screenReaderMode,
    monitorActive: Boolean(longSessionMonitor?.active)
  };
}

function panelPopoutSnapshot(panelId) {
  return panelId === 'communications'
    ? communicationPopoutSnapshot()
    : genericPanelPopoutSnapshot(panelId);
}

function publishPanelPopoutState(panelId) {
  if (!isPanelPoppedOut(panelId)) return;
  const monitorStartedAt = longSessionMonitor?.active ? performance.now() : 0;
  const snapshot = panelPopoutSnapshot(panelId);
  if (monitorStartedAt) {
    const approximateBytes = typeof snapshot?.html === 'string'
      ? snapshot.html.length
      : (Array.isArray(snapshot?.messages) ? snapshot.messages.length * 160 : 0);
    longSessionMonitor.notePopoutPublish(panelId, approximateBytes, performance.now() - monitorStartedAt);
  }
  void window.nukefire.publishPanelState?.(
    panelId,
    snapshot
  ).catch?.((error) => {
    const label = panelWindowDefinition(panelId).label;
    console.warn(`Unable to update ${label} window.`, error);
  });
}

function schedulePanelPopoutPublish(panelId) {
  if (!isPanelPoppedOut(panelId) || panelPopoutPublishFrames.has(panelId)) return;
  const frame = scheduleFrame(() => {
    panelPopoutPublishFrames.delete(panelId);
    publishPanelPopoutState(panelId);
  });
  panelPopoutPublishFrames.set(panelId, frame);
}

function publishAllPanelPopoutStates() {
  for (const panelId of POPOUT_PANEL_IDS) schedulePanelPopoutPublish(panelId);
}

// Communications traffic must not reclone and republish unrelated open panes.
function publishCommunicationsPopoutState() {
  schedulePanelPopoutPublish('communications');
}

function syncPanelPopoutObservers() {
  for (const [panelId, entry] of panelPopoutObservers) {
    const shouldObserve = isPanelPoppedOut(panelId);
    if (entry.active === shouldObserve) continue;
    entry.observer.disconnect();
    if (entry.timer !== null) clearTimeout(entry.timer);
    entry.timer = null;
    entry.active = shouldObserve;
    if (shouldObserve) {
      entry.observer.observe(entry.section, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true
      });
    }
  }
}

function initializePanelPopoutMirrors() {
  if (typeof MutationObserver !== 'function') return;
  for (const panel of SIDEBAR_PANELS) {
    const section = $(panel.selector);
    if (!section) continue;
    const entry = { observer: null, section, active: false, timer: null };
    const observer = new MutationObserver(() => {
      if (panel.id !== 'protocol') {
        schedulePanelPopoutPublish(panel.id);
        return;
      }
      if (entry.timer !== null) return;
      entry.timer = setTimeout(() => {
        entry.timer = null;
        schedulePanelPopoutPublish(panel.id);
      }, 250);
    });
    entry.observer = observer;
    panelPopoutObservers.set(panel.id, entry);
  }
  syncPanelPopoutObservers();
}

async function openPanelPopout(panelId, options = {}) {
  if (!POPOUT_PANEL_IDS.includes(panelId) || typeof window.nukefire.openPanelWindow !== 'function') return;
  const definition = panelWindowDefinition(panelId);
  const next = normalizePanelPopouts(state.workspace.activePopouts, state.workspace.defaultPopouts);
  next[panelId].open = true;
  state.workspace.activePopouts = next;
  persistPanelPopouts();
  renderPanelGroups();
  updateDockVisibility();
  try {
    const result = await window.nukefire.openPanelWindow({
      panelId,
      bounds: next[panelId].bounds,
      focus: options.focus !== false
    });
    if (result?.bounds) {
      state.workspace.activePopouts[panelId].bounds = normalizePanelPopouts({
        [panelId]: { open: true, bounds: result.bounds }
      }, state.workspace.activePopouts)[panelId].bounds;
      persistPanelPopouts();
    }
    publishPanelPopoutState(panelId);
    if (options.announceChange !== false) {
      announce(`${definition.label} opened in a separate window.`, { force: true });
    }
  } catch (error) {
    state.workspace.activePopouts[panelId].open = false;
    persistPanelPopouts();
    renderPanelGroups();
    updateDockVisibility();
    appendSystemMessage(`Unable to open ${definition.label} window: ${error.message || error}`, 'error');
  }
}

function dockPanelPopout(panelId, options = {}) {
  if (!POPOUT_PANEL_IDS.includes(panelId)) return;
  const definition = panelWindowDefinition(panelId);
  const next = normalizePanelPopouts(state.workspace.activePopouts, state.workspace.defaultPopouts);
  next[panelId].open = false;
  state.workspace.activePopouts = next;
  persistPanelPopouts();
  renderPanelGroups();
  updateDockVisibility();
  panelPopoutControlMaps.delete(panelId);
  const frame = panelPopoutPublishFrames.get(panelId);
  if (frame !== undefined) cancelFrame(frame);
  panelPopoutPublishFrames.delete(panelId);
  if (options.closeWindow !== false) void window.nukefire.closePanelWindow?.(panelId);
  if (options.announceChange !== false) {
    announce(`${definition.label} docked in the main window.`, { force: true });
  }
}

function handlePanelBoundsChanged(payload = {}) {
  const panelId = String(payload.panelId || '');
  if (!POPOUT_PANEL_IDS.includes(panelId) || !payload.bounds) return;
  const normalized = normalizePanelPopouts({
    [panelId]: { open: true, bounds: payload.bounds }
  }, state.workspace.activePopouts);
  state.workspace.activePopouts[panelId].bounds = normalized[panelId].bounds;
  persistPanelPopouts();
}

function handlePanelClosed(payload = {}) {
  const panelId = String(payload.panelId || '');
  if (!POPOUT_PANEL_IDS.includes(panelId)) return;
  if (payload.bounds) handlePanelBoundsChanged(payload);
  if (state.accessibility.readerWorkspaceEnabled
      && state.accessibility.readerWorkspaceSuppressedPopouts?.has(panelId)) {
    return;
  }
  dockPanelPopout(panelId, { closeWindow: false, announceChange: false });
}

function applyMirroredPanelControl(panelId, request = {}) {
  const controlMap = panelPopoutControlMaps.get(panelId);
  const element = controlMap?.get(String(request.token || ''));
  if (!element || !element.isConnected) {
    schedulePanelPopoutPublish(panelId);
    return false;
  }

  const kind = String(request.kind || '');
  if (kind === 'input' || kind === 'change') {
    if ('value' in element) element.value = String(request.value ?? '');
    if (element.matches?.('input[type="checkbox"], input[type="radio"]')) {
      element.checked = request.checked === true;
    }
    element.dispatchEvent(new Event(kind, { bubbles: true }));
  } else if (kind === 'click') {
    element.click?.();
  } else if (kind === 'keydown') {
    element.dispatchEvent(new KeyboardEvent('keydown', {
      key: String(request.key || ''),
      shiftKey: request.shiftKey === true,
      altKey: request.altKey === true,
      ctrlKey: request.ctrlKey === true,
      metaKey: request.metaKey === true,
      bubbles: true,
      cancelable: true
    }));
  } else if (kind === 'wheel') {
    element.dispatchEvent(new WheelEvent('wheel', {
      deltaX: Number(request.deltaX) || 0,
      deltaY: Number(request.deltaY) || 0,
      shiftKey: request.shiftKey === true,
      altKey: request.altKey === true,
      ctrlKey: request.ctrlKey === true,
      metaKey: request.metaKey === true,
      bubbles: true,
      cancelable: true
    }));
  } else {
    return false;
  }

  schedulePanelPopoutPublish(panelId);
  return true;
}

function handlePanelAction(payload = {}) {
  const panelId = String(payload.panelId || '');
  if (!POPOUT_PANEL_IDS.includes(panelId)) return;
  if (payload.action === 'dock') {
    dockPanelPopout(panelId, { closeWindow: false });
  } else if (payload.action === 'control') {
    applyMirroredPanelControl(panelId, payload.control || {});
  } else if (payload.action === 'performance') {
    longSessionMonitor?.notePopoutRender?.(panelId, payload.renderMs);
  } else if (panelId === 'communications' && payload.action === 'set-channel') {
    setCommunicationChannel(payload.channel, { persist: true });
  } else if (panelId === 'communications' && payload.action === 'set-order') {
    setCommunicationMessageOrder(payload.messageOrder, { persist: true });
  } else if (panelId === 'communications' && payload.action === 'clear') {
    clearCommunicationMessages({ focus: false });
  }
}

function syncPanelPopoutWindows(options = {}) {
  for (const panelId of POPOUT_PANEL_IDS) {
    if (isPanelPoppedOut(panelId)) {
      void openPanelPopout(panelId, {
        focus: options.focus === true,
        announceChange: false
      });
    } else {
      void window.nukefire.closePanelWindow?.(panelId);
    }
  }
}

function captureActiveWorkspaceAsSharedDefaults() {
  state.workspace.defaultPanels = { ...state.workspace.activePanels };
  state.workspace.defaultLayout = structuredCloneSafe(state.workspace.activeLayout);
  state.workspace.defaultDockSizes = { ...state.workspace.activeDockSizes };
  state.workspace.defaultPanelHeights = activePanelHeights();
  state.workspace.defaultTabGroups = { ...state.workspace.activeTabGroups };
  state.workspace.defaultActiveTabs = { ...state.workspace.activeTabs };
  state.workspace.defaultCommunications = { ...state.workspace.activeCommunications };
  state.workspace.defaultPopouts = structuredCloneSafe(
    normalizePanelPopouts(state.workspace.activePopouts, state.workspace.defaultPopouts)
  );
}

function schedulePanelHeightRestore() {
  // Workspace application is synchronous now. Apply saved heights immediately;
  // dock regrouping is covered by the resize controller's MutationObservers.
  window.NukeFirePanelHeightController?.refresh?.();
}

function applyWorkspaceForCurrentScope() {
  clearLayoutGalleryTrial({ render: false });
  const layout = activePanelLayout();
  state.workspace.activeTabGroups = activePanelTabGroups(layout);
  state.workspace.activeTabs = activePanelTabs(state.workspace.activeTabGroups, layout);
  state.workspace.activeCommunications = activeCommunicationPreferences();
  state.workspace.activePopouts = activePanelPopouts();
  applyPanelLayout(layout, { persist: false });
  applyPanelVisibility(activePanelVisibility(), { persist: false });
  applyDockSizes(activeDockSizes(), { persist: false });
  renderCommunicationTabs();
  renderCommunicationOrderControl();
  renderCommunicationMessages({ snapToLive: true });
  syncPanelPopoutWindows({ focus: false });
  if (state.accessibility.readerWorkspaceEnabled) suppressReaderWorkspacePopouts();
  renderReaderWorkspaceStatus();
  migrateLegacyPanelHeightsForCurrentScope();
  schedulePanelHeightRestore();
  renderLayoutGallery();
}

function setSharedCrewWorkspace(enabled, options = {}) {
  const next = Boolean(enabled);
  if (next === state.workspace.sharedCrewWorkspace) {
    updatePanelScopeStatus();
    return;
  }

  if (next) captureActiveWorkspaceAsSharedDefaults();
  state.workspace.sharedCrewWorkspace = next;
  if (!next) applyWorkspaceForCurrentScope();
  else {
    updatePanelScopeStatus();
    publishAllPanelPopoutStates();
  }

  schedulePersistentSettingsSave();
  if (options.announceChange !== false) {
    announce(next
      ? 'Shared crew workspace enabled. Every session now uses this panel layout and these panel windows.'
      : 'Shared crew workspace disabled. Character-specific panel layouts are active again.',
    { force: true });
  }
}

function setWorkspaceCharacter(name) {
  const displayName = String(name || '').normalize('NFKC').trim().slice(0, 80);
  const key = characterWorkspaceKey(displayName);
  if (!key) return;

  const sameCharacter = key === state.workspace.currentCharacterKey;
  const unchangedIdentity = sameCharacter
    && key === state.workspace.lastCharacterKey
    && displayName === state.workspace.currentCharacterName
    && displayName === state.workspace.lastCharacterName;
  if (unchangedIdentity) return;

  state.workspace.currentCharacterKey = key;
  state.workspace.currentCharacterName = displayName;
  state.workspace.lastCharacterKey = key;
  state.workspace.lastCharacterName = displayName;
  flushWorkspaceGeometrySaveNow();

  if (state.workspace.sharedCrewWorkspace) {
    updatePanelScopeStatus();
    publishAllPanelPopoutStates();
    schedulePanelHeightRestore();
    return;
  }

  if (sameCharacter) {
    schedulePanelHeightRestore();
    return;
  }
  applyWorkspaceForCurrentScope();
}

function resetSidebarPanels() {
  applyPanelVisibility(DEFAULT_PANEL_VISIBILITY, {
    persist: true,
    announceChange: true
  });
}

function resetPanelLayout() {
  resetWorkspacePanelHeights();
  window.NukeFirePanelHeightController?.refresh?.();
  state.workspace.activePopouts = structuredCloneSafe(DEFAULT_POPOUTS);
  persistPanelPopouts();
  for (const panelId of POPOUT_PANEL_IDS) {
    void window.nukefire.closePanelWindow?.(panelId);
    panelPopoutControlMaps.delete(panelId);
  }
  state.workspace.activeTabGroups = { ...DEFAULT_TAB_GROUPS };
  state.workspace.activeTabs = { ...DEFAULT_ACTIVE_TABS };
  applyPanelLayout(DEFAULT_PANEL_LAYOUT, {
    persist: true,
    announceChange: false
  });
  applyDockSizes(DEFAULT_DOCK_SIZES, {
    persist: true,
    announceChange: true,
    announcement: 'Panel layout, tabs, dock sizes, and separate windows restored.'
  });
}


function rewriteTinTinSnapshotPrefix(snapshotValue, previous, next) {
  const snapshot = normalizeSessionTinTinState(snapshotValue);
  snapshot.aliases = snapshot.aliases.map((record) => ({
    ...record,
    body: rewriteCommandListPrefix(record.body, previous, next)
  }));
  snapshot.actions = {
    ...snapshot.actions,
    definitions: (snapshot.actions?.definitions || []).map((record) => ({
      ...record,
      command: rewriteCommandListPrefix(record.command, previous, next)
    }))
  };
  snapshot.classes = {
    ...snapshot.classes,
    definitions: (snapshot.classes?.definitions || []).map((record) => ({
      ...record,
      saved: {
        ...(record.saved || {}),
        aliases: (record.saved?.aliases || []).map((alias) => ({
          ...alias,
          body: rewriteCommandListPrefix(alias.body, previous, next)
        })),
        actions: (record.saved?.actions || []).map((action) => ({
          ...action,
          command: rewriteCommandListPrefix(action.command, previous, next)
        })),
        macros: (record.saved?.macros || []).map((macro) => ({
          ...macro,
          command: rewriteCommandListPrefix(macro.command, previous, next),
          commands: (macro.commands || []).map((command) => rewriteCommandListPrefix(command, previous, next))
        }))
      }
    }))
  };
  snapshot.macros = {
    ...snapshot.macros,
    definitions: (snapshot.macros?.definitions || []).map((record) => ({
      ...record,
      command: rewriteCommandListPrefix(record.command, previous, next),
      commands: (record.commands || []).map((command) => rewriteCommandListPrefix(command, previous, next))
    }))
  };
  return snapshot;
}

function setClientCommandPrefix(value, options = {}) {
  const previous = normalizeClientCommandPrefix(state.sessions.commandPrefix);
  const next = normalizeClientCommandPrefix(value);
  const changed = next !== previous;
  if (changed && options.migrateDefinitions !== false) {
    captureActiveSessionState();
    for (const record of Object.values(state.sessions.records)) {
      applyTinTinStateToRecord(record, rewriteTinTinSnapshotPrefix(record.tintin, previous, next));
    }
    applyActiveTinTinState(activeSessionRecord());
    state.quickKeys = state.quickKeys.map((record) => ({
      ...record,
      command: rewriteCommandListPrefix(record.command, previous, next)
    }));
    state.keybindings = normalizeKeybindingState({
      enabled: state.keybindings.enabled,
      bindings: state.keybindings.bindings.map((record) => ({
        ...record,
        command: rewriteCommandListPrefix(record.command, previous, next)
      }))
    });
    renderQuickCommands();
    renderKeybindings();
  }
  state.sessions.commandPrefix = next;
  const control = $('#client-command-prefix');
  if (control) control.value = next;
  const aliasExample = $('#client-command-prefix-alias-example');
  const allExample = $('#client-command-prefix-all-example');
  if (aliasExample) aliasExample.textContent = `${next}alias`;
  if (allExample) allExample.textContent = `${next}all`;

  if (options.persist !== false) {
    localStorage.setItem('nukefire.commandPrefix', next);
    schedulePersistentSettingsSave();
  }
  if (options.sync !== false && typeof window.nukefire.restoreSessions === 'function') {
    void restorePersistentSessions(
      persistentSessionsSnapshot(),
      state.sessions.aliases,
      state.sessions.variables,
      state.sessions.functions,
      state.sessions.actions,
      state.sessions.gags,
      state.sessions.highlights,
      state.sessions.substitutes,
      state.sessions.macros,
      state.sessions.classes,
      state.sessions.speedwalk,
      next
    );
  }
  if (changed && options.announceChange !== false) {
    announce(`Client command prefix changed to ${next}. Double it to send one literal ${next} to NukeFire.`, { force: true });
  }
  return next;
}

function normalizeTinTinStartupSettings(input = {}) {
  if (typeof tintinStartupApi.normalizeTinTinStartupSettings === 'function') {
    return tintinStartupApi.normalizeTinTinStartupSettings(input);
  }
  const source = input && typeof input === 'object' ? input : {};
  const raw = String(source.filename || 'main.tin').normalize('NFKC').trim();
  const filename = /\.(?:tin|txt)$/iu.test(raw) ? raw : `${raw || 'main'}.tin`;
  return { enabled: source.enabled === true, filename };
}

function startupTemplateDefinitions(input = {}) {
  if (typeof tintinStartupApi.startupTemplateDefinitions === 'function') {
    return tintinStartupApi.startupTemplateDefinitions(input);
  }
  const snapshot = structuredCloneSafe(input && typeof input === 'object' ? input : {});
  delete snapshot.profile;
  return snapshot;
}

function startupBaseTinTinState() {
  if (!state.tintinStartup.loaded || !state.tintinStartup.definitions) return emptySessionTinTinState();
  const snapshot = normalizeSessionTinTinState(startupTemplateDefinitions(state.tintinStartup.definitions));
  snapshot.profile = { requested: '', filename: '', loaded: false };
  return snapshot;
}

function renderTinTinStartupControls() {
  const enabled = $('#tintin-startup-enabled');
  const filename = $('#tintin-startup-file');
  const status = $('#tintin-startup-status');
  if (enabled) enabled.checked = state.tintinStartup.enabled === true;
  if (filename && document.activeElement !== filename) filename.value = state.tintinStartup.filename || 'main.tin';
  if (!status) return;
  if (!state.tintinStartup.enabled) {
    status.textContent = 'Startup inheritance is off.';
  } else if (state.tintinStartup.loaded) {
    status.textContent = `Loaded ${state.tintinStartup.loadedFilename || state.tintinStartup.filename}: ${state.tintinStartup.totalLoaded} supported definitions; ${state.tintinStartup.unsupported} unsupported command${state.tintinStartup.unsupported === 1 ? '' : 's'} skipped. New sessions inherit private copies.`;
  } else {
    status.textContent = `Startup inheritance is on; ${state.tintinStartup.filename || 'main.tin'} has not loaded yet.`;
  }
  renderTinTinImportDestinationControls();
}

function currentTinTinStartupFilename() {
  const normalized = normalizeTinTinStartupSettings({
    enabled: state.tintinStartup.enabled,
    filename: $('#tintin-startup-file')?.value || state.tintinStartup.filename
  });
  state.tintinStartup.filename = normalized.filename;
  const filename = $('#tintin-startup-file');
  if (filename && document.activeElement !== filename) filename.value = normalized.filename;
  return normalized.filename;
}

const TINTIN_IMPORT_CHOOSE_DESTINATION = '__choose__';
const TINTIN_IMPORT_NEW_DESTINATION = '__new__';

function normalizeTinTinImportFilename(value) {
  const source = String(value || '').normalize('NFKC').trim();
  if (!source || source.length > 120 || source.includes('/') || source.includes('\\') || source.includes('..')) return '';
  if (/\.[^./\\]+$/u.test(source) && !/\.(?:tin|txt)$/iu.test(source)) return '';
  const withExtension = /\.(?:tin|txt)$/iu.test(source) ? source : `${source}.tin`;
  return /^[\p{L}\p{N} _().@+-]+\.(?:tin|txt)$/iu.test(withExtension) ? withExtension.slice(0, 124) : '';
}

function currentTinTinImportDestination() {
  const select = $('#tintin-import-destination-file');
  const selected = String(select?.value || TINTIN_IMPORT_CHOOSE_DESTINATION);
  const files = Array.isArray(state.tintinImport.scriptFiles) ? state.tintinImport.scriptFiles : [];
  if (selected === TINTIN_IMPORT_CHOOSE_DESTINATION) {
    return { filename: '', exists: false, isNewChoice: false, unselected: true };
  }
  if (selected !== TINTIN_IMPORT_NEW_DESTINATION) {
    const actual = files.find((name) => String(name).toLocaleLowerCase() === selected.toLocaleLowerCase()) || selected;
    const filename = normalizeTinTinImportFilename(actual);
    return { filename, exists: Boolean(filename), isNewChoice: false };
  }
  const filename = normalizeTinTinImportFilename($('#tintin-import-new-file')?.value || '');
  const collision = filename && files.some((name) => String(name).toLocaleLowerCase() === filename.toLocaleLowerCase());
  return { filename, exists: collision, isNewChoice: true, collision };
}

function renderTinTinImportDestinationControls() {
  const select = $('#tintin-import-destination-file');
  if (!select) return;
  const destination = currentTinTinImportDestination();
  const newLabel = $('#tintin-import-new-file-label');
  if (newLabel) newLabel.hidden = select.value !== TINTIN_IMPORT_NEW_DESTINATION;
  const mode = $('#tintin-import-write-mode')?.value === 'replace' ? 'replace' : 'merge';
  const duplicate = $('#tintin-import-duplicates');
  if (duplicate) duplicate.disabled = mode === 'replace';
  const modeHelp = $('#tintin-import-write-mode-help');
  if (modeHelp) {
    modeHelp.textContent = mode === 'replace'
      ? 'Replace removes the current destination contents and writes only the selected safe import. Choose this deliberately for a clean replacement file.'
      : 'Add / merge preserves the current file text exactly and appends only accepted safe import entries. Existing comments, #READ lines, and unrecognized commands are not rewritten.';
  }
  const status = $('#tintin-import-destination-status');
  if (status) {
    const directory = state.tintinImport.scriptsDirectory || 'the protected NukeFire Scripts folder';
    if (mode === 'merge' && state.tintinImport.destinationAnalysisError) {
      status.textContent = state.tintinImport.destinationAnalysisError;
    } else if (destination.unselected) {
      status.textContent = `Choose an existing script in ${directory}, or choose New script… to create one.`;
    } else if (!destination.filename) {
      status.textContent = `Enter a safe .tin or .txt filename inside ${directory}.`;
    } else if (destination.isNewChoice && destination.collision) {
      status.textContent = `${destination.filename} already exists. Choose it from the list or refresh the file list before writing.`;
    } else if (destination.exists) {
      status.textContent = mode === 'replace'
        ? `${destination.filename} exists and will be replaced completely.`
        : `${destination.filename} exists; the accepted import will be added without rewriting its current text.`;
    } else {
      status.textContent = `${destination.filename} will be created inside ${directory}.`;
    }
  }
  const startup = $('#tintin-import-make-startup');
  if (startup && startup.dataset.userChoice !== 'true') {
    startup.checked = state.tintinStartup.enabled === true
      && Boolean(destination.filename)
      && destination.filename.toLocaleLowerCase() === String(state.tintinStartup.filename || '').toLocaleLowerCase();
  }
  updateTinTinImportCommitAvailability();
}

async function refreshTinTinImportDestinations(options = {}) {
  const select = $('#tintin-import-destination-file');
  if (!select) return { ok: false };
  const previous = String(options.preferred || select.value || '');
  if (typeof window.nukefire.getTinTinScriptsInfo !== 'function') {
    state.tintinImport.destinationReady = false;
    state.tintinImport.scriptFiles = [];
    state.tintinImport.scriptsDirectory = '';
    select.replaceChildren(
      new Option('Choose destination…', TINTIN_IMPORT_CHOOSE_DESTINATION),
      new Option('New script…', TINTIN_IMPORT_NEW_DESTINATION)
    );
    select.value = TINTIN_IMPORT_CHOOSE_DESTINATION;
    renderTinTinImportDestinationControls();
    return { ok: false, error: 'TinTin script storage is unavailable in this build.' };
  }
  let response;
  try {
    response = await window.nukefire.getTinTinScriptsInfo();
  } catch (error) {
    response = { ok: false, error: error?.message || String(error) };
  }
  if (!response?.ok) {
    state.tintinImport.destinationReady = false;
    const status = $('#tintin-import-destination-status');
    if (status) status.textContent = response?.error || 'Unable to list the TinTin Scripts folder.';
    updateTinTinImportCommitAvailability();
    return response || { ok: false };
  }
  const files = (Array.isArray(response.files) ? response.files : [])
    .map((name) => normalizeTinTinImportFilename(name))
    .filter((name, index, values) => name && values.findIndex((entry) => entry.toLocaleLowerCase() === name.toLocaleLowerCase()) === index);
  state.tintinImport.scriptFiles = files;
  state.tintinImport.scriptsDirectory = String(response.info?.directory || 'Documents/NukeFire Client/Scripts');
  state.tintinImport.destinationReady = true;
  select.replaceChildren(new Option('Choose destination…', TINTIN_IMPORT_CHOOSE_DESTINATION));
  for (const filename of files) {
    const startup = state.tintinStartup.enabled === true
      && filename.toLocaleLowerCase() === String(state.tintinStartup.filename || '').toLocaleLowerCase();
    select.append(new Option(startup ? `${filename} — startup` : filename, filename));
  }
  select.append(new Option('New script…', TINTIN_IMPORT_NEW_DESTINATION));
  const matchingPrevious = files.find((name) => name.toLocaleLowerCase() === previous.toLocaleLowerCase());
  const preserveNewChoice = previous === TINTIN_IMPORT_NEW_DESTINATION;
  select.value = matchingPrevious || (preserveNewChoice ? TINTIN_IMPORT_NEW_DESTINATION : TINTIN_IMPORT_CHOOSE_DESTINATION);
  if (select.value !== previous) $('#tintin-import-make-startup')?.removeAttribute('data-user-choice');
  renderTinTinImportDestinationControls();
  await inspectTinTinImportDestination();
  return response;
}

async function inspectTinTinImportDestination() {
  const destination = currentTinTinImportDestination();
  state.tintinImport.destinationDefinitions = emptySessionTinTinState();
  state.tintinImport.destinationIncludes = [];
  state.tintinImport.destinationFileContent = '';
  state.tintinImport.destinationAnalysisError = '';
  if (!destination.filename || !destination.exists || destination.isNewChoice) {
    renderTinTinImportDestinationControls();
    if (state.tintinImport.analysis) renderTinTinImportReview();
    return { ok: true, empty: true };
  }
  if (typeof window.nukefire.readTinTinScript !== 'function') {
    state.tintinImport.destinationAnalysisError = 'TinTin script reading is unavailable in this build.';
    renderTinTinImportDestinationControls();
    if (state.tintinImport.analysis) renderTinTinImportReview();
    return { ok: false, error: state.tintinImport.destinationAnalysisError };
  }
  let response;
  try {
    response = await window.nukefire.readTinTinScript(destination.filename);
  } catch (error) {
    response = { ok: false, error: error?.message || String(error) };
  }
  if (!response?.ok || response.mode === 'info') {
    state.tintinImport.destinationAnalysisError = response?.error || `Unable to inspect ${destination.filename}.`;
    renderTinTinImportDestinationControls();
    if (state.tintinImport.analysis) renderTinTinImportReview();
    return { ok: false, error: state.tintinImport.destinationAnalysisError };
  }
  state.tintinImport.destinationFileContent = String(response.content || '');
  if (!state.tintinImport.destinationFileContent.trim()) {
    renderTinTinImportDestinationControls();
    if (state.tintinImport.analysis) renderTinTinImportReview();
    return { ok: true, empty: true, response };
  }
  const prepared = prepareTinTinRootScript(response, emptySessionTinTinState(), { filename: response.filename });
  if (!prepared?.ok) {
    state.tintinImport.destinationAnalysisError = `${response.filename || destination.filename} cannot be merged safely because its own contents do not parse: ${tinTinLoadErrorSummary(prepared)} Choose Replace entire file to intentionally overwrite it.`;
  } else {
    state.tintinImport.destinationDefinitions = prepared.definitions;
    state.tintinImport.destinationIncludes = (Array.isArray(prepared.scriptIncludes) ? prepared.scriptIncludes : [])
      .map((entry) => String(entry?.requested || '').normalize('NFKC').trim())
      .filter(Boolean);
  }
  renderTinTinImportDestinationControls();
  if (state.tintinImport.analysis) renderTinTinImportReview();
  return prepared?.ok ? { ok: true, response, prepared } : { ok: false, error: state.tintinImport.destinationAnalysisError };
}

async function saveTinTinDefinitionsToStartupFile(definitionsValue, options = {}) {
  const filename = currentTinTinStartupFilename();
  if (typeof window.nukefire.writeTinTinScript !== 'function') {
    throw new Error('TinTin script storage is unavailable in this build.');
  }
  if (typeof tintinScriptWriterApi.prepareTinTinWrite !== 'function') {
    throw new Error('TinTin script writer is unavailable in this build.');
  }

  const prepared = tintinScriptWriterApi.prepareTinTinWrite(
    normalizeSessionTinTinState(definitionsValue || emptySessionTinTinState()),
    { commandPrefix: state.sessions.commandPrefix }
  );
  if (!prepared?.ok) {
    throw new Error((prepared?.errors || ['TinTin script could not be prepared.']).join(' '));
  }

  const response = await window.nukefire.writeTinTinScript(filename, prepared.content);
  if (!response?.ok) {
    throw new Error(response?.error || `Unable to write ${filename}.`);
  }
  state.tintinStartup.filename = String(response.filename || filename);
  const filenameInput = $('#tintin-startup-file');
  if (filenameInput) filenameInput.value = state.tintinStartup.filename;

  let startupReloaded = false;
  if (state.tintinStartup.enabled) {
    const loaded = await loadTinTinStartupProfile({
      applyToMain: false,
      persist: false,
      report: false
    });
    if (!loaded?.ok) {
      throw new Error(loaded?.error || `${state.tintinStartup.filename} was written but could not be reloaded as the startup profile.`);
    }
    startupReloaded = true;
  } else {
    renderTinTinStartupControls();
  }

  if (options.persist !== false) schedulePersistentSettingsSave();

  if (options.report !== false) {
    const status = $('#tintin-startup-status');
    const detail = `${prepared.totalWritten || 0} definition${prepared.totalWritten === 1 ? '' : 's'}`;
    const message = startupReloaded
      ? `Saved ${state.tintinStartup.filename} with ${detail}; startup template reloaded and verified.`
      : `Saved ${state.tintinStartup.filename} with ${detail}. Startup inheritance remains off.`;
    if (status) status.textContent = message;
    appendTinTinReadLines(state.sessions.activeId, [`#OK: ${message.toUpperCase()}`]);
  }

  return {
    ok: true,
    filename: state.tintinStartup.filename,
    prepared,
    startupReloaded,
    replaced: response.replaced === true
  };
}

async function saveCurrentTinTinStateToStartupFile() {
  const button = $('#tintin-startup-save-current');
  if (button) {
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Saving Startup File…';
  }
  try {
    const definitions = currentDefinitionSnapshot(state.sessions.activeId);
    const result = await saveTinTinDefinitionsToStartupFile(definitions, { report: true });
    announce(
      result.startupReloaded
        ? `Saved and reloaded TinTin startup profile ${result.filename}.`
        : `Saved TinTin startup file ${result.filename}.`,
      { force: true }
    );
  } catch (error) {
    const message = `Startup file was not saved: ${error?.message || error}`;
    const status = $('#tintin-startup-status');
    if (status) status.textContent = message;
    appendSystemMessage(message, 'error');
    announce(message, { force: true });
  } finally {
    if (button) {
      button.disabled = false;
      button.setAttribute('aria-busy', 'false');
      button.textContent = 'Save Current TinTin State to Startup File';
    }
  }
}

async function clearTinTinStartupTemplate(options = {}) {
  state.tintinStartup.loaded = false;
  state.tintinStartup.loadedFilename = '';
  state.tintinStartup.totalLoaded = 0;
  state.tintinStartup.unsupported = 0;
  state.tintinStartup.definitions = null;
  try {
    await window.nukefire.setTinTinStartupTemplate?.(null);
  } catch (error) {
    if (options.report !== false) appendSystemMessage(`Unable to clear TinTin startup inheritance: ${error?.message || error}`, 'error');
  }
  renderTinTinStartupControls();
}

function prepareTinTinRootScript(response, existingDefinitions, options = {}) {
  const filename = String(response?.filename || options.filename || 'script').trim() || 'script';
  return tintinScriptLoaderApi.prepareTinTinRead(response?.content || '', existingDefinitions, {
    filename,
    commandPrefix: state.sessions.commandPrefix
  });
}

function tinTinLoadErrorSummary(result, fallback = 'TinTin script validation failed.') {
  const errors = Array.isArray(result?.errors)
    ? result.errors.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  if (!errors.length) return fallback;
  const shown = errors.slice(0, 4);
  return `${shown.join(' ')}${errors.length > shown.length ? ` (+${errors.length - shown.length} more)` : ''}`;
}

async function prepareTinTinScriptLoad(response, existingDefinitions, options = {}) {
  const filename = String(response?.filename || options.filename || 'script').trim() || 'script';
  if (typeof tintinScriptLoaderApi.prepareTinTinReadTree === 'function') {
    return tintinScriptLoaderApi.prepareTinTinReadTree(response?.content || '', existingDefinitions, {
      filename,
      commandPrefix: state.sessions.commandPrefix,
      activeClass: String(options.activeClass || ''),
      maxDepth: 8,
      maxFiles: 32,
      readFile: async (requested) => window.nukefire.readTinTinScript(requested)
    });
  }
  return tintinScriptLoaderApi.prepareTinTinRead(response?.content || '', existingDefinitions, {
    filename,
    commandPrefix: state.sessions.commandPrefix,
    activeClass: String(options.activeClass || '')
  });
}

async function loadTinTinStartupProfile(options = {}) {
  const normalized = normalizeTinTinStartupSettings({
    enabled: state.tintinStartup.enabled,
    filename: state.tintinStartup.filename
  });
  state.tintinStartup.enabled = normalized.enabled;
  state.tintinStartup.filename = normalized.filename;
  renderTinTinStartupControls();

  if (!normalized.enabled) {
    await clearTinTinStartupTemplate({ report: options.report });
    return { ok: true, disabled: true };
  }

  if (typeof window.nukefire.readTinTinScript !== 'function'
      || typeof tintinScriptLoaderApi.prepareTinTinRead !== 'function'
      || typeof window.nukefire.setTinTinStartupTemplate !== 'function') {
    await clearTinTinStartupTemplate({ report: false });
    const message = 'TinTin startup inheritance is unavailable in this build.';
    if (options.report !== false) appendSystemMessage(message, 'error');
    const status = $('#tintin-startup-status');
    if (status) status.textContent = message;
    return { ok: false, error: message };
  }

  let response;
  try {
    response = await window.nukefire.readTinTinScript(normalized.filename);
  } catch (error) {
    response = { ok: false, error: error?.message || String(error) };
  }
  if (!response?.ok || response.mode === 'info') {
    await clearTinTinStartupTemplate({ report: false });
    const message = `Startup profile ${normalized.filename} was not loaded: ${response?.error || 'script was not found'}.`;
    const status = $('#tintin-startup-status');
    if (status) status.textContent = message;
    if (options.report !== false) appendSystemMessage(message, 'error');
    return { ok: false, error: message };
  }

  const prepared = await prepareTinTinScriptLoad(response, emptySessionTinTinState(), {
    filename: response.filename
  });
  if (!prepared?.ok) {
    await clearTinTinStartupTemplate({ report: false });
    const detail = (prepared?.errors || ['TinTin script could not be parsed.']).join(' ');
    if (/TinTin script is empty\.?/iu.test(detail)) {
      const message = `Startup profile ${response.filename || normalized.filename} is empty. Import definitions and choose “Also save … to startup file,” or use “Save Current TinTin State to Startup File.”`;
      const status = $('#tintin-startup-status');
      if (status) status.textContent = message;
      if (options.report !== false) appendSystemMessage(message, 'info');
      return { ok: false, empty: true, error: message };
    }
    const message = `Startup profile ${response.filename || normalized.filename} was rejected atomically: ${detail}`;
    const status = $('#tintin-startup-status');
    if (status) status.textContent = message;
    if (options.report !== false) appendSystemMessage(message, 'error');
    return { ok: false, error: message };
  }

  const definitions = startupTemplateDefinitions(prepared.definitions);
  try {
    await window.nukefire.setTinTinStartupTemplate(definitions);
  } catch (error) {
    await clearTinTinStartupTemplate({ report: false });
    const message = `Startup template could not be installed: ${error?.message || error}`;
    const status = $('#tintin-startup-status');
    if (status) status.textContent = message;
    if (options.report !== false) appendSystemMessage(message, 'error');
    return { ok: false, error: message };
  }

  state.tintinStartup.loaded = true;
  state.tintinStartup.loadedFilename = String(response.filename || normalized.filename);
  state.tintinStartup.totalLoaded = Number(prepared.totalLoaded || 0);
  state.tintinStartup.unsupported = Array.isArray(prepared.unsupported) ? prepared.unsupported.length : 0;
  state.tintinStartup.definitions = structuredCloneSafe(definitions);

  if (options.applyToMain !== false && typeof window.nukefire.replaceSessionDefinitions === 'function') {
    const mainRecord = state.sessions.records.main;
    const canUseMainAsStartup = mainRecord
      && String(mainRecord.name || '').trim().toLowerCase() === 'main'
      && !String(mainRecord.characterName || '').trim()
      && mainRecord.status?.state !== 'connected';
    if (canUseMainAsStartup) {
      const startupState = normalizeSessionTinTinState(definitions);
      startupState.profile = typeof tintinStartupApi.startupProfileIdentity === 'function'
        ? tintinStartupApi.startupProfileIdentity(normalized, response.filename)
        : { requested: normalized.filename.replace(/\.(?:tin|txt)$/iu, ''), filename: String(response.filename || normalized.filename), loaded: true };
      try {
        const applied = await window.nukefire.replaceSessionDefinitions(mainRecord.id, startupState);
        if (applied?.snapshot) applySessionsSnapshot(applied.snapshot, { followActive: false });
      } catch (error) {
        if (options.report !== false) appendSystemMessage(`Startup profile loaded, but Main could not be refreshed: ${error?.message || error}`, 'error');
      }
    }
  }

  renderTinTinStartupControls();
  if (options.persist !== false) schedulePersistentSettingsSave();
  if (options.report !== false) {
    appendTinTinReadLines(state.sessions.activeId, [
      `#OK: GLOBAL STARTUP PROFILE ${state.tintinStartup.loadedFilename} LOADED.`,
      `#OK: ${state.tintinStartup.totalLoaded} SUPPORTED DEFINITIONS FORM THE NEW-SESSION TEMPLATE.`,
      `#OK: EACH NEW CHARACTER RECEIVES A PRIVATE COPY BEFORE ITS OWN PROFILE LOADS.`,
      ...(state.tintinStartup.unsupported > 0
        ? [`#WARN: ${state.tintinStartup.unsupported} UNSUPPORTED STARTUP COMMAND${state.tintinStartup.unsupported === 1 ? '' : 'S'} SKIPPED.`]
        : [])
    ]);
  }
  return { ok: true, prepared };
}

function collectPersistentSettings() {
  // Settings persistence does not need to force staged terminal output through
  // xterm. Session metadata/TinTin state are already authoritative in memory,
  // and terminal presentation is deliberately paced independently.
  const sessions = persistentSessionsSnapshot({ reuseTinTinSnapshots: true, flushOutput: false });
  const activeSessionTinTin = sessions.sessions.find((record) => record.id === sessions.activeSessionId)?.tintin
    || emptySessionTinTinState();
  return {
    connection: {
      host: hostInput.value.trim() || 'tdome.nukefire.org',
      port: Number(portInput.value) || 4000,
      compressionEnabled: state.transport.compressionEnabled !== false
    },
    input: {
      repeatLastCommandOnEnter: $('#repeat-last-command-on-enter').checked,
      showLastCommandInInput: $('#show-last-command-in-input').checked,
      brightCommandInputFocus: $('#bright-command-input-focus').checked,
      commandPrefix: normalizeClientCommandPrefix(state.sessions.commandPrefix)
    },
    display: {
      followOutput: $('#follow-output').checked,
      compactOutput: $('#compact-output').checked,
      fontSize: Number($('#font-size').value) || 16,
      uiFont: state.uiFont,
      terminalFont: state.terminalFont,
      interfaceBrightness: state.interfaceBrightness,
      affectsMode: state.affectsDisplayMode,
      text: { ...state.displayText },
      promptMode: state.promptDisplayMode,
      components: { ...state.displayComponents },
      vitals: { ...state.vitalDisplay },
      theme: {
        ...state.terminalTheme,
        version: TERMINAL_THEME_STORAGE_VERSION
      }
    },
    accessibility: {
      screenReaderMode: state.accessibility.screenReaderMode,
      readerWorkspaceEnabled: state.accessibility.readerWorkspaceEnabled,
      selfVoiceEnabled: state.accessibility.selfVoiceEnabled,
      selfVoiceMuted: state.accessibility.selfVoiceMuted,
      selfVoiceForegroundOnly: state.accessibility.selfVoiceForegroundOnly,
      selfVoiceFollowMode: state.accessibility.selfVoiceFollowMode,
      selfVoiceInterruptOnCommand: state.accessibility.selfVoiceInterruptOnCommand,
      selfVoiceGovernorEnabled: state.accessibility.selfVoiceGovernorEnabled,
      selfVoicePriorityAlertsEnabled: state.accessibility.selfVoicePriorityAlertsEnabled,
      readerSafetyAlertsEnabled: state.accessibility.readerSafetyAlertsEnabled,
      selfVoiceRate: state.accessibility.selfVoiceRate,
      selfVoicePitch: state.accessibility.selfVoicePitch,
      selfVoiceVolume: state.accessibility.selfVoiceVolume,
      selfVoiceVoiceId: state.accessibility.selfVoiceVoiceId,
      vitalSpeechMode: state.accessibility.vitalSpeechMode,
      audioCuesEnabled: state.accessibility.audioCuesEnabled,
      audioCuesMuted: state.accessibility.audioCuesMuted,
      audioCuesForegroundOnly: state.accessibility.audioCuesForegroundOnly,
      audioCuesVolume: state.accessibility.audioCuesVolume,
      soundpackDisabledEvents: [...state.accessibility.soundpackDisabledEvents],
      communicationCues: { ...state.accessibility.communicationCues },
      announceImportant: state.accessibility.announceImportant
    },
    tintinStartup: {
      enabled: state.tintinStartup.enabled === true,
      filename: normalizeTinTinStartupSettings(state.tintinStartup).filename
    },
    aliases: activeSessionTinTin.aliases,
    variables: activeSessionTinTin.variables,
    functions: activeSessionTinTin.functions,
    quickKeys: structuredCloneSafe(state.quickKeys),
    hiddenDefaultQuickCommands: [...state.hiddenDefaultQuickCommands],
    keybindings: structuredCloneSafe(state.keybindings),
    soundTriggers: structuredCloneSafe(soundTriggerSnapshot()),
    actions: activeSessionTinTin.actions,
    gags: activeSessionTinTin.gags,
    highlights: activeSessionTinTin.highlights,
    substitutes: activeSessionTinTin.substitutes,
    macros: activeSessionTinTin.macros,
    classes: activeSessionTinTin.classes,
    speedwalk: activeSessionTinTin.speedwalk,
    sessions,
    workspace: {
      sharedCrewWorkspace: state.workspace.sharedCrewWorkspace,
      defaultPanels: { ...state.workspace.defaultPanels },
      defaultLayout: structuredCloneSafe(state.workspace.defaultLayout),
      defaultDockSizes: { ...state.workspace.defaultDockSizes },
      defaultPanelHeights: { ...state.workspace.defaultPanelHeights },
      lastCharacterKey: state.workspace.lastCharacterKey,
      lastCharacterName: state.workspace.lastCharacterName,
      defaultTabGroups: { ...state.workspace.defaultTabGroups },
      defaultActiveTabs: { ...state.workspace.defaultActiveTabs },
      defaultCommunications: { ...state.workspace.defaultCommunications },
      defaultPopouts: structuredCloneSafe(state.workspace.defaultPopouts),
      characters: structuredCloneSafe(state.workspace.characters)
    }
  };
}

function mirrorPersistentSettings(settings) {
  const connection = settings?.connection || {};
  const display = settings?.display || {};
  const theme = display.theme || {};
  const input = settings?.input || {};
  const accessibility = settings?.accessibility || {};

  localStorage.setItem('nukefire.host', String(connection.host || 'tdome.nukefire.org'));
  localStorage.setItem('nukefire.port', String(connection.port || 4000));
  localStorage.setItem('nukefire.compressionEnabled', String(connection.compressionEnabled !== false));
  localStorage.setItem('nukefire.repeatLastCommandOnEnter', String(Boolean(input.repeatLastCommandOnEnter)));
  localStorage.setItem('nukefire.showLastCommandInInput', String(input.showLastCommandInInput !== false));
  localStorage.setItem('nukefire.brightCommandInputFocus', String(Boolean(input.brightCommandInputFocus)));
  localStorage.setItem('nukefire.commandPrefix', normalizeClientCommandPrefix(input.commandPrefix));
  localStorage.removeItem('nukefire.terminalEngine');
  localStorage.setItem('nukefire.followOutput', String(display.followOutput !== false));
  localStorage.setItem('nukefire.compactOutput', String(Boolean(display.compactOutput)));
  localStorage.setItem('nukefire.fontSize', String(display.fontSize || 16));
  localStorage.setItem('nukefire.uiFont', String(display.uiFont || 'system'));
  localStorage.setItem('nukefire.terminalFont', String(display.terminalFont || 'menlo'));
  localStorage.setItem('nukefire.interfaceBrightness', normalizeInterfaceBrightness(display.interfaceBrightness));
  localStorage.setItem('nukefire.affectsDisplayMode', normalizeAffectsDisplayMode(display.affectsMode));
  const displayText = normalizeDisplayTextPreferences(display.text || DEFAULT_DISPLAY_TEXT);
  localStorage.setItem('nukefire.panelLabelMode', displayText.panelLabels);
  localStorage.setItem('nukefire.mapperRoomLabelMode', displayText.mapperRoomLabels);
  localStorage.setItem('nukefire.promptDisplayMode', normalizePromptDisplayMode(display.promptMode));
  localStorage.setItem('nukefire.showGroupVitals', String(display.components?.groupVitals !== false));
  localStorage.setItem('nukefire.showMapperExits', String(display.components?.mapperExits !== false));
  localStorage.setItem('nukefire.showGpsNavigator', String(display.components?.gpsNavigator !== false));
  localStorage.setItem('nukefire.showMapperMap', String(display.components?.mapperMap !== false));
  localStorage.setItem('nukefire.showMapperRoomInfo', String(display.components?.mapperRoomInfo !== false));
  localStorage.setItem('nukefire.mainVitalsMode', String(display.vitals?.mainMode || DEFAULT_VITAL_DISPLAY.mainMode));
  localStorage.setItem('nukefire.groupVitalsMode', String(display.vitals?.groupMode || DEFAULT_VITAL_DISPLAY.groupMode));
  localStorage.setItem('nukefire.vitalsNumberSize', String(display.vitals?.numberSize || DEFAULT_VITAL_DISPLAY.numberSize));
  localStorage.setItem('nukefire.hideSelfInGroupVitals', String(display.vitals?.hideSelfInGroup !== false));
  localStorage.setItem('nukefire.terminalTheme', String(theme.preset || 'nukefire'));
  localStorage.setItem('nukefire.terminalForeground', String(theme.foreground || '#d3d7dc'));
  localStorage.setItem('nukefire.terminalBackground', String(theme.background || '#050607'));
  localStorage.setItem('nukefire.terminalMonochrome', String(Boolean(theme.monochrome)));
  localStorage.setItem('nukefire.terminalThemeVersion', String(theme.version || TERMINAL_THEME_STORAGE_VERSION));
  localStorage.setItem('nukefire.screenReaderMode', String(Boolean(accessibility.screenReaderMode)));
  localStorage.setItem('nukefire.readerWorkspaceEnabled', String(Boolean(accessibility.readerWorkspaceEnabled)));
  localStorage.setItem('nukefire.selfVoiceEnabled', String(Boolean(accessibility.selfVoiceEnabled)));
  localStorage.setItem('nukefire.selfVoiceMuted', String(Boolean(accessibility.selfVoiceMuted)));
  localStorage.setItem('nukefire.selfVoiceForegroundOnly', String(accessibility.selfVoiceForegroundOnly !== false));
  localStorage.setItem('nukefire.selfVoiceFollowMode', String(Boolean(accessibility.selfVoiceFollowMode)));
  localStorage.setItem('nukefire.selfVoiceInterruptOnCommand', String(Boolean(accessibility.selfVoiceInterruptOnCommand)));
  localStorage.setItem('nukefire.selfVoiceGovernorEnabled', String(accessibility.selfVoiceGovernorEnabled !== false));
  localStorage.setItem('nukefire.selfVoicePriorityAlertsEnabled', String(accessibility.selfVoicePriorityAlertsEnabled !== false));
  localStorage.setItem('nukefire.readerSafetyAlertsEnabled', String(accessibility.readerSafetyAlertsEnabled !== false));
  localStorage.setItem('nukefire.selfVoiceRate', String(accessibility.selfVoiceRate ?? 1));
  localStorage.setItem('nukefire.selfVoicePitch', String(accessibility.selfVoicePitch ?? 1));
  localStorage.setItem('nukefire.selfVoiceVolume', String(accessibility.selfVoiceVolume ?? 1));
  localStorage.setItem('nukefire.selfVoiceVoiceId', String(accessibility.selfVoiceVoiceId || ''));
  localStorage.setItem('nukefire.vitalSpeechMode', String(accessibility.vitalSpeechMode || 'percent-values'));
  localStorage.setItem('nukefire.audioCuesEnabled', String(Boolean(accessibility.audioCuesEnabled)));
  localStorage.setItem('nukefire.audioCuesMuted', String(Boolean(accessibility.audioCuesMuted)));
  localStorage.setItem('nukefire.audioCuesForegroundOnly', String(accessibility.audioCuesForegroundOnly !== false));
  localStorage.setItem('nukefire.audioCuesVolume', String(accessibility.audioCuesVolume ?? 0.65));
  localStorage.setItem('nukefire.soundpackDisabledEvents', JSON.stringify(Array.isArray(accessibility.soundpackDisabledEvents) ? accessibility.soundpackDisabledEvents : []));
  localStorage.setItem('nukefire.communicationCueTell', String(accessibility.communicationCues?.tell === true));
  localStorage.setItem('nukefire.communicationCueAuction', String(accessibility.communicationCues?.auction === true));
  localStorage.setItem('nukefire.communicationCueGossip', String(accessibility.communicationCues?.gossip === true));
  localStorage.setItem('nukefire.communicationCueSkynet', String(accessibility.communicationCues?.skynet === true));
  localStorage.setItem('nukefire.communicationCueSsf', String(accessibility.communicationCues?.ssf === true));
  localStorage.setItem('nukefire.communicationCuesBackground', String(accessibility.communicationCues?.background === true));
  localStorage.setItem('nukefire.announceImportant', String(accessibility.announceImportant !== false));
}

function applyPersistentSettings(settings) {
  const connection = settings?.connection || {};
  const input = settings?.input || {};
  const display = settings?.display || {};
  const accessibility = settings?.accessibility || {};
  state.transport.compressionEnabled = connection.compressionEnabled !== false;
  const compressionControl = $('#compression-enabled');
  if (compressionControl) compressionControl.checked = state.transport.compressionEnabled;
  setTextIfChanged(
    $('#mccp-preference'),
    state.transport.compressionEnabled ? 'Enabled on next connection' : 'Disabled on next connection'
  );
  const workspace = normalizeWorkspaceSettings(settings?.workspace || {});
  const startupSettings = normalizeTinTinStartupSettings(settings?.tintinStartup || {});
  state.tintinStartup = {
    ...state.tintinStartup,
    ...startupSettings,
    loaded: false,
    loadedFilename: '',
    totalLoaded: 0,
    unsupported: 0,
    definitions: null
  };
  renderTinTinStartupControls();
  state.sessions.aliases = Array.isArray(settings?.aliases)
    ? structuredCloneSafe(settings.aliases)
    : [];
  state.sessions.variables = Array.isArray(settings?.variables)
    ? structuredCloneSafe(settings.variables)
    : [];
  state.sessions.functions = Array.isArray(settings?.functions)
    ? structuredCloneSafe(settings.functions)
    : [];
  state.quickKeys = normalizeQuickKeyRecords(settings?.quickKeys);
  state.hiddenDefaultQuickCommands = normalizeHiddenDefaultQuickCommands(settings?.hiddenDefaultQuickCommands);
  state.keybindings = normalizeKeybindingState(settings?.keybindings);
  if (typeof readerPresetsApi.migrateLegacyReaderHotkeyPreset === 'function') {
    const migratedReader = readerPresetsApi.migrateLegacyReaderHotkeyPreset(state.keybindings, keybindingApi);
    if (migratedReader?.migrated === true) {
      state.keybindings = normalizeKeybindingState(migratedReader.settings);
      schedulePersistentSettingsSave();
    }
  }
  if (typeof readerPresetsApi.migrateEquivalentReaderLineRecallBindings === 'function') {
    const migratedLines = readerPresetsApi.migrateEquivalentReaderLineRecallBindings(state.keybindings, keybindingApi);
    if (Number(migratedLines?.migrated) > 0) {
      state.keybindings = normalizeKeybindingState(migratedLines.settings);
      schedulePersistentSettingsSave();
    }
  }
  soundTriggers?.restore?.(settings?.soundTriggers || { enabled: true, definitions: [] });
  speechSoundTriggers?.restore?.(settings?.soundTriggers || { enabled: true, definitions: [] });
  state.sessions.actions = settings?.actions && typeof settings.actions === 'object'
    ? structuredCloneSafe(settings.actions)
    : { enabled: true, definitions: [] };
  state.sessions.gags = settings?.gags && typeof settings.gags === 'object'
    ? structuredCloneSafe(settings.gags)
    : { enabled: true, definitions: [] };
  state.sessions.highlights = settings?.highlights && typeof settings.highlights === 'object'
    ? structuredCloneSafe(settings.highlights)
    : { enabled: true, definitions: [] };
  highlightEngine?.restore?.(state.sessions.highlights);
  state.sessions.substitutes = settings?.substitutes && typeof settings.substitutes === 'object'
    ? structuredCloneSafe(settings.substitutes)
    : { enabled: true, definitions: [] };
  substituteEngine?.restore?.(state.sessions.substitutes);
  state.sessions.macros = settings?.macros && typeof settings.macros === 'object'
    ? structuredCloneSafe(settings.macros)
    : { enabled: true, definitions: [] };
  macroEngine?.restore?.(state.sessions.macros);
  state.sessions.classes = settings?.classes && typeof settings.classes === 'object'
    ? structuredCloneSafe(settings.classes)
    : { activeStack: [], definitions: [] };
  state.sessions.speedwalk = settings?.speedwalk && typeof settings.speedwalk === 'object'
    ? { enabled: settings.speedwalk.enabled === true }
    : { enabled: false };
  setClientCommandPrefix(input.commandPrefix, {
    persist: false,
    sync: false,
    announceChange: false,
    migrateDefinitions: false
  });

  if (settings?.sessions && typeof window.nukefire.restoreSessions === 'function') {
    void (async () => {
      await restorePersistentSessions(
        settings.sessions,
        state.sessions.aliases,
        state.sessions.variables,
        state.sessions.functions,
        state.sessions.actions,
        state.sessions.gags,
        state.sessions.highlights,
        state.sessions.substitutes,
        state.sessions.macros,
        state.sessions.classes,
        state.sessions.speedwalk,
        state.sessions.commandPrefix
      );
      await loadTinTinStartupProfile({ applyToMain: true, persist: false, report: false });
    })().catch((error) => {
      console.warn('Unable to synchronize saved aliases and actions with the live client.', error);
    });
  } else {
    void loadTinTinStartupProfile({ applyToMain: true, persist: false, report: false });
  }

  hostInput.value = connection.host || 'tdome.nukefire.org';
  portInput.value = String(connection.port || 4000);

  $('#repeat-last-command-on-enter').checked = Boolean(input.repeatLastCommandOnEnter);
  $('#show-last-command-in-input').checked = input.showLastCommandInInput !== false;
  $('#bright-command-input-focus').checked = Boolean(input.brightCommandInputFocus);
  document.body.dataset.brightCommandInputFocus = String(Boolean(input.brightCommandInputFocus));
  $('#follow-output').checked = display.followOutput !== false;
  $('#compact-output').checked = Boolean(display.compactOutput);
  xtermAdapter?.setCompact?.(Boolean(display.compactOutput));

  const fontSize = Number(display.fontSize) || 16;
  applyTerminalFontSize(fontSize, { persist: false, refit: false });
  applyFontPreferences(display.uiFont || 'system', display.terminalFont || 'menlo', { persist: false });
  applyInterfaceBrightness(display.interfaceBrightness, { persist: false });
  setAffectsDisplayMode(display.affectsMode, { persist: false, rerender: false });
  applyDisplayTextPreferences(display.text || DEFAULT_DISPLAY_TEXT, { persist: false });
  applyPromptDisplayMode(display.promptMode, { persist: false, rerender: false });
  applyDisplayComponents(display.components || DEFAULT_DISPLAY_COMPONENTS, { persist: false });
  applyVitalDisplayPreferences(display.vitals || DEFAULT_VITAL_DISPLAY, { persist: false });
  renderQuickCommands();
  renderKeybindings();
  renderSoundTriggers();

  applyTerminalTheme(display.theme || DEFAULT_TERMINAL_THEME, { persist: false });
  setScreenReaderMode(Boolean(accessibility.screenReaderMode), {
    announceChange: false,
    persist: false
  });
  setSelfVoiceVoiceSettings({
    rate: accessibility.selfVoiceRate,
    pitch: accessibility.selfVoicePitch,
    volume: accessibility.selfVoiceVolume,
    voiceId: accessibility.selfVoiceVoiceId
  }, { announceChange: false, persist: false });
  setSelfVoiceGovernorEnabled(accessibility.selfVoiceGovernorEnabled !== false, {
    announceChange: false,
    persist: false
  });
  setSelfVoiceEnabled(accessibility.selfVoiceEnabled === true, {
    announceChange: false,
    persist: false
  });
  setReaderSafetyAlertsEnabled(accessibility.readerSafetyAlertsEnabled !== false, { announceChange: false, persist: false });
  setSelfVoiceFollowMode(accessibility.selfVoiceFollowMode === true, {
    announceChange: false,
    persist: false
  });
  setSelfVoiceInterruptOnCommand(accessibility.selfVoiceInterruptOnCommand === true, {
    announceChange: false,
    persist: false
  });
  setVitalSpeechMode(accessibility.vitalSpeechMode, { announceChange: false, persist: false });
  setAudioCuesVolume(accessibility.audioCuesVolume, { announceChange: false, persist: false });
  setAudioCuesMuted(accessibility.audioCuesMuted === true, { announceChange: false, persist: false });
  setAudioCuesForegroundOnly(accessibility.audioCuesForegroundOnly !== false, { announceChange: false, persist: false });
  setAudioCuesEnabled(accessibility.audioCuesEnabled === true, { announceChange: false, persist: false });
  setSoundpackDisabledEvents(accessibility.soundpackDisabledEvents, { persist: false, announceChange: false });
  applyCommunicationCueSettings(accessibility.communicationCues, { announceChange: false, persist: false });
  setImportantAnnouncements(accessibility.announceImportant !== false, {
    announceChange: false,
    persist: false
  });

  state.workspace.sharedCrewWorkspace = workspace.sharedCrewWorkspace;
  state.workspace.defaultPanels = workspace.defaultPanels;
  state.workspace.defaultLayout = workspace.defaultLayout;
  state.workspace.defaultDockSizes = workspace.defaultDockSizes;
  state.workspace.defaultPanelHeights = workspace.defaultPanelHeights;
  state.workspace.lastCharacterKey = workspace.lastCharacterKey || '';
  state.workspace.lastCharacterName = workspace.lastCharacterName || '';
  state.workspace.defaultTabGroups = workspace.defaultTabGroups;
  state.workspace.defaultActiveTabs = workspace.defaultActiveTabs;
  state.workspace.defaultCommunications = workspace.defaultCommunications;
  state.workspace.defaultPopouts = workspace.defaultPopouts;
  state.workspace.characters = workspace.characters;
  if (!state.workspace.sharedCrewWorkspace && state.workspace.lastCharacterKey) {
    state.workspace.currentCharacterKey = state.workspace.lastCharacterKey;
    state.workspace.currentCharacterName = state.workspace.lastCharacterName
      || state.workspace.characters?.[state.workspace.lastCharacterKey]?.name
      || state.workspace.lastCharacterKey;
  }
  const layout = activePanelLayout();
  state.workspace.activeTabGroups = activePanelTabGroups(layout);
  state.workspace.activeTabs = activePanelTabs(state.workspace.activeTabGroups, layout);
  state.workspace.activeCommunications = activeCommunicationPreferences();
  state.workspace.activePopouts = activePanelPopouts();
  applyPanelLayout(layout, { persist: false });
  applyPanelVisibility(activePanelVisibility(), { persist: false });
  applyDockSizes(activeDockSizes(), { persist: false });
  renderCommunicationTabs();
  renderCommunicationOrderControl();
  renderCommunicationMessages({ snapToLive: true });
  syncPanelPopoutWindows({ focus: false });
  setReaderWorkspaceEnabled(accessibility.readerWorkspaceEnabled === true, {
    announceChange: false,
    persist: false,
    focus: false
  });
  migrateLegacyPanelHeightsForCurrentScope();
  schedulePanelHeightRestore();

  mirrorPersistentSettings(settings);
  void syncClientPreferences();
  scheduleTerminalSizeUpdate();
}

async function flushPersistentSettingsSave() {
  if (!state.settingsReady || typeof window.nukefire.saveSettings !== 'function') return;
  if (state.settingsSaveInFlight) {
    state.settingsSaveQueued = true;
    return;
  }
  if (!state.settingsSaveDirty) return;

  state.settingsSaveDirty = false;
  state.settingsSaveInFlight = true;
  try {
    await window.nukefire.saveSettings(collectPersistentSettings());
  } catch (error) {
    console.warn('Unable to save NukeFire Client settings.', error);
  } finally {
    state.settingsSaveInFlight = false;
    if (state.settingsSaveQueued || state.settingsSaveDirty) {
      state.settingsSaveQueued = false;
      state.settingsSaveTimer = setTimeout(() => {
        state.settingsSaveTimer = null;
        void flushPersistentSettingsSave();
      }, 0);
    }
  }
}

function schedulePersistentSettingsSave() {
  if (!state.settingsReady || typeof window.nukefire.saveSettings !== 'function') return;
  state.settingsSaveDirty = true;
  if (state.settingsSaveTimer !== null) clearTimeout(state.settingsSaveTimer);
  state.settingsSaveTimer = setTimeout(() => {
    state.settingsSaveTimer = null;
    void flushPersistentSettingsSave();
  }, 180);
}

function availableClientPresets() {
  const builtins = Array.isArray(clientPresetApi.BUILTIN_PRESETS)
    ? clientPresetApi.BUILTIN_PRESETS.map((preset) => ({ key: `builtin:${preset.id}`, preset }))
    : [];
  const imported = state.clientPresets.imported.map((preset, index) => ({
    key: `imported:${index}`,
    preset
  }));
  return [...builtins, ...imported];
}

function selectedClientPreset() {
  const selected = String($('#client-preset-select')?.value || '');
  return availableClientPresets().find((entry) => entry.key === selected)?.preset || null;
}

function clientPresetValueLabel(value) {
  if (value === undefined) return 'not set';
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (value === null) return 'none';
  return String(value);
}

function renderClientPresetReview(options = {}) {
  const select = $('#client-preset-select');
  const changesList = $('#client-preset-changes');
  if (!select || !changesList) return;
  const priorSelection = options.selection || select.value;
  const entries = availableClientPresets();
  select.replaceChildren();
  for (const entry of entries) {
    const option = document.createElement('option');
    option.value = entry.key;
    option.textContent = `${entry.preset.name} — ${entry.preset.source === 'builtin' ? 'Built-in' : 'Imported'}`;
    select.append(option);
  }
  select.value = entries.some((entry) => entry.key === priorSelection)
    ? priorSelection
    : (entries[0]?.key || '');

  const preset = selectedClientPreset();
  const description = $('#client-preset-description');
  if (description) description.textContent = preset?.description || 'No preset is available.';
  changesList.replaceChildren();
  const base = state.clientPresets.previewSnapshot || collectPersistentSettings();
  const changes = preset && typeof clientPresetApi.describePresetChanges === 'function'
    ? clientPresetApi.describePresetChanges(base, preset)
    : [];
  if (!changes.length) {
    const item = document.createElement('li');
    item.textContent = preset ? 'This preset already matches the current setup.' : 'No changes to review.';
    changesList.append(item);
  } else {
    for (const change of changes) {
      const item = document.createElement('li');
      item.textContent = `${change.path}: ${clientPresetValueLabel(change.before)} → ${clientPresetValueLabel(change.after)}`;
      changesList.append(item);
    }
  }
  const previewing = Boolean(state.clientPresets.previewSnapshot);
  const keep = $('#client-preset-keep');
  const revert = $('#client-preset-revert');
  if (keep) keep.disabled = !previewing;
  if (revert) revert.disabled = !previewing;
}

async function previewClientPreset() {
  const preset = selectedClientPreset();
  const status = $('#client-preset-status');
  if (!preset || typeof clientPresetApi.applyPresetToSettings !== 'function') {
    if (status) status.textContent = 'No valid client preset is selected.';
    return false;
  }
  if (!state.clientPresets.previewSnapshot) {
    state.clientPresets.previewSnapshot = structuredCloneSafe(collectPersistentSettings());
    state.clientPresets.previewSoundpackId = state.accessibility.soundpackId || 'builtin';
  } else {
    clearLayoutGalleryTrial({ render: false });
    applyPersistentSettings(structuredCloneSafe(state.clientPresets.previewSnapshot));
    await activateSoundpack(state.clientPresets.previewSoundpackId, { announceChange: false });
  }

  const applied = clientPresetApi.applyPresetToSettings(state.clientPresets.previewSnapshot, preset);
  applyPersistentSettings(applied.settings);
  if (applied.layout) {
    const layout = LAYOUT_GALLERY_ITEMS.find((item) => item.id === applied.layout);
    if (!layout || !applyLayoutGalleryPreset(layout)) {
      await revertClientPresetPreview({ announceChange: false });
      if (status) status.textContent = `Preview stopped because the ${applied.layout} layout is unavailable.`;
      return false;
    }
  }
  if (applied.soundpackId) {
    const activated = await activateSoundpack(applied.soundpackId, { announceChange: false });
    if (!activated) {
      await revertClientPresetPreview({ announceChange: false });
      if (status) status.textContent = `Preview stopped because soundpack ${applied.soundpackId} is unavailable.`;
      return false;
    }
  }
  state.clientPresets.previewPresetId = preset.id;
  renderClientPresetReview();
  if (status) status.textContent = `${preset.name} is temporary. Choose Keep and Save or Revert Preview.`;
  announce(`${preset.name} preview applied. Choose Keep and Save or Revert Preview.`, { force: true });
  return true;
}

async function revertClientPresetPreview(options = {}) {
  const snapshot = state.clientPresets.previewSnapshot;
  if (!snapshot) return false;
  const soundpackId = state.clientPresets.previewSoundpackId || 'builtin';
  clearLayoutGalleryTrial({ render: false });
  applyPersistentSettings(structuredCloneSafe(snapshot));
  await activateSoundpack(soundpackId, { announceChange: false });
  state.clientPresets.previewSnapshot = null;
  state.clientPresets.previewSoundpackId = '';
  state.clientPresets.previewPresetId = '';
  renderLayoutGallery();
  renderClientPresetReview();
  const status = $('#client-preset-status');
  if (status) status.textContent = 'Preview reverted. Your prior setup is restored.';
  if (options.announceChange !== false) announce('Client preset preview reverted. Your prior setup is restored.', { force: true });
  return true;
}

function keepClientPresetPreview() {
  if (!state.clientPresets.previewSnapshot) return false;
  const preset = selectedClientPreset();
  clearLayoutGalleryTrial({ render: false });
  state.clientPresets.previewSnapshot = null;
  state.clientPresets.previewSoundpackId = '';
  state.clientPresets.previewPresetId = '';
  schedulePersistentSettingsSave();
  renderLayoutGallery();
  renderClientPresetReview();
  const message = `${preset?.name || 'Client preset'} kept and saved.`;
  const status = $('#client-preset-status');
  if (status) status.textContent = message;
  announce(message, { force: true });
  return true;
}

async function importClientPreset() {
  const status = $('#client-preset-status');
  if (typeof window.nukefire.importClientPreset !== 'function') {
    if (status) status.textContent = 'Client preset import is unavailable.';
    return;
  }
  const result = await window.nukefire.importClientPreset();
  if (result?.canceled) return;
  if (!result?.ok || !result.preset) {
    const message = `Preset import failed: ${result?.error || 'invalid preset file'}.`;
    if (status) status.textContent = message;
    announce(message, { force: true });
    return;
  }
  const preset = clientPresetApi.normalizeClientPreset({ ...result.preset, source: 'imported' });
  state.clientPresets.imported.push(preset);
  const selection = `imported:${state.clientPresets.imported.length - 1}`;
  renderClientPresetReview({ selection });
  if (status) status.textContent = `${preset.name} imported for review. Nothing has been applied.`;
  announce(`${preset.name} imported for review.`, { force: true });
}

async function exportCurrentClientPreset() {
  const status = $('#client-preset-status');
  if (typeof window.nukefire.exportClientPreset !== 'function') {
    if (status) status.textContent = 'Client preset export is unavailable.';
    return;
  }
  try {
    const preset = clientPresetApi.buildPersonalPreset(
      $('#client-preset-name')?.value,
      $('#client-preset-notes')?.value,
      collectPersistentSettings(),
      { soundpackId: state.accessibility.soundpackId || 'builtin' }
    );
    const result = await window.nukefire.exportClientPreset(preset);
    if (result?.canceled) return;
    const message = result?.ok
      ? `${result.filename || `${preset.id}.nfpreset`} exported without commands, scripts, credentials, or history.`
      : `Preset export failed: ${result?.error || 'unable to write file'}.`;
    if (status) status.textContent = message;
    announce(message, { force: true });
  } catch (error) {
    const message = `Preset export failed: ${error?.message || error}`;
    if (status) status.textContent = message;
    announce(message, { force: true });
  }
}

function flushWorkspaceGeometrySaveNow() {
  if (!state.settingsReady || typeof window.nukefire.saveSettings !== 'function') return;
  state.settingsSaveDirty = true;
  if (state.settingsSaveTimer !== null) {
    clearTimeout(state.settingsSaveTimer);
    state.settingsSaveTimer = null;
  }
  void flushPersistentSettingsSave();
}

async function bootstrapPersistentSettings() {
  if (typeof window.nukefire.loadSettings !== 'function') {
    state.settingsReady = true;
    await refreshTinTinImportDestinations();
    return;
  }

  try {
    const result = await window.nukefire.loadSettings(legacySettingsSnapshot());
    if (result?.settings) applyPersistentSettings(result.settings);
  } catch (error) {
    console.warn('Unable to load NukeFire Client settings; using local preferences.', error);
  } finally {
    state.settingsReady = true;
    await refreshTinTinImportDestinations();
  }
}

async function restorePersistentSessions(
  snapshot,
  aliases = state.sessions.aliases,
  variables = state.sessions.variables,
  functions = state.sessions.functions,
  actions = state.sessions.actions,
  gags = state.sessions.gags,
  highlights = state.sessions.highlights,
  substitutes = state.sessions.substitutes,
  macros = state.sessions.macros,
  classes = state.sessions.classes,
  speedwalk = state.sessions.speedwalk,
  commandPrefix = state.sessions.commandPrefix
) {
  try {
    const restoreSnapshot = structuredCloneSafe(snapshot || {});
    const sessionDefinitions = Array.isArray(restoreSnapshot.sessions)
      ? restoreSnapshot.sessions : [];
    const hasPerSessionTinTin = sessionDefinitions.some((record) =>
      record?.tintin && typeof record.tintin === 'object'
    );
    const requestedActive = String(restoreSnapshot.activeSessionId || sessionDefinitions[0]?.id || '');
    const target = sessionDefinitions.find((record) => String(record?.id || '') === requestedActive)
      || sessionDefinitions[0];

    // Every restored session must carry an explicit private TinTin container.
    // A partial or legacy snapshot must never leave another session eligible
    // to inherit the active character's definitions through a missing field.
    for (const record of sessionDefinitions) {
      record.tintin = normalizeSessionTinTinState(record?.tintin || {});
    }
    if (!hasPerSessionTinTin && target) {
      target.tintin = normalizeSessionTinTinState({
        aliases, variables, functions, actions, gags, highlights, substitutes, macros, classes, speedwalk
      });
    }

    // Keep a compatibility mirror of the active session at the historical
    // top level. SessionManager ignores these fields whenever native
    // per-session snapshots are present, so this does not recreate shared
    // TinTin state; it only preserves older renderer and extension readers.
    const compatibilityTarget = sessionDefinitions.find((record) => String(record?.id || '') === requestedActive)
      || sessionDefinitions[0];
    const compatibilityTinTin = normalizeSessionTinTinState(compatibilityTarget?.tintin || {});
    Object.assign(restoreSnapshot, {
      aliases: structuredCloneSafe(compatibilityTinTin.aliases),
      variables: structuredCloneSafe(compatibilityTinTin.variables),
      functions: structuredCloneSafe(compatibilityTinTin.functions),
      actions: structuredCloneSafe(compatibilityTinTin.actions),
      gags: structuredCloneSafe(compatibilityTinTin.gags),
      highlights: structuredCloneSafe(compatibilityTinTin.highlights),
      substitutes: structuredCloneSafe(compatibilityTinTin.substitutes),
      macros: structuredCloneSafe(compatibilityTinTin.macros),
      classes: structuredCloneSafe(compatibilityTinTin.classes),
      speedwalk: structuredCloneSafe(compatibilityTinTin.speedwalk)
    });
    restoreSnapshot.commandPrefix = normalizeClientCommandPrefix(commandPrefix);
    const result = await window.nukefire.restoreSessions?.(restoreSnapshot);
    if (result?.snapshot) applySessionsSnapshot(result.snapshot, { followActive: true });
  } catch (error) {
    console.warn('Unable to restore saved sessions.', error);
  }
}

async function bootstrapSessions() {
  if (typeof window.nukefire.listSessions !== 'function') {
    state.sessions.ready = true;
    return;
  }
  try {
    const result = await window.nukefire.listSessions();
    if (result?.snapshot) applySessionsSnapshot(result.snapshot, { followActive: true });
  } catch (error) {
    appendSystemMessage(`Session manager unavailable: ${error.message || error}`, 'error');
  } finally {
    state.sessions.ready = true;
  }
}



function tintinImportStatusLabel(statusValue) {
  return ({
    ready: 'Ready',
    translated: 'Translated',
    warning: 'Review',
    skipped: 'Recognized / skipped',
    unsupported: 'Unsupported'
  })[String(statusValue || '')] || 'Review';
}

function tintinImportDefinitionLabel(item = {}) {
  return item.label || item.name || item.originalName || item.pattern || '(unnamed TinTin entry)';
}

function tintinImportPreview(item = {}) {
  if (item.preview) return String(item.preview);
  if (item.type === 'action') return `#action {${item.pattern || ''}} {${item.command || ''}} {${item.priority || 5}}`;
  return `#alias {${item.name || item.originalName || ''}} {${item.body || ''}}`;
}

function tintinImportExistingKeys() {
  const snapshot = state.tintinImport.destinationDefinitions || emptySessionTinTinState();
  const categories = {};
  const supported = Array.isArray(tintinImporterApi.FULL_IMPORT_CATEGORIES)
    ? tintinImporterApi.FULL_IMPORT_CATEGORIES : ['aliases', 'variables', 'functions', 'actions', 'gags', 'highlights', 'substitutes', 'macros', 'events'];
  for (const category of supported) {
    const records = ['aliases', 'variables', 'functions'].includes(category)
      ? (Array.isArray(snapshot?.[category]) ? snapshot[category] : [])
      : (Array.isArray(snapshot?.[category]?.definitions) ? snapshot[category].definitions : []);
    categories[category] = new Set(records.map((record) => {
      if (typeof tintinImporterApi.fullImportRecordKey === 'function') {
        return tintinImporterApi.fullImportRecordKey(category, record);
      }
      return String(record?.name || record?.pattern || record?.signature || '').trim();
    }).filter(Boolean));
  }
  categories.includes = new Set((state.tintinImport.destinationIncludes || [])
    .map((value) => String(value || '').normalize('NFKC').trim().toLowerCase())
    .filter(Boolean));
  categories.classes = new Set((snapshot?.classes?.definitions || [])
    .map((record) => String(record?.name || '').normalize('NFKC').trim().toLowerCase())
    .filter(Boolean));
  return categories;
}

function tintinImportItemIsDuplicate(item = {}, existing = {}) {
  if (!item.category || !item.key || !existing[item.category]) return false;
  return existing[item.category].has(String(item.key));
}

function updateTinTinImportCommitAvailability() {
  const commit = $('#tintin-import-commit');
  const review = $('#tintin-import-review');
  if (!commit || !review) return;
  const hasSelection = Boolean(review.querySelector('input[data-tintin-import-id]:checked:not([disabled])'));
  const destination = currentTinTinImportDestination();
  const mode = $('#tintin-import-write-mode')?.value === 'replace' ? 'replace' : 'merge';
  const invalidMerge = mode === 'merge' && Boolean(state.tintinImport.destinationAnalysisError);
  const invalidNewCollision = destination.isNewChoice && destination.collision;
  commit.disabled = !state.tintinImport.destinationReady || !hasSelection || !destination.filename || invalidMerge || invalidNewCollision;
  if (commit.dataset.busy !== 'true') {
    if (!destination.filename) commit.textContent = 'Choose Destination File';
    else if (mode === 'replace' && destination.exists) commit.textContent = `Replace ${destination.filename}`;
    else commit.textContent = `Save Selected to ${destination.filename}`;
  }
}

function renderTinTinImportSummary(summary = {}) {
  const target = $('#tintin-import-summary');
  if (!target) return;
  target.replaceChildren();
  const displayFilters = (summary.gags || 0) + (summary.highlights || 0) + (summary.substitutes || 0);
  const automation = (summary.actions || 0) + (summary.events || 0) + (summary.macros || 0);
  const cards = [
    [summary.definitions || 0, 'Definitions found'],
    [summary.aliases || 0, 'Aliases'],
    [summary.variables || 0, 'Variables'],
    [summary.functions || 0, 'Functions'],
    [automation, 'Actions / Events / Macros'],
    [displayFilters, 'Gags / Highlights / Subs'],
    [(summary.classes || 0) + (summary.settings || 0), 'Classes / Settings'],
    [summary.includes || 0, 'Script includes'],
    [(summary.ready || 0) + (summary.translated || 0), 'Safe selections'],
    [summary.warning || 0, 'Need review'],
    [summary.skipped || 0, 'Recognized / skipped'],
    [summary.unsupported || 0, 'Unsupported'],
    [summary.total || 0, 'Items analyzed']
  ];
  for (const [value, label] of cards) {
    const card = document.createElement('div');
    card.className = 'tintin-import-summary-card';
    const strong = document.createElement('strong');
    strong.textContent = String(value);
    const span = document.createElement('span');
    span.textContent = label;
    card.append(strong, span);
    target.append(card);
  }
}

function renderTinTinImportReview() {
  const analysis = state.tintinImport.analysis;
  const panel = $('#tintin-import-review-panel');
  const review = $('#tintin-import-review');
  const status = $('#tintin-import-status');
  if (!panel || !review || !status) return;
  if (!analysis) {
    panel.hidden = true;
    review.replaceChildren();
    status.textContent = 'Nothing analyzed yet.';
    return;
  }

  panel.hidden = false;
  renderTinTinImportSummary(analysis.summary);
  review.replaceChildren();
  const existing = tintinImportExistingKeys();

  for (const item of analysis.items || []) {
    const row = document.createElement('article');
    row.className = 'tintin-import-item';
    row.dataset.status = item.status;
    row.setAttribute('role', 'listitem');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'tintin-import-item-selector';
    checkbox.dataset.tintinImportId = item.id;
    checkbox.disabled = ['unsupported', 'skipped'].includes(item.status);
    checkbox.checked = !checkbox.disabled && item.selected === true;
    checkbox.setAttribute('aria-label', `Import ${item.type} ${tintinImportDefinitionLabel(item)}`);
    checkbox.addEventListener('change', () => {
      item.selected = checkbox.checked;
      updateTinTinImportCommitAvailability();
    });

    const main = document.createElement('div');
    main.className = 'tintin-import-item-main';
    const heading = document.createElement('div');
    heading.className = 'tintin-import-item-heading';
    const title = document.createElement('strong');
    title.textContent = tintinImportDefinitionLabel(item);
    const typeBadge = document.createElement('span');
    typeBadge.className = 'tintin-import-badge';
    typeBadge.textContent = item.type;
    const statusBadge = document.createElement('span');
    statusBadge.className = 'tintin-import-badge';
    statusBadge.dataset.status = item.status;
    statusBadge.textContent = tintinImportStatusLabel(item.status);
    heading.append(title, typeBadge, statusBadge);

    const duplicate = tintinImportItemIsDuplicate(item, existing);
    if (duplicate) {
      const duplicateBadge = document.createElement('span');
      duplicateBadge.className = 'tintin-import-badge';
      duplicateBadge.textContent = 'In destination';
      heading.append(duplicateBadge);
    }

    const meta = document.createElement('p');
    meta.className = 'tintin-import-item-meta';
    if (item.startLine > 0) {
      meta.textContent = item.startLine === item.endLine
        ? `TinTin line ${item.startLine}`
        : `TinTin lines ${item.startLine}–${item.endLine}`;
    } else {
      meta.textContent = item.category === 'classes'
        ? 'Derived from TinTin class metadata'
        : 'Parsed by the shared TinTin compatibility engine';
    }

    main.append(heading, meta);
    for (const message of item.reasons || []) {
      const note = document.createElement('p');
      note.className = 'tintin-import-item-note';
      note.dataset.tone = 'error';
      note.textContent = message;
      main.append(note);
    }
    for (const message of item.warnings || []) {
      const note = document.createElement('p');
      note.className = 'tintin-import-item-note';
      note.dataset.tone = 'warning';
      note.textContent = message;
      main.append(note);
    }
    for (const message of item.notes || []) {
      const note = document.createElement('p');
      note.className = 'tintin-import-item-note';
      note.dataset.tone = 'translated';
      note.textContent = message;
      main.append(note);
    }
    if (duplicate) {
      const note = document.createElement('p');
      note.className = 'tintin-import-item-note';
      note.dataset.tone = 'warning';
      note.textContent = $('#tintin-import-write-mode')?.value === 'replace'
        ? 'An equivalent entry is in the current destination, but Replace entire file discards the old file before writing this import.'
        : 'An equivalent entry is already present in the destination script; the duplicate policy controls whether the file keeps it or the imported entry wins.';
      main.append(note);
    }

    const preview = document.createElement('pre');
    preview.className = 'tintin-import-item-preview';
    preview.textContent = tintinImportPreview(item);
    main.append(preview);
    row.append(checkbox, main);
    review.append(row);
  }

  const safeCount = (analysis.items || []).filter((item) => item.selected && !['unsupported', 'skipped'].includes(item.status)).length;
  status.textContent = `${analysis.summary.definitions || 0} persistent definitions, ${analysis.summary.includes || 0} script includes, and ${analysis.summary.settings || 0} compatible settings analyzed. ` +
    `${safeCount} selected; ${analysis.summary.skipped || 0} runtime/no-op entries recognized but not executed; ` +
    `${analysis.summary.unsupported || 0} unsupported.`;
  updateTinTinImportCommitAvailability();
}

function analyzeTinTinImportPaste() {
  const source = $('#tintin-import-source')?.value || '';
  const status = $('#tintin-import-status');
  if (!String(source).trim()) {
    state.tintinImport.analysis = null;
    renderTinTinImportReview();
    if (status) status.textContent = 'Paste TinTin++ definitions or a script fragment first.';
    announce('Paste TinTin definitions or a script fragment first.', { force: true });
    return;
  }
  if (typeof tintinScriptLoaderApi.prepareTinTinRead !== 'function' ||
      typeof tintinImporterApi.buildTinTinScriptImportAnalysis !== 'function') {
    if (status) status.textContent = 'Full TinTin import analysis is unavailable in this build.';
    appendSystemMessage('Full TinTin import analysis is unavailable in this build.', 'error');
    return;
  }

  const prepared = tintinScriptLoaderApi.prepareTinTinRead(source, emptySessionTinTinState(), {
    commandPrefix: state.sessions.commandPrefix,
    filename: 'pasted definitions'
  });
  state.tintinImport.analysis = tintinImporterApi.buildTinTinScriptImportAnalysis(prepared);
  renderTinTinImportReview();
  if (!state.tintinImport.destinationReady) void refreshTinTinImportDestinations();
  else void inspectTinTinImportDestination();
  const summary = state.tintinImport.analysis.summary || {};
  announce(
    `TinTin import analysis complete. ${summary.definitions || 0} supported definitions, ` +
    `${summary.skipped || 0} recognized runtime or compatibility commands, ${summary.unsupported || 0} unsupported.`,
    { force: true }
  );
}

function clearTinTinImport() {
  const source = $('#tintin-import-source');
  if (source) source.value = '';
  state.tintinImport.analysis = null;
  renderTinTinImportReview();
  $('#tintin-import-result').textContent = '';
  source?.focus();
}

function selectTinTinImportEntries(modeValue) {
  const analysis = state.tintinImport.analysis;
  if (!analysis) return;
  const selectSafe = modeValue === 'safe';
  for (const item of analysis.items || []) {
    item.selected = selectSafe && (item.status === 'ready' || item.status === 'translated');
  }
  renderTinTinImportReview();
}

function showTinTinImportResult(messageValue, options = {}) {
  const resultBox = $('#tintin-import-result');
  if (!resultBox) return;
  resultBox.textContent = String(messageValue || '');
  resultBox.dataset.tone = String(options.tone || 'info');
  if (options.reveal !== false) resultBox.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
}

function setTinTinImportBusy(busyValue) {
  const commit = $('#tintin-import-commit');
  if (!commit) return;
  const busy = Boolean(busyValue);
  commit.dataset.busy = String(busy);
  commit.textContent = busy ? 'Saving TinTin Script…' : 'Save Selected';
  commit.setAttribute('aria-busy', String(busy));
  for (const selector of [
    '#tintin-import-destination-file', '#tintin-import-new-file', '#tintin-import-refresh-files',
    '#tintin-import-write-mode', '#tintin-import-duplicates', '#tintin-import-load-current',
    '#tintin-import-make-startup'
  ]) {
    const control = $(selector);
    if (control) control.disabled = busy || (selector === '#tintin-import-duplicates' && $('#tintin-import-write-mode')?.value === 'replace');
  }
  if (busy) commit.disabled = true;
  else {
    renderTinTinImportDestinationControls();
    updateTinTinImportCommitAvailability();
  }
}

function tinTinImportComparable(category, record = {}) {
  if (category === 'aliases') return { name: record.name, body: record.body };
  if (category === 'variables') return { name: record.name, value: record.value };
  if (category === 'functions') return { name: record.name, body: record.body };
  if (category === 'actions') return { pattern: record.pattern, command: record.command, priority: record.priority, enabled: record.enabled !== false };
  if (category === 'gags') return { pattern: record.pattern, enabled: record.enabled !== false };
  if (category === 'highlights') return { pattern: record.pattern, style: record.style, priority: record.priority, enabled: record.enabled !== false };
  if (category === 'substitutes') return { pattern: record.pattern, replacement: record.replacement, priority: record.priority, enabled: record.enabled !== false };
  if (category === 'macros') return { signature: record.signature, command: record.command, enabled: record.enabled !== false };
  if (category === 'events') return { name: record.name, command: record.command, enabled: record.enabled !== false };
  return record;
}

function runtimeTinTinFromSessionSnapshot(snapshot, sessionIdValue) {
  const sessionId = String(sessionIdValue || state.sessions.activeId || '');
  const session = Array.isArray(snapshot?.sessions)
    ? snapshot.sessions.find((entry) => String(entry?.id || '') === sessionId)
    : null;
  return normalizeSessionTinTinState(session?.tintin || snapshot || {});
}

function verifyTinTinImportedItems(runtimeValue, selectedItemsValue) {
  const runtime = normalizeSessionTinTinState(runtimeValue || {});
  for (const item of Array.isArray(selectedItemsValue) ? selectedItemsValue : []) {
    if (Array.isArray(tintinImporterApi.FULL_IMPORT_CATEGORIES) && tintinImporterApi.FULL_IMPORT_CATEGORIES.includes(item.category)) {
      const records = ['aliases', 'variables', 'functions'].includes(item.category)
        ? runtime[item.category]
        : runtime[item.category]?.definitions;
      const match = (Array.isArray(records) ? records : []).find((record) =>
        tintinImporterApi.fullImportRecordKey(item.category, record) === String(item.key || '')
      );
      if (!match || JSON.stringify(tinTinImportComparable(item.category, match)) !== JSON.stringify(tinTinImportComparable(item.category, item.record))) {
        throw new Error(`The live ${item.type} engine did not accept ${tintinImportDefinitionLabel(item)}.`);
      }
      continue;
    }
    if (item.category === 'classes') {
      const name = String(item.key || '').toLowerCase();
      const found = runtime.classes?.definitions?.some((record) => String(record?.name || '').toLowerCase() === name);
      if (!found) throw new Error(`The live class manager did not accept class ${name}.`);
      continue;
    }
    if (item.category === 'settings' && item.change) {
      const change = item.change;
      if (change.kind === 'category-toggle' && runtime[change.category]?.enabled !== (change.enabled === true)) {
        throw new Error(`The live client did not apply the ${change.category} enabled setting.`);
      }
      if (change.kind === 'config' && change.key === 'speedwalk' && runtime.speedwalk?.enabled !== (change.value === true)) {
        throw new Error('The live client did not apply the speedwalk setting.');
      }
      if (change.kind === 'config' && change.key === 'commandEcho' && runtime.config?.commandEcho !== (change.value === true)) {
        throw new Error('The live client did not apply the command echo setting.');
      }
      if (change.kind === 'config' && change.key === 'logMode' && runtime.config?.logMode !== String(change.value || '').toLowerCase()) {
        throw new Error('The live client did not apply the log mode setting.');
      }
    }
  }
  return runtime;
}

async function replaceLiveSessionTinTinDefinitions(sessionIdValue, definitionsValue, selectedItemsValue = []) {
  if (typeof window.nukefire.replaceSessionDefinitions !== 'function') {
    throw new Error('This client build is missing the live definition synchronization bridge.');
  }
  const sessionId = String(sessionIdValue || state.sessions.activeId || '');
  const definitions = structuredCloneSafe(definitionsValue || emptySessionTinTinState());
  const result = await window.nukefire.replaceSessionDefinitions(sessionId, definitions);
  const runtime = runtimeTinTinFromSessionSnapshot(result?.snapshot, sessionId);
  verifyTinTinImportedItems(runtime, selectedItemsValue);
  if (result?.snapshot) applySessionsSnapshot(result.snapshot, { followActive: true });
  return runtime;
}

function tinTinImportCountSummary(merged = {}) {
  const order = ['aliases', 'variables', 'functions', 'actions', 'gags', 'highlights', 'substitutes', 'macros', 'events', 'classes', 'settings', 'includes', 'loadCommands'];
  const labels = { aliases: 'aliases', variables: 'variables', functions: 'functions', actions: 'actions', gags: 'gags', highlights: 'highlights', substitutes: 'substitutions', macros: 'macros', events: 'events', classes: 'classes', settings: 'settings', includes: 'script includes', loadCommands: 'load-time commands' };
  return order
    .map((category) => {
      const count = Number(merged.importedByCategory?.[category] || 0) + Number(merged.replacedByCategory?.[category] || 0);
      return count > 0 ? `${count} ${labels[category]}` : '';
    })
    .filter(Boolean)
    .join(', ');
}

function appendTinTinImportFragment(existingContentValue, fragmentContentValue) {
  const existing = String(existingContentValue || '').replace(/\s+$/u, '');
  const fragment = String(fragmentContentValue || '').trim();
  if (!existing) return `${fragment}\n`;
  return `${existing}\n\n${fragment}\n`;
}

async function persistTinTinImportSettings() {
  if (state.settingsReady && typeof window.nukefire.saveSettings === 'function') {
    try {
      await window.nukefire.saveSettings(collectPersistentSettings());
      state.settingsSaveDirty = false;
      state.settingsSaveQueued = false;
      if (state.settingsSaveTimer !== null) {
        clearTimeout(state.settingsSaveTimer);
        state.settingsSaveTimer = null;
      }
      return '';
    } catch (error) {
      schedulePersistentSettingsSave();
      return ` Settings could not be saved yet: ${error?.message || error}.`;
    }
  }
  schedulePersistentSettingsSave();
  return '';
}

async function commitTinTinImport() {
  const analysis = state.tintinImport.analysis;
  if (!analysis || typeof tintinImporterApi.mergeTinTinScriptImportSelection !== 'function') {
    showTinTinImportResult('Full TinTin importer is unavailable in this build.', { tone: 'error' });
    announce('Full TinTin importer is unavailable in this build.', { force: true });
    return;
  }
  if (typeof tintinScriptWriterApi.prepareTinTinFragment !== 'function') {
    showTinTinImportResult('TinTin destination writer is unavailable in this build.', { tone: 'error' });
    return;
  }
  if (typeof window.nukefire.writeTinTinScript !== 'function' || typeof window.nukefire.readTinTinScript !== 'function') {
    showTinTinImportResult('TinTin script storage is unavailable in this build.', { tone: 'error' });
    return;
  }

  const selectedIds = [...document.querySelectorAll('input[data-tintin-import-id]:checked:not([disabled])')]
    .map((input) => input.dataset.tintinImportId);
  if (selectedIds.length === 0) {
    showTinTinImportResult('Select at least one safe or reviewed TinTin entry.', { tone: 'warning' });
    announce('Select at least one TinTin entry to import.', { force: true });
    return;
  }

  const destination = currentTinTinImportDestination();
  if (!destination.filename) {
    showTinTinImportResult('Choose an existing TinTin script or enter a safe new .tin/.txt filename.', { tone: 'warning' });
    return;
  }
  if (destination.isNewChoice && destination.collision) {
    showTinTinImportResult(`${destination.filename} already exists. Refresh the file list and choose that file explicitly.`, { tone: 'warning' });
    return;
  }

  const mode = $('#tintin-import-write-mode')?.value === 'replace' ? 'replace' : 'merge';
  const duplicatePolicy = mode === 'replace' ? 'replace' : ($('#tintin-import-duplicates')?.value || 'keep');
  const loadCurrent = $('#tintin-import-load-current')?.checked !== false;
  const makeStartup = $('#tintin-import-make-startup')?.checked === true;
  const sessionId = String(state.sessions.activeId || '');
  const previousDefinitions = currentDefinitionSnapshot(sessionId);
  const previousStartup = {
    enabled: state.tintinStartup.enabled === true,
    filename: state.tintinStartup.filename,
    loaded: state.tintinStartup.loaded,
    loadedFilename: state.tintinStartup.loadedFilename,
    totalLoaded: state.tintinStartup.totalLoaded,
    unsupported: state.tintinStartup.unsupported,
    definitions: state.tintinStartup.definitions ? structuredCloneSafe(state.tintinStartup.definitions) : null
  };

  setTinTinImportBusy(true);
  showTinTinImportResult(`Preparing ${selectedIds.length} selected TinTin entries for ${destination.filename}…`, { tone: 'progress' });
  announce(`Saving ${selectedIds.length} selected TinTin entries to ${destination.filename}.`, { force: true });
  await new Promise((resolve) => scheduleFrame(resolve));

  let fileSaved = false;
  let liveChanged = false;
  let actualFilename = destination.filename;
  try {
    let existingContent = '';
    let existingDefinitions = emptySessionTinTinState();
    let existingIncludes = [];
    let existingLoadCommands = [];
    let existingResponse = null;

    if (destination.exists && !destination.isNewChoice) {
      existingResponse = await window.nukefire.readTinTinScript(destination.filename);
      if (!existingResponse?.ok || existingResponse.mode === 'info') {
        throw new Error(existingResponse?.error || `Unable to read ${destination.filename}.`);
      }
      actualFilename = String(existingResponse.filename || destination.filename);
      existingContent = String(existingResponse.content || '');
      if (mode === 'merge' && existingContent.trim()) {
        const parsedExisting = prepareTinTinRootScript(existingResponse, emptySessionTinTinState(), {
          filename: actualFilename
        });
        if (!parsedExisting?.ok) {
          throw new Error(`${actualFilename} cannot be merged safely because its own contents do not parse: ${tinTinLoadErrorSummary(parsedExisting)} Choose Replace entire file if you intentionally want to overwrite it.`);
        }
        existingDefinitions = parsedExisting.definitions;
        existingIncludes = (Array.isArray(parsedExisting.scriptIncludes) ? parsedExisting.scriptIncludes : [])
          .map((entry) => String(entry?.requested || '').normalize('NFKC').trim())
          .filter(Boolean);
        existingLoadCommands = (Array.isArray(parsedExisting.runtimeCommands) ? parsedExisting.runtimeCommands : [])
          .filter((entry) => entry?.persistOnImport === true)
          .map((entry) => String(entry?.command || '').normalize('NFKC').trim())
          .filter(Boolean);
      }
    } else if (destination.isNewChoice && typeof window.nukefire.getTinTinScriptsInfo === 'function') {
      const latest = await window.nukefire.getTinTinScriptsInfo();
      const collision = (Array.isArray(latest?.files) ? latest.files : [])
        .find((name) => String(name).toLocaleLowerCase() === destination.filename.toLocaleLowerCase());
      if (collision) throw new Error(`${collision} already exists. Refresh the destination list and choose it explicitly before writing.`);
    }

    const fileBase = mode === 'merge' ? existingDefinitions : emptySessionTinTinState();
    const mergedForFile = tintinImporterApi.mergeTinTinScriptImportSelection(analysis, fileBase, {
      selectedIds,
      duplicatePolicy,
      existingIncludes,
      existingLoadCommands
    });
    const appliedIds = (mergedForFile.selectedItems || []).map((item) => String(item?.id || '')).filter(Boolean);

    if (appliedIds.length === 0 && mode === 'merge' && existingResponse) {
      showTinTinImportResult(
        `Nothing was added to ${actualFilename}: ${mergedForFile.skippedDuplicates} selected duplicate${mergedForFile.skippedDuplicates === 1 ? ' was' : 's were'} kept and ${mergedForFile.skippedCapacity} entries hit a capacity limit.`,
        { tone: 'info' }
      );
    } else {
      const selectedOnly = tintinImporterApi.mergeTinTinScriptImportSelection(
        analysis,
        emptySessionTinTinState(),
        { selectedIds: appliedIds.length ? appliedIds : selectedIds, duplicatePolicy: 'replace' }
      );
      const fragment = tintinScriptWriterApi.prepareTinTinFragment(
        selectedOnly.definitions,
        selectedOnly.selectedItems,
        { commandPrefix: state.sessions.commandPrefix }
      );
      if (!fragment?.ok) {
        throw new Error((fragment?.errors || ['Selected TinTin entries could not be serialized.']).join(' '));
      }
      const finalContent = mode === 'merge'
        ? appendTinTinImportFragment(existingContent, fragment.content)
        : fragment.content;

      const preflight = prepareTinTinRootScript(
        { ok: true, mode: 'read', filename: actualFilename, content: finalContent },
        emptySessionTinTinState(),
        { filename: actualFilename }
      );
      if (!preflight?.ok) {
        throw new Error(`The resulting ${actualFilename} file itself is not valid TinTin: ${tinTinLoadErrorSummary(preflight)} The file was not changed.`);
      }

      const written = await window.nukefire.writeTinTinScript(actualFilename, finalContent);
      if (!written?.ok) throw new Error(written?.error || `Unable to write ${actualFilename}.`);
      fileSaved = true;
      actualFilename = String(written.filename || actualFilename);
    }

    const savedResponse = await window.nukefire.readTinTinScript(actualFilename);
    if (!savedResponse?.ok || savedResponse.mode === 'info') {
      throw new Error(`${actualFilename} was saved but could not be read back for verification.`);
    }
    const verifiedRoot = prepareTinTinRootScript(savedResponse, emptySessionTinTinState(), {
      filename: actualFilename
    });
    if (!verifiedRoot?.ok) {
      throw new Error(`${actualFilename} was saved but its root file did not pass read-back verification: ${tinTinLoadErrorSummary(verifiedRoot)}`);
    }

    const verifiedTree = await prepareTinTinScriptLoad(savedResponse, emptySessionTinTinState(), {
      filename: actualFilename
    });
    const includeWarning = verifiedTree?.ok
      ? ''
      : ` Included script tree is not ready yet: ${tinTinLoadErrorSummary(verifiedTree)} The destination file itself was saved and kept.`;

    let loadWarning = '';
    if (loadCurrent) {
      if (!verifiedTree?.ok) {
        loadWarning = ` The current character was not changed because the included script tree is not ready.`;
        state.tintinImport.undoSnapshot = null;
        $('#tintin-import-undo').disabled = true;
      } else {
        const loadedForCurrent = await prepareTinTinScriptLoad(savedResponse, previousDefinitions, {
          filename: actualFilename
        });
        if (!loadedForCurrent?.ok) {
          loadWarning = ` The file was saved, but it could not be merged into the current character: ${tinTinLoadErrorSummary(loadedForCurrent, 'capacity or parser check failed')}`;
        } else {
          await replaceLiveSessionTinTinDefinitions(sessionId, loadedForCurrent.definitions, []);
          liveChanged = true;
          state.tintinImport.undoSnapshot = structuredCloneSafe(previousDefinitions);
          $('#tintin-import-undo').disabled = false;
        }
      }
    } else {
      state.tintinImport.undoSnapshot = null;
      $('#tintin-import-undo').disabled = true;
    }

    const destinationWasCurrentStartup = previousStartup.enabled
      && String(previousStartup.filename || '').toLocaleLowerCase() === actualFilename.toLocaleLowerCase();
    let startupMessage = '';
    if (makeStartup) {
      if (!verifiedTree?.ok) {
        startupMessage = ` Startup selection was not changed because the included script tree is not ready.`;
      } else {
        state.tintinStartup.enabled = true;
        state.tintinStartup.filename = actualFilename;
        const startupLoaded = await loadTinTinStartupProfile({ applyToMain: false, persist: false, report: false });
        if (!startupLoaded?.ok) {
          Object.assign(state.tintinStartup, previousStartup);
          await window.nukefire.setTinTinStartupTemplate?.(previousStartup.definitions);
          renderTinTinStartupControls();
          startupMessage = ` Startup selection was not changed because ${actualFilename} could not be installed as the startup template.`;
        } else {
          startupMessage = ` ${actualFilename} is now the verified global startup profile.`;
        }
      }
    } else if (destinationWasCurrentStartup) {
      if (!verifiedTree?.ok) {
        startupMessage = ` ${actualFilename} remains the selected startup file, but its template was not refreshed because the included script tree is not ready.`;
      } else {
        const startupLoaded = await loadTinTinStartupProfile({ applyToMain: false, persist: false, report: false });
        startupMessage = startupLoaded?.ok
          ? ` The existing startup template was refreshed from ${actualFilename}.`
          : ` ${actualFilename} remains the selected startup file, but its template could not be refreshed in this session.`;
      }
    }

    const persistenceWarning = await persistTinTinImportSettings();
    await refreshTinTinImportDestinations({ preferred: actualFilename });
    renderTinTinImportReview();

    const changed = (mergedForFile.importedTotal || 0) + (mergedForFile.replacedTotal || 0);
    const detail = tinTinImportCountSummary(mergedForFile);
    const fileAction = mode === 'replace' ? 'Replaced' : (fileSaved ? 'Updated' : 'Kept');
    const loadMessage = loadCurrent
      ? (liveChanged
          ? ' The resulting script definitions were also loaded into the current character; load-time commands were not executed.'
          : loadWarning)
      : ' The current character was left unchanged.';
    showTinTinImportResult(
      `${fileAction} ${actualFilename}. ${mergedForFile.importedTotal} new and ${mergedForFile.replacedTotal} replacement entries were accepted` +
      `${detail ? ` (${detail})` : ''}; ${mergedForFile.skippedDuplicates} destination duplicates kept and ${mergedForFile.skippedCapacity} capacity skips.` +
      ` Actions and Events from the paste remain disabled for review.` +
      `${includeWarning}${loadMessage}${startupMessage}${persistenceWarning}`,
      { tone: includeWarning || loadWarning || persistenceWarning || /could not|not changed|not refreshed/u.test(startupMessage) ? 'warning' : 'success' }
    );
    announce(`TinTin import saved to ${actualFilename}.`, { force: true });
  } catch (error) {
    if (liveChanged) {
      try {
        await window.nukefire.replaceSessionDefinitions?.(sessionId, previousDefinitions);
      } catch (rollbackError) {
        console.error('TinTin session-load rollback also failed.', rollbackError);
      }
    }
    state.tintinImport.undoSnapshot = null;
    $('#tintin-import-undo').disabled = true;
    console.error('TinTin destination import failed.', error);
    showTinTinImportResult(
      fileSaved
        ? `${actualFilename} was written, but a later verification or optional load step failed: ${error?.message || error}`
        : `TinTin destination was not changed: ${error?.message || error}`,
      { tone: 'error' }
    );
    announce(fileSaved ? 'TinTin file was saved, but a later import step failed.' : 'TinTin destination was not changed.', { force: true });
  } finally {
    setTinTinImportBusy(false);
  }
}

async function undoTinTinImport() {
  const snapshot = state.tintinImport.undoSnapshot;
  if (!snapshot) return;
  try {
    await replaceLiveSessionTinTinDefinitions(state.sessions.activeId, snapshot, []);
    state.tintinImport.undoSnapshot = null;
    $('#tintin-import-undo').disabled = true;
    schedulePersistentSettingsSave();
    renderTinTinImportReview();
    $('#tintin-import-result').textContent = 'The last session load was undone. The destination script on disk was not changed.';
    announce('The last TinTin session load was undone. The saved script file was left alone.', { force: true });
  } catch (error) {
    showTinTinImportResult(`Unable to undo the last TinTin session load: ${error?.message || error}`, { tone: 'error' });
  }
}

function syncPreferenceTabOrientation() {
  if (!preferencesTablist) return;
  const horizontal = typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 780px)').matches;
  preferencesTablist.setAttribute('aria-orientation', horizontal ? 'horizontal' : 'vertical');
}

function normalizedPreferenceCategory(category) {
  const requested = String(category || '').trim();
  return preferenceTabs.some((tab) => tab.dataset.preferenceCategory === requested)
    ? requested
    : (preferenceTabs[0]?.dataset.preferenceCategory || 'display');
}

function preferenceTabForCategory(category) {
  const normalized = normalizedPreferenceCategory(category);
  return preferenceTabs.find((tab) => tab.dataset.preferenceCategory === normalized) || null;
}

function setPreferenceCategory(category, options = {}) {
  const normalized = normalizedPreferenceCategory(category);
  state.preferencesCategory = normalized;

  for (const tab of preferenceTabs) {
    const selected = tab.dataset.preferenceCategory === normalized;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }

  for (const panel of preferencePanels) {
    panel.hidden = panel.dataset.preferenceCategory !== normalized;
  }

  if (normalized === 'presets') renderClientPresetReview();

  if (options.resetScroll !== false && preferencesContent) {
    preferencesContent.scrollTop = 0;
  }

  const selectedTab = preferenceTabForCategory(normalized);
  if (options.focusTab && selectedTab) {
    selectedTab.focus({ preventScroll: true });
  }
  return selectedTab;
}

function handlePreferenceTabKeydown(event) {
  const current = event.currentTarget;
  const index = preferenceTabs.indexOf(current);
  if (index < 0) return;

  let nextIndex = null;
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    nextIndex = (index + 1) % preferenceTabs.length;
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    nextIndex = (index - 1 + preferenceTabs.length) % preferenceTabs.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = preferenceTabs.length - 1;
  }

  if (nextIndex === null) return;
  event.preventDefault();
  setPreferenceCategory(preferenceTabs[nextIndex].dataset.preferenceCategory, { focusTab: true });
}

function preferenceFocusableElements() {
  return [...preferencesDialog.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter((element) => !element.hidden && !element.closest('[hidden]'));
}

function openPreferences(options = {}) {
  syncPreferenceTabOrientation();
  const requestedCategory = typeof options?.category === 'string'
    ? options.category
    : state.preferencesCategory;
  const selectedTab = setPreferenceCategory(requestedCategory, { resetScroll: true });
  const requestedFocusTarget = typeof options?.focusTarget === 'string'
    ? document.querySelector(options.focusTarget)
    : options?.focusTarget;
  const focusTarget = requestedFocusTarget instanceof window.HTMLElement
    ? requestedFocusTarget
    : (selectedTab || preferencesDialog);

  if (!preferencesOverlay.hidden) {
    if (options.focusTab === true || requestedFocusTarget) {
      focusTarget.focus({ preventScroll: true });
    }
    return;
  }

  const activeElement = document.activeElement;
  state.preferencesReturnFocus = activeElement &&
    activeElement !== document.body &&
    activeElement !== document.documentElement
    ? activeElement
    : commandInput;
  preferencesOverlay.hidden = false;
  appRoot.inert = true;
  document.body.classList.add('preferences-open');
  renderServerControlsSummary();

  // Focus immediately now that the dialog is visible, then repeat on the next
  // frame so Electron and assistive technologies observe the final category.
  focusTarget.focus({ preventScroll: true });
  scheduleFrame(() => {
    focusTarget.focus({ preventScroll: true });
  });
}

function closePreferences(options = {}) {
  if (preferencesOverlay.hidden) return;

  if (state.clientPresets.previewSnapshot) revertClientPresetPreview({ announceChange: false });

  resetKeybindingEditor();
  preferencesOverlay.hidden = true;
  appRoot.inert = false;
  document.body.classList.remove('preferences-open');
  const returnTarget = options.focusTarget || state.preferencesReturnFocus;
  state.preferencesReturnFocus = null;

  scheduleFrame(() => {
    if (returnTarget && typeof returnTarget.focus === 'function') {
      returnTarget.focus({ preventScroll: true });
    } else {
      commandInput.focus({ preventScroll: true });
    }
  });
}

function handlePreferencesKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    if (state.keybindingEditor.open) {
      resetKeybindingEditor({ focusAdd: true });
    } else {
      closePreferences();
    }
    return;
  }

  if (event.key !== 'Tab') return;
  const focusable = preferenceFocusableElements();
  if (focusable.length === 0) {
    event.preventDefault();
    preferencesDialog.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function normalizeHexColor(value, fallback) {
  const text = String(value || '').trim().toLowerCase();
  return /^#[0-9a-f]{6}$/u.test(text) ? text : fallback;
}

function colorChannelToLinear(channel) {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex) {
  const value = normalizeHexColor(hex, '#000000');
  const red = Number.parseInt(value.slice(1, 3), 16);
  const green = Number.parseInt(value.slice(3, 5), 16);
  const blue = Number.parseInt(value.slice(5, 7), 16);
  return 0.2126 * colorChannelToLinear(red) +
    0.7152 * colorChannelToLinear(green) +
    0.0722 * colorChannelToLinear(blue);
}

function contrastRatio(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function renderTerminalThemeStatus() {
  const theme = state.terminalTheme;
  const preset = TERMINAL_THEMES[theme.preset];
  const ratio = contrastRatio(theme.foreground, theme.background);
  const mode = theme.monochrome
    ? 'all output monochrome'
    : 'default text changed; NukeFire ANSI colors preserved';
  const status = $('#terminal-theme-status');

  status.textContent = `${preset?.label || 'Custom'} · ${mode} · ${ratio.toFixed(1)}:1 contrast`;
  status.classList.toggle('contrast-warning', ratio < 4.5);
}

function persistTerminalTheme() {
  const theme = state.terminalTheme;
  localStorage.setItem('nukefire.terminalTheme', theme.preset);
  localStorage.setItem('nukefire.terminalForeground', theme.foreground);
  localStorage.setItem('nukefire.terminalBackground', theme.background);
  localStorage.setItem('nukefire.terminalMonochrome', String(theme.monochrome));
  localStorage.setItem('nukefire.terminalThemeVersion', TERMINAL_THEME_STORAGE_VERSION);
  schedulePersistentSettingsSave();
}

function applyTerminalTheme(theme, options = {}) {
  const preset = TERMINAL_THEMES[theme?.preset] ? theme.preset : 'custom';
  const foreground = normalizeHexColor(
    theme?.foreground,
    DEFAULT_TERMINAL_THEME.foreground
  );
  const background = normalizeHexColor(
    theme?.background,
    DEFAULT_TERMINAL_THEME.background
  );
  const monochrome = Boolean(theme?.monochrome);

  state.terminalTheme = {
    preset,
    foreground,
    background,
    monochrome
  };

  document.documentElement.style.setProperty('--terminal-foreground', foreground);
  document.documentElement.style.setProperty('--terminal-background', background);
  document.body.classList.toggle('terminal-monochrome', monochrome);
  xtermAdapter?.setTheme?.({ foreground, background }, monochrome);
  if (isXtermActive()) {
    xtermAdapter.replaceRuns(activeSessionRecord()?.outputRuns || [], {
      monochrome,
      follow: true
    });
  }

  $('#terminal-theme').value = preset;
  $('#terminal-foreground').value = foreground;
  $('#terminal-background').value = background;
  $('#terminal-monochrome').checked = monochrome;

  renderTerminalThemeStatus();
  publishAllPanelPopoutStates();

  if (options.persist !== false) persistTerminalTheme();
  if (options.announceChange) {
    const label = TERMINAL_THEMES[preset]?.label || 'Custom';
    announce(`Terminal theme changed to ${label}.`, { force: true });
  }
}

function selectTerminalTheme(preset, options = {}) {
  const selected = TERMINAL_THEMES[preset];
  if (!selected) {
    applyTerminalTheme({
      ...state.terminalTheme,
      preset: 'custom'
    }, options);
    return;
  }

  applyTerminalTheme({
    preset,
    foreground: selected.foreground,
    background: selected.background,
    monochrome: selected.monochrome
  }, options);
}

function applyCustomTerminalColors(options = {}) {
  applyTerminalTheme({
    preset: 'custom',
    foreground: $('#terminal-foreground').value,
    background: $('#terminal-background').value,
    monochrome: $('#terminal-monochrome').checked
  }, options);
}

function restoreTerminalTheme() {
  const savedPreset = localStorage.getItem('nukefire.terminalTheme') || 'nukefire';
  const preset = TERMINAL_THEMES[savedPreset];

  const foreground = localStorage.getItem('nukefire.terminalForeground') ||
    preset?.foreground || DEFAULT_TERMINAL_THEME.foreground;
  const background = localStorage.getItem('nukefire.terminalBackground') ||
    preset?.background || DEFAULT_TERMINAL_THEME.background;
  const savedMonochrome = localStorage.getItem('nukefire.terminalMonochrome');
  const savedVersion = localStorage.getItem('nukefire.terminalThemeVersion');

  // Version 1 CRT presets forced every ANSI color into monochrome. Version 2
  // changes only NukeFire's default foreground and preserves explicit game
  // colors. Migrate saved presets once while leaving custom choices alone.
  const migratePreset = Boolean(preset) &&
    savedVersion !== TERMINAL_THEME_STORAGE_VERSION;
  const monochrome = migratePreset
    ? Boolean(preset.monochrome)
    : savedMonochrome === null
      ? Boolean(preset?.monochrome)
      : savedMonochrome === 'true';

  applyTerminalTheme({
    preset: preset ? savedPreset : 'custom',
    foreground,
    background,
    monochrome
  }, { persist: false });

  if (migratePreset) persistTerminalTheme();
}


function communicationVisibleChannels() {
  if (typeof communicationsApi.visibleChannels === 'function') {
    return communicationsApi.visibleChannels({
      advertisedChannels: state.gmcp?.comm?.channels,
      messages: state.communications.messages
    });
  }
  return communicationChannels.filter((channel) => channel.availability !== 'advertised' && channel.availability !== 'detected');
}

function effectiveCommunicationChannel(visibleChannels = null) {
  const requested = state.workspace.activeCommunications.activeChannel;
  const channels = Array.isArray(visibleChannels) ? visibleChannels : communicationVisibleChannels();
  return channels.some((channel) => channel.id === requested) ? requested : 'all';
}

function communicationChannelLabel(channelId) {
  return communicationChannels.find((channel) => channel.id === channelId)?.label || channelId;
}

function communicationComparableText(message) {
  // Compare the message payload, not the separately supplied sender. NukeFire's
  // current GMCP packet includes the already-formatted full channel line, while
  // conventional Comm.Channel servers may send only the spoken text. Both must
  // deduplicate against the matching line copied from normal terminal output.
  let text = typeof communicationsApi.normalizeText === 'function'
    ? communicationsApi.normalizeText(message.text)
    : String(message.text || '').replaceAll('\r', '').trim();

  text = text
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/^\s*%+\s*/u, '')
    .replace(/^\s*\[\s*(?:gossip|chat|newbie|newcomer|group|party|tell|grats?|gratz|congrat(?:s|ulations)?|auction|market|ssf|bonejack|bj|system)\s*\]\s*/u, '')
    .replace(/^\s*(?:you|[a-z0-9_'’-]+)\s+(?:gossips?|tells?(?:\s+(?:you|the\s+group|group|party))?|telepaths?(?:\s+to\s+you)?|group[- ]?says?|newbie\s+(?:says?|asks?|chats?)|congrat(?:s|ulate|ulates)?|auctions?|bonejacks?)\b[\s,:>\-]*/u, '')
    .replace(/^\s*[a-z0-9_'’-]+\s*[:>\-]\s*/u, '')
    .replace(/\b(?:gossips?|tells?|telepaths?|the|you|group|party|newbie|newcomer|grats?|gratz|congrat(?:s|ulations|ulate|ulates)?|auctions?|auction|market|ssf|bonejacks?|bj|system|channel)\b/gu, '')
    .replace(/[^a-z0-9]+/gu, '');

  return text;
}

function communicationSignature(message) {
  return `${message.channel}|${communicationComparableText(message)}`;
}

function isCommunicationsPanelReviewing(channel) {
  const activeChannel = effectiveCommunicationChannel();
  if (isPanelPoppedOut('communications')) return activeChannel === 'all' || activeChannel === channel;
  const panel = $('#panel-communications');
  if (!panel || panel.hidden || panel.dataset.tabActive === 'false' || document.hidden) return false;
  return activeChannel === 'all' || activeChannel === channel;
}

function communicationReviewText(result) {
  if (!result?.text) return '';
  const label = result.view === 'all' ? 'All Communications' : communicationChannelLabel(result.view);
  const sender = String(result.sender || '').trim();
  const text = String(result.text || '').trim();
  const includesSender = sender && text.toLocaleLowerCase().includes(sender.toLocaleLowerCase());
  const senderText = sender && !includesSender ? ` from ${sender}` : '';
  return `${label} message ${result.position} of ${result.count}${senderText}: ${text}`;
}

function announceCommunicationReview(result) {
  const text = communicationReviewText(result);
  if (!text) {
    const channel = effectiveCommunicationChannel();
    const label = channel === 'all' ? 'Communications' : communicationChannelLabel(channel);
    const message = `No ${label} messages are available for review yet.`;
    setReaderWorkspaceReviewStatus(message);
    announce(message, { force: true });
    return false;
  }
  state.lastReviewedText = String(result.text || '').trim();
  setReaderWorkspaceReviewStatus(text);
  announce(text, { force: true });
  return true;
}

function reviewCurrentCommunication() {
  const channel = effectiveCommunicationChannel();
  return announceCommunicationReview(state.communications.review?.current?.(state.communications.messages, channel));
}

function reviewOlderCommunication() {
  const channel = effectiveCommunicationChannel();
  return announceCommunicationReview(state.communications.review?.previous?.(state.communications.messages, channel));
}

function reviewNewerCommunication() {
  const channel = effectiveCommunicationChannel();
  return announceCommunicationReview(state.communications.review?.next?.(state.communications.messages, channel));
}

function reviewLatestCommunication() {
  const channel = effectiveCommunicationChannel();
  return announceCommunicationReview(state.communications.review?.latest?.(state.communications.messages, channel));
}

function announceCommunicationRecall(result, fallbackLabel = 'Communications') {
  if (!result?.text) {
    const message = `No ${fallbackLabel} message is available for rapid recall.`;
    setReaderWorkspaceReviewStatus(message);
    announce(message, { force: true });
    return false;
  }
  state.lastReviewedText = String(result.text || '').trim();
  const sender = String(result.sender || '').trim();
  const text = String(result.text || '').trim();
  const includesSender = sender && text.toLocaleLowerCase().includes(sender.toLocaleLowerCase());
  const senderText = sender && !includesSender ? ` from ${sender}` : '';
  const label = result.channel ? communicationChannelLabel(result.channel) : fallbackLabel;
  const message = `${label}${senderText}: ${text}`;
  setReaderWorkspaceReviewStatus(message);
  announce(message, { force: true });
  return true;
}

function recallCommunication(n = 1) {
  const channel = effectiveCommunicationChannel();
  const label = channel === 'all' ? 'Communications' : communicationChannelLabel(channel);
  return announceCommunicationRecall(
    state.communications.review?.recall?.(state.communications.messages, channel, n),
    label
  );
}

function recallLastTell() {
  const stored = readerHistoryLastTell()
    || state.communications.lastTell
    || activeSessionRecord()?.communications?.lastTell
    || state.communications.review?.recall?.(state.communications.messages, 'tell', 1);
  const ok = announceCommunicationRecall(stored, 'Tell');
  advanceReaderTutorialFor('last-tell');
  return ok;
}

function recallLastCommunication() {
  return announceCommunicationRecall(
    state.communications.review?.recall?.(state.communications.messages, 'all', 1),
    'Communications'
  );
}

function renderCommunicationTabs() {
  const tabList = $('#communications-tabs');
  if (!tabList) return;

  const visibleChannels = communicationVisibleChannels();
  const signature = visibleChannels.map((channel) => channel.id).join('|');
  const effectiveChannel = effectiveCommunicationChannel(visibleChannels);
  const totalUnread = Object.values(state.communications.unread).reduce((sum, value) => sum + value, 0);
  const unreadSignature = visibleChannels.map((channel) =>
    `${channel.id}:${channel.id === 'all' ? totalUnread : (state.communications.unread[channel.id] || 0)}`
  ).join('|');
  const renderSignature = `${signature}::${effectiveChannel}::${unreadSignature}`;
  if (tabList.dataset.renderSignature === renderSignature) return;

  if (tabList.dataset.channelSignature !== signature) {
    const focusedChannel = document.activeElement?.dataset?.communicationChannel || '';
    const fragment = document.createDocumentFragment();

    for (const channel of visibleChannels) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'communications-tab';
      button.dataset.communicationChannel = channel.id;
      button.id = `communications-tab-${channel.id}`;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'communications-messages');

      const label = document.createElement('span');
      label.textContent = channel.label;
      const unread = document.createElement('span');
      unread.className = 'communications-unread';
      unread.dataset.communicationUnread = channel.id;
      unread.hidden = true;
      button.append(label, unread);
      button.addEventListener('click', () => {
        setCommunicationChannel(channel.id, { persist: true, focusTab: true });
      });
      button.addEventListener('keydown', handleCommunicationTabKeydown);
      fragment.append(button);
    }

    tabList.replaceChildren(fragment);
    tabList.dataset.channelSignature = signature;
    if (focusedChannel && visibleChannels.some((channel) => channel.id === focusedChannel)) {
      scheduleFrame(() => {
        tabList.querySelector(`[data-communication-channel="${focusedChannel}"]`)?.focus({ preventScroll: true });
      });
    }
  }

  for (const channel of visibleChannels) {
    const button = tabList.querySelector(`[data-communication-channel="${channel.id}"]`);
    if (!button) continue;
    const selected = channel.id === effectiveChannel;
    const unreadCount = channel.id === 'all'
      ? totalUnread
      : (state.communications.unread[channel.id] || 0);
    setAttributeIfChanged(button, 'aria-selected', String(selected));
    if (button.tabIndex !== (selected ? 0 : -1)) button.tabIndex = selected ? 0 : -1;
    setAttributeIfChanged(
      button,
      'aria-label',
      unreadCount > 0 ? `${channel.label}, ${unreadCount} unread` : channel.label
    );
    const badge = button.querySelector('[data-communication-unread]');
    if (badge) {
      setTextIfChanged(badge, unreadCount > 99 ? '99+' : String(unreadCount));
      const hidden = unreadCount === 0;
      if (badge.hidden !== hidden) badge.hidden = hidden;
    }
  }
  tabList.dataset.renderSignature = renderSignature;
}

function persistCommunicationPreferences() {
  const preferences = normalizeCommunicationPreferences(state.workspace.activeCommunications);
  const key = workspacePersistenceCharacterKey();
  if (key) {
    const current = state.workspace.characters[key] || {};
    state.workspace.characters[key] = {
      ...current,
      name: state.workspace.currentCharacterName || current.name || key,
      communications: preferences
    };
  } else {
    state.workspace.defaultCommunications = preferences;
  }
  schedulePersistentSettingsSave();
}

function renderCommunicationOrderControl() {
  const select = $('#communications-order');
  if (!select) return;
  const order = state.workspace.activeCommunications.messageOrder;
  const value = COMMUNICATION_MESSAGE_ORDERS.includes(order)
    ? order
    : DEFAULT_COMMUNICATION_PREFERENCES.messageOrder;
  if (select.value !== value) select.value = value;
}

function setCommunicationMessageOrder(messageOrder, options = {}) {
  const normalized = normalizeCommunicationPreferences(
    { ...state.workspace.activeCommunications, messageOrder },
    state.workspace.activeCommunications
  );
  const changed = normalized.messageOrder !== state.workspace.activeCommunications.messageOrder;
  state.workspace.activeCommunications = normalized;
  if (changed || options.snapToLive === true) setCommunicationFollowLiveEdge(true);
  renderCommunicationOrderControl();
  renderCommunicationMessages({ snapToLive: changed || options.snapToLive === true });
  if (options.persist) persistCommunicationPreferences();
}

function setCommunicationChannel(channelId, options = {}) {
  const available = communicationVisibleChannels();
  const requested = available.some((channel) => channel.id === channelId) ? channelId : 'all';
  const normalized = normalizeCommunicationPreferences(
    { activeChannel: requested },
    state.workspace.activeCommunications
  );
  state.workspace.activeCommunications = normalized;
  setCommunicationFollowLiveEdge(true);
  if (normalized.activeChannel === 'all') {
    for (const channel of Object.keys(state.communications.unread)) {
      state.communications.unread[channel] = 0;
    }
  } else if (Object.hasOwn(state.communications.unread, normalized.activeChannel)) {
    state.communications.unread[normalized.activeChannel] = 0;
  }
  renderCommunicationTabs();
  renderCommunicationOrderControl();
  renderCommunicationMessages({ snapToLive: true });
  renderReaderWorkspaceStatus();
  if (options.persist) persistCommunicationPreferences();
  if (options.focusTab) {
    scheduleFrame(() => {
      document.getElementById(`communications-tab-${normalized.activeChannel}`)?.focus({ preventScroll: true });
    });
  }
}

function handleCommunicationTabKeydown(event) {
  const tabList = event.currentTarget.closest('[role="tablist"]');
  if (!tabList) return;
  const tabs = [...tabList.querySelectorAll('[data-communication-channel]')];
  const index = tabs.indexOf(event.currentTarget);
  let nextIndex = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') nextIndex = 0;
  else if (event.key === 'End') nextIndex = tabs.length - 1;
  if (nextIndex === null) return;
  event.preventDefault();
  const next = tabs[nextIndex];
  setCommunicationChannel(next.dataset.communicationChannel, { persist: true, focusTab: true });
}

let communicationTimeFormatter = null;
const communicationStyledRunsCache = new WeakMap();

function formatCommunicationTime(timestamp) {
  communicationTimeFormatter ||= new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  return communicationTimeFormatter.format(new Date(Number(timestamp) || Date.now()));
}

function communicationStyledRuns(message) {
  const source = message.ansiText || message.text || '';
  const cached = communicationStyledRunsCache.get(message);
  if (cached?.source === source) return cached.runs;
  const parser = new window.NukeFireAnsi.AnsiParser();
  const runs = parser.parse(source);
  communicationStyledRunsCache.set(message, { source, runs });
  return runs;
}

function appendCommunicationStyledText(target, message) {
  for (const run of communicationStyledRuns(message)) {
    const span = document.createElement('span');
    span.textContent = run.text;
    Object.assign(span.style, window.NukeFireAnsi.styleToCss(run.style));
    target.append(span);
  }
}

function communicationMessageMatches(message) {
  const activeChannel = effectiveCommunicationChannel();
  if (activeChannel !== 'all' && message.channel !== activeChannel) return false;
  const search = String($('#communications-search')?.value || '').trim().toLocaleLowerCase();
  if (!search) return true;
  return `${message.sender || ''} ${message.text || ''}`.toLocaleLowerCase().includes(search);
}

function createCommunicationArticle(message) {
  const article = document.createElement('article');
  article.className = 'communication-message';
  article.dataset.communicationMessage = String(message.id);
  article.dataset.channel = message.channel;

  const meta = document.createElement('div');
  meta.className = 'communication-meta';
  const time = document.createElement('time');
  time.dateTime = new Date(message.timestamp).toISOString();
  time.textContent = formatCommunicationTime(message.timestamp);
  const channel = document.createElement('span');
  channel.className = 'communication-channel-label';
  channel.textContent = communicationChannelLabel(message.channel);
  meta.append(time, channel);

  if (message.sender) {
    const sender = document.createElement('strong');
    sender.textContent = message.sender;
    meta.append(sender);
  }

  const text = document.createElement('p');
  text.className = 'communication-body';
  appendCommunicationStyledText(text, message);
  article.append(meta, text);
  return article;
}

function updateCommunicationArticle(message) {
  const article = document.querySelector(`[data-communication-message="${message.id}"]`);
  const body = article?.querySelector('.communication-body');
  if (!body) return false;
  body.replaceChildren();
  appendCommunicationStyledText(body, message);
  return true;
}

function communicationMessageOrder() {
  const order = state.workspace.activeCommunications.messageOrder;
  return COMMUNICATION_MESSAGE_ORDERS.includes(order)
    ? order
    : DEFAULT_COMMUNICATION_PREFERENCES.messageOrder;
}

function communicationsAtLiveEdge(container, messageOrder = communicationMessageOrder(), threshold = 36) {
  if (!container) return true;
  if (messageOrder === 'newest-top') return container.scrollTop <= threshold;
  return container.scrollHeight - container.clientHeight - container.scrollTop <= threshold;
}

function communicationFollowsLiveEdge() {
  return state.communications?.followLiveEdge !== false;
}

function setCommunicationFollowLiveEdge(value) {
  if (!state.communications) return;
  state.communications.followLiveEdge = Boolean(value);
}

function returnCommunicationsToLiveEdge(container, messageOrder = communicationMessageOrder()) {
  if (!container) return;
  setCommunicationFollowLiveEdge(true);
  container.scrollTop = messageOrder === 'newest-top' ? 0 : container.scrollHeight;
}

function orderedCommunicationMessages(messages, messageOrder = communicationMessageOrder()) {
  return messageOrder === 'newest-top' ? [...messages].reverse() : messages;
}

function restoreCommunicationsScroll(container, snapshot, messageOrder) {
  if (!container) return;
  if (snapshot.followLiveEdge || snapshot.atLiveEdge || snapshot.snapToLive || container.childElementCount <= 1) {
    returnCommunicationsToLiveEdge(container, messageOrder);
    return;
  }
  if (messageOrder === 'newest-top') {
    const heightDelta = Math.max(0, container.scrollHeight - snapshot.scrollHeight);
    container.scrollTop = snapshot.scrollTop + heightDelta;
    return;
  }
  container.scrollTop = snapshot.scrollTop;
}

function communicationEmptyStateText() {
  const search = String($('#communications-search')?.value || '').trim();
  const activeChannel = effectiveCommunicationChannel();
  const channelLabel = activeChannel === 'all'
    ? 'all channels'
    : communicationChannelLabel(activeChannel);

  if (search) return `No messages match “${search}” in ${channelLabel}.`;
  if (state.communications.messages.length === 0) {
    return 'No communications yet. New channel traffic will appear here as it arrives.';
  }
  if (activeChannel !== 'all') {
    return `No ${communicationChannelLabel(activeChannel)} messages in the current history.`;
  }
  return 'No messages match the current Communications view.';
}

function renderCommunicationMessages(options = {}) {
  const container = $('#communications-messages');
  const empty = $('#communications-empty');
  if (!container || !empty) return;
  if (options.snapToLive === true || options.snapToBottom === true) setCommunicationFollowLiveEdge(true);

  const messageOrder = communicationMessageOrder();
  const snapshot = {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    atLiveEdge: communicationsAtLiveEdge(container, messageOrder),
    followLiveEdge: communicationFollowsLiveEdge(),
    snapToLive: options.snapToLive === true || options.snapToBottom === true
  };
  const visible = orderedCommunicationMessages(
    state.communications.messages.filter(communicationMessageMatches),
    messageOrder
  );

  const fragment = document.createDocumentFragment();
  for (const message of visible) fragment.append(createCommunicationArticle(message));

  container.dataset.messageOrder = messageOrder;
  container.setAttribute(
    'aria-label',
    messageOrder === 'newest-top'
      ? 'Communications messages, newest at top'
      : 'Communications messages, newest at bottom'
  );
  container.replaceChildren(fragment);
  empty.textContent = communicationEmptyStateText();
  empty.hidden = visible.length > 0;
  scheduleFrame(() => restoreCommunicationsScroll(container, snapshot, messageOrder));
  publishCommunicationsPopoutState();
}

function appendCommunicationMessage(message, removedMessages = []) {
  const container = $('#communications-messages');
  const empty = $('#communications-empty');
  if (!container || !empty) {
    publishCommunicationsPopoutState();
    return;
  }

  const messageOrder = communicationMessageOrder();
  const snapshot = {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    atLiveEdge: communicationsAtLiveEdge(container, messageOrder),
    followLiveEdge: communicationFollowsLiveEdge(),
    snapToLive: false
  };

  for (const removed of removedMessages) {
    container.querySelector(`[data-communication-message="${removed.id}"]`)?.remove();
  }

  if (!communicationMessageMatches(message)) {
    empty.hidden = container.childElementCount > 0;
    publishCommunicationsPopoutState();
    return;
  }

  const article = createCommunicationArticle(message);
  if (messageOrder === 'newest-top') container.prepend(article);
  else container.append(article);
  container.dataset.messageOrder = messageOrder;
  empty.hidden = true;

  scheduleFrame(() => restoreCommunicationsScroll(container, snapshot, messageOrder));
  publishCommunicationsPopoutState();
}

function noteLastTell(communications, message) {
  if (!communications || String(message?.channel || '').toLowerCase() !== 'tell') return null;
  const text = String(message?.text || '').trim();
  if (!text) return null;
  communications.lastTell = {
    id: Number(message.id) || 0,
    channel: 'tell',
    sender: String(message.sender || '').trim(),
    text,
    ansiText: String(message.ansiText || text),
    timestamp: Number(message.timestamp) || Date.now(),
    source: String(message.source || 'unknown')
  };
  return communications.lastTell;
}

function readerHistoryLastTell(record = activeSessionRecord()) {
  const snapshot = record?.readerHistory?.snapshot?.('comm:tell');
  const entry = Array.isArray(snapshot) ? snapshot.at(-1) : null;
  if (!entry?.text) return null;
  return {
    channel: 'tell',
    sender: '',
    text: String(entry.text),
    ansiText: String(entry.text),
    timestamp: Number(entry.timestamp) || 0,
    source: String(entry.source || 'reader-history')
  };
}

function addCommunicationMessage(input = {}) {
  const channel = typeof communicationsApi.normalizeChannel === 'function'
    ? communicationsApi.normalizeChannel(input.channel, '')
    : (COMMUNICATION_CHANNEL_IDS.includes(input.channel) ? input.channel : '');
  const rawStyledText = input.ansiText ?? input.styledText ?? input.text;
  const ansiText = typeof communicationsApi.normalizeAnsiText === 'function'
    ? communicationsApi.normalizeAnsiText(rawStyledText)
    : String(rawStyledText || '').replaceAll('\r', '').trim();
  const text = typeof communicationsApi.normalizeText === 'function'
    ? communicationsApi.normalizeText(input.text ?? ansiText)
    : String(input.text ?? ansiText).replaceAll('\r', '').trim();
  if (!channel || channel === 'all' || !text) return false;

  const timestamp = Number(input.timestamp) || Date.now();
  const message = {
    id: state.communications.nextId++,
    channel,
    sender: String(input.sender || '').trim(),
    text,
    ansiText: ansiText || text,
    timestamp,
    source: String(input.source || 'text')
  };

  noteLastTell(state.communications, message);
  const signature = communicationSignature(message);
  // Only merge the two representations of one event: the terminal copy and
  // its matching GMCP copy. Repeated real messages from the same source are
  // distinct communications even when their text and timing are identical.
  const duplicate = state.communications.messages
    .slice(-12)
    .reverse()
    .find((candidate) =>
      candidate.source !== message.source &&
      communicationSignature(candidate) === signature &&
      Math.abs(timestamp - candidate.timestamp) <= COMMUNICATION_DEDUPE_WINDOW_MS
    );
  if (duplicate) {
    if (channel === 'tell') noteLastTell(state.communications, duplicate);
    const incomingIsStyled = typeof communicationsApi.hasAnsiFormatting === 'function'
      ? communicationsApi.hasAnsiFormatting(message.ansiText)
      : /\x1b\[[0-?]*[ -/]*m/u.test(message.ansiText);
    const existingIsStyled = typeof communicationsApi.hasAnsiFormatting === 'function'
      ? communicationsApi.hasAnsiFormatting(duplicate.ansiText)
      : /\x1b\[[0-?]*[ -/]*m/u.test(duplicate.ansiText || '');
    // A conventional GMCP packet may arrive first with plain spoken text,
    // followed by NukeFire's colored terminal line. Keep one entry but upgrade
    // its body to the richer safe ANSI representation.
    if (incomingIsStyled && !existingIsStyled) {
      duplicate.ansiText = message.ansiText;
      duplicate.text = message.text;
      communicationStyledRunsCache.delete(duplicate);
      if (!updateCommunicationArticle(duplicate)) renderCommunicationMessages();
      else publishCommunicationsPopoutState();
    }
    return false;
  }

  state.communications.messages.push(message);
  appendReaderHistoryCommunication(activeSessionRecord(), message);
  playCommunicationAudioCue(activeSessionRecord(), message);
  const removedMessages = state.communications.messages.length > MAX_COMMUNICATION_MESSAGES
    ? state.communications.messages.splice(0, state.communications.messages.length - MAX_COMMUNICATION_MESSAGES)
    : [];
  if (!isCommunicationsPanelReviewing(channel)) {
    state.communications.unread[channel] = (state.communications.unread[channel] || 0) + 1;
  }
  renderCommunicationTabs();
  appendCommunicationMessage(message, removedMessages);
  return true;
}

function captureCommunicationText(text, plainText) {
  for (const result of state.communications.lineBuffer.push(text, plainText)) {
    addCommunicationMessage({
      channel: result.channel,
      text: result.text,
      ansiText: result.ansiText,
      timestamp: Date.now(),
      source: 'text'
    });
  }
}

function flushCommunicationText() {
  for (const result of state.communications.lineBuffer.flush()) {
    addCommunicationMessage({
      channel: result.channel,
      text: result.text,
      ansiText: result.ansiText,
      timestamp: Date.now(),
      source: 'text'
    });
  }
}

function captureCommunicationGmcp(message) {
  if (typeof communicationsApi.messageFromGmcp !== 'function') return;
  const packageName = String(message?.packageName || message?.package || '').trim().toLocaleLowerCase();
  if (packageName !== 'comm.channel' && packageName !== 'nukefire.comms.message') return;
  const parsed = communicationsApi.messageFromGmcp(message);
  if (parsed) addCommunicationMessage(parsed);
}

function clearCommunicationMessages(options = {}) {
  state.communications.messages = [];
  state.communications.review?.clear?.();
  const readerHistory = activeReaderHistory();
  for (const category of readerHistory?.availableCategories?.({ includeEmpty: true }) || []) {
    if (String(category.id || '').startsWith('comm:')) readerHistory.clear?.(category.id);
  }
  for (const channel of Object.keys(state.communications.unread)) {
    state.communications.unread[channel] = 0;
  }
  state.communications.lineBuffer.reset();
  state.communications.lastTell = null;
  renderCommunicationTabs();
  renderCommunicationOrderControl();
  renderCommunicationMessages({ snapToLive: true });
  if (options.focus !== false) $('#communications-messages')?.focus({ preventScroll: true });
}

function updateCommandHistoryStatus() {
  const status = $('#command-history-status');
  if (!status) return;
  if (state.remoteEcho || state.historyIndex === null || state.history.length === 0) {
    status.hidden = true;
    status.textContent = '';
    status.removeAttribute('title');
    return;
  }

  const position = Math.max(1, Math.min(state.history.length, state.historyIndex + 1));
  const prefixMatch = Boolean(state.historyPrefix);
  status.textContent = `History ${position}/${state.history.length}${prefixMatch ? ' · prefix' : ''}`;
  status.title = prefixMatch
    ? 'Browsing commands that begin with your typed prefix. Escape restores your draft.'
    : 'Browsing command history. Escape restores your draft.';
  status.hidden = false;
}

function renderCommandInputContext(connectionState = statusBox?.dataset.connectionState || 'disconnected') {
  const mode = $('#input-mode');
  if (!mode) return;
  const connected = connectionState === 'connected';
  const connecting = connectionState === 'connecting';
  mode.classList.toggle('secure', state.remoteEcho);
  mode.classList.toggle('local', !state.remoteEcho && !connected && !connecting);
  mode.classList.toggle('connecting', !state.remoteEcho && connecting);

  if (state.remoteEcho) {
    mode.textContent = '🔒';
    mode.title = 'Hidden server input';
    commandInput.title = 'Hidden server input. Return submits securely.';
  } else if (connected) {
    mode.textContent = '›';
    mode.title = 'Connected command input';
    commandInput.title = 'Return sends. Up and Down Arrow browse command history. Escape restores your draft while browsing history.';
  } else if (connecting) {
    mode.textContent = '…';
    mode.title = 'Connecting to NukeFire';
    commandInput.title = 'Connecting to NukeFire. Local client commands remain available.';
  } else {
    mode.textContent = 'LOCAL';
    mode.title = 'Local TinTin workspace; no server connection required';
    commandInput.title = 'Local workspace: aliases, Actions, and client commands still work. Return runs the command; Up and Down Arrow browse history.';
  }
  updateCommandHistoryStatus();
}

function updateCommandAvailability(connectionState = statusBox?.dataset.connectionState || 'disconnected') {
  const prefix = normalizeClientCommandPrefix(state.sessions.commandPrefix);
  const connected = connectionState === 'connected';
  const connecting = connectionState === 'connecting';
  if (state.remoteEcho) {
    commandInput.placeholder = 'Hidden input…';
    commandInput.setAttribute('aria-label', 'Hidden server input');
  } else if (connected) {
    commandInput.placeholder = 'Enter a NukeFire command…';
    commandInput.setAttribute('aria-label', 'Command input');
  } else if (connecting) {
    commandInput.placeholder = 'Connecting to NukeFire…';
    commandInput.setAttribute('aria-label', 'Command input while connecting');
  } else {
    commandInput.placeholder = `Local workspace — aliases, Actions, ${prefix}showme, and client commands still work`;
    commandInput.setAttribute('aria-label', 'Disconnected command input; local TinTin commands remain available');
  }
  renderCommandInputContext(connectionState);

  // The disconnected terminal remains a complete local TinTin workspace.
  // Aliases may expand into local commands or the guarded host/port login
  // shorthand, so the raw first token is not enough to decide availability.
}

function setConnectionBarCollapsed(collapsed, options = {}) {
  const next = Boolean(collapsed);
  state.connectionBarCollapsed = next;
  appRoot?.classList.toggle('connection-bar-collapsed', next);

  if (connectionBarToggle) {
    const label = next ? 'Show connection settings' : 'Hide connection settings';
    connectionBarToggle.textContent = next ? 'Connection' : 'Hide';
    connectionBarToggle.setAttribute('aria-expanded', String(!next));
    connectionBarToggle.setAttribute('aria-label', label);
    connectionBarToggle.title = label;
    if (options.focus) connectionBarToggle.focus({ preventScroll: true });
  }
}

function shouldRestoreCommandFocusAfterStatus() {
  const active = document.activeElement;
  return !active
    || active === document.body
    || active === commandInput
    || active === connectButton
    || active === reconnectButton
    || active === hostInput
    || active === portInput;
}

function setStatus(status, options = {}) {
  const current = status?.state || 'disconnected';
  const previous = statusBox.dataset.connectionState || 'disconnected';
  const previousConnected = previous === 'connected' || previous === 'connecting';
  statusBox.className = `status ${current}`;
  statusBox.dataset.connectionState = current;
  document.body.dataset.connectionState = current;
  setTextIfChanged(statusText, status?.message || current);
  state.connected = current === 'connected';
  connectButton.disabled = current === 'connecting' || state.connected;
  if (reconnectButton) reconnectButton.disabled = current === 'connecting';
  disconnectButton.disabled = !state.connected && current !== 'connecting';
  hostInput.disabled = state.connected || current === 'connecting';
  portInput.disabled = state.connected || current === 'connecting';
  updateCommandAvailability(current);

  const record = activeSessionRecord();
  if (current === 'connected' && previous !== 'connected') {
    if (record?.id) serverScreenReaderPreferenceBySession.delete(String(record.id));
    record?.readerSafety?.reset?.();
    resetSpeechMarkerState(record);
    setConnectionBarCollapsed(true);
  } else if (current === 'disconnected' || current === 'error') {
    resetSpeechMarkerState(record);
    setConnectionBarCollapsed(false);
  }

  if (record && options.updateRecord !== false) {
    record.status = { ...status };
    record.connected = state.connected;
    if (status?.host) record.host = String(status.host);
    if (Number(status?.port)) record.port = Number(status.port);
  }

  if (current !== 'connected' && (previousConnected || state.mapper.liveStateReady || state.mapper.liveSnapshot || state.mapper.lastRoomId)) {
    resetLiveMapperState({
      reason: current === 'connecting'
        ? 'connecting; waiting for fresh map data'
        : 'connection closed; live map state cleared',
      record,
      render: false
    });
  }

  if (options.soundEvent !== false) {
    if (current === 'connected' && previous !== 'connected') playClientSoundpackEvent('client.connected', 'client-connected');
    else if ((current === 'disconnected' || current === 'error') && previousConnected) playClientSoundpackEvent('client.disconnected', 'client-disconnected');
  }

  if (current === 'disconnected' && previousConnected && options.outputTransition !== false) {
    const host = String(status?.host || record?.host || hostInput.value || '').trim();
    const port = Number(status?.port || record?.port || portInput.value) || 4000;
    appendSystemMessage(host ? `Disconnected from ${host}:${port}.` : 'Disconnected from NukeFire.');
  }

  renderSessionTabs();
  renderContextDeck();
  renderMapper();
  if (state.connected && options.focus !== false && shouldRestoreCommandFocusAfterStatus()) {
    focusCommand({ preserveSelection: true });
  }
}

function appendSystemMessage(message, kind = 'info') {
  const record = activeSessionRecord();
  const runtimeManaged = record && typeof sessionRuntimeApi.appendSystem === 'function';
  const run = runtimeManaged
    ? sessionRuntimeApi.appendSystem(record, message, kind)
    : { text: `
[${message}]
`, style: null, kind: kind === 'error' ? 'error' : (kind === 'help' ? 'help' : 'system') };
  if (runtimeManaged) {
    state.lines = record.lines;
    state.plainText = record.plainText;
    state.readerCarry = record.readerCarry;
    state.lastCompleteLine = record.lastCompleteLine;
  } else {
    updatePlainText(run.text);
    updateReaderText(run.text);
    if (record) {
      record.lines = state.lines;
      record.plainText = state.plainText;
      record.readerCarry = state.readerCarry;
      record.lastCompleteLine = state.lastCompleteLine;
      record.outputRuns.push(run);
      record.outputCharacters = Number(record.outputCharacters || 0) + run.text.length;
    }
  }
  queueTerminalRuns([run], { follow: $('#follow-output').checked });
  addCommunicationMessage({
    channel: 'system',
    text: String(message || ''),
    timestamp: Date.now(),
    source: 'system'
  });
  if (kind === 'error') announce(`Error: ${message}`);
}

function updatePaginationState(text, options = {}) {
  const plain = (options.plainText ? String(text || '') : window.NukeFireAnsi.stripAnsi(String(text || ''))).replaceAll('\r', '');
  if (/(?:return|enter)\s+to\s+continue|--\s*more\s*--|\(q\)uit[^\n]*page\s+number|valid\s+commands\s+while\s+paging\s+are\s+return\b/iu.test(plain)) {
    state.paginationPending = true;
  }
}

function speechMarkerState(record = activeSessionRecord()) {
  if (!record) return null;
  if (!record.speechMarkers || typeof record.speechMarkers !== 'object') {
    record.speechMarkers = typeof speechMarkersApi.createState === 'function'
      ? speechMarkersApi.createState()
      : { pending: '', suppressed: false };
  }
  return record.speechMarkers;
}

function resetSpeechMarkerState(record = activeSessionRecord()) {
  if (!record) return;
  const markerState = speechMarkerState(record);
  if (typeof speechMarkersApi.reset === 'function') speechMarkersApi.reset(markerState);
  else {
    markerState.pending = '';
    markerState.suppressed = false;
  }
  speechSoundTriggers?.resetSession?.(record?.id || state.sessions.activeId || 'main');
}

function consumeSpeechMarkers(record, text) {
  const raw = String(text || '');
  const markerState = speechMarkerState(record);
  if (!markerState || typeof speechMarkersApi.consume !== 'function') {
    return { displayText: raw, speechText: raw, filtered: false };
  }
  return speechMarkersApi.consume(markerState, raw);
}

function transformSpeechText(text, record = activeSessionRecord()) {
  const raw = String(text || '');
  if (!raw) return '';
  const engines = sessionDisplayEngines(record);
  const plain = window.NukeFireAnsi.stripAnsi(raw);
  let runs = [{ text: plain, style: null, link: null }];
  if (typeof substituteApi.applySubstitutionsToRuns === 'function') {
    runs = substituteApi.applySubstitutionsToRuns(runs, engines.substitute);
  }
  return runs.map((run) => String(run?.text || '')).join('');
}

function writeFilteredSelfVoice(text, record = activeSessionRecord()) {
  const transformed = transformSpeechText(text, record);
  const routed = routeSpeechTriggerChunk(transformed, record);
  if (!state.accessibility.selfVoiceEnabled || !routed || !routed.trim()) return;
  selfVoice?.setSession?.(record?.id || state.sessions.activeId || 'main');
  selfVoice?.write?.(routed, selfVoiceLineOptions());
}

function transformDisplayRuns(runs, record = activeSessionRecord()) {
  const engines = sessionDisplayEngines(record);
  const hasSubstitutes = Boolean(engines.substitute?.hasEnabledDefinitions?.());
  const hasHighlights = Boolean(engines.highlight?.hasEnabledDefinitions?.());
  if (!hasSubstitutes && !hasHighlights) return runs;

  const debugEnabled = record?.pipelineDebug?.enabled === true;
  const sourceText = debugEnabled && hasSubstitutes
    ? runs.map((run) => String(run?.text || '')).join('')
    : '';
  const substituteMatches = debugEnabled && hasSubstitutes
    ? engines.substitute.findMatches(sourceText)
    : [];
  const substituted = hasSubstitutes && typeof substituteApi.applySubstitutionsToRuns === 'function'
    ? substituteApi.applySubstitutionsToRuns(runs, engines.substitute)
    : runs;
  if (substituteMatches.length > 0) {
    traceDisplayPipeline('substitute', () => `${substituteMatches.map((match) => match.pattern).join(', ')} matched: ${sourceText.trimEnd()}`);
  }

  const substitutedText = debugEnabled && hasHighlights
    ? substituted.map((run) => String(run?.text || '')).join('')
    : '';
  const highlightMatches = debugEnabled && hasHighlights
    ? engines.highlight.findMatches(substitutedText)
    : [];
  const highlighted = hasHighlights && typeof highlightApi.applyHighlightsToRuns === 'function'
    ? highlightApi.applyHighlightsToRuns(substituted, engines.highlight)
    : substituted;
  if (highlightMatches.length > 0) {
    traceDisplayPipeline('highlight', () => `${highlightMatches.map((match) => match.pattern).join(', ')} matched: ${substitutedText.trimEnd()}`);
  }
  return highlighted;
}

function appendMudTextChunk(text, options = {}) {
  const raw = String(text || '');
  const localDisplay = options.localDisplay === true;
  const shouldFollow = $('#follow-output').checked;
  const record = activeSessionRecord();
  const runtimeManaged = record && typeof sessionRuntimeApi.appendText === 'function';
  const runtimeResult = runtimeManaged
    ? sessionRuntimeApi.appendText(record, raw, {
        stripAnsi: window.NukeFireAnsi.stripAnsi,
        useTransformedPlainText: true,
        returnDetails: true,
        transformRuns: (runs) => transformDisplayRuns(runs, record)
      })
    : null;
  const runs = runtimeManaged
    ? runtimeResult.runs
    : transformDisplayRuns(ansi.parse(raw), record);
  const sourcePlain = runtimeManaged
    ? String(runtimeResult.sourcePlainText || '')
    : window.NukeFireAnsi.stripAnsi(raw);
  const displayPlain = runtimeManaged
    ? String(runtimeResult.plainText || '')
    : runs.map((run) => String(run?.text || '')).join('');
  if (!localDisplay) updatePaginationState(sourcePlain, { plainText: true });
  if (!localDisplay) routeSoundTriggerChunk(displayPlain, record);
  const selfVoicePlain = localDisplay || options.skipSpeechStream
    ? ''
    : routeSpeechTriggerChunk(displayPlain, record);
  if (!localDisplay && state.accessibility.selfVoiceEnabled && selfVoicePlain) {
    selfVoice?.setSession?.(record?.id || state.sessions.activeId || 'main');
    selfVoice?.write?.(selfVoicePlain, selfVoiceLineOptions());
  }

  if (runtimeManaged) {
    state.lines = record.lines;
    state.plainText = record.plainText;
    state.readerCarry = record.readerCarry;
    state.lastCompleteLine = record.lastCompleteLine;
  } else {
    updatePlainText(displayPlain);
    updateReaderText(displayPlain);
    if (record) {
      record.lines = state.lines;
      record.plainText = state.plainText;
      record.readerCarry = state.readerCarry;
      record.lastCompleteLine = state.lastCompleteLine;
      for (const run of runs) {
        record.outputRuns.push({
          text: run.text,
          style: run.style ? { ...run.style } : null,
          kind: 'mud',
          link: String(run.link || '') || null
        });
        record.outputCharacters = Number(record.outputCharacters || 0) + String(run.text || '').length;
      }
    }
  }
  if (!localDisplay) {
    captureCommunicationText(raw, sourcePlain);
    // Once Char.Vitals has established an authoritative GMCP source, avoid
    // running four fallback prompt regexes over every incoming text chunk.
    if (!state.gmcp?.char?.vitals) parseVitalsFromText(raw, sourcePlain);
  }
  queueTerminalRuns(runs, { follow: shouldFollow });
}

function highlightChunksForRecord(record, text) {
  const raw = String(text || '');
  const engines = sessionDisplayEngines(record);
  const enabled = Boolean(
    state.promptDisplayMode !== 'inline' ||
    engines.highlight?.hasEnabledDefinitions?.() || engines.substitute?.hasEnabledDefinitions?.()
  );
  if (!record?.highlightLines?.push) return raw ? [raw] : [];
  return record.highlightLines.push(raw, enabled);
}

function appendMudText(text, options = {}) {
  const monitorStartedAt = longSessionMonitor?.active ? performance.now() : 0;
  try {
  const record = activeSessionRecord();
  const localDisplay = options.localDisplay === true;
  const routed = localDisplay
    ? { displayText: String(text || ''), speechText: '', filtered: false }
    : consumeSpeechMarkers(record, text);

  if (!localDisplay && routed.filtered) {
    /* Do not leave marker-filtered display text in the line-highlighting carry:
     * a later prompt boundary must never feed that text back into Self-Voice.
     * Flush any older ordinary carry first, then drain this display segment with
     * its speech handled independently below. */
    flushActiveHighlightText();
    const quietOptions = { ...options, skipSpeechStream: true };
    for (const chunk of highlightChunksForRecord(record, routed.displayText)) {
      appendMudTextChunk(chunk, quietOptions);
    }
    flushActiveHighlightText(quietOptions);
    writeFilteredSelfVoice(routed.speechText, record);
    return;
  }

  for (const chunk of highlightChunksForRecord(record, routed.displayText)) {
    appendMudTextChunk(chunk, options);
  }
  } finally {
    if (monitorStartedAt) {
      longSessionMonitor.noteIncoming(String(text || '').length, performance.now() - monitorStartedAt);
    }
  }
}

function flushActiveHighlightText(options = {}) {
  const record = activeSessionRecord();
  const trailing = record?.highlightLines?.flush?.() || '';
  if (!trailing) return '';
  if (options.promptBoundary && promptShouldBeCaptured(record, trailing)) {
    captureDockedPrompt(record, trailing, options.promptBoundary, { active: true });
  } else {
    appendMudTextChunk(trailing, options);
  }
  return trailing;
}

function appendLocalText(text) {
  terminateCurrentOutputLine();
  appendMudText(text, { localDisplay: true });
}

function updatePlainText(text) {
  state.plainText += text;
  state.lines += (text.match(/\n/g) || []).length;
  if (state.plainText.length > state.maxCharacters) {
    const retain = Math.max(1, Math.floor(state.maxCharacters * HISTORY_LOW_WATER_RATIO));
    state.plainText = state.plainText.slice(-retain);
  }
}

function updateReaderText(text) {
  const normalized = String(text || '').replaceAll('\r', '');
  const parts = `${state.readerCarry}${normalized}`.split('\n');
  state.readerCarry = parts.pop() || '';

  for (const line of parts) {
    const readable = line.trimEnd();
    if (readable.trim()) state.lastCompleteLine = readable;
  }
}

function commitReaderBoundary() {
  const readable = state.readerCarry.trimEnd();
  if (readable.trim()) state.lastCompleteLine = readable;
  state.readerCarry = '';
}

function latestReadableLine() {
  const prompt = activeSessionRecord()?.dockedPrompt?.plainText;
  if (state.promptDisplayMode !== 'inline' && String(prompt || '').trim()) {
    return String(prompt).trim();
  }
  return state.readerCarry.trim() || state.lastCompleteLine.trim();
}

function isNearBottom() {
  const nearBottom = isXtermActive() ? xtermAdapter.isAtLiveBottom() : true;
  state.terminalRender.atLiveBottom = nearBottom;
  return nearBottom;
}

function snapOutputToBottom() {
  state.terminalRender.atLiveBottom = true;
  xtermAdapter?.scrollToBottom?.();
}

function terminateCurrentOutputLine() {
  const currentText = state.plainText;
  if (!currentText || currentText.endsWith('\n')) return false;

  const record = activeSessionRecord();
  if (record && typeof sessionRuntimeApi.terminateCurrentLine === 'function') {
    sessionRuntimeApi.terminateCurrentLine(record);
    state.lines = record.lines;
    state.plainText = record.plainText;
    state.readerCarry = record.readerCarry;
    state.lastCompleteLine = record.lastCompleteLine;
  } else {
    updatePlainText('\n');
    updateReaderText('\n');
  }
  queueTerminalRuns([{ text: '\n', style: null, kind: 'mud' }], { follow: true });
  flushTerminalOutput();
  return true;
}

function followOutput() {
  if ($('#follow-output').checked) snapOutputToBottom();
}

function focusCommand(options = {}) {
  if (!preferencesOverlay.hidden) {
    closePreferences({ focusTarget: commandInput });
    return;
  }
  commandInput.focus({ preventScroll: true });
  if (options.selectAll && commandInput.value && !state.remoteEcho) {
    commandInput.select();
  } else if (!options.preserveSelection) {
    commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
  }
}

function returnOutputToLive() {
  // Returning to live output must not force parsing/xterm work in front of
  // an outgoing command. Mark the next scheduled paint to follow, then move the
  // current viewport immediately.
  state.terminalRender.followRequested = true;
  snapOutputToBottom();
}

function handleTinTinReviewNavigationRequest(payload = {}) {
  const operation = String(payload?.operation || '').trim().toLowerCase();
  if (!isXtermActive()) return false;
  if (operation === 'end') {
    returnOutputToLive();
    return true;
  }
  if (operation === 'home') {
    state.terminalRender.atLiveBottom = false;
    xtermAdapter?.scrollToTop?.();
    return true;
  }
  if (operation === 'up' || operation === 'down') {
    state.terminalRender.atLiveBottom = false;
    xtermAdapter?.scrollPages?.(operation === 'up' ? -1 : 1);
    if (xtermAdapter?.isAtLiveBottom?.()) state.terminalRender.atLiveBottom = true;
    return true;
  }
  if (operation === 'lock') {
    if (xtermAdapter?.isAtLiveBottom?.()) {
      state.terminalRender.atLiveBottom = false;
      xtermAdapter?.scrollLines?.(-1);
    } else {
      returnOutputToLive();
    }
    return true;
  }
  return false;
}

function handleTinTinReviewFindRequest(payload = {}) {
  if (!isXtermActive()) return false;
  const text = String(payload?.text || '').replace(/\r?\n$/u, '');
  if (!text) return false;
  state.terminalRender.atLiveBottom = false;
  return Boolean(xtermAdapter?.findPrevious?.(text, {
    caseSensitive: true,
    wholeWord: false,
    regex: false,
    incremental: false
  }));
}

function sendCommandAndRefocus(rawCommand) {
  const pending = sendCommand(rawCommand);
  returnOutputToLive();
  scheduleFrame(() => {
    // A Quick Command may finish just as another control opens Preferences.
    // Never let this stale refocus close the newly opened dialog.
    if (preferencesOverlay.hidden) {
      focusCommand({ preserveSelection: true });
    }
  });
  return pending;
}

function focusOutput() {
  const target = isXtermActive() ? xtermOutput : retryTerminalButton || terminalRecovery;
  if (!preferencesOverlay.hidden) {
    closePreferences({ focusTarget: target });
    scheduleFrame(() => {
      if (isXtermActive()) xtermAdapter.focus();
      else target?.focus?.({ preventScroll: true });
    });
    return;
  }
  if (isXtermActive()) xtermAdapter.focus();
  else target?.focus?.({ preventScroll: true });
}

function handleTerminalPageNavigationKey(event) {
  if (!isXtermActive() || event.defaultPrevented) return false;
  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
  if (event.key !== 'PageUp' && event.key !== 'PageDown') return false;

  event.preventDefault();
  event.stopPropagation();
  state.terminalRender.atLiveBottom = false;
  xtermAdapter?.scrollPages?.(event.key === 'PageUp' ? -1 : 1);
  state.terminalRender.atLiveBottom = Boolean(xtermAdapter?.isAtLiveBottom?.());
  return true;
}


function refocusCommandAfterTerminalClick(event) {
  if (!terminalOutputHost || !terminalOutputHost.contains(event.target)) return;
  if (typeof event.button === 'number' && event.button !== 0) return;

  // xterm focuses its hidden textarea during native mouse handling. Reclaim
  // keyboard focus after every phase of the click has finished so typing goes
  // straight to NukeFire's command bar.
  const reclaimCommandFocus = () => {
    if (document.activeElement !== commandInput) focusCommand();
  };

  reclaimCommandFocus();
  if (typeof queueMicrotask === 'function') queueMicrotask(reclaimCommandFocus);
  scheduleFrame(reclaimCommandFocus);
  setTimeout(reclaimCommandFocus, 0);
}

function refocusCommandAfterTerminalContextMenu(event) {
  if (!terminalOutputHost || !terminalOutputHost.contains(event.target)) return;

  // On Windows, xterm's native right-click handling can leave focus in its
  // hidden textarea. Do not cancel the context menu or disturb xterm's
  // selection; reclaim command focus after the native event finishes.
  const reclaimCommandFocus = () => {
    if (document.activeElement !== commandInput) focusCommand({ preserveSelection: true });
  };

  if (typeof queueMicrotask === 'function') queueMicrotask(reclaimCommandFocus);
  scheduleFrame(reclaimCommandFocus);
  setTimeout(reclaimCommandFocus, 0);
}

function readLastLine() {
  const line = latestReadableLine();
  const message = line ? `Last line: ${line}` : 'No NukeFire output has been received yet.';
  setReaderWorkspaceReviewStatus(message);
  announce(message, { force: true });
}

function announceReaderReview(result) {
  if (!result?.text) {
    const message = 'No completed NukeFire output lines are available for reader review yet.';
    setReaderWorkspaceReviewStatus(message);
    announce(message, { force: true });
    return false;
  }
  state.lastReviewedText = String(result.text || '').trim();
  const status = `${result.text}. Reader line ${result.position} of ${result.count}.`;
  setReaderWorkspaceReviewStatus(status);
  announce(result.text, { force: true });
  return true;
}

function reviewCurrentLine() {
  const review = activeSessionRecord()?.readerReview;
  return announceReaderReview(review?.active ? review.current?.() : review?.latest?.());
}

function reviewPreviousLine() {
  return announceReaderReview(activeSessionRecord()?.readerReview?.previous?.());
}

function reviewNextLine() {
  return announceReaderReview(activeSessionRecord()?.readerReview?.next?.());
}

function reviewLatestLine() {
  return announceReaderReview(activeSessionRecord()?.readerReview?.latest?.());
}

function recallReaderLine(n = 1) {
  const result = activeSessionRecord()?.readerReview?.recall?.(n);
  if (!result?.text) {
    const message = `No reader line is available for rapid recall ${n}.`;
    setReaderWorkspaceReviewStatus(message);
    announce(message, { force: true });
    return false;
  }
  setReaderWorkspaceReviewStatus(`Reader recall ${n}: ${result.text}`);
  announce(result.text, { force: true });
  return true;
}

function activeReaderHistory() {
  return activeSessionRecord()?.readerHistory || null;
}

function readerHistoryCategoryMessage(status) {
  if (!status) return 'No Reader History category is available.';
  const count = Number(status.count) || 0;
  const unread = Number(status.unread) || 0;
  return `${status.label}. ${unread.toLocaleString()} new ${unread === 1 ? 'message' : 'messages'}. ${count.toLocaleString()} total.`;
}

function announceReaderHistoryCategory(status) {
  const message = readerHistoryCategoryMessage(status);
  setReaderWorkspaceReviewStatus(message);
  announce(message, { force: true, interrupt: true });
  return Boolean(status);
}

function announceReaderHistoryResult(result) {
  if (!result?.text) {
    const status = activeReaderHistory()?.categoryStatus?.();
    const label = status?.label || 'Reader History';
    const message = `No ${label} messages are available yet.`;
    setReaderWorkspaceReviewStatus(message);
    announce(message, { force: true, interrupt: true });
    return false;
  }
  state.lastReviewedText = String(result.text || '').trim();
  const status = `${result.text}. ${result.categoryLabel}, message ${result.position} of ${result.count}.`;
  setReaderWorkspaceReviewStatus(status);
  announce(result.text, { force: true, interrupt: true });
  return true;
}

function readerHistoryPreviousCategory() {
  const ok = announceReaderHistoryCategory(activeReaderHistory()?.selectNext?.(-1));
  if (ok) advanceReaderTutorialFor('category-previous');
  return ok;
}

function readerHistoryNextCategory() {
  const ok = announceReaderHistoryCategory(activeReaderHistory()?.selectNext?.(1));
  if (ok) advanceReaderTutorialFor('category-next');
  return ok;
}

function readerHistoryCurrent() {
  return announceReaderHistoryResult(activeReaderHistory()?.current?.());
}

function readerHistoryPrevious() {
  const ok = announceReaderHistoryResult(activeReaderHistory()?.previous?.());
  advanceReaderTutorialFor('history-previous');
  return ok;
}

function readerHistoryNext() {
  const ok = announceReaderHistoryResult(activeReaderHistory()?.next?.());
  advanceReaderTutorialFor('history-next');
  return ok;
}

function readerHistoryLatest() {
  const ok = announceReaderHistoryResult(activeReaderHistory()?.latest?.());
  advanceReaderTutorialFor('history-latest');
  return ok;
}

function readerHistoryCategoryStatus() {
  return announceReaderHistoryCategory(activeReaderHistory()?.categoryStatus?.());
}

function readerHistoryRepeat() {
  return announceReaderHistoryResult(activeReaderHistory()?.current?.());
}

function readerHistoryFirst() {
  return announceReaderHistoryResult(activeReaderHistory()?.oldest?.());
}

function readerHistoryMove(offset) {
  return announceReaderHistoryResult(activeReaderHistory()?.move?.(offset));
}

function readerHistoryRecall(n = 1) {
  return announceReaderHistoryResult(activeReaderHistory()?.recall?.(n));
}

function readerHistoryCommunicationCategory(channel) {
  const id = String(channel || '').trim().toLocaleLowerCase();
  return id ? `comm:${id}` : '';
}

function appendReaderHistoryCommunication(record, message) {
  const history = record?.readerHistory;
  const channel = String(message?.channel || '').trim().toLocaleLowerCase();
  if (!history || !channel || !message?.text) return false;
  return Boolean(history.append?.(readerHistoryCommunicationCategory(channel), message.text, {
    label: communicationChannelLabel(channel),
    speechPolicy: channel === 'tell' || channel === 'system' ? 'interrupt' : 'queue',
    timestamp: message.timestamp,
    source: `communication:${channel}`
  }));
}

function formatReaderRoomHistory(body = {}) {
  if (!body || typeof body !== 'object') return '';
  const name = String(body.name || body.room_name || '').trim();
  if (!name) return '';
  const exitsValue = body.exits && typeof body.exits === 'object' && !Array.isArray(body.exits)
    ? Object.keys(body.exits).filter((key) => body.exits[key] !== false && body.exits[key] !== null)
    : (Array.isArray(body.exits) ? body.exits : []);
  const exits = exitsValue.map((entry) => String(entry || '').trim()).filter(Boolean);
  return exits.length ? `${name}. Exits ${exits.join(', ')}.` : name;
}

function formatReaderCombatHistory(body = {}) {
  const out = body?.out || {};
  const incoming = body?.in || {};
  const parts = [];
  if (Number(out.hits) || Number(out.misses) || Number(out.damage) || Number(out.criticals) || Number(out.kills)) {
    parts.push(`Outgoing: ${Number(out.hits) || 0} hits, ${Number(out.misses) || 0} misses, ${(Number(out.damage) || 0).toLocaleString()} damage${Number(out.criticals) ? `, ${Number(out.criticals)} criticals` : ''}${Number(out.kills) ? `, ${Number(out.kills)} kills` : ''}`);
  }
  if (Number(incoming.hits) || Number(incoming.misses) || Number(incoming.damage) || Number(incoming.criticals) || Number(incoming.deaths)) {
    parts.push(`Incoming: ${Number(incoming.hits) || 0} hits, ${Number(incoming.misses) || 0} misses, ${(Number(incoming.damage) || 0).toLocaleString()} damage${Number(incoming.criticals) ? `, ${Number(incoming.criticals)} criticals` : ''}${Number(incoming.deaths) ? `, ${Number(incoming.deaths)} deaths` : ''}`);
  }
  return parts.join('. ');
}

function appendReaderHistoryGmcp(record, packageName, body) {
  const history = record?.readerHistory;
  if (!history) return false;
  if (packageName === 'Room.Info') {
    const text = formatReaderRoomHistory(body);
    return text ? Boolean(history.append?.('rooms', text, { label: 'Rooms', speechPolicy: 'replace', source: 'gmcp:room' })) : false;
  }
  if (packageName === 'NukeFire.Combat' && body && typeof body === 'object') {
    const summary = formatReaderCombatHistory(body);
    if (summary) history.append?.('combat', summary, { label: 'Combat', speechPolicy: 'queue', source: 'gmcp:combat' });
    const outgoing = Number(body?.out?.damage) || 0;
    const incoming = Number(body?.in?.damage) || 0;
    if (outgoing || incoming) {
      const damage = `Outgoing damage ${outgoing.toLocaleString()}; incoming damage ${incoming.toLocaleString()}.`;
      history.append?.('damage', damage, { label: 'Damage', speechPolicy: 'interrupt', source: 'gmcp:combat' });
    }
    return Boolean(summary || outgoing || incoming);
  }
  return false;
}

function describeVital(label, current, maximum) {
  if (!Number.isFinite(current)) return `${label} unknown`;
  if (!Number.isFinite(maximum)) return `${label} ${current.toLocaleString()}`;
  return `${label} ${current.toLocaleString()} of ${maximum.toLocaleString()}`;
}

function vitalSpeechText(label, current, maximum) {
  if (typeof combatVitalsApi.formatVitalSpeech === 'function') {
    return combatVitalsApi.formatVitalSpeech(label, current, maximum, {
      mode: state.accessibility.vitalSpeechMode
    }).replace(/\.\s*$/u, '');
  }
  return describeVital(label, current, maximum);
}

function vitalsSummary() {
  const parts = [
    vitalSpeechText('Health', state.vitals.hp, state.vitals.maxHp),
    vitalSpeechText('Mana', state.vitals.mana, state.vitals.maxMana),
    vitalSpeechText('Movement', state.vitals.move, state.vitals.maxMove)
  ];

  const opponent = currentCombatOpponent();
  if (opponent?.name) {
    parts.push(`Opponent ${opponent.name}, ${vitalSpeechText('health', opponent.hp, opponent.maxHp)}`);
  }

  const group = groupCombatState();
  const visibleMembers = groupMembersForVitalsDisplay(group);
  if (visibleMembers.length > 0) {
    parts.push(`Group: ${visibleMembers.map((member) => {
      const location = member.here === false ? ', away' : '';
      const target = member.opponent?.name ? `, fighting ${member.opponent.name}` : '';
      return `${member.name}, ${vitalSpeechText('health', member.hp, member.maxHp)}${location}${target}`;
    }).join('; ')}`);
  }

  return parts.join('. ');
}

function readVitals() {
  announce(vitalsSummary(), { force: true });
}

function singleVitalSummary(kindValue) {
  const kind = String(kindValue || '').trim().toLowerCase();
  const records = {
    health: ['Health', state.vitals.hp, state.vitals.maxHp],
    mana: ['Mana', state.vitals.mana, state.vitals.maxMana],
    movement: ['Movement', state.vitals.move, state.vitals.maxMove]
  };
  const record = records[kind];
  if (!record) return 'Vital unknown.';
  if (typeof combatVitalsApi.formatVitalSpeech === 'function') {
    return combatVitalsApi.formatVitalSpeech(record[0], record[1], record[2], {
      mode: state.accessibility.vitalSpeechMode
    });
  }
  const current = record[1] === null || record[1] === undefined || record[1] === '' ? NaN : Number(record[1]);
  const maximum = record[2] === null || record[2] === undefined || record[2] === '' ? NaN : Number(record[2]);
  if (!Number.isFinite(current)) return `${record[0]} unknown.`;
  if (Number.isFinite(maximum) && maximum > 0) {
    const percent = Math.max(0, Math.min(100, current / maximum * 100));
    return `${record[0]} ${Math.floor(percent)} percent.`;
  }
  return `${record[0]} ${current.toLocaleString()}.`;
}

function readSingleVital(kind) {
  announce(singleVitalSummary(kind), { force: true });
}

function setVitalSpeechMode(value, options = {}) {
  const normalize = typeof combatVitalsApi.normalizeVitalSpeechMode === 'function'
    ? combatVitalsApi.normalizeVitalSpeechMode
    : (input) => ['percent-values', 'percent', 'values'].includes(String(input || '').trim().toLowerCase())
      ? String(input).trim().toLowerCase()
      : 'percent-values';
  const mode = normalize(value, 'percent-values');
  state.accessibility.vitalSpeechMode = mode;
  const select = $('#vital-speech-mode');
  if (select) select.value = mode;
  if (options.persist !== false) {
    localStorage.setItem('nukefire.vitalSpeechMode', mode);
    schedulePersistentSettingsSave();
  }
  if (options.announceChange) {
    const label = mode === 'percent'
      ? 'percent only'
      : mode === 'values'
        ? 'current and maximum values only'
        : 'percent, then current and maximum values';
    announce(`Instant vital speech format: ${label}.`, { force: true });
  }
  return mode;
}

function audioCueStatusText() {
  const available = audioCueAvailable() ? 'available' : 'unavailable';
  const enabled = state.accessibility.audioCuesEnabled ? 'on' : 'off';
  const muted = state.accessibility.audioCuesMuted ? 'muted' : 'unmuted';
  const foreground = state.accessibility.audioCuesForegroundOnly ? 'foreground only' : 'allowed in background';
  const pack = String(audioCues?.soundpackName || 'Built-in NukeFire');
  return `Audio Cues ${enabled}, ${muted}, ${foreground}, volume ${Math.round(state.accessibility.audioCuesVolume * 100)} percent, soundpack ${pack}, Web Audio ${available}.`;
}

function audioCueAvailable() {
  return Boolean(audioCues?.available);
}

function updateSoundpackControls(message = '') {
  const select = $('#soundpack-select');
  const status = $('#soundpack-status');
  if (select) {
    const selected = select.value;
    select.replaceChildren();
    const builtIn = document.createElement('option');
    builtIn.value = 'builtin';
    builtIn.textContent = 'Built-in NukeFire';
    select.append(builtIn);
    for (const pack of state.accessibility.soundpacks || []) {
      const option = document.createElement('option');
      option.value = String(pack.id || '');
      option.textContent = `${pack.name} — ${pack.author}`;
      select.append(option);
    }
    const wanted = selected || state.accessibility.soundpackId || 'builtin';
    select.value = [...select.options].some((option) => option.value === wanted) ? wanted : 'builtin';
  }
  if (status && message) status.textContent = message;
}

async function refreshSoundpacks(options = {}) {
  if (typeof window.nukefire.listSoundpacks !== 'function') return [];
  try {
    const result = await window.nukefire.listSoundpacks();
    state.accessibility.soundpacks = Array.isArray(result?.packs) ? result.packs : [];
    state.accessibility.soundpackInvalid = Array.isArray(result?.invalid) ? result.invalid : [];
    const invalidSuffix = state.accessibility.soundpackInvalid.length
      ? ` ${state.accessibility.soundpackInvalid.length} invalid soundpack file${state.accessibility.soundpackInvalid.length === 1 ? '' : 's'} skipped.`
      : '';
    updateSoundpackControls(`${options.message || 'Installed soundpacks refreshed.'}${invalidSuffix}`);
  } catch (error) {
    updateSoundpackControls(`Soundpacks could not be listed: ${error?.message || error}`);
  }
  return state.accessibility.soundpacks;
}

async function activateSoundpack(id, options = {}) {
  const requested = String(id || 'builtin').trim().toLowerCase() || 'builtin';
  if (typeof window.nukefire.loadSoundpack !== 'function') return false;
  const commandDraft = commandInput.value;
  const selectionStart = commandInput.selectionStart;
  const selectionEnd = commandInput.selectionEnd;
  const selectionDirection = commandInput.selectionDirection;
  try {
    const result = await window.nukefire.loadSoundpack(requested);
    if (!result?.ok) throw new Error(result?.error || 'Soundpack could not be loaded.');
    const count = Number(audioCues?.setSoundpack?.(result.pack, result.assets || {})) || 0;
    state.accessibility.soundpackId = String(result.pack?.id || 'builtin');
    localStorage.setItem('nukefire.soundpackId', state.accessibility.soundpackId);
    const select = $('#soundpack-select');
    if (select) select.value = state.accessibility.soundpackId;
    const name = String(result.pack?.name || 'Built-in NukeFire');
    const message = state.accessibility.soundpackId === 'builtin'
      ? 'Built-in NukeFire soundpack active.'
      : `${name} soundpack active with ${count} custom sound${count === 1 ? '' : 's'}; missing sounds use built-in cues.`;
    updateSoundpackControls(message);
    updateAudioCueControls();
    if (options.announceChange) announce(message, { force: true });
    return true;
  } catch (error) {
    const message = `Soundpack was not changed: ${error?.message || error}`;
    updateSoundpackControls(message);
    if (options.announceChange) announce(message, { force: true });
    return false;
  } finally {
    commandInput.value = commandDraft;
    if (Number.isInteger(selectionStart) && Number.isInteger(selectionEnd)) {
      commandInput.setSelectionRange(selectionStart, selectionEnd, selectionDirection || 'none');
    }
  }
}

async function importSoundpack(options = {}) {
  if (typeof window.nukefire.importSoundpack !== 'function') {
    const unavailable = { ok: false, canceled: false, message: 'Soundpack import is unavailable.' };
    return options.detailed ? unavailable : false;
  }
  const result = await window.nukefire.importSoundpack();
  if (result?.canceled) {
    const canceled = { ok: false, canceled: true, message: 'Soundpack import canceled; the active soundpack was not changed.' };
    return options.detailed ? canceled : false;
  }
  if (!result?.ok) {
    const message = `Soundpack import failed: ${result?.error || 'invalid soundpack archive'}.`;
    updateSoundpackControls(message);
    if (options.announceChange !== false) announce(message, { force: true });
    const failed = { ok: false, canceled: false, message };
    return options.detailed ? failed : false;
  }
  await refreshSoundpacks({ message: `${result.pack.name} imported.` });
  const activated = await activateSoundpack(result.pack.id, { announceChange: options.announceChange !== false });
  const message = activated
    ? `${result.pack.name} soundpack imported and activated.`
    : `${result.pack.name} soundpack imported, but it could not be activated.`;
  const imported = { ok: activated, canceled: false, message };
  return options.detailed ? imported : activated;
}

async function withCommandDraftPreserved(operation) {
  const draft = commandInput.value;
  const start = commandInput.selectionStart;
  const end = commandInput.selectionEnd;
  const direction = commandInput.selectionDirection;
  try { return await operation(); }
  finally {
    commandInput.value = draft;
    if (Number.isInteger(start) && Number.isInteger(end)) commandInput.setSelectionRange(start, end, direction || 'none');
  }
}

function soundpackEditorStatus(message) {
  const status = $('#soundpack-editor-event-status');
  if (status) status.textContent = String(message || '');
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
    if (!event || event.length > 80 || !/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/u.test(event) || seen.has(event)) continue;
    seen.add(event);
    result.push(event);
    if (result.length >= 64) break;
  }
  return result;
}

function setSoundpackDisabledEvents(value, options = {}) {
  state.accessibility.soundpackDisabledEvents = normalizeSoundpackDisabledEvents(value);
  if (options.persist !== false) {
    localStorage.setItem('nukefire.soundpackDisabledEvents', JSON.stringify(state.accessibility.soundpackDisabledEvents));
    schedulePersistentSettingsSave();
  }
  if (options.announceChange) {
    const count = state.accessibility.soundpackDisabledEvents.length;
    announce(`${count} soundpack event${count === 1 ? '' : 's'} disabled.`, { force: true });
  }
  return [...state.accessibility.soundpackDisabledEvents];
}

function soundpackEventRecord(eventValue) {
  const event = String(eventValue || '').trim().toLowerCase();
  return state.accessibility.soundpackEvents.find((record) => String(record?.event || '').toLowerCase() === event) || null;
}

function soundpackEventEnabled(eventValue) {
  const event = String(eventValue || '').trim().toLowerCase();
  return Boolean(event) && !state.accessibility.soundpackDisabledEvents.includes(event);
}

function setSoundpackEventEnabled(eventValue, enabled, options = {}) {
  const event = String(eventValue || '').trim().toLowerCase();
  if (!event || (state.accessibility.soundpackEvents.length && !soundpackEventRecord(event))) return null;
  const disabled = new Set(state.accessibility.soundpackDisabledEvents);
  if (enabled) disabled.delete(event);
  else disabled.add(event);
  setSoundpackDisabledEvents([...disabled], { persist: options.persist !== false, announceChange: false });
  const control = $('#soundpack-editor-enabled');
  if (control && $('#soundpack-editor-event')?.value === event) control.checked = Boolean(enabled);
  if (options.announceChange) announce(`${event} sound ${enabled ? 'enabled' : 'disabled'}.`, { force: true, interrupt: true });
  return Boolean(enabled);
}

function soundpackEventForCue(cueIdValue) {
  const cueId = String(cueIdValue || '').trim().toLowerCase();
  return state.accessibility.soundpackEvents.find((record) => String(record?.cue || '').toLowerCase() === cueId)?.event || '';
}

function soundpackCueEnabled(cueId) {
  const event = soundpackEventForCue(cueId);
  return !event || soundpackEventEnabled(event);
}

function soundpackEventSourceLabel(record) {
  if (!record) return 'unknown source';
  if (record.status === 'not-emitted') return 'reserved, not currently emitted';
  if (record.source === 'server') return 'server event';
  if (record.source === 'derived') return 'derived game state';
  if (record.source === 'communications') return 'communications';
  if (record.source === 'client') return 'client state';
  return String(record.source || 'unknown source');
}

async function loadSoundpackEventCatalog() {
  if (typeof document === 'undefined') return [];
  if (typeof window.nukefire.getSoundpackEvents !== 'function') return [];
  const result = await window.nukefire.getSoundpackEvents();
  if (typeof document === 'undefined') return [];
  state.accessibility.soundpackEvents = Array.isArray(result?.events) ? result.events : [];
  const select = $('#soundpack-editor-event');
  if (select) {
    const selected = select.value;
    select.replaceChildren();
    for (const record of state.accessibility.soundpackEvents) {
      const option = document.createElement('option');
      option.value = String(record.event || '');
      option.textContent = `${record.event}${record.status === 'not-emitted' ? ' — reserved' : ''}`;
      select.append(option);
    }
    if (selected && [...select.options].some((option) => option.value === selected)) select.value = selected;
  }
  return state.accessibility.soundpackEvents;
}

async function inspectSoundpackEditorEvent() {
  if (typeof document === 'undefined') return false;
  const id = $('#soundpack-select')?.value || 'builtin';
  const event = $('#soundpack-editor-event')?.value || '';
  if (!event || typeof window.nukefire.describeSoundpack !== 'function') return false;
  const result = await window.nukefire.describeSoundpack(id);
  const options = result?.pack?.events?.[event];
  const record = soundpackEventRecord(event);
  const enabled = soundpackEventEnabled(event);
  const enabledControl = $('#soundpack-editor-enabled');
  if (enabledControl) enabledControl.checked = enabled;
  const source = soundpackEventSourceLabel(record);
  if (options) {
    $('#soundpack-editor-volume').value = String(Math.round((Number(options.volume) || 0) * 100));
    $('#soundpack-editor-cooldown').value = String(Number(options.cooldown_ms) || 0);
    soundpackEditorStatus(`${event} is ${enabled ? 'enabled' : 'disabled'}; ${source}; ${options.files?.length || 1} custom sound; volume ${Math.round((Number(options.volume) || 0) * 100)} percent; cooldown ${Number(options.cooldown_ms) || 0} milliseconds.`);
  } else {
    $('#soundpack-editor-volume').value = '100';
    $('#soundpack-editor-cooldown').value = '0';
    soundpackEditorStatus(`${event} is ${enabled ? 'enabled' : 'disabled'}; ${source}; built-in fallback in ${result?.pack?.name || 'this pack'}.`);
  }
  return true;
}

async function duplicateSelectedSoundpack() {
  const sourceId = $('#soundpack-select')?.value || 'builtin';
  const id = String($('#soundpack-editor-id')?.value || '').trim().toLowerCase();
  const name = String($('#soundpack-editor-name')?.value || '').trim();
  const author = String($('#soundpack-editor-author')?.value || '').trim();
  if (typeof window.nukefire.duplicateSoundpack !== 'function') return false;
  const result = await withCommandDraftPreserved(() => window.nukefire.duplicateSoundpack({ sourceId, id, name, author }));
  const message = result?.ok ? `${result.pack.name} created from ${sourceId}.` : `Soundpack was not duplicated: ${result?.error || 'invalid request'}.`;
  soundpackEditorStatus(message);
  if (result?.ok) {
    await refreshSoundpacks({ message });
    await activateSoundpack(result.pack.id, { announceChange: false });
  }
  announce(message, { force: true });
  return result?.ok === true;
}

async function assignSelectedSoundpackEvent() {
  const id = $('#soundpack-select')?.value || 'builtin';
  const event = $('#soundpack-editor-event')?.value || '';
  if (id === 'builtin') { soundpackEditorStatus('Duplicate Built-in NukeFire before assigning custom sounds.'); return false; }
  const volume = Number($('#soundpack-editor-volume')?.value || 100) / 100;
  const cooldown_ms = Number($('#soundpack-editor-cooldown')?.value || 0);
  const result = await withCommandDraftPreserved(() => window.nukefire.assignSoundpackEvent({ id, event, volume, cooldown_ms }));
  if (result?.canceled) { soundpackEditorStatus('Audio assignment canceled; the soundpack was not changed.'); return false; }
  const message = result?.ok ? `${event} audio assigned in ${result.pack.name}.` : `Audio was not assigned: ${result?.error || 'invalid request'}.`;
  soundpackEditorStatus(message);
  if (result?.ok) await activateSoundpack(id, { announceChange: false });
  announce(message, { force: true });
  return result?.ok === true;
}

async function updateSelectedSoundpackEvent(clear = false) {
  const id = $('#soundpack-select')?.value || 'builtin';
  const event = $('#soundpack-editor-event')?.value || '';
  if (id === 'builtin') { soundpackEditorStatus('Built-in NukeFire cannot be edited. Duplicate it first.'); return false; }
  const operation = clear
    ? () => window.nukefire.clearSoundpackEvent({ id, event })
    : () => window.nukefire.updateSoundpackEvent({ id, event, volume: Number($('#soundpack-editor-volume')?.value || 100) / 100, cooldown_ms: Number($('#soundpack-editor-cooldown')?.value || 0) });
  const result = await withCommandDraftPreserved(operation);
  const message = result?.ok ? `${event} ${clear ? 'restored to built-in fallback' : 'options saved'}.` : `Soundpack was not changed: ${result?.error || 'invalid request'}.`;
  soundpackEditorStatus(message);
  if (result?.ok) await activateSoundpack(id, { announceChange: false });
  announce(message, { force: true });
  return result?.ok === true;
}

async function exportSelectedSoundpack() {
  const id = $('#soundpack-select')?.value || 'builtin';
  if (id === 'builtin') { soundpackEditorStatus('Duplicate Built-in NukeFire before exporting a custom pack.'); return false; }
  const result = await withCommandDraftPreserved(() => window.nukefire.exportSoundpack(id));
  const message = result?.canceled ? 'Soundpack export canceled.' : (result?.ok ? `${id} exported.` : `Soundpack export failed: ${result?.error || 'invalid request'}.`);
  soundpackEditorStatus(message);
  announce(message, { force: true });
  return result?.ok === true;
}

function updateAudioCueControls() {
  const enabled = $('#audio-cues-enabled');
  const muted = $('#audio-cues-muted');
  const foregroundOnly = $('#audio-cues-foreground-only');
  const volume = $('#audio-cues-volume');
  const volumeValue = $('#audio-cues-volume-value');
  const status = $('#audio-cues-status');
  if (enabled) enabled.checked = state.accessibility.audioCuesEnabled;
  if (muted) muted.checked = state.accessibility.audioCuesMuted;
  if (foregroundOnly) foregroundOnly.checked = state.accessibility.audioCuesForegroundOnly;
  if (volume) volume.value = String(state.accessibility.audioCuesVolume);
  if (volumeValue) volumeValue.textContent = `${Math.round(state.accessibility.audioCuesVolume * 100)}%`;
  if (status) {
    const available = audioCueAvailable() ? 'available' : 'unavailable';
    const enabledText = state.accessibility.audioCuesEnabled ? 'on' : 'off';
    const muteText = state.accessibility.audioCuesMuted ? 'muted' : 'unmuted';
    const focusText = state.accessibility.audioCuesForegroundOnly
      ? (state.accessibility.selfVoiceAppForeground ? 'foreground active' : 'background suppressed')
      : 'background allowed';
    status.textContent = `Audio Cues ${enabledText}; ${muteText}; ${focusText}; ${Math.round(state.accessibility.audioCuesVolume * 100)} percent volume; Web Audio ${available}.`;
  }
}

function syncAudioCueForegroundState() {
  const active = !state.accessibility.audioCuesForegroundOnly || state.accessibility.selfVoiceAppForeground;
  audioCues?.setForeground?.(active);
  updateAudioCueControls();
  return active;
}

function setAudioCuesEnabled(enabled, options = {}) {
  const requested = Boolean(enabled);
  if (requested && !audioCueAvailable()) {
    state.accessibility.audioCuesEnabled = false;
    audioCues?.setEnabled?.(false);
    updateAudioCueControls();
    if (options.persist !== false) {
      localStorage.setItem('nukefire.audioCuesEnabled', 'false');
      schedulePersistentSettingsSave();
    }
    if (options.announceChange !== false) announce('NukeFire Audio Cues are unavailable on this system.', { force: true });
    return false;
  }
  state.accessibility.audioCuesEnabled = requested;
  audioCues?.setVolume?.(state.accessibility.audioCuesVolume);
  audioCues?.setMuted?.(state.accessibility.audioCuesMuted);
  syncAudioCueForegroundState();
  audioCues?.setEnabled?.(requested);
  if (requested && options.unlock === true) audioCues?.unlock?.();
  updateAudioCueControls();
  if (options.persist !== false) {
    localStorage.setItem('nukefire.audioCuesEnabled', String(requested));
    schedulePersistentSettingsSave();
  }
  if (options.announceChange !== false) announce(`Audio Cues ${requested ? 'enabled' : 'disabled'}.`, { force: true });
  return requested;
}

function setAudioCuesMuted(muted, options = {}) {
  state.accessibility.audioCuesMuted = Boolean(muted);
  audioCues?.setMuted?.(state.accessibility.audioCuesMuted);
  updateAudioCueControls();
  if (options.persist !== false) {
    localStorage.setItem('nukefire.audioCuesMuted', String(state.accessibility.audioCuesMuted));
    schedulePersistentSettingsSave();
  }
  if (options.announceChange !== false) announce(`Audio Cues ${state.accessibility.audioCuesMuted ? 'muted' : 'unmuted'}.`, { force: true });
  return state.accessibility.audioCuesMuted;
}

function setAudioCuesForegroundOnly(enabled, options = {}) {
  state.accessibility.audioCuesForegroundOnly = Boolean(enabled);
  syncAudioCueForegroundState();
  if (options.persist !== false) {
    localStorage.setItem('nukefire.audioCuesForegroundOnly', String(state.accessibility.audioCuesForegroundOnly));
    schedulePersistentSettingsSave();
  }
  if (options.announceChange !== false) announce(`Foreground-only Audio Cues ${state.accessibility.audioCuesForegroundOnly ? 'enabled' : 'disabled'}.`, { force: true });
  return state.accessibility.audioCuesForegroundOnly;
}

function setAudioCuesVolume(value, options = {}) {
  const fallback = Number(audioCueApi.DEFAULT_AUDIO_CUE_VOLUME) || 0.65;
  const numeric = value === null || value === undefined || value === '' ? Number.NaN : Number(value);
  state.accessibility.audioCuesVolume = Number.isFinite(numeric)
    ? Math.min(1, Math.max(0, numeric))
    : fallback;
  audioCues?.setVolume?.(state.accessibility.audioCuesVolume);
  updateAudioCueControls();
  if (options.persist !== false) {
    localStorage.setItem('nukefire.audioCuesVolume', String(state.accessibility.audioCuesVolume));
    schedulePersistentSettingsSave();
  }
  if (options.announceChange) announce(`Audio Cue volume ${Math.round(state.accessibility.audioCuesVolume * 100)} percent.`, { force: true });
  return state.accessibility.audioCuesVolume;
}

function stopAudioCues() {
  audioCues?.stopAll?.();
  return true;
}

function unlockAudioCuesFromUserGesture() {
  if (state.accessibility.audioCuesEnabled) audioCues?.unlock?.();
}

function testAudioCue(cueId = 'hit') {
  if (!state.accessibility.audioCuesEnabled) {
    announce('Enable Audio Cues before testing them.', { force: true });
    return false;
  }
  if (state.accessibility.audioCuesMuted) {
    announce('Audio Cues are muted. Unmute them before testing.', { force: true });
    return false;
  }
  if (state.accessibility.audioCuesForegroundOnly && !state.accessibility.selfVoiceAppForeground) {
    return false;
  }
  const played = Boolean(audioCues?.play?.(cueId));
  if (!played) announce('That Audio Cue could not be played.', { force: true });
  return played;
}

function playSemanticAudioCue(cueId) {
  if (!cueId || !soundpackCueEnabled(cueId) || !state.accessibility.audioCuesEnabled || state.accessibility.audioCuesMuted) return false;
  if (state.accessibility.audioCuesForegroundOnly && !state.accessibility.selfVoiceAppForeground) return false;
  return Boolean(audioCues?.play?.(cueId));
}

function playClientSoundpackEvent(event, cueId) {
  if (!soundpackEventEnabled(event) || !state.accessibility.audioCuesEnabled || state.accessibility.audioCuesMuted) return false;
  if (state.accessibility.audioCuesForegroundOnly && !state.accessibility.selfVoiceAppForeground) return false;
  return Boolean(audioCues?.play?.(cueId));
}

const COMMUNICATION_CUE_CHANNELS = Object.freeze(['tell', 'auction', 'gossip', 'skynet', 'ssf']);
const COMMUNICATION_CUE_DEDUPE_WINDOW_MS = 1200;
const recentCommunicationCueAt = new Map();

function normalizeCommunicationCueChannel(value) {
  const channel = String(value || '').trim().toLocaleLowerCase();
  return COMMUNICATION_CUE_CHANNELS.includes(channel) ? channel : '';
}

function communicationCueStatusText() {
  const cues = state.accessibility.communicationCues || {};
  const master = state.accessibility.audioCuesEnabled
    ? (state.accessibility.audioCuesMuted ? 'Audio Cues master on and muted' : 'Audio Cues master on')
    : 'Audio Cues master off';
  return `Communication sounds: Tell ${cues.tell ? 'on' : 'off'}, Auction ${cues.auction ? 'on' : 'off'}, Gossip ${cues.gossip ? 'on' : 'off'}, Skynet ${cues.skynet ? 'on' : 'off'}, SSF ${cues.ssf ? 'on' : 'off'}; ` +
    `background ${cues.background ? 'on' : 'off'}; ${master}.`;
}

function updateCommunicationCueControls() {
  const cues = state.accessibility.communicationCues || {};
  const controls = {
    tell: $('#communication-cue-tell'),
    auction: $('#communication-cue-auction'),
    gossip: $('#communication-cue-gossip'),
    skynet: $('#communication-cue-skynet'),
    ssf: $('#communication-cue-ssf'),
    background: $('#communication-cues-background')
  };
  for (const [key, control] of Object.entries(controls)) if (control) control.checked = cues[key] === true;
  const status = $('#communication-cues-status');
  if (status) status.textContent = communicationCueStatusText();
}

function persistCommunicationCueSettings() {
  const cues = state.accessibility.communicationCues || {};
  localStorage.setItem('nukefire.communicationCueTell', String(cues.tell === true));
  localStorage.setItem('nukefire.communicationCueAuction', String(cues.auction === true));
  localStorage.setItem('nukefire.communicationCueGossip', String(cues.gossip === true));
  localStorage.setItem('nukefire.communicationCueSkynet', String(cues.skynet === true));
  localStorage.setItem('nukefire.communicationCueSsf', String(cues.ssf === true));
  localStorage.setItem('nukefire.communicationCuesBackground', String(cues.background === true));
  schedulePersistentSettingsSave();
}

function applyCommunicationCueSettings(input = {}, options = {}) {
  const source = input && typeof input === 'object' ? input : {};
  state.accessibility.communicationCues = {
    tell: source.tell === true,
    auction: source.auction === true,
    gossip: source.gossip === true,
    skynet: source.skynet === true,
    ssf: source.ssf === true,
    background: source.background === true
  };
  updateCommunicationCueControls();
  if (options.persist !== false) persistCommunicationCueSettings();
  if (options.announceChange) announce(communicationCueStatusText(), { force: true, interrupt: true });
  return { ...state.accessibility.communicationCues };
}

function setCommunicationCueChannel(channelValue, enabled, options = {}) {
  const channel = normalizeCommunicationCueChannel(channelValue);
  if (!channel) return false;
  const next = { ...(state.accessibility.communicationCues || {}), [channel]: Boolean(enabled) };
  applyCommunicationCueSettings(next, options);
  if (options.announceChange !== false) {
    announce(`${communicationChannelLabel(channel)} sound ${next[channel] ? 'enabled' : 'disabled'}.`, { force: true });
  }
  return next[channel];
}

function setCommunicationCuesBackground(enabled, options = {}) {
  const next = { ...(state.accessibility.communicationCues || {}), background: Boolean(enabled) };
  applyCommunicationCueSettings(next, options);
  if (options.announceChange !== false) {
    announce(`Background communication sounds ${next.background ? 'enabled' : 'disabled'}.`, { force: true });
  }
  return next.background;
}

function resetCommunicationCues(options = {}) {
  applyCommunicationCueSettings({ tell: false, auction: false, gossip: false, skynet: false, ssf: false, background: false }, options);
  if (options.announceChange !== false) announce('Communication sounds reset to off.', { force: true });
  return true;
}

function testCommunicationCue(channelValue) {
  const channel = normalizeCommunicationCueChannel(channelValue);
  if (!channel) return false;
  if (!state.accessibility.audioCuesEnabled) {
    announce('Enable Audio Cues before testing communication sounds.', { force: true });
    return false;
  }
  if (state.accessibility.audioCuesMuted) {
    announce('Audio Cues are muted. Unmute them before testing communication sounds.', { force: true });
    return false;
  }
  const allowBackground = state.accessibility.communicationCues?.background === true;
  if (!allowBackground && state.accessibility.audioCuesForegroundOnly && !state.accessibility.selfVoiceAppForeground) return false;
  const played = Boolean(audioCues?.play?.(channel, { allowBackground }));
  if (!played) announce('That communication sound could not be played.', { force: true });
  return played;
}

function playCommunicationAudioCue(record, message) {
  const channel = normalizeCommunicationCueChannel(message?.channel);
  const cues = state.accessibility.communicationCues || {};
  if (!channel || cues[channel] !== true || !soundpackEventEnabled(`communication.${channel}`) || !state.accessibility.audioCuesEnabled || state.accessibility.audioCuesMuted) return false;
  const allowBackground = cues.background === true;
  if (!allowBackground && state.accessibility.audioCuesForegroundOnly && !state.accessibility.selfVoiceAppForeground) return false;

  const text = String(message?.text || '').trim().toLocaleLowerCase();
  if (!text) return false;
  const signature = `${channel}|${text}`;
  const now = Date.now();
  const previous = recentCommunicationCueAt.get(signature);
  if (Number.isFinite(previous) && now - previous < COMMUNICATION_CUE_DEDUPE_WINDOW_MS) return false;
  recentCommunicationCueAt.set(signature, now);
  if (recentCommunicationCueAt.size > 64) {
    for (const [key, timestamp] of recentCommunicationCueAt) {
      if (now - timestamp > COMMUNICATION_CUE_DEDUPE_WINDOW_MS * 2) recentCommunicationCueAt.delete(key);
    }
    while (recentCommunicationCueAt.size > 64) recentCommunicationCueAt.delete(recentCommunicationCueAt.keys().next().value);
  }
  return Boolean(audioCues?.play?.(channel, { allowBackground }));
}

function soundTriggerSnapshot() {
  if (typeof soundTriggers?.snapshot === 'function') return soundTriggers.snapshot();
  return { enabled: true, definitions: [] };
}

function soundTriggerCueLabel(cueId) {
  const value = String(cueId || '').trim().toLowerCase();
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : 'Unknown';
}

function updateSoundTriggerStatus(message = '') {
  const status = $('#sound-trigger-status');
  if (!status) return;
  if (message) {
    status.textContent = message;
    return;
  }
  const snapshot = soundTriggerSnapshot();
  const count = snapshot.definitions.length;
  status.textContent = `${count.toLocaleString()} Sound Trigger${count === 1 ? '' : 's'} configured; ${snapshot.enabled ? 'enabled' : 'disabled'}.`;
}

function renderSoundTriggers(message = '') {
  const snapshot = soundTriggerSnapshot();
  const enabled = $('#sound-triggers-enabled');
  const list = $('#sound-trigger-list');
  const empty = $('#sound-trigger-empty');
  if (enabled) enabled.checked = snapshot.enabled !== false;
  if (list) {
    list.replaceChildren();
    for (const record of snapshot.definitions) {
      const row = document.createElement('div');
      row.setAttribute('role', 'listitem');
      row.dataset.soundTriggerId = record.id;
      const description = document.createElement('span');
      description.textContent = `${record.pattern} — ${soundTriggerCueLabel(record.cueId)} — ${record.cooldownMs} ms cooldown${record.suppressSelfVoice ? ' — Self-Voice suppressed' : ''}${record.enabled === false ? ' — disabled' : ''}`;
      row.append(description);
      const actions = document.createElement('div');
      actions.className = 'preferences-actions';
      const test = document.createElement('button');
      test.type = 'button';
      test.textContent = 'Test';
      test.dataset.soundTriggerTestId = record.id;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.textContent = record.enabled === false ? 'Enable' : 'Disable';
      toggle.dataset.soundTriggerToggleId = record.id;
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'Edit';
      edit.dataset.soundTriggerEditId = record.id;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Delete';
      remove.dataset.soundTriggerDeleteId = record.id;
      actions.append(test, toggle, edit, remove);
      row.append(actions);
      list.append(row);
    }
  }
  if (empty) empty.hidden = snapshot.definitions.length > 0;
  updateSoundTriggerStatus(message);
}

function resetSoundTriggerEditor() {
  state.soundTriggerEditor = { open: false, editId: '' };
  const form = $('#sound-trigger-form');
  if (form) form.hidden = true;
}

function newSoundTriggerId() {
  const used = new Set(soundTriggerSnapshot().definitions.map((record) => record.id));
  const base = `sound-trigger-${Date.now().toString(36)}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function openSoundTriggerEditor(record = null) {
  const form = $('#sound-trigger-form');
  const heading = $('#sound-trigger-editor-heading');
  if (!form) return false;
  const current = record && typeof record === 'object' ? record : null;
  state.soundTriggerEditor = { open: true, editId: String(current?.id || '') };
  if (heading) heading.textContent = current ? 'Edit Sound Trigger' : 'Add Sound Trigger';
  $('#sound-trigger-pattern').value = String(current?.pattern || '');
  $('#sound-trigger-cue').value = String(current?.cueId || 'hit');
  $('#sound-trigger-cooldown').value = String(current?.cooldownMs ?? (Number(soundTriggerApi.DEFAULT_COOLDOWN_MS) || 100));
  $('#sound-trigger-suppress-self-voice').checked = current?.suppressSelfVoice === true;
  $('#sound-trigger-editor-enabled').checked = current?.enabled !== false;
  form.hidden = false;
  $('#sound-trigger-pattern').focus({ preventScroll: true });
  return true;
}

function replaceSoundTriggerDefinitions(definitions, options = {}) {
  const snapshot = soundTriggerSnapshot();
  soundTriggers?.restore?.({ enabled: snapshot.enabled, definitions });
  speechSoundTriggers?.restore?.({ enabled: snapshot.enabled, definitions });
  renderSoundTriggers(options.message || '');
  if (options.persist !== false) schedulePersistentSettingsSave();
  return soundTriggerSnapshot();
}

function saveSoundTriggerFromEditor(event) {
  event?.preventDefault?.();
  if (!state.soundTriggerEditor.open) return false;
  const id = state.soundTriggerEditor.editId || newSoundTriggerId();
  const candidate = typeof soundTriggerApi.normalizeSoundTrigger === 'function'
    ? soundTriggerApi.normalizeSoundTrigger({
        id,
        pattern: $('#sound-trigger-pattern').value,
        cueId: $('#sound-trigger-cue').value,
        cooldownMs: $('#sound-trigger-cooldown').value,
        suppressSelfVoice: $('#sound-trigger-suppress-self-voice').checked,
        enabled: $('#sound-trigger-editor-enabled').checked
      })
    : null;
  if (!candidate) {
    updateSoundTriggerStatus('Enter a valid pattern and choose a built-in Audio Cue.');
    $('#sound-trigger-pattern').focus({ preventScroll: true });
    return false;
  }
  const snapshot = soundTriggerSnapshot();
  const duplicate = snapshot.definitions.find((record) => record.pattern === candidate.pattern && record.id !== id);
  if (duplicate) {
    updateSoundTriggerStatus('That Sound Trigger pattern already exists. Edit the existing trigger instead.');
    $('#sound-trigger-pattern').focus({ preventScroll: true });
    return false;
  }
  const definitions = snapshot.definitions.filter((record) => record.id !== id);
  const previousIndex = snapshot.definitions.findIndex((record) => record.id === id);
  if (previousIndex >= 0) definitions.splice(previousIndex, 0, candidate);
  else definitions.push(candidate);
  replaceSoundTriggerDefinitions(definitions, {
    message: `${previousIndex >= 0 ? 'Updated' : 'Added'} Sound Trigger: ${candidate.pattern}`
  });
  resetSoundTriggerEditor();
  return true;
}

function setSoundTriggersEnabled(enabled, options = {}) {
  const value = soundTriggers?.setEnabled?.(enabled) ?? Boolean(enabled);
  speechSoundTriggers?.setEnabled?.(value);
  renderSoundTriggers();
  if (options.persist !== false) schedulePersistentSettingsSave();
  if (options.announceChange !== false) announce(`Sound Triggers ${value ? 'enabled' : 'disabled'}.`, { force: true });
  return value;
}

function handleSoundTriggerListClick(event) {
  const button = event.target?.closest?.('button');
  if (!button) return;
  const snapshot = soundTriggerSnapshot();
  const testId = String(button.dataset.soundTriggerTestId || '');
  const toggleId = String(button.dataset.soundTriggerToggleId || '');
  const editId = String(button.dataset.soundTriggerEditId || '');
  const deleteId = String(button.dataset.soundTriggerDeleteId || '');
  const id = testId || toggleId || editId || deleteId;
  const record = snapshot.definitions.find((item) => item.id === id);
  if (!record) return;
  if (testId) {
    testAudioCue(record.cueId);
    return;
  }
  if (editId) {
    openSoundTriggerEditor(record);
    return;
  }
  if (deleteId) {
    replaceSoundTriggerDefinitions(snapshot.definitions.filter((item) => item.id !== id), {
      message: `Deleted Sound Trigger: ${record.pattern}`
    });
    if (state.soundTriggerEditor.editId === id) resetSoundTriggerEditor();
    return;
  }
  if (toggleId) {
    replaceSoundTriggerDefinitions(snapshot.definitions.map((item) => item.id === id
      ? { ...item, enabled: item.enabled === false }
      : item), {
      message: `${record.enabled === false ? 'Enabled' : 'Disabled'} Sound Trigger: ${record.pattern}`
    });
  }
}

function soundTriggerPlayCue(cueId) {
  return Boolean(audioCues?.play?.(cueId));
}

function routeSoundTriggerChunk(text, record = activeSessionRecord()) {
  if (typeof soundTriggers?.processChunk !== 'function') return String(text || '');
  if (typeof soundTriggers.hasEnabledDefinitions === 'function' && !soundTriggers.hasEnabledDefinitions()) {
    return String(text || '');
  }
  const sessionId = record?.id || state.sessions.activeId || 'main';
  const routed = soundTriggers.processChunk(sessionId, text, { playCue: soundTriggerPlayCue });
  return String(routed?.speechText || '');
}

function routeSpeechTriggerChunk(text, record = activeSessionRecord()) {
  // The speech-side trigger engine exists only to prepare complete linewise
  // Self-Voice input and apply optional speech suppression. When Self-Voice is
  // off there is no consumer, so do not line-buffer every terminal character.
  if (!state.accessibility.selfVoiceEnabled) return '';
  if (typeof speechSoundTriggers?.processChunk !== 'function') return String(text || '');
  const sessionId = record?.id || state.sessions.activeId || 'main';
  const routed = speechSoundTriggers.processChunk(sessionId, text);
  return String(routed?.speechText || '');
}

function selfVoiceLineOptions() {
  return {
    isPriorityLine: (line) => {
      if (!state.accessibility.selfVoicePriorityAlertsEnabled) return false;
      const classified = typeof communicationsApi.classifyLine === 'function'
        ? communicationsApi.classifyLine(line)
        : null;
      return classified?.channel === 'tell' || classified?.channel === 'system';
    }
  };
}

function commitSoundTriggerBoundary(record = activeSessionRecord()) {
  if (typeof soundTriggers?.commitBoundary !== 'function') return null;
  const sessionId = record?.id || state.sessions.activeId || 'main';
  return soundTriggers.commitBoundary(sessionId, { playCue: soundTriggerPlayCue });
}

function commitSpeechTriggerBoundary(record = activeSessionRecord()) {
  if (typeof speechSoundTriggers?.commitBoundary !== 'function') return null;
  const sessionId = record?.id || state.sessions.activeId || 'main';
  return speechSoundTriggers.commitBoundary(sessionId);
}

function selfVoiceAvailable() {
  return Boolean(selfVoice?.available?.());
}

function stopSelfVoiceNow() {
  selfVoice?.stop?.();
  return true;
}

function updateSelfVoiceMuteControls() {
  const muted = state.accessibility.selfVoiceMuted;
  const checkbox = $('#self-voice-muted');
  if (checkbox) checkbox.checked = muted;
  for (const selector of ['#self-voice-toggle-mute', '#reader-workspace-toggle-self-voice-mute']) {
    const button = $(selector);
    if (button) button.textContent = muted ? 'Unmute Self-Voice' : 'Mute Self-Voice';
  }
}

function setSelfVoiceMuted(muted, options = {}) {
  const requested = Boolean(muted);
  const wasMuted = state.accessibility.selfVoiceMuted;
  let muteAnnouncementSpoken = false;
  state.accessibility.selfVoiceMuted = requested;
  if (requested && !wasMuted && state.accessibility.selfVoiceEnabled && options.announceChange !== false) {
    muteAnnouncementSpoken = selfVoice?.muteWithAnnouncement?.('NukeFire self-voice muted.') === true;
    if (!muteAnnouncementSpoken) selfVoice?.setMuted?.(true);
  } else {
    selfVoice?.setMuted?.(requested);
  }
  updateSelfVoiceMuteControls();
  if (options.persist !== false) {
    localStorage.setItem('nukefire.selfVoiceMuted', String(state.accessibility.selfVoiceMuted));
    schedulePersistentSettingsSave();
  }
  renderReaderWorkspaceStatus();
  if (options.announceChange !== false) {
    if (!requested) announce('NukeFire self-voice unmuted.', { force: true });
    else if (!muteAnnouncementSpoken) announce('NukeFire self-voice muted.', { force: true });
  }
  return state.accessibility.selfVoiceMuted;
}

function syncSelfVoiceForegroundState() {
  const speechForeground = !state.accessibility.selfVoiceForegroundOnly || state.accessibility.selfVoiceAppForeground;
  selfVoice?.setForeground?.(speechForeground);
  renderReaderWorkspaceStatus();
  return speechForeground;
}

function setSelfVoiceAppForeground(foreground) {
  state.accessibility.selfVoiceAppForeground = Boolean(foreground);
  const speechForeground = syncSelfVoiceForegroundState();
  syncAudioCueForegroundState();
  return speechForeground;
}

function setSelfVoiceForegroundOnly(enabled, options = {}) {
  state.accessibility.selfVoiceForegroundOnly = Boolean(enabled);
  const checkbox = $('#self-voice-foreground-only');
  if (checkbox) checkbox.checked = state.accessibility.selfVoiceForegroundOnly;
  syncSelfVoiceForegroundState();
  if (options.persist !== false) {
    localStorage.setItem('nukefire.selfVoiceForegroundOnly', String(state.accessibility.selfVoiceForegroundOnly));
    schedulePersistentSettingsSave();
  }
  if (options.announceChange !== false) {
    announce(`Foreground-only self-voice ${state.accessibility.selfVoiceForegroundOnly ? 'enabled' : 'disabled'}.`, { force: true });
  }
  return state.accessibility.selfVoiceForegroundOnly;
}

function selfVoiceVoiceId(voice) {
  if (!voice) return '';
  return String(voice.voiceURI || `${voice.name || ''}|${voice.lang || ''}`).trim();
}

function availableSelfVoiceVoices() {
  try {
    const voices = window.speechSynthesis?.getVoices?.();
    return Array.isArray(voices) ? voices : [];
  } catch (_error) {
    return [];
  }
}

function refreshSelfVoiceVoiceOptions() {
  const voices = availableSelfVoiceVoices().slice().sort((left, right) => {
    const a = `${left?.lang || ''} ${left?.name || ''}`.toLowerCase();
    const b = `${right?.lang || ''} ${right?.name || ''}`.toLowerCase();
    return a.localeCompare(b);
  });
  const selectedId = String(state.accessibility.selfVoiceVoiceId || '');
  const selectedVoice = voices.find((voice) => selfVoiceVoiceId(voice) === selectedId) || null;
  selfVoice?.setVoice?.(selectedVoice);

  const select = $('#self-voice-voice');
  if (!select) return selectedVoice;
  select.replaceChildren();
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'System Default';
  select.append(defaultOption);
  for (const voice of voices) {
    const option = document.createElement('option');
    option.value = selfVoiceVoiceId(voice);
    option.textContent = `${voice.name || 'Unnamed voice'}${voice.lang ? ` — ${voice.lang}` : ''}${voice.default ? ' — default' : ''}`;
    select.append(option);
  }
  select.value = selectedVoice ? selectedId : '';
  return selectedVoice;
}

function updateSelfVoiceVoiceControls() {
  const rate = Number(state.accessibility.selfVoiceRate);
  const pitch = Number(state.accessibility.selfVoicePitch);
  const volume = Number(state.accessibility.selfVoiceVolume);
  if ($('#self-voice-rate')) $('#self-voice-rate').value = String(rate);
  if ($('#self-voice-pitch')) $('#self-voice-pitch').value = String(pitch);
  if ($('#self-voice-volume')) $('#self-voice-volume').value = String(volume);
  if ($('#self-voice-rate-value')) $('#self-voice-rate-value').textContent = `${rate.toFixed(1)}×`;
  if ($('#self-voice-pitch-value')) $('#self-voice-pitch-value').textContent = pitch.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  if ($('#self-voice-volume-value')) $('#self-voice-volume-value').textContent = `${Math.round(volume * 100)}%`;
  refreshSelfVoiceVoiceOptions();
}

function setSelfVoiceVoiceSettings(input = {}, options = {}) {
  const normalize = typeof selfVoiceApi.normalizeVoiceSettings === 'function'
    ? selfVoiceApi.normalizeVoiceSettings
    : (value) => ({
        rate: Number(value.rate) || 1,
        pitch: Number(value.pitch) || 1,
        volume: Number.isFinite(Number(value.volume)) ? Number(value.volume) : 1,
        voiceId: String(value.voiceId || '')
      });
  const next = normalize({
    rate: input.rate ?? state.accessibility.selfVoiceRate,
    pitch: input.pitch ?? state.accessibility.selfVoicePitch,
    volume: input.volume ?? state.accessibility.selfVoiceVolume,
    voiceId: input.voiceId ?? state.accessibility.selfVoiceVoiceId
  });
  state.accessibility.selfVoiceRate = next.rate;
  state.accessibility.selfVoicePitch = next.pitch;
  state.accessibility.selfVoiceVolume = next.volume;
  state.accessibility.selfVoiceVoiceId = next.voiceId;
  selfVoice?.setVoiceSettings?.(next);
  updateSelfVoiceVoiceControls();
  if (options.persist !== false) {
    localStorage.setItem('nukefire.selfVoiceRate', String(next.rate));
    localStorage.setItem('nukefire.selfVoicePitch', String(next.pitch));
    localStorage.setItem('nukefire.selfVoiceVolume', String(next.volume));
    localStorage.setItem('nukefire.selfVoiceVoiceId', next.voiceId);
    schedulePersistentSettingsSave();
  }
  renderReaderWorkspaceStatus();
  if (options.announceChange) announce(`Self-voice settings updated. Speed ${next.rate.toFixed(1)} times.`, { force: true });
  return next;
}

function interruptSelfVoiceForMovement() {
  if (!state.accessibility.selfVoiceEnabled || !state.accessibility.selfVoiceFollowMode) return false;
  return Boolean(selfVoice?.interrupt?.());
}

function setSelfVoiceGovernorEnabled(enabled, options = {}) {
  state.accessibility.selfVoiceGovernorEnabled = Boolean(enabled);
  selfVoice?.setGovernorEnabled?.(state.accessibility.selfVoiceGovernorEnabled);
  const checkbox = $('#self-voice-governor-enabled');
  if (checkbox) checkbox.checked = state.accessibility.selfVoiceGovernorEnabled;
  if (options.persist !== false) {
    localStorage.setItem('nukefire.selfVoiceGovernorEnabled', String(state.accessibility.selfVoiceGovernorEnabled));
    schedulePersistentSettingsSave();
  }
  renderReaderWorkspaceStatus();
  if (options.announceChange !== false) {
    announce(`Self-voice backlog condensation ${state.accessibility.selfVoiceGovernorEnabled ? 'enabled' : 'disabled'}.`, { force: true });
  }
  return state.accessibility.selfVoiceGovernorEnabled;
}

function setSelfVoicePriorityAlertsEnabled(enabled, options = {}) {
  state.accessibility.selfVoicePriorityAlertsEnabled = Boolean(enabled);
  const checkbox = $('#self-voice-priority-alerts-enabled');
  if (checkbox) checkbox.checked = state.accessibility.selfVoicePriorityAlertsEnabled;
  if (options.persist !== false) {
    localStorage.setItem('nukefire.selfVoicePriorityAlertsEnabled', String(state.accessibility.selfVoicePriorityAlertsEnabled));
    schedulePersistentSettingsSave();
  }
  renderReaderWorkspaceStatus();
  if (options.announceChange !== false) {
    announce(`Priority self-voice alerts ${state.accessibility.selfVoicePriorityAlertsEnabled ? 'enabled' : 'disabled'}.`, { force: true });
  }
  return state.accessibility.selfVoicePriorityAlertsEnabled;
}

function setSelfVoiceFollowMode(enabled, options = {}) {
  state.accessibility.selfVoiceFollowMode = Boolean(enabled);
  const checkbox = $('#self-voice-follow-mode');
  if (checkbox) checkbox.checked = state.accessibility.selfVoiceFollowMode;
  if (options.persist !== false) {
    localStorage.setItem('nukefire.selfVoiceFollowMode', String(state.accessibility.selfVoiceFollowMode));
    schedulePersistentSettingsSave();
  }
  renderReaderWorkspaceStatus();
  if (options.announceChange !== false) {
    announce(`Follow self-voice ${state.accessibility.selfVoiceFollowMode ? 'enabled' : 'disabled'}.`, { force: true });
  }
  return state.accessibility.selfVoiceFollowMode;
}

function setSelfVoiceInterruptOnCommand(enabled, options = {}) {
  state.accessibility.selfVoiceInterruptOnCommand = Boolean(enabled);
  const checkbox = $('#self-voice-interrupt-on-command');
  if (checkbox) checkbox.checked = state.accessibility.selfVoiceInterruptOnCommand;
  if (options.persist !== false) {
    localStorage.setItem('nukefire.selfVoiceInterruptOnCommand', String(state.accessibility.selfVoiceInterruptOnCommand));
    schedulePersistentSettingsSave();
  }
  renderReaderWorkspaceStatus();
  if (options.announceChange !== false) {
    announce(`Command-send self-voice interruption ${state.accessibility.selfVoiceInterruptOnCommand ? 'enabled' : 'disabled'}.`, { force: true });
  }
  return state.accessibility.selfVoiceInterruptOnCommand;
}

function testSelfVoice() {
  if (!state.accessibility.selfVoiceEnabled) {
    announce('Enable NukeFire self-voice before testing it.', { force: true });
    return false;
  }
  if (state.accessibility.selfVoiceMuted) {
    announce('NukeFire self-voice is muted. Unmute it before testing.', { force: true });
    return false;
  }
  return Boolean(selfVoice?.speak?.('NukeFire self-voice is working.', { interrupt: true }));
}

function setSelfVoiceEnabled(enabled, options = {}) {
  const requested = Boolean(enabled);
  const checkbox = $('#self-voice-enabled');
  if (requested && !selfVoiceAvailable()) {
    state.accessibility.selfVoiceEnabled = false;
    selfVoice?.setEnabled?.(false);
    if (checkbox) checkbox.checked = false;
    if (options.persist !== false) {
      localStorage.setItem('nukefire.selfVoiceEnabled', 'false');
      schedulePersistentSettingsSave();
    }
    if (options.announceChange !== false) {
      announce('NukeFire self-voice is unavailable on this system.', { force: true });
    }
    return false;
  }

  /*
   * Prove the Self-Voice controller accepted the requested state before
   * disabling the native-reader path.  A failed backend transition must never
   * strand a reader with both speech paths turned off.
   */
  selfVoice?.setSession?.(state.sessions.activeId || 'main');
  selfVoice?.setGovernorEnabled?.(state.accessibility.selfVoiceGovernorEnabled);
  selfVoice?.setVoiceSettings?.({ rate: state.accessibility.selfVoiceRate, pitch: state.accessibility.selfVoicePitch, volume: state.accessibility.selfVoiceVolume, voiceId: state.accessibility.selfVoiceVoiceId });
  refreshSelfVoiceVoiceOptions();
  selfVoice?.setMuted?.(state.accessibility.selfVoiceMuted);
  selfVoice?.setForeground?.(!state.accessibility.selfVoiceForegroundOnly || state.accessibility.selfVoiceAppForeground);
  const applied = selfVoice?.setEnabled?.(requested);
  if (requested && applied !== true) {
    state.accessibility.selfVoiceEnabled = false;
    if (checkbox) checkbox.checked = false;
    if (options.persist !== false) {
      localStorage.setItem('nukefire.selfVoiceEnabled', 'false');
      schedulePersistentSettingsSave();
    }
    renderReaderWorkspaceStatus();
    if (options.announceChange !== false) {
      announce('NukeFire self-voice could not start. The native reader setting was preserved.', { force: true, interrupt: true });
    }
    return false;
  }

  if (requested && state.accessibility.screenReaderMode) {
    state.accessibility.screenReaderMode = false;
    document.body.classList.remove('screen-reader-mode');
    xtermAdapter?.setScreenReaderMode?.(false);
    $('#screen-reader-mode').checked = false;
    localStorage.setItem('nukefire.screenReaderMode', 'false');
    void window.nukefire.setClientPreferences?.({ screenReaderMode: false });
  }

  state.accessibility.selfVoiceEnabled = requested;
  if (!requested) speechSoundTriggers?.clearRuntime?.();
  if (checkbox) checkbox.checked = requested;
  if (options.persist !== false) {
    localStorage.setItem('nukefire.selfVoiceEnabled', String(requested));
    schedulePersistentSettingsSave();
  }

  renderReaderWorkspaceStatus();
  if (options.announceChange !== false) {
    if (requested) selfVoice?.speak?.('NukeFire self-voice enabled.', { interrupt: true });
    else announce('NukeFire self-voice disabled.', { force: true });
  }
  return true;
}



function markReaderOnboardingSeen() {
  state.readerOnboarding.seen = true;
  localStorage.setItem('nukefire.readerOnboardingSeen', 'true');
}

function markReaderTutorialCompleted() {
  state.readerOnboarding.tutorialCompleted = true;
  localStorage.setItem('nukefire.readerTutorialCompleted', 'true');
}

function ensureReaderAccessibilityBindingsQuietly() {
  if (typeof readerPresetsApi.installReaderHotkeyPreset !== 'function') return false;
  const hotkeyPresetId = String(readerPresetsApi.READER_HOTKEY_PRESET_ID || 'reader-accessibility');
  const linePresetId = String(readerPresetsApi.READER_LINE_RECALL_PRESET_ID || 'reader-line-recall');
  let next = state.keybindings;
  let changed = false;

  if (!(next.bindings || []).some((record) => record.preset === hotkeyPresetId)) {
    const hotkeys = readerPresetsApi.installReaderHotkeyPreset(next, keybindingApi);
    next = hotkeys.settings;
    changed = true;
  }

  if (typeof readerPresetsApi.installReaderLineRecallPreset === 'function') {
    const before = JSON.stringify(next);
    const lines = readerPresetsApi.installReaderLineRecallPreset(next, keybindingApi);
    next = lines.settings;
    if (JSON.stringify(next) !== before ||
        !(next.bindings || []).some((record) => record.preset === linePresetId)) {
      changed = true;
    }
  }

  if (changed) updateKeybindings(next, { persist: true });
  return true;
}

function appendClientReaderHistory(message, options = {}) {
  const text = String(message || '').trim();
  const history = activeReaderHistory();
  if (!text || !history?.append) return false;
  return Boolean(history.append('client-reader', text, {
    label: 'Client Reader',
    speechPolicy: 'quiet',
    source: String(options.source || 'client-reader').slice(0, 80),
    markRead: options.markRead !== false
  }));
}

function readerTutorialSpeak(text, options = {}) {
  const message = String(text || '').trim();
  if (!message) return false;
  appendClientReaderHistory(message, { source: 'client-reader:tutorial' });
  setReaderWorkspaceReviewStatus(message);
  const status = $('#reader-setup-status');
  if (status) status.textContent = message;
  if (state.accessibility.selfVoiceEnabled && !state.accessibility.selfVoiceMuted && selfVoice?.speak?.(message, { interrupt: options.interrupt === true })) {
    return true;
  }
  announce(message, { force: true, interrupt: options.interrupt === true });
  return true;
}

function startReaderTutorial(options = {}) {
  if (!readerTutorial) return false;
  markReaderOnboardingSeen();
  ensureReaderAccessibilityBindingsQuietly();
  setReaderSafetyAlertsEnabled(true, { announceChange: false });
  setReaderWorkspaceEnabled(true, { announceChange: false, focus: true });
  if (!state.accessibility.screenReaderMode && !state.accessibility.selfVoiceEnabled) {
    setScreenReaderMode(true, { announceChange: false });
  }
  const mode = state.accessibility.selfVoiceEnabled ? 'live' : 'native';
  const track = String(options.track || 'essentials').trim().toLowerCase() === 'audio' ? 'audio' : 'essentials';
  const step = readerTutorial.start({ mode, track });
  const label = track === 'audio' ? 'Audio and filtering tutorial' : 'Reader tutorial';
  readerTutorialSpeak(`${label} started. ${step?.text || ''} Type C R tutorial stop at any time.`, { interrupt: true });
  return true;
}

function readerTutorialCommand(actionValue = 'start') {
  if (!readerTutorial) return 'Reader tutorial is unavailable.';
  const action = String(actionValue || 'start').trim().toLowerCase();
  if (!action || action === 'start' || action === 'on' || action === 'essentials') {
    startReaderTutorial({ track: 'essentials' });
    return 'Reader tutorial started. Follow the spoken instruction; the command line remains active.';
  }
  if (action === 'audio' || action === 'filtering' || action === 'mush') {
    startReaderTutorial({ track: 'audio' });
    return 'Audio and filtering tutorial started. It explains the NukeFire replacements for common MUSHclient and Mudlet speech, sound, filtering, and review jobs.';
  }
  if (action === 'status') {
    const status = readerTutorial.status();
    return status.active
      ? `${status.track === 'audio' ? 'Audio and filtering tutorial' : 'Reader tutorial'} active at step ${status.step} of ${status.count}. ${readerTutorial.current()?.text || ''}`
      : `Reader tutorial not running. ${state.readerOnboarding.tutorialCompleted ? 'It has been completed before.' : 'It has not been completed yet.'}`;
  }
  if (action === 'repeat') {
    const step = readerTutorial.repeat();
    if (!step) return 'Reader tutorial is not running. Use CR TUTORIAL to start it.';
    readerTutorialSpeak(step.text, { interrupt: true });
    return `Reader tutorial repeated step ${step.index + 1} of ${step.count}.`;
  }
  if (action === 'next') {
    const step = readerTutorial.next();
    if (!step) return 'Reader tutorial is not running. Use CR TUTORIAL to start it.';
    if (step.completed) markReaderTutorialCompleted();
    readerTutorialSpeak(step.text, { interrupt: true });
    return step.completed ? 'Reader tutorial completed.' : `Reader tutorial advanced to step ${step.index + 1} of ${step.count}.`;
  }
  if (action === 'back' || action === 'previous') {
    const step = readerTutorial.back();
    if (!step) return 'Reader tutorial is not running. Use CR TUTORIAL to start it.';
    readerTutorialSpeak(step.text, { interrupt: true });
    return `Reader tutorial moved back to step ${step.index + 1} of ${step.count}.`;
  }
  if (action === 'stop' || action === 'off') {
    const result = readerTutorial.stop();
    readerTutorialSpeak(result.text, { interrupt: true });
    return result.text;
  }
  return 'Reader tutorial expects start, audio, status, repeat, next, back, or stop.';
}

function advanceReaderTutorialFor(action) {
  if (!readerTutorial?.status?.().active) return false;
  const result = readerTutorial.accept(action);
  if (!result?.matched) return false;
  const next = result.step;
  if (result.completed) markReaderTutorialCompleted();
  setTimeout(() => {
    if (next?.text) readerTutorialSpeak(next.text, { interrupt: false });
  }, 180);
  return true;
}

function readerUnreadText() {
  const history = activeReaderHistory();
  if (!history) return 'Reader unread summary unavailable for this session.';
  const categories = history.availableCategories?.({ includeEmpty: false }) || [];
  const unread = categories
    .map((category) => history.categoryStatus?.(category.id))
    .filter((status) => Number(status?.unread) > 0);
  if (!unread.length) return 'Reader unread summary. No unread Reader History categories.';
  const total = unread.reduce((sum, status) => sum + (Number(status.unread) || 0), 0);
  const details = unread.map((status) => `${status.label} ${status.unread}`).join('; ');
  return `Reader unread summary. ${total} new messages across ${unread.length} categories. ${details}. Use Alt plus Up or Down Arrow to change categories, then F10 for the latest message.`;
}

function readerContextText() {
  const active = activeSessionRecord();
  const history = activeReaderHistory()?.categoryStatus?.();
  const serverReader = serverScreenReaderPreferenceBySession.get(String(state.sessions.activeId || 'main'));
  const speech = state.accessibility.selfVoiceEnabled
    ? `NukeFire Voice ${state.accessibility.selfVoiceMuted ? 'muted' : 'active'}`
    : (state.accessibility.screenReaderMode ? 'native screen reader active' : 'no live reader speech path selected');
  const historyText = history
    ? `${history.label} selected, ${history.unread} new, ${history.count} total`
    : 'Reader History unavailable';
  return `Reader context. ${active ? `Session ${sessionLabel(active)}, ${active.status?.state || 'unknown'}` : 'No active session'}; ` +
    `server screen reader ${serverReader === true ? 'on' : serverReader === false ? 'off' : 'unknown'}; Reader Workspace ${state.accessibility.readerWorkspaceEnabled ? 'on' : 'off'}; ` +
    `${speech}; ${historyText}; realtime safety alerts ${state.accessibility.readerSafetyAlertsEnabled ? 'on' : 'off'}.`;
}

function bindingLabelForSemantic(type, id) {
  const record = (state.keybindings.bindings || []).find((binding) =>
    binding.enabled !== false && String(binding.semantic?.type || '').toLowerCase() === type &&
    String(binding.semantic?.id || '').toLowerCase() === id);
  if (!record) return '';
  if (typeof keybindingApi.friendlyKeyLabel === 'function') return keybindingApi.friendlyKeyLabel(record.code, record.modifiers);
  return record.label || record.code || '';
}

function readerKeysText() {
  if (state.keybindings.enabled === false) return 'Reader keys are currently disabled. Open Preferences, Keyboard, or use CR KEYS LINES, MOVEMENT, or MUSH to install official shortcuts.';
  const items = [
    ['Latest', 'reader-history', 'latest'],
    ['Previous message', 'reader-history', 'previous'],
    ['Next message', 'reader-history', 'next'],
    ['Previous category', 'reader-history', 'category-previous'],
    ['Next category', 'reader-history', 'category-next'],
    ['Last Tell', 'communications-review', 'last-tell'],
    ['Vitals', 'accessibility', 'read-vitals'],
    ['Mute or unmute NukeFire Voice', 'accessibility', 'toggle-self-voice-mute'],
    ['Stop NukeFire Voice', 'accessibility', 'stop-self-voice']
  ];
  const parts = items.map(([label, type, id]) => {
    const key = bindingLabelForSemantic(type, id);
    return key ? `${label}: ${key}` : `${label}: unassigned`;
  });
  const official = readerOfficialKeyPresetStatus();
  const officialText = ` Official line-recall keys ${Number(official.lines) || 0} of 9; MUSH-style movement keys ${Number(official.movement) || 0} of 6.`;
  const platform = currentKeyboardPlatform().toLowerCase();
  const macNote = /mac|darwin|iphone|ipad|ipod/u.test(platform)
    ? ' macOS keeps Option plus Left and Right for native word navigation; F8 and F9 remain the reliable message keys.'
    : '';
  return `Reader keys. ${parts.join('; ')}.${officialText}${macNote} Use CR KEYS LINES, MOVEMENT, or MUSH to install official presets without opening Preferences.`;
}


function openReaderSetup(options = {}) {
  if (!readerSetupOverlay || !readerSetupDialog) return false;
  readerSetupOverlay.hidden = false;
  appRoot?.setAttribute('aria-hidden', 'true');
  markReaderOnboardingSeen();
  const status = $('#reader-setup-status');
  if (status) status.textContent = 'Choose My Screen Reader for VoiceOver, NVDA, JAWS, or Orca. Choose NukeFire Voice to use the system speech synthesizer.';
  readerSetupDialog.focus({ preventScroll: true });
  if (options.announceChange !== false) {
    announce('Reader Setup opened. Choose Use My Screen Reader or Use NukeFire Voice. A short spoken tutorial can start immediately afterward.', { force: true, interrupt: true });
  }
  return true;
}

function closeReaderSetup(options = {}) {
  if (!readerSetupOverlay) return false;
  readerSetupOverlay.hidden = true;
  appRoot?.removeAttribute('aria-hidden');
  if (options.focus !== false) focusCommand({ preserveSelection: true });
  return true;
}

function readerOfficialKeyPresetStatus() {
  if (typeof readerPresetsApi.officialShortcutPresetStatus === 'function') {
    return readerPresetsApi.officialShortcutPresetStatus(state.keybindings, keybindingApi);
  }
  return { lines: 0, movement: 0 };
}

function keyPresetConflictText(skipped = []) {
  const records = Array.isArray(skipped) ? skipped : [];
  if (!records.length) return '';
  const labels = records.map((record) => String(record?.label || record?.code || '')).filter(Boolean);
  const detail = labels.length ? `: ${labels.join(', ')}` : '';
  return ` ${records.length} existing assignment${records.length === 1 ? '' : 's'} left unchanged${detail}.`;
}

function mushSettingsConflictText(skipped = []) {
  const records = Array.isArray(skipped) ? skipped : [];
  if (!records.length) return ' No shortcut conflicts.';
  const purposeByLabel = {
    'F5': 'Mute or Unmute Self-Voice',
    'F7': 'Stop Self-Voice',
    'F8': 'Previous Reader History message',
    'F9': 'Next Reader History message',
    'F10': 'Latest Reader History message',
    'Alt+T': 'Last Tell',
    'Alt+H': 'Read Vitals',
    'Alt+C': 'Copy Reviewed'
  };
  const details = records.map((record) => {
    const label = String(record?.label || record?.code || 'Unknown key');
    const purpose = purposeByLabel[label] || 'the requested MUSH action';
    return `${label} kept its existing assignment, so ${purpose} was not installed there`;
  });
  return ` Preserved ${records.length} existing assignment${records.length === 1 ? '' : 's'}. ${details.join('. ')}.`;
}

function applyReaderKeysCommand(value) {
  const text = String(value || '').trim().toLowerCase().replace(/\s+/gu, ' ');
  if (!text || text === 'status') return { ok: true, message: readerKeysText() };

  if (text === 'lines' || text === 'line') {
    if (typeof readerPresetsApi.installReaderLineRecallPreset !== 'function') {
      return { ok: false, message: 'Reader line-key preset is unavailable in this client build.' };
    }
    const result = readerPresetsApi.installReaderLineRecallPreset(state.keybindings, keybindingApi);
    updateKeybindings(result.settings, { persist: true });
    const installed = Array.isArray(result.installed) ? result.installed.length : 0;
    return {
      ok: true,
      message: `Reader line keys installed: ${installed} of 9. Alt plus 1 through 9 now recalls recent meaningful terminal lines locally.${keyPresetConflictText(result.skipped)}`
    };
  }

  if (text === 'movement' || text === 'move') {
    if (typeof readerPresetsApi.installMushMovementPreset !== 'function') {
      return { ok: false, message: 'MUSH-style movement preset is unavailable in this client build.' };
    }
    const result = readerPresetsApi.installMushMovementPreset(state.keybindings, keybindingApi);
    updateKeybindings(result.settings, { persist: true });
    const installed = Array.isArray(result.installed) ? result.installed.length : 0;
    return {
      ok: true,
      message: `MUSH-style movement keys installed: ${installed} of 6. Alt I north, Alt J west, Alt K south, Alt L east, Alt U up, Alt N down.${keyPresetConflictText(result.skipped)}`
    };
  }

  if (text === 'mush') {
    if (typeof readerPresetsApi.installMushAccessibilityPreset !== 'function') {
      return { ok: false, message: 'MUSH accessibility key preset is unavailable in this client build.' };
    }
    const result = readerPresetsApi.installMushAccessibilityPreset(state.keybindings, keybindingApi);
    updateKeybindings(result.settings, { persist: true });
    const linesInstalled = Array.isArray(result.lines?.installed) ? result.lines.installed.length : 0;
    const movementInstalled = Array.isArray(result.movement?.installed) ? result.movement.installed.length : 0;
    const conflicts = [...(result.lines?.skipped || []), ...(result.movement?.skipped || [])];
    return {
      ok: true,
      message: `MUSH accessibility keys installed. Reader lines ${linesInstalled} of 9; movement ${movementInstalled} of 6.${keyPresetConflictText(conflicts)}`
    };
  }

  const remove = text.match(/^remove\s+(lines?|movement|move|mush)$/u);
  if (remove) {
    const target = remove[1];
    let result = null;
    let label = '';
    if (target === 'line' || target === 'lines') {
      result = readerPresetsApi.removeReaderLineRecallPreset?.(state.keybindings, keybindingApi);
      label = 'Reader line keys';
    } else if (target === 'movement' || target === 'move') {
      result = readerPresetsApi.removeMushMovementPreset?.(state.keybindings, keybindingApi);
      label = 'MUSH-style movement keys';
    } else {
      result = readerPresetsApi.removeMushAccessibilityPreset?.(state.keybindings, keybindingApi);
      label = 'MUSH accessibility keys';
    }
    if (!result) return { ok: false, message: `${label || 'Requested key preset'} could not be removed by this client build.` };
    updateKeybindings(result.settings, { persist: true });
    return { ok: true, message: `${label} removed: ${Number(result.removed) || 0}. Other keyboard shortcuts were not changed.` };
  }

  return { ok: false, message: 'CR KEYS expects STATUS, LINES, MOVEMENT, MUSH, or REMOVE LINES, MOVEMENT, or MUSH.' };
}

async function copyReviewedText() {
  const text = String(state.lastReviewedText || '').trim();
  if (!text) {
    announce('No reviewed line is available to copy yet.', { force: true });
    return false;
  }
  try {
    const result = await window.nukefire.writeClipboardText?.(text);
    if (result?.ok === false) throw new Error(result.error || 'Clipboard write failed.');
    announce('Reviewed line copied.', { force: true });
    return true;
  } catch (error) {
    appendSystemMessage(`Unable to copy reviewed line: ${error.message || error}`, 'error');
    return false;
  }
}

function applyMushSettingsPreset() {
  if (typeof readerPresetsApi.installMushSettingsPreset !== 'function') {
    return { ok: false, message: 'MUSH settings are unavailable in this client build.' };
  }
  capturePreReaderSetup();
  const result = readerPresetsApi.installMushSettingsPreset(state.keybindings, keybindingApi);
  updateKeybindings(result.settings, { persist: true });
  const commandDraft = commandInput.value;
  const selectionStart = commandInput.selectionStart;
  const selectionEnd = commandInput.selectionEnd;
  const selectionDirection = commandInput.selectionDirection;
  const repeatLastCommand = $('#repeat-last-command-on-enter');
  const showLastCommand = $('#show-last-command-in-input');
  repeatLastCommand.checked = true;
  showLastCommand.checked = false;
  localStorage.setItem('nukefire.repeatLastCommandOnEnter', 'true');
  localStorage.setItem('nukefire.showLastCommandInInput', 'false');
  schedulePersistentSettingsSave();
  commandInput.value = commandDraft;
  if (Number.isInteger(selectionStart) && Number.isInteger(selectionEnd)) {
    commandInput.setSelectionRange(selectionStart, selectionEnd, selectionDirection || 'none');
  }
  setSelfVoiceInterruptOnCommand(true, { announceChange: false });
  applyCommunicationCueSettings({
    ...(state.accessibility.communicationCues || {}),
    tell: true, auction: true, gossip: true, skynet: true, ssf: true
  }, { persist: true, announceChange: false });
  const conflicts = [
    ...(result.lines?.skipped || []),
    ...(result.movement?.skipped || []),
    ...(result.controls?.skipped || [])
  ];
  const installed = (Array.isArray(result.lines?.installed) ? result.lines.installed.length : 0) +
    (Array.isArray(result.movement?.installed) ? result.movement.installed.length : 0) +
    (Array.isArray(result.controls?.installed) ? result.controls.installed.length : 0);
  return {
    ok: true,
    message: `MUSH settings applied. Official shortcuts active: ${installed} of 28. Command interruption and communication sounds are on. Repeat Last Command with Enter is on. Show Last Sent Command in Command Line is off. Combat sounds were not changed. Use CR OFF or SR OFF to restore your previous client setup.${mushSettingsConflictText(conflicts)}`
  };
}


function applyFirstRunReaderChoice(presetId) {
  markReaderOnboardingSeen();
  ensureReaderAccessibilityBindingsQuietly();
  setReaderSafetyAlertsEnabled(true, { announceChange: false });
  const ok = applyReaderSetupPreset(presetId, { announceChange: false });
  closeReaderSetup({ focus: true });
  const tutorial = $('#reader-setup-tutorial')?.checked !== false;
  const label = presetId === 'reader-live-voice' && ok ? 'NukeFire Voice' : 'your native screen reader';
  if (tutorial) {
    setTimeout(() => startReaderTutorial({ mode: ok && presetId === 'reader-live-voice' ? 'live' : 'native' }), 120);
  } else {
    announce(`Reader Mode ready with ${label}. F10 reads Latest, Shift plus F10 reads Last Tell, and C R help lists Reader commands.`, { force: true, interrupt: true });
  }
  return ok;
}

function initializeReaderOnboardingHint() {
  state.readerOnboarding.seen = localStorage.getItem('nukefire.readerOnboardingSeen') === 'true';
  state.readerOnboarding.tutorialCompleted = localStorage.getItem('nukefire.readerTutorialCompleted') === 'true';
  if (state.readerOnboarding.seen) return;
  setTimeout(() => {
    if (state.readerOnboarding.seen || activeSessionRecord()?.connected) return;
    announce('NukeFire Client ready. Screen reader users: Reader Setup is available beside Connect. It can configure Reader Mode and start a short spoken tutorial.', { force: true });
  }, 700);
}

function setReaderWorkspaceReviewStatus(message) {
  const target = $('#reader-workspace-review-status');
  if (target && message) target.textContent = String(message);
}

function renderReaderWorkspaceStatus() {
  const sessionTarget = $('#reader-workspace-session-status');
  const speechTarget = $('#reader-workspace-speech-status');
  const active = activeSessionRecord();
  if (sessionTarget) {
    const channel = effectiveCommunicationChannel();
    const channelLabel = channel === 'all' ? 'All Communications' : communicationChannelLabel(channel);
    const unread = Number(active?.unreadOutput) || 0;
    const historyStatus = active?.readerHistory?.categoryStatus?.();
    const historyText = historyStatus
      ? ` Reader History: ${historyStatus.label}, ${Number(historyStatus.unread) || 0} new, ${historyStatus.count} total.`
      : '';
    sessionTarget.textContent = active
      ? `Session: ${sessionLabel(active)}. ${active.status?.state || 'disconnected'}. ${unread} unread background update${unread === 1 ? '' : 's'}. Communications view: ${channelLabel}.${historyText}`
      : 'No active NukeFire session.';
  }
  if (speechTarget) {
    const readerMode = state.accessibility.screenReaderMode ? 'Native screen reader on' : 'Native screen reader off';
    const selfVoice = state.accessibility.selfVoiceEnabled ? 'Self-voice on' : 'Self-voice off';
    const mute = state.accessibility.selfVoiceMuted ? 'muted' : 'unmuted';
    const foreground = state.accessibility.selfVoiceForegroundOnly
      ? (state.accessibility.selfVoiceAppForeground ? 'foreground speech active' : 'background speech suppressed')
      : 'background speech allowed';
    const follow = state.accessibility.selfVoiceFollowMode ? 'follow on' : 'follow off';
    const governor = state.accessibility.selfVoiceGovernorEnabled ? 'backlog governor on' : 'backlog governor off';
    const priority = state.accessibility.selfVoicePriorityAlertsEnabled ? 'Tell/System priority on' : 'Tell/System priority off';
    const safety = state.accessibility.readerSafetyAlertsEnabled ? 'realtime safety alerts on' : 'realtime safety alerts off';
    const voiceRate = `speed ${Number(state.accessibility.selfVoiceRate).toFixed(1)} times`;
    const audio = state.accessibility.audioCuesEnabled
      ? `Audio Cues on, ${state.accessibility.audioCuesMuted ? 'muted' : 'unmuted'}`
      : 'Audio Cues off';
    speechTarget.textContent = `${readerMode}. ${selfVoice}; ${mute}; ${foreground}; ${follow}; ${governor}; ${priority}; ${safety}; ${voiceRate}. ${audio}.`;
  }
}

function suppressReaderWorkspacePopouts() {
  const suppressed = state.accessibility.readerWorkspaceSuppressedPopouts;
  if (!suppressed) return;
  for (const panelId of POPOUT_PANEL_IDS) {
    if (!isPanelPoppedOut(panelId)) continue;
    suppressed.add(panelId);
    void window.nukefire.closePanelWindow?.(panelId);
  }
}

async function restoreReaderWorkspacePopouts() {
  const suppressed = state.accessibility.readerWorkspaceSuppressedPopouts;
  if (!suppressed?.size) return;
  const panelIds = [...suppressed];
  for (const panelId of panelIds) {
    if (state.workspace.activePopouts?.[panelId]?.open) {
      await openPanelPopout(panelId, { focus: false, announceChange: false });
    }
    suppressed.delete(panelId);
  }
}

function setReaderWorkspaceEnabled(enabled, options = {}) {
  const requested = Boolean(enabled);
  state.accessibility.readerWorkspaceEnabled = requested;
  document.body.classList.toggle('reader-workspace-mode', requested);
  const checkbox = $('#reader-workspace-enabled');
  if (checkbox) checkbox.checked = requested;

  if (requested) suppressReaderWorkspacePopouts();
  else void restoreReaderWorkspacePopouts();

  renderReaderWorkspaceStatus();
  scheduleTerminalSizeUpdate();

  if (options.persist !== false) {
    localStorage.setItem('nukefire.readerWorkspaceEnabled', String(requested));
    schedulePersistentSettingsSave();
  }

  if (options.focus !== false) {
    scheduleFrame(() => focusCommand({ preserveSelection: true }));
  }
  if (options.announceChange !== false) {
    announce(
      requested
        ? 'Reader workspace enabled. Ordinary panels are hidden; terminal and Reader Review remain available.'
        : 'Reader workspace disabled. Normal panel layout restored.',
      { force: true }
    );
  }
  return requested;
}

function setScreenReaderMode(enabled, options = {}) {
  const requested = Boolean(enabled);
  if (requested && state.accessibility.selfVoiceEnabled) {
    selfVoice?.stop?.();
    selfVoice?.setEnabled?.(false);
    state.accessibility.selfVoiceEnabled = false;
    $('#self-voice-enabled').checked = false;
    localStorage.setItem('nukefire.selfVoiceEnabled', 'false');
  }
  state.accessibility.screenReaderMode = requested;
  document.body.classList.toggle('screen-reader-mode', state.accessibility.screenReaderMode);
  xtermAdapter?.setScreenReaderMode?.(state.accessibility.screenReaderMode);
  $('#screen-reader-mode').checked = state.accessibility.screenReaderMode;
  if (options.persist !== false) {
    localStorage.setItem('nukefire.screenReaderMode', String(state.accessibility.screenReaderMode));
    schedulePersistentSettingsSave();
  }

  void window.nukefire.setClientPreferences?.({
    screenReaderMode: state.accessibility.screenReaderMode
  });
  publishAllPanelPopoutStates();
  renderReaderWorkspaceStatus();

  if (options.announceChange !== false) {
    announce(`Screen reader mode ${state.accessibility.screenReaderMode ? 'enabled' : 'disabled'}.`, { force: true });
  }
}

function applyReaderSetupPreset(requestedPresetId = '', options = {}) {
  const presetId = String(requestedPresetId || $('#reader-preset-select')?.value || 'native-reader');
  const preset = typeof readerPresetsApi.getReaderPreset === 'function'
    ? readerPresetsApi.getReaderPreset(presetId)
    : null;
  if (!preset?.accessibility) {
    announce('That Reader preset is unavailable.', { force: true });
    return false;
  }

  capturePreReaderSetup();

  const next = preset.accessibility;
  const quiet = { announceChange: false, persist: false };
  setReaderWorkspaceEnabled(next.readerWorkspaceEnabled !== false, { ...quiet, focus: false });

  let speechPathReady = true;
  if (next.screenReaderMode === true) {
    setSelfVoiceEnabled(false, quiet);
    setScreenReaderMode(true, quiet);
  } else {
    if (Object.hasOwn(next, 'selfVoiceRate')) {
      setSelfVoiceVoiceSettings({ rate: next.selfVoiceRate }, quiet);
    }
    setSelfVoiceMuted(next.selfVoiceMuted === true, quiet);
    setSelfVoiceForegroundOnly(next.selfVoiceForegroundOnly !== false, quiet);
    setSelfVoiceGovernorEnabled(next.selfVoiceGovernorEnabled !== false, quiet);
    setSelfVoicePriorityAlertsEnabled(next.selfVoicePriorityAlertsEnabled !== false, quiet);
    setSelfVoiceFollowMode(next.selfVoiceFollowMode === true, quiet);
    speechPathReady = setSelfVoiceEnabled(next.selfVoiceEnabled === true, quiet) === true;
    if (!speechPathReady && next.selfVoiceEnabled === true) {
      /* Preserve a working accessibility path when Live Voice cannot start. */
      setScreenReaderMode(true, quiet);
    } else if (next.selfVoiceEnabled !== true) {
      setScreenReaderMode(false, quiet);
    }
  }

  mirrorPersistentSettings(collectPersistentSettings());
  schedulePersistentSettingsSave();
  renderReaderWorkspaceStatus();
  const rateText = Object.hasOwn(next, 'selfVoiceRate') ? ` Self-Voice speed set to ${Number(next.selfVoiceRate).toFixed(1)} times.` : '';
  const message = speechPathReady
    ? `${preset.label} Reader preset applied.${rateText} Individual settings remain editable. Use CR OFF or SR OFF to restore your previous client setup.`
    : `${preset.label} Reader preset could not start NukeFire Self-Voice. Native reader mode was preserved instead.`;
  setReaderPresetStatus(message);
  if (options.announceChange !== false) announce(message, { force: true, interrupt: speechPathReady !== true });
  return speechPathReady;
}

const PRE_READER_SETUP_KEY = 'nukefire.preReaderSetup.v1';

function readPreReaderSetup() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRE_READER_SETUP_KEY) || 'null');
    if (!parsed || parsed.version !== 1 || typeof parsed.accessibility !== 'object') return null;
    return parsed;
  } catch (_error) {
    return null;
  }
}

function capturePreReaderSetup() {
  if (readPreReaderSetup()) return false;
  const settings = collectPersistentSettings();
  const snapshot = {
    version: 1,
    input: {
      repeatLastCommandOnEnter: settings.input.repeatLastCommandOnEnter === true,
      showLastCommandInInput: settings.input.showLastCommandInInput !== false
    },
    accessibility: structuredCloneSafe(settings.accessibility),
    keybindings: structuredCloneSafe(settings.keybindings)
  };
  try {
    localStorage.setItem(PRE_READER_SETUP_KEY, JSON.stringify(snapshot));
    return true;
  } catch (_error) {
    return false;
  }
}

function restorePreReaderSetup() {
  const snapshot = readPreReaderSetup();
  const quiet = { announceChange: false, persist: false, focus: false };

  if (!snapshot) {
    setReaderWorkspaceEnabled(false, quiet);
    setSelfVoiceEnabled(false, quiet);
    setScreenReaderMode(false, quiet);
    mirrorPersistentSettings(collectPersistentSettings());
    schedulePersistentSettingsSave();
    return {
      restored: false,
      message: 'Reader mode and NukeFire Voice are off. No saved pre-Reader client setup was available, so unrelated preferences were left unchanged.'
    };
  }

  const previous = snapshot.accessibility || {};
  setReaderWorkspaceEnabled(false, quiet);
  setSelfVoiceEnabled(false, quiet);
  setScreenReaderMode(false, quiet);
  setSelfVoiceVoiceSettings({
    rate: previous.selfVoiceRate,
    pitch: previous.selfVoicePitch,
    volume: previous.selfVoiceVolume,
    voiceId: previous.selfVoiceVoiceId
  }, quiet);
  setSelfVoiceMuted(previous.selfVoiceMuted === true, quiet);
  setSelfVoiceForegroundOnly(previous.selfVoiceForegroundOnly !== false, quiet);
  setSelfVoiceGovernorEnabled(previous.selfVoiceGovernorEnabled !== false, quiet);
  setSelfVoicePriorityAlertsEnabled(previous.selfVoicePriorityAlertsEnabled !== false, quiet);
  setSelfVoiceFollowMode(previous.selfVoiceFollowMode === true, quiet);
  setSelfVoiceInterruptOnCommand(previous.selfVoiceInterruptOnCommand === true, quiet);
  setReaderSafetyAlertsEnabled(previous.readerSafetyAlertsEnabled !== false, quiet);
  applyCommunicationCueSettings(previous.communicationCues || {}, quiet);
  updateKeybindings(snapshot.keybindings || {}, { persist: false });

  const repeatLast = $('#repeat-last-command-on-enter');
  const showLast = $('#show-last-command-in-input');
  if (repeatLast) repeatLast.checked = snapshot.input?.repeatLastCommandOnEnter === true;
  if (showLast) showLast.checked = snapshot.input?.showLastCommandInInput !== false;

  if (previous.screenReaderMode === true) {
    setScreenReaderMode(true, quiet);
  } else if (previous.selfVoiceEnabled === true) {
    setSelfVoiceEnabled(true, quiet);
  }
  setReaderWorkspaceEnabled(previous.readerWorkspaceEnabled === true, quiet);

  localStorage.removeItem(PRE_READER_SETUP_KEY);
  mirrorPersistentSettings(collectPersistentSettings());
  schedulePersistentSettingsSave();
  renderReaderWorkspaceStatus();
  return {
    restored: true,
    message: 'Reader mode exited. Your client setup from before Reader mode was restored.'
  };
}

function setImportantAnnouncements(enabled, options = {}) {
  state.accessibility.announceImportant = Boolean(enabled);
  $('#announce-important').checked = state.accessibility.announceImportant;
  if (options.persist !== false) {
    localStorage.setItem('nukefire.announceImportant', String(state.accessibility.announceImportant));
    schedulePersistentSettingsSave();
  }

  if (options.announceChange !== false) {
    announce(`Important event announcements ${state.accessibility.announceImportant ? 'enabled' : 'disabled'}.`, { force: true });
  }
}

function focusInvalidConnectionField(input, message) {
  setConnectionBarCollapsed(false);
  appendSystemMessage(message, 'error');
  announce(message, { force: true });
  input?.focus({ preventScroll: true });
  input?.select?.();
}

async function connect() {
  const connectionState = statusBox?.dataset.connectionState
    || (state.connected ? 'connected' : 'disconnected');
  if (connectionState === 'connected' || connectionState === 'connecting') {
    const message = connectionState === 'connected'
      ? 'This session is already connected. Use Reconnect to replace the live connection.'
      : 'This session is already connecting.';
    appendSystemMessage(message);
    announce(message, { force: true });
    return;
  }

  const host = hostInput.value.trim();
  const portText = portInput.value.trim();
  const port = Number(portText);

  if (!host) {
    focusInvalidConnectionField(hostInput, 'Enter a host name before connecting.');
    return;
  }

  if (!/^\d{1,5}$/u.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    focusInvalidConnectionField(portInput, 'Enter a server port from 1 to 65535.');
    return;
  }

  localStorage.setItem('nukefire.host', host);
  localStorage.setItem('nukefire.port', String(port));
  schedulePersistentSettingsSave();

  try {
    await syncClientPreferences();
    await syncTerminalSize();
    const sessionId = state.sessions.activeId;
    if (window.nukefire.connectSession && sessionId) {
      await window.nukefire.connectSession(sessionId, { host, port });
    } else {
      await window.nukefire.connect({ host, port });
    }
  } catch (error) {
    setConnectionBarCollapsed(false);
    appendSystemMessage(error.message || String(error), 'error');
  }
}


async function reconnect() {
  const connectionState = statusBox?.dataset.connectionState
    || (state.connected ? 'connected' : 'disconnected');
  if (connectionState === 'connecting') {
    const message = 'This session is already connecting.';
    appendSystemMessage(message);
    announce(message, { force: true });
    return;
  }

  const record = activeSessionRecord();
  const host = String(record?.host || hostInput.value || '').trim();
  const portText = String(record?.port || portInput.value || '').trim();
  const port = Number(portText);

  if (!host) {
    focusInvalidConnectionField(hostInput, 'Enter a host name before reconnecting.');
    return;
  }

  if (!/^\d{1,5}$/u.test(portText) || !Number.isInteger(port) || port < 1 || port > 65535) {
    focusInvalidConnectionField(portInput, 'Enter a server port from 1 to 65535.');
    return;
  }

  hostInput.value = host;
  portInput.value = String(port);
  localStorage.setItem('nukefire.host', host);
  localStorage.setItem('nukefire.port', String(port));
  schedulePersistentSettingsSave();
  appendSystemMessage(`Reconnecting active session to ${host}:${port}…`);
  playClientSoundpackEvent('client.reconnecting', 'client-reconnecting');

  try {
    await syncClientPreferences();
    await syncTerminalSize();
    const sessionId = state.sessions.activeId;
    if (window.nukefire.connectSession && sessionId) {
      await window.nukefire.connectSession(sessionId, { host, port });
    } else {
      await window.nukefire.connect({ host, port });
    }
  } catch (error) {
    setConnectionBarCollapsed(false);
    appendSystemMessage(error.message || String(error), 'error');
  }
}

function handleConnectionFieldKeydown(event) {
  if (event.key !== 'Enter' || event.isComposing) return;
  event.preventDefault();
  if (connectButton.disabled) return;
  void connect();
}


function normalizeContextSnapshot(snapshot) {
  const normalized = typeof contextApi.normalizeContextState === 'function'
    ? contextApi.normalizeContextState(snapshot || {})
    : (snapshot && typeof snapshot === 'object' ? { ...snapshot } : {});
  return {
    ...normalized,
    schema: Number(normalized.schema) || 1,
    room: Number(normalized.room) || 0,
    zone: Number(normalized.zone) || 0,
    contexts: Array.isArray(normalized.contexts) ? normalized.contexts : []
  };
}

function contextSnapshotSignature(snapshot, options = {}) {
  if (typeof contextApi.snapshotSignature === 'function') {
    return contextApi.snapshotSignature(snapshot || {}, { normalized: options.normalized === true });
  }
  return JSON.stringify(options.normalized === true ? snapshot : normalizeContextSnapshot(snapshot));
}

function processContextSnapshot(snapshot) {
  const normalized = normalizeContextSnapshot(snapshot);
  const signature = contextSnapshotSignature(normalized, { normalized: true });
  if (signature === state.contextDeck.signature) return false;
  state.contextDeck.snapshot = normalized;
  state.contextDeck.signature = signature;
  return true;
}

function contextStatusList(rows) {
  const list = document.createElement('dl');
  list.className = 'context-status-list';
  for (const row of rows) {
    const wrapper = document.createElement('div');
    wrapper.className = 'context-status-row';
    wrapper.dataset.tone = row.tone || 'neutral';
    const term = document.createElement('dt');
    term.textContent = row.label;
    const value = document.createElement('dd');
    value.textContent = row.value;
    wrapper.append(term, value);
    list.append(wrapper);
  }
  return list;
}


function normalizeAffectsSnapshot(input) {
  const normalized = typeof affectsApi.normalizeAffectsState === 'function'
    ? affectsApi.normalizeAffectsState(input || {})
    : (input && typeof input === 'object' ? { ...input } : {});
  const effects = Array.isArray(normalized.effects) ? normalized.effects : [];
  return {
    ...normalized,
    schema: Number(normalized.schema) || 1,
    revision: Number(normalized.revision) || 0,
    serverTime: Number(normalized.serverTime) || 0,
    count: Math.max(effects.length, Number(normalized.count) || effects.length),
    total: Math.max(effects.length, Number(normalized.total) || effects.length),
    timedCount: Number(normalized.timedCount) || 0,
    permanentCount: Number(normalized.permanentCount) || 0,
    hiddenPermanent: Number(normalized.hiddenPermanent ?? normalized.permanentOmitted) || 0,
    permanentOmitted: Number(normalized.permanentOmitted ?? normalized.hiddenPermanent) || 0,
    truncated: Boolean(normalized.truncated),
    effects
  };
}

function affectsPanelVisible() {
  return panelHasLiveSurface('affects');
}

function stopAffectsCountdown() {
  clearTimeout(state.affects.timer);
  state.affects.timer = null;
}

function updateAffectsCountdowns() {
  stopAffectsCountdown();
  if (!affectsPanelVisible()) return;

  const snapshot = state.affects.snapshot;
  const nowMs = Date.now();
  let hasFutureTimedEffect = false;
  for (const entry of affectsCountdownEntries) {
    const node = entry.node;
    if (!node?.isConnected) continue;
    const expireAt = Number(node.dataset.affectExpireAt) || 0;
    const permanent = node.dataset.affectPermanent === 'true';
    const effect = { expireAt, permanent, remaining: Number(node.dataset.affectRemaining) || 0 };
    const seconds = typeof affectsApi.remainingSeconds === 'function'
      ? affectsApi.remainingSeconds(effect, snapshot, state.affects.receivedAtMs, nowMs)
      : (permanent ? -1 : Math.max(0, effect.remaining));
    const remainingText = typeof affectsApi.formatRemaining === 'function'
      ? affectsApi.formatRemaining(seconds, permanent)
      : (permanent ? 'Permanent' : `${seconds}s`);
    setTextIfChanged(node, remainingText);
    const expired = String(!permanent && seconds <= 0);
    if (entry.row && entry.row.dataset.expired !== expired) entry.row.dataset.expired = expired;
    if (!permanent && seconds > 0) hasFutureTimedEffect = true;
  }

  if (hasFutureTimedEffect) {
    state.affects.timer = setTimeout(updateAffectsCountdowns, 1000);
  }
}

function affectDetailEntries(group) {
  if (typeof affectsApi.groupDetailEntries === 'function') return affectsApi.groupDetailEntries(group);
  const details = [];
  for (const modifier of group.modifiers || []) {
    if (!modifier.apply && !modifier.modifier) continue;
    const amount = Number(modifier.modifier) || 0;
    const prefix = amount > 0 ? `+${amount}` : String(amount);
    details.push({
      text: `${prefix} ${modifier.apply || 'modifier'}`.trim(),
      harmful: typeof affectsApi.isHarmfulModifier === 'function'
        ? affectsApi.isHarmfulModifier(modifier.apply, amount)
        : false
    });
  }
  for (const grant of group.grants || []) details.push({ text: `Grants ${grant}`, harmful: false });
  return details;
}

function affectDetailText(group) {
  return affectDetailEntries(group).map((entry) => entry.text);
}

function affectSourceLabel(group) {
  if (typeof affectsApi.sourceTypeLabel === 'function') return affectsApi.sourceTypeLabel(group?.sourceType);
  const source = String(group?.sourceType || '').trim().toLocaleLowerCase();
  return source ? `${source.charAt(0).toLocaleUpperCase()}${source.slice(1)}` : 'Unknown';
}

function affectExpanded(groupKey) {
  return Array.isArray(state.affects.expandedKeys) && state.affects.expandedKeys.includes(groupKey);
}

function setAffectExpanded(groupKey, expanded) {
  const current = Array.isArray(state.affects.expandedKeys) ? state.affects.expandedKeys : [];
  const next = current.filter((key) => key !== groupKey);
  if (expanded) next.push(groupKey);
  state.affects.expandedKeys = next.slice(-32);
}

function setAffectRowExpanded(toggle, expanded) {
  if (!toggle) return;
  const row = toggle.closest('.affect-row');
  const details = row?.querySelector('.affect-row-details');
  const disclosure = toggle.querySelector('.affect-disclosure');
  toggle.setAttribute('aria-expanded', String(expanded));
  const affectName = toggle.querySelector('.affect-name')?.textContent || 'affect';
  toggle.title = `${expanded ? 'Hide' : 'Show'} details for ${affectName}`;
  if (details) details.hidden = !expanded;
  if (disclosure) disclosure.textContent = expanded ? '▾' : '▸';
  if (row) row.dataset.expanded = String(expanded);
  setAffectExpanded(toggle.dataset.affectKey || '', expanded);
}

function affectsRenderSignature(snapshot) {
  return JSON.stringify({
    mode: state.affectsDisplayMode,
    hiddenPermanent: snapshot.hiddenPermanent,
    truncated: snapshot.truncated,
    effects: snapshot.effects.map((effect) => [
      effect.spellId, effect.spell, effect.expireAt, effect.permanent,
      effect.location, effect.apply, effect.modifier, effect.harmful,
      effect.grants, effect.sourceType
    ])
  });
}

function renderAffects() {
  if (!panelHasLiveSurface('affects')) {
    state.affects.renderDirty = true;
    stopAffectsCountdown();
    return;
  }
  state.affects.renderDirty = false;
  const list = $('#affects-list');
  const empty = $('#affects-empty');
  const note = $('#affects-note');
  const status = $('#affects-status');
  const summary = $('#affects-summary');
  const refresh = $('#affects-refresh');
  const textList = $('#affects-text-list');
  const modeControl = $('#affects-display-mode');
  if (!list || !empty || !note || !status || !summary || !refresh || !textList || !modeControl) return;

  stopAffectsCountdown();
  const snapshot = state.affects.snapshot;
  const allGroups = typeof affectsApi.groupEffects === 'function'
    ? affectsApi.groupEffects(snapshot, { normalized: true })
    : snapshot.effects;
  const classicMode = state.affectsDisplayMode === 'classic';
  const groups = classicMode
    ? allGroups.filter((group) => !group.permanent)
    : allGroups;
  const validKeys = new Set(allGroups.map((group) => String(group.key || '')));
  const countdownEntries = [];
  state.affects.expandedKeys = (Array.isArray(state.affects.expandedKeys) ? state.affects.expandedKeys : [])
    .filter((key) => validKeys.has(key));

  list.dataset.mode = state.affectsDisplayMode;
  modeControl.value = state.affectsDisplayMode;
  list.replaceChildren();
  empty.textContent = !state.connected
    ? 'Connect to see active affects.'
    : !state.affects.receivedAtMs
      ? 'Waiting for NukeFire to report active affects.'
      : classicMode
        ? 'No active timed affects.'
        : 'No active timed or spell affects.';
  empty.hidden = groups.length > 0;
  refresh.disabled = !state.connected;
  textList.disabled = !state.connected;

  if (!state.connected) status.textContent = 'Disconnected. Affect data is unavailable.';
  else if (!state.affects.receivedAtMs) status.textContent = 'Connected; waiting for NukeFire affect data.';
  else if (classicMode) {
    status.textContent = `${groups.length} active timed affect${groups.length === 1 ? '' : 's'} · Classic view.`;
  } else {
    const permanentShown = groups.filter((group) => group.permanent).length;
    const timedShown = groups.length - permanentShown;
    status.textContent = `${groups.length} affect${groups.length === 1 ? '' : 's'} · ${timedShown} timed · ${permanentShown} permanent.`;
  }

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];

    if (classicMode) {
      const card = document.createElement('article');
      card.className = 'affect-card';
      card.setAttribute('role', 'listitem');
      card.dataset.permanent = 'false';
      card.dataset.expired = 'false';
      card.dataset.harmful = String(Boolean(group.harmful));

      const heading = document.createElement('div');
      heading.className = 'affect-card-heading';
      const name = document.createElement('strong');
      name.textContent = group.spell;
      if (group.harmful) {
        const harmful = document.createElement('span');
        harmful.className = 'sr-only';
        harmful.textContent = ' harmful effect';
        name.append(harmful);
      }
      const duration = document.createElement('span');
      duration.className = 'affect-duration';
      duration.dataset.affectExpireAt = String(group.expireAt || 0);
      duration.dataset.affectPermanent = 'false';
      duration.dataset.affectRemaining = String(group.remaining ?? 0);
      duration.textContent = group.durationText || 'Timed';
      heading.append(name, duration);
      card.append(heading);
      countdownEntries.push({ node: duration, row: card });

      const detailItems = affectDetailEntries(group);
      if (detailItems.length > 0) {
        const details = document.createElement('ul');
        details.className = 'affect-details';
        for (const detail of detailItems) {
          const item = document.createElement('li');
          item.textContent = detail.text;
          if (detail.harmful) {
            item.dataset.tone = 'harmful';
            item.setAttribute('aria-label', `Harmful modifier: ${detail.text}`);
          }
          details.append(item);
        }
        card.append(details);
      }
      list.append(card);
      continue;
    }

    const groupKey = String(group.key || `affect-${index + 1}`);
    const expanded = affectExpanded(groupKey);
    const row = document.createElement('article');
    row.className = 'affect-row';
    row.setAttribute('role', 'listitem');
    row.dataset.permanent = String(Boolean(group.permanent));
    row.dataset.expired = 'false';
    row.dataset.harmful = String(Boolean(group.harmful));
    row.dataset.expanded = String(expanded);

    const detailsId = `affect-details-${index + 1}`;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'affect-row-toggle';
    toggle.dataset.affectKey = groupKey;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-controls', detailsId);
    toggle.title = `Show details for ${group.spell}`;

    const disclosure = document.createElement('span');
    disclosure.className = 'affect-disclosure';
    disclosure.setAttribute('aria-hidden', 'true');
    disclosure.textContent = expanded ? '▾' : '▸';
    const name = document.createElement('span');
    name.className = 'affect-name';
    name.textContent = group.spell;
    if (group.harmful) {
      const harmful = document.createElement('span');
      harmful.className = 'sr-only';
      harmful.textContent = ' harmful effect';
      name.append(harmful);
    }
    const duration = document.createElement('span');
    duration.className = 'affect-duration';
    duration.dataset.affectExpireAt = String(group.expireAt || 0);
    duration.dataset.affectPermanent = String(Boolean(group.permanent));
    duration.dataset.affectRemaining = String(group.remaining ?? 0);
    duration.textContent = group.permanent ? 'Permanent' : (group.durationText || 'Timed');
    toggle.append(disclosure, name, duration);
    row.append(toggle);
    countdownEntries.push({ node: duration, row });

    const details = document.createElement('div');
    details.id = detailsId;
    details.className = 'affect-row-details';
    details.hidden = !expanded;

    const detailItems = affectDetailEntries(group);
    if (detailItems.length > 0) {
      const detailList = document.createElement('ul');
      detailList.className = 'affect-details';
      for (const detail of detailItems) {
        const item = document.createElement('li');
        item.textContent = detail.text;
        if (detail.harmful) {
          item.dataset.tone = 'harmful';
          item.setAttribute('aria-label', `Harmful modifier: ${detail.text}`);
        }
        detailList.append(item);
      }
      details.append(detailList);
    }

    const source = document.createElement('p');
    source.className = 'affect-source';
    source.textContent = `Source: ${affectSourceLabel(group)}`;
    details.append(source);
    row.append(details);
    list.append(row);
  }

  const notes = [];
  if (!classicMode && snapshot.hiddenPermanent > 0) {
    notes.push(`${snapshot.hiddenPermanent} permanent equipment, implant, tattoo, or remort modifier${snapshot.hiddenPermanent === 1 ? ' was' : 's were'} omitted from this live packet so timed affects remain visible.`);
  }
  if (snapshot.truncated) notes.push('The server truncated the live list; use Text List for the complete command output.');
  note.textContent = notes.join(' ');
  note.hidden = notes.length === 0;
  summary.textContent = groups.length
    ? `Active affects: ${groups.map((group) => group.spell).join(', ')}.`
    : empty.textContent;

  affectsCountdownEntries = countdownEntries;
  state.affects.renderSignature = affectsRenderSignature(snapshot);
  updateAffectsCountdowns();
}

function processAffectsSnapshot(input) {
  if (!input || typeof input !== 'object') return false;
  const normalized = normalizeAffectsSnapshot(input);
  const signature = typeof affectsApi.snapshotSignature === 'function'
    ? affectsApi.snapshotSignature(normalized, { normalized: true })
    : JSON.stringify(normalized);
  if (signature === state.affects.signature) return false;

  const oldCount = state.affects.snapshot?.count || 0;
  const previousRenderSignature = state.affects.renderSignature;
  const nextRenderSignature = affectsRenderSignature(normalized);
  state.affects.snapshot = normalized;
  state.affects.receivedAtMs = Date.now();
  state.affects.signature = signature;
  state.affects.renderSignature = nextRenderSignature;
  if (nextRenderSignature !== previousRenderSignature || state.affects.renderDirty) renderAffects();
  else updateAffectsCountdowns();

  /* Affect changes are intentionally not announced automatically. Combat can
   * change several effects at once; deliberate panel review is accessible
   * without turning every state transition into speech or notification spam.
   */
  if (oldCount !== normalized.count) state.affects.lastAnnouncedRevision = normalized.revision;
  return true;
}

async function requestAffects(options = {}) {
  if (!state.connected) {
    if (options.announceRequest !== false) announce('Connect to NukeFire before refreshing affects.', { force: true });
    renderAffects();
    return false;
  }
  const sent = await sendActiveGmcp('NukeFire.Affects');
  $('#affects-status').textContent = 'Requested fresh affect data from NukeFire.';
  if (options.announceRequest) announce('Affects refresh requested.', { force: true });
  return sent !== false;
}


function normalizeMobInspectorSnapshot(input) {
  if (typeof mobInspectorApi.normalizeMobInfo === 'function') {
    return mobInspectorApi.normalizeMobInfo(input || {});
  }
  const source = input && typeof input === 'object' ? input : {};
  return {
    schema: Number(source.schema) || 1,
    trigger: String(source.trigger || 'request'),
    serverTime: Number(source.server_time || source.serverTime) || 0,
    affectsOmittedForSize: Boolean(source.affects_omitted_for_size || source.affectsOmittedForSize),
    context: source.context || { lookupArg: '', lookupHadArgument: false, resolvedFromCurrentTarget: false, roomVnum: 0, isCurrentTarget: false, inCombatWithPlayer: false },
    mob: source.mob || { vnum: 0, name: 'Unknown creature', flags: {} },
    health: source.health || { available: false, percent: 0 },
    zone: source.zone || { vnum: 0, name: 'Unknown', suggestedRemorts: 'Unknown' },
    consider: source.consider || { available: false },
    history: source.history || { available: false },
    zoneMastery: source.zone_mastery || source.zoneMastery || { available: false },
    affects: source.affects || { effects: [], count: 0, total: 0, truncated: false }
  };
}

function mobInspectorSnapshotSignature(input, options = {}) {
  return typeof mobInspectorApi.snapshotSignature === 'function'
    ? mobInspectorApi.snapshotSignature(input || {}, { normalized: options.normalized === true })
    : JSON.stringify(options.normalized === true ? input : normalizeMobInspectorSnapshot(input));
}

function mobInspectorNumber(value) {
  return Number.isFinite(Number(value)) ? Math.trunc(Number(value)).toLocaleString() : '0';
}

function mobInspectorStatsList(target, rows) {
  if (!target) return;
  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    if (row.value === null || row.value === undefined || row.value === '') continue;
    const wrapper = document.createElement('div');
    const term = document.createElement('dt');
    const value = document.createElement('dd');
    term.textContent = row.label;
    value.textContent = String(row.value);
    wrapper.append(term, value);
    fragment.append(wrapper);
  }
  target.replaceChildren(fragment);
}

function mobInspectorEffectSnapshot(snapshot) {
  const affects = snapshot?.affects || {};
  if (typeof affectsApi.normalizeAffectsState === 'function') {
    return affectsApi.normalizeAffectsState({
      schema: affects.schema || 1,
      serverTime: affects.serverTime || affects.server_time || 0,
      count: affects.count || 0,
      total: affects.total || 0,
      truncated: Boolean(affects.truncated),
      effects: Array.isArray(affects.effects) ? affects.effects : []
    });
  }
  return affects;
}

function mobInspectorEffectGroups(snapshot) {
  const effectSnapshot = mobInspectorEffectSnapshot(snapshot);
  if (typeof affectsApi.groupEffects === 'function') return affectsApi.groupEffects(effectSnapshot);
  return Array.isArray(effectSnapshot.effects) ? effectSnapshot.effects : [];
}

function mobInspectorEffectDuration(group, effectSnapshot) {
  if (group.permanent) return 'Permanent';
  if (typeof affectsApi.remainingSeconds === 'function' && typeof affectsApi.formatRemaining === 'function') {
    const remaining = affectsApi.remainingSeconds(group, effectSnapshot, state.mobInspector.receivedAtMs);
    return affectsApi.formatRemaining(remaining, false);
  }
  return group.durationText || `${Math.max(0, Number(group.remaining) || 0)}s`;
}

function mobInspectorEffectCard(group, effectSnapshot) {
  const card = document.createElement('details');
  card.className = 'mob-affect-card';
  card.setAttribute('role', 'listitem');

  const summary = document.createElement('summary');
  const name = document.createElement('strong');
  const duration = document.createElement('span');
  name.textContent = group.spell || 'Unknown effect';
  duration.textContent = mobInspectorEffectDuration(group, effectSnapshot);
  summary.append(name, duration);
  card.append(summary);

  const details = [];
  for (const modifier of group.modifiers || []) {
    if (!modifier.apply && !modifier.modifier) continue;
    const amount = Number(modifier.modifier) || 0;
    details.push(`${amount > 0 ? '+' : ''}${amount} ${modifier.apply || 'modifier'}`.trim());
  }
  for (const grant of group.grants || []) details.push(`Grants ${grant}`);
  if (group.sourceType && group.sourceType !== 'unknown') details.push(`Source: ${group.sourceType}`);

  if (details.length > 0) {
    const list = document.createElement('ul');
    list.className = 'mob-affect-details';
    for (const text of details) {
      const item = document.createElement('li');
      item.textContent = text;
      list.append(item);
    }
    card.append(list);
  }
  return card;
}

function mobInspectorNameMatches(left, right) {
  if (typeof mobInspectorApi.namesMatch === 'function') return mobInspectorApi.namesMatch(left, right);
  const normalize = (value) => String(value || '').normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase();
  const a = normalize(left);
  const b = normalize(right);
  return Boolean(a && b && a === b);
}

function mobInspectorMatchesOpponent(snapshot, opponent) {
  if (typeof mobInspectorApi.matchesOpponent === 'function') {
    return mobInspectorApi.matchesOpponent(snapshot, opponent, { normalized: true });
  }
  const mobVnum = Number(snapshot?.mob?.vnum) || 0;
  const opponentVnum = Number(opponent?.vnum) || 0;
  if (mobVnum > 0 && opponentVnum > 0) return mobVnum === opponentVnum;
  return mobInspectorNameMatches(snapshot?.mob?.name, opponent?.name);
}

function combatVitalsModelForGmcp(gmcp = state.gmcp) {
  const rawVitals = gmcp?.char?.vitals;
  const maxStats = gmcp?.char?.maxStats;
  if (rawVitals && typeof rawVitals === 'object' && !Array.isArray(rawVitals)) {
    const cached = combatVitalsModelCache.get(rawVitals);
    if (cached && cached.maxStats === maxStats) return cached.model;
  }

  const model = typeof combatVitalsApi.normalizeVitals === 'function'
    ? combatVitalsApi.normalizeVitals(rawVitals || {}, maxStats || {})
    : (() => {
        const vitals = rawVitals || {};
        const maxima = maxStats || {};
        return {
          hp: numberFrom(vitals, ['hp', 'health', 'currenthp', 'currentHp']),
          maxHp: numberFrom(vitals, ['mhp', 'maxhp', 'maxHp']) ?? numberFrom(maxima, ['maxhp', 'maxHp']),
          mana: numberFrom(vitals, ['mana', 'mp', 'currentmana', 'currentMana']),
          maxMana: numberFrom(vitals, ['mmana', 'maxmana', 'maxMana', 'maxmp', 'maxMp']) ?? numberFrom(maxima, ['maxmana', 'maxMana']),
          move: numberFrom(vitals, ['move', 'moves', 'mv', 'movement']),
          maxMove: numberFrom(vitals, ['mmove', 'maxmove', 'maxMove', 'maxmoves', 'maxMoves', 'maxmv']) ?? numberFrom(maxima, ['maxmoves', 'maxMoves', 'maxmove', 'maxMove']),
          opponent: vitals?.opponent
            ? (typeof combatVitalsApi.normalizeOpponent === 'function'
              ? combatVitalsApi.normalizeOpponent(vitals.opponent)
              : combatEntity(vitals.opponent, 'opponent'))
            : null
        };
      })();

  if (rawVitals && typeof rawVitals === 'object' && !Array.isArray(rawVitals)) {
    combatVitalsModelCache.set(rawVitals, { maxStats, model });
  }
  return model;
}

function currentCombatVitals() {
  return combatVitalsModelForGmcp(state.gmcp);
}

function currentCombatOpponent() {
  return currentCombatVitals().opponent || null;
}

function mobInspectorCurrentOpponent() {
  return currentCombatOpponent();
}

function mobInspectorCurrentRoomId() {
  return mapperRoomId(state.gmcp?.room?.info);
}

function mobInspectorRankLabel(snapshot) {
  if (snapshot?.mob?.flags?.boss) return 'BOSS';
  if (snapshot?.mob?.flags?.miniboss) return 'MINI';
  return '';
}

function renderMobInspectorIcon(category, snapshot) {
  const art = $('#mob-inspector-art');
  const badge = $('#mob-inspector-rank-badge');
  if (!art || !badge) return;
  const id = category?.id || 'creature';
  const rank = mobInspectorRankLabel(snapshot);
  const iconSignature = `${id}|${rank}`;
  if (art.dataset.iconSignature === iconSignature) return;
  art.dataset.category = id;
  art.dataset.iconSignature = iconSignature;
  art.replaceChildren();
  const definition = typeof mobInspectorApi.iconDefinition === 'function'
    ? mobInspectorApi.iconDefinition(id)
    : { viewBox: '0 0 48 48', paths: [] };
  art.setAttribute('viewBox', definition.viewBox || '0 0 48 48');
  for (const pathData of definition.paths || []) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    art.append(path);
  }
  badge.textContent = rank;
  badge.hidden = !rank;
}

function mobInspectorSetMode(modeValue) {
  const mode = modeValue === 'compact' ? 'compact' : 'expanded';
  state.mobInspector.mode = mode;
  const panel = $('#panel-mob-inspector');
  if (panel) panel.dataset.mobInspectorMode = mode;
  return mode;
}

function resetMobInspectorTransientState(options = {}) {
  state.mobInspector.snapshot = normalizeMobInspectorSnapshot({});
  state.mobInspector.receivedAtMs = 0;
  state.mobInspector.signature = '';
  state.mobInspector.roomId = '';
  state.mobInspector.mode = 'expanded';
  state.mobInspector.combatRefreshKey = '';
  state.mobInspector.liveHealthSignature = '';
  state.mobInspector.lastTargetAffectsRequestMs = 0;
  state.mobInspector.pendingCombatKillRefresh = false;
  state.mobInspector.lastCombatKillRefreshMs = 0;
  state.mobInspector.renderDirty = true;
  state.mobInspector.summaryIdentityText = '';
  state.mobInspector.summaryConsiderText = '';
  state.mobInspector.effectGroupCount = 0;
  if (options.keepOpponent !== true) state.mobInspector.lastOpponentKey = '';
}

function hideMobInspectorTransient(options = {}) {
  if (options.clear !== false) resetMobInspectorTransientState({ keepOpponent: options.keepOpponent });
  if (state.workspace.activePanels.mobInspector === true) {
    applyPanelVisibility({
      ...state.workspace.activePanels,
      mobInspector: false
    }, { persist: false });
  }
  renderMobInspector();
}

function setMobInspectorAutoOpen(enabled, options = {}) {
  const value = Boolean(enabled);
  state.mobInspector.autoOpen = value;
  const control = $('#mob-inspector-auto-open');
  if (control) control.checked = value;
  if (options.persist !== false) localStorage.setItem('nukefire.mobInspectorAutoOpen', String(value));
  if (options.announceChange) {
    announce(`Mob Inspector auto-open ${value ? 'enabled' : 'disabled'}.`, { force: true });
  }
}

function showMobInspectorPanel() {
  if (state.workspace.activePanels.mobInspector === true) return;
  applyPanelVisibility({
    ...state.workspace.activePanels,
    mobInspector: true
  }, { persist: false });
}

const MOB_INSPECTOR_TARGET_AFFECT_REFRESH_MS = 1000;
const MOB_INSPECTOR_KILL_FOLLOWUP_REFRESH_MS = 500;
const COMBAT_TARGET_PRESENTATION_HOLD_MS = 50;

let combatTargetPresentationHoldUntilMs = 0;
let combatTargetPresentationHoldTimer = null;
let combatTargetPresentationHoldSessionId = '';

function combatTargetPresentationHoldActive() {
  if (Date.now() >= combatTargetPresentationHoldUntilMs) return false;
  const activeId = String(activeSessionRecord()?.id || '');
  return !combatTargetPresentationHoldSessionId || activeId === combatTargetPresentationHoldSessionId;
}

function scheduleCombatTargetPresentationFlush() {
  if (combatTargetPresentationHoldTimer !== null) return false;
  const remaining = Math.max(1, combatTargetPresentationHoldUntilMs - Date.now());
  combatTargetPresentationHoldTimer = setTimeout(() => {
    combatTargetPresentationHoldTimer = null;
    const stillRemaining = combatTargetPresentationHoldUntilMs - Date.now();
    if (stillRemaining > 0) {
      scheduleCombatTargetPresentationFlush();
      return;
    }

    const sessionId = combatTargetPresentationHoldSessionId;
    combatTargetPresentationHoldUntilMs = 0;
    combatTargetPresentationHoldSessionId = '';
    if (sessionId && String(activeSessionRecord()?.id || '') !== sessionId) return;
    if (typeof document === 'undefined' || !document.documentElement) return;

    // A suppressed empty transition never updated these signatures/sources.
    // Force one final authoritative reconciliation after the kill burst settles.
    opponentVitalsRenderSignature = '';
    groupVitalsRenderSignature = '';
    groupVitalsRenderSource = UNSET_GROUP_SOURCE;
    renderOpponentVitals();
    renderGroupVitals();
    syncMobInspectorCombatLifecycle();
  }, remaining);
  return true;
}

function beginCombatTargetPresentationHold() {
  const activeId = String(activeSessionRecord()?.id || '');
  if (combatTargetPresentationHoldSessionId && activeId !== combatTargetPresentationHoldSessionId) {
    combatTargetPresentationHoldUntilMs = 0;
  }
  combatTargetPresentationHoldSessionId = activeId;
  combatTargetPresentationHoldUntilMs = Math.max(
    combatTargetPresentationHoldUntilMs,
    Date.now() + COMBAT_TARGET_PRESENTATION_HOLD_MS
  );
}

function deferCombatTargetPresentationClear() {
  if (!combatTargetPresentationHoldActive()) return false;
  scheduleCombatTargetPresentationFlush();
  return true;
}

let combatKillTargetRefreshQueued = false;
let combatKillTargetRefreshSessionId = '';

function scheduleCombatKillTargetRefresh() {
  const sessionId = String(activeSessionRecord()?.id || '');
  if (combatKillTargetRefreshQueued) return false;

  combatKillTargetRefreshQueued = true;
  combatKillTargetRefreshSessionId = sessionId;
  queueMicrotask(() => {
    const scheduledSessionId = combatKillTargetRefreshSessionId;
    combatKillTargetRefreshQueued = false;
    combatKillTargetRefreshSessionId = '';

    if (scheduledSessionId && String(activeSessionRecord()?.id || '') !== scheduledSessionId) return;
    if (!mobInspectorCurrentOpponent()?.name) return;

    state.mobInspector.lastCombatKillRefreshMs = Date.now();
    void requestMobInspector({ announceRequest: false });
    void requestMobInspectorTargetAffects({ force: true });
  });
  return true;
}

function mobInspectorOpponentKey(opponent = mobInspectorCurrentOpponent()) {
  if (!opponent?.name) return '';
  const instanceId = Number(opponent.instanceId ?? opponent.instance_id) || 0;
  if (instanceId > 0) return `instance:${instanceId}`;
  return `${Number(opponent.vnum) || 0}:${String(opponent.name).trim().toLocaleLowerCase()}`;
}

function mobInspectorOtherEngagedCountForOpponent(opponent, groupSource = state.gmcp?.group ?? null) {
  const opponentKey = mobInspectorOpponentKey(opponent);
  if (!opponentKey) return 0;
  if (mobInspectorEngagedGroupSource === groupSource && mobInspectorEngagedOpponentKey === opponentKey) {
    return mobInspectorEngagedCountCache;
  }

  const enemies = groupCombatState().enemies || [];
  let count = 0;
  if (enemies.length > 1) {
    const currentIndex = enemies.findIndex((enemy) => {
      const enemyVnum = Number(enemy?.vnum) || 0;
      const opponentVnum = Number(opponent?.vnum) || 0;
      if (enemyVnum > 0 && opponentVnum > 0) return enemyVnum === opponentVnum;
      return mobInspectorNameMatches(enemy?.name, opponent?.name);
    });
    if (currentIndex >= 0) count = Math.max(0, enemies.length - 1);
  }

  mobInspectorEngagedGroupSource = groupSource;
  mobInspectorEngagedOpponentKey = opponentKey;
  mobInspectorEngagedCountCache = count;
  return count;
}

function mobInspectorCombatContext(snapshot = state.mobInspector.snapshot) {
  const opponent = mobInspectorCurrentOpponent();
  const groupSource = state.gmcp?.group ?? null;
  if (mobInspectorCombatContextSnapshot === snapshot &&
      mobInspectorCombatContextOpponent === opponent &&
      mobInspectorCombatContextGroupSource === groupSource &&
      mobInspectorCombatContextCache) {
    return mobInspectorCombatContextCache;
  }

  const matches = Boolean(opponent?.name && mobInspectorMatchesOpponent(snapshot, opponent));
  let liveHealth = snapshot.health;
  if (matches) {
    const current = Number(opponent.hp);
    const maximum = Number(opponent.maxHp);
    if (Number.isFinite(current) && Number.isFinite(maximum) && maximum > 0) {
      const rawPercent = typeof combatVitalsApi.healthPercent === 'function'
        ? combatVitalsApi.healthPercent(opponent)
        : current / maximum * 100;
      liveHealth = {
        ...snapshot.health,
        available: true,
        current: Math.trunc(current),
        max: Math.trunc(maximum),
        percent: Math.max(0, Math.min(100, Math.round(rawPercent)))
      };
    }
  }

  const context = {
    opponent,
    matches,
    opponentName: matches ? opponent.name : '',
    liveHealth,
    otherEngaged: matches ? mobInspectorOtherEngagedCountForOpponent(opponent, groupSource) : 0
  };
  mobInspectorCombatContextSnapshot = snapshot;
  mobInspectorCombatContextOpponent = opponent;
  mobInspectorCombatContextGroupSource = groupSource;
  mobInspectorCombatContextCache = context;
  return context;
}

function mobInspectorTargetAffectsMatches(snapshot, affectsInput) {
  const target = affectsInput?.target;
  if (!target || typeof target !== 'object') return false;
  const mobInstance = Number(snapshot?.mob?.instanceId ?? snapshot?.mob?.instance_id) || 0;
  const targetInstance = Number(target?.instance_id ?? target?.instanceId) || 0;
  if (mobInstance > 0 && targetInstance > 0) return mobInstance === targetInstance;
  const mobVnum = Number(snapshot?.mob?.vnum) || 0;
  const targetVnum = Number(target?.vnum) || 0;
  if (mobVnum > 0 && targetVnum > 0) return mobVnum === targetVnum;
  return mobInspectorNameMatches(snapshot?.mob?.name, target?.name);
}

function processMobInspectorTargetAffects(input) {
  if (!input || typeof input !== 'object') return false;
  const snapshot = state.mobInspector.snapshot;
  if (!state.mobInspector.receivedAtMs || Number(snapshot.mob?.vnum) <= 0) return false;
  const opponent = mobInspectorCurrentOpponent();
  if (opponent?.name && !mobInspectorMatchesOpponent(snapshot, opponent)) return false;
  if (!mobInspectorTargetAffectsMatches(snapshot, input)) return false;
  const affects = typeof mobInspectorApi.normalizeAffects === 'function'
    ? mobInspectorApi.normalizeAffects(input)
    : input;
  state.mobInspector.snapshot = normalizeMobInspectorSnapshot({ ...snapshot, affects });
  state.mobInspector.signature = mobInspectorSnapshotSignature(state.mobInspector.snapshot);
  renderMobInspector();
  return true;
}

async function requestMobInspectorTargetAffects(options = {}) {
  if (!state.connected || !mobInspectorCurrentOpponent()?.name) return false;
  const now = Date.now();
  const last = Number(state.mobInspector.lastTargetAffectsRequestMs) || 0;
  if (options.force !== true && now - last < MOB_INSPECTOR_TARGET_AFFECT_REFRESH_MS) return false;
  state.mobInspector.lastTargetAffectsRequestMs = now;
  return (await sendActiveGmcp('Char.TargetAffects')) !== false;
}

function prepareMobInspectorCombatHandoff(opponent = mobInspectorCurrentOpponent()) {
  const opponentKey = mobInspectorOpponentKey(opponent);
  resetMobInspectorTransientState({ keepOpponent: true });
  state.mobInspector.lastOpponentKey = opponentKey;
  state.mobInspector.mode = 'compact';
  state.mobInspector.lastTargetAffectsRequestMs = 0;
  if (state.mobInspector.autoOpen !== false) showMobInspectorPanel();
  renderMobInspector();
}

function mobInspectorTriggerLabel(trigger) {
  const labels = {
    mobcount: 'Mobcount',
    consider: 'Consider',
    diagnose: 'Diagnose',
    request: 'Target refresh',
    auto: 'Combat target'
  };
  return labels[String(trigger || '').toLocaleLowerCase()] || 'NukeFire';
}

function updateMobInspectorLiveCombat() {
  if (!panelHasLiveSurface('mobInspector')) {
    state.mobInspector.renderDirty = true;
    return false;
  }
  const snapshot = state.mobInspector.snapshot;
  if (!state.mobInspector.receivedAtMs || Number(snapshot.mob?.vnum) <= 0) return false;
  state.mobInspector.renderDirty = false;

  const combat = mobInspectorCombatContext(snapshot);
  const liveHealth = combat.liveHealth;
  const healthAvailable = liveHealth.available === true;
  const hp = $('#mob-inspector-hp');
  if (hp && hp.value !== (healthAvailable ? liveHealth.percent : 0)) hp.value = healthAvailable ? liveHealth.percent : 0;
  setAttributeIfChanged(hp, 'aria-valuetext', healthAvailable ? `${liveHealth.percent} percent` : 'Unavailable');
  setTextIfChanged($('#mob-inspector-hp-text'), healthAvailable
    ? `${liveHealth.percent}% · ${mobInspectorNumber(liveHealth.current)} / ${mobInspectorNumber(liveHealth.max)}`
    : 'HP unavailable');

  const opponentName = combat.opponentName;
  const otherEngaged = combat.otherEngaged;
  setTextIfChanged($('#mob-inspector-fighting'), opponentName
    ? `Current opponent: ${opponentName}${otherEngaged > 0 ? ` · +${otherEngaged.toLocaleString()} other enem${otherEngaged === 1 ? 'y' : 'ies'} engaged` : ''}`
    : (snapshot.health.fighting ? `Fighting ${snapshot.health.fighting}` : 'Not currently reported as fighting anyone.'));

  const speechBits = [`Mob Inspector: ${snapshot.mob.name}`];
  if (state.mobInspector.summaryIdentityText) speechBits.push(state.mobInspector.summaryIdentityText);
  if (healthAvailable) speechBits.push(`${liveHealth.percent} percent health`);
  if (state.mobInspector.summaryConsiderText) speechBits.push(state.mobInspector.summaryConsiderText);
  if (state.mobInspector.effectGroupCount > 0) {
    speechBits.push(`${state.mobInspector.effectGroupCount} active effect${state.mobInspector.effectGroupCount === 1 ? '' : 's'}`);
  }
  setTextIfChanged($('#mob-inspector-summary'), `${speechBits.join('. ')}.`);
  schedulePanelPopoutPublish('mobInspector');
  return true;
}

function renderMobInspector() {
  if (!panelHasLiveSurface('mobInspector')) {
    state.mobInspector.renderDirty = true;
    return;
  }
  state.mobInspector.renderDirty = false;
  const panel = $('#panel-mob-inspector');
  const empty = $('#mob-inspector-empty');
  const content = $('#mob-inspector-content');
  const status = $('#mob-inspector-status');
  const summary = $('#mob-inspector-summary');
  const refresh = $('#mob-inspector-refresh');
  const autoOpen = $('#mob-inspector-auto-open');
  if (!panel || !empty || !content || !status || !summary || !refresh || !autoOpen) return;

  const snapshot = state.mobInspector.snapshot;
  const hasMob = state.mobInspector.receivedAtMs > 0 && Number(snapshot.mob?.vnum) > 0;
  const mode = mobInspectorSetMode(state.mobInspector.mode);
  autoOpen.checked = state.mobInspector.autoOpen !== false;
  refresh.disabled = !state.connected;
  empty.hidden = hasMob;
  content.hidden = !hasMob;

  if (!hasMob) {
    const pendingOpponent = mobInspectorCurrentOpponent();
    empty.textContent = state.connected && pendingOpponent?.name
      ? `Loading current combat target: ${pendingOpponent.name}…`
      : state.connected
        ? 'Use mobcount, consider, or diagnose on a visible mob to inspect it here.'
        : 'Connect to NukeFire to inspect mobs.';
    status.textContent = state.connected && pendingOpponent?.name
      ? 'Refreshing the authoritative current combat target.'
      : state.connected ? 'Waiting for a mob inspection.' : 'Disconnected. Mob data is unavailable.';
    summary.textContent = empty.textContent;
    schedulePanelPopoutPublish('mobInspector');
    return;
  }

  const category = typeof mobInspectorApi.category === 'function'
    ? mobInspectorApi.category(snapshot, { normalized: true })
    : { id: 'creature', label: 'Creature' };
  const descriptors = typeof mobInspectorApi.descriptorLabels === 'function'
    ? mobInspectorApi.descriptorLabels(snapshot, { normalized: true })
    : [];
  const identityParts = [...descriptors];
  if (snapshot.mob.remorts > 0) identityParts.push(`${mobInspectorNumber(snapshot.mob.remorts)}R`);
  if (mode !== 'compact' && snapshot.mob.level > 0) identityParts.push(`Level ${mobInspectorNumber(snapshot.mob.level)}`);

  setTextIfChanged($('#mob-inspector-name'), snapshot.mob.name);
  setTextIfChanged($('#mob-inspector-descriptors'), identityParts.join(' · ') || category.label);
  const zoneBits = [];
  if (snapshot.zone.vnum > 0) zoneBits.push(`Zone ${snapshot.zone.vnum}`);
  if (snapshot.zone.name && snapshot.zone.name !== 'Unknown') zoneBits.push(snapshot.zone.name);
  if (snapshot.zone.suggestedRemorts && snapshot.zone.suggestedRemorts !== 'Unknown') zoneBits.push(snapshot.zone.suggestedRemorts);
  setTextIfChanged($('#mob-inspector-zone'), zoneBits.join(' · ') || 'Zone information unavailable');
  renderMobInspectorIcon(category, snapshot);

  const combat = mobInspectorCombatContext(snapshot);
  const liveHealth = combat.liveHealth;
  const healthAvailable = liveHealth.available === true;
  const hp = $('#mob-inspector-hp');
  if (hp.value !== (healthAvailable ? liveHealth.percent : 0)) hp.value = healthAvailable ? liveHealth.percent : 0;
  setAttributeIfChanged(hp, 'aria-valuetext', healthAvailable ? `${liveHealth.percent} percent` : 'Unavailable');
  setTextIfChanged($('#mob-inspector-hp-text'), healthAvailable
    ? `${liveHealth.percent}% · ${mobInspectorNumber(liveHealth.current)} / ${mobInspectorNumber(liveHealth.max)}`
    : 'HP unavailable');
  const opponentName = combat.opponentName;
  const otherEngaged = combat.otherEngaged;
  setTextIfChanged($('#mob-inspector-fighting'), opponentName
    ? `Current opponent: ${opponentName}${otherEngaged > 0 ? ` · +${otherEngaged.toLocaleString()} other enem${otherEngaged === 1 ? 'y' : 'ies'} engaged` : ''}`
    : (snapshot.health.fighting ? `Fighting ${snapshot.health.fighting}` : 'Not currently reported as fighting anyone.'));

  const considerSection = $('#mob-inspector-consider-section');
  considerSection.hidden = snapshot.consider.available !== true;
  if (snapshot.consider.available) {
    $('#mob-inspector-consider-label').textContent = snapshot.consider.label || 'Consider result';
    $('#mob-inspector-consider-advice').textContent = snapshot.consider.advice || '';
    $('#mob-inspector-consider-group').textContent = snapshot.consider.groupSize > 1
      ? `${snapshot.consider.groupLabel} · ${snapshot.consider.groupSize} characters · average ${mobInspectorNumber(snapshot.consider.groupAvgRemorts)}R`
      : `${snapshot.consider.groupLabel || 'Solo'} assessment`;
  }

  const historyRows = snapshot.history.available ? [
    { label: 'Your kills', value: mobInspectorNumber(snapshot.history.yourKills) },
    { label: 'World kills', value: mobInspectorNumber(snapshot.history.worldKills) },
    { label: 'Your rank', value: snapshot.history.yourRank > 0 ? `#${mobInspectorNumber(snapshot.history.yourRank)}` : 'Unranked' },
    { label: 'Live in zone', value: mobInspectorNumber(snapshot.history.liveZone) },
    { label: 'Live in world', value: mobInspectorNumber(snapshot.history.liveWorld) }
  ] : [{ label: 'Mob history', value: 'Unavailable' }];
  mobInspectorStatsList($('#mob-inspector-history'), historyRows);
  const unavailable = [];
  if (!snapshot.history.exactMobDeathsAvailable) unavailable.push('deaths to this exact mob');
  if (!snapshot.history.lastKillAvailable) unavailable.push('last-kill time');
  $('#mob-inspector-history-note').textContent = unavailable.length
    ? `Not yet recorded per mob: ${unavailable.join(' and ')}. Zone Mastery below remains zone-wide.`
    : '';

  const masterySection = $('#mob-inspector-mastery-section');
  masterySection.hidden = snapshot.zoneMastery.available !== true;
  if (snapshot.zoneMastery.available) {
    mobInspectorStatsList($('#mob-inspector-mastery'), [
      { label: 'Zone kills', value: mobInspectorNumber(snapshot.zoneMastery.kills) },
      { label: 'Zone deaths', value: mobInspectorNumber(snapshot.zoneMastery.deaths) },
      { label: 'Boss kills', value: mobInspectorNumber(snapshot.zoneMastery.bossKills) },
      { label: 'Miniboss kills', value: mobInspectorNumber(snapshot.zoneMastery.minibossKills) },
      { label: 'Toughest kill', value: snapshot.zoneMastery.toughestKill || 'None recorded' }
    ]);
  }

  const effectSnapshot = mobInspectorEffectSnapshot(snapshot);
  const effectGroups = mobInspectorEffectGroups(snapshot);
  const visibleEffectLimit = mode === 'compact' ? 4 : 6;
  const primaryEffects = effectGroups.slice(0, visibleEffectLimit);
  const overflowEffects = effectGroups.slice(visibleEffectLimit);
  const effectList = $('#mob-inspector-affects');
  const overflowList = $('#mob-inspector-affects-overflow');
  effectList.replaceChildren(...primaryEffects.map((group) => mobInspectorEffectCard(group, effectSnapshot)));
  overflowList.replaceChildren(...overflowEffects.map((group) => mobInspectorEffectCard(group, effectSnapshot)));
  $('#mob-inspector-affects-count').textContent = `${effectGroups.length} active`;
  const more = $('#mob-inspector-affects-more');
  more.hidden = overflowEffects.length === 0;
  more.open = false;
  more.querySelector('summary').textContent = overflowEffects.length ? `+ ${overflowEffects.length} more` : '';
  const affectNotes = [];
  if (snapshot.affectsOmittedForSize) affectNotes.push('Effect details were omitted because the complete Mob Inspector packet was too large.');
  if (effectSnapshot.truncated) {
    const omitted = Math.max(0, Number(snapshot.affects?.omittedCount || snapshot.affects?.omitted_count || 0));
    affectNotes.push(omitted > 0 ? `${omitted} additional effect rows were omitted by the server.` : 'The server truncated the effect list.');
  }
  if (effectGroups.length === 0 && !snapshot.affectsOmittedForSize) affectNotes.push('No active effects reported.');
  const affectNote = $('#mob-inspector-affects-note');
  affectNote.textContent = affectNotes.join(' ');
  affectNote.hidden = affectNotes.length === 0;

  setTextIfChanged(status, `${snapshot.mob.name} · ${mobInspectorTriggerLabel(snapshot.trigger)} · ${mode === 'compact' ? 'combat view' : 'expanded view'} · server-authoritative`);
  state.mobInspector.summaryIdentityText = identityParts.join(', ');
  state.mobInspector.summaryConsiderText = snapshot.consider.available && snapshot.consider.label ? snapshot.consider.label : '';
  state.mobInspector.effectGroupCount = effectGroups.length;
  const speechBits = [`Mob Inspector: ${snapshot.mob.name}`];
  if (identityParts.length) speechBits.push(identityParts.join(', '));
  if (healthAvailable) speechBits.push(`${liveHealth.percent} percent health`);
  if (snapshot.consider.available && snapshot.consider.label) speechBits.push(snapshot.consider.label);
  if (mode !== 'compact' && snapshot.history.available) speechBits.push(`${mobInspectorNumber(snapshot.history.yourKills)} personal kills`);
  if (effectGroups.length) speechBits.push(`${effectGroups.length} active effect${effectGroups.length === 1 ? '' : 's'}`);
  setTextIfChanged(summary, `${speechBits.join('. ')}.`);
  schedulePanelPopoutPublish('mobInspector');
}

function processMobInspectorSnapshot(input, options = {}) {
  if (!input || typeof input !== 'object') {
    if (options.reset) {
      resetMobInspectorTransientState();
      renderMobInspector();
      return true;
    }
    return false;
  }

  if (typeof mobInspectorApi.isClearPacket === 'function' && mobInspectorApi.isClearPacket(input)) {
    if (state.mobInspector.pendingCombatKillRefresh === true && deferCombatTargetPresentationClear()) return true;
    /* NukeFire.Mob is a current-target request. A no-target response resolves
     * compact/loading combat state, but must not erase an explicit expanded
     * consider/diagnose snapshot the player chose to keep open. */
    if (state.mobInspector.mode === 'compact' || state.mobInspector.lastOpponentKey || !state.mobInspector.receivedAtMs) {
      hideMobInspectorTransient({ clear: true });
    }
    return true;
  }

  const normalized = normalizeMobInspectorSnapshot(input);
  if (Number(normalized.mob?.vnum) <= 0) return false;
  const currentOpponent = mobInspectorCurrentOpponent();
  const packetIsCurrentCombatTarget = normalized.context?.isCurrentTarget === true || normalized.context?.resolvedFromCurrentTarget === true;
  if (packetIsCurrentCombatTarget && !currentOpponent?.name) {
    if (state.mobInspector.pendingCombatKillRefresh === true && deferCombatTargetPresentationClear()) return false;
    // A current-target response that arrives after target loss must never
    // resurrect a dead/escaped mob in the transient Inspector.
    if (state.mobInspector.mode === 'compact' || state.mobInspector.lastOpponentKey) {
      hideMobInspectorTransient({ clear: true });
    }
    return false;
  }
  if (currentOpponent?.name && (!mobInspectorMatchesOpponent(normalized, currentOpponent) || !packetIsCurrentCombatTarget)) {
    const opponentKey = mobInspectorOpponentKey(currentOpponent);
    if (state.mobInspector.combatRefreshKey !== opponentKey) {
      state.mobInspector.combatRefreshKey = opponentKey;
      void requestMobInspector({ announceRequest: false });
    }
    return false;
  }
  const signature = mobInspectorSnapshotSignature(normalized, { normalized: true });
  if (signature === state.mobInspector.signature && options.force !== true) return false;

  state.mobInspector.snapshot = normalized;
  state.mobInspector.receivedAtMs = Date.now();
  state.mobInspector.signature = signature;
  state.mobInspector.roomId = String(normalized.context?.roomVnum || mobInspectorCurrentRoomId() || '');
  if (state.mobInspector.pendingCombatKillRefresh === true &&
      (!normalized.health?.available || Number(normalized.health?.current) > 0)) {
    state.mobInspector.pendingCombatKillRefresh = false;
    state.mobInspector.lastCombatKillRefreshMs = 0;
  }
  const opponent = mobInspectorCurrentOpponent();
  const combatMatch = Boolean(opponent?.name && mobInspectorMatchesOpponent(normalized, opponent));
  mobInspectorSetMode(combatMatch || normalized.context?.inCombatWithPlayer || normalized.context?.isCurrentTarget ? 'compact' : 'expanded');
  if (combatMatch) {
    state.mobInspector.lastOpponentKey = mobInspectorOpponentKey(opponent);
    state.mobInspector.combatRefreshKey = state.mobInspector.lastOpponentKey;
    state.mobInspector.liveHealthSignature = `${state.mobInspector.lastOpponentKey}|${opponent.hp ?? ''}|${opponent.maxHp ?? ''}`;
  }
  if (options.autoOpen !== false && state.mobInspector.autoOpen !== false) showMobInspectorPanel();
  renderMobInspector();
  return true;
}

async function requestMobInspector(options = {}) {
  if (!state.connected) {
    if (options.announceRequest !== false) announce('Connect to NukeFire before refreshing the Mob Inspector.', { force: true });
    renderMobInspector();
    return false;
  }
  const sent = await sendActiveGmcp('NukeFire.Mob');
  const status = $('#mob-inspector-status');
  if (status) status.textContent = 'Requested the current fighting target from NukeFire.';
  if (options.announceRequest) announce('Mob Inspector target refresh requested.', { force: true });
  return sent !== false;
}

function syncMobInspectorRoomLifecycle(roomInfo) {
  if (!state.mobInspector.receivedAtMs) return false;
  const currentRoomId = mapperRoomId(roomInfo || state.gmcp?.room?.info);
  if (!currentRoomId) return false;
  if (!state.mobInspector.roomId) {
    state.mobInspector.roomId = String(currentRoomId);
    return false;
  }
  if (String(currentRoomId) === String(state.mobInspector.roomId)) return false;
  hideMobInspectorTransient({ clear: true });
  return true;
}

function syncMobInspectorCombatLifecycle() {
  const opponent = mobInspectorCurrentOpponent();
  const opponentKey = mobInspectorOpponentKey(opponent);
  const previousKey = state.mobInspector.lastOpponentKey || '';
  const snapshot = state.mobInspector.snapshot;
  const hasMob = state.mobInspector.receivedAtMs > 0 && Number(snapshot.mob?.vnum) > 0;
  const healthSignature = opponentKey ? `${opponentKey}|${opponent?.hp ?? ''}|${opponent?.maxHp ?? ''}` : '';
  const combat = mobInspectorCombatContext(snapshot);
  if (opponentKey && state.mobInspector.pendingCombatKillRefresh === true) {
    const now = Date.now();
    const lastKillRefresh = Number(state.mobInspector.lastCombatKillRefreshMs) || 0;
    if (now - lastKillRefresh >= MOB_INSPECTOR_KILL_FOLLOWUP_REFRESH_MS) {
      state.mobInspector.lastCombatKillRefreshMs = now;
      void requestMobInspector({ announceRequest: false });
      void requestMobInspectorTargetAffects({ force: true });
    }
  }

  if (opponentKey === previousKey) {
    const sameInspectedMob = hasMob && combat.matches;
    if (opponentKey && !sameInspectedMob && state.mobInspector.combatRefreshKey !== opponentKey) {
      state.mobInspector.combatRefreshKey = opponentKey;
      void requestMobInspector({ announceRequest: false });
      return true;
    }
    if (sameInspectedMob && state.mobInspector.mode !== 'compact') {
      mobInspectorSetMode('compact');
      if (state.mobInspector.autoOpen !== false) showMobInspectorPanel();
      renderMobInspector();
      return true;
    }
    if (sameInspectedMob && state.mobInspector.mode === 'compact' && healthSignature !== state.mobInspector.liveHealthSignature) {
      state.mobInspector.liveHealthSignature = healthSignature;
      updateMobInspectorLiveCombat();
    }
    if (sameInspectedMob && state.mobInspector.mode === 'compact') void requestMobInspectorTargetAffects();
    return false;
  }

  state.mobInspector.lastOpponentKey = opponentKey;
  state.mobInspector.liveHealthSignature = healthSignature;

  if (!opponentKey) {
    if (previousKey && state.mobInspector.pendingCombatKillRefresh === true &&
        deferCombatTargetPresentationClear()) {
      // Keep the prior identity only as presentation handoff context. The
      // authoritative Char.Vitals state above is already targetless.
      state.mobInspector.lastOpponentKey = previousKey;
      return false;
    }
    state.mobInspector.combatRefreshKey = '';
    // Target loss also resolves an in-flight handoff that never received a
    // Mob.Info packet (for example an instant kill). Do not leave the panel
    // stranded on "Loading current combat target" after combat has ended.
    if ((hasMob && state.mobInspector.mode === 'compact') ||
        (!hasMob && previousKey && state.mobInspector.mode === 'compact')) {
      hideMobInspectorTransient({ clear: true });
      return true;
    }
    return false;
  }

  const sameInspectedMob = hasMob && combat.matches;
  if (sameInspectedMob) {
    mobInspectorSetMode('compact');
    if (state.mobInspector.autoOpen !== false) showMobInspectorPanel();
    renderMobInspector();
  } else {
    prepareMobInspectorCombatHandoff(opponent);
  }

  if (state.mobInspector.combatRefreshKey !== opponentKey) {
    state.mobInspector.combatRefreshKey = opponentKey;
    void requestMobInspector({ announceRequest: false });
  }
  void requestMobInspectorTargetAffects({ force: true });
  return true;
}

function contextArgumentControl(argument, actionId) {
  const wrapper = document.createElement('label');
  wrapper.className = 'context-action-field';
  const label = document.createElement('span');
  label.textContent = argument.label;
  const controlId = `context-${actionId}-${argument.id}`;
  let control;

  if (argument.type === 'select') {
    control = document.createElement('select');
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = argument.required ? 'Choose…' : 'Optional';
    control.append(placeholder);
    for (const option of argument.options || []) {
      const item = document.createElement('option');
      item.value = option.value;
      item.textContent = option.label;
      control.append(item);
    }
  } else {
    control = document.createElement('input');
    control.type = argument.type === 'number' ? 'number' : 'text';
    if (argument.placeholder) control.placeholder = argument.placeholder;
    if (argument.type === 'number') {
      if (argument.min !== null) control.min = String(argument.min);
      if (argument.max !== null) control.max = String(argument.max);
      control.step = '1';
    } else {
      control.maxLength = argument.maxLength || 80;
      control.autocomplete = 'off';
      control.spellcheck = false;
    }
  }

  control.id = controlId;
  control.name = argument.id;
  control.required = Boolean(argument.required);
  control.dataset.contextArgument = argument.id;
  wrapper.htmlFor = controlId;
  wrapper.append(label, control);
  if (argument.help) {
    const help = document.createElement('small');
    help.textContent = argument.help;
    wrapper.append(help);
  }
  return wrapper;
}

async function executeContextAction(action, values = {}) {
  if (!state.connected) {
    announce('Connect to NukeFire before using NukeFire Console.', { force: true });
    return false;
  }

  let command;
  try {
    command = typeof contextApi.buildActionCommand === 'function'
      ? contextApi.buildActionCommand(action, values)
      : action.command;
  } catch (error) {
    announce(error.message || String(error), { force: true });
    return false;
  }

  if (action.confirm && typeof window.confirm === 'function' && !window.confirm(action.confirm)) {
    return false;
  }

  await sendCommandAndRefocus(command);
  if (action.id === 'bigmap') {
    appendSystemMessage(`${action.label} requested; refreshing the server-confirmed inline-map state.`);
  }
  announce(`${action.label} sent.`, { force: false });
  clearTimeout(state.contextDeck.refreshTimer);
  state.contextDeck.refreshTimer = setTimeout(() => {
    void requestContextDeck({ announceRequest: false });
  }, 250);
  return true;
}

function contextActionElement(action, contextId) {
  const actionKey = `${contextId}-${action.id}`;
  if (!action.arguments?.length) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action.label;
    button.disabled = !action.enabled || !state.connected;
    button.className = action.style === 'primary'
      ? 'primary context-action-button'
      : action.style === 'danger'
        ? 'context-action-button danger'
        : 'context-action-button';
    if (!action.enabled && action.disabledReason) button.title = action.disabledReason;
    button.addEventListener('click', () => void executeContextAction(action));
    const wrapper = document.createElement('div');
    wrapper.className = 'context-action-simple';
    wrapper.append(button);
    if (action.help || (!action.enabled && action.disabledReason)) {
      const help = document.createElement('small');
      help.textContent = !action.enabled && action.disabledReason
        ? action.disabledReason
        : action.help;
      wrapper.append(help);
    }
    return wrapper;
  }

  const form = document.createElement('form');
  form.className = 'context-action-form';
  const heading = document.createElement('strong');
  heading.textContent = action.label;
  form.append(heading);
  if (action.help) {
    const help = document.createElement('p');
    help.textContent = action.help;
    form.append(help);
  }
  for (const argument of action.arguments) {
    form.append(contextArgumentControl(argument, actionKey));
  }
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = action.label;
  submit.disabled = !action.enabled || !state.connected;
  submit.className = action.style === 'primary'
    ? 'primary'
    : action.style === 'danger'
      ? 'danger'
      : '';
  form.append(submit);
  if (!action.enabled && action.disabledReason) {
    const reason = document.createElement('small');
    reason.textContent = action.disabledReason;
    form.append(reason);
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = {};
    for (const argument of action.arguments) {
      values[argument.id] = form.elements.namedItem(argument.id)?.value || '';
    }
    void executeContextAction(action, values);
  });
  return form;
}

function renderContextDeck() {
  if (deferSessionEventRender('context-deck', renderContextDeck)) return;
  if (!panelHasLiveSurface('contextDeck')) {
    state.contextDeck.renderDirty = true;
    return;
  }
  state.contextDeck.renderDirty = false;
  const container = $('#context-deck-cards');
  const empty = $('#context-deck-empty');
  const status = $('#context-deck-status');
  const summary = $('#context-deck-summary');
  const refresh = $('#context-deck-refresh');
  if (!container || !empty || !status || !summary || !refresh) return;

  const snapshot = state.contextDeck.snapshot;
  const contexts = Array.isArray(snapshot.contexts) ? snapshot.contexts : [];
  container.replaceChildren();
  empty.textContent = state.connected
    ? 'Waiting for NukeFire action data. Refresh Console can request it again.'
    : 'Connect to receive room and character actions.';
  empty.hidden = contexts.length > 0;
  refresh.disabled = !state.connected;

  if (!state.connected) {
    status.textContent = 'Disconnected. NukeFire actions are unavailable.';
  } else if (contexts.length === 0) {
    status.textContent = 'Connected; waiting for room and character actions from NukeFire.';
  } else {
    const location = snapshot.room ? `Room #${snapshot.room}` : 'current room';
    status.textContent = `${contexts.length} context section${contexts.length === 1 ? '' : 's'} for ${location}.`;
  }

  for (const context of contexts) {
    const card = document.createElement('article');
    card.className = 'context-card';
    card.dataset.contextId = context.id;
    card.dataset.contextKind = context.kind;
    const heading = document.createElement('h3');
    heading.textContent = context.title;
    card.append(heading);
    if (context.summary) {
      const text = document.createElement('p');
      text.className = 'context-card-summary';
      text.textContent = context.summary;
      card.append(text);
    }
    if (context.status?.length) card.append(contextStatusList(context.status));
    if (context.actions?.length) {
      const actions = document.createElement('div');
      actions.className = 'context-actions';
      actions.setAttribute('aria-label', `${context.title} actions`);
      for (const action of context.actions) actions.append(contextActionElement(action, context.id));
      card.append(actions);
    }
    container.append(card);
  }

  summary.textContent = contexts.length
    ? `NukeFire Console. ${contexts.map((context) => `${context.title}. Actions: ${context.actions.map((action) => action.label).join(', ') || 'none'}.`).join(' ')}`
    : 'No NukeFire action data is available.';
}

async function requestContextDeck(options = {}) {
  if (!state.connected) {
    if (options.announceRequest !== false) {
      announce('Connect to NukeFire before refreshing NukeFire Console.', { force: true });
    }
    renderContextDeck();
    return false;
  }
  const sent = await sendActiveGmcp('NukeFire.Context');
  $('#context-deck-status').textContent = 'Requested fresh room and character actions from NukeFire.';
  if (options.announceRequest) announce('NukeFire Console refresh requested.', { force: true });
  return sent !== false;
}

function mapperCharacterKey() {
  return state.workspace.currentCharacterKey || 'default';
}

function mapperCharacterName() {
  return state.workspace.currentCharacterName || 'Default workspace';
}

function mapperRoomId(room) {
  return typeof mapperApi.roomIdFrom === 'function' ? mapperApi.roomIdFrom(room) : String(room?.num ?? room?.vnum ?? room?.id ?? '');
}

const MAPPER_SAVE_DEBOUNCE_MS = 350;
const MAPPER_SAVE_MAX_DIRTY_MS = 2000;

function clearMapSaveTimer() {
  clearTimeout(state.mapper.saveTimer);
  state.mapper.saveTimer = null;
}

function schedulePendingMapSave(now = Date.now()) {
  if (!state.mapper.ready || !state.mapper.graph || typeof window.nukefire.saveMap !== 'function') return;
  if (!state.mapper.saveDirty || state.mapper.saveInFlight) return;

  const dirtySinceMs = Number(state.mapper.saveDirtySinceMs) || now;
  const lastDirtyMs = Number(state.mapper.saveDirtyLastMs) || dirtySinceMs;
  const quietDueMs = lastDirtyMs + MAPPER_SAVE_DEBOUNCE_MS;
  const maximumDueMs = dirtySinceMs + MAPPER_SAVE_MAX_DIRTY_MS;
  const dueMs = Math.min(quietDueMs, maximumDueMs);
  const delayMs = Math.max(0, dueMs - now);

  clearMapSaveTimer();
  state.mapper.saveTimer = setTimeout(() => {
    state.mapper.saveTimer = null;
    void flushMapSave();
  }, delayMs);
}

async function flushMapSave() {
  if (!state.mapper.ready || !state.mapper.graph || typeof window.nukefire.saveMap !== 'function') return;
  if (state.mapper.saveInFlight) {
    state.mapper.saveQueued = true;
    return;
  }
  if (!state.mapper.saveDirty) return;

  clearMapSaveTimer();
  state.mapper.saveDirty = false;
  state.mapper.saveQueued = false;
  state.mapper.saveDirtySinceMs = 0;
  state.mapper.saveDirtyLastMs = 0;
  state.mapper.saveInFlight = true;
  const mapperSaveMetricsActive = longSessionMonitor?.active === true;
  const mapperSaveStarted = mapperSaveMetricsActive ? performance.now() : 0;
  let mapperSerializeMs = 0;
  try {
    /* Persistence acknowledgements are not authoritative live state. Save only
     * one full explored-map snapshot at a time and coalesce changes that arrive
     * while disk I/O is active into one later write. This prevents movement,
     * panning, and BIGMAP packets from building an expensive write backlog.
     */
    // Electron IPC structured-clones invoke arguments before returning control
    // to the renderer. Avoid making another JSON deep clone of the complete
    // explored map immediately before IPC does the same isolation work.
    const mapperSerializeStarted = mapperSaveMetricsActive ? performance.now() : 0;
    const snapshot = state.mapper.graph.serialize({ clone: false });
    if (mapperSaveMetricsActive) mapperSerializeMs = performance.now() - mapperSerializeStarted;
    await window.nukefire.saveMap(snapshot);
  } catch (error) {
    appendSystemMessage(`Map save failed: ${error.message || error}`, 'error');
  } finally {
    if (mapperSaveMetricsActive) {
      longSessionMonitor?.noteMapSave?.({
        durationMs: performance.now() - mapperSaveStarted,
        serializeMs: mapperSerializeMs
      });
    }
    state.mapper.saveInFlight = false;
    if (state.mapper.saveDirty) {
      state.mapper.saveQueued = false;
      schedulePendingMapSave();
    } else {
      state.mapper.saveQueued = false;
      state.mapper.saveDirtySinceMs = 0;
      state.mapper.saveDirtyLastMs = 0;
    }
  }
}

function scheduleMapSave() {
  if (!state.mapper.ready || !state.mapper.graph || typeof window.nukefire.saveMap !== 'function') return;

  const now = Date.now();
  if (!state.mapper.saveDirty) {
    state.mapper.saveDirty = true;
    state.mapper.saveDirtySinceMs = now;
  }
  state.mapper.saveDirtyLastMs = now;

  if (state.mapper.saveInFlight) {
    state.mapper.saveQueued = true;
    return;
  }

  schedulePendingMapSave(now);
}

function gpsCatalog() {
  return state.gmcp?.gps?.catalog || {
    version: 1, count: 0, pages: 0, received: 0, complete: false, items: []
  };
}

function gpsDestinationSearchText(destination) {
  return [
    destination.index,
    destination.room,
    destination.name,
    destination.category,
    destination.difficulty,
    destination.zone,
    destination.aliases,
    destination.tags
  ].join(' ').normalize('NFKC').toLocaleLowerCase();
}

function ensureGpsDestinationLookups(items) {
  if (gpsLookupItemsRef === items) return;
  gpsLookupItemsRef = items;
  gpsLookupByIndex = new Map();
  gpsLookupByRoom = new Map();
  gpsLookupByName = new Map();
  for (const destination of Array.isArray(items) ? items : []) {
    const index = Number(destination?.index);
    const room = Number(destination?.room);
    const name = String(destination?.name || '').normalize('NFKC').trim().toLocaleLowerCase();
    if (Number.isInteger(index) && index > 0) gpsLookupByIndex.set(index, destination);
    if (Number.isFinite(room) && room > 0 && !gpsLookupByRoom.has(room)) gpsLookupByRoom.set(room, destination);
    if (name && !gpsLookupByName.has(name)) gpsLookupByName.set(name, destination);
  }
}

function activeGpsDestination(items) {
  const gps = state.gmcp?.char?.gps;
  if (!gps?.active) return null;
  ensureGpsDestinationLookups(items);
  const index = Number(gps.index);
  if (Number.isInteger(index) && index > 0) {
    const byIndex = gpsLookupByIndex.get(index);
    if (byIndex) return byIndex;
  }
  const room = Number(gps.room);
  if (Number.isFinite(room)) {
    const byRoom = gpsLookupByRoom.get(room);
    if (byRoom) return byRoom;
  }
  const name = String(gps.destination || '').normalize('NFKC').trim().toLocaleLowerCase();
  return name ? gpsLookupByName.get(name) || null : null;
}

function updateGpsSelectionGuidance(destination = null) {
  const guidance = $('#mapper-gps-guidance');
  if (!guidance) return;
  const selectedGuidance = typeof gpsGuidanceApi.selectedGuidance === 'function'
    ? gpsGuidanceApi.selectedGuidance(destination)
    : '';
  setTextIfChanged(guidance, selectedGuidance || 'Choose a destination to see zone and remort guidance.');
}

function renderGpsNavigator() {
  if (deferSessionEventRender('gps-navigator', renderGpsNavigator)) return;
  const search = $('#mapper-gps-search');
  const select = $('#mapper-gps-destination');
  const setButton = $('#mapper-gps-set');
  const status = $('#mapper-gps-status');
  if (!search || !select || !setButton || !status) return;

  const catalog = gpsCatalog();
  const items = Array.isArray(catalog.items) ? catalog.items : [];
  const query = search.value.normalize('NFKC').trim().toLocaleLowerCase();
  const rebuildOptions = gpsOptionsCatalogRef !== catalog || gpsOptionsQuery !== query || select.options.length === 0;
  let filtered = gpsOptionsFilteredItems;
  const previousValue = select.value;

  if (rebuildOptions) {
    filtered = query
      ? items.filter((destination) => gpsDestinationSearchText(destination).includes(query))
      : items;
    gpsOptionsCatalogRef = catalog;
    gpsOptionsQuery = query;
    gpsOptionsFilteredItems = filtered;
    gpsOptionsFilteredIndexes = new Set(filtered.map((destination) => Number(destination.index)));

    const fragment = document.createDocumentFragment();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = items.length
      ? (filtered.length ? 'Choose a GPS destination…' : 'No destinations match this filter')
      : 'Waiting for the server destination list…';
    fragment.append(placeholder);

    const groups = new Map();
    for (const destination of filtered) {
      const category = destination.category || 'Other Destinations';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(destination);
    }

    for (const [category, destinations] of groups) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = category;
      for (const destination of destinations) {
        const option = document.createElement('option');
        option.value = String(destination.index);
        const optionLabel = typeof gpsGuidanceApi.optionLabel === 'function'
          ? gpsGuidanceApi.optionLabel(destination)
          : `${destination.name}${destination.zone ? ` · Zone ${destination.zone}` : ''} · GPS #${destination.index}`;
        option.textContent = optionLabel;
        option.disabled = destination.available === false;
        optgroup.append(option);
      }
      fragment.append(optgroup);
    }
    select.replaceChildren(fragment);
  }

  const active = activeGpsDestination(items);
  const previousIndex = Number(previousValue);
  const desiredValue = Number.isInteger(previousIndex) && gpsOptionsFilteredIndexes.has(previousIndex)
    ? previousValue
    : (active && gpsOptionsFilteredIndexes.has(Number(active.index)) ? String(active.index) : '');
  if (select.value !== desiredValue) select.value = desiredValue;
  const selectDisabled = items.length === 0 || filtered.length === 0;
  if (select.disabled !== selectDisabled) select.disabled = selectDisabled;
  const setDisabled = selectDisabled || !select.value;
  if (setButton.disabled !== setDisabled) setButton.disabled = setDisabled;
  ensureGpsDestinationLookups(items);
  const selected = gpsLookupByIndex.get(Number(select.value)) || active || null;
  updateGpsSelectionGuidance(selected);

  const progress = catalog.complete
    ? `${items.length.toLocaleString()} destinations loaded`
    : items.length
      ? `Receiving destinations: ${items.length.toLocaleString()}${catalog.count ? ` of ${catalog.count.toLocaleString()}` : ''}`
      : 'Destination catalog has not been received yet';
  const shown = query ? ` · ${filtered.length.toLocaleString()} shown` : '';
  const activeText = active ? ` · Active: ${active.name}` : ' · No active destination';
  setTextIfChanged(status, `${progress}${shown}${activeText}.`);
}

async function setGpsFromNavigator() {
  if (!state.connected) {
    announce('Connect to NukeFire before setting a GPS destination.', { force: true });
    return;
  }
  const select = $('#mapper-gps-destination');
  const index = Number(select?.value);
  const destination = gpsCatalog().items.find((item) => item.index === index);
  if (!destination || destination.available === false) {
    announce('Choose an available GPS destination first.', { force: true });
    return;
  }
  await sendCommand(`gps set ${destination.index}`);
  announce(`GPS destination requested: ${destination.name}.`, { force: true });
  select.focus({ preventScroll: true });
}

async function clearGpsFromNavigator() {
  if (!state.connected) {
    announce('Connect to NukeFire before clearing GPS.', { force: true });
    return;
  }
  await sendCommand('gps clear');
  announce('GPS destination clear requested.', { force: true });
  $('#mapper-gps-clear')?.focus({ preventScroll: true });
}

async function requestGpsCatalog() {
  if (!state.connected) {
    announce('Connect to NukeFire before requesting the GPS destination list.', { force: true });
    return;
  }
  await sendActiveGmcp('NukeFire.GPS.Catalog');
  $('#mapper-gps-status').textContent = 'Requested the GPS destination list from NukeFire.';
  announce('GPS destination list requested.', { force: true });
  $('#mapper-gps-refresh')?.focus({ preventScroll: true });
}

function mapperCurrentCharacter() {
  return state.mapper.graph?.character?.(mapperCharacterKey(), mapperCharacterName()) || null;
}

function normalizedMapperCanvasHeight(value, fallback = MAPPER_CANVAS_HEIGHT_DEFAULT) {
  if (typeof mapperApi.normalizeCanvasHeight === 'function') {
    return mapperApi.normalizeCanvasHeight(value, fallback);
  }
  const inherited = Number(fallback);
  const safeFallback = Number.isFinite(inherited)
    ? Math.max(MAPPER_CANVAS_HEIGHT_MIN, Math.min(MAPPER_CANVAS_HEIGHT_MAX, Math.round(inherited)))
    : MAPPER_CANVAS_HEIGHT_DEFAULT;
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.max(MAPPER_CANVAS_HEIGHT_MIN, Math.min(MAPPER_CANVAS_HEIGHT_MAX, Math.round(numeric)))
    : safeFallback;
}

function applyMapperCanvasHeight(value, options = {}) {
  const character = mapperCurrentCharacter();
  const normalized = normalizedMapperCanvasHeight(value, character?.canvasHeight);
  if (character && character.canvasHeight !== normalized) {
    state.mapper.graph.updateView(mapperCharacterKey(), { canvasHeight: normalized });
  }

  const canvas = $('#mapper-canvas');
  const resizer = $('#resize-mapper-canvas');
  canvas?.style.setProperty('--mapper-canvas-height', `${normalized}px`);
  if (resizer) {
    resizer.setAttribute('aria-valuemin', String(MAPPER_CANVAS_HEIGHT_MIN));
    resizer.setAttribute('aria-valuemax', String(MAPPER_CANVAS_HEIGHT_MAX));
    resizer.setAttribute('aria-valuenow', String(normalized));
    resizer.setAttribute('aria-valuetext', `Map height ${normalized} pixels`);
  }

  if (options.persist) scheduleMapSave();
  if (options.announceChange) {
    announce(options.announcement || `Map height set to ${normalized} pixels.`, { force: true });
  }
  return normalized;
}

function setMapperCanvasHeight(value, options = {}) {
  return applyMapperCanvasHeight(value, options);
}

function resetMapperCanvasHeight(options = {}) {
  return setMapperCanvasHeight(MAPPER_CANVAS_HEIGHT_DEFAULT, {
    persist: true,
    announceChange: options.announceChange !== false,
    announcement: `Map height restored to ${MAPPER_CANVAS_HEIGHT_DEFAULT} pixels.`
  });
}

function beginMapperResize(event) {
  if (event.button > 0) return;
  event.preventDefault();
  const resizer = $('#resize-mapper-canvas');
  state.mapper.resizeSession = {
    pointerId: event.pointerId,
    startY: Number(event.clientY) || 0,
    startHeight: normalizedMapperCanvasHeight(mapperCurrentCharacter()?.canvasHeight),
    returnFocus: document.activeElement
  };
  resizer?.setPointerCapture?.(event.pointerId);
  document.body.classList.add('resizing-mapper');
}

function continueMapperResize(event) {
  const session = state.mapper.resizeSession;
  if (!session || session.pointerId !== event.pointerId) return;
  const movement = (Number(event.clientY) || 0) - session.startY;
  setMapperCanvasHeight(session.startHeight + movement, { persist: false });
}

function finishMapperResize(event) {
  const session = state.mapper.resizeSession;
  if (!session || (event?.pointerId !== undefined && event.pointerId !== session.pointerId)) return;
  state.mapper.resizeSession = null;
  document.body.classList.remove('resizing-mapper');
  const resizer = $('#resize-mapper-canvas');
  try {
    if (!resizer?.hasPointerCapture || resizer.hasPointerCapture(session.pointerId)) {
      resizer?.releasePointerCapture?.(session.pointerId);
    }
  } catch {
    /* Pointer capture may already be released by the window manager. */
  }
  scheduleMapSave();
  const height = normalizedMapperCanvasHeight(mapperCurrentCharacter()?.canvasHeight);
  announce(`Map height set to ${height} pixels.`, { force: true });
}

function handleMapperResizeKeydown(event) {
  const character = mapperCurrentCharacter();
  const current = normalizedMapperCanvasHeight(character?.canvasHeight);
  const step = event.shiftKey ? 60 : 20;
  let next = null;
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = current + step;
  else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = current - step;
  else if (event.key === 'Home') next = MAPPER_CANVAS_HEIGHT_MIN;
  else if (event.key === 'End') next = MAPPER_CANVAS_HEIGHT_MAX;
  if (next === null) return;
  event.preventDefault();
  setMapperCanvasHeight(next, { persist: true, announceChange: true });
}

function clearMapperGmcpState(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  snapshot.room ||= {};
  snapshot.map ||= {};
  snapshot.char ||= {};
  snapshot.room.info = null;
  snapshot.map.local = null;
  snapshot.char.gps = null;
}

function resetMapperRecordState(record) {
  if (!record?.mapper) return;
  record.mapper.pendingMove = null;
  record.mapper.pendingMoves = [];
  record.mapper.movementRoomsSincePrompt = 0;
  record.mapper.lastRoomId = '';
  record.mapper.liveSnapshot = null;
  record.mapper.liveSignature = '';
  record.mapper.liveStateReady = false;
  record.mapper.gpsCatalogAnnouncementVersion = 0;
  clearMapperGmcpState(record.gmcp);
}

function resetLiveMapperState(options = {}) {
  clearDeferredMapperPackets();
  clearMovementRefreshWatch();
  clearMapperRouteTimer();
  Object.assign(state.mapper.route, {
    active: false,
    targetId: '',
    currentRoomId: '',
    expectedRoomId: '',
    awaiting: false,
    roomConfirmed: false,
    mapConfirmed: false,
    stepsCompleted: 0,
    totalSteps: 0
  });
  setMapperRouteStatus('No client route is active.', 'idle');
  state.mapper.pendingMove = null;
  state.mapper.pendingMoves = [];
  state.mapper.movementRoomsSincePrompt = 0;
  state.mapper.lastRoomId = '';
  state.mapper.liveSnapshot = null;
  state.mapper.liveSignature = '';
  state.mapper.liveStateReady = false;
  state.mapper.liveRoomIndex = new Map();
  state.mapper.liveLinksByRoom = new Map();
  state.mapper.liveDirectedLinkIndex = new Map();
  state.mapper.visitedCache = null;
  state.mapper.gpsCatalogAnnouncementVersion = 0;
  state.mapper.hoverRoomId = '';
  state.mapper.drag = null;
  state.mapper.wheelFactor = 1;
  state.mapper.wheelAnchor = null;
  state.mapper.statusMessage = String(options.reason || (state.connected
    ? 'waiting for fresh Room.Info and BIGMAP data'
    : 'session disconnected'));

  if (options.clearGmcp !== false) clearMapperGmcpState(state.gmcp);
  const record = options.record === undefined ? activeSessionRecord() : options.record;
  if (record) resetMapperRecordState(record);

  renderGpsNavigator();
  if (options.render !== false) renderMapper();
  if (options.announce) announce(String(options.announce), { force: true });
}

function renderMapperAvailability() {
  const placeholder = $('#mapper-offline');
  const svg = $('#mapper-svg');
  const title = $('#mapper-offline-title');
  const message = $('#mapper-offline-message');
  const available = state.connected && state.mapper.liveStateReady;
  if (placeholder) placeholder.toggleAttribute('hidden', available);
  if (svg) {
    svg.toggleAttribute('hidden', !available);
    svg.setAttribute('aria-hidden', String(!available));
  }
  if (available) return true;

  const waiting = state.connected;
  const summary = waiting
    ? 'Live mapper reset. Waiting for fresh Room.Info or BIGMAP data from NukeFire.'
    : 'Mapper unavailable. Session disconnected.';
  if (title) title.textContent = waiting ? 'Refreshing Live Map' : 'NukeFire Map Offline';
  if (message) message.textContent = waiting
    ? 'Waiting for fresh room and BIGMAP data from NukeFire.'
    : 'Connect this session to load the live local map.';
  $('#mapper-svg-description').textContent = summary;
  $('#mapper-accessible-summary').textContent = summary;
  const status = $('#mapper-status');
  if (status) status.textContent = summary;
  return false;
}

function mapperSelectedRoom() {
  const character = mapperCurrentCharacter();
  return state.mapper.graph?.room?.(character?.selectedRoomId || character?.currentRoomId) || null;
}

function mapperLiveRoom(roomId) {
  return state.mapper.liveRoomIndex.get(String(roomId || '')) || null;
}

function mapperLiveLinksFor(roomId) {
  return state.mapper.liveLinksByRoom.get(String(roomId || '')) || [];
}

function mapperDirectedLinkKey(from, to, direction) {
  return `${String(from || '')}|${String(to || '')}|${String(direction || '')}`;
}

function indexMapperSnapshot(snapshot) {
  const rooms = new Map();
  const linksByRoom = new Map();
  const directedLinks = new Map();
  for (const room of snapshot?.rooms || []) rooms.set(String(room.id || ''), room);
  for (const link of snapshot?.links || []) {
    directedLinks.set(mapperDirectedLinkKey(link.from, link.to, link.direction), link);
    if (link.bidirectional) {
      const reverse = mapperApi.OPPOSITE_DIRECTION?.[link.direction] || '';
      if (reverse) directedLinks.set(mapperDirectedLinkKey(link.to, link.from, reverse), link);
    }
    for (const roomId of [link.from, link.to]) {
      const id = String(roomId || '');
      if (!id) continue;
      if (!linksByRoom.has(id)) linksByRoom.set(id, []);
      linksByRoom.get(id).push(link);
    }
  }
  state.mapper.liveRoomIndex = rooms;
  state.mapper.liveLinksByRoom = linksByRoom;
  state.mapper.liveDirectedLinkIndex = directedLinks;
}

function invalidateMapperVisitedCache() {
  state.mapper.visitedCache = null;
}

function mapperVisitedSet(character = mapperCurrentCharacter()) {
  const visited = Array.isArray(character?.visited) ? character.visited : [];
  const key = `${mapperCharacterKey()}|${visited.length}|${visited.at(-1) || ''}`;
  if (state.mapper.visitedCache?.key === key && state.mapper.visitedCache.source === visited) {
    return state.mapper.visitedCache.set;
  }
  const set = new Set(visited);
  state.mapper.visitedCache = { key, source: visited, set };
  return set;
}

function mapperRoomSummary(room) {
  if (!room) return 'Waiting for room information.';
  const liveRoom = mapperLiveRoom(room.id);
  const character = mapperCurrentCharacter();
  const visited = mapperVisitedSet(character);
  const terrainInfo = typeof mapperApi.terrainPresentation === 'function'
    ? mapperApi.terrainPresentation(room.terrain)
    : { label: room.terrain || 'Unknown', nukefireColor: '' };
  const exits = Object.entries(room.exits || {})
    .map(([direction, destination]) => {
      const target = state.mapper.graph?.room?.(destination);
      return `${direction}: ${target?.name || `room ${destination}`}`;
    });
  const zone = Number.isFinite(Number(room.zone)) ? ` Zone ${Number(room.zone)}.` : '';
  const terrain = ` Terrain: ${terrainInfo.label || room.terrain || 'Unknown'}${terrainInfo.nukefireColor ? `, BIGMAP ${terrainInfo.nukefireColor}` : ''}.`;
  const mapState = room.id === character?.currentRoomId
    ? ' Current room.'
    : visited.has(room.id) ? ' Visited room.' : ' Unvisited room in the authoritative local view.';
  const gps = liveRoom?.destination
    ? ' GPS destination.'
    : liveRoom?.route ? ' On the active GPS route.' : '';
  return `${room.name}, room ${room.id}.${zone}${terrain}${mapState}${gps} ${exits.length ? `${exits.join('. ')}.` : 'No known exits.'}`;
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function mapperDirectionGlyph(direction) {
  return { north: '↑', east: '→', south: '↓', west: '←', up: '⇧', down: '⇩' }[direction] || '→';
}

function mapperEdgeSymbol(link) {
  if (link.locked) return '!';
  if (link.closed) return ['north', 'south'].includes(link.direction) ? ':' : '=';
  if (!link.bidirectional) return mapperDirectionGlyph(link.direction);
  return '';
}

function mapperDetailRoom() {
  const graph = state.mapper.graph;
  const character = mapperCurrentCharacter();
  return graph?.room(character?.currentRoomId) || null;
}

function mapperRoutePlan(fromValue, targetValue, options = {}) {
  const graph = state.mapper.graph;
  const snapshot = state.mapper.liveSnapshot;
  const character = mapperCurrentCharacter();
  const fromId = typeof mapperApi.roomIdFrom === 'function'
    ? mapperApi.roomIdFrom(fromValue)
    : String(fromValue || '');
  const targetId = typeof mapperApi.roomIdFrom === 'function'
    ? mapperApi.roomIdFrom(targetValue)
    : String(targetValue || '');
  const maximum = Math.max(1, Math.min(512, Number(options.maxSteps) || 128));
  if (!graph || !fromId || !targetId) {
    return { ok: false, steps: [], reason: 'A current room and selected destination are required.' };
  }
  if (fromId === targetId) return { ok: true, steps: [], reason: 'Already there.', source: 'current' };

  // When the destination is inside this exact server snapshot, the complete
  // route is authoritative and closed/locked/one-way link state wins outright.
  if (snapshot && mapperLiveRoom(fromId) && mapperLiveRoom(targetId)) {
    const result = typeof mapperApi.authoritativeRoute === 'function'
      ? mapperApi.authoritativeRoute(snapshot, fromId, targetId, { maxSteps: maximum, normalized: true })
      : { ok: false, steps: [], reason: 'This client build has no authoritative route helper.' };
    return { ...result, source: 'authoritative' };
  }

  // Older visited rooms can sit outside BIGMAP's current local radius. Plan
  // through only this character's confirmed visitation history; advanceMapperRoute
  // still requires the exact next edge to be open in each fresh BIGMAP packet.
  const visited = mapperVisitedSet(character);
  if (!visited.has(targetId)) {
    return { ok: false, steps: [], reason: 'The selected room is outside the live BIGMAP view and has not been visited by this character.' };
  }
  const result = typeof graph.route === 'function'
    ? graph.route(fromId, targetId, { maxSteps: maximum, allowedRoomIds: [...visited] })
    : { ok: false, steps: [], reason: 'This client build has no learned-route helper.' };
  return { ...result, source: 'visited' };
}

function setMapperRouteStatus(message, kind = 'idle') {
  state.mapper.route.status = String(message || 'No client route is active.');
  state.mapper.route.kind = ['running', 'success', 'error'].includes(kind) ? kind : 'idle';
  const status = $('#mapper-route-status');
  if (status) {
    status.textContent = state.mapper.route.status;
    status.className = `mapper-route-status ${state.mapper.route.kind}`;
  }
}

function renderMapperDetails() {
  const graph = state.mapper.graph;
  if (!graph) return;
  if (!state.connected || !state.mapper.liveStateReady) {
    const waiting = state.connected;
    $('#mapper-room-name').textContent = waiting ? 'Waiting for fresh room information' : 'Map offline';
    $('#mapper-room-meta').textContent = waiting
      ? 'The live map was reset and is waiting for NukeFire.'
      : 'Connect this session to restore live room information.';
    $('#mapper-room-state').textContent = waiting
      ? 'No stale room state is being displayed.'
      : 'Current-room details are unavailable while disconnected.';
    $('#mapper-exits').replaceChildren();
    return;
  }
  const character = mapperCurrentCharacter();
  const current = graph.room(character?.currentRoomId);
  const selected = current;
  const detail = mapperDetailRoom();
  const visited = mapperVisitedSet(character);
  const roomName = $('#mapper-room-name');
  const roomMeta = $('#mapper-room-meta');
  const roomState = $('#mapper-room-state');
  const exitsBox = $('#mapper-exits');

  if (detail) {
    const liveRoom = mapperLiveRoom(detail.id);
    const terrain = typeof mapperApi.terrainPresentation === 'function'
      ? mapperApi.terrainPresentation(detail.terrain)
      : { label: detail.terrain || 'Unknown', nukefireColor: '' };
    roomName.textContent = detail.name;
    roomMeta.textContent = `Room #${detail.id}${Number.isFinite(Number(detail.zone)) ? ` · Zone ${Number(detail.zone)}` : ''} · ${terrain.label || detail.terrain || 'Unknown'}${terrain.nukefireColor ? ` · BIGMAP ${terrain.nukefireColor}` : ''}`;
    const states = [];
    if (detail.id === current?.id) states.push('current');
    states.push(visited.has(detail.id) ? 'visited' : 'unvisited');
    if (liveRoom?.route) states.push('GPS route');
    if (liveRoom?.destination) states.push('GPS destination');
    roomState.textContent = `Map state: ${states.join(', ')}. Read-only display.`;

    const exits = document.createDocumentFragment();
    for (const direction of mapperApi.DIRECTIONS || ['north', 'east', 'south', 'west', 'up', 'down']) {
      const destination = detail.exits?.[direction];
      if (!destination) continue;
      const link = mapperLiveLinksFor(detail.id).find((item) =>
        item.from === detail.id && item.to === destination && item.direction === direction);
      const badge = document.createElement('span');
      badge.className = `mapper-exit${link?.closed ? ' closed' : ''}${link?.locked ? ' locked' : ''}${link && !link.bidirectional ? ' one-way' : ''}`;
      const conditions = [link?.locked ? 'locked' : '', link?.closed ? 'closed' : '', link && !link.bidirectional ? 'one-way' : ''].filter(Boolean);
      badge.textContent = `${direction}: ${graph.room(destination)?.name || `#${destination}`}${conditions.length ? ` (${conditions.join(', ')})` : ''}`;
      exits.append(badge);
    }
    exitsBox.replaceChildren(exits);
  } else {
    roomName.textContent = 'Waiting for room information';
    roomMeta.textContent = 'The map will learn as you travel.';
    roomState.textContent = 'Current-room details are unavailable.';
    exitsBox.replaceChildren();
  }


  const summary = mapperRoomSummary(detail || selected || current);
  $('#mapper-svg-description').textContent = summary;
  $('#mapper-accessible-summary').textContent = summary;
}

function mapperViewProjection(character, current) {
  const zoom = Math.max(0.45, Math.min(2.5, Number(character?.zoom) || 1));
  const spacing = 48 * zoom;
  const viewX = Number.isFinite(character?.viewX)
    ? Number(character.viewX)
    : (Number.isFinite(current?.x) ? Number(current.x) : 0);
  const viewY = Number.isFinite(character?.viewY)
    ? Number(character.viewY)
    : (Number.isFinite(current?.y) ? Number(current.y) : 0);
  const viewZ = Number.isFinite(character?.viewZ)
    ? Number(character.viewZ)
    : (Number.isFinite(current?.z) ? Number(current.z) : 0);
  const panX = Number(character?.panX) || 0;
  const panY = Number(character?.panY) || 0;
  return {
    zoom, spacing, viewX, viewY, viewZ, panX, panY,
    pointFor: (room) => ({
      x: MAPPER_VIEWBOX_CENTER_X + (room.x - viewX) * spacing,
      y: MAPPER_VIEWBOX_CENTER_Y + (room.y - viewY) * spacing
    }),
    bounds: {
      minX: viewX + ((-MAPPER_VIEWPORT_MARGIN - MAPPER_VIEWBOX_CENTER_X - panX) / spacing),
      maxX: viewX + ((MAPPER_VIEWBOX_WIDTH + MAPPER_VIEWPORT_MARGIN - MAPPER_VIEWBOX_CENTER_X - panX) / spacing),
      minY: viewY + ((-MAPPER_VIEWPORT_MARGIN - MAPPER_VIEWBOX_CENTER_Y - panY) / spacing),
      maxY: viewY + ((MAPPER_VIEWBOX_HEIGHT + MAPPER_VIEWPORT_MARGIN - MAPPER_VIEWBOX_CENTER_Y - panY) / spacing)
    }
  };
}

function applyMapperPanTransform(character = mapperCurrentCharacter()) {
  const world = $('#mapper-world');
  if (!world) return;
  const panX = Number(character?.panX) || 0;
  const panY = Number(character?.panY) || 0;
  world.setAttribute('transform', `translate(${panX} ${panY})`);
}

function mapperRoomsForViewport(graph, character, current, selected, projection) {
  const liveRooms = Array.isArray(state.mapper.liveSnapshot?.rooms)
    ? state.mapper.liveSnapshot.rooms
    : [];
  // While NukeFire is publishing a local BIGMAP snapshot, draw only that
  // authoritative room set. The persistent explored map remains available for
  // routing/history, but it must not leak old rooms into the live local view.
  const candidateIds = liveRooms.length > 0
    ? new Set(liveRooms.map((room) => room.id))
    : new Set(mapperVisitedSet(character));
  if (current?.id) candidateIds.add(current.id);
  if (selected?.id) candidateIds.add(selected.id);

  if (typeof graph.roomsInViewport === 'function') {
    return graph.roomsInViewport({
      ...projection.bounds,
      z: projection.viewZ,
      roomIds: candidateIds,
      maxRooms: 2500
    });
  }
  return [...candidateIds]
    .map((id) => graph.room(id))
    .filter((room) => room && room.z === projection.viewZ &&
      room.x >= projection.bounds.minX && room.x <= projection.bounds.maxX &&
      room.y >= projection.bounds.minY && room.y <= projection.bounds.maxY)
    .slice(0, 2500);
}

function mapperVisibleLinks(graph, visible, visibleIds) {
  const liveSnapshot = state.mapper.liveSnapshot;
  if (liveSnapshot && Array.isArray(liveSnapshot.rooms)) {
    const links = [];
    const rendered = new Set();
    for (const rawLink of Array.isArray(liveSnapshot.links) ? liveSnapshot.links : []) {
      const from = graph.room(rawLink.from);
      const to = graph.room(rawLink.to);
      if (!from || !to || !visibleIds.has(from.id) || !visibleIds.has(to.id) || from.z !== to.z) continue;
      const bidirectional = rawLink.bidirectional !== false;
      const edgeKey = bidirectional
        ? [from.id, to.id].sort().join(':')
        : `${from.id}>${to.id}:${rawLink.direction}`;
      if (rendered.has(edgeKey)) continue;
      rendered.add(edgeKey);
      links.push({
        from: from.id,
        to: to.id,
        direction: rawLink.direction,
        bidirectional,
        closed: Boolean(rawLink.closed),
        locked: Boolean(rawLink.locked),
        route: Boolean(rawLink.route)
      });
    }
    return links;
  }

  // Offline fallback: show only previously server-confirmed explored topology.
  const links = [];
  const rendered = new Set();
  for (const from of visible) {
    for (const [direction, destination] of Object.entries(from.exits || {})) {
      const to = graph.room(destination);
      if (!to || !visibleIds.has(to.id) || from.z !== to.z) continue;
      const opposite = mapperApi.OPPOSITE_DIRECTION?.[direction] || '';
      const bidirectional = Boolean(opposite && to.exits?.[opposite] === from.id);
      const edgeKey = bidirectional
        ? [from.id, to.id].sort().join(':')
        : `${from.id}>${to.id}:${direction}`;
      if (rendered.has(edgeKey)) continue;
      rendered.add(edgeKey);
      links.push({
        from: from.id,
        to: to.id,
        direction,
        bidirectional,
        closed: false,
        locked: false,
        route: false
      });
    }
  }
  return links;
}

function renderMapper() {
  if (!panelHasLiveSurface('mapper')) {
    state.mapper.renderDirty = true;
    return;
  }
  state.mapper.renderDirty = false;
  const graph = state.mapper.graph;
  const edgeLayer = $('#mapper-edges');
  const roomLayer = $('#mapper-rooms');
  if (!graph || !edgeLayer || !roomLayer) return;
  const mapperRenderMetricsActive = longSessionMonitor?.active === true;
  const mapperRenderStarted = mapperRenderMetricsActive ? performance.now() : 0;
  let mapperEdgeSymbolsBuilt = 0;

  // Canvas sizing is a local workspace preference, not live map data. Apply it
  // while disconnected too so the parchment placeholder and resize separator
  // retain the saved character height without waiting for a socket.
  const character = mapperCurrentCharacter();
  applyMapperCanvasHeight(character?.canvasHeight, { persist: false });

  if (!renderMapperAvailability()) {
    edgeLayer.replaceChildren();
    roomLayer.replaceChildren();
    renderMapperDetails();
    if (mapperRenderMetricsActive) {
      longSessionMonitor?.noteMapperRender?.({
        durationMs: performance.now() - mapperRenderStarted,
        visibleRooms: 0,
        visibleEdges: 0,
        roomNodesBuilt: 0,
        edgeNodesBuilt: 0,
        edgeSymbolsBuilt: 0,
        replaceChildrenCalls: 2
      });
    }
    return;
  }

  const current = graph.room(character?.currentRoomId);
  const selected = current;
  const visited = mapperVisitedSet(character);
  const liveSnapshot = state.mapper.liveSnapshot;
  const routeRoomIds = new Set((liveSnapshot?.rooms || []).filter((room) => room.route).map((room) => room.id));
  const destinationRoomIds = new Set((liveSnapshot?.rooms || []).filter((room) => room.destination).map((room) => room.id));
  const projection = mapperViewProjection(character, current);
  const visible = mapperRoomsForViewport(graph, character, current, selected, projection)
    .sort((left, right) => left.y - right.y || left.x - right.x || String(left.id).localeCompare(String(right.id)));
  const visibleIds = new Set(visible.map((room) => room.id));
  const linksToRender = mapperVisibleLinks(graph, visible, visibleIds);

  applyMapperPanTransform(character);

  const edgeFragment = document.createDocumentFragment();
  for (const link of linksToRender) {
    const from = graph.room(link.from);
    const to = graph.room(link.to);
    if (!from || !to) continue;
    const start = projection.pointFor(from);
    const end = projection.pointFor(to);
    const className = [
      'mapper-edge',
      ['up', 'down'].includes(link.direction) ? 'mapper-edge-vertical' : '',
      link.route ? 'route' : '',
      link.closed ? 'closed' : '',
      link.locked ? 'locked' : '',
      !link.bidirectional ? 'one-way' : ''
    ].filter(Boolean).join(' ');
    edgeFragment.append(createSvgElement('line', {
      x1: start.x, y1: start.y, x2: end.x, y2: end.y,
      class: className,
      'data-map-link-from': from.id,
      'data-map-link-to': to.id
    }));
    const symbol = mapperEdgeSymbol(link);
    if (symbol) {
      const marker = createSvgElement('text', {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2 + 4,
        class: 'mapper-edge-symbol',
        'aria-hidden': 'true'
      });
      marker.textContent = symbol;
      edgeFragment.append(marker);
      mapperEdgeSymbolsBuilt += 1;
    }
  }
  edgeLayer.replaceChildren(edgeFragment);

  const roomFragment = document.createDocumentFragment();
  for (const room of visible) {
    const point = projection.pointFor(room);
    const terrain = typeof mapperApi.terrainPresentation === 'function'
      ? mapperApi.terrainPresentation(room.terrain)
      : { key: 'unknown', fill: '#182029', stroke: '#728090', label: room.terrain || 'Unknown', nukefireColor: '' };
    const liveRoom = mapperLiveRoom(room.id);
    const isVisited = visited.has(room.id);
    const states = [
      room.id === current?.id ? 'current room' : '',
      room.id === selected?.id ? 'selected' : '',
      isVisited ? 'visited' : 'unvisited',
      liveRoom?.route ? 'GPS route' : '',
      liveRoom?.destination ? 'GPS destination' : ''
    ].filter(Boolean);
    const glyph = room.id === current?.id ? '@' : liveRoom?.destination ? 'X' : liveRoom?.route ? '*' : '';
    const group = createSvgElement('g', {
      class: `mapper-room-node${room.id === current?.id ? ' current' : ''}${routeRoomIds.has(room.id) ? ' route' : ''}${destinationRoomIds.has(room.id) ? ' destination' : ''}${isVisited ? ' visited' : ' unvisited'}`,
      transform: `translate(${point.x} ${point.y})`,
      'aria-hidden': 'true',
      'data-map-room-id': room.id,
      'data-terrain-key': terrain.key
    });
    group.append(createSvgElement('rect', {
      x: -14, y: -14, width: 28, height: 28, rx: 7, ry: 7,
      class: 'mapper-room-shape',
      fill: terrain.fill,
      stroke: terrain.stroke
    }));
    const glyphElement = createSvgElement('text', {
      x: 0, y: 4, 'text-anchor': 'middle', class: 'mapper-room-glyph', 'aria-hidden': 'true'
    });
    glyphElement.textContent = glyph;
    group.append(glyphElement);

    const verticalDirections = new Set(
      Object.keys(room.exits || {}).filter((direction) => ['up', 'down'].includes(direction))
    );
    if (verticalDirections.has('up')) {
      const upBadge = createSvgElement('g', { class: 'mapper-level-marker up', transform: 'translate(10 -10)' });
      upBadge.append(createSvgElement('circle', { cx: 0, cy: 0, r: 6 }));
      const upText = createSvgElement('text', { x: 0, y: 3, 'text-anchor': 'middle' });
      upText.textContent = '▲';
      upBadge.append(upText);
      group.append(upBadge);
    }
    if (verticalDirections.has('down')) {
      const downBadge = createSvgElement('g', { class: 'mapper-level-marker down', transform: 'translate(10 10)' });
      downBadge.append(createSvgElement('circle', { cx: 0, cy: 0, r: 6 }));
      const downText = createSvgElement('text', { x: 0, y: 3, 'text-anchor': 'middle' });
      downText.textContent = '▼';
      downBadge.append(downText);
      group.append(downBadge);
    }
    const roomText = typeof displayTextApi.mapperRoomLabel === 'function'
      ? displayTextApi.mapperRoomLabel(room, state.displayText.mapperRoomLabels)
      : (state.displayText.mapperRoomLabels === 'number' ? String(room.id || '') : '');
    if (roomText) {
      const labelElement = createSvgElement('text', {
        x: 0, y: 24, 'text-anchor': 'middle', class: 'mapper-room-label', 'aria-hidden': 'true'
      });
      labelElement.textContent = roomText;
      group.append(labelElement);
    }
    roomFragment.append(group);
  }
  roomLayer.replaceChildren(roomFragment);

  const status = $('#mapper-status');
  const sourceLabel = liveSnapshot?.source === 'bigmap+gps' ? 'Live BIGMAP/GPS' : 'Learned map';
  const authorityLabel = liveSnapshot ? 'authoritative local view' : 'waiting for authoritative refresh';
  const truncationLabel = liveSnapshot?.truncated ? ' · local view limited' : '';
  const currentVisible = Boolean(current?.id && visibleIds.has(current.id));
  const viewMode = character?.followPlayer === false ? 'manually panned' : 'centered on player';
  const viewportLabel = ` · ${visible.length.toLocaleString()} shown · ${viewMode}${currentVisible ? '' : current ? ' · current room unavailable' : ''}`;
  const message = state.mapper.statusMessage ? ` · ${state.mapper.statusMessage}` : '';
  const roomCount = typeof graph.roomCount === 'function'
    ? graph.roomCount()
    : Object.keys(graph.data?.rooms || {}).length;
  status.textContent = `${sourceLabel} · ${authorityLabel} · ${roomCount.toLocaleString()} known room${roomCount === 1 ? '' : 's'} · ${visited.size.toLocaleString()} visited${viewportLabel}${truncationLabel}${message}`;
  renderMapperDetails();
  if (mapperRenderMetricsActive) {
    longSessionMonitor?.noteMapperRender?.({
      durationMs: performance.now() - mapperRenderStarted,
      visibleRooms: visible.length,
      visibleEdges: linksToRender.length,
      roomNodesBuilt: visible.length,
      edgeNodesBuilt: linksToRender.length + mapperEdgeSymbolsBuilt,
      edgeSymbolsBuilt: mapperEdgeSymbolsBuilt,
      replaceChildrenCalls: 2
    });
  }
}

function selectMapperRoom(roomId, options = {}) {
  if (!state.mapper.graph?.room?.(roomId)) return;
  state.mapper.graph.updateView(mapperCharacterKey(), { selectedRoomId: roomId });
  renderMapper();
  scheduleMapSave();
  if (options.announce !== false) announce(mapperRoomSummary(state.mapper.graph.room(roomId)), { force: true });
}

function updateMapperView(patch, options = {}) {
  if (!state.mapper.graph) return;
  state.mapper.graph.updateView(mapperCharacterKey(), patch);
  if (options.render === false) applyMapperPanTransform();
  else renderMapper();
  if (options.persist !== false) scheduleMapSave();
  if (options.focus) $('#mapper-canvas')?.focus({ preventScroll: true });
}

function centerMapper(options = {}) {
  const character = mapperCurrentCharacter();
  const current = state.mapper.graph?.room?.(character?.currentRoomId);
  state.mapper.statusMessage = 'Following the current room.';
  updateMapperView({
    panX: 0,
    panY: 0,
    viewX: current?.x,
    viewY: current?.y,
    viewZ: current?.z,
    selectedRoomId: character?.currentRoomId,
    followPlayer: true
  }, options);
}

function setMapperFollowPlayer(_enabled, options = {}) {
  centerMapper(options);
}

function zoomMapper(delta, options = {}) {
  const character = mapperCurrentCharacter();
  if (!character) return;
  const oldZoom = Math.max(0.45, Math.min(2.5, Number(character.zoom) || 1));
  const requested = options.zoom !== undefined ? Number(options.zoom) : oldZoom + Number(delta || 0);
  const newZoom = Math.max(0.45, Math.min(2.5, Number.isFinite(requested) ? requested : oldZoom));
  if (Math.abs(newZoom - oldZoom) < 0.0001) return;

  // Zoom must not throw away a deliberate mouse/keyboard pan. Center remains
  // an explicit action through the Center button, C, or Home.
  updateMapperView({ zoom: newZoom }, options);
}

function scheduleMapperRender() {
  if (!panelHasLiveSurface('mapper')) {
    state.mapper.renderDirty = true;
    return;
  }
  if (state.mapper.renderFrame !== null) return;
  state.mapper.renderFrame = scheduleFrame(() => {
    state.mapper.renderFrame = null;
    renderMapper();
  });
}

function mapperSnapshotSignature(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return '';
  const roomSignature = (snapshot.rooms || []).map((room) =>
    `${room.id}:${room.x},${room.y},${room.z}:${room.current ? 1 : 0}${room.route ? 1 : 0}${room.destination ? 1 : 0}:${room.name}:${room.terrain}`
  ).join(';');
  const linkSignature = (snapshot.links || []).map((link) =>
    `${link.from}>${link.to}:${link.direction}:${link.bidirectional ? 1 : 0}${link.closed ? 1 : 0}${link.locked ? 1 : 0}${link.route ? 1 : 0}`
  ).join(';');
  return `${snapshot.version}|${snapshot.centerId}|${snapshot.zone}|${snapshot.plane}|${snapshot.truncated ? 1 : 0}|${roomSignature}|${linkSignature}`;
}

function mapperRouteEventMessage(record, message, kind = '') {
  if (record?.id === state.sessions.activeId) appendSystemMessage(message, kind);
  else appendSystemToInactiveSession(record, message, kind);
}

function handleTinTinMapperFindRequest(record, payload = {}, active = false) {
  const targetId = typeof mapperApi.roomIdFrom === 'function'
    ? mapperApi.roomIdFrom(payload?.target)
    : String(payload?.target || '');
  if (!targetId) {
    mapperRouteEventMessage(record, 'TinTin #MAP FIND needs a valid numeric room vnum.', 'error');
    return;
  }
  if (!active) {
    mapperRouteEventMessage(record, `TinTin #MAP FIND stored room #${targetId} for this session. Activate the session before #PATH RUN.`, '');
    return;
  }
  const currentId = String(state.mapper.liveSnapshot?.centerId || mapperCurrentCharacter()?.currentRoomId || '');
  const plan = mapperRoutePlan(currentId, targetId, { maxSteps: 128 });
  if (!plan.ok) {
    setMapperRouteStatus(`TinTin #MAP FIND could not route to room #${targetId}: ${plan.reason}`, 'error');
    renderMapperDetails();
    mapperRouteEventMessage(record, `TinTin #MAP FIND failed for room #${targetId}: ${plan.reason}`, 'error');
    return;
  }
  const count = plan.steps.length;
  setMapperRouteStatus(
    count
      ? `TinTin path ready for room #${targetId}: about ${count} verified step${count === 1 ? '' : 's'}. Use #PATH RUN.`
      : `TinTin path target room #${targetId} is the current room.`,
    'success'
  );
  renderMapperDetails();
  mapperRouteEventMessage(record, count
    ? `TinTin #MAP FIND: room #${targetId} is reachable in about ${count} native verified step${count === 1 ? '' : 's'}.`
    : `TinTin #MAP FIND: already at room #${targetId}.`);
}

async function handleTinTinPathRunRequest(record, payload = {}, active = false) {
  const targetId = typeof mapperApi.roomIdFrom === 'function'
    ? mapperApi.roomIdFrom(payload?.target)
    : String(payload?.target || '');
  if (!targetId) {
    mapperRouteEventMessage(record, 'TinTin #PATH RUN has no Mapper target. Use #MAP FIND first.', 'error');
    return;
  }
  if (!active) {
    mapperRouteEventMessage(record, `TinTin #PATH RUN for room #${targetId} was not started because this session is not active.`, 'error');
    return;
  }

  const argument = String(payload?.argument || '').trim();
  if (argument && argument !== targetId) {
    const delay = Number(argument);
    if (!Number.isFinite(delay) || delay < 0 || delay > 86_400) {
      mapperRouteEventMessage(record, 'TinTin #PATH RUN delay must be between 0 and 86400 seconds.', 'error');
      return;
    }
    if (delay > 0) {
      mapperRouteEventMessage(
        record,
        `TinTin #PATH RUN delay ${argument}s accepted as compatibility input; NukeFire's Room.Info/BIGMAP confirmation pacing remains authoritative.`
      );
    }
  }

  await startMapperRoute(targetId);
}

function handleTinTinPathStopRequest(record, active = false) {
  if (!active) {
    mapperRouteEventMessage(record, 'TinTin #PATH STOP did not affect the active tab; routes are session-isolated.', '');
    return;
  }
  if (!state.mapper.route.active) {
    mapperRouteEventMessage(record, 'No native Mapper route is active.');
    return;
  }
  stopMapperRoute('TinTin #PATH STOP stopped the native client route.', { kind: 'idle', output: false });
  mapperRouteEventMessage(record, 'TinTin #PATH STOP stopped the native client route.');
}

function clearMapperRouteTimer() {
  if (state.mapper.route.timer !== null) clearTimeout(state.mapper.route.timer);
  state.mapper.route.timer = null;
}

function stopMapperRoute(reason = 'Client route stopped.', options = {}) {
  const wasActive = state.mapper.route.active;
  clearMapperRouteTimer();
  state.mapper.route.active = false;
  state.mapper.route.awaiting = false;
  state.mapper.route.roomConfirmed = false;
  state.mapper.route.mapConfirmed = false;
  state.mapper.route.expectedRoomId = '';
  state.mapper.route.targetId = '';
  state.mapper.route.currentRoomId = '';
  state.mapper.route.totalSteps = Math.max(state.mapper.route.totalSteps, state.mapper.route.stepsCompleted);
  setMapperRouteStatus(reason, options.kind || (wasActive ? 'error' : 'idle'));
  scheduleMapperRender();
  if (options.output) appendSystemMessage(reason, options.kind === 'success' ? '' : 'error');
  if (options.announce !== false && wasActive) announce(reason, { force: true });
}

async function sendMapperCommand(command) {
  const text = String(command || '').trim();
  if (!text || !state.connected) return false;
  terminateCurrentOutputLine();
  snapOutputToBottom();
  const sessionId = state.sessions.activeId;
  try {
    if (window.nukefire.routeCommand && sessionId) {
      const result = await window.nukefire.routeCommand(sessionId, text);
      let queued = false;
      for (const delivery of result?.deliveries || []) {
        if (delivery.queued) {
          queued = true;
          noteOutgoingCommand(delivery.sessionId, delivery.command);
        }
      }
      for (const message of result?.messages || []) appendSystemMessage(message);
      if (result?.snapshot) applySessionsSnapshot(result.snapshot, { followActive: false });
      return queued;
    }
    noteOutgoingCommand(sessionId, text);
    await window.nukefire.send(text);
    return true;
  } catch (error) {
    appendSystemMessage(`Map travel command failed: ${error.message || error}`, 'error');
    return false;
  }
}

function mapperGpsDestinationForRoom(roomId) {
  const target = Number(roomId);
  return gpsCatalog().items.find((item) => Number(item.room) === target && item.available !== false) || null;
}

async function advanceMapperRoute() {
  const route = state.mapper.route;
  if (!route.active || route.awaiting) return;
  const snapshot = state.mapper.liveSnapshot;
  const currentId = String(snapshot?.centerId || route.currentRoomId || '');
  if (!snapshot || !currentId || !route.targetId) {
    stopMapperRoute('Route stopped: the authoritative BIGMAP state is unavailable.', { kind: 'error', output: true });
    return;
  }
  if (currentId === route.targetId) {
    stopMapperRoute(`Arrived at room #${currentId}.`, { kind: 'success', output: true });
    return;
  }
  const result = mapperRoutePlan(currentId, route.targetId, { maxSteps: 128 });
  if (!result.ok || !result.steps.length) {
    stopMapperRoute(`Route stopped: ${result.reason || 'no safe route is visible.'}`, { kind: 'error', output: true });
    return;
  }
  const next = result.steps[0];
  const exactStep = typeof mapperApi.authoritativeStep === 'function'
    ? mapperApi.authoritativeStep(snapshot, currentId, next.to, next.direction, { normalized: true })
    : { ok: false, reason: 'This client build has no authoritative next-step helper.' };
  if (!exactStep.ok) {
    stopMapperRoute(`Route stopped before moving: ${exactStep.reason}`, { kind: 'error', output: true });
    return;
  }
  route.currentRoomId = currentId;
  route.expectedRoomId = next.to;
  route.awaiting = true;
  route.roomConfirmed = false;
  route.mapConfirmed = false;
  route.totalSteps = Math.max(route.totalSteps, route.stepsCompleted + result.steps.length);
  setMapperRouteStatus(`Step ${route.stepsCompleted + 1} of about ${route.totalSteps}: ${next.direction} to room #${next.to}. Waiting for Room.Info and BIGMAP confirmation.`, 'running');
  scheduleMapperRender();
  route.timer = setTimeout(() => {
    if (route.active && route.awaiting) {
      stopMapperRoute(`Route stopped: NukeFire did not confirm room #${route.expectedRoomId} within 10 seconds.`, { kind: 'error', output: true });
    }
  }, 10000);
  const sent = await sendMapperCommand(next.direction);
  if (!sent && route.active) {
    stopMapperRoute('Route stopped: the movement command was not queued.', { kind: 'error', output: true });
  }
}

async function startMapperRoute(targetValue) {
  const route = state.mapper.route;
  if (route.active) stopMapperRoute('Previous client route replaced.', { kind: 'error', output: false });
  if (!state.connected) {
    setMapperRouteStatus('Connect to NukeFire before using Run Here.', 'error');
    renderMapperDetails();
    return;
  }
  const targetId = typeof mapperApi.roomIdFrom === 'function' ? mapperApi.roomIdFrom(targetValue) : String(targetValue || '');
  const snapshot = state.mapper.liveSnapshot;
  const currentId = String(snapshot?.centerId || mapperCurrentCharacter()?.currentRoomId || '');
  if (!targetId || !snapshot || !state.mapper.graph?.room?.(targetId)) {
    setMapperRouteStatus('Run Here requires a selected mapped room and a current authoritative BIGMAP view.', 'error');
    renderMapperDetails();
    return;
  }
  const plan = mapperRoutePlan(currentId, targetId, { maxSteps: 128 });
  if (!plan.ok) {
    setMapperRouteStatus(`Cannot run there: ${plan.reason}`, 'error');
    renderMapperDetails();
    announce(`Cannot run there. ${plan.reason}`, { force: true });
    return;
  }
  if (!plan.steps.length) {
    setMapperRouteStatus(`Already at room #${targetId}.`, 'success');
    renderMapperDetails();
    return;
  }

  const useGps = Boolean($('#mapper-route-use-gps')?.checked);
  if (useGps) {
    const destination = mapperGpsDestinationForRoom(targetId);
    if (destination) {
      const active = activeGpsDestination(gpsCatalog().items);
      if (active?.index !== destination.index) {
        const gpsSent = await sendMapperCommand(`gps set ${destination.index}`);
        if (!gpsSent) {
          setMapperRouteStatus('Run Here stopped because the matching GPS destination could not be set.', 'error');
          renderMapperDetails();
          return;
        }
      }
    } else {
      state.mapper.statusMessage = 'selected room is not a named GPS catalog destination';
    }
  }

  route.active = true;
  route.targetId = targetId;
  route.currentRoomId = currentId;
  route.expectedRoomId = '';
  route.awaiting = false;
  route.roomConfirmed = false;
  route.mapConfirmed = false;
  route.stepsCompleted = 0;
  route.totalSteps = plan.steps.length;
  setMapperRouteStatus(`Route armed for room #${targetId}. NukeFire will verify every next exit and every arrival before continuing.`, 'running');
  appendSystemMessage(`Map travel started: room #${currentId} to room #${targetId}, about ${plan.steps.length} verified step${plan.steps.length === 1 ? '' : 's'}${plan.source === 'visited' ? ' through visited map history' : ''}.`);
  announce(`Map travel started. ${plan.steps.length} verified steps to room ${targetId}.`, { force: true });
  await advanceMapperRoute();
}

function completeMapperRouteStepIfConfirmed() {
  const route = state.mapper.route;
  if (!route.active || !route.awaiting || !route.roomConfirmed || !route.mapConfirmed) return false;
  const confirmedId = route.expectedRoomId;
  clearMapperRouteTimer();
  route.currentRoomId = confirmedId;
  route.expectedRoomId = '';
  route.awaiting = false;
  route.roomConfirmed = false;
  route.mapConfirmed = false;
  route.stepsCompleted += 1;
  if (confirmedId === route.targetId) {
    stopMapperRoute(`Arrived at room #${confirmedId} after ${route.stepsCompleted} verified step${route.stepsCompleted === 1 ? '' : 's'}.`, { kind: 'success', output: true });
    return true;
  }
  setMapperRouteStatus(`Room #${confirmedId} verified by Room.Info and BIGMAP. Recomputing the next safe step.`, 'running');
  setTimeout(() => void advanceMapperRoute(), 0);
  return true;
}

function verifyMapperRouteRoom(roomId) {
  const route = state.mapper.route;
  if (!route.active || !route.awaiting) return;
  const id = String(roomId || '');
  if (!id || id === route.currentRoomId) return;
  if (id !== route.expectedRoomId) {
    stopMapperRoute(`Route stopped: Room.Info reported room #${id}, but room #${route.expectedRoomId} was expected.`, { kind: 'error', output: true });
    return;
  }
  route.roomConfirmed = true;
  if (!completeMapperRouteStepIfConfirmed()) {
    setMapperRouteStatus(`Room.Info confirmed room #${id}. Waiting for the authoritative BIGMAP center before continuing.`, 'running');
    renderMapperDetails();
  }
}

function verifyMapperRouteSnapshot(snapshot) {
  const route = state.mapper.route;
  if (!route.active || !route.awaiting) return;
  const centerId = String(snapshot?.centerId || '');
  if (!centerId || centerId === route.currentRoomId) return;
  if (centerId !== route.expectedRoomId) {
    stopMapperRoute(`Route stopped: BIGMAP centered on room #${centerId}, but room #${route.expectedRoomId} was expected.`, { kind: 'error', output: true });
    return;
  }
  route.mapConfirmed = true;
  if (!completeMapperRouteStepIfConfirmed()) {
    setMapperRouteStatus(`BIGMAP confirmed room #${centerId}. Waiting for matching Room.Info before continuing.`, 'running');
    renderMapperDetails();
  }
}

async function requestAuthoritativeMap(options = {}) {
  if (options.hardReset) {
    resetLiveMapperState({
      reason: state.connected
        ? 'hard reset complete; waiting for fresh Room.Info and BIGMAP data'
        : 'session disconnected',
      announce: options.announceRequest ? 'Live map state cleared.' : ''
    });
  }
  if (!state.connected) {
    state.mapper.statusMessage = 'connect before requesting a map refresh';
    renderMapper();
    announce('Connect to NukeFire before refreshing the authoritative map.', { force: true });
    return;
  }
  state.mapper.statusMessage = 'refresh requested';
  renderMapper();
  try {
    await sendActiveGmcp('Room.Info');
    await sendActiveGmcp('Char.GPS');
    await sendActiveGmcp('NukeFire.Map.Local');
    state.mapper.statusMessage = 'authoritative refresh requested from NukeFire';
    if (options.announceRequest) announce('Authoritative Room.Info, GPS, and BIGMAP refresh requested.', { force: true });
  } catch (error) {
    state.mapper.statusMessage = 'refresh request failed';
    appendSystemMessage(`Map refresh failed: ${error.message || error}`, 'error');
  }
  renderMapper();
}

async function clearLearnedMap() {
  const scope = $('#mapper-clear-scope')?.value || 'character';
  if (state.mapper.route.active) stopMapperRoute('Client route stopped because map state was cleared.', { kind: 'error', output: true });
  const graph = state.mapper.graph;
  if (!graph) return;
  const currentInfo = state.gmcp?.room?.info;
  const snapshot = state.gmcp?.map?.local || state.mapper.liveSnapshot;
  let message = '';
  if (scope === 'server') {
    if (!state.connected) {
      state.mapper.statusMessage = 'connect before clearing NukeFire BIGMAP memory';
      renderMapper();
      return;
    }
    await sendMapperCommand('map memory clear');
    message = 'NukeFire session BIGMAP memory clear requested';
    await requestAuthoritativeMap();
  } else if (scope === 'zone') {
    const zone = mapperDetailRoom()?.zone ?? state.mapper.liveSnapshot?.zone;
    const removed = graph.clearZone?.(zone) || 0;
    message = `${removed} learned room${removed === 1 ? '' : 's'} cleared from zone ${zone}`;
  } else if (scope === 'all') {
    const removed = graph.clearAll?.() || 0;
    message = `${removed} learned room${removed === 1 ? '' : 's'} cleared from this client`;
  } else {
    const removed = graph.clearCharacter?.(mapperCharacterKey()) || 0;
    message = `${removed} visit record${removed === 1 ? '' : 's'} cleared for ${mapperCharacterName()}`;
  }
  if (scope !== 'server') {
    state.mapper.liveSignature = '';
    invalidateMapperVisitedCache();
    if (currentInfo) processMapperRoom(currentInfo);
    if (snapshot) processMapperSnapshot(snapshot);
    scheduleMapSave();
  }
  state.mapper.statusMessage = message;
  renderMapper();
  announce(message, { force: true });
}

function clearDeferredMapperPackets() {
  if (state.mapper.deferredPacketTimer !== null) {
    clearTimeout(state.mapper.deferredPacketTimer);
    state.mapper.deferredPacketTimer = null;
  }
  state.mapper.deferredPackets.length = 0;
}

function processMapperPacket(packageName, body) {
  if (packageName === 'Room.Info') processMapperRoom(body);
  else if (packageName === 'NukeFire.Map.Local') processMapperSnapshot(body);
}

function flushDeferredMapperPackets() {
  if (!state.mapper.deferredPackets.length) return;
  const activeSessionId = String(state.sessions.activeId || '');
  const packets = state.mapper.deferredPackets.splice(0);
  for (const packet of packets) {
    if (String(packet.sessionId || '') !== activeSessionId) continue;
    processMapperPacket(packet.packageName, packet.body);
  }
}

function shouldYieldMapperPacketForMovement(packageName) {
  if (packageName !== 'NukeFire.Map.Local') return false;
  return Boolean(state.mapper.pendingMove || ensureMapperMovementQueue(state.mapper).length > 0 || state.mapper.movementWatch);
}

function scheduleDeferredMapperPacket(packageName, body) {
  if (!body || typeof body !== 'object') return;

  /* Ordinary mapper packets remain synchronous. Only the authoritative local
   * map snapshot is potentially expensive enough to get out of the terminal's
   * way, and only while this session is resolving an actual movement command. */
  if (!shouldYieldMapperPacketForMovement(packageName)) {
    processMapperPacket(packageName, body);
    return;
  }

  state.mapper.deferredPackets.push({
    sessionId: String(state.sessions.activeId || ''),
    packageName: String(packageName || ''),
    body
  });
  if (state.mapper.deferredPacketTimer !== null) return;

  /* Yield one task so room text arriving beside BIGMAP can paint first. The
   * graph/index work then resumes immediately; there is no animation-frame wait. */
  state.mapper.deferredPacketTimer = setTimeout(() => {
    state.mapper.deferredPacketTimer = null;
    if (state.terminalRender.pendingRuns.length > 0) flushTerminalOutput();
    flushDeferredMapperPackets();
  }, 0);
}

function processMapperSnapshot(packet) {
  if (!packet || typeof packet !== 'object') return;
  const normalized = typeof mapperApi.normalizeServerSnapshot === 'function'
    ? mapperApi.normalizeServerSnapshot(packet)
    : packet;
  const signature = mapperSnapshotSignature(normalized);
  state.mapper.liveSnapshot = normalized;
  state.mapper.liveStateReady = true;
  const record = activeSessionRecord();
  if (record?.mapper) {
    record.mapper.liveSnapshot = normalized;
    record.mapper.liveStateReady = true;
  }
  const duplicate = Boolean(signature && signature === state.mapper.liveSignature && state.mapper.liveRoomIndex.size > 0);
  if (!duplicate) indexMapperSnapshot(normalized);
  state.mapper.statusMessage = 'authoritative BIGMAP received';
  confirmMovementWatchMap(normalized?.centerId);

  if (!state.mapper.ready || !state.mapper.graph ||
      typeof state.mapper.graph.applyServerSnapshot !== 'function') {
    state.mapper.liveSignature = '';
    return;
  }

  state.mapper.liveSignature = signature;
  if (!duplicate) {
    const result = state.mapper.graph.applyServerSnapshot(normalized, {
      normalized: true,
      characterKey: mapperCharacterKey(),
      characterName: mapperCharacterName(),
      now: Date.now(),
      selectCurrent: !state.mapper.route.active
    });

    if (result?.centerRoom?.id) {
      state.mapper.lastRoomId = result.centerRoom.id;
      refreshMapperPendingMoveHead(state.mapper, state.mapper.lastRoomId);
    }
    invalidateMapperVisitedCache();
    scheduleMapSave();
  }

  verifyMapperRouteSnapshot(normalized);
  if (!duplicate) scheduleMapperRender();
}

function ensureMapperMovementQueue(mapperState) {
  if (!mapperState || typeof mapperState !== 'object') return [];
  if (!Array.isArray(mapperState.pendingMoves)) mapperState.pendingMoves = [];
  return mapperState.pendingMoves;
}

function refreshMapperPendingMoveHead(mapperState, fromRoomId = mapperState?.lastRoomId) {
  if (!mapperState || typeof mapperState !== 'object') return null;
  const queue = ensureMapperMovementQueue(mapperState);
  const head = queue[0] || null;
  mapperState.pendingMove = head
    ? { direction: head.direction, fromRoomId: String(fromRoomId || ''), at: head.at }
    : null;
  return mapperState.pendingMove;
}

function takeMapperMovementForRoom(mapperState, previousRoomId, roomChanged, now = Date.now()) {
  if (!mapperState || !roomChanged) return { valid: false, direction: '' };
  const queue = ensureMapperMovementQueue(mapperState);
  while (queue.length > 0 && now - Number(queue[0]?.at || 0) > 12000) queue.shift();
  const queued = queue[0] || null;
  const legacy = queued ? null : mapperState.pendingMove;
  const valid = queued
    ? now - Number(queued.at || 0) <= 12000
    : Boolean(legacy && legacy.fromRoomId === previousRoomId && now - legacy.at <= 12000);
  const direction = valid ? String((queued || legacy)?.direction || '') : '';
  if (queued) {
    queue.shift();
    mapperState.movementRoomsSincePrompt = Math.max(0, Number(mapperState.movementRoomsSincePrompt) || 0) + 1;
  }
  return { valid, direction };
}

function resolveMapperMovementPrompt(mapperState, options = {}) {
  if (!mapperState || typeof mapperState !== 'object') return false;
  const queue = ensureMapperMovementQueue(mapperState);
  let roomResolutions = Math.max(0, Number(mapperState.movementRoomsSincePrompt) || 0);
  let consumedFailedMove = false;
  if (roomResolutions > 0) {
    roomResolutions -= 1;
  } else if (queue.length > 0) {
    queue.shift();
    consumedFailedMove = true;
  }
  mapperState.movementRoomsSincePrompt = roomResolutions;
  refreshMapperPendingMoveHead(mapperState, mapperState.lastRoomId);
  if (options.active === true) {
    if (consumedFailedMove) clearMovementRefreshWatch();
    if (queue.length > 0 && mapperState.lastRoomId) scheduleMovementRefreshWatch(mapperState.lastRoomId);
  }
  return consumedFailedMove;
}

function processMapperRoom(roomInfo) {
  if (!state.mapper.ready || !state.mapper.graph || !roomInfo) return;
  const roomId = mapperRoomId(roomInfo);
  if (!roomId) return;
  state.mapper.liveStateReady = true;
  verifyMapperRouteRoom(roomId);
  const now = Date.now();
  const previousRoomId = state.mapper.lastRoomId || '';
  const roomChanged = Boolean(previousRoomId && previousRoomId !== roomId);
  const movement = takeMapperMovementForRoom(state.mapper, previousRoomId, roomChanged, now);
  if (roomChanged && !movement.valid) interruptSelfVoiceForMovement();
  state.mapper.graph.observeRoom(roomInfo, {
    previousRoomId: roomChanged ? previousRoomId : '',
    direction: movement.valid ? movement.direction : '',
    characterKey: mapperCharacterKey(),
    characterName: mapperCharacterName(),
    now
  });
  state.mapper.lastRoomId = roomId;
  if (roomChanged) refreshMapperPendingMoveHead(state.mapper, roomId);
  confirmMovementWatchRoom(roomId);
  invalidateMapperVisitedCache();
  const record = activeSessionRecord();
  if (record) {
    record.mapper.pendingMove = state.mapper.pendingMove;
    record.mapper.pendingMoves = state.mapper.pendingMoves;
    record.mapper.movementRoomsSincePrompt = state.mapper.movementRoomsSincePrompt;
    record.mapper.lastRoomId = roomId;
    record.mapper.liveStateReady = true;
  }
  scheduleMapperRender();
  scheduleMapSave();
}

function processMapperRoomForSession(record, roomInfo) {
  if (!record || !state.mapper.ready || !state.mapper.graph || !roomInfo) return;
  const roomId = mapperRoomId(roomInfo);
  if (!roomId) return;
  const now = Date.now();
  const previousRoomId = record.mapper.lastRoomId || '';
  const roomChanged = Boolean(previousRoomId && previousRoomId !== roomId);
  const movement = takeMapperMovementForRoom(record.mapper, previousRoomId, roomChanged, now);
  const characterName = record.characterName || record.name || record.id;
  const characterKey = characterWorkspaceKey(characterName) || record.id || 'default';
  state.mapper.graph.observeRoom(roomInfo, {
    previousRoomId: roomChanged ? previousRoomId : '',
    direction: movement.valid ? movement.direction : '',
    characterKey,
    characterName,
    now
  });
  record.mapper.lastRoomId = roomId;
  if (roomChanged) refreshMapperPendingMoveHead(record.mapper, roomId);
  record.mapper.liveStateReady = true;
  invalidateMapperVisitedCache();
  scheduleMapSave();
}

async function bootstrapMapper() {
  if (typeof window.nukefire.loadMap !== 'function' || typeof mapperApi.MapperGraph !== 'function') {
    state.mapper.ready = true;
    renderMapper();
    return;
  }
  try {
    const response = await window.nukefire.loadMap();
    state.mapper.graph = new mapperApi.MapperGraph(response?.map || {});
    invalidateMapperVisitedCache();
    state.mapper.ready = true;
    processMapperRoom(state.gmcp?.room?.info);
    processMapperSnapshot(state.gmcp?.map?.local);
    renderMapper();
  } catch (error) {
    state.mapper.ready = true;
    appendSystemMessage(`Map load failed: ${error.message || error}`, 'error');
    renderMapper();
  }
}

async function sendActiveGmcp(packageName, body) {
  if (window.nukefire.sendSessionGmcp && state.sessions.activeId) {
    return window.nukefire.sendSessionGmcp(state.sessions.activeId, packageName, body);
  }
  return window.nukefire.sendGmcp?.(packageName, body);
}

function clearMovementRefreshWatch() {
  const watch = state.mapper.movementWatch;
  if (watch?.timer !== null && watch?.timer !== undefined) clearTimeout(watch.timer);
  state.mapper.movementWatch = null;
}

function completeMovementRefreshWatchIfReady() {
  const watch = state.mapper.movementWatch;
  if (!watch || !watch.roomConfirmed || !watch.mapConfirmed) return false;
  clearMovementRefreshWatch();
  if (ensureMapperMovementQueue(state.mapper).length > 0 && state.mapper.lastRoomId) {
    scheduleMovementRefreshWatch(state.mapper.lastRoomId);
  }
  return true;
}

function confirmMovementWatchRoom(roomId) {
  const watch = state.mapper.movementWatch;
  const id = String(roomId || '');
  if (!watch || !id || id === watch.fromRoomId) return;
  watch.roomConfirmed = true;
  completeMovementRefreshWatchIfReady();
}

function confirmMovementWatchMap(roomId) {
  const watch = state.mapper.movementWatch;
  const id = String(roomId || '');
  if (!watch || !id || id === watch.fromRoomId) return;
  watch.mapConfirmed = true;
  completeMovementRefreshWatchIfReady();
}

function scheduleMovementRefreshWatch(fromRoomId) {
  if (!state.connected || !fromRoomId) return;
  const origin = String(fromRoomId);
  if (state.mapper.movementWatch?.fromRoomId === origin) return;
  clearMovementRefreshWatch();
  const watch = {
    fromRoomId: origin,
    roomConfirmed: false,
    mapConfirmed: false,
    timer: null
  };
  watch.timer = setTimeout(async () => {
    if (state.mapper.movementWatch !== watch || !state.connected) return;
    try {
      const requests = [];
      if (!watch.roomConfirmed) requests.push(sendActiveGmcp('Room.Info'));
      if (!watch.mapConfirmed) requests.push(sendActiveGmcp('NukeFire.Map.Local'));
      requests.push(sendActiveGmcp('Char.GPS'));
      requests.push(sendActiveGmcp('NukeFire.Context'));
      await Promise.allSettled(requests);
      state.mapper.statusMessage = 'special-room refresh requested';
      scheduleMapperRender();
    } catch {
      /* The ordinary room-change path remains authoritative; this is a quiet fallback. */
    }
  }, 300);
  state.mapper.movementWatch = watch;
}

function recentServerLinks(limit = 20) {
  const record = activeSessionRecord();
  const runs = Array.isArray(record?.outputRuns) ? record.outputRuns : [];
  const occurrences = [];
  let current = null;

  for (const run of runs) {
    const uri = String(run?.link || '');
    if (!uri) {
      current = null;
      continue;
    }
    if (!current || current.uri !== uri) {
      current = { uri, label: '' };
      occurrences.push(current);
    }
    current.label += String(run?.text || '');
  }

  const output = [];
  const seen = new Set();
  for (let index = occurrences.length - 1; index >= 0 && output.length < limit; index -= 1) {
    const occurrence = occurrences[index];
    if (seen.has(occurrence.uri)) continue;
    const resolved = resolveTerminalLink(occurrence.uri);
    if (!resolved.available || resolved.kind === 'close') continue;
    seen.add(occurrence.uri);
    const cleanLabel = occurrence.label
      .replace(/[\r\n\t]+/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, 120);
    output.push({
      uri: resolved.uri,
      label: cleanLabel || resolved.value || resolved.uri,
      description: typeof osc8LinksApi.describeOsc8Uri === 'function'
        ? osc8LinksApi.describeOsc8Uri(resolved.uri)
        : resolved.uri
    });
  }
  return output;
}

function parseLocalLinkCommand(commandValue) {
  const command = String(commandValue || '');
  const prefix = normalizeClientCommandPrefix(state.sessions.commandPrefix);
  if (!command.startsWith(prefix) || command.startsWith(prefix.repeat(2))) return null;
  const body = command.slice(prefix.length).trim();
  const match = body.match(/^(links?|hyperlinks?)(?:\s+([\s\S]*))?$/iu);
  if (!match) return null;
  return {
    directive: match[1].toLowerCase(),
    argument: String(match[2] || '').trim()
  };
}

async function handleLocalLinkCommand(commandValue) {
  const parsed = parseLocalLinkCommand(commandValue);
  if (!parsed) return false;
  const links = recentServerLinks();

  if (parsed.directive === 'links' || parsed.directive === 'hyperlinks') {
    if (parsed.argument) {
      appendSystemMessage(`Usage: ${normalizeClientCommandPrefix(state.sessions.commandPrefix)}links`);
      return true;
    }
    if (!links.length) {
      appendSystemMessage('No recent server hyperlinks are available.');
      announce('No recent server hyperlinks are available.', { force: true });
      return true;
    }
    appendSystemMessage(`Recent server hyperlinks for ${activeSessionRecord()?.name || 'this session'}:`);
    links.forEach((link, index) => {
      appendSystemMessage(`[${index + 1}] ${link.label} — ${link.description}`);
    });
    appendSystemMessage(`Use ${normalizeClientCommandPrefix(state.sessions.commandPrefix)}link <number> to activate one.`);
    announce(`${links.length} recent server hyperlink${links.length === 1 ? '' : 's'} listed in terminal output.`, { force: true });
    return true;
  }

  const number = Number(parsed.argument);
  if (!Number.isInteger(number) || number < 1 || number > links.length) {
    appendSystemMessage(`Usage: ${normalizeClientCommandPrefix(state.sessions.commandPrefix)}link <1-${Math.max(1, links.length)}>`);
    return true;
  }
  await activateTerminalLink({ uri: links[number - 1].uri });
  return true;
}


function unwrapLuaLabScript(value) {
  const source = String(value || '').trim();
  if (!source.startsWith('{')) return source;

  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        if (source.slice(index + 1).trim()) return source;
        return source.slice(1, index);
      }
      if (depth < 0) return source;
    }
  }
  return source;
}

function parseLocalLuaLabCommand(commandValue) {
  const command = String(commandValue || '');
  const prefix = normalizeClientCommandPrefix(state.sessions.commandPrefix);
  if (!command.startsWith(prefix) || command.startsWith(prefix.repeat(2))) return null;
  const parser = typeof clientCommandApi.firstDirective === 'function'
    ? clientCommandApi.firstDirective(command, prefix)
    : null;
  if (!parser || parser.directive !== 'lua') return null;
  return { script: unwrapLuaLabScript(parser.body) };
}

function formatLuaLabValue(value) {
  if (value === null || value === undefined) return 'nil';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return '[value]';
}

function commandEchoEnabledForSession(sessionIdValue = state.sessions.activeId) {
  const sessionId = String(sessionIdValue || state.sessions.activeId || '');
  const record = state.sessions.records[sessionId];
  const config = record?.tintin?.config || (sessionId === state.sessions.activeId ? state.sessions.config : null);
  return config?.commandEcho === true;
}

async function handleLocalLuaLabCommand(commandValue) {
  const parsed = parseLocalLuaLabCommand(commandValue);
  if (!parsed) return false;
  const prefix = normalizeClientCommandPrefix(state.sessions.commandPrefix);
  if (!parsed.script.trim()) {
    appendSystemMessage(`Lua usage: ${prefix}lua {echo("hello")}`);
    return true;
  }
  if (typeof window.nukefire?.executeLuaLab !== 'function') {
    appendSystemMessage('Lua is unavailable in this build.');
    return true;
  }

  const commandEcho = commandEchoEnabledForSession(state.sessions.activeId);
  if (commandEcho) appendSystemMessage('[Lua] running...');
  let result;
  try {
    result = await window.nukefire.executeLuaLab(state.sessions.activeId, parsed.script);
  } catch (error) {
    appendSystemMessage(`[Lua host error] ${String(error?.message || error || 'Unknown error').slice(0, 4096)}`);
    return true;
  }

  if (result?.snapshot) applySessionsSnapshot(result.snapshot, { followActive: false });
  for (const args of result?.echoes || []) {
    appendSystemMessage(`[Lua] ${(args || []).map(formatLuaLabValue).join(' ')}`);
  }
  if (result?.ok) {
    if (commandEcho && (result.values || []).length) {
      appendSystemMessage(`[Lua return] ${result.values.map(formatLuaLabValue).join(', ')}`);
    } else if (commandEcho) {
      appendSystemMessage('[Lua] OK');
    }
  } else {
    const kind = String(result?.error?.type || 'error');
    const message = String(result?.error?.message || 'Lua execution failed.').slice(0, 4096);
    appendSystemMessage(`[Lua ${kind}] ${message}`);
  }
  return true;
}

function parseLocalBufferCommand(commandValue) {
  const command = String(commandValue || '');
  const prefix = normalizeClientCommandPrefix(state.sessions.commandPrefix);
  if (!command.startsWith(prefix) || command.startsWith(prefix.repeat(2))) return null;
  const body = command.slice(prefix.length).trim();
  const match = body.match(/^buffer\s+(?:\{end\}|end)$/iu);
  return match ? { directive: 'buffer', operation: 'end' } : null;
}

function handleLocalBufferCommand(commandValue) {
  const parsed = parseLocalBufferCommand(commandValue);
  if (!parsed) return false;
  returnOutputToLive();
  return true;
}

async function handleLocalRendererCommand(commandValue) {
  if (await handleLocalLuaLabCommand(commandValue)) return true;
  if (await handleLocalLinkCommand(commandValue)) return true;
  return handleLocalBufferCommand(commandValue);
}

function noteOutgoingCommand(sessionId, command) {
  const record = state.sessions.records[sessionId];
  if (!record) return;
  const movementDirection = typeof mapperApi.normalizeDirection === 'function'
    ? mapperApi.normalizeDirection(command)
    : '';
  const activeSession = sessionId === state.sessions.activeId;
  const lastRoomId = record.mapper.lastRoomId || (activeSession ? state.mapper.lastRoomId : '');
  const queue = ensureMapperMovementQueue(record.mapper);
  if (movementDirection) {
    const hadPendingMovement = queue.length > 0 || Boolean(record.mapper.pendingMove);
    if (activeSession && !hadPendingMovement) interruptSelfVoiceForMovement();
    const at = Date.now();
    if (queue.length >= 256) queue.shift();
    queue.push({ direction: movementDirection, at });
    if (!record.mapper.pendingMove) refreshMapperPendingMoveHead(record.mapper, lastRoomId);
    if (activeSession) scheduleMovementRefreshWatch(lastRoomId);
  } else if (command && queue.length === 0) {
    record.mapper.pendingMove = null;
    if (activeSession) clearMovementRefreshWatch();
  }
  if (activeSession) {
    state.mapper.pendingMoves = queue;
    state.mapper.movementRoomsSincePrompt = Math.max(0, Number(record.mapper.movementRoomsSincePrompt) || 0);
    state.mapper.pendingMove = record.mapper.pendingMove;
  }
}

async function routeCommandThroughCoordinator(commandValue) {
  const result = await window.nukefire.routeCommand(state.sessions.activeId, commandValue);
  for (const delivery of result?.deliveries || []) {
    if (delivery.queued && delivery.source !== 'speedwalk') noteOutgoingCommand(delivery.sessionId, delivery.command);
  }
  const messages = result?.messages || [];
  if (messages.length > 0 && isHelpClientCommand(commandValue)) {
    appendSystemMessage(messages.join('\n'), 'help');
  } else {
    for (const message of messages) appendSystemMessage(message);
  }
  if (result?.snapshot) applySessionsSnapshot(result.snapshot, { followActive: false });
  if (result?.activateSessionId && result.activateSessionId !== state.sessions.activeId) {
    await activateSession(result.activateSessionId, { notifyMain: false });
  }
  return result;
}

async function sendCommand(rawCommand, options = {}) {
  const command = String(rawCommand ?? '').replace(/[\r\n]+$/u, '');
  if (command.trim() && state.accessibility.selfVoiceInterruptOnCommand) selfVoice?.interrupt?.();
  const preserveInput = Boolean(options.preserveInput && !state.remoteEcho);
  const recordHistory = options.recordHistory !== false;
  const preservedDraft = preserveInput ? commandInput.value : '';
  if (state.mapper.route.active && command) {
    stopMapperRoute('Client route stopped because a manual command was entered.', { kind: 'error', output: true });
  }
  state.paginationPending = false;
  const commandLine = analyzeCommandLineText(command);
  const hasServerCommands = !commandLine.errorCode && Boolean(commandLine.hasServerCommands);
  const singleClientCommand = !commandLine.errorCode
    && commandLine.commands?.length === 1
    && isClientCommandText(commandLine.commands[0]);
  // Standard Telnet clients locally advance past a prompt when Return is
  // pressed. NukeFire prompts do not carry their own newline, so terminate the
  // visible prompt before every line that contains a server-bound command.
  // Mixed batches such as "#showme {Ready};look" therefore preserve the same
  // prompt boundary as a plain "look" command.
  if (hasServerCommands) {
    terminateCurrentOutputLine();
    snapOutputToBottom();
  }

  const repeatableCommand = Boolean(command && !state.remoteEcho);
  const showSentCommand = !preserveInput && repeatableCommand && $('#show-last-command-in-input').checked;
  const sourceSessionId = state.sessions.activeId;

  if (recordHistory && command && !state.remoteEcho) {
    const last = state.history.at(-1);
    if (last !== command) state.history.push(command);
    if (state.history.length > 500) state.history.shift();
  }
  const record = activeSessionRecord();
  if (preserveInput) {
    if (record) record.commandDraft = preservedDraft;
  } else {
    state.historyIndex = null;
    state.historyPrefix = '';
    state.draft = '';
    commandInput.value = showSentCommand ? command : '';
    if (showSentCommand) commandInput.select();
    if (record) {
      record.history = state.history;
      record.historyIndex = null;
      record.historyPrefix = '';
      record.draft = '';
      record.commandDraft = showSentCommand ? command : '';
    }
  }
  updateCommandAvailability(statusBox?.dataset.connectionState || (state.connected ? 'connected' : 'disconnected'));

  if (singleClientCommand && await handleLocalRendererCommand(command)) {
    const sourceRecord = state.sessions.records[sourceSessionId];
    if (sourceRecord && !preserveInput) sourceRecord.commandDraft = showSentCommand ? command : '';
    schedulePersistentSettingsSave();
    return;
  }

  if (window.nukefire.routeCommand && state.sessions.activeId) {
    const commands = commandLine.errorCode ? [] : (commandLine.commands || []);
    const containsLocalRendererCommand = commands.length > 1
      && commands.some((commandPart) => parseLocalLuaLabCommand(commandPart) || parseLocalLinkCommand(commandPart) || parseLocalBufferCommand(commandPart));
    let persistentMutation = false;
    if (containsLocalRendererCommand) {
      for (const commandPart of commands) {
        if (await handleLocalRendererCommand(commandPart)) continue;
        const result = await routeCommandThroughCoordinator(commandPart);
        if (result?.snapshot) persistentMutation = true;
      }
    } else {
      const result = await routeCommandThroughCoordinator(command);
      persistentMutation = Boolean(result?.snapshot);
    }
    const sourceRecord = state.sessions.records[sourceSessionId];
    if (sourceRecord && !preserveInput) sourceRecord.commandDraft = showSentCommand ? command : '';
    // Plain server commands change transient history/draft state only; neither is
    // part of the persistent settings schema. The coordinator returns a snapshot
    // when TinTin/session definitions really mutated, so write settings only then.
    if (persistentMutation) schedulePersistentSettingsSave();
    return;
  }

  noteOutgoingCommand(state.sessions.activeId, command);
  await window.nukefire.send(command);
}

function setRemoteEcho(enabled, options = {}) {
  state.remoteEcho = Boolean(enabled);
  const record = activeSessionRecord();
  if (record) record.remoteEcho = state.remoteEcho;
  commandInput.type = enabled ? 'password' : 'text';
  updateCommandAvailability(statusBox?.dataset.connectionState || (state.connected ? 'connected' : 'disconnected'));
  if (options.clearInput !== false) {
    commandInput.value = '';
    resetHistoryNavigation();
  }
  if (options.focus !== false) commandInput.focus();
  if (options.announceChange !== false) announce(enabled ? 'Hidden password input active.' : 'Command input active.');
}

function resetTinTinCompletion() {
  state.tintinCompletion = { key: '', prefix: '', original: '', candidates: [], index: -1 };
}

function resetTinTinHistorySearch() {
  state.tintinHistorySearch = { query: '', index: null, draft: '' };
}

function expandTinTinTabVariables(value) {
  let text = String(value ?? '');
  const variables = new Map((Array.isArray(state.sessions.variables) ? state.sessions.variables : [])
    .map((record) => [String(record?.name || ''), String(record?.value ?? '')]));
  text = text.replace(/\$\{([^{}]+)\}|\$([A-Za-z_][A-Za-z0-9_.\-]*)/gu, (match, braced, plain) => {
    const name = String(braced || plain || '');
    return variables.has(name) ? variables.get(name) : match;
  });
  return text;
}

function currentTinTinTabValues() {
  return (Array.isArray(state.sessions.tabs) ? state.sessions.tabs : [])
    .map((record) => expandTinTinTabVariables(record?.value ?? record))
    .filter(Boolean);
}

function tinTinCompletionPreview(mode = 'mixed') {
  if (state.remoteEcho || typeof tintinInputEditorApi.lastWordRange !== 'function') return null;
  const range = tintinInputEditorApi.lastWordRange(
    commandInput.value,
    commandInput.selectionStart,
    commandInput.selectionEnd
  );
  if (!range) return null;
  const candidates = typeof tintinInputEditorApi.completionCandidates === 'function'
    ? tintinInputEditorApi.completionCandidates({
      explicit: currentTinTinTabValues(),
      scrollback: state.plainText,
      autoTab: Number(state.sessions.config?.autoTab || 0),
      prefix: range.prefix,
      mode
    })
    : [];
  return { range, candidates };
}

function applyTinTinCompletion(operation, payload = {}) {
  if (state.remoteEcho || typeof tintinInputEditorApi.lastWordRange !== 'function') return false;
  const mode = operation.startsWith('auto tab') ? 'auto'
    : operation.startsWith('tab ') ? 'tab'
      : 'mixed';
  const backward = operation.endsWith('backward');
  const range = tintinInputEditorApi.lastWordRange(
    commandInput.value,
    commandInput.selectionStart,
    commandInput.selectionEnd
  );
  if (!range) { resetTinTinCompletion(); return false; }
  const explicit = Array.isArray(payload.tabs) ? payload.tabs : currentTinTinTabValues();
  const autoTab = Number.isSafeInteger(Number(payload.autoTab)) ? Number(payload.autoTab) : Number(state.sessions.config?.autoTab || 0);
  const key = `${mode}:${range.start}:${state.sessions.activeId}`;
  let cycle = state.tintinCompletion;
  const continuing = cycle.key === key
    && cycle.original
    && commandInput.value.slice(0, range.start) === cycle.original.slice(0, range.start)
    && (range.prefix === cycle.original.slice(range.start) || cycle.candidates.includes(range.prefix));
  if (!continuing) {
    const candidates = typeof tintinInputEditorApi.completionCandidates === 'function'
      ? tintinInputEditorApi.completionCandidates({ explicit, scrollback: state.plainText, autoTab, prefix: range.prefix, mode })
      : [];
    if (!candidates.length) { resetTinTinCompletion(); return false; }
    cycle = {
      key,
      prefix: range.prefix,
      original: commandInput.value,
      candidates,
      index: -1
    };
  }
  const sequenceLength = cycle.candidates.length + 1;
  let position = cycle.index + 1;
  if (backward) position = cycle.index < 0 ? cycle.candidates.length : cycle.index - 1;
  if (position < -1) position = cycle.candidates.length - 1;
  if (position >= cycle.candidates.length) position = -1;
  const replacement = position === -1 ? cycle.prefix : cycle.candidates[position];
  const base = cycle.original;
  commandInput.value = `${base.slice(0, range.start)}${replacement}`;
  commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
  cycle.index = position;
  state.tintinCompletion = cycle;
  resetHistoryNavigation();
  updateCommandAvailability(statusBox?.dataset.connectionState || (state.connected ? 'connected' : 'disconnected'));
  return true;
}

function braceTinTinCursorValue(value) {
  return `{${String(value ?? '').replaceAll('\\', '\\\\').replaceAll('{', '\\{').replaceAll('}', '\\}')}}`;
}

async function setTinTinCursorVariable(nameValue, value) {
  const name = String(nameValue || '').trim();
  if (!name || !state.sessions.activeId || !window.nukefire?.routeCommand) return;
  const prefix = normalizeClientCommandPrefix(state.sessions.commandPrefix);
  const command = `${prefix}variable ${braceTinTinCursorValue(name)} ${braceTinTinCursorValue(value)}`;
  const result = await window.nukefire.routeCommand(state.sessions.activeId, command);
  if (result?.snapshot) applySessionsSnapshot(result.snapshot, { followActive: false });
  for (const message of result?.messages || []) appendSystemMessage(message);
  schedulePersistentSettingsSave();
}

function tinTinHistorySearch() {
  if (state.remoteEcho || !state.history.length || typeof tintinInputEditorApi.historySearch !== 'function') return false;
  let search = state.tintinHistorySearch;
  if (search.index === null) {
    search = { query: commandInput.value, index: state.history.length, draft: commandInput.value };
  }
  const candidate = tintinInputEditorApi.historySearch(state.history, search.query, search.index);
  if (candidate < 0) {
    announce(`No earlier command contains ${search.query || 'that search'}.`);
    return false;
  }
  search.index = candidate;
  state.tintinHistorySearch = search;
  commandInput.value = state.history[candidate];
  commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
  updateCommandHistoryStatus();
  return true;
}

function handleTinTinCursorRequest(payload = {}) {
  if (state.remoteEcho) return;
  const operation = String(payload.operation || '').toLowerCase();
  if (operation.includes('tab')) {
    applyTinTinCompletion(operation, payload);
    return;
  }
  resetTinTinCompletion();
  if (operation === 'history prev') { historyUp(); return; }
  if (operation === 'history next') { historyDown(); return; }
  if (operation === 'history search') { tinTinHistorySearch(); return; }
  if (operation === 'get') { void setTinTinCursorVariable(payload.argument, commandInput.value); return; }
  if (operation === 'enter') { void sendCommand(commandInput.value); return; }
  if (typeof tintinInputEditorApi.editInput !== 'function') return;
  const edited = tintinInputEditorApi.editInput(
    commandInput.value,
    commandInput.selectionStart,
    commandInput.selectionEnd,
    operation,
    payload.argument || ''
  );
  commandInput.value = edited.value;
  commandInput.setSelectionRange(edited.selectionStart, edited.selectionEnd);
  resetHistoryNavigation();
  updateCommandAvailability(statusBox?.dataset.connectionState || (state.connected ? 'connected' : 'disconnected'));
}

async function requestTinTinCursorOperation(operation) {
  if (!state.sessions.activeId || !window.nukefire?.routeCommand) return null;
  const prefix = normalizeClientCommandPrefix(state.sessions.commandPrefix);
  return window.nukefire.routeCommand(state.sessions.activeId, `${prefix}cursor {${operation}}`);
}

function resetHistoryNavigation() {
  state.historyIndex = null;
  state.historyPrefix = '';
  state.draft = '';
  const record = activeSessionRecord();
  if (record) {
    record.historyIndex = null;
    record.historyPrefix = '';
    record.draft = '';
  }
  updateCommandHistoryStatus();
}

function previousHistoryIndex(startExclusive, prefix) {
  if (typeof historyNavigationApi.findPreviousHistoryIndex === 'function') {
    return historyNavigationApi.findPreviousHistoryIndex(state.history, startExclusive, prefix);
  }
  const normalizedPrefix = String(prefix || '').toLowerCase();
  for (let index = Math.min(startExclusive, state.history.length) - 1; index >= 0; index -= 1) {
    if (!normalizedPrefix || String(state.history[index] || '').toLowerCase().startsWith(normalizedPrefix)) return index;
  }
  return -1;
}

function nextHistoryIndex(startExclusive, prefix) {
  if (typeof historyNavigationApi.findNextHistoryIndex === 'function') {
    return historyNavigationApi.findNextHistoryIndex(state.history, startExclusive, prefix);
  }
  const normalizedPrefix = String(prefix || '').toLowerCase();
  for (let index = Math.max(startExclusive + 1, 0); index < state.history.length; index += 1) {
    if (!normalizedPrefix || String(state.history[index] || '').toLowerCase().startsWith(normalizedPrefix)) return index;
  }
  return -1;
}

function historyUp() {
  if (state.remoteEcho || state.history.length === 0) return;
  if (state.historyIndex === null) {
    state.draft = commandInput.value;
    const shouldSearch = typeof historyNavigationApi.shouldUsePrefixSearch === 'function'
      ? historyNavigationApi.shouldUsePrefixSearch(
        commandInput.value,
        commandInput.selectionStart,
        commandInput.selectionEnd
      )
      : Boolean(commandInput.value
        && commandInput.selectionStart === commandInput.value.length
        && commandInput.selectionEnd === commandInput.value.length);
    state.historyPrefix = shouldSearch ? commandInput.value : '';
  }

  const candidate = previousHistoryIndex(
    state.historyIndex === null ? state.history.length : state.historyIndex,
    state.historyPrefix
  );
  if (candidate < 0) {
    if (state.historyIndex === null) resetHistoryNavigation();
    return;
  }

  state.historyIndex = candidate;
  commandInput.value = state.history[candidate];
  commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
  updateCommandHistoryStatus();
}

function historyDown() {
  if (state.remoteEcho || state.historyIndex === null) return;
  const candidate = nextHistoryIndex(state.historyIndex, state.historyPrefix);
  if (candidate < 0) {
    const draft = state.tintinHistorySearch.index !== null ? state.tintinHistorySearch.draft : state.draft;
    resetTinTinCompletion();
    resetTinTinHistorySearch();
    resetHistoryNavigation();
    commandInput.value = draft;
  } else {
    state.historyIndex = candidate;
    commandInput.value = state.history[candidate];
  }
  commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
  updateCommandHistoryStatus();
}

function numberFrom(object, keys) {
  for (const key of keys) {
    const value = object?.[key];
    if (value !== undefined && value !== null && Number.isFinite(Number(value))) return Number(value);
  }
  return null;
}

function applyPromptBoundary(boundary) {
  flushActiveHighlightText({ promptBoundary: boundary });
  const type = boundary?.type === 'eor' ? 'EOR' : 'GA';
  state.promptBoundaryCount += 1;
  const indicator = $('#prompt-boundary');
  indicator.dataset.type = type.toLowerCase();
  scheduleProtocolCountersDisplay();
  const record = activeSessionRecord();
  if (record) {
    record.promptBoundaryCount = state.promptBoundaryCount;
    record.promptBoundaryType = type.toLowerCase();
    const boundaryText = String(record.readerCarry || '');
    const playingPrompt = typeof promptDisplayApi.looksLikeNukeFirePlayingPrompt === 'function'
      ? promptDisplayApi.looksLikeNukeFirePlayingPrompt(boundaryText)
      : boundaryText.trimEnd().endsWith('>');
    sessionRuntimeApi.commitBoundary?.(record, { rapidRecall: !playingPrompt });
  }
  resolveMapperMovementPrompt(state.mapper, { active: true });
  if (record?.mapper) {
    record.mapper.pendingMove = state.mapper.pendingMove;
    record.mapper.pendingMoves = state.mapper.pendingMoves;
    record.mapper.movementRoomsSincePrompt = state.mapper.movementRoomsSincePrompt;
  }
  commitReaderBoundary();
  commitSoundTriggerBoundary(record);
  const speechBoundary = commitSpeechTriggerBoundary(record);
  if (state.accessibility.selfVoiceEnabled) {
    selfVoice?.setSession?.(record?.id || state.sessions.activeId || 'main');
    if (speechBoundary) {
      if (speechBoundary.speechText) selfVoice?.write?.(speechBoundary.speechText, selfVoiceLineOptions());
    } else {
      selfVoice?.commitBoundary?.();
    }
  }
  flushCommunicationText();
}

function gmcpPackageMatches(packageName, names) {
  return names.includes(String(packageName || ''));
}

function gmcpSnapshotFromEvent(snapshot, message = {}) {
  if (message?.state && typeof message.state === 'object') return message.state;
  if (typeof gmcpStoreApi.applyEventPatch === 'function') {
    return gmcpStoreApi.applyEventPatch(snapshot, message);
  }

  // Compatibility fallback for development pages that did not load the shared
  // GMCP store helper. Production uses the path/value patch above so a small
  // vitals packet never carries the full map, GPS catalog, and channel cache.
  const target = snapshot && typeof snapshot === 'object'
    ? snapshot
    : { char: {}, room: {}, map: {}, gps: {}, context: {}, controls: {}, affects: {}, mob: {}, knowledge: {}, comm: {}, group: null, extras: {}, meta: {} };
  const packageName = String(message?.packageName || '');
  const body = message?.body;
  const directPaths = {
    'Char.Vitals': ['char', 'vitals'],
    'Char.Status': ['char', 'status'],
    'Char.StatusVars': ['char', 'statusVars'],
    'Char.MaxStats': ['char', 'maxStats'],
    'Char.GPS': ['char', 'gps'],
    'Char.TargetAffects': ['char', 'targetAffects'],
    'Room.Info': ['room', 'info'],
    'NukeFire.Map.Local': ['map', 'local'],
    'NukeFire.Context': ['context', 'state'],
    'NukeFire.Controls': ['controls', 'state'],
    'NukeFire.Affects': ['affects', 'state'],
    'NukeFire.Mob.Info': ['mob', 'info'],
    'NukeFire.Knowledge.Results': ['knowledge', 'results'],
    'NukeFire.Knowledge.Entry': ['knowledge', 'entry'],
    'NukeFire.Knowledge.Error': ['knowledge', 'error'],
    'Comm.Channel.List': ['comm', 'channels'],
    'Group': ['group']
  };
  const path = Array.isArray(message?.path) ? message.path : directPaths[packageName];
  if (path?.length) {
    let cursor = target;
    for (let index = 0; index < path.length - 1; index += 1) {
      cursor[path[index]] ||= {};
      cursor = cursor[path[index]];
    }
    cursor[path.at(-1)] = Object.prototype.hasOwnProperty.call(message, 'value')
      ? message.value
      : body;
  }
  return target;
}

function readerControlStateSnapshot() {
  const soundSnapshot = soundTriggerSnapshot();
  return {
    readerWorkspace: state.accessibility.readerWorkspaceEnabled,
    nativeScreenReader: state.accessibility.screenReaderMode,
    selfVoice: {
      available: selfVoiceAvailable(),
      enabled: state.accessibility.selfVoiceEnabled,
      muted: state.accessibility.selfVoiceMuted,
      foregroundOnly: state.accessibility.selfVoiceForegroundOnly,
      appForeground: state.accessibility.selfVoiceAppForeground,
      follow: state.accessibility.selfVoiceFollowMode,
      rate: state.accessibility.selfVoiceRate,
      pitch: state.accessibility.selfVoicePitch,
      volume: state.accessibility.selfVoiceVolume,
      error: String(selfVoice?.lastError || '')
    },
    audioCues: {
      enabled: state.accessibility.audioCuesEnabled,
      muted: state.accessibility.audioCuesMuted,
      foregroundOnly: state.accessibility.audioCuesForegroundOnly,
      volume: state.accessibility.audioCuesVolume,
      soundpackId: state.accessibility.soundpackId || 'builtin',
      soundpackName: String(audioCues?.soundpackName || 'Built-in NukeFire'),
      disabledEvents: state.accessibility.soundpackDisabledEvents.length,
      invalidPacks: state.accessibility.soundpackInvalid.length
    },
    communicationCues: { ...(state.accessibility.communicationCues || {}) },
    safetyAlerts: {
      enabled: state.accessibility.readerSafetyAlertsEnabled,
      ...(activeSessionRecord()?.readerSafety?.status?.() || {})
    },
    onboarding: {
      seen: Boolean(state.readerOnboarding.seen),
      tutorialCompleted: Boolean(state.readerOnboarding.tutorialCompleted),
      tutorial: readerTutorial?.status?.() || null
    },
    soundTriggers: {
      enabled: soundSnapshot.enabled !== false,
      count: Array.isArray(soundSnapshot.definitions) ? soundSnapshot.definitions.length : 0
    }
  };
}

const serverScreenReaderPreferenceBySession = new Map();

function syncServerScreenReaderPreference(status, options = {}) {
  if (!status || typeof status !== 'object') return false;
  if (!Object.prototype.hasOwnProperty.call(status, 'screen_reader')) return false;

  const enabled = typeof semanticControlsApi.normalizeServerScreenReaderFlag === 'function'
    ? semanticControlsApi.normalizeServerScreenReaderFlag(status.screen_reader)
    : null;
  if (enabled === null) return false;

  const sessionId = String(state.sessions.activeId || 'main');
  const previous = serverScreenReaderPreferenceBySession.get(sessionId);
  serverScreenReaderPreferenceBySession.set(sessionId, enabled);

  /*
   * Server SR=ON is authoritative accessibility intent. Make the official
   * client immediately usable, but preserve an already-selected speech path:
   * NukeFire Self-Voice users keep Self-Voice; native-reader users keep the
   * OS reader. If no speech path is active yet, native screen-reader mode is
   * the safest default. SR=OFF is remembered so a later OFF->ON transition
   * can trigger again, but it does not tear down a client-only reader setup.
   */
  if (!enabled || (previous === true && options.force !== true)) return false;

  setReaderWorkspaceEnabled(true, { announceChange: false, focus: false });
  if (!state.accessibility.screenReaderMode && !state.accessibility.selfVoiceEnabled) {
    setScreenReaderMode(true, { announceChange: false });
  }

  renderReaderWorkspaceStatus();
  const speechPath = state.accessibility.selfVoiceEnabled
    ? 'existing NukeFire Self-Voice preserved'
    : (state.accessibility.screenReaderMode ? 'native screen reader mode enabled' : 'reader speech settings preserved');
  announce(`Server screen reader mode detected. Reader Workspace enabled; ${speechPath}.`, { force: true });
  if (!state.readerOnboarding.seen) {
    markReaderOnboardingSeen();
    setTimeout(() => announce('Reader Mode is ready. Type C R tutorial for a short spoken walkthrough, or C R help for essential commands.', { force: true }), 250);
  }
  return true;
}

function readerDoctorText() {
  const snapshot = readerControlStateSnapshot();
  const serverReader = serverScreenReaderPreferenceBySession.get(String(state.sessions.activeId || 'main'));
  const history = activeReaderHistory()?.categoryStatus?.();
  const voice = snapshot.selfVoice;
  const problems = [];
  if (!snapshot.readerWorkspace && serverReader === true) problems.push('Reader Workspace is off while server screen reader mode is on');
  if (voice.enabled && !voice.available) problems.push('Self-Voice is enabled but the speech backend is unavailable');
  if (voice.enabled && voice.error) problems.push(`Self-Voice reported ${voice.error}`);
  if (voice.enabled && voice.muted) problems.push('Self-Voice is muted');
  if (voice.enabled && voice.foregroundOnly && !voice.appForeground) problems.push('foreground-only speech is currently suppressed');
  if (!history) problems.push('Reader History is unavailable for this session');
  if (snapshot.audioCues.enabled && snapshot.audioCues.muted) problems.push('Audio Cues are enabled but muted');
  if (snapshot.audioCues.enabled && snapshot.audioCues.foregroundOnly && !voice.appForeground) problems.push('foreground-only Audio Cues are currently suppressed');
  if (snapshot.audioCues.invalidPacks > 0) {
    const invalidPack = state.accessibility.soundpackInvalid[0];
    const detail = invalidPack ? ` First: ${invalidPack.filename || invalidPack.id}: ${invalidPack.error || 'invalid archive'}` : '';
    problems.push(`${snapshot.audioCues.invalidPacks} invalid soundpack file${snapshot.audioCues.invalidPacks === 1 ? '' : 's'} were skipped.${detail}`);
  }
  const communications = state.communications || {};
  const tellMessages = Array.isArray(communications.messages)
    ? communications.messages.filter((message) => String(message?.channel || '').toLowerCase() === 'tell').length
    : 0;
  const tellHistory = activeReaderHistory()?.categoryStatus?.('comm:tell');
  const lastTellReady = Boolean(communications.lastTell || activeSessionRecord()?.communications?.lastTell || readerHistoryLastTell());
  const health = problems.length ? `Needs attention: ${problems.join('; ')}.` : 'Reader control path ready.';
  return `Reader doctor. Server screen reader ${serverReader === true ? 'on' : serverReader === false ? 'off' : 'unknown'}; ` +
    `Reader Workspace ${snapshot.readerWorkspace ? 'on' : 'off'}; Self-Voice ${voice.enabled ? 'on' : 'off'}, backend ${voice.available ? 'available' : 'unavailable'}, ` +
    `muted ${voice.muted ? 'yes' : 'no'}, volume ${Math.round(Number(voice.volume) * 100)} percent, app foreground ${voice.appForeground ? 'yes' : 'no'}; ` +
    `Reader History ${history ? `${history.label}, ${history.count} total, ${Number(history.unread) || 0} new` : 'unavailable'}; ` +
    `Tell capture ${tellMessages} Communications messages, ${Number(tellHistory?.count) || 0} Reader History messages, Last Tell ${lastTellReady ? 'ready' : 'empty'}; ` +
    `Audio Cues ${snapshot.audioCues.enabled ? 'on' : 'off'}, ${snapshot.audioCues.muted ? 'muted' : 'unmuted'}, ${snapshot.audioCues.foregroundOnly ? 'foreground only' : 'background allowed'}, pack ${snapshot.audioCues.soundpackName}, ${snapshot.audioCues.disabledEvents} events disabled, ${snapshot.audioCues.invalidPacks} invalid packs; ` +
    `Safety alerts ${snapshot.safetyAlerts.enabled ? 'on' : 'off'}; ` +
    `Reader tutorial ${snapshot.onboarding?.tutorial?.active ? `running, step ${snapshot.onboarding.tutorial.step} of ${snapshot.onboarding.tutorial.count}` : snapshot.onboarding?.tutorialCompleted ? 'completed' : 'not yet completed'}. ${health}`;
}

function restartSelfVoiceRuntime(options = {}) {
  const wantedEnabled = state.accessibility.selfVoiceEnabled;
  const wantedMuted = state.accessibility.selfVoiceMuted;
  try { selfVoice?.stop?.(); } catch (_error) {}
  try { window.speechSynthesis?.cancel?.(); } catch (_error) {}
  try {
    if (window.speechSynthesis?.paused === true) window.speechSynthesis?.resume?.();
    window.speechSynthesis?.getVoices?.();
  } catch (_error) {}
  selfVoice = createSelfVoiceController();
  if (!selfVoice?.available?.()) {
    if (options.announceChange !== false) announce('NukeFire Self-Voice restart failed. Speech backend unavailable.', { force: true, interrupt: true });
    renderReaderWorkspaceStatus();
    return false;
  }
  selfVoice.setSession?.(state.sessions.activeId || 'main');
  selfVoice.setGovernorEnabled?.(state.accessibility.selfVoiceGovernorEnabled);
  selfVoice.setVoiceSettings?.({
    rate: state.accessibility.selfVoiceRate,
    pitch: state.accessibility.selfVoicePitch,
    volume: state.accessibility.selfVoiceVolume,
    voiceId: state.accessibility.selfVoiceVoiceId
  });
  refreshSelfVoiceVoiceOptions();
  selfVoice.setMuted?.(wantedMuted);
  selfVoice.setForeground?.(!state.accessibility.selfVoiceForegroundOnly || state.accessibility.selfVoiceAppForeground);
  const enabled = wantedEnabled ? selfVoice.setEnabled?.(true) === true : true;
  renderReaderWorkspaceStatus();
  if (options.announceChange !== false) {
    if (enabled && wantedEnabled && !wantedMuted) selfVoice.speak?.('NukeFire self-voice restarted.', { interrupt: true });
    else announce(enabled ? 'NukeFire Self-Voice runtime restarted.' : 'NukeFire Self-Voice restart failed.', { force: true, interrupt: true });
  }
  return enabled;
}

function setReaderSafetyAlertsEnabled(enabled, options = {}) {
  state.accessibility.readerSafetyAlertsEnabled = Boolean(enabled);
  for (const id of state.sessions.order || []) state.sessions.records[id]?.readerSafety?.setEnabled?.(state.accessibility.readerSafetyAlertsEnabled);
  activeSessionRecord()?.readerSafety?.setEnabled?.(state.accessibility.readerSafetyAlertsEnabled);
  if (options.persist !== false) {
    localStorage.setItem('nukefire.readerSafetyAlertsEnabled', String(state.accessibility.readerSafetyAlertsEnabled));
    schedulePersistentSettingsSave();
  }
  renderReaderWorkspaceStatus();
  if (options.announceChange !== false) announce(`Realtime reader safety alerts ${state.accessibility.readerSafetyAlertsEnabled ? 'enabled' : 'disabled'}.`, { force: true });
  return state.accessibility.readerSafetyAlertsEnabled;
}

async function recoverReaderRuntime(options = {}) {
  const serverReader = serverScreenReaderPreferenceBySession.get(String(state.sessions.activeId || 'main'));
  if (serverReader === true) setReaderWorkspaceEnabled(true, { announceChange: false, focus: false });
  activeSessionRecord()?.readerSafety?.reset?.();
  activeSessionRecord()?.readerSafety?.setEnabled?.(state.accessibility.readerSafetyAlertsEnabled);
  let voiceOk = true;
  if (state.accessibility.selfVoiceEnabled) voiceOk = restartSelfVoiceRuntime({ announceChange: false });
  const requests = await Promise.allSettled([
    sendActiveGmcp('Char.Status'),
    sendActiveGmcp('Char.Vitals'),
    sendActiveGmcp('Group'),
    sendActiveGmcp('NukeFire.Controls')
  ]);
  renderReaderWorkspaceStatus();
  const gmcpOk = requests.some((result) => result.status === 'fulfilled' && result.value === true);
  const ok = voiceOk && gmcpOk;
  if (options.announceChange !== false) announce(ok ? 'Reader runtime recovered and state refresh requested.' : 'Reader recovery completed with a remaining problem. Run CR DOCTOR.', { force: true, interrupt: true });
  return ok;
}

function emitReaderSafetyAlerts(packageName, body, snapshot) {
  const lane = activeSessionRecord()?.readerSafety;
  const readerActive = state.accessibility.readerWorkspaceEnabled || state.accessibility.screenReaderMode || state.accessibility.selfVoiceEnabled;
  if (!lane || !state.accessibility.readerSafetyAlertsEnabled || !readerActive) return false;
  lane.setEnabled?.(true);
  const alerts = lane.process?.(packageName, body, snapshot) || [];
  if (!alerts.length) return false;
  const best = [...alerts].sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0))[0];
  if (!best?.text) return false;
  activeReaderHistory()?.append?.('combat', best.text, { source: 'safety' });
  setReaderWorkspaceReviewStatus(best.text);
  announce(best.text, { force: true, interrupt: true });
  return true;
}

function readerControlStatusText() {
  const snapshot = readerControlStateSnapshot();
  const voice = snapshot.selfVoice;
  const cues = snapshot.audioCues;
  return `Reader Workspace ${snapshot.readerWorkspace ? 'on' : 'off'}; native reader ${snapshot.nativeScreenReader ? 'on' : 'off'}; ` +
    `Self-Voice ${voice.enabled ? (voice.muted ? 'on and muted' : 'on and unmuted') : 'off'}, ` +
    `speed ${Number(voice.rate).toFixed(1)} times, pitch ${Number(voice.pitch).toFixed(1)}, volume ${Math.round(Number(voice.volume) * 100)} percent, ` +
    `foreground-only ${voice.foregroundOnly ? 'on' : 'off'}, app foreground ${voice.appForeground ? 'yes' : 'no'}, backend ${voice.available ? 'available' : 'unavailable'}${voice.error ? `, last error ${voice.error}` : ''}; ` +
    `Safety alerts ${snapshot.safetyAlerts.enabled ? 'on' : 'off'}; Audio Cues ${cues.enabled ? (cues.muted ? 'on and muted' : 'on') : 'off'}; ` +
    `Sound Triggers ${snapshot.soundTriggers.enabled ? 'on' : 'off'} with ${snapshot.soundTriggers.count} configured.`;
}

async function sendNukeFireControlResult(request, ok, message) {
  if (!request?.id || !request?.action) return false;
  const action = String(request.action || '').trim().toLowerCase();
  const skipHistory = action === 'reader.tutorial'
    || action.startsWith('reader.review.')
    || action.startsWith('reader.lines.')
    || action.startsWith('reader.category.');
  if (!skipHistory) appendClientReaderHistory(message, { source: `client-control:${action}` });
  return sendActiveGmcp('NukeFire.Controls.Result', {
    schema: 1,
    id: request.id,
    ok: ok === true,
    action: request.action,
    message: String(message || '').slice(0, 500),
    state: readerControlStateSnapshot()
  });
}

function controlToggleValue(value, current) {
  const text = String(value || '').trim().toLowerCase();
  if (['on', 'yes', 'true', '1', 'enable', 'enabled'].includes(text)) return true;
  if (['off', 'no', 'false', '0', 'disable', 'disabled'].includes(text)) return false;
  if (text === 'toggle') return !Boolean(current);
  return null;
}

function controlNumberValue(value, minimum, maximum) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const numeric = Number(text);
  if (!Number.isFinite(numeric) || numeric < minimum || numeric > maximum) return null;
  return numeric;
}

async function handleNukeFireControlRequest(body) {
  const request = typeof semanticControlsApi.normalizeControlRequest === 'function'
    ? semanticControlsApi.normalizeControlRequest(body)
    : null;
  if (!request) return false;

  if (request.action === 'client.status') {
    return sendNukeFireControlResult(request, true, `NukeFire Client controls are ready. ${readerControlStatusText()}`);
  }
  if (request.action === 'reader.status') {
    return sendNukeFireControlResult(request, true, readerControlStatusText());
  }
  if (request.action === 'reader.audio.status') {
    const message = audioCueStatusText();
    return sendNukeFireControlResult(request, true, message);
  }
  if (request.action === 'reader.audio.enabled') {
    const next = controlToggleValue(request.args?.value, state.accessibility.audioCuesEnabled);
    if (next === null) return sendNukeFireControlResult(request, false, 'Audio Cues expect on, off, or toggle.');
    const applied = setAudioCuesEnabled(next, { unlock: true });
    const ok = next ? applied === true : state.accessibility.audioCuesEnabled === false;
    return sendNukeFireControlResult(request, ok,
      ok ? `Audio Cues ${next ? 'enabled' : 'disabled'}.` : 'Audio Cues could not be enabled because Web Audio is unavailable.');
  }
  if (request.action === 'reader.audio.muted') {
    const next = controlToggleValue(request.args?.value, state.accessibility.audioCuesMuted);
    if (next === null) return sendNukeFireControlResult(request, false, 'Audio Cue mute expects on, off, or toggle.');
    setAudioCuesMuted(next);
    return sendNukeFireControlResult(request, true, `Audio Cues ${next ? 'muted' : 'unmuted'}.`);
  }
  if (request.action === 'reader.audio.stop') {
    stopAudioCues();
    return sendNukeFireControlResult(request, true, 'Current Audio Cues stopped.');
  }
  if (request.action === 'reader.audio.test') {
    const ok = testAudioCue('hit') === true;
    return sendNukeFireControlResult(request, ok,
      ok ? 'Audio Cue test played.' : 'Audio Cue test could not play. Turn Audio Cues on and unmute them first.');
  }
  if (request.action === 'reader.audio.volume') {
    const percent = controlNumberValue(request.args?.value, 0, 100);
    if (percent === null) return sendNukeFireControlResult(request, false, 'Audio Cue volume must be from 0 through 100 percent.');
    setAudioCuesVolume(percent / 100, { announceChange: true });
    return sendNukeFireControlResult(request, true, `Audio Cue volume set to ${Math.round(percent)} percent.`);
  }
  if (request.action === 'reader.audio.foreground') {
    const next = controlToggleValue(request.args?.value, state.accessibility.audioCuesForegroundOnly);
    if (next === null) return sendNukeFireControlResult(request, false, 'Foreground-only Audio Cues expect on, off, or toggle.');
    setAudioCuesForegroundOnly(next);
    return sendNukeFireControlResult(request, true, `Foreground-only Audio Cues ${next ? 'enabled' : 'disabled'}.`);
  }
  if (request.action === 'reader.sound.status') {
    const message = communicationCueStatusText();
    return sendNukeFireControlResult(request, true, message);
  }
  if (request.action === 'reader.sound.channel') {
    const words = String(request.args?.value || '').trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
    const channel = normalizeCommunicationCueChannel(words[0]);
    const current = channel ? state.accessibility.communicationCues?.[channel] === true : false;
    const next = controlToggleValue(words[1], current);
    if (!channel || next === null) return sendNukeFireControlResult(request, false, 'Communication sound expects tell, auction, gossip, skynet, or ssf followed by on, off, or toggle.');
    setCommunicationCueChannel(channel, next);
    return sendNukeFireControlResult(request, true, `${communicationChannelLabel(channel)} sound ${next ? 'enabled' : 'disabled'}.`);
  }
  if (request.action === 'reader.sound.background') {
    const next = controlToggleValue(request.args?.value, state.accessibility.communicationCues?.background === true);
    if (next === null) return sendNukeFireControlResult(request, false, 'Background communication sounds expect on, off, or toggle.');
    setCommunicationCuesBackground(next);
    return sendNukeFireControlResult(request, true, `Background communication sounds ${next ? 'enabled' : 'disabled'}.`);
  }
  if (request.action === 'reader.sound.test') {
    const channel = normalizeCommunicationCueChannel(request.args?.value);
    if (!channel) return sendNukeFireControlResult(request, false, 'Communication sound test expects tell, auction, gossip, skynet, or ssf.');
    const ok = testCommunicationCue(channel) === true;
    return sendNukeFireControlResult(request, ok, ok ? `${communicationChannelLabel(channel)} sound test played.` : 'Communication sound test could not play. Check Audio Cues, mute, and background settings.');
  }
  if (request.action === 'reader.sound.reset') {
    resetCommunicationCues();
    return sendNukeFireControlResult(request, true, 'Communication sounds reset to off.');
  }
  if (request.action === 'reader.soundpack.status') {
    const packs = await refreshSoundpacks({ message: '' });
    const active = String(audioCues?.soundpackName || 'Built-in NukeFire');
    const customCount = Array.isArray(packs) ? packs.length : 0;
    const disabledCount = state.accessibility.soundpackDisabledEvents.length;
    const invalidCount = state.accessibility.soundpackInvalid.length;
    const message = `${active} soundpack active. ID ${state.accessibility.soundpackId || 'builtin'}. ${customCount} imported soundpack${customCount === 1 ? '' : 's'} installed; ${disabledCount} event${disabledCount === 1 ? '' : 's'} disabled; ${invalidCount} invalid pack file${invalidCount === 1 ? '' : 's'} skipped. Audio Cues ${state.accessibility.audioCuesEnabled ? 'on' : 'off'}, ${state.accessibility.audioCuesMuted ? 'muted' : 'unmuted'}, ${state.accessibility.audioCuesForegroundOnly ? 'foreground only' : 'background allowed'}.`;
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, true, message);
  }
  if (request.action === 'reader.soundpack.list') {
    const packs = await refreshSoundpacks({ message: '' });
    const names = packs.map((pack) => `${pack.name} (${pack.id})`);
    const invalidCount = state.accessibility.soundpackInvalid.length;
    const message = (names.length
      ? `Installed soundpacks: Built-in NukeFire (builtin); ${names.join('; ')}.`
      : 'Installed soundpacks: Built-in NukeFire (builtin). No imported soundpacks.') +
      ` Use the ID in parentheses with CR SOUNDPACK USE <id>.${invalidCount ? ` ${invalidCount} invalid pack file${invalidCount === 1 ? '' : 's'} skipped; CR DOCTOR reports this too.` : ''}`;
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, true, message);
  }
  if (request.action === 'reader.soundpack.import') {
    const result = await importSoundpack({ detailed: true, announceChange: false });
    announce(result.message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, result.ok === true || result.canceled === true, result.message);
  }
  if (request.action === 'reader.soundpack.use' || request.action === 'reader.soundpack.builtin') {
    const id = request.action === 'reader.soundpack.builtin'
      ? 'builtin'
      : String(request.args?.value || '').trim().toLowerCase();
    if (!id || id.length > 80 || !/^[a-z0-9][a-z0-9._-]*$/u.test(id)) {
      return sendNukeFireControlResult(request, false, 'Soundpack ID must use 1 through 80 lowercase letters, numbers, dots, underscores, or hyphens.');
    }
    const ok = await activateSoundpack(id, { announceChange: false });
    const message = ok ? `${audioCues?.soundpackName || 'Built-in NukeFire'} soundpack active.` : `Soundpack ${id} could not be activated.`;
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, ok, message);
  }
  if (request.action === 'reader.soundpack.test') {
    const requested = String(request.args?.value || '').trim().toLowerCase();
    if (!state.accessibility.soundpackEvents.length) await loadSoundpackEventCatalog();
    const cueId = soundpackEventRecord(requested)?.cue || audioCueApi.SERVER_SOUND_EVENT_CUES?.[requested] || audioCueApi.normalizeCueId?.(requested) || '';
    if (!cueId) return sendNukeFireControlResult(request, false, 'Unknown soundpack event. Use CR SOUNDPACK EVENTS to see event groups, then CR SOUNDPACK EVENTS <group>.');
    const ok = testAudioCue(cueId) === true;
    return sendNukeFireControlResult(request, ok, ok ? `Soundpack test ${requested} played.` : 'Soundpack test could not play. Check Audio Cues, mute, and background settings.');
  }
  if (request.action === 'reader.soundpack.events') {
    if (!state.accessibility.soundpackEvents.length) await loadSoundpackEventCatalog();
    const filter = String(request.args?.value || '').trim().toLowerCase();
    let message = '';
    let ok = true;
    if (!filter) {
      const groups = new Map();
      for (const record of state.accessibility.soundpackEvents) {
        const group = String(record.event || '').split('.')[0] || 'other';
        groups.set(group, (groups.get(group) || 0) + 1);
      }
      message = `Soundpack event groups: ${[...groups.entries()].map(([group, count]) => `${group} ${count}`).join(', ')}. Use CR SOUNDPACK EVENTS <group>, CR SOUNDPACK SHOW <event>, or CR SOUNDPACK <event> ON|OFF.`;
    } else {
      const records = state.accessibility.soundpackEvents.filter((record) => record.event === filter || record.event.startsWith(`${filter}.`));
      ok = records.length > 0;
      message = records.length
        ? `Soundpack events for ${filter}: ${records.map((record) => `${record.event} ${soundpackEventEnabled(record.event) ? 'on' : 'off'} (${soundpackEventSourceLabel(record)})`).join('; ')}.`
        : `No soundpack events match ${filter}.`;
    }
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, ok, message);
  }
  if (request.action === 'reader.soundpack.show') {
    if (!state.accessibility.soundpackEvents.length) await loadSoundpackEventCatalog();
    const words = String(request.args?.value || '').trim().toLowerCase().split(/\s+/u).filter(Boolean);
    const event = words[0] || '';
    const record = soundpackEventRecord(event);
    if (!record) return sendNukeFireControlResult(request, false, 'Unknown soundpack event. Use CR SOUNDPACK EVENTS to see event groups.');
    if (words[1]) {
      const next = controlToggleValue(words[1], soundpackEventEnabled(event));
      if (next === null || words.length > 2) return sendNukeFireControlResult(request, false, 'Use CR SOUNDPACK <event> ON, OFF, or TOGGLE.');
      setSoundpackEventEnabled(event, next, { announceChange: false });
      const message = `${event} sound ${next ? 'enabled' : 'disabled'}. The soundpack archive was not modified.`;
      announce(message, { force: true, interrupt: true });
      return sendNukeFireControlResult(request, true, message);
    }
    const result = await window.nukefire.describeSoundpack(state.accessibility.soundpackId);
    const options = result?.pack?.events?.[event];
    const enabled = soundpackEventEnabled(event);
    const source = soundpackEventSourceLabel(record);
    const message = options
      ? `${event} is ${enabled ? 'on' : 'off'}, ${source}, in ${result.pack.name}: ${options.files.length} custom sound, volume ${Math.round(options.volume * 100)} percent, cooldown ${options.cooldown_ms} milliseconds, ${options.selection} selection.`
      : `${event} is ${enabled ? 'on' : 'off'}, ${source}, using the built-in fallback in ${result?.pack?.name || 'the active soundpack'}.`;
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, result?.ok === true, message);
  }
  if (request.action === 'reader.soundpack.assign') {
    const event = String(request.args?.value || '').trim().toLowerCase();
    if (state.accessibility.soundpackId === 'builtin') return sendNukeFireControlResult(request, false, 'Duplicate Built-in NukeFire before assigning a custom sound.');
    const result = await withCommandDraftPreserved(() => window.nukefire.assignSoundpackEvent({ id: state.accessibility.soundpackId, event, volume: 1, cooldown_ms: 0 }));
    const message = result?.canceled ? 'Audio assignment canceled; the active soundpack was not changed.' : (result?.ok ? `${event} audio assigned.` : `Audio was not assigned: ${result?.error || 'invalid request'}.`);
    if (result?.ok) await activateSoundpack(state.accessibility.soundpackId, { announceChange: false });
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, result?.ok === true || result?.canceled === true, message);
  }
  if (request.action === 'reader.soundpack.clear') {
    const event = String(request.args?.value || '').trim().toLowerCase();
    const result = await withCommandDraftPreserved(() => window.nukefire.clearSoundpackEvent({ id: state.accessibility.soundpackId, event }));
    const message = result?.ok ? `${event} restored to built-in fallback.` : `Soundpack was not changed: ${result?.error || 'invalid request'}.`;
    if (result?.ok) await activateSoundpack(state.accessibility.soundpackId, { announceChange: false });
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, result?.ok === true, message);
  }
  if (request.action === 'reader.soundpack.volume') {
    const words = String(request.args?.value || '').trim().toLowerCase().split(/\s+/u);
    const percent = controlNumberValue(words.pop(), 0, 100);
    const event = words.join(' ');
    if (!event || percent === null) return sendNukeFireControlResult(request, false, 'Use CR SOUNDPACK VOLUME <event> <0-100>.');
    const result = await withCommandDraftPreserved(() => window.nukefire.updateSoundpackEvent({ id: state.accessibility.soundpackId, event, volume: percent / 100 }));
    const message = result?.ok ? `${event} volume set to ${Math.round(percent)} percent.` : `Soundpack was not changed: ${result?.error || 'invalid request'}.`;
    if (result?.ok) await activateSoundpack(state.accessibility.soundpackId, { announceChange: false });
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, result?.ok === true, message);
  }
  if (request.action === 'reader.soundpack.duplicate') {
    const words = String(request.args?.value || '').trim().toLowerCase().split(/\s+/u).filter(Boolean);
    const sourceId = words.length > 1 ? words[0] : state.accessibility.soundpackId;
    const id = words.length > 1 ? words[1] : words[0];
    const result = await withCommandDraftPreserved(() => window.nukefire.duplicateSoundpack({ sourceId, id, name: id, author: 'Player' }));
    const message = result?.ok ? `${id} created from ${sourceId}.` : `Soundpack was not duplicated: ${result?.error || 'invalid request'}.`;
    if (result?.ok) { await refreshSoundpacks({ message }); await activateSoundpack(id, { announceChange: false }); }
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, result?.ok === true, message);
  }
  if (request.action === 'reader.soundpack.export') {
    const id = String(request.args?.value || state.accessibility.soundpackId).trim().toLowerCase();
    const result = await withCommandDraftPreserved(() => window.nukefire.exportSoundpack(id));
    const message = result?.canceled ? 'Soundpack export canceled.' : (result?.ok ? `${id} exported.` : `Soundpack export failed: ${result?.error || 'invalid request'}.`);
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, result?.ok === true || result?.canceled === true, message);
  }
  if (request.action === 'reader.doctor') {
    const message = readerDoctorText();
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, true, message);
  }
  if (request.action === 'reader.session.begin') {
    const captured = capturePreReaderSetup();
    const message = captured
      ? 'Your current client setup was saved. Use CR OFF or SR OFF to restore it.'
      : 'Your original pre-Reader client setup is already saved. Use CR OFF or SR OFF to restore it.';
    return sendNukeFireControlResult(request, true, message);
  }
  if (request.action === 'reader.exit.restore') {
    const result = restorePreReaderSetup();
    announce(result.message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, true, result.message);
  }
  if (request.action === 'reader.recover') {
    const ok = await recoverReaderRuntime({ announceChange: false });
    const message = ok ? 'Reader runtime recovered and authoritative state refresh requested.' : `Reader recovery found a remaining problem. ${readerDoctorText()}`;
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, ok, message);
  }
  if (request.action === 'reader.unread') {
    const message = readerUnreadText();
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, true, message);
  }
  if (request.action === 'reader.context') {
    const message = readerContextText();
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, true, message);
  }
  if (request.action === 'reader.keys') {
    const result = applyReaderKeysCommand(request.args?.value || 'status');
    const message = result.message;
    announce(message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, result.ok === true, message);
  }
  if (request.action === 'reader.tutorial') {
    const message = readerTutorialCommand(request.args?.value || 'start');
    return sendNukeFireControlResult(request, !/expects|unavailable/iu.test(message), message);
  }
  if (request.action === 'reader.preset') {
    const aliases = {
      native: 'native-reader',
      live: 'reader-live-voice',
      fast: 'fast-reader',
      quiet: 'quiet-review'
    };
    const requested = String(request.args?.value || '').trim().toLowerCase();
    const presetId = aliases[requested] || '';
    const preset = presetId && typeof readerPresetsApi.getReaderPreset === 'function'
      ? readerPresetsApi.getReaderPreset(presetId)
      : null;
    if (!preset) {
      return sendNukeFireControlResult(request, false, 'Unknown Reader preset. Use native, live, fast, or quiet.');
    }
    const applied = applyReaderSetupPreset(presetId, { announceChange: false });
    return sendNukeFireControlResult(request, applied === true,
      applied ? `${preset.label} Reader preset applied.` : `Could not apply the ${preset.label} Reader preset.`);
  }

  if (request.action === 'reader.load.mushsettings') {
    const result = applyMushSettingsPreset();
    announce(result.message, { force: true, interrupt: true });
    return sendNukeFireControlResult(request, result.ok === true, result.message);
  }

  if (request.action === 'reader.workspace') {
    const next = controlToggleValue(request.args?.value, state.accessibility.readerWorkspaceEnabled);
    if (next === null) return sendNukeFireControlResult(request, false, 'Reader Workspace expects on, off, or toggle.');
    setReaderWorkspaceEnabled(next, { focus: false });
    return sendNukeFireControlResult(request, true, `Reader Workspace ${next ? 'enabled' : 'disabled'}.`);
  }

  if (request.action === 'reader.voice.enabled') {
    const next = controlToggleValue(request.args?.value, state.accessibility.selfVoiceEnabled);
    if (next === null) return sendNukeFireControlResult(request, false, 'Self-Voice expects on, off, or toggle.');
    const ok = setSelfVoiceEnabled(next) === true;
    return sendNukeFireControlResult(request, ok,
      ok ? `NukeFire Self-Voice ${next ? 'enabled' : 'disabled'}.` : 'NukeFire Self-Voice is unavailable on this system.');
  }

  if (request.action === 'reader.voice.muted') {
    const next = controlToggleValue(request.args?.value, state.accessibility.selfVoiceMuted);
    if (next === null) return sendNukeFireControlResult(request, false, 'Self-Voice mute expects on, off, or toggle.');
    setSelfVoiceMuted(next);
    return sendNukeFireControlResult(request, true, `NukeFire Self-Voice ${next ? 'muted' : 'unmuted'}.`);
  }

  if (request.action === 'reader.voice.restart') {
    const ok = restartSelfVoiceRuntime({ announceChange: false });
    return sendNukeFireControlResult(request, ok, ok ? 'NukeFire Self-Voice runtime restarted.' : 'NukeFire Self-Voice restart failed because the speech backend is unavailable.');
  }

  if (request.action === 'reader.voice.stop') {
    stopSelfVoiceNow();
    return sendNukeFireControlResult(request, true, 'Current NukeFire Self-Voice speech stopped.');
  }

  if (request.action === 'reader.voice.test') {
    const ok = testSelfVoice() === true;
    return sendNukeFireControlResult(request, ok,
      ok ? 'NukeFire Self-Voice test spoken.' : 'Self-Voice test could not be spoken. Check that Self-Voice is on and unmuted.');
  }

  if (request.action === 'reader.voice.rate') {
    const rate = controlNumberValue(request.args?.value, 0.1, 10);
    if (rate === null) return sendNukeFireControlResult(request, false, 'Self-Voice speed must be from 0.1 through 10.0.');
    setSelfVoiceVoiceSettings({ rate }, { announceChange: false });
    announce(`Self-Voice speed ${rate.toFixed(1)} times.`, { force: true });
    return sendNukeFireControlResult(request, true, `Self-Voice speed set to ${rate.toFixed(1)} times.`);
  }

  if (request.action === 'reader.voice.pitch') {
    const pitch = controlNumberValue(request.args?.value, 0, 2);
    if (pitch === null) return sendNukeFireControlResult(request, false, 'Self-Voice pitch must be from 0.0 through 2.0.');
    setSelfVoiceVoiceSettings({ pitch }, { announceChange: false });
    announce(`Self-Voice pitch ${pitch.toFixed(1)}.`, { force: true });
    return sendNukeFireControlResult(request, true, `Self-Voice pitch set to ${pitch.toFixed(1)}.`);
  }

  if (request.action === 'reader.voice.volume') {
    const percent = controlNumberValue(request.args?.value, 0, 100);
    if (percent === null) return sendNukeFireControlResult(request, false, 'Self-Voice volume must be from 0 through 100 percent.');
    setSelfVoiceVoiceSettings({ volume: percent / 100 }, { announceChange: false });
    announce(`Self-Voice volume ${Math.round(percent)} percent.`, { force: true });
    return sendNukeFireControlResult(request, true, `Self-Voice volume set to ${Math.round(percent)} percent.`);
  }

  if (request.action === 'reader.alerts.enabled') {
    const next = controlToggleValue(request.args?.value, state.accessibility.readerSafetyAlertsEnabled);
    if (next === null) return sendNukeFireControlResult(request, false, 'Reader safety alerts expect on, off, or toggle.');
    setReaderSafetyAlertsEnabled(next);
    return sendNukeFireControlResult(request, true, `Realtime reader safety alerts ${next ? 'enabled' : 'disabled'}.`);
  }

  if (request.action === 'reader.voice.foreground') {
    const next = controlToggleValue(request.args?.value, state.accessibility.selfVoiceForegroundOnly);
    if (next === null) return sendNukeFireControlResult(request, false, 'Foreground-only Self-Voice expects on, off, or toggle.');
    setSelfVoiceForegroundOnly(next);
    return sendNukeFireControlResult(request, true, `Foreground-only Self-Voice ${next ? 'enabled' : 'disabled'}.`);
  }

  const categoryActions = {
    'reader.category.next': readerHistoryNextCategory,
    'reader.category.previous': readerHistoryPreviousCategory,
    'reader.category.status': readerHistoryCategoryStatus
  };
  const categoryAction = categoryActions[request.action];
  if (typeof categoryAction === 'function') {
    const ok = categoryAction() !== false;
    return sendNukeFireControlResult(request, ok,
      ok ? 'Reader History category action completed.' : 'There is no Reader History category available for that action.');
  }

  if (request.action === 'reader.review.back' || request.action === 'reader.review.forward') {
    const amount = Number(String(request.args?.value || '').trim());
    if (amount !== 10) {
      return sendNukeFireControlResult(request, false, 'Reader review jump expects exactly 10 messages.');
    }
    const ok = readerHistoryMove(request.action === 'reader.review.back' ? -10 : 10) !== false;
    return sendNukeFireControlResult(request, ok,
      ok ? 'Reader review jump completed.' : 'There is nothing available for that Reader review jump.');
  }

  const lineActions = {
    'reader.lines.current': reviewCurrentLine,
    'reader.lines.previous': reviewPreviousLine,
    'reader.lines.next': reviewNextLine,
    'reader.lines.latest': reviewLatestLine
  };
  const lineAction = lineActions[request.action];
  if (typeof lineAction === 'function') {
    const ok = lineAction() !== false;
    return sendNukeFireControlResult(request, ok,
      ok ? 'Reader line review action completed.' : 'There is no completed terminal line available for that action.');
  }

  if (request.action === 'reader.lines.recall') {
    const amount = Number(String(request.args?.value || '').trim());
    if (!Number.isInteger(amount) || amount < 1 || amount > 10)
      return sendNukeFireControlResult(request, false, 'Reader line recall expects a number from 1 through 10.');
    const ok = recallReaderLine(amount) !== false;
    return sendNukeFireControlResult(request, ok,
      ok ? 'Reader line recalled.' : 'That recent terminal line is not available.');
  }

  const reviewActions = {
    'reader.review.repeat': readerHistoryRepeat,
    'reader.review.first': readerHistoryFirst,
    'reader.review.latest': readerHistoryLatest,
    'reader.review.previous': readerHistoryPrevious,
    'reader.review.next': readerHistoryNext,
    'reader.review.tell': recallLastTell,
    'reader.review.communication': recallLastCommunication
  };
  const action = reviewActions[request.action];
  if (typeof action === 'function') {
    const ok = action() !== false;
    return sendNukeFireControlResult(request, ok,
      ok ? 'Reader review action completed.' : 'There is nothing available for that Reader review action.');
  }
  return sendNukeFireControlResult(request, false, 'Unsupported NukeFire client control request.');
}

const MAX_LOOT_HISTORY_EVENTS = 2500;
const DEFAULT_LOOT_HISTORY_VISIBLE = 250;
const LOOT_HISTORY_VISIBLE_STEP = 250;
const LOOT_HISTORY_FILTERS = new Set(['all', 'equipment', 'key', 'material', 'credits']);

function normalizeLootHistoryEvent(body = {}) {
  if (!body || typeof body !== 'object' || Number(body.schema) !== 1) return null;
  const kind = String(body.kind || '').toLowerCase();
  const category = String(body.category || (kind === 'credits' ? 'credits' : 'equipment')).toLowerCase();
  if (kind !== 'item' && kind !== 'credits') return null;
  const item = body.item && typeof body.item === 'object' ? body.item : {};
  const source = body.source && typeof body.source === 'object' ? body.source : {};
  return {
    kind,
    category: LOOT_HISTORY_FILTERS.has(category) && category !== 'all' ? category : (kind === 'credits' ? 'credits' : 'equipment'),
    timestamp: Number(body.timestamp) > 0 ? Number(body.timestamp) * 1000 : Date.now(),
    amount: Math.max(0, Number(body.amount) || 0),
    item: {
      uuid: String(item.uuid || ''), vnum: Number(item.vnum) || 0,
      name: String(item.name || 'Unknown item').trim() || 'Unknown item',
      value: Number(item.value) || 0, inscribed: item.inscribed === true,
      inscription: String(item.inscription || '')
    },
    source: {
      mobVnum: Number(source.mob_vnum) || 0,
      mobName: String(source.mob_name || '').trim(),
      roomVnum: Number(source.room_vnum) || 0,
      zoneVnum: Number(source.zone_vnum) || 0
    }
  };
}

function addLootHistoryEvent(history, body) {
  if (!history) return false;
  const normalized = normalizeLootHistoryEvent(body);
  if (!normalized) return false;
  history.events ||= [];
  history.nextId = Number(history.nextId) || 1;
  history.events.push({ ...normalized, id: history.nextId++ });
  if (history.events.length > MAX_LOOT_HISTORY_EVENTS) {
    history.events.splice(0, history.events.length - MAX_LOOT_HISTORY_EVENTS);
  }
  return true;
}

function renderLootHistory() {
  const list = $('#loot-history-list');
  const empty = $('#loot-history-empty');
  const status = $('#loot-history-status');
  const more = $('#loot-history-more');
  if (!list || !empty || !status) return;
  const history = state.lootHistory || { events: [], filter: 'all', nextId: 1, visibleLimit: DEFAULT_LOOT_HISTORY_VISIBLE };
  const filter = LOOT_HISTORY_FILTERS.has(history.filter) ? history.filter : 'all';
  const filtered = (history.events || []).filter((event) => filter === 'all' || event.category === filter).slice().reverse();
  history.visibleLimit = Math.max(DEFAULT_LOOT_HISTORY_VISIBLE, Math.min(MAX_LOOT_HISTORY_EVENTS, Number(history.visibleLimit) || DEFAULT_LOOT_HISTORY_VISIBLE));
  const events = filtered.slice(0, history.visibleLimit);
  list.replaceChildren(...events.map((event) => {
    const row = document.createElement('div'); row.className = 'loot-history-row'; row.setAttribute('role', 'listitem');
    const item = document.createElement('div'); item.className = 'loot-history-item';
    item.textContent = event.kind === 'credits' ? `${Math.trunc(event.amount).toLocaleString()} credits` : event.item.name;
    const source = document.createElement('div'); source.className = 'loot-history-source'; source.textContent = event.source.mobName || (event.source.zoneVnum ? `Zone ${event.source.zoneVnum}` : 'Unknown source');
    const meta = document.createElement('div'); meta.className = 'loot-history-meta';
    const bits = [event.category];
    if (event.kind === 'item' && event.item.vnum) bits.push(`#${event.item.vnum}`);
    if (event.item?.inscribed) bits.push(event.item.inscription ? `inscribed: ${event.item.inscription}` : 'inscribed');
    meta.textContent = bits.join(' · ');
    row.append(item, source, meta); return row;
  }));
  empty.hidden = events.length > 0;
  const total = history.events?.length || 0;
  const filteredCount = filtered.length;
  const shown = events.length;
  const filterText = filter === 'all' ? '' : ` · ${filter}`;
  const windowText = filteredCount > shown ? ` · showing newest ${shown.toLocaleString()} of ${filteredCount.toLocaleString()}` : '';
  status.textContent = `${total.toLocaleString()} loot event${total === 1 ? '' : 's'} this session${filterText}${windowText}.`;
  if (more) {
    const remaining = Math.max(0, filteredCount - shown);
    more.hidden = remaining === 0;
    more.textContent = remaining > 0 ? `Show ${Math.min(LOOT_HISTORY_VISIBLE_STEP, remaining).toLocaleString()} older` : 'Show older';
  }
  document.querySelectorAll('[data-loot-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lootFilter === filter)));
  publishPanelPopoutState('lootHistory');
}

function setLootHistoryFilter(filter) {
  state.lootHistory.filter = LOOT_HISTORY_FILTERS.has(filter) ? filter : 'all';
  state.lootHistory.visibleLimit = DEFAULT_LOOT_HISTORY_VISIBLE;
  const record = activeSessionRecord(); if (record) record.lootHistory = state.lootHistory;
  renderLootHistory();
}

function showOlderLootHistory() {
  state.lootHistory.visibleLimit = Math.min(
    MAX_LOOT_HISTORY_EVENTS,
    Math.max(DEFAULT_LOOT_HISTORY_VISIBLE, Number(state.lootHistory.visibleLimit) || DEFAULT_LOOT_HISTORY_VISIBLE) + LOOT_HISTORY_VISIBLE_STEP
  );
  const record = activeSessionRecord(); if (record) record.lootHistory = state.lootHistory;
  renderLootHistory();
}

function foundlistSnapshot() {
  return typeof foundlistApi.normalizeInfo === 'function'
    ? foundlistApi.normalizeInfo(state.gmcp?.foundlist?.info || {})
    : null;
}

function showFoundlistPanel() {
  if (state.workspace.activePanels.foundlist === true) return;
  applyPanelVisibility({ ...state.workspace.activePanels, foundlist: true }, { persist: false });
}

function foundlistVerdictLabel(verdict) {
  return ({
    upgrade: '↑ Upgrade', tossup: '↔ Toss-up', downgrade: '↓ Downgrade',
    'cannot-wear': "Can't wear", 'needs-remorts': 'Needs remorts',
    'not-comparable': 'Not comparable', neutral: '—'
  })[String(verdict || '')] || '—';
}

function renderFoundlist() {
  const content = $('#foundlist-content');
  const empty = $('#foundlist-empty');
  const list = $('#foundlist-items');
  if (!content || !empty || !list) return;
  const snapshot = foundlistSnapshot();
  if (!snapshot) {
    content.hidden = true;
    empty.hidden = false;
    list.replaceChildren();
    publishPanelPopoutState('foundlist');
    return;
  }

  content.hidden = false;
  empty.hidden = true;
  $('#foundlist-zone').textContent = `${snapshot.zone.name || 'Unknown zone'} · Zone ${snapshot.zone.vnum}`;
  $('#foundlist-summary').textContent = `Found ${snapshot.summary.found.toLocaleString()} of ${snapshot.summary.loadable.toLocaleString()} known loadable items · ${snapshot.summary.missing.toLocaleString()} not found`;
  $('#foundlist-upgrade-count').textContent = `${snapshot.summary.upgrades.toLocaleString()} upgrade${snapshot.summary.upgrades === 1 ? '' : 's'} · ${snapshot.summary.tossups.toLocaleString()} toss-up${snapshot.summary.tossups === 1 ? '' : 's'}`;

  const filter = foundlistApi.FILTERS?.has(state.foundlist.filter) ? state.foundlist.filter : 'all';
  const items = typeof foundlistApi.filterItems === 'function'
    ? foundlistApi.filterItems(snapshot, filter)
    : snapshot.items;
  list.replaceChildren(...items.map((entry) => {
    const row = document.createElement('div'); row.className = 'foundlist-row'; row.dataset.verdict = entry.verdict; row.setAttribute('role', 'listitem');
    const name = document.createElement('div'); name.className = 'foundlist-name'; name.textContent = entry.name;
    const verdict = document.createElement('div'); verdict.className = 'foundlist-verdict'; verdict.textContent = foundlistVerdictLabel(entry.verdict);
    const meta = document.createElement('div'); meta.className = 'foundlist-meta';
    const bits = [`#${entry.vnum}`]; if (entry.minRemorts > 0) bits.push(`${entry.minRemorts.toLocaleString()}R minimum`); meta.textContent = bits.join(' · ');
    const inspect = document.createElement('button'); inspect.type = 'button'; inspect.className = 'foundlist-dbid'; inspect.dataset.foundlistDbid = String(entry.vnum); inspect.textContent = 'DBID'; inspect.title = `Inspect object ${entry.vnum} with the server dbid command`;
    row.append(name, verdict, meta, inspect); return row;
  }));
  $('#foundlist-filter-empty').hidden = items.length > 0;
  $('#foundlist-truncated').hidden = snapshot.summary.truncated !== true;
  document.querySelectorAll('[data-foundlist-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.foundlistFilter === filter)));
  publishPanelPopoutState('foundlist');
}

function processFoundlistSnapshot(input, options = {}) {
  if (!state.gmcp.foundlist) state.gmcp.foundlist = {};
  state.gmcp.foundlist.info = input;
  renderFoundlist();
  if (options.autoOpen !== false && foundlistSnapshot()) showFoundlistPanel();
}

function syncFoundlistRoomLifecycle(roomInfo) {
  const snapshot = foundlistSnapshot();
  const roomZone = Number(roomInfo?.zone);
  if (!snapshot || !Number.isFinite(roomZone) || roomZone <= 0 || roomZone === snapshot.zone.vnum) return;
  if (state.gmcp?.foundlist) state.gmcp.foundlist.info = null;
  if (state.workspace.activePanels.foundlist === true) {
    applyPanelVisibility({ ...state.workspace.activePanels, foundlist: false }, { persist: false });
  }
  renderFoundlist();
}

function setFoundlistFilter(filter) {
  state.foundlist.filter = foundlistApi.FILTERS?.has(filter) ? filter : 'all';
  renderFoundlist();
}

function applyGmcp(message) {
  const packageName = String(message?.packageName || '');
  if (packageName === 'NukeFire.Combat' && Number(message?.body?.out?.kills) > 0) {
    beginCombatTargetPresentationHold();
  }
  captureCommunicationGmcp(message);
  appendReaderHistoryGmcp(activeSessionRecord(), packageName, message?.body);
  if (packageName === 'NukeFire.Controls.Request') void handleNukeFireControlRequest(message?.body);

  // Per-packet GMCP events carry only the changed path/value. Full snapshots
  // are still accepted for connect, copyover, and explicit resynchronization.
  // Semantic audio needs a before/after copy only for the few packages it can
  // actually sonify, and only while Audio Cues are able to play. Avoid cloning
  // group members and vitals for every unrelated GMCP packet.
  const semanticAudioActive = state.accessibility.audioCuesEnabled &&
    !state.accessibility.audioCuesMuted &&
    (!state.accessibility.audioCuesForegroundOnly || state.accessibility.selfVoiceAppForeground);
  const semanticAudioPackage = packageName === 'NukeFire.Combat' || packageName === 'NukeFire.Sound.Event' ||
    packageName === 'NukeFire.Loot.Event' || packageName === 'Char.Vitals' || packageName === 'Group';
  const calculateSemanticAudio = semanticAudioActive && semanticAudioPackage &&
    typeof audioCueApi.semanticCueForEvent === 'function';
  const previousAudioVitals = calculateSemanticAudio && packageName !== 'Group'
    ? { ...(state.gmcp?.char?.vitals || {}) }
    : {};
  const previousAudioGroup = calculateSemanticAudio && packageName === 'Group' &&
    state.gmcp?.group && typeof state.gmcp.group === 'object'
    ? {
        ...state.gmcp.group,
        members: Array.isArray(state.gmcp.group.members)
          ? state.gmcp.group.members.map((member) => ({
              ...member,
              info: member?.info && typeof member.info === 'object' ? { ...member.info } : member?.info
            }))
          : []
      }
    : {};
  const snapshot = gmcpSnapshotFromEvent(state.gmcp, message);
  const semanticCue = calculateSemanticAudio
    ? audioCueApi.semanticCueForEvent(
        packageName,
        message?.body,
        previousAudioVitals,
        snapshot?.char?.vitals || {},
        {
          previousGroup: previousAudioGroup,
          nextGroup: snapshot?.group || {},
          selfName: snapshot?.char?.status?.name || ''
        }
      )
    : '';
  applyGmcpState(snapshot, { packageName, body: message?.body });
  if (packageName === 'NukeFire.Combat' && mobInspectorCurrentOpponent()?.name) {
    if (Number(message?.body?.out?.kills) > 0) {
      state.mobInspector.combatRefreshKey = '';
      state.mobInspector.lastTargetAffectsRequestMs = 0;
      state.mobInspector.pendingCombatKillRefresh = true;
      state.mobInspector.lastCombatKillRefreshMs = Date.now();
      scheduleCombatKillTargetRefresh();
    } else {
      void requestMobInspectorTargetAffects();
    }
  }
  if (semanticCue) playSemanticAudioCue(semanticCue);
  emitReaderSafetyAlerts(packageName, message?.body, snapshot);

  if (packageName === 'NukeFire.Loot.Event') {
    addLootHistoryEvent(state.lootHistory, message?.body);
    const record = activeSessionRecord();
    if (record) record.lootHistory = state.lootHistory;
    renderLootHistory();
  }

  if (packageName === 'NukeFire.Context') {
    const primary = typeof contextApi.primaryContext === 'function'
      ? contextApi.primaryContext(state.contextDeck.snapshot, { normalized: true })
      : null;
    if (primary && primary.kind !== 'zone' && primary.id !== state.contextDeck.lastPrimaryId) {
      state.contextDeck.lastPrimaryId = primary.id;
      announce(`NukeFire Console ready for ${primary.title}.`);
    } else if (!primary) {
      state.contextDeck.lastPrimaryId = '';
    }
  }

  if (packageName.startsWith('NukeFire.Knowledge.')) {
    processKnowledgePacket(packageName, message.body);
  }

  if (packageName === 'NukeFire.GPS.Catalog.End') {
    const version = Number(message.body?.version) || 1;
    if (state.mapper.gpsCatalogAnnouncementVersion !== version) {
      state.mapper.gpsCatalogAnnouncementVersion = version;
      const count = Number(message.body?.count) || 0;
      announce(`GPS destination list ready${count ? ` with ${count.toLocaleString()} destinations` : ''}.`, { force: true });
    }
  }

  state.protocol.gmcpMessages += 1;
  scheduleProtocolCountersDisplay();

  // Preserve the long-standing direct Char.Vitals compatibility path used by
  // older bridges, development pages, and accessibility controls. Production
  // compact events include packageName/path, so this branch does no work on
  // the normal high-frequency transport path.
  if (!message?.state && (!packageName || packageName === 'Char.Vitals') &&
      message?.body && typeof message.body === 'object' && !Array.isArray(message.body) &&
      !Array.isArray(message?.path)) {
    const directSnapshot = state.gmcp || {
      char: {}, room: {}, comm: {}, group: null, meta: {}
    };
    directSnapshot.char = { ...directSnapshot.char, vitals: message.body };
    applyGmcpState(directSnapshot, { packageName: 'Char.Vitals', body: message.body });
  }
}

function applyGmcpState(snapshot, options = {}) {
  if (!snapshot || typeof snapshot !== 'object') return;
  const packageName = String(options.packageName || '');
  const fullRefresh = !packageName;
  const compareCommunicationChannels = fullRefresh || packageName === 'Comm.Channel.List';
  const previousCommunicationChannels = compareCommunicationChannels
    ? JSON.stringify(state.gmcp?.comm?.channels || null)
    : '';
  const nextCommunicationChannels = compareCommunicationChannels
    ? JSON.stringify(snapshot.comm?.channels || null)
    : '';
  const hasPackageBody = Object.prototype.hasOwnProperty.call(options, 'body');
  const packageBody = hasPackageBody ? options.body : undefined;
  const lifecycleReset = fullRefresh && Number(snapshot.meta?.messageCount) === 0 &&
    !snapshot.room?.info && !snapshot.map?.local;
  if (lifecycleReset) {
    resetLiveMapperState({
      reason: state.connected
        ? 'new connection established; waiting for fresh map data'
        : 'session disconnected',
      clearGmcp: false,
      render: false
    });
  }

  state.gmcp = snapshot;
  const activeRecord = activeSessionRecord();
  if (activeRecord) {
    activeRecord.gmcp = snapshot;
    const sessionCharacter = snapshot.char?.status?.name;
    if (sessionCharacter) activeRecord.characterName = String(sessionCharacter);
  }

  if (fullRefresh || packageName === 'Char.Status') {
    syncServerScreenReaderPreference(
      packageName === 'Char.Status' && hasPackageBody
        ? packageBody
        : snapshot.char?.status
    );
  }

  if (fullRefresh || packageName === 'NukeFire.Context') {
    const contextChanged = processContextSnapshot(packageName === 'NukeFire.Context' && hasPackageBody
      ? packageBody
      : snapshot.context?.state);
    if (contextChanged || fullRefresh) renderContextDeck();
  }
  if (fullRefresh || packageName === 'NukeFire.Controls') {
    renderKeybindings();
    renderServerControlsSummary();
    renderGroupAssistEditor();
  }
  if (fullRefresh || packageName === 'NukeFire.Affects') {
    processAffectsSnapshot(packageName === 'NukeFire.Affects' && hasPackageBody
      ? packageBody
      : snapshot.affects?.state);
  }
  if (fullRefresh || packageName === 'NukeFire.Mob.Info') {
    const mobInfo = packageName === 'NukeFire.Mob.Info' && hasPackageBody
      ? packageBody
      : snapshot.mob?.info;
    if (mobInfo) {
      processMobInspectorSnapshot(mobInfo, { autoOpen: !fullRefresh });
    } else if (lifecycleReset) {
      processMobInspectorSnapshot(null, { reset: true, autoOpen: false });
    } else {
      renderMobInspector();
    }
  }
  if (fullRefresh || packageName === 'Char.TargetAffects') {
    const targetAffects = packageName === 'Char.TargetAffects' && hasPackageBody
      ? packageBody
      : snapshot.char?.targetAffects;
    if (targetAffects) processMobInspectorTargetAffects(targetAffects);
  }
  if (fullRefresh || packageName === 'NukeFire.Foundlist.Info') {
    const foundlistInfo = packageName === 'NukeFire.Foundlist.Info' && hasPackageBody
      ? packageBody
      : snapshot.foundlist?.info;
    if (foundlistInfo) processFoundlistSnapshot(foundlistInfo, { autoOpen: !fullRefresh });
    else renderFoundlist();
  }
  if (fullRefresh || packageName === 'Char.GPS' || packageName.startsWith('NukeFire.GPS.Catalog.')) {
    renderGpsNavigator();
  }

  if (packageName === 'Comm.Channel.List' || (fullRefresh && previousCommunicationChannels !== nextCommunicationChannels)) {
    renderCommunicationTabs();
    renderCommunicationMessages({ snapToLive: communicationFollowsLiveEdge() });
  }

  if (fullRefresh || gmcpPackageMatches(packageName, ['Char.Vitals', 'Char.MaxStats'])) {
    const nextVitals = currentCombatVitals();

    let vitalsChanged = false;
    for (const key of COMBAT_VITAL_SCALAR_KEYS) {
      const value = nextVitals[key];
      if (value !== null && state.vitals[key] !== value) {
        state.vitals[key] = value;
        vitalsChanged = true;
      }
    }
    if (vitalsChanged || fullRefresh) renderVitals();
    if (fullRefresh || packageName === 'Char.Vitals') {
      renderOpponentVitals();
      syncMobInspectorCombatLifecycle();
    }
  }

  if (fullRefresh || packageName === 'Char.Status' || gmcpPackageMatches(packageName, ['Group', 'Group.Remove'])) {
    if (fullRefresh || gmcpPackageMatches(packageName, ['Group', 'Group.Remove'])) invalidateGroupCombatState();
    renderGroupVitals();
    if ((fullRefresh || gmcpPackageMatches(packageName, ['Group', 'Group.Remove'])) &&
        state.mobInspector?.mode === 'compact' && state.mobInspector.receivedAtMs) {
      updateMobInspectorLiveCombat();
    }
  }

  if (fullRefresh || packageName === 'Char.Status') {
    const characterName = snapshot.char?.status?.name;
    if (characterName) setWorkspaceCharacter(characterName);
  }
  if (fullRefresh) {
    syncMobInspectorRoomLifecycle(snapshot.room?.info);
    syncFoundlistRoomLifecycle(snapshot.room?.info);
    processMapperRoom(snapshot.room?.info);
    processMapperSnapshot(snapshot.map?.local);
  } else if (packageName === 'Room.Info') {
    syncMobInspectorRoomLifecycle(hasPackageBody ? packageBody : snapshot.room?.info);
    syncFoundlistRoomLifecycle(hasPackageBody ? packageBody : snapshot.room?.info);
    scheduleDeferredMapperPacket('Room.Info', hasPackageBody ? packageBody : snapshot.room?.info);
  } else if (packageName === 'NukeFire.Map.Local') {
    scheduleDeferredMapperPacket('NukeFire.Map.Local', hasPackageBody ? packageBody : snapshot.map?.local);
  }

  if (fullRefresh || gmcpPackageMatches(packageName, [
    'Char.Status', 'Char.StatusVars', 'Room.Info', 'Group', 'Group.Remove'
  ])) {
    renderNukeFireState();
  }
}


function knowledgeController() {
  if (!state.knowledge.controller && typeof knowledgeApi.KnowledgeController === 'function') {
    state.knowledge.controller = new knowledgeApi.KnowledgeController();
  }
  return state.knowledge.controller;
}

function knowledgeResultsSnapshot() {
  return knowledgeController()?.results || { results: [], count: 0, matched: 0, query: '', domains: [] };
}

function knowledgeDomainValues() {
  return state.knowledge.activeDomain === 'all'
    ? ['help', 'item', 'command', 'skill', 'zone']
    : [state.knowledge.activeDomain];
}

function knowledgeDomainLabel() {
  const labels = { all: 'all knowledge', help: 'Help', item: 'items', command: 'commands', skill: 'skills', zone: 'zones' };
  return labels[state.knowledge.activeDomain] || 'all knowledge';
}

function renderKnowledgeDomainTabs() {
  document.querySelectorAll('[data-knowledge-domain]').forEach((button) => {
    const selected = button.dataset.knowledgeDomain === state.knowledge.activeDomain;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
}

function selectedKnowledgeResult() {
  return knowledgeResultsSnapshot().results?.[state.knowledge.selectedIndex] || null;
}

function setKnowledgeStatus(message) {
  if (knowledgeStatus) knowledgeStatus.textContent = String(message || '');
}

function renderKnowledgeResults() {
  if (!knowledgeResults) return;
  const snapshot = knowledgeResultsSnapshot();
  const items = Array.isArray(snapshot.results) ? snapshot.results : [];
  knowledgeResults.replaceChildren();
  $('#knowledge-empty').hidden = items.length > 0;
  if (knowledgeLoadMore) {
    knowledgeLoadMore.hidden = !snapshot.hasMore;
    knowledgeLoadMore.disabled = state.knowledge.loadingMore;
    knowledgeLoadMore.textContent = state.knowledge.loadingMore
      ? 'Loading more results…'
      : `Load more results (${items.length.toLocaleString()} of ${snapshot.matched.toLocaleString()})`;
  }
  if (items.length === 0) {
    $('#knowledge-empty').textContent = state.knowledge.loading
      ? `Searching live NukeFire ${knowledgeDomainLabel()}…`
      : (snapshot.query ? `No matching ${knowledgeDomainLabel()} entries.` : 'No search yet.');
    state.knowledge.selectedIndex = -1;
    return;
  }

  state.knowledge.selectedIndex = Math.max(0, Math.min(state.knowledge.selectedIndex, items.length - 1));
  items.forEach((item, index) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'knowledge-result';
    option.setAttribute('role', 'option');
    option.dataset.knowledgeIndex = String(index);
    option.setAttribute('aria-selected', String(index === state.knowledge.selectedIndex));
    option.tabIndex = index === state.knowledge.selectedIndex ? 0 : -1;

    const top = document.createElement('span');
    top.className = 'knowledge-result-top';
    const title = document.createElement('strong');
    title.textContent = item.title;
    const badge = document.createElement('span');
    badge.className = 'knowledge-result-badge';
    badge.textContent = item.type.toUpperCase();
    badge.dataset.knowledgeType = item.type;
    top.append(title, badge);

    const summary = document.createElement('span');
    summary.className = 'knowledge-result-summary';
    summary.textContent = item.summary || `Open Help entry ${item.key}.`;
    const key = document.createElement('code');
    key.textContent = item.meta || item.key;
    option.append(top, summary, key);
    option.addEventListener('click', () => {
      state.knowledge.selectedIndex = index;
      renderKnowledgeResults();
      void requestKnowledgeEntry(item);
    });
    knowledgeResults.append(option);
  });
}

function renderKnowledgeEntry() {
  if (!knowledgeEntry) return;
  const entry = knowledgeController()?.entry;
  knowledgeEntry.replaceChildren();
  const openButton = $('#knowledge-open-terminal');
  openButton.disabled = !entry?.terminalCommand;
  openButton.hidden = !entry?.terminalCommand;
  if (entry?.terminalCommand) {
    openButton.textContent = entry.terminalLabel || 'Open related NukeFire command';
  }

  if (!entry) {
    const placeholder = document.createElement('p');
    placeholder.className = 'knowledge-entry-placeholder';
    placeholder.textContent = state.knowledge.loading
      ? 'Loading the authoritative Knowledge entry…'
      : 'Choose a result to open the full entry.';
    knowledgeEntry.append(placeholder);
    return;
  }

  const header = document.createElement('header');
  const kicker = document.createElement('p');
  kicker.className = 'knowledge-entry-kicker';
  kicker.textContent = `${entry.type.toUpperCase()} · ${entry.key}`;
  const heading = document.createElement('h3');
  heading.textContent = entry.title;
  header.append(kicker, heading);
  if (entry.summary) {
    const summary = document.createElement('p');
    summary.className = 'knowledge-entry-summary';
    summary.textContent = entry.summary;
    header.append(summary);
  }
  knowledgeEntry.append(header);

  if (entry.tags?.length) {
    const tags = document.createElement('div');
    tags.className = 'knowledge-tags';
    for (const tag of entry.tags) {
      const chip = document.createElement('span');
      chip.textContent = tag;
      tags.append(chip);
    }
    knowledgeEntry.append(tags);
  }

  if (entry.fields?.length) {
    const fields = document.createElement('dl');
    fields.className = 'knowledge-fields';
    for (const field of entry.fields) {
      const wrapper = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = field.label;
      detail.textContent = field.value;
      wrapper.append(term, detail);
      fields.append(wrapper);
    }
    knowledgeEntry.append(fields);
  }

  const body = document.createElement('pre');
  body.className = 'knowledge-entry-body';
  body.textContent = entry.body || 'This entry has no additional body text.';
  knowledgeEntry.append(body);

  if (entry.aliases?.length) {
    const aliases = document.createElement('div');
    aliases.className = 'knowledge-aliases';
    const label = document.createElement('strong');
    label.textContent = 'Search aliases';
    aliases.append(label);
    for (const alias of entry.aliases.slice(0, 20)) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.textContent = alias;
      chip.addEventListener('click', () => {
        knowledgeSearch.value = alias;
        scheduleKnowledgeSearch({ immediate: true });
      });
      aliases.append(chip);
    }
    knowledgeEntry.append(aliases);
  }

  if (entry.truncated) {
    const note = document.createElement('p');
    note.className = 'knowledge-truncated';
    note.textContent = 'This unusually long entry was shortened to fit the Knowledge packet safely.';
    knowledgeEntry.append(note);
  }
}
function processKnowledgePacket(packageName, body) {
  const controller = knowledgeController();
  if (!controller) return;
  let accepted = false;
  if (packageName === 'NukeFire.Knowledge.Results') {
    accepted = controller.acceptResults(body);
    if (accepted) {
      const wasLoadingMore = state.knowledge.loadingMore;
      state.knowledge.loading = false;
      state.knowledge.loadingMore = false;
      if (!wasLoadingMore)
        state.knowledge.selectedIndex = controller.results.results.length ? 0 : -1;
      renderKnowledgeResults();
      renderKnowledgeEntry();
      const count = controller.results.results.length;
      const matched = controller.results.matched || count;
      const label = knowledgeDomainLabel();
      setKnowledgeStatus(count
        ? `Showing ${count.toLocaleString()} of ${matched.toLocaleString()} matching ${label} entr${matched === 1 ? 'y' : 'ies'} for “${controller.results.query}”.`
        : `No matching ${label} entries for “${controller.results.query}”.`);
      announce(count
        ? `${count} of ${matched} Knowledge results ready.`
        : 'No Knowledge results found.', { force: true });
    }
  } else if (packageName === 'NukeFire.Knowledge.Entry') {
    accepted = controller.acceptEntry(body);
    if (accepted) {
      state.knowledge.loading = false;
      renderKnowledgeEntry();
      setKnowledgeStatus(`Opened ${controller.entry.title}.`);
      announce(`${controller.entry.title} opened in NukeFire Knowledge.`, { force: true });
    }
  } else if (packageName === 'NukeFire.Knowledge.Error') {
    accepted = controller.acceptError(body);
    if (accepted) {
      state.knowledge.loading = false;
      state.knowledge.loadingMore = false;
      renderKnowledgeResults();
      renderKnowledgeEntry();
      setKnowledgeStatus(controller.error.message);
      announce(controller.error.message, { force: true });
    }
  }
  return accepted;
}

function moveKnowledgeSelection(delta) {
  const items = knowledgeResultsSnapshot().results || [];
  if (!items.length) return;
  state.knowledge.selectedIndex = (state.knowledge.selectedIndex + delta + items.length) % items.length;
  renderKnowledgeResults();
  knowledgeResults.querySelector(`[data-knowledge-index="${state.knowledge.selectedIndex}"]`)?.focus();
}

async function requestKnowledgeEntry(item = selectedKnowledgeResult()) {
  const controller = knowledgeController();
  if (!controller || !item) return;
  const request = controller.beginEntry(item.type, item.key);
  state.knowledge.loading = true;
  renderKnowledgeEntry();
  setKnowledgeStatus(`Loading ${item.title}…`);
  const response = await sendActiveGmcp('NukeFire.Knowledge.Get', request);
  if (response && response.sent === false) {
    state.knowledge.loading = false;
    setKnowledgeStatus('The active session is not connected to GMCP.');
  }
}

async function requestKnowledgeMore() {
  const controller = knowledgeController();
  const request = controller?.beginNextPage?.();
  if (!request) return;
  state.knowledge.loadingMore = true;
  renderKnowledgeResults();
  setKnowledgeStatus(`Loading more ${knowledgeDomainLabel()} results…`);
  const response = await sendActiveGmcp('NukeFire.Knowledge.Query', request);
  if (response && response.sent === false) {
    state.knowledge.loadingMore = false;
    renderKnowledgeResults();
    setKnowledgeStatus('The active session is not connected to GMCP.');
  }
}

async function performKnowledgeSearch() {
  const controller = knowledgeController();
  const query = String(knowledgeSearch?.value || '').trim();
  if (!controller) return;
  if (query.length < 2) {
    controller.reset();
    state.knowledge.loading = false;
    state.knowledge.selectedIndex = -1;
    renderKnowledgeResults();
    renderKnowledgeEntry();
    setKnowledgeStatus(`Enter at least two characters to search NukeFire ${knowledgeDomainLabel()}.`);
    return;
  }
  const request = controller.beginQuery(query, knowledgeDomainValues());
  state.knowledge.loading = true;
  state.knowledge.loadingMore = false;
  state.knowledge.selectedIndex = -1;
  renderKnowledgeResults();
  renderKnowledgeEntry();
  setKnowledgeStatus(`Searching NukeFire ${knowledgeDomainLabel()} for “${query}”…`);
  const response = await sendActiveGmcp('NukeFire.Knowledge.Query', request);
  if (response && response.sent === false) {
    state.knowledge.loading = false;
    renderKnowledgeResults();
    setKnowledgeStatus('Connect to NukeFire to use live Knowledge search.');
  }
}

function scheduleKnowledgeSearch(options = {}) {
  if (state.knowledge.debounceTimer) clearTimeout(state.knowledge.debounceTimer);
  state.knowledge.debounceTimer = setTimeout(() => {
    state.knowledge.debounceTimer = null;
    void performKnowledgeSearch();
  }, options.immediate ? 0 : 180);
}

function openKnowledgeConsole(options = {}) {
  if (!knowledgeOverlay || !knowledgeDialog) return;
  if (!state.knowledge.open) {
    state.knowledge.returnFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : commandInput;
  }
  state.knowledge.open = true;
  knowledgeOverlay.hidden = false;
  document.body.classList.add('knowledge-open');
  if (options.query !== undefined) knowledgeSearch.value = String(options.query || '');
  renderKnowledgeDomainTabs();
  renderKnowledgeResults();
  renderKnowledgeEntry();
  queueMicrotask(() => {
    knowledgeSearch?.focus();
    knowledgeSearch?.select();
  });
  if (knowledgeSearch?.value.trim().length >= 2) scheduleKnowledgeSearch({ immediate: true });
}

function closeKnowledgeConsole() {
  if (!state.knowledge.open) return;
  state.knowledge.open = false;
  knowledgeOverlay.hidden = true;
  document.body.classList.remove('knowledge-open');
  const target = state.knowledge.returnFocus;
  state.knowledge.returnFocus = null;
  if (target?.isConnected && typeof target.focus === 'function') target.focus();
  else focusCommand();
}

function handleKnowledgeKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeKnowledgeConsole();
    return;
  }
  if (event.key === 'Tab') {
    const focusable = [...knowledgeDialog.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex="0"]')];
    if (focusable.length) {
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  } else if (event.key === 'ArrowDown' && event.target !== knowledgeSearch) {
    event.preventDefault();
    moveKnowledgeSelection(1);
  } else if (event.key === 'ArrowUp' && event.target !== knowledgeSearch) {
    event.preventDefault();
    moveKnowledgeSelection(-1);
  } else if (event.key === 'Home' && document.activeElement !== knowledgeSearch) {
    event.preventDefault();
    state.knowledge.selectedIndex = 0;
    renderKnowledgeResults();
  } else if (event.key === 'End' && document.activeElement !== knowledgeSearch) {
    event.preventDefault();
    state.knowledge.selectedIndex = Math.max(0, knowledgeResultsSnapshot().results.length - 1);
    renderKnowledgeResults();
  } else if (event.key === 'Enter' && document.activeElement !== knowledgeSearch) {
    event.preventDefault();
    void requestKnowledgeEntry();
  }
}

function captureCommunicationTextForSession(record, text, plainText) {
  if (!record?.communications?.lineBuffer) return;
  for (const result of record.communications.lineBuffer.push(text, plainText)) {
    addCommunicationToSession(record, {
      channel: result.channel, text: result.text, ansiText: result.ansiText,
      timestamp: Date.now(), source: 'text'
    });
  }
}

function appendTextToInactiveSession(record, text, options = {}) {
  if (!record) return;
  const localDisplay = options.localDisplay === true;
  const routed = localDisplay
    ? { displayText: String(text || '') }
    : consumeSpeechMarkers(record, text);
  const raw = routed.displayText;
  if (localDisplay) sessionRuntimeApi.terminateCurrentLine?.(record);
  for (const chunk of highlightChunksForRecord(record, raw)) {
    const runtimeResult = sessionRuntimeApi.appendText?.(record, chunk, {
      stripAnsi: window.NukeFireAnsi.stripAnsi,
      useTransformedPlainText: true,
      returnDetails: true,
      transformRuns: (runs) => transformDisplayRuns(runs, record)
    });
    const sourcePlain = runtimeResult
      ? String(runtimeResult.sourcePlainText || '')
      : window.NukeFireAnsi.stripAnsi(chunk);
    if (!localDisplay) {
      const vitals = record.vitals || {};
      const beforeHp = vitals.hp;
      const beforeMaxHp = vitals.maxHp;
      const beforeMana = vitals.mana;
      const beforeMaxMana = vitals.maxMana;
      const beforeMove = vitals.move;
      const beforeMaxMove = vitals.maxMove;
      sessionRuntimeApi.parseVitals?.(record, chunk, window.NukeFireAnsi.stripAnsi, sourcePlain);
      captureCommunicationTextForSession(record, chunk, sourcePlain);
      if (vitals.hp !== beforeHp || vitals.maxHp !== beforeMaxHp ||
          vitals.mana !== beforeMana || vitals.maxMana !== beforeMaxMana ||
          vitals.move !== beforeMove || vitals.maxMove !== beforeMaxMove) {
        renderSessionVitals();
      }
    }
  }
  record.unreadOutput = Math.min(999, Number(record.unreadOutput || 0) + 1);
}

function flushInactiveHighlightText(record, options = {}) {
  const trailing = record?.highlightLines?.flush?.() || '';
  if (!trailing) return '';
  if (options.promptBoundary && promptShouldBeCaptured(record, trailing)) {
    captureDockedPrompt(record, trailing, options.promptBoundary, { active: false });
    return trailing;
  }
  const runtimeResult = sessionRuntimeApi.appendText?.(record, trailing, {
    stripAnsi: window.NukeFireAnsi.stripAnsi,
    useTransformedPlainText: true,
    returnDetails: true,
    transformRuns: transformDisplayRuns
  });
  const sourcePlain = runtimeResult
    ? String(runtimeResult.sourcePlainText || '')
    : window.NukeFireAnsi.stripAnsi(trailing);
  sessionRuntimeApi.parseVitals?.(record, trailing, window.NukeFireAnsi.stripAnsi, sourcePlain);
  captureCommunicationTextForSession(record, trailing, sourcePlain);
  renderSessionVitals();
  return trailing;
}

function appendSystemToInactiveSession(record, message, kind = 'info') {
  if (!record) return;
  sessionRuntimeApi.appendSystem?.(record, message, kind);
  record.unreadOutput = Math.min(999, Number(record.unreadOutput || 0) + 1);
}

function addCommunicationToSession(record, input = {}) {
  if (!record?.communications) return false;
  const channel = typeof communicationsApi.normalizeChannel === 'function'
    ? communicationsApi.normalizeChannel(input.channel, '')
    : String(input.channel || '').toLowerCase();
  const rawStyledText = input.ansiText ?? input.styledText ?? input.text;
  const ansiText = typeof communicationsApi.normalizeAnsiText === 'function'
    ? communicationsApi.normalizeAnsiText(rawStyledText)
    : String(rawStyledText || '').replaceAll('\r', '').trim();
  const text = typeof communicationsApi.normalizeText === 'function'
    ? communicationsApi.normalizeText(input.text ?? ansiText)
    : String(input.text ?? ansiText).replaceAll('\r', '').trim();
  if (!channel || channel === 'all' || !text) return false;
  const timestamp = Number(input.timestamp) || Date.now();
  const source = String(input.source || 'text');
  const signature = `${channel}|${String(input.sender || '').trim().toLowerCase()}|${text.toLowerCase()}`;
  const duplicate = record.communications.messages.slice(-12).reverse().find((candidate) =>
    candidate.source !== source &&
    `${candidate.channel}|${String(candidate.sender || '').trim().toLowerCase()}|${candidate.text.toLowerCase()}` === signature &&
    Math.abs(timestamp - candidate.timestamp) <= COMMUNICATION_DEDUPE_WINDOW_MS
  );
  if (duplicate) {
    if (channel === 'tell') noteLastTell(record.communications, duplicate);
    return false;
  }
  const storedMessage = {
    id: record.communications.nextId++, channel,
    sender: String(input.sender || '').trim(), text, ansiText: ansiText || text,
    timestamp, source
  };
  noteLastTell(record.communications, storedMessage);
  record.communications.messages.push(storedMessage);
  appendReaderHistoryCommunication(record, storedMessage);
  playCommunicationAudioCue(record, storedMessage);
  if (record.communications.messages.length > MAX_COMMUNICATION_MESSAGES) {
    record.communications.messages.splice(0, record.communications.messages.length - MAX_COMMUNICATION_MESSAGES);
  }
  record.communications.unread[channel] = Number(record.communications.unread[channel] || 0) + 1;
  return true;
}

function storeInactiveGmcp(record, message) {
  if (!record) return;
  const packageName = String(message?.packageName || '');
  appendReaderHistoryGmcp(record, packageName, message?.body);
  record.gmcp = gmcpSnapshotFromEvent(record.gmcp, message);
  if (packageName === 'NukeFire.Affects') {
    record.affects.snapshot = normalizeAffectsSnapshot(message.body);
    record.affects.receivedAtMs = Date.now();
  }
  if (packageName === 'NukeFire.Mob.Info') {
    record.mobInspector ||= {
      snapshot: normalizeMobInspectorSnapshot({}), receivedAtMs: 0, signature: '', roomId: '',
      mode: 'expanded', lastOpponentKey: '', combatRefreshKey: '', liveHealthSignature: '', lastTargetAffectsRequestMs: 0,
      pendingCombatKillRefresh: false, lastCombatKillRefreshMs: 0
    };
    if (typeof mobInspectorApi.isClearPacket === 'function' && mobInspectorApi.isClearPacket(message.body)) {
      if (record.mobInspector.mode === 'compact' || record.mobInspector.lastOpponentKey || !record.mobInspector.receivedAtMs) {
        record.mobInspector = {
          snapshot: normalizeMobInspectorSnapshot({}), receivedAtMs: 0, signature: '', roomId: '',
          mode: 'expanded', lastOpponentKey: '', combatRefreshKey: '', liveHealthSignature: '', lastTargetAffectsRequestMs: 0,
          pendingCombatKillRefresh: false, lastCombatKillRefreshMs: 0
        };
      }
    } else {
      const rawOpponent = record.gmcp?.char?.vitals?.opponent;
      const opponent = rawOpponent && typeof combatVitalsApi.normalizeOpponent === 'function'
        ? combatVitalsApi.normalizeOpponent(rawOpponent)
        : null;
      const normalized = normalizeMobInspectorSnapshot(message.body);
      const packetIsCurrent = normalized.context?.isCurrentTarget === true || normalized.context?.resolvedFromCurrentTarget === true;
      if (packetIsCurrent && (!opponent?.name || !mobInspectorMatchesOpponent(normalized, opponent))) {
        /* Late current-target packets must not resurrect a target in a
         * background session after Vitals has already moved on. */
        if (!opponent?.name) {
          record.mobInspector = {
            snapshot: normalizeMobInspectorSnapshot({}), receivedAtMs: 0, signature: '', roomId: '',
            mode: 'expanded', lastOpponentKey: '', combatRefreshKey: '', liveHealthSignature: '', lastTargetAffectsRequestMs: 0,
            pendingCombatKillRefresh: false, lastCombatKillRefreshMs: 0
          };
        }
      } else {
        record.mobInspector.snapshot = normalized;
        record.mobInspector.receivedAtMs = Date.now();
        record.mobInspector.signature = mobInspectorSnapshotSignature(record.mobInspector.snapshot);
        record.mobInspector.roomId = String(record.mobInspector.snapshot.context?.roomVnum || mapperRoomId(record.gmcp?.room?.info) || '');
        record.mobInspector.mode = record.mobInspector.snapshot.context?.inCombatWithPlayer || packetIsCurrent
          ? 'compact'
          : 'expanded';
        if (opponent?.name && mobInspectorMatchesOpponent(record.mobInspector.snapshot, opponent)) {
          record.mobInspector.lastOpponentKey = mobInspectorOpponentKey(opponent);
        }
      }
    }
  }
  if (packageName === 'Char.TargetAffects' && record.mobInspector?.receivedAtMs &&
      mobInspectorTargetAffectsMatches(record.mobInspector.snapshot, message.body)) {
    const affects = typeof mobInspectorApi.normalizeAffects === 'function'
      ? mobInspectorApi.normalizeAffects(message.body)
      : message.body;
    record.mobInspector.snapshot = normalizeMobInspectorSnapshot({ ...record.mobInspector.snapshot, affects });
    record.mobInspector.signature = mobInspectorSnapshotSignature(record.mobInspector.snapshot);
  }
  if (packageName === 'NukeFire.Loot.Event') {
    record.lootHistory ||= { events: [], filter: 'all', nextId: 1, visibleLimit: DEFAULT_LOOT_HISTORY_VISIBLE };
    addLootHistoryEvent(record.lootHistory, message.body);
  }
  if (packageName === 'NukeFire.Context') {
    const normalizedContext = normalizeContextSnapshot(message.body);
    const signature = contextSnapshotSignature(normalizedContext);
    if (signature !== record.contextDeck.signature) {
      record.contextDeck.snapshot = normalizedContext;
      record.contextDeck.signature = signature;
      record.contextDeck.renderDirty = true;
    }
  }
  if (packageName === 'NukeFire.Map.Local') {
    record.mapper.liveSnapshot = message.body;
    record.mapper.liveSignature = '';
    record.mapper.liveStateReady = Boolean(message.body);
  }
  const communicationPackage = String(packageName || '').toLocaleLowerCase();
  const parsedCommunication = (communicationPackage === 'comm.channel' || communicationPackage === 'nukefire.comms.message')
    ? communicationsApi.messageFromGmcp?.(message)
    : null;
  if (parsedCommunication) addCommunicationToSession(record, parsedCommunication);
  const name = record.gmcp?.char?.status?.name;
  if (name) record.characterName = String(name);
  if (packageName === 'Room.Info') {
    const currentRoomId = mapperRoomId(record.gmcp?.room?.info);
    if (record.mobInspector?.receivedAtMs && record.mobInspector.roomId && currentRoomId &&
        String(currentRoomId) !== String(record.mobInspector.roomId)) {
      record.mobInspector = {
        snapshot: normalizeMobInspectorSnapshot({}), receivedAtMs: 0, signature: '', roomId: '',
        mode: 'expanded', lastOpponentKey: '', combatRefreshKey: '', liveHealthSignature: '', lastTargetAffectsRequestMs: 0
      };
    }
    processMapperRoomForSession(record, record.gmcp?.room?.info);
  }
  if (packageName === 'Char.Vitals' &&
      (record.mobInspector?.receivedAtMs || record.mobInspector?.lastOpponentKey)) {
    const opponent = combatVitalsModelForGmcp(record.gmcp).opponent;
    const opponentKey = mobInspectorOpponentKey(opponent);
    const hasMob = Boolean(record.mobInspector?.receivedAtMs && Number(record.mobInspector?.snapshot?.mob?.vnum) > 0);
    if (!opponent?.name) {
      /* Authoritative target loss clears both a resolved compact Inspector
       * and an unresolved loading handoff in a background session. */
      if (record.mobInspector.mode === 'compact' || record.mobInspector.lastOpponentKey) {
        record.mobInspector = {
          snapshot: normalizeMobInspectorSnapshot({}), receivedAtMs: 0, signature: '', roomId: '',
          mode: 'expanded', lastOpponentKey: '', combatRefreshKey: '', liveHealthSignature: '', lastTargetAffectsRequestMs: 0,
          pendingCombatKillRefresh: false, lastCombatKillRefreshMs: 0
        };
      }
    } else if (hasMob && mobInspectorMatchesOpponent(record.mobInspector.snapshot, opponent)) {
      record.mobInspector.mode = 'compact';
      record.mobInspector.lastOpponentKey = opponentKey;
    } else {
      /* New target or same-prototype/new-instance handoff: keep only the
       * authoritative opponent identity. The active session will request a
       * fresh Mob.Info when selected if the background response has not
       * already arrived. */
      record.mobInspector = {
        snapshot: normalizeMobInspectorSnapshot({}), receivedAtMs: 0, signature: '', roomId: '',
        mode: 'compact', lastOpponentKey: opponentKey, combatRefreshKey: '', liveHealthSignature: '', lastTargetAffectsRequestMs: 0,
        pendingCombatKillRefresh: false, lastCombatKillRefreshMs: 0
      };
    }
  }
  record.protocol.gmcpMessages += 1;
  if (updateSessionVitalsFromGmcp(record)) {
    renderSessionVitals();
  }
}

function applyActionResult(payload = {}, active = true, record = null) {
  for (const delivery of payload.deliveries || []) {
    if (delivery?.queued && delivery.source !== 'speedwalk') noteOutgoingCommand(delivery.sessionId, delivery.command);
  }
  for (const message of payload.messages || []) {
    if (active) appendSystemMessage(message, 'error');
    else if (record) appendSystemToInactiveSession(record, message, 'error');
  }
}

function currentDefinitionSnapshot(sessionIdValue = state.sessions.activeId) {
  const sessionId = String(sessionIdValue || state.sessions.activeId || '');
  const record = state.sessions.records[sessionId];
  if (record && sessionId !== state.sessions.activeId) {
    return normalizeSessionTinTinState(record.tintin);
  }
  const profile = record?.tintin?.profile || { requested: '', filename: '', loaded: false };
  return normalizeSessionTinTinState({
    aliases: state.sessions.aliases,
    variables: state.sessions.variables,
    functions: state.sessions.functions,
    actions: state.sessions.actions,
    gags: state.sessions.gags,
    highlights: state.sessions.highlights,
    substitutes: state.sessions.substitutes,
    macros: state.sessions.macros,
    tabs: state.sessions.tabs,
    events: state.sessions.events,
    config: state.sessions.config,
    classes: state.sessions.classes,
    speedwalk: state.sessions.speedwalk,
    profile
  });
}

const DEFINITION_MANAGER_CATEGORIES = Object.freeze({
  aliases: { label: 'Aliases', singular: 'alias', key: 'name', value: 'body', valueLabel: 'Commands', priority: true },
  actions: { label: 'Actions', singular: 'action', key: 'pattern', value: 'command', valueLabel: 'Commands', priority: true, enabled: true },
  variables: { label: 'Variables', singular: 'variable', key: 'name', value: 'value', valueLabel: 'Value' },
  functions: { label: 'Functions', singular: 'function', key: 'name', value: 'body', valueLabel: 'Commands' },
  macros: { label: 'Macros', singular: 'macro', key: 'key', value: 'command', valueLabel: 'Commands', enabled: true },
  highlights: { label: 'Highlights', singular: 'highlight', key: 'pattern', value: '', valueLabel: '', priority: true, style: true, enabled: true },
  substitutes: { label: 'Substitutes', singular: 'substitute', key: 'pattern', value: 'replacement', valueLabel: 'Replacement', priority: true, enabled: true },
  gags: { label: 'Gags', singular: 'gag', key: 'pattern', value: '', valueLabel: '', enabled: true },
  classes: { label: 'Classes', singular: 'class', key: 'name', value: '', valueLabel: '', enabled: true }
});

function definitionManagerConfig() {
  return DEFINITION_MANAGER_CATEGORIES[state.definitionManager.category] || DEFINITION_MANAGER_CATEGORIES.aliases;
}

function definitionManagerRecords() {
  const category = state.definitionManager.category;
  if (category === 'classes') {
    const classes = state.sessions.classes && typeof state.sessions.classes === 'object'
      ? state.sessions.classes
      : { activeStack: [], definitions: [] };
    const active = new Set(classes.activeStack || []);
    return (classes.definitions || []).map((record) => ({
      ...record,
      enabled: active.has(record.name),
      savedCount: Object.values(record.saved || {}).reduce((total, records) => total + (Array.isArray(records) ? records.length : 0), 0)
    }));
  }
  const source = state.sessions[category];
  if (['aliases', 'variables', 'functions'].includes(category)) return Array.isArray(source) ? source : [];
  return Array.isArray(source?.definitions) ? source.definitions : [];
}

function definitionManagerKey(record = {}) {
  return String(record[definitionManagerConfig().key] || '');
}

function definitionManagerFilteredRecords(records = definitionManagerRecords()) {
  const query = String($('#definition-manager-search')?.value || '').trim().toLocaleLowerCase();
  if (!query) return records;
  return records.filter((record) => JSON.stringify(record).toLocaleLowerCase().includes(query));
}

function definitionManagerSummary(record = {}) {
  const config = definitionManagerConfig();
  if (state.definitionManager.category === 'classes') {
    return `${record.enabled ? 'Open' : 'Closed'}; ${Number(record.savedCount) || 0} saved definitions`;
  }
  const value = config.value ? String(record[config.value] ?? '') : config.style ? String(record.style || '') : '';
  const classText = record.className ? ` · class ${record.className}` : '';
  const enabledText = config.enabled && record.enabled === false ? ' · disabled' : '';
  return `${value.slice(0, 150)}${value.length > 150 ? '…' : ''}${classText}${enabledText}` || 'No additional value';
}

function setDefinitionManagerStatus(text) {
  const status = $('#definition-manager-status');
  if (status) status.textContent = String(text || '');
}

function renderDefinitionManagerList() {
  const list = $('#definition-manager-list');
  if (!list) return;
  const allRecords = definitionManagerRecords();
  const records = definitionManagerFilteredRecords(allRecords);
  const config = definitionManagerConfig();
  list.replaceChildren();
  records.forEach((record) => {
    const key = definitionManagerKey(record);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'definition-manager-item';
    button.setAttribute('role', 'option');
    button.setAttribute('aria-selected', String(key === state.definitionManager.selectedKey));
    button.dataset.definitionKey = key;
    const title = document.createElement('strong');
    title.textContent = key;
    const summary = document.createElement('span');
    summary.textContent = definitionManagerSummary(record);
    button.append(title, summary);
    button.addEventListener('click', () => selectDefinitionManagerRecord(key));
    list.append(button);
  });
  const total = allRecords.length;
  const filtered = records.length;
  setDefinitionManagerStatus(`${config.label}: ${filtered === total ? total : `${filtered} of ${total}`} definition${total === 1 ? '' : 's'} in the active session.`);
}

function configureDefinitionManagerForm(record = null, mode = 'edit') {
  const config = definitionManagerConfig();
  const form = $('#definition-manager-form');
  const placeholder = $('#definition-manager-placeholder');
  if (!form) return;
  state.definitionManager.mode = mode;
  form.hidden = false;
  if (placeholder) placeholder.hidden = true;
  $('#definition-manager-editor-title').textContent = `${mode === 'new' ? 'New' : mode === 'duplicate' ? 'Duplicate' : 'Edit'} ${config.singular}`;
  const key = $('#definition-manager-key');
  key.value = record ? definitionManagerKey(record) : '';
  key.disabled = mode === 'edit';
  $('#definition-manager-key-label').firstChild.textContent = `${config.key === 'pattern' ? 'Pattern' : config.key === 'key' ? 'Key' : 'Name'}\n            `;
  const valueLabel = $('#definition-manager-value-label');
  const value = $('#definition-manager-value');
  const showValue = Boolean(config.value);
  valueLabel.hidden = !showValue;
  if (showValue) {
    valueLabel.firstChild.textContent = `${config.valueLabel}\n            `;
    value.value = String(record?.[config.value] ?? '');
  }
  const priorityLabel = $('#definition-manager-priority-label');
  priorityLabel.hidden = !config.priority;
  $('#definition-manager-priority').value = String(record?.priority || 5);
  const styleLabel = $('#definition-manager-style-label');
  styleLabel.hidden = !config.style;
  $('#definition-manager-style').value = String(record?.style || '');
  const enabledLabel = $('#definition-manager-enabled-label');
  enabledLabel.hidden = !config.enabled;
  $('#definition-manager-enabled').checked = record?.enabled !== false;
  if (state.definitionManager.category === 'classes') {
    enabledLabel.lastChild.textContent = ' Open';
  } else {
    enabledLabel.lastChild.textContent = ' Enabled';
  }
  $('#definition-manager-duplicate').hidden = mode !== 'edit' || state.definitionManager.category === 'classes';
  $('#definition-manager-delete').hidden = mode !== 'edit';
  $('#definition-manager-validation').textContent = mode === 'edit'
    ? 'The identity stays fixed while editing. Use Duplicate to create a renamed copy.'
    : 'The existing TinTin engine will validate this definition before it is saved.';
  queueMicrotask(() => (mode === 'edit' ? (showValue ? value : $('#definition-manager-enabled')) : key)?.focus());
}

function selectDefinitionManagerRecord(keyValue) {
  const key = String(keyValue || '');
  const record = definitionManagerRecords().find((entry) => definitionManagerKey(entry) === key);
  if (!record) return;
  state.definitionManager.selectedKey = key;
  renderDefinitionManagerList();
  configureDefinitionManagerForm(record, 'edit');
}

function resetDefinitionManagerEditor() {
  state.definitionManager.selectedKey = '';
  state.definitionManager.mode = '';
  $('#definition-manager-form').hidden = true;
  $('#definition-manager-placeholder').hidden = false;
  renderDefinitionManagerList();
}

function openDefinitionManager(categoryValue = 'aliases') {
  const overlay = $('#definition-manager-overlay');
  if (!overlay) return;
  const category = DEFINITION_MANAGER_CATEGORIES[categoryValue] ? categoryValue : 'aliases';
  if (!state.definitionManager.open) {
    state.definitionManager.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : commandInput;
    state.definitionManager.draft = {
      value: commandInput.value,
      start: commandInput.selectionStart,
      end: commandInput.selectionEnd
    };
  }
  state.definitionManager.open = true;
  state.definitionManager.category = category;
  state.definitionManager.selectedKey = '';
  $('#definition-manager-category').value = category;
  $('#definition-manager-search').value = '';
  overlay.hidden = false;
  document.body.classList.add('definition-manager-open');
  resetDefinitionManagerEditor();
  queueMicrotask(() => $('#definition-manager-search')?.focus());
  announce(`${definitionManagerConfig().label} Definition Manager opened.`, { force: true });
}

function closeDefinitionManager() {
  if (!state.definitionManager.open) return;
  state.definitionManager.open = false;
  $('#definition-manager-overlay').hidden = true;
  document.body.classList.remove('definition-manager-open');
  const draft = state.definitionManager.draft;
  if (draft && commandInput) {
    commandInput.value = draft.value;
    commandInput.setSelectionRange(draft.start ?? draft.value.length, draft.end ?? draft.value.length);
  }
  const target = state.definitionManager.returnFocus;
  state.definitionManager.returnFocus = null;
  state.definitionManager.draft = null;
  if (target?.isConnected && typeof target.focus === 'function') target.focus();
  else commandInput?.focus();
}

function definitionManagerCommand(record, operation = 'save') {
  const category = state.definitionManager.category;
  const prefix = normalizeClientCommandPrefix(state.sessions.commandPrefix);
  const key = braceTinTinCursorValue(record.key);
  const value = braceTinTinCursorValue(record.value);
  if (operation === 'delete') {
    const directives = { aliases: 'unalias', actions: 'unaction', variables: 'unvariable', functions: 'unfunction', macros: 'unmacro', highlights: 'unhighlight', substitutes: 'unsubstitute', gags: 'ungag' };
    if (category === 'classes') return `${prefix}class ${key} kill`;
    return `${prefix}${directives[category]} ${key}`;
  }
  if (category === 'aliases') return `${prefix}alias ${key} ${value} {${record.priority}}`;
  if (category === 'actions') return `${prefix}action ${key} ${value} {${record.priority}}`;
  if (category === 'variables') return `${prefix}variable ${key} ${value}`;
  if (category === 'functions') return `${prefix}function ${key} ${value}`;
  if (category === 'macros') return `${prefix}macro ${key} ${value}`;
  if (category === 'highlights') return `${prefix}highlight ${key} ${braceTinTinCursorValue(record.style)} {${record.priority}}`;
  if (category === 'substitutes') return `${prefix}substitute ${key} ${value} {${record.priority}}`;
  if (category === 'gags') return `${prefix}gag ${key}`;
  if (category === 'classes') return `${prefix}class ${key} ${record.enabled ? 'open' : 'close'}`;
  return '';
}

async function runDefinitionManagerCommand(command) {
  if (!command) return;
  const draft = state.definitionManager.draft;
  await sendCommand(command, { preserveInput: true, recordHistory: false });
  if (draft) {
    commandInput.value = draft.value;
    commandInput.setSelectionRange(draft.start ?? draft.value.length, draft.end ?? draft.value.length);
  }
  renderDefinitionManagerList();
}

async function saveDefinitionManagerRecord(event) {
  event?.preventDefault();
  const config = definitionManagerConfig();
  const record = {
    key: String($('#definition-manager-key')?.value || '').trim(),
    value: String($('#definition-manager-value')?.value || ''),
    style: String($('#definition-manager-style')?.value || ''),
    priority: Math.max(1, Math.min(9, Number($('#definition-manager-priority')?.value) || 5)),
    enabled: $('#definition-manager-enabled')?.checked !== false
  };
  const validation = $('#definition-manager-validation');
  if (!record.key || (config.value && !record.value.trim()) || (config.style && !record.style.trim())) {
    validation.textContent = 'Complete every required field before saving.';
    return;
  }
  const beforeKey = state.definitionManager.selectedKey;
  await runDefinitionManagerCommand(definitionManagerCommand(record));
  if (config.enabled && state.definitionManager.category !== 'classes' && !record.enabled) {
    const prefix = normalizeClientCommandPrefix(state.sessions.commandPrefix);
    await runDefinitionManagerCommand(`${prefix}${config.singular} disable ${braceTinTinCursorValue(record.key)}`);
  }
  const saved = definitionManagerRecords().find((entry) => definitionManagerKey(entry) === record.key);
  if (!saved) {
    validation.textContent = 'The TinTin engine rejected this definition. Review the terminal message and correct the fields.';
    state.definitionManager.selectedKey = beforeKey;
    return;
  }
  state.definitionManager.selectedKey = record.key;
  renderDefinitionManagerList();
  configureDefinitionManagerForm(saved, 'edit');
  schedulePersistentSettingsSave();
  announce(`${config.singular} ${record.key} saved.`, { force: true });
}

async function deleteDefinitionManagerRecord() {
  const key = state.definitionManager.selectedKey;
  if (!key) return;
  const config = definitionManagerConfig();
  if (!window.confirm(`Delete ${config.singular} “${key}”? This cannot be undone from the manager.`)) return;
  await runDefinitionManagerCommand(definitionManagerCommand({ key }, 'delete'));
  resetDefinitionManagerEditor();
  schedulePersistentSettingsSave();
  announce(`${config.singular} ${key} deleted.`, { force: true });
}

function handleDefinitionManagerKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeDefinitionManager();
    return;
  }
  if (event.key !== 'Tab') return;
  const dialog = $('#definition-manager-dialog');
  const focusable = [...dialog.querySelectorAll('button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), textarea:not([disabled]):not([hidden]), select:not([disabled]):not([hidden])')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

function appendTinTinReadLines(sessionIdValue, linesValue, tone = 'info') {
  const sessionId = String(sessionIdValue || '');
  const lines = Array.isArray(linesValue) ? linesValue.map((line) => String(line || '')).filter(Boolean) : [];
  if (!lines.length) return;
  const text = `${lines.join('\n')}\n`;
  if (sessionId === state.sessions.activeId) {
    appendLocalText(text);
    // Disk-backed TinTin operations are explicit player commands. Flush their
    // complete report before returning the viewport to the live edge so the
    // final load totals remain visible above a docked prompt. Keep this local
    // to TinTin feedback; ordinary output, dock resizing, and manual scrollback
    // retain their established follow behavior.
    flushTerminalOutput();
    snapOutputToBottom();
    if (tone === 'error') announce(lines.at(-1), { force: true });
    return;
  }
  const record = state.sessions.records[sessionId];
  if (record) appendTextToInactiveSession(record, text, { localDisplay: true });
}

async function prepareNamedSessionRouteUpdates(prepared, sourceSessionId) {
  const routes = Array.isArray(prepared?.routedCommands) ? prepared.routedCommands : [];
  if (!routes.length) return { ok: true, updates: [], skipped: [], appliedCommands: 0 };
  if (typeof window.nukefire.listSessions !== 'function') {
    return { ok: false, errors: ['Session list is unavailable for named-session TinTin definitions.'], updates: [], skipped: [], appliedCommands: 0 };
  }
  if (typeof tintinSessionRoutesApi.prepareRoutedDefinitionPlan !== 'function') {
    return { ok: false, errors: ['Named-session TinTin definition planner is unavailable.'], updates: [], skipped: [], appliedCommands: 0 };
  }
  const latest = await window.nukefire.listSessions();
  const sessions = Array.isArray(latest?.snapshot?.sessions) ? latest.snapshot.sessions : [];
  return tintinSessionRoutesApi.prepareRoutedDefinitionPlan({
    loader: tintinScriptLoaderApi,
    routes,
    sessions,
    sourceSessionId,
    filename: prepared?.filename || 'script'
  });
}

async function restoreTinTinDefinitionUpdates(backups = []) {
  let latestSnapshot = null;
  for (const entry of [...backups].reverse()) {
    try {
      const restored = await window.nukefire.replaceSessionDefinitions?.(entry.sessionId, entry.definitions);
      if (restored?.snapshot) latestSnapshot = restored.snapshot;
    } catch (_error) {
      // Continue restoring the remaining sessions. The caller reports the
      // original transaction failure; persistence was never accepted.
    }
  }
  if (latestSnapshot) applySessionsSnapshot(latestSnapshot, { followActive: false });
}

async function handleTinTinAuditRequest(record, payload = {}) {
  const sessionId = String(record?.id || state.sessions.activeId || '');
  const requested = String(payload?.requested || '').trim();
  if (typeof window.nukefire.readTinTinScript !== 'function') {
    appendTinTinReadLines(sessionId, ['#ERROR: TinTin script storage is unavailable for compatibility audit.'], 'error');
    return;
  }
  if (typeof tintinCompatibilityAuditApi.auditTinTinTree !== 'function') {
    appendTinTinReadLines(sessionId, ['#ERROR: TinTin compatibility audit engine is unavailable.'], 'error');
    return;
  }

  let response;
  try {
    response = await window.nukefire.readTinTinScript(requested);
  } catch (error) {
    appendTinTinReadLines(sessionId, [`#ERROR: ${error?.message || error}`], 'error');
    return;
  }

  if (response?.mode === 'info' && response?.ok) {
    const directory = String(response.info?.directory || 'Documents/NukeFire Client/Scripts');
    const files = Array.isArray(response.files) ? response.files : [];
    appendTinTinReadLines(sessionId, [
      `#OK: TINTIN SCRIPTS FOLDER: ${directory}`,
      `#OK: USE ${state.sessions.commandPrefix}audit {Prime}, ${state.sessions.commandPrefix}audit {prime.tin}, OR ${state.sessions.commandPrefix}audit {prime.txt}.`,
      '#INFO: AUDIT IS READ-ONLY: NO SCRIPT COMMANDS, LOGIN SEQUENCES, ACTIONS, OR FILE WRITES ARE EXECUTED.',
      files.length ? `#OK: AVAILABLE: ${files.join(', ')}` : '#OK: NO SCRIPT FILES FOUND YET.'
    ]);
    return;
  }
  if (!response?.ok) {
    appendTinTinReadLines(sessionId, [`#ERROR: ${response?.error || 'TinTin script could not be read for audit.'}`], 'error');
    return;
  }

  let sessionNames = [];
  if (typeof window.nukefire.listSessions === 'function') {
    try {
      const latest = await window.nukefire.listSessions();
      sessionNames = (latest?.snapshot?.sessions || []).map((entry) => String(entry?.name || '')).filter(Boolean);
    } catch (_error) {
      sessionNames = Object.values(state.sessions.records || {}).map((entry) => String(entry?.name || '')).filter(Boolean);
    }
  }

  let result;
  try {
    result = await tintinCompatibilityAuditApi.auditTinTinTree(response.content || '', {
      filename: String(response.filename || requested || 'script.tin'),
      commandPrefix: state.sessions.commandPrefix,
      maxDepth: 8,
      maxFiles: 32,
      sessionNames,
      readFile: async (nestedRequested) => window.nukefire.readTinTinScript(nestedRequested)
    });
  } catch (error) {
    appendTinTinReadLines(sessionId, [`#ERROR: TinTin compatibility audit failed safely: ${error?.message || error}`], 'error');
    return;
  }

  const lines = typeof tintinCompatibilityAuditApi.formatTinTinCompatibilityAudit === 'function'
    ? tintinCompatibilityAuditApi.formatTinTinCompatibilityAudit(result, {
      commandPrefix: state.sessions.commandPrefix,
      maxFindings: 60
    })
    : ['#ERROR: TinTin compatibility audit report formatter is unavailable.'];
  appendTinTinReadLines(sessionId, lines, result?.ok === false ? 'error' : 'info');
}

async function handleTinTinReadRequest(record, payload = {}, options = {}) {
  const sessionId = String(record?.id || state.sessions.activeId || '');
  const requested = String(payload?.requested || '').trim();
  const privateProfileLoad = options.privateProfileLoad === true;
  const connectAfter = payload?.connectAfter && typeof payload.connectAfter === 'object'
    ? { host: String(payload.connectAfter.host || '').trim(), port: Number(payload.connectAfter.port) }
    : null;
  let previous = null;
  try {
  if (privateProfileLoad) {
    if (typeof window.nukefire.replaceSessionDefinitions !== 'function') {
      appendTinTinReadLines(sessionId, ['#ERROR: Live definition replacement is unavailable.'], 'error');
      return;
    }
    const cleanProfile = startupBaseTinTinState();
    cleanProfile.profile = {
      requested,
      filename: '',
      loaded: false
    };
    try {
      const cleared = await window.nukefire.replaceSessionDefinitions(sessionId, cleanProfile);
      if (!cleared?.snapshot) throw new Error('The live client did not confirm the private profile reset.');
      applySessionsSnapshot(cleared.snapshot, { followActive: false });
      previous = normalizeSessionTinTinState(cleanProfile);
    } catch (error) {
      appendTinTinReadLines(sessionId, [`#ERROR: Unable to prepare private profile ${requested || record?.name || sessionId}: ${error?.message || error}`], 'error');
      return;
    }
  }
  if (typeof window.nukefire.readTinTinScript !== 'function') {
    appendTinTinReadLines(sessionId, ['#ERROR: TinTin script storage is unavailable.'], 'error');
    return;
  }
  if (typeof tintinScriptLoaderApi.prepareTinTinRead !== 'function') {
    appendTinTinReadLines(sessionId, ['#ERROR: TinTin script parser is unavailable.'], 'error');
    return;
  }

  let response;
  try {
    response = await window.nukefire.readTinTinScript(requested);
  } catch (error) {
    appendTinTinReadLines(sessionId, [`#ERROR: ${error?.message || error}`], 'error');
    return;
  }

  if (response?.mode === 'info' && response?.ok) {
    const directory = String(response.info?.directory || 'Documents/NukeFire Client/Scripts');
    const files = Array.isArray(response.files) ? response.files : [];
    appendTinTinReadLines(sessionId, [
      `#OK: TINTIN SCRIPTS FOLDER: ${directory}`,
      `#OK: USE ${state.sessions.commandPrefix}read {Prime}, ${state.sessions.commandPrefix}read {prime.tin}, OR ${state.sessions.commandPrefix}read {prime.txt}.`,
      files.length ? `#OK: AVAILABLE: ${files.join(', ')}` : '#OK: NO SCRIPT FILES FOUND YET.'
    ]);
    return;
  }

  if (!response?.ok) {
    const lines = [`#ERROR: ${response?.error || 'TinTin script could not be read.'}`];
    if (response?.info?.directory) lines.push(`#INFO: SCRIPTS FOLDER: ${response.info.directory}`);
    appendTinTinReadLines(sessionId, lines, 'error');
    return;
  }

  if (!privateProfileLoad) {
    previous = normalizeSessionTinTinState(record?.tintin || currentDefinitionSnapshot(sessionId));
    if (typeof window.nukefire.listSessions === 'function') {
      try {
        const latest = await window.nukefire.listSessions();
        const authoritative = latest?.snapshot?.sessions?.find(
          (entry) => String(entry?.id || '') === sessionId
        );
        if (authoritative?.tintin && typeof authoritative.tintin === 'object') {
          previous = normalizeSessionTinTinState(authoritative.tintin);
          applyTinTinStateToRecord(record, previous);
          if (sessionId === state.sessions.activeId) applyActiveTinTinState(record);
        }
      } catch (_error) {
        // The renderer's private record remains a safe fallback. A manual read
        // must not become unavailable merely because a snapshot request failed.
      }
    }
  }
  const prepared = await prepareTinTinScriptLoad(response, previous, {
    filename: response.filename
  });
  if (!prepared?.ok) {
    appendTinTinReadLines(
      sessionId,
      typeof tintinScriptLoaderApi.formatTinTinReadReport === 'function'
        ? tintinScriptLoaderApi.formatTinTinReadReport(prepared, response.filename)
        : (prepared?.errors || ['TinTin script could not be parsed.']).map((message) => `#ERROR: ${message}`),
      'error'
    );
    return;
  }

  let routePlan = { ok: true, updates: [], skipped: [], appliedCommands: 0 };
  try {
    routePlan = await prepareNamedSessionRouteUpdates(prepared, sessionId);
  } catch (error) {
    routePlan = { ok: false, errors: [error?.message || String(error)], updates: [], skipped: [], appliedCommands: 0 };
  }
  if (!routePlan?.ok) {
    appendTinTinReadLines(sessionId, [
      '#ERROR: Named-session TinTin definitions were rejected before anything was changed.',
      ...(routePlan?.errors || []).map((message) => `#ERROR: ${message}`)
    ], 'error');
    return;
  }

  try {
    if (typeof window.nukefire.replaceSessionDefinitions !== 'function') {
      throw new Error('Live definition replacement is unavailable.');
    }
    const loadedProfile = {
      requested: requested || String(response.filename || '').replace(/\.(?:tin|txt)$/iu, ''),
      filename: String(response.filename || ''),
      loaded: true
    };
    const definitions = {
      ...prepared.definitions,
      profile: privateProfileLoad || !previous?.profile?.loaded
        ? loadedProfile
        : normalizeSessionTinTinState(previous).profile
    };
    const backups = [{ sessionId, definitions: previous }];
    for (const update of routePlan.updates || []) {
      backups.push({ sessionId: update.sessionId, definitions: update.before });
    }

    let latestSnapshot = null;
    let transactionStage = 'definitions';
    try {
      const applied = await window.nukefire.replaceSessionDefinitions(sessionId, definitions);
      if (!applied?.snapshot) throw new Error('The live client did not confirm the definition update.');
      latestSnapshot = applied.snapshot;

      for (const update of routePlan.updates || []) {
        const routedApplied = await window.nukefire.replaceSessionDefinitions(update.sessionId, update.after);
        if (!routedApplied?.snapshot) {
          throw new Error(`The live client did not confirm routed definitions for ${update.name || update.sessionId}.`);
        }
        latestSnapshot = routedApplied.snapshot;
      }
      if (latestSnapshot) applySessionsSnapshot(latestSnapshot, { followActive: false });

      if (!state.settingsReady || typeof window.nukefire.saveSettings !== 'function') {
        transactionStage = 'settings-not-ready';
        throw new Error('Persistent settings are not ready.');
      }
      transactionStage = 'settings-save';
      await window.nukefire.saveSettings(collectPersistentSettings());

      for (const runtime of prepared.runtimeCommands || []) {
        const command = String(runtime?.command || '').trim();
        if (!command || typeof window.nukefire.routeCommand !== 'function') continue;
        try {
          const runtimeResult = await window.nukefire.routeCommand(sessionId, command);
          for (const message of runtimeResult?.messages || []) {
            appendTinTinReadLines(sessionId, [`#INFO: ${message}`]);
          }
        } catch (runtimeError) {
          appendTinTinReadLines(sessionId, [`#WARN: Runtime compatibility command was not applied: ${runtimeError?.message || runtimeError}`], 'error');
        }
      }
    } catch (transactionError) {
      await restoreTinTinDefinitionUpdates(backups);
      if (transactionStage === 'settings-not-ready') {
        throw new Error('Definitions were restored because persistent settings are not ready.');
      }
      if (transactionStage === 'settings-save') {
        throw new Error(`Definitions were restored because settings could not be saved: ${transactionError?.message || transactionError}`);
      }
      throw new Error(`Definitions were restored because the multi-session read could not be committed: ${transactionError?.message || transactionError}`);
    }

    const report = typeof tintinScriptLoaderApi.formatTinTinReadReport === 'function'
      ? tintinScriptLoaderApi.formatTinTinReadReport(prepared, response.filename)
      : [`#OK: READ ${response.filename}.`];
    report.unshift(privateProfileLoad
      ? `#OK: PRIVATE PROFILE ${response.filename} LOADED INTO ${record?.name || sessionId} ONLY.`
      : `#OK: MERGED ${response.filename} INTO ${record?.name || sessionId} ONLY.`);
    if (routePlan.appliedCommands > 0) {
      report.push(`#OK: ${routePlan.appliedCommands} NAMED-SESSION DEFINITION COMMAND${routePlan.appliedCommands === 1 ? '' : 'S'} APPLIED TO ${(routePlan.updates || []).length} PRIVATE SESSION${(routePlan.updates || []).length === 1 ? '' : 'S'}.`);
    }
    for (const skipped of routePlan.skipped || []) {
      report.push(`#WARN: ROUTED ${String(skipped.directive || 'COMMAND').toUpperCase()} FOR ${skipped.target || 'UNKNOWN'} SKIPPED: ${skipped.reason || 'not available'}`);
    }
    appendTinTinReadLines(sessionId, report);
  } catch (error) {
    appendTinTinReadLines(sessionId, [`#ERROR: ${error?.message || error}`], 'error');
  }
  } finally {
    if (connectAfter && connectAfter.host && Number.isInteger(connectAfter.port) && connectAfter.port >= 1 && connectAfter.port <= 65535) {
      try {
        await window.nukefire.connectSession?.(sessionId, connectAfter);
      } catch (error) {
        appendTinTinReadLines(sessionId, [`#ERROR: Unable to connect ${record?.name || sessionId}: ${error?.message || error}`], 'error');
      }
    }
  }
}


async function handleTinTinWriteRequest(record, payload = {}) {
  const sessionId = String(record?.id || state.sessions.activeId || '');
  let requested = String(payload?.requested || '').trim();
  if (!requested && record?.tintin?.profile?.loaded) {
    requested = String(record.tintin.profile.filename || record.tintin.profile.requested || '').trim();
  }
  if (!requested) {
    if (typeof window.nukefire.getTinTinScriptsInfo !== 'function') {
      appendTinTinReadLines(sessionId, ['#ERROR: TinTin script storage is unavailable.'], 'error');
      return;
    }
    try {
      const response = await window.nukefire.getTinTinScriptsInfo();
      const directory = String(response?.info?.directory || 'Documents/NukeFire Client/Scripts');
      const files = Array.isArray(response?.files) ? response.files : [];
      appendTinTinReadLines(sessionId, [
        `#OK: TINTIN SCRIPTS FOLDER: ${directory}`,
        `#OK: USE ${state.sessions.commandPrefix}write {Prime}, ${state.sessions.commandPrefix}write {prime.tin}, OR ${state.sessions.commandPrefix}write {prime.txt}.`,
        files.length ? `#OK: AVAILABLE: ${files.join(', ')}` : '#OK: NO SCRIPT FILES FOUND YET.'
      ]);
    } catch (error) {
      appendTinTinReadLines(sessionId, [`#ERROR: ${error?.message || error}`], 'error');
    }
    return;
  }

  if (typeof window.nukefire.writeTinTinScript !== 'function') {
    appendTinTinReadLines(sessionId, ['#ERROR: TinTin script writing is unavailable.'], 'error');
    return;
  }
  if (typeof tintinScriptWriterApi.prepareTinTinWrite !== 'function') {
    appendTinTinReadLines(sessionId, ['#ERROR: TinTin script writer is unavailable.'], 'error');
    return;
  }

  const prepared = tintinScriptWriterApi.prepareTinTinWrite(
    normalizeSessionTinTinState(record?.tintin || currentDefinitionSnapshot(sessionId)), {
      commandPrefix: state.sessions.commandPrefix
    }
  );
  if (!prepared?.ok) {
    appendTinTinReadLines(
      sessionId,
      typeof tintinScriptWriterApi.formatTinTinWriteReport === 'function'
        ? tintinScriptWriterApi.formatTinTinWriteReport(prepared, requested)
        : (prepared?.errors || ['TinTin script could not be prepared.']).map((message) => `#ERROR: ${message}`),
      'error'
    );
    return;
  }

  let response;
  try {
    response = await window.nukefire.writeTinTinScript(requested, prepared.content);
  } catch (error) {
    appendTinTinReadLines(sessionId, [`#ERROR: ${error?.message || error}`], 'error');
    return;
  }
  if (!response?.ok) {
    const lines = [`#ERROR: ${response?.error || 'TinTin script could not be written.'}`];
    if (response?.info?.directory) lines.push(`#INFO: SCRIPTS FOLDER: ${response.info.directory}`);
    appendTinTinReadLines(sessionId, lines, 'error');
    return;
  }

  const report = typeof tintinScriptWriterApi.formatTinTinWriteReport === 'function'
    ? tintinScriptWriterApi.formatTinTinWriteReport({ ...prepared, filename: response.filename }, response.filename)
    : [`#OK: WROTE ${response.filename}.`];
  if (response.replaced) report.push('#OK: EXISTING SCRIPT FILE REPLACED ATOMICALLY.');
  appendTinTinReadLines(sessionId, report);
}

async function handleTinTinClassWriteRequest(record, payload = {}) {
  const sessionId = String(record?.id || state.sessions.activeId || '');
  const className = String(payload?.className || '').normalize('NFKC').trim().toLowerCase();
  const requested = String(payload?.requested || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/u.test(className) || !requested) {
    appendTinTinReadLines(sessionId, ['#ERROR: Class WRITE needs a valid class and script filename.'], 'error');
    return;
  }
  if (typeof window.nukefire.writeTinTinScript !== 'function'
      || typeof tintinScriptWriterApi.prepareTinTinClassWrite !== 'function') {
    appendTinTinReadLines(sessionId, ['#ERROR: TinTin Class WRITE is unavailable in this build.'], 'error');
    return;
  }
  const prepared = tintinScriptWriterApi.prepareTinTinClassWrite(
    normalizeSessionTinTinState(record?.tintin || currentDefinitionSnapshot(sessionId)),
    className,
    { commandPrefix: state.sessions.commandPrefix }
  );
  if (!prepared?.ok) {
    appendTinTinReadLines(sessionId, (prepared?.errors || ['Class could not be prepared.']).map((message) => `#ERROR: ${message}`), 'error');
    return;
  }
  try {
    const response = await window.nukefire.writeTinTinScript(requested, prepared.content);
    if (!response?.ok) throw new Error(response?.error || 'Class script could not be written.');
    const count = Number(prepared.totalWritten || 0);
    appendTinTinReadLines(sessionId, [
      `#OK: CLASS ${className} WRITTEN TO ${response.filename}.`,
      `#OK: ${count} LIVE CLASS DEFINITION${count === 1 ? '' : 'S'} WRITTEN.`,
      ...(String(payload?.legacyRequested || '').trim() && String(payload.legacyRequested).trim() !== response.filename
        ? [`#INFO: LEGACY PATH ${String(payload.legacyRequested).trim()} WAS REDIRECTED TO THE PROTECTED NUKEFIRE SCRIPTS FOLDER.`]
        : [])
    ]);
  } catch (error) {
    appendTinTinReadLines(sessionId, [`#ERROR: Class ${className} was not written: ${error?.message || error}`], 'error');
  }
}

async function handleTinTinClassReadRequest(record, payload = {}) {
  const sessionId = String(record?.id || state.sessions.activeId || '');
  const className = String(payload?.className || '').normalize('NFKC').trim().toLowerCase();
  const requested = String(payload?.requested || '').trim();
  if (!/^[a-z0-9][a-z0-9_-]{0,47}$/u.test(className) || !requested) {
    appendTinTinReadLines(sessionId, ['#ERROR: Class READ needs a valid class and script filename.'], 'error');
    return;
  }
  if (typeof window.nukefire.readTinTinScript !== 'function'
      || typeof window.nukefire.replaceSessionDefinitions !== 'function') {
    appendTinTinReadLines(sessionId, ['#ERROR: TinTin Class READ is unavailable in this build.'], 'error');
    return;
  }
  let response;
  try {
    response = await window.nukefire.readTinTinScript(requested);
  } catch (error) {
    appendTinTinReadLines(sessionId, [`#ERROR: ${error?.message || error}`], 'error');
    return;
  }
  if (!response?.ok || response.mode === 'info') {
    appendTinTinReadLines(sessionId, [`#ERROR: ${response?.error || `Class script ${requested} was not found.`}`], 'error');
    return;
  }
  const previous = normalizeSessionTinTinState(record?.tintin || currentDefinitionSnapshot(sessionId));
  const prepared = await prepareTinTinScriptLoad(response, previous, {
    filename: response.filename,
    activeClass: className
  });
  if (!prepared?.ok) {
    appendTinTinReadLines(sessionId, (prepared?.errors || ['Class script could not be parsed.']).map((message) => `#ERROR: ${message}`), 'error');
    return;
  }
  try {
    // TinTin CLASS READ temporarily opens the requested class while the file
    // executes and then closes it. The command therefore leaves no class
    // active, even when another class was active before the READ.
    if (prepared.definitions?.classes) prepared.definitions.classes.activeStack = [];
    const applied = await window.nukefire.replaceSessionDefinitions(sessionId, prepared.definitions);
    if (!applied?.snapshot) throw new Error('The live client did not confirm the Class READ update.');
    applySessionsSnapshot(applied.snapshot, { followActive: false });
    if (state.settingsReady && typeof window.nukefire.saveSettings === 'function') {
      await window.nukefire.saveSettings(collectPersistentSettings());
    }

    if (prepared.runtimeCommands?.length && typeof window.nukefire.routeCommand === 'function') {
      await window.nukefire.routeCommand(sessionId, `${state.sessions.commandPrefix}class {${className}} {open}`);
      try {
        for (const runtime of prepared.runtimeCommands) {
          const command = String(runtime?.command || '').trim();
          if (!command) continue;
          const result = await window.nukefire.routeCommand(sessionId, command);
          if (result?.snapshot) applySessionsSnapshot(result.snapshot, { followActive: false });
        }
      } finally {
        const closed = await window.nukefire.routeCommand(sessionId, `${state.sessions.commandPrefix}class {${className}} {close}`);
        if (closed?.snapshot) applySessionsSnapshot(closed.snapshot, { followActive: false });
      }
      if (state.settingsReady && typeof window.nukefire.saveSettings === 'function') {
        await window.nukefire.saveSettings(collectPersistentSettings());
      }
    }

    const count = Number(prepared.totalLoaded || 0);
    appendTinTinReadLines(sessionId, [
      `#OK: CLASS ${className} READ FROM ${response.filename}.`,
      `#OK: ${count} SUPPORTED DEFINITION${count === 1 ? '' : 'S'} LOADED THROUGH CLASS ${className}.`,
      ...(prepared.unsupported?.length ? [`#WARN: ${prepared.unsupported.length} UNSUPPORTED COMMAND${prepared.unsupported.length === 1 ? '' : 'S'} SKIPPED.`] : [])
    ]);
  } catch (error) {
    try {
      const restored = await window.nukefire.replaceSessionDefinitions(sessionId, previous);
      if (restored?.snapshot) applySessionsSnapshot(restored.snapshot, { followActive: false });
    } catch (_restoreError) {
      // Surface the original failure; the normal read path has the same
      // authoritative replacement boundary and this is a best-effort rollback.
    }
    appendTinTinReadLines(sessionId, [`#ERROR: Class ${className} READ was rolled back: ${error?.message || error}`], 'error');
  }
}

async function handleTinTinEditRequest(record, payload = {}) {
  const sessionId = String(record?.id || state.sessions.activeId || '');
  let requested = String(payload?.requested || '').trim();
  if (!requested && record?.tintin?.profile?.loaded) {
    requested = String(record.tintin.profile.filename || record.tintin.profile.requested || '').trim();
  }
  if (typeof window.nukefire.editTinTinScript !== 'function') {
    appendTinTinReadLines(sessionId, ['#ERROR: TinTin script editing is unavailable.'], 'error');
    return;
  }
  let response;
  try {
    response = await window.nukefire.editTinTinScript(requested);
  } catch (error) {
    appendTinTinReadLines(sessionId, [`#ERROR: ${error?.message || error}`], 'error');
    return;
  }
  if (response?.canceled) {
    appendTinTinReadLines(sessionId, ['#INFO: TINTIN SCRIPT SELECTION CANCELED.']);
    return;
  }
  if (!response?.ok) {
    const lines = [`#ERROR: ${response?.error || 'TinTin script could not be opened.'}`];
    if (response?.info?.directory) lines.push(`#INFO: SCRIPTS FOLDER: ${response.info.directory}`);
    appendTinTinReadLines(sessionId, lines, 'error');
    return;
  }
  appendTinTinReadLines(sessionId, [
    `#OK: OPENED ${response.filename} IN THE SYSTEM TEXT EDITOR.`,
    `#INFO: SAVE THE FILE, THEN USE ${normalizeClientCommandPrefix(state.sessions.commandPrefix)}reload TO REPLACE THE ACTIVE PRIVATE PROFILE CLEANLY.`
  ]);
}

async function handleShowTinTinScriptsFolder() {
  const record = activeSessionRecord();
  const sessionId = String(record?.id || state.sessions.activeId || '');
  if (typeof window.nukefire.showTinTinScriptsFolder !== 'function') {
    appendTinTinReadLines(sessionId, ['#ERROR: The TinTin Scripts folder is unavailable.'], 'error');
    return;
  }
  let response;
  try {
    response = await window.nukefire.showTinTinScriptsFolder();
  } catch (error) {
    appendTinTinReadLines(sessionId, [`#ERROR: ${error?.message || error}`], 'error');
    return;
  }
  if (!response?.ok) {
    appendTinTinReadLines(sessionId, [`#ERROR: ${response?.error || 'The TinTin Scripts folder could not be opened.'}`], 'error');
    return;
  }
  appendTinTinReadLines(sessionId, [
    '#OK: OPENED TINTIN SCRIPTS FOLDER.',
    `#INFO: ${response.info?.directory || 'Documents/NukeFire Client/Scripts'}`
  ]);
}

function handleSessionEvent(event = {}) {
  const sessionId = String(event.sessionId || '');
  const record = ensureSessionRecord({ id: sessionId });
  if (!record) return;
  const previousTabSignature = sessionTabSignature(record);
  const active = sessionId === state.sessions.activeId;
  const payload = event.payload;

  if (active) {
    switch (event.type) {
      case 'text': appendMudText(payload); break;
      case 'local-text': appendLocalText(payload); break;
      case 'communication-text': captureCommunicationText(payload); break;
      case 'speedwalk-step': noteOutgoingCommand(sessionId, payload?.command); break;
      case 'status':
        if (payload?.state !== 'connected') {
          flushActiveHighlightText();
          clearDockedPrompt(record);
        }
        setStatus(payload);
        renderDockedPrompt(record);
        renderSessionVitals(record);
        break;
      case 'echo': setRemoteEcho(payload); break;
      case 'gmcp': applyGmcp(payload); break;
      case 'gmcp-state': applyGmcpState(payload); break;
      case 'boundary': applyPromptBoundary(payload); break;
      case 'protocol-warning': applyProtocolWarning(payload); break;
      case 'compression-state': applyCompressionState(payload, record); break;
      case 'charset': applyCharset(payload); break;
      case 'terminal-type': applyTerminalType(payload); break;
      case 'window-size': applyWindowSize(payload); break;
      case 'new-environ': applyNewEnvironment(payload); break;
      case 'action-result': applyActionResult(payload, true, record); break;
      case 'pipeline-debug': handlePipelineDebugEvent(record, payload); break;
      case 'script-audit-request': void handleTinTinAuditRequest(record, payload); break;
      case 'script-read-request': void handleTinTinReadRequest(record, payload); break;
      case 'session-profile-load-request': void handleTinTinReadRequest(record, payload, { privateProfileLoad: true }); break;
      case 'script-write-request': void handleTinTinWriteRequest(record, payload); break;
      case 'class-read-request': void handleTinTinClassReadRequest(record, payload); break;
      case 'class-write-request': void handleTinTinClassWriteRequest(record, payload); break;
      case 'script-edit-request': void handleTinTinEditRequest(record, payload); break;
      case 'mapper-route-find-request': handleTinTinMapperFindRequest(record, payload, true); break;
      case 'font-size-request': {
        const requested = String(payload?.value || '').trim().toLowerCase();
        const size = requested === 'reset'
          ? applyTerminalFontSize(TERMINAL_FONT_SIZE_DEFAULT)
          : requested
            ? applyTerminalFontSize(requested)
            : normalizeTerminalFontSize($('#font-size')?.value);
        appendSystemMessage(`Terminal text size is ${size} pixels.${requested ? ' Saved.' : ''}`);
        announce(`Terminal text size is ${size} pixels.`, { force: true });
        break;
      }
      case 'definition-manager-request':
        openDefinitionManager(String(payload?.category || 'aliases'));
        break;
      case 'mapper-route-run-request': void handleTinTinPathRunRequest(record, payload, true); break;
      case 'mapper-route-stop-request': handleTinTinPathStopRequest(record, true); break;
      case 'review-find-request': handleTinTinReviewFindRequest(payload); break;
      case 'review-navigation-request': handleTinTinReviewNavigationRequest(payload); break;
      case 'input-cursor-request': handleTinTinCursorRequest(payload); break;
      case 'error': appendSystemMessage(payload, 'error'); break;
      default: break;
    }
  } else {
    switch (event.type) {
      case 'text': appendTextToInactiveSession(record, payload); break;
      case 'local-text': appendTextToInactiveSession(record, payload, { localDisplay: true }); break;
      case 'communication-text': captureCommunicationTextForSession(record, payload); break;
      case 'speedwalk-step': noteOutgoingCommand(sessionId, payload?.command); break;
      case 'status': {
        const previousState = record.status?.state || 'disconnected';
        if (payload?.state !== 'connected') {
          flushInactiveHighlightText(record);
          clearDockedPrompt(record, { render: false });
        }
        record.status = { ...(payload || {}) };
        record.connected = record.status.state === 'connected';
        if ((record.status.state === 'connected' && previousState !== 'connected') || !record.connected) {
          resetSpeechMarkerState(record);
        }
        if (!record.connected) resetMapperRecordState(record);
        if (record.status.host) record.host = String(record.status.host);
        if (Number(record.status.port)) record.port = Number(record.status.port);
        renderSessionVitals();
        break;
      }
      case 'echo': record.remoteEcho = Boolean(payload); break;
      case 'gmcp': storeInactiveGmcp(record, payload); break;
      case 'gmcp-state':
        if (payload && typeof payload === 'object') {
          record.gmcp = payload;
          const name = payload.char?.status?.name;
          if (name) record.characterName = String(name);
          if (payload.affects?.state) {
            record.affects.snapshot = normalizeAffectsSnapshot(payload.affects.state);
            record.affects.receivedAtMs = Date.now();
          }
          record.mobInspector ||= { snapshot: normalizeMobInspectorSnapshot({}), receivedAtMs: 0, signature: '' };
          if (payload.mob?.info && typeof mobInspectorApi.isClearPacket === 'function' &&
              mobInspectorApi.isClearPacket(payload.mob.info)) {
            if (record.mobInspector.mode === 'compact' || record.mobInspector.lastOpponentKey || !record.mobInspector.receivedAtMs) {
              record.mobInspector = {
                snapshot: normalizeMobInspectorSnapshot({}), receivedAtMs: 0, signature: '', roomId: '',
                mode: 'expanded', lastOpponentKey: '', combatRefreshKey: '', liveHealthSignature: '', lastTargetAffectsRequestMs: 0,
                pendingCombatKillRefresh: false, lastCombatKillRefreshMs: 0
              };
            }
          } else if (payload.mob?.info) {
            const normalized = normalizeMobInspectorSnapshot(payload.mob.info);
            const opponent = combatVitalsModelForGmcp(record.gmcp).opponent;
            const packetIsCurrent = normalized.context?.isCurrentTarget === true || normalized.context?.resolvedFromCurrentTarget === true;
            if (!packetIsCurrent || (opponent?.name && mobInspectorMatchesOpponent(normalized, opponent))) {
              record.mobInspector.snapshot = normalized;
              record.mobInspector.receivedAtMs = Date.now();
              record.mobInspector.signature = mobInspectorSnapshotSignature(record.mobInspector.snapshot);
              record.mobInspector.mode = packetIsCurrent ? 'compact' : 'expanded';
              record.mobInspector.lastOpponentKey = packetIsCurrent ? mobInspectorOpponentKey(opponent) : '';
            } else {
              record.mobInspector = {
                snapshot: normalizeMobInspectorSnapshot({}), receivedAtMs: 0, signature: '', roomId: '',
                mode: 'expanded', lastOpponentKey: '', combatRefreshKey: '', liveHealthSignature: '', lastTargetAffectsRequestMs: 0,
                pendingCombatKillRefresh: false, lastCombatKillRefreshMs: 0
              };
            }
          } else if (Number(payload.meta?.messageCount) === 0) {
            record.mobInspector.snapshot = normalizeMobInspectorSnapshot({});
            record.mobInspector.receivedAtMs = 0;
            record.mobInspector.signature = '';
          }
          if (payload.context?.state) record.contextDeck.snapshot = normalizeContextSnapshot(payload.context.state);
          if (payload.map?.local) {
            record.mapper.liveSnapshot = payload.map.local;
            record.mapper.liveSignature = '';
            record.mapper.liveStateReady = true;
          }
          processMapperRoomForSession(record, payload.room?.info);
          updateSessionVitalsFromGmcp(record);
          renderSessionVitals();
        }
        break;
      case 'boundary':
        flushInactiveHighlightText(record, { promptBoundary: payload });
        record.promptBoundaryCount += 1;
        record.promptBoundaryType = payload?.type === 'eor' ? 'eor' : 'ga';
        resolveMapperMovementPrompt(record.mapper);
        sessionRuntimeApi.commitBoundary?.(record);
        break;
      case 'protocol-warning': appendSystemToInactiveSession(record, payload, 'error'); break;
      case 'compression-state': record.protocol.compression = normalizeCompressionState(payload); break;
      case 'charset': record.protocol.charset = String(payload || ''); break;
      case 'terminal-type': record.protocol.terminalType = String(payload || ''); break;
      case 'window-size': record.protocol.windowSize = payload ? { ...payload } : null; break;
      case 'new-environ': record.protocol.newEnvironment = payload && typeof payload === 'object' ? { ...payload } : { enabled: false }; break;
      case 'action-result': applyActionResult(payload, false, record); break;
      case 'pipeline-debug': handlePipelineDebugEvent(record, payload); break;
      case 'script-audit-request': void handleTinTinAuditRequest(record, payload); break;
      case 'script-read-request': void handleTinTinReadRequest(record, payload); break;
      case 'session-profile-load-request': void handleTinTinReadRequest(record, payload, { privateProfileLoad: true }); break;
      case 'script-write-request': void handleTinTinWriteRequest(record, payload); break;
      case 'class-read-request': void handleTinTinClassReadRequest(record, payload); break;
      case 'class-write-request': void handleTinTinClassWriteRequest(record, payload); break;
      case 'script-edit-request': void handleTinTinEditRequest(record, payload); break;
      case 'mapper-route-find-request': handleTinTinMapperFindRequest(record, payload, false); break;
      case 'font-size-request': break;
      case 'definition-manager-request': break;
      case 'mapper-route-run-request': void handleTinTinPathRunRequest(record, payload, false); break;
      case 'mapper-route-stop-request': handleTinTinPathStopRequest(record, false); break;
      case 'error': appendSystemToInactiveSession(record, payload, 'error'); break;
      default: break;
    }
  }
  if (sessionTabSignature(record) !== previousTabSignature) scheduleSessionTabsRender();
}

function handleSessionEventBatch(events = []) {
  const list = Array.isArray(events) ? events : [events];
  if (list.length <= 1) {
    if (list.length === 1) handleSessionEvent(list[0]);
    return;
  }
  runSessionEventRenderBatch(() => {
    let firstError = null;
    for (const event of list) {
      try {
        handleSessionEvent(event);
      } catch (error) {
        if (!firstError) firstError = error;
      }
    }
    if (firstError) throw firstError;
  });
}

function handleSessionsChanged(snapshot) {
  applySessionsSnapshot(snapshot, { followActive: true });
}

function combatEntity(input, kind) {
  if (typeof combatVitalsApi.normalizeEntity === 'function') {
    return combatVitalsApi.normalizeEntity(input || {}, { kind });
  }
  const source = input?.info && typeof input.info === 'object' ? input.info : (input || {});
  const instanceId = numberFrom(source, ['instance_id', 'instanceId']);
  const name = String(input?.name || source.name || '').trim();
  return {
    key: Number(instanceId) > 0 ? `instance:${Number(instanceId)}` : `${kind}:${name.toLowerCase()}`,
    kind,
    name,
    hp: numberFrom(source, ['hp']),
    maxHp: numberFrom(source, ['mhp', 'maxhp', 'maxHp']),
    mana: numberFrom(source, ['mana', 'mn']),
    maxMana: numberFrom(source, ['mmana', 'mmn']),
    move: numberFrom(source, ['move', 'mv']),
    maxMove: numberFrom(source, ['mmove', 'mmv']),
    level: numberFrom(source, ['level', 'lvl']),
    vnum: numberFrom(source, ['vnum', 'mob_vnum', 'mobVnum']),
    instanceId,
    here: source.here === undefined ? null : Boolean(Number(source.here)),
    opponent: typeof source.opponent === 'string'
      ? { name: source.opponent }
      : (source.opponent || null)
  };
}

function invalidateGroupCombatState() {
  groupCombatStateSource = UNSET_GROUP_SOURCE;
  groupCombatStateCache = null;
  groupVitalsRenderSource = UNSET_GROUP_SOURCE;
  mobInspectorEngagedGroupSource = UNSET_GROUP_SOURCE;
  mobInspectorEngagedOpponentKey = '';
  mobInspectorEngagedCountCache = 0;
  mobInspectorCombatContextGroupSource = UNSET_GROUP_SOURCE;
  mobInspectorCombatContextCache = null;
}

function groupCombatState() {
  const source = state.gmcp?.group ?? null;
  if (groupCombatStateSource === source && groupCombatStateCache) return groupCombatStateCache;

  groupCombatStateSource = source;
  groupCombatStateCache = typeof combatVitalsApi.normalizeGroup === 'function'
    ? combatVitalsApi.normalizeGroup(source)
    : (() => {
        const group = source || {};
        return {
          leader: String(group.leader || ''),
          count: Number(group.count) || 0,
          members: Array.isArray(group.members) ? group.members.map((entry) => combatEntity(entry, 'member')) : [],
          enemies: Array.isArray(group.enemies) ? group.enemies.map((entry) => combatEntity(entry, 'enemy')) : []
        };
      })();
  return groupCombatStateCache;
}

function vitalDisplayText(current, maximum, mode, prefix = '') {
  if (typeof combatVitalsApi.formatVitalValue === 'function') {
    return combatVitalsApi.formatVitalValue(current, maximum, { mode, prefix });
  }
  const currentText = Number.isFinite(current) ? current.toLocaleString() : '—';
  const maximumText = Number.isFinite(maximum) ? maximum.toLocaleString() : '?';
  const percent = Number.isFinite(current) && Number.isFinite(maximum) && maximum > 0
    ? Math.max(0, Math.min(100, current / maximum * 100))
    : null;
  if (mode === 'current') return `${prefix}${currentText}`;
  if (mode === 'percent') return `${prefix}${percent === null ? '—' : `${Math.round(percent)}%`}`;
  const values = `${currentText} / ${maximumText}`;
  return `${prefix}${values}${mode === 'values-percent' && percent !== null ? ` · ${Math.round(percent)}%` : ''}`;
}

function combatVitalText(current, maximum, prefix = '') {
  return vitalDisplayText(current, maximum, state.vitalDisplay.groupMode, prefix);
}

function updateCombatMeter(meter, bar, entity, label) {
  if (!meter || !bar) return;
  const current = Number.isFinite(entity?.hp) ? entity.hp : null;
  const maximum = Number.isFinite(entity?.maxHp) ? entity.maxHp : null;
  const known = current !== null && maximum !== null && maximum > 0;
  const percent = known
    ? Math.max(0, Math.min(100, current / maximum * 100))
    : null;

  const width = percent === null ? '0%' : `${percent}%`;
  if (bar.style.width !== width) bar.style.width = width;
  setAttributeIfChanged(meter, 'aria-valuetext', known
    ? `${label} ${current.toLocaleString()} of ${maximum.toLocaleString()}`
    : `${label} unknown`);
  if (known) {
    setAttributeIfChanged(meter, 'aria-valuenow', current);
    setAttributeIfChanged(meter, 'aria-valuemax', maximum);
  } else {
    removeAttributeIfPresent(meter, 'aria-valuenow');
    removeAttributeIfPresent(meter, 'aria-valuemax');
  }
}

function renderOpponentVitals() {
  if (deferSessionEventRender('opponent-vitals', renderOpponentVitals)) return;
  const section = $('.opponent-vitals-section');
  const card = $('#opponent-vitals');
  const empty = $('#opponent-vitals-empty');
  if (!card || !empty) return;

  const opponent = currentCombatOpponent();
  if (!opponent?.name && deferCombatTargetPresentationClear()) return;

  const signature = opponent?.name
    ? `${opponent.key || opponent.name}|${opponent.name}|${opponent.level ?? ''}|${opponent.hp ?? ''}|${opponent.maxHp ?? ''}|${state.vitalDisplay.groupMode}`
    : 'none';
  if (opponentVitalsRenderSignature === signature) return;
  opponentVitalsRenderSignature = signature;

  if (!opponent?.name) {
    if (section && section.hidden !== true) section.hidden = true;
    if (card.hidden !== true) card.hidden = true;
    if (empty.hidden !== false) empty.hidden = false;
    setTextIfChanged($('#opponent-name'), 'Opponent');
    setTextIfChanged($('#opponent-level'), '');
    setTextIfChanged($('#opponent-hp-text'), '—');
    updateCombatMeter($('#opponent-hp-meter'), $('#opponent-hp-bar'), null, 'Opponent health');
    return;
  }

  if (section && section.hidden !== false) section.hidden = false;
  if (empty.hidden !== true) empty.hidden = true;
  if (card.hidden !== false) card.hidden = false;
  setTextIfChanged($('#opponent-name'), opponent.name);
  setTextIfChanged($('#opponent-level'), Number.isFinite(opponent.level)
    ? `Level ${opponent.level.toLocaleString()}`
    : 'Fighting');
  setTextIfChanged($('#opponent-hp-text'), combatVitalText(opponent.hp, opponent.maxHp, 'H '));
  updateCombatMeter($('#opponent-hp-meter'), $('#opponent-hp-bar'), opponent, `${opponent.name} health`);
}

function ensureCombatRow(container, key) {
  const escaped = globalThis.CSS?.escape ? globalThis.CSS.escape(key) : key.replace(/["\\]/gu, '\\$&');
  let row = container.querySelector(`[data-combat-key="${escaped}"]`);
  if (row) return row;

  row = document.createElement('div');
  row.className = 'combat-vital-row';
  row.dataset.combatKey = key;
  row.setAttribute('role', 'listitem');

  const heading = document.createElement('div');
  heading.className = 'combat-vital-heading';
  const name = document.createElement('strong');
  name.className = 'combat-vital-name';
  const badges = document.createElement('span');
  badges.className = 'combat-vital-badges';
  heading.append(name, badges);

  const values = document.createElement('div');
  values.className = 'combat-vital-values';
  for (const vitalName of ['hp', 'mana', 'move']) {
    const value = document.createElement('span');
    value.className = 'combat-vital-value';
    value.dataset.combatVital = vitalName;
    values.append(value);
  }

  const meter = document.createElement('div');
  meter.className = 'combat-meter';
  meter.setAttribute('role', 'progressbar');
  meter.setAttribute('aria-valuemin', '0');
  const bar = document.createElement('div');
  meter.append(bar);

  const opponent = document.createElement('div');
  opponent.className = 'combat-vital-opponent';
  opponent.hidden = true;

  row.append(heading, values, meter, opponent);
  container.append(row);
  return row;
}

function updateCombatRow(row, entity, options = {}) {
  const kind = entity.kind || 'entity';
  if (row.dataset.combatKind !== kind) row.dataset.combatKind = kind;
  setTextIfChanged(row.querySelector('.combat-vital-name'), entity.name);
  const badges = [];
  if (options.leader) badges.push('Leader');
  if (entity.here === false) badges.push('Away');
  if (Number.isFinite(entity.level)) badges.push(`Lvl ${entity.level.toLocaleString()}`);
  setTextIfChanged(row.querySelector('.combat-vital-badges'), badges.join(' · '));

  const values = row.querySelector('.combat-vital-values');
  const vitalSpecs = [
    ['hp', entity.hp, entity.maxHp, 'H '],
    ['mana', entity.mana, entity.maxMana, 'M '],
    ['move', entity.move, entity.maxMove, 'V ']
  ];
  for (const [name, current, maximum, prefix] of vitalSpecs) {
    let value = values.querySelector(`[data-combat-vital="${name}"]`);
    if (!value) {
      value = document.createElement('span');
      value.className = 'combat-vital-value';
      value.dataset.combatVital = name;
      values.append(value);
    }
    setTextIfChanged(value, combatVitalText(current, maximum, prefix));
  }

  const meter = row.querySelector('.combat-meter');
  updateCombatMeter(meter, meter.firstElementChild, entity, `${entity.name} health`);

  const opponent = row.querySelector('.combat-vital-opponent');
  const target = options.target || entity.opponent;
  const attackers = Array.isArray(options.attackers) ? options.attackers.filter(Boolean) : [];
  if (target?.name) {
    const targetHp = Number.isFinite(target.hp)
      ? ` · ${combatVitalText(target.hp, target.maxHp, 'H ')}`
      : '';
    setTextIfChanged(opponent, `${options.targetLabel || 'Fighting'} ${target.name}${targetHp}`);
    if (opponent.hidden) opponent.hidden = false;
  } else if (attackers.length > 0) {
    setTextIfChanged(opponent, `${options.targetLabel || 'Targeted by'} ${attackers.join(', ')}`);
    if (opponent.hidden) opponent.hidden = false;
  } else {
    setTextIfChanged(opponent, '');
    if (!opponent.hidden) opponent.hidden = true;
  }
}

function renderCombatList(container, entries, options = {}) {
  if (!container) return;
  const live = new Set();
  let position = 0;
  for (const entity of entries) {
    if (!entity?.name) continue;
    const key = entity.key || `${options.kind || 'entity'}:${entity.name.toLowerCase()}`;
    live.add(key);
    const row = ensureCombatRow(container, key);
    const rowOptions = typeof options.forEntity === 'function'
      ? options.forEntity(entity)
      : options;
    updateCombatRow(row, entity, rowOptions);
    const expected = container.children[position] || null;
    if (expected !== row) container.insertBefore(row, expected);
    position += 1;
  }
  for (const row of [...container.querySelectorAll('[data-combat-key]')]) {
    if (!live.has(row.dataset.combatKey)) row.remove();
  }
}

function groupMembersForVitalsDisplay(group) {
  const members = Array.isArray(group?.members) ? group.members : [];
  const currentName = state.gmcp?.char?.status?.name || state.workspace.currentCharacterName;
  if (typeof combatVitalsApi.visibleGroupMembers === 'function') {
    return combatVitalsApi.visibleGroupMembers(members, currentName, state.vitalDisplay.hideSelfInGroup);
  }
  return members.filter((member) => !(
    state.vitalDisplay.hideSelfInGroup && members.length > 1 && currentName &&
    member.name.toLocaleLowerCase() === String(currentName).toLocaleLowerCase()
  ));
}

function renderGroupVitals() {
  if (deferSessionEventRender('group-vitals', renderGroupVitals)) return;
  const groupSection = $('.group-vitals-section');
  const list = $('#group-vitals-list');
  const empty = $('#group-vitals-empty');
  const targetsSection = $('#group-targets-section');
  const targetsList = $('#group-targets-list');
  if (!list || !empty || !targetsSection || !targetsList) return;

  const groupSource = state.gmcp?.group ?? null;
  const selfName = state.gmcp?.char?.status?.name || state.workspace.currentCharacterName || '';
  const renderSignature = [
    state.displayComponents.groupVitals ? '1' : '0',
    state.vitalDisplay.groupMode,
    state.vitalDisplay.hideSelfInGroup ? '1' : '0',
    selfName
  ].join('|');
  if (groupVitalsRenderSource === groupSource && groupVitalsRenderSignature === renderSignature) return;
  groupVitalsRenderSource = groupSource;
  groupVitalsRenderSignature = renderSignature;

  const group = groupCombatState();

  if (!state.displayComponents.groupVitals) {
    if (groupSection) groupSection.hidden = true;
    targetsSection.hidden = true;
    return;
  }

  const visibleMembers = groupMembersForVitalsDisplay(group);
  if (groupSection) groupSection.hidden = visibleMembers.length === 0;
  empty.hidden = visibleMembers.length > 0;
  empty.textContent = group.members.length > 0
    ? 'Your main vitals are shown above.'
    : (state.gmcp?.group ? 'Solo.' : 'Waiting for group data.');

  const enemyByName = new Map(group.enemies.map((enemy) => [enemy.name.toLocaleLowerCase(), enemy]));
  renderCombatList(list, visibleMembers, {
    kind: 'member',
    forEntity: (member) => {
      const directTarget = member.opponent;
      const target = directTarget?.name
        ? (enemyByName.get(directTarget.name.toLocaleLowerCase()) || directTarget)
        : null;
      return {
        leader: Boolean(group.leader && member.name.toLocaleLowerCase() === group.leader.toLocaleLowerCase()),
        target
      };
    }
  });

  const holdEmptyTargets = group.enemies.length === 0 && deferCombatTargetPresentationClear();
  if (!holdEmptyTargets) {
    targetsSection.hidden = !state.displayComponents.groupVitals || group.enemies.length === 0;
    const targeters = new Map();
    for (const member of group.members) {
      const name = member.opponent?.name?.toLocaleLowerCase();
      if (!name) continue;
      const names = targeters.get(name) || [];
      names.push(member.name);
      targeters.set(name, names);
    }
    renderCombatList(targetsList, group.enemies, {
      kind: 'enemy',
      forEntity: (enemy) => ({
        targetLabel: 'Targeted by',
        attackers: targeters.get(enemy.name.toLocaleLowerCase()) || []
      })
    });
  }
}

function renderNukeFireState() {
  if (deferSessionEventRender('nukefire-state', renderNukeFireState)) return;
  const status = state.gmcp?.char?.status;
  const room = state.gmcp?.room?.info;
  const group = state.gmcp?.group;

  const characterText = status?.name
    ? `${status.name}${status.class ? `, ${status.class}` : ''}${Number.isFinite(Number(status.level)) ? ` level ${Number(status.level).toLocaleString()}` : ''}`
    : 'Waiting';
  const roomText = room?.name
    ? `${room.name}${Number.isFinite(Number(room.num)) ? ` (#${Number(room.num)})` : ''}`
    : 'Waiting';
  let groupText = 'Waiting';
  if (group && Number(group.count) > 0) {
    const count = Number(group.count);
    groupText = `${count.toLocaleString()} member${count === 1 ? '' : 's'}${group.leader ? `, led by ${group.leader}` : ''}`;
  } else if (group) {
    groupText = 'Solo';
  }

  setTextIfChanged($('#character-state'), characterText);
  setTextIfChanged($('#room-state'), roomText);
  setTextIfChanged($('#group-state'), groupText);
}

function parseVitalsFromText(raw, plainText) {
  const text = plainText !== undefined ? String(plainText || '') : window.NukeFireAnsi.stripAnsi(raw);
  const next = {};
  const hpMatch = text.match(/(?:HP|H)\s*[:=]\s*([\d,]+)\s*\/\s*([\d,]+)/i);
  if (hpMatch) {
    next.hp = Number(hpMatch[1].replaceAll(',', ''));
    next.maxHp = Number(hpMatch[2].replaceAll(',', ''));
  }
  const manaMatch = text.match(/(?:MANA|MP|M)\s*[:=]\s*([\d,]+)\s*\/\s*([\d,]+)/i);
  if (manaMatch) {
    next.mana = Number(manaMatch[1].replaceAll(',', ''));
    next.maxMana = Number(manaMatch[2].replaceAll(',', ''));
  }
  const moveMatch = text.match(/(?:MOVE|MOVES|MV|V)\s*[:=]\s*([\d,]+)\s*\/\s*([\d,]+)/i);
  if (moveMatch) {
    next.move = Number(moveMatch[1].replaceAll(',', ''));
    next.maxMove = Number(moveMatch[2].replaceAll(',', ''));
  }
  const compact = text.match(/<\s*([\d,]+)\s*[hH]\s+([\d,]+)\s*[mM]\s+([\d,]+)\s*[vV](?:\s+[^>\r\n]*)?\s*>/i);
  if (compact) {
    next.hp = Number(compact[1].replaceAll(',', ''));
    next.mana = Number(compact[2].replaceAll(',', ''));
    next.move = Number(compact[3].replaceAll(',', ''));
  }

  let changed = false;
  for (const [key, value] of Object.entries(next)) {
    if (state.vitals[key] !== value) {
      state.vitals[key] = value;
      changed = true;
    }
  }
  if (changed) renderVitals();
}

function renderMeter(name, current, maximum) {
  const labels = { hp: 'Health', mana: 'Mana', move: 'Movement' };
  const label = labels[name];
  const textElement = $(`#${name}-text`);
  const meter = $(`#${name}-meter`);
  const bar = $(`#${name}-bar`);

  setAttributeIfChanged(meter, 'aria-valuetext', describeVital(label, current, maximum));
  if (!Number.isFinite(current)) {
    setTextIfChanged(textElement, '—');
    if (bar.style.width !== '0%') bar.style.width = '0%';
    removeAttributeIfPresent(meter, 'aria-valuenow');
    removeAttributeIfPresent(meter, 'aria-valuemax');
    return;
  }

  setTextIfChanged(textElement, vitalDisplayText(current, maximum, state.vitalDisplay.mainMode));

  if (Number.isFinite(maximum) && maximum > 0) {
    const percent = Math.max(0, Math.min(100, current / maximum * 100));
    const width = `${percent}%`;
    if (bar.style.width !== width) bar.style.width = width;
    setAttributeIfChanged(meter, 'aria-valuenow', current);
    setAttributeIfChanged(meter, 'aria-valuemax', maximum);
  } else {
    if (bar.style.width !== '0%') bar.style.width = '0%';
    removeAttributeIfPresent(meter, 'aria-valuenow');
    removeAttributeIfPresent(meter, 'aria-valuemax');
  }
}

function renderVitals() {
  if (deferSessionEventRender('main-vitals', renderVitals)) return;
  renderMeter('hp', state.vitals.hp, state.vitals.maxHp);
  renderMeter('mana', state.vitals.mana, state.vitals.maxMana);
  renderMeter('move', state.vitals.move, state.vitals.maxMove);
}


function measureTerminalSize() {
  if (isXtermActive()) {
    xtermAdapter.fit();
    return xtermAdapter.size();
  }
  return state.protocol.windowSize || { width: 80, height: 24 };
}

async function syncTerminalSize() {
  const size = measureTerminalSize();
  state.protocol.windowSize = size;
  setTextIfChanged($('#naws-state'), `${size.width} × ${size.height}`);
  if (window.nukefire.setSessionTerminalSize) {
    await window.nukefire.setSessionTerminalSize('*', size);
  } else {
    await window.nukefire.setTerminalSize?.(size);
  }
  return size;
}

function scheduleTerminalSizeUpdate() {
  if (state.terminalSizeFrame !== null) cancelFrame(state.terminalSizeFrame);
  state.terminalSizeFrame = scheduleFrame(() => {
    state.terminalSizeFrame = null;
    // FitAddon must run after the active dock layout has settled. Without this,
    // xterm can keep the tiny fallback grid calculated while its host was hidden.
    void syncTerminalSize();
  });
}

async function syncClientPreferences() {
  const preferences = {
    screenReaderMode: state.accessibility.screenReaderMode,
    compressionEnabled: state.transport.compressionEnabled !== false
  };
  if (window.nukefire.setSessionClientPreferences) {
    return window.nukefire.setSessionClientPreferences('*', preferences);
  }
  return window.nukefire.setClientPreferences?.(preferences);
}

function applyCharset(result) {
  if (result?.accepted) {
    state.protocol.charset = result.charset || 'UTF-8';
    setTextIfChanged($('#charset-state'), state.protocol.charset);
  } else {
    setTextIfChanged($('#charset-state'), 'Declined');
  }
}

function applyTerminalType(result) {
  const value = String(result?.value || '').trim();
  if (!value) return;
  state.protocol.terminalType = value;
  setTextIfChanged($('#terminal-type-state'), value);
}

function applyWindowSize(size) {
  const width = Number(size?.width);
  const height = Number(size?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return;
  state.protocol.windowSize = { width, height };
  setTextIfChanged($('#naws-state'), `${width} × ${height}`);
}

function applyNewEnvironment(result) {
  const source = result && typeof result === 'object' ? result : { enabled: false };
  state.protocol.newEnvironment = {
    ...(state.protocol.newEnvironment && typeof state.protocol.newEnvironment === 'object'
      ? state.protocol.newEnvironment
      : {}),
    ...source,
    enabled: source.enabled !== false
  };
  applyProtocolDisplay();
}

function applyProtocolWarning(warning) {
  const message = warning?.message || 'Unknown protocol warning.';
  appendSystemMessage(`Protocol warning: ${message}`, 'error');
}

function clearOutput() {
  resetPendingTerminalRender();
  xtermAdapter?.clear?.();
  const record = activeSessionRecord();
  if (record && typeof sessionRuntimeApi.clearOutput === 'function') {
    sessionRuntimeApi.clearOutput(record);
    ansi = record.ansi;
  } else {
    ansi.reset();
  }
  state.lines = 0;
  state.plainText = '';
  state.readerCarry = '';
  state.lastCompleteLine = '';
  soundTriggers?.resetSession?.(record?.id || state.sessions.activeId || 'main');
  speechSoundTriggers?.resetSession?.(record?.id || state.sessions.activeId || 'main');
  state.terminalRender.lastLineCount = null;
  clearDockedPrompt(record);
  updateRenderedLineCount(0);
}

function showFind() {
  flushTerminalOutput();
  $('#find-panel').hidden = false;
  $('#find-input').focus();
  $('#find-input').select();
}

function closeFind() {
  $('#find-panel').hidden = true;
  window.getSelection()?.removeAllRanges();
  commandInput.focus();
}

function findInOutput(direction) {
  flushTerminalOutput();
  const query = $('#find-input').value;
  if (!query) return;
  if (!isXtermActive()) {
    announce('Terminal search is unavailable until xterm.js is ready.', { force: true });
    return;
  }
  const found = direction > 0
    ? xtermAdapter.findNext(query, { caseSensitive: false, incremental: false })
    : xtermAdapter.findPrevious(query, { caseSensitive: false, incremental: false });
  if (!found) announce(`No match for ${query}.`, { force: true });
}

function openDisconnectDialog() {
  if (!disconnectOverlay || !disconnectDialog) return;
  const record = activeSessionRecord();
  const host = String(record?.host || hostInput.value || 'NukeFire').trim();
  const port = Number(record?.port || portInput.value) || 4000;
  const sessionName = String(record?.characterName || record?.name || 'this session').trim();
  state.disconnectModal.open = true;
  state.disconnectModal.returnFocus = document.activeElement;
  disconnectTitle.textContent = `Disconnect ${sessionName}?`;
  disconnectMessage.textContent = `Close the live NukeFire connection to ${host}:${port}. Client settings and learned map data remain saved.`;
  disconnectOverlay.hidden = false;
  document.body.classList.add('disconnect-open');
  if ('inert' in appRoot) appRoot.inert = true;
  disconnectCancelButton?.focus({ preventScroll: true });
}

function closeDisconnectDialog(options = {}) {
  if (!disconnectOverlay) return;
  const returnFocus = state.disconnectModal.returnFocus;
  state.disconnectModal.open = false;
  state.disconnectModal.returnFocus = null;
  disconnectOverlay.hidden = true;
  document.body.classList.remove('disconnect-open');
  if ('inert' in appRoot) appRoot.inert = false;
  if (options.restoreFocus !== false) returnFocus?.focus?.({ preventScroll: true });
}

async function confirmDisconnectDialog() {
  const record = activeSessionRecord();
  const host = String(record?.host || hostInput.value || 'NukeFire').trim();
  const port = Number(record?.port || portInput.value) || 4000;
  const sessionName = String(record?.characterName || record?.name || 'this session').trim();
  closeDisconnectDialog({ restoreFocus: false });
  if (state.mapper.route.active) {
    stopMapperRoute('Client route stopped because the session is disconnecting.', { kind: 'error', output: false });
  }
  appendSystemMessage(`Disconnecting ${sessionName} from ${host}:${port}…`);
  if (window.nukefire.disconnectSession && state.sessions.activeId) {
    await window.nukefire.disconnectSession(state.sessions.activeId);
  } else {
    await window.nukefire.disconnect();
  }
}

function openCloseSessionDialog() {
  if (!closeSessionOverlay || !closeSessionDialog) return;
  const active = activeSessionRecord();
  if (!active || state.sessions.order.length <= 1) return;
  state.closeSessionModal.open = true;
  state.closeSessionModal.returnFocus = document.activeElement;
  state.closeSessionModal.sessionId = active.id;
  if (closeSessionTitle) closeSessionTitle.textContent = `Close ${sessionLabel(active)}?`;
  if (closeSessionMessage) {
    closeSessionMessage.textContent = `This removes the ${sessionLabel(active)} tab from the current session list${active.connected ? ' and ends its live connection' : ''}. Use Disconnect instead if you want to keep the session tab available.`;
  }
  closeSessionOverlay.hidden = false;
  document.body.classList.add('close-session-open');
  if ('inert' in appRoot) appRoot.inert = true;
  closeSessionCancelButton?.focus({ preventScroll: true });
}

function closeCloseSessionDialog(options = {}) {
  if (!closeSessionOverlay) return;
  const returnFocus = state.closeSessionModal.returnFocus;
  state.closeSessionModal.open = false;
  state.closeSessionModal.returnFocus = null;
  state.closeSessionModal.sessionId = '';
  closeSessionOverlay.hidden = true;
  document.body.classList.remove('close-session-open');
  if ('inert' in appRoot) appRoot.inert = false;
  if (options.restoreFocus !== false) returnFocus?.focus?.({ preventScroll: true });
}

async function confirmCloseSessionDialog() {
  const sessionId = state.closeSessionModal.sessionId;
  const closing = state.sessions.records[sessionId];
  if (!sessionId || !closing || state.sessions.order.length <= 1) {
    closeCloseSessionDialog();
    return;
  }
  closeCloseSessionDialog({ restoreFocus: false });
  try {
    const result = await window.nukefire.removeSession?.(sessionId);
    if (result?.removed === false) throw new Error('The last session cannot be closed.');
    if (result?.snapshot) applySessionsSnapshot(result.snapshot, { followActive: true });
    schedulePersistentSettingsSave();
    announce(`Closed session ${sessionLabel(closing)}.`, { force: true });
  } catch (error) {
    appendSystemMessage(`Unable to close session: ${error.message || error}`, 'error');
  }
}

function handleCloseSessionDialogKeydown(event) {
  if (!state.closeSessionModal.open) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeCloseSessionDialog();
    return;
  }
  if (event.key !== 'Tab') return;
  const controls = [closeSessionCancelButton, closeSessionConfirmButton].filter((item) => item && !item.disabled);
  if (!controls.length) return;
  const index = controls.indexOf(document.activeElement);
  const next = event.shiftKey
    ? controls[(index <= 0 ? controls.length : index) - 1]
    : controls[(index + 1) % controls.length];
  event.preventDefault();
  next.focus({ preventScroll: true });
}

function handleDisconnectDialogKeydown(event) {
  if (!state.disconnectModal.open) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    closeDisconnectDialog();
    return;
  }
  if (event.key !== 'Tab') return;
  const controls = [disconnectCancelButton, disconnectConfirmButton].filter((item) => item && !item.disabled);
  if (!controls.length) return;
  const index = controls.indexOf(document.activeElement);
  const next = event.shiftKey
    ? controls[(index <= 0 ? controls.length : index) - 1]
    : controls[(index + 1) % controls.length];
  event.preventDefault();
  next.focus({ preventScroll: true });
}

connectionBarToggle?.addEventListener('click', () => {
  setConnectionBarCollapsed(!state.connectionBarCollapsed, { focus: true });
});
hostInput.addEventListener('keydown', handleConnectionFieldKeydown);
portInput.addEventListener('keydown', handleConnectionFieldKeydown);
connectButton.addEventListener('click', connect);
reconnectButton?.addEventListener('click', () => void reconnect());
readerSetupButton?.addEventListener('click', () => openReaderSetup());
readerSetupNativeButton?.addEventListener('click', () => applyFirstRunReaderChoice('native-reader'));
readerSetupLiveButton?.addEventListener('click', () => applyFirstRunReaderChoice('reader-live-voice'));
readerSetupLaterButton?.addEventListener('click', () => { markReaderOnboardingSeen(); closeReaderSetup(); });
readerSetupOverlay?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    markReaderOnboardingSeen();
    closeReaderSetup();
  }
});
disconnectButton.addEventListener('click', openDisconnectDialog);
disconnectCancelButton?.addEventListener('click', () => closeDisconnectDialog());
disconnectConfirmButton?.addEventListener('click', () => void confirmDisconnectDialog());
disconnectOverlay?.addEventListener('click', (event) => {
  if (event.target === disconnectOverlay) closeDisconnectDialog();
});
disconnectDialog?.addEventListener('keydown', handleDisconnectDialogKeydown);
commandInput.addEventListener('input', () => {
  resetTinTinCompletion();
  resetTinTinHistorySearch();
  if (state.historyIndex !== null || state.historyPrefix || state.draft) resetHistoryNavigation();
  updateCommandAvailability(statusBox?.dataset.connectionState || (state.connected ? 'connected' : 'disconnected'));
});
commandInput.addEventListener('keydown', (event) => {
  if (handleTerminalPageNavigationKey(event)) return;
  if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) {
    const preview = tinTinCompletionPreview('mixed');
    const continuing = Boolean(state.tintinCompletion?.candidates?.length);
    if (continuing || preview?.candidates?.length) {
      event.preventDefault();
      void requestTinTinCursorOperation(event.shiftKey ? 'mixed tab backward' : 'mixed tab forward');
    }
    return;
  }
  if ((event.key === 'r' || event.key === 'R') && event.ctrlKey && !event.metaKey && !event.altKey) {
    if (!state.remoteEcho && state.history.length) {
      event.preventDefault();
      tinTinHistorySearch();
    }
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    const typedCommand = commandInput.value;
    const repeatLastOnEnter = !state.remoteEcho && $('#repeat-last-command-on-enter').checked;
    const selectedDisplayedCommand = Boolean(
      typedCommand
      && !state.remoteEcho
      && $('#show-last-command-in-input').checked
      && typedCommand === (state.history.at(-1) || '')
      && commandInput.selectionStart === 0
      && commandInput.selectionEnd === typedCommand.length
    );
    if (state.paginationPending && selectedDisplayedCommand) {
      /* The optional saved-command display is presentation, not fresh input.
       * When a pager is waiting, Return must advance the page rather than
       * accidentally re-run NEWS/HELP/etc. Preserve that displayed command
       * so subsequent pager pages behave the same way. */
      stopSelfVoiceNow();
      void sendCommand('#cr', { recordHistory: false, preserveInput: true });
      returnOutputToLive();
      return;
    }
    if (!typedCommand && !state.remoteEcho && state.paginationPending && !repeatLastOnEnter) {
      /* Pager prompts need a real carriage return when empty Enter would
       * otherwise be a normal blank submission.  If repeat-last is enabled,
       * preserve the longstanding pager rule: do not repeat the last command
       * while a pager is pending; send the literal blank Enter instead.
       * #cr remains available explicitly at all times. */
      stopSelfVoiceNow();
      void sendCommand('#cr', { recordHistory: false });
      returnOutputToLive();
      return;
    }
    const command = !typedCommand && repeatLastOnEnter && !state.paginationPending
      ? (state.history.at(-1) || '')
      : typedCommand;
    void sendCommand(command);
    returnOutputToLive();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    historyUp();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    historyDown();
  } else if (event.key === 'Escape' && (state.historyIndex !== null || state.tintinHistorySearch.index !== null || state.tintinCompletion.candidates.length)) {
    event.preventDefault();
    const draft = state.tintinHistorySearch.index !== null ? state.tintinHistorySearch.draft : state.draft;
    resetTinTinCompletion();
    resetTinTinHistorySearch();
    resetHistoryNavigation();
    commandInput.value = draft;
    commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length);
  }
});

for (const button of document.querySelectorAll('[data-command]')) {
  button.addEventListener('click', () => {
    void sendCommandAndRefocus(button.dataset.command);
  });
}

$('#tintin-startup-enabled')?.addEventListener('change', (event) => {
  state.tintinStartup.enabled = event.currentTarget.checked;
  state.tintinStartup.filename = normalizeTinTinStartupSettings({
    enabled: state.tintinStartup.enabled,
    filename: $('#tintin-startup-file')?.value || state.tintinStartup.filename
  }).filename;
  if (state.tintinStartup.enabled) {
    void loadTinTinStartupProfile({ applyToMain: true, persist: true, report: true });
  } else {
    void clearTinTinStartupTemplate().then(() => schedulePersistentSettingsSave());
  }
});
$('#tintin-startup-file')?.addEventListener('change', (event) => {
  state.tintinStartup.filename = normalizeTinTinStartupSettings({
    enabled: state.tintinStartup.enabled,
    filename: event.currentTarget.value
  }).filename;
  event.currentTarget.value = state.tintinStartup.filename;
  state.tintinStartup.loaded = false;
  renderTinTinStartupControls();
  if (state.tintinImport.destinationReady) void refreshTinTinImportDestinations({ preferred: currentTinTinImportDestination().filename });
  schedulePersistentSettingsSave();
});
$('#tintin-startup-reload')?.addEventListener('click', () => {
  state.tintinStartup.filename = normalizeTinTinStartupSettings({
    enabled: state.tintinStartup.enabled,
    filename: $('#tintin-startup-file')?.value || state.tintinStartup.filename
  }).filename;
  void loadTinTinStartupProfile({ applyToMain: true, persist: true, report: true });
});
$('#tintin-startup-save-current')?.addEventListener('click', () => {
  void saveCurrentTinTinStateToStartupFile();
});
$('#tintin-import-analyze')?.addEventListener('click', analyzeTinTinImportPaste);
$('#tintin-import-clear')?.addEventListener('click', clearTinTinImport);
$('#tintin-import-select-safe')?.addEventListener('click', () => selectTinTinImportEntries('safe'));
$('#tintin-import-select-none')?.addEventListener('click', () => selectTinTinImportEntries('none'));
$('#tintin-import-commit')?.addEventListener('click', () => { void commitTinTinImport(); });
$('#tintin-import-undo')?.addEventListener('click', () => { void undoTinTinImport(); });
$('#tintin-import-destination-file')?.addEventListener('change', () => {
  $('#tintin-import-make-startup')?.removeAttribute('data-user-choice');
  renderTinTinImportDestinationControls();
  void inspectTinTinImportDestination();
});
$('#tintin-import-new-file')?.addEventListener('input', () => {
  $('#tintin-import-make-startup')?.removeAttribute('data-user-choice');
  state.tintinImport.destinationDefinitions = emptySessionTinTinState();
  state.tintinImport.destinationFileContent = '';
  state.tintinImport.destinationAnalysisError = '';
  renderTinTinImportDestinationControls();
  if (state.tintinImport.analysis) renderTinTinImportReview();
});
$('#tintin-import-refresh-files')?.addEventListener('click', () => {
  void refreshTinTinImportDestinations({ preferred: currentTinTinImportDestination().filename });
});
$('#tintin-import-write-mode')?.addEventListener('change', () => {
  renderTinTinImportDestinationControls();
  renderTinTinImportReview();
});
$('#tintin-import-duplicates')?.addEventListener('change', renderTinTinImportReview);
$('#tintin-import-load-current')?.addEventListener('change', updateTinTinImportCommitAvailability);
$('#tintin-import-make-startup')?.addEventListener('change', (event) => {
  event.currentTarget.dataset.userChoice = 'true';
  updateTinTinImportCommitAvailability();
});

$('#quick-command-customize')?.addEventListener('click', openQuickCommandPreferences);
$('#quick-command-restore-defaults')?.addEventListener('click', restoreDefaultQuickCommands);
$('#quick-command-cancel')?.addEventListener('click', resetQuickCommandEditor);
$('#quick-command-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const label = String($('#quick-command-label')?.value || '').normalize('NFKC')
    .replace(/[\r\n\t]+/gu, ' ').replace(/\s+/gu, ' ').trim().slice(0, 32);
  const command = String($('#quick-command-value')?.value || '').normalize('NFKC')
    .replace(/[\r\n]+/gu, ' ').trim().slice(0, 1024);
  if (!label || !command) {
    announce('Quick Commands need both a button label and a command.', { force: true });
    return;
  }

  const editing = state.quickKeys.find((record) => record.id === state.quickKeyEditId);
  if (editing) {
    editing.label = label;
    editing.command = command;
  } else if (state.quickKeys.length < MAX_CUSTOM_QUICK_KEYS) {
    state.quickKeys.push({ id: newQuickKeyId(), label, command, enabled: true });
  } else {
    announce(`The maximum of ${MAX_CUSTOM_QUICK_KEYS} custom Quick Commands has been reached.`, { force: true });
    return;
  }

  resetQuickCommandEditor();
  renderQuickCommands();
  schedulePersistentSettingsSave();
  announce(`${label} Quick Command saved.`, { force: true });
});

for (const tab of preferenceTabs) {
  tab.addEventListener('click', () => {
    setPreferenceCategory(tab.dataset.preferenceCategory, { focusTab: true });
  });
  tab.addEventListener('keydown', handlePreferenceTabKeydown);
}
$('#client-preset-select')?.addEventListener('change', () => renderClientPresetReview());
$('#client-preset-preview')?.addEventListener('click', () => { void previewClientPreset(); });
$('#client-preset-keep')?.addEventListener('click', keepClientPresetPreview);
$('#client-preset-revert')?.addEventListener('click', () => { void revertClientPresetPreview(); });
$('#client-preset-import')?.addEventListener('click', () => { void importClientPreset(); });
$('#client-preset-export')?.addEventListener('click', () => { void exportCurrentClientPreset(); });
preferencesButton.addEventListener('click', openPreferences);
$('#preferences-close').addEventListener('click', closePreferences);
preferencesOverlay.addEventListener('click', (event) => {
  if (event.target === preferencesOverlay) closePreferences();
});
preferencesOverlay.addEventListener('keydown', handlePreferencesKeydown);
$('#clear-output').addEventListener('click', clearOutput);
retryTerminalButton?.addEventListener('click', () => initializeTerminal({ announceChange: true, forceRetry: true }));
$('#repeat-last-command-on-enter').addEventListener('change', (event) => {
  localStorage.setItem('nukefire.repeatLastCommandOnEnter', String(event.target.checked));
  schedulePersistentSettingsSave();
});
$('#show-last-command-in-input').addEventListener('change', (event) => {
  localStorage.setItem('nukefire.showLastCommandInInput', String(event.target.checked));
  schedulePersistentSettingsSave();
});
$('#bright-command-input-focus').addEventListener('change', (event) => {
  const enabled = Boolean(event.target.checked);
  document.body.dataset.brightCommandInputFocus = String(enabled);
  localStorage.setItem('nukefire.brightCommandInputFocus', String(enabled));
  schedulePersistentSettingsSave();
});
$('#keybindings-enabled')?.addEventListener('change', (event) => {
  updateKeybindings({ enabled: event.target.checked, bindings: state.keybindings.bindings });
});
$('#keybinding-install-numpad')?.addEventListener('click', installNumpadMovementBindings);
$('#keybinding-remove-numpad')?.addEventListener('click', removeNumpadMovementBindings);
$('#reader-hotkeys-install')?.addEventListener('click', installReaderAccessibilityBindings);
$('#reader-hotkeys-remove')?.addEventListener('click', removeReaderAccessibilityBindings);
$('#keybinding-add')?.addEventListener('click', addKeybinding);
$('#keybinding-refresh-controls')?.addEventListener('click', () => void refreshNukeFireControls());
$('#keybinding-record')?.addEventListener('click', beginKeybindingRecording);
$('#keybinding-type')?.addEventListener('change', (event) => {
  state.keybindingEditor.semanticType = String(event.target.value || 'raw');
  state.keybindingEditor.semanticId = '';
  const group = $('#keybinding-group');
  if (group && (!group.value.trim() || group.value === 'General')) {
    group.value = {
      'combo-profile': 'Combo',
      'groupassist-rotation': 'GroupAssist',
      'path-action': 'Path',
      'reader-review': 'Reader',
      'communications-review': 'Communications',
      accessibility: 'Accessibility'
    }[state.keybindingEditor.semanticType] || 'General';
  }
  renderKeybindingEditor();
});
$('#keybinding-semantic-id')?.addEventListener('change', (event) => {
  state.keybindingEditor.semanticId = String(event.target.value || '');
  renderKeybindingEditor();
});
$('#keybinding-cancel')?.addEventListener('click', () => resetKeybindingEditor({ focusAdd: true }));
$('#keybinding-command')?.addEventListener('input', renderKeybindingEditor);
$('#keybinding-replace-conflict')?.addEventListener('change', renderKeybindingEditor);
$('#keybinding-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  saveKeybindingEditor();
});
$('#client-command-prefix').addEventListener('change', (event) => {
  setClientCommandPrefix(event.target.value);
});

$('#follow-output').addEventListener('change', (event) => {
  localStorage.setItem('nukefire.followOutput', String(event.target.checked));
  schedulePersistentSettingsSave();
});
$('#compression-enabled')?.addEventListener('change', (event) => {
  state.transport.compressionEnabled = event.target.checked;
  localStorage.setItem('nukefire.compressionEnabled', String(event.target.checked));
  setTextIfChanged(
    $('#mccp-preference'),
    event.target.checked ? 'Enabled on next connection' : 'Disabled on next connection'
  );
  void syncClientPreferences();
  schedulePersistentSettingsSave();
  const message = event.target.checked
    ? 'MCCP2 and MCCPX compression will be enabled after reconnecting.'
    : 'MCCP2 and MCCPX compression will be disabled after reconnecting. GMCP remains enabled.';
  appendSystemMessage(message);
  announce(message, { force: true });
});
$('#compact-output').addEventListener('change', (event) => {
  xtermAdapter?.setCompact?.(event.target.checked);
  localStorage.setItem('nukefire.compactOutput', String(event.target.checked));
  schedulePersistentSettingsSave();
  scheduleTerminalSizeUpdate();
});
$('#font-size-scale')?.addEventListener('input', (event) => applyTerminalFontSize(event.target.value));
$('#font-size')?.addEventListener('input', (event) => {
  if (event.target.value !== '') applyTerminalFontSize(event.target.value);
});
$('#font-size')?.addEventListener('change', (event) => applyTerminalFontSize(event.target.value, { announceChange: true }));
$('#font-size-reset')?.addEventListener('click', () => applyTerminalFontSize(TERMINAL_FONT_SIZE_DEFAULT, { announceChange: true }));
$('#ui-font').addEventListener('change', (event) => {
  applyFontPreferences(event.target.value, state.terminalFont, { announceChange: true });
});
$('#terminal-font').addEventListener('change', (event) => {
  applyFontPreferences(state.uiFont, event.target.value, { announceChange: true });
});
$('#interface-brightness')?.addEventListener('change', (event) => {
  applyInterfaceBrightness(event.target.value, { announceChange: true });
});
$('#pipeline-debug-enabled')?.addEventListener('change', (event) => {
  void setActivePipelineDebug({ enabled: event.target.checked });
});
$('#pipeline-debug-limit')?.addEventListener('change', (event) => {
  void setActivePipelineDebug({ maxEntries: Number(event.target.value) || DEFAULT_PIPELINE_DEBUG.maxEntries });
});
$('#pipeline-debug-clear')?.addEventListener('click', async () => {
  const record = activeSessionRecord();
  if (!record) return;
  if (typeof window.nukefire.clearPipelineDebug === 'function') {
    await window.nukefire.clearPipelineDebug(record.id);
  }
  record.pipelineDebug.entries = [];
  renderPipelineDebug();
  announce('Pipeline debug log cleared.', { force: true });
});
$('#pipeline-debug-copy')?.addEventListener('click', async () => {
  const record = activeSessionRecord();
  const text = (record?.pipelineDebug?.entries || []).map(pipelineDebugEntryText).join('\n');
  if (!text) {
    announce('No pipeline debug entries to copy.', { force: true });
    return;
  }
  try {
    await window.nukefire.writeClipboardText(text);
    announce('Pipeline debug log copied.', { force: true });
  } catch (error) {
    appendSystemMessage(`Unable to copy pipeline debug log: ${error.message || error}`, 'error');
  }
});
$('#long-session-start')?.addEventListener('click', startLongSessionMonitor);
$('#long-session-stop')?.addEventListener('click', stopLongSessionMonitor);
$('#long-session-reset')?.addEventListener('click', resetLongSessionMonitor);
$('#long-session-copy')?.addEventListener('click', () => {
  void copyLongSessionReport();
});

$('#panel-label-mode')?.addEventListener('change', (event) => {
  applyDisplayTextPreferences({ ...state.displayText, panelLabels: event.target.value }, {
    persist: true,
    announceChange: true
  });
});
$('#mapper-room-label-mode')?.addEventListener('change', (event) => {
  applyDisplayTextPreferences({ ...state.displayText, mapperRoomLabels: event.target.value }, {
    persist: true,
    announceChange: true
  });
});
$('#prompt-display-mode')?.addEventListener('change', (event) => {
  applyPromptDisplayMode(event.target.value, {
    persist: true,
    announceChange: true
  });
});
for (const [selector, key] of [
  ['#show-group-vitals', 'groupVitals'],
  ['#show-mapper-exits', 'mapperExits'],
  ['#show-gps-navigator', 'gpsNavigator'],
  ['#show-mapper-map', 'mapperMap'],
  ['#show-mapper-room-info', 'mapperRoomInfo']
]) {
  $(selector)?.addEventListener('change', (event) => {
    applyDisplayComponents({ ...state.displayComponents, [key]: event.target.checked }, {
      persist: true,
      announceChange: true
    });
    if (key === 'groupVitals') renderGroupVitals();
  });
}
for (const [selector, key] of [
  ['#main-vitals-mode', 'mainMode'],
  ['#group-vitals-mode', 'groupMode'],
  ['#vitals-number-size', 'numberSize']
]) {
  $(selector)?.addEventListener('change', (event) => {
    applyVitalDisplayPreferences({ ...state.vitalDisplay, [key]: event.target.value }, {
      persist: true,
      announceChange: true
    });
  });
}
$('#hide-self-in-group-vitals')?.addEventListener('change', (event) => {
  applyVitalDisplayPreferences({ ...state.vitalDisplay, hideSelfInGroup: event.target.checked }, {
    persist: true,
    announceChange: true
  });
});
$('#terminal-theme').addEventListener('change', (event) => {
  selectTerminalTheme(event.target.value, { announceChange: true });
});
for (const colorInput of [$('#terminal-foreground'), $('#terminal-background')]) {
  colorInput.addEventListener('input', () => applyCustomTerminalColors());
  colorInput.addEventListener('change', () => applyCustomTerminalColors({ announceChange: true }));
}
$('#terminal-monochrome').addEventListener('change', () => {
  applyCustomTerminalColors({ announceChange: true });
});
$('#reader-preset-apply')?.addEventListener('click', applyReaderSetupPreset);
$('#screen-reader-mode').addEventListener('change', (event) => setScreenReaderMode(event.target.checked));
$('#reader-workspace-enabled')?.addEventListener('change', (event) => setReaderWorkspaceEnabled(event.target.checked, { focus: false }));
$('#self-voice-enabled')?.addEventListener('change', (event) => setSelfVoiceEnabled(event.target.checked));
$('#self-voice-muted')?.addEventListener('change', (event) => setSelfVoiceMuted(event.target.checked));
$('#self-voice-foreground-only')?.addEventListener('change', (event) => setSelfVoiceForegroundOnly(event.target.checked));
$('#self-voice-governor-enabled')?.addEventListener('change', (event) => setSelfVoiceGovernorEnabled(event.target.checked));
$('#self-voice-priority-alerts-enabled')?.addEventListener('change', (event) => setSelfVoicePriorityAlertsEnabled(event.target.checked));
$('#self-voice-follow-mode')?.addEventListener('change', (event) => setSelfVoiceFollowMode(event.target.checked));
$('#self-voice-interrupt-on-command')?.addEventListener('change', (event) => setSelfVoiceInterruptOnCommand(event.target.checked));
$('#self-voice-rate')?.addEventListener('input', (event) => setSelfVoiceVoiceSettings({ rate: event.target.value }, { announceChange: false }));
$('#self-voice-pitch')?.addEventListener('input', (event) => setSelfVoiceVoiceSettings({ pitch: event.target.value }, { announceChange: false }));
$('#self-voice-volume')?.addEventListener('input', (event) => setSelfVoiceVoiceSettings({ volume: event.target.value }, { announceChange: false }));
$('#self-voice-voice')?.addEventListener('change', (event) => setSelfVoiceVoiceSettings({ voiceId: event.target.value }, { announceChange: true }));
$('#vital-speech-mode')?.addEventListener('change', (event) => setVitalSpeechMode(event.target.value, { announceChange: true }));
$('#self-voice-test')?.addEventListener('click', testSelfVoice);
$('#self-voice-toggle-mute')?.addEventListener('click', () => setSelfVoiceMuted(!state.accessibility.selfVoiceMuted));
$('#self-voice-stop')?.addEventListener('click', stopSelfVoiceNow);
$('#audio-cues-enabled')?.addEventListener('change', (event) => setAudioCuesEnabled(event.target.checked, { unlock: true }));
$('#audio-cues-muted')?.addEventListener('change', (event) => setAudioCuesMuted(event.target.checked));
$('#audio-cues-foreground-only')?.addEventListener('change', (event) => setAudioCuesForegroundOnly(event.target.checked));
$('#audio-cues-volume')?.addEventListener('input', (event) => setAudioCuesVolume(event.target.value, { announceChange: false }));
$('#soundpack-use')?.addEventListener('click', () => void activateSoundpack($('#soundpack-select')?.value || 'builtin', { announceChange: true }));
$('#soundpack-import')?.addEventListener('click', () => void importSoundpack());
$('#soundpack-built-in')?.addEventListener('click', () => void activateSoundpack('builtin', { announceChange: true }));
$('#soundpack-select')?.addEventListener('change', () => void inspectSoundpackEditorEvent());
$('#soundpack-editor-event')?.addEventListener('change', () => void inspectSoundpackEditorEvent());
$('#soundpack-editor-enabled')?.addEventListener('change', (event) => {
  const selected = $('#soundpack-editor-event')?.value || '';
  const enabled = event.currentTarget.checked === true;
  if (setSoundpackEventEnabled(selected, enabled, { announceChange: true }) === null) return;
  void inspectSoundpackEditorEvent();
});
$('#soundpack-editor-duplicate')?.addEventListener('click', () => void duplicateSelectedSoundpack());
$('#soundpack-editor-assign')?.addEventListener('click', () => void assignSelectedSoundpackEvent());
$('#soundpack-editor-save-options')?.addEventListener('click', () => void updateSelectedSoundpackEvent(false));
$('#soundpack-editor-clear')?.addEventListener('click', () => void updateSelectedSoundpackEvent(true));
$('#soundpack-editor-export')?.addEventListener('click', () => void exportSelectedSoundpack());
$('#soundpack-editor-preview')?.addEventListener('click', () => {
  const event = $('#soundpack-editor-event')?.value || '';
  const record = state.accessibility.soundpackEvents.find((item) => item.event === event);
  const ok = testAudioCue(record?.cue || '') === true;
  soundpackEditorStatus(ok ? `${event} preview played.` : `${event} preview could not play. Check Audio Cues and mute settings.`);
});
$('#communication-cue-tell')?.addEventListener('change', (event) => setCommunicationCueChannel('tell', event.target.checked));
$('#communication-cue-auction')?.addEventListener('change', (event) => setCommunicationCueChannel('auction', event.target.checked));
$('#communication-cue-gossip')?.addEventListener('change', (event) => setCommunicationCueChannel('gossip', event.target.checked));
$('#communication-cue-skynet')?.addEventListener('change', (event) => setCommunicationCueChannel('skynet', event.target.checked));
$('#communication-cue-ssf')?.addEventListener('change', (event) => setCommunicationCueChannel('ssf', event.target.checked));
$('#communication-cues-background')?.addEventListener('change', (event) => setCommunicationCuesBackground(event.target.checked));
for (const button of document.querySelectorAll('[data-audio-cue-test]')) {
  button.addEventListener('click', () => testAudioCue(button.dataset.audioCueTest));
}
$('#audio-cues-stop')?.addEventListener('click', stopAudioCues);
$('#sound-triggers-enabled')?.addEventListener('change', (event) => setSoundTriggersEnabled(event.target.checked));
$('#sound-trigger-add')?.addEventListener('click', () => openSoundTriggerEditor());
$('#sound-trigger-form')?.addEventListener('submit', saveSoundTriggerFromEditor);
$('#sound-trigger-cancel')?.addEventListener('click', resetSoundTriggerEditor);
$('#sound-trigger-test')?.addEventListener('click', () => testAudioCue($('#sound-trigger-cue')?.value || 'hit'));
$('#sound-trigger-list')?.addEventListener('click', handleSoundTriggerListClick);
$('#announce-important').addEventListener('change', (event) => setImportantAnnouncements(event.target.checked));
$('#reader-workspace-history-category-previous')?.addEventListener('click', readerHistoryPreviousCategory);
$('#reader-workspace-history-category-next')?.addEventListener('click', readerHistoryNextCategory);
$('#reader-workspace-reader-current')?.addEventListener('click', readerHistoryCurrent);
$('#reader-workspace-reader-previous')?.addEventListener('click', readerHistoryPrevious);
$('#reader-workspace-reader-next')?.addEventListener('click', readerHistoryNext);
$('#reader-workspace-reader-latest')?.addEventListener('click', readerHistoryLatest);
$('#reader-workspace-read-last')?.addEventListener('click', readLastLine);
$('#reader-workspace-comms-current')?.addEventListener('click', reviewCurrentCommunication);
$('#reader-workspace-comms-older')?.addEventListener('click', reviewOlderCommunication);
$('#reader-workspace-comms-newer')?.addEventListener('click', reviewNewerCommunication);
$('#reader-workspace-comms-latest')?.addEventListener('click', reviewLatestCommunication);
$('#reader-workspace-last-tell')?.addEventListener('click', recallLastTell);
$('#reader-workspace-last-communication')?.addEventListener('click', recallLastCommunication);
$('#reader-workspace-copy-reviewed')?.addEventListener('click', () => { void copyReviewedText(); });
$('#reader-workspace-focus-command')?.addEventListener('click', () => focusCommand({ preserveSelection: true }));
$('#reader-workspace-tutorial')?.addEventListener('click', () => startReaderTutorial());
$('#reader-workspace-unread')?.addEventListener('click', () => announce(readerUnreadText(), { force: true, interrupt: true }));
$('#reader-workspace-context')?.addEventListener('click', () => announce(readerContextText(), { force: true, interrupt: true }));
$('#reader-workspace-toggle-self-voice-mute')?.addEventListener('click', () => setSelfVoiceMuted(!state.accessibility.selfVoiceMuted));
$('#reader-workspace-stop-self-voice')?.addEventListener('click', stopSelfVoiceNow);
$('#shared-crew-workspace')?.addEventListener('change', (event) => {
  setSharedCrewWorkspace(event.target.checked);
});

for (const toggle of document.querySelectorAll('[data-panel-toggle]')) {
  toggle.addEventListener('change', () => {
    applyPanelVisibility({
      ...state.workspace.activePanels,
      [toggle.dataset.panelToggle]: toggle.checked
    }, { persist: true });
  });
}

refreshSelfVoiceVoiceOptions();
if (window.speechSynthesis?.addEventListener) {
  window.speechSynthesis.addEventListener('voiceschanged', refreshSelfVoiceVoiceOptions);
}

initializePanelMenuLayer();
initializePanelDragAndDrop();
initializePanelPopoutMirrors();

for (const button of document.querySelectorAll('[data-panel-menu-button]')) {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    openPanelMenu(button.dataset.panelMenuButton);
  });
}

for (const item of document.querySelectorAll('[data-mapper-section-toggle]')) {
  item.addEventListener('click', () => {
    const key = item.dataset.mapperSectionToggle;
    applyDisplayComponents({ ...state.displayComponents, [key]: !state.displayComponents[key] }, {
      persist: true,
      announceChange: true
    });
    closePanelMenu('mapper', { returnFocus: true });
  });
}

for (const item of document.querySelectorAll('[data-panel-action]')) {
  item.addEventListener('click', () => {
    const panelId = item.dataset.panelId;
    const action = item.dataset.panelAction;

    // A panel menu is a one-action surface: every command closes it before
    // changing the workspace, then focus lands somewhere deliberate.
    closePanelMenu(panelId);

    if (action === 'reset-size') {
      window.NukeFirePanelHeightController?.resetPanel?.(panelId);
      $(`[data-panel-menu-button="${panelId}"]`)?.focus({ preventScroll: true });
      return;
    }
    if (action === 'pop-out') {
      void openPanelPopout(panelId, { focus: true });
      return;
    }
    if (action === 'hide') {
      applyPanelVisibility({
        ...state.workspace.activePanels,
        [panelId]: false
      }, {
        persist: true,
        announceChange: true
      });
      commandInput.focus({ preventScroll: true });
      return;
    }

    if (action === 'tab-previous' || action === 'tab-next') {
      tabPanelWithAdjacent(panelId, action === 'tab-previous' ? 'previous' : 'next');
      return;
    }
    if (action === 'separate-tab') {
      separatePanelTab(panelId);
      return;
    }

    const destination = {
      'move-left': 'left',
      'move-right': 'right',
      'move-outer-right': 'outer-right',
      'move-bottom': 'bottom',
      'move-earlier': 'earlier',
      'move-later': 'later'
    }[action];
    if (destination) movePanel(panelId, destination);
  });
}

for (const menu of document.querySelectorAll('[data-panel-menu]')) {
  menu.addEventListener('keydown', (event) => {
    const items = [...menu.querySelectorAll('[role="menuitem"]:not([disabled]), [role="menuitemcheckbox"]:not([disabled])')];
    const index = items.indexOf(document.activeElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      closePanelMenu(menu.dataset.panelMenu, { returnFocus: true });
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(index + 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items.at(-1)?.focus();
    } else if (event.key === 'Tab') {
      closePanelMenu(menu.dataset.panelMenu);
    }
  });
}

for (const [region, resizer] of Object.entries(dockResizerElements)) {
  if (!resizer) continue;
  resizer.addEventListener('pointerdown', (event) => beginDockResize(event, region));
  resizer.addEventListener('dblclick', () => resetDockSize(region));
  resizer.addEventListener('keydown', (event) => resizeDockWithKeyboard(event, region));
}

document.addEventListener('pointermove', continueDockResize);
document.addEventListener('pointerup', finishDockResize);
document.addEventListener('pointercancel', finishDockResize);

document.addEventListener('click', (event) => {
  if (!event.target.closest?.('.panel-menu, .panel-menu-button')) closeAllPanelMenus();
});

function normalizedSessionDisplayName(value) {
  return String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
}

function sessionDisplayNameInUse(value) {
  const requested = normalizedSessionDisplayName(value);
  if (!requested) return false;
  return state.sessions.order.some((id) =>
    normalizedSessionDisplayName(state.sessions.records[id]?.name) === requested);
}

function updateSessionCreateValidity() {
  const input = $('#session-new-name');
  const submit = $('#session-create-submit');
  if (!input) return false;
  const name = input.value.trim();
  const duplicate = Boolean(name) && sessionDisplayNameInUse(name);
  input.setCustomValidity(duplicate ? 'That session name is already in use.' : '');
  input.setAttribute('aria-invalid', String(duplicate));
  if (submit) submit.disabled = !name;
  return Boolean(name) && !duplicate;
}

function setSessionCreateDrawerVisible(visible, options = {}) {
  if (!sessionCreateDrawer) return;
  const next = Boolean(visible);
  sessionCreateDrawer.hidden = !next;
  $('#session-add')?.setAttribute('aria-expanded', String(next));
  if (next) {
    updateSessionCreateValidity();
    if (options.focus !== false) $('#session-new-name')?.focus({ preventScroll: true });
  }
}

$('#session-add')?.addEventListener('click', () => {
  setSessionCreateDrawerVisible(Boolean(sessionCreateDrawer?.hidden));
});
$('#session-new-name')?.addEventListener('input', () => {
  updateSessionCreateValidity();
});
$('#session-create-cancel')?.addEventListener('click', () => {
  setSessionCreateDrawerVisible(false, { focus: false });
  $('#session-add')?.focus({ preventScroll: true });
});
sessionCreateDrawer?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    setSessionCreateDrawerVisible(false, { focus: false });
    $('#session-add')?.focus({ preventScroll: true });
  }
});
sessionCreateForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = $('#session-new-name');
  const name = input?.value.trim() || '';
  if (!updateSessionCreateValidity()) {
    input?.reportValidity?.();
    input?.focus({ preventScroll: true });
    return;
  }
  const role = $('#session-new-role')?.value || 'member';
  try {
    const result = await window.nukefire.createSession?.({
      name, role,
      host: hostInput.value.trim() || 'tdome.nukefire.org',
      port: Number(portInput.value) || 4000
    });
    if (result?.snapshot) applySessionsSnapshot(result.snapshot, { followActive: false });
    const createdId = result?.session?.id;
    if (createdId) {
      await activateSession(createdId, { notifyMain: true, announceChange: true });
      appendSystemMessage(`Session ${name} ready. Press Connect to enter NukeFire.`);
    }
    if (input) input.value = '';
    updateSessionCreateValidity();
    setSessionCreateDrawerVisible(false, { focus: false });
    schedulePersistentSettingsSave();
  } catch (error) {
    appendSystemMessage(`Unable to create session: ${error.message || error}`, 'error');
  }
});
layoutGalleryPrevious?.addEventListener('click', () => stepLayoutGallery(-1));
layoutGalleryNext?.addEventListener('click', () => stepLayoutGallery(1));
layoutGalleryApply?.addEventListener('click', () => {
  applyLayoutGalleryPreset(currentLayoutGalleryItem());
  startLayoutGalleryRotation();
});
layoutGallery?.addEventListener('pointerenter', () => {
  state.workspace.layoutGallery.paused = true;
  stopLayoutGalleryRotation();
});
layoutGallery?.addEventListener('pointerleave', () => {
  state.workspace.layoutGallery.paused = false;
  startLayoutGalleryRotation();
});
layoutGallery?.addEventListener('focusin', () => {
  state.workspace.layoutGallery.paused = true;
  stopLayoutGalleryRotation();
});
layoutGallery?.addEventListener('focusout', (event) => {
  if (layoutGallery.contains(event.relatedTarget)) return;
  state.workspace.layoutGallery.paused = false;
  startLayoutGalleryRotation();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopLayoutGalleryRotation();
  else startLayoutGalleryRotation();
});

$('#session-close')?.addEventListener('click', openCloseSessionDialog);
closeSessionCancelButton?.addEventListener('click', () => closeCloseSessionDialog());
closeSessionConfirmButton?.addEventListener('click', () => { void confirmCloseSessionDialog(); });
closeSessionOverlay?.addEventListener('click', (event) => {
  if (event.target === closeSessionOverlay) closeCloseSessionDialog();
});
closeSessionDialog?.addEventListener('keydown', handleCloseSessionDialogKeydown);
sessionRole?.addEventListener('change', async (event) => {
  const active = activeSessionRecord();
  if (!active) return;
  active.role = event.currentTarget.value;
  renderSessionTabs();
  try {
    const result = await window.nukefire.updateSession?.(active.id, { role: active.role });
    if (result?.snapshot) applySessionsSnapshot(result.snapshot, { followActive: false });
    schedulePersistentSettingsSave();
  } catch (error) {
    appendSystemMessage(`Unable to update session role: ${error.message || error}`, 'error');
  }
});

$('#reset-sidebar-panels').addEventListener('click', resetSidebarPanels);
$('#reset-panel-layout').addEventListener('click', resetPanelLayout);
$('#focus-command').addEventListener('click', () => {
  closePreferences({ focusTarget: commandInput });
});
$('#focus-output').addEventListener('click', () => {
  closePreferences({ focusTarget: isXtermActive() ? xtermOutput : retryTerminalButton || terminalRecovery });
});
$('#read-last-line').addEventListener('click', readLastLine);
$('#reader-review-current').addEventListener('click', reviewCurrentLine);
$('#reader-review-previous').addEventListener('click', reviewPreviousLine);
$('#reader-review-next').addEventListener('click', reviewNextLine);
$('#reader-review-latest').addEventListener('click', reviewLatestLine);
$('#read-vitals').addEventListener('click', readVitals);
$('#find-button').addEventListener('click', showFind);
$('#find-close').addEventListener('click', closeFind);
$('#find-next').addEventListener('click', () => findInOutput(1));
$('#find-previous').addEventListener('click', () => findInOutput(-1));
$('#find-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') findInOutput(event.shiftKey ? -1 : 1);
  if (event.key === 'Escape') closeFind();
});

$('#communications-order').addEventListener('change', (event) => {
  setCommunicationMessageOrder(event.currentTarget.value, { persist: true, snapToLive: true });
});
$('#communications-messages')?.addEventListener('scroll', (event) => {
  setCommunicationFollowLiveEdge(communicationsAtLiveEdge(event.currentTarget, communicationMessageOrder()));
}, { passive: true });
$('#communications-search').addEventListener('input', () => renderCommunicationMessages({ snapToLive: true }));
$('#communications-search').addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.currentTarget.value = '';
    renderCommunicationMessages({ snapToLive: true });
    $('#communications-messages').focus({ preventScroll: true });
  }
});
$('#communications-clear').addEventListener('click', clearCommunicationMessages);

$('#affects-list')?.addEventListener('click', (event) => {
  const toggle = event.target.closest?.('.affect-row-toggle');
  if (!toggle || !event.currentTarget.contains(toggle)) return;
  setAffectRowExpanded(toggle, toggle.getAttribute('aria-expanded') !== 'true');
});

$('#affects-display-mode')?.addEventListener('change', (event) => {
  setAffectsDisplayMode(event.currentTarget.value, { persist: true });
});
$('#affects-refresh')?.addEventListener('click', () => void requestAffects({ announceRequest: true }));
$('#affects-text-list')?.addEventListener('click', () => void sendCommandAndRefocus('afx'));
$('#mob-inspector-refresh')?.addEventListener('click', () => void requestMobInspector({ announceRequest: true }));
document.querySelectorAll('[data-loot-filter]').forEach((button) => button.addEventListener('click', () => setLootHistoryFilter(button.dataset.lootFilter)));
$('#loot-history-clear')?.addEventListener('click', () => { state.lootHistory.events = []; state.lootHistory.visibleLimit = DEFAULT_LOOT_HISTORY_VISIBLE; const record = activeSessionRecord(); if (record) record.lootHistory = state.lootHistory; renderLootHistory(); });
$('#loot-history-more')?.addEventListener('click', showOlderLootHistory);
document.querySelectorAll('[data-foundlist-filter]').forEach((button) => button.addEventListener('click', () => setFoundlistFilter(button.dataset.foundlistFilter)));
$('#foundlist-items')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-foundlist-dbid]');
  if (!button) return;
  const vnum = Number(button.dataset.foundlistDbid);
  if (!Number.isInteger(vnum) || vnum <= 0) return;
  void sendCommandAndRefocus(`dbid ${vnum}`);
});
$('#mob-inspector-auto-open')?.addEventListener('change', (event) => setMobInspectorAutoOpen(event.target.checked, { persist: true, announceChange: true }));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopAffectsCountdown();
  else updateAffectsCountdowns();
});

$('#context-deck-refresh')?.addEventListener('click', () => {
  void requestContextDeck({ announceRequest: true });
});
$('#groupassist-editor-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  void saveGroupAssistEditor();
});
$('#groupassist-editor-clear')?.addEventListener('click', () => void clearGroupAssistEditor());
$('#groupassist-editor-refresh')?.addEventListener('click', () => void refreshNukeFireControls({ announce: true }));
$('#groupassist-editor-target')?.addEventListener('change', () => renderGroupAssistEditor({ loadSaved: true }));

$('#mapper-gps-search')?.addEventListener('input', renderGpsNavigator);
$('#mapper-gps-search')?.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.currentTarget.value = '';
    renderGpsNavigator();
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    $('#mapper-gps-destination')?.focus({ preventScroll: true });
  }
});
$('#mapper-gps-destination')?.addEventListener('change', (event) => {
  $('#mapper-gps-set').disabled = !event.currentTarget.value;
  const destination = gpsCatalog().items.find((item) => String(item.index) === event.currentTarget.value) || null;
  updateGpsSelectionGuidance(destination);
});
$('#mapper-gps-destination')?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.currentTarget.value) {
    event.preventDefault();
    void setGpsFromNavigator();
  }
});
$('#mapper-gps-set')?.addEventListener('click', () => void setGpsFromNavigator());
$('#mapper-gps-clear')?.addEventListener('click', () => void clearGpsFromNavigator());
$('#mapper-gps-refresh')?.addEventListener('click', () => void requestGpsCatalog());

$('#mapper-zoom-in')?.addEventListener('click', () => zoomMapper(0.15));
$('#mapper-zoom-out')?.addEventListener('click', () => zoomMapper(-0.15));
$('#mapper-center')?.addEventListener('click', () => centerMapper({ focus: true }));
$('#mapper-refresh')?.addEventListener('click', () => void requestAuthoritativeMap({ announceRequest: true, hardReset: true }));
$('#mapper-clear')?.addEventListener('click', () => void clearLearnedMap());
const mapperResizer = $('#resize-mapper-canvas');
mapperResizer?.addEventListener('pointerdown', beginMapperResize);
mapperResizer?.addEventListener('pointermove', continueMapperResize);
mapperResizer?.addEventListener('pointerup', finishMapperResize);
mapperResizer?.addEventListener('pointercancel', finishMapperResize);
mapperResizer?.addEventListener('keydown', handleMapperResizeKeydown);
mapperResizer?.addEventListener('dblclick', () => resetMapperCanvasHeight());

const mapperCanvas = $('#mapper-canvas');

function mapperPointerScale(canvas) {
  const bounds = canvas?.getBoundingClientRect?.();
  return {
    x: bounds?.width > 0 ? MAPPER_VIEWBOX_WIDTH / bounds.width : 1,
    y: bounds?.height > 0 ? MAPPER_VIEWBOX_HEIGHT / bounds.height : 1
  };
}

function beginMapperPan(event) {
  if (event.button !== undefined && event.button !== 0) return;
  const character = mapperCurrentCharacter();
  const canvas = event.currentTarget || mapperCanvas;
  if (!character || !canvas) return;
  event.preventDefault();
  const scale = mapperPointerScale(canvas);
  state.mapper.drag = {
    pointerId: event.pointerId,
    startClientX: Number(event.clientX) || 0,
    startClientY: Number(event.clientY) || 0,
    startPanX: Number(character.panX) || 0,
    startPanY: Number(character.panY) || 0,
    scaleX: scale.x,
    scaleY: scale.y,
    moved: false
  };
  canvas.classList.add('dragging');
  canvas.setPointerCapture?.(event.pointerId);
}

function continueMapperPan(event) {
  const drag = state.mapper.drag;
  if (!drag || (drag.pointerId !== undefined && event.pointerId !== drag.pointerId)) return;
  event.preventDefault();
  const deltaX = ((Number(event.clientX) || 0) - drag.startClientX) * drag.scaleX;
  const deltaY = ((Number(event.clientY) || 0) - drag.startClientY) * drag.scaleY;
  if (Math.abs(deltaX) >= 1 || Math.abs(deltaY) >= 1) drag.moved = true;
  state.mapper.statusMessage = 'map panned; press Center, C, or Home to follow the current room';
  updateMapperView({
    panX: drag.startPanX + deltaX,
    panY: drag.startPanY + deltaY,
    followPlayer: false
  }, { render: false, persist: false });
}

function finishMapperPan(event) {
  const drag = state.mapper.drag;
  if (!drag || (event?.pointerId !== undefined && drag.pointerId !== undefined && event.pointerId !== drag.pointerId)) return;
  state.mapper.drag = null;
  const canvas = event?.currentTarget || mapperCanvas;
  canvas?.classList.remove('dragging');
  try {
    if (drag.pointerId !== undefined && (!canvas?.hasPointerCapture || canvas.hasPointerCapture(drag.pointerId))) {
      canvas?.releasePointerCapture?.(drag.pointerId);
    }
  } catch {
    /* Pointer capture may already have been released by the window manager. */
  }
  if (drag.moved) {
    renderMapper();
    scheduleMapSave();
  }
}

function panMapperBy(deltaX, deltaY) {
  const character = mapperCurrentCharacter();
  if (!character) return;
  state.mapper.statusMessage = 'map panned; press Center, C, or Home to follow the current room';
  updateMapperView({
    panX: (Number(character.panX) || 0) + Number(deltaX || 0),
    panY: (Number(character.panY) || 0) + Number(deltaY || 0),
    followPlayer: false
  });
}

function flushMapperWheelZoom() {
  state.mapper.wheelFrame = null;
  const factor = Math.max(0.7, Math.min(1.3, Number(state.mapper.wheelFactor) || 1));
  state.mapper.wheelFactor = 1;
  state.mapper.wheelAnchor = null;
  const character = mapperCurrentCharacter();
  zoomMapper(0, { zoom: (Number(character?.zoom) || 1) * factor });
}

mapperCanvas?.addEventListener('keydown', (event) => {
  const panStep = event.shiftKey ? 72 : 36;
  if (event.key === '+' || event.key === '=') zoomMapper(0.15);
  else if (event.key === '-' || event.key === '_') zoomMapper(-0.15);
  else if (event.key.toLocaleLowerCase() === 'c' || event.key === 'Home') centerMapper();
  else if (event.key === 'ArrowLeft') panMapperBy(-panStep, 0);
  else if (event.key === 'ArrowRight') panMapperBy(panStep, 0);
  else if (event.key === 'ArrowUp') panMapperBy(0, -panStep);
  else if (event.key === 'ArrowDown') panMapperBy(0, panStep);
  else return;
  event.preventDefault();
});
mapperCanvas?.addEventListener('pointerdown', beginMapperPan);
mapperCanvas?.addEventListener('pointermove', continueMapperPan);
mapperCanvas?.addEventListener('pointerup', finishMapperPan);
mapperCanvas?.addEventListener('pointercancel', finishMapperPan);
mapperCanvas?.addEventListener('lostpointercapture', finishMapperPan);
mapperCanvas?.addEventListener('wheel', (event) => {
  event.preventDefault();
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 120 : 1;
  const delta = Math.max(-240, Math.min(240, Number(event.deltaY) * unit));
  state.mapper.wheelFactor *= Math.exp(-delta * 0.0018);
  if (state.mapper.wheelFrame === null) {
    state.mapper.wheelFrame = scheduleFrame(flushMapperWheelZoom);
  }
}, { passive: false });

document.querySelectorAll('[data-knowledge-domain]').forEach((button) => {
  button.addEventListener('click', () => {
    state.knowledge.activeDomain = button.dataset.knowledgeDomain || 'all';
    renderKnowledgeDomainTabs();
    if (knowledgeSearch?.value.trim().length >= 2) scheduleKnowledgeSearch({ immediate: true });
    else setKnowledgeStatus(`Enter at least two characters to search NukeFire ${knowledgeDomainLabel()}.`);
    knowledgeSearch?.focus();
  });
  button.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const tabs = [...document.querySelectorAll('[data-knowledge-domain]')];
    let index = tabs.indexOf(button);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = tabs.length - 1;
    else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[index]?.click();
    tabs[index]?.focus();
  });
});
$('#definition-manager-close')?.addEventListener('click', closeDefinitionManager);
$('#definition-manager-overlay')?.addEventListener('click', (event) => {
  if (event.target === $('#definition-manager-overlay')) closeDefinitionManager();
});
$('#definition-manager-overlay')?.addEventListener('keydown', handleDefinitionManagerKeydown);
$('#definition-manager-category')?.addEventListener('change', (event) => {
  state.definitionManager.category = DEFINITION_MANAGER_CATEGORIES[event.target.value] ? event.target.value : 'aliases';
  state.definitionManager.selectedKey = '';
  $('#definition-manager-search').value = '';
  resetDefinitionManagerEditor();
  $('#definition-manager-search')?.focus();
});
$('#definition-manager-search')?.addEventListener('input', () => {
  state.definitionManager.selectedKey = '';
  $('#definition-manager-form').hidden = true;
  $('#definition-manager-placeholder').hidden = false;
  renderDefinitionManagerList();
});
$('#definition-manager-new')?.addEventListener('click', () => {
  state.definitionManager.selectedKey = '';
  renderDefinitionManagerList();
  configureDefinitionManagerForm(null, 'new');
});
$('#definition-manager-cancel')?.addEventListener('click', resetDefinitionManagerEditor);
$('#definition-manager-duplicate')?.addEventListener('click', () => {
  const record = definitionManagerRecords().find((entry) => definitionManagerKey(entry) === state.definitionManager.selectedKey);
  if (!record) return;
  configureDefinitionManagerForm(record, 'duplicate');
  const key = $('#definition-manager-key');
  key.value = `${definitionManagerKey(record)}-copy`;
  key.select();
});
$('#definition-manager-delete')?.addEventListener('click', () => { void deleteDefinitionManagerRecord(); });
$('#definition-manager-form')?.addEventListener('submit', (event) => { void saveDefinitionManagerRecord(event); });
$('#definition-manager-list')?.addEventListener('keydown', (event) => {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'].includes(event.key)) return;
  const items = [...$('#definition-manager-list').querySelectorAll('[data-definition-key]')];
  if (!items.length) return;
  let index = Math.max(0, items.indexOf(document.activeElement));
  if (event.key === 'Home') index = 0;
  else if (event.key === 'End') index = items.length - 1;
  else if (event.key === 'ArrowDown') index = Math.min(items.length - 1, index + 1);
  else if (event.key === 'ArrowUp') index = Math.max(0, index - 1);
  else if (event.key === 'Enter') {
    event.preventDefault();
    document.activeElement?.click?.();
    return;
  }
  event.preventDefault();
  items[index].focus();
});
knowledgeButton?.addEventListener('click', () => openKnowledgeConsole());
$('#knowledge-close')?.addEventListener('click', closeKnowledgeConsole);
knowledgeOverlay?.addEventListener('click', (event) => {
  if (event.target === knowledgeOverlay) closeKnowledgeConsole();
});
knowledgeOverlay?.addEventListener('keydown', handleKnowledgeKeydown);
knowledgeSearch?.addEventListener('input', () => scheduleKnowledgeSearch());
knowledgeSearch?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    event.stopPropagation();
    scheduleKnowledgeSearch({ immediate: true });
  } else if (event.key === 'ArrowDown' && knowledgeResultsSnapshot().results.length) {
    event.preventDefault();
    event.stopPropagation();
    state.knowledge.selectedIndex = Math.max(0, state.knowledge.selectedIndex);
    renderKnowledgeResults();
    knowledgeResults.querySelector(`[data-knowledge-index="${state.knowledge.selectedIndex}"]`)?.focus();
  }
});
knowledgeLoadMore?.addEventListener('click', () => { void requestKnowledgeMore(); });
$('#knowledge-open-terminal')?.addEventListener('click', () => {
  const entry = knowledgeController()?.entry;
  if (!entry?.terminalCommand) return;
  closeKnowledgeConsole();
  void sendCommand(entry.terminalCommand);
});

function selectedCopyText() {
  const active = document.activeElement;
  if (active && /^(?:INPUT|TEXTAREA)$/u.test(active.tagName) &&
      typeof active.selectionStart === 'number' && typeof active.selectionEnd === 'number' &&
      active.selectionEnd > active.selectionStart) {
    return String(active.value || '').slice(active.selectionStart, active.selectionEnd);
  }
  const browserSelection = String(document.getSelection?.()?.toString?.() || '');
  if (browserSelection) return browserSelection;
  return String(xtermAdapter?.getSelection?.() || '');
}

async function copyCurrentSelection(options = {}) {
  const text = selectedCopyText();
  if (!text) {
    if (options.announceFailure) announce('Nothing is selected to copy.', { force: true });
    return false;
  }
  try {
    if (typeof window.nukefire.writeClipboardText === 'function') {
      const result = await window.nukefire.writeClipboardText(text);
      if (result?.ok === false) throw new Error(result.error || 'Clipboard write failed.');
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      throw new Error('Clipboard access is unavailable.');
    }
    return true;
  } catch (error) {
    appendSystemMessage(`Unable to copy selection: ${error.message || error}`, 'error');
    return false;
  }
}

document.addEventListener('click', refocusCommandAfterTerminalClick, true);
document.addEventListener('contextmenu', refocusCommandAfterTerminalContextMenu, true);
document.addEventListener('keydown', handleKeybindingKeydown, true);

document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  const commandModifier = event.metaKey || event.ctrlKey;
  if (!commandModifier) return;

  if (key === 'c' && !event.shiftKey && !event.altKey) {
    const text = selectedCopyText();
    if (!text) return;
    event.preventDefault();
    void copyCurrentSelection();
  } else if (key === 'k' && !event.shiftKey) {
    event.preventDefault();
    if (state.knowledge.open) closeKnowledgeConsole();
    else openKnowledgeConsole();
  } else if (key === ',') {
    event.preventDefault();
    openPreferences();
  } else if (key === 'f' && !event.shiftKey) {
    event.preventDefault();
    showFind();
  } else if (key === 'l' && event.shiftKey) {
    event.preventDefault();
    readLastLine();
  } else if (key === 'l') {
    event.preventDefault();
    focusCommand();
  } else if (key === 'o' && event.shiftKey) {
    event.preventDefault();
    focusOutput();
  } else if (key === 'v' && event.shiftKey) {
    event.preventDefault();
    readVitals();
  }
}, true);

if (typeof window.nukefire.onSessionEventBatch === 'function') {
  window.nukefire.onSessionEventBatch(handleSessionEventBatch);
  window.nukefire.onSessionsChanged?.(handleSessionsChanged);
} else if (typeof window.nukefire.onSessionEvent === 'function') {
  window.nukefire.onSessionEvent(handleSessionEvent);
  window.nukefire.onSessionsChanged?.(handleSessionsChanged);
} else {
  window.nukefire.onText(appendMudText);
  window.nukefire.onStatus(setStatus);
  window.nukefire.onEcho(setRemoteEcho);
  window.nukefire.onGmcp(applyGmcp);
  window.nukefire.onGmcpState?.(applyGmcpState);
  window.nukefire.onPromptBoundary(applyPromptBoundary);
  window.nukefire.onProtocolWarning?.(applyProtocolWarning);
  window.nukefire.onCharset?.(applyCharset);
  window.nukefire.onTerminalType?.(applyTerminalType);
  window.nukefire.onWindowSize?.(applyWindowSize);
  window.nukefire.onError((message) => appendSystemMessage(message, 'error'));
}
window.nukefire.onMenuConnect(connect);
window.nukefire.onMenuFind(showFind);
window.nukefire.onMenuPreferences?.(openPreferences);
window.nukefire.onMenuEditTinTinScript?.(() => { void handleTinTinEditRequest(activeSessionRecord(), {}); });
window.nukefire.onMenuShowTinTinScriptsFolder?.(() => { void handleShowTinTinScriptsFolder(); });
window.nukefire.onMenuFocusCommand?.(focusCommand);
window.nukefire.onMenuFocusOutput?.(focusOutput);
window.nukefire.onAppFocusChanged?.((focused) => setSelfVoiceAppForeground(focused !== false));
window.nukefire.onAppFocusChanged?.((focused) => setLayoutGalleryAppForeground(focused !== false));
document.addEventListener('pointerdown', unlockAudioCuesFromUserGesture, true);
document.addEventListener('keydown', unlockAudioCuesFromUserGesture, true);
void window.nukefire.isAppFocused?.()
  .then((focused) => setSelfVoiceAppForeground(focused !== false))
  .catch(() => {});
void window.nukefire.isAppFocused?.()
  .then((focused) => setLayoutGalleryAppForeground(focused !== false))
  .catch(() => {});
window.nukefire.onMenuReadLastLine?.(readLastLine);
window.nukefire.onMenuReadVitals?.(readVitals);
window.nukefire.onPanelBoundsChanged?.(handlePanelBoundsChanged);
window.nukefire.onMenuCopy?.(() => { void copyCurrentSelection({ announceFailure: true }); });
window.nukefire.onPanelClosed?.(handlePanelClosed);
window.nukefire.onPanelAction?.(handlePanelAction);

hostInput.value = localStorage.getItem('nukefire.host') || 'tdome.nukefire.org';
portInput.value = localStorage.getItem('nukefire.port') || '4000';
const savedCompressionEnabled = localStorage.getItem('nukefire.compressionEnabled');
state.transport.compressionEnabled = savedCompressionEnabled === null ? true : savedCompressionEnabled !== 'false';
$('#compression-enabled').checked = state.transport.compressionEnabled;
setTextIfChanged(
  $('#mccp-preference'),
  state.transport.compressionEnabled ? 'Enabled on next connection' : 'Disabled on next connection'
);
const savedRepeatLastCommandOnEnter = localStorage.getItem('nukefire.repeatLastCommandOnEnter');
$('#repeat-last-command-on-enter').checked = savedRepeatLastCommandOnEnter === 'true';
const savedShowLastCommandInInput = localStorage.getItem('nukefire.showLastCommandInInput');
$('#show-last-command-in-input').checked = savedShowLastCommandInInput === null
  ? true
  : savedShowLastCommandInInput !== 'false';
const savedBrightCommandInputFocus = localStorage.getItem('nukefire.brightCommandInputFocus') === 'true';
$('#bright-command-input-focus').checked = savedBrightCommandInputFocus;
document.body.dataset.brightCommandInputFocus = String(savedBrightCommandInputFocus);
setClientCommandPrefix(localStorage.getItem('nukefire.commandPrefix'), {
  persist: false,
  sync: false,
  announceChange: false,
  migrateDefinitions: false
});
localStorage.removeItem('nukefire.terminalEngine');
const savedFollowOutput = localStorage.getItem('nukefire.followOutput');
$('#follow-output').checked = savedFollowOutput === null ? true : savedFollowOutput !== 'false';
const savedCompactOutput = localStorage.getItem('nukefire.compactOutput') === 'true';
$('#compact-output').checked = savedCompactOutput;
const savedFontSize = localStorage.getItem('nukefire.fontSize') || '16';
applyTerminalFontSize(savedFontSize, { persist: false, refit: false });
applyFontPreferences(
  localStorage.getItem('nukefire.uiFont') || 'system',
  localStorage.getItem('nukefire.terminalFont') || 'menlo',
  { persist: false }
);
applyInterfaceBrightness(localStorage.getItem('nukefire.interfaceBrightness'), { persist: false });
setAffectsDisplayMode(localStorage.getItem('nukefire.affectsDisplayMode'), { persist: false, rerender: false });
applyPromptDisplayMode(localStorage.getItem('nukefire.promptDisplayMode'), { persist: false, rerender: false });
applyDisplayTextPreferences({
  panelLabels: localStorage.getItem('nukefire.panelLabelMode') || DEFAULT_DISPLAY_TEXT.panelLabels,
  mapperRoomLabels: localStorage.getItem('nukefire.mapperRoomLabelMode') || DEFAULT_DISPLAY_TEXT.mapperRoomLabels
}, { persist: false });
applyDisplayComponents({
  groupVitals: localStorage.getItem('nukefire.showGroupVitals') !== 'false',
  mapperExits: localStorage.getItem('nukefire.showMapperExits') !== 'false',
  gpsNavigator: localStorage.getItem('nukefire.showGpsNavigator') !== 'false',
  mapperMap: localStorage.getItem('nukefire.showMapperMap') !== 'false',
  mapperRoomInfo: localStorage.getItem('nukefire.showMapperRoomInfo') !== 'false'
}, { persist: false });
applyVitalDisplayPreferences({
  mainMode: localStorage.getItem('nukefire.mainVitalsMode') || DEFAULT_VITAL_DISPLAY.mainMode,
  groupMode: localStorage.getItem('nukefire.groupVitalsMode') || DEFAULT_VITAL_DISPLAY.groupMode,
  numberSize: localStorage.getItem('nukefire.vitalsNumberSize') || DEFAULT_VITAL_DISPLAY.numberSize,
  hideSelfInGroup: localStorage.getItem('nukefire.hideSelfInGroupVitals') !== 'false'
}, { persist: false });
renderQuickCommands();
syncPreferenceTabOrientation();
restoreTerminalTheme();
setScreenReaderMode(localStorage.getItem('nukefire.screenReaderMode') === 'true', { announceChange: false });
setReaderWorkspaceEnabled(localStorage.getItem('nukefire.readerWorkspaceEnabled') === 'true', {
  announceChange: false,
  persist: false,
  focus: false
});
setSelfVoiceMuted(localStorage.getItem('nukefire.selfVoiceMuted') === 'true', { announceChange: false, persist: false });
setSelfVoiceForegroundOnly(localStorage.getItem('nukefire.selfVoiceForegroundOnly') !== 'false', { announceChange: false, persist: false });
setSelfVoiceVoiceSettings({
  rate: localStorage.getItem('nukefire.selfVoiceRate'),
  pitch: localStorage.getItem('nukefire.selfVoicePitch'),
  volume: localStorage.getItem('nukefire.selfVoiceVolume'),
  voiceId: localStorage.getItem('nukefire.selfVoiceVoiceId')
}, { announceChange: false, persist: false });
setSelfVoiceGovernorEnabled(localStorage.getItem('nukefire.selfVoiceGovernorEnabled') !== 'false', { announceChange: false });
setSelfVoicePriorityAlertsEnabled(localStorage.getItem('nukefire.selfVoicePriorityAlertsEnabled') !== 'false', { announceChange: false });
setReaderSafetyAlertsEnabled(localStorage.getItem('nukefire.readerSafetyAlertsEnabled') !== 'false', { announceChange: false, persist: false });
setSelfVoiceEnabled(localStorage.getItem('nukefire.selfVoiceEnabled') === 'true', { announceChange: false });
setSelfVoiceFollowMode(localStorage.getItem('nukefire.selfVoiceFollowMode') === 'true', { announceChange: false });
setSelfVoiceInterruptOnCommand(localStorage.getItem('nukefire.selfVoiceInterruptOnCommand') === 'true', { announceChange: false });
setVitalSpeechMode(localStorage.getItem('nukefire.vitalSpeechMode'), { announceChange: false, persist: false });
setAudioCuesVolume(localStorage.getItem('nukefire.audioCuesVolume'), { announceChange: false, persist: false });
setAudioCuesMuted(localStorage.getItem('nukefire.audioCuesMuted') === 'true', { announceChange: false, persist: false });
setAudioCuesForegroundOnly(localStorage.getItem('nukefire.audioCuesForegroundOnly') !== 'false', { announceChange: false, persist: false });
setAudioCuesEnabled(localStorage.getItem('nukefire.audioCuesEnabled') === 'true', { announceChange: false, persist: false });
setSoundpackDisabledEvents(localStorage.getItem('nukefire.soundpackDisabledEvents'), { announceChange: false, persist: false });
state.accessibility.soundpackId = localStorage.getItem('nukefire.soundpackId') || 'builtin';
void loadSoundpackEventCatalog().then(() => inspectSoundpackEditorEvent());
void refreshSoundpacks({ message: 'Installed soundpacks ready.' }).then(async () => {
  const activated = await activateSoundpack(state.accessibility.soundpackId, { announceChange: false });
  if (!activated && state.accessibility.soundpackId !== 'builtin') {
    await activateSoundpack('builtin', { announceChange: false });
    updateSoundpackControls('Saved soundpack was unavailable; built-in NukeFire soundpack restored.');
  }
});
applyCommunicationCueSettings({
  tell: localStorage.getItem('nukefire.communicationCueTell') === 'true',
  auction: localStorage.getItem('nukefire.communicationCueAuction') === 'true',
  gossip: localStorage.getItem('nukefire.communicationCueGossip') === 'true',
  skynet: localStorage.getItem('nukefire.communicationCueSkynet') === 'true',
  ssf: localStorage.getItem('nukefire.communicationCueSsf') === 'true',
  background: localStorage.getItem('nukefire.communicationCuesBackground') === 'true'
}, { announceChange: false, persist: false });
setImportantAnnouncements(localStorage.getItem('nukefire.announceImportant') !== 'false', { announceChange: false });
initializeReaderOnboardingHint();
initializeTerminal({ announceChange: false });
applySessionsSnapshot({
  activeSessionId: 'main',
  sessions: [{
    id: 'main', name: 'Main', role: 'tank',
    host: hostInput.value, port: Number(portInput.value) || 4000,
    status: { state: 'disconnected', message: 'Disconnected' }
  }],
  groups: {}
}, { followActive: false });
renderCommunicationTabs();
renderCommunicationOrderControl();
renderCommunicationMessages();
renderGpsNavigator();
renderAffects();
setMobInspectorAutoOpen(localStorage.getItem('nukefire.mobInspectorAutoOpen') !== 'false', { persist: false });
renderMobInspector();
renderContextDeck();
applyPanelVisibility(DEFAULT_PANEL_VISIBILITY, { persist: false });
applyDockSizes(DEFAULT_DOCK_SIZES, { persist: false });
setStatus({ state: 'disconnected', message: 'Disconnected' }, { outputTransition: false });
renderVitals();
renderOpponentVitals();
renderGroupVitals();
renderNukeFireState();
void syncClientPreferences();
scheduleTerminalSizeUpdate();
renderLayoutGallery();
startLayoutGalleryRotation();

if (typeof ResizeObserver === 'function') {
  const terminalResizeObserver = new ResizeObserver(scheduleTerminalSizeUpdate);
  terminalResizeObserver.observe(terminalOutputHost || xtermOutput);
}
terminalOutputHost?.addEventListener('keydown', (event) => {
  handleTerminalPageNavigationKey(event);
}, true);
terminalOutputHost?.addEventListener('focus', () => focusOutput());
document.querySelector('a[href="#output"]')?.addEventListener('click', (event) => {
  event.preventDefault();
  focusOutput();
});

window.addEventListener('resize', () => {
  syncPreferenceTabOrientation();
  applyDockSizes(state.workspace.activeDockSizes, { persist: false });
  positionOpenPanelMenu();
  scheduleTerminalSizeUpdate();
});
document.addEventListener('scroll', positionOpenPanelMenu, true);

void Promise.resolve(window.nukefire.getGmcpState?.()).then((snapshot) => {
  if (snapshot) applyGmcpState(snapshot);
});

appendSystemMessage('Ready. Press Connect to enter NukeFire.');
void bootstrapSessions();
void bootstrapPersistentSettings();
void bootstrapMapper();

// Beta.55 lab: persistent per-character/shared-workspace pane heights.
function workspacePanelHeightOverrides() {
  const key = workspacePersistenceCharacterKey();
  if (!key) {
    return normalizeWorkspacePanelHeights(state.workspace.defaultPanelHeights);
  }
  return normalizeWorkspacePanelHeights(state.workspace.characters[key]?.panelHeights);
}

function storeWorkspacePanelHeightOverrides(heights) {
  const normalized = normalizeWorkspacePanelHeights(heights);
  const key = workspacePersistenceCharacterKey();
  if (!key) {
    state.workspace.defaultPanelHeights = normalized;
  } else {
    const current = state.workspace.characters[key] || {};
    state.workspace.characters[key] = {
      ...current,
      name: current.name || state.workspace.currentCharacterName || key,
      panelHeights: normalized
    };
  }
  flushWorkspaceGeometrySaveNow();
}

function persistWorkspacePanelHeight(panelKey, height) {
  const key = String(panelKey || '').trim();
  const normalizedHeight = window.NukeFirePanelStackResize?.normalizeHeight?.(height);
  if (!key || normalizedHeight === null || normalizedHeight === undefined) return;
  const heights = workspacePanelHeightOverrides();
  heights[key] = normalizedHeight;
  storeWorkspacePanelHeightOverrides(heights);
}

function resetWorkspacePanelHeight(panelKey) {
  const key = String(panelKey || '').trim();
  if (!key) return;
  const heights = workspacePanelHeightOverrides();
  delete heights[key];
  storeWorkspacePanelHeightOverrides(heights);
}

function resetWorkspacePanelHeights() {
  storeWorkspacePanelHeightOverrides({});
}

function legacyPanelHeightScopeKey() {
  if (state.workspace.sharedCrewWorkspace) return '__shared_crew_workspace__';
  return state.workspace.currentCharacterKey || '__default__';
}

function migrateLegacyPanelHeightsForCurrentScope() {
  if (Object.keys(workspacePanelHeightOverrides()).length) return false;

  try {
    const raw = JSON.parse(localStorage.getItem('nukefire.panelHeights.v2') || '{}');
    const workspaces = raw?.workspaces && typeof raw.workspaces === 'object'
      ? raw.workspaces
      : {};
    const legacyKey = legacyPanelHeightScopeKey();
    const migrated = normalizeWorkspacePanelHeights(workspaces[legacyKey]);
    if (!Object.keys(migrated).length) return false;

    storeWorkspacePanelHeightOverrides(migrated);
    delete workspaces[legacyKey];
    if (Object.keys(workspaces).length) {
      localStorage.setItem('nukefire.panelHeights.v2', JSON.stringify({
        version: Number(raw?.version) || 2,
        workspaces
      }));
    } else {
      localStorage.removeItem('nukefire.panelHeights.v2');
    }
    return true;
  } catch {
    return false;
  }
}

let panelResizeCommunicationsFrame = null;

function schedulePanelResizeCommunicationsRefresh() {
  if (panelResizeCommunicationsFrame !== null) return;
  panelResizeCommunicationsFrame = scheduleFrame(() => {
    panelResizeCommunicationsFrame = null;
    if (!communicationFollowsLiveEdge() || isPanelPoppedOut('communications')) return;
    const container = $('#communications-messages');
    if (!container || state.workspace.activePanels.communications === false) return;
    returnCommunicationsToLiveEdge(container, communicationMessageOrder());
  });
}

const panelStackResizeController = window.NukeFirePanelStackResize?.install?.({
  docks: ['#dock-left', '#dock-right', '.dock-outer-right'],
  getPanelHeights: activePanelHeights,
  savePanelHeight: persistWorkspacePanelHeight,
  resetPanelHeight: resetWorkspacePanelHeight,
  resetAllPanelHeights: resetWorkspacePanelHeights,
  onResize: () => {
    scheduleTerminalSizeUpdate();
    schedulePanelResizeCommunicationsRefresh();
    scheduleMapperRender();
  },
  announce: (message) => announce(message, { force: true })
});

window.NukeFirePanelHeightController = panelStackResizeController || null;
migrateLegacyPanelHeightsForCurrentScope();
