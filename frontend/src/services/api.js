import { auth } from '../config/firebase';

/**
 * api.js — Centralized helper for all HTTP requests to our backend.
 *
 * Automatically resolves production backend URL from VITE_API_URL / VITE_BACKEND_URL,
 * sends session cookies (credentials: 'include'), and attaches Bearer tokens if signed in.
 */

const rawBase = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').trim().replace(/\/$/, '');
export const API_BASE = rawBase ? (rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`) : '/api';

/**
 * apiFetch — Low-level fetch wrapper.
 * Adds credentials, JSON headers, and Bearer token to every request.
 */
export async function apiFetch(path, options = {}) {
  let authHeader = {};
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const idToken = await currentUser.getIdToken();
      if (idToken) {
        authHeader = { Authorization: `Bearer ${idToken}` };
      }
    }
  } catch (err) {
    // Ignore auth token errors if Firebase is not initialized or user is logged out
  }

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
    ...options,
  });
  return response;
}

/**
 * apiGet — Fetch data from the backend (HTTP GET).
 */
export async function apiGet(path) {
  const response = await apiFetch(path);

  if (!response.ok) {
    throw new Error(`GET ${path} failed with status: ${response.status}`);
  }

  return response.json();
}

/**
 * apiPost — Send data to the backend (HTTP POST).
 */
export async function apiPost(path, body) {
  const response = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return response;
}
