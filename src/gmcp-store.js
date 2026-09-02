(function attachGmcpStore(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireGmcpStore = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createGmcpStoreApi() {
  'use strict';

  const KNOWN_PACKAGES = new Map([
    ['core.hello', 'Core.Hello'],
    ['core.supports.set', 'Core.Supports.Set'],
    ['core.supports.add', 'Core.Supports.Add'],
    ['core.supports.remove', 'Core.Supports.Remove'],
    ['core.ping', 'Core.Ping'],
    ['core.keepalive', 'Core.KeepAlive'],
    ['char.vitals', 'Char.Vitals'],
    ['char.status', 'Char.Status'],
    ['char.statusvars', 'Char.StatusVars'],
    ['char.maxstats', 'Char.MaxStats'],
    ['char.gps', 'Char.GPS'],
    ['char.targetaffects', 'Char.TargetAffects'],
    ['room.info', 'Room.Info'],
    ['comm.channel', 'Comm.Channel'],
    ['comm.channel.list', 'Comm.Channel.List'],
    ['nukefire.comms.message', 'NukeFire.Comms.Message'],
    ['nukefire.gps.catalog.begin', 'NukeFire.GPS.Catalog.Begin'],
    ['nukefire.gps.catalog.page', 'NukeFire.GPS.Catalog.Page'],
    ['nukefire.gps.catalog.end', 'NukeFire.GPS.Catalog.End'],
    ['nukefire.map.local', 'NukeFire.Map.Local'],
    ['nukefire.context', 'NukeFire.Context'],
    ['nukefire.controls', 'NukeFire.Controls'],
    ['nukefire.controls.request', 'NukeFire.Controls.Request'],
    ['nukefire.combat', 'NukeFire.Combat'],
    ['nukefire.affects', 'NukeFire.Affects'],
    ['nukefire.mob.info', 'NukeFire.Mob.Info'],
    ['nukefire.loot.event', 'NukeFire.Loot.Event'],
    ['nukefire.sound.event', 'NukeFire.Sound.Event'],
    ['nukefire.foundlist.info', 'NukeFire.Foundlist.Info'],
    ['nukefire.knowledge.results', 'NukeFire.Knowledge.Results'],
    ['nukefire.knowledge.entry', 'NukeFire.Knowledge.Entry'],
    ['nukefire.knowledge.error', 'NukeFire.Knowledge.Error'],
    ['group', 'Group'],
    ['group.remove', 'Group.Remove']
  ]);

  const STATE_PATHS = new Map([
    ['Char.Vitals', ['char', 'vitals']],
    ['Char.Status', ['char', 'status']],
    ['Char.StatusVars', ['char', 'statusVars']],
    ['Char.MaxStats', ['char', 'maxStats']],
    ['Char.GPS', ['char', 'gps']],
    ['Char.TargetAffects', ['char', 'targetAffects']],
    ['Room.Info', ['room', 'info']],
    ['NukeFire.Map.Local', ['map', 'local']],
    ['NukeFire.Context', ['context', 'state']],
    ['NukeFire.Controls', ['controls', 'state']],
    ['NukeFire.Affects', ['affects', 'state']],
    ['NukeFire.Mob.Info', ['mob', 'info']],
    ['NukeFire.Foundlist.Info', ['foundlist', 'info']],
    ['NukeFire.Knowledge.Results', ['knowledge', 'results']],
    ['NukeFire.Knowledge.Entry', ['knowledge', 'entry']],
    ['NukeFire.Knowledge.Error', ['knowledge', 'error']],
    ['Comm.Channel.List', ['comm', 'channels']],
    ['Group', ['group']]
  ]);

  const DERIVED_VALUE_PACKAGES = new Set([
    'Group.Remove',
    'NukeFire.GPS.Catalog.Begin',
    'NukeFire.GPS.Catalog.Page',
    'NukeFire.GPS.Catalog.End'
  ]);

  // Event-stream packages are intentionally not retained in the state tree.
  // They are consumed from the one per-packet event and then become eligible
  // for garbage collection; only normal bounded protocol metadata advances.
  const EPHEMERAL_PACKAGES = new Set([
    'NukeFire.Combat',
    'NukeFire.Controls.Request',
    'NukeFire.Loot.Event',
    'NukeFire.Sound.Event'
  ]);

  const COMBAT_COUNT_MAX = 1_000_000;
  const COMBAT_WINDOW_MAX_MS = 5_000;

  function boundedCombatInteger(value, maximum = COMBAT_COUNT_MAX) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, Math.min(maximum, Math.trunc(numeric)));
  }

  function normalizeCombatSide(side = {}) {
    const source = side && typeof side === 'object' && !Array.isArray(side) ? side : {};
    return {
      hits: boundedCombatInteger(source.hits),
      misses: boundedCombatInteger(source.misses),
      damage: boundedCombatInteger(source.damage, Number.MAX_SAFE_INTEGER),
      criticals: boundedCombatInteger(source.criticals),
      kills: boundedCombatInteger(source.kills),
      deaths: boundedCombatInteger(source.deaths)
    };
  }

  function normalizeCombatSummary(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    if (Number(body.schema) !== 1) return null;
    return {
      schema: 1,
      window_ms: Math.max(1, Math.min(
        COMBAT_WINDOW_MAX_MS,
        boundedCombatInteger(body.window_ms, COMBAT_WINDOW_MAX_MS) || 200
      )),
      out: normalizeCombatSide(body.out),
      in: normalizeCombatSide(body.in)
    };
  }

  function cloneJson(value) {
    if (value === undefined) return undefined;
    if (value === null || typeof value !== 'object') return value;
    return JSON.parse(JSON.stringify(value));
  }

  function canonicalPackageName(packageName) {
    const clean = String(packageName || '').trim();
    if (!clean) return '';
    return KNOWN_PACKAGES.get(clean.toLowerCase()) || clean;
  }

  function finiteInteger(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
  }

  function cleanCatalogText(value, maximum = 240) {
    return String(value ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/gu, ' ')
      .replace(/\s+/gu, ' ').trim().slice(0, maximum);
  }

  function normalizeGpsDestination(input = {}) {
    const index = finiteInteger(input.index, 0);
    const room = finiteInteger(input.room, 0);
    const name = cleanCatalogText(input.name, 160);
    if (index <= 0 || room <= 0 || !name) return null;

    return {
      index,
      room,
      name,
      category: cleanCatalogText(input.category, 100) || 'Other Destinations',
      difficulty: cleanCatalogText(input.difficulty, 160),
      zone: Math.max(0, finiteInteger(input.zone, 0)),
      aliases: cleanCatalogText(input.aliases, 500),
      tags: cleanCatalogText(input.tags, 500),
      available: input.available !== false
    };
  }

  function emptyGpsCatalog(input = {}) {
    return {
      version: Math.max(1, finiteInteger(input.version, 1)),
      count: Math.max(0, finiteInteger(input.count, 0)),
      pages: Math.max(0, finiteInteger(input.pages, 0)),
      received: 0,
      complete: false,
      items: []
    };
  }

  function mergeGpsCatalogPage(catalog, input = {}) {
    const version = Math.max(1, finiteInteger(input.version, catalog?.version || 1));
    const current = catalog && catalog.version === version ? catalog : emptyGpsCatalog(input);
    current.version = version;
    current.count = Math.max(current.count, finiteInteger(input.count, 0));
    current.pages = Math.max(current.pages, finiteInteger(input.pages, 0));

    const byIndex = new Map(current.items.map((item) => [item.index, item]));
    const source = Array.isArray(input.destinations) ? input.destinations : [];
    for (const raw of source.slice(0, 100)) {
      const destination = normalizeGpsDestination(raw);
      if (destination) byIndex.set(destination.index, destination);
    }
    current.items = [...byIndex.values()].sort((left, right) => left.index - right.index).slice(0, 500);
    current.received = current.items.length;
    current.complete = false;
    return current;
  }

  function initialState() {
    return {
      core: {},
      char: {
        vitals: null,
        status: null,
        statusVars: null,
        maxStats: null,
        gps: null,
        targetAffects: null
      },
      room: { info: null },
      map: { local: null },
      gps: { catalog: emptyGpsCatalog() },
      context: { state: null },
      controls: { state: null },
      affects: { state: null },
      mob: { info: null },
      knowledge: { results: null, entry: null, error: null },
      comm: { channel: null, channels: [], history: [] },
      group: null,
      extras: {},
      meta: { messageCount: 0, lastPackage: '', lastOriginalPackage: '' }
    };
  }

  function setPath(target, path, value) {
    if (!target || !Array.isArray(path) || path.length === 0) return;
    let cursor = target;
    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
      cursor = cursor[key];
    }
    cursor[path.at(-1)] = value;
  }

  function getPath(target, path) {
    let cursor = target;
    for (const key of path || []) {
      if (!cursor || typeof cursor !== 'object') return undefined;
      cursor = cursor[key];
    }
    return cursor;
  }

  function applyEventPatch(snapshot, event = {}) {
    const target = snapshot && typeof snapshot === 'object' ? snapshot : initialState();
    const path = Array.isArray(event.path) ? event.path : null;
    if (path?.length) {
      const value = Object.prototype.hasOwnProperty.call(event, 'value')
        ? event.value
        : event.body;
      setPath(target, path, value);
    }
    target.meta ||= { messageCount: 0, lastPackage: '', lastOriginalPackage: '' };
    if (Number.isFinite(Number(event.messageCount))) {
      target.meta.messageCount = Math.max(0, Math.trunc(Number(event.messageCount)));
    } else {
      target.meta.messageCount = Math.max(0, Number(target.meta.messageCount) || 0) + 1;
    }
    target.meta.lastPackage = String(event.packageName || '');
    target.meta.lastOriginalPackage = String(event.originalPackageName || event.packageName || '');
    return target;
  }

  class GmcpStore {
    constructor(options = {}) {
      this.maxChannelHistory = Math.max(1, Number(options.maxChannelHistory) || 200);
      this.includeStateInEvents = options.includeStateInEvents !== false;
      this.reset();
    }

    reset() {
      this.state = initialState();
      return this.snapshot();
    }

    apply(message = {}) {
      const originalPackageName = String(message.packageName || '').trim();
      const packageName = canonicalPackageName(originalPackageName);
      const body = packageName === 'NukeFire.Combat'
        ? normalizeCombatSummary(message.body)
        : cloneJson(message.body);
      const rawBody = String(message.rawBody || '');

      if (!packageName) {
        const event = {
          packageName: '', originalPackageName, body, rawBody,
          path: null, messageCount: this.state.meta.messageCount
        };
        if (this.includeStateInEvents) event.state = this.snapshot();
        return event;
      }

      this.state.meta.messageCount += 1;
      this.state.meta.lastPackage = packageName;
      this.state.meta.lastOriginalPackage = originalPackageName;

      let path = STATE_PATHS.get(packageName) || null;

      if (path) {
        setPath(this.state, path, body);
      } else if (EPHEMERAL_PACKAGES.has(packageName)) {
        // Do not retain transient event packets in extras or any history.
        path = null;
      } else if (packageName === 'Comm.Channel' || packageName === 'NukeFire.Comms.Message') {
        this.state.comm.channel = body;
        this.state.comm.history.push(body);
        if (this.state.comm.history.length > this.maxChannelHistory) {
          this.state.comm.history.splice(0, this.state.comm.history.length - this.maxChannelHistory);
        }
        path = ['comm', 'channel'];
      } else if (packageName === 'Group.Remove') {
        this.removeGroupMember(body?.name);
        path = ['group'];
      } else if (packageName === 'NukeFire.GPS.Catalog.Begin') {
        this.state.gps.catalog = emptyGpsCatalog(body);
        path = ['gps', 'catalog'];
      } else if (packageName === 'NukeFire.GPS.Catalog.Page') {
        this.state.gps.catalog = mergeGpsCatalogPage(this.state.gps.catalog, body);
        path = ['gps', 'catalog'];
      } else if (packageName === 'NukeFire.GPS.Catalog.End') {
        const catalog = this.state.gps.catalog || emptyGpsCatalog(body);
        catalog.version = Math.max(1, finiteInteger(body?.version, catalog.version));
        catalog.count = Math.max(catalog.count, finiteInteger(body?.count, 0), catalog.items.length);
        catalog.pages = Math.max(catalog.pages, finiteInteger(body?.pages, 0));
        catalog.received = catalog.items.length;
        catalog.complete = true;
        this.state.gps.catalog = catalog;
        path = ['gps', 'catalog'];
      } else if (packageName.startsWith('Core.')) {
        const key = packageName.slice('Core.'.length);
        this.state.core[key] = body;
        path = ['core', key];
      } else {
        this.state.extras[packageName] = body;
        path = ['extras', packageName];
      }

      const event = {
        packageName,
        originalPackageName,
        body,
        rawBody,
        path,
        messageCount: this.state.meta.messageCount
      };
      if (EPHEMERAL_PACKAGES.has(packageName)) {
        event.ephemeral = true;
        if (!body) event.ignored = true;
      }
      if (DERIVED_VALUE_PACKAGES.has(packageName) && path) {
        event.value = cloneJson(getPath(this.state, path));
      }
      if (this.includeStateInEvents) event.state = this.snapshot();
      return event;
    }

    removeGroupMember(name) {
      if (!this.state.group || !Array.isArray(this.state.group.members)) return;
      const cleanName = String(name || '').trim().toLocaleLowerCase();
      if (!cleanName) return;
      this.state.group.members = this.state.group.members.filter((member) =>
        String(member?.name || '').trim().toLocaleLowerCase() !== cleanName
      );
      this.state.group.count = this.state.group.members.length;
    }

    snapshot() {
      return cloneJson(this.state);
    }
  }

  return {
    GmcpStore,
    applyEventPatch,
    canonicalPackageName,
    initialState,
    normalizeGpsDestination,
    normalizeCombatSummary
  };
});
