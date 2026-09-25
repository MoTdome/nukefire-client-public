# NukeFire Client

Public source snapshot of the NukeFire Client **Beta.82** milestone.

## This snapshot

This repository is the reviewed and sanitized public snapshot of the
**Beta.82** milestone. Beta.82 is built directly on the public Beta.81 release
commit `414d45ce746bd0b44c49bf133c600ac866adfe08` and is independently verified again before the public
release commit and tag.

Beta.82 is a focused Native Reader reliability release:

- completed-line Native Reader output prefers `ariaNotify()` where supported and
  retains the polite live region as a compatibility fallback;
- the hidden output region no longer causes repeated "New NukeFire output"
  announcements;
- a gameplay prompt consisting only of `>` is kept out of Native Reader live
  speech and Reader Review while richer prompts remain available.

The broader Beta.81 MSLP fail-open correction, Beta.80 QC work, Beta.79 Reader
and TinTin systems, mapper, filesystem, process, network, soundpack,
multi-session, and server-authority behavior is otherwise unchanged.

See `RELEASE-NOTES-beta82.md` for the complete Beta.82 scope. Beta.81 release
notes remain the reference for the immediately preceding emergency hotfix.

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
private development history. Beta.82 is reconciled on the public Beta.81 release
commit `414d45ce746bd0b44c49bf133c600ac866adfe08`, reviewed, and independently verified before its public
commit and tag are pushed. Private Git history, backup trees, local distribution
outputs, credentials, private checkout paths, game-server paths, and
build-machine metadata are intentionally excluded.

## License

See [`LICENSE`](LICENSE) for the source license. Third-party dependencies retain
their own licenses.
