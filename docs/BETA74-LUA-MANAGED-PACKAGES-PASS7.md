# NukeFire Beta.74 Lua Managed Packages — Pass 7

Requires the exact green **Real NukeFire Mudlet Package Compatibility Pass 6 v2** state.

Adds protected, NukeFire-owned Lua persistence and modules plus small Mallard-familiar wrappers:

- `storage.get/set/delete` — bounded per-session JSON-compatible values.
- `nf.modules.set/get/delete` + safe `require()` — module names only; no filesystem resolution.
- `settings.get` — protected read-only settings surface for package adapters.
- `gmcp.on()` — subscribes to the same canonical GMCP events already used by NukeFire.
- `world.on("connect"/"disconnect")` — maps to existing session lifecycle events.
- `mud.send()` — maps to NukeFire's guarded direct send.
- `mud.trigger()` — maps to temporary regex Actions, **without gag capability**.

Not added: arbitrary `io`/`os`/`package`, network/download APIs, HTML/JS panel hosting, or synchronous Lua-driven gagging.

The pinned `mallardx-nukefire-vitals` package is used as a design/acceptance target for its clean pure-Lua modules and state/event patterns, not as a reason to import Mallard's panel or prompt-gag architecture.
