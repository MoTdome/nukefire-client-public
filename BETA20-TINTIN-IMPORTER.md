# NukeFire Client beta.20 — TinTin++ Alias and Action Importer

## Scope

This milestone adds one contained migration tool. It does not implement a TinTin
interpreter and does not change terminal, mapper, Communications, GMCP, command
ordering, or server behavior.

## Player workflow

1. Open **Preferences**.
2. Find **Import TinTin++ Aliases and Actions**.
3. Paste a narrowed TinTin export containing aliases and actions.
4. Select **Analyze Paste**.
5. Review each entry:
   - **Ready** — compatible and preselected.
   - **Translated** — a safe structural conversion was made and preselected.
   - **Review** — potentially useful, but requires explicit selection.
   - **Unsupported** — blocked from automatic import.
6. Choose whether existing definitions are kept or replaced.
7. Select **Import Selected**.
8. Review imported Actions and enable them individually when ready.

## Safety boundaries

- Paste is parsed only as text; it is never sent to NukeFire or executed locally.
- Imported Actions are always saved with `enabled: false`.
- Unsupported definitions cannot be selected.
- Definition, source-size, count, capture, command-count, and stored-length limits
  remain bounded.
- Duplicate handling defaults to keeping the existing NukeFire definition.
- Undo restores the alias/action snapshot from immediately before the last import
  during the current client run.
- Settings remain atomic and session automation is resynchronized through the
  existing restore path.

## Supported first-pass syntax

- `#alias`, `#al`, `#action`, `#act`, and `#ac`, case-insensitively.
- Braced and simple alias names.
- Balanced multiline command bodies.
- Optional numeric priorities.
- `%0` through `%9` where compatible with the existing NukeFire engines.
- Simple aliases whose TinTin name ends in argument placeholders, such as
  `#alias {heal %1} {cast heal %1}`, are safely converted to alias name `heal`.
- `#nop` lines and balanced `#nop { ... }` blocks are ignored.
- `#all` and possible named session/group routes are preserved for review and
  rewritten to the player's selected client-command prefix.
- Compatible Alias and Action bodies may contain Showme, Echo, Math, Format, and
  numeric If/Elseif/Else statements. Native `$variable` references are preserved.

## Deliberately unsupported automatic conversion

- Top-level TinTin Variables, Functions, switch/case, while/foreach control flow,
  lists/tables, tickers, file reads/writes, shell/system commands, classes,
  highlights, gags, dynamic alias/action creation, and other unsupported
  definition types. Safe Math, Format, and numeric conditionals are accepted only
  inside otherwise compatible imported Alias and Action bodies.
- Multi-word literal/pattern aliases.
- Action captures above `%9`, legacy `%0` inside an Action pattern, unnumbered
  TinTin wildcards, color-sensitive patterns, and embedded PCRE.
- Alias or Action bodies that exceed the existing ten top-level command limit.

Unsupported source remains visible in the review so the player can manually
rebuild important definitions later.

## Capacity

- Aliases: 512 global definitions.
- Actions: 256 global definitions.
- Pasted source: 2,000,000 characters.
- Parsed definitions: 2,000.
- Alias/Action generated commands: unchanged at ten.

## Verification

The supplied 3,588-line legacy TinTin file produced:

- 330 top-level aliases.
- 130 top-level actions.
- 245 Ready entries.
- 15 Translated entries.
- 19 Review entries.
- 181 Unsupported entries.
- 12 ignored `#nop` comments.
- 0 malformed top-level definitions.

The parser completed the sample in roughly 6–14 ms in the packaging environment.

## Import-button feedback hotfix

- The Import Selected button immediately changes to **Importing…** and exposes
  `aria-busy=true` before session synchronization begins.
- Import success, duplicate-only results, capacity skips, persistence warnings,
  and errors are reported directly beside the button and scrolled into view.
- The accepted import is saved immediately instead of relying only on the delayed
  general settings-save timer.
- Any unexpected exception is caught visibly; the prior aliases/actions remain
  available and saved definitions are not silently replaced.

## Live definition synchronization hotfix

- Import completion now updates the active SessionManager alias and action engines
  directly instead of rebuilding every session through the broad restore path.
- The renderer reads the live snapshot back and verifies every imported alias body,
  action command, priority, and enabled state before reporting success.
- `#alias` and `#action` therefore reflect the imported definitions immediately,
  and imported aliases can be used without restarting the client.
- Imported Actions remain disabled until the player enables them.
- Undo uses the same verified live synchronization path.
- Connected sessions, command queues, Variables, Gags, Speedwalk, and connection
  state are left untouched during alias/action synchronization.

## Beta.36 file-read separation

The Preferences paste importer remains a review-first Alias/Action workflow. The
new `#read` path is separate: it reads only safe `.tin`/extensionless files from
the visible Scripts folder, stages supported definition families atomically, and
never executes raw file commands. Unsupported entries remain reported rather than
being silently treated as imported definitions.

## Beta.37 file-write separation

`#write` is the safe counterpart to `#read`, not an extension of the Preferences
paste importer. It serializes the live supported definition and class snapshot to
one deterministic `.tin` file inside the visible Scripts folder. The resulting
file can be read back through the transactional loader; no raw command or host
execution is introduced.
## Beta.40 Function separation

The Preferences paste importer remains a review-first Alias/Action migration tool.
Safe `#read` now stages bounded `#function {name} {commands}` definitions, and
`#write` serializes them deterministically. Function calls execute only through
the restricted Local/Math/Format/Return interpreter; the paste importer does not
automatically convert broader TinTin Function or control-flow syntax.
