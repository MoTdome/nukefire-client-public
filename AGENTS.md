# NukeFire Client Agent Guide

## Project purpose
Build a highly customizable desktop MUD client for NukeFire, beginning with a dependable macOS Electron client.

## Source of truth
Read these files before changing code:

1. `docs/PROJECT_LEDGER.md`
2. `docs/ACCESSIBILITY.md`
3. `docs/ROADMAP.md`
4. `docs/ARCHITECTURE.md`
5. `CHANGELOG.md`

Update the ledger and changelog with every completed interval.

## Current priority
Milestone 1.9c1 / 0.3.1-beta.9 is the first fast-combat terminal pass.

- Preserve immediate ANSI parsing, Actions, Gags, Communications, reader state,
  vitals fallback, prompt handling, command sending, and Speedwalk behavior.
- Batch only visible terminal DOM paint through one animation-frame flush.
- Coalesce adjacent stored and rendered runs with identical ANSI presentation while
  keeping each run bounded.
- Track visible character counts; do not rescan the full terminal `textContent` for
  every incoming chunk.
- Perform one line-count refresh and at most one live-follow scroll per visual flush.
- Resolve pending visual output before session changes, Find, Clear Output, settings
  snapshots, and local prompt-line separation.
- Keep Mapper and Communications render optimization outside this interval.
- Preserve the native icon, tester-approved workspace, and accessibility behavior.

## Accessibility rules

- Accessibility for visually impaired players is a core requirement, not a later feature.
- New workflows must be keyboard-complete and VoiceOver-friendly.
- Incoming output must never steal focus. Automatic scrollback snapback must be visible, persisted, and easy to disable.
- Never use color as the only carrier of meaning.
- Do not expose the full combat stream through an automatic assertive live region.
- Visual and accessible summaries must share the same structured NukeFire state.
- Preserve plain-text, braille-friendly access to complete lines and prompts.
- Add accessibility acceptance checks and tests to every milestone.

## Engineering rules

- Make one focused change at a time.
- Preserve a working rollback commit before beginning a milestone.
- Run `npm run verify` before every milestone commit.
- Do not rewrite stable connection, ANSI, or Telnet code without a demonstrated reason.
- Keep Electron security settings: `contextIsolation: true`, `nodeIntegration: false`, and `sandbox: true`.
- Keep renderer code free of direct Node access.
- Prefer small modules and explicit tests over large UI files.
- Maintain macOS behavior first, but avoid needless platform-specific assumptions.
- Never store passwords in plain text. Character-profile credential storage requires a secure design before implementation.
- MCCP remains disabled until its stream transition and decompression are fully tested.

## Commit style
Use short milestone-oriented messages, for example:

- `checkpoint: preserve milestone 1 base connection`
- `fix: send blank enter for pagination`
- `fix: snap output to bottom on enter`
- `test: cover pagination input behavior`

## Definition of done
A change is not complete until:

- behavior is tested,
- `npm run verify` passes,
- the project ledger is updated,
- the changelog is updated,
- the user has a clear rollback point,
- keyboard and screen-reader behavior has been reviewed.
