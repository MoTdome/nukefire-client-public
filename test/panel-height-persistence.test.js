'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  SettingsStore,
  normalizeWorkspace
} = require('../src/settings-store');

test('workspace normalization preserves default and character pane-height records', () => {
  const workspace = normalizeWorkspace({
    defaultPanelHeights: {
      'panel:affects': 210,
      nonsense: 300
    },
    characters: {
      prime: {
        name: 'Prime',
        panelHeights: {
          'panel:communications': 480,
          'group:contextDeck+mapper': 390,
          junk: -20
        }
      }
    }
  });

  assert.deepEqual(workspace.defaultPanelHeights, {
    'panel:affects': 210
  });
  assert.deepEqual(workspace.characters.prime.panelHeights, {
    'panel:communications': 480,
    'group:contextDeck+mapper': 390
  });
});

test('settings store round-trips pane heights through the normal persistent workspace file', async (t) => {
  const directory = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'nukefire-panel-heights-'));
  t.after(() => fs.promises.rm(directory, { recursive: true, force: true }));

  const store = new SettingsStore({ baseDirectory: directory });
  const normalized = await store.save({
    workspace: {
      defaultPanelHeights: {
        'panel:affects': 225
      },
      characters: {
        prime: {
          name: 'Prime',
          panelHeights: {
            'panel:communications': 510
          }
        }
      }
    }
  });

  assert.equal(normalized.workspace.defaultPanelHeights['panel:affects'], 225);
  assert.equal(normalized.workspace.characters.prime.panelHeights['panel:communications'], 510);

  const restored = await new SettingsStore({ baseDirectory: directory }).load();
  assert.equal(restored.workspace.defaultPanelHeights['panel:affects'], 225);
  assert.equal(restored.workspace.characters.prime.panelHeights['panel:communications'], 510);
});

test('renderer binds pane heights to character/shared workspace persistence and migrates the V8 local cache', () => {
  const root = path.join(__dirname, '..');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'src', 'settings-store.js'), 'utf8');

  assert.match(renderer, /function activePanelHeights/u);
  assert.match(renderer, /function workspacePanelHeightOverrides/u);
  assert.match(renderer, /function persistWorkspacePanelHeight/u);
  assert.match(renderer, /storeWorkspacePanelHeightOverrides/u);
  assert.match(renderer, /schedulePersistentSettingsSave\(\)/u);
  assert.match(renderer, /defaultPanelHeights:\s*\{\s*\.\.\.state\.workspace\.defaultPanelHeights\s*\}/u);
  assert.match(renderer, /nukefire\.panelHeights\.v2/u);
  assert.match(renderer, /NukeFirePanelHeightController/u);
  assert.match(settings, /const SETTINGS_SCHEMA_VERSION = 48/u);
  assert.match(settings, /defaultPanelHeights/u);
  assert.match(settings, /panelHeights:\s*normalizePanelHeights/u);
});

test('settings remember only a valid last character workspace for startup restore', () => {
  const workspace = normalizeWorkspace({
    lastCharacterKey: 'Prime',
    lastCharacterName: 'Prime',
    characters: {
      prime: {
        name: 'Prime',
        panelHeights: { 'panel:communications': 480 }
      }
    }
  });

  assert.equal(workspace.lastCharacterKey, 'prime');
  assert.equal(workspace.lastCharacterName, 'Prime');
  assert.equal(workspace.characters.prime.panelHeights['panel:communications'], 480);

  const missing = normalizeWorkspace({
    lastCharacterKey: 'Nobody',
    characters: {
      prime: { name: 'Prime' }
    }
  });
  assert.equal(missing.lastCharacterKey, '');
  assert.equal(missing.lastCharacterName, '');
});

test('renderer restores last character workspace at startup and reapplies heights after identification', () => {
  const root = path.join(__dirname, '..');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const settings = fs.readFileSync(path.join(root, 'src', 'settings-store.js'), 'utf8');

  assert.match(settings, /lastCharacterKey/u);
  assert.match(settings, /lastCharacterName/u);
  assert.match(renderer, /function schedulePanelHeightRestore/u);
  assert.match(renderer, /function schedulePanelHeightRestore\(\) \{[\s\S]*?NukeFirePanelHeightController\?\.refresh\?\.\(\);[\s\S]*?\}/u);
  const restoreStart = renderer.indexOf('function schedulePanelHeightRestore()');
  const restoreEnd = renderer.indexOf('\nfunction applyWorkspaceForCurrentScope()', restoreStart);
  const restoreBlock = renderer.slice(restoreStart, restoreEnd);
  assert.doesNotMatch(restoreBlock, /queueMicrotask|requestAnimationFrame|setTimeout/u);
  assert.match(renderer, /state\.workspace\.currentCharacterKey = state\.workspace\.lastCharacterKey/u);
  assert.match(renderer, /state\.workspace\.lastCharacterKey = key/u);
  assert.match(renderer, /schedulePersistentSettingsSave\(\)/u);
  assert.match(renderer, /schedulePanelHeightRestore\(\)/u);
  assert.match(renderer, /function flushWorkspaceGeometrySaveNow/u);
  assert.match(renderer, /flushWorkspaceGeometrySaveNow\(\)/u);
});

test('repeated unchanged character status is cold for workspace persistence and pane restoration', () => {
  const root = path.join(__dirname, '..');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const start = renderer.indexOf('function setWorkspaceCharacter(name)');
  const end = renderer.indexOf('\nfunction resetSidebarPanels()', start);
  const block = renderer.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.match(block, /const unchangedIdentity = sameCharacter/u);
  assert.match(block, /key === state\.workspace\.lastCharacterKey/u);
  assert.match(block, /displayName === state\.workspace\.currentCharacterName/u);
  assert.match(block, /displayName === state\.workspace\.lastCharacterName/u);

  const noOp = block.indexOf('if (unchangedIdentity) return;');
  const flush = block.indexOf('flushWorkspaceGeometrySaveNow();');
  const restore = block.indexOf('schedulePanelHeightRestore();');
  assert.ok(noOp >= 0);
  assert.ok(flush > noOp);
  assert.ok(restore > noOp);
});

test('pane-height restoration no longer fans out across legacy timing retries', () => {
  const root = path.join(__dirname, '..');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const resize = fs.readFileSync(path.join(root, 'src', 'panel-stack-resize.js'), 'utf8');

  const restoreStart = renderer.indexOf('function schedulePanelHeightRestore()');
  const restoreEnd = renderer.indexOf('\nfunction applyWorkspaceForCurrentScope()', restoreStart);
  const restoreBlock = renderer.slice(restoreStart, restoreEnd);
  assert.match(restoreBlock, /NukeFirePanelHeightController\?\.refresh\?\.\(\)/u);
  assert.doesNotMatch(restoreBlock, /queueMicrotask|requestAnimationFrame|setTimeout/u);
  assert.doesNotMatch(renderer, /panelStackResizeController\?\.refresh\?\.\(\);\s*$/mu);
  assert.doesNotMatch(resize, /setTimeout\(\(\) => refresh\(\{ force: true \}\), (?:0|250)\)/u);
});

test('pane resizing uses bounded surface refreshes instead of rebuilding Communications and Mapper per event', () => {
  const root = path.join(__dirname, '..');
  const renderer = fs.readFileSync(path.join(root, 'renderer', 'renderer.js'), 'utf8');
  const start = renderer.indexOf('const panelStackResizeController =');
  const end = renderer.indexOf('window.NukeFirePanelHeightController =', start);
  const block = renderer.slice(start, end);

  assert.match(renderer, /function schedulePanelResizeCommunicationsRefresh/u);
  assert.match(block, /schedulePanelResizeCommunicationsRefresh\(\)/u);
  assert.match(block, /scheduleMapperRender\(\)/u);
  assert.doesNotMatch(block, /renderCommunicationMessages\(\)/u);
  assert.doesNotMatch(block, /renderMapper\(\)/u);
});
