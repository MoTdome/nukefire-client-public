# NukeFire Client Beta.75 — Lua Correction Pass 1

Beta.74 is frozen. This pass corrects the Lua behavior already shipped before any new Lua API surface is added.

## 1. Logical mud lines and anchored triggers

`tempRegexTrigger()` now treats a TELNET prompt boundary as the end of the current logical automation line even when the mud prompt was not followed by `\n`.

This matters for a real Beta.74 regression:

```text
physical stream:
(MONSTER) >[Procs] 1 effect: the chain of broken pilgrimage keys\n
logical prompt:
(MONSTER) >

logical mud line seen by the trigger:
[Procs] 1 effect: the chain of broken pilgrimage keys
```

A regex such as this therefore keeps normal anchor semantics:

```lua
local procRegex = [[^\[Procs\] (\d+) effects?: (.*)$]]
local id = tempRegexTrigger(procRegex, function()
  echo(matches[2])
  echo(matches[3])
end)
```

NukeFire does not weaken `^`, strip arbitrary prompt-looking text, or special-case `[Procs]`. The prompt boundary discards only the Action/Lua prompt carry before the next mud line arrives; it does not invent a synthetic trigger line for the prompt itself.

## 2. Trigger captures

Temporary triggers are enabled immediately when created. Calling `enableTrigger(id)` immediately after `tempRegexTrigger()` is optional unless the trigger was disabled first.

For regex callbacks:

- `matches[1]` is the complete regex match.
- `matches[2]` is capture group 1.
- `matches[3]` is capture group 2, and so on.
- Named captures remain available as `matches.name`.
- `ipairs(matches)` is supported for walking the populated numeric match array.

Regression coverage includes literal `[Procs]`, anchored `^`, `\d+`, singular `1 effect:`, plural `2 effects:`, `matches[1..3]`, and `ipairs(matches)`.

## 3. cecho / decho / hecho render formatting

Beta.74 recognized common Mudlet-style formatting but stripped it before display. Beta.75 keeps the existing `echo` host-event contract and its plain-text `args` projection, while adding bounded host-only formatting metadata that is rendered through NukeFire's normal safe output parser/render path.

Examples:

```lua
cecho('<red>Danger<reset>')
cecho('<blue:yellow>Warning<reset>')
decho('<255,0,0:0,0,64>Danger<r>')
hecho('#00FF00Healthy#r')
```

The formatter supports common named foreground/background colors (including the existing NukeFire Mudlet package's `orange_red`), `ansi_NNN`, decimal RGB, hex RGB, reset, bold, italic, underline, overline, and strike toggles. Unknown tags remain visible instead of silently deleting user text.

Lua still has no direct terminal, xterm, DOM, HTML, CSS, JavaScript, or renderer authority. Raw escape/control sequences supplied by a Lua script are removed; only the NukeFire formatter creates approved SGR sequences.

## 4. Lua comments in saved scripts

Saved script source is preserved as Lua source. Both ordinary and block comments are explicitly regression-tested:

```lua
-- ordinary comment
local value = 1

--[[
block comment
]]
return value
```

No comment preprocessor is added. The source continues to go through Lua's normal parser.

## 5. Save & Run replaces resources owned by that script

A saved script now owns temporary resources it creates. For a script named `procColorTest`, the ownership boundary is internal and resembles:

```text
script/procColorTest
```

On **Save & Run** or `#luascript run procColorTest`:

1. stop new callbacks from the old script-owned temporary resources;
2. allow any already-running callback to finish;
3. sweep the script owner again in case that callback created another resource while finishing;
4. remove that script's old temporary aliases, triggers, timers, event handlers, and Custom Panes;
5. drop their Worker callback functions;
6. execute the new source in the existing Lua VM.

The whole VM is **not** reset. Globals and resources belonging to other scripts remain intact. `Reload Autorun` remains the intentional full fresh-VM operation.

Ownership follows callbacks. If a trigger owned by `procColorTest` later creates a timer or Custom Pane inside its callback, the new resource still belongs to `procColorTest` and is removed on the next run.

Deleting a saved script also retires resources owned by that script.

## Scope boundary

This pass is correction work only. It does not add filesystem access, networking, arbitrary renderer access, new Lua APIs, a package manager, or generic GUI scripting. New Lua features remain behind this correctness gate.
