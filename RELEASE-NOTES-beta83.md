# NukeFire Client 0.3.1-beta.83

Beta.83 is an experimental Native Reader transport release intended to make
high-volume MUD output practical for Windows screen-reader users while keeping
the Beta.82 behavior intact on macOS and Linux.

The immediate reason for this release is real NVDA testing showing that browser
accessibility APIs can announce the first line or two of a rapid MUD response
reliably but can still drop later lines such as room exits or inventory items.
Beta.83 moves automatic completed MUD output on supported Windows systems onto a
native screen-reader transport.

## Windows Native Reader transport

On Windows, NukeFire now launches an isolated helper process named
`nukefire-reader-bridge.exe`. The helper uses PRISM v0.18.2 and communicates
directly with a running supported screen reader.

The first Beta.83 helper deliberately supports only:

- NVDA, preferred first;
- JAWS, preferred second.

It does not fall back internally to SAPI or OneCore. NukeFire Voice remains a
separate speech path and is not replaced or modified by the PRISM helper.

The bridge supports:

- ordered `OUTPUT` requests for automatic MUD output;
- `SPEAK` requests;
- an explicit interrupt flag;
- `STOP`;
- backend/status reporting;
- bounded base64-encoded text payloads over a line protocol;
- helper-process supervision and retry behavior.

PRISM's direct NVDA backend can cancel current NVDA speech before speaking an
interrupting request, and its JAWS backend maps interruption to the JAWS flush
behavior.

## Automatic output only in the first prototype

Beta.83 intentionally limits native routing to automatic completed MUD output.

Manual Reader/UI announcements remain on the existing Beta.82 path, including:

- Read Last Line;
- vitals announcements;
- Reader Review hotkeys such as F8/F9/F10;
- setup and status announcements;
- NukeFire Self-Voice.

This keeps the experiment tightly focused on the high-rate MUD stream that the
browser accessibility APIs were dropping, while preserving established manual
accessibility behavior.

## Fallback behavior

If the Windows helper executable is absent, cannot start, cannot initialize a
supported running screen reader, or fails during use, NukeFire falls back to the
Beta.82 Native Reader delivery path:

1. `ariaNotify()` when available;
2. the existing polite live region otherwise.

A native-helper failure therefore does not take down the client and does not
remove the existing compatibility path.

## macOS and Linux

Beta.83 does not activate the PRISM helper on macOS or Linux.

Those platforms continue to use Beta.82 Native Reader behavior. The native
helper and its packaged resources are configured only for Windows
distributions.

## Windows packaging

The Windows distribution command now builds the native helper before
electron-builder runs. PRISM is fetched from the pinned `v0.18.2` tag and built
statically into the isolated helper.

Both Windows Setup and Portable distributions package the helper under the
application resources directory along with PRISM's LICENSE, NOTICE, LICENSES
material, and a source pointer to the exact upstream version.

Players do not need Python, CMake, Visual Studio, PRISM, or a separate DLL
installation to run the finished NukeFire Windows distribution.

## Verification

Before the Beta.83 release commit and tag, the release gate requires the exact
tested candidate file set, reruns the focused Native Reader transport and
Beta.82/Beta.79 accessibility regressions, runs `git diff --check`, and runs the
complete `npm run verify` suite.

The tagged GitHub Actions release then performs the normal clean verification
again. The Windows job is also the first clean Windows compilation gate for the
statically linked PRISM helper. The GitHub Release is published only after all
platform build jobs pass.

The intended first real-world acceptance test is NVDA on Windows with room,
inventory, score/help, repeated-line, combat-burst, interruption, stop, and
screen-reader restart scenarios.
