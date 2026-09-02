# Accessibility Foundation

## Preferences categories

Beta.50 presents Preferences as eight keyboard-complete categories rather than a cramped two-column form. Category buttons use tab semantics and a single roving Tab stop. Arrow keys move between categories, Home and End jump to the boundaries, and only controls in the visible category enter the Tab order. The title and Done button remain visible while category content scrolls. Descriptions are not line-clamped or hidden, and smaller windows retain a single-column content flow.

Accessibility for visually impaired players is a core architecture requirement of the NukeFire Client.
It is not a later compatibility layer.

## Principles

- Every workflow must be keyboard-complete.
- Incoming game output must never steal command focus or the user's review position.
- VoiceOver announcements must be controlled; the entire combat stream must not be forced through a live region.
- Complete lines and prompt boundaries must remain available as plain, braille-friendly text.
- Color may reinforce meaning, but it may never be the only carrier of meaning.
- Visual panels and accessible summaries must consume the same structured NukeFire state.
- Font scaling, high contrast, reduced motion, and configurable verbosity must remain first-class settings.

## Terminal behavior

- The game output is a manually reviewable log with automatic live announcements disabled.
- The command field retains predictable focus while new output arrives.
- Read Last Line and Read Vitals provide deliberate, on-demand summaries.
- Blank Enter advances pagination and ends the current visual/plain-text prompt line before the next prompt is rendered.
- GA and EOR are preserved as prompt-boundary events rather than exposed as visual garbage.

## Keyboard baseline

- Command-L: focus command input.
- Command-Shift-O: review game output.
- Command-Shift-L: read the last complete line.
- Command-Shift-V: read current vitals.
- Command-F: find in output.

Bindings must remain configurable later and should avoid VoiceOver's standard Control-Option combinations.

## Milestone acceptance

Every milestone must verify:

- keyboard access to all new controls;
- stable focus while output arrives;
- meaningful accessible names and numeric state;
- no color-only status;
- no uncontrolled announcement flood;
- plain-text access to relevant NukeFire events;
- regression tests where the behavior can be automated.


## Communications panel

- Channel filters use tab semantics and support Arrow keys, Home, End, and ordinary Tab navigation.
- Every message visibly includes a textual channel label; channel identity is never color-only.
- Unread badges have accessible names containing the numeric unread count.
- The message list is manually reviewable with `aria-live="off"`; normal incoming chat does not interrupt command entry or flood VoiceOver.
- Search and Clear are keyboard reachable, and Escape in search returns focus to the message list.
- Main terminal output remains complete, plain-text reviewable, and independent of Communications filtering.


## Context Deck

- Context cards, status rows, action buttons, form labels, help text, and disabled reasons are available as ordinary semantic DOM content.
- Text labels accompany every status; `good`, `warning`, and `danger` styling is supplemental rather than color-only.
- Server-defined action forms use native text, number, and select controls and are fully keyboard reachable.
- The card collection uses `aria-live=off`; room changes do not automatically read every service and action.
- A concise polite summary announces only a newly available non-zone service context.
- Sending an action returns focus to the command field, preserving blank-Enter pagination and normal command entry.
- Destructive operations require explicit confirmation with clear text describing the consequence.

## NukeFire Wasteland HUD visual pass

- The visible wordmark is decorative (`alt=""`); the header retains a semantic
  `NukeFire Client` label and screen-reader-only heading.
- Worn steel, scratches, rivets, and hazard accents do not represent state and do
  not alter keyboard order, labels, live regions, or command focus.
- The terminal output surface is not textured or covered by artwork.
- Screen-reader mode removes the nonessential decorative pseudo-elements while
  preserving the complete layout and all controls.

## First tester-feedback controls

- Panel option menus may be visually promoted to the application overlay layer, but
  retain their `role=menu`, `role=menuitem`, originating `aria-controls`, keyboard
  navigation, Escape behavior, and focus return.
- Newest-first Communications does not use a live region; players choose when to
  focus and review the log, and older-message reading is not forcibly interrupted.
- Live-output snapback remains a visible, persisted checkbox and can be disabled by
  players who need stable manual scrollback review.

## Multi-command Actions

- A multi-command action does not move keyboard focus or create a new automatic live
  region. Successful commands remain visible through ordinary MUD output.
- Validation failures are reported once for the whole burst rather than announcing
  each rejected command separately.
- Every item uses the same paced session queue as typed commands, preserving prompt,
  blank-Enter pagination, and screen-reader review behavior.
- The 10-command cap and weighted rate limiter apply equally in screen-reader mode.

## Gag rules

- A matching Gag removes the line from terminal and screen-reader history while
  preserving recognized channel traffic in Communications and its pop-out.
- Gag management is text-command complete and does not require pointer interaction.
- No announcement is emitted for every suppressed line, preventing replacement spam.
- GA/EOR prompt text remains available, and oversized malformed lines fail open.
- Actions may still react to a hidden line, but existing rate, queue, and protected-command
  safeguards remain identical in screen-reader mode.

## Tester-approved first-run workspace

- Affects and Communications are immediately visible in the left review dock.
- Mapper is the selected tab in a Mapper/Context Deck tab group on the right.
- Vitals remains independently visible below the tabs.
- Optional helper and diagnostic panels stay hidden to reduce first-launch focus noise.
- Existing customized layouts are not automatically rearranged during migration.

## Compact Speedwalk accessibility

Speedwalk is disabled by default and has explicit text commands for on, off, status,
and stop. Every state change produces concise terminal text; no color-only indicator
or mouse interaction is required. Route parsing never changes focus or creates a
live-region announcement per movement. The 200-step cap, atomic validation, literal
backslash escape, and manual-command interruption provide keyboard-complete recovery
from an accidental or ambiguous route.

## Native application icon

The NukeFire NF application icon is decorative packaging identity. No connection state,
warning, command result, navigation instruction, or other meaning relies on recognizing
its letters, skull, color, glow, or shape. Window titles, shortcuts, controls, and terminal
content remain available as text, and the icon does not create a live-region announcement.

## Fast combat terminal rendering

- Frame batching changes visual paint timing only; reader/plain-text state is updated
  as soon as text arrives.
- The output log remains `aria-live="off"`, preventing combat-output announcement floods.
- Incoming output never moves keyboard focus.
- Follow Output remains visible, persisted, default-on, and independently disableable.
- Pending visual text is resolved before explicit review, search, and session changes so
  visual and VoiceOver review remain ordered.
## xterm.js migration requirement

xterm.js screen-reader mode is experimental in NukeFire until VoiceOver, NVDA/JAWS,
and braille-display review confirm ordered, quiet output. Existing reader text, Read
Last Line, vitals review, keyboard focus, monochrome information, and non-color cues
remain active regardless of the selected visual renderer. The custom renderer remains
available until this parity gate passes.


## Experimental xterm layout parity

The xterm host is pinned to the same flexible grid row as the original renderer, and
the command bar remains in the fixed bottom row. Color preservation does not replace
plain-text review, labels, or other non-color accessibility information.


## TinTin conditional accessibility

- If, Elseif, and Else are text commands and require no pointer interaction.
- Errors and selected-branch results use the ordinary terminal/system-message path;
  no branch changes focus or creates a new modal surface.
- Only the selected branch produces output, preventing duplicate or misleading
  screen-reader announcements from inactive branches.
- Pipeline Debug exposes text-only condition and branch stages when deliberately
  enabled, while secure-input redaction remains authoritative.
## Docked prompt accessibility

- Inline remains the migration-safe default. Docked and Hidden are explicit user choices.
- The docked prompt is a stable, non-focusable presentation row immediately above command
  input with a complete accessible label and `aria-live="off"`; combat prompt churn does
  not create continuous VoiceOver announcements or an extra Tab stop.
- Read Last Line returns the latest docked or hidden prompt when present, giving keyboard,
  screen-reader, and braille users deliberate access without repeated scrollback entries.
- Completed group/status lines remain in normal reader history. Only the final unfinished
  GA/EOR prompt tail is removed from terminal history. While that prompt is current, the
  visual terminal stages its final line break so no empty xterm row is left behind; the
  stored transcript and reader text are not altered.
- Login, password, pager, and editor prompts remain inline until a playing character is
  identified, preserving first-run and secure-input usability.
- Prompt meaning does not depend on color. ANSI styling remains visual while the stored
  plain prompt text drives labels and explicit review.
- Prompt capture never moves focus and remains independent per session.


## Far-right dock accessibility

- **Move Far Right** is available in every existing keyboard-complete panel menu.
- The far-right separator exposes `role="separator"`, orientation, current value,
  minimum, maximum, and a specific accessible name.
- Arrow keys resize in 10-pixel steps, Shift+Arrow in 30-pixel steps, Home selects
  the safe minimum, End selects the largest safe width, and double-click restores
  the default.
- Empty right-side regions collapse and do not add inert Tab stops. Repositioning or
  resizing a panel does not move focus into terminal output or clear command input.
- Right and Far Right remain textually distinct in menus, status messages, and saved
  layout descriptions; their meaning never relies on color or visual placement alone.

## Independent communication notification sounds

- Tell, Auction, Gossip, Skynet, and SSF each have an independent optional Web Audio earcon.
- Communication sounds remain separate from Self-Voice and native screen-reader speech, so a player may silence channel speech while retaining a short notification sound and review the message later.
- All five channel sounds default off, share the Audio Cues master mute/volume controls, and retain the existing foreground/background policy.
- Tell and Auction use the existing semantic Communications classification and duplicate suppression; no terminal text is parsed a second time solely to play the cue.
- Preferences exposes keyboard-accessible checkboxes and test buttons for each communication sound.
## GroupAssist

GroupAssist remains a server-side combat rotation. The official client consumes
the bounded learned-action catalog from `NukeFire.Controls`; it does not infer
class skills or execute combat actions itself. The NukeFire Console editor sends
one deliberate configuration command, preserves the command-line draft, and
uses a non-live status surface. Reader users receive the same authoritative
catalog and setup model through `SR GROUPASSIST` and ordinary GroupAssist text.
