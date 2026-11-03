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
    <div class="cinema-container flex min-h-[75vh] max-w-md flex-col justify-center py-12">
      <div class="cinema-panel-raised p-6 sm:p-8 space-y-6">
        <div class="space-y-1">
          <span class="cinema-eyebrow">Xác thực tài khoản</span>
          <h1 class="font-display text-2xl font-semibold text-[var(--cinema-text-primary)]">
            Xác thực Email (OTP)
          </h1>
          <p class="text-xs text-[var(--cinema-text-muted)]">
            Nhập mã xác thực 6 chữ số đã được gửi tới hộp thư của bạn.
          </p>
        </div>

        @if (errorBanner()) {
          <div
            role="alert"
            class="rounded-[3px] border border-[var(--cinema-danger)] bg-[var(--cinema-danger-bg)] px-4 py-3 text-xs text-[var(--cinema-text-primary)]"
          >
            {{ errorBanner() }}
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
          <div>
            <label for="verify-email" class="cinema-label">Email</label>
            <input
              id="verify-email"
              type="email"
              formControlName="email"
              placeholder="ban@cinehub.vn"
              class="cinema-input"
            />
          </div>

          <div>
            <label for="verify-code" class="cinema-label">Mã OTP (6 chữ số)</label>
            <input
              id="verify-code"
              type="text"
              maxlength="6"
              formControlName="code"
              placeholder="123456"
              class="cinema-input text-center font-mono text-base font-bold tracking-[0.25em] text-[var(--cinema-accent)]"
            />
          </div>

          <button
            type="submit"
            [disabled]="submitting()"
            class="cinema-btn-primary w-full !min-h-[46px]"
          >
            {{ submitting() ? 'Đang xác thực...' : 'Xác nhận mã OTP' }}
          </button>
        </form>

        <div class="flex items-center justify-between text-xs text-[var(--cinema-text-muted)]">
          <button
            type="button"
            (click)="resendOtp()"
            class="text-[var(--cinema-accent)] hover:underline"
          >
            Gửi lại mã OTP
          </button>
          <a routerLink="/auth" class="hover:text-[var(--cinema-text-primary)]">
            Quay lại đăng nhập
          </a>
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
