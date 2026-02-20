import test from 'node:test';
import assert from 'node:assert/strict';

import { E3SocketClient } from '../src/e3Socket.js';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    this.handlers = new Map();
  }

  addEventListener(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type).push(handler);
  }

  emit(type, event = {}) {
    for (const handler of this.handlers.get(type) || []) {
      handler(event);
    }
  }

  send(payload) {
    this.sent.push(payload);
  }

  close() {
    this.emit('close');
  }
}

test('connect updates status and parses JSON events', () => {
  const statuses = [];
  const events = [];

  const client = new E3SocketClient({
    url: 'ws://localhost/e3',
    WebSocketImpl: FakeWebSocket,
    onStatusChange: (s) => statuses.push(s),
    onEvent: (e) => events.push(e),
  });

  client.connect();
  assert.equal(statuses[0], 'connecting');

  client.socket.readyState = FakeWebSocket.OPEN;
  client.socket.emit('open');
  client.socket.emit('message', { data: '{"type":"ready"}' });
  client.socket.emit('message', { data: 'plain-text' });

  assert.deepEqual(statuses, ['connecting', 'connected']);
  assert.deepEqual(events, [{ type: 'ready' }, { type: 'raw', data: 'plain-text' }]);
});

test('connect is idempotent while socket is still connecting', () => {
  const client = new E3SocketClient({ url: 'ws://localhost/e3', WebSocketImpl: FakeWebSocket });

  client.connect();
  const firstSocket = client.socket;

  client.connect();

  assert.equal(client.socket, firstSocket);
});

test('send throws when disconnected and sends serialized payload when open', () => {
  const client = new E3SocketClient({ url: 'ws://localhost/e3', WebSocketImpl: FakeWebSocket });

  assert.throws(() => client.send({ type: 'ping' }), /not connected/);

  client.connect();
  client.socket.readyState = FakeWebSocket.OPEN;

  client.send({ type: 'ping', source: 'test' });
  client.send('raw');

  assert.deepEqual(client.socket.sent, ['{"type":"ping","source":"test"}', 'raw']);
});

test('disconnect closes socket and clears client reference', () => {
  const statuses = [];
  const client = new E3SocketClient({
    url: 'ws://localhost/e3',
    WebSocketImpl: FakeWebSocket,
    onStatusChange: (s) => statuses.push(s),
  });

  client.connect();
  const socketRef = client.socket;

  client.disconnect();

  assert.equal(client.socket, null);
  assert.ok(statuses.includes('disconnected'));
  assert.ok(socketRef);
});

test('client can reconnect after socket error while connecting', () => {
  const statuses = [];
  const client = new E3SocketClient({
    url: 'ws://localhost/e3',
    WebSocketImpl: FakeWebSocket,
    onStatusChange: (s) => statuses.push(s),
  });

  client.connect();
  const firstSocket = client.socket;

  firstSocket.emit('error');
  assert.equal(client.socket, null);

  client.connect();

  assert.notEqual(client.socket, firstSocket);
  assert.deepEqual(statuses, ['connecting', 'error', 'connecting']);
});
