(function exposePanelDragLayout(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFirePanelDragLayout = api;
})(typeof window !== 'undefined' ? window : globalThis, function createPanelDragLayout() {
  'use strict';

  const DROP_KINDS = Object.freeze(['dock', 'position', 'tab']);
  const DROP_POSITIONS = Object.freeze(['before', 'after']);

  function cloneLayout(layout = {}) {
    return Object.fromEntries(
      Object.entries(layout).map(([panelId, record]) => [panelId, { ...record }])
    );
  }

  function normalizedPanelIds(panelIds) {
    return [...new Set(
      (Array.isArray(panelIds) ? panelIds : [])
        .map((panelId) => String(panelId || '').trim())
        .filter(Boolean)
    )];
  }

  function orderedPanelsInRegion(panelIds, layout, region) {
    const index = new Map(panelIds.map((panelId, position) => [panelId, position]));
    return panelIds
      .filter((panelId) => layout?.[panelId]?.region === region)
      .sort((left, right) => {
        const leftOrder = Number(layout[left]?.order);
        const rightOrder = Number(layout[right]?.order);
        const orderDifference = (Number.isFinite(leftOrder) ? leftOrder : 0) -
          (Number.isFinite(rightOrder) ? rightOrder : 0);
        return orderDifference || index.get(left) - index.get(right);
      });
  }

  function reorderRegion(layout, region, orderedPanelIds) {
    const next = cloneLayout(layout);
    orderedPanelIds.forEach((panelId, order) => {
      next[panelId] = { ...next[panelId], region, order };
    });
    return next;
  }

  function detachPanelForDrop({ panelIds, panelId, tabGroups = {}, activeTabs = {} } = {}) {
    const knownPanels = normalizedPanelIds(panelIds);
    if (!knownPanels.includes(panelId)) return null;

    const nextTabGroups = { ...tabGroups };
    const nextActiveTabs = { ...activeTabs };
    const oldGroupId = nextTabGroups[panelId] || panelId;
    const remaining = knownPanels.filter(
      (id) => id !== panelId && (nextTabGroups[id] || id) === oldGroupId
    );

    if (remaining.length === 0) {
      nextTabGroups[panelId] = panelId;
      nextActiveTabs[panelId] = panelId;
      if (oldGroupId !== panelId) delete nextActiveTabs[oldGroupId];
      return { tabGroups: nextTabGroups, activeTabs: nextActiveTabs };
    }

    if (oldGroupId === panelId) {
      const replacementGroupId = remaining[0];
      for (const id of remaining) nextTabGroups[id] = replacementGroupId;
      const selected = nextActiveTabs[oldGroupId];
      nextActiveTabs[replacementGroupId] = remaining.includes(selected)
        ? selected
        : remaining[0];
      delete nextActiveTabs[oldGroupId];
    } else if (!remaining.includes(nextActiveTabs[oldGroupId])) {
      nextActiveTabs[oldGroupId] = remaining[0];
    }

    nextTabGroups[panelId] = panelId;
    nextActiveTabs[panelId] = panelId;
    return { tabGroups: nextTabGroups, activeTabs: nextActiveTabs };
  }

  function applyPanelDropLayout({
    panelIds,
    dockRegions,
    layout = {},
    tabGroups = {},
    activeTabs = {},
    panelId,
    intent
  } = {}) {
    const knownPanels = normalizedPanelIds(panelIds);
    const knownRegions = new Set(
      (Array.isArray(dockRegions) ? dockRegions : [])
        .map((region) => String(region || '').trim())
        .filter(Boolean)
    );

    if (!knownPanels.includes(panelId) || !intent || !DROP_KINDS.includes(intent.kind) ||
        !knownRegions.has(intent.region) || !layout?.[panelId]) {
      return null;
    }

    const targetPanelId = String(intent.targetPanelId || '');
    if (intent.kind !== 'dock') {
      if (!knownPanels.includes(targetPanelId) || targetPanelId === panelId ||
          layout?.[targetPanelId]?.region !== intent.region ||
          !DROP_POSITIONS.includes(intent.position)) {
        return null;
      }
    }

    const detached = detachPanelForDrop({
      panelIds: knownPanels,
      panelId,
      tabGroups,
      activeTabs
    });
    if (!detached) return null;

    let nextLayout = cloneLayout(layout);
    const nextTabGroups = detached.tabGroups;
    const nextActiveTabs = detached.activeTabs;
    nextLayout[panelId] = { region: intent.region, order: Number.MAX_SAFE_INTEGER };

    const ordered = orderedPanelsInRegion(knownPanels, nextLayout, intent.region)
      .filter((id) => id !== panelId);
    let insertionIndex = ordered.length;

    if (intent.kind === 'position') {
      const targetGroupId = nextTabGroups[targetPanelId] || targetPanelId;
      const targetIndexes = ordered
        .map((id, index) => ((nextTabGroups[id] || id) === targetGroupId ? index : -1))
        .filter((index) => index >= 0);
      if (targetIndexes.length > 0) {
        insertionIndex = intent.position === 'before'
          ? Math.min(...targetIndexes)
          : Math.max(...targetIndexes) + 1;
      }
      nextTabGroups[panelId] = panelId;
      nextActiveTabs[panelId] = panelId;
    } else if (intent.kind === 'tab') {
      const targetGroupId = nextTabGroups[targetPanelId] || targetPanelId;
      const targetIndex = ordered.indexOf(targetPanelId);
      insertionIndex = targetIndex < 0
        ? ordered.length
        : targetIndex + (intent.position === 'after' ? 1 : 0);
      nextTabGroups[panelId] = targetGroupId;
      nextActiveTabs[targetGroupId] = panelId;
      if (targetGroupId !== panelId) delete nextActiveTabs[panelId];
    }

    ordered.splice(
      Math.max(0, Math.min(ordered.length, insertionIndex)),
      0,
      panelId
    );
    nextLayout = reorderRegion(nextLayout, intent.region, ordered);

    return {
      layout: nextLayout,
      tabGroups: nextTabGroups,
      activeTabs: nextActiveTabs
    };
  }

  return {
    DROP_KINDS,
    DROP_POSITIONS,
    detachPanelForDrop,
    applyPanelDropLayout
  };
});
