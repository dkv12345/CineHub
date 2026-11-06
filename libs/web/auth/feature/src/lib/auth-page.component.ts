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
    <!-- Main Full-page Background -->
    <div
      class="relative flex min-h-[calc(100vh-74px)] w-full items-center justify-center p-4 sm:p-6 lg:p-10 select-none overflow-x-hidden"
      [class]="
        activeStyle() === 'thanos'
          ? 'bg-gradient-to-b from-[#120826] via-[#090514] to-[#04020a]'
          : 'bg-[#101012]'
      "
      cdkTrapFocus
    >
      <!-- Background Ambient Glow -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        @if (activeStyle() === 'thanos') {
          <div
            class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-purple-600/10 blur-[130px]"
          ></div>
          <div
            class="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-amber-500/10 blur-[100px]"
          ></div>
        } @else {
          <div
            class="absolute top-1/2 right-1/4 w-[500px] h-[500px] rounded-full bg-red-600/10 blur-[140px]"
          ></div>
        }
      </div>

      <!-- ══════════════════════════════════════════════════════════
           FLOATING TOP STYLE SWITCHER (Cho phép chọn cả 2 Mẫu)
      ══════════════════════════════════════════════════════════ -->
      <div
        class="fixed top-20 right-4 sm:right-8 z-50 flex items-center gap-1 rounded-full border border-white/20 bg-black/80 p-1.5 shadow-2xl backdrop-blur-xl"
      >
        <button
          type="button"
          (click)="activeStyle.set('thanos')"
          [class]="
            activeStyle() === 'thanos'
              ? 'bg-gradient-to-r from-purple-800 to-indigo-800 text-white shadow-md'
              : 'text-white/60 hover:text-white'
          "
          class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all"
        >
          <span>🎭</span>
          <span>Mẫu 1: Thanos Poster</span>
        </button>
        <button
          type="button"
          (click)="activeStyle.set('netflax')"
          [class]="
            activeStyle() === 'netflax'
              ? 'bg-[#e50914] text-white shadow-md'
              : 'text-white/60 hover:text-white'
          "
          class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all"
        >
          <span>🎬</span>
          <span>Mẫu 2: Netflax Split</span>
        </button>
      </div>

      <!-- ══════════════════════════════════════════════════════════
           GIAO DIỆN MẪU 1: Thanos Movie Bot (Ảnh 1)
      ══════════════════════════════════════════════════════════ -->
      @if (activeStyle() === 'thanos') {
        <div
          class="relative z-10 w-full max-w-[490px] overflow-hidden rounded-[28px] border border-white/20 bg-[#0c0818]/90 shadow-[0_30px_90px_rgba(0,0,0,0.85)] backdrop-blur-2xl transition-all duration-300"
        >
          <!-- Thanos Artwork Layer -->
          <div class="pointer-events-none absolute inset-0 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=85"
              alt="Avengers Thanos Cinema Artwork"
              class="h-full w-full object-cover object-center opacity-40 scale-105"
            />
            <!-- Dark gradient overlay to preserve contrast -->
            <div
              class="absolute inset-0 bg-gradient-to-b from-[#090514]/40 via-[#0a0618]/85 to-[#070312]"
            ></div>
            <div
              class="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(245,158,11,0.18)_0%,transparent_65%)]"
            ></div>
          </div>

          <!-- Card Content -->
          <div class="relative z-10 flex flex-col px-7 py-9 sm:px-10 sm:py-10">
            <!-- Header Brand / Logo -->
            <div class="text-center">
              <span
                class="inline-block text-xs font-serif font-bold tracking-[0.3em] text-amber-300 drop-shadow-[0_2px_10px_rgba(245,158,11,0.5)] uppercase"
              >
                MOVIE BOT
              </span>
              <h1
                class="mt-1 text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
              >
                Welcome Back!
              </h1>
              <div class="mt-2 flex items-center justify-center gap-4">
                <button
                  type="button"
                  (click)="setMode('login')"
                  [class]="
                    mode() === 'login'
                      ? 'text-amber-300 border-b-2 border-amber-300'
                      : 'text-white/60 hover:text-white'
                  "
                  class="pb-1 text-[11px] font-bold tracking-[0.25em] uppercase transition"
                >
                  LOGIN
                </button>
                <span class="text-white/30">•</span>
                <button
                  type="button"
                  (click)="setMode('register')"
                  [class]="
                    mode() === 'register'
                      ? 'text-amber-300 border-b-2 border-amber-300'
                      : 'text-white/60 hover:text-white'
                  "
                  class="pb-1 text-[11px] font-bold tracking-[0.25em] uppercase transition"
                >
                  SIGN UP
                </button>
              </div>
            </div>

            <!-- Error Banner -->
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

            <!-- ── FORM: LOGIN ── -->
            @if (mode() === 'login') {
              <form [formGroup]="loginForm" (ngSubmit)="submitLogin()" class="mt-6 space-y-3.5">
                <!-- Username / Email Input with Left Icon Box (Image 1 Style) -->
                <div
                  class="flex items-center overflow-hidden rounded-lg border border-white/25 bg-black/45 backdrop-blur-md transition-all focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/20 bg-white/5 text-white/80"
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
                    type="email"
                    formControlName="email"
                    placeholder="Username / Email"
                    class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/50 outline-none"
                  />
                </div>

                <!-- Password Input with Left Lock Icon & Right Eye (Image 1 Style) -->
                <div
                  class="flex items-center overflow-hidden rounded-lg border border-white/25 bg-black/45 backdrop-blur-md transition-all focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/20 bg-white/5 text-white/80"
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
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    placeholder="Password"
                    class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/50 outline-none"
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

                <!-- Forgot password right link (Image 1 Style) -->
                <div class="flex justify-end pt-0.5">
                  <button
                    type="button"
                    (click)="setMode('forgot')"
                    class="text-[11px] font-medium text-white/75 hover:text-amber-300 hover:underline transition"
                  >
                    I've forgotten my password
                  </button>
                </div>

                <!-- Centered Pill Submit Button (Image 1 Style) -->
                <div class="pt-2 text-center">
                  <button
                    type="submit"
                    [disabled]="submitting()"
                    class="inline-flex min-w-[200px] items-center justify-center rounded-full border border-indigo-400/40 bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#2e1065] px-8 py-2.5 text-xs font-bold text-white shadow-[0_0_25px_rgba(99,102,241,0.35)] transition-all hover:border-indigo-300 hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] active:scale-95 disabled:opacity-50"
                  >
                    @if (submitting()) {
                      <span class="inline-flex items-center gap-2">
                        <svg
                          class="h-3.5 w-3.5 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        >
                          <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        <span>Authenticating...</span>
                      </span>
                    } @else {
                      <span>Login Now</span>
                    }
                  </button>
                </div>
              </form>
            }

            <!-- ── FORM: REGISTER ── -->
            @if (mode() === 'register') {
              <form
                [formGroup]="registerForm"
                (ngSubmit)="submitRegister()"
                class="mt-6 space-y-3.5"
              >
                <!-- Full name -->
                <div
                  class="flex items-center overflow-hidden rounded-lg border border-white/25 bg-black/45 backdrop-blur-md"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/20 bg-white/5 text-white/80"
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
                    placeholder="Full Name (Họ và tên)"
                    class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/50 outline-none"
                  />
                </div>

                <!-- Email -->
                <div
                  class="flex items-center overflow-hidden rounded-lg border border-white/25 bg-black/45 backdrop-blur-md"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/20 bg-white/5 text-white/80"
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
                    placeholder="Email address"
                    class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/50 outline-none"
                  />
                </div>

                <!-- Phone -->
                <div
                  class="flex items-center overflow-hidden rounded-lg border border-white/25 bg-black/45 backdrop-blur-md"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/20 bg-white/5 text-white/80"
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
                    placeholder="Phone number (optional)"
                    class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/50 outline-none"
                  />
                </div>

                <!-- Password -->
                <div
                  class="flex items-center overflow-hidden rounded-lg border border-white/25 bg-black/45 backdrop-blur-md"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/20 bg-white/5 text-white/80"
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
                    placeholder="Password (min 8 chars)"
                    class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/50 outline-none"
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

                <div class="pt-2 text-center">
                  <button
                    type="submit"
                    [disabled]="submitting()"
                    class="inline-flex min-w-[200px] items-center justify-center rounded-full border border-indigo-400/40 bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#2e1065] px-8 py-2.5 text-xs font-bold text-white shadow-[0_0_25px_rgba(99,102,241,0.35)] transition-all hover:border-indigo-300 hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] active:scale-95 disabled:opacity-50"
                  >
                    <span>Sign Up Now</span>
                  </button>
                </div>
              </form>
            }

            <!-- ── FORM: FORGOT ── -->
            @if (mode() === 'forgot') {
              <form [formGroup]="forgotForm" (ngSubmit)="submitForgot()" class="mt-6 space-y-3.5">
                <div
                  class="flex items-center overflow-hidden rounded-lg border border-white/25 bg-black/45 backdrop-blur-md"
                >
                  <div
                    class="flex h-11 w-11 shrink-0 items-center justify-center border-r border-white/20 bg-white/5 text-white/80"
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
                    placeholder="Enter your registered email"
                    class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/50 outline-none"
                  />
                </div>

                <div class="pt-2 text-center">
                  <button
                    type="submit"
                    [disabled]="submitting()"
                    class="inline-flex min-w-[200px] items-center justify-center rounded-full border border-indigo-400/40 bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#2e1065] px-8 py-2.5 text-xs font-bold text-white shadow-[0_0_25px_rgba(99,102,241,0.35)] transition-all hover:border-indigo-300 hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] active:scale-95 disabled:opacity-50"
                  >
                    <span>Send Reset Link</span>
                  </button>
                </div>
              </form>
            }

            <!-- Login with Others Header (Image 1 Style) -->
            <div class="mt-6 text-center">
              <span class="text-[11px] font-medium tracking-wider text-white/60">
                Login with Others
              </span>
            </div>

            <!-- Social Circle Buttons (Image 1 Style) -->
            <div class="mt-3 flex items-center justify-center gap-3.5">
              <!-- Google Circle -->
              <button
                type="button"
                (click)="signInDemoCustomer()"
                title="Đăng nhập với Google"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg shadow-black/40 transition hover:scale-105 active:scale-95"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24">
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

              <!-- Facebook Circle -->
              <button
                type="button"
                (click)="signInDemoCustomer()"
                title="Đăng nhập với Facebook"
                class="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1877F2] shadow-lg shadow-black/40 transition hover:scale-105 active:scale-95"
              >
                <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path
                    d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                  />
                </svg>
              </button>

              <!-- Quick Demo VIP Circle -->
              <button
                type="button"
                (click)="signInDemoCustomer()"
                title="Đăng nhập nhanh Demo VIP"
                class="flex h-10 w-10 items-center justify-center rounded-full border border-amber-400/40 bg-[#160d2e] text-amber-300 shadow-lg shadow-black/40 transition hover:scale-105 hover:border-amber-400 active:scale-95"
              >
                <svg class="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path
                    d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1-6.2-4.5-6.2 4.5 2.3-7.1-6.1-4.5h7.6z"
                  />
                </svg>
              </button>
            </div>

            <!-- Footer: Don't have account? Sign up (Image 1 Style) -->
            <div class="mt-6 text-center text-xs text-white/80">
              @if (mode() === 'login') {
                <span>Don't have account? </span>
                <button
                  type="button"
                  (click)="setMode('register')"
                  class="font-bold text-[#ff453a] hover:underline"
                >
                  Sign up
                </button>
              } @else {
                <span>Already have an account? </span>
                <button
                  type="button"
                  (click)="setMode('login')"
                  class="font-bold text-[#ff453a] hover:underline"
                >
                  Sign in
                </button>
              }
            </div>
          </div>
        </div>
      }

      <!-- ══════════════════════════════════════════════════════════
           GIAO DIỆN MẪU 2: Netflax Movie Poster Split (Ảnh 2)
      ══════════════════════════════════════════════════════════ -->
      @if (activeStyle() === 'netflax') {
        <div
          class="relative z-10 flex w-full max-w-[940px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1e1e1e] shadow-[0_25px_80px_rgba(0,0,0,0.85)] md:flex-row transition-all duration-300 min-h-[580px]"
        >
          <!-- ── Left Side: Movie Poster Collage (Spectre, Matrix, Mad Max, Scarface, etc.) ── -->
          <div
            class="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-black md:flex"
          >
            <!-- Authentic Movie Poster Collage Grid (Matching Image 2) -->
            <div
              class="absolute inset-0 grid grid-cols-2 gap-1.5 p-2 opacity-90 filter contrast-110"
            >
              <!-- Poster 1: Spectre 007 -->
              <div class="relative overflow-hidden rounded-lg bg-slate-900 group">
                <img
                  src="https://images.unsplash.com/photo-1509281373149-e957c6296406?auto=format&fit=crop&w=600&q=80"
                  alt="Spectre 007 Action"
                  class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5"
                >
                  <span class="font-serif font-black tracking-widest text-white text-xs uppercase"
                    >SPECTRE 007</span
                  >
                </div>
              </div>

              <!-- Poster 2: The Matrix -->
              <div class="relative overflow-hidden rounded-lg bg-slate-900 group">
                <img
                  src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80"
                  alt="The Matrix Sci-Fi"
                  class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5"
                >
                  <span class="font-mono font-bold tracking-widest text-emerald-400 text-xs"
                    >MATRIX</span
                  >
                </div>
              </div>

              <!-- Poster 3: Mad Max Fury Road -->
              <div class="relative overflow-hidden rounded-lg bg-slate-900 group">
                <img
                  src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80"
                  alt="Mad Max Fury Road"
                  class="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5"
                >
                  <span class="font-extrabold tracking-tight text-amber-400 text-xs uppercase"
                    >MAD MAX</span
                  >
                </div>
              </div>

              <!-- Poster 4: Scarface / Classic Crime -->
              <div class="relative overflow-hidden rounded-lg bg-slate-900 group">
                <img
                  src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80"
                  alt="Scarface Noir"
                  class="h-full w-full object-cover grayscale contrast-125 transition duration-500 group-hover:scale-105"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5"
                >
                  <span class="font-serif font-black tracking-widest text-red-500 text-xs"
                    >SCARFACE</span
                  >
                </div>
              </div>
            </div>

            <!-- Soft vignette over poster edges -->
            <div
              class="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#1e1e1e]"
            ></div>
          </div>

          <!-- ── Right Side: Clean Form Panel (Matching Image 2) ── -->
          <div class="flex flex-1 flex-col justify-center px-8 py-10 sm:px-12 lg:px-14">
            <div class="mx-auto w-full max-w-[360px]">
              <!-- Netflax / CineHub Red Logo (Image 2 Style) -->
              <div class="flex items-center gap-2">
                <span
                  class="grid h-7 w-7 place-items-center rounded-full bg-[#e50914] text-white shadow-md shadow-red-900/40"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </span>
                <span class="text-xl font-extrabold tracking-tight text-[#e50914]"> CineHub </span>
              </div>

              <!-- Title & Subtitle -->
              <h1 class="mt-4 text-2xl font-bold tracking-tight text-white">
                @switch (mode()) {
                  @case ('login') {
                    Welcome Back
                  }
                  @case ('register') {
                    Create Account
                  }
                  @case ('forgot') {
                    Reset Password
                  }
                }
              </h1>
              <p class="mt-1 text-xs text-white/55">
                @switch (mode()) {
                  @case ('login') {
                    Enter your Details
                  }
                  @case ('register') {
                    Join CineHub VIP Club today
                  }
                  @case ('forgot') {
                    Enter your email to receive recovery instructions
                  }
                }
              </p>

              <!-- Error Alert -->
              @if (errorBanner()) {
                <div
                  role="alert"
                  class="mt-3 rounded-lg border border-red-500/30 bg-red-950/40 p-2.5 text-xs text-red-300"
                >
                  {{ errorBanner() }}
                </div>
              }

              <!-- ── Form: Login (Image 2 Style) ── -->
              @if (mode() === 'login') {
                <form [formGroup]="loginForm" (ngSubmit)="submitLogin()" class="mt-5 space-y-3">
                  <!-- Email Input (White Box in Image 2) -->
                  <div>
                    <input
                      type="email"
                      formControlName="email"
                      placeholder="Enter your Email"
                      class="h-11 w-full rounded-lg bg-white px-3.5 text-xs font-medium text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-[#e50914]"
                    />
                  </div>

                  <!-- Password Input -->
                  <div class="relative">
                    <input
                      [type]="showPassword() ? 'text' : 'password'"
                      formControlName="password"
                      placeholder="Enter your Password"
                      class="h-11 w-full rounded-lg bg-white pl-3.5 pr-10 text-xs font-medium text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-[#e50914]"
                    />
                    <button
                      type="button"
                      (click)="toggleShowPassword()"
                      class="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-gray-500 hover:text-gray-900"
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

                  <!-- Forgot password link -->
                  <div class="flex justify-end">
                    <button
                      type="button"
                      (click)="setMode('forgot')"
                      class="text-[11px] font-medium text-white/60 hover:text-[#e50914] transition"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <!-- Red Primary Continue Button (Image 2 Style) -->
                  <button
                    type="submit"
                    [disabled]="submitting()"
                    class="h-11 w-full rounded-lg bg-[#e50914] text-xs font-bold text-white shadow-lg shadow-red-900/30 transition hover:bg-[#ff101c] active:scale-[0.99] disabled:opacity-50"
                  >
                    @if (submitting()) {
                      <span>Please wait...</span>
                    } @else {
                      <span>Continue</span>
                    }
                  </button>
                </form>
              }

              <!-- ── Form: Register (Image 2 Style) ── -->
              @if (mode() === 'register') {
                <form
                  [formGroup]="registerForm"
                  (ngSubmit)="submitRegister()"
                  class="mt-5 space-y-3"
                >
                  <input
                    type="text"
                    formControlName="fullName"
                    placeholder="Enter Full Name"
                    class="h-11 w-full rounded-lg bg-white px-3.5 text-xs font-medium text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-[#e50914]"
                  />
                  <input
                    type="email"
                    formControlName="email"
                    placeholder="Enter your Email"
                    class="h-11 w-full rounded-lg bg-white px-3.5 text-xs font-medium text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-[#e50914]"
                  />
                  <input
                    type="tel"
                    formControlName="phone"
                    placeholder="Enter Phone Number (optional)"
                    class="h-11 w-full rounded-lg bg-white px-3.5 text-xs font-medium text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-[#e50914]"
                  />
                  <input
                    [type]="showRegisterPassword() ? 'text' : 'password'"
                    formControlName="password"
                    placeholder="Create Password (min 8 chars)"
                    class="h-11 w-full rounded-lg bg-white px-3.5 text-xs font-medium text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-[#e50914]"
                  />
                  <button
                    type="submit"
                    [disabled]="submitting()"
                    class="h-11 w-full rounded-lg bg-[#e50914] text-xs font-bold text-white shadow-lg shadow-red-900/30 transition hover:bg-[#ff101c] active:scale-[0.99] disabled:opacity-50"
                  >
                    <span>Register Now</span>
                  </button>
                </form>
              }

              <!-- ── Form: Forgot (Image 2 Style) ── -->
              @if (mode() === 'forgot') {
                <form [formGroup]="forgotForm" (ngSubmit)="submitForgot()" class="mt-5 space-y-3">
                  <input
                    type="email"
                    formControlName="email"
                    placeholder="Enter your Email"
                    class="h-11 w-full rounded-lg bg-white px-3.5 text-xs font-medium text-gray-900 placeholder-gray-400 outline-none transition focus:ring-2 focus:ring-[#e50914]"
                  />
                  <button
                    type="submit"
                    [disabled]="submitting()"
                    class="h-11 w-full rounded-lg bg-[#e50914] text-xs font-bold text-white shadow-lg shadow-red-900/30 transition hover:bg-[#ff101c] active:scale-[0.99] disabled:opacity-50"
                  >
                    <span>Send Reset Email</span>
                  </button>
                  <div class="text-center pt-1">
                    <button
                      type="button"
                      (click)="setMode('login')"
                      class="text-xs text-white/60 hover:text-white"
                    >
                      ← Back to Login
                    </button>
                  </div>
                </form>
              }

              <!-- Divider OR (Image 2 Style) -->
              <div class="relative my-3 flex items-center justify-center">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-white/10"></div>
                </div>
                <span
                  class="relative bg-[#1e1e1e] px-3 text-[10px] font-bold uppercase tracking-widest text-white/45"
                >
                  OR
                </span>
              </div>

              <!-- Stacked White Social Buttons (Exact Image 2 Style) -->
              <div class="space-y-2">
                <!-- Continue with Google Button -->
                <button
                  type="button"
                  (click)="signInDemoCustomer()"
                  class="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-gray-800 shadow-sm transition hover:bg-gray-100 active:scale-[0.99]"
                >
                  <svg class="h-4 w-4" viewBox="0 0 24 24">
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
                  <span>Continue With Google</span>
                </button>

                <!-- Continue with Facebook Button -->
                <button
                  type="button"
                  (click)="signInDemoCustomer()"
                  class="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-gray-800 shadow-sm transition hover:bg-gray-100 active:scale-[0.99]"
                >
                  <svg class="h-4 w-4 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path
                      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                    />
                  </svg>
                  <span>Continue With Facebook</span>
                </button>

                <!-- Continue with Demo VIP -->
                <button
                  type="button"
                  (click)="signInDemoCustomer()"
                  class="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-xs font-semibold text-gray-800 shadow-sm transition hover:bg-gray-100 active:scale-[0.99]"
                >
                  <svg class="h-4 w-4 fill-amber-500" viewBox="0 0 24 24">
                    <path
                      d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1-6.2-4.5-6.2 4.5 2.3-7.1-6.1-4.5h7.6z"
                    />
                  </svg>
                  <span>Continue With Demo VIP</span>
                </button>
              </div>

              <!-- Footer: Dont have account? Sign Up (Image 2 Style) -->
              <div class="mt-4 text-center text-xs text-white/60">
                @if (mode() === 'login') {
                  <span>Dont have account? </span>
                  <button
                    type="button"
                    (click)="setMode('register')"
                    class="font-semibold text-[#e50914] hover:underline"
                  >
                    Sign Up
                  </button>
                } @else {
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    (click)="setMode('login')"
                    class="font-semibold text-[#e50914] hover:underline"
                  >
                    Sign In
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }
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

  // Cho phép chuyển đổi giữa 2 phong cách theo yêu cầu của người dùng
  readonly activeStyle = signal<'thanos' | 'netflax'>('thanos');
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
