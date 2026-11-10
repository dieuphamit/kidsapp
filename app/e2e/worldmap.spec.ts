// E2E tests for WorldMap component
import { test, expect } from '@playwright/test';

test('WorldMap hiện 4 địa điểm, mây và Đậu Đậu', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  // 4 nút địa điểm
  await expect(page.getByLabel('Trang trại')).toBeVisible();
  await expect(page.getByLabel('Hồ nước')).toBeVisible();
  await expect(page.getByLabel('Vườn quả')).toBeVisible();
  await expect(page.getByLabel('Nhà âm nhạc')).toBeVisible();

  // Ít nhất 3 đám mây
  const clouds = page.locator('[data-testid="cloud"]');
  await expect(clouds).toHaveCount(await clouds.count());
  expect(await clouds.count()).toBeGreaterThanOrEqual(3);

  // Đậu Đậu hiện
  await expect(page.getByRole('img', { name: 'Đậu Đậu' })).toBeVisible();
});

test('chạm địa điểm có phản hồi trong 100ms và ghi data-last-say', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  const orchardBtn = page.getByLabel('Vườn quả');
  await expect(orchardBtn).toBeVisible();

  const box = await orchardBtn.boundingBox();
  expect(box).not.toBeNull();

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

  await page.mouse.down();

  // Chờ data-pressed xuất hiện (timeout 100ms đảm bảo phản hồi nhanh theo luật UX)
  await expect(orchardBtn).toHaveAttribute('data-pressed', '', { timeout: 100 });

  // Gốc home có data-last-say
  const home = page.getByTestId('home');
  await expect(home).toHaveAttribute('data-last-say', 'place.orchard', { timeout: 200 });

  await page.mouse.up();
});

test('chụp ảnh WorldMap sau khi ổn định', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByTestId('home')).toBeVisible();

  // Đợi 800ms cho mây và Đậu Đậu ổn định
  await page.waitForTimeout(800);

  await page.screenshot({ path: 'test-results/shots/T-005-worldmap.png' });
});
