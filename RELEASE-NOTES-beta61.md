NUKEFIRE CLIENT 0.3.1-beta.61
Reader-Native Accessibility and Safety

Beta.61 promotes the cumulative Reader-Native Accessibility and game/client control work on top of trusted Beta.60.

Reader from first launch
- Reader Setup is available before connection for native screen readers or NukeFire Self-Voice.
- A short spoken/action-driven tutorial teaches F10 Latest, category navigation, older-message review, and Last Tell while the command input remains active.
- `cr help`, `cr keys`, `cr unread`, and `cr context` make the Reader interface discoverable from inside the game.

Game-side Reader controls
- `cr` is the short form of `client reader`.
- Reader presets/workspace, Self-Voice, review, alerts, doctor, recover, tutorial, unread/context/keys are controlled through the existing hardcoded `NukeFire.Controls` semantic GMCP boundary.
- Server screen-reader state can automatically converge the official client into Reader Workspace.

Reader History and communications
- Independent per-category history/cursors for main output, rooms, combat, damage, and communications.
- Per-category unread counts and stable review without taking focus out of game input.
- Shift+F10 Last Tell now prefers Reader History, then a direct per-session Last Tell cache, then legacy Communications review.
- Semantic `Comm.Channel tell` remains authoritative; telepath wording is only a compatibility fallback.

Reliability and safety
- `cr doctor` reports Reader/Self-Voice/history/Tell health.
- `cr recover` repairs Reader runtime state without requiring a full client restart.
- `cr voice restart` reinitializes NukeFire speech in place.
- Failed Self-Voice starts preserve the native-reader path.
- Reconnect/copyover/session changes re-converge Reader state.
- Critical realtime danger can interrupt review speech without moving the parked review cursor.

Security boundary
- No arbitrary client command execution.
- No JavaScript/Lua/filesystem/shell/network/DOM/Node/Electron control bridge.
- Reader actions remain a bounded hardcoded allowlist.

Release verification
- Reader: 127/127
- Preferences: 7/7
- TinTin: 444/444
- Full: 1033/1033
- npm check: PASS
- git diff --check: PASS

Artifacts are unsigned beta builds and are not notarized.
