# NukeFire Client

Public source snapshot of the NukeFire Client **Beta.85** milestone.

## This snapshot

This repository is the reviewed and sanitized public snapshot of the
**Beta.85** milestone. Beta.85 is built directly on the public Beta.84 release
commit `a6262f91e479fb6274507c161a54300714bfa94c`.

Beta.85 hardens the Windows PRISM Native Reader transport after real NVDA play
testing confirmed that Beta.84 automatic MUD output was useful without observed
dropped lines.

The release adds:

- `#reader status`, `#reader test`, `#reader stop`, and `#reader reconnect`;
- forced helper restart and supported screen-reader reacquisition;
- stale old-helper exit protection;
- bounded timeout/write/backend failure recovery;
- native transport restart/reconnect/failure diagnostics;
- foreground-only behavior shared by Native Reader and Self-Voice;
- immediate cancellation of NukeFire-owned native speech when the app moves to
  the background;
- explicit single-owner handoff between Native Reader and NukeFire Self-Voice.

Background-suppressed speech is not replayed when focus returns; Reader Review
and other client processing continue normally. macOS/Linux continue using the
compatibility ARIA transport.

See `RELEASE-NOTES-beta85.md` for the complete Beta.85 scope.

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
private development history. Beta.85 is reconciled on the public Beta.84
release commit `a6262f91e479fb6274507c161a54300714bfa94c`, reviewed, and independently verified before
its public commit and tag are pushed. Private Git history, backup trees, local
distribution outputs, credentials, private checkout paths, game-server paths,
and build-machine metadata are intentionally excluded.

## License

See [`LICENSE`](LICENSE) for the source license. Third-party dependencies retain
their own licenses.
