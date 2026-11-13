import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { verifyEmailBody } from '@cinehub/contracts';
import { AuthApiService, formatAuthErrorMessage } from '@cinehub/web/auth/data-access';
import { ToastService } from '@cinehub/web/core';
import { zodFormGroupValidator } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-verify-email-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative flex min-h-[calc(100vh-74px)] w-full items-center justify-center bg-gradient-to-b from-[#120826] via-[#090514] to-[#04020a] p-4 sm:p-6 lg:p-10"
    >
      <!-- Background Ambient Glow -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[130px]"
        ></div>
      </div>

      <!-- Centered Card -->
      <div
        class="relative z-10 w-full max-w-[460px] overflow-hidden rounded-[24px] border border-white/20 bg-[#0c0818]/90 p-8 sm:p-10 shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
      >
        <!-- Header -->
        <div class="text-center">
          <div
            class="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/40 bg-amber-400/10 text-amber-300"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8z"
              />
              <polyline points="3,7 12,13 21,7" />
            </svg>
          </div>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-white">Xác thực Email</h1>
          <p class="mt-1.5 text-xs text-white/60">
            Nhập mã OTP 6 chữ số đã được gửi tới hòm thư email của bạn để kích hoạt tài khoản.
          </p>
        </div>

        <!-- Error Banner -->
        @if (errorBanner()) {
          <div
            role="alert"
            class="mt-5 flex items-start gap-2.5 rounded-lg border border-red-500/40 bg-red-950/60 p-3 text-xs font-semibold text-red-200"
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

        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-6 space-y-4">
          <!-- Email Input -->
          <div
            class="flex items-center overflow-hidden rounded-lg border border-white/25 bg-black/45 backdrop-blur-md focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20"
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
              placeholder="Email của bạn"
              class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/40 outline-none"
            />
          </div>

          <!-- OTP Input — Spacious, mono, centered -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label
                for="verify-code"
                class="text-[11px] font-semibold uppercase tracking-wider text-white/60"
              >
                Mã xác thực OTP
              </label>
              <button
                type="button"
                (click)="resendOtp()"
                class="text-[11px] font-semibold text-amber-300 hover:text-amber-200 hover:underline"
              >
                Gửi lại mã OTP
              </button>
            </div>
            <input
              id="verify-code"
              type="text"
              maxlength="6"
              inputmode="numeric"
              formControlName="code"
              placeholder="000000"
              class="h-14 w-full rounded-xl border border-white/25 bg-black/60 text-center font-mono text-2xl font-bold tracking-[0.5em] text-amber-300 placeholder-white/20 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25"
            />
            <p class="mt-1.5 text-center text-[11px] text-white/50">
              Kiểm tra hộp thư đến hoặc mục thư rác (Spam) nếu bạn chưa thấy mã.
            </p>
          </div>

          <button
            type="submit"
            [disabled]="submitting()"
            class="h-11 w-full rounded-full border border-indigo-400/40 bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#2e1065] text-xs font-bold text-white shadow-[0_0_25px_rgba(99,102,241,0.35)] transition hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] active:scale-95 disabled:opacity-50"
          >
            @if (submitting()) {
              <span>Đang xác thực...</span>
            } @else {
              <span>Xác nhận kích hoạt tài khoản</span>
            }
          </button>
        </form>

        <!-- Back to login -->
        <div class="mt-6 border-t border-white/10 pt-4 text-center">
          <a
            routerLink="/auth"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 transition"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Quay lại trang đăng nhập</span>
          </a>
        </div>
      </div>
    </div>
  `,
})
export class VerifyEmailPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly email = input<string>('');
  readonly code = input<string>('');

  readonly submitting = signal(false);
  readonly errorBanner = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    { email: [''], code: [''] },
    { validators: [zodFormGroupValidator(verifyEmailBody)] },
  );

  ngOnInit(): void {
    if (this.email()) this.form.controls.email.setValue(this.email());
    if (this.code()) this.form.controls.code.setValue(this.code());
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      const err = Object.values(this.form.errors ?? {})[0];
      this.errorBanner.set(
        typeof err === 'string' ? err : 'Vui lòng nhập email và mã OTP 6 chữ số.',
      );
      return;
    }
    this.submitting.set(true);
    this.errorBanner.set(null);
    const { email, code } = this.form.getRawValue();
    try {
      await this.authApi.verifyEmail({ email, code });
      this.toast.show('Xác thực email thành công! Vui lòng đăng nhập.', 'success');
      void this.router.navigate(['/auth'], {
        queryParams: { mode: 'login', email },
      });
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  async resendOtp(): Promise<void> {
    const email = this.form.controls.email.value.trim();
    if (!email) {
      this.errorBanner.set('Vui lòng nhập email để gửi lại mã OTP.');
      return;
    }
    try {
      await this.authApi.resendVerification(email);
      this.toast.show('Đã gửi lại mã OTP vào hộp thư của bạn.', 'info');
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    }
  }
}
