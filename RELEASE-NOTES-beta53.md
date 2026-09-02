# NukeFire Client 0.3.1-beta.53 — Session Vitals and Communications Workspace

## Session Vitals

- The active docked prompt remains one clean line.
- Connected inactive characters on the same server appear in their own Session Vitals panel.
- Companion rows show character name, HP, Mana, and Movement.
- HP turns red strictly below 25 percent and retains an accessible low-health description.
- The panel supports the normal NukeFire workspace controls, including tabs, docking, dragging, resizing, visibility, and pop-out windows.

## Communications order and scrolling

- Choose **Newest at top** to keep the newest message first and review older traffic downward.
- Choose **Newest at bottom** for traditional chat flow and scroll upward through history.
- The choice persists with the active character or shared crew workspace.
- New traffic follows only when the viewer is already at that mode's live edge.
- Reviewing older messages is not interrupted by incoming traffic.
- Docked and detached Communications use the same order and scrolling behavior.

## Communications channels and controls

- Grats is available as a standard filter.
- SSF appears when advertised by the server or detected in traffic.
- Bonejack appears when bj/bonejack traffic is detected.
- Communications recognizes congrat/congrats, SSF, bonejack, and bonejacks output.
- Controls are separated into responsive Channels, Display, and Find rows.

## Workspace sizing

- Incoming messages cannot enlarge Communications beyond the user's selected dock, tab group, or pop-out dimensions.
- Side-docked Communications stays near the complete Mapper footprint rather than consuming the full dock.
- Message history scrolls internally in either order.
- Other selected tabs retain their normal height.

## Connection and session controls

- Host, Port, Connect, Disconnect, Knowledge, and Preferences align along one action row.
- Connection controls collapse automatically after connecting while connection status remains visible.
- A Show/Hide button always permits manual control.
- Disconnects and connection errors reveal the controls again.
- New Session opens a small Create tab first, then an in-flow form that pushes the workspace down instead of covering it.

## Verification

- Visually approved in the isolated Beta.53 laboratory.
- Focused suite: 158 tests, 158 pass, 0 fail.
- Full suite: 626 tests, 626 pass, 0 fail.
- npm check and git diff --check passed.
