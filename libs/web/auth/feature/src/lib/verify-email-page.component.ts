import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { verifyEmailBody } from '@cinehub/contracts';
import { AuthApiService, formatAuthErrorMessage } from '@cinehub/web/auth/data-access';
import { AuthStore, ToastService } from '@cinehub/web/core';
import { zodFormGroupValidator } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-verify-email-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative flex min-h-[calc(100vh-73px)] w-full flex-col md:flex-row bg-[var(--color-surface)]"
    >
      <!-- Left Column: Information & Form Panel -->
      <div
        class="flex flex-1 flex-col justify-center px-6 py-10 sm:px-12 md:w-1/2 lg:px-16 xl:px-24"
      >
        <div class="mx-auto w-full max-w-md space-y-6">
          <!-- Brand Header -->
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
                  >Kích hoạt tài khoản thành viên</span
                >
              </div>
            </div>

            <div class="space-y-1">
              <h1 class="cinema-heading-section">Xác thực Email (OTP)</h1>
              <p class="cinema-metadata">
                Nhập mã xác thực 6 chữ số đã được gửi tới hòm thư email của bạn.
              </p>
            </div>
          </div>

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

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <!-- Email Field -->
            <div>
              <label
                for="verify-email"
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
                  id="verify-email"
                  type="email"
                  formControlName="email"
                  placeholder="ban@cinehub.vn"
                  class="cinema-input cinema-input-icon-leading !h-11 w-full text-sm"
                />
              </div>
            </div>

            <!-- OTP Code Field (Spacious & centered) -->
            <div>
              <div class="mb-1.5 flex items-center justify-between">
                <label
                  for="verify-code"
                  class="cinema-label block text-xs font-medium text-[var(--color-text-primary)]"
                  >Mã xác thực OTP</label
                >
                <button
                  type="button"
                  (click)="resendOtp()"
                  class="text-xs font-semibold text-[var(--color-brand-primary)] hover:underline"
                >
                  Gửi lại mã OTP
                </button>
              </div>
              <div class="relative">
                <input
                  id="verify-code"
                  type="text"
                  maxlength="6"
                  formControlName="code"
                  placeholder="123456"
                  class="cinema-input !h-12 w-full text-center font-mono text-xl font-semibold tracking-[0.35em] text-[var(--color-brand-primary)] tabular-nums"
                />
              </div>
              <p class="cinema-metadata mt-1.5 text-center text-xs">
                Kiểm tra hộp thư đến hoặc mục thư rác (Spam) nếu bạn chưa nhận được mã.
              </p>
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
                <span>Xác nhận kích hoạt tài khoản</span>
              }
            </button>
          </form>

          <!-- Bottom Navigation -->
          <div
            class="border-t border-[var(--color-border)] pt-4 text-center text-xs text-[var(--color-text-secondary)]"
          >
            <a
              routerLink="/auth"
              class="inline-flex items-center gap-1.5 font-semibold text-[var(--color-brand-primary)] hover:underline"
            >
              <svg
                class="h-3.5 w-3.5"
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

      <!-- Right Column: Cinema Visual Key-Art -->
      <div
        class="relative hidden md:flex md:w-1/2 flex-col justify-between overflow-hidden bg-[#160f11] p-10 lg:p-14 text-white"
      >
        <img
          src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=85"
          alt="CineHub Verification"
          class="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-1000 hover:scale-105"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-[#120a0c] via-[#120a0c]/65 to-[#120a0c]/25"
          aria-hidden="true"
        ></div>

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
              Xác Thực Hội Viên
            </span>
          </div>
        </div>

        <div
          class="relative z-10 space-y-4 rounded-xl border border-white/15 bg-black/45 p-6 backdrop-blur-md"
        >
          <div class="space-y-1.5">
            <h2 class="text-xl font-semibold leading-tight text-white">
              Kích Hoạt Tài Khoản Thành Viên
            </h2>
            <p class="text-xs leading-relaxed text-stone-300">
              Chỉ còn một bước để hoàn tất. Xác thực email giúp bảo vệ vé điện tử và tài khoản tích
              điểm của bạn an toàn tuyệt đối.
            </p>
          </div>

          <div class="space-y-2 border-t border-white/15 pt-3.5 text-xs text-stone-200">
            <div class="flex items-center gap-2">
              <span class="text-[var(--color-brand-accent)] font-semibold">✓</span>
              <span>Kích hoạt điểm thưởng thành viên VIP</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[var(--color-brand-accent)] font-semibold">✓</span>
              <span>Nhận vé điện tử trực tiếp qua hộp thư</span>
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
export class VerifyEmailPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authStore = inject(AuthStore);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly email = input<string>('');
  readonly code = input<string>('');

  readonly submitting = signal(false);
  readonly errorBanner = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      email: [''],
      code: [''],
    },
    { validators: [zodFormGroupValidator(verifyEmailBody)] },
  );

  ngOnInit(): void {
    if (this.email()) {
      this.form.controls.email.setValue(this.email());
    }
    if (this.code()) {
      this.form.controls.code.setValue(this.code());
    }
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
      const session = await this.authApi.verifyEmail({ email, code });
      this.authStore.setSession(session.accessToken, session.user);
      this.toast.show('Xác thực email thành công!', 'success');
      void this.router.navigateByUrl('/');
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
