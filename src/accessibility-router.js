'use strict';

(function exposeAccessibilityRouter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireAccessibilityRouter = api;
})(typeof window !== 'undefined' ? window : globalThis, function createAccessibilityRouterApi() {
  const MAX_EVENTS = 256;
  const MAX_DECISIONS = 16;
  const MAX_TEXT = 700;
  const COLLAPSE_WINDOW_MS = 900;
  const PRIORITY = Object.freeze({ low: 20, normal: 50, high: 80, critical: 100 });
  const CATEGORY_LABELS = Object.freeze({
    communication: 'Communications',
    combat: 'Combat',
    damage: 'Damage',
    navigation: 'Navigation',
    loot: 'Loot',
    crafting: 'Crafting',
    quest: 'Quests',
    safety: 'Safety',
    vitals: 'Vitals',
    system: 'System',
    client: 'Client'
  });

  function clean(value, maximum = MAX_TEXT) {
    return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, '').trim().slice(0, maximum);
  }

  function cleanId(value, maximum = 96) {
    return clean(value, maximum).toLowerCase().replace(/[^a-z0-9._:-]+/gu, '-').replace(/^-+|-+$/gu, '');
  }

  function normalizeCategory(value) {
    const id = cleanId(value, 32);
    return Object.hasOwn(CATEGORY_LABELS, id) ? id : 'system';
  }

  function priorityNumber(value) {
    if (typeof value === 'string' && Object.hasOwn(PRIORITY, value.toLowerCase())) return PRIORITY[value.toLowerCase()];
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(100, Math.trunc(number))) : PRIORITY.normal;
  }

  function priorityLabel(value) {
    const number = priorityNumber(value);
    if (number >= PRIORITY.critical) return 'critical';
    if (number >= PRIORITY.high) return 'high';
    if (number <= PRIORITY.low) return 'low';
    return 'normal';
  }

  function categoryForEvent(eventValue) {
    const event = cleanId(eventValue);
    if (/^(communication\.|tell\.|group\.)/u.test(event)) return 'communication';
    if (/^(combat\.|proc\.|damage\.|death\.|kill\.)/u.test(event)) return 'combat';
    if (/^(room\.|door\.|path\.|gps\.|movement\.|exit\.)/u.test(event)) return 'navigation';
    if (/^(loot\.|object\.|equipment\.|shop\.|credits\.|material\.)/u.test(event)) return 'loot';
    if (/^(craft\.|crafting\.|recipe\.)/u.test(event)) return 'crafting';
    if (/^(quest\.|mission\.)/u.test(event)) return 'quest';
    if (/^(health\.|mana\.|move\.|vitals\.|group-critical)/u.test(event)) return 'vitals';
    if (/^(danger\.|safety\.|warning\.|alert\.)/u.test(event)) return 'safety';
    if (/^(client\.)/u.test(event)) return 'client';
    return 'system';
  }

  function eventTextFromSound(eventValue, body = {}) {
    const event = cleanId(eventValue);
    const explicit = clean(body.text || body.message || body.label || '', 400);
    if (explicit) return explicit;
    return event ? event.replace(/[._:-]+/gu, ' ') : '';
  }

  function eventFromGmcp(packageNameValue, body = {}) {
    const packageName = clean(packageNameValue, 96);
    if (!packageName) return null;
    if (packageName === 'NukeFire.Sound.Event') {
      const event = cleanId(body?.event);
      if (!event) return null;
      return {
        event,
        category: categoryForEvent(event),
        text: eventTextFromSound(event, body),
        source: 'gmcp:NukeFire.Sound.Event',
        priority: /(?:critical|danger|death|low-health|health-low)/u.test(event) ? 'critical' : 'normal'
      };
    }
    if (packageName === 'NukeFire.Loot.Event') {
      const kind = cleanId(body?.kind || body?.category || 'item');
      const item = clean(body?.item?.name || body?.name || body?.item_name || '', 220);
      const credits = Number(body?.amount || body?.credits || 0);
      return {
        event: `loot.${kind || 'item'}`,
        category: 'loot',
        text: item || (credits ? `${credits.toLocaleString()} credits` : 'Loot received'),
        source: 'gmcp:NukeFire.Loot.Event',
        priority: 'low'
      };
    }
    if (packageName === 'NukeFire.Combat') {
      const kills = Number(body?.out?.kills || 0);
      const incoming = Number(body?.in?.damage || 0);
      const outgoing = Number(body?.out?.damage || 0);
      if (!kills && !incoming && !outgoing) return null;
      return {
        event: kills ? 'combat.kill' : 'combat.summary',
        category: 'combat',
        text: kills ? `${kills} kill${kills === 1 ? '' : 's'}` : `Outgoing ${outgoing}; incoming ${incoming}`,
        source: 'gmcp:NukeFire.Combat',
        priority: kills ? 'high' : 'normal'
      };
    }
    if (packageName === 'Room.Info') {
      const name = clean(body?.name || body?.room_name || '', 220);
      if (!name) return null;
      return { event: 'room.enter', category: 'navigation', text: name, source: 'gmcp:Room.Info', priority: 'normal' };
    }
    return null;
  }

  function cloneEvent(event) {
    if (!event) return null;
    return {
      id: event.id,
      event: event.event,
      category: event.category,
      categoryLabel: CATEGORY_LABELS[event.category] || 'System',
      text: event.text,
      source: event.source,
      priority: event.priority,
      priorityLabel: priorityLabel(event.priority),
      firstAt: event.firstAt,
      lastAt: event.lastAt,
      count: event.count,
      decisions: event.decisions.map((item) => ({ ...item }))
    };
  }

  class AccessibilityPresentationJournal {
    constructor(options = {}) {
      this.maxEvents = Math.max(32, Math.min(1024, Math.trunc(Number(options.maxEvents) || MAX_EVENTS)));
      this.collapseWindowMs = Math.max(100, Math.min(5000, Math.trunc(Number(options.collapseWindowMs) || COLLAPSE_WINDOW_MS)));
      this.events = [];
      this.nextId = 1;
    }

    record(input = {}) {
      const now = Number(input.timestamp) || Date.now();
      const eventName = cleanId(input.event || input.id || 'system.event');
      const category = normalizeCategory(input.category || categoryForEvent(eventName));
      const text = clean(input.text || eventName.replace(/[._:-]+/gu, ' '), MAX_TEXT);
      const source = clean(input.source || 'client', 120);
      const priority = priorityNumber(input.priority);
      const previous = this.events.at(-1);
      if (previous && previous.event === eventName && previous.text === text && previous.source === source && now - previous.lastAt <= this.collapseWindowMs) {
        previous.lastAt = now;
        previous.count = Math.min(9999, previous.count + 1);
        previous.priority = Math.max(previous.priority, priority);
        return cloneEvent(previous);
      }
      const stored = {
        id: this.nextId++, event: eventName || 'system.event', category, text, source, priority,
        firstAt: now, lastAt: now, count: 1, decisions: []
      };
      this.events.push(stored);
      if (this.events.length > this.maxEvents) this.events.splice(0, this.events.length - this.maxEvents);
      return cloneEvent(stored);
    }

    decision(eventIdValue, presentationValue, outcomeValue, reasonValue = '', detailValue = '') {
      const eventId = Number(eventIdValue);
      const event = this.events.find((item) => item.id === eventId) || this.events.at(-1);
      if (!event) return null;
      const presentation = cleanId(presentationValue, 32) || 'presentation';
      const outcome = cleanId(outcomeValue, 32) || 'unknown';
      const decision = {
        presentation,
        outcome,
        reason: clean(reasonValue, 400),
        detail: clean(detailValue, 400),
        at: Date.now()
      };
      event.decisions.push(decision);
      if (event.decisions.length > MAX_DECISIONS) event.decisions.splice(0, event.decisions.length - MAX_DECISIONS);
      return { ...decision };
    }

    last() { return cloneEvent(this.events.at(-1)); }

    lastSuppressed() {
      for (let i = this.events.length - 1; i >= 0; i -= 1) {
        const event = this.events[i];
        for (let j = event.decisions.length - 1; j >= 0; j -= 1) {
          const decision = event.decisions[j];
          if (['blocked', 'suppressed', 'disabled', 'deduped', 'unavailable'].includes(decision.outcome)) {
            return { event: cloneEvent(event), decision: { ...decision } };
          }
        }
      }
      return null;
    }

    clear() { this.events.length = 0; this.nextId = 1; }
    snapshot() { return this.events.map(cloneEvent); }
  }

  function describeEvent(event) {
    if (!event) return 'No meaningful accessibility event has been recorded yet.';
    const repeated = event.count > 1 ? `, repeated ${event.count} times` : '';
    return `Last event: ${event.event}. ${event.categoryLabel}. ${event.priorityLabel} priority${repeated}. ${event.text}`;
  }

  function describeWhy(entry) {
    if (!entry?.event || !entry?.decision) return 'No suppressed presentation has been recorded yet.';
    const { event, decision } = entry;
    const reason = decision.reason || decision.detail || 'no reason was recorded';
    return `Last suppressed presentation: ${event.event}. ${decision.presentation} ${decision.outcome}: ${reason}`;
  }

  function capabilitySnapshot(input = {}) {
    return {
      schema: 1,
      semanticJournal: true,
      lastEvent: true,
      why: true,
      reports: true,
      profiles: true,
      selfTest: true,
      doctor: true,
      universalReview: true,
      priorityCollapse: true,
      soundpackEvents: input.soundpackEvents !== false,
      nativeReader: input.nativeReader !== false,
      selfVoice: input.selfVoice !== false,
      braille: false
    };
  }

  return Object.freeze({
    MAX_EVENTS, COLLAPSE_WINDOW_MS, PRIORITY, CATEGORY_LABELS,
    AccessibilityPresentationJournal,
    normalizeCategory,
    categoryForEvent,
    priorityNumber,
    priorityLabel,
    eventFromGmcp,
    describeEvent,
    describeWhy,
    capabilitySnapshot
  });
});
