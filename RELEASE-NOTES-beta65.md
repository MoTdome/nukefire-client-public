# NukeFire Client 0.3.1-beta.65
## Accessibility & Combat Context Reliability

Beta.65 is a tester-focused lock of the accessibility, communications, Affects,
and server-authoritative combat-context work developed on top of Beta.64.

### Accessibility and Reader refinements

- Command-history Up/Down no longer re-announces the full command-input help
  description on every recalled command.
- Optional command-send Self-Voice interruption lets newly issued commands cut
  through stale queued speech without changing the existing movement/priority
  behavior.
- Client Reader history retains meaningful CR/tutorial accessibility material
  for later review without adding a second speech path.
- Alt+1 through Alt+9 Reader line recall is local and draft-safe: partially
  typed commands/messages and caret state remain intact while output is reviewed.
- Native communication earcons for Gossip, Skynet, and SSF are independently
  controllable, background-capable, and de-duplicated across multi-session crews.
- Skynet detection is narrowed to real communication broadcasts so local
  Skynet(TM) GPS/status text does not generate false channel activity.

### Communications and Affects

- Communications "newest at bottom" now preserves the player's live-edge intent
  across unrelated GMCP/layout refreshes while respecting intentional scrollback.
- Affects rendering distinguishes harmful effects/modifiers from beneficial or
  mixed effects using NukeFire apply-direction semantics rather than simply
  treating every negative number as bad.
- Harmful states include non-color screen-reader labels in addition to red visual
  treatment.

### Mob Inspector / combat-context reliability

- Current opponents, Mob.Info, and TargetAffects share an opaque mob-instance
  identity so successive mobs with the same vnum/name cannot be confused.
- Explicit no-target/clear semantics prevent instant kills from leaving the
  Inspector stuck on a dead target.
- Late stale Mob.Info/TargetAffects packets are rejected instead of resurrecting
  old combat context.
- Background sessions and compatibility fallback paths follow the same instance
  identity contract.

### TinTin compatibility preserved

- The complete Source-Parity 1-20 runtime from Beta.64 remains intact, including
  the bounded veteran Alias/Action/Variable/Function/Class/List/Path/Event,
  BUFFER/GREP, REGEXP/MATH/FORMAT, MESSAGE/IGNORE, CURSOR/TAB and session/file
  compatibility work.

### Verification

The accepted pre-lock candidate passed 1379 tests with zero failures.
The release workflow requires the complete suite before promotion, after the
version bump, and once more from the detached locked commit before packaging.
