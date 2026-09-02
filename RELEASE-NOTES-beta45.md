# NukeFire Client 0.3.1-beta.45

## Docked Prompt Clearance

Beta.45 is a deliberately narrow display correction built directly on the trusted
Beta.44 baseline.

### Changes

- Adds four pixels of breathing room beneath the docked prompt text so the prompt
  sits clearly above the focused command line.
- Flushes a completed `#read` or `#write` report and returns that explicit TinTin
  feedback to the live edge, keeping final totals visible above the docked prompt.
- Leaves ordinary server output, manual scrollback review, Follow Output, dock
  resizing, panel movement, tab groups, session routing, and command ordering alone.

### Accessibility

The prompt remains borderless, outside the Tab order, and available through Read
Last Line. No new automatic live-region output is introduced. Complete TinTin report
text remains in ordinary terminal and reader history.

### Verification gate

The guarded installer requires the exact Beta.44 baseline and **590/590 tests**
before modification, then requires **591/591 tests** after installation. Any failure
restores and re-verifies Beta.44. Nothing is committed, tagged, published, restarted,
or packaged automatically.
