NUKEFIRE CLIENT 0.3.1-beta.58
Accessibility and Reader Workspace

This release promotes the cumulative Beta.58 accessibility/reference-harvest sequence on top of trusted Beta.57.

Highlights
- Protected native accessibility/editing shortcuts.
- Stable Reader Review with logical line identity and recent-line recall.
- Stable Communications review with per-channel message identity, Last Tell, and Last Communication.
- Configurable reader/review semantic actions without forced default shortcuts.
- Native screen-reader presentation remains the default for VoiceOver, NVDA, JAWS, and Orca.
- Optional NukeFire Self-Voice with Stop Talking, active-session isolation, movement/follow interruption, sustained-output backlog condensation, and priority Tell/System alerts.
- Reader Workspace hides ordinary panes while keeping all underlying processing alive and provides a dedicated Reader Review pane.
- Leaving Reader Workspace restores the exact normal workspace rather than rebuilding/resetting it.

Safety and architecture
- Full terminal and Reader Review text is preserved even when Self-Voice condenses stale spoken backlog.
- Background sessions continue automation but do not mix into active-session Self-Voice.
- SYSTEM/SYS and CHAT remain blocked.
- No shell-based speech execution was added.

Release verification
- Accessibility: 66/66
- Preferences: 7/7
- TinTin: 444/444
- Full: 915/915

Artifacts are unsigned beta builds.
