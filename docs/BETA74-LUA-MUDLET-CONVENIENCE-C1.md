# Beta.74 Lua Mudlet Convenience C1

C1 rounds out a small set of familiar Mudlet conveniences without turning NukeFire Lua into a browser/terminal scripting surface.

## Sending and movement

```lua
sendAll("stand", "open north", "north")
sendAll("score", "inventory", false) -- suppress local sent-command echo
speedwalk("2n3eud")
speedwalk("2n3e", true)       -- reverse route
speedwalk("2n3e", false, 0.2) -- bounded delayed steps
```

`sendAll()` uses the same guarded direct `send()` bridge, including Mudlet-familiar trailing `false` to suppress local sent-command echo. `speedwalk()` uses NukeFire's existing Speedwalk parser, limits, and movement queue. It does not implement a second movement engine.

## Command line

```lua
local draft = getCmdLine()
printCmdLine("tell Bob ")
setCmdLine("tell Bob ")
appendCmdLine("hello")
clearCmdLine()
```

These functions only change the current session's input draft. They do not send the command. The main process owns the bounded draft and the renderer receives a narrow command-line update event; Lua never receives DOM access.

## Bounded visible output

```lua
local current = getCurrentLine()
local absolute = getLines(120, 130)
local recent = getLines(-10, -1)
```

NukeFire keeps a separate bounded visible-output history for Lua (256 completed lines, bounded per-line and snapshot bytes). It is populated after native gag filtering and from NukeFire-local display output. It is not xterm scrollback and Lua does not receive an xterm/DOM object.

`getLineNumber()`, `getLastLineNumber()`, and `getLineCount()` expose the current bounded absolute line position for scripts that use the familiar Mudlet naming.

## Echo compatibility

```lua
cecho("<red>Danger<reset>")
decho("<255,0,0>Danger")
hecho("#FF0000Danger")
```

C1 intentionally provides lightweight compatibility: common color markup is removed before routing the text through NukeFire's existing safe Lua echo path. It does not clone Mudlet's full console-buffer formatting, cursor, selection, or replacement API.

## Boundary retained

C1 adds no filesystem access, shell/process access, arbitrary network API, DOM/window/document access, raw xterm access, arbitrary HTML/CSS/JavaScript panes, gag callback, or synchronous render veto.
