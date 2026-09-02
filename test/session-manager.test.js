'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SessionManager,
  SessionCommandQueue,
  tokenizeBraced,
  DEFAULT_SEND_INTERVAL_MS,
  DEFAULT_MAX_REPEAT_COMMANDS,
  DEFAULT_MAX_DELAY_SECONDS,
  DEFAULT_MAX_LOOP_ITERATIONS,
  DEFAULT_MAX_COMMAND_LINE_COMMANDS,
  DEFAULT_MAX_LOCAL_DISPLAY_CHARACTERS
} = require('../src/session-manager');

class FakeConnection {
  constructor(handlers) {
    this.handlers = handlers;
    this.sent = [];
    this.gmcp = [];
    this.status = 'disconnected';
    this.terminalSize = { width: 120, height: 40 };
    this.preferences = {};
  }

  async connect(host, port) {
    this.status = 'connected';
    this.handlers.onStatus?.({ state: 'connected', message: `Connected to ${host}:${port}`, host, port });
  }

  disconnect(message = 'Disconnected') {
    this.status = 'disconnected';
    this.handlers.onStatus?.({ state: 'disconnected', message });
  }

  sendCommand(command) {
    if (this.status !== 'connected') return false;
    this.sent.push(command);
    return true;
  }

  sendGmcp(packageName, body) {
    this.gmcp.push({ packageName, body });
    return true;
  }

  setTerminalSize(width, height) {
    this.terminalSize = { width, height };
    return true;
  }

  setClientPreferences(preferences) {
    this.preferences = { ...this.preferences, ...preferences };
    return { ...this.preferences };
  }
}

function managerWithImmediateQueues(options = {}) {
  const connections = new Map();
  const manager = new SessionManager({
    ...options,
    connectionFactory: (handlers) => {
      const connection = new FakeConnection(handlers);
      const originalCreate = connections.size;
      connections.set(`connection-${originalCreate}`, connection);
      return connection;
    },
    queueOptions: { intervalMs: 0 }
  });
  return { manager, connections };
}

test('tokenizes brace-aware session commands', () => {
  assert.deepEqual(
    tokenizeBraced('{crew one} {Tank Healer} scout'),
    ['crew one', 'Tank Healer', 'scout']
  );
  assert.deepEqual(tokenizeBraced('add "My Healer" support'), ['add', 'My Healer', 'support']);
});


test('uses a selected prefix for management, routing, and literal-prefix escapes', async () => {
  const { manager } = managerWithImmediateQueues({ commandPrefix: '~' });
  const caul = manager.createSession({ name: 'Caul', role: 'tank' });
  const shai = manager.createSession({ name: 'Shai', role: 'healer' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(caul.id, '~alias {healme} {~Shai heal %1}');
  assert.deepEqual(result.messages, ['Defined alias healme: ~Shai heal %1']);
  result = manager.dispatchInput(caul.id, 'healme Caul');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.sessionId), [shai.id]);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['heal Caul']);

  result = manager.dispatchInput(caul.id, '~all score');
  assert.equal(result.deliveries.length, 2);
  result = manager.dispatchInput(caul.id, '~~help');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['~help']);

  result = manager.dispatchInput(caul.id, '#alias');
  assert.equal(result.handled, false);
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['#alias']);
  assert.equal(result.snapshot.commandPrefix, '~');

  manager.restore({ commandPrefix: '^' });
  assert.equal(manager.snapshot().commandPrefix, '^');
  assert.deepEqual(manager.dispatchInput(caul.id, '^alias').messages, ['[global] healme = ~Shai heal %1 [priority 5]']);
});


test('command line batches send ordinary commands through the normal pipeline in order', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  const result = manager.dispatchInput(main.id, 'e;bash goblin;flee');
  assert.equal(result.handled, false);
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['e', 'bash goblin', 'flee']);
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, ['e', 'bash goblin', 'flee']);
});

test('command line batching respects braces, quotes, escaped semicolons, and definitions created earlier in the line', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(main.id, '#alias {combo} {e;bash goblin;flee};combo');
  assert.deepEqual(result.messages, ['Defined alias combo: e;bash goblin;flee']);
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['e', 'bash goblin', 'flee']);

  result = manager.dispatchInput(main.id, 'say Reactor stable\\; for now;say "red; blue";score');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), [
    'say Reactor stable; for now',
    'say "red; blue"',
    'score'
  ]);
});

test('command line batches mix client commands with server commands and follow an activated session', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({
    commandPrefix: '~',
    handlers: { onEvent: (event) => events.push(event) }
  });
  const caul = manager.createSession({ name: 'Caul' });
  const shai = manager.createSession({ name: 'Shai' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(caul.id, '~showme {Ready; now};look');
  assert.deepEqual(result.deliveries.map((delivery) => [delivery.sessionId, delivery.command]), [[caul.id, 'look']]);
  assert.equal(events.some((event) => event.sessionId === caul.id && event.type === 'local-text' && /Ready; now/u.test(event.payload)), true);

  result = manager.dispatchInput(caul.id, '~Shai;heal');
  assert.equal(result.activateSessionId, shai.id);
  assert.deepEqual(result.deliveries.map((delivery) => [delivery.sessionId, delivery.command]), [[shai.id, 'heal']]);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['heal']);

  result = manager.dispatchInput(caul.id, '~all say hello\\; everyone;score');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), [
    'say hello; everyone',
    'say hello; everyone',
    'score'
  ]);
});

test('invalid or oversized command line batches execute nothing', async () => {
  const { manager } = managerWithImmediateQueues({ maxCommandLineCommands: 3 });
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(main.id, 'look;#showme {broken');
  assert.deepEqual(result.messages, ['Command line has an unterminated brace.']);
  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, []);

  result = manager.dispatchInput(main.id, 'north;south;east;west');
  assert.deepEqual(result.messages, ['Command line may contain at most 3 commands.']);
  assert.deepEqual(result.deliveries, []);
  assert.equal(DEFAULT_MAX_COMMAND_LINE_COMMANDS, 32);
});

test('client #help lists commands and provides prefix-aware topic details', () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ id: 'main', name: 'Main' });

  let result = manager.dispatchInput(main.id, '#help');
  assert.equal(result.handled, true);
  assert.deepEqual(result.deliveries, []);
  assert.match(result.messages.join('\n'), /NukeFire client commands/u);
  assert.match(result.messages.join('\n'), /#alias\/#aliases/u);
  assert.match(result.messages.join('\n'), /#link <number>/u);
  assert.match(result.messages.join('\n'), /separate up to 32 top-level commands with ;/u);

  result = manager.dispatchInput(main.id, '#help alias');
  assert.match(result.messages[0], /^#alias —/u);
  assert.match(result.messages.join('\n'), /#unalias \{name\}/u);

  result = manager.dispatchInput(main.id, '#help nowhere');
  assert.deepEqual(result.messages, [
    'No client help topic for "nowhere".',
    'Use #help to list available client commands.'
  ]);
});


test('showme and show display local text without network delivery and honor the selected prefix', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({
    commandPrefix: '~',
    handlers: { onEvent: (event) => events.push(event) }
  });
  const caul = manager.createSession({ name: 'Caul' });

  let result = manager.dispatchInput(caul.id, '~showme {Reactor stable.}');
  assert.equal(result.handled, true);
  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(events.filter((event) => event.type === 'local-text').map((event) => event.payload), [
    'Reactor stable.\n'
  ]);
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, []);

  result = manager.dispatchInput(caul.id, '~show {Still local.}');
  assert.deepEqual(result.deliveries, []);
  assert.equal(events.findLast((event) => event.type === 'local-text').payload, 'Still local.\n');

  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  result = manager.dispatchInput(caul.id, '~~showme {server literal}');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['~showme {server literal}']);
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['~showme {server literal}']);
});


test('showme expands variables once and remains available through aliases, repeats, loops, and delays', () => {
  const events = [];
  const timers = [];
  const { manager } = managerWithImmediateQueues({
    handlers: { onEvent: (event) => events.push(event) },
    delaySetTimer: (callback) => {
      timers.push(callback);
      return callback;
    },
    delayClearTimer: () => {}
  });
  const caul = manager.createSession({ name: 'Caul' });

  manager.dispatchInput(caul.id, '#variable {target} {old mutant}');
  manager.dispatchInput(caul.id, '#alias {warn} {#showme {Target: %target}}');
  manager.dispatchInput(caul.id, 'warn');
  manager.dispatchInput(caul.id, '#2 #showme {Again}');
  manager.dispatchInput(caul.id, '#loop {1} {2} {step} {#showme {Step %step}}');
  manager.dispatchInput(caul.id, '#delay {.01} {#showme {Delayed %target}}');
  assert.equal(timers.length, 1);
  timers[0]();

  assert.deepEqual(events.filter((event) => event.type === 'local-text').map((event) => event.payload), [
    'Target: old mutant\n',
    'Again\n',
    'Again\n',
    'Step 1\n',
    'Step 2\n',
    'Delayed old mutant\n'
  ]);
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, []);
});


test('showme output can trigger actions and action-generated showme remains local', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#action {Warning: low} {#showme {HEAL NOW}}');
  manager.dispatchInput(caul.id, '#action {HEAL NOW} {say healing}');
  const result = manager.dispatchInput(caul.id, '#showme {Warning: low}');

  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(events.filter((event) => event.type === 'local-text').map((event) => event.payload), [
    'Warning: low\n',
    'HEAL NOW\n'
  ]);
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['say healing']);
  const actionResults = events.filter((event) => event.type === 'action-result');
  assert.equal(actionResults.length, 2);
  assert.ok(actionResults.every((event) => event.payload.messages.length === 0));
});


test('showme accepts legacy positioning as a display-only compatibility form and strips terminal controls', () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const caul = manager.createSession({ name: 'Caul' });

  let result = manager.dispatchInput(caul.id, '#showme {Pinned text} {1} {1}');
  assert.deepEqual(result.messages, []);
  assert.equal(events.findLast((event) => event.type === 'local-text').payload, 'Pinned text\n');

  const oversized = `Safe\u001b]8;;https://unsafe.test\u0007${'x'.repeat(DEFAULT_MAX_LOCAL_DISPLAY_CHARACTERS + 50)}`;
  result = manager.dispatchInput(caul.id, `#showme {${oversized}}`);
  assert.deepEqual(result.messages, []);
  const payload = events.findLast((event) => event.type === 'local-text').payload;
  assert.equal(payload.includes('\u001b'), false);
  assert.equal(payload.includes('\u0007'), false);
  assert.equal(payload.length, DEFAULT_MAX_LOCAL_DISPLAY_CHARACTERS + 1);
});

test('client help follows a customized command prefix', () => {
  const { manager } = managerWithImmediateQueues({ commandPrefix: '~' });
  const main = manager.createSession({ id: 'main', name: 'Main' });
  const result = manager.dispatchInput(main.id, '~help sessions');

  assert.match(result.messages[0], /^~session —/u);
  assert.match(result.messages.join('\n'), /~session \{name\} \{host\} \{port\}/u);
  assert.match(result.messages.join('\n'), /Related names: ~sessions/u);
});

test('repeats a numbered client command through aliases and normal routing', async () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul', role: 'tank' });
  const shai = manager.createSession({ name: 'Shai', role: 'healer' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(caul.id, '#10 smile');
  assert.equal(result.handled, true);
  assert.equal(result.deliveries.length, 10);
  assert.deepEqual(
    manager.sessions.get(caul.id).connection.sent,
    Array.from({ length: 10 }, () => 'smile')
  );

  manager.dispatchInput(caul.id, '#alias {cheer} {#Shai smile at %1}');
  result = manager.dispatchInput(caul.id, '#3 cheer Caul');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.sessionId), [shai.id, shai.id, shai.id]);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, [
    'smile at Caul',
    'smile at Caul',
    'smile at Caul'
  ]);
});

test('bounds numbered repetition and preserves doubled-prefix literal commands', async () => {
  const { manager } = managerWithImmediateQueues({ commandPrefix: '~' });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(caul.id, '~0 smile');
  assert.deepEqual(result.messages, [`Repeat count must be between 1 and ${DEFAULT_MAX_REPEAT_COMMANDS}.`]);
  assert.deepEqual(result.deliveries, []);

  result = manager.dispatchInput(caul.id, `~${DEFAULT_MAX_REPEAT_COMMANDS + 1} smile`);
  assert.deepEqual(result.messages, [`Repeat count must be between 1 and ${DEFAULT_MAX_REPEAT_COMMANDS}.`]);
  assert.deepEqual(result.deliveries, []);

  result = manager.dispatchInput(caul.id, '~10');
  assert.deepEqual(result.messages, ['Usage: ~10 <command>']);
  assert.deepEqual(result.deliveries, []);

  result = manager.dispatchInput(caul.id, '~~10 smile');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['~10 smile']);
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['~10 smile']);
});


test('runs TinTin-style ascending and descending loops with a named counter variable', async () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(caul.id, '#loop {1} {3} {round} {say %round;emote $round.cycle}');
  assert.deepEqual(result.messages, []);
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, [
    'say 1', 'emote 1.cycle',
    'say 2', 'emote 2.cycle',
    'say 3', 'emote 3.cycle'
  ]);
  assert.equal(result.snapshot.variables.find((record) => record.name === 'round')?.value, '3');

  result = manager.dispatchInput(caul.id, '#loop 3 1 step {drop $step.key}');
  assert.deepEqual(result.messages, []);
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent.slice(-3), [
    'drop 3.key',
    'drop 2.key',
    'drop 1.key'
  ]);
  assert.equal(result.snapshot.variables.find((record) => record.name === 'step')?.value, '1');
});

test('loop commands use aliases, variables, and normal session routing on every iteration', async () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });
  const shai = manager.createSession({ name: 'Shai' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#variable {target} {Caul}');
  manager.dispatchInput(shai.id, '#variable {target} {Shai}');
  manager.dispatchInput(caul.id, '#alias {announce} {#Shai say %1 to %target}');
  const result = manager.dispatchInput(caul.id, '#loop {1} {3} {count} {announce $count}');

  assert.deepEqual(result.deliveries.map((delivery) => delivery.sessionId), [shai.id, shai.id, shai.id]);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, [
    'say 1 to Shai',
    'say 2 to Shai',
    'say 3 to Shai'
  ]);
});

test('bounds loop expansion, blocks nested repeat multiplication, and honors the selected prefix', async () => {
  const { manager } = managerWithImmediateQueues({ commandPrefix: '~', maxLoopIterations: 3 });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(caul.id, '~loop {1} {4} {i} {smile}');
  assert.deepEqual(result.messages, ['Loop may contain at most 3 iterations.']);
  assert.deepEqual(result.deliveries, []);

  result = manager.dispatchInput(caul.id, '~loop {1.5} {3} {i} {smile}');
  assert.deepEqual(result.messages, ['Loop start and finish must be whole numbers.']);

  result = manager.dispatchInput(caul.id, '~loop {1} {2} {0bad} {smile}');
  assert.deepEqual(result.messages, ['Loop variable names must begin with a letter and may use letters, numbers, underscores, or hyphens.']);

  result = manager.dispatchInput(caul.id, '~loop {1} {2} {i} {~3 smile}');
  assert.deepEqual(result.messages, [
    'Nested repeat directives are not allowed.',
    'Nested repeat directives are not allowed.'
  ]);
  assert.deepEqual(result.deliveries, []);

  result = manager.dispatchInput(caul.id, '~~loop {1} {2} {i} {smile}');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['~loop {1} {2} {i} {smile}']);

  result = manager.dispatchInput(caul.id, '~loop {1} {2} {i}');
  assert.deepEqual(result.messages, ['Usage: ~loop {start} {finish} {variable} {commands}']);
  assert.equal(DEFAULT_MAX_LOOP_ITERATIONS >= 3, true);
});

test('schedules TinTin-style delayed commands through the live command pipeline', async () => {
  const timers = [];
  const events = [];
  const { manager } = managerWithImmediateQueues({
    handlers: { onEvent: (event) => events.push(event) },
    delaySetTimer: (callback, milliseconds) => {
      const timer = { callback, milliseconds };
      timers.push(timer);
      return timer;
    },
    delayClearTimer: () => {}
  });
  const caul = manager.createSession({ name: 'Caul' });
  const shai = manager.createSession({ name: 'Shai' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });

  const result = manager.dispatchInput(caul.id, '#delay {0.25} {#Shai smile at Caul}');
  assert.equal(result.deliveries.length, 0);
  assert.deepEqual(result.messages, ['Delay scheduled in 0.25 seconds: #Shai smile at Caul']);
  assert.equal(timers.length, 1);
  assert.equal(timers[0].milliseconds, 250);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, []);

  timers[0].callback();
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['smile at Caul']);
  const delayedEvent = events.find((event) => event.type === 'action-result' && event.payload?.pattern === '#delay');
  assert.deepEqual(delayedEvent.payload.deliveries.map((delivery) => delivery.command), ['smile at Caul']);
});

test('delayed command lists preserve order and resolve aliases and variables when they fire', async () => {
  const timers = [];
  const { manager } = managerWithImmediateQueues({
    delaySetTimer: (callback, milliseconds) => {
      const timer = { callback, milliseconds };
      timers.push(timer);
      return timer;
    },
    delayClearTimer: () => {}
  });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#alias {greet} {smile at %1}');
  manager.dispatchInput(caul.id, '#variable {target} {Shai}');
  let result = manager.dispatchInput(caul.id, '#delay 1 {greet %target;look}');
  assert.deepEqual(result.messages, ['Delay scheduled in 1 second: greet %target; look']);

  manager.dispatchInput(caul.id, '#variable {target} {Vect}');
  timers[0].callback();
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['smile at Vect', 'look']);

  result = manager.dispatchInput(caul.id, '#delay 1 {say Reactor stable\\; for now;score}');
  assert.deepEqual(result.messages, ['Delay scheduled in 1 second: say Reactor stable; for now; score']);
  timers[1].callback();
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, [
    'smile at Vect',
    'look',
    'say Reactor stable; for now',
    'score'
  ]);
});

test('bounds pending delays and cancels them when the session disconnects', async () => {
  const timers = [];
  const cleared = [];
  const { manager } = managerWithImmediateQueues({
    maxPendingDelays: 1,
    delaySetTimer: (callback, milliseconds) => {
      const timer = { callback, milliseconds };
      timers.push(timer);
      return timer;
    },
    delayClearTimer: (timer) => cleared.push(timer)
  });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  assert.deepEqual(
    manager.dispatchInput(caul.id, '#delay 0 smile').messages,
    [`Delay must be between 0.01 and ${DEFAULT_MAX_DELAY_SECONDS} seconds.`]
  );
  assert.deepEqual(
    manager.dispatchInput(caul.id, `#delay ${DEFAULT_MAX_DELAY_SECONDS + 1} smile`).messages,
    [`Delay must be between 0.01 and ${DEFAULT_MAX_DELAY_SECONDS} seconds.`]
  );
  assert.deepEqual(
    manager.dispatchInput(caul.id, '#delay 1 smile').messages,
    ['Delay scheduled in 1 second: smile']
  );
  assert.deepEqual(
    manager.dispatchInput(caul.id, '#delay 2 look').messages,
    ['Delay limit reached: at most 1 pending delays per session.']
  );

  manager.disconnectSession(caul.id);
  assert.deepEqual(cleared, [timers[0]]);
  assert.equal(manager.sessions.get(caul.id).delays.size, 0);
});

test('delay uses the selected client prefix and keeps doubled-prefix commands literal', async () => {
  const timers = [];
  const { manager } = managerWithImmediateQueues({
    commandPrefix: '~',
    delaySetTimer: (callback, milliseconds) => {
      const timer = { callback, milliseconds };
      timers.push(timer);
      return timer;
    },
    delayClearTimer: () => {}
  });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(caul.id, '~delay {.01} {~~help}');
  assert.deepEqual(result.messages, ['Delay scheduled in 0.01 seconds: ~~help']);
  assert.equal(timers[0].milliseconds, 10);
  timers[0].callback();
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['~help']);

  result = manager.dispatchInput(caul.id, '~delay 1');
  assert.deepEqual(result.messages, ['Unknown delay: 1.']);
});

test('keeps independent connections and routes #name and #all commands', async () => {
  const { manager } = managerWithImmediateQueues();
  const tank = manager.createSession({ name: 'Tank', role: 'tank' });
  const healer = manager.createSession({ name: 'Healer', role: 'healer' });
  await manager.connectSession(tank.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(healer.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(tank.id, '#healer heal Tank');
  assert.equal(result.deliveries.length, 1);
  assert.equal(result.deliveries[0].sessionId, healer.id);
  assert.deepEqual(manager.sessions.get(healer.id).connection.sent, ['heal Tank']);

  result = manager.dispatchInput(tank.id, '#all score');
  assert.equal(result.deliveries.length, 2);
  assert.deepEqual(manager.sessions.get(tank.id).connection.sent, ['score']);
  assert.deepEqual(manager.sessions.get(healer.id).connection.sent, ['heal Tank', 'score']);
});

test('bare #character switches tabs and #character command uses that character pipeline', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main Window' });
  const second = manager.createSession({ name: 'Second Window' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(second.id, { host: 'mud.test', port: 4000 });
  manager.sessions.get(second.id).connection.handlers.onGmcp?.({
    state: { char: { status: { name: 'Prime' } } }
  });
  manager.dispatchInput(main.id, '#alias {readyup} {say main-ready}');
  manager.dispatchInput(second.id, '#alias {readyup} {stand;score}');

  let result = manager.dispatchInput(main.id, '#prime');
  assert.equal(result.activateSessionId, second.id);
  assert.equal(manager.activeSessionId, second.id);
  assert.deepEqual(result.messages, ['Active session: Second Window.']);

  result = manager.dispatchInput(main.id, '#prime readyup');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['stand', 'score']);
  assert.deepEqual(manager.sessions.get(second.id).connection.sent, ['stand', 'score']);
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, []);
});

test('defines a crew, leader, and follower routing without sending to the tank', async () => {
  const { manager } = managerWithImmediateQueues();
  const tank = manager.createSession({ name: 'Caul', role: 'tank' });
  const healer = manager.createSession({ name: 'Shai', role: 'healer' });
  const damage = manager.createSession({ name: 'Vect', role: 'damage' });
  for (const session of [tank, healer, damage]) {
    await manager.connectSession(session.id, { host: 'mud.test', port: 4000 });
  }

  let result = manager.dispatchInput(tank.id, '#group {crew} {Caul Shai Vect}');
  assert.match(result.messages[0], /Group crew/);
  result = manager.dispatchInput(tank.id, '#leader {crew} {Caul}');
  assert.match(result.messages[0], /leader of crew/);
  result = manager.dispatchInput(tank.id, '#followers assist mutant');

  assert.deepEqual(result.deliveries.map((delivery) => delivery.sessionId).sort(), [damage.id, healer.id].sort());
  assert.deepEqual(manager.sessions.get(tank.id).connection.sent, []);
  assert.deepEqual(manager.sessions.get(healer.id).connection.sent, ['assist mutant']);
  assert.deepEqual(manager.sessions.get(damage.id).connection.sent, ['assist mutant']);
});

test('restores saved session definitions and group metadata without auto-connecting', () => {
  const { manager } = managerWithImmediateQueues();
  manager.createSession({ id: 'main', name: 'Main' });
  const snapshot = manager.restore({
    activeSessionId: 'healer',
    sessions: [
      { id: 'tank', name: 'Tank', role: 'tank', host: 'mud.test', port: 4000 },
      { id: 'healer', name: 'Healer', role: 'healer', host: 'mud.test', port: 4000 }
    ],
    groups: {
      crew: { name: 'crew', members: ['tank', 'healer'], leader: 'tank' }
    }
  });

  assert.equal(snapshot.activeSessionId, 'healer');
  assert.equal(snapshot.sessions.length, 2);
  assert.equal(snapshot.groups.crew.leader, 'tank');
  assert.ok(snapshot.sessions.every((session) => session.status.state === 'disconnected'));
});

test('default command queue has no artificial inter-command delay', () => {
  assert.equal(DEFAULT_SEND_INTERVAL_MS, 0);
  const sent = [];
  let timers = 0;
  const queue = new SessionCommandQueue((command) => sent.push(command), {
    maxPending: 200,
    setTimer: () => {
      timers += 1;
      throw new Error('default zero-delay queue must not schedule a timer');
    }
  });

  assert.equal(queue.enqueueBatch(Array.from({ length: 20 }, () => 'e'), { source: 'speedwalk' }), true);
  assert.equal(sent.length, 20);
  assert.deepEqual(sent, Array.from({ length: 20 }, () => 'e'));
  assert.equal(queue.countSource('speedwalk'), 0);
  assert.equal(timers, 0);
});

test('command queue enforces a bounded pending list', () => {
  const sent = [];
  const timers = [];
  const queue = new SessionCommandQueue((command) => sent.push(command), {
    intervalMs: 50,
    maxPending: 2,
    setTimer: (callback) => {
      timers.push(callback);
      return timers.length;
    },
    clearTimer: () => {}
  });

  assert.equal(queue.enqueue('one'), true);
  assert.equal(queue.enqueue('two'), true);
  assert.equal(queue.enqueue('three'), true);
  assert.equal(queue.enqueue('four'), false);
  assert.deepEqual(sent, ['one']);
  timers.shift()();
  assert.deepEqual(sent, ['one', 'two']);
  timers.shift()();
  assert.deepEqual(sent, ['one', 'two', 'three']);
});

test('manages aliases through brace-aware text commands', () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul', role: 'tank' });

  let result = manager.dispatchInput(caul.id, '#alias');
  assert.deepEqual(result.messages, ['No aliases are defined.']);

  result = manager.dispatchInput(caul.id, '#alias {ga} {#followers assist %1}');
  assert.deepEqual(result.messages, ['Defined alias ga: #followers assist %1']);

  manager.dispatchInput(caul.id, '#alias {crewheal} {#Shai heal %1}');
  manager.dispatchInput(caul.id, '#alias {movecrew} {#crew %0}');

  result = manager.dispatchInput(caul.id, '#alias list');
  assert.deepEqual(result.messages, [
    '[global] crewheal = #Shai heal %1 [priority 5]',
    '[global] ga = #followers assist %1 [priority 5]',
    '[global] movecrew = #crew %0 [priority 5]'
  ]);

  result = manager.dispatchInput(caul.id, '#alias show {ga}');
  assert.deepEqual(result.messages, ['[global] ga = #followers assist %1 [priority 5]']);

  result = manager.dispatchInput(caul.id, '#alias delete {ga}');
  assert.deepEqual(result.messages, ['Deleted alias ga.']);
  assert.deepEqual(manager.dispatchInput(caul.id, '#alias show {ga}').messages, ['Unknown alias: ga.']);
});

test('expands requested aliases through existing session and group queues', async () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul', role: 'tank' });
  const shai = manager.createSession({ name: 'Shai', role: 'healer' });
  const vect = manager.createSession({ name: 'Vect', role: 'damage' });
  const lift = manager.createSession({ name: 'Lift', role: 'damage' });
  for (const session of [caul, shai, vect, lift]) {
    await manager.connectSession(session.id, { host: 'mud.test', port: 4000 });
  }

  manager.dispatchInput(caul.id, '#group {crew} {Caul Shai Vect Lift}');
  manager.dispatchInput(caul.id, '#leader {crew} {Caul}');
  manager.dispatchInput(caul.id, '#alias {ga} {#followers assist %1}');
  manager.dispatchInput(caul.id, '#alias {crewheal} {#Shai heal %1}');
  manager.dispatchInput(caul.id, '#alias {movecrew} {#crew %0}');

  let result = manager.dispatchInput(caul.id, 'ga mutant');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.sessionId).sort(), [shai.id, vect.id, lift.id].sort());
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, []);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['assist mutant']);
  assert.deepEqual(manager.sessions.get(vect.id).connection.sent, ['assist mutant']);
  assert.deepEqual(manager.sessions.get(lift.id).connection.sent, ['assist mutant']);

  result = manager.dispatchInput(caul.id, 'crewheal Caul');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.sessionId), [shai.id]);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['assist mutant', 'heal Caul']);

  result = manager.dispatchInput(caul.id, 'movecrew north');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.sessionId).sort(), [caul.id, shai.id, vect.id, lift.id].sort());
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['north']);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['assist mutant', 'heal Caul', 'north']);

  manager.dispatchInput(caul.id, '#alias {kk} {smile;look;score}');
  manager.dispatchInput(caul.id, '#alias {announce} {say Reactor stable\\; for now;look}');
  manager.dispatchInput(caul.id, '#alias {safe} {say %0;score}');
  result = manager.dispatchInput(caul.id, 'kk');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['smile', 'look', 'score']);
  manager.dispatchInput(caul.id, 'announce');
  manager.dispatchInput(caul.id, 'safe {steady;quit}');
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, [
    'north', 'smile', 'look', 'score', 'say Reactor stable; for now', 'look',
    'say steady;quit', 'score'
  ]);
});

test('alias failures send nothing and protected command behavior remains intact', async () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#alias {a} {b}');
  manager.dispatchInput(caul.id, '#alias {b} {a}');
  let result = manager.dispatchInput(caul.id, 'a');
  assert.equal(result.deliveries.length, 0);
  assert.match(result.messages[0], /recursive loop/u);
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, []);

  result = manager.dispatchInput(caul.id, '');
  assert.equal(result.deliveries[0].command, '');
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['']);

  result = manager.dispatchInput(caul.id, '##help');
  assert.equal(result.deliveries[0].command, '#help');
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['', '#help']);

  result = manager.dispatchInput(caul.id, 'ordinary command');
  assert.equal(result.handled, false);
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['', '#help', 'ordinary command']);
});

test('ordinary Alias bursts bypass the paced Speedwalk queue', async () => {
  const timers = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: {
      intervalMs: 50,
      maxPending: 1,
      setTimer: (callback) => {
        timers.push(callback);
        return timers.length;
      },
      clearTimer: () => {}
    }
  });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(caul.id, '#alias {fast} {smile;look;score}');

  const result = manager.dispatchInput(caul.id, 'fast');
  assert.ok(result.deliveries.every((delivery) => delivery.queued));
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['smile', 'look', 'score']);
  assert.equal(manager.sessions.get(caul.id).queue.size, 0);
  assert.deepEqual(timers, []);
});

test('restores global aliases without connecting or sending commands', async () => {
  const { manager } = managerWithImmediateQueues();
  manager.createSession({ id: 'main', name: 'Main' });

  const restored = manager.restore({
    activeSessionId: 'main',
    sessions: [
      { id: 'main', name: 'Main', role: 'tank', host: 'mud.test', port: 4000 }
    ],
    groups: {},
    aliases: [
      { name: 'GA', body: '#followers assist %1', scope: 'session' },
      { name: 'scoreme', body: 'score' }
    ]
  });

  assert.deepEqual(restored.aliases, [
    { name: 'ga', body: '#followers assist %1', priority: 5, scope: 'global' },
    { name: 'scoreme', body: 'score', priority: 5, scope: 'global' }
  ]);
  assert.equal(restored.sessions[0].status.state, 'disconnected');
  assert.deepEqual(manager.sessions.get('main').connection.sent, []);

  await manager.connectSession('main', { host: 'mud.test', port: 4000 });
  const result = manager.dispatchInput('main', 'scoreme');
  assert.equal(result.deliveries[0].queued, true);
  assert.deepEqual(manager.sessions.get('main').connection.sent, ['score']);
});

test('manages persistent actions through brace-aware text commands', () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });

  assert.deepEqual(manager.dispatchInput(caul.id, '#action').messages, ['No actions are defined.']);
  assert.deepEqual(
    manager.dispatchInput(caul.id, '#action {You are hungry.} {eat bread} {7}').messages,
    ['Defined action at priority 7: You are hungry.']
  );
  manager.dispatchInput(caul.id, '#action {The %1 attacks Shai!} {#Caul rescue Shai} {1}');

  assert.deepEqual(manager.dispatchInput(caul.id, '#action list').messages, [
    '[1] ON {The %1 attacks Shai!} => {#Caul rescue Shai}',
    '[7] ON {You are hungry.} => {eat bread}'
  ]);
  assert.deepEqual(manager.dispatchInput(caul.id, '#action disable {You are hungry.}').messages, [
    'Action disabled: You are hungry.'
  ]);
  assert.deepEqual(manager.dispatchInput(caul.id, '#actions off').messages, ['Actions disabled.']);
  assert.equal(manager.snapshot().actions.enabled, false);
  assert.equal(manager.snapshot().actions.definitions[1].enabled, false);
  assert.deepEqual(manager.dispatchInput(caul.id, '#action delete {You are hungry.}').messages, [
    'Deleted action: You are hungry.'
  ]);
});

test('fires one completed-line action through aliases and existing session queues', async () => {
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  const caul = manager.createSession({ name: 'Caul' });
  const shai = manager.createSession({ name: 'Shai' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#alias {healshai} {#Shai heal %1}');
  manager.dispatchInput(caul.id, '#action {%1 tells you \'heal %2\'} {healshai %2} {2}');

  manager.sessions.get(caul.id).connection.handlers.onText("Bob tells you 'heal Caul'");
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, []);
  manager.sessions.get(caul.id).connection.handlers.onText('\n');

  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['heal Caul']);
  const actionEvent = events.findLast((event) => event.type === 'action-result');
  assert.equal(actionEvent.payload.command, 'healshai Caul');
  assert.equal(actionEvent.payload.deliveries[0].sessionId, shai.id);
});

test('actions ignore partial lines, ANSI colors, disabled state, and secure input', async () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(caul.id, '#action {You are hungry.} {eat bread}');
  const connection = manager.sessions.get(caul.id).connection;

  connection.handlers.onText('\x1b[31mYou are');
  assert.deepEqual(connection.sent, []);
  connection.handlers.onText(' hungry.\x1b[0m\n');
  assert.deepEqual(connection.sent, ['eat bread']);

  manager.dispatchInput(caul.id, '#actions off');
  connection.handlers.onText('You are hungry.\n');
  assert.deepEqual(connection.sent, ['eat bread']);

  manager.dispatchInput(caul.id, '#actions on');
  connection.handlers.onEcho(true);
  connection.handlers.onText('You are hungry.\n');
  assert.deepEqual(connection.sent, ['eat bread']);
  connection.handlers.onEcho(false);
  connection.handlers.onText('You are hungry.\n');
  assert.deepEqual(connection.sent, ['eat bread', 'eat bread']);
});

test('actions block generated client-management commands but permit session routing', async () => {
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  const caul = manager.createSession({ name: 'Caul' });
  const shai = manager.createSession({ name: 'Shai' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#action {bad} {#alias {oops} {quit}} {1}');
  manager.dispatchInput(caul.id, '#alias {hiddenbad} {#actions off}');
  manager.dispatchInput(caul.id, '#action {aliasbad} {hiddenbad} {1}');
  manager.dispatchInput(caul.id, '#alias {hiddengag} {#gags off}');
  manager.dispatchInput(caul.id, '#action {gagbad} {hiddengag} {1}');
  manager.dispatchInput(caul.id, '#action {repeatbad} {#10 smile} {1}');
  manager.dispatchInput(caul.id, '#action {helpbad} {#help alias} {1}');
  manager.dispatchInput(caul.id, '#action {good} {#Shai score} {2}');
  const connection = manager.sessions.get(caul.id).connection;
  connection.handlers.onText('bad\n');
  connection.handlers.onText('aliasbad\n');
  connection.handlers.onText('gagbad\n');
  connection.handlers.onText('repeatbad\n');
  connection.handlers.onText('helpbad\n');
  connection.handlers.onText('good\n');

  assert.equal(manager.aliasEngine.get('oops'), null);
  assert.equal(manager.actionEngine.enabled, true);
  assert.equal(manager.gagEngine.enabled, true);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['score']);
  const blocked = events.filter((event) => event.type === 'action-result' && ['bad', 'aliasbad', 'gagbad', 'repeatbad', 'helpbad'].includes(event.payload.line));
  assert.equal(blocked.length, 5);
  assert.ok(blocked.every((event) => /client-management/u.test(event.payload.messages[0])));
});

test('action-generated delays preserve action safety when the timer fires', async () => {
  const timers = [];
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 },
    delaySetTimer: (callback, milliseconds) => {
      const timer = { callback, milliseconds };
      timers.push(timer);
      return timer;
    },
    delayClearTimer: () => {}
  });
  const caul = manager.createSession({ name: 'Caul' });
  const shai = manager.createSession({ name: 'Shai' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#action {delayedbad} {#delay {.01} {#alias {oops} {quit}}}');
  manager.dispatchInput(caul.id, '#action {delayedgood} {#delay {.01} {#Shai score}}');
  const connection = manager.sessions.get(caul.id).connection;
  connection.handlers.onText('delayedbad\n');
  connection.handlers.onText('delayedgood\n');
  assert.equal(timers.length, 2);

  timers[0].callback();
  timers[1].callback();
  assert.equal(manager.aliasEngine.get('oops'), null);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['score']);
  const blocked = events.findLast((event) => event.type === 'action-result' && event.payload?.pattern === '#delay' && event.payload.messages.length > 0);
  assert.match(blocked.payload.messages[0], /client-management/u);
});

test('restores action definitions without connecting or firing them', () => {
  const { manager } = managerWithImmediateQueues();
  manager.createSession({ id: 'main', name: 'Main' });
  const restored = manager.restore({
    sessions: [{ id: 'caul', name: 'Caul', host: 'mud.test', port: 4000 }],
    actions: {
      enabled: true,
      definitions: [{ pattern: 'Welcome.', command: 'look', priority: 5, enabled: true }]
    }
  });
  assert.equal(restored.actions.definitions[0].pattern, 'Welcome.');
  assert.equal(manager.sessions.get('caul').status.state, 'disconnected');
  assert.deepEqual(manager.sessions.get('caul').connection.sent, []);
});


test('multi-command actions run up to ten commands in order through aliases and routing', async () => {
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  const caul = manager.createSession({ name: 'Caul' });
  const shai = manager.createSession({ name: 'Shai' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#alias {checkshai} {#Shai score;#Shai look}');
  manager.dispatchInput(caul.id, '#action {gossips} {smile;look;checkshai;poke bob}');
  manager.sessions.get(caul.id).connection.handlers.onText("Rambo gossips, 'Hello'\n");

  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['smile', 'look', 'poke bob']);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['score', 'look']);
  const actionEvent = events.findLast((event) => event.type === 'action-result');
  assert.equal(actionEvent.payload.command, 'smile; look; checkshai; poke bob');
  assert.equal(actionEvent.payload.deliveries.length, 5);
});

test('Athos-sized local-state Actions can execute more than ten client-only updates without opening socket burst budget', () => {
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  const caul = manager.createSession({ name: 'Caul' });
  const body = Array.from({ length: 12 }, (_value, index) => `#var {stat${index}} {${index}}`).join(';');

  const defined = manager.dispatchInput(caul.id, `#action {stats burst} {${body}}`);
  assert.match(defined.messages[0], /Defined action/u);
  manager.sessions.get(caul.id).connection.handlers.onText('stats burst\n');

  for (let index = 0; index < 12; index += 1) {
    assert.equal(manager.sessions.get(caul.id).tintin.variableEngine.get(`stat${index}`).value, String(index));
  }
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, []);
  const actionEvent = events.findLast((event) => event.type === 'action-result');
  assert.ok(actionEvent);
  assert.equal(actionEvent.payload.deliveries.length, 0);
  assert.ok(actionEvent.payload.messages.every((message) => !/suppressed|blocked/u.test(message)));
});

test('multi-command actions validate the whole burst before sending any command', async () => {
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#action {unsafe burst} {smile;#actions off;look}');
  manager.sessions.get(caul.id).connection.handlers.onText('unsafe burst\n');

  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, []);
  assert.equal(manager.actionEngine.enabled, true);
  const actionEvent = events.findLast((event) => event.type === 'action-result');
  assert.match(actionEvent.payload.messages[0], /client-management/u);
});

test('action definitions preserve escaped literal semicolons', async () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#action {literal} {say hello\\; everyone;smile}');
  manager.sessions.get(caul.id).connection.handlers.onText('literal\n');
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['say hello; everyone', 'smile']);
});

test('manages persistent gags with braced and simple unbraced patterns', () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });

  assert.deepEqual(manager.dispatchInput(caul.id, '#gag').messages, ['No gags are defined.']);
  assert.deepEqual(manager.dispatchInput(caul.id, '#gag %1 gossips').messages, [
    'Defined gag: %1 gossips'
  ]);
  assert.deepEqual(manager.dispatchInput(caul.id, '#gag {auction channel}').messages, [
    'Defined gag: auction channel'
  ]);
  assert.deepEqual(manager.dispatchInput(caul.id, '#gag list').messages, [
    'ON {%1 gossips}',
    'ON {auction channel}'
  ]);
  assert.deepEqual(manager.dispatchInput(caul.id, '#gag disable {%1 gossips}').messages, [
    'Gag disabled: %1 gossips'
  ]);
  assert.deepEqual(manager.dispatchInput(caul.id, '#gags off').messages, ['Gags disabled.']);
  assert.equal(manager.snapshot().gags.enabled, false);
  assert.equal(manager.snapshot().gags.definitions[0].enabled, false);
  assert.deepEqual(manager.dispatchInput(caul.id, '#gag delete {auction channel}').messages, [
    'Deleted gag: auction channel'
  ]);
});

test('gags hide completed output while actions still fire and prompts still flush', async () => {
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(caul.id, '#action {gossips} {smile}');
  manager.dispatchInput(caul.id, '#gag %1 gossips');
  const connection = manager.sessions.get(caul.id).connection;

  connection.handlers.onGmcp({
    packageName: 'Comm.Channel',
    body: { chan: 'gossip', player: 'Rambo', msg: 'Hello' }
  });
  assert.equal(
    Object.hasOwn(events.findLast((event) => event.type === 'gmcp').payload, 'gaggedCommunication'),
    false
  );

  connection.handlers.onText("\x1b[32mRambo gos");
  connection.handlers.onText("sips, 'Hello'\x1b[0m\r\nVisible line\r\nPrompt> ");

  assert.deepEqual(connection.sent, ['smile']);
  assert.deepEqual(
    events.filter((event) => event.type === 'communication-text').map((event) => event.payload),
    ["\x1b[32mRambo gossips, 'Hello'\x1b[0m\r\n"]
  );
  assert.deepEqual(
    events.filter((event) => event.type === 'text').map((event) => event.payload),
    ['Visible line\r\n']
  );
  assert.equal(events.some((event) => event.type === 'action-result'), true);

  connection.handlers.onPromptBoundary({ type: 'ga' });
  assert.deepEqual(
    events.filter((event) => event.type === 'text').map((event) => event.payload),
    ['Visible line\r\n', 'Prompt> ']
  );
  assert.equal(events.at(-1).type, 'boundary');
});

test('restores gag definitions without connecting or suppressing future disabled output', async () => {
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  manager.createSession({ id: 'main', name: 'Main' });
  const restored = manager.restore({
    sessions: [{ id: 'main', name: 'Main', host: 'mud.test', port: 4000 }],
    gags: {
      enabled: false,
      definitions: [{ pattern: 'gossips', enabled: true, scope: 'session' }]
    }
  });

  assert.deepEqual(restored.gags, {
    enabled: false,
    definitions: [{ pattern: 'gossips', enabled: true, scope: 'global' }]
  });
  assert.equal(manager.sessions.get('main').status.state, 'disconnected');

  await manager.connectSession('main', { host: 'mud.test', port: 4000 });
  manager.sessions.get('main').connection.handlers.onText("Rambo gossips, 'Visible because gags are off'\n");
  assert.equal(
    events.findLast((event) => event.type === 'text').payload,
    "Rambo gossips, 'Visible because gags are off'\n"
  );
});

test('speedwalk defaults on and compact routes expand without setup', async () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  assert.deepEqual(manager.dispatchInput(caul.id, '#speedwalk status').messages, [
    'Speedwalk is ON. 0 pending steps for Caul.'
  ]);
  const result = manager.dispatchInput(caul.id, '4e3s');
  assert.equal(result.handled, true);
  assert.deepEqual(
    result.deliveries.map((delivery) => delivery.command),
    ['e', 'e', 'e', 'e', 's', 's', 's']
  );
  assert.deepEqual(
    manager.sessions.get(caul.id).connection.sent,
    ['e', 'e', 'e', 'e', 's', 's', 's']
  );

  const menuChoice = manager.dispatchInput(caul.id, '1');
  assert.equal(menuChoice.handled, false);
  assert.deepEqual(menuChoice.deliveries.map((delivery) => delivery.command), ['1']);
  assert.equal(menuChoice.messages.length, 0);
  assert.equal(manager.sessions.get(caul.id).connection.sent.at(-1), '1');

  const oneStep = manager.dispatchInput(caul.id, 'e');
  assert.equal(oneStep.handled, false);
  assert.deepEqual(oneStep.deliveries.map((delivery) => delivery.command), ['e']);
  assert.equal(oneStep.messages.length, 0);
  assert.equal(manager.sessions.get(caul.id).connection.sent.at(-1), 'e');

  const news = manager.dispatchInput(caul.id, 'News');
  assert.equal(news.handled, false);
  assert.deepEqual(news.deliveries.map((delivery) => delivery.command), ['News']);
  assert.equal(manager.sessions.get(caul.id).connection.sent.at(-1), 'News');
});

test('default speedwalk sends a 20-room route immediately without a full session snapshot', async () => {
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers)
  });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  const result = manager.dispatchInput(caul.id, '20e');
  assert.equal(result.handled, true);
  assert.equal(result.snapshot, null);
  assert.equal(result.deliveries.length, 20);
  assert.ok(result.deliveries.every((delivery) => delivery.source === 'speedwalk' && delivery.queued));
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, Array.from({ length: 20 }, () => 'e'));
  assert.equal(manager.sessions.get(caul.id).queue.countSource('speedwalk'), 0);
});

test('speedwalk expands compact routes into paced one-room commands', async () => {
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  assert.deepEqual(manager.dispatchInput(caul.id, '#speedwalk on').messages, [
    'Speedwalk enabled. Compact routes such as eeennnee and 4e3s19e will be sent one room at a time.'
  ]);
  const result = manager.dispatchInput(caul.id, '3e2n');
  assert.equal(result.handled, true);
  assert.equal(result.deliveries.length, 5);
  assert.ok(result.deliveries.every((delivery) => delivery.source === 'speedwalk' && delivery.queued));
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['e', 'e', 'e', 'n', 'n']);
  assert.deepEqual(
    events.filter((event) => event.type === 'speedwalk-step').map((event) => event.payload.command),
    ['e', 'e', 'e', 'n', 'n']
  );
});

test('aliases may expand into compact speedwalk routes', async () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#speedwalk on');
  manager.dispatchInput(caul.id, '#alias {bankrun} {2e3s}');
  const result = manager.dispatchInput(caul.id, 'bankrun');
  assert.equal(result.handled, true);
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['e', 'e', 's', 's', 's']);
});

test('a leading backslash sends an ambiguous direction word literally', async () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#speedwalk on');
  const result = manager.dispatchInput(caul.id, '\\news');
  assert.equal(result.handled, true);
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['news']);
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['news']);
});

test('invalid or oversized compact routes send nothing', async () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(caul.id, '#speedwalk on');

  for (const route of ['0e', '201e']) {
    const result = manager.dispatchInput(caul.id, route);
    assert.equal(result.handled, true);
    assert.deepEqual(result.deliveries, []);
    assert.ok(result.messages.length > 0);
  }
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, []);
});

test('speedwalk stop cancels only unsent route steps', async () => {
  const timers = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: {
      intervalMs: 50,
      maxPending: 200,
      setTimer: (callback) => {
        timers.push(callback);
        return timers.length;
      },
      clearTimer: () => {}
    }
  });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(caul.id, '#speedwalk on');

  manager.dispatchInput(caul.id, '5e');
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['e']);
  assert.equal(manager.sessions.get(caul.id).queue.countSource('speedwalk'), 4);
  assert.deepEqual(manager.dispatchInput(caul.id, '#speedwalk stop').messages, [
    'Speedwalk stopped for Caul; 4 pending steps cancelled.'
  ]);
  assert.equal(manager.sessions.get(caul.id).queue.countSource('speedwalk'), 0);
  timers.shift()();
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['e']);
});

test('manual commands interrupt pending speedwalk steps and remain responsive', async () => {
  const timers = [];
  const manager = new SessionManager({
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: {
      intervalMs: 50,
      setTimer: (callback) => {
        timers.push(callback);
        return timers.length;
      },
      clearTimer: () => {}
    }
  });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(caul.id, '#speedwalk on');
  manager.dispatchInput(caul.id, '4e');

  const result = manager.dispatchInput(caul.id, 'look');
  assert.match(result.messages[0], /Speedwalk interrupted/u);
  assert.equal(manager.sessions.get(caul.id).queue.countSource('speedwalk'), 0);
  timers.shift()();
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['e', 'look']);
});

test('speedwalk settings restore inertly and actions cannot control or expand routes', async () => {
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  manager.createSession({ id: 'main', name: 'Main' });
  const restored = manager.restore({
    sessions: [{ id: 'main', name: 'Main', host: 'mud.test', port: 4000 }],
    speedwalk: { enabled: true },
    actions: {
      enabled: true,
      definitions: [
        { pattern: 'walk now', command: '4e', priority: 5, enabled: true },
        { pattern: 'turn it off', command: '#speedwalk off', priority: 5, enabled: true }
      ]
    }
  });
  assert.deepEqual(restored.speedwalk, { enabled: true });
  assert.deepEqual(manager.sessions.get('main').connection.sent, []);

  await manager.connectSession('main', { host: 'mud.test', port: 4000 });
  const connection = manager.sessions.get('main').connection;
  connection.handlers.onText('walk now\nturn it off\n');
  assert.deepEqual(connection.sent, []);
  assert.equal(manager.speedwalkEnabled, true);
  const blocked = events.filter((event) => event.type === 'action-result');
  assert.equal(blocked.length, 2);
  assert.ok(blocked.every((event) => /blocked/i.test(event.payload.messages[0])));
});

test('manages global variables through text commands and snapshots', () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });

  assert.deepEqual(manager.dispatchInput(caul.id, '#variable').messages, ['No variables are defined.']);
  assert.deepEqual(manager.dispatchInput(caul.id, '#variable {target} {old mutant}').messages, [
    'Set variable target: old mutant'
  ]);
  assert.deepEqual(manager.dispatchInput(caul.id, '#variable {target}').messages, [
    '[global] target = old mutant'
  ]);
  assert.deepEqual(manager.dispatchInput(caul.id, '#variables').messages, [
    '[global] target = old mutant'
  ]);
  assert.deepEqual(manager.snapshot().variables, [
    { name: 'target', value: 'old mutant', scope: 'global' }
  ]);
  assert.deepEqual(manager.dispatchInput(caul.id, '#unvariable {target}').messages, [
    'Deleted variable target.'
  ]);
});

test('expands variables in direct commands, aliases, and session routing without command injection', async () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });
  const shai = manager.createSession({ name: 'Shai' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#variable {target} {old mutant}');
  manager.dispatchInput(shai.id, '#variable {target} {young mutant}');
  manager.dispatchInput(caul.id, '#variable {unsafe} {steady;quit}');
  manager.dispatchInput(caul.id, '#alias {kt} {kill %target;score}');
  manager.dispatchInput(caul.id, '#alias {safe} {say %unsafe;look}');

  manager.dispatchInput(caul.id, 'consider %target');
  manager.dispatchInput(caul.id, 'kt');
  manager.dispatchInput(caul.id, 'safe');
  manager.dispatchInput(caul.id, '#Shai assist %{target}');
  manager.dispatchInput(caul.id, 'say %%target');

  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, [
    'consider old mutant',
    'kill old mutant',
    'score',
    'say steady;quit',
    'look',
    'say %target'
  ]);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['assist young mutant']);
});


test('native dollar variables expand through direct, alias, routing, showme, and Action pipelines', async () => {
  const local = [];
  const { manager } = managerWithImmediateQueues({
    handlers: {
      onEvent: (event) => {
        if (event.type === 'local-text') local.push(String(event.payload || '').trimEnd());
      }
    }
  });
  const caul = manager.createSession({ name: 'Caul' });
  const shai = manager.createSession({ name: 'Shai' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });

  assert.deepEqual(manager.dispatchInput(caul.id, '#variable {target} {old mutant}').messages, ['Set variable target: old mutant']);
  assert.deepEqual(manager.dispatchInput(shai.id, '#variable {target} {young mutant}').messages, ['Set variable target: young mutant']);
  assert.deepEqual(manager.dispatchInput(caul.id, '#variable {cool website} {NukeFire home}').messages, ['Set variable cool website: NukeFire home']);
  manager.dispatchInput(caul.id, '#alias {strike} {bash $target}');
  manager.dispatchInput(caul.id, '#action {Target acquired: %1} {say %1;kill $target}');

  manager.dispatchInput(caul.id, 'look $target');
  manager.dispatchInput(caul.id, 'strike');
  manager.dispatchInput(caul.id, '#Shai assist $target');
  manager.dispatchInput(caul.id, '#showme {Visit ${cool website}; $$target stays literal}');
  manager.sessions.get(caul.id).connection.handlers.onText?.('Target acquired: nightmare\n');
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, ['look old mutant', 'bash old mutant', 'say nightmare', 'kill old mutant']);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['assist young mutant']);
  assert.deepEqual(local, ['Visit NukeFire home; $target stays literal']);
  assert.equal(manager.snapshot().variables.find((record) => record.name === 'target')?.value, 'old mutant');
});

test('actions expand variables after captures while preserving literal percent escapes', async () => {
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#variable {target} {old mutant}');
  manager.dispatchInput(caul.id, '#action {Target: %1} {kill %target;say %%target %1}');
  manager.sessions.get(caul.id).connection.handlers.onText('Target: wounded\n');

  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, [
    'kill old mutant',
    'say %target wounded'
  ]);
  const actionEvent = events.findLast((event) => event.type === 'action-result');
  assert.deepEqual(actionEvent.payload.deliveries.map((delivery) => delivery.command), [
    'kill old mutant',
    'say %target wounded'
  ]);
});

test('variable recursion and variable-generated management commands are blocked for actions', async () => {
  const events = [];
  const manager = new SessionManager({
    handlers: { onEvent: (event) => events.push(event) },
    connectionFactory: (handlers) => new FakeConnection(handlers),
    queueOptions: { intervalMs: 0 }
  });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#variable {a} {%b}');
  manager.dispatchInput(caul.id, '#variable {b} {%a}');
  let result = manager.dispatchInput(caul.id, 'say %a');
  assert.equal(result.deliveries.length, 0);
  assert.match(result.messages[0], /recursive loop/u);

  manager.dispatchInput(caul.id, '#variable {management} {#alias bad shutdown}');
  manager.dispatchInput(caul.id, '#action {Danger} {%management}');
  manager.sessions.get(caul.id).connection.handlers.onText('Danger\n');
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, []);
  assert.match(events.findLast((event) => event.type === 'action-result').payload.messages[0], /client-management/u);
});

test('restores persistent variables without expanding or sending them', async () => {
  const { manager } = managerWithImmediateQueues();
  manager.createSession({ id: 'main', name: 'Main' });
  const restored = manager.restore({
    activeSessionId: 'main',
    sessions: [{ id: 'main', name: 'Main', host: 'mud.test', port: 4000 }],
    variables: [
      { name: 'TARGET', value: '%species guard', scope: 'session' },
      { name: 'species', value: 'mutant' }
    ]
  });

  assert.deepEqual(restored.variables, [
    { name: 'species', value: 'mutant', scope: 'global' },
    { name: 'target', value: '%species guard', scope: 'global' }
  ]);
  assert.deepEqual(manager.sessions.get('main').connection.sent, []);

  await manager.connectSession('main', { host: 'mud.test', port: 4000 });
  manager.dispatchInput('main', 'kill %target');
  assert.deepEqual(manager.sessions.get('main').connection.sent, ['kill mutant guard']);
});

test('stable GMCP character names do not republish the full session list', () => {
  const connections = [];
  let sessionSnapshots = 0;
  const manager = new SessionManager({
    connectionFactory: (handlers) => {
      const connection = new FakeConnection(handlers);
      connections.push(connection);
      return connection;
    },
    handlers: {
      onSessionsChanged: () => { sessionSnapshots += 1; }
    },
    queueOptions: { intervalMs: 0 }
  });

  const session = manager.createSession({ name: 'Main Window' });
  const connection = manager.sessions.get(session.id).connection;
  const afterCreate = sessionSnapshots;

  connection.handlers.onGmcp?.({
    packageName: 'Char.Status',
    body: { name: 'Prime' },
    path: ['char', 'status']
  });
  assert.equal(sessionSnapshots, afterCreate + 1);

  connection.handlers.onGmcp?.({
    packageName: 'Room.Info',
    body: { num: 100, name: 'A room' },
    path: ['room', 'info']
  });
  connection.handlers.onGmcp?.({
    packageName: 'Char.Vitals',
    body: { hp: 10 },
    path: ['char', 'vitals']
  });

  assert.equal(sessionSnapshots, afterCreate + 1);
});


test('replaces aliases and actions in the live definition engines without rebuilding sessions', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ id: 'main', name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  const snapshot = manager.replaceDefinitions({
    aliases: [{ name: 'k', body: 'kill %1;kick', scope: 'global' }],
    actions: {
      enabled: true,
      definitions: [{ pattern: 'Alarm', command: 'stand', priority: 3, enabled: false, scope: 'global' }]
    }
  });

  assert.deepEqual(snapshot.aliases, [{ name: 'k', body: 'kill %1;kick', priority: 5, scope: 'global' }]);
  assert.equal(snapshot.actions.definitions[0].enabled, false);
  assert.deepEqual(manager.dispatchInput(main.id, '#alias').messages, ['[global] k = kill %1;kick [priority 5]']);
  manager.dispatchInput(main.id, 'k mutant');
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, ['kill mutant', 'kick']);
});

test('supports TinTin removal commands alongside delete subcommands', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(main.id, '#alias {k} {kill %1}');
  manager.dispatchInput(main.id, '#action {Alarm} {stand}');
  manager.dispatchInput(main.id, '#gag {The reactor hums.}');

  assert.deepEqual(manager.dispatchInput(main.id, '#unalias {k}').messages, ['Deleted alias k.']);
  assert.deepEqual(manager.dispatchInput(main.id, '#unaction {Alarm}').messages, ['Deleted action: Alarm']);
  assert.deepEqual(manager.dispatchInput(main.id, '#ungag {The reactor hums.}').messages, ['Deleted gag: The reactor hums.']);
  assert.equal(manager.snapshot().aliases.length, 0);
  assert.equal(manager.snapshot().actions.definitions.length, 0);
  assert.equal(manager.snapshot().gags.definitions.length, 0);
});

test('TinTin-style #session creates a clean profile target before connecting, then reconnects without reloading', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const main = manager.createSession({ id: 'main', name: 'Main', role: 'tank' });
  await manager.connectSession(main.id, { host: 'tdome.nukefire.org', port: 4000 });
  manager.setTerminalSize(main.id, 166, 52);
  manager.setClientPreferences(main.id, { screenReaderMode: true });
  manager.dispatchInput(main.id, '#alias {windonly} {say wind}');

  const result = manager.dispatchInput(main.id, '#session rambo tdome.nukefire.org 4001');
  const rambo = manager.findSession('rambo');
  assert.ok(rambo);
  assert.equal(result.activateSessionId, rambo.id);
  assert.equal(rambo.status.state, 'disconnected');
  assert.deepEqual(rambo.terminalSize, { width: 166, height: 52 });
  assert.equal(rambo.preferences.screenReaderMode, true);
  assert.match(result.messages[0], /loading rambo\.tin before connecting/u);
  assert.deepEqual(events.at(-1), {
    sessionId: rambo.id,
    type: 'session-profile-load-request',
    payload: {
      requested: 'rambo',
      connectAfter: { host: 'tdome.nukefire.org', port: 4001 }
    }
  });
  assert.equal(manager.snapshot().sessions.find((entry) => entry.id === rambo.id).tintin.aliases.length, 0);

  manager.replaceDefinitions(rambo.id, {
    aliases: [{ name: 'ramboonly', body: 'say rambo', scope: 'global' }],
    actions: { enabled: true, definitions: [{ pattern: '^Ready$', command: 'stand', priority: 5, enabled: true, scope: 'global' }] },
    profile: { requested: 'rambo', filename: 'rambo.tin', loaded: true }
  });
  await manager.connectSession(rambo.id, { host: 'tdome.nukefire.org', port: 4001 });

  const list = manager.dispatchInput(rambo.id, '#session').messages.join('\n');
  assert.match(list, /Main \[tank\].*no profile.*tdome\.nukefire\.org:4000/u);
  assert.match(list, /rambo \[member\].*rambo\.tin.*1 aliases \/ 1 actions.*tdome\.nukefire\.org:4001/u);
  const profile = manager.dispatchInput(rambo.id, '#profile').messages.join('\n');
  assert.match(profile, /Session: rambo/u);
  assert.match(profile, /Profile: rambo\.tin — loaded privately/u);
  assert.match(profile, /1 aliases, 1 actions/u);

  assert.equal(manager.dispatchInput(rambo.id, '#session -').activateSessionId, main.id);
  assert.equal(manager.dispatchInput(main.id, '#session +').activateSessionId, rambo.id);

  const sessionCount = manager.sessions.size;
  const profileEventCount = events.filter((event) => event.type === 'session-profile-load-request').length;
  const reconnect = manager.dispatchInput(main.id, '#session rambo tdome.nukefire.org 4000');
  const reconnectedRambo = manager.findSession('rambo');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(manager.sessions.size, sessionCount);
  assert.equal(reconnectedRambo.id, rambo.id);
  assert.equal(reconnectedRambo.host, 'tdome.nukefire.org');
  assert.equal(reconnectedRambo.port, 4000);
  assert.equal(reconnectedRambo.status.state, 'connected');
  assert.equal(reconnect.activateSessionId, rambo.id);
  assert.match(reconnect.messages[0], /Connecting session rambo/u);
  assert.equal(events.filter((event) => event.type === 'session-profile-load-request').length, profileEventCount);
  assert.equal(manager.snapshot().sessions.find((entry) => entry.id === rambo.id).tintin.profile.filename, 'rambo.tin');

  const reload = manager.dispatchInput(main.id, '#reload rambo');
  assert.equal(reload.activateSessionId, rambo.id);
  assert.match(reload.messages[0], /Reloading rambo cleanly from rambo\.tin/u);
  assert.deepEqual(events.at(-1), {
    sessionId: rambo.id,
    type: 'session-profile-load-request',
    payload: { requested: 'rambo.tin' }
  });
  const shorthandReload = manager.dispatchInput(rambo.id, '#session rambo reload');
  assert.equal(shorthandReload.activateSessionId, rambo.id);
  assert.match(shorthandReload.messages[0], /Reloading rambo cleanly/u);
});

test('TinTin-style classes group definitions and save, clear, load, disable, and restore them', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ id: 'main', name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  assert.match(manager.dispatchInput(main.id, '#class {combat} open').messages[0], /opened/u);
  manager.dispatchInput(main.id, '#alias {atk} {kill %1;kick}');
  manager.dispatchInput(main.id, '#variable {target} {mutant}');
  manager.dispatchInput(main.id, '#action {You miss} {bash} {3}');
  manager.dispatchInput(main.id, '#gag {You hear distant machinery.}');
  manager.dispatchInput(main.id, '#class {combat} close');

  const grouped = manager.snapshot();
  assert.equal(grouped.aliases[0].className, 'combat');
  assert.equal(grouped.variables[0].className, 'combat');
  assert.equal(grouped.actions.definitions[0].className, 'combat');
  assert.equal(grouped.gags.definitions[0].className, 'combat');

  assert.deepEqual(manager.dispatchInput(main.id, '#class {combat} save').messages, ['Saved 4 definitions for class combat.']);
  assert.deepEqual(manager.dispatchInput(main.id, '#class {combat} clear').messages, ['Cleared 4 live definitions from class combat. Saved copy retained.']);
  assert.equal(manager.snapshot().aliases.length, 0);
  assert.equal(manager.snapshot().variables.length, 0);
  assert.equal(manager.snapshot().actions.definitions.length, 0);
  assert.equal(manager.snapshot().gags.definitions.length, 0);

  assert.deepEqual(manager.dispatchInput(main.id, '#class {combat} load').messages, ['Loaded 4 definitions for class combat.']);
  manager.dispatchInput(main.id, 'atk %target');
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, ['kill mutant', 'kick']);

  assert.match(manager.dispatchInput(main.id, '#class {combat} off').messages[0], /disabled/u);
  assert.equal(manager.snapshot().aliases.length, 0);
  assert.deepEqual(manager.dispatchInput(main.id, '#class {combat} on').messages, ['Loaded 4 definitions for class combat.']);

  const persisted = manager.snapshot();
  const { manager: restoredManager } = managerWithImmediateQueues();
  restoredManager.createSession({ id: 'main', name: 'Main' });
  const restored = restoredManager.restore(persisted);
  assert.equal(restored.aliases[0].className, 'combat');
  assert.equal(restored.classes.definitions[0].name, 'combat');
  assert.equal(restored.classes.definitions[0].saved.aliases[0].name, 'atk');
});

test('#class assign temporarily labels one command bundle without leaving the class open', () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ id: 'main', name: 'Main' });

  const result = manager.dispatchInput(
    main.id,
    '#class {travel} assign {#alias {home} {recall};#gag {You are already there.}}'
  );
  assert.match(result.messages[0], /Assigned 2 commands through class travel/u);
  assert.equal(manager.snapshot().aliases[0].className, 'travel');
  assert.equal(manager.snapshot().gags.definitions[0].className, 'travel');
  assert.deepEqual(manager.snapshot().classes.activeStack, []);
});

test('highlight commands define, inspect, toggle, delete, persist, and honor aliases', () => {
  const { manager } = managerWithImmediateQueues({ commandPrefix: '~' });
  const main = manager.createSession({ id: 'main', name: 'Main' });

  let result = manager.dispatchInput(main.id, '~high {mutant} {Yellow underline} {2}');
  assert.deepEqual(result.messages, ['Defined highlight: {mutant} => {Yellow underline} [priority 2]']);
  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(result.snapshot.highlights.definitions, [{
    pattern: 'mutant', style: 'Yellow underline', priority: 2,
    enabled: true, scope: 'global'
  }]);

  result = manager.dispatchInput(main.id, '~highlight show {mutant}');
  assert.deepEqual(result.messages, ['[2] ON {mutant} => {Yellow underline}']);
  result = manager.dispatchInput(main.id, '~highlight disable {mutant}');
  assert.deepEqual(result.messages, ['Highlight disabled: mutant']);
  assert.equal(result.snapshot.highlights.definitions[0].enabled, false);
  result = manager.dispatchInput(main.id, '~highlight enable {mutant}');
  assert.deepEqual(result.messages, ['Highlight enabled: mutant']);
  result = manager.dispatchInput(main.id, '~unhigh {mutant}');
  assert.deepEqual(result.messages, ['Deleted highlight: mutant']);
  assert.deepEqual(result.snapshot.highlights.definitions, []);
});

test('highlight command validates styles, priorities, and braced definition names', () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ id: 'main', name: 'Main' });

  let result = manager.dispatchInput(main.id, '#highlight {danger} {blink Red}');
  assert.deepEqual(result.messages, ['Defined highlight: {danger} => {blink Red} [priority 5]']);
  assert.equal(result.snapshot.highlights.definitions[0].style, 'blink Red');

  result = manager.dispatchInput(main.id, '#highlight {danger2} {Red b}');
  assert.match(result.messages[0], /needs a color/u);

  result = manager.dispatchInput(main.id, '#highlight {list} {Cyan} {99}');
  assert.deepEqual(result.messages, ['Defined highlight: {list} => {Cyan} [priority 9]']);
  result = manager.dispatchInput(main.id, '#highlight add {list} {Cyan} {99}');
  assert.equal(result.snapshot.highlights.definitions.find((entry) => entry.pattern === 'list').priority, 9);
});

test('highlight definitions join classes and survive class save clear and load', () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ id: 'main', name: 'Main' });

  manager.dispatchInput(main.id, '#class {combat} open');
  manager.dispatchInput(main.id, '#highlight {Warning} {Red reverse} {1}');
  manager.dispatchInput(main.id, '#class {combat} close');
  assert.equal(manager.snapshot().highlights.definitions[0].className, 'combat');

  manager.dispatchInput(main.id, '#class {combat} save');
  manager.dispatchInput(main.id, '#class {combat} clear');
  assert.deepEqual(manager.snapshot().highlights.definitions, []);
  manager.dispatchInput(main.id, '#class {combat} load');
  assert.deepEqual(manager.snapshot().highlights.definitions, [{
    pattern: 'Warning', style: 'Red reverse', priority: 1,
    enabled: true, scope: 'global', className: 'combat'
  }]);
});

test('actions cannot create or remove highlight definitions', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const main = manager.createSession({ id: 'main', name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(main.id, '#action {Danger} {#highlight {Danger} {Red}}');
  manager.sessions.get(main.id).connection.handlers.onText('Danger\n');
  assert.deepEqual(manager.snapshot().highlights.definitions, []);
  assert.match(events.find((event) => event.type === 'action-result').payload.messages[0], /client-management/u);
});

test('substitute commands define, inspect, toggle, delete, persist, and honor aliases', () => {
  const { manager } = managerWithImmediateQueues({ commandPrefix: '~' });
  const main = manager.createSession({ id: 'main', name: 'Main' });

  let result = manager.dispatchInput(main.id, '~sub {You receive %1 credits.} {PAYDAY: %1 credits} {2}');
  assert.deepEqual(result.messages, ['Defined substitute: {You receive %1 credits.} => {PAYDAY: %1 credits} [priority 2]']);
  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(result.snapshot.substitutes.definitions, [{
    pattern: 'You receive %1 credits.', replacement: 'PAYDAY: %1 credits', priority: 2,
    enabled: true, scope: 'global'
  }]);

  result = manager.dispatchInput(main.id, '~substitute show {You receive %1 credits.}');
  assert.deepEqual(result.messages, ['[2] ON {You receive %1 credits.} => {PAYDAY: %1 credits}']);
  result = manager.dispatchInput(main.id, '~substitute disable {You receive %1 credits.}');
  assert.deepEqual(result.messages, ['Substitute disabled: You receive %1 credits.']);
  result = manager.dispatchInput(main.id, '~substitute enable {You receive %1 credits.}');
  assert.deepEqual(result.messages, ['Substitute enabled: You receive %1 credits.']);
  result = manager.dispatchInput(main.id, '~unsub {You receive %1 credits.}');
  assert.deepEqual(result.messages, ['Deleted substitute: You receive %1 credits.']);
  assert.deepEqual(result.snapshot.substitutes.definitions, []);
});

test('substitute command accepts braced definition names and clamps priorities', () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ id: 'main', name: 'Main' });

  let result = manager.dispatchInput(main.id, '#substitute {danger}');
  assert.equal(result.messages[0], 'Unknown substitute: danger.');

  result = manager.dispatchInput(main.id, '#substitute {list} {LISTED} {99}');
  assert.deepEqual(result.messages, ['Defined substitute: {list} => {LISTED} [priority 9]']);
  result = manager.dispatchInput(main.id, '#substitute add {list} {LISTED} {99}');
  assert.equal(result.snapshot.substitutes.definitions.find((record) => record.pattern === 'list').priority, 9);
});

test('substitute definitions join classes and survive class save clear and load', () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ id: 'main', name: 'Main' });

  manager.dispatchInput(main.id, '#class {combat} open');
  manager.dispatchInput(main.id, '#substitute {Warning} {ALERT} {1}');
  manager.dispatchInput(main.id, '#class {combat} close');
  assert.equal(manager.snapshot().substitutes.definitions[0].className, 'combat');

  manager.dispatchInput(main.id, '#class {combat} save');
  manager.dispatchInput(main.id, '#class {combat} clear');
  assert.deepEqual(manager.snapshot().substitutes.definitions, []);
  manager.dispatchInput(main.id, '#class {combat} load');
  assert.deepEqual(manager.snapshot().substitutes.definitions, [{
    pattern: 'Warning', replacement: 'ALERT', priority: 1,
    enabled: true, scope: 'global', className: 'combat'
  }]);
});

test('actions cannot create or remove substitute definitions', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const main = manager.createSession({ id: 'main', name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(main.id, '#action {Danger} {#substitute {Danger} {SAFE}}');
  manager.sessions.get(main.id).connection.handlers.onText('Danger\n');
  assert.deepEqual(manager.snapshot().substitutes.definitions, []);
  assert.match(events.find((event) => event.type === 'action-result').payload.messages[0], /client-management/u);
});

test('defines, lists, toggles, and removes TinTin-style macros without sending anything', () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });

  let result = manager.dispatchInput(caul.id, '#macro {F1} {look;#showme {Ready; now}}');
  assert.deepEqual(result.deliveries, []);
  assert.match(result.messages[0], /Defined macro: \{F1\}/u);
  assert.deepEqual(result.snapshot.macros.definitions[0].commands, ['look', '#showme {Ready; now}']);

  result = manager.dispatchInput(caul.id, '#macro disable {F1}');
  assert.deepEqual(result.messages, ['Macro disabled: F1']);
  assert.equal(result.snapshot.macros.definitions[0].enabled, false);

  result = manager.dispatchInput(caul.id, '#macro show {F1}');
  assert.match(result.messages[0], /^OFF \{F1\} =>/u);

  result = manager.dispatchInput(caul.id, '#unmacro {F1}');
  assert.deepEqual(result.messages, ['Deleted macro: F1']);
  assert.deepEqual(result.snapshot.macros.definitions, []);
});

test('macro command aliases use the selected client prefix and reject plain typing keys', () => {
  const { manager } = managerWithImmediateQueues({ commandPrefix: '~' });
  const caul = manager.createSession({ name: 'Caul' });

  let result = manager.dispatchInput(caul.id, '~mac {Command+K} {~showme {Target locked}}');
  assert.match(result.messages[0], /Defined macro/u);
  assert.equal(result.snapshot.macros.definitions[0].command, '~showme {Target locked}');

  result = manager.dispatchInput(caul.id, '~macro {n} {north}');
  assert.match(result.messages[0], /Plain typing keys are not supported yet/u);

  result = manager.dispatchInput(caul.id, '~unmac {Command+K}');
  assert.match(result.messages[0], /Deleted macro/u);
});

test('classes save, clear, and restore macros with their enabled state', () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });

  manager.dispatchInput(caul.id, '#class {prime} open');
  manager.dispatchInput(caul.id, '#macro {F2} {score}');
  manager.dispatchInput(caul.id, '#macro disable {F2}');
  let result = manager.dispatchInput(caul.id, '#class {prime} save');
  assert.match(result.messages[0], /Saved 1 definition/u);

  result = manager.dispatchInput(caul.id, '#class {prime} clear');
  assert.equal(result.snapshot.macros.definitions.length, 0);

  result = manager.dispatchInput(caul.id, '#class {prime} load');
  assert.equal(result.snapshot.macros.definitions.length, 1);
  assert.equal(result.snapshot.macros.definitions[0].className, 'prime');
  assert.equal(result.snapshot.macros.definitions[0].enabled, false);
});

test('Actions cannot create or remove persistent macros', () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });
  const session = manager.sessions.get(caul.id);
  let result = manager.dispatchCommand(session, '#macro {F3} {flee}', { actionGenerated: true });
  assert.match(result.messages.join('\n'), /client-management commands cannot be generated/u);
  result = manager.dispatchCommand(session, '#unmacro {F3}', { actionGenerated: true });
  assert.match(result.messages.join('\n'), /client-management commands cannot be generated/u);
  assert.deepEqual(manager.snapshot().macros.definitions, []);
});

test('pipeline debug is per-session, bounded, and traces the outgoing command path', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const main = manager.createSession({ name: 'Main', pipelineDebug: { enabled: true, maxEntries: 50 } });
  const shai = manager.createSession({ name: 'Shai' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(main.id, '#variable {target} {goblin}');
  manager.dispatchInput(main.id, '#alias {hit} {bash %target}');
  manager.dispatchInput(main.id, 'e;hit;#Shai heal Main');

  const snapshot = manager.pipelineDebugSnapshot(main.id);
  assert.equal(snapshot.enabled, true);
  assert.equal(snapshot.maxEntries, 50);
  assert.equal(snapshot.entries.some((entry) => entry.stage === 'batch' && /3 top-level commands/u.test(entry.message)), true);
  assert.equal(snapshot.entries.some((entry) => entry.stage === 'alias' && /bash %target/u.test(entry.message)), true);
  assert.equal(snapshot.entries.some((entry) => entry.stage === 'variables' && /bash goblin/u.test(entry.message)), true);
  assert.equal(snapshot.entries.some((entry) => entry.stage === 'route' && /Shai/u.test(entry.message)), true);
  assert.equal(snapshot.entries.some((entry) => entry.stage === 'send' && /Sent to Main: bash goblin/u.test(entry.message)), true);
  assert.equal(manager.pipelineDebugSnapshot(shai.id).entries.length, 0);
  assert.equal(events.some((event) => event.type === 'pipeline-debug'), true);
});

test('pipeline debug redacts all command details during secure input', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main', pipelineDebug: { enabled: true } });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.sessions.get(main.id).secureInput = true;

  manager.dispatchInput(main.id, 'super-secret-password');
  const messages = manager.pipelineDebugSnapshot(main.id).entries.map((entry) => entry.message).join('\n');
  assert.doesNotMatch(messages, /super-secret-password/u);
  assert.match(messages, /redacted/u);
});

test('debug command controls, lists, clears, and persists per-session state', () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });

  assert.match(manager.dispatchInput(main.id, '#debug').messages[0], /OFF/u);
  assert.deepEqual(manager.dispatchInput(main.id, '#debug pipeline on').messages, [
    'Pipeline debug enabled for Main. Review it in the Protocol panel.'
  ]);
  manager.dispatchInput(main.id, '#showme {hello}');
  assert.equal(manager.pipelineDebugSnapshot(main.id).entries.length > 0, true);
  assert.equal(manager.dispatchInput(main.id, '#debug show').messages.some((message) => /\[client\]/u.test(message)), true);
  assert.match(manager.dispatchInput(main.id, '#debug clear').messages[0], /Cleared/u);
  assert.equal(manager.pipelineDebugSnapshot(main.id).entries.length, 0);

  const restored = managerWithImmediateQueues().manager;
  restored.restore({ sessions: [{ id: 'main', name: 'Main', pipelineDebug: { enabled: true, maxEntries: 500 } }] });
  assert.deepEqual(restored.snapshot().sessions[0].pipelineDebug, { enabled: true, maxEntries: 500, count: 0 });
});

test('pipeline debug records Action and Gag decisions without changing protected behavior', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main', pipelineDebug: { enabled: true } });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(main.id, '#action {attacks you} {flee}');
  manager.dispatchInput(main.id, '#gag {spam line}');
  const session = manager.sessions.get(main.id);

  session.connection.handlers.onText('spam line\n');
  session.connection.handlers.onText('A goblin attacks you!\n');

  const entries = manager.pipelineDebugSnapshot(main.id).entries;
  assert.equal(entries.some((entry) => entry.stage === 'gag' && /Matched spam line/u.test(entry.message)), true);
  assert.equal(entries.some((entry) => entry.stage === 'action' && /Matched attacks you/u.test(entry.message)), true);
  assert.deepEqual(session.connection.sent.at(-1), 'flee');
});

test('echo formats local text without network delivery or Action recursion', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#action {Warning: low} {#echo {HEAL %s} {NOW}}');
  manager.dispatchInput(caul.id, '#action {HEAL NOW} {say recursive}');
  const actionResult = manager.dispatchInput(caul.id, '#showme {Warning: low}');

  assert.deepEqual(actionResult.deliveries, []);
  assert.deepEqual(events.filter((event) => event.type === 'local-text').map((event) => event.payload), [
    'Warning: low\n',
    'HEAL NOW\n'
  ]);
  assert.deepEqual(manager.sessions.get(caul.id).connection.sent, []);
  assert.equal(events.filter((event) => event.type === 'action-result').length, 1);
});

test('echo protects format directives, expands explicit variables once, and supports aliases and batches', () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const caul = manager.createSession({ name: 'Caul' });

  manager.dispatchInput(caul.id, '#variable {d} {999}');
  manager.dispatchInput(caul.id, '#variable {q} {silently wrong}');
  manager.dispatchInput(caul.id, '#variable {Y} {BROKEN}');
  manager.dispatchInput(caul.id, '#variable {target} {old mutant}');
  manager.dispatchInput(caul.id, '#alias {statusline} {#echo {%{target}: %d/%d} {75} {100}}');
  let result = manager.dispatchInput(caul.id, 'statusline;#echo {[%8s]} {Caul}');

  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(result.messages, []);
  manager.dispatchInput(caul.id, '#echo {Year: %t} {%Y}');
  assert.deepEqual(events.filter((event) => event.type === 'local-text').slice(0, 2).map((event) => event.payload), [
    'old mutant: 75/100\n',
    '[    Caul]\n'
  ]);
  assert.match(events.findLast((event) => event.type === 'local-text').payload, /^Year: \d{4}\n$/u);

  manager.dispatchInput(caul.id, '#echo {Total: %m} {2 + 3 * 4}');
  assert.equal(events.findLast((event) => event.type === 'local-text').payload, 'Total: 14\n');

  result = manager.dispatchInput(caul.id, '#echo {%q} {bad}');
  assert.match(result.messages[0], /Unsupported echo format/u);
});

test('echo reports formatting and positioning errors without displaying partial output', () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const caul = manager.createSession({ name: 'Caul' });

  let result = manager.dispatchInput(caul.id, '#echo {%q} {bad}');
  assert.match(result.messages[0], /Unsupported echo format/u);

  result = manager.dispatchInput(caul.id, '#echo {{Pinned %s} {1}} {text}');
  assert.match(result.messages[0], /row positioning is not available/u);
  assert.equal(events.some((event) => event.type === 'local-text'), false);
});

test('read requests the visible TinTin Scripts folder or one script without network delivery', () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const main = manager.createSession({ name: 'Main' });

  let result = manager.dispatchInput(main.id, '#read Prime');
  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(events.at(-1), {
    sessionId: main.id,
    type: 'script-read-request',
    payload: { requested: 'Prime' }
  });

  result = manager.dispatchInput(main.id, '#read');
  assert.deepEqual(result.messages, []);
  assert.equal(events.at(-1).payload.requested, '');
  assert.match(manager.dispatchInput(main.id, '#read {Prime} {extra}').messages[0], /Usage: #read/u);
});

test('Actions cannot initiate a disk read and definition replacement covers every supported family', () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const main = manager.createSession({ name: 'Main' });
  manager.dispatchInput(main.id, '#action {load now} {#read Prime}');
  manager.dispatchInput(main.id, '#showme {load now}');
  assert.equal(events.some((event) => event.type === 'script-read-request'), false);

  const snapshot = manager.replaceDefinitions({
    aliases: [{ name: 'k', body: 'kill %1', scope: 'global', className: 'prime' }],
    variables: [{ name: 'tank', value: 'Caul', scope: 'global', className: 'prime' }],
    actions: { enabled: true, definitions: [{ pattern: 'Danger', command: 'flee', priority: 2, enabled: true, className: 'prime' }] },
    gags: { enabled: true, definitions: [{ pattern: 'spam', enabled: true, className: 'prime' }] },
    highlights: { enabled: true, definitions: [{ pattern: 'Danger', style: 'light red', priority: 1, enabled: true, className: 'prime' }] },
    substitutes: { enabled: true, definitions: [{ pattern: 'credits', replacement: 'shinies', priority: 3, enabled: true, className: 'prime' }] },
    macros: { enabled: true, definitions: [{ key: 'F4', command: 'north', enabled: true, className: 'prime' }] }
  });
  assert.equal(snapshot.variables[0].name, 'tank');
  assert.equal(snapshot.gags.definitions[0].pattern, 'spam');
  assert.equal(snapshot.classes.definitions.some((entry) => entry.name === 'prime'), true);

  const restored = manager.replaceDefinitions({
    ...snapshot,
    aliases: [], variables: [],
    actions: { enabled: true, definitions: [] },
    gags: { enabled: true, definitions: [] },
    highlights: { enabled: true, definitions: [] },
    substitutes: { enabled: true, definitions: [] },
    macros: { enabled: true, definitions: [] },
    classes: { activeStack: [], definitions: [{ name: 'kept', saved: { aliases: [], variables: [], actions: [], gags: [], highlights: [], substitutes: [], macros: [] } }] }
  });
  assert.deepEqual(restored.classes.definitions.map((entry) => entry.name), ['kept']);
});

test('write requests one safe script export without network delivery and Actions cannot invoke it', () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const main = manager.createSession({ name: 'Main' });

  let result = manager.dispatchInput(main.id, '#write Prime');
  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(events.at(-1), {
    sessionId: main.id,
    type: 'script-write-request',
    payload: { requested: 'Prime' }
  });

  result = manager.dispatchInput(main.id, '#write');
  assert.deepEqual(result.messages, []);
  assert.equal(events.at(-1).payload.requested, '');
  assert.match(manager.dispatchInput(main.id, '#write {Prime} {extra}').messages[0], /Usage: #write/u);

  const before = events.length;
  manager.dispatchInput(main.id, '#action {save now} {#write Prime}');
  manager.dispatchInput(main.id, '#showme {save now}');
  assert.equal(events.slice(before).some((event) => event.type === 'script-write-request'), false);
});

test('math stores bounded results with native variables and preserves existing class membership', () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });

  manager.dispatchInput(caul.id, '#class {combat} {open}');
  manager.dispatchInput(caul.id, '#variable {base} {5}');
  manager.dispatchInput(caul.id, '#class {combat} {close}');
  let result = manager.dispatchInput(caul.id, '#math {base} {$base * 2 + 1}');

  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(result.messages, ['Math stored base: 11']);
  assert.deepEqual(manager.snapshot().variables.find((record) => record.name === 'base'), {
    name: 'base', value: '11', scope: 'global', className: 'combat'
  });

  result = manager.dispatchInput(caul.id, '#math {half} {5 / 2};#math {floatHalf} {5.0 / 2}');
  assert.deepEqual(result.messages, ['Math stored half: 2', 'Math stored floathalf: 2.5']);
  assert.equal(manager.snapshot().variables.find((record) => record.name === 'half')?.value, '2');
  assert.equal(manager.snapshot().variables.find((record) => record.name === 'floathalf')?.value, '2.5');
});

test('format stores Echo-compatible plain text and supports the safe math formatter', () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });

  manager.dispatchInput(caul.id, '#variable {hp} {75}');
  manager.dispatchInput(caul.id, '#variable {maxhp} {100}');
  let result = manager.dispatchInput(caul.id, '#format {status} {HP: %d/%d} {$hp} {$maxhp}');
  assert.deepEqual(result.messages, ['Format stored status: HP: 75/100']);
  assert.equal(manager.snapshot().variables.find((record) => record.name === 'status')?.value, 'HP: 75/100');

  result = manager.dispatchInput(caul.id, '#format {damage} {Damage: %m} {$hp * 2 + 5}');
  assert.deepEqual(result.messages, ['Format stored damage: Damage: 155']);
  assert.equal(manager.snapshot().variables.find((record) => record.name === 'damage')?.value, 'Damage: 155');

  result = manager.dispatchInput(caul.id, '#format {unsafe} {%cDanger} {light red}');
  assert.match(result.messages[0], /cannot store terminal color codes/u);
  assert.equal(manager.snapshot().variables.some((record) => record.name === 'unsafe'), false);
});

test('actions may update variables through math and format without sending commands', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const caul = manager.createSession({ name: 'Caul' });
  await manager.connectSession(caul.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(caul.id, '#variable {count} {2}');
  manager.dispatchInput(caul.id, '#action {^Gain$} {#math {count} {$count + 3};#format {notice} {Count: %%d} {$count}}');
  const result = manager.dispatchInput(caul.id, '#showme {Gain}');

  assert.deepEqual(result.deliveries, []);
  assert.equal(manager.snapshot().variables.find((record) => record.name === 'count')?.value, '5');
  assert.equal(manager.snapshot().variables.find((record) => record.name === 'notice')?.value, 'Count: 5');
  assert.equal(manager.sessions.get(caul.id).connection.sent.length, 0);
  assert.equal(events.filter((event) => event.type === 'action-result').length, 1);
});

test('math and format errors are atomic and visible in Pipeline Debug', () => {
  const { manager } = managerWithImmediateQueues();
  const caul = manager.createSession({ name: 'Caul' });
  manager.setPipelineDebug(caul.id, { enabled: true });
  manager.dispatchInput(caul.id, '#variable {value} {9}');

  let result = manager.dispatchInput(caul.id, '#math {value} {1 / 0}');
  assert.match(result.messages[0], /division by zero/u);
  assert.equal(manager.variableEngine.get('value').value, '9');

  result = manager.dispatchInput(caul.id, '#format {value} {%d} {not-number}');
  assert.match(result.messages[0], /numeric argument/u);
  assert.equal(manager.variableEngine.get('value').value, '9');

  manager.dispatchInput(caul.id, '#math {value} {3 ** 2}');
  manager.dispatchInput(caul.id, '#format {line} {Value: %d} {$value}');
  const stages = manager.pipelineDebugSnapshot(caul.id).entries.map((entry) => entry.stage);
  assert.equal(stages.includes('math'), true);
  assert.equal(stages.includes('format'), true);
});

test('defines, invokes, lists, removes, and persists TinTin Functions', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(main.id, '#function {twice} {#math {result} {%1 * 2}}');
  assert.deepEqual(result.messages, ['Defined function @twice.']);
  result = manager.dispatchInput(main.id, 'say @twice{21}');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['say 42']);
  assert.match(manager.dispatchInput(main.id, '#function').messages[0], /@twice/u);
  assert.equal(manager.snapshot().functions[0].name, 'twice');

  const restored = managerWithImmediateQueues().manager;
  restored.createSession({ name: 'Restored' });
  restored.restore({ functions: manager.snapshot().functions });
  assert.equal(restored.snapshot().functions[0].body, '#math {result} {%1 * 2}');
  assert.deepEqual(manager.dispatchInput(main.id, '#unfunction {twice}').messages, ['Deleted function twice.']);
});

test('Functions use isolated locals, positional arguments, nested calls, and result fallback', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(main.id, '#variable {who} {Global}');
  manager.dispatchInput(main.id, '#function {decorate} {#return {[%1|%0]}}');
  manager.dispatchInput(main.id, '#function {greet} {#local {who} {%1};#format {result} {Hello, %s @decorate{%1;%2}} {$who}}');

  const result = manager.dispatchInput(main.id, 'say @greet{Caul;Tank}');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['say Hello, Caul [Caul|Caul;Tank]']);
  assert.equal(manager.variableEngine.get('who').value, 'Global');
  assert.equal(manager.variableEngine.get('result'), null);
});

test('Functions reject hidden side effects, recursion, malformed calls, and direct local commands atomically', async () => {
  const { manager } = managerWithImmediateQueues({ maxFunctionDepth: 4, maxFunctionCalls: 8 });
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(main.id, '#function {unsafe} {north;#return {done}}');
  manager.dispatchInput(main.id, '#function {loop} {#return {@loop{}}}');

  let result = manager.dispatchInput(main.id, 'say @unsafe{}');
  assert.match(result.messages[0], /blocked/u);
  assert.deepEqual(result.deliveries, []);
  result = manager.dispatchInput(main.id, 'say @loop{}');
  assert.match(result.messages[0], /recursive loop/u);
  result = manager.dispatchInput(main.id, 'say @missing{}');
  assert.match(result.messages[0], /Unknown function/u);
  result = manager.dispatchInput(main.id, 'say @loop{');
  assert.match(result.messages[0], /unterminated/u);
  assert.match(manager.dispatchInput(main.id, '#local {x} {1}').messages[0], /only valid inside/u);
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, []);
});

test('Functions expand through aliases, Actions, routing, custom prefixes, and Pipeline Debug', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({
    commandPrefix: '~',
    handlers: { onEvent: (event) => events.push(event) }
  });
  const main = manager.createSession({ name: 'Main', pipelineDebug: { enabled: true, maxEntries: 100 } });
  const shai = manager.createSession({ name: 'Shai' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(shai.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(main.id, '~function {target} {~return {%1 guard}}');
  manager.dispatchInput(shai.id, '~function {target} {~return {%1 patient}}');
  manager.dispatchInput(main.id, '~alias {hit} {kill @target{%1}}');
  manager.dispatchInput(main.id, 'hit mutant');
  manager.dispatchInput(main.id, '~Shai heal @target{Caul}');
  manager.dispatchInput(main.id, '~action {Danger: %1} {say @target{%1}}');
  manager.sessions.get(main.id).connection.handlers.onText('Danger: dragon\n');

  assert.deepEqual(manager.sessions.get(main.id).connection.sent, ['kill mutant guard', 'say dragon guard']);
  assert.deepEqual(manager.sessions.get(shai.id).connection.sent, ['heal Caul patient']);
  assert.equal(events.some((event) => event.type === 'pipeline-debug' && event.payload?.entry?.stage === 'function-return'), true);
});

test('Functions join classes and survive class save clear and load', () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  manager.dispatchInput(main.id, '#class {tools} {open}');
  manager.dispatchInput(main.id, '#function {answer} {#return {42}}');
  manager.dispatchInput(main.id, '#class {tools} {close}');
  manager.dispatchInput(main.id, '#class {tools} {save}');
  assert.equal(manager.snapshot().functions[0].className, 'tools');
  manager.dispatchInput(main.id, '#class {tools} {clear}');
  assert.equal(manager.snapshot().functions.length, 0);
  manager.dispatchInput(main.id, '#class {tools} {load}');
  assert.equal(manager.snapshot().functions[0].name, 'answer');
});

test('Function errors restore persistent variable changes made earlier in the call', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(main.id, '#variable {persist} {9}');
  manager.dispatchInput(main.id, '#function {atomic} {#math {persist} {1};#math {created} {2};#math {bad} {1 / 0};#return {never}}');

  const result = manager.dispatchInput(main.id, 'say @atomic{}');

  assert.match(result.messages[0], /division by zero/u);
  assert.deepEqual(result.deliveries, []);
  assert.equal(manager.variableEngine.get('persist')?.value, '9');
  assert.equal(manager.variableEngine.get('created'), null);
  assert.equal(manager.variableEngine.get('bad'), null);
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, []);
});

test('if executes exactly one inline branch and leaves the unselected branch unevaluated', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(main.id, '#variable {hp} {75}');

  let result = manager.dispatchInput(main.id, '#if {$hp > 50} {bash goblin;kick} {say @missing{}}');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['bash goblin', 'kick']);
  assert.equal(result.messages.some((message) => /Unknown function/u.test(message)), false);

  result = manager.dispatchInput(main.id, '#if {$hp < 20} {say @missing{}} {flee;recall}');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['flee', 'recall']);
});

test('if elseif and else chains remain adjacent and continue with later batch commands', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  const result = manager.dispatchInput(main.id, '#if {0} {north};#elseif {2 > 1} {east};#else {south};look');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['east', 'look']);
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, ['east', 'look']);
});

test('standalone and malformed conditionals fail without sending branch commands', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(main.id, '#else {flee}');
  assert.match(result.messages[0], /must immediately follow/u);
  result = manager.dispatchInput(main.id, '#if {1 / 0} {north} {south}');
  assert.match(result.messages[0], /division by zero/u);
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, []);
});

test('aliases and Actions execute selected conditional branches through normal safety rules', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(main.id, '#variable {hp} {10}');
  manager.dispatchInput(main.id, '#alias {panic} {#if {$hp < 25} {flee;recall} {say steady}}');

  let result = manager.dispatchInput(main.id, 'panic');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['flee', 'recall']);

  manager.dispatchInput(main.id, '#action {^Danger$} {#if {$hp < 25} {flee;recall};#else {say steady}}');
  manager.sessions.get(main.id).connection.handlers.onText?.('Danger\n');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(manager.sessions.get(main.id).connection.sent.slice(-2), ['flee', 'recall']);
  assert.equal(events.some((event) => event.type === 'action-result' && event.payload?.deliveries?.length === 2), true);
});

test('Functions support lazy nested conditionals and return from the selected branch', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(main.id, '#function {grade} {#if {%1 >= 90} {#return {A}};#elseif {%1 >= 80} {#return {B}};#else {#math {bad} {1 / 0};#return {C}}}');

  let result = manager.dispatchInput(main.id, 'say @grade{85}');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['say B']);
  assert.equal(manager.variableEngine.get('bad'), null);

  result = manager.dispatchInput(main.id, 'say @grade{70}');
  assert.match(result.messages[0], /division by zero/u);
  assert.deepEqual(result.deliveries, []);
});





test('conditionals execute inside loops, delays, and class assignment without a second pipeline', async () => {
  let delayedCallback = null;
  const { manager } = managerWithImmediateQueues({
    delaySetTimer: (callback) => {
      delayedCallback = callback;
      return { id: 'conditional-delay' };
    },
    delayClearTimer: () => {}
  });
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  let result = manager.dispatchInput(main.id, '#loop {1} {2} {i} {#if {$i == 1} {north};#else {south}}');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['north', 'south']);

  result = manager.dispatchInput(main.id, '#delay {1} {#if {0} {east};#else {west}}');
  assert.match(result.messages[0], /Delay scheduled/u);
  assert.equal(typeof delayedCallback, 'function');
  delayedCallback();
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(manager.sessions.get(main.id).connection.sent.slice(-1), ['west']);

  result = manager.dispatchInput(main.id, '#class {combat} assign {#if {1} {#alias {guard} {look}}}');
  assert.match(result.messages.join('\n'), /Defined alias guard/u);
  assert.equal(manager.snapshot().aliases.find((record) => record.name === 'guard')?.className, 'combat');
});

test('Action conditionals cannot hide persistent management commands in selected branches', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(main.id, '#action {^Safe branch$} {#if {0} {#alias {hidden} {kill}};#else {flee}}');
  manager.sessions.get(main.id).connection.handlers.onText?.('Safe branch\n');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, ['flee']);
  assert.equal(manager.snapshot().aliases.some((record) => record.name === 'hidden'), false);

  manager.dispatchInput(main.id, '#action {^Unsafe branch$} {#if {1} {#alias {hidden} {kill}};#else {south}}');
  manager.sessions.get(main.id).connection.handlers.onText?.('Unsafe branch\n');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, ['flee']);
  assert.equal(manager.snapshot().aliases.some((record) => record.name === 'hidden'), false);
  const blocked = events.find((event) => event.type === 'action-result'
    && event.payload?.messages?.some((message) => /client-management commands cannot be generated/u.test(message)));
  assert.ok(blocked);
});

test('conditionals respect the selected client prefix and Pipeline Debug records decisions', async () => {
  const { manager } = managerWithImmediateQueues({ commandPrefix: '~' });
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.setPipelineDebug(main.id, { enabled: true, maxEntries: 100 });

  const result = manager.dispatchInput(main.id, '~if {1} {north} {south}');
  assert.deepEqual(result.deliveries.map((delivery) => delivery.command), ['north']);
  const stages = manager.pipelineDebugSnapshot(main.id).entries.map((entry) => entry.stage);
  assert.equal(stages.includes('conditional'), true);
  assert.equal(stages.includes('conditional-branch'), true);
});


test('edit requests a safe script editor action without network delivery and Actions cannot invoke it', () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const main = manager.createSession({ name: 'Main' });

  let result = manager.dispatchInput(main.id, '#edit Prime');
  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(result.messages, []);
  assert.deepEqual(events.at(-1), {
    sessionId: main.id,
    type: 'script-edit-request',
    payload: { requested: 'Prime' }
  });

  result = manager.dispatchInput(main.id, '#edit read {Prime.tin}');
  assert.deepEqual(result.messages, []);
  assert.equal(events.at(-1).payload.requested, 'Prime.tin');

  result = manager.dispatchInput(main.id, '#edit');
  assert.deepEqual(result.messages, []);
  assert.equal(events.at(-1).payload.requested, '');
  assert.match(manager.dispatchInput(main.id, '#edit read').messages[0], /Usage: #edit read/u);
  assert.match(manager.dispatchInput(main.id, '#edit {Prime} {extra}').messages[0], /Usage: #edit/u);

  const before = events.length;
  manager.dispatchInput(main.id, '#action {edit now} {#edit Prime}');
  manager.dispatchInput(main.id, '#showme {edit now}');
  assert.equal(events.slice(before).some((event) => event.type === 'script-edit-request'), false);
});

test('#end immediately disconnects only the source session without a confirmation path', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  const healer = manager.createSession({ name: 'Healer' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(healer.id, { host: 'mud.test', port: 4000 });

  const result = manager.dispatchInput(main.id, '#end');

  assert.deepEqual(result.messages, ['Disconnected Main.']);
  assert.equal(manager.sessions.get(main.id).status.state, 'disconnected');
  assert.equal(manager.sessions.get(healer.id).status.state, 'connected');
  assert.equal(result.snapshot.sessions.find((session) => session.id === main.id).connected, false);
});

test('#kill clears reloadable TinTin state while preserving sessions and client configuration', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(main.id, '#class {Prime} {open}');
  manager.dispatchInput(main.id, '#alias {k} {kill %1}');
  manager.dispatchInput(main.id, '#variable {target} {mutant}');
  manager.dispatchInput(main.id, '#function {who} {#return {$target}}');
  manager.dispatchInput(main.id, '#action {^Danger$} {flee}');
  manager.dispatchInput(main.id, '#gag {spam}');
  manager.dispatchInput(main.id, '#highlight {Danger} {bold red}');
  manager.dispatchInput(main.id, '#substitute {old} {new}');
  manager.dispatchInput(main.id, '#macro {F1} {look}');
  manager.dispatchInput(main.id, '#class {Prime} {save}');

  const result = manager.dispatchInput(main.id, '#kill');
  const snapshot = result.snapshot;

  assert.match(result.messages[0], /Cleared \d+ live TinTin definitions/u);
  assert.equal(result.messages.length, 1);
  assert.deepEqual(snapshot.aliases, []);
  assert.deepEqual(snapshot.variables, []);
  assert.deepEqual(snapshot.functions, []);
  assert.deepEqual(snapshot.actions.definitions, []);
  assert.deepEqual(snapshot.gags.definitions, []);
  assert.deepEqual(snapshot.highlights.definitions, []);
  assert.deepEqual(snapshot.substitutes.definitions, []);
  assert.deepEqual(snapshot.macros.definitions, []);
  assert.deepEqual(snapshot.classes.definitions, []);
  assert.equal(snapshot.sessions.length, 1);
  assert.equal(snapshot.sessions[0].connected, true);
  assert.equal(snapshot.commandPrefix, '#');

  manager.replaceDefinitions({ aliases: [{ name: 'k', body: 'kill %1', scope: 'global' }] });
  const reloaded = manager.dispatchInput(main.id, 'k mutant');
  assert.deepEqual(reloaded.deliveries.map((delivery) => delivery.command), ['kill mutant']);
});

test('#kill cancels active-session delays and queued Speedwalk steps', async () => {
  let nextTimer = 1;
  const pendingTimers = new Map();
  const { manager } = managerWithImmediateQueues({
    queueOptions: { intervalMs: 1000, setTimer: (callback) => { const id = nextTimer++; pendingTimers.set(id, callback); return id; }, clearTimer: (id) => pendingTimers.delete(id) },
    delaySetTimer: (callback) => { const id = nextTimer++; pendingTimers.set(id, callback); return id; },
    delayClearTimer: (id) => pendingTimers.delete(id)
  });
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(main.id, '#delay {10} {say later}');
  manager.dispatchInput(main.id, '3n');

  const result = manager.dispatchInput(main.id, '#kill');

  assert.equal(manager.sessions.get(main.id).delays.size, 0);
  assert.equal(manager.sessions.get(main.id).queue.countSource('speedwalk'), 0);
  assert.match(result.messages.join('\n'), /Cancelled 1 pending delay/u);
});

test('Actions cannot invoke #end or #kill', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const main = manager.createSession({ name: 'Main' });
  await manager.connectSession(main.id, { host: 'mud.test', port: 4000 });
  manager.dispatchInput(main.id, '#alias {stay} {look}');
  manager.dispatchInput(main.id, '#action {^EndNow$} {#end}');
  manager.dispatchInput(main.id, '#action {^KillNow$} {#kill}');

  manager.sessions.get(main.id).connection.handlers.onText?.('EndNow\nKillNow\n');
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(manager.sessions.get(main.id).status.state, 'connected');
  assert.equal(manager.aliasEngine.get('stay')?.body, 'look');
  assert.equal(events.some((event) => event.type === 'action-result' && event.payload?.messages?.some((message) => /client-management commands cannot be generated/u.test(message))), true);
});

test('a disconnected login alias may resolve to a guarded host and port connection shorthand', async () => {
  const { manager } = managerWithImmediateQueues();
  const main = manager.createSession({ name: 'Prime' });

  const direct = manager.dispatchInput(main.id, 'tdome.nukefire.org 4000');
  assert.equal(direct.deliveries[0]?.reason, 'disconnected');
  assert.deepEqual(direct.messages, ['Not connected.']);
  assert.equal(manager.sessions.get(main.id).status.state, 'disconnected');

  manager.dispatchInput(main.id, '#alias {logprime} {tdome.nukefire.org 4000}');
  const result = manager.dispatchInput(main.id, 'logprime');
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(result.deliveries, []);
  assert.deepEqual(result.messages, ['Connecting Prime to tdome.nukefire.org:4000.']);
  assert.equal(manager.sessions.get(main.id).host, 'tdome.nukefire.org');
  assert.equal(manager.sessions.get(main.id).port, 4000);
  assert.equal(manager.sessions.get(main.id).status.state, 'connected');
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, []);
});

test('disconnected #showme remains an Action test surface while final socket sends stay blocked', () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const main = manager.createSession({ name: 'Prime' });

  manager.dispatchInput(main.id, '#action {^Warning: low$} {#showme {HEAL NOW};cast heal}');
  const result = manager.dispatchInput(main.id, '#showme {Warning: low}');

  const localText = events
    .filter((event) => event.type === 'local-text')
    .map((event) => event.payload)
    .join('');
  const actionResult = events.find((event) => event.type === 'action-result');

  assert.deepEqual(result.deliveries, []);
  assert.match(localText, /Warning: low/u);
  assert.match(localText, /HEAL NOW/u);
  assert.ok(actionResult);
  assert.equal(actionResult.payload.deliveries.some((delivery) => delivery.command === 'cast heal' && delivery.reason === 'disconnected'), true);
  assert.equal(actionResult.payload.messages.includes('Not connected.'), true);
  assert.deepEqual(manager.sessions.get(main.id).connection.sent, []);
});

test('all TinTin definition families, routing, incoming processing, Speedwalk, and #kill are isolated per session', async () => {
  const events = [];
  const { manager } = managerWithImmediateQueues({ handlers: { onEvent: (event) => events.push(event) } });
  const wind = manager.createSession({ id: 'wind', name: 'Wind' });
  const gator = manager.createSession({ id: 'gator', name: 'Gator' });
  await manager.connectSession(wind.id, { host: 'mud.test', port: 4000 });
  await manager.connectSession(gator.id, { host: 'mud.test', port: 4000 });

  manager.dispatchInput(wind.id, '#alias {whoami} {say wind}');
  manager.dispatchInput(wind.id, '#variable {owner} {Wind}');
  manager.dispatchInput(wind.id, '#action {^Ping$} {say wind-action}');
  manager.dispatchInput(wind.id, '#gag {Wind Secret}');
  manager.dispatchInput(wind.id, '#class {windclass} {open}');
  manager.dispatchInput(wind.id, '#function {identity} {#return {wind}}');
  manager.dispatchInput(wind.id, '#highlight {marker} {Yellow underline}');
  manager.dispatchInput(wind.id, '#substitute {old marker} {wind marker}');
  manager.dispatchInput(wind.id, '#macro {F5} {say wind-macro}');
  manager.dispatchInput(wind.id, '#class {windclass} {close}');
  manager.dispatchInput(wind.id, '#speedwalk off');

  manager.dispatchInput(gator.id, '#alias {whoami} {say gator}');
  manager.dispatchInput(gator.id, '#variable {owner} {Gator}');
  manager.dispatchInput(gator.id, '#action {^Ping$} {say gator-action}');
  manager.dispatchInput(gator.id, '#gag {Gator Secret}');
  manager.dispatchInput(gator.id, '#class {gatorclass} {open}');
  manager.dispatchInput(gator.id, '#function {identity} {#return {gator}}');
  manager.dispatchInput(gator.id, '#highlight {marker} {Light green underline}');
  manager.dispatchInput(gator.id, '#substitute {old marker} {gator marker}');
  manager.dispatchInput(gator.id, '#macro {F5} {say gator-macro}');
  manager.dispatchInput(gator.id, '#class {gatorclass} {close}');

  manager.dispatchInput(wind.id, '#gator whoami');
  assert.deepEqual(manager.sessions.get(gator.id).connection.sent, ['say gator']);
  assert.deepEqual(manager.sessions.get(wind.id).connection.sent, []);

  manager.sessions.get(gator.id).connection.handlers.onText?.('Ping\nGator Secret\nWind Secret\n');
  assert.deepEqual(manager.sessions.get(gator.id).connection.sent, ['say gator', 'say gator-action']);
  const gatorText = events.filter((event) => event.sessionId === gator.id && event.type === 'text')
    .map((event) => event.payload).join('');
  assert.doesNotMatch(gatorText, /Gator Secret/u);
  assert.match(gatorText, /Wind Secret/u);

  const snapshot = manager.snapshot();
  const windState = snapshot.sessions.find((entry) => entry.id === wind.id).tintin;
  const gatorState = snapshot.sessions.find((entry) => entry.id === gator.id).tintin;
  assert.equal(windState.aliases[0].body, 'say wind');
  assert.equal(gatorState.aliases[0].body, 'say gator');
  assert.equal(windState.variables[0].value, 'Wind');
  assert.equal(gatorState.variables[0].value, 'Gator');
  assert.equal(windState.functions[0].body, '#return {wind}');
  assert.equal(gatorState.functions[0].body, '#return {gator}');
  assert.equal(windState.actions.definitions[0].command, 'say wind-action');
  assert.equal(gatorState.actions.definitions[0].command, 'say gator-action');
  assert.equal(windState.gags.definitions[0].pattern, 'Wind Secret');
  assert.equal(gatorState.gags.definitions[0].pattern, 'Gator Secret');
  assert.equal(windState.highlights.definitions[0].style, 'Yellow underline');
  assert.equal(gatorState.highlights.definitions[0].style, 'Light green underline');
  assert.equal(windState.substitutes.definitions[0].replacement, 'wind marker');
  assert.equal(gatorState.substitutes.definitions[0].replacement, 'gator marker');
  assert.equal(windState.macros.definitions[0].command, 'say wind-macro');
  assert.equal(gatorState.macros.definitions[0].command, 'say gator-macro');
  assert.deepEqual(windState.classes.definitions.map((entry) => entry.name), ['windclass']);
  assert.deepEqual(gatorState.classes.definitions.map((entry) => entry.name), ['gatorclass']);
  assert.equal(windState.speedwalk.enabled, false);
  assert.equal(gatorState.speedwalk.enabled, true);

  manager.dispatchInput(gator.id, '#kill');
  const afterKill = manager.snapshot();
  const killedGator = afterKill.sessions.find((entry) => entry.id === gator.id).tintin;
  const preservedWind = afterKill.sessions.find((entry) => entry.id === wind.id).tintin;
  for (const category of ['aliases', 'variables', 'functions']) assert.equal(killedGator[category].length, 0);
  for (const category of ['actions', 'gags', 'highlights', 'substitutes', 'macros']) assert.equal(killedGator[category].definitions.length, 0);
  assert.equal(killedGator.classes.definitions.length, 0);
  assert.equal(preservedWind.aliases[0].name, 'whoami');
  assert.equal(preservedWind.functions[0].body, '#return {wind}');
  assert.equal(preservedWind.macros.definitions[0].command, 'say wind-macro');
  manager.dispatchInput(wind.id, 'whoami');
  assert.deepEqual(manager.sessions.get(wind.id).connection.sent, ['say wind']);
});

test('restore migrates legacy shared definitions into only the active session and preserves native per-session snapshots', () => {
  const { manager } = managerWithImmediateQueues();
  manager.createSession({ id: 'main', name: 'Main' });

  let snapshot = manager.restore({
    activeSessionId: 'wind',
    sessions: [
      { id: 'wind', name: 'Wind', host: 'mud.test', port: 4000 },
      { id: 'gator', name: 'Gator', host: 'mud.test', port: 4000 }
    ],
    aliases: [{ name: 'legacy', body: 'say wind', scope: 'global' }]
  });
  assert.equal(snapshot.sessions.find((entry) => entry.id === 'wind').tintin.aliases[0].name, 'legacy');
  assert.equal(snapshot.sessions.find((entry) => entry.id === 'gator').tintin.aliases.length, 0);

  snapshot = manager.restore({
    activeSessionId: 'gator',
    sessions: [
      {
        id: 'wind', name: 'Wind', host: 'mud.test', port: 4000,
        tintin: { aliases: [{ name: 'windonly', body: 'say wind', scope: 'global' }] }
      },
      {
        id: 'gator', name: 'Gator', host: 'mud.test', port: 4000,
        tintin: { aliases: [{ name: 'gatoronly', body: 'say gator', scope: 'global' }] }
      }
    ],
    aliases: [{ name: 'mustnotleak', body: 'say shared', scope: 'global' }]
  });
  assert.deepEqual(snapshot.sessions.find((entry) => entry.id === 'wind').tintin.aliases.map((entry) => entry.name), ['windonly']);
  assert.deepEqual(snapshot.sessions.find((entry) => entry.id === 'gator').tintin.aliases.map((entry) => entry.name), ['gatoronly']);
  assert.equal(snapshot.sessions.some((entry) => entry.tintin.aliases.some((alias) => alias.name === 'mustnotleak')), false);
});


test('bridges compression state from a session connection to renderer events', () => {
  const events = [];
  let connection;
  const manager = new SessionManager({
    connectionFactory: (handlers) => {
      connection = new FakeConnection(handlers);
      return connection;
    },
    handlers: { onEvent: (event) => events.push(event) },
    queueOptions: { intervalMs: 0 }
  });
  const session = manager.createSession({ name: 'Compression Diagnostics' });
  connection.handlers.onCompressionState?.({
    protocol: 'MCCP2', algorithm: 'zlib/DEFLATE', active: true, wireBytes: 1024, inflatedBytes: 8192
  });
  const event = events.find((entry) => entry.sessionId === session.id && entry.type === 'compression-state');
  assert.ok(event);
  assert.equal(event.payload.active, true);
  assert.equal(event.payload.wireBytes, 1024);
  assert.equal(event.payload.inflatedBytes, 8192);
});
