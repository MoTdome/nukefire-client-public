# NukeFire Client 0.3.1-beta.79

Beta.79 is the Native Reader and TinTin veteran compatibility release. It keeps
NukeFire terminal-first while making the native screen-reader path, MUSH-style
Reader workflow, and common TinTin muscle memory substantially more direct.

## Native screen reader output

- NukeFire's completed-line Reader pipeline is the authoritative Native Reader
  live announcement source.
- xterm keeps its accessible row tree for deliberate browsing while its hidden
  live announcer is silenced to prevent stale or duplicate speech.
- Prompt-boundary text such as login/name prompts is delivered through the same
  completed-line Reader path.
- Repeated identical completed lines remain separate Reader events.

## Output review

- F8 — previous completed MUD output line
- Shift+F8 — current reviewed MUD output line
- F9 — next completed MUD output line
- F10 — latest completed MUD output line
- Shift+F10 — Last Tell
- Reader History categories remain available as a second review layer.

## MUSH-style speech path selection

- `CR LOAD MUSHSETTINGS` remains backward compatible and does not change the
  current live speech owner.
- `CR LOAD MUSHSETTINGS NATIVE` selects the personal/native screen-reader path
  for NVDA, JAWS, VoiceOver, or Orca and turns NukeFire Voice off.
- `CR LOAD MUSHSETTINGS CLIENT` selects NukeFire Voice and disables native live
  announcements.
- `CR LOAD MUSHSETTINGS STATUS` reports the MUSH/Reader/speech-path state without
  changing settings.
- The server integration reference coordinates NATIVE/CLIENT with the existing
  Balanced SR presentation profile while STATUS remains read-only.

## TinTin veteran compatibility

- Optional TinTin default command-line keys provide Ctrl-W word-left delete,
  Ctrl-U clear-left, and Ctrl-V next-key Macro capture.
- Ctrl-R is reserved for interactive reverse command-history search while the
  command input has focus.
- SHOW/SHOWME understand safe `\e` SGR escapes and the veteran trailing `\}`
  no-linefeed form.
- LINE keeps STRIP and adds bounded MSDP and Action MULTISHOT compatibility.
- The visible output Find box accepts TinTin wildcard forms such as `%*`.
- MSLP simple, SEND, and MENU links translate through the existing protected
  terminal-link path; secure/executable server forms are not exposed as arbitrary
  client code.
- MTTS advertises the MSLP capability bit.
- Mapper view presets include 7x7, 9x9, 11x11, and 11x7.
- MAP LANDMARK and MAP SET ROOMSYMBOL are local mapper annotations. MAP FIND
  remains numeric-only and continues to use the authoritative NukeFire mapper.
- EVENT help documents the Event argument layout used by the client.

## Platform and input polish

- Windows/Linux help says Control; macOS help says Command.
- Native Reader can leave the last sent command visible without selecting it.
- Pager safety uses explicit presentation state rather than selection state.
- Existing customized Reader bindings remain protected from preset migration.

## Verification and distributions

The public candidate is verified with `npm run verify` before the release commit
and tag are pushed. Pushing `v0.3.1-beta.79` triggers the repository release
workflow, which independently verifies the tagged commit and builds the unsigned
macOS universal DMG and ZIP, Windows x64 Setup and Portable EXEs, and Linux x64
AppImage from that same exact commit.
