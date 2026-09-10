# Accessibility server integration reference

This directory contains a **sanitized, portability-oriented reference** based on NukeFire’s SR/CR architecture.

It is intentionally not a dump of `act.informative.c` or `gmcp.c`. Those production files contain large amounts of unrelated game logic, world-specific assumptions, database integrations, and internal implementation detail that another MUD does not need.

## Architecture

### SR — server presentation

`SR` is useful on any client. A player preference enables screen-reader-friendly presentation and on-demand text summaries. Server output remains authoritative.

Recommended minimum commands:

```text
SR
SR ON
SR OFF
SR SETUP DESCRIPTIVE|BALANCED|MINIMAL
SR STATUS
SR ROOM
SR EXITS
SR HP
SR MANA
SR MOVE
SR TARGET
SR GROUP
SR GEAR
SR INV
SR AFX
SR DANGER
```

### CR — cooperating-client controls

NukeFire uses `CR` as shorthand for `CLIENT READER`. CR requires a client that advertises `NukeFire.Controls 1`.

The bridge sends semantic, allowlisted operations such as:

```text
reader.session.begin
reader.status
reader.preset
reader.workspace
reader.native.enabled
reader.voice.enabled
reader.voice.rate
reader.voice.voices
reader.vitals.format
reader.announcements.enabled
reader.audio.enabled
reader.accessibility.command
reader.keys
reader.lines.recall
reader.review.latest
reader.load.mushsettings
reader.exit.restore
```

The server never sends arbitrary JavaScript, shell, filesystem commands, or unbounded client commands.

## Files

- `sr_cr_commands_reference.c` — portable TBA/Circle-style SR, CR, and legacy READER command structure.
- `nukefire_controls_reference.c` / `.h` — strict server-side GMCP request/result bridge.
- `CLIENT-CONTROLS-PROTOCOL.md` — exact Beta.76 request/result schema and 75-action allowlist.
- `minimal_client_controls_reference.js` — dependency-light cooperating-client dispatcher example.
- `COMMAND-REGISTRATION.md` — current Circle/TBA command-table wiring.
- `OUTPUT-SPEECH-POLICY.md` — semantic visibility/speech design.
- `semantic_output_policy_reference.c` / `.h` — dependency-light semantic policy model.
- `PORTING-NOTES.md` — what must be wired into another codebase.
- `SANITIZATION-NOTES.md` — what was intentionally removed from NukeFire production source.

## Production source basis

The reference was refreshed for NukeFire Beta.76 from:

- `act.informative.c` SR setup/status/command handling and CLIENT READER dispatch;
- `gmcp.c` NukeFire.Controls capability checks, action allowlist, request construction, and result validation;
- `gmcp.h` package/prototype definitions.

The public examples favor clarity and portability over exact line-for-line production reproduction.

## Client source already present in this public repository

The public Beta.76 snapshot contains the full production client files. In particular, implementors can compare the minimal examples here against `src/semantic-controls.js`, `src/reader-presets.js`, and the `NukeFire.Controls.Request` handler in `renderer/renderer.js`. The integration directory does not duplicate those full production files.
