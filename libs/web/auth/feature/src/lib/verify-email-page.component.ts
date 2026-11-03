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
    <section class="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12">
      <div class="rounded-2xl border border-amber-500/25 bg-slate-900/90 p-6 shadow-2xl sm:p-8">
        <h1 class="text-xl font-bold text-white">Xác thực Email (OTP)</h1>
        <p class="mt-1 text-xs text-slate-400">
          Nhập mã xác thực 6 chữ số đã được gửi tới hộp thư của bạn.
        </p>

        @if (errorBanner()) {
          <div
            role="alert"
            class="mt-4 rounded-xl border border-rose-500/40 bg-rose-950/60 px-4 py-3 text-xs text-rose-200"
          >
            {{ errorBanner() }}
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" class="mt-5 space-y-4">
          <div>
            <label for="verify-email" class="block text-xs font-semibold text-slate-300">
              Email
            </label>
            <input
              id="verify-email"
              type="email"
              formControlName="email"
              placeholder="ban@cinehub.vn"
              class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label for="verify-code" class="block text-xs font-semibold text-slate-300">
              Mã OTP (6 chữ số)
            </label>
            <input
              id="verify-code"
              type="text"
              maxlength="6"
              formControlName="code"
              placeholder="123456"
              class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-center text-lg font-bold tracking-widest text-amber-300 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            [disabled]="submitting()"
            class="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {{ submitting() ? 'Đang xác thực...' : 'Xác nhận mã OTP' }}
          </button>
        </form>

        <div class="mt-4 flex items-center justify-between text-xs text-slate-400">
          <button type="button" (click)="resendOtp()" class="text-amber-400 hover:underline">
            Gửi lại mã OTP
          </button>
          <a routerLink="/auth" class="hover:text-white">Quay lại đăng nhập</a>
        </div>
      </div>
    </section>
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
