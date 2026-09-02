## 2026-08-26 - MUSH Settings Accessible Result Feedback

- Added immediate spoken feedback for `CR LOAD MUSHSETTINGS`.
- Reports official shortcut coverage and lists preserved shortcut conflicts with the corresponding action that was not installed.
- Keeps custom assignments authoritative; Alt+C is never silently replaced by Copy Reviewed.
- Preserves Client Reader History retention, command drafts, communication-sound setup, command-send speech interruption, and unchanged combat-audio choices.

## 2026-08-26 — Server-Owned GroupAssist Control Surface

- Expanded the existing persisted GroupAssist rotation into a server-owned learned-action catalog rather than duplicating class eligibility in the Electron client.
- Preserved veteran `groupassist <target> <action...>` rotations while adding guarded `status`, `options`, `set`, and target-first `clear` forms; new SET requests accept only action IDs the current character has learned.
- Advanced `NukeFire.Controls` to schema 2 with bounded learned GroupAssist options, exact server execution syntax, skill identity, leader-targeting metadata, saved rotations, and next-action state.
- Added a keyboard-complete five-action GroupAssist editor to the existing NukeFire Console. It keeps status non-live, preserves the command draft, validates target text, and sends only server-provided action IDs.
- Added concise `SR GROUPASSIST` discovery and setup output so Reader users never need the visual editor.

## 2026-08-26 — Command-Input-First Accessibility Audit

- Audited the Reddit-reported Electron/browser-mode concern against the active Reader workflow: routine line, category, communication, vitals, tell, movement, and copy review remain local hotkey actions that do not require leaving the command field.
- Prevented asynchronous connected-status events from stealing focus out of deliberate terminal review, Reader controls, Preferences, or another focused surface; command focus is restored only when the player was already using the command or connection workflow.
- Preserved command drafts and selections when connection completion legitimately returns focus to the command field.
- Suppressed identical connection-status text rewrites so the polite status live region does not receive redundant mutations, and locked the existing blank-announcement guard with regression coverage.

## 2026-08-26 — Southpaw MUSH Reader Setup and Review Safety

- Removed the immediate Exit Reader Workspace button from the first post-command-input Tab position; Reader Workspace remains deliberately controllable through Preferences and CR controls.
- Added the conflict-safe `CR LOAD MUSHSETTINGS` client preset: Alt+1–9 line recall, Alt+I/J/K/L/U/N movement, Alt+T Last Tell, Alt+H vitals, Alt+C Copy Reviewed, and F5 Self-Voice mute.
- The preset enables command-send Self-Voice interruption and all five communication-channel sound choices, leaves combat audio settings unchanged, replaces only NukeFire-owned Reader preset keys, and reports protected custom-key conflicts.
- Added a bounded Copy Reviewed action that copies only the last deliberately reviewed Reader History, raw Reader Review, or Communications text and never changes command input or review position.

## 2026-08-26 — Reconnect-Safe Compression Preference

- Replaced the temporary always-off Beta.68 plain-transport diagnostic with a persisted, default-on preference for incoming MCCP2 and MCCPX compression.
- A changed preference is deliberately connection-scoped: active Telnet negotiation and decoder streams are never abandoned, and the new value takes effect only when a fresh parser is created on the next connection or reconnect.
- Disabled mode declines both compression options through ordinary Telnet negotiation while leaving GMCP and unrelated Telnet options enabled.
- Preferences explains the reconnect requirement, Protocol Diagnostics exposes the selected next-connection state, and the client announces the change without requiring pointer navigation.
- Advanced the settings schema to 48 and preserved compression-enabled behavior for existing and first-run settings.

## 2026-08-24 — Beta.66a Responsiveness Cleanup Pass 2
- Cached stable renderer `#id` lookups and changed high-frequency vitals/state writes to mutate the DOM only when values actually change.
- Reused the transformed plain text already produced by `session-runtime.appendText()` instead of joining the same run list a second time for every incoming text chunk.
- Stopped regex-based prompt-vitals fallback scanning after authoritative `Char.Vitals` GMCP has arrived; fallback behavior remains intact for servers/clients without that package.
- Kept the GPS destination option tree stable across ordinary `Char.GPS` position/progress updates; the potentially hundreds-of-options DOM is rebuilt only when the catalog or search filter changes.
- Exact duplicate BIGMAP snapshots still satisfy movement/route confirmation but now skip live-index reconstruction, graph mutation, map persistence scheduling, and SVG rerendering.
- Opponent vitals and NukeFire character/room/group summaries now suppress identical DOM rewrites while preserving the same visible and accessible values.
- No accessibility controls, speech semantics, Reader History, GMCP ownership, mapper route verification, or command behavior was removed.

## 2026-08-24 — Beta.66a Responsiveness Cleanup Pass 1

- Removed the full TinTin/session-definition snapshot from the active incoming-event hot path; live records already receive authoritative text, GMCP, protocol, prompt, and accessibility state directly.
- Reduced MCCP2/MCCPX receive overhead by retaining socket Buffers without an extra copy, pruning compression-boundary bookkeeping in place, and moving live compression telemetry off decompressor callbacks onto a one-second timer.
- Split compression diagnostics from the full Protocol display and coalesced GMCP/prompt counters so diagnostic paint cannot compete with terminal delivery.
- Added no-definition fast paths for Actions, Sound Triggers, Highlights, and Substitutes while preserving explicit pipeline-debug behavior.
- Avoided semantic-audio vitals/group cloning when Audio Cues are disabled, muted, background-suppressed, or the incoming GMCP package cannot produce a cue.
- Skipped speech-trigger line buffering entirely while Self-Voice is off, and stopped rebuilding the Session Vitals DOM for inactive-session text unless fallback parsing actually changed a vital.
- Kept terminal batching, Reader/Self-Voice behavior, copyover recovery, GMCP semantics, TinTin command behavior, and player-visible output unchanged.

## 2026-08-23 — Beta.66 Modern Compression Transport

- Promoted the proven MCCP2 and MCCPX/Zstandard transport work into
  0.3.1-beta.66 for wider tester distribution.
- Kept DEFLATE/MCCP2 as the compatibility path while allowing the official
  NukeFire Client and current NukeFire server to negotiate MCCPX/Zstandard.
- Added live wire/expanded-byte telemetry so compression effectiveness can be
  measured from real NukeFire sessions rather than estimated.
- Hardened copyover stream termination and renegotiation after live testing
  exposed the difference between zlib and Node's streaming Zstandard decoder.
- Retained the existing terminal, GMCP/MSDP, Reader/Self-Voice, accessibility,
  Mob Inspector, semantic-output, TinTin, and multi-session architectures.
- Release gating requires full-suite verification before promotion, after
  promotion, and from the detached locked commit used for binaries.

## 2026-08-22 — Beta.65 Accessibility & Combat Context Reliability

- Promoted the accepted accessibility/Reader, communication-cue, Affects, Communications live-edge, and Mob Inspector lifecycle work into 0.3.1-beta.65 for wider tester distribution.
- Kept Self-Voice, Reader History, CR controls, native sounds, and multi-session behavior on existing bounded client architectures rather than introducing parallel speech/output paths.
- Added exact mob-instance lifecycle semantics to the official client while preserving compatibility with older server payloads.
- Retained Beta.64 TinTin Source-Parity 1-20 unchanged as the scripting baseline.
- Release gating requires full-suite verification before promotion, after promotion, and from the detached locked commit used for binaries.

## 2026-08-21 — Accessibility Client Reader Review Refinement

- Added a quiet per-session Client Reader category to Reader History for client-side CR accessibility material.
- Reader tutorial speech is retained in Client Reader history so missed tutorial steps can be reviewed without restarting the tutorial.
- Meaningful CR control results such as status, doctor, context, keys, voice, audio, and setup responses are retained for later review.
- Review/line/category navigation bookkeeping is deliberately excluded so the new category does not fill with generic action-completed messages.
- Existing local Read Health and Read Vitals behavior remains unchanged; those forced local announcements already interrupt Self-Voice.

## 2026-08-21 — Accessibility Command Flow Refinement

- Removed the command input's permanent accessible-description attachment so Up/Down history navigation no longer invites screen readers to repeat the full command help text for every recalled command.
- Added an opt-in, persisted Self-Voice setting to interrupt stale speech whenever a nonblank command is sent.
- Kept command history values, visible history position, Reader Review, terminal output, pager handling, movement-follow speech, and priority alerts otherwise unchanged.
- Advanced persistent settings schema to 46.

## 2026-08-20 — Beta.64 Veteran TinTin Compatibility

- Promoted the cumulative TinTin Source-Parity 1–20 sequence to 0.3.1-beta.64.
- Locked veteran-facing TinTin compatibility improvements while retaining NukeFire's bounded execution and explicit safety boundaries.
- Preserved the trusted Beta.63 server-aware context, accessibility, Reader, mapper, workspace, and presentation features.
- Paused further TinTin source-parity expansion after Pass 20 so this verified state can ship as a stable testing baseline.

## 2026-08-18 — Beta.63 Server-Aware Context and World Intelligence

- Promoted the cumulative Beta.63 client candidate sequence to 0.3.1-beta.63.
- Locked the first server-aware context surfaces: Mob Inspector, session Loot History, and Foundlist / Upgrades.
- Preserved the accepted Beta.63 compact mapper/GPS, workspace, affects, vitals, Reader, and presentation refinements.
- Release policy remains server-authoritative and backwards-compatible with ordinary terminal play.

## 2026-08-18 — Mob Inspector Transient Combat Polish

- Removed the Inspector's Consider/Mobcount/Diagnose action buttons so the client never reconstructs a command target from a display name or prototype keyword.
- Preserves server-provided lookup provenance (`lookup_arg`, whether an argument was supplied, and current-target resolution) for future context without turning it into a client-side targeting algorithm.
- Treats Mob Inspector as transient room context: a Room.Info change clears and hides stale inspection state without persisting that temporary hide as the player's workspace preference.
- Uses Char.Vitals opponent state to switch the inspected mob into a compact combat card, refresh the current target once through `NukeFire.Mob`, use live opponent HP while fighting, follow target changes, and hide the card when combat target context ends.
- Compact combat presentation keeps identity, HP, and up to four active-effect rows while hiding zone/history/mastery/Consider detail until the next expanded inspection.
- Adds small inline SVG monster emblems selected only from server-known mob flags/class information: machine, undead, caster-like class, fighter-like class, and a generic creature fallback. Boss/miniboss remains an explicit text descriptor and small visual badge.
- Keeps all iconography decorative (`aria-hidden`); structured text and the existing polite Mob Inspector summary remain the accessible source of truth.

## 2026-08-18 — Beta.63b8 Adaptive Compact Vitals

- Continued the pane-efficiency pass after Compact Interactive Affects.
- Core H/M/V now share one compact row each with label, thin meter, and numeric value.
- Opponent information occupies no pane space outside combat; the block returns immediately when authoritative opponent data is present.
- Group Vitals similarly disappears for Solo/self-only presentation and returns when another visible member exists.
- Active combat rows and Session Vitals use tighter spacing so more useful state remains visible before scrolling.
- No GMCP schema, combat math, Reader/audio, terminal, network, TinTin, or server changes are included.

## 2026-08-18 — Beta.63b6a Field Layout Gallery Expansion
- Gallery rotation uses Electron app-wide focus rather than a renderer-window blur listener, preserving the established Self-Voice foreground contract.

- Expanded the header layout gallery with Field Ops, Field Ops + Crew, and Compact Ops.
- The field topology is intentionally consistent: Affects far left; Mapper with Map/GPS visible plus Vitals stacked in the adjacent dock; Communications in the far-right outer dock.
- Field Ops + Crew additionally shows Session Vitals; Compact Ops narrows all three side docks to favor terminal width.
- Layout gallery snapshots now include display-component visibility, allowing field presets to temporarily ensure GPS Navigator, Mapper Map, and Room Info are shown and then restore the player’s exact prior component choices on Return to My Layout.
- Added an outer-right block to the miniature gallery schematic so these layouts preview truthfully.
- No Affects data/content redesign is part of this interval; that remains the next focused pane-efficiency pass.

## 2026-08-18 — Beta.63b6 Workspace Header & Layout Gallery

- Reworked the top connection/session chrome as one aligned header system and reduced the expanded connection row from 72 to 64 pixels.
- Added a compact layout gallery in the wide-screen dead space. It rotates schematic previews only; it never changes the live workspace without the player pressing Try.
- Added My Layout as an explicit safe return point and five built-in arrangements: Terminal Only, Classic, Mapper Focus, Combat, and Communications.
- Terminal Only hides every docked panel and pop-out to maximize terminal space. Preset trials are non-persistent and restore the exact captured visibility/layout/dock/tab/pop-out state on Return.
- Automatic rotation pauses on pointer hover or keyboard focus and is disabled when reduced motion is requested.
- Automatic rotation also stops whenever the application window loses focus and resumes on focus, preventing idle/background gallery timers from keeping non-interactive renderer contexts alive.
- Close Session now requires a branded confirmation and explains the difference between removing the session tab and merely disconnecting it.
- No terminal-renderer, movement-priority, pager, Reader, TinTin, networking, or server changes are part of this interval.

## 2026-08-18 — Beta.63b5 Pager Enter With Saved Commands

- Fixed the interaction between paginated server output and the optional saved-command display in the command line.
- A command automatically left selected after sending (for example `news`) is treated as display-only while a pager is pending, so Enter sends the pager carriage return rather than re-running the command.
- The displayed command is preserved across each pager advance. If the player edits the field or types a different command, that explicit input continues to win and sends normally.
- The pager detector now explicitly recognizes NukeFire’s native `Valid commands while paging are RETURN, Q, R, B, or a numeric value.` prompt; the first b5 candidate only recognized generic MORE/continue prompt forms.
- Repeat-last behavior outside pagination, command history, Reader behavior, terminal timing, mapper movement priority, networking, and server code are unchanged.

## 2026-08-18 — Beta.63b4 Movement-First BIGMAP Handoff

- Narrowed the movement-priority experiment after the first two guarded candidates exposed mapper timing regressions.
- Ordinary Room.Info and NukeFire.Map.Local packets remain synchronous exactly as before.
- Only NukeFire.Map.Local received while a locally initiated movement is still being resolved yields one event-loop task; Room.Info remains immediate.
- If terminal runs are waiting when that task executes, they are written before the BIGMAP graph/index/persistence work. No animation-frame delay is introduced.
- Deferred packets retain arrival order, are session-scoped, and are cleared by hard mapper reset/reconnect handling.
- Terminal flow thresholds, fonts/ANSI, command sending, networking/Telnet, Reader, TinTin, sessions, and server code are otherwise unchanged.

## 2026-08-18 — Beta.63b3 Terminal Flow and Adaptive Paint

- Removed the extra full-animation-frame wait from ordinary multi-chunk terminal output while preserving the existing 2 ms low-latency window.
- Added adaptive burst protection: eight or more pending input batches, or 8192 or more pending terminal characters, continue to use the established once-per-frame path.
- Tracks only pending paint characters; no full transcript rescans were introduced.
- Heavy combat remains coalesced, outgoing commands remain independent of terminal paint, and session/output flush boundaries remain synchronous where already required.
- No network, Telnet, GMCP/MSDP, ANSI parsing, Reader, TinTin, mapper, session, or server behavior changes in this interval.

## 2026-08-18 — Beta.63b2 Terminal Typography and Fixedsys Safety

- Reduced ordinary xterm line height to 1.25 for denser, more traditional MUD output while preserving Compact at 1.12.
- Disabled xterm's independent bold-to-bright remapping because stored NukeFire runs already preserve bold state and explicitly resolve standard bold ANSI colors to the matching bright palette.
- Added explicit terminal font profiles. Fixedsys uses regular-weight glyph metrics for bold text while color still carries ANSI bright emphasis, disables xterm replacement block/box glyphs, and enables overlapping single-cell glyph rescaling.
- Standard terminal fonts retain ordinary bold weight and xterm custom box/block glyphs. Switching fonts updates the profile live and refits the terminal.
- Terminal frame batching and the 2 ms isolated-output fast flush are intentionally unchanged in this interval so typography can be evaluated separately from flow timing.
- No network, reconnect, GMCP/MSDP, TinTin execution, Reader, session, mapper, server, version, commit, tag, push, or distribution changes.

## 2026-08-18 — Beta.63b1 Visual Foundations

- Corrected the Global TinTin Startup Profile checkbox so importer grid rules no longer stretch or recenter the checkbox control.
- Kept Affects/Buffs content-sized and top-packed when its dock pane is stretched vertically.
- Reduced permanent pane chrome: tighter panel padding/title spacing and low-profile panel menus that become fully visible on hover, keyboard focus, open state, touch, screen-reader mode, and high contrast.
- Simplified New Session to one direct Name / Role / Create Session / Cancel row; removed the intermediate Create button.
- New-session Create remains disabled until a nonblank name is entered and duplicate display names are rejected case-insensitively in the UI without changing legacy saved-session restore semantics.
- No terminal rendering, network, reconnect, GMCP/MSDP, TinTin execution, mapper, combat, or server behavior changes in this interval.

## 2026-08-05 — Beta.50 Preferences layout and readability

- Replaced the 760-pixel two-column Preferences wall with a responsive 1080-pixel category workspace.
- Added eight accessible category buttons and matching tab panels while retaining every existing control ID and settings path.
- Kept the header and Done button outside the scrolling content area.
- Added roving tab focus, Arrow/Home/End category navigation, hidden-panel focus exclusion, Escape close, and opener focus restoration.
- Increased description width, type size, and line height and explicitly disabled clipping/ellipsis behavior for preference help text.
- Added a smaller-window single-column layout with a horizontal category strip.
- Routed Quick Command customization directly to its category.
- No settings migration, network, terminal, Mapper, Communications, TinTin, command, session, or persistence behavior changes.
- Full verification target: 617 tests before beta.50 is committed or tagged.

## Milestone 2.2b — Authoritative BIGMAP Travel

**Status:** Candidate for `0.3.1-beta.20`.

- The client requests and labels live `Room.Info`, `Char.GPS`, and `NukeFire.Map.Local` data rather than presenting learned topology as equally authoritative.
- BIGMAP rooms use the server's exact terrain color cube and glyph hierarchy. Closed, locked, route, bidirectional, and one-way links remain visible and explicit.
- Pointer hover and keyboard focus expose the same room name, vnum, zone, terrain, `[Fxyz]` color, visit state, GPS state, and exits.
- Selection is independent of hover. Run Here and room double-click start a client route only when both endpoints exist in the current authoritative local snapshot.
- The route engine sends one ordinary direction, waits for the expected Room.Info and refreshed BIGMAP center, then recomputes the remaining path from the new packet.
- No reverse exit is inferred for a one-way link. Closed and locked links are never selected.
- Routing stops on a mismatched room, ten-second confirmation timeout, manual command, explicit Stop, map clear, active-session change, or disconnect.
- A matching server GPS catalog destination can be set before travel; unnamed local rooms remain client-routable without inventing a GPS destination.
- Map clearing supports per-character visit history, current-zone learned rooms, all local learned rooms, and NukeFire's session BIGMAP memory through `map memory clear`.
- Context Deck/NukeFire Actions is renamed and expanded as the NukeFire Console.
- Disconnect uses a branded modal with Escape, focus return, and explicit Stay Connected/Disconnect choices.

### 2.2b acceptance checks

- Refresh the mapper and confirm Room.Info, Char.GPS, and NukeFire.Map.Local requests are issued.
- Compare every terrain tile against terminal BIGMAP colors, including city, forest, water, desert, swamp, tundra, jungle, air, underwater, and swim water.
- Hover rooms with a pointer and focus them from the keyboard; confirm identical details and map-state descriptions.
- Select a nearby room, choose Run Here, and confirm exactly one movement command is sent before the first room is verified.
- Confirm a second direction is sent only after matching Room.Info and BIGMAP center packets arrive.
- Confirm a wrong room, closed/locked link, timeout, manual command, session switch, Stop, clear, or disconnect ends the route.
- Double-click a valid room and confirm it uses the same verified route pipeline.
- Clear each local scope and server session memory; confirm authoritative current rooms repopulate without stale links.
- Open the NukeFire Console and confirm its expanded server-authoritative purpose is clear.
- Open Disconnect, cancel with Escape and Stay Connected, then accept and confirm the terminal records the transition.

## Milestone 2.2a — Client Usability Fine-Tuning

**Status:** Candidate for `0.3.1-beta.19`.

- Port 4000 remains the default for new sessions; the port control is a numeric text field without increment/decrement spinner arrows.
- Sending a server command locally terminates an unterminated prompt line so subsequent output begins on its own line.
- Non-secret commands remain selected in the command bar after sending: Return repeats them and normal typing replaces them.
- Context Deck is presented as NukeFire Actions, with plain-language room, service, zone, and character scope.
- The BIGMAP action can report Activate/Deactivate state when the paired server context update is installed.
- Learned movement no longer invents a reverse exit; current Room.Info and BIGMAP snapshots replace stale exits before explicit links are applied.
- Disconnect asks for confirmation, writes connection transitions into the main terminal, and changes the disconnected command placeholder.

### 2.2a acceptance checks

- Start with no saved settings and confirm port 4000 appears with no arrow spinner.
- Send movement and ordinary commands from a prompt; confirm the next output starts on a fresh line.
- Press Return again to repeat the selected command, then type one character and confirm it replaces the selection.
- Confirm password/remote-echo input is cleared rather than retained.
- Cancel and accept Disconnect; confirm only acceptance disconnects and the terminal reports the transition.
- Compare one-way exits and BIGMAP snapshots against game output; confirm no reverse link is invented.
- Open NukeFire Actions and confirm its purpose and inline-map state are understandable.

## Milestone 2.1c — Identified Item Codex and Complete Results

**Status:** Candidate for `0.3.1-beta.18`.

- Production item visibility follows the `identified_objects` discovery ledger rather
  than requiring a prototype to be loaded at the moment of search.
- Database-free test worlds retain the live-instance fallback.
- Search results page in accessible groups of 18 with a keyboard-reachable Load More
  control and explicit shown-versus-total status.
- Jewel, implant-module, tattoo-ink, and socket-host entries use the server socket
  mappings for family, shape, tier, power, host fit, and exact apply bonus.
- The server remains authoritative; the client does not cache a stale item encyclopedia.

### 2.1c acceptance checks

- Search `helmet` on port 4000 and confirm all identified matching prototypes can be paged.
- Search `module`, `fire`, `spike`, and `melee power`; confirm module fields match identify.
- Open a socketable weapon, armor piece, implant, and tattoo; confirm layouts and bonuses.
- Confirm port 4001 still returns live prototype items without PostgreSQL.
- Confirm screen-reader announcements report loaded and total result counts.

## Milestone 2.1b — NukeFire Knowledge Domains

**Status:** Accepted live on macOS and locked for `0.3.1-beta.17`.

- Command-K opens one modal Knowledge Console with server-side domain filters for
  Help, Items, Commands, Skills/Spells, Zones, or all domains together.
- `NukeFire.Knowledge 2` query and entry packets remain server-authoritative; request
  identifiers prevent older searches from replacing newer results.
- Item results use the live object prototype table and therefore work on the 4001
  test server without SQLite or PostgreSQL.
- Entry cards accept bounded labeled fields, tags, aliases, descriptions, and safe
  related terminal actions, allowing server-side identify-aware improvements without
  requiring another client build.
- The console is keyboard complete, returns focus predictably, and uses restrained
  status announcements rather than a noisy combat live region.
- Client version is `0.3.1-beta.17`; server identify-aware item payload revision
  2.1b.2 is compatible with this same client release.

### 2.1b acceptance checks

- Search Help, Items, Commands, Skills, and Zones independently and through All.
- Open several results rapidly and confirm stale result/entry packets are ignored.
- Search items by VNUM, name, decoded weapon/ammunition data, spell name, and type.
- Confirm Command-K, Escape, arrow keys, Home/End, Enter, and focus return work.
- Confirm screen-reader status identifies result counts, selected entries, and errors.
- Confirm normal terminal commands and safe related actions remain immediate.

## Milestone 2.0b4 — Configurable Client Command Prefix

**Status:** Implemented on the 2.0b3 panel-layout candidate; awaiting the full Mac
verification and live restart check.

- Preferences → Command Input offers `#`, `~`, `^`, and `/`, with `#` retained as the
  migration-safe default for every existing settings file.
- One persisted prefix drives all client-management directives and named session/group
  routing. Ordinary commands beginning with any non-selected symbol pass to NukeFire.
- Doubling the selected symbol sends one literal symbol to the game.
- Prefix changes immediately migrate leading client directives in saved Aliases,
  multi-command Actions, and custom Quick Commands without altering braces, quoted text,
  escaped semicolons, or ordinary symbols inside command arguments.
- The preference is keyboard reachable, labelled, reflected in live examples, and
  announced without adding terminal or combat live-region noise.
- Settings schema 23; client `0.3.1-beta.15`; verification target 287 tests.

### 2.0b4 acceptance checks

- Select each prefix, restart, and confirm the choice remains active.
- Define and use `<prefix>alias`, `<prefix>variable`, `<prefix>action`, and
  `<prefix>gag` commands.
- Route `<prefix>all score` and `<prefix>Shai heal Caul` across sessions.
- Confirm two selected symbols send one literal symbol to NukeFire.
- Change prefixes with routed Aliases, Actions, and custom Quick Commands already saved;
  confirm they continue to target the same client pipeline.
- Confirm the previous symbol becomes an ordinary game command after the change.

## Milestone 2.0b3 — Drag-and-Drop Panel Layout

**Status:** Implemented on the accepted beta.14 client; awaiting full Mac verification
and live pointer testing.

- Every panel title bar is a pointer drag source. Tabs are independently draggable.
- Edge drops reorder whole panel groups; center drops create or join tab groups.
- Labeled left, right, and lower dock targets appear during a drag, including when a
  destination dock is currently empty.
- The terminal DOM, output scroll position, and command pipeline are preserved while
  panel DOM nodes are reparented through the established workspace renderer.
- Existing menu actions remain the keyboard-complete alternative and persist the exact
  same layout metadata.
- Dock/tab data transformations are isolated in `src/panel-drag-layout.js`, while the
  renderer owns only pointer intent, visual drop feedback, announcements, and persistence.
- No settings migration is required.

### 2.0b3 acceptance checks

- Drag a standalone panel into each dock and confirm it survives restart.
- Drop on the upper/lower edge of a side-dock panel to reorder it; use left/right edges
  in the lower dock.
- Drop in the center of another panel to create tabs, then drag the tabs to reorder them.
- Drag the first/identifier tab out of a group and confirm the remaining tabs stay valid.
- Confirm terminal scrollback, active sessions, commands, and screen-reader menu access
  are unchanged.

## Milestone 2.0a3 — xterm Live Layout and Color Parity

**Status:** Implemented; awaiting the full Mac run and live comparison.

- Pins toolbar, Find, terminal output, and command input to explicit grid rows.
- xterm fills the flexible terminal row even while Find is hidden.
- Live visible text uses the original gag-filtered SGR stream; non-SGR terminal controls are removed.
- Stored-run restoration emits exact truecolor values for parity with the NukeFire renderer.

## Milestone 2.0a1 — Experimental xterm.js Visual Terminal

**Status:** Implemented behind a persistent experimental preference; awaiting the full
255-test Mac run and live accessibility/performance comparison.

- xterm.js is a visual engine only; NukeFire parsing and stored runs remain authoritative.
- Fit, Search, and Serialize addons are loaded from exact production dependencies.
- The original renderer remains the default and is restored automatically on failure.
- Ordered adapter operations prevent delayed writes from contaminating another session.
- Settings schema 20 stores `display.terminalEngine`.

# NukeFire Client Project Ledger

## Beta 10 Hotfix — Repeat Last Command Preference

**Status:** Implemented; awaiting live macOS verification.

- Preferences now includes a Command Input section.
- “Repeat last command with Enter” is persistent and defaults off.
- Empty Enter repeats only the most recent non-empty command when enabled.
- Password/secure-input mode always sends the typed blank input instead of history.
- Turning the option off preserves blank-Enter pager continuation.


This ledger records the state of the project at every interval. Git commits and tags provide the actual rollback points; this file explains what each point means.

## Milestone 1 — Base Connection

**Status:** Working on macOS and confirmed by the user.

**Recommended tag:** `milestone-1-base-connection`

### Working features

- Electron desktop application launches on macOS.
- Direct TCP connection to `tdome.nukefire.org:4000`.
- Streaming Telnet parser.
- Telnet ECHO, SGA, terminal type, NAWS, and GMCP negotiation.
- MCCP safely declined.
- ANSI standard, bright, 256-color, and true-color rendering.
- UTF-8-safe streaming.
- Hidden password entry during remote echo.
- Command history with Up and Down.
- Scrollback, selection, find, font sizing, and compact output.
- Basic GMCP vitals plus fallback prompt parsing.
- Secure Electron renderer boundary.

### Known foundational issues

1. Pressing Enter should return scrollback to the live bottom.
2. Blank Enter is currently discarded, so NukeFire pagination does not advance.
3. Telnet GA/EOR behavior should be captured and tested to determine whether it affects prompt and pagination boundaries.

## Milestone 1.1 — Terminal Input and Scroll Foundation

**Status:** Terminal behavior verified live on macOS/NukeFire; accessibility foundation remains under continuing review.

### Interval 1.1a — Blank Enter and Scroll Snap

**Status:** Verified live.

- Blank Enter is no longer discarded by the renderer.
- Enter always snaps output to the live bottom before sending.
- Blank commands remain excluded from command history.
- Renderer regression coverage verifies blank Enter, scroll snapping, and history behavior.

### Interval 1.1b — GA/EOR Prompt Boundaries

**Status:** Verified live.

- Telnet GA and EOR commands are captured as prompt-boundary events.
- Server-side EOR delivery is negotiated while client-side EOR transmission is declined.
- Prompt boundaries are forwarded through the secure Electron IPC bridge.
- The Protocol panel reports the latest boundary type and running count.
- Parser and renderer regression coverage protect the behavior.
- GA/EOR framing is diagnostic groundwork; blank Enter remains the pagination fix.



### Interval 1.1c — Accessibility Foundation

**Status:** Implemented in source; awaiting live VoiceOver/macOS confirmation.

- Added keyboard skip links to command input and game output.
- Kept the full terminal stream out of automatic live-region announcements.
- Added a controlled polite announcer for requested summaries and important errors.
- Added on-demand Read Last Line and Read Vitals commands.
- Added keyboard and menu commands for focusing command input and reviewing output.
- Added progress-bar semantics and numeric descriptions for health, mana, and movement.
- Added persistent screen-reader mode and important-announcement preferences.
- Added reduced-motion behavior and stronger keyboard focus indicators.
- Added `docs/ACCESSIBILITY.md` and made accessibility part of milestone completion.
- Added renderer regression coverage for focus stability, accessible vitals, and announcement behavior.

### Interval 1.1d — Prompt Line Separation

**Status:** Verified live.

- Blank Enter now terminates an unterminated local prompt line before sending.
- Repeated blank Enter no longer concatenates NukeFire prompts on one display line.
- The line break is display-only; NukeFire still receives exactly one empty command.
- Reader/plain-text state receives the same boundary as the visual terminal.
- Added regression coverage for consecutive prompt rendering.
- Added the missing `docs/ACCESSIBILITY.md` foundation document to the full source baseline.

### Scope

- Send blank commands when Enter is pressed.
- Snap output to bottom whenever Enter sends input.
- Preserve nonblank command history behavior.
- Keep blank commands out of history.
- Confirm GA/EOR behavior against the live NukeFire server.
- Confirm blank Enter and scroll snapping on macOS.

### Acceptance checks

- At a NukeFire pagination prompt, pressing Enter advances one page.
- While scrolled upward, pressing Enter returns to current output.
- Ordinary commands still send exactly once.
- Password input still remains hidden.
- `npm run verify` passes.
- Incoming output does not steal command focus.
- VoiceOver can review output without automatic combat flooding.
- Last-line and vitals summaries are available on demand.

## Milestone 1.2 — NukeFire Protocol and Structured State

**Status:** In progress on branch `milestone-1.2-protocol-core`.

### Interval 1.2a — NukeFire Telnet Core

**Status:** Verified by automated tests and live NukeFire use.

- Separated local and remote Telnet option state.
- Suppressed duplicate negotiation replies and repeated refusals.
- Added NukeFire TTYPE cycling: client name, terminal type, then MTTS.
- Added UTF-8 CHARSET acceptance.
- Added dynamic NAWS parser support.
- Kept GA as NukeFire's authoritative prompt boundary while retaining EOR
  compatibility.
- Added bounded subnegotiation and malformed-protocol recovery.
- Kept MCCP deliberately declined.
- Restored command-input focus after quick-command buttons.

### Interval 1.2b — NukeFire Structured State

**Status:** Verified by automated tests and live macOS/NukeFire use.

- Added `src/gmcp-store.js` as the canonical structured state source.
- Normalizes package names case-insensitively, including `group` and
  `group.remove`.
- Stores character vitals/status/max stats/GPS/target affects, room info,
  channel data, and group state.
- Uses NukeFire's actual `mhp`, `mmana`, and `mmove` fields.
- Requests initial supported state immediately after GMCP negotiation.
- Measures visible terminal rows and columns and sends dynamic NAWS updates.
- Sends screen-reader preference before connection so MTTS advertises the
  correct capability bit.
- Shows live Character, Room, Group, TTYPE, CHARSET, NAWS, GMCP, and prompt
  diagnostics without turning the terminal into an automatic live region.
- Adds dedicated parser, store, connection, and renderer regression coverage.

### 1.2b acceptance checks

- `npm run verify` passes.
- Login remains normal and password input remains hidden.
- Protocol panel reaches UTF-8, a TTYPE/MTTS value, and a measured window size.
- Character, room, and group state populate after login/movement/group changes.
- Health, mana, and movement maxima reflect `mhp`, `mmana`, and `mmove`.
- Resizing the window or changing text size updates the measured NAWS display.
- Screen-reader mode enabled before connection yields `MTTS 333`; ordinary mode
  yields `MTTS 269`.
- Blank Enter still advances paginated output.
- Quick-command buttons return focus to command input.


### Interval 1.2c — Terminal Themes

**Status:** Automated-test verified; awaiting live macOS confirmation.

- Added NukeFire, Amber CRT, Green CRT, Ice Blue, and Custom terminal themes.
- Added independent foreground and background color controls.
- Added optional monochrome mode for a true one-color terminal appearance.
- Preserves NukeFire ANSI colors when monochrome mode is disabled.
- Applies the selected colors to output, command input, caret, and terminal background.
- Persists the theme and custom colors across application restarts.
- Reports the current contrast ratio and warns below 4.5:1.
- Keeps the terminal color choice independent from screen-reader mode.

### 1.2c acceptance checks

- Amber CRT immediately changes output and input to amber on black.
- Monochrome mode overrides existing and incoming ANSI colors.
- Disabling monochrome restores NukeFire's normal ANSI colors.
- Custom foreground and background colors update immediately.
- Theme choice survives a complete client restart.
- Blank Enter, quick-command focus, dynamic NAWS, and structured state remain intact.
- `npm run verify` passes.


## Milestone 1.3 — Settings Foundation v2

**Status:** Rebuilt in small, isolated intervals from the confirmed-good 1.2c baseline.

### Interval 1.3a — Persistence Only

**Status:** Verified by automated tests and live macOS restart/use.

- Added a main-process `SettingsStore` with schema version 1.
- Migrates current host, port, follow-output, compact-output, font, theme, and
  accessibility values from renderer `localStorage` on first launch.
- Uses validated defaults when a legacy value is absent; missing values never
  disable Follow Output or important announcements.
- Saves through a temporary file and atomic rename.
- Keeps the previous valid settings as `settings.json.bak`.
- Recovers automatically from a missing or damaged primary file when the backup
  is valid.
- Keeps `localStorage` as a compatibility fallback during this interval.
- Does not alter the terminal DOM, sidebar structure, CSS grid, output scrolling,
  command pipeline, or panel visibility.

### 1.3a acceptance checks

- Existing Amber/custom theme survives a full application restart.
- Host, port, font size, Follow Output, Compact Output, and accessibility choices
  survive a full application restart.
- `who`, `look`, pagination, blank Enter, and live output scrolling behave exactly
  as they did at the confirmed-good 1.2c tag.
- A `settings.json` file appears under Electron's NukeFire Client user-data folder.
- A second saved change creates or refreshes `settings.json.bak`.
- `npm run verify` passes.


### Interval 1.3b — Preferences UI Only

**Status:** Automated-test verified; awaiting live macOS confirmation.

- Removed display and accessibility controls from the permanent sidebar.
- Added a Preferences gear in the connection bar and Command-comma shortcut.
- Added the native application-menu Preferences command through the existing
  isolated preload bridge.
- Added an accessible modal dialog with Escape closing, keyboard focus
  containment, and focus restoration to the invoking control.
- Moved Clear Output to the terminal toolbar because it is an immediate action,
  not a saved preference.
- Reuses the verified 1.3a settings service and existing control IDs/event
  handlers.
- Does not alter the terminal shell structure, output element, command input,
  CSS grid sizing, scrolling logic, Telnet, GMCP, or settings schema.

### 1.3b acceptance checks

- Gear and Command-comma open Preferences.
- Done, Escape, and clicking the backdrop close Preferences and restore focus.
- Theme, font, Follow Output, Compact Output, and accessibility choices still
  apply immediately and survive a complete restart.
- The sidebar contains gameplay/status panels rather than permanent color controls.
- `who`, `look`, pagination, blank Enter, and live output scrolling match 1.3a.
- `npm run verify` passes.


## Deferred roadmap

The following are deliberately deferred until Milestone 1.2 is stable:

- Character profiles
- Aliases
- Triggers/actions
- Timers
- Advanced command-line behavior
- Channel windows
- Advanced group and target panels
- Clickable exits
- `runinfo`, `upgrade`, `buffinfo`, and `huntme` panels
- Beginner-friendly command panel

## 2026-07-19 — Milestone 1.3c Workspace Metadata

- Built from the user-confirmed Milestone 1.3b Preferences UI baseline.
- Added visibility metadata for the four existing sidebar panels.
- Saved a default panel set before character identification and a separate override per GMCP character.
- Added a reset-to-built-in-panels action.
- Deliberately did not alter the terminal grid, output following, paging, command flow, Telnet negotiation, or GMCP transport.
- Docking, resizing, tab groups, and pop-out windows remain deferred to Milestone 1.4.

## Milestone 1.4 — Customizable Panels

### Interval 1.4a — Docking Foundation

**Status:** Verified by automated tests and live macOS/NukeFire use.

- Added left, right, and lower panel docks around the existing terminal shell.
- The initial layout remains identical to 1.3c: all four built-in panels are in the left dock.
- Added title-bar option menus to Vitals, Quick Commands, NukeFire State, and Protocol.
- Menus support Move Left, Move Right, Move Below, Move Earlier, Move Later, and Hide Panel.
- Menus are complete from the keyboard with Arrow keys, Home, End, Escape, and ordinary Tab behavior.
- Empty dock regions collapse automatically.
- Panel location and order save to the default workspace before login and to the identified character after GMCP login.
- Settings schema 3 normalizes unknown regions and duplicate or invalid order values safely.
- Restore Default Layout returns every panel to the left dock without changing visibility.
- The terminal output node, command input node, scroll code, blank-Enter pagination, Telnet parser, and GMCP transport were not rewritten.

### 1.4a acceptance checks

- `npm run verify` passes.
- The initial client appearance and terminal scrolling remain equivalent to 1.3c.
- `who`, `look`, and paginated help remain current and complete.
- Every panel can move left, right, or below through its title-bar menu.
- Panel order can be changed without mouse dragging.
- Empty dock regions disappear and return their space to the terminal.
- Layout changes survive restart.
- Prime and another character can retain different panel layouts.
- Restore Default Layout returns all panels to the left dock.
- VoiceOver can open, navigate, activate, and dismiss every panel menu.

### Interval 1.4b — Resizable Dock Regions

**Status:** Verified by automated tests and live macOS/NukeFire use.

- Added pointer-resizable separators for the left, right, and lower dock regions.
- Left and right docks resize horizontally; the lower dock resizes vertically.
- Separators expose keyboard-complete `role=separator` semantics with current, minimum, and maximum values.
- Arrow keys resize in 10-pixel steps; Shift plus Arrow uses 30-pixel steps.
- Home selects the minimum size, End selects the largest size that still preserves the terminal, and double-click restores the built-in size.
- The layout engine retains at least 420 pixels of terminal width and 220 pixels of terminal height whenever the application window permits those minimums.
- Desired sizes are normalized to safe limits and adjusted temporarily when a window is too small; widening the window can restore the saved desired proportions.
- Dock sizes save to the default workspace before character identification and separately per character after GMCP identification.
- Settings schema 4 migrates schema 3 workspaces with default left 240, right 240, and lower 190 pixel sizes.
- Restore Default Layout now restores panel region/order and the three dock sizes.
- The terminal output node, command input node, output-follow code, blank-Enter paging, Telnet parser, and GMCP transport were not rewritten.

### 1.4b acceptance checks

- `npm run verify` passes all 61 tests.
- `who`, `look`, and paginated help continue to remain current and complete.
- Dragging the left or right separator changes the space available to the game terminal without replacing or clearing it.
- Dragging the lower separator changes its height without disturbing the command input.
- Every separator works with keyboard arrows, Shift plus Arrow, Home, End, and double-click reset.
- The terminal retains a usable minimum size at the application’s minimum window dimensions.
- Dock dimensions survive restart.
- Prime and another character can retain different dock dimensions.
- Resizing does not change output scroll position or command focus unexpectedly.
- VoiceOver can identify each separator, its orientation, and its current value.
### Interval 1.4c — Tab Groups

**Status:** Automated-test verified; awaiting live macOS/NukeFire confirmation.

- Added optional tab groups within each existing dock region.
- Panel menus can join the previous or next panel as tabs or separate the panel again.
- Tab lists expose `role=tablist`, `role=tab`, and `role=tabpanel` semantics.
- Arrow keys, Home, and End move and activate tabs without requiring a mouse.
- Active-tab selection and group membership save to the default workspace before login and separately per GMCP character after identification.
- Settings schema 5 migrates schema 4 layouts to independent one-panel groups without changing their region, order, visibility, or dock size.
- Moving a panel to a different dock separates it from its old group to avoid cross-region tab corruption.
- Restore Default Layout restores the original four independent panels and default dock sizes.
- The terminal output node, command input node, output-follow code, blank-Enter paging, Telnet parser, and GMCP transport were not rewritten.

### 1.4c acceptance checks

- `npm run verify` passes all 68 tests.
- The initial client appearance remains equivalent to 1.4b because no panels begin grouped.
- `who`, `look`, and paginated help remain current and complete.
- Any panel can join the previous or next panel in the same dock as a tab.
- Tabs can be selected with a pointer or with Arrow keys, Home, and End.
- A panel can be separated from its group without losing its content or settings.
- Tab groups and selected tabs survive restart.
- Prime and another character can retain different tab groups and selected tabs.
- Moving a grouped panel to another dock separates it safely.
- VoiceOver announces tab names, selected state, and associated panel content.



## Milestone 1.5 — Communications and Native Panel Windows

### Interval 1.5a — Communications Panel

**Status:** Automated-test verified; awaiting live macOS/NukeFire confirmation.

- Added Communications as a fifth panel using the existing visibility, docking, resizing, and tab-group system.
- Communications begins in the lower dock with All, Gossip, Newbie, Group, Tell, Auction, and System filters.
- Messages remain in the complete main terminal stream; the panel receives a separate structured copy.
- `Comm.Channel` and `NukeFire.Comms.Message` GMCP packets provide exact channel, sender, text, and timestamp data.
- A bounded, split-safe text classifier recognizes only familiar channel forms when structured GMCP is unavailable. Unknown lines are never moved into Communications.
- Added timestamps, unread counts, search, clear, and a 500-message in-memory limit.
- Channel filter tabs support pointer activation plus Arrow keys, Home, End, and standard Tab navigation.
- The message log uses `aria-live=off`, so incoming chat does not automatically flood VoiceOver.
- The selected channel filter saves before login as a default and separately per GMCP-identified character.
- Settings schema 6 adds the Communications panel and selected-filter metadata while preserving older layouts.
- The terminal output node, command input, scrolling, pagination, Telnet parser, and existing GMCP transport were not replaced.

### 1.5a acceptance checks

- `npm run verify` passes all 77 tests.
- `who`, `look`, ordinary combat, and paginated help remain complete in the main terminal.
- Gossip, Newbie, Group, Tell, Auction, and strict System lines appear in Communications when recognized.
- Ordinary room and combat lines are not misclassified.
- Structured GMCP messages show channel, sender, text, and timestamp.
- Filters, search, clear, unread counts, and keyboard tab navigation work without stealing command focus.
- Communications can move, hide, tab, and resize through the existing panel framework.
- The selected filter survives restart and may differ per character.
- VoiceOver can review the message list deliberately without automatic incoming-message announcements.

## Milestone 1.5b

Added the first native pop-out panel host for Communications with remembered per-character bounds and safe monitor recovery.


## Interval 1.6a — Persistent Mapper Foundation

**Status:** Automated-test verified; ready for live macOS/NukeFire travel testing.

- Added a sixth panel, Mapper, initially docked on the right.
- Added a platform-neutral `MapperGraph` core with direction normalization, room sanitization, coordinates, exits, per-character visitation, and map view state.
- Added main-process `MapStore` persistence in `map.json`, using atomic temporary-file replacement and `map.json.bak` recovery.
- The renderer records only pure `n/e/s/w/u/d` or full-direction commands as pending movement. A link is created only after GMCP reports a different room within the guarded transition window.
- Same-room GMCP refreshes do not consume a pending move. Unconfirmed room changes begin separate components and do not create false links.
- Added an SVG map with current-room highlighting, known links, room labels, vnums, up/down markers, pan, zoom, center, room selection, and textual exit details.
- Added keyboard map operation: arrows pan, Shift+arrows pan farther, plus/minus zoom, C or Home centers, and Enter/Space selects a focused room.
- Added a deliberate screen-reader summary of the selected room and known exits without using an automatic live map stream.
- The room graph is shared across characters; visited rooms, current room, selected room, zoom, and pan are character-specific.
- Added Mapper to existing visibility, docking, resizing, and tab-group persistence under settings schema 8.
- No terminal output node, command input node, scroll-follow code, pager behavior, Communications path, Telnet parser, or GMCP transport was replaced.

### 1.6a acceptance checks

- `npm run verify` passes all 100 tests.
- `who`, `look`, and paginated help remain complete and current.
- Entering a direction and arriving in a new GMCP room creates one correct link.
- A blocked direction does not create a room or exit.
- Recall, portals, transfers, and teleports do not create false directional links.
- Mapper survives restart through `map.json`.
- Prime and another character share discovered rooms but retain separate visited counts and map view state.
- Mapper can move, resize, hide, and join tab groups without replacing the terminal.
- Keyboard and VoiceOver users can identify the current room and review known exits.


## Milestone 1.6b — NukeFire Live Cartography

**Status:** Client implementation verified by 104 automated tests; server patch requires compilation and live NukeFire validation.

- Compact empty square room nodes.
- `NukeFire.Map.Local` GMCP transport.
- BIGMAP-authoritative local coordinates and topology.
- GPS route/destination overlays.
- Persistent client map merge with Room.Info fallback.


## Milestone 1.6c — Terrain-Colored Cartography

**Status:** Automated-test verified; ready for live visual confirmation.

- Room nodes remain compact, empty 16-pixel squares.
- BIGMAP/GMCP terrain strings choose a stable dark-theme fill and companion border color.
- Current room, selected room, GPS route, and destination remain recognizable through thicker state-specific outlines and glow rather than replacing the terrain fill.
- Terrain aliases cover the stock NukeFire sector names plus common custom names such as wasteland, swamp, ice, lava, road, and atmosphere.
- Unknown terrain uses the existing neutral mapper appearance.
- Terrain remains written in the details panel and is included in keyboard/screen-reader labels, avoiding color-only information.
- No settings schema, persistent-map schema, terminal behavior, command path, Communications behavior, Telnet behavior, or server packet format changed.

### 1.6c acceptance checks

- `npm run verify` passes.
- City, forest, field, water, mountain, space, desert, and other terrain rooms use visibly different fills.
- Current, selected, route, and destination squares retain their terrain color and remain clearly outlined.
- Room squares contain no text or vnums.
- Selecting a room still shows the exact terrain name in the details panel.
- VoiceOver identifies the selected or focused room's terrain.


## Milestone 1.6c1 — Direct SVG Terrain Colors

**Status:** Compatibility correction for live terrain rendering.

- Terrain colors are written as literal SVG `fill` and `stroke` attributes.
- This avoids environments where CSS custom properties do not reliably resolve inside SVG presentation properties.
- State-specific outlines still override the terrain border through normal CSS specificity.
- Room nodes remain empty squares and all textual information remains in the details panel.


## Milestone 1.6d — Searchable GPS Navigator

**Status:** Client implementation and automated tests complete; server catalog transport requires live compilation and validation.

- Mapper now contains a native search field, grouped destination dropdown, Set GPS, Clear GPS, and Reload List controls.
- The catalog is authoritative server data sourced from `gps.c`; the client does not maintain a duplicate destination list.
- Destination selection sends the normal numeric `gps set` command, preserving all existing validation, routing, messages, and gameplay restrictions.
- Server catalog packets are chunked as Begin, Page, and End messages to remain safely below the GMCP frame limit.
- Search includes name, code, room, zone, category, difficulty, aliases, and tags.
- Native labels, select groups, status text, and keyboard behavior keep the navigator screen-reader friendly.
- Existing map geometry, terrain coloring, terminal behavior, Communications, and persistent settings remain unchanged.

### 1.6d acceptance checks

- `npm run verify` passes all tests.
- Reconnecting after the server update loads the GPS catalog automatically.
- Filtering for `remort`, `forge`, `newbie`, a zone number, or a GPS code yields the expected destinations.
- Setting a destination activates the existing server GPS route and map overlay.
- Clear GPS removes only the active destination.
- Older servers leave the navigator waiting but do not affect terminal or mapper operation.

## Milestone 1.7 — NukeFire Context Deck

**Status:** Client automated-test verified against the exact live-confirmed 1.6d source; server integration supplied for live NukeFire compilation and testing.

- Added Context Deck as a seventh panel, initially placed in the right dock ahead of Mapper.
- Added `src/context-deck.js` as the bounded validation and command-building core for `NukeFire.Context`.
- The client advertises `NukeFire.Context 1`, requests an initial snapshot, stores the canonical packet in `GmcpStore`, and can request a manual refresh.
- Context cards contain server-authored titles, summaries, status rows, actions, argument definitions, availability, disabled reasons, and confirmation text.
- Buttons and forms send ordinary game commands through the same established command pipeline and then return focus to the command input.
- The server remains authoritative: client controls do not calculate remort eligibility, class unlocks, service costs, SSF validity, storage validity, or route state.
- Initial server contexts cover Remorter, Longwalker, Chromatic Ink-Master, Packrat Storage Facility, Packrat recall access, Zone Intelligence, Wasteland Prospector, and active mine status.
- Remort, longwalk, and laser-ink removal actions require explicit confirmation.
- Context content is sanitized, bounded, rendered with DOM APIs rather than `innerHTML`, and stored only as current session state.
- Settings schema 9 adds Context Deck visibility, dock location, order, tab membership, and selected-tab defaults.
- The terminal output node, command input node, scroll-following behavior, blank-Enter pagination, Telnet parser, ANSI parser, Communications, BIGMAP, GPS Navigator, and map persistence were not replaced.

### 1.7 acceptance checks

- `npm run verify` passes all 113 tests.
- Connecting to a server advertising `NukeFire.Context` populates the Context Deck automatically.
- Moving between ordinary rooms and supported service rooms replaces the cards without adding text to the terminal.
- Every action is reachable by keyboard and returns command focus after sending.
- Disabled actions expose a textual reason rather than relying on appearance.
- Destructive actions require confirmation before the ordinary command is sent.
- Refresh requests `NukeFire.Context` without reconnecting.
- Older servers leave the panel in a waiting state without affecting terminal, mapper, GPS, or Communications behavior.
- VoiceOver can deliberately review each card, status row, field, and action without an incoming-message flood.

## Milestone 1.7a — Open-Ended Number Validation Fix

**Status:** Client regression fixed and verified; no server update required.

- Corrected `normalizeArgument()` so absent `min` or `max` values remain `null` rather than becoming zero during repeated normalization.
- This restores positive values for minimum-only fields, including the Remorter character ID and Packrat retrieval slot.
- The client still validates whole numbers and any explicit server-provided bounds before constructing an ordinary NukeFire command.
- Added a regression proving IDNUM `1893` sends `buy 1893` and an open-ended Packrat slot remains valid.
- No Context packet format, server eligibility rule, settings schema, panel layout, terminal path, mapper, GPS, or Communications behavior changed.

### 1.7a acceptance checks

- `npm run verify` passes all 114 tests.
- Entering `1893` in Complete Remort sends `buy 1893` after confirmation.
- Minimum-only positive number fields no longer report an accidental maximum of zero.
- Explicit maximums, such as ink channel limits, remain enforced.

## Milestone 1.7b — Large-Screen Dock Expansion

**Status:** Client-only workspace correction; automated-test verified.

- Side docks now preserve preferred widths up to 4096 pixels instead of stopping at 480 pixels.
- The lower dock now preserves preferred heights up to 2160 pixels instead of stopping at 400 pixels.
- Runtime sizing still uses the actual window and keeps the terminal at least 420 pixels wide and 220 pixels high.
- When both side docks are visible, available space is still shared safely rather than covering or replacing the terminal.
- Saved large-screen sizes are fitted temporarily on smaller monitors without discarding the stored preference.
- Pointer resizing, arrow-key resizing, Home for minimum, End for current-screen maximum, VoiceOver separator values, per-character persistence, and reset behavior remain intact.

### 1.7b acceptance checks

- `npm run verify` passes all 115 tests.
- On a 4K-width workspace, a side dock can grow beyond 2000 pixels.
- On a smaller window, the dock stops before reducing the terminal below its minimum usable area.
- Returning to a larger window restores access to the larger saved preference.
- The Mapper can use the expanded right or left dock without changing BIGMAP, GPS, or map persistence behavior.

## Milestone 1.7c — Resizable Mapper Canvas

**Status:** Client-only mapper presentation enhancement; automated-test verified.

- The mapper canvas now defaults to 360 pixels high instead of remaining near its original 240-pixel basis.
- A visible, keyboard-accessible horizontal separator below the map adjusts the map height from 220 to 1600 pixels.
- Pointer drag, Arrow keys, Shift-Arrow larger steps, Home, End, and double-click reset are supported.
- The chosen height is part of each character's existing map view state and is written atomically to `map.json`.
- Large map heights scroll naturally inside the dock and do not reduce the terminal's protected minimum size.
- Map geometry, panning, zooming, terrain, GPS routes, room details, Context Deck, and server protocol behavior remain unchanged.

### 1.7c acceptance checks

- `npm run verify` passes all tests.
- The map starts at 360 pixels high on a new character.
- Dragging the handle downward makes the map substantially taller.
- Keyboard resizing updates the separator's spoken pixel value.
- Reopening the client restores the selected height for that character.
- Values below 220 or above 1600 are clamped safely.


## Milestone 1.7c1 — Mapper Live-Update Reliability

**Status:** Client-only corrective checkpoint; automated-test verified.

- The renderer previously treated the response from `saveMap()` as fresh live state and rebuilt the active graph from it.
- A room or BIGMAP update could arrive while the main process was writing the older snapshot. When that save completed, it could overwrite the newer in-memory graph.
- Persistence responses are now acknowledgements only. `Room.Info` and `NukeFire.Map.Local` remain authoritative for the running client.
- The map still saves atomically, but asynchronous disk writes cannot roll back current position, visited rooms, links, GPS overlays, or canvas-height state.
- Pointer-capture cleanup is guarded so releasing an already-lost capture cannot interrupt resize completion.

### 1.7c1 acceptance checks

- `npm run verify` passes all tests.
- Resize the map, move before the delayed save returns, and verify every room remains in the graph.
- Current room and selected-room markers continue updating after pointer and keyboard resizing.
- No server or GMCP changes are required.


## Milestone 1.8a — AFX Text List Correction

**Status:** Client-only corrective checkpoint.

- Corrected the Affects panel's Text List action to send the live NukeFire command `afx`.
- Preserved the normal command pipeline and focus return behavior.
- Added a regression assertion for the exact outbound command.
- No server or GMCP changes are required.

## Milestone 1.8 — Efficient Player Affects

**Status:** Client implementation and server integration prepared for live CPU/behavior testing.

- Added a dockable Affects panel and settings schema 10.
- Added bounded `NukeFire.Affects` storage, grouping, refresh, and ordinary `afx` text-command fallback.
- Countdown labels advance locally from `server_time` and `expire_at`; the server does not send one packet per second.
- The renderer updates only duration text nodes during countdowns and stops its timer when the panel or application is not visible.
- Incoming snapshots rerender only when the server revision changes.
- The server integration is dirty-driven and rate-limited: Master Modifier mutations set one flag, while clean characters incur no affect-list walk.
- Live packets include timed effects and spell/other permanent states, while permanent gear/bodywork/remort modifier rows are counted but omitted.
- Automatic screen-reader announcements are intentionally suppressed during affect churn.
- Added the planned NukeFire Wasteland HUD identity pass to the roadmap without beginning visual replacement work.
- Full client verification passes 125 tests.


## Milestone 1.9a — Multi-Session Core

**Status:** Client implementation complete and automated-test verified.

- Replaced the single global connection owner with a main-process `SessionManager`.
- Each session has an independent connection, Telnet state, GMCP store, command
  queue, output, ANSI state, history, vitals, Communications, Affects, Context
  Deck state, and mapper movement confirmation.
- Added accessible session tabs with status, role, unread count, Arrow/Home/End
  navigation, New Session, Close Session, and active-role controls.
- Added direct commands: `#session`, `#session add`, `#session close`,
  `#name command`, `#all command`, `#group`, `#leader`, `#role`, and
  `#followers command`. `##command` sends a literal leading `#` to the MUD.
- Session definitions and group membership are normalized and atomically saved in
  settings schema 11. Saved sessions are restored disconnected; passwords are not
  stored and sessions never auto-connect.
- Per-session queues are bounded to 100 pending commands and paced at 80 ms by
  default. Incoming state is event-driven; there is no cross-session polling loop.
- Legacy `mud:*` IPC remains temporarily available for older tests and rollback
  compatibility, but the production renderer uses the explicit `sessions:*` bridge.
- The terminal DOM identity, blank-Enter behavior, output following, GA/EOR,
  mapper-save reliability, Affects CPU strategy, and Electron sandbox remain intact.

### 1.9a acceptance checks

- `npm run verify` passes all automated tests.
- Two connected characters may receive output simultaneously without mixing their
  terminal buffers, histories, vitals, Communications, or GMCP panels.
- `#healer heal Caul` addresses only the healer session without changing tabs.
- `#all score` routes through each connected session's bounded command queue.
- A named crew with a tank leader makes `#followers assist target` exclude the tank.
- Switching tabs restores the selected session and clears only its output-unread badge.
- Session tabs and creation controls are keyboard operable and do not auto-announce
  incoming combat streams.
- Restarting restores session names, roles, hosts, ports, groups, and active tab,
  but does not auto-connect or retain credentials.

### Deferred from 1.9a

- Alias expansion and variables: 1.9b.
- Text and GMCP actions: 1.9c and 1.9d.
- Wasteland HUD branding and logo pass: still planned after the automation foundation.

## Milestone 1.9b0 — Alias Engine Foundation

**Status:** Text-engine foundation implemented and full automated-test verified.

- Added `src/client-command-parser.js` as the shared pure home for the accepted
  brace-aware tokenizer and client-directive parser. `session-manager.js` continues
  to re-export both helpers for compatibility.
- Added `src/alias-engine.js` with no Electron, DOM, renderer, connection, timer, or
  settings dependencies.
- Alias names are normalized case-insensitively and may contain letters, numbers,
  underscores, and hyphens. Definitions are global and in-memory for this interval.
- Added `#alias`, `#alias list`, `#alias show {name}`,
  `#alias {name} {one command}`, and `#alias delete {name}`.
- `%0` expands to all brace-aware arguments; `%1` through `%9` expand to individual
  arguments. Missing positions become empty strings.
- Alias chains resolve before delivery. Direct loops, indirect loops, and chains
  beyond 16 expansions stop with a plain-text error and send no command.
- A completed expansion returns to `SessionManager` rather than touching a socket.
  Named sessions, `#all`, groups, and `#followers` therefore retain the existing
  bounded and paced per-session queue behavior.
- The interval deliberately does not interpret semicolons or produce multiple
  commands. One alias invocation yields at most one routed command.
- No renderer, preload, IPC, connection, Telnet, GMCP, GPS, mapper, Affects,
  Communications, Context Deck, session-runtime, settings-schema, password, or
  auto-connect behavior changed.

### 1.9b0 acceptance checks

- The pre-change baseline is commit `a9a98c58f185bd194b56b02642701135459d289d`
  with 138 passing tests.
- `#alias {ga} {#followers assist %1}` followed by `ga mutant` routes only to the
  existing follower recipients.
- `#alias {crewheal} {#Shai heal %1}` followed by `crewheal Caul` queues only
  `heal Caul` for Shai.
- `#alias {movecrew} {#crew %0}` followed by `movecrew north` queues `north` for
  every connected member of crew.
- Listing is deterministic and plain text, and show/delete report unknown aliases
  without sending anything to the MUD.
- Direct and indirect recursive aliases stop before queue delivery.
- Blank Enter still queues an empty command and `##help` still queues literal
  `#help` for the source session.
- Full reconstructed-baseline `npm run verify` passes 149 tests. The guarded
  installer repeats the complete suite on the authoritative repository and restores
  every target file if verification fails.

### Deferred from 1.9b0

- Atomic persistence and backup recovery.
- Global/group/session scope selection and precedence.
- Enable/disable controls and debug/preview output.
- Variables, import/export, and multi-command expansion.
- Accessible alias GUI after the text engine is accepted.
- Actions and triggers remain outside Milestone 1.9b.

## Milestone 1.9b0c1 — Communications Legacy Color Cleanup

**Status:** Focused client-side normalization fix; full automated-test verified.

- `NukeFire.Comms.Message` may provide a colorized NPC name in its structured
  `sender` field using NukeFire's legacy literal-TAB color language.
- Added a Communications-only sanitizer for short codes such as TAB+, two-letter
  codes such as TABpa, reset TABn, and bracketed codes such as TAB[F055].
- The sanitizer runs before plain sender display and before the safe ANSI body
  copy is parsed, preventing color payload fragments from becoming readable text.
- The ordinary terminal stream is untouched. Existing safe ANSI SGR colors,
  channel classification, GMCP/text deduplication, pop-outs, search, unread state,
  alias routing, and session isolation remain unchanged.
- Added a regression proving `TAB+ TABpa Khelt Deepforger TABn` becomes
  `Khelt Deepforger` while the full gossip sentence remains intact.
- Full `npm run verify` passes 150 tests.

## Milestone 1.9b1 — Persistent Global Aliases

**Status:** Client implementation complete and full automated-test verified.

- Advanced the versioned settings schema from 11 to 12 and added a top-level,
  user-visible `aliases` array to `settings.json`.
- Existing schema-11 settings migrate automatically. Connection preferences,
  multi-session definitions, groups, workspace state, panel metadata, and backup
  recovery remain intact.
- `AliasEngine` now owns bounded snapshot restoration as a pure operation. It
  accepts at most 256 global records, normalizes names case-insensitively, caps
  one-command bodies at 4096 characters, replaces line breaks with spaces, and
  rejects prototype-like names.
- `SessionManager.snapshot()` includes the current global alias list. Define,
  replace, and delete results therefore return the updated list through the same
  renderer command response already used for session metadata.
- The renderer keeps only a detached alias snapshot and includes it in the existing
  debounced settings save. It has no direct filesystem access and does not execute
  restored definitions.
- Settings restoration passes the normalized list back through
  `SessionManager.restore()`. Saved sessions remain disconnected, passwords remain
  unstored, and no command is generated merely because an alias was restored.
- Alias scope remains global. Group/session/character scope selection, precedence,
  enable/disable, import/export, preview/debug, variables, multi-command aliases,
  GUI management, Actions, and triggers remain deferred.
- Communications legacy-color cleanup, terminal identity, blank Enter, `##command`,
  GA/EOR, Telnet, GMCP, GPS catalog, Context Deck, Affects, mapper, session isolation,
  and bounded per-session queues are unchanged.

### 1.9b1 acceptance checks

- Define an alias, wait for the normal settings save, restart the client, and verify
  `#alias list` shows the same definition before connecting.
- Deleting an alias removes it from the next settings snapshot and it remains absent
  after restart.
- A restored alias does not connect a session or send any command until the player
  explicitly invokes it.
- Damaged `settings.json` recovery continues to use `settings.json.bak`, including
  the alias list from the recovered snapshot.
- Full `npm run verify` passes 154 tests with zero failures.

## Milestone 1.9c0 — Actions Engine Foundation

**Status:** Client implementation complete and full automated-test verified.

- Added `src/action-engine.js` as a pure CommonJS engine with no DOM, Electron,
  socket, timer, or filesystem access.
- `#action {pattern} {one command} {priority}` defines or replaces a persistent
  global action. Priority defaults to 5 and is clamped to 1 through 9.
- `%1` through `%9` in a pattern capture wildcard text. `%0` in the command expands
  to the cleaned complete line, while `%1` through `%9` expand their captures.
- Patterns are safely escaped and anchored to the complete visible line; raw regular
  expressions are not accepted in this interval.
- ANSI, C1, OSC, and NukeFire literal-TAB color codes are removed only from the
  matching copy. The ordinary terminal stream remains complete and unchanged.
- Each session owns a bounded complete-line buffer and rate limiter. Split network
  chunks cannot match early, duplicate matches within 250 ms are suppressed, and
  no session may generate more than five action commands per second.
- Only the first enabled action in priority order fires for one line. One firing
  produces at most one command and returns through `SessionManager.dispatchCommand`.
- Generated commands may invoke aliases and use `#session`, `#group`, and
  `#followers` routing targets through the established queue path. Direct socket
  writes were not added.
- Actions do not run while Telnet remote echo places the command field in secure
  hidden-input mode. Entering or leaving that mode resets partial action lines.
- Actions cannot generate alias, action, session, group, role, or leader management
  commands. The same restriction remains effective if an alias expands into one.
- Settings schema 13 stores the global master switch and up to 256 normalized action
  definitions. Atomic `settings.json` writes and `settings.json.bak` recovery remain
  unchanged.
- Restoring actions is inert: saved sessions remain disconnected and no command is
  sent until a later completed server line matches after connection.
- The renderer retains only detached snapshots for persistence and receives action
  delivery results so mapper movement bookkeeping remains accurate.

### Text commands

- `#action`
- `#action list`
- `#action show {pattern}`
- `#action {pattern} {one command}`
- `#action {pattern} {one command} {priority 1-9}`
- `#action delete {pattern}`
- `#action enable {pattern}`
- `#action disable {pattern}`
- `#actions on`
- `#actions off`
- `#actions status`

### 1.9c0 acceptance checks

- `#action {You are hungry.} {eat bread}` fires only after the complete matching
  line arrives and sends exactly one ordinary command.
- `#action {%1 tells you 'heal %2'} {#Shai heal %2} {2}` captures both fields and
  routes through the existing Shai session queue.
- `#action {The %1 attacks Shai!} {#Caul rescue Shai} {1}` wins over a lower-priority
  overlapping pattern and sends only one routed command.
- ANSI-colored and NukeFire-colorized lines match their clean visible text without
  altering terminal output.
- Disabled actions, the global off switch, secure input, partial lines, duplicate
  floods, and over-limit lines send no command.
- Definitions and enabled states survive restart, while restoration itself remains
  disconnected and inert.
- Full `npm run verify` passes 169 tests with zero failures.

### Deferred to 1.9c1 and later

- Named action groups, group listing, group on/off state, and moving actions between
  groups.
- Per-session, per-character, and per-group definition scopes and precedence.
- Preview/debug tracing, cooldown configuration, raw regular expressions, GMCP
  event triggers, highlights, gags, substitutions, multi-command actions, and GUI
  editing.

## Milestone 1.9c0c1 — TinTin-Style Action Matching

**Status:** Client repair complete and full automated-test verified.

- Corrected the 1.9c0 matcher boundary behavior. Literal action text now searches
  anywhere within one completed, cleaned server line rather than being automatically
  anchored to both ends.
- `#action {gossips} {smile}` therefore fires for
  `Rambo gossips, 'Hello'`, which is the expected TinTin-style behavior.
- A pattern beginning with `^` requires the start of the line. A pattern ending with
  `$` requires the end of the line. `^Warning: %1$` retains explicit full-line
  matching without exposing arbitrary regular expressions.
- Color cleanup, complete-line buffering, priorities, `%0` through `%9`, persistence,
  secure-input suppression, duplicate/rate limits, action-management protection,
  alias expansion, routing, bounded queues, and terminal output are unchanged.
- Full `npm run verify` passes 170 tests with zero failures.

## Milestone 1.9c0c2 — NukeFire Wasteland HUD

**Status:** Client visual pass complete and full automated-test verified.

- Added `renderer/assets/nukefire-wordmark.webp`, a 40 KB local header crop derived
  from the NukeFire artwork supplied for this pass. It is bundled by the existing
  `renderer/**/*` packaging rule and requires no network access.
- Replaced the visible placeholder `NF` badge and test-build copy with the wordmark,
  while retaining an `NF` compact fallback below 900 pixels and an invisible
  semantic `NukeFire Client` heading.
- Added a restrained steel-and-hazard visual system to the existing DOM: worn
  connection chrome, session-strip texture, flatter industrial controls, riveted
  panel corners, hazard title markers, and a narrow outer HUD frame.
- The terminal output node keeps `background: var(--terminal-background)` and does
  not receive the artwork, texture, scanlines, or decorative overlays.
- Screen-reader mode suppresses the decorative app-edge, header-scratch, and panel-
  rivet pseudo-elements. Focus rings, labels, keyboard order, live regions, panel
  semantics, and skip links remain unchanged.
- The native macOS titlebar remains intact. No custom window dragging, icon build,
  splash screen, or GUI theme switch was added in this interval.
- No settings migration was required. Alias/action persistence, substring matching,
  secure-input suppression, GMCP, Communications, GPS, mapper, Affects, and session
  routing are unchanged.

### 1.9c0c2 acceptance checks

- The connection header displays the packaged NukeFire wordmark at desktop widths
  and a compact NF emblem at narrow widths.
- Terminal output remains selectable, uncluttered, and controlled solely by the
  existing terminal theme settings.
- Screen-reader mode removes nonessential decorative overlays without hiding any
  controls or information.
- Full `npm run verify` passes 171 tests with zero failures.

## Milestone 1.9c0c3 — First-Run Workspace and Cross-Platform Beta

**Status:** Implemented against the committed `eb9953d` beta.1 source snapshot.

- Rebalanced the first-run workspace around a wide center terminal. Affects and
  Communications occupy the left dock; Mapper contains GPS above the map on the right;
  Vitals follows beneath it. Optional diagnostic/helper panels remain discoverable.
- Added display-aware initial BrowserWindow bounds in `src/window-layout.js`, retained
  native window chrome, and increased the live terminal width safety floor to 560px.
- Advanced settings to schema 14 with a narrow migration for untouched v13 defaults.
  Character layouts that differ from the old built-in records are preserved.
- Added electron-builder targets for macOS universal and Windows x64 NSIS/portable.
- Added `.github/workflows/test-builds.yml` for verification, packaging, workflow
  artifacts, and automatic GitHub prereleases on beta tags.

## Milestone 1.9c0c4 — First Tester Feedback

**Status:** Implemented against the committed beta.2 source archive supplied after
the first macOS/Windows testing round.

- Changed `appendMudText()` so the persisted Follow/Snapback preference means what
  testers expect: when enabled, every incoming live text batch returns the output to
  the current bottom. A saved explicit false value still disables the behavior.
- Changed alias substitution without changing syntax or persistence. The greatest
  `%1` through `%9` placeholder present in one alias body receives its argument and
  every remaining argument. Lower placeholders remain one brace-aware token each;
  `%0` remains the complete argument string.
- Kept Communications history chronologically stored for deduplication and bounds,
  but renders a reversed view so the latest message is first. Docked and pop-out
  views both use the same newest-first convention.
- Added an application-level `panel-menu-layer`. Existing menu nodes are promoted
  there at startup, positioned beside their originating buttons, clamped to the
  viewport, and repositioned on window resize or scrolling. This avoids clipping and
  sibling stacking contexts without duplicating menu markup.
- Added regressions for greedy alias tails, live-output snapback from scrollback,
  newest-first Communications, pop-out ordering, and top-level panel-menu placement.
- Settings schema remains 14; version is `0.3.1-beta.3`.

### 1.9c0c4 acceptance checks

- `#alias tz {telepath wolves %1}` plus `tz hi whats up` sends
  `telepath wolves hi whats up`.
- With Snapback enabled, incoming text returns the terminal to live output; disabling
  it preserves the reader's scroll position.
- The newest Communications message is the first article in docked and pop-out views.
- Every panel menu is a child of `#panel-menu-layer`, remains above panel contents,
  closes with Escape/outside click, and returns focus correctly.


## Milestone 1.9c0c5 — Multi-Command Actions

**Status:** Implemented against the committed beta.3 source archive.

- Added `splitActionCommands()` to the DOM-free Actions engine. It recognizes only
  top-level semicolons as separators, ignores empty pieces, preserves brace/quote
  groups, supports `\;` as a literal semicolon, and rejects malformed lists or more
  than 10 commands.
- Action records compile and cache command templates when defined/restored. Matching
  substitutes captures into each pre-split template, so a semicolon arriving in `%0`
  through `%9` remains data inside one command rather than becoming executable syntax.
- `SessionManager` validates every command and any completed alias expansion before
  dispatching the first item. Protected client-management directives block the full
  burst rather than allowing a partial sequence.
- Successful commands dispatch in definition order through the existing alias engine,
  named session/group routing, and `SessionCommandQueue`; no direct socket write or
  renderer polling path was added.
- `ActionRateLimiter.allowCommands()` charges the actual command count. The default
  ceiling is 10 generated commands per session per second, so one 10-command action
  consumes the immediate window.
- Added regression coverage for splitting, braces/quotes, escaped semicolons, the
  10-command cap, capture-injection resistance, weighted rate limiting, ordered
  alias/routing delivery, and all-or-nothing protected-command validation.
- Settings schema remains 14; version is `0.3.1-beta.4`; full verification passes 185 tests.

### 1.9c0c5 acceptance checks

- `#action {gossips} {smile;look;poke bob}` sends exactly three ordered commands.
- `say hello\; everyone;smile` sends `say hello; everyone` and then `smile`.
- Eleven non-empty command pieces are rejected at definition/restore time.
- A captured semicolon remains part of its substituted command and cannot add a burst
  item.
- If any item resolves to a protected client-management command, nothing is sent.

## Milestone 1.9c0c6 — Persistent Gag Rules

**Status:** Implemented against the committed beta.4 source archive.

- Added a DOM-free `GagEngine` with bounded global definitions, individual state,
  a master switch, snapshot restore, and Action-compatible completed-line patterns.
- Added `#gag`, `#gag list/show/delete/enable/disable`, and `#gags on/off/status/list`.
  Simple unbraced definitions such as `#gag %1 gossips` are accepted.
- Added a per-session raw line filter before terminal delivery. Matching complete lines
  never enter terminal or screen-reader history, while recognized channel lines are copied
  to Communications and pop-outs through a separate bounded event. ANSI bytes remain unchanged.
- Actions continue to process the original incoming stream. Gag management joins the
  protected directives that Actions may not generate directly or through aliases.
- GA/EOR prompt boundaries flush pending nonmatching text. Oversized unterminated lines
  fail open instead of being hidden or retained without bound.
- Structured Comm.Channel/NukeFire.Comms.Message packets remain authoritative and
  deduplicate against the Communications-only text copy of a terminal-gagged channel line.
- Settings schema 15 persists Gags atomically beside Aliases and Actions.
- Version is `0.3.1-beta.5`; full verification target is 197 tests.

### 1.9c0c6 acceptance checks

- `#gag %1 gossips` hides `Rambo gossips, 'Hello'`.
- A matching hidden line may still fire `#action {gossips} {smile}`.
- Nonmatching lines and prompt text remain byte-for-byte visible.
- `#gags off` restores immediate unfiltered output without reconnecting.
- A gagged gossip is absent from terminal history and appears exactly once in Communications.

## Milestone 1.9c0c7 — Tester-Approved First-Run Workspace

**Status:** Implemented against the verified beta.5 source payload.

- Captured the successful tester arrangement as the fresh-install workspace default.
- Left dock: Affects first, Communications second.
- Upper-right tab group: Mapper first and active, Context Deck second.
- Lower-right: Vitals as an independent panel.
- Hidden by default: Quick Commands, NukeFire State, and Protocol.
- Schema 16 upgrades only records matching the complete beta.5 default arrangement;
  any customized visibility, layout, tab membership, active tab, or dock size is retained.
- Preferences → Restore Default Layout applies the new arrangement deliberately to an
  existing customized character.
- Version is `0.3.1-beta.6`; full verification target is 200 tests.

### 1.9c0c7 acceptance checks

- Fresh settings produce the exact visible/hidden panel set above.
- Mapper and Context Deck render in one tab group with Mapper selected.
- Vitals renders beneath the tab group rather than inside it.
- A customized schema-15 workspace remains unchanged after migration.
- Beta-tag Actions continue producing both macOS and Windows tester packages.

## Milestone 1.9c0c8 — TinTin-Style Compact Speedwalks — Completed

- Added a separate bounded speedwalk parser for repeated letters and counted routes.
- Added global persistent `#speedwalk on|off|status|stop`; fresh settings default on while an explicit off choice remains persistent.
- Alias results may become routes; Action-generated routes and Speedwalk management
  remain blocked by the existing automation safety boundary.
- Added tagged queue entries, atomic route enqueue, selective cancellation, literal
  input escape, manual-command interruption, and actual-send mapper events.
- Preserved session isolation, Gags, Communications, GPS, mapper graph storage,
  connection/Telnet behavior, and the beta.6 default workspace.
- Settings schema 17; client 0.3.1-beta.7; verification target 218 tests.

## Milestone 1.9c0c9 — NukeFire Native App Icon — Completed

- Converted the approved industrial NF emblem into a transparent 1024 PNG, a native
  multi-representation macOS ICNS, and a seven-size Windows ICO.
- Added explicit Electron Builder icon configuration for macOS, Windows, NSIS installer,
  NSIS uninstaller, and portable output while keeping existing artifact names.
- Added one packaged PNG for main/pop-out BrowserWindows and explicit macOS Dock identity
  during local development.
- Added binary-header, dimensions, packaging-config, and runtime-wiring tests.
- Preserved beta.7 Speedwalk parsing and stable client systems; the final beta.8 lock
  changes only the fresh-setting default to on and preserves explicit off.
- Client 0.3.1-beta.8; verification target 221 tests.

### 1.9c0c9 acceptance checks

- The committed PNG is 1024x1024 RGBA with transparent outer corners.
- The ICNS and ICO containers are valid and referenced by platform build configuration.
- Mac universal and Windows x64 tester packages use the NF icon.
- Windows Setup and Portable executables both inherit the NF icon.
- Development windows and the macOS Dock use the same approved emblem.
- All 221 tests pass before tagging beta.8.

## Milestone 1.9c1 — Fast Combat Terminal Pipeline

**Status:** Rebuilt cleanly from the trusted beta.8 source snapshot; awaiting the full
225-test Mac run and live high-speed combat confirmation.

- Incoming text still passes through ANSI state, reader state, Gags, Actions,
  Communications, vitals fallback, and session state immediately.
- Visible terminal runs are queued and committed at most once per animation frame.
- Adjacent runs with the same ANSI presentation share bounded session-history and DOM runs.
- The renderer tracks visible characters and trims oldest nodes without repeatedly reading
  the full terminal `textContent`.
- One visual flush performs one line-count refresh and at most one live-follow scroll.
- Pending output is resolved before session changes, searches, prompt-line separation,
  settings snapshots, and output clearing.
- Mapper and Communications rendering are intentionally unchanged in this interval.
- Local static checks and all 150 non-DOM tests pass; authoritative target remains 225/225.

## Milestone 1.9c4 — Multi-Command Aliases

**Status:** Implemented on the successful beta.9 c3 working tree; awaiting the
full 225-test Mac verification and live alias check.

- `#alias {kk} {smile;look;score}` now compiles up to 10 top-level command templates.
- Template splitting is brace- and quote-aware. `\;` represents a literal semicolon.
- Splitting occurs before argument substitution, preventing `%0`–`%9` input from
  creating additional commands.
- Nested alias branches flatten in definition order while preserving the existing
  16-expansion recursion/depth boundary and the 10-command total ceiling.
- Every completed command returns through ordinary session/group routing, Speedwalk
  recognition, and bounded paced queues.
- Actions may use multi-command aliases, but the fully expanded burst is validated
  atomically and may not exceed the existing 10-command Action ceiling.
- No settings migration is required; saved alias records retain the same name/body/scope shape.

### 1.9c4 acceptance checks

- `#alias kk {smile;look;score}` followed by `kk` sends those three commands in order.
- `#alias announce {say Reactor stable\; for now;look}` sends two commands, preserving
  the literal semicolon in the first.
- `#alias safe {say %0;score}` followed by `safe {steady;quit}` sends
  `say steady;quit` and `score`, not a third injected command.
- Recursive branches, malformed lists, and expansions beyond 10 commands send nothing.

## Milestone 1.9b2 — Persistent Global Variables

**Status:** Implemented on the accepted beta.9 c4 client tree; awaiting the full
240-test Mac verification and live Variable checks.

- Added a DOM-free `VariableEngine` with normalized global names, bounded values,
  detached snapshots, sorted restoration, and pure expansion.
- Commands are `#variable`, `#variables`, and `#unvariable`. Definitions are global
  and persistent; restoration never connects a session or executes text.
- `%name` and `%{name}` expand in direct input, Alias results, Action results, escaped
  `##` server commands, and `#session`/group routing bodies.
- Alias and Action command lists are parsed before expansion. A value such as
  `steady;quit` remains one command argument and cannot create a second queued command.
- Alias positional arguments and Action captures resolve before Variables. `%%`
  protects a literal percent reference through the full pipeline.
- Nested Variables resolve to a maximum depth of 16. Direct and indirect loops,
  overlong values, and expansions beyond 16,384 characters fail without delivery.
- Action safety checks run again after Variable expansion, so Variables cannot hide
  Alias, Variable, Action, Gag, Speedwalk, session, group, role, or leader management.
- Settings schema 18 adds a normalized `variables` collection. Renderer session
  snapshots and persistent settings carry it beside Aliases without a new panel.
- Version is `0.3.1-beta.10`; full verification target is 240 tests.

### 1.9b2 acceptance checks

- `#variable target {old mutant}` followed by `kill %target` sends `kill old mutant`.
- `#alias kt {kill %target;score}` sends two ordered commands using the live value.
- An Action may combine `%1` captures with `%target` Variables without changing order.
- `%%target` sends literal `%target`.
- A Variable value containing `;` cannot inject an extra Alias or Action command.
- Recursive Variables and Variable-hidden management directives send nothing.
- Variables survive restart and remain global across saved sessions.
- All 240 tests pass before tagging beta.10.

## Milestone 2.0b2 — Removable Built-in Quick Commands

**Status:** Implemented on the tester-approved 2.0b1 UX candidate; awaiting the
full Mac verification and live preference restart check.

- Added stable ids for Look, Score, Inventory, Equipment, Who, and Newbie Help.
- Preferences can remove or restore each shipped button without deleting the safe
  built-in definition, and Restore All provides a clear recovery path.
- `hiddenDefaultQuickCommands` persists only known, deduplicated ids in schema 22.
- Built-ins continue through the exact typed-command pipeline and custom buttons are unchanged.

### 2.0b2 acceptance checks

- Removing Inventory hides only that button and survives restart.
- Restoring Inventory immediately returns it with the original `inventory` command.
- Restore All returns all six shipped buttons.
- Unknown or repeated persisted built-in ids are ignored.
- Custom button creation, editing, ordering, disabling, deletion, aliases, and Variables remain intact.

## Milestone 2.1a — NukeFire Knowledge Console

- Added `src/knowledge-store.js` and an accessible Command-K search overlay.
- Negotiates `NukeFire.Knowledge 1`; searches and opens live server Help entries.
- No terminal scraping, polling, or bundled Help snapshot.
- Search results use request IDs so late packets cannot replace a newer query.
## Milestone 2.1b — Knowledge Domains

- Protocol: `NukeFire.Knowledge 2`.
- Domains: Help, Items, Commands, Skills/Spells, Zones.
- Server is authoritative; no copied client database.
- 4001 item data reads `obj_proto` directly; production discovery gating remains a later policy layer.
- Client: 0.3.1-beta.17.

## Milestone 1.9d2 — TinTin Highlight Foundation

**Status:** Implemented on the unverified beta.27 payload; awaiting the complete
431-test Mac verification and live highlight checks.

- Added a DOM-free `HighlightEngine` with bounded global definitions, priorities,
  TinTin-style classes, detached snapshots, and safe restoration.
- Added `#highlight`/`#high`, inspect/toggle/delete operations, and
  `#unhighlight`/`#unhigh`.
- Patterns support literal text, `^`/`$`, `%1`–`%9`, and `%*`. Lower priority
  numbers win overlapping visual ranges.
- Styles support named dark/bright colors, documented TinTin `<abc>` codes,
  light/dark, underline, reverse, italic, reset, and `b` background colors.
- Visual overlays preserve original text and OSC 8 link metadata. Actions, Gags,
  Communications, vitals, Find, copy, and screen-reader output remain unchanged.
- Split transport chunks buffer only while highlights are active and flush safely
  at prompt boundaries, output clearing, session transitions, and disconnects.
- Settings schema 30 adds persistent highlights; class save/clear/load includes them.
- Blink, regex mode, and top-level `.tin` file loading remain deliberately deferred.

### 1.9d2 acceptance checks

- `#highlight {mutant} {Yellow underline}` decorates only the word `mutant`.
- A split network line still highlights a match spanning both chunks.
- Existing server ANSI and OSC 8 links survive around and inside a highlighted match.
- Communications, vitals, copied text, Find, and Read Last Line retain original text.
- `#showme` receives the same visual overlay without entering Communications/vitals.
- Highlight definitions survive restart and class save/clear/load.
- Actions cannot create or remove highlight definitions.
- All 431 tests pass before beta.28 is committed or tagged.

## Milestone 1.9d3 — TinTin Substitute Foundation

**Status:** Implemented on the unverified beta.28 v2 payload; awaiting the complete
444-test Mac verification and live substitution checks.

- Added a DOM-free `SubstituteEngine` with bounded global definitions, priorities,
  detached snapshots, persistent restoration, and TinTin-style class membership.
- Added `#substitute`/`#sub`, inspect/toggle/delete operations, and
  `#unsubstitute`/`#unsub`.
- Patterns support literal text, `^`/`$`, `%1`–`%9`, and `%*`; replacements reuse
  `%0`–`%9`, with `%%` for one literal percent sign.
- A single non-recursive pass transforms completed visible lines before Highlights.
- Captures preserve original ANSI and safe OSC 8 link metadata; literal replacement
  text inherits the match's starting presentation.
- Actions, Gags, Communications, and vitals retain the original server line. Find,
  copy, terminal review, and screen-reader review use the substituted visible line.
- Settings schema 31 adds persistent substitutes; class save/clear/load includes them.
- Regex mode, multiline replacements, replacement functions/color codes, and top-level
  `.tin` file loading remain deliberately deferred.

### 1.9d3 acceptance checks

- `#substitute {mutant} {abomination}` changes only the visible reviewed line.
- `%1` captures may be reused while preserving captured ANSI and safe-link metadata.
- Substitution happens before Highlight matching and never recurses into inserted text.
- A match split across network chunks is substituted after its line completes.
- Communications and vitals retain the original line; Read Last Line uses the replacement.
- `#showme` receives substitutions without entering Communications or vitals.
- Substitute definitions survive restart and class save/clear/load.
- Actions cannot create or remove substitute definitions.
- All 444 tests pass before beta.29 is committed or tagged.

## Milestone 1.9d4 — TinTin Macro Foundation

**Status:** Implemented on the unverified beta.29 payload; awaiting the complete
457-test Mac verification and live physical-key checks.

- Added a DOM-free `MacroEngine` with physical-key normalization, bounded command
  lists, detached snapshots, enable state, persistence, and class membership.
- Added `#macro`/`#mac`, inspect/toggle/delete operations, and
  `#unmacro`/`#unmac`.
- Supported F1–F24, navigation and numpad keys, plus Ctrl, Alt/Option, Shift, and
  Command modifier chords where they do not represent unmodified typing.
- Macro command lists are split once with the established brace-aware parser and
  execute sequentially through the normal outgoing command pipeline.
- Prepared command text and manual command history remain unchanged; blank Return
  still repeats the last manually entered command rather than a macro command.
- Secure echo, dialogs, Preferences, Find, composition events, held-key repeats,
  and unrelated editable form fields block macro execution.
- Settings schema 32 adds persistent macros; session snapshots, custom-prefix
  migration, and class save/clear/load include them.
- Raw terminal key sequences, plain typing sequences such as `nn` or `^nn`, macro
  recording, and `.tin` macro import remain deliberately deferred.

### 1.9d4 acceptance checks

- `#macro {F4} {north; look}` sends both commands in order through the ordinary
  pipeline.
- A prepared `kill mutant` remains untouched after the macro fires.
- Blank Return repeats the last manually typed command, not `look` from the macro.
- Client commands, aliases, variables, routing, delays, loops, and Speedwalk work
  inside a macro without a parallel dispatch path.
- Num Lock does not change a physical numpad macro's identity.
- Secure input, Preferences, Find, repeated keydown, and ordinary form editing do
  not fire macros.
- Macro definitions survive restart, custom-prefix changes, and class
  save/clear/load.
- Actions cannot create or remove macro definitions.
- All 457 tests pass before beta.30 is committed or tagged.

## 2026-08-01 — Beta.31 command-line batches

- Added a shared `analyzeCommandLine` classifier beside the existing brace-aware command splitter.
- The command bar now accepts up to twenty top-level semicolon-separated commands while preserving braces, quotes, and escaped literal semicolons.
- Mixed ordinary and client commands remain ordered through `SessionManager`; session activation earlier in the line affects later commands.
- The renderer uses the shared parser through preload for disconnected-state and prompt-boundary decisions, avoiding a second semicolon grammar.
- Whole-line validation prevents partial execution after malformed braces, quotes, escapes, or oversized batches.
- The complete typed line remains one manual-history entry.
- Full verification target: 463 tests before beta.31 is committed or tagged.

## 2026-08-01 — Beta.32 prefix-aware command history

- Added a small browser/Node `history-navigation` helper with anchored,
  case-insensitive prefix matching and bounded forward/backward index searches.
- Empty command input retains the established complete-history Up/Down behavior.
- Typed text at an unselected end caret becomes the search prefix; Down restores the
  exact draft after the newest match.
- Manual edits leave navigation mode immediately, while programmatic recall does not
  accidentally reset itself.
- Session runtime records preserve the active prefix, index, draft, and command text
  independently across character switches.
- Secure echo, prepared-input hotkeys, macros, command batches, and blank-Return repeat
  retain their existing behavior.
- Full verification target: 469 tests before beta.32 is committed or tagged.

## 2026-08-01 — Beta.33 panel and Mapper text

- Added the shared browser/Node `display-text` helper for normalized panel-label
  and Mapper-room-label preferences.
- Full panel labels remain the default; compact mode uses readable words rather
  than icon-only or unexplained abbreviations.
- Headings, dock tabs, and pop-out titles follow the selected visual label mode,
  while aria labels and panel announcements retain the full names.
- Mapper room labels may remain hidden, show complete room numbers, or show
  normalized bounded room names beneath each square.
- Current-room, GPS route, and destination glyphs remain independent from room
  labels, and the accessible Mapper summary is unchanged.
- Settings schema 33 persists both choices and safely migrates older files.
- Full verification target: 475 tests before beta.33 is committed or tagged.

## 2026-08-01 — Beta.34 optional pipeline debug

- Added the dual browser/Node `pipeline-debug` helper with bounded per-session
  runtime buffers and normalized 50–500 entry limits.
- Added `#debug pipeline` controls and active-session Preferences controls; logs
  appear inside the existing Protocol panel with Copy and Clear operations.
- Added manager traces for manual batches, dispatch, Aliases, Variables, routing,
  Speedwalk, sends, Actions, and Gags plus renderer traces for macro activation and
  matching Substitutes and Highlights.
- Secure echo redacts all command and incoming details, and disabled mode avoids
  constructing lazy trace messages.
- Settings schema 34 persists only enable state and retention, not log contents.
- Full verification target: 485 tests before beta.34 is committed or tagged.

## 2026-08-01 — Beta.35 genuine TinTin Echo

- Added `src/echo-format.js` for bounded, deterministic local formatting with at
  most 30 arguments and 4,096 visible output characters.
- Added `#echo {format} {arguments...}` as a distinct local-output command rather
  than a synonym for `#showme`.
- Supported common TinTin `%s`, `%d`, `%f`, `%g`, `%t`, `%c`, `%a`, `%%`, width,
  alignment, and precision behavior with clear errors for unsupported forms.
- Generated terminal styling is limited to known color names and documented `<abc>`
  foreground codes after all user-provided controls are removed.
- Echo output uses the established local terminal, Substitute, Highlight, Find, copy,
  and reader path but never enters the Action engine, Communications, or vitals.
- Explicit `%{name}` syntax lets NukeFire variables coexist with formatter tokens.
- TinTin paste analysis now treats Echo as a supported safe local directive.
- Full verification target: 495 tests before beta.35 is committed or tagged.

## 2026-08-01 — Beta.36 safe TinTin script reads

- Added `src/script-store.js` in the main process for a visible Documents-based
  Scripts folder with strict names, extensionless/`.tin` lookup, case-insensitive
  resolution, regular-file checks, UTF-8 validation, and a two-megabyte limit.
- Added the dual browser/Node `tintin-script-loader` for atomic balanced-brace,
  comment-aware parsing without executing file contents.
- Supported existing Alias, Variable, Action, Gag, Highlight, Substitute, Macro,
  and class-membership models with duplicate replacement and category capacities.
- Added sandbox-safe preload IPC and renderer transaction handling with immediate
  settings persistence and exact definition/class rollback after any save failure.
- Added familiar load totals plus explicit warnings for Functions, nested reads,
  raw login commands, shell commands, and other unsupported directives.
- Actions cannot initiate file reads, and startup remains available if the Scripts
  folder cannot be prepared until the first explicit read.
- Full verification target: 511 tests before beta.36 is committed or tagged.

## 2026-08-02 — Beta.37 safe TinTin script writes

- Added the dual browser/Node `tintin-script-writer` for deterministic export of
  every definition family already accepted by safe `#read`.
- Added reversible structural escaping plus writer-aware loader support for
  category state, disabled records, saved class snapshots, and active-stack
  restoration.
- Added sandbox-safe `scripts:write` IPC and main-process atomic file replacement
  within the existing visible Scripts folder.
- Extensionless names write `.tin`; case-insensitive existing files retain their
  actual filename and are replaced without leaving partial output.
- Actions cannot initiate disk writes, and paths, symlinks, directories, invalid
  names, unsupported extensions, empty content, and oversized output are refused.
- Added exact supported-state round-trip tests and renderer verification that a
  write does not mutate live definitions.
- Full verification target: 522 tests before beta.37 is committed or tagged.

## 2026-08-02 — Beta.38 native TinTin variables

- Extended `src/variable-engine.js` to parse `$name`, `${nonstandard name}`,
  `$$` escaping, and backslash-dollar escaping alongside existing percent syntax.
- Added one shared recursion/depth/output guard across mixed percent and dollar
  references, with unknown references preserved literally.
- Extended settings and safe TinTin reads to accept bounded nonstandard names while
  rejecting structural characters reserved for parsing and future nested tables.
- Kept loop counters restricted to simple names and preserved `%0`–`%9` Action
  capture substitution before persistent variable expansion.
- Updated client help, command documentation, importer analysis, and deterministic
  script writes without introducing a second command path.
- Full verification target: 531 tests before beta.38 is committed or tagged.

## 2026-08-02 — Beta.39 safe TinTin Math and Format

- Added `src/math-engine.js` with a bounded tokenizer, Pratt parser, and AST
  evaluator for arithmetic, dice, powers, roots, comparisons, booleans,
  ternaries, and safe bitwise operations.
- Added `#math {variable} {expression}` with native dollar/percent Variable
  expansion, atomic assignment, preserved class membership, and Pipeline Debug.
- Added `#format {variable} {format} {arguments...}` using the existing Echo
  formatter plus `%m`, while refusing terminal color controls in stored values.
- Added `%m` to Echo and accepted Math/Format inside compatible imported Alias and
  Action bodies.
- Deferred Action variable expansion for approved local scripting directives so
  sequential Math/Format/Echo/Showme commands see updates made earlier in one
  Action without weakening command-injection checks.
- No settings-schema, renderer-layout, preload, networking, or script-file schema
  change is required.
- Full verification target: 545 tests before beta.39 is committed or tagged.
## 2026-08-02 — Beta.40 bounded TinTin Functions

- Added `src/function-engine.js` for persistent definitions, brace-aware arguments,
  `%0`–`%99` positional substitution, and literal-call escaping.
- Added `#function`, `#functions`, `#unfunction`, and `@name{arguments}` expansion
  across ordinary commands, Aliases, Actions, routing, Echo, Showme, Math, and Format.
- Added isolated per-call Local frames, Unlocal, Return, nested calls, and the
  conventional `result` fallback.
- Restricted Function bodies to Local, Unlocal, Math, Format, and Return so calls
  cannot hide sends, routing, delays, filesystem access, or automation-definition changes.
- Added recursion, depth, call-count, argument, command-count, body-size, and output
  limits plus persistent Variable rollback after any failed call.
- Advanced settings schema to 35 and added Function persistence, classes, safe
  Read/Write round-tripping, familiar load/write counts, and client help.
- Full verification target: 558 tests before beta.40 is committed or tagged.

## 2026-08-02 — Beta.41 lazy numeric TinTin conditionals

- Added `src/conditional-engine.js` for prefix-aware parsing of inline If branches
  and adjacent If/Elseif/Else chains without evaluating inactive bodies.
- Reused the bounded Math evaluator with zero false and non-zero true; only the
  selected branch receives Function and Variable expansion.
- Routed selected branches through the established direct, Alias, Action, Function,
  delay, loop, class, macro, routing, and command-batch paths.
- Preserved Action management-command/rate safeguards and Function synchronous
  allowlist/Variable rollback across selected branches.
- Added Pipeline Debug condition and branch stages, custom-prefix help, importer
  compatibility, and a renderer macro adjacency regression.
- Kept string/regex comparisons, switch/case, while/foreach, break, and continue
  outside this interval.
- Full verification target: 573 tests before beta.41 is committed or tagged.
## 2026-08-02 — Beta.42 docked prompt row

- Added `src/prompt-display.js` with normalized Inline, Docked, and Hidden modes plus
  playing-session capture and detached prompt-snapshot helpers.
- Reused the existing GA/EOR event rather than packet/no-linefeed guessing. Completed
  lines continue through normal terminal history and only the unfinished final tail is
  eligible for capture.
- Added a stable per-session prompt row above command input, preserving ANSI, Substitute,
  Highlight, explicit review, and independent session restoration.
- Kept login/password/pager/editor prompts inline until a character identity exists and
  retained group-prompt CR/LF lines in scrollback.
- Advanced settings schema to 36 and added persistence plus runtime clear/disconnect rules.
- Added six dependency-free regressions and two JSDOM renderer integrations.
- No game-side `comm.c`, GMCP, preload, main-process, network, or command-pipeline changes.
- Full verification target: 581 tests before the original beta.42 installer.
- Beta.42-v3 wired live Prompt display changes and raised verification to 585 tests.
- Beta.42-v4 compressed the row, removed divider chrome and tab focus, hid xterm's
  decorative cursor, and raised verification to 586 tests.
- Beta.42-v5 keeps the final terminal line break staged while a docked/hidden prompt is
  current, preventing the removed prompt from leaving an empty xterm row. The staged
  break is released before the next visible output, so stored transcript text, line
  counts, ordering, session restoration, and reader history remain unchanged.
- Beta.42-v5 adds only two pixels between the compact prompt and command input; the row
  remains borderless, non-focusable, and one terminal line high.
- Full beta.42-v5 verification target: 586 tests before commit or tag.

## 2026-08-03 — Beta.43 draft-safe shortcuts

- Restored dirty-input protection for TinTin macros and configurable keyboard
  shortcuts: actively composed command text wins by default.
- Kept empty input and a fully selected last-sent command as valid shortcut surfaces,
  avoiding friction with the selected-command repeat workflow.
- Activated the existing persisted `worksWhileTyping` field and exposed it as a
  per-shortcut **Fire while typing** checkbox, disabled by default.
- Removed the movement-command exception that previously made Shift+W consume the W
  from `gos Welcome` and send movement instead.
- Preserved the prepared draft for opted-in shortcuts and kept every macro/shortcut
  dispatch on `recordHistory: false`, so blank Enter repeats only the last manually
  submitted command.
- Added renderer coverage for dirty-input deferral, explicit opt-in, Shift+W behavior,
  secure/UI blocking, draft preservation, and repeat-Enter separation.
- No settings migration is required because `worksWhileTyping` already normalizes and
  persists in the keyboard-shortcut schema.
- Full verification target remains 586 tests before beta.43 is committed or tagged.


## 2026-08-03 — Beta.44 far-right dock

- Added `outer-right` as a fourth normalized workspace dock region beside the
  existing right dock rather than replacing or overloading it.
- Added **Move Far Right** to every panel menu plus a drag-and-drop far-right target.
- Added a dedicated vertical separator and independent preferred width, including
  pointer resizing, Arrow/Shift+Arrow control, Home/End bounds, double-click reset,
  and complete separator semantics.
- Generalized side-dock width fitting so left, right, and far-right columns share
  available room while preserving the established minimum terminal width.
- Advanced settings schema to 37. Older workspaces receive the safe 260-pixel
  far-right default while existing regions, sizes, tabs, visibility, and pop-outs
  remain unchanged.
- Persisted the new region and width through default, character-specific, and
  Shared Crew Workspace snapshots.
- Kept the terminal shell/output/input nodes, command pipeline, Telnet/GMCP state,
  prompt row, pop-out mirroring, and session ownership unchanged.
- Added focused settings, foundation, keyboard, drag/drop, and tab-group regressions.
- Full verification target: 590 tests before beta.44 is committed or tagged.


## 2026-08-04 — Beta.45 docked prompt clearance

- Added four pixels of bottom clearance inside the one-line docked prompt row so
  focused command-input highlighting no longer crowds the prompt text.
- Kept TinTin disk-operation visibility local to `appendTinTinReadLines`: the full
  report is flushed, then the active xterm viewport returns to the live edge.
- Rejected the earlier global resize-preservation approach because it altered dock,
  drag/drop, tab-group, and manual scrollback behavior.
- Added a JSDOM regression for `#read` with Follow Output disabled and a dependency-free
  source-scope guard proving resize handling remains untouched.
- No settings schema, main/preload IPC, network, GMCP, Mapper, Communications, Action,
  Gag, routing, Help, or script-import capability changes.
- Full verification target: 591 tests before beta.45 is committed or tagged.


## 2026-08-04 — Beta.46 readable client Help

- Recognized direct client Help only at the renderer presentation edge, leaving command result strings and ordering unchanged.
- Joined Help lines into one structured terminal block.
- Added a dedicated `help` transcript-run kind mapped to bold bright cyan in xterm; monochrome output uses the normal selected foreground.
- Added explicit headings so Help remains meaningful without color.
- No settings, disk operations, routing, network, protocol, prompt, map, or communications changes.
- Full verification target: 594 tests before beta.46 is committed or tagged.


## 2026-08-04 — Beta.47 TinTin Script Editor

- Added a player-invoked `#edit` command and File-menu controls for opening existing TinTin scripts in the system editor.
- Confined direct names and native-picker selections to regular extensionless or `.tin` files directly inside Documents/NukeFire Client/Scripts.
- Rejected paths, nested files, symlinks, directories, unsafe extensions, and missing files.
- Kept editing separate from loading: saving never executes a script, and `#read` remains the explicit import step.
- Added command, preload/IPC, ScriptStore, renderer, menu, and safety regressions.
- No settings schema, terminal geometry, output ordering, protocol, Map, Communications, Action, Gag, or routing changes.
- Full verification target: 600 tests before beta.47 is committed or tagged.

## Beta.48 — TinTin Session Reset Commands

- Added `#end` as an immediate no-confirm disconnect for the active session only.
- Added bare `#kill` to clear live supported TinTin definition lists, classes,
  saved class snapshots, active-session delays, and queued Speedwalk steps.
- Preserved script files, sessions, output, history, protocols, Maps,
  Communications, accessibility preferences, and other client settings.
- Blocked both commands when generated by Actions.
- Release gate: 605/605 tests.

## 2026-08-04 — Beta.49 mapper recovery and disconnected TinTin workspace

- Added a decorative parchment offline mapper backed by explicit accessible text and guaranteed hidden live SVG state.
- Added one transient live-map reset path for Room.Info, Char.GPS, BIGMAP snapshot/index/signature, route progress, movement watches, and per-session pending movement.
- Wired reset to active and background disconnects, hard refresh, and clean reconnect/copyover GMCP lifecycle snapshots.
- Preserved the learned graph, visit history, map file, zoom, canvas size, workspace layout, output, and client settings.
- Kept Alias, Variable, Function, conditional, repeat, loop, delay, `#showme`, and Action testing available while disconnected.
- Kept network safety at the final session queue boundary and restricted host/port connection shorthand to player-entered Alias expansion.
- Release gate: 613/613 tests.

## 2026-08-05 — Beta.51 Communications Flow and Message Integrity

- Replaced the retired newest-first Communications presentation with oldest-to-newest reading order.
- Appended new messages at the bottom and kept the live edge at the bottom in docked and detached panes.
- Bottom-anchored short histories without reversing DOM order or shrinking message rows.
- Preserved manual scrollback during new arrivals and panel rerenders.
- Preserved genuine terminal-to-terminal and GMCP-to-GMCP repeated messages.
- Limited deduplication to matching cross-source terminal/GMCP representations and retained the richer ANSI copy.
- Updated stale performance, Communications, pop-out, GMCP-version, and release-version expectations.
- Communications-focused gate: 25/25 tests.
- Release-state focused gate: 32/32 tests.
- Full release gate: 617/617 tests.

## 2026-08-06 — Beta.53 Session Vitals and Communications Workspace

- Moved inactive same-server character resources out of the docked prompt and into the independent Session Vitals panel.
- Preserved panel visibility, docking, tabs, drag/drop, resizing, pop-outs, per-character workspaces, shared crew workspaces, and schema migration.
- Added Communications newest-top/newest-bottom persistence and matching docked/pop-out behavior.
- Kept scrollback stable unless the viewer was already at the selected live edge.
- Bounded Communications history and control rows so incoming traffic cannot expand the selected workspace.
- Added Grats parsing, server-advertised SSF visibility, and detected bj/bonejack filtering.
- Split crowded Communications controls into responsive Channels, Display, and Find sections.
- Capped side-docked Communications between 300px and 520px using a responsive viewport target.
- Collapsed the connection controls automatically after connection while retaining status and a manual Show/Hide control.
- Bottom-aligned Connect, Disconnect, Knowledge, and Preferences with Host and Port.
- Converted New Session into a compact Create tab and in-flow drawer that never covers docked panels.
- Focused gate: 158/158.
- Full gate: 626/626.
- npm check and git diff --check passed.

## 2026-08-06 — Beta.54 Session-Scoped TinTin Profiles and Multiplayer Workflow

- Replaced the former shared TinTin runtime with authoritative per-session definition containers.
- Routed outgoing commands, aliases, variables, Functions, Actions, gags, highlights, substitutions, macros, classes, Speedwalk, incoming processing, #kill, #read, and #write through the selected session.
- Preserved top-level compatibility mirrors only for the currently active session.
- Added schema 40 persistence and one-session-only migration of legacy shared definitions.
- Ensured a newly created target is clean before automatic profile loading and cannot briefly execute the creator session's triggers.
- Derived automatic profile files from the target session name unless an explicit file is supplied.
- Continued connecting after a missing or invalid private profile while leaving that target clean and reporting the error there.
- Added profile identity, clean reload, multiplayer roster details, profile-aware tabs, and profile-aware edit/write defaults.
- Preserved manual #read as an intentional local merge without stealing an established bound profile identity.
- Focused gate: 244/244.
- Full gate: 632/632.
- npm check and git diff --check passed.

## 2026-08-07 — Beta.55 Persistent Character Workspaces and Resizable Panels

- Promoted the visually approved V17 workspace geometry design on top of trusted Beta.54.
- Added a shared panel-height engine for Affects, Communications, Mapper, Vitals, Session Vitals, Context Deck, and other workspace panels.
- Integrated pane heights into the normal per-character/shared-workspace settings model.
- Added migration from the temporary Beta.55 local height cache.
- Remembered the most recently identified character so its workspace can restore during startup.
- Added persistent outer BrowserWindow geometry with safe monitor-work-area recovery.
- Changed geometry commits to immediate settings flushes.
- Moved resize handles outside content scroll flow using fixed viewport overlays.
- Corrected detached Size-menu positioning in narrow pop-out windows.
- Preserved Beta.54 session-scoped TinTin profile behavior.
- Focused gate: 61/61.
- Full gate: 650/650.

## 2026-08-10 — Beta.57 Veteran TinTin Compatibility and Workspace Stability

Beta.57 locks the protected post-Beta.55 laboratory after the full Veteran TinTin compatibility audit/fix sequence. The release preserves the native NukeFire mapper, session isolation, safe file/log confinement, and blocked arbitrary shell/chat networking while materially increasing compatibility with real veteran TinTin trees including MM, ClassVI, and Cogline. The final release candidate is required to pass Preferences 7/7, TinTin 444/444, and the complete 849/849 suite before distributions are accepted.

## 2026-08-11 — Beta.58 Accessibility and Reader Workspace

Beta.58 locks the accessibility/reference-harvest sequence built natively on trusted Beta.57. The release adds stable terminal and Communications review identities, configurable reader actions and rapid recall, protected accessibility shortcuts, optional isolated Self-Voice with navigation interruption and bounded backlog/priority behavior, and the Reader Workspace presentation mode. Native screen-reader presentation remains the default path; Self-Voice is opt-in. Reader Workspace changes presentation only: hidden panels, mapper state, Communications, TinTin automation, vitals, and background sessions continue processing. The release candidate is required to pass Accessibility 66/66, Preferences 7/7, TinTin 444/444, and the complete 915/915 suite before any distributions are accepted.

## 2026-08-12 — Beta.59 Accessible Audio and Semantic Combat Foundation

Beta.59 locks the accessible-audio sequence built on trusted Beta.58. Self-Voice is now foreground-aware, truly mutable, tunable, and selectable by installed system voice; reader presets and optional accessibility hotkeys provide fast entry points without taking over protected native keys. Native Audio Cues and user Sound Triggers add a separate bounded auditory channel while preserving complete text in Terminal and Reader Review. The client also advertises NukeFire.Combat 1 and accepts schema-1 combat summaries as an ephemeral GMCP event stream: packets are normalized, exposed to the ordinary event/Pipeline Debug path, and discarded rather than accumulated as permanent state. Semantic combat audio routing remains intentionally deferred until after hard JAWS/NVDA/VoiceOver testing. The accepted candidate must pass Accessibility 106/106, Semantic Combat 6/6, Preferences 7/7, TinTin 444/444, and the complete 961/961 suite before any distributions are accepted.

## 2026-08-13 — Beta.60 Safe Lua Foundation and Reader UI Boundary

Beta.60 promotes the accepted Beta.60a.0–a.4 sequence on top of trusted Beta.59. Lua 5.4 runs through Wasmoon 1.16.0 in a Node Worker with deny-by-default libraries, memory and execution bounds, hard Worker recovery, and per-session state. The first NukeFire Lua API is deliberately small: send, echo, shared TinTin variables, and read-only session metadata. COMMAND ECHO is a per-session persistent TinTin configuration, default OFF, so routine automation state changes do not spam normal play. The ordinary Communications panel no longer exposes reader review navigation; Reader Workspace and accessibility actions remain the home of stable Communications review. Full acceptance requires 19/19 Lua/config tests, 28/28 reader-boundary tests, the ordinary Communications regression, npm check, git diff check, and the complete 980/980 suite. Beta.60 is committed/tagged locally only; no platform distributions or remote push are part of this lock.

## 2026-08-13 — Beta.61 Reader-Native Accessibility and Safety

Beta.61 locks the cumulative Reader-Native Accessibility sequence built on trusted Beta.60. The release connects NukeFire's authoritative server screen-reader state to the official client through the existing whitelisted `NukeFire.Controls` semantic channel, adds the `cr` command family, Reader History categories/unread state, robust Last Tell recall, Self-Voice controls and in-place recovery, Reader diagnostics, lifecycle/copyover re-convergence, a semantic realtime safety lane that can break through backscroll without moving the review cursor, and first-run Reader Setup with a short spoken tutorial. The accessibility architecture remains additive: normal terminal output, Communications, TinTin/Lua automation, mapper, vitals, sessions, and ordinary clients remain intact. Release acceptance requires Reader 127/127, Preferences 7/7, TinTin 444/444, and full 1033/1033 before distributions are accepted.

## 2026-08-17 — Beta.62 Accessible Output, Audio, and Speech

Beta.62 locks the cumulative accessible-output/audio/speech sequence developed on top of trusted Beta.61. It adds Reader command parity, semantic combat and vitals earcons, active-session Self-Voice hygiene, semantic NukeFire.Speech filtering for Self-Voice only, and a separate practical audio tutorial. Terminal text, Reader History, inactive-session history, user Sound Triggers, TinTin automation, mapper, and ordinary non-Reader use remain intact. The accepted Beta.62b2 source tree is pinned file-for-file and must pass the focused 106/106 gate plus the complete 1083/1083 suite before release.

### Beta.63b7 candidate — Compact Interactive Affects
- Affects pane is now a dense disclosure list: name + live duration on the row, details only on request.
- Details expose modifier/grant/source data already carried by `NukeFire.Affects`.
- Full pane height is usable; disclosure state is session-local and retained through matching GMCP rerenders.
- Server feed expansion for omitted permanent equipment/tattoo/implant/remort rows remains intentionally deferred until the fresh server source is audited.

### Beta.63b9 candidate — Compact Mapper and GPS Guidance
- Uses the existing server GPS catalog difficulty field as the sole source for remort suggestions; no client-side combat/difficulty score is invented.
- Adds compact per-destination remort guidance to GPS choices and the selected-destination summary.
- Moves destructive/rare map maintenance behind a native disclosure while leaving ordinary zoom/center controls immediately available.
- Preserves server-authoritative Room.Info, Char.GPS, NukeFire.GPS.Catalog, BIGMAP handling, movement-first rendering, and learned-map persistence.


## 2026-08-24 — Beta.66a Performance & Responsiveness Pass 3 — Movement Fast Path

- Removed the historical 80 ms default delay between Speedwalk steps; bounded Speedwalk routes now hand separate ordered movement lines to the socket immediately, matching veteran TinTin-style movement responsiveness while retaining the 200-step route safety ceiling.
- Changed the zero-delay command queue drain from recursive single-item shifting to one iterative bounded drain, avoiding timer/call-stack/array-shift overhead during compact routes such as `20e`.
- Pure server-bound Speedwalk results no longer serialize the complete multi-session TinTin definition snapshot back across IPC; definition snapshots remain authoritative for commands that actually change client/session state.
- Rapid Speedwalk notifications now enter a bounded ordered movement-intent queue. Each Room.Info consumes the matching direction in order, and prompt boundaries discard stationary/failed steps, so removing the timer does not sacrifice learned-map direction accuracy. Repeated outstanding movement also reuses fallback watches and interrupts Self-Voice once per burst rather than once per step.
- GPS destination matching now uses catalog-reference lookup maps and a cached filtered-index set, keeping ordinary `Char.GPS` movement updates O(1) against the destination catalog after the catalog/filter is built.
- Speedwalk step events no longer recount the remaining command queue on every send, and non-communication GMCP packets bypass Communications parsing before timestamp/text normalization work.
- Preserves terminal-first rendering, Reader history, Self-Voice movement behavior, authoritative Room.Info/BIGMAP handling, map persistence, GPS guidance, session isolation, and explicit paced-queue behavior when a non-zero interval is deliberately supplied.


## 2026-08-24 — Beta.66a Performance & Responsiveness Pass 4 — Change-Only Panels

- Deferred Mapper, NukeFire Console, Affects, and Mob Inspector DOM construction whenever their dock tab/panel is not actually visible and no pop-out window is open; authoritative state continues updating in memory and one fresh render occurs when the surface becomes visible.
- Kept panel pop-out MutationObservers disconnected unless that specific panel has an open separate window, removing dormant subtree-observer work from ordinary gameplay.
- Split Mob Inspector's high-frequency combat HP/group updates from its structural render so live vitals no longer recreate SVG art, history/mastery rows, Consider content, or effect-card trees on each opponent pulse.
- Cached Affects countdown nodes and made one-second countdown updates change-only; identical affect structure refreshes update timing without rebuilding the entire list.
- Added normalized NukeFire.Context signatures so duplicate Console packets are no-ops, and made Communications tabs and Group Vitals skip exact duplicate visual states.
- Reordered existing combat rows only when their position actually changes and converted common combat/protocol text/ARIA writes to change-only updates.
- Preserved Reader/Self-Voice accessibility, pop-out behavior, GMCP authority, mapper state, Affects semantics, Mob Inspector lifecycle, communications review, and all player-visible controls.

## 2026-08-24 — Beta.66a Accessibility — Tell and Auction Communication Sounds

- Extended the existing independent communication-earcon surface from Gossip/Skynet/SSF to Tell and Auction.
- Added persistent, default-off Tell and Auction checkboxes plus direct test buttons in Accessibility preferences.
- Added two short, distinct bounded native Web Audio signatures and kept communication sounds independent from Self-Voice/native screen-reader speech.
- Reused the existing Communications classifier and active/background-session dedupe path, so Tell/Auction cues do not introduce a second text parser or duplicate event source.
- Extended the bounded `reader.sound.channel` / `reader.sound.test` client-control handlers to accept Tell and Auction while preserving the hardcoded semantic-control allowlist.
