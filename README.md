# NukeFire Client

Public source snapshot of the NukeFire Client **Beta.80** milestone.

## This snapshot

This repository is the reviewed and sanitized public snapshot of the
**Beta.80** milestone. Beta.80 is built directly on the public Beta.79 release
commit `72535ee9b855065b961ddaadb51160d127802c6e` and is independently verified again before the public
release commit and tag.

Beta.80 is intentionally a narrow QC hotfix:

- detached Terminal Wall popouts get a practical 16px full-width grab/reveal
  shelf with a short hide grace while preserving Reader/touch/persistent-header
  behavior;
- visible terminal Find is brought back into alignment with the shared bounded
  TinTin wildcard semantics;
- MSLP PROMPT/MENU handling is tightened and secure/unsupported OSC 68 forms are
  prevented from falling through into executable simple links.

The release preserves the broader Beta.79 Reader, TinTin, mapper, filesystem,
process, network, DOM, raw-terminal, accessibility, soundpack, multi-session,
and server-authority boundaries.

See `RELEASE-NOTES-beta80.md` for the complete Beta.80 scope. The Beta.79 release
notes remain useful background for the larger Reader and TinTin veteran pass.

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
private development history. Beta.80 is reconciled on the public Beta.79 release
commit `72535ee9b855065b961ddaadb51160d127802c6e`, reviewed, and independently verified before its public
commit and tag are pushed. Private Git history, backup trees, local distribution
outputs, credentials, private checkout paths, game-server paths, and
build-machine metadata are intentionally excluded.

## License

See [`LICENSE`](LICENSE) for the source license. Third-party dependencies retain
their own licenses.
