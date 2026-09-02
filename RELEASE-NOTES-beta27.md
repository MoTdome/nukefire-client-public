# NukeFire Client 0.3.1-beta.27

## TinTin Comfort Pack: Local Showme

This interval adds `#showme {text}` and the traditional `#show {text}` alias.
The text appears only in the originating client session and is never queued or sent
to NukeFire. It works while disconnected and expands existing NukeFire variables
once.

Showme uses the same terminal and screen-reader output foundation as normal session
text. It may trigger Actions, matching the familiar TinTin behavior, while remaining
isolated from Communications channel detection and vitals parsing. Terminal control
characters are removed and output length is bounded.

This is intentionally a small compatibility interval. Row and column positioning
are not yet supported, and `#echo` remains unsupported because its formatting
semantics are materially different from `#showme`.
