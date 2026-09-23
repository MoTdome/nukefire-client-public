# NukeFire Client 0.3.1-beta.77

## Terminal-wall polish

- Removes the remaining decorative outer HUD corner/edge overlays and cosmetic panel rivet corners.
- While terminal-only play mode is active, docked pane titlebars now leave normal layout too. Hovering or keyboard-focusing a pane reveals its title/menu as a small overlay; Reader Mode keeps normal chrome.
- Functional tab strips remain visible so grouped panes can still be switched without hidden navigation.

## Terminal Tiles play mode

- Detached panels are now true frameless windows. Their 6-pixel top reveal strip doubles as the drag handle; hovering or keyboard-focusing the strip reveals Size, Focus Game, and Dock Panel controls without permanently consuming panel space.
- A new default-on terminal-only play mode removes the main connection and session bars from layout while the active session is connected. The terminal starts at the top of the client; touching the top edge or keyboard-focusing those controls reveals them as an overlay without shifting the terminal.
- Reader Mode deliberately keeps the main connection/session controls in normal layout, preserving predictable keyboard and assistive-technology navigation.
- Disconnecting automatically returns the normal connection/session layout.

## Detached panels and workspace cohesion

- Fixes generic pop-out native dropdowns so GPS Navigator, GroupAssist Rotation, and other mirrored `<select>` controls stay open while the player chooses an item.
- Makes detached panel chrome content-first: Size, Focus Game, and Dock Panel stay tucked at the top edge and reveal on hover/focus; screen-reader and touch use keeps the controls persistently available.
- Adds optional auto-hide docked panel headers for a terminal-screen workspace.
- Makes Loot History toolbar controls use the same compact sizing language as Communications.
- Adds persistent Communications message text sizing without inflating channel buttons.
- Adds remort display to Session Vitals when the authoritative Char.Status feed supplies it; otherwise it clearly displays R— rather than inventing a value.
- Adds a separate sent-command echo preference that shows commands actually delivered to NukeFire after alias/trigger/routing/Lua/macro expansion. Secure input is never echoed.
- Fixes Group follower movement summaries being misclassified as Group Say and incorrectly playing the Group communication cue.
- Hardens xterm geometry after bottom-edge resizing and native fullscreen transitions with full terminal/input/prompt geometry observation plus a settled trailing fit.

## Preserved

- Server-side OUTPUT semantics remain separate from client Communications audio.
- Existing Group Say parsing, GMCP communication dedupe, Reader behavior, and soundpack authority remain unchanged.
- Existing panel resizing, docking, native window bounds persistence, terminal history, and accessibility paths remain intact.
