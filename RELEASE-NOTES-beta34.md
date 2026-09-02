# NukeFire Client 0.3.1-beta.34

## TinTin Comfort Pack: Optional Pipeline Debug

Beta.34 completes the original comfort-pack plan with an advanced troubleshooting
trace for the active session. It remains disabled by default.

### Commands

```text
#debug
#debug pipeline on
#debug pipeline off
#debug pipeline status
#debug pipeline show
#debug pipeline clear
```

The selected client-command prefix is honored. A bare `#debug` reports the active
session state and retained count. `show` prints the newest twenty entries locally.

### What it traces

- Typed input and top-level command-batch splitting
- Dispatch origin, Alias expansion, and Variable expansion
- Session/group routing, Speedwalk recognition, and outgoing sends
- Physical macro activation
- Action and Gag match decisions
- Matching Substitute and Highlight definitions

### Protocol panel and Preferences

When enabled, the existing Protocol panel shows a bounded chronological list with
Copy and Clear controls. Preferences enables the tracer for the active session and
selects a retention limit of 100, 200, or 500 entries. Each character session keeps
its own enable state and limit. Log entries are runtime-only and are not written to
the settings file.

### Safety and performance

- Secure password input replaces command and server details with a fixed redaction
  notice.
- Debug entries cannot dispatch commands or change displayed/server text.
- Disabled mode checks one boolean and does not evaluate lazy detailed messages.
- The sandboxed preload remains enabled and exposes only narrow get/set/clear IPC.
- Existing Actions, Gags, Substitutes, Highlights, Communications, vitals, command
  order, and screen-reader behavior remain authoritative.

Full verification target: **485/485 tests**.
