# Sanitization notes

The public accessibility examples were created from selected SR/CR and GMCP control regions rather than publishing complete NukeFire production source files.

## Intentionally excluded

- player/staff-specific name branches and personalized output;
- world VNUMs, zone-specific lore, mobs, items, and unrelated gameplay systems;
- database queries and schema details unrelated to accessibility;
- server paths, development-machine paths, backup names, and build workflow details;
- unrelated admin/staff diagnostics;
- historical experimental comments, temporary `NEW`/debug notes, and tool/AI workflow commentary;
- code that only exists to support NukeFire-specific output policy, Class Legacy, quests, zones, combat balance, or world mechanics;
- any secret/token/password material.

## Credential scan

A conservative text scan of the three supplied source files did not find an obvious embedded API key, private-key block, service API token, or password literal in the SR/CR regions used for these examples. The public reference nevertheless avoids publishing the complete source files because minimization is safer than trying to prove that every unrelated line is public-safe.

## Comment cleanup

Public comments were rewritten to explain architecture and porting intent. Informal historical notes and comments that only made sense during NukeFire development were not carried into the reference.

## What remains NukeFire-specific

The GMCP package name `NukeFire.Controls` remains because the public NukeFire Client implements it. Projects adapting both client and server should normally choose their own namespace.
