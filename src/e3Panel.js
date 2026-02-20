import { E3SocketClient } from './e3Socket.js';

export function mountE3Panel(root, { url, WebSocketImpl } = {}) {
  const statusEl = document.createElement('p');
  statusEl.dataset.testid = 'e3-status';
  statusEl.textContent = 'E3: idle';

  const eventEl = document.createElement('pre');
  eventEl.dataset.testid = 'e3-event';
  eventEl.textContent = '{}';

  const connectBtn = document.createElement('button');
  connectBtn.textContent = 'Connect E3';

  const pingBtn = document.createElement('button');
  pingBtn.textContent = 'Send ping';
  pingBtn.disabled = true;

  root.append(statusEl, eventEl, connectBtn, pingBtn);

  const client = new E3SocketClient({
    url,
    WebSocketImpl,
    onStatusChange(status) {
      statusEl.textContent = `E3: ${status}`;
      pingBtn.disabled = status !== 'connected';
    },
    onEvent(payload) {
      eventEl.textContent = JSON.stringify(payload, null, 2);
    },
  });

  connectBtn.addEventListener('click', () => client.connect());
  pingBtn.addEventListener('click', () => {
    try {
      client.send({ type: 'ping', source: 'ui' });
    } catch (error) {
      eventEl.textContent = JSON.stringify({ type: 'send_error', message: error.message }, null, 2);
    }
  });

  return client;
}
