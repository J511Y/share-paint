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
    const socket = new this.WebSocketImpl(this.url);
    this.socket = socket;

    socket.addEventListener('open', () => {
      if (this.socket !== socket) return;
      this.onStatusChange('connected');
    });

    socket.addEventListener('message', (event) => {
      if (this.socket !== socket) return;

      let payload;
      if (typeof event.data === 'string') {
        try {
          payload = JSON.parse(event.data);
        } catch {
          payload = { type: 'raw', data: event.data };
        }
      } else {
        payload = event.data;
      }

      this.onEvent(payload);
    });

    socket.addEventListener('close', () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.onStatusChange('disconnected');
    });

    socket.addEventListener('error', () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.onStatusChange('error');
    });
  }

  send(data) {
    if (!this.socket || this.socket.readyState !== this.WebSocketImpl.OPEN) {
      throw new Error('E3 socket is not connected');
    }

    const isArrayBuffer = typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer;
    const isArrayBufferView =
      typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView && ArrayBuffer.isView(data);
    const isBlob = typeof Blob !== 'undefined' && data instanceof Blob;
    const message =
      typeof data === 'string' || isArrayBuffer || isArrayBufferView || isBlob
        ? data
        : JSON.stringify(data);

    this.socket.send(message);
  }

  disconnect() {
    if (!this.socket) return;

    const socket = this.socket;
    this.socket = null;
    socket.close();
    this.onStatusChange('disconnected');
  }
}
