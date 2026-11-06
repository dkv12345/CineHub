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

    .rp-wrapper {
      min-height: calc(100vh - 73px);
      background: var(--auth-bg);
      display: flex;
      flex-direction: row;
    }
    .rp-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 3rem 2rem;
    }
    @media (min-width: 640px) { .rp-panel { padding: 3.5rem 3rem; } }
    @media (min-width: 1024px) { .rp-panel { padding: 4rem 5rem; } }
    @media (min-width: 1280px) { .rp-panel { padding: 4rem 6rem; } }

    .rp-inner {
      width: 100%; max-width: 420px;
      margin: 0 auto;
      display: flex; flex-direction: column; gap: 1.75rem;
    }

    .rp-brand { display: flex; align-items: center; gap: 0.75rem; }
    .rp-brand-mono {
      width: 42px; height: 42px;
      border-radius: 6px;
      background: var(--auth-accent);
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.9rem; font-weight: 700;
      color: var(--auth-btn-text);
      flex-shrink: 0;
    }
    .rp-brand-name {
      font-size: 1.1rem; font-weight: 600;
      color: var(--auth-text-primary);
      line-height: 1.2;
    }
    .rp-brand-tagline { font-size: 0.72rem; color: var(--auth-text-muted); margin-top: 2px; }

    .rp-heading {
      font-size: clamp(1.4rem, 3vw, 1.75rem);
      font-weight: 600; color: var(--auth-text-primary);
      line-height: 1.25; letter-spacing: -0.02em; margin: 0;
    }
    .rp-subheading {
      font-size: 0.82rem; color: var(--auth-text-secondary);
      line-height: 1.6; margin: 0.4rem 0 0;
    }

    .rp-error {
      display: flex; align-items: flex-start; gap: 10px;
      background: var(--auth-danger-bg);
      border: 1px solid rgba(201,123,117,0.3);
      border-radius: 7px; padding: 0.75rem 1rem;
      font-size: 0.78rem; font-weight: 500;
      color: var(--auth-danger); line-height: 1.5;
    }

    .rp-success {
      display: flex; align-items: flex-start; gap: 10px;
      background: rgba(125,171,137,0.10);
      border: 1px solid rgba(125,171,137,0.3);
      border-radius: 7px; padding: 0.9rem 1rem;
      font-size: 0.82rem; color: var(--auth-success); line-height: 1.5;
    }

    .rp-form { display: flex; flex-direction: column; gap: 1rem; }

    .rp-label {
      display: block; font-size: 0.75rem; font-weight: 600;
      color: var(--auth-text-secondary); letter-spacing: 0.04em;
      text-transform: uppercase; margin-bottom: 0.4rem;
    }
    .rp-input-wrap { position: relative; }
    .rp-input-icon {
      position: absolute; inset-y: 0; left: 0;
      display: flex; align-items: center; padding-left: 0.875rem;
      pointer-events: none; color: var(--auth-text-muted);
    }
    .rp-input-eye {
      position: absolute; inset-y: 0; right: 0;
      display: flex; align-items: center; padding-right: 0.875rem;
      color: var(--auth-text-muted); background: none; border: none;
      cursor: pointer; transition: color 150ms;
    }
    .rp-input-eye:hover { color: var(--auth-text-primary); }
    .rp-input {
      width: 100%; height: 44px;
      background: var(--auth-surface);
      border: 1px solid var(--auth-border);
      border-radius: 7px; color: var(--auth-text-primary);
      font-size: 0.875rem; padding: 0 0.875rem;
      transition: border-color 150ms, box-shadow 150ms;
      outline: none; box-sizing: border-box;
    }
    .rp-input::placeholder { color: var(--auth-text-muted); }
    .rp-input:focus {
      border-color: var(--auth-border-focus);
      box-shadow: 0 0 0 3px rgba(194,161,107,0.12);
    }
    .rp-input--leading { padding-left: 2.5rem; }
    .rp-input--both { padding-left: 2.5rem; padding-right: 2.75rem; }
    .rp-input--mono { font-family: ui-monospace, monospace; letter-spacing: 0.08em; }

    .rp-btn {
      width: 100%; height: 44px;
      background: var(--auth-accent); color: var(--auth-btn-text);
      border: none; border-radius: 7px;
      font-size: 0.875rem; font-weight: 700; letter-spacing: 0.01em;
      cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      transition: background 150ms, transform 100ms, opacity 150ms;
    }
    .rp-btn:hover:not(:disabled) { background: var(--auth-accent-hover); }
    .rp-btn:active:not(:disabled) { transform: scale(0.99); }
    .rp-btn:disabled { opacity: 0.55; cursor: not-allowed; }

    .rp-footer {
      border-top: 1px solid var(--auth-border); padding-top: 1.1rem;
      text-align: center;
    }
    .rp-back {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 0.78rem; font-weight: 600;
      color: var(--auth-accent); text-decoration: none;
      transition: color 150ms;
    }
    .rp-back:hover { color: var(--auth-accent-hover); }

    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; }

    /* Visual column */
    .rp-visual {
      display: none; position: relative;
      flex-direction: column; justify-content: space-between;
      overflow: hidden; background: #0A0806;
    }
    @media (min-width: 768px) {
      .rp-visual { display: flex; width: 48%; padding: 2.5rem; }
    }
    @media (min-width: 1024px) { .rp-visual { padding: 3rem 3.5rem; } }

    .rp-visual-img {
      position: absolute; inset: 0;
      width: 100%; height: 100%; object-fit: cover; opacity: 0.5;
      transition: transform 1.2s ease;
    }
    .rp-visual:hover .rp-visual-img { transform: scale(1.03); }

    .rp-visual-vignette {
      position: absolute; inset: 0;
      background: linear-gradient(to top, #0A0806 0%, rgba(10,8,6,0.72) 50%, rgba(10,8,6,0.2) 100%);
    }

    .rp-visual-badge {
      position: relative; z-index: 10;
      display: inline-flex; align-items: center; gap: 0.6rem;
      border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.35);
      border-radius: 999px; padding: 0.4rem 0.9rem;
      backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
      width: fit-content;
    }
    .rp-visual-badge-mono {
      width: 22px; height: 22px; background: var(--auth-accent);
      border-radius: 4px; display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.65rem; font-weight: 700; color: var(--auth-btn-text);
    }
    .rp-visual-badge-label {
      font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: rgba(255,255,255,0.9);
    }

    .rp-visual-card {
      position: relative; z-index: 10;
      border: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.5);
      border-radius: 12px; padding: 1.5rem;
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
    }
    .rp-visual-title {
      font-size: 1.15rem; font-weight: 600; color: #fff; line-height: 1.3; margin: 0 0 0.5rem;
    }
    .rp-visual-desc {
      font-size: 0.75rem; color: rgba(255,255,255,0.65); line-height: 1.65; margin: 0 0 1rem;
    }
    .rp-visual-perks {
      display: flex; flex-direction: column; gap: 0.5rem;
      border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;
    }
    .rp-visual-perk {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.72rem; color: rgba(255,255,255,0.8);
    }
    .rp-visual-perk-check { color: var(--auth-accent); font-weight: 700; flex-shrink: 0; }
    .rp-visual-copy { font-size: 0.65rem; color: rgba(255,255,255,0.3); margin-top: 1rem; }
  `],
  template: `
    <div class="rp-wrapper">

      <!-- Left Panel -->
      <div class="rp-panel">
        <div class="rp-inner">

          <!-- Brand -->
          <div class="rp-brand">
            <span class="rp-brand-mono">CH</span>
            <div>
              <div class="rp-brand-name">CineHub</div>
              <div class="rp-brand-tagline">Trung tâm bảo mật tài khoản</div>
            </div>
          </div>

          <!-- Heading -->
          <div>
            <h1 class="rp-heading">Đặt lại mật khẩu</h1>
            <p class="rp-subheading">Nhập mã token từ email và thiết lập mật khẩu bảo mật mới cho tài khoản.</p>
          </div>

          <!-- Error -->
          @if (errorBanner()) {
            <div class="rp-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ errorBanner() }}</span>
            </div>
          }

          <!-- Success -->
          @if (resetSuccess()) {
            <div class="rp-success">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
              </svg>
              <div>
                <div style="font-weight:600;margin-bottom:3px">Đặt lại mật khẩu thành công!</div>
                <div style="font-size:0.75rem;opacity:0.85">Bạn có thể đăng nhập bằng mật khẩu mới ngay bây giờ.</div>
              </div>
            </div>
          }

          @if (!resetSuccess()) {
            <form [formGroup]="form" (ngSubmit)="submit()" class="rp-form">

              <!-- Token Field -->
              <div>
                <label for="reset-token" class="rp-label">Mã token khôi phục</label>
                <div class="rp-input-wrap">
                  <span class="rp-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9m-4 4 4.5-4.5a5 5 0 1 1 7.07 7.07L11 16"/>
                    </svg>
                  </span>
                  <input
                    id="reset-token" type="text" formControlName="token"
                    placeholder="Dán mã token từ email vào đây"
                    class="rp-input rp-input--leading rp-input--mono"
                  />
                </div>
              </div>

              <!-- New Password -->
              <div>
                <label for="reset-new-password" class="rp-label">Mật khẩu mới <span style="font-weight:400;text-transform:none;color:var(--auth-text-muted)">(tối thiểu 8 ký tự)</span></label>
                <div class="rp-input-wrap">
                  <span class="rp-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="reset-new-password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="newPassword"
                    autocomplete="new-password"
                    placeholder="••••••••"
                    class="rp-input rp-input--both"
                  />
                  <button
                    type="button" class="rp-input-eye"
                    (click)="toggleShowPassword()"
                    [attr.aria-label]="showPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                  >
                    @if (showPassword()) {
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                        <line x1="2" x2="22" y1="2" y2="22"/>
                      </svg>
                    } @else {
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    }
                  </button>
                </div>
              </div>

              <button type="submit" class="rp-btn" [disabled]="submitting()">
                @if (submitting()) {
                  <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/>
                  </svg>
                  Đang cập nhật...
                } @else {
                  Cập nhật mật khẩu mới
                }
              </button>
            </form>
          }

          <!-- Footer -->
          <div class="rp-footer">
            <a routerLink="/auth" class="rp-back">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Quay lại trang đăng nhập
            </a>
          </div>

        </div>
      </div>

      <!-- Right Visual -->
      <div class="rp-visual">
        <img
          src="https://images.unsplash.com/photo-1512070679279-8988d32161be?auto=format&fit=crop&w=1600&q=85"
          alt="CineHub — Bảo mật tài khoản"
          class="rp-visual-img"
        />
        <div class="rp-visual-vignette" aria-hidden="true"></div>

        <div class="rp-visual-badge">
          <span class="rp-visual-badge-mono">CH</span>
          <span class="rp-visual-badge-label">CineHub Security</span>
        </div>

        <div class="rp-visual-card">
          <h2 class="rp-visual-title">Bảo Mật Tài Khoản Tuyệt Đối</h2>
          <p class="rp-visual-desc">
            Mật khẩu của bạn được mã hóa một chiều chuẩn công nghệ cao nhất. Không ai — kể cả chúng tôi — có thể xem mật khẩu của bạn.
          </p>
          <div class="rp-visual-perks">
            <div class="rp-visual-perk"><span class="rp-visual-perk-check">✓</span><span>Mã hóa bảo mật nhiều lớp an toàn</span></div>
            <div class="rp-visual-perk"><span class="rp-visual-perk-check">✓</span><span>Đồng bộ tức thì trên tất cả thiết bị</span></div>
            <div class="rp-visual-perk"><span class="rp-visual-perk-check">✓</span><span>Liên kết đặt lại chỉ có hiệu lực 1 lần</span></div>
          </div>
          <p class="rp-visual-copy">© 2026 CineHub Cinema Network. Tất cả quyền được bảo lưu.</p>
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
