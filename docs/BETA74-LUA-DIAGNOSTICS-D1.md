# NukeFire Beta.74 — Lua Diagnostics D1

This pass hardens the existing Lua platform without expanding its authority. It adds a bounded per-session diagnostic registry and player-facing commands for inspecting Lua health.

## Commands

```text
#lua status
#lua errors
#lua errors 20
#lua errors clear
#lua reload
```

`#lua status` reports the per-session VM state, Lua version when initialized, saved/autorun script counts, Custom Pane count, success/failure totals, retained errors, and the most recent error.

`#lua errors [count]` shows the newest retained errors with a managed script/source label, line when available, repeat count, and a bounded stack excerpt. Histories are session-isolated and capped at 64 entries. Identical errors repeating within a short window are coalesced instead of growing the log indefinitely.

`#lua errors clear` clears retained history. It does not falsely mark a script as healthy; the Lua Scripts editor keeps the last-run status until that script is successfully run again.

`#lua reload` is the short form of the existing fresh-VM autorun reload. It clears transient callbacks and Custom Panes for that session, starts a fresh Lua VM, and reruns enabled autorun scripts.

## Saved-script diagnostics

Saved scripts are executed with a managed source label such as `script/main`. When Lua provides a line location, terminal errors can therefore identify `main:37` instead of only an anonymous Worker location. The Lua Scripts list shows `OK` or `ERROR line N` for scripts that have been run in the current client process.

## Security boundary

This pass does not add filesystem paths, `io`, `os`, shell/process execution, arbitrary network access, DOM/window/document access, HTML/CSS/JavaScript panes, or a Lua gag/render-veto path. Diagnostics are bounded host-owned metadata only.
