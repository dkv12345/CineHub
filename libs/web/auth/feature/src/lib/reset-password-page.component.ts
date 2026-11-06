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
    <div class="flex min-h-[calc(100vh-74px)] w-full overflow-hidden bg-[#0E0C0B]">
      <!-- Left Panel -->
      <div
        class="flex w-full flex-col justify-center overflow-y-auto px-6 py-10 md:w-1/2 lg:px-14 xl:px-20"
      >
        <div class="mx-auto w-full max-w-[400px] space-y-6">
          <!-- Brand -->
          <div class="flex items-center gap-3">
            <span
              class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-[#C2A16B] text-sm font-bold text-[#0E0C0B]"
              >CH</span
            >
            <div>
              <p class="text-base font-semibold leading-tight text-[#F0EBE2]">CineHub</p>
              <p class="text-[11px] text-[#7A7268]">Trung tâm bảo mật tài khoản</p>
            </div>
          </div>

          <!-- Heading -->
          <div class="space-y-1">
            <h1 class="text-2xl font-bold leading-tight tracking-tight text-[#F0EBE2]">
              Đặt lại mật khẩu
            </h1>
            <p class="text-sm text-[#A09890]">
              Nhập mã token từ email và thiết lập mật khẩu bảo mật mới cho tài khoản.
            </p>
          </div>

          <!-- Error -->
          @if (errorBanner()) {
            <div
              role="alert"
              class="flex items-start gap-2.5 rounded-lg border border-[rgba(201,123,117,0.3)] bg-[rgba(201,123,117,0.1)] px-4 py-3 text-xs font-medium text-[#C97B75]"
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

          <!-- Success -->
          @if (resetSuccess()) {
            <div
              class="flex items-start gap-3 rounded-lg border border-[rgba(125,171,137,0.3)] bg-[rgba(125,171,137,0.1)] px-4 py-4 text-sm text-[#7DAB89]"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                class="mt-0.5 shrink-0"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="m9 11 3 3L22 4" />
              </svg>
              <div>
                <p class="font-semibold">Đặt lại mật khẩu thành công!</p>
                <p class="mt-0.5 text-xs opacity-80">Đang chuyển về trang đăng nhập...</p>
              </div>
            </div>
          }

          @if (!resetSuccess()) {
            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
              <!-- Token -->
              <div class="space-y-1.5">
                <label
                  for="reset-token"
                  class="block text-[11px] font-semibold uppercase tracking-widest text-[#7A7268]"
                  >Mã token khôi phục</label
                >
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-0 top-0 flex h-full w-10 items-center justify-center text-[#7A7268]"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                    >
                      <path
                        d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9m-4 4 4.5-4.5a5 5 0 1 1 7.07 7.07L11 16"
                      />
                    </svg>
                  </span>
                  <input
                    id="reset-token"
                    type="text"
                    formControlName="token"
                    placeholder="Dán mã token từ email"
                    class="h-11 w-full rounded-lg border border-[#2E2A25] bg-[#161411] pl-10 pr-4 font-mono text-sm text-[#F0EBE2] placeholder-[#5A5248] outline-none transition focus:border-[#C2A16B] focus:ring-2 focus:ring-[rgba(194,161,107,0.15)]"
                  />
                </div>
              </div>

              <!-- New Password -->
              <div class="space-y-1.5">
                <label
                  for="reset-new-password"
                  class="block text-[11px] font-semibold uppercase tracking-widest text-[#7A7268]"
                >
                  Mật khẩu mới <span class="normal-case font-normal">(tối thiểu 8 ký tự)</span>
                </label>
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-0 top-0 flex h-full w-10 items-center justify-center text-[#7A7268]"
                  >
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                    >
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    id="reset-new-password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="newPassword"
                    autocomplete="new-password"
                    placeholder="••••••••"
                    class="h-11 w-full rounded-lg border border-[#2E2A25] bg-[#161411] pl-10 pr-11 text-sm text-[#F0EBE2] placeholder-[#5A5248] outline-none transition focus:border-[#C2A16B] focus:ring-2 focus:ring-[rgba(194,161,107,0.15)]"
                  />
                  <button
                    type="button"
                    (click)="toggleShowPassword()"
                    [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                    class="absolute right-0 top-0 flex h-full w-11 items-center justify-center text-[#5A5248] transition hover:text-[#F0EBE2]"
                  >
                    @if (showPassword()) {
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
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
                        stroke-width="1.75"
                      >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    }
                  </button>
                </div>
              </div>

              <button
                type="submit"
                [disabled]="submitting()"
                class="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#C2A16B] text-sm font-bold text-[#0E0C0B] transition hover:bg-[#D4B47E] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[.99]"
              >
                @if (submitting()) {
                  <svg
                    class="animate-spin"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  Đang cập nhật...
                } @else {
                  Cập nhật mật khẩu mới
                }
              </button>
            </form>
          }

          <!-- Footer -->
          <div class="border-t border-[#2E2A25] pt-4 text-center">
            <a
              routerLink="/auth"
              class="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C2A16B] transition hover:text-[#D4B47E]"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              Quay lại trang đăng nhập
            </a>
          </div>
        </div>
      </div>

      <!-- Right Visual -->
      <div
        class="relative hidden overflow-hidden md:flex md:w-1/2 md:flex-col md:justify-between"
        style="background:#0A0806"
      >
        <img
          src="https://images.unsplash.com/photo-1512070679279-8988d32161be?auto=format&fit=crop&w=1600&q=85"
          alt="CineHub — Bảo mật tài khoản"
          class="absolute inset-0 h-full w-full object-cover opacity-50 transition-transform duration-[1200ms] hover:scale-[1.03]"
        />
        <div
          class="absolute inset-0"
          style="background:linear-gradient(to top,#0A0806 0%,rgba(10,8,6,.72) 50%,rgba(10,8,6,.18) 100%)"
        ></div>

        <div class="relative z-10 p-8 lg:p-12">
          <div
            class="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-black/35 px-4 py-2 backdrop-blur-md"
          >
            <span
              class="inline-flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#C2A16B] text-[10px] font-bold text-[#0E0C0B]"
              >CH</span
            >
            <span class="text-[11px] font-semibold uppercase tracking-widest text-white/90"
              >CineHub Security</span
            >
          </div>
        </div>

        <div
          class="relative z-10 m-8 rounded-xl border border-white/10 bg-black/50 p-6 backdrop-blur-xl lg:m-12"
        >
          <h2 class="text-xl font-bold leading-snug text-white">Bảo Mật Tài Khoản Tuyệt Đối</h2>
          <p class="mt-2 text-xs leading-relaxed text-white/60">
            Mật khẩu của bạn được mã hóa một chiều chuẩn công nghệ cao nhất. Không ai — kể cả chúng
            tôi — có thể xem mật khẩu của bạn.
          </p>
          <div class="mt-4 flex flex-col gap-2.5 border-t border-white/10 pt-4">
            @for (p of perks; track p) {
              <div class="flex items-center gap-2 text-xs text-white/75">
                <span class="font-bold text-[#C2A16B]">✓</span><span>{{ p }}</span>
              </div>
            }
          </div>
          <p class="mt-4 text-[10px] text-white/25">
            © 2026 CineHub Cinema Network. Tất cả quyền được bảo lưu.
          </p>
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

  readonly perks = [
    'Mã hóa bảo mật nhiều lớp',
    'Đồng bộ tức thì mọi thiết bị',
    'Liên kết đặt lại chỉ dùng 1 lần',
  ];

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
