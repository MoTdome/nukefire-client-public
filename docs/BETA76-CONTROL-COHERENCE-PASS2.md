# Beta.76 Control Coherence Pass 2

This pass treats NukeFire accessibility and audio as one control plane with one authority per setting.

## Rules

- SR owns server-side screen-reader presentation.
- CR is a bounded remote-control surface for existing NukeFire Client Reader settings.
- OUTPUT controls semantic text visibility; SPEECH controls live NukeFire Voice eligibility; GAG remains the literal fallback.
- Communication sound enable/disable is owned by communicationCues. Soundpack controls may reach the same state, but never add a second communication event gate.
- #A11Y and CR ACCESSIBILITY share executeAccessibilityOperation; no second journal/profile implementation is created.
- CR ACCESSIBILITY crosses GMCP through one bounded reader.accessibility.command action; the existing executor remains the operation allowlist.
- Audio/soundpack state remains in its existing persisted store in this pass; no parallel state.audio namespace is introduced.

## CR parity in the reconciled server candidate

- CR NATIVE ON|OFF|TOGGLE|STATUS
- CR VOICE GOVERNOR|PRIORITY|FOLLOW|INTERRUPT ON|OFF|TOGGLE
- CR VOICE VOICES [page], CR VOICE USE <number>|DEFAULT
- CR VITALS FORMAT BOTH|PERCENT|VALUES
- CR ANNOUNCEMENTS ON|OFF|TOGGLE|STATUS
- CR KEYS HOTKEYS and CR KEYS REMOVE HOTKEYS
- CR ACCESSIBILITY LAST|WHY|REPORT [COPY]|CAPABILITIES|TEST|DOCTOR|CLEAR|PROFILE ...
- CR SOUND controls Tell, Auction, Gossip, Group, Grats, Shout, Holler, Skynet, and SSF.

The fresh server candidate uses the same exact 75-action allowlist as the client and routes the existing Accessibility operations through the single bounded `reader.accessibility.command` action. Test-server compilation and live request/result checks are still required before publication.
