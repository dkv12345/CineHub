import { env } from './env.js';

/**
 * CORS Configuration Options for Express application.
 *
 * Allows cross-origin requests from whitelisted client origins with credentials enabled.
 * Credentials support is mandatory for exchanging HTTP-only refresh token cookies.
 * Note: Google OAuth "Authorized JavaScript origins" in Google Cloud Console must
 * include `http://localhost:4200` for local Angular development.
 */
export const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    const configuredOrigins = env.CORS_ORIGIN.split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    const allowedOrigins = new Set([
      ...configuredOrigins,
      env.CLIENT_URL,
      'http://localhost:4200',
      'http://127.0.0.1:4200',
    ]);

    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id'],
  exposedHeaders: ['Set-Cookie', 'X-Request-Id'],
  maxAge: 86400,
};
