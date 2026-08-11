import { adminAuth } from '../config/firebase.js';
import User from '../models/User.js';

/**
 * Helper to determine cookie security settings for cross-domain / production setups
 */
function getCookieOptions(req) {
  const isSecure = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    path: '/',
  };
}

/**
 * POST /api/auth/session
 * Logs a user in by exchanging their Firebase ID token for a secure session cookie.
 */
export async function createSession(req, res) {
  try {
    const { idToken } = req.body;
    const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 days

    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn });

    const cookieOpts = {
      ...getCookieOptions(req),
      maxAge: expiresIn,
    };

    res.cookie('voxtutor-session', sessionCookie, cookieOpts);

    return res.json({ ok: true });
  } catch (err) {
    console.error('Create session error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * POST /api/auth/revoke
 * Logs a user out by deleting their session cookie.
 */
export async function revokeSession(req, res) {
  res.clearCookie('voxtutor-session', getCookieOptions(req));
  return res.json({ ok: true });
}

/**
 * GET /api/auth/me
 * Checks if the user is currently logged in via session cookie OR Bearer token.
 */
export async function getCurrentUser(req, res) {
  const sessionCookie = req.cookies['voxtutor-session'];
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!sessionCookie && !bearerToken) {
    return res.json({ user: null });
  }

  try {
    let uid = null;

    if (sessionCookie) {
      try {
        const decoded = await adminAuth().verifySessionCookie(sessionCookie, true);
        uid = decoded.uid;
      } catch {
        // session cookie expired or invalid, fallback to bearer token
      }
    }

    if (!uid && bearerToken) {
      try {
        const decoded = await adminAuth().verifyIdToken(bearerToken);
        uid = decoded.uid;
      } catch {
        try {
          const decoded = await adminAuth().verifySessionCookie(bearerToken, true);
          uid = decoded.uid;
        } catch {
          // both failed
        }
      }
    }

    if (!uid) {
      return res.json({ user: null });
    }

    const user = await User.findOne({ uid }).lean();
    return res.json({ user: user || null });
  } catch {
    return res.json({ user: null });
  }
}

/**
 * POST /api/auth/upsert-user
 * Creates a new user in the database, or updates an existing user's profile.
 */
export async function upsertUser(req, res) {
  try {
    const { uid, name, email, photoURL } = req.body;

    const user = await User.findOneAndUpdate(
      { uid },
      { uid, name, email, photoURL: photoURL || '' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ ok: true, user });
  } catch (err) {
    console.error('Upsert user error:', err);
    return res.status(500).json({ error: 'Failed to save user' });
  }
}
