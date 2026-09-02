(function initNukeFireSpeechMarkers(root, factory) {
  const exported = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  if (root) root.NukeFireSpeechMarkers = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createSpeechMarkerApi() {
  'use strict';

  const PREFIX = '\x1b]7777;NFSPEECH;';
  const TERMINATOR = '\x07';

  function createState() {
    return { pending: '', suppressed: false };
  }

  function normalizeState(state) {
    const target = state && typeof state === 'object' ? state : createState();
    target.pending = String(target.pending || '');
    target.suppressed = target.suppressed === true;
    return target;
  }

  function reset(state) {
    const target = normalizeState(state);
    target.pending = '';
    target.suppressed = false;
    return target;
  }

  function longestPrefixSuffix(text) {
    const max = Math.min(PREFIX.length - 1, text.length);
    for (let length = max; length > 0; length -= 1) {
      if (text.endsWith(PREFIX.slice(0, length))) return length;
    }
    return 0;
  }

  function consume(inputState, input) {
    const state = normalizeState(inputState);
    const hadPending = Boolean(state.pending);
    const startedSuppressed = state.suppressed;
    const source = `${state.pending}${String(input || '')}`;
    state.pending = '';

    let displayText = '';
    let speechText = '';
    let cursor = 0;
    let markerSeen = false;

    const appendVisible = (text) => {
      if (!text) return;
      displayText += text;
      if (!state.suppressed) speechText += text;
      else speechText += text.replace(/[^\r\n]/gu, '');
    };

    while (cursor < source.length) {
      const markerAt = source.indexOf(PREFIX, cursor);
      if (markerAt < 0) {
        const remainder = source.slice(cursor);
        const partialLength = longestPrefixSuffix(remainder);
        if (partialLength > 0) {
          appendVisible(remainder.slice(0, -partialLength));
          state.pending = remainder.slice(-partialLength);
          markerSeen = true;
        } else {
          appendVisible(remainder);
        }
        cursor = source.length;
        break;
      }

      appendVisible(source.slice(cursor, markerAt));
      const payloadStart = markerAt + PREFIX.length;
      const markerEnd = source.indexOf(TERMINATOR, payloadStart);
      if (markerEnd < 0) {
        state.pending = source.slice(markerAt);
        markerSeen = true;
        cursor = source.length;
        break;
      }

      const payload = source.slice(payloadStart, markerEnd);
      markerSeen = true;
      if (payload === '1') {
        state.suppressed = false;
      } else if (/^0;[0-9]+$/u.test(payload)) {
        state.suppressed = true;
      }
      cursor = markerEnd + TERMINATOR.length;
    }

    return {
      displayText,
      speechText,
      filtered: markerSeen || hadPending || startedSuppressed || state.suppressed,
      suppressed: state.suppressed,
      pending: state.pending
    };
  }

  return Object.freeze({ PREFIX, TERMINATOR, createState, reset, consume });
});
