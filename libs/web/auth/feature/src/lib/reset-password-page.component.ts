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
    <div class="cinema-container flex min-h-[75vh] max-w-md flex-col justify-center py-12">
      <div class="cinema-panel-raised p-6 sm:p-8 space-y-6">
        <div class="space-y-1">
          <span class="cinema-eyebrow">Bảo mật tài khoản</span>
          <h1 class="font-display text-2xl font-semibold text-[var(--cinema-text-primary)]">
            Đặt lại mật khẩu
          </h1>
          <p class="text-xs text-[var(--cinema-text-muted)]">
            Nhập mã token từ email và thiết lập mật khẩu mới cho tài khoản của bạn.
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
            <label for="reset-token" class="cinema-label">Mã Token khôi phục</label>
            <input
              id="reset-token"
              type="text"
              formControlName="token"
              placeholder="Token từ liên kết email"
              class="cinema-input"
            />
          </div>

          <div>
            <label for="reset-new-password" class="cinema-label"
              >Mật khẩu mới (tối thiểu 8 ký tự)</label
            >
            <input
              id="reset-new-password"
              type="password"
              formControlName="newPassword"
              autocomplete="new-password"
              placeholder="••••••••"
              class="cinema-input"
            />
          </div>

          <button
            type="submit"
            [disabled]="submitting()"
            class="cinema-btn-primary w-full !min-h-[46px]"
          >
            {{ submitting() ? 'Đang cập nhật...' : 'Cập nhật mật khẩu' }}
          </button>
        </form>

        <div class="text-center text-xs text-[var(--cinema-text-muted)]">
          <a routerLink="/auth" class="text-[var(--cinema-accent)] hover:underline">
            Quay lại trang đăng nhập
          </a>
        </div>
      </div>
    </div>
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
