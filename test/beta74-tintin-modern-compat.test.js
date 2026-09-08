'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { VariableEngine } = require('../src/variable-engine');
const { formatTinTinEcho } = require('../src/echo-format');
const { SessionManager } = require('../src/session-manager');
const { migrateLegacyNukeFireTableKeySyntax } = require('../src/tintin-script-loader');

function manager() { return new SessionManager({ connectionFactory: () => ({ connect(){}, disconnect(){}, send(){return true;}, setTerminalSize(){}, setScreenReaderMode(){}, setCompressionEnabled(){}, setClientPreferences(){return {};}, sendGmcp(){return true;} }) }); }

test('modern table sigils use star for keys, dollar for values, ampersand for size', () => {
  const e = new VariableEngine(); e.define('friends[bob]','one'); e.define('friends[pam]','two');
  assert.equal(e.expand('*friends[]').value, '{bob}{pam}');
  assert.equal(e.expand('$friends[]').value, '{one}{two}');
  assert.equal(e.expand('&friends[]').value, '2');
});

test('legacy NukeFire generated files migrate old dollar empty-selector key lists', () => {
  const r=migrateLegacyNukeFireTableKeySyntax('/* NukeFire Client TinTin command file. */\n#foreach {$friends[]} {k} {#show $k}');
  assert.equal(r.migrated,1); assert.match(r.source,/\*friends\[\]/u);
});

test('FORMAT D X x and M use modern TinTin meanings', () => {
  assert.equal(formatTinTinEcho('%D',['ff']).text,'255');
  assert.equal(formatTinTinEcho('%X',['255']).text,'FF');
  assert.equal(formatTinTinEcho('%x',['41']).text,'A');
  assert.match(formatTinTinEcho('%M',['1500']).text,/1\.5k/u);
});

test('REPLACE is regexp based and exposes ampersand captures', () => {
  const m=manager(); const s=m.createSession({name:'x'}); m.dispatchInput(s.id,'#var {text} {abc123XYZ}');
  m.dispatchInput(s.id,'#replace {text} {abc%1XYZ} {<&1>}');
  assert.equal(m.variableEngine.get('text').value,'<123>');
});

test('KILL family pattern removes every matching definition', () => {
  const m=manager(); const s=m.createSession({name:'x'}); m.dispatchInput(s.id,'#alias {testone} {look}'); m.dispatchInput(s.id,'#alias {othertest} {look}'); m.dispatchInput(s.id,'#alias {keep} {look}');
  m.dispatchInput(s.id,'#kill {aliases} {%*test%*}');
  assert.deepEqual(m.aliasEngine.list().map(r=>r.name),['keep']);
});

test('CAT concatenates scalar variables', () => {
  const m=manager(); const s=m.createSession({name:'x'}); m.dispatchInput(s.id,'#var {x} {hello}'); m.dispatchInput(s.id,'#cat {x} { world}');
  assert.equal(m.variableEngine.get('x').value,'hello world');
});

test('modern LIST collapse explode numerate swap reverse and shuffle-safe operations preserve bounds', () => {
  const m=manager(); const s=m.createSession({name:'x'}); m.dispatchInput(s.id,'#list {x} {create} {a;b;c}');
  m.dispatchInput(s.id,'#list {x} {swap} {1} {-1}'); assert.equal(m.variableEngine.expand('$x[]').value,'{c}{b}{a}');
  m.dispatchInput(s.id,'#list {x} {reverse}'); assert.equal(m.variableEngine.expand('$x[]').value,'{a}{b}{c}');
  m.dispatchInput(s.id,'#list {x} {collapse} {|}'); assert.equal(m.variableEngine.get('x').value,'a|b|c');
  m.dispatchInput(s.id,'#list {x} {explode} {|}'); assert.equal(m.variableEngine.expand('$x[]').value,'{a}{b}{c}');
});

test('LINE quiet suppresses command feedback and verbatim avoids variable substitution', () => {
  const m=manager(); const s=m.createSession({name:'x'}); m.dispatchInput(s.id,'#var {x} {VALUE}');
  const q=m.dispatchInput(s.id,'#line quiet {#var {y} {yes}}'); assert.deepEqual(q.messages,[]); assert.equal(m.variableEngine.get('y').value,'yes');
  m.dispatchInput(s.id,'#line verbatim {#var {z} {$x}}'); assert.equal(m.variableEngine.get('z').value,'$x');
});


test('CAT merges TinTin tables instead of flattening them', () => {
  const m=manager(); const s=m.createSession({name:'x'});
  m.dispatchInput(s.id,'#var {left} {{a}{1}{b}{2}}');
  m.dispatchInput(s.id,'#var {right} {{c}{3}{d}{4}}');
  m.dispatchInput(s.id,'#cat {right} {$left}');
  assert.equal(m.variableEngine.get('right[a]').value,'1');
  assert.equal(m.variableEngine.get('right[d]').value,'4');
});

test('modern LIST preserves nested list tables through INDEXATE ORDER and TABULATE', () => {
  const m=manager(); const s=m.createSession({name:'x'});
  m.dispatchInput(s.id,'#list {friends} {create} {{{name}{bob}{age}{54}};{{name}{pam}{age}{31}}}');
  m.dispatchInput(s.id,'#list {friends} {indexate} {age}');
  m.dispatchInput(s.id,'#list {friends} {order}');
  assert.equal(m.variableEngine.get('friends[1][name]').value,'pam');
  assert.equal(m.variableEngine.get('friends[2][name]').value,'bob');
  m.dispatchInput(s.id,'#list {friends} {tabulate} {name}');
  assert.equal(m.variableEngine.get('friends[pam][age]').value,'31');
  assert.equal(m.variableEngine.get('friends[bob][age]').value,'54');
});

test('LIST SORT globally sorts existing and added values like current TinTin', () => {
  const m=manager(); const s=m.createSession({name:'x'});
  m.dispatchInput(s.id,'#list {q} {create} {gamma;delta}');
  m.dispatchInput(s.id,'#list {q} {sort} {alpha}');
  assert.equal(m.variableEngine.expand('$q[]').value,'{alpha}{delta}{gamma}');
});

test('LINE JSON serializes nested TinTin tables into ampersand zero', () => {
  const m=manager(); const s=m.createSession({name:'x'});
  m.dispatchInput(s.id,'#var {profile} {{name}{Bob}{stats}{{hp}{100}{mana}{50}}}');
  m.dispatchInput(s.id,'#line json {profile} {#var {jsoncopy} {&0}}');
  assert.deepEqual(JSON.parse(m.variableEngine.get('jsoncopy').value), { name:'Bob', stats:{ hp:'100', mana:'50' } });
});
