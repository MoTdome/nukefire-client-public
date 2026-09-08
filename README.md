# NukeFire Client

Public source snapshot of the NukeFire Client Beta.74 development milestone from private source commit `30bcdfa`.

NukeFire Client is the cross-platform Electron client developed for the
[NukeFire MUD](https://nukefire.org/) and released here so other MUD developers,
client authors, accessibility testers, and protocol implementors can inspect,
test, adapt, and discuss the ideas used by the client.

## This snapshot

This repository is a deliberately reviewed and sanitized public snapshot of the Beta.74 development milestone at private source commit `30bcdfae2e397833de930f32329175a712b7008f`. The application package version is still `0.3.1-beta.73` until the formal Beta.74 release/version bump; this commit is a source/reference milestone rather than a packaged release.

Beta.74 substantially expands the scripting layer while keeping NukeFire's existing safety and simplicity boundaries:

* modern TinTin compatibility with per-session definitions and routing;
* production Lua 5.4 scripting in the bounded Wasmoon Worker;
* shared TinTin/Lua variables, tables, GMCP, events, aliases, triggers, timers, and Speedwalk;
* Mudlet-familiar Lua callbacks, GMCP/MSDP compatibility, diagnostics, and common helper functions;
* NukeFire-managed modules, protected storage, saved multi-line scripts, and optional autorun;
* native Custom Panes with live GMCP-driven updates and workspace docking/tabbing;
* no arbitrary Lua filesystem, shell/process, network, DOM, raw xterm, HTML/CSS/JavaScript pane, or synchronous gag/render-veto authority.

The complete private source milestone passed 1723/1723 tests before this public reconciliation, and the public candidate is independently verified before it is committed and pushed.

See `RELEASE-NOTES-beta74.md` and the included `docs/BETA74-*.md` references for the Beta.74 scripting/pane scope.

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

This public repository contains sanitized public snapshots rather than the private development history. Beta.74 is reconciled from private source commit `30bcdfae2e397833de930f32329175a712b7008f` only after review and verification. Private Git history, backup trees, local distribution outputs, credentials, private checkout paths, game-server paths, and build-machine metadata are intentionally excluded.

## License

See [`LICENSE`](LICENSE) for the source license. Third-party dependencies retain
their own licenses.
