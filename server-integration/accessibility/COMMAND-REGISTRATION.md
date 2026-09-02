# Circle/TBA command registration used by NukeFire accessibility

The current command table keeps server presentation, cooperating-client controls, and the legacy compatibility toggle separate.

```c
{"output", "output", POS_DEAD, do_output, 0, 0, -1},
{"speech", "speech", POS_DEAD, do_speech, 0, 0, -1},

{"client", "client", POS_DEAD, do_client, 0, 0, -1},
{"cr",     "cr",     POS_DEAD, do_client, 0, 1, -1},
{"sr",     "sr",     POS_DEAD, do_sr,     0, 0, -1},

{"reader", "reader", POS_DEAD, do_reader, 0, 0, -1},
```

## Meaning

- `SR` is the rich server-side accessibility/presentation command.
- `CLIENT ...` is the general cooperating-client command surface.
- `CR ...` calls the same `do_client` handler with subcommand `1`, which makes `CR` shorthand for `CLIENT READER`.
- `OUTPUT` and `SPEECH` expose semantic visibility/speech policy directly.
- `READER` remains separately registered for compatibility as the old server screen-reader toggle; it is not the same command as `CR`.

Do not delete the legacy `reader` registration merely because SR/CR exist. Existing players, scripts, or help may still depend on it. A port may choose to make `reader` call a small compatibility toggle or delegate to `SR ON/OFF`, but should do so deliberately.
