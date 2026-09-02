'use strict';

(function exposeTinTinScriptWriter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireTinTinScriptWriter = api;
})(typeof window !== 'undefined' ? window : globalThis, function createTinTinScriptWriter() {
  const SUPPORTED_PREFIXES = new Set(['#', '~', '^', '/', '`', "'"]);
  const CATEGORY_ORDER = Object.freeze([
    'variables', 'functions', 'aliases', 'actions', 'gags', 'highlights', 'substitutes', 'macros', 'tabs', 'events'
  ]);
  const DISPLAY_NAMES = Object.freeze({
    variables: 'VARIABLES', functions: 'FUNCTIONS', aliases: 'ALIASES', actions: 'ACTIONS', gags: 'GAGS',
    highlights: 'HIGHLIGHTS', substitutes: 'SUBSTITUTIONS', macros: 'MACROS', tabs: 'TABS', events: 'EVENTS'
  });
  const DEFAULT_MAX_OUTPUT_CHARACTERS = 2_000_000;
  const FORBIDDEN_CLASS_NAMES = new Set(['__proto__', 'constructor', 'prototype']);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizePrefix(value) {
    const prefix = String(value || '').trim().slice(0, 1);
    return SUPPORTED_PREFIXES.has(prefix) ? prefix : '#';
  }

  function normalizeClassName(value) {
    const name = String(value || '').normalize('NFKC').trim().toLowerCase();
    if (!name || name.length > 48 || FORBIDDEN_CLASS_NAMES.has(name)) return '';
    return /^[a-z0-9][a-z0-9_-]*$/u.test(name) ? name : '';
  }

  function recordsFor(snapshot = {}, category) {
    if (category === 'aliases' || category === 'variables' || category === 'functions' || category === 'tabs') {
      return Array.isArray(snapshot?.[category]) ? clone(snapshot[category]) : [];
    }
    return Array.isArray(snapshot?.[category]?.definitions)
      ? clone(snapshot[category].definitions)
      : [];
  }

  function engineEnabled(snapshot = {}, category) {
    if (category === 'aliases' || category === 'variables' || category === 'functions' || category === 'tabs') return true;
    return snapshot?.[category]?.enabled !== false;
  }

  function recordKey(category, record = {}) {
    if (category === 'aliases' || category === 'variables' || category === 'functions') return String(record.name || '').toLowerCase();
    if (category === 'tabs') return String(record.value || '').toLocaleLowerCase();
    if (category === 'macros') return String(record.signature || record.key || '').toLowerCase();
    if (category === 'events') return String(record.name || '').toUpperCase();
    return String(record.pattern || '');
  }

  function sortRecords(category, records = []) {
    return [...records].sort((left, right) => {
      if (['actions', 'highlights', 'substitutes'].includes(category)) {
        const priority = Number(left?.priority || 5) - Number(right?.priority || 5);
        if (priority !== 0) return priority;
      }
      return recordKey(category, left).localeCompare(recordKey(category, right));
    });
  }

  function brace(value) {
    const escaped = String(value ?? '')
      .replaceAll('\\', '\\\\')
      .replaceAll('{', '\\{')
      .replaceAll('}', '\\}')
      .replaceAll('"', '\\"')
      .replaceAll("'", "\\'");
    return `{${escaped}}`;
  }

  function definitionLine(prefix, category, record = {}) {
    if (category === 'aliases') return `${prefix}alias ${brace(record.name)} ${brace(record.body)} ${brace(record.priority || 5)}`;
    if (category === 'variables') return `${prefix}variable ${brace(record.name)} ${brace(record.value)}`;
    if (category === 'functions') return `${prefix}function ${brace(record.name)} ${brace(record.body)}`;
    if (category === 'actions') return `${prefix}action ${brace(record.pattern)} ${brace(record.command)} ${brace(record.priority || 5)}`;
    if (category === 'gags') return `${prefix}gag ${brace(record.pattern)}`;
    if (category === 'highlights') return `${prefix}highlight ${brace(record.pattern)} ${brace(record.style)} ${brace(record.priority || 5)}`;
    if (category === 'substitutes') return `${prefix}substitute ${brace(record.pattern)} ${brace(record.replacement)} ${brace(record.priority || 5)}`;
    if (category === 'macros') return `${prefix}macro ${brace(record.key || record.label)} ${brace(record.command)}`;
    if (category === 'tabs') return `${prefix}tab ${brace(record.value)}`;
    if (category === 'events') return `${prefix}event ${brace(record.name)} ${brace(record.command)}`;
    return '';
  }

  function disabledLine(prefix, category, record = {}) {
    if (record.enabled !== false) return '';
    if (category === 'actions') return `${prefix}action ${brace('disable')} ${brace(record.pattern)}`;
    if (category === 'gags') return `${prefix}gag ${brace('disable')} ${brace(record.pattern)}`;
    if (category === 'highlights') return `${prefix}highlight ${brace('disable')} ${brace(record.pattern)}`;
    if (category === 'substitutes') return `${prefix}substitute ${brace('disable')} ${brace(record.pattern)}`;
    if (category === 'macros') return `${prefix}macro ${brace('disable')} ${brace(record.key || record.label)}`;
    if (category === 'events') return `${prefix}event ${brace('disable')} ${brace(record.name)}`;
    return '';
  }

  function emitDefinitions(lines, prefix, recordsByCategory, counts) {
    for (const category of CATEGORY_ORDER) {
      for (const record of sortRecords(category, recordsByCategory[category] || [])) {
        const line = definitionLine(prefix, category, record);
        if (!line) continue;
        lines.push(line);
        counts[category] += 1;
        const disabled = disabledLine(prefix, category, record);
        if (disabled) lines.push(disabled);
      }
    }
  }

  function classLiveRecords(snapshot, className) {
    const result = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, []]));
    for (const category of CATEGORY_ORDER) {
      result[category] = recordsFor(snapshot, category)
        .filter((record) => normalizeClassName(record.className) === className);
    }
    return result;
  }

  function classSavedRecords(classRecord = {}) {
    const saved = classRecord?.saved && typeof classRecord.saved === 'object' ? classRecord.saved : {};
    return Object.fromEntries(CATEGORY_ORDER.map((category) => [
      category,
      Array.isArray(saved[category]) ? clone(saved[category]) : []
    ]));
  }

  function definitionCount(recordsByCategory) {
    return CATEGORY_ORDER.reduce((count, category) => count + (recordsByCategory[category]?.length || 0), 0);
  }


  function selectedScriptIncludes(selectedItemsValue = []) {
    const seen = new Set();
    const includes = [];
    for (const item of Array.isArray(selectedItemsValue) ? selectedItemsValue : []) {
      if (item?.category !== 'includes') continue;
      const requested = String(item.requested || item.label || '').normalize('NFKC').trim();
      const key = requested.toLowerCase();
      if (!requested || seen.has(key)) continue;
      seen.add(key);
      includes.push(requested);
    }
    return includes;
  }

  function selectedLoadCommands(selectedItemsValue = []) {
    const seen = new Set();
    const commands = [];
    for (const item of Array.isArray(selectedItemsValue) ? selectedItemsValue : []) {
      if (item?.category !== 'loadCommands') continue;
      const command = String(item.command || item.preview || '').normalize('NFKC').trim();
      const key = command.toLowerCase();
      if (!command || seen.has(key)) continue;
      seen.add(key);
      commands.push(command);
    }
    return commands;
  }

  function selectedSettingChanges(selectedItemsValue = []) {
    return (Array.isArray(selectedItemsValue) ? selectedItemsValue : [])
      .filter((item) => item?.category === 'settings' && item.change && typeof item.change === 'object')
      .map((item) => clone(item.change));
  }

  function emitSelectedSettings(lines, prefix, snapshot, selectedItemsValue) {
    const changes = selectedSettingChanges(selectedItemsValue);
    for (const change of changes) {
      if (change.kind === 'category-toggle' && ['actions', 'gags', 'highlights', 'substitutes', 'macros'].includes(change.category)) {
        lines.push(`${prefix}${change.category} ${brace(change.enabled === true ? 'on' : 'off')}`);
        continue;
      }
      if (change.kind === 'config' && change.key === 'speedwalk') {
        lines.push(`${prefix}config ${brace('SPEEDWALK')} ${brace(change.value === true ? 'ON' : 'OFF')}`);
        continue;
      }
      if (change.kind === 'config' && change.key === 'autoTab') {
        const autoTab = Number(change.value);
        if (Number.isSafeInteger(autoTab) && autoTab >= 1 && autoTab <= 999999) lines.push(`${prefix}config ${brace('AUTO TAB')} ${brace(autoTab)}`);
        continue;
      }
      if (change.kind === 'config' && change.key === 'commandEcho') {
        lines.push(`${prefix}config ${brace('COMMAND ECHO')} ${brace(change.value === true ? 'ON' : 'OFF')}`);
        continue;
      }
      if (change.kind === 'config' && change.key === 'verbatim') {
        lines.push(`${prefix}config ${brace('VERBATIM')} ${brace(change.value === true ? 'ON' : 'OFF')}`);
        continue;
      }
      if (change.kind === 'config' && change.key === 'historySize') {
        lines.push(`${prefix}config ${brace('HISTORY SIZE')} ${brace(Number.isSafeInteger(Number(change.value)) ? Number(change.value) : Number(snapshot.config?.historySize ?? 2000))}`);
        continue;
      }
      if (change.kind === 'config' && change.key === 'bufferSize') {
        lines.push(`${prefix}config ${brace('BUFFER SIZE')} ${brace(Number.isSafeInteger(Number(change.value)) ? Number(change.value) : Number(snapshot.config?.bufferSize ?? 5000))}`);
        continue;
      }
      if (change.kind === 'config' && change.key === 'repeatEnter') {
        lines.push(`${prefix}config ${brace('REPEAT ENTER')} ${brace(change.value === true ? 'ON' : 'OFF')}`);
        continue;
      }
      if (change.kind === 'config' && change.key === 'repeatChar') {
        lines.push(`${prefix}config ${brace('REPEAT CHAR')} ${brace([...String(change.value || snapshot.config?.repeatChar || '!')][0] || '!')}`);
        continue;
      }
      if (change.kind === 'config' && change.key === 'verbatimChar') {
        lines.push(`${prefix}config ${brace('VERBATIM CHAR')} ${brace([...String(change.value || snapshot.config?.verbatimChar || '\\')][0] || '\\')}`);
        continue;
      }
      if (change.kind === 'config' && change.key === 'logMode') {
        const mode = ['plain', 'raw'].includes(String(change.value || '').toLowerCase())
          ? String(change.value).toUpperCase()
          : String(snapshot.config?.logMode || 'plain').toUpperCase();
        lines.push(`${prefix}config ${brace('LOG MODE')} ${brace(mode)}`);
      }
    }
    return changes;
  }

  function emitClasses(lines, prefix, snapshot, counts, options = {}) {
    const classSnapshot = snapshot.classes && typeof snapshot.classes === 'object'
      ? snapshot.classes
      : { activeStack: [], definitions: [] };
    const classMap = new Map();
    for (const raw of Array.isArray(classSnapshot.definitions) ? classSnapshot.definitions : []) {
      const name = normalizeClassName(raw?.name);
      if (name && !classMap.has(name)) classMap.set(name, { name, saved: raw?.saved || {} });
    }
    for (const category of CATEGORY_ORDER) {
      for (const record of recordsFor(snapshot, category)) {
        const name = normalizeClassName(record.className);
        if (name && !classMap.has(name)) classMap.set(name, { name, saved: {} });
      }
    }

    let savedClassDefinitions = 0;
    for (const classRecord of [...classMap.values()].sort((left, right) => left.name.localeCompare(right.name))) {
      const saved = classSavedRecords(classRecord);
      const live = classLiveRecords(snapshot, classRecord.name);
      lines.push('', `/* Class ${classRecord.name}: saved snapshot. */`);
      lines.push(`${prefix}class ${brace(classRecord.name)} ${brace('open')}`);
      emitDefinitions(lines, prefix, saved, counts);
      savedClassDefinitions += definitionCount(saved);
      lines.push(`${prefix}class ${brace(classRecord.name)} ${brace('close')}`);
      lines.push(`${prefix}class ${brace(classRecord.name)} ${brace('save')}`);
      lines.push(`${prefix}class ${brace(classRecord.name)} ${brace('clear')}`);

      if (definitionCount(live) > 0) {
        lines.push(`/* Class ${classRecord.name}: live definitions. */`);
        lines.push(`${prefix}class ${brace(classRecord.name)} ${brace('open')}`);
        emitDefinitions(lines, prefix, live, counts);
        lines.push(`${prefix}class ${brace(classRecord.name)} ${brace('close')}`);
      }
    }

    if (options.includeActiveStack !== false) {
      const activeStack = [];
      for (const raw of Array.isArray(classSnapshot.activeStack) ? classSnapshot.activeStack : []) {
        const name = normalizeClassName(raw);
        if (name && classMap.has(name) && !activeStack.includes(name)) activeStack.push(name);
      }
      if (activeStack.length) {
        lines.push('', '/* Restore the active class stack. */');
        for (const name of activeStack) lines.push(`${prefix}class ${brace(name)} ${brace('activate')}`);
      }
    }

    return { classCount: classMap.size, savedClassDefinitions };
  }

  function finalizeTinTinOutput(lines, counts, classInfo, prefix, maxOutputCharacters) {
    const content = `${lines.join('\n').replace(/\n{3,}/gu, '\n\n').trimEnd()}\n`;
    if (content.length > maxOutputCharacters) {
      return {
        ok: false,
        errors: [`TinTin script would exceed ${maxOutputCharacters.toLocaleString()} characters.`],
        counts,
        classCount: classInfo.classCount,
        savedClassDefinitions: classInfo.savedClassDefinitions,
        content: ''
      };
    }
    return {
      ok: true,
      content,
      counts,
      classCount: classInfo.classCount,
      savedClassDefinitions: classInfo.savedClassDefinitions,
      commandCharacter: prefix,
      totalWritten: Object.values(counts).reduce((sum, value) => sum + value, 0),
      errors: []
    };
  }

  function prepareTinTinClassWrite(snapshotValue = {}, classNameValue = '', options = {}) {
    const snapshot = snapshotValue && typeof snapshotValue === 'object' ? clone(snapshotValue) : {};
    const className = normalizeClassName(classNameValue);
    if (!className) return { ok: false, errors: ['Class name is invalid.'], content: '' };
    const prefix = normalizePrefix(options.commandPrefix || '#');
    const maxOutputCharacters = Math.max(
      1024,
      Math.trunc(Number(options.maxOutputCharacters) || DEFAULT_MAX_OUTPUT_CHARACTERS)
    );
    const records = classLiveRecords(snapshot, className);
    const counts = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0]));
    const lines = [
      `/* NukeFire Client TinTin class ${className}.`,
      ' * Safe class definitions only. Load with #class {name} {read} {filename}.',
      ' */',
      '',
      `${prefix}class ${brace(className)} ${brace('open')}`
    ];
    emitDefinitions(lines, prefix, records, counts);
    lines.push(`${prefix}class ${brace(className)} ${brace('close')}`);
    return finalizeTinTinOutput(lines, counts, {
      classCount: 1,
      savedClassDefinitions: 0
    }, prefix, maxOutputCharacters);
  }

  function prepareTinTinWrite(snapshotValue = {}, options = {}) {
    const snapshot = snapshotValue && typeof snapshotValue === 'object' ? clone(snapshotValue) : {};
    const prefix = normalizePrefix(options.commandPrefix || '#');
    const maxOutputCharacters = Math.max(
      1024,
      Math.trunc(Number(options.maxOutputCharacters) || DEFAULT_MAX_OUTPUT_CHARACTERS)
    );
    const lines = [
      '/* NukeFire Client TinTin command file.',
      ' * Safe definitions only. Load with #read {filename}.',
      ' */',
      ''
    ];
    const counts = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0]));

    const globalRecords = Object.fromEntries(CATEGORY_ORDER.map((category) => [
      category,
      recordsFor(snapshot, category).filter((record) => !normalizeClassName(record.className))
    ]));
    emitDefinitions(lines, prefix, globalRecords, counts);
    lines.push(`${prefix}config ${brace('COMMAND ECHO')} ${brace(snapshot.config?.commandEcho === true ? 'ON' : 'OFF')}`);
    if (Number.isSafeInteger(Number(snapshot.config?.autoTab)) && Number(snapshot.config.autoTab) >= 1 && Number(snapshot.config.autoTab) <= 999999) {
      lines.push(`${prefix}config ${brace('AUTO TAB')} ${brace(Number(snapshot.config.autoTab))}`);
    }
    lines.push(`${prefix}config ${brace('TINTIN CHAR')} ${brace(prefix)}`);
    lines.push(`${prefix}config ${brace('VERBATIM')} ${brace(snapshot.config?.verbatim === true ? 'ON' : 'OFF')}`);
    lines.push(`${prefix}config ${brace('HISTORY SIZE')} ${brace(Number(snapshot.config?.historySize ?? 2000))}`);
    lines.push(`${prefix}config ${brace('BUFFER SIZE')} ${brace(Number(snapshot.config?.bufferSize ?? 5000))}`);
    lines.push(`${prefix}config ${brace('REPEAT CHAR')} ${brace([...String(snapshot.config?.repeatChar || '!')][0] || '!')}`);
    lines.push(`${prefix}config ${brace('REPEAT ENTER')} ${brace(snapshot.config?.repeatEnter === true ? 'ON' : 'OFF')}`);
    lines.push(`${prefix}config ${brace('VERBATIM CHAR')} ${brace([...String(snapshot.config?.verbatimChar || '\\')][0] || '\\')}`);
    lines.push(`${prefix}config ${brace('SPEEDWALK')} ${brace(snapshot.speedwalk?.enabled === false ? 'OFF' : 'ON')}`);
    lines.push(`${prefix}config ${brace('LOG MODE')} ${brace(String(snapshot.config?.logMode || 'plain').toUpperCase())}`);

    for (const category of ['actions', 'gags', 'highlights', 'substitutes', 'macros']) {
      if (!engineEnabled(snapshot, category)) lines.push(`${prefix}${category} ${brace('off')}`);
    }

    const classInfo = emitClasses(lines, prefix, snapshot, counts, { includeActiveStack: true });
    return finalizeTinTinOutput(lines, counts, classInfo, prefix, maxOutputCharacters);
  }


  function prepareTinTinFragment(snapshotValue = {}, selectedItemsValue = [], options = {}) {
    const snapshot = snapshotValue && typeof snapshotValue === 'object' ? clone(snapshotValue) : {};
    const prefix = normalizePrefix(options.commandPrefix || '#');
    const maxOutputCharacters = Math.max(
      1024,
      Math.trunc(Number(options.maxOutputCharacters) || DEFAULT_MAX_OUTPUT_CHARACTERS)
    );
    const lines = [
      '/* NukeFire Client imported TinTin definitions.',
      ' * Appended by the safe Import TinTin workflow.',
      ' */'
    ];
    const counts = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, 0]));
    const scriptIncludes = selectedScriptIncludes(selectedItemsValue);
    if (scriptIncludes.length) {
      lines.push('', '/* Preserved TinTin script includes. */');
      for (const requested of scriptIncludes) lines.push(`${prefix}read ${brace(requested)}`);
    }
    const loadCommands = selectedLoadCommands(selectedItemsValue);
    const globalRecords = Object.fromEntries(CATEGORY_ORDER.map((category) => [
      category,
      recordsFor(snapshot, category).filter((record) => !normalizeClassName(record.className))
    ]));
    emitDefinitions(lines, prefix, globalRecords, counts);
    const changes = emitSelectedSettings(lines, prefix, snapshot, selectedItemsValue);
    const includeActiveStack = changes.some((change) => change.kind === 'class-active-stack');
    const classInfo = emitClasses(lines, prefix, snapshot, counts, { includeActiveStack });
    if (loadCommands.length) {
      lines.push('', '/* Preserved load-time compatibility commands. */');
      lines.push(...loadCommands);
    }
    return {
      ...finalizeTinTinOutput(lines, counts, classInfo, prefix, maxOutputCharacters),
      includeCount: scriptIncludes.length,
      loadCommandCount: loadCommands.length
    };
  }

  function singularLabel(category) {
    return ({
      VARIABLES: 'VARIABLE', FUNCTIONS: 'FUNCTION', ALIASES: 'ALIAS', ACTIONS: 'ACTION', GAGS: 'GAG',
      HIGHLIGHTS: 'HIGHLIGHT', SUBSTITUTIONS: 'SUBSTITUTION', MACROS: 'MACRO', TABS: 'TAB', EVENTS: 'EVENT'
    })[DISPLAY_NAMES[category]] || DISPLAY_NAMES[category];
  }

  function formatTinTinWriteReport(result = {}, filenameValue = '') {
    if (!result?.ok) return (result?.errors || ['TinTin script could not be written.']).map((message) => `#ERROR: ${message}`);
    const filename = String(filenameValue || result.filename || 'script.tin').trim();
    const lines = [`#OK: WROTE ${filename}.`];
    for (const category of ['actions', 'aliases', 'functions', 'gags', 'highlights', 'substitutes', 'variables', 'macros', 'tabs', 'events']) {
      const count = Number(result.counts?.[category] || 0);
      if (count > 0) {
        const label = count === 1 ? singularLabel(category) : DISPLAY_NAMES[category];
        lines.push(`#OK: ${String(count).padStart(3, ' ')} ${label} WRITTEN.`);
      }
    }
    const classCount = Number(result.classCount || 0);
    if (classCount > 0) lines.push(`#OK: ${String(classCount).padStart(3, ' ')} CLASS${classCount === 1 ? '' : 'ES'} WRITTEN.`);
    if (result.totalWritten === 0 && classCount === 0) lines.push('#WARN: NO DEFINITIONS WERE AVAILABLE TO WRITE.');
    return lines;
  }

  return Object.freeze({
    prepareTinTinWrite,
    prepareTinTinClassWrite,
    prepareTinTinFragment,
    formatTinTinWriteReport,
    brace,
    CATEGORY_ORDER,
    DISPLAY_NAMES,
    DEFAULT_MAX_OUTPUT_CHARACTERS
  });
});
