'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const rendererSource = fs.readFileSync(
  path.join(__dirname, '..', 'renderer', 'renderer.js'),
  'utf8'
);

function functionBlock(name) {
  const start = rendererSource.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = rendererSource.indexOf('\nfunction ', start + 1);
  return rendererSource.slice(start, next === -1 ? rendererSource.length : next);
}

test('Session Vitals reconciles keyed rows instead of replacing the whole list', () => {
  const renderBlock = functionBlock('renderSessionVitals');
  const reconcileBlock = functionBlock('reconcileSessionVitalRows');

  assert.match(renderBlock, /reconcileSessionVitalRows\(list, entries\)/u);
  assert.doesNotMatch(renderBlock, /replaceChildren|createDocumentFragment|createElement/u);
  assert.match(renderBlock, /if \(changed\) schedulePanelPopoutPublish\('sessionVitals'\)/u);

  assert.match(reconcileBlock, /new Map\(\)/u);
  assert.match(reconcileBlock, /dataset\?\.sessionId/u);
  assert.match(reconcileBlock, /list\.insertBefore\(row, cursor\)/u);
  assert.match(reconcileBlock, /row\.remove\(\)/u);
});

test('Session Vitals row updates are change-aware and preserve row identity', () => {
  const updateBlock = functionBlock('updateSessionVitalRow');

  assert.match(updateBlock, /setTextIfChanged\(parts\?\.name/u);
  assert.match(updateBlock, /setTextIfChanged\(parts\?\.hp/u);
  assert.match(updateBlock, /setTextIfChanged\(parts\?\.mana/u);
  assert.match(updateBlock, /setTextIfChanged\(parts\?\.move/u);
  assert.match(updateBlock, /setAttributeIfChanged\(row, 'aria-label'/u);
  assert.doesNotMatch(updateBlock, /replaceChildren|remove\(\)/u);
});

class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = String(tagName).toUpperCase();
    this.className = '';
    this.dataset = {};
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.textContent = '';
  }

  setAttribute(name, value) {
    this.attributes.set(String(name), String(value));
  }

  getAttribute(name) {
    return this.attributes.has(String(name)) ? this.attributes.get(String(name)) : null;
  }

  append(...nodes) {
    for (const node of nodes) this.insertBefore(node, null);
  }

  insertBefore(node, reference) {
    if (node.parentNode) {
      const oldIndex = node.parentNode.children.indexOf(node);
      if (oldIndex >= 0) node.parentNode.children.splice(oldIndex, 1);
    }
    const index = reference ? this.children.indexOf(reference) : -1;
    if (reference && index < 0) throw new Error('reference is not a child');
    if (index < 0) this.children.push(node);
    else this.children.splice(index, 0, node);
    node.parentNode = this;
    return node;
  }

  remove() {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.parentNode = null;
  }

  querySelector(selector) {
    const className = String(selector || '').replace(/^\./u, '');
    const queue = [...this.children];
    while (queue.length) {
      const node = queue.shift();
      const classes = String(node.className || '').split(/\s+/u);
      if (classes.includes(className)) return node;
      queue.push(...node.children);
    }
    return null;
  }

  get firstElementChild() {
    return this.children[0] || null;
  }

  get nextElementSibling() {
    if (!this.parentNode) return null;
    const index = this.parentNode.children.indexOf(this);
    return index >= 0 ? this.parentNode.children[index + 1] || null : null;
  }
}

function productionSessionVitalsHarness() {
  const source = [
    functionBlock('setTextIfChanged'),
    functionBlock('setAttributeIfChanged'),
    functionBlock('sessionVitalRowParts'),
    functionBlock('createSessionVitalRow'),
    functionBlock('updateSessionVitalRow'),
    functionBlock('reconcileSessionVitalRows')
  ].join('\n');
  const document = { createElement: (tagName) => new FakeElement(tagName) };
  const factory = new Function('document', `${source}\nreturn { reconcileSessionVitalRows };`);
  return factory(document);
}

test('production Session Vitals reconciler reuses unchanged rows and mutates only changed/stale entries', () => {
  const { reconcileSessionVitalRows } = productionSessionVitalsHarness();
  const list = new FakeElement('div');
  const initial = [
    { id: 'a', name: 'Alpha', hp: 100, mana: 90, move: 80, lowHealth: false, accessibleText: 'Alpha full' },
    { id: 'b', name: 'Bravo', hp: 70, mana: 60, move: 50, lowHealth: false, accessibleText: 'Bravo stable' }
  ];

  assert.equal(reconcileSessionVitalRows(list, initial), true);
  assert.equal(list.children.length, 2);
  const alpha = list.children[0];
  const bravo = list.children[1];

  assert.equal(reconcileSessionVitalRows(list, initial), false);
  assert.equal(list.children[0], alpha);
  assert.equal(list.children[1], bravo);

  const changed = [
    initial[0],
    { ...initial[1], hp: 20, lowHealth: true, accessibleText: 'Bravo low health' }
  ];
  assert.equal(reconcileSessionVitalRows(list, changed), true);
  assert.equal(list.children[0], alpha);
  assert.equal(list.children[1], bravo);
  assert.equal(bravo.querySelector('.session-vital-health').textContent, '20H');
  assert.match(bravo.querySelector('.session-vital-health').className, /session-vital-health-low/u);

  assert.equal(reconcileSessionVitalRows(list, [changed[1], changed[0]]), true);
  assert.equal(list.children[0], bravo);
  assert.equal(list.children[1], alpha);

  assert.equal(reconcileSessionVitalRows(list, [changed[1]]), true);
  assert.deepEqual(list.children, [bravo]);
  assert.equal(alpha.parentNode, null);
});
