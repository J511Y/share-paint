import { io, Socket } from 'socket.io-client';

// 싱글톤 소켓 인스턴스
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    
    socket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    // 디버깅용 로그
    if (process.env.NODE_ENV === 'development') {
      socket.on('connect', () => {
        console.log('Socket connected:', socket?.id);
      });
      
      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });
      
      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
      });
    }
  }
  
  return socket;
};

export const connectSocket = (auth?: Record<string, unknown>) => {
  const s = getSocket();
  if (auth) {
    s.auth = auth;
  }
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
