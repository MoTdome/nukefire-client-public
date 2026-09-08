'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CLIENT_COMMAND_HELP_TOPICS,
  normalizeHelpTopic,
  listClientCommandHelp,
  clientCommandHelp
} = require('../src/client-command-help');

test('client help lists every supported command family with the active prefix', () => {
  const output = listClientCommandHelp('~').join('\n');
  assert.match(output, /current prefix: ~/u);
  assert.match(output, /~help \[command\]/u);
  assert.match(output, /~debug/u);
  assert.match(output, /~showme\/~show/u);
  assert.match(output, /~echo/u);
  assert.match(output, /~math/u);
  assert.match(output, /~format/u);
  assert.match(output, /~if\/~elseif\/~else/u);
  assert.match(output, /~alias\/~aliases/u);
  assert.match(output, /~highlight\/~high/u);
  assert.match(output, /~unhighlight\/~unhigh/u);
  assert.match(output, /~substitute\/~sub/u);
  assert.match(output, /~unsubstitute\/~unsub/u);
  assert.match(output, /~macro\/~mac/u);
  assert.match(output, /~unmacro\/~unmac/u);
  assert.match(output, /~delay/u);
  assert.match(output, /~return/u);
  assert.match(output, /~profile/u);
  assert.match(output, /~reload/u);
  assert.match(output, /~session\/~sessions/u);
  assert.match(output, /~all/u);
  assert.match(output, /~links/u);
  assert.match(output, /~~<server command>/u);
});

test('client help resolves aliases and rewrites examples for the selected prefix', () => {
  const output = clientCommandHelp('#variables', '^').join('\n');
  assert.match(output, /^\^variable —/u);
  assert.match(output, /\^variable \{name\} \{value\}/u);
  assert.match(output, /\^unvariable \{name\}/u);
  assert.match(output, /Related names: \^variables, \^unvariable/u);
});

test('client help documents modern star variable keys and TinTin foreground/background truecolor', () => {
  const variableOutput = clientCommandHelp('variable', '#').join('\n');
  assert.match(variableOutput, /\*table\[\]/u);
  assert.match(variableOutput, /\*table\[\+1\]\/\[-1\]/u);
  assert.match(variableOutput, /\$table\[\] returns direct child values/u);
  assert.match(variableOutput, /legacy files are migrated/u);

  const highlightOutput = clientCommandHelp('highlight', '#').join('\n');
  assert.match(highlightOutput, /<Frgb>\/<Brgb>/u);
  assert.match(highlightOutput, /<F0F0><B500>/u);
});

test('client help documents bounded math and stored formatting', () => {
  assert.match(clientCommandHelp('math', '#').join('\n'), /#math \{variable\} \{expression\}/u);
  assert.match(clientCommandHelp('math', '#').join('\n'), /dice with d/u);
  assert.match(clientCommandHelp('format', '~').join('\n'), /~format \{variable\} \{format\}/u);
  assert.match(clientCommandHelp('format', '~').join('\n'), /plain variable text/u);
});

test('client help covers command routing, repetition, links, and literal-prefix escape', () => {
  assert.match(clientCommandHelp('repeat', '#').join('\n'), /#\{number\} \{command\}/u);
  assert.match(clientCommandHelp('routing', '#').join('\n'), /#\{session-name\} \{command\}/u);
  const session = clientCommandHelp('session', '#').join('\n');
  assert.match(session, /#session \{name\} \{host\} \{port\} \[script\]/u);
  assert.match(session, /loads name\.tin before connecting/u);
  assert.match(session, /never inherits the creator session’s definitions/u);
  assert.match(session, /missing or invalid script leaves the new session clean/u);
  assert.match(session, /#session \{name\} reload/u);
  assert.match(session, /Alias\/Action totals/u);
  const profile = clientCommandHelp('profile', '#').join('\n');
  assert.match(profile, /#profile \[session\]/u);
  assert.match(profile, /private TinTin environment/u);
  const reload = clientCommandHelp('reload', '#').join('\n');
  assert.match(reload, /#reload \[session\]/u);
  assert.match(reload, /never falls back to another character’s profile/u);
  assert.match(clientCommandHelp('link', '#').join('\n'), /#link \{number\}/u);
  assert.match(clientCommandHelp('literal', '#').join('\n'), /##\{server command\}/u);
});

test('client help normalizes topics and gives a safe unknown-topic response', () => {
  assert.equal(normalizeHelpTopic('  #Aliases  '), 'aliases');
  assert.equal(CLIENT_COMMAND_HELP_TOPICS.some((topic) => topic.name === 'help'), true);
  assert.deepEqual(clientCommandHelp('{not a command}', '#'), [
    'No client help topic for "not-a-command".',
    'Use #help to list available client commands.'
  ]);
});


test('client help documents prefix-aware trigger-capable showme output separately from echo', () => {
  const output = clientCommandHelp('show', '^').join('\n');
  assert.match(output, /^\^showme —/u);
  assert.match(output, /\^showme \{text\}/u);
  assert.match(output, /\^show \{text\}/u);
  assert.match(output, /screen-reader output/u);
  assert.doesNotMatch(output, /\^echo/u);
});

test('client help documents bounded genuine echo formatting and no Action trigger', () => {
  const output = clientCommandHelp('echo', '^').join('\n');
  assert.match(output, /^\^echo —/u);
  assert.match(output, /\^echo \{format\} \{argument1\}/u);
  assert.match(output, /%s, %d, %f, %g, %t, %c, %a, and safe %m/u);
  assert.match(output, /never triggers Actions/u);
  assert.match(output, /Row positioning .* deferred/u);
});


test('client help documents visual-only TinTin highlight behavior and aliases', () => {
  const output = clientCommandHelp('unhigh', '^').join('\n');
  assert.match(output, /^\^highlight —/u);
  assert.match(output, /\^highlight \{pattern\} \{style\} \{priority 1-9\}/u);
  assert.match(output, /\^unhighlight \{pattern\}/u);
  assert.match(output, /screen-reader text keep the original words/u);
  assert.match(output, /Blink .* outside this interval/u);
});


test('client help documents one-pass substitutions and protected original processing', () => {
  const output = clientCommandHelp('unsub', '^').join('\n');
  assert.match(output, /^\^substitute —/u);
  assert.match(output, /\^substitute \{pattern\} \{replacement\} \{priority 1-9\}/u);
  assert.match(output, /\^unsubstitute \{pattern\}/u);
  assert.match(output, /before Highlights/u);
  assert.match(output, /Communications, and vitals keep the original server text/u);
  assert.match(output, /screen-reader text use the substituted display text/u);
});


test('client help documents pipeline-safe TinTin macro keys and deferred typing sequences', () => {
  const output = clientCommandHelp('unmac', '^').join('\n');
  assert.match(output, /^\^macro —/u);
  assert.match(output, /\^macro \{key\} \{command; command; \.\.\.\}/u);
  assert.match(output, /\^unmacro \{key\}/u);
  assert.match(output, /F1, Ctrl\+F1, Command\+K, Numpad8/u);
  assert.match(output, /F1-F12, navigation keys, Ctrl-Z, and the numeric keypad import as physical NukeFire keys/u);
  assert.match(output, /Ctrl-V is a terminal sequence-discovery aid/u);
  assert.match(output, /Plain typing sequences .* intentionally deferred/u);
});


test('client help documents bounded per-session pipeline debugging and secure redaction', () => {
  const output = clientCommandHelp('debug', '^').join('\n');
  assert.match(output, /^\^debug —/u);
  assert.match(output, /\^debug pipeline \{on\|off\|status\|show\|clear\}/u);
  assert.match(output, /bounded per-session log/u);
  assert.match(output, /Actions, Gags, Substitutes, and Highlights/u);
  assert.match(output, /completely redacted/u);
});

test('client help documents safe extensionless TinTin reads and unsupported-command reporting', () => {
  const output = clientCommandHelp('read', '^').join('\n');
  assert.match(output, /^\^read —/u);
  assert.match(output, /\^read \{Prime\}/u);
  assert.match(output, /Documents\/NukeFire Client\/Scripts/u);
  assert.match(output, /loaded atomically/u);
  assert.match(output, /never executed/u);
  assert.match(output, /merged only into the session that issued read/u);
  assert.match(output, /Use reload for a clean replacement/u);
});


test('client help documents deterministic safe TinTin writes and round-tripping', () => {
  const output = clientCommandHelp('write', '^').join('\n');
  assert.match(output, /^\^write —/u);
  assert.match(output, /\^write \{Prime\}/u);
  assert.match(output, /Extensionless names write a \.tin file/u);
  assert.match(output, /saved class snapshots/u);
  assert.match(output, /replaced atomically/u);
  assert.match(output, /only the issuing session’s definitions/u);
  assert.match(output, /bare write command writes that profile atomically/u);
});


test('variable help documents native TinTin dollar syntax and escaping', () => {
  const output = clientCommandHelp('variable', '#').join(' ');
  assert.match(output, /\$name/u);
  assert.match(output, /\$\$name/u);
  assert.match(output, /\\\$name/u);
  assert.match(output, /%name/u);
});

test('client help documents bounded Functions, locals, returns, and hidden-side-effect protection', () => {
  const functionOutput = clientCommandHelp('function', '^').join('\n');
  assert.match(functionOutput, /^\^function —/u);
  assert.match(functionOutput, /\^function \{name\} \{commands\}/u);
  assert.match(functionOutput, /@name\{argument1;argument2\}/u);
  assert.match(functionOutput, /%0 .* %1 through %99/u);
  assert.match(functionOutput, /if, elseif, else/u);
  assert.match(functionOutput, /cannot send commands, route sessions, schedule delays, read or write files/u);

  const localOutput = clientCommandHelp('return', '^').join('\n');
  assert.match(localOutput, /^\^local —/u);
  assert.match(localOutput, /\^local \{name\} \{value\}/u);
  assert.match(localOutput, /\^return \{text\}/u);
  assert.match(localOutput, /valid only while a Function is executing/u);
});

test('client help documents lazy numeric conditionals and chained branches', () => {
  const output = clientCommandHelp('elseif', '^').join('\n');
  assert.match(output, /^\^if —/u);
  assert.match(output, /\^if \{condition\} \{commands if true\} \{commands if false\}/u);
  assert.match(output, /\^elseif \{condition\} \{commands if true\}/u);
  assert.match(output, /Only the selected branch is expanded and executed/u);
  assert.match(output, /TinTin string ==\/!= and exact ===\/!== comparisons are supported/u);
});


test('edit help documents native picker, TinTin spelling, and safe Scripts confinement', () => {
  const output = clientCommandHelp('edit', '#').join('\n');
  assert.match(output, /#edit read \{Prime\}/u);
  assert.match(output, /bound profile/u);
  assert.match(output, /native picker/u);
  assert.match(output, /system text editor/u);
  assert.match(output, /paths, nested paths, symlinks, directories/u);
  assert.match(listClientCommandHelp('#').join('\n'), /#read\s+#write\s+#edit/u);
});

test('client help documents immediate #end and source-compatible #kill behavior', () => {
  const endOutput = clientCommandHelp('end', '#').join('\n');
  assert.match(endOutput, /^#end —/u);
  assert.match(endOutput, /without a confirmation dialog/u);
  assert.match(endOutput, /application remains open/u);

  const killOutput = clientCommandHelp('kill', '#').join('\n');
  assert.match(killOutput, /^#kill —/u);
  assert.match(killOutput, /Clear all or one family of live TinTin definitions/u);
  assert.match(killOutput, /only the active session/u);
  assert.match(killOutput, /#killall/u);
  assert.match(killOutput, /family name clears only that definition family/u);
  assert.match(listClientCommandHelp('#').join('\n'), /#end\s+#kill\/#killall/u);
});
