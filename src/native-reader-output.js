(function attachNativeReaderOutput(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireNativeReaderOutput = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createNativeReaderOutputApi() {
  'use strict';

  function normalizeText(value) {
    return String(value ?? '').replaceAll('\r', '').trimEnd();
  }

  function stripTerminalControls(value) {
    return String(value ?? '')
      .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/gu, '')
      .replace(/\u009b[0-?]*[ -/]*[@-~]/gu, '')
      .replace(/\x1b\[[0-?]*[ -/]*[@-~]/gu, '')
      .replaceAll('\r', '');
  }

  function isBarePrompt(value) {
    return stripTerminalControls(value).trim() === '>';
  }

  function ariaNotifyTargets(documentRef, elementRef) {
    const targets = [];
    if (documentRef && typeof documentRef.ariaNotify === 'function') {
      targets.push({ kind: 'document', target: documentRef });
    }
    if (
      elementRef
      && elementRef !== documentRef
      && typeof elementRef.ariaNotify === 'function'
    ) {
      targets.push({ kind: 'element', target: elementRef });
    }
    return targets;
  }

  function notifyNativeReaderOutput(value, options = {}) {
    const text = normalizeText(value);
    if (!text.trim() || isBarePrompt(text)) {
      return { announced: false, method: 'suppressed', text };
    }

    const documentRef = options.documentRef
      || (typeof document !== 'undefined' ? document : null);
    const elementRef = options.elementRef || null;
    const priority = options.priority === 'high' ? 'high' : 'normal';

    for (const entry of ariaNotifyTargets(documentRef, elementRef)) {
      try {
        entry.target.ariaNotify(text, { priority });
        return { announced: true, method: `ariaNotify:${entry.kind}`, text };
      } catch (_error) {
        // Try the next supported target, then let the caller use its legacy
        // live-region fallback if native notification is unavailable.
      }
    }

    return { announced: false, method: 'unavailable', text };
  }

  return Object.freeze({
    normalizeText,
    stripTerminalControls,
    isBarePrompt,
    notifyNativeReaderOutput
  });
});
