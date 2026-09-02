# NukeFire Client 0.3.1-beta.72
## Performance Architecture Lock and Release Stabilization

Beta.72 locks the deep performance and architecture cleanup completed after Beta.71.
The release is intentionally stabilization-focused: it removes redundant work across
incoming text, GMCP state, TinTin/session persistence, Electron IPC, combat-vitals
derivation, and companion-session rendering without changing NukeFire protocol or
gameplay semantics.

### Incoming-output and terminal path

- Removes the remaining heavy-output frame-delay compensation that could make combat
  output alternate between fast, paused, and catch-up bursts; the existing bounded
  xterm backpressure/coalescing remains the terminal pacing authority.
- Reuses the ANSI parser's authoritative source plain text instead of stripping ANSI
  a second time for pagination, fallback vitals, Communications classification, and
  prompt fallback processing.
- Makes ordinary non-communication combat/world lines leave Communications processing
  before expensive ANSI cleanup and full channel classification.
- Preserves the established 2 ms renderer aggregation ceiling, contiguous Telnet/ANSI
  scanning, bounded xterm queues, Unicode width handling, and exact terminal styling.

### Canonical state reuse

- Removes legacy workspace/pane scheduling fan-out and obsolete DOM searches left from
  earlier panel implementations.
- Reuses canonical Affects, Mob Inspector, Context Deck, Group, TinTin, and combat-vitals
  state instead of repeatedly normalizing or serializing the same objects.
- Removes an Affects countdown inner-loop path that could normalize the entire Affects
  snapshot once per displayed effect every second.
- Adds safe mutation revisions to authoritative TinTin definition engines so unchanged
  SessionManager snapshots reuse one immutable canonical definition snapshot.
- Reuses persistent per-session TinTin snapshots for unrelated preference saves while
  preserving the existing on-disk compatibility schema.

### Electron IPC and renderer work

- Makes routine session-list broadcasts metadata-only instead of shipping every session's
  complete TinTin definitions across Electron IPC.
- Ordinary server-bound commands return no full renderer snapshot unless authoritative
  renderer-visible state actually changed; indirect event-driven definition mutations
  still force synchronization.
- Batches stream events already produced in one synchronous parser turn into one
  zero-delay microtask IPC message while preserving event order and immediate control/error
  ordering.
- Lets the renderer honor that native batch boundary by processing every semantic event
  but collapsing selected duplicate pure-view refreshes to one final repaint.

### Combat and multi-session rendering

- Builds one canonical Char.Vitals model per authoritative GMCP packet, sharing H/M/V,
  maxima, percentages, and opponent state across active/background Vitals and Mob Inspector
  consumers.
- Reuses canonical current-opponent and Mob Inspector combat context instead of repeatedly
  matching/normalizing the same target during HP-only updates.
- Reconciles companion Session Vitals by session id, preserving DOM-row identity and
  updating only changed values/classes/ARIA instead of recreating the whole list.

### Reliability fixes retained in the release

- Preserves Communications newest-at-bottom position through combat-driven dock rebuilds
  while keeping manual scrollback stable.
- Keeps global hotkeys available while Find is open except when focus is actually inside
  an editable Find field.
- Keeps Reader, Self-Voice, soundpacks, mapper/panes, Definition Manager, TinTin source
  parity, GMCP, MCCP2, MCCPX/Zstandard, copyover recovery, multi-session state, and
  accessibility behavior on their established paths.

### Release policy

Beta.72 is the lock point for this optimization cycle. The release preparation script
requires a clean full `npm run verify` before creating the local release commit and tag.
After the tag, only release-blocking defects should change the release candidate.

### Distribution set

Built from the locked `v0.3.1-beta.72` tag as unsigned beta packages for:

- macOS Universal: DMG + ZIP
- Windows x64: Setup EXE + Portable EXE
- Linux x64: AppImage
