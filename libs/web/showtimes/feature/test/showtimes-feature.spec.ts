import { describe, expect, it, vi } from 'vitest';
import { SHOWTIMES_ROUTES, ShowtimesPageComponent } from '../src/index';

describe('SHOWTIMES_ROUTES', () => {
  it('defines showtimes route without authGuard so guests can view schedules', () => {
    expect(SHOWTIMES_ROUTES[0]?.path).toBe('showtimes');
    expect(SHOWTIMES_ROUTES[0]?.canActivate).toBeUndefined();
  });

  it('redirects unauthenticated user to /auth with returnUrl and shows warning toast', () => {
    const navigate = vi.fn();
    const createUrlTree = vi.fn().mockReturnValue({ toString: () => '/seats/session-123' });
    const serializeUrl = vi.fn().mockReturnValue('/seats/session-123?format=2D');
    const toastShow = vi.fn();

    const component = Object.create(ShowtimesPageComponent.prototype);
    component.router = { navigate, createUrlTree, serializeUrl };
    component.authStore = { isAuthenticated: () => false };
    component.toast = { show: toastShow };
    component.seatParams = () => ({ format: '2D' });

    const mockSession = {
      id: 'session-123',
      showTime: '19:00',
      showDate: '2026-11-13',
      movieFormat: '2D',
      movie: { name: 'Dune 3', id: 'm-1' },
      cinema: { name: 'Galaxy Nguyen Du', code: 'GLX_ND' },
    } as any;

    component.onSelectSession(mockSession);

    expect(toastShow).toHaveBeenCalledWith('Vui lòng đăng nhập để tiếp tục đặt vé', 'warning');
    expect(navigate).toHaveBeenCalledWith(['/auth'], {
      queryParams: { returnUrl: '/seats/session-123?format=2D' },
    });
  });

  it('navigates directly to seats when user is authenticated', () => {
    const navigateByUrl = vi.fn();
    const createUrlTree = vi.fn().mockReturnValue({ toString: () => '/seats/session-123' });
    const serializeUrl = vi.fn().mockReturnValue('/seats/session-123');

    const component = Object.create(ShowtimesPageComponent.prototype);
    component.router = { navigateByUrl, createUrlTree, serializeUrl };
    component.authStore = { isAuthenticated: () => true };
    component.toast = { show: vi.fn() };
    component.seatParams = () => ({});

    const mockSession = { id: 'session-123' } as any;

    component.onSelectSession(mockSession);

    expect(navigateByUrl).toHaveBeenCalled();
  });
});
