# NukeFire Client

Public source snapshot of the NukeFire Client **Beta.81** milestone.

## This snapshot

This repository is the reviewed and sanitized public snapshot of the
**Beta.81** milestone. Beta.81 is built directly on the public Beta.80 release
commit `99dab434e80ca1eada45c8d1302f5a4f8964ac2a` and is independently verified again before the public
release commit and tag.

Beta.81 is intentionally a single-purpose emergency hotfix:

- ordinary ANSI underline/reset text can no longer wedge the Beta.80 MSLP
  translator and hide all later game output;
- malformed or unterminated simple-link candidates fail open at safe boundaries;
- valid MSLP simple links and the Beta.80 SEND/PROMPT/MENU protections remain
  intact.

The broader Beta.80 detached-pane, TinTin Find, MSLP hardening, Beta.79 Reader,
TinTin, mapper, filesystem, process, network, accessibility, soundpack,
multi-session, and server-authority behavior is otherwise unchanged.

See `RELEASE-NOTES-beta81.md` for the complete Beta.81 scope. Beta.80 release
notes remain the reference for the immediately preceding QC release.

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
private development history. Beta.81 is reconciled on the public Beta.80 release
commit `99dab434e80ca1eada45c8d1302f5a4f8964ac2a`, reviewed, and independently verified before its public
commit and tag are pushed. Private Git history, backup trees, local distribution
outputs, credentials, private checkout paths, game-server paths, and
build-machine metadata are intentionally excluded.

## License

See [`LICENSE`](LICENSE) for the source license. Third-party dependencies retain
their own licenses.
