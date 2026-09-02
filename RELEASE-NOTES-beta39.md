# NukeFire Client 0.3.1-beta.39 — Safe TinTin Math and Format

Beta.39 begins the executable TinTin scripting core with bounded numeric
expressions and stored formatted text.

## Added

- `#math {variable} {expression}` with C-like precedence, parentheses, unary
  operators, integer dice (`d`), powers (`**`), roots (`//`), arithmetic,
  comparisons, booleans, ternaries, and bounded bitwise operators.
- TinTin-style integer division unless a decimal operand makes the expression
  floating-point.
- `#format {variable} {format} {arguments...}` using the established safe Echo
  formatter plus `%m` for a math expression.
- `%m` support in `#echo` for safely evaluated inline numeric output.
- Sequential Action semantics for local scripting commands: a Math update is
  visible to a following Format, Echo, or Showme command in the same Action.
- Pipeline Debug stages for successful Math and Format assignments.
- TinTin paste analysis accepts Math and Format inside compatible Alias and
  Action bodies.

## Safety boundary

- Expressions never use JavaScript evaluation, shell access, functions, object
  properties, or host APIs.
- Input length, tokens, operations, dice count, die size, root degree, shifts,
  result magnitude, integer precision, format arguments, widths, and output
  length are bounded.
- Division by zero, invalid roots, malformed expressions, unsupported text, and
  unsafe numeric results change no variable.
- `#format` stores plain text only. Terminal color directives remain display-only
  in `#echo`.
- Existing variable class membership is preserved when Math or Format updates a
  variable.
- String comparisons, regex math, nested tables, Functions, conditionals, and
  control-flow statements remain deferred.

## Verification

- Full verification target: 545 tests.
- Do not commit or tag beta.39 until the guarded installer reports 545/545.
