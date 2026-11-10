import { test, expect, type Page } from '@playwright/test';

async function assertUxRules(page: Page, shot: string) {
  const boxes = await page.locator('button:visible').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { name: e.getAttribute('aria-label') ?? e.textContent, w: r.width, h: r.height };
    }),
  );
  for (const b of boxes) {
    expect(b.w, `vùng chạm "${b.name}" rộng`).toBeGreaterThanOrEqual(120);
    expect(b.h, `vùng chạm "${b.name}" cao`).toBeGreaterThanOrEqual(120);
  }
  expect(await page.locator('a[href^="http"]').count(), 'không có link ra ngoài').toBe(0);
  await page.screenshot({ path: `test-results/shots/${shot}.png` });
}

test('màn hình chính đạt luật UX', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Đậu Đậu' })).toBeVisible();
  await page.waitForTimeout(800);
  await assertUxRules(page, 'home');
});

test('chạy offline sau lần tải đầu', async ({ page, context }) => {
  await page.goto('./');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('home')).toBeVisible();
});

test('đang khóa thì hiện màn hình ngủ', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.setItem('behoc.locked', '1'));
  await page.reload();
  await expect(page.getByTestId('sleep')).toBeVisible();
  await page.screenshot({ path: 'test-results/shots/sleep.png' });
});
