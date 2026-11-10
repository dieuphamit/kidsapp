import { test, expect, type Page } from '@playwright/test';

async function assertUxRules(page: Page, shot: string) {
  const boxes = await page.locator('button:visible').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { name: e.getAttribute('aria-label') ?? e.textContent, w: r.width, h: r.height, x: r.x, y: r.y };
    }),
  );

  // Kiểm tra có ít nhất một nút địa điểm (không phải "Khu phụ huynh")
  const placeButtons = boxes.filter((b) => b.name !== 'Khu phụ huynh');
  expect(placeButtons.length, 'có ít nhất một nút địa điểm').toBeGreaterThanOrEqual(1);

  for (const b of boxes) {
    expect(b.w, `vùng chạm "${b.name}" rộng`).toBeGreaterThanOrEqual(120);
    expect(b.h, `vùng chạm "${b.name}" cao`).toBeGreaterThanOrEqual(120);
  }

  // Kiểm tra khoảng cách giữa mọi cặp nút >= 24px
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      // Khe ngang và khe dọc giữa hai hình chữ nhật
      const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
      const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
      const gap = Math.max(gapX, gapY);
      expect(gap, `khoảng cách giữa "${a.name}" và "${b.name}"`).toBeGreaterThanOrEqual(24);
    }
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
  test.setTimeout(90_000); // precache nhiều model/mp3, máy chạy song song nên chậm
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
