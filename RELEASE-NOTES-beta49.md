# NukeFire Client 0.3.1-beta.49 — Mapper Offline Recovery and Disconnected TinTin Workspace

## Included

- Disconnected sessions replace the live room SVG with a parchment NukeFire map placeholder, so stale or ghost rooms cannot remain visible.
- The offline state includes explicit plain text for VoiceOver and monochrome users; the artwork itself is decorative.
- **Hard Reset & Refresh** clears transient Room.Info, Char.GPS, BIGMAP snapshot/index/signature, pending movement, and route state before requesting fresh authoritative map packets.
- Learned rooms, visit history, map files, zoom, canvas size, panel placement, settings, and output history remain intact.
- Active and background sessions clear transient live map state when their connection closes.
- A clean GMCP lifecycle snapshot after reconnect or copyover invalidates stale map state before fresh packets are accepted.
- Identical BIGMAP data is accepted after a hard reset because the old duplicate signature is cleared.
- The disconnected command line remains a complete local TinTin workspace. Aliases, Variables, Functions, conditionals, repeats, loops, delays, `#showme`, and other client commands continue through the normal pipeline.
- `#showme` can trigger Actions while disconnected so scripts can be tested before login.
- Only the final server-send boundary refuses ordinary MUD commands when no socket is connected.
- A player-entered Alias may resolve to a bare host and port and connect the active session, such as `#alias {logprime} {tdome.nukefire.org 4000}` followed by `logprime`.

## Safety

- Actions, delays, repeats, loops, and other generated commands cannot use the host/port shorthand to open a connection.
- Direct arbitrary two-word commands are not treated as connection targets; the first token must look like a host and the port must be between 1 and 65535.
- No persistent learned-map data is erased by disconnect or hard refresh.
- Raw output ordering, GMCP parsing, Communications, prompts, Gags, session routing, accessibility timing, and connected-session command behavior keep their established pipelines.

## Verification target

- Exact baseline: Beta.48 at 605/605 tests.
- Beta.49 target: 613/613 tests.
