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
    <div
      class="relative flex min-h-[calc(100vh-73px)] w-full flex-col md:flex-row bg-[var(--color-surface)]"
      cdkTrapFocus
    >
      <!-- Left Column: Information & Form Panel (Full screen split, max-w-md centered) -->
      <div
        class="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 md:w-1/2 lg:px-16 xl:px-24"
      >
        <div class="mx-auto w-full max-w-md space-y-6">
          <!-- Brand Header (Inspired by Reference Wireframe) -->
          <div class="space-y-3">
            <div class="flex items-center gap-2.5">
              <span
                class="inline-flex h-10 w-10 items-center justify-center rounded-[4px] bg-[var(--color-brand-primary)] text-base font-semibold text-white shadow-xs"
              >
                CH
              </span>
              <div>
                <span
                  class="block text-lg font-semibold tracking-tight text-[var(--color-text-primary)]"
                  >CineHub</span
                >
                <span class="block text-xs font-normal text-[var(--color-text-secondary)]"
                  >Hệ thống rạp chiếu chuẩn quốc tế</span
                >
              </div>
            </div>

            <div class="space-y-1">
              <h1 class="cinema-heading-section">
                @switch (mode()) {
                  @case ('login') {
                    Chào mừng trở lại!
                  }
                  @case ('register') {
                    Tạo tài khoản thành viên
                  }
                  @case ('forgot') {
                    Khôi phục mật khẩu
                  }
                }
              </h1>
              <p class="cinema-metadata">
                @switch (mode()) {
                  @case ('login') {
                    Rất vui được đồng hành cùng bạn trong từng thước phim tuyệt đỉnh.
                  }
                  @case ('register') {
                    Gia nhập CineHub Club để nhận điểm thưởng và trải nghiệm góc nhìn 3D POV.
                  }
                  @case ('forgot') {
                    Nhập email đã đăng ký để nhận liên kết khôi phục tài khoản an toàn.
                  }
                }
              </p>
            </div>
          </div>

          <!-- Segmented Switcher Tabs (Inspired by Gradiator / Reference Image) -->
          @if (mode() !== 'forgot') {
            <div
              class="grid grid-cols-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-secondary)] p-1 text-xs font-semibold"
              role="tablist"
              aria-label="Chuyển chế độ đăng nhập hoặc đăng ký"
            >
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="mode() === 'login'"
                (click)="setMode('login')"
                class="rounded-md py-2.5 text-center transition-all"
                [class]="
                  mode() === 'login'
                    ? 'bg-[var(--color-brand-primary)] text-white shadow-xs font-semibold'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium'
                "
              >
                Đăng nhập
              </button>
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="mode() === 'register'"
                (click)="setMode('register')"
                class="rounded-md py-2.5 text-center transition-all"
                [class]="
                  mode() === 'register'
                    ? 'bg-[var(--color-brand-primary)] text-white shadow-xs font-semibold'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium'
                "
              >
                Đăng ký tài khoản
              </button>
            </div>
          } @else {
            <div>
              <button
                type="button"
                (click)="setMode('login')"
                class="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
              >
                <svg
                  class="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
                <span>Quay lại trang đăng nhập</span>
              </button>
            </div>
          }

          <!-- Error Alert Banner -->
          @if (errorBanner()) {
            <div
              role="alert"
              class="flex items-start gap-2.5 rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger-bg)] p-3.5 text-xs font-semibold text-[var(--color-danger)]"
            >
              <svg
                class="h-4 w-4 shrink-0 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{{ errorBanner() }}</span>
            </div>
          }

          <!-- Form Fields -->
          @switch (mode()) {
            @case ('login') {
              <form [formGroup]="loginForm" (ngSubmit)="submitLogin()" class="space-y-4">
                <!-- Email Field -->
                <div>
                  <label
                    for="login-email"
                    class="cinema-label mb-1.5 block text-xs font-medium text-[var(--color-text-primary)]"
                    >Email</label
                  >
                  <div class="relative">
                    <div
                      class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-text-secondary)]"
                    >
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <input
                      id="login-email"
                      type="email"
                      formControlName="email"
                      autocomplete="email"
                      placeholder="ban@cinehub.vn"
                      class="cinema-input cinema-input-icon-leading !h-11 w-full text-sm"
                    />
                  </div>
                </div>

                <!-- Password Field with Show/Hide Eye Toggle -->
                <div>
                  <div class="mb-1.5 flex items-center justify-between">
                    <label
                      for="login-password"
                      class="cinema-label block text-xs font-medium text-[var(--color-text-primary)]"
                      >Mật khẩu</label
                    >
                    <button
                      type="button"
                      (click)="setMode('forgot')"
                      class="text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
                  <div class="relative">
                    <div
                      class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-text-secondary)]"
                    >
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <input
                      id="login-password"
                      [type]="showPassword() ? 'text' : 'password'"
                      formControlName="password"
                      autocomplete="current-password"
                      placeholder="••••••••"
                      class="cinema-input cinema-input-icon-both !h-11 w-full text-sm"
                    />
                    <button
                      type="button"
                      (click)="toggleShowPassword()"
                      class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                      [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                    >
                      @if (showPassword()) {
                        <svg
                          class="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
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
                          class="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      }
                    </button>
                  </div>
                </div>

                <!-- Remember Me Checkbox -->
                <div class="flex items-center text-xs">
                  <label
                    class="flex items-center gap-2 cursor-pointer select-none text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    <input
                      type="checkbox"
                      [checked]="rememberMe()"
                      (change)="rememberMe.set(!rememberMe())"
                      class="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
                    />
                    <span>Ghi nhớ đăng nhập trên thiết bị này</span>
                  </label>
                </div>

                <!-- Submit Button -->
                <button
                  type="submit"
                  [disabled]="submitting()"
                  class="cinema-btn-primary w-full !h-11 font-semibold text-sm shadow-sm transition-all"
                >
                  @if (submitting()) {
                    <span class="inline-flex items-center gap-2">
                      <svg
                        class="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      <span>Đang xác thực...</span>
                    </span>
                  } @else {
                    <span>Đăng nhập</span>
                  }
                </button>
              </form>
            }

            @case ('register') {
              <form [formGroup]="registerForm" (ngSubmit)="submitRegister()" class="space-y-3.5">
                <!-- Full Name Field -->
                <div>
                  <label
                    for="reg-fullname"
                    class="cinema-label mb-1.5 block text-xs font-medium text-[var(--color-text-primary)]"
                    >Họ và tên</label
                  >
                  <div class="relative">
                    <div
                      class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-text-secondary)]"
                    >
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <circle cx="12" cy="8" r="5" />
                        <path d="M20 21a8 8 0 0 0-16 0" />
                      </svg>
                    </div>
                    <input
                      id="reg-fullname"
                      type="text"
                      formControlName="fullName"
                      autocomplete="name"
                      placeholder="Nguyễn Văn A"
                      class="cinema-input cinema-input-icon-leading !h-11 w-full text-sm"
                    />
                  </div>
                </div>

                <!-- Email Field -->
                <div>
                  <label
                    for="reg-email"
                    class="cinema-label mb-1.5 block text-xs font-medium text-[var(--color-text-primary)]"
                    >Email</label
                  >
                  <div class="relative">
                    <div
                      class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-text-secondary)]"
                    >
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      formControlName="email"
                      autocomplete="email"
                      placeholder="ban@cinehub.vn"
                      class="cinema-input cinema-input-icon-leading !h-11 w-full text-sm"
                    />
                  </div>
                </div>

                <!-- Phone Field -->
                <div>
                  <label
                    for="reg-phone"
                    class="cinema-label mb-1.5 block text-xs font-medium text-[var(--color-text-primary)]"
                    >Số điện thoại (tùy chọn)</label
                  >
                  <div class="relative">
                    <div
                      class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-text-secondary)]"
                    >
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path
                          d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                        />
                      </svg>
                    </div>
                    <input
                      id="reg-phone"
                      type="tel"
                      formControlName="phone"
                      autocomplete="tel"
                      placeholder="0901234567"
                      class="cinema-input cinema-input-icon-leading !h-11 w-full text-sm tabular-nums"
                    />
                  </div>
                </div>

                <!-- Password Field with Show/Hide Eye Toggle -->
                <div>
                  <label
                    for="reg-password"
                    class="cinema-label mb-1.5 block text-xs font-medium text-[var(--color-text-primary)]"
                    >Mật khẩu (tối thiểu 8 ký tự)</label
                  >
                  <div class="relative">
                    <div
                      class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-text-secondary)]"
                    >
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <input
                      id="reg-password"
                      [type]="showRegisterPassword() ? 'text' : 'password'"
                      formControlName="password"
                      autocomplete="new-password"
                      placeholder="••••••••"
                      class="cinema-input cinema-input-icon-both !h-11 w-full text-sm"
                    />
                    <button
                      type="button"
                      (click)="toggleShowRegisterPassword()"
                      class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                      [attr.aria-label]="showRegisterPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                    >
                      @if (showRegisterPassword()) {
                        <svg
                          class="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
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
                          class="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      }
                    </button>
                  </div>
                </div>

                <!-- Submit Button -->
                <button
                  type="submit"
                  [disabled]="submitting()"
                  class="cinema-btn-primary w-full !h-11 font-semibold text-sm shadow-sm transition-all"
                >
                  @if (submitting()) {
                    <span class="inline-flex items-center gap-2">
                      <svg
                        class="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      <span>Đang tạo tài khoản...</span>
                    </span>
                  } @else {
                    <span>Đăng ký thành viên</span>
                  }
                </button>
              </form>
            }

            @case ('forgot') {
              <form [formGroup]="forgotForm" (ngSubmit)="submitForgot()" class="space-y-4">
                <div>
                  <label
                    for="forgot-email"
                    class="cinema-label mb-1.5 block text-xs font-medium text-[var(--color-text-primary)]"
                    >Email tài khoản</label
                  >
                  <div class="relative">
                    <div
                      class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--color-text-secondary)]"
                    >
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      formControlName="email"
                      placeholder="ban@cinehub.vn"
                      class="cinema-input cinema-input-icon-leading !h-11 w-full text-sm"
                    />
                  </div>
                  <p class="cinema-metadata mt-1.5 text-xs">
                    Hệ thống sẽ gửi liên kết an toàn tới hộp thư của bạn để thiết lập lại mật khẩu.
                  </p>
                </div>

                <button
                  type="submit"
                  [disabled]="submitting()"
                  class="cinema-btn-primary w-full !h-11 font-semibold text-sm shadow-sm transition-all"
                >
                  @if (submitting()) {
                    <span class="inline-flex items-center gap-2">
                      <svg
                        class="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      <span>Đang gửi liên kết...</span>
                    </span>
                  } @else {
                    <span>Gửi liên kết khôi phục</span>
                  }
                </button>
              </form>
            }
          }

          <!-- Divider (Image Reference Style) -->
          <div class="relative my-4 flex items-center justify-center">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-[var(--color-border)]"></div>
            </div>
            <div
              class="relative bg-[var(--color-surface)] px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]"
            >
              Hoặc tiếp tục với
            </div>
          </div>

          <!-- Alternate Social & Quick Demo Sign-In -->
          <div class="space-y-2.5">
            <div
              #googleBtnContainer
              class="flex justify-center min-h-[40px]"
              aria-label="Google Sign-In"
            ></div>

            <button
              type="button"
              (click)="signInDemoCustomer()"
              class="cinema-btn-secondary flex w-full !h-11 items-center justify-center gap-2 text-xs font-semibold transition-all hover:border-[var(--color-brand-primary)] hover:bg-[var(--color-brand-subtle)]"
            >
              <svg
                class="h-4 w-4 text-[var(--color-brand-accent)]"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1-6.2-4.5-6.2 4.5 2.3-7.1-6.1-4.5h7.6z" />
              </svg>
              <span>Đăng nhập nhanh tài khoản Demo VIP</span>
            </button>
          </div>

          <!-- Bottom Switcher Links -->
          <div
            class="border-t border-[var(--color-border)] pt-4 text-center text-xs text-[var(--color-text-secondary)] space-y-1.5"
          >
            @if (mode() === 'login') {
              <p>
                Chưa có tài khoản CineHub?
                <button
                  type="button"
                  (click)="setMode('register')"
                  class="font-semibold text-[var(--color-brand-primary)] hover:underline ml-1"
                >
                  Đăng ký ngay
                </button>
              </p>
            } @else if (mode() === 'register') {
              <p>
                Đã có tài khoản thành viên?
                <button
                  type="button"
                  (click)="setMode('login')"
                  class="font-semibold text-[var(--color-brand-primary)] hover:underline ml-1"
                >
                  Đăng nhập ngay
                </button>
              </p>
            }

            <p>
              <a
                routerLink="/verify-email"
                class="text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] hover:underline inline-flex items-center gap-1 font-medium"
              >
                <span>Bạn cần xác thực email bằng mã OTP? Nhấp vào đây</span>
                <span>→</span>
              </a>
            </p>
          </div>
        </div>
      </div>

      <!-- Right Column: Full-Screen Cinema Visual Key-Art (Takes the entire right half of the screen) -->
      <div
        class="relative hidden md:flex md:w-1/2 flex-col justify-between overflow-hidden bg-[#160f11] p-10 lg:p-14 text-white"
      >
        <!-- Background Cinema Artwork / Key Art -->
        <img
          src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=85"
          alt="CineHub Cinema Experience"
          class="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-1000 hover:scale-105"
        />
        <!-- Deep Ambient Vignette Gradient -->
        <div
          class="absolute inset-0 bg-gradient-to-t from-[#120a0c] via-[#120a0c]/65 to-[#120a0c]/25"
          aria-hidden="true"
        ></div>

        <!-- Top Monogram Badge on Visual Artwork -->
        <div class="relative z-10">
          <div
            class="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-black/30 px-3.5 py-1.5 backdrop-blur-md"
          >
            <span
              class="inline-flex h-6 w-6 items-center justify-center rounded-[4px] bg-[var(--color-brand-primary)] text-xs font-semibold text-white shadow-xs"
            >
              CH
            </span>
            <span class="text-xs font-semibold tracking-wider uppercase text-white/95">
              CineHub Cinema Club
            </span>
          </div>
        </div>

        <!-- Bottom Ambient Glass Card (Reference Wireframe Visual) -->
        <div
          class="relative z-10 space-y-4 rounded-xl border border-white/15 bg-black/45 p-6 backdrop-blur-md"
        >
          <div class="space-y-1.5">
            <h2 class="text-xl font-semibold leading-tight text-white">
              Trải Nghiệm Điện Ảnh Thượng Hạng
            </h2>
            <p class="text-xs leading-relaxed text-stone-300">
              Khám phá thế giới điện ảnh với công nghệ mô phỏng góc nhìn 3D POV từ chính vị trí ghế
              bạn chọn, âm thanh Dolby Atmos và vô vàn đặc quyền VIP.
            </p>
          </div>

          <div
            class="grid grid-cols-2 gap-3 border-t border-white/15 pt-3.5 text-xs text-stone-200"
          >
            <div class="flex items-center gap-2">
              <span class="text-[var(--color-brand-accent)] font-semibold">✓</span>
              <span>Góc nhìn 3D POV trực quan</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[var(--color-brand-accent)] font-semibold">✓</span>
              <span>Tích lũy điểm đổi vé & combo</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[var(--color-brand-accent)] font-semibold">✓</span>
              <span>Ưu đãi suất chiếu sớm đặc biệt</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[var(--color-brand-accent)] font-semibold">✓</span>
              <span>Thanh toán bảo mật chuẩn SSL</span>
            </div>
          </div>

          <div class="text-[11px] text-stone-400">
            © 2026 CineHub Cinema Network. Tất cả quyền được bảo lưu.
          </div>
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

  readonly showPassword = signal(false);
  readonly showRegisterPassword = signal(false);
  readonly rememberMe = signal(true);

  readonly loginForm = this.fb.nonNullable.group(
    {
      email: [''],
      password: [''],
    },
    { validators: [zodFormGroupValidator(loginBody)] },
  );

  readonly registerForm = this.fb.nonNullable.group(
    {
      fullName: [''],
      email: [''],
      phone: [''],
      password: [''],
    },
    { validators: [zodFormGroupValidator(registerBody)] },
  );

  readonly forgotForm = this.fb.nonNullable.group(
    {
      email: [''],
    },
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
  }

  toggleShowPassword(): void {
    this.showPassword.update((val) => !val);
  }

  toggleShowRegisterPassword(): void {
    this.showRegisterPassword.update((val) => !val);
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
        void this.router.navigate(['/verify-email'], {
          queryParams: { email },
        });
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
      void this.router.navigate(['/verify-email'], {
        queryParams: { email: raw.email },
      });
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
      this.toast.show('Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.', 'success');
      this.setMode('login');
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
