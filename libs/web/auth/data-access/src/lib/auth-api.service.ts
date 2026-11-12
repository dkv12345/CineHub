import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface AuthUserDto {
  readonly id: string;
  readonly email: string;
  readonly fullName: string;
  readonly role: 'CUSTOMER' | 'STAFF' | 'ADMIN';
  readonly phone?: string | null;
  readonly avatarUrl?: string | null;
  readonly emailVerified?: boolean;
}

export interface AuthSessionDto {
  readonly user: AuthUserDto;
  readonly accessToken: string;
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
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

export function extractAuthErrorCode(error: unknown): string | undefined {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: { code?: string } } | undefined;
    return body?.error?.code;
  }
  return undefined;
}

export function formatAuthErrorMessage(error: unknown): string {
  const code = extractAuthErrorCode(error);
  if (code && AUTH_ERROR_MESSAGES[code]) {
    return AUTH_ERROR_MESSAGES[code];
  }
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'Chưa kết nối được máy chủ Backend. Bạn có thể nhấn nút [⭐ VIP Demo] ở bên dưới để đăng nhập trải nghiệm ngay!';
  }
  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1/auth';

  async login(payload: { email: string; password: string }): Promise<AuthSessionDto> {
    const res = await firstValueFrom(
      this.http.post<{ data: AuthSessionDto }>(`${this.baseUrl}/login`, payload),
    );
    return res.data;
  }

  async loginWithGoogle(idToken: string): Promise<AuthSessionDto> {
    const res = await firstValueFrom(
      this.http.post<{ data: AuthSessionDto }>(`${this.baseUrl}/google`, {
        idToken,
      }),
    );
    return res.data;
  }

  async register(payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
  }): Promise<{ user: AuthUserDto; devOtp?: string }> {
    const res = await firstValueFrom(
      this.http.post<{ data: { user: AuthUserDto; devOtp?: string } }>(
        `${this.baseUrl}/register`,
        payload,
      ),
    );
    return res.data;
  }

  async verifyEmail(payload: { email: string; code: string }): Promise<AuthSessionDto> {
    const res = await firstValueFrom(
      this.http.post<{ data: AuthSessionDto }>(`${this.baseUrl}/verify-email`, payload),
    );
    return res.data;
  }

  async resendVerification(email: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.baseUrl}/resend-verification`, { email }));
  }

  async forgotPassword(email: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.baseUrl}/forgot-password`, { email }));
  }

  async resetPassword(payload: { token: string; newPassword: string }): Promise<void> {
    await firstValueFrom(this.http.post(`${this.baseUrl}/reset-password`, payload));
  }

  async logout(): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/logout`));
  }
}
