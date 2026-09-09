# NukeFire Client Beta.75 — Accessibility / Sound Pass 1

This pass follows the green Lua Correction Pass 1 and corrects the player-facing sound behavior identified through Southpaw testing. It adds no new Lua surface.

## Communication sounds

Group, Grats, Shout, and Holler remain first-class Communications/soundpack events. Their real playback path now shares the same gate decision used by sound tests and previews.

A communication cue can be blocked because its channel switch is off, its soundpack event is disabled, Audio Cues are off or muted, foreground-only policy blocks background playback, audio is unavailable, volume is zero, or the cue is in cooldown. Test/status output states the reason instead of merely saying that playback failed.

## Soundpack Preview Event

Preview Event now tests the selected semantic event as it would be allowed to play during normal use. It no longer bypasses an event-disabled switch or a disabled communication channel. The event status line also reports either `playback ready` or the current blocking reason.

## DCC / Breach stairs

Beta.74 derived `room.stairs` from any `Room.Info` containing an up/down exit. That is too broad: ordinary elevators, stairwells, vertical roads, ladders, and other vertical exits are not necessarily the DCC/Breach staircase cue Southpaw was asking for.

Beta.75 therefore stops emitting `room.stairs` from generic Room.Info exits. The event remains allowlisted for soundpack compatibility but is marked reserved/not-emitted until the game supplies an authoritative DCC/Breach staircase signal. We do not guess from display text or generic directions.
