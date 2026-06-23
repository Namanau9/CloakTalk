import { verifyToken } from './auth.js';
import { saveMessage, updateLastSeen } from './db.js';
import { v4 as uuidv4 } from 'uuid';

// Map of userId -> Set<socketId>
const onlineUsers = new Map();

export function setupSocket(io) {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Invalid or expired token'));
    }

    socket.userId = decoded.id;
    socket.userName = decoded.name;
    next();
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    console.log(`User connected: ${userId}`);

    // Track online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join personal room for direct messages
    socket.join(`user:${userId}`);

    // Update last seen
    updateLastSeen(userId);

    // Notify others that user is online
    socket.broadcast.emit('user:online', { userId });

    // Send current online users to the newly connected user
    const onlineUserIds = Array.from(onlineUsers.keys()).filter((id) => id !== userId);
    socket.emit('users:online', { userIds: onlineUserIds });

    // Handle explicit request for online users list
    socket.on('users:online:request', () => {
      const onlineUserIds = Array.from(onlineUsers.keys()).filter((id) => id !== userId);
      socket.emit('users:online', { userIds: onlineUserIds });
    });

    // Handle private message
    socket.on('message:send', (data, callback) => {
      try {
        const { receiverId, encryptedContent, iv } = data;

        if (!receiverId || !encryptedContent || !iv) {
          callback({ error: 'Missing required fields' });
          return;
        }

        const message = saveMessage({
          id: uuidv4(),
          senderId: userId,
          receiverId,
          encryptedContent,
          iv,
        });

        const messageData = {
          id: message.id,
          senderId: message.sender_id,
          receiverId: message.receiver_id,
          encryptedContent: message.encrypted_content,
          iv: message.iv,
          createdAt: message.created_at,
        };

        // Send to receiver's room
        io.to(`user:${receiverId}`).emit('message:received', messageData);

        // Also send back to sender for confirmation
        callback({ success: true, message: messageData });
      } catch (err) {
        console.error('Message send error:', err);
        callback({ error: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('typing:update', {
        userId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', ({ receiverId }) => {
      io.to(`user:${receiverId}`).emit('typing:update', {
        userId,
        isTyping: false,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);

      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit('user:offline', { userId });
        }
      }
    });
  });

  return io;
}
