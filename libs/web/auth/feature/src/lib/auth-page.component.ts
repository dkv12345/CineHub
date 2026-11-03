import { A11yModule } from '@angular/cdk/a11y';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forgotPasswordBody, loginBody, registerBody } from '@cinehub/contracts';
import {
  AuthApiService,
  extractAuthErrorCode,
  formatAuthErrorMessage,
} from '@cinehub/web/auth/data-access';
import { AuthStore, GoogleAuthService, ToastService } from '@cinehub/web/core';
import { zodFormGroupValidator } from '@cinehub/web/shared/util';

@Component({
  selector: 'ch-auth-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="mx-auto flex min-h-[82vh] max-w-md flex-col justify-center px-4 py-12"
      cdkTrapFocus
    >
      <div
        class="rounded-2xl border border-amber-500/25 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
      >
        <div class="mb-6 text-center">
          <span
            class="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-600 text-lg font-black text-slate-950 shadow-lg"
          >
            CH
          </span>
          <h1 class="mt-3 text-2xl font-bold text-white">
            @switch (mode()) {
              @case ('login') {
                Đăng nhập CineHub
              }
              @case ('register') {
                Tạo tài khoản mới
              }
              @case ('forgot') {
                Khôi phục mật khẩu
              }
            }
          </h1>
          <p class="mt-1 text-xs text-slate-400">
            Trải nghiệm đặt vé chọn ghế 3D POV chuẩn rạp Galaxy Cinema
          </p>
        </div>

        <!-- Mode Switcher Tabs -->
        <div
          class="mb-6 grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs font-semibold"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="mode() === 'login'"
            (click)="setMode('login')"
            class="rounded-lg py-2 transition"
            [class]="
              mode() === 'login' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
            "
          >
            Đăng nhập
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="mode() === 'register'"
            (click)="setMode('register')"
            class="rounded-lg py-2 transition"
            [class]="
              mode() === 'register'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            "
          >
            Đăng ký
          </button>
        </div>

        @if (errorBanner()) {
          <div
            role="alert"
            class="mb-4 rounded-xl border border-rose-500/40 bg-rose-950/60 px-4 py-3 text-xs text-rose-200"
          >
            {{ errorBanner() }}
          </div>
        }

        @switch (mode()) {
          @case ('login') {
            <form [formGroup]="loginForm" (ngSubmit)="submitLogin()" class="space-y-4">
              <div>
                <label for="login-email" class="block text-xs font-semibold text-slate-300">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  placeholder="ban@cinehub.vn"
                  class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <div class="flex items-center justify-between">
                  <label for="login-password" class="block text-xs font-semibold text-slate-300">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    (click)="setMode('forgot')"
                    class="text-xs text-amber-400 hover:underline"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <input
                  id="login-password"
                  type="password"
                  formControlName="password"
                  autocomplete="current-password"
                  placeholder="••••••••"
                  class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                [disabled]="submitting()"
                class="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:opacity-50"
              >
                {{ submitting() ? 'Đang xử lý...' : 'Đăng nhập' }}
              </button>
            </form>
          }

          @case ('register') {
            <form [formGroup]="registerForm" (ngSubmit)="submitRegister()" class="space-y-4">
              <div>
                <label for="reg-fullname" class="block text-xs font-semibold text-slate-300">
                  Họ và tên
                </label>
                <input
                  id="reg-fullname"
                  type="text"
                  formControlName="fullName"
                  autocomplete="name"
                  placeholder="Nguyễn Văn A"
                  class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label for="reg-email" class="block text-xs font-semibold text-slate-300">
                  Email
                </label>
                <input
                  id="reg-email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  placeholder="ban@cinehub.vn"
                  class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label for="reg-phone" class="block text-xs font-semibold text-slate-300">
                  Số điện thoại (tùy chọn)
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  formControlName="phone"
                  autocomplete="tel"
                  placeholder="0901234567"
                  class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label for="reg-password" class="block text-xs font-semibold text-slate-300">
                  Mật khẩu (tối thiểu 8 ký tự)
                </label>
                <input
                  id="reg-password"
                  type="password"
                  formControlName="password"
                  autocomplete="new-password"
                  placeholder="••••••••"
                  class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                [disabled]="submitting()"
                class="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-300 hover:to-amber-400 disabled:opacity-50"
              >
                {{ submitting() ? 'Đang tạo tài khoản...' : 'Đăng ký ngay' }}
              </button>
            </form>
          }

          @case ('forgot') {
            <form [formGroup]="forgotForm" (ngSubmit)="submitForgot()" class="space-y-4">
              <div>
                <label for="forgot-email" class="block text-xs font-semibold text-slate-300">
                  Email khôi phục
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  formControlName="email"
                  placeholder="ban@cinehub.vn"
                  class="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                [disabled]="submitting()"
                class="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400 disabled:opacity-50"
              >
                Gửi liên kết đặt lại mật khẩu
              </button>
            </form>
          }
        }

        <div class="my-5 flex items-center gap-3 text-xs text-slate-500">
          <div class="h-px flex-1 bg-slate-800"></div>
          <span>HOẶC</span>
          <div class="h-px flex-1 bg-slate-800"></div>
        </div>

        <!-- Google Sign-In Container (managed by GoogleAuthService) -->
        <div #googleBtnContainer class="flex justify-center" aria-label="Google Sign-In"></div>

        <button
          type="button"
          (click)="signInDemoCustomer()"
          class="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950/80 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-amber-500/40 hover:text-amber-300"
        >
          Đăng nhập nhanh tài khoản Demo VIP
        </button>

        <div class="mt-4 text-center text-xs text-slate-400">
          <a routerLink="/verify-email" class="text-amber-400 hover:underline">
            Nhập mã OTP xác thực email
          </a>
        </div>
      </div>
    </section>
  `,
})
export class AuthPageComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly authStore = inject(AuthStore);
  private readonly googleAuth = inject(GoogleAuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly googleBtnContainer = viewChild<ElementRef<HTMLElement>>('googleBtnContainer');

  readonly mode = signal<'login' | 'register' | 'forgot'>('login');
  readonly submitting = signal(false);
  readonly errorBanner = signal<string | null>(null);

  readonly loginForm = this.fb.nonNullable.group(
    {
      email: [''],
      password: [''],
    },
    { validators: [zodFormGroupValidator(loginBody)] },
  );

  readonly registerForm = this.fb.nonNullable.group(
    {
      fullName: [''],
      email: [''],
      phone: [''],
      password: [''],
    },
    { validators: [zodFormGroupValidator(registerBody)] },
  );

  readonly forgotForm = this.fb.nonNullable.group(
    {
      email: [''],
    },
    { validators: [zodFormGroupValidator(forgotPasswordBody)] },
  );

  ngAfterViewInit(): void {
    const el = this.googleBtnContainer()?.nativeElement;
    if (el) {
      void this.googleAuth.initializeButton(el, (idToken) => {
        void this.handleGoogleCredential(idToken);
      });
    }
  }

  setMode(next: 'login' | 'register' | 'forgot'): void {
    this.mode.set(next);
    this.errorBanner.set(null);
  }

  async submitLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      const err = Object.values(this.loginForm.errors ?? {})[0];
      this.errorBanner.set(typeof err === 'string' ? err : 'Vui lòng kiểm tra email và mật khẩu.');
      return;
    }
    this.submitting.set(true);
    this.errorBanner.set(null);
    const { email, password } = this.loginForm.getRawValue();
    try {
      const session = await this.authApi.login({ email, password });
      this.authStore.setSession(session.accessToken, session.user);
      this.toast.show(`Xin chào, ${session.user.fullName}!`, 'success');
      void this.router.navigateByUrl('/');
    } catch (error: unknown) {
      if (extractAuthErrorCode(error) === 'EMAIL_NOT_VERIFIED') {
        this.toast.show('Vui lòng xác thực mã OTP đã gửi qua email.', 'warning');
        void this.router.navigate(['/verify-email'], {
          queryParams: { email },
        });
        return;
      }
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  async submitRegister(): Promise<void> {
    if (this.registerForm.invalid) {
      const err = Object.values(this.registerForm.errors ?? {})[0];
      this.errorBanner.set(
        typeof err === 'string' ? err : 'Vui lòng điền đầy đủ thông tin đăng ký.',
      );
      return;
    }
    this.submitting.set(true);
    this.errorBanner.set(null);
    const raw = this.registerForm.getRawValue();
    try {
      await this.authApi.register({
        fullName: raw.fullName,
        email: raw.email,
        password: raw.password,
        phone: raw.phone || undefined,
      });
      this.toast.show('Đăng ký thành công! Vui lòng nhập mã OTP từ email.', 'success');
      void this.router.navigate(['/verify-email'], {
        queryParams: { email: raw.email },
      });
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  async submitForgot(): Promise<void> {
    if (this.forgotForm.invalid) {
      this.errorBanner.set('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    this.submitting.set(true);
    this.errorBanner.set(null);
    const { email } = this.forgotForm.getRawValue();
    try {
      await this.authApi.forgotPassword(email);
      this.toast.show('Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.', 'success');
      this.setMode('login');
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }

  signInDemoCustomer(): void {
    this.authStore.setSession('demo-jwt-access-token', {
      id: 'demo-user-01',
      email: 'khanhvi@cinehub.vn',
      fullName: 'Đỗ Khánh Vi',
      phone: '0909123456',
      role: 'CUSTOMER',
      points: 1850,
      tier: 'Gold VIP',
    });
    this.toast.show('Đã đăng nhập tài khoản Demo VIP!', 'success');
    void this.router.navigateByUrl('/');
  }

  private async handleGoogleCredential(idToken: string): Promise<void> {
    this.submitting.set(true);
    try {
      const session = await this.authApi.loginWithGoogle(idToken);
      this.authStore.setSession(session.accessToken, session.user);
      this.toast.show(`Xin chào, ${session.user.fullName}!`, 'success');
      void this.router.navigateByUrl('/');
    } catch (error: unknown) {
      this.errorBanner.set(formatAuthErrorMessage(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
