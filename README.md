# NukeFire Client

Public source snapshot of the NukeFire Client **Beta.76** milestone from private source commit `2b563de`.

NukeFire Client is the cross-platform Electron client developed for the [NukeFire mud](https://nukefire.org) and released here so other mud developers, client authors, accessibility testers, and protocol implementors can inspect, test, adapt, and discuss the ideas used by the client.

## This snapshot

This repository is a deliberately reviewed and sanitized public snapshot of the Beta.76 development milestone at private source commit `2b563de91a757205525836363aa249bc952c664b`. The public package version for this release is `0.3.1-beta.76`.

Beta.76 makes audio and common client controls easier to operate without broadening client authority:

- a command-line-first custom-sound workflow using the existing protected chooser, Soundpack Store, and `.nfsp` format;
- ADD, ASSIGN, SHOW, TEST, CLEAR, and DELETE operations beside the existing SOUND LIST / SEARCH / SHOW contracts;
- general audio and soundpacks that work independently of Reader Workspace, native screen readers, and Self-Voice;
- manually entered SOUND results announced through the existing Reader path while automated failures remain quiet;
- 2,500 bounded Personal Sounds allocations and 4,096 bounded archive entries;
- one communication-sound enable authority and an exact 75-action server/client control contract;
- prompt-completed Actions/Lua triggers restored at TELNET GA/EOR boundaries;
- stable caret position while typing in a detached GPS search field;
- the existing filesystem, process, network, DOM, raw-terminal, and render-veto safety boundaries remain in place.

The complete private source is verified immediately before private publication, and this public candidate is independently verified before its commit and tag are pushed.

See `RELEASE-NOTES-beta76.md` and the included `docs/BETA76-*.md` references for the detailed Beta.76 scope.

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

This public repository contains sanitized public snapshots rather than the private development history. Beta.76 is reconciled from private source commit `2b563de91a757205525836363aa249bc952c664b` only after review and verification. Private Git history, backup trees, local distribution outputs, credentials, private checkout paths, game-server paths, and build-machine metadata are intentionally excluded.

## License

See [`LICENSE`](LICENSE) for the source license. Third-party dependencies retain
their own licenses.
