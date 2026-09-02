# NukeFire Client 0.3.1-beta.25 — Custom Mapper Sections

The Mapper pane can now show or hide its three major regions independently:

- GPS Navigator
- Map and controls
- Current room information

The choices are available directly from the Mapper panel menu and in
Preferences → Sidebar Panels → Panel Details. They persist with the normal
client settings and also apply to a popped-out Mapper window.

The existing exit-list preference remains available inside the room-information
section. Existing users retain the full Mapper layout by default.

## Mapper visibility hotfix

The GPS Navigator now fully leaves the Mapper layout when disabled. The old
symbol legend and long BIGMAP/GPS diagnostic line have also been removed from
the visible bottom of the map. The compact status remains available to assistive
technology without creating another visible footer.

## Input-preserving keyboard shortcuts

Movement hotkeys may now be used while a command is waiting in the command bar. The shortcut sends normally without replacing that draft, without selecting the movement command, and without making it the command used by repeat-Return. Other shortcut safety rules remain in place for passwords, dialogs, disabled bindings, and ordinary text-producing shortcuts.
