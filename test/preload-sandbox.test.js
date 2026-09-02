'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('sandboxed preload exposes the complete bridge without requiring local modules', () => {
  const root = path.join(__dirname, '..');
  const preloadSource = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  const parserSource = fs.readFileSync(path.join(root, 'src', 'client-command-parser.js'), 'utf8');
  const historySource = fs.readFileSync(path.join(root, 'src', 'history-navigation.js'), 'utf8');
  const writerSource = fs.readFileSync(path.join(root, 'src', 'tintin-script-writer.js'), 'utf8');
  const pipelineDebugSource = fs.readFileSync(path.join(root, 'src', 'pipeline-debug.js'), 'utf8');
  const htmlSource = fs.readFileSync(path.join(root, 'renderer', 'index.html'), 'utf8');
  const exposed = {};
  const listeners = new Map();
  const electron = {
    contextBridge: {
      exposeInMainWorld(name, value) {
        exposed[name] = value;
      }
    },
    ipcRenderer: {
      invoke: async () => ({ ok: true }),
      on(channel, listener) {
        listeners.set(channel, listener);
      },
      removeListener(channel) {
        listeners.delete(channel);
      }
    }
  };

  vm.runInNewContext(preloadSource, {
    require(specifier) {
      if (specifier === 'electron') return electron;
      throw new Error(`Sandboxed preload cannot require ${specifier}`);
    }
  }, { filename: 'preload.js' });

  assert.equal(typeof exposed.nukefire?.createSession, 'function');
  assert.equal(typeof exposed.nukefire?.writeClipboardText, 'function');
  assert.equal(typeof exposed.nukefire?.routeCommand, 'function');
  assert.equal(typeof exposed.nukefire?.setPipelineDebug, 'function');
  assert.equal(typeof exposed.nukefire?.clearPipelineDebug, 'function');
  assert.equal(typeof exposed.nukefire?.readTinTinScript, 'function');
  assert.equal(typeof exposed.nukefire?.writeTinTinScript, 'function');
  assert.equal(typeof exposed.nukefire?.getTinTinScriptsInfo, 'function');
  assert.doesNotMatch(preloadSource, /require\(['"]\.{1,2}\//u);

  const browser = {};
  vm.runInNewContext(parserSource, { window: browser }, { filename: 'client-command-parser.js' });
  assert.deepEqual(
    Array.from(browser.NukeFireClientCommands.analyzeCommandLine('e;bash goblin;flee', '#').commands),
    ['e', 'bash goblin', 'flee']
  );

  const writerBrowser = {};
  vm.runInNewContext(writerSource, { window: writerBrowser }, { filename: 'tintin-script-writer.js' });
  assert.equal(typeof writerBrowser.NukeFireTinTinScriptWriter.prepareTinTinWrite, 'function');

  const browserHistory = {};
  vm.runInNewContext(historySource, { window: browserHistory }, { filename: 'history-navigation.js' });
  assert.equal(browserHistory.NukeFireHistoryNavigation.matchesPrefix('BASH orc', 'ba'), true);

  const pipelineBrowser = {};
  vm.runInNewContext(pipelineDebugSource, { window: pipelineBrowser }, { filename: 'pipeline-debug.js' });
  assert.equal(pipelineBrowser.NukeFirePipelineDebug.normalizePipelineDebugSettings({ enabled: true }).enabled, true);

  const parserIndex = htmlSource.indexOf('../src/client-command-parser.js');
  const loaderIndex = htmlSource.indexOf('../src/tintin-script-loader.js');
  const writerIndex = htmlSource.indexOf('../src/tintin-script-writer.js');
  const historyIndex = htmlSource.indexOf('../src/history-navigation.js');
  const pipelineIndex = htmlSource.indexOf('../src/pipeline-debug.js');
  const rendererIndex = htmlSource.indexOf('src="renderer.js"');
  assert.ok(parserIndex >= 0, 'renderer HTML must load the client command parser');
  assert.ok(loaderIndex > parserIndex, 'TinTin script loading must load after the client command parser');
  assert.ok(writerIndex > loaderIndex, 'TinTin script writing must load after TinTin script loading');
  assert.ok(historyIndex > writerIndex, 'history navigation must load after TinTin script writing');
  assert.ok(pipelineIndex >= 0, 'renderer HTML must load pipeline debug support');
  assert.ok(rendererIndex > pipelineIndex, 'pipeline debug support must load before renderer.js');
  assert.ok(rendererIndex > historyIndex, 'history navigation must load before renderer.js');
});


test('preload exposes safe TinTin editor and menu bridges', () => {
  const root = path.join(__dirname, '..');
  const preloadSource = fs.readFileSync(path.join(root, 'preload.js'), 'utf8');
  const mainSource = fs.readFileSync(path.join(root, 'main.js'), 'utf8');
  assert.match(preloadSource, /editTinTinScript: \(requested\) => ipcRenderer\.invoke\('scripts:edit', requested\)/u);
  assert.match(preloadSource, /showTinTinScriptsFolder: \(\) => ipcRenderer\.invoke\('scripts:show-folder'\)/u);
  assert.match(preloadSource, /subscribe\('menu:edit-tintin-script'/u);
  assert.match(preloadSource, /subscribe\('menu:show-tintin-scripts-folder'/u);
  assert.match(mainSource, /dialog\.showOpenDialog/u);
  assert.match(mainSource, /shell\.openPath/u);
  assert.match(mainSource, /Edit TinTin Script…/u);
  assert.match(mainSource, /Show Scripts Folder/u);
});
