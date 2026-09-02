# NukeFire Client 0.3.1-beta.73 Testing Notes

Beta.73 was exercised with focused and full-suite regression gates throughout
the performance work.

Key live observations before release:

- Sustained heavy terminal output drained without persistent xterm backlog.
- Event-loop delay remained small under multi-megabyte incoming-output bursts.
- 64 KiB MCCP2/MCCPX decoder chunks reduced decode callback volume while
  preserving prompt/interactive flush behavior in targeted tests.
- Rapid multi-kill target transitions were hardened so visual target surfaces
  remain stable across short authoritative handoffs.
- Mapper Long Session instrumentation showed SVG rendering is inexpensive under
  constant movement while persistence was the heavier path.
- The bounded Mapper persistence scheduler is release-gated by its dedicated
  regression and the complete verification suite before it is allowed to ship.

Release procedure:

1. Full npm run verify on the exact Beta.73 candidate before version metadata.
2. Version/notes/build metadata update to 0.3.1-beta.73.
3. Full npm run verify again.
4. Commit exact release tree and build from a detached worktree.
5. npm ci + full verification in the detached worktree.
6. Build macOS Universal, Windows x64, and Linux x64 distributions.
7. Generate SHA-256 checksums and a release manifest.

These are unsigned beta distributions. macOS Gatekeeper and Windows SmartScreen
may warn on first launch.
