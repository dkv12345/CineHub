import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { resetPasswordBody } from '@cinehub/contracts';
import { AuthApiService, formatAuthErrorMessage } from '@cinehub/web/auth/data-access';
import { ToastService } from '@cinehub/web/core';
import { zodFormGroupValidator } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-4 py-12">
      <div class="rounded-2xl border border-amber-500/25 bg-slate-900/90 p-6 shadow-2xl sm:p-8">
        <h1 class="text-xl font-bold text-white">Đặt lại mật khẩu</h1>
        <p class="mt-1 text-xs text-slate-400">Nhập mật khẩu mới cho tài khoản CineHub của bạn.</p>

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
            <label for="reset-token" class="block text-xs font-semibold text-slate-300">
              Mã Token khôi phục
            </label>
            <input
              id="reset-token"
              type="text"
              formControlName="token"
              placeholder="Token từ liên kết email"
              class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label for="reset-new-password" class="block text-xs font-semibold text-slate-300">
              Mật khẩu mới (tối thiểu 8 ký tự)
            </label>
            <input
              id="reset-new-password"
              type="password"
              formControlName="newPassword"
              autocomplete="new-password"
              placeholder="••••••••"
              class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            [disabled]="submitting()"
            class="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {{ submitting() ? 'Đang cập nhật...' : 'Cập nhật mật khẩu' }}
          </button>
        </form>

        <div class="mt-4 text-center text-xs text-slate-400">
          <a routerLink="/auth" class="text-amber-400 hover:underline">
            Quay lại trang đăng nhập
          </a>
        </div>
      </div>
    </section>
  `,
})
export class ResetPasswordPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly token = input<string>('');

  readonly submitting = signal(false);
  readonly errorBanner = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      token: [''],
      newPassword: [''],
    },
    { validators: [zodFormGroupValidator(resetPasswordBody)] },
  );

  ngOnInit(): void {
    if (this.token()) {
      this.form.controls.token.setValue(this.token());
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      const err = Object.values(this.form.errors ?? {})[0];
      this.errorBanner.set(
        typeof err === 'string' ? err : 'Vui lòng nhập token và mật khẩu mới tối thiểu 8 ký tự.',
      );
      return;
    }
    this.submitting.set(true);
    this.errorBanner.set(null);
    try {
      await this.authApi.resetPassword(this.form.getRawValue());
      this.toast.show('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.', 'success');
      void this.router.navigateByUrl('/auth');
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
