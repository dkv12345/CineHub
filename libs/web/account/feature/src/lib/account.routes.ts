import type { Routes } from '@angular/router';
import { ProfilePageComponent } from './profile-page.component';
import { StaffCheckinPageComponent } from './staff-checkin-page.component';
import { AdminDashboardPageComponent } from './admin-dashboard-page.component';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: 'profile',
    component: ProfilePageComponent,
    title: 'Hồ sơ tài khoản | CineHub',
  },
  {
    path: 'staff/checkin',
    component: StaffCheckinPageComponent,
    title: 'Soát vé QR tại cổng | CineHub',
  },
  {
    path: 'admin',
    component: AdminDashboardPageComponent,
    title: 'Quản trị hệ thống | CineHub',
  },
];
