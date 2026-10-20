import { env } from './env.js';

/**
 * CORS Configuration Options for Express application.
 *
 * Allows cross-origin requests from client applications with credentials.
 * Credentials support is mandatory for exchanging HTTP-only refresh token cookies.
 */
export const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., server-to-server, mobile apps, curl)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      env.CORS_ORIGIN,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ].filter(Boolean);

    if (allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400,
};
