# NukeFire Client 0.3.1-beta.44

## Far-Right Dock

Beta.44 adds the first practical nested-docking step: two independent panel
columns can now sit to the right of the terminal at the same time.

### Try it

1. Open a panel menu and choose **Move Right** for Communications.
2. Open another panel menu and choose **Move Far Right** for Affects.
3. Drag the separator on the left edge of either column to resize it.
4. Move panels into tabs, pop them out, and use **Dock Panel** to return them.
5. Restart the client and switch sessions to confirm the saved arrangement returns.

Panels may also be dragged directly onto the new far-right drop target. The Right
and Far Right columns save independently for default workspaces, individual
characters, and Shared Crew Workspace. Empty columns collapse automatically.

### Accessibility and safety

The new separator supports Arrow keys, Shift+Arrow, Home, End, and double-click
reset with complete separator semantics. The layout engine protects the existing
terminal minimum width, and no command, Telnet, GMCP, prompt, output-history, or
pop-out authority changed.

### Verification gate

The guarded installer creates a timestamped backup, verifies exact source files,
runs syntax and whitespace checks, and requires **590/590 tests**. Any failure
restores the previous exact Beta.42 or Beta.43 state. Nothing is committed or tagged.
