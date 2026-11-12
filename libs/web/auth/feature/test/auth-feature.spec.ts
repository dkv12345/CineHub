import { describe, expect, it } from 'vitest';
import { AUTH_ROUTES } from '../src/index';

describe('AUTH_ROUTES', () => {
  it('defines path-based routes for /auth, /verify-email, and /reset-password', () => {
    const paths = AUTH_ROUTES.map((r) => r.path);
    expect(paths).toEqual(['auth', 'register', 'login', 'verify-email', 'reset-password']);
  });
});
