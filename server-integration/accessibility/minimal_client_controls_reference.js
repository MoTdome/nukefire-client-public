/*
 * Minimal NukeFire.Controls client reference.
 *
 * This is a portability example distilled from Beta.76 semantic-controls.js
 * and renderer/renderer.js. It deliberately has no Electron, filesystem,
 * soundpack, DOM, or game-specific dependencies.
 */
'use strict';

const CONTROL_ACTIONS = Object.freeze(new Set([
  "client.status",
  "reader.status",
  "reader.session.begin",
  "reader.exit.restore",
  "reader.preset",
  "reader.load.mushsettings",
  "reader.workspace",
  "reader.native.enabled",
  "reader.voice.enabled",
  "reader.voice.muted",
  "reader.voice.stop",
  "reader.voice.test",
  "reader.voice.rate",
  "reader.voice.pitch",
  "reader.voice.volume",
  "reader.voice.foreground",
  "reader.voice.governor",
  "reader.voice.priority",
  "reader.voice.follow",
  "reader.voice.interrupt",
  "reader.voice.voices",
  "reader.voice.use",
  "reader.voice.restart",
  "reader.vitals.format",
  "reader.announcements.enabled",
  "reader.audio.status",
  "reader.audio.enabled",
  "reader.audio.muted",
  "reader.audio.stop",
  "reader.audio.test",
  "reader.audio.volume",
  "reader.audio.foreground",
  "reader.sound.status",
  "reader.sound.channel",
  "reader.sound.background",
  "reader.sound.test",
  "reader.sound.reset",
  "reader.soundpack.status",
  "reader.soundpack.list",
  "reader.soundpack.import",
  "reader.soundpack.use",
  "reader.soundpack.builtin",
  "reader.soundpack.test",
  "reader.soundpack.events",
  "reader.soundpack.show",
  "reader.soundpack.assign",
  "reader.soundpack.clear",
  "reader.soundpack.volume",
  "reader.soundpack.duplicate",
  "reader.soundpack.export",
  "reader.accessibility.command",
  "reader.doctor",
  "reader.recover",
  "reader.unread",
  "reader.context",
  "reader.keys",
  "reader.tutorial",
  "reader.alerts.enabled",
  "reader.category.next",
  "reader.category.previous",
  "reader.category.status",
  "reader.review.repeat",
  "reader.review.first",
  "reader.review.back",
  "reader.review.forward",
  "reader.review.latest",
  "reader.review.previous",
  "reader.review.next",
  "reader.review.tell",
  "reader.review.communication",
  "reader.lines.current",
  "reader.lines.previous",
  "reader.lines.next",
  "reader.lines.latest",
  "reader.lines.recall"
]));

function cleanText(value, maximum) {
  return String(value ?? '').normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .slice(0, maximum);
}

function normalizeControlRequest(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  if (Number(source.schema) !== 1) return null;
  const id = Number(source.id);
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const action = cleanText(source.action, 96).toLowerCase();
  if (!CONTROL_ACTIONS.has(action)) return null;
  const rawArgs = source.args && typeof source.args === 'object' && !Array.isArray(source.args)
    ? source.args : {};
  return Object.freeze({
    schema: 1,
    id,
    action,
    args: Object.freeze({ value: cleanText(rawArgs.value, 96) })
  });
}

function buildControlResult(request, ok, message, state = {}) {
  return {
    schema: 1,
    id: request.id,
    ok: ok === true,
    action: request.action,
    message: cleanText(message, 500),
    state: state && typeof state === 'object' ? state : {}
  };
}

/*
 * adapters.handlers must be an explicit map keyed by semantic action ID.
 * Do not use eval(), dynamic import, shell execution, or action-as-command.
 * Each handler receives the normalized value and request and returns either:
 *   { ok: true|false, message: '...' }
 * or a Promise resolving to that object.
 */
async function handleControlRequest(rawBody, adapters = {}) {
  const request = normalizeControlRequest(rawBody);
  if (!request) return null;

  const handler = adapters.handlers?.[request.action];
  let outcome;
  if (typeof handler !== 'function') {
    outcome = { ok: false, message: 'This allowed control is not implemented by this client build.' };
  } else {
    try {
      outcome = await handler(request.args.value, request);
    } catch (_error) {
      outcome = { ok: false, message: 'The client control failed safely.' };
    }
  }

  const result = buildControlResult(
    request,
    outcome?.ok === true,
    outcome?.message || (outcome?.ok === true ? 'Client control completed.' : 'Client control failed.'),
    typeof adapters.snapshot === 'function' ? adapters.snapshot() : {}
  );

  if (typeof adapters.sendGmcp === 'function') {
    await adapters.sendGmcp('NukeFire.Controls.Result', result);
  }
  return result;
}

function receiveGmcp(packageName, body, adapters = {}) {
  if (String(packageName || '') !== 'NukeFire.Controls.Request') return false;
  void handleControlRequest(body, adapters);
  return true;
}

module.exports = Object.freeze({
  CONTROL_ACTIONS,
  cleanText,
  normalizeControlRequest,
  buildControlResult,
  handleControlRequest,
  receiveGmcp
});
