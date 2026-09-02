# NukeFire Client 0.3.1-beta.24

## MNES, NEW-ENVIRON, and Safe OSC 8 Links

Beta.24 adds a negotiated hyperlink foundation without trusting terminal escape
sequences as executable code.

### Server capability exchange

- Supports Telnet NEW-ENVIRON option 39 using the MNES handshake.
- Reports `CHARSET`, `CLIENT_NAME`, `CLIENT_VERSION`, `MTTS`, and
  `TERMINAL_TYPE` when requested by the server.
- Adds the MNES capability bit to the existing MTTS response.
- Reports the Mudlet-compatible user variables `OSC_HYPERLINKS`,
  `OSC_HYPERLINKS_SEND`, and `OSC_HYPERLINKS_PROMPT`.
- Resets negotiation state after `DONT NEW-ENVIRON` and sends an MNES `INFO`
  update when screen-reader mode changes the MTTS capability value.
- Shows negotiated MNES/link status in the Protocol panel.

### Safe server links

- Preserves validated OSC 8 links through ANSI parsing, session scrollback,
  terminal batching, session switching, and xterm restoration.
- Allows only `http:` and `https:` external links. They open through Electron's
  isolated main-process browser bridge.
- Supports `send:` links through the normal NukeFire command pipeline and blocks
  server links from running client-management directives.
- Supports `prompt:` links by placing decoded text in the command input without
  executing it. Prompt links cannot replace hidden password input.
- Rejects malformed, oversized, credential-bearing, control-character, `file:`,
  `javascript:`, and unknown URI schemes while leaving the visible label as plain
  terminal text.
- Provides hover descriptions and screen-reader announcements for activation.

### Keyboard and screen-reader access

Recent validated links remain available from the command line:

```text
#links
#link 1
```

`#links` lists the most recent unique links for the active session, and `#link`
activates the selected entry through the same protected handler used by a click.
The commands follow the player's selected client-command prefix.

Package version: `0.3.1-beta.24`

Complete Mac verification target: `402/402` tests.
