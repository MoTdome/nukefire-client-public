# NukeFire Client Beta.76 — Command-Line Custom Sounds

Custom sounds no longer require Preferences navigation. The normal workflow is:

```text
#SOUND {ADD} {custom.vpunch}
#SOUND {custom.vpunch}
#ACTION {struck from behind by a shadowy fist} {#SOUND {custom.vpunch}}
```

ADD prepares and activates the existing `personal-sounds.nfsp` when needed, opens the protected operating-system audio chooser, and copies the chosen WAV, MP3, OGG, or M4A into the pack through the existing Soundpack Store. Choosing or cancelling returns focus to the mud command input. No command accepts a raw path.

The same shared operations now serve Preferences, local `#SOUND` commands, and the existing CR SOUNDPACK bridge:

```text
#SOUND {ADD} {custom.name}
#SOUND {ASSIGN} {custom.name}
#SOUND {SHOW} {custom.name}
#SOUND {TEST} {custom.name}
#SOUND {CLEAR} {custom.name}
#SOUND {DELETE} {custom.name}
```

ADD and ASSIGN offer the convenient create-if-missing custom-event behavior. CLEAR removes only the event's audio assignment. DELETE is limited to `custom.*` events and cannot remove built-in/server semantic definitions. Shared archive assets remain present while another event still references them.

- `ADD` is the one-command create-and-assign workflow for player `custom.*` events.
- `ASSIGN` replaces an assignment and can create a missing valid custom event. It can also assign a known official event in an editable pack.
- `SHOW` reports source, assignment, enabled state, volume, cooldown, active-pack context, and the normal playback gate without exposing private paths.
- `TEST` uses the same managed playback path as `#SOUND {custom.name}`.
- `CLEAR` removes only that event's editable audio assignment.
- `DELETE` removes only a player-created `custom.*` event and its transient catalog/disabled state.

Soundpack-changing commands are direct-player operations. Actions, Aliases, Functions, timers, and Lua callbacks cannot open a chooser or mutate a soundpack through them.

Custom event IDs retain the Beta.75 lowercase canonical form, 80-character name limit, and `custom.*` pattern. Capacity rises from 32 to 2,500 custom events with a 4,096-entry archive ceiling and a bounded 1 MB manifest. The existing 25 MB archive, 50 MB expansion, 8 MB per-audio, protected-picker, extension, and path protections remain in force. The `.nfsp` schema is unchanged.

The proposed Action “output only/no speech” flag is deliberately not part of this pass. It crosses Action matching, terminal output, Reader History, native screen-reader behavior, and NukeFire Voice, and needs its own coherent presentation-control design rather than being hidden inside sound assignment.
