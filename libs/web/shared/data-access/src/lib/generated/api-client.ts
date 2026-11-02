/* eslint-disable */
/**
 * AUTO-GENERATED FILE — DO NOT EDIT MANUALLY.
 * Source: docs/api/openapi.json (generated from @cinehub/contracts via tools/openapi/generate-angular-client.mjs)
 * Regenerate with: npm run api:spec && npm run api:client
 */

export type HttpRequestExecutor = <TResponse>(
  method: string,
  url: string,
  body?: unknown,
) => Promise<TResponse>;

export type ErrorEnvelope = {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
};

export type UserDto = {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly phone?: string | null;
  readonly avatarUrl?: string | null;
  readonly role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  readonly status: 'ACTIVE' | 'LOCKED' | 'DELETED';
  readonly emailVerified?: boolean;
};

export type AuthSessionResponse = {
  readonly data: {
    readonly accessToken: string;
    readonly refreshToken?: string;
    readonly user: UserDto;
  };
};

export type CinemaDto = {
  readonly id: string;
  readonly name: string;
  readonly slug?: string;
  readonly chain: string;
  readonly address: string;
  readonly city?: string;
  readonly province?: string;
  readonly phone?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
};

export type MovieDto = {
  readonly id: string;
  readonly title: string;
  readonly originalTitle?: string | null;
  readonly slug?: string;
  readonly synopsis?: string | null;
  readonly durationMinutes: number;
  readonly releaseDate?: string | null;
  readonly status: 'COMING_SOON' | 'NOW_SHOWING' | 'ENDED';
  readonly ageRating: 'P' | 'K' | 'T13' | 'T16' | 'T18' | 'C';
  readonly posterUrl?: string | null;
  readonly backdropUrl?: string | null;
  readonly trailerUrl?: string | null;
  readonly genres?: Array<string>;
  readonly rating?: number | null;
};

export type SessionDto = {
  readonly id: string;
  readonly movieId: string;
  readonly cinemaId: string;
  readonly hallId?: string;
  readonly hallName?: string;
  readonly startTime: string;
  readonly endTime?: string;
  readonly format: string;
  readonly captionMode?: string;
  readonly basePrice: number;
};

export type ConcessionDto = {
  readonly id: string;
  readonly code?: string;
  readonly name: string;
  readonly description?: string | null;
  readonly category: 'COMBO' | 'POPCORN' | 'DRINK' | 'SNACK';
  readonly price: number;
  readonly imageUrl?: string | null;
};

export type RegisterRequest = {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly phone?: string;
};

export type LoginRequest = {
  readonly email: string;
  readonly password: string;
};

export type VerifyEmailRequest = {
  readonly email: string;
  readonly code: string;
};

export type ResendVerificationRequest = {
  readonly email: string;
};

export type RefreshTokenRequest = {
  readonly refreshToken?: string;
};

export type GoogleAuthRequest = {
  readonly idToken: string;
};

export type ForgotPasswordRequest = {
  readonly email: string;
};

export type ResetPasswordRequest = {
  readonly token: string;
  readonly newPassword: string;
};

export type LockSeatsRequest = {
  readonly showtimeId: string;
  readonly seatIds: Array<string>;
};

export type UpdateConcessionsRequest = {
  readonly items: Array<{
    readonly concessionId: string;
    readonly quantity: number;
  }>;
};

export type ApplyVoucherRequest = {
  readonly code: string;
};

export type ChatMessageRequest = {
  readonly message: string;
  readonly sessionId?: string;
};

export type RecommendationsRequest = {
  readonly recentMovieIds?: Array<string>;
  readonly favoriteMovieIds?: Array<string>;
};

export class CineHubGeneratedApiClient {
  constructor(private readonly request: HttpRequestExecutor) {}

  private buildQueryString(params?: Record<string, unknown>): string {
    if (!params) return '';
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        search.set(key, String(value));
      }
    }
    return search.toString();
  }

  /**
   * Check API and database liveness
   * `GET /api/v1/health`
   */
  getHealth(): Promise<{
    readonly status: string;
    readonly db: string;
  }> {
    const url = '/api/v1/health';
    return this.request<{
      readonly status: string;
      readonly db: string;
    }>('GET', url);
  }

  /**
   * Register a new customer account
   * `POST /api/v1/auth/register`
   */
  registerUser(body: {
    readonly fullName: string;
    readonly email: string;
    readonly password: string;
    readonly phone?: string;
  }): Promise<{
    readonly message?: string;
    readonly data?: {
      readonly user: UserDto;
    };
  }> {
    const url = '/api/v1/auth/register';
    return this.request<{
      readonly message?: string;
      readonly data?: {
        readonly user: UserDto;
      };
    }>('POST', url, body);
  }

  /**
   * Verify customer email with 6-digit OTP
   * `POST /api/v1/auth/verify-email`
   */
  verifyEmail(body: {
    readonly email: string;
    readonly code: string;
  }): Promise<AuthSessionResponse> {
    const url = '/api/v1/auth/verify-email';
    return this.request<AuthSessionResponse>('POST', url, body);
  }

  /**
   * Resend 6-digit verification OTP
   * `POST /api/v1/auth/resend-verification`
   */
  resendVerification(body: { readonly email: string }): Promise<{
    readonly message: string;
  }> {
    const url = '/api/v1/auth/resend-verification';
    return this.request<{
      readonly message: string;
    }>('POST', url, body);
  }

  /**
   * Authenticate with email and password
   * `POST /api/v1/auth/login`
   */
  loginUser(body: {
    readonly email: string;
    readonly password: string;
  }): Promise<AuthSessionResponse> {
    const url = '/api/v1/auth/login';
    return this.request<AuthSessionResponse>('POST', url, body);
  }

  /**
   * Authenticate with Google ID token
   * `POST /api/v1/auth/google`
   */
  loginWithGoogle(body: { readonly idToken: string }): Promise<AuthSessionResponse> {
    const url = '/api/v1/auth/google';
    return this.request<AuthSessionResponse>('POST', url, body);
  }

  /**
   * Rotate refresh token and issue a new access token
   * `PUT /api/v1/auth/refresh-token`
   */
  refreshAccessToken(body: { readonly refreshToken?: string }): Promise<AuthSessionResponse> {
    const url = '/api/v1/auth/refresh-token';
    return this.request<AuthSessionResponse>('PUT', url, body);
  }

  /**
   * Clear session and revoke refresh token cookie
   * `DELETE /api/v1/auth/logout`
   */
  logoutUser(): Promise<{
    readonly message: string;
  }> {
    const url = '/api/v1/auth/logout';
    return this.request<{
      readonly message: string;
    }>('DELETE', url);
  }

  /**
   * Request password reset link via email
   * `POST /api/v1/auth/forgot-password`
   */
  forgotPassword(body: { readonly email: string }): Promise<{
    readonly message: string;
  }> {
    const url = '/api/v1/auth/forgot-password';
    return this.request<{
      readonly message: string;
    }>('POST', url, body);
  }

  /**
   * Complete password reset using token
   * `POST /api/v1/auth/reset-password`
   */
  resetPassword(body: { readonly token: string; readonly newPassword: string }): Promise<{
    readonly message: string;
  }> {
    const url = '/api/v1/auth/reset-password';
    return this.request<{
      readonly message: string;
    }>('POST', url, body);
  }

  /**
   * Get currently authenticated user profile
   * `GET /api/v1/auth/me`
   */
  getCurrentUser(): Promise<{
    readonly data: {
      readonly user: UserDto;
    };
  }> {
    const url = '/api/v1/auth/me';
    return this.request<{
      readonly data: {
        readonly user: UserDto;
      };
    }>('GET', url);
  }

  /**
   * List cinemas with optional chain and province filters
   * `GET /api/v1/cinemas`
   */
  listCinemas(params?: {
    readonly page?: number;
    readonly pageSize?: number;
    readonly chain?: string;
    readonly province?: string;
  }): Promise<{
    readonly data: Array<CinemaDto>;
  }> {
    const query = this.buildQueryString(params);
    const url = query ? `${'/api/v1/cinemas'}?${query}` : '/api/v1/cinemas';
    return this.request<{
      readonly data: Array<CinemaDto>;
    }>('GET', url);
  }

  /**
   * List movies in catalog
   * `GET /api/v1/movies`
   */
  listMovies(): Promise<{
    readonly data: Array<MovieDto>;
  }> {
    const url = '/api/v1/movies';
    return this.request<{
      readonly data: Array<MovieDto>;
    }>('GET', url);
  }

  /**
   * Get movie details by ID
   * `GET /api/v1/movies/{id}`
   */
  getMovieById(id: string): Promise<{
    readonly data: MovieDto;
  }> {
    const url = `/api/v1/movies/${encodeURIComponent(id)}`;
    return this.request<{
      readonly data: MovieDto;
    }>('GET', url);
  }

  /**
   * List showtime sessions by movie, cinema, or date
   * `GET /api/v1/sessions`
   */
  listSessions(params?: {
    readonly movieId?: string;
    readonly cinemaId?: string;
    readonly date?: string;
  }): Promise<{
    readonly data: Array<SessionDto>;
  }> {
    const query = this.buildQueryString(params);
    const url = query ? `${'/api/v1/sessions'}?${query}` : '/api/v1/sessions';
    return this.request<{
      readonly data: Array<SessionDto>;
    }>('GET', url);
  }

  /**
   * List F&B concessions by chain and cinema code
   * `GET /api/v1/concessions`
   */
  listConcessions(params?: { readonly chain?: string; readonly cinemaCode?: string }): Promise<{
    readonly data: Array<ConcessionDto>;
  }> {
    const query = this.buildQueryString(params);
    const url = query ? `${'/api/v1/concessions'}?${query}` : '/api/v1/concessions';
    return this.request<{
      readonly data: Array<ConcessionDto>;
    }>('GET', url);
  }

  /**
   * Send a message to the CineHub AI assistant
   * `POST /api/v1/chatbot/message`
   */
  sendChatMessage(body: { readonly message: string; readonly sessionId?: string }): Promise<{
    readonly sessionId: string;
    readonly reply: string;
    readonly intent?: string;
  }> {
    const url = '/api/v1/chatbot/message';
    return this.request<{
      readonly sessionId: string;
      readonly reply: string;
      readonly intent?: string;
    }>('POST', url, body);
  }

  /**
   * Get personalized AI movie recommendations
   * `POST /api/v1/recommendations`
   */
  getRecommendations(body: {
    readonly recentMovieIds?: Array<string>;
    readonly favoriteMovieIds?: Array<string>;
  }): Promise<{
    readonly data: Array<MovieDto>;
  }> {
    const url = '/api/v1/recommendations';
    return this.request<{
      readonly data: Array<MovieDto>;
    }>('POST', url, body);
  }

  /**
   * Inspect planned booking module status
   * `GET /api/v1/booking/status`
   */
  getBookingModuleStatus(): Promise<{
    readonly module: 'booking';
    readonly status: 'planned';
  }> {
    const url = '/api/v1/booking/status';
    return this.request<{
      readonly module: 'booking';
      readonly status: 'planned';
    }>('GET', url);
  }
}
