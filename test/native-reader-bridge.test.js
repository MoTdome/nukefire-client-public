'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  NativeReaderBridge,
  encodeCommand,
  parseResponse,
  resolveBridgeExecutable
} = require('../src/native-reader-bridge');

function fakeSpawn(commandLog) {
  return () => {
    const child = new EventEmitter();
    child.pid = 4242;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = {
      destroyed: false,
      write(line) {
        const clean = String(line).trimEnd();
        commandLog.push(clean);
        const parts = clean.split('\t');
        const op = parts[0];
        const id = parts[1];
        const backend = Buffer.from('NVDA').toString('base64');
        setImmediate(() => child.stdout.emit('data', Buffer.from(`OK\t${id}\t${op}\t${backend}\t1a4\n`)));
        return true;
      },
      end() { this.destroyed = true; }
    };
    child.kill = () => true;
    return child;
  };
}

test('Native Reader protocol carries base64 text and interrupt state', () => {
  const encoded = encodeCommand('OUTPUT', 7, { text: 'Room name\nExits north.', interrupt: true });
  const parts = encoded.trimEnd().split('\t');
  assert.deepEqual(parts.slice(0, 3), ['OUTPUT', '7', '1']);
  assert.equal(Buffer.from(parts[3], 'base64').toString('utf8'), 'Room name\nExits north.');

  const response = parseResponse(`OK\t7\tOUTPUT\t${Buffer.from('NVDA').toString('base64')}\t1a4\n`);
  assert.equal(response.ok, true);
  assert.equal(response.backend, 'NVDA');
});

test('Native Reader manager preserves request order and interrupt flags', async () => {
  const commands = [];
  const bridge = new NativeReaderBridge({
    platform: 'win32',
    executablePath: 'C:\\fake\\nukefire-reader-bridge.exe',
    fileExists: () => true,
    spawnImpl: fakeSpawn(commands),
    requestTimeoutMs: 500
  });

  const results = await Promise.all([
    bridge.output('one'),
    bridge.output('two'),
    bridge.output('urgent', { interrupt: true })
  ]);

  assert.ok(results.every((result) => result.ok && result.available));
  assert.equal(commands[0].split('\t')[0], 'HELLO');

  const output = commands.slice(1).map((line) => line.split('\t'));
  assert.deepEqual(output.map((parts) => parts[0]), ['OUTPUT', 'OUTPUT', 'OUTPUT']);
  assert.deepEqual(output.map((parts) => parts[2]), ['0', '0', '1']);
  assert.deepEqual(
    output.map((parts) => Buffer.from(parts[3], 'base64').toString('utf8')),
    ['one', 'two', 'urgent']
  );
  bridge.close();
});

test('Native Reader manager is unavailable off Windows without spawning', async () => {
  let spawned = false;
  const bridge = new NativeReaderBridge({
    platform: 'darwin',
    spawnImpl: () => { spawned = true; throw new Error('should not spawn'); }
  });
  const result = await bridge.output('hello');
  assert.equal(result.ok, false);
  assert.equal(result.available, false);
  assert.equal(spawned, false);
});

test('Native Reader packaged and source paths are deterministic', () => {
  const path = require('node:path');
  assert.equal(
    resolveBridgeExecutable({
      platform: 'win32',
      isPackaged: true,
      resourcesPath: 'C:\\App\\resources'
    }),
    path.join('C:\\App\\resources', 'native-reader', 'nukefire-reader-bridge.exe')
  );
  assert.match(
    resolveBridgeExecutable({
      platform: 'win32',
      isPackaged: false,
      appRoot: 'C:\\src\\nukefire'
    }),
    /native[\\/]reader-bridge[\\/]dist[\\/]win32-x64[\\/]nukefire-reader-bridge\.exe$/u
  );
});
