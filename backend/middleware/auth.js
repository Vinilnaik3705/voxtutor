import { adminAuth } from '../config/firebase.js';
import User from '../models/User.js';

/**
 * requireAuth — Middleware for protecting routes.
 * Supports session cookies AND Bearer ID tokens for cross-domain compatibility.
 */
export async function requireAuth(req, res, next) {
  const sessionCookie = req.cookies['voxtutor-session'];
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!sessionCookie && !bearerToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    let uid = null;

    if (sessionCookie) {
      try {
        const decodedToken = await adminAuth().verifySessionCookie(sessionCookie, true);
        uid = decodedToken.uid;
      } catch {
        // Fallback to bearer token if session cookie fails
      }
    }

    if (!uid && bearerToken) {
      try {
        const decodedToken = await adminAuth().verifyIdToken(bearerToken);
        uid = decodedToken.uid;
      } catch {
        try {
          const decodedCookie = await adminAuth().verifySessionCookie(bearerToken, true);
          uid = decodedCookie.uid;
        } catch {
          // both failed
        }
      }
    }

    if (!uid) {
      return res.status(401).json({ error: 'Invalid authentication credentials' });
    }

    const user = await User.findOne({ uid }).lean();

    if (!user) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}
