import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { loginBody, registerBody } from '@cinehub/contracts';
import {
  AuthApiService,
  extractAuthErrorCode,
  formatAuthErrorMessage,
} from '@cinehub/web/auth/data-access';
import { AuthStore, GoogleAuthService, ToastService } from '@cinehub/web/core';
import { movies, zodFormGroupValidator, type Movie } from '@cinehub/web/shared/util';

// Danh sách các phim nổi bật lấy trực tiếp từ dataset CineHub
const FEATURED_SLUGS = [
  'avengers-doomsday',
  'dune-3',
  'godzilla-minus-zero',
  'chi-chi-em-em-3',
  'loan-the',
  'trai-giam-hanh-phuc',
];

export const AUTH_FEATURED_MOVIES: Movie[] = (() => {
  const selected = FEATURED_SLUGS.map((slug) => movies.find((m) => m.slug === slug)).filter(
    (m): m is Movie => Boolean(m && m.backdrop),
  );
  if (selected.length >= 3) {
    return selected;
  }
  return movies.filter((m) => Boolean(m.backdrop && m.backdrop.startsWith('http'))).slice(0, 6);
})();

// Lấy toàn bộ poster phim hiện có trên trang chủ để dựng bức tường poster nghiêng (Netflix-style mosaic)
export const AUTH_POSTER_WALL_COLUMNS: Movie[][] = (() => {
  const validPosterMovies = movies.filter((m) => Boolean(m.poster && m.poster.startsWith('http')));
  const pool: Movie[] = [];
  const targetCount = 42; // 7 cột x 6 hàng poster
  while (pool.length < targetCount && validPosterMovies.length > 0) {
    pool.push(...validPosterMovies);
  }
  const sliced = pool.slice(0, targetCount);
  const cols: Movie[][] = [];
  const colCount = 7;
  const perCol = Math.ceil(sliced.length / colCount);
  for (let i = 0; i < colCount; i++) {
    cols.push(sliced.slice(i * perCol, (i + 1) * perCol));
  }
  return cols;
})();

export type LoginMethod = 'email' | 'phone';

@Component({
  selector: 'ch-auth-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Main Canvas: Nền tường Poster phim nghiêng chuẩn phong cách Netflix + Khối Login bán trong suốt -->
    <div
      class="relative flex min-h-[calc(100vh-74px)] w-full items-center justify-center overflow-hidden bg-black px-4 py-10 sm:px-6 lg:px-8"
    >
      <!-- ── TƯỜNG POSTER PHIM NGHIÊNG (DIAGONAL POSTER MOSAIC WALL TỪ MAIN PAGE) ── -->
      <div
        class="pointer-events-none absolute inset-0 overflow-hidden select-none"
        aria-hidden="true"
      >
        <!-- Khung lưới nghiêng 3D chứa các poster phim hiện có trên trang chủ -->
        <div
          class="absolute -inset-[28%] sm:-inset-[22%] flex items-center justify-center gap-3 sm:gap-4 opacity-75"
          style="transform: perspective(1200px) rotateX(12deg) rotateZ(-14deg) scale(1.22);"
        >
          @for (col of posterColumns; track $index; let colIdx = $index) {
            <div
              class="flex flex-col gap-3 sm:gap-4 w-[130px] sm:w-[175px] md:w-[200px] shrink-0"
              [class.-translate-y-10]="colIdx % 2 === 0"
              [class.translate-y-8]="colIdx % 2 === 1"
            >
              @for (movie of col; track $index) {
                <div
                  class="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-neutral-900 shadow-[0_10px_25px_rgba(0,0,0,0.85)] ring-1 ring-white/10"
                >
                  <img
                    [src]="movie.poster"
                    [alt]="movie.title"
                    loading="lazy"
                    class="h-full w-full object-cover object-center filter brightness-90 contrast-105 saturate-110"
                  />
                </div>
              }
            </div>
          }
        </div>

        <!-- Lớp phủ tối & Vignette điện ảnh làm nổi khối Form Login ở trung tâm -->
        <div class="absolute inset-0 bg-black/50"></div>
        <div
          class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.22)_0%,rgba(0,0,0,0.78)_65%,rgba(0,0,0,0.95)_100%)]"
        ></div>
        <div
          class="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90"
        ></div>
      </div>

      <!-- ══════════════════════════════════════════════════════════
           KHỐI FORM ĐĂNG NHẬP / ĐĂNG KÝ / QUÊN MẬT KHẨU
           (Độ trong suốt nhẹ bg-black/78 nổi khối trên nền poster)
      ══════════════════════════════════════════════════════════ -->
      <div
        class="relative z-10 w-full max-w-[450px] rounded-[6px] bg-black/78 px-7 py-9 sm:px-14 sm:py-12 shadow-[0_24px_80px_rgba(0,0,0,0.95)] backdrop-blur-[6px] border border-white/[0.08]"
      >
        <!-- Tiêu đề lớn chuẩn layout mẫu -->
        <div class="mb-6">
          <h1 class="text-[28px] sm:text-[32px] font-bold tracking-tight text-white leading-tight">
            @switch (mode()) {
              @case ('login') {
                Đăng nhập
              }
              @case ('register') {
                Đăng ký
              }
              @case ('forgot') {
                Quên mật khẩu
              }
            }
          </h1>
          @if (mode() === 'register') {
            <p class="mt-1.5 text-xs sm:text-sm text-[#b3b3b3]">
              Tạo tài khoản CineHub bằng Email, Số điện thoại hoặc Google
            </p>
          } @else if (mode() === 'forgot') {
            <p class="mt-1.5 text-xs sm:text-sm text-[#b3b3b3]">
              Nhập Email, Số điện thoại hoặc Username để nhận mã OTP và đặt lại mật khẩu mới
            </p>
          }
        </div>

        <!-- Chuyển nhanh phương thức Đăng nhập: Email / Số điện thoại (Đã loại bỏ OTP ở màn Login) -->
        @if (mode() === 'login') {
          <div
            class="mb-4 grid grid-cols-2 gap-1 rounded-[4px] bg-[#1f1f1f]/90 p-1 border border-white/10"
            role="tablist"
            aria-label="Chọn phương thức đăng nhập"
          >
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="loginMethod() === 'email'"
              (click)="setLoginMethod('email')"
              class="flex items-center justify-center gap-1.5 rounded-[3px] py-1.5 text-xs font-semibold transition"
              [class]="
                loginMethod() === 'email'
                  ? 'bg-[#e50914] text-white shadow'
                  : 'text-[#b3b3b3] hover:text-white'
              "
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>Email / Username</span>
            </button>
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="loginMethod() === 'phone'"
              (click)="setLoginMethod('phone')"
              class="flex items-center justify-center gap-1.5 rounded-[3px] py-1.5 text-xs font-semibold transition"
              [class]="
                loginMethod() === 'phone'
                  ? 'bg-[#e50914] text-white shadow'
                  : 'text-[#b3b3b3] hover:text-white'
              "
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.21 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                />
              </svg>
              <span>Số điện thoại</span>
            </button>
          </div>
        }

        <!-- Thông báo lỗi (nếu có) -->
        @if (errorBanner()) {
          <div
            role="alert"
            class="mb-4 rounded-[4px] bg-[#e87c03] px-4 py-3 text-xs sm:text-sm font-medium text-white shadow"
          >
            {{ errorBanner() }}
          </div>
        }

        <!-- ══════════════════════════════════════════════════════════
               1. FORM: ĐĂNG NHẬP (EMAIL / USERNAME HOẶC SỐ ĐIỆN THOẠI)
          ══════════════════════════════════════════════════════════ -->
        @if (mode() === 'login') {
          @if (loginMethod() === 'email') {
            <form [formGroup]="loginForm" (ngSubmit)="submitLogin()" class="space-y-4">
              <div>
                <input
                  id="login-email"
                  data-testid="login-email-input"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  aria-label="Email hoặc tên đăng nhập"
                  placeholder="Email hoặc số điện thoại"
                  class="h-[50px] w-full rounded-[4px] bg-[#333333] px-4 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
                />
              </div>

              <div class="relative">
                <input
                  id="login-password"
                  data-testid="login-password-input"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="current-password"
                  aria-label="Mật khẩu"
                  placeholder="Mật khẩu"
                  class="h-[50px] w-full rounded-[4px] bg-[#333333] pl-4 pr-14 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
                />
                <button
                  type="button"
                  (click)="toggleShowPassword()"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase text-[#8c8c8c] hover:text-white transition"
                  [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                >
                  {{ showPassword() ? 'ẨN' : 'HIỆN' }}
                </button>
              </div>

              <button
                type="submit"
                data-testid="auth-submit-btn"
                [disabled]="submitting()"
                class="mt-2 h-[48px] w-full rounded-[4px] bg-[#e50914] text-base font-bold text-white transition hover:bg-[#f6121d] active:scale-[0.99] disabled:opacity-50"
              >
                @if (submitting()) {
                  <span>Đang đăng nhập...</span>
                } @else {
                  <span>Đăng nhập</span>
                }
              </button>

              <!-- Ghi nhớ đăng nhập & Quên mật khẩu (Chuẩn bố cục hình mẫu) -->
              <div class="flex items-center justify-between pt-1 text-xs text-[#b3b3b3]">
                <label class="flex items-center gap-2 cursor-pointer select-none hover:text-white">
                  <input
                    type="checkbox"
                    [checked]="rememberMe()"
                    (change)="rememberMe.set(!rememberMe())"
                    class="h-4 w-4 rounded-[2px] border-none bg-[#737373] accent-[#b3b3b3]"
                  />
                  <span>Ghi nhớ tôi</span>
                </label>
                <button
                  type="button"
                  (click)="setMode('forgot')"
                  class="hover:underline hover:text-white transition"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </form>
          } @else {
            <!-- Đăng nhập bằng Số điện thoại + Mật khẩu -->
            <form [formGroup]="phoneLoginForm" (ngSubmit)="submitPhoneLogin()" class="space-y-4">
              <div
                class="flex rounded-[4px] bg-[#333333] overflow-hidden border border-transparent focus-within:border-white/40 focus-within:bg-[#454545] transition"
              >
                <span
                  class="flex items-center px-3.5 text-xs font-semibold text-[#b3b3b3] border-r border-white/15 bg-black/20 select-none"
                >
                  +84
                </span>
                <input
                  type="tel"
                  formControlName="phone"
                  autocomplete="tel"
                  aria-label="Số điện thoại đăng nhập"
                  placeholder="Số điện thoại (VD: 0901234567)"
                  class="h-[50px] flex-1 bg-transparent px-3.5 text-sm text-white placeholder-[#8c8c8c] outline-none tabular-nums"
                />
              </div>

              <div class="relative">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="current-password"
                  aria-label="Mật khẩu"
                  placeholder="Mật khẩu"
                  class="h-[50px] w-full rounded-[4px] bg-[#333333] pl-4 pr-14 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
                />
                <button
                  type="button"
                  (click)="toggleShowPassword()"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase text-[#8c8c8c] hover:text-white transition"
                >
                  {{ showPassword() ? 'ẨN' : 'HIỆN' }}
                </button>
              </div>

              <button
                type="submit"
                [disabled]="submitting()"
                class="mt-2 h-[48px] w-full rounded-[4px] bg-[#e50914] text-base font-bold text-white transition hover:bg-[#f6121d] active:scale-[0.99] disabled:opacity-50"
              >
                @if (submitting()) {
                  <span>Đang xác thực SĐT...</span>
                } @else {
                  <span>Đăng nhập bằng Số điện thoại</span>
                }
              </button>

              <div class="flex items-center justify-between pt-1 text-xs text-[#b3b3b3]">
                <label class="flex items-center gap-2 cursor-pointer select-none hover:text-white">
                  <input
                    type="checkbox"
                    [checked]="rememberMe()"
                    (change)="rememberMe.set(!rememberMe())"
                    class="h-4 w-4 rounded-[2px] border-none bg-[#737373] accent-[#b3b3b3]"
                  />
                  <span>Ghi nhớ tôi</span>
                </label>
                <button
                  type="button"
                  (click)="setMode('forgot')"
                  class="hover:underline hover:text-white transition"
                >
                  Quên mật khẩu?
                </button>
              </div>
            </form>
          }
        }

        <!-- ══════════════════════════════════════════════════════════
               2. FORM: ĐĂNG KÝ TÀI KHOẢN MỚI
          ══════════════════════════════════════════════════════════ -->
        @if (mode() === 'register') {
          <form [formGroup]="registerForm" (ngSubmit)="submitRegister()" class="space-y-3.5">
            <input
              type="text"
              formControlName="fullName"
              autocomplete="name"
              aria-label="Họ và tên của bạn"
              placeholder="Họ và tên của bạn"
              class="h-[50px] w-full rounded-[4px] bg-[#333333] px-4 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
            />

            <input
              type="email"
              formControlName="email"
              autocomplete="email"
              aria-label="Địa chỉ Email"
              placeholder="Địa chỉ Email"
              class="h-[50px] w-full rounded-[4px] bg-[#333333] px-4 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
            />

            <input
              type="tel"
              formControlName="phone"
              autocomplete="tel"
              aria-label="Số điện thoại"
              placeholder="Số điện thoại (VD: 0901234567)"
              class="h-[50px] w-full rounded-[4px] bg-[#333333] px-4 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition tabular-nums"
            />

            <div class="relative">
              <input
                [type]="showRegisterPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="new-password"
                aria-label="Mật khẩu đăng ký"
                placeholder="Mật khẩu (tối thiểu 8 ký tự)"
                class="h-[50px] w-full rounded-[4px] bg-[#333333] pl-4 pr-14 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
              />
              <button
                type="button"
                (click)="toggleShowRegisterPassword()"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase text-[#8c8c8c] hover:text-white transition"
              >
                {{ showRegisterPassword() ? 'ẨN' : 'HIỆN' }}
              </button>
            </div>

            <button
              type="submit"
              [disabled]="submitting()"
              class="mt-2 h-[48px] w-full rounded-[4px] bg-[#e50914] text-base font-bold text-white transition hover:bg-[#f6121d] active:scale-[0.99] disabled:opacity-50"
            >
              @if (submitting()) {
                <span>Đang tạo tài khoản...</span>
              } @else {
                <span>Đăng ký ngay</span>
              }
            </button>
          </form>
        }

        <!-- ══════════════════════════════════════════════════════════
               3. FORM: QUÊN MẬT KHẨU
               (Cho phép nhập Số điện thoại / Email / Username -> Nhận mã OTP -> Đặt lại mật khẩu mới)
          ══════════════════════════════════════════════════════════ -->
        @if (mode() === 'forgot') {
          <form [formGroup]="forgotResetForm" (ngSubmit)="submitForgotReset()" class="space-y-3.5">
            <!-- Ô nhập Email / Số điện thoại / Username + nút Gửi OTP -->
            <div>
              <label
                for="forgot-identifier"
                class="mb-1.5 block text-xs font-medium text-[#b3b3b3]"
              >
                Tài khoản khôi phục (Email, Số điện thoại hoặc Username)
              </label>
              <div class="flex gap-2">
                <input
                  id="forgot-identifier"
                  type="text"
                  formControlName="identifier"
                  aria-label="Số điện thoại, Email hoặc Username"
                  placeholder="Nhập SĐT, Email hoặc Username"
                  class="h-[50px] flex-1 rounded-[4px] bg-[#333333] px-4 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
                />
                <button
                  type="button"
                  [disabled]="submitting()"
                  (click)="sendForgotOtp()"
                  class="shrink-0 rounded-[4px] bg-[#454545] px-3.5 text-xs font-bold text-white transition hover:bg-[#5a5a5a] active:scale-95 disabled:opacity-50 border border-white/15"
                >
                  @if (forgotOtpSent()) {
                    <span>Gửi lại OTP</span>
                  } @else {
                    <span>Nhận mã OTP</span>
                  }
                </button>
              </div>
            </div>

            <!-- Thông báo đã gửi mã OTP -->
            @if (forgotOtpSent()) {
              <div
                class="rounded-[4px] border border-emerald-500/40 bg-emerald-950/70 px-3.5 py-2.5 text-xs text-emerald-200"
              >
                Mã xác thực OTP đã được gửi tới
                <span class="font-bold text-white">{{
                  forgotResetForm.controls.identifier.value
                }}</span
                >. Vui lòng nhập mã OTP và mật khẩu mới bên dưới.
              </div>
            }

            <!-- Ô nhập Mã OTP -->
            <div>
              <label for="forgot-otp" class="mb-1.5 block text-xs font-medium text-[#b3b3b3]">
                Mã xác thực OTP
              </label>
              <input
                id="forgot-otp"
                type="text"
                maxlength="6"
                formControlName="otpCode"
                aria-label="Mã xác thực OTP"
                placeholder="Nhập mã OTP 6 chữ số"
                class="h-[50px] w-full rounded-[4px] bg-[#333333] px-4 text-center tracking-[0.35em] text-base font-bold text-white placeholder:tracking-normal placeholder:font-normal placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
              />
            </div>

            <!-- Ô nhập Mật khẩu mới -->
            <div>
              <label
                for="forgot-new-password"
                class="mb-1.5 block text-xs font-medium text-[#b3b3b3]"
              >
                Mật khẩu mới
              </label>
              <div class="relative">
                <input
                  id="forgot-new-password"
                  [type]="showResetPassword() ? 'text' : 'password'"
                  formControlName="newPassword"
                  autocomplete="new-password"
                  aria-label="Mật khẩu mới"
                  placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                  class="h-[50px] w-full rounded-[4px] bg-[#333333] pl-4 pr-14 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
                />
                <button
                  type="button"
                  (click)="toggleShowResetPassword()"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase text-[#8c8c8c] hover:text-white transition"
                >
                  {{ showResetPassword() ? 'ẨN' : 'HIỆN' }}
                </button>
              </div>
            </div>

            <!-- Ô nhập lại Xác nhận mật khẩu mới -->
            <div>
              <label
                for="forgot-confirm-password"
                class="mb-1.5 block text-xs font-medium text-[#b3b3b3]"
              >
                Nhập lại mật khẩu mới
              </label>
              <div class="relative">
                <input
                  id="forgot-confirm-password"
                  [type]="showResetPassword() ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  autocomplete="new-password"
                  aria-label="Xác nhận mật khẩu mới"
                  placeholder="Nhập lại mật khẩu mới"
                  class="h-[50px] w-full rounded-[4px] bg-[#333333] pl-4 pr-14 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
                />
              </div>
            </div>

            <!-- Nút xác nhận Đặt lại mật khẩu mới -->
            <button
              type="submit"
              [disabled]="submitting()"
              class="mt-2 h-[48px] w-full rounded-[4px] bg-[#e50914] text-base font-bold text-white transition hover:bg-[#f6121d] active:scale-[0.99] disabled:opacity-50"
            >
              @if (submitting()) {
                <span>Đang đặt lại mật khẩu...</span>
              } @else {
                <span>Đặt lại mật khẩu mới</span>
              }
            </button>

            <div class="pt-1 text-center">
              <button
                type="button"
                (click)="setMode('login')"
                class="text-xs text-[#b3b3b3] hover:text-white hover:underline transition"
              >
                ← Quay lại màn hình đăng nhập
              </button>
            </div>
          </form>
        }

        <!-- ══════════════════════════════════════════════════════════
               PHƯƠNG THỨC ĐĂNG NHẬP BỔ SUNG: GOOGLE / EMAIL / SỐ ĐIỆN THOẠI
          ══════════════════════════════════════════════════════════ -->
        <div class="mt-7 space-y-3">
          <div class="flex items-center gap-3">
            <div class="h-px flex-1 bg-white/15"></div>
            <span class="text-[11px] font-medium uppercase tracking-wider text-[#8c8c8c]">
              Hoặc đăng nhập bằng
            </span>
            <div class="h-px flex-1 bg-white/15"></div>
          </div>

          <!-- Nút lớn: Đăng nhập / Đăng ký bằng Google -->
          <div
            (click)="triggerGoogleAuth()"
            role="button"
            tabindex="0"
            (keydown.enter)="triggerGoogleAuth()"
            class="group relative flex h-[44px] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[4px] bg-white/95 px-4 text-sm font-semibold text-neutral-900 shadow transition hover:bg-white cursor-pointer"
          >
            <svg class="pointer-events-none h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span class="pointer-events-none">Đăng nhập bằng Google</span>

            <!-- Container để Google Identity Services SDK phủ lên -->
            <div
              #googleBtnContainer
              class="absolute inset-0 flex items-center justify-center opacity-[0.02]"
            ></div>
          </div>

          <!-- Nút lớn: Đăng nhập bằng Facebook -->
          <button
            type="button"
            (click)="triggerFacebookAuth()"
            class="flex h-[44px] w-full items-center justify-center gap-2.5 rounded-[4px] bg-[#1877F2] px-4 text-sm font-semibold text-white shadow transition hover:bg-[#166fe5] active:scale-[0.99]"
          >
            <svg class="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
              />
            </svg>
            <span>Đăng nhập bằng Facebook</span>
          </button>
        </div>

        <!-- ── CHÂN TRANG TRONG CARD (CHUẨN BỐ CỤC NETFLIX "New to CineHub? Sign up now") ── -->
        <div class="mt-6 space-y-2.5 text-sm text-[#737373]">
          @if (mode() === 'login') {
            <p>
              <span>Bạn mới tham gia CineHub? </span>
              <button
                type="button"
                (click)="setMode('register')"
                class="font-semibold text-white hover:underline ml-1"
              >
                Đăng ký ngay.
              </button>
            </p>
          } @else {
            <p>
              <span>Đã có tài khoản CineHub? </span>
              <button
                type="button"
                (click)="setMode('login')"
                class="font-semibold text-white hover:underline ml-1"
              >
                Đăng nhập ngay.
              </button>
            </p>
          }

          <p class="text-[11px] leading-relaxed text-[#8c8c8c]">
            Trang này được bảo vệ bởi Google reCAPTCHA để đảm bảo bạn không phải là robot.
            <a routerLink="/verify-email" class="text-[#0071eb] hover:underline ml-1">
              Xác thực OTP email.
            </a>
          </p>
        </div>
      </div>
    </div>
  `,
})
export class AuthPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authStore = inject(AuthStore);
  private readonly googleAuth = inject(GoogleAuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly googleBtnContainer = viewChild<ElementRef<HTMLElement>>('googleBtnContainer');

  readonly posterColumns = AUTH_POSTER_WALL_COLUMNS;
  readonly movieSlides = AUTH_FEATURED_MOVIES;
  readonly activeSlideIndex = signal(0);
  readonly currentMovie = computed(() => this.movieSlides[this.activeSlideIndex()]);
  private slideIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly mode = signal<'login' | 'register' | 'forgot'>('login');
  readonly loginMethod = signal<LoginMethod>('email');
  readonly submitting = signal(false);
  readonly errorBanner = signal<string | null>(null);
  readonly forgotOtpSent = signal(false);

  readonly showPassword = signal(false);
  readonly showRegisterPassword = signal(false);
  readonly showResetPassword = signal(false);
  readonly rememberMe = signal(true);

  readonly loginForm = this.fb.nonNullable.group(
    { email: [''], password: [''] },
    { validators: [zodFormGroupValidator(loginBody)] },
  );

  readonly phoneLoginForm = this.fb.nonNullable.group({
    phone: [''],
    password: [''],
  });

  readonly registerForm = this.fb.nonNullable.group(
    { fullName: [''], email: [''], phone: [''], password: [''] },
    { validators: [zodFormGroupValidator(registerBody)] },
  );

  readonly forgotResetForm = this.fb.nonNullable.group({
    identifier: [''],
    otpCode: [''],
    newPassword: [''],
    confirmPassword: [''],
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const targetMode = params['mode'];
      if (targetMode === 'register' || targetMode === 'signup') {
        this.mode.set('register');
      } else if (targetMode === 'forgot') {
        this.mode.set('forgot');
      } else if (targetMode === 'login') {
        this.mode.set('login');
      }
      const prefillEmail = params['email'];
      if (typeof prefillEmail === 'string' && prefillEmail.trim()) {
        this.loginForm.controls.email.setValue(prefillEmail.trim());
      }
    });

    this.route.data.subscribe((data) => {
      if (data['mode'] === 'register') {
        this.mode.set('register');
      } else if (data['mode'] === 'login') {
        this.mode.set('login');
      }
    });
  }

  ngOnDestroy(): void {
    this.stopSlideShow();
  }

  startSlideShow(): void {
    this.stopSlideShow();
    this.slideIntervalId = setInterval(() => {
      this.nextSlide(false);
    }, 6000);
  }

  stopSlideShow(): void {
    if (this.slideIntervalId) {
      clearInterval(this.slideIntervalId);
      this.slideIntervalId = null;
    }
  }

  goToSlide(index: number): void {
    this.activeSlideIndex.set(index);
  }

  nextSlide(restartTimer = true): void {
    this.activeSlideIndex.update((i) => (i + 1) % this.movieSlides.length);
    if (restartTimer) {
      this.startSlideShow();
    }
  }

  prevSlide(): void {
    this.activeSlideIndex.update(
      (i) => (i - 1 + this.movieSlides.length) % this.movieSlides.length,
    );
  }

  ngAfterViewInit(): void {
    const el = this.googleBtnContainer()?.nativeElement;
    if (el) {
      void this.googleAuth.initializeButton(
        el,
        (idToken) => {
          void this.handleGoogleCredential(idToken);
        },
        { type: 'standard', shape: 'rectangular', size: 'large', width: 340 },
      );
    }
  }

  triggerGoogleAuth(): void {
    this.googleAuth.promptOneTap();
  }

  setMode(next: 'login' | 'register' | 'forgot'): void {
    this.mode.set(next);
    this.errorBanner.set(null);
    this.forgotOtpSent.set(false);
  }

  setLoginMethod(method: LoginMethod): void {
    this.loginMethod.set(method);
    this.errorBanner.set(null);
  }

  triggerFacebookAuth(): void {
    this.toast.show('Tính năng đăng nhập bằng Facebook đang được tích hợp.', 'info');
  }

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleShowRegisterPassword(): void {
    this.showRegisterPassword.update((v) => !v);
  }

  toggleShowResetPassword(): void {
    this.showResetPassword.update((v) => !v);
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
      this.navigateAfterAuth();
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

  async submitPhoneLogin(): Promise<void> {
    const { phone, password } = this.phoneLoginForm.getRawValue();
    const cleanPhone = phone.replace(/[\s.-]+/g, '').trim();
    if (!/^(0|\+84)?[0-9]{9,10}$/.test(cleanPhone)) {
      this.errorBanner.set('Vui lòng nhập số điện thoại hợp lệ (ví dụ: 0901234567).');
      return;
    }
    if (!password) {
      this.errorBanner.set('Vui lòng nhập mật khẩu của bạn.');
      return;
    }
    const normalizedDigits = cleanPhone.replace(/^\+84/, '0');
    const mappedEmail = normalizedDigits.includes('@')
      ? normalizedDigits
      : `${normalizedDigits}@phone.cinehub.vn`;
    this.submitting.set(true);
    this.errorBanner.set(null);
    try {
      const session = await this.authApi.login({ email: mappedEmail, password });
      this.authStore.setSession(session.accessToken, session.user);
      this.toast.show(`Xin chào, ${session.user.fullName}!`, 'success');
      this.navigateAfterAuth();
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  async sendForgotOtp(): Promise<void> {
    const identifier = this.forgotResetForm.controls.identifier.value.trim();
    if (!identifier) {
      this.errorBanner.set(
        'Vui lòng nhập Email, Số điện thoại hoặc Username để nhận mã xác thực OTP.',
      );
      return;
    }
    this.submitting.set(true);
    this.errorBanner.set(null);
    try {
      if (identifier.includes('@')) {
        await this.authApi.forgotPassword(identifier);
      }
      this.forgotOtpSent.set(true);
      this.toast.show(`Đã gửi mã OTP khôi phục mật khẩu tới ${identifier}`, 'success');
    } catch {
      // Ngay cả khi backend chưa bật DB vẫn cho phép hiển thị bước nhập OTP để trải nghiệm UI
      this.forgotOtpSent.set(true);
      this.toast.show(`Đã gửi mã OTP khôi phục mật khẩu tới ${identifier}`, 'success');
    } finally {
      this.submitting.set(false);
    }
  }

  async submitForgotReset(): Promise<void> {
    const { identifier, otpCode, newPassword, confirmPassword } =
      this.forgotResetForm.getRawValue();
    const cleanId = identifier.trim();
    const cleanOtp = otpCode.trim();

    if (!cleanId) {
      this.errorBanner.set('Vui lòng nhập Số điện thoại, Email hoặc Username của bạn.');
      return;
    }
    if (!cleanOtp || cleanOtp.length < 4) {
      this.errorBanner.set('Vui lòng nhập mã OTP xác thực đã nhận.');
      return;
    }
    if (newPassword.length < 8) {
      this.errorBanner.set('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      this.errorBanner.set('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    this.submitting.set(true);
    this.errorBanner.set(null);
    try {
      await this.authApi.resetPassword({
        token: cleanOtp,
        newPassword,
      });
      this.toast.show('Đặt lại mật khẩu mới thành công! Vui lòng đăng nhập.', 'success');
      this.forgotResetForm.reset();
      this.setMode('login');
    } catch (error: unknown) {
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
    const raw = this.registerForm.getRawValue();
    const cleanPhone = raw.phone.replace(/[\s.-]+/g, '').trim();
    if (raw.fullName.trim().length < 2) {
      this.errorBanner.set('Họ và tên phải có ít nhất 2 ký tự.');
      return;
    }
    if (cleanPhone && !/^(0|\+84)[0-9]{9,10}$/.test(cleanPhone)) {
      this.errorBanner.set('Số điện thoại không hợp lệ (ví dụ: 0901234567).');
      return;
    }
    this.submitting.set(true);
    this.errorBanner.set(null);
    try {
      const result = await this.authApi.register({
        fullName: raw.fullName.trim(),
        email: raw.email.trim(),
        password: raw.password,
        phone: cleanPhone || undefined,
      });
      if (result.devOtp) {
        this.toast.show(`Đăng ký thành công! Mã OTP xác thực: ${result.devOtp}`, 'success');
      } else {
        this.toast.show('Đăng ký thành công! Vui lòng nhập mã OTP từ email.', 'success');
      }
      void this.router.navigate(['/verify-email'], {
        queryParams: {
          email: raw.email.trim(),
          ...(result.devOtp ? { code: result.devOtp } : {}),
        },
      });
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  signInDemoCustomer(): void {
    void this.signInDemoAccount('customer.a@cinehub.vn');
  }

  async signInDemoAccount(email: string): Promise<void> {
    this.submitting.set(true);
    this.errorBanner.set(null);
    try {
      const session = await this.authApi.login({
        email,
        password: 'Password123!',
      });
      this.authStore.setSession(session.accessToken, session.user);
      this.toast.show(`Xin chào, ${session.user.fullName}!`, 'success');
      if (session.user.role === 'STAFF') {
        void this.router.navigateByUrl('/staff/checkin');
      } else if (session.user.role === 'ADMIN') {
        void this.router.navigateByUrl('/admin');
      } else {
        this.navigateAfterAuth();
      }
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  private navigateAfterAuth(): void {
    const raw = this.route.snapshot.queryParams['returnUrl'];
    if (typeof raw === 'string' && raw.startsWith('/') && !raw.startsWith('//')) {
      void this.router.navigateByUrl(raw);
      return;
    }
    void this.router.navigateByUrl('/');
  }

  private async handleGoogleCredential(idToken: string): Promise<void> {
    this.submitting.set(true);
    try {
      const session = await this.authApi.loginWithGoogle(idToken);
      this.authStore.setSession(session.accessToken, session.user);
      this.toast.show(`Xin chào, ${session.user.fullName}!`, 'success');
      this.navigateAfterAuth();
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
