# Porting SR/CR to another Circle/TBA-style MUD

## What you need for SR only

SR can be implemented independently from the official NukeFire Client.

### 1. Persistent player state

Add one persistent preference equivalent to:

```c
PRF_SCREEN_READER
```

Optional related preferences may include compact room text, compact combat, and prompt choices.

### 2. Command registration

Register `sr` in your command table and route it to `do_sr`.

A good first public implementation supports:

```text
sr
sr on
sr off
sr setup balanced
sr setup descriptive
sr setup minimal
sr status
sr hp
sr mana
sr move
sr room
sr exits
sr target
sr group
sr gear
sr inv
sr afx
sr danger
```

### 3. Plain-text views

Do not make a screen-reader user scrape colored bars, ASCII gauges, or visual alignment. Provide explicit text such as:

```text
Hit points: 812 of 1000, 81 percent.
Mana: 190 of 240, 79 percent.
Target: ash mutant, 44 percent health.
Exits: north, west, down.
```

### 4. Prompt policy

NukeFire’s setup profiles disable noisy visual prompt components and leave resources available on demand. Another MUD can choose a different policy, but the important goal is to avoid repeating the same numbers twice every combat round.

### 5. Accessibility command feedback must remain readable

If your MUD has gag/dedupe/output filters, make `SR`/`CR` help, recovery, and status messages bypass the exact layer they are trying to repair. Otherwise a player can accidentally hide the command needed to fix hidden output.

---

## What you need for CR / cooperating-client controls

### 1. GMCP

Your server needs standard Telnet GMCP negotiation and framing. The NukeFire source uses option 201 and a normal `Core.Supports` capability set.

### 2. One namespaced package

NukeFire uses:

```text
NukeFire.Controls 1
```

A different project should generally use its own namespace if it controls both ends.

### 3. Strict server action allowlist

Never send an arbitrary local client command string. The server must accept only known semantic action IDs.

### 4. Request packet

```json
{
  "schema": 1,
  "id": 42,
  "action": "reader.workspace",
  "args": {
    "value": "on"
  }
}
```

Package:

```text
NukeFire.Controls.Request
```

### 5. Result packet

```json
{
  "schema": 1,
  "id": 42,
  "ok": true,
  "action": "reader.workspace",
  "message": "Reader Workspace enabled."
}
```

Package:

```text
NukeFire.Controls.Result
```

Validate every field and sanitize the returned message before placing it in terminal output.

### 6. Snapshot before coordinated changes

NukeFire sends:

```text
reader.session.begin
```

before a coordinated Reader preset. The client saves one pre-Reader setup snapshot without overwriting an existing snapshot through repeated setup calls.

On exit the server sends:

```text
reader.exit.restore
```

The client restores only settings owned by Reader setup, not unrelated user preferences.

### 7. Keep SR independent

If GMCP is absent or the client does not advertise the controls package, SR must still work. Do not make basic accessibility conditional on one desktop client.

---

## Source coverage available in this public reference

This pass was checked against the current Beta.76 command table, semantic output policy, client request allowlist, Reader presets, and renderer request/result path. The public repository itself already contains the full production client source.

For a Circle/TBA port, the remaining game-specific work is mostly integration:

1. add/persist a screen-reader preference equivalent to `PRF_SCREEN_READER`;
2. register `sr`, `client`, `cr`, `reader`, `output`, and `speech` as appropriate;
3. adapt the SR resource/room/group helpers to your game structs;
4. wire the GMCP capability bit/package name into your existing protocol layer;
5. call your semantic output context around the game events you want players to control;
6. choose which critical writes receive the protected-output flag;
7. expose `screen_reader` in a normal character-status package if you want the cooperating client to automatically follow server accessibility intent.

If your codebase does not already support GMCP, add GMCP generically first rather than embedding Telnet negotiation inside SR/CR command code.
