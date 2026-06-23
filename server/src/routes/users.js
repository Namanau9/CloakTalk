import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { getAllUsers, findUserById, updatePublicKey, updateLastSeen, searchUsers } from '../db.js';

const router = Router();

// List all users (excluding current user)
router.get('/', authMiddleware, (req, res) => {
  const users = getAllUsers(req.user.id);
  res.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      hasPublicKey: !!u.public_key,
      lastSeen: u.last_seen,
    })),
  });
});

// Search users
router.get('/search', authMiddleware, (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 1) {
    return res.json({ users: [] });
  }
  const users = searchUsers(q, req.user.id);
  res.json({ users });
});

// Get user by ID (including public key for E2E encryption)
router.get('/:id', authMiddleware, (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      // Parse the stored JSON string back to an object for the client
      publicKey: user.public_key ? JSON.parse(user.public_key) : null,
      lastSeen: user.last_seen,
    },
  });
});

// Update public key
router.put('/key', authMiddleware, (req, res) => {
  const { publicKey } = req.body;
  if (!publicKey) {
    return res.status(400).json({ error: 'Public key is required' });
  }
  updatePublicKey(req.user.id, JSON.stringify(publicKey));
  res.json({ success: true });
});

// Update last seen
router.post('/ping', authMiddleware, (req, res) => {
  updateLastSeen(req.user.id);
  res.json({ success: true });
});

export default router;
