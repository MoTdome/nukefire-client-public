# NukeFire Client 0.3.1-beta.22

This testing release adds a calmer multi-session workspace and separate windows for every
sidebar pane while preserving the beta.21 terminal, automation, semantic hotkeys, and
accessibility foundations.

## Shared Crew Workspace

- Adds an optional **Use one shared crew workspace for every session** preference.
- Enabling it captures the current panel visibility, positions, dock sizes, tab groups,
  selected tabs, Communications filter, and separate-window arrangement as the crew layout.
- Switching the active character changes live character data without moving or resizing the
  surrounding workspace.
- Existing character-specific layouts remain stored and become active again when the option
  is disabled.
- Terminal dimensions continue to synchronize to every connected session.

## Universal Panel Windows

Every established sidebar pane can now open in its own live window:

- Vitals
- Affects
- Quick Commands
- NukeFire State
- Protocol
- Communications
- NukeFire Console
- Mapper

Separate windows follow the active session, retain safe screen position and dimensions,
restore after restart, and can return through **Dock Panel**. Generic panel windows mirror
the authoritative main-client controls rather than creating a second command system, so
Quick Commands, contextual actions, GPS controls, mapper zoom, and other established panel
controls keep their existing behavior.

Accessibility remains keyboard-complete and screen-reader aware. Duplicate live-region
announcements are suppressed in mirrored windows, focus is retained across live updates,
and no information is represented by color alone.

GitHub Actions verification targets macOS 14, Ubuntu, and Windows 2025. Distribution targets
remain the unsigned universal macOS DMG/ZIP and Windows x64 installer/portable packages.
