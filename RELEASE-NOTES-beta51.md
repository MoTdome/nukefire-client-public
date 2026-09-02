# NukeFire Client 0.3.1-beta.51 — Communications Flow and Message Integrity

## Included

- Communications now reads naturally from the oldest message at the top to the newest message at the bottom.
- New arrivals appear at the lowest point and move existing history upward.
- Short histories rest against the bottom of the pane instead of floating at the top.
- Docked and detached Communications windows use the same chronological direction.
- Manual scrollback is preserved instead of being dragged back to live output.

## Repeated messages

- Genuine rapid terminal repeats remain visible.
- Genuine rapid GMCP repeats remain visible.
- Matching terminal and GMCP representations of the same event merge into one entry.
- When paired representations differ, the richer ANSI-colored copy is retained.

## Preserved behavior

- Terminal output ordering remains unchanged.
- Communications channel parsing, filters, search, unread counts, keyboard navigation, pop-out controls, and accessibility behavior remain intact.
- No session, network, protocol, Mapper, TinTin, prompt, settings-schema, or persistence behavior was broadened.

## Verification

- Visually approved in the isolated Beta.51 laboratory.
- Communications-focused suite: 25 tests, 25 pass, 0 fail.
- Release-state focused suite: 32 tests, 32 pass, 0 fail.
- Full release suite: 617 tests, 617 pass, 0 fail.
- JavaScript syntax checks and `git diff --check` passed.
