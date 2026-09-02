# NukeFire Client 0.3.1-beta.26 — Client Command Help

Beta.26 adds a command-line help system for the client commands entered with the
selected TinTin-style prefix.

- `#help` prints a compact categorized list of available client commands.
- `#help <command>` prints syntax and focused notes for that command family.
- Help follows the configured `#`, `~`, `^`, or `/` client-command prefix.
- Related names resolve to the same topic, including `aliases`, `unaction`,
  `sessions`, `groups`, and `link`.
- Unknown topics fail safely and point back to the complete command list.
- `docs/CLIENT-COMMANDS.md` provides the complete readable command reference.
- The help list includes aliases, variables, actions, gags, classes, delays,
  loops, numbered repetition, Speedwalk, sessions, groups, routing, hyperlinks,
  and doubled-prefix literal commands.
