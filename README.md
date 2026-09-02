# NukeFire Client

Public source snapshot of **NukeFire Client 0.3.1-beta.73**.

NukeFire Client is the cross-platform Electron client developed for the
[NukeFire MUD](https://nukefire.org/) and released here so other MUD developers,
client authors, accessibility testers, and protocol implementors can inspect,
test, adapt, and discuss the ideas used by the client.

## This snapshot

This repository is intentionally a **clean public snapshot** of `v0.3.1-beta.73`. It does
not contain the private/development Git history or old local build artifacts.

Beta.73 focuses heavily on sustained responsiveness:

- bounded terminal output and combat-flow pacing;
- MCCP2 and MCCPX/Zstandard compression support;
- 64 KiB streaming decoder output chunks;
- rapid multi-kill target presentation stability;
- coalesced target-refresh GMCP requests;
- long-session performance diagnostics;
- Mapper render/save instrumentation;
- accessibility-focused Reader and Self-Voice workflows;
- configurable soundpack support.

See the included release and testing notes for the exact Beta.73 scope.

## Test soundpacks

The complete soundpacks used with this public snapshot are collected under
[`soundpacks/`](soundpacks/). They are included primarily as working examples
and test material for the semantic sound-event system.

## Server integration

The client is only half of some NukeFire features. A separate
[`server-integration/`](server-integration/) area is reserved for focused,
portable examples of the server-side GMCP packages and commands that accompany
the client.

The intent is **not** to publish the entire NukeFire game source. Instead, the
integration examples will isolate the useful protocol/command ideas so another
MUD implementor can understand and adapt them.

Planned examples include relevant pieces of:

- `NukeFire.Mob.Info` / Mob Inspector;
- `Char.TargetAffects`;
- `NukeFire.Combat`;
- `NukeFire.Map.Local` and GPS/context integration;
- semantic sound events;
- `CR SOUNDPACK LIST`, `SET`, and `TEST`;
- other small server commands required by public client features.

## Building

Install dependencies:

```bash
npm ci
```

Run the verification suite:

```bash
npm run verify
```

Start the client:

```bash
npm start
```

Platform distribution scripts are defined in `package.json`.

## Security / public-history note

This repository begins with a fresh public commit made from the exact Beta.73
release tag. Private development history, backup trees, local distribution
outputs, credentials, and build-machine metadata are intentionally excluded.

## License

See [`LICENSE`](LICENSE) for the source license. Third-party dependencies retain
their own licenses.
