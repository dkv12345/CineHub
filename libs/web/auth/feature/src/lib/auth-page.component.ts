import { A11yModule } from '@angular/cdk/a11y';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
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

@Component({
  selector: 'ch-auth-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Main Full-page Background: Cinematic Ambient -->
    <div
      class="relative flex min-h-[calc(100vh-74px)] w-full items-center justify-center p-4 sm:p-6 lg:p-10 select-none overflow-x-hidden bg-[#020617]"
      cdkTrapFocus
    >
      <!-- Background Ambient Glow & Lights -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full bg-red-600/10 blur-[150px]"
        ></div>
        <div
          class="absolute top-1/3 left-1/4 w-[420px] h-[420px] rounded-full bg-amber-500/10 blur-[120px]"
        ></div>
      </div>

      <!-- ══════════════════════════════════════════════════════════
           CINEMATIC LUXURY AUTH CARD (Mẫu 1 kết hợp phong cách CineHub)
      ══════════════════════════════════════════════════════════ -->
      <div
        class="relative z-10 w-full max-w-[500px] overflow-hidden rounded-[26px] border border-white/15 bg-[#090d18]/90 shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-all duration-300"
      >
        <!-- Background Cinema Key-Art Layer -->
        <div class="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=85"
            alt="CineHub Cinema Experience Artwork"
            class="h-full w-full object-cover object-center opacity-30 scale-105"
          />
          <!-- Deep gradient vignette overlays to guarantee high text contrast -->
          <div
            class="absolute inset-0 bg-gradient-to-b from-[#020617]/70 via-[#0b101e]/85 to-[#050813]"
          ></div>
          <div
            class="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(229,9,20,0.15)_0%,transparent_70%)]"
          ></div>
        </div>

        <!-- Card Content Body -->
        <div class="relative z-10 flex flex-col px-7 py-8 sm:px-10 sm:py-10">
          <!-- ── Brand Header (CineHub Official) ── -->
          <div class="text-center space-y-1.5">
            <div class="inline-flex items-center gap-2">
              <span
                class="grid h-8 w-8 place-items-center rounded-full bg-[#e50914] text-white shadow-[0_0_20px_rgba(229,9,20,0.4)]"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </span>
              <span class="text-2xl font-black tracking-tight text-white">
                CINE<span class="text-[#e50914]">HUB</span>
              </span>
            </div>
            <p class="text-[11px] font-bold tracking-[0.25em] uppercase text-amber-300/90">
              HỆ THỐNG RẠP CHIẾU CHUẨN QUỐC TẾ
            </p>
          </div>

          <!-- ── Segmented Tabs: ĐĂNG NHẬP / ĐĂNG KÝ (Image 1 Style) ── -->
          @if (mode() !== 'forgot') {
            <div
              class="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-white/15 bg-black/50 p-1 backdrop-blur-md"
              role="tablist"
              aria-label="Chuyển chế độ Đăng nhập hoặc Đăng ký"
            >
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="mode() === 'login'"
                (click)="setMode('login')"
                class="rounded-lg py-2.5 text-xs font-bold transition-all"
                [class]="
                  mode() === 'login'
                    ? 'bg-[#e50914] text-white shadow-md shadow-red-900/40'
                    : 'text-white/60 hover:text-white'
                "
              >
                Đăng nhập
              </button>
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="mode() === 'register'"
                (click)="setMode('register')"
                class="rounded-lg py-2.5 text-xs font-bold transition-all"
                [class]="
                  mode() === 'register'
                    ? 'bg-[#e50914] text-white shadow-md shadow-red-900/40'
                    : 'text-white/60 hover:text-white'
                "
              >
                Đăng ký tài khoản
              </button>
            </div>
          } @else {
            <div class="mt-4">
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

          <!-- ── Section Heading & Subtitle ── -->
          <div class="mt-5 text-center space-y-1">
            <h1 class="text-2xl font-extrabold tracking-tight text-white">
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
            <p class="text-xs text-slate-300 leading-relaxed">
              @switch (mode()) {
                @case ('login') {
                  Đăng nhập để đặt vé, tích điểm và trải nghiệm góc nhìn 3D POV.
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

          <!-- ── Error Alert Banner ── -->
          @if (errorBanner()) {
            <div
              role="alert"
              class="mt-4 flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/60 p-3 text-xs font-semibold text-red-200"
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
               1. FORM: ĐĂNG NHẬP (LOGIN)
          ══════════════════════════════════════════════════════════ -->
          @if (mode() === 'login') {
            <form [formGroup]="loginForm" (ngSubmit)="submitLogin()" class="mt-5 space-y-3.5">
              <!-- Email with Left Framed Slot Icon (Mẫu 1 Style) -->
              <div
                class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/45 backdrop-blur-md transition-all focus-within:border-[#e50914] focus-within:ring-2 focus-within:ring-red-600/20"
              >
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/5 text-white/75"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
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
                  placeholder="Email của bạn (ban@cinehub.vn)"
                  class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/45 outline-none"
                />
              </div>

              <!-- Password with Left Lock Icon & Right Eye Toggle (Mẫu 1 Style) -->
              <div
                class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/45 backdrop-blur-md transition-all focus-within:border-[#e50914] focus-within:ring-2 focus-within:ring-red-600/20"
              >
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/5 text-white/75"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
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
                  class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/45 outline-none"
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

              <!-- Options: Ghi nhớ & Quên mật khẩu -->
              <div class="flex items-center justify-between pt-0.5 text-xs">
                <label
                  class="flex items-center gap-2 cursor-pointer select-none text-slate-300 hover:text-white"
                >
                  <input
                    type="checkbox"
                    [checked]="rememberMe()"
                    (change)="rememberMe.set(!rememberMe())"
                    class="h-4 w-4 rounded border-white/20 bg-black/40 accent-[#e50914]"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button
                  type="button"
                  (click)="setMode('forgot')"
                  class="font-semibold text-amber-300 hover:text-amber-200 hover:underline transition"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <!-- Primary Submit Button -->
              <div class="pt-2">
                <button
                  type="submit"
                  [disabled]="submitting()"
                  class="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e50914] text-sm font-extrabold text-white shadow-lg shadow-red-900/40 transition hover:bg-[#ff101c] active:scale-[0.99] disabled:opacity-50"
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
              </div>
            </form>
          }

          <!-- ══════════════════════════════════════════════════════════
               2. FORM: ĐĂNG KÝ (REGISTER)
          ══════════════════════════════════════════════════════════ -->
          @if (mode() === 'register') {
            <form [formGroup]="registerForm" (ngSubmit)="submitRegister()" class="mt-5 space-y-3">
              <!-- Full Name -->
              <div
                class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/45 backdrop-blur-md transition-all focus-within:border-[#e50914] focus-within:ring-2 focus-within:ring-red-600/20"
              >
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/5 text-white/75"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
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
                  class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/45 outline-none"
                />
              </div>

              <!-- Email -->
              <div
                class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/45 backdrop-blur-md transition-all focus-within:border-[#e50914] focus-within:ring-2 focus-within:ring-red-600/20"
              >
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/5 text-white/75"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
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
                  class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/45 outline-none"
                />
              </div>

              <!-- Phone -->
              <div
                class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/45 backdrop-blur-md transition-all focus-within:border-[#e50914] focus-within:ring-2 focus-within:ring-red-600/20"
              >
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/5 text-white/75"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
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
                  class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/45 outline-none tabular-nums"
                />
              </div>

              <!-- Password -->
              <div
                class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/45 backdrop-blur-md transition-all focus-within:border-[#e50914] focus-within:ring-2 focus-within:ring-red-600/20"
              >
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/5 text-white/75"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
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
                  class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/45 outline-none"
                />
                <button
                  type="button"
                  (click)="toggleShowRegisterPassword()"
                  class="px-3 text-white/50 hover:text-white transition"
                  [attr.aria-label]="showRegisterPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
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

              <!-- Submit Register -->
              <div class="pt-2">
                <button
                  type="submit"
                  [disabled]="submitting()"
                  class="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e50914] text-sm font-extrabold text-white shadow-lg shadow-red-900/40 transition hover:bg-[#ff101c] active:scale-[0.99] disabled:opacity-50"
                >
                  @if (submitting()) {
                    <span>Đang tạo tài khoản...</span>
                  } @else {
                    <span>Đăng ký thành viên</span>
                  }
                </button>
              </div>
            </form>
          }

          <!-- ══════════════════════════════════════════════════════════
               3. FORM: QUÊN MẬT KHẨU (FORGOT)
          ══════════════════════════════════════════════════════════ -->
          @if (mode() === 'forgot') {
            @if (forgotSent()) {
              <div
                class="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/50 p-4 text-xs font-semibold text-emerald-200"
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
                  <p class="font-bold text-sm">Email đã được gửi!</p>
                  <p class="mt-1 opacity-80">
                    Vui lòng kiểm tra hộp thư của bạn (kể cả thư mục Spam) để nhận liên kết khôi
                    phục mật khẩu.
                  </p>
                </div>
              </div>
            } @else {
              <form [formGroup]="forgotForm" (ngSubmit)="submitForgot()" class="mt-5 space-y-3.5">
                <div
                  class="flex items-center overflow-hidden rounded-xl border border-white/20 bg-black/45 backdrop-blur-md transition-all focus-within:border-[#e50914] focus-within:ring-2 focus-within:ring-red-600/20"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/15 bg-white/5 text-white/75"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.8"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    formControlName="email"
                    placeholder="Email tài khoản CineHub của bạn"
                    class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/45 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  [disabled]="submitting()"
                  class="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#e50914] text-sm font-extrabold text-white shadow-lg shadow-red-900/40 transition hover:bg-[#ff101c] active:scale-[0.99] disabled:opacity-50"
                >
                  <span>Gửi liên kết khôi phục</span>
                </button>
              </form>
            }
          }

          <!-- ── Divider OR ── -->
          <div class="relative my-4 flex items-center justify-center">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-white/10"></div>
            </div>
            <span
              class="relative bg-[#090d18] px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400"
            >
              Hoặc tiếp tục với
            </span>
          </div>

          <!-- ── Social & VIP Demo Sign-In (Matching CineHub) ── -->
          <div class="space-y-2.5">
            <!-- Google Sign-In Container -->
            <div
              #googleBtnContainer
              class="flex min-h-[40px] justify-center"
              aria-label="Google Sign-In"
            ></div>

            <!-- Quick Demo VIP Button -->
            <button
              type="button"
              (click)="signInDemoCustomer()"
              class="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 px-4 text-xs font-bold text-amber-300 transition hover:border-amber-400 hover:bg-amber-500/20 active:scale-[0.99]"
            >
              <svg class="h-4 w-4 fill-amber-400" viewBox="0 0 24 24">
                <path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1-6.2-4.5-6.2 4.5 2.3-7.1-6.1-4.5h7.6z" />
              </svg>
              <span>Đăng nhập nhanh — Tài khoản Demo VIP</span>
            </button>
          </div>

          <!-- ── Bottom Switcher & OTP Link ── -->
          <div
            class="mt-5 border-t border-white/10 pt-4 text-center text-xs text-slate-400 space-y-1.5"
          >
            @if (mode() === 'login') {
              <p>
                Chưa có tài khoản CineHub?
                <button
                  type="button"
                  (click)="setMode('register')"
                  class="font-bold text-[#e50914] hover:underline ml-1"
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
                  class="font-bold text-[#e50914] hover:underline ml-1"
                >
                  Đăng nhập ngay
                </button>
              </p>
            }

            <p>
              <a
                routerLink="/verify-email"
                class="inline-flex items-center gap-1 font-medium text-slate-400 hover:text-amber-300 hover:underline transition"
              >
                <span>Xác thực email bằng mã OTP</span>
                <span>→</span>
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AuthPageComponent implements OnInit, AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authStore = inject(AuthStore);
  private readonly googleAuth = inject(GoogleAuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly googleBtnContainer = viewChild<ElementRef<HTMLElement>>('googleBtnContainer');

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
    // 1. Phản hồi tức thì khi URL có queryParam ?mode=register hoặc ?mode=login
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

    // 2. Phản hồi khi route trực tiếp: /register hoặc /login
    this.route.data.subscribe((data) => {
      if (data['mode'] === 'register') {
        this.mode.set('register');
      } else if (data['mode'] === 'login') {
        this.mode.set('login');
      }
    });
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
