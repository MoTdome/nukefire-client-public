'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sampleTinTin(size = 300) {
  const aliases = [];
  const variables = [];
  const functions = [];
  const actions = [];
  const gags = [];
  const highlights = [];
  const substitutes = [];
  const macros = [];
  const classes = [];
  for (let index = 0; index < size; index += 1) {
    aliases.push({ name: `a${index}`, body: `look; score; say alias ${index}`, priority: 5, className: index % 3 ? '' : 'combat' });
    variables.push({ name: `v${index}`, value: `value-${index}` });
    functions.push({ name: `f${index}`, body: `echo function ${index}` });
    actions.push({ pattern: `^Enemy ${index} hits`, command: `counter ${index}`, priority: 5, enabled: true });
    gags.push({ pattern: `noise ${index}`, enabled: true });
    highlights.push({ pattern: `danger ${index}`, style: 'bold red', priority: 5, enabled: true });
    substitutes.push({ pattern: `old ${index}`, replacement: `new ${index}`, priority: 5, enabled: true });
    macros.push({ key: `F${(index % 12) + 1}`, command: `command ${index}`, enabled: true });
    classes.push({ name: `class${index}`, saved: { aliases: aliases.slice(Math.max(0, aliases.length - 2)) } });
  }
  return {
    aliases, variables, functions,
    actions: { enabled: true, definitions: actions },
    gags: { enabled: true, definitions: gags },
    highlights: { enabled: true, definitions: highlights },
    substitutes: { enabled: true, definitions: substitutes },
    macros: { enabled: true, definitions: macros },
    tabs: [], events: { enabled: true, definitions: [] },
    config: { logMode: 'plain', commandEcho: false, autoTab: 0, verbatim: false, repeatChar: '!', repeatEnter: false, verbatimChar: '\\', historySize: 2000, bufferSize: 5000 },
    classes: { activeStack: ['class0'], definitions: classes },
    speedwalk: { enabled: true },
    profile: { requested: 'Prime', filename: 'Prime.tin', loaded: true }
  };
}

function normalizeLikeRenderer(source) {
  return {
    aliases: clone(source.aliases), variables: clone(source.variables), functions: clone(source.functions),
    actions: clone(source.actions), gags: clone(source.gags), highlights: clone(source.highlights),
    substitutes: clone(source.substitutes), macros: clone(source.macros), tabs: clone(source.tabs),
    events: clone(source.events), config: clone(source.config), classes: clone(source.classes),
    speedwalk: { enabled: source.speedwalk.enabled === true }, profile: { ...source.profile }
  };
}

test('session capture and activation reuse canonical TinTin snapshots instead of normalizing twice', () => {
  assert.match(renderer, /function applyTinTinStateToRecord\(record, input = \{\}, options = \{\}\)/u);
  assert.match(renderer, /options\.normalized === true \? input : normalizeSessionTinTinState\(input\)/u);
  const capture = renderer.match(/function captureActiveSessionState\(options = \{\}\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(capture, /const tintin = currentDefinitionSnapshot\(record\.id\);/u);
  assert.match(capture, /applyTinTinStateToRecord\(record, tintin, \{ normalized: true \}\)/u);
  assert.match(renderer, /applyTinTinStateToRecord\(record, record\?\.tintin \|\| \{\}, \{ normalized: Boolean\(record\?\.tintin\) \}\)/u);
});

test('Definition Manager reads only the active category and reuses one record list per render', () => {
  const records = renderer.match(/function definitionManagerRecords\(\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(records, /const source = state\.sessions\[category\]/u);
  assert.doesNotMatch(records, /currentDefinitionSnapshot/u);
  const render = renderer.match(/function renderDefinitionManagerList\(\) \{([\s\S]*?)\n\}/u)?.[1] || '';
  assert.match(render, /const allRecords = definitionManagerRecords\(\)/u);
  assert.match(render, /definitionManagerFilteredRecords\(allRecords\)/u);
  assert.match(render, /const total = allRecords\.length/u);
});

test('avoiding a second canonical TinTin normalization materially reduces large-session capture work', () => {
  const source = sampleTinTin(180);
  const iterations = 24;
  let sink = 0;

  const measureBaseline = () => {
    const started = performance.now();
    for (let index = 0; index < iterations; index += 1) {
      const first = normalizeLikeRenderer(source);
      const second = normalizeLikeRenderer(first);
      sink += second.aliases.length + second.actions.definitions.length;
    }
    return performance.now() - started;
  };

  const measureCandidate = () => {
    const started = performance.now();
    for (let index = 0; index < iterations; index += 1) {
      const canonical = normalizeLikeRenderer(source);
      sink += canonical.aliases.length + canonical.actions.definitions.length;
    }
    return performance.now() - started;
  };

  for (let warmup = 0; warmup < 3; warmup += 1) {
    measureBaseline();
    measureCandidate();
  }

  const baselineSamples = [];
  const candidateSamples = [];
  for (let round = 0; round < 9; round += 1) {
    if (round % 2 === 0) {
      baselineSamples.push(measureBaseline());
      candidateSamples.push(measureCandidate());
    } else {
      candidateSamples.push(measureCandidate());
      baselineSamples.push(measureBaseline());
    }
  }

  const median = (values) => {
    const ordered = values.slice().sort((left, right) => left - right);
    return ordered[Math.floor(ordered.length / 2)];
  };
  const baselineMs = median(baselineSamples);
  const candidateMs = median(candidateSamples);

  assert.ok(sink > 0);
  assert.ok(candidateMs * 1.35 < baselineMs,
    `expected canonical reuse to be materially cheaper; baseline=${baselineMs.toFixed(2)}ms candidate=${candidateMs.toFixed(2)}ms`);
});
