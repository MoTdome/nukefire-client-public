'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, screen, shell } = require('electron');
const { SessionManager } = require('./src/session-manager');
const { createMicrotaskBatcher } = require('./src/session-event-batcher');
const { SettingsStore } = require('./src/settings-store');
const { MapStore } = require('./src/map-store');
const { ScriptStore } = require('./src/script-store');
const { SoundpackStore } = require('./src/soundpack-store');
const clientPresets = require('./src/client-preset');
const { LogStore } = require('./src/log-store');
const { LuaLabService } = require('./src/lua-lab-service');
const { mainWindowBoundsForWorkArea } = require('./src/window-layout');
const {
  normalizeMainWindowState,
  windowStateForSave
} = require('./src/main-window-state');
const {
  POPOUT_PANEL_IDS,
  POPOUT_SIZE_LIMITS,
  panelWindowDefinition,
  panelWindowPresetBounds,
  normalizePopoutBounds
} = require('./src/panel-window-state');

const APP_ICON_PATH = path.join(__dirname, 'build', 'icon.png');

let mainWindow = null;
let sessionManager = null;
let settingsStore = null;
let mapStore = null;
let scriptStore = null;
let soundpackStore = null;
let logStore = null;
let luaLabService = null;
const panelWindows = new Map();
const panelWindowStates = new Map();
let isQuitting = false;
let mainWindowStateSaveTimer = null;
let appFocusPublishTimer = null;
let sessionEventBatcher = null;

app.setAppUserModelId('org.nukefire.client');

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

const BATCHABLE_SESSION_EVENT_TYPES = new Set([
  'text',
  'communication-text',
  'gmcp',
  'boundary'
]);

function publishSessionEvent(event) {
  if (!sessionEventBatcher || !BATCHABLE_SESSION_EVENT_TYPES.has(String(event?.type || ''))) {
    sessionEventBatcher?.flush();
    sendToRenderer('session:event', event);
    return;
  }
  sessionEventBatcher.enqueue(event);
}

function publishSessionList(snapshot) {
  sessionEventBatcher?.flush();
  sendToRenderer('session:list', snapshot);
}

function appHasFocusedWindow() {
  return Boolean(BrowserWindow.getFocusedWindow());
}

function publishAppFocusState() {
  sendToRenderer('app:focus-changed', appHasFocusedWindow());
}

function scheduleAppFocusStatePublish() {
  if (appFocusPublishTimer !== null) clearTimeout(appFocusPublishTimer);
  appFocusPublishTimer = setTimeout(() => {
    appFocusPublishTimer = null;
    publishAppFocusState();
  }, 0);
}

function installZoomShortcuts(window) {
  window.webContents.on('before-input-event', (event, input = {}) => {
    if (input.type && input.type !== 'keyDown') return;
    if (!(input.control || input.meta) || input.alt) return;

    const key = String(input.key || '').toLowerCase();
    const code = String(input.code || '');
    const zoomIn = key === '+' || key === '=' || code === 'NumpadAdd';
    const zoomOut = key === '-' || key === '_' || code === 'NumpadSubtract';
    const reset = key === '0' || code === 'Numpad0';
    if (!zoomIn && !zoomOut && !reset) return;

    event.preventDefault();
    if (reset) {
      window.webContents.setZoomFactor(1);
      return;
    }
    const current = Number(window.webContents.getZoomFactor()) || 1;
    const next = Math.max(0.5, Math.min(3, current + (zoomIn ? 0.1 : -0.1)));
    window.webContents.setZoomFactor(Number(next.toFixed(2)));
  });
}

const SUPPORTED_POPOUT_PANELS = new Set(POPOUT_PANEL_IDS);

function normalizeExternalLink(value) {
  const source = String(value || '').trim();
  if (!source || source.length > 4096 || /[\u0000-\u001f\u007f]/u.test(source)) return '';
  let parsed;
  try {
    parsed = new URL(source);
  } catch {
    return '';
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return '';
  if (parsed.username || parsed.password) return '';
  return parsed.href;
}


function sendToPanelWindow(panelId, channel, payload) {
  const panelWindow = panelWindows.get(panelId);
  if (panelWindow && !panelWindow.isDestroyed()) {
    panelWindow.webContents.send(channel, payload);
  }
}

function normalizeRequestedBounds(input = {}) {
  const normalized = normalizePopoutBounds(input, {
    x: null, y: null, width: 680, height: 560
  });
  const width = normalized.width;
  const height = normalized.height;
  const hasCoordinates = Number.isFinite(Number(input.x)) && Number.isFinite(Number(input.y));
  const reference = hasCoordinates
    ? { x: Math.trunc(Number(input.x)), y: Math.trunc(Number(input.y)), width: 1, height: 1 }
    : (mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : { x: 0, y: 0, width: 1, height: 1 });
  const display = screen.getDisplayMatching(reference) || screen.getPrimaryDisplay();
  const workArea = display.workArea;
  const safeWidth = Math.max(1, Math.min(width, workArea.width));
  const safeHeight = Math.max(1, Math.min(height, workArea.height));
  const centeredX = Math.round(workArea.x + (workArea.width - safeWidth) / 2);
  const centeredY = Math.round(workArea.y + (workArea.height - safeHeight) / 2);
  const requestedX = hasCoordinates ? Math.trunc(Number(input.x)) : centeredX;
  const requestedY = hasCoordinates ? Math.trunc(Number(input.y)) : centeredY;
  return {
    x: Math.max(workArea.x, Math.min(requestedX, workArea.x + workArea.width - safeWidth)),
    y: Math.max(workArea.y, Math.min(requestedY, workArea.y + workArea.height - safeHeight)),
    width: safeWidth,
    height: safeHeight
  };
}

function resizePanelWindow(panelId, panelWindow, request = {}) {
  const mode = String(request.mode || '').trim().toLowerCase();
  const current = panelWindowBounds(panelWindow);
  const display = screen.getDisplayMatching({ ...current, width: 1, height: 1 }) || screen.getPrimaryDisplay();
  let bounds;

  if (mode === 'fill-display') {
    bounds = { ...display.workArea };
  } else {
    let requestedSize = null;
    if (mode === 'custom') {
      requestedSize = normalizePopoutBounds({
        width: request.width,
        height: request.height
      }, current);
    } else {
      requestedSize = panelWindowPresetBounds(mode, panelId);
    }
    if (!requestedSize) {
      return { ok: false, panelId, error: `Unknown panel window size mode: ${mode || 'none'}` };
    }
    bounds = normalizeRequestedBounds({
      x: current.x,
      y: current.y,
      width: requestedSize.width,
      height: requestedSize.height
    });
  }

  panelWindow.setBounds(bounds, false);
  panelWindow.__lastBounds = panelWindowBounds(panelWindow);
  notifyPanelBounds(panelId, panelWindow);
  return { ok: true, panelId, mode, bounds: panelWindow.__lastBounds };
}

function panelWindowBounds(panelWindow) {
  const bounds = panelWindow.getBounds();
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height
  };
}

function notifyPanelBounds(panelId, panelWindow) {
  if (panelWindow.isDestroyed()) return;
  const bounds = panelWindowBounds(panelWindow);
  if (mainWindow && !mainWindow.isDestroyed()) {
    sendToRenderer('panel:bounds-changed', { panelId, bounds });
  }
  sendToPanelWindow(panelId, 'panel:bounds', bounds);
}

function createPanelWindow(panelId, options = {}) {
  if (!SUPPORTED_POPOUT_PANELS.has(panelId)) {
    throw new Error(`Unsupported pop-out panel: ${panelId}`);
  }

  const existing = panelWindows.get(panelId);
  const bounds = normalizeRequestedBounds(options.bounds);
  if (existing && !existing.isDestroyed()) {
    existing.setBounds(bounds, false);
    if (options.focus !== false) {
      existing.show();
      existing.focus();
    }
    return existing;
  }

  const panelWindow = new BrowserWindow({
    ...bounds,
    minWidth: POPOUT_SIZE_LIMITS.width.minimum,
    minHeight: POPOUT_SIZE_LIMITS.height.minimum,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    title: `NukeFire Client — ${panelWindowDefinition(panelId)?.label || 'Panel'}`,
    icon: APP_ICON_PATH,
    backgroundColor: '#090b0d',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'popout-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  panelWindows.set(panelId, panelWindow);
  let boundsTimer = null;
  const queueBoundsNotification = () => {
    clearTimeout(boundsTimer);
    boundsTimer = setTimeout(() => notifyPanelBounds(panelId, panelWindow), 180);
  };

  panelWindow.on('move', queueBoundsNotification);
  panelWindow.on('resize', queueBoundsNotification);
  panelWindow.once('ready-to-show', () => {
    if (options.focus === false) panelWindow.showInactive();
    else panelWindow.show();
  });
  panelWindow.webContents.on('did-finish-load', () => {
    const latest = panelWindowStates.get(panelId);
    if (latest) sendToPanelWindow(panelId, 'panel:state', latest);
  });
  panelWindow.on('closed', () => {
    clearTimeout(boundsTimer);
    panelWindows.delete(panelId);
    if (!isQuitting && mainWindow && !mainWindow.isDestroyed()) {
      sendToRenderer('panel:closed', { panelId, bounds: panelWindow.__lastBounds || bounds });
    }
  });
  panelWindow.on('close', () => {
    if (!panelWindow.isDestroyed()) panelWindow.__lastBounds = panelWindowBounds(panelWindow);
  });

  panelWindow.loadFile(path.join(__dirname, 'renderer', 'popout.html'), {
    query: { panel: panelId }
  });
  return panelWindow;
}

function closePanelWindow(panelId) {
  const panelWindow = panelWindows.get(panelId);
  if (panelWindow && !panelWindow.isDestroyed()) panelWindow.close();
}

async function editTinTinScript(requestedValue = '') {
  if (!scriptStore) return { ok: false, error: 'TinTin script storage is not ready.' };
  await scriptStore.ensureDirectory();
  const requested = String(requestedValue || '').trim();
  let resolved;

  if (requested) {
    resolved = await scriptStore.resolve(requested);
  } else {
    const dialogOptions = {
      title: 'Edit TinTin Script',
      defaultPath: scriptStore.directory,
      buttonLabel: 'Edit Script',
      properties: ['openFile'],
      filters: [
        { name: 'TinTin Scripts', extensions: ['tin', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    };
    const selection = mainWindow && !mainWindow.isDestroyed()
      ? await dialog.showOpenDialog(mainWindow, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions);
    if (selection.canceled || !selection.filePaths?.[0]) {
      return { ok: false, canceled: true, info: scriptStore.getInfo() };
    }
    resolved = await scriptStore.resolveSelectedPath(selection.filePaths[0]);
  }

  if (!resolved?.ok) return { ...resolved, info: resolved?.info || scriptStore.getInfo() };
  const error = await shell.openPath(resolved.filepath);
  if (error) {
    return {
      ok: false,
      error: `Unable to open ${resolved.filename}: ${error}`,
      filename: resolved.filename,
      info: scriptStore.getInfo()
    };
  }
  return {
    ok: true,
    mode: 'edit',
    filename: resolved.filename,
    filepath: resolved.filepath,
    info: scriptStore.getInfo()
  };
}

async function showTinTinScriptsFolder() {
  if (!scriptStore) return { ok: false, error: 'TinTin script storage is not ready.' };
  const directory = await scriptStore.ensureDirectory();
  const error = await shell.openPath(directory);
  if (error) {
    return {
      ok: false,
      error: `Unable to open the TinTin Scripts folder: ${error}`,
      info: scriptStore.getInfo()
    };
  }
  return { ok: true, mode: 'folder', info: scriptStore.getInfo() };
}

function buildApplicationMenu() {
  const template = [
    ...(process.platform === 'darwin'
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            {
              label: 'Preferences…',
              accelerator: 'CmdOrCtrl+,',
              click: () => sendToRenderer('menu:preferences')
            },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        }]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Connect',
          accelerator: 'CmdOrCtrl+K',
          click: () => sendToRenderer('menu:connect')
        },
        {
          label: 'Disconnect',
          accelerator: 'CmdOrCtrl+Shift+K',
          click: () => sessionManager?.disconnectSession(sessionManager.activeSessionId, 'Disconnected by user.')
        },
        { type: 'separator' },
        ...(process.platform !== 'darwin'
          ? [{
              label: 'Preferences…',
              accelerator: 'CmdOrCtrl+,',
              click: () => sendToRenderer('menu:preferences')
            }, { type: 'separator' }]
          : []),
        {
          label: 'TinTin Scripts',
          submenu: [
            {
              label: 'Edit TinTin Script…',
              click: () => sendToRenderer('menu:edit-tintin-script')
            },
            {
              label: 'Show Scripts Folder',
              click: () => sendToRenderer('menu:show-tintin-scripts-folder')
            }
          ]
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          click: () => sendToRenderer('menu:copy')
        },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find in Output',
          accelerator: 'CmdOrCtrl+F',
          click: () => sendToRenderer('menu:find')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Accessibility',
      submenu: [
        {
          label: 'Focus Command Line',
          accelerator: 'CmdOrCtrl+L',
          click: () => sendToRenderer('menu:focus-command')
        },
        {
          label: 'Review Game Output',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => sendToRenderer('menu:focus-output')
        },
        { type: 'separator' },
        {
          label: 'Read Last Line',
          accelerator: 'CmdOrCtrl+Shift+L',
          click: () => sendToRenderer('menu:read-last-line')
        },
        {
          label: 'Read Vitals',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => sendToRenderer('menu:read-vitals')
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin'
          ? [{ type: 'separator' }, { role: 'front' }]
          : [{ role: 'close' }])
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}


function mainWindowStatePath() {
  return path.join(app.getPath('userData'), 'main-window-state.json');
}

function loadMainWindowState() {
  try {
    const raw = fs.readFileSync(mainWindowStatePath(), 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function saveMainWindowState(window) {
  if (!window || window.isDestroyed()) return false;
  try {
    const bounds = typeof window.getNormalBounds === 'function'
      ? window.getNormalBounds()
      : window.getBounds();
    const state = windowStateForSave(bounds, window.isMaximized?.() === true);
    const target = mainWindowStatePath();
    const temporary = `${target}.tmp`;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, target);
    return true;
  } catch (error) {
    console.warn('Unable to save NukeFire main-window geometry.', error);
    return false;
  }
}

function scheduleMainWindowStateSave(window) {
  if (!window || window.isDestroyed()) return;
  if (mainWindowStateSaveTimer !== null) clearTimeout(mainWindowStateSaveTimer);
  mainWindowStateSaveTimer = setTimeout(() => {
    mainWindowStateSaveTimer = null;
    saveMainWindowState(window);
  }, 160);
}

function initialMainWindowState() {
  const saved = loadMainWindowState();
  if (!saved?.bounds) return null;

  const requested = saved.bounds;
  const display = screen.getDisplayMatching({
    x: Number(requested.x) || 0,
    y: Number(requested.y) || 0,
    width: Math.max(1, Number(requested.width) || 1),
    height: Math.max(1, Number(requested.height) || 1)
  }) || screen.getPrimaryDisplay();

  return normalizeMainWindowState(saved, display?.workArea || {});
}

function createWindow() {
  const savedWindowState = initialMainWindowState();
  const display = screen.getPrimaryDisplay();
  const fallbackBounds = mainWindowBoundsForWorkArea(display?.workArea || {});
  const initialBounds = savedWindowState
    ? {
        ...savedWindowState.bounds,
        minWidth: Math.min(960, savedWindowState.bounds.width),
        minHeight: Math.min(620, savedWindowState.bounds.height)
      }
    : fallbackBounds;

  mainWindow = new BrowserWindow({
    ...initialBounds,
    title: 'NukeFire Client',
    icon: APP_ICON_PATH,
    backgroundColor: '#090b0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  installZoomShortcuts(mainWindow);

  const sessionEventWindow = mainWindow;
  sessionEventBatcher = createMicrotaskBatcher((events) => {
    if (mainWindow !== sessionEventWindow || sessionEventWindow.isDestroyed()) return;
    sessionEventWindow.webContents.send('session:event-batch', events);
  });

  sessionManager = new SessionManager({
    handlers: {
      onEvent: (event) => publishSessionEvent(event),
      onLogAppend: (request) => logStore ? logStore.append(request?.filename, request?.text) : Promise.resolve({ ok: false, error: 'Log storage is not ready.' }),
      onLogOverwrite: (request) => logStore ? logStore.overwrite(request?.filename) : Promise.resolve({ ok: false, error: 'Log storage is not ready.' }),
      onTinTinTextRead: (request) => scriptStore ? scriptStore.read(request?.requested) : Promise.resolve({ ok: false, error: 'TinTin text storage is not ready.' }),
      onTinTinTextWrite: (request) => scriptStore ? scriptStore.write(request?.requested, request?.content) : Promise.resolve({ ok: false, error: 'TinTin text storage is not ready.' }),
      onSessionsChanged: (snapshot) => publishSessionList(snapshot)
    }
  });
  sessionManager.createSession({
    id: 'main',
    name: 'Main',
    role: 'tank',
    host: 'tdome.nukefire.org',
    port: 4000
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  if (savedWindowState?.maximized) {
    mainWindow.once('ready-to-show', () => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.maximize();
    });
  }

  for (const eventName of ['resize', 'move', 'maximize', 'unmaximize']) {
    mainWindow.on(eventName, () => scheduleMainWindowStateSave(mainWindow));
  }

  mainWindow.on('close', () => {
    if (mainWindowStateSaveTimer !== null) {
      clearTimeout(mainWindowStateSaveTimer);
      mainWindowStateSaveTimer = null;
    }
    saveMainWindowState(mainWindow);
  });

  mainWindow.on('closed', () => {
    for (const panelWindow of panelWindows.values()) {
      if (!panelWindow.isDestroyed()) panelWindow.close();
    }
    if (sessionManager) {
      for (const session of sessionManager.sessions.values()) sessionManager.fireTinTinEvent(session, 'PROGRAM TERMINATION', []);
      sessionManager.disconnectAll('Client window closed.');
    }
    sessionManager = null;
    sessionEventBatcher?.flush();
    sessionEventBatcher = null;
    if (luaLabService) {
      void luaLabService.close();
      luaLabService = null;
    }
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(APP_ICON_PATH);
  }

  settingsStore = new SettingsStore({
    baseDirectory: app.getPath('userData')
  });
  mapStore = new MapStore({
    baseDirectory: app.getPath('userData')
  });
  scriptStore = new ScriptStore({
    documentsDirectory: app.getPath('documents')
  });
  soundpackStore = new SoundpackStore({
    directory: path.join(app.getPath('userData'), 'Soundpacks')
  });
  logStore = new LogStore({
    documentsDirectory: app.getPath('documents')
  });
  try {
    await scriptStore.ensureDirectory();
    await soundpackStore.ensureDirectory();
    await logStore.ensureDirectory();
  } catch (error) {
    console.warn('Unable to prepare the TinTin Scripts/Logs folders during startup.', error);
  }

  buildApplicationMenu();
  createWindow();

  app.on('browser-window-focus', () => {
    if (appFocusPublishTimer !== null) {
      clearTimeout(appFocusPublishTimer);
      appFocusPublishTimer = null;
    }
    publishAppFocusState();
  });
  app.on('browser-window-blur', scheduleAppFocusStatePublish);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


ipcMain.handle('app:is-focused', async () => appHasFocusedWindow());

ipcMain.handle('links:open-external', async (_event, value) => {
  const url = normalizeExternalLink(value);
  if (!url) return { ok: false, error: 'Only safe HTTP and HTTPS links can be opened.' };
  try {
    await shell.openExternal(url, { activate: true });
    return { ok: true, url };
  } catch (error) {
    return { ok: false, error: error.message || String(error) };
  }
});

ipcMain.handle('clipboard:write-text', async (_event, value) => {
  const text = String(value ?? '').slice(0, 5_000_000);
  if (!text) return { ok: false, error: 'Nothing is selected to copy.' };
  clipboard.writeText(text);
  return { ok: true, length: text.length };
});

ipcMain.handle('settings:load', async (_event, legacy) => {
  if (!settingsStore) throw new Error('Settings are not ready.');
  const settings = await settingsStore.load({ legacy });
  return {
    ok: true,
    settings,
    info: settingsStore.getInfo()
  };
});

ipcMain.handle('settings:save', async (_event, settings) => {
  if (!settingsStore) throw new Error('Settings are not ready.');
  // The renderer only consumes the acknowledgement metadata below. Avoid
  // cloning the complete normalized settings tree a second time just to discard it.
  await settingsStore.save(settings, { returnSnapshot: false });
  return { ok: true, info: settingsStore.getInfo() };
});

ipcMain.handle('settings:get-info', async () => {
  if (!settingsStore) throw new Error('Settings are not ready.');
  return {
    ok: true,
    info: settingsStore.getInfo()
  };
});

ipcMain.handle('scripts:read', async (_event, requested) => {
  if (!scriptStore) throw new Error('TinTin script storage is not ready.');
  return scriptStore.read(requested);
});

ipcMain.handle('scripts:write', async (_event, requested, content) => {
  if (!scriptStore) throw new Error('TinTin script storage is not ready.');
  return scriptStore.write(requested, content);
});

ipcMain.handle('scripts:get-info', async () => {
  if (!scriptStore) throw new Error('TinTin script storage is not ready.');
  return { ok: true, files: await scriptStore.list(), info: scriptStore.getInfo() };
});

ipcMain.handle('scripts:edit', async (_event, requested) => {
  return editTinTinScript(requested);
});

ipcMain.handle('scripts:show-folder', async () => {
  return showTinTinScriptsFolder();
});

ipcMain.handle('soundpacks:list', async () => {
  if (!soundpackStore) throw new Error('Soundpack storage is not ready.');
  return soundpackStore.list();
});

ipcMain.handle('soundpacks:import', async () => {
  if (!soundpackStore) throw new Error('Soundpack storage is not ready.');
  const options = {
    title: 'Import NukeFire Soundpack',
    buttonLabel: 'Import Soundpack',
    properties: ['openFile'],
    filters: [
      { name: 'NukeFire Soundpacks', extensions: ['nfsp', 'zip'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  };
  const selection = mainWindow && !mainWindow.isDestroyed()
    ? await dialog.showOpenDialog(mainWindow, options)
    : await dialog.showOpenDialog(options);
  if (selection.canceled || !selection.filePaths?.[0]) return { ok: false, canceled: true };
  try {
    return await soundpackStore.importArchive(selection.filePaths[0]);
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
});

ipcMain.handle('soundpacks:load', async (_event, id) => {
  if (!soundpackStore) throw new Error('Soundpack storage is not ready.');
  if (String(id || '') === 'builtin') {
    return { ok: true, pack: { id: 'builtin', name: 'Built-in NukeFire', author: 'NukeFire', version: '1' }, assets: {} };
  }
  try {
    return await soundpackStore.readPack(id, true);
  } catch (error) {
    return { ok: false, error: error?.message || String(error) };
  }
});

ipcMain.handle('soundpacks:events', async () => {
  const { SOUNDPACK_EVENTS, soundpackEventMetadata } = require('./src/soundpack-store');
  return {
    ok: true,
    events: Object.entries(SOUNDPACK_EVENTS).map(([event, cue]) => ({ event, cue, ...soundpackEventMetadata(event) }))
  };
});

ipcMain.handle('soundpacks:describe', async (_event, id) => {
  if (!soundpackStore) throw new Error('Soundpack storage is not ready.');
  if (String(id || '') === 'builtin') return { ok: true, pack: { id: 'builtin', name: 'Built-in NukeFire', author: 'NukeFire', version: '1', events: {} } };
  try { return await soundpackStore.readPack(id, false); }
  catch (error) { return { ok: false, error: error?.message || String(error) }; }
});

ipcMain.handle('soundpacks:duplicate', async (_event, request = {}) => {
  if (!soundpackStore) throw new Error('Soundpack storage is not ready.');
  try { return await soundpackStore.duplicate(request.sourceId, request.id, request); }
  catch (error) { return { ok: false, error: error?.message || String(error) }; }
});

ipcMain.handle('soundpacks:assign-event', async (_event, request = {}) => {
  if (!soundpackStore) throw new Error('Soundpack storage is not ready.');
  const options = {
    title: `Choose sound for ${String(request.event || 'soundpack event')}`,
    buttonLabel: 'Assign Sound', properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg', 'm4a'] }]
  };
  const selection = mainWindow && !mainWindow.isDestroyed() ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
  if (selection.canceled || !selection.filePaths?.[0]) return { ok: false, canceled: true };
  try { return await soundpackStore.assignEvent(request.id, request.event, selection.filePaths[0], request); }
  catch (error) { return { ok: false, error: error?.message || String(error) }; }
});

ipcMain.handle('soundpacks:clear-event', async (_event, request = {}) => {
  if (!soundpackStore) throw new Error('Soundpack storage is not ready.');
  try { return await soundpackStore.clearEvent(request.id, request.event); }
  catch (error) { return { ok: false, error: error?.message || String(error) }; }
});

ipcMain.handle('soundpacks:update-event', async (_event, request = {}) => {
  if (!soundpackStore) throw new Error('Soundpack storage is not ready.');
  try { return await soundpackStore.updateEventOptions(request.id, request.event, request); }
  catch (error) { return { ok: false, error: error?.message || String(error) }; }
});

ipcMain.handle('soundpacks:export', async (_event, id) => {
  if (!soundpackStore) throw new Error('Soundpack storage is not ready.');
  const safeId = String(id || '').trim().toLowerCase();
  const options = { title: 'Export NukeFire Soundpack', buttonLabel: 'Export Soundpack', defaultPath: `${safeId || 'nukefire-soundpack'}.nfsp`, filters: [{ name: 'NukeFire Soundpack', extensions: ['nfsp'] }] };
  const selection = mainWindow && !mainWindow.isDestroyed() ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);
  if (selection.canceled || !selection.filePath) return { ok: false, canceled: true };
  try { return await soundpackStore.exportPack(safeId, selection.filePath); }
  catch (error) { return { ok: false, error: error?.message || String(error) }; }
});

ipcMain.handle('client-presets:import', async () => {
  const options = { title: 'Import NukeFire Client Preset', buttonLabel: 'Review Preset', properties: ['openFile'], filters: [{ name: 'NukeFire Client Preset', extensions: ['nfpreset'] }] };
  const selection = mainWindow && !mainWindow.isDestroyed() ? await dialog.showOpenDialog(mainWindow, options) : await dialog.showOpenDialog(options);
  if (selection.canceled || !selection.filePaths?.[0]) return { ok: false, canceled: true };
  try {
    const buffer = await fs.promises.readFile(selection.filePaths[0]);
    if (buffer.length > clientPresets.MAX_PRESET_BYTES) throw new Error('Preset file is too large.');
    const preset = clientPresets.parsePresetText(buffer.toString('utf8'));
    return { ok: true, preset };
  } catch (error) { return { ok: false, error: error?.message || String(error) }; }
});

ipcMain.handle('client-presets:export', async (_event, presetValue) => {
  try {
    const preset = clientPresets.normalizeClientPreset(presetValue);
    const options = { title: 'Export NukeFire Client Preset', buttonLabel: 'Export Preset', defaultPath: `${preset.id}.nfpreset`, filters: [{ name: 'NukeFire Client Preset', extensions: ['nfpreset'] }] };
    const selection = mainWindow && !mainWindow.isDestroyed() ? await dialog.showSaveDialog(mainWindow, options) : await dialog.showSaveDialog(options);
    if (selection.canceled || !selection.filePath) return { ok: false, canceled: true };
    await fs.promises.writeFile(selection.filePath, `${JSON.stringify(preset, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    return { ok: true, filename: path.basename(selection.filePath) };
  } catch (error) { return { ok: false, error: error?.code === 'EEXIST' ? 'A file already exists at that location. Choose another name.' : error?.message || String(error) }; }
});

ipcMain.handle('map:load', async () => {
  if (!mapStore) throw new Error('Map storage is not ready.');
  return { ok: true, map: await mapStore.load(), info: mapStore.getInfo() };
});

ipcMain.handle('map:save', async (_event, mapData) => {
  if (!mapStore) throw new Error('Map storage is not ready.');
  await mapStore.save(mapData);
  return { ok: true, info: mapStore.getInfo() };
});

ipcMain.handle('map:get-info', async () => {
  if (!mapStore) throw new Error('Map storage is not ready.');
  return { ok: true, info: mapStore.getInfo() };
});

ipcMain.handle('sessions:list', async () => {
  return { ok: true, snapshot: sessionManager?.snapshot() || { activeSessionId: '', sessions: [], groups: {} } };
});

ipcMain.handle('sessions:set-startup-template', async (_event, definitions = null) => {
  if (!sessionManager) throw new Error('Sessions are not ready.');
  const template = definitions && typeof definitions === 'object'
    ? sessionManager.setStartupTinTinTemplate(definitions)
    : sessionManager.setStartupTinTinTemplate(null);
  return { ok: true, enabled: Boolean(template), template };
});

ipcMain.handle('sessions:create', async (_event, options = {}) => {
  if (!sessionManager) throw new Error('Sessions are not ready.');
  const session = sessionManager.createSession(options);
  return { ok: true, session, snapshot: sessionManager.snapshot() };
});

ipcMain.handle('sessions:update', async (_event, sessionId, changes = {}) => {
  if (!sessionManager) throw new Error('Sessions are not ready.');
  const session = sessionManager.updateSession(String(sessionId || ''), changes);
  if (!session) throw new Error('Unknown session.');
  return { ok: true, session, snapshot: sessionManager.snapshot() };
});

ipcMain.handle('sessions:remove', async (_event, sessionId) => {
  if (!sessionManager) throw new Error('Sessions are not ready.');
  const removed = sessionManager.removeSession(String(sessionId || ''));
  return { ok: removed, snapshot: sessionManager.snapshot() };
});

ipcMain.handle('sessions:set-active', async (_event, sessionId) => {
  if (!sessionManager) throw new Error('Sessions are not ready.');
  const session = sessionManager.setActiveSession(String(sessionId || ''));
  if (!session) throw new Error('Unknown session.');
  return { ok: true, session, snapshot: sessionManager.snapshot() };
});

ipcMain.handle('sessions:restore', async (_event, snapshot = {}) => {
  if (!sessionManager) throw new Error('Sessions are not ready.');
  return { ok: true, snapshot: sessionManager.restore(snapshot) };
});

ipcMain.handle('sessions:replace-definitions', async (_event, sessionId, definitions) => {
  if (!sessionManager) throw new Error('Sessions are not ready.');
  const legacyCall = definitions === undefined && sessionId && typeof sessionId === 'object';
  return {
    ok: true,
    snapshot: legacyCall
      ? sessionManager.replaceDefinitions(sessionId)
      : sessionManager.replaceDefinitions(String(sessionId || ''), definitions || {})
  };
});

ipcMain.handle('sessions:connect', async (_event, sessionId, options = {}) => {
  if (!sessionManager) throw new Error('Sessions are not ready.');
  const session = await sessionManager.connectSession(String(sessionId || ''), options);
  return { ok: true, session, snapshot: sessionManager.snapshot() };
});

ipcMain.handle('sessions:disconnect', async (_event, sessionId) => {
  const disconnected = sessionManager?.disconnectSession(String(sessionId || ''), 'Disconnected by user.') || false;
  return { ok: disconnected, snapshot: sessionManager?.snapshot() };
});

function ensureLuaLabService() {
  if (luaLabService) return luaLabService;
  luaLabService = new LuaLabService({
    getHostContext: (sessionId) => {
      const session = sessionManager?.findSession(sessionId);
      if (!session) throw new Error('Unknown Lua session.');
      return {
        session: {
          id: session.id,
          name: session.name,
          characterName: session.characterName,
          role: session.role,
          host: session.host,
          port: session.port,
          connected: session.status?.state === 'connected'
        },
        variables: session.tintin?.variableEngine?.list() || []
      };
    },
    sendCommand: (sessionId, command) => {
      if (!sessionManager) return { queued: false, reason: 'sessions-unavailable' };
      return sessionManager.queueCommand(sessionId, command, { source: 'lua' });
    },
    setVariable: (sessionId, name, value) => {
      const session = sessionManager?.findSession(sessionId);
      if (!session) return null;
      const stored = sessionManager.withTinTinSession(session, () => sessionManager.assignVariable(name, value));
      if (stored) sessionManager.emitSessionList();
      return stored;
    }
  });
  return luaLabService;
}

ipcMain.handle('lua-lab:execute', async (_event, sessionId, script) => {
  try {
    const result = await ensureLuaLabService().execute(String(sessionId || ''), String(script ?? ''));
    return { ...result, snapshot: sessionManager?.snapshot() || null };
  } catch (error) {
    return {
      ok: false,
      error: { type: 'host', message: String(error?.message || error || 'Lua Lab host error').slice(0, 4096) },
      echoes: []
    };
  }
});

ipcMain.handle('sessions:route-command', async (_event, sessionId, command) => {
  if (!sessionManager) throw new Error('Sessions are not ready.');
  return { ok: true, ...sessionManager.dispatchInputForRenderer(String(sessionId || ''), String(command ?? '')) };
});

ipcMain.handle('sessions:send-gmcp', async (_event, sessionId, packageName, body) => {
  const sent = sessionManager?.sendGmcp(String(sessionId || ''), String(packageName ?? ''), body) || false;
  return { ok: true, sent };
});

ipcMain.handle('sessions:set-terminal-size', async (_event, sessionId, size = {}) => {
  const width = Number(size?.width);
  const height = Number(size?.height);
  const sent = sessionId === '*'
    ? (sessionManager?.setTerminalSizeAll(width, height) || false)
    : (sessionManager?.setTerminalSize(String(sessionId || ''), width, height) || false);
  return { ok: true, sent, width, height };
});

ipcMain.handle('sessions:set-client-preferences', async (_event, sessionId, preferences = {}) => {
  const normalized = sessionId === '*'
    ? (sessionManager?.setClientPreferencesAll(preferences) || {})
    : (sessionManager?.setClientPreferences(String(sessionId || ''), preferences) || {});
  return { ok: true, preferences: normalized };
});

ipcMain.handle('sessions:get-pipeline-debug', async (_event, sessionId) => {
  return sessionManager?.pipelineDebugSnapshot(String(sessionId || '')) ?? null;
});

ipcMain.handle('sessions:set-pipeline-debug', async (_event, sessionId, settings = {}) => {
  const snapshot = sessionManager?.setPipelineDebug(String(sessionId || ''), settings) ?? null;
  return { ok: Boolean(snapshot), snapshot };
});

ipcMain.handle('sessions:clear-pipeline-debug', async (_event, sessionId) => {
  const snapshot = sessionManager?.clearPipelineDebug(String(sessionId || '')) ?? null;
  return { ok: Boolean(snapshot), snapshot };
});

ipcMain.handle('sessions:get-gmcp-state', async (_event, sessionId) => {
  return sessionManager?.getGmcpState(String(sessionId || '')) ?? null;
});

// Legacy single-session IPC remains as a compatibility shim for older renderer
// tests and external development helpers. It always addresses the active tab.
ipcMain.handle('mud:connect', async (_event, options) => {
  if (!sessionManager) throw new Error('Sessions are not ready.');
  const sessionId = sessionManager.activeSessionId;
  await sessionManager.connectSession(sessionId, options || {});
  return { ok: true };
});

ipcMain.handle('mud:disconnect', async () => {
  sessionManager?.disconnectSession(sessionManager.activeSessionId, 'Disconnected by user.');
  return { ok: true };
});

ipcMain.handle('mud:send', async (_event, command) => {
  const result = sessionManager?.dispatchInput(sessionManager.activeSessionId, String(command ?? ''));
  return { ok: true, ...(result || {}) };
});

ipcMain.handle('mud:send-gmcp', async (_event, packageName, body) => {
  const sent = sessionManager?.sendGmcp(sessionManager.activeSessionId, String(packageName ?? ''), body) || false;
  return { ok: true, sent };
});

ipcMain.handle('mud:set-terminal-size', async (_event, size) => {
  const width = Number(size?.width);
  const height = Number(size?.height);
  const sent = sessionManager?.setTerminalSize(sessionManager.activeSessionId, width, height) ?? false;
  return { ok: true, sent, width, height };
});

ipcMain.handle('mud:set-client-preferences', async (_event, preferences) => {
  return {
    ok: true,
    preferences: sessionManager?.setClientPreferencesAll(preferences) ?? {}
  };
});

ipcMain.handle('mud:get-gmcp-state', async () => {
  return sessionManager?.getGmcpState(sessionManager.activeSessionId) ?? null;
});

ipcMain.handle('panel:open', async (_event, request = {}) => {
  const panelId = String(request.panelId || '');
  const panelWindow = createPanelWindow(panelId, {
    bounds: request.bounds,
    focus: request.focus !== false
  });
  return { ok: true, panelId, bounds: panelWindowBounds(panelWindow) };
});

ipcMain.handle('panel:close', async (_event, panelIdValue) => {
  const panelId = String(panelIdValue || '');
  closePanelWindow(panelId);
  return { ok: true, panelId };
});

ipcMain.handle('panel:resize', async (event, request = {}) => {
  const panelId = String(request.panelId || '');
  const panelWindow = BrowserWindow.fromWebContents(event.sender);
  if (!SUPPORTED_POPOUT_PANELS.has(panelId) || !panelWindow || panelWindows.get(panelId) !== panelWindow) {
    return { ok: false, panelId };
  }
  return resizePanelWindow(panelId, panelWindow, request);
});

ipcMain.handle('panel:publish-state', async (_event, panelIdValue, payload) => {
  const panelId = String(panelIdValue || '');
  if (!SUPPORTED_POPOUT_PANELS.has(panelId)) return { ok: false };
  panelWindowStates.set(panelId, payload);
  sendToPanelWindow(panelId, 'panel:state', payload);
  return { ok: true };
});

ipcMain.handle('panel:ready', async (event, panelIdValue) => {
  const panelId = String(panelIdValue || '');
  const panelWindow = BrowserWindow.fromWebContents(event.sender);
  if (!panelWindow || panelWindows.get(panelId) !== panelWindow) return { ok: false };
  const latest = panelWindowStates.get(panelId);
  if (latest) sendToPanelWindow(panelId, 'panel:state', latest);
  return { ok: true, panelId, bounds: panelWindowBounds(panelWindow) };
});

ipcMain.handle('panel:action', async (_event, request = {}) => {
  const panelId = String(request.panelId || '');
  const action = String(request.action || '');
  if (!SUPPORTED_POPOUT_PANELS.has(panelId)) return { ok: false };

  if (action === 'focus-main') {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      sendToRenderer('menu:focus-command');
    }
    return { ok: true };
  }

  if (action === 'dock') {
    sendToRenderer('panel:action', { panelId, action: 'dock' });
    closePanelWindow(panelId);
    return { ok: true };
  }

  const control = request.control && typeof request.control === 'object'
    ? {
        token: String(request.control.token || '').slice(0, 160),
        kind: String(request.control.kind || '').slice(0, 32),
        value: String(request.control.value ?? '').slice(0, 4096),
        checked: request.control.checked === true,
        key: String(request.control.key || '').slice(0, 64),
        deltaX: Math.max(-100000, Math.min(100000, Number(request.control.deltaX) || 0)),
        deltaY: Math.max(-100000, Math.min(100000, Number(request.control.deltaY) || 0)),
        shiftKey: request.control.shiftKey === true,
        altKey: request.control.altKey === true,
        ctrlKey: request.control.ctrlKey === true,
        metaKey: request.control.metaKey === true
      }
    : null;

  const requestedMessageOrder = String(request.messageOrder || '');
  const messageOrder = (requestedMessageOrder === 'newest-top' || requestedMessageOrder === 'newest-bottom')
    ? requestedMessageOrder
    : '';

  sendToRenderer('panel:action', {
    panelId,
    action,
    channel: String(request.channel || '').slice(0, 40),
    messageOrder,
    control
  });
  return { ok: true };
});
