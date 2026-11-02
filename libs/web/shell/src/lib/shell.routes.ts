import type { Routes } from '@angular/router';
import { ShellLayoutComponent } from './shell-layout.component';

export const SHELL_ROUTES: Routes = [
  {
    path: '',
    component: ShellLayoutComponent,
    children: [
      {
        path: '',
        loadChildren: () => import('@cinehub/web/catalog/feature').then((m) => m.CATALOG_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('@cinehub/web/showtimes/feature').then((m) => m.SHOWTIMES_ROUTES),
      },
      {
        path: '',
        loadChildren: () =>
          import('@cinehub/web/concessions/feature').then((m) => m.CONCESSIONS_ROUTES),
      },
      {
        path: '',
        loadChildren: () => import('@cinehub/web/booking/feature').then((m) => m.BOOKING_ROUTES),
      },
      {
        path: '',
        loadChildren: () => import('@cinehub/web/tickets/feature').then((m) => m.TICKETS_ROUTES),
      },
      {
        path: '',
        loadChildren: () => import('@cinehub/web/account/feature').then((m) => m.ACCOUNT_ROUTES),
      },
      {
        path: '',
        loadChildren: () => import('@cinehub/web/auth/feature').then((m) => m.AUTH_ROUTES),
      },
    ],
  },
];
