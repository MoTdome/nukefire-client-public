'use strict';

const DEFAULT_MAX_SPEEDWALK_STEPS = 200;
const SPEEDWALK_DIRECTIONS = Object.freeze(new Set(['n', 'e', 's', 'w', 'u', 'd']));

function normalizeMaximum(value, fallback = DEFAULT_MAX_SPEEDWALK_STEPS) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(1, Math.min(1000, Math.trunc(number)));
}

function parseSpeedwalk(input, options = {}) {
  const source = String(input ?? '').trim();
  const maximum = normalizeMaximum(options.maxSteps);
  if (!source) return { matched: false, steps: [], normalized: '', error: '' };

  // NukeFire's lowercase `news` command is direction-shaped but is not a route.
  // Preserve it literally while keeping compact routes such as `nesw` and
  // spaced `n e w s` available to players who intentionally use speedwalk.
  if (source === 'news') {
    return { matched: false, steps: [], normalized: source, error: '' };
  }

  // Capitalization remains an explicit escape hatch for other direction-shaped
  // MUD commands. Only all-lowercase compact routes are otherwise eligible.
  const compact = source.replace(/\s+/gu, '');
  if (!compact || !/^[0-9neswud]+$/u.test(compact)) {
    return { matched: false, steps: [], normalized: compact, error: '' };
  }

  // Bare numbers are ordinary MUD input, especially login and menu choices.
  // A compact speedwalk must contain at least one direction letter.
  if (/^\d+$/u.test(compact)) {
    return { matched: false, steps: [], normalized: compact, error: '' };
  }

  const steps = [];
  let index = 0;

  while (index < compact.length) {
    let count = 1;
    const countStart = index;

    if (/\d/u.test(compact[index])) {
      while (index < compact.length && /\d/u.test(compact[index])) index += 1;
      const rawCount = compact.slice(countStart, index);
      if (index >= compact.length) {
        return {
          matched: true,
          steps: [],
          normalized: compact,
          error: `Speedwalk error at position ${countStart + 1}: repeat count ${rawCount} needs a direction.`
        };
      }
      if (/^0+$/u.test(rawCount)) {
        return {
          matched: true,
          steps: [],
          normalized: compact,
          error: `Speedwalk error at position ${countStart + 1}: repeat counts must be at least 1.`
        };
      }
      if (rawCount.length > 6) count = maximum + 1;
      else count = Number.parseInt(rawCount, 10);
    }

    const direction = compact[index];
    if (!SPEEDWALK_DIRECTIONS.has(direction)) {
      return { matched: false, steps: [], normalized: compact, error: '' };
    }
    index += 1;

    if (!Number.isSafeInteger(count) || count < 1 || steps.length + count > maximum) {
      return {
        matched: true,
        steps: [],
        normalized: compact,
        error: `Speedwalk exceeds the ${maximum}-step safety limit. Nothing was sent.`
      };
    }

    for (let repeat = 0; repeat < count; repeat += 1) steps.push(direction);
  }

  return {
    // A single direction is an ordinary MUD command. Speedwalk takes over only
    // when the compact route expands to more than one movement step.
    matched: steps.length > 1,
    steps,
    normalized: compact,
    error: ''
  };
}

module.exports = {
  parseSpeedwalk,
  DEFAULT_MAX_SPEEDWALK_STEPS,
  SPEEDWALK_DIRECTIONS
};
