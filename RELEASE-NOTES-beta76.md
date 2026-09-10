# NukeFire Client 0.3.1-beta.76
## Command-Line Audio and Control Coherence

Beta.76 makes general audio and custom sounds usable without navigating Preferences, while keeping the existing protected soundpack and playback architecture.

### Command-line custom sounds

- `#SOUND {ADD} {custom.name}` creates or reuses Personal Sounds, opens the protected operating-system audio chooser, copies the selection into the existing `.nfsp`, and returns focus to command input.
- ASSIGN, SHOW, TEST, CLEAR, and DELETE provide the remaining normal editor operations without accepting raw paths.
- Preferences and commands use the same Soundpack Store operations and playback engine.
- Manually requested sound results are announced through the existing Reader path; automated playback remains quiet when blocked.

### General audio

- Audio settings now have their own Preferences category and do not require Reader Workspace, a native screen reader, or NukeFire Self-Voice.
- `custom.music.*`, `#SOUND {STOP}`, and `#SOUND {STOP} {MUSIC}` use the existing managed playback path.
- Personal Sounds supports up to 2,500 bounded custom event allocations and 4,096 archive entries without changing the `.nfsp` schema or protected file-selection boundary.

### Control coherence

- Communication sounds have one enable authority across Preferences, soundpack controls, and CR SOUND.
- The client exposes exactly 75 bounded server-control actions for native Reader mode, Self-Voice, vital speech, important announcements, keyboard presets, Accessibility diagnostics/profiles, general audio, and soundpacks.
- The matching fresh server candidate uses the same exact allowlist and preserves semantic-only GMCP requests.

### Compatibility fixes

- Actions and temporary Lua triggers again match gameplay prompts completed by TELNET GA/EOR without breaking anchored next-line matching.
- A detached GPS search field preserves its exact caret and selection while live filtering rebuilds the mirrored panel.
- Existing SOUND LIST/SEARCH/SHOW wording and Beta.75 TinTin, Lua, Reader, soundpack, and security contracts remain guarded.

### Deliberate boundaries

- No raw audio paths, new audio engine, new soundpack format, media browser, playlist system, shell access, or Reader-only sound database was added.
- Action output-only/no-speech behavior and server-authored room/zone sound libraries remain separate future design work.
- Distributions are unsigned and may trigger macOS Gatekeeper or Windows SmartScreen warnings.
