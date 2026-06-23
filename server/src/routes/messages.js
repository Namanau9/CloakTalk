import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { saveMessage, getConversation } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get conversation with a specific user
router.get('/:userId', authMiddleware, (req, res) => {
  const messages = getConversation(req.user.id, req.params.userId);
  res.json({
    messages: messages.map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      receiverId: m.receiver_id,
      encryptedContent: m.encrypted_content,
      iv: m.iv,
      createdAt: m.created_at,
    })),
  });
});

// Save a new message (also emitted via Socket.IO)
router.post('/', authMiddleware, (req, res) => {
  const { receiverId, encryptedContent, iv } = req.body;

  if (!receiverId || !encryptedContent || !iv) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const message = saveMessage({
    id: uuidv4(),
    senderId: req.user.id,
    receiverId,
    encryptedContent,
    iv,
  });

  res.json({
    message: {
      id: message.id,
      senderId: message.sender_id,
      receiverId: message.receiver_id,
      encryptedContent: message.encrypted_content,
      iv: message.iv,
      createdAt: message.created_at,
    },
  });
});

export default router;
