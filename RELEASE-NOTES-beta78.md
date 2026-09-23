# NukeFire Client 0.3.1-beta.78

## Interface choice

Beta.78 keeps the Beta.77 terminal-wall presentation but makes it a choice rather than a requirement.

- **Terminal Wall** preset: auto-hidden main chrome, auto-hidden docked and detached headers, frameless detached terminal tiles, decorative HUD hardware off.
- **Classic / Persistent** preset: connection/session controls visible, pane headers visible, normal operating-system frames on detached windows, decorative HUD hardware on.
- Every setting remains independently adjustable after applying either preset.
- Docked pane header visibility is no longer implicitly tied to the main terminal play-mode setting.
- Changing detached window frame style recreates open popouts at the same saved bounds without docking them.
- Reader Mode continues to keep important controls persistent.

## Main terminal bottom geometry

- Keeps output, prompt, and command input as separate grid rows.
- Adds paint containment to the xterm host so terminal descendants cannot paint outside the output region.
- Calculates the bottom reserve from xterm's active line-height and font size, then rounds upward with a small guard. This specifically covers fractional combinations such as Cascadia Mono 17px.
- Keeps the existing ResizeObserver coverage and trailing settled refit.
- Explicitly reconciles terminal geometry while docked prompt presentation updates.
- Adds a second quiet font-metrics settle fit after installed fonts report ready, so users do not need a Ctrl+/Ctrl− zoom nudge to force recalculation.

## Preserved

- Beta.77 Group movement / Group Say audio correction.
- Native select reliability in detached mirrored panels.
- Communications font sizing, Session Vitals remorts, sent-command echo, and long-session behavior.
- Public macOS, Windows, Linux, source ZIP, distribution notes, and checksum release pipeline.


## Group movement audio

- Extends grouped-movement filtering to vertical exits without relying on a fixed direction-name list.
- Real Group Say messages remain classified normally.
