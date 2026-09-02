# Roadmap

The client is framed as a modern NukeFire-first successor in spirit to the command-driven customization of TinTin++. See `PRODUCT_VISION.md`.

## Foundation series

### Milestone 1
Known-working Mac connection and rendering base.

### Milestone 1.1
Correct Enter, pagination, scroll-following, Telnet command-boundary behavior, and the first screen-reader/keyboard foundation.

### Milestone 1.2
NukeFire-aware Telnet negotiation, dynamic NAWS, accessibility-aware MTTS, structured GMCP state, and protocol regression coverage.

### Milestone 1.3
Durable settings, Preferences, and character-specific panel visibility.

### Milestone 1.4
Dockable panels, resizable dock regions, tab groups, and later drag-and-drop placement.

### Milestone 1.5
Communications panel first, followed by pop-out native panel windows. Interval 1.5a adds the dockable Communications panel; pop-out hosting remains a later interval.

### Milestone 1.6
Structured map data and an accessible interactive mapper. Interval 1.6a adds persistent room learning, confirmed directional links, per-character visitation, and the first dockable SVG/text mapper. Route finding, manual editing, richer server map GMCP, and mapper pop-out hosting follow.


## Multi-session and automation series

### Milestone 1.9a — Multi-Session Core — Completed

- Independent concurrent NukeFire connections and session tabs.
- Direct `#name`, `#all`, named-group, and `#followers` routing.
- Roles, group leaders, saved workspaces, bounded command queues, and inactive
  session unread state.

### Milestone 1.9b — Alias and Variable Engine

- Global persistent Aliases, multi-command expansion, and recursion protection are complete.
- Global persistent Variables with `%name` expansion are complete in 1.9b2.
- Group/session scopes, import/export, GUI management, and preview/debug remain later work.

### Milestone 1.9c — Actions

- Compiled completed-line substring matchers with optional `^`/`$` boundaries,
  captures, priorities, scopes, enable/disable, event tracing, flood protection,
  and loop suspension.
- Bounded top-level semicolon command lists are complete in 1.9c0c5; named action
  groups, GUI management, GMCP triggers, and preview/debug remain later work.

### Milestone 1.9c0c3 — First-Run Workspace and Cross-Platform Beta — Completed

- Focused first-run side panels and a wider center terminal.
- Display-aware initial window sizing.
- Universal macOS and x64 Windows unsigned beta packages.
- GitHub Actions verification, artifacts, and tagged prerelease publication.

### Milestone 1.9c0c7 — Tester-Approved First-Run Workspace — Completed

- Affects and Communications on the left.
- Mapper/Context Deck tabs above Vitals on the right, with Mapper selected.
- Quick Commands, NukeFire State, and Protocol hidden until requested.
- Schema-16 migration preserves customized workspaces.
- Beta.6 Mac/Windows tester distribution through the existing tag workflow.

### Milestone 1.9c0c6 — Persistent Gag Rules — Completed

- Global persistent incoming-line suppression with Action-compatible patterns.
- Terminal-only suppression with Communications/pop-out retention, inactive-session coverage,
  reader safety, and text/GMCP deduplication.
- Text-command management, bounded filtering, prompt preservation, and fail-open safety.

### Milestone 1.9d — NukeFire Crew Orchestration

- GMCP-native actions, shared group variables, leader/follower assist helpers,
  reconnect behavior, crew dashboard, and explicit automation safety controls.

### Milestone 1.9d3 — TinTin Substitute Foundation

- Persistent display-only substitutions with priorities, captures, classes, and
  substitution-before-highlight ordering.
- Original server text remains authoritative for Actions, Gags, Communications, and
  vitals; reviewed and screen-reader-visible text follows the replacement.
- Regex extensions and `#read` script loading remain later focused intervals.

### Milestone 1.9d4 — TinTin Macro Foundation

- Persistent physical-key macros for function, navigation, numpad, and modifier
  chord keys.
- Ordered macro commands use the unified outgoing pipeline while preserving the
  prepared command and manual repeat-Return history.
- Plain typing sequences, raw terminal escape strings, recording, and `#read`
  translation remain later focused intervals.

### Milestone 1.9d5 — Prefix-Aware Command History

- Empty-input Up/Down retains ordinary full-history traversal.
- A typed prefix filters recall case-insensitively from the beginning of each command.
- Down restores the untouched draft after the newest match.
- Prefix, position, and draft remain isolated per session without changing secure
  input, macros, prepared text, or blank-Return repetition.

### Milestone 1.9d6 — Panel and Mapper Text

- Full or compact visual panel labels with full accessible identities retained.
- Optional full room numbers or bounded room names beneath Mapper squares.
- Current-room, route, GPS, BIGMAP authority, and accessible Mapper summaries remain
  independent and unchanged.



## Customization series

### Milestone 2
Unified command pipeline, character profiles, aliases, and variables.

### Milestone 2.1
Actions/triggers, captures, recursion guards, and enable/disable controls.

### Milestone 2.2
Timers, delayed commands, repeat commands, paths, and safer automation controls.

### Milestone 2.3
Highlights, substitutions, gags, key bindings, and an improved command line.

## NukeFire integration series

### Milestone 3
Reliable prompt parsing and structured character state.

### Milestone 3.1
Channel windows, group display, and clickable exits.

### Milestone 3.2
Native panels for `runinfo`, `upgrade`, `buffinfo`, `huntme`, and other NukeFire quality-of-life commands.

### Milestone 3.3
Beginner mode, advanced accessibility presets, and guided command discovery. Accessibility itself remains a requirement in every earlier milestone.

## Later work

- Lua scripting API
- Package import/export
- Sound and notification rules
- Signed and notarized macOS distribution
- Windows and Linux packaging

- Completed: native Communications pop-out window foundation with docking and remembered bounds.


## Completed: Searchable GPS Navigator (1.6d)

- Server-authored chunked GPS destination catalog over GMCP.
- Searchable and grouped Mapper dropdown.
- Existing `gps set` and `gps clear` commands remain authoritative.
- Accessible status, filtering, and keyboard operation.

## Completed: NukeFire Context Deck (1.7)

- Server-authored room services and actions over `NukeFire.Context`.
- Accessible Context Deck panel with validated action forms and controlled confirmations.
- Initial Remorter, Longwalker, Ink-Master, Packrat, Zone Intelligence, Prospector, and mine-status integrations.
- Ordinary game commands and server-side checks remain authoritative.



## Visual identity — Wasteland HUD

### Completed in 1.9c0c2

- Compact packaged NukeFire wordmark and narrow-screen NF fallback.
- Restrained worn-steel, rust, and hazard-green chrome for the live client frame,
  connection strip, sessions, panels, title bars, terminal surround, and input bar.
- Clean terminal text surface and screen-reader-mode suppression of nonessential
  decorative overlays.

### Later visual work

- Optional skin switch and clean/high-contrast visual preset.
- Application icon, splash/about screen, mapper/Communications-specific polish, and
  broader logo variants.
- Custom native-window chrome only after separate macOS focus, drag, and accessibility
  testing; the native titlebar remains intentionally unchanged today.

## Milestone 1.8 — Efficient Player Affects

- Event-driven `NukeFire.Affects` GMCP snapshots rather than pulse-by-pulse scans.
- A dockable Affects panel with grouped modifiers and local countdowns derived from server expiry timestamps.
- Permanent equipment, implant, tattoo, and remort rows stay out of the live list to avoid clutter and oversized packets.
- Automatic affect changes remain silent for accessibility and combat-spam control; deliberate review is always available.

## Milestone 1.9c0c8 — TinTin-Style Compact Speedwalks — Completed

- Default-on compact parsing for repeated and counted `n/e/s/w/u/d` routes, with a persistent off toggle.
- Persistent global toggle, active-session status/stop, 200-step cap, atomic validation,
  literal escape, manual interruption, alias support, and Action safety boundaries.
- Movement remains session-tagged and paced through the shared queue; mapper tracking
  consumes actual sent speedwalk steps.

## Milestone 1.9c0c9 — NukeFire Native App Icon — Completed

- Approved industrial NF emblem packaged as PNG, macOS ICNS, and Windows ICO.
- Native identity applied to local windows, macOS Dock/application packages, and Windows
  application, Setup, uninstaller, portable, taskbar, Explorer, and Start-menu surfaces.
- Icon-only branding pass preserves Speedwalk and every existing gameplay/client pipeline.

## Milestone 1.9d4 — TinTin Command-Line Batches — Verification

- Up to twenty brace-aware top-level commands may be entered on one command-bar line.
- Ordinary game commands, client commands, session routing, and renderer-local link
  commands execute in source order through their existing pipelines.
- Quoted/braced semicolons and `\;` literal server semicolons are preserved.
- Malformed or oversized lines fail atomically, and the whole typed line remains one
  history entry.

## Milestone 1.9c1 — Fast Combat Terminal Pipeline — Verification

- Animation-frame batching for visible terminal output.
- Incremental scrollback trimming with tracked character counts.
- Adjacent identical ANSI-run coalescing in session history and rendered output.
- One line-count and live-follow update per visual flush.
- Immediate nonvisual processing for Actions, Gags, Communications, reader state,
  vitals fallback, prompt boundaries, command sending, and Speedwalk.
- Follow-up optimization remains separate for Mapper and Communications rendering.
## Milestone 1.9d9 — Safe TinTin script reads — Verification

- Visible Documents-based Scripts folder with `#read Prime` and `#read prime.tin`.
- Atomic parsing and merge for the definition families already supported by the client.
- Familiar load counts, explicit unsupported-command reporting, and no raw command execution.
- Strict path, symlink, UTF-8, extension, size, Action-origin, and persistence safeguards.
- Deeper Functions, conditionals, nested reads, and script execution remain separate milestones.

### Milestone 2.0a — xterm.js migration

- Phase 1: optional xterm.js visual renderer with the existing renderer as fallback.
- Phase 2: verify combat latency, sessions, Find/Clear, themes, selection, and accessibility.
- Phase 3: make xterm.js the default only after VoiceOver and Windows tester approval.
- Phase 4: retire the custom DOM painter while retaining NukeFire's MUD-specific pipeline.

## Milestone 1.9d10 — Safe TinTin script writes — Verification

- `#write Prime` and `#write prime.tin` target the visible Scripts folder.
- Deterministic export covers supported definitions, enabled state, class
  membership, saved class snapshots, and active class stack.
- Generated files round-trip through safe `#read` without executing raw commands.
- Atomic replacement and the existing path, symlink, extension, size, and
  Action-origin safeguards remain authoritative.
- Native `$variable`, Functions, math, conditionals, and deeper TinTin execution
  remain separate milestones.
## Milestone 1.9d13 — Bounded TinTin Functions — Verification

- Persistent `#function`/`#unfunction` definitions and `@name{arguments}` expansion.
- `%0` complete-argument and `%1`–`%99` positional substitution with literal escaping.
- Per-call `#local`/`#unlocal`, safe Math/Format assignments, explicit `#return`, and
  `result` fallback.
- Strict recursion, depth, call, command, argument, body, and output limits.
- No hidden sends, routing, delays, file access, or automation-definition mutation; failed calls
  restore persistent Variable state.
- Functions persist, participate in classes, and round-trip through safe Read/Write.
- General control flow, lists/tables, and timers remain separate milestones.

## Milestone 1.9d14 — Lazy numeric TinTin conditionals — Verification

- `#if`, `#elseif`, and `#else` use the bounded Math evaluator; non-zero is true.
- Inline false branches and adjacent chained branches execute at most one selected body.
- Unselected branches are not expanded or evaluated.
- Direct commands, Aliases, Actions, Functions, delays, loops, classes, macros,
  routing, and command batches share one conditional path.
- Selected Action branches retain management-command and rate-limit safeguards;
  selected Function branches retain the synchronous allowlist and rollback model.
- Nesting, branch count, and selected command count are bounded. String/regex
  comparisons and general loop/switch control flow remain later milestones.
## Milestone 1.9d15 — Docked Prompt Row — Verification

- Inline, Docked, and Hidden gameplay prompt modes.
- GA/EOR-aware final-tail capture instead of packet or newline guessing.
- Stable per-session row above command input with completed group/status lines left in
  scrollback.
- Login/password/pager/editor prompts remain inline until a character is identified.
- Explicit Read Last Line access without automatic prompt live-region spam.
- Client-only implementation; game prompt composition and GMCP remain unchanged.
- Compact v4 presentation is borderless, one line high, outside the Tab order, and hides
  the read-only xterm cursor.
- v5 stages only the final visual line break while a prompt is docked or hidden, removing
  the leftover empty terminal row while preserving stored transcript and reader history.


## Milestone 1.4g — Far-Right Dock — Verification

- A second right-side region can remain visible beside the original Right dock.
- Every panel can move there through **Move Far Right** or the far-right drag target.
- Right and Far Right resize independently with pointer and keyboard controls.
- Tabs, ordering, hiding, pop-out windows, and Dock Panel continue to work.
- Default, per-character, and Shared Crew Workspace layouts retain the fourth region.
- Older settings migrate without rearranging existing panels.
- The terminal keeps its established minimum usable width and its DOM nodes are not
  replaced or cleared during layout changes.
- Full verification target: 590 tests.
