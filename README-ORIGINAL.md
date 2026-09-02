## Fast shared movement pipeline

Incoming GMCP packets carry one authoritative post-apply state. The client updates only the panel affected by that package, coalesces Mapper/session-tab painting, and never republishes the full session list merely because a stable character name remains present. Terminal text, Actions, Gags, Communications parsing, prompt handling, and outgoing commands remain immediate and ordered.

# NukeFire Client

A focused, highly customizable desktop MUD client for NukeFire. The current foundation is an Electron client confirmed working on macOS.

## Current state

**Milestone 2.2b / 0.3.1-beta.20 now uses the centered, read-only BIGMAP as its stable baseline.** The current pass freezes features and concentrates on transport, terminal, Communications, mapper-query, and persistence performance without changing established command order, accessibility, automation, scrollback, or session behavior. The branded disconnect dialog, server-authoritative room/map refresh, exact BIGMAP terrain colors, explored-room memory, GPS markings, NukeFire Console, and beta.19 prompt/connection fine-tuning remain intact. See `BETA20-PERFORMANCE-FOUNDATION.md` and `docs/PROJECT_LEDGER.md`.



## Far-Right Dock

Beta.44 adds a second independently resizable right-side panel column. Keep a
panel such as Communications in the ordinary Right dock, then use **Move Far
Right** or drag another panel to the far-right drop target to place Affects,
Mapper, Vitals, or any other panel immediately beside it.

The Right and Far Right docks remain separate saved regions. Each can contain
independent panels or tab groups, each has its own accessible resize separator,
and both collapse when empty. Character workspaces and Shared Crew Workspace
persist the additional region and its preferred width. The layout still protects
a usable terminal width and retains pop-out/dock-back behavior.


## Docked Prompt Row

Beta.42 adds a client-side Prompt Display preference with **Inline**, **Docked**,
and **Hidden** modes. Docked mode uses the Telnet GA/EOR boundary already sent
by NukeFire to capture only the final unfinished gameplay prompt and place it in
a stable row immediately above the command input. The prompt is replaced in
place instead of accumulating in terminal scrollback.

Completed group-prompt and status lines remain in normal output. Login, password,
pager, and editor prompts remain inline until GMCP identifies a playing
character, avoiding unsafe guesses based on packet endings. Hidden mode removes
the established gameplay prompt from visual output while retaining the latest
prompt for deliberate keyboard and screen-reader review.

Prompt capture is per session and preserves server ANSI styling, visible
Substitutes and Highlights, Actions, Gags, Pipeline Debug, vitals fallback, and
normal command ordering. No game-side or GMCP changes are required.

## TinTin Compatibility: Lazy numeric conditionals

Beta.41 adds bounded `#if`, `#elseif`, and `#else` branching with the same
safe numeric expression evaluator used by `#math`:

```text
#if {$hp < 25} {flee;recall} {say steady}

#if {$hp >= 75} {bash $target}
#elseif {$hp >= 40} {kick $target}
#else {flee}
```

Any non-zero numeric result is true. `#elseif` and `#else` must remain
immediately adjacent to their preceding branch in one brace-aware semicolon
list. Only the selected branch is expanded and executed, so unknown Functions,
Variables, malformed calculations, and unsafe commands in an unselected branch
remain untouched.

Conditionals work from the command line and inside Aliases, Actions, Functions,
delays, loops, classes, macros, and routed command batches. Selected Action
branches retain the complete Action safety gate, and Function branches remain
inside the existing synchronous Function allowlist. String comparison, regex
conditions, switch/case, while, foreach, break, and continue remain separate
milestones.

## TinTin Compatibility: Functions, locals, and returns

Beta.40 adds persistent, bounded TinTin-style Functions:

```text
#function {percent}
{
  #local {value} {%1}
  #math {result} {100 * $value / %2}
}

#showme {Health: @percent{$hp;$maxhp}%}
```

Functions are called with `@name{argument1;argument2}`. `%0` represents the
complete argument list and `%1` through `%99` represent individual positions.
Inside a Function, `#local`, `#unlocal`, `#math`, `#format`, `#if`, `#elseif`, `#else`, and `#return` form a
small synchronous execution language. A local shadows a persistent Variable only
for that call, and the special local `result` is returned when no explicit
`#return` runs.

Function definitions persist, participate in classes, and round-trip through
`#read` and `#write`. Calls work in ordinary commands, Aliases, Actions, Echo,
Showme, routing, and other existing expansion points. Recursion, depth, call
count, command count, arguments, body size, and returned output are bounded.
Functions cannot send commands, route sessions, schedule work, access files, or create/remove automation definitions. Math and
Format may update Variables; if a Function fails, any persistent Variables it
changed during that call are restored.

## TinTin Compatibility: Safe script writes

Beta.37 adds `#write {Prime}` and `#write {prime.tin}` as the deterministic
counterpart to safe `#read`. Extensionless names write a `.tin` file inside the
visible `Documents/NukeFire Client/Scripts` folder. A bare `#write` reports the
folder and usage without changing a file.

The generated script contains current Aliases, Variables, Functions, Actions,
Gags, Highlights, Substitutes, Macros, enabled states, class membership, saved class
snapshots, and the active class stack. Output is ordered consistently so the same
client state produces the same file. Structural braces, quotes, and backslashes
are escaped reversibly.

Existing regular files are replaced through a same-directory temporary file and
atomic rename. Paths, symlinks, directories, unsupported extensions, unsafe
names, empty output, and files over two megabytes are refused. Actions cannot
initiate writes. A `#write` followed by clearing definitions and `#read` restores
the supported state exactly.

## TinTin Compatibility: Safe script reads

Beta.36 adds `#read {Prime}` and `#read {prime.tin}` for loading compatible
TinTin definition files from the visible `Documents/NukeFire Client/Scripts`
folder. Extensionless names try the exact filename and then `.tin`, without
conflicting with bare session activation such as `#Prime`.

Reads are treated as data, parsed completely, and applied as one transaction.
This interval loads Aliases, Variables, Functions, Actions, Gags, Highlights,
Substitutes, Macros, and class membership. Balanced multiline braces, `/* comments */`,
alternate command characters, duplicate overwrite behavior, quoted spell names,
and ordinary apostrophes are supported. Familiar `#OK:` totals report what was
loaded, while unsupported tickers, nested reads, shell commands, and raw login
commands are reported and skipped rather than executed.

The Scripts bridge rejects arbitrary paths, symlinks, invalid UTF-8, files over
two megabytes, and extensions other than `.tin` or none. A malformed supported
definition aborts the entire load. If live replacement or persistent settings
saving fails, the exact prior definitions and class snapshot are restored.

## TinTin Compatibility: Genuine formatted echo

Beta.35 adds a real `#echo {format} {arguments...}` command rather than treating
Echo as another name for `#showme`. Echo supports the commonly used TinTin format
families `%s`, `%d`, `%f`, `%g`, `%t`, `%c`, and `%a`, plus `%%`, bounded field
widths, left/right alignment, precision, familiar color names, and documented
TinTin `<abc>` foreground color codes.

Echo output is local, works while disconnected, and follows the same terminal,
Substitute, Highlight, Find, copy, and screen-reader display path as other visible
output. Unlike `#showme`, Echo never feeds its generated line into Actions. It also
remains isolated from Communications and vitals. Use `%{name}` for a NukeFire
variable inside the format string; arguments use normal variable expansion.

Row positioning and the remaining specialized TinTin format conversions are kept
outside this focused interval and report a clear unsupported-format message.


## TinTin Comfort Pack: Optional pipeline debug

Beta.34 adds an advanced, per-session command-pipeline trace that remains off by
default. Enable it in Preferences or with `#debug pipeline on`, then review the
bounded log in the Protocol panel. The trace records manual batch splitting, Alias
and Variable expansion, routing, Speedwalk recognition, sends, macro activation,
Action and Gag decisions, and matching Substitute and Highlight definitions.

The Protocol panel provides Copy and Clear controls, while Preferences selects a
100, 200, or 500-entry retention limit for the active session. Secure password
input replaces command and server details with a redaction notice. When debugging
is disabled, lazy trace messages are not constructed and normal command behavior is
unchanged.

## TinTin Comfort Pack: Panel and Mapper text

Beta.33 adds a compact, command-client-friendly text presentation without
removing the full accessible names behind it. Preferences can keep the existing
panel titles or shorten them to readable labels such as `Comms`, `Console`, and
`Map`. Dock headings, tab labels, and panel-window titles update together, while
screen readers continue to receive `Communications`, `NukeFire Console`, and
`Mapper`.

The Mapper can keep its existing status marks only, add full room numbers, or
show bounded short room names beneath each room square. The `@`, route, and GPS
destination marks remain visible in every mode. These labels are visual only;
the complete room name, number, terrain, current/visited state, GPS state, and
exits remain in the unchanged accessible Mapper summary.

## TinTin Comfort Pack: Prefix-aware history

Beta.32 makes command recall behave more like a mature command-driven MUD client.
With an empty command line, Up and Down keep their existing full-history behavior.
When text is already typed and the caret is at the end, Up searches backward only
through commands that begin with that text, case-insensitively. Down walks forward
through the same matches and restores the untouched draft after the newest match.

For example, type `ba` and press Up to recall the newest command beginning with
`ba`, such as `bash orc`, without stepping through unrelated `look`, `score`, or
channel commands. Editing a recalled command exits history navigation cleanly.
Each session retains its own history position, prefix, and draft while switching
characters. Secure input and blank-Return repeat behavior are unchanged.

## TinTin Comfort Pack: Command-line batches

Beta.31 lets the command bar run up to twenty top-level commands separated by
semicolons, including ordinary MUD commands and NukeFire/TinTin-style client
commands in the same line. Braces, quotes, and escaped semicolons remain protected,
and malformed lines execute nothing.

Examples include `e;bash goblin;flee`, `#showme {Ready};look`, and
`#alias {panic} {flee;recall};panic`. Every accepted part returns through the same
Alias, Variable, session-routing, repeat, delay, loop, Speedwalk, and outgoing
command pipeline. Session activation affects commands later in the same line, and
the entire typed batch remains one history entry.

## TinTin Comfort Pack: Macros

Beta.30 adds persistent TinTin-style `#macro`/`#mac` definitions and
`#unmacro`/`#unmac` removal commands. Function keys, navigation keys, numpad
keys, and modifier chords such as `Ctrl+F1`, `Option+PageUp`, and `Command+K`
may launch one or more semicolon-aware commands.

Macro commands return through the same protected outgoing pipeline as typed
commands, so aliases, variables, client commands, session routing, delays,
loops, repetition, and Speedwalk keep their established ordering and safety.
Macros defer to a command actively being composed and never become the command
repeated by blank Return. An empty command line, or a fully selected last-sent
command, remains a valid macro surface. Definitions persist and participate in
TinTin-style classes.

Macros are disabled during secure password input, dialogs, Preferences, Find,
and text composition; held-key repeats are ignored. Plain typing sequences
such as `nn` and `^nn`, raw terminal escape strings, macro recording, and
plain typing sequences and raw terminal escape strings remain reserved for later compatibility intervals.

## TinTin Comfort Pack: Substitutes

Beta.29 adds persistent TinTin-style `#substitute`/`#sub` definitions and
`#unsubstitute`/`#unsub` removal commands. Patterns may use literal text, `^` and
`$` anchors, `%1` through `%9`, and `%*`; replacement text may reuse `%0` through
`%9`, and `%%` writes one literal percent sign. Lower numeric priorities win
overlapping matches.

Substitution is a single, bounded display pass before beta.28 Highlights. Actions,
Gags, Communications, and vitals continue to receive original server text, while
terminal review, Find, copy, and screen-reader output use the substituted words.
Definitions persist and participate in TinTin-style classes. Regex mode, multiline
replacement, replacement functions, replacement color codes, recursive substitution,
and advanced script directives remain reserved for later focused intervals.

## TinTin Comfort Pack: Highlights

Beta.28 adds persistent TinTin-style `#highlight`/`#high` definitions and
`#unhighlight`/`#unhigh` removal commands. Patterns may use literal text, `^` and
`$` anchors, `%1` through `%9`, and `%*`; lower numeric priorities win overlapping
matches. Styles accept familiar color names, documented TinTin `<abc>` color
codes, light/dark, underline, reverse, italic, reset, and `b` background colors.

Highlights decorate terminal runs only. Actions, Gags, Communications, vitals,
Find, copy, and screen-reader text continue to receive the original words.
Definitions persist and participate in TinTin-style classes. Blink, regex mode,
and advanced script directives remain reserved for later focused intervals.

## Client command help

Beta.26 adds `#help` for the TinTin-style client command line. A bare `#help`
prints a categorized list of every available client-command family, while
`#help alias`, `#help session`, `#help routing`, and similar topics print focused
syntax and notes. Help follows the configured `#`, `~`, `^`, or `/` prefix. The
complete reference is also available in `docs/CLIENT-COMMANDS.md`.

## Custom Mapper sections

Beta.25 lets each player independently show or hide the Mapper pane’s GPS Navigator, map and controls, and current-room information. The same controls are available in the Mapper panel menu and Preferences, persist across restarts, and remain in sync with a popped-out Mapper window.
The map now keeps its canvas clean: the old visual symbol legend and diagnostic room-count footer are no longer shown beneath it.

## Input-preserving keyboard shortcuts

Physical keyboard shortcuts send through the normal protected command pipeline without becoming the command repeated by blank Return. By default, a shortcut defers to actively composed command text, so Shift+W can type the W in `gos Welcome` instead of unexpectedly moving north. Each shortcut may explicitly enable **Fire while typing** when immediate movement or combat control is preferred; even then, the prepared draft is preserved and Repeat Enter still recalls the last manually submitted command. Secure password input, open dialogs, disabled shortcuts, and other editable fields remain protected.

## MNES and safe server hyperlinks

Beta.24 supports the Telnet NEW-ENVIRON/MNES capability handshake. When a server
requests the standard variables, the client reports its name, version, UTF-8
charset, terminal type, current MTTS capabilities, and explicit OSC 8 hyperlink
support. The Protocol panel shows when MNES and links are negotiated.

Validated OSC 8 links remain part of the terminal transcript and scrollback.
`http:` and `https:` links open through the isolated operating-system browser
bridge; `send:` links use the normal protected game-command pipeline; and
`prompt:` links place text in the command input without executing it. Unsafe or
malformed schemes are displayed as ordinary text. Keyboard and screen-reader
users can review and activate recent links with:

```text
#links
#link 1
```

The commands use the currently selected client-command prefix.

## TinTin++ Alias and Action Import

Preferences now includes a safe paste importer for TinTin++ `#alias`/`#al` and
`#action`/`#act`/`#ac` definitions. Paste is analyzed as data and is never
executed. The review separates Ready, Translated, Review, and Unsupported
entries; honors balanced multiline braces, priorities, mixed capitalization, and
`#nop` comments; detects duplicates; and supports one-session Undo Last Import.
Imported Actions are disabled individually until the player reviews and enables
them. TinTin scripting such as variables, math, conditionals, file reads, shell
commands, delays, and embedded PCRE remains visible in review but is blocked from
automatic import. Alias storage now permits up to 512 global aliases; Actions
remain capped at 256 and retain their existing ten-command safety limit. See
`BETA20-TINTIN-IMPORTER.md`.

## First development run

Requirements:

- Node.js LTS
- npm

Then:

```bash
npm install
npm start
```

The client is preconfigured for:

```text
tdome.nukefire.org
port 4000
```

## Verification

```bash
npm run verify
```

This runs syntax checks and automated tests. Run it before every milestone commit.

## Build test applications

macOS universal DMG and ZIP:

```bash
npm run dist:mac
```

Windows x64 installer and portable EXE (normally built by GitHub Actions):

```bash
npm run dist:win
```

Unsigned test packages are written to `dist/`.

## VS Code

Open the project:

```bash
code .
```

Included workspace tasks:

- NukeFire: Start Client
- NukeFire: Verify
- NukeFire: Run Tests
- NukeFire: Build Mac DMG

## Project records

- `AGENTS.md` — coding-agent rules and current priority
- `docs/PROJECT_LEDGER.md` — milestone state and acceptance checks
- `docs/ACCESSIBILITY.md` — screen-reader, keyboard, and VI design requirements
- `docs/ROADMAP.md` — ordered feature plan
- `docs/ARCHITECTURE.md` — process and protocol layout
- `docs/GIT_SETUP.md` — repository setup commands
- `CHANGELOG.md` — completed and pending changes

## Useful keys

- **Return** — send command
- **Up/Down** — command history; typed text filters recall by prefix
- **Command-F** — find in output
- **Command-L** — focus command input
- **Command-Shift-O** — review game output
- **Command-Shift-L** — read the last complete line
- **Command-Shift-V** — read current vitals
- **Command-K** — open NukeFire Knowledge
- Use the Connect and Disconnect controls in the application header for session state.

## Security baseline

The Electron renderer uses context isolation, has no direct Node integration, and runs sandboxed. Do not weaken those settings to add features.

## Project direction

See [`docs/PRODUCT_VISION.md`](docs/PRODUCT_VISION.md), [`docs/PROJECT_LEDGER.md`](docs/PROJECT_LEDGER.md), and [`docs/ROADMAP.md`](docs/ROADMAP.md).


## Multi-session control

Use **New Session** to create another independent character connection. Every tab
keeps its own output, history, Telnet/GMCP state, vitals, Communications, Affects,
Context Deck, and mapper movement state. Saved sessions return disconnected on the
next launch; the client does not store passwords or auto-connect them.

The first command-oriented controls are:

```text
#session                                      list sessions
#session Rambo tdome.nukefire.org 4000       create/reconnect and select Rambo
#session add {Shai} {healer}                  create a disconnected session
#session {Shai}                               select a session
#session +                                    select the next session
#session -                                    select the previous session
#Shai                            select Shai's character tab
#Shai heal Caul                  run `heal Caul` through Shai without switching
#all score                       send through every connected session
#group {crew} {Caul Shai Vect}   define a named group
#leader {crew} {Caul}            designate the group's leader
#followers assist mutant         send to crew members except the leader
#role {Vect} {damage}             set a session role
##help                           send literal #help to the active MUD session
```

Ordinary commands, Aliases, Actions, and named-character routes go directly to
their connected session. Only Speedwalk uses the paced per-session movement queue.
The terminal may batch final visual painting, but it never delays parsing or sending.

### Live combat vitals

The Vitals panel consumes structured `Char.Vitals` and `Group` GMCP. It shows the
active character's opponent, every visible group member's health, mana, movement,
location, and current opponent, plus a deduplicated list of group targets. Each
character tab keeps its own combat snapshot. Command-Shift-V reads the same combat
summary on demand without announcing every combat update.

## TinTin-style compact speedwalks

Speedwalk is on by default for fresh settings. Type a compact route as an ordinary command:

```text
eeennnee
4e3s19e
```

The client validates the entire route, expands it into `n`, `e`, `s`, `w`, `u`,
or `d`, and sends one movement at a time through the active session queue. Routes
may mix repeated letters, counts, and spaces, and are capped at 200 expanded
steps. Speedwalk parsing is lowercase-only: capitalized input such as `News`, `NEWS`,
or `NeSw` is sent literally to the MUD. A route must expand to at least two steps;
ordinary one-room directions such as `e` or `1e` bypass Speedwalk and send normally.

Use `#speedwalk status` to review the toggle and active-session queue, `#speedwalk
stop` to cancel unsent route steps, and `#speedwalk off` to disable parsing. An
explicit off choice remains saved across restarts. A normal
manual command interrupts pending route steps so the command prompt remains useful.
Direction-only words are intentionally ambiguous; prefix one backslash to send one
literally, for example `\news` sends `news` instead of north/east/west/south.
Aliases may expand into compact routes. Actions cannot toggle Speedwalk or generate
compact routes.



## Native NukeFire application icon

The approved industrial NF emblem is packaged as a native macOS ICNS and Windows ICO.
Packaged applications, Windows Setup/Portable executables, taskbar/Dock surfaces, and
local development windows use the same identity. The icon is decorative only; all client
state, controls, and messages remain available as text.


## Persistent global variables

Variables provide reusable text for direct commands, Aliases, Actions, and routed
session commands:

```text
#variable target {old mutant}
#variable spell {radiant smite}
#alias kt {kill %target;cast %spell %target}
```

Use `#variable` or `#variables` to list definitions, `#variable {name}` to show one,
`#variable {name} {value}` to set one, and `#unvariable {name}` to remove one.
Both `%target` and `%{target}` are accepted. Use `%%target` when the literal text
`%target` should be sent.

Values may reference other variables, but expansion is recursion-, depth-, and
length-bounded. Unknown references remain visible rather than disappearing. Command
lists are split before variable expansion, so a value containing a semicolon remains
inside one outgoing command and cannot inject additional Alias or Action commands.

## TinTin-style aliases

Aliases may send one or several ordinary commands and may reference persistent Variables. Separate commands with a
semicolon; each invocation is capped at 10 completed commands.

```text
#alias kk {smile;look;score}
```

Braces and quoted text protect embedded semicolons. Use `\;` for a literal
semicolon inside one outgoing command. Alias arguments are substituted only after
the command templates are split, so argument text cannot inject extra commands.
Use `#unalias {name}` or the existing `#alias delete {name}` form to remove one.

## TinTin-style actions

Actions may generate one or several ordinary commands. Separate commands with a
semicolon; each firing is capped at 10 commands and returns through the existing
alias, session-routing, and paced queue pipeline.

```text
#action {gossips} {smile;look;poke bob}
```

Braces and quoted text protect embedded semicolons. Use `\;` for a literal
semicolon in one outgoing command:

```text
#action {announcement} {say Reactor stable\; for now;smile}
```

The entire list is validated before any command is sent. Actions cannot generate
client-management commands such as `#alias`, `#variable`, `#action`, `#session`, or `#group`,
even when one is hidden behind an alias. Use `#unaction {pattern}` or the existing
`#action delete {pattern}` form to remove one.

## TinTin-style classes

Classes label related Aliases, Variables, Functions, Actions, and Gags so a complete automation
set can be reviewed, removed, and restored together:

```text
#class {combat} open
#alias {atk} {kill %1;kick}
#action {You miss} {bash}
#gag {The reactor hums.}
#class {combat} close
#class {combat} save
```

`#class {combat} clear` removes the live definitions while retaining the saved copy;
`#class {combat} load` restores it. The convenience forms `off` and `on` save/clear
and load the class. `list`, `size`, `assign`, and `kill` are also supported. Class
membership and saved copies persist in settings. File-backed `read` and `write` are
not enabled yet.

## Gag rules

Gags hide matching completed incoming lines from the main terminal and
screen-reader review state while recognized channel messages remain available once in
Communications and Communications pop-outs. They use the
same substring and wildcard language as Actions:

```text
#gag {gossips}
#gag %1 gossips
#gag {^The wind howls$}
```

Manage them with `#gag list`, `#gag show {pattern}`, `#gag enable {pattern}`,
`#gag disable {pattern}`, `#gag delete {pattern}`, or `#ungag {pattern}`. Use `#gags on`, `#gags off`,
or `#gags status` for the global switch. Actions still evaluate the original line,
so a hidden line may safely trigger an existing bounded Action.

## Workspace and panel docking

Preferences can show or hide the eight built-in panels, including Communications, Context Deck, and Mapper. Each panel’s title-bar menu can move it to the left, right, or lower dock and can change its order within a dock. Once GMCP identifies a character, that character receives independent visibility, layout, dock-size, tab-group, and selected-tab metadata.

Drag a separator beside a visible dock to resize it. Keyboard users can focus a separator and use Arrow keys, Shift plus Arrow for larger steps, Home for minimum size, or End for the largest safe size. Double-clicking a separator restores its default size.

Use a panel’s options menu to combine it with the previous or next panel as tabs, or separate it again. Tab lists support Arrow keys, Home, and End. A fresh workspace opens Affects above Communications on the left, Mapper and Context Deck as right-side tabs with Mapper selected, and Vitals below them. Quick Commands, NukeFire State, and Protocol remain hidden until enabled in Preferences. Every sidebar panel can be moved, resized, grouped, hidden, opened in its own native window, or docked again. Separate panel windows retain normal edge-drag resizing and add Compact, Standard, Large, Fill Display, Panel Default, and exact custom-size controls. Their saved bounds may use the full usable area of large and secondary displays while retaining safe recovery when a monitor is disconnected.


## Communications panel

The Communications panel keeps channel messages visible without removing them from the main game output. It provides All, Gossip, Newbie, Group, Tell, Auction, and System filters, timestamps, unread counts, search, and clear controls. Structured `Comm.Channel` or `NukeFire.Comms.Message` GMCP is preferred; conservative text recognition is used only when a structured message is unavailable. Unrecognized game lines remain solely in the main terminal.

## Mapper foundation

The client now includes a persistent Mapper panel. It learns from `Room.Info` GMCP and creates a directional link only when a movement command is followed by a confirmed room change. Map data is stored in Electron’s user-data directory as `map.json`, with a recovery backup. The room graph is shared while visited state and view position remain character-specific.


## NukeFire Context Deck

The Context Deck consumes `NukeFire.Context` GMCP and turns the current room's server-defined services into accessible cards, status rows, buttons, and validated forms. Initial contexts cover the Remorter, Longwalker, Chromatic Ink-Master, Packrat storage, Zone Intelligence, the Wasteland Prospector rune, and active random-engine mines. Every control sends an ordinary NukeFire command; all requirements, costs, class unlocks, object checks, and consequences remain server-side.

- Optional persistent repeat-last-command behavior for blank Enter.
## Experimental xterm.js terminal

Preferences → Display can select **xterm.js experimental**. In this first migration
interval, xterm.js owns only visual terminal rendering, fitting, search, selection,
and scrollback presentation. NukeFire's existing MUD pipeline still owns Actions,
Gags, Communications, reader text, prompt boundaries, Variables, session history,
and command routing. The original renderer remains available as a safe fallback until
macOS, Windows, combat, multi-session, and screen-reader parity are confirmed.

## Terminal fonts

The terminal font menu includes the built-in platform choices plus optional installed-font selections for Fixedsys Excelsior, Maple Mono, Maple Mono NL, JetBrains Mono, Fira Code, Hack, Source Code Pro, Terminus, Inconsolata, and Cascadia Mono/Code. Optional fonts are not bundled into the client; install the font on the computer first, then select it in Preferences. When a selected family is unavailable, the client falls back to a standard monospace face.

## Brighter interface and scrollback copy

- Preferences now offers Original Dark, Brighter, and High Contrast interface modes. The setting brightens client panels, borders, controls, and labels without rewriting NukeFire ANSI colors.
- Selected terminal scrollback can now be copied with Command-C on macOS or Ctrl-C on Windows and Linux. Edit → Copy uses the same safe clipboard path.
