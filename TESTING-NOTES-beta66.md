# NukeFire Client 0.3.1-beta.66 — Tester Notes

This is a beta testing build of the new compression transport. Normal gameplay
should look and feel unchanged; the primary visible evidence is in Protocol
Diagnostics.

## Recommended packages

- macOS: `NukeFire-Client-0.3.1-beta.66-macOS-universal.zip` is the easiest testing download; the DMG is also included.
- Windows: `NukeFire-Client-Portable-0.3.1-beta.66-x64.exe` is the easiest no-install test; Setup is also included.
- Linux: `NukeFire-Client-0.3.1-beta.66-linux-x86_64.AppImage`.

Unsigned beta builds may trigger the normal macOS Gatekeeper or Windows
SmartScreen warnings.

## High-value things to test

1. Connect to NukeFire and verify normal terminal text, prompts, GMCP-driven
   panes, Reader/Self-Voice, and keyboard behavior.
2. Open Protocol Diagnostics and confirm the expected compression protocol,
   codec, wire bytes, expanded bytes, and bandwidth-savings counters.
3. On a current NukeFire server that offers MCCPX, confirm `MCCPX`, `Active`,
   and `Zstandard`.
4. Generate sustained output through movement, combat, look/score/inventory,
   help/news, and other large listings while watching for missing or garbled
   terminal output.
5. Test a server copyover while remaining connected. MCCPX should end cleanly,
   renegotiate, return to Active/Zstandard, and resume changing counters.
6. Disconnect and reconnect several times, including after a copyover.
7. Exercise multiple character sessions and existing accessibility features
   while compression is active.
8. Connect to servers that do not offer MCCPX/MCCP2; ordinary Telnet behavior
   should remain compatible.

Report any decompression warning, disconnect, stuck `Ended` state, missing
prompt, stale GMCP pane, or unusual pause with the Protocol Diagnostics values
visible at the time.
