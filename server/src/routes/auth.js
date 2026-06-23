import { Router } from 'express';
import passport from 'passport';
import { generateToken, verifyToken } from '../auth.js';
import { findUserByGoogleId, findUserById, createUser } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Start Google OAuth flow
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);  // Google OAuth callback
  router.get(
    '/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:5173'}/login?error=auth_failed`,
    }),
    (req, res) => {
      const token = generateToken(req.user);
      const redirectUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      // Use URL fragment (#) instead of query parameter (?) to avoid
      // exposing the JWT in server logs, browser history, and Referer headers
      res.redirect(`${redirectUrl}/auth-callback#token=${token}`);
    }
  );

// Exchange Google access token for JWT (for Google One Tap / mobile flow)
router.post('/google/exchange', async (req, res) => {
  try {
    const { googleToken } = req.body;

    if (!googleToken) {
      return res.status(400).json({ error: 'Google token is required' });
    }

    // Fetch profile from Google using the access token
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${googleToken}`
    );

    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    const profile = await response.json();
    let user = findUserByGoogleId(profile.sub);

    if (!user) {
      user = createUser({
        id: uuidv4(),
        googleId: profile.sub,
        name: profile.name,
        email: profile.email,
        avatar: profile.picture || null,
      });
    }

    const token = generateToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) {
    console.error('Google exchange error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Get current user info
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const decoded = verifyToken(authHeader.split(' ')[1]);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const userById = findUserById(decoded.id);

  if (userById) {
    res.json({ user: { id: userById.id, name: userById.name, email: userById.email, avatar: userById.avatar, publicKey: userById.public_key } });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

export default router;
