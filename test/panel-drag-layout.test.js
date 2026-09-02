'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  detachPanelForDrop,
  applyPanelDropLayout
} = require('../src/panel-drag-layout');

const PANEL_IDS = Object.freeze([
  'affects',
  'communications',
  'quickCommands',
  'liveState',
  'protocol',
  'mapper',
  'contextDeck',
  'vitals'
]);
const DOCK_REGIONS = Object.freeze(['left', 'right', 'outer-right', 'bottom']);

function independentLayout() {
  return {
    affects: { region: 'left', order: 0 },
    communications: { region: 'left', order: 1 },
    quickCommands: { region: 'left', order: 2 },
    liveState: { region: 'left', order: 3 },
    protocol: { region: 'left', order: 4 },
    mapper: { region: 'right', order: 0 },
    contextDeck: { region: 'right', order: 1 },
    vitals: { region: 'right', order: 2 }
  };
}

function independentGroups() {
  return Object.fromEntries(PANEL_IDS.map((panelId) => [panelId, panelId]));
}

function ordered(layout, region) {
  return PANEL_IDS
    .filter((panelId) => layout[panelId].region === region)
    .sort((left, right) => layout[left].order - layout[right].order);
}

test('detaching a group-id panel safely renames the remaining group', () => {
  const tabGroups = independentGroups();
  const activeTabs = { ...tabGroups };
  tabGroups.communications = 'affects';
  tabGroups.quickCommands = 'affects';
  activeTabs.affects = 'quickCommands';

  const result = detachPanelForDrop({
    panelIds: PANEL_IDS,
    panelId: 'affects',
    tabGroups,
    activeTabs
  });

  assert.equal(result.tabGroups.affects, 'affects');
  assert.equal(result.tabGroups.communications, 'communications');
  assert.equal(result.tabGroups.quickCommands, 'communications');
  assert.equal(result.activeTabs.communications, 'quickCommands');
  assert.equal(result.activeTabs.affects, 'affects');
});

test('detaching the selected non-leader tab selects a remaining member', () => {
  const tabGroups = independentGroups();
  const activeTabs = { ...tabGroups };
  tabGroups.communications = 'affects';
  activeTabs.affects = 'communications';

  const result = detachPanelForDrop({
    panelIds: PANEL_IDS,
    panelId: 'communications',
    tabGroups,
    activeTabs
  });

  assert.equal(result.tabGroups.communications, 'communications');
  assert.equal(result.activeTabs.affects, 'affects');
  assert.equal(result.activeTabs.communications, 'communications');
});

test('dock drops append a detached panel to the destination dock', () => {
  const result = applyPanelDropLayout({
    panelIds: PANEL_IDS,
    dockRegions: DOCK_REGIONS,
    layout: independentLayout(),
    tabGroups: independentGroups(),
    activeTabs: independentGroups(),
    panelId: 'quickCommands',
    intent: { kind: 'dock', region: 'right' }
  });

  assert.equal(result.layout.quickCommands.region, 'right');
  assert.equal(ordered(result.layout, 'right').at(-1), 'quickCommands');
  assert.equal(result.tabGroups.quickCommands, 'quickCommands');
});


test('dock drops can place a detached panel in the far-right column', () => {
  const result = applyPanelDropLayout({
    panelIds: PANEL_IDS,
    dockRegions: DOCK_REGIONS,
    layout: independentLayout(),
    tabGroups: independentGroups(),
    activeTabs: independentGroups(),
    panelId: 'communications',
    intent: { kind: 'dock', region: 'outer-right' }
  });

  assert.equal(result.layout.communications.region, 'outer-right');
  assert.deepEqual(ordered(result.layout, 'outer-right'), ['communications']);
  assert.equal(result.tabGroups.communications, 'communications');
});

test('position drops move a panel before an entire target tab group', () => {
  const tabGroups = independentGroups();
  const activeTabs = { ...tabGroups };
  tabGroups.contextDeck = 'mapper';
  activeTabs.mapper = 'contextDeck';

  const result = applyPanelDropLayout({
    panelIds: PANEL_IDS,
    dockRegions: DOCK_REGIONS,
    layout: independentLayout(),
    tabGroups,
    activeTabs,
    panelId: 'quickCommands',
    intent: {
      kind: 'position',
      region: 'right',
      targetPanelId: 'contextDeck',
      position: 'before'
    }
  });

  assert.deepEqual(ordered(result.layout, 'right'), [
    'quickCommands', 'mapper', 'contextDeck', 'vitals'
  ]);
  assert.equal(result.tabGroups.quickCommands, 'quickCommands');
  assert.equal(result.activeTabs.mapper, 'contextDeck');
});

test('tab drops reorder members inside an existing group', () => {
  const tabGroups = independentGroups();
  const activeTabs = { ...tabGroups };
  tabGroups.communications = 'affects';
  activeTabs.affects = 'communications';

  const result = applyPanelDropLayout({
    panelIds: PANEL_IDS,
    dockRegions: DOCK_REGIONS,
    layout: independentLayout(),
    tabGroups,
    activeTabs,
    panelId: 'communications',
    intent: {
      kind: 'tab',
      region: 'left',
      targetPanelId: 'affects',
      position: 'before'
    }
  });

  assert.deepEqual(ordered(result.layout, 'left').slice(0, 2), [
    'communications', 'affects'
  ]);
  assert.equal(result.tabGroups.communications, 'affects');
  assert.equal(result.activeTabs.affects, 'communications');
});

test('drops reject missing panels and cross-dock targets without mutation', () => {
  const layout = independentLayout();
  const tabGroups = independentGroups();
  const activeTabs = independentGroups();

  assert.equal(applyPanelDropLayout({
    panelIds: PANEL_IDS,
    dockRegions: DOCK_REGIONS,
    layout,
    tabGroups,
    activeTabs,
    panelId: 'missing',
    intent: { kind: 'dock', region: 'right' }
  }), null);

  assert.equal(applyPanelDropLayout({
    panelIds: PANEL_IDS,
    dockRegions: DOCK_REGIONS,
    layout,
    tabGroups,
    activeTabs,
    panelId: 'quickCommands',
    intent: {
      kind: 'tab',
      region: 'right',
      targetPanelId: 'affects',
      position: 'after'
    }
  }), null);

  assert.equal(layout.quickCommands.region, 'left');
  assert.equal(tabGroups.quickCommands, 'quickCommands');
});
