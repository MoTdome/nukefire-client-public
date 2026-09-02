'use strict';

function installFakeXterm(dom, options = {}) {
  const instances = [];
  const window = dom.window;

  class FakeXtermAdapter {
    constructor(config = {}) {
      this.config = config;
      this.container = config.container;
      this.ready = false;
      this.calls = [];
      this.dimensions = options.dimensions || { width: 100, height: 36 };
      this.monochrome = false;
      this.selection = String(options.selection || '');
      instances.push(this);
    }

    initialize() {
      this.calls.push(['initialize']);
      this.ready = options.initialize !== false;
      if (this.ready) this.container?.classList?.add('fake-xterm-ready');
      return this.ready;
    }

    setTheme(theme, monochrome) {
      this.calls.push(['setTheme', theme, monochrome]);
      this.monochrome = Boolean(monochrome);
    }
    setFontSize(value) { this.calls.push(['setFontSize', value]); }
    setFontFamily(value) { this.calls.push(['setFontFamily', value]); }
    setCompact(value) { this.calls.push(['setCompact', value]); }
    setScreenReaderMode(value) { this.calls.push(['setScreenReaderMode', value]); }
    fit() { this.calls.push(['fit']); return this.ready; }
    size() { return this.dimensions; }
    focus() { this.calls.push(['focus']); this.container?.focus?.(); }
    getSelection() { return this.selection; }
    hasSelection() { return Boolean(this.selection); }
    clearSelection() { this.calls.push(['clearSelection']); this.selection = ''; }
    setSelection(value) { this.selection = String(value || ''); }
    isAtLiveBottom() {
      if (typeof options.atLiveBottom === 'boolean') return options.atLiveBottom;
      const scrollHeight = Number(this.container?.scrollHeight) || 0;
      const scrollTop = Number(this.container?.scrollTop) || 0;
      const clientHeight = Number(this.container?.clientHeight) || 0;
      return scrollHeight - scrollTop - clientHeight < 90;
    }
    scrollToBottom() {
      this.calls.push(['scrollToBottom']);
      if (this.container) this.container.scrollTop = Number(this.container.scrollHeight) || 0;
      this.config.onScroll?.(true);
    }
    clear() {
      this.calls.push(['clear']);
      this.container?.replaceChildren?.();
    }
    findNext(query, config) {
      this.calls.push(['findNext', query, config]);
      return String(this.container?.textContent || '').toLocaleLowerCase().includes(String(query).toLocaleLowerCase());
    }
    findPrevious(query, config) {
      this.calls.push(['findPrevious', query, config]);
      return this.findNext(query, config);
    }

    _appendRuns(runs, replace = false, config = {}) {
      if (!this.container) return;
      if (replace) this.container.replaceChildren();
      const fragment = window.document.createDocumentFragment();
      for (const run of runs || []) {
        const text = String(run?.text || '');
        if (!text) continue;
        const span = window.document.createElement('span');
        span.textContent = text;
        if (run.kind === 'error') {
          span.style.color = 'rgb(255, 107, 104)';
          span.style.fontStyle = 'italic';
        } else if (run.kind === 'system') {
          span.style.color = 'rgb(145, 160, 174)';
          span.style.fontStyle = 'italic';
        } else if (run.style && window.NukeFireAnsi?.styleToCss && !this.monochrome) {
          Object.assign(span.style, window.NukeFireAnsi.styleToCss(run.style));
        }
        fragment.append(span);
      }
      if (fragment.childNodes.length) this.container.append(fragment);
      if (config.follow) this.scrollToBottom();
    }

    replaceRuns(runs, config = {}) {
      this.calls.push(['replaceRuns', JSON.parse(JSON.stringify(runs || [])), config]);
      this._appendRuns(runs, true, config);
    }
    writeRuns(runs, config = {}) {
      this.calls.push(['writeRuns', JSON.parse(JSON.stringify(runs || [])), config]);
      this._appendRuns(runs, false, config);
    }
    writeAnsi(text, config = {}) {
      this.calls.push(['writeAnsi', String(text), config]);
      const span = window.document.createElement('span');
      span.textContent = String(text);
      this.container?.append?.(span);
      if (config.follow) this.scrollToBottom();
    }
  }

  window.NukeFireXterm = {
    XtermTerminalAdapter: FakeXtermAdapter
  };
  return instances;
}

module.exports = { installFakeXterm };
