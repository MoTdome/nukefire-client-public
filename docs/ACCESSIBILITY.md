# NukeFire Client — Accessibility & Reader Guide

> **For NukeFire Client 0.3.1-beta.73 and the accompanying NukeFire server accessibility controls**

This guide is written for screen-reader, braille, keyboard-first, and NukeFire Voice users. It also includes an implementation overview for MUD developers who want to adapt the server-side SR/CR model.

## Terminology

- **Native screen reader** — VoiceOver, NVDA, JAWS, Narrator, Orca, or another accessibility technology reviewing exposed text.
- **NukeFire Voice / Self-Voice** — Optional speech produced by the official NukeFire Client. “Self-Voice” and “NukeFire Voice” refer to the same feature.
- **Reader Workspace** — The client’s command-field-first accessibility layout. Hiding visual panels does not stop their underlying state, Mapper, sessions, or automation.
- **SR** — Server-side screen-reader presentation. SR works even when the player is using a different MUD client.
- **CR** — Shorthand for **CLIENT READER**. CR controls features implemented by the official NukeFire Client and therefore requires GMCP plus `NukeFire.Controls 1` support.
- **SPEECH** — Controls whether visible semantic categories enter NukeFire Voice. It does not remove terminal text or Reader Review history.
- **OUTPUT** — Controls whether tagged semantic text remains visible, is summarized, or is hidden.

---

## 1. Fastest safe setup

### Native screen reader

```text
sr setup balanced
cr setup native
cr load mushsettings
cr status
```

This enables balanced server presentation, selects the official client’s native-screen-reader preset, installs conflict-safe MUSH-style Reader controls, and reports the resulting state.

### NukeFire Voice instead of a native reader

```text
sr setup balanced
cr setup live
cr voice test
cr status
```

Do not run native screen-reader speech and NukeFire Voice over the same live output unless you intentionally want both. If you hear duplicated speech, either turn NukeFire Voice off or select the client preset that matches your intended speech path.

Built-in help:

```text
sr help
cr help
cr help setup
cr tutorial
cr tutorial audio
```

---

## 2. The accessibility layers

Most configuration problems become easier once each layer has one job.

| Layer | Owner | Purpose |
| --- | --- | --- |
| `SR ...` | MUD server | Screen-reader-friendly room, prompt, combat, resource, group, danger, and output presentation. |
| `CR ...` | Official NukeFire Client | Reader Workspace, review, Self-Voice, audio, soundpacks, shortcuts, alerts, and client recovery. |
| `SPEECH ...` | Server policy + client Voice | Whether visible semantic text is spoken by NukeFire Voice. |
| `OUTPUT ...` | Server | Whether semantic text is full, summarized, hidden, or default. |
| `GAG ...` | Server/player filter | Literal fallback filtering for old or untagged text. |

Conceptually:

```text
server event
  -> semantic OUTPUT policy
  -> personal GAG/filter layer
  -> exact dedupe / summary policy
  -> terminal + Reader Review
  -> SPEECH policy
  -> NukeFire Voice
```

Audio/soundpack cues are independent. A short notification sound can remain enabled even when SPEECH for that category is off.

---

## 3. Server screen-reader command: SR

Typing bare `sr` is read-only: it reports status/help instead of unexpectedly changing settings.

### Enable / disable

```text
sr on
sr off
```

Accepted exit aliases include `disable`, `normal`, `restore`, and `exit`.

`SR ON` enables server screen-reader presentation and compact combat behavior. When a compatible official client is connected, the server also asks it to snapshot the pre-Reader client state so a later exit can restore it.

`SR OFF` always disables the server flag. If the official client control bridge is available, it additionally requests restoration of the client setup that existed before Reader mode.

### Setup profiles

```text
sr setup descriptive
sr setup balanced
sr setup minimal
```

**Descriptive**
- full room descriptions;
- screen-reader presentation;
- compact prompt/combat behavior;
- output summary suite.

**Balanced**
- brief room descriptions;
- screen-reader presentation;
- compact prompt/combat behavior;
- output summary suite.

**Minimal**
- balanced behavior;
- additionally enables the quiet communications preset.

The setup profile removes visual prompt chips that are noisy for linear speech. Resource values remain available on demand.

### Status and diagnostics

```text
sr status
sr doctor
sr layers
sr recap
```

`SR STATUS` reports the detected profile, room verbosity, prompt mode, compact combat, summary state, semantic output overrides, speech overrides, and gag/filter state.

`SR DOCTOR` explains conflicting layers rather than silently changing them.

`SR LAYERS` shows the ordered output stack.

`SR RECAP` produces a stable room/resource/combat/group/danger snapshot.

### On-demand information

```text
sr all
sr stats
sr hp
sr mana
sr move
sr mob
sr xp
sr room
sr exits
sr gear
sr inv
sr afx
sr group
sr danger
sr groupassist
```

These commands are deliberately text-first and do not require a visual panel.

### Brief / verbose

```text
sr brief
sr verbose
```

### Server semantic output and speech

```text
sr output ...
sr speech ...
sr gag ...
```

Use semantic OUTPUT where a category exists. Use SPEECH to silence or restore NukeFire Voice without hiding terminal text. GAG remains useful for literal legacy lines.

---

## 4. Official-client Reader command: CR

`CR` is shorthand for:

```text
client reader ...
```

Bare `cr` reports help; it does not silently toggle Reader mode.

### Important: `cr` is not TinTin-like `#cr`

```text
cr status
```

is the server accessibility command.

```text
#cr
```

is a **TinTin-like scripting command** that sends one blank command. The scripting prefix is what distinguishes them.

### Client availability

CR requires:

1. GMCP negotiation;
2. the client advertising `NukeFire.Controls 1`;
3. the server using a strict action allowlist.

If that bridge is unavailable, SR commands continue to work normally. This is intentional: server accessibility must not depend on one proprietary client.

### Coordinated setup

```text
cr setup native
cr setup live
cr setup fast
cr setup quiet
```

Before changing the client preset, the server requests a one-time pre-Reader snapshot. The coordinated setup then applies the balanced server SR profile and asks the client to apply the selected local preset.

- **Native** — Reader Workspace, native screen reader handles speech.
- **Live** — Reader Workspace + NukeFire Voice following live play.
- **Fast** — live voice preset for experienced high-speed users.
- **Quiet** — Reader Workspace stays ready while NukeFire Voice remains muted until requested.

### Exit and restoration

```text
cr off
cr normal
cr restore
cr exit
```

These disable the server screen-reader flag and request restoration of the saved pre-Reader client state.

### Status, doctor, recovery

```text
cr status
cr context
cr doctor
cr recover
cr unread
```

---

## 5. Reader Review and exact line review

Reader History keeps semantic categories separate from raw terminal-line recall.

### Category navigation

```text
cr category next
cr category previous
cr category status
```

### Semantic review

```text
cr review latest
cr review previous
cr review next
cr review repeat
cr review first
cr review back 10
cr review forward 10
cr review tell
cr review communication
```

### Exact terminal lines

```text
cr lines current
cr lines previous
cr lines next
cr lines latest
cr lines 1
...
cr lines 10
```

Numbered line recall does not move the parked semantic review cursor.

A core accessibility promise is that review operations keep the command field usable and preserve partially typed input rather than forcing focus into terminal scrollback.

---

## 6. Keyboard controls and MUSH-style setup

Official presets are conflict-safe: existing player shortcuts are reported and preserved rather than silently replaced. Removing a preset removes only shortcuts owned by that preset.

### Install subsets

```text
cr keys status
cr keys lines
cr keys movement
cr keys mush
cr keys remove lines
cr keys remove movement
cr keys remove mush
```

### MUSH-style Reader controls

The Beta.73 MUSH-style setup is centered around:

| Key | Purpose |
| --- | --- |
| `Alt+1` … `Alt+9` | recall recent terminal lines |
| `Alt+I` | north |
| `Alt+J` | west |
| `Alt+K` | south |
| `Alt+L` | east |
| `Alt+U` | up |
| `Alt+N` | down |
| `Alt+Up` / `Alt+Down` | previous / next Reader History category |
| `Alt+Left` / `Alt+Right` | previous / next Reader History message where not reserved by native OS navigation |
| `Alt+End` | latest Reader History message |
| `Alt+T` | last Tell |
| `Alt+H` | current vitals |
| `Alt+C` | copy reviewed text |
| `F5` | mute / unmute NukeFire Voice in the MUSH preset |
| `F7` | stop current NukeFire Voice speech |
| `F8` / `F9` | previous / next Reader History message |
| `F10` | latest Reader History message |

Use `CR KEYS STATUS` as the authority on a particular installation because player-defined conflicts are intentionally preserved.

### Load the full MUSH-style preset

```text
cr load mushsettings
```

The server first requests a pre-Reader snapshot. If that snapshot cannot be established, the client preset is not applied blindly.

---

## 7. NukeFire Voice / Self-Voice

```text
cr voice status
cr voice on
cr voice off
cr voice toggle
cr voice mute
cr voice unmute
cr voice stop
cr voice restart
cr voice test
cr voice speed 1.2
cr voice pitch 1.0
cr voice volume 80
cr voice foreground on
```

Supported numeric bounds are intentionally validated:

- rate/speed: `0.1` through `10.0`;
- pitch: `0.0` through `2.0`;
- volume: `0` through `100`.

Foreground-only speech can discard stale queued speech when the application is backgrounded. The speech governor may condense stale speech during sustained output while leaving complete terminal/Reader Review text intact. Priority messages and movement-follow behavior can interrupt stale speech.

---

## 8. SPEECH, OUTPUT, GAG, and dedupe

Use the narrowest layer that matches the problem.

### Keep text, stop NukeFire Voice

```text
cr speech gossip off
```

### Hide or summarize a semantic category

```text
cr output gossip off
```

### Silence the last semantic category that bothered you

```text
cr speech last off
```

Undo:

```text
cr speech last default
```

### Literal legacy filtering

Use GAG when no semantic category exists.

### Diagnose interactions

```text
sr doctor
sr layers
cr doctor
```

---

## 9. Audio cues and communication sounds

### Master audio cues

```text
cr audio status
cr audio on
cr audio off
cr audio toggle
cr audio mute
cr audio unmute
cr audio stop
cr audio test
cr audio volume 70
cr audio foreground on
```

### Communication notification sounds

```text
cr sound status
cr sound tell on
cr sound auction off
cr sound gossip toggle
cr sound background on
cr sound test tell
cr sound reset
```

These are independent from NukeFire Voice.

---

## 10. Soundpacks

The server sends **semantic event names only**. The official client owns local audio files, volume, muting, foreground rules, and pack editing.

```text
cr soundpack status
cr soundpack list
cr soundpack import
cr soundpack builtin
cr soundpack use <pack-id>
cr soundpack test door.open
cr soundpack events
cr soundpack show door.open
cr soundpack assign door.open
cr soundpack clear door.open
cr soundpack volume door.open 70
cr soundpack duplicate <source-id> <new-id>
cr soundpack export [pack-id]
cr soundpack door.open off
```

Pack/event tokens are deliberately bounded and character-validated before being sent to the client.

The public Beta.73 repository includes three complete example/test packs:

- NukeFire Classic
- Reader Essential
- Wasteland Immersive

---

## 11. Practical recipes

### Native screen reader, low interruption

```text
sr setup balanced
cr setup native
cr load mushsettings
cr alerts on
cr voice off
```

### NukeFire Voice, moderate output

```text
sr setup balanced
cr setup live
cr output standard
cr voice speed 1.2
cr voice foreground on
cr alerts on
```

### Keep Gossip visible, stop speaking it, retain a sound

```text
cr speech gossip off
cr sound gossip on
```

### Lowest-noise semantic output with safety retained

```text
cr output minimum
cr alerts on
```

### Review without losing a partially typed command

```text
cr lines 1
cr lines previous
cr review tell
cr unread
```

### Reconnect/copyover health check

```text
cr status
cr context
cr doctor
cr recover
```

---

## 12. Implementor overview

NukeFire’s accessibility design intentionally separates **server-owned presentation** from **client-local convenience**.

### Minimum useful SR implementation

A MUD can implement SR without the NukeFire desktop client at all. At minimum:

1. persist one per-player screen-reader preference;
2. provide `SR ON`, `SR OFF`, `SR STATUS`, and a setup profile;
3. make resource/prompt output available in plain text;
4. expose readable room/exits/group/target/equipment/inventory/affect summaries;
5. reduce duplicate/noisy combat presentation without removing gameplay meaning;
6. make command feedback bypass any filter that could make accessibility controls themselves disappear.

### Optional CR-style client bridge

For a cooperating client:

1. negotiate GMCP;
2. client advertises `NukeFire.Controls 1` (or your own namespaced equivalent);
3. server sends a **strictly allowlisted** semantic action, never arbitrary executable client text;
4. client validates schema, action, and argument bounds;
5. client performs the local action;
6. client replies with a bounded result packet;
7. server validates the result before echoing it to the player.

Example request:

```text
NukeFire.Controls.Request {"schema":1,"id":42,"action":"reader.workspace","args":{"value":"on"}}
```

Example result:

```text
NukeFire.Controls.Result {"schema":1,"id":42,"ok":true,"action":"reader.workspace","message":"Reader Workspace enabled."}
```

### Snapshot / restore lifecycle

Before a coordinated setup changes client settings:

```text
reader.session.begin
```

On exit:

```text
reader.exit.restore
```

This lets the client save a one-time pre-Reader configuration and restore it later instead of permanently overwriting unrelated user preferences.

### Security principle

Do **not** turn the accessibility bridge into remote command execution. The server should be able to request only named, documented, locally validated actions such as “report Reader status,” “toggle Reader Workspace,” or “set Voice volume.” The client remains authoritative over local files, audio, keyboard conflicts, browser/OS behavior, and arbitrary scripting.

See `../server-integration/accessibility/` for sanitized reference code and porting notes.
