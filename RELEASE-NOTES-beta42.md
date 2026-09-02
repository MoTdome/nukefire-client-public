# NukeFire Client 0.3.1-beta.42 — Docked Prompt Row

## What changed

- Added **Inline**, **Docked**, and **Hidden** prompt-display modes in Preferences → Display.
- Docked mode pins the current gameplay prompt directly above the command input and
  replaces it in place instead of printing repeated prompts into scrollback.
- Hidden mode suppresses the established gameplay prompt visually while retaining the
  latest prompt for deliberate review.
- Prompt capture is per session and follows Telnet GA/EOR boundaries already emitted by
  NukeFire. It does not infer prompts from arbitrary network packets.
- Completed multiline group/status lines stay in terminal output; only the final
  unfinished prompt tail is docked or hidden.
- Login, password, pager, and editor prompts remain inline. Gameplay capture uses either
  established GMCP identity or NukeFire's authoritative GA/EOR tail ending in `>`, so the
  dock no longer depends on `Char.Status` arriving first.
- Existing ANSI styling, Substitutes, Highlights, Actions, Gags, Pipeline Debug, vitals
  fallback, session switching, and outgoing command ordering remain intact.

## Accessibility

The docked row has a stable text label and does not automatically announce every combat
prompt update. Read Last Line reviews the current docked or hidden prompt when present,
while ordinary terminal review remains free of repeated gameplay prompts.

## Verification

The guarded installer requires the exact beta.41 state and a clean expected Git working
state. It creates a timestamped backup, writes atomically, verifies exact final hashes,
runs syntax and diff checks, and requires **583/583 tests**. Any failure restores the exact
beta.41 files.

## Beta.42-v3 correction

- Wires the Prompt display Preferences selector to the live renderer state.
- Changing Inline, Docked, or Hidden now takes effect immediately and persists.
- Adds a renderer regression using the real Preferences control and a live NukeFire prompt.

The beta.42-v3 correction installer requires the exact beta.42-v2 state and
**585/585 tests**. Any failure restores beta.42-v2 byte-for-byte.

## Beta.42-v4 visual correction

- Compresses the docked prompt to one terminal-height line directly above the command input.
- Removes the prompt dividers and nearly all vertical padding.
- Removes the docked prompt from the keyboard tab order; deliberate prompt review remains available through Read Last Line.
- Hides xterm's decorative cursor layer and sets its inactive cursor style to `none`, because command entry happens in the separate input field.
- Adds a layout regression for the compact row and a terminal-option regression for the cursor behavior.

The beta.42-v4 correction installer requires the exact beta.42-v3 state and
**586/586 tests**. Any failure restores beta.42-v3 byte-for-byte.

## Beta.42-v5 line-flow correction

- Keeps the stored transcript and line count unchanged while withholding only the final
  terminal line break when Docked or Hidden mode is waiting at a captured prompt.
- Releases that withheld line break before the next visible output, preserving exact
  ordering without leaving an empty xterm row where the prompt would have appeared.
- Adds two pixels of breathing room between the compact prompt row and command input,
  without restoring divider bars or a large prompt panel.
- Rebuilds the active terminal view when Prompt display mode changes so Inline, Docked,
  and Hidden retain the correct trailing-line presentation.

The beta.42-v5 correction installer requires the exact beta.42-v4 state and
**586/586 tests**. Any failure restores beta.42-v4 byte-for-byte.
