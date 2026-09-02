# NukeFire Client 0.3.1-beta.71
## Definition Management, Performance, and Terminal Polish

Beta.71 closes a broad client-polish cycle centered on faster incoming output,
large TinTin definition sets, better definition management, terminal typography,
and keyboard review.

### Definition and setup workflow

- Adds the unified Definition Manager for browsing and editing supported TinTin
  definitions without giving up the normal veteran command interface.
- Adds Client Presets for quickly applying known-good client configurations.
- Improves terminal font and numeric font-size handling, including the Beta.71
  geometry adjustment that keeps output clear of the command/prompt area.
- Audits SR/CR command behavior so accessibility command paths remain deliberate
  and compatible with the established Reader workspace.

### Performance and responsiveness

- Replaces per-byte/per-character hot loops in Telnet ingest, ANSI ingest, and
  multiple incoming line buffers with contiguous-run processing.
- Adds bounded adaptive xterm write coalescing for brief output bursts.
- Adds adaptive Alias/Action/Gag/Highlight/Substitute dispatch so large imported
  TinTin definition sets avoid regex-testing impossible candidates.
- Makes terminal ANSI-run serialization cheaper while preserving byte-for-byte
  terminal output semantics.
- Real long-session stress testing showed bounded retained state and no persistent
  xterm backlog.  A comparable ~5-6 MB output burst reduced terminal flush work
  by roughly forty percent after the terminal serialization pass.

### Terminal and Unicode polish

- Adds Page Up / Page Down terminal-buffer review while preserving an unsent
  command-line draft.
- Adds Unicode 11 width handling plus a non-fatal modern-emoji width provider so
  newer emoji such as the rock glyph reserve the cells macOS actually renders.
- Unicode enhancement failures are isolated from terminal startup; the terminal
  remains available even if an optional width provider cannot initialize.

### Preserved behavior

- Reader, Self-Voice, keyboard-only navigation, Sound Triggers, soundpacks,
  multi-session state, mapper/panes, GMCP, MCCP2, and MCCPX remain on their
  established paths.
- NukeFire's preferred MCCPX/Zstandard path remains real-time oriented at Zstd
  level 3; MCCP2/DEFLATE remains the traditional compatibility path.

### Distribution set

This release is built from one locked commit as unsigned beta packages for:

- macOS Universal: DMG + ZIP
- Windows x64: Setup EXE + Portable EXE
- Linux x64: AppImage
