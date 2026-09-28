# NukeFire Client 0.3.1-beta.84

Beta.84 is a build-environment correction for the experimental Windows Native
Reader transport introduced in Beta.83. It does not change the Native Reader
protocol, NVDA/JAWS selection, renderer routing, fallback behavior, NukeFire
Voice, or the macOS/Linux accessibility path.

## Why Beta.84 exists

The Beta.83 source candidate passed the complete NukeFire verification suite and
was tagged successfully. The release workflow then built macOS and Linux
successfully, but the Windows distribution job failed while configuring PRISM.

The failure occurred before the NukeFire native helper itself compiled. PRISM
v0.18.2 requested the C23 language dialect, while the Windows-2022 / Visual
Studio 2022 environment used by the NukeFire distribution workflow did not
satisfy that requirement as detected by CMake.

PRISM v0.18.2's own Windows CI uses a newer environment:

- `windows-2025-vs2026`;
- an initialized x64 MSVC developer environment;
- current CMake;
- the Ninja generator.

Beta.84 aligns NukeFire's Windows native-helper build with that upstream
toolchain.

## Functional changes

Only the Windows build infrastructure changes:

- the Windows matrix runner moves from `windows-2022` to
  `windows-2025-vs2026`;
- the workflow initializes MSVC using PRISM's pinned
  `ilammy/msvc-dev-cmd` action;
- the workflow installs current CMake using PRISM's pinned
  `lukka/get-cmake` action;
- `scripts/build-native-reader-bridge.js` now configures with Ninja and
  `CMAKE_BUILD_TYPE=Release` rather than Visual Studio `-A x64`;
- the helper build directory is cleared before configuration to avoid stale
  generator caches.

The macOS runner remains `macos-15-intel` and the Linux runner remains
`ubuntu-24.04`.

## Native Reader behavior

Beta.84 carries the Beta.83 Native Reader implementation unchanged:

- Windows automatic completed MUD output uses the isolated PRISM helper first;
- PRISM v0.18.2 is pinned and statically linked;
- NVDA is tried first and JAWS second;
- SAPI/OneCore are not used as helper fallbacks;
- Beta.82 `ariaNotify()` / polite live-region delivery remains the fallback;
- manual Reader/UI announcements stay on the established Beta.82 path;
- macOS and Linux continue using the Beta.82 Native Reader behavior.

## Verification

Beta.84 adds source regression checks requiring the PRISM-compatible Windows
runner, pinned MSVC/CMake setup, Ninja Release generator, and unchanged
macOS/Linux matrix entries. The complete `npm run verify` suite must pass before
the Beta.84 commit/tag is created.

The tagged distribution workflow then performs a clean verification and the
real Windows compilation. The GitHub Release is published only if macOS,
Windows, and Linux distribution builds all succeed.
