export class E3SocketClient {
  constructor({ url, WebSocketImpl = WebSocket, onStatusChange = () => {}, onEvent = () => {} }) {
    this.url = url;
    this.WebSocketImpl = WebSocketImpl;
    this.onStatusChange = onStatusChange;
    this.onEvent = onEvent;
    this.socket = null;
  }

  connect() {
    if (
      this.socket &&
      (this.socket.readyState === this.WebSocketImpl.OPEN ||
        this.socket.readyState === this.WebSocketImpl.CONNECTING)
    ) {
      return;
    }

    this.onStatusChange('connecting');
    this.socket = new this.WebSocketImpl(this.url);

    this.socket.addEventListener('open', () => {
      this.onStatusChange('connected');
    });

    this.socket.addEventListener('message', (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        payload = { type: 'raw', data: event.data };
      }
      this.onEvent(payload);
    });

    this.socket.addEventListener('close', () => {
      this.onStatusChange('disconnected');
    });

    this.socket.addEventListener('error', () => {
      this.onStatusChange('error');
    });
  }

  send(data) {
    if (!this.socket || this.socket.readyState !== this.WebSocketImpl.OPEN) {
      throw new Error('E3 socket is not connected');
    }

    const message = typeof data === 'string' ? data : JSON.stringify(data);
    this.socket.send(message);
  }

  disconnect() {
    if (!this.socket) return;
    this.socket.close();
    this.socket = null;
  }
}
