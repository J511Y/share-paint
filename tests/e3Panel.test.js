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

    const [statusEl, , connectBtn, pingBtn] = root.children;

    assert.equal(pingBtn.disabled, true);

    connectBtn.click();
    assert.equal(statusEl.textContent, 'E3: connecting');

    client.socket.readyState = FakeWebSocket.OPEN;
    client.socket.emit('open');

    assert.equal(statusEl.textContent, 'E3: connected');
    assert.equal(pingBtn.disabled, false);

    pingBtn.click();
    assert.deepEqual(client.socket.sent, ['{"type":"ping","source":"ui"}']);
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

    const [, eventEl, , pingBtn] = root.children;

    pingBtn.disabled = false;
    pingBtn.click();

    assert.match(eventEl.textContent, /"type": "send_error"/);
    assert.match(eventEl.textContent, /E3 socket is not connected/);
  } finally {
    restore();
  }
});
