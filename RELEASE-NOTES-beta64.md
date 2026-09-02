# NukeFire Client 0.3.1-beta.64
## Veteran TinTin Compatibility

Beta.64 locks the cumulative TinTin source-parity work developed on top of the
trusted Beta.63 release.

### Highlights

- Twenty guarded source-parity passes bring NukeFire Client scripting much
  closer to veteran TinTin expectations while retaining bounded, client-safe
  execution.
- Veteran Alias/Action/Variable/Function/Class/List/Path/Event/Ticker/Delay and
  definition-query behavior is preserved across imported and directly typed
  scripts, including Alias priority and braced definition names.
- READ/WRITE, BUFFER/GREP, REGEXP, MATH, FORMAT, conditions, command-prefix
  handling, input history/completion, events, and session-facing compatibility
  have been cross-checked against upstream TinTin behavior where safely
  applicable.
- MESSAGE and IGNORE now follow TinTin definition-family semantics without
  hiding explicit queries/listings or exposing unsafe host-control surfaces.
- Importer compatibility and whole-file veteran-script audits retain the
  existing safety boundaries: unsupported host/system behavior stays blocked
  rather than being silently approximated.
- All accepted Beta.63 Mob Inspector, Loot History, Foundlist/Upgrades, Reader,
  accessibility, mapper/GPS, pane, affects, vitals, and presentation work is
  preserved unchanged beneath the TinTin compatibility layer.

### Release verification

The release script requires `git diff --check`, `npm run check`, and the complete
Node test suite to pass before and after release-version mutation. The accepted
pre-lock suite contained 1350 passing tests.

### Distribution targets

- macOS Universal: DMG and ZIP
- Windows x64: Setup and Portable EXE
- Linux x64: AppImage
