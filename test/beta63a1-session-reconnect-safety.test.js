'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const net = require('node:net');
const { ConnectionManager } = require('../src/connection-manager');

class FakeSocket extends EventEmitter {
  constructor() {
    super();
    this.destroyed = false;
    this.writable = true;
    this.timeout = 0;
    this.writes = [];
  }

  setKeepAlive() {}
  setNoDelay() {}
  setTimeout(value) { this.timeout = value; }
  end() { this.writable = false; }
  destroy() { this.destroyed = true; this.writable = false; }
  write(buffer) { this.writes.push(Buffer.from(buffer)); return true; }
}

test('Beta.63a1 protects replacement connections and exposes explicit Reconnect UI', async () => {
  const originalCreateConnection = net.createConnection;
  const sockets = [];
  const statuses = [];
  const text = [];
  const errors = [];

  net.createConnection = () => {
    const socket = new FakeSocket();
    sockets.push(socket);
    return socket;
  };

  try {
    const manager = new ConnectionManager({
      onStatus: (status) => statuses.push({ ...status }),
      onText: (value) => text.push(value),
      onError: (value) => errors.push(value)
    });

    const firstPromise = manager.connect('first.example', 4000);
    assert.equal(sockets.length, 1);
    const first = sockets[0];
    first.emit('connect');
    await firstPromise;
    assert.equal(manager.socket, first);
    assert.equal(manager.status, 'connected');

    const secondPromise = manager.connect('second.example', 5000);
    assert.equal(sockets.length, 2);
    const second = sockets[1];
    assert.equal(first.destroyed, true);
    assert.equal(manager.socket, second);

    second.emit('connect');
    await secondPromise;
    assert.equal(manager.socket, second);
    assert.equal(manager.status, 'connected');
    assert.equal(statuses.at(-1)?.host, 'second.example');
    assert.equal(statuses.at(-1)?.port, 5000);

    const statusCountBeforeStaleEvents = statuses.length;
    first.emit('data', Buffer.from('STALE OLD CONNECTION\r\n', 'utf8'));
    first.emit('error', new Error('stale socket error'));
    first.emit('close');

    assert.equal(manager.socket, second, 'late close from replaced socket must not clear live socket');
    assert.equal(manager.status, 'connected', 'late replaced-socket events must not disconnect new connection');
    assert.equal(statuses.length, statusCountBeforeStaleEvents, 'stale socket must not publish status changes');
    assert.equal(text.join('').includes('STALE OLD CONNECTION'), false, 'stale socket data must not enter terminal text');
    assert.equal(errors.includes('stale socket error'), false, 'stale socket errors must not surface as current errors');

    const renderer = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'renderer.js'), 'utf8');
    const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
    assert.match(html, /id="reconnect"[^>]*>Reconnect<\/button>/u);
    assert.match(renderer, /This session is already connected\. Use Reconnect to replace the live connection\./u);
    assert.match(renderer, /reconnectButton\?\.addEventListener\('click'/u);
    assert.match(renderer, /async function reconnect\(\)/u);
  } finally {
    net.createConnection = originalCreateConnection;
  }
});
