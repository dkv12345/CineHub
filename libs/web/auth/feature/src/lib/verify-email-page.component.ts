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
  styles: [`
    :host {
      --auth-bg: #0E0C0B;
      --auth-surface: #161411;
      --auth-surface-raised: #1D1A17;
      --auth-border: #2E2A25;
      --auth-border-focus: #C2A16B;
      --auth-text-primary: #F0EBE2;
      --auth-text-secondary: #A09890;
      --auth-text-muted: #7A7268;
      --auth-accent: #C2A16B;
      --auth-accent-hover: #D4B47E;
      --auth-btn-bg: #C2A16B;
      --auth-btn-text: #0E0C0B;
      --auth-danger: #C97B75;
      --auth-danger-bg: rgba(201,123,117,0.10);
      --auth-success: #7DAB89;
    }

    .ve-wrapper {
      min-height: calc(100vh - 73px);
      background: var(--auth-bg);
      display: flex; flex-direction: row;
    }
    .ve-panel {
      flex: 1; display: flex; flex-direction: column; justify-content: center;
      padding: 3rem 2rem;
    }
    @media (min-width: 640px) { .ve-panel { padding: 3.5rem 3rem; } }
    @media (min-width: 1024px) { .ve-panel { padding: 4rem 5rem; } }
    @media (min-width: 1280px) { .ve-panel { padding: 4rem 6rem; } }

    .ve-inner {
      width: 100%; max-width: 420px;
      margin: 0 auto;
      display: flex; flex-direction: column; gap: 1.75rem;
    }

    .ve-brand { display: flex; align-items: center; gap: 0.75rem; }
    .ve-brand-mono {
      width: 42px; height: 42px; border-radius: 6px;
      background: var(--auth-accent);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.9rem; font-weight: 700; color: var(--auth-btn-text); flex-shrink: 0;
    }
    .ve-brand-name {
      font-size: 1.1rem; font-weight: 600; color: var(--auth-text-primary); line-height: 1.2;
    }
    .ve-brand-tagline { font-size: 0.72rem; color: var(--auth-text-muted); margin-top: 2px; }

    .ve-heading {
      font-size: clamp(1.4rem, 3vw, 1.75rem); font-weight: 600;
      color: var(--auth-text-primary); line-height: 1.25; letter-spacing: -0.02em; margin: 0;
    }
    .ve-subheading {
      font-size: 0.82rem; color: var(--auth-text-secondary); line-height: 1.6; margin: 0.4rem 0 0;
    }

    .ve-error {
      display: flex; align-items: flex-start; gap: 10px;
      background: var(--auth-danger-bg);
      border: 1px solid rgba(201,123,117,0.3);
      border-radius: 7px; padding: 0.75rem 1rem;
      font-size: 0.78rem; font-weight: 500; color: var(--auth-danger); line-height: 1.5;
    }

    .ve-form { display: flex; flex-direction: column; gap: 1rem; }

    .ve-label {
      display: block; font-size: 0.75rem; font-weight: 600;
      color: var(--auth-text-secondary); letter-spacing: 0.04em;
      text-transform: uppercase; margin-bottom: 0.4rem;
    }
    .ve-label-row {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;
    }
    .ve-resend-btn {
      font-size: 0.72rem; font-weight: 600; color: var(--auth-accent);
      background: none; border: none; cursor: pointer; padding: 0;
      transition: color 150ms;
    }
    .ve-resend-btn:hover { color: var(--auth-accent-hover); }

    .ve-input-wrap { position: relative; }
    .ve-input-icon {
      position: absolute; inset-y: 0; left: 0;
      display: flex; align-items: center; padding-left: 0.875rem;
      pointer-events: none; color: var(--auth-text-muted);
    }
    .ve-input {
      width: 100%; height: 44px;
      background: var(--auth-surface);
      border: 1px solid var(--auth-border); border-radius: 7px;
      color: var(--auth-text-primary); font-size: 0.875rem; padding: 0 0.875rem;
      transition: border-color 150ms, box-shadow 150ms;
      outline: none; box-sizing: border-box;
    }
    .ve-input::placeholder { color: var(--auth-text-muted); }
    .ve-input:focus {
      border-color: var(--auth-border-focus);
      box-shadow: 0 0 0 3px rgba(194,161,107,0.12);
    }
    .ve-input--leading { padding-left: 2.5rem; }

    /* OTP input - prominent */
    .ve-otp-input {
      width: 100%; height: 56px;
      background: var(--auth-surface);
      border: 1px solid var(--auth-border); border-radius: 7px;
      color: var(--auth-accent);
      font-family: ui-monospace, monospace;
      font-size: 1.5rem; font-weight: 700;
      letter-spacing: 0.5em;
      text-align: center;
      transition: border-color 150ms, box-shadow 150ms;
      outline: none; box-sizing: border-box;
    }
    .ve-otp-input::placeholder { color: var(--auth-text-muted); letter-spacing: 0.3em; font-size: 1.25rem; }
    .ve-otp-input:focus {
      border-color: var(--auth-border-focus);
      box-shadow: 0 0 0 3px rgba(194,161,107,0.12);
    }

    .ve-input-hint {
      font-size: 0.72rem; color: var(--auth-text-muted); margin-top: 0.4rem;
      line-height: 1.5; text-align: center;
    }

    .ve-btn {
      width: 100%; height: 44px;
      background: var(--auth-accent); color: var(--auth-btn-text);
      border: none; border-radius: 7px;
      font-size: 0.875rem; font-weight: 700; letter-spacing: 0.01em;
      cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      transition: background 150ms, transform 100ms, opacity 150ms;
    }
    .ve-btn:hover:not(:disabled) { background: var(--auth-accent-hover); }
    .ve-btn:active:not(:disabled) { transform: scale(0.99); }
    .ve-btn:disabled { opacity: 0.55; cursor: not-allowed; }

    .ve-footer {
      border-top: 1px solid var(--auth-border); padding-top: 1.1rem; text-align: center;
    }
    .ve-back {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 0.78rem; font-weight: 600; color: var(--auth-accent);
      text-decoration: none; transition: color 150ms;
    }
    .ve-back:hover { color: var(--auth-accent-hover); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; }

    /* Visual column */
    .ve-visual {
      display: none; position: relative;
      flex-direction: column; justify-content: space-between;
      overflow: hidden; background: #0A0806;
    }
    @media (min-width: 768px) {
      .ve-visual { display: flex; width: 48%; padding: 2.5rem; }
    }
    @media (min-width: 1024px) { .ve-visual { padding: 3rem 3.5rem; } }

    .ve-visual-img {
      position: absolute; inset: 0;
      width: 100%; height: 100%; object-fit: cover; opacity: 0.5;
      transition: transform 1.2s ease;
    }
    .ve-visual:hover .ve-visual-img { transform: scale(1.03); }

    .ve-visual-vignette {
      position: absolute; inset: 0;
      background: linear-gradient(to top, #0A0806 0%, rgba(10,8,6,0.72) 50%, rgba(10,8,6,0.2) 100%);
    }

    .ve-visual-badge {
      position: relative; z-index: 10;
      display: inline-flex; align-items: center; gap: 0.6rem;
      border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.35);
      border-radius: 999px; padding: 0.4rem 0.9rem;
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      width: fit-content;
    }
    .ve-visual-badge-mono {
      width: 22px; height: 22px; background: var(--auth-accent);
      border-radius: 4px; display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.65rem; font-weight: 700; color: var(--auth-btn-text);
    }
    .ve-visual-badge-label {
      font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: rgba(255,255,255,0.9);
    }

    .ve-visual-card {
      position: relative; z-index: 10;
      border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.5);
      border-radius: 12px; padding: 1.5rem;
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    }
    .ve-visual-title { font-size: 1.15rem; font-weight: 600; color: #fff; line-height: 1.3; margin: 0 0 0.5rem; }
    .ve-visual-desc { font-size: 0.75rem; color: rgba(255,255,255,0.65); line-height: 1.65; margin: 0 0 1rem; }
    .ve-visual-perks {
      display: flex; flex-direction: column; gap: 0.5rem;
      border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;
    }
    .ve-visual-perk { display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; color: rgba(255,255,255,0.8); }
    .ve-visual-perk-check { color: var(--auth-accent); font-weight: 700; flex-shrink: 0; }
    .ve-visual-copy { font-size: 0.65rem; color: rgba(255,255,255,0.3); margin-top: 1rem; }
  `],
  template: `
    <div class="ve-wrapper">

      <!-- Left Panel -->
      <div class="ve-panel">
        <div class="ve-inner">

          <!-- Brand -->
          <div class="ve-brand">
            <span class="ve-brand-mono">CH</span>
            <div>
              <div class="ve-brand-name">CineHub</div>
              <div class="ve-brand-tagline">Kích hoạt tài khoản thành viên</div>
            </div>
          </div>

          <!-- Heading -->
          <div>
            <h1 class="ve-heading">Xác thực Email</h1>
            <p class="ve-subheading">Nhập mã OTP 6 chữ số đã được gửi tới hòm thư email của bạn.</p>
          </div>

          <!-- Error -->
          @if (errorBanner()) {
            <div class="ve-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ errorBanner() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="ve-form">

            <!-- Email -->
            <div>
              <label for="verify-email" class="ve-label">Email</label>
              <div class="ve-input-wrap">
                <span class="ve-input-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect width="20" height="16" x="2" y="4" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </span>
                <input
                  id="verify-email" type="email" formControlName="email"
                  placeholder="ban@cinehub.vn"
                  class="ve-input ve-input--leading"
                />
              </div>
            </div>

            <!-- OTP Code -->
            <div>
              <div class="ve-label-row">
                <label for="verify-code" class="ve-label" style="margin:0">Mã OTP</label>
                <button type="button" class="ve-resend-btn" (click)="resendOtp()">
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
                class="ve-otp-input"
              />
              <p class="ve-input-hint">
                Kiểm tra hộp thư đến hoặc mục Spam nếu bạn chưa nhận được mã.
              </p>
            </div>

            <button type="submit" class="ve-btn" [disabled]="submitting()">
              @if (submitting()) {
                <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/>
                </svg>
                Đang xác thực...
              } @else {
                Xác nhận kích hoạt tài khoản
              }
            </button>
          </form>

          <!-- Footer -->
          <div class="ve-footer">
            <a routerLink="/auth" class="ve-back">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Quay lại trang đăng nhập
            </a>
          </div>

        </div>
      </div>

      <!-- Right Visual -->
      <div class="ve-visual">
        <img
          src="https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=85"
          alt="CineHub — Xác thực hội viên"
          class="ve-visual-img"
        />
        <div class="ve-visual-vignette" aria-hidden="true"></div>

        <div class="ve-visual-badge">
          <span class="ve-visual-badge-mono">CH</span>
          <span class="ve-visual-badge-label">Xác Thực Hội Viên</span>
        </div>

        <div class="ve-visual-card">
          <h2 class="ve-visual-title">Kích Hoạt Tài Khoản Thành Viên</h2>
          <p class="ve-visual-desc">
            Chỉ còn một bước để hoàn tất. Xác thực email giúp bảo vệ vé điện tử và tài khoản tích điểm của bạn an toàn tuyệt đối.
          </p>
          <div class="ve-visual-perks">
            <div class="ve-visual-perk"><span class="ve-visual-perk-check">✓</span><span>Kích hoạt điểm thưởng thành viên VIP</span></div>
            <div class="ve-visual-perk"><span class="ve-visual-perk-check">✓</span><span>Nhận vé điện tử trực tiếp qua email</span></div>
            <div class="ve-visual-perk"><span class="ve-visual-perk-check">✓</span><span>Truy cập toàn bộ tính năng đặt chỗ</span></div>
          </div>
          <p class="ve-visual-copy">© 2026 CineHub Cinema Network. Tất cả quyền được bảo lưu.</p>
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
