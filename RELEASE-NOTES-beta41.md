# NukeFire Client 0.3.1-beta.41

## Lazy numeric TinTin conditionals

Beta.41 adds bounded `#if`, `#elseif`, and `#else` branching using the same safe
numeric evaluator as `#math`. Zero is false; any non-zero result is true.

```text
#if {$hp < 25} {flee;recall} {say steady}

#if {$hp >= 75} {bash $target}
#elseif {$hp >= 40} {kick $target}
#else {flee}
```

### Included

- Inline true/false branches and adjacent If/Elseif/Else chains.
- Lazy evaluation: only the selected branch expands Functions and Variables or
  evaluates nested calculations.
- Direct command, Alias, Action, Function, delay, loop, class, macro, routing, and
  command-line batch support.
- Custom client prefixes and Pipeline Debug condition/branch stages.
- Safe importer recognition inside compatible Alias and Action bodies.

### Safety

- Selected Action branches are completely prevalidated and cannot hide persistent
  management commands, repeat multiplication, or compact Speedwalk.
- Selected Function branches remain limited to Local, Unlocal, Math, Format,
  nested conditionals, and Return; failures restore persistent Variables.
- Nesting is limited to 16 levels, chains to 16 branches, and selected bodies to
  64 commands.
- Standalone Elseif/Else, malformed chains, invalid Math, and excessive structures
  fail without executing any branch.
- String/regex conditions, switch/case, while/foreach, break, and continue remain
  separate milestones.

## Verification gate

The guarded installer requires the exact beta.40 file state and exactly 573 passing
tests. Any failure restores beta.40 and verifies every accepted baseline hash.
