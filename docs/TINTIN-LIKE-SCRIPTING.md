# NukeFire Client — TinTin-like Scripting Guide

> **For NukeFire Client 0.3.1-beta.73**
> Bounded aliases, actions, variables, functions, files, timers, paths, sessions, and automation.

## What “TinTin-like” means here

NukeFire Client includes an independent, bounded scripting and compatibility layer built around familiar TinTin-style command conventions. It is useful for veteran MUD automation and for importing many traditional `.tin` workflows, but **NukeFire Client is not TinTin++** and this guide does not claim complete TinTin++ parity.

The phrase **TinTin-like scripting** is used throughout this guide on purpose:

- familiar command families such as `#alias`, `#action`, `#variable`, `#function`, `#class`, `#read`, and `#ticker` are implemented locally;
- terminal-oriented features are translated onto NukeFire’s desktop UI when that is safer or more useful;
- obsolete terminal-only commands may be accepted as harmless compatibility no-ops;
- shell, arbitrary process, arbitrary filesystem, listener, and host-network escape hatches remain blocked.

When exact syntax differs between versions, the live client is authoritative:

```text
#help
#help {alias}
#commands
```

If you change the client command prefix with `#config {TINTIN CHAR} {...}`, substitute that character for `#` in the examples below.

---

## 1. Four compatibility categories

### Native in NukeFire

These commands have real private NukeFire scripting state and execute through the protected client command pipeline. Examples include Alias, Action, Variable, Function, List, Event, Macro, Ticker, Class, Gag, Highlight, Substitute, and many flow-control commands.

### Translated to NukeFire

The veteran intent is retained, but the implementation uses NukeFire’s native desktop facilities. Examples include Cursor operations, Buffer navigation, sessions, path/Mapper bridges, and some terminal lifecycle commands.

### Compatibility-only

Some legacy terminal commands are recognized locally so old files can load without accidentally sending them to the MUD. They do not take ownership of NukeFire’s native panes, prompt bar, browser, or operating-system UI.

### Blocked for safety

A script cannot acquire arbitrary host authority. NukeFire intentionally refuses command families such as arbitrary shell/process execution, unrestricted file ingestion, script-created listeners, and scanning/network escape hatches.

The important rule is simple: **old automation never gets a secret bypass around the normal NukeFire safety, session, and connection pipeline.**

---

## 2. Core syntax

### Braces and command batches

Braces group values containing spaces or semicolons:

```text
#showme {one command}
#showme {a value containing spaces}
#alias {prep} {stand;wear all;score}
```

Top-level semicolons split a bounded command batch:

```text
stand;score;look
```

Keep a semicolon as literal data by bracing it or escaping it where appropriate:

```text
say one\;two
```

### Literal client-prefix character

With `#` selected as the client prefix, double it to send a literal leading `#` to the game:

```text
##help
```

That sends `#help` as game text rather than opening NukeFire client help.

### Variables

```text
#variable {target} {mutant guard}
kill $target

#variable {profile name} {Prime}
#showme {Using ${profile name}}

#variable {mob[orc][kills]} {12}
#showme {Orc kills: $mob[orc][kills]}
```

Unknown variable references remain visible instead of silently turning into empty text.

### Alias arguments

```text
#alias {kk} {kill %1}
kk guard
```

For aliases:

- `%0` is the complete trailing argument string.
- `%1` through `%99` are positional word arguments.

### Pattern captures

```text
#action {You receive %1 experience} {#showme {Captured XP: %1}}
```

Incoming-pattern families use numbered capture tokens. Anchored patterns with `^` and `$` are supported.

### Shared bounded pattern language

| Token | Meaning | Example |
| --- | --- | --- |
| ordinary text | literal text; unanchored patterns may match within a line | `danger` |
| `^` / `$` | beginning / end anchors | `^You are hungry.$` |
| `%0..%99` | numbered wildcard capture | `You hit %1 for %2 damage` |
| `%*` | zero or more characters | `The %* door opens` |
| `%+` | one or more characters | `%+ arrives.` |
| `%.` | exactly one character | `Room %.` |
| `%d` / `%D` | digits / non-digits | `HP: %d` |
| `%s` / `%S` | whitespace / non-whitespace | `Name:%s%S` |
| `%w` / `%W` | letters / non-letters | `%w says` |
| `%?` | optional one character | `colou%?r` |
| `%i` / `%I` | case-mode prefix in compatible patterns | `%iWARNING` |
| `{raw regex}` | bounded raw-regex island when accepted as safe | `{[A-Z][a-z]+}` |

Unsafe or pathologically expensive raw regular expressions are rejected rather than executed.

---

## 3. Local output, math, formatting, and inspection

### `#SHOWME` / `#SHOW`

Print a local line. It is not sent to the game.

```text
#variable {target} {mutant guard}
#showme {Current target: $target}
```

`SHOWME` output may participate in local Action processing.

### `#ECHO`

Print formatted local text without firing Actions:

```text
#echo {HP: %d/%d} {75} {100}
#echo {Ready: 100%%}
```

### `#MATH`

Evaluate a bounded expression and store the result:

```text
#variable {base} {120}
#math {damage} {$base * 1.25}
#showme {Damage is $damage}
```

Useful forms include arithmetic, parentheses, comparisons, booleans, dice, powers, ternaries, bounded bitwise operations, logical XOR `^^`, quoted comparisons, and time values such as `1:02:03`.

Examples:

```text
#math {secs} {1:02:03}
#math {xor} {1 ^^ 0}
#math {match} {"mutant guard" == "mutant %1"}
#math {dice} {2d6 + 4}
#math {choice} {$hp < 25 ? 1 : 0}
```

This is **not** JavaScript or shell expression evaluation.

### `#FORMAT`

Format into a variable:

```text
#format {status} {HP: %d/%d} {$hp} {$maxhp}
#showme {$status}
```

Common safe transforms include string, integer, floating-point, time/date, case conversion, trim, reverse, character code, and terminal-dimension values. Complex historical word-wrap/table formatting is not promised unless live help says otherwise.

### `#INFO`

```text
#info
```

Shows a compact summary of private scripting/session state.

### `#DEBUG`

```text
#debug
#debug pipeline on
#debug pipeline show
#debug pipeline clear
```

Pipeline debug is the most useful first tool when an Alias or Action behaves unexpectedly. Secure/hidden input is redacted.

### `#NOP`

```text
#nop {intentional placeholder}
```

A local no-op useful in imported scripts.

---

## 4. Variables, Functions, Lists, Replace, and Parse

### `#VARIABLE` / `#UNVARIABLE`

```text
#variable
#variable {name} {value}
#variable {name}
#unvariable {pattern}
```

Nested paths such as `$mob[orc][kills]` are supported.

### `#FUNCTION` / `#UNFUNCTION`

Functions synchronously produce text and expand as `@name{arguments}`:

```text
#function {percent} {
  #local {value} {%1};
  #math {result} {100 * $value / %2};
  #return {$result}
}

#showme {Health: @percent{$hp;$maxhp}%}
```

Function arguments use `%0` and `%1..%99`. Functions may perform safe local logic but cannot become a hidden path to arbitrary files, processes, or unrestricted session control.

### `#LOCAL`, `#UNLOCAL`, `#RETURN`

```text
#function {hello} {#local {who} {%1};#return {Hello $who}}
#showme {@hello{Raven}}
```

Local variables shadow persistent variables only during that Function call.

### `#LIST`

```text
#list {targets} {create} {mutant guard;raider;boss}
#list {targets} {get} {1} {first}
#list {targets} {size} {count}
#showme {First=$first Count=$count}
```

Useful operations include:

```text
#list {name} {add} {item}
#list {name} {create} {a;b;c}
#list {name} {tokenize} {text}
#list {name} {find} {value} {result}
#list {name} {get} {index} {result}
#list {name} {set} {index} {value}
#list {name} {size} {result}
#list {name} {insert} {index} {value}
#list {name} {delete} {index}
#list {name} {sort} {item ...}
#list {name} {order}
#list {name} {reverse}
#list {name} {clear}
```

Lists are bounded; the verified compatibility implementation supports up to 512 items per list. Source-style 1-based indexing and supported negative tail indexes are available.

### `#REPLACE`

Literal bounded replacement inside one variable:

```text
#variable {line} {red reactor red}
#replace {line} {red} {green}
#showme {$line}
```

### `#PARSE`

Iterate bounded Unicode text one character at a time:

```text
#parse {Nuke} {ch} {#showme {Character: $ch}}
```

---

## 5. Conditions and loops

### `#IF`, `#ELSEIF`, `#ELSE`

```text
#if {$hp < 25} {flee;recall};#elseif {$hp < 50} {kick};#else {bash}
```

`==` / `!=` may use TinTin-like pattern semantics. Exact forms `===` / `!==` remain literal comparisons.

### `#SWITCH`, `#CASE`, `#DEFAULT`

```text
#switch {$stance} {
  #case {tank} {bash};
  #case {heal} {cast heal};
  #default {look}
}
```

### `#LOOP`

```text
#loop {1} {5} {i} {#showme {Count $i}}
```

Both endpoints are included; ascending and descending ranges are supported.

### `#WHILE`

```text
#variable {n} {1}
#while {$n <= 3} {#showme {n=$n};#math {n} {$n + 1}}
```

A safety ceiling stops runaway loops.

### `#BREAK` / `#CONTINUE`

```text
#loop {1} {10} {i} {
  #if {$i == 3} {#continue};
  #if {$i == 7} {#break};
  #showme {$i}
}
```

They are rejected outside a valid loop context.

### `#FOREACH`

```text
#foreach {north;south;east;west} {dir} {#showme {Direction: $dir}}
```

### `#FORALL`

```text
#forall {red;green;blue} {#showme {Color: &0}}
```

### Numeric repetition

```text
#10 smile
#3 {say Ready}
```

Nested repeat multiplication is blocked.

---

## 6. Aliases, Actions, Gags, Highlights, Substitutions, and Macros

### `#ALIAS` / `#UNALIAS`

```text
#alias
#alias {name}
#alias {name} {commands} {priority 1-9}
#unalias {pattern}
```

Example:

```text
#alias {kk} {kill %1;kick} {5}
kk mutant
```

Key behavior:

- lower numeric priorities match first;
- anchored names such as `^heal$` are supported;
- if an Alias body has no percent arguments, compatible trailing-input behavior is preserved;
- Alias bodies are bounded; the verified implementation permits up to 128 brace-aware commands in one body.

### `#ACTION` / `#UNACTION`

```text
#action {pattern} {commands} [priority]
#action {pattern}
#unaction {pattern}
```

Example:

```text
#action {You receive %1 experience} {
  #math {xpseen} {$xpseen + %1};
  #showme {XP total: $xpseen}
}
```

Actions inspect the original completed incoming line before visible Gag/Substitute/Highlight changes. Action execution is deliberately narrower than interactive command authority.

### `#GAG` / `#UNGAG`

```text
#gag {The reactor hums.}
#ungag {The reactor hums.}
```

Gagging hides terminal presentation but does not rewrite the original semantic meaning seen by protected client systems.

### `#HIGHLIGHT` / `#UNHIGHLIGHT`

```text
#highlight {WARNING} {light red underline} {2}
```

### `#SUBSTITUTE` / `#UNSUBSTITUTE`

```text
#substitute {You receive %1 experience} {XP +%1} {5}
#highlight {XP +%1} {light green}
```

Substitution can reuse captures. Substitution occurs before Highlight and does not recursively resubstitute its own output.

### `#MACRO` / `#UNMACRO`

```text
#macro {F4} {north;look}
#macro {Ctrl+F1} {assist tank;bash}
```

Macros use the normal protected input pipeline. Secure input, text composition, Preferences, dialogs, Find, and unrelated text fields intentionally block macro firing.

---

## 7. Delays, Tickers, Events, MESSAGE, and IGNORE

### `#DELAY` / `#UNDELAY`

```text
#delay {standup} {stand;look} {1.5}
#delay {standup}
#undelay {standup}
```

A named Delay replaces an older pending Delay with the same name.

### `#TICKER` / `#UNTICKER`

```text
#ticker {heartbeat} {#showme {tick}} {10}
#ticker {heartbeat}
#unticker {heartbeat}
```

The verified implementation supports up to 64 named Tickers per session, with bounded intervals from 0.05 seconds through one day. Omitting the interval uses the familiar 60-second default.

### `#EVENT` / `#UNEVENT`

```text
#event {SESSION ACTIVATED} {#showme {This session is active}}
#event {RECEIVED LINE} {#showme {Saw: %0}}
#event {SCREEN RESIZE} {#showme {Window: %1 x %2}}
```

Supported event families include client/session lifecycle, received input/line/output/prompt, send output, screen resize, end-of-path, program lifecycle, clock/calendar events, variable update, bounded Telnet/IAC compatibility events, Mapper transitions, and selected first-party protocol state.

### `#MESSAGE` / `#MESS`

Control routine definition mutation chatter without hiding explicit queries:

```text
#message {aliases} off
#alias {quiettest} {look}
#alias {quiettest}
#message {aliases} on
```

### `#IGNORE`

Temporarily suspend a family without deleting its definitions:

```text
#alias {hi} {say hello}
#ignore {aliases} on
hi
#ignore {aliases} off
hi
```

Alias, Action, Event, Gag, Highlight, Macro, Substitute, and Ticker families honor ignore state.

---

## 8. Classes, script files, profiles, and reset

### `#CLASS`

```text
#class {bossfight} open
#alias {engage} {kill boss;bash}
#action {You miss} {kick}
#class {bossfight} close
#class {bossfight} save
#class {bossfight} off
#class {bossfight} on
```

General syntax:

```text
#class
#class {name} {open|close|show|list|save|clear|load|on|off|size|kill}
#class {name} assign {commands}
#class {name} {read|write} {script name}
```

Definitions created while a Class is open join that Class.

### `#READ`

Load/merge supported state from NukeFire’s protected Scripts location:

```text
#read
#read {Prime}
#read {prime.tin}
```

Important:

- `READ` is a **merge** workflow;
- safe nested Reads remain inside the protected Scripts location;
- malformed supported syntax aborts transactionally rather than partially mutating live state;
- legacy absolute paths do not reopen arbitrary filesystem access.

### `#WRITE`

```text
#write
#write {Prime}
#write {backup-before-boss.tin}
```

Writes deterministic supported state into the protected Scripts location. Unsafe destinations, traversal, links, directories, and oversized output are refused.

### `#EDIT`

```text
#profile
#edit
#reload
```

Saving an editor file does not automatically execute it.

### `#PROFILE`

```text
#profile
#profile {session}
```

Shows bound profile identity and private automation totals.

### `#RELOAD`

```text
#reload
#reload {session}
#session {name} reload
```

`RELOAD` is replacement rather than merge; use it after editing when definitions removed from disk must disappear from live state.

### `#KILL` / `#KILLALL`

```text
#kill
#reload
```

Clears live scripting state and pending local automation for the session without deleting script files, maps, terminal history, connection profiles, or accessibility settings.

---

## 9. History, Cursor, Tab completion, and Config

### `#HISTORY`

```text
#history
#history list
#history insert {score}
#history read {filename}
#history write {filename}
```

File access remains confined to protected NukeFire locations.

### `#CURSOR` — translated to the accessible command field

```text
#cursor {HISTORY PREV}
#cursor {HISTORY NEXT}
#cursor {HISTORY SEARCH}
#cursor {MIXED TAB FORWARD}
#cursor {HOME}
#cursor {END}
#cursor {PREV WORD}
#cursor {NEXT WORD}
#cursor {CLEAR LEFT}
#cursor {CLEAR RIGHT}
#cursor {CLEAR LINE}
#cursor {DELETE WORD LEFT}
#cursor {DELETE WORD RIGHT}
#cursor {SET} {kill mutant guard}
#cursor {GET} {draft}
```

NukeFire edits the real accessible desktop command field instead of emulating obsolete terminal insert/process modes.

### `#TAB` / `#UNTAB`

```text
#tab {nukefire}
#tab {mutant guard}
#untab {nukefire}
```

Tab completion edits the command field only. Return remains authoritative for sending.

### `#CONFIG`

Useful mapped configuration includes:

```text
#config {SPEEDWALK} {ON}
#config {LOG MODE} {PLAIN}
#config {COMMAND ECHO} {OFF}
#config {AUTO TAB} {5000}
#config {TINTIN CHAR} {#}
#config {VERBATIM} {ON}
#config {REPEAT CHAR} {!}
#config {REPEAT ENTER} {ON}
```

Legacy terminal settings that belong to NukeFire’s native UI/accessibility may be accepted without silently overriding desktop Preferences.

---

## 10. GREP and BUFFER review

### `#GREP`

```text
#grep {tells you}
#grep {2} {damage}
```

Searches retained incoming review text after terminal escape removal.

### `#BUFFER`

```text
#buffer info
#buffer clear
#buffer find {WARNING}
#buffer get {latest} {1}
#buffer write {filename}
#buffer up
#buffer down
#buffer home
#buffer end
#buffer lock
```

`BUFFER GET` offset `1` is the newest line; larger values move backward. Navigation maps to NukeFire’s review/scrollback instead of creating a separate console scroll region.

---

## 11. Speedwalk, PATH, PATHDIR, MAP, and DIRS

### `#SPEEDWALK`

```text
#speedwalk on
2n3e
#speedwalk status
#speedwalk stop
```

Routes are bounded and paced. A normal manual command interrupts unsent steps.

### `#PATH`

```text
#path new
n
e
s
#path end
#path show
#path save {forward} {route}
#path run
```

Additional operations include insert/delete, load, zip/unzip, walk backward, delayed run, and stop. NukeFire’s native Mapper remains authoritative for actual world knowledge.

### `#PATHDIR` / `#UNPATHDIR`

```text
#pathdir {enter portal} {leave portal}
#pathdir
#unpathdir {enter portal}
```

### `#MAP`

```text
#map find {1234}
#path run
```

This bridges into NukeFire’s native Mapper rather than maintaining a second fake world model.

### `#DIRS`

```text
#dirs
```

---

## 12. Sessions and routing

### `#SESSION` / `#SESSIONS`

```text
#sessions
#session {name} {host} {port}
#session {name}
#session {+}
#session {-}
#session {close} {name}
#session {name} reload
```

This translates onto NukeFire’s native multi-session system rather than hiding a second socket manager inside scripting.

### `#GROUP`, `#ROLE`, `#LEADER`

```text
#group {crew} {Tank Healer Scout}
#role {Healer} {healer}
#leader {crew} {Tank}
```

### `#ALL`, `#FOLLOWERS`, named routing

```text
#all {score}
#followers {assist mutant}
#Healer {heal Tank}
#crew {look}
```

Each target session retains its own aliases, variables, Functions, and other private state.

### `#SEND`

Send through the normal session delivery path while bypassing Alias re-entry:

```text
#variable {who} {mutant}
#send {kill $who}
```

### Important: `#cr` is not accessibility `cr`

With the scripting prefix:

```text
#cr
```

sends exactly one blank command, similar to pressing Return on an empty command line.

Without the scripting prefix:

```text
cr status
cr setup native
```

is the **server accessibility command** `CR`, shorthand for `CLIENT READER`. See `ACCESSIBILITY.md`.

### `#END`

Disconnects only the active NukeFire session. It does not terminate the entire desktop application.

### `#ZAP`

Disconnect/remove a selected NukeFire session while preserving the workspace.

### `#SNOOP`

```text
#snoop {Scout} on
```

Mirrors another session’s incoming text without running the watcher’s automation over the mirrored copy.

---

## 13. LINE modifiers and safe logging

### `#LINE`

Useful forms include:

```text
#line oneshot {command}
#line gag {1}
#line ignore {command}
#line local {command}
#line strip {command}
#line verbose {command}
#line substitute {variables} {command}
#line substitute {functions} {command}
#line substitute {variables functions} {command}
#line log {filename} {text}
#line logverbatim {filename} {text}
```

`LINE LOCAL` permits local work but blocks nested server-bound sends. Log filenames remain confined to the protected Logs workflow.

### `#LOG`

```text
#config {LOG MODE} {PLAIN}
#log overwrite {boss-run.txt}
#log append {boss-run.txt}
#log off
```

PLAIN removes terminal escapes; RAW preserves incoming stream data. Writes are serialized in arrival order.

---

## 14. REGEXP

```text
#regexp {HP: 321/500} {^HP: %1/%2$} {
  #showme {current=&1 max=&2}
} {
  #showme {not vitals}
}
```

REGEXP branch captures use `&0..&99`. Ordinary regex metacharacters remain literal outside an explicit bounded raw-regex island. Unsafe raw constructions are refused.

---

## 15. Compatibility-only and blocked commands

### Compatibility / NukeFire-owned behavior

Examples include `SPLIT`, `UNSPLIT`, `PROMPT`, `UNPROMPT`, `ADVERTISE`, `BELL`, and terminal/UI families whose job is already owned by the desktop client. They are kept local or harmless rather than becoming accidental MUD commands.

### Blocked host/process/network authority

The following categories are intentionally unavailable as arbitrary escape hatches:

- `SYSTEM` — no arbitrary shell commands;
- `SCRIPT` — no arbitrary external scripting engine execution;
- `RUN` — no host process execution;
- `TEXTIN` — no unrestricted host-file ingestion;
- `PORT`, `DAEMON`, `SSL` — no script-created listener/server authority;
- `SCAN` — no arbitrary host/network scanning;
- `CHAT` — no separate TinTin peer-network subsystem.

A line such as:

```text
#system {open -a Calculator}
```

should be refused locally. It should neither execute the operating-system command nor fall through to the MUD.

---

## 16. Starter script

```text
#config {COMMAND ECHO} {OFF}
#variable {target} {mutant guard}
#variable {xpseen} {0}

#alias {kk} {kill %1;kick} {5}
#alias {boss} {kill $target;bash} {5}

#action {You receive %1 experience} {
  #math {xpseen} {$xpseen + %1};
  #showme {Session XP seen: $xpseen}
}

#gag {The reactor hums.}
#substitute {You receive %1 experience} {XP +%1} {5}
#highlight {XP +%1} {light green} {5}
#highlight {WARNING} {light red underline} {2}

#macro {F4} {north;look}
#tab {mutant guard}
#tab {reactor}

#ticker {status} {#showme {Target=$target XP=$xpseen}} {60}
#event {SESSION ACTIVATED} {#showme {NukeFire TinTin-like profile active.}}
```

Good learning sequence:

1. Type `kk raider` and confirm Alias expansion.
2. Generate an experience line and confirm the Action updates `xpseen`.
3. Confirm Substitute/Highlight only change presentation, not the Action’s original input.
4. Press F4 somewhere safe and confirm Macro execution.
5. Use Tab on a partial explicit completion.
6. Query and stop the Ticker.
7. Use `#write {learning-backup}` when you want a protected script backup.

---

## 17. Troubleshooting

### An Action did not fire

- Query the Action with its one-argument form.
- Confirm its family is not ignored.
- Check anchors/captures against the completed incoming line.
- Remember Actions see original text before visible Gag/Substitute/Highlight changes.
- Turn on Pipeline Debug, reproduce once, and inspect the trace.

### An Alias went somewhere unexpected

- Use `#profile` and `#sessions` to confirm issuing/destination session.
- Named routing uses the destination session’s private scripting state.
- Use `#send` when you deliberately need to bypass Alias re-entry.
- Check priority when more than one Alias can match.

### A script changed but an old definition survived

`#read` merges. `#reload` replaces the bound profile. If you removed a definition from disk and need it gone live, use Reload.

### A path or file command was refused

Use a safe basename inside NukeFire’s protected Scripts or Logs workflow. Do not replace protected `READ` / `WRITE` with blocked host commands.

### A Macro/Cursor operation feels different from console TinTin

That can be deliberate. NukeFire protects secure input, text composition, browser/OS accessibility behavior, dialogs, and native desktop editing. Cursor commands operate on the real accessible command field.

---

## 18. Quick reference

| Area | Commands |
| --- | --- |
| Definitions | ALIAS, ACTION, VARIABLE, FUNCTION, GAG, HIGHLIGHT, SUBSTITUTE, MACRO, EVENT, TAB, PATHDIR |
| Delete/query partners | UNALIAS, UNACTION, UNVARIABLE, UNFUNCTION, UNGAG, UNHIGHLIGHT, UNSUBSTITUTE, UNMACRO, UNEVENT, UNTAB, UNPATHDIR |
| Flow | IF, ELSEIF, ELSE, SWITCH, CASE, DEFAULT, LOOP, WHILE, BREAK, CONTINUE, FOREACH, FORALL, repetition |
| Data | LIST, MATH, FORMAT, REPLACE, PARSE, REGEXP |
| Timers | DELAY, UNDELAY, TICKER, UNTICKER, LINE ONESHOT |
| Output/review | SHOWME, ECHO, GREP, BUFFER, HISTORY, INFO, DEBUG |
| Input | CURSOR, TAB, CONFIG, command prefix, doubled literal prefix |
| Files/profiles | CLASS, READ, WRITE, EDIT, PROFILE, RELOAD, KILL/KILLALL |
| Movement | SPEEDWALK, PATH, PATHDIR, MAP, DIRS |
| Sessions/routing | SESSION(S), GROUP, ROLE, LEADER, ALL, FOLLOWERS, named routes, SEND, `#CR`, END, ZAP, SNOOP |
| Logging/line | LOG, LINE GAG/IGNORE/LOCAL/STRIP/VERBOSE/SUBSTITUTE/LOG/LOGVERBATIM |
| Definition control | MESSAGE/MESS, IGNORE |

## Scope note

This guide describes the bounded TinTin-like behavior verified through NukeFire’s Source-Parity work and carried into the Beta.73 public client. NukeFire remains a desktop multi-session client with native accessibility, terminal, Mapper, GMCP panels, and protected file locations. Compatibility is integrated into those systems rather than replacing them.
