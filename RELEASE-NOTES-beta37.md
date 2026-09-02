# NukeFire Client 0.3.1-beta.37 — Safe TinTin Script Writes

Beta.37 completes the first safe file round-trip for the TinTin compatibility
layer.

## Added

- `#write`, `#write {Prime}`, and `#write {prime.tin}`.
- Extensionless writes create or replace `Prime.tin` in
  `Documents/NukeFire Client/Scripts`.
- Deterministic export of Aliases, Variables, Actions, Gags, Highlights,
  Substitutes, Macros, category enabled state, individual enabled state, class
  membership, saved class snapshots, and the active class stack.
- Familiar `#OK:` written totals and explicit atomic-replacement reporting.
- Reversible escaping for structural braces, quotes, and backslashes.

## Safety

- Paths, directory traversal, symlinks, directories, unsupported extensions,
  unsafe names, empty output, and output above two megabytes are rejected.
- Existing regular files are written to a unique same-directory temporary file,
  synchronized, and replaced by atomic rename.
- Temporary files are removed after failures.
- Actions cannot initiate a disk write.
- The writer has no direct filesystem access; it sends one validated name and
  generated UTF-8 text through narrow sandboxed IPC.

## Round-trip behavior

Writer-emitted files are understood by the safe beta.36 loader. The loader now
stages category on/off state, disabled definitions, saved-class save/clear
operations, and explicit active-stack restoration as data. It still never
executes raw login commands, shell commands, nested reads, or arbitrary script
logic.

The same supported snapshot written twice produces the same content. Clearing
supported definitions and reading the generated file restores the supported
state exactly.

## Verification

- Full verification target: 522 tests.
- Do not commit or tag beta.37 until the guarded installer reports 522/522 and a
  live `#write Prime` / `#read Prime` smoke test succeeds.
