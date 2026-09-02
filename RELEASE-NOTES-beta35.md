# NukeFire Client 0.3.1-beta.35

## Genuine TinTin Echo

Beta.35 adds formatted local `#echo` output without weakening the distinction between
TinTin Echo and Showme. `#showme` may trigger Actions; `#echo` never does.

### Examples

```text
#echo {HP: %d/%d} {75} {100}
#echo {[%8s][%-8s]} {Caul} {Shai}
#echo {The current date is %t.} {%Y-%m-%d %H:%M:%S}
#echo {%cWARNING%c} {light red} {reset}
```

### Supported in this interval

- `%s`, `%d`, `%f`, `%g`, `%t`, `%c`, `%a`, and `%%`.
- Bounded width, alignment, precision, 30 arguments, and 4,096 visible characters.
- Familiar highlight color names and documented TinTin `<abc>` foreground codes.
- Aliases, Actions, loops, delays, repetition, macros, routing, and command batches.
- Variables in arguments and explicit `%{name}` variables inside format strings.
- Normal Substitution, Highlight, terminal, Find, copy, and screen-reader review.

### Safety boundaries

- Echo output is never sent to NukeFire.
- Echo output never triggers Actions and never enters Communications or vitals.
- User-provided terminal controls are removed before formatting.
- Invalid formats fail before any partial line is displayed.
- Row positioning and the specialized remainder of TinTin's format catalog are deferred.

Do not commit or tag beta.35 until the guarded installer reports 495/495 tests and
live Echo checks pass.
