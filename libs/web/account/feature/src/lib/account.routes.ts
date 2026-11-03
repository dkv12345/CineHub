import type { Routes } from '@angular/router';
import { ProfilePageComponent } from './profile-page.component';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: 'profile',
    component: ProfilePageComponent,
    title: 'Hồ sơ tài khoản | CineHub',
  },
];
