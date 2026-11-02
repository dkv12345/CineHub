import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore, type AuthUser } from './auth.store';

export const authGuard: CanActivateFn = (_route, state) => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  if (authStore.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/auth'], {
    queryParams: { returnUrl: state.url },
  });
};

export const guestGuard: CanActivateFn = () => {
  const authStore = inject(AuthStore);
  const router = inject(Router);
  if (!authStore.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/']);
};

export function roleGuard(requiredRole: AuthUser['role']): CanActivateFn {
  return () => {
    const authStore = inject(AuthStore);
    const router = inject(Router);
    if (!authStore.isAuthenticated()) {
      return router.createUrlTree(['/auth']);
    }
    if (authStore.user()?.role === requiredRole || authStore.user()?.role === 'ADMIN') {
      return true;
    }
    return router.createUrlTree(['/']);
  };
}
