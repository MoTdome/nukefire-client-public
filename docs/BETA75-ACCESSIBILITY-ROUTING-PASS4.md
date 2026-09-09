# NukeFire Beta.75 Accessibility Routing Pass 4

## Goal

Make accessibility easier to understand and carry between machines without building another independent settings system.

NukeFire already has authoritative presentation paths for Reader History, native screen readers, NukeFire Voice, semantic soundpacks, communication cues, safety alerts, and keybindings. Pass 4 adds one bounded **semantic presentation journal** above those paths. It records what meaningful event happened and, where the client knows the result, whether a presentation was stored, played, blocked, suppressed, deduplicated, disabled, or unavailable.

The journal is diagnostic and review-oriented. It never removes terminal text and does not replace the existing Reader/Speech/Soundpack controls.

## Player commands

Client-side commands are case-insensitive and use the player's selected client command prefix:

```text
#a11y last
#a11y why
#a11y report
#a11y report copy
#a11y capabilities
#a11y test
#a11y doctor
#a11y clear
#a11y profile list
#a11y profile save {Southpaw}
#a11y profile use {Southpaw}
#a11y profile delete {Southpaw}
#a11y profile export
#a11y profile import
```

Long forms `#accessibility` and `#access` are equivalent.

These diagnostics and profile operations are intentionally interactive-only. An Action, Alias, Function, Event, timer, Lua callback, or other automation cannot silently replace a player's accessibility profile or flood diagnostic output.

## Last Event

`#a11y last` reports the last meaningful semantic event observed by the client. The entry includes the event name, review category, priority, text, and a repeat count when identical events arrive in a short burst.

The repeat collapse affects only the diagnostic journal. It does not gag, summarize, or remove live terminal/Reader output.

## Why

`#a11y why` reports the most recent presentation decision that did not reach the player normally. Examples include:

- a sound blocked because Audio Cues are off;
- a communication sound blocked because that channel is off;
- a duplicate communication cue suppressed inside the existing short dedupe window;
- Reader History unavailable for a presentation that normally would be reviewable.

The goal is to answer “why did I not hear/get that?” from the actual presentation path rather than by asking the player to manually compare settings.

## Universal semantic review

The existing Reader History remains authoritative. Pass 4 adds semantic entries for:

- Navigation
- Loot
- Crafting
- Quests
- Safety
- Vitals
- System/client events

Existing Communications, Rooms, Combat, and Damage history remain in their existing paths. No second review pane is introduced.

## Priorities

Semantic events carry a bounded priority from low through critical. Priorities are descriptive metadata for presentation/review decisions and diagnostics. High/critical history entries may use the existing interrupt speech policy; lower-priority entries queue normally.

The presentation journal also collapses identical rapid repeats so a player can see “repeated 12 times” instead of diagnosing twelve identical events one by one.

## Setup report

`#a11y report` creates a sanitized summary of the player's presentation setup: Reader Workspace, screen-reader/Self-Voice choice, voice behavior, Audio Cues, soundpack, communication sounds, safety/priority controls, Reader History state, and accessibility keybinding count.

`#a11y report copy` copies that report when clipboard access is available.

The report does not include commands, command history, credentials, or private mud text.

## Named and portable profiles

Up to twelve local named accessibility profiles can be saved for quick switching. They snapshot the presentation settings that materially affect accessibility, including Reader Workspace, native/Self-Voice settings, audio/soundpack settings, communication cues, safety/priority behavior, and keybindings.

Portable export/import reuses NukeFire's existing protected `.nfpreset` path. This avoids another file format and retains the existing preset guarantee that commands, scripts, credentials, and history are not exported.

## Self-test and Doctor

`#a11y test` exercises semantic Communications, Navigation, Loot, Vitals, Safety, Reader History, and the normal Audio Cue playback gate. If Audio is disabled or blocked, the test reports the reason instead of forcing playback around the player's settings.

Doctor continues to diagnose Reader runtime state and now also reports duplicate native-reader plus Self-Voice speech and the most recent suppressed semantic presentation.

## Server bridge deferred

This pass is intentionally **client-only**. The local `#accessibility` / `#access` / `#a11y` command family is complete, but no new `reader.accessibility.*` actions are added to the bounded `NukeFire.Controls` allowlist yet.

The companion `CR ACCESSIBILITY ...` bridge will be added only after the current server `act.informative.c` and `gmcp.c` sources are reviewed together with the client contract. That keeps the existing semantic-control allowlist unchanged in this client pass and avoids guessing against stale server files.

## Deliberate boundaries

- No second speech engine.
- No second sound engine.
- No duplicate accessibility routing preference database.
- No raw filesystem, network, DOM, xterm, Web Audio, shell, or Lua authority is exposed.
- No terminal text is removed by the journal.
- No braille presentation layer is included in this pass.
