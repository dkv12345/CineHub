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
    <div
      class="cinema-container flex min-h-[80vh] max-w-md flex-col justify-center py-12"
      cdkTrapFocus
    >
      <div class="cinema-panel-raised p-6 sm:p-8 space-y-6">
        <!-- Brand Header -->
        <div class="text-center space-y-2">
          <span
            class="inline-flex h-11 w-11 items-center justify-center rounded-[3px] border border-[var(--cinema-accent)] bg-[var(--cinema-surface-inset)] font-display text-lg font-semibold tracking-wider text-[var(--cinema-text-primary)]"
          >
            CH
          </span>
          <div>
            <h1 class="font-display text-2xl font-semibold text-[var(--cinema-text-primary)]">
              @switch (mode()) {
                @case ('login') {
                  Đăng nhập thành viên
                }
                @case ('register') {
                  Tạo tài khoản mới
                }
                @case ('forgot') {
                  Khôi phục mật khẩu
                }
              }
            </h1>
            <p class="mt-1 text-xs text-[var(--cinema-text-muted)]">
              Trải nghiệm đặt vé trực tuyến & góc nhìn phòng chiếu 3D POV
            </p>
          </div>
        </div>

        <!-- Mode Switcher Tabs -->
        <div
          class="grid grid-cols-2 rounded-[3px] border border-[var(--cinema-border)] bg-[var(--cinema-surface-inset)] p-1 text-xs font-semibold"
          role="tablist"
          aria-label="Chuyển chế độ đăng nhập hoặc đăng ký"
        >
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="mode() === 'login'"
            (click)="setMode('login')"
            class="rounded-[2px] py-2 transition-colors"
            [class]="
              mode() === 'login'
                ? 'bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)] shadow-sm'
                : 'text-[var(--cinema-text-muted)] hover:text-[var(--cinema-text-primary)]'
            "
          >
            Đăng nhập
          </button>
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="mode() === 'register'"
            (click)="setMode('register')"
            class="rounded-[2px] py-2 transition-colors"
            [class]="
              mode() === 'register'
                ? 'bg-[var(--cinema-surface-raised)] text-[var(--cinema-text-primary)] shadow-sm'
                : 'text-[var(--cinema-text-muted)] hover:text-[var(--cinema-text-primary)]'
            "
          >
            Đăng ký
          </button>
        </div>

        @if (errorBanner()) {
          <div
            role="alert"
            class="rounded-[3px] border border-[var(--cinema-danger)] bg-[var(--cinema-danger-bg)] px-4 py-3 text-xs text-[var(--cinema-text-primary)]"
          >
            {{ errorBanner() }}
          </div>
        }

        <!-- Mode Forms -->
        @switch (mode()) {
          @case ('login') {
            <form [formGroup]="loginForm" (ngSubmit)="submitLogin()" class="space-y-4">
              <div>
                <label for="login-email" class="cinema-label">Email</label>
                <input
                  id="login-email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  placeholder="ban@cinehub.vn"
                  class="cinema-input"
                />
              </div>

              <div>
                <div class="flex items-center justify-between">
                  <label for="login-password" class="cinema-label">Mật khẩu</label>
                  <button
                    type="button"
                    (click)="setMode('forgot')"
                    class="text-xs text-[var(--cinema-accent)] hover:underline"
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
                  class="cinema-input"
                />
              </div>

              <button
                type="submit"
                [disabled]="submitting()"
                class="cinema-btn-primary w-full !min-h-[46px]"
              >
                {{ submitting() ? 'Đang xác thực...' : 'Đăng nhập' }}
              </button>
            </form>
          }

          @case ('register') {
            <form [formGroup]="registerForm" (ngSubmit)="submitRegister()" class="space-y-4">
              <div>
                <label for="reg-fullname" class="cinema-label">Họ và tên</label>
                <input
                  id="reg-fullname"
                  type="text"
                  formControlName="fullName"
                  autocomplete="name"
                  placeholder="Nguyễn Văn A"
                  class="cinema-input"
                />
              </div>

              <div>
                <label for="reg-email" class="cinema-label">Email</label>
                <input
                  id="reg-email"
                  type="email"
                  formControlName="email"
                  autocomplete="email"
                  placeholder="ban@cinehub.vn"
                  class="cinema-input"
                />
              </div>

              <div>
                <label for="reg-phone" class="cinema-label">Số điện thoại (tùy chọn)</label>
                <input
                  id="reg-phone"
                  type="tel"
                  formControlName="phone"
                  autocomplete="tel"
                  placeholder="0901234567"
                  class="cinema-input"
                />
              </div>

              <div>
                <label for="reg-password" class="cinema-label">Mật khẩu (tối thiểu 8 ký tự)</label>
                <input
                  id="reg-password"
                  type="password"
                  formControlName="password"
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
                {{ submitting() ? 'Đang tạo tài khoản...' : 'Đăng ký ngay' }}
              </button>
            </form>
          }

          @case ('forgot') {
            <form [formGroup]="forgotForm" (ngSubmit)="submitForgot()" class="space-y-4">
              <div>
                <label for="forgot-email" class="cinema-label">Email khôi phục</label>
                <input
                  id="forgot-email"
                  type="email"
                  formControlName="email"
                  placeholder="ban@cinehub.vn"
                  class="cinema-input"
                />
              </div>

              <button
                type="submit"
                [disabled]="submitting()"
                class="cinema-btn-primary w-full !min-h-[46px]"
              >
                {{ submitting() ? 'Đang gửi...' : 'Gửi liên kết khôi phục' }}
              </button>
            </form>
          }
        }

        <!-- Divider -->
        <div class="flex items-center gap-3 text-xs text-[var(--cinema-text-muted)]">
          <div class="h-px flex-1 bg-[var(--cinema-border)]"></div>
          <span>HOẶC</span>
          <div class="h-px flex-1 bg-[var(--cinema-border)]"></div>
        </div>

        <!-- Google Sign-In Container -->
        <div #googleBtnContainer class="flex justify-center" aria-label="Google Sign-In"></div>

        <!-- Quick Demo Customer Login -->
        <button type="button" (click)="signInDemoCustomer()" class="cinema-btn-secondary w-full">
          Đăng nhập nhanh tài khoản Demo VIP
        </button>

        <div class="text-center text-xs text-[var(--cinema-text-muted)]">
          <a routerLink="/verify-email" class="text-[var(--cinema-accent)] hover:underline">
            Nhập mã OTP xác thực email
          </a>
        </div>
      </div>
    </div>
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
