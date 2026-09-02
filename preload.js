'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

function subscribeSessionEvents(callback) {
  const singleListener = (_event, payload) => callback(payload);
  const batchListener = (_event, payload) => {
    const events = Array.isArray(payload) ? payload : [];
    let firstError = null;
    for (const event of events) {
      try {
        callback(event);
      } catch (error) {
        if (!firstError) firstError = error;
      }
    }
    if (firstError) throw firstError;
  };
  ipcRenderer.on('session:event', singleListener);
  ipcRenderer.on('session:event-batch', batchListener);
  return () => {
    ipcRenderer.removeListener('session:event', singleListener);
    ipcRenderer.removeListener('session:event-batch', batchListener);
  };
}

function subscribeSessionEventBatches(callback) {
  const singleListener = (_event, payload) => callback([payload]);
  const batchListener = (_event, payload) => callback(Array.isArray(payload) ? payload : []);
  ipcRenderer.on('session:event', singleListener);
  ipcRenderer.on('session:event-batch', batchListener);
  return () => {
    ipcRenderer.removeListener('session:event', singleListener);
    ipcRenderer.removeListener('session:event-batch', batchListener);
  };
}

contextBridge.exposeInMainWorld('nukefire', {
  listSessions: () => ipcRenderer.invoke('sessions:list'),
  createSession: (options) => ipcRenderer.invoke('sessions:create', options),
  setTinTinStartupTemplate: (definitions) => ipcRenderer.invoke('sessions:set-startup-template', definitions),
  updateSession: (sessionId, changes) => ipcRenderer.invoke('sessions:update', sessionId, changes),
  removeSession: (sessionId) => ipcRenderer.invoke('sessions:remove', sessionId),
  setActiveSession: (sessionId) => ipcRenderer.invoke('sessions:set-active', sessionId),
  restoreSessions: (snapshot) => ipcRenderer.invoke('sessions:restore', snapshot),
  replaceSessionDefinitions: (sessionId, definitions) => definitions === undefined && sessionId && typeof sessionId === 'object'
    ? ipcRenderer.invoke('sessions:replace-definitions', sessionId)
    : ipcRenderer.invoke('sessions:replace-definitions', sessionId, definitions),
  connectSession: (sessionId, options) => ipcRenderer.invoke('sessions:connect', sessionId, options),
  disconnectSession: (sessionId) => ipcRenderer.invoke('sessions:disconnect', sessionId),
  routeCommand: (sessionId, command) => ipcRenderer.invoke('sessions:route-command', sessionId, command),
  executeLuaLab: (sessionId, script) => ipcRenderer.invoke('lua-lab:execute', sessionId, script),
  sendSessionGmcp: (sessionId, packageName, body) => ipcRenderer.invoke('sessions:send-gmcp', sessionId, packageName, body),
  setSessionTerminalSize: (sessionId, size) => ipcRenderer.invoke('sessions:set-terminal-size', sessionId, size),
  setSessionClientPreferences: (sessionId, preferences) => ipcRenderer.invoke('sessions:set-client-preferences', sessionId, preferences),
  getPipelineDebug: (sessionId) => ipcRenderer.invoke('sessions:get-pipeline-debug', sessionId),
  setPipelineDebug: (sessionId, settings) => ipcRenderer.invoke('sessions:set-pipeline-debug', sessionId, settings),
  clearPipelineDebug: (sessionId) => ipcRenderer.invoke('sessions:clear-pipeline-debug', sessionId),
  getSessionGmcpState: (sessionId) => ipcRenderer.invoke('sessions:get-gmcp-state', sessionId),
  connect: (options) => ipcRenderer.invoke('mud:connect', options),
  disconnect: () => ipcRenderer.invoke('mud:disconnect'),
  send: (command) => ipcRenderer.invoke('mud:send', command),
  sendGmcp: (packageName, body) => ipcRenderer.invoke('mud:send-gmcp', packageName, body),
  setTerminalSize: (size) => ipcRenderer.invoke('mud:set-terminal-size', size),
  setClientPreferences: (preferences) => ipcRenderer.invoke('mud:set-client-preferences', preferences),
  getGmcpState: () => ipcRenderer.invoke('mud:get-gmcp-state'),
  loadSettings: (legacy) => ipcRenderer.invoke('settings:load', legacy),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  getSettingsInfo: () => ipcRenderer.invoke('settings:get-info'),
  isAppFocused: () => ipcRenderer.invoke('app:is-focused'),
  readTinTinScript: (requested) => ipcRenderer.invoke('scripts:read', requested),
  writeTinTinScript: (requested, content) => ipcRenderer.invoke('scripts:write', requested, content),
  getTinTinScriptsInfo: () => ipcRenderer.invoke('scripts:get-info'),
  editTinTinScript: (requested) => ipcRenderer.invoke('scripts:edit', requested),
  showTinTinScriptsFolder: () => ipcRenderer.invoke('scripts:show-folder'),
  listSoundpacks: () => ipcRenderer.invoke('soundpacks:list'),
  importSoundpack: () => ipcRenderer.invoke('soundpacks:import'),
  loadSoundpack: (id) => ipcRenderer.invoke('soundpacks:load', id),
  getSoundpackEvents: () => ipcRenderer.invoke('soundpacks:events'),
  describeSoundpack: (id) => ipcRenderer.invoke('soundpacks:describe', id),
  duplicateSoundpack: (request) => ipcRenderer.invoke('soundpacks:duplicate', request),
  assignSoundpackEvent: (request) => ipcRenderer.invoke('soundpacks:assign-event', request),
  clearSoundpackEvent: (request) => ipcRenderer.invoke('soundpacks:clear-event', request),
  updateSoundpackEvent: (request) => ipcRenderer.invoke('soundpacks:update-event', request),
  exportSoundpack: (id) => ipcRenderer.invoke('soundpacks:export', id),
  importClientPreset: () => ipcRenderer.invoke('client-presets:import'),
  exportClientPreset: (preset) => ipcRenderer.invoke('client-presets:export', preset),
  writeClipboardText: (value) => ipcRenderer.invoke('clipboard:write-text', value),
  openExternalLink: (value) => ipcRenderer.invoke('links:open-external', value),
  loadMap: () => ipcRenderer.invoke('map:load'),
  saveMap: (mapData) => ipcRenderer.invoke('map:save', mapData),
  getMapInfo: () => ipcRenderer.invoke('map:get-info'),
  openPanelWindow: (request) => ipcRenderer.invoke('panel:open', request),
  closePanelWindow: (panelId) => ipcRenderer.invoke('panel:close', panelId),
  publishPanelState: (panelId, payload) => ipcRenderer.invoke('panel:publish-state', panelId, payload),
  onSessionEvent: (callback) => subscribeSessionEvents(callback),
  onSessionEventBatch: (callback) => subscribeSessionEventBatches(callback),
  onSessionsChanged: (callback) => subscribe('session:list', callback),
  onText: (callback) => subscribe('mud:text', callback),
  onStatus: (callback) => subscribe('mud:status', callback),
  onEcho: (callback) => subscribe('mud:echo', callback),
  onGmcp: (callback) => subscribe('mud:gmcp', callback),
  onGmcpState: (callback) => subscribe('mud:gmcp-state', callback),
  onPromptBoundary: (callback) => subscribe('mud:boundary', callback),
  onProtocolWarning: (callback) => subscribe('mud:protocol-warning', callback),
  onOptionState: (callback) => subscribe('mud:option-state', callback),
  onCharset: (callback) => subscribe('mud:charset', callback),
  onTerminalType: (callback) => subscribe('mud:terminal-type', callback),
  onWindowSize: (callback) => subscribe('mud:window-size', callback),
  onError: (callback) => subscribe('mud:error', callback),
  onMenuConnect: (callback) => subscribe('menu:connect', callback),
  onMenuFind: (callback) => subscribe('menu:find', callback),
  onMenuCopy: (callback) => subscribe('menu:copy', callback),
  onMenuPreferences: (callback) => subscribe('menu:preferences', callback),
  onMenuEditTinTinScript: (callback) => subscribe('menu:edit-tintin-script', callback),
  onMenuShowTinTinScriptsFolder: (callback) => subscribe('menu:show-tintin-scripts-folder', callback),
  onMenuFocusCommand: (callback) => subscribe('menu:focus-command', callback),
  onMenuFocusOutput: (callback) => subscribe('menu:focus-output', callback),
  onMenuReadLastLine: (callback) => subscribe('menu:read-last-line', callback),
  onMenuReadVitals: (callback) => subscribe('menu:read-vitals', callback),
  onAppFocusChanged: (callback) => subscribe('app:focus-changed', callback),
  onPanelBoundsChanged: (callback) => subscribe('panel:bounds-changed', callback),
  onPanelClosed: (callback) => subscribe('panel:closed', callback),
  onPanelAction: (callback) => subscribe('panel:action', callback)
});
