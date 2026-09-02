# NukeFire Client beta.20 — Explored Map and Performance Pass

This focused beta.20 pass restores the mapper as an explored-world tool while
keeping the server authoritative for nearby topology and every automated travel
step.

## Mapper behavior

- Every room visited by a character remains in that character's explored map.
- The map view no longer follows the player automatically across the same plane.
- **Center** (or `C` / `Home`) returns the view to the current room.
- Mouse-wheel zoom is restored and remains anchored beneath the pointer.
- `+`, `-`, arrow keys, dragging empty map space, and the accessible resize
  separator remain available.
- Only rooms intersecting the current viewport are rendered. The explored map
  may contain tens of thousands of rooms without placing all of them in the DOM.
- Live BIGMAP still overrides learned link appearance for closed, locked,
  one-way, route, destination, and current-room state.
- **Run Here** continues to plan only through visited rooms and validates each
  individual next exit against a fresh authoritative BIGMAP snapshot.

## Safe performance work

- Map dragging changes one SVG world transform while the pointer moves; room and
  edge nodes are rebuilt once when dragging ends.
- Map persistence permits only one full snapshot write at a time and coalesces
  intervening changes into one later write.
- Map-save acknowledgements return counts and timestamps instead of serializing
  the complete world back through Electron IPC.
- The map graph keeps a constant-time known-room count and avoids re-normalizing
  the complete world before every renderer save.
- BIGMAP packets are normalized once before signature, indexing, graph update,
  and routing checks.
- Communications classification, unread accounting, and visible repaint remain
  immediate. This path was deliberately left synchronous after full-DOM testing
  showed that frame deferral changed established behavior.
- The regular terminal appends text to an existing text node rather than
  rebuilding its full text value, and avoids rewriting an unchanged line count.
- xterm ANSI output is assembled with array joins rather than repeated large
  string concatenation.

## Deliberately unchanged

- Incoming text order, outgoing command order, Actions, Aliases, Variables,
  Gags, Speedwalk, Communications classification, reader text, prompt handling,
  secure input, session separation, and terminal scrollback semantics.
- Room.Info/BIGMAP dual confirmation and all route stopping safeguards.
- Atomic map storage, backup recovery, and map-data normalization at the main
  process trust boundary.

## Verification

- JavaScript syntax suite: passed.
- Dependency-free suite in the release environment: 228 passed, 0 failed.
- Full-DOM regression suite on the installer test machine: pending local dependency gate;
  the installer runs the complete suite and rolls back automatically on failure.
- Added full-DOM regression coverage for wheel zoom, persistent explored rooms,
  and stable map view; this runs as part of `npm run verify` where `jsdom` is
  installed.
- Synthetic 12,000-room save benchmark in the release environment:
  approximately 48.22 ms per baseline serialize versus 28.72 ms after this pass.
  Viewport filtering averaged approximately 0.63 ms per query. These figures are
  diagnostic, not promises for every machine.
