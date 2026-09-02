# Server integration examples

This directory is intentionally separate from the NukeFire Client source.

Some public client features depend on server-side GMCP packages or small game
commands. The goal here is to publish **focused implementation examples** that
another MUD implementor can study and adapt without publishing the entire
NukeFire server codebase.

## Planned layout

```text
server-integration/
├── README.md
├── gmcp/
│   ├── combat/
│   ├── mob-inspector/
│   ├── mapper/
│   └── sound-events/
└── commands/
    └── soundpack/
```

Likely examples include:

- `NukeFire.Mob.Info`;
- `Char.TargetAffects`;
- `NukeFire.Combat`;
- `NukeFire.Map.Local`;
- GPS/context packages used by the client;
- semantic sound-event emission;
- `CR SOUNDPACK LIST`;
- `CR SOUNDPACK SET`;
- `CR SOUNDPACK TEST`.

Each example should document:

1. what the client expects;
2. the GMCP/package or command contract;
3. the smallest useful server-side implementation;
4. example payloads;
5. lifecycle/copyover considerations where relevant;
6. accessibility implications;
7. which pieces are NukeFire-specific versus generally reusable.

The server examples are not included in the initial public snapshot until they
have been separately reviewed for portability and for anything that should stay
private to the game.
