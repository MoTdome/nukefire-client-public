# NukeFire Client 0.3.1-beta.66
## Modern Compression Transport

Beta.66 promotes the proven NukeFire compression transport work developed on
top of Beta.65 into a tester-ready three-platform release.

### Modern compression transport

- Adds MCCP2 server-to-client compression support using zlib/DEFLATE while
  preserving ordinary uncompressed Telnet behavior when MCCP is unavailable.
- Adds MCCPX negotiation for the official NukeFire Client, with Zstandard as
  the preferred modern codec and DEFLATE retained as an available fallback.
- Keeps MCCP2 and MCCPX mutually exclusive rather than stacking compressors.
- Preserves traditional MUD-client compatibility through the established
  MCCP2 path while allowing the NukeFire Client/NukeFire pair to use MCCPX.

### Live protocol diagnostics

- Protocol Diagnostics reports the active compression protocol, compression
  state, codec, wire bytes, expanded bytes, bandwidth savings, and ratio.
- Compression counters are intentionally not aria-live, so rapidly changing
  network telemetry does not create screen-reader noise.
- GMCP and GA prompt-boundary diagnostics continue alongside compression state
  for quick end-to-end verification.

### Copyover reliability

- Compression streams are explicitly terminated across NukeFire copyover.
- MCCPX/Zstandard is renegotiated after the replacement server process takes
  over the existing TCP socket.
- The client safely handles the Zstandard frame boundary and returns raw
  post-compression Telnet bytes to normal protocol parsing instead of treating
  them as another compressed frame.
- Live 4001 testing confirmed MCCPX/Zstandard reconnects after copyover while
  terminal output, GMCP, and prompt boundaries continue normally.

### Compatibility and preservation

- Existing Reader, Self-Voice, accessibility, communications, Mob Inspector,
  semantic output, TinTin Source-Parity, and multi-session behavior remain on
  the existing client architecture.
- Compression occurs below the normal Telnet/game-data processing path, so the
  terminal and higher-level features receive the same expanded bytes they did
  before compression.

### Verification

The accepted pre-release tree passed 1396 tests with zero failures.
The release workflow requires the complete suite before promotion, after the
version/release metadata update, and once more from the detached locked commit
used to build the distributions.
