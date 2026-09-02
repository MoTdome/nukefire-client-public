# NukeFire Client 0.3.1-beta.63
## Server-Aware Context and World Intelligence

Beta.63 locks the cumulative Beta.63 candidate work developed on top of trusted
Beta.62.

### Highlights

- Server-aware Mob Inspector with authoritative NukeFire GMCP state, active mob
  affects, transient room context, and compact combat presentation.
- Session Loot History fed by server-side autoloot/autogold events rather than
  terminal text scraping.
- Foundlist / Upgrades client surface backed by the existing server foundlist
  and compare verdicts, including safe numeric DBID actions.
- Permanent-affect client/server integration work so first-party NukeFire
  surfaces can represent developed characters more completely.
- Compact mapper/GPS guidance and the accumulated Beta.63 workspace, pane,
  vitals, affects, Reader, and presentation refinements retained from the
  accepted candidate sequence.
- Traditional terminal commands remain authoritative; structured client panes
  do not replace NukeFire gameplay rules.

### Release verification

The release script requires `git diff --check`, `npm run check`, and the complete
Node test suite to pass before and after release-version mutation. The accepted
pre-lock suite contained 1151 passing tests.

### Distribution targets

- macOS Universal: DMG and ZIP
- Windows x64: Setup and Portable EXE
- Linux x64: AppImage
