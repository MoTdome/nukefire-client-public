# Architecture

## Process boundary

### Electron main process

- `main.js`
- Owns the application window, menus, and IPC handlers.
- Creates the connection manager.
- Must not expose unrestricted Node APIs to renderer content.

### Preload bridge

- `preload.js`
- Exposes a narrow, explicit IPC API through Electron context isolation.

### Renderer

- `renderer/index.html`
- `renderer/styles.css`
- `renderer/renderer.js`
- Owns presentation, input handling, scrollback, prompt display, and user interaction.

### Protocol and transport

- `src/connection-manager.js`
- Owns TCP lifecycle and UTF-8 stream decoding.

- `src/telnet-parser.js`
- Owns Telnet IAC parsing, option negotiation, GA/EOR prompt boundaries, subnegotiation, GMCP framing, TTYPE, and NAWS.

- `src/ansi-parser.js`
- Owns ANSI stream state and conversion to renderer-safe style runs.

## Current data path

```text
NukeFire TCP stream
  -> ConnectionManager
  -> TelnetParser
  -> UTF-8 text callback
  -> Electron IPC
  -> renderer ANSI parser
  -> output DOM
```

Outgoing data:

```text
command input
  -> renderer IPC bridge
  -> ConnectionManager.sendCommand()
  -> TCP socket with MUD line ending
```

## Foundation concerns

### Blank commands
The renderer currently rejects empty commands before they reach the transport. Pagination requires an empty command to be represented as a transmitted line ending.

### Scroll following
Incoming text follows output only when already near the bottom. Sending input should explicitly restore live-follow mode and scroll to the bottom.

### GA and EOR
Telnet GA (`IAC GA`) and EOR (`IAC EOR`) are command boundaries rather than printable data. They are forwarded as structured prompt-boundary events and shown in the Protocol panel for live diagnosis. They may later drive prompt framing. They are not the mechanism that advances pagination; pagination still requires transmitting a blank command line.

## Future shared pipelines

Customization features must converge on one outgoing command pipeline and one incoming event pipeline. See `PRODUCT_VISION.md`. Aliases, actions, timers, buttons, pathing, and NukeFire-native panels must not bypass independent send paths.


## Accessibility data path

The visual terminal is not the source of truth for accessibility. Incoming ANSI text also maintains a plain-text reader state containing complete lines and prompt fragments.

```text
NukeFire text and structured protocol events
  -> complete plain-text lines / prompt boundaries
  -> shared NukeFire state
  |-> visual terminal and panels
  |-> on-demand accessible summaries
  `-> controlled important-event announcer
```

The main output region uses `aria-live="off"` so combat does not flood VoiceOver. A separate polite announcer handles concise, requested summaries such as the last line and current vitals. Incoming output must not move keyboard focus or the user's review position.

## Structured NukeFire protocol state

- `src/gmcp-store.js`
- Owns the canonical, serializable GMCP snapshot.
- Normalizes NukeFire package names case-insensitively.
- Applies full-state packets and incremental `Group.Remove` updates.
- Keeps only a bounded communication-channel history.

The structured path is:

```text
NukeFire GMCP subnegotiation
  -> TelnetParser framing and JSON decode
  -> ConnectionManager
  -> GmcpStore canonical package update
  -> immutable renderer snapshot over IPC
  |-> vitals meters
  |-> character / room / group summaries
  `-> future mapper, channel, target, and automation systems
```

The renderer must not scrape terminal text when equivalent structured GMCP data
exists. Text parsing remains a fallback for pre-login output and servers that do
not provide the needed package.

## Terminal capability path

Before connection, the renderer reports accessibility preferences and measured
terminal rows/columns through the preload bridge. The connection manager supplies
those values to the Telnet parser during NukeFire negotiation.

```text
renderer preference + measured output geometry
  -> explicit IPC methods
  -> ConnectionManager session settings
  -> TTYPE / MTTS and NAWS replies
```

Changing terminal size after NAWS is enabled sends a new NAWS frame only when the
rows or columns actually changed. Screen-reader preference changes update future
TTYPE replies; the initial value is always synchronized before connecting.


## Settings persistence

- `src/settings-store.js`
- Owns the versioned application settings schema.
- Runs only in the Electron main process.
- Writes to Electron's per-user application-data directory.
- Uses a temporary file and atomic rename, retaining the previous valid file as
  `settings.json.bak`.

The renderer remains sandboxed and accesses settings only through the explicit
preload IPC bridge. Existing `localStorage` values are supplied once as migration
input, then mirrored as a compatibility fallback during this foundation interval.

```text
existing renderer preferences
  -> explicit migration snapshot over IPC
  -> SettingsStore validation and normalization
  -> settings.json + settings.json.bak
  -> normalized settings returned to renderer
```

Milestone 1.3a deliberately does not change the window layout, sidebar, terminal
DOM, output scrolling, or workspace behavior. Preferences UI and panel layouts
remain separate later intervals.

## Workspace layout metadata

The renderer keeps the terminal shell independent from customizable panel layout.
Workspace settings now contain five orthogonal pieces of metadata:

```text
panels       visible or hidden
layout       dock region and stable order
dockSizes    left/right/far-right widths and lower height
tabGroups    panel-to-group membership
activeTabs   selected panel for each group
```

Schema 5 normalizes every older layout into one independent tab group per panel.
A tab group may exist only inside one dock region. Moving a panel between regions
separates it first, which prevents invalid cross-dock groups. The renderer reparents
only panel DOM nodes; it does not replace the terminal shell, output node, or command
input.



## Communications pipeline

`src/communications.js` owns channel normalization, split-safe text buffering, conservative fallback classification, and structured GMCP message normalization. The renderer owns only the bounded view model, filtering, unread counters, and DOM presentation.

```text
Comm.Channel / NukeFire.Comms.Message GMCP
  -> GmcpStore canonical package event
  -> communications normalizer
  -> bounded communications view model
  -> dockable filtered panel

ANSI terminal text
  -> unchanged main terminal rendering
  -> stripped plain-text copy
  -> split-safe conservative classifier
  -> communications view model only when confidently recognized
```

Structured GMCP is authoritative. The text path is deliberately conservative and never removes, gags, or redirects terminal output. Equivalent GMCP and text copies are deduplicated within a short window. Message history is intentionally in-memory in this interval; only panel layout and selected-filter preferences are persisted.


## NukeFire Context Deck pipeline

`src/context-deck.js` is the bounded client-side contract for `NukeFire.Context`. It sanitizes labels and identifiers, caps collection sizes, validates text/number/select arguments, and builds one ordinary command string. It does not contain NukeFire eligibility or cost rules.

```text
current NukeFire room and character state
  -> server builds NukeFire.Context snapshot
  -> TelnetParser frames and decodes GMCP
  -> GmcpStore stores context.state
  -> Context Deck renders native DOM cards and forms
  -> player activates a control
  -> shared sendCommand pipeline sends an ordinary MUD command
  -> server validates and executes it
  -> client requests a fresh NukeFire.Context snapshot
```

The renderer never uses `innerHTML` for server-supplied context data. Destructive actions may include server-authored confirmation text, but confirmation does not replace server-side validation. The card container uses `aria-live=off`; a separate concise summary is available without turning room movement into an announcement stream.


## Multi-session pipeline

`src/session-manager.js` runs in the Electron main process and owns a bounded set
of independent `ConnectionManager` instances. Each connection keeps its own socket,
Telnet parser, GMCP store, terminal size, client preferences, and paced command
queue. The renderer receives tagged `{ sessionId, type, payload }` events.

`src/session-runtime.js` owns the renderer-side state that must not leak between
characters: ANSI stream state, output runs, plain-text review state, command
history, vitals, Communications, Affects, Context Deck, and mapper movement state.
Only the active runtime is attached to the visible terminal and dock panels.
Inactive sessions continue collecting bounded event data and expose a quiet unread
badge; they do not start render or countdown loops.

```text
session tab / #target command
  -> preload sessions:* IPC
  -> SessionManager routing
  -> target SessionCommandQueue
  -> target ConnectionManager
  -> target TCP socket

TCP / Telnet / GMCP event
  -> owning ConnectionManager
  -> tagged session:event IPC
  -> owning renderer session runtime
  -> visible DOM only when that session is active
```

The session coordinator does not poll terminals or rescan scrollback. Future
aliases and actions must feed this same routing/queue path and must preserve the
session tag on every event.


## Multi-command Action dispatch

Action definitions compile a maximum of 10 top-level semicolon-separated templates.
Splitting occurs before wildcard substitution, so server-authored capture text cannot
create additional commands. On a completed-line match, SessionManager validates the
entire substituted list and completed alias expansions before dispatch. Accepted
items then traverse the same alias, target-routing, and bounded per-session queue path
as typed commands. The rate limiter charges one slot per generated command.

## Incoming Gag filtering

Each session owns a bounded raw-line filter between its ConnectionManager and renderer
text event. The filter retains only an incomplete line, evaluates complete cleaned text
through the global GagEngine, and emits original ANSI-bearing bytes to the terminal only
for visible lines. Hidden raw lines travel on a Communications-only event so recognizable
channels remain available without entering terminal or screen-reader history. Actions also
consume the original stream independently. Structured communication GMCP remains
authoritative and deduplicates against the text copy. GA/EOR boundaries flush pending
prompt text, and oversized unterminated text fails open.

## First-run workspace defaults (schema 16)

Fresh normalized settings place Affects and Communications in independent left-dock
panels. Mapper and Context Deck share the `mapper` tab group in the upper right with
Mapper active, and Vitals follows as an independent right-dock panel. Quick Commands,
NukeFire State, and Protocol remain hidden. Migration compares the complete schema-15
default workspace before replacing it so customized records are not partially rewritten.

## Compact Speedwalk pipeline

`src/speedwalk-engine.js` is a DOM-free parser for the default-on compact route grammar.
It accepts only `n`, `e`, `s`, `w`, `u`, and `d`, with optional decimal repeat counts
before a direction. Parsing occurs after alias expansion and validates the complete
route before queueing any movement.

```text
ordinary typed command / completed alias
  -> Speedwalk enabled check
  -> bounded compact grammar parse (maximum 200 steps)
  -> atomic enqueue into the active SessionCommandQueue
  -> default zero-delay bounded drain sends separate ordered movement lines
  -> tagged speedwalk-step events preserve the sent direction sequence
  -> Room.Info / prompt boundaries resolve that movement-intent queue in order
  -> mapper records successful movement without imposing an artificial timer
```

The default queue interval is zero so compact routes do not manufacture client-side
latency; explicit non-zero pacing remains supported for deliberate paced/cancellable
callers and tests. A leading backslash bypasses parsing for ambiguous direction-only
words. Manual ordinary input removes any still-unsent speedwalk-tagged queue entries
before it is queued; `#speedwalk stop` does the same without disabling future parsing.
Action validation
blocks both Speedwalk management directives and ordinary commands that would become
compact routes, preventing one incoming line from creating a large movement burst.
The setting is global, defaults on for fresh settings, preserves an explicit saved off
choice, and persists in settings schema 17.

## Native application icon pipeline

The approved NF emblem is normalized once into `build/icon.png` at 1024 by 1024 pixels
with transparent outer corners. Platform containers are committed beside it:
`build/icon.icns` contains the macOS application representations and `build/icon.ico`
contains common Windows icon sizes. Electron Builder reads those files from its `build`
resources directory. Only the PNG is included in application files so BrowserWindows and
the macOS development Dock can use the same identity at runtime. The icon pipeline has no
renderer IPC, network, settings, terminal, or accessibility dependency.

## Manual command-line batch pipeline

The renderer and main process share `src/client-command-parser.js` for top-level
semicolon analysis. The renderer uses the analysis only for connection gating, prompt
framing, and renderer-local hyperlink commands; `SessionManager.dispatchInput()` owns
the actual ordered dispatch. This keeps manual batching out of alias, Action, delay,
loop, macro, and Speedwalk expansion paths, which already have their own bounded
command-list semantics.

```text
manual command-bar line
  -> brace/quote/escape-aware validation (maximum 20)
  -> renderer connection and prompt classification
  -> ordered SessionManager dispatch
  -> normal client command / alias / variable / routing / queue pipeline
```

The entire line is validated before any part runs. Braced and quoted semicolons remain
inside their command, while `\;` becomes one literal server semicolon only when the
manual command part reaches the ordinary outgoing path. A session activation earlier
in the list becomes the source for later parts. Renderer-local `#links` and `#link`
commands are interleaved without creating a second history entry or bypassing the
coordinator for the remaining commands.

## Physical-key macro pipeline

`src/macro-engine.js` owns normalized physical-key signatures, bounded command
lists, enable state, persistence snapshots, and TinTin-style class membership.
It is DOM-free and shares keyboard-code normalization with
`src/keybinding-engine.js`.

The renderer listens at the document capture boundary so an explicit macro wins
over an overlapping configurable shortcut. A matching key launches every stored
command sequentially through `sendCommand(command, { preserveInput: true,
recordHistory: false })`:

```text
physical KeyboardEvent.code
  -> MacroEngine signature lookup
  -> secure/modal/editing/repeat guards
  -> ordered macro command list
  -> normal sendCommand / routeCommand pipeline
  -> aliases, variables, client commands, routing, queues, and network delivery
```

The terminal, an empty command input, and a fully selected last-sent command remain
valid macro surfaces. An actively edited draft blocks TinTin macros so printable
shortcut chords can continue typing normally. Configurable keyboard shortcuts use
their persisted `worksWhileTyping` flag: false by default, with an explicit per-
shortcut Preferences opt-in. Both paths dispatch with `recordHistory: false`, so
neither can replace blank-Return repeat. Other editable form fields are excluded.
Secure echo, Preferences, knowledge/dialog overlays, Find, composition events, and
repeated keydown events fail closed. Macro definitions persist in settings schema 32
and travel through session snapshots and class save/clear/load without introducing a
second command-dispatch path.

## Visible-text substitution and highlight overlay

`src/substitute-engine.js` owns normalized, persistent substitute definitions and a
bounded DOM-free run transformation. `src/highlight-engine.js` then decorates the
resulting visible runs. Incoming ANSI is parsed once, completed lines are substituted
once, and Highlights match the final displayed wording before xterm rendering.

```text
original incoming bytes
  |-> Actions, Gags, Communications, vitals (original text)
  `-> safe ANSI runs -> SubstituteEngine -> HighlightEngine -> terminal/review/reader
```

Captured substitute text retains its original ANSI style and safe OSC 8 link metadata;
literal replacement text inherits the match's starting presentation. The substitute
pass never feeds inserted text back into itself. Highlights then split only matching
visual ranges and never rewrite words or links. The completed-line buffer is active only
while a Substitute or Highlight definition is enabled, allowing matches to span transport
chunks; prompt boundaries and disconnects flush any remaining fragment. Local `#showme`
and formatted `#echo` text use the same substitute-then-highlight display path while
retaining Communications/vitals isolation. `#showme` explicitly re-enters the Action
line buffer; `#echo` emits the approved local-text event without that Action step.

`src/echo-format.js` owns bounded TinTin-style formatting. It sanitizes all user input
before formatting, accepts at most 30 arguments, caps field widths, precision, and
visible output, and generates only whitelisted ANSI from known color names or `<abc>`
codes. The terminal parser removes those generated controls from reader text while
preserving their visual style.

## Bounded TinTin math and stored formatting

`src/math-engine.js` tokenizes one ASCII numeric expression into a bounded Pratt
parser and evaluates the resulting AST without `eval`, `Function`, properties, or
host callbacks. Token, node, operation, dice, root, shift, magnitude, precision,
and output limits are enforced before a result can reach `VariableEngine`.
Logical and ternary nodes short-circuit, and integer division remains distinct
from decimal division.

`SessionManager` owns `#math` and `#format` so both use the same Variable,
ClassManager, Alias, Action, routing, batch, and Pipeline Debug state. Format
reuses `src/echo-format.js`; `%m` delegates only to the bounded math evaluator.
Stored Format output rejects generated ANSI rather than placing terminal controls
inside persistent Variables.

Action preparation defers persistent-variable expansion only for the approved
local scripting directives `showme`, `show`, `echo`, `math`, and `format`.
Their directive names are still prevalidated before the burst runs, but their
arguments expand at dispatch time. This preserves sequential script semantics
without allowing a changed Variable to inject a server or management command.

## Fast combat terminal pipeline

The beta.9 renderer separates immediate processing from visual paint:

```text
session text event
  -> ANSI/session runtime immediately
  -> reader, Communications, vitals, Actions/Gags immediately
  -> bounded pending visual runs
  -> one requestAnimationFrame flush
  -> one DOM append + incremental trim + line update + optional follow scroll
```

Session history and pending visual runs coalesce adjacent entries with the same style
signature, capped at 32,768 characters per run. Rendered nodes store their own character
counts, so scrollback trimming removes or shortens only the oldest affected nodes instead
of reading the complete terminal string after every network chunk.
## Experimental xterm.js visual layer

The terminal migration deliberately preserves the existing pipeline boundary:
network/Telnet parsing, completed-line Actions and Gags, Communications extraction,
reader text, prompts, Variables, and per-session stored runs execute before rendering.
The selected visual adapter receives only approved styled runs. This permits xterm.js
testing without giving a terminal emulator authority over NukeFire automation or state.

A single adapter serializes live writes, clear operations, and complete session
replacements. The custom DOM renderer remains a selectable fallback during migration.


## xterm visual write path

The NukeFire line pipeline remains authoritative. For the active session, the already
gag-filtered live text is sanitized to retain SGR only and is then written directly to
xterm.js so server colors are not reconstructed or lost. Stored runs remain the source
for session restoration, engine switching, reader text, Find state, and persistence.

## Display text presentation

`src/display-text.js` is a small dual browser/Node module that normalizes visual
panel-label and Mapper-room-label preferences. The renderer may shorten visible
panel headings and tabs, but full panel names remain the accessibility identity.
Mapper room labels are visual SVG decoration only; authoritative room data and the
accessible room summary continue to come from the existing Mapper state path.

## Optional pipeline debug

`src/pipeline-debug.js` owns normalization, bounded retention, safe text cleanup,
and copyable entry formatting. Each `SessionManager` session owns one buffer; only
the enabled session evaluates lazy trace-message factories. Manager-side stages
cover manual input, batching, dispatch, Alias and Variable expansion, routing,
Speedwalk, sends, Actions, and Gags. Renderer-only macro, Substitute, and Highlight
decisions append to the same active-session view.

```text
Preferences or #debug pipeline on
  -> per-session PipelineDebugBuffer enabled
  -> existing command/text paths emit bounded stage entries
  -> pipeline-debug session event
  -> Protocol panel log / Copy / Clear
```

The tracer has no authority to dispatch commands or transform text. Its persisted
state contains only `enabled` and `maxEntries`; log contents remain runtime-only.
During secure echo, both manager and renderer traces replace details with one fixed
redaction message. The existing sandboxed preload bridge exposes narrow get, set,
and clear IPC methods without loading local modules.

## Safe TinTin script-read boundary

`src/script-store.js` owns the main-process filesystem boundary. It resolves only
safe extensionless or `.tin` names beneath `Documents/NukeFire Client/Scripts`,
rejects symlinks and nonregular files, decodes strict UTF-8, and returns file text
as data through narrow sandboxed preload IPC. The renderer never receives general
filesystem access.

`src/tintin-script-loader.js` parses that text without dispatching it. It removes
`/* comments */`, identifies the file command character, splits balanced multiline
commands, and stages only definition types already represented by bounded client
engines. Unsupported or raw commands become report entries rather than executable
work. Fatal syntax or capacity errors leave the live client untouched.

```text
#read request
  -> SessionManager emits script-read-request (Actions blocked)
  -> main-process ScriptStore validates and reads one file
  -> renderer TinTin loader stages a complete merged snapshot
  -> SessionManager replaces definitions and classes
  -> renderer persists settings immediately
  -> on any failure, restore the exact prior definitions and class snapshot
```

The loader does not create a second outgoing command pipeline and has no authority
to connect, send login text, invoke shell commands, or recursively read files.

## Safe TinTin script-write boundary

`src/tintin-script-writer.js` is a dual browser/Node serializer over the existing
bounded definition snapshots. It emits only commands that the safe loader can
stage, uses deterministic category and key ordering, and escapes structural
braces, quotes, and backslashes reversibly. It has no filesystem authority.

```text
#write request
  -> SessionManager emits script-write-request (Actions blocked)
  -> renderer serializes the current definition/class snapshot
  -> sandboxed preload sends one safe name plus UTF-8 text
  -> main-process ScriptStore writes a same-directory temporary file
  -> atomic rename creates or replaces one regular .tin file
  -> renderer reports familiar written totals
```

`ScriptStore.write` shares the read-side name normalization and Scripts directory.
It never accepts paths, symlinks, directories, unsupported extensions, empty or
oversized content, and it cleans temporary files after failures. The writer also
emits bounded NukeFire class save/clear/activate commands; the loader interprets
these as snapshot operations rather than dispatching them through the command
pipeline. This permits exact supported-state write/read round-tripping while raw
file execution remains prohibited.

## Native TinTin variable expansion boundary

`src/variable-engine.js` owns both the established NukeFire `%name` syntax and
native TinTin `$name` syntax. The parser recognizes simple unbraced references,
braced nonstandard names, doubled-sigil literals, and backslash escapes in one
left-to-right bounded pass. Variable values may contain either syntax, and one
shared stack detects recursion across mixed forms.

Expansion remains inside the existing SessionManager pipeline after Alias or
Action argument substitution and before routing/queue delivery. Unknown references
remain literal. Action `%0`–`%9` captures are resolved first, so adding dollar
variables does not reinterpret trigger captures. Safe `#read`, settings restore,
and `#write` all preserve stored values and command bodies without eagerly
expanding them. Bracket notation is rejected until the later table model exists.
## Bounded TinTin Function execution boundary

`src/function-engine.js` owns normalized persistent Function definitions,
brace-aware argument parsing, `%0`–`%99` positional substitution, and literal
`@`/percent escaping. `SessionManager` expands `@name{arguments}` before ordinary
Variable expansion at the existing command-pipeline locations. No renderer or
preload execution authority is added.

Each call creates an isolated local frame with a special `result` local. The
Function body is split into bounded top-level commands and interpreted by a small
allowlist: Local, Unlocal, Math, Format, and Return. Nested Function calls use a
shared depth/call budget. Recursion, malformed calls, excessive output, unsafe
commands, and calculation or formatting errors stop the call.

```text
ordinary command / Alias / Action text
  -> Function expansion with bounded call context
  -> per-call local frame
  -> Local / Math / Format / Return interpreter
  -> returned text
  -> established Variable expansion and dispatch path
```

The Function interpreter cannot send to a connection, route to another session,
schedule delays, access files, or mutate automation definitions. Math and Format
may update Variables. Persistent Variable state
is snapshotted at the start of each call and restored after any failure, avoiding
partially applied calculations. Function definitions and class snapshots remain
ordinary settings data and are serialized by the safe Read/Write layer.
## Lazy numeric conditional execution boundary

`src/conditional-engine.js` parses one If statement or an adjacent
If/Elseif/Else chain without evaluating branch contents. It uses the shared
client-command tokenizer, respects the selected command prefix, and enforces
limits on branches and syntax before SessionManager chooses anything.

```text
brace-aware command list
  -> collect adjacent If / Elseif / Else chain
  -> expand and evaluate one condition at a time with the safe Math engine
  -> select at most one branch
  -> split and dispatch only that branch through the existing pipeline
```

Unselected branches are never Function-expanded, Variable-expanded, Math-evaluated,
or dispatched. Direct/Alias/delay/loop/macro execution returns selected commands
to normal dispatch. Action execution validates the complete selected branch before
queuing and still blocks management commands, repeat multiplication, and compact
Speedwalk. Function execution interprets the selected branch only through its
existing Local/Math/Format/Return allowlist and restores persistent Variables after
any later failure. Nesting, branch count, and selected command count are bounded.
No renderer, preload, filesystem, network, or settings authority is added by the
conditional parser.
## Docked prompt capture boundary

The server remains the authority for prompt composition. NukeFire already terminates a
completed gameplay prompt with Telnet GA/EOR, and `src/telnet-parser.js` exposes that as a
separate prompt-boundary event. Beta.42 does not infer prompts from TCP packet endings or
from the absence of a linefeed.

```text
incoming text chunks
  -> existing Telnet/UTF-8/ANSI and line processing
  -> completed CR/LF lines continue to terminal history
  -> unfinished final line remains in the per-session line buffer
  -> GA/EOR boundary captures that tail as the current prompt snapshot
  -> Inline: flush tail to terminal history
     Docked: render tail in the stable prompt row
     Hidden: retain tail for explicit review only
```

For Docked and Hidden presentation, the renderer withholds only the final line-break run
from xterm while the current prompt is captured. The complete line break remains in the
stored session transcript and is released before the next visible run. This removes the
otherwise empty active xterm row without rewriting history, changing line counts, joining
adjacent output, or introducing cursor-control sequences. Session restore and display-mode
changes derive the same presentation from the stored runs.

Capture is enabled only after the session has an identified character. Login, password,
pager, and editor prompts therefore keep their established inline behavior. A multiline
group prompt is split naturally: completed group lines remain scrollback content and only
the final unfinished gameplay prompt is eligible for docking.

Each runtime session owns an independent prompt snapshot containing raw text, transformed
visual runs, plain review text, boundary type, and update time. Substitute and Highlight
transforms affect the visual prompt exactly as they affect visible terminal output, while
Actions, Gags, Pipeline Debug, Communications isolation, and vitals parsing retain their
existing input boundaries. No main-process filesystem, preload, network, game-server, or
GMCP authority is added.

## Far-right dock extension

Beta.44 extends the established workspace model with one additional normalized
region, `outer-right`. It is deliberately a bounded fourth dock rather than a
general recursive layout tree. This supplies the requested two adjacent right-side
columns without replacing the proven panel, tab-group, persistence, and pop-out
architecture.

```text
workspace grid
  left | splitter | terminal | splitter | right | splitter | outer-right
  bottom dock spans the complete grid below
```

All visible side docks participate in one width-fitting pass. Saved preferred sizes
remain authoritative, but the renderer proportionally constrains visible columns
when needed to retain the terminal minimum. Empty regions and their separators
collapse. `outer-right` uses the same normalized region/order, tab membership,
active-tab, character scope, and Shared Crew Workspace paths as existing docks.
No new main-process, preload, network, GMCP, or command authority is introduced.


## Beta.66a change-only secondary-panel rule

High-frequency gameplay state is authoritative in memory; secondary panel DOM is now treated as a view, not as required processing. Mapper, NukeFire Console, Affects, and Mob Inspector can mark their visual surface dirty while hidden/inactive and render once when the dock tab or pop-out becomes live. Pop-out subtree observers are connected only while a matching separate window is open. Compact Mob Inspector HP/group updates use a small live-combat updater rather than reconstructing structural inspection content. Duplicate normalized Context, Communications-tab, Group-Vitals, and affect-structure states are no-op visual updates. This keeps terminal/network/GMCP state independent from whether secondary UI is presently visible while preserving accessibility and server-authoritative state.
