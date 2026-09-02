# NukeFire Client 0.3.1-beta.54 — Session-Scoped TinTin Profiles and Multiplayer Workflow

## Private character profiles

Every NukeFire session now owns its complete TinTin environment:

- aliases and variables;
- Functions and Actions;
- gags, highlights, and substitutions;
- physical-key macros;
- classes and saved class definitions;
- Speedwalk state;
- the bound `.tin` profile identity.

Wind's definitions cannot execute in Gator, Gator cannot overwrite Wind, and
inactive-session output is processed only through that session's own engines.

## Familiar multiplayer startup

A disconnected workspace can begin with:

```text
#read wind.tin
logwind
```

Wind's login alias creates the Wind session, and Wind receives only
`wind.tin`. If Wind then runs `logator`, the Gator session is created cleanly
and receives only `gator.tin`. The same pattern can continue for every member
of a multiplayer crew.

Automatic character-profile loading is a clean replacement. Manual `#read`
remains a deliberate merge into only the issuing session.

## Profile commands

```text
#profile
#profile gator
```

Reports the bound file, profile state, connection state, and definition totals.

```text
#reload
#reload gator
#session gator reload
```

Cleanly reloads the selected character from its bound private profile without
disconnecting it or inheriting another session's definitions.

`#sessions` now shows each character's profile and Alias/Action totals, and
session tabs visibly include the bound profile filename.

## Editing and writing

- Bare `#write` uses the active session's bound profile when available.
- Bare `#edit` opens that bound profile.
- The editor directs users to `#reload`, which cleanly reflects deletions and
  changes rather than merging stale definitions back in.
- An explicit filename remains available for intentional alternate files.

## Safety and persistence

- New sessions are clean before their profile is read.
- A target never temporarily runs the creator's Actions or gags.
- Missing or invalid automatic profiles leave only the target clean, report the
  error in that target, and never fall back to the source character.
- Existing sessions reconnect without unexpectedly reloading a live profile.
- Schema 40 stores full TinTin state inside each session.
- Legacy shared definitions migrate into only the previously active session.

## Verification

- Focused suite: 244 tests, 244 pass, 0 fail.
- Full suite: 632 tests, 632 pass, 0 fail.
- npm check and git diff --check passed.
