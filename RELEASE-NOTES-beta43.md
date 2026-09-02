# NukeFire Client 0.3.1-beta.43

## Draft-Safe Shortcuts

Beta.43 restores the safer keyboard behavior players knew before movement shortcuts
were allowed to override an active command draft.

### Default behavior

- Empty command input: the macro or keyboard shortcut fires normally.
- Fully selected last-sent command: the shortcut fires normally.
- Actively composed text: the keystroke remains typing input and the shortcut does not fire.
- Secure password input, Preferences, dialogs, Find, composition, and held-key repeat remain blocked.

For example, with Shift+W assigned to `north`:

```text
Empty input + Shift+W        -> sends north
gos Welcome + Shift+W        -> types W; does not move
```

### Fire while typing

Preferences → Keyboard Shortcuts now includes a per-shortcut **Fire while typing**
checkbox. It is off by default. Enabling it allows that individual shortcut to fire
while a command draft is present and preserves the draft exactly.

### Repeat Enter remains independent

Macros and keyboard shortcuts continue to dispatch without entering manual command
history. Even an opted-in shortcut cannot replace the command used by **Repeat last
command with Enter**.

```text
Type and send: score
Press Shift+W shortcut: north
Press blank Enter: score
```

## Verification gate

The guarded installer requires the complete Beta.42 release baseline at commit
`2cc6198`, creates a rollback backup, and requires the full 586/586 verification
suite before Beta.43 may be committed or tagged.
