import { A11yModule } from '@angular/cdk/a11y';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forgotPasswordBody, loginBody, registerBody } from '@cinehub/contracts';
import {
  AuthApiService,
  extractAuthErrorCode,
  formatAuthErrorMessage,
} from '@cinehub/web/auth/data-access';
import { AuthStore, GoogleAuthService, ToastService } from '@cinehub/web/core';
import { zodFormGroupValidator } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-auth-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Full-screen split layout -->
    <div class="flex min-h-[calc(100vh-74px)] w-full overflow-hidden bg-[#0E0C0B]" cdkTrapFocus>
      <!-- ══════════════════════════════════════════
           LEFT PANEL — Form Area
      ══════════════════════════════════════════ -->
      <div
        class="flex w-full flex-col justify-center overflow-y-auto px-6 py-10 md:w-1/2 lg:px-14 xl:px-20"
      >
        <div class="mx-auto w-full max-w-[400px] space-y-6">
          <!-- Brand -->
          <div class="flex items-center gap-3">
            <span
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-[#C2A16B] text-sm font-bold text-[#0E0C0B]"
            >
              CH
            </span>
            <div>
              <p class="text-base font-semibold leading-tight text-[#F0EBE2]">CineHub</p>
              <p class="text-[11px] text-[#7A7268]">Hệ thống rạp chiếu chuẩn quốc tế</p>
            </div>
          </div>

          <!-- Heading -->
          <div class="space-y-1">
            <h1 class="text-2xl font-bold leading-tight tracking-tight text-[#F0EBE2]">
              @switch (mode()) {
                @case ('login') {
                  Chào mừng trở lại
                }
                @case ('register') {
                  Tạo tài khoản thành viên
                }
                @case ('forgot') {
                  Khôi phục mật khẩu
                }
              }
            </h1>
            <p class="text-sm text-[#A09890]">
              @switch (mode()) {
                @case ('login') {
                  Rất vui được đồng hành cùng bạn trong từng thước phim.
                }
                @case ('register') {
                  Gia nhập CineHub Club để nhận điểm thưởng và đặc quyền VIP.
                }
                @case ('forgot') {
                  Nhập email đã đăng ký để nhận liên kết khôi phục an toàn.
                }
              }
            </p>
          </div>

          <!-- Mode Tabs -->
          @if (mode() !== 'forgot') {
            <div
              class="grid grid-cols-2 gap-1 rounded-lg border border-[#2E2A25] bg-[#1D1A17] p-1"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="mode() === 'login'"
                (click)="setMode('login')"
                class="rounded-md py-2.5 text-xs font-semibold transition-all"
                [class]="
                  mode() === 'login'
                    ? 'bg-[#C2A16B] text-[#0E0C0B]'
                    : 'text-[#A09890] hover:text-[#F0EBE2]'
                "
              >
                Đăng nhập
              </button>
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="mode() === 'register'"
                (click)="setMode('register')"
                class="rounded-md py-2.5 text-xs font-semibold transition-all"
                [class]="
                  mode() === 'register'
                    ? 'bg-[#C2A16B] text-[#0E0C0B]'
                    : 'text-[#A09890] hover:text-[#F0EBE2]'
                "
              >
                Đăng ký
              </button>
            </div>
          } @else {
            <button
              type="button"
              (click)="setMode('login')"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C2A16B] hover:text-[#D4B47E] transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Quay lại trang đăng nhập
            </button>
          }

          <!-- Error Banner -->
          @if (errorBanner()) {
            <div
              role="alert"
              class="flex items-start gap-2.5 rounded-lg border border-[rgba(201,123,117,0.3)] bg-[rgba(201,123,117,0.1)] px-4 py-3 text-xs font-medium text-[#C97B75]"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="mt-0.5 shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{{ errorBanner() }}</span>
            </div>
          }

          <!-- ── LOGIN FORM ── -->
          @if (mode() === 'login') {
            <form [formGroup]="loginForm" (ngSubmit)="submitLogin()" class="space-y-4">
              <!-- Email -->
              <div class="space-y-1.5">
                <label
                  for="login-email"
                  class="block text-[11px] font-semibold uppercase tracking-widest text-[#7A7268]"
                >
                  Email
                </label>
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-0 top-0 flex h-full w-10 items-center justify-center text-[#7A7268]"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    formControlName="email"
                    autocomplete="email"
                    placeholder="ban@cinehub.vn"
                    class="h-11 w-full rounded-lg border border-[#2E2A25] bg-[#161411] pl-10 pr-4 text-sm text-[#F0EBE2] placeholder-[#5A5248] outline-none transition focus:border-[#C2A16B] focus:ring-2 focus:ring-[rgba(194,161,107,0.15)]"
                  />
                </div>
              </div>

              <!-- Password -->
              <div class="space-y-1.5">
                <div class="flex items-center justify-between">
                  <label
                    for="login-password"
                    class="block text-[11px] font-semibold uppercase tracking-widest text-[#7A7268]"
                  >
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    (click)="setMode('forgot')"
                    class="text-[11px] font-semibold text-[#C2A16B] transition hover:text-[#D4B47E]"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-0 top-0 flex h-full w-10 items-center justify-center text-[#7A7268]"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    autocomplete="current-password"
                    placeholder="••••••••"
                    class="h-11 w-full rounded-lg border border-[#2E2A25] bg-[#161411] pl-10 pr-11 text-sm text-[#F0EBE2] placeholder-[#5A5248] outline-none transition focus:border-[#C2A16B] focus:ring-2 focus:ring-[rgba(194,161,107,0.15)]"
                  />
                  <button
                    type="button"
                    (click)="toggleShowPassword()"
                    [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                    class="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-[#5A5248] transition hover:text-[#F0EBE2]"
                  >
                    @if (showPassword()) {
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path
                          d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
                        />
                        <path
                          d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
                        />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    } @else {
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    }
                  </button>
                </div>
              </div>

              <!-- Remember me -->
              <label class="flex cursor-pointer items-center gap-2.5 select-none">
                <input
                  type="checkbox"
                  [checked]="rememberMe()"
                  (change)="rememberMe.set(!rememberMe())"
                  class="h-4 w-4 rounded border-[#2E2A25] bg-[#161411] accent-[#C2A16B]"
                />
                <span class="text-xs text-[#A09890]">Ghi nhớ đăng nhập trên thiết bị này</span>
              </label>

              <button
                type="submit"
                [disabled]="submitting()"
                class="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#C2A16B] text-sm font-bold text-[#0E0C0B] transition hover:bg-[#D4B47E] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.99]"
              >
                @if (submitting()) {
                  <svg
                    class="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Đang xác thực...
                } @else {
                  Đăng nhập
                }
              </button>
            </form>
          }

          <!-- ── REGISTER FORM ── -->
          @if (mode() === 'register') {
            <form [formGroup]="registerForm" (ngSubmit)="submitRegister()" class="space-y-4">
              <!-- Full Name -->
              <div class="space-y-1.5">
                <label
                  for="reg-fullname"
                  class="block text-[11px] font-semibold uppercase tracking-widest text-[#7A7268]"
                  >Họ và tên</label
                >
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-0 top-0 flex h-full w-10 items-center justify-center text-[#7A7268]"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                    >
                      <circle cx="12" cy="8" r="5" />
                      <path d="M20 21a8 8 0 0 0-16 0" />
                    </svg>
                  </span>
                  <input
                    id="reg-fullname"
                    type="text"
                    formControlName="fullName"
                    autocomplete="name"
                    placeholder="Nguyễn Văn A"
                    class="h-11 w-full rounded-lg border border-[#2E2A25] bg-[#161411] pl-10 pr-4 text-sm text-[#F0EBE2] placeholder-[#5A5248] outline-none transition focus:border-[#C2A16B] focus:ring-2 focus:ring-[rgba(194,161,107,0.15)]"
                  />
                </div>
              </div>

              <!-- Email -->
              <div class="space-y-1.5">
                <label
                  for="reg-email"
                  class="block text-[11px] font-semibold uppercase tracking-widest text-[#7A7268]"
                  >Email</label
                >
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-0 top-0 flex h-full w-10 items-center justify-center text-[#7A7268]"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    id="reg-email"
                    type="email"
                    formControlName="email"
                    autocomplete="email"
                    placeholder="ban@cinehub.vn"
                    class="h-11 w-full rounded-lg border border-[#2E2A25] bg-[#161411] pl-10 pr-4 text-sm text-[#F0EBE2] placeholder-[#5A5248] outline-none transition focus:border-[#C2A16B] focus:ring-2 focus:ring-[rgba(194,161,107,0.15)]"
                  />
                </div>
              </div>

              <!-- Phone -->
              <div class="space-y-1.5">
                <label
                  for="reg-phone"
                  class="block text-[11px] font-semibold uppercase tracking-widest text-[#7A7268]"
                >
                  Số điện thoại <span class="normal-case font-normal">(tùy chọn)</span>
                </label>
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-0 top-0 flex h-full w-10 items-center justify-center text-[#7A7268]"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                    >
                      <path
                        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.21 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                      />
                    </svg>
                  </span>
                  <input
                    id="reg-phone"
                    type="tel"
                    formControlName="phone"
                    autocomplete="tel"
                    placeholder="0901 234 567"
                    class="h-11 w-full rounded-lg border border-[#2E2A25] bg-[#161411] pl-10 pr-4 text-sm text-[#F0EBE2] placeholder-[#5A5248] outline-none transition focus:border-[#C2A16B] focus:ring-2 focus:ring-[rgba(194,161,107,0.15)] tabular-nums"
                  />
                </div>
              </div>

              <!-- Password -->
              <div class="space-y-1.5">
                <label
                  for="reg-password"
                  class="block text-[11px] font-semibold uppercase tracking-widest text-[#7A7268]"
                >
                  Mật khẩu <span class="normal-case font-normal">(tối thiểu 8 ký tự)</span>
                </label>
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-0 top-0 flex h-full w-10 items-center justify-center text-[#7A7268]"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="reg-password"
                    [type]="showRegisterPassword() ? 'text' : 'password'"
                    formControlName="password"
                    autocomplete="new-password"
                    placeholder="••••••••"
                    class="h-11 w-full rounded-lg border border-[#2E2A25] bg-[#161411] pl-10 pr-11 text-sm text-[#F0EBE2] placeholder-[#5A5248] outline-none transition focus:border-[#C2A16B] focus:ring-2 focus:ring-[rgba(194,161,107,0.15)]"
                  />
                  <button
                    type="button"
                    (click)="toggleShowRegisterPassword()"
                    [attr.aria-label]="showRegisterPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                    class="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-[#5A5248] transition hover:text-[#F0EBE2]"
                  >
                    @if (showRegisterPassword()) {
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path
                          d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"
                        />
                        <path
                          d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"
                        />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    } @else {
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    }
                  </button>
                </div>
              </div>

              <button
                type="submit"
                [disabled]="submitting()"
                class="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#C2A16B] text-sm font-bold text-[#0E0C0B] transition hover:bg-[#D4B47E] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.99]"
              >
                @if (submitting()) {
                  <svg
                    class="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Đang tạo tài khoản...
                } @else {
                  Đăng ký thành viên
                }
              </button>
            </form>
          }

          <!-- ── FORGOT FORM ── -->
          @if (mode() === 'forgot') {
            @if (forgotSent()) {
              <div
                class="flex items-start gap-3 rounded-lg border border-[rgba(125,171,137,0.3)] bg-[rgba(125,171,137,0.1)] px-4 py-3.5 text-sm text-[#7DAB89]"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="mt-0.5 shrink-0"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="m9 11 3 3L22 4" />
                </svg>
                <div>
                  <p class="font-semibold">Email đã được gửi!</p>
                  <p class="mt-0.5 text-xs opacity-80">
                    Kiểm tra hộp thư của bạn để tìm liên kết đặt lại mật khẩu (kể cả mục Spam).
                  </p>
                </div>
              </div>
            } @else {
              <form [formGroup]="forgotForm" (ngSubmit)="submitForgot()" class="space-y-4">
                <div class="space-y-1.5">
                  <label
                    for="forgot-email"
                    class="block text-[11px] font-semibold uppercase tracking-widest text-[#7A7268]"
                    >Email tài khoản</label
                  >
                  <div class="relative">
                    <span
                      class="pointer-events-none absolute left-0 top-0 flex h-full w-10 items-center justify-center text-[#7A7268]"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </span>
                    <input
                      id="forgot-email"
                      type="email"
                      formControlName="email"
                      placeholder="ban@cinehub.vn"
                      class="h-11 w-full rounded-lg border border-[#2E2A25] bg-[#161411] pl-10 pr-4 text-sm text-[#F0EBE2] placeholder-[#5A5248] outline-none transition focus:border-[#C2A16B] focus:ring-2 focus:ring-[rgba(194,161,107,0.15)]"
                    />
                  </div>
                  <p class="text-xs text-[#7A7268]">
                    Hệ thống sẽ gửi liên kết an toàn tới hộp thư để thiết lập lại mật khẩu.
                  </p>
                </div>
                <button
                  type="submit"
                  [disabled]="submitting()"
                  class="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#C2A16B] text-sm font-bold text-[#0E0C0B] transition hover:bg-[#D4B47E] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.99]"
                >
                  @if (submitting()) {
                    <svg
                      class="animate-spin"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Đang gửi liên kết...
                  } @else {
                    Gửi liên kết khôi phục
                  }
                </button>
              </form>
            }
          }

          <!-- Divider -->
          <div class="relative flex items-center gap-3">
            <div class="h-px flex-1 bg-[#2E2A25]"></div>
            <span class="text-[10px] font-semibold uppercase tracking-widest text-[#5A5248]"
              >Hoặc tiếp tục với</span
            >
            <div class="h-px flex-1 bg-[#2E2A25]"></div>
          </div>

          <!-- Social -->
          <div class="space-y-2.5">
            <div
              #googleBtnContainer
              class="flex min-h-[40px] justify-center"
              aria-label="Google Sign-In"
            ></div>
            <button
              type="button"
              (click)="signInDemoCustomer()"
              class="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#2E2A25] bg-[#1D1A17] text-xs font-semibold text-[#F0EBE2] transition hover:border-[#C2A16B] hover:bg-[rgba(194,161,107,0.07)]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                class="text-[#C2A16B]"
              >
                <path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1-6.2-4.5-6.2 4.5 2.3-7.1-6.1-4.5h7.6z" />
              </svg>
              Đăng nhập nhanh — Tài khoản Demo VIP
            </button>
          </div>

          <!-- Footer Links -->
          <div class="space-y-2 border-t border-[#2E2A25] pt-4 text-center text-xs text-[#A09890]">
            @if (mode() === 'login') {
              <p>
                Chưa có tài khoản?
                <button
                  type="button"
                  (click)="setMode('register')"
                  class="ml-1 font-semibold text-[#C2A16B] transition hover:text-[#D4B47E]"
                >
                  Đăng ký ngay
                </button>
              </p>
            } @else if (mode() === 'register') {
              <p>
                Đã có tài khoản?
                <button
                  type="button"
                  (click)="setMode('login')"
                  class="ml-1 font-semibold text-[#C2A16B] transition hover:text-[#D4B47E]"
                >
                  Đăng nhập ngay
                </button>
              </p>
            }
            <p>
              <a
                routerLink="/verify-email"
                class="inline-flex items-center gap-1 text-[#7A7268] transition hover:text-[#C2A16B]"
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                  <polyline points="13 2 13 9 20 9" />
                </svg>
                Xác thực email bằng mã OTP
              </a>
            </p>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════════════════
           RIGHT PANEL — Cinema Visual
      ══════════════════════════════════════════ -->
      <div
        class="relative hidden overflow-hidden md:flex md:w-1/2 md:flex-col md:justify-between"
        style="background:#0A0806"
      >
        <!-- Background Cinema Photo -->
        <img
          src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=85"
          alt="CineHub Cinema Experience"
          class="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-[1200ms] hover:scale-[1.03]"
        />
        <!-- Vignette overlay -->
        <div
          class="absolute inset-0"
          style="background:linear-gradient(to top,#0A0806 0%,rgba(10,8,6,.72) 50%,rgba(10,8,6,.18) 100%)"
        ></div>

        <!-- Top Badge -->
        <div class="relative z-10 p-8 lg:p-12">
          <div
            class="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/35 px-4 py-2 backdrop-blur-md"
          >
            <span
              class="inline-flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#C2A16B] text-[10px] font-bold text-[#0E0C0B]"
              >CH</span
            >
            <span class="text-[11px] font-semibold uppercase tracking-widest text-white/90"
              >CineHub Cinema Club</span
            >
          </div>
        </div>

        <!-- Bottom Glass Card -->
        <div
          class="relative z-10 m-8 rounded-xl border border-white/10 bg-black/50 p-6 backdrop-blur-xl lg:m-12"
        >
          <h2 class="text-xl font-bold leading-snug text-white">
            Trải Nghiệm Điện Ảnh Thượng Hạng
          </h2>
          <p class="mt-2 text-xs leading-relaxed text-white/60">
            Khám phá thế giới điện ảnh với công nghệ mô phỏng góc nhìn 3D POV, âm thanh Dolby Atmos
            và đặc quyền VIP không giới hạn.
          </p>
          <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-white/10 pt-4">
            @for (perk of perks; track perk) {
              <div class="flex items-center gap-2 text-xs text-white/75">
                <span class="text-[#C2A16B] font-bold">✓</span>
                <span>{{ perk }}</span>
              </div>
            }
          </div>
          <p class="mt-4 text-[10px] text-white/25">
            © 2026 CineHub Cinema Network. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class AuthPageComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authStore = inject(AuthStore);
  private readonly googleAuth = inject(GoogleAuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly googleBtnContainer = viewChild<ElementRef<HTMLElement>>('googleBtnContainer');

  readonly mode = signal<'login' | 'register' | 'forgot'>('login');
  readonly submitting = signal(false);
  readonly errorBanner = signal<string | null>(null);
  readonly forgotSent = signal(false);

  readonly showPassword = signal(false);
  readonly showRegisterPassword = signal(false);
  readonly rememberMe = signal(true);

  readonly perks = [
    'Góc nhìn 3D POV trực quan',
    'Tích lũy điểm đổi vé & combo',
    'Ưu đãi suất chiếu sớm',
    'Thanh toán bảo mật SSL',
  ];

  readonly loginForm = this.fb.nonNullable.group(
    { email: [''], password: [''] },
    { validators: [zodFormGroupValidator(loginBody)] },
  );

  readonly registerForm = this.fb.nonNullable.group(
    { fullName: [''], email: [''], phone: [''], password: [''] },
    { validators: [zodFormGroupValidator(registerBody)] },
  );

  readonly forgotForm = this.fb.nonNullable.group(
    { email: [''] },
    { validators: [zodFormGroupValidator(forgotPasswordBody)] },
  );

  ngAfterViewInit(): void {
    const el = this.googleBtnContainer()?.nativeElement;
    if (el) {
      void this.googleAuth.initializeButton(el, (idToken) => {
        void this.handleGoogleCredential(idToken);
      });
    }
  }

  setMode(next: 'login' | 'register' | 'forgot'): void {
    this.mode.set(next);
    this.errorBanner.set(null);
    this.forgotSent.set(false);
  }

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }
  toggleShowRegisterPassword(): void {
    this.showRegisterPassword.update((v) => !v);
  }

  async submitLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      const err = Object.values(this.loginForm.errors ?? {})[0];
      this.errorBanner.set(typeof err === 'string' ? err : 'Vui lòng kiểm tra email và mật khẩu.');
      return;
    }
    this.submitting.set(true);
    this.errorBanner.set(null);
    const { email, password } = this.loginForm.getRawValue();
    try {
      const session = await this.authApi.login({ email, password });
      this.authStore.setSession(session.accessToken, session.user);
      this.toast.show(`Xin chào, ${session.user.fullName}!`, 'success');
      void this.router.navigateByUrl('/');
    } catch (error: unknown) {
      if (extractAuthErrorCode(error) === 'EMAIL_NOT_VERIFIED') {
        this.toast.show('Vui lòng xác thực mã OTP đã gửi qua email.', 'warning');
        void this.router.navigate(['/verify-email'], { queryParams: { email } });
        return;
      }
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  async submitRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      const err = Object.values(this.registerForm.errors ?? {})[0];
      this.errorBanner.set(
        typeof err === 'string' ? err : 'Vui lòng điền đầy đủ thông tin đăng ký.',
      );
      return;
    }
    this.submitting.set(true);
    this.errorBanner.set(null);
    const raw = this.registerForm.getRawValue();
    try {
      await this.authApi.register({
        fullName: raw.fullName,
        email: raw.email,
        password: raw.password,
        phone: raw.phone || undefined,
      });
      this.toast.show('Đăng ký thành công! Vui lòng nhập mã OTP từ email.', 'success');
      void this.router.navigate(['/verify-email'], { queryParams: { email: raw.email } });
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  async submitForgot(): Promise<void> {
    if (this.forgotForm.invalid) {
      this.errorBanner.set('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    this.submitting.set(true);
    this.errorBanner.set(null);
    const { email } = this.forgotForm.getRawValue();
    try {
      await this.authApi.forgotPassword(email);
      this.forgotSent.set(true);
      this.toast.show('Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.', 'success');
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  signInDemoCustomer(): void {
    this.authStore.setSession('demo-jwt-access-token', {
      id: 'demo-user-01',
      email: 'khanhvi@cinehub.vn',
      fullName: 'Đỗ Khánh Vi',
      phone: '0909123456',
      role: 'CUSTOMER',
      points: 1850,
      tier: 'Gold VIP',
    });
    this.toast.show('Đã đăng nhập tài khoản Demo VIP!', 'success');
    void this.router.navigateByUrl('/');
  }

  private async handleGoogleCredential(idToken: string): Promise<void> {
    this.submitting.set(true);
    try {
      const session = await this.authApi.loginWithGoogle(idToken);
      this.authStore.setSession(session.accessToken, session.user);
      this.toast.show(`Xin chào, ${session.user.fullName}!`, 'success');
      void this.router.navigateByUrl('/');
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
