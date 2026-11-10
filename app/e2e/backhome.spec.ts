import { test, expect } from '@playwright/test';

test.describe('BackHome component', () => {
  test('hiện nút về nhà đúng kích thước và vị trí', async ({ page }) => {
    await page.goto('./?demo=backhome');
    const button = page.getByRole('button', { name: 'Về nhà' });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(120);
    expect(box!.height).toBeGreaterThanOrEqual(120);
    expect(box!.x).toBeLessThanOrEqual(40);
    expect(box!.y).toBeLessThanOrEqual(40);
    await page.screenshot({ path: 'test-results/shots/T-002-backhome.png' });
  });

  test('chạm nút thì hiện demo-exited', async ({ page }) => {
    await page.goto('./?demo=backhome');
    const button = page.getByRole('button', { name: 'Về nhà' });
    await button.tap();
    await expect(page.getByTestId('demo-exited')).toBeVisible();
  });

  test('trang chính vẫn hoạt động khi không có demo param', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByTestId('home')).toBeVisible();
  });
});
