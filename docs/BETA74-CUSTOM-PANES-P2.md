# NukeFire Beta.74 — Custom Panes Workspace P2

This pass promotes each active player-created Custom Pane into its own NukeFire workspace panel.

## Player-facing behavior

A saved or manually run Lua script can continue to create panes with the same API:

```lua
local pane = nf.pane.create("combat", {
  title = "Combat",
  rows = {
    { id = "hp", type = "bar", label = "HP" },
    { id = "target", type = "text", label = "Opponent" }
  }
})
```

No script changes are required.

Each active pane now has its own normal panel title bar and menu. It can:

- drag between the left, right, far-right, and lower docks;
- move earlier/later inside a dock;
- join the previous or next panel as a tab;
- separate from a tab group;
- be hidden locally without destroying the Lua pane.

Lua `pane:hide()` / `pane:show()` still control script visibility. A local workspace Hide stays in effect across ordinary `pane:set()` updates; an explicit Lua hide/show change may override that local visibility.

## Compatibility

The older internal `luaPanes` workspace id remains only as a compatibility/overview surface. Player-created panes themselves are presented as **Custom Panes**, not “Lua panes.”

## Deliberate limits

This pass does **not** add:

- HTML, CSS, JavaScript, DOM, iframe, or arbitrary renderer access;
- filesystem/network/package access;
- gagging or synchronous output veto;
- custom-pane popout windows;
- persistent custom-pane dock/tab geometry across client restarts.

The last two items are intentionally deferred until the runtime workspace behavior is proven.

## Performance

Value updates do not rebuild the whole workspace. Existing pane sections are retained and text/progress nodes are updated in place. Full dock/tab rendering occurs only when pane identity, title, or visibility/layout changes.
