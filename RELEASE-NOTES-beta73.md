# NukeFire Client 0.3.1-beta.73
## Combat Responsiveness and Sustained Performance

Beta.73 is a performance and combat-responsiveness release built from sustained
live-load measurements rather than speculative rewrites.

### Combat and target responsiveness

- Keeps terminal presentation responsive during heavy combat with the same
  2 ms latency ceiling used for ordinary output.
- Stabilizes rapid multi-kill target handoffs so Opponent Vitals, Group Targets,
  and Mob Inspector do not repeatedly collapse and reopen between authoritative
  target transitions.
- Coalesces synchronous kill-triggered NukeFire.Mob and Char.TargetAffects
  refreshes so a kill burst requests the latest surviving target once instead
  of generating redundant refresh pairs.
- Preserves immediate authoritative GMCP state and existing accessibility /
  Reader semantics while smoothing visual presentation only.

### Compression and incoming-output efficiency

- Uses 64 KiB decoder output chunks for MCCP2 DEFLATE and MCCPX DEFLATE/Zstandard.
  Benchmarks showed substantially fewer decoder callbacks and materially lower
  decode overhead than the previous smaller chunk allocation.
- Preserves the existing MCCP2 and MCCPX negotiation/copyover semantics,
  compression backpressure, raw-remainder recovery, and protocol diagnostics.
- Retains bounded xterm write coalescing/backpressure and compact terminal
  palette serialization.

### Persistence and long-session behavior

- Avoids unnecessary settings persistence work for ordinary commands.
- Avoids an extra renderer-side full-map deep clone before Electron IPC by
  retaining Mapper serialize({ clone: false }).
- Adds Mapper render/save instrumentation to Long Session Performance Reports.
  Sustained movement testing showed Mapper SVG rendering itself is inexpensive.
- Bounds explored-map persistence during continuous running with a 350 ms quiet
  debounce and a 2 second maximum dirty interval, eliminating the zero-delay
  post-save chain that could otherwise produce dozens of full saves per 10
  seconds under nonstop movement.
- Keeps long-session output queues bounded and preserves the existing terminal,
  Reader-history, communications, and multi-session retention policies.

### Verification quality

- Makes the Char.Vitals performance regression less sensitive to one-shot timing
  noise while keeping its original workload and >=1.5x reuse requirement.
- Adds regressions for compression chunk sizing, rapid-kill target presentation,
  kill-refresh coalescing, and Mapper performance instrumentation.

### Preserved behavior

- Reader, Self-Voice, keyboard review, soundpacks, TinTin compatibility,
  multi-session state, GMCP, MCCP2, MCCPX, copyover recovery, GPS/Mapper route
  safety, terminal hyperlinks, and existing accessibility workflows remain on
  their established paths.

### Mapper persistence release gate

The bounded Mapper persistence debounce is included only because this release
closer requires its dedicated regression to pass immediately before the complete
Beta.73 verification suite. The release build is refused if the implementation
and regression are not present as a matched pair.
