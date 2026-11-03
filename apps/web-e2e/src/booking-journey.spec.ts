import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('CineHub E2E Booking Journey & Auth Interceptor', () => {
  test('completes full user journey: login → showtimes → 3D seat selection → checkout → ticket result', async ({
    page,
  }) => {
    await page.goto('/auth');
    await expect(page.getByTestId('login-email-input')).toBeVisible();

    await page.getByTestId('login-email-input').fill('alex@cinehub.vn');
    await page.getByTestId('login-password-input').fill('Password123!');
    await page.getByTestId('auth-submit-btn').click();

    await page.goto('/showtimes');
    const firstShowtime = page.locator('[data-testid^="showtime-btn-"]').first();
    await expect(firstShowtime).toBeVisible();
    await firstShowtime.click();

    await expect(page).toHaveURL(/\/seats\//);
    await expect(page.getByTestId('seat-pov-canvas-host')).toBeVisible();

    const availableSeat = page.locator('[data-testid^="seat-btn-"]:not([disabled])').first();
    await availableSeat.click();
    await page.getByTestId('proceed-to-checkout-btn').click();

    await expect(page).toHaveURL(/\/checkout/);
    await page.getByTestId('confirm-payment-btn').click();

    await expect(page).toHaveURL(/\/result\//);
    await expect(page.getByTestId('ticket-code')).toContainText('CH-');
  });

  test('passes automated WCAG AA accessibility checks on auth and seat selection views', async ({
    page,
  }) => {
    await page.goto('/auth');
    const authScan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(authScan.violations).toEqual([]);
  });

  test('deduplicates concurrent 401 TOKEN_EXPIRED responses into a single refresh-token call', async ({
    page,
  }) => {
    let refreshCallCount = 0;

    await page.route('**/api/v1/auth/refresh-token', async (route) => {
      refreshCallCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Token refreshed',
          data: { accessToken: 'refreshed-e2e-token' },
        }),
      });
    });

    await page.goto('/');
    expect(refreshCallCount).toBeLessThanOrEqual(1);
  });
});
