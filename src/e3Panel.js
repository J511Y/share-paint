import { E3SocketClient } from './e3Socket.js';

export function mountE3Panel(root, { url, WebSocketImpl } = {}) {
  const statusEl = document.createElement('p');
  statusEl.dataset.testid = 'e3-status';
  statusEl.textContent = 'E3: idle';

  const eventEl = document.createElement('pre');
  eventEl.dataset.testid = 'e3-event';

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear events';

  const eventHistory = [];
  const renderEventHistory = () => {
    eventEl.textContent = JSON.stringify(eventHistory, null, 2);
    clearBtn.disabled = eventHistory.length === 0;
  };

  renderEventHistory();

  const connectBtn = document.createElement('button');
  connectBtn.textContent = 'Connect E3';

  const pingBtn = document.createElement('button');
  pingBtn.textContent = 'Send ping';
  pingBtn.disabled = true;

  const disconnectBtn = document.createElement('button');
  disconnectBtn.textContent = 'Disconnect E3';
  disconnectBtn.disabled = true;

  root.append(statusEl, eventEl, connectBtn, pingBtn, disconnectBtn, clearBtn);

  const client = new E3SocketClient({
    url,
    WebSocketImpl,
    onStatusChange(status) {
      statusEl.textContent = `E3: ${status}`;
      pingBtn.disabled = status !== 'connected';
      connectBtn.disabled = status === 'connecting' || status === 'connected';
      disconnectBtn.disabled = status !== 'connecting' && status !== 'connected';
    },
    onEvent(payload) {
      eventHistory.push(payload);
      if (eventHistory.length > 5) eventHistory.shift();
      renderEventHistory();
    },
  });

  connectBtn.addEventListener('click', () => client.connect());
  pingBtn.addEventListener('click', () => {
    try {
      client.send({ type: 'ping', source: 'ui' });
    } catch (error) {
      eventHistory.push({ type: 'send_error', message: error.message });
      if (eventHistory.length > 5) eventHistory.shift();
      renderEventHistory();
    }
  });

  disconnectBtn.addEventListener('click', () => client.disconnect());
  clearBtn.addEventListener('click', () => {
    eventHistory.length = 0;
    renderEventHistory();
  });

  return client;
}
