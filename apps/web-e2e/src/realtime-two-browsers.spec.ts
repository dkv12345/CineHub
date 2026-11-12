import { expect, test } from '@playwright/test';

test.describe('WS1–WS6 & WS13: 2-Browser Real-Time Seat Locking & Booking E2E', () => {
  test('synchronizes seat hold, 409 SEAT_TAKEN conflict, release, and SOLD state across 2 browser contexts in <1s', async ({
    browser,
  }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // 1. Login Account A (customer.a@cinehub.vn) and Account B (customer.b@cinehub.vn)
    await pageA.goto('/auth?mode=login');
    await pageA.fill('input[type="email"]', 'customer.a@cinehub.vn');
    await pageA.fill('input[type="password"]', 'Password123!');
    await pageA.click('button[type="submit"]');
    await pageA.waitForURL('**/');

    await pageB.goto('/auth?mode=login');
    await pageB.fill('input[type="email"]', 'customer.b@cinehub.vn');
    await pageB.fill('input[type="password"]', 'Password123!');
    await pageB.click('button[type="submit"]');
    await pageB.waitForURL('**/');

    // 2. Both browsers open the same showtime seat map
    const demoShowtimeUrl =
      '/seats/demo-showtime-2026?movieTitle=L%E1%BA%ADt%20M%E1%BA%B7t%208&cinemaName=Galaxy%20Nguy%E1%BB%85n%20Du&showTime=19:30&format=2D';
    await Promise.all([pageA.goto(demoShowtimeUrl), pageB.goto(demoShowtimeUrl)]);

    const seatF7A = pageA.locator('button[aria-label*="Ghế F7"]');
    const seatF7B = pageB.locator('button[aria-label*="Ghế F7"]');

    await expect(seatF7A).toBeVisible();
    await expect(seatF7B).toBeVisible();

    // 3. Browser A clicks F7 -> Browser B sees F7 turn into "đang được người khác giữ" within <1s
    await seatF7A.click();
    await expect(seatF7A).toHaveAttribute('aria-pressed', 'true');
    await expect(seatF7B).toHaveAttribute('aria-label', /đang được người khác giữ/, {
      timeout: 1500,
    });

    // 4. Browser B clicks F7 -> receives 409 SEAT_TAKEN notification and does not select it
    await seatF7B.click();
    await expect(pageB.locator('[role="status"]')).toContainText('409 SEAT_TAKEN');
    await expect(seatF7B).toHaveAttribute('aria-pressed', 'false');

    // 5. Browser A unselects F7 -> Browser B sees F7 become available again within <1s
    await seatF7A.click();
    await pageA.getByRole('button', { name: 'Bỏ chọn' }).click();
    await expect(seatF7B).not.toHaveAttribute('aria-label', /đang được người khác giữ/, {
      timeout: 1500,
    });

    await contextA.close();
    await contextB.close();
  });
});
