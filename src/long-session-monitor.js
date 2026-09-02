(function exposeLongSessionMonitor(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireLongSessionMonitor = api;
})(typeof window !== 'undefined' ? window : globalThis, function createLongSessionMonitorApi() {
  'use strict';

  const DEFAULT_INTERVAL_MS = 10_000;
  const DEFAULT_MAX_SAMPLES = 4320;
  const REPORT_SAMPLE_LIMIT = 120;

  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function boundedInteger(value, minimum, maximum, fallback) {
    return Math.max(minimum, Math.min(maximum, Math.trunc(finite(value, fallback))));
  }

  function safeMetrics(value) {
    if (!value || typeof value !== 'object') return {};
    const result = {};
    for (const [key, candidate] of Object.entries(value)) {
      if (typeof candidate === 'boolean' || typeof candidate === 'string' || candidate === null) {
        result[key] = candidate;
      } else if (Number.isFinite(Number(candidate))) {
        result[key] = Number(candidate);
      }
    }
    return result;
  }

  function downsample(samples, limit = REPORT_SAMPLE_LIMIT) {
    if (samples.length <= limit) return samples.map((sample) => ({ ...sample }));
    const stride = Math.ceil(samples.length / limit);
    const result = [];
    for (let index = 0; index < samples.length; index += stride) result.push({ ...samples[index] });
    const latest = samples.at(-1);
    if (result.at(-1)?.timestamp !== latest?.timestamp) result.push({ ...latest });
    return result;
  }

  class LongSessionMonitor {
    constructor(options = {}) {
      this.intervalMs = boundedInteger(options.intervalMs, 1000, 60_000, DEFAULT_INTERVAL_MS);
      this.maxSamples = boundedInteger(options.maxSamples, 10, 20_000, DEFAULT_MAX_SAMPLES);
      this.now = typeof options.now === 'function' ? options.now : () => Date.now();
      this.clock = typeof options.clock === 'function'
        ? options.clock
        : () => (typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now());
      this.setInterval = options.setInterval || globalThis.setInterval?.bind(globalThis);
      this.clearInterval = options.clearInterval || globalThis.clearInterval?.bind(globalThis);
      this.onSample = typeof options.onSample === 'function' ? options.onSample : null;
      this.collector = null;
      this.timer = null;
      this.samples = [];
      this.startedAt = 0;
      this.expectedAt = 0;
      this.counters = this._emptyCounters();
      this.lastCounters = this._emptyCounters();
      this.gauges = this._emptyGauges();
    }

    _emptyCounters() {
      return {
        incomingBatches: 0,
        incomingCharacters: 0,
        incomingWorkMs: 0,
        terminalFlushes: 0,
        terminalFlushMs: 0,
        popoutPublishes: 0,
        popoutBytes: 0,
        popoutBuildMs: 0,
        popoutRenders: 0,
        popoutRenderMs: 0,
        mapperRenderCount: 0,
        mapperRenderMs: 0,
        mapperRoomNodesBuilt: 0,
        mapperEdgeNodesBuilt: 0,
        mapperEdgeSymbolsBuilt: 0,
        mapperReplaceChildrenCalls: 0,
        mapperSerializeCount: 0,
        mapperSerializeMs: 0,
        mapperSaveCount: 0,
        mapperSaveMs: 0
      };
    }

    _emptyGauges() {
      return {
        mapperRenderLastMs: 0,
        mapperRenderMaxMs: 0,
        mapperVisibleRooms: 0,
        mapperVisibleEdges: 0,
        mapperSerializeLastMs: 0,
        mapperSerializeMaxMs: 0,
        mapperSaveLastMs: 0,
        mapperSaveMaxMs: 0
      };
    }

    get active() {
      return this.timer !== null;
    }

    start(collector) {
      if (this.active) return false;
      if (typeof collector !== 'function') throw new TypeError('LongSessionMonitor requires a metric collector.');
      if (typeof this.setInterval !== 'function') throw new Error('LongSessionMonitor requires setInterval.');
      this.collector = collector;
      this.startedAt = this.now();
      this.expectedAt = this.clock() + this.intervalMs;
      this.lastCounters = { ...this.counters };
      this.sampleNow();
      this.timer = this.setInterval(() => this.sampleNow(), this.intervalMs);
      return true;
    }

    stop() {
      if (!this.active) return false;
      this.clearInterval?.(this.timer);
      this.timer = null;
      this.sampleNow();
      return true;
    }

    reset() {
      this.samples = [];
      this.startedAt = this.active ? this.now() : 0;
      this.expectedAt = this.clock() + this.intervalMs;
      this.counters = this._emptyCounters();
      this.lastCounters = this._emptyCounters();
      this.gauges = this._emptyGauges();
    }

    noteIncoming(characters, durationMs = 0) {
      if (!this.active) return;
      this.counters.incomingBatches += 1;
      this.counters.incomingCharacters += Math.max(0, finite(characters));
      this.counters.incomingWorkMs += Math.max(0, finite(durationMs));
    }

    noteTerminalFlush(durationMs = 0) {
      if (!this.active) return;
      this.counters.terminalFlushes += 1;
      this.counters.terminalFlushMs += Math.max(0, finite(durationMs));
    }

    notePopoutPublish(panelId, bytes, durationMs = 0) {
      if (!this.active) return;
      this.counters.popoutPublishes += 1;
      this.counters.popoutBytes += Math.max(0, finite(bytes));
      this.counters.popoutBuildMs += Math.max(0, finite(durationMs));
      const safeId = String(panelId || 'unknown').replace(/[^a-z0-9]+/giu, '_').replace(/^_|_$/gu, '') || 'unknown';
      const key = `popout_${safeId}_publishes`;
      this.counters[key] = finite(this.counters[key]) + 1;
    }

    notePopoutRender(panelId, durationMs = 0) {
      if (!this.active) return;
      this.counters.popoutRenders += 1;
      this.counters.popoutRenderMs += Math.max(0, finite(durationMs));
      const safeId = String(panelId || 'unknown').replace(/[^a-z0-9]+/giu, '_').replace(/^_|_$/gu, '') || 'unknown';
      const key = `popout_${safeId}_render_ms`;
      this.counters[key] = finite(this.counters[key]) + Math.max(0, finite(durationMs));
    }

    noteMapperRender(metrics = {}) {
      if (!this.active) return;
      const durationMs = Math.max(0, finite(metrics.durationMs));
      const visibleRooms = Math.max(0, finite(metrics.visibleRooms));
      const visibleEdges = Math.max(0, finite(metrics.visibleEdges));
      this.counters.mapperRenderCount += 1;
      this.counters.mapperRenderMs += durationMs;
      this.counters.mapperRoomNodesBuilt += Math.max(0, finite(metrics.roomNodesBuilt));
      this.counters.mapperEdgeNodesBuilt += Math.max(0, finite(metrics.edgeNodesBuilt));
      this.counters.mapperEdgeSymbolsBuilt += Math.max(0, finite(metrics.edgeSymbolsBuilt));
      this.counters.mapperReplaceChildrenCalls += Math.max(0, finite(metrics.replaceChildrenCalls));
      this.gauges.mapperRenderLastMs = durationMs;
      this.gauges.mapperRenderMaxMs = Math.max(this.gauges.mapperRenderMaxMs, durationMs);
      this.gauges.mapperVisibleRooms = visibleRooms;
      this.gauges.mapperVisibleEdges = visibleEdges;
    }

    noteMapSave(metrics = {}) {
      if (!this.active) return;
      const durationMs = Math.max(0, finite(metrics.durationMs));
      const serializeMs = Math.max(0, finite(metrics.serializeMs));
      this.counters.mapperSaveCount += 1;
      this.counters.mapperSaveMs += durationMs;
      this.counters.mapperSerializeCount += serializeMs > 0 ? 1 : 0;
      this.counters.mapperSerializeMs += serializeMs;
      this.gauges.mapperSaveLastMs = durationMs;
      this.gauges.mapperSaveMaxMs = Math.max(this.gauges.mapperSaveMaxMs, durationMs);
      this.gauges.mapperSerializeLastMs = serializeMs;
      this.gauges.mapperSerializeMaxMs = Math.max(this.gauges.mapperSerializeMaxMs, serializeMs);
    }

    sampleNow() {
      if (typeof this.collector !== 'function') return null;
      const clockNow = this.clock();
      const counters = {};
      for (const [key, value] of Object.entries(this.counters)) {
        counters[key] = Math.max(0, value - finite(this.lastCounters[key]));
      }
      this.lastCounters = { ...this.counters };
      const sample = {
        timestamp: this.now(),
        elapsedMs: Math.max(0, this.now() - this.startedAt),
        eventLoopDelayMs: Math.max(0, clockNow - this.expectedAt),
        ...safeMetrics(this.collector()),
        ...counters,
        ...this.gauges
      };
      this.expectedAt = clockNow + this.intervalMs;
      this.samples.push(sample);
      if (this.samples.length > this.maxSamples) {
        this.samples.splice(0, this.samples.length - this.maxSamples);
      }
      this.onSample?.(Object.freeze({ ...sample }));
      return Object.freeze({ ...sample });
    }

    report(metadata = {}) {
      const numericKeys = new Set();
      for (const sample of this.samples) {
        for (const [key, value] of Object.entries(sample)) {
          if (Number.isFinite(value) && key !== 'timestamp') numericKeys.add(key);
        }
      }
      const peaks = {};
      for (const key of numericKeys) {
        peaks[key] = this.samples.reduce((maximum, sample) => Math.max(maximum, finite(sample[key])), 0);
      }
      return {
        schema: 1,
        generatedAt: new Date(this.now()).toISOString(),
        active: this.active,
        intervalMs: this.intervalMs,
        maximumSamples: this.maxSamples,
        retainedSamples: this.samples.length,
        metadata: safeMetrics(metadata),
        first: this.samples[0] ? { ...this.samples[0] } : null,
        latest: this.samples.at(-1) ? { ...this.samples.at(-1) } : null,
        peaks,
        samples: downsample(this.samples)
      };
    }
  }

  return Object.freeze({
    DEFAULT_INTERVAL_MS,
    DEFAULT_MAX_SAMPLES,
    REPORT_SAMPLE_LIMIT,
    LongSessionMonitor,
    downsample
  });
});
