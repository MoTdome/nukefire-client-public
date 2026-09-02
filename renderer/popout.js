'use strict';

const $ = (selector) => document.querySelector(selector);
const panelId = new URLSearchParams(window.location.search).get('panel') || 'communications';
const panelWindowsApi = window.NukeFirePanelWindows || {};
const panelDefinition = panelWindowsApi.panelWindowDefinition?.(panelId) || {
  label: 'NukeFire Panel',
  subtitle: 'Live NukeFire client panel'
};
const DEFAULT_CHANNELS = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'gossip', label: 'Gossip' },
  { id: 'newbie', label: 'Newbie' },
  { id: 'group', label: 'Group' },
  { id: 'tell', label: 'Tell' },
  { id: 'grats', label: 'Grats' },
  { id: 'auction', label: 'Auction' },
  { id: 'system', label: 'System' }
]);
const state = {
  channels: DEFAULT_CHANNELS.map((channel) => ({ ...channel })),
  messages: [],
  unread: {},
  activeChannel: 'all',
  messageOrder: 'newest-top',
  followLiveEdge: true,
  revision: 0,
  bounds: null
};

function announce(message) {
  const output = $('#sr-announcer');
  if (!output) return;
  output.textContent = '';
  requestAnimationFrame(() => { output.textContent = String(message || ''); });
}

function normalizedWindowDimension(value, minimum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return minimum;
  return Math.max(minimum, Math.min(16384, Math.trunc(number)));
}

function applyWindowBounds(bounds = {}) {
  const width = normalizedWindowDimension(bounds.width, 440);
  const height = normalizedWindowDimension(bounds.height, 340);
  state.bounds = { x: Number(bounds.x) || 0, y: Number(bounds.y) || 0, width, height };
  $('#panel-current-size').textContent = `Current: ${width} × ${height}`;
  const widthInput = $('#custom-window-width');
  const heightInput = $('#custom-window-height');
  if (document.activeElement !== widthInput) widthInput.value = String(width);
  if (document.activeElement !== heightInput) heightInput.value = String(height);
}

function setSizeMenuOpen(open, options = {}) {
  const menu = $('#panel-size-menu');
  const toggle = $('#panel-size-toggle');
  menu.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  if (open && options.focusFirst) {
    menu.querySelector('button, input')?.focus({ preventScroll: true });
  } else if (!open && options.restoreFocus) {
    toggle.focus({ preventScroll: true });
  }
}

async function requestWindowResize(request, label) {
  if (typeof window.nukefirePanel.resize !== 'function') {
    announce('Window size controls are unavailable in this build.');
    return false;
  }
  const result = await window.nukefirePanel.resize({ panelId, ...request });
  if (!result?.ok) {
    announce(result?.error || 'The panel window could not be resized.');
    return false;
  }
  if (result.bounds) applyWindowBounds(result.bounds);
  setSizeMenuOpen(false);
  const actualSize = `${state.bounds?.width || ''} by ${state.bounds?.height || ''}`;
  announce(label ? `${label}: ${actualSize}.` : `Window resized to ${actualSize}.`);
  return true;
}

function setWindowIdentity(snapshot = {}) {
  const label = String(snapshot.label || panelDefinition.label || 'NukeFire Panel');
  const accessibleLabel = String(snapshot.accessibleLabel || panelDefinition.label || label);
  const subtitle = String(snapshot.subtitle || panelDefinition.subtitle || 'Live NukeFire client panel');
  document.title = `NukeFire Client — ${label}`;
  document.body.dataset.panel = panelId;
  $('#popout-title').textContent = label;
  $('#popout-subtitle').textContent = subtitle;
  $('#generic-panel-view').setAttribute('aria-label', `${accessibleLabel} panel window`);
}

function applyTheme(snapshot = {}) {
  const theme = snapshot.theme || {};
  const ui = snapshot.ui || {};
  document.documentElement.style.setProperty('--terminal-foreground', theme.foreground || '#d3d7dc');
  document.documentElement.style.setProperty('--terminal-background', theme.background || '#050607');
  document.documentElement.style.setProperty('--ui-font-family', ui.uiFontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif');
  document.documentElement.style.setProperty('--terminal-font-family', ui.terminalFontFamily || 'Menlo, Monaco, "Courier New", monospace');
  document.documentElement.style.setProperty('--terminal-font-size', `${Number(ui.fontSize) || 16}px`);
  const brightness = ['dark', 'brighter', 'high-contrast'].includes(String(ui.interfaceBrightness || ''))
    ? String(ui.interfaceBrightness)
    : 'brighter';
  document.body.dataset.interfaceBrightness = brightness;
  document.body.classList.toggle('terminal-monochrome', Boolean(theme.monochrome));
  document.body.classList.toggle('screen-reader-mode', Boolean(snapshot.screenReaderMode));
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .format(new Date(Number(timestamp) || Date.now()));
}

function channelLabel(channelId) {
  return state.channels.find((channel) => channel.id === channelId)?.label || channelId;
}

function normalizeSnapshotChannels(value) {
  const source = Array.isArray(value) ? value : DEFAULT_CHANNELS;
  const result = [];
  for (const entry of source) {
    const id = String(entry?.id || '').trim().toLocaleLowerCase();
    const label = String(entry?.label || id).trim();
    if (!id || !label || result.some((channel) => channel.id === id)) continue;
    result.push({ id, label });
  }
  if (!result.some((channel) => channel.id === 'all')) result.unshift({ id: 'all', label: 'All' });
  return result;
}

function appendStyledText(target, message) {
  const parser = new window.NukeFireAnsi.AnsiParser();
  for (const run of parser.parse(message.ansiText || message.text || '')) {
    const span = document.createElement('span');
    span.textContent = run.text;
    Object.assign(span.style, window.NukeFireAnsi.styleToCss(run.style));
    target.append(span);
  }
}

function renderTabs() {
  const tabList = $('#communications-tabs');
  const signature = state.channels.map((channel) => channel.id).join('|');
  if (tabList.dataset.channelSignature !== signature) {
    const fragment = document.createDocumentFragment();
    for (const channel of state.channels) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'communications-tab';
      button.dataset.channel = channel.id;
      button.setAttribute('role', 'tab');
      const label = document.createElement('span');
      label.textContent = channel.label;
      const unread = document.createElement('span');
      unread.className = 'communications-unread';
      unread.hidden = true;
      button.append(label, unread);
      button.addEventListener('click', () => selectChannel(channel.id, true));
      button.addEventListener('keydown', handleTabKeydown);
      fragment.append(button);
    }
    tabList.replaceChildren(fragment);
    tabList.dataset.channelSignature = signature;
  }

  const total = Object.values(state.unread).reduce((sum, value) => sum + Number(value || 0), 0);
  for (const channel of state.channels) {
    const button = tabList.querySelector(`[data-channel="${channel.id}"]`);
    if (!button) continue;
    const count = channel.id === 'all' ? total : Number(state.unread[channel.id] || 0);
    const selected = channel.id === state.activeChannel;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
    button.setAttribute('aria-label', count ? `${channel.label}, ${count} unread` : channel.label);
    const badge = button.querySelector('.communications-unread');
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count === 0;
  }
}

function selectChannel(channelId, notifyMain) {
  if (!state.channels.some((channel) => channel.id === channelId)) return;
  state.activeChannel = channelId;
  renderTabs();
  renderMessages({ snapToLive: true });
  if (notifyMain) void window.nukefirePanel.action({ panelId, action: 'set-channel', channel: channelId });
}

function renderMessageOrderControl() {
  const select = $('#communications-order');
  if (select) select.value = state.messageOrder;
}

function communicationMatchesCurrentView(message) {
  const search = String($('#communications-search').value || '').trim().toLocaleLowerCase();
  if (state.activeChannel !== 'all' && message.channel !== state.activeChannel) return false;
  return !search || `${message.sender || ''} ${message.text || ''}`.toLocaleLowerCase().includes(search);
}

function createCommunicationArticle(message) {
  const article = document.createElement('article');
  article.className = 'communication-message';
  article.dataset.channel = message.channel;
  article.dataset.messageId = String(message.id);
  const meta = document.createElement('div');
  meta.className = 'communication-meta';
  const time = document.createElement('time');
  time.dateTime = new Date(message.timestamp).toISOString();
  time.textContent = formatTime(message.timestamp);
  const channel = document.createElement('span');
  channel.className = 'communication-channel-label';
  channel.textContent = channelLabel(message.channel);
  meta.append(time, channel);
  if (message.sender) {
    const sender = document.createElement('strong');
    sender.textContent = message.sender;
    meta.append(sender);
  }
  const body = document.createElement('p');
  body.className = 'communication-body';
  appendStyledText(body, message);
  article.append(meta, body);
  return article;
}

function communicationAppendDelta(previousMessages, nextMessages) {
  if (previousMessages.length === 0 || nextMessages.length === 0) return null;
  const firstNextId = String(nextMessages[0]?.id ?? '');
  const previousStart = previousMessages.findIndex((message) => String(message?.id ?? '') === firstNextId);
  if (previousStart < 0) return null;
  const overlapLength = previousMessages.length - previousStart;
  if (overlapLength > nextMessages.length) return null;
  for (let index = 0; index < overlapLength; index += 1) {
    if (String(previousMessages[previousStart + index]?.id ?? '') !== String(nextMessages[index]?.id ?? '')) return null;
  }
  const added = nextMessages.slice(overlapLength);
  if (added.length === 0) return null;
  return { removed: previousMessages.slice(0, previousStart), added };
}

function applyCommunicationAppendDelta(delta, previousMessages) {
  const container = $('#communications-messages');
  const previousVisibleCount = previousMessages.filter(communicationMatchesCurrentView).length;
  if (container.querySelectorAll('.communication-message').length !== previousVisibleCount) return false;
  const snapshot = {
    atLiveEdge: communicationsAtLiveEdge(container),
    followLiveEdge: state.followLiveEdge !== false,
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight
  };
  for (const message of delta.removed) {
    container.querySelector(`[data-message-id="${String(message.id)}"]`)?.remove();
  }
  for (const message of delta.added) {
    if (!communicationMatchesCurrentView(message)) continue;
    const article = createCommunicationArticle(message);
    if (state.messageOrder === 'newest-top') container.prepend(article);
    else container.append(article);
  }
  $('#communications-empty').hidden = container.childElementCount > 0;
  requestAnimationFrame(() => {
    if (snapshot.followLiveEdge || snapshot.atLiveEdge) {
      returnToCommunicationsLiveEdge(container);
    } else if (state.messageOrder === 'newest-top') {
      container.scrollTop = snapshot.scrollTop + Math.max(0, container.scrollHeight - snapshot.scrollHeight);
    } else {
      container.scrollTop = snapshot.scrollTop;
    }
  });
  return true;
}

function selectMessageOrder(messageOrder, notifyMain) {
  if (!['newest-top', 'newest-bottom'].includes(messageOrder)) return;
  const changed = state.messageOrder !== messageOrder;
  state.messageOrder = messageOrder;
  renderMessageOrderControl();
  renderMessages({ snapToLive: changed });
  if (notifyMain) {
    void window.nukefirePanel.action({
      panelId,
      action: 'set-order',
      messageOrder
    });
  }
}

function handleTabKeydown(event) {
  const tabs = [...$('#communications-tabs').querySelectorAll('[role="tab"]')];
  const index = tabs.indexOf(event.currentTarget);
  let next = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = tabs.length - 1;
  if (next === null) return;
  event.preventDefault();
  const button = tabs[next];
  selectChannel(button.dataset.channel, true);
  button.focus({ preventScroll: true });
}

function communicationsAtLiveEdge(container, threshold = 36) {
  if (state.messageOrder === 'newest-top') return container.scrollTop <= threshold;
  return container.scrollHeight - container.clientHeight - container.scrollTop <= threshold;
}

function returnToCommunicationsLiveEdge(container) {
  state.followLiveEdge = true;
  container.scrollTop = state.messageOrder === 'newest-top' ? 0 : container.scrollHeight;
}

function renderMessages(options = {}) {
  const container = $('#communications-messages');
  const snapshot = {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    atLiveEdge: communicationsAtLiveEdge(container),
    followLiveEdge: state.followLiveEdge !== false,
    snapToLive: options.snapToLive === true || options.snapToBottom === true
  };
  let visible = state.messages.filter(communicationMatchesCurrentView);
  if (state.messageOrder === 'newest-top') visible = [...visible].reverse();
  const fragment = document.createDocumentFragment();
  for (const message of visible) {
    fragment.append(createCommunicationArticle(message));
  }
  container.dataset.messageOrder = state.messageOrder;
  container.setAttribute(
    'aria-label',
    state.messageOrder === 'newest-top'
      ? 'Communication messages, newest at top'
      : 'Communication messages, newest at bottom'
  );
  container.replaceChildren(fragment);
  $('#communications-empty').hidden = visible.length > 0;
  requestAnimationFrame(() => {
    if (snapshot.snapToLive || snapshot.followLiveEdge || snapshot.atLiveEdge || visible.length <= 1) {
      returnToCommunicationsLiveEdge(container);
      return;
    }
    if (state.messageOrder === 'newest-top') {
      const heightDelta = Math.max(0, container.scrollHeight - snapshot.scrollHeight);
      container.scrollTop = snapshot.scrollTop + heightDelta;
      return;
    }
    container.scrollTop = snapshot.scrollTop;
  });
}

function applyCommunicationsSnapshot(snapshot = {}) {
  const renderStartedAt = snapshot.monitorActive ? performance.now() : 0;
  $('#communications-view').hidden = false;
  $('#generic-panel-view').hidden = true;
  const previousChannels = state.channels.map((channel) => channel.id).join('|');
  const previousMessages = state.messages;
  const previousActiveChannel = state.activeChannel;
  state.channels = normalizeSnapshotChannels(snapshot.channels);
  const nextMessages = Array.isArray(snapshot.messages) ? snapshot.messages.slice(-500) : [];
  state.messages = nextMessages;
  state.unread = snapshot.unread && typeof snapshot.unread === 'object' ? { ...snapshot.unread } : {};
  state.activeChannel = state.channels.some((channel) => channel.id === snapshot.activeChannel)
    ? snapshot.activeChannel
    : 'all';
  const previousOrder = state.messageOrder;
  state.messageOrder = ['newest-top', 'newest-bottom'].includes(snapshot.messageOrder)
    ? snapshot.messageOrder
    : 'newest-top';
  if (previousOrder !== state.messageOrder) state.followLiveEdge = true;
  renderTabs();
  renderMessageOrderControl();
  const channelsUnchanged = previousChannels === state.channels.map((channel) => channel.id).join('|');
  const delta = previousActiveChannel === state.activeChannel
    && previousOrder === state.messageOrder
    && channelsUnchanged
    ? communicationAppendDelta(previousMessages, nextMessages)
    : null;
  if (!delta || !applyCommunicationAppendDelta(delta, previousMessages)) {
    renderMessages({ snapToLive: previousOrder !== state.messageOrder });
  }
  if (renderStartedAt) {
    void window.nukefirePanel.action({
      panelId,
      action: 'performance',
      renderMs: performance.now() - renderStartedAt
    });
  }
}

function captureMirrorState() {
  const mirror = $('#panel-mirror');
  const active = document.activeElement?.closest?.('[data-popout-control]');
  const controls = {};
  for (const element of mirror.querySelectorAll('[data-popout-control]')) {
    const token = element.dataset.popoutControl;
    if (!token) continue;
    controls[token] = {
      scrollTop: Number(element.scrollTop) || 0,
      scrollLeft: Number(element.scrollLeft) || 0
    };
  }
  const selection = active && typeof active.selectionStart === 'number'
    ? { start: active.selectionStart, end: active.selectionEnd }
    : null;
  return {
    scrollTop: $('#generic-panel-view').scrollTop,
    scrollLeft: $('#generic-panel-view').scrollLeft,
    activeToken: active?.dataset.popoutControl || '',
    selection,
    controls
  };
}

function restoreMirrorState(previous = {}) {
  const view = $('#generic-panel-view');
  view.scrollTop = Number(previous.scrollTop) || 0;
  view.scrollLeft = Number(previous.scrollLeft) || 0;
  for (const [token, record] of Object.entries(previous.controls || {})) {
    const element = [...$('#panel-mirror').querySelectorAll('[data-popout-control]')]
      .find((candidate) => candidate.dataset.popoutControl === token);
    if (!element) continue;
    element.scrollTop = Number(record.scrollTop) || 0;
    element.scrollLeft = Number(record.scrollLeft) || 0;
  }
  if (!previous.activeToken) return;
  const active = [...$('#panel-mirror').querySelectorAll('[data-popout-control]')]
    .find((candidate) => candidate.dataset.popoutControl === previous.activeToken);
  if (!active) return;
  active.focus?.({ preventScroll: true });
  if (previous.selection && typeof active.setSelectionRange === 'function') {
    try { active.setSelectionRange(previous.selection.start, previous.selection.end); } catch { /* non-text control */ }
  }
}

function applyGenericSnapshot(snapshot = {}) {
  const renderStartedAt = snapshot.monitorActive ? performance.now() : 0;
  const revision = Number(snapshot.revision) || 0;
  if (revision && revision < state.revision) return;
  state.revision = Math.max(state.revision, revision);
  const previous = captureMirrorState();
  $('#communications-view').hidden = true;
  $('#generic-panel-view').hidden = false;
  $('#panel-mirror').innerHTML = String(snapshot.html || '<p class="panel-window-empty">Waiting for panel data.</p>');
  if (renderStartedAt) {
    void window.nukefirePanel.action({
      panelId,
      action: 'performance',
      renderMs: performance.now() - renderStartedAt
    });
  }
  requestAnimationFrame(() => restoreMirrorState(previous));
}

function applySnapshot(snapshot = {}) {
  setWindowIdentity(snapshot);
  applyTheme(snapshot);
  if (panelId === 'communications' || snapshot.mode === 'communications') {
    applyCommunicationsSnapshot(snapshot);
  } else {
    applyGenericSnapshot(snapshot);
  }
}

function controlPayload(element, kind, event = {}) {
  return {
    token: String(element?.dataset?.popoutControl || ''),
    kind,
    value: 'value' in (element || {}) ? String(element.value ?? '') : '',
    checked: Boolean(element?.checked),
    key: String(event.key || ''),
    deltaX: Number(event.deltaX) || 0,
    deltaY: Number(event.deltaY) || 0,
    shiftKey: Boolean(event.shiftKey),
    altKey: Boolean(event.altKey),
    ctrlKey: Boolean(event.ctrlKey),
    metaKey: Boolean(event.metaKey)
  };
}

function relayControl(element, kind, event = {}) {
  if (!element?.dataset?.popoutControl) return false;
  void window.nukefirePanel.action({
    panelId,
    action: 'control',
    control: controlPayload(element, kind, event)
  });
  return true;
}

$('#panel-mirror').addEventListener('click', (event) => {
  const control = event.target.closest?.('[data-popout-control]');
  if (!control || control.disabled) return;
  const formControlUsesChange = control.matches(
    'select, textarea, input:not([type="button"]):not([type="submit"]):not([type="reset"])'
  );
  if (formControlUsesChange) return;
  event.preventDefault();
  relayControl(control, 'click', event);
});
$('#panel-mirror').addEventListener('input', (event) => {
  const control = event.target.closest?.('[data-popout-control]');
  relayControl(control, 'input', event);
});
$('#panel-mirror').addEventListener('change', (event) => {
  const control = event.target.closest?.('[data-popout-control]');
  relayControl(control, 'change', event);
});
$('#panel-mirror').addEventListener('keydown', (event) => {
  const control = event.target.closest?.('[data-popout-control]');
  if (!control) return;
  if (relayControl(control, 'keydown', event) && control.id === 'mapper-canvas') {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', '+', '-', '=', 'c', 'C'].includes(event.key)) {
      event.preventDefault();
    }
  }
});
$('#panel-mirror').addEventListener('wheel', (event) => {
  const control = event.target.closest?.('[data-popout-control]');
  if (!control || control.id !== 'mapper-canvas') return;
  event.preventDefault();
  relayControl(control, 'wheel', event);
}, { passive: false });
$('#panel-mirror').addEventListener('submit', (event) => {
  event.preventDefault();
  const submitter = event.submitter?.closest?.('[data-popout-control]')
    || event.target.querySelector?.('[type="submit"][data-popout-control]');
  if (submitter && !submitter.disabled) relayControl(submitter, 'click', event);
});

$('#communications-order').addEventListener('change', (event) => {
  selectMessageOrder(event.currentTarget.value, true);
});
$('#communications-messages')?.addEventListener('scroll', (event) => {
  state.followLiveEdge = communicationsAtLiveEdge(event.currentTarget);
}, { passive: true });
$('#communications-search').addEventListener('input', () => renderMessages({ snapToLive: true }));
$('#communications-search').addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.currentTarget.value = '';
    renderMessages({ snapToLive: true });
    $('#communications-messages').focus({ preventScroll: true });
  }
});
$('#communications-clear').addEventListener('click', () => {
  state.messages = [];
  renderMessages();
  void window.nukefirePanel.action({ panelId, action: 'clear' });
});
$('#panel-size-toggle').addEventListener('click', () => {
  setSizeMenuOpen($('#panel-size-menu').hidden, { focusFirst: false });
});
for (const button of document.querySelectorAll('[data-window-size]')) {
  button.addEventListener('click', () => {
    const mode = String(button.dataset.windowSize || '');
    const label = String(button.textContent || 'Window size').trim();
    void requestWindowResize({ mode }, `${label} window size applied`);
  });
}
$('#custom-size-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const width = normalizedWindowDimension($('#custom-window-width').value, 440);
  const height = normalizedWindowDimension($('#custom-window-height').value, 340);
  void requestWindowResize({ mode: 'custom', width, height }, 'Custom window size applied');
});
document.addEventListener('pointerdown', (event) => {
  if ($('#panel-size-menu').hidden || event.target.closest?.('.popout-size-controller')) return;
  setSizeMenuOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape' || $('#panel-size-menu').hidden) return;
  event.preventDefault();
  setSizeMenuOpen(false, { restoreFocus: true });
});

$('#focus-game').addEventListener('click', () => {
  void window.nukefirePanel.action({ panelId, action: 'focus-main' });
});
$('#dock-panel').addEventListener('click', () => {
  void window.nukefirePanel.action({ panelId, action: 'dock' });
});
window.nukefirePanel.onState(applySnapshot);
window.nukefirePanel.onBounds?.(applyWindowBounds);
setWindowIdentity();
renderTabs();
renderMessageOrderControl();
renderMessages();
void window.nukefirePanel.ready(panelId).then((result) => {
  if (!result?.ok) {
    announce('The panel window could not connect to the main client.');
    return;
  }
  if (result.bounds) applyWindowBounds(result.bounds);
});
