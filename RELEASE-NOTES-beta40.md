# NukeFire Client 0.3.1-beta.40 — Bounded TinTin Functions

Beta.40 adds persistent TinTin-style Functions without allowing an inline call to
bypass the client command pipeline.

## Commands and calls

```text
#function
#function {name} {commands}
#function show {name}
#function delete {name}
#unfunction {name}

@name{argument1;argument2}
```

`%0` represents all arguments and `%1` through `%99` represent individual
arguments. `@@name{...}` and `\@name{...}` preserve a literal call.

## Function body language

```text
#local {name} {value}
#unlocal {name}
#math {name} {expression}
#format {name} {format} {arguments...}
#return {text}
```

Locals are isolated to one call and shadow persistent Variables. Math and Format
update an existing local when present. The special local `result` is returned when
no explicit Return runs. Functions may call other Functions.

## Safety

- No hidden server sends, session routing, delays, loops, file access, or automation-definition changes; Math and Format may update Variables.
- Recursion, call depth, total calls, arguments, commands, body size, and output are bounded.
- A failed call restores persistent Variables changed earlier in that call.
- Functions remain synchronous and use the existing Alias/Action/Variable pipeline.
- Definitions persist, join classes, and round-trip through safe Read and Write.

Conditionals, general control flow, lists/tables, and tickers remain separate milestones.

## Verification

- Full verification target: 558 tests.
- Do not commit or tag beta.40 until the guarded installer reports 558/558.
