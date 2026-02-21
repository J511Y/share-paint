import test from 'node:test';
import assert from 'node:assert/strict';

import { mountE3Panel } from '../src/e3Panel.js';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.handlers = new Map();
    this.sent = [];
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

class ThrowingWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static attempts = 0;

  constructor() {
    ThrowingWebSocket.attempts += 1;
    throw new Error('constructor boom');
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.textContent = '';
    this.dataset = {};
    this.disabled = false;
    this.children = [];
    this.handlers = new Map();
  }

  append(...els) {
    this.children.push(...els);
  }

  addEventListener(type, handler) {
    this.handlers.set(type, handler);
  }

  click() {
    const handler = this.handlers.get('click');
    if (handler) handler();
  }
}

function setupFakeDom() {
  const previousDocument = global.document;
  global.document = {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };

  return () => {
    global.document = previousDocument;
  };
}

test('ping button is disabled until socket connects, then sends ping', () => {
  const restore = setupFakeDom();

  try {
    const root = new FakeElement('div');
    const client = mountE3Panel(root, {
      url: 'ws://localhost/e3',
      WebSocketImpl: FakeWebSocket,
    });

    const [statusEl, hintEl, , connectBtn, pingBtn, disconnectBtn] = root.children;

    assert.equal(hintEl.textContent, '');
    assert.equal(pingBtn.disabled, true);
    assert.equal(connectBtn.disabled, false);
    assert.equal(disconnectBtn.disabled, true);

    connectBtn.click();
    assert.equal(statusEl.textContent, 'E3: connecting');
    assert.equal(connectBtn.disabled, true);
    assert.equal(disconnectBtn.disabled, false);

    client.socket.readyState = FakeWebSocket.OPEN;
    client.socket.emit('open');

    assert.equal(statusEl.textContent, 'E3: connected');
    assert.equal(hintEl.textContent, '');
    assert.equal(pingBtn.disabled, false);
    assert.equal(connectBtn.disabled, true);
    assert.equal(disconnectBtn.disabled, false);

    pingBtn.click();
    assert.deepEqual(client.socket.sent, ['{"type":"ping","source":"ui"}']);

    client.socket.emit('close');
    assert.equal(statusEl.textContent, 'E3: disconnected');
    assert.equal(connectBtn.disabled, false);
    assert.equal(disconnectBtn.disabled, true);
  } finally {
    restore();
  }
});

test('failed send renders send_error payload in event panel', () => {
  const restore = setupFakeDom();

  try {
    const root = new FakeElement('div');
    mountE3Panel(root, {
      url: 'ws://localhost/e3',
      WebSocketImpl: FakeWebSocket,
    });

    const [, , eventEl, , pingBtn] = root.children;

    pingBtn.disabled = false;
    pingBtn.click();

    assert.match(eventEl.textContent, /"type": "send_error"/);
    assert.match(eventEl.textContent, /E3 socket is not connected/);
  } finally {
    restore();
  }
});

test('disconnect button closes active socket and updates status', () => {
  const restore = setupFakeDom();

  try {
    const root = new FakeElement('div');
    const client = mountE3Panel(root, {
      url: 'ws://localhost/e3',
      WebSocketImpl: FakeWebSocket,
    });

    const [statusEl, , , connectBtn, , disconnectBtn] = root.children;

    connectBtn.click();
    client.socket.readyState = FakeWebSocket.OPEN;
    client.socket.emit('open');

    disconnectBtn.click();

    assert.equal(statusEl.textContent, 'E3: disconnected');
    assert.equal(client.socket, null);
    assert.equal(disconnectBtn.disabled, true);
  } finally {
    restore();
  }
});

test('event panel keeps only the latest 5 events', () => {
  const restore = setupFakeDom();

  try {
    const root = new FakeElement('div');
    const client = mountE3Panel(root, {
      url: 'ws://localhost/e3',
      WebSocketImpl: FakeWebSocket,
    });

    const [, , eventEl, connectBtn] = root.children;

    connectBtn.click();
    client.socket.readyState = FakeWebSocket.OPEN;
    client.socket.emit('open');

    for (let i = 1; i <= 6; i += 1) {
      client.socket.emit('message', { data: `{"type":"evt","seq":${i}}` });
    }

    const parsed = JSON.parse(eventEl.textContent);
    assert.equal(parsed.length, 5);
    assert.deepEqual(
      parsed.map((e) => e.seq),
      [2, 3, 4, 5, 6],
    );
  } finally {
    restore();
  }
});

test('clear events button is disabled when empty and clears accumulated events', () => {
  const restore = setupFakeDom();

  try {
    const root = new FakeElement('div');
    const client = mountE3Panel(root, {
      url: 'ws://localhost/e3',
      WebSocketImpl: FakeWebSocket,
    });

    const [, , eventEl, connectBtn, , , clearBtn] = root.children;

    assert.equal(clearBtn.disabled, true);

    connectBtn.click();
    client.socket.readyState = FakeWebSocket.OPEN;
    client.socket.emit('open');
    client.socket.emit('message', { data: '{"type":"evt","seq":1}' });

    assert.equal(clearBtn.disabled, false);
    assert.match(eventEl.textContent, /"seq": 1/);

    clearBtn.click();

    assert.equal(eventEl.textContent, '[]');
    assert.equal(clearBtn.disabled, true);
  } finally {
    restore();
  }
});

test('connect failure shows retry hint and keeps connect button enabled', () => {
  const restore = setupFakeDom();

  try {
    ThrowingWebSocket.attempts = 0;

    const root = new FakeElement('div');
    mountE3Panel(root, {
      url: 'ws://localhost/e3',
      WebSocketImpl: ThrowingWebSocket,
    });

    const [statusEl, hintEl, eventEl, connectBtn, pingBtn, disconnectBtn] = root.children;

    connectBtn.click();

    assert.equal(statusEl.textContent, 'E3: error');
    assert.match(hintEl.textContent, /retry/i);
    assert.equal(connectBtn.disabled, false);
    assert.equal(pingBtn.disabled, true);
    assert.equal(disconnectBtn.disabled, true);

    const firstPayload = JSON.parse(eventEl.textContent);
    assert.equal(firstPayload.at(-1).type, 'connect_error');

    connectBtn.click();
    assert.equal(ThrowingWebSocket.attempts, 2);
  } finally {
    restore();
  }
});
