(function attachSelfVoice(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireSelfVoice = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createSelfVoiceApi() {
  'use strict';

  const MAX_UTTERANCE_CHARACTERS = 4000;
  const DEFAULT_GOVERNOR_GRACE_MS = 1200;
  const DEFAULT_GOVERNOR_BURST_LINES = 200;
  const DEFAULT_GOVERNOR_TAIL_LINES = 6;
  const DEFAULT_SPEECH_RATE = 1;
  const DEFAULT_SPEECH_PITCH = 1;
  const DEFAULT_SPEECH_VOLUME = 1;
  const MIN_SPEECH_RATE = 0.1;
  const MAX_SPEECH_RATE = 10;
  const MIN_SPEECH_PITCH = 0;
  const MAX_SPEECH_PITCH = 2;
  const MIN_SPEECH_VOLUME = 0;
  const MAX_SPEECH_VOLUME = 1;

  function decorativeSpeechLine(value) {
    const text = String(value ?? '').replaceAll('\r', '').trim();
    if (text.length < 3) return false;
    return !/[\p{L}\p{N}]/u.test(text) && /^[\p{P}\p{S}\s]+$/u.test(text);
  }

  function cleanSpeechText(value) {
    const text = String(value ?? '')
      .replaceAll('\r', '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, '')
      .trim()
      .slice(0, MAX_UTTERANCE_CHARACTERS);
    return decorativeSpeechLine(text) ? '' : text;
  }

  function backlogNotice(count) {
    const total = Math.max(1, Number(count) || 1);
    return `${total.toLocaleString()} ${total === 1 ? 'line' : 'lines'} condensed.`;
  }

  function clampNumber(value, minimum, maximum, fallback) {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(maximum, Math.max(minimum, parsed));
  }

  function normalizeVoiceSettings(input = {}) {
    return {
      rate: clampNumber(input.rate, MIN_SPEECH_RATE, MAX_SPEECH_RATE, DEFAULT_SPEECH_RATE),
      pitch: clampNumber(input.pitch, MIN_SPEECH_PITCH, MAX_SPEECH_PITCH, DEFAULT_SPEECH_PITCH),
      volume: clampNumber(input.volume, MIN_SPEECH_VOLUME, MAX_SPEECH_VOLUME, DEFAULT_SPEECH_VOLUME),
      voiceId: String(input.voiceId || '').trim().slice(0, 512)
    };
  }

  function priorityBacklogNotice(count) {
    const total = Math.max(1, Number(count) || 1);
    return `Priority message interrupted ${total.toLocaleString()} pending ${total === 1 ? 'line' : 'lines'}. Full text remains in Reader Review.`;
  }

  class SelfVoiceController {
    constructor(options = {}) {
      this.synth = options.synth || null;
      this.Utterance = options.Utterance || null;
      this.clock = typeof options.clock === 'function' ? options.clock : () => Date.now();
      this.governorGraceMs = Math.max(0, Number(options.governorGraceMs) || DEFAULT_GOVERNOR_GRACE_MS);
      this.governorBurstLines = Math.max(1, Number(options.governorBurstLines) || DEFAULT_GOVERNOR_BURST_LINES);
      this.governorTailLines = Math.max(1, Number(options.governorTailLines) || DEFAULT_GOVERNOR_TAIL_LINES);
      this.enabled = false;
      this.muted = false;
      this.foreground = true;
      this.governorEnabled = false;
      this.carry = '';
      this.sessionId = '';
      this.lastError = '';
      this.liveQueue = [];
      this.liveSpeaking = false;
      this.liveGeneration = 0;
      this.burstStartedAt = null;
      this.floodMode = false;
      this.suppressedLines = 0;
      this.summaryWasLast = false;
      this.voiceSettings = normalizeVoiceSettings(options.voiceSettings);
      this.voice = options.voice || null;
    }

    available() {
      return Boolean(
        this.synth
        && typeof this.synth.speak === 'function'
        && typeof this.synth.cancel === 'function'
        && typeof this.Utterance === 'function'
      );
    }

    setEnabled(value) {
      const next = Boolean(value);
      if (next && !this.available()) {
        this.enabled = false;
        return false;
      }
      if (!next) this.stop();
      this.enabled = next;
      return this.enabled;
    }

    setMuted(value) {
      const next = Boolean(value);
      if (next === this.muted) return this.muted;
      if (next) this.stop();
      this.muted = next;
      return this.muted;
    }


    muteWithAnnouncement(value = 'NukeFire self-voice muted.') {
      const text = cleanSpeechText(value);
      if (this.muted) return false;
      if (!this.enabled || !this.foreground || !text || !this.available()) {
        this.setMuted(true);
        return false;
      }
      this._resetManagedSpeech({ clearSuppressed: true, cancelSpeech: true });
      this.muted = true;
      try {
        if (this.synth.paused === true && typeof this.synth.resume === 'function') this.synth.resume();
        const utterance = this._configureUtterance(new this.Utterance(text));
        this.synth.speak(utterance);
        this.lastError = '';
        return true;
      } catch (error) {
        this.lastError = String(error?.message || error || 'Self-voice backend failure.');
        return false;
      }
    }

    setForeground(value) {
      const next = Boolean(value);
      if (next === this.foreground) return this.foreground;
      if (!next) this.stop();
      this.foreground = next;
      return this.foreground;
    }

    setVoiceSettings(input = {}) {
      this.voiceSettings = normalizeVoiceSettings({ ...this.voiceSettings, ...input });
      return { ...this.voiceSettings };
    }

    setVoice(voice) {
      this.voice = voice && typeof voice === 'object' ? voice : null;
      return this.voice;
    }

    _configureUtterance(utterance) {
      if (!utterance) return utterance;
      utterance.rate = this.voiceSettings.rate;
      utterance.pitch = this.voiceSettings.pitch;
      utterance.volume = this.voiceSettings.volume;
      if (this.voice) utterance.voice = this.voice;
      return utterance;
    }

    setGovernorEnabled(value) {
      const next = Boolean(value);
      if (next === this.governorEnabled) return this.governorEnabled;
      this._resetManagedSpeech({ clearSuppressed: true, cancelSpeech: true });
      this.governorEnabled = next;
      return this.governorEnabled;
    }

    setSession(sessionId) {
      const next = String(sessionId || '');
      if (next === this.sessionId) return false;
      this.stop();
      this.sessionId = next;
      return true;
    }

    speak(value, options = {}) {
      const text = cleanSpeechText(value);
      if (!this.enabled || this.muted || !this.foreground || !text || !this.available()) return false;
      try {
        if (options.interrupt === true) {
          this._resetManagedSpeech({ clearSuppressed: false, cancelSpeech: true });
        }
        if (this.synth.paused === true && typeof this.synth.resume === 'function') this.synth.resume();
        const utterance = this._configureUtterance(new this.Utterance(text));
        this.synth.speak(utterance);
        this.lastError = '';
        return true;
      } catch (error) {
        this.lastError = String(error?.message || error || 'Self-voice backend failure.');
        return false;
      }
    }

    write(value, options = {}) {
      if (!this.enabled || this.muted || !this.foreground) {
        this.carry = '';
        return [];
      }
      const source = `${this.carry}${String(value ?? '').replaceAll('\r', '')}`;
      const parts = source.split('\n');
      this.carry = parts.pop() || '';
      const spoken = [];
      for (const part of parts) {
        const text = cleanSpeechText(part);
        if (!text) continue;
        const priority = typeof options.isPriorityLine === 'function'
          ? options.isPriorityLine(text) === true
          : false;
        if (priority) {
          if (this.speakPriority(text)) spoken.push(text);
        } else if (this.governorEnabled) {
          this._queueGovernedLine(text);
          spoken.push(text);
        } else if (this.speak(text)) {
          spoken.push(text);
        }
      }
      return spoken;
    }


    speakPriority(value) {
      const text = cleanSpeechText(value);
      if (!this.enabled || this.muted || !this.foreground || !text || !this.available()) return false;

      if (!this.governorEnabled) {
        try {
          this.synth.cancel();
        } catch (error) {
          this.lastError = String(error?.message || error || 'Self-voice backend failure.');
          return false;
        }
        return this.speak(text);
      }

      const interrupted = this.liveQueue.length + this.suppressedLines + (this.liveSpeaking ? 1 : 0);
      this._resetManagedSpeech({ clearSuppressed: true, cancelSpeech: true });
      const spoken = this._speakManaged(text);
      if (spoken && interrupted > 0) this.liveQueue.unshift(priorityBacklogNotice(interrupted));
      return spoken;
    }

    commitBoundary() {
      if (!this.enabled || this.muted || !this.foreground) {
        this.carry = '';
        return false;
      }
      const text = cleanSpeechText(this.carry);
      this.carry = '';
      if (!text) return false;
      if (this.governorEnabled) {
        this._queueGovernedLine(text);
        return true;
      }
      return this.speak(text);
    }

    interrupt() {
      if (!this.available()) return false;
      return this._resetManagedSpeech({ clearSuppressed: false, cancelSpeech: true });
    }

    stop() {
      this.carry = '';
      return this._resetManagedSpeech({ clearSuppressed: true, cancelSpeech: true });
    }

    _queueGovernedLine(text) {
      const now = Number(this.clock()) || 0;
      if (this.burstStartedAt === null && !this.liveSpeaking && this.liveQueue.length === 0) {
        this.burstStartedAt = now;
      }

      const backlogExists = this.liveSpeaking || this.liveQueue.length > 0;
      const burstAge = this.burstStartedAt === null ? 0 : Math.max(0, now - this.burstStartedAt);
      const backlogLines = this.liveQueue.length + (this.liveSpeaking ? 1 : 0);
      if (!this.floodMode && backlogExists
        && (burstAge >= this.governorGraceMs || backlogLines >= this.governorBurstLines)) {
        this._enterFloodMode();
      }

      if (this.floodMode) {
        while (this.liveQueue.length >= this.governorTailLines) {
          this.liveQueue.shift();
          this.suppressedLines += 1;
        }
      }
      this.liveQueue.push(text);
      this._drainGovernedSpeech();
    }

    _enterFloodMode() {
      if (this.floodMode) return;
      this.floodMode = true;
      while (this.liveQueue.length > this.governorTailLines) {
        this.liveQueue.shift();
        this.suppressedLines += 1;
      }
    }

    _drainGovernedSpeech() {
      if (!this.enabled || this.muted || !this.foreground || !this.governorEnabled || !this.available() || this.liveSpeaking) return false;

      if (this.suppressedLines > 0 && !this.summaryWasLast) {
        const count = this.suppressedLines;
        this.suppressedLines = 0;
        this.summaryWasLast = true;
        return this._speakManaged(backlogNotice(count));
      }

      /* One short condensation notice per sustained burst is enough.  If more
       * lines are suppressed after that notice, keep the complete text in
       * Reader Review but do not narrate queue bookkeeping again. */
      if (this.suppressedLines > 0 && this.summaryWasLast && this.liveQueue.length === 0)
        this.suppressedLines = 0;

      const text = this.liveQueue.shift();
      if (!text) {
        this._finishBurstIfIdle();
        return false;
      }
      return this._speakManaged(text);
    }

    _speakManaged(text) {
      const generation = ++this.liveGeneration;
      try {
        if (this.synth.paused === true && typeof this.synth.resume === 'function') this.synth.resume();
        const utterance = this._configureUtterance(new this.Utterance(text));
        this.liveSpeaking = true;
        utterance.onend = () => this._finishManagedUtterance(generation);
        utterance.onerror = () => this._finishManagedUtterance(generation);
        this.synth.speak(utterance);
        this.lastError = '';
        return true;
      } catch (error) {
        if (generation === this.liveGeneration) this.liveSpeaking = false;
        this.lastError = String(error?.message || error || 'Self-voice backend failure.');
        return false;
      }
    }

    _finishManagedUtterance(generation) {
      if (generation !== this.liveGeneration) return;
      this.liveSpeaking = false;
      this._drainGovernedSpeech();
    }

    _finishBurstIfIdle() {
      if (this.liveSpeaking || this.liveQueue.length > 0 || this.suppressedLines > 0) return;
      this.burstStartedAt = null;
      this.floodMode = false;
      this.summaryWasLast = false;
    }

    _resetManagedSpeech(options = {}) {
      const clearSuppressed = options.clearSuppressed === true;
      this.liveGeneration += 1;
      this.liveSpeaking = false;
      this.liveQueue = [];
      this.burstStartedAt = null;
      this.floodMode = false;
      this.summaryWasLast = false;
      if (clearSuppressed) this.suppressedLines = 0;
      if (options.cancelSpeech !== true || !this.available()) return false;
      try {
        this.synth.cancel();
        this.lastError = '';
        return true;
      } catch (error) {
        this.lastError = String(error?.message || error || 'Self-voice backend failure.');
        return false;
      }
    }
  }

  return {
    MAX_UTTERANCE_CHARACTERS,
    DEFAULT_GOVERNOR_GRACE_MS,
    DEFAULT_GOVERNOR_BURST_LINES,
    DEFAULT_GOVERNOR_TAIL_LINES,
    DEFAULT_SPEECH_RATE,
    DEFAULT_SPEECH_PITCH,
    DEFAULT_SPEECH_VOLUME,
    MIN_SPEECH_RATE,
    MAX_SPEECH_RATE,
    MIN_SPEECH_PITCH,
    MAX_SPEECH_PITCH,
    MIN_SPEECH_VOLUME,
    MAX_SPEECH_VOLUME,
    normalizeVoiceSettings,
    cleanSpeechText,
    decorativeSpeechLine,
    backlogNotice,
    priorityBacklogNotice,
    SelfVoiceController
  };
});
