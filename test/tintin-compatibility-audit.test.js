'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const audit = require('../src/tintin-compatibility-audit');

const C = audit.CLASSIFICATIONS;

function entryFor(result, directive, predicate = () => true) {
  return result.entries.find((entry) => entry.directive === directive && predicate(entry));
}

test('official TinTin command inventory is fully classified instead of silently unknown', () => {
  assert.ok(audit.OFFICIAL_COMMANDS.length >= 70);
  for (const directive of audit.OFFICIAL_COMMANDS) {
    const result = audit.classifyDirective(directive, []);
    assert.ok(Object.values(C).includes(result.classification), directive);
    assert.ok(result.detail, directive);
  }
});

test('current native, translated, compatibility-noop, and blocked ownership is explicit', () => {
  assert.equal(audit.classifyDirective('alias', ['x', 'look']).classification, C.NATIVE);
  assert.equal(audit.classifyDirective('all', []).classification, C.TRANSLATED);
  assert.equal(audit.classifyDirective('split', []).classification, C.NOOP);
  assert.equal(audit.classifyDirective('system', []).classification, C.BLOCKED);
  assert.equal(audit.classifyDirective('script', []).classification, C.BLOCKED);
  assert.equal(audit.classifyDirective('textin', []).classification, C.BLOCKED);
});

test('LIST audit separates the current native operations from remaining veteran gaps', () => {
  for (const operation of ['add', 'create', 'tokenize', 'find', 'get', 'set', 'size', 'delete', 'clear', 'insert', 'ins', 'sort', 'order', 'reverse']) {
    assert.equal(audit.classifyDirective('list', ['items', operation]).classification, C.NATIVE);
  }
  for (const operation of ['simplify', 'filter']) {
    const result = audit.classifyDirective('list', ['items', operation]);
    assert.equal(result.classification, C.NEEDS, operation);
    assert.match(result.detail, new RegExp(operation, 'iu'));
  }
});

test('new veteran runtime forms classify correctly while query gaps stay visible', () => {
  assert.equal(audit.classifyDirective('send', ['look']).classification, C.TRANSLATED);
  assert.equal(audit.classifyDirective('ticker', ['main']).classification, C.NATIVE);
  assert.equal(audit.classifyDirective('line', ['strip', 'x']).classification, C.TRANSLATED);
  assert.equal(audit.classifyDirective('ticker', ['main', 'score', '60']).classification, C.NATIVE);
  assert.equal(audit.classifyDirective('line', ['oneshot', 'score']).classification, C.NATIVE);
  assert.equal(audit.classifyDirective('session', ['derf', '$address']).classification, C.NEEDS);
  assert.equal(audit.classifyDirective('session', ['derf', 'mud.example', '4000']).classification, C.TRANSLATED);
  assert.equal(audit.classifyDirective('foreach', ['*queue[]', 'q', 'look']).classification, C.NEEDS);
  assert.equal(audit.classifyDirective('foreach', ['*queue[%*]', 'q', 'look']).classification, C.NATIVE);
  assert.equal(audit.classifyDirective('if', ['&queue[]', '#send', '1'], { argumentMeta: [{value:'&queue[]',braced:false},{value:'#send',braced:false},{value:'1',braced:false}] }).classification, C.NATIVE);
});

test('event audit recognizes private, clock, and protocol event families now supported', () => {
  for (const name of ['SESSION CONNECTED', 'SESSION ACTIVATED', 'SECOND', 'IAC WILL GMCP']) {
    assert.equal(audit.classifyDirective('event', [name, '#showme ok']).classification, C.NATIVE);
  }
  assert.equal(audit.classifyDirective('event', ['MINUTE', '#showme tick']).classification, C.NATIVE);
  assert.equal(audit.classifyDirective('event', ['TIME 12:30', '#showme noon']).classification, C.NATIVE);
  assert.equal(audit.classifyDirective('event', ['VARIABLE UPDATE hp', '#showme changed']).classification, C.NATIVE);
  assert.equal(audit.classifyDirective('event', ['SESSION CONNECTED']).classification, C.NATIVE);
});

test('nested Alias and Action bodies are audited without executing them', () => {
  const source = [
    '#alias {prep} {#list temp create %0;#send score}',
    '#action {PRESS RETURN} {#list temp simplify;#system {echo nope}}'
  ].join('\n');
  const result = audit.auditTinTinSource(source, { filename: 'nested.tin' });
  assert.equal(result.ok, true);
  assert.equal(entryFor(result, 'alias').classification, C.NATIVE);
  assert.equal(entryFor(result, 'list', (entry) => /CREATE/u.test(entry.detail)).classification, C.NATIVE);
  assert.equal(entryFor(result, 'send').classification, C.TRANSLATED);
  assert.equal(entryFor(result, 'system').classification, C.BLOCKED);
});

test('veteran one-character apostrophe Alias is reported rather than discarded', () => {
  const result = audit.auditTinTinSource("#alias ' scan", { filename: 'old.tin' });
  const alias = entryFor(result, 'alias');
  assert.equal(alias.classification, C.NEEDS);
  assert.match(alias.detail, /Alias name/u);
});

test('tree audit resolves safe static READ variables and recursively audits reachable files', async () => {
  const files = new Map([
    ['login.tin', '#action {PRESS RETURN} {#read $file}'],
    ['main.tin', '#alias {go} {#send north}']
  ]);
  const result = await audit.auditTinTinTree('#var {file} {main.tin}\n#event {SESSION CONNECTED} {#read login.tin}', {
    filename: 'nf.tin',
    readFile: async (requested) => files.has(requested)
      ? { ok: true, filename: requested, content: files.get(requested) }
      : { ok: false, error: 'missing' }
  });
  assert.equal(result.filesRead, 3);
  assert.equal(result.includes.filter((entry) => entry.status === 'resolved').length, 2);
  assert.equal(entryFor(result, 'send').classification, C.TRANSLATED);
});

test('dynamic character READs are reported without guessing a filename or executing a profile', async () => {
  let reads = 0;
  const result = await audit.auditTinTinTree('#event {SESSION CONNECTED} {#var {me} {%0}}\n#read {$me.tin}', {
    filename: 'main.tin',
    readFile: async () => { reads += 1; return { ok: false }; }
  });
  assert.equal(reads, 0);
  assert.equal(result.unresolvedReads, 1);
  assert.equal(result.includes[0].status, 'dynamic-unresolved');
});

test('recursive READ cycles are bounded and classified without repeated execution', async () => {
  const files = new Map([
    ['a.tin', '#read b.tin'],
    ['b.tin', '#read a.tin']
  ]);
  const result = await audit.auditTinTinTree(files.get('a.tin'), {
    filename: 'a.tin',
    readFile: async (requested) => ({ ok: true, filename: requested, content: files.get(requested) || '' })
  });
  assert.equal(result.filesRead, 2);
  assert.ok(result.includes.some((entry) => entry.status === 'cycle' || entry.status === 'already-audited'));
});

test('veteran second-setup shapes expose SEND LIST TICKER and Alias-name gaps without secrets', async () => {
  const source = [
    '#var {file} {main.tin}',
    '#alias {crew} {#foreach {$crew} {man} {#session $man $address}}',
    '#action {PRESS RETURN} {#read $file;#send {}}',
    '#list {recipients} {create} {%0}',
    '#list {recipients} {simplify}',
    '#list {queue} {insert} {-1} {%0}',
    '#ticker {main}',
    "#alias ' scan",
    '#alias {priority} {look} {6}',
    '#session {derf} {$address}',
    '#foreach {*queue[]} {q} {#send $queue[$q]}'
  ].join('\n');
  const result = await audit.auditTinTinTree(source, {
    filename: 'sanitized-veteran.tin',
    readFile: async () => ({ ok: true, filename: 'main.tin', content: '#list {events} {clear}' })
  });
  const todo = result.entries.filter((entry) => entry.classification === C.NEEDS);
  assert.equal(result.entries.find((entry) => entry.directive === 'send')?.classification, C.TRANSLATED);
  assert.ok(todo.filter((entry) => entry.directive === 'list').length >= 1);
  assert.equal(result.entries.find((entry) => entry.directive === 'ticker')?.classification, C.NATIVE);
  assert.ok(todo.some((entry) => entry.directive === 'alias'));
  assert.ok(todo.some((entry) => entry.directive === 'session'));
  assert.ok(todo.some((entry) => entry.directive === 'foreach'));
  const report = audit.formatTinTinCompatibilityAudit(result).join('\n');
  assert.doesNotMatch(report, /password|secret_derf|hunter2/iu);
  assert.match(report, /NOTHING EXECUTED/u);
});



test('audit parser accepts veteran literal-backslash CONFIG tokens used by MM and Noth', () => {
  for (const filename of ['mm.tin', 'noth.tin']) {
    const source = [
      '#CONFIG {VERBATIM} {OFF}',
      '#CONFIG {VERBATIM CHAR} {\\}',
      '#CONFIG {VERBOSE} {OFF}',
      '#showme {still reachable}'
    ].join('\n');
    const result = audit.auditTinTinSource(source, { filename });
    assert.equal(result.ok, true, filename);
    assert.equal(result.errors.length, 0, filename);
    assert.ok(result.entries.some((entry) => entry.line === 4 && entry.directive === 'showme'), filename);
  }
});

test('audit keeps physical line numbers through multiline brace groups', () => {
  const source = [
    '#action {first}',
    '{',
    '  #showme {inside}',
    '}',
    '',
    '#action {second} {#2 sling \'blind\' worm}',
    '#ticket next call auto double_barrel 3'
  ].join('\n');
  const result = audit.auditTinTinSource(source, { filename: 'lines.tin' });
  assert.equal(result.ok, true);
  assert.equal(entryFor(result, 'action', (entry) => entry.line === 6).line, 6);
  assert.equal(entryFor(result, 'repeat').line, 6);
  assert.equal(entryFor(result, 'ticket').line, 7);
});

test('numeric #N shorthand is identified as TinTin repeat syntax instead of an unknown directive', () => {
  const result = audit.auditTinTinSource("#action {spawn} {#2 sling 'blind' monstrosity}", { filename: 'jegs-repeat.tin' });
  const repeat = entryFor(result, 'repeat');
  assert.equal(repeat.classification, C.NATIVE);
  assert.match(repeat.detail, /bounded numeric-repeat executor/iu);
  assert.equal(result.entries.some((entry) => entry.directive === '2'), false);
  assert.ok(result.entries.some((entry) => entry.directive === 'server-command' && entry.context.includes('repeat')));
});

test('audit resolves official TinTin abbreviations and recognizes runtime-supported SHOW', () => {
  const show = audit.auditTinTinSource('#show {hello}', { filename: 'abbr.tin' });
  const showEntry = entryFor(show, 'showme');
  assert.equal(showEntry.classification, C.NATIVE);
  assert.match(showEntry.detail, /existing local #SHOWME display path/iu);

  const sys = audit.auditTinTinSource('#sys echo nope', { filename: 'abbr.tin' });
  const sysEntry = entryFor(sys, 'system');
  assert.equal(sysEntry.classification, C.BLOCKED);
  assert.match(sysEntry.detail, /abbreviates blocked #SYSTEM/iu);

  assert.equal(audit.auditTinTinSource('#sho {hello}', { filename: 'abbr.tin' }).entries[0].classification, C.NATIVE);
});

test('CHAT and SYSTEM remain explicit safety blocks rather than compatibility TODOs', () => {
  assert.equal(audit.classifyDirective('chat', ['init', '5555']).classification, C.BLOCKED);
  assert.equal(audit.classifyDirective('system', ['echo', 'nope']).classification, C.BLOCKED);
  assert.match(audit.classifyDirective('chat', []).detail, /peer-to-peer|network/iu);
  assert.match(audit.classifyDirective('system', []).detail, /shell/iu);
});

test('audit pre-scans static SESSION and SNOOP names before classifying earlier route use', () => {
  const source = [
    '#ff look',
    '#thog score',
    '#session ff example.org 4000',
    '#snoop thog on'
  ].join('\n');
  const result = audit.auditTinTinSource(source, { filename: 'routes.tin' });
  assert.equal(entryFor(result, 'ff').classification, C.TRANSLATED);
  assert.equal(entryFor(result, 'thog').classification, C.TRANSLATED);
});

test('repeated veteran unknown client-prefix names are conservatively inferred as probable session routes', () => {
  const source = [
    '#alias {crew} {#amon score;#obed look;#ww #var x 1}',
    '#delay {.1} {#amon north;#ww #var mid 1}',
    '#delay {.2} {#obed south;#amon east}',
    '#delay {.3} {#obed west}',
    '#ww #var y 2',
    '#ticket next call auto double_barrel 3'
  ].join('\n');
  const result = audit.auditTinTinSource(source, { filename: 'crew-routes.tin' });
  for (const name of ['amon', 'obed', 'ww']) {
    const entries = result.entries.filter((entry) => entry.directive === name);
    assert.ok(entries.length >= 3, name);
    assert.ok(entries.every((entry) => entry.classification === C.TRANSLATED), name);
    assert.ok(entries.some((entry) => /Probable named-session route/iu.test(entry.detail)), name);
  }
  assert.equal(entryFor(result, 'ticket').classification, C.NEEDS);
});

test('renderer and SessionManager integration expose an explicit read-only AUDIT command', () => {
  const root = path.resolve(__dirname, '..');
  const manager = fs.readFileSync(path.join(root, 'src/session-manager.js'), 'utf8');
  const renderer = fs.readFileSync(path.join(root, 'renderer/renderer.js'), 'utf8');
  const html = fs.readFileSync(path.join(root, 'renderer/index.html'), 'utf8');
  const help = fs.readFileSync(path.join(root, 'src/client-command-help.js'), 'utf8');
  assert.match(manager, /parsed\.directive === 'audit'/u);
  assert.match(manager, /script-audit-request/u);
  assert.match(renderer, /handleTinTinAuditRequest/u);
  assert.match(renderer, /NukeFireTinTinCompatibilityAudit/u);
  assert.match(renderer, /script-audit-request/u);
  assert.match(html, /tintin-compatibility-audit\.js/u);
  assert.match(help, /name: 'audit'/u);
  assert.match(help, /Nothing is executed/u);
});
