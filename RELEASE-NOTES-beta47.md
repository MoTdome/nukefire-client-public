# NukeFire Client 0.3.1-beta.47 — TinTin Script Editor

## Included

- `#edit` opens a native picker rooted in the NukeFire Scripts folder.
- `#edit {Prime}`, `#edit {Prime.tin}`, and TinTin-style `#edit read {Prime}` open an existing script in the system text editor.
- File → TinTin Scripts provides **Edit TinTin Script…** and **Show Scripts Folder**.
- The renderer reports what opened and reminds the player to use `#read` after saving.

## Safety

- Only existing regular extensionless or `.tin` files directly inside Documents/NukeFire Client/Scripts may be opened.
- Paths, nested files, directories, symlinks, unsafe extensions, and missing files are rejected.
- Actions cannot invoke `#edit`.
- Opening or saving a file never automatically loads or executes it.

## Not changed

- `#read`, `#write`, importer behavior, command ordering, network output, protocol handling, Maps, Communications, prompts, and terminal geometry are unchanged.
- No settings migration is required.

## Verification target

- Exact baseline: Beta.46 at 594/594 tests.
- Beta.47 target: 600/600 tests.
