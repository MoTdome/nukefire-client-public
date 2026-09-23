# NukeFire Client

Public source snapshot of the NukeFire Client **Beta.78** milestone from private source commit `211d042`.

NukeFire Client is the cross-platform Electron client developed for the [NukeFire mud](https://nukefire.org) and released here so other mud developers, client authors, accessibility testers, and protocol implementors can inspect, test, adapt, and discuss the ideas used by the client.

## This snapshot

This repository is a deliberately reviewed and sanitized public snapshot of the Beta.77 development milestone at private source commit `211d04259e5044a6be53ad6ba3e2bde234837cdc`. The public package version for this release is `0.3.1-beta.78`.

Beta.78 follows the Beta.77 reliability pass with user-selectable interface chrome and a hardened main-terminal bottom boundary:

- prevents grouped follower movement summaries from being misclassified as Group Say or playing Group communication audio;
- keeps native select controls usable in generic detached panels such as GPS and GroupAssist;
- adds terminal-only connected play mode and frameless detached panel tiles with top-edge reveal/drag controls;
- removes decorative HUD corner/rivet hardware and lets docked pane titlebars auto-hide during play while preserving functional tab navigation;
- hardens xterm sizing after vertical resize and fullscreen transitions;
- adds compact Loot History controls and independently adjustable Communications message text;
- adds authoritative remort display to Session Vitals, showing `R—` when remort data is not supplied;
- adds an optional echo of commands actually sent to NukeFire after alias/trigger/routing/Lua/macro expansion, while never echoing secure/password input;
- preserves the existing filesystem, process, network, DOM, raw-terminal, accessibility, soundpack, multi-session, and server-authority boundaries.

The complete private source was verified before the private Beta.77 commit. This public candidate is independently installed and verified again before its public commit and tag are pushed.

See `RELEASE-NOTES-beta78.md` for the Beta.78 customization and terminal-geometry scope; `RELEASE-NOTES-beta77.md` remains the detailed reliability baseline. The existing Beta.76 audio/control and server-integration references remain applicable because Beta.77 does not broaden those server contracts.

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

This public repository contains sanitized public snapshots rather than the private development history. Beta.77 is reconciled from private source commit `211d04259e5044a6be53ad6ba3e2bde234837cdc` only after review and verification. Private Git history, backup trees, local distribution outputs, credentials, private checkout paths, game-server paths, and build-machine metadata are intentionally excluded.

## License

See [`LICENSE`](LICENSE) for the source license. Third-party dependencies retain
their own licenses.
