'use strict';

(function exposeSemanticControls(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NukeFireSemanticControls = api;
})(typeof window !== 'undefined' ? window : globalThis, function createSemanticControls() {
  const MAX_CONTROL_TEXT = 160;
  const MAX_COMMAND_TEXT = 1024;
  const MAX_PROFILES = 64;
  const MAX_TARGETS = 64;
  const MAX_ACTIONS = 64;
  const MAX_GROUPASSIST_OPTIONS = 64;
  const SEMANTIC_BINDING_TYPES = Object.freeze([
    Object.freeze({ id: 'raw', label: 'Command or alias' }),
    Object.freeze({ id: 'combo-profile', label: 'Combo profile' }),
    Object.freeze({ id: 'groupassist-rotation', label: 'GroupAssist rotation' }),
    Object.freeze({ id: 'path-action', label: 'Path control' })
  ]);
  const SEMANTIC_TYPE_IDS = new Set(SEMANTIC_BINDING_TYPES.map((record) => record.id));
  const CONTROL_REQUEST_ACTIONS = Object.freeze(new Set([
    'client.status',
    'reader.status',
    'reader.session.begin',
    'reader.exit.restore',
    'reader.preset',
    'reader.load.mushsettings',
    'reader.workspace',
    'reader.native.enabled',
    'reader.voice.enabled',
    'reader.voice.muted',
    'reader.voice.stop',
    'reader.voice.test',
    'reader.voice.rate',
    'reader.voice.pitch',
    'reader.voice.volume',
    'reader.voice.foreground',
    'reader.voice.governor',
    'reader.voice.priority',
    'reader.voice.follow',
    'reader.voice.interrupt',
    'reader.voice.voices',
    'reader.voice.use',
    'reader.voice.restart',
    'reader.vitals.format',
    'reader.announcements.enabled',
    'reader.audio.status',
    'reader.audio.enabled',
    'reader.audio.muted',
    'reader.audio.stop',
    'reader.audio.test',
    'reader.audio.volume',
    'reader.audio.foreground',
    'reader.sound.status',
    'reader.sound.channel',
    'reader.sound.background',
    'reader.sound.test',
    'reader.sound.reset',
    'reader.soundpack.status',
    'reader.soundpack.list',
    'reader.soundpack.import',
    'reader.soundpack.use',
    'reader.soundpack.builtin',
    'reader.soundpack.test',
    'reader.soundpack.events',
    'reader.soundpack.show',
    'reader.soundpack.assign',
    'reader.soundpack.clear',
    'reader.soundpack.volume',
    'reader.soundpack.duplicate',
    'reader.soundpack.export',
    'reader.accessibility.command',
    'reader.doctor',
    'reader.recover',
    'reader.unread',
    'reader.context',
    'reader.keys',
    'reader.tutorial',
    'reader.alerts.enabled',
    'reader.category.next',
    'reader.category.previous',
    'reader.category.status',
    'reader.review.repeat',
    'reader.review.first',
    'reader.review.back',
    'reader.review.forward',
    'reader.review.latest',
    'reader.review.previous',
    'reader.review.next',
    'reader.review.tell',
    'reader.review.communication',
    'reader.lines.current',
    'reader.lines.previous',
    'reader.lines.next',
    'reader.lines.latest',
    'reader.lines.recall'
  ]));

  function cleanText(value, maximum = MAX_CONTROL_TEXT) {
    return String(value ?? '').normalize('NFKC')
      .replace(/[\u0000-\u001f\u007f]/gu, ' ')
      .replace(/\s+/gu, ' ')
      .trim()
      .slice(0, maximum);
  }

  function cleanCommand(value) {
    return cleanText(value, MAX_COMMAND_TEXT);
  }

  function cleanId(value) {
    return cleanText(value, 96);
  }

  function normalizedSkill(input = {}) {
    const id = Number(input?.id);
    const name = cleanText(input?.name, 96);
    if (!Number.isFinite(id) || id < 0 || !name) return null;
    return { id: Math.trunc(id), name };
  }

  function normalizedAction(input = {}) {
    const id = cleanId(input?.id);
    const label = cleanText(input?.label, 120);
    const command = cleanCommand(input?.command);
    if (!id || !label || !command) return null;
    return {
      id,
      label,
      command,
      kind: cleanText(input?.kind, 40) || 'execute'
    };
  }

  function normalizedGroupAssistOption(input = {}) {
    const id = cleanId(input?.id).toLocaleLowerCase();
    const label = cleanText(input?.label, 120);
    const command = cleanCommand(input?.command);
    const skillId = Number(input?.skillId);
    if (!id || !label || !command || !Number.isFinite(skillId)) return null;
    return {
      id,
      label,
      command,
      skillId: Math.trunc(skillId),
      skill: cleanText(input?.skill, 120) || label,
      leaderTarget: input?.leaderTarget === true
    };
  }

  function normalizeControlsSnapshot(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const comboSource = source.combo && typeof source.combo === 'object' ? source.combo : {};
    const assistSource = source.groupassist && typeof source.groupassist === 'object' ? source.groupassist : {};
    const pathSource = source.path && typeof source.path === 'object' ? source.path : {};

    const active = (Array.isArray(comboSource.active) ? comboSource.active : [])
      .slice(0, 3).map(normalizedSkill).filter(Boolean);
    const profiles = [];
    const usedProfiles = new Set();
    for (const raw of (Array.isArray(comboSource.profiles) ? comboSource.profiles : []).slice(0, MAX_PROFILES)) {
      const name = cleanText(raw?.name, 64);
      const key = name.toLocaleLowerCase();
      if (!name || usedProfiles.has(key)) continue;
      const skills = (Array.isArray(raw?.skills) ? raw.skills : [])
        .slice(0, 3).map(normalizedSkill).filter(Boolean);
      if (!skills.length) continue;
      profiles.push({ name, skills });
      usedProfiles.add(key);
    }

    const targets = [];
    const usedTargets = new Set();
    for (const raw of (Array.isArray(assistSource.targets) ? assistSource.targets : []).slice(0, MAX_TARGETS)) {
      const target = cleanText(raw?.target, 64) || 'default';
      const key = target.toLocaleLowerCase();
      if (usedTargets.has(key)) continue;
      const actions = (Array.isArray(raw?.actions) ? raw.actions : [])
        .slice(0, MAX_ACTIONS).map((value) => cleanText(value, 96)).filter(Boolean);
      if (!actions.length) continue;
      const nextIndexValue = Number(raw?.nextIndex);
      const nextIndex = Number.isFinite(nextIndexValue)
        ? Math.max(0, Math.min(actions.length - 1, Math.trunc(nextIndexValue)))
        : 0;
      targets.push({ target, actions, nextIndex });
      usedTargets.add(key);
    }

    return {
      schema: Math.max(1, Math.trunc(Number(source.schema) || 1)),
      combo: {
        activeProfile: cleanText(comboSource.activeProfile, 64),
        active,
        profiles,
        actions: (Array.isArray(comboSource.actions) ? comboSource.actions : [])
          .slice(0, MAX_ACTIONS).map(normalizedAction).filter(Boolean),
        profileCount: Math.max(profiles.length, Math.trunc(Number(comboSource.profileCount) || 0)),
        profilesTruncated: comboSource.profilesTruncated === true
      },
      groupassist: {
        summary: cleanText(assistSource.summary, 400),
        targets,
        available: (Array.isArray(assistSource.available) ? assistSource.available : [])
          .slice(0, MAX_GROUPASSIST_OPTIONS)
          .map(normalizedGroupAssistOption)
          .filter(Boolean),
        actions: (Array.isArray(assistSource.actions) ? assistSource.actions : [])
          .slice(0, MAX_ACTIONS).map(normalizedAction).filter(Boolean),
        targetCount: Math.max(targets.length, Math.trunc(Number(assistSource.targetCount) || 0)),
        targetsTruncated: assistSource.targetsTruncated === true
      },
      path: {
        actions: (Array.isArray(pathSource.actions) ? pathSource.actions : [])
          .slice(0, MAX_ACTIONS).map(normalizedAction).filter(Boolean)
      }
    };
  }

  function normalizeSemanticReference(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    const type = cleanId(source.type).toLocaleLowerCase();
    if (!type || type === 'raw' || !SEMANTIC_TYPE_IDS.has(type)) return null;
    const id = cleanId(source.id);
    if (!id) return null;
    return { type, id };
  }

  function profileCommand(profile) {
    return profile?.name ? `combo load ${profile.name}` : '';
  }

  function groupassistCommand(target) {
    if (!target?.target || !Array.isArray(target.actions) || !target.actions.length) return '';
    return `groupassist ${target.target} ${target.actions.join(' ')}`;
  }

  function findCaseInsensitive(records, field, id) {
    const needle = cleanId(id).toLocaleLowerCase();
    if (!needle) return null;
    return records.find((record) => cleanId(record?.[field]).toLocaleLowerCase() === needle) || null;
  }

  function resolveSemanticReference(referenceInput, snapshotInput = {}) {
    const reference = normalizeSemanticReference(referenceInput);
    if (!reference) return null;
    const snapshot = normalizeControlsSnapshot(snapshotInput);

    if (reference.type === 'combo-profile') {
      const profile = findCaseInsensitive(snapshot.combo.profiles, 'name', reference.id);
      if (!profile) {
        return {
          ...reference,
          available: false,
          label: `Combo profile: ${reference.id}`,
          reason: `Combo profile “${reference.id}” is not available for this character.`,
          command: ''
        };
      }
      return {
        ...reference,
        id: profile.name,
        available: true,
        label: `Combo profile: ${profile.name}`,
        detail: profile.skills.map((skill) => skill.name).join(' > '),
        command: profileCommand(profile)
      };
    }

    if (reference.type === 'groupassist-rotation') {
      const target = findCaseInsensitive(snapshot.groupassist.targets, 'target', reference.id);
      if (!target) {
        return {
          ...reference,
          available: false,
          label: `GroupAssist rotation: ${reference.id}`,
          reason: `GroupAssist rotation for “${reference.id}” is not available for this character.`,
          command: ''
        };
      }
      return {
        ...reference,
        id: target.target,
        available: true,
        label: `GroupAssist rotation: ${target.target}`,
        detail: target.actions.join(' > '),
        command: groupassistCommand(target)
      };
    }

    if (reference.type === 'path-action') {
      const action = findCaseInsensitive(snapshot.path.actions, 'id', reference.id);
      if (!action) {
        return {
          ...reference,
          available: false,
          label: `Path control: ${reference.id}`,
          reason: `Path control “${reference.id}” is not available from the server.`,
          command: ''
        };
      }
      return {
        ...reference,
        id: action.id,
        available: true,
        label: action.label,
        detail: action.command,
        command: action.command
      };
    }

    return null;
  }

  function optionsForType(typeValue, snapshotInput = {}) {
    const type = cleanId(typeValue).toLocaleLowerCase();
    const snapshot = normalizeControlsSnapshot(snapshotInput);
    if (type === 'combo-profile') {
      return snapshot.combo.profiles.map((profile) => ({
        id: profile.name,
        label: profile.name,
        detail: profile.skills.map((skill) => skill.name).join(' > '),
        command: profileCommand(profile)
      }));
    }
    if (type === 'groupassist-rotation') {
      return snapshot.groupassist.targets.map((target) => ({
        id: target.target,
        label: target.target,
        detail: target.actions.join(' > '),
        command: groupassistCommand(target)
      }));
    }
    if (type === 'path-action') {
      return snapshot.path.actions.map((action) => ({
        id: action.id,
        label: action.label,
        detail: action.command,
        command: action.command
      }));
    }
    return [];
  }


  function normalizeControlRequest(input = {}) {
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    if (Number(source.schema) !== 1) return null;
    const id = Number(source.id);
    if (!Number.isSafeInteger(id) || id < 1) return null;
    const action = cleanId(source.action).toLocaleLowerCase();
    if (!CONTROL_REQUEST_ACTIONS.has(action)) return null;
    const rawArgs = source.args && typeof source.args === 'object' && !Array.isArray(source.args)
      ? source.args
      : {};
    return Object.freeze({
      schema: 1,
      id,
      action,
      args: Object.freeze({ value: cleanText(rawArgs.value, 96) })
    });
  }


  function normalizeServerScreenReaderFlag(value) {
    if (value === true || value === 1) return true;
    if (value === false || value === 0) return false;
    const text = cleanText(value, 16).toLocaleLowerCase();
    if (['true', 'on', 'yes', '1'].includes(text)) return true;
    if (['false', 'off', 'no', '0'].includes(text)) return false;
    return null;
  }

  function bindingKindLabel(referenceInput) {
    const reference = normalizeSemanticReference(referenceInput);
    if (!reference) return 'Custom command';
    const record = SEMANTIC_BINDING_TYPES.find((candidate) => candidate.id === reference.type);
    return record?.label || 'Server control';
  }

  return Object.freeze({
    SEMANTIC_BINDING_TYPES,
    CONTROL_REQUEST_ACTIONS,
    normalizeControlRequest,
    normalizeServerScreenReaderFlag,
    normalizeControlsSnapshot,
    normalizeSemanticReference,
    resolveSemanticReference,
    optionsForType,
    bindingKindLabel,
    profileCommand,
    groupassistCommand
  });
});
