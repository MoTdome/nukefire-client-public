# NukeFire.Controls client/server protocol — Beta.76 reference

This document describes the exact accessibility control contract used by the public Beta.76 client. It is intentionally semantic: the server asks for a named Reader operation, while the client owns local implementation details.

## Capability

The server only sends CR operations after GMCP is active and the client advertises `NukeFire.Controls 1`. SR remains independent and works without this package.

## Request

GMCP package:

```text
NukeFire.Controls.Request
```

Example payload:

```json
{
  "schema": 1,
  "id": 42,
  "action": "reader.workspace",
  "args": { "value": "on" }
}
```

Client-side normalization requires:

- an object payload;
- `schema === 1`;
- a positive safe-integer request ID;
- an action in the exact allowlist below;
- object-shaped `args`;
- a normalized, control-character-free `args.value` capped at 96 characters.

Anything else is rejected before the renderer action dispatcher.

## Result

GMCP package:

```text
NukeFire.Controls.Result
```

Example payload:

```json
{
  "schema": 1,
  "id": 42,
  "ok": true,
  "action": "reader.workspace",
  "message": "Reader Workspace enabled.",
  "state": {
    "readerWorkspace": true,
    "nativeScreenReader": true
  }
}
```

The Beta.76 client bounds the human-readable result message to 500 characters. The NukeFire server validates schema, ID range, boolean `ok`, action, and message; rechecks the action against its own allowlist; sanitizes the returned message; and avoids echoing successful line/review operations that already spoke locally.

## Coordinated Reader setup

The critical setup sequence is:

```text
server: reader.session.begin
client: save one pre-Reader snapshot if none exists
server: reader.preset = native|live|fast|quiet
client: apply only Reader-owned settings
... later ...
server: reader.exit.restore
client: restore the saved Reader-owned settings and keybindings
```

Repeated setup calls do **not** overwrite the original pre-Reader snapshot. That prevents a player from accidentally making an already-modified Reader setup become the restoration baseline.

## MUSH-style setup

`CR LOAD MUSHSETTINGS` first requests `reader.session.begin`. Only after that succeeds does the server request `reader.load.mushsettings`. The client preserves the current command draft and selection while changing the intended Reader keybindings/input behavior.

## Exact Beta.76 control action allowlist (75)

- `client.status`
- `reader.status`
- `reader.session.begin`
- `reader.exit.restore`
- `reader.preset`
- `reader.load.mushsettings`
- `reader.workspace`
- `reader.native.enabled`
- `reader.voice.enabled`
- `reader.voice.muted`
- `reader.voice.stop`
- `reader.voice.test`
- `reader.voice.rate`
- `reader.voice.pitch`
- `reader.voice.volume`
- `reader.voice.foreground`
- `reader.voice.governor`
- `reader.voice.priority`
- `reader.voice.follow`
- `reader.voice.interrupt`
- `reader.voice.voices`
- `reader.voice.use`
- `reader.voice.restart`
- `reader.vitals.format`
- `reader.announcements.enabled`
- `reader.audio.status`
- `reader.audio.enabled`
- `reader.audio.muted`
- `reader.audio.stop`
- `reader.audio.test`
- `reader.audio.volume`
- `reader.audio.foreground`
- `reader.sound.status`
- `reader.sound.channel`
- `reader.sound.background`
- `reader.sound.test`
- `reader.sound.reset`
- `reader.soundpack.status`
- `reader.soundpack.list`
- `reader.soundpack.import`
- `reader.soundpack.use`
- `reader.soundpack.builtin`
- `reader.soundpack.test`
- `reader.soundpack.events`
- `reader.soundpack.show`
- `reader.soundpack.assign`
- `reader.soundpack.clear`
- `reader.soundpack.volume`
- `reader.soundpack.duplicate`
- `reader.soundpack.export`
- `reader.accessibility.command`
- `reader.doctor`
- `reader.recover`
- `reader.unread`
- `reader.context`
- `reader.keys`
- `reader.tutorial`
- `reader.alerts.enabled`
- `reader.category.next`
- `reader.category.previous`
- `reader.category.status`
- `reader.review.repeat`
- `reader.review.first`
- `reader.review.back`
- `reader.review.forward`
- `reader.review.latest`
- `reader.review.previous`
- `reader.review.next`
- `reader.review.tell`
- `reader.review.communication`
- `reader.lines.current`
- `reader.lines.previous`
- `reader.lines.next`
- `reader.lines.latest`
- `reader.lines.recall`

## Security invariants

1. Keep the server allowlist and client allowlist synchronized.
2. Never replace the semantic action with `eval`, arbitrary JavaScript, shell execution, filesystem access, or an unrestricted local command string.
3. Bound every string at the protocol boundary.
4. Treat client results as untrusted input even though they came from a cooperating client.
5. Keep SR usable when GMCP or CR is unavailable.
6. Keep accessibility repair/status feedback outside filters that could hide the command needed to fix those filters.
