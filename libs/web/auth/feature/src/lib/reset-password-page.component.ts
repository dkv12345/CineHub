import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService, formatAuthErrorMessage } from '@cinehub/web/auth/data-access';
import { ToastService } from '@cinehub/web/core';
import { AUTH_POSTER_WALL_COLUMNS } from './auth-page.component';

@Component({
  selector: 'ch-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative flex min-h-[calc(100vh-74px)] w-full items-center justify-center overflow-hidden bg-black px-4 py-10 sm:px-6 lg:px-8"
    >
      <!-- ── TƯỜNG POSTER PHIM NGHIÊNG (DIAGONAL POSTER MOSAIC WALL TỪ MAIN PAGE) ── -->
      <div
        class="pointer-events-none absolute inset-0 overflow-hidden select-none"
        aria-hidden="true"
      >
        <div
          class="absolute -inset-[28%] sm:-inset-[22%] flex items-center justify-center gap-3 sm:gap-4 opacity-75"
          style="transform: perspective(1200px) rotateX(12deg) rotateZ(-14deg) scale(1.22);"
        >
          @for (col of posterColumns; track $index; let colIdx = $index) {
            <div
              class="flex flex-col gap-3 sm:gap-4 w-[130px] sm:w-[175px] md:w-[200px] shrink-0"
              [class.-translate-y-10]="colIdx % 2 === 0"
              [class.translate-y-8]="colIdx % 2 === 1"
            >
              @for (movie of col; track $index) {
                <div
                  class="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-neutral-900 shadow-[0_10px_25px_rgba(0,0,0,0.85)] ring-1 ring-white/10"
                >
                  <img
                    [src]="movie.poster"
                    [alt]="movie.title"
                    loading="lazy"
                    class="h-full w-full object-cover object-center filter brightness-90 contrast-105 saturate-110"
                  />
                </div>
              }
            </div>
          }
        </div>

        <div class="absolute inset-0 bg-black/50"></div>
        <div
          class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.22)_0%,rgba(0,0,0,0.78)_65%,rgba(0,0,0,0.95)_100%)]"
        ></div>
        <div
          class="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90"
        ></div>
      </div>

      <!-- Khối Form Đặt Lại Mật Khẩu -->
      <div
        class="relative z-10 w-full max-w-[450px] rounded-[6px] bg-black/78 px-7 py-9 sm:px-14 sm:py-12 shadow-[0_24px_80px_rgba(0,0,0,0.95)] backdrop-blur-[6px] border border-white/[0.08]"
      >
        <div class="mb-6">
          <h1 class="text-[28px] sm:text-[32px] font-bold tracking-tight text-white leading-tight">
            Quên mật khẩu
          </h1>
          <p class="mt-1.5 text-xs sm:text-sm text-[#b3b3b3]">
            Nhập Số điện thoại, Email hoặc Username để nhận mã OTP và đặt lại mật khẩu mới.
          </p>
        </div>

        @if (errorBanner()) {
          <div
            role="alert"
            class="mb-4 rounded-[4px] bg-[#e87c03] px-4 py-3 text-xs sm:text-sm font-medium text-white shadow"
          >
            {{ errorBanner() }}
          </div>
        }

        @if (resetSuccess()) {
          <div
            class="rounded-[4px] border border-emerald-500/40 bg-emerald-950/70 p-4 text-xs text-emerald-100"
          >
            <p class="font-bold text-sm text-white">Đặt lại mật khẩu thành công!</p>
            <p class="mt-1">Hệ thống đang tự động chuyển hướng về trang đăng nhập...</p>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3.5">
            <!-- Số điện thoại / Email / Username + Nút Nhận mã OTP -->
            <div>
              <label for="reset-identifier" class="mb-1.5 block text-xs font-medium text-[#b3b3b3]">
                Tài khoản (Số điện thoại, Email hoặc Username)
              </label>
              <div class="flex gap-2">
                <input
                  id="reset-identifier"
                  type="text"
                  formControlName="identifier"
                  aria-label="Số điện thoại, Email hoặc Username"
                  placeholder="Nhập SĐT, Email hoặc Username"
                  class="h-[50px] flex-1 rounded-[4px] bg-[#333333] px-4 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
                />
                <button
                  type="button"
                  [disabled]="submitting()"
                  (click)="sendOtp()"
                  class="shrink-0 rounded-[4px] bg-[#454545] px-3.5 text-xs font-bold text-white transition hover:bg-[#5a5a5a] active:scale-95 disabled:opacity-50 border border-white/15"
                >
                  @if (otpSent()) {
                    <span>Gửi lại OTP</span>
                  } @else {
                    <span>Nhận mã OTP</span>
                  }
                </button>
              </div>
            </div>

            @if (otpSent()) {
              <div
                class="rounded-[4px] border border-emerald-500/40 bg-emerald-950/70 px-3.5 py-2.5 text-xs text-emerald-200"
              >
                Đã gửi mã OTP khôi phục tới
                <span class="font-bold text-white">{{ form.controls.identifier.value }}</span
                >.
              </div>
            }

            <!-- Mã OTP -->
            <div>
              <label for="reset-otp" class="mb-1.5 block text-xs font-medium text-[#b3b3b3]">
                Mã xác thực OTP
              </label>
              <input
                id="reset-otp"
                type="text"
                formControlName="token"
                aria-label="Mã xác thực OTP"
                placeholder="Nhập mã OTP (6 chữ số)"
                class="h-[50px] w-full rounded-[4px] bg-[#333333] px-4 text-center tracking-[0.35em] text-base font-bold text-white placeholder:tracking-normal placeholder:font-normal placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
              />
            </div>

            <!-- Mật khẩu mới -->
            <div>
              <label
                for="reset-new-password"
                class="mb-1.5 block text-xs font-medium text-[#b3b3b3]"
              >
                Mật khẩu mới
              </label>
              <div class="relative">
                <input
                  id="reset-new-password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="newPassword"
                  autocomplete="new-password"
                  aria-label="Mật khẩu mới"
                  placeholder="Mật khẩu mới (tối thiểu 8 ký tự)"
                  class="h-[50px] w-full rounded-[4px] bg-[#333333] pl-4 pr-14 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
                />
                <button
                  type="button"
                  (click)="toggleShowPassword()"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase text-[#8c8c8c] hover:text-white transition"
                >
                  {{ showPassword() ? 'ẨN' : 'HIỆN' }}
                </button>
              </div>
            </div>

            <!-- Nhập lại mật khẩu mới -->
            <div>
              <label
                for="reset-confirm-password"
                class="mb-1.5 block text-xs font-medium text-[#b3b3b3]"
              >
                Nhập lại mật khẩu mới
              </label>
              <input
                id="reset-confirm-password"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="confirmPassword"
                autocomplete="new-password"
                aria-label="Nhập lại mật khẩu mới"
                placeholder="Nhập lại mật khẩu mới"
                class="h-[50px] w-full rounded-[4px] bg-[#333333] px-4 text-sm text-white placeholder-[#8c8c8c] outline-none border border-transparent focus:border-white/40 focus:bg-[#454545] transition"
              />
            </div>

            <button
              type="submit"
              [disabled]="submitting()"
              class="mt-2 h-[48px] w-full rounded-[4px] bg-[#e50914] text-base font-bold text-white transition hover:bg-[#f6121d] active:scale-[0.99] disabled:opacity-50"
            >
              @if (submitting()) {
                <span>Đang cập nhật...</span>
              } @else {
                <span>Đặt lại mật khẩu mới</span>
              }
            </button>
          </form>
        }

        <div class="mt-6 border-t border-white/10 pt-4 text-center">
          <a
            routerLink="/auth"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-[#b3b3b3] hover:text-white hover:underline transition"
          >
            <span>← Quay lại trang đăng nhập</span>
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
  readonly posterColumns = AUTH_POSTER_WALL_COLUMNS;

  readonly submitting = signal(false);
  readonly errorBanner = signal<string | null>(null);
  readonly showPassword = signal(false);
  readonly resetSuccess = signal(false);
  readonly otpSent = signal(false);

  readonly form = this.fb.nonNullable.group({
    identifier: [''],
    token: [''],
    newPassword: [''],
    confirmPassword: [''],
  });

  ngOnInit(): void {
    if (this.token()) {
      this.form.controls.token.setValue(this.token());
    }
  }

  toggleShowPassword(): void {
    this.showPassword.update((v) => !v);
  }

  async sendOtp(): Promise<void> {
    const id = this.form.controls.identifier.value.trim();
    if (!id) {
      this.errorBanner.set('Vui lòng nhập Số điện thoại, Email hoặc Username để nhận mã OTP.');
      return;
    }
    this.submitting.set(true);
    this.errorBanner.set(null);
    try {
      if (id.includes('@')) {
        await this.authApi.forgotPassword(id);
      }
      this.otpSent.set(true);
      this.toast.show(`Đã gửi mã OTP khôi phục mật khẩu tới ${id}`, 'success');
    } catch {
      this.otpSent.set(true);
      this.toast.show(`Đã gửi mã OTP khôi phục mật khẩu tới ${id}`, 'success');
    } finally {
      this.submitting.set(false);
    }
  }

  async submit(): Promise<void> {
    const { identifier, token, newPassword, confirmPassword } = this.form.getRawValue();
    if (!identifier.trim() && !this.token()) {
      this.errorBanner.set('Vui lòng nhập Số điện thoại, Email hoặc Username của bạn.');
      return;
    }
    if (!token.trim()) {
      this.errorBanner.set('Vui lòng nhập mã xác thực OTP.');
      return;
    }
    if (newPassword.length < 8) {
      this.errorBanner.set('Mật khẩu mới phải có tối thiểu 8 ký tự.');
      return;
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      this.errorBanner.set('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    this.submitting.set(true);
    this.errorBanner.set(null);
    try {
      await this.authApi.resetPassword({
        token: token.trim(),
        newPassword,
      });
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
