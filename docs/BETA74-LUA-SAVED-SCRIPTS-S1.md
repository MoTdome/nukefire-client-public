# Beta.74 Lua Saved Scripts S1

NukeFire Lua scripts can now be edited as normal multi-line source instead of being entered as one-line `#lua` commands.

## Open the editor

Use either:

```text
#luascript
```

or **File → Lua Scripts…**.

The editor is scoped to the active NukeFire session. Script names use managed-module names such as `main`, `combat`, or `panes.vitals`.

## Persistence and modules

Saved script source is stored in NukeFire's existing managed Lua state. A saved script is also a managed module with the same name, so other code may use `require("main")` or `require("panes.vitals")` where that makes sense.

Lua itself still receives no filesystem path, file handle, `io`, `os`, shell, Node, Electron, DOM, or arbitrary package loader.

## Auto-run

The editor can mark a script **Load automatically when this client session starts**. Auto-run scripts execute when saved sessions are restored at client startup. For a newly created session, the connect path waits for its initial auto-run load before making the first explicit connection.

This is intended for scripts that register GMCP/Event handlers, temporary automation, and native custom panes.

## Reload Autorun

**Reload Autorun** is deliberately stronger than Run Saved. It:

1. destroys transient custom panes for the session,
2. closes the session's current Lua VM and its transient callbacks/timers,
3. starts a fresh Lua VM,
4. runs all scripts with Auto-run enabled.

This gives edited `require()` dependencies a clean module cache and prevents duplicated handlers during development.

## Commands

```text
#luascript
#luascript new main
#luascript list
#luascript run main
#luascript autorun main on
#luascript autorun main off
#luascript reload
#luascript delete main
```

Each saved script is bounded to 64 KiB; at most 32 saved scripts are registered per session. Scripts remain session-isolated.

## Pane example

A saved auto-run script may contain ordinary multi-line code:

```lua
local pane = nf.pane.create("vitals", {
  title = "My Vitals",
  rows = {
    { id = "hp", type = "bar", label = "HP" },
    { id = "room", type = "text", label = "Room" }
  }
})

registerAnonymousEventHandler("gmcp.Char.Vitals", function()
  local v = gmcp.Char.Vitals or {}
  pane:set("hp", { value = tonumber(v.hp) or 0, max = tonumber(v.mhp) or 1 })
end)

registerAnonymousEventHandler("gmcp.Room.Info", function()
  local room = gmcp.Room.Info or {}
  pane:set("room", room.name or "Unknown")
end)
```

The native-pane safety boundary is unchanged: Lua supplies bounded data only. It does not supply HTML, CSS, JavaScript, DOM code, or a gag/render-veto callback.
