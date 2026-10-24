import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

/**
 * Google OAuth2 Client Singleton Instance.
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
 * @param {string} idToken - Raw Google credential/id_token string.
 * @returns {Promise<{ googleId: string, email: string, name: string, picture: string | null, emailVerified: boolean }>}
 */
export async function verifyGoogleIdToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new AppError(400, 'BAD_REQUEST', 'Google ID token is required');
  }

  if (!env.GOOGLE_CLIENT_ID) {
    throw new AppError(500, 'INTERNAL_SERVER_ERROR', 'Google OAuth client ID is not configured');
  }

  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      throw new AppError(401, 'INVALID_GOOGLE_TOKEN', 'Invalid Google token payload');
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase().trim(),
      name: payload.name || payload.email.split('@')[0],
      picture: payload.picture || null,
      emailVerified: Boolean(payload.email_verified),
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      401,
      'INVALID_GOOGLE_TOKEN',
      error.message || 'Google token verification failed',
    );
  }
}

/**
 * Generates Google OAuth authorization URL for traditional redirect code flow.
 *
 * @param {string} [state] - Optional CSRF state string.
 * @returns {string} URL to redirect user to Google consent screen.
 */
export function getGoogleAuthUrl(state) {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email'],
    prompt: 'consent',
    state,
  });
}
