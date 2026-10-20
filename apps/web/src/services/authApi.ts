import { authorizedAxios } from '../lib/authorizedAxios';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
}

/**
 * Authenticates user credentials.
 *
 * @param _payload - Login credentials (email, password).
 * @returns {Promise<AuthResult>} User profile and access token.
 *
 * Specification for student implementation:
 * - Send POST /auth/login with `_payload`.
 * - Expect response data shape `{ data: { user, accessToken } }`.
 */
export async function login(_payload: LoginPayload): Promise<AuthResult> {
  void authorizedAxios;
  // SKELETON: To be implemented by student
  throw new Error('Not implemented: login');
}

/**
 * Registers a new customer account.
 *
 * @param _payload - Registration fields (email, password, fullName, phone).
 * @returns {Promise<{ user: User }>} Created user profile.
 *
 * Specification for student implementation:
 * - Send POST /auth/register with `_payload`.
 * - Expect response data shape `{ data: { user } }`.
 */
export async function register(_payload: RegisterPayload): Promise<{ user: User }> {
  void authorizedAxios;
  // SKELETON: To be implemented by student
  throw new Error('Not implemented: register');
}

/**
 * Refreshes an expired access token using the HTTP-only refresh token cookie.
 *
 * @returns {Promise<AuthResult>} New access token and user profile.
 *
 * Specification for student implementation:
 * - Send POST /auth/refresh-token.
 * - Expect response data shape `{ data: { user, accessToken } }`.
 */
export async function refreshToken(): Promise<AuthResult> {
  void authorizedAxios;
  // SKELETON: To be implemented by student
  throw new Error('Not implemented: refreshToken');
}

/**
 * Logs out the current user session and clears authentication cookies.
 *
 * Specification for student implementation:
 * - Send POST /auth/logout.
 */
export async function logout(): Promise<void> {
  void authorizedAxios;
  // SKELETON: To be implemented by student
  throw new Error('Not implemented: logout');
}

/**
 * Fetches the currently authenticated user's profile.
 *
 * @returns {Promise<User>} Authenticated user profile.
 *
 * Specification for student implementation:
 * - Send GET /auth/me.
 * - Expect response data shape `{ data: { user } }`.
 */
export async function getMe(): Promise<User> {
  void authorizedAxios;
  // SKELETON: To be implemented by student
  throw new Error('Not implemented: getMe');
}
