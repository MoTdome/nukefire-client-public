# NukeFire Client 0.3.1-beta.48 — TinTin Session Reset Commands

## Included

- `#end` immediately disconnects the active session without opening the confirmation dialog.
- The client remains open, and other session tabs are not disconnected.
- Bare `#kill` clears all live supported TinTin definitions and class state so `#read {Prime.tin}` can reload from a clean slate.
- `#kill` also cancels pending delays and queued Speedwalk steps for the active session.
- Client Help documents both commands and explains the intentional NukeFire adaptation of TinTin `#end`.

## Preserved

- Script files, output, command history, session profiles, Maps, Communications, protocols, accessibility settings, and UI preferences are not erased by `#kill`.
- `#end` uses the existing disconnect path, including normal queue and delay cancellation.
- Actions cannot invoke either command.
- No settings migration is required.

## Verification target

- Exact baseline: Beta.47 at 600/600 tests.
- Beta.48 target: 605/605 tests.
