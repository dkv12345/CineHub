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
      class="relative flex min-h-[calc(100vh-140px)] w-full items-center justify-center px-4 py-8 sm:px-6 lg:py-12"
    >
      <!-- Ambient Background Glow -->
      <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          class="absolute -top-[15%] left-1/2 h-[550px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#b28a50]/12 via-[#7c2638]/6 to-transparent blur-3xl"
        ></div>
      </div>

      <!-- Split Card Container -->
      <div
        class="relative z-10 mx-auto grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl md:grid-cols-12"
      >
        <!-- Left Column: Cinema Visual Key-Art -->
        <div
          class="relative hidden flex-col justify-between overflow-hidden bg-[#181113] text-white md:col-span-5 md:flex"
        >
          <img
            src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1000&q=85"
            alt="CineHub Security"
            class="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-700 hover:scale-105"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-[#140b0d] via-[#140b0d]/75 to-[#140b0d]/35"
            aria-hidden="true"
          ></div>

          <div class="relative z-10 p-6 sm:p-8">
            <div
              class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/25 px-3 py-1 backdrop-blur-xs"
            >
              <span
                class="inline-flex h-5 w-5 items-center justify-center rounded-[3px] bg-[var(--color-brand-primary)] text-[10px] font-bold text-white shadow-xs"
              >
                CH
              </span>
              <span class="text-[11px] font-bold tracking-wider uppercase text-white/90">
                CineHub Security
              </span>
            </div>
          </div>

          <div class="relative z-10 space-y-4 p-6 sm:p-8">
            <div class="space-y-1.5">
              <span class="font-display text-xl font-bold leading-tight text-[#fffdf9]">
                Bảo Vệ Tài Khoản Hội Viên
              </span>
              <p class="text-xs leading-relaxed text-stone-300">
                Thiết lập mật khẩu bảo mật mới để an tâm quản lý điểm thưởng, vé đã mua và thông tin
                cá nhân.
              </p>
            </div>

            <div class="space-y-2 border-t border-white/15 pt-3.5 text-xs text-stone-200">
              <div class="flex items-center gap-2.5">
                <span
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-[10px] font-bold text-white"
                >
                  ✓
                </span>
                <span>Chuẩn mã hóa mật khẩu an toàn cao cấp</span>
              </div>
              <div class="flex items-center gap-2.5">
                <span
                  class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-primary)] text-[10px] font-bold text-white"
                >
                  ✓
                </span>
                <span>Tự động cập nhật trên mọi phiên đăng nhập</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Interactive Form -->
        <div class="flex flex-col justify-between p-6 sm:p-8 md:col-span-7">
          <div class="space-y-5">
            <!-- Mobile Brand Header -->
            <div class="flex items-center gap-2.5 md:hidden">
              <span
                class="inline-flex h-9 w-9 items-center justify-center rounded-[4px] bg-[var(--color-brand-primary)] font-display text-base font-bold text-white"
              >
                CH
              </span>
              <div>
                <span class="block text-sm font-bold text-[var(--color-text-primary)]"
                  >CineHub</span
                >
                <span class="block text-[11px] text-[var(--color-text-secondary)]"
                  >Bảo mật tài khoản</span
                >
              </div>
            </div>

            <div class="space-y-1">
              <span class="cinema-eyebrow">Bảo mật tài khoản</span>
              <h1 class="font-display text-2xl font-bold text-[var(--color-text-primary)]">
                Đặt lại mật khẩu
              </h1>
              <p class="text-xs text-[var(--color-text-secondary)]">
                Nhập mã token nhận được từ liên kết email và nhập mật khẩu mới tối thiểu 8 ký tự.
              </p>
            </div>

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
              <!-- Token Field -->
              <div>
                <label for="reset-token" class="cinema-label mb-1.5 block"
                  >Mã Token khôi phục</label
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
                      <path
                        d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9m-4 4 4.5-4.5a5 5 0 1 1 7.07 7.07L11 16"
                      />
                    </svg>
                  </div>
                  <input
                    id="reset-token"
                    type="text"
                    formControlName="token"
                    placeholder="Nhập mã token từ email"
                    class="cinema-input cinema-input-icon-leading !h-11 w-full text-sm font-mono"
                  />
                </div>
              </div>

              <!-- New Password Field with Show/Hide Eye Toggle -->
              <div>
                <label for="reset-new-password" class="cinema-label mb-1.5 block"
                  >Mật khẩu mới (tối thiểu 8 ký tự)</label
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
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    id="reset-new-password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="newPassword"
                    autocomplete="new-password"
                    placeholder="••••••••"
                    class="cinema-input cinema-input-icon-both !h-11 w-full text-sm"
                  />
                  <button
                    type="button"
                    (click)="toggleShowPassword()"
                    class="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                    [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                  >
                    @if (showPassword()) {
                      <svg
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
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
                        class="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    }
                  </button>
                </div>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                [disabled]="submitting()"
                class="cinema-btn-primary w-full !h-11 font-bold text-sm shadow-sm transition-all"
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
                    <span>Đang cập nhật...</span>
                  </span>
                } @else {
                  <span>Cập nhật mật khẩu mới</span>
                }
              </button>
            </form>
          </div>

          <!-- Bottom Navigation -->
          <div
            class="mt-6 border-t border-[var(--color-border)] pt-4 text-center text-xs text-[var(--color-text-secondary)]"
          >
            <a
              routerLink="/auth"
              class="inline-flex items-center gap-1.5 font-bold text-[var(--color-brand-primary)] hover:underline"
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
      this.toast.show('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.', 'success');
      void this.router.navigateByUrl('/auth');
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
