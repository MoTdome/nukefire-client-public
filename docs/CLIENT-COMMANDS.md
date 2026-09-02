# NukeFire Client command help

NukeFire Client uses `#` as its default client-command prefix. The prefix can be
changed in Preferences to `~`, `^`, or `/`; every example below follows the
selected prefix. Type `#help` in the command bar for the current in-client list,
or `#help <command>` for detailed syntax.

Client commands are handled by the desktop client. They are not sent to the MUD
unless the prefix is doubled. For example, `##help` sends the literal command
`#help` to NukeFire.

## Prefix-aware command history

Up and Down retain ordinary full-history navigation when the command line is empty.
When text is already present and the caret is at the end, Up searches backward only
through commands beginning with that text, without regard to capitalization. Down
continues forward through the same matches and then restores the original draft.

```text
ba<Up>       newest command beginning with ba
<Up>         previous command beginning with ba
<Down>       newer matching command
<Down>       restore the original ba draft
```

Editing a recalled command leaves history-navigation mode. A selected sent-command
display does not become a prefix search until the caret is placed at its end. Each
session keeps independent history, search prefix, position, and draft state.

## Command-line batches

The command bar accepts up to twenty top-level commands separated by semicolons:

```text
e;bash goblin;flee
#showme {Engaging target.};assist tank;bash goblin
#alias {panic} {flee;recall};panic
```

Braces and quoted text protect semicolons inside one command. Use `\;` when a
literal semicolon must be sent as part of ordinary server text:

```text
say Reactor stable\; for now;score
```

The complete line is validated before anything runs. Invalid braces, quotes,
escapes, or more than twenty commands send nothing. Each accepted part returns
through the normal Alias, Variable, routing, repeat, delay, loop, Speedwalk, and
client-command pipeline in order. Activating a session earlier in the line makes
later commands use that session. The entire typed line remains one command-history
entry.

## Pipeline debug

```text
#debug
#debug pipeline {on|off|status|show|clear}
```

Pipeline debug is an optional per-session troubleshooting trace. It is off by
default and appears in the Protocol panel when enabled. The log records manual
command batches, Alias and Variable expansion, routing, Speedwalk recognition,
network sends, macro activation, Action and Gag decisions, and matching Substitute
and Highlight definitions. `show` prints the newest twenty entries locally; the
Protocol panel also provides Copy and Clear controls.

Preferences retains 100, 200, or 500 entries for the active session. Secure input
never records typed or incoming details; every affected stage uses a redaction
notice instead. Disabling the tracer avoids constructing its detailed messages.

## Local display

```text
#showme {text}
#show {text}
```

`#showme` displays one line in the originating session without sending anything to
the MUD. Existing NukeFire variables expand once. The line uses the normal terminal
and screen-reader output path, may trigger Actions, and is deliberately excluded
from Communications and vitals parsing. The local TinTin pipeline remains active while
disconnected, allowing `#showme` to exercise Actions before login. Row and column
positioning remain deferred.

## Formatted local echo

```text
#echo {HP: %d/%d} {75} {100}
#echo {[%38s][%-38s]} {Caul} {Shai}
#echo {The current date is %t.} {%Y-%m-%d %H:%M:%S}
#echo {%cWARNING%c} {light red} {reset}
```

`#echo` displays locally and never triggers Actions, including when an Action launches
the Echo command. It otherwise follows the visible local-output path: Substitutes and
Highlights may transform it, terminal review and screen-reader review receive it, and
Communications and vitals do not.

Supported conversions are `%s` strings, `%d` integers, `%f` decimals, `%g` grouped
numbers, `%t` common date/time tokens, `%c` safe highlight styles, `%a` Unicode code
points, `%m` bounded math expressions, and `%%` for one percent sign. Field widths, `-` left alignment, `+` numeric
signs, and bounded precision are supported. Use `%{name}` for a NukeFire variable in
the format string so it cannot be confused with a format conversion. Arguments use
normal variable expansion. Inside an Action, use `%%s`, `%%d`, and similar escapes
when a literal formatter percent must survive Action capture processing.

Echo accepts at most 30 arguments and 4,096 visible output characters. Arbitrary
control characters, oversized widths, unsupported conversions, missing arguments,
and row-positioning syntax fail without displaying partial output.

## Math and stored formatting

```text
#math {damage} {$base * 1.25}
#math {roll} {2 d 6 + 3}
#format {message} {HP: %d/%d} {$hp} {$maxhp}
#format {forecast} {Damage: %m} {$base * 2 + 5}
```

`#math` expands Variables, evaluates one bounded numeric expression, and stores
the result. Supported operations include parentheses, unary `+`, `-`, `!`, and
`~`, dice `d`, power `**`, root `//`, arithmetic, shifts and bitwise operators,
comparisons, `&&`, `||`, and `condition ? value : value`. Integer division
truncates toward zero unless a decimal operand makes the expression floating
point.

`#format` stores Echo-compatible formatted text in a Variable. It supports the
safe Echo conversions plus `%m` for a math expression. Stored output is plain
text; `%c` and TinTin color tags remain display-only in `#echo`. Existing class
membership is preserved when either command updates a Variable.

Both commands may run inside Aliases and Actions. Local scripting commands in one
Action execute sequentially, so a Math update is visible to a later Format, Echo,
or Showme command. Expressions never evaluate JavaScript, properties, functions,
shell commands, or host APIs. Invalid expressions and formatting errors leave the
previous Variable untouched.

## Functions, locals, and returns

```text
#function
#function {name} {commands}
#function show {name}
#function delete {name}
#unfunction {name}

@name{argument1;argument2}
```

Function names start with a letter and use letters, numbers, or underscores.
`%0` expands to the complete semicolon-separated argument list; `%1` through
`%99` expand to individual arguments. Use `@@name{...}` or `\@name{...}` when
a literal call must remain in text.

Inside a Function, only the following synchronous commands and bounded branches are accepted:

```text
#local {name} {value}
#unlocal {name}
#math {name} {expression}
#format {name} {format} {arguments...}
#if {condition} {commands} {optional false commands}
#elseif {condition} {commands}
#else {commands}
#return {text}
```

A local Variable shadows a persistent Variable for one call. Math and Format
update a local when it already exists; otherwise they may update a persistent
Variable. The special `result` local is returned when the body completes without
an explicit Return. Calls may nest, but recursion, depth, call count, arguments,
body commands, and output are bounded.

Functions cannot transmit commands, route sessions, schedule delays, read or
write files, or change definitions. Any persistent Variable changes made by a
Function are rolled back if that call later fails. Definitions are persistent,
join the active class, and round-trip through safe Read and Write.


## Numeric conditionals

```text
#if {condition} {commands if true}
#if {condition} {commands if true} {commands if false}
#elseif {condition} {commands if true}
#else {commands}
```

Conditions use the bounded Math expression evaluator. Zero is false and any
non-zero numeric result is true. An `#elseif` or `#else` belongs to the closest
immediately preceding conditional in the same top-level semicolon-separated
command list. A separate later command cannot attach itself to an earlier If.

Only the selected branch is expanded, parsed, and executed. This means an
unknown Function, recursive Variable, invalid calculation, or protected command
in an unselected branch has no effect. Selected branches re-enter the normal
command pipeline in source order. Actions retain their full generated-command
safety and rate limits; Functions retain their synchronous allowlist and atomic
Variable rollback.

Conditionals may be used directly or inside Aliases, Actions, Functions, delays,
loops, classes, macros, routing, and command-line batches. Nesting, branches, and
commands are bounded. String/regex comparisons, switch/case, while, foreach,
break, and continue are intentionally deferred.

## Read TinTin scripts

```text
#read
#read {Prime}
#read {prime.tin}
```

A blank `#read` prints the visible Scripts folder and available files. Named reads
look only inside `Documents/NukeFire Client/Scripts`; extensionless names try the
exact filename and then `.tin`. Bare `#Prime` continues to activate a session,
while `#read Prime` explicitly requests a file.

The file is parsed completely before anything changes. Supported definitions are
Aliases, Variables, Functions, Actions, Gags, Highlights, Substitutes, Macros, and class
membership created with `#class {name} {open|close}`. Balanced multiline braces,
`/* comments */`, alternate TinTin command characters, and later duplicate
definitions are accepted. Matching existing definitions are replaced.

Tickers, nested reads, shell commands, raw login commands, and other unsupported
directives are counted and skipped without execution. A malformed supported
definition aborts the complete read. The client also rejects paths, symlinks,
invalid UTF-8, unsupported extensions, and files larger than two megabytes. If
live activation or persistent settings saving fails, the exact prior definitions
and class snapshot are restored. Actions may not initiate disk reads.

## Write TinTin scripts

```text
#write
#write {Prime}
#write {prime.tin}
```

A blank `#write` prints the Scripts folder and usage without altering a file.
Extensionless names create or replace a `.tin` file beneath
`Documents/NukeFire Client/Scripts`; paths and other extensions are rejected.

The writer emits deterministic supported definitions, including Functions, individual enabled states,
category on/off state, class membership, saved class snapshots, and the active
class stack. Existing regular files are replaced atomically. Symlinks,
directories, unsafe names, empty or oversized output, and Action-originated
writes are refused. The generated file is designed for exact supported-state
round-tripping through `#read`.

## Help

```text
#help
#help {command}
```

`#help` lists every available command family. Topics accept related names, so
`#help aliases`, `#help unaction`, `#help sessions`, and `#help link` open the
corresponding help.

## Aliases

```text
#alias
#alias {name} {command; command; ...}
#alias show {name}
#alias delete {name}
#unalias {name}
```

A bare `#alias` or `#aliases` lists definitions. Alias bodies may contain up to
ten brace-aware commands. `%0` means the complete argument text; `%1` through
`%9` refer to captured words. Aliases continue to expand while disconnected. A
player-entered login alias whose final result is a bare host and port connects the
active session, for example:

```text
#alias {logprime} {tdome.nukefire.org 4000}
logprime
```

Other server-bound results complete local Alias, Variable, Function, conditional,
and Action processing, then stop safely at the disconnected socket boundary.

## Variables

```text
#variable
#variable {name} {value}
#variable set {name} {value}
#variable show {name}
#variable delete {name}
#unvariable {name}
```

Use native TinTin `$name` or `${name}` in ordinary commands, aliases, Actions,
Echo, Showme, loops, delays, macros, batches, and routed commands. Existing
`%name` and `%{name}` remain supported. Use `$$name` or `\$name` to send a
literal `$name`. Braced names may contain safe spaces and punctuation; brackets
remain reserved for the later Lists and Tables milestone.

## Actions

```text
#action
#action {pattern} {command; command; ...} {priority 1-9}
#action show {pattern}
#action enable {pattern}
#action disable {pattern}
#action delete {pattern}
#unaction {pattern}
#actions {on|off|status|list}
```

Actions evaluate completed, cleaned incoming lines. Lower numeric priorities run
first. The complete generated command list is validated before sending, and an
Action cannot generate client-management commands.

## Gags

```text
#gag
#gag {pattern}
#gag show {pattern}
#gag enable {pattern}
#gag disable {pattern}
#gag delete {pattern}
#ungag {pattern}
#gags {on|off|status|list}
```

Gags hide matching completed terminal lines while preserving protected Action and
Communications processing. They share the Action substring, wildcard, and
explicit-anchor pattern style.

## Highlights

```text
#highlight
#highlight {pattern} {style} {priority 1-9}
#highlight show {pattern}
#highlight enable {pattern}
#highlight disable {pattern}
#highlight delete {pattern}
#unhighlight {pattern}
#high {pattern} {style} {priority 1-9}
#unhigh {pattern}
```

Patterns support literal text, `^` and `$` anchors, `%1` through `%9`, and `%*`.
Lower numeric priorities win when definitions overlap. Styles support familiar
TinTin color names and `<abc>` color codes, light/dark, underline, reverse, italic,
reset, and background colors introduced by `b`.

Highlighting changes terminal styling only. The original words remain authoritative
for Actions, Gags, Communications, vitals, Find, copied text, and screen-reader
output. Definitions are global, persistent, and join the currently open class.
Blink and regex mode are not part of the current implementation.

## Substitutes

```text
#substitute
#substitute {pattern} {replacement} {priority 1-9}
#substitute show {pattern}
#substitute enable {pattern}
#substitute disable {pattern}
#substitute delete {pattern}
#unsubstitute {pattern}
#sub {pattern} {replacement} {priority 1-9}
#unsub {pattern}
```

Patterns support literal text, `^` and `$` anchors, `%1` through `%9`, and `%*`.
Replacement text may reuse `%0` for the complete match and `%1` through `%9` for
captured text; `%%` writes one literal percent sign. Lower numeric priorities win
when definitions overlap.

Substitutions run once on each completed visible line before Highlights. Newly
inserted text is not recursively substituted. Actions, Gags, Communications, and
vitals retain the original server text, while the terminal, scrollback review,
Find, copying, and screen-reader output use the substituted display text.
Definitions are global, persistent, and join the currently open class. Regex mode,
multiline replacement, replacement functions, TinTin color codes in replacements,
and advanced file-script expressions remain outside the current implementation.

## Macros

```text
#macro
#macro {key} {command; command; ...}
#macro show {key}
#macro enable {key}
#macro disable {key}
#macro delete {key}
#unmacro {key}
#mac {key} {command; command; ...}
#unmac {key}
```

Supported keys include `F1` through `F24`, navigation keys, numpad keys, and
modifier chords such as `Ctrl+F1`, `Option+PageUp`, and `Command+K`. Physical
keyboard codes are used, so a numpad definition remains tied to the numpad key
when Num Lock changes the reported character.

Each macro contains one through ten brace-aware, semicolon-separated commands.
They execute in order through the normal outgoing pipeline and may use aliases,
variables, client commands, routing, repetition, delays, loops, and Speedwalk.
Macros defer to actively composed command-line text. They remain available when
input is empty or when the displayed last-sent command is fully selected. Manual
command history is preserved, and macro commands never replace blank-Return repeat.

Macros do not fire during secure input, Preferences, dialogs, Find, text
composition, or held-key repeat. They also avoid ordinary form fields so a
function key cannot unexpectedly submit commands while connection or search
text is being edited. Definitions are global, persistent, and join the
currently open class.

Plain typing sequences such as `nn` and `^nn`, raw terminal escape strings,
held-key repetition and recording remain outside the current implementation.
Compatible `.tin` macro definitions may be loaded with `#read`.

## Classes

```text
#class
#class {name} {open|close|show|list|save|clear|load|on|off|size|kill}
#class {name} assign {client command; client command; ...}
```

Definitions created while a class is open join that class. `save` stores a copy,
`clear` removes live definitions, and `load` restores the saved copy. `off` saves
and clears; `on` loads.

## Delay and loop

```text
#delay {seconds} {command; command; ...}
#loop {start} {finish} {variable} {command; command; ...}
```

Delayed and loop-generated commands return through normal aliases, variables,
routing, and safety checks. Loops include both endpoints and may count upward or
downward. The loop value is available as `%name`, `%{name}`, `$name`, or
`${name}`.

## Numbered repetition

```text
#10 smile
#3 {say Ready}
```

The number immediately after the prefix repeats the following command through the
normal pipeline. Counts are bounded, and nested repeat or loop directives are
blocked.

## Speedwalk

```text
#speedwalk {on|off|status|stop}
```

When enabled, lowercase compact routes such as `2n3e` expand into paced movement
commands. A leading backslash sends an ambiguous direction word literally.

## Sessions

```text
#session
#session {name} {host} {port}
#session {name}
#session {+|-}
#session {add|new} {name} {role}
#session {close|remove} {name}
```

A bare known session name activates that session. A session name used directly as
a client directive routes the following command through that session's alias,
variable, and Speedwalk pipeline.

## Groups, roles, and leaders

```text
#group
#group {name} {session session ...}
#group {delete|remove} {name}
#role {session} {role}
#leader {group} {member session}
```

The first group member becomes leader unless the existing leader remains a
member. The chosen leader must already belong to the group.

## Routing

```text
#all {command}
#followers {command}
#SessionName {command}
#GroupName {command}
```

`#all` targets every defined client session. `#followers` targets members of
groups led by the active session, excluding the leader. A known session or group
name may be used as a routing directive.

## Safe server hyperlinks

```text
#links
#link {number}
```

`#links` prints recent safe OSC 8 hyperlinks for the active session. `#link`
activates one numbered entry. Web, send, and prompt links retain their existing
isolated safety rules.


## Immediate disconnect and clean reload

```text
#end
#kill
#read {Prime.tin}
```

`#end` immediately disconnects only the active NukeFire session and never opens
the confirmation dialog. The client application, other session tabs, saved
settings, maps, and scripts remain open and unchanged.

Bare `#kill` follows the familiar TinTin reload workflow: it clears the live
Alias, Variable, Function, Action, Gag, Highlight, Substitute, Macro, and class
lists, including saved class snapshots. It also cancels pending delays and queued
Speedwalk steps for the active session. It does not erase script files, terminal
output, command history, connection profiles, accessibility preferences, or map
data. Use `#read {Prime.tin}` afterward to load a clean script set again.

## Sending a literal prefix

```text
##help
```

Doubling the selected prefix removes one prefix character and sends the rest to
the MUD. With `~` selected, use `~~help`; with `/` selected, use `//help`.
