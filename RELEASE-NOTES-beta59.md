NUKEFIRE CLIENT 0.3.1-beta.59
Accessible Audio and Semantic Combat Foundation

This release promotes the cumulative Beta.59 accessibility/audio sequence on top of trusted Beta.58.

Highlights
- Foreground-only NukeFire Self-Voice across the main window and popouts, with true mute/unmute and no catch-up of background speech.
- Persistent Self-Voice tuning: rate 0.1x-10x, pitch 0-2, volume 0-1, and installed system voice selection.
- Reader presets plus optional F5-F10 accessibility actions. Fast Reader now uses a practical 2x preset.
- Six built-in native Audio Cues: Hit, Miss, Incoming, Critical, Kill, and Danger. Audio Cues remain OFF by default.
- User Sound Triggers with action-style patterns, cooldowns, enable/disable controls, and optional suppression of matching lines from NukeFire Self-Voice only.
- NukeFire.Combat 1 semantic GMCP support as an event-only stream. Schema-1 packets are normalized and forwarded ephemerally rather than accumulated in GMCP state/history.
- Bounded semantic-combat diagnostics through Pipeline Debug for live server/client verification.

Accessibility architecture
- Native screen readers (VoiceOver/NVDA/JAWS/Orca), NukeFire Self-Voice, and Audio Cues remain separate channels.
- Terminal and Reader Review text remains complete even when a Sound Trigger suppresses a matching line from Self-Voice.
- Background sessions continue normal processing without producing Self-Voice catch-up.
- Optional F5-F10 bindings are conflict-safe and do not override protected native accessibility/editing keys.
- Semantic combat audio mapping is not included yet; this release freezes the verified transport/client foundation for hard screen-reader testing first.

Release verification
- Accessibility: 106/106
- Semantic Combat bridge: 6/6
- Preferences: 7/7
- TinTin: 444/444
- Full: 961/961

Artifacts are unsigned beta builds.
