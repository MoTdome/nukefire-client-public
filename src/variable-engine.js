'use strict';

const { normalizeClassName } = require('./class-manager');

const VARIABLE_NAME_MAX = 96;
const VARIABLE_VALUE_MAX = 4096;
const VARIABLE_EXPANDED_MAX = 16384;
const DEFAULT_MAX_VARIABLES = 2048;
const DEFAULT_MAX_EXPANSION_DEPTH = 16;
const DEFAULT_MAX_TABLE_DEPTH = 4;
const FORBIDDEN_VARIABLE_NAMES = new Set(['__proto__', 'constructor', 'prototype']);
const LITERAL_PERCENT_SENTINEL = '\uE000';
const LITERAL_DOLLAR_SENTINEL = '\uE001';
const SIMPLE_PERCENT_VARIABLE_NAME = /^[a-z][a-z0-9_-]*$/u;
const SIMPLE_DOLLAR_VARIABLE_NAME = /^[a-z_][a-z0-9_]*$/u;
const FORBIDDEN_EXTENDED_NAME_CHARACTERS = /[\u0000-\u001F\u007F{}\\;$%]/u;
const TABLE_KEY_FORBIDDEN_CHARACTERS = /[\u0000-\u001F\u007F{}\[\]\\;$%]/u;

function readBracketGroup(sourceValue, startIndexValue) {
  const source = String(sourceValue ?? '');
  const startIndex = Math.max(0, Number(startIndexValue) || 0);
  if (source[startIndex] !== '[') return null;
  let depth = 1;
  let content = '';
  for (let index = startIndex + 1; index < source.length; index += 1) {
    const character = source[index];
    if (character === '[') {
      depth += 1;
      content += character;
      continue;
    }
    if (character === ']') {
      depth -= 1;
      if (depth === 0) return { content, raw: source.slice(startIndex, index + 1), end: index + 1 };
      content += character;
      continue;
    }
    content += character;
  }
  return null;
}

function rawVariablePath(value) {
  const source = String(value ?? '').normalize('NFKC').trim();
  if (!source || source.length > VARIABLE_NAME_MAX * 4) return null;
  const baseMatch = source.match(/^([A-Za-z_][A-Za-z0-9_]*)/u);
  if (!baseMatch) return null;
  const keys = [];
  let index = baseMatch[1].length;
  while (index < source.length) {
    const group = readBracketGroup(source, index);
    if (!group) return null;
    keys.push(group.content);
    if (keys.length > DEFAULT_MAX_TABLE_DEPTH + 2) return null;
    index = group.end;
  }
  return { base: baseMatch[1], keys, name: source };
}

function parseVariablePath(value) {
  const source = String(value || '').normalize('NFKC').trim().toLowerCase();
  if (!source || source.length > VARIABLE_NAME_MAX) return null;
  const parsed = rawVariablePath(source);
  if (!parsed) return null;
  const keys = [];
  for (const rawKey of parsed.keys) {
    const key = String(rawKey || '').trim();
    if (!key || TABLE_KEY_FORBIDDEN_CHARACTERS.test(key)) return null;
    keys.push(key);
    if (keys.length > DEFAULT_MAX_TABLE_DEPTH) return null;
  }
  const base = parsed.base.toLowerCase();
  return { base, keys, name: `${base}${keys.map((key) => `[${key}]`).join('')}` };
}

function normalizeVariableName(value) {
  const source = String(value || '').normalize('NFKC').trim().toLowerCase();
  if (!source || source.length > VARIABLE_NAME_MAX) return '';
  if (FORBIDDEN_VARIABLE_NAMES.has(source)) return '';
  if (source.includes('[') || source.includes(']')) {
    const path = parseVariablePath(source);
    if (!path || FORBIDDEN_VARIABLE_NAMES.has(path.base)) return '';
    return path.name;
  }
  if (FORBIDDEN_EXTENDED_NAME_CHARACTERS.test(source)) return '';
  return source;
}

function normalizeSimpleVariableName(value) {
  const source = normalizeVariableName(value);
  return source && SIMPLE_PERCENT_VARIABLE_NAME.test(source) ? source : '';
}

function normalizeVariableValue(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replaceAll(LITERAL_PERCENT_SENTINEL, '')
    .replaceAll(LITERAL_DOLLAR_SENTINEL, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, '')
    .replace(/[\r\n]+/gu, ' ')
    .trim()
    .slice(0, VARIABLE_VALUE_MAX);
}

function detachedRecord(record) {
  return {
    name: record.name,
    value: record.value,
    scope: 'global',
    ...(record.className ? { className: record.className } : {})
  };
}

function variableReferenceAt(sourceValue, index) {
  const source = String(sourceValue ?? '');
  const sigil = source[index];
  if (sigil !== '%' && sigil !== '$') return null;

  if (source[index + 1] === sigil) {
    return {
      literal: true,
      sigil,
      raw: `${sigil}${sigil}`,
      end: index + 2
    };
  }

  if (source[index + 1] === '{') {
    const closing = source.indexOf('}', index + 2);
    if (closing === -1) return null;
    const rawName = source.slice(index + 2, closing);
    const name = normalizeVariableName(rawName);
    if (name) return { literal: false, sigil, name, rawName, raw: source.slice(index, closing + 1), end: closing + 1 };
    if (sigil === '$' && rawName.includes('[')) {
      return { literal: false, sigil, name: '', rawName, raw: source.slice(index, closing + 1), end: closing + 1, dynamic: true };
    }
    return null;
  }

  const pattern = sigil === '$'
    ? /^([A-Za-z_][A-Za-z0-9_]*)/u
    : /^([A-Za-z][A-Za-z0-9_-]*)/u;
  const match = source.slice(index + 1).match(pattern);
  if (!match) return null;

  let end = index + 1 + match[1].length;
  let rawName = match[1];
  if (sigil === '$') {
    let depth = 0;
    while (source[end] === '[' && depth < DEFAULT_MAX_TABLE_DEPTH + 2) {
      const group = readBracketGroup(source, end);
      if (!group) break;
      rawName += group.raw;
      end = group.end;
      depth += 1;
    }
  }
  const name = normalizeVariableName(rawName);
  if (name) return { literal: false, sigil, name, rawName, raw: source.slice(index, end), end };
  // TinTin allows variable references inside table/list selectors, including
  // nested selectors such as $table[$room][$keys[+%1]]. Preserve the raw path
  // until expand() resolves each selector through the same recursion guards.
  if (sigil === '$' && rawName.includes('[')) {
    return { literal: false, sigil, name: '', rawName, raw: source.slice(index, end), end, dynamic: true };
  }
  return null;
}

function compareTableKeys(leftValue, rightValue) {
  const left = String(leftValue || '');
  const right = String(rightValue || '');
  if (/^\d+$/u.test(left) && /^\d+$/u.test(right)) return Number(left) - Number(right);
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' });
}

function compileTableKeyPattern(patternValue) {
  const pattern = String(patternValue ?? '').normalize('NFKC').trim();
  if (!pattern || pattern.length > VARIABLE_NAME_MAX) return null;
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character !== '%') {
      source += character.toLowerCase().replace(/[\^$.*+?()[\]{}|]/gu, '\\$&');
      continue;
    }
    const token = pattern[index + 1] || '';
    if (!token) { source += '%'; continue; }
    index += 1;
    if (token === '%') source += '%';
    else if (token === '*') source += '.*';
    else if (token === '?') source += '.';
    else if (token === 'd') source += '\\d+';
    else if (token === 'D') source += '\\D+';
    else if (token === 's') source += '\\s+';
    else if (token === 'S') source += '\\S+';
    else if (token === 'w') source += '\\w+';
    else if (token === 'W') source += '\\W+';
    else source += `%${token.toLowerCase().replace(/[\^$.*+?()[\]{}|]/gu, '\\$&')}`;
  }
  try { return new RegExp(`${source}$`, 'u'); } catch (_error) { return null; }
}

function tableQueryReferenceAt(sourceValue, indexValue) {
  const source = String(sourceValue ?? '');
  const index = Math.max(0, Number(indexValue) || 0);
  if (source[index] !== '$') return null;
  const baseMatch = source.slice(index + 1).match(/^([A-Za-z_][A-Za-z0-9_]*)/u);
  if (!baseMatch) return null;
  let cursor = index + 1 + baseMatch[1].length;
  const keys = [];
  while (source[cursor] === '[' && keys.length < DEFAULT_MAX_TABLE_DEPTH + 2) {
    const group = readBracketGroup(source, cursor);
    if (!group) return null;
    keys.push(group.content);
    cursor = group.end;
  }
  if (!keys.length) return null;
  const query = keys.at(-1);
  if (query !== '' && !query.includes('%')) return null;
  return {
    base: baseMatch[1],
    keys: keys.slice(0, -1),
    query,
    raw: source.slice(index, cursor),
    end: cursor
  };
}

function nestIndexReferenceAt(sourceValue, indexValue) {
  const source = String(sourceValue ?? '');
  const index = Math.max(0, Number(indexValue) || 0);
  if (source[index] !== '&') return null;
  if (source[index + 1] === '&') return { literal: true, raw: '&&', end: index + 2 };
  if (source[index + 1] === '{') {
    const closing = source.indexOf('}', index + 2);
    if (closing === -1) return null;
    return {
      literal: false,
      defined: true,
      expression: source.slice(index + 2, closing),
      raw: source.slice(index, closing + 1),
      end: closing + 1
    };
  }
  const baseMatch = source.slice(index + 1).match(/^([A-Za-z_][A-Za-z0-9_]*)/u);
  if (!baseMatch) return null;
  let cursor = index + 1 + baseMatch[1].length;
  let expression = baseMatch[1];
  let groups = 0;
  while (source[cursor] === '[' && groups < DEFAULT_MAX_TABLE_DEPTH + 2) {
    const group = readBracketGroup(source, cursor);
    if (!group) return null;
    expression += group.raw;
    cursor = group.end;
    groups += 1;
  }
  return { literal: false, defined: false, expression, raw: source.slice(index, cursor), end: cursor };
}

class VariableEngine {
  constructor(options = {}) {
    this.maxVariables = Math.max(
      1,
      Math.trunc(Number(options.maxVariables) || DEFAULT_MAX_VARIABLES)
    );
    this.maxExpansionDepth = Math.max(
      1,
      Math.trunc(Number(options.maxExpansionDepth) || DEFAULT_MAX_EXPANSION_DEPTH)
    );
    this.maxExpandedLength = Math.max(
      VARIABLE_VALUE_MAX,
      Math.trunc(Number(options.maxExpandedLength) || VARIABLE_EXPANDED_MAX)
    );
    this.variables = new Map();
    this.revision = 0;
    if (Array.isArray(options.variables)) this.replaceAll(options.variables);
  }

  resolveIndexedName(nameValue) {
    const name = normalizeVariableName(nameValue);
    const path = parseVariablePath(name);
    if (!path || path.keys.length === 0) return name;
    const selector = path.keys.at(-1);
    if (!/^[+-]\d+$/u.test(selector)) return name;
    const position = Number(selector);
    if (!Number.isSafeInteger(position) || position === 0) return '';
    const parentKeys = path.keys.slice(0, -1);
    const parent = `${path.base}${parentKeys.map((key) => `[${key}]`).join('')}`;
    const candidates = this.tableEntries(parent);
    const offset = position > 0 ? position - 1 : candidates.length + position;
    return offset >= 0 && offset < candidates.length ? `${parent}[${candidates[offset].key}]` : '';
  }

  directChildKey(nameValue, baseValue) {
    const name = normalizeVariableName(nameValue);
    const base = normalizeVariableName(baseValue);
    if (!name || !base) return '';
    const prefix = `${base}[`;
    if (!name.startsWith(prefix)) return '';
    const group = readBracketGroup(name, base.length);
    return group ? String(group.content || '').trim() : '';
  }

  hasNode(nameValue) {
    const name = normalizeVariableName(nameValue);
    if (!name) return false;
    if (this.variables.has(name)) return true;
    const prefix = `${name}[`;
    return [...this.variables.keys()].some((storedName) => storedName.startsWith(prefix));
  }

  serializeNode(nameValue, wrapped = false, depth = 0) {
    const name = normalizeVariableName(nameValue);
    if (!name || depth > DEFAULT_MAX_TABLE_DEPTH + 1) return '';
    const entries = this.tableEntries(name);
    if (!entries.length) {
      const record = this.variables.get(name);
      const value = String(record?.value ?? '');
      return wrapped ? `{${value}}` : value;
    }
    const body = entries.map((entry) => `{${entry.key}}${this.serializeNode(`${name}[${entry.key}]`, true, depth + 1)}`).join('');
    return wrapped ? `{${body}}` : body;
  }

  nodeIndex(nameValue) {
    const name = normalizeVariableName(nameValue);
    const path = parseVariablePath(name);
    if (!path) return 0;
    if (!path.keys.length) {
      const names = new Set();
      for (const storedName of this.variables.keys()) {
        const parsed = parseVariablePath(storedName);
        if (parsed?.base) names.add(parsed.base);
      }
      const ordered = [...names].sort(compareTableKeys);
      const index = ordered.indexOf(path.base);
      return index >= 0 ? index + 1 : 0;
    }
    const parentKeys = path.keys.slice(0, -1);
    const parent = `${path.base}${parentKeys.map((key) => `[${key}]`).join('')}`;
    const selector = path.keys.at(-1);
    const entries = this.tableEntries(parent);
    const index = entries.findIndex((entry) => entry.key === selector);
    return index >= 0 ? index + 1 : 0;
  }

  define(nameValue, valueValue, classNameValue = '') {
    const name = normalizeVariableName(nameValue);
    const value = normalizeVariableValue(valueValue);
    const className = normalizeClassName(classNameValue);
    if (!name) return null;

    // A TinTin scalar assignment replaces any table rooted at that exact
    // node. Conversely, creating a nested child turns scalar ancestors into
    // table nodes; their old scalar text is no longer visible.
    const descendants = [...this.variables.keys()].filter((storedName) => storedName.startsWith(`${name}[`));
    const path = parseVariablePath(name);
    const ancestorNames = [];
    if (path?.keys.length) {
      let ancestor = path.base;
      ancestorNames.push(ancestor);
      for (const key of path.keys.slice(0, -1)) {
        ancestor += `[${key}]`;
        ancestorNames.push(ancestor);
      }
    }
    const removedAncestors = ancestorNames.filter((ancestor) => this.variables.has(ancestor) && ancestor !== name);
    const projectedSize = this.variables.size
      - descendants.length
      - removedAncestors.length
      + (this.variables.has(name) ? 0 : 1);
    if (projectedSize > this.maxVariables) return null;
    for (const storedName of descendants) this.variables.delete(storedName);
    for (const ancestor of removedAncestors) this.variables.delete(ancestor);
    const record = Object.freeze({ name, value, scope: 'global', className });
    this.variables.set(name, record);
    this.revision += 1;
    return detachedRecord(record);
  }

  get(nameValue) {
    const normalized = normalizeVariableName(nameValue);
    if (!normalized) return null;
    const resolved = this.hasNode(normalized) ? normalized : this.resolveIndexedName(normalized);
    if (!resolved || !this.hasNode(resolved)) return null;
    const entries = this.tableEntries(resolved);
    if (entries.length) {
      const exact = this.variables.get(resolved);
      return {
        name: resolved,
        value: this.serializeNode(resolved, false),
        scope: 'global',
        ...(exact?.className ? { className: exact.className } : {})
      };
    }
    const record = this.variables.get(resolved);
    return record ? detachedRecord(record) : null;
  }

  list() {
    return [...this.variables.values()]
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
      .map(detachedRecord);
  }

  tableEntries(nameValue) {
    const base = normalizeVariableName(nameValue);
    if (!base) return [];
    const keys = new Set();
    for (const record of this.variables.values()) {
      const key = this.directChildKey(record.name, base);
      if (key) keys.add(key);
    }
    return [...keys]
      .sort(compareTableKeys)
      .map((key) => {
        const name = `${base}[${key}]`;
        const exact = this.variables.get(name);
        return {
          key,
          record: exact && !this.tableEntries(name).length
            ? detachedRecord(exact)
            : {
              name,
              value: this.serializeNode(name, false),
              scope: 'global',
              ...(exact?.className ? { className: exact.className } : {})
            }
        };
      });
  }

  delete(nameValue) {
    const name = normalizeVariableName(nameValue);
    if (!name) return false;
    let deleted = this.variables.delete(name);
    const prefix = `${name}[`;
    for (const storedName of [...this.variables.keys()]) {
      if (storedName.startsWith(prefix)) {
        this.variables.delete(storedName);
        deleted = true;
      }
    }
    if (deleted) this.revision += 1;
    return deleted;
  }

  clearTable(nameValue) {
    const base = normalizeVariableName(nameValue);
    if (!base) return 0;
    const prefix = `${base}[`;
    let count = 0;
    for (const storedName of [...this.variables.keys()]) {
      if (storedName.startsWith(prefix)) {
        this.variables.delete(storedName);
        count += 1;
      }
    }
    if (count > 0) this.revision += 1;
    return count;
  }

  defineTable(nameValue, entriesValue, classNameValue = '') {
    const base = normalizeVariableName(nameValue);
    if (!base) return null;
    const entries = Array.isArray(entriesValue) ? entriesValue : [];
    const prepared = [];
    for (const entry of entries.slice(0, this.maxVariables)) {
      const key = String(entry?.key ?? '').normalize('NFKC').trim().toLowerCase();
      if (!key || TABLE_KEY_FORBIDDEN_CHARACTERS.test(key)) return null;
      const name = normalizeVariableName(`${base}[${key}]`);
      if (!name) return null;
      prepared.push({ name, value: normalizeVariableValue(entry?.value), className: normalizeClassName(classNameValue) });
    }
    const existing = [...this.variables.keys()].filter((storedName) => storedName.startsWith(`${base}[`)).length;
    if (this.variables.size - existing + prepared.length > this.maxVariables) return null;
    this.clearTable(base);
    for (const entry of prepared) this.define(entry.name, entry.value, entry.className);
    return this.tableEntries(base).map((entry) => entry.record);
  }

  clear() {
    if (this.variables.size > 0) {
      this.variables.clear();
      this.revision += 1;
    }
  }

  replaceAll(records = []) {
    const source = Array.isArray(records)
      ? records.slice(0, this.maxVariables * 4)
      : [];
    const next = new Map();

    for (const raw of source) {
      const record = raw && typeof raw === 'object' ? raw : {};
      const name = normalizeVariableName(record.name);
      const value = normalizeVariableValue(record.value);
      const className = normalizeClassName(record.className);
      if (!name) continue;
      if (!next.has(name) && next.size >= this.maxVariables) continue;
      next.set(name, Object.freeze({ name, value, scope: 'global', className }));
    }

    this.variables = next;
    this.revision += 1;
    return this.list();
  }

  expand(inputValue, options = {}) {
    const original = String(inputValue ?? '');
    const localSource = options.locals instanceof Map
      ? options.locals
      : new Map(Object.entries(options.locals && typeof options.locals === 'object' ? options.locals : {}));
    const locals = new Map();
    for (const [rawName, rawValue] of localSource) {
      const name = normalizeVariableName(rawName);
      if (name) locals.set(name, normalizeVariableValue(rawValue));
    }
    const expandedNames = [];
    let error = '';

    const expandText = (sourceValue, stack) => {
      const source = String(sourceValue ?? '');
      let output = '';

      for (let index = 0; index < source.length;) {
        if (source[index] === '\\' && (source[index + 1] === '%' || source[index + 1] === '$')) {
          output += source[index + 1] === '%' ? LITERAL_PERCENT_SENTINEL : LITERAL_DOLLAR_SENTINEL;
          index += 2;
          continue;
        }

        // TinTin nested table query forms. The original client exposes
        // $table[] as a braced list of direct child keys and $table[%*] as a
        // braced list of direct child values. Dynamic parent selectors are
        // expanded first, e.g. $signsInRoom[$curRoomSignKey][%*].
        const tableQuery = tableQueryReferenceAt(source, index);
        if (tableQuery) {
          const resolvedKeys = [];
          let queryError = false;
          for (const rawKey of tableQuery.keys) {
            const expandedKey = expandText(rawKey, stack);
            if (error || !String(expandedKey).trim()) { queryError = true; break; }
            resolvedKeys.push(String(expandedKey).trim());
          }
          if (!queryError) {
            const base = normalizeVariableName(`${tableQuery.base}${resolvedKeys.map((key) => `[${key}]`).join('')}`);
            if (base) {
              const rootBase = parseVariablePath(base)?.base || base;
              if (!this.hasNode(rootBase) && !locals.has(rootBase)) {
                output += tableQuery.raw;
                index = tableQuery.end;
                continue;
              }
              const entries = this.tableEntries(base);
              const matcher = tableQuery.query ? compileTableKeyPattern(tableQuery.query) : null;
              const selected = matcher ? entries.filter((entry) => matcher.test(entry.key)) : entries;
              const values = tableQuery.query === ''
                ? selected.map((entry) => entry.key)
                : selected.map((entry) => entry.record.value);
              output += values.map((value) => `{${String(value ?? '')}}`).join('');
              index = tableQuery.end;
              continue;
            }
          }
        }

        // TinTin &variable substitution returns the 1-based ALPHA index of
        // a node, while &table[] returns the number of direct child nodes.
        // The source expands selectors before the lookup, so veteran forms
        // like &signsInRoom[$room][$keys[+%1]] work without braces.
        if (source[index] === '&') {
          const query = nestIndexReferenceAt(source, index);
          if (query?.literal) {
            output += '&';
            index = query.end;
            continue;
          }
          if (query) {
            const parsed = rawVariablePath(query.expression);
            if (parsed) {
              const resolvedKeys = [];
              let queryError = false;
              for (const rawKey of parsed.keys) {
                if (rawKey === '' && rawKey === parsed.keys.at(-1)) {
                  resolvedKeys.push('');
                  continue;
                }
                const expandedKey = expandText(rawKey, stack);
                if (error || !String(expandedKey).trim()) { queryError = true; break; }
                resolvedKeys.push(String(expandedKey).trim());
              }
              if (!queryError) {
                const wantsSize = resolvedKeys.at(-1) === '';
                const finalKey = resolvedKeys.at(-1) || '';
                const wantsPatternCount = !wantsSize && finalKey.includes('%');
                const pathKeys = (wantsSize || wantsPatternCount) ? resolvedKeys.slice(0, -1) : resolvedKeys;
                const requested = normalizeVariableName(`${parsed.base}${pathKeys.map((key) => `[${key}]`).join('')}`);
                if (requested) {
                  const rootBase = parseVariablePath(requested)?.base || requested;
                  const rootExists = this.hasNode(rootBase) || locals.has(rootBase);
                  if (!rootExists && query.defined !== true) {
                    output += query.raw;
                    index = query.end;
                    continue;
                  }
                  if (wantsSize) output += String(this.tableEntries(requested).length);
                  else if (wantsPatternCount) {
                    const matcher = compileTableKeyPattern(finalKey);
                    output += String(matcher ? this.tableEntries(requested).filter((entry) => matcher.test(entry.key)).length : 0);
                  } else output += String(this.nodeIndex(requested) || (locals.has(requested) ? 1 : 0));
                  index = query.end;
                  continue;
                }
              }
            }
          }
        }

        const reference = variableReferenceAt(source, index);
        if (!reference) {
          output += source[index];
          index += 1;
        } else if (reference.literal) {
          output += reference.sigil === '%' ? LITERAL_PERCENT_SENTINEL : LITERAL_DOLLAR_SENTINEL;
          index = reference.end;
        } else {
          let referenceName = reference.name;
          if (!referenceName && reference.dynamic) {
            const parsedPath = rawVariablePath(reference.rawName || '');
            if (parsedPath) {
              const keys = [];
              let dynamicError = false;
              for (const rawKey of parsedPath.keys) {
                const expandedKey = expandText(rawKey, stack);
                if (error) return '';
                if (!String(expandedKey).trim()) { dynamicError = true; break; }
                keys.push(String(expandedKey).trim());
              }
              if (!dynamicError) {
                referenceName = normalizeVariableName(`${parsedPath.base}${keys.map((key) => `[${key}]`).join('')}`);
              }
            }
          }
          if (!referenceName) {
            output += reference.raw;
            index = reference.end;
            continue;
          }
          const localValue = locals.has(referenceName) ? locals.get(referenceName) : undefined;
          const record = localValue === undefined ? this.get(referenceName) : null;
          const stackName = record?.name || referenceName;
          if (localValue === undefined && !record) {
            const rootBase = parseVariablePath(referenceName)?.base || referenceName;
            output += this.hasNode(rootBase) || locals.has(rootBase) ? '' : reference.raw;
            index = reference.end;
          } else if (stack.includes(stackName)) {
            const loop = [...stack.slice(stack.indexOf(stackName)), stackName];
            error = `Variable expansion stopped: recursive loop ${loop.join(' -> ')}.`;
            return '';
          } else if (stack.length >= this.maxExpansionDepth) {
            error = `Variable expansion stopped: maximum depth of ${this.maxExpansionDepth} exceeded.`;
            return '';
          } else {
            expandedNames.push(stackName);
            output += expandText(localValue === undefined ? record.value : localValue, [...stack, stackName]);
            if (error) return '';
            index = reference.end;
          }
        }

        if (output.length > this.maxExpandedLength) {
          error = `Variable expansion stopped: output exceeded ${this.maxExpandedLength} characters.`;
          return '';
        }
      }

      return output;
    };

    const value = expandText(original, []);
    return {
      value: error
        ? ''
        : value
          .replaceAll(LITERAL_PERCENT_SENTINEL, '%')
          .replaceAll(LITERAL_DOLLAR_SENTINEL, '$'),
      expanded: expandedNames.length > 0,
      names: expandedNames,
      error
    };
  }
}

module.exports = {
  VariableEngine,
  normalizeVariableName,
  normalizeSimpleVariableName,
  normalizeVariableValue,
  parseVariablePath,
  variableReferenceAt,
  LITERAL_PERCENT_SENTINEL,
  LITERAL_DOLLAR_SENTINEL,
  VARIABLE_NAME_MAX,
  VARIABLE_VALUE_MAX,
  VARIABLE_EXPANDED_MAX,
  DEFAULT_MAX_VARIABLES,
  DEFAULT_MAX_EXPANSION_DEPTH,
  DEFAULT_MAX_TABLE_DEPTH
};
