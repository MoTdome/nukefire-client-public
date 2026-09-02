# NukeFire Client 0.3.1-beta.71 — Tester Notes

This is a Beta.71 test release.  Normal gameplay and TinTin semantics should
remain unchanged; the release focuses on responsiveness, definition management,
terminal rendering, and accessibility-preserving usability improvements.

## High-value checks

1. Connect normally and verify terminal text, ANSI colors, GMCP panes, Mapper,
   Communications, Reader Review, Self-Voice, and command entry.
2. Exercise heavy movement/combat/output.  There should be no persistent terminal
   backlog, long-session slowdown, or missing output.
3. Open the Definition Manager and inspect/edit representative Alias, Action,
   Gag, Highlight, Substitute, Variable, Function, Macro/Event/Class definitions.
4. Test a large imported TinTin setup and confirm priorities/captures behave the
   same as before.
5. Verify Page Up and Page Down review the terminal buffer without changing an
   unsent command-line draft.
6. Verify wide Unicode examples such as [📖], [🔥], [🪨], and [🪨🪨] render without
   clipping or overlap and still copy/paste as the original text.
7. Open Protocol Diagnostics.  On current NukeFire, the official client should
   normally negotiate MCCPX / Zstandard and survive server copyover cleanly.
8. Exercise accessibility presets and SR/CR controls with keyboard-only use and,
   where available, NVDA/VoiceOver.

Unsigned beta builds can trigger normal macOS Gatekeeper or Windows SmartScreen
warnings.
