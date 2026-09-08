'use strict';

(function initPanelHeightResize(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFirePanelStackResize = api;
})(typeof window !== 'undefined' ? window : globalThis, function panelHeightResizeFactory() {
  const STORAGE_VERSION = 3;
  const MIN_PANEL_HEIGHT = 110;
  const MAX_PANEL_HEIGHT = 1400;
  const PANEL_SAFE_MIN_HEIGHTS = Object.freeze({
    vitals: 150,
    sessionVitals: 120,
    affects: 170,
    quickCommands: 180,
    liveState: 120,
    protocol: 190,
    communications: 245,
    contextDeck: 240,
    mapper: 300
  });
  const KEYBOARD_STEP = 12;
  const KEYBOARD_LARGE_STEP = 36;

  function normalizeHeight(value, minimum = MIN_PANEL_HEIGHT, maximum = MAX_PANEL_HEIGHT) {
    const number = Math.trunc(Number(value));
    if (!Number.isFinite(number)) return null;
    const safeMinimum = Math.max(MIN_PANEL_HEIGHT, Math.trunc(Number(minimum) || MIN_PANEL_HEIGHT));
    const safeMaximum = Math.max(safeMinimum, Math.trunc(Number(maximum) || MAX_PANEL_HEIGHT));
    return Math.max(safeMinimum, Math.min(safeMaximum, number));
  }

  function panelSafeMinimum(panelIdValue) {
    const panelId = String(panelIdValue || '').trim();
    return PANEL_SAFE_MIN_HEIGHTS[panelId] || MIN_PANEL_HEIGHT;
  }

  function targetSafeMinimum(panelIdValue, tabListHeight = 0) {
    const tabs = Math.max(0, Math.trunc(Number(tabListHeight) || 0));
    return Math.min(MAX_PANEL_HEIGHT, panelSafeMinimum(panelIdValue) + tabs);
  }

  function normalizeHeightMap(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const normalized = {};
    for (const [rawKey, rawHeight] of Object.entries(source).slice(0, 64)) {
      const key = String(rawKey || '').trim().slice(0, 240);
      const height = normalizeHeight(rawHeight);
      if (!key || height === null) continue;
      if (!key.startsWith('panel:') && !key.startsWith('group:')) continue;
      normalized[key] = height;
    }
    return normalized;
  }

  function resizeHeight(currentHeight, delta, minimum = MIN_PANEL_HEIGHT, maximum = MAX_PANEL_HEIGHT) {
    const current = Number(currentHeight);
    const base = Number.isFinite(current) ? current : minimum;
    return Math.round(Math.max(minimum, Math.min(maximum, base + Number(delta || 0))));
  }

  function handleViewportGeometry(targetRect = {}, clipRect = {}, options = {}) {
    const height = Math.max(6, Math.trunc(Number(options.height) || 10));
    const inset = Math.max(0, Math.trunc(Number(options.inset) || 5));

    const left = Number(targetRect.left);
    const right = Number(targetRect.right);
    const bottom = Number(targetRect.bottom);
    const clipTop = Number(clipRect.top);
    const clipBottom = Number(clipRect.bottom);
    const clipLeft = Number(clipRect.left);
    const clipRight = Number(clipRect.right);

    if (![left, right, bottom, clipTop, clipBottom, clipLeft, clipRight].every(Number.isFinite)) {
      return { visible: false, left: 0, top: 0, width: 0, height };
    }

    const width = Math.max(0, Math.round(right - left - (inset * 2)));
    const visible = (
      width >= 20
      && bottom >= clipTop
      && bottom <= clipBottom + 1
      && right > clipLeft
      && left < clipRight
    );

    return {
      visible,
      left: Math.round(left + inset),
      top: Math.round(bottom - height),
      width,
      height
    };
  }

  function install(options = {}) {
    if (typeof document === 'undefined') return null;

    const getPanelHeights = typeof options.getPanelHeights === 'function'
      ? options.getPanelHeights
      : () => ({});
    const savePanelHeight = typeof options.savePanelHeight === 'function'
      ? options.savePanelHeight
      : () => {};
    const resetPanelHeight = typeof options.resetPanelHeight === 'function'
      ? options.resetPanelHeight
      : () => {};
    const resetAllPanelHeights = typeof options.resetAllPanelHeights === 'function'
      ? options.resetAllPanelHeights
      : () => {};
    const onResize = typeof options.onResize === 'function' ? options.onResize : () => {};
    const announce = typeof options.announce === 'function' ? options.announce : () => {};

    const dockSelectors = Array.isArray(options.docks) && options.docks.length
      ? options.docks
      : ['#dock-left', '#dock-right', '.dock-outer-right'];
    const docks = dockSelectors
      .map((selector) => document.querySelector(selector))
      .filter((element, index, array) => element && array.indexOf(element) === index);

    let refreshFrame = 0;
    let handlePositionFrame = 0;
    let drag = null;
    const observers = [];
    const resizeObservers = [];

    function allPanels() {
      return [...document.querySelectorAll('[data-workspace-panel]')];
    }

    function panelId(panel) {
      return String(panel?.dataset?.workspacePanel || '').trim();
    }

    function targetForPanel(panel) {
      const group = panel?.closest?.('.dock-tab-group');
      return group || panel || null;
    }

    function panelIdsWithin(target) {
      if (!target) return [];
      if (target.matches?.('[data-workspace-panel]')) {
        const id = panelId(target);
        return id ? [id] : [];
      }
      return [...target.querySelectorAll?.('[data-workspace-panel]') || []]
        .map(panelId)
        .filter(Boolean)
        .sort();
    }

    function targetKey(target) {
      const ids = panelIdsWithin(target);
      if (!ids.length) return '';
      return ids.length === 1 ? `panel:${ids[0]}` : `group:${ids.join('+')}`;
    }

    function targetLabel(target) {
      const active = target?.querySelector?.(
        '[data-workspace-panel]:not([hidden]) .panel-titlebar h2, ' +
        '[role="tab"][aria-selected="true"], .panel-titlebar h2'
      );
      const text = String(active?.textContent || '').trim();
      if (text) return text;
      const ids = panelIdsWithin(target);
      return ids.join(' / ') || 'Panel';
    }

    function heightOf(target) {
      return Math.round(
        target?.getBoundingClientRect?.().height
        || target?.offsetHeight
        || MIN_PANEL_HEIGHT
      );
    }

    function activePanelForTarget(target) {
      if (!target) return null;
      if (target.matches?.('[data-workspace-panel]')) return target;
      return target.querySelector?.('[data-workspace-panel]:not([hidden])[data-tab-active="true"]')
        || target.querySelector?.('[data-workspace-panel]:not([hidden])')
        || null;
    }

    function minimumHeightForTarget(target) {
      const panel = activePanelForTarget(target);
      const id = panelId(panel);
      let tabListHeight = 0;

      if (target?.classList?.contains('dock-tab-group')) {
        const tabList = target.querySelector?.(':scope > .panel-tablist');
        tabListHeight = Math.round(
          tabList?.getBoundingClientRect?.().height
          || tabList?.offsetHeight
          || 0
        );
      }

      return targetSafeMinimum(id, tabListHeight);
    }

    function setTargetHeight(target, height, persist = true) {
      if (!target) return;
      const normalized = normalizeHeight(height, minimumHeightForTarget(target));
      const key = targetKey(target);
      if (normalized === null || !key) return;

      target.style.height = `${normalized}px`;
      target.classList.add('panel-height-sized');

      if (persist) savePanelHeight(key, normalized);
      onResize({ key, height: normalized, panelIds: panelIdsWithin(target), persist });
    }

    function clearTargetHeight(target, persist = true) {
      if (!target) return;
      const key = targetKey(target);
      if (persist && key) resetPanelHeight(key);
      target.style.removeProperty('height');
      target.classList.remove('panel-height-sized');
      onResize({ key, reset: true, panelIds: panelIdsWithin(target), persist });
    }

    function applySavedHeight(target, heights) {
      const key = targetKey(target);
      if (!key) return;
      const height = normalizeHeight(heights[key], minimumHeightForTarget(target));
      if (height === null) {
        target.style.removeProperty('height');
        target.classList.remove('panel-height-sized');
        return;
      }
      target.style.height = `${height}px`;
      target.classList.add('panel-height-sized');
    }

    function updateHandleAria(handle, target) {
      const height = heightOf(target);
      handle.setAttribute('aria-valuemin', String(minimumHeightForTarget(target)));
      handle.setAttribute('aria-valuemax', String(MAX_PANEL_HEIGHT));
      handle.setAttribute('aria-valuenow', String(height));
      handle.setAttribute('aria-valuetext', `${targetLabel(target)} ${height} pixels tall`);
      handle.setAttribute('aria-label', `Resize ${targetLabel(target)} vertically`);
      handle.setAttribute('aria-describedby', 'panel-resize-help');
    }

    function positionHandleAtTargetBottom(handle, target) {
      if (!handle || !target || !handle.isConnected) return;

      const targetRect = target.getBoundingClientRect?.();
      if (!targetRect) return;

      const dock = target.closest?.('#dock-left, #dock-right, .dock-outer-right, #dock-bottom');
      const clipRect = dock?.getBoundingClientRect?.() || {
        top: 0,
        bottom: window.innerHeight || document.documentElement.clientHeight || targetRect.bottom,
        left: 0,
        right: window.innerWidth || document.documentElement.clientWidth || targetRect.right
      };
      const geometry = handleViewportGeometry(targetRect, clipRect);

      handle.style.position = 'fixed';
      handle.style.margin = '0';
      handle.style.transform = 'none';
      handle.style.left = `${geometry.left}px`;
      handle.style.top = `${geometry.top}px`;
      handle.style.width = `${geometry.width}px`;
      handle.style.height = `${geometry.height}px`;
      handle.style.minHeight = `${geometry.height}px`;
      handle.style.visibility = geometry.visible ? 'visible' : 'hidden';
    }

    function hideAllHandles() {
      for (const handle of document.querySelectorAll('.panel-height-resizer')) {
        handle.style.visibility = 'hidden';
      }
    }

    function positionVisibleHandles() {
      hideAllHandles();
      const seenTargets = new Set();
      for (const panel of allPanels()) {
        if (panel.hidden) continue;
        const target = targetForPanel(panel);
        if (!target || seenTargets.has(target)) continue;
        seenTargets.add(target);
        const handle = target.querySelector?.(
          '[data-workspace-panel]:not([hidden]) > .panel-height-resizer'
        );
        if (handle) positionHandleAtTargetBottom(handle, target);
      }
    }

    function scheduleHandlePositionRefresh() {
      if (handlePositionFrame) return;
      const perform = () => {
        handlePositionFrame = 0;
        positionVisibleHandles();
      };
      if (typeof requestAnimationFrame === 'function') {
        handlePositionFrame = requestAnimationFrame(perform);
      } else {
        perform();
      }
    }

    function beginDrag(event, handle, panel) {
      if (event.button !== undefined && event.button !== 0) return;
      const target = targetForPanel(panel);
      if (!target) return;
      event.preventDefault();
      drag = {
        handle,
        panel,
        target,
        startY: Number(event.clientY) || 0,
        startHeight: heightOf(target),
      };
      document.body.classList.add('resizing-panel-height');
      handle.dataset.resizing = 'true';
      handle.setPointerCapture?.(event.pointerId);
    }

    function moveDrag(event) {
      if (!drag) return;
      event.preventDefault();
      const next = resizeHeight(
        drag.startHeight,
        (Number(event.clientY) || 0) - drag.startY,
        minimumHeightForTarget(drag.target)
      );
      setTargetHeight(drag.target, next, false);
      positionHandleAtTargetBottom(drag.handle, drag.target);
      updateHandleAria(drag.handle, drag.target);
    }

    function endDrag() {
      if (!drag) return;
      setTargetHeight(drag.target, heightOf(drag.target), true);
      positionHandleAtTargetBottom(drag.handle, drag.target);
      updateHandleAria(drag.handle, drag.target);
      drag.handle.dataset.resizing = 'false';
      document.body.classList.remove('resizing-panel-height');
      announce(`${targetLabel(drag.target)} height saved.`);
      drag = null;
    }

    function handleKeydown(event, handle, panel) {
      const target = targetForPanel(panel);
      if (!target) return;
      const current = heightOf(target);
      let next = null;

      if (event.key === 'ArrowUp') {
        next = resizeHeight(current, -(event.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP), minimumHeightForTarget(target));
      } else if (event.key === 'ArrowDown') {
        next = resizeHeight(current, event.shiftKey ? KEYBOARD_LARGE_STEP : KEYBOARD_STEP, minimumHeightForTarget(target));
      } else if (event.key === 'Home') {
        next = minimumHeightForTarget(target);
      } else if (event.key === 'End') {
        next = MAX_PANEL_HEIGHT;
      }

      if (next === null) return;
      event.preventDefault();
      setTargetHeight(target, next, true);
      positionHandleAtTargetBottom(handle, target);
      updateHandleAria(handle, target);
    }

    function ensureHandle(panel) {
      if (!panel || !panelId(panel)) return null;
      let handle = panel.querySelector(':scope > .panel-height-resizer');
      if (!handle) {
        handle = document.createElement('div');
        handle.className = 'panel-height-resizer';
        handle.dataset.panelHeightResizer = panelId(panel);
        handle.setAttribute('role', 'separator');
        handle.setAttribute('aria-orientation', 'horizontal');
        handle.tabIndex = 0;
        handle.title = 'Drag up or down to resize this pane. Arrow keys resize; Shift uses larger steps; Home/End use safe extremes; double-click restores.';
        handle.addEventListener('pointerdown', (event) => beginDrag(event, handle, panel));
        handle.addEventListener('keydown', (event) => handleKeydown(event, handle, panel));
        handle.addEventListener('dblclick', () => {
          const target = targetForPanel(panel);
          clearTargetHeight(target, true);
          scheduleHandlePositionRefresh();
          updateHandleAria(handle, target);
          announce(`${targetLabel(target)} height restored.`);
        });
        panel.classList.add('panel-height-handle-owner');
        panel.append(handle);
      }
      updateHandleAria(handle, targetForPanel(panel));
      return handle;
    }

    function refresh(options = {}) {
      if (refreshFrame && !options.force) return;
      const perform = () => {
        refreshFrame = 0;
        const heights = normalizeHeightMap(getPanelHeights());
        const seenTargets = new Set();

        for (const panel of allPanels()) ensureHandle(panel);
        hideAllHandles();

        for (const panel of allPanels()) {
          if (panel.hidden) continue;
          const target = targetForPanel(panel);
          if (!target || seenTargets.has(target)) continue;
          seenTargets.add(target);

          if (drag?.target !== target) applySavedHeight(target, heights);

          const activeHandle = target.querySelector?.(
            '[data-workspace-panel]:not([hidden]) > .panel-height-resizer'
          );
          if (activeHandle) {
            positionHandleAtTargetBottom(activeHandle, target);
            updateHandleAria(activeHandle, target);
          }
        }
      };

      if (options.force || typeof requestAnimationFrame !== 'function') perform();
      else refreshFrame = requestAnimationFrame(perform);
    }

    function resetPanel(panelIdValue) {
      const requestedId = String(panelIdValue || '').trim();
      if (!requestedId) return false;
      const panel = allPanels().find((candidate) => panelId(candidate) === requestedId);
      if (!panel) return false;
      const target = targetForPanel(panel);
      if (!target) return false;

      clearTargetHeight(target, true);
      refresh({ force: true });
      scheduleHandlePositionRefresh();
      announce(`${targetLabel(target)} height restored.`);
      return true;
    }

    function resetAllForCurrentWorkspace() {
      resetAllPanelHeights();
      const seen = new Set();
      for (const panel of allPanels()) {
        const target = targetForPanel(panel);
        if (!target || seen.has(target)) continue;
        seen.add(target);
        clearTargetHeight(target, false);
      }
      refresh({ force: true });
      onResize({ resetAll: true, persist: true });
      announce('All saved pane heights restored for this workspace.');
    }

    for (const dock of docks) {
      const observer = new MutationObserver((records) => {
        if (records.some((record) => record.type === 'childList' || record.type === 'attributes')) refresh();
      });
      observer.observe(dock, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['hidden', 'data-tab-active']
      });
      observers.push(observer);

      if (typeof ResizeObserver === 'function') {
        const resizeObserver = new ResizeObserver(() => scheduleHandlePositionRefresh());
        resizeObserver.observe(dock);
        resizeObservers.push(resizeObserver);
      }
    }

    document.addEventListener('pointermove', moveDrag, { passive: false });
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
    document.addEventListener('scroll', scheduleHandlePositionRefresh, true);
    window.addEventListener('resize', () => {
      refresh();
      scheduleHandlePositionRefresh();
    });

    refresh({ force: true });

    return {
      refresh: () => refresh({ force: true }),
      resetPanel,
      resetAllForCurrentWorkspace,
      destroy() {
        for (const observer of observers) observer.disconnect();
        for (const observer of resizeObservers) observer.disconnect();
        if (refreshFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(refreshFrame);
        if (handlePositionFrame && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(handlePositionFrame);
        }
        const seen = new Set();
        for (const panel of allPanels()) {
          panel.querySelector(':scope > .panel-height-resizer')?.remove();
          panel.classList?.remove('panel-height-handle-owner');
          const target = targetForPanel(panel);
          if (!target || seen.has(target)) continue;
          seen.add(target);
          target.classList?.remove('panel-height-sized');
          target.style?.removeProperty('height');
        }
      }
    };
  }

  return Object.freeze({
    STORAGE_VERSION,
    MIN_PANEL_HEIGHT,
    MAX_PANEL_HEIGHT,
    PANEL_SAFE_MIN_HEIGHTS,
    panelSafeMinimum,
    targetSafeMinimum,
    KEYBOARD_STEP,
    KEYBOARD_LARGE_STEP,
    normalizeHeight,
    normalizeHeightMap,
    resizeHeight,
    handleViewportGeometry,
    install
  });
});
