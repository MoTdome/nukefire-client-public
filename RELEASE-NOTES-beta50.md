# NukeFire Client 0.3.1-beta.50 — Preferences Layout and Readability

## Included

- Preferences is now a wider, organized control center instead of a long two-column wall of cards.
- Eight categories keep related controls together: Display, Command Input, Keyboard Shortcuts, TinTin Scripts, Workspace, Quick Commands, Pipeline Debug, and Accessibility.
- Only the selected category is shown, giving every control and description the full content width.
- The Preferences title and **Done** button remain visible while the selected category scrolls independently.
- Help and description text uses more room, larger type, and more line spacing, with no line clamping, ellipsis, or hidden overflow.
- Smaller windows switch to a single-column workspace with a horizontally scrollable category row.
- Quick Command customization opens directly to the Quick Commands category.

## Keyboard and accessibility

- Category controls use native buttons with tab and tab-panel semantics.
- Arrow keys move between categories; Home and End jump to the first and last category.
- Only the selected category is included in the Preferences Tab order.
- Escape closes Preferences and returns focus to the control that opened it.
- Screen readers receive each category name, its selected state, and the complete unchanged labels and descriptions for the active panel.
- No information depends on color alone.

## Preserved behavior

- Every existing setting, control ID, saved preference, settings schema, and client behavior remains unchanged.
- No network, command pipeline, TinTin, Mapper, Communications, terminal, session, or persistence behavior changed.
- This is a focused presentation and navigation milestone only.

## Verification target

- Exact baseline: Beta.49 at 613/613 tests.
- Beta.50 target: 617/617 tests.
