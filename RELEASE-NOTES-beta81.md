# NukeFire Client 0.3.1-beta.81

Beta.81 is a single-purpose emergency hotfix on top of Beta.80. It fixes an
MSLP/ANSI interaction that could make the client appear to freeze after ordinary
underlined MUD text.

## What was happening

Beta.80's MSLP translator recognizes the standard simple-link underline form.
If ordinary game text began underline with `ESC[4m` but ended it using a normal
terminal reset such as `ESC[0m`, the translator could remain in its temporary
underline buffer waiting for the exact MSLP `ESC[24m` close. Later game output
would then continue accumulating in that buffer instead of reaching the normal
display pipeline.

A reported live example was a `where bad` result containing an underlined
`bad` in:

`M 51. a bad mechanic - [27113] A hallway`

The output stopped at the underline and subsequent input/output did not visibly
recover.

## Beta.81 correction

- Ordinary underline followed by `ESC[0m`, bare `ESC[m`, combined SGR resets,
  or other non-MSLP escape sequences now fails open unchanged into the normal
  ANSI handling path.
- Split reset sequences across network chunks are handled without leaving the
  translator stuck.
- Newline and the existing command-length ceiling are fail-open boundaries for
  malformed or unterminated simple-link candidates.
- Exact MSLP `ESC[4m ... ESC[24m` simple links continue to translate through the
  protected local-link path.
- Complex MSLP SEND, PROMPT, and MENU behavior from Beta.80 is preserved.

## Verification

The release gate reruns the dedicated Beta.81 freeze regression, the Beta.80
MSLP QC suite, the Beta.79 MSLP veteran tests, ANSI parser tests, xterm adapter
tests, `git diff --check`, and the complete `npm run verify` suite.

Pushing `v0.3.1-beta.81` triggers the existing release workflow, which
independently verifies the tagged commit and builds the unsigned macOS universal
DMG and ZIP, Windows x64 Setup and Portable EXEs, and Linux x64 AppImage from
that exact commit.
