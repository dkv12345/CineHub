import axios from 'axios';
import { authorizedAxios, refreshAccessToken, setAccessToken } from '../lib/authorizedAxios';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  phone?: string | null;
  avatarUrl?: string | null;
  authProvider?: 'LOCAL' | 'GOOGLE';
  emailVerified?: boolean;
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

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
}

/**
 * Authenticates user credentials and keeps the access token in memory.
 *
 * Rejects with code `EMAIL_NOT_VERIFIED` when the account still has to confirm its e-mail OTP.
 *
 * @param payload - Login credentials (email, password).
 * @returns {Promise<AuthResult>} User profile and access token.
 */
export async function login(payload: LoginPayload): Promise<AuthResult> {
  const { data } = await authorizedAxios.post<{ data: AuthResult }>('/auth/login', payload);
  setAccessToken(data.data.accessToken);
  return data.data;
}

/**
 * Registers a new customer account. The server e-mails a 6-digit OTP; no session is created yet.
 *
 * @param payload - Registration fields (email, password, fullName, phone).
 * @returns {Promise<{ user: User }>} Created (unverified) user profile.
 */
export async function register(payload: RegisterPayload): Promise<{ user: User }> {
  const { data } = await authorizedAxios.post<{ data: { user: User } }>('/auth/register', payload);
  return data.data;
}

/**
 * Confirms the e-mail OTP. On success the server activates the account and signs the user in.
 *
 * @param payload - Account e-mail and the 6-digit code.
 * @returns {Promise<AuthResult>} User profile and access token.
 */
export async function verifyEmail(payload: VerifyEmailPayload): Promise<AuthResult> {
  const { data } = await authorizedAxios.post<{ data: AuthResult }>('/auth/verify-email', payload);
  setAccessToken(data.data.accessToken);
  return data.data;
}

/**
 * Requests a new verification OTP for an unverified account.
 */
export async function resendVerification(email: string): Promise<void> {
  await authorizedAxios.post('/auth/resend-verification', { email });
}

/**
 * Refreshes (or restores after a page reload) the session using the HTTP-only refresh cookie.
 *
 * @returns {Promise<AuthResult>} New access token and user profile.
 */
export async function refreshToken(): Promise<AuthResult> {
  return (await refreshAccessToken()) as AuthResult;
}

/**
 * Logs out the current user session and clears authentication cookies.
 */
export async function logout(): Promise<void> {
  try {
    await authorizedAxios.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

/**
 * Fetches the currently authenticated user's profile.
 *
 * @returns {Promise<User>} Authenticated user profile.
 */
export async function getMe(): Promise<User> {
  const { data } = await authorizedAxios.get<{ data: { user: User } }>('/auth/me');
  return data.data.user;
}

/**
 * Asks the server to e-mail a password-reset link. The response is intentionally generic.
 */
export async function forgotPassword(email: string): Promise<void> {
  await authorizedAxios.post('/auth/forgot-password', { email });
}

/**
 * Sets a new password using the token from the reset e-mail.
 */
export async function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  await authorizedAxios.post('/auth/reset-password', payload);
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
  EMAIL_NOT_VERIFIED: 'Tài khoản chưa được xác thực email.',
  CONFLICT: 'Email này đã được đăng ký. Hãy đăng nhập hoặc dùng email khác.',
  INVALID_CODE: 'Mã xác thực không đúng hoặc đã hết hạn.',
  ALREADY_VERIFIED: 'Email đã được xác thực. Vui lòng đăng nhập.',
  INVALID_TOKEN: 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
  OTP_COOLDOWN: 'Vui lòng đợi một chút trước khi yêu cầu mã mới.',
  TOO_MANY_REQUESTS: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
  VALIDATION_ERROR: 'Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.',
};

/** Returns the API error code (e.g. `INVALID_CREDENTIALS`) carried by a failed request, if any. */
export function authErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError<{ error?: { code?: string } }>(error)) {
    return error.response?.data?.error?.code;
  }
  return undefined;
}

/** Converts any auth failure into a Vietnamese message that is safe to show to the user. */
export function authErrorMessage(error: unknown): string {
  const code = authErrorCode(error);
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (axios.isAxiosError(error) && !error.response) {
    return 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  }
  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}
