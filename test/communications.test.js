'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CommunicationLineBuffer,
  channelIdsFromList,
  classifyLine,
  classifyPreparedLine,
  hasAnsiFormatting,
  messageFromGmcp,
  normalizeAnsiText,
  normalizeChannel,
  normalizeText,
  stripNukeFireFormatting,
  visibleChannels
} = require('../src/communications');

test('classifies only recognizable communication lines', () => {
  assert.equal(classifyLine("Mo gossips, 'Hello wasteland.'").channel, 'gossip');
  assert.equal(classifyLine("Rance tells the group, 'North.'").channel, 'group');
  assert.equal(classifyLine("Shai tells you, 'Ready.'").channel, 'tell');
  assert.equal(classifyLine('[Newbie] Vect: Where is recall?').channel, 'newbie');
  assert.equal(classifyLine("You congrat, 'Nice one!'").channel, 'grats');
  assert.equal(classifyLine("Caul congrats, 'Well done.'").channel, 'grats');
  assert.equal(classifyLine('[Auction] Caul: WTS scrap').channel, 'auction');
  assert.equal(classifyLine('[SSF] Prime: Found a safe room.').channel, 'ssf');
  assert.equal(classifyLine("You bonejack, 'Builder chat.'").channel, 'bonejack');
  assert.equal(classifyLine("Mo bonejacks, 'Builder reply.'").channel, 'bonejack');
  assert.equal(classifyLine("%     Mo bonejacks, 'Wrapped builder reply.'").channel, 'bonejack');
  assert.equal(classifyLine('[System] Reconnecting').channel, 'system');
  assert.equal(classifyLine('Technology Square [ Exits: north east ]'), null);
});



test('normalizes advertised and detected optional communication channels', () => {
  assert.equal(normalizeChannel('congrat'), 'grats');
  assert.equal(normalizeChannel('BJ'), 'bonejack');
  assert.equal(normalizeChannel('Solo Self Found'), 'ssf');
  assert.deepEqual(channelIdsFromList([
    { name: 'gossip' },
    { name: 'grats' },
    { name: 'ssf' },
    { command: 'gsay' },
    { name: 'unknown' }
  ]), ['gossip', 'grats', 'ssf', 'group']);

  assert.deepEqual(
    visibleChannels({
      advertisedChannels: [{ name: 'ssf' }],
      messages: [{ channel: 'bonejack' }]
    }).map((channel) => channel.id),
    ['all', 'gossip', 'newbie', 'group', 'tell', 'grats', 'auction', 'ssf', 'bonejack', 'system']
  );
  assert.deepEqual(
    visibleChannels({ advertisedChannels: [], messages: [] }).map((channel) => channel.id),
    ['all', 'gossip', 'newbie', 'group', 'tell', 'grats', 'auction', 'system']
  );
});

test('strips complete ANSI and C1 formatting before classifying messages', () => {
  const colored = "\u001b[0m\u001b[38;2;255;0;102mVit\u001b[0m " +
    "\u001b[38;2;0;0;153mgossips,\u001b[0m " +
    "\u001b[38;2;255;0;102m'test'\u001b[0m";
  assert.equal(normalizeText(colored), "Vit gossips, 'test'");
  assert.equal(normalizeText("\u009b33mMo gossips, 'hi'\u009b0m"), "Mo gossips, 'hi'");
  assert.deepEqual(classifyLine(colored), {
    channel: 'gossip',
    text: "Vit gossips, 'test'",
    ansiText: colored
  });
  assert.equal(normalizeAnsiText(colored), colored);
  assert.equal(hasAnsiFormatting(colored), true);
});


test('removes legacy NukeFire tab color tokens from structured sender names', () => {
  const coloredName = '\t+\tpaKhelt Deepforger\tn';
  assert.equal(stripNukeFireFormatting(coloredName), 'Khelt Deepforger');
  assert.equal(normalizeText(coloredName), 'Khelt Deepforger');
  assert.equal(normalizeAnsiText(coloredName), 'Khelt Deepforger');

  const message = messageFromGmcp({
    packageName: 'NukeFire.Comms.Message',
    body: {
      channel: 'gossip',
      sender: coloredName,
      text: "a Khelt Deepforger gossips, 'Stairs.'"
    }
  }, 5000);
  assert.equal(message.sender, 'Khelt Deepforger');
  assert.equal(message.text, "a Khelt Deepforger gossips, 'Stairs.'");
});

test('preserves only safe SGR color controls for styled rendering', () => {
  const input = "\u001b]8;;https://example.invalid\u0007" +
    "\u001b[38;2;255;0;102mPink\u001b[0m" +
    "\u001b[2J\u001b[H";
  const styled = normalizeAnsiText(input);
  assert.equal(styled, "\u001b[38;2;255;0;102mPink\u001b[0m");
  assert.equal(normalizeText(styled), 'Pink');
});

test('shared plain text rejects ordinary output before raw ANSI normalization while preserving styled communications', () => {
  const rawCombat = '\u001b[31mA mutant claws you for 4,200 damage.\u001b[0m';
  assert.equal(classifyPreparedLine(rawCombat, 'A mutant claws you for 4,200 damage.'), null);

  const rawGossip = "\u001b[38;2;255;0;102mMo\u001b[0m \u001b[34mgossips,\u001b[0m 'hello'";
  assert.deepEqual(classifyPreparedLine(rawGossip, "Mo gossips, 'hello'"), {
    channel: 'gossip',
    text: "Mo gossips, 'hello'",
    ansiText: rawGossip
  });
});

test('shared plain line buffering preserves split chunks and falls back safely when views disagree', () => {
  const buffer = new CommunicationLineBuffer();
  assert.deepEqual(buffer.push('\u001b[31mMo gos', 'Mo gos'), []);
  assert.deepEqual(buffer.push("\u001b[0msips, 'one'\nA normal room line\nShai tells", "sips, 'one'\nA normal room line\nShai tells"), [
    { channel: 'gossip', text: "Mo gossips, 'one'", ansiText: "\u001b[31mMo gos\u001b[0msips, 'one'" }
  ]);
  assert.deepEqual(buffer.push(" you, 'two'\n", " you, 'two'\n"), [
    { channel: 'tell', text: "Shai tells you, 'two'", ansiText: "Shai tells you, 'two'" }
  ]);
  assert.deepEqual(buffer.flush(), []);

  const mismatch = new CommunicationLineBuffer();
  assert.deepEqual(mismatch.push("Mo gossips, 'raw fallback'\n", "Mo gossips, 'raw fallback'"), [
    { channel: 'gossip', text: "Mo gossips, 'raw fallback'", ansiText: "Mo gossips, 'raw fallback'" }
  ]);
});

test('buffers split network chunks without duplicating completed lines', () => {
  const buffer = new CommunicationLineBuffer();
  assert.deepEqual(buffer.push('Mo gos'), []);
  assert.deepEqual(buffer.push("sips, 'one'\nA normal room line\nShai tells"), [
    { channel: 'gossip', text: "Mo gossips, 'one'", ansiText: "Mo gossips, 'one'" }
  ]);
  assert.deepEqual(buffer.push(" you, 'two'\n"), [
    { channel: 'tell', text: "Shai tells you, 'two'", ansiText: "Shai tells you, 'two'" }
  ]);
  assert.deepEqual(buffer.flush(), []);
});

test('normalizes GMCP Comm.Channel and NukeFire.Comms.Message packets', () => {
  assert.equal(normalizeChannel('GTELL'), 'group');
  assert.deepEqual(messageFromGmcp({
    packageName: 'Comm.Channel',
    body: { chan: 'gossip', player: 'Prime', msg: 'Hello', timestamp: 123 }
  }, 999), {
    channel: 'gossip',
    sender: 'Prime',
    text: 'Hello',
    ansiText: 'Hello',
    timestamp: 123000,
    source: 'gmcp'
  });
  assert.deepEqual(messageFromGmcp({
    packageName: 'NukeFire.Comms.Message',
    body: { channel: 'party', sender: 'Caul', text: 'Move north' }
  }, 5000), {
    channel: 'group',
    sender: 'Caul',
    text: 'Move north',
    ansiText: 'Move north',
    timestamp: 5000,
    source: 'gmcp'
  });
  assert.equal(messageFromGmcp({ packageName: 'Room.Info', body: {} }), null);
  assert.equal(messageFromGmcp({
    packageName: 'Comm.Channel',
    body: { chan: 'gossip', player: 'Prime', msg: 'Still visible in Communications' },
    gaggedCommunication: true
  }).text, 'Still visible in Communications');
});
