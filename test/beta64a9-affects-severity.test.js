'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const affects = require('../src/affects');

test('Affects severity follows NukeFire apply direction instead of generic sign rules', () => {
  for (const [apply, modifier] of [
    ['MAXHIT', -100], ['MAXMANA', -100], ['MAXMOVE', -100],
    ['HITROLL', -5], ['DAMROLL', -5], ['ONE_HIT', -2],
    ['STR', -2], ['DEX', -2], ['DODGEROLL', -4],
    ['ARMOR', 100], ['FIGHTSPEED', 2], ['MAJOR_WOUND', 5]
  ]) assert.equal(affects.isHarmfulModifier(apply, modifier), true, `${apply} ${modifier}`);

  for (const [apply, modifier] of [
    ['MAXHIT', 100], ['MAXMANA', 100], ['MAXMOVE', 100],
    ['HITROLL', 5], ['DAMROLL', 5], ['ONE_HIT', 2],
    ['ARMOR', -100], ['FIGHTSPEED', -2], ['DODGEROLL', 4]
  ]) assert.equal(affects.isHarmfulModifier(apply, modifier), false, `${apply} ${modifier}`);
});

test('known hostile spell states are marked harmful while mixed transformation tradeoffs remain local to details', () => {
  for (const spell of ['doom', 'pestilence', 'poison', 'curse', 'blindness', 'chill touch', 'rotting blight', 'sleep']) {
    assert.equal(affects.isHarmfulSpell(spell), true, spell);
  }
  assert.equal(affects.isHarmfulSpell('shapeshift'), false);

  const groups = affects.groupEffects({ effects: [
    { id: '1', spell_id: 100, spell: 'doom', expire_at: 2000, apply: 'HITROLL', modifier: -35, source_type: 'spell' },
    { id: '2', spell_id: 100, spell: 'doom', expire_at: 2000, apply: 'ARMOR', modifier: 500, source_type: 'spell' },
    { id: '3', spell_id: 200, spell: 'shapeshift', expire_at: 2200, apply: 'MAXHIT', modifier: 500, source_type: 'spell' },
    { id: '4', spell_id: 200, spell: 'shapeshift', expire_at: 2200, apply: 'WIS', modifier: -4, source_type: 'spell' }
  ]});
  const doom = groups.find((group) => group.spell === 'doom');
  const shapeshift = groups.find((group) => group.spell === 'shapeshift');
  assert.equal(doom.harmful, true);
  assert.equal(shapeshift.harmful, false);
  assert.equal(affects.groupDetailEntries(shapeshift).find((entry) => /WIS/u.test(entry.text)).harmful, true);

  const pureDebuff = affects.groupEffects({ effects: [
    { id: '5', spell_id: 300, spell: 'crippling blow', expire_at: 2300, apply: 'HITROLL', modifier: -30, source_type: 'spell' },
    { id: '6', spell_id: 300, spell: 'crippling blow', expire_at: 2300, apply: 'DODGEROLL', modifier: -25, source_type: 'spell' }
  ]})[0];
  assert.equal(pureDebuff.harmful, true);
});


test('Affects renderer exposes harmful state visually and accessibly without changing mixed-buff names', () => {
  const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
  const styles = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
  assert.match(renderer, /row\.dataset\.harmful = String\(Boolean\(group\.harmful\)\)/u);
  assert.match(renderer, /harmful effect/u);
  assert.match(renderer, /Harmful modifier:/u);
  assert.ok(styles.includes('.affect-row[data-harmful="true"] .affect-name'));
  assert.ok(styles.includes('color: #ff6b6b;'));
});
