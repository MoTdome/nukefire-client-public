'use strict';

const MAX_LUA_AUTOMATION_PATTERN = 512;
const MAX_LUA_AUTOMATION_CAPTURES = 99;

function normalizeLuaAutomationPattern(value) {
  const source = String(value ?? '').normalize('NFKC');
  if (!source || source.length > MAX_LUA_AUTOMATION_PATTERN) return '';
  if (/\r|\n|\u0000/u.test(source)) return '';
  return source;
}

// This is intentionally conservative rather than a full regexp parser. The
// goal is to reject the common nested-quantifier shapes that can turn a
// temporary convenience trigger into catastrophic main-thread backtracking.
// Ordinary Mudlet-style anchors, groups, alternation, classes, lookarounds and
// captures remain available when they are also valid JavaScript RegExp syntax.
function hasRiskyNestedQuantifier(sourceValue) {
  const source = String(sourceValue || '');
  if (!source) return false;
  if (/\([^)]*(?:\*|\+|\{\d+(?:,\d*)?\})[^)]*\)(?:\*|\+|\{\d+(?:,\d*)?\})/u.test(source)) return true;
  if (/(?:\.\*|\.\+|\[[^\]]+\][*+])(?:\*|\+|\{\d+(?:,\d*)?\})/u.test(source)) return true;
  return false;
}

function compileLuaAutomationRegex(value) {
  const source = normalizeLuaAutomationPattern(value);
  if (!source || hasRiskyNestedQuantifier(source)) return null;
  try {
    return new RegExp(source, 'u');
  } catch {
    return null;
  }
}

function luaRegexMatchContext(matchValue) {
  const match = matchValue && typeof matchValue === 'object' ? matchValue : null;
  if (!match) return { matches: [], namedMatches: {} };
  const matches = Array.from(match)
    .slice(0, MAX_LUA_AUTOMATION_CAPTURES + 1)
    .map((value) => String(value ?? ''));
  const namedMatches = {};
  for (const [rawName, rawValue] of Object.entries(match.groups || {})) {
    const name = String(rawName || '');
    if (!name || name.length > 96 || !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(name)) continue;
    namedMatches[name] = String(rawValue ?? '');
  }
  return { matches, namedMatches };
}

module.exports = {
  compileLuaAutomationRegex,
  hasRiskyNestedQuantifier,
  luaRegexMatchContext,
  normalizeLuaAutomationPattern,
  MAX_LUA_AUTOMATION_PATTERN,
  MAX_LUA_AUTOMATION_CAPTURES
};
