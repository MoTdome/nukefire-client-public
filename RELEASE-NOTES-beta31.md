# NukeFire Client 0.3.1-beta.31

## TinTin Comfort Pack: Command-line batches

Beta.31 brings TinTin-style semicolon command lists directly to the command bar.

```text
e;bash goblin;flee
#showme {Ready};look
#alias {panic} {flee;recall};panic
```

### Behavior

- Up to twenty top-level commands run in order.
- Ordinary MUD commands and client commands may be mixed in one line.
- Braces and quoted text protect embedded semicolons.
- `\;` sends one literal semicolon as server text.
- The complete line is validated before execution; malformed or oversized lines send nothing.
- A session activated earlier in the line becomes the source for later commands.
- Every part uses the established Alias, Variable, routing, repeat, delay, loop, Speedwalk, and outgoing-command pipeline.
- The entire typed line remains one command-history entry.
- Mixed client/server lines use the correct connection gate and prompt boundary even when the client command appears first.

This interval does not add shell-style operators, conditional execution, pipelines,
or background commands.

## Verification gate

The guarded installer requires the exact beta.30 payload and runs the full
463-test verification suite. Beta.31 must not be committed or tagged until the
Mac result and live command-bar checks pass.
