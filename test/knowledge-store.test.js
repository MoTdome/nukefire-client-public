'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  KNOWLEDGE_DOMAINS,
  KnowledgeController,
  normalizeDomains,
  normalizeResults,
  normalizeEntry
} = require('../src/knowledge-store');

test('normalizes multi-domain Knowledge results and structured entries safely', () => {
  const results = normalizeResults({
    requestId: 'query-1', query: ' leech ', count: 2,
    domains: ['HELP', 'items', 'commands'],
    results: [
      { type: 'HELP', key: 'LEECH', title: 'Leech', summary: 'Drain life.' },
      { type: 'ITEM', key: '57223', title: 'a Sliver\u0000 of Shadow', meta: 'ITEM · VNUM 57223' }
    ]
  });
  assert.equal(results.query, 'leech');
  assert.deepEqual(results.domains, ['help', 'item', 'command']);
  assert.equal(results.results[1].type, 'item');
  assert.equal(results.results[1].title, 'a Sliver of Shadow');

  const entry = normalizeEntry({
    requestId: 'entry-1', type: 'item', key: '57223', title: 'Sliver',
    body: 'Line one\r\nLine two', tags: ['Weapon', 'Weapon'],
    fields: [{ label: 'VNUM', value: 57223 }, { label: '', value: 'ignored' }],
    terminalCommand: '', aliases: ['sliver', 'sliver']
  });
  assert.equal(entry.body, 'Line one\nLine two');
  assert.deepEqual(entry.tags, ['Weapon']);
  assert.deepEqual(entry.fields, [{ label: 'VNUM', value: '57223' }]);
  assert.deepEqual(entry.aliases, ['sliver']);
});

test('normalizes requested domains and defaults to the complete console', () => {
  assert.deepEqual(normalizeDomains(['zones', 'spells', 'items']), ['zone', 'skill', 'item']);
  assert.deepEqual(normalizeDomains([]), KNOWLEDGE_DOMAINS);
});

test('rejects stale query and entry responses across domains', () => {
  let now = 1000;
  const controller = new KnowledgeController({ now: () => now++ });
  const first = controller.beginQuery('true', ['help']);
  const second = controller.beginQuery('57223', ['item']);

  assert.equal(controller.acceptResults({ requestId: first.requestId, query: 'true', results: [] }), false);
  assert.equal(controller.acceptResults({
    requestId: second.requestId, query: '57223', domains: ['item'],
    results: [{ type: 'item', key: '57223', title: 'Sliver' }]
  }), true);
  assert.deepEqual(controller.results.domains, ['item']);

  const entry = controller.beginEntry('item', '57223');
  assert.equal(controller.acceptEntry({ requestId: 'stale-entry', type: 'item', key: '57223' }), false);
  assert.equal(controller.acceptEntry({
    requestId: entry.requestId, type: 'item', key: '57223', title: 'Sliver',
    terminalCommand: 'identify sliver'
  }), true);
  assert.equal(controller.entry.terminalCommand, 'identify sliver');
});

test('accepts only errors belonging to the active request', () => {
  const controller = new KnowledgeController({ now: () => 1000 });
  const request = controller.beginQuery('remort');
  assert.equal(controller.acceptError({ requestId: 'other', message: 'No' }), false);
  assert.equal(controller.acceptError({ requestId: request.requestId, code: 'rate-limit', message: 'Pause.' }), true);
  assert.equal(controller.error.code, 'rate-limit');
});


test('appends paged Knowledge results without duplicates', () => {
  let now = 2000;
  const controller = new KnowledgeController({ now: () => now++ });
  const first = controller.beginQuery('helmet', ['item']);
  assert.deepEqual({ limit: first.limit, offset: first.offset }, { limit: 18, offset: 0 });
  assert.equal(controller.acceptResults({
    requestId: first.requestId, query: 'helmet', domains: ['item'],
    matched: 37, offset: 0, hasMore: true, nextOffset: 2,
    results: [
      { type: 'item', key: '100', title: 'helmet one' },
      { type: 'item', key: '101', title: 'helmet two' }
    ]
  }), true);

  const more = controller.beginNextPage();
  assert.equal(more.offset, 2);
  assert.equal(controller.acceptResults({
    requestId: more.requestId, query: 'helmet', domains: ['item'],
    matched: 37, offset: 2, hasMore: false, nextOffset: 4,
    results: [
      { type: 'item', key: '101', title: 'helmet two duplicate' },
      { type: 'item', key: '102', title: 'helmet three' }
    ]
  }), true);
  assert.deepEqual(controller.results.results.map((entry) => entry.key), ['100', '101', '102']);
  assert.equal(controller.results.matched, 37);
});
