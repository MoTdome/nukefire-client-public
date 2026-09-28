# NukeFire Client

Public source snapshot of the NukeFire Client **Beta.83** milestone.

## This snapshot

This repository is the reviewed and sanitized public snapshot of the
**Beta.83** milestone. Beta.83 is built directly on the public Beta.82 release
commit `911ebf38a3759903f648e77d3107a299d8410e64` and is independently verified again before the public
release commit and tag.

Beta.83 introduces an experimental Windows Native Reader transport:

- automatic completed MUD output can use an isolated native PRISM helper with
  direct NVDA or JAWS delivery;
- the helper supports ordered output, interruption, stop, and backend/status
  reporting;
- Beta.82 `ariaNotify()` / live-region behavior remains the fallback whenever
  the helper or supported screen reader is unavailable;
- manual Reader/UI announcements and NukeFire Self-Voice keep their established
  Beta.82 paths;
- macOS and Linux Native Reader behavior remains unchanged from Beta.82.

The Windows Setup and Portable builds compile and bundle the pinned PRISM
v0.18.2 helper automatically. See `RELEASE-NOTES-beta83.md` for the full
experimental scope and testing expectations.

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
private development history. Beta.83 is reconciled on the public Beta.82 release
commit `911ebf38a3759903f648e77d3107a299d8410e64`, reviewed, and independently verified before its public
commit and tag are pushed. Private Git history, backup trees, local distribution
outputs, credentials, private checkout paths, game-server paths, and
build-machine metadata are intentionally excluded.

## License

See [`LICENSE`](LICENSE) for the source license. Third-party dependencies retain
their own licenses.
