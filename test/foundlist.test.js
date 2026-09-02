'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const foundlist = require('../src/foundlist');

test('normalizes and sorts server foundlist verdicts with upgrades first', () => {
  const info = foundlist.normalizeInfo({
    schema: 1,
    zone: { vnum: 300, name: 'The Road of Ra' },
    summary: { loadable: 5, found: 4, missing: 1, upgrades: 1, tossups: 1, downgrades: 1, unusable: 1 },
    items: [
      { vnum: 30004, name: 'old sandals', verdict: 'downgrade' },
      { vnum: 30002, name: 'sun ring', verdict: 'upgrade', minRemorts: 250 },
      { vnum: 30003, name: 'scarab', verdict: 'tossup' },
      { vnum: 30001, name: 'sealed blade', verdict: 'needs-remorts', minRemorts: 900 }
    ]
  });

  assert.equal(info.zone.vnum, 300);
  assert.deepEqual(info.items.map((item) => item.verdict), ['upgrade', 'tossup', 'downgrade', 'needs-remorts']);
  assert.deepEqual(foundlist.filterItems(info, 'upgrade').map((item) => item.vnum), [30002]);
  assert.deepEqual(foundlist.filterItems(info, 'unusable').map((item) => item.vnum), [30001]);
});

test('rejects malformed snapshots and unsafe item records', () => {
  assert.equal(foundlist.normalizeInfo({ schema: 2, zone: { vnum: 300 } }), null);
  const info = foundlist.normalizeInfo({ schema: 1, zone: { vnum: 300 }, items: [
    { vnum: -1, name: 'bad' },
    { vnum: 30001, name: 'good', verdict: 'invented' }
  ] });
  assert.equal(info.items.length, 1);
  assert.equal(info.items[0].verdict, 'neutral');
});
