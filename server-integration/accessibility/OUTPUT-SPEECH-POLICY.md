# Semantic OUTPUT and SPEECH policy reference

NukeFire separates **what a message means** from **how it was printed**. This is the key design behind `OUTPUT` and `SPEECH`.

## Category tree

Examples include:

```text
combat
  combat.self
    combat.self.miss
  combat.others
    combat.others.miss
  combat.flavor
  combat.proc
  combat.group
movement
  movement.others
  movement.group
affect
  affect.fade
  affect.others
communication
  communication.gossip
  communication.ssf
  communication.skynet
loot
regen
crafting
```

`OUTPUT` supports `FULL`, `SUMMARY`, and `OFF`. An unset child inherits the nearest explicit parent; if nothing is explicit, legacy/full behavior is retained.

`SPEECH` reuses the same categories but is only `ON` or `OFF`: it determines whether visible tagged output is eligible for NukeFire Voice. It does **not** hide terminal text.

## Protected output

A semantic write may carry a protected flag. Protected state is categorized and counted but cannot be suppressed by either the OUTPUT or SPEECH layer. This is the escape hatch for critical accessibility/safety state.

## Viewer-relative categories

Combat and movement are recipient-relative. The same underlying event can resolve to `combat.self` for the actor/target and `combat.others` for a bystander. Group movement similarly resolves to `movement.group` only for the viewer's own group.

## Why this is useful to other MUDs

A semantic policy prevents accessibility from turning into hundreds of brittle literal gags. Game code marks an event once; each player then chooses full, summary, off, or speech-only behavior by meaning.

See `semantic_output_policy_reference.[ch]` for a dependency-light model of parent inheritance, protected output, event-to-category resolution, and the important summary suppression cases.
