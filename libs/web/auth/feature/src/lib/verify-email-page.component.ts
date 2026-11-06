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
              <p class="text-[11px] text-[#7A7268]">Kích hoạt tài khoản thành viên</p>
            </div>
          </div>

          <!-- Heading -->
          <div class="space-y-1">
            <h1 class="text-2xl font-bold leading-tight tracking-tight text-[#F0EBE2]">
              Xác thực Email
            </h1>
            <p class="text-sm text-[#A09890]">
              Nhập mã OTP 6 chữ số đã được gửi tới hòm thư email của bạn.
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

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
            <!-- Email -->
            <div class="space-y-1.5">
              <label
                for="verify-email"
                class="block text-[11px] font-semibold uppercase tracking-widest text-[#7A7268]"
                >Email</label
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
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="verify-email"
                  type="email"
                  formControlName="email"
                  placeholder="ban@cinehub.vn"
                  class="h-11 w-full rounded-lg border border-[#2E2A25] bg-[#161411] pl-10 pr-4 text-sm text-[#F0EBE2] placeholder-[#5A5248] outline-none transition focus:border-[#C2A16B] focus:ring-2 focus:ring-[rgba(194,161,107,0.15)]"
                />
              </div>
            </div>

            <!-- OTP Code — Prominent -->
            <div class="space-y-1.5">
              <div class="flex items-center justify-between">
                <label
                  for="verify-code"
                  class="block text-[11px] font-semibold uppercase tracking-widest text-[#7A7268]"
                  >Mã OTP</label
                >
                <button
                  type="button"
                  (click)="resendOtp()"
                  class="text-[11px] font-semibold text-[#C2A16B] transition hover:text-[#D4B47E]"
                >
                  Gửi lại mã
                </button>
              </div>
              <input
                id="verify-code"
                type="text"
                maxlength="6"
                inputmode="numeric"
                formControlName="code"
                placeholder="000000"
                class="h-14 w-full rounded-lg border border-[#2E2A25] bg-[#161411] text-center font-mono text-2xl font-bold tracking-[0.4em] text-[#C2A16B] placeholder-[#2E2A25] outline-none transition focus:border-[#C2A16B] focus:ring-2 focus:ring-[rgba(194,161,107,0.15)]"
              />
              <p class="text-center text-xs text-[#7A7268]">
                Kiểm tra hộp thư đến hoặc mục Spam nếu chưa nhận được mã.
              </p>
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
                Đang xác thực...
              } @else {
                Xác nhận kích hoạt tài khoản
              }
            </button>
          </form>

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
          src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=85"
          alt="CineHub — Xác thực hội viên"
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
              >Xác Thực Hội Viên</span
            >
          </div>
        </div>

        <div
          class="relative z-10 m-8 rounded-xl border border-white/10 bg-black/50 p-6 backdrop-blur-xl lg:m-12"
        >
          <h2 class="text-xl font-bold leading-snug text-white">Kích Hoạt Tài Khoản Thành Viên</h2>
          <p class="mt-2 text-xs leading-relaxed text-white/60">
            Chỉ còn một bước để hoàn tất. Xác thực email giúp bảo vệ vé điện tử và tài khoản tích
            điểm của bạn.
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

  readonly perks = [
    'Kích hoạt điểm thưởng thành viên VIP',
    'Nhận vé điện tử qua email',
    'Truy cập toàn bộ tính năng đặt chỗ',
  ];

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
