import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';

/**
 * Google OAuth2 Client Singleton Instance (Skeleton).
 *
 * Configured using environment variables:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REDIRECT_URI
 */
export const oauth2Client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.GOOGLE_REDIRECT_URI,
);

/**
 * Verifies a Google ID token passed from frontend client (Google Sign-In / One Tap).
 *
 * @param {string} _idToken - Raw Google credential/id_token string.
 * @returns {Promise<{ googleId: string, email: string, name: string, picture: string | null, emailVerified: boolean }>}
 *
 * Specification for student implementation:
 * 1. Invoke `oauth2Client.verifyIdToken({ idToken: _idToken, audience: env.GOOGLE_CLIENT_ID })`.
 * 2. Extract ticket payload via `ticket.getPayload()`.
 * 3. Validate that `payload` exists and contains `sub` (Google User ID) and `email`.
 * 4. Return normalized object:
 *    - googleId: payload.sub
 *    - email: payload.email
 *    - name: payload.name || payload.email.split('@')[0]
 *    - picture: payload.picture || null
 *    - emailVerified: Boolean(payload.email_verified)
 * 5. Handle verification errors (e.g., token expired, invalid signature) by throwing appropriate AppError.
 */
export async function verifyGoogleIdToken(_idToken) {
  void oauth2Client;
  // SKELETON: To be implemented by student
  throw new Error('Not implemented: verifyGoogleIdToken');
}

/**
 * Generates Google OAuth authorization URL for traditional redirect code flow.
 *
 * @param {string} [_state] - Optional CSRF state string.
 * @returns {string} URL to redirect user to Google consent screen.
 *
 * Specification for student implementation:
 * 1. Invoke `oauth2Client.generateAuthUrl({
 *      access_type: 'offline',
 *      scope: ['profile', 'email'],
 *      prompt: 'consent',
 *      state: _state,
 *    })`.
 * 2. Return the authorization URL string.
 */
export function getGoogleAuthUrl(_state) {
  void oauth2Client;
  // SKELETON: To be implemented by student
  throw new Error('Not implemented: getGoogleAuthUrl');
}
