# NukeFire Client 0.3.1-beta.29

## TinTin Substitutes

Beta.29 adds the next focused TinTin Comfort Pack interval: persistent visible-text
substitution without changing the server text used by protected client systems.

### Commands

```text
#substitute
#substitute {pattern} {replacement} {priority 1-9}
#substitute show {pattern}
#substitute enable {pattern}
#substitute disable {pattern}
#substitute delete {pattern}
#unsubstitute {pattern}
#sub {pattern} {replacement} {priority 1-9}
#unsub {pattern}
```

### Behavior

- Patterns support literal text, `^`/`$` anchors, `%1`–`%9`, and `%*`.
- Replacements may reuse `%0`–`%9`; `%%` emits a literal percent sign.
- Lower numeric priorities win overlapping matches.
- One bounded substitution pass runs on completed visible lines before Highlights.
- Replacement text is not recursively substituted.
- Captured text preserves its server ANSI styling and safe OSC 8 link metadata.
- Actions, Gags, Communications, and vitals continue to receive the original line.
- Terminal scrollback, Find, copy, and screen-reader review use the substituted line.
- Local `#showme` output follows the same display substitution and Highlight order.
- Definitions persist and participate in class save, clear, and load.

### Deliberately deferred

Regex mode, multiline replacement, replacement functions, TinTin color codes inside
replacement text, recursive substitution, and `#read`/`.tin` script loading remain
separate later intervals.

Full verification target: **444 tests**.
