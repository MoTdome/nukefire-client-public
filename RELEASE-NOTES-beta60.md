NUKEFIRE CLIENT 0.3.1-beta.60
Safe Lua Foundation and Reader UI Boundary

Beta.60 locks the first production-safe Lua foundation and the reader/Communications UI boundary cleanup.

Lua foundation
- Wasmoon 1.16.0, Lua 5.4, Node Worker host.
- `#lua` is available in the normal client.
- APIs: send(), echo(), getVariable(), setVariable(), getSession().
- TinTin and Lua share the same per-session NukeFire variable engine.
- No filesystem, shell, network, package, debug, coroutine, Node, Electron, DOM, or arbitrary JavaScript access.
- Soft timeout + parent hard watchdog + memory limit + bounded command/value surfaces remain enforced.

Quiet automation
- `#config {COMMAND ECHO} {OFF}` is the default.
- ON restores routine TinTin/Lua execution acknowledgements.
- Deliberate #showme/Lua echo output and genuine errors remain visible.

Communications / reader boundary
- Ordinary Communications contains Channels, Display, and Find controls, not reader-review navigation.
- Reader Workspace, Last Tell, Last Communication, stable per-channel review identity, and configurable reader review actions remain intact.

Verification target
- Lua/API/COMMAND ECHO: 19/19
- Communications reader boundary: 28/28
- Full suite: 980/980
- npm check: PASS
- git diff --check: PASS

Lock policy
- Commit/tag locally only.
- No distributions built.
- No push performed.
- Unsigned / not notarized.
