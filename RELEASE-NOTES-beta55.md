# NukeFire Client 0.3.1-beta.55 — Persistent Character Workspaces and Resizable Panels

## Your workspace comes back the way you left it

NukeFire now remembers the overall client geometry instead of reconstructing a
fresh default canvas each time it opens.

The main application window remembers its normal size, screen position, and
maximized state. Saved bounds are recovered safely if monitor geometry changes.

## Character-specific pane sizing

Docked workspace panes can be resized vertically, and those heights persist
through the normal NukeFire settings system.

Characters may keep independent pane arrangements. Shared Crew Workspace keeps
one shared arrangement instead.

The last identified character workspace is remembered at startup and its saved
geometry is reapplied when character identity arrives after reconnect.

## Resize controls

Each resizable pane has a yellow horizontal resize handle at its visible bottom
edge.

- Drag up or down to resize.
- Arrow Up / Arrow Down resize from the keyboard.
- Shift uses larger keyboard steps.
- Home / End move to safe minimum or maximum sizes.
- Double-click restores that pane's default height.

The handle is outside panel scroll flow, so content-heavy panes such as Affects
do not push the resize control below the visible area.

## Communications and pop-outs

Communications keeps its established internal message scrolling and live-edge
behavior while its outer pane can be resized normally.

Detached panel Size controls remain available, and narrow pop-out windows keep
the Size menu inside the visible window.

## Persistence safety

Pane-height, dock-size, and last-character geometry changes are flushed
immediately through the normal settings store, including when NukeFire is quit
soon after a resize.

Beta.54's session-scoped TinTin profiles and multiplayer isolation remain intact.

## Verification

- Focused suite: 61 tests, 61 pass, 0 fail.
- Full suite: 650 tests, 650 pass, 0 fail.
- npm check and git diff --check pass.
