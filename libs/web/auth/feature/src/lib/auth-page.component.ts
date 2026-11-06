import { A11yModule } from '@angular/cdk/a11y';
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
import { forgotPasswordBody, loginBody, registerBody } from '@cinehub/contracts';
import {
  AuthApiService,
  extractAuthErrorCode,
  formatAuthErrorMessage,
} from '@cinehub/web/auth/data-access';
import { AuthStore, GoogleAuthService, ToastService } from '@cinehub/web/core';
import { zodFormGroupValidator } from '@cinehub/web/shared/util';

export interface MovieSlide {
  id: string;
  title: string;
  genre: string;
  tagline: string;
  backdropUrl: string;
  accentGlow: string;
  ringGlow: string;
}

export const MOVIE_SLIDES: MovieSlide[] = [
  {
    id: 'avengers',
    title: 'Avengers: Cuộc Chiến Vô Cực',
    genre: 'Hành Động • Siêu Anh Hùng',
    tagline: 'Cổng không gian vô cực của Thanos rực sáng sắc đỏ & vàng kim hoàng gia',
    backdropUrl:
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1920&q=85',
    accentGlow: 'from-[#e50914]/25 via-amber-500/15 to-purple-600/20',
    ringGlow: 'from-red-500/60 via-amber-500/35 to-purple-500/40',
  },
  {
    id: 'dune',
    title: 'Dune: Hành Tinh Cát',
    genre: 'Khoa Học Viễn Tưởng • Sử Thi',
    tagline: 'Biển cát Arrakis vàng óng dưới ánh hoàng hôn tráng lệ',
    backdropUrl:
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=85',
    accentGlow: 'from-amber-500/30 via-orange-600/20 to-yellow-600/15',
    ringGlow: 'from-amber-500/70 via-orange-500/40 to-yellow-400/50',
  },
  {
    id: 'spiderman',
    title: 'Người Nhện: Du Hành Vũ Trụ',
    genre: 'Hoạt Hình Nghệ Thuật • Đột Phá Kỹ Xảo',
    tagline: 'Lễ hội thị giác neon cyberpunk rực rỡ sắc màu thành phố tương lai',
    backdropUrl:
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1920&q=85',
    accentGlow: 'from-fuchsia-600/25 via-cyan-500/20 to-blue-600/20',
    ringGlow: 'from-fuchsia-500/60 via-cyan-400/35 to-blue-500/40',
  },
  {
    id: 'interstellar',
    title: 'Hố Đen Tử Thần (Interstellar)',
    genre: 'Vũ Trụ Vô Tận • Christopher Nolan',
    tagline: 'Kỳ quan vũ trụ cùng vòng đĩa bồi tụ tinh vân huyền ảo',
    backdropUrl:
      'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=1920&q=85',
    accentGlow: 'from-indigo-600/25 via-purple-500/20 to-pink-500/15',
    ringGlow: 'from-indigo-500/60 via-purple-400/35 to-pink-400/40',
  },
  {
    id: 'cinehub-imax',
    title: 'Đại Sảnh Chiếu Phim CineHub IMAX',
    genre: 'Trải Nghiệm Thượng Hạng • Dolby Atmos',
    tagline: 'Khán phòng điện ảnh tráng lệ với màn hình bạc cực đại và ánh đèn sân khấu lung linh',
    backdropUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1920&q=85',
    accentGlow: 'from-red-600/25 via-amber-400/20 to-red-950/30',
    ringGlow: 'from-red-500/60 via-amber-400/40 to-yellow-500/40',
  },
];

@Component({
  selector: 'ch-auth-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Main Canvas: Không gian điện ảnh sống động thay đổi theo thời gian -->
    <div
      class="relative flex min-h-[calc(100vh-74px)] w-full items-center justify-center p-4 pb-20 sm:p-6 sm:pb-24 lg:p-8 select-none overflow-x-hidden bg-[#030712]"
      cdkTrapFocus
    >
      <!-- ── DYNAMIC FULL-SCREEN MOVIE BACKDROP SLIDESHOW ── -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        @for (slide of movieSlides; track slide.id; let idx = $index) {
          <div
            class="absolute inset-0 transition-opacity duration-1000 ease-in-out"
            [class.opacity-100]="activeSlideIndex() === idx"
            [class.opacity-0]="activeSlideIndex() !== idx"
          >
            <img
              [src]="slide.backdropUrl"
              [alt]="slide.title"
              class="h-full w-full object-cover object-center filter brightness-95 contrast-110 saturate-125 transition-transform duration-[12000ms] ease-out"
              [class.scale-105]="activeSlideIndex() === idx"
              [class.scale-100]="activeSlideIndex() !== idx"
            />
          </div>
        }

        <!-- Cinematic Gradient Overlays (Tăng độ sáng rực rỡ, không bị tối mịt) -->
        <!-- Đèn trần sân khấu rạp chiếu -->
        <div class="absolute inset-0 bg-gradient-to-b from-black/65 via-black/25 to-black/75"></div>
        <!-- Vầng sáng hào quang trung tâm chiếu rọi phía sau thẻ card -->
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] rounded-full bg-amber-500/15 blur-[140px]"
        ></div>
        <!-- Vệt sáng màu động đồng bộ theo từng phim -->
        <div
          class="absolute inset-0 transition-all duration-1000 bg-gradient-to-tr"
          [class]="currentMovie().accentGlow"
        ></div>
        <!-- Lưới chấm công nghệ điện ảnh hiện đại -->
        <div
          class="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:30px_30px] opacity-40"
        ></div>
      </div>

      <!-- ══════════════════════════════════════════════════════════
           THẺ ĐIỆN ẢNH CINEHUB (Mẫu 1 - Thanos card + Đồng bộ phim)
      ══════════════════════════════════════════════════════════ -->
      <div
        class="relative z-10 w-full max-w-[460px] p-[1.5px] rounded-[24px] bg-gradient-to-b shadow-[0_0_60px_rgba(229,9,20,0.35),0_25px_80px_rgba(0,0,0,0.85)] transition-all duration-700"
        [class]="currentMovie().ringGlow"
      >
        <div
          class="relative w-full overflow-hidden rounded-[23px] bg-[#070b18]/90 backdrop-blur-2xl"
        >
          <!-- Nền poster / cổng không gian điện ảnh bên trong thẻ (chuyển động đồng bộ) -->
          <div class="pointer-events-none absolute inset-0 overflow-hidden">
            @for (slide of movieSlides; track slide.id; let idx = $index) {
              <div
                class="absolute inset-0 transition-opacity duration-1000 ease-in-out"
                [class.opacity-60]="activeSlideIndex() === idx"
                [class.opacity-0]="activeSlideIndex() !== idx"
              >
                <img
                  [src]="slide.backdropUrl"
                  [alt]="slide.title"
                  class="h-full w-full object-cover object-center filter brightness-105 contrast-115"
                />
              </div>
            }
            <div
              class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-amber-400/25 blur-[50px]"
            ></div>
            <div
              class="absolute inset-0 bg-gradient-to-t from-[#060a17] via-[#070c1b]/80 to-[#060a17]/40"
            ></div>
            <div
              class="absolute inset-0 bg-gradient-to-b from-[#060a17]/40 via-transparent to-[#060a17]"
            ></div>
          </div>

          <!-- Nội dung chính trong thẻ -->
          <div class="relative z-10 flex flex-col px-6 py-7 sm:px-8 sm:py-8">
            <!-- Thương hiệu CineHub -->
            <div class="text-center space-y-1">
              <span
                class="inline-block font-serif font-bold text-[11px] uppercase tracking-[0.28em] text-amber-300 drop-shadow-[0_2px_8px_rgba(245,158,11,0.7)]"
              >
                HỆ THỐNG RẠP CINEHUB
              </span>
              <h1
                class="text-2xl font-bold tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]"
              >
                @switch (mode()) {
                  @case ('login') {
                    Chào mừng bạn trở lại!
                  }
                  @case ('register') {
                    Tạo tài khoản thành viên
                  }
                  @case ('forgot') {
                    Khôi phục mật khẩu
                  }
                }
              </h1>
            </div>

            <!-- Thanh chuyển đổi tab: ĐĂNG NHẬP / ĐĂNG KÝ -->
            @if (mode() !== 'forgot') {
              <div
                class="mt-4 grid grid-cols-2 p-1 rounded-xl bg-black/60 border border-white/15 backdrop-blur-xl shadow-inner"
                role="tablist"
                aria-label="Chuyển chế độ Đăng nhập hoặc Đăng ký"
              >
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="mode() === 'login'"
                  (click)="setMode('login')"
                  class="rounded-lg py-2 text-xs font-bold tracking-wide transition-all duration-200"
                  [class]="
                    mode() === 'login'
                      ? 'bg-gradient-to-r from-[#e50914] via-[#f43f5e] to-[#e50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.55)]'
                      : 'text-white/65 hover:text-white'
                  "
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="mode() === 'register'"
                  (click)="setMode('register')"
                  class="rounded-lg py-2 text-xs font-bold tracking-wide transition-all duration-200"
                  [class]="
                    mode() === 'register'
                      ? 'bg-gradient-to-r from-[#e50914] via-[#f43f5e] to-[#e50914] text-white shadow-[0_0_15px_rgba(229,9,20,0.55)]'
                      : 'text-white/65 hover:text-white'
                  "
                >
                  Đăng ký
                </button>
              </div>
            } @else {
              <div class="mt-3 text-center">
                <button
                  type="button"
                  (click)="setMode('login')"
                  class="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 transition"
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
                  <span>Quay lại đăng nhập</span>
                </button>
              </div>
            }

            <!-- Thông báo lỗi (nếu có) -->
            @if (errorBanner()) {
              <div
                role="alert"
                class="mt-3.5 flex items-start gap-2.5 rounded-xl border border-red-500/50 bg-red-950/80 p-2.5 text-xs font-medium text-red-200 backdrop-blur-md"
              >
                <svg
                  class="h-4 w-4 shrink-0 text-red-400 mt-0.5"
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

            <!-- ══════════════════════════════════════════════════════════
                 1. FORM: ĐĂNG NHẬP
            ══════════════════════════════════════════════════════════ -->
            @if (mode() === 'login') {
              <form [formGroup]="loginForm" (ngSubmit)="submitLogin()" class="mt-4 space-y-3">
                <!-- Tên đăng nhập / Email -->
                <div
                  class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/55 backdrop-blur-xl transition-all duration-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25 shadow-inner"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/[0.04] text-amber-300"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="8" r="5" />
                      <path d="M20 21a8 8 0 0 0-16 0" />
                    </svg>
                  </div>
                  <input
                    id="login-email"
                    type="email"
                    formControlName="email"
                    autocomplete="email"
                    placeholder="Email hoặc tên đăng nhập"
                    class="h-11 flex-1 bg-transparent px-3 text-xs sm:text-sm font-normal text-white placeholder-white/40 outline-none"
                  />
                </div>

                <!-- Mật khẩu -->
                <div
                  class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/55 backdrop-blur-xl transition-all duration-200 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25 shadow-inner"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/[0.04] text-amber-300"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
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
                    placeholder="Mật khẩu"
                    class="h-11 flex-1 bg-transparent px-3 text-xs sm:text-sm font-normal text-white placeholder-white/40 outline-none"
                  />
                  <button
                    type="button"
                    (click)="toggleShowPassword()"
                    class="px-3 text-white/50 hover:text-white transition"
                    [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                  >
                    @if (showPassword()) {
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
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
                        stroke-width="2"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    }
                  </button>
                </div>

                <!-- Tùy chọn: Ghi nhớ & Quên mật khẩu -->
                <div class="flex items-center justify-between text-xs pt-0.5">
                  <label
                    class="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white"
                  >
                    <input
                      type="checkbox"
                      [checked]="rememberMe()"
                      (change)="rememberMe.set(!rememberMe())"
                      class="h-3.5 w-3.5 rounded border-white/20 bg-black/40 accent-[#e50914]"
                    />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                  <button
                    type="button"
                    (click)="setMode('forgot')"
                    class="font-medium text-amber-300/95 hover:text-amber-200 hover:underline transition"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <!-- Nút Đăng nhập dạng viên thuốc -->
                <div class="pt-1.5 text-center">
                  <button
                    type="submit"
                    [disabled]="submitting()"
                    class="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#e50914] via-[#f43f5e] to-[#e50914] py-2.5 sm:py-3 text-sm font-bold text-white shadow-[0_0_25px_rgba(229,9,20,0.5)] transition-all hover:shadow-[0_0_35px_rgba(229,9,20,0.75)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 border border-red-400/40"
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
                      <span>Đăng nhập ngay</span>
                    }
                  </button>
                </div>
              </form>
            }

            <!-- ══════════════════════════════════════════════════════════
                 2. FORM: ĐĂNG KÝ
            ══════════════════════════════════════════════════════════ -->
            @if (mode() === 'register') {
              <form
                [formGroup]="registerForm"
                (ngSubmit)="submitRegister()"
                class="mt-4 space-y-2.5"
              >
                <!-- Họ và tên -->
                <div
                  class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/55 backdrop-blur-xl focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/[0.04] text-amber-300"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="8" r="5" />
                      <path d="M20 21a8 8 0 0 0-16 0" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    formControlName="fullName"
                    autocomplete="name"
                    placeholder="Họ và tên của bạn"
                    class="h-11 flex-1 bg-transparent px-3 text-xs sm:text-sm font-normal text-white placeholder-white/40 outline-none"
                  />
                </div>

                <!-- Email -->
                <div
                  class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/55 backdrop-blur-xl focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/[0.04] text-amber-300"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    formControlName="email"
                    autocomplete="email"
                    placeholder="Địa chỉ Email"
                    class="h-11 flex-1 bg-transparent px-3 text-xs sm:text-sm font-normal text-white placeholder-white/40 outline-none"
                  />
                </div>

                <!-- Số điện thoại -->
                <div
                  class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/55 backdrop-blur-xl focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/[0.04] text-amber-300"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.21 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                      />
                    </svg>
                  </div>
                  <input
                    type="tel"
                    formControlName="phone"
                    autocomplete="tel"
                    placeholder="Số điện thoại (tùy chọn)"
                    class="h-11 flex-1 bg-transparent px-3 text-xs sm:text-sm font-normal text-white placeholder-white/40 outline-none tabular-nums"
                  />
                </div>

                <!-- Mật khẩu -->
                <div
                  class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/55 backdrop-blur-xl focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/[0.04] text-amber-300"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    [type]="showRegisterPassword() ? 'text' : 'password'"
                    formControlName="password"
                    autocomplete="new-password"
                    placeholder="Mật khẩu (tối thiểu 8 ký tự)"
                    class="h-11 flex-1 bg-transparent px-3 text-xs sm:text-sm font-normal text-white placeholder-white/40 outline-none"
                  />
                  <button
                    type="button"
                    (click)="toggleShowRegisterPassword()"
                    class="px-3 text-white/50 hover:text-white transition"
                  >
                    @if (showRegisterPassword()) {
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    } @else {
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    }
                  </button>
                </div>

                <!-- Nút Đăng ký -->
                <div class="pt-1.5 text-center">
                  <button
                    type="submit"
                    [disabled]="submitting()"
                    class="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#e50914] via-[#f43f5e] to-[#e50914] py-2.5 sm:py-3 text-sm font-bold text-white shadow-[0_0_25px_rgba(229,9,20,0.5)] transition-all hover:shadow-[0_0_35px_rgba(229,9,20,0.75)] hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 border border-red-400/40"
                  >
                    <span>Đăng ký ngay</span>
                  </button>
                </div>
              </form>
            }

            <!-- ══════════════════════════════════════════════════════════
                 3. FORM: QUÊN MẬT KHẨU
            ══════════════════════════════════════════════════════════ -->
            @if (mode() === 'forgot') {
              @if (forgotSent()) {
                <div
                  class="mt-4 flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/60 p-3.5 text-xs font-semibold text-emerald-200"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="mt-0.5 shrink-0 text-emerald-400"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="m9 11 3 3L22 4" />
                  </svg>
                  <div>
                    <p class="font-bold text-sm">Email đã được gửi thành công!</p>
                    <p class="mt-1 opacity-80 leading-relaxed">
                      Vui lòng kiểm tra hộp thư của bạn (kể cả mục Thư rác/Spam) để lấy đường dẫn
                      đặt lại mật khẩu.
                    </p>
                  </div>
                </div>
              } @else {
                <form [formGroup]="forgotForm" (ngSubmit)="submitForgot()" class="mt-4 space-y-3">
                  <div
                    class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/55 backdrop-blur-xl focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/25"
                  >
                    <div
                      class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/[0.04] text-amber-300"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      >
                        <rect width="20" height="16" x="2" y="4" rx="2" />
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      formControlName="email"
                      placeholder="Nhập email tài khoản của bạn"
                      class="h-11 flex-1 bg-transparent px-3 text-xs sm:text-sm font-normal text-white placeholder-white/40 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    [disabled]="submitting()"
                    class="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#e50914] via-[#f43f5e] to-[#e50914] py-2.5 sm:py-3 text-sm font-bold text-white shadow-[0_0_25px_rgba(229,9,20,0.5)] transition-all hover:shadow-[0_0_35px_rgba(229,9,20,0.75)] active:scale-[0.99] disabled:opacity-50 border border-red-400/40"
                  >
                    <span>Gửi liên kết khôi phục</span>
                  </button>
                </form>
              }
            }

            <!-- ══════════════════════════════════════════════════════════
                 HOẶC ĐĂNG NHẬP VỚI + HÀNG NÚT TRÒN GỌN GÀNG, HÀI HÒA
            ══════════════════════════════════════════════════════════ -->
            <div class="mt-5 text-center">
              <span class="text-[11px] font-semibold tracking-wider uppercase text-white/55">
                Hoặc đăng nhập với
              </span>
            </div>

            <!-- Hàng nút tròn mạng xã hội: Kích thước 40px vừa vặn, chuẩn mắt -->
            <div class="mt-2.5 flex items-center justify-center gap-3.5">
              <!-- Nút tròn: Google -->
              <button
                type="button"
                (click)="signInDemoCustomer()"
                title="Đăng nhập bằng tài khoản Google"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-all hover:scale-110 hover:shadow-[0_0_18px_rgba(255,255,255,0.6)] active:scale-95"
              >
                <svg class="h-4.5 w-4.5" viewBox="0 0 24 24">
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
              </button>

              <!-- Nút tròn: Facebook -->
              <button
                type="button"
                (click)="signInDemoCustomer()"
                title="Đăng nhập bằng Facebook"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-[0_4px_16px_rgba(24,119,242,0.4)] transition-all hover:scale-110 hover:shadow-[0_0_18px_rgba(24,119,242,0.7)] active:scale-95"
              >
                <svg class="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
                  <path
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  />
                </svg>
              </button>

              <!-- Nút tròn: CineHub VIP Demo -->
              <button
                type="button"
                (click)="signInDemoCustomer()"
                title="Đăng nhập nhanh tài khoản VIP Demo"
                class="flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/70 bg-gradient-to-br from-[#2a1b02] via-[#3a2503] to-[#1a1000] text-amber-300 shadow-[0_4px_16px_rgba(245,158,11,0.3)] transition-all hover:scale-110 hover:border-amber-300 hover:shadow-[0_0_20px_rgba(245,158,11,0.7)] active:scale-95"
              >
                <svg
                  class="h-4.5 w-4.5 fill-amber-300 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1-6.2-4.5-6.2 4.5 2.3-7.1-6.1-4.5h7.6z"
                  />
                </svg>
              </button>
            </div>

            <!-- Container ẩn cho Google SDK -->
            <div #googleBtnContainer class="hidden" aria-hidden="true"></div>

            <!-- ── Dòng chuyển đổi chân trang ── -->
            <div
              class="mt-5 border-t border-white/10 pt-3.5 text-center text-xs text-white/70 space-y-1.5"
            >
              @if (mode() === 'login') {
                <p>
                  <span>Chưa có tài khoản CineHub? </span>
                  <button
                    type="button"
                    (click)="setMode('register')"
                    class="font-bold text-[#ff3344] hover:underline transition drop-shadow-[0_0_8px_rgba(255,51,68,0.5)] ml-0.5"
                  >
                    Đăng ký ngay
                  </button>
                </p>
              } @else if (mode() === 'register') {
                <p>
                  <span>Đã có tài khoản thành viên? </span>
                  <button
                    type="button"
                    (click)="setMode('login')"
                    class="font-bold text-[#ff3344] hover:underline transition drop-shadow-[0_0_8px_rgba(255,51,68,0.5)] ml-0.5"
                  >
                    Đăng nhập ngay
                  </button>
                </p>
              }

              <p>
                <a
                  routerLink="/verify-email"
                  class="inline-flex items-center gap-1 font-medium text-slate-400 hover:text-amber-300 hover:underline transition text-[11px]"
                >
                  <span>Xác thực tài khoản bằng mã OTP</span>
                  <span>→</span>
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── THANH ĐIỀU KHIỂN & GIỚI THIỆU PHIM ĐANG CHIẾU ── -->
      <div
        class="fixed bottom-3.5 sm:bottom-5 z-20 flex items-center gap-2.5 sm:gap-3 rounded-full border border-white/20 bg-black/75 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs text-white/90 shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all duration-300 hover:border-amber-400/60 hover:bg-black/85"
        role="region"
        aria-label="Hình nền phim chiếu rạp"
      >
        <!-- Nút lùi phim -->
        <button
          type="button"
          (click)="prevSlide()"
          title="Phim trước đó"
          class="flex h-6 w-6 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition active:scale-90"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>

        <!-- Tên phim đang hiển thị -->
        <div class="flex items-center gap-2 max-w-[200px] sm:max-w-none truncate">
          <span class="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500 animate-pulse"></span>
          <span class="font-medium text-[11px] sm:text-xs truncate">
            <span class="text-amber-300 font-bold drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]">
              {{ currentMovie().title }}
            </span>
            <span class="hidden md:inline text-white/60 ml-1.5">
              • {{ currentMovie().genre }}
            </span>
          </span>
        </div>

        <!-- Các chấm chuyển slide tương tác -->
        <div class="flex items-center gap-1.5 pl-0.5">
          @for (slide of movieSlides; track slide.id; let idx = $index) {
            <button
              type="button"
              (click)="goToSlide(idx)"
              [attr.aria-label]="'Đổi sang hình nền ' + slide.title"
              class="h-1.5 sm:h-2 rounded-full transition-all duration-300"
              [class]="
                activeSlideIndex() === idx
                  ? 'w-5 sm:w-6 bg-gradient-to-r from-red-500 to-amber-400 shadow-[0_0_8px_rgba(229,9,20,0.8)]'
                  : 'w-1.5 sm:w-2 bg-white/30 hover:bg-white/60'
              "
            ></button>
          }
        </div>

        <!-- Nút tiến phim -->
        <button
          type="button"
          (click)="nextSlide()"
          title="Phim tiếp theo"
          class="flex h-6 w-6 items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition active:scale-90"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
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

  readonly movieSlides = MOVIE_SLIDES;
  readonly activeSlideIndex = signal(0);
  readonly currentMovie = computed(() => this.movieSlides[this.activeSlideIndex()]);
  private slideIntervalId: ReturnType<typeof setInterval> | null = null;

  readonly mode = signal<'login' | 'register' | 'forgot'>('login');
  readonly submitting = signal(false);
  readonly errorBanner = signal<string | null>(null);
  readonly forgotSent = signal(false);

  readonly showPassword = signal(false);
  readonly showRegisterPassword = signal(false);
  readonly rememberMe = signal(true);

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

  ngOnInit(): void {
    this.startSlideShow();

    this.route.queryParams.subscribe((params) => {
      const targetMode = params['mode'];
      if (targetMode === 'register' || targetMode === 'signup') {
        this.mode.set('register');
      } else if (targetMode === 'forgot') {
        this.mode.set('forgot');
      } else if (targetMode === 'login') {
        this.mode.set('login');
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
    this.startSlideShow();
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
    this.startSlideShow();
  }

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
