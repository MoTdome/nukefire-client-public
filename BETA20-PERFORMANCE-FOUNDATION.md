# NukeFire Client beta.20 — Performance Foundation

This pass freezes user-facing features and keeps the centered, read-only BIGMAP
as the client baseline. It removes repeated work from the busiest paths without
changing command ordering, terminal semantics, Communications behavior,
accessibility, session isolation, or server protocol meaning.

## Changes

### GMCP transport

- Live GMCP events now carry only the changed state path and packet body.
- The connection process keeps the complete authoritative GMCP cache, while the
  renderer applies compact patches to its per-session cache.
- Full snapshots remain available for initial connection, session activation,
  copyover recovery, and explicit resynchronization.
- Inactive sessions process mapper room work only for actual `Room.Info` packets.
- Stable character names no longer cause full session-list publication on later
  vitals or room packets.

### Terminal pipeline

- ANSI stripping is performed once per incoming text chunk and reused for line
  counts, reader text, prompt pagination, stored transcript text, and vitals.
- Newline counting and reader-line extraction avoid temporary match/split arrays.
- Adjacent pending terminal runs are merged before the animation-frame paint.
- xterm output uses array assembly instead of repeated large-string growth.
- Custom-renderer cell measurements are cached until font, font size, or compact
  line spacing actually changes.
- Duplicate NAWS dimensions and duplicate screen-reader parser settings are not
  renegotiated.

### Communications

- New messages remain immediate and ordered.
- The normal arrival path prepends one message row rather than rebuilding up to
  500 stored messages.
- ANSI styled runs and the time formatter are reused.
- Channel changes, searches, clear operations, and restored snapshots still use
  a complete deterministic rebuild.

### Mapper and persistence

- The simple centered map remains read-only and feature-frozen.
- Spatial buckets make explored-room viewport queries proportional to the visible
  region instead of the full learned world.
- Visited-room membership and known-room counts use maintained indexes.
- Map and settings saves coalesce while a write is in flight.
- Save IPC returns a lightweight acknowledgement instead of echoing the complete
  saved data back to the renderer.

## Preserved behavior

- Incoming text parsing, Actions, Gags, Communications classification, aliases,
  variables, Speedwalk, prompt handling, and outgoing commands remain immediate
  and ordered.
- Both terminal engines retain current output, scrollback, follow-output, color,
  monochrome, accessibility, and screen-reader behavior.
- The centered BIGMAP retains terrain colors, current room, GPS markings,
  explored-room memory, wheel/button zoom, refresh, and clearing.
- No server changes or settings-schema migration are required.

## Synthetic measurements

Measured in the packaging environment against the centered read-only beta.20
baseline. These are repeatable microbenchmarks, not promises about wall-clock
latency on every computer.

- 1,000 `Char.Vitals` packets with a populated 500-entry GPS catalog, 256-room
  BIGMAP, and 20-member group cache:
  - baseline median: about 884.6 ms and 114.4 MB of serialized event payloads
  - optimized median: about 2.5 ms and 197 KB of serialized event payloads
- 10,000 representative colored terminal chunks:
  - baseline median: about 49.8 ms
  - optimized median: about 43.4 ms
- 1,000 viewport queries over a 40,000-room learned map:
  - baseline median: about 1,562.3 ms
  - optimized median: about 58.1 ms

The benchmark inputs and exact figures are recorded in
`NUKEFIRE-CLIENT-PERFORMANCE-VERIFY.txt` in the handoff package.
## Compatibility correction v2

The compact GMCP transport retains the legacy direct `Char.Vitals` fallback used by older bridges, development pages, and the screen-reader Read Vitals control. Normal live packets still use compact path/value events, so the fallback does not add work to the high-frequency production path.
