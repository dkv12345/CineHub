import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  registerBody,
  loginBody,
  verifyEmailBody,
  resendVerificationBody,
  refreshTokenBody,
  googleAuthBody,
  forgotPasswordBody,
  resetPasswordBody,
  lockSeatsSchema,
  updateConcessionsSchema,
  applyVoucherSchema,
  chatMessageBody,
  recommendationsBody,
} from './schemas.js';

extendZodWithOpenApi(z);

/**
 * Generates the canonical OpenAPI 3.1 specification for the CineHub Core API.
 * Used by `npm run api:spec` and `npm run api:client`.
 */
export function generateOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  const ErrorEnvelope = registry.register(
    'ErrorEnvelope',
    z.object({
      error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional(),
      }),
    }),
  );

  const UserDto = registry.register(
    'UserDto',
    z.object({
      id: z.string(),
      email: z.string().email(),
      fullName: z.string(),
      phone: z.string().nullable().optional(),
      avatarUrl: z.string().nullable().optional(),
      role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']),
      status: z.enum(['ACTIVE', 'LOCKED', 'DELETED']),
      emailVerified: z.boolean().optional(),
    }),
  );

  const AuthSessionResponse = registry.register(
    'AuthSessionResponse',
    z.object({
      data: z.object({
        accessToken: z.string(),
        refreshToken: z.string().optional(),
        user: UserDto,
      }),
    }),
  );

  const CinemaDto = registry.register(
    'CinemaDto',
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string().optional(),
      chain: z.string(),
      address: z.string(),
      city: z.string().optional(),
      province: z.string().optional(),
      phone: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    }),
  );

  const MovieDto = registry.register(
    'MovieDto',
    z.object({
      id: z.string(),
      title: z.string(),
      originalTitle: z.string().nullable().optional(),
      slug: z.string().optional(),
      synopsis: z.string().nullable().optional(),
      durationMinutes: z.number().int(),
      releaseDate: z.string().nullable().optional(),
      status: z.enum(['COMING_SOON', 'NOW_SHOWING', 'ENDED']),
      ageRating: z.enum(['P', 'K', 'T13', 'T16', 'T18', 'C']),
      posterUrl: z.string().nullable().optional(),
      backdropUrl: z.string().nullable().optional(),
      trailerUrl: z.string().nullable().optional(),
      genres: z.array(z.string()).default([]),
      rating: z.number().nullable().optional(),
    }),
  );

  const SessionDto = registry.register(
    'SessionDto',
    z.object({
      id: z.string(),
      movieId: z.string(),
      cinemaId: z.string(),
      hallId: z.string().optional(),
      hallName: z.string().optional(),
      startTime: z.string(),
      endTime: z.string().optional(),
      format: z.string(),
      captionMode: z.string().optional(),
      basePrice: z.number(),
    }),
  );

  const ConcessionDto = registry.register(
    'ConcessionDto',
    z.object({
      id: z.string(),
      code: z.string().optional(),
      name: z.string(),
      description: z.string().nullable().optional(),
      category: z.enum(['COMBO', 'POPCORN', 'DRINK', 'SNACK']),
      price: z.number(),
      imageUrl: z.string().nullable().optional(),
    }),
  );

  registry.register('RegisterRequest', registerBody);
  registry.register('LoginRequest', loginBody);
  registry.register('VerifyEmailRequest', verifyEmailBody);
  registry.register('ResendVerificationRequest', resendVerificationBody);
  registry.register('RefreshTokenRequest', refreshTokenBody);
  registry.register('GoogleAuthRequest', googleAuthBody);
  registry.register('ForgotPasswordRequest', forgotPasswordBody);
  registry.register('ResetPasswordRequest', resetPasswordBody);
  registry.register('LockSeatsRequest', lockSeatsSchema);
  registry.register('UpdateConcessionsRequest', updateConcessionsSchema);
  registry.register('ApplyVoucherRequest', applyVoucherSchema);
  registry.register('ChatMessageRequest', chatMessageBody);
  registry.register('RecommendationsRequest', recommendationsBody);

  // Health
  registry.registerPath({
    method: 'get',
    path: '/api/v1/health',
    operationId: 'getHealth',
    tags: ['Health'],
    summary: 'Check API and database liveness',
    responses: {
      200: {
        description: 'Service is healthy',
        content: {
          'application/json': {
            schema: z.object({
              status: z.string(),
              db: z.string(),
            }),
          },
        },
      },
    },
  });

  // Auth
  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/register',
    operationId: 'registerUser',
    tags: ['Auth'],
    summary: 'Register a new customer account',
    request: {
      body: { content: { 'application/json': { schema: registerBody } } },
    },
    responses: {
      201: {
        description: 'Registration created; verification OTP sent',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string().optional(),
              data: z.object({ user: UserDto }).optional(),
            }),
          },
        },
      },
      400: {
        description: 'Validation error',
        content: { 'application/json': { schema: ErrorEnvelope } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/verify-email',
    operationId: 'verifyEmail',
    tags: ['Auth'],
    summary: 'Verify customer email with 6-digit OTP',
    request: {
      body: { content: { 'application/json': { schema: verifyEmailBody } } },
    },
    responses: {
      200: {
        description: 'Email verified and session issued',
        content: { 'application/json': { schema: AuthSessionResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/resend-verification',
    operationId: 'resendVerification',
    tags: ['Auth'],
    summary: 'Resend 6-digit verification OTP',
    request: {
      body: { content: { 'application/json': { schema: resendVerificationBody } } },
    },
    responses: {
      200: {
        description: 'OTP sent',
        content: { 'application/json': { schema: z.object({ message: z.string() }) } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/login',
    operationId: 'loginUser',
    tags: ['Auth'],
    summary: 'Authenticate with email and password',
    request: {
      body: { content: { 'application/json': { schema: loginBody } } },
    },
    responses: {
      200: {
        description: 'Authenticated',
        content: { 'application/json': { schema: AuthSessionResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/google',
    operationId: 'loginWithGoogle',
    tags: ['Auth'],
    summary: 'Authenticate with Google ID token',
    request: {
      body: { content: { 'application/json': { schema: googleAuthBody } } },
    },
    responses: {
      200: {
        description: 'Authenticated via Google',
        content: { 'application/json': { schema: AuthSessionResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'put',
    path: '/api/v1/auth/refresh-token',
    operationId: 'refreshAccessToken',
    tags: ['Auth'],
    summary: 'Rotate refresh token and issue a new access token',
    request: {
      body: { content: { 'application/json': { schema: refreshTokenBody } } },
    },
    responses: {
      200: {
        description: 'Token refreshed',
        content: { 'application/json': { schema: AuthSessionResponse } },
      },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/api/v1/auth/logout',
    operationId: 'logoutUser',
    tags: ['Auth'],
    summary: 'Clear session and revoke refresh token cookie',
    responses: {
      200: {
        description: 'Logged out',
        content: { 'application/json': { schema: z.object({ message: z.string() }) } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/forgot-password',
    operationId: 'forgotPassword',
    tags: ['Auth'],
    summary: 'Request password reset link via email',
    request: {
      body: { content: { 'application/json': { schema: forgotPasswordBody } } },
    },
    responses: {
      200: {
        description: 'Reset email dispatched if account exists',
        content: { 'application/json': { schema: z.object({ message: z.string() }) } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/v1/auth/reset-password',
    operationId: 'resetPassword',
    tags: ['Auth'],
    summary: 'Complete password reset using token',
    request: {
      body: { content: { 'application/json': { schema: resetPasswordBody } } },
    },
    responses: {
      200: {
        description: 'Password updated',
        content: { 'application/json': { schema: z.object({ message: z.string() }) } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/auth/me',
    operationId: 'getCurrentUser',
    tags: ['Auth'],
    security: [{ [bearerAuth.name]: [] }],
    summary: 'Get currently authenticated user profile',
    responses: {
      200: {
        description: 'Current user profile',
        content: {
          'application/json': {
            schema: z.object({ data: z.object({ user: UserDto }) }),
          },
        },
      },
    },
  });

  // Cinemas
  registry.registerPath({
    method: 'get',
    path: '/api/v1/cinemas',
    operationId: 'listCinemas',
    tags: ['Cinemas'],
    summary: 'List cinemas with optional chain and province filters',
    request: {
      query: z.object({
        page: z.number().int().optional(),
        pageSize: z.number().int().optional(),
        chain: z.string().optional(),
        province: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: 'Cinema list',
        content: {
          'application/json': {
            schema: z.object({ data: z.array(CinemaDto) }),
          },
        },
      },
    },
  });

  // Movies
  registry.registerPath({
    method: 'get',
    path: '/api/v1/movies',
    operationId: 'listMovies',
    tags: ['Movies'],
    summary: 'List movies in catalog',
    responses: {
      200: {
        description: 'Movie list',
        content: {
          'application/json': {
            schema: z.object({ data: z.array(MovieDto) }),
          },
        },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/v1/movies/{id}',
    operationId: 'getMovieById',
    tags: ['Movies'],
    summary: 'Get movie details by ID',
    request: {
      params: z.object({ id: z.string() }),
    },
    responses: {
      200: {
        description: 'Movie details',
        content: {
          'application/json': {
            schema: z.object({ data: MovieDto }),
          },
        },
      },
    },
  });

  // Sessions
  registry.registerPath({
    method: 'get',
    path: '/api/v1/sessions',
    operationId: 'listSessions',
    tags: ['Sessions'],
    summary: 'List showtime sessions by movie, cinema, or date',
    request: {
      query: z.object({
        movieId: z.string().optional(),
        cinemaId: z.string().optional(),
        date: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: 'Session list',
        content: {
          'application/json': {
            schema: z.object({ data: z.array(SessionDto) }),
          },
        },
      },
    },
  });

  // Concessions
  registry.registerPath({
    method: 'get',
    path: '/api/v1/concessions',
    operationId: 'listConcessions',
    tags: ['Concessions'],
    summary: 'List F&B concessions by chain and cinema code',
    request: {
      query: z.object({
        chain: z.string().optional(),
        cinemaCode: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: 'Concession list',
        content: {
          'application/json': {
            schema: z.object({ data: z.array(ConcessionDto) }),
          },
        },
      },
    },
  });

  // Chatbot
  registry.registerPath({
    method: 'post',
    path: '/api/v1/chatbot/message',
    operationId: 'sendChatMessage',
    tags: ['Assistant'],
    summary: 'Send a message to the CineHub AI assistant',
    request: {
      body: { content: { 'application/json': { schema: chatMessageBody } } },
    },
    responses: {
      200: {
        description: 'Assistant response',
        content: {
          'application/json': {
            schema: z.object({
              sessionId: z.string(),
              reply: z.string(),
              intent: z.string().optional(),
            }),
          },
        },
      },
    },
  });

  // Recommendations
  registry.registerPath({
    method: 'post',
    path: '/api/v1/recommendations',
    operationId: 'getRecommendations',
    tags: ['Assistant'],
    summary: 'Get personalized AI movie recommendations',
    request: {
      body: { content: { 'application/json': { schema: recommendationsBody } } },
    },
    responses: {
      200: {
        description: 'Recommended movies',
        content: {
          'application/json': {
            schema: z.object({
              data: z.array(MovieDto),
            }),
          },
        },
      },
    },
  });

  // Booking (Planned Skeleton)
  registry.registerPath({
    method: 'get',
    path: '/api/v1/booking/status',
    operationId: 'getBookingModuleStatus',
    tags: ['Booking'],
    summary: 'Inspect planned booking module status',
    responses: {
      200: {
        description: 'Booking module status',
        content: {
          'application/json': {
            schema: z.object({
              module: z.literal('booking'),
              status: z.literal('planned'),
            }),
          },
        },
      },
    },
  });

  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'CineHub Core API',
      version: '1.0.0',
      description:
        'Enterprise Cinema Ticketing Platform REST API (Contract-First from @cinehub/contracts Zod schemas).',
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Local Core API' },
      { url: 'http://localhost:4200', description: 'Angular Dev Server Proxy' },
    ],
  });
}
