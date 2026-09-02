# NukeFire Client 0.3.1-beta.30

## TinTin Comfort Pack: Macros

Beta.30 adds persistent TinTin-style physical-key macros without introducing a
second outgoing-command path.

### Commands

```text
#macro
#macro {F4} {north; look}
#macro {Ctrl+F1} {assist tank; bash}
#macro show {F4}
#macro enable {F4}
#macro disable {F4}
#macro delete {F4}
#unmacro {F4}
```

`#mac` and `#unmac` are equivalent aliases.

### Supported keys

- F1 through F24
- Arrow, Home, End, Page Up, Page Down, Insert, Delete, and Escape
- Numpad digits, operators, decimal, and Enter
- Ctrl, Alt/Option, Shift, and Command modifier chords such as `Command+K`

The client matches physical keyboard codes, preserving numpad identity across
Num Lock changes.

### Pipeline and safety

- One through ten brace-aware semicolon-separated commands run in order.
- Every command uses the established `sendCommand`/`routeCommand` pipeline.
- Aliases, variables, client commands, session routing, repetition, delays, loops,
  and Speedwalk retain normal behavior.
- Prepared command text is preserved.
- Macro commands do not enter manual command history or replace blank-Return repeat.
- Secure input, dialogs, Preferences, Find, composition, held-key repeat, and
  unrelated editable form fields block execution.
- Definitions persist, migrate with a custom client-command prefix, and participate
  in class save, clear, and load.

Plain typing sequences such as `nn` and `^nn`, raw terminal escape strings, macro
recording, and `.tin` macro import remain for later compatibility intervals.

## Verification gate

The guarded installer requires the exact beta.29 payload and runs the full
457-test verification suite. Beta.30 must not be committed or tagged until that
Mac result and live key checks pass.
