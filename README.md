# NukeFire Client

Public source snapshot of the NukeFire Client **Beta.79** milestone.

## This snapshot

This repository is the reviewed and sanitized public snapshot of the
**Beta.79** milestone. Beta.79 is built on the public Beta.78 base commit
`26f0d418a65ac72c6fb9c9b84efe7bb6b8163454` and was independently verified
again before the public release commit and tag.

Beta.79 focuses on two related compatibility/accessibility goals:

- a native screen-reader path driven by completed NukeFire Reader lines, with
  raw MUD-output review and MUSH-style Reader setup that can explicitly choose
  Native Screen Reader or NukeFire Voice;
- a final TinTin veteran compatibility pass covering command-line editing keys,
  reverse history search, SHOW/SHOWME behavior, LINE compatibility, wildcard
  output search, MSLP links, richer Event help, and larger/local Mapper
  annotations.

The release preserves the existing filesystem, process, network, DOM,
raw-terminal, accessibility, soundpack, multi-session, and server-authority
boundaries.

See `RELEASE-NOTES-beta79.md` for the complete Beta.79 scope. The existing
Beta.78 terminal/customization notes and Beta.76 audio/control references remain
useful background for unchanged systems.

## Test soundpacks

The complete soundpacks used with this public snapshot are collected under
[`soundpacks/`](soundpacks/). They are included primarily as working examples
and test material for the semantic sound-event system.

## Server integration

The client is only half of some NukeFire features. A separate
[`server-integration/`](server-integration/) area contains focused, portable
examples of the server-side GMCP packages and commands that accompany the client.

The intent is **not** to publish the entire NukeFire game source. Instead, the
integration examples isolate useful protocol/command ideas so another MUD
implementor can understand and adapt them.

Included examples cover relevant pieces of:

- `NukeFire.Mob.Info` / Mob Inspector;
- `Char.TargetAffects`;
- `NukeFire.Combat`;
- `NukeFire.Map.Local` and GPS/context integration;
- semantic sound events;
- the bounded 75-action `NukeFire.Controls` contract and CR accessibility/audio/soundpack routes;
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

This public repository contains sanitized public snapshots rather than the
private development history. Beta.79 is reconciled on the public Beta.78 base
commit `26f0d418a65ac72c6fb9c9b84efe7bb6b8163454`, reviewed, and independently
verified before its public commit and tag are pushed. Private Git history,
backup trees, local distribution outputs, credentials, private checkout paths,
game-server paths, and build-machine metadata are intentionally excluded.

## License

See [`LICENSE`](LICENSE) for the source license. Third-party dependencies retain
their own licenses.
