# NukeFire Client Beta.75

Beta.75 is reconciled from reviewed private source commit `7ef02ed7e531271ff76d2777fec60fe33f736b04`.

## Focus

- **Lua correctness before API expansion:** anchored `tempRegexTrigger()` now starts at the real/logical mud line after TELNET prompt boundaries; `cecho`/`decho`/`hecho` render through NukeFire's safe formatter; saved scripts support normal/block comments; Save & Run replaces only resources owned by that script.
- **Accessibility/sound correctness:** communication and soundpack previews use the real playback gates and explain blocked playback; `room.stairs` remains reserved until the game provides an authoritative staircase signal instead of guessing from ordinary up/down exits.
- **TinTin -> soundpack integration:** `#SOUND {event}` requests managed soundpack events and works safely inside `#ACTION`; bounded `custom.*` events live with their assigned audio inside portable `.nfsp` soundpacks rather than depending on loose local file paths.
- **Sound discovery:** `#SOUND {LIST}`, `#SOUND {SEARCH} {text}`, and `#SOUND {SHOW} {event}` make event names discoverable. TinTin client commands and SOUND subcommands are case-insensitive.
- **Accessibility routing:** local `#A11Y` / `#ACCESSIBILITY` commands provide Last Event, Why, sanitized setup reports, capability reporting, self-test/doctor, and portable named accessibility profiles. Repeat collapse is diagnostic only and never removes live mud output.
- **Reader review expansion:** semantic navigation, loot, crafting, quest, safety, vitals, communication, and system events reuse the existing Reader History rather than creating another review surface.

## Boundaries

Beta.75 keeps the existing authority model. Lua receives no arbitrary filesystem, shell/process, network, DOM, raw xterm, HTML/CSS/JavaScript pane, or synchronous render-veto authority. `#SOUND` requests managed events rather than bypassing mute/event/background/cooldown rules.

The client-side `#A11Y` routing layer is included here. The matching NukeFire game-side `CR ACCESSIBILITY` bridge is maintained separately from this public client source and is not required for the local `#A11Y` commands.

## Verification

The private source is verified with the complete `npm run verify` suite immediately before its private push. The reconciled public candidate is independently run through `npm ci`, `git diff --check`, `npm run check`, and `npm run verify` before this release commit/tag is pushed.
