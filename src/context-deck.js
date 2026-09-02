(function contextDeckModule(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireContext = api;
}(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const MAX_CONTEXTS = 12;
  const MAX_STATUS_ROWS = 16;
  const MAX_ACTIONS = 24;
  const MAX_ARGUMENTS = 6;
  const MAX_OPTIONS = 24;

  function cleanText(value, maximum = 240) {
    return String(value ?? '')
      .normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f]/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, maximum);
  }

  function cleanIdentifier(value, fallback = '') {
    const text = cleanText(value, 80)
      .toLocaleLowerCase()
      .replace(/[^a-z0-9_-]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .slice(0, 64);
    return ['__proto__', 'constructor', 'prototype'].includes(text)
      ? fallback
      : (text || fallback);
  }

  function finiteInteger(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : fallback;
  }

  function optionalInteger(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : null;
  }

  function normalizeOption(input) {
    if (input === null || input === undefined) return null;
    const source = typeof input === 'object' ? input : { value: input, label: input };
    const value = cleanText(source.value, 80);
    if (!value) return null;
    return {
      value,
      label: cleanText(source.label || value, 100) || value
    };
  }

  function normalizeArgument(input, index = 0) {
    if (!input || typeof input !== 'object') return null;
    const type = ['text', 'number', 'select'].includes(input.type) ? input.type : 'text';
    const id = cleanIdentifier(input.id || input.name, `argument-${index + 1}`);
    const options = type === 'select'
      ? (Array.isArray(input.options) ? input.options : [])
        .slice(0, MAX_OPTIONS)
        .map(normalizeOption)
        .filter(Boolean)
      : [];
    const minimum = optionalInteger(input.min);
    const maximum = optionalInteger(input.max);
    return {
      id,
      label: cleanText(input.label || input.name || `Argument ${index + 1}`, 100),
      type,
      required: Boolean(input.required),
      placeholder: cleanText(input.placeholder, 120),
      help: cleanText(input.help, 240),
      min: minimum,
      max: maximum,
      maxLength: Math.max(1, Math.min(240, finiteInteger(input.maxLength, 80))),
      options
    };
  }

  function normalizeAction(input, index = 0) {
    if (!input || typeof input !== 'object') return null;
    const command = cleanText(input.command, 160);
    const label = cleanText(input.label, 100);
    if (!command || !label) return null;
    const args = (Array.isArray(input.arguments) ? input.arguments : [])
      .slice(0, MAX_ARGUMENTS)
      .map((argument, argumentIndex) => normalizeArgument(argument, argumentIndex))
      .filter(Boolean);
    return {
      id: cleanIdentifier(input.id, `action-${index + 1}`),
      label,
      command,
      help: cleanText(input.help, 300),
      style: ['primary', 'danger'].includes(input.style) ? input.style : 'default',
      enabled: input.enabled !== false,
      disabledReason: cleanText(input.disabledReason, 240),
      confirm: cleanText(input.confirm, 300),
      arguments: args
    };
  }

  function normalizeStatus(input, index = 0) {
    if (!input || typeof input !== 'object') return null;
    const label = cleanText(input.label || `Status ${index + 1}`, 100);
    const value = cleanText(input.value, 200);
    if (!label || !value) return null;
    return {
      label,
      value,
      tone: ['good', 'warning', 'danger'].includes(input.tone) ? input.tone : 'neutral'
    };
  }

  function normalizeContext(input, index = 0) {
    if (!input || typeof input !== 'object') return null;
    const title = cleanText(input.title, 120);
    if (!title) return null;
    return {
      id: cleanIdentifier(input.id, `context-${index + 1}`),
      kind: cleanIdentifier(input.kind, 'general'),
      title,
      summary: cleanText(input.summary, 500),
      priority: finiteInteger(input.priority, 0),
      status: (Array.isArray(input.status) ? input.status : [])
        .slice(0, MAX_STATUS_ROWS)
        .map((row, rowIndex) => normalizeStatus(row, rowIndex))
        .filter(Boolean),
      actions: (Array.isArray(input.actions) ? input.actions : [])
        .slice(0, MAX_ACTIONS)
        .map((action, actionIndex) => normalizeAction(action, actionIndex))
        .filter(Boolean)
    };
  }

  function normalizeContextState(input = {}) {
    const contexts = (Array.isArray(input.contexts) ? input.contexts : [])
      .slice(0, MAX_CONTEXTS)
      .map((context, index) => normalizeContext(context, index))
      .filter(Boolean)
      .sort((left, right) => right.priority - left.priority || left.title.localeCompare(right.title));
    return {
      schema: Math.max(1, finiteInteger(input.schema, 1)),
      room: finiteInteger(input.room, 0),
      zone: finiteInteger(input.zone, 0),
      contexts
    };
  }

  function snapshotSignature(input = {}, options = {}) {
    const snapshot = options.normalized === true ? input : normalizeContextState(input);
    return JSON.stringify(snapshot);
  }

  function sanitizeArgumentValue(argument, value) {
    const text = cleanText(value, argument.maxLength || 80);
    if (!text) {
      if (argument.required) throw new Error(`${argument.label} is required.`);
      return '';
    }

    if (argument.type === 'number') {
      if (!/^-?\d+$/u.test(text)) throw new Error(`${argument.label} must be a whole number.`);
      const number = Number(text);
      if (!Number.isSafeInteger(number)) throw new Error(`${argument.label} is outside the supported range.`);
      if (argument.min !== null && number < argument.min) throw new Error(`${argument.label} must be at least ${argument.min}.`);
      if (argument.max !== null && number > argument.max) throw new Error(`${argument.label} must be no more than ${argument.max}.`);
      return String(number);
    }

    if (argument.type === 'select' && argument.options.length > 0) {
      if (!argument.options.some((option) => option.value === text)) {
        throw new Error(`${argument.label} is not a valid selection.`);
      }
    }

    return text;
  }

  function buildActionCommand(actionInput, values = {}) {
    const action = normalizeAction(actionInput);
    if (!action) throw new Error('This NukeFire action is not valid.');
    if (!action.enabled) throw new Error(action.disabledReason || 'This NukeFire action is currently unavailable.');

    const parts = [action.command];
    for (const argument of action.arguments) {
      const value = sanitizeArgumentValue(argument, values?.[argument.id]);
      if (value) parts.push(value);
    }
    return parts.join(' ');
  }

  function primaryContext(snapshot, options = {}) {
    const normalized = options.normalized === true ? snapshot : normalizeContextState(snapshot);
    return normalized.contexts.find((context) => context.kind !== 'zone') || normalized.contexts[0] || null;
  }

  return {
    MAX_CONTEXTS,
    normalizeArgument,
    normalizeAction,
    normalizeContext,
    normalizeContextState,
    snapshotSignature,
    buildActionCommand,
    primaryContext
  };
}));
