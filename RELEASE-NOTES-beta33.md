# NukeFire Client 0.3.1-beta.33

## TinTin Comfort Pack: Panel and Mapper Text

Beta.33 adds a smaller, command-client-style visual vocabulary without reducing
accessibility or changing Mapper behavior.

### Panel labels

Preferences now offers:

- **Full** — Vitals, Affects, Quick Commands, NukeFire State, Protocol,
  Communications, NukeFire Console, and Mapper.
- **Compact** — Stats, Buffs, Commands, State, Proto, Comms, Console, and Map.

Compact labels update dock headings, grouped panel tabs, and panel-window titles.
The full names remain attached to headings, tabs, mirrored panels, and pop-out
windows for screen-reader users.

### Mapper room text

Preferences now offers:

- **Status marks only** — the established clean map with `@`, route, and GPS marks.
- **Room numbers** — full room vnums beneath visible room squares.
- **Short room names** — normalized, bounded room names beneath visible squares.

Status marks remain visible in every mode. Room labels do not alter room
coordinates, links, BIGMAP authority, route planning, GPS, current-room centering,
or map persistence. The accessible Mapper summary remains complete and unchanged.

### Safety and compatibility

- Visual labels are plain text and are bounded before entering SVG output.
- Control characters and multiline room names are normalized.
- Existing settings migrate to full panel labels and status-only Mapper text.
- Popped-out panels keep full accessible identities even when their visible title
  is compact.
- No command pipeline, networking, GMCP, map-learning, route, or screen-reader
  parsing behavior changed.

Full verification target: **475/475 tests**.
