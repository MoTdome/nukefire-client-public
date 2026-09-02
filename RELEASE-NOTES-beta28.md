# NukeFire Client 0.3.1-beta.28

## TinTin Comfort Pack: Highlights

This interval adds persistent TinTin-style `#highlight` and `#high` commands,
with `#unhighlight` and `#unhigh` for removal. Definitions can be listed,
inspected, enabled, disabled, deleted, assigned to classes, saved, and restored.

Patterns support literal text, `^` and `$` anchors, `%1` through `%9`, and `%*`.
Styles accept familiar TinTin color names and documented `<abc>` color codes,
plus light, dark, underline, reverse, italic, reset, and background colors using
`b`. Lower numeric priorities win overlapping matches.

Highlighting is a visual terminal overlay. It does not rewrite the text used by
Actions, Gags, Communications, vitals, Find, copy, or screen-reader output. Server
ANSI and safe OSC 8 link metadata remain intact. Split incoming lines are buffered
only while highlights are enabled and are flushed at prompt and disconnect
boundaries. Local `#showme` text receives the same visual styling while retaining
its existing parser isolation.

Blink, regex mode, and `.tin` file loading are intentionally deferred so each can
be implemented with its real TinTin behavior instead of a misleading shortcut.
