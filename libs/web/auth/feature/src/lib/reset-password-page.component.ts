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
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-white">Đặt lại mật khẩu</h1>
          <p class="mt-1.5 text-xs text-white/60">
            Nhập mã token từ email và thiết lập mật khẩu bảo mật mới cho tài khoản CineHub của bạn.
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

        <!-- Success Banner -->
        @if (resetSuccess()) {
          <div
            class="mt-5 flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-950/50 p-4 text-xs font-semibold text-emerald-200"
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
              <p class="font-bold text-sm">Đặt lại mật khẩu thành công!</p>
              <p class="mt-1 opacity-80">
                Hệ thống đang tự động chuyển hướng về trang đăng nhập...
              </p>
            </div>
          </div>
        }

        @if (!resetSuccess()) {
          <form [formGroup]="form" (ngSubmit)="submit()" class="mt-6 space-y-4">
            <!-- Token -->
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
                  <path
                    d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9m-4 4 4.5-4.5a5 5 0 1 1 7.07 7.07L11 16"
                  />
                </svg>
              </div>
              <input
                type="text"
                formControlName="token"
                placeholder="Dán mã token khôi phục từ email"
                class="h-11 flex-1 bg-transparent px-3 font-mono text-sm text-white placeholder-white/40 outline-none"
              />
            </div>

            <!-- New Password -->
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
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="newPassword"
                placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                class="h-11 flex-1 bg-transparent px-3 text-sm text-white placeholder-white/40 outline-none"
              />
              <button
                type="button"
                (click)="toggleShowPassword()"
                class="px-3 text-white/50 hover:text-white"
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

            <button
              type="submit"
              [disabled]="submitting()"
              class="h-11 w-full rounded-full border border-indigo-400/40 bg-gradient-to-r from-[#2e1065] via-[#4c1d95] to-[#2e1065] text-xs font-bold text-white shadow-[0_0_25px_rgba(99,102,241,0.35)] transition hover:shadow-[0_0_35px_rgba(168,85,247,0.6)] active:scale-95 disabled:opacity-50"
            >
              @if (submitting()) {
                <span>Đang cập nhật...</span>
              } @else {
                <span>Cập nhật mật khẩu mới</span>
              }
            </button>
          </form>
        }

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
export class ResetPasswordPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly token = input<string>('');

  readonly submitting = signal(false);
  readonly errorBanner = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly resetSuccess = signal(false);

  readonly form = this.fb.nonNullable.group(
    { token: [''], newPassword: [''] },
    { validators: [zodFormGroupValidator(resetPasswordBody)] },
  );

  ngOnInit(): void {
    if (this.token()) {
      this.form.controls.token.setValue(this.token());
    }
  }

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
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
      this.resetSuccess.set(true);
      this.toast.show('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.', 'success');
      setTimeout(() => void this.router.navigateByUrl('/auth'), 2000);
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
