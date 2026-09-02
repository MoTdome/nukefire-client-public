# NukeFire Client 0.3.1-beta.23

## TinTin-style command line

Beta.23 makes the client command line feel more familiar to TinTin++ and
WinTin users without removing the existing NukeFire forms.

- `#unalias`, `#unaction`, and `#ungag` remove definitions directly while the
  existing `delete` and `remove` subcommands remain supported.
- `#session name host port` works with or without braces; it creates a missing session or connects/reconnects the existing named session, then activates its tab
  from the command line. `#session`, `#session {name}`, `#session +`, and
  `#session -` list and move between sessions.
- Existing named routing remains available: `#rambo score` sends `score` to
  Rambo without switching away from the current tab.
- `#class` groups aliases, variables, actions, and gags. Open classes label new
  definitions; save/clear/load provides TinTin-style set removal and restore;
  on/off offers a convenient live toggle; assign creates a one-line bundle.
- Class membership and saved class copies persist in the versioned settings
  file. Settings schema 26 preserves older definitions as unclassed records.

File-backed `#class read` and `#class write` remain deliberately unavailable in
this milestone. The client reports that limitation rather than performing
unreviewed file access.

## Larger and exact panel windows

Every popped-out panel now has a Size control in its header. Compact, Standard,
Large, Fill Display, Panel Default, and exact custom width/height choices are
available without docking the panel first. Ordinary edge dragging remains
supported.

The previous 1800 × 1400 saved-window ceiling has been removed. A panel can use
the full usable area of a 4K, ultrawide, or secondary display, remembers its own
bounds, participates in Shared Crew Workspace when enabled, and still recovers
safely if a saved monitor is later unavailable.


### Vitals display hotfix

Preferences now provides separate formats for main and group Health, Mana, and Movement, plus three number sizes. Group rows expand across wider docks and popouts, and the active character's duplicate group row is hidden by default while grouped.

## Expanded terminal fonts

Preferences now offers Fixedsys Excelsior, Maple Mono, Maple Mono NL, JetBrains Mono, Fira Code, Hack, Source Code Pro, Terminus, Inconsolata, and Cascadia Mono/Code in addition to the existing platform fonts. These optional choices use fonts installed on the player's computer and safely fall back to a standard monospace face when unavailable.

## Brighter interface and scrollback copy

- Preferences now offers Original Dark, Brighter, and High Contrast interface modes. The setting brightens client panels, borders, controls, and labels without rewriting NukeFire ANSI colors.
- Selected terminal scrollback can now be copied with Command-C on macOS or Ctrl-C on Windows and Linux. Edit → Copy uses the same safe clipboard path.
