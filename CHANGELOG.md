## 0.3.1-beta.76 — Command-Line Audio and Control Coherence

### GPS pop-out caret stability

- Keeps focus and the exact text selection/caret position stable while a detached Mapper/GPS panel republishes its filtered destination list after each input character.
- Removes the animation-frame restoration gap from generic pop-out snapshot replacement without changing GPS commands, catalog filtering, panel layout, or the protected control relay.

### High-capacity Personal Sounds

- Raises the real `.nfsp` custom-event allocation ceiling from 32 to 2,500 and the archive entry ceiling from 64 to 4,096, removing the approximately 65-file wall reported by high-volume screen-reader sound users.
- Raises only the bounded manifest and per-event preference capacities needed to represent those assignments; the `.nfsp` schema, 25 MB archive limit, 50 MB expanded-data limit, 8 MB per-audio limit, protected picker, safe paths, and playback engine remain unchanged.
- Keeps the 75-entry server control-action allowlist separate from sound allocation capacity.

### Prompt Action compatibility

- Restores `#ACTION` matches on non-newline gameplay prompt text by completing the existing bounded Action/Lua line buffer once at the authoritative TELNET GA/EOR boundary.
- Keeps the Beta.75 anchored-trigger correction: the prompt buffer is empty before the next ordinary MUD line, so `^` patterns such as the `[Procs]` trigger still start at column zero.
- Adds regressions for the reported `#action {Ready to Remort!} {#mw1 gs **Remort is ready**}` route, split prompt chunks, exactly-once firing, oversized prompt safety, and the existing anchored Lua trigger.
- Leaves `#SHOWME` behavior unchanged; `{light green}` is literal SHOWME text, while `#ECHO` remains the supported colored-local-output command.

### Control coherence and command-line custom sounds

- Makes the normal custom-sound workflow command-line first: `#SOUND {ADD} {custom.name}` opens the existing protected audio chooser, while ASSIGN, SHOW, TEST, CLEAR, and DELETE cover the useful editor operations without requiring Preferences navigation.
- Reuses the same Soundpack Store, `.nfsp` files, Personal Sounds preparation, protected Electron picker, playback engine, and renderer operations as Preferences; the command line never accepts a filesystem path.
- Returns keyboard focus to the mud command input after command-line audio selection or cancellation, and keeps all soundpack mutation commands direct-player-only so Actions/Lua cannot pop dialogs or silently edit audio.
- Hardens Soundpack Store clearing/reassignment so an archived audio asset is retained when another event still references it.
- Unified communication sound enable/disable so CR SOUND and soundpack controls reach one communication-cue authority instead of stacking two independent gates.
- Adds bounded server-control parity hooks for native reader mode, advanced Self-Voice behavior, voice selection, vital speech format, important announcements, Reader hotkeys, and the existing #A11Y diagnostics/profile operations. The fresh server source pair now uses the same exact 75-action allowlist; test-server compilation and live end-to-end confirmation remain release gates.
- Expanded Reader status to expose advanced Self-Voice and vital/announcement state.
- Preserves the existing Reader/Audio/Soundpack engines and existing LIST/SEARCH/SHOW compatibility contracts; this pass adds shared control routes, not duplicate stores or presentation systems.

### General Audio Pass 1

- Moves Soundpacks, Audio Cues, communication sounds, and Sound Triggers out of Accessibility into a first-class Preferences → Audio category for every player. Reader Workspace, native screen reader mode, and NukeFire Self-Voice are not required.
- Makes the existing managed `#SOUND` independence explicit and permanent: bare `#SOUND` / `#SOUND {STATUS}` report general audio state while `#SOUND {event}` remains usable from normal play and bounded TinTin automation.
- Adds `#SOUND {STOP}` and `#SOUND {STOP} {MUSIC}` so long audio can be stopped without exposing filenames, filesystem paths, URLs, or a second media-player API.
- Defines `custom.music.*` as the lightweight player-music convention. Starting a new `custom.music.*` track replaces the previous music track but leaves ordinary sound effects alone.
- Keeps the existing `.nfsp` format, protected WAV/MP3/OGG/M4A assignment flow, master audio gates, event gates, foreground rules, cooldowns, and server semantic sound events. No second sound engine or Reader-only audio stack is added.

### Manual sound Reader announcements

- Routes every manually requested `#SOUND` result through the existing forced Reader announcement path, including playback gates, chooser cancellation, assignment, clearing, deletion, status, list, search, and show output.
- Keeps the same messages in terminal/system history and removes the accidental doubled brackets around sound-command results.
- Keeps Action-, Alias-, timer-, Event-, and Lua-generated sound playback quiet when blocked, preserving the established non-spammy automation contract.

## Beta.75 Accessibility Routing Pass 4 (development)

- Adds one bounded per-session semantic presentation journal instead of another accessibility settings stack. Meaningful communication, combat, navigation, loot, crafting, quest, vitals, safety, system, and client events can now be inspected through a common event/category/priority vocabulary.
- Adds `#ACCESSIBILITY` / `#ACCESS` / `#A11Y` Last Event, Why, report, capabilities, self-test, doctor, clear, and profile commands. Diagnostics/profile mutation are interactive-only so Actions, Aliases, Functions, timers, and Lua callbacks cannot silently change accessibility setup or spam reports.
- Records actual Reader-History and sound presentation outcomes where those paths are known, including blocking, dedupe, disable, and unavailable reasons; `WHY` reports the most recent suppressed presentation rather than guessing from a second preference model.
- Extends Reader History with semantic Navigation, Loot, Crafting, Quests, Safety, Vitals, and System entries while retaining existing Communications, Rooms, Combat, and Damage review paths. Repeat semantic events collapse only inside the bounded diagnostic journal; terminal and Reader text remain complete.
- Adds a sanitized setup report and up to twelve local named accessibility profiles covering Reader Workspace, native/Self-Voice mode, speech/audio gates, soundpack choice, communication cues, safety/priority behavior, and keybindings. Portable export/import reuses the protected `.nfpreset` format rather than creating another file format.
- Adds a bounded accessibility self-test across Communications, Navigation, Loot, Vitals, Safety, Reader History, and Audio, and extends Doctor with duplicate-speech and last-suppression diagnostics.
- Keeps Accessibility Routing Pass 4 client-only: local `#accessibility` / `#access` / `#a11y` commands are complete, while new `reader.accessibility.*` GMCP actions and `CR ACCESSIBILITY ...` remain deferred until the current server bridge sources are reviewed.
- This pass does not add a braille presentation layer.

## Beta.75 TinTin → Soundpack Discovery Pass 3 (development)

- Adds case-insensitive `#SOUND {LIST}`, `#SOUND {LIST} {group}`, `#SOUND {SEARCH} {text}`, and `#SOUND {SHOW} {event}` discovery on top of the existing managed `#SOUND {event}` bridge.
- Keeps bare LIST concise by showing playable event groups/counts; grouped LIST and SEARCH return bounded alphabetic event-name results instead of dumping the entire catalog.
- SHOW reports event source, active-pack assignment/fallback state, enabled/disabled state, and the same playback-ready/blocking reason used by real sound playback.
- Omits reserved/not-emitted events from normal LIST/SEARCH discovery while still allowing SHOW to explain a known reserved name.
- Discovery commands are interactive-only so an Action/Event/Ticker/Delay cannot accidentally flood combat output with sound catalog reports.
- Confirms TinTin command/subcommand/event matching is case-insensitive: `#sound`, `#Sound`, `#SOUND`, and upper/lowercase event names normalize to the same managed event.

## Beta.75 TinTin → Soundpack Integration Pass 2 (development)

- Adds `#SOUND {event}` as a tiny Action-safe client command that requests a managed NukeFire soundpack event instead of exposing filenames, paths, URLs, raw Web Audio, or terminal internals.
- Supports player-created bounded `custom.*` sound events such as `custom.stairs`; custom events have no built-in fallback and are silent when automation-generated but unassigned or blocked.
- Extends `.nfsp` manifests to carry up to 32 `custom.*` event assignments. Assigned WAV/MP3/OGG/M4A audio is copied into the soundpack archive, so TinTin Actions retain only the stable event name and do not depend on the original source file.
- Adds a Soundpack Editor Custom Action event field. When Built-in NukeFire is active, using a custom event automatically prepares/activates an editable `personal-sounds` pack unless the player supplied another new-pack ID/name.
- Keeps all normal playback gates: event enable/disable, Audio Cues on/mute, foreground policy, availability, volume, and cooldown. Manual `#SOUND` reports a blocking reason; Action/Event/Ticker/Delay-generated requests stay quiet.
- Example: `#ACTION {a dungeon staircase} {#SOUND {custom.stairs}}`.

## Beta.75 Accessibility / Sound Pass 1 (development)

- Keeps Group, Grats, Shout, and Holler as first-class Communications/soundpack cues while making tests/previews obey the same event, channel, master, mute, foreground/background, availability, volume, and cooldown gates as real playback.
- Reports the concrete reason a configured cue is blocked instead of a generic "could not play" message, including through CR sound tests and the Soundpack Preview Event status.
- Stops treating every Room.Info up/down exit as the DCC/Breach stairs cue; `room.stairs` remains allowlisted but reserved until an authoritative game signal exists.
- Adds no Lua API expansion and does not yet add TinTin `#sound`; that remains the next soundpack-integration step after this accessibility correction pass.

## Beta.75 Lua Correction Pass 1 (development)

- Fixes prompt-carry handling so a TELNET prompt boundary discards only the Lua/Action prompt carry and `^` anchors match the next actual mud line, including the real `[Procs] 1 effect:` / `2 effects:` case.
- Makes `cecho()`, `decho()`, and `hecho()` render supported Mudlet-familiar colors/formatting through NukeFire's bounded safe output parser while preserving the existing Beta.74 `echo` host-event/plain-args contract; raw script-supplied terminal control sequences remain blocked.
- Adds explicit regression coverage for ordinary/block Lua comments, numeric capture indexing, `ipairs(matches)`, immediate temporary-trigger enablement, and singular/plural `[Procs]` captures.
- Makes saved-script reruns replace only resources owned by that script (temporary aliases, triggers, timers, event handlers, and Custom Panes), including resources created later inside owned callbacks, without resetting the whole Lua VM.
- Makes Reload Autorun clear host-side temporary automation as well as rebuilding the Worker VM, so the full-reset path is actually clean on both sides.
- Adds no new Lua authority or API scope; Beta.75 feature expansion remains gated on this correctness pass.

## Beta.74 Lua Mudlet Convenience C1

- Adds Mudlet-familiar `sendAll()` and `speedwalk()` while routing through NukeFire's existing guarded direct-send and native Speedwalk machinery.
- Adds command-line helpers `getCmdLine()`, `printCmdLine()`, `setCmdLine()`, `appendCmdLine()`, and `clearCmdLine()` using the existing per-session command draft rather than DOM access.
- Adds bounded `getCurrentLine()`, `getLineNumber()`, `getLastLineNumber()`, `getLineCount()`, and `getLines()` over NukeFire-owned visible output history; `getLines(-10, -1)` is supported as a bounded relative convenience.
- Adds lightweight `decho()` and `hecho()` compatibility alongside `echo()`/`cecho()` without importing Mudlet's full buffer-formatting engine.
- Preserves the Lua sandbox: no filesystem, shell, arbitrary network, DOM/xterm access, gag, or render-veto surface.

- Beta.74 Lua diagnostics hardening: adds bounded per-session error history, `#lua status`, `#lua errors [count]`, `#lua errors clear`, and `#lua reload`; saved scripts report script/line locations, the native editor shows OK/ERROR last-run state, and repeated identical callback failures are coalesced without expanding filesystem/DOM/gag authority.

- Beta.74 Custom Panes workspace pass: player-created panes now register as individual NukeFire workspace panels instead of value cards inside one shared host. Each pane can be dragged between docks, reordered, joined/separated as a tab, and hidden locally while preserving the bounded declarative Lua/data boundary. Dynamic pane placement is runtime-only in this pass; popout windows and persisted custom-pane geometry remain deferred.

- Beta.74 Lua saved scripts pass: adds a native multi-line Lua Scripts editor, per-session protected script persistence backed by managed modules, optional Auto-run before the first explicit Connect, manual Save & Run, and a fresh-VM Reload Autorun path that clears transient Lua callbacks/panes before rebuilding them. No filesystem/DOM/gag surface is added.


- Beta.74 Lua managed packages pass: added NukeFire-owned bounded `storage`, managed module source + safe `require()`, read-only `settings.get`, and thin `gmcp.on` / `world.on` / `mud.send` / callback-only `mud.trigger` compatibility. Lua still has no arbitrary filesystem/network/package access, and the Mallard gag path is intentionally not adopted.
## Beta.74 Player Feedback + Modern TinTin Compatibility (candidate)

- Reader navigation prioritizes Main Output, Gossip, SSF, and Tells; Communications gains Shout/Holler classification and Reader-oriented sounds for Group, Grats, Shout, and Holler.
- Adds an authoritative Room.Info stairs cue, stabilizes right-pane geometry when dynamic panels/scrollbars appear, and fixes stale resize divider artifacts.
- Adds TinTin foreground/background truecolor highlight forms and keeps common xterm/Wintin macro sequences mapped to NukeFire physical keybindings.
- Aligns current TinTin table semantics: `*table[]` keys, `$table[]` values, `&table[]` size; NukeFire-generated legacy `.tin` files automatically migrate the older `$table[]` key-list spelling.
- Updates FORMAT `%D/%M/%X/%x`, regex REPLACE captures, pattern-aware KILL, CAT scalar/table behavior, and the bounded modern LIST family including nested list-tables, INDEXATE, ORDER, SORT, and TABULATE.
- Adds safe LINE QUIET, VERBATIM, and recursive JSON translations while retaining the NukeFire sandbox and one authoritative variable/command pipeline.
- Moves `#lua` into the authoritative SessionManager automation core so typed commands, Aliases, Actions, Events, Delays, and other client automation can invoke the same per-session Lua Worker without a renderer-only side path.
- Preserves Mudlet-familiar direct `send()` semantics and adds bounded `execute()` / `expandAlias()` re-entry through NukeFire's TinTin/client command pipeline, with request-scoped Worker events and nested-Lua recursion limits.
- Expands the Lua variable snapshot from 256 to the full 2,048-record VariableEngine capacity, serializes work per Lua session instead of globally across all sessions, and explicitly closes a Lua VM when its NukeFire session is removed.
- Documents the Worker-asynchronous `#lua` sequencing contract: later commands in the same TinTin batch may continue before Lua finishes, while Lua `execute()` / `expandAlias()` provide the explicit ordered continuation path.
- Adds shared Lua structured data: `getTable()` / `setTable()` reconstruct and atomically replace the same TinTin VariableEngine trees instead of creating a Lua-only variable store.
- Exposes a bounded Mudlet-familiar `gmcp` table rebuilt from the canonical per-session GmcpStore before each Lua execution, plus `sendGMCP()` routed through the existing SessionManager/connection GMCP path.
- Adds the canonical `nf` Lua namespace as aliases over the same approved send/execute/variable/table/GMCP surface; retained GMCP state stays bounded and transient combat/sound/loot packets remain event-only for the later callback pass.
- Adds Mudlet-familiar temporary Lua automation (`tempAlias`, substring/regex/exact triggers, `tempTimer`, anonymous Event handlers, `raiseEvent`, and enable/disable/kill controls) as transient records inside NukeFire's existing Alias/Action/Event/timer engines rather than a parallel Lua automation stack.
- Provides familiar callback context (`line`, `command`, numeric/named `matches`) plus GMCP-specific and generic GMCP Events, bounded callback rates/patterns, Mudlet-compatible `expireAfter` skip semantics, one-shot cleanup, and repeating-timer backpressure.
- Keeps temporary Lua definitions out of TinTin persistence and retires callbacks with their owning NukeFire session; malformed/risky regular expressions are rejected before registration and host registration failures are surfaced as Lua automation diagnostics.
- Adds a real-world NukeFire Mudlet-package compatibility bridge based on the public `rparet/nukefire-mudlet` scripts: a bounded read-only `msdp` projection from canonical GMCP plus `msdp.FIELD` Lua Events for the package's requested vitals, stats, opponent, room, area, exits, and affects data.
- Adds compatibility `sendMSDP` setup no-ops, named Event handlers, cross-session `raiseGlobalEvent`, profile/time/focus helpers, owning-session `reconnect`, lightweight `cecho`, `table.contains`, `table.union`, and `spairs` without adding a second network protocol or Lua-side host access.
- Publishes Mudlet-style connection/protocol lifecycle Events (`sysConnectionEvent`, `sysDisconnectionEvent`, and synthetic MSDP capability through `sysProtocolEnabled`) while keeping Geyser/EMCO, remote package installation, arbitrary filesystem persistence, `io`, and Mudlet map-database APIs outside the sandbox and mapped to NukeFire-native facilities instead.
- Prototypes Lua-native Custom Panes through `nf.pane.create()`: bounded declarative text/value/bar rows feed NukeFire-owned rendering and accessibility, with no player HTML/CSS/JavaScript/DOM surface and no Lua render-veto or gag path.
- DCC-specific communication review/sounds remain deliberately deferred until the server signal is traced rather than guessed from display text.
- No shell/network expansion and no release/version/Git action.
## 0.3.1-beta.73 — Combat Responsiveness and Sustained Performance

- Stabilizes rapid multi-kill target presentation across Opponent Vitals, Group
  Targets, and Mob Inspector while keeping authoritative GMCP state immediate.
- Coalesces kill-triggered Mob Inspector refresh requests during synchronous
  combat bursts.
- Uses 64 KiB MCCP2/MCCPX decoder output chunks to reduce streaming decode
  callback overhead without changing compression lifecycle semantics.
- Keeps the 2 ms combat terminal-latency ceiling and bounded xterm
  coalescing/backpressure.
- Reduces settings/map persistence overhead and retains no-clone Mapper
  serialization before Electron IPC.
- Adds Mapper long-session render/save instrumentation and robustifies the
  Char.Vitals performance regression against one-shot timing noise.
- Bounds sustained-running Mapper persistence to a 350 ms quiet debounce with a
  2 second maximum dirty interval, removing the zero-delay post-save save loop.

## 0.3.1-beta.72 — Performance Architecture Lock and Release Stabilization

- Locks the post-Beta.71 performance cleanup as the release candidate baseline.
- Reuses authoritative parsed text and canonical GMCP/TinTin/combat state instead of
  repeatedly stripping, normalizing, serializing, or cloning the same data.
- Removes legacy heavy-output and pane/workspace scheduling compensations superseded by
  the current bounded xterm/backpressure and explicit workspace architecture.
- Shrinks routine Electron IPC with metadata-only session rosters, unchanged-command
  snapshot elision, and zero-delay same-turn stream-event batching.
- Coalesces duplicate pure renderer refreshes at native event-batch boundaries while
  preserving every semantic GMCP/Reader/audio/TinTin event in order.
- Adds canonical Char.Vitals/opponent reuse and keyed in-place companion Session Vitals
  rendering to reduce combat and multi-session DOM churn.
- Preserves Definition Manager, Reader/Self-Voice, soundpacks, mapper/panes, TinTin
  source-parity behavior, GMCP, MCCP2, MCCPX/Zstandard, and copyover semantics.
- Release outputs: macOS Universal DMG/ZIP, Windows x64 Setup/Portable, Linux x64 AppImage.

## 0.3.1-beta.71 — Definition Management, Performance, and Terminal Polish

- Adds the unified Definition Manager, Client Presets, numeric font-size handling,
  and terminal geometry/accessibility polish.
- Removes several remaining per-byte/per-character incoming-output hot loops and
  adds adaptive definition dispatch for large TinTin configurations.
- Adds bounded xterm write coalescing and faster terminal ANSI-run serialization;
  comparable live stress bursts showed roughly forty percent less terminal-flush work.
- Adds Page Up/Page Down terminal review with draft preservation.
- Corrects wide Unicode/modern emoji cell widths while making Unicode enhancement
  explicitly non-fatal to terminal startup.
- Preserves MCCP2/MCCPX, GMCP, Reader/Self-Voice, soundpack, mapper, and multi-session behavior.

## Beta.69 accessibility follow-up - MUSH settings result feedback

- `CR LOAD MUSHSETTINGS` now announces one immediate result instead of appearing silent.
- Reports how many of the 23 official shortcuts are active and identifies every existing assignment that was preserved.
- Names the requested action that could not be installed at each conflicting key; for example, Alt+C remains untouched and reports that Copy Reviewed was not installed there.
- Retains the result in Client Reader History and preserves the existing conflict-safe, no-overwrite policy.

## Beta.68 — GroupAssist accessibility and Console editor (candidate)

- Adds a server-authoritative learned GroupAssist action catalog spanning shared combat skills and broad class-specific rotations while retaining established five-action veteran syntax.
- Adds clearer `groupassist status`, `options`, `set`, and `clear` commands plus concise `sr groupassist` help.
- Extends NukeFire.Controls GMCP and adds a labeled GroupAssist editor inside the NukeFire Console for Default, Self, or named-leader rotations.
- Keeps configuration draft-safe and keyboard-complete; the visual status is deliberately non-live and all eligibility/execution remains authoritative on the MUD.

## Beta.68 — Command-input-first accessibility refinement (candidate)

- Stops asynchronous connected-status updates from taking focus away from terminal review, Reader controls, Preferences, or other deliberate keyboard work.
- Still returns focus to the command field after a connection completes when the player initiated it from the command/connection controls, preserving any command draft and selection.
- Avoids redundant polite live-region mutations when connection status text has not changed and adds acceptance coverage for blank-announcement suppression and the removed Reader Workspace exit control.

## 2026-08-24 — Beta.66a Performance & Responsiveness Pass 2
- Removed more repeated receive/render work: cached stable ID lookups, reused transformed text, skipped fallback vital regexes once GMCP is authoritative, stabilized GPS option DOM, suppressed duplicate BIGMAP graph/render work, and made high-frequency vital/state DOM writes change-only.
- Preserved accessibility, Reader/Self-Voice behavior, mapper route confirmation, GPS behavior, and all existing visible output.

## Beta.66a — Responsiveness Cleanup Pass 1 (candidate)

- Removes redundant full session/TinTin snapshots from every active incoming event.
- Cuts per-packet MCCP2/MCCPX allocation, bookkeeping, and telemetry work while preserving copyover remainder recovery.
- Coalesces secondary protocol diagnostics and avoids full Protocol-pane refreshes for compression counter updates.
- Adds safe no-definition fast paths for display transforms, Actions, and Sound Triggers.
- Avoids semantic Audio Cue before-state cloning unless the cue system is active and the GMCP package can use it.
- Skips speech-side line buffering while Self-Voice is off and avoids inactive-session vitals-panel rebuilds when fallback vitals did not change.
- Preserves accessibility, terminal output, GMCP state, copyover, TinTin behavior, multi-session state, and existing UI features.

## 0.3.1-beta.66 — Modern Compression Transport

- Adds proven MCCP2 zlib/DEFLATE server-to-client compression support.
- Adds MCCPX negotiation with Zstandard preferred for the official NukeFire Client.
- Adds live compression protocol/state/codec and wire-vs-expanded diagnostics.
- Preserves MCCP2 fallback and ordinary Telnet compatibility for other servers/clients.
- Hardens NukeFire copyover boundaries so Zstandard ends and renegotiates safely on the inherited socket.
- Keeps compression below the existing Telnet/GMCP/MSDP/terminal/accessibility processing paths.

## 0.3.1-beta.65 — Accessibility & Combat Context Reliability

- Locks the Southpaw-driven Reader/Self-Voice accessibility refinement sequence for wider testing.
- Adds draft-safe Reader line recall, reviewable Client Reader material, and optional command-send speech interruption.
- Adds de-duplicated Gossip/Skynet/SSF communication cues and tighter Skynet semantic detection.
- Stabilizes Communications newest-at-bottom behavior through unrelated state/layout refreshes.
- Improves harmful Affects presentation using NukeFire-specific apply-direction semantics with screen-reader labels.
- Hardens Mob Inspector combat-target lifecycle with explicit clears, exact mob-instance identity, and stale-packet rejection.
- Preserves the complete Beta.64 TinTin Source-Parity 1-20 baseline.

## Accessibility Client Reader review refinement
- Reader History gains a quiet Client Reader category for reviewable CR/client accessibility messages.
- CR tutorial steps and meaningful client-control responses can now be revisited through Reader History without creating another speech path.
- Generic line/review/category navigation acknowledgements are not retained.

## Accessibility command-flow refinement
- Command history navigation no longer permanently associates the command input with the full instructional description, reducing repetitive screen-reader chatter while browsing previous commands.
- Added an optional “Interrupt Self-Voice when a command is sent” preference; it defaults off and persists with the existing Self-Voice controls.
- Settings schema advances to 46.

## 0.3.1-beta.64 — Veteran TinTin Compatibility

- Locks the cumulative TinTin Source-Parity 1–20 sequence as the next trusted client baseline.
- Brings veteran definition queries, Alias priority, MESSAGE/IGNORE, READ/WRITE, events, patterns, MATH/FORMAT, and script compatibility substantially closer to upstream TinTin behavior.
- Preserves bounded execution and continues to block unsafe host/system scripting surfaces rather than silently emulating them.
- Retains all accepted Beta.63 server-aware context, accessibility, Reader, mapper, workspace, and presentation work.

## 0.3.1-beta.63 — Server-Aware Context and World Intelligence

- Locks the cumulative Beta.63 candidate sequence as the next trusted client baseline.
- Adds first-party server-aware Mob Inspector, Loot History, and Foundlist / Upgrades surfaces.
- Retains the compact mapper/GPS, workspace, affects, vitals, Reader, and presentation work developed through the Beta.63 candidate series.
- Keeps the server authoritative: client panes consume structured NukeFire state/events and ordinary game commands remain authoritative.

## Mob Inspector Transient Combat Polish (candidate)

- Removes the unreliable Consider, Mobcount, and Diagnose buttons from the pane; normal typed NukeFire commands remain authoritative.
- Keeps the exact successful lookup argument in server GMCP provenance instead of deriving a target command from the displayed mob name.
- Hides stale Mob Inspector context when Room.Info moves the character elsewhere.
- Switches the same inspected mob into a compact combat card when Char.Vitals reports it as the current opponent, refreshes the fighting target once through `NukeFire.Mob`, and uses live opponent HP without polling every pulse.
- Hides the transient combat card when the opponent disappears and refreshes cleanly when the combat target changes.
- Adds small decorative SVG monster emblems for machine, undead, caster, fighter, and generic creature categories, with boss/miniboss visual badges while retaining textual descriptors for accessibility.
- Compact combat mode keeps HP and four effect rows visible; expanded inspection retains Consider, exact kill history, Zone Mastery, and the fuller effect list.

## Beta.63b8 — Adaptive Compact Vitals (candidate)

- Packs Health, Mana, and Movement into one-line label/meter/value rows instead of spending two lines per resource.
- Hides the inactive Opponent block entirely until combat provides a target, then restores it automatically.
- Hides the Group Vitals block when there are no other visible group members, removing Solo/self-only dead space while retaining the player’s main vitals above.
- Tightens active opponent, group, target, and Session Vitals rows without changing their authoritative GMCP values or display-mode preferences.
- Leaves combat calculations, audio thresholds, Reader actions, networking, terminal timing, and server behavior unchanged.

## Beta.63b7 — Compact Interactive Affects (candidate)

- Replaced space-heavy always-open affect cards with dense one-line disclosure rows.
- Timed affects keep live countdowns; permanent affects show `Permanent`.
- Clicking or keyboard-activating a row reveals its modifiers, granted skills, and authoritative source type.
- Expanded rows survive ordinary GMCP refreshes for the same effect group.
- Removed the old 24rem list-height ceiling so Affects can use the full height of its pane.
- The client continues to state when permanent equipment/implant/tattoo/remort rows are omitted by the current server feed; it does not infer or scrape missing data.

## Beta.63b6a — Field Layout Gallery Expansion (candidate)

- Adds three field-oriented gallery arrangements: Field Ops, Field Ops + Crew, and Compact Ops.
- Field layouts keep Affects at the far left, place the Mapper with GPS/map visible alongside Vitals beneath it, and put Communications in the far-right outer dock.
- Field Ops + Crew adds Session Vitals below personal Vitals; Compact Ops uses slimmer docks to return more width to the terminal.
- Layout-gallery rotation now follows Electron app-wide focus instead of main-window blur, so panel pop-outs do not conflict with foreground-only Self-Voice and test windows cannot leave a rotation timer running.
- Layout trials now capture and restore display-component visibility too, so forcing Map/GPS on for a field preview never overwrites the player’s own Mapper section choices.
- Adds a fourth schematic preview region for the far-right dock.
- No Affects content redesign, terminal renderer/timing, networking, mapper data, Reader, TinTin, server, version, commit, tag, push, or distribution changes are included.

## Beta.63b6 — Workspace Header & Layout Gallery (candidate)

- Tightens and aligns the connection/header controls while reclaiming eight pixels of vertical workspace height.
- Uses the otherwise dead center of the connection bar for a small rotating layout gallery; rotation is preview-only, pauses on hover/focus, and is disabled by reduced-motion preference.
- Automatic gallery rotation now runs only while the application window is focused, stopping on blur as well as hover/focus/reduced-motion; this also prevents background/test-window timers from keeping the renderer event loop alive.
- Adds My Layout as the safe return point plus Terminal Only, Classic, Mapper Focus, Combat, and Communications previews. Terminal Only hides every docked pane for maximum terminal space.
- Trying a gallery layout is temporary and does not overwrite the saved workspace; Return restores the exact panel visibility, layout, dock sizes, tabs, and pop-out state captured before the experiment.
- Close Session now opens an explicit confirmation explaining that it removes the session tab (and its live connection when connected), while Disconnect remains the choice for keeping the session available.
- Terminal renderer, adaptive paint, movement-first BIGMAP handling, pager behavior, TinTin, Reader, networking, and server code are unchanged.

## Beta.63b5 — Pager Enter With Saved Commands (candidate)

- Treats the automatically selected “Show last sent command in command line” value as display-only while NukeFire is waiting at a pager prompt.
- Pressing Enter now advances NEWS, HELP, and other paginated output instead of accidentally re-running the visible saved command.
- Preserves that visible last command across pager advances, while any edited or newly typed command still sends normally.
- Does not change ordinary Enter-to-repeat behavior when no pager is pending.
- Recognizes NukeFire’s native `Valid commands while paging are RETURN, Q, R, B, or a numeric value.` prompt as an active pager boundary.

## Beta.63b4 — Movement-First BIGMAP Handoff (candidate)

- Keeps ordinary `Room.Info` and `NukeFire.Map.Local` mapper updates synchronous, preserving established mapper timing and test contracts.
- During an actual locally initiated movement only, yields the heavier authoritative `NukeFire.Map.Local` snapshot by one event-loop task so matching room text can paint first.
- Leaves `Room.Info` immediate, preserves every deferred BIGMAP packet in arrival order, and discards stale queued work across reset/reconnect boundaries.
- Adds no animation-frame delay and does not change terminal batching thresholds, command sending, networking/Telnet, Reader, TinTin, typography, or server behavior.

## Beta.63b3 — Terminal Flow and Adaptive Paint (candidate)

- Lets ordinary rapid MUD output use the existing 2 ms fast paint even when several chunks arrive together, avoiding an unnecessary full-frame wait.
- Keeps very heavy bursts on the established frame-batched path once they reach eight pending batches or 8192 pending characters.
- Preserves command-send responsiveness, transcript storage, Reader state, ANSI parsing, session replacement safety, and all network/protocol behavior.

## Beta.63b2 — Terminal Typography and Fixedsys Safety (candidate)

- Tightened normal terminal line spacing from 1.35 to 1.25 while leaving Compact at 1.12.
- Made the NukeFire run-to-ANSI adapter solely responsible for bold-to-bright color mapping instead of layering xterm's own bright-color policy over it.
- Added a Fixedsys-specific xterm profile that avoids synthetic bold width changes, uses the installed font's own box/block glyphs, and rescales overlapping single-cell glyphs.
- Passes the selected terminal font identity to xterm so changing into or out of Fixedsys updates typography immediately.
- Did not change terminal batching, network timing, Reader behavior, session handling, or server code.

## Beta.63b1 — Visual Foundations (candidate)

- Fixed the misplaced Global TinTin Startup Profile checkbox.
- Stopped Buff/Affect rows from spreading apart when their pane is made tall.
- Reclaimed pane space with tighter panel chrome and hover/focus-revealed panel option buttons.
- Replaced the New Session → Create → Create flow with a single direct creation row.
- Require a real session name and block duplicate display names in the creation UI.

## 0.3.1-beta.50 — Preferences Layout and Readability

- Rebuilt Preferences as a wider control center with eight clear categories instead of two cramped columns.
- Kept the title and Done button fixed while only the selected category content scrolls.
- Added accessible tab semantics, one roving keyboard tab stop, Arrow/Home/End category navigation, and predictable focus return.
- Increased description width, font size, and line spacing while explicitly preventing clipping, ellipsis, and hidden overflow.
- Added a compact single-column responsive layout with horizontally scrollable category choices for smaller windows.
- Opened Quick Command customization directly to its category and kept every existing setting ID, saved value, and behavior unchanged.
- Added structural, keyboard, focus-trap, responsive-layout, and direct-category regressions.
- Full verification target: 617 tests.

## 0.3.1-beta.49 — Mapper Offline Recovery and Disconnected TinTin Workspace

- Replaced stale live room graphics with a parchment offline state whenever the active session is disconnected or waiting for fresh map data.
- Added a single hard-reset path for transient Room.Info, Char.GPS, BIGMAP snapshot/index/signature, route progress, pending movement, and per-session live mapper state.
- Changed Refresh to **Hard Reset & Refresh**, then request fresh `Room.Info`, `Char.GPS`, and `NukeFire.Map.Local` packets without erasing the learned map.
- Invalidated stale mapper state on active/background disconnect and clean reconnect/copyover GMCP lifecycle snapshots.
- Kept the full local TinTin pipeline available while disconnected; only final socket delivery is blocked.
- Allowed `#showme` to exercise Actions while offline and added guarded player-entered Alias host/port login shorthand.
- Added computed-style, mapper lifecycle, command-routing, login-alias, and offline-Action regressions.
- Full verification target: 613 tests.

## 0.3.1-beta.23 — TinTin-style command line and classes
- Expanded Terminal Font choices with Fixedsys Excelsior, Maple Mono, Maple Mono NL, JetBrains Mono, Fira Code, Hack, Source Code Pro, Terminus, Inconsolata, and Cascadia Mono/Code. Optional fonts use locally installed copies and retain safe monospace fallbacks.

- Added `#unalias`, `#unaction`, and `#ungag` as direct removal commands.
- Added TinTin-style `#session name host port` create-or-reconnect behavior, with braces optional and existing named sessions reused.
- Added `#session +` and `#session -` cycling while retaining existing session management and named routing.
- Added persistent `#class` grouping for aliases, variables, actions, and gags with open, close, assign, list, save, clear, load, on, off, size, and kill operations.
- Advanced settings to schema 26 and package version to `0.3.1-beta.23`.
- Removed the old 1800 × 1400 panel-window restoration ceiling; popouts can now use the full usable area of large, 4K, ultrawide, and secondary displays.
- Added an accessible Size control to every popped-out panel with Compact, Standard, Large, Fill Display, Panel Default, and exact custom width/height choices.
- Kept ordinary edge-drag resizing, per-panel saved bounds, shared-workspace propagation, and disconnected-monitor recovery intact.

## 0.3.1-beta.22 — Shared Crew Workspace and Universal Panel Windows

- Adds an optional shared crew workspace that keeps panel visibility, layout, dock sizes,
  tabs, Communications filter, and separate-window arrangement steady across sessions.
- Preserves existing character-specific workspaces and restores them when shared mode is
  disabled.
- Extends the established Communications pop-out architecture to Vitals, Affects, Quick
  Commands, NukeFire State, Protocol, NukeFire Console, and Mapper.
- Keeps every separate panel live and tied to the active session, with saved bounds,
  restart restoration, Dock Panel controls, keyboard operation, and screen-reader-safe
  mirrored live regions.
- Relays panel interaction back through the authoritative main-renderer controls instead of
  introducing duplicate command or state pipelines.
- Retains all-session terminal dimension synchronization and advances settings schema to 25.

## 0.3.1-beta.20 — Authoritative BIGMAP and NukeFire Console

### TinTin++ Alias and Action paste importer

- Adds a Preferences paste importer for focused TinTin++ alias/action exports.
- Parses single-line and multiline braced definitions, `#alias`/`#al`,
  `#action`/`#act`/`#ac`, optional priorities, mixed capitalization, blank lines,
  and balanced `#nop` comments without executing pasted text.
- Reviews every definition as Ready, Translated, Review, or Unsupported before
  saving anything. Safe entries are preselected; warning entries require explicit
  selection; unsupported entries cannot be selected.
- Detects existing names/patterns and supports keep-existing or replace-existing
  behavior. Imported Actions are always individually disabled.
- Provides one-session Undo Last Import and preserves settings/session synchronization.
- Blocks automatic conversion of TinTin variables, math, conditionals, file reads,
  shell commands, delays, highlights, dynamic definition management, advanced
  wildcards, color-sensitive patterns, and embedded PCRE.
- Raises the bounded global alias capacity from 256 to 512; Actions remain capped
  at 256 and both engines retain their existing ten-command limit.
- Stress-tested against the supplied 3,588-line legacy file: 330 aliases, 130
  actions, 12 ignored `#nop` comments, and zero malformed top-level definitions.
- Keeps package version `0.3.1-beta.20`; no settings-schema migration is required.

### Performance foundation and feature freeze

- Freezes the mapper as a centered, read-only BIGMAP before further feature work.
- Replaces per-packet full GMCP state copies with compact changed-field events while preserving full resync snapshots.
- Reuses one ANSI-stripped text value across transcript, reader, pagination, line-count, and vitals work.
- Prepends ordinary Communications arrivals without rebuilding the complete message panel.
- Adds spatial indexes for explored-room viewport queries and maintained visited-room sets/counts.
- Coalesces map/settings writes and returns lightweight save acknowledgements.
- Caches terminal cell measurement and suppresses duplicate NAWS/accessibility parser updates.
- Preserves command order, screen-reader behavior, Communications immediacy, terminal scrollback, map memory, and all established automation.

- Replaces the generic browser disconnect prompt with a branded, keyboard-trapped NukeFire connection dialog.
- Requests fresh Room.Info, Char.GPS, and NukeFire.Map.Local state from the server on demand.
- Adds scoped clearing for character visit history, current-zone learned rooms, all client map data, and server session BIGMAP memory.
- Renders terrain tiles with the exact NukeFire BIGMAP `[Fxyz]` palette and terminal glyph meanings: `@`, `*`, `X`, and `#`.
- Preserves authoritative closed, locked, route, bidirectional, and one-way link metadata in the map display.
- Uses a centered, read-only map with persistent explored-room memory, exact terrain colors, wheel/button zoom, room details, refresh, and scoped clearing.
- Retires the experimental clickable-room, Run Here, and double-click travel interface before the performance feature freeze.
- Keeps ordinary movement, GPS destination commands, aliases, and Speedwalk on the established command pipeline.
- Renames and expands NukeFire Actions as the NukeFire Console for room, service, zone, character, map, and travel controls.

### Centered explored-map follow-up

- Keeps every visited room available to the character map instead of limiting stored exploration to a fixed current-room radius.
- Restores centered mouse-wheel and button zoom while always following the current room.
- Uses viewport culling without free-pan, room selection, or click travel.
- Keeps BIGMAP terrain, GPS/current-room markings, screen-reader summaries, refresh, and clearing.

## 0.3.1-beta.19 — Client usability fine-tuning

- Keeps the default NukeFire port at 4000 and removes numeric spinner arrows from the port field.
- Adds standard local prompt line breaks before server-bound commands.
- Leaves the last command selected for immediate Return-to-repeat or type-to-replace behavior.
- Renames Context Deck to NukeFire Actions and explains its room/service/zone purpose.
- Adds confirmed inline-map state support for the server-provided BIGMAP action.
- Stops inventing reverse map exits and replaces stale exits with authoritative Room.Info/BIGMAP data.
- Confirms Disconnect, writes disconnect transitions into game output, and clarifies disconnected command input.

## 0.3.1-beta.18 — Identified Item Codex

- Uses the server identification ledger to expose every discovered item rather than only currently loaded instances.
- Adds accessible paged Knowledge results with explicit shown-versus-matched counts.
- Decodes socket jewels, implant modules, tattoo inks, and socketable host layouts using the server's socket system.
- Preserves a live-instance fallback on database-free test worlds.

## 0.3.1-beta.17 — NukeFire Knowledge Domains

- Expanded the Command-K Knowledge Console beyond Help into live Items, Commands,
  Skills/Spells, and Zones.
- Added server-side category filtering, mixed-result ranking, structured stat fields,
  metadata tags, and context-appropriate terminal actions.
- Item Codex data comes from the live NukeFire object prototype table and does not
  require the 4000 SQLite/PostgreSQL services, so 4001 remains fully supported.
- Preserved request IDs, stale-response rejection, bounded packets, focus return,
  screen-reader status updates, and complete keyboard operation.

## Milestone 2.0b4 — Configurable Client Command Prefix

- Added a persistent Command Input preference for choosing `#`, `~`, `^`, or `/`
  as the client-management and session-routing prefix.
- The chosen symbol now consistently controls Aliases, Variables, Actions, Gags,
  Speedwalk management, sessions, groups, roles, leaders, named-character routing,
  `all`, and `followers` routing.
- Doubling the chosen symbol preserves the existing literal-prefix escape. For example,
  `~~help` sends `~help` when tilde is selected.
- Existing players remain on `#` after migration. Changing the prefix rewrites leading
  client-routing commands in saved Aliases, Actions, and custom Quick Commands so
  established automation keeps working.
- Usage messages and Preferences examples display the active symbol, while screen-reader
  announcements explain the change and literal escape.
- Settings schema advances to 23; client version advances to `0.3.1-beta.15`;
  full verification target is 287 tests.

## Milestone 2.0b3 — Drag-and-Drop Panel Layout

- Panel title bars can be dragged between the left, right, and lower docks.
- Dropping near a panel edge places the dragged panel before or after that panel group;
  dropping in the center combines it as a tab.
- Existing tabs can be dragged left or right within a group or into another panel group.
- During a drag, labeled edge targets keep empty left, right, and lower docks reachable.
- Dragged layouts use the existing per-character layout, tab-group, and active-tab
  persistence without a settings-schema change.
- Pure layout transformations live in a renderer-safe shared module with direct unit
  coverage for dock moves, tab joins, reordering, and group-id detachment.
- Panel options menus remain the complete keyboard and screen-reader equivalent.
- Separating or dragging the panel that supplied a tab group's id now safely renames
  the remaining group instead of leaving it accidentally attached.

### Live group and opponent vitals

- The Vitals panel now shows the active character's current opponent with live HP and level.
- Group packets render keyed member rows with HP, mana, movement, location, leader state, and each member's current opponent.
- Deduplicated group enemies appear as live target rows, including which characters are engaging each target.
- Character tabs retain independent combat snapshots, and manual Read Vitals includes opponent and group health without creating live-region combat spam.

### Shared movement pipeline performance

- Eliminated duplicate full-state GMCP delivery and applies each packet exactly once.
- Room, vitals, Mapper, GPS, Context Deck, Affects, and session-tab rendering now update only when their own data changes.
- Stable character names no longer republish the complete session list on every room or vitals packet.
- Mapper and session-tab paint is coalesced without delaying terminal text, Actions, Gags, prompts, or outgoing commands.

### Fast command and multi-session flow

- Ordinary commands, Aliases, Actions, and named-character routing now send immediately; only Speedwalk remains paced.
- xterm combat output is coalesced into at most one visual write per animation frame while parsing and command delivery remain immediate.
- Bare `#character` switches to that character tab; `#character command` runs the command through that character's normal pipeline without switching.
- Speedwalk recognizes lowercase compact routes only, so `News`, `NEWS`, and other capitalized direction-shaped commands pass through literally.

- xterm live parity: pin the output/input grid rows and preserve the filtered live SGR stream.
- xterm live parity: refit after dock/window changes and use the explicit NukeFire ANSI palette.

### Fixed

- xterm.js now emits the selected NukeFire default foreground as explicit truecolor for every unstyled transcript run, preventing black-on-black base text and making foreground preference changes authoritative.
## 0.3.1-beta.12 — Experimental xterm.js Terminal Foundation

- Added xterm.js 6.0 as an optional visual terminal engine behind Preferences.
- Kept NukeFire Actions, Gags, Communications, reader text, prompts, Variables,
  session history, and command routing authoritative ahead of the visual engine.
- Added Fit, Search, and Serialize addons, persistent engine selection, safe fallback
  to the existing renderer, and ordered write/session-replacement handling.
- The NukeFire renderer remains the default until combat, session, Find/Clear, and
  screen-reader parity are confirmed on macOS and Windows.
- Settings schema advances to 20; full verification target is 255 tests.

## Beta 10 Hotfix — Repeat Last Command Preference

- Added a Command Input section to Preferences.
- Added a persistent “Repeat last command with Enter” toggle, disabled by default.
- When enabled, Enter on an empty command line repeats the most recent non-empty command.
- Secure hidden input never repeats command history.
- When disabled, blank Enter retains NukeFire pagination behavior.
- Settings schema advances to 19 with safe migration from older settings.

## Milestone 1.9c0c2 — Persistent Aliases, Actions, and NukeFire HUD

### Multi-session command features

- Added persistent global aliases with brace-aware parsing.
- Added `%0` through `%9` alias argument substitution.
- Added alias listing, inspection, replacement, and deletion.
- Added recursive alias-loop and expansion-depth protection.
- Preserved existing session, group, follower, and named-character routing.

### TinTin-style actions

- Added persistent text actions using `#action`.
- Added `%0` through `%9` wildcard captures.
- Added action priority, enable/disable, delete, list, and show commands.
- Added global `#actions on`, `#actions off`, and status controls.
- Changed normal action patterns to match anywhere in a completed line.
- Added explicit `^` and `$` boundary anchors.
- Added secure-input suppression, duplicate protection, and per-session rate limits.
- Routed generated commands through the existing bounded command queues.

### Communications

- Fixed colorized NPC names exposing NukeFire tab-color tokens.
- Preserved original terminal output and safe ANSI message colors.

### Visual identity

- Replaced the plain NF title block with a NukeFire wordmark.
- Added worn industrial HUD framing, riveted panels, and restrained toxic-green accents.
- Kept decorative effects outside the terminal reading surface.
- Reduced nonessential decoration in screen-reader mode.
- Retained the native macOS titlebar and existing keyboard behavior.

### Persistence and safety

- Upgraded the settings schema to preserve aliases and actions.
- Restores definitions without connecting sessions or sending commands.
- Retained atomic settings writes and backup recovery.
- No password storage or automatic connection behavior was added.

### Verification

- Full automated suite passes 171 tests.
- Blank Enter, GA/EOR prompt handling, GPS catalog population, GMCP,
  session isolation, mapper behavior, and accessibility regressions remain covered.

## Milestone 1.9b1 — Persistent Global Aliases

- Global aliases now survive client restarts through the existing versioned
  `settings.json` store and its atomic `settings.json.bak` recovery path.
- Settings schema advances from 11 to 12; older settings migrate safely with an
  empty alias list while preserving sessions, groups, workspace layout, and local
  preferences.
- Alias snapshots are normalized, sorted, and bounded to 256 global definitions
  with one-command bodies capped at 4096 characters. Unsafe names and embedded
  line breaks are discarded or normalized before reaching the engine.
- Defining, replacing, or deleting an alias updates the existing session snapshot
  and debounced settings-save flow. No new renderer privilege or direct file access
  was added.
- Startup restores definitions without auto-connecting, auto-sending, storing
  credentials, or changing the active command queue.
- Added engine, session restore, settings migration/persistence, and renderer
  round-trip regressions.
- Full client verification passes 154 tests.

## Milestone 1.9b0c1 — Communications Legacy Color Cleanup

- Fixed structured GMCP sender names that contained NukeFire's legacy
  TAB-introduced color tokens, which could render as fragments such as
  `+ pa Khelt Deepforger n` in the Communications metadata row.
- Communications-only normalization now removes legacy short, reset, and
  bracketed color tokens while retaining safe ANSI styling in message bodies.
- Added a regression using the reported colorized NPC sender and preserved the
  complete gossip line and main terminal output.
- No server, renderer layout, alias, Telnet, GMCP transport, settings-schema,
  GPS, mapper, Context Deck, or Affects behavior changed.
- Full client verification passes 150 tests.

## Milestone 1.9b0 — Alias Engine Foundation

- Added a standalone, DOM-free alias module and extracted the existing brace-aware
  client-command parser into a shared pure module.
- Added text commands to define, list, show, replace, and delete global aliases.
- Added `%0` for all supplied arguments and `%1` through `%9` for brace-aware
  positional arguments.
- Alias results re-enter the existing `SessionManager` routing path, so `#name`,
  `#all`, named groups, and `#followers` continue to use bounded per-session queues.
- Added direct and indirect loop detection plus a 16-expansion depth ceiling.
- Preserved blank Enter, literal `##command`, terminal focus, Telnet/GMCP transport,
  GPS catalog delivery, mapper state, and session isolation.
- Aliases are intentionally global and in-memory in this foundation interval.
  Persistence, backup recovery, scopes, enable/disable, preview, variables,
  multi-command expansion, GUI management, and Actions remain deferred.
- Expanded automated coverage for alias parsing, substitution, management, routing,
  recursion protection, and protected command behavior.
- Full client verification passes 149 tests.

## Milestone 1.8a — AFX Text List Correction

- Corrected the Affects panel's Text List button to send NukeFire's actual `afx` command.
- Added regression coverage proving the button sends `afx` through the normal command pipeline.
- No server or GMCP change.

## Milestone 1.8 — Efficient Player Affects

- Added a dockable Affects panel backed by `NukeFire.Affects`.
- Groups multi-row spell modifiers into one readable effect card.
- Counts down from absolute server expiry timestamps locally, without one GMCP message per second.
- Rerenders only when the affect revision changes and pauses countdown work while hidden.
- Adds manual GMCP refresh and the NukeFire `afx` text-command fallback.
- Omits permanent equipment, implant, tattoo, and remort rows from the live list while reporting how many were withheld.
- Added the future Wasteland HUD/logo pass to the project roadmap.
- Expanded automated coverage for affect normalization, grouping, countdowns, GMCP state, panel rendering, and requests.
- Full client verification passes 125 tests.

# Changelog

## Milestone 2.1a — NukeFire Knowledge Console

- Added the negotiated `NukeFire.Knowledge 1` GMCP family.
- Added Command-K / Control-K live Help search with stale-response protection.
- Added keyboard-complete, screen-reader-safe result and article navigation.
- Kept the server authoritative; no stale bundled wiki or client-side Help scrape.
- Established the shared console foundation for Items, Skills, Zones, and Chronicle.


## Milestone 1.7b — Large-Screen Dock Expansion

- Replaced the old 480-pixel side-dock ceiling with a generous 4096-pixel persisted limit.
- Raised the lower-dock persisted ceiling from 400 to 2160 pixels.
- Kept the live size screen-aware: the current window still reserves at least 420 pixels of terminal width and 220 pixels of terminal height.
- Large preferred sizes remain saved when the client moves temporarily to a smaller screen and become available again on a larger display.
- The accessible dock separators continue to report the actual dynamic maximum; pressing End expands a focused dock to the largest safe size for the current window.
- Added a 3840-by-2160 regression proving the right dock can exceed 2000 pixels without replacing the terminal.
- No server, GMCP, settings-schema, map-data, terminal, or command-pipeline change.
- Expanded verification to 115 passing tests.

## Milestone 1.7a — Open-Ended Number Validation Fix

- Fixed Context Deck number fields that specified only a minimum value, such as the Remort character code and Packrat retrieval slot.
- Preserved missing numeric bounds as truly unbounded when an already-normalized server action is validated a second time before sending.
- Added regression coverage confirming character ID `1893` produces the ordinary command `buy 1893`.
- No server change, settings migration, UI redesign, or terminal behavior change.
- Expanded verification to 114 passing tests.

## Milestone 1.7 — NukeFire Context Deck

- Added a seventh dockable panel that renders server-authored room services, status rows, and ordinary NukeFire actions from `NukeFire.Context`.
- Added first-class contexts for the Remorter, Longwalker, Chromatic Ink-Master, Packrat storage, generic Zone Intelligence, Wasteland Prospector, and active random-engine mines.
- Added validated text, number, and select arguments so service forms remain keyboard-complete without duplicating game rules in JavaScript.
- Destructive actions require explicit confirmation; the server still validates every requirement and remains authoritative.
- Added automatic context refresh on login, room changes, manual Refresh, and shortly after an action is sent.
- Added controlled screen-reader summaries, no color-only status, stable command focus, and settings-schema 9 persistence for the new panel.
- Preserved the existing terminal, blank-Enter paging, scrolling, Communications, mapper, GPS Navigator, Telnet, and ANSI pipelines.
- Expanded verification to 113 passing tests.

## Milestone 1.6d — Searchable GPS Navigator

- Added a searchable, grouped GPS destination dropdown to the Mapper panel.
- Catalog search covers destination names, numeric GPS codes, rooms, zones, categories, difficulty labels, aliases, and tags.
- Selecting a destination sends the existing authoritative `gps set <code>` command; route calculation remains entirely server-side.
- Added Clear GPS and Reload List controls with keyboard-complete native form elements.
- Added chunked `NukeFire.GPS.Catalog` GMCP support so the full server destination table stays below GMCP packet limits.
- Added structured catalog assembly, duplicate-page safety, active-destination matching, and accessibility status text.

## Milestone 1.6c1 — Direct SVG Terrain Colors

- Writes each mapper room's terrain fill and border directly onto the SVG square.
- Removes reliance on CSS custom properties for SVG paint resolution.
- Keeps current-room, selected-room, GPS-route, and destination outlines layered above the terrain color.
- No server, settings, persistence, terminal, or GMCP format changes.

## Milestone 1.6c — Terrain-Colored Cartography

- Added stable terrain fills for NukeFire sector names while keeping every room node an empty square.
- Preserved terrain color beneath current-room, selected-room, GPS-route, and destination outlines.
- Added mappings for inside, city, field, forest, hills, mountain, water, deep water, air, underwater, ocean floor, space, desert, wasteland, road, swamp, ice, and lava.
- Kept unknown or custom terrain safe with a neutral fallback.
- Added terrain to map accessibility labels and selected-room summaries so terrain is never conveyed by color alone.
- No server change is required because `NukeFire.Map.Local` already includes each room's terrain string.

## Milestone 1.6b — NukeFire Live Cartography

- Replaced large labeled map cards with compact empty square room nodes; all room details remain in the panel.
- Added `NukeFire.Map.Local` GMCP support and advertised `NukeFire.Map 1`.
- Merges server-supplied BIGMAP coordinates into the persistent client map instead of relying only on movement guesses.
- Uses BIGMAP-visible exits, collision choices, planes, zones, and local cross-zone stubs.
- Preserves GPS route rooms, route links, destination, step count, and raw route data for visual overlays.
- Keeps Room.Info movement learning as a fallback for older server builds.
- Added route and destination styling without putting text or symbols inside room nodes.
- Expanded verification to 104 passing tests.

## Milestone 1.6a — Persistent Mapper Foundation

- Added Mapper as a sixth dockable, resizable, tab-compatible panel.
- Added persistent `map.json` storage with atomic writes and `.bak` recovery.
- Learns rooms from `Room.Info` GMCP and only creates links after a pure directional command is followed by a confirmed room change.
- Keeps teleport, recall, portal, and other unconfirmed room changes as separate map components rather than inventing exits.
- Stores one shared room graph with separate visited-room and view state for each character.
- Added pan, zoom, recenter, room selection, current-room highlighting, vertical-exit markers, and accessible room/exits summaries.
- Advanced workspace settings to schema 8 so Mapper visibility, dock, order, and tab state persist safely.
- Preserved terminal output, scrolling, blank-Enter paging, command history, Communications, Telnet, and GMCP transport behavior.
- Expanded verification to 100 passing tests.

## Milestone 1.5b — Communications Pop-Out Window

- Communications can move into a separate native window, resize, move between monitors, remember bounds per character, and dock back into the main workspace.
- The pop-out preserves channel filters, search, unread counts, truecolor output, accessibility semantics, and theme choices.
- Closing the pop-out safely restores the docked panel.


## Milestone 1.5a2 — Styled Communications

- Preserved standard ANSI, 256-color, and truecolor styling in Communications message bodies.
- Kept normalized plain text separately for search, duplicate detection, and screen-reader output.
- Rendered styled messages with safe DOM spans through the same ANSI parser used by the terminal.
- Upgraded a plain GMCP entry when its matching richer colored terminal line arrives later.
- Removed OSC, cursor movement, erase, and other non-style terminal controls from captured messages.
- Applied the terminal monochrome preference consistently to Communications output.
- Kept the main terminal, command pipeline, scrolling, Telnet, and GMCP transport unchanged.

## Milestone 1.5a1 — Communications Cleanup

- Strip complete ANSI, truecolor, OSC, and C1 terminal formatting from GMCP communication text before display.
- Deduplicate the structured GMCP copy against the matching terminal-text copy in either arrival order.
- Compare normalized message payloads rather than allowing the separately supplied sender field to defeat duplicate detection.
- Added regressions for NukeFire's colored `NukeFire.Comms.Message` payload and conventional message-only `Comm.Channel` payloads.
- Kept main terminal rendering, scrolling, command input, docks, tabs, and settings schema unchanged.
- Expanded regression coverage to 80 passing tests.

## Milestone 1.5a — Communications Panel

- Added Communications as a fifth reusable panel, initially visible in the lower dock.
- Added All, Gossip, Newbie, Group, Tell, Auction, and System filters with keyboard-complete tab navigation.
- Added timestamps, unread counts, search, clear, and a bounded 500-message in-memory history.
- Preserved every communication line in the main terminal; the panel receives a copy rather than redirecting output.
- Added structured `Comm.Channel` and `NukeFire.Comms.Message` GMCP ingestion.
- Added conservative split-safe text fallback that ignores ordinary room, combat, and command output.
- Added duplicate suppression when equivalent GMCP and text copies arrive together.
- Added per-character persistence for the selected communications filter.
- Upgraded the settings schema from 5 to 6 with safe defaults for the new panel and filter state.
- Kept the terminal output node, command input, output-follow behavior, blank-Enter paging, Telnet framing, and existing GMCP state flow intact.
- Expanded regression coverage to 77 tests, including classification, split chunks, GMCP messages, filters, search, unread counts, keyboard navigation, persistence, and terminal preservation.

## Milestone 1.4c — Tab Groups

- Added optional tab groups inside the left, right, and lower dock regions.
- Added panel-menu actions to join the previous or next panel as tabs and to separate a panel again.
- Added keyboard-complete tab lists with Arrow keys, Home, End, and standard Tab navigation.
- Added per-character persistence for tab-group membership and the selected tab.
- Hidden panels remain part of their saved group without producing empty dock space.
- Moving a panel to another dock safely separates it from its former tab group.
- Restore Default Layout now also restores independent, ungrouped panels.
- Upgraded the settings schema from 4 to 5 with safe tab-group migration defaults.
- Kept the terminal output node, command input, scroll following, blank-Enter paging, Telnet, and GMCP transport unchanged.
- Expanded regression coverage to 68 tests, including grouping, selection, keyboard navigation, separation, character restore, and terminal preservation.

## Milestone 1.4b — Resizable Dock Regions

- Added visible resize separators between the terminal and the left, right, and lower docks.
- Added pointer dragging for changing left/right width and lower-dock height.
- Added keyboard resizing with Arrow keys, Shift plus Arrow for larger steps, Home for minimum, and End for the largest safe size.
- Added double-click reset for each dock separator.
- Preserves a minimum game-terminal width and height while resizing or shrinking the application window.
- Saves default dock sizes before login and character-specific sizes after GMCP identifies the active character.
- Restore Default Layout now restores both panel placement and dock dimensions.
- Upgraded the settings schema from 3 to 4 with validated dock-size migration and bounds.
- Kept the terminal output node, command input, output-follow behavior, blank-Enter paging, Telnet, and GMCP transport unchanged.
- Expanded regression coverage to 61 tests, including pointer resizing, keyboard resizing, character persistence, settings migration, and terminal preservation.

## Milestone 1.4a — Docking Foundation

- Added left, right, and lower dock regions around the existing terminal.
- Wrapped Vitals, Quick Commands, NukeFire State, and Protocol in reusable panel title bars.
- Added keyboard-accessible panel menus for moving panels left, right, below, earlier, or later.
- Added character-specific persistence for panel dock region and order.
- Added a Restore Default Layout action while retaining independent panel visibility controls.
- Automatically collapses empty dock regions so unused panel space returns to the terminal.
- Upgraded the settings schema from 2 to 3 with safe migration defaults.
- Kept the existing terminal output element, command input, scroll handling, pagination, Telnet, and GMCP transport unchanged.
- Added docking, keyboard navigation, persistence, migration, and terminal-preservation regression coverage.

## Milestone 1.3c — Workspace Metadata

- Added Preferences controls for showing or hiding Vitals, Quick Commands, NukeFire State, and Protocol Diagnostics.
- Added character-specific panel visibility once GMCP identifies the active character.
- Added a reset action that restores the four built-in sidebar panels.
- Upgraded the versioned settings schema to preserve workspace metadata safely.
- Kept the terminal grid, output scrolling, command input, Telnet, and GMCP transport behavior unchanged.

## Unreleased

### Milestone 1.9a — Multi-Session Core

#### Added

- Concurrent NukeFire sessions, each with its own TCP/Telnet connection, ANSI parser,
  GMCP snapshot, output buffer, command history, vitals, Communications, Affects,
  Context Deck, and mapper movement state.
- Accessible session tabs with connection state, role, unread activity, keyboard tab
  navigation, session creation, closing, and role editing.
- TinTin-style direct routing with `#session`, `#name command`, `#all command`,
  named `#group` targets, `#leader`, `#role`, and `#followers command`.
- Bounded per-session command queues with an 80 ms default pacing interval.
- Settings schema 11 persistence for up to 24 sessions and 32 session groups.
- Renderer-side session runtime and coordinator regression suites.

#### Changed

- The Electron main process now owns a `SessionManager` rather than one global
  `ConnectionManager`; legacy single-session IPC remains as a compatibility shim.
- Client version advanced to 0.3.0.
- The Wasteland HUD visual pass remains recorded but paused until session control,
  aliases, and actions have a dependable foundation.

#### Tests

- Multi-session routing, followers, restoration, queue bounds, independent output,
  inactive-session unread state, session creation, settings persistence, and
  accessibility semantics are covered by automated tests.


### Added

- Keyboard-accessible Preferences dialog opened from the header gear or Command-comma.
- Application-menu Preferences command with focus restoration and modal keyboard containment.
- Versioned `settings.json` persistence owned by the Electron main process.
- Atomic settings writes with a retained `settings.json.bak` recovery copy.
- One-time migration of the existing local terminal, connection, display, and accessibility preferences.
- Safe persistence for Follow Output and Compact Output without changing the terminal layout.
- Persistent terminal color themes with NukeFire, Amber CRT, Green CRT, Ice Blue, and Custom presets.
- Independent terminal foreground and background color controls.
- Optional monochrome output mode that overrides ANSI foreground/background colors while preserving text styling.
- Visible contrast-ratio feedback with a warning below 4.5:1.
- NukeFire-aware structured GMCP state store for character, room, group, GPS,
  target affects, channel lists, and bounded channel history.
- Case-insensitive GMCP package normalization, including NukeFire's lower-case
  `group` and `group.remove` packages.
- Live NukeFire State panel for character, room, and group information.
- Dynamic NAWS terminal measurement and resize reporting.
- UTF-8 CHARSET and terminal-type diagnostics in the Protocol panel.
- Screen-reader MTTS capability negotiation before connection.
- Initial GMCP state requests after `Core.Supports.Set`.

### Changed

- Display and accessibility controls no longer occupy permanent sidebar space.
- Clear Output now lives in the terminal toolbar as an immediate terminal action.
- Vitals now consume NukeFire's actual `mhp`, `mmana`, and `mmove` GMCP fields.
- The GMCP support list now covers the NukeFire character, room, communication,
  GPS, target-affect, and group packages.
- Quick-command and Send buttons restore focus to command input after sending.
- MCCP remains deliberately declined while the NukeFire compression hooks are
  inactive.

### Tests

- Added Preferences placement, keyboard opening/closing, focus restoration, menu wiring, and isolation coverage.
- Added settings-store tests for legacy migration, safe defaults, backup creation, and damaged-primary recovery.
- Added renderer coverage for loading versioned settings and debounced preference saves without changing terminal behavior.
- Added structured GMCP store tests for package normalization, group removal,
  channel history, and detached snapshots.
- Added connection-manager tests for GMCP startup requests, dynamic NAWS, and
  screen-reader preference forwarding.
- Added renderer tests for real NukeFire vitals, live state, command-button
  focus, terminal measurement, and pre-connect accessibility preferences.
- Expanded Telnet tests for split framing, UTF-8 CHARSET, TTYPE/MTTS cycling,
  dynamic NAWS, duplicate negotiation suppression, and bounded subnegotiation.

## 0.2.0 — Milestone 1

### Added

- Working Electron desktop connection to NukeFire on macOS.
- Streaming Telnet negotiation and GMCP capture.
- ANSI and UTF-8 terminal rendering.
- Command input and history.
- Scrollback, find, font sizing, compact mode, and basic vitals.
- Automated Telnet, ANSI, and renderer smoke tests.

## Milestone 1.7c — Resizable Mapper Canvas

- Increased the default map canvas height from the old 240-pixel flex basis to 360 pixels.
- Added a dedicated horizontal map-height separator directly below the SVG map.
- Dragging the separator changes only the map canvas height without changing the side-dock width or terminal layout.
- Keyboard controls support Arrow keys, larger Shift steps, Home for minimum, End for maximum, and double-click to restore 360 pixels.
- Map height is saved per character in `map.json` with a safe range of 220 through 1600 pixels.
- Added accessible separator values and regression coverage for persistence and keyboard resizing.
- No server, GMCP, GPS, BIGMAP, terminal, Communications, or Context Deck behavior changed.

## Milestone 1.7c1 — Mapper Live-Update Reliability

- Fixed a persistence race that could replace the active mapper graph with an older `map.json` save acknowledgement.
- Room.Info and NukeFire.Map.Local remain authoritative while map saves run in the background.
- Resizing the mapper no longer risks dropping the next room or making the live map appear frozen.
- Safely handles pointer-capture release when a resize ends outside the separator.
- Added a delayed-save regression proving movement continues after mapper resizing.

## Milestone 1.9c0 — Actions Engine Foundation

### Added

- Persistent global `#action` definitions with TinTin-style `%1` through `%9`
  wildcard captures and `%0` for the complete matched line.
- Priorities from 1 through 9, with the lowest number firing first when multiple
  actions match the same completed server line.
- `#action list`, `#action show`, `#action delete`, `#action enable`, and
  `#action disable` management commands.
- Persistent `#actions on`, `#actions off`, `#actions status`, and `#actions list`
  master controls.
- Complete-line buffering so split network chunks never trigger an action early.
- Per-session duplicate suppression and a five-command-per-second action ceiling.

### Safety

- Actions match cleaned visible server text while leaving terminal output untouched.
- Secure hidden-input mode suppresses all action execution.
- Actions generate at most one command and use the existing alias, routing, and
  bounded per-session queue pipeline rather than writing to sockets directly.
- Client-management commands are blocked when generated by an action, including
  when hidden behind an alias.

### Persistence

- Settings schema advances from 12 to 13 with a top-level `actions` snapshot.
- Existing settings migrate with Actions enabled and no definitions.
- Restoring Actions never connects a session or executes a command.

### Deferred

- Named action groups and group-level on/off controls are planned for 1.9c1.
- Preview/debug output, raw regular expressions, multi-command actions, GMCP
  triggers, per-character scopes, import/export, and GUI management remain later.

## Milestone 1.9c0c1 — TinTin-Style Action Matching

### Fixed

- `#action {gossips} {smile}` now matches a completed line such as
  `Rambo gossips, 'Hello'` instead of requiring the line to equal only `gossips`.
- Action patterns match anywhere in the cleaned visible line by default, consistent
  with familiar TinTin++ trigger behavior.
- A leading `^` and trailing `$` may be used to require start-of-line and end-of-line
  matching when an exact boundary is desired.

### Unchanged

- `%0` still expands to the complete cleaned line, `%1` through `%9` remain wildcard
  captures, and only the highest-priority matching action fires.
- Persistence, secure-input suppression, duplicate/rate protection, existing command
  routing, terminal rendering, and settings schema 13 are unchanged.

## Milestone 1.9c0c2 — NukeFire Wasteland HUD

### Changed

- Replaced the temporary `NF / NukeFire Client` header treatment with a compact,
  locally packaged NukeFire wordmark derived from the supplied project artwork.
- Added subtle industrial HUD framing around the application edges, connection
  strip, session tabs, dock panels, title bars, terminal chrome, and input strip.
- Shifted decorative accents toward worn steel, restrained rust, and toxic
  hazard-green while leaving user-selected terminal foreground/background colors
  untouched.

### Accessibility and safety

- The logo remains decorative with `alt=""`; the semantic `NukeFire Client`
  heading and brand label remain available to assistive technology.
- Decorative wear never overlays terminal text and carries no status information.
- Screen-reader mode removes nonessential outer-frame, scratch, and rivet layers.
- No animation, layout replacement, custom titlebar, or functional pipeline change
  was introduced.

## Milestone 1.9c0c4 — First Tester Feedback

### Fixed

- Live-output snapback now follows incoming MUD text whenever the preference is on,
  even when the player has scrolled back. The preference remains on by default, and
  an explicit saved off choice is preserved.
- Alias substitution now treats the highest numbered positional placeholder used in
  the alias body as the remaining argument tail. `#alias tz {telepath wolves %1}`
  followed by `tz hi whats up` expands to `telepath wolves hi whats up`; with
  `tell %1 %2`, `%1` remains the first word and `%2` receives the remaining words.
- Communications now renders newest messages first in both the docked and pop-out
  views. The live edge is at the top, while reviewing older messages preserves the
  reader's approximate position as new entries arrive.
- Three-dot panel menus are moved into a fixed top-level overlay layer, preventing
  panel text and neighboring panels from painting over or clipping the menu.

### Accessibility and safety

- Panel-menu Arrow keys, Home/End, Escape, outside-click dismissal, menu semantics,
  and focus return to the originating button remain intact.
- Communications filtering, search, unread counts, ANSI-safe rendering,
  deduplication, bounded history, and per-session isolation remain unchanged.
- Settings schema remains 14. Client version advances to `0.3.1-beta.3`.


## Milestone 1.9c0c5 — Multi-Command Actions

### Added

- Action bodies may contain up to 10 top-level semicolon-separated commands.
  `#action {gossips} {smile;look;poke bob}` sends those three commands in order.
- Braces and single- or double-quoted text protect embedded semicolons. `\;` emits
  one literal semicolon within an outgoing command.
- Every generated command continues through global aliases, named-session/group
  routing, and the existing paced bounded queues.

### Safety

- Command templates are split before `%0` through `%9` substitution, preventing
  captured server text from injecting additional action commands.
- The complete burst is checked before the first command is sent. A malformed list,
  more than 10 commands, recursive alias failure, empty alias result, or protected
  client-management directive blocks the entire firing.
- The per-session limiter now counts generated commands rather than trigger events,
  with a ceiling of 10 commands per second plus existing duplicate suppression.
- Secure-input suppression, action priority, persistence, settings schema 14, GMCP,
  mapper, Communications, panel overlays, and terminal behavior are unchanged.
- Client version advances to `0.3.1-beta.4`.

## Milestone 1.9c0c6 — Persistent Gag Rules

- Added persistent global `#gag` definitions and `#gags` master controls.
- Gags share Action substring matching, `%1`–`%9` wildcards, and `^`/`$` boundaries.
- Matching completed text is suppressed from terminal and reader history while
  recognized channel lines remain available in Communications and its pop-out.
- Actions and Communications still receive the original line, while generated Actions cannot alter Gags.
- Prompt-boundary flushing preserves GA/EOR prompts; oversized lines fail open.
- Structured communication GMCP remains authoritative and deduplicates against hidden text copies.
- Settings schema advances to 15; client version advances to `0.3.1-beta.5`.
- Full verification target: 197 tests.

## Milestone 1.9c0c7 — Tester-Approved First-Run Workspace

- Changed fresh workspace defaults to match the first testing layout: Affects and
  Communications on the left; Mapper and Context Deck as a right-side tab group with
  Mapper selected; Vitals below.
- Quick Commands, NukeFire State, and Protocol remain hidden by default.
- Added schema-16 migration for untouched beta.5 workspace records without changing
  customized character or default layouts.
- Advanced the client to `0.3.1-beta.6`; the existing GitHub beta-tag workflow still
  produces macOS universal DMG/ZIP and Windows x64 installer/portable packages.
- Full verification target: 200 tests.

Milestone 1.9c0c8 — TinTin-Style Compact Speedwalks

- Added persistent `#speedwalk on`, `off`, `status`, and `stop` controls; fresh settings default on and explicit off remains persistent.
- With Speedwalk enabled, ordinary compact routes such as `eeennnee`, `4e3s19e`,
  and mixed counted/repeated forms expand after aliases into one-letter movement commands.
- Routes accept only `n`, `e`, `s`, `w`, `u`, and `d`, ignore whitespace, and are
  fully validated before any step is queued.
- Expanded routes are capped at 200 steps and use the existing bounded paced
  per-session queue. A manual ordinary command cancels unsent route steps.
- `\news` bypasses compact parsing and sends `news` literally when a direction-only
  word would otherwise be interpreted as a route.
- Each actual speedwalk movement emits a session-tagged event for mapper tracking.
- Actions cannot control Speedwalk or generate compact routes; aliases may expand to routes.
- Settings schema 17; version 0.3.1-beta.7; full verification target 218 tests.

## Milestone 1.9c0c9 — NukeFire Native App Icon

- Added the approved square industrial NF emblem as the client’s native application icon.
- Generated a transparent 1024-pixel PNG, macOS ICNS representations, and a Windows ICO
  containing common taskbar, Explorer, Start-menu, and installer sizes.
- Wired Electron Builder to use the ICNS for universal macOS packages and the ICO for
  Windows installer, uninstaller, portable, and application executables.
- Applied the PNG to live BrowserWindows and the macOS development Dock without placing
  decorative image content in terminal or screen-reader output.
- Preserved the completed TinTin-style Speedwalk parser, queue, mapper, persistence,
  and safety behavior; fresh settings now begin with Speedwalk enabled while an explicit
  saved off choice remains respected.
- Client version advances to `0.3.1-beta.8`; full verification target: 221 tests.

## Milestone 1.9c1 — Fast Combat Terminal Pipeline

- Batches rapid visible terminal runs into one animation-frame DOM flush instead of
  appending every network chunk separately.
- Keeps ANSI parsing, Actions, Gags, Communications capture, reader state, vitals
  fallback, prompt handling, session bookkeeping, commands, and Speedwalk immediate.
- Coalesces adjacent runs with identical ANSI presentation in both stored session
  history and rendered output, with each run capped at 32,768 characters.
- Replaces repeated whole-terminal `textContent` scans with tracked rendered-character
  counts and incremental oldest-node trimming.
- Updates the line counter and live-follow scroll once per visual flush.
- Resolves pending visual output before session changes, searches, settings snapshots,
  prompt-line termination, and output clearing.
- Adds four focused renderer tests; full verification target is 225 tests.
- Client version advances to `0.3.1-beta.9`; release remains pending Mac verification.

## Milestone 1.9c4 — Multi-Command Aliases

- Alias bodies may contain up to 10 top-level semicolon-separated commands.
  `#alias kk {smile;look;score}` sends all three commands in order through the
  existing paced session queue.
- Braces and quotes protect embedded semicolons; `\;` sends one literal semicolon.
- Alias templates are split before `%0`–`%9` substitution so arguments cannot inject
  extra commands.
- Nested aliases remain depth- and recursion-bounded. Expanded Action bursts remain
  fully validated and capped at 10 commands before anything is sent.
- Terminal batching, c2 low-latency rendering, c3 scrollback trimming, Speedwalk,
  accessibility, Communications, Mapper, and settings schema are unchanged.

## Milestone 1.9b2 — Persistent Global Variables

- Added bounded persistent global Variables with `#variable`, `#variables`, and
  `#unvariable` command management.
- Added `%name` and `%{name}` expansion in direct commands, multi-command Aliases,
  Actions, escaped server commands, and routed session/group commands.
- Added `%%` and `\%` literal-percent escapes while preserving Action `%0`–`%9`
  captures and Alias `%0`–`%9` arguments.
- Variable expansion occurs only after Alias and Action command lists are split, so
  semicolons inside values cannot inject additional commands.
- Nested values are capped at 16 levels, 256 definitions, 4,096 characters per
  stored value, and 16,384 expanded characters. Recursive loops send nothing.
- Actions cannot generate variable-management directives, even through a variable
  or Alias, and retain their atomic 10-command validation and rate limits.
- Settings schema advances to 18 and persists Variables atomically beside Aliases,
  Actions, Gags, Speedwalk, sessions, and workspace metadata.
- Client version advances to `0.3.1-beta.10`; full verification target is 240 tests.

## Milestone 2.0b2 — Removable Built-in Quick Commands

- The six shipped Quick Command buttons can now be removed individually from
  Preferences without affecting their underlying game commands.
- Removed built-ins remain listed with a Restore control, and Restore All returns
  the complete starter set. Custom Quick Commands remain editable, reorderable,
  disableable, and deletable.
- Removed built-in ids are normalized and persisted in settings schema 22; unknown
  or duplicate ids are discarded safely.
- All controls are ordinary keyboard-reachable buttons with explicit accessible labels.

### beta.20 explored-map/performance v2 correction

- Preserved immediate Communications rendering; no frame-delayed channel panel updates.
- Corrected mapper DOM coverage to identify the current room by room id rather than SVG insertion order.
- Retained persistent explored-map viewport rendering, wheel zoom, cheap drag transforms, coalesced map saves, and terminal/xterm string reductions.
- Restored legacy direct Char.Vitals compatibility so screen-reader Read Vitals always sees current values.

### beta.20 TinTin Import Button Hotfix

- Added immediate Importing feedback, visible success/error results, direct settings
  persistence, and protected failure handling to the TinTin alias/action importer.
- Added a renderer integration regression that pauses session synchronization and
  confirms the button reports progress before completing the import.

### beta.20 TinTin Live Definition Synchronization Hotfix

- Added a narrow Electron bridge that replaces only the live Alias and Action
  definitions without rebuilding or reconnecting sessions.
- TinTin import now verifies the SessionManager snapshot before reporting success,
  so imported aliases appear under `#alias` and execute immediately.
- Undo uses the same verified synchronization path; imported Actions remain disabled.
- Added a SessionManager regression proving a synchronized alias is listed and then
  expands through the connected session command pipeline.


## 0.3.1-beta.23 — Vitals display hotfix

- Added separate main and group H/M/V formats: values, values plus percentage, percentage only, or current only.
- Added compact, standard, and large tabular-number sizing for the Vitals panel and popout.
- Group rows now use responsive H/M/V columns instead of one clipped line.
- Group Vitals hides the active character's duplicate row by default while retaining every member in Group Targets.

## Brighter interface and scrollback copy

- Preferences now offers Original Dark, Brighter, and High Contrast interface modes. The setting brightens client panels, borders, controls, and labels without rewriting NukeFire ANSI colors.
- Selected terminal scrollback can now be copied with Command-C on macOS or Ctrl-C on Windows and Linux. Edit → Copy uses the same safe clipboard path.

## 0.3.1-beta.24 — MNES and Safe OSC 8 Links

- Added Telnet NEW-ENVIRON option 39 negotiation and MNES responses for
  `CHARSET`, `CLIENT_NAME`, `CLIENT_VERSION`, `MTTS`, and `TERMINAL_TYPE`.
- Added the MNES MTTS capability bit and an `INFO` update when screen-reader mode
  changes the active MTTS bitvector.
- Advertises Mudlet-compatible `OSC_HYPERLINKS`, `OSC_HYPERLINKS_SEND`, and
  `OSC_HYPERLINKS_PROMPT` user variables only after NEW-ENVIRON negotiation.
- Preserves validated OSC 8 metadata through ANSI parsing, session history,
  terminal batching, xterm rendering, and session restoration.
- Added isolated `http:`/`https:` browser links, protected `send:` command links,
  and non-executing `prompt:` input links. Unsafe and malformed schemes remain
  visible as plain text and never execute.
- Added hover descriptions, screen-reader announcements, Protocol-panel status,
  and command-line `#links` / `#link <number>` access for keyboard users.
- Package version advances to `0.3.1-beta.24`; full verification target: 402 tests.


## 0.3.1-beta.25 — Custom Mapper Sections

- Added independent visibility controls for the GPS Navigator, map and controls, and current-room information inside the Mapper pane.
- Added matching checkbox commands to the Mapper panel menu for fast per-pane customization.
- Preserved the existing exit-list preference and full Mapper layout as the default for existing users.
- Mapper section choices persist through the normal settings store and follow popped-out Mapper windows.

### beta.25 Mapper visibility hotfix

- Fixed the GPS Navigator visibility control so the section is actually removed from layout when disabled, including in popped-out Mapper windows.
- Removed the visual map-symbol legend and long BIGMAP/GPS diagnostic footer from beneath the map while retaining a non-live screen-reader status description.

### beta.25 Input-preserving hotkey hotfix

- Keyboard shortcuts no longer replace the prepared command in the input bar or enter shortcut-generated commands into repeat-Return history.
- Movement shortcuts remain usable while ordinary command text is being edited, while secure input, dialogs, disabled shortcuts, and non-movement editing safeguards remain intact.
- Added regression coverage proving `kill` remains prepared while numpad movement sends and blank Return still repeats the last manually entered command.

## 0.3.1-beta.26 — Client Command Help

- Added `#help` to print a categorized list of every supported client-command family.
- Added `#help <command>` with prefix-aware syntax and focused notes for aliases, variables, actions, gags, classes, flow control, sessions, routing, links, and literal-prefix escaping.
- Added safe related-topic resolution and a clear unknown-topic response.
- Added `docs/CLIENT-COMMANDS.md` as the complete readable client-command reference.
- Package version advances to `0.3.1-beta.26`; full verification target: 410 tests.

## 0.3.1-beta.27 — Local Showme

- Added `#showme {text}` and `#show {text}` for bounded local session output without network delivery.
- Preserved variable expansion, aliases, Actions, delays, loops, repetition, routing, custom prefixes, terminal output, and screen-reader text.
- Kept local display outside Communications and vitals parsing while allowing the established Action path to observe the original local line.
- Left TinTin `#echo` formatting for a later focused interval rather than providing a misleading alias.

## 0.3.1-beta.28 — TinTin Highlights

- Added persistent `#highlight`/`#high` definitions with show, enable, disable, delete, and `#unhighlight`/`#unhigh` removal commands.
- Added TinTin-style literal, anchored, `%1`–`%9`, and `%*` matching with priority-ordered overlap resolution.
- Added familiar named colors, TinTin `<abc>` color codes, light/dark, underline, reverse, italic, reset, and background styling.
- Highlights alter visual terminal runs only; Actions, Gags, Communications, vitals, Find, copy, and screen-reader text retain the original content.
- Added persistent settings and TinTin class save/clear/load support without changing the outgoing command pipeline or settings UI.
- Package version advances to `0.3.1-beta.28`; full verification target: 431 tests.

## 0.3.1-beta.29 — TinTin Substitutes

- Added persistent `#substitute`/`#sub` definitions with show, enable, disable, delete, and `#unsubstitute`/`#unsub` removal commands.
- Added literal, anchored, `%1`–`%9`, and `%*` matching with `%0`–`%9` capture reuse, `%%` literal-percent output, and priority-ordered overlap resolution.
- Substitutions run once per completed visible line before Highlights; replacement text is never recursively substituted.
- Preserved original server text for Actions, Gags, Communications, and vitals while terminal review, Find, copy, and screen-reader output use the substituted display text.
- Preserved captured ANSI styling and safe OSC 8 link metadata, with bounded output and replacement counts.
- Added persistent settings and TinTin class save/clear/load support without changing the outgoing command pipeline or settings UI.
- Package version advances to `0.3.1-beta.29`; full verification target: 444 tests.

## 0.3.1-beta.30 — TinTin Macros

- Added persistent `#macro`/`#mac` definitions with show, enable, disable, delete,
  and `#unmacro`/`#unmac` removal commands.
- Added physical-key support for F1–F24, navigation keys, numpad keys, and familiar
  Ctrl, Alt/Option, Shift, and Command modifier chords.
- Macro command lists run sequentially through the unified outgoing pipeline while
  preserving prepared input and manual repeat-Return history.
- Added secure-input, dialog, Preferences, Find, composition, held-key repeat, and
  editable-form guards without changing existing configurable keyboard shortcuts.
- Added persistent settings, custom-prefix migration, session snapshot, and TinTin
  class save/clear/load support.
- Package version advances to `0.3.1-beta.30`; full verification target: 457 tests.

## 0.3.1-beta.31 — TinTin command-line batches

- Adds up to twenty brace-aware, quote-aware, top-level semicolon-separated commands directly in the command bar.
- Runs ordinary MUD commands and client commands in one ordered line through the existing unified pipeline.
- Preserves semicolons inside braces and quotes; `\;` sends one literal semicolon in ordinary server text.
- Validates the complete line before execution, so malformed or oversized batches send nothing.
- Lets a session activated earlier in a batch become the source for later commands.
- Keeps the complete typed batch as one history entry and correctly classifies mixed client/server lines for connection and prompt handling.
- Package version advances to `0.3.1-beta.31`; full verification target: 463 tests.

## 0.3.1-beta.32 — Prefix-aware command history

- Added case-insensitive, start-anchored history filtering when text is already typed
  at the end of the command line.
- Kept blank-input Up/Down traversal unchanged.
- Down restores the exact original draft after the newest matching command.
- Manual edits cleanly exit history navigation.
- Preserved independent prefix, position, draft, and command text per session.
- Kept secure input, macros, prepared-input shortcuts, semicolon batches, and
  blank-Return repeat behavior unchanged.
- Package version advances to `0.3.1-beta.32`; full verification target: 469 tests.

## 0.3.1-beta.33 — Panel and Mapper text

- Added persistent full and compact panel-label modes in Preferences.
- Compact mode uses readable visual labels such as Stats, Buffs, Comms, Console,
  and Map while retaining full accessible panel names.
- Added Mapper room-text modes for status marks only, full room numbers, or
  bounded short room names.
- Preserved current-room, route, and GPS destination marks in every Mapper mode.
- Kept the complete accessible Mapper summary unchanged and prevented visual room
  labels from creating duplicate screen-reader output.
- Synchronized visual panel labels with dock headings, tab groups, and popped-out
  panel window titles while retaining full pop-out aria labels.
- Advanced the settings schema to 33.
- Package version advances to `0.3.1-beta.33`; full verification target: 475 tests.

## 0.3.1-beta.34 — Optional pipeline debug

- Added optional, per-session `#debug pipeline` tracing with on, off, status, show,
  and clear operations.
- Traces manual input and batch splitting, dispatch origins, Aliases, Variables,
  routing, Speedwalk recognition, sends, macros, Actions, Gags, Substitutes, and
  Highlights without introducing a second command path.
- Added a bounded Protocol-panel log with Copy and Clear controls plus active-session
  retention choices of 100, 200, or 500 entries in Preferences.
- Secure input replaces command and server details with a fixed redaction notice.
- Disabled mode uses lazy trace factories so detailed messages are not built during
  ordinary play.
- Advanced the settings schema to 34.
- Package version advances to `0.3.1-beta.34`; full verification target: 485 tests.

## 0.3.1-beta.35 — Genuine TinTin Echo

- Added local `#echo {format} {arguments...}` output as a distinct command from
  trigger-capable `#showme`.
- Added bounded `%s`, `%d`, `%f`, `%g`, `%t`, `%c`, `%a`, `%%`, field-width,
  alignment, and precision formatting for the common TinTin Echo workflow.
- Added safe foreground color output from familiar highlight names and documented
  TinTin `<abc>` color codes; arbitrary terminal control input remains stripped.
- Echo output may be Substituted and Highlighted and is available to terminal,
  Find, copy, and screen-reader review without entering Communications or vitals.
- Echo-generated lines never trigger Actions, including Echo commands launched by
  Actions, aliases, loops, delays, repeats, macros, routing, or command batches.
- TinTin paste analysis now accepts `#echo` inside otherwise compatible imported
  aliases and Actions.
- Row positioning and the remaining specialized TinTin format catalog remain
  deliberately deferred.
- Package version advances to `0.3.1-beta.35`; full verification target: 495 tests.

## 0.3.1-beta.36 — Safe TinTin script reads

- Added `#read`, `#read {Prime}`, and `#read {prime.tin}` using a visible
  `Documents/NukeFire Client/Scripts` folder without conflicting with session routing.
- Added strict extensionless/`.tin` resolution, case-insensitive matching, UTF-8
  validation, a two-megabyte limit, and rejection of paths, symlinks, and other extensions.
- Added an atomic TinTin file parser for Aliases, Variables, Actions, Gags, Highlights,
  Substitutes, Macros, comments, alternate command characters, and class membership.
- Added familiar `#OK:` load totals and explicit skipped-command warnings; unsupported
  Functions, nested reads, shell commands, and raw login commands are never executed.
- Added exact live-definition and class rollback when parsing, replacement, or persistent
  settings saving fails. Actions cannot initiate disk reads.
- Package version advances to `0.3.1-beta.36`; full verification target: 511 tests.

## 0.3.1-beta.37 — Safe TinTin script writes

- Added `#write`, `#write {Prime}`, and `#write {prime.tin}` using the same visible
  `Documents/NukeFire Client/Scripts` boundary as `#read`.
- Added deterministic export for Aliases, Variables, Actions, Gags, Highlights,
  Substitutes, Macros, enabled states, class membership, saved class snapshots,
  and the active class stack.
- Added exact supported-state `#write`/`#read` round-tripping with reversible
  structural escaping and preserved alternate client command prefixes.
- Added atomic same-directory replacement for existing regular files and rejection
  of paths, symlinks, directories, unsafe names, unsupported extensions, empty
  output, excessive output, and Action-originated writes.
- Extended safe reads to understand writer-emitted category toggles, disabled
  definitions, saved-class operations, and active-stack restoration without
  executing arbitrary commands.
- Package version advances to `0.3.1-beta.37`; full verification target: 522 tests.

## 0.3.1-beta.40 — Bounded TinTin Functions

- Added persistent `#function`/`#unfunction` definitions and `@name{arguments}`
  expansion with `%0` and `%1` through `%99`.
- Added per-call `#local`, `#unlocal`, `#return`, and `result` fallback behavior.
- Allowed bounded nested Functions plus safe Math and Format assignments inside
  Function bodies.
- Blocked server sends, session routing, delays, file operations, automation-definition
  mutation, recursion, excessive depth/calls/commands/arguments, and oversized output.
- Added atomic persistent-Variable rollback when a Function fails after earlier
  assignments.
- Added Function persistence, settings schema 35, classes, client help, Pipeline
  Debug stages, and exact safe Read/Write round-tripping.
- Package version advances to `0.3.1-beta.40`; full verification target: 558 tests.

## 0.3.1-beta.41 — Lazy numeric TinTin conditionals

- Added bounded `#if`, `#elseif`, and `#else` commands using the safe Math evaluator.
- Added inline false branches and adjacent chained branches with lazy evaluation of
  only the selected branch.
- Added conditional execution through direct commands, Aliases, Actions, Functions,
  delays, loops, classes, macros, session routing, and command-line batches.
- Preserved Action generated-command validation and Function atomic Variable rollback
  inside selected branches.
- Added branch/depth/command limits, custom-prefix help, Pipeline Debug stages, safe
  TinTin importer compatibility, and macro adjacency coverage.
- String/regex conditions and general switch/loop control flow remain deferred.
- Package version advances to `0.3.1-beta.41`; full verification target: 573 tests.

## 0.3.1-beta.42 — Docked Prompt Row

- Added Inline, Docked, and Hidden prompt-display modes under Preferences → Display.
- Used the established Telnet GA/EOR boundary to capture only the final unfinished
  gameplay prompt rather than guessing from TCP packet or newline boundaries.
- Added a stable per-session prompt row immediately above command input; new prompts
  replace the previous row instead of accumulating in terminal scrollback.
- Preserved completed multiline group/status output, login/password prompts, Actions,
  Gags, Substitutes, Highlights, Pipeline Debug, vitals fallback, and command ordering.
- Kept the latest docked or hidden prompt available to explicit Read Last Line review
  without creating an automatic live-region announcement on every prompt update.
- Added settings schema 36, prompt-state persistence per runtime session, and focused
  renderer coverage for multiline GA/EOR prompts, replacement, login safety, and Hidden mode.
- Beta.42-v3 made Prompt display changes live and persistent.
- Beta.42-v4 reduced the dock to one borderless terminal line, removed it from the Tab
  order, and hid the read-only xterm cursor.
- Beta.42-v5 stages the final visual line break while Docked/Hidden mode is waiting at a
  prompt, eliminating the leftover blank terminal row without altering stored history.
- Beta.42-v5 adds two pixels between the prompt and command input while retaining the
  compact borderless presentation.
- Package version remains `0.3.1-beta.42`; full v5 verification target: 586 tests.

## 0.3.1-beta.43 — Draft-Safe Shortcuts

- Restored old-style dirty-command protection for TinTin macros and keyboard shortcuts.
- A letter chord such as Shift+W now types normally while a command draft is active
  instead of consuming the W and firing its movement command.
- Added a per-shortcut **Fire while typing** option for players who prefer immediate
  movement or combat shortcuts over draft protection.
- Kept empty input and fully selected last-command text available for shortcuts.
- Preserved prepared text for opted-in shortcuts and kept macros/shortcuts out of
  manual history, so Repeat last command with Enter still repeats the last manually
  submitted command.
- Package version advances to `0.3.1-beta.43`; full verification target: 586 tests.

## 0.3.1-beta.44 — Far-Right Dock

- Added a fourth workspace region, **Far Right**, immediately beside the existing
  right-side dock.
- Added **Move Far Right** to every panel menu and a dedicated far-right drag target.
- Added an independently resizable, keyboard-accessible separator with a 260-pixel
  default and the same Home, End, Shift+Arrow, and double-click behavior as other docks.
- Persisted the new region and width in default, per-character, and Shared Crew
  Workspace layouts while safely migrating older settings.
- Kept tab groups, panel order, pop-out/dock-back behavior, terminal DOM identity,
  command input, output following, and protected terminal minimum width intact.
- Advanced settings schema to 37 and package version to `0.3.1-beta.44`; full
  verification target: 590 tests.


## 0.3.1-beta.45 — Docked Prompt Clearance

- Added four pixels of separation beneath the docked prompt text.
- Made completed TinTin `#read` and `#write` reports flush and return to the live
  edge so their final totals remain visible above the anchored prompt.
- Kept the correction local to explicit TinTin disk feedback; ordinary output
  following, manual scrollback, resizing, docking, routing, and protocol behavior
  are unchanged.
- Package version advances to `0.3.1-beta.45`; full verification target: 591 tests.


## 0.3.1-beta.46 — Readable Client Help

- Reorganized client Help into labeled plain-text sections and topic blocks.
- Rendered Help as one terminal block with bold bright-cyan visual styling.
- Preserved complete monochrome, transcript, and screen-reader text without color-only meaning.
- Package version advances to `0.3.1-beta.46`; full verification target: 594 tests.


## 0.3.1-beta.47 — TinTin Script Editor

- Added safe `#edit`, `#edit {script}`, and `#edit read {script}` commands.
- Added File → TinTin Scripts controls for editing a script or showing the Scripts folder.
- Restricted native opens to existing regular scripts directly inside the Scripts folder.
- Kept script loading explicit through `#read` and blocked Actions from opening files.

## 0.3.1-beta.48

- Added immediate active-session `#end` disconnect without confirmation.
- Added reload-safe bare `#kill` for clearing live TinTin definitions and transient delayed movement before re-reading Prime.

## 0.3.1-beta.51 — Communications Flow and Message Integrity

- Communications now reads chronologically from oldest at the top to newest at the bottom.
- New arrivals append at the live bottom while existing messages move upward.
- Short histories rest against the bottom of both docked and detached Communications panes.
- Manual scrollback remains where the player left it instead of being forced back to live output.
- Genuine rapid repeats from the same source remain visible.
- Matching terminal and GMCP copies of one event merge once, preserving the richer ANSI-colored copy.
- Docked and detached Communications use the same ordering and live-edge behavior.
- Release gate: 617/617 tests.

## 0.3.1-beta.53 — Session Vitals and Communications Workspace

- Added an independent Session Vitals pane for connected same-server companions while keeping the active docked prompt to one line.
- Added persistent Communications order choices: newest at top or newest at bottom.
- Preserved manual scrollback and followed new traffic only at the selected live edge.
- Prevented message history and controls from growing Communications beyond its dock, tab group, or pop-out bounds.
- Added Grats, conditional SSF, and detected Bonejack channel filters.
- Reorganized Communications controls into Channels, Display, and Find rows.
- Capped side-docked Communications near the complete Mapper footprint.
- Added a collapsible connection bar with aligned connection, Knowledge, and Settings controls.
- Replaced the floating New Session sheet with a compact normal-flow Create drawer.
- Focused release gate: 158/158 tests.
- Full release gate: 626/626 tests.

## 0.3.1-beta.54 — Session-Scoped TinTin Profiles and Multiplayer Workflow

- Gave every session a complete private TinTin environment for aliases, variables, Functions, Actions, gags, highlights, substitutions, macros, classes, Speedwalk state, and script identity.
- Prevented definitions, incoming triggers, routed commands, writes, reloads, and reset operations from leaking across characters.
- Added target-named private profile autoload: creating Gator loads only gator.tin, never Wind's active definitions.
- Made automatic profile loading a clean replacement while keeping manual #read as a session-local merge.
- Added #profile [session], #reload [session], and #session name reload.
- Expanded #sessions into a practical multiplayer roster with profile identity and Alias/Action totals.
- Displayed each session's bound .tin file in the session tab.
- Made bare #write and #edit use the selected session's bound private profile.
- Added explicit session-named load and editor guidance.
- Migrated shared legacy TinTin settings into only the saved active session under schema 40.
- Focused release gate: 244/244 tests.
- Full release gate: 632/632 tests.

## 0.3.1-beta.55 — Persistent Character Workspaces and Resizable Panels

- Added durable vertical resizing across docked workspace panels.
- Persisted pane heights per character and in Shared Crew Workspace.
- Restored the most recent character workspace during application startup.
- Reapplied saved character geometry when character identity arrives after reconnect.
- Persisted the main application window's size, position, and maximized state.
- Made pane-height, dock-size, and last-character geometry commits flush immediately.
- Moved yellow resize handles out of panel scroll flow and pinned them to the visible pane bottom.
- Preserved Communications' bounded internal message scrolling while allowing its outer pane to resize.
- Kept detached Size menus inside narrow pop-out windows.
- Preserved Beta.54 session-scoped TinTin profiles and multiplayer isolation.
- Focused release gate: 61/61.
- Full release gate: 650/650.

## 0.3.1-beta.57 — Veteran TinTin Compatibility and Workspace Stability

- Promotes the protected Beta.56b pane/connection usability lab together with the Beta.57a TinTin compatibility sequence.
- Expands veteran TinTin support across nested reads, GTS/main startup inheritance, named session routes, bounded scripting/tables, events/logging/snoop/config, native mapper routes, compatibility audit, and veteran runtime commands.
- Adds MM/ClassVI/Cogline compatibility for unbraced conditional chains, LIST INS/INSERT, bounded captured numeric repeats, LINE GAG, LOG OVERWRITE, and apostrophe/backtick command characters.
- Keeps SYSTEM/SYS and CHAT blocked; unknown custom SAY/TBA forms remain visible rather than receiving invented semantics.
- Retains NukeFire-native mapper/session/privacy boundaries and the Beta.56b stable workspace/pane behavior.

## 0.3.1-beta.58 — Accessibility and Reader Workspace

- Adds a native accessibility harvest focused on VI/screen-reader gameplay without replacing NukeFire's existing terminal, Communications, session, or automation architecture.
- Protects native accessibility/editing shortcuts from client macros and keybindings while preserving configurable NukeFire hotkeys.
- Adds stable per-session Reader Review with logical line identity, Previous/Next/Latest navigation, and one-shot recent-line recall that does not disturb the parked review cursor.
- Adds stable per-character/per-channel Communications review with logical message identity, Older/Newer/Latest navigation, rapid recall, Last Tell, and Last Communication.
- Adds commandless configurable accessibility actions with no forced default shortcuts.
- Separates native screen-reader presentation (VoiceOver/NVDA/JAWS/Orca) from optional NukeFire Self-Voice.
- Adds Self-Voice panic stop, active-session isolation, movement/follow interruption, sustained-output backlog condensation, and priority Tell/System barge-in while preserving complete text in terminal/Reader Review.
- Adds Reader Workspace: a terminal-dominant accessibility layout with one Reader Review pane while hidden panels continue processing and the user's normal layout is restored exactly on exit.
- Keeps SYSTEM/SYS and CHAT blocked and introduces no shell-based speech execution.

## 0.3.1-beta.59 — Accessible Audio and Semantic Combat Foundation

- Makes NukeFire Self-Voice foreground-aware across the Electron app, including popouts, with true mute/unmute and no background catch-up.
- Adds persistent Self-Voice rate, pitch, volume, and installed-voice selection controls while preserving native JAWS/NVDA/VoiceOver/Orca as a separate accessibility path.
- Adds Reader presets and optional conflict-safe F5-F10 accessibility actions; the Fast Reader preset is intentionally 2x rather than 8x.
- Adds six native Web Audio combat/status cues (Hit, Miss, Incoming, Critical, Kill, Danger), default OFF, with independent volume/mute/stop behavior.
- Adds user Sound Triggers with familiar action-style matching, cooldowns, per-session behavior, and optional suppression from Self-Voice without removing text from Terminal or Reader Review.
- Adds event-only support for NukeFire.Combat 1 semantic GMCP. Schema-1 combat summaries are normalized and forwarded ephemerally; packet bodies are not retained as permanent GMCP state/history.
- Keeps semantic combat audio mapping deliberately deferred until after hard screen-reader testing; Pipeline Debug can inspect the bounded semantic stream now.
- Preserves ordinary MUD text, Reader Review, Communications, TinTin automation, and session isolation while adding the new auditory paths.

## 0.3.1-beta.60 — Safe Lua Foundation and Reader UI Boundary

- Promotes the proven Wasmoon 1.16.0 / Lua 5.4 worker runtime into the normal NukeFire client without exposing Node, Electron, filesystem, shell, package, or network access.
- Adds bounded per-session `#lua` with `send()`, `echo()`, `getVariable()`, `setVariable()`, and `getSession()`, sharing the existing NukeFire/TinTin variable engine rather than creating parallel Lua state.
- Keeps soft timeout, hard Worker watchdog, memory allowance, session isolation, bounded commands/values, and deny-by-default Lua libraries.
- Adds persistent per-session `#config {COMMAND ECHO} {ON|OFF}`, default OFF, silencing routine TinTin/Lua automation acknowledgements while preserving deliberate output and real errors.
- Removes Current/Older/Newer/Latest review controls from the ordinary Communications panel while preserving stable Communications review for Reader Workspace, configurable reader actions, Last Tell, and Last Communication.
- No distributions were built or published as part of this lock.

## 0.3.1-beta.61 — Reader-Native Accessibility and Safety

- Adds first-class game-side Reader controls over the whitelisted `NukeFire.Controls` GMCP family, with the short `cr` command alongside the canonical `client reader` form.
- Synchronizes the game's real screen-reader flag into the official client Reader Workspace without parsing server text and preserves the user's chosen speech path.
- Adds Reader History categories with independent cursors, unread counts, category navigation, stable Previous/Next/Latest review, and reliable Last Tell fallback/caching.
- Adds Self-Voice game controls for on/off, mute/unmute, stop, restart, test, rate, pitch, volume, and foreground policy, with failed Self-Voice starts preserving native screen-reader speech.
- Adds Reader reliability and recovery through `cr doctor`, `cr recover`, lifecycle re-convergence, reconnect/copyover state repair, and explicit speech-backend health reporting.
- Adds a semantic realtime safety lane for combat danger, severe incoming damage, critical self/group health, and death-class events without moving a parked review cursor.
- Adds first-run Reader Setup, a short spoken/action-driven tutorial, `cr unread`, `cr context`, `cr keys`, and layered `cr help` so a blind player can learn the interface from the command line.
- Hardens Tell capture so semantic `Comm.Channel tell` is authoritative while Reader History, direct per-session Last Tell cache, and legacy Communications history provide redundant recall paths.
- Keeps the control boundary hardcoded and bounded: no arbitrary command execution, JavaScript, Lua, filesystem, shell, network, DOM, Node, Electron, or generic preference mutation bridge is introduced.

## 0.3.1-beta.62 — Accessible Output, Audio, and Speech

- Adds game/client Reader command parity and accessible review helpers without replacing normal terminal output.
- Adds semantic combat and group Audio Cues, including transition-only HP, mana, movement, and catastrophic-hit warnings.
- Keeps Audio Cues separate from NukeFire Self-Voice and preserves user Sound Triggers and complete Reader/Terminal history.
- Adds active-session-only Self-Voice hygiene and preserves literal lowercase `news` while keeping intentional speedwalk forms.
- Adds the bounded `NukeFire.Speech 1` semantic speech policy so visible output can remain complete while NukeFire Self-Voice receives a cleaner semantic stream.
- Adds `CR AUDIO` controls and the optional `CR TUTORIAL AUDIO` practical migration guide for Voice, Audio Cues, SPEECH, OUTPUT, exact-line review, Reader History, and recovery/safety.
- Keeps the original four-step Reader essentials tutorial unchanged and introduces no arbitrary command, filesystem, shell, network, JavaScript, Lua, or hardcoded-key takeover path.

## Beta.63b9 candidate — Compact Mapper and GPS Guidance

- GPS destination choices now surface the server-authored remort guidance already carried in the destination catalog, without inventing a client difficulty score.
- Selected destinations show a quiet zone/remort guidance line beneath the picker.
- Rare map maintenance controls are folded into a closed Map tools disclosure so routine GPS + map use gets more vertical space.
- Mapper/GPS spacing is tightened while preserving zoom, centering, learned-map clearing, hard refresh, keyboard access, and authoritative map behavior.


## Beta.66a Performance & Responsiveness Pass 3 — Movement Fast Path

- Removes the old 80 ms default Speedwalk delay so compact routes such as `20e` send their bounded ordered movement lines immediately instead of adding roughly 1.5 seconds of client-side pacing across 20 steps.
- Makes zero-delay Speedwalk draining iterative and avoids a full session/TinTin snapshot for pure Speedwalk sends.
- Tracks rapid Speedwalk directions in a bounded ordered movement-intent queue; Room.Info consumes successful movement in order while prompt boundaries discard stationary/failed steps, preserving mapper direction learning without restoring artificial pacing.
- Reuses movement fallback watches, interrupts Self-Voice once per outstanding burst, and removes the per-step scan that recounted the remaining Speedwalk queue.
- Adds O(1) GPS destination lookup after catalog construction and bypasses Communications GMCP parsing for unrelated packages.
- Keeps the existing 200-step Speedwalk safety bound, explicit non-zero queue pacing support, Room.Info/BIGMAP authority, mapper persistence, Reader/accessibility behavior, and ordinary server command semantics intact.


## Beta.66a Performance & Responsiveness Pass 4 — Change-Only Panels

- Stops hidden/inactive Mapper, Console, Affects, and Mob Inspector surfaces from rebuilding DOM while their state continues to update.
- Activates panel MutationObservers only for panels that are actually popped out.
- Gives compact Mob Inspector combat a lightweight HP/engagement refresh path instead of rebuilding the full inspection card per vitals pulse.
- Avoids full Affects reconstruction when only countdown timing/revision changed, caches countdown nodes, and updates countdown text only when it changes.
- Deduplicates NukeFire.Context visual refreshes plus identical Communications-tab and Group-Vitals states.
- Preserves all accessibility, GMCP, mapper, panel, pop-out, combat, and communications behavior.

## Beta.66a Accessibility — Tell and Auction Communication Sounds

- Adds independent, default-off Tell and Auction sounds beside Gossip, Skynet, and SSF in Accessibility preferences.
- Adds distinct short native earcons and direct test buttons for Tell and Auction.
- Persists both settings through the existing accessibility settings model and local migration path.
- Extends bounded Reader sound controls to accept Tell/Auction while preserving Communications classification, dedupe, background policy, and complete terminal/Reader text.
## 2026-08-26 — MUSH Reader Setup and Review Safety

- Removed the easy-to-hit Reader Workspace exit button while retaining deliberate workspace controls.
- Added `CR LOAD MUSHSETTINGS` support with familiar MUSH-style review, movement, Tell, vitals, mute, and copy-reviewed shortcuts.
- Enabled command-send speech interruption and communication sound selections in the preset without changing combat audio choices or overwriting unrelated custom shortcuts.

## 2026-08-26 — Reconnect-Safe Compression Preference

- Added a persisted, default-on preference to enable or disable both MCCP2 and MCCPX incoming compression.
- Compression preference changes apply on reconnect so an active compressed stream is never abandoned.
- Disabled mode keeps GMCP and ordinary Telnet negotiation active.
- Added the selected state to Protocol Diagnostics and restored normal versioned package artifact names after the Beta.68 plain-transport control build.
