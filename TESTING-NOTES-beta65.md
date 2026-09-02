# NukeFire Client 0.3.1-beta.65 — Tester Notes

This is a beta testing build. Please report anything that feels slower, noisier,
stale, inaccessible, or inconsistent even if it does not crash.

## Recommended packages

- macOS: `NukeFire-Client-0.3.1-beta.65-macOS-universal.zip` is the easiest testing download; the DMG is also included.
- Windows: `NukeFire-Client-Portable-0.3.1-beta.65-x64.exe` is the easiest no-install test; Setup is also included.
- Linux: `NukeFire-Client-0.3.1-beta.65-linux-x86_64.AppImage`.

Unsigned beta builds may trigger the normal macOS Gatekeeper or Windows
SmartScreen warnings.

## High-value things to test

1. Reader/Self-Voice command history and optional interrupt-on-command behavior.
2. Alt+1 through Alt+9 review while halfway through typing Gossip/SSF/commands.
3. Gossip/Skynet/SSF sound cues, background behavior, and multi-session dedupe.
4. Communications with Newest at bottom during combat/GMCP activity and while
   intentionally scrolled back.
5. Affects with Doom, Pestilence, Poison, Curse and mixed buffs/tradeoffs.
6. Mob Inspector instant kills, rapid target swaps, multiple attackers, and two
   successive mobs with the same vnum/name.
7. Multiple connected character sessions, especially switching away and back
   during combat-context updates.
8. Existing TinTin scripts/imports from Beta.64; this build is intended to retain
   Source-Parity 1-20 unchanged.

For best Mob Inspector identity results on NukeFire itself, use the current
server build that emits the post-2026-08-22 mob instance/clear GMCP contract.
Older servers remain compatible but cannot provide the same exact-instance
identity guarantees.
