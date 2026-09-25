# NukeFire Client 0.3.1-beta.82

Beta.82 is a focused Native Reader reliability release on top of Beta.81. It
addresses three issues reported during NVDA testing of native screen-reader
mode: skipped beginnings of room output, repeated speech of the hidden output
region's accessible name, and the bare `>` gameplay prompt being spoken as
"greater."

## Native Reader announcement delivery

Native Reader completed-line announcements now use the browser's `ariaNotify()`
API first when it is available. This provides an explicit accessibility
notification path instead of depending exclusively on several rapid DOM
mutations inside one polite live region.

The existing polite live region remains as a progressive fallback for
browser/screen-reader combinations that do not expose or successfully accept
`ariaNotify()`. NukeFire therefore keeps compatibility coverage instead of
assuming identical assistive-technology support on Windows and macOS.

## Output-region label cleanup

The hidden Native Reader output log no longer carries
`aria-label="New NukeFire output"`. That label was being surfaced repeatedly by
NVDA during normal play and did not add useful information to each completed
MUD line.

The region keeps its `role="log"`, polite live behavior, additions relevance,
and non-atomic semantics for fallback operation.

## Bare prompt suppression

A gameplay prompt whose entire visible content is only `>` is no longer sent to
Native Reader live speech or stored as a Reader Review line. ANSI-colored or
otherwise SGR-styled forms of that same bare prompt are treated the same way.

Richer prompts are not suppressed. Ordinary room text, combat output, complete
status prompts, and repeated identical gameplay lines remain eligible for
Native Reader presentation and review.

## Shared Reader-line filtering

The session runtime now accepts an optional Reader-line inclusion callback. The
same filter is applied both when newline-terminated lines complete and when a
GA/EOR boundary commits an unfinished prompt line. This keeps Native Reader live
speech and Reader Review consistent.

## Verification

The release gate reruns the dedicated Beta.82 Native Reader reliability tests,
the existing Beta.79 Native Reader and MUSH-settings regressions, session
runtime, prompt-display, and xterm adapter tests, `git diff --check`, and the
complete `npm run verify` suite.

Pushing `v0.3.1-beta.82` triggers the existing release workflow, which
independently verifies the tagged commit and builds the unsigned macOS universal
DMG and ZIP, Windows x64 Setup and Portable EXEs, and Linux x64 AppImage from
that exact commit.
