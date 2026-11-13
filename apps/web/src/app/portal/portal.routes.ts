import type { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore, ToastService } from '@cinehub/web/core';
import { PortalLoginComponent } from './portal-login.component';
import { PortalLayoutComponent } from './portal-layout.component';
import { PortalStaffComponent } from './portal-staff.component';
import { PortalAdminComponent } from './portal-admin.component';

const portalAuthGuard = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  if (!authStore.isAuthenticated()) {
    return router.createUrlTree(['/portal/login']);
  }
  return true;
};

const portalAdminGuard = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  const toast = inject(ToastService);
  if (!authStore.isAuthenticated()) {
    return router.createUrlTree(['/portal/login']);
  }
  if (authStore.user()?.role !== 'ADMIN') {
    toast.show('Chỉ Quản trị viên (ADMIN) mới có quyền truy cập trang này.', 'warning');
    return router.createUrlTree(['/portal/staff']);
  }
  return true;
};

export const PORTAL_ROUTES: Routes = [
  {
    path: 'login',
    component: PortalLoginComponent,
    title: 'Đăng nhập Cổng Quản Trị & Soát Vé | CineHub',
  },
  {
    path: '',
    component: PortalLayoutComponent,
    canActivate: [portalAuthGuard],
    children: [
      {
        path: 'staff',
        component: PortalStaffComponent,
        title: 'Cổng Soát Vé Nhân Viên | CineHub',
      },
      {
        path: 'admin',
        component: PortalAdminComponent,
        canActivate: [portalAdminGuard],
        title: 'Bảng Điều Khiển Quản Trị Viên | CineHub',
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'staff',
      },
    ],
  },
];
