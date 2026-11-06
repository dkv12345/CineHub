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

    .auth-wrapper {
      min-height: calc(100vh - 73px);
      background: var(--auth-bg);
      display: flex;
      flex-direction: row;
    }

    /* ── Left panel ── */
    .auth-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 3rem 2rem;
    }
    @media (min-width: 640px) { .auth-panel { padding: 3.5rem 3rem; } }
    @media (min-width: 1024px) { .auth-panel { padding: 4rem 5rem; } }
    @media (min-width: 1280px) { .auth-panel { padding: 4rem 6rem; } }

    .auth-inner {
      width: 100%;
      max-width: 420px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    /* Brand */
    .auth-brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    .auth-brand-monogram {
      width: 42px; height: 42px;
      border-radius: 6px;
      background: var(--auth-accent);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--auth-btn-text);
      letter-spacing: 0.03em;
      flex-shrink: 0;
    }
    .auth-brand-name {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--auth-text-primary);
      line-height: 1.2;
      letter-spacing: -0.01em;
    }
    .auth-brand-tagline {
      font-size: 0.72rem;
      color: var(--auth-text-muted);
      margin-top: 2px;
    }

    /* Heading */
    .auth-heading {
      font-size: clamp(1.4rem, 3vw, 1.75rem);
      font-weight: 600;
      color: var(--auth-text-primary);
      line-height: 1.25;
      letter-spacing: -0.02em;
      margin: 0;
    }
    .auth-subheading {
      font-size: 0.82rem;
      color: var(--auth-text-secondary);
      line-height: 1.6;
      margin: 0.4rem 0 0;
    }

    /* Tab switcher */
    .auth-tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      background: var(--auth-surface-raised);
      border: 1px solid var(--auth-border);
      border-radius: 8px;
      padding: 4px;
      gap: 2px;
    }
    .auth-tab {
      border-radius: 5px;
      padding: 0.6rem 0;
      font-size: 0.78rem;
      font-weight: 600;
      text-align: center;
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--auth-text-secondary);
      transition: background 150ms, color 150ms;
      letter-spacing: 0.01em;
    }
    .auth-tab:hover:not(.auth-tab--active) {
      color: var(--auth-text-primary);
    }
    .auth-tab--active {
      background: var(--auth-accent);
      color: var(--auth-btn-text);
    }

    /* Back link */
    .auth-back {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--auth-accent);
      background: none;
      border: none;
      padding: 0;
      cursor: pointer;
      text-decoration: none;
      transition: color 150ms;
    }
    .auth-back:hover { color: var(--auth-accent-hover); }

    /* Error banner */
    .auth-error {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: var(--auth-danger-bg);
      border: 1px solid rgba(201,123,117,0.3);
      border-radius: 7px;
      padding: 0.75rem 1rem;
      font-size: 0.78rem;
      font-weight: 500;
      color: var(--auth-danger);
      line-height: 1.5;
    }

    /* Success banner */
    .auth-success-banner {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      background: rgba(125,171,137,0.10);
      border: 1px solid rgba(125,171,137,0.3);
      border-radius: 7px;
      padding: 0.85rem 1rem;
      font-size: 0.82rem;
      color: var(--auth-success);
      line-height: 1.5;
    }

    /* Form */
    .auth-form { display: flex; flex-direction: column; gap: 1rem; }

    .auth-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--auth-text-secondary);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 0.4rem;
    }
    .auth-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }
    .auth-label-link {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--auth-accent);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      text-decoration: none;
      transition: color 150ms;
    }
    .auth-label-link:hover { color: var(--auth-accent-hover); }

    .auth-input-wrap { position: relative; }
    .auth-input-icon {
      position: absolute;
      inset-y: 0; left: 0;
      display: flex; align-items: center;
      padding-left: 0.875rem;
      pointer-events: none;
      color: var(--auth-text-muted);
    }
    .auth-input-eye {
      position: absolute;
      inset-y: 0; right: 0;
      display: flex; align-items: center;
      padding-right: 0.875rem;
      color: var(--auth-text-muted);
      background: none;
      border: none;
      cursor: pointer;
      transition: color 150ms;
    }
    .auth-input-eye:hover { color: var(--auth-text-primary); }

    .auth-input {
      width: 100%;
      height: 44px;
      background: var(--auth-surface);
      border: 1px solid var(--auth-border);
      border-radius: 7px;
      color: var(--auth-text-primary);
      font-size: 0.875rem;
      padding: 0 0.875rem;
      transition: border-color 150ms, box-shadow 150ms;
      outline: none;
      box-sizing: border-box;
    }
    .auth-input::placeholder { color: var(--auth-text-muted); }
    .auth-input:focus {
      border-color: var(--auth-border-focus);
      box-shadow: 0 0 0 3px rgba(194,161,107,0.12);
    }
    .auth-input--leading { padding-left: 2.5rem; }
    .auth-input--both { padding-left: 2.5rem; padding-right: 2.75rem; }

    .auth-input-hint {
      font-size: 0.72rem;
      color: var(--auth-text-muted);
      margin-top: 0.35rem;
      line-height: 1.5;
    }

    /* Checkbox */
    .auth-checkbox-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    .auth-checkbox-row input[type="checkbox"] {
      width: 15px; height: 15px;
      border-radius: 3px;
      accent-color: var(--auth-accent);
      cursor: pointer;
    }
    .auth-checkbox-label {
      font-size: 0.78rem;
      color: var(--auth-text-secondary);
    }

    /* Primary button */
    .auth-btn-primary {
      width: 100%;
      height: 44px;
      background: var(--auth-accent);
      color: var(--auth-btn-text);
      border: none;
      border-radius: 7px;
      font-size: 0.875rem;
      font-weight: 700;
      letter-spacing: 0.01em;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: background 150ms, transform 100ms, opacity 150ms;
    }
    .auth-btn-primary:hover:not(:disabled) {
      background: var(--auth-accent-hover);
    }
    .auth-btn-primary:active:not(:disabled) { transform: scale(0.99); }
    .auth-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

    /* Secondary button (social) */
    .auth-btn-secondary {
      width: 100%;
      height: 42px;
      background: var(--auth-surface-raised);
      color: var(--auth-text-primary);
      border: 1px solid var(--auth-border);
      border-radius: 7px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: border-color 150ms, background 150ms;
    }
    .auth-btn-secondary:hover {
      border-color: var(--auth-border-focus);
      background: rgba(194,161,107,0.06);
    }

    /* Divider */
    .auth-divider {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0.25rem 0;
    }
    .auth-divider::before, .auth-divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--auth-border);
    }
    .auth-divider-text {
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--auth-text-muted);
      white-space: nowrap;
    }

    /* Google btn container */
    .auth-google-wrap {
      display: flex;
      justify-content: center;
      min-height: 40px;
    }

    /* Bottom links */
    .auth-footer {
      border-top: 1px solid var(--auth-border);
      padding-top: 1.1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      text-align: center;
    }
    .auth-footer-text {
      font-size: 0.78rem;
      color: var(--auth-text-secondary);
    }
    .auth-footer-link {
      font-weight: 600;
      color: var(--auth-accent);
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      margin-left: 4px;
      text-decoration: none;
      transition: color 150ms;
    }
    .auth-footer-link:hover { color: var(--auth-accent-hover); }
    .auth-footer-otp-link {
      font-size: 0.75rem;
      color: var(--auth-text-muted);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: color 150ms;
    }
    .auth-footer-otp-link:hover { color: var(--auth-accent); }

    /* Spinner */
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; }

    /* ── Right visual column ── */
    .auth-visual {
      display: none;
      position: relative;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      background: #0A0806;
    }
    @media (min-width: 768px) {
      .auth-visual {
        display: flex;
        width: 48%;
        padding: 2.5rem;
      }
    }
    @media (min-width: 1024px) { .auth-visual { padding: 3rem 3.5rem; } }

    .auth-visual-img {
      position: absolute;
      inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
      opacity: 0.5;
      transition: transform 1.2s ease;
    }
    .auth-visual:hover .auth-visual-img { transform: scale(1.03); }

    .auth-visual-vignette {
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, #0A0806 0%, rgba(10,8,6,0.72) 50%, rgba(10,8,6,0.2) 100%);
    }

    .auth-visual-badge {
      position: relative;
      z-index: 10;
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(0,0,0,0.35);
      border-radius: 999px;
      padding: 0.4rem 0.9rem;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      width: fit-content;
    }
    .auth-visual-badge-mono {
      width: 22px; height: 22px;
      background: var(--auth-accent);
      border-radius: 4px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.65rem; font-weight: 700;
      color: var(--auth-btn-text);
    }
    .auth-visual-badge-label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: rgba(255,255,255,0.9);
    }

    .auth-visual-card {
      position: relative;
      z-index: 10;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(0,0,0,0.5);
      border-radius: 12px;
      padding: 1.5rem;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    }
    .auth-visual-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: #fff;
      line-height: 1.3;
      margin: 0 0 0.5rem;
    }
    .auth-visual-desc {
      font-size: 0.75rem;
      color: rgba(255,255,255,0.65);
      line-height: 1.65;
      margin: 0 0 1rem;
    }
    .auth-visual-perks {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem 1rem;
      border-top: 1px solid rgba(255,255,255,0.1);
      padding-top: 1rem;
    }
    .auth-visual-perk {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.72rem;
      color: rgba(255,255,255,0.8);
    }
    .auth-visual-perk-check {
      color: var(--auth-accent);
      font-weight: 700;
      font-size: 0.8rem;
      flex-shrink: 0;
    }
    .auth-visual-copy {
      font-size: 0.65rem;
      color: rgba(255,255,255,0.3);
      margin-top: 1rem;
    }
  `],
  template: `
    <div class="auth-wrapper" cdkTrapFocus>

      <!-- ── Left Panel ── -->
      <div class="auth-panel">
        <div class="auth-inner">

          <!-- Brand -->
          <div class="auth-brand">
            <span class="auth-brand-monogram">CH</span>
            <div>
              <div class="auth-brand-name">CineHub</div>
              <div class="auth-brand-tagline">Hệ thống rạp chiếu chuẩn quốc tế</div>
            </div>
          </div>

          <!-- Heading -->
          <div>
            <h1 class="auth-heading">
              @switch (mode()) {
                @case ('login') { Chào mừng trở lại }
                @case ('register') { Tạo tài khoản thành viên }
                @case ('forgot') { Khôi phục mật khẩu }
              }
            </h1>
            <p class="auth-subheading">
              @switch (mode()) {
                @case ('login') { Rất vui được đồng hành cùng bạn trong từng thước phim. }
                @case ('register') { Gia nhập CineHub Club để nhận điểm thưởng và đặc quyền VIP. }
                @case ('forgot') { Nhập email đã đăng ký để nhận liên kết khôi phục an toàn. }
              }
            </p>
          </div>

          <!-- Mode Tabs (not for forgot mode) -->
          @if (mode() !== 'forgot') {
            <div class="auth-tabs" role="tablist" aria-label="Chuyển đăng nhập / đăng ký">
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="mode() === 'login'"
                (click)="setMode('login')"
                class="auth-tab"
                [class.auth-tab--active]="mode() === 'login'"
              >
                Đăng nhập
              </button>
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="mode() === 'register'"
                (click)="setMode('register')"
                class="auth-tab"
                [class.auth-tab--active]="mode() === 'register'"
              >
                Đăng ký
              </button>
            </div>
          } @else {
            <button type="button" class="auth-back" (click)="setMode('login')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Quay lại trang đăng nhập
            </button>
          }

          <!-- Error Banner -->
          @if (errorBanner()) {
            <div class="auth-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ errorBanner() }}</span>
            </div>
          }

          <!-- ── LOGIN FORM ── -->
          @if (mode() === 'login') {
            <form [formGroup]="loginForm" (ngSubmit)="submitLogin()" class="auth-form">

              <div>
                <label for="login-email" class="auth-label">Email</label>
                <div class="auth-input-wrap">
                  <span class="auth-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </span>
                  <input
                    id="login-email" type="email" formControlName="email"
                    autocomplete="email" placeholder="ban@cinehub.vn"
                    class="auth-input auth-input--leading"
                  />
                </div>
              </div>

              <div>
                <div class="auth-label-row">
                  <label for="login-password" class="auth-label" style="margin:0">Mật khẩu</label>
                  <button type="button" class="auth-label-link" (click)="setMode('forgot')">
                    Quên mật khẩu?
                  </button>
                </div>
                <div class="auth-input-wrap">
                  <span class="auth-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    [type]="showPassword() ? 'text' : 'password'"
                    formControlName="password"
                    autocomplete="current-password"
                    placeholder="••••••••"
                    class="auth-input auth-input--both"
                  />
                  <button
                    type="button"
                    class="auth-input-eye"
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

              <label class="auth-checkbox-row">
                <input
                  type="checkbox"
                  [checked]="rememberMe()"
                  (change)="rememberMe.set(!rememberMe())"
                />
                <span class="auth-checkbox-label">Ghi nhớ đăng nhập trên thiết bị này</span>
              </label>

              <button type="submit" class="auth-btn-primary" [disabled]="submitting()">
                @if (submitting()) {
                  <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/>
                  </svg>
                  Đang xác thực...
                } @else {
                  Đăng nhập
                }
              </button>
            </form>
          }

          <!-- ── REGISTER FORM ── -->
          @if (mode() === 'register') {
            <form [formGroup]="registerForm" (ngSubmit)="submitRegister()" class="auth-form">

              <div>
                <label for="reg-fullname" class="auth-label">Họ và tên</label>
                <div class="auth-input-wrap">
                  <span class="auth-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>
                    </svg>
                  </span>
                  <input
                    id="reg-fullname" type="text" formControlName="fullName"
                    autocomplete="name" placeholder="Nguyễn Văn A"
                    class="auth-input auth-input--leading"
                  />
                </div>
              </div>

              <div>
                <label for="reg-email" class="auth-label">Email</label>
                <div class="auth-input-wrap">
                  <span class="auth-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </span>
                  <input
                    id="reg-email" type="email" formControlName="email"
                    autocomplete="email" placeholder="ban@cinehub.vn"
                    class="auth-input auth-input--leading"
                  />
                </div>
              </div>

              <div>
                <label for="reg-phone" class="auth-label">Số điện thoại <span style="font-weight:400;text-transform:none;color:var(--auth-text-muted)">(tùy chọn)</span></label>
                <div class="auth-input-wrap">
                  <span class="auth-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.21 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                    </svg>
                  </span>
                  <input
                    id="reg-phone" type="tel" formControlName="phone"
                    autocomplete="tel" placeholder="0901 234 567"
                    class="auth-input auth-input--leading"
                    style="font-variant-numeric:tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label for="reg-password" class="auth-label">Mật khẩu <span style="font-weight:400;text-transform:none;color:var(--auth-text-muted)">(tối thiểu 8 ký tự)</span></label>
                <div class="auth-input-wrap">
                  <span class="auth-input-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="reg-password"
                    [type]="showRegisterPassword() ? 'text' : 'password'"
                    formControlName="password"
                    autocomplete="new-password"
                    placeholder="••••••••"
                    class="auth-input auth-input--both"
                  />
                  <button
                    type="button"
                    class="auth-input-eye"
                    (click)="toggleShowRegisterPassword()"
                    [attr.aria-label]="showRegisterPassword() ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'"
                  >
                    @if (showRegisterPassword()) {
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

              <button type="submit" class="auth-btn-primary" [disabled]="submitting()">
                @if (submitting()) {
                  <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/>
                  </svg>
                  Đang tạo tài khoản...
                } @else {
                  Đăng ký thành viên
                }
              </button>
            </form>
          }

          <!-- ── FORGOT PASSWORD FORM ── -->
          @if (mode() === 'forgot') {
            @if (forgotSent()) {
              <div class="auth-success-banner">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px;color:var(--auth-success)">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
                </svg>
                <div>
                  <div style="font-weight:600;font-size:0.82rem;color:var(--auth-success)">Email đã được gửi!</div>
                  <div style="font-size:0.75rem;margin-top:3px;color:rgba(125,171,137,0.85)">
                    Kiểm tra hộp thư của bạn để tìm liên kết đặt lại mật khẩu (kể cả mục Spam).
                  </div>
                </div>
              </div>
            } @else {
              <form [formGroup]="forgotForm" (ngSubmit)="submitForgot()" class="auth-form">
                <div>
                  <label for="forgot-email" class="auth-label">Email tài khoản</label>
                  <div class="auth-input-wrap">
                    <span class="auth-input-icon">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect width="20" height="16" x="2" y="4" rx="2"/>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                    </span>
                    <input
                      id="forgot-email" type="email" formControlName="email"
                      placeholder="ban@cinehub.vn"
                      class="auth-input auth-input--leading"
                    />
                  </div>
                  <p class="auth-input-hint">Hệ thống sẽ gửi liên kết an toàn tới hộp thư để thiết lập lại mật khẩu.</p>
                </div>

                <button type="submit" class="auth-btn-primary" [disabled]="submitting()">
                  @if (submitting()) {
                    <svg class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10"/>
                    </svg>
                    Đang gửi liên kết...
                  } @else {
                    Gửi liên kết khôi phục
                  }
                </button>
              </form>
            }
          }

          <!-- Divider -->
          <div class="auth-divider">
            <span class="auth-divider-text">Hoặc tiếp tục với</span>
          </div>

          <!-- Social Buttons -->
          <div style="display:flex;flex-direction:column;gap:0.6rem">
            <div #googleBtnContainer class="auth-google-wrap" aria-label="Google Sign-In"></div>

            <button
              type="button"
              (click)="signInDemoCustomer()"
              class="auth-btn-secondary"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" style="color:var(--auth-accent)">
                <path d="M12 2l2.4 7.4h7.6l-6.1 4.5 2.3 7.1-6.2-4.5-6.2 4.5 2.3-7.1-6.1-4.5h7.6z"/>
              </svg>
              Đăng nhập nhanh — Tài khoản Demo VIP
            </button>
          </div>

          <!-- Footer Links -->
          <div class="auth-footer">
            @if (mode() === 'login') {
              <p class="auth-footer-text">
                Chưa có tài khoản?
                <button type="button" class="auth-footer-link" (click)="setMode('register')">Đăng ký ngay</button>
              </p>
            } @else if (mode() === 'register') {
              <p class="auth-footer-text">
                Đã có tài khoản?
                <button type="button" class="auth-footer-link" (click)="setMode('login')">Đăng nhập ngay</button>
              </p>
            }
            <p>
              <a routerLink="/verify-email" class="auth-footer-otp-link">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                Xác thực email bằng mã OTP
              </a>
            </p>
          </div>

        </div>
      </div>

      <!-- ── Right Visual Column ── -->
      <div class="auth-visual">
        <img
          src="https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=85"
          alt="CineHub — Trải nghiệm điện ảnh"
          class="auth-visual-img"
        />
        <div class="auth-visual-vignette" aria-hidden="true"></div>

        <!-- Top Badge -->
        <div class="auth-visual-badge">
          <span class="auth-visual-badge-mono">CH</span>
          <span class="auth-visual-badge-label">CineHub Cinema Club</span>
        </div>

        <!-- Bottom Card -->
        <div class="auth-visual-card">
          <h2 class="auth-visual-title">Trải Nghiệm Điện Ảnh Thượng Hạng</h2>
          <p class="auth-visual-desc">
            Khám phá thế giới điện ảnh với công nghệ mô phỏng góc nhìn 3D POV từ chính vị trí ghế bạn chọn, âm thanh Dolby Atmos và vô vàn đặc quyền VIP.
          </p>
          <div class="auth-visual-perks">
            <div class="auth-visual-perk"><span class="auth-visual-perk-check">✓</span><span>Góc nhìn 3D POV trực quan</span></div>
            <div class="auth-visual-perk"><span class="auth-visual-perk-check">✓</span><span>Tích lũy điểm đổi vé & combo</span></div>
            <div class="auth-visual-perk"><span class="auth-visual-perk-check">✓</span><span>Ưu đãi suất chiếu sớm</span></div>
            <div class="auth-visual-perk"><span class="auth-visual-perk-check">✓</span><span>Thanh toán bảo mật SSL</span></div>
          </div>
          <p class="auth-visual-copy">© 2026 CineHub Cinema Network. Tất cả quyền được bảo lưu.</p>
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
  readonly forgotSent = signal(false);

  readonly showPassword = signal(false);
  readonly showRegisterPassword = signal(false);
  readonly rememberMe = signal(true);

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
    this.forgotSent.set(false);
  }

  toggleShowPassword(): void {
    this.showPassword.update((val) => !val);
  }

  toggleShowRegisterPassword(): void {
    this.showRegisterPassword.update((val) => !val);
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
      this.forgotSent.set(true);
      this.toast.show('Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.', 'success');
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
