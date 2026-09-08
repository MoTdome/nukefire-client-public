# NukeFire Client Beta.74 — public development milestone

This public snapshot is reconciled from the reviewed private development milestone
`30bcdfa` after the complete private suite passed 1723/1723 tests.

The application package version is intentionally left unchanged until the formal Beta.74
release/version bump. This public commit is a source/reference milestone, not a packaged release.

## Beta.74 focus

- modernized TinTin compatibility and session-isolated scripting definitions;
- production Lua 5.4 scripting through the bounded Wasmoon Worker runtime;
- shared TinTin/Lua variables, tables, GMCP data, events, aliases, triggers, timers, and Speedwalk;
- Mudlet-familiar Lua callbacks, GMCP/MSDP compatibility, events, helper functions, and diagnostics;
- NukeFire-managed Lua modules, protected per-session storage, saved multi-line scripts, and autorun;
- native Custom Panes driven by Lua/GMCP without exposing HTML, DOM, filesystem, network, or render-veto authority;
- Lua diagnostics with bounded error history, source/line reporting, status, reload, and script health;
- convenience APIs including `sendAll()`, `speedwalk()`, command-line editing, bounded recent-output inspection, and echo compatibility;
- continued accessibility, sound, communications, terminal, and performance regression coverage.

## Security boundary

Lua remains isolated from arbitrary filesystem, shell/process, network, Node/Electron, DOM,
raw xterm, `io`, `os`, `debug`, and package-loader authority. Custom Panes are declarative
native NukeFire UI and do not accept player HTML/CSS/JavaScript. Lua does not receive a
synchronous gag/render-veto path.

## Verification

The private source milestone passed the complete 1723-test suite before this public
reconciliation. This public repository is independently checked with `npm ci`,
`git diff --check`, `npm run check`, and `npm run verify` before the public commit is pushed.
