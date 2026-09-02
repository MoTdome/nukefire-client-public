# NukeFire Client 0.3.1-beta.36

## Safe TinTin script reads

Beta.36 adds a bounded, transactional `#read` workflow for compatible TinTin
definition files.

### Usage

```text
#read
#read {Prime}
#read {prime.tin}
```

A blank read prints the visible `Documents/NukeFire Client/Scripts` folder and
available files. Extensionless names try the exact filename and then `.tin`.
`#Prime` remains session activation; only `#read Prime` requests a file.

### Supported in this interval

- Aliases, Variables, Actions, Gags, Highlights, Substitutes, and Macros.
- `#class {name} {open|close}` membership around supported definitions.
- Balanced multiline braces, `/* comments */`, alternate command characters,
  apostrophes, quoted spell names, and later-definition overwrite behavior.
- Familiar `#OK:` category totals and explicit `#WARN:` skipped-command counts.
- Atomic live replacement followed by immediate persistent settings saving.

### Safety boundaries

- Files are read only from the visible Scripts folder.
- Paths, symlinks, unsupported extensions, invalid UTF-8, and files above two
  megabytes are rejected.
- Malformed supported syntax aborts the complete load.
- Unsupported Functions, nested reads, shell commands, and raw login commands are
  reported and skipped; they are never executed.
- Actions cannot initiate disk reads.
- Failed activation or settings saving restores the exact prior definitions and
  class snapshot.

Do not commit or tag beta.36 until the guarded installer reports 511/511 tests and
live `#read`, extensionless resolution, load totals, and restart persistence checks pass.
