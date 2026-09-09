# NukeFire Client

Public source snapshot of the NukeFire Client **Beta.75** milestone from private source commit `7ef02ed`.

NukeFire Client is the cross-platform Electron client developed for the [NukeFire mud](https://nukefire.org) and released here so other mud developers, client authors, accessibility testers, and protocol implementors can inspect, test, adapt, and discuss the ideas used by the client.

## This snapshot

This repository is a deliberately reviewed and sanitized public snapshot of the Beta.75 development milestone at private source commit `7ef02ed7e531271ff76d2777fec60fe33f736b04`. The public package version for this release is `0.3.1-beta.75`.

Beta.75 focuses on making scripting, sounds, and accessibility easier without broadening client authority:

- Lua correctness fixes for logical-line regex triggers, safe formatted echo, saved-script comments, and script-owned Save & Run cleanup;
- TinTin `#SOUND` integration with portable soundpack-owned `custom.*` events;
- case-insensitive SOUND LIST / SEARCH / SHOW discovery;
- stricter communication/soundpack playback gates and useful blocked-playback explanations;
- local `#A11Y` Last Event / Why / Report / Capabilities / Test / Doctor commands;
- portable local accessibility profiles and broader semantic Reader History coverage;
- the existing filesystem, process, network, DOM, raw-terminal, and render-veto safety boundaries remain in place.

The complete private source is verified immediately before private publication, and this public candidate is independently verified before its commit and tag are pushed.

See `RELEASE-NOTES-beta75.md` and the included `docs/BETA75-*.md` references for the detailed Beta.75 scope.

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
