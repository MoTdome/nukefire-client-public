# Product Vision

NukeFire Client is a modern, approachable, highly customizable MUD client built
around NukeFire. Its inspiration is the durable command-driven power of classic
clients such as TinTin++, presented through a contemporary desktop interface.

It is not intended to be a TinTin++ clone. The goal is to preserve the strengths
of traditional MUD clients while making them discoverable, inspectable, safe,
and deeply integrated with NukeFire.

## Multi-session crew control

The client should match the practical multibox strengths of TinTin++ without
mixing character state or hiding automation. Several NukeFire sessions may run
concurrently, while a named session, group, or leader/follower relationship can
receive a command without switching the visible tab. Every session remains an
independent connection with its own Telnet, GMCP, terminal, history, panels, and
bounded command queue.

## Core customization systems

- Persistent aliases
- Actions and triggers
- Variables and captured values
- Timers and delayed commands
- Highlights, substitutions, and gags
- Paths and speedwalks
- Key bindings and command macros
- Character profiles
- Shareable packages
- A later, controlled scripting API

Every customization system should be available through both a clear graphical
editor and a compact command-oriented syntax where practical.

## One command and event pipeline

All input sources must use one outgoing pipeline:

```text
keyboard / button / timer / action / NukeFire panel
  -> command parser
  -> aliases and variables
  -> path and multi-command expansion
  -> guarded command queue
  -> NukeFire connection
```

All incoming information must use one event pipeline:

```text
TCP / Telnet / GA / EOR / GMCP
  -> UTF-8 and ANSI decoding
  -> line and prompt boundaries
  -> actions, highlights, substitutions, and gags
  -> NukeFire state integration
  -> terminal, channels, status panels, and accessibility output
```

## NukeFire-first integration

The general customization engine should remain useful for ordinary MUD
behavior, while a separate NukeFire layer understands structured game concepts:

- Health, mana, movement, and enemy condition
- Rooms, zones, exits, GPS, and paths
- Groups, channels, tells, and combat state
- Classes, remorts, runes, buffs, and cooldowns
- Equipment, upgrades, sockets, modules, and tattoo inks
- SSF ownership and restrictions
- Commands such as `runinfo`, `huntme`, `upgrade`, and `buffinfo`
- Screen-reader, compact-output, and beginner guidance

## Project discipline

- Preserve every confirmed working build with a Git tag.
- Make one small behavioral interval at a time.
- Add regression coverage before broadening a system.
- Keep configuration files visible, portable, and recoverable.
- Avoid hidden state that makes a player's aliases or actions difficult to back up.
- Protect the connection, Telnet, ANSI, UTF-8, and accessibility foundations from
  unrelated feature work.
