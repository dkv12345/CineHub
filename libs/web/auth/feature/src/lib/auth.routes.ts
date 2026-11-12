import type { Routes } from '@angular/router';
import { AuthPageComponent } from './auth-page.component';
import { ResetPasswordPageComponent } from './reset-password-page.component';
import { VerifyEmailPageComponent } from './verify-email-page.component';

export const AUTH_ROUTES: Routes = [
  {
    path: 'auth',
    component: AuthPageComponent,
    title: 'Đăng nhập & Đăng ký | CineHub',
  },
  {
    path: 'register',
    component: AuthPageComponent,
    title: 'Đăng ký tài khoản | CineHub',
    data: { mode: 'register' },
  },
  {
    path: 'login',
    component: AuthPageComponent,
    title: 'Đăng nhập | CineHub',
    data: { mode: 'login' },
  },
  {
    path: 'verify-email',
    component: VerifyEmailPageComponent,
    title: 'Xác thực Email | CineHub',
  },
  {
    path: 'reset-password',
    component: ResetPasswordPageComponent,
    title: 'Đặt lại mật khẩu | CineHub',
  },
];
