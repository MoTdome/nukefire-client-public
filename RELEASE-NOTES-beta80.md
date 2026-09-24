# NukeFire Client 0.3.1-beta.80

Beta.80 is a deliberately small quality-control and compatibility hotfix on top
of Beta.79. It does not introduce a new subsystem. It tightens three places
found during the post-Beta.79 review: detached-window handling, TinTin-style
visible Find matching, and protected MSLP link translation.

## Detached Terminal Wall panes

- Auto-hidden frameless detached headers now leave a 16px full-width grab/reveal
  shelf instead of the previous 6px strip.
- Header reveal remains immediate.
- Hiding waits about 320ms after the pointer leaves, making it easier to move from
  the grab shelf into header controls without losing the header.
- Reader Mode remains always-visible, touch/no-hover behavior remains
  always-visible, and disabling detached-header auto-hide still restores the
  persistent header.
- Docked panes are unchanged.

## TinTin Find parity

The visible terminal Find box now uses the same bounded wildcard token bodies as
NukeFire's shared TinTin regexp implementation for the veteran wildcard forms
covered by Find.

- `%d` / `%D` — digits / non-digits
- `%s` / `%S` — whitespace / non-whitespace
- `%w` / `%W` — letters / non-letters
- `%.` — exactly one character
- `%?` — zero or one character
- `%*` / `%+` — zero-or-more / one-or-more characters
- `%i` / `%I` — case-mode selection

Regression coverage explicitly checks `%?` with zero, one, and two characters so
its optional-one-character meaning cannot drift again.

## MSLP hardening

- Standard MSLP `PROMPT` links are translated through the same protected local
  URI path as the supported SEND/MENU forms.
- MENU parsing follows the protocol's brace structure; backslash remains literal
  rather than becoming an invented escape mechanism.
- Malformed, incomplete, or nested MENU payloads are rejected instead of partly
  accepted.
- Secure or unsupported OSC 68 forms cannot lose their complex command and then
  fall through into an executable simple SEND link based on the visible label.
- Pending complex-link authority is discarded if ordinary visible text appears
  before the following underline.

## Verification and distributions

The tested Beta.80 candidate is checked again with focused Beta.77-Beta.80
regressions, `git diff --check`, and the complete `npm run verify` suite before
the release commit and tag are created. Pushing `v0.3.1-beta.80` triggers the
existing release workflow, which independently verifies the tagged commit and
builds the unsigned macOS universal DMG and ZIP, Windows x64 Setup and Portable
EXEs, and Linux x64 AppImage from that exact commit.
