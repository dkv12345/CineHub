import type { Routes } from '@angular/router';
import { SHELL_ROUTES } from '@cinehub/web/shell';

export const appRoutes: Routes = [
  {
    path: 'portal',
    loadChildren: () => import('./portal/portal.routes').then((m) => m.PORTAL_ROUTES),
  },
  {
    path: '',
    pathMatch: 'full',
    canMatch: [() => typeof window !== 'undefined' && window.location.port === '4300'],
    loadComponent: () =>
      import('./portal/portal-redirect.component').then((m) => m.PortalRedirectComponent),
  },
  {
    path: 'style-guide',
    loadComponent: () =>
      import('./style-guide/style-guide.component').then((m) => m.StyleGuideComponent),
  },
  ...SHELL_ROUTES,
];
