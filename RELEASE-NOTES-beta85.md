# NukeFire Client 0.3.1-beta.85

Beta.85 hardens the Windows Native Reader transport introduced in Beta.83 and
successfully distributed in Beta.84, then closes the remaining speech-ownership
and background-focus gaps found during real screen-reader testing.

Real-world NVDA testing of Beta.84 confirmed the central goal of the native
transport: automatic MUD output remained useful during normal play without
observed dropped lines. Beta.85 deliberately preserves that successful
completed-line output path while improving recovery, diagnostics, foreground
behavior, and handoff between Native Reader and NukeFire Self-Voice.

## New local Native Reader controls

The client now provides local Reader transport commands:

- `#reader status`
- `#reader test`
- `#reader stop`
- `#reader reconnect`

These commands are handled entirely inside NukeFire and are never sent to the
MUD.

### `#reader status`

Reports whether the native Windows helper is available and, when connected,
identifies the active supported backend such as NVDA or JAWS.

The status also exposes bounded recovery information including helper restart
count and manual reconnect count.

On macOS and Linux, status reports that the compatibility ARIA transport is
active because the PRISM helper remains Windows-only in this release.

### `#reader test`

Sends one short diagnostic announcement through the active native screen-reader
backend when available. If the helper is unavailable, NukeFire reports the
fallback state instead.

### `#reader stop`

Requests immediate native screen-reader speech cancellation through PRISM.
This does not change Reader Review, NukeFire Voice, or accessibility settings.

### `#reader reconnect`

Force-restarts the isolated Windows helper and immediately attempts to reacquire
a running supported screen reader. This is intended for cases such as restarting
NVDA or JAWS while NukeFire itself remains open.

## Recovery hardening

A helper process is now associated with the failure callbacks that belong to
that exact process. If an old helper exits after NukeFire has already started a
replacement, the stale exit event is ignored instead of tearing down the new
working helper.

Timeouts, write failures, backend failures, and helper loss invalidate the
current native connection and move the bridge into its bounded retry path.

Transport status also tracks:

- helper restart count;
- manual reconnect count;
- last failure reason;
- last successful connection time.

## Foreground-only speech now covers Native Reader

The existing **Speak only while NukeFire is in the foreground** preference is
now a shared Reader speech rule rather than a Self-Voice-only rule.

When foreground-only speech is enabled and the NukeFire application loses
focus:

- NukeFire stops speech it has already queued through the Windows PRISM helper;
- new automatic Native Reader speech is suppressed;
- ARIA/live-region announcements owned by NukeFire are suppressed;
- NukeFire Self-Voice continues to use its existing queue flush behavior;
- Reader Review/history, Communications, mapper, automation, and other client
  processing continue normally.

Returning to NukeFire does not replay or catch up background speech. Only new
live output is spoken.

## One NukeFire speech owner at a time

Native Reader and NukeFire Self-Voice are now explicitly treated as mutually
exclusive speech owners.

When Self-Voice is enabled while Native Reader is active, NukeFire first stops
speech already queued through the native helper, clears NukeFire-owned live
announcer content, and then gives Self-Voice ownership.

When Native Reader is enabled while Self-Voice is active, NukeFire stops and
disables Self-Voice and clears its speech-trigger runtime before native speech
takes ownership.

If Self-Voice is muted, background-suppressed, or its runtime is temporarily
unavailable, NukeFire does not fall through to ARIA/native speech. This avoids
the two speech systems unexpectedly talking at the same time.

## Preserved behavior

Beta.85 intentionally preserves the behavior that succeeded in Beta.84:

- automatic completed MUD lines prefer the Windows PRISM transport while live
  Reader speech is allowed;
- NVDA remains the first direct backend and JAWS the second;
- ordinary automatic output remains non-interrupting;
- PRISM remains pinned to v0.18.2 and statically linked;
- SAPI and OneCore are not used as helper fallbacks;
- NukeFire Voice remains a separate optional speech system;
- macOS and Linux continue using the compatibility ARIA transport.

This release does not yet move Read Last Line, vitals, F8/F9/F10, or the wider
manual Reader action set onto native PRISM interruption. Those remain for a
later controlled pass after additional Beta.85 Windows testing.

## Verification

The Beta.85 release gate requires the exact already-tested hardening and speech
coexistence candidate, reruns the Native Reader bridge tests, Beta.85 transport
and coexistence regressions, prior Beta.83/Beta.82/Beta.79 Native Reader
regressions, Beta.64 and Beta.58 speech contracts, renderer/multi-session gates,
`git diff --check`, and the complete `npm run verify` suite before creating the
release commit and tag.

The tagged distribution workflow then performs clean verification and produces
the normal macOS, Windows, and Linux distributions. The Windows build continues
to use the PRISM-compatible Windows 2025 / VS2026 / current-CMake / Ninja
toolchain established in Beta.84.
