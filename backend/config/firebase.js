import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

/**
 * Firebase Admin SDK — Used on the backend (server-side only) for:
 *   - Verifying session cookies when users make API requests
 *   - Revoking sessions when users sign out
 *
 * Unlike the client SDK, Admin SDK uses a private service account key.
 * These keys must NEVER be exposed in the frontend.
 * They are loaded from environment variables (.env file).
 */

/**
 * getAdminApp — Returns the initialized Firebase Admin App (creates it if needed).
 *
 * We name our app "admin" so it doesn't conflict with any other Firebase apps.
 * We check if it already exists before creating it, so this is safe to call
 * multiple times without causing a "duplicate app" error.
 */
function getAdminApp() {
  // Check if we've already initialized the admin app
  const existingApp = getApps().find(app => app.name === 'admin');
  if (existingApp) return existingApp;

  // If not, create a new one using our service account credentials
  return initializeApp(
    {
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Private keys in env variables may be wrapped in quotes or have literal \n characters
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '')
          .trim()
          .replace(/^["']|["']$/g, '')
          .replace(/\\n/g, '\n'),
      }),
    },
    'admin' // Name this app "admin" to avoid conflicts
  );
}

/**
 * adminAuth — Returns the Firebase Admin Auth service.
 *
 * Called as a function (not a constant) so Firebase is only initialized
 * when first needed, not when the file is imported.
 *
 * Usage:
 *   const decoded = await adminAuth().verifySessionCookie(cookie, true);
 */
export const adminAuth = () => getAuth(getAdminApp());
