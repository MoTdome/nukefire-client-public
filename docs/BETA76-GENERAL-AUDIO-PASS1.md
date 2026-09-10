# Beta.76 — General Audio Pass 1

## Goal

Soundpacks are a NukeFire Client feature, not a screen-reader requirement. Accessibility may use the same sounds, but normal terminal users can use Soundpacks and `#SOUND` with every Reader feature disabled.

## Preferences

Soundpacks, Audio Cues, communication sounds, Sound Triggers, and their tests/editor now live under **Preferences → Audio**. Accessibility keeps Reader Workspace, native screen-reader mode, Self-Voice, speech/review, and other Reader-specific presentation controls.

## `#SOUND`

```text
#sound
#sound {status}
#sound {custom.stairs}
#sound {custom.music.boss}
#sound {stop} {music}
#sound {stop}
#sound {list}
#sound {search} {door}
#sound {show} {custom.stairs}
```

`#SOUND {event}` remains Action-safe and managed by the active soundpack. It never receives a filename, filesystem path, URL, raw Web Audio option, or per-call volume. Discovery/status is interactive-only; playback and stop requests can be used by bounded automation without status spam.

## Music

Use `custom.music.*` for longer player-assigned tracks. This is a convention inside the existing soundpack system, not a new media subsystem.

- Starting one `custom.music.*` event stops the previous `custom.music.*` track.
- Normal sound effects continue playing.
- `#SOUND {STOP} {MUSIC}` stops only the current music track.
- `#SOUND {STOP}` stops all managed client audio.
- Tracks play once in this pass; looping, playlists, fades, and a general media-player surface are intentionally out of scope.

Example:

```text
#ACTION {Boss music begins} {#SOUND {custom.music.boss}}
#ACTION {The battle is over} {#SOUND {STOP} {MUSIC}}
```

Assign `custom.music.boss` an MP3, M4A, OGG, or WAV in **Preferences → Audio → Soundpack Editor**. The audio is copied into the `.nfsp`; the Action stores only the event name.

## Boundaries

This pass does not change server protocols, Reader speech, `.nfsp` format, arbitrary file/network access, or the protected soundpack import/assignment model.
