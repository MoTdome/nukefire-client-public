(function attachCommunications(root, factory) {
  const exported = factory();
  if (typeof module === 'object' && module.exports) module.exports = exported;
  if (root) root.NukeFireCommunications = exported;
})(typeof window !== 'undefined' ? window : globalThis, function createCommunications() {
  'use strict';

  const CHANNELS = Object.freeze([
    Object.freeze({ id: 'all', label: 'All', availability: 'always' }),
    Object.freeze({ id: 'gossip', label: 'Gossip', availability: 'always' }),
    Object.freeze({ id: 'newbie', label: 'Newbie', availability: 'always' }),
    Object.freeze({ id: 'group', label: 'Group', availability: 'always' }),
    Object.freeze({ id: 'tell', label: 'Tell', availability: 'always' }),
    Object.freeze({ id: 'grats', label: 'Grats', availability: 'always' }),
    Object.freeze({ id: 'auction', label: 'Auction', availability: 'always' }),
    Object.freeze({ id: 'ssf', label: 'SSF', availability: 'advertised' }),
    Object.freeze({ id: 'bonejack', label: 'Bonejack', availability: 'detected' }),
    Object.freeze({ id: 'skynet', label: 'Skynet', availability: 'detected' }),
    Object.freeze({ id: 'system', label: 'System', availability: 'always' })
  ]);

  const CHANNEL_IDS = new Set(CHANNELS.map((channel) => channel.id));

  const CHANNEL_ALIASES = new Map([
    ['all', 'all'],
    ['gossip', 'gossip'],
    ['gossips', 'gossip'],
    ['chat', 'gossip'],
    ['newbie', 'newbie'],
    ['newbies', 'newbie'],
    ['newcomer', 'newbie'],
    ['newcomers', 'newbie'],
    ['group', 'group'],
    ['groupsay', 'group'],
    ['gsay', 'group'],
    ['gtell', 'group'],
    ['party', 'group'],
    ['tell', 'tell'],
    ['tells', 'tell'],
    ['private', 'tell'],
    ['pm', 'tell'],
    ['telepath', 'tell'],
    ['telepaths', 'tell'],
    ['grat', 'grats'],
    ['grats', 'grats'],
    ['gratz', 'grats'],
    ['congrat', 'grats'],
    ['congrats', 'grats'],
    ['congratulate', 'grats'],
    ['congratulates', 'grats'],
    ['congratulations', 'grats'],
    ['auction', 'auction'],
    ['auctions', 'auction'],
    ['market', 'auction'],
    ['ssf', 'ssf'],
    ['soloselffound', 'ssf'],
    ['bonejack', 'bonejack'],
    ['bonejacks', 'bonejack'],
    ['bj', 'bonejack'],
    ['skynet', 'skynet'],
    ['system', 'system']
  ]);

  // The raw text fallback supports many historical client/server formats, but
  // ordinary combat lines should not pay every channel regex.  When callers
  // already have ANSI-free source text, one cheap hint scan rejects the vast
  // majority of non-communication output before any raw ANSI normalization.
  const COMMUNICATION_HINT_RE = /tell|telepath|group|party|newbie|newcomer|grat|congrat|auction|market|ssf|bonejack|\bbj\b|gossip|chat|skynet|system/iu;

  function normalizeChannel(value, fallback = '') {
    const clean = String(value || '')
      .normalize('NFKC')
      .trim()
      .toLocaleLowerCase()
      .replace(/[^a-z0-9_-]+/gu, '');
    const normalized = CHANNEL_ALIASES.get(clean) || clean;
    return CHANNEL_IDS.has(normalized) ? normalized : fallback;
  }

  function channelIdsFromList(value) {
    const source = Array.isArray(value)
      ? value
      : (Array.isArray(value?.channels) ? value.channels : []);
    const result = [];

    for (const entry of source) {
      const candidate = typeof entry === 'string'
        ? entry
        : entry?.name ?? entry?.id ?? entry?.channel ?? entry?.command;
      const channel = normalizeChannel(candidate, '');
      if (!channel || channel === 'all' || result.includes(channel)) continue;
      result.push(channel);
    }

    return result;
  }

  function visibleChannels(options = {}) {
    const advertised = new Set(channelIdsFromList(options.advertisedChannels));
    const detected = new Set(
      (Array.isArray(options.messages) ? options.messages : [])
        .map((message) => normalizeChannel(message?.channel, ''))
        .filter(Boolean)
    );

    return CHANNELS.filter((channel) => {
      if (channel.availability === 'always') return true;
      if (channel.availability === 'advertised') {
        return advertised.has(channel.id) || detected.has(channel.id);
      }
      return detected.has(channel.id) || advertised.has(channel.id);
    });
  }

  function stripNukeFireFormatting(value) {
    return String(value || '')
      // NukeFire's legacy color language uses a literal TAB introducer. Keep
      // these game-side tokens out of the Communications copy when structured
      // GMCP fields contain colorized NPC names (for example TAB+, TABpa, and
      // TABn) rather than already-rendered ANSI.
      .replace(/\t(?:\[[a-z][0-9]{3}\]|[a-z]{1,2}|[+\-*/!_])/giu, '');
  }

  function stripTerminalFormatting(value) {
    return stripNukeFireFormatting(value)
      // OSC sequences, terminated by BEL or ST.
      .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/gu, '')
      // Standard 7-bit CSI sequences such as ESC[38;2;255;0;102m.
      .replace(/\x1b\[[0-?]*[ -/]*[@-~]/gu, '')
      // 8-bit CSI form, occasionally emitted by terminal libraries.
      .replace(/\u009b[0-?]*[ -/]*[@-~]/gu, '');
  }

  function normalizeAnsiText(value) {
    return stripNukeFireFormatting(value)
      .replaceAll('\r', '')
      // Communications may contain OSC titles or hyperlinks. They are not
      // useful inside a message body and should never be carried forward.
      .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/gu, '')
      // Convert 8-bit SGR to the 7-bit form understood by the shared parser;
      // discard every other C1 CSI operation.
      .replace(/\u009b([0-?]*[ -/]*)([@-~])/gu, (_match, parameters, finalByte) =>
        finalByte === 'm' ? `\x1b[${parameters}${finalByte}` : ''
      )
      // Preserve only Select Graphic Rendition. Cursor movement, erasing,
      // device queries, and similar terminal controls do not belong here.
      .replace(/\x1b\[([0-?]*[ -/]*)([@-~])/gu, (sequence, _parameters, finalByte) =>
        finalByte === 'm' ? sequence : ''
      )
      .replace(/\x1b(?!\[)/gu, '')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001a\u001c-\u001f\u007f]/gu, '')
      .trim();
  }

  function normalizeText(value) {
    return stripTerminalFormatting(value)
      .replaceAll('\r', '')
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu, '')
      .trim();
  }

  function hasAnsiFormatting(value) {
    return /\x1b\[[0-?]*[ -/]*m/u.test(String(value || ''));
  }

  function classifyNormalizedText(text) {
    if (!text || !COMMUNICATION_HINT_RE.test(text)) return '';

    const rules = [
      ['tell', [
        /^\s*(?:\[\s*tell\s*\](?:\s|$)|tell\s*[:>\-])/iu,
        /\b(?:tells? you|you tell|telepaths? to you|you telepath)\b/iu
      ]],
      ['group', [
        /^\s*(?:\[\s*(?:group|party)\s*\](?:\s|$)|(?:group|party)\s*[:>\-])/iu,
        /\btells? (?:the )?(?:group|party)\b/iu,
        /\bgroup[- ]?say(?:s)?\b/iu
      ]],
      ['newbie', [
        /^\s*(?:\[\s*(?:newbie|newcomer)\s*\](?:\s|$)|(?:newbie|newcomer)(?:\s+channel)?\s*[:>\-])/iu,
        /\b(?:newbie|newcomer)\s+(?:says?|asks?|chats?)\b/iu
      ]],
      ['grats', [
        /^\s*(?:\[\s*(?:grats?|gratz|congrat(?:s|ulations)?)\s*\](?:\s|$)|(?:grats?|gratz|congrat(?:s|ulations)?)\s*[:>\-])/iu,
        /^\s*(?:you|[^\s,]+)\s+congrat(?:s|ulate|ulates)?,\s*['"]/iu
      ]],
      ['auction', [
        /^\s*(?:\[\s*(?:auction|market)\s*\](?:\s|$)|(?:auction|market)\s*[:>\-])/iu,
        /\bauctions?\b/iu
      ]],
      ['ssf', [
        /^\s*\[\s*ssf\s*\]\s*(?:[^:]+:\s*)?/iu,
        /^\s*ssf(?:\s+channel)?\s*[:>\-]/iu
      ]],
      ['bonejack', [
        /^\s*(?:\[\s*(?:bonejack|bj)\s*\](?:\s|$)|(?:bonejack|bj)\s*[:>\-])/iu,
        /^\s*(?:%+\s*)?(?:you|[^\s,]+)\s+bonejacks?,\s*['"]/iu
      ]],
      ['gossip', [
        /^\s*(?:\[\s*(?:gossip|chat)\s*\](?:\s|$)|(?:gossip|chat)\s*[:>\-])/iu,
        /\bgossips?\b/iu
      ]],
      ['skynet', [
        /^\s*(?:\(\s*skynet\s*\)|\[\s*skynet\b[^\]]*\](?:\s|$)|skynet\s*[:>\-])/iu
      ]],
      ['system', [
        /^\s*(?:\[\s*system\s*\](?:\s|$)|system\s*[:>\-])/iu
      ]]
    ];

    for (const [channel, patterns] of rules) {
      if (patterns.some((pattern) => pattern.test(text))) return channel;
    }
    return '';
  }

  function classifyPreparedLine(rawValue, plainValue) {
    const candidate = String(plainValue || '').replaceAll('\r', '');
    const channel = classifyNormalizedText(candidate);
    if (!channel) return null;

    // Pay the complete sanitization cost only for a line that can actually be
    // retained by Communications.  The already-parsed source text is the
    // authoritative plain representation for classification.
    const text = normalizeText(candidate);
    if (!text) return null;
    return { channel, text, ansiText: normalizeAnsiText(rawValue) };
  }

  function classifyLine(value) {
    const ansiText = normalizeAnsiText(value);
    const text = normalizeText(ansiText);
    const channel = classifyNormalizedText(text);
    return channel ? { channel, text, ansiText } : null;
  }

  function parseTimestamp(value, now = Date.now()) {
    if (value === undefined || value === null || value === '') return now;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    }
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : now;
  }

  function messageFromGmcp(message = {}, now = Date.now()) {
    const packageName = String(message.packageName || message.package || '').trim().toLocaleLowerCase();
    if (packageName !== 'comm.channel' && packageName !== 'nukefire.comms.message') return null;

    const body = message.body && typeof message.body === 'object' && !Array.isArray(message.body)
      ? message.body
      : {};
    const channel = normalizeChannel(
      body.channel ?? body.chan ?? body.type ?? body.kind,
      ''
    );
    if (!channel || channel === 'all') return null;

    const sender = normalizeText(body.sender ?? body.player ?? body.from ?? body.name);
    const ansiText = normalizeAnsiText(body.text ?? body.msg ?? body.message ?? body.body);
    const text = normalizeText(ansiText);
    if (!text) return null;

    return {
      channel,
      sender,
      text,
      ansiText,
      timestamp: parseTimestamp(body.timestamp ?? body.time ?? body.ts, now),
      source: 'gmcp'
    };
  }

  class CommunicationLineBuffer {
    constructor(options = {}) {
      this.maxCarry = Math.max(256, Number(options.maxCarry) || 8192);
      this.carry = '';
      this.plainCarry = '';
      this.sharedPlain = false;
    }

    reset() {
      this.carry = '';
      this.plainCarry = '';
      this.sharedPlain = false;
    }

    push(value, plainValue) {
      const normalized = String(value || '').replaceAll('\r', '');
      if (plainValue === undefined) {
        const parts = `${this.carry}${normalized}`.split('\n');
        this.carry = parts.pop() || '';
        if (this.carry.length > this.maxCarry) this.carry = this.carry.slice(-this.maxCarry);
        this.plainCarry = '';
        this.sharedPlain = false;
        return parts.map(classifyLine).filter(Boolean);
      }

      const normalizedPlain = String(plainValue || '').replaceAll('\r', '');
      const rawParts = `${this.carry}${normalized}`.split('\n');
      const plainParts = `${this.plainCarry}${normalizedPlain}`.split('\n');
      this.carry = rawParts.pop() || '';
      this.plainCarry = plainParts.pop() || '';
      this.sharedPlain = true;
      if (this.carry.length > this.maxCarry) this.carry = this.carry.slice(-this.maxCarry);
      if (this.plainCarry.length > this.maxCarry) this.plainCarry = this.plainCarry.slice(-this.maxCarry);

      // ANSI parsing preserves ordinary line boundaries.  If malformed control
      // data ever makes the two views disagree, take the established raw path
      // for this batch rather than risking a false classification.
      if (rawParts.length !== plainParts.length) {
        this.plainCarry = normalizeText(this.carry);
        return rawParts.map(classifyLine).filter(Boolean);
      }
      const results = [];
      for (let index = 0; index < rawParts.length; index += 1) {
        const result = classifyPreparedLine(rawParts[index], plainParts[index]);
        if (result) results.push(result);
      }
      return results;
    }

    flush() {
      const result = this.sharedPlain
        ? classifyPreparedLine(this.carry, this.plainCarry)
        : classifyLine(this.carry);
      this.carry = '';
      this.plainCarry = '';
      this.sharedPlain = false;
      return result ? [result] : [];
    }
  }

  return {
    CHANNELS,
    CommunicationLineBuffer,
    channelIdsFromList,
    classifyLine,
    classifyPreparedLine,
    messageFromGmcp,
    hasAnsiFormatting,
    normalizeAnsiText,
    normalizeChannel,
    normalizeText,
    parseTimestamp,
    stripNukeFireFormatting,
    stripTerminalFormatting,
    visibleChannels
  };
});
