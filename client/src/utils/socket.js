import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// Typing indicator with debounce
let typingTimeout = null;

export function emitTyping(socket, receiverId) {
  if (!socket) return;

  socket.emit('typing:start', { receiverId });

  if (typingTimeout) {
    clearTimeout(typingTimeout);
  }

  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { receiverId });
  }, 2000);
}

export function stopTyping(socket, receiverId) {
  if (!socket) return;

  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }

  socket.emit('typing:stop', { receiverId });
}
