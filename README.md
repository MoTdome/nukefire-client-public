# NukeFire Client

Public source snapshot of the NukeFire Client **Beta.84** milestone.

## This snapshot

This repository is the reviewed and sanitized public snapshot of the
**Beta.84** milestone. Beta.84 is built directly on the public Beta.83 source
commit `2271b8616825d1dd44866fac4f656fa0d42d3dcc`.

Beta.84 preserves Beta.83's experimental Windows PRISM Native Reader transport
and changes only the Windows build toolchain required to produce the
distribution successfully:

- Windows releases use the `windows-2025-vs2026` runner;
- the workflow initializes the x64 MSVC environment and installs current CMake;
- the native helper builds with Ninja Release instead of Visual Studio
  `-A x64`;
- macOS and Linux release runners remain unchanged.

Native Reader runtime behavior, PRISM v0.18.2 pinning, NVDA/JAWS selection,
Beta.82 fallback behavior, manual Reader announcements, and NukeFire Voice are
unchanged from Beta.83.

See `RELEASE-NOTES-beta84.md` for the complete Beta.84 scope.

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
private development history. Beta.84 is reconciled on the public Beta.83 source
commit `2271b8616825d1dd44866fac4f656fa0d42d3dcc`, reviewed, and independently verified before its public
commit and tag are pushed. Private Git history, backup trees, local distribution
outputs, credentials, private checkout paths, game-server paths, and
build-machine metadata are intentionally excluded.

## License

See [`LICENSE`](LICENSE) for the source license. Third-party dependencies retain
their own licenses.
