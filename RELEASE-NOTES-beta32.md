# NukeFire Client 0.3.1-beta.32

## TinTin Comfort Pack: Prefix-aware command history

Beta.32 makes Up/Down recall useful in long MUD sessions without replacing the
existing history controls.

### Usage

With an empty command line, Up recalls the newest command exactly as before. With
text already typed and the caret at the end, Up recalls only commands beginning with
that text, case-insensitively.

```text
ba + Up       newest command beginning with ba
Up            previous matching command
Down          newer matching command
Down          original ba draft
```

### Safety and compatibility

- Matching is anchored at the beginning of the historical command.
- No-match searches leave the typed draft untouched.
- Editing recalled text exits navigation mode.
- Each session preserves its own history index, prefix, draft, and command text.
- Blank-input Up/Down remains full-history navigation.
- Blank Return still follows the existing repeat preference.
- Secure password input, macros, movement hotkeys, command-line batches, and prepared
  command text remain unchanged.

## Verification gate

The guarded installer requires the exact beta.31-v3 hotfix payload and runs the full
469-test verification suite. Beta.32 must not be committed or tagged until the Mac
result and live command-history checks pass.
