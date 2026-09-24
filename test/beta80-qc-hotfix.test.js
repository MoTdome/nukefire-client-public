'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const findPattern = require('../src/tintin-find-pattern');
const mslp = require('../src/mslp-links');
const popoutCss = fs.readFileSync(path.join(root, 'renderer', 'popout.css'), 'utf8');

function matches(pattern, value) {
  const compiled = findPattern.compileTinTinFindPattern(pattern);
  assert.equal(compiled.ok, true, compiled.error);
  return new RegExp(compiled.regex, compiled.caseSensitive ? 'u' : 'iu').test(value);
}

test('QC: detached Terminal Wall popouts expose a forgiving grab shelf with hide grace', () => {
  assert.match(
    popoutCss,
    /body\[data-popout-chrome-auto-hide="true"\]:not\(\.screen-reader-mode\) \.popout-header\s*\{[^}]*padding-bottom:\s*16px;[^}]*translateY\(calc\(-100% \+ 16px\)\);[^}]*320ms/su
  );
  assert.match(
    popoutCss,
    /body\[data-frameless-popouts="true"\] \.popout-header\s*\{[^}]*-webkit-app-region:\s*drag;/su
  );
  assert.match(
    popoutCss,
    /body\.screen-reader-mode \.popout-header\s*\{[^}]*opacity:\s*1;[^}]*transform:\s*none;/su
  );
});

test('QC: visible Find uses the same TinTin wildcard token bodies as the core regexp engine', () => {
  assert.equal(matches('^%d$', '12345'), true);
  assert.equal(matches('^%D$', 'abc-xyz'), true);
  assert.equal(matches('^%S$', 'Alpha_1'), true);
  assert.equal(matches('^%s$', '   '), true);
  assert.equal(matches('^%w$', 'AbCd'), true);
  assert.equal(matches('^%w$', 'Ab3'), false);
  assert.equal(matches('^%W$', '123-'), true);
  assert.equal(matches('^A%.C$', 'AbC'), true);
  assert.equal(matches('^colou%?r$', 'colour'), true);
  assert.equal(matches('^colou%?r$', 'colouur'), true);
  assert.equal(matches('^colou%?r$', 'colouuur'), false);
  assert.equal(matches('^%Iwarning$', 'WARNING'), false);
  assert.equal(matches('^%iwarning$', 'WARNING'), true);
});

test('QC: MSLP PROMPT resolves through the protected prompt link kind', () => {
  const translator = new mslp.MslpTranslator();
  const text = translator.push('\x1b]68;1;PROMPT;say hello\x07\x1b[4mEdit greeting\x1b[24m');
  const uri = text.match(/nukefire-mslp-prompt:[^\x1b]+/u)?.[0] || '';
  assert.ok(uri);
  assert.deepEqual(mslp.resolveMslpUri(uri), {
    available: true, kind: 'prompt', value: 'say hello', items: []
  });
});

test('QC: secure and unsupported MSLP complex links cannot fall through into simple SEND links', () => {
  const secure = new mslp.MslpTranslator().push(
    '\x1b]68;2;SEND;quit\x07\x1b[4mQuit\x1b[24m'
  );
  assert.doesNotMatch(secure, /nukefire-mslp-(?:send|prompt|menu):/u);
  assert.match(secure, /Quit/u);

  const unsupported = new mslp.MslpTranslator().push(
    '\x1b]68;5;;target\x07\x1b[4mJump\x1b[24m'
  );
  assert.doesNotMatch(unsupported, /nukefire-mslp-(?:send|prompt|menu):/u);
});

test('QC: malformed MENU payloads are rejected and backslash remains literal', () => {
  assert.deepEqual(mslp.parseBracePairs('{Look}{look}{North}{north}'), [
    { label: 'Look', command: 'look' },
    { label: 'North', command: 'north' }
  ]);
  assert.deepEqual(mslp.parseBracePairs('{A\\\\B}{say A\\\\B}'), [
    { label: 'A\\\\B', command: 'say A\\\\B' }
  ]);
  assert.deepEqual(mslp.parseBracePairs('{Bad {nested}}{look}'), []);
  assert.deepEqual(mslp.parseBracePairs('{Odd}{look}{dangling}'), []);
  assert.deepEqual(mslp.parseBracePairs('{Good}{look} garbage'), []);
});

test('QC: a complex MSLP command is discarded if visible text intervenes before underline', () => {
  const translator = new mslp.MslpTranslator();
  const text = translator.push(
    '\x1b]68;1;SEND;quit\x07ordinary text \x1b[4mLook\x1b[24m'
  );
  assert.doesNotMatch(text, /nukefire-mslp-send:quit/u);
  assert.match(text, /nukefire-mslp-send:Look/u);
});
