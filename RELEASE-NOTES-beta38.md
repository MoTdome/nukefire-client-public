# NukeFire Client 0.3.1-beta.38 — Native TinTin Variables

Beta.38 adds native TinTin dollar-variable references without removing the
existing NukeFire percent-variable syntax.

## Added

- `$name` for ordinary TinTin variable references.
- `${nonstandard name}` for safe names containing spaces or punctuation.
- `$$name` and `\$name` for literal dollar-prefixed text.
- Mixed recursive expansion across `$name`, `${name}`, `%name`, and `%{name}`.
- Safe nonstandard variable names in settings, classes, `#read`, and `#write`.
- Native dollar references through direct commands, Aliases, Actions, Echo,
  Showme, routing, loops, delays, macros, command batches, and Pipeline Debug.

## Preserved

- Existing `%name` and `%{name}` configurations continue to work unchanged.
- Unknown references remain visible instead of becoming empty text.
- Recursion, expansion depth, and expanded-output length remain bounded.
- Action captures `%0` through `%9` keep their established meaning before
  persistent variable expansion.
- Writer output preserves the exact reference syntax stored in command bodies.

## Deliberate boundary

Nested TinTin table syntax such as `$hp[self]` is not partially interpreted.
Brackets remain reserved for the later Lists and Tables milestone. Variable names
containing braces, brackets, semicolons, percent signs, dollar signs, backslashes,
or control characters are rejected.

## Verification

- Full verification target: 531 tests.
- Do not commit or tag beta.38 until the guarded installer reports 531/531.
